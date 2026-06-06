# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

Vigil is a proactive data reliability agent for the Google Cloud Rapid Agent Hackathon (Fivetran partner track). It prevents executives from making decisions on stale data by assessing SLA breach risk and autonomously fixing failing Fivetran pipelines.

**Hackathon deadline: June 11, 2026 @ 2:00 PM PDT. Track: Fivetran.**

## Core Architecture (Service-Oriented)

```
┌────────────────────┐     ┌─────────────────────────────────────┐     ┌──────────────┐
│  REACT DASHBOARD   │────▶│       ORCHESTRATOR SERVICE          │────▶│ AGENT SERVICE│
│                    │     │           (FastAPI)                  │     │  (ADK+Gemini)│
│ • SLA status cards │     │                                     │     │              │
│ • Reasoning traces │     │ • Scheduler (periodic SLA checks)   │     │ • Risk assess│
│ • Incident timeline│     │ • Webhook receiver (Fivetran events)│     │ • Classify   │
│ • Live activity    │     │ • Invokes Agent with context        │     │ • Decide+Act │
│                    │     │ • Direct MongoDB (fast CRUD)         │     │              │
│                    │     │ • REST API + SSE for dashboard      │     │ • Fivetran   │
│                    │     │                                     │     │   MCP (R/W)  │
│                    │     │                                     │     │ • MongoDB    │
│                    │     │                                     │     │   MCP (query)│
└────────────────────┘     └─────────────────────────────────────┘     └──────────────┘
```

### Service Responsibilities

| Component | Does | Does NOT |
|-----------|------|----------|
| Orchestrator | Scheduling, webhook handling, MongoDB CRUD, REST API + SSE, invoking agent, Layer 1 deterministic engine | LLM calls, MCP tool calls, reasoning |
| Agent Service | Risk assessment, failure classification, remediation decisions, executes MCP tools directly | Scheduling, persistence, API serving |
| Dashboard | Visualization, user interaction via REST | Business logic, direct DB access |

### Communication

- Orchestrator → Agent: In-process (`runner.run_async()`) — same container in prod
- Orchestrator → Dashboard: REST API + SSE (`GET /api/events`)
- Agent → Fivetran: MCP (stdio subprocess)
- Agent → MongoDB: MCP (for self-query / pattern recall)
- Orchestrator → MongoDB: Direct motor (async pymongo) for fast CRUD

### Two Operating Modes

1. **Proactive (hero feature):** Orchestrator's scheduler checks SLA deadlines continuously. When Layer 1 flags elevated risk, invokes Agent for Gemini-powered risk assessment. Agent fetches live Fivetran state via MCP, assesses, and may trigger early sync directly.
2. **Reactive (fallback):** Webhook or polling detects sync failure. Orchestrator invokes Agent with diagnostics + history. Agent classifies, remediates (schema reload / reduce frequency / escalate), verifies — all via MCP in one reasoning turn.

### Two-Layer Risk Engine

- **Layer 1 (deterministic, in Orchestrator):** Computes time_until_deadline, syncs_remaining, failure_rate. Fast-exits GREEN if syncs_remaining >= 3 AND failure_rate < 5%. No LLM call needed.
- **Layer 2 (Gemini, in Agent Service):** Only invoked when Layer 1 flags non-GREEN. Evaluates business context, weekend patterns, historical incidents. Returns risk_level, reasoning, recommended_action, confidence + factors.

### Data Flow (Proactive)

```
Scheduler tick
  → Orchestrator loads SLAs + health stats from MongoDB
  → Layer 1 computes deterministic facts
  → If non-GREEN: invoke Agent with context (SLA def + health stats + history)
    → Agent fetches live connector state via Fivetran MCP
    → Agent queries MongoDB MCP for pattern recall
    → Agent assesses risk, decides action
    → If RED: Agent triggers sync_connection via Fivetran MCP directly
    → Agent returns ReasoningTrace
  → Orchestrator persists trace + incident to MongoDB
  → Orchestrator pushes SSE event to dashboard
```

The orchestrator never touches Fivetran directly. It provides context from its database; the agent pulls live state from external systems and executes actions.

## Project Structure

