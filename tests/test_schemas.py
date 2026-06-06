import pytest
from shared.schemas import (
    RiskLevel, Confidence, RecommendedAction, FailureType,
    RiskAssessment, FailureClassification, RemediationOutcome, ReasoningTrace,
)


def test_risk_assessment_valid():
    ra = RiskAssessment(
        risk_level=RiskLevel.RED,
        reasoning="Only one sync window remaining before critical SLA.",
        recommended_action=RecommendedAction.EARLY_SYNC,
        confidence=Confidence.HIGH,
        confidence_factors=["Weekend failures observed", "One sync window left"],
    )
    assert ra.risk_level == RiskLevel.RED
    assert ra.recommended_action == RecommendedAction.EARLY_SYNC
    assert len(ra.confidence_factors) == 2


def test_failure_classification_valid():
    fc = FailureClassification(
        failure_type=FailureType.SCHEMA_CHANGE,
        evidence=["setup test: schema_mismatch", "column 'quarterly_target' not found"],
        from_history=True,
        recommended_fix=["reload_connection_schema_config", "sync_connection"],
    )
    assert fc.failure_type == FailureType.SCHEMA_CHANGE
    assert fc.from_history is True


def test_remediation_outcome_valid():
    ro = RemediationOutcome(
        actions_taken=["reload_connection_schema_config", "sync_connection"],
        success=True,
        connector_status_after="scheduled",
        time_elapsed_seconds=47.2,
        sla_impact="met",
    )
    assert ro.success is True
    assert ro.sla_impact == "met"


def test_reasoning_trace_proactive():
    trace = ReasoningTrace(
        phase="proactive",
        connector_id="connector_abc123",
        connector_name="salesforce_prod",
        sla_name="Board Revenue Dashboard",
        business_impact="critical",
        assessment=RiskAssessment(
            risk_level=RiskLevel.RED,
            reasoning="Elevated weekend risk.",
            recommended_action=RecommendedAction.EARLY_SYNC,
            confidence=Confidence.HIGH,
            confidence_factors=["Weekend pattern"],
        ),
        classification=None,
        outcome=None,
        escalation_message=None,
        timestamp="2026-06-09T03:15:00Z",
    )
    assert trace.phase == "proactive"
    assert trace.assessment is not None
    assert trace.classification is None


def test_reasoning_trace_reactive():
    trace = ReasoningTrace(
        phase="reactive",
        connector_id="connector_abc123",
        connector_name="salesforce_prod",
        sla_name="Board Revenue Dashboard",
        business_impact="critical",
        assessment=None,
        classification=FailureClassification(
            failure_type=FailureType.SCHEMA_CHANGE,
            evidence=["schema_mismatch"],
            from_history=True,
            recommended_fix=["reload_connection_schema_config"],
        ),
        outcome=RemediationOutcome(
            actions_taken=["reload_connection_schema_config", "sync_connection"],
            success=True,
            connector_status_after="scheduled",
            time_elapsed_seconds=47.0,
            sla_impact="met",
        ),
        escalation_message=None,
        timestamp="2026-06-09T03:15:00Z",
    )
    assert trace.phase == "reactive"
    assert trace.classification.failure_type == FailureType.SCHEMA_CHANGE
    assert trace.outcome.success is True


def test_reasoning_trace_serialization():
    trace = ReasoningTrace(
        phase="proactive",
        connector_id="abc",
        connector_name="salesforce",
        sla_name=None,
        business_impact="medium",
        assessment=None,
        classification=None,
        outcome=None,
        escalation_message=None,
        timestamp="2026-06-09T00:00:00Z",
    )
    data = trace.model_dump()
    assert data["phase"] == "proactive"
    assert data["sla_name"] is None
    reparsed = ReasoningTrace.model_validate(data)
    assert reparsed == trace
