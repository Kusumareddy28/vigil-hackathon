"""Seed MongoDB with a curated demo dataset for Vigil.

This dataset is intentionally narrative-driven rather than randomly generated.
It creates three believable business decisions with:
- SLA metadata and business stakes
- primary + secondary dependencies
- connector health snapshots with varied freshness/risk profiles
- incident history with recoveries and escalations
- reasoning traces for the decision UI, activity feed, and audit trail

Run:
    .venv/bin/python scripts/seed.py
"""
from __future__ import annotations

import asyncio
from datetime import datetime, timedelta, timezone

from motor.motor_asyncio import AsyncIOMotorClient

from orchestrator.config import settings


NOW = datetime.now(timezone.utc).replace(microsecond=0)
TODAY = NOW.strftime("%Y-%m-%d")


def dt(**kwargs) -> datetime:
    return NOW - timedelta(**kwargs)


def iso(value: datetime) -> str:
    return value.isoformat()


SLAS = [
    {
        "_id": "sla_board_revenue",
        "name": "Board Revenue Review",
        "connector_id": "ambiguity_batch",
        "connector_name": "google_sheets_revenue",
        "dependencies": [
            {"connector_id": "ambiguity_batch", "name": "Revenue Pipeline", "source": "Google Sheets"},
            {"connector_id": "hubspot_pipeline", "name": "Open Pipeline", "source": "HubSpot"},
            {"connector_id": "snowflake_finance_mart", "name": "Finance Mart", "source": "Snowflake"},
        ],
        "deadline_cron": "0 9 * * 1",
        "deadline_description": "Monday 9:00 AM UTC",
        "buffer_hours": 3,
        "stakeholder": "Marisa Chen",
        "stakeholder_role": "CFO",
        "business_impact": "critical",
        "impact_context": "Quarterly board review of revenue performance, pipeline health, and forward forecast.",
        "escalation_channel": "slack:#exec-data-war-room",
        "created_at": dt(days=30),
    },
    {
        "_id": "sla_engineering_standup",
        "name": "Engineering Daily Standup",
        "connector_id": "rice_glaze",
        "connector_name": "github",
        "dependencies": [
            {"connector_id": "rice_glaze", "name": "Code Activity", "source": "GitHub"},
            {"connector_id": "buildkite_ci", "name": "CI Health", "source": "Buildkite"},
            {"connector_id": "jira_delivery", "name": "Sprint Board", "source": "Jira"},
        ],
        "deadline_cron": "0 15 * * 1-5",
        "deadline_description": "Weekdays 3:00 PM UTC",
        "buffer_hours": 2,
        "stakeholder": "David Okafor",
        "stakeholder_role": "VP Engineering",
        "business_impact": "high",
        "impact_context": "Engineering standup depends on fresh PR, workflow, and delivery status data across the team.",
        "escalation_channel": "slack:#eng-oncall",
        "created_at": dt(days=45),
    },
    {
        "_id": "sla_data_ops_health",
        "name": "Data Platform Health",
        "connector_id": "mirrored_aboriginal",
        "connector_name": "fivetran_metadata",
        "dependencies": [
            {"connector_id": "mirrored_aboriginal", "name": "Pipeline Metadata", "source": "Fivetran Log"},
            {"connector_id": "airbyte_marketing", "name": "Marketing Extract", "source": "Airbyte"},
            {"connector_id": "ambiguity_batch", "name": "Revenue Pipeline", "source": "Google Sheets"},
            {"connector_id": "rice_glaze", "name": "Engineering Activity", "source": "GitHub"},
        ],
        "deadline_cron": "0 12 * * *",
        "deadline_description": "Daily 12:00 PM UTC",
        "buffer_hours": 1,
        "stakeholder": "Priya Anand",
        "stakeholder_role": "Data Lead",
        "business_impact": "medium",
        "impact_context": "Daily readiness review for data leadership. Tracks sync freshness, intervention load, and platform stability.",
        "escalation_channel": "slack:#data-platform",
        "created_at": dt(days=20),
    },
]