```
vigil/
├── shared/                    # Shared types (agent ↔ orchestrator contract)
│   ├── __init__.py
│   └── schemas.py            # RiskAssessment, FailureClassification, RemediationOutcome, ReasoningTrace
│
├── agent/                     # Agent Service (ADK)
│   ├── __init__.py
│   ├── agent.py              # LlmAgent definition, MCP toolsets
│   ├── prompts.py            # System instructions (references shared.schemas)
│   └── config.py             # Agent config (model, MCP connection params)
│
├── orchestrator/             # Orchestrator Service (FastAPI)
│   ├── __init__.py
│   ├── main.py               # FastAPI app, SSE endpoint, startup
│   ├── scheduler.py          # Periodic SLA check loop
│   ├── webhook.py            # Fivetran webhook receiver
│   ├── invoker.py            # Calls Agent Service, parses response (uses shared.schemas)
│   ├── api/
│   │   ├── __init__.py
│   │   ├── slas.py           # CRUD endpoints for SLA definitions
│   │   ├── incidents.py      # Incident history endpoints
│   │   ├── connectors.py    # Connector status endpoints
│   │   └── events.py        # SSE stream endpoint
│   ├── db/
│   │   ├── __init__.py
│   │   ├── client.py         # MongoDB connection (motor async)
│   │   ├── models.py         # Pydantic models for SLA, Incident, Health, Pattern
│   │   └── queries.py       # Common queries (get_health_stats, get_patterns)
│   ├── seed.py               # python -m orchestrator.seed
│   └── config.py             # Orchestrator config (MongoDB URI, ports, intervals)
│
├── dashboard/                # React Frontend
│   ├── package.json
│   ├── vite.config.ts
│   ├── src/
│   │   ├── App.tsx
│   │   ├── components/
│   │   │   ├── SLACards.tsx
│   │   │   ├── ReasoningTrace.tsx
│   │   │   ├── IncidentTimeline.tsx
│   │   │   └── ConnectorHealth.tsx
│   │   ├── hooks/
│   │   │   ├── useSSE.ts
│   │   │   └── useAPI.ts
│   │   └── types/
│   │       └── index.ts
│   └── tailwind.config.ts
│
├── tests/
│   ├── agent/
│   ├── orchestrator/
│   └── integration/
│
├── docker-compose.yml
├── Dockerfile.orchestrator
├── pyproject.toml
├── .env.example
├── IDEA.md
├── CLAUDE.md
└── docs/
```

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Agent | Google ADK | 2.0+ |
| LLM | Gemini 2.5 Flash | Latest |
| MCP (Fivetran) | fivetran/fivetran-mcp | Latest (stdio) |
| MCP (MongoDB) | mongodb-js/mongodb-mcp-server | Latest |
| Backend | FastAPI + Uvicorn | 0.100+ |
| Database | MongoDB Atlas (or local via docker) | 7.0+ |
| Async DB | Motor | 3.0+ |
| Validation | Pydantic v2 | 2.0+ |
| Frontend | React 19 + Vite + Tailwind | Latest |
| Deployment | Cloud Run (containers) | — |
| Python | 3.11+ | Required by ADK |
| Linting | ruff | Latest |
| Testing | pytest + pytest-asyncio | Latest |
| Types | mypy | Latest |

## Commands

```bash
# Local dev (all services)
docker-compose up

# Orchestrator only
source .venv/bin/activate
uvicorn orchestrator.main:app --reload --port 8000

# Agent testing via ADK
adk run agent        # CLI interaction
adk web agent        # Web UI for testing

# Dashboard (from dashboard/)
npm install
npm run dev

# Seed MongoDB with demo data
python -m orchestrator.seed

# Tests
pytest tests/
pytest tests/agent/ -k "test_risk_assessment"

# Lint + type check
ruff check .
mypy .
```

## Environment Variables

```env
# Fivetran
FIVETRAN_API_KEY=
FIVETRAN_API_SECRET=
FIVETRAN_ALLOW_WRITES=true

# MongoDB
MONGODB_URI=mongodb+srv://...
MONGODB_DB=vigil

# Google Cloud / Gemini
GOOGLE_CLOUD_PROJECT=
GOOGLE_API_KEY=

# App
SCHEDULER_INTERVAL_SECONDS=300
SSE_HEARTBEAT_SECONDS=15
```

## Shared Schemas (shared/schemas.py)

The contract between agent and orchestrator:

```python
class RiskLevel(str, Enum):
    GREEN = "GREEN"
    YELLOW = "YELLOW"
    RED = "RED"

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
    confidence: Confidence  # HIGH | MEDIUM | LOW
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
    sla_impact: str  # "met" | "at_risk" | "breached"

class ReasoningTrace(BaseModel):
    phase: str  # "proactive" | "reactive" | "escalation"
    connector_id: str
    connector_name: str
    sla_name: Optional[str]
    business_impact: str
    assessment: Optional[RiskAssessment]
    classification: Optional[FailureClassification]
    outcome: Optional[RemediationOutcome]
    escalation_message: Optional[str]
    timestamp: str
```

## Agent Invocation Modes

The orchestrator invokes the agent with one of two modes:

```python
# Proactive check
context = {
    "mode": "proactive",
    "sla": { ... },           # SLA definition from MongoDB
    "health_stats": { ... },  # Failure rates, patterns from MongoDB
}
# Agent fetches live Fivetran state itself via MCP

# Reactive (failure detected)
context = {
    "mode": "reactive",
    "connector_id": "...",
    "failure_event": { ... },  # Webhook payload or detected failure
    "sla_at_risk": { ... },    # Which SLA this affects
    "health_stats": { ... },   # Historical patterns
}
```

The agent always returns a `ReasoningTrace`.

## Agent Tools (MCP)

### Fivetran MCP (via `uvx --from git+https://github.com/fivetran/fivetran-mcp fivetran-mcp`)

