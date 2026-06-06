from __future__ import annotations

import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from orchestrator.db.client import get_db, close_db
from orchestrator.api.events import router as events_router
from orchestrator.api.slas import router as slas_router
from orchestrator.scheduler import scheduler_loop
from orchestrator.invoker import close_runner


@asynccontextmanager
async def lifespan(app: FastAPI):
    await get_db()
    task = asyncio.create_task(scheduler_loop())
    yield
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
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(events_router)
app.include_router(slas_router)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "vigil-orchestrator"}
