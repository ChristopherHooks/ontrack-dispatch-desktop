import { useState } from 'react'
import { ChevronUp, ChevronDown, ChevronsUpDown, Edit2, ChevronRight, AlertTriangle, RefreshCw, Loader2 } from 'lucide-react'
import type { Driver } from '../../types/models'
import { DRIVER_STATUS_STYLES } from './constants'
import { openSaferMcWithCopy } from '../../lib/saferUrl'

interface Props {
  drivers: Driver[]; loading: boolean
  sortKey: keyof Driver; sortDir: 'asc' | 'desc'
  onSort: (k: keyof Driver) => void
  onSelect: (d: Driver) => void; onEdit: (d: Driver) => void
  onFetchAuthority?: (d: Driver) => Promise<void>
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

export function DriversTable({ drivers, loading, sortKey, sortDir, onSort, onSelect, onEdit, onFetchAuthority }: Props) {
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
                <span className={`text-2xs px-2 py-0.5 rounded-full border ${DRIVER_STATUS_STYLES[d.status]}`}>{d.status}</span>
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