| Tool | Mode | Purpose |
|------|------|---------|
| `list_connections` | Read | Discover connectors to monitor |
| `get_connection_details` | Read | Status: succeeded_at, failed_at, sync_state, sync_frequency |
| `get_connection_state` | Read | Current sync progress |
| `sync_connection` | Write | Trigger immediate sync (proactive or retry) |
| `run_connection_setup_tests` | Write | Diagnose WHY a connector is broken |
| `reload_connection_schema_config` | Write | Fix schema drift |
| `modify_connection` | Write | Adjust sync_frequency for rate limiting |
| `modify_connection_schema_config` | Write | Enable/disable tables after schema change |

### MongoDB MCP (agent self-query only)

Used by the agent during reasoning to recall patterns:
- Query `connector_patterns` for dominant failure type, success rates
- Query `incidents` for recent history of a specific connector

## MongoDB Collections

**`sla_definitions`** — Business deadlines the agent protects:
- `connector_id`, `deadline_cron`, `buffer_hours`, `stakeholder`, `business_impact` (critical/high/medium/low), `impact_context`

**`incidents`** — Every failure + agent action + outcome:
- `connector_id`, `sla_id`, `failure_type`, `agent_actions[]`, `time_to_resolve_seconds`, `sla_impact` (met/at_risk/breached)

**`connector_patterns`** — Learned behavior per connector:
- `dominant_failure_type`, `remediation_success_rates`, `time_patterns` (weekend vs weekday failure rates)

**`connector_health`** — Daily aggregates for deterministic engine

## SSE Events (GET /api/events)

```
event: trace
data: {"phase":"proactive","connector_name":"salesforce_prod","assessment":{"risk_level":"RED",...},...}

event: sla_update
data: {"sla_id":"sla_board_revenue","status":"GREEN","last_checked":"..."}

event: incident
data: {"id":"inc_001","connector":"salesforce_prod","type":"SCHEMA_CHANGE","resolved":true,"duration_seconds":47}
```

## Dashboard Design

Dark mode default. Left sidebar nav. Layout:

1. **Top row:** Summary stat cards (SLAs monitored, active incidents, SLAs-met rate, avg MTTR) — colored backgrounds based on thresholds
2. **Middle row:** SLA Status Cards (left) + Reasoning Trace Panel (right)
3. **Bottom row:** Incident Timeline (horizontal state bars per connector + vertical detail log)

Reasoning traces display as structured log entries (monospace, collapsible rows with colored severity badges), not chat bubbles.

## Deployment

**Local dev:** `docker-compose up` — MongoDB + orchestrator (agent in-process) + dashboard

**Production (Cloud Run):**
- Single container: orchestrator + agent in-process, Fivetran MCP as stdio subprocess
- Dashboard: static build served via Cloud Run or Firebase Hosting
- MongoDB Atlas (free tier)
- Set `min-instances: 1` on Cloud Run (scheduler needs container alive)

## Key Constraints

1. **Agent Service owns all reasoning.** Risk assessment, classification, and remediation decisions go through the ADK agent + Gemini. The orchestrator never makes AI decisions.
2. **Agent executes actions directly via MCP.** The agent decides AND acts (diagnose → fix → verify in one reasoning turn). The orchestrator's job: provide context, invoke agent, log outcome, notify dashboard.
3. **Orchestrator owns scheduling and state.** The agent is stateless per-invocation. The orchestrator assembles context from MongoDB and passes it in.
4. **Fivetran MCP for all pipeline operations.** Do not use Fivetran REST API directly (unless MCP has bugs — then fallback to REST with a comment explaining why).
5. **Orchestrator uses motor (async pymongo) for fast CRUD.** SLA definitions, incident logging, health tracking. The Agent uses MongoDB MCP only for self-query (pattern recall during reasoning).
6. **Reasoning traces are a UI feature.** Every agent decision must produce a visible trace: facts → Gemini reasoning → decision → outcome.
7. **Business impact scoring drives prioritization.** When two connectors fail simultaneously, Gemini must justify WHY it chose one over the other using business context.
8. **Don't pre-fetch Fivetran state in the orchestrator.** Let the agent pull live connector status itself via MCP. Avoids stale data and keeps the boundary clean (orchestrator provides DB context, agent provides live external state).

## Build Priority (MVP)

1. Fivetran MCP setup — install, configure, verify read+write works
2. MongoDB SLA schema — create collections, seed 2-3 SLA definitions
3. Shared schemas — define ReasoningTrace, RiskAssessment, FailureClassification
4. Agent definition — LlmAgent with system prompt, MCP toolsets
5. Orchestrator skeleton — FastAPI + scheduler + invoker
6. Core proactive flow — SLA check → Layer 1 → Agent → trace
7. Core reactive flow — failure detection → Agent diagnoses + fixes → trace
8. Incident logging — persist traces + outcomes to MongoDB
9. SSE + Dashboard — live event stream, SLA cards, trace viewer
10. Demo polish — seed data, accelerated timelines, live breakage scenario

## Hackathon Requirements

- [x] Google Cloud Agent Builder (ADK)
- [x] Fivetran MCP Server integration (read + write operations live)
- [ ] Functional hosted URL (Cloud Run)
- [ ] Public GitHub repo with open source license
- [ ] Demo video (max 3 minutes)
- [ ] Devpost submission
