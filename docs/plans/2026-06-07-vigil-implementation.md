# Vigil Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a proactive data SLA guardian agent that monitors Fivetran pipeline health, assesses breach risk with Gemini, autonomously remediates failures, and streams live reasoning traces to a React dashboard.

**Architecture:** Service-oriented — FastAPI orchestrator (scheduling, webhooks, MongoDB CRUD, SSE) invokes an in-process ADK agent (Gemini reasoning, Fivetran MCP read/write, MongoDB MCP self-query). React dashboard consumes REST + SSE.

**Tech Stack:** Google ADK 2.0, Gemini 2.5 Flash, Fivetran MCP (stdio), MongoDB (Motor + MCP), FastAPI, React 19 + Vite + Tailwind, Docker Compose, Cloud Run

---

## Task 1: Project Scaffold & Dependencies

**Files:**
- Create: `pyproject.toml`
- Create: `.env.example`
- Create: `docker-compose.yml`
- Create: `Dockerfile`
- Create: `shared/__init__.py`
- Create: `agent/__init__.py`
- Create: `orchestrator/__init__.py`

- [ ] **Step 1: Create pyproject.toml with all Python dependencies**

```toml
[project]
name = "vigil"
version = "0.1.0"
requires-python = ">=3.11"
dependencies = [
    "google-adk>=2.0.0",
    "fastapi>=0.115.0",
    "uvicorn[standard]>=0.30.0",
    "motor>=3.6.0",
    "pydantic>=2.9.0",
    "pydantic-settings>=2.6.0",
    "python-dotenv>=1.0.0",
    "sse-starlette>=2.0.0",
    "croniter>=3.0.0",
    "httpx>=0.27.0",
]

[project.optional-dependencies]
dev = [
    "pytest>=8.0.0",
    "pytest-asyncio>=0.24.0",
    "ruff>=0.8.0",
    "mypy>=1.13.0",
]

[tool.ruff]
target-version = "py311"
line-length = 100

[tool.pytest.ini_options]
asyncio_mode = "auto"
testpaths = ["tests"]
```

- [ ] **Step 2: Create .env.example**

```bash
# Fivetran
FIVETRAN_API_KEY=your_api_key_here
FIVETRAN_API_SECRET=your_api_secret_here
FIVETRAN_ALLOW_WRITES=true

# MongoDB
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB=vigil

# Google Cloud / Gemini
GOOGLE_API_KEY=your_gemini_api_key_here

# App
SCHEDULER_INTERVAL_SECONDS=300
SSE_HEARTBEAT_SECONDS=15
LOG_LEVEL=INFO
```

- [ ] **Step 3: Create docker-compose.yml**

```yaml
services:
  mongodb:
    image: mongo:7
    ports:
      - "27017:27017"
    volumes:
      - mongo_data:/data/db

  orchestrator:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "8000:8000"
    env_file: .env
    depends_on:
      - mongodb
    volumes:
      - .:/app
    command: uvicorn orchestrator.main:app --host 0.0.0.0 --port 8000 --reload

volumes:
  mongo_data:
```

- [ ] **Step 4: Create Dockerfile**

```dockerfile
FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    nodejs \
    npm \
    && rm -rf /var/lib/apt/lists/*

RUN pip install uv
COPY pyproject.toml .
RUN uv pip install --system -e ".[dev]"

COPY . .

CMD ["uvicorn", "orchestrator.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

- [ ] **Step 5: Create package __init__.py files**

```bash
mkdir -p shared agent orchestrator orchestrator/api orchestrator/db tests/agent tests/orchestrator tests/integration scripts
touch shared/__init__.py agent/__init__.py orchestrator/__init__.py orchestrator/api/__init__.py orchestrator/db/__init__.py
```

- [ ] **Step 6: Set up virtual environment and install**

Run:
```bash
cd /Users/I528710/Desktop/Yash/Hackathon/01\ Google/vigil
python3.11 -m venv .venv
source .venv/bin/activate
pip install uv
uv pip install -e ".[dev]"
```

Expected: All dependencies install successfully.

- [ ] **Step 7: Commit scaffold**

```bash
git add -A
git commit -m "feat: project scaffold with dependencies and docker-compose"
```

---

## Task 2: Shared Schemas

**Files:**
- Create: `shared/schemas.py`
- Create: `tests/test_schemas.py`

- [ ] **Step 1: Write tests for shared schemas**

```python
# tests/test_schemas.py
import pytest
from shared.schemas import (
    RiskLevel, Confidence, RecommendedAction, FailureType,
    RiskAssessment, FailureClassification, RemediationOutcome, ReasoningTrace,
)


def test_risk_assessment_valid():
    ra = RiskAssessment(
        risk_level=RiskLevel.RED,
        reasoning="Only one sync window remaining before critical SLA.",
        recommended_action=RecommendedAction.EARLY_SYNC,
        confidence=Confidence.HIGH,
        confidence_factors=["Weekend failures observed", "One sync window left"],
    )
    assert ra.risk_level == RiskLevel.RED
    assert ra.recommended_action == RecommendedAction.EARLY_SYNC
    assert len(ra.confidence_factors) == 2


def test_failure_classification_valid():
    fc = FailureClassification(
        failure_type=FailureType.SCHEMA_CHANGE,
        evidence=["setup test: schema_mismatch", "column 'quarterly_target' not found"],
        from_history=True,
        recommended_fix=["reload_connection_schema_config", "sync_connection"],
    )
    assert fc.failure_type == FailureType.SCHEMA_CHANGE
    assert fc.from_history is True


def test_remediation_outcome_valid():
    ro = RemediationOutcome(
        actions_taken=["reload_connection_schema_config", "sync_connection"],
        success=True,
        connector_status_after="scheduled",
        time_elapsed_seconds=47.2,
        sla_impact="met",
    )
    assert ro.success is True
    assert ro.sla_impact == "met"


def test_reasoning_trace_proactive():
    trace = ReasoningTrace(
        phase="proactive",
        connector_id="connector_abc123",
        connector_name="salesforce_prod",
        sla_name="Board Revenue Dashboard",
        business_impact="critical",
        assessment=RiskAssessment(
            risk_level=RiskLevel.RED,
            reasoning="Elevated weekend risk.",
            recommended_action=RecommendedAction.EARLY_SYNC,
            confidence=Confidence.HIGH,
            confidence_factors=["Weekend pattern"],
        ),
        classification=None,
        outcome=None,
        escalation_message=None,
        timestamp="2026-06-09T03:15:00Z",
    )
    assert trace.phase == "proactive"
    assert trace.assessment is not None
    assert trace.classification is None


