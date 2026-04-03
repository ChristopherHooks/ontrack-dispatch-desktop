import { useState, useEffect } from 'react'
import { X, RefreshCw, Trash2, Calendar, Clock, Tag, AlertCircle } from 'lucide-react'
import type { Task, TaskCompletion } from '../../types/models'
import { CATEGORY_STYLES, PRIORITY_STYLES, PRIORITY_DOT } from './constants'

interface Props {
  task: Task | null
  onClose: () => void
  onEdit: (task: Task) => void
  onDelete: (id: number) => void
  onToggleComplete: (task: Task, done: boolean) => void
  doneToday: boolean
}

export function TaskDrawer({ task, onClose, onEdit, onDelete, onToggleComplete, doneToday }: Props) {
  const [history, setHistory] = useState<TaskCompletion[]>([])
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (!task) return
    window.api.tasks.getCompletions(task.id).then(setHistory).catch(() => {})
  }, [task?.id])

  if (!task) return null

  const catStyle  = CATEGORY_STYLES[task.category ?? 'Other'] ?? CATEGORY_STYLES['Other']
  const priStyle  = PRIORITY_STYLES[task.priority]
  const priDot    = PRIORITY_DOT[task.priority]
  const isRecurring = task.recurring === 1
  const isDaily     = task.due_date === 'Daily'

  function handleDelete() {
    if (!deleting) { setDeleting(true); return }
    onDelete(task.id)
  }

  return (
    <div className='fixed inset-0 z-40 flex justify-end'>
      <div className='absolute inset-0 bg-black/40' onClick={onClose} />
      <div className='relative w-[460px] h-full bg-surface-800 border-l border-surface-400 flex flex-col shadow-2xl overflow-y-auto'>

        {/* Header */}
        <div className='flex items-start justify-between px-5 py-4 border-b border-surface-400 gap-3'>
          <div className='flex-1 min-w-0'>
            <div className='flex items-center gap-2 flex-wrap'>
              <span className={['text-2xs px-2 py-0.5 rounded-full border font-medium', catStyle].join(' ')}>
                {task.category ?? 'Other'}
              </span>
              <span className={['text-2xs px-2 py-0.5 rounded-full border font-medium flex items-center gap-1', priStyle].join(' ')}>
                <span className={['w-1.5 h-1.5 rounded-full', priDot].join(' ')} />
                {task.priority}
              </span>
              {isRecurring && (
                <span className='text-2xs px-2 py-0.5 rounded-full border border-blue-500/40 bg-blue-500/10 text-blue-300 flex items-center gap-1'>
                  <RefreshCw size={10} /> Recurring
                </span>
              )}
            </div>
            <h2 className='text-base font-semibold text-gray-100 mt-2 leading-snug'>{task.title}</h2>
          </div>
          <button onClick={onClose} className='text-gray-500 hover:text-gray-300 mt-0.5 flex-shrink-0'>
            <X size={16} />
          </button>
        </div>

        {/* Action */}
        <div className='px-5 py-4 border-b border-surface-400'>
          <button
            onClick={() => onToggleComplete(task, !doneToday)}
            className={[
              'w-full py-2.5 rounded-lg text-sm font-medium transition-all',
              doneToday
                ? 'bg-green-600/20 border border-green-600/40 text-green-400 hover:bg-green-600/30'
                : 'bg-orange-600 hover:bg-orange-500 text-white',
            ].join(' ')}
          >
            {doneToday ? 'Mark Incomplete' : 'Mark Complete for Today'}
          </button>
        </div>

        {/* Details */}
        <div className='px-5 py-4 space-y-3 border-b border-surface-400'>
          <DetailRow icon={<Calendar size={13} />} label='Due Date'>
            <span className='text-sm text-gray-200'>{isDaily ? 'Every day' : (task.due_date ?? 'None')}</span>
          </DetailRow>
          {task.time_of_day && (
            <DetailRow icon={<Clock size={13} />} label='Time'>
              <span className='text-sm text-gray-200'>{task.time_of_day}</span>
            </DetailRow>
          )}
          {task.category && (
            <DetailRow icon={<Tag size={13} />} label='Category'>
              <span className='text-sm text-gray-200'>{task.category}</span>
            </DetailRow>
          )}
        </div>

        {/* Notes */}
        {task.notes && (
          <div className='px-5 py-4 border-b border-surface-400'>
            <p className='text-xs font-medium text-gray-500 mb-2'>Notes</p>
            <p className='text-sm text-gray-300 whitespace-pre-wrap'>{task.notes}</p>
          </div>
        )}

        {/* Completion history */}
        <div className='px-5 py-4 flex-1'>
          <p className='text-xs font-medium text-gray-500 mb-3'>Completion History</p>
          {history.length === 0 ? (
            <p className='text-sm text-gray-600 italic'>No completions recorded yet</p>
          ) : (
            <div className='space-y-1.5'>
              {history.slice(0, 30).map(h => (
                <div key={h.id} className='flex items-center gap-2 text-xs'>
                  <span className='w-2 h-2 rounded-full bg-green-500 flex-shrink-0' />
                  <span className='text-gray-300 font-mono'>{h.completed_date}</span>
                  <span className='text-gray-600'>completed</span>
                </div>
              ))}
              {history.length > 30 && (
                <p className='text-2xs text-gray-600 pt-1'>+ {history.length - 30} more</p>
              )}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className='px-5 py-4 border-t border-surface-400 flex items-center justify-between'>
          <button
            onClick={handleDelete}
            className={[
              'flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-all',
              deleting
                ? 'border-red-600 text-red-400 bg-red-900/20'
                : 'border-surface-400 text-gray-500 hover:text-red-400 hover:border-red-600/40',
            ].join(' ')}
          >
            <Trash2 size={12} />
            {deleting ? 'Confirm delete' : 'Delete'}
          </button>
          <button
            onClick={() => onEdit(task)}
            className='text-xs px-4 py-1.5 bg-surface-600 hover:bg-surface-500 border border-surface-400 text-gray-300 rounded-lg transition-colors'
          >
            Edit Task
          </button>
        </div>
      </div>
    </div>
  )
}

function DetailRow({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className='flex items-center gap-3'>
      <span className='text-gray-500 flex-shrink-0'>{icon}</span>
      <span className='text-xs text-gray-500 w-20 flex-shrink-0'>{label}</span>
      {children}
    </div>
  )
}
