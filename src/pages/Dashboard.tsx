import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Truck, Package, Users, FileText, CheckSquare, Clock, Star, Phone, ChevronDown, ChevronRight, X } from 'lucide-react'
import type { Driver, Load, Lead } from '../types/models'
import { computeLeadScore } from '../lib/leadScore'
import { openSaferMc, openSaferDot } from '../lib/saferUrl'
import { DRIVER_STATUS_STYLES } from '../components/drivers/constants'
import { LOAD_STATUS_STYLES } from '../components/loads/constants'
import { renderMd } from '../lib/renderMd'

interface Stats {
  driversNeedingLoads: { c: number }
  loadsInTransit:      { c: number }
  leadsFollowUp:       { c: number }
  outstandingInvoices: { c: number }
  todayTasks:          Task[]
  completedToday:      number[]
}
interface Task { id: number; title: string; status: string; time_of_day: string | null; priority: string; notes: string | null }

// Lead enriched with pre-computed score fields for the Top Leads panel
interface ScoredLead extends Lead {
  _score:    number
  _grade:    'Hot' | 'Warm' | 'Cold'
  _overdue:  boolean
  _dueToday: boolean
}

const EMPTY_STATS: Stats = {
  driversNeedingLoads: { c: 0 }, loadsInTransit: { c: 0 },
  leadsFollowUp: { c: 0 }, outstandingInvoices: { c: 0 }, todayTasks: [], completedToday: [],
}

