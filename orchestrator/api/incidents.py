from __future__ import annotations

from fastapi import APIRouter, Query

from orchestrator.db.client import get_db

router = APIRouter(prefix="/api")


@router.get("/incidents")
async def list_incidents(limit: int = Query(default=20, le=100)):
    db = await get_db()
    cursor = db.incidents.find({}).sort("detected_at", -1).limit(limit)
    incidents = await cursor.to_list(length=limit)
    return {"incidents": incidents}
