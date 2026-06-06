"""Seed MongoDB with demo SLA definitions and fake historical data."""
from __future__ import annotations

import asyncio
from datetime import datetime, timezone, timedelta
from motor.motor_asyncio import AsyncIOMotorClient

from orchestrator.config import settings


SLAS = [
    {
        "_id": "sla_board_revenue",
        "name": "Board Revenue Dashboard",
        "connector_id": "connector_salesforce",
        "connector_name": "salesforce_prod",
        "deadline_cron": "0 9 * * 1",
        "deadline_description": "Monday 9:00 AM UTC",
        "buffer_hours": 3,
        "stakeholder": "CFO",
        "business_impact": "critical",
        "impact_context": "CFO presents revenue numbers to board. Wrong data = public embarrassment.",
        "escalation_channel": "slack:#data-oncall",
        "created_at": datetime.now(timezone.utc),
    },
    {
        "_id": "sla_marketing_weekly",
        "name": "Marketing Weekly Report",
        "connector_id": "connector_analytics",
        "connector_name": "google_analytics_prod",
        "deadline_cron": "0 8 * * 4",
        "deadline_description": "Thursday 8:00 AM UTC",
        "buffer_hours": 6,
        "stakeholder": "VP Marketing",
        "business_impact": "medium",
        "impact_context": "Weekly marketing performance review. Delay is inconvenient, not critical.",
        "escalation_channel": "slack:#marketing-data",
        "created_at": datetime.now(timezone.utc),
    },
    {
        "_id": "sla_ops_dashboard",
        "name": "Ops Daily Dashboard",
        "connector_id": "connector_postgres",
        "connector_name": "postgres_prod",
        "deadline_cron": "0 7 * * *",
        "deadline_description": "Daily 7:00 AM UTC",
        "buffer_hours": 2,
        "stakeholder": "VP Engineering",
        "business_impact": "high",
        "impact_context": "Engineering standup uses this dashboard. Stale data causes confusion.",
        "escalation_channel": "slack:#eng-oncall",
        "created_at": datetime.now(timezone.utc),
    },
]

HEALTH_RECORDS = [
    {
        "_id": "health_connector_salesforce_today",
        "connector_id": "connector_salesforce",
        "date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "syncs_attempted": 12,
        "syncs_succeeded": 10,
        "syncs_failed": 2,
        "failure_types": ["SCHEMA_CHANGE", "SCHEMA_CHANGE"],
        "avg_sync_duration_seconds": 180,
        "failure_rate_7d": 0.18,
        "weekend_failure_rate": 0.38,
        "sync_frequency_seconds": 21600,
    },
    {
        "_id": "health_connector_analytics_today",
        "connector_id": "connector_analytics",
        "date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "syncs_attempted": 8,
        "syncs_succeeded": 8,
        "syncs_failed": 0,
        "failure_types": [],
        "avg_sync_duration_seconds": 90,
        "failure_rate_7d": 0.02,
        "weekend_failure_rate": 0.0,
        "sync_frequency_seconds": 43200,
    },
    {
        "_id": "health_connector_postgres_today",
        "connector_id": "connector_postgres",
        "date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "syncs_attempted": 24,
        "syncs_succeeded": 22,
        "syncs_failed": 2,
        "failure_types": ["RATE_LIMIT", "SOURCE_OUTAGE"],
        "avg_sync_duration_seconds": 45,
        "failure_rate_7d": 0.08,
        "weekend_failure_rate": 0.04,
        "sync_frequency_seconds": 3600,
    },
]

INCIDENTS = [
    {
        "_id": "inc_seed_001",
        "connector_id": "connector_salesforce",
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
        "connector_id": "connector_salesforce",
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
        "connector_id": "connector_salesforce",
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
