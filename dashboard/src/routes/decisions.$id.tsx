import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { AppShell } from "@/components/vigil/AppShell";
import { ReadinessGauge } from "@/components/vigil/ReadinessGauge";
import { DependencyGraph } from "@/components/vigil/DependencyGraph";
import { AgentReasoningTrace } from "@/components/vigil/AgentReasoningTrace";
import { AgentActionTimeline } from "@/components/vigil/AgentActionTimeline";
import { StatusBadge } from "@/components/vigil/StatusBadge";
import { ConfidenceDrivers } from "@/components/vigil/ConfidenceDrivers";
import { Countdown } from "@/components/vigil/Countdown";
import { RunAgentCheckButton } from "@/components/vigil/RunAgentCheck";
import { decisions as mockDecisions } from "@/lib/vigil/mock-data";
import type { Decision } from "@/lib/vigil/types";
import { ArrowLeft, User, Flame, Sparkles, AlertTriangle, RotateCcw } from "lucide-react";

export const Route = createFileRoute("/decisions/$id")({
  loader: ({ params }) => {
    const d = mockDecisions.find((x) => x.id === params.id);
    if (!d) throw notFound();
    return { decision: d };
  },
  notFoundComponent: () => (
    <AppShell title="Decision not found">
      <Link to="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">← Back to dashboard</Link>
    </AppShell>
  ),
  errorComponent: ({ error, reset }) => (
    <AppShell title="Something went wrong">
      <p className="text-sm text-muted-foreground">{error.message}</p>
      <button onClick={reset} className="mt-4 rounded-lg border border-border px-3 py-1.5 text-sm">Retry</button>
    </AppShell>
  ),
  component: DecisionDetailPage,
});

function DecisionDetailPage() {
  const { decision: base } = Route.useLoaderData();
  const [decision, setDecision] = useState<Decision>(base);
  const [running, setRunning] = useState(false);

  // Reset state if id changes
  useEffect(() => setDecision(base), [base]);

  const runAgentCheck = () => {
    setRunning(true);
    setTimeout(() => setRunning(false), 1800);
  };

  const simulateFailure = () => {
    const next: Decision = JSON.parse(JSON.stringify(decision));
    const target = next.dependencies.find((d) => d.status === "fresh") ?? next.dependencies[0];
    target.status = "stale";
    target.notes = "Simulated staleness detected by agent";
    next.readiness = Math.max(38, decision.readiness - 32);
    next.status = next.readiness >= 75 ? "ready_with_caution" : next.readiness >= 50 ? "at_risk" : "blocked";
    next.recommendation = `Pause until ${target.name} refreshes.`;
    next.reasoning = {
      facts: [
        `${target.name} unexpectedly went stale`,
        `Decision deadline is ${decision.deadlineLabel}`,
        "Agent detected anomaly within 4 seconds",
        "Backup source unavailable in this sync window",
      ],
      reasoning: `Simulated failure in ${target.name}. The decision now lacks a verified primary source. Recommend pausing approval until refresh completes.`,
      decision: {
        readiness: next.readiness,
        recommendation: next.recommendation,
        action: `Trigger emergency sync on ${target.name}`,
      },
    };
    const now = new Date();
    const t = now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    next.timeline = [
      { time: t, title: `Detected ${target.name} staleness`, kind: "detect", detail: "Anomaly score 0.94 · above threshold." },
      { time: t, title: "Evaluated decision impact", kind: "evaluate", detail: "Cross-referenced decision dependency graph." },
      { time: t, title: `Triggered emergency sync on ${target.name}`, kind: "act" },
      { time: t, title: "Monitoring recovery", kind: "monitor", detail: "Sync 18% · ETA 6 min." },
      { time: t, title: "Readiness updated", kind: "update", detail: `Lowered to ${next.readiness}%.` },
    ];
    setDecision(next);
    runAgentCheck();
  };

  return (
    <AppShell
      title={decision.title}
      subtitle={decision.summary}
      actions={
        <div className="flex gap-2">
          <button
            onClick={() => setDecision(base)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface/60 px-3 py-2 text-sm hover:bg-accent/60 transition"
          >
            <RotateCcw className="size-3.5" /> Reset
          </button>
          <button
            onClick={simulateFailure}
            className="inline-flex items-center gap-1.5 rounded-lg border border-risk/40 bg-risk/10 px-3 py-2 text-sm text-risk hover:bg-risk/20 transition"
          >
            <AlertTriangle className="size-3.5" /> Simulate Failure
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
      <div className="mt-5">
        <ConfidenceDrivers drivers={decision.confidenceDrivers} />
      </div>

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
            {decision.dependencies.map((d) => (
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
