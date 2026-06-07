import type { Decision, Incident, AgentFeedEvent } from "./types";

// Anchor "now" to a stable demo time so countdowns stay meaningful.
// 45 minutes before the Board Revenue Review.
const now = new Date();
const minutesFromNow = (m: number) => new Date(now.getTime() + m * 60_000).toISOString();
const hoursFromNow = (h: number) => new Date(now.getTime() + h * 60 * 60_000).toISOString();

export const decisions: Decision[] = [
  {
    id: "board-revenue-review",
    title: "Board Revenue Review",
    stakeholder: "Marisa Chen",
    stakeholderRole: "CFO",
    deadline: minutesFromNow(42),
    deadlineLabel: "Today, 9:00 AM",
    criticality: "critical",
    readiness: 92,
    status: "ready_with_caution",
    summary:
      "Quarterly board review of revenue performance, pipeline health, and forward forecast.",
    recommendation:
      "Safe to proceed. Hold any budget-expansion decisions until the forecast pipeline refresh completes.",
    confidenceSummary:
      "Proceed with caution. Forecast freshness introduces moderate uncertainty in forward guidance.",
    confidenceDrivers: [
      { polarity: "positive", label: "Revenue pipelines refreshed successfully", detail: "Salesforce + Stripe verified 12 minutes ago." },
      { polarity: "positive", label: "Payment systems verified", detail: "All settlement feeds reconciling within tolerance." },
      { polarity: "negative", label: "Forecast models require refresh", detail: "Last successful sync was 7 hours ago." },
      { polarity: "negative", label: "Historical instability detected", detail: "Forecast connector fails 3.2× more often on weekends." },
    ],
    dependencies: [
      {
        id: "sf-rev",
        name: "Revenue Pipeline",
        source: "Salesforce",
        status: "fresh",
        lastSync: "8:12 AM",
        freshnessLabel: "Updated 12 minutes ago",
        latencyMs: 412,
      },
      {
        id: "stripe-pay",
        name: "Payment Systems",
        source: "Stripe",
        status: "fresh",
        lastSync: "8:09 AM",
        freshnessLabel: "Updated 4 minutes ago",
        latencyMs: 318,
      },
      {
        id: "forecast",
        name: "Forecast Intelligence",
        source: "Internal ML pipeline",
        status: "at_risk",
        lastSync: "1:22 AM",
        freshnessLabel: "Last updated 7 hours ago",
        notes: "Recovering — early sync triggered",
      },
    ],
    reasoning: {
      facts: [
        "Board review in 45 minutes",
        "Revenue data fresh as of 8:12 AM",
        "Forecast pipeline last synced 7 hours ago",
        "Only one sync window remains before the meeting",
        "Prior incidents show the forecast connector fails more often on weekends",
      ],
      reasoning:
        "Revenue data is trustworthy, but the forecast model introduces medium decision risk. Since the board review depends primarily on revenue numbers and secondarily on forecast projections, the meeting can proceed, but budget-expansion decisions should wait until the forecast refresh completes.",
      decision: {
        readiness: 92,
        recommendation: "Proceed with caution",
        action: "Trigger early sync for forecast pipeline",
      },
    },
    timeline: [
      { time: "8:13 AM", title: "Detected forecast staleness", kind: "detect", detail: "Forecast last sync exceeded 6h threshold." },
      { time: "8:14 AM", title: "Evaluated board meeting impact", kind: "evaluate", detail: "Cross-referenced decision dependency graph." },
      { time: "8:15 AM", title: "Triggered early sync", kind: "act", detail: "Initiated priority refresh on forecast pipeline." },
      { time: "8:16 AM", title: "Monitoring recovery", kind: "monitor", detail: "Sync progress 62% • ETA 4 min." },
      { time: "8:17 AM", title: "Recommendation updated", kind: "update", detail: "Readiness raised from 78% → 92%." },
    ],
  },
  {
    id: "q4-hiring-budget",
    title: "Q4 Hiring Budget Approval",
    stakeholder: "David Okafor",
    stakeholderRole: "COO",
    deadline: hoursFromNow(2) ,
    deadlineLabel: "Today, 2:00 PM",
    criticality: "high",
    readiness: 68,
    status: "at_risk",
    summary:
      "Headcount and budget approval across engineering, GTM, and operations for Q4.",
    recommendation:
      "Wait for finance forecast refresh before approving net-new headcount.",
    confidenceSummary:
      "Defer if possible. Forecast instability may impact hiring decisions and Q4 margin guidance.",
    confidenceDrivers: [
      { polarity: "positive", label: "Workforce planning verified", detail: "Workday roster reconciled with payroll." },
      { polarity: "positive", label: "Headcount dashboard current", detail: "Live as of 8:01 AM." },
      { polarity: "negative", label: "Finance forecast stale", detail: "Anaplan model has not synced in 14 hours." },
      { polarity: "negative", label: "Margin guidance unverified", detail: "Cannot confirm Q4 spend envelope without fresh forecast." },
    ],
    dependencies: [
      { id: "workforce", name: "Workforce Planning", source: "Workday", status: "fresh", lastSync: "7:45 AM", freshnessLabel: "Updated 39 minutes ago" },
      { id: "fin-forecast", name: "Finance Forecast", source: "Anaplan", status: "stale", lastSync: "Yesterday, 6:00 PM", freshnessLabel: "Last updated 14 hours ago" },
      { id: "headcount", name: "Headcount Dashboard", source: "Internal warehouse", status: "fresh", lastSync: "8:01 AM", freshnessLabel: "Updated 23 minutes ago" },
    ],
    reasoning: {
      facts: [
        "Finance forecast has not synced in 14 hours",
        "Workforce planning data is current",
        "Decision depends on margin guidance from finance forecast",
      ],
      reasoning:
        "Headcount data is trustworthy, but stale finance forecast creates material risk to margin assumptions. Approving net-new headcount without a fresh forecast could overcommit Q4 spend.",
      decision: {
        readiness: 68,
        recommendation: "Defer until forecast refresh",
        action: "Notify finance ops to prioritize Anaplan sync",
      },
    },
    timeline: [
      { time: "7:02 AM", title: "Detected stale finance forecast", kind: "detect" },
      { time: "7:05 AM", title: "Notified finance ops on-call", kind: "act" },
      { time: "7:30 AM", title: "Lowered readiness to 68%", kind: "update" },
    ],
  },
  {
    id: "weekly-marketing-spend",
    title: "Weekly Marketing Spend Review",
    stakeholder: "Priya Anand",
    stakeholderRole: "VP Marketing",
    deadline: hoursFromNow(25),
    deadlineLabel: "Tomorrow, 10:00 AM",
    criticality: "medium",
    readiness: 98,
    status: "ready",
    summary: "Channel-level marketing spend reallocation across paid, lifecycle, and partnerships.",
    recommendation: "All systems green. Proceed with confidence.",
    confidenceSummary:
      "Data is sufficient for executive review. All channels reconciled within expected variance.",
    confidenceDrivers: [
      { polarity: "positive", label: "All channel sources fresh", detail: "Google Ads, HubSpot, and attribution synced this hour." },
      { polarity: "positive", label: "Attribution model converged", detail: "Within 0.4% of last week's baseline." },
      { polarity: "positive", label: "No anomalies in last 24h", detail: "Zero alerts across marketing surface." },
    ],
    dependencies: [
      { id: "google-ads", name: "Paid Acquisition", source: "Google Ads", status: "fresh", lastSync: "8:20 AM", freshnessLabel: "Updated 4 minutes ago" },
      { id: "hubspot", name: "Lifecycle Pipeline", source: "HubSpot", status: "fresh", lastSync: "8:18 AM", freshnessLabel: "Updated 6 minutes ago" },
      { id: "attribution", name: "Attribution Intelligence", source: "Internal model", status: "fresh", lastSync: "8:00 AM", freshnessLabel: "Updated 24 minutes ago" },
    ],
    reasoning: {
      facts: ["All connectors green", "Attribution model converged", "No anomalies detected in last 24h"],
      reasoning:
        "All marketing data sources are fresh and consistent. Attribution model results are within expected variance.",
      decision: {
        readiness: 98,
        recommendation: "Proceed",
        action: "No action required",
      },
    },
    timeline: [
      { time: "8:21 AM", title: "Routine health check passed", kind: "monitor" },
      { time: "8:22 AM", title: "Readiness confirmed at 98%", kind: "update" },
    ],
  },
];

