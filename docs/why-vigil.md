# Why Vigil — Decision Document

## The Decision Process

We evaluated 6 hackathon ideas across multiple dimensions before selecting Vigil. This document captures the reasoning so future contributors understand the "why" behind every major choice.

---

## Ideas Evaluated

### 1. "Signal to Runbook" — Dynatrace Auto-Remediation Agent
**Score: 7.5/10 | KILLED**

Concept: Dynatrace MCP detects anomaly → Davis AI causal chain → finds runbook in MongoDB → executes remediation → verifies recovery.

Why killed:
- Dynatrace AutomationEngine already does closed-loop remediation (detect → workflow → fix → verify)
- Their marketing explicitly claims: "automatically pinpoint root cause and execute remediation workflows"
- The MCP server appears to be read-only (no confirmed write/execute operations)
- Requires expensive Dynatrace license + Kubernetes cluster for demo
- Judge objection risk: "Doesn't AutomationEngine already do this?"

### 2. "Pipeline Sentinel" — Fivetran Reactive Auto-Fix
**Score: 8.5/10 → Absorbed into Vigil**

Concept: Detect Fivetran connector failure → classify → fix → verify.

Why not standalone:
- suture (hackathon competitor) already does schema healing in 60 seconds
- Pipeline_Sentry already does credential rotation via Secret Manager
- dq-sentinel-agent does quality monitoring with human approval
- At least 3 teams already built reactive Fivetran auto-fix
- Competing on "I fix broken pipelines" is dangerous in this hackathon

What we kept: The reactive remediation flow became Vigil's Mode 2 (fallback).

### 3. "LLM Regression Guard" — Arize Phoenix Quality Agent
**Score: 5/10 | KILLED**

Concept: Phoenix MCP detects LLM quality regression → localizes → generates prompt fix → runs experiment → verifies.

Why killed:
- eval-sentinel (exact same idea) already submitted to the same hackathon's Arize track
- At least 5 teams built variations (flightcheck, self-healing-agent, etc.)
- Braintrust ships "Loop Agent" commercially (AI that improves AI)
- Phoenix MCP is read-only — can't create experiments or push prompts via MCP
- Zero uniqueness in this hackathon

### 4. "Feature Drift Correlator" — MongoDB + Phoenix
**Score: 8/10 | Not selected**

Concept: Monitor model performance in Arize → correlate with MongoDB feature distributions → identify root cause.

Why not selected:
- WhyLabs just open-sourced similar technology
- Harder to demo visually
- Less universally relatable problem than stale data
- Fivetran track is less crowded than Arize track

### 5. "Proactive Data SLA Guardian" — Fivetran MCP
**Score: 10/10 | SELECTED → Became Vigil**

The winner. See below.

### 6. Combined "DataGuard Agent" (Ideas 1+2)
**Score: 9.5/10 | Evolved into Vigil**

The combination of proactive SLA + reactive fix became the final product.

---

## Why We Chose the Proactive SLA Approach

### The Core Insight

Every competitor in this hackathon builds reactive agents:
- suture: detect failure → fix schema
- Pipeline_Sentry: detect failure → rotate creds
- dq-sentinel: detect failure → propose fix → wait for human

**Nobody builds proactive agents that prevent business impact before failure happens.**

This is a categorically different problem. We're not competing on "who fixes connectors faster." We're competing on "who prevents the CFO from seeing wrong numbers."

### Uniqueness Verification

| Search Query | Results |
|---|---|
| "fivetran proactive sla" on GitHub | **0 repos** |
| "data pipeline sla proactive agent" on GitHub | **0 repos** |
| "fivetran auto remediation fix connector" on GitHub | **0 repos** |
| "data sla proactive freshness agent" on GitHub | **0 repos** |

Zero implementations anywhere. Not in this hackathon. Not anywhere on the internet.

### Why Fivetran Track (vs. Others)

