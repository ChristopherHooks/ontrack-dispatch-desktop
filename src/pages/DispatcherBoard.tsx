import { useState, useEffect, useMemo } from 'react'
import type { BoardRow } from '../types/models'
import { RefreshCw, Search, AlertCircle } from 'lucide-react'

type BoardGroup = 'Needs Load' | 'In Transit' | 'Picked Up' | 'Booked' | 'Available Soon' | 'Inactive'

const GROUP_ORDER: BoardGroup[] = [
  'Needs Load', 'In Transit', 'Picked Up', 'Booked', 'Available Soon', 'Inactive',
]

function deriveGroup(row: BoardRow): BoardGroup {
  if (row.driver_status === 'Inactive')   return 'Inactive'
  if (row.load_status === 'In Transit')   return 'In Transit'
  if (row.load_status === 'Picked Up')    return 'Picked Up'
  if (row.load_status === 'Booked')       return 'Booked'
  if (row.driver_status === 'On Load')    return 'Available Soon'
  return 'Needs Load'
}

interface GroupMeta {
  color:    string
  rowBg:    string
  badge:    string
  dot:      string
}

const GROUP_META: Record<BoardGroup, GroupMeta> = {
  'Needs Load':     { color: 'text-orange-400', rowBg: 'bg-orange-950/20 hover:bg-orange-950/30', badge: 'bg-orange-900/40 text-orange-300 border border-orange-700/40', dot: 'bg-orange-500 animate-pulse' },
  'In Transit':     { color: 'text-green-400',  rowBg: 'bg-surface-700 hover:bg-surface-600',     badge: 'bg-green-900/40 text-green-300 border border-green-700/40',   dot: 'bg-green-500' },
  'Picked Up':      { color: 'text-blue-400',   rowBg: 'bg-surface-700 hover:bg-surface-600',     badge: 'bg-blue-900/40 text-blue-300 border border-blue-700/40',     dot: 'bg-blue-500' },
  'Booked':         { color: 'text-yellow-400', rowBg: 'bg-surface-700 hover:bg-surface-600',     badge: 'bg-yellow-900/40 text-yellow-300 border border-yellow-700/40', dot: 'bg-yellow-500' },
  'Available Soon': { color: 'text-cyan-400',   rowBg: 'bg-cyan-950/20 hover:bg-cyan-950/30',     badge: 'bg-cyan-900/40 text-cyan-300 border border-cyan-700/40',     dot: 'bg-cyan-400' },
  'Inactive':       { color: 'text-gray-500',   rowBg: 'bg-surface-800 opacity-60 hover:opacity-80', badge: 'bg-surface-700 text-gray-500 border border-surface-400', dot: 'bg-gray-600' },
}

const SEL = 'bg-surface-800 border border-surface-400 text-gray-300 text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-orange-500'

