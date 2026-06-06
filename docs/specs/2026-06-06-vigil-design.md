# Vigil — Technical Design Specification

## Overview

Vigil is a proactive data reliability agent that prevents business stakeholders from making decisions on stale data. It assesses SLA breach risk using connector health, historical incidents, deadline proximity, and business context — then triggers preventive actions and autonomously remediates failing Fivetran pipelines.

## Architecture

Service-oriented, three components:

1. **Orchestrator Service** (FastAPI) — scheduling, webhook handling, MongoDB CRUD, REST API, SSE, agent invocation
2. **Agent Service** (ADK, in-process) — Gemini reasoning, Fivetran MCP interaction, MongoDB MCP self-query
3. **React Dashboard** — visualization, live trace feed, SLA status

### Boundary Rules

- Orchestrator NEVER touches Fivetran directly
- Agent NEVER persists data directly (returns structured outcome, orchestrator persists)
- Dashboard NEVER calls agent or database directly (REST API + SSE only)

### Communication

```
Orchestrator → Agent:    In-process function call (dev + prod)
Orchestrator → Dashboard: REST API + SSE (GET /api/events)
Agent → Fivetran:        MCP (stdio subprocess)
Agent → MongoDB:         MCP (for pattern self-query)
Orchestrator → MongoDB:  Motor (async pymongo) for CRUD
```

## Data Flow

### Proactive (Scheduled Every 5 Minutes)

```
Scheduler tick
    │
    ▼
Orchestrator
    │ 1. Load SLAs from MongoDB (motor)
    │ 2. Load connector health stats from MongoDB (motor)
    │ 3. Build context payload {mode: "proactive", sla, health_stats}
    │ 4. Invoke Agent
    │
    ▼
Agent (ADK + Gemini 2.5 Flash)
    │ 1. Fetch live connector status via Fivetran MCP (get_connection_details)
    │ 2. Query MongoDB MCP for connector_patterns (historical fix rates, failure distribution)
    │ 3. Layer 1: Deterministic fast-exit if clearly healthy (syncs_remaining >= 3 AND rate < 5%)
    │ 4. Layer 2: Gemini risk assessment with full context
    │ 5. IF action needed: execute via Fivetran MCP (sync_connection, etc.)
    │ 6. IF acted: verify via Fivetran MCP (re-check status)
    │ 7. Return ReasoningTrace
    │
    ▼
Orchestrator
    │ 1. Persist ReasoningTrace to MongoDB (motor)
    │ 2. Update connector_health stats
    │ 3. Push SSE event (trace + sla_update)
    done
```

### Reactive (Webhook-Triggered)

```
Fivetran webhook (sync_end, status=FAILED)
    │
    ▼
Orchestrator
    │ 1. Receive webhook at POST /api/webhooks/fivetran
    │ 2. Look up affected SLA from MongoDB
    │ 3. Load health stats
    │ 4. Build context {mode: "reactive", connector_id, failure_event, sla_at_risk, health_stats}
    │ 5. Invoke Agent
    │
    ▼
Agent
    │ 1. Run setup tests via Fivetran MCP (run_connection_setup_tests)
    │ 2. Query MongoDB MCP for past incidents on this connector
    │ 3. Classify failure (informed by diagnostics + history)
    │ 4. Execute remediation via Fivetran MCP (reload_schema / modify_connection / etc.)
    │ 5. Verify recovery via Fivetran MCP
    │ 6. Return ReasoningTrace with RemediationOutcome
    │
    ▼
Orchestrator
    │ 1. Persist incident to MongoDB
    │ 2. Update connector_patterns (aggregated intelligence)
    │ 3. Push SSE events (incident + trace + sla_update)
    │ 4. IF agent escalated: format escalation message
    done
```

## Agent Design

### Framework

Google ADK 2.0 (Python). Agent runs in-process with the orchestrator.

### Agent Definition

```python
from google.adk.agents import LlmAgent
from google.adk.tools.mcp_tool import McpToolset
from google.adk.tools.mcp_tool.mcp_session_manager import StdioConnectionParams
from mcp import StdioServerParameters

vigil_agent = LlmAgent(
    model="gemini-2.5-flash",
    name="vigil",
    instruction=SYSTEM_PROMPT,  # from prompts.py
    tools=[
        McpToolset(
            connection_params=StdioConnectionParams(
                server_params=StdioServerParameters(
                    command="uvx",
                    args=["--from", "git+https://github.com/fivetran/fivetran-mcp", "fivetran-mcp"],
                    env={
                        "FIVETRAN_API_KEY": config.FIVETRAN_API_KEY,
                        "FIVETRAN_API_SECRET": config.FIVETRAN_API_SECRET,
                        "FIVETRAN_ALLOW_WRITES": "true",
                    },
                ),
            ),
        ),
        McpToolset(
            connection_params=StdioConnectionParams(
                server_params=StdioServerParameters(
                    command="npx",
                    args=["-y", "mongodb-mcp-server"],
                    env={
                        "MDB_MCP_CONNECTION_STRING": config.MONGODB_URI,
                    },
                ),
            ),
            tool_filter=["find", "aggregate"],  # Read-only for agent
        ),
    ],
)
```

