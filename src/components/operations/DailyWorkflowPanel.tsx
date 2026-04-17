/**
 * DailyWorkflowPanel
 * Renders the conditional, profit-first daily workflow on the Operations page.
 * Replaces the static Morning Briefing checklist.
 *
 * Actionable tasks are prominently displayed with a count badge and action button.
 * Not-applicable tasks are shown compact and gray — skip reasons are visible.
 * Completed tasks can be manually toggled by the dispatcher.
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Zap, TrendingUp, Shield, Settings2, ArrowRight,
  CheckCircle2, Minus, Circle, ChevronDown,
} from 'lucide-react'
import type { DailyWorkflowTask, WorkflowCategory } from '../../lib/dailyWorkflowEngine'
import { CATEGORY_ORDER } from '../../lib/dailyWorkflowEngine'

// ---------------------------------------------------------------------------
// Category display metadata
// ---------------------------------------------------------------------------

interface CategoryMeta {
  label:     string
  icon:      React.ReactNode
  headerCls: string
}

const CATEGORY_META: Record<WorkflowCategory, CategoryMeta> = {
  revenue_now: {
    label:     'Revenue Now',
    icon:      <Zap size={11} />,
    headerCls: 'text-orange-400',
  },
  revenue_protection: {
    label:     'Revenue Protection',
    icon:      <Shield size={11} />,
    headerCls: 'text-yellow-500',
  },
  pipeline: {
    label:     'Pipeline',
    icon:      <TrendingUp size={11} />,
    headerCls: 'text-blue-400',
  },
  admin: {
    label:     'Admin',
    icon:      <Settings2 size={11} />,
    headerCls: 'text-gray-500',
  },
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface Props {
  tasks:        DailyWorkflowTask[]
  onMarkDone:   (id: string) => void
  onMarkUndone: (id: string) => void
  loading:      boolean
  /**
   * 'grouped' (default) — tasks grouped by category with section headers
   * 'flat'              — all actionable tasks in a single ranked list with
   *                       inline category tags; N/A items collapsed by default
   */
  layout?:      'grouped' | 'flat'
}

// ---------------------------------------------------------------------------
// Main panel
// ---------------------------------------------------------------------------

// Inline tag config for flat mode
const FLAT_CATEGORY_TAG: Record<WorkflowCategory, { label: string; cls: string }> = {
  revenue_now:        { label: 'Revenue',    cls: 'text-orange-400 bg-orange-600/10 border-orange-600/30' },
  revenue_protection: { label: 'Cash Flow',  cls: 'text-yellow-500 bg-yellow-600/10 border-yellow-600/30' },
  pipeline:           { label: 'Pipeline',   cls: 'text-blue-400 bg-blue-600/10 border-blue-600/30' },
  admin:              { label: 'Admin',      cls: 'text-gray-500 bg-surface-600 border-surface-400' },
}

