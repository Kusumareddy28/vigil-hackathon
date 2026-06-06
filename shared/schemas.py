from __future__ import annotations

from enum import Enum
from typing import Optional

from pydantic import BaseModel


class RiskLevel(str, Enum):
    GREEN = "GREEN"
    YELLOW = "YELLOW"
    RED = "RED"


class Confidence(str, Enum):
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"


class RecommendedAction(str, Enum):
    MONITOR = "MONITOR"
    EARLY_SYNC = "EARLY_SYNC"
    ESCALATE = "ESCALATE"


class FailureType(str, Enum):
    SCHEMA_CHANGE = "SCHEMA_CHANGE"
    RATE_LIMIT = "RATE_LIMIT"
    AUTH_EXPIRED = "AUTH_EXPIRED"
    SOURCE_OUTAGE = "SOURCE_OUTAGE"
    DESTINATION_ERROR = "DESTINATION_ERROR"
    UNKNOWN = "UNKNOWN"


class RiskAssessment(BaseModel):
    risk_level: RiskLevel
    reasoning: str
    recommended_action: RecommendedAction
    confidence: Confidence
    confidence_factors: list[str]


class FailureClassification(BaseModel):
    failure_type: FailureType
    evidence: list[str]
    from_history: bool
    recommended_fix: list[str]


class RemediationOutcome(BaseModel):
    actions_taken: list[str]
    success: bool
    connector_status_after: str
    time_elapsed_seconds: float
    sla_impact: str


class ReasoningTrace(BaseModel):
    phase: str
    connector_id: str
    connector_name: str
    sla_name: Optional[str]
    business_impact: str
    assessment: Optional[RiskAssessment] = None
    classification: Optional[FailureClassification] = None
    outcome: Optional[RemediationOutcome] = None
    escalation_message: Optional[str] = None
    timestamp: str
