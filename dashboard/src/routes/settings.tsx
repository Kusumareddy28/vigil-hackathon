import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/vigil/AppShell";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings — Vigil" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  return (
    <AppShell title="Settings" subtitle="Workspace, agent behavior, and integrations.">
      <div className="grid gap-5 md:grid-cols-2">
        {[
          { t: "Workspace", d: "Name, branding, time zone, and executive directory." },
          { t: "Agent behavior", d: "Auto-recovery thresholds, notification cadence, escalation policy." },
          { t: "Integrations", d: "Salesforce, Stripe, Workday, Anaplan, HubSpot — connect or rotate credentials." },
          { t: "Audit & compliance", d: "Decision audit trail, SOC2 export, retention policy." },
        ].map((s) => (
          <div key={s.t} className="glass rounded-2xl p-6">
            <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Section</p>
            <h3 className="font-display text-xl text-gradient mt-1">{s.t}</h3>
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{s.d}</p>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
