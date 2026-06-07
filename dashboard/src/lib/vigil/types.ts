export type DependencyStatus = "fresh" | "stale" | "at_risk" | "failed";
export type DecisionStatus = "ready" | "ready_with_caution" | "at_risk" | "blocked";

export interface Dependency {
  id: string;
  name: string;
  source: string;
  status: DependencyStatus;
  lastSync: string;
  /** Human-readable freshness, e.g. "Updated 12 minutes ago" */
  freshnessLabel?: string;
  latencyMs?: number;
  notes?: string;
}

export interface AgentEvent {
  time: string;
  title: string;
  detail?: string;
  kind: "detect" | "evaluate" | "act" | "monitor" | "update";
}

export interface ConfidenceDriver {
  label: string;
  detail?: string;
  polarity: "positive" | "negative";
}

export interface ReasoningTrace {
  facts: string[];
  reasoning: string;
  decision: {
    readiness: number;
    recommendation: string;
    action: string;
  };
}

export interface Decision {
  id: string;
  title: string;
  stakeholder: string;
  stakeholderRole: string;
  /** ISO timestamp used for live countdown */
  deadline: string;
  deadlineLabel: string;
  criticality: "low" | "medium" | "high" | "critical";
  readiness: number;
  status: DecisionStatus;
  summary: string;
  recommendation: string;
  /** One-line executive-friendly verdict shown under the readiness score */
  confidenceSummary: string;
  /** Why the score is what it is */
  confidenceDrivers: ConfidenceDriver[];
  dependencies: Dependency[];
  reasoning: ReasoningTrace;
  timeline: AgentEvent[];
}

export interface Incident {
  id: string;
  title: string;
  affectedDecision: string;
  severity: "low" | "medium" | "high" | "critical";
  detectedAt: string;
  agentAction: string;
  outcome: "recovered" | "in_progress" | "escalated" | "human_intervention";
  humanIntervention: boolean;
}

export interface AgentFeedEvent {
  id: string;
  time: string;
  title: string;
  detail?: string;
  decision?: string;
  kind: "detect" | "evaluate" | "act" | "monitor" | "update" | "recover";
}
