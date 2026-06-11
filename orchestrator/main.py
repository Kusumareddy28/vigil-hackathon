from __future__ import annotations

import asyncio
from contextlib import asynccontextmanager
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from orchestrator.db.client import get_db, close_db
from orchestrator.api.events import router as events_router
from orchestrator.api.slas import router as slas_router
from orchestrator.webhook import router as webhook_router
from orchestrator.api.incidents import router as incidents_router
from orchestrator.api.connectors import router as connectors_router
from orchestrator.api.decisions import router as decisions_router
from orchestrator.api.stats import router as stats_router
from orchestrator.scheduler import scheduler_loop, run_proactive_check
from orchestrator.invoker import close_runner


def _allowed_origins() -> list[str]:
    return [
        origin.strip()
        for origin in os.getenv("FRONTEND_ORIGINS", "").split(",")
        if origin.strip()
    ] or [
        origin.strip()
        for origin in settings.frontend_origins.split(",")
        if origin.strip()
    ]


@asynccontextmanager
async def lifespan(app: FastAPI):
    await get_db()
    task = None
    # Scheduler can be disabled by setting START_SCHEDULER=0 in the environment.
    if os.getenv("START_SCHEDULER", "1") != "0":
        task = asyncio.create_task(scheduler_loop())
    yield
    if task is not None:
        task.cancel()
        try:
            await task
        except asyncio.CancelledError:
            pass
    await close_runner()
    await close_db()


app = FastAPI(title="Vigil", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins(),
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(events_router)
app.include_router(slas_router)
app.include_router(webhook_router)
app.include_router(incidents_router)
app.include_router(connectors_router)
app.include_router(decisions_router)
app.include_router(stats_router)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "vigil-orchestrator"}


@app.post("/api/run-check")
async def trigger_agent_check():
    await run_proactive_check()
    return {"status": "completed"}
