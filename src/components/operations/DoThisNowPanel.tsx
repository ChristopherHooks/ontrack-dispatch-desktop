/**
 * DoThisNowPanel
 * Priority-driven command panel — answers "What do I do in the next 5–10 minutes?"
 *
 * Reads from the already-computed DailyWorkflowTask list (sorted by priority) and
 * the idle drivers list from ProfitRadar. No new data fetching.
 *
 * Render rules:
 *   - Shows only actionable tasks (status === 'actionable'), up to 5 items
 *   - When book_loads is actionable AND idle drivers are known, expands each driver
 *     into its own row with location + lane suggestions + direct Load Match button
 *   - All other actionable tasks rendered as compact rows with direct action buttons
 *   - All-clear state shown when nothing is actionable
 */

import { useNavigate } from 'react-router-dom'
import { loadMatchRoute } from '../../lib/routeIntents'
import {
  Zap, Truck, ArrowRight, MapPin, FileText,
  AlertTriangle, Phone, Clock,
} from 'lucide-react'
import type { DailyWorkflowTask, WorkflowCategory } from '../../lib/dailyWorkflowEngine'
import type { DriverOpportunity } from '../../types/models'

// ---------------------------------------------------------------------------
// Lane suggestion table
// State → 3 common destination cities (used as chips)
// ---------------------------------------------------------------------------

const STATE_LANES: Record<string, string[]> = {
  TX: ['Chicago IL', 'Atlanta GA', 'Los Angeles CA'],
  OK: ['Dallas TX', 'Chicago IL', 'Nashville TN'],
  IL: ['Dallas TX', 'Atlanta GA', 'Charlotte NC'],
  GA: ['Chicago IL', 'Dallas TX', 'Charlotte NC'],
  CA: ['Phoenix AZ', 'Dallas TX', 'Portland OR'],
  OH: ['Charlotte NC', 'Nashville TN', 'Dallas TX'],
  NC: ['Chicago IL', 'Dallas TX', 'Atlanta GA'],
  TN: ['Chicago IL', 'Atlanta GA', 'Dallas TX'],
  FL: ['Atlanta GA', 'Charlotte NC', 'Chicago IL'],
  KS: ['Dallas TX', 'Chicago IL', 'Denver CO'],
  MO: ['Chicago IL', 'Atlanta GA', 'Dallas TX'],
  AR: ['Dallas TX', 'Chicago IL', 'Nashville TN'],
  MS: ['Atlanta GA', 'Dallas TX', 'Chicago IL'],
  AL: ['Atlanta GA', 'Nashville TN', 'Charlotte NC'],
  SC: ['Charlotte NC', 'Atlanta GA', 'Chicago IL'],
  VA: ['Charlotte NC', 'Chicago IL', 'Atlanta GA'],
  PA: ['Charlotte NC', 'Chicago IL', 'Nashville TN'],
  NJ: ['Charlotte NC', 'Chicago IL', 'Atlanta GA'],
  NY: ['Charlotte NC', 'Chicago IL', 'Atlanta GA'],
  CO: ['Dallas TX', 'Chicago IL', 'Kansas City MO'],
  AZ: ['Los Angeles CA', 'Dallas TX', 'Denver CO'],
}

function getSuggestedLanes(location: string | null | undefined): string[] {
  if (!location) return []
  const stateMatch = location.match(/\b([A-Z]{2})\b/)
  if (!stateMatch) return []
  return STATE_LANES[stateMatch[1]] ?? []
}

// ---------------------------------------------------------------------------
// Category accent colors (inline tag)
// ---------------------------------------------------------------------------

const CATEGORY_TAG: Record<WorkflowCategory, { label: string; cls: string }> = {
  revenue_now:        { label: 'Revenue',    cls: 'text-orange-400 bg-orange-600/10 border-orange-600/30' },
  revenue_protection: { label: 'Cash Flow',  cls: 'text-yellow-500 bg-yellow-600/10 border-yellow-600/30' },
  pipeline:           { label: 'Pipeline',   cls: 'text-blue-400 bg-blue-600/10 border-blue-600/30' },
  admin:              { label: 'Admin',      cls: 'text-gray-500 bg-surface-600 border-surface-400' },
}

