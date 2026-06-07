import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/vigil/AppShell";
import { DecisionCard } from "@/components/vigil/DecisionCard";
import { decisions } from "@/lib/vigil/mock-data";

export const Route = createFileRoute("/decisions/")({
  head: () => ({
    meta: [
      { title: "Decisions — Vigil" },
      { name: "description", content: "Every business decision Vigil is monitoring." },
    ],
  }),
  component: DecisionsPage,
});

function DecisionsPage() {
  return (
    <AppShell
      title="Decisions"
      subtitle="Every business decision Vigil is currently monitoring."
    >
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {decisions.map((d, i) => (
          <DecisionCard key={d.id} decision={d} index={i} />
        ))}
      </div>
    </AppShell>
  );
}
