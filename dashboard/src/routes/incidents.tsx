import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/vigil/AppShell";
import { StatusBadge } from "@/components/vigil/StatusBadge";
import { apiFetch } from "@/lib/api";
import { motion } from "framer-motion";
import { CircleUser, Bot } from "lucide-react";

export const Route = createFileRoute("/incidents")({
  component: IncidentsPage,
});

const SEVERITY_CLASS: Record<string, string> = {
  low: "text-trusted bg-trusted/10",
  medium: "text-risk bg-risk/10",
  high: "text-risk bg-risk/15",
  critical: "text-blocked bg-blocked/15",
};

function IncidentsPage() {
  const { data } = useQuery({
    queryKey: ["incidents"],
    queryFn: async () => {
      const res = await apiFetch("/api/incidents");
      if (!res.ok) throw new Error("Failed to fetch incidents");
      return res.json();
    },
    refetchInterval: 30000,
  });

  const incidents = data?.incidents ?? [];

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
        {incidents.length === 0 ? (
          <div className="px-6 py-8 text-sm text-muted-foreground">No incidents recorded yet.</div>
        ) : (
          incidents.map((inc: any, i: number) => {
            const severity = inc.failure_type === "AUTH_EXPIRED" ? "critical" : inc.failure_type === "SCHEMA_CHANGE" ? "high" : inc.failure_type === "PROACTIVE_INTERVENTION" ? "low" : "medium";
            const outcome = inc.resolved_at ? "recovered" : inc.human_intervention_required ? "human_intervention" : "in_progress";
            const rawActions = inc.agent_actions?.map((a: any) => typeof a === "string" ? a : a.action) || [];
            const agentAction = rawActions.length > 0
              ? rawActions.map((a: string) => a === "sync_connection" ? "Triggered early sync" : a.replace(/_/g, " ")).join(" → ")
              : "Investigating...";
            const detected = inc.detected_at ? new Date(inc.detected_at).toLocaleString([], { hour: "numeric", minute: "2-digit", month: "short", day: "numeric" }) : "";

            return (
              <motion.div
                key={inc._id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                className="grid grid-cols-12 gap-4 px-6 py-5 items-center border-b border-border/40 last:border-0 hover:bg-accent/30 transition"
              >
                <div className="col-span-4">
                  <p className="text-sm">{inc.failure_type?.replace(/_/g, " ")}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Connector: {inc.connector_id}</p>
                </div>
                <div className="col-span-2">
                  <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium capitalize ${SEVERITY_CLASS[severity] || ""}`}>
                    {severity}
                  </span>
                </div>
                <div className="col-span-2 text-xs text-muted-foreground font-mono">{detected}</div>
                <div className="col-span-3">
                  <p className="text-sm text-foreground/90 flex items-start gap-1.5">
                    {inc.human_intervention_required ? <CircleUser className="size-3.5 mt-0.5 text-risk" /> : <Bot className="size-3.5 mt-0.5 text-ai" />}
                    <span className="truncate">{agentAction}</span>
                  </p>
                </div>
                <div className="col-span-1 flex justify-end">
                  <StatusBadge status={outcome} />
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </AppShell>
  );
}
