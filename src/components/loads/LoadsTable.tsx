import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { ChevronUp, ChevronDown, ChevronsUpDown, Edit2, ChevronRight, ArrowRight, ChevronDown as DropIcon, ChevronLeft } from 'lucide-react'
import type { Load, Driver, LoadStatus } from '../../types/models'
import { LOAD_STATUS_STYLES, LOAD_STATUSES, UNASSIGNMENT_REASON_OPTIONS } from './constants'

interface Props {
  loads: Load[]; drivers: Driver[]; loading: boolean
  sortKey: keyof Load; sortDir: 'asc' | 'desc'
  onSort: (k: keyof Load) => void
  onSelect: (l: Load) => void; onEdit: (l: Load) => void
  onStatusChange?: (l: Load, status: LoadStatus) => Promise<void>
  onDriverChange?: (l: Load, driverId: number | null, reason?: string) => Promise<void>
}

// Inline driver assignment / reassignment / unassignment dropdown.
// Shows eligible (non-Inactive) drivers plus the currently assigned driver (even
// if On Load). "Unassigned" clears the driver.
function DriverDropdown({ load, drivers, onDriverChange }: {
  load: Load; drivers: Driver[]
  onDriverChange?: (l: Load, driverId: number | null, reason?: string) => Promise<void>
}) {
  const [open,    setOpen]    = useState(false)
  const [phase,   setPhase]   = useState<'list' | 'reason'>('list')
  const [busy,    setBusy]    = useState(false)
  const [pos,     setPos]     = useState<{ top: number; left: number } | null>(null)
  const btnRef  = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handle(e: MouseEvent) {
      if (
        panelRef.current  && !panelRef.current.contains(e.target as Node) &&
        btnRef.current    && !btnRef.current.contains(e.target as Node)
      ) { setOpen(false); setPhase('list') }
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open])

  // Eligible list: non-Inactive drivers + always include currently assigned one
  const eligible = drivers.filter(d =>
    d.status !== 'Inactive' || d.id === load.driver_id
  )
  const assignedName = load.driver_id
    ? (drivers.find(d => d.id === load.driver_id)?.name ?? '—')
    : null

  if (!onDriverChange) {
    return (
      <span className='text-xs text-gray-300 whitespace-nowrap'>
        {assignedName ?? <span className='text-yellow-600'>Unassigned</span>}
      </span>
    )
  }

  const handleOpen = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect()
      setPos({ top: r.bottom + 4, left: r.left })
    }
    if (open) { setPhase('list') }
    setOpen(o => !o)
  }

  const handleSelectDriver = async (e: React.MouseEvent, driverId: number | null) => {
    e.stopPropagation()
    if (driverId === load.driver_id) { setOpen(false); setPhase('list'); return }
    // Unassigning a currently-assigned driver → show reason picker
    if (driverId === null && load.driver_id != null) {
      setPhase('reason')
      return
    }
    // Reassigning to a different driver → auto-reason admin_correction
    setOpen(false)
    setPhase('list')
    setBusy(true)
    try { await onDriverChange(load, driverId, driverId == null ? undefined : 'admin_correction') } finally { setBusy(false) }
  }

  const handleSelectReason = async (e: React.MouseEvent, reason: string) => {
    e.stopPropagation()
    setOpen(false)
    setPhase('list')
    setBusy(true)
    try { await onDriverChange(load, null, reason) } finally { setBusy(false) }
  }

  return (
    <div onClick={e => e.stopPropagation()}>
      <button
        ref={btnRef}
        onClick={handleOpen}
        disabled={busy}
        className={`flex items-center gap-1 text-xs whitespace-nowrap transition-colors hover:opacity-80 ${
          busy ? 'opacity-50 cursor-wait' :
          assignedName ? 'text-gray-300' : 'text-yellow-600'
        }`}
      >
        {busy ? '…' : (assignedName ?? 'Unassigned')}
        {!busy && <DropIcon size={9} className={`transition-transform ${open ? 'rotate-180' : ''}`} />}
      </button>
      {open && pos && createPortal(
        <div
          ref={panelRef}
          style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 9999 }}
          className='min-w-[200px] max-h-72 overflow-y-auto bg-surface-800 border border-surface-400 rounded-lg shadow-2xl'
        >
          {phase === 'list' ? (
            <>
              {/* Unassigned option — only shown when a driver is assigned */}
              {load.driver_id != null && (
                <>
                  <button
                    onClick={e => handleSelectDriver(e, null)}
                    className='w-full text-left px-3 py-2 text-xs text-yellow-500 hover:bg-surface-600 transition-colors'
                  >
                    Unassigned
                  </button>
                  <div className='border-t border-surface-600 my-0.5' />
                </>
              )}
              {eligible.map(d => (
                <button
                  key={d.id}
                  onClick={e => handleSelectDriver(e, d.id)}
                  className={`w-full text-left px-3 py-2 text-xs transition-colors ${
                    d.id === load.driver_id
                      ? 'text-gray-200 font-semibold opacity-60 cursor-default'
                      : 'text-gray-200 hover:bg-surface-600'
                  }`}
                >
                  {d.name}
                  {d.status === 'On Load' && d.id !== load.driver_id && (
                    <span className='text-2xs text-gray-500 ml-1'>(on load)</span>
                  )}
                </button>
              ))}
            </>
          ) : (
            <>
              <div className='flex items-center gap-1 px-3 py-2 border-b border-surface-600'>
                <button
                  onClick={e => { e.stopPropagation(); setPhase('list') }}
                  className='text-gray-500 hover:text-gray-300 transition-colors'
                >
                  <ChevronLeft size={12} />
                </button>
                <span className='text-2xs text-gray-400 uppercase tracking-wider'>Reason for removal</span>
              </div>
              {UNASSIGNMENT_REASON_OPTIONS.map(r => (
                <button
                  key={r.value}
                  onClick={e => handleSelectReason(e, r.value)}
                  className='w-full text-left px-3 py-2 text-xs text-gray-200 hover:bg-surface-600 transition-colors'
                >
                  {r.label}
                  {r.fallout && <span className='text-2xs text-red-400 ml-1'>(fallout)</span>}
                </button>
              ))}
            </>
          )}
        </div>,
        document.body
      )}
    </div>
  )
}

