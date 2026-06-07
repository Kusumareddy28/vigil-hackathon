import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles, Mail, Lock, ShieldCheck } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — Vigil" },
      { name: "description", content: "Sign in to the Vigil decision reliability command center." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("marisa@pramana.ai");
  const [password, setPassword] = useState("••••••••••");
  const [loading, setLoading] = useState(false);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => navigate({ to: "/dashboard" }), 700);
  };

  return <AuthShell mode="login" onSubmit={onSubmit} loading={loading} email={email} setEmail={setEmail} password={password} setPassword={setPassword} />;
}

export function AuthShell({
  mode,
  onSubmit,
  loading,
  email,
  setEmail,
  password,
  setPassword,
  name,
  setName,
}: {
  mode: "login" | "signup";
  onSubmit: (e: React.FormEvent) => void;
  loading: boolean;
  email: string;
  setEmail: (v: string) => void;
  password: string;
  setPassword: (v: string) => void;
  name?: string;
  setName?: (v: string) => void;
}) {
  const isLogin = mode === "login";
  return (
    <div className="min-h-screen bg-background bg-radial-glow grid lg:grid-cols-2">
      {/* Left — editorial panel */}
      <div className="relative hidden lg:flex flex-col justify-between p-12 border-r border-border/60 overflow-hidden">
        <div className="absolute inset-0 bg-grid opacity-30 [mask-image:radial-gradient(700px_400px_at_30%_30%,#000,transparent)]" />
        <Link to="/" className="relative flex items-center gap-2.5">
          <div className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-foreground to-foreground/70 ring-1 ring-border">
            <Sparkles className="size-4 text-background" />
          </div>
          <div className="leading-tight">
            <p className="font-display text-xl">Vigil</p>
            <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Decision Reliability</p>
          </div>
        </Link>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }} className="relative max-w-md">
          <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Today's readiness</p>
          <h2 className="mt-3 font-display text-5xl leading-[1.05] text-gradient">
            “Hold budget expansion — forecast refresh completes in 38 minutes.”
          </h2>
          <p className="mt-6 text-sm text-muted-foreground leading-relaxed">
            Vigil watches the data behind your most important decisions and tells you, in plain language, whether they can be trusted right now.
          </p>

          <div className="mt-10 glass rounded-2xl p-5">
            <div className="flex items-center justify-between">
              <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Board Revenue Review</p>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-trusted/10 text-trusted px-2.5 py-0.5 text-[11px] ring-1 ring-trusted/30">
                <span className="size-1.5 rounded-full bg-trusted animate-pulse" /> 92% ready
              </span>
            </div>
            <div className="mt-4 h-1.5 rounded-full bg-border overflow-hidden">
              <motion.div initial={{ width: 0 }} animate={{ width: "92%" }} transition={{ duration: 1.2, delay: 0.3 }} className="h-full bg-gradient-to-r from-trusted/70 to-trusted" />
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3 text-[11px]">
              <Stat label="Freshness" value="Fresh" tone="trusted" />
              <Stat label="Forecast" value="At risk" tone="risk" />
              <Stat label="Churn" value="Fresh" tone="trusted" />
            </div>
          </div>
        </motion.div>

        <div className="relative flex items-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="size-3.5" /> SOC2 · GDPR · End-to-end audit trail
        </div>
      </div>

      {/* Right — form */}
      <div className="flex items-center justify-center p-6 sm:p-12">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="w-full max-w-md">
          <Link to="/" className="lg:hidden mb-8 flex items-center gap-2">
            <div className="grid size-8 place-items-center rounded-lg bg-foreground"><Sparkles className="size-4 text-background" /></div>
            <p className="font-display text-lg">Vigil</p>
          </Link>

          <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
            {isLogin ? "Welcome back" : "Create your account"}
          </p>
          <h1 className="mt-2 font-display text-4xl text-gradient leading-tight">
            {isLogin ? "Sign in to Vigil." : "Begin with confidence."}
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            {isLogin
              ? "Pick up where the agent left off."
              : "Connect your data and let the agent verify every decision before it ships."}
          </p>

          <form onSubmit={onSubmit} className="mt-8 space-y-4">
            {!isLogin && setName && (
              <Field label="Full name">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="Marisa Chen"
                  className="w-full bg-transparent outline-none text-sm placeholder:text-muted-foreground"
                />
              </Field>
            )}
            <Field label="Work email" icon={Mail}>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@company.com"
                className="w-full bg-transparent outline-none text-sm placeholder:text-muted-foreground"
              />
            </Field>
            <Field label="Password" icon={Lock}>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full bg-transparent outline-none text-sm placeholder:text-muted-foreground"
              />
            </Field>

            {isLogin && (
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" defaultChecked className="size-3.5 rounded border-border accent-foreground" />
                  Remember me
                </label>
                <a className="hover:text-foreground cursor-pointer">Forgot password?</a>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full inline-flex items-center justify-center gap-2 rounded-lg bg-foreground text-background px-5 py-3 text-sm font-medium hover:bg-foreground/90 transition disabled:opacity-60"
            >
              {loading ? "Verifying…" : isLogin ? "Sign in" : "Create account"}
              <ArrowRight className="size-4" />
            </button>
          </form>

          <div className="my-6 flex items-center gap-3 text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            <div className="h-px flex-1 bg-border" /> or continue with <div className="h-px flex-1 bg-border" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <SocialBtn label="Google" />
            <SocialBtn label="SSO" />
          </div>

          <p className="mt-8 text-center text-sm text-muted-foreground">
            {isLogin ? (
              <>New to Vigil? <Link to="/signup" className="text-foreground underline underline-offset-4 hover:opacity-80">Create an account</Link></>
            ) : (
              <>Already have an account? <Link to="/login" className="text-foreground underline underline-offset-4 hover:opacity-80">Sign in</Link></>
            )}
          </p>
        </motion.div>
      </div>
    </div>
  );
}

function Field({ label, icon: Icon, children }: { label: string; icon?: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">{label}</span>
      <div className="mt-1.5 flex items-center gap-2 rounded-lg border border-border bg-surface-elevated/60 px-3.5 py-3 focus-within:ring-1 focus-within:ring-foreground/30 transition">
        {Icon && <Icon className="size-4 text-muted-foreground" />}
        {children}
      </div>
    </label>
  );
}

function SocialBtn({ label }: { label: string }) {
  return (
    <button type="button" className="rounded-lg border border-border bg-surface/40 px-4 py-2.5 text-sm hover:bg-accent/60 transition">
      {label}
    </button>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone: "trusted" | "risk" }) {
  return (
    <div className="rounded-lg border border-border bg-background/40 p-2.5">
      <p className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
      <p className={`mt-1 font-medium ${tone === "trusted" ? "text-trusted" : "text-risk"}`}>{value}</p>
    </div>
  );
}
