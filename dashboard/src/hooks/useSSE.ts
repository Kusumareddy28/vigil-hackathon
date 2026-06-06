import { useEffect, useRef, useState } from 'react'
import type { ReasoningTrace, SLAStatus, Incident } from '../types'

export function useSSE() {
  const [traces, setTraces] = useState<ReasoningTrace[]>([])
  const [slaUpdates, setSlaUpdates] = useState<Record<string, SLAStatus>>({})
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [connected, setConnected] = useState(false)
  const eventSourceRef = useRef<EventSource | null>(null)

  useEffect(() => {
    const es = new EventSource('/api/events')
    eventSourceRef.current = es

    es.onopen = () => setConnected(true)
    es.onerror = () => setConnected(false)

    es.addEventListener('trace', (e) => {
      const trace: ReasoningTrace = JSON.parse(e.data)
      setTraces((prev) => [trace, ...prev].slice(0, 50))
    })

    es.addEventListener('sla_update', (e) => {
      const update: SLAStatus = JSON.parse(e.data)
      setSlaUpdates((prev) => ({ ...prev, [update.sla_id]: update }))
    })

    es.addEventListener('incident', (e) => {
      const incident: Incident = JSON.parse(e.data)
      setIncidents((prev) => [incident, ...prev].slice(0, 50))
    })

    return () => {
      es.close()
      eventSourceRef.current = null
    }
  }, [])

  return { traces, slaUpdates, incidents, connected }
}
