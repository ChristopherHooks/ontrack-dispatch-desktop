import { ChevronUp, ChevronDown, Phone, Edit2, Trash2, Calendar } from 'lucide-react'
import type { Lead, LeadStatus } from '../../types/models'
import { LeadScoreBadge } from './LeadScoreBadge'
import { STATUS_STYLES, PRIORITY_STYLES, STATUSES } from './constants'
import { openSaferMc, openSaferDot } from '../../lib/saferUrl'

type SortKey = keyof Lead
type SortDir = 'asc' | 'desc'

interface Props {
  leads:               Lead[]
  loading:             boolean
  sortKey:             SortKey
  sortDir:             SortDir
  onSort:              (key: SortKey) => void
  onSelect:            (lead: Lead) => void
  onEdit:              (lead: Lead) => void
  onDelete:            (lead: Lead) => void
  onStatusChange:      (lead: Lead, status: LeadStatus) => void
  duplicateMcNumbers?: Set<string>
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

// Days since last contact — uses last_contact_date, falls back to created_at
function daysSinceContact(lead: Lead): number | null {
  const ref = lead.last_contact_date ?? null
  if (!ref) return null
  const diff = Date.now() - new Date(ref).getTime()
  return Math.floor(diff / 86400000)
}

function contactAgeCls(days: number | null, status: string): string {
  if (days === null) return 'text-gray-700'
  // Converted / Not Interested / Bad Fit — don't need urgency colouring
  if (['Converted', 'Signed', 'Not Interested', 'Bad Fit', 'Rejected', 'Inactive MC'].includes(status)) return 'text-gray-600'
  if (days >= 21) return 'text-red-400 font-medium'
  if (days >= 14) return 'text-yellow-400'
  return 'text-gray-500'
}

const SKELS = [0, 1, 2, 3, 4, 5]

export function LeadsTable({ leads, loading, sortKey, sortDir, onSort, onSelect, onEdit, onDelete, onStatusChange, duplicateMcNumbers }: Props) {
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
            <th className='text-left text-2xs font-medium text-gray-500 pb-2.5 pr-3 whitespace-nowrap'>MC / DOT</th>
            <th className='text-left text-2xs font-medium text-gray-500 pb-2.5 pr-3'>Phone</th>
            <th className='text-left text-2xs font-medium text-gray-500 pb-2.5 pr-3'>State</th>
            <th className='text-left text-2xs font-medium text-gray-500 pb-2.5 pr-3'>Trailer</th>
            <Th col='fleet_size' label='Fleet' />
            <Th col='authority_date' label='Auth Age' />
            <Th col='follow_up_date' label='Follow-Up' />
            <Th col='last_contact_date' label='Last Contact' />
            <Th col='priority' label='Priority' />
            <Th col='source' label='Source' />
            <th className='pr-4 w-16' />
          </tr></thead>
          <tbody className='divide-y divide-surface-600'>
            {leads.map(lead => (
              <tr key={lead.id} onClick={() => onSelect(lead)} className='cursor-pointer hover:bg-surface-600/40 transition-colors group'>
                <td className='pl-4 pr-3 py-2.5'><LeadScoreBadge lead={lead} /></td>
                <td className='pr-3 py-2.5 max-w-[260px]'>
                  <div className='flex items-center gap-1.5 flex-wrap'>
                    <p className='text-sm font-medium text-gray-100 break-words leading-snug' title={lead.name}>{lead.name}</p>
                    {lead.mc_number && duplicateMcNumbers?.has(lead.mc_number) && (
                      <span className='text-2xs px-1.5 py-0.5 rounded bg-red-900/40 text-red-400 border border-red-800/40 font-medium shrink-0'>DUPE</span>
                    )}
                  </div>
                  {lead.company && <p className='text-2xs text-gray-500 truncate' title={lead.company}>{lead.company}</p>}
                </td>
                <td className='pr-3 py-2.5' onClick={e => e.stopPropagation()}>
                  <select
                    value={lead.status}
                    onChange={e => onStatusChange(lead, e.target.value as LeadStatus)}
                    title='Change status'
                    className={`appearance-none text-2xs px-2 py-0.5 rounded-full border cursor-pointer focus:outline-none focus:ring-1 focus:ring-orange-600/40 ${STATUS_STYLES[lead.status]}`}
                  >
                    {STATUSES.map(s => <option key={s} value={s} className='bg-surface-700 text-gray-200'>{s}</option>)}
                  </select>
                </td>
                <td className='pr-3 py-2.5'>
                  {lead.mc_number
                    ? <button onClick={e => openSaferMc(lead.mc_number, e)}
                          className='text-xs font-mono text-gray-400 hover:text-orange-400 hover:underline transition-colors cursor-pointer'
                          title='View on FMCSA SAFER'>{lead.mc_number}</button>
                    : lead.dot_number
                      ? <button onClick={e => openSaferDot(lead.dot_number!, e)}
                            className='text-xs font-mono text-gray-500 hover:text-orange-400 hover:underline transition-colors cursor-pointer'
                            title='View on FMCSA SAFER'>DOT-{lead.dot_number}</button>
                      : <span className='text-xs text-gray-400'>—</span>}
                </td>
                <td className='pr-3 py-2.5'>
                  {lead.phone
                    ? <button onClick={e => { e.stopPropagation(); (window.api as any).shell.openExternal(`https://voice.google.com/calls?a=nc,${encodeURIComponent(lead.phone)}`) }} className='flex items-center gap-1 text-xs text-gray-400 hover:text-orange-400'><Phone size={10} />{lead.phone}</button>
                    : <span className='text-xs text-gray-400'>—</span>}
                </td>
                <td className='pr-3 py-2.5'><span className='text-xs text-gray-400'>{lead.state ?? '—'}</span></td>
                <td className='pr-3 py-2.5'><span className='text-xs text-gray-400'>{lead.trailer_type ?? '—'}</span></td>
                <td className='pr-3 py-2.5'>
                  {lead.fleet_size != null
                    ? <span className='text-xs text-gray-300 font-medium'>{lead.fleet_size}T</span>
                    : <span className='text-xs text-gray-400'>—</span>}
                </td>
                <td className='pr-3 py-2.5'><span className='text-xs text-gray-500'>{authAge(lead.authority_date)}</span></td>
                <td className='pr-3 py-2.5'>
                  <div className={`flex items-center gap-1 text-xs ${followUpCls(lead.follow_up_date)}`}>
                    <Calendar size={10} />{fmtDate(lead.follow_up_date)}
                  </div>
                </td>
                <td className='pr-3 py-2.5'>
                  {(() => {
                    const days = daysSinceContact(lead)
                    if (days === null) return <span className='text-xs text-gray-700'>—</span>
                    return (
                      <span className={`text-xs ${contactAgeCls(days, lead.status)}`} title={`Last contact: ${lead.last_contact_date}`}>
                        {days === 0 ? 'today' : `${days}d ago`}
                      </span>
                    )
                  })()}
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
