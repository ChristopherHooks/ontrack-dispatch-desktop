import { useState, useEffect, useMemo } from 'react'
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react'
import type { Load, Driver } from '../types/models'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function addDays(base: Date, n: number): Date {
  const d = new Date(base)
  d.setDate(d.getDate() + n)
  return d
}

function toYMD(d: Date): string {
  return d.toISOString().split('T')[0]
}

function parseYMD(s: string): Date {
  const [y, m, day] = s.split('-').map(Number)
  return new Date(y, m - 1, day)
}

function daysBetween(a: string, b: string): number {
  return Math.round((parseYMD(b).getTime() - parseYMD(a).getTime()) / 86_400_000)
}

function fmt(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function fmtDate(ymd: string): string {
  return fmt(parseYMD(ymd))
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUS_COLOR: Record<string, string> = {
  Searching:   'bg-gray-600/60 border-gray-500',
  Booked:      'bg-blue-700/50 border-blue-600',
  'Picked Up': 'bg-orange-700/50 border-orange-600',
  'In Transit':'bg-orange-600/60 border-orange-500',
  Delivered:   'bg-green-700/50 border-green-600',
  Invoiced:    'bg-purple-700/50 border-purple-600',
  Paid:        'bg-green-900/40 border-green-800',
}

// Statuses that mean a load is currently moving / actively assigned
const ACTIVE_STATUSES  = new Set(['Booked', 'Picked Up', 'In Transit'])
// Statuses that mean a driver is on a live load (used for availability derivation)
const MOVING_STATUSES  = new Set(['Picked Up', 'In Transit'])

const DAYS_TO_SHOW = 14
const COL_W        = 58   // px per day column
const ROW_H        = 52   // px per driver row
const LABEL_W      = 172  // px for driver name column

// ---------------------------------------------------------------------------
// Row type
// ---------------------------------------------------------------------------

type RowType = 'assigned' | 'idle' | 'unassigned'
interface GridRow { id: number | null; label: string; type: RowType }

// ---------------------------------------------------------------------------
// Summary pill
// ---------------------------------------------------------------------------

function SummaryPill({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className='flex items-center gap-1.5'>
      <span className={`text-sm font-bold tabular-nums ${color}`}>{value}</span>
      <span className='text-2xs text-gray-600'>{label}</span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DispatchCalendar() {
  const [loads,   setLoads]   = useState<Load[]>([])
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [loading, setLoading] = useState(true)
  const [weekStart, setWeekStart] = useState<Date>(() => {
    const d = new Date()
    d.setDate(d.getDate() - d.getDay()) // Sunday of current week
    d.setHours(0, 0, 0, 0)
    return d
  })
  const [hoveredLoad, setHoveredLoad] = useState<Load | null>(null)

  useEffect(() => {
    Promise.all([window.api.loads.list(), window.api.drivers.list()])
      .then(([l, d]) => { setLoads(l); setDrivers(d); setLoading(false) })
  }, [])

  // Day columns for the current window
  const days = useMemo(() =>
    Array.from({ length: DAYS_TO_SHOW }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  )
  const dayStrings  = useMemo(() => days.map(toYMD), [days])
  const windowStart = dayStrings[0]
  const windowEnd   = dayStrings[DAYS_TO_SHOW - 1]
  const today       = toYMD(new Date())

  // Loads that overlap this window and are worth showing
  const visibleLoads = useMemo(() => {
    return loads.filter(l => {
      if (!['Booked', 'Picked Up', 'In Transit', 'Delivered', 'Invoiced'].includes(l.status)) return false
      const start = l.pickup_date   ?? l.created_at.slice(0, 10)
      const end   = l.delivery_date ?? start
      return start <= windowEnd && end >= windowStart
    })
  }, [loads, windowStart, windowEnd])

  // Group loads by driver_id
  const loadsByDriver = useMemo(() => {
    const map = new Map<number | null, Load[]>()
    for (const l of visibleLoads) {
      const key = l.driver_id ?? null
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(l)
    }
    return map
  }, [visibleLoads])

  // Row groups: assigned drivers (with loads in window), idle Active drivers, unassigned loads
  const { assignedDrivers, idleDrivers } = useMemo(() => {
    const assigned = drivers
      .filter(d => loadsByDriver.has(d.id))
      .sort((a, b) => a.name.localeCompare(b.name))
    const idle = drivers
      .filter(d => d.status === 'Active' && !loadsByDriver.has(d.id))
      .sort((a, b) => a.name.localeCompare(b.name))
    return { assignedDrivers: assigned, idleDrivers: idle }
  }, [drivers, loadsByDriver])

  const hasUnassigned = loadsByDriver.has(null)

  const allRows = useMemo<GridRow[]>(() => [
    ...assignedDrivers.map(d => ({ id: d.id,   label: d.name,        type: 'assigned'   as RowType })),
    ...idleDrivers.map(d    => ({ id: d.id,     label: d.name,        type: 'idle'       as RowType })),
    ...(hasUnassigned       ? [{ id: null,       label: 'Unassigned',  type: 'unassigned' as RowType }] : []),
  ], [assignedDrivers, idleDrivers, hasUnassigned])

  // Per-day pickup/delivery event counts — used for day-header dots
  const dayEventCounts = useMemo(() => {
    const pickups:    Record<string, number> = {}
    const deliveries: Record<string, number> = {}
    for (const l of visibleLoads) {
      if (l.pickup_date   && dayStrings.includes(l.pickup_date))
        pickups[l.pickup_date]       = (pickups[l.pickup_date]       ?? 0) + 1
      if (l.delivery_date && dayStrings.includes(l.delivery_date))
        deliveries[l.delivery_date]  = (deliveries[l.delivery_date]  ?? 0) + 1
    }
    return { pickups, deliveries }
  }, [visibleLoads, dayStrings])

  // Global summary counts (all loads, not just visible window)
  const summary = useMemo(() => {
    const pickupsToday    = loads.filter(l => l.pickup_date   === today).length
    const deliveriesToday = loads.filter(l => l.delivery_date === today).length
    const activeNow       = loads.filter(l => ACTIVE_STATUSES.has(l.status)).length
    // Drivers whose last moving load delivers within 3 days
    const soonFreeCount = drivers.filter(d => {
      if (d.status !== 'Active') return false
      const movingLoads = loads.filter(l => l.driver_id === d.id && MOVING_STATUSES.has(l.status))
      if (movingLoads.length === 0) return false
      const maxDelivery = movingLoads
        .map(l => l.delivery_date)
        .filter((x): x is string => x != null)
        .sort().at(-1)
      if (!maxDelivery) return false
      return maxDelivery >= today && maxDelivery <= toYMD(addDays(new Date(), 3))
    }).length
    return { pickupsToday, deliveriesToday, activeNow, soonFreeCount }
  }, [loads, drivers, today])

  // Per-driver: expected availability date (last delivery_date of moving loads)
  // Used to render "available after delivery" bands + label badges
  const driverAvailability = useMemo(() => {
    const map = new Map<number, string>() // driver_id → YYYY-MM-DD
    for (const d of drivers) {
      if (d.status !== 'Active') continue
      const movingLoads = loads.filter(l => l.driver_id === d.id && MOVING_STATUSES.has(l.status))
      if (movingLoads.length === 0) continue
      const maxDelivery = movingLoads
        .map(l => l.delivery_date)
        .filter((x): x is string => x != null)
        .sort().at(-1)
      if (maxDelivery) map.set(d.id, maxDelivery)
    }
    return map
  }, [loads, drivers])

  const nav = (delta: number) => setWeekStart(d => addDays(d, delta * 7))
  const goToday = () => {
    const d = new Date()
    d.setDate(d.getDate() - d.getDay())
    d.setHours(0, 0, 0, 0)
    setWeekStart(d)
  }

  if (loading) {
    return <div className='flex items-center justify-center h-full text-gray-600 text-sm'>Loading timeline...</div>
  }

  // ── Render helpers ─────────────────────────────────────────────────────────

  function renderBar(load: Load) {
    const start = load.pickup_date   ?? load.created_at.slice(0, 10)
    const end   = load.delivery_date ?? start

    const clampedStart = start < windowStart ? windowStart : start
    const clampedEnd   = end   > windowEnd   ? windowEnd   : end

    const offsetDays = daysBetween(windowStart, clampedStart)
    const spanDays   = daysBetween(clampedStart, clampedEnd) + 1
    const left       = offsetDays * COL_W
    const width      = Math.max(spanDays * COL_W - 4, COL_W - 4)

    // Stale: still In Transit / Picked Up past delivery_date
    const isStale = !!load.delivery_date && load.delivery_date < today && MOVING_STATUSES.has(load.status)

    const colorCls = isStale
      ? 'bg-red-900/50 border-red-600'
      : (STATUS_COLOR[load.status] ?? 'bg-surface-600 border-surface-400')

    const route    = [load.origin_state, load.dest_state].filter(Boolean).join(' → ')
    const isHovered = hoveredLoad?.id === load.id

    // Dot at bar-start when pickup_date is in this window (not clipped from left)
    const showPickupDot   = !!load.pickup_date   && start >= windowStart
    // Dot at bar-end when delivery_date is in this window (not clipped from right)
    const showDeliveryDot = !!load.delivery_date && end   <= windowEnd

    return (
      <div
        key={load.id}
        onMouseEnter={() => setHoveredLoad(load)}
        onMouseLeave={() => setHoveredLoad(null)}
        className={[
          'absolute h-8 rounded-md border text-2xs font-medium',
          'flex items-center gap-1 px-2 cursor-default overflow-hidden select-none transition-opacity',
          colorCls,
          isHovered ? 'z-20 opacity-100 ring-1 ring-white/20' : 'z-10 opacity-90',
        ].join(' ')}
        style={{ top: 10, left: left + 2, width }}
        title={`${load.load_id ?? 'No ref'} · ${route || '—'} · ${load.status}${isStale ? ' · OVERDUE' : ''}`}
      >
        {/* Pickup event dot */}
        {showPickupDot && (
          <span className='shrink-0 w-1.5 h-1.5 rounded-full bg-blue-300/80' title='Pickup' />
        )}

        <span className='truncate flex-1 leading-none'>
          {load.load_id ? `${load.load_id}${route ? ' · ' + route : ''}` : route || load.status}
        </span>

        {/* Delivery event dot */}
        {showDeliveryDot && (
          <span className='shrink-0 w-1.5 h-1.5 rounded-full bg-green-300/80' title='Delivery' />
        )}

        {/* Stale indicator */}
        {isStale && (
          <span className='shrink-0 text-red-300 font-bold text-[10px] leading-none'>!</span>
        )}
      </div>
    )
  }

  // Pale green band: days after delivery_date → end of window, for assigned drivers
  function renderAvailableBand(driverId: number) {
    const availDate = driverAvailability.get(driverId)
    // Don't render if no delivery or delivery is past (stale), or delivery is at/beyond window end
    if (!availDate || availDate < today || availDate >= windowEnd) return null

    const dayAfter   = toYMD(addDays(parseYMD(availDate), 1))
    const bandStart  = dayAfter < windowStart ? windowStart : dayAfter
    if (bandStart > windowEnd) return null

    const offsetDays = daysBetween(windowStart, bandStart)
    const spanDays   = daysBetween(bandStart, windowEnd) + 1
    const left       = offsetDays * COL_W
    const width      = spanDays  * COL_W

    return (
      <div
        className='absolute top-0 h-full bg-green-900/10 border-l border-green-800/30 flex items-center px-2 pointer-events-none select-none'
        style={{ left, width }}
      >
        <span className='text-2xs text-green-700 whitespace-nowrap'>free {fmtDate(availDate)}</span>
      </div>
    )
  }

  // ── Layout ──────────────────────────────────────────────────────────────────

  return (
    <div className='flex flex-col h-full overflow-hidden'>

      {/* Header */}
      <div className='px-5 py-3 border-b border-surface-600 flex items-center gap-3 shrink-0'>
        <Calendar size={16} className='text-orange-400' />
        <h1 className='text-sm font-semibold text-gray-100'>Dispatch Timeline</h1>
        <div className='flex items-center gap-1.5 ml-auto'>
          <button
            onClick={goToday}
            className='px-3 h-7 text-xs rounded-lg bg-surface-600 hover:bg-surface-500 border border-surface-400 text-gray-300 transition-colors'
          >
            Today
          </button>
          <button onClick={() => nav(-1)} className='p-1.5 rounded-lg hover:bg-surface-600 text-gray-500 hover:text-gray-300 transition-colors'>
            <ChevronLeft size={16} />
          </button>
          <span className='text-xs text-gray-400 min-w-[140px] text-center'>
            {fmt(weekStart)} — {fmt(addDays(weekStart, DAYS_TO_SHOW - 1))}
          </span>
          <button onClick={() => nav(1)} className='p-1.5 rounded-lg hover:bg-surface-600 text-gray-500 hover:text-gray-300 transition-colors'>
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Summary strip */}
      <div className='px-5 py-2 border-b border-surface-600 flex items-center gap-5 flex-wrap shrink-0 bg-surface-800/40'>
        <SummaryPill label='pickups today'    value={summary.pickupsToday}    color='text-blue-400'   />
        <SummaryPill label='deliveries today' value={summary.deliveriesToday}  color='text-green-400'  />
        <SummaryPill label='on the road'      value={summary.activeNow}        color='text-orange-400' />
        {summary.soonFreeCount > 0 && (
          <SummaryPill
            label={`driver${summary.soonFreeCount !== 1 ? 's' : ''} free in ≤3 days`}
            value={summary.soonFreeCount}
            color='text-green-300'
          />
        )}
        {idleDrivers.length > 0 && (
          <SummaryPill label='idle now' value={idleDrivers.length} color='text-gray-400' />
        )}
      </div>

      {/* Hover tooltip */}
      {hoveredLoad && (
        <div className='fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl bg-surface-700 border border-surface-400 shadow-xl text-xs text-gray-200 flex items-center gap-4 pointer-events-none'>
          <span className='font-semibold text-orange-400'>{hoveredLoad.load_id ?? 'No ref'}</span>
          <span>
            {[hoveredLoad.origin_city, hoveredLoad.origin_state].filter(Boolean).join(', ')}
            {' → '}
            {[hoveredLoad.dest_city, hoveredLoad.dest_state].filter(Boolean).join(', ')}
          </span>
          {hoveredLoad.rate != null && (
            <span className='text-green-400 font-mono'>${hoveredLoad.rate.toLocaleString()}</span>
          )}
          <span className={`px-2 py-0.5 rounded-full text-2xs border ${STATUS_COLOR[hoveredLoad.status] ?? ''}`}>
            {hoveredLoad.status}
          </span>
          {hoveredLoad.pickup_date   && <span className='text-gray-500'>Pickup: {hoveredLoad.pickup_date}</span>}
          {hoveredLoad.delivery_date && <span className='text-gray-500'>Del: {hoveredLoad.delivery_date}</span>}
        </div>
      )}

      {/* Grid */}
      <div className='flex-1 overflow-auto'>
        <div className='inline-flex min-w-full'>

          {/* Left: driver labels — sticky */}
          <div className='shrink-0 sticky left-0 z-30 bg-surface-800' style={{ width: LABEL_W }}>
            {/* Header spacer */}
            <div className='h-10 border-b border-r border-surface-600' />

            {allRows.map(row => (
              <div
                key={row.id ?? 'unassigned'}
                className={[
                  'border-b border-r border-surface-600 flex items-center px-3 gap-2',
                  row.type === 'idle' ? 'bg-green-900/5' : '',
                ].join(' ')}
                style={{ height: ROW_H }}
              >
                {row.type === 'idle' ? (
                  <>
                    <span className='text-xs text-green-500 truncate font-medium'>{row.label}</span>
                    <span className='shrink-0 text-2xs text-green-700 bg-green-900/30 border border-green-800/40 px-1.5 py-0.5 rounded-full whitespace-nowrap leading-none'>
                      idle
                    </span>
                  </>
                ) : row.type === 'unassigned' ? (
                  <span className='text-xs text-gray-600 italic'>Unassigned</span>
                ) : (
                  <>
                    <span className='text-xs text-gray-300 truncate font-medium'>{row.label}</span>
                    {/* "free in Xd" badge for drivers delivering soon */}
                    {row.id != null && (() => {
                      const avail = driverAvailability.get(row.id)
                      if (!avail || avail < today) return null
                      const daysUntil = daysBetween(today, avail)
                      if (daysUntil > 3) return null
                      return (
                        <span className='shrink-0 text-2xs text-green-600 whitespace-nowrap'>
                          {daysUntil === 0 ? 'free today' : `free in ${daysUntil}d`}
                        </span>
                      )
                    })()}
                  </>
                )}
              </div>
            ))}
          </div>

          {/* Right: timeline grid */}
          <div style={{ width: COL_W * DAYS_TO_SHOW }}>

            {/* Day headers */}
            <div className='flex border-b border-surface-600 sticky top-0 z-20 bg-surface-800' style={{ height: 40 }}>
              {days.map(d => {
                const ymd      = toYMD(d)
                const isToday  = ymd === today
                const isSun    = d.getDay() === 0
                const nPickups = dayEventCounts.pickups[ymd]    ?? 0
                const nDelivs  = dayEventCounts.deliveries[ymd] ?? 0
                return (
                  <div
                    key={ymd}
                    style={{ width: COL_W }}
                    className={[
                      'shrink-0 flex flex-col items-center justify-center border-r gap-px',
                      isSun    ? 'border-surface-400' : 'border-surface-700',
                      isToday  ? 'bg-orange-600/10'  : '',
                    ].join(' ')}
                  >
                    <span className='text-2xs text-gray-600 leading-none'>
                      {d.toLocaleDateString('en-US', { weekday: 'short' })}
                    </span>
                    <span className={`text-2xs font-semibold leading-none ${isToday ? 'text-orange-400' : 'text-gray-500'}`}>
                      {d.getDate()}
                    </span>
                    {/* Event dots: blue = pickup, green = delivery */}
                    {(nPickups > 0 || nDelivs > 0) && (
                      <div className='flex items-center gap-px h-1.5'>
                        {Array.from({ length: Math.min(nPickups, 3) }).map((_, i) => (
                          <span key={'p' + i} className='w-1 h-1 rounded-full bg-blue-500/60 shrink-0' />
                        ))}
                        {Array.from({ length: Math.min(nDelivs, 3) }).map((_, i) => (
                          <span key={'d' + i} className='w-1 h-1 rounded-full bg-green-500/60 shrink-0' />
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Driver rows */}
            {allRows.map(row => {
              const rowLoads = loadsByDriver.get(row.id) ?? []
              return (
                <div
                  key={row.id ?? 'unassigned'}
                  className='relative border-b border-surface-600'
                  style={{ height: ROW_H, width: COL_W * DAYS_TO_SHOW }}
                >
                  {/* Day column backgrounds / dividers */}
                  {days.map((d, i) => {
                    const ymd     = toYMD(d)
                    const isToday = ymd === today
                    const isSun   = d.getDay() === 0
                    return (
                      <div
                        key={ymd}
                        className={[
                          'absolute top-0 h-full border-r',
                          isToday ? 'bg-orange-600/5 border-orange-800/30' :
                          isSun   ? 'border-surface-500' : 'border-surface-700',
                        ].join(' ')}
                        style={{ left: i * COL_W, width: COL_W }}
                      />
                    )
                  })}

                  {/* Idle row background */}
                  {row.type === 'idle' && (
                    <div className='absolute inset-0 bg-green-900/5' />
                  )}

                  {/* Available-after band for assigned drivers finishing soon */}
                  {row.type === 'assigned' && row.id != null && renderAvailableBand(row.id)}

                  {/* Load bars */}
                  {rowLoads.map(l => renderBar(l))}
                </div>
              )
            })}

            {/* Empty state */}
            {allRows.length === 0 && (
              <div className='flex items-center justify-center text-gray-600 text-sm py-12'>
                No active loads in this time window.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className='px-5 py-2 border-t border-surface-600 flex items-center gap-4 flex-wrap shrink-0'>
        {Object.entries(STATUS_COLOR).map(([status, cls]) => (
          <div key={status} className='flex items-center gap-1.5'>
            <div className={`w-3 h-3 rounded-sm border ${cls}`} />
            <span className='text-2xs text-gray-600'>{status}</span>
          </div>
        ))}
        <div className='flex items-center gap-1.5'>
          <div className='w-3 h-3 rounded-sm border bg-red-900/50 border-red-600' />
          <span className='text-2xs text-gray-600'>Overdue</span>
        </div>
        <div className='w-px h-3 bg-surface-500/60 mx-1' />
        <div className='flex items-center gap-1.5'>
          <span className='w-1.5 h-1.5 rounded-full bg-blue-300/80 inline-block' />
          <span className='text-2xs text-gray-600'>Pickup day</span>
        </div>
        <div className='flex items-center gap-1.5'>
          <span className='w-1.5 h-1.5 rounded-full bg-green-300/80 inline-block' />
          <span className='text-2xs text-gray-600'>Delivery day</span>
        </div>
        <div className='flex items-center gap-1.5'>
          <div className='w-8 h-3 rounded-sm bg-green-900/10 border-l-2 border-green-800/30' />
          <span className='text-2xs text-gray-600'>Driver available</span>
        </div>
      </div>
    </div>
  )
}
