from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Optional

from croniter import croniter
from fastapi import APIRouter

from orchestrator.db.client import get_db

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api")

NEGATIVE_KEYWORDS = {"failure", "stale", "risk", "exceeded", "instability", "elevated", "degraded", "expired", "outage", "down", "broken", "missing", "overdue"}


def _compute_next_deadline(cron_expr: str) -> tuple[str, str]:
    now = datetime.now(timezone.utc)
    cron = croniter(cron_expr, now)
    next_dt = cron.get_next(datetime).replace(tzinfo=timezone.utc)

    diff = next_dt - now
    hours = diff.total_seconds() / 3600

    if hours < 1:
        label = f"{int(diff.total_seconds() / 60)}m remaining"
    elif hours < 24:
        label = f"Today, {next_dt.strftime('%I:%M %p').lstrip('0')} UTC"
    elif hours < 48:
        label = f"Tomorrow, {next_dt.strftime('%I:%M %p').lstrip('0')} UTC"
    else:
        label = next_dt.strftime("%A, %I:%M %p UTC")

    return next_dt.isoformat(), label


def _readiness_from_risk(risk_level: Optional[str]) -> int:
    if risk_level == "GREEN":
        return 95
    elif risk_level == "YELLOW":
        return 70
    elif risk_level == "RED":
        return 40
    return 85


def _status_from_readiness(readiness: int) -> str:
    if readiness >= 90:
        return "ready"
    elif readiness >= 75:
        return "ready_with_caution"
    elif readiness >= 50:
        return "at_risk"
    return "blocked"


def _polarity(factor: str) -> str:
    lower = factor.lower()
    for kw in NEGATIVE_KEYWORDS:
        if kw in lower:
            return "negative"
    return "positive"


def _map_connector_status(health: Optional[dict]) -> str:
    if health is None:
        return "fresh"
    rate = health.get("failure_rate_7d", 0)
    if rate > 0.2:
        return "stale"
    elif rate > 0.1:
        return "at_risk"
    return "fresh"


def _freshness_label(succeeded_at: Optional[str]) -> str:
    if not succeeded_at:
        return "No sync recorded"
    try:
        ts = datetime.fromisoformat(str(succeeded_at).replace("Z", "+00:00"))
        diff = datetime.now(timezone.utc) - ts
        minutes = int(diff.total_seconds() / 60)
        if minutes < 60:
            return f"Updated {minutes} minutes ago"
        hours = minutes // 60
        if hours < 24:
            return f"Updated {hours} hours ago"
        return f"Last updated {hours // 24} days ago"
    except Exception:
        return "Unknown"