function StatusDropdown({ load, onStatusChange }: { load: Load; onStatusChange?: (l: Load, s: LoadStatus) => Promise<void> }) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
  const btnRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handle(e: MouseEvent) {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        btnRef.current && !btnRef.current.contains(e.target as Node)
      ) setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open])

  const cls = LOAD_STATUS_STYLES[load.status]

  if (!onStatusChange) {
    return <span className={`text-2xs px-2 py-0.5 rounded-full border ${cls}`}>{load.status}</span>
  }

  const handleOpen = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect()
      setPos({ top: r.bottom + 4, left: r.left })
    }
    setOpen(o => !o)
  }

  return (
    <div onClick={e => e.stopPropagation()}>
      <button
        ref={btnRef}
        onClick={handleOpen}
        className={`flex items-center gap-1 text-2xs px-2 py-0.5 rounded-full border font-medium transition-colors hover:opacity-80 ${cls}`}>
        {load.status}
        <DropIcon size={9} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && pos && createPortal(
        <div
          ref={panelRef}
          style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 9999 }}
          className='min-w-[140px] bg-surface-800 border border-surface-400 rounded-lg shadow-2xl overflow-hidden'>
          {LOAD_STATUSES.map(s => (
            <button
              key={s}
              onClick={async (e) => { e.stopPropagation(); await onStatusChange(load, s); setOpen(false) }}
              className={`w-full text-left px-3 py-2 text-xs font-medium transition-colors
                ${s === load.status ? 'opacity-50 cursor-default' : 'text-gray-100 hover:bg-surface-600 hover:text-white'}`}>
              <span className={`inline-block w-2 h-2 rounded-full mr-2 ${LOAD_STATUS_STYLES[s].split(' ')[0]}`} />
              {s}
            </button>
          ))}
        </div>,
        document.body
      )}
    </div>
  )
}

const fmt = (d: string | null) => { if (!d) return '—'; const [y,m,day]=d.split('-'); return `${m}/${day}/${y.slice(2)}` }
const rpm = (l: Load) => (l.rate != null && l.miles != null && l.miles > 0) ? (l.rate / l.miles) : null

function SI({ col, sk, sd }: { col: keyof Load; sk: keyof Load; sd: string }) {
  if (col !== sk) return <ChevronsUpDown size={10} className='inline ml-0.5 opacity-30' />
  return sd === 'asc' ? <ChevronUp size={10} className='inline ml-0.5 text-orange-400' /> : <ChevronDown size={10} className='inline ml-0.5 text-orange-400' />
}

const COLS: { label: string; key: keyof Load }[] = [
  { label: 'Load #', key: 'load_id' }, { label: 'Driver', key: 'driver_id' },
  { label: 'Route', key: 'origin_city' }, { label: 'Miles', key: 'miles' },
  { label: 'Rate', key: 'rate' }, { label: 'RPM', key: 'rate' },
  { label: 'Pickup', key: 'pickup_date' }, { label: 'Delivery', key: 'delivery_date' },
  { label: 'Status', key: 'status' },
]
const th = 'text-left text-2xs font-medium text-gray-400 uppercase tracking-wider pb-2 pr-3 select-none cursor-pointer hover:text-gray-400 transition-colors whitespace-nowrap'