export const incidents: Incident[] = [
  {
    id: "inc-001",
    title: "Forecast connector stale",
    affectedDecision: "Board Revenue Review",
    severity: "high",
    detectedAt: "8:13 AM",
    agentAction: "Triggered early sync, raised readiness back to 92%",
    outcome: "recovered",
    humanIntervention: false,
  },
  {
    id: "inc-002",
    title: "Salesforce schema drift",
    affectedDecision: "Pipeline forecasting",
    severity: "medium",
    detectedAt: "Yesterday, 4:42 PM",
    agentAction: "Mapped new fields, notified data engineering",
    outcome: "recovered",
    humanIntervention: false,
  },
  {
    id: "inc-003",
    title: "Stripe sync delayed",
    affectedDecision: "Board Revenue Review",
    severity: "low",
    detectedAt: "Yesterday, 11:08 AM",
    agentAction: "Backfilled after window cleared",
    outcome: "recovered",
    humanIntervention: false,
  },
  {
    id: "inc-004",
    title: "Auth expired on HubSpot",
    affectedDecision: "Weekly Marketing Spend Review",
    severity: "critical",
    detectedAt: "2 days ago, 9:30 PM",
    agentAction: "Failover to cached credentials, paged on-call",
    outcome: "human_intervention",
    humanIntervention: true,
  },
];

export const globalStats = {
  monitored: 3,
  atRisk: 1,
  recoveries: 2,
  avgReadiness: 86,
};

export const agentFeed: AgentFeedEvent[] = [
  { id: "f1", time: "08:42 AM", kind: "detect", title: "Detected forecast staleness", detail: "Forecast pipeline exceeded 6h freshness threshold.", decision: "Board Revenue Review" },
  { id: "f2", time: "08:43 AM", kind: "evaluate", title: "Evaluating impact on Board Revenue Review", detail: "Tracing 14 downstream dependencies." },
  { id: "f3", time: "08:44 AM", kind: "evaluate", title: "Historical pattern indicates weekend instability", detail: "Forecast connector fails 3.2× more often on weekends." },
  { id: "f4", time: "08:45 AM", kind: "act", title: "Triggered proactive forecast refresh", detail: "Priority sync queued ahead of board meeting." },
  { id: "f5", time: "08:46 AM", kind: "update", title: "Decision confidence increased to 92%", detail: "Board Revenue Review now ready with caution.", decision: "Board Revenue Review" },
  { id: "f6", time: "08:47 AM", kind: "monitor", title: "Watching Anaplan forecast recovery", detail: "Q4 Hiring Budget remains at 68%.", decision: "Q4 Hiring Budget" },
  { id: "f7", time: "08:49 AM", kind: "detect", title: "Anomaly cleared on Stripe settlement", detail: "Reconciliation back within tolerance." },
  { id: "f8", time: "08:51 AM", kind: "recover", title: "Marketing attribution converged", detail: "Variance < 0.4% — no action required." },
];
