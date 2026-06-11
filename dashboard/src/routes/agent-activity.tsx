import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/vigil/AppShell";
import { AgentActivityFeed } from "@/components/vigil/AgentActivityFeed";
import { MetricCard } from "@/components/vigil/MetricCard";
import { apiFetch } from "@/lib/api";
import { Activity, Brain, ShieldCheck, Zap } from "lucide-react";

export const Route = createFileRoute("/agent-activity")({
  component: AgentActivityPage,
});

function AgentActivityPage() {
  const { data: stats } = useQuery({
    queryKey: ["agent-stats"],
    queryFn: async () => {
      const res = await apiFetch("/api/agent-stats");
      if (!res.ok) throw new Error("Failed to fetch stats");
      return res.json();
    },
    refetchInterval: 30000,
  });

  const medianLabel = stats?.medianResponseSeconds
    ? stats.medianResponseSeconds < 60
      ? `${stats.medianResponseSeconds}s`
      : `${(stats.medianResponseSeconds / 60).toFixed(1)}m`
    : "—";

  return (
    <AppShell
      title="Agent Activity"
      subtitle="A live stream of every action Vigil takes to keep your decisions trustworthy."
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Actions in last 24h" value={stats?.actions24h ?? 0} hint="Agent reasoning cycles today" icon={<Activity className="size-4" />} />
        <MetricCard label="Total reasoning cycles" value={stats?.reasoningCycles ?? 0} hint="All-time decision evaluations" icon={<Brain className="size-4 text-ai" />} />
        <MetricCard label="Auto-recoveries" value={stats?.autoRecoveries ?? 0} hint="Without human intervention" icon={<ShieldCheck className="size-4 text-trusted" />} />
        <MetricCard label="Median response" value={medianLabel} hint="From detection to resolution" icon={<Zap className="size-4" />} />
      </div>

      <div className="mt-8 grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <AgentActivityFeed compact={false} />
        </div>
        <div className="lg:col-span-1 glass rounded-2xl p-6 h-fit">
          <p className="text-[10px] uppercase tracking-[0.22em] text-ai">Calm intelligence</p>
          <h3 className="font-display text-xl text-gradient mt-1">How Vigil thinks</h3>
          <ol className="mt-5 space-y-4 text-sm">
            {[
              { n: "01", t: "Senses", d: "Continuously watches source systems for freshness, drift, and anomalies." },
              { n: "02", t: "Reasons", d: "Cross-references the decision dependency graph and incident history." },
              { n: "03", t: "Acts", d: "Triggers refreshes, reroutes, or escalations before a decision is impacted." },
              { n: "04", t: "Reports", d: "Updates readiness and tells you, in plain language, whether to proceed." },
            ].map((s) => (
              <li key={s.n} className="flex gap-4">
                <span className="font-display text-2xl text-gradient leading-none">{s.n}</span>
                <div>
                  <p className="font-medium text-foreground/90">{s.t}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{s.d}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </AppShell>
  );
}
