import { useSSE } from './hooks/useSSE'
import { useAPI } from './hooks/useAPI'

function App() {
  const { traces, slaUpdates, incidents, connected } = useSSE()
  const { data: slasData } = useAPI<{ slas: any[] }>('/api/slas')

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <aside className="w-16 bg-[var(--color-surface)] border-r border-[var(--color-border)] flex flex-col items-center py-4 gap-4">
        <div className="text-lg font-bold text-white">V</div>
        <div className="w-8 h-px bg-[var(--color-border)]" />
        <button className="text-[var(--color-muted)] hover:text-white text-xs">SLAs</button>
        <button className="text-[var(--color-muted)] hover:text-white text-xs">Trace</button>
        <button className="text-[var(--color-muted)] hover:text-white text-xs">Inc.</button>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto p-6">
        {/* Connection indicator */}
        <div className="flex items-center gap-2 mb-6">
          <div className={`w-2 h-2 rounded-full ${connected ? 'bg-[var(--color-green)]' : 'bg-[var(--color-red)]'}`} />
          <span className="text-xs text-[var(--color-muted)]">
            {connected ? 'Connected' : 'Disconnected'}
          </span>
          <span className="text-xs text-[var(--color-muted)] ml-auto">VIGIL</span>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-4">
            <div className="text-2xl font-bold">{slasData?.slas?.length ?? 0}</div>
            <div className="text-xs text-[var(--color-muted)]">SLAs Monitored</div>
          </div>
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-4">
            <div className="text-2xl font-bold text-[var(--color-green)]">0</div>
            <div className="text-xs text-[var(--color-muted)]">Active Breaches</div>
          </div>
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-4">
            <div className="text-2xl font-bold">{incidents.length}</div>
            <div className="text-xs text-[var(--color-muted)]">Incidents</div>
          </div>
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-4">
            <div className="text-2xl font-bold">—</div>
            <div className="text-xs text-[var(--color-muted)]">Avg MTTR</div>
          </div>
        </div>

        {/* Two-column layout: SLA Cards + Reasoning Traces */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          {/* SLA Status */}
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-4">
            <h2 className="text-sm font-semibold mb-3">SLA Status</h2>
            {slasData?.slas?.map((sla: any) => {
              const update = slaUpdates[sla._id]
              const status = update?.status ?? 'GREEN'
              const colorMap = { GREEN: 'var(--color-green)', YELLOW: 'var(--color-yellow)', RED: 'var(--color-red)' }
              return (
                <div key={sla._id} className="flex items-center gap-3 py-2 border-b border-[var(--color-border)] last:border-0">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: colorMap[status as keyof typeof colorMap] || 'var(--color-muted)' }} />
                  <div className="flex-1">
                    <div className="text-sm">{sla.name}</div>
                    <div className="text-xs text-[var(--color-muted)]">{sla.deadline_description}</div>
                  </div>
                  <span className="text-xs font-mono" style={{ color: colorMap[status as keyof typeof colorMap] }}>{status}</span>
                </div>
              )
            }) ?? <p className="text-xs text-[var(--color-muted)]">Loading...</p>}
          </div>

          {/* Reasoning Traces */}
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-4">
            <h2 className="text-sm font-semibold mb-3">Reasoning Traces</h2>
            {traces.length === 0 ? (
              <p className="text-xs text-[var(--color-muted)]">Waiting for agent activity...</p>
            ) : (
              <div className="space-y-2 font-mono text-xs max-h-80 overflow-y-auto">
                {traces.map((t, i) => (
                  <div key={i} className="border border-[var(--color-border)] rounded p-2">
                    <div className="flex items-center gap-2">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        (t.assessment?.risk_level === 'RED' || t.classification?.failure_type) ? 'bg-red-500/20 text-red-400' :
                        t.assessment?.risk_level === 'YELLOW' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-green-500/20 text-green-400'
                      }`}>
                        {t.assessment?.risk_level ?? t.classification?.failure_type ?? 'INFO'}
                      </span>
                      <span className="text-[var(--color-text)]">{t.connector_name}</span>
                      <span className="text-[var(--color-muted)]">• {t.phase}</span>
                    </div>
                    <p className="mt-1 text-[var(--color-muted)]">
                      {t.assessment?.reasoning ?? t.classification?.evidence?.[0] ?? t.escalation_message ?? 'Processing...'}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Incidents */}
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-4">
          <h2 className="text-sm font-semibold mb-3">Recent Incidents</h2>
          {incidents.length === 0 ? (
            <p className="text-xs text-[var(--color-muted)]">No incidents recorded.</p>
          ) : (
            <div className="space-y-1 font-mono text-xs">
              {incidents.map((inc, i) => (
                <div key={i} className="flex items-center gap-2 py-1">
                  <span className={`w-2 h-2 rounded-full ${inc.human_intervention_required ? 'bg-[var(--color-red)]' : 'bg-[var(--color-green)]'}`} />
                  <span className="text-[var(--color-muted)]">{new Date(inc.detected_at).toLocaleTimeString()}</span>
                  <span>{inc.connector_id.replace('connector_', '')}</span>
                  <span className="text-[var(--color-muted)]">— {inc.failure_type}</span>
                  {inc.time_to_resolve_seconds && (
                    <span className="ml-auto text-[var(--color-green)]">{inc.time_to_resolve_seconds}s</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default App
