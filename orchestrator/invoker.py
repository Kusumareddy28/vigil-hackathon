from __future__ import annotations

import json
import logging
import re
from datetime import datetime, timezone
from typing import Any

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
    text = text.strip()
    if not text:
        return None

    fence_match = re.search(r"```(?:json)?\s*(.*?)\s*```", text, re.DOTALL)
    if fence_match:
        text = fence_match.group(1).strip()

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    decoder = json.JSONDecoder()
    for start in (m.start() for m in re.finditer(r"{", text)):
        try:
            parsed, _ = decoder.raw_decode(text[start:])
            if isinstance(parsed, dict):
                return parsed
        except json.JSONDecodeError:
            continue
    return None


def _sla_from_context(context: dict) -> dict:
    return context.get("sla") or context.get("sla_at_risk") or {}


def _trace_defaults(context: dict) -> dict[str, Any]:
    sla = _sla_from_context(context)
    return {
        "phase": context.get("mode", "unknown"),
        "connector_id": context.get("connector_id") or sla.get("connector_id", "unknown"),
        "connector_name": sla.get("connector_name", "unknown"),
        "sla_name": sla.get("name"),
        "business_impact": sla.get("business_impact", "unknown"),
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


def _infer_assessment_from_text(text: str) -> dict[str, Any] | None:
    if not text.strip():
        return None

    upper = text.upper()
    risk = "GREEN" if "GREEN" in upper else "YELLOW" if "YELLOW" in upper else "RED" if "RED" in upper else None
    action = (
        "EARLY_SYNC" if "EARLY_SYNC" in upper else
        "ESCALATE" if "ESCALATE" in upper else
        "MONITOR" if "MONITOR" in upper else None
    )
    if risk is None and action is None:
        return None

    return {
        "risk_level": risk or "YELLOW",
        "reasoning": text.strip()[:2000],
        "recommended_action": action or "MONITOR",
        "confidence": "LOW",
        "confidence_factors": [],
    }


def _coerce_trace(parsed: dict | None, context: dict, response_text: str) -> ReasoningTrace | None:
    defaults = _trace_defaults(context)
    if parsed:
        candidate = {**defaults, **parsed}
        try:
            return ReasoningTrace.model_validate(candidate)
        except Exception as e:
            logger.warning(f"Failed to validate parsed agent response directly: {e}")

    mode = context.get("mode")
    fallback: dict[str, Any] = {
        **defaults,
        "assessment": None,
        "classification": None,
        "outcome": None,
        "escalation_message": None,
    }

    if mode == "proactive":
        inferred = _infer_assessment_from_text(response_text)
        if inferred:
            fallback["assessment"] = inferred
            fallback["escalation_message"] = None
    elif response_text.strip():
        fallback["classification"] = {
            "failure_type": "UNKNOWN",
            "evidence": [response_text.strip()[:500]],
            "from_history": False,
            "recommended_fix": ["ESCALATE"],
        }
        fallback["outcome"] = {
            "actions_taken": [],
            "success": False,
            "connector_status_after": "unknown",
            "time_elapsed_seconds": 0.0,
            "sla_impact": "at_risk",
        }
        fallback["escalation_message"] = response_text.strip()[:500]

    try:
        if fallback["assessment"] or fallback["classification"] or fallback["outcome"]:
            return ReasoningTrace.model_validate(fallback)
    except Exception as e:
        logger.warning(f"Failed to validate coerced agent response: {e}")
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
    all_text_parts = []
    try:
        async for event in runner.run_async(
            user_id="system",
            session_id=session.id,
            new_message=content,
        ):
            if event.content and event.content.parts:
                for p in event.content.parts:
                    if p.text:
                        all_text_parts.append(p.text)
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

    if not response_text and all_text_parts:
        response_text = "\n".join(all_text_parts)
        logger.info(f"Used accumulated text parts ({len(all_text_parts)} parts)")

    logger.info(f"Agent response length: {len(response_text)} chars, preview: {response_text[:200]}")

    parsed = _extract_json_from_response(response_text)
    trace = _coerce_trace(parsed, context, response_text)
    if trace is not None:
        return trace

    defaults = _trace_defaults(context)

    return ReasoningTrace(
        phase=defaults["phase"],
        connector_id=defaults["connector_id"],
        connector_name=defaults["connector_name"],
        sla_name=defaults["sla_name"],
        business_impact=defaults["business_impact"],
        assessment=None,
        classification=None,
        outcome=None,
        escalation_message=f"Agent response could not be parsed: {response_text[:500]}",
        timestamp=defaults["timestamp"],
    )
