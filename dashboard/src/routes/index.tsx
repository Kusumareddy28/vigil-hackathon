import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowRight, ShieldCheck, GitBranch, Brain, Activity, CheckCircle2, AlertTriangle, Sparkles } from "lucide-react";
import { StatusBadge } from "@/components/vigil/StatusBadge";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Vigil — Know when your data is ready to decide" },
      { name: "description", content: "Vigil is an AI decision reliability agent that verifies the freshness, confidence, and risk behind every critical business decision." },
      { property: "og:title", content: "Vigil — Decision Reliability Platform" },
      { property: "og:description", content: "AI-powered decision reliability for CFOs, CEOs, and operators." },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  return (
    <div className="min-h-screen bg-background bg-radial-glow">
      {/* Nav */}
      <header className="border-b border-border/60 backdrop-blur-xl sticky top-0 z-30 bg-background/70">
        <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-foreground to-foreground/70 ring-1 ring-border">
              <Sparkles className="size-4 text-background" />
            </div>
            <div className="leading-tight">
              <p className="font-display text-xl">Vigil</p>
              <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Decision Reliability</p>
            </div>
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
            <a href="#problem" className="hover:text-foreground transition">Problem</a>
            <a href="#how" className="hover:text-foreground transition">How it works</a>
            <a href="#different" className="hover:text-foreground transition">Why different</a>
            <Link to="/dashboard" className="hover:text-foreground transition">Demo</Link>
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/login" className="hidden sm:inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm text-muted-foreground hover:text-foreground transition">
              Sign in
            </Link>
            <Link to="/signup" className="inline-flex items-center gap-1.5 rounded-lg bg-foreground text-background px-3.5 py-2 text-sm font-medium hover:bg-foreground/90 transition">
              Get started <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-grid opacity-40 [mask-image:radial-gradient(800px_400px_at_50%_0%,#000,transparent)]" />
        <div className="mx-auto max-w-7xl px-6 pt-24 pb-28 relative">
          <div className="grid gap-12 lg:grid-cols-12 items-center">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="lg:col-span-6">
              <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/60 px-3 py-1 text-xs text-muted-foreground">
                <span className="size-1.5 rounded-full bg-trusted animate-pulse" />
                Live agent · monitoring 3 decisions
              </span>
              <h1 className="mt-6 font-display text-5xl md:text-7xl leading-[1.02] text-gradient">
                Know when your data <em className="italic">is ready</em> to decide.
              </h1>
              <p className="mt-6 text-lg text-muted-foreground max-w-xl leading-relaxed">
                Vigil is an AI decision reliability agent that verifies the freshness, confidence, and risk behind every critical business decision — before it ships.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link to="/signup" className="inline-flex items-center gap-2 rounded-lg bg-foreground text-background px-5 py-3 text-sm font-medium hover:bg-foreground/90 transition">
                  Get started <ArrowRight className="size-4" />
                </Link>
                <Link to="/dashboard" className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface/60 px-5 py-3 text-sm hover:bg-accent/60 transition">
                  View live demo
                </Link>
              </div>
              <div className="mt-10 flex items-center gap-8 text-xs text-muted-foreground">
                <div>
                  <p className="font-display text-2xl text-gradient">97%</p>
                  <p className="mt-0.5">avg readiness</p>
                </div>
                <div className="h-8 w-px bg-border" />
                <div>
                  <p className="font-display text-2xl text-gradient">142</p>
                  <p className="mt-0.5">auto-recoveries / wk</p>
                </div>
                <div className="h-8 w-px bg-border" />
                <div>
                  <p className="font-display text-2xl text-gradient">0</p>
                  <p className="mt-0.5">bad decisions shipped</p>
                </div>
              </div>
            </motion.div>

            {/* Hero card */}
            <motion.div
              initial={{ opacity: 0, y: 30, rotate: -1 }}
              animate={{ opacity: 1, y: 0, rotate: 0 }}
              transition={{ duration: 0.8, delay: 0.15 }}
              className="lg:col-span-6"
            >
              <div className="glass rounded-2xl p-6 relative">
                <div className="absolute -top-px left-8 right-8 h-px bg-gradient-to-r from-transparent via-ai/60 to-transparent" />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">CFO · Marisa Chen</p>
                    <p className="font-display text-2xl text-gradient mt-1">Board Revenue Review</p>
                  </div>
                  <StatusBadge status="ready_with_caution" />
                </div>

                <div className="mt-6 flex items-center gap-6">
                  <div className="relative size-28">
                    <svg viewBox="0 0 100 100" className="size-full -rotate-90">
                      <circle cx="50" cy="50" r="42" fill="none" stroke="var(--border)" strokeWidth="6" />
                      <motion.circle
                        cx="50" cy="50" r="42" fill="none" stroke="var(--trusted)" strokeWidth="6" strokeLinecap="round"
                        strokeDasharray={2 * Math.PI * 42}
                        initial={{ strokeDashoffset: 2 * Math.PI * 42 }}
                        animate={{ strokeDashoffset: 2 * Math.PI * 42 * (1 - 0.92) }}
                        transition={{ duration: 1.4, delay: 0.6 }}
                      />
                    </svg>
                    <div className="absolute inset-0 grid place-items-center">
                      <div className="text-center">
                        <p className="font-display text-2xl text-gradient leading-none">92%</p>
                        <p className="text-[9px] uppercase tracking-widest text-muted-foreground mt-1">Readiness</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex-1 space-y-2">
                    <Row label="Revenue Data" status="fresh" />
                    <Row label="Forecast" status="at_risk" />
                    <Row label="Churn" status="fresh" />
                  </div>
                </div>

                <div className="mt-6 rounded-xl border border-ai/20 bg-ai/5 p-4">
                  <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-ai">
                    <Brain className="size-3" /> Agent recommendation
                  </div>
                  <p className="mt-1.5 text-sm text-foreground/90 italic">
                    “Safe to proceed with caution — hold budget-expansion decisions until forecast refresh completes.”
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Trusted by */}
      <section className="border-t border-border/60 bg-surface/30">
        <div className="mx-auto max-w-7xl px-6 py-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <p className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
            Trusted in finance, ops & analytics teams at
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-3 font-display text-xl text-foreground/55">
            <span className="italic">Halcyon Capital</span>
            <span>NORTHWIND</span>
            <span className="italic">Atlas&nbsp;Bio</span>
            <span>MERIDIAN</span>
            <span className="italic">Lumen&nbsp;&amp;&nbsp;Co</span>
            <span>VERTEX</span>
          </div>
        </div>
      </section>

      {/* Problem */}
      <section id="problem" className="border-t border-border/60">
        <div className="mx-auto max-w-7xl px-6 py-24">
          <div className="max-w-3xl">
            <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">The problem</p>
            <h2 className="mt-3 font-display text-4xl md:text-5xl text-gradient">
              Most decisions are made on data that no one verified.
            </h2>
            <p className="mt-5 text-muted-foreground text-lg leading-relaxed">
              Boards approve forecasts built on stale pipelines. Operators ship plans before the warehouse catches up. By the time a dashboard turns red, the decision has already been made.
            </p>
          </div>
          <div className="mt-12 grid gap-4 md:grid-cols-3">
            <Problem icon={AlertTriangle} title="Silent staleness" body="Connectors lag for hours before anyone notices — decisions ship anyway." />
            <Problem icon={GitBranch} title="No decision graph" body="Pipeline alerts don't know which decisions they actually break." />
            <Problem icon={Activity} title="Reactive, not preventive" body="By the time humans intervene, the meeting is over and the call has been made." />
          </div>
        </div>
      </section>

      {/* How */}
      <section id="how" className="border-t border-border/60 bg-surface/20">
        <div className="mx-auto max-w-7xl px-6 py-24">
          <div className="max-w-3xl">
            <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">How Vigil works</p>
            <h2 className="mt-3 font-display text-4xl md:text-5xl text-gradient">
              From data to decision, continuously verified.
            </h2>
          </div>
          <div className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-border md:grid-cols-4 bg-border">
            <Step n="01" icon={GitBranch} title="Decision graph" body="Map each critical decision to the data, models, and pipelines it depends on." />
            <Step n="02" icon={Activity} title="Data health" body="Continuously verify freshness, completeness, and drift on every dependency." />
            <Step n="03" icon={Brain} title="AI reasoning" body="Gemini weighs facts, deadlines, and prior incidents to score decision readiness." />
            <Step n="04" icon={ShieldCheck} title="Autonomous action" body="Trigger early syncs, escalate, and update recommendations before the meeting." />
          </div>
        </div>
      </section>

      {/* Editorial pull-quote */}
      <section className="border-t border-border/60">
        <div className="mx-auto max-w-5xl px-6 py-24 text-center">
          <p className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground">In conversation</p>
          <blockquote className="mt-6 font-display italic text-3xl md:text-5xl leading-[1.15] text-gradient">
            “We stopped asking <span className="not-italic">‘is the dashboard up?’</span> and started asking <span className="not-italic">‘can we trust the next decision?’</span> Vigil answers that, every fifteen minutes.”
          </blockquote>
          <div className="mt-8 flex items-center justify-center gap-3 text-sm text-muted-foreground">
            <div className="size-9 rounded-full bg-gradient-to-br from-foreground/80 to-foreground/40 ring-1 ring-border" />
            <div className="text-left">
              <p className="text-foreground">Marisa Chen</p>
              <p className="text-xs">CFO · Halcyon Capital</p>
            </div>
          </div>
        </div>
      </section>

      {/* Why different */}
      <section id="different" className="border-t border-border/60">
        <div className="mx-auto max-w-7xl px-6 py-24 grid gap-12 lg:grid-cols-2 items-start">
          <div>
            <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Why it's different</p>
            <h2 className="mt-3 font-display text-4xl md:text-5xl text-gradient">
              Not pipeline monitoring. Decision readiness.
            </h2>
            <p className="mt-5 text-muted-foreground leading-relaxed">
              Existing tools tell you a pipeline is red. Vigil tells you whether the decision in 45 minutes can still be trusted — and what to do about it.
            </p>
          </div>
          <div className="glass rounded-2xl p-2">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                  <th className="p-4 text-left font-normal">Capability</th>
                  <th className="p-4 text-left font-normal">Monitoring tools</th>
                  <th className="p-4 text-left font-normal text-foreground">Vigil</th>
                </tr>
              </thead>
              <tbody className="text-muted-foreground">
                {[
                  ["Pipeline alerts", "Yes", "Yes"],
                  ["Decision-aware", "—", "Yes"],
                  ["AI reasoning", "—", "Yes"],
                  ["Autonomous recovery", "—", "Yes"],
                  ["Readiness scoring", "—", "Yes"],
                ].map((r) => (
                  <tr key={r[0]} className="border-t border-border/60">
                    <td className="p-4 text-foreground">{r[0]}</td>
                    <td className="p-4">{r[1]}</td>
                    <td className="p-4 text-trusted flex items-center gap-1.5">
                      {r[2] === "Yes" ? <CheckCircle2 className="size-4" /> : null}{r[2]}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border/60 bg-surface/20">
        <div className="mx-auto max-w-4xl px-6 py-24 text-center">
          <h2 className="font-display text-4xl md:text-5xl text-gradient">See the agent in action.</h2>
          <p className="mt-4 text-muted-foreground">
            Tour the command center, watch agent reasoning unfold, and simulate a failure live.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <Link to="/signup" className="inline-flex items-center gap-2 rounded-lg bg-foreground text-background px-5 py-3 text-sm font-medium hover:bg-foreground/90 transition">
              Get started <ArrowRight className="size-4" />
            </Link>
            <Link to="/dashboard" className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface/60 px-5 py-3 text-sm hover:bg-accent/60 transition">
              View live demo
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-border/60">
        <div className="mx-auto max-w-7xl px-6 py-8 flex items-center justify-between text-xs text-muted-foreground">
          <p>© 2026 Vigil Labs · Decision reliability, by design.</p>
          <p className="flex items-center gap-1.5"><span className="size-1.5 rounded-full bg-trusted animate-pulse" /> All systems healthy</p>
        </div>
      </footer>
    </div>
  );
}

function Row({ label, status }: { label: string; status: "fresh" | "at_risk" | "stale" }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <StatusBadge status={status} />
    </div>
  );
}

function Problem({ icon: Icon, title, body }: { icon: React.ComponentType<{ className?: string }>; title: string; body: string }) {
  return (
    <div className="glass rounded-2xl p-6">
      <div className="grid size-9 place-items-center rounded-lg bg-risk/10 ring-1 ring-risk/30">
        <Icon className="size-4 text-risk" />
      </div>
      <h3 className="mt-4 font-display text-lg text-gradient">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{body}</p>
    </div>
  );
}

function Step({ n, icon: Icon, title, body }: { n: string; icon: React.ComponentType<{ className?: string }>; title: string; body: string }) {
  return (
    <div className="bg-background p-6">
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">{n}</span>
        <Icon className="size-4 text-ai" />
      </div>
      <h3 className="mt-6 font-display text-lg text-gradient">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{body}</p>
    </div>
  );
}
