from __future__ import annotations

import json
import logging
import re
from datetime import datetime, timezone

from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai import types

from agent.agent import create_vigil_agent
from shared.schemas import ReasoningTrace

logger = logging.getLogger(__name__)

_runner: Runner | None = None
_session_service = InMemorySessionService()


def _get_runner() -> Runner:
    global _runner
    if _runner is None:
        agent = create_vigil_agent()
        _runner = Runner(
            agent=agent,
            app_name="vigil",
            session_service=_session_service,
        )
    return _runner


async def close_runner() -> None:
    global _runner
    if _runner is not None:
        await _runner.close()
        _runner = None


def _extract_json_from_response(text: str) -> dict | None:
    json_match = re.search(r"```json\s*(.*?)\s*```", text, re.DOTALL)
    if json_match:
        try:
            return json.loads(json_match.group(1))
        except json.JSONDecodeError:
            pass
    try:
        last_brace = text.rfind("}")
        first_brace = text.find("{")
        if first_brace != -1 and last_brace != -1:
            return json.loads(text[first_brace : last_brace + 1])
    except json.JSONDecodeError:
        pass
    return None


async def invoke_agent(context: dict) -> ReasoningTrace:
    runner = _get_runner()
    session = await _session_service.create_session(
        app_name="vigil", user_id="system"
    )

    message = json.dumps(context, indent=2, default=str)
    content = types.Content(
        role="user",
        parts=[types.Part.from_text(text=message)],
    )

    response_text = ""
    try:
        async for event in runner.run_async(
            user_id="system",
            session_id=session.id,
            new_message=content,
        ):
            if event.is_final_response() and event.content and event.content.parts:
                response_text = "".join(
                    p.text or "" for p in event.content.parts
                )
    except Exception as e:
        logger.error(f"Agent invocation failed: {e}", exc_info=True)
        response_text = ""
    finally:
        await _session_service.delete_session(
            app_name="vigil", user_id="system", session_id=session.id
        )

    parsed = _extract_json_from_response(response_text)
    if parsed:
        try:
            return ReasoningTrace.model_validate(parsed)
        except Exception as e:
            logger.warning(f"Failed to parse agent response as ReasoningTrace: {e}")

    return ReasoningTrace(
        phase=context.get("mode", "unknown"),
        connector_id=context.get("connector_id", context.get("sla", {}).get("connector_id", "unknown")),
        connector_name=context.get("sla", {}).get("connector_name", "unknown"),
        sla_name=context.get("sla", {}).get("name"),
        business_impact=context.get("sla", {}).get("business_impact", "unknown"),
        assessment=None,
        classification=None,
        outcome=None,
        escalation_message=f"Agent response could not be parsed: {response_text[:500]}",
        timestamp=datetime.now(timezone.utc).isoformat(),
    )
