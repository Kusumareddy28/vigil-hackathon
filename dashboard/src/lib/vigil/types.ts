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

export interface AuditFact {
  label: string;
  value: string;
  tone?: "neutral" | "positive" | "negative";
}

export interface AuditAction {
  label: string;
  detail?: string;
  status: "completed" | "pending" | "escalated";
}

export interface AuditEvidence {
  title: string;
  detail: string;
  time?: string;
  kind: "history" | "dependency" | "trace";
}

export interface DecisionAudit {
  decisionId: string;
  decisionTitle: string;
  generatedAt: string;
  connectorId: string;
  connectorName: string;
  businessImpact: string;
  finalRecommendation: string;
  outcomeStatus: "completed" | "monitoring" | "escalated";
  deterministicFacts: AuditFact[];
  dependencySnapshots: AuditFact[];
  modelJudgment: {
    riskLevel?: string;
    confidence?: string;
    recommendedAction?: string;
    reasoning?: string;
    confidenceFactors: string[];
  };
  actionsTaken: AuditAction[];
  evidenceTrail: AuditEvidence[];
  notes: string[];
}
