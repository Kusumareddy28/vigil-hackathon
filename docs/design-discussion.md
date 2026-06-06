# Vigil — Design Discussion Record

This document captures the full design discussion, section by section — what was proposed, what feedback was given, what changed, and what was finalized.

---

## Section 1: Architecture & Component Boundaries

### Approaches Considered

**Approach A: Monolithic Agent (Single ADK Process)**
- One process handles everything: scheduling, webhooks, MCP calls, reasoning, API serving
- Pros: Simplest, one deployment, fast to build
- Cons: Can't scale parts independently, single point of failure, hard to test

**Approach B: Service-Oriented (Selected)**
- Three components: Orchestrator (FastAPI) + Agent (ADK) + Dashboard (React)
- Pros: Clean separation, testable, each component has one job, enterprise-ready
- Cons: More code, inter-service API contract needed

**Approach C: Event-Driven (Pub/Sub)**
- Cloud Functions triggered by events, Pub/Sub topics
- Pros: Maximum scalability
- Cons: Overkill, harder to demo locally, cold start issues

### Decision
**Approach B selected.** Clean enough for enterprise, not overengineered. The orchestrator handles deterministic work (scheduling, logging, API). The agent handles only reasoning.

### Final Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                              VIGIL                                    │
│                                                                      │
│  ORCHESTRATOR SERVICE (FastAPI, Python)                              │
│  ├── Scheduler (periodic SLA checks)                                │
│  ├── Webhook Receiver (Fivetran sync events)                        │
│  ├── Agent Invoker (builds context, calls agent, parses response)   │
│  ├── MongoDB Client (motor async — SLA defs, incidents, health)     │
│  ├── REST API (for dashboard)                                       │
│  └── SSE Endpoint (live event stream to dashboard)                  │
│                                                                      │
│  AGENT SERVICE (ADK, in-process with orchestrator)                  │
│  ├── LlmAgent("vigil") with Gemini 2.5 Flash                       │
│  ├── McpToolset(Fivetran MCP) — read + write connectors             │
│  ├── McpToolset(MongoDB MCP) — read-only self-query for patterns    │
│  └── Returns structured ReasoningTrace                              │
│                                                                      │
│  REACT DASHBOARD (Vite + Tailwind)                                  │
│  ├── Consumes REST API for initial load                             │
│  └── Consumes SSE for live updates                                  │
└──────────────────────────────────────────────────────────────────────┘
```

### Boundary Rules (Strict)

| Component | Does | Does NOT |
|---|---|---|
| Orchestrator | Scheduling, webhook handling, MongoDB CRUD, REST API, SSE, invoking agent | LLM calls, Fivetran MCP calls, reasoning |
| Agent | Risk assessment, failure classification, remediation via MCP, reasoning | Scheduling, persistence, API serving |
| Dashboard | Visualization, user interaction | Business logic, direct DB access, agent calls |

---

## Section 2: Data Flow & Agent Invocation

### Key Design Decision: Who Executes Remediation?

**Option A — Agent executes directly via MCP tools (Selected)**
- The agent decides AND acts (calls sync_connection, reload_schema through its MCP toolset)
- Agent can react to tool results in real-time (diagnose → fix → verify in one turn)
- Multi-step remediation flows naturally

**Option B — Agent decides, Orchestrator executes (Rejected)**
- Agent returns decision, orchestrator calls Fivetran
- Rejected because: makes the agent a glorified function dispatcher, loses multi-step reasoning loop

### Feedback Received

> "If the agent executes directly (Option A), the orchestrator shouldn't also be calling Fivetran MCP. The orchestrator's post-agent job is: persist the incident/trace to MongoDB, push SSE event to dashboard. It never touches Fivetran directly."

### Corrected Flow

```
Orchestrator builds context → Agent assesses + acts (via MCP) → Agent returns outcome → Orchestrator logs + notifies
```

- Orchestrator provides: what it OWNS (SLA definitions, health stats — from MongoDB)
- Agent fetches: live state from EXTERNAL systems (Fivetran MCP)
- Orchestrator NEVER touches Fivetran. Ever.

### Final Proactive Flow

```
Scheduler tick
    ▼
Orchestrator
    1. Load SLAs from MongoDB (motor)
    2. Load connector health stats from MongoDB (motor)
    3. Build context payload {mode: "proactive", sla, health_stats}
    4. Invoke Agent
    ▼