def test_reasoning_trace_reactive():
    trace = ReasoningTrace(
        phase="reactive",
        connector_id="connector_abc123",
        connector_name="salesforce_prod",
        sla_name="Board Revenue Dashboard",
        business_impact="critical",
        assessment=None,
        classification=FailureClassification(
            failure_type=FailureType.SCHEMA_CHANGE,
            evidence=["schema_mismatch"],
            from_history=True,
            recommended_fix=["reload_connection_schema_config"],
        ),
        outcome=RemediationOutcome(
            actions_taken=["reload_connection_schema_config", "sync_connection"],
            success=True,
            connector_status_after="scheduled",
            time_elapsed_seconds=47.0,
            sla_impact="met",
        ),
        escalation_message=None,
        timestamp="2026-06-09T03:15:00Z",
    )
    assert trace.phase == "reactive"
    assert trace.classification.failure_type == FailureType.SCHEMA_CHANGE
    assert trace.outcome.success is True


def test_reasoning_trace_serialization():
    trace = ReasoningTrace(
        phase="proactive",
        connector_id="abc",
        connector_name="salesforce",
        sla_name=None,
        business_impact="medium",
        assessment=None,
        classification=None,
        outcome=None,
        escalation_message=None,
        timestamp="2026-06-09T00:00:00Z",
    )
    data = trace.model_dump()
    assert data["phase"] == "proactive"
    assert data["sla_name"] is None
    reparsed = ReasoningTrace.model_validate(data)
    assert reparsed == trace
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pytest tests/test_schemas.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'shared.schemas'`

- [ ] **Step 3: Implement shared/schemas.py**

```python
# shared/schemas.py
from __future__ import annotations

from enum import Enum
from typing import Optional

from pydantic import BaseModel


class RiskLevel(str, Enum):
    GREEN = "GREEN"
    YELLOW = "YELLOW"
    RED = "RED"


class Confidence(str, Enum):
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"


class RecommendedAction(str, Enum):
    MONITOR = "MONITOR"
    EARLY_SYNC = "EARLY_SYNC"
    ESCALATE = "ESCALATE"


class FailureType(str, Enum):
    SCHEMA_CHANGE = "SCHEMA_CHANGE"
    RATE_LIMIT = "RATE_LIMIT"
    AUTH_EXPIRED = "AUTH_EXPIRED"
    SOURCE_OUTAGE = "SOURCE_OUTAGE"
    DESTINATION_ERROR = "DESTINATION_ERROR"
    UNKNOWN = "UNKNOWN"


class RiskAssessment(BaseModel):
    risk_level: RiskLevel
    reasoning: str
    recommended_action: RecommendedAction
    confidence: Confidence
    confidence_factors: list[str]


class FailureClassification(BaseModel):
    failure_type: FailureType
    evidence: list[str]
    from_history: bool
    recommended_fix: list[str]


class RemediationOutcome(BaseModel):
    actions_taken: list[str]
    success: bool
    connector_status_after: str
    time_elapsed_seconds: float
    sla_impact: str


class ReasoningTrace(BaseModel):
    phase: str
    connector_id: str
    connector_name: str
    sla_name: Optional[str]
    business_impact: str
    assessment: Optional[RiskAssessment] = None
    classification: Optional[FailureClassification] = None
    outcome: Optional[RemediationOutcome] = None
    escalation_message: Optional[str] = None
    timestamp: str
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pytest tests/test_schemas.py -v`
Expected: All 6 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add shared/schemas.py tests/test_schemas.py
git commit -m "feat: shared Pydantic schemas for agent-orchestrator contract"
```

---

## Task 3: Orchestrator Config & MongoDB Client

**Files:**
- Create: `orchestrator/config.py`
- Create: `orchestrator/db/client.py`
- Create: `orchestrator/db/models.py`
- Create: `orchestrator/db/queries.py`
- Create: `tests/orchestrator/test_db.py`

- [ ] **Step 1: Write orchestrator/config.py**

```python
# orchestrator/config.py
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    mongodb_uri: str = "mongodb://localhost:27017"
    mongodb_db: str = "vigil"
    fivetran_api_key: str = ""
    fivetran_api_secret: str = ""
    fivetran_allow_writes: bool = True
    google_api_key: str = ""
    scheduler_interval_seconds: int = 300
    sse_heartbeat_seconds: int = 15
    log_level: str = "INFO"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
```

- [ ] **Step 2: Write orchestrator/db/client.py**

```python
# orchestrator/db/client.py
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from orchestrator.config import settings

_client: AsyncIOMotorClient | None = None
_db: AsyncIOMotorDatabase | None = None


async def get_db() -> AsyncIOMotorDatabase:
    global _client, _db
    if _db is None:
        _client = AsyncIOMotorClient(settings.mongodb_uri)
        _db = _client[settings.mongodb_db]
    return _db


async def close_db() -> None:
    global _client, _db
    if _client is not None:
        _client.close()
        _client = None
        _db = None
```

- [ ] **Step 3: Write orchestrator/db/models.py**

```python
# orchestrator/db/models.py
from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class SLADefinition(BaseModel):
    id: str = Field(alias="_id")
    name: str
    connector_id: str
    connector_name: str
    deadline_cron: str
    deadline_description: str
    buffer_hours: int = 3
    stakeholder: str
    business_impact: str  # critical | high | medium | low
    impact_context: str
    escalation_channel: str = ""
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True


class Incident(BaseModel):
    id: str = Field(alias="_id")
    connector_id: str
    sla_id: Optional[str] = None
    detected_at: datetime
    failure_type: str
    agent_actions: list[dict] = Field(default_factory=list)
    resolved_at: Optional[datetime] = None
    time_to_resolve_seconds: Optional[float] = None
    sla_impact: str = "unknown"
    sla_deadline: Optional[datetime] = None
    human_intervention_required: bool = False
    reasoning_trace: Optional[dict] = None

    class Config:
        populate_by_name = True


class ConnectorHealth(BaseModel):
    id: str = Field(alias="_id")
    connector_id: str
    date: str
    syncs_attempted: int = 0
    syncs_succeeded: int = 0
    syncs_failed: int = 0
    failure_types: list[str] = Field(default_factory=list)
    avg_sync_duration_seconds: float = 0.0
    failure_rate_7d: float = 0.0
    weekend_failure_rate: float = 0.0

    class Config:
        populate_by_name = True
```

- [ ] **Step 4: Write orchestrator/db/queries.py**

```python
# orchestrator/db/queries.py
from __future__ import annotations

from datetime import datetime, timedelta
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
```

