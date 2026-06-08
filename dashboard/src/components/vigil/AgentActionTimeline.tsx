import { motion } from "framer-motion";
import { Eye, Scale, Zap, Activity, RefreshCw, CheckCircle2 } from "lucide-react";
import type { AgentEvent } from "@/lib/vigil/types";

const ICONS: Record<string, any> = {
  detect: Eye,
  evaluate: Scale,
  act: Zap,
  monitor: Activity,
  update: RefreshCw,
  recover: CheckCircle2,
};

export function AgentActionTimeline({ events = [] }: { events?: AgentEvent[] }) {
  return (
    <div className="glass rounded-2xl p-6">
      <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Agent action timeline</p>
      <p className="font-display text-lg text-gradient mt-1">What the agent has done</p>

      {events.length === 0 && (
        <p className="mt-4 text-xs text-muted-foreground">No agent actions recorded yet.</p>
      )}
      <ol className="mt-6 relative border-l border-border/80 ml-3">
        {events.map((e, i) => {
          const Icon = ICONS[e.kind] || Activity;
          return (
            <motion.li
              key={i}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="ml-6 pb-6 last:pb-0"
            >
              <span className="absolute -left-3 grid size-6 place-items-center rounded-full bg-surface-elevated ring-1 ring-border">
                <Icon className="size-3 text-ai" />
              </span>
              <div className="flex items-baseline gap-3">
                <p className="font-mono text-[11px] tracking-tight text-muted-foreground">{e.time}</p>
                <p className="text-sm text-foreground">{e.title}</p>
              </div>
              {e.detail && <p className="mt-1 text-xs text-muted-foreground">{e.detail}</p>}
            </motion.li>
          );
        })}
      </ol>
    </div>
  );
}
