import { motion } from "framer-motion";
import { Minus, Plus } from "lucide-react";
import type { ConfidenceDriver } from "@/lib/vigil/types";

export function ConfidenceDrivers({ drivers }: { drivers: ConfidenceDriver[] }) {
  return (
    <div className="glass rounded-2xl p-6">
      <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Confidence drivers</p>
      <h3 className="font-display text-lg text-gradient mt-1">Why this score exists</h3>
      <ul className="mt-5 space-y-3">
        {drivers.map((d, i) => {
          const positive = d.polarity === "positive";
          return (
            <motion.li
              key={d.label}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.35 }}
              className="flex items-start gap-3 rounded-xl border border-border/60 bg-surface/40 px-4 py-3"
            >
              <span
                className={
                  positive
                    ? "mt-0.5 grid size-6 place-items-center rounded-full bg-trusted/12 text-trusted ring-1 ring-trusted/25"
                    : "mt-0.5 grid size-6 place-items-center rounded-full bg-risk/12 text-risk ring-1 ring-risk/25"
                }
              >
                {positive ? <Plus className="size-3.5" /> : <Minus className="size-3.5" />}
              </span>
              <div className="min-w-0">
                <p className="text-sm text-foreground/90">{d.label}</p>
                {d.detail && <p className="text-xs text-muted-foreground mt-0.5">{d.detail}</p>}
              </div>
            </motion.li>
          );
        })}
      </ul>
    </div>
  );
}