- [ ] **Step 5: Write tests for DB queries**

```python
# tests/orchestrator/test_db.py
import pytest
from unittest.mock import AsyncMock, MagicMock, patch

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
```

- [ ] **Step 6: Run tests**

Run: `pytest tests/orchestrator/test_db.py -v`
Expected: All 4 tests PASS.

- [ ] **Step 7: Commit**

```bash
git add orchestrator/config.py orchestrator/db/ tests/orchestrator/
git commit -m "feat: orchestrator config, MongoDB client, models, and queries"
```

---

## Task 4: Agent Definition & System Prompt

**Files:**
- Create: `agent/config.py`
- Create: `agent/prompts.py`
- Create: `agent/agent.py`

- [ ] **Step 1: Write agent/config.py**

```python
# agent/config.py
from orchestrator.config import settings


FIVETRAN_MCP_COMMAND = "uvx"
FIVETRAN_MCP_ARGS = ["--from", "git+https://github.com/fivetran/fivetran-mcp", "fivetran-mcp"]

MONGODB_MCP_COMMAND = "npx"
MONGODB_MCP_ARGS = ["-y", "mongodb-mcp-server"]

MODEL = "gemini-2.5-flash"
```

- [ ] **Step 2: Write agent/prompts.py**

```python
# agent/prompts.py
from shared.schemas import (
    RiskAssessment, FailureClassification, RemediationOutcome, ReasoningTrace,
)

SYSTEM_PROMPT = """You are Vigil, a data reliability agent. Your job is to protect business SLAs by proactively assessing pipeline risk and autonomously remediating failures.

## Tools Available

1. **Fivetran MCP** (read + write):
   - `get_connection_details` — get connector status (succeeded_at, failed_at, sync_state, sync_frequency)
   - `list_connections` — discover all connectors
   - `sync_connection` — trigger an immediate sync
   - `run_connection_setup_tests` — diagnose why a connector is broken
   - `reload_connection_schema_config` — fix schema drift by reloading from source
   - `modify_connection_schema_config` — enable/disable tables or columns
   - `modify_connection` — change sync_frequency or pause state

2. **MongoDB MCP** (read-only):
   - `find` — query collections (incidents, connector_patterns)
   - `aggregate` — run aggregation pipelines

## Operating Modes

### Mode: proactive
You receive SLA definition + health stats. Your job:
1. Fetch LIVE connector status via Fivetran MCP (get_connection_details)
2. Query MongoDB for connector patterns (past incidents, failure rates)
3. Assess risk considering: time to deadline, syncs remaining, failure rate, weekend patterns, business impact
4. If risk is RED: trigger an early sync via Fivetran MCP (sync_connection)
5. After triggering: verify the sync started successfully
6. Return your assessment as a ReasoningTrace

### Mode: reactive
You receive connector_id + failure event + SLA at risk + health stats. Your job:
1. Run setup tests via Fivetran MCP (run_connection_setup_tests) to diagnose the failure
2. Query MongoDB for past incidents on this connector
3. Classify the failure type (SCHEMA_CHANGE, RATE_LIMIT, AUTH_EXPIRED, SOURCE_OUTAGE, DESTINATION_ERROR, UNKNOWN)
4. Execute the appropriate fix:
   - SCHEMA_CHANGE: reload_connection_schema_config → sync_connection
   - RATE_LIMIT: modify_connection (reduce sync_frequency) → sync_connection
   - AUTH_EXPIRED: ESCALATE (you cannot fix this)
   - SOURCE_OUTAGE: ESCALATE (source is down, nothing to do)
   - DESTINATION_ERROR: ESCALATE
   - UNKNOWN: ESCALATE with full diagnostics
5. After fixing: verify recovery via get_connection_details
6. Return your classification + outcome as a ReasoningTrace

## Business Impact Levels
- critical: Executive-facing, board reports. Fix immediately.
- high: Team dashboards, daily standups. Fix within buffer window.
- medium: Internal analytics. Fix next cycle.
- low: Dev/staging. Log only.

When multiple issues exist, prioritize by business_impact. Explain WHY you prioritized one over another.

## Output Format

ALWAYS end your response with a JSON block matching this schema:

```json
{
  "phase": "proactive" | "reactive" | "escalation",
  "connector_id": "string",
  "connector_name": "string",
  "sla_name": "string or null",
  "business_impact": "critical" | "high" | "medium" | "low",
  "assessment": {
    "risk_level": "GREEN" | "YELLOW" | "RED",
    "reasoning": "string",
    "recommended_action": "MONITOR" | "EARLY_SYNC" | "ESCALATE",
    "confidence": "HIGH" | "MEDIUM" | "LOW",
    "confidence_factors": ["string"]
  },
  "classification": {
    "failure_type": "SCHEMA_CHANGE" | "RATE_LIMIT" | "AUTH_EXPIRED" | "SOURCE_OUTAGE" | "DESTINATION_ERROR" | "UNKNOWN",
    "evidence": ["string"],
    "from_history": true | false,
    "recommended_fix": ["string"]
  },
  "outcome": {
    "actions_taken": ["string"],
    "success": true | false,
    "connector_status_after": "string",
    "time_elapsed_seconds": 0.0,
    "sla_impact": "met" | "at_risk" | "breached"
  },
  "escalation_message": "string or null",
  "timestamp": "ISO 8601 string"
}
```

Include only relevant fields: proactive mode uses `assessment`, reactive mode uses `classification` + `outcome`. Set unused fields to null.

## Rules
- Always explain your reasoning in plain language BEFORE the JSON output
- If you cannot fix something, ESCALATE — do not retry indefinitely
- Maximum 3 retry attempts for any single action
- If a fix succeeds, verify by re-checking connector status
- Never guess credentials or authentication tokens
"""
```

- [ ] **Step 3: Write agent/agent.py**

