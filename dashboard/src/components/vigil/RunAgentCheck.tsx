import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Loader2, Sparkles, X } from "lucide-react";

const STEPS = [
  "Assessing decision dependencies",
  "Evaluating business impact",
  "Reviewing historical incidents",
  "Generating recommendations",
  "Updating readiness confidence",
];

export function RunAgentCheckButton({
  onComplete,
  label = "Run Agent Check",
  variant = "primary",
}: {
  onComplete?: (newReadiness: number) => void;
  label?: string;
  variant?: "primary" | "ghost";
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          variant === "primary"
            ? "inline-flex items-center gap-1.5 rounded-lg bg-foreground text-background px-3.5 py-2 text-sm font-medium hover:bg-foreground/90 transition shadow-sm"
            : "inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface/60 px-3 py-2 text-sm hover:bg-accent/60 transition"
        }
      >
        <Sparkles className="size-3.5" /> {label}
      </button>
      {mounted &&
        createPortal(
          <AnimatePresence>
            {open && <RunAgentCheckModal onClose={() => setOpen(false)} onComplete={onComplete} />}
          </AnimatePresence>,
          document.body,
        )}
    </>
  );
}

function RunAgentCheckModal({
  onClose,
  onComplete,
}: {
  onClose: () => void;
  onComplete?: (newReadiness: number) => void;
}) {
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);
  const [score, setScore] = useState(86);

  useEffect(() => {
    if (step < STEPS.length) {
      const id = setTimeout(() => setStep((s) => s + 1), 780);
      return () => clearTimeout(id);
    }
    // animate score
    const target = 94;
    let v = 78;
    const id = setInterval(() => {
      v = Math.min(target, v + 1);
      setScore(v);
      if (v >= target) {
        clearInterval(id);
        setDone(true);
        onComplete?.(target);
      }
    }, 28);
    return () => clearInterval(id);
  }, [step, onComplete]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] grid place-items-center bg-foreground/60 backdrop-blur-md p-4 overflow-y-auto"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, scale: 0.98 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-background rounded-3xl p-7 border border-border shadow-2xl my-auto"
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.22em] text-ai flex items-center gap-1.5">
              <Sparkles className="size-3" /> Vigil Intelligence
            </p>
            <h3 className="font-display text-2xl text-gradient mt-2">
              {done ? "Confidence updated" : "Running agent check"}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              {done ? "Vigil has re-evaluated this decision." : "Re-evaluating data freshness, dependencies, and risk."}
            </p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground -mt-1">
            <X className="size-4" />
          </button>
        </div>

        <ol className="mt-7 space-y-3">
          {STEPS.map((s, i) => {
            const active = i === step && !done;
            const complete = i < step || done;
            return (
              <motion.li
                key={s}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center gap-3 text-sm"
              >
                <span className="grid size-6 place-items-center rounded-full border border-border bg-background">
                  {complete ? (
                    <CheckCircle2 className="size-3.5 text-trusted" />
                  ) : active ? (
                    <Loader2 className="size-3.5 text-ai animate-spin" />
                  ) : (
                    <span className="size-1.5 rounded-full bg-muted-foreground/40" />
                  )}
                </span>
                <span className={complete || active ? "text-foreground/90" : "text-muted-foreground"}>
                  {s}
                </span>
              </motion.li>
            );
          })}
        </ol>

        <div className="mt-7 rounded-2xl border border-border bg-surface/50 p-5">
          <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Readiness confidence</p>
          <div className="mt-2 flex items-end gap-3">
            <motion.p
              key={score}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="font-display text-5xl text-gradient leading-none"
            >
              {score}%
            </motion.p>
            {done && (
              <motion.span
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-xs text-trusted mb-1.5"
              >
                ↑ recovered from 78%
              </motion.span>
            )}
          </div>
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-border/40">
            <motion.div
              className="h-full bg-trusted"
              initial={{ width: "78%" }}
              animate={{ width: `${score}%` }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            />
          </div>
          <p className="mt-3 text-xs text-muted-foreground italic">
            {done
              ? "Forecast pipeline refreshed. Decision is safe to proceed with caution."
              : "Cross-referencing 14 dependencies and 90 days of incident history…"}
          </p>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg border border-border bg-surface/60 px-4 py-2 text-sm hover:bg-accent/60 transition"
          >
            {done ? "Close" : "Cancel"}
          </button>
          {done && (
            <button
              onClick={onClose}
              className="rounded-lg bg-foreground text-background px-4 py-2 text-sm font-medium hover:bg-foreground/90 transition"
            >
              Acknowledge
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
