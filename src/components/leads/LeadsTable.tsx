import { ChevronUp, ChevronDown, Phone, Edit2, Trash2, Calendar } from 'lucide-react'
import type { Lead } from '../../types/models'
import { LeadScoreBadge } from './LeadScoreBadge'
import { STATUS_STYLES, PRIORITY_STYLES } from './constants'

type SortKey = keyof Lead
type SortDir = 'asc' | 'desc'

interface Props {
  leads:    Lead[]
  loading:  boolean
  sortKey:  SortKey
  sortDir:  SortDir
  onSort:   (key: SortKey) => void
  onSelect: (lead: Lead) => void
  onEdit:   (lead: Lead) => void
  onDelete: (lead: Lead) => void
}

const fmtDate = (d: string | null) => {
  if (!d) return '—'
  const [y, m, day] = d.split('-')
  return `${m}/${day}/${y.slice(2)}`
}

const followUpCls = (d: string | null) => {
  if (!d) return 'text-gray-600'
  const t = new Date().toISOString().split('T')[0]
  return d < t ? 'text-red-400 font-medium' : d === t ? 'text-orange-400 font-medium' : 'text-gray-400'
}

const authAge = (d: string | null) => {
  if (!d) return '—'
  const mo = (new Date().getFullYear() - new Date(d).getFullYear()) * 12 + (new Date().getMonth() - new Date(d).getMonth())
  return mo < 12 ? `${mo}mo` : `${Math.floor(mo / 12)}y ${mo % 12}mo`
}

const SKELS = [0, 1, 2, 3, 4, 5]

export function LeadsTable({ leads, loading, sortKey, sortDir, onSort, onSelect, onEdit, onDelete }: Props) {
  function Th({ col, label, cls = '' }: { col: SortKey; label: string; cls?: string }) {
    const on = col === sortKey
    return (
      <th className={`text-left text-2xs font-medium text-gray-500 pb-2.5 pr-3 cursor-pointer select-none hover:text-gray-300 whitespace-nowrap ${cls}`} onClick={() => onSort(col)}>
        <span className='flex items-center gap-1'>{label}
          {on ? (sortDir === 'asc' ? <ChevronUp size={10} className='text-orange-400' /> : <ChevronDown size={10} className='text-orange-400' />) : <ChevronDown size={10} className='text-gray-700' />}
        </span>
      </th>
    )
  }

  if (loading) return (
    <div className='bg-surface-700 rounded-xl border border-surface-400 shadow-card'>
      {SKELS.map(i => (
        <div key={i} className='flex gap-4 px-4 py-3 border-b border-surface-600 last:border-0'>
          <div className='w-8 h-4 rounded bg-surface-500 animate-pulse' />
          <div className='h-3 rounded bg-surface-500 animate-pulse flex-1' style={{ maxWidth: `${80 + (i * 37) % 100}px` }} />
          <div className='h-4 w-16 rounded-full bg-surface-500 animate-pulse' />
          <div className='h-3 w-20 rounded bg-surface-500 animate-pulse ml-auto' />
        </div>
      ))}
    </div>
  )

  if (!leads.length) return (
    <div className='flex flex-col items-center justify-center py-20 bg-surface-700 rounded-xl border border-surface-400 shadow-card'>
      <p className='text-sm text-gray-500'>No leads match your filters.</p>
      <p className='text-2xs text-gray-700 mt-1'>Adjust your search or add a new lead.</p>
    </div>
  )

  return (
    <div className='bg-surface-700 rounded-xl border border-surface-400 shadow-card overflow-hidden'>
      <div className='overflow-x-auto'>
        <table className='w-full min-w-[960px]'>
          <thead><tr className='border-b border-surface-500'>
            <th className='pl-4 pr-3 pt-3 pb-2.5 text-left text-2xs font-medium text-gray-500 w-14'>Score</th>
            <Th col='name' label='Lead' cls='min-w-[160px]' />
            <Th col='status' label='Status' />
            <th className='text-left text-2xs font-medium text-gray-500 pb-2.5 pr-3 whitespace-nowrap'>MC #</th>
            <th className='text-left text-2xs font-medium text-gray-500 pb-2.5 pr-3'>Phone</th>
            <th className='text-left text-2xs font-medium text-gray-500 pb-2.5 pr-3'>Trailer</th>
            <th className='text-left text-2xs font-medium text-gray-500 pb-2.5 pr-3 whitespace-nowrap'>Auth Age</th>
            <Th col='follow_up_date' label='Follow-Up' />
            <Th col='priority' label='Priority' />
            <Th col='source' label='Source' />
            <th className='pr-4 w-16' />
          </tr></thead>
          <tbody className='divide-y divide-surface-600'>
            {leads.map(lead => (
              <tr key={lead.id} onClick={() => onSelect(lead)} className='cursor-pointer hover:bg-surface-600/40 transition-colors group'>
                <td className='pl-4 pr-3 py-2.5'><LeadScoreBadge lead={lead} /></td>
                <td className='pr-3 py-2.5'>
                  <p className='text-sm font-medium text-gray-100 truncate max-w-[180px]'>{lead.name}</p>
                  {lead.company && <p className='text-2xs text-gray-500 truncate'>{lead.company}</p>}
                </td>
                <td className='pr-3 py-2.5'>
                  <span className={`text-2xs px-2 py-0.5 rounded-full border ${STATUS_STYLES[lead.status]}`}>{lead.status}</span>
                </td>
                <td className='pr-3 py-2.5'><span className='text-xs font-mono text-gray-400'>{lead.mc_number ?? '—'}</span></td>
                <td className='pr-3 py-2.5'>
                  {lead.phone
                    ? <a href={`tel:${lead.phone}`} onClick={e => e.stopPropagation()} className='flex items-center gap-1 text-xs text-gray-400 hover:text-orange-400'><Phone size={10} />{lead.phone}</a>
                    : <span className='text-xs text-gray-700'>—</span>}
                </td>
                <td className='pr-3 py-2.5'><span className='text-xs text-gray-400'>{lead.trailer_type ?? '—'}</span></td>
                <td className='pr-3 py-2.5'><span className='text-xs text-gray-500'>{authAge(lead.authority_date)}</span></td>
                <td className='pr-3 py-2.5'>
                  <div className={`flex items-center gap-1 text-xs ${followUpCls(lead.follow_up_date)}`}>
                    <Calendar size={10} />{fmtDate(lead.follow_up_date)}
                  </div>
                </td>
                <td className='pr-3 py-2.5'><span className={`text-2xs px-1.5 py-0.5 rounded-full ${PRIORITY_STYLES[lead.priority]}`}>{lead.priority}</span></td>
                <td className='pr-3 py-2.5'><span className='text-xs text-gray-500'>{lead.source ?? '—'}</span></td>
                <td className='pr-4 py-2.5'>
                  <div className='flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity'>
                    <button onClick={e => { e.stopPropagation(); onEdit(lead) }} className='p-1 rounded hover:bg-surface-500 text-gray-500 hover:text-orange-400' title='Edit'><Edit2 size={12} /></button>
                    <button onClick={e => { e.stopPropagation(); onDelete(lead) }} className='p-1 rounded hover:bg-surface-500 text-gray-500 hover:text-red-400' title='Delete'><Trash2 size={12} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