// Map task IDs to context icons
const TASK_ICON: Partial<Record<string, React.ReactNode>> = {
  book_loads:        <Truck size={12} />,
  check_calls:       <Clock size={12} />,
  invoice_delivered: <FileText size={12} />,
  ar_followup:       <FileText size={12} />,
  compliance:        <AlertTriangle size={12} />,
  lead_followup:     <Phone size={12} />,
  driver_prospects:  <Phone size={12} />,
  stale_loads:       <AlertTriangle size={12} />,
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface Props {
  tasks:       DailyWorkflowTask[]
  idleDrivers: DriverOpportunity[]
  loading:     boolean
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function DoThisNowPanel({ tasks, idleDrivers, loading }: Props) {
  const navigate = useNavigate()

  function go(target?: string) {
    if (!target) return
    if (target.startsWith('#scroll:')) {
      const id = target.slice(8)
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    } else {
      navigate(target)
    }
  }

  if (loading) {
    return (
      <div className='bg-surface-700 rounded-xl border border-orange-600/30 px-5 py-4 shadow-card'>
        <div className='flex items-center gap-2'>
          <Zap size={13} className='text-orange-400 animate-pulse' />
          <span className='text-sm font-semibold text-gray-200'>Do This Now</span>
          <span className='text-2xs text-gray-600 ml-1'>Loading priorities...</span>
        </div>
      </div>
    )
  }

  const actionable    = tasks.filter(t => t.status === 'actionable')
  const bookLoadsTask = actionable.find(t => t.id === 'book_loads')
  const showDrivers   = bookLoadsTask != null && idleDrivers.length > 0

  // Other tasks to show (skip book_loads when we're showing per-driver rows)
  const otherTasks = actionable
    .filter(t => showDrivers ? t.id !== 'book_loads' : true)
    .slice(0, 5)

  const allClear = actionable.length === 0

  return (
    <div className='bg-surface-700 rounded-xl border border-orange-600/40 shadow-card overflow-hidden'>

      {/* Header */}
      <div className='flex items-center justify-between px-5 py-3 border-b border-orange-600/20 bg-orange-600/5'>
        <div className='flex items-center gap-2'>
          <Zap size={14} className={allClear ? 'text-green-400' : 'text-orange-400'} />
          <span className='text-sm font-bold text-gray-100'>Do This Now</span>
          {!allClear && (
            <span className='text-2xs text-gray-500 hidden sm:inline'>highest-value actions right now</span>
          )}
        </div>
        {!allClear && (
          <span className='text-2xs font-semibold text-orange-400'>
            {actionable.length} action{actionable.length !== 1 ? 's' : ''} needed
          </span>
        )}
      </div>

      {/* All-clear state */}
      {allClear && (
        <div className='px-5 py-6 text-center'>
          <p className='text-sm text-green-400 font-medium'>All clear — operations on track.</p>
          <p className='text-xs text-gray-600 mt-1'>No urgent actions right now. Check back after new activity.</p>
        </div>
      )}

      {/* Action items */}
      {!allClear && (
        <div className='divide-y divide-surface-500/30'>

          {/* Driver rows — expanded from book_loads when idle drivers are known */}
          {showDrivers && idleDrivers.slice(0, 3).map((d, idx) => {
            const loc   = d.location ?? d.homeBase
            const lanes = getSuggestedLanes(loc)
            return (
              <div key={d.driverId} className='px-5 py-3.5 hover:bg-surface-600/30 transition-colors'>
                <div className='flex items-start gap-3'>

                  {/* Rank + icon */}
                  <div className='flex items-center gap-1 shrink-0 mt-0.5'>
                    <span className='text-2xs font-bold text-orange-500 w-4 text-center'>{idx + 1}</span>
                    <Truck size={12} className='text-orange-400' />
                  </div>

                  {/* Content */}
                  <div className='flex-1 min-w-0'>
                    <div className='flex items-center gap-2 flex-wrap mb-0.5'>
                      <span className='text-xs font-semibold text-gray-100'>{d.name}</span>
                      {d.truckType && (
                        <span className='text-2xs text-gray-500'>{d.truckType}</span>
                      )}
                      <span className={`text-2xs px-1.5 py-0.5 rounded border ${CATEGORY_TAG.revenue_now.cls}`}>
                        {CATEGORY_TAG.revenue_now.label}
                      </span>
                    </div>

                    {loc ? (
                      <div className='flex items-center gap-1 text-2xs text-gray-400 mb-1.5'>
                        <MapPin size={9} className='shrink-0 text-orange-500' />
                        <span>{loc} — empty, needs load assigned</span>
                      </div>
                    ) : (
                      <p className='text-2xs text-gray-500 mb-1.5'>Location unknown — check driver profile</p>
                    )}

                    {/* Lane suggestion chips */}
                    {lanes.length > 0 && (
                      <div className='flex items-center gap-1.5 flex-wrap'>
                        <span className='text-2xs text-gray-600'>Suggested lanes:</span>
                        {lanes.map(lane => (
                          <button
                            key={lane}
                            onClick={() => navigate(loadMatchRoute(d.driverId))}
                            className='text-2xs px-2 py-0.5 bg-surface-600 hover:bg-orange-600/20 border border-surface-400 hover:border-orange-600/50 text-gray-400 hover:text-orange-300 rounded-md transition-colors'
                          >
                            {lane}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Action button */}
                  <button
                    onClick={() => navigate(loadMatchRoute(d.driverId))}
                    className='shrink-0 flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-orange-600 hover:bg-orange-500 text-white rounded-lg transition-colors whitespace-nowrap'
                  >
                    Match Loads
                    <ArrowRight size={11} />
                  </button>
                </div>
              </div>
            )
          })}

          {/* Other actionable workflow tasks */}
          {otherTasks.map((task, i) => {
            const rank     = (showDrivers ? Math.min(idleDrivers.length, 3) : 0) + i + 1
            const isUrgent = task.category === 'revenue_now' || task.category === 'revenue_protection'
            const icon     = TASK_ICON[task.id]
            const tag      = CATEGORY_TAG[task.category]

            return (
              <div
                key={task.id}
                className='flex items-center gap-3 px-5 py-3 hover:bg-surface-600/30 transition-colors group'
              >
                {/* Rank */}
                <span className={`text-2xs font-bold w-4 text-center shrink-0 ${isUrgent ? 'text-orange-500' : 'text-gray-600'}`}>
                  {rank}
                </span>

                {/* Icon */}
                <span className={isUrgent ? 'text-orange-400 shrink-0' : 'text-gray-500 shrink-0'}>
                  {icon ?? <Zap size={12} />}
                </span>

                {/* Title + context */}
                <div className='flex-1 min-w-0'>
                  <div className='flex items-center gap-2 flex-wrap mb-0.5'>
                    <span className={`text-xs font-semibold truncate ${isUrgent ? 'text-gray-100' : 'text-gray-300'}`}>
                      {task.title}
                    </span>
                    {task.count != null && task.count > 0 && (
                      <span className='shrink-0 text-2xs font-bold text-white bg-orange-600 px-1.5 py-0.5 rounded-full leading-none'>
                        {task.count}
                      </span>
                    )}
                    <span className={`text-2xs px-1.5 py-0.5 rounded border shrink-0 ${tag.cls}`}>
                      {tag.label}
                    </span>
                  </div>
                  {task.description && (
                    <p className='text-2xs text-gray-500 truncate'>{task.description}</p>
                  )}
                </div>

                {/* Action button */}
                {task.actionLabel && task.actionTarget && (
                  <button
                    onClick={() => go(task.actionTarget)}
                    className={[
                      'shrink-0 flex items-center gap-1 px-2.5 py-1.5 text-2xs font-medium rounded-lg transition-colors whitespace-nowrap',
                      isUrgent
                        ? 'bg-orange-600 hover:bg-orange-500 text-white'
                        : 'bg-surface-600 hover:bg-surface-500 border border-surface-400 text-gray-300',
                    ].join(' ')}
                  >
                    {task.actionLabel}
                    <ArrowRight size={10} />
                  </button>
                )}
              </div>
            )
          })}

        </div>
      )}
    </div>
  )
}
