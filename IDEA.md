# Vigil — Complete Project Specification

## The Problem

**Data teams get blindsided by stale data at the worst possible moment.**

A Fivetran connector fails silently at 3am Saturday. Nobody notices. Monday at 8:45am, the CFO opens the board revenue dashboard — numbers are 48 hours stale. The data team scrambles. Trust erodes. This happens everywhere, repeatedly.

The real problem isn't "connectors fail." Connectors will always fail. The real problem is:

> **Business stakeholders make decisions on stale data because no system connects pipeline health to business deadlines.**

### Why This Remains Unsolved

| Tool | What it does | What it doesn't do |
|------|-------------|-------------------|
| Fivetran native | Sends "sync failed" email | No SLA awareness, no risk assessment, no autonomous action |
| dbt source freshness | Checks if data is stale RIGHT NOW | Cannot trigger upstream syncs, no business calendar |
| Monte Carlo | Detects freshness anomalies | Cannot trigger syncs, no deadline awareness |
| Anomalo / Sifflet | Detect quality issues | Alert only, no remediation |
| suture / Pipeline_Sentry | Fix broken connectors (reactive) | No SLA awareness, act AFTER failure only |

**The gap**: No product combines business deadline awareness + contextual risk assessment + autonomous preventive action + reactive remediation as fallback.

---

## The Solution

**Vigil** is an AI agent that prevents executives from making decisions on stale data by assessing SLA breach risk using connector health, historical incidents, deadline proximity, and business context — then triggering preventive actions and autonomously recovering failing Fivetran pipelines.

### Core Thesis

Everyone else builds firefighters — detect fire, put out fire.
We build fire prevention — assess risk, prevent fire.

### Why an LLM (and not a cron job)

The deterministic engine computes facts: syncs remaining, time to deadline, failure rate.
Gemini evaluates business risk, prioritizes competing SLAs, chooses interventions, and explains decisions.

A cron job sees two connectors with 15% failure rate as equal risk.
Gemini sees: one feeds the CFO's Monday board report, the other feeds an internal analytics dashboard nobody checks until Thursday. Same technical risk. Very different business impact. That's where AI shines.

### Two Operating Modes

**Mode 1 — Proactive (Hero Feature):**
The agent KNOWS business deadlines. It continuously assesses whether current pipeline health will meet those deadlines. When risk is elevated, it acts BEFORE failure causes business impact.

**Mode 2 — Reactive (Fallback):**
When a connector fails, the agent diagnoses the root cause, applies the appropriate fix, verifies recovery, and logs the incident. This is the safety net when prevention isn't enough.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Vigil                               │
│                                                                     │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────────┐   │
│  │  SLA Engine    │  │  Health        │  │  Remediation       │   │
│  │  (2 layers)   │  │  Monitor       │  │  Engine            │   │
│  │ • Deterministic│  │                │  │                    │   │
│  │ • Gemini risk  │  │ • Webhook RX   │  │ • Schema reload    │   │
│  │   reasoning   │  │ • Status check │  │ • Rate-limit adapt │   │
│  │ • SLA configs  │  │ • Failure      │  │ • Retry + resync   │   │
│  │ • Pre-emptive  │  │   history      │  │ • Escalation       │   │
│  │   sync trigger │  │                │  │                    │   │
│  └───────┬────────┘  └───────┬────────┘  └─────────┬──────────┘   │
│          │                   │                      │              │
│          └───────────────────┼──────────────────────┘              │
│                              │                                      │
│                   ┌──────────▼──────────┐                          │
│                   │    Gemini Agent     │                          │
│                   │  (ADK / Reasoning)  │                          │
│                   └──────────┬──────────┘                          │
│                              │                                      │
│          ┌───────────────────┼───────────────────┐                 │
│          ▼                   ▼                   ▼                 │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────────┐      │
│  │ Fivetran MCP │   │  MongoDB     │   │  Notification    │      │
│  │              │   │              │   │                  │      │
│  │ READ:        │   │ • SLA defs   │   │ • Slack webhook  │      │
│  │ • list_conn  │   │ • Incidents  │   │ • Email          │      │
│  │ • get_state  │   │ • Fix history│   │ • (or console    │      │
│  │ • get_schema │   │ • Risk logs  │   │    for demo)     │      │
│  │              │   │              │   │                  │      │
│  │ WRITE:       │   └──────────────┘   └──────────────────┘      │
│  │ • sync_conn  │                                                  │
│  │ • resync     │                                                  │
│  │ • modify_cfg │                                                  │
│  │ • reload_sch │                                                  │
│  │ • setup_test │                                                  │
│  └──────────────┘                                                  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Business Impact Scoring

