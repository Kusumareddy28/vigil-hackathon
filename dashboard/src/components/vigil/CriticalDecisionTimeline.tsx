import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import type { Decision } from "@/lib/vigil/types";
import { Countdown } from "./Countdown";

export function CriticalDecisionTimeline({ decisions }: { decisions: Decision[] }) {
  const sorted = [...decisions].sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());
  return (
    <div className="glass rounded-2xl p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Critical decision timeline</p>
          <h3 className="font-display text-xl text-gradient mt-1">What's coming up</h3>
        </div>
        <p className="text-xs text-muted-foreground">Sorted by urgency</p>
      </div>

      <ol className="mt-5 relative">
        <div className="absolute left-[7px] top-2 bottom-2 w-px bg-gradient-to-b from-border via-border/60 to-transparent" />
        {sorted.map((d, i) => {
          const tone =
            d.readiness >= 90 ? "bg-trusted" : d.readiness >= 75 ? "bg-risk" : "bg-blocked";
          return (
            <motion.li
              key={d.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: i * 0.06, ease: "easeOut" }}
              className="relative pl-8 py-3"
            >
              <span className={`absolute left-0 top-5 size-3.5 rounded-full ring-2 ring-background ${tone}`} />
              <Link
                to="/decisions/$id"
                params={{ id: d.id }}
                className="group flex items-center justify-between gap-4 rounded-xl px-3 py-2 -mx-3 transition hover:bg-accent/40"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground/90 truncate">{d.title}</p>
                  <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground mt-0.5">
                    {d.stakeholderRole} · {d.stakeholder}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <Countdown deadline={d.deadline} />
                  <ArrowUpRight className="size-4 text-muted-foreground transition group-hover:text-foreground group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </div>
              </Link>
            </motion.li>
          );
        })}
      </ol>
    </div>
  );
}
