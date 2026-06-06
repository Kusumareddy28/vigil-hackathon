from __future__ import annotations

from datetime import datetime
from typing import Optional

from motor.motor_asyncio import AsyncIOMotorDatabase


async def get_all_slas(db: AsyncIOMotorDatabase) -> list[dict]:
    cursor = db.sla_definitions.find({})
    return await cursor.to_list(length=100)


async def get_sla_by_connector(db: AsyncIOMotorDatabase, connector_id: str) -> Optional[dict]:
    return await db.sla_definitions.find_one({"connector_id": connector_id})


async def get_health_stats(db: AsyncIOMotorDatabase, connector_id: str) -> dict:
    health = await db.connector_health.find_one(
        {"connector_id": connector_id},
        sort=[("date", -1)],
    )
    if health is None:
        return {
            "connector_id": connector_id,
            "failure_rate_7d": 0.0,
            "weekend_failure_rate": 0.0,
            "syncs_failed": 0,
            "syncs_attempted": 0,
        }
    return health


async def get_recent_incidents(
    db: AsyncIOMotorDatabase, connector_id: str, limit: int = 10
) -> list[dict]:
    cursor = db.incidents.find({"connector_id": connector_id}).sort("detected_at", -1).limit(limit)
    return await cursor.to_list(length=limit)


async def save_incident(db: AsyncIOMotorDatabase, incident: dict) -> str:
    result = await db.incidents.insert_one(incident)
    return str(result.inserted_id)


async def save_reasoning_trace(db: AsyncIOMotorDatabase, trace: dict) -> str:
    result = await db.reasoning_traces.insert_one(trace)
    return str(result.inserted_id)


async def update_connector_health(
    db: AsyncIOMotorDatabase,
    connector_id: str,
    success: bool,
    failure_type: Optional[str] = None,
) -> None:
    today = datetime.utcnow().strftime("%Y-%m-%d")
    doc_id = f"health_{connector_id}_{today}"

    update = {
        "$inc": {"syncs_attempted": 1},
        "$setOnInsert": {"connector_id": connector_id, "date": today},
    }
    if success:
        update["$inc"]["syncs_succeeded"] = 1
    else:
        update["$inc"]["syncs_failed"] = 1
        if failure_type:
            update.setdefault("$push", {})["failure_types"] = failure_type

    await db.connector_health.update_one({"_id": doc_id}, update, upsert=True)
