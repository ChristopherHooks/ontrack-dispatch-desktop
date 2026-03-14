import { useState, useEffect, useCallback } from 'react'
import { CheckSquare, Square, Clock, RefreshCw, ChevronRight } from 'lucide-react'
import type { Task, TaskCompletion } from '../types/models'
import { TasksToolbar } from '../components/tasks/TasksToolbar'
import { TaskModal } from '../components/tasks/TaskModal'
import { TaskDrawer } from '../components/tasks/TaskDrawer'
import {
  CATEGORY_STYLES, PRIORITY_DOT, PRIORITY_STYLES,
  todayDate, isTaskForToday,
} from '../components/tasks/constants'

export function Tasks() {
  const [tasks, setTasks]             = useState<Task[]>([])
  const [completedIds, setCompletedIds] = useState<Set<number>>(new Set())
  const [view, setView]               = useState<'today' | 'all' | 'history'>('today')
  const [search, setSearch]           = useState('')
  const [category, setCategory]       = useState('')
  const [modalTask, setModalTask]     = useState<Task | null | undefined>(undefined)
  const [drawerTask, setDrawerTask]   = useState<Task | null>(null)
  const [history, setHistory]         = useState<{ date: string; ids: number[] }[]>([])
  const today = todayDate()

  const load = useCallback(async () => {
    const all = await window.api.tasks.list()
    setTasks(all)
    const completions = await window.api.tasksExtra.completionsForDate(today)
    setCompletedIds(new Set(completions.map(c => c.task_id)))
  }, [today])

  useEffect(() => { load() }, [load])

  // Build 30-day history view
  useEffect(() => {
    if (view !== 'history') return
    async function buildHistory() {
      const days: { date: string; ids: number[] }[] = []
      for (let i = 0; i < 30; i++) {
        const d = new Date()
        d.setDate(d.getDate() - i)
        const dateStr = d.toISOString().split('T')[0]
        const comps = await window.api.tasksExtra.completionsForDate(dateStr)
        days.push({ date: dateStr, ids: comps.map(c => c.task_id) })
      }
      setHistory(days)
    }
    buildHistory().catch(console.error)
  }, [view])

  async function handleToggle(task: Task, done: boolean) {
    if (done) {
      await window.api.tasks.markComplete(task.id, today, 1)
      setCompletedIds(prev => new Set(prev).add(task.id))
    } else {
      await window.api.tasks.markIncomplete(task.id, today)
      setCompletedIds(prev => { const s = new Set(prev); s.delete(task.id); return s })
    }
  }

  async function handleSave(dto: any) {
    if (modalTask) {
      await window.api.tasks.update(modalTask.id, dto)
    } else {
      await window.api.tasks.create(dto)
    }
    await load()
  }

  async function handleDelete(id: number) {
    await window.api.tasks.delete(id)
    setDrawerTask(null)
    await load()
  }

  // -- Derived lists --
  const todayTasks = tasks.filter(t => isTaskForToday(t.due_date, t.recurring))
  const todayDone  = todayTasks.filter(t => completedIds.has(t.id)).length

  const filteredAll = tasks
    .filter(t =>
      (!category || t.category === category) &&
      (!search || t.title.toLowerCase().includes(search.toLowerCase()))
    )

  return (
    <div className='space-y-5 animate-fade-in'>
      <div>
        <h1 className='text-xl font-bold text-gray-100'>Tasks</h1>
        <p className='text-sm text-gray-500 mt-0.5'>Daily checklist, recurring tasks, and completion tracking</p>
      </div>

      <TasksToolbar
        search={search} onSearch={setSearch}
        category={category} onCategory={setCategory}
        view={view} onView={setView}
        totalToday={todayTasks.length} doneToday={todayDone}
        onAdd={() => setModalTask(null)}
      />

      {/* TODAY VIEW */}
      {view === 'today' && (
        <div className='space-y-2'>
          {todayTasks.length === 0 && (
            <EmptyState message='No tasks scheduled for today.' action='Add Task' onAction={() => setModalTask(null)} />
          )}
          {todayTasks.map(task => (
            <TodayTaskRow
              key={task.id}
              task={task}
              done={completedIds.has(task.id)}
              onToggle={done => handleToggle(task, done)}
              onOpen={() => setDrawerTask(task)}
            />
          ))}
        </div>
      )}

      {/* ALL TASKS VIEW */}
      {view === 'all' && (
        <div className='bg-surface-700 rounded-xl border border-surface-400 overflow-hidden shadow-card'>
          {filteredAll.length === 0 ? (
            <div className='p-8 text-center'>
              <p className='text-sm text-gray-500'>No tasks found.</p>
            </div>
          ) : (
            <table className='w-full text-sm'>
              <thead>
                <tr className='border-b border-surface-400'>
                  <th className='text-left px-4 py-3 text-xs font-medium text-gray-500'>Task</th>
                  <th className='text-left px-4 py-3 text-xs font-medium text-gray-500'>Category</th>
                  <th className='text-left px-4 py-3 text-xs font-medium text-gray-500'>Priority</th>
                  <th className='text-left px-4 py-3 text-xs font-medium text-gray-500'>Due</th>
                  <th className='text-left px-4 py-3 text-xs font-medium text-gray-500'>Time</th>
                  <th className='text-left px-4 py-3 text-xs font-medium text-gray-500'>Status</th>
                  <th className='px-4 py-3' />
                </tr>
              </thead>
              <tbody className='divide-y divide-surface-500'>
                {filteredAll.map(task => {
                  const done = completedIds.has(task.id)
                  const catStyle = CATEGORY_STYLES[task.category ?? 'Other'] ?? CATEGORY_STYLES['Other']
                  const priStyle = PRIORITY_STYLES[task.priority]
                  const priDot   = PRIORITY_DOT[task.priority]
                  return (
                    <tr
                      key={task.id}
                      onClick={() => setDrawerTask(task)}
                      className='hover:bg-surface-600/50 cursor-pointer transition-colors'
                    >
                      <td className='px-4 py-3'>
                        <div className='flex items-center gap-2'>
                          {task.recurring === 1 && <RefreshCw size={11} className='text-blue-400 flex-shrink-0' />}
                          <span className={['text-gray-200', done ? 'line-through text-gray-500' : ''].join(' ')}>
                            {task.title}
                          </span>
                        </div>
                      </td>
                      <td className='px-4 py-3'>
                        <span className={['text-2xs px-2 py-0.5 rounded-full border', catStyle].join(' ')}>
                          {task.category ?? 'Other'}
                        </span>
                      </td>
                      <td className='px-4 py-3'>
                        <span className={['text-2xs px-2 py-0.5 rounded-full border flex items-center gap-1 w-fit', priStyle].join(' ')}>
                          <span className={['w-1.5 h-1.5 rounded-full', priDot].join(' ')} />
                          {task.priority}
                        </span>
                      </td>
                      <td className='px-4 py-3 text-gray-400 text-xs font-mono'>
                        {task.due_date === 'Daily' ? 'Daily' : (task.due_date ?? '—')}
                      </td>
                      <td className='px-4 py-3 text-gray-400 text-xs'>{task.time_of_day ?? '—'}</td>
                      <td className='px-4 py-3'>
                        <span className={[
                          'text-2xs px-2 py-0.5 rounded-full border',
                          done
                            ? 'bg-green-500/20 text-green-300 border-green-500/40'
                            : 'bg-gray-500/20 text-gray-400 border-gray-500/30',
                        ].join(' ')}>
                          {done ? 'Done' : 'Pending'}
                        </span>
                      </td>
                      <td className='px-4 py-3 text-gray-600 hover:text-gray-400'>
                        <ChevronRight size={14} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* HISTORY VIEW */}
      {view === 'history' && (
        <div className='space-y-2'>
          <p className='text-xs text-gray-500'>Last 30 days of task completions</p>
          {history.length === 0 && (
            <p className='text-sm text-gray-600 italic'>Loading history...</p>
          )}
          {history.map(day => (
            <div key={day.date} className='bg-surface-700 rounded-lg border border-surface-400 px-4 py-3 flex items-center gap-4'>
              <span className='text-xs font-mono text-gray-400 w-24 flex-shrink-0'>{day.date}</span>
              <div className='flex-1 flex flex-wrap gap-1'>
                {day.ids.length === 0 ? (
                  <span className='text-2xs text-gray-600 italic'>No completions</span>
                ) : (
                  day.ids.map(id => {
                    const t = tasks.find(tk => tk.id === id)
                    return (
                      <span key={id} className='text-2xs px-2 py-0.5 bg-green-500/10 border border-green-500/30 text-green-300 rounded-full'>
                        {t ? t.title : 'Task #' + id}
                      </span>
                    )
                  })
                )}
              </div>
              <span className={['text-xs font-medium', day.ids.length > 0 ? 'text-green-400' : 'text-gray-600'].join(' ')}>
                {day.ids.length}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modalTask !== undefined && (
        <TaskModal
          task={modalTask}
          onSave={handleSave}
          onClose={() => setModalTask(undefined)}
        />
      )}

      {/* Drawer */}
      <TaskDrawer
        task={drawerTask}
        onClose={() => setDrawerTask(null)}
        onEdit={task => { setDrawerTask(null); setModalTask(task) }}
        onDelete={handleDelete}
        onToggleComplete={(task, done) => { handleToggle(task, done) }}
        doneToday={drawerTask ? completedIds.has(drawerTask.id) : false}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function TodayTaskRow({
  task, done, onToggle, onOpen,
}: {
  task: Task
  done: boolean
  onToggle: (done: boolean) => void
  onOpen: () => void
}) {
  const catStyle = CATEGORY_STYLES[task.category ?? 'Other'] ?? CATEGORY_STYLES['Other']
  const priDot   = PRIORITY_DOT[task.priority]

  return (
    <div
      className={[
        'flex items-center gap-3 px-4 py-3.5 rounded-xl border transition-all group',
        done
          ? 'bg-surface-700/60 border-surface-400/60'
          : 'bg-surface-700 border-surface-400 hover:border-surface-300',
      ].join(' ')}
    >
      {/* Checkbox */}
      <button
        onClick={() => onToggle(!done)}
        className='flex-shrink-0 text-gray-400 hover:text-orange-400 transition-colors'
      >
        {done
          ? <CheckSquare size={20} className='text-green-500' />
          : <Square size={20} className='text-gray-500 group-hover:text-orange-400' />}
      </button>

      {/* Priority dot */}
      <span className={['w-2 h-2 rounded-full flex-shrink-0', priDot].join(' ')} />

      {/* Title + meta */}
      <div className='flex-1 min-w-0 cursor-pointer' onClick={onOpen}>
        <p className={[
          'text-sm font-medium leading-snug',
          done ? 'line-through text-gray-500' : 'text-gray-100',
        ].join(' ')}>{task.title}</p>
        <div className='flex items-center gap-2 mt-0.5'>
          {task.time_of_day && (
            <span className='text-2xs text-gray-500 flex items-center gap-0.5'>
              <Clock size={10} /> {task.time_of_day}
            </span>
          )}
          {task.recurring === 1 && (
            <span className='text-2xs text-blue-400 flex items-center gap-0.5'>
              <RefreshCw size={10} /> Recurring
            </span>
          )}
        </div>
      </div>

      {/* Category badge */}
      <span className={['text-2xs px-2 py-0.5 rounded-full border flex-shrink-0', catStyle].join(' ')}>
        {task.category ?? 'Other'}
      </span>
    </div>
  )
}

function EmptyState({ message, action, onAction }: { message: string; action: string; onAction: () => void }) {
  return (
    <div className='text-center py-16 bg-surface-700 rounded-xl border border-surface-400'>
      <p className='text-gray-500 text-sm mb-3'>{message}</p>
      <button
        onClick={onAction}
        className='text-sm text-orange-400 hover:text-orange-300 underline underline-offset-2'
      >
        {action}
      </button>
    </div>
  )
}