Agent (ADK + Gemini)
    1. Fetch live connector status via Fivetran MCP (get_connection_details)
    2. Query MongoDB MCP for connector_patterns
    3. Layer 1: Deterministic fast-exit if clearly healthy
    4. Layer 2: Gemini risk assessment with full context
    5. IF action needed: execute via Fivetran MCP (sync_connection, etc.)
    6. IF acted: verify via Fivetran MCP (re-check status)
    7. Return ReasoningTrace
    ▼
Orchestrator
    1. Persist ReasoningTrace to MongoDB (motor)
    2. Update connector_health stats
    3. Push SSE event to dashboard
```

### Final Reactive Flow

```
Fivetran webhook (sync_end, status=FAILED)
    ▼
Orchestrator
    1. Receive webhook at POST /api/webhooks/fivetran
    2. Look up affected SLA from MongoDB
    3. Load health stats
    4. Build context {mode: "reactive", connector_id, failure_event, sla_at_risk, health_stats}
    5. Invoke Agent
    ▼
Agent
    1. Run setup tests via Fivetran MCP
    2. Query MongoDB MCP for past incidents on this connector
    3. Classify failure (informed by diagnostics + history)
    4. Execute remediation via Fivetran MCP
    5. Verify recovery via Fivetran MCP
    6. Return ReasoningTrace
    ▼
Orchestrator
    1. Persist incident to MongoDB
    2. Update connector_patterns
    3. Push SSE events
    4. IF agent escalated: format escalation message
```

---

## Section 3: Project Structure & Tech Stack

### Feedback Received

> "Shared types between agent and orchestrator — The agent returns structured decisions that the orchestrator parses. Without a shared module you'll have two copies that drift."

### Resolution
Added `shared/` module:
```
vigil/
├── shared/
│   ├── __init__.py
│   └── schemas.py    # Single source of truth for all Pydantic models
```

Both `orchestrator/invoker.py` (parsing) and `agent/prompts.py` (defining output format) import from the same place.

### Final Tech Stack

| Layer | Technology | Why |
|---|---|---|
| Agent | Google ADK 2.0 | Hackathon requirement, native MCP via McpToolset |
| LLM | Gemini 2.5 Flash | Fast, cheap, structured reasoning |
| MCP (Fivetran) | fivetran/fivetran-mcp (stdio) | Direct read/write connector operations |
| MCP (MongoDB) | mongodb-mcp-server | Agent self-query for patterns |
| Backend | FastAPI + Uvicorn | Async, lightweight, SSE support |
| Database | MongoDB Atlas + Motor | Flexible schema, async, partner track |
| Validation | Pydantic v2 | Type safety, JSON schema generation |
| Frontend | React 19 + Vite + Tailwind | Fast, modern, dark mode |
| Deployment | Cloud Run (min-instances: 1) | Serverless, scheduler stays alive |
| Python | 3.11+ | Required by ADK |

### Final Project Structure

```
vigil/
├── shared/                    # Shared types (agent ↔ orchestrator)
│   ├── __init__.py
│   └── schemas.py
├── agent/                     # Agent Service (ADK)
│   ├── __init__.py
│   ├── agent.py               # LlmAgent definition + MCP toolsets
│   ├── prompts.py             # System instruction
│   └── config.py
├── orchestrator/              # Orchestrator Service (FastAPI)
│   ├── __init__.py
│   ├── main.py                # FastAPI app, startup
│   ├── scheduler.py           # Periodic SLA check loop
│   ├── webhook.py             # Fivetran webhook handler
│   ├── invoker.py             # Calls agent, parses ReasoningTrace
│   ├── api/
│   │   ├── slas.py            # SLA CRUD
│   │   ├── incidents.py       # Incident history
│   │   ├── connectors.py     # Connector health
│   │   └── events.py         # SSE stream
│   ├── db/
│   │   ├── client.py          # Motor async connection
│   │   ├── models.py          # DB document models
│   │   └── queries.py        # Common queries
│   └── config.py
├── dashboard/                 # React Frontend
│   ├── src/
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
│   │   └── types/index.ts
│   └── ...
├── tests/
├── scripts/seed.py
├── docker-compose.yml
├── Dockerfile
├── pyproject.toml
└── .env.example
```

---

## Section 4: Agent System Prompt & Structured Outputs

### Feedback Received

> "assess_sla_risk() / classify_failure() / generate_escalation() as 'tools' — these are the agent's reasoning outputs, not tools it calls on itself. Better framed as structured output schemas the agent returns."

### Resolution

Tools are ONLY external capabilities:
- McpToolset(Fivetran MCP) — read/write connectors
- McpToolset(MongoDB MCP) — read-only self-query

Risk assessment, classification, and escalation are **structured output schemas** defined in the system prompt. The agent returns JSON matching these schemas. They are NOT self-invoked tools.

### Invocation Modes

```python
# Proactive — orchestrator provides SLA + health, agent fetches live Fivetran state
context = {
    "mode": "proactive",
    "sla": { ... },            # From MongoDB
    "health_stats": { ... },   # From MongoDB
}

