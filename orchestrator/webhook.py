from __future__ import annotations

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Request

from orchestrator.db.client import get_db
from orchestrator.db.queries import get_sla_by_connector, get_health_stats, get_recent_incidents
from orchestrator.invoker import invoke_agent
from orchestrator.api.events import broadcast

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api")


@router.post("/webhooks/fivetran")
async def fivetran_webhook(request: Request):
    payload = await request.json()
    event_type = payload.get("event", "")
    connector_id = payload.get("connector_id", "")

    logger.info(f"Webhook received: {event_type} for {connector_id}")

    if event_type != "sync_end" or payload.get("data", {}).get("status") != "FAILED":
        return {"status": "ignored", "reason": "not a failure event"}

    db = await get_db()
    sla = await get_sla_by_connector(db, connector_id)
    health = await get_health_stats(db, connector_id)
    incidents = await get_recent_incidents(db, connector_id, limit=5)

    context = {
        "mode": "reactive",
        "connector_id": connector_id,
        "failure_event": payload,
        "sla_at_risk": sla,
        "health_stats": health,
        "recent_incidents": incidents,
    }

    trace = await invoke_agent(context)

    await db.reasoning_traces.insert_one(trace.model_dump())

    incident_doc = {
        "_id": f"inc_{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}_{connector_id[:8]}",
        "connector_id": connector_id,
        "sla_id": sla["_id"] if sla else None,
        "detected_at": datetime.now(timezone.utc),
        "failure_type": trace.classification.failure_type if trace.classification else "UNKNOWN",
        "agent_actions": trace.outcome.actions_taken if trace.outcome else [],
        "resolved_at": datetime.now(timezone.utc) if trace.outcome and trace.outcome.success else None,
        "time_to_resolve_seconds": trace.outcome.time_elapsed_seconds if trace.outcome else None,
        "sla_impact": trace.outcome.sla_impact if trace.outcome else "unknown",
        "human_intervention_required": not (trace.outcome and trace.outcome.success),
        "reasoning_trace": trace.model_dump(),
    }
    await db.incidents.insert_one(incident_doc)

    await broadcast("trace", trace.model_dump())
    await broadcast("incident", incident_doc)
    if sla:
        await broadcast("sla_update", {
            "sla_id": sla["_id"],
            "status": "RED" if not (trace.outcome and trace.outcome.success) else "GREEN",
            "last_checked": datetime.now(timezone.utc).isoformat(),
        })

    return {"status": "processed", "trace_id": incident_doc["_id"]}
