from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import APIRouter

from orchestrator.db.client import get_db

router = APIRouter(prefix="/api")


def _to_iso(value: Any) -> str:
    if isinstance(value, datetime):
        if value.tzinfo is None:
            value = value.replace(tzinfo=timezone.utc)
        return value.isoformat()
    if isinstance(value, str):
        return value
    return datetime.now(timezone.utc).isoformat()


def _format_time(value: str) -> str:
    try:
        dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
        return dt.astimezone().strftime("%I:%M %p").lstrip("0")
    except ValueError:
        return "Now"


def _trace_to_event(trace: dict) -> dict:
    occurred_at = _to_iso(trace.get("timestamp"))
    connector = trace.get("connector_name") or trace.get("connector_id") or "unknown"
    decision = trace.get("sla_name")
    assessment = trace.get("assessment")
    outcome = trace.get("outcome")

    if assessment:
        risk = assessment.get("risk_level", "UNKNOWN")
        kind = "detect" if risk == "RED" else "evaluate" if risk == "YELLOW" else "monitor"
        detail = assessment.get("reasoning") or trace.get("escalation_message")
        return {
            "id": f"trace-{trace.get('connector_id', 'unknown')}-{occurred_at}",
            "occurredAt": occurred_at,
            "time": _format_time(occurred_at),
            "kind": kind,
            "title": f"Risk assessed: {connector} -> {risk}",
            "detail": detail[:240] if detail else None,
            "decision": decision,
        }

    if outcome:
        success = outcome.get("success", False)
        actions = outcome.get("actions_taken") or []
        return {
            "id": f"trace-{trace.get('connector_id', 'unknown')}-{occurred_at}",
            "occurredAt": occurred_at,
            "time": _format_time(occurred_at),
            "kind": "recover" if success else "act",
            "title": f"{'Recovered' if success else 'Action taken'}: {connector}",
            "detail": " -> ".join(actions) if actions else trace.get("escalation_message"),
            "decision": decision,
        }

    return {
        "id": f"trace-{trace.get('connector_id', 'unknown')}-{occurred_at}",
        "occurredAt": occurred_at,
        "time": _format_time(occurred_at),
        "kind": "evaluate",
        "title": f"Agent evaluated {connector}",
        "detail": trace.get("escalation_message") or trace.get("phase"),
        "decision": decision,
    }


def _incident_to_event(incident: dict) -> dict:
    occurred_at = _to_iso(
        incident.get("resolved_at") or incident.get("detected_at") or datetime.now(timezone.utc)
    )
    connector = incident.get("connector_id") or incident.get("connector") or "unknown"
    failure_type = (incident.get("failure_type") or incident.get("type") or "Issue").replace("_", " ")
    resolved = incident.get("resolved_at") is not None or incident.get("resolved") is not None
    actions = incident.get("agent_actions") or []
    return {
        "id": f"incident-{incident.get('_id', connector)}",
        "occurredAt": occurred_at,
        "time": _format_time(occurred_at),
        "kind": "recover" if resolved else "detect",
        "title": f"{'Resolved' if resolved else 'Incident'}: {failure_type} on {connector}",
        "detail": f"Agent acting: {actions[0]}" if actions and not resolved else None,
        "decision": None,
    }


@router.get("/agent-stats")
async def get_agent_stats():
    db = await get_db()
    now = datetime.now(timezone.utc)
    last_24h = now - timedelta(hours=24)

    traces_24h = await db.reasoning_traces.count_documents(
        {"timestamp": {"$gte": last_24h.isoformat()}}
    )

    total_traces = await db.reasoning_traces.count_documents({})

    auto_recoveries = await db.incidents.count_documents(
        {"resolved_at": {"$ne": None}, "human_intervention_required": {"$ne": True}}
    )

    pipeline = [
        {"$match": {"resolved_at": {"$ne": None}, "time_to_resolve_seconds": {"$exists": True}}},
        {"$group": {"_id": None, "median": {"$avg": "$time_to_resolve_seconds"}}},
    ]
    agg = await db.incidents.aggregate(pipeline).to_list(1)
    median_response = agg[0]["median"] if agg else 0

    return {
        "actions24h": traces_24h,
        "reasoningCycles": total_traces,
        "autoRecoveries": auto_recoveries,
        "medianResponseSeconds": round(median_response, 1),
    }


@router.get("/agent-activity-history")
async def get_agent_activity_history(limit: int = 30):
    db = await get_db()

    traces = await db.reasoning_traces.find({}).sort("timestamp", -1).limit(limit).to_list(limit)
    incidents = (
        await db.incidents.find({})
        .sort("detected_at", -1)
        .limit(limit)
        .to_list(limit)
    )

    events = [_trace_to_event(trace) for trace in traces]
    events.extend(_incident_to_event(incident) for incident in incidents)
    events.sort(key=lambda event: event["occurredAt"], reverse=True)

    return {"events": events[:limit]}