# Reactive — orchestrator provides failure event + SLA at risk + health
context = {
    "mode": "reactive",
    "connector_id": "...",
    "failure_event": { ... },   # Webhook payload
    "sla_at_risk": { ... },
    "health_stats": { ... },
}
```

### Feedback on Pre-Fetching

> "Don't pre-fetch connector status in the orchestrator. Let the agent always fetch it via Fivetran MCP. Reasons: agent may need to re-check mid-reasoning, stale data risk if scheduler queues multiple checks, muddies the boundary."

### Resolution
Orchestrator passes ONLY what it owns (MongoDB data). Agent always pulls live Fivetran state itself.

### Final Structured Outputs

```python
class RiskAssessment(BaseModel):
    risk_level: RiskLevel          # GREEN | YELLOW | RED
    reasoning: str                  # Natural language explanation
    recommended_action: RecommendedAction  # MONITOR | EARLY_SYNC | ESCALATE
    confidence: Confidence          # HIGH | MEDIUM | LOW
    confidence_factors: list[str]   # Why this confidence level

class FailureClassification(BaseModel):
    failure_type: FailureType       # SCHEMA_CHANGE | RATE_LIMIT | AUTH_EXPIRED | ...
    evidence: list[str]             # What data supports this classification
    from_history: bool              # Was this informed by past patterns?
    recommended_fix: list[str]      # Ordered list of actions to try

class RemediationOutcome(BaseModel):
    actions_taken: list[str]        # What the agent actually did
    success: bool
    connector_status_after: str     # Final state after action
    time_elapsed_seconds: float
    sla_impact: str                 # "met" | "at_risk" | "breached"

class ReasoningTrace(BaseModel):    # Universal return type
    phase: str                      # "proactive" | "reactive" | "escalation"
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

---

## Section 5: Dashboard & Live Feed

### Initial Proposal
- WebSocket for live dashboard updates

### Feedback Received

> "SSE is simpler for one-way server→client feed. WebSocket only needed if the dashboard sends commands back. For demo, SSE is sufficient and faster to build."

### Resolution
SSE (Server-Sent Events) via `GET /api/events`. One-way feed. Three event types:
- `trace` — full reasoning trace (powers Reasoning Trace panel)
- `sla_update` — SLA status change (powers SLA Cards)
- `incident` — new or resolved incident (powers Timeline)

### Dashboard Feedback

> "Add left sidebar nav. Every monitoring tool uses it. Add summary stat cards at top. Dark mode default. Reasoning Trace should look like structured log (not chat). Incident Timeline should be horizontal state bars per connector."

### Final Dashboard Design

```
┌──────┬──────────────────────────────────────────────────────────┐
│      │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│  S   │  │ 3 SLAs   │ │ 0        │ │ 12       │ │ 47s      │  │
│  I   │  │ monitored│ │ breached │ │ resolved │ │ avg MTTR │  │
│  D   │  └──────────┘ └──────────┘ └──────────┘ └──────────┘  │
│  E   │                                                          │
│  B   │  ┌────────────────────┐  ┌─────────────────────────────┐│
│  A   │  │  SLA STATUS CARDS  │  │  REASONING TRACE            ││
│  R   │  │  (GREEN/YELLOW/RED)│  │  (structured log, monospace)││
│      │  │                    │  │  collapsible rows, severity ││
│      │  │                    │  │  badges, expand for detail   ││
│      │  └────────────────────┘  └─────────────────────────────┘│
│      │                                                          │
│      │  ┌──────────────────────────────────────────────────────┐│
│      │  │  CONNECTOR STATE TIMELINE (horizontal bars)          ││
│      │  │  salesforce ████████░░░░████████████████████████████  ││
│      │  │  analytics  ████████████████████████████████████████  ││
│      │  │  [detail log below as vertical list]                 ││
│      │  └──────────────────────────────────────────────────────┘│
└──────┴──────────────────────────────────────────────────────────┘
```