HEALTH_RECORDS = [
    {
        "_id": "health_ambiguity_batch_today",
        "connector_id": "ambiguity_batch",
        "date": TODAY,
        "syncs_attempted": 12,
        "syncs_succeeded": 9,
        "syncs_failed": 3,
        "failure_types": ["SCHEMA_CHANGE", "SCHEMA_CHANGE", "AUTH_EXPIRED"],
        "avg_sync_duration_seconds": 219.0,
        "failure_rate_7d": 0.22,
        "weekend_failure_rate": 0.30,
        "sync_frequency_seconds": 21600,
        "last_sync": iso(dt(hours=5, minutes=20)),
    },
    {
        "_id": "health_hubspot_pipeline_today",
        "connector_id": "hubspot_pipeline",
        "date": TODAY,
        "syncs_attempted": 24,
        "syncs_succeeded": 23,
        "syncs_failed": 1,
        "failure_types": ["RATE_LIMIT"],
        "avg_sync_duration_seconds": 61.0,
        "failure_rate_7d": 0.04,
        "weekend_failure_rate": 0.02,
        "sync_frequency_seconds": 3600,
        "last_sync": iso(dt(minutes=48)),
    },
    {
        "_id": "health_snowflake_finance_mart_today",
        "connector_id": "snowflake_finance_mart",
        "date": TODAY,
        "syncs_attempted": 6,
        "syncs_succeeded": 6,
        "syncs_failed": 0,
        "failure_types": [],
        "avg_sync_duration_seconds": 145.0,
        "failure_rate_7d": 0.00,
        "weekend_failure_rate": 0.00,
        "sync_frequency_seconds": 14400,
        "last_sync": iso(dt(hours=1, minutes=12)),
    },
    {
        "_id": "health_rice_glaze_today",
        "connector_id": "rice_glaze",
        "date": TODAY,
        "syncs_attempted": 8,
        "syncs_succeeded": 8,
        "syncs_failed": 0,
        "failure_types": [],
        "avg_sync_duration_seconds": 92.0,
        "failure_rate_7d": 0.00,
        "weekend_failure_rate": 0.00,
        "sync_frequency_seconds": 43200,
        "last_sync": iso(dt(hours=2, minutes=10)),
    },
    {
        "_id": "health_buildkite_ci_today",
        "connector_id": "buildkite_ci",
        "date": TODAY,
        "syncs_attempted": 18,
        "syncs_succeeded": 15,
        "syncs_failed": 3,
        "failure_types": ["SOURCE_OUTAGE", "SOURCE_OUTAGE", "RATE_LIMIT"],
        "avg_sync_duration_seconds": 44.0,
        "failure_rate_7d": 0.11,
        "weekend_failure_rate": 0.09,
        "sync_frequency_seconds": 1800,
        "last_sync": iso(dt(minutes=33)),
    },
    {
        "_id": "health_jira_delivery_today",
        "connector_id": "jira_delivery",
        "date": TODAY,
        "syncs_attempted": 12,
        "syncs_succeeded": 12,
        "syncs_failed": 0,
        "failure_types": [],
        "avg_sync_duration_seconds": 38.0,
        "failure_rate_7d": 0.01,
        "weekend_failure_rate": 0.00,
        "sync_frequency_seconds": 7200,
        "last_sync": iso(dt(hours=1, minutes=5)),
    },
    {
        "_id": "health_mirrored_aboriginal_today",
        "connector_id": "mirrored_aboriginal",
        "date": TODAY,
        "syncs_attempted": 24,
        "syncs_succeeded": 22,
        "syncs_failed": 2,
        "failure_types": ["RATE_LIMIT", "SOURCE_OUTAGE"],
        "avg_sync_duration_seconds": 49.0,
        "failure_rate_7d": 0.08,
        "weekend_failure_rate": 0.04,
        "sync_frequency_seconds": 86400,
        "last_sync": iso(dt(hours=2, minutes=8)),
    },
    {
        "_id": "health_airbyte_marketing_today",
        "connector_id": "airbyte_marketing",
        "date": TODAY,
        "syncs_attempted": 10,
        "syncs_succeeded": 7,
        "syncs_failed": 3,
        "failure_types": ["DESTINATION_ERROR", "DESTINATION_ERROR", "DESTINATION_ERROR"],
        "avg_sync_duration_seconds": 154.0,
        "failure_rate_7d": 0.19,
        "weekend_failure_rate": 0.10,
        "sync_frequency_seconds": 21600,
        "last_sync": iso(dt(hours=9, minutes=40)),
    },
]


