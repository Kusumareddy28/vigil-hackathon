import { cn } from "@/lib/utils";
import type { DecisionStatus, DependencyStatus } from "@/lib/vigil/types";

type Status = DecisionStatus | DependencyStatus | "recovered" | "in_progress" | "escalated" | "human_intervention";

const STYLES: Record<string, { label: string; cls: string; dot: string }> = {
  fresh: { label: "Fresh", cls: "text-trusted bg-trusted/10 border-trusted/30", dot: "bg-trusted" },
  ready: { label: "Ready", cls: "text-trusted bg-trusted/10 border-trusted/30", dot: "bg-trusted" },
  ready_with_caution: { label: "Ready with caution", cls: "text-risk bg-risk/10 border-risk/30", dot: "bg-risk" },
  at_risk: { label: "At risk", cls: "text-risk bg-risk/10 border-risk/30", dot: "bg-risk" },
  stale: { label: "Stale", cls: "text-risk bg-risk/10 border-risk/30", dot: "bg-risk" },
  blocked: { label: "Blocked", cls: "text-blocked bg-blocked/10 border-blocked/30", dot: "bg-blocked" },
  failed: { label: "Failed", cls: "text-blocked bg-blocked/10 border-blocked/30", dot: "bg-blocked" },
  recovered: { label: "Recovered", cls: "text-trusted bg-trusted/10 border-trusted/30", dot: "bg-trusted" },
  in_progress: { label: "In progress", cls: "text-ai bg-ai/10 border-ai/30", dot: "bg-ai" },
  escalated: { label: "Escalated", cls: "text-blocked bg-blocked/10 border-blocked/30", dot: "bg-blocked" },
  human_intervention: { label: "Human intervention", cls: "text-risk bg-risk/10 border-risk/30", dot: "bg-risk" },
};

export function StatusBadge({ status, className }: { status: Status; className?: string }) {
  const s = STYLES[status] ?? { label: status, cls: "text-muted-foreground bg-muted/30 border-border", dot: "bg-muted-foreground" };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium tracking-wide",
        s.cls,
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-full", s.dot)} />
      {s.label}
    </span>
  );
}
