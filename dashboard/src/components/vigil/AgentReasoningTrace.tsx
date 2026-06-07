import { motion } from "framer-motion";
import { Brain, Sparkles, CheckCircle2, Zap } from "lucide-react";
import type { ReasoningTrace } from "@/lib/vigil/types";

export function AgentReasoningTrace({ trace, running }: { trace: ReasoningTrace; running?: boolean }) {
  return (
    <div className="glass rounded-2xl p-6 relative overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-ai/60 to-transparent" />
      <div className="flex items-center gap-2">
        <div className="grid size-8 place-items-center rounded-lg bg-ai/15 ring-1 ring-ai/30">
          <Brain className="size-4 text-ai" />
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Agent reasoning</p>
          <p className="font-display text-lg text-gradient leading-tight">Gemini · live trace</p>
        </div>
        {running && (
          <span className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-ai/30 bg-ai/10 px-2 py-1 text-[10px] uppercase tracking-widest text-ai">
            <span className="size-1.5 animate-pulse rounded-full bg-ai" /> Thinking
          </span>
        )}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div>
          <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-3">Facts</p>
          <ul className="space-y-2">
            {trace.facts.map((f, i) => (
              <motion.li
                key={i}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06 }}
                className="flex gap-2 text-sm text-muted-foreground"
              >
                <span className="mt-1.5 size-1 rounded-full bg-foreground/40 shrink-0" />
                <span>{f}</span>
              </motion.li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-3 flex items-center gap-1.5">
            <Sparkles className="size-3 text-ai" /> Reasoning
          </p>
          <motion.p
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
            className="text-sm leading-relaxed text-foreground/90 italic border-l-2 border-ai/40 pl-4"
          >
            “{trace.reasoning}”
          </motion.p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 rounded-xl border border-border bg-surface/40 p-4 sm:grid-cols-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Readiness</p>
          <p className="font-display text-2xl text-gradient">{trace.decision.readiness}%</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground flex items-center gap-1">
            <CheckCircle2 className="size-3 text-trusted" /> Recommendation
          </p>
          <p className="mt-1 text-sm">{trace.decision.recommendation}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground flex items-center gap-1">
            <Zap className="size-3 text-ai" /> Action
          </p>
          <p className="mt-1 text-sm">{trace.decision.action}</p>
        </div>
      </div>
    </div>
  );
}
