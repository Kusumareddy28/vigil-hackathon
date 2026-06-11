import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, Bot, CheckCircle2, Clock3, Database, FileWarning, Wrench } from "lucide-react";
import type { DecisionAudit } from "@/lib/vigil/types";

const toneClass: Record<string, string> = {
  positive: "border-trusted/30 bg-trusted/8 text-trusted",
  negative: "border-risk/30 bg-risk/8 text-risk",
  neutral: "border-border/70 bg-surface/40 text-foreground/80",
};

const outcomeMeta = {
  completed: { icon: CheckCircle2, label: "Completed", tone: "text-trusted" },
  monitoring: { icon: Clock3, label: "Monitoring", tone: "text-ai" },
  escalated: { icon: AlertTriangle, label: "Escalated", tone: "text-risk" },
};

export function DecisionAuditTrail({ audit }: { audit: DecisionAudit }) {
  const outcome = outcomeMeta[audit.outcomeStatus];
  const OutcomeIcon = outcome.icon;

  return (
    <div className="glass rounded-2xl p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.22em] text-ai">Decision audit trail</p>
          <h3 className="mt-1 font-display text-xl text-gradient">Why Vigil made this call</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Latest reviewed run: {audit.generatedAt}
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-surface/50 px-3 py-1.5 text-xs">
          <OutcomeIcon className={`size-3.5 ${outcome.tone}`} />
          <span>{outcome.label}</span>
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-ai/20 bg-ai/5 p-4">
        <p className="text-[10px] uppercase tracking-[0.22em] text-ai">Final recommendation</p>
        <p className="mt-2 text-sm leading-relaxed text-foreground/90">{audit.finalRecommendation}</p>
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <Panel icon={<Database className="size-4 text-ai" />} label="Deterministic facts" title="Hard evidence">
          <FactGrid facts={audit.deterministicFacts} />
        </Panel>

        <Panel icon={<Database className="size-4 text-ai" />} label="Dependency snapshots" title="Source state">
          <FactGrid facts={audit.dependencySnapshots} />
        </Panel>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Panel icon={<Bot className="size-4 text-ai" />} label="Model judgment" title="Agent interpretation">
          <dl className="space-y-3 text-sm">
            <div className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-surface/40 px-4 py-3">
              <dt className="text-muted-foreground">Risk level</dt>
              <dd>{audit.modelJudgment.riskLevel || "Not recorded"}</dd>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-surface/40 px-4 py-3">
              <dt className="text-muted-foreground">Confidence</dt>
              <dd>{audit.modelJudgment.confidence || "Not recorded"}</dd>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-surface/40 px-4 py-3">
              <dt className="text-muted-foreground">Recommended action</dt>
              <dd>{audit.modelJudgment.recommendedAction || "Not recorded"}</dd>
            </div>
          </dl>
          {audit.modelJudgment.reasoning && (
            <p className="mt-4 border-l-2 border-ai/40 pl-4 text-sm italic leading-relaxed text-foreground/90">
              "{audit.modelJudgment.reasoning}"
            </p>
          )}
          {audit.modelJudgment.confidenceFactors.length > 0 && (
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              {audit.modelJudgment.confidenceFactors.map((factor) => (
                <li key={factor} className="flex gap-2">
                  <span className="mt-1 size-1.5 rounded-full bg-ai/70 shrink-0" />
                  <span>{factor}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel icon={<Wrench className="size-4 text-ai" />} label="Actions" title="What Vigil did">
          {audit.actionsTaken.length === 0 ? (
            <p className="text-sm text-muted-foreground">No explicit action was recorded for the latest informative run.</p>
          ) : (
            <ul className="space-y-3">
              {audit.actionsTaken.map((action) => (
                <li key={`${action.label}-${action.detail || ""}`} className="rounded-xl border border-border/60 bg-surface/40 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm text-foreground/90">{action.label}</p>
                    <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{action.status}</span>
                  </div>
                  {action.detail && <p className="mt-1 text-xs text-muted-foreground">{action.detail}</p>}
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1.4fr_0.8fr]">
        <Panel icon={<Clock3 className="size-4 text-ai" />} label="Evidence trail" title="What informed the run">
          <ol className="space-y-3">
            {audit.evidenceTrail.map((item, index) => (
              <motion.li
                key={`${item.title}-${index}`}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04 }}
                className="rounded-xl border border-border/60 bg-surface/40 px-4 py-3"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm text-foreground/90">{item.title}</p>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{item.detail}</p>
                  </div>
                  {item.time && <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{item.time}</span>}
                </div>
              </motion.li>
            ))}
          </ol>
        </Panel>

        <Panel icon={<FileWarning className="size-4 text-ai" />} label="Run notes" title="Caveats and gaps">
          {audit.notes.length === 0 ? (
            <p className="text-sm text-muted-foreground">No caveats were recorded for this run.</p>
          ) : (
            <ul className="space-y-3">
              {audit.notes.map((note) => (
                <li key={note} className="rounded-xl border border-border/60 bg-surface/40 px-4 py-3 text-sm text-muted-foreground">
                  {note}
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}

function Panel({
  icon,
  label,
  title,
  children,
}: {
  icon: ReactNode;
  label: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border/60 bg-background/25 p-5">
      <div className="flex items-center gap-2">
        <div className="grid size-8 place-items-center rounded-lg bg-ai/15 ring-1 ring-ai/25">{icon}</div>
        <div>
          <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">{label}</p>
          <p className="font-display text-lg text-gradient">{title}</p>
        </div>
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function FactGrid({ facts }: { facts: DecisionAudit["deterministicFacts"] }) {
  if (facts.length === 0) {
    return <p className="text-sm text-muted-foreground">No structured facts were recorded for this run.</p>;
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {facts.map((fact) => (
        <div
          key={`${fact.label}-${fact.value}`}
          className={`rounded-xl border px-4 py-3 ${toneClass[fact.tone || "neutral"]}`}
        >
          <p className="text-[10px] uppercase tracking-[0.18em] opacity-80">{fact.label}</p>
          <p className="mt-1 text-sm leading-relaxed">{fact.value}</p>
        </div>
      ))}
    </div>
  );
}