The agent doesn't treat all connectors equally. Each SLA carries a business impact level that Gemini uses to prioritize decisions:

| Impact Level | Meaning | Agent Behavior |
|---|---|---|
| `critical` | Executive-facing, board reports, revenue data | Fix immediately. Wake people if needed. |
| `high` | Team dashboards, daily standups, operational reports | Fix within buffer window. Alert if at risk. |
| `medium` | Internal analytics, weekly digests | Fix during next cycle. No escalation unless repeated. |
| `low` | Dev/staging, experimental pipelines | Log only. Fix opportunistically. |

**Why this matters for judges**: When two connectors fail simultaneously, Gemini doesn't just read static labels — it justifies the prioritization:

```
┌─ PRIORITIZATION ──────────────────────────────────────────────┐
│                                                                │
│  Simultaneous failures detected:                               │
│                                                                │
│  Connector A: salesforce_prod                                  │
│    SLA: Board Revenue Dashboard                                │
│    Impact: CRITICAL                                            │
│    Deadline: 45 minutes                                        │
│                                                                │
│  Connector B: google_analytics                                 │
│    SLA: Marketing Weekly Report                                │
│    Impact: MEDIUM                                              │
│    Deadline: Thursday                                          │
│                                                                │
│  ── Gemini Prioritization ──                                   │
│  "Revenue Dashboard directly affects executive reporting.      │
│   The board meeting is in 45 minutes — no retry window.        │
│   Marketing report deadline is 4 days away with multiple       │
│   sync opportunities remaining.                                │
│   Prioritizing salesforce_prod. Scheduling google_analytics    │
│   for next cycle."                                             │
│                                                                │
│  Action Order:                                                 │
│    1. Fix salesforce_prod (CRITICAL, 45min deadline)           │
│    2. Fix google_analytics (MEDIUM, Thursday deadline)         │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

A cron job retries both equally. The agent explains WHY it chose A over B.

---

## Reasoning Trace (What Judges See)

Every agent decision produces a visible reasoning trace. This is the demo's most powerful moment — showing WHY the agent acted, not just WHAT it did.

**Example trace (proactive):**
```
┌─ RISK ASSESSMENT ─────────────────────────────────────────────┐
│                                                                │
│  Connector:     salesforce_prod                                │
│  SLA:           Board Revenue Dashboard                        │
│  Impact:        CRITICAL (CFO board presentation)              │
│  Deadline:      45 minutes                                     │
│                                                                │
│  ── Facts ──                                                   │
│  Last success:  8 hours ago                                    │
│  Sync frequency: 6 hours (1 window remaining)                  │
│  Failure rate (7d): 28%                                        │
│  Weekend failure rate: 38%                                     │
│  Today: Sunday                                                 │
│                                                                │
│  ── Gemini Reasoning ──                                        │
│  • Only one sync opportunity remains before a CRITICAL SLA     │
│  • Weekend failure rate is elevated (38% vs 8% weekday)        │
│  • Historical recovery averages 2 minutes                      │
│  • Business context: CFO board meeting depends on this data    │
│                                                                │
│  ── Decision ──                                                │
│  Risk Level:    RED                                            │
│  Action:        TRIGGER EARLY SYNC                             │
│  Confidence:    HIGH                                           │
│    + Weekend failures observed (38% vs 8% weekday)             │
│    + Only one sync window remaining                            │
│    + Critical business SLA (board presentation)                │
│  Reasoning:     "One window left, elevated weekend risk,       │
│                  critical business impact. Sync now provides    │
│                  retry margin if it fails."                     │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