```python
# agent/agent.py
from __future__ import annotations

from google.adk.agents import LlmAgent
from google.adk.tools.mcp_tool import McpToolset
from google.adk.tools.mcp_tool.mcp_session_manager import StdioConnectionParams
from mcp import StdioServerParameters

from agent.config import (
    FIVETRAN_MCP_COMMAND,
    FIVETRAN_MCP_ARGS,
    MONGODB_MCP_COMMAND,
    MONGODB_MCP_ARGS,
    MODEL,
)
from agent.prompts import SYSTEM_PROMPT
from orchestrator.config import settings


def create_vigil_agent() -> LlmAgent:
    fivetran_toolset = McpToolset(
        connection_params=StdioConnectionParams(
            server_params=StdioServerParameters(
                command=FIVETRAN_MCP_COMMAND,
                args=FIVETRAN_MCP_ARGS,
                env={
                    "FIVETRAN_API_KEY": settings.fivetran_api_key,
                    "FIVETRAN_API_SECRET": settings.fivetran_api_secret,
                    "FIVETRAN_ALLOW_WRITES": "true",
                },
            ),
        ),
    )

    mongodb_toolset = McpToolset(
        connection_params=StdioConnectionParams(
            server_params=StdioServerParameters(
                command=MONGODB_MCP_COMMAND,
                args=MONGODB_MCP_ARGS,
                env={
                    "MDB_MCP_CONNECTION_STRING": settings.mongodb_uri,
                },
            ),
        ),
        tool_filter=["find", "aggregate"],
    )

    return LlmAgent(
        model=MODEL,
        name="vigil",
        instruction=SYSTEM_PROMPT,
        tools=[fivetran_toolset, mongodb_toolset],
    )
```

- [ ] **Step 4: Verify agent module imports cleanly**

Run: `python -c "from agent.agent import create_vigil_agent; print('OK')"`
Expected: `OK` (may warn about missing API keys, but should not error on import)

- [ ] **Step 5: Commit**

```bash
git add agent/
git commit -m "feat: ADK agent definition with Fivetran + MongoDB MCP toolsets"
```

---

## Task 5: Orchestrator Core — FastAPI App, SSE, Invoker

**Files:**
- Create: `orchestrator/main.py`
- Create: `orchestrator/api/events.py`
- Create: `orchestrator/invoker.py`
- Create: `tests/orchestrator/test_main.py`

- [ ] **Step 1: Write orchestrator/api/events.py (SSE manager)**

```python
# orchestrator/api/events.py
from __future__ import annotations

import asyncio
import json
from typing import AsyncGenerator

from fastapi import APIRouter
from sse_starlette.sse import EventSourceResponse

router = APIRouter()

_subscribers: list[asyncio.Queue] = []


async def broadcast(event_type: str, data: dict) -> None:
    message = {"event": event_type, "data": json.dumps(data)}
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
            message = await queue.get()
            yield message
    except asyncio.CancelledError:
        pass


@router.get("/api/events")
async def sse_stream():
    queue: asyncio.Queue = asyncio.Queue(maxsize=100)
    _subscribers.append(queue)

    async def generate():
        try:
            async for message in _event_generator(queue):
                yield message
        finally:
            if queue in _subscribers:
                _subscribers.remove(queue)

    return EventSourceResponse(generate())
```

- [ ] **Step 2: Write orchestrator/invoker.py**

```python
# orchestrator/invoker.py
from __future__ import annotations

import json
import re
from datetime import datetime, timezone

from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai import types as genai_types

from agent.agent import create_vigil_agent
from shared.schemas import ReasoningTrace

_runner: Runner | None = None
_session_service = InMemorySessionService()


def _get_runner() -> Runner:
    global _runner
    if _runner is None:
        agent = create_vigil_agent()
        _runner = Runner(agent=agent, app_name="vigil", session_service=_session_service)
    return _runner


def _extract_json_from_response(text: str) -> dict | None:
    json_match = re.search(r"```json\s*(.*?)\s*```", text, re.DOTALL)
    if json_match:
        try:
            return json.loads(json_match.group(1))
        except json.JSONDecodeError:
            pass
    try:
        last_brace = text.rfind("}")
        first_brace = text.find("{")
        if first_brace != -1 and last_brace != -1:
            return json.loads(text[first_brace : last_brace + 1])
    except json.JSONDecodeError:
        pass
    return None


async def invoke_agent(context: dict) -> ReasoningTrace:
    runner = _get_runner()

    session = await _session_service.create_session(app_name="vigil", user_id="system")

    message = json.dumps(context, indent=2, default=str)

    response_text = ""
    async for event in runner.run_async(
        user_id="system",
        session_id=session.id,
        new_message=genai_types.Content(
            role="user", parts=[genai_types.Part(text=message)]
        ),
    ):
        if event.content and event.content.parts:
            for part in event.content.parts:
                if part.text:
                    response_text += part.text

    parsed = _extract_json_from_response(response_text)

    if parsed:
        try:
            return ReasoningTrace.model_validate(parsed)
        except Exception:
            pass

    return ReasoningTrace(
        phase=context.get("mode", "unknown"),
        connector_id=context.get("connector_id", "unknown"),
        connector_name=context.get("sla", {}).get("connector_name", "unknown"),
        sla_name=context.get("sla", {}).get("name"),
        business_impact=context.get("sla", {}).get("business_impact", "unknown"),
        assessment=None,
        classification=None,
        outcome=None,
        escalation_message=f"Agent response could not be parsed: {response_text[:500]}",
        timestamp=datetime.now(timezone.utc).isoformat(),
    )
```

- [ ] **Step 3: Write orchestrator/main.py**

```python
# orchestrator/main.py
from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from orchestrator.db.client import get_db, close_db
from orchestrator.api.events import router as events_router
from orchestrator.config import settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    await get_db()
    yield
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


@app.get("/health")
async def health():
    return {"status": "ok", "service": "vigil-orchestrator"}
```

- [ ] **Step 4: Write a basic test**

```python
# tests/orchestrator/test_main.py
import pytest
from httpx import AsyncClient, ASGITransport

from orchestrator.main import app


@pytest.mark.asyncio
async def test_health_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"
```

- [ ] **Step 5: Run test**

Run: `pytest tests/orchestrator/test_main.py -v`
Expected: PASS

- [ ] **Step 6: Verify server starts**

Run: `timeout 5 uvicorn orchestrator.main:app --port 8000 || true`
Expected: Server starts (then exits after 5s timeout). No import errors.

- [ ] **Step 7: Commit**

```bash
git add orchestrator/main.py orchestrator/api/events.py orchestrator/invoker.py tests/orchestrator/test_main.py
git commit -m "feat: orchestrator core with FastAPI, SSE, and agent invoker"
```

---

## Task 6: Scheduler & Proactive Flow

**Files:**
- Create: `orchestrator/scheduler.py`
- Create: `orchestrator/api/slas.py`
- Modify: `orchestrator/main.py` (add scheduler startup + SLA routes)

- [ ] **Step 1: Write orchestrator/scheduler.py**