Design principles:
- **Dark mode default** (deep navy background, bright status colors)
- **Left sidebar** (fixed, icon + label navigation)
- **Stat cards top** (glanceable health, colored thresholds)
- **Reasoning Trace = structured log** (not chat bubbles)
- **Timeline = horizontal state bars** per connector (Grafana pattern)

---

## Section 6: Deployment & Local Dev

### Local Dev
```yaml
# docker-compose.yml
services:
  mongodb:
    image: mongo:7
    ports: ["27017:27017"]
  orchestrator:
    build: .
    ports: ["8000:8000"]
    env_file: .env
    depends_on: [mongodb]
  dashboard:
    build: ./dashboard
    ports: ["5173:5173"]
    depends_on: [orchestrator]
```

Agent runs in-process with orchestrator. Fivetran MCP launches as stdio subprocess via ADK's McpToolset.

### Production (Cloud Run)
- Single container: orchestrator + agent (in-process)
- `min-instances: 1` (scheduler needs container alive)
- MongoDB Atlas (free tier)
- Dashboard: separate Cloud Run service or Firebase Hosting (static)

### Feedback Received

> "Cloud Run scales to zero by default. Your scheduler needs the container alive. Set min-instances: 1."

### Resolution
`min-instances: 1` in Cloud Run service config. Internal scheduler stays alive. No external Cloud Scheduler needed for the hackathon.

---

## Cross-Cutting Design Decisions

### Two-Layer Risk Engine

**Why not just rules?**
- A judge will ask "why use Gemini?"
- Rules can't differentiate business impact between same-failure-rate connectors

**Why not just LLM?**
- Slow and expensive for healthy connectors
- Wasteful to burn tokens on GREEN status

**Final design:**
- Layer 1 (Deterministic): Computes facts. Fast-exits if clearly healthy.
- Layer 2 (Gemini): Reasons about business context when risk is unclear or elevated.

### Confidence as Categories (Not Numbers)

**Problem:** Returning `"confidence": 0.87` invites "what model? what accuracy?"

**Solution:** Return `"confidence": "HIGH"` with explicit factors:
```json
{
  "confidence": "HIGH",
  "confidence_factors": [
    "Weekend failures observed (38% vs 8% weekday)",
    "Only one sync window remaining",
    "Critical business SLA (board presentation)"
  ]
}
```

Defensible. No fake precision.

### Business Impact Scoring

Not just static labels. Gemini justifies prioritization in natural language:
```
"Revenue Dashboard directly affects executive reporting.
 The board meeting is in 45 minutes — no retry window.
 Marketing report deadline is 4 days away.
 Prioritizing salesforce_prod."
```

### MongoDB as Agent Memory

Three roles:
1. **Configuration** (sla_definitions) — what to protect
2. **Memory** (incidents) — what happened
3. **Intelligence** (connector_patterns) — what works

First failure = reason from scratch. Tenth failure = pattern match + fast action.

### "Why Not a Cron Job?" Answer

A cron job: `if failed: retry()`

Vigil:
- Investigates WHY (setup tests + classification)
- Evaluates business impact (SLA context)
- Prioritizes (critical before medium)
- Chooses the right fix (schema reload vs. reduce frequency vs. escalate)
- Knows its limits (escalates auth failures)
- Learns from history (connector patterns)
- Explains decisions (reasoning trace)

---

## What Was Killed During Design

| Proposal | Why Killed |
|---|---|
| assess_sla_risk() as a "tool" | Not a tool — it's a structured output schema |
| WebSocket for dashboard | SSE is sufficient (one-way feed) |
| Orchestrator pre-fetches Fivetran state | Muddies boundary, stale data risk |
| Orchestrator calls Fivetran MCP | Only agent touches Fivetran |
| Precise confidence (0.87) | Invites "what model?" — use HIGH/MEDIUM/LOW with factors |
| "Predicts SLA breach" language | Overstated — use "assesses SLA breach risk" |
| Pattern learning in MVP | Nice-to-have, not required for core demo |
| Header-based nav | Every monitoring tool uses left sidebar |
| Chat-bubble reasoning trace | Should be structured log (Datadog pattern) |
| Vertical-only incident timeline | Horizontal state bars per connector (Grafana pattern) |