### Structured Outputs

The agent's system prompt instructs it to return structured JSON matching these schemas. The orchestrator parses the response using Pydantic validation.

```python
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

### System Prompt (Summary)

The agent's system instruction covers:
1. Identity: "You are Vigil, a data reliability agent"
2. Tools available: Fivetran MCP (full read/write), MongoDB MCP (read-only query)
3. Proactive mode: Assess risk using deterministic facts + business context, act if needed
4. Reactive mode: Diagnose, classify (informed by history), remediate, verify
5. Always explain reasoning in natural language
6. Consider business impact when prioritizing (critical > high > medium > low)
7. Know limits — escalate when you cannot fix (auth failures, destination errors)
8. Output format: Always return valid JSON matching ReasoningTrace schema

## MongoDB Schema

### Collections

**sla_definitions** — Business SLA configurations
```json
{
  "_id": "sla_board_revenue",
  "name": "Board Revenue Dashboard",
  "connector_id": "connector_abc123",
  "connector_name": "salesforce_prod",
  "deadline_cron": "0 9 * * 1",
  "deadline_description": "Monday 9:00 AM",
  "buffer_hours": 3,
  "stakeholder": "CFO",
  "business_impact": "critical",
  "impact_context": "CFO presents revenue numbers to board. Wrong data = public embarrassment.",
  "escalation_channel": "slack:#data-oncall",
  "created_at": "2026-06-06T10:00:00Z"
}
```

**incidents** — Every agent action and outcome
```json
{
  "_id": "inc_20260609_001",
  "connector_id": "connector_abc123",
  "sla_id": "sla_board_revenue",
  "detected_at": "2026-06-09T03:15:00Z",
  "failure_type": "SCHEMA_CHANGE",
  "agent_actions": [
    {"action": "run_connection_setup_tests", "result": "schema_mismatch", "at": "..."},
    {"action": "reload_connection_schema_config", "result": "success", "at": "..."},
    {"action": "sync_connection", "result": "success", "at": "..."}
  ],
  "resolved_at": "2026-06-09T03:22:00Z",
  "time_to_resolve_seconds": 420,
  "sla_impact": "met",
  "sla_deadline": "2026-06-09T09:00:00Z",
  "human_intervention_required": false,
  "reasoning_trace": { ... }
}
```

**connector_health** — Daily aggregated stats
```json
{
  "_id": "health_connector_abc123_20260609",
  "connector_id": "connector_abc123",
  "date": "2026-06-09",
  "syncs_attempted": 4,
  "syncs_succeeded": 3,
  "syncs_failed": 1,
  "failure_types": ["SCHEMA_CHANGE"],
  "avg_sync_duration_seconds": 180,
  "failure_rate_7d": 0.12,
  "weekend_failure_rate": 0.38
}
```

**connector_patterns** — Aggregated intelligence (nice-to-have)
```json
{
  "_id": "pattern_connector_abc123",
  "connector_id": "connector_abc123",
  "total_incidents": 7,
  "dominant_failure_type": "SCHEMA_CHANGE",
  "failure_distribution": {"SCHEMA_CHANGE": 5, "RATE_LIMIT": 1, "AUTH_EXPIRED": 1},
  "remediation_success_rates": {
    "reload_schema": {"attempts": 7, "successes": 6, "rate": 0.86}
  },
  "avg_resolution_seconds": 120,
  "time_patterns": {"weekend_failure_rate": 0.38, "weekday_failure_rate": 0.08},
  "last_updated": "2026-06-09T03:22:00Z"
}
```

## Dashboard

### Tech
- React 19 + TypeScript + Vite + Tailwind CSS
- Dark mode default (deep navy, bright status colors)
- Native EventSource API for SSE

### Layout
- Fixed left sidebar navigation (SLAs, Trace, Incidents, Config)
- Top stat cards: SLAs monitored, active breaches, incidents resolved, avg MTTR
- Main area: SLA status cards + Reasoning trace (structured log, collapsible rows)
- Bottom: Connector state timeline (horizontal bars showing GREEN/YELLOW/RED over time)

### SSE Events
```
event: trace
data: { ReasoningTrace JSON }

event: sla_update
data: { sla_id, status, last_checked }

