import { useEffect, useRef, useState } from "react";
import { apiEventSource } from "@/lib/api";
import type { AgentFeedEvent } from "@/lib/vigil/types";

function mapSSEToFeedEvent(eventType: string, data: any): AgentFeedEvent | null {
  const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const id = `sse-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  if (eventType === "trace" && data.assessment) {
    const risk = data.assessment.risk_level;
    const kind = risk === "RED" ? "detect" : risk === "YELLOW" ? "evaluate" : "monitor";
    return {
      id,
      time,
      kind,
      title: `Risk assessed: ${data.connector_name || data.connector_id} → ${risk}`,
      detail: data.assessment.reasoning?.slice(0, 120),
      decision: data.sla_name,
    };
  }

  if (eventType === "trace" && data.outcome) {
    return {
      id,
      time,
      kind: data.outcome.success ? "recover" : "act",
      title: `${data.outcome.success ? "Recovered" : "Action taken"}: ${data.connector_name || data.connector_id}`,
      detail: data.outcome.actions_taken?.join(" → "),
      decision: data.sla_name,
    };
  }

  if (eventType === "trace") {
    return {
      id,
      time,
      kind: "evaluate",
      title: `Agent evaluated ${data.connector_name || data.connector_id}`,
      detail: data.escalation_message || data.phase,
      decision: data.sla_name,
    };
  }

  if (eventType === "sla_update") {
    return {
      id,
      time,
      kind: "update",
      title: `SLA status: ${data.sla_id} → ${data.status}`,
      detail: data.status === "GREEN" ? "All within tolerance" : "Elevated risk detected",
    };
  }

  if (eventType === "incident") {
    const connector = data.connector_id || data.connector || "unknown";
    const failureType = data.failure_type || data.type || "Issue";
    const resolved = data.resolved_at || data.resolved;
    return {
      id,
      time,
      kind: resolved ? "recover" : "detect",
      title: `${resolved ? "Resolved" : "Incident"}: ${failureType.replace(/_/g, " ")} on ${connector}`,
      detail: resolved && data.time_to_resolve_seconds
        ? `Auto-resolved in ${data.time_to_resolve_seconds}s`
        : data.agent_actions?.length ? `Agent acting: ${data.agent_actions[0]}` : undefined,
    };
  }

  return null;
}

export function useSSE(maxEvents = 50) {
  const [events, setEvents] = useState<AgentFeedEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const es = apiEventSource("/api/events");
    esRef.current = es;

    es.addEventListener("connected", () => setConnected(true));
    es.onerror = () => setConnected(false);

    const handler = (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        const feedEvent = mapSSEToFeedEvent(e.type, data);
        if (feedEvent) {
          setEvents((prev) => [feedEvent, ...prev].slice(0, maxEvents));
        }
      } catch {}
    };

    es.addEventListener("trace", handler);
    es.addEventListener("sla_update", handler);
    es.addEventListener("incident", handler);

    return () => {
      es.close();
      esRef.current = null;
    };
  }, [maxEvents]);

  return { events, connected };
}
