import { useState, useEffect, useCallback } from 'react'
import { CheckSquare, Square, Clock, RefreshCw, ChevronRight, ListChecks } from 'lucide-react'
import type { Task, TaskCompletion, CreateTaskDto } from '../types/models'
import { TasksToolbar } from '../components/tasks/TasksToolbar'
import { TaskModal } from '../components/tasks/TaskModal'
import { TaskDrawer } from '../components/tasks/TaskDrawer'
import {
  CATEGORY_STYLES, PRIORITY_DOT, PRIORITY_STYLES,
  todayDate, isTaskForToday,
} from '../components/tasks/constants'

// Daily routine tasks for a new dispatcher — seeded on first use
const DAILY_ROUTINE: Omit<CreateTaskDto, 'status'>[] = [
  {
    title:       'Post in Facebook trucking groups',
    category:    'Marketing',
    priority:    'High',
    due_date:    'Daily',
    time_of_day: '7:00 AM',
    recurring:   1,
    assigned_to: null,
    notes:       'Open Marketing tab, copy today\'s suggested post, paste into 2-3 Facebook owner-operator groups. Use a Quick Post template if you want something shorter.',
  },
  {
    title:       'Check for replies to yesterday\'s posts and add new leads',
    category:    'Leads',
    priority:    'High',
    due_date:    'Daily',
    time_of_day: '7:30 AM',
    recurring:   1,
    assigned_to: null,
    notes:       'Open Facebook notifications. Anyone who commented or DM\'d about your posts should be added to the Leads tab with their equipment type and home state.',
  },
  {
    title:       'Follow up with warm leads',
    category:    'Leads',
    priority:    'High',
    due_date:    'Daily',
    time_of_day: '9:00 AM',
    recurring:   1,
    assigned_to: null,
    notes:       'Open Leads tab. Filter to Contacted and Warm status. Send a follow-up message to anyone you haven\'t heard from in 2+ days. Move dead leads to Inactive.',
  },
  {
    title:       'Check active load pickups and deliveries',
    category:    'Dispatch',
    priority:    'High',
    due_date:    'Daily',
    time_of_day: '9:30 AM',
    recurring:   1,
    assigned_to: null,
    notes:       'Open Loads tab or Dispatcher Board. Confirm pickups happening today have checked in. Check that in-transit loads are on track for delivery.',
  },
  {
    title:       'Make broker calls for open load opportunities',
    category:    'Dispatch',
    priority:    'High',
    due_date:    'Daily',
    time_of_day: '10:00 AM',
    recurring:   1,
    assigned_to: null,
    notes:       'Call 3-5 brokers about available loads for your drivers. Use the call scripts in Help > Call Scripts. Log rates in the load notes.',
  },
  {
    title:       'Review overdue and unpaid invoices',
    category:    'Admin',
    priority:    'Medium',
    due_date:    'Daily',
    time_of_day: '11:00 AM',
    recurring:   1,
    assigned_to: null,
    notes:       'Open Invoices tab. Any invoice marked Overdue gets a follow-up call today using the late invoice script in Help > Call Scripts.',
  },
  {
    title:       'Update driver locations and availability',
    category:    'Dispatch',
    priority:    'Medium',
    due_date:    'Daily',
    time_of_day: '2:00 PM',
    recurring:   1,
    assigned_to: null,
    notes:       'Open Drivers tab. Check in with any driver who delivered today or is between loads. Update their current location in their profile.',
  },
  {
    title:       'Review tomorrow\'s load schedule',
    category:    'Dispatch',
    priority:    'Medium',
    due_date:    'Daily',
    time_of_day: '4:00 PM',
    recurring:   1,
    assigned_to: null,
    notes:       'Check Loads tab for anything picking up tomorrow. Confirm driver is confirmed, rate con is signed, and broker contact info is logged.',
  },
  {
    title:       'Log all calls and conversations as notes',
    category:    'Admin',
    priority:    'Medium',
    due_date:    'Daily',
    time_of_day: '5:00 PM',
    recurring:   1,
    assigned_to: null,
    notes:       'Add notes in OnTrack to any lead, broker, or load record you touched today. Notes are how you build institutional memory so nothing gets lost between sessions.',
  },
]

