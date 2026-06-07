import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowUpRight, User } from "lucide-react";
import type { Decision } from "@/lib/vigil/types";
import { StatusBadge } from "./StatusBadge";
import { Countdown } from "./Countdown";

const verdictByStatus: Record<Decision["status"], string> = {
  ready: "READY TO DECIDE",
  ready_with_caution: "READY · WITH CAUTION",
  at_risk: "PROCEED WITH CARE",
  blocked: "HOLD DECISION",
};

export function DecisionCard({ decision, index = 0 }: { decision: Decision; index?: number }) {
  const barColor =
    decision.readiness >= 90 ? "bg-trusted" : decision.readiness >= 75 ? "bg-risk" : "bg-blocked";
  const verdictTone =
    decision.status === "ready"
      ? "text-trusted"
      : decision.status === "ready_with_caution"
      ? "text-risk"
      : "text-blocked";

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.08, ease: [0.16, 1, 0.3, 1] }}
    >
      <Link
        to="/decisions/$id"
        params={{ id: decision.id }}
        className="group block glass rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-foreground/5 hover:ring-1 hover:ring-foreground/15"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              <User className="size-3" />
              <span className="truncate">{decision.stakeholderRole} · {decision.stakeholder}</span>
            </div>
            <h3 className="mt-2 font-display text-xl text-gradient leading-tight">{decision.title}</h3>
            <div className="mt-2">
              <Countdown deadline={decision.deadline} />
            </div>
          </div>
          <ArrowUpRight className="size-5 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-foreground" />
        </div>

        <div className="mt-6">
          <p className={`text-[10px] uppercase tracking-[0.24em] ${verdictTone}`}>
            {verdictByStatus[decision.status]}
          </p>
          <div className="mt-1.5 flex items-end justify-between gap-4">
            <p className="font-display text-5xl text-gradient leading-none">{decision.readiness}%</p>
            <StatusBadge status={decision.status} />
          </div>
          <p className="mt-3 text-xs text-muted-foreground leading-relaxed italic">
            {decision.confidenceSummary}
          </p>
        </div>

        <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-border/40">
          <motion.div
            className={`h-full ${barColor}`}
            initial={{ width: 0 }}
            animate={{ width: `${decision.readiness}%` }}
            transition={{ duration: 0.9, delay: 0.2 + index * 0.08, ease: "easeOut" }}
          />
        </div>

        <div className="mt-5 space-y-2.5">
          {decision.dependencies.map((d) => (
            <div key={d.id} className="flex items-center justify-between gap-3 text-sm">
              <div className="min-w-0">
                <p className="truncate text-foreground/85">{d.name}</p>
                {d.freshnessLabel && (
                  <p className="text-[11px] text-muted-foreground truncate">{d.freshnessLabel}</p>
                )}
              </div>
              <StatusBadge status={d.status} />
            </div>
          ))}
        </div>
      </Link>
    </motion.div>
  );
}
