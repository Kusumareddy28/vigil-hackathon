export type RiskLevel = 'GREEN' | 'YELLOW' | 'RED'
export type Confidence = 'HIGH' | 'MEDIUM' | 'LOW'
export type RecommendedAction = 'MONITOR' | 'EARLY_SYNC' | 'ESCALATE'
export type FailureType = 'SCHEMA_CHANGE' | 'RATE_LIMIT' | 'AUTH_EXPIRED' | 'SOURCE_OUTAGE' | 'DESTINATION_ERROR' | 'UNKNOWN'

export interface RiskAssessment {
  risk_level: RiskLevel
  reasoning: string
  recommended_action: RecommendedAction
  confidence: Confidence
  confidence_factors: string[]
}

export interface FailureClassification {
  failure_type: FailureType
  evidence: string[]
  from_history: boolean
  recommended_fix: string[]
}

export interface RemediationOutcome {
  actions_taken: string[]
  success: boolean
  connector_status_after: string
  time_elapsed_seconds: number
  sla_impact: string
}

export interface ReasoningTrace {
  phase: string
  connector_id: string
  connector_name: string
  sla_name: string | null
  business_impact: string
  assessment: RiskAssessment | null
  classification: FailureClassification | null
  outcome: RemediationOutcome | null
  escalation_message: string | null
  timestamp: string
}

export interface SLAStatus {
  sla_id: string
  status: RiskLevel
  last_checked: string
}

export interface Incident {
  _id: string
  connector_id: string
  sla_id: string | null
  detected_at: string
  failure_type: string
  time_to_resolve_seconds: number | null
  sla_impact: string
  human_intervention_required: boolean
}
