import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/vigil/AppShell";
import { MetricCard } from "@/components/vigil/MetricCard";
import { DecisionCard } from "@/components/vigil/DecisionCard";
import { AgentActivityFeed } from "@/components/vigil/AgentActivityFeed";
import { CriticalDecisionTimeline } from "@/components/vigil/CriticalDecisionTimeline";
import { RunAgentCheckButton } from "@/components/vigil/RunAgentCheck";
import { AlertTriangle, CheckCircle2, GaugeCircle, Flame } from "lucide-react";

export const Route = createFileRoute("/dashboard")({
  component: DashboardPage,
});

function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["decisions"],
    queryFn: async () => {
      const res = await fetch("/api/decisions");
      if (!res.ok) throw new Error("Failed to fetch decisions");
      return res.json();
    },
    refetchInterval: 30000,
  });

  const decisions = data?.decisions ?? [];
  const stats = data?.stats ?? { monitored: 0, atRisk: 0, recoveries: 0, avgReadiness: 0 };

  if (isLoading) {
    return (
      <AppShell title="Decision Command Center" subtitle="Loading...">
        <div className="animate-pulse space-y-4">
          <div className="h-24 bg-surface/40 rounded-2xl" />
          <div className="h-64 bg-surface/40 rounded-2xl" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Decision Command Center"
      subtitle="Know whether the decisions you're about to make are backed by trustworthy data."
      actions={<RunAgentCheckButton />}
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Critical decisions today"
          value={stats.monitored}
          hint="Across executive desks"
          icon={<Flame className="size-4" />}
        />
        <MetricCard
          label="Safe to proceed"
          value={stats.monitored - stats.atRisk}
          hint="Verified by Vigil this morning"
          icon={<CheckCircle2 className="size-4 text-trusted" />}
        />
        <MetricCard
          label="Require attention"
          value={stats.atRisk}
          hint="Awaiting data refresh"
          icon={<AlertTriangle className="size-4 text-risk" />}
        />
        <MetricCard
          label="Organizational confidence"
          value={`${stats.avgReadiness}%`}
          hint="Weighted across all monitored decisions"
          icon={<GaugeCircle className="size-4" />}
        />
      </div>

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
            {decisions.map((d: any, i: number) => {
              const isLastOddCard = decisions.length % 2 === 1 && i === decisions.length - 1;
              return (
                <div key={d.id} className={isLastOddCard ? "md:col-span-2" : undefined}>
                  <DecisionCard decision={d} index={i} />
                </div>
              );
            })}
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