**Example trace (reactive):**
```
┌─ INCIDENT RESPONSE ───────────────────────────────────────────┐
│                                                                │
│  Connector:     salesforce_prod                                │
│  Event:         Sync FAILED                                    │
│  SLA Impact:    Board Revenue — deadline in 38 minutes         │
│                                                                │
│  ── Diagnosis ──                                               │
│  Setup tests:   schema_mismatch                                │
│  Error:         "Column 'quarterly_target' not found"          │
│                                                                │
│  ── Memory (from MongoDB) ──                                   │
│  Past incidents: 7 total, 5 were SCHEMA_CHANGE                 │
│  Best fix:      reload_schema (86% success rate)               │
│  Avg resolution: 120 seconds                                   │
│                                                                │
│  ── Decision ──                                                │
│  Classification: SCHEMA_CHANGE (high confidence)               │
│  Action:         reload_schema → sync_connection               │
│  Reasoning:      "Known pattern for this connector.            │
│                   reload_schema has resolved 6/7 past           │
│                   schema failures. Applying immediately."       │
│                                                                │
│  ── Outcome ──                                                 │
│  Status:         RESOLVED in 47 seconds                        │
│  SLA:            MET (37 minutes before deadline)              │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

These traces are shown in the UI during the demo. They prove the agent is reasoning, not just executing if/else.

---

## Detailed Agent Flow

### Flow A: Proactive SLA Protection (Primary)

```
EVERY CHECK CYCLE (configurable, e.g., every 5 min):

1. LOAD SLA definitions from MongoDB
   Each SLA = {connector_id, deadline, buffer_hours, stakeholder, business_impact}

2. For each SLA:
   a. GET connection status via Fivetran MCP (get_connection_details)
      → Extract: succeeded_at, failed_at, sync_state, sync_frequency

   b. LAYER 1 — DETERMINISTIC ENGINE (fast, reliable):
      Computes raw facts any backend could compute:
      - time_until_deadline = sla.deadline - now
      - last_success_age = now - connection.succeeded_at
      - syncs_remaining = time_until_deadline / sync_frequency
      - recent_failure_rate = failures_last_7d / total_syncs_7d (from MongoDB)
      - weekend_failure_rate = weekend_failures / weekend_syncs (from MongoDB)
      - avg_recovery_time_minutes = mean(past recovery durations)
      - past_incidents = last 5 incidents for this connector (from MongoDB)
      - day_of_week, time_of_day

      FAST EXIT: if syncs_remaining >= 3 AND failure_rate < 5% → GREEN, skip Gemini
      (No point burning LLM tokens on healthy connectors)

   c. LAYER 2 — GEMINI RISK ASSESSMENT (contextual reasoning):
      Prompt to Gemini with full context:
      ┌──────────────────────────────────────────────────────────┐
      │ You are a data reliability agent assessing SLA risk.     │
      │                                                          │
      │ Connector: Salesforce (salesforce_prod)                  │
      │ SLA: "Board Revenue Dashboard must be fresh by 9:00 AM"  │
      │ Time until deadline: 2h 15m                              │
      │ Last successful sync: 8 hours ago                        │
      │ Sync frequency: every 6 hours                            │
      │ Syncs remaining before deadline: 1                       │
      │ Failure rate (7-day): 18%                                │
      │ Past incidents: 3 failures on weekends in last 30 days   │
      │ Current day: Sunday                                      │
      │ Current connector state: scheduled (not broken)          │
      │                                                          │
      │ Assess the risk of SLA breach. Consider:                 │
      │ - Historical reliability patterns                        │
      │ - Day/time patterns in failures                          │
      │ - How many sync opportunities remain                     │
      │ - Business impact of breach                              │
      │                                                          │
      │ Return:                                                  │
      │ - risk_level: GREEN | YELLOW | RED                       │
      │ - reasoning: why (2-3 sentences)                         │
      │ - recommended_action: MONITOR | EARLY_SYNC | ESCALATE   │
      │ - confidence: HIGH | MEDIUM | LOW                        │
      │ - confidence_factors: list of reasons for confidence     │
      └──────────────────────────────────────────────────────────┘

      Gemini responds:
      {
        "risk_level": "RED",
        "reasoning": "Only 1 sync window remains before a critical SLA.
         This connector has an 18% failure rate with 3 weekend-specific
         failures in the last month. Today is Sunday — the historical
         pattern strongly suggests elevated risk. Triggering early sync
         now provides a safety margin for retry if it fails.",
        "recommended_action": "EARLY_SYNC",
        "confidence": "HIGH",
        "confidence_factors": [
          "Weekend failures observed (38% vs 8% weekday)",
          "Only one sync window remaining",
          "Critical business SLA (board presentation)"
        ]
      }

   d. ACT on Gemini's recommendation:
      MONITOR → log assessment, continue checking
      EARLY_SYNC → TRIGGER PRE-EMPTIVE SYNC via Fivetran MCP (sync_connection)
      ESCALATE → notify stakeholder immediately with Gemini's reasoning