async def _build_decision(sla: dict, db) -> dict:
    connector_id = sla["connector_id"]
    sla_id = sla["_id"]

    # Get latest reasoning trace for this SLA
    latest_trace = await db.reasoning_traces.find_one(
        {"connector_id": connector_id},
        sort=[("timestamp", -1)],
    )

    # Get health stats for each dependency
    dependencies_raw = sla.get("dependencies", [])
    if not dependencies_raw:
        dependencies_raw = [{"connector_id": connector_id, "name": sla.get("connector_name", ""), "source": "Fivetran"}]

    dependencies = []
    for dep in dependencies_raw:
        dep_id = dep.get("connector_id", connector_id)
        health = await db.connector_health.find_one(
            {"connector_id": dep_id},
            sort=[("date", -1)],
        )
        dependencies.append({
            "id": dep_id,
            "name": dep.get("name", dep_id),
            "source": dep.get("source", "Fivetran"),
            "status": _map_connector_status(health),
            "lastSync": health.get("last_sync", "") if health else "",
            "freshnessLabel": _freshness_label(health.get("last_sync") if health else None),
        })

    # Compute readiness
    risk_level = None
    if latest_trace and latest_trace.get("assessment"):
        risk_level = latest_trace["assessment"].get("risk_level")
        readiness = _readiness_from_risk(risk_level)
    else:
        # No agent trace — use Layer 1 heuristic from health data
        health_main = await db.connector_health.find_one(
            {"connector_id": connector_id}, sort=[("date", -1)]
        )
        failure_rate = health_main.get("failure_rate_7d", 0) if health_main else 0
        if failure_rate < 0.05:
            readiness = 95
        elif failure_rate < 0.15:
            readiness = 75
        else:
            readiness = 55
    status = _status_from_readiness(readiness)

    # Confidence drivers
    confidence_drivers = []
    if latest_trace and latest_trace.get("assessment"):
        assessment = latest_trace["assessment"]
        for factor in assessment.get("confidence_factors", []):
            confidence_drivers.append({
                "label": factor,
                "polarity": _polarity(factor),
            })

    # Reasoning trace
    reasoning = {"facts": [], "reasoning": "", "decision": {"readiness": readiness, "recommendation": "", "action": ""}}
    if latest_trace and latest_trace.get("assessment"):
        assessment = latest_trace["assessment"]
        reasoning = {
            "facts": assessment.get("confidence_factors", []),
            "reasoning": assessment.get("reasoning", ""),
            "decision": {
                "readiness": readiness,
                "recommendation": assessment.get("recommended_action", "MONITOR"),
                "action": f"Recommended: {assessment.get('recommended_action', 'monitor')}",
            },
        }

    # Timeline from recent incidents
    recent_incidents = await db.incidents.find(
        {"sla_id": sla_id}
    ).sort("detected_at", -1).limit(5).to_list(5)

    timeline = []
    for inc in recent_incidents:
        detected = inc.get("detected_at")
        time_str = detected.strftime("%I:%M %p").lstrip("0") if isinstance(detected, datetime) else str(detected)
        kind = "detect"
        if inc.get("resolved_at"):
            kind = "recover"
        elif inc.get("agent_actions"):
            kind = "act"

        detail = None
        actions = inc.get("agent_actions", [])
        if actions and isinstance(actions[0], dict):
            detail = actions[0].get("action", "")
        elif actions and isinstance(actions[0], str):
            detail = actions[0]

        timeline.append({
            "time": time_str,
            "title": f"{inc.get('failure_type', 'Unknown')} detected",
            "detail": detail,
            "kind": kind,
        })

    # Build deadline
    deadline_iso, deadline_label = _compute_next_deadline(sla["deadline_cron"])

    # Recommendation
    recommendation = ""
    if latest_trace and latest_trace.get("assessment"):
        recommendation = latest_trace["assessment"].get("reasoning", "No assessment yet.")
    elif latest_trace and latest_trace.get("escalation_message"):
        recommendation = latest_trace["escalation_message"]
    else:
        recommendation = "Awaiting first agent assessment."

    confidence_summary = recommendation[:120] + "..." if len(recommendation) > 120 else recommendation

    return {
        "id": sla_id,
        "title": sla["name"],
        "stakeholder": sla.get("stakeholder", ""),
        "stakeholderRole": sla.get("stakeholder_role", ""),
        "deadline": deadline_iso,
        "deadlineLabel": deadline_label,
        "criticality": sla.get("business_impact", "medium"),
        "readiness": readiness,
        "status": status,
        "summary": sla.get("impact_context", ""),
        "recommendation": recommendation,
        "confidenceSummary": confidence_summary,
        "confidenceDrivers": confidence_drivers,
        "dependencies": dependencies,
        "reasoning": reasoning,
        "timeline": timeline,
    }


@router.get("/decisions")
async def list_decisions():
    db = await get_db()
    slas = await db.sla_definitions.find({}).to_list(20)

    decisions = []
    for sla in slas:
        decision = await _build_decision(sla, db)
        decisions.append(decision)

    # Global stats
    total = len(decisions)
    at_risk = sum(1 for d in decisions if d["status"] in ("at_risk", "blocked"))
    avg_readiness = int(sum(d["readiness"] for d in decisions) / total) if total > 0 else 0

    # Count recoveries
    recent_incidents = await db.incidents.find(
        {"resolved_at": {"$ne": None}}
    ).sort("detected_at", -1).limit(50).to_list(50)

    return {
        "decisions": decisions,
        "stats": {
            "monitored": total,
            "atRisk": at_risk,
            "recoveries": len(recent_incidents),
            "avgReadiness": avg_readiness,
        },
    }


@router.get("/decisions/{decision_id}")
async def get_decision(decision_id: str):
    db = await get_db()
    sla = await db.sla_definitions.find_one({"_id": decision_id})
    if not sla:
        return {"error": "Decision not found"}, 404
    decision = await _build_decision(sla, db)
    return decision
