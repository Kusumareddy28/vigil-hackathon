from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class SLADefinition(BaseModel):
    id: str = Field(alias="_id")
    name: str
    connector_id: str
    connector_name: str
    deadline_cron: str
    deadline_description: str
    buffer_hours: int = 3
    stakeholder: str
    business_impact: str
    impact_context: str
    escalation_channel: str = ""
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True


class Incident(BaseModel):
    id: str = Field(alias="_id")
    connector_id: str
    sla_id: Optional[str] = None
    detected_at: datetime
    failure_type: str
    agent_actions: list[dict] = Field(default_factory=list)
    resolved_at: Optional[datetime] = None
    time_to_resolve_seconds: Optional[float] = None
    sla_impact: str = "unknown"
    sla_deadline: Optional[datetime] = None
    human_intervention_required: bool = False
    reasoning_trace: Optional[dict] = None

    class Config:
        populate_by_name = True


class ConnectorHealth(BaseModel):
    id: str = Field(alias="_id")
    connector_id: str
    date: str
    syncs_attempted: int = 0
    syncs_succeeded: int = 0
    syncs_failed: int = 0
    failure_types: list[str] = Field(default_factory=list)
    avg_sync_duration_seconds: float = 0.0
    failure_rate_7d: float = 0.0
    weekend_failure_rate: float = 0.0

    class Config:
        populate_by_name = True
