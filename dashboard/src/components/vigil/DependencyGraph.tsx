import type { Decision } from "@/lib/vigil/types";
import { motion } from "framer-motion";

export function DependencyGraph({ decision }: { decision: Decision }) {
  const deps = decision.dependencies;
  const colorFor = (s: string) =>
    s === "fresh" ? "var(--trusted)" : s === "at_risk" || s === "stale" ? "var(--risk)" : "var(--blocked)";

  // simple radial layout
  const cx = 200, cy = 160, r = 110;
  return (
    <svg viewBox="0 0 400 320" className="w-full h-auto">
      <defs>
        <radialGradient id="hub" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="var(--ai)" stopOpacity="0.5" />
          <stop offset="100%" stopColor="var(--ai)" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx={cx} cy={cy} r={70} fill="url(#hub)" />
      {deps.map((d, i) => {
        const angle = (i / deps.length) * Math.PI * 2 - Math.PI / 2;
        const x = cx + Math.cos(angle) * r;
        const y = cy + Math.sin(angle) * r;
        const c = colorFor(d.status);
        return (
          <g key={d.id}>
            <motion.line
              x1={cx} y1={cy} x2={x} y2={y}
              stroke={c} strokeOpacity={0.5} strokeWidth={1.5}
              strokeDasharray={d.status === "fresh" ? "0" : "4 4"}
              initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.8, delay: 0.1 * i }}
            />
            <motion.circle
              cx={x} cy={y} r={10}
              fill={c} fillOpacity={0.18}
              stroke={c} strokeWidth={1.5}
              initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2 + 0.1 * i }}
            />
            <text x={x} y={y - 18} textAnchor="middle" fill="currentColor" className="fill-foreground text-[11px]">
              {d.name}
            </text>
            <text x={x} y={y + 26} textAnchor="middle" fill="currentColor" className="fill-muted-foreground text-[9px] uppercase tracking-widest">
              {d.status === "fresh" ? "fresh" : d.status === "at_risk" ? "at risk" : d.status}
            </text>
          </g>
        );
      })}
      <circle cx={cx} cy={cy} r={26} fill="var(--surface-elevated)" stroke="var(--ai)" strokeOpacity={0.5} />
      <text x={cx} y={cy + 4} textAnchor="middle" className="fill-foreground text-[10px] uppercase tracking-widest">
        Decision
      </text>
    </svg>
  );
}
