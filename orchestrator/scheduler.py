from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timezone

from croniter import croniter

from orchestrator.config import settings
from orchestrator.db.client import get_db
from orchestrator.db.queries import get_all_slas, get_health_stats, get_recent_incidents
from orchestrator.invoker import invoke_agent
from orchestrator.api.events import broadcast

logger = logging.getLogger(__name__)


def get_next_deadline(cron_expr: str) -> datetime:
    now = datetime.now(timezone.utc)
    cron = croniter(cron_expr, now)
    return cron.get_next(datetime).replace(tzinfo=timezone.utc)


def compute_deterministic_facts(sla: dict, health: dict) -> dict:
    now = datetime.now(timezone.utc)
    next_deadline = get_next_deadline(sla["deadline_cron"])
    time_until_deadline = (next_deadline - now).total_seconds()

    sync_frequency_seconds = health.get("sync_frequency_seconds", 21600)
    syncs_remaining = time_until_deadline / sync_frequency_seconds if sync_frequency_seconds > 0 else 0
    failure_rate = health.get("failure_rate_7d", 0.0)

    return {
        "time_until_deadline_seconds": time_until_deadline,
        "time_until_deadline_human": f"{time_until_deadline / 60:.0f} minutes",
        "next_deadline": next_deadline.isoformat(),
        "syncs_remaining": syncs_remaining,
        "failure_rate_7d": failure_rate,
        "weekend_failure_rate": health.get("weekend_failure_rate", 0.0),
    }


def is_green(facts: dict) -> bool:
    return facts["syncs_remaining"] >= 3 and facts["failure_rate_7d"] < 0.05


async def run_proactive_check() -> None:
    db = await get_db()
    slas = await get_all_slas(db)

    for sla in slas:
        connector_id = sla["connector_id"]
        health = await get_health_stats(db, connector_id)
        facts = compute_deterministic_facts(sla, health)

        if is_green(facts):
            logger.debug(f"[{sla['name']}] GREEN — skipping agent invocation")
            await broadcast("sla_update", {
                "sla_id": sla["_id"],
                "status": "GREEN",
                "last_checked": datetime.now(timezone.utc).isoformat(),
            })
            continue

        logger.info(f"[{sla['name']}] Non-GREEN — invoking agent")

        incidents = await get_recent_incidents(db, connector_id, limit=5)
        context = {
            "mode": "proactive",
            "sla": sla,
            "health_stats": {**health, **facts},
            "recent_incidents": incidents,
        }

        trace = await invoke_agent(context)

        await db.reasoning_traces.insert_one(trace.model_dump())
        await broadcast("trace", trace.model_dump())
        await broadcast("sla_update", {
            "sla_id": sla["_id"],
            "status": trace.assessment.risk_level if trace.assessment else "UNKNOWN",
            "last_checked": datetime.now(timezone.utc).isoformat(),
        })

        if trace.outcome:
            incident_doc = {
                "_id": f"inc_{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}_{connector_id[:8]}",
                "connector_id": connector_id,
                "sla_id": sla["_id"],
                "detected_at": datetime.now(timezone.utc),
                "failure_type": "PROACTIVE_INTERVENTION",
                "agent_actions": trace.outcome.actions_taken,
                "resolved_at": datetime.now(timezone.utc) if trace.outcome.success else None,
                "time_to_resolve_seconds": trace.outcome.time_elapsed_seconds,
                "sla_impact": trace.outcome.sla_impact,
                "human_intervention_required": not trace.outcome.success,
                "reasoning_trace": trace.model_dump(),
            }
            await db.incidents.insert_one(incident_doc)
            await broadcast("incident", incident_doc)


async def scheduler_loop() -> None:
    interval = settings.scheduler_interval_seconds
    logger.info(f"Scheduler started — checking every {interval}s")
    while True:
        try:
            await run_proactive_check()
        except Exception as e:
            logger.error(f"Scheduler error: {e}", exc_info=True)
        await asyncio.sleep(interval)
