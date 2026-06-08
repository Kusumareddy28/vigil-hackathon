"""Seed MongoDB with demo SLA definitions and fake historical data.

Real connector IDs from Fivetran:
- ambiguity_batch (Google Sheets - revenue_data)
- rice_glaze (GitHub)
- mirrored_aboriginal (Fivetran Log / metadata)

For additional connectors, create more Google Sheets in Fivetran.
"""
from __future__ import annotations

import asyncio
from datetime import datetime, timezone, timedelta
from motor.motor_asyncio import AsyncIOMotorClient

from orchestrator.config import settings


SLAS = [
    {
        "_id": "sla_board_revenue",
        "name": "Board Revenue Review",
        "connector_id": "ambiguity_batch",
        "connector_name": "google_sheets_revenue",
        "dependencies": [
            {"connector_id": "ambiguity_batch", "name": "Revenue Pipeline", "source": "Google Sheets"},
            {"connector_id": "rice_glaze", "name": "Engineering Activity", "source": "GitHub"},
        ],
        "deadline_cron": "0 9 * * 1",
        "deadline_description": "Monday 9:00 AM UTC",
        "buffer_hours": 3,
        "stakeholder": "Marisa Chen",
        "stakeholder_role": "CFO",
        "business_impact": "critical",
        "impact_context": "Quarterly board review of revenue performance, pipeline health, and forward forecast.",
        "escalation_channel": "slack:#data-oncall",
        "created_at": datetime.now(timezone.utc),
    },
    {
        "_id": "sla_engineering_standup",
        "name": "Engineering Daily Standup",
        "connector_id": "rice_glaze",
        "connector_name": "github",
        "dependencies": [
            {"connector_id": "rice_glaze", "name": "Code Activity", "source": "GitHub"},
        ],
        "deadline_cron": "0 9 * * 1-5",
        "deadline_description": "Weekdays 9:00 AM UTC",
        "buffer_hours": 2,
        "stakeholder": "David Okafor",
        "stakeholder_role": "VP Engineering",
        "business_impact": "high",
        "impact_context": "Engineering standup depends on fresh commit/PR data. Stale data causes confusion about sprint progress.",
        "escalation_channel": "slack:#eng-oncall",
        "created_at": datetime.now(timezone.utc),
    },
    {
        "_id": "sla_data_ops_health",
        "name": "Data Platform Health",
        "connector_id": "mirrored_aboriginal",
        "connector_name": "fivetran_metadata",
        "dependencies": [
            {"connector_id": "mirrored_aboriginal", "name": "Pipeline Metadata", "source": "Fivetran Log"},
            {"connector_id": "ambiguity_batch", "name": "Revenue Pipeline", "source": "Google Sheets"},
            {"connector_id": "rice_glaze", "name": "Code Activity", "source": "GitHub"},
        ],
        "deadline_cron": "0 8 * * *",
        "deadline_description": "Daily 8:00 AM UTC",
        "buffer_hours": 1,
        "stakeholder": "Priya Anand",
        "stakeholder_role": "Data Lead",
        "business_impact": "medium",
        "impact_context": "Daily data platform health review. Monitors all connector sync performance across the org.",
        "escalation_channel": "slack:#data-platform",
        "created_at": datetime.now(timezone.utc),
    },
]

HEALTH_RECORDS = [
    {
        "_id": "health_ambiguity_batch_today",
        "connector_id": "ambiguity_batch",
        "date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "syncs_attempted": 12,
        "syncs_succeeded": 10,
        "syncs_failed": 2,
        "failure_types": ["SCHEMA_CHANGE", "SCHEMA_CHANGE"],
        "avg_sync_duration_seconds": 180,
        "failure_rate_7d": 0.18,
        "weekend_failure_rate": 0.38,
        "sync_frequency_seconds": 21600,
        "last_sync": datetime.now(timezone.utc).isoformat(),
    },
    {
        "_id": "health_rice_glaze_today",
        "connector_id": "rice_glaze",
        "date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "syncs_attempted": 8,
        "syncs_succeeded": 8,
        "syncs_failed": 0,
        "failure_types": [],
        "avg_sync_duration_seconds": 90,
        "failure_rate_7d": 0.0,
        "weekend_failure_rate": 0.0,
        "sync_frequency_seconds": 43200,
        "last_sync": datetime.now(timezone.utc).isoformat(),
    },
    {
        "_id": "health_mirrored_aboriginal_today",
        "connector_id": "mirrored_aboriginal",
        "date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "syncs_attempted": 24,
        "syncs_succeeded": 22,
        "syncs_failed": 2,
        "failure_types": ["RATE_LIMIT", "SOURCE_OUTAGE"],
        "avg_sync_duration_seconds": 45,
        "failure_rate_7d": 0.08,
        "weekend_failure_rate": 0.04,
        "sync_frequency_seconds": 3600,
        "last_sync": (datetime.now(timezone.utc) - timedelta(hours=2)).isoformat(),
    },
]