3. After pre-emptive sync triggered:
   a. MONITOR sync progress (poll get_connection_details)
   b. If SUCCEEDS → log "SLA saved", update MongoDB incident log
   c. If FAILS → enter REACTIVE FLOW (Flow B)
   d. If still syncing at T-1h before deadline → ESCALATE to stakeholder
```

### Flow B: Reactive Remediation (Fallback)

```
TRIGGER: Pre-emptive sync failed OR webhook receives sync_end with status=FAILED

1. DIAGNOSE via Fivetran MCP:
   a. run_connection_setup_tests → get specific test failures
   b. get_connection_details → check status.tasks and status.warnings

2. QUERY MONGODB MEMORY — this is where history becomes intelligence:
   a. Fetch past incidents for this connector:
      db.incidents.find({connector_id: X}).sort({detected_at: -1}).limit(10)

   b. MongoDB returns pattern context:
      {
        "connector": "salesforce_prod",
        "total_incidents": 7,
        "last_5_failures": ["SCHEMA_CHANGE", "SCHEMA_CHANGE", "SCHEMA_CHANGE", "RATE_LIMIT", "SCHEMA_CHANGE"],
        "dominant_failure_type": "SCHEMA_CHANGE",
        "avg_resolution_time_seconds": 120,
        "last_successful_fix": "reload_connection_schema_config → sync_connection",
        "fix_success_rate": { "reload_schema": 0.86, "reduce_frequency": 1.0 }
      }

   c. Feed this to Gemini alongside current diagnostics:
      "This connector has failed 7 times. 5 of the last 5 were schema drift.
       reload_schema fixed it 86% of the time in ~2 minutes.
       Current setup tests show: schema mismatch.
       Recommended: skip classification deliberation, go directly to reload_schema."

   NOW MongoDB isn't just a log. It's the agent's EXPERIENCE.
   First failure = reason from scratch. Tenth failure = pattern match + fast action.

3. LLM CLASSIFIES failure type (informed by history):
   - SCHEMA_CHANGE: setup tests show schema mismatch (or history says "this always happens here")
   - RATE_LIMIT: error messages mention throttling/429
   - AUTH_EXPIRED: setup tests show authentication failure
   - SOURCE_OUTAGE: connection timeout / unreachable
   - DESTINATION_ERROR: warehouse permission / capacity
   - UNKNOWN: cannot classify AND no historical pattern

4. REMEDIATE based on classification + historical success rates:

   SCHEMA_CHANGE:
   → reload_connection_schema_config (reload from source)
   → modify_connection_schema_config (enable new columns)
   → sync_connection (trigger resync)

   RATE_LIMIT:
   → modify_connection (reduce sync_frequency temporarily)
   → sync_connection (retry with backoff)

   AUTH_EXPIRED:
   → ESCALATE (agent cannot fix credentials without external source)
   → Generate: "Auth expired on [connector]. Manual re-auth required. SLA at risk."

   SOURCE_OUTAGE:
   → WAIT + RETRY (schedule retry in 15 min)
   → If still down after 2 retries → ESCALATE

   DESTINATION_ERROR:
   → ESCALATE with diagnostic context

   UNKNOWN:
   → ESCALATE with full context dump

5. VERIFY after remediation:
   a. Wait for sync to complete
   b. Check sync_state and succeeded_at
   c. If success → log to MongoDB, close incident
   d. If failure → escalate with: "Automated fix failed. Manual intervention required."

6. LOG to MongoDB (feeding future intelligence):
   {
     connector_id, timestamp, failure_type,
     error_message_raw,
     diagnostics: { setup_test_results, status_tasks },
     action_taken: ["reload_schema", "sync_connection"],
     outcome: "success" | "failure",
     time_to_resolve_seconds: 47,
     sla_id, sla_impact: "met" | "at_risk" | "breached"
   }

   This log becomes the input for step 2 on the NEXT failure.
   More incidents → better pattern matching → faster resolution.
```

### Flow C: Escalation

```
WHEN agent cannot fix OR time is running out:

