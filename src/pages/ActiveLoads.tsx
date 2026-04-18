import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { parseLoadIdParam } from '../lib/routeIntents'
import {
  Activity, Truck, CheckCircle, Clock, Circle, Phone, MessageSquare,
  ChevronRight, RefreshCw, Plus, AlertTriangle, FileText, ArrowRight,
} from 'lucide-react'
import { LOAD_STATUS_STYLES, LOAD_STATUS_NEXT } from '../components/loads/constants'
import type { ActiveLoadRow, TimelineEvent, LoadStatus, ClaudeResponse } from '../types/models'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmtRoute(row: ActiveLoadRow): string {
  const o = [row.origin_city, row.origin_state].filter(Boolean).join(', ')
  const d = [row.dest_city, row.dest_state].filter(Boolean).join(', ')
  if (o && d) return `${o} → ${d}`
  if (o) return `From ${o}`
  if (d) return `To ${d}`
  return 'Route unknown'
}

function fmtLoadRef(row: ActiveLoadRow): string {
  return row.load_id ? `#${row.load_id}` : `Load ${row.id}`
}

function fmtTime(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  const tomorrow = new Date(now); tomorrow.setDate(now.getDate() + 1)
  const isTomorrow = d.toDateString() === tomorrow.toDateString()
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
  if (isToday) return time
  if (isTomorrow) return `Tomorrow ${time}`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' ' + time
}

function isOverdue(iso: string | null): boolean {
  if (!iso) return false
  return new Date(iso) < new Date()
}

function hoursUntil(iso: string | null): number | null {
  if (!iso) return null
  return (new Date(iso).getTime() - Date.now()) / 3_600_000
}

function fmtRelative(iso: string | null): string {
  if (!iso) return ''
  const h = hoursUntil(iso)
  if (h === null) return ''
  if (h < 0) {
    const abs = Math.abs(h)
    if (abs < 1) return 'overdue now'
    if (abs < 24) return `overdue ${Math.floor(abs)}h`
    return `overdue ${Math.floor(abs / 24)}d`
  }
  if (h < 1) return `in ${Math.round(h * 60)}m`
  if (h < 24) return `in ${Math.floor(h)}h`
  return `in ${Math.floor(h / 24)}d`
}

type RiskLevel = 'red' | 'yellow' | 'green'

function loadRisk(row: ActiveLoadRow): RiskLevel {
  if (isOverdue(row.next_event_at)) return 'red'
  const h = hoursUntil(row.next_event_at)
  if (h !== null && h >= 0 && h < 4) return 'yellow'
  return 'green'
}

function eventsRisk(pending: TimelineEvent[]): RiskLevel {
  if (pending.some(e => isOverdue(e.scheduled_at))) return 'red'
  if (pending.some(e => { const h = hoursUntil(e.scheduled_at); return h !== null && h >= 0 && h < 4 })) return 'yellow'
  return 'green'
}

const RISK_DOT: Record<RiskLevel, string> = {
  red:    'bg-red-500',
  yellow: 'bg-yellow-400',
  green:  'bg-green-500',
}

// ---------------------------------------------------------------------------
// Status progression for active loads
// ---------------------------------------------------------------------------

const ACTIVE_NEXT: Partial<Record<string, LoadStatus>> = {
  'Booked':     'Picked Up',
  'Picked Up':  'In Transit',
  'In Transit': 'Delivered',
}

