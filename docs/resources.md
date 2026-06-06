# Vigil — Research & Resources

## Hackathon Details

- **Name**: Google Cloud Rapid Agent Hackathon
- **Deadline**: June 11, 2026 @ 2:00 PM PDT
- **Judging**: June 22 – July 6, 2026
- **Winners**: ~July 7, 2026
- **Participants**: 13,425+
- **Track**: Fivetran
- **Team max**: 4 people
- **Prize**: $5,000 (1st), $3,000 (2nd), $2,000 (3rd) per track

## Submission Requirements

1. Functional agent powered by Gemini + Google Cloud
2. Must integrate partner's MCP server (Fivetran)
3. Solves a real-world challenge
4. Must run on web, Android, or iOS
5. Public GitHub repo with open source license
6. Hosted project URL (functional and testable)
7. Text description of features, technologies, data sources
8. Video demo (max 3 minutes, English, YouTube/Vimeo)
9. Code must be newly created during contest period

## Judging Criteria (Equal Weight)

1. **Technological Implementation** — Quality of software, interaction with Google Cloud + Partner
2. **Design** — UX and thoughtful design
3. **Potential Impact** — Magnitude of impact on target communities
4. **Quality of Idea** — Creativity and uniqueness

## Prohibited

- Other AI tools (only Google Cloud AI + Partner's built-in AI)
- Services competing with Google Cloud capabilities
- Services competing with Fivetran's offerings

---

## Google ADK (Agent Development Kit)

### Overview
- Open-source, code-first Python framework for building AI agents
- Version 2.0 (breaking changes from 1.x)
- Python 3.11+ required
- Supports: Gemini, Gemma, Claude, Ollama, vLLM

### Installation
```bash
pip install google-adk
```

### Basic Agent
```python
from google.adk import Agent

root_agent = Agent(
    name="vigil_agent",
    model="gemini-2.5-flash",
    instruction="You are a data reliability agent...",
    tools=[...]
)
```

### Running
```bash
adk run path/to/agent     # CLI
adk web path/to/agents    # Web UI
```

### MCP Integration (Critical for Vigil)
```python
from google.adk.agents import LlmAgent
from google.adk.tools.mcp_tool import McpToolset
from google.adk.tools.mcp_tool.mcp_session_manager import StdioConnectionParams
from mcp import StdioServerParameters

agent = LlmAgent(
    model='gemini-2.5-flash',
    name='vigil_agent',
    instruction='...',
    tools=[
        McpToolset(
            connection_params=StdioConnectionParams(
                server_params=StdioServerParameters(
                    command='uvx',
                    args=['--from', 'git+https://github.com/fivetran/fivetran-mcp', 'fivetran-mcp'],
                    env={
                        'FIVETRAN_API_KEY': '...',
                        'FIVETRAN_API_SECRET': '...',
                        'FIVETRAN_ALLOW_WRITES': 'true'
                    }
                ),
            ),
        )
    ]
)
```

### Key Concepts
- **Sessions**: Single ongoing interaction, stores Events chronologically
- **State**: Data stored within a session (in-memory for dev, cloud for prod)
- **MemoryService**: Long-term cross-session memory (searchable)
- **Graph Workflows**: Deterministic code + adaptive AI reasoning
- **Multi-Agent**: Sequential, parallel, loop, routing patterns

### Deployment
- `adk deploy cloud_run` — deploys to Cloud Run
- Agent Runtime (managed) — handles scaling, observability
- Container-based for custom infrastructure

### Production Note
MCP tools in production must be synchronous (not async). Remote MCP servers preferred over stdio for scalability.

---

## Fivetran MCP Server

### Setup
```bash
# Via uvx (recommended)
uvx --from git+https://github.com/fivetran/fivetran-mcp fivetran-mcp

# Or clone and install
git clone https://github.com/fivetran/fivetran-mcp
pip install .
```

### Environment Variables
| Variable | Required | Default | Purpose |
|----------|----------|---------|---------|
| FIVETRAN_API_KEY | Yes | — | API key |
| FIVETRAN_API_SECRET | Yes | — | API secret |
| FIVETRAN_ALLOW_WRITES | No | false | Enables write operations |

### Credentials
Generate at: https://fivetran.com/dashboard/user/api-config

### Read Tools (Default)
- `list_connections` — list all connectors
- `get_connection_details` — status, succeeded_at, failed_at, sync_state, sync_frequency
- `get_connection_state` — current sync progress
- `get_connection_schema_config` — schema inspection
- `list_destinations` — list warehouses
- `get_destination_details` — warehouse info
- `list_groups` — list groups

### Write Tools (FIVETRAN_ALLOW_WRITES=true)
- `sync_connection` — trigger immediate sync
- `resync_connection` — full historical resync
- `resync_tables` — resync specific tables
- `run_connection_setup_tests` — diagnose failures
- `reload_connection_schema_config` — reload schema from source
- `modify_connection_schema_config` — enable/disable tables/columns
- `modify_connection` — change sync_frequency, pause state
- `create_connection` / `delete_connection`
- `create_account_webhook` / `create_group_webhook`
- `modify_webhook` / `delete_webhook`

### Fivetran Connection Details Response Fields
- `setup_state`: "incomplete" | "connected" | "broken"
- `sync_state`: "scheduled" | "syncing" | "paused" | "rescheduled"
- `update_state`: "on_schedule" | "delayed"
- `succeeded_at`: last successful sync timestamp
- `failed_at`: last failure timestamp
- `rescheduled_for`: next scheduled sync
- `sync_frequency`: interval in minutes (1-1440)
- `paused`: boolean
- `status.tasks`: array of issues
- `status.warnings`: array of warnings

### Fivetran Webhooks
- Events: sync_start, sync_end, connection_successful, connection_failure
- Payload includes: event type, timestamp, connector_id, connector_name, status
- Retry: exponential backoff for 24 hours
- Create via API: POST /v1/webhooks

### Fivetran Free Trial
- 14-day free trial: https://fivetran.com/signup
- API auth docs: https://fivetran.com/docs/rest-api/getting-started#authentication

---

## MongoDB MCP Server

### Overview
- Official server: `mongodb-js/mongodb-mcp-server`
- Connects AI agents to MongoDB databases and Atlas
- Read-only by default (write must be explicitly enabled)

### Tools Available
**Database Operations:**
- find, aggregate, insert-many, update-many, delete-many
- create-collection, drop-collection
- list-databases, list-collections
- schema inspection, index management

**Atlas Management:**
- Cluster creation/inspection
- Database user management
- Performance advisor

### Connection
- Direct connection string
- Atlas API credentials
- Docker containers
- Environment variables

---

## Competitor Analysis

### suture (Hackathon competitor)
- **Focus**: Schema drift auto-healing (60 seconds)
- **Architecture**: FastAPI + Gemini 3 Pro + Fivetran REST API + Supabase + Arize Phoenix
- **Flow**: Detect (webhook) → Diagnose → Map (AI semantic matching) → Patch (REST API) → Verify
- **Limitation**: Only handles schema drift. No SLA awareness. No proactive mode.
- **Differentiator from Vigil**: suture fixes ONE failure type (schema). Vigil prevents business impact.

### Pipeline_Sentry (Hackathon competitor)
- **Focus**: Credential rotation + retry
- **Architecture**: ADK + Gemini + Fivetran MCP + GCP Secret Manager
- **Flow**: Detect → Diagnose → Self-Heal (rotate creds) → Verify & Notify
- **Limitation**: Only handles auth failures. No SLA awareness. Reactive only.
- **Differentiator from Vigil**: Pipeline_Sentry fixes ONE failure type (auth). Vigil prevents business impact.

### dq-sentinel-agent (Hackathon competitor)
- **Focus**: Data quality monitoring with human approval gate
- **Architecture**: ADK + Gemini + Fivetran MCP + BigQuery
- **Flow**: Scan → Detect → Diagnose → Propose → WAIT FOR HUMAN → Execute
- **Limitation**: Not autonomous. Requires human approval. No proactive mode.
- **Differentiator from Vigil**: dq-sentinel requires humans. Vigil acts autonomously when risk is clear.

---

## Key Technical Decisions

### Why ADK over LangChain/LangGraph?
- Hackathon requirement (Google Cloud native)
- First-class MCP support via McpToolset
- Native Gemini integration (no adapter layer)
- Graph workflows for deterministic + AI hybrid logic
- Built-in session management
- One-command Cloud Run deployment

### Why Stdio MCP vs. Remote HTTP MCP?
- **Development**: Stdio (simpler, local process)
- **Production/Demo**: Should use remote (scalable, no process management)
- **Decision**: Start with stdio for development, evaluate remote for demo

### Why MongoDB over Firestore/Supabase?
- Hackathon partner track available
- MCP server exists for agent-native access
- Flexible schema for SLA definitions + incident logs
- Aggregation pipeline for pattern computation
- Atlas free tier available

---

## Links

### Hackathon
- Resources: https://rapid-agent.devpost.com/resources
- Rules: https://rapid-agent.devpost.com/rules
- Fivetran track: https://rapid-agent.devpost.com/details/fivetran-resources

### Google Cloud
- Agent Builder: https://cloud.google.com/products/agent-builder
- ADK Python: https://github.com/google/adk-python
- ADK Docs: https://adk.dev/
- Agent Starter Pack: https://github.com/GoogleCloudPlatform/agent-starter-pack
- Cloud Run: https://cloud.google.com/run
- Secret Manager: https://cloud.google.com/secret-manager

### Fivetran
- MCP Server: https://github.com/fivetran/fivetran-mcp
- REST API Docs: https://fivetran.com/docs/rest-api
- API Framework: https://github.com/fivetran/api_framework
- Free Trial: https://fivetran.com/signup
- BigQuery Setup: https://fivetran.com/docs/destinations/bigquery/setup-guide

### MongoDB
- MCP Server: https://github.com/mongodb-js/mongodb-mcp-server
- Atlas: https://www.mongodb.com/atlas