```python
# orchestrator/scheduler.py
from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timezone

from croniter import croniter

from orchestrator.config import settings
from orchestrator.db.client import get_db
from orchestrator.db.queries import get_all_slas, get_health_stats, get_recent_incidents
from orchestrator.invoker import invoke_agent
from orchestrator.api.events import broadcast

logger = logging.getLogger(__name__)


def get_next_deadline(cron_expr: str) -> datetime:
    now = datetime.now(timezone.utc)
    cron = croniter(cron_expr, now)
    return cron.get_next(datetime).replace(tzinfo=timezone.utc)


def compute_deterministic_facts(sla: dict, health: dict) -> dict:
    now = datetime.now(timezone.utc)
    next_deadline = get_next_deadline(sla["deadline_cron"])
    time_until_deadline = (next_deadline - now).total_seconds()

    sync_frequency_seconds = health.get("sync_frequency_seconds", 21600)
    syncs_remaining = time_until_deadline / sync_frequency_seconds if sync_frequency_seconds > 0 else 0
    failure_rate = health.get("failure_rate_7d", 0.0)

    return {
        "time_until_deadline_seconds": time_until_deadline,
        "time_until_deadline_human": f"{time_until_deadline / 60:.0f} minutes",
        "next_deadline": next_deadline.isoformat(),
        "syncs_remaining": syncs_remaining,
        "failure_rate_7d": failure_rate,
        "weekend_failure_rate": health.get("weekend_failure_rate", 0.0),
    }


def is_green(facts: dict) -> bool:
    return facts["syncs_remaining"] >= 3 and facts["failure_rate_7d"] < 0.05


async def run_proactive_check() -> None:
    db = await get_db()
    slas = await get_all_slas(db)

    for sla in slas:
        connector_id = sla["connector_id"]
        health = await get_health_stats(db, connector_id)
        facts = compute_deterministic_facts(sla, health)

        if is_green(facts):
            logger.debug(f"[{sla['name']}] GREEN — skipping agent invocation")
            await broadcast("sla_update", {
                "sla_id": sla["_id"],
                "status": "GREEN",
                "last_checked": datetime.now(timezone.utc).isoformat(),
            })
            continue

        logger.info(f"[{sla['name']}] Non-GREEN — invoking agent")

        incidents = await get_recent_incidents(db, connector_id, limit=5)
        context = {
            "mode": "proactive",
            "sla": sla,
            "health_stats": {**health, **facts},
            "recent_incidents": incidents,
        }

        trace = await invoke_agent(context)

        await db.reasoning_traces.insert_one(trace.model_dump())
        await broadcast("trace", trace.model_dump())
        await broadcast("sla_update", {
            "sla_id": sla["_id"],
            "status": trace.assessment.risk_level if trace.assessment else "UNKNOWN",
            "last_checked": datetime.now(timezone.utc).isoformat(),
        })

        if trace.outcome:
            incident_doc = {
                "_id": f"inc_{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}_{connector_id[:8]}",
                "connector_id": connector_id,
                "sla_id": sla["_id"],
                "detected_at": datetime.now(timezone.utc),
                "failure_type": "PROACTIVE_INTERVENTION",
                "agent_actions": trace.outcome.actions_taken,
                "resolved_at": datetime.now(timezone.utc) if trace.outcome.success else None,
                "time_to_resolve_seconds": trace.outcome.time_elapsed_seconds,
                "sla_impact": trace.outcome.sla_impact,
                "human_intervention_required": not trace.outcome.success,
                "reasoning_trace": trace.model_dump(),
            }
            await db.incidents.insert_one(incident_doc)
            await broadcast("incident", incident_doc)


async def scheduler_loop() -> None:
    interval = settings.scheduler_interval_seconds
    logger.info(f"Scheduler started — checking every {interval}s")
    while True:
        try:
            await run_proactive_check()
        except Exception as e:
            logger.error(f"Scheduler error: {e}", exc_info=True)
        await asyncio.sleep(interval)
```

- [ ] **Step 2: Write orchestrator/api/slas.py**

```python
# orchestrator/api/slas.py
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
```

- [ ] **Step 3: Update orchestrator/main.py to add scheduler + SLA routes**

```python
# orchestrator/main.py (full replacement)
from __future__ import annotations

import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from orchestrator.db.client import get_db, close_db
from orchestrator.api.events import router as events_router
from orchestrator.api.slas import router as slas_router
from orchestrator.scheduler import scheduler_loop
from orchestrator.config import settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    await get_db()
    task = asyncio.create_task(scheduler_loop())
    yield
    task.cancel()
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
```

- [ ] **Step 4: Run existing tests to confirm nothing broke**

Run: `pytest tests/ -v`
Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add orchestrator/scheduler.py orchestrator/api/slas.py orchestrator/main.py
git commit -m "feat: scheduler with Layer 1 deterministic engine + proactive agent invocation"
```

---

## Task 7: Webhook Handler & Reactive Flow

**Files:**
- Create: `orchestrator/webhook.py`
- Create: `orchestrator/api/incidents.py`
- Create: `orchestrator/api/connectors.py`
- Modify: `orchestrator/main.py` (add webhook + incident + connector routes)

- [ ] **Step 1: Write orchestrator/webhook.py**

```python
# orchestrator/webhook.py
from __future__ import annotations

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Request

from orchestrator.db.client import get_db
from orchestrator.db.queries import get_sla_by_connector, get_health_stats, get_recent_incidents
from orchestrator.invoker import invoke_agent
from orchestrator.api.events import broadcast

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api")


@router.post("/webhooks/fivetran")
async def fivetran_webhook(request: Request):
    payload = await request.json()
    event_type = payload.get("event", "")
    connector_id = payload.get("connector_id", "")

    logger.info(f"Webhook received: {event_type} for {connector_id}")

    if event_type not in ("sync_end",) or payload.get("data", {}).get("status") != "FAILED":
        return {"status": "ignored", "reason": "not a failure event"}

    db = await get_db()
    sla = await get_sla_by_connector(db, connector_id)
    health = await get_health_stats(db, connector_id)
    incidents = await get_recent_incidents(db, connector_id, limit=5)

    context = {
        "mode": "reactive",
        "connector_id": connector_id,
        "failure_event": payload,
        "sla_at_risk": sla,
        "health_stats": health,
        "recent_incidents": incidents,
    }

    trace = await invoke_agent(context)

    await db.reasoning_traces.insert_one(trace.model_dump())

    incident_doc = {
        "_id": f"inc_{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}_{connector_id[:8]}",
        "connector_id": connector_id,
        "sla_id": sla["_id"] if sla else None,
        "detected_at": datetime.now(timezone.utc),
        "failure_type": trace.classification.failure_type if trace.classification else "UNKNOWN",
        "agent_actions": trace.outcome.actions_taken if trace.outcome else [],
        "resolved_at": datetime.now(timezone.utc) if trace.outcome and trace.outcome.success else None,
        "time_to_resolve_seconds": trace.outcome.time_elapsed_seconds if trace.outcome else None,
        "sla_impact": trace.outcome.sla_impact if trace.outcome else "unknown",
        "human_intervention_required": not (trace.outcome and trace.outcome.success),
        "reasoning_trace": trace.model_dump(),
    }
    await db.incidents.insert_one(incident_doc)

    await broadcast("trace", trace.model_dump())
    await broadcast("incident", incident_doc)
    if sla:
        await broadcast("sla_update", {
            "sla_id": sla["_id"],
            "status": "RED" if not (trace.outcome and trace.outcome.success) else "GREEN",
            "last_checked": datetime.now(timezone.utc).isoformat(),
        })

    return {"status": "processed", "trace_id": incident_doc["_id"]}
