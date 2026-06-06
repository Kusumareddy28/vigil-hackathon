from __future__ import annotations

from google.adk.agents import LlmAgent
from google.adk.tools.mcp_tool.mcp_toolset import McpToolset
from google.adk.tools.mcp_tool.mcp_session_manager import StdioConnectionParams
from mcp import StdioServerParameters

from agent.config import (
    FIVETRAN_MCP_COMMAND,
    FIVETRAN_MCP_ARGS,
    MONGODB_MCP_COMMAND,
    MONGODB_MCP_ARGS,
    MODEL,
)
from agent.prompts import SYSTEM_PROMPT
from orchestrator.config import settings


def create_vigil_agent() -> LlmAgent:
    fivetran_toolset = McpToolset(
        connection_params=StdioConnectionParams(
            server_params=StdioServerParameters(
                command=FIVETRAN_MCP_COMMAND,
                args=FIVETRAN_MCP_ARGS,
                env={
                    "FIVETRAN_API_KEY": settings.fivetran_api_key,
                    "FIVETRAN_API_SECRET": settings.fivetran_api_secret,
                    "FIVETRAN_ALLOW_WRITES": "true",
                },
            ),
            timeout=30.0,
        ),
    )

    mongodb_toolset = McpToolset(
        connection_params=StdioConnectionParams(
            server_params=StdioServerParameters(
                command=MONGODB_MCP_COMMAND,
                args=MONGODB_MCP_ARGS,
                env={
                    "MDB_MCP_CONNECTION_STRING": settings.mongodb_uri,
                },
            ),
            timeout=30.0,
        ),
        tool_filter=["find", "aggregate"],
    )

    return LlmAgent(
        model=MODEL,
        name="vigil",
        instruction=SYSTEM_PROMPT,
        tools=[fivetran_toolset, mongodb_toolset],
    )