| Track | Competition Level | Write API? | Our Angle |
|---|---|---|---|
| Arize | 5+ similar projects | Read-only MCP | N/A (killed) |
| Dynatrace | Unclear MCP capability | Unclear | N/A (killed) |
| Elastic | Elastic shipped Security MCP App May 2026 | N/A | N/A |
| **Fivetran** | **3 reactive projects, 0 proactive** | **YES (confirmed writes)** | **Proactive SLA** |
| MongoDB | Crowded (many use cases) | Yes | Supporting role |
| GitLab | Less relevant to our domain | Yes | N/A |

### Why Enterprise Product (Not Just Hackathon Demo)

1. The problem is universal — every company with 10+ Fivetran connectors has this pain
2. No commercial product exists — wide open market gap
3. The architecture scales naturally (SLA configs per org, multi-tenant)
4. MongoDB memory gives the agent real competitive advantage over time
5. Recurring revenue model is obvious (per-connector-monitored pricing)

---

## Key Architectural Decisions

### Decision 1: ADK over LangChain/LangGraph
**Reason**: Hackathon requires Google Cloud. ADK has first-class McpToolset for MCP servers, native Gemini integration, and one-command Cloud Run deployment. No adapter overhead.

### Decision 2: Two-Layer Risk Engine (Deterministic + Gemini)
**Reason**: Pure rules can't justify using an LLM. Pure LLM is slow and expensive for healthy connectors. Hybrid approach: fast deterministic exit for healthy connectors, Gemini reasoning only when risk is elevated. Judges can see BOTH layers contributing.

### Decision 3: MongoDB for State (Not Firestore/Supabase)
**Reason**: MongoDB is a hackathon partner with its own MCP server. This means the agent can natively read/write its own memory through MCP tools, creating a elegant agent-native architecture. Also: flexible schema for SLA definitions, aggregation pipelines for pattern computation.

### Decision 4: Proactive as Hero, Reactive as Fallback
**Reason**: suture and Pipeline_Sentry already won the "reactive" mindshare in this hackathon. Leading with proactive is our only path to differentiation. Reactive becomes our "bonus feature" — judges see a complete system, not just one trick.

### Decision 5: Business Impact Scoring (Not Just Priority Labels)
**Reason**: A judge will ask "why not a cron job?" The answer is: the agent reasons about BUSINESS context. Same 15% failure rate means different things for a CFO board report vs. an internal dashboard. This is where the LLM earns its keep.

### Decision 6: Reasoning Traces as UI Feature
**Reason**: The demo's most powerful moment is showing WHY the agent acted. Every decision produces a visible trace: facts → Gemini reasoning → decision → outcome. This proves it's reasoning, not just if/else.

---

## What We're NOT Building

- A generic AIOps platform
- A Fivetran dashboard replacement
- A monitoring tool (Monte Carlo already exists)
- A reactive-only auto-fixer (suture already exists)
- An alerting system (Fivetran already sends emails)

## What We ARE Building

An AI agent that understands business deadlines, assesses pipeline risk in business context, acts proactively before humans notice problems, and falls back to intelligent remediation when prevention isn't enough.

---

## Risk Assessment

| Risk | Impact | Likelihood | Mitigation |
|---|---|---|---|
| Fivetran MCP bugs | High | Medium | Direct REST API fallback |
| Demo timing artificial | Medium | Medium | Accelerated timeline (5min SLA) |
| Judge: "suture does this" | High | Medium | "suture fixes pipes. We prevent business impact." |
| Judge: "why not cron job?" | High | HIGH | Two-layer engine + business context reasoning |
| Schema fix unreliable | Medium | Medium | Multiple demo failure modes ready |
| Fivetran trial expires | High | Low | Sign up fresh, test immediately |

---

## Timeline

- **June 6 (today)**: Research complete, spec written, repo created
- **June 7-8**: Core agent loop + Fivetran MCP integration + MongoDB
- **June 9**: Reactive remediation + reasoning traces
- **June 10**: Dashboard UI + demo scenarios + testing
- **June 11 (deadline)**: Video recording + submission polish
