import { ChevronRight } from 'lucide-react'
import type { Lead, LeadStatus } from '../../types/models'
import { LeadScoreBadge } from './LeadScoreBadge'
import { STATUS_DOTS, PRIORITY_STYLES, STATUSES } from './constants'

interface Props {
  leads:          Lead[]
  loading:        boolean
  onSelect:       (l: Lead) => void
  onStatusChange: (l: Lead, s: LeadStatus) => void
}

const fmtDate = (d: string | null) => {
  if (!d) return null
  const [y, m, day] = d.split('-')
  return `${m}/${day}/${y.slice(2)}`
}
const dateCls = (d: string | null) => {
  if (!d) return ''
  const t = new Date().toISOString().split('T')[0]
  return d < t ? 'text-red-400' : d === t ? 'text-orange-400' : 'text-gray-500'
}

function LeadCard({ lead, onSelect, onStatusChange }: { lead: Lead; onSelect: (l: Lead) => void; onStatusChange: (l: Lead, s: LeadStatus) => void }) {
  const nextStatus = STATUSES[STATUSES.indexOf(lead.status) + 1] as LeadStatus | undefined
  const ds = fmtDate(lead.follow_up_date)
  return (
    <div onClick={() => onSelect(lead)} className='bg-surface-600 border border-surface-400 rounded-lg p-3 cursor-pointer hover:border-orange-600/40 hover:shadow-card-hover transition-all group'>
      <div className='flex items-start justify-between gap-2 mb-2'>
        <div className='min-w-0'>
          <p className='text-sm font-medium text-gray-200 truncate'>{lead.name}</p>
          {lead.company && <p className='text-2xs text-gray-500 truncate'>{lead.company}</p>}
        </div>
        <LeadScoreBadge lead={lead} />
      </div>
      <div className='space-y-0.5 mb-2.5'>
        {lead.phone && <p className='text-2xs text-gray-500'>{lead.phone}</p>}
        {lead.trailer_type && <p className='text-2xs text-gray-600'>{lead.trailer_type}</p>}
        {ds && <p className={`text-2xs ${dateCls(lead.follow_up_date)}`}>↻ {ds}</p>}
      </div>
      <div className='flex items-center justify-between'>
        <span className={`text-2xs px-1.5 py-0.5 rounded-full ${PRIORITY_STYLES[lead.priority]}`}>{lead.priority}</span>
        {nextStatus && (
          <button onClick={e => { e.stopPropagation(); onStatusChange(lead, nextStatus) }}
            className='flex items-center gap-0.5 text-2xs text-gray-600 hover:text-orange-400 opacity-0 group-hover:opacity-100 transition-all'>
            {nextStatus} <ChevronRight size={10} />
          </button>
        )}
      </div>
    </div>
  )
}

function Col({ status, leads, loading, onSelect, onStatusChange }: { status: LeadStatus; leads: Lead[]; loading: boolean; onSelect: (l: Lead) => void; onStatusChange: (l: Lead, s: LeadStatus) => void }) {
  return (
    <div className='flex flex-col min-w-[220px] w-full'>
      <div className='flex items-center gap-2 mb-3 px-1'>
        <span className={`w-2 h-2 rounded-full shrink-0 ${STATUS_DOTS[status]}`} />
        <span className='text-sm font-semibold text-gray-300'>{status}</span>
        <span className='text-2xs text-gray-600 ml-auto'>{loading ? '—' : leads.length}</span>
      </div>
      <div className='flex flex-col gap-2'>
        {loading
          ? [0,1,2].map(i => <div key={i} className='h-[84px] rounded-lg bg-surface-600 border border-surface-500 animate-pulse' />)
          : leads.length === 0
          ? <div className='flex items-center justify-center h-20 rounded-lg border border-dashed border-surface-500'>
              <p className='text-2xs text-gray-700'>No leads</p>
            </div>
          : leads.map(l => <LeadCard key={l.id} lead={l} onSelect={onSelect} onStatusChange={onStatusChange} />)
        }
      </div>
    </div>
  )
}

export function LeadsKanban({ leads, loading, onSelect, onStatusChange }: Props) {
  return (
    <div className='flex gap-4 overflow-x-auto pb-4 min-h-0'>
      {STATUSES.map(s => (
        <Col key={s} status={s} leads={leads.filter(l => l.status === s)} loading={loading} onSelect={onSelect} onStatusChange={onStatusChange} />
      ))}
    </div>
  )
}