```

- [ ] **Step 2: Write orchestrator/api/incidents.py**

```python
# orchestrator/api/incidents.py
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
```

- [ ] **Step 3: Write orchestrator/api/connectors.py**

```python
# orchestrator/api/connectors.py
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
```

- [ ] **Step 4: Update orchestrator/main.py to include new routers**

Add these imports and includes after existing routers:

```python
from orchestrator.webhook import router as webhook_router
from orchestrator.api.incidents import router as incidents_router
from orchestrator.api.connectors import router as connectors_router

# ... after existing app.include_router calls:
app.include_router(webhook_router)
app.include_router(incidents_router)
app.include_router(connectors_router)
```

- [ ] **Step 5: Run all tests**

Run: `pytest tests/ -v`
Expected: All pass.

- [ ] **Step 6: Commit**

```bash
git add orchestrator/webhook.py orchestrator/api/incidents.py orchestrator/api/connectors.py orchestrator/main.py
git commit -m "feat: webhook handler for reactive flow + incidents/connectors API"
```

---

## Task 8: Seed Script

**Files:**
- Create: `scripts/seed.py`

- [ ] **Step 1: Write scripts/seed.py**

```python
# scripts/seed.py
"""Seed MongoDB with demo SLA definitions and fake historical data."""
from __future__ import annotations

import asyncio
from datetime import datetime, timezone, timedelta
from motor.motor_asyncio import AsyncIOMotorClient

from orchestrator.config import settings


SLAS = [
    {
        "_id": "sla_board_revenue",
        "name": "Board Revenue Dashboard",
        "connector_id": "connector_salesforce",
        "connector_name": "salesforce_prod",
        "deadline_cron": "0 9 * * 1",
        "deadline_description": "Monday 9:00 AM UTC",
        "buffer_hours": 3,
        "stakeholder": "CFO",
        "business_impact": "critical",
        "impact_context": "CFO presents revenue numbers to board. Wrong data = public embarrassment.",
        "escalation_channel": "slack:#data-oncall",
        "created_at": datetime.now(timezone.utc),
    },
    {
        "_id": "sla_marketing_weekly",
        "name": "Marketing Weekly Report",
        "connector_id": "connector_analytics",
        "connector_name": "google_analytics_prod",
        "deadline_cron": "0 8 * * 4",
        "deadline_description": "Thursday 8:00 AM UTC",
        "buffer_hours": 6,
        "stakeholder": "VP Marketing",
        "business_impact": "medium",
        "impact_context": "Weekly marketing performance review. Delay is inconvenient, not critical.",
        "escalation_channel": "slack:#marketing-data",
        "created_at": datetime.now(timezone.utc),
    },
    {
        "_id": "sla_ops_dashboard",
        "name": "Ops Daily Dashboard",
        "connector_id": "connector_postgres",
        "connector_name": "postgres_prod",
        "deadline_cron": "0 7 * * *",
        "deadline_description": "Daily 7:00 AM UTC",
        "buffer_hours": 2,
        "stakeholder": "VP Engineering",
        "business_impact": "high",
        "impact_context": "Engineering standup uses this dashboard. Stale data causes confusion.",
        "escalation_channel": "slack:#eng-oncall",
        "created_at": datetime.now(timezone.utc),
    },
]

HEALTH_RECORDS = [
    {
        "_id": "health_connector_salesforce_today",
        "connector_id": "connector_salesforce",
        "date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "syncs_attempted": 12,
        "syncs_succeeded": 10,
        "syncs_failed": 2,
        "failure_types": ["SCHEMA_CHANGE", "SCHEMA_CHANGE"],
        "avg_sync_duration_seconds": 180,
        "failure_rate_7d": 0.18,
        "weekend_failure_rate": 0.38,
        "sync_frequency_seconds": 21600,
    },
    {
        "_id": "health_connector_analytics_today",
        "connector_id": "connector_analytics",
        "date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "syncs_attempted": 8,
        "syncs_succeeded": 8,
        "syncs_failed": 0,
        "failure_types": [],
        "avg_sync_duration_seconds": 90,
        "failure_rate_7d": 0.02,
        "weekend_failure_rate": 0.0,
        "sync_frequency_seconds": 43200,
    },
    {
        "_id": "health_connector_postgres_today",
        "connector_id": "connector_postgres",
        "date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "syncs_attempted": 24,
        "syncs_succeeded": 22,
        "syncs_failed": 2,
        "failure_types": ["RATE_LIMIT", "SOURCE_OUTAGE"],
        "avg_sync_duration_seconds": 45,
        "failure_rate_7d": 0.08,
        "weekend_failure_rate": 0.04,
        "sync_frequency_seconds": 3600,
    },
]

INCIDENTS = [
    {
        "_id": "inc_seed_001",
        "connector_id": "connector_salesforce",
        "sla_id": "sla_board_revenue",
        "detected_at": datetime.now(timezone.utc) - timedelta(days=3),
        "failure_type": "SCHEMA_CHANGE",
        "agent_actions": [
            {"action": "run_connection_setup_tests", "result": "schema_mismatch"},
            {"action": "reload_connection_schema_config", "result": "success"},
            {"action": "sync_connection", "result": "success"},
        ],
        "resolved_at": datetime.now(timezone.utc) - timedelta(days=3) + timedelta(seconds=120),
        "time_to_resolve_seconds": 120,
        "sla_impact": "met",
        "human_intervention_required": False,
    },
    {
        "_id": "inc_seed_002",
        "connector_id": "connector_salesforce",
        "sla_id": "sla_board_revenue",
        "detected_at": datetime.now(timezone.utc) - timedelta(days=7),
        "failure_type": "SCHEMA_CHANGE",
        "agent_actions": [
            {"action": "reload_connection_schema_config", "result": "success"},
            {"action": "sync_connection", "result": "success"},
        ],
        "resolved_at": datetime.now(timezone.utc) - timedelta(days=7) + timedelta(seconds=90),
        "time_to_resolve_seconds": 90,
        "sla_impact": "met",
        "human_intervention_required": False,
    },
    {
        "_id": "inc_seed_003",
        "connector_id": "connector_salesforce",
        "sla_id": "sla_board_revenue",
        "detected_at": datetime.now(timezone.utc) - timedelta(days=14),
        "failure_type": "AUTH_EXPIRED",
        "agent_actions": [
            {"action": "run_connection_setup_tests", "result": "auth_failure"},
        ],
        "resolved_at": datetime.now(timezone.utc) - timedelta(days=14) + timedelta(minutes=12),
        "time_to_resolve_seconds": 720,
        "sla_impact": "at_risk",
        "human_intervention_required": True,
    },
]


