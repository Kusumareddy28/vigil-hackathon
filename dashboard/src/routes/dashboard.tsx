import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/vigil/AppShell";
import { MetricCard } from "@/components/vigil/MetricCard";
import { DecisionCard } from "@/components/vigil/DecisionCard";
import { AgentActivityFeed } from "@/components/vigil/AgentActivityFeed";
import { CriticalDecisionTimeline } from "@/components/vigil/CriticalDecisionTimeline";
import { RunAgentCheckButton } from "@/components/vigil/RunAgentCheck";
import { decisions, globalStats } from "@/lib/vigil/mock-data";
import { AlertTriangle, CheckCircle2, GaugeCircle, Flame } from "lucide-react";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Decision Command Center — Vigil" },
      { name: "description", content: "Monitor whether critical business decisions are backed by trustworthy data." },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  return (
    <AppShell
      title="Decision Command Center"
      subtitle="Know whether the decisions you're about to make are backed by trustworthy data."
      actions={<RunAgentCheckButton />}
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Critical decisions today"
          value={globalStats.monitored}
          hint="Across executive desks"
          icon={<Flame className="size-4" />}
        />
        <MetricCard
          label="Safe to proceed"
          value={globalStats.monitored - globalStats.atRisk}
          hint="Verified by Vigil this morning"
          icon={<CheckCircle2 className="size-4 text-trusted" />}
        />
        <MetricCard
          label="Require attention"
          value={globalStats.atRisk}
          hint="Awaiting data refresh"
          icon={<AlertTriangle className="size-4 text-risk" />}
        />
        <MetricCard
          label="Organizational confidence"
          value={`${globalStats.avgReadiness}%`}
          hint="Weighted across all monitored decisions"
          icon={<GaugeCircle className="size-4" />}
        />
      </div>

      {/* Bento: decisions + intelligence feed */}
      <div className="mt-8 grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-5">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="font-display text-2xl text-gradient">Active decisions</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Click any decision to inspect its readiness, dependencies, and agent reasoning.
              </p>
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            {decisions.map((d, i) => (
              <DecisionCard key={d.id} decision={d} index={i} />
            ))}
          </div>

          <CriticalDecisionTimeline decisions={decisions} />
        </div>

        <div className="lg:col-span-1">
          <div className="sticky top-6">
            <AgentActivityFeed />
          </div>
        </div>
      </div>
    </AppShell>
  );
}