1. COMPILE context:
   - What failed and when
   - What the agent tried
   - Why it didn't work
   - Which SLA is at risk
   - Time remaining before deadline
   - Recommended manual action

2. DELIVER via configured channel:
   - Console output (demo)
   - Slack webhook (production)
   - Email (fallback)

3. FORMAT:
   "ALERT: Board Revenue Dashboard SLA at risk.
    Connector: salesforce_prod (failed 3h ago)
    Root cause: Authentication expired
    Agent action: Attempted retry (failed)
    Required: Manual re-authentication
    Deadline: 9:00 AM (2h 15min remaining)
    Impact: CFO board report will show stale revenue data"
```

---

## Tech Stack

| Component | Technology | Why |
|-----------|-----------|-----|
| Agent Framework | Google ADK (Agent Development Kit) | Hackathon requirement, native Gemini integration |
| LLM | Gemini 2.5 Flash | Fast, cheap, good at structured reasoning |
| Pipeline Integration | Fivetran MCP Server | Direct read/write access to all connector operations |
| SLA Store + Memory | MongoDB (via MCP or direct) | SLA definitions, incident history, failure patterns |
| Backend | Python + FastAPI | Webhook receiver, agent orchestration |
| Frontend | React (minimal dashboard) | Show SLA status, agent actions, incident timeline |
| Deployment | Google Cloud Run | Serverless, handles webhook traffic |
| Notifications | Console + optional Slack webhook | Demo simplicity |

---

## Fivetran MCP Tools Used

### Read Operations (Detection + Monitoring)
| Tool | Purpose |
|------|---------|
| `list_connections` | Discover all connectors to monitor |
| `get_connection_details` | Get status: succeeded_at, failed_at, sync_state, sync_frequency |
| `get_connection_state` | Current sync progress |
| `get_connection_schema_config` | Inspect schema for drift detection |

### Write Operations (Intervention + Remediation)
| Tool | Purpose |
|------|---------|
| `sync_connection` | Trigger immediate sync (proactive or retry) |
| `resync_connection` | Full historical resync when needed |
| `run_connection_setup_tests` | Diagnose WHY a connector is broken |
| `reload_connection_schema_config` | Fix schema drift |
| `modify_connection_schema_config` | Enable/disable tables after schema change |
| `modify_connection` | Adjust sync_frequency for rate limiting |
| `create_account_webhook` | Register for instant failure notifications |

---

## MongoDB Schema

### Collection: `sla_definitions`
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

### Collection: `incidents`
```json
{
  "_id": "inc_20260609_001",
  "connector_id": "connector_abc123",
  "sla_id": "sla_board_revenue",
  "detected_at": "2026-06-09T03:15:00Z",
  "failure_type": "SCHEMA_CHANGE",
  "agent_actions": [
    {"action": "run_setup_tests", "result": "schema_mismatch", "at": "..."},
    {"action": "reload_schema", "result": "success", "at": "..."},
    {"action": "sync_connection", "result": "success", "at": "..."}
  ],
  "resolved_at": "2026-06-09T03:22:00Z",
  "time_to_resolve_seconds": 420,
  "sla_impact": "met",
  "sla_deadline": "2026-06-09T09:00:00Z",
  "human_intervention_required": false
}
```

### Collection: `connector_health` (daily aggregates)
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

### Collection: `connector_patterns` (learned intelligence)
```json
{
  "_id": "pattern_connector_abc123",
  "connector_id": "connector_abc123",
  "connector_name": "salesforce_prod",
  "total_incidents": 7,
  "dominant_failure_type": "SCHEMA_CHANGE",
  "failure_distribution": {
    "SCHEMA_CHANGE": 5,
    "RATE_LIMIT": 1,
    "AUTH_EXPIRED": 1
  },
  "remediation_success_rates": {
    "reload_schema": { "attempts": 7, "successes": 6, "rate": 0.86 },
    "reduce_frequency": { "attempts": 1, "successes": 1, "rate": 1.0 }
  },
  "avg_resolution_seconds": 120,
  "fastest_resolution_seconds": 47,
  "time_patterns": {
    "weekend_failure_rate": 0.38,
    "weekday_failure_rate": 0.08,
    "peak_failure_hour": 3
  },
  "last_updated": "2026-06-09T03:22:00Z"
}
```

**Why this matters**: On the first failure, the agent reasons from scratch. On the tenth failure, it says: *"This connector has a pattern — schema drift, 86% fix rate with reload_schema, average 2 minutes. Skipping deliberation, applying known fix."* That's learned behavior, not just logging.

---

## Demo Plan (3 minutes total)

### Setup (pre-demo, not shown)
- 2 Fivetran connectors syncing (e.g., Google Sheets → BigQuery)
- 2 SLA definitions in MongoDB
- Agent running and monitoring

### Demo Part 1: Proactive Save (90 seconds)

**Narration**: "It's approaching our deadline. The connector failed earlier. Let's see what happens."

1. Show SLA dashboard: deadline in 5 minutes, last sync failed 3 minutes ago
2. Show agent reasoning (live logs):
   ```
   [SLA CHECK] Board Revenue: deadline in 4m 32s
   [RISK] Last sync FAILED. syncs_remaining = 1. Risk: RED
   [ACTION] Triggering pre-emptive sync on salesforce_prod
   [MONITOR] Sync in progress...
   [SUCCESS] Sync completed. SLA will be met.
   [LOG] Incident saved. No escalation needed.
   ```
3. Show dashboard update: status goes GREEN

**Punchline**: "Nobody was woken up. Nobody scrambled. The data was just there."

### Demo Part 2: Reactive Fix (60 seconds)

**Narration**: "But what if the connector is actually broken?"

**IMPORTANT: Prepare 3 failure modes. Test all pre-demo. Use whichever is most reliable.**

| Failure Mode | How to trigger | Fix action | Reliability |
|---|---|---|---|
| **A: Schema change** | Add column to Google Sheet source | reload_schema → sync | Medium (downstream may break) |
| **B: Pause + SLA pressure** | Pause connector via API, let deadline approach | Resume + sync | HIGH (deterministic) |
| **C: Rate limit sim** | Set sync_frequency to 1min, source throttles | Reduce frequency → retry | Medium |

**Recommended for live demo: Option B** (most deterministic):
1. Pre-pause a connector
2. Agent detects: connector paused, SLA deadline approaching
3. Agent reasons: "Connector paused but SLA requires data in 3 minutes"
4. Agent resumes + triggers sync
5. Sync succeeds → SLA met

**If schema change works reliably in testing, use it** (more impressive):
1. LIVE: Add a column to the source
2. Show agent detecting, classifying, fixing:
   ```
   [ALERT] salesforce_prod sync FAILED
   [HISTORY] This connector: 5 past schema failures. reload_schema works 86% of the time.
   [DIAGNOSE] Running setup tests... schema mismatch confirmed.
   [FIX] Reloading schema from source...
   [FIX] Enabling new column...
   [RETRY] Triggering resync...
   [VERIFY] Sync succeeded. Data fresh.
   [LOG] Incident #8 resolved in 47s. Pattern confirmed.
   ```
3. Show incident log + updated connector_patterns in MongoDB

**Punchline**: "When prevention fails, the agent heals. And it gets faster every time."

### Demo Part 3: Intelligent Escalation (30 seconds)

**Narration**: "And when it CAN'T fix it..."

1. Show an auth failure the agent can't resolve
2. Agent generates contextual escalation:
   ```
   [DIAGNOSE] Authentication failure. Agent cannot resolve.
   [HISTORY] This connector: 1 past auth failure. Required human intervention.
   [ESCALATE] "SLA at risk. salesforce_prod auth expired.
              Deadline: 2m remaining. Manual re-auth required.
              Last time this happened: took 12 min to resolve manually.
              Suggested: re-authenticate via Fivetran dashboard."
   ```

**Punchline**: "It knows what it can fix, what it can't, and who to call — with context from every past incident."

---

## "Why isn't this just a cron job?" (The Judge Question)

This will be asked. Prepare for it.

**What a cron job can do:**
```
if connector.status == "failed":
    retry_sync()
