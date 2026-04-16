import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { ChevronUp, ChevronDown, ChevronsUpDown, Edit2, ChevronRight, AlertTriangle, RefreshCw, Loader2, ChevronDown as DropIcon } from 'lucide-react'
import type { Driver, DriverStatus } from '../../types/models'
import { DRIVER_STATUS_STYLES, DRIVER_STATUSES } from './constants'
import { openSaferMcWithCopy } from '../../lib/saferUrl'

interface Props {
  drivers: Driver[]; loading: boolean
  sortKey: keyof Driver; sortDir: 'asc' | 'desc'
  onSort: (k: keyof Driver) => void
  onSelect: (d: Driver) => void; onEdit: (d: Driver) => void
  onFetchAuthority?: (d: Driver) => Promise<void>
  onStatusChange?: (d: Driver, status: DriverStatus) => Promise<void>
}

// Inline status dropdown — mirrors the StatusDropdown pattern in LoadsTable.
// 'On Load' → 'Active'/'Inactive' changes go through handleStatusChange in
// Drivers.tsx which enforces the load-assignment consistency rule.
function DriverStatusDropdown({ driver, onStatusChange }: {
  driver: Driver
  onStatusChange?: (d: Driver, s: DriverStatus) => Promise<void>
}) {
  const [open,    setOpen]    = useState(false)
  const [busy,    setBusy]    = useState(false)
  const [pos,     setPos]     = useState<{ top: number; left: number } | null>(null)
  const btnRef   = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handle(e: MouseEvent) {
      if (
        panelRef.current  && !panelRef.current.contains(e.target as Node) &&
        btnRef.current    && !btnRef.current.contains(e.target as Node)
      ) setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open])

  const cls = DRIVER_STATUS_STYLES[driver.status]

  if (!onStatusChange) {
    return <span className={`text-2xs px-2 py-0.5 rounded-full border ${cls}`}>{driver.status}</span>
  }

  const handleOpen = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect()
      setPos({ top: r.bottom + 4, left: r.left })
    }
    setOpen(o => !o)
  }

  const handleSelect = async (e: React.MouseEvent, status: DriverStatus) => {
    e.stopPropagation()
    if (status === driver.status) { setOpen(false); return }
    setOpen(false)
    setBusy(true)
    try { await onStatusChange(driver, status) } finally { setBusy(false) }
  }

  return (
    <div onClick={e => e.stopPropagation()}>
      <button
        ref={btnRef}
        onClick={handleOpen}
        disabled={busy}
        className={`flex items-center gap-1 text-2xs px-2 py-0.5 rounded-full border font-medium transition-colors hover:opacity-80 ${cls} ${busy ? 'opacity-50 cursor-wait' : ''}`}
      >
        {driver.status}
        {!busy && <DropIcon size={9} className={`transition-transform ${open ? 'rotate-180' : ''}`} />}
      </button>
      {open && pos && createPortal(
        <div
          ref={panelRef}
          style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 9999 }}
          className='min-w-[130px] bg-surface-800 border border-surface-400 rounded-lg shadow-2xl overflow-hidden'
        >
          {DRIVER_STATUSES.map(s => (
            <button
              key={s}
              onClick={e => handleSelect(e, s)}
              className={`w-full text-left px-3 py-2 text-xs font-medium transition-colors ${
                s === driver.status
                  ? 'opacity-50 cursor-default'
                  : 'text-gray-100 hover:bg-surface-600 hover:text-white'
              }`}
            >
              <span className={`inline-block w-2 h-2 rounded-full mr-2 ${DRIVER_STATUS_STYLES[s].split(' ')[0]}`} />
              {s}
            </button>
          ))}
        </div>,
        document.body
      )}
    </div>
  )
}

const EXPIRY_WARN = 60 * 24 * 3600 * 1000
const isExp = (d: string | null) => d != null && new Date(d).getTime() < Date.now() + EXPIRY_WARN
const fmt = (d: string | null) => { if (!d) return '—'; const [y,m,day]=d.split('-'); return `${m}/${day}/${y.slice(2)}` }

function mcAge(authorityDate: string | null): { label: string; days: number } | null {
  if (!authorityDate) return null
  const days = Math.floor((Date.now() - new Date(authorityDate).getTime()) / (1000 * 3600 * 24))
  if (days < 0) return null
  if (days < 30)  return { label: `${days}d`, days }
  if (days < 365) return { label: `${Math.floor(days / 30)}mo`, days }
  const yrs = Math.floor(days / 365)
  const rem = Math.floor((days % 365) / 30)
  return { label: rem > 0 ? `${yrs}yr ${rem}mo` : `${yrs}yr`, days }
}

function SI({ col, sk, sd }: { col: keyof Driver; sk: keyof Driver; sd: string }) {
  if (col !== sk) return <ChevronsUpDown size={10} className='inline ml-0.5 opacity-30' />
  return sd === 'asc' ? <ChevronUp size={10} className='inline ml-0.5 text-orange-400' /> : <ChevronDown size={10} className='inline ml-0.5 text-orange-400' />
}
function ExpCell({ date }: { date: string | null }) {
  return <span className={isExp(date) ? 'flex items-center gap-1 text-orange-400' : 'text-gray-500'}>{isExp(date) && <AlertTriangle size={10} />}{fmt(date)}</span>
}

