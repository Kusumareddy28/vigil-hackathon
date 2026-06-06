from __future__ import annotations

from fastapi import APIRouter

from orchestrator.db.client import get_db

router = APIRouter(prefix="/api")


@router.get("/connectors")
async def list_connectors():
    db = await get_db()
    cursor = db.connector_health.find({}).sort("date", -1)
    health_docs = await cursor.to_list(length=50)

    connectors = {}
    for doc in health_docs:
        cid = doc["connector_id"]
        if cid not in connectors:
            connectors[cid] = doc
    return {"connectors": list(connectors.values())}
