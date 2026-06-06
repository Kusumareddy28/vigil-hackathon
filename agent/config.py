from orchestrator.config import settings

FIVETRAN_MCP_COMMAND = "uvx"
FIVETRAN_MCP_ARGS = ["--from", "git+https://github.com/fivetran/fivetran-mcp", "fivetran-mcp"]

MONGODB_MCP_COMMAND = "npx"
MONGODB_MCP_ARGS = ["-y", "mongodb-mcp-server"]

MODEL = "gemini-2.5-flash"
