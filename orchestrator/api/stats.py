from __future__ import annotations

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter

from orchestrator.db.client import get_db

router = APIRouter(prefix="/api")


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
