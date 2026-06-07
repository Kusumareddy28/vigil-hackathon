import { motion } from "framer-motion";

export function ReadinessGauge({ value, size = 200 }: { value: number; size?: number }) {
  const radius = (size - 20) / 2;
  const circ = 2 * Math.PI * radius;
  const color =
    value >= 90 ? "var(--trusted)" : value >= 75 ? "var(--risk)" : value >= 50 ? "var(--risk)" : "var(--blocked)";
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id="readinessGrad" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.9" />
            <stop offset="100%" stopColor={color} stopOpacity="0.5" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--border)"
          strokeWidth={10}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="url(#readinessGrad)"
          strokeWidth={10}
          strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: circ - (circ * value) / 100 }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <div className="text-center">
          <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Readiness</p>
          <p className="font-display text-5xl text-gradient leading-none mt-1">{value}%</p>
        </div>
      </div>
    </div>
  );
}
