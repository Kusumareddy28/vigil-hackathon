import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Activity, Brain, CheckCircle2, Eye, Sparkles, Wrench } from "lucide-react";
import type { AgentFeedEvent } from "@/lib/vigil/types";
import { agentFeed } from "@/lib/vigil/mock-data";

const kindMeta: Record<AgentFeedEvent["kind"], { icon: typeof Brain; tone: string; label: string }> = {
  detect:   { icon: Eye,          tone: "text-risk",     label: "Detected" },
  evaluate: { icon: Brain,        tone: "text-ai",       label: "Evaluating" },
  act:      { icon: Wrench,       tone: "text-foreground", label: "Acting" },
  monitor:  { icon: Activity,     tone: "text-muted-foreground", label: "Monitoring" },
  update:   { icon: Sparkles,     tone: "text-trusted",  label: "Updated" },
  recover:  { icon: CheckCircle2, tone: "text-trusted",  label: "Recovered" },
};

function nowLabel() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

const drips: Omit<AgentFeedEvent, "id" | "time">[] = [
  { kind: "monitor", title: "Heartbeat across 14 connectors", detail: "All within latency tolerance." },
  { kind: "evaluate", title: "Re-scoring Q4 Hiring Budget", detail: "Awaiting Anaplan forecast.", decision: "Q4 Hiring Budget" },
  { kind: "detect", title: "Latency uptick on Workday", detail: "Tracking — below alert threshold." },
  { kind: "act", title: "Pre-warmed attribution model", detail: "Cached weekly marketing inputs." },
  { kind: "update", title: "Readiness rebalanced", detail: "Board Revenue Review held at 92%.", decision: "Board Revenue Review" },
];

export function AgentActivityFeed({ compact = false }: { compact?: boolean }) {
  const [events, setEvents] = useState<AgentFeedEvent[]>(() => [...agentFeed].reverse());

  useEffect(() => {
    let i = 0;
    const id = setInterval(() => {
      const next = drips[i % drips.length];
      i += 1;
      setEvents((prev) => [
        { ...next, id: `live-${Date.now()}-${i}`, time: nowLabel() },
        ...prev,
      ].slice(0, 30));
    }, 4500);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="glass rounded-2xl p-6 h-full flex flex-col">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.22em] text-ai">Vigil Intelligence</p>
          <h3 className="font-display text-xl text-gradient mt-1">Agent activity</h3>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="relative flex size-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-trusted/60" />
            <span className="relative inline-flex size-2 rounded-full bg-trusted" />
          </span>
          Live
        </div>
      </div>

      <div className={`relative mt-5 flex-1 ${compact ? "max-h-[420px]" : "max-h-[560px]"} overflow-hidden`}>
        <div className="absolute left-[15px] top-1 bottom-1 w-px bg-gradient-to-b from-border via-border/70 to-transparent" />
        <ul className="relative space-y-4 pr-1 overflow-y-auto h-full scroll-fade">
          <AnimatePresence initial={false}>
            {events.map((e) => {
              const meta = kindMeta[e.kind];
              const Icon = meta.icon;
              return (
                <motion.li
                  key={e.id}
                  layout
                  initial={{ opacity: 0, y: -8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                  className="relative pl-10"
                >
                  <span className="absolute left-0 top-1 grid size-8 place-items-center rounded-full bg-background ring-1 ring-border">
                    <Icon className={`size-3.5 ${meta.tone}`} />
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground/80">
                      {e.time}
                    </span>
                    <span className={`text-[10px] uppercase tracking-[0.18em] ${meta.tone}`}>
                      {meta.label}
                    </span>
                  </div>
                  <p className="mt-0.5 text-sm text-foreground/90 leading-snug">{e.title}</p>
                  {e.detail && (
                    <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">{e.detail}</p>
                  )}
                  {e.decision && (
                    <p className="mt-1 inline-flex items-center gap-1 rounded-full border border-border/60 bg-surface/60 px-2 py-0.5 text-[10px] text-muted-foreground">
                      {e.decision}
                    </p>
                  )}
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ul>
      </div>
    </div>
  );
}