async def seed():
    client = AsyncIOMotorClient(settings.mongodb_uri)
    db = client[settings.mongodb_db]

    await db.sla_definitions.drop()
    await db.connector_health.drop()
    await db.incidents.drop()
    await db.reasoning_traces.drop()

    if SLAS:
        await db.sla_definitions.insert_many(SLAS)
        print(f"Seeded {len(SLAS)} SLA definitions")

    if HEALTH_RECORDS:
        await db.connector_health.insert_many(HEALTH_RECORDS)
        print(f"Seeded {len(HEALTH_RECORDS)} health records")

    if INCIDENTS:
        await db.incidents.insert_many(INCIDENTS)
        print(f"Seeded {len(INCIDENTS)} historical incidents")

    print("Done.")
    client.close()


if __name__ == "__main__":
    asyncio.run(seed())
```

- [ ] **Step 2: Test the seed script against local MongoDB**

Run:
```bash
docker-compose up -d mongodb
python scripts/seed.py
```
Expected:
```
Seeded 3 SLA definitions
Seeded 3 health records
Seeded 3 historical incidents
Done.
```

- [ ] **Step 3: Commit**

```bash
git add scripts/seed.py
git commit -m "feat: seed script with demo SLA definitions and historical data"
```

---

## Task 9: Dashboard Scaffold

**Files:**
- Create: `dashboard/package.json`
- Create: `dashboard/vite.config.ts`
- Create: `dashboard/tailwind.config.ts`
- Create: `dashboard/postcss.config.js`
- Create: `dashboard/index.html`
- Create: `dashboard/src/App.tsx`
- Create: `dashboard/src/main.tsx`
- Create: `dashboard/src/index.css`
- Create: `dashboard/src/types/index.ts`
- Create: `dashboard/src/hooks/useSSE.ts`
- Create: `dashboard/src/hooks/useAPI.ts`
- Create: `dashboard/tsconfig.json`

- [ ] **Step 1: Initialize dashboard**

```bash
cd /Users/I528710/Desktop/Yash/Hackathon/01\ Google/vigil
npm create vite@latest dashboard -- --template react-ts
cd dashboard
npm install tailwindcss @tailwindcss/vite
```

- [ ] **Step 2: Write dashboard/vite.config.ts**

```typescript
// dashboard/vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})
```

- [ ] **Step 3: Write dashboard/src/index.css**

```css
@import "tailwindcss";

:root {
  --color-bg: #0f1729;
  --color-surface: #1a2332;
  --color-border: #2a3a4e;
  --color-text: #e2e8f0;
  --color-muted: #94a3b8;
  --color-green: #22c55e;
  --color-yellow: #eab308;
  --color-red: #ef4444;
}

body {
  background-color: var(--color-bg);
  color: var(--color-text);
  font-family: 'Inter', system-ui, sans-serif;
}
```

- [ ] **Step 4: Write dashboard/src/types/index.ts**

```typescript
// dashboard/src/types/index.ts
export type RiskLevel = 'GREEN' | 'YELLOW' | 'RED'
export type Confidence = 'HIGH' | 'MEDIUM' | 'LOW'
export type RecommendedAction = 'MONITOR' | 'EARLY_SYNC' | 'ESCALATE'
export type FailureType = 'SCHEMA_CHANGE' | 'RATE_LIMIT' | 'AUTH_EXPIRED' | 'SOURCE_OUTAGE' | 'DESTINATION_ERROR' | 'UNKNOWN'

export interface RiskAssessment {
  risk_level: RiskLevel
  reasoning: string
  recommended_action: RecommendedAction
  confidence: Confidence
  confidence_factors: string[]
}

export interface FailureClassification {
  failure_type: FailureType
  evidence: string[]
  from_history: boolean
  recommended_fix: string[]
}

export interface RemediationOutcome {
  actions_taken: string[]
  success: boolean
  connector_status_after: string
  time_elapsed_seconds: number
  sla_impact: string
}

export interface ReasoningTrace {
  phase: string
  connector_id: string
  connector_name: string
  sla_name: string | null
  business_impact: string
  assessment: RiskAssessment | null
  classification: FailureClassification | null
  outcome: RemediationOutcome | null
  escalation_message: string | null
  timestamp: string
}

export interface SLAStatus {
  sla_id: string
  status: RiskLevel
  last_checked: string
}

export interface Incident {
  _id: string
  connector_id: string
  sla_id: string | null
  detected_at: string
  failure_type: string
  time_to_resolve_seconds: number | null
  sla_impact: string
  human_intervention_required: boolean
}
```

- [ ] **Step 5: Write dashboard/src/hooks/useSSE.ts**

```typescript
// dashboard/src/hooks/useSSE.ts
import { useEffect, useRef, useState, useCallback } from 'react'
import type { ReasoningTrace, SLAStatus, Incident } from '../types'

export function useSSE() {
  const [traces, setTraces] = useState<ReasoningTrace[]>([])
  const [slaUpdates, setSlaUpdates] = useState<Record<string, SLAStatus>>({})
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [connected, setConnected] = useState(false)
  const eventSourceRef = useRef<EventSource | null>(null)

  useEffect(() => {
    const es = new EventSource('/api/events')
    eventSourceRef.current = es

    es.onopen = () => setConnected(true)
    es.onerror = () => setConnected(false)

    es.addEventListener('trace', (e) => {
      const trace: ReasoningTrace = JSON.parse(e.data)
      setTraces((prev) => [trace, ...prev].slice(0, 50))
    })

    es.addEventListener('sla_update', (e) => {
      const update: SLAStatus = JSON.parse(e.data)
      setSlaUpdates((prev) => ({ ...prev, [update.sla_id]: update }))
    })

    es.addEventListener('incident', (e) => {
      const incident: Incident = JSON.parse(e.data)
      setIncidents((prev) => [incident, ...prev].slice(0, 50))
    })

    return () => {
      es.close()
      eventSourceRef.current = null
    }
  }, [])

  return { traces, slaUpdates, incidents, connected }
}
```

- [ ] **Step 6: Write dashboard/src/hooks/useAPI.ts**

```typescript
// dashboard/src/hooks/useAPI.ts
import { useState, useEffect } from 'react'

