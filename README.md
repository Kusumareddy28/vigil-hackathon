# vigil

Vigil is an AI decision reliability app that helps teams decide whether business-critical decisions are backed by trustworthy, fresh data.

## Stack

- `dashboard/`: Vite + React frontend
- `orchestrator/`: FastAPI backend
- MongoDB Atlas for storage
- Gemini + Fivetran MCP for agent reasoning and actions

## Local development

Backend:

```bash
cd /Users/kusumareddyvari/Desktop/Projects-2026/vigil
python3 -m venv .venv
source .venv/bin/activate
pip install -e .
env START_SCHEDULER=0 uvicorn orchestrator.main:app --host 127.0.0.1 --port 8001
```

Frontend:

```bash
cd /Users/kusumareddyvari/Desktop/Projects-2026/vigil/dashboard
npm ci
npm run dev
```

Seed demo data:

```bash
cd /Users/kusumareddyvari/Desktop/Projects-2026/vigil
.venv/bin/python -m scripts.seed
```

## Deploy

Recommended setup:

- Frontend on Vercel
- Backend on Render
- MongoDB on Atlas

### 1. Deploy the backend to Render

This repo includes [render.yaml](/Users/kusumareddyvari/Desktop/Projects-2026/vigil/render.yaml:1) and [Dockerfile](/Users/kusumareddyvari/Desktop/Projects-2026/vigil/Dockerfile:1).

In Render:

1. Create a new Blueprint or Web Service from this repo.
2. Use the provided `render.yaml`.
3. Set these environment variables:
   - `MONGODB_URI`
   - `MONGODB_DB`
   - `GOOGLE_API_KEY`
   - `FIVETRAN_API_KEY`
   - `FIVETRAN_API_SECRET`
   - `FRONTEND_ORIGINS` (set this after the Vercel URL exists)
4. Keep `START_SCHEDULER=0` unless you explicitly want background checks running continuously.

After deploy, confirm:

```bash
curl https://<your-render-service>/health
```

### 2. Deploy the frontend to Vercel

This repo includes [vercel.json](/Users/kusumareddyvari/Desktop/Projects-2026/vigil/vercel.json:1).

In Vercel:

1. Import this repo.
2. Add environment variable:
   - `VITE_API_BASE_URL=https://<your-render-service>`
3. Deploy.

After deploy, go back to Render and set:

```bash
FRONTEND_ORIGINS=https://<your-vercel-app>
```

Then redeploy the backend.

### 3. Verify the full deployment

Check these URLs:

```bash
curl https://<your-render-service>/health
curl https://<your-render-service>/api/decisions
curl https://<your-render-service>/api/decisions/sla_board_revenue/audit
```

Then open the Vercel app and verify:

- `/dashboard`
- `/decisions/sla_board_revenue`
- `/agent-activity`
- `/incidents`

## Notes

- The frontend uses `VITE_API_BASE_URL` in production and the Vite proxy locally.
- Demo content is seeded into MongoDB via `scripts.seed`.
- Rotate any secrets currently stored in your local `.env` before publishing or sharing the project.
