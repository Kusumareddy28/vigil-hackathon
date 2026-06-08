from __future__ import annotations

import asyncio
import json
from typing import AsyncGenerator

from fastapi import APIRouter
from sse_starlette.sse import EventSourceResponse

from orchestrator.config import settings

router = APIRouter()

_subscribers: list[asyncio.Queue] = []


async def broadcast(event_type: str, data: dict) -> None:
    message = {"event": event_type, "data": json.dumps(data, default=str)}
    dead = []
    for i, queue in enumerate(_subscribers):
        try:
            queue.put_nowait(message)
        except asyncio.QueueFull:
            dead.append(i)
    for i in reversed(dead):
        _subscribers.pop(i)


async def _event_generator(queue: asyncio.Queue) -> AsyncGenerator[dict, None]:
    try:
        while True:
            try:
                message = await asyncio.wait_for(
                    queue.get(), timeout=settings.sse_heartbeat_seconds
                )
                yield message
            except asyncio.TimeoutError:
                yield {"event": "ping", "data": ""}
    except asyncio.CancelledError:
        pass


@router.get("/api/events")
async def sse_stream():
    queue: asyncio.Queue = asyncio.Queue(maxsize=100)
    _subscribers.append(queue)

    async def generate():
        yield {"event": "connected", "data": json.dumps({"status": "ok"})}
        try:
            async for message in _event_generator(queue):
                yield message
        finally:
            if queue in _subscribers:
                _subscribers.remove(queue)

    return EventSourceResponse(generate())
