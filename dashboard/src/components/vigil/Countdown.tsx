import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";

function format(ms: number): { label: string; urgency: "imminent" | "soon" | "later" | "future" } {
  if (ms <= 0) return { label: "Now", urgency: "imminent" };
  const totalMin = Math.floor(ms / 60_000);
  const days = Math.floor(totalMin / (60 * 24));
  const hours = Math.floor((totalMin % (60 * 24)) / 60);
  const mins = totalMin % 60;
  let label: string;
  if (days >= 1) label = days === 1 ? "Tomorrow" : `${days}d ${hours}h`;
  else if (hours >= 1) label = `${hours}h ${mins.toString().padStart(2, "0")}m remaining`;
  else label = `${mins}m remaining`;
  const urgency: "imminent" | "soon" | "later" | "future" =
    totalMin <= 60 ? "imminent" : totalMin <= 4 * 60 ? "soon" : days >= 1 ? "future" : "later";
  return { label, urgency };
}

export function Countdown({ deadline, className }: { deadline: string; className?: string }) {
  const [ms, setMs] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setMs(new Date(deadline).getTime() - Date.now());
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, [deadline]);
  const { label, urgency } = ms === null ? { label: "—", urgency: "later" as const } : format(ms);
  const tone =
    urgency === "imminent"
      ? "text-blocked border-blocked/30 bg-blocked/8"
      : urgency === "soon"
      ? "text-risk border-risk/30 bg-risk/8"
      : urgency === "later"
      ? "text-foreground/80 border-border bg-surface/60"
      : "text-muted-foreground border-border bg-surface/40";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium tracking-tight",
        tone,
        className,
      )}
    >
      <Clock className="size-3" />
      {urgency === "imminent" && <span className="size-1.5 rounded-full bg-blocked animate-pulse" />}
      {label}
    </span>
  );
}