event: incident
data: { incident summary }
```

### REST API
- `GET /api/slas` — list all SLA definitions with current status
- `GET /api/incidents` — paginated incident history
- `GET /api/connectors` — connector health overview
- `GET /api/events` — SSE stream
- `POST /api/webhooks/fivetran` — Fivetran webhook receiver

## Project Structure

```
vigil/
├── shared/
│   ├── __init__.py
│   └── schemas.py             # Pydantic models (RiskAssessment, ReasoningTrace, etc.)
│
├── agent/
│   ├── __init__.py
│   ├── agent.py               # LlmAgent definition, MCP toolsets
│   ├── prompts.py             # System instruction, references shared.schemas
│   └── config.py              # Agent-specific config
│
├── orchestrator/
│   ├── __init__.py
│   ├── main.py                # FastAPI app, startup, lifespan
│   ├── scheduler.py           # Periodic SLA check loop (asyncio)
│   ├── webhook.py             # Fivetran webhook handler
│   ├── invoker.py             # Calls agent, parses ReasoningTrace
│   ├── api/
│   │   ├── __init__.py
│   │   ├── slas.py            # SLA CRUD endpoints
│   │   ├── incidents.py       # Incident history endpoints
│   │   ├── connectors.py     # Connector health endpoints
│   │   └── events.py         # SSE stream endpoint
│   ├── db/
│   │   ├── __init__.py
│   │   ├── client.py          # Motor async MongoDB connection
│   │   ├── models.py          # DB document models
│   │   └── queries.py        # Common queries
│   └── config.py              # Orchestrator config
│
├── dashboard/
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   ├── src/
│   │   ├── App.tsx
│   │   ├── components/
│   │   │   ├── Sidebar.tsx
│   │   │   ├── StatCards.tsx
│   │   │   ├── SLACards.tsx
│   │   │   ├── ReasoningTrace.tsx
│   │   │   ├── IncidentTimeline.tsx
│   │   │   └── ConnectorStateBar.tsx
│   │   ├── hooks/
│   │   │   ├── useSSE.ts
│   │   │   └── useAPI.ts
│   │   └── types/
│   │       └── index.ts
│   └── index.html
│
├── tests/
│   ├── agent/
│   ├── orchestrator/
│   └── integration/
│
├── scripts/
│   └── seed.py                # Seed MongoDB with demo data
│
├── docker-compose.yml
├── Dockerfile
├── pyproject.toml
├── .env.example
├── IDEA.md
├── docs/
│   ├── resources.md
│   ├── why-vigil.md
│   └── specs/
│       └── 2026-06-06-vigil-design.md
└── README.md
```

## Deployment

### Local Dev
```bash
docker-compose up  # MongoDB + orchestrator + dashboard
```

### Production (Cloud Run)
- Single container: orchestrator + agent (in-process)
- `min-instances: 1` (scheduler needs container alive)
- MongoDB Atlas free tier
- Dashboard: Cloud Run or Firebase Hosting (static)
- Fivetran MCP: stdio subprocess within container

### Environment
```bash
FIVETRAN_API_KEY=
FIVETRAN_API_SECRET=
FIVETRAN_ALLOW_WRITES=true
MONGODB_URI=mongodb+srv://...
MONGODB_DB=vigil
GOOGLE_CLOUD_PROJECT=
GOOGLE_API_KEY=
SCHEDULER_INTERVAL_SECONDS=300
SSE_HEARTBEAT_SECONDS=15
```

## Build Priority

### MVP (Must ship)
1. Fivetran MCP setup — verify read+write works
2. MongoDB schema — collections, seed data
3. Shared schemas — Pydantic models
4. Agent definition — ADK agent with MCP toolsets + system prompt
5. Orchestrator core — scheduler, invoker, MongoDB CRUD
6. Proactive flow — SLA check → risk assessment → sync trigger
7. Reactive flow — failure classification → remediation → verify
8. REST API + SSE — endpoints for dashboard
9. Reasoning trace output — structured logs
10. Demo polish — accelerated timelines, seed data, tested failure modes

### Nice to Have
11. Pattern learning (connector_patterns collection)
12. Success-rate statistics fed back into classification
13. Advanced multi-connector prioritization with Gemini reasoning
14. Full dashboard UI (sidebar, stat cards, state timeline)
15. Webhook-based detection (register Fivetran webhook)

## Demo Strategy

### Scenario Setup
- 2 Fivetran connectors (Google Sheets → BigQuery)
- 2 SLA definitions (one critical, one medium)
- Accelerated timeline: 5-min SLA, 1-min sync cadence
- Pre-seeded incident history for pattern context

### Three Acts (3 minutes)
1. **Proactive save** (90s): SLA approaching, agent assesses risk RED, triggers early sync, succeeds
2. **Reactive fix** (60s): Break connector live, agent diagnoses, fixes, verifies
3. **Intelligent escalation** (30s): Unfixable failure, agent escalates with full context

### Failure Modes (Test All, Use Most Reliable)
- A: Schema change (add column to Google Sheet)
- B: Pause + SLA pressure (most deterministic)
- C: Rate limit simulation