export function useAPI<T>(url: string) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [url])

  return { data, loading, error }
}
```

- [ ] **Step 7: Write dashboard/src/App.tsx (minimal shell)**

```tsx
// dashboard/src/App.tsx
import { useSSE } from './hooks/useSSE'
import { useAPI } from './hooks/useAPI'

function App() {
  const { traces, slaUpdates, incidents, connected } = useSSE()
  const { data: slasData } = useAPI<{ slas: any[] }>('/api/slas')

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <aside className="w-16 bg-[#1a2332] border-r border-[#2a3a4e] flex flex-col items-center py-4 gap-4">
        <div className="text-lg font-bold text-white">V</div>
        <div className="w-8 h-px bg-[#2a3a4e]" />
        <button className="text-[#94a3b8] hover:text-white text-xs">SLAs</button>
        <button className="text-[#94a3b8] hover:text-white text-xs">Trace</button>
        <button className="text-[#94a3b8] hover:text-white text-xs">Inc.</button>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto p-6">
        {/* Connection indicator */}
        <div className="flex items-center gap-2 mb-6">
          <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-xs text-[#94a3b8]">
            {connected ? 'Connected' : 'Disconnected'}
          </span>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-[#1a2332] border border-[#2a3a4e] rounded-lg p-4">
            <div className="text-2xl font-bold">{slasData?.slas?.length ?? 0}</div>
            <div className="text-xs text-[#94a3b8]">SLAs Monitored</div>
          </div>
          <div className="bg-[#1a2332] border border-[#2a3a4e] rounded-lg p-4">
            <div className="text-2xl font-bold text-green-500">0</div>
            <div className="text-xs text-[#94a3b8]">Active Breaches</div>
          </div>
          <div className="bg-[#1a2332] border border-[#2a3a4e] rounded-lg p-4">
            <div className="text-2xl font-bold">{incidents.length}</div>
            <div className="text-xs text-[#94a3b8]">Incidents</div>
          </div>
          <div className="bg-[#1a2332] border border-[#2a3a4e] rounded-lg p-4">
            <div className="text-2xl font-bold">—</div>
            <div className="text-xs text-[#94a3b8]">Avg MTTR</div>
          </div>
        </div>

        {/* Traces */}
        <div className="bg-[#1a2332] border border-[#2a3a4e] rounded-lg p-4">
          <h2 className="text-sm font-semibold mb-3">Reasoning Traces</h2>
          {traces.length === 0 ? (
            <p className="text-xs text-[#94a3b8]">Waiting for agent activity...</p>
          ) : (
            <div className="space-y-2 font-mono text-xs">
              {traces.map((t, i) => (
                <div key={i} className="border border-[#2a3a4e] rounded p-2">
                  <div className="flex items-center gap-2">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      t.assessment?.risk_level === 'RED' ? 'bg-red-500/20 text-red-400' :
                      t.assessment?.risk_level === 'YELLOW' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-green-500/20 text-green-400'
                    }`}>
                      {t.assessment?.risk_level ?? t.classification?.failure_type ?? 'INFO'}
                    </span>
                    <span>{t.connector_name}</span>
                    <span className="text-[#94a3b8]">• {t.phase}</span>
                  </div>
                  <p className="mt-1 text-[#94a3b8]">
                    {t.assessment?.reasoning ?? t.escalation_message ?? 'Processing...'}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default App
```

- [ ] **Step 8: Write dashboard/src/main.tsx**

```tsx
// dashboard/src/main.tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

- [ ] **Step 9: Verify dashboard builds**

Run:
```bash
cd dashboard
npm install
npm run build
```
Expected: Build succeeds with no errors.

- [ ] **Step 10: Commit**

```bash
cd ..
git add dashboard/
git commit -m "feat: React dashboard scaffold with SSE hooks, types, and dark mode layout"
```

---

## Task 10: Integration Test & End-to-End Verification

**Files:**
- Create: `tests/integration/test_e2e.py`

- [ ] **Step 1: Write integration test**

```python
# tests/integration/test_e2e.py
"""
End-to-end smoke test: starts orchestrator, hits endpoints, verifies SSE.
Requires: local MongoDB running (docker-compose up -d mongodb)
Does NOT require Fivetran credentials (tests API/DB layer only).
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
```

- [ ] **Step 2: Run integration tests (with local MongoDB)**

Run:
```bash
docker-compose up -d mongodb
pytest tests/integration/test_e2e.py -v
```
Expected: All 5 tests PASS.

- [ ] **Step 3: Full test suite**

Run: `pytest tests/ -v`
Expected: All tests pass (schemas + DB mocks + integration).

- [ ] **Step 4: Commit**

```bash
git add tests/integration/
git commit -m "feat: integration tests for orchestrator API endpoints"
```

- [ ] **Step 5: Final commit — push everything**

```bash
git push origin main
```

---

## Summary of What's Built After All Tasks

| Task | What it produces |
|------|-----------------|
| 1 | Project scaffold, dependencies, Docker setup |
| 2 | Shared Pydantic schemas (agent ↔ orchestrator contract) |
| 3 | MongoDB client, models, queries, config |
| 4 | ADK agent with Fivetran + MongoDB MCP toolsets + system prompt |
| 5 | FastAPI app, SSE broadcast, agent invoker |
| 6 | Scheduler with Layer 1 deterministic engine + proactive agent invocation |
| 7 | Webhook handler for reactive flow + REST API endpoints |
| 8 | Seed script with demo data |
| 9 | React dashboard with SSE, dark mode, stat cards, trace viewer |
| 10 | Integration tests + end-to-end verification |

After completing all 10 tasks, you have a working Vigil system that:
- Periodically checks SLAs against connector health
- Skips healthy connectors (Layer 1 fast-exit)
- Invokes Gemini agent for risk assessment when needed
- Agent acts directly via Fivetran MCP (trigger syncs, fix schema, etc.)
- Receives Fivetran webhooks for instant failure detection
- Streams live reasoning traces to React dashboard via SSE
- Persists all incidents and traces to MongoDB
