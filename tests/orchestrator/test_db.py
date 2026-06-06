import pytest
from unittest.mock import AsyncMock, MagicMock

from orchestrator.db.queries import (
    get_all_slas,
    get_health_stats,
    get_recent_incidents,
    save_incident,
)


@pytest.fixture
def mock_db():
    db = MagicMock()
    return db


@pytest.mark.asyncio
async def test_get_all_slas(mock_db):
    mock_db.sla_definitions.find.return_value.to_list = AsyncMock(
        return_value=[{"_id": "sla_1", "name": "Board Revenue"}]
    )
    result = await get_all_slas(mock_db)
    assert len(result) == 1
    assert result[0]["name"] == "Board Revenue"


@pytest.mark.asyncio
async def test_get_health_stats_missing(mock_db):
    mock_db.connector_health.find_one = AsyncMock(return_value=None)
    result = await get_health_stats(mock_db, "connector_abc")
    assert result["failure_rate_7d"] == 0.0
    assert result["connector_id"] == "connector_abc"


@pytest.mark.asyncio
async def test_get_health_stats_exists(mock_db):
    mock_db.connector_health.find_one = AsyncMock(
        return_value={"connector_id": "abc", "failure_rate_7d": 0.18, "weekend_failure_rate": 0.38}
    )
    result = await get_health_stats(mock_db, "abc")
    assert result["failure_rate_7d"] == 0.18


@pytest.mark.asyncio
async def test_save_incident(mock_db):
    mock_db.incidents.insert_one = AsyncMock(
        return_value=MagicMock(inserted_id="inc_001")
    )
    result = await save_incident(mock_db, {"connector_id": "abc", "failure_type": "SCHEMA_CHANGE"})
    assert result == "inc_001"
