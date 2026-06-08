import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/vigil/AppShell";
import { ReadinessGauge } from "@/components/vigil/ReadinessGauge";
import { DependencyGraph } from "@/components/vigil/DependencyGraph";
import { AgentReasoningTrace } from "@/components/vigil/AgentReasoningTrace";
import { AgentActionTimeline } from "@/components/vigil/AgentActionTimeline";
import { StatusBadge } from "@/components/vigil/StatusBadge";
import { ConfidenceDrivers } from "@/components/vigil/ConfidenceDrivers";
import { Countdown } from "@/components/vigil/Countdown";
import { RunAgentCheckButton } from "@/components/vigil/RunAgentCheck";
import type { Decision } from "@/lib/vigil/types";
import { ArrowLeft, User, Flame, Sparkles, AlertTriangle, RotateCcw } from "lucide-react";

export const Route = createFileRoute("/decisions/$id")({
  component: DecisionDetailPage,
});

function DecisionDetailPage() {
  const { id } = Route.useParams();
  const [running, setRunning] = useState(false);

  const { data: decision, isLoading, refetch } = useQuery({
    queryKey: ["decision", id],
    queryFn: async () => {
      const res = await fetch(`/api/decisions/${id}`);
      if (!res.ok) throw new Error("Decision not found");
      return res.json() as Promise<Decision>;
    },
    refetchInterval: 15000,
  });

  const runAgentCheck = async () => {
    setRunning(true);
    try {
      await fetch("/api/run-check", { method: "POST" });
      setTimeout(() => {
        refetch();
        setRunning(false);
      }, 3000);
    } catch {
      setRunning(false);
    }
  };

  if (isLoading || !decision) {
    return (
      <AppShell title="Loading...">
        <div className="animate-pulse space-y-4">
          <div className="h-48 bg-surface/40 rounded-2xl" />
          <div className="h-64 bg-surface/40 rounded-2xl" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      title={decision.title}
      subtitle={decision.summary}
      actions={
        <div className="flex gap-2">
          <button
            onClick={runAgentCheck}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface/60 px-3 py-2 text-sm hover:bg-accent/60 transition"
          >
            <RotateCcw className={`size-3.5 ${running ? "animate-spin" : ""}`} /> Re-check
          </button>
          <RunAgentCheckButton />
        </div>
      }
    >
      <Link to="/dashboard" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="size-3" /> Back to command center
      </Link>

      {/* Header block */}
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="glass rounded-2xl p-6 lg:col-span-1 flex flex-col items-center justify-center gap-4">
          <ReadinessGauge value={decision.readiness} />
          <p className="text-center text-xs text-muted-foreground italic max-w-[18rem] leading-relaxed">
            {decision.confidenceSummary}
          </p>
        </div>

        <div className="glass rounded-2xl p-6 lg:col-span-2 grid gap-5 sm:grid-cols-2">
          <Field icon={<User className="size-3" />} label="Stakeholder" value={`${decision.stakeholder} · ${decision.stakeholderRole}`} />
          <div>
            <Label icon={<Sparkles className="size-3 text-ai" />}>Decision window</Label>
            <div className="mt-1.5"><Countdown deadline={decision.deadline} /></div>
          </div>
          <Field icon={<Flame className="size-3" />} label="Business criticality" value={decision.criticality.toUpperCase()} />
          <div>
            <Label icon={<Sparkles className="size-3 text-ai" />}>Status</Label>
            <div className="mt-1.5"><StatusBadge status={decision.status} /></div>
          </div>
          <div className="sm:col-span-2 rounded-xl border border-ai/20 bg-ai/5 p-4">
            <p className="text-[10px] uppercase tracking-[0.22em] text-ai">AI Recommendation</p>
            <p className="mt-1.5 text-sm italic text-foreground/90">"{decision.recommendation}"</p>
          </div>
        </div>
      </div>

      {/* Confidence drivers */}
      {decision.confidenceDrivers && decision.confidenceDrivers.length > 0 && (
        <div className="mt-5">
          <ConfidenceDrivers drivers={decision.confidenceDrivers} />
        </div>
      )}

      {/* Graph + dependencies */}
      <div className="mt-5 grid gap-5 lg:grid-cols-5">
        <div className="glass rounded-2xl p-6 lg:col-span-3">
          <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Dependency graph</p>
          <p className="font-display text-lg text-gradient mt-1">What this decision depends on</p>
          <div className="mt-4">
            <DependencyGraph decision={decision} />
          </div>
        </div>

        <div className="glass rounded-2xl p-6 lg:col-span-2">
          <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Data freshness breakdown</p>
          <p className="font-display text-lg text-gradient mt-1">Per-source health</p>
          <ul className="mt-4 divide-y divide-border/60">
            {decision.dependencies.map((d: any) => (
              <li key={d.id} className="py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm">{d.name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {d.source} · synced {d.lastSync}
                    {d.notes ? ` · ${d.notes}` : ""}
                  </p>
                </div>
                <StatusBadge status={d.status} />
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Reasoning + timeline */}
      <div className="mt-5 grid gap-5 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <AgentReasoningTrace trace={decision.reasoning} running={running} />
        </div>
        <div className="lg:col-span-2">
          <AgentActionTimeline events={decision.timeline} />
        </div>
      </div>
    </AppShell>
  );
}

function Field({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div>
      <Label icon={icon}>{label}</Label>
      <p className="mt-1.5 text-sm">{value}</p>
    </div>
  );
}

function Label({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground flex items-center gap-1.5">
      {icon} {children}
    </p>
  );
}
