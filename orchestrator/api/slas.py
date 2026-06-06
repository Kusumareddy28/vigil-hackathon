from __future__ import annotations

from fastapi import APIRouter

from orchestrator.db.client import get_db
from orchestrator.db.queries import get_all_slas

router = APIRouter(prefix="/api")


@router.get("/slas")
async def list_slas():
    db = await get_db()
    slas = await get_all_slas(db)
    return {"slas": slas}