export function Dashboard() {
  const [stats,        setStats]        = useState<Stats>(EMPTY_STATS)
  const [drivers,      setDrivers]      = useState<Driver[]>([])
  const [loads,        setLoads]        = useState<Load[]>([])
  const [leads,        setLeads]        = useState<Lead[]>([])
  const [loading,      setLoading]      = useState(true)
  const [leadsLoading, setLeadsLoading] = useState(true)
  const [docModal,     setDocModal]     = useState<string | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    window.api.dashboard.stats()
      .then(s => { setStats(s as Stats); setLoading(false) })
      .catch(() => setLoading(false))
    Promise.all([window.api.drivers.list(), window.api.loads.list()])
      .then(([d, l]) => { setDrivers(d); setLoads(l) })
    window.api.leads.list()
      .then(l => { setLeads(l); setLeadsLoading(false) })
      .catch(() => setLeadsLoading(false))
  }, [])

  const today    = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
  const todayIso = new Date().toISOString().split('T')[0]

  // ── Top 10 leads ranked by score + follow-up urgency ──────────────────────
  const topLeads: ScoredLead[] = leads
    .filter(l => l.status !== 'Signed' && l.status !== 'Rejected')
    .map(l => {
      const { total, grade } = computeLeadScore(l)
      const overdue  = Boolean(l.follow_up_date && l.follow_up_date < todayIso)
      const dueToday = Boolean(l.follow_up_date && l.follow_up_date === todayIso)
      return { ...l, _score: total, _grade: grade, _overdue: overdue, _dueToday: dueToday }
    })
    .sort((a, b) => {
      // Boost overdue +20, due today +12, then sort by raw score
      const boostA = a._overdue ? 20 : a._dueToday ? 12 : 0
      const boostB = b._overdue ? 20 : b._dueToday ? 12 : 0
      return (b._score + boostB) - (a._score + boostA)
    })
    .slice(0, 10)

  // ── Dispatch board helpers ─────────────────────────────────────────────────
  const activeLoads = loads.filter(l => ['Booked', 'Picked Up', 'In Transit'].includes(l.status))
  const loadByDriver: Record<number, Load> = {}
  activeLoads.forEach(l => { if (l.driver_id != null) loadByDriver[l.driver_id] = l })

  const boardDrivers = [...drivers].sort((a, b) => {
    const hasLoadA = a.id in loadByDriver ? 1 : 0
    const hasLoadB = b.id in loadByDriver ? 1 : 0
    if (a.status === 'Active' && b.status !== 'Active') return -1
    if (b.status === 'Active' && a.status !== 'Active') return 1
    return hasLoadA - hasLoadB
  }).slice(0, 6)

  return (
    <div className='space-y-6 max-w-6xl animate-fade-in'>
      <div>
        <p className='text-xs text-gray-500 font-medium uppercase tracking-wider mb-1'>Today</p>
        <h1 className='text-2xl font-bold text-gray-100'>{today}</h1>
      </div>

      {/* KPI Cards */}
      <div className='grid grid-cols-2 lg:grid-cols-4 gap-4'>
        <KpiCard label='Drivers Needing Loads'    value={loading?'—':String(stats.driversNeedingLoads.c)} icon={<Truck size={18}/>}    accent={stats.driversNeedingLoads.c>0}  onClick={() => navigate('/drivers')}/>
        <KpiCard label='Loads In Transit'          value={loading?'—':String(stats.loadsInTransit.c)}      icon={<Package size={18}/>}                                              onClick={() => navigate('/loads')}/>
        <KpiCard label='Leads Awaiting Follow-Up'  value={loading?'—':String(stats.leadsFollowUp.c)}       icon={<Users size={18}/>}    accent={stats.leadsFollowUp.c>0}         onClick={() => navigate('/leads')}/>
        <KpiCard label='Outstanding Invoices'      value={loading?'—':String(stats.outstandingInvoices.c)} icon={<FileText size={18}/>} accent={stats.outstandingInvoices.c>0}   onClick={() => navigate('/invoices')}/>
      </div>

      {/* Body grid — Tasks + Dispatch Board */}
      <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
        {/* Today's Tasks */}
        <div className='lg:col-span-2 bg-surface-700 rounded-xl border border-surface-400 p-5 shadow-card'>
          <div className='flex items-center gap-2 mb-4'>
            <CheckSquare size={16} className='text-orange-500'/>
            <h2 className='text-sm font-semibold text-gray-200'>Today's Tasks</h2>
          </div>
          {loading ? (
            <p className='text-sm text-gray-400'>Loading...</p>
          ) : stats.todayTasks.length === 0 ? (
            <p className='text-sm text-gray-400'>No tasks found.</p>
          ) : (
            <ul className='space-y-1'>
              {stats.todayTasks.map(task => (
                <TaskRow
                  key={task.id}
                  task={task}
                  initialDone={stats.completedToday.includes(task.id) || task.status === 'Done'}
                  todayIso={todayIso}
                  onDocLink={setDocModal}
                />
              ))}
            </ul>
          )}
        </div>

        {/* Mini Dispatch Board */}
        <div className='bg-surface-700 rounded-xl border border-surface-400 p-5 shadow-card'>
          <div className='flex items-center gap-2 mb-4'>
            <Truck size={16} className='text-orange-500'/>
            <h2 className='text-sm font-semibold text-gray-200'>Dispatch Board</h2>
          </div>
          {drivers.length === 0 ? (
            <p className='text-xs text-gray-600 text-center py-4'>No drivers yet.</p>
          ) : (
            <div className='space-y-2'>
              {boardDrivers.map(d => {
                const cl = loadByDriver[d.id]
                const needsLoad = d.status === 'Active' && !cl
                return (
                  <div key={d.id} className={`rounded-lg px-3 py-2 border ${needsLoad?'border-orange-700/40 bg-orange-950/20':'border-surface-500 bg-surface-600'}`}>
                    <div className='flex items-center justify-between'>
                      <p className='text-xs font-medium text-gray-200 truncate flex-1'>{d.name}</p>
                      <span className={`text-2xs px-1.5 py-0.5 rounded-full border ml-2 shrink-0 ${DRIVER_STATUS_STYLES[d.status]}`}>{d.status}</span>
                    </div>
                    {cl ? (
                      <p className='text-2xs text-gray-500 mt-0.5 flex items-center gap-1'>
                        <span className={`text-2xs px-1 py-0 rounded ${LOAD_STATUS_STYLES[cl.status]}`}>{cl.status}</span>
                        {[cl.origin_state, cl.dest_state].filter(Boolean).join(' → ')}
                      </p>
                    ) : needsLoad ? (
                      <p className='text-2xs text-orange-500 mt-0.5'>● Needs Load</p>
                    ) : (
                      <p className='text-2xs text-gray-700 mt-0.5 italic'>Inactive</p>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Document modal — opened by [[doc]] links in task notes */}
      {docModal && <DocModal title={docModal} onClose={() => setDocModal(null)} />}

      {/* Top 10 Leads Today */}
      <div className='bg-surface-700 rounded-xl border border-surface-400 p-5 shadow-card'>
        <div className='flex items-center justify-between mb-4'>
          <div className='flex items-center gap-2'>
            <Star size={16} className='text-orange-500' />
            <h2 className='text-sm font-semibold text-gray-200'>Top Leads Today</h2>
            <span className='text-2xs text-gray-600'>· scored by data completeness + follow-up urgency</span>
          </div>
          <button
            onClick={() => navigate('/leads')}
            className='text-2xs text-orange-500 hover:text-orange-400 transition-colors'
          >
            View all →
          </button>
        </div>

        {leadsLoading ? (
          <p className='text-sm text-gray-400'>Loading leads...</p>
        ) : topLeads.length === 0 ? (
          <p className='text-sm text-gray-400'>No active leads. Run an FMCSA import to populate your pipeline.</p>
        ) : (
          <div className='divide-y divide-surface-600'>
            {topLeads.map((lead, i) => (
              <TopLeadRow key={lead.id} rank={i + 1} lead={lead} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function KpiCard({ label, value, icon, accent = false, onClick }: { label: string; value: string; icon: React.ReactNode; accent?: boolean; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className={['w-full text-left bg-surface-700 rounded-xl border p-4 shadow-card hover:shadow-card-hover hover:bg-surface-600 transition-all', accent ? 'border-orange-600/40' : 'border-surface-400'].join(' ')}
    >
      <div className={['mb-2', accent ? 'text-orange-500' : 'text-gray-500'].join(' ')}>{icon}</div>
      <p className='text-2xl font-bold text-gray-100'>{value}</p>
      <p className='text-xs text-gray-500 mt-1 leading-tight'>{label}</p>
    </button>
  )
}

// Parse task notes into subtask step lines and doc-link tokens.
// Returns an array of { text: string; docLinks: string[] } per step line.
// If no numbered steps exist, returns a single item with the full notes as prose.
function parseSubtasks(notes: string): Array<{ text: string; docLinks: string[] }> {
  const lines = notes.split('\n').map(l => l.trim()).filter(Boolean)
  const steps = lines.filter(l => /^\d+\./.test(l) || l.startsWith('- ') || l.startsWith('* '))
  const source = steps.length > 0 ? steps : lines
  return source.map(line => {
    const clean = line.replace(/^\d+\.\s*/, '').replace(/^[-*]\s*/, '')
    const docLinks: string[] = []
    const docRe = /\[\[(.+?)\]\]/g
    let m: RegExpExecArray | null
    while ((m = docRe.exec(clean)) !== null) docLinks.push(m[1])
    return { text: clean, docLinks }
  })
}

function TaskRow({
  task, initialDone, todayIso, onDocLink,
}: {
  task: Task
  initialDone: boolean
  todayIso: string
  onDocLink: (title: string) => void
}) {
  const [done,     setDone]     = useState(initialDone)
  const [expanded, setExpanded] = useState(false)
  const [checked,  setChecked]  = useState<Record<number, boolean>>({})

  const hasNotes = Boolean(task.notes?.trim())
  const subtasks = hasNotes ? parseSubtasks(task.notes!) : []
  const hasSteps = subtasks.length > 1 || (subtasks.length === 1 && subtasks[0].docLinks.length > 0)

  async function toggleDone() {
    const next = !done
    setDone(next)
    try {
      if (next) {
        await window.api.tasks.markComplete(task.id, todayIso)
      } else {
        await window.api.tasks.markIncomplete(task.id, todayIso)
      }
    } catch {
      // revert on failure
      setDone(!next)
    }
  }

  return (
    <li className='rounded-lg border border-transparent hover:border-surface-500 transition-colors'>
      {/* Main row */}
      <div className='flex items-center gap-2 px-1 py-1.5'>
        <button
          onClick={toggleDone}
          className={['w-4 h-4 rounded border shrink-0 flex items-center justify-center transition-colors',
            done ? 'bg-orange-600 border-orange-600' : 'border-surface-300 hover:border-orange-500'].join(' ')}>
          {done && <span className='text-white text-2xs'>✓</span>}
        </button>
        <span className={['text-sm flex-1', done ? 'line-through text-gray-600' : 'text-gray-300'].join(' ')}>
          {task.title}
        </span>
        {task.time_of_day && (
          <div className='flex items-center gap-1 text-2xs text-gray-500 shrink-0'>
            <Clock size={10} />{task.time_of_day}
          </div>
        )}
        <span className={['text-2xs px-1.5 py-0.5 rounded-full shrink-0',
          task.priority === 'High'   ? 'bg-red-900/30 text-red-400' :
          task.priority === 'Medium' ? 'bg-yellow-900/30 text-yellow-500' :
                                       'bg-surface-600 text-gray-500'].join(' ')}>
          {task.priority}
        </span>
        {hasNotes && (
          <button
            onClick={() => setExpanded(v => !v)}
            className='text-gray-600 hover:text-gray-400 transition-colors shrink-0'>
            {expanded ? <ChevronDown size={13}/> : <ChevronRight size={13}/>}
          </button>
        )}
      </div>

      {/* Expanded subtasks */}
      {expanded && hasNotes && (
        <div className='ml-6 pb-2 space-y-1'>
          {hasSteps ? (
            subtasks.map((step, i) => (
              <div key={i} className='flex items-start gap-2'>
                <button
                  onClick={() => setChecked(c => ({ ...c, [i]: !c[i] }))}
                  className={['mt-0.5 w-3.5 h-3.5 rounded border shrink-0 flex items-center justify-center transition-colors',
                    checked[i] ? 'bg-green-700 border-green-700' : 'border-surface-400 hover:border-green-600'].join(' ')}>
                  {checked[i] && <span className='text-white' style={{fontSize:'8px'}}>✓</span>}
                </button>
                <span className={['text-xs flex-1 leading-snug', checked[i] ? 'line-through text-gray-600' : 'text-gray-400'].join(' ')}>
                  {/* Render text with doc links highlighted */}
                  {step.text.split(/\[\[(.+?)\]\]/).map((part, pi) =>
                    pi % 2 === 0
                      ? <span key={pi}>{part}</span>
                      : <button key={pi} onClick={() => onDocLink(part)}
                          className='text-orange-400 hover:text-orange-300 underline cursor-pointer font-medium'>
                          {part}
                        </button>
                  )}
                </span>
              </div>
            ))
          ) : (
            /* Plain notes — show as a single collapsed paragraph with doc links */
            <p className='text-xs text-gray-500 leading-relaxed pr-2'>
              {task.notes!.split(/\[\[(.+?)\]\]/).map((part, pi) =>
                pi % 2 === 0
                  ? <span key={pi}>{part}</span>
                  : <button key={pi} onClick={() => onDocLink(part)}
                      className='text-orange-400 hover:text-orange-300 underline cursor-pointer font-medium'>
                      {part}
                    </button>
              )}
            </p>
          )}
        </div>
      )}
    </li>
  )
}

// ── Document Modal ────────────────────────────────────────────────────────────

function DocModal({ title, onClose }: { title: string; onClose: () => void }) {
  const [stack,   setStack]   = useState<{ title: string; content: string | null }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    window.api.documents.list().then((docs: Array<{ title: string; content: string | null }>) => {
      const found = docs.find(d => d.title.toLowerCase() === title.toLowerCase())
      setStack(found ? [found] : [{ title, content: null }])
      setLoading(false)
    }).catch(() => { setStack([{ title, content: null }]); setLoading(false) })
  }, [title])

  const current = stack[stack.length - 1]

  async function followLink(linkTitle: string) {
    try {
      const docs: Array<{ title: string; content: string | null }> = await window.api.documents.list()
      const found = docs.find(d => d.title.toLowerCase() === linkTitle.toLowerCase())
      setStack(s => [...s, found ?? { title: linkTitle, content: null }])
    } catch {}
  }

  if (!current) return null

  return (
    <div
      className='fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-6'
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className='bg-surface-700 border border-surface-400 rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col'>
        <div className='flex items-center gap-3 px-5 py-3 border-b border-surface-400 shrink-0'>
          {stack.length > 1 && (
            <button
              onClick={() => setStack(s => s.slice(0, -1))}
              className='text-gray-500 hover:text-gray-300 text-xs px-2 py-0.5 border border-surface-400 rounded transition-colors'>
              Back
            </button>
          )}
          <h3 className='text-sm font-semibold text-gray-100 flex-1 truncate'>{current.title}</h3>
          <button onClick={onClose} className='text-gray-500 hover:text-gray-300'>
            <X size={16}/>
          </button>
        </div>
        <div className='flex-1 overflow-y-auto px-6 py-5'>
          {loading ? (
            <p className='text-sm text-gray-400'>Loading...</p>
          ) : current.content ? (
            <div
              dangerouslySetInnerHTML={{ __html: renderMd(current.content) }}
              onClick={async (e) => {
                const link = (e.target as HTMLElement).closest('[data-doc-link]') as HTMLElement | null
                const title = link?.getAttribute('data-doc-link')
                if (title) { e.preventDefault(); await followLink(title) }
              }}
            />
          ) : (
            <p className='text-sm text-gray-600 italic'>Document not found: {current.title}</p>
          )}
        </div>
      </div>
    </div>
  )
}

function TopLeadRow({ rank, lead }: { rank: number; lead: ScoredLead }) {
  const gradeCls =
    lead._grade === 'Hot'  ? 'bg-orange-900/40 text-orange-400 border-orange-700/40' :
    lead._grade === 'Warm' ? 'bg-yellow-900/30 text-yellow-500 border-yellow-700/30' :
                             'bg-surface-600 text-gray-500 border-surface-500'

  const statusCls: Record<string, string> = {
    New:        'text-blue-400',
    Contacted:  'text-yellow-500',
    Interested: 'text-green-400',
    Signed:     'text-orange-400',
    Rejected:   'text-gray-600',
  }

  const identifier = lead.mc_number ?? (lead.dot_number ? 'DOT-' + lead.dot_number : null)
  const location   = [lead.city, lead.state].filter(Boolean).join(', ')

  return (
    <div className='flex items-center gap-3 py-2.5'>
      {/* Rank */}
      <span className='text-2xs text-gray-700 w-4 text-right shrink-0'>{rank}</span>

      {/* Score badge */}
      <span className={`text-2xs font-bold px-1.5 py-0.5 rounded border min-w-[28px] text-center shrink-0 ${gradeCls}`}>
        {lead._score}
      </span>

      {/* Name + meta */}
      <div className='flex-1 min-w-0'>
        <div className='flex items-center gap-1.5 flex-wrap'>
          <p className='text-xs font-medium text-gray-200 truncate'>{lead.name}</p>
          <span className={`text-2xs shrink-0 ${statusCls[lead.status] ?? 'text-gray-500'}`}>{lead.status}</span>
          {lead._overdue  && <span className='text-2xs text-red-400 shrink-0'>● overdue</span>}
          {lead._dueToday && !lead._overdue && <span className='text-2xs text-orange-400 shrink-0'>● today</span>}
        </div>
        <div className='flex items-center gap-2 mt-0.5'>
          {identifier && (
            <button
              onClick={e => lead.mc_number ? openSaferMc(lead.mc_number, e) : openSaferDot(lead.dot_number!, e)}
              className='text-2xs font-mono text-gray-600 hover:text-orange-400 hover:underline transition-colors cursor-pointer'
              title='View on FMCSA SAFER'
            >{identifier}</button>
          )}
          {location   && <span className='text-2xs text-gray-600'>{location}</span>}
        </div>
      </div>

      {/* Phone */}
      {lead.phone
        ? <a href={`tel:${lead.phone}`}
             className='flex items-center gap-1 text-2xs text-gray-500 hover:text-orange-400 transition-colors shrink-0'>
            <Phone size={10} />{lead.phone}
          </a>
        : <span className='text-2xs text-gray-700 shrink-0'>no phone</span>
      }
    </div>
  )
}