INCIDENTS = [
    {
        "_id": "inc_seed_board_schema_01",
        "connector_id": "ambiguity_batch",
        "sla_id": "sla_board_revenue",
        "detected_at": dt(days=10, hours=1),
        "failure_type": "SCHEMA_CHANGE",
        "agent_actions": [
            "run_connection_setup_tests",
            "reload_connection_schema_config",
            "sync_connection",
        ],
        "resolved_at": dt(days=10, hours=0, minutes=57),
        "time_to_resolve_seconds": 180,
        "sla_impact": "met",
        "human_intervention_required": False,
    },
    {
        "_id": "inc_seed_board_auth_02",
        "connector_id": "ambiguity_batch",
        "sla_id": "sla_board_revenue",
        "detected_at": dt(days=6, hours=3),
        "failure_type": "AUTH_EXPIRED",
        "agent_actions": ["run_connection_setup_tests", "escalate_to_data_ops"],
        "resolved_at": dt(days=6, hours=2, minutes=38),
        "time_to_resolve_seconds": 1320,
        "sla_impact": "at_risk",
        "human_intervention_required": True,
    },
    {
        "_id": "inc_seed_board_sync_03",
        "connector_id": "ambiguity_batch",
        "sla_id": "sla_board_revenue",
        "detected_at": dt(days=1, hours=7),
        "failure_type": "PROACTIVE_INTERVENTION",
        "agent_actions": ["sync_connection"],
        "resolved_at": dt(days=1, hours=6, minutes=55),
        "time_to_resolve_seconds": 300,
        "sla_impact": "met",
        "human_intervention_required": False,
    },
    {
        "_id": "inc_seed_eng_warning_01",
        "connector_id": "rice_glaze",
        "sla_id": "sla_engineering_standup",
        "detected_at": dt(days=2, hours=4),
        "failure_type": "UNKNOWN",
        "agent_actions": ["run_connection_setup_tests", "sync_connection"],
        "resolved_at": None,
        "time_to_resolve_seconds": None,
        "sla_impact": "at_risk",
        "human_intervention_required": True,
    },
    {
        "_id": "inc_seed_eng_ci_02",
        "connector_id": "buildkite_ci",
        "sla_id": "sla_engineering_standup",
        "detected_at": dt(days=1, hours=9),
        "failure_type": "SOURCE_OUTAGE",
        "agent_actions": ["escalate_to_platform_team"],
        "resolved_at": dt(days=1, hours=8, minutes=44),
        "time_to_resolve_seconds": 960,
        "sla_impact": "at_risk",
        "human_intervention_required": True,
    },
    {
        "_id": "inc_seed_dataops_01",
        "connector_id": "mirrored_aboriginal",
        "sla_id": "sla_data_ops_health",
        "detected_at": dt(days=3, hours=2),
        "failure_type": "PROACTIVE_INTERVENTION",
        "agent_actions": ["sync_connection"],
        "resolved_at": dt(days=3, hours=1, minutes=57),
        "time_to_resolve_seconds": 180,
        "sla_impact": "met",
        "human_intervention_required": False,
    },
    {
        "_id": "inc_seed_dataops_02",
        "connector_id": "mirrored_aboriginal",
        "sla_id": "sla_data_ops_health",
        "detected_at": dt(days=1, hours=4),
        "failure_type": "RATE_LIMIT",
        "agent_actions": ["modify_connection", "sync_connection"],
        "resolved_at": dt(days=1, hours=3, minutes=56),
        "time_to_resolve_seconds": 240,
        "sla_impact": "met",
        "human_intervention_required": False,
    },
    {
        "_id": "inc_seed_dataops_03",
        "connector_id": "airbyte_marketing",
        "sla_id": "sla_data_ops_health",
        "detected_at": dt(hours=18),
        "failure_type": "DESTINATION_ERROR",
        "agent_actions": ["escalate_to_data_warehouse_team"],
        "resolved_at": None,
        "time_to_resolve_seconds": None,
        "sla_impact": "at_risk",
        "human_intervention_required": True,
    },
]


