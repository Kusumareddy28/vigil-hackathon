"""
End-to-end smoke test: starts orchestrator, hits endpoints.
Tests API/HTTP layer only (does not require running MongoDB).
"""
import pytest
from httpx import AsyncClient, ASGITransport

from orchestrator.main import app


@pytest.mark.asyncio
async def test_health():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        r = await client.get("/health")
    assert r.status_code == 200
    assert r.json()["service"] == "vigil-orchestrator"


@pytest.mark.asyncio
async def test_slas_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        r = await client.get("/api/slas")
    assert r.status_code == 200
    assert "slas" in r.json()


@pytest.mark.asyncio
async def test_incidents_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        r = await client.get("/api/incidents")
    assert r.status_code == 200
    assert "incidents" in r.json()


@pytest.mark.asyncio
async def test_connectors_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        r = await client.get("/api/connectors")
    assert r.status_code == 200
    assert "connectors" in r.json()


@pytest.mark.asyncio
async def test_webhook_ignores_non_failure():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        r = await client.post("/api/webhooks/fivetran", json={
            "event": "sync_end",
            "connector_id": "test_connector",
            "data": {"status": "SUCCESSFUL"},
        })
    assert r.status_code == 200
    assert r.json()["status"] == "ignored"
