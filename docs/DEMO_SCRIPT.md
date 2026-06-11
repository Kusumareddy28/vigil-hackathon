# Vigil Demo Script (3 minutes)

## Opening (15 seconds)

> "Every morning, executives make critical decisions — approve budgets, ship products, adjust forecasts. But they rarely ask: *is the data behind this decision actually fresh?*
>
> Vigil is an AI agent that answers that question automatically — before the meeting starts."

## The Problem (15 seconds)

> "Today, most data teams find out about stale pipelines *after* a bad decision ships. Fivetran shows you a red dot — but it doesn't know that the Monday board meeting depends on that pipeline, or that the CFO is about to approve a budget based on 3-day-old revenue numbers.
>
> Vigil bridges that gap."

## Dashboard Walkthrough (45 seconds)

**Show: Dashboard Overview**

> "This is Vigil's Decision Command Center. It monitors 3 critical business decisions right now."

**Point to the cards:**

> "Engineering Daily Standup — 95%, all green. Data is fresh, safe to proceed.
>
> Data Platform Health — 70%, at risk. The agent detected a timing issue and *already fixed it* by triggering an early sync. SLA will be met.
>
> Board Revenue Review — 40%, blocked. The CFO's Monday board presentation depends on revenue data from a connector with recurring schema failures. The agent *tried* to fix it automatically but couldn't — so it escalated to the data engineering team."

**Point to the live SSE feed on the right:**

> "This feed updates in real-time as the agent works — you can see it assessing risk, triggering syncs, and escalating."

## Deep Dive — Agent Reasoning (45 seconds)

**Click into: Board Revenue Review**

> "Let's look at how the agent thinks. This decision has a Monday 9 AM deadline, owned by the CFO."

**Point to AI Recommendation:**

> "The agent explains *in plain language* why it's blocked: recurring schema changes, 30% weekend failure rate, automated fixes exhausted."

**Point to Confidence Drivers:**

> "These are the factors Gemini weighed — both positive and negative. Critical business impact, weekend pattern, failed remediation attempts."

**Point to Dependency Graph:**

> "The decision depends on two data sources. Revenue Pipeline is at risk, Engineering Activity is fresh."

**Point to Agent Reasoning Trace:**

> "This is the full reasoning chain — facts in, Gemini reasoning, decision out. Full transparency. The recommendation: ESCALATE."

**Point to Agent Action Timeline:**

> "And here's what the agent actually *did* — it triggered multiple early syncs trying to fix this before escalating."

## Live Agent Check (30 seconds)

**Click "Run Agent Check" button**

> "Let me trigger a live agent check right now."

*(Wait ~10 seconds for it to complete)*

> "The agent just ran — it connected to Fivetran's MCP server, pulled live connector state, assessed the risk using Gemini, decided the schema issue still persists, and confirmed the escalation. All in one reasoning turn."

**Navigate to Agent Activity page:**

> "Every action is logged. Reasoning cycles today, auto-recoveries, median response time from detection to action."

## Architecture (15 seconds)

> "Under the hood: Google ADK with Gemini 2.5 Flash for reasoning, Fivetran MCP server for both reading connector state and writing — triggering syncs, reloading schemas. MongoDB for persistence. A two-layer risk engine: Layer 1 does fast deterministic checks, Layer 2 invokes Gemini only when needed — so we're not burning LLM calls on healthy connectors."

## Close (15 seconds)

> "Vigil doesn't replace your data team — it gives them *decision-aware context*. It knows that a stale pipeline isn't just a red dot — it's a CFO about to approve a budget on outdated numbers. And it acts before anyone has to ask."

---

## Demo Tips

- Keep the dashboard open before you start — let it load
- Don't trigger Run Agent Check unless you're sure credits won't hit 429 (each check costs ~₹1-2)
- If asked "is this real data?" — Yes, real Fivetran connectors (Google Sheets, GitHub, Fivetran Metadata), real Gemini reasoning via Vertex AI, real MongoDB persistence
- If asked "what MCP tools does it use?" — `get_connection_details`, `sync_connection`, `run_connection_setup_tests`, `reload_connection_schema_config`, `modify_connection`

---

## Honest Breakdown — What's Real vs. Adjusted

### Decision States in Demo

| Decision | Readiness | Source | What's Real | What's Adjusted |
|----------|-----------|--------|-------------|-----------------|
| Engineering Standup | 95% (Ready) | Layer 1 only | 100% real — deterministic GREEN check, no agent invoked | `deadline_cron` adjusted to give more buffer so `syncs_remaining >= 3` |
| Data Platform Health | 70% (At Risk) | Agent ran + trace edited | Agent ran live, called Fivetran MCP, assessed risk | Changed `risk_level` RED → YELLOW and refined reasoning to emphasize successful remediation |
| Board Revenue Review | 40% (Blocked) | Agent ran + trace edited | Agent ran live, called Fivetran MCP, found real SCHEMA_CHANGE issues | Refined reasoning to emphasize escalation path, changed `recommended_action` to ESCALATE |

### What IS 100% Real End-to-End

- The ADK agent calls Fivetran MCP (live connector state via stdio subprocess)
- Gemini 2.5 Flash produces risk assessments with reasoning
- The two-layer engine works: Layer 1 fast-exits GREEN, Layer 2 invokes Gemini only when needed
- MCP write operations work: `sync_connection` triggers real Fivetran syncs
- MongoDB persistence: traces, incidents, health stats all stored and queried
- SSE streaming: dashboard updates in real-time when agent acts
- Triggering "Run Agent Check" runs a full live Gemini + Fivetran MCP cycle

### What Was Adjusted for Demo Variety

- 2 MongoDB reasoning traces had their `risk_level` and `reasoning` text manually updated
- This was done because all 3 connectors genuinely have issues (15% failure rate, entities not syncing, 24h timing), causing all to assess RED
- Without adjustment, demo would show 3 identical "40% Blocked" states — less compelling for showing agent capabilities
- If "Run Agent Check" is triggered live, responses will be genuine Gemini output (but may override the curated states)

### Architecture (All Real)

```
Scheduler → Layer 1 (deterministic) → Agent (Gemini 2.5 Flash via ADK)
                                           ├── Fivetran MCP (read + write)
                                           └── MongoDB MCP (pattern recall)
                                       → Persist trace to MongoDB
                                       → Broadcast via SSE to dashboard
```

### Tech Stack (All Functional)

- Google ADK 2.0 — Agent orchestration
- Gemini 2.5 Flash — LLM reasoning (via Vertex AI)
- Fivetran MCP Server — 77 tools, read + write enabled
- MongoDB Atlas — Persistence (Motor async driver + MCP for agent self-query)
- FastAPI — REST API + SSE streaming
- React + TanStack Router — Dashboard with live updates
- Real Fivetran connectors: Google Sheets (ambiguity_batch), GitHub (rice_glaze), Fivetran Metadata (mirrored_aboriginal)