REASONING_TRACES = [
    {
        "_id": "trace_board_latest",
        "phase": "proactive",
        "connector_id": "ambiguity_batch",
        "connector_name": "google_sheets_revenue",
        "sla_name": "Board Revenue Review",
        "business_impact": "critical",
        "assessment": {
            "risk_level": "RED",
            "reasoning": (
                "The board revenue pack is still vulnerable because the primary Google Sheets connector "
                "has recurring schema drift, a high weekend failure rate, and the most recent sync is older "
                "than expected for an executive-facing Monday review. Vigil triggered an early sync to reduce "
                "freshness risk before the CFO pulls the board narrative together."
            ),
            "recommended_action": "EARLY_SYNC",
            "confidence": "HIGH",
            "confidence_factors": [
                "Critical business impact for the CFO board review.",
                "Recurring schema-change failures on the primary revenue connector.",
                "Weekend failure rate remains elevated at 30%.",
                "A fresh early sync completed successfully after intervention.",
                "Supporting pipeline and finance mart dependencies are currently healthy.",
            ],
        },
        "classification": None,
        "outcome": {
            "actions_taken": ["sync_connection"],
            "success": True,
            "connector_status_after": "sync_state: syncing -> succeeded; latest workbook snapshot refreshed",
            "time_elapsed_seconds": 145.0,
            "sla_impact": "met",
        },
        "escalation_message": None,
        "timestamp": iso(dt(minutes=14)),
    },
    {
        "_id": "trace_eng_latest",
        "phase": "escalation",
        "connector_id": "rice_glaze",
        "connector_name": "github",
        "sla_name": "Engineering Daily Standup",
        "business_impact": "high",
        "assessment": {
            "risk_level": "RED",
            "reasoning": (
                "GitHub is syncing successfully, but the connector still reports that some entities from some "
                "repositories are not synced. That means the standup could rely on incomplete PR and review data. "
                "Because previous syncs and setup tests did not clear the warning, the correct action is to escalate "
                "rather than keep retrying."
            ),
            "recommended_action": "ESCALATE",
            "confidence": "HIGH",
            "confidence_factors": [
                "Persistent partial-sync warning from the live connector status.",
                "High business impact because engineering standup depends on accurate PR activity.",
                "Recent retries did not clear the entities-not-synced warning.",
                "Jira delivery data is healthy, isolating risk to GitHub completeness.",
            ],
        },
        "classification": None,
        "outcome": {
            "actions_taken": [],
            "success": False,
            "connector_status_after": "setup_state: connected, sync_state: scheduled, warnings: [entities_not_synced]",
            "time_elapsed_seconds": 0.0,
            "sla_impact": "at_risk",
        },
        "escalation_message": (
            "Vigil recommends human follow-up on the GitHub connector because the partial-sync warning persisted "
            "after automated checks, leaving the engineering standup exposed to incomplete data."
        ),
        "timestamp": iso(dt(minutes=12)),
    },
    {
        "_id": "trace_dataops_latest",
        "phase": "proactive",
        "connector_id": "mirrored_aboriginal",
        "connector_name": "fivetran_metadata",
        "sla_name": "Data Platform Health",
        "business_impact": "medium",
        "assessment": {
            "risk_level": "RED",
            "reasoning": (
                "The metadata connector tends to need intervention near the daily platform review, and the broader "
                "estate now includes a stale marketing extract plus an at-risk revenue sheet. Vigil launched an early "
                "metadata sync so the data lead has a current control-plane view before triaging the remaining issues."
            ),
            "recommended_action": "EARLY_SYNC",
            "confidence": "MEDIUM",
            "confidence_factors": [
                "Repeated proactive interventions have been needed before the daily health review.",
                "Current 7-day failure rate is 8%, which is elevated but not catastrophic.",
                "The marketing extract remains stale and increases the perceived platform risk.",
                "The metadata sync is currently progressing after intervention.",
            ],
        },
        "classification": None,
        "outcome": {
            "actions_taken": ["sync_connection"],
            "success": True,
            "connector_status_after": "sync_state: syncing; platform metadata refresh underway",
            "time_elapsed_seconds": 92.0,
            "sla_impact": "met",
        },
        "escalation_message": None,
        "timestamp": iso(dt(minutes=10)),
    },
    {
        "_id": "trace_eng_old_fallback",
        "phase": "proactive",
        "connector_id": "rice_glaze",
        "connector_name": "github",
        "sla_name": "Engineering Daily Standup",
        "business_impact": "high",
        "assessment": None,
        "classification": None,
        "outcome": None,
        "escalation_message": "Agent response could not be parsed: ",
        "timestamp": iso(dt(minutes=9)),
    },
]


async def seed() -> None:
    client = AsyncIOMotorClient(settings.mongodb_uri)
    db = client[settings.mongodb_db]

    await db.sla_definitions.drop()
    await db.connector_health.drop()
    await db.incidents.drop()
    await db.reasoning_traces.drop()

    await db.sla_definitions.insert_many(SLAS)
    await db.connector_health.insert_many(HEALTH_RECORDS)
    await db.incidents.insert_many(INCIDENTS)
    await db.reasoning_traces.insert_many(REASONING_TRACES)

    print(f"Seeded {len(SLAS)} SLA definitions")
    print(f"Seeded {len(HEALTH_RECORDS)} connector health snapshots")
    print(f"Seeded {len(INCIDENTS)} incidents")
    print(f"Seeded {len(REASONING_TRACES)} reasoning traces")
    print("Vigil demo data is ready.")

    client.close()


if __name__ == "__main__":
    asyncio.run(seed())