```

**What the agent does that a cron job cannot:**

| Capability | Cron Job | Vigil |
|---|---|---|
| Retry a failed sync | Yes | Yes |
| Know WHY it failed | No | Yes (setup tests + LLM classification) |
| Know which fix to apply | No (always retries) | Yes (schema reload vs. reduce frequency vs. escalate) |
| Know business impact | No | Yes (SLA context: "this feeds the board report") |
| Prioritize across competing failures | No | Yes (Gemini ranks by business impact) |
| Learn from past incidents | No | Yes (connector_patterns in MongoDB) |
| Explain its decisions | No | Yes (structured reasoning trace) |
| Know when to stop trying | No (retries forever or gives up) | Yes (escalates with context after N attempts) |
| Adapt strategy per connector | No | Yes ("this one always has schema drift on weekends") |

**The one-liner answer for judges:**

> "A cron job retries. The agent investigates, understands context, evaluates business impact, chooses the right intervention, verifies it worked, and learns from it. That's the difference between `retry()` and reasoning."

**The concrete example:**

Two connectors fail at the same time. A cron job retries both equally.

The agent sees:
- Connector A feeds the CFO's Monday board report (deadline in 2 hours)
- Connector B feeds an internal dashboard nobody checks until Thursday

Same failure. The agent fixes A first, schedules B for later. A cron job can't make that call.

---

## What Makes This Unique

| Dimension | Our Agent | Competitors |
|-----------|-----------|-------------|
| **Awareness** | Knows business deadlines | Knows connector status only |
| **Timing** | Acts BEFORE failure impacts business | Acts AFTER failure detected |
| **Intelligence** | Assesses risk using history, patterns, and business context | Reacts to current state only |
| **Scope** | Prevent → Fix → Escalate (complete) | Fix only (suture) or Alert only (Monte Carlo) |
| **Memory** | Learns failure patterns per connector | Stateless |

### The One-Sentence Differentiator

> "Every other tool wakes someone up when data breaks. Vigil makes sure nobody needs to be woken up in the first place."

---

## Risks and Mitigations

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Fivetran MCP write ops have bugs | Medium | Direct REST API fallback ready |
| Demo timing feels artificial (compressing hours) | Medium | Use 5-min SLA, 1-min cadence — real-time demo |
| Judge asks "where do SLAs come from?" | High | Show MongoDB config. "3 lines of JSON any data team writes." |
| Judge says "suture already does this" | Medium | "suture fixes broken pipes. We prevent business impact. Different problem." |
| Risk assessment feels too simple | Low | Show two layers: deterministic facts + Gemini reasoning. "Why Gemini? Same failure rate, different business impact." |
| Judge asks "why not a cron job?" | HIGH | See dedicated section above. Lead with: "A cron retries. The agent reasons." |
| Connector doesn't fail on demand for demo | Low | Prepare 3 failure modes, test pre-demo, use most reliable |
| Schema fix doesn't work reliably | Medium | Fallback to pause/resume demo (deterministic) |

---

## Build Order (Priority Sequence)

### MVP (Must ship for demo)

1. **Fivetran MCP setup** — install, configure, verify read+write works
2. **MongoDB SLA schema** — create collections, seed 2 SLA definitions
3. **Core agent loop** — SLA check → deterministic facts → Gemini risk assessment
4. **Proactive sync trigger** — when risk is RED, trigger sync via MCP
5. **Reactive classification** — run setup tests, Gemini classifies failure type
6. **Remediation** — reload schema / reduce frequency / escalate
7. **Incident logging** — store every action and outcome in MongoDB
8. **Escalation** — formatted context message with reasoning when agent can't fix
9. **Reasoning trace output** — visible structured logs showing facts → reasoning → decision
10. **Demo polish** — accelerated timelines, live breakage, clean narrative

### Nice to Have (if time permits)

11. **Pattern learning** — `connector_patterns` collection, dominant failure type, "this always happens here" fast-path
12. **Success-rate statistics** — track which fixes work per connector, feed back into classification
13. **Advanced prioritization** — multi-connector simultaneous failure ranking with Gemini reasoning
14. **Minimal dashboard UI** — SLA status cards, agent action timeline, incident history
15. **Webhook-based detection** — register Fivetran webhook for instant failure notification (vs. polling)

---

## Success Criteria

The demo succeeds if judges see:

1. An agent that UNDERSTANDS business context (not just technical status)
2. An agent that ACTS before humans need to (proactive, not reactive)
3. An agent that KNOWS its limits (fixes what it can, escalates what it can't)
4. Clear before/after: "Without agent = Monday scramble. With agent = nobody notices."
5. Real Fivetran MCP write operations executing live (not mocked)