const STATUS_COLORS: Record<string, string> = {
  'status':     'text-blue-400',
  'check_call': 'text-orange-400',
  'note':       'text-gray-400',
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function LoadCard({ row, selected, onClick }: { row: ActiveLoadRow; selected: boolean; onClick: () => void }) {
  const statusStyle = LOAD_STATUS_STYLES[row.status as LoadStatus] ?? 'bg-gray-800 text-gray-400'
  const nextOverdue = isOverdue(row.next_event_at)
  const risk        = loadRisk(row)

  return (
    <button
      onClick={onClick}
      className={[
        'w-full text-left px-3 py-3 rounded-lg border transition-all duration-150',
        selected
          ? 'bg-orange-600/15 border-orange-600/50'
          : risk === 'red'
            ? 'bg-red-950/20 border-red-800/40 hover:bg-red-950/30'
            : 'bg-surface-700 border-surface-400 hover:bg-surface-600 hover:border-surface-300',
      ].join(' ')}
    >
      {/* Top row: risk dot + ref + status */}
      <div className='flex items-center justify-between gap-2 mb-1'>
        <div className='flex items-center gap-1.5'>
          <span className={`w-2 h-2 rounded-full shrink-0 ${RISK_DOT[risk]}`} title={
            risk === 'red' ? 'At Risk' : risk === 'yellow' ? 'Watch' : 'On Track'
          } />
          <span className='text-xs font-bold text-gray-200'>{fmtLoadRef(row)}</span>
        </div>
        <span className={`text-2xs px-1.5 py-0.5 rounded border ${statusStyle}`}>{row.status}</span>
      </div>

      {/* Route */}
      <p className='text-2xs text-gray-400 mb-1.5 truncate'>{fmtRoute(row)}</p>

      {/* Driver */}
      <div className='flex items-center gap-1.5 mb-1.5'>
        <Truck size={10} className='text-gray-600 shrink-0' />
        <span className='text-2xs text-gray-500 truncate'>{row.driver_name ?? 'No driver'}</span>
      </div>

      {/* Next event */}
      {row.next_event_label && (
        <div className={`flex items-center gap-1 ${nextOverdue ? 'text-red-400' : risk === 'yellow' ? 'text-yellow-400' : 'text-gray-500'}`}>
          {nextOverdue ? <AlertTriangle size={9} className='shrink-0' /> : <Clock size={9} className='shrink-0' />}
          <span className='text-2xs truncate'>{row.next_event_label}</span>
          {row.next_event_at && (
            <span className='text-2xs ml-auto shrink-0'>{fmtRelative(row.next_event_at)}</span>
          )}
        </div>
      )}
    </button>
  )
}

function TimelineRow({ event, onComplete, onDelete }: {
  event: TimelineEvent
  onComplete: (id: number) => void
  onDelete:   (id: number) => void
}) {
  const done       = Boolean(event.completed_at)
  const overdue    = !done && isOverdue(event.scheduled_at)
  const h          = done ? null : hoursUntil(event.scheduled_at)
  const urgentSoon = !done && !overdue && h !== null && h >= 0 && h < 4

  return (
    <div className={`flex items-start gap-3 py-2.5 border-b border-surface-600 last:border-0 group ${overdue ? 'bg-red-950/10' : ''}`}>
      {/* Icon */}
      <div className='mt-0.5 shrink-0'>
        {done ? (
          <CheckCircle size={14} className='text-green-500' />
        ) : overdue ? (
          <AlertTriangle size={14} className='text-red-400' />
        ) : urgentSoon ? (
          <Clock size={14} className='text-orange-400' />
        ) : (
          <Circle size={14} className={`${STATUS_COLORS[event.event_type] ?? 'text-gray-500'}`} />
        )}
      </div>

      {/* Content */}
      <div className='flex-1 min-w-0'>
        <div className='flex items-center gap-2'>
          <span className={`text-xs font-medium ${done ? 'text-gray-600 line-through' : overdue ? 'text-red-300' : urgentSoon ? 'text-orange-200' : 'text-gray-200'}`}>
            {event.label}
          </span>
          <span className='text-2xs text-gray-600 uppercase tracking-wide'>{event.event_type.replace('_', ' ')}</span>
        </div>
        {event.scheduled_at && (
          <p className={`text-2xs mt-0.5 ${done ? 'text-gray-700' : overdue ? 'text-red-400' : urgentSoon ? 'text-orange-400' : 'text-gray-500'}`}>
            {done
              ? 'Completed ' + fmtTime(event.completed_at)
              : fmtTime(event.scheduled_at) + (event.scheduled_at ? ' · ' + fmtRelative(event.scheduled_at) : '')}
          </p>
        )}
        {event.notes && (
          <p className='text-2xs text-gray-500 mt-0.5 italic'>{event.notes}</p>
        )}
      </div>

      {/* Actions — visible on hover */}
      {!done && (
        <div className='flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0'>
          <button
            onClick={() => onComplete(event.id)}
            className='text-2xs px-1.5 py-0.5 rounded bg-green-900/40 text-green-400 border border-green-800/50 hover:bg-green-900/70 transition-colors'
          >Done</button>
          <button
            onClick={() => onDelete(event.id)}
            className='text-2xs px-1 py-0.5 rounded text-gray-600 hover:text-red-400 transition-colors'
          >x</button>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function ActiveLoads() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [loads,        setLoads]        = useState<ActiveLoadRow[]>([])
  const [selected,     setSelected]     = useState<ActiveLoadRow | null>(null)
  const [events,       setEvents]       = useState<TimelineEvent[]>([])
  const [loading,      setLoading]      = useState(true)
  const [eventsLoad,   setEventsLoad]   = useState(false)

  // Status change form
  const [newStatus,       setNewStatus]       = useState<LoadStatus | ''>('')
  const [statusNote,      setStatusNote]      = useState('')
  const [statusSaving,    setStatusSaving]    = useState(false)
  const [deliveredLoadId, setDeliveredLoadId] = useState<number | null>(null)

  // Add note form
  const [noteText,     setNoteText]     = useState('')
  const [addingNote,   setAddingNote]   = useState(false)

  // AI message
  const [aiMsg,        setAiMsg]        = useState<string | null>(null)
  const [aiLoading,    setAiLoading]    = useState(false)
  const [aiType,       setAiType]       = useState<string | null>(null)

  // ── Data fetch ────────────────────────────────────────────────────────────

  const refresh = useCallback(async () => {
    setLoading(true)
    const rows = await window.api.timeline.activeLoads()
    setLoads(rows)
    setLoading(false)
    // Re-select the same load if it's still active
    if (selected) {
      const updated = rows.find(r => r.id === selected.id) ?? null
      setSelected(updated)
    }
  }, [selected])

  useEffect(() => { refresh() }, [])

  const fetchEvents = useCallback(async (loadId: number) => {
    setEventsLoad(true)
    const evs = await window.api.timeline.events(loadId)
    setEvents(evs)
    setEventsLoad(false)
  }, [])

  useEffect(() => {
    if (selected) fetchEvents(selected.id)
    else setEvents([])
    setNewStatus('')
    setStatusNote('')
    setAiMsg(null)
    setAiType(null)
  }, [selected?.id])

  // ── Actions ───────────────────────────────────────────────────────────────

  const handleSelect = (row: ActiveLoadRow) => {
    if (selected?.id === row.id) { setSelected(null); return }
    // Auto-init timeline if this load has no events yet
    if (!row.next_event_label) {
      window.api.timeline.initLoad(row.id).then(() => fetchEvents(row.id))
    }
    setSelected(row)
  }

  // Auto-select a specific load when navigated with ?load_id=X
  useEffect(() => {
    const id = parseLoadIdParam(searchParams)
    if (!id || !loads.length) return
    const match = loads.find(r => r.id === id)
    if (match && selected?.id !== id) handleSelect(match)
  // handleSelect is stable within the render; loads/searchParams drive re-runs
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loads, searchParams])

  const handleComplete = async (eventId: number) => {
    await window.api.timeline.completeEvent(eventId)
    if (selected) fetchEvents(selected.id)
  }

  const handleScheduleCheckCall = async (hoursFromNow: number) => {
    if (!selected) return
    const at = new Date(Date.now() + hoursFromNow * 3600000).toISOString()
    await window.api.timeline.addEvent(selected.id, 'check_call', `Check call — ${selected.driver_name ?? 'driver'}`, at, null)
    fetchEvents(selected.id)
  }

  const handleDelete = async (eventId: number) => {
    await window.api.timeline.deleteEvent(eventId)
    if (selected) fetchEvents(selected.id)
  }

  const handleStatusChange = async () => {
    if (!selected || !newStatus) return
    const wasDelivered = newStatus === 'Delivered'
    const loadId = selected.id
    setStatusSaving(true)
    await window.api.timeline.statusChange(loadId, newStatus, statusNote || null)
    setStatusSaving(false)
    setNewStatus('')
    setStatusNote('')
    await refresh()
    if (selected) fetchEvents(selected.id)
    if (wasDelivered) setDeliveredLoadId(loadId)
  }

  const handleAddNote = async () => {
    if (!selected || !noteText.trim()) return
    setAddingNote(true)
    await window.api.timeline.addEvent(selected.id, 'note', noteText.trim(), null, null)
    setNoteText('')
    setAddingNote(false)
    fetchEvents(selected.id)
  }

  const handleAiMessage = async (messageType: string) => {
    if (!selected) return
    setAiLoading(true)
    setAiType(messageType)
    setAiMsg(null)
    const res: ClaudeResponse = await window.api.timeline.generateMessage({
      driverName: selected.driver_name ?? 'driver',
      route:      fmtRoute(selected),
      messageType,
    })
    setAiMsg(res.ok ? res.content : null)
    setAiLoading(false)
  }

  // ── Derived ───────────────────────────────────────────────────────────────

  const pending    = events.filter(e => !e.completed_at)
  const completed  = events.filter(e => e.completed_at)
  const nextEvent  = pending[0] ?? null
  const upcomingEvents = pending.slice(1, 3)
  const nextStatus = selected ? ACTIVE_NEXT[selected.status] ?? null : null

  const loadHealth  = selected && !eventsLoad ? eventsRisk(pending) : 'green'
  const healthLabel = loadHealth === 'red' ? 'At Risk' : loadHealth === 'yellow' ? 'Watch' : 'On Track'
  const healthCls   = loadHealth === 'red'
    ? 'text-red-400 border-red-800/40 bg-red-950/20'
    : loadHealth === 'yellow'
      ? 'text-yellow-400 border-yellow-800/40 bg-yellow-950/20'
      : 'text-green-400 border-green-800/40 bg-green-950/20'

  const msgLabels: Record<string, string> = {
    check_in:        'Driver Check-In',
    broker_update:   'Broker Update',
    pod_request:     'Request POD',
    delivery_confirm:'Delivery Confirm',
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className='flex gap-4 h-[calc(100vh-4rem)] animate-fade-in'>

      {/* ── LEFT: Load list ─────────────────────────────────────────────── */}
      <div className='w-64 shrink-0 flex flex-col gap-3'>

        {/* Header */}
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-2'>
            <Activity size={16} className='text-orange-500' />
            <h1 className='text-sm font-semibold text-gray-200'>Active Loads</h1>
          </div>
          <button
            onClick={refresh}
            className='text-gray-600 hover:text-gray-300 transition-colors'
            title='Refresh'
          >
            <RefreshCw size={13} />
          </button>
        </div>

        {/* Global status */}
        {!loading && loads.length === 0 && (
          <p className='text-2xs text-gray-600'>No active loads</p>
        )}
        {!loading && loads.length > 0 && (() => {
          const needAttn = loads.filter(r => loadRisk(r) !== 'green').length
          return (
            <p className={`text-2xs font-medium ${needAttn > 0 ? 'text-red-400' : 'text-green-500'}`}>
              {needAttn > 0
                ? `${needAttn} load${needAttn !== 1 ? 's' : ''} need attention`
                : 'All loads on track'}
            </p>
          )
        })()}

        {/* List */}
        <div className='flex-1 overflow-y-auto space-y-2 pr-1'>
          {loading ? (
            <p className='text-xs text-gray-600 italic'>Loading...</p>
          ) : loads.length === 0 ? (
            <div className='text-center py-8'>
              <Truck size={28} className='text-gray-700 mx-auto mb-2' />
              <p className='text-xs text-gray-600'>No loads in transit</p>
              <button
                onClick={() => navigate('/loads')}
                className='mt-3 text-2xs text-orange-500 hover:text-orange-400 underline'
              >Open Loads</button>
            </div>
          ) : (
            loads.map(row => (
              <LoadCard
                key={row.id}
                row={row}
                selected={selected?.id === row.id}
                onClick={() => handleSelect(row)}
              />
            ))
          )}
        </div>
      </div>

      {/* ── RIGHT: Timeline + actions ───────────────────────────────────── */}
      {selected ? (
        <div className='flex-1 flex flex-col gap-4 overflow-y-auto min-w-0'>

          {/* Load header */}
          <div className='bg-surface-700 rounded-xl border border-surface-400 shadow-card px-5 py-4'>
            <div className='flex items-start justify-between gap-4'>
              <div>
                <div className='flex items-center gap-2 mb-0.5'>
                  <span className='text-xs font-bold text-gray-200'>{fmtLoadRef(selected)}</span>
                  <span className={`text-2xs px-1.5 py-0.5 rounded border ${LOAD_STATUS_STYLES[selected.status as LoadStatus] ?? ''}`}>
                    {selected.status}
                  </span>
                  {!eventsLoad && (
                    <span className={`text-2xs px-1.5 py-0.5 rounded border ${healthCls}`}>
                      {healthLabel}
                    </span>
                  )}
                </div>
                <p className='text-sm font-semibold text-gray-100'>{fmtRoute(selected)}</p>
                <div className='flex items-center gap-4 mt-1 text-2xs text-gray-500'>
                  {selected.driver_name  && <span className='flex items-center gap-1'><Truck size={9}/> {selected.driver_name}</span>}
                  {selected.driver_phone && <span className='flex items-center gap-1'><Phone size={9}/> {selected.driver_phone}</span>}
                  {selected.broker_name  && <span>{selected.broker_name}</span>}
                  {selected.rate         && <span>${selected.rate.toLocaleString()}</span>}
                  {selected.miles        && <span>{selected.miles.toLocaleString()} mi</span>}
                </div>
              </div>
              {selected.driver_phone && (
                <a
                  href={`tel:${selected.driver_phone}`}
                  className='flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-xs font-medium transition-colors shrink-0'
                >
                  <Phone size={13} /> Call Driver
                </a>
              )}
            </div>
          </div>

          {/* Next Action panel */}
          {nextEvent && (
            <div className={`rounded-xl border px-4 py-3 ${
              isOverdue(nextEvent.scheduled_at)
                ? 'bg-red-950/30 border-red-800/40'
                : 'bg-orange-950/30 border-orange-800/40'
            }`}>
              <div className='flex items-center gap-2 mb-1'>
                {isOverdue(nextEvent.scheduled_at)
                  ? <AlertTriangle size={13} className='text-red-400' />
                  : <Clock size={13} className='text-orange-400' />
                }
                <p className='text-2xs font-semibold uppercase tracking-wider text-gray-400'>Next Action</p>
              </div>
              <p className={`text-sm font-semibold ${isOverdue(nextEvent.scheduled_at) ? 'text-red-300' : 'text-gray-100'}`}>
                {nextEvent.event_type === 'check_call' ? 'Check call: ' : ''}{nextEvent.label}
              </p>
              {nextEvent.scheduled_at && (
                <p className='text-2xs text-gray-500 mt-0.5'>
                  Scheduled {fmtTime(nextEvent.scheduled_at)}
                  {isOverdue(nextEvent.scheduled_at) && ' — overdue'}
                </p>
              )}
              <div className='flex gap-2 mt-2.5 flex-wrap'>
                <button
                  onClick={() => handleComplete(nextEvent.id)}
                  className='text-2xs px-2.5 py-1 rounded-lg bg-green-900/50 text-green-400 border border-green-800/50 hover:bg-green-900/80 transition-colors'
                >
                  Mark Done
                </button>
                {nextEvent.event_type === 'check_call' && (
                  <button
                    onClick={async () => { await handleComplete(nextEvent.id); handleScheduleCheckCall(4) }}
                    className='text-2xs px-2.5 py-1 rounded-lg bg-orange-900/40 text-orange-400 border border-orange-800/50 hover:bg-orange-900/70 transition-colors'
                  >
                    Done + Schedule Next in 4h
                  </button>
                )}
                {selected.driver_phone && (
                  <a
                    href={`tel:${selected.driver_phone}`}
                    className='text-2xs px-2.5 py-1 rounded-lg bg-surface-600 text-gray-300 border border-surface-400 hover:bg-surface-500 transition-colors flex items-center gap-1'
                  >
                    <Phone size={10} /> Call Driver
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Coming up next */}
          {nextEvent && upcomingEvents.length > 0 && (
            <div className='flex flex-col gap-1.5 px-4 py-2.5 bg-surface-700 rounded-xl border border-surface-500'>
              <p className='text-2xs font-semibold text-gray-600 uppercase tracking-wider'>Coming up next</p>
              {upcomingEvents.map(ev => {
                const evH = hoursUntil(ev.scheduled_at)
                const soon = evH !== null && evH >= 0 && evH < 4
                return (
                  <div key={ev.id} className='flex items-center gap-2'>
                    <Clock size={9} className={soon ? 'text-orange-400 shrink-0' : 'text-gray-600 shrink-0'} />
                    <span className={`text-2xs ${soon ? 'text-orange-300' : 'text-gray-500'}`}>{ev.label}</span>
                    {ev.scheduled_at && (
                      <span className={`text-2xs ml-auto shrink-0 ${soon ? 'text-orange-400' : 'text-gray-600'}`}>
                        {fmtRelative(ev.scheduled_at)}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* Quick schedule — shown when no pending check call exists */}
          {!nextEvent && selected.status !== 'Delivered' && (
            <div className='flex items-center gap-2'>
              <span className='text-xs text-gray-500'>Schedule check call:</span>
              {[2, 4, 8].map(h => (
                <button
                  key={h}
                  onClick={() => handleScheduleCheckCall(h)}
                  className='text-2xs px-2 py-0.5 rounded-lg bg-surface-600 hover:bg-orange-900/40 text-gray-400 hover:text-orange-400 border border-surface-400 hover:border-orange-800/50 transition-colors'
                >
                  +{h}h
                </button>
              ))}
            </div>
          )}

          {/* Timeline */}
          <div className='bg-surface-700 rounded-xl border border-surface-400 shadow-card'>
            <div className='flex items-center gap-2 px-5 py-3 border-b border-surface-400'>
              <Activity size={13} className='text-orange-500' />
              <h2 className='text-xs font-semibold text-gray-200'>Timeline</h2>
              <span className='text-2xs text-gray-600 ml-1'>
                {pending.length} pending · {completed.length} completed
              </span>
            </div>

            {eventsLoad ? (
              <p className='text-xs text-gray-600 italic px-5 py-4'>Loading events...</p>
            ) : events.length === 0 ? (
              <div className='px-5 py-4'>
                <p className='text-xs text-gray-600 italic mb-2'>No timeline events yet.</p>
                <button
                  onClick={() => window.api.timeline.initLoad(selected.id).then(() => fetchEvents(selected.id))}
                  className='text-2xs px-2 py-1 rounded bg-surface-600 text-gray-400 border border-surface-400 hover:text-gray-200 transition-colors'
                >
                  Initialize Timeline
                </button>
              </div>
            ) : (
              <div className='px-5 py-2 divide-y-0'>
                {/* Pending events first */}
                {pending.map(ev => (
                  <TimelineRow key={ev.id} event={ev} onComplete={handleComplete} onDelete={handleDelete} />
                ))}
                {/* Completed events */}
                {completed.length > 0 && (
                  <>
                    {pending.length > 0 && (
                      <div className='py-1.5 flex items-center gap-2'>
                        <div className='h-px flex-1 bg-surface-600' />
                        <span className='text-2xs text-gray-700'>Completed</span>
                        <div className='h-px flex-1 bg-surface-600' />
                      </div>
                    )}
                    {completed.map(ev => (
                      <TimelineRow key={ev.id} event={ev} onComplete={handleComplete} onDelete={handleDelete} />
                    ))}
                  </>
                )}
              </div>
            )}

            {/* Add note */}
            <div className='px-5 py-3 border-t border-surface-400'>
              <div className='flex gap-2'>
                <input
                  type='text'
                  value={noteText}
                  onChange={e => setNoteText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleAddNote() }}
                  placeholder='Add a note...'
                  className='flex-1 text-xs bg-surface-600 border border-surface-400 rounded-lg px-3 py-1.5 text-gray-200 placeholder-gray-700 focus:outline-none focus:border-orange-600/60'
                />
                <button
                  onClick={handleAddNote}
                  disabled={!noteText.trim() || addingNote}
                  className='p-1.5 rounded-lg bg-surface-600 border border-surface-400 text-gray-400 hover:text-gray-200 disabled:opacity-40 transition-colors'
                >
                  <Plus size={13} />
                </button>
              </div>
            </div>
          </div>

          {/* Status Update */}
          <div className='bg-surface-700 rounded-xl border border-surface-400 shadow-card px-5 py-4'>
            <h2 className='text-xs font-semibold text-gray-200 mb-3 flex items-center gap-2'>
              <ArrowRight size={13} className='text-orange-500' /> Update Status
            </h2>
            <div className='flex gap-2 flex-wrap'>
              {nextStatus ? (
                <button
                  onClick={() => setNewStatus(nextStatus)}
                  className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                    newStatus === nextStatus
                      ? 'bg-orange-600 text-white border-orange-600'
                      : 'bg-surface-600 text-gray-300 border-surface-400 hover:border-orange-600/50'
                  }`}
                >
                  Mark as {nextStatus}
                </button>
              ) : null}
              {/* Allow delivered/completed regardless */}
              {!['Delivered', 'Completed'].includes(selected.status) && nextStatus !== 'Delivered' && (
                <button
                  onClick={() => setNewStatus('Delivered')}
                  className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                    newStatus === 'Delivered'
                      ? 'bg-teal-700 text-white border-teal-700'
                      : 'bg-surface-600 text-gray-300 border-surface-400 hover:border-teal-700/50'
                  }`}
                >
                  Mark Delivered
                </button>
              )}
            </div>
            {newStatus && (
              <div className='mt-3 flex flex-col gap-2'>
                <input
                  type='text'
                  value={statusNote}
                  onChange={e => setStatusNote(e.target.value)}
                  placeholder='Optional note...'
                  className='text-xs bg-surface-600 border border-surface-400 rounded-lg px-3 py-1.5 text-gray-200 placeholder-gray-700 focus:outline-none focus:border-orange-600/60'
                />
                <div className='flex gap-2'>
                  <button
                    onClick={handleStatusChange}
                    disabled={statusSaving}
                    className='text-xs px-4 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-700 text-white font-medium disabled:opacity-50 transition-colors'
                  >
                    {statusSaving ? 'Saving...' : `Confirm — ${newStatus}`}
                  </button>
                  <button
                    onClick={() => { setNewStatus(''); setStatusNote('') }}
                    className='text-xs px-3 py-1.5 rounded-lg bg-surface-600 text-gray-400 border border-surface-400 hover:text-gray-200 transition-colors'
                  >Cancel</button>
                </div>
              </div>
            )}
          </div>

          {/* AI Message Helpers */}
          <div className='bg-surface-700 rounded-xl border border-surface-400 shadow-card px-5 py-4'>
            <h2 className='text-xs font-semibold text-gray-200 mb-3 flex items-center gap-2'>
              <MessageSquare size={13} className='text-orange-500' /> Message Helpers
            </h2>
            <div className='flex gap-2 flex-wrap mb-3'>
              {(['check_in', 'broker_update', 'pod_request', 'delivery_confirm'] as const).map(type => (
                <button
                  key={type}
                  onClick={() => handleAiMessage(type)}
                  disabled={aiLoading}
                  className={`text-2xs px-2.5 py-1 rounded-lg border transition-colors disabled:opacity-40 ${
                    aiType === type && aiLoading
                      ? 'bg-orange-600/20 border-orange-600/50 text-orange-400'
                      : 'bg-surface-600 text-gray-400 border-surface-400 hover:text-gray-200 hover:border-surface-300'
                  }`}
                >
                  {msgLabels[type]}
                </button>
              ))}
            </div>
            {aiLoading && (
              <p className='text-2xs text-gray-600 italic'>Generating message...</p>
            )}
            {aiMsg && !aiLoading && (
              <div className='bg-surface-600 rounded-lg px-3 py-2.5 border border-surface-400'>
                <p className='text-xs text-gray-200 leading-relaxed whitespace-pre-wrap'>{aiMsg}</p>
                <button
                  onClick={() => navigator.clipboard.writeText(aiMsg)}
                  className='mt-2 text-2xs text-gray-600 hover:text-orange-400 transition-colors flex items-center gap-1'
                >
                  <FileText size={9} /> Copy
                </button>
              </div>
            )}
            {!aiLoading && !aiMsg && (
              <p className='text-2xs text-gray-700 italic'>Select a template to generate a message.</p>
            )}
          </div>

        </div>
      ) : (
        /* Empty state — or post-delivery invoice prompt */
        <div className='flex-1 flex items-center justify-center'>
          {deliveredLoadId ? (
            <div className='max-w-sm w-full mx-auto rounded-xl border border-teal-700/50 bg-teal-950/30 p-6 text-center space-y-4'>
              <CheckCircle size={32} className='text-teal-400 mx-auto' />
              <div>
                <p className='text-sm font-semibold text-teal-300'>Load marked as Delivered</p>
                <p className='text-xs text-gray-500 mt-1'>Ready to send the invoice to the broker?</p>
              </div>
              <div className='flex items-center justify-center gap-3'>
                <button
                  onClick={() => navigate(`/invoices?new=1&load_id=${deliveredLoadId}`)}
                  className='text-xs px-4 py-2 rounded-lg bg-teal-700 hover:bg-teal-600 text-white font-medium transition-colors'
                >
                  Create Invoice
                </button>
                <button
                  onClick={() => setDeliveredLoadId(null)}
                  className='text-xs text-gray-500 hover:text-gray-300 transition-colors'
                >
                  Later
                </button>
              </div>
            </div>
          ) : (
            <div className='text-center'>
              <Activity size={36} className='text-gray-700 mx-auto mb-3' />
              <p className='text-sm text-gray-500 font-medium'>Select a load</p>
              <p className='text-xs text-gray-700 mt-1'>to view its timeline and check call schedule</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