INCIDENTS = [
    {
        "_id": "inc_seed_001",
        "connector_id": "ambiguity_batch",
        "sla_id": "sla_board_revenue",
        "detected_at": datetime.now(timezone.utc) - timedelta(days=3),
        "failure_type": "SCHEMA_CHANGE",
        "agent_actions": [
            {"action": "run_connection_setup_tests", "result": "schema_mismatch"},
            {"action": "reload_connection_schema_config", "result": "success"},
            {"action": "sync_connection", "result": "success"},
        ],
        "resolved_at": datetime.now(timezone.utc) - timedelta(days=3) + timedelta(seconds=120),
        "time_to_resolve_seconds": 120,
        "sla_impact": "met",
        "human_intervention_required": False,
    },
    {
        "_id": "inc_seed_002",
        "connector_id": "ambiguity_batch",
        "sla_id": "sla_board_revenue",
        "detected_at": datetime.now(timezone.utc) - timedelta(days=7),
        "failure_type": "SCHEMA_CHANGE",
        "agent_actions": [
            {"action": "reload_connection_schema_config", "result": "success"},
            {"action": "sync_connection", "result": "success"},
        ],
        "resolved_at": datetime.now(timezone.utc) - timedelta(days=7) + timedelta(seconds=90),
        "time_to_resolve_seconds": 90,
        "sla_impact": "met",
        "human_intervention_required": False,
    },
    {
        "_id": "inc_seed_003",
        "connector_id": "ambiguity_batch",
        "sla_id": "sla_board_revenue",
        "detected_at": datetime.now(timezone.utc) - timedelta(days=14),
        "failure_type": "AUTH_EXPIRED",
        "agent_actions": [
            {"action": "run_connection_setup_tests", "result": "auth_failure"},
        ],
        "resolved_at": datetime.now(timezone.utc) - timedelta(days=14) + timedelta(minutes=12),
        "time_to_resolve_seconds": 720,
        "sla_impact": "at_risk",
        "human_intervention_required": True,
    },
    {
        "_id": "inc_seed_004",
        "connector_id": "rice_glaze",
        "sla_id": "sla_engineering_standup",
        "detected_at": datetime.now(timezone.utc) - timedelta(days=2),
        "failure_type": "RATE_LIMIT",
        "agent_actions": [
            {"action": "modify_connection", "result": "reduced_frequency"},
            {"action": "sync_connection", "result": "success"},
        ],
        "resolved_at": datetime.now(timezone.utc) - timedelta(days=2) + timedelta(seconds=45),
        "time_to_resolve_seconds": 45,
        "sla_impact": "met",
        "human_intervention_required": False,
    },
]


async def seed():
    client = AsyncIOMotorClient(settings.mongodb_uri)
    db = client[settings.mongodb_db]

    await db.sla_definitions.drop()
    await db.connector_health.drop()
    await db.incidents.drop()
    await db.reasoning_traces.drop()

    if SLAS:
        await db.sla_definitions.insert_many(SLAS)
        print(f"Seeded {len(SLAS)} SLA definitions")

    if HEALTH_RECORDS:
        await db.connector_health.insert_many(HEALTH_RECORDS)
        print(f"Seeded {len(HEALTH_RECORDS)} health records")

    if INCIDENTS:
        await db.incidents.insert_many(INCIDENTS)
        print(f"Seeded {len(INCIDENTS)} historical incidents")

    print("Done.")
    client.close()


if __name__ == "__main__":
    asyncio.run(seed())
