import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/vigil/AppShell";
import { DecisionCard } from "@/components/vigil/DecisionCard";
import { apiFetch } from "@/lib/api";

export const Route = createFileRoute("/decisions/")({
  component: DecisionsPage,
});

function DecisionsPage() {
  const { data } = useQuery({
    queryKey: ["decisions"],
    queryFn: async () => {
      const res = await apiFetch("/api/decisions");
      if (!res.ok) throw new Error("Failed to fetch decisions");
      return res.json();
    },
  });

  const decisions = data?.decisions ?? [];

  return (
    <AppShell
      title="Decisions"
      subtitle="Every business decision Vigil is currently monitoring."
    >
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {decisions.map((d: any, i: number) => (
          <DecisionCard key={d.id} decision={d} index={i} />
        ))}
      </div>
    </AppShell>
  );
}