export function Tasks() {
  const [tasks, setTasks]             = useState<Task[]>([])
  const [completedIds, setCompletedIds] = useState<Set<number>>(new Set())
  const [view, setView]               = useState<'today' | 'week' | 'all' | 'history'>('today')
  const [search, setSearch]           = useState('')
  const [category, setCategory]       = useState('')
  const [modalTask, setModalTask]     = useState<Task | null | undefined>(undefined)
  const [drawerTask, setDrawerTask]   = useState<Task | null>(null)
  const [history, setHistory]         = useState<{ date: string; ids: number[] }[]>([])
  const [seeding, setSeeding]         = useState(false)
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

  async function seedDailyRoutine() {
    setSeeding(true)
    for (const t of DAILY_ROUTINE) {
      await window.api.tasks.create({ ...t, status: 'Pending' })
    }
    await load()
    setSeeding(false)
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

  // -- Week view helpers --
  const WEEK_DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'] as const
  const DOW_NAMES = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
  const todayDayName = DOW_NAMES[new Date().getDay()]

  function timeToMinutes(t: string | null): number {
    if (!t) return 9999
    const m = t.match(/(\d+):(\d+)\s*(AM|PM)/i)
    if (!m) return 9999
    let h = parseInt(m[1])
    const min = parseInt(m[2])
    if (m[3].toUpperCase() === 'PM' && h !== 12) h += 12
    if (m[3].toUpperCase() === 'AM' && h === 12) h = 0
    return h * 60 + min
  }

  const dailyTasks = tasks.filter(t => t.due_date === 'Daily')

  function tasksForDay(day: string): Task[] {
    return [
      ...dailyTasks,
      ...tasks.filter(t => t.due_date === day),
    ].sort((a, b) => timeToMinutes(a.time_of_day) - timeToMinutes(b.time_of_day))
  }

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

      {/* Daily routine seed banner — shown when no recurring tasks exist yet */}
      {tasks.filter(t => t.recurring === 1).length === 0 && (
        <div className='flex items-center gap-4 px-4 py-3.5 rounded-xl border border-blue-700/40 bg-blue-900/10'>
          <ListChecks size={18} className='text-blue-400 shrink-0' />
          <div className='flex-1 min-w-0'>
            <p className='text-sm font-medium text-gray-200'>No daily routine set up yet</p>
            <p className='text-xs text-gray-500 mt-0.5'>Load a pre-built dispatcher routine: 9 recurring tasks with times covering marketing, lead follow-up, dispatch, and admin.</p>
          </div>
          <button
            onClick={seedDailyRoutine}
            disabled={seeding}
            className='shrink-0 flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium bg-blue-700 hover:bg-blue-600 disabled:opacity-60 text-white rounded-lg transition-colors'
          >
            <ListChecks size={12} />
            {seeding ? 'Adding...' : 'Load daily routine'}
          </button>
        </div>
      )}

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
      {/* WEEK VIEW */}
      {view === 'week' && (
        <div className='space-y-4'>
          {WEEK_DAYS.map(day => {
            const dayTasks = tasksForDay(day)
            const isToday  = day === todayDayName
            return (
              <div
                key={day}
                className={[
                  'bg-surface-700 rounded-xl border overflow-hidden shadow-card',
                  isToday ? 'border-orange-500/60' : 'border-surface-400',
                ].join(' ')}
              >
                {/* Day header */}
                <div className={[
                  'flex items-center justify-between px-4 py-3 border-b',
                  isToday ? 'bg-orange-600/15 border-orange-500/30' : 'bg-surface-600 border-surface-400',
                ].join(' ')}>
                  <div className='flex items-center gap-2'>
                    <span className={['text-sm font-semibold', isToday ? 'text-orange-300' : 'text-gray-200'].join(' ')}>
                      {day}
                    </span>
                    {isToday && (
                      <span className='text-2xs px-2 py-0.5 rounded-full bg-orange-600/40 border border-orange-500/40 text-orange-300'>
                        Today
                      </span>
                    )}
                  </div>
                  <span className='text-xs text-gray-500'>
                    {dayTasks.length} task{dayTasks.length !== 1 ? 's' : ''}
                  </span>
                </div>

                {/* Task rows */}
                <div className='divide-y divide-surface-500/60'>
                  {dayTasks.map(task => {
                    const catStyle = CATEGORY_STYLES[task.category ?? 'Other'] ?? CATEGORY_STYLES['Other']
                    const priDot   = PRIORITY_DOT[task.priority]
                    const isNew    = task.due_date !== 'Daily'
                    return (
                      <div
                        key={task.id}
                        onClick={() => setDrawerTask(task)}
                        className='flex items-center gap-3 px-4 py-2.5 hover:bg-surface-600/50 cursor-pointer transition-colors'
                      >
                        {/* Time */}
                        <span className='text-xs text-gray-500 w-16 flex-shrink-0 font-mono tabular-nums'>
                          {task.time_of_day ?? '—'}
                        </span>
                        {/* Priority dot */}
                        <span className={['w-1.5 h-1.5 rounded-full flex-shrink-0', priDot].join(' ')} />
                        {/* Title */}
                        <span className={['flex-1 text-sm', isNew ? 'text-orange-200' : 'text-gray-200'].join(' ')}>
                          {task.title}
                        </span>
                        {/* Category badge */}
                        <span className={['text-2xs px-2 py-0.5 rounded-full border flex-shrink-0', catStyle].join(' ')}>
                          {task.category}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
          <p className='text-2xs text-gray-600 text-center pb-2'>
            Day-specific tasks are shown in lighter text. All other tasks repeat daily.
          </p>
        </div>
      )}

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