export function DailyWorkflowPanel({ tasks, onMarkDone, onMarkUndone, loading, layout = 'grouped' }: Props) {
  const navigate                    = useNavigate()
  const [naExpanded, setNaExpanded] = useState(false)

  const actionableCount = tasks.filter(t => t.status === 'actionable').length
  const completedCount  = tasks.filter(t => t.status === 'completed').length

  function handleAction(target?: string) {
    if (!target) return
    if (target.startsWith('#scroll:')) {
      const id = target.slice(8)
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    } else {
      navigate(target)
    }
  }

  // ── Flat layout ────────────────────────────────────────────────────────────
  if (layout === 'flat') {
    const activeTasks = tasks.filter(t => t.status === 'actionable' || t.status === 'completed')
    const naTasks     = tasks.filter(t => t.status === 'not_applicable')

    return (
      <div className='bg-surface-700 rounded-xl border border-surface-400 shadow-card overflow-hidden'>

        {/* Header */}
        <div className='flex items-center justify-between px-5 py-3 border-b border-surface-500/50'>
          <div className='flex items-center gap-2'>
            <Zap size={13} className={actionableCount > 0 ? 'text-orange-400' : 'text-green-400'} />
            <span className='text-sm font-semibold text-gray-100'>Daily Workflow</span>
            <span className='text-2xs text-gray-600 hidden sm:inline'>ranked by revenue impact</span>
          </div>
          <div className='flex items-center gap-2'>
            {loading ? (
              <span className='text-2xs text-gray-600'>Loading...</span>
            ) : actionableCount === 0 && completedCount === 0 ? (
              <span className='text-xs text-green-400 font-medium'>All clear</span>
            ) : (
              <span className='text-2xs text-gray-500'>
                {actionableCount > 0 && (
                  <span>
                    <span className='text-orange-400 font-semibold'>{actionableCount}</span>{' actionable'}
                  </span>
                )}
                {completedCount > 0 && (
                  <span className='ml-2 text-green-500'>{completedCount} done</span>
                )}
              </span>
            )}
          </div>
        </div>

        {/* Flat ranked list */}
        {!loading && (
          <>
            {activeTasks.length === 0 && naTasks.length > 0 && (
              <div className='px-5 py-3 text-center'>
                <p className='text-xs text-green-400 font-medium'>Nothing actionable right now.</p>
              </div>
            )}

            <div className='divide-y divide-surface-500/20'>
              {activeTasks.map((task, i) => {
                const tag = FLAT_CATEGORY_TAG[task.category]

                if (task.status === 'completed') {
                  return (
                    <div key={task.id} className='flex items-center gap-2.5 px-5 py-2'>
                      <button
                        onClick={() => onMarkUndone(task.id)}
                        title='Mark undone'
                        className='shrink-0 text-green-500 hover:text-gray-500 transition-colors'
                      >
                        <CheckCircle2 size={14} />
                      </button>
                      <span className='text-xs text-gray-600 line-through flex-1 truncate'>{task.title}</span>
                      <span className={`text-2xs px-1.5 py-0.5 rounded border ${tag.cls}`}>{tag.label}</span>
                      <span className='text-2xs text-green-700 shrink-0 font-medium'>Done</span>
                    </div>
                  )
                }

                const isUrgent = task.category === 'revenue_now' || task.category === 'revenue_protection'
                return (
                  <div
                    key={task.id}
                    className='flex items-center gap-2.5 px-5 py-2.5 hover:bg-surface-600/30 transition-colors group'
                  >
                    {/* Rank */}
                    <span className={`text-2xs font-bold w-4 text-center shrink-0 ${isUrgent ? 'text-orange-500' : 'text-gray-700'}`}>
                      {i + 1}
                    </span>

                    {/* Manual mark-done */}
                    <button
                      onClick={() => onMarkDone(task.id)}
                      title='Mark done'
                      className='shrink-0 w-3.5 h-3.5 rounded border border-surface-300 hover:border-green-500 hover:bg-green-900/40 transition-colors flex items-center justify-center'
                    >
                      <Circle size={8} className='text-transparent group-hover:text-green-600 transition-colors' />
                    </button>

                    {/* Title + meta */}
                    <div className='flex-1 min-w-0'>
                      <div className='flex items-center gap-2 flex-wrap'>
                        <span className={`text-xs font-semibold truncate ${isUrgent ? 'text-gray-200' : 'text-gray-300'}`}>
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
                        <p className='text-2xs text-gray-500 mt-0.5 truncate'>{task.description}</p>
                      )}
                    </div>

                    {/* Action button */}
                    {task.actionLabel && task.actionTarget && (
                      <button
                        onClick={() => handleAction(task.actionTarget)}
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

            {/* Collapsible N/A items */}
            {naTasks.length > 0 && (
              <div className='border-t border-surface-500/30'>
                <button
                  onClick={() => setNaExpanded(v => !v)}
                  className='w-full flex items-center gap-2 px-5 py-2 text-2xs text-gray-600 hover:text-gray-500 transition-colors'
                >
                  <ChevronDown size={11} className={`transition-transform ${naExpanded ? 'rotate-180' : ''}`} />
                  <span>{naTasks.length} items not needed today</span>
                </button>
                {naExpanded && (
                  <div className='pb-1.5'>
                    {naTasks.map(task => (
                      <div key={task.id} className='flex items-center gap-2.5 px-5 py-1 min-h-[28px]'>
                        <span className='shrink-0 w-4' />
                        <span className='shrink-0 text-gray-700'><Minus size={12} /></span>
                        <span className='text-xs text-gray-600 flex-1 truncate'>{task.title}</span>
                        {task.reason && (
                          <span className='text-2xs text-gray-700 italic shrink-0 truncate max-w-[220px] text-right'>
                            {task.reason}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    )
  }

  // ── Grouped layout (original) ──────────────────────────────────────────────
  return (
    <div className='bg-surface-700 rounded-xl border border-surface-400 shadow-card overflow-hidden'>

      {/* Header */}
      <div className='flex items-center justify-between px-5 py-3 border-b border-surface-500/50'>
        <div className='flex items-center gap-2'>
          <Zap
            size={13}
            className={actionableCount > 0 ? 'text-orange-400' : 'text-green-400'}
          />
          <span className='text-sm font-semibold text-gray-100'>Daily Workflow</span>
        </div>
        <div className='flex items-center gap-2'>
          {loading ? (
            <span className='text-2xs text-gray-600'>Loading...</span>
          ) : actionableCount === 0 && completedCount === 0 ? (
            <span className='text-xs text-green-400 font-medium'>All clear</span>
          ) : (
            <span className='text-2xs text-gray-500'>
              {actionableCount > 0 && (
                <span>
                  <span className='text-orange-400 font-semibold'>{actionableCount}</span>
                  {' actionable'}
                </span>
              )}
              {completedCount > 0 && (
                <span className='ml-2 text-green-500'>
                  {completedCount} done
                </span>
              )}
            </span>
          )}
        </div>
      </div>

      {/* Task groups */}
      {!loading && (
        <div className='divide-y divide-surface-500/30'>
          {CATEGORY_ORDER.map(cat => {
            const catTasks = tasks.filter(t => t.category === cat)
            if (catTasks.length === 0) return null
            const catActionable = catTasks.filter(t => t.status === 'actionable').length
            const meta = CATEGORY_META[cat]

            return (
              <div key={cat}>
                {/* Category header */}
                <div className='flex items-center gap-1.5 px-5 pt-2.5 pb-1'>
                  <span className={meta.headerCls}>{meta.icon}</span>
                  <span className={`text-2xs font-semibold uppercase tracking-wider ${meta.headerCls}`}>
                    {meta.label}
                  </span>
                  {catActionable > 0 && (
                    <span className='ml-1 text-2xs text-gray-600'>
                      — {catActionable} action{catActionable !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>

                {/* Tasks */}
                <div className='pb-1.5'>
                  {catTasks.map(task => (
                    <WorkflowTaskRow
                      key={task.id}
                      task={task}
                      onAction={handleAction}
                      onMarkDone={() => onMarkDone(task.id)}
                      onMarkUndone={() => onMarkUndone(task.id)}
                    />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Individual task row
// ---------------------------------------------------------------------------

function WorkflowTaskRow({ task, onAction, onMarkDone, onMarkUndone }: {
  task:        DailyWorkflowTask
  onAction:    (target?: string) => void
  onMarkDone:  () => void
  onMarkUndone: () => void
}) {

  // Not applicable — compact, gray, skip reason visible
  if (task.status === 'not_applicable') {
    return (
      <div className='flex items-center gap-2.5 px-5 py-1 min-h-[28px]'>
        <span className='shrink-0 text-gray-700'><Minus size={12} /></span>
        <span className='text-xs text-gray-600 flex-1 truncate'>{task.title}</span>
        {task.reason && (
          <span className='text-2xs text-gray-700 italic shrink-0 truncate max-w-[220px] text-right'>
            {task.reason}
          </span>
        )}
      </div>
    )
  }

  // Completed — green check, strikethrough, click to undo
  if (task.status === 'completed') {
    return (
      <div className='flex items-center gap-2.5 px-5 py-1.5'>
        <button
          onClick={onMarkUndone}
          title='Mark undone'
          className='shrink-0 text-green-500 hover:text-gray-500 transition-colors'
        >
          <CheckCircle2 size={14} />
        </button>
        <span className='text-xs text-gray-600 line-through flex-1 truncate'>{task.title}</span>
        <span className='text-2xs text-green-700 shrink-0 font-medium'>Done</span>
      </div>
    )
  }

  // Actionable — prominent with count badge and action button
  return (
    <div className='flex items-center gap-2.5 px-5 py-2 hover:bg-surface-600/30 transition-colors group'>
      {/* Manual mark-done checkbox */}
      <button
        onClick={onMarkDone}
        title='Mark done'
        className='shrink-0 w-3.5 h-3.5 rounded border border-surface-300 hover:border-green-500 hover:bg-green-900/40 transition-colors flex items-center justify-center'
      >
        <Circle size={8} className='text-transparent group-hover:text-green-600 transition-colors' />
      </button>

      {/* Title + description */}
      <div className='flex-1 min-w-0'>
        <div className='flex items-center gap-2 flex-wrap'>
          <span className='text-xs font-semibold text-gray-200 truncate'>{task.title}</span>
          {task.count != null && task.count > 0 && (
            <span className='shrink-0 text-2xs font-bold text-white bg-orange-600 px-1.5 py-0.5 rounded-full leading-none'>
              {task.count}
            </span>
          )}
        </div>
        {task.description && (
          <p className='text-2xs text-gray-500 mt-0.5 truncate'>{task.description}</p>
        )}
      </div>

      {/* Action button */}
      {task.actionLabel && task.actionTarget && (
        <button
          onClick={() => onAction(task.actionTarget)}
          className='shrink-0 flex items-center gap-1 px-2.5 py-1 text-2xs font-medium bg-orange-600 hover:bg-orange-500 text-white rounded-lg transition-colors whitespace-nowrap'
        >
          {task.actionLabel}
          <ArrowRight size={10} />
        </button>
      )}
    </div>
  )
}