const COLS: { label: string; key: keyof Driver }[] = [
  { label: 'Driver', key: 'name' }, { label: 'Company', key: 'company' },
  { label: 'Status', key: 'status' }, { label: 'MC #', key: 'mc_number' },
  { label: 'Equipment', key: 'truck_type' }, { label: 'Home Base', key: 'home_base' },
  { label: 'Location', key: 'current_location' },
  { label: 'Min RPM', key: 'min_rpm' }, { label: 'CDL Exp', key: 'cdl_expiry' },
  { label: 'Ins. Exp', key: 'insurance_expiry' }, { label: 'Med. Card', key: 'medical_card_expiry' },
]
const th = 'text-left text-2xs font-medium text-gray-400 uppercase tracking-wider pb-2 pr-3 select-none cursor-pointer hover:text-gray-400 transition-colors whitespace-nowrap'

export function DriversTable({ drivers, loading, sortKey, sortDir, onSort, onSelect, onEdit, onFetchAuthority, onStatusChange }: Props) {
  const [fetchingId, setFetchingId] = useState<number | null>(null)

  const handleFetch = async (e: React.MouseEvent, d: Driver) => {
    e.stopPropagation()
    if (!onFetchAuthority || fetchingId !== null) return
    setFetchingId(d.id)
    try { await onFetchAuthority(d) } finally { setFetchingId(null) }
  }

  if (loading) return <div className='space-y-2'>{Array.from({length:5}).map((_,i)=><div key={i} className='h-10 rounded-lg bg-surface-700 animate-pulse'/>)}</div>
  if (!drivers.length) return <div className='py-16 text-center'><p className='text-sm text-gray-500'>No drivers found.</p><p className='text-xs text-gray-700 mt-1'>Add your first driver to get started.</p></div>
  return (
    <div className='overflow-x-auto rounded-xl border border-surface-400 bg-surface-800'>
      <table className='w-full text-sm border-collapse'>
        <thead>
          <tr className='border-b border-surface-500'>
            {COLS.map(c=>(
              <th key={c.key} className={`${th} pl-4`} onClick={()=>onSort(c.key)}>
                {c.label} <SI col={c.key} sk={sortKey} sd={sortDir} />
              </th>
            ))}
            <th className='w-16 pb-2' />
          </tr>
        </thead>
        <tbody>
          {drivers.map(d=>(
            <tr key={d.id} onClick={()=>onSelect(d)} className='border-b border-surface-600 last:border-0 hover:bg-surface-700 cursor-pointer transition-colors group'>
              <td className='pl-4 pr-3 py-2.5 font-medium text-gray-200 whitespace-nowrap'>{d.name}</td>
              <td className='pr-3 py-2.5 text-gray-400 text-xs max-w-[130px] truncate'>{d.company ?? '—'}</td>
              <td className='pr-3 py-2.5'>
                <DriverStatusDropdown driver={d} onStatusChange={onStatusChange} />
              </td>
              <td className='pr-3 py-2.5 font-mono text-xs'>
                {d.mc_number ? (
                  <div className='flex items-center gap-1.5 flex-wrap'>
                    <button onClick={e => openSaferMcWithCopy(d.mc_number!, e)}
                        className='text-gray-500 hover:text-orange-400 hover:underline transition-colors cursor-pointer'
                        title='Open on FMCSA SAFER and copy MC# to clipboard'>{d.mc_number}</button>
                    {(() => {
                      const age = mcAge(d.authority_date ?? null)
                      return age ? (
                        <span className={`text-2xs px-1.5 py-0.5 rounded font-sans font-medium ${age.days < 90 ? 'bg-orange-600 text-white' : 'bg-surface-500 text-gray-300'}`}>
                          {age.days < 90 ? 'New Auth ' : ''}{age.label}
                        </span>
                      ) : null
                    })()}
                    {onFetchAuthority && (
                      fetchingId === d.id
                        ? <Loader2 size={10} className='text-gray-600 animate-spin' />
                        : <button onClick={e => handleFetch(e, d)}
                            title={d.authority_date ? 'Refresh authority date from FMCSA' : 'Fetch authority date from FMCSA'}
                            className='text-gray-700 hover:text-orange-400 transition-colors'>
                            <RefreshCw size={10} />
                          </button>
                    )}
                  </div>
                ) : <span className='text-gray-700'>—</span>}
              </td>
              <td className='pr-3 py-2.5 text-gray-400 text-xs whitespace-nowrap'>{[d.truck_type, d.trailer_type].filter(Boolean).join(' / ') || '—'}</td>
              <td className='pr-3 py-2.5 text-gray-400 text-xs'>{d.home_base ?? '—'}</td>
              <td className='pr-3 py-2.5 text-gray-400 text-xs max-w-[120px] truncate'>{d.current_location ?? '—'}</td>
              <td className='pr-3 py-2.5 text-gray-400 text-xs'>{d.min_rpm != null ? `$${d.min_rpm.toFixed(2)}` : '—'}</td>
              <td className='pr-3 py-2.5 text-xs'><ExpCell date={d.cdl_expiry} /></td>
              <td className='pr-3 py-2.5 text-xs'><ExpCell date={d.insurance_expiry} /></td>
              <td className='pr-3 py-2.5 text-xs'><ExpCell date={d.medical_card_expiry ?? null} /></td>
              <td className='pr-3 py-2.5'>
                <div className='flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity'>
                  <button onClick={e=>{e.stopPropagation();onEdit(d)}} className='p-1 rounded hover:bg-surface-500 text-gray-500 hover:text-orange-400 transition-colors'><Edit2 size={12} /></button>
                  <ChevronRight size={12} className='text-gray-700' />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