export function LoadsTable({ loads, drivers, loading, sortKey, sortDir, onSort, onSelect, onEdit, onStatusChange, onDriverChange }: Props) {
  if (loading) return <div className='space-y-2'>{Array.from({length:5}).map((_,i)=><div key={i} className='h-10 rounded-lg bg-surface-700 animate-pulse'/>)}</div>
  if (!loads.length) return <div className='py-16 text-center'><p className='text-sm text-gray-500'>No loads found.</p><p className='text-xs text-gray-700 mt-1'>Add your first load to get started.</p></div>

  return (
    <div className='overflow-x-auto rounded-xl border border-surface-400 bg-surface-800'>
      <table className='w-full text-sm border-collapse'>
        <thead>
          <tr className='border-b border-surface-500'>
            {COLS.map((c,i)=>(
              <th key={`${c.key}-${i}`} className={`${th} pl-4`} onClick={()=>onSort(c.key)}>
                {c.label}{c.label !== 'RPM' && <SI col={c.key} sk={sortKey} sd={sortDir} />}
              </th>
            ))}
            <th className='w-16 pb-2' />
          </tr>
        </thead>
        <tbody>
          {loads.map(l=>{
            const r = rpm(l)
            const minRpm = l.driver_id ? drivers.find(d=>d.id===l.driver_id)?.min_rpm : null
            const rpmOk = r == null || minRpm == null || r >= minRpm
            return (
              <tr key={l.id} onClick={()=>onSelect(l)} className='border-b border-surface-600 last:border-0 hover:bg-surface-700 cursor-pointer transition-colors group'>
                <td className='pl-4 pr-3 py-2.5'>
                  <div className='flex flex-col gap-0.5'>
                    <span className='font-mono text-xs text-gray-400'>{l.load_id ?? <span className='text-gray-700'>#{l.id}</span>}</span>
                    {l.load_mode === 'broker' && <span className='text-2xs font-medium text-sky-400 leading-none'>broker</span>}
                  </div>
                </td>
                <td className='pr-3 py-2.5'>
                  <DriverDropdown load={l} drivers={drivers} onDriverChange={onDriverChange} />
                </td>
                <td className='pr-3 py-2.5 text-xs text-gray-400'>
                  <span className='flex items-center gap-1'>
                    <span className='text-gray-300'>{[l.origin_city,l.origin_state].filter(Boolean).join(', ')||'—'}</span>
                    <ArrowRight size={10} className='text-gray-600 shrink-0' />
                    <span>{[l.dest_city,l.dest_state].filter(Boolean).join(', ')||'—'}</span>
                  </span>
                </td>
                <td className='pr-3 py-2.5 text-xs text-gray-400'>{l.miles != null ? l.miles.toLocaleString() : '—'}</td>
                <td className='pr-3 py-2.5 text-xs text-gray-300'>{l.rate != null ? `$${l.rate.toLocaleString()}` : '—'}</td>
                <td className='pr-3 py-2.5 text-xs'>
                  {r != null ? <span className={rpmOk ? 'text-green-400 font-mono' : 'text-red-400 font-mono'}>${r.toFixed(2)}</span> : <span className='text-gray-600'>—</span>}
                </td>
                <td className='pr-3 py-2.5 text-xs text-gray-500'>{fmt(l.pickup_date)}</td>
                <td className='pr-3 py-2.5 text-xs text-gray-500'>{fmt(l.delivery_date)}</td>
                <td className='pr-3 py-2.5'>
                  <StatusDropdown load={l} onStatusChange={onStatusChange} />
                  {l.load_mode === 'broker' && (
                    <div className='flex items-center gap-2 mt-1 flex-wrap'>
                      <span className={`text-2xs font-medium leading-none ${l.has_accepted_offer===1?'text-green-400':'text-gray-600'}`}>
                        {l.has_accepted_offer===1?'Covered':'No offer'}
                      </span>
                      {l.has_accepted_offer===1 && (
                        <span className={`text-2xs leading-none ${l.has_vetting===1?'text-sky-400':'text-gray-600'}`}>
                          {l.has_vetting===1?'Vetted':'No vetting'}
                        </span>
                      )}
                    </div>
                  )}
                </td>
                <td className='pr-3 py-2.5'>
                  <div className='flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity'>
                    <button onClick={e=>{e.stopPropagation();onEdit(l)}} className='p-1 rounded hover:bg-surface-500 text-gray-500 hover:text-orange-400 transition-colors'><Edit2 size={12} /></button>
                    <ChevronRight size={12} className='text-gray-700' />
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
