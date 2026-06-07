import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, ShieldAlert, Sparkles, Activity, Settings, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

const workspace = [
  { to: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { to: "/decisions", label: "Decisions", icon: BookOpen },
  { to: "/incidents", label: "Incidents", icon: ShieldAlert },
];

const agentNav = [
  { to: "/agent-activity", label: "Agent Activity", icon: Activity, live: true },
  { to: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-border/60 bg-surface/40 backdrop-blur-xl">
      <Link to="/" className="flex items-center gap-2 px-6 py-6">
        <div className="grid size-8 place-items-center rounded-lg bg-gradient-to-br from-ai/80 to-ai/30 ring-1 ring-ai/40">
          <Sparkles className="size-4 text-ai-foreground" />
        </div>
        <div className="leading-tight">
          <p className="font-display text-lg">Vigil</p>
          <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Decision Reliability</p>
        </div>
      </Link>

      <nav className="px-3 py-2">
        <p className="px-3 pb-2 text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Workspace</p>
        <ul className="space-y-1">
          {workspace.map((item) => {
            const active = pathname === item.to || (item.to !== "/dashboard" && pathname.startsWith(item.to));
            const Icon = item.icon;
            return (
              <li key={item.to}>
                <Link
                  to={item.to}
                  className={cn(
                    "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all",
                    active
                      ? "bg-accent/60 text-foreground ring-1 ring-border"
                      : "text-muted-foreground hover:bg-accent/40 hover:text-foreground",
                  )}
                >
                  <Icon className="size-4" />
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>

        <p className="px-3 pb-2 pt-6 text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Agent</p>
        <ul className="space-y-1">
          {agentNav.map((item) => {
            const active = pathname.startsWith(item.to);
            const Icon = item.icon;
            return (
              <li key={item.to}>
                <Link
                  to={item.to}
                  className={cn(
                    "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all",
                    active
                      ? "bg-accent/60 text-foreground ring-1 ring-border"
                      : "text-muted-foreground hover:bg-accent/40 hover:text-foreground",
                  )}
                >
                  <Icon className={cn("size-4", item.live && "text-ai")} />
                  <span>{item.label}</span>
                  {item.live && (
                    <span className="ml-auto relative flex size-1.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-trusted/70" />
                      <span className="relative inline-flex size-1.5 rounded-full bg-trusted" />
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="mt-auto m-3 glass rounded-xl p-4">
        <p className="text-xs text-muted-foreground">Agent uptime</p>
        <p className="mt-1 font-display text-2xl text-gradient">99.98%</p>
        <p className="mt-1 text-[10px] uppercase tracking-widest text-trusted">Healthy · monitoring</p>
      </div>
    </aside>
  );
}