export function DispatcherBoard() {
  const [rows,        setRows]        = useState<BoardRow[]>([])
  const [loading,     setLoading]     = useState(true)
  const [search,      setSearch]      = useState('')
  const [filterGroup, setFilterGroup] = useState<BoardGroup | ''>('')
  const [filterTrail, setFilterTrail] = useState('')
  const [filterBrkr,  setFilterBrkr]  = useState('')
  const [refreshedAt, setRefreshedAt] = useState<Date | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      setRows(await window.api.dispatcher.board())
      setRefreshedAt(new Date())
    } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const trailerOpts = useMemo(() => {
    const s = new Set(rows.map(r => r.trailer_type).filter((t): t is string => t != null))
    return [...s].sort()
  }, [rows])

  const brokerOpts = useMemo(() => {
    const s = new Set(rows.map(r => r.broker_name).filter((b): b is string => b != null))
    return [...s].sort()
  }, [rows])

  const filtered = useMemo(() => {
    let r = rows
    if (search) {
      const q = search.toLowerCase()
      r = r.filter(row =>
        row.driver_name.toLowerCase().includes(q) ||
        (row.home_base   ?? '').toLowerCase().includes(q) ||
        (row.origin_city ?? '').toLowerCase().includes(q) ||
        (row.dest_city   ?? '').toLowerCase().includes(q)
      )
    }
    if (filterTrail) r = r.filter(row => row.trailer_type === filterTrail)
    if (filterBrkr)  r = r.filter(row => row.broker_name  === filterBrkr)
    if (filterGroup) r = r.filter(row => deriveGroup(row) === filterGroup)
    return r
  }, [rows, search, filterTrail, filterBrkr, filterGroup])

  const grouped = useMemo(() => {
    const g: Record<BoardGroup, BoardRow[]> = {
      'Needs Load': [], 'In Transit': [], 'Picked Up': [], 'Booked': [], 'Available Soon': [], 'Inactive': [],
    }
    for (const row of filtered) g[deriveGroup(row)].push(row)
    return g
  }, [filtered])

  const counts = useMemo(() => {
    const c: Record<BoardGroup, number> = {
      'Needs Load': 0, 'In Transit': 0, 'Picked Up': 0, 'Booked': 0, 'Available Soon': 0, 'Inactive': 0,
    }
    for (const row of rows) c[deriveGroup(row)]++
    return c
  }, [rows])

  const visibleGroups = filterGroup ? [filterGroup] as BoardGroup[] : GROUP_ORDER

  if (loading) return (
    <div className='space-y-4 max-w-[1600px] animate-fade-in'>
      <div className='h-8 w-60 rounded bg-surface-700 animate-pulse' />
      <div className='flex gap-2'>{Array.from({ length: 6 }).map((_, i) => <div key={i} className='h-7 w-24 rounded-full bg-surface-700 animate-pulse' />)}</div>
      <div className='h-10 w-full rounded bg-surface-700 animate-pulse' />
      {Array.from({ length: 6 }).map((_, i) => <div key={i} className='h-12 w-full rounded bg-surface-700 animate-pulse' />)}
    </div>
  )

  return (
    <div className='space-y-4 max-w-[1600px] animate-fade-in'>

      {/* Page header */}
      <div className='flex items-start justify-between'>
        <div>
          <h1 className='text-xl font-semibold text-gray-100'>Dispatcher Board</h1>
          <p className='text-sm text-gray-500 mt-0.5'>Daily operations — driver status, active loads, dispatch needs</p>
        </div>
        <div className='flex items-center gap-3'>
          {refreshedAt && (
            <span className='text-xs text-gray-600'>Refreshed {refreshedAt.toLocaleTimeString()}</span>
          )}
          <button
            onClick={load}
            className='flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-700 border border-surface-400 text-sm text-gray-300 hover:text-gray-100 hover:border-orange-600 transition-colors'
          >
            <RefreshCw size={14} />
            Refresh
          </button>
        </div>
      </div>

      {/* KPI chips — click to filter by group */}
      <div className='flex flex-wrap gap-2'>
        {GROUP_ORDER.map(g => {
          const meta   = GROUP_META[g]
          const active = filterGroup === g
          return (
            <button
              key={g}
              onClick={() => setFilterGroup(f => f === g ? '' : g)}
              className={[
                'flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all',
                meta.badge,
                active ? 'ring-1 ring-orange-500/50 opacity-100' : 'opacity-70 hover:opacity-100',
              ].join(' ')}
            >
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${meta.dot}`} />
              {g}
              <span className='ml-0.5 font-mono'>{counts[g]}</span>
            </button>
          )
        })}
      </div>

      {/* Filter bar */}
      <div className='flex flex-wrap gap-2 items-center'>
        <div className='relative flex-1 min-w-48'>
          <Search size={14} className='absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none' />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder='Search driver, city, home base...'
            className='w-full bg-surface-800 border border-surface-400 text-gray-300 text-sm rounded-lg pl-8 pr-3 py-1.5 focus:outline-none focus:border-orange-500 placeholder-gray-600'
          />
        </div>
        <select value={filterTrail} onChange={e => setFilterTrail(e.target.value)} className={SEL}>
          <option value=''>All Trailers</option>
          {trailerOpts.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={filterBrkr} onChange={e => setFilterBrkr(e.target.value)} className={SEL}>
          <option value=''>All Brokers</option>
          {brokerOpts.map(b => <option key={b} value={b}>{b}</option>)}
        </select>
        {(search || filterTrail || filterBrkr || filterGroup) && (
          <button
            onClick={() => { setSearch(''); setFilterTrail(''); setFilterBrkr(''); setFilterGroup('') }}
            className='text-xs text-gray-500 hover:text-orange-400 transition-colors px-2 py-1.5'
          >Clear</button>
        )}
      </div>

      {/* Status group sections */}
      {visibleGroups.map(g => {
        const groupRows = grouped[g]
        if (!groupRows.length) return null
        const meta = GROUP_META[g]
        return (
          <section key={g}>
            <div className='flex items-center gap-2 mb-2'>
              <span className={`w-2 h-2 rounded-full ${meta.dot}`} />
              <h2 className={`text-xs font-semibold uppercase tracking-wide ${meta.color}`}>{g}</h2>
              <span className='text-xs text-gray-600'>({groupRows.length})</span>
            </div>
            <BoardTable rows={groupRows} group={g} />
          </section>
        )
      })}

      {filtered.length === 0 && (
        <div className='py-16 text-center'>
          <AlertCircle size={32} className='mx-auto mb-3 text-gray-600' />
          <p className='text-sm text-gray-500'>No drivers match your filters.</p>
        </div>
      )}
    </div>
  )
}

// ── Board Table ───────────────────────────────────────────────────────────────
interface BoardTableProps { rows: BoardRow[]; group: BoardGroup }

function BoardTable({ rows, group }: BoardTableProps) {
  return (
    <div className='rounded-xl border border-surface-400 overflow-hidden'>
      <table className='w-full text-xs'>
        <thead>
          <tr className='bg-surface-750 border-b border-surface-400 text-left text-gray-500'>
            <th className='px-3 py-2 font-medium w-40'>Driver</th>
            <th className='px-3 py-2 font-medium w-28'>Equipment</th>
            <th className='px-3 py-2 font-medium w-28'>Home Base</th>
            <th className='px-3 py-2 font-medium w-28'>Load Ref</th>
            <th className='px-3 py-2 font-medium w-20'>Status</th>
            <th className='px-3 py-2 font-medium'>Route</th>
            <th className='px-3 py-2 font-medium w-24'>Pickup</th>
            <th className='px-3 py-2 font-medium w-24'>Delivery</th>
            <th className='px-3 py-2 font-medium w-20'>RPM</th>
            <th className='px-3 py-2 font-medium w-28'>Broker</th>
            <th className='px-3 py-2 font-medium'>Notes</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(row => <DriverBoardRow key={row.driver_id} row={row} group={group} />)}
        </tbody>
      </table>
    </div>
  )
}

// ── Driver Board Row ─────────────────────────────────────────────────────────
interface DriverBoardRowProps { row: BoardRow; group: BoardGroup }

function DriverBoardRow({ row, group }: DriverBoardRowProps) {
  const meta = GROUP_META[group]

  const rpm = row.rate != null && row.miles != null && row.miles > 0
    ? row.rate / row.miles : null
  const rpmOk = rpm == null || row.min_rpm == null || rpm >= row.min_rpm

  const route = row.origin_city
    ? [row.origin_city, row.origin_state].filter(Boolean).join(', ') +
      ' -> ' +
      [row.dest_city, row.dest_state].filter(Boolean).join(', ')
    : null

  const flagColor =
    row.broker_flag === 'Preferred'   ? 'text-green-400'  :
    row.broker_flag === 'Slow Pay'    ? 'text-yellow-400' :
    row.broker_flag === 'Avoid'       ? 'text-red-400'    :
    row.broker_flag === 'Blacklisted' ? 'text-red-400'    : 'text-gray-400'

  return (
    <tr className={`border-b border-surface-600 last:border-0 transition-colors ${meta.rowBg}`}>
      <td className='px-3 py-2.5'>
        <p className='font-medium text-gray-200 truncate max-w-[9rem]'>{row.driver_name}</p>
        {row.driver_company && <p className='text-gray-600 truncate max-w-[9rem]'>{row.driver_company}</p>}
      </td>
      <td className='px-3 py-2.5'>
        {row.trailer_type && <span className='px-1.5 py-0.5 rounded bg-surface-600 text-gray-400 mr-1'>{row.trailer_type}</span>}
        {row.truck_type && <p className='text-gray-600 truncate max-w-[7rem] mt-0.5'>{row.truck_type.split(' ').slice(0, 2).join(' ')}</p>}
      </td>
      <td className='px-3 py-2.5 text-gray-400 truncate max-w-[7rem]'>{row.home_base ?? <span className='text-gray-700'>—</span>}</td>
      <td className='px-3 py-2.5'>
        {row.load_ref
          ? <span className='font-mono text-gray-300'>{row.load_ref}</span>
          : <span className='text-gray-700'>—</span>}
        {row.commodity && <p className='text-gray-600 truncate max-w-[7rem] mt-0.5'>{row.commodity}</p>}
      </td>

      <td className='px-3 py-2.5'>
        {row.load_status
          ? <span className={`${meta.badge} px-1.5 py-0.5 rounded text-2xs whitespace-nowrap`}>{row.load_status}</span>
          : group === 'Needs Load'
            ? (
              <span className='flex items-center gap-1 text-orange-400'>
                <span className='w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse shrink-0' />
                Needs Load
              </span>
            )
            : group === 'Available Soon'
              ? <span className='text-cyan-400 text-2xs'>Avail. Soon</span>
              : <span className='text-gray-700'>—</span>
        }
      </td>
      <td className='px-3 py-2.5 text-gray-400 max-w-[12rem] truncate'>
        {route ?? <span className='text-gray-700'>—</span>}
      </td>
      <td className='px-3 py-2.5 text-gray-400 font-mono whitespace-nowrap'>{row.pickup_date ?? '—'}</td>
      <td className='px-3 py-2.5 text-gray-400 font-mono whitespace-nowrap'>{row.delivery_date ?? '—'}</td>
      <td className='px-3 py-2.5'>
        {rpm != null
          ? <span className={`font-mono font-semibold ${rpmOk ? 'text-green-400' : 'text-red-400'}`}>${rpm.toFixed(2)}</span>
          : row.min_rpm != null
            ? <span className='text-gray-600 text-2xs'>Min ${row.min_rpm.toFixed(2)}</span>
            : <span className='text-gray-700'>—</span>
        }
      </td>
      <td className={`px-3 py-2.5 truncate max-w-[8rem] ${flagColor}`}>
        {row.broker_name ?? <span className='text-gray-700'>—</span>}
        {row.broker_flag && row.broker_flag !== 'None' && (
          <p className='text-2xs opacity-70'>{row.broker_flag}</p>
        )}
      </td>
      <td className='px-3 py-2.5 text-gray-600 truncate max-w-[12rem]'>
        {row.load_notes ?? row.driver_notes ?? <span className='text-gray-700'>—</span>}
      </td>
    </tr>
  )
}
