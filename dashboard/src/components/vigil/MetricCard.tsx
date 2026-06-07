import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function MetricCard({
  label,
  value,
  hint,
  icon,
  className,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("glass rounded-2xl p-5", className)}>
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
        {icon && <span className="text-muted-foreground/80">{icon}</span>}
      </div>
      <p className="mt-3 text-3xl font-medium text-gradient">{value}</p>
      {hint && <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
