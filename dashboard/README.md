# Vigil — Decision Reliability Platform

Vigil is an AI decision reliability agent that verifies the freshness, confidence, and risk behind every critical business decision.

## Project structure

```
pramana/
├── frontend/          # placeholder — actual UI lives in this Lovable project root (TanStack Start)
├── backend/           # placeholder for FastAPI service (not implemented)
├── docs/              # architecture, demo script, API contracts
├── scripts/           # data seeding / failure simulation
└── .env.example
```

> **Note for this hackathon scaffold:** The Lovable preview serves the
> existing TanStack Start app at the repo root. The runnable frontend code
> lives in `src/` (routes under `src/routes`, components under
> `src/components/vigil`). The `frontend/` folder is reserved for a future
> Vite/CRA extraction if needed.

## Run

```bash
npm install
npm run dev
```

Open the preview to see the landing page, then click **View Live Demo** to enter the Decision Command Center.

## Demo flow

1. Land on `/` — read the hero and skim the explainer sections.
2. Click **View Live Demo** → `/dashboard` (Decision Command Center).
3. Open **Board Revenue Review** → see the readiness gauge, dependency graph, agent reasoning trace, and action timeline.
4. Click **Simulate Failure** to watch readiness drop and the agent timeline rebuild live.
5. Visit **Incidents** to see historical anomalies and outcomes.
