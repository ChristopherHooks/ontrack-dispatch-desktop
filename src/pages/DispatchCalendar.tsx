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

// ---------------------------------------------------------------------------
// Status colors (matching existing app palette)
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

const DAYS_TO_SHOW = 14  // two-week view

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
  const dayStrings = useMemo(() => days.map(toYMD), [days])
  const windowStart = dayStrings[0]
  const windowEnd   = dayStrings[DAYS_TO_SHOW - 1]

  const today = toYMD(new Date())

  // Loads that have at least one date overlapping the window and are active enough to show
  const visibleLoads = useMemo(() => {
    return loads.filter(l => {
      if (!['Booked','Picked Up','In Transit','Delivered','Invoiced'].includes(l.status)) return false
      const start = l.pickup_date   ?? l.created_at.slice(0, 10)
      const end   = l.delivery_date ?? start
      return start <= windowEnd && end >= windowStart
    })
  }, [loads, windowStart, windowEnd])

  // Group loads by driver_id (unassigned under null key)
  const loadsByDriver = useMemo(() => {
    const map = new Map<number | null, Load[]>()
    for (const l of visibleLoads) {
      const key = l.driver_id ?? null
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(l)
    }
    return map
  }, [visibleLoads])

  // Ordered list of driver rows — assigned drivers first, then unassigned
  const driverRows = useMemo(() => {
    const assigned = drivers
      .filter(d => loadsByDriver.has(d.id))
      .sort((a, b) => a.name.localeCompare(b.name))
    const hasUnassigned = loadsByDriver.has(null)
    return { assigned, hasUnassigned }
  }, [drivers, loadsByDriver])

  const nav = (delta: number) => setWeekStart(d => addDays(d, delta * 7))
  const goToday = () => {
    const d = new Date()
    d.setDate(d.getDate() - d.getDay())
    d.setHours(0, 0, 0, 0)
    setWeekStart(d)
  }

  if (loading) {
    return <div className='flex items-center justify-center h-full text-gray-600 text-sm'>Loading calendar...</div>
  }

  const COL_W = 52   // px per day column
  const ROW_H = 48   // px per driver row
  const LABEL_W = 160 // px for driver name column

  function renderBar(load: Load, rowLoads: Load[]) {
    const start = load.pickup_date   ?? load.created_at.slice(0, 10)
    const end   = load.delivery_date ?? start

    // Clip to window
    const clampedStart = start < windowStart ? windowStart : start
    const clampedEnd   = end   > windowEnd   ? windowEnd   : end

    const offsetDays  = daysBetween(windowStart, clampedStart)
    const spanDays    = daysBetween(clampedStart, clampedEnd) + 1
    const left        = offsetDays * COL_W
    const width       = Math.max(spanDays * COL_W - 4, COL_W - 4)

    const colorCls = STATUS_COLOR[load.status] ?? 'bg-surface-600 border-surface-400'
    const route = [load.origin_state, load.dest_state].filter(Boolean).join('→')
    const isHovered = hoveredLoad?.id === load.id

    return (
      <div
        key={load.id}
        onMouseEnter={() => setHoveredLoad(load)}
        onMouseLeave={() => setHoveredLoad(null)}
        className={`absolute top-2 h-8 rounded-md border text-2xs font-medium flex items-center px-2 cursor-default overflow-hidden select-none transition-opacity ${colorCls} ${isHovered ? 'z-20 opacity-100' : 'z-10 opacity-90'}`}
        style={{ left: left + 2, width }}
        title={`${load.load_id ?? 'No ref'} · ${route} · ${load.status}`}
      >
        <span className='truncate'>
          {load.load_id ? load.load_id + (route ? ' · ' + route : '') : route || load.status}
        </span>
      </div>
    )
  }

  const totalRows = driverRows.assigned.length + (driverRows.hasUnassigned ? 1 : 0)

  return (
    <div className='flex flex-col h-full overflow-hidden'>
      {/* Header */}
      <div className='px-5 py-3 border-b border-surface-600 flex items-center gap-3 shrink-0'>
        <Calendar size={16} className='text-orange-400' />
        <h1 className='text-sm font-semibold text-gray-100'>Dispatch Calendar</h1>
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

      {/* Tooltip for hovered load */}
      {hoveredLoad && (
        <div className='fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl bg-surface-700 border border-surface-400 shadow-xl text-xs text-gray-200 flex items-center gap-4 pointer-events-none'>
          <span className='font-semibold text-orange-400'>{hoveredLoad.load_id ?? 'No ref'}</span>
          <span>{[hoveredLoad.origin_city, hoveredLoad.origin_state].filter(Boolean).join(', ')} → {[hoveredLoad.dest_city, hoveredLoad.dest_state].filter(Boolean).join(', ')}</span>
          {hoveredLoad.rate != null && <span className='text-green-400 font-mono'>${hoveredLoad.rate.toLocaleString()}</span>}
          <span className={`px-2 py-0.5 rounded-full text-2xs border ${STATUS_COLOR[hoveredLoad.status] ?? ''}`}>{hoveredLoad.status}</span>
          {hoveredLoad.pickup_date && <span className='text-gray-500'>Pickup: {hoveredLoad.pickup_date}</span>}
          {hoveredLoad.delivery_date && <span className='text-gray-500'>Del: {hoveredLoad.delivery_date}</span>}
        </div>
      )}

      <div className='flex-1 overflow-auto'>
        <div className='inline-flex min-w-full'>
          {/* Left: driver labels */}
          <div className='shrink-0 sticky left-0 z-30 bg-surface-800' style={{ width: LABEL_W }}>
            {/* Header spacer */}
            <div className='h-9 border-b border-r border-surface-600' />
            {driverRows.assigned.map(d => (
              <div
                key={d.id}
                className='border-b border-r border-surface-600 flex items-center px-3 gap-2'
                style={{ height: ROW_H }}
              >
                <span className='text-xs text-gray-300 truncate font-medium'>{d.name}</span>
                {d.status === 'On Load' && (
                  <span className='shrink-0 w-1.5 h-1.5 rounded-full bg-orange-500' />
                )}
              </div>
            ))}
            {driverRows.hasUnassigned && (
              <div
                className='border-b border-r border-surface-600 flex items-center px-3'
                style={{ height: ROW_H }}
              >
                <span className='text-xs text-gray-600 italic'>Unassigned</span>
              </div>
            )}
          </div>

          {/* Right: grid */}
          <div style={{ width: COL_W * DAYS_TO_SHOW }}>
            {/* Day headers */}
            <div className='flex border-b border-surface-600 sticky top-0 z-20 bg-surface-800' style={{ height: 36 }}>
              {days.map(d => {
                const ymd = toYMD(d)
                const isToday = ymd === today
                const isSun   = d.getDay() === 0
                return (
                  <div
                    key={ymd}
                    style={{ width: COL_W }}
                    className={`shrink-0 flex flex-col items-center justify-center border-r text-center ${
                      isSun ? 'border-surface-400' : 'border-surface-700'
                    } ${isToday ? 'bg-orange-600/10' : ''}`}
                  >
                    <span className='text-2xs text-gray-600'>{d.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                    <span className={`text-2xs font-semibold ${isToday ? 'text-orange-400' : 'text-gray-500'}`}>
                      {d.getDate()}
                    </span>
                  </div>
                )
              })}
            </div>

            {/* Driver rows */}
            {[...driverRows.assigned.map(d => ({ id: d.id, label: d.name })),
               ...(driverRows.hasUnassigned ? [{ id: null as number | null, label: 'Unassigned' }] : [])
            ].map(row => {
              const rowLoads = loadsByDriver.get(row.id) ?? []
              return (
                <div
                  key={row.id ?? 'unassigned'}
                  className='relative border-b border-surface-600'
                  style={{ height: ROW_H, width: COL_W * DAYS_TO_SHOW }}
                >
                  {/* Day column dividers */}
                  {days.map((d, i) => {
                    const ymd = toYMD(d)
                    const isToday = ymd === today
                    const isSun   = d.getDay() === 0
                    return (
                      <div
                        key={ymd}
                        className={`absolute top-0 h-full border-r ${
                          isToday ? 'bg-orange-600/5 border-orange-800/30' :
                          isSun   ? 'border-surface-500' : 'border-surface-700'
                        }`}
                        style={{ left: i * COL_W, width: COL_W }}
                      />
                    )
                  })}
                  {/* Load bars */}
                  {rowLoads.map(l => renderBar(l, rowLoads))}
                </div>
              )
            })}

            {/* Empty state */}
            {totalRows === 0 && (
              <div className='flex items-center justify-center text-gray-600 text-sm py-12'>
                No active loads in this time window.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className='px-5 py-2 border-t border-surface-600 flex items-center gap-4 shrink-0'>
        {Object.entries(STATUS_COLOR).map(([status, cls]) => (
          <div key={status} className='flex items-center gap-1.5'>
            <div className={`w-3 h-3 rounded-sm border ${cls}`} />
            <span className='text-2xs text-gray-600'>{status}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
