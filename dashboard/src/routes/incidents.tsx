import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/vigil/AppShell";
import { StatusBadge } from "@/components/vigil/StatusBadge";
import { incidents } from "@/lib/vigil/mock-data";
import { motion } from "framer-motion";
import { CircleUser, Bot } from "lucide-react";

export const Route = createFileRoute("/incidents")({
  head: () => ({
    meta: [
      { title: "Incidents — Vigil" },
      { name: "description", content: "Detected anomalies, agent actions, and outcomes across all monitored decisions." },
    ],
  }),
  component: IncidentsPage,
});

const SEVERITY_CLASS: Record<string, string> = {
  low: "text-muted-foreground bg-muted/30",
  medium: "text-risk bg-risk/10",
  high: "text-risk bg-risk/15",
  critical: "text-blocked bg-blocked/15",
};

function IncidentsPage() {
  return (
    <AppShell
      title="Incidents"
      subtitle="Detected anomalies, agent actions, and outcomes across all monitored decisions."
    >
      <div className="glass rounded-2xl overflow-hidden">
        <div className="grid grid-cols-12 gap-4 px-6 py-3 text-[10px] uppercase tracking-[0.22em] text-muted-foreground border-b border-border/60">
          <div className="col-span-4">Incident</div>
          <div className="col-span-2">Severity</div>
          <div className="col-span-2">Detected</div>
          <div className="col-span-3">Agent action</div>
          <div className="col-span-1 text-right">Outcome</div>
        </div>
        {incidents.map((inc, i) => (
          <motion.div
            key={inc.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="grid grid-cols-12 gap-4 px-6 py-5 items-center border-b border-border/40 last:border-0 hover:bg-accent/30 transition"
          >
            <div className="col-span-4">
              <p className="text-sm">{inc.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Affects · {inc.affectedDecision}</p>
            </div>
            <div className="col-span-2">
              <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium capitalize ${SEVERITY_CLASS[inc.severity]}`}>
                {inc.severity}
              </span>
            </div>
            <div className="col-span-2 text-sm text-muted-foreground font-mono text-xs">{inc.detectedAt}</div>
            <div className="col-span-3">
              <p className="text-sm text-foreground/90 flex items-start gap-1.5">
                {inc.humanIntervention ? <CircleUser className="size-3.5 mt-0.5 text-risk" /> : <Bot className="size-3.5 mt-0.5 text-ai" />}
                <span>{inc.agentAction}</span>
              </p>
            </div>
            <div className="col-span-1 flex justify-end">
              <StatusBadge status={inc.outcome} />
            </div>
          </motion.div>
        ))}
      </div>

      <div className="mt-10">
        <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Incident timeline · last 7 days</p>
        <div className="mt-3 glass rounded-2xl p-6">
          <div className="relative h-24">
            <div className="absolute inset-x-0 top-1/2 h-px bg-border" />
            {[8, 22, 41, 55, 70, 88].map((p, i) => (
              <motion.div
                key={i}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1 * i }}
                className="absolute top-1/2 -translate-y-1/2 size-3 rounded-full"
                style={{
                  left: `${p}%`,
                  background: i === 3 ? "var(--blocked)" : i === 1 ? "var(--risk)" : "var(--trusted)",
                  boxShadow: "0 0 0 4px color-mix(in oklab, currentColor 0%, transparent)",
                }}
              />
            ))}
          </div>
          <div className="flex justify-between text-[10px] uppercase tracking-widest text-muted-foreground">
            <span>7d ago</span><span>now</span>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
