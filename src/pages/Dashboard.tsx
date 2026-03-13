import { useEffect, useState } from 'react'
import { Truck, Package, Users, FileText, CheckSquare, Clock } from 'lucide-react'

interface Stats {
  driversNeedingLoads: { c: number }
  loadsInTransit:      { c: number }
  leadsFollowUp:       { c: number }
  outstandingInvoices: { c: number }
  todayTasks:          Task[]
}

interface Task { id: number; title: string; status: string; time_of_day: string | null; priority: string }

const EMPTY_STATS: Stats = {
  driversNeedingLoads: { c: 0 },
  loadsInTransit:      { c: 0 },
  leadsFollowUp:       { c: 0 },
  outstandingInvoices: { c: 0 },
  todayTasks: [],
}

export function Dashboard() {
  const [stats, setStats] = useState<Stats>(EMPTY_STATS)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    window.api.dashboard.stats().then((s) => {
      setStats(s as Stats)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  return (
    <div className='space-y-6 max-w-6xl animate-fade-in'>

      {/* Header */}
      <div>
        <p className='text-xs text-gray-500 font-medium uppercase tracking-wider mb-1'>Today</p>
        <h1 className='text-2xl font-bold text-gray-100'>{today}</h1>
      </div>

      {/* KPI Cards */}
      <div className='grid grid-cols-2 lg:grid-cols-4 gap-4'>
        <KpiCard
          label='Drivers Needing Loads'
          value={loading ? '—' : String(stats.driversNeedingLoads.c)}
          icon={<Truck size={18} />}
          accent={stats.driversNeedingLoads.c > 0}
        />
        <KpiCard
          label='Loads In Transit'
          value={loading ? '—' : String(stats.loadsInTransit.c)}
          icon={<Package size={18} />}
        />
        <KpiCard
          label='Leads Awaiting Follow-Up'
          value={loading ? '—' : String(stats.leadsFollowUp.c)}
          icon={<Users size={18} />}
          accent={stats.leadsFollowUp.c > 0}
        />
        <KpiCard
          label='Outstanding Invoices'
          value={loading ? '—' : String(stats.outstandingInvoices.c)}
          icon={<FileText size={18} />}
          accent={stats.outstandingInvoices.c > 0}
        />
      </div>

      {/* Body grid */}
      <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>

        {/* Today's Tasks — 2 cols */}
        <div className='lg:col-span-2 bg-surface-700 rounded-xl border border-surface-400 p-5 shadow-card'>
          <div className='flex items-center gap-2 mb-4'>
            <CheckSquare size={16} className='text-orange-500' />
            <h2 className='text-sm font-semibold text-gray-200'>Today\'s Tasks</h2>
          </div>
          {loading ? (
            <p className='text-sm text-gray-600'>Loading...</p>
          ) : stats.todayTasks.length === 0 ? (
            <p className='text-sm text-gray-600'>No tasks found. Seed tasks will appear after first DB init.</p>
          ) : (
            <ul className='space-y-2'>
              {stats.todayTasks.map((task) => (
                <TaskRow key={task.id} task={task} />
              ))}
            </ul>
          )}
        </div>

        {/* Dispatch Board mini — 1 col */}
        <div className='bg-surface-700 rounded-xl border border-surface-400 p-5 shadow-card'>
          <div className='flex items-center gap-2 mb-4'>
            <Truck size={16} className='text-orange-500' />
            <h2 className='text-sm font-semibold text-gray-200'>Dispatch Board</h2>
          </div>
          <div className='space-y-2'>
            <div className='flex items-center justify-between text-xs text-gray-500 pb-2 border-b border-surface-400'>
              <span>Driver</span><span>Status</span>
            </div>
            <p className='text-xs text-gray-600 pt-2 text-center'>No active drivers yet.</p>
            <p className='text-2xs text-gray-700 text-center'>Add drivers to see the dispatch board.</p>
          </div>
        </div>
      </div>
    </div>
  )
}

function KpiCard({ label, value, icon, accent = false }: { label: string; value: string; icon: React.ReactNode; accent?: boolean }) {
  return (
    <div className={[
      'bg-surface-700 rounded-xl border p-4 shadow-card hover:shadow-card-hover transition-shadow',
      accent ? 'border-orange-600/40' : 'border-surface-400',
    ].join(' ')}>
      <div className={['mb-2', accent ? 'text-orange-500' : 'text-gray-500'].join(' ')}>
        {icon}
      </div>
      <p className='text-2xl font-bold text-gray-100'>{value}</p>
      <p className='text-xs text-gray-500 mt-1 leading-tight'>{label}</p>
    </div>
  )
}

function TaskRow({ task }: { task: Task }) {
  const [done, setDone] = useState(task.status === 'Done')
  return (
    <li className='flex items-center gap-3 group'>
      <button
        onClick={() => setDone(!done)}
        className={[
          'w-4 h-4 rounded border shrink-0 flex items-center justify-center transition-colors',
          done ? 'bg-orange-600 border-orange-600' : 'border-surface-300 hover:border-orange-500',
        ].join(' ')}
      >
        {done && <span className='text-white text-2xs'>✓</span>}
      </button>
      <span className={['text-sm flex-1', done ? 'line-through text-gray-600' : 'text-gray-300'].join(' ')}>
        {task.title}
      </span>
      {task.time_of_day && (
        <div className='flex items-center gap-1 text-2xs text-gray-500'>
          <Clock size={10} />
          {task.time_of_day}
        </div>
      )}
      <span className={[
        'text-2xs px-1.5 py-0.5 rounded-full',
        task.priority === 'High'   ? 'bg-red-900/30 text-red-400' :
        task.priority === 'Medium' ? 'bg-yellow-900/30 text-yellow-500' :
                                     'bg-surface-600 text-gray-500',
      ].join(' ')}>
        {task.priority}
      </span>
    </li>
  )
}
