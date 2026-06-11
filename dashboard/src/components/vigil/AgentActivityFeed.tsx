import { AnimatePresence, motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { Activity, Brain, CheckCircle2, Eye, Sparkles, Wrench } from "lucide-react";
import { apiFetch } from "@/lib/api";
import type { AgentFeedEvent } from "@/lib/vigil/types";
import { useSSE } from "@/hooks/useSSE";

const kindMeta: Record<AgentFeedEvent["kind"], { icon: typeof Brain; tone: string; label: string }> = {
  detect:   { icon: Eye,          tone: "text-risk",     label: "Detected" },
  evaluate: { icon: Brain,        tone: "text-ai",       label: "Evaluating" },
  act:      { icon: Wrench,       tone: "text-foreground", label: "Acting" },
  monitor:  { icon: Activity,     tone: "text-muted-foreground", label: "Monitoring" },
  update:   { icon: Sparkles,     tone: "text-trusted",  label: "Updated" },
  recover:  { icon: CheckCircle2, tone: "text-trusted",  label: "Recovered" },
};

export function AgentActivityFeed({ compact = false }: { compact?: boolean }) {
  const { events: liveEvents, connected } = useSSE(30);
  const { data } = useQuery<{ events: AgentFeedEvent[] }>({
    queryKey: ["agent-activity-history"],
    queryFn: async () => {
      const res = await apiFetch("/api/agent-activity-history");
      if (!res.ok) throw new Error("Failed to fetch agent activity history");
      return res.json();
    },
    staleTime: 30000,
  });

  const historyEvents = data?.events ?? [];
  const seen = new Set<string>();
  const events = [...liveEvents, ...historyEvents].filter((event) => {
    if (seen.has(event.id)) return false;
    seen.add(event.id);
    return true;
  }).slice(0, 30);

  return (
    <div className="glass rounded-2xl p-6 h-full flex flex-col">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.22em] text-ai">Vigil Intelligence</p>
          <h3 className="font-display text-xl text-gradient mt-1">Agent activity</h3>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="relative flex size-2">
            <span className={`absolute inline-flex h-full w-full animate-ping rounded-full ${connected ? "bg-trusted/60" : "bg-risk/60"}`} />
            <span className={`relative inline-flex size-2 rounded-full ${connected ? "bg-trusted" : "bg-risk"}`} />
          </span>
          {connected ? "Live" : "Connecting..."}
        </div>
      </div>

      <div className={`relative mt-5 flex-1 ${compact ? "max-h-[420px]" : "max-h-[560px]"} overflow-hidden`}>
        <div className="absolute left-[15px] top-1 bottom-1 w-px bg-gradient-to-b from-border via-border/70 to-transparent" />

        {events.length === 0 ? (
          <div className="relative pl-10 mt-4">
            <p className="text-sm text-muted-foreground">Waiting for agent activity...</p>
            <p className="text-xs text-muted-foreground mt-1">Events will appear here as the agent assesses SLAs and takes action.</p>
          </div>
        ) : (
          <ul className="relative space-y-4 pr-1 overflow-y-auto h-full scroll-fade">
            <AnimatePresence initial={false}>
              {events.map((e) => {
                const meta = kindMeta[e.kind] || kindMeta.monitor;
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
        )}
      </div>
    </div>
  );
}
