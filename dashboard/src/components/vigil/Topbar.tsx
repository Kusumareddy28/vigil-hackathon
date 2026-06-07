import { Search, Command } from "lucide-react";

export function Topbar({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <header className="border-b border-border/60 bg-background/40 backdrop-blur-xl">
      <div className="flex items-center gap-6 px-8 py-5">
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-2xl text-gradient leading-tight truncate">{title}</h1>
          {subtitle && (
            <p className="mt-1 text-sm text-muted-foreground line-clamp-1">{subtitle}</p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <div className="hidden xl:flex items-center gap-2 rounded-lg border border-border bg-surface/60 px-3 py-1.5 text-sm text-muted-foreground">
            <Search className="size-4" />
            <span>Search decisions, incidents…</span>
            <span className="ml-3 flex items-center gap-1 rounded border border-border bg-background/60 px-1.5 py-0.5 text-[10px]">
              <Command className="size-3" /> K
            </span>
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      </div>
    </header>
  );
}
