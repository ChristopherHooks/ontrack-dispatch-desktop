import { ChevronRight, Phone } from 'lucide-react'
import type { DriverProspect, ProspectStage } from '../../types/models'
import { STAGES, STAGE_DOTS, STAGE_BORDER, PRIORITY_STYLES } from './constants'

interface Props {
  prospects:      DriverProspect[]
  loading:        boolean
  onSelect:       (p: DriverProspect) => void
  onStageChange:  (p: DriverProspect, stage: ProspectStage) => void
}

const fmtDate = (d: string | null) => {
  if (!d) return null
  const [y, m, day] = d.split('-')
  return `${m}/${day}/${y.slice(2)}`
}

const dateCls = (d: string | null) => {
  if (!d) return ''
  const today = new Date().toISOString().split('T')[0]
  if (d < today) return 'text-red-400'
  if (d === today) return 'text-orange-400'
  return 'text-gray-500'
}

function ProspectCard({
  prospect,
  onSelect,
  onStageChange,
}: {
  prospect:      DriverProspect
  onSelect:      (p: DriverProspect) => void
  onStageChange: (p: DriverProspect, stage: ProspectStage) => void
}) {
  const currentIdx  = STAGES.indexOf(prospect.stage)
  const nextStage   = STAGES[currentIdx + 1] as ProspectStage | undefined
  const ds          = fmtDate(prospect.follow_up_date)

  return (
    <div
      onClick={() => onSelect(prospect)}
      className='bg-surface-600 border border-surface-400 rounded-lg p-3 cursor-pointer hover:border-orange-600/40 hover:shadow-card-hover transition-all group'
    >
      <div className='flex items-start justify-between gap-2 mb-2'>
        <div className='min-w-0'>
          <p className='text-sm font-medium text-gray-200 truncate'>{prospect.name}</p>
          {prospect.source && (
            <p className='text-2xs text-gray-500 truncate'>{prospect.source}</p>
          )}
        </div>
        <span className={`shrink-0 text-2xs px-1.5 py-0.5 rounded-full ${PRIORITY_STYLES[prospect.priority]}`}>
          {prospect.priority}
        </span>
      </div>

      <div className='space-y-0.5 mb-2.5'>
        {prospect.phone && (
          <p className='text-2xs text-gray-500 flex items-center gap-1'>
            <Phone size={9} className='shrink-0' />{prospect.phone}
          </p>
        )}
        {prospect.equipment_interest && (
          <p className='text-2xs text-gray-600'>{prospect.equipment_interest}</p>
        )}
        {(prospect.city || prospect.state) && (
          <p className='text-2xs text-gray-600'>
            {[prospect.city, prospect.state].filter(Boolean).join(', ')}
          </p>
        )}
        {ds && (
          <p className={`text-2xs ${dateCls(prospect.follow_up_date)}`}>
            Follow-up: {ds}
          </p>
        )}
        {prospect.contact_attempt_count > 0 && (
          <p className='text-2xs text-gray-700'>
            {prospect.contact_attempt_count} contact{prospect.contact_attempt_count !== 1 ? 's' : ''}
          </p>
        )}
      </div>

      <div className='flex items-center justify-between'>
        {prospect.cdl_class && (
          <span className='text-2xs text-gray-600'>CDL {prospect.cdl_class}</span>
        )}
        {nextStage && (
          <button
            onClick={e => { e.stopPropagation(); onStageChange(prospect, nextStage) }}
            className='flex items-center gap-0.5 text-2xs text-gray-600 hover:text-orange-400 opacity-0 group-hover:opacity-100 transition-all ml-auto'
          >
            {nextStage} <ChevronRight size={10} />
          </button>
        )}
      </div>
    </div>
  )
}

function Col({
  stage,
  prospects,
  loading,
  onSelect,
  onStageChange,
}: {
  stage:         ProspectStage
  prospects:     DriverProspect[]
  loading:       boolean
  onSelect:      (p: DriverProspect) => void
  onStageChange: (p: DriverProspect, stage: ProspectStage) => void
}) {
  return (
    <div className='flex flex-col min-w-[210px] w-full'>
      <div className={`flex items-center gap-2 mb-3 px-2 py-1.5 rounded-lg border bg-surface-800 ${STAGE_BORDER[stage]}`}>
        <span className={`w-2 h-2 rounded-full shrink-0 ${STAGE_DOTS[stage]}`} />
        <span className='text-2xs font-semibold uppercase tracking-wider flex-1 truncate'>{stage}</span>
        <span className='text-2xs font-mono bg-surface-700 px-1.5 py-0.5 rounded'>
          {loading ? '—' : prospects.length}
        </span>
      </div>
      <div className='flex flex-col gap-2'>
        {loading
          ? [0, 1, 2].map(i => (
              <div key={i} className='h-[90px] rounded-lg bg-surface-600 border border-surface-500 animate-pulse' />
            ))
          : prospects.length === 0
          ? (
              <div className='flex items-center justify-center h-20 rounded-lg border border-dashed border-surface-500'>
                <p className='text-2xs text-gray-700'>No prospects</p>
              </div>
            )
          : prospects.map(p => (
              <ProspectCard
                key={p.id}
                prospect={p}
                onSelect={onSelect}
                onStageChange={onStageChange}
              />
            ))
        }
      </div>
    </div>
  )
}

export function DriverAcquisitionKanban({ prospects, loading, onSelect, onStageChange }: Props) {
  return (
    <div className='flex gap-3 overflow-x-auto pb-4 min-h-0'>
      {STAGES.map(stage => (
        <Col
          key={stage}
          stage={stage}
          prospects={prospects.filter(p => p.stage === stage)}
          loading={loading}
          onSelect={onSelect}
          onStageChange={onStageChange}
        />
      ))}
    </div>
  )
}
