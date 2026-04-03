import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Truck, Package, Users, FileText, CheckSquare, Clock, Star, Phone, ChevronDown, ChevronRight, X, Target } from 'lucide-react'
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
  // Weekly revenue target
  const [weeklyTarget,   setWeeklyTarget]   = useState<number | null>(null)
  const [weeklyEarned,   setWeeklyEarned]   = useState<number>(0)
  const [editingTarget,  setEditingTarget]  = useState(false)
  const [targetInput,    setTargetInput]    = useState('')
  type ExpiryAlert = { driver_name: string; doc_type: string; expiry_date: string; days_until: number }
  const [expiryAlerts,    setExpiryAlerts]    = useState<ExpiryAlert[]>([])
  const [expiryDismissed, setExpiryDismissed] = useState(false)
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
    // Check driver document expiry (CDL, insurance, medical card within 30 days)
    window.api.drivers.compliance()
      .then(rows => {
        const now = Date.now()
        const alerts: ExpiryAlert[] = []
        const WINDOW = 30 * 86400000
        for (const r of rows) {
          const checks: Array<{ doc: string; date: string | null }> = [
            { doc: 'CDL',          date: r.cdl_expiry },
            { doc: 'Insurance',    date: r.insurance_expiry },
            { doc: 'Medical Card', date: r.medical_card_expiry },
            { doc: 'COI',          date: r.coi_expiry },
          ]
          for (const c of checks) {
            if (!c.date) continue
            const ms = new Date(c.date).getTime() - now
            if (ms >= 0 && ms <= WINDOW) {
              alerts.push({ driver_name: r.name, doc_type: c.doc, expiry_date: c.date, days_until: Math.floor(ms / 86400000) })
            }
          }
        }
        if (alerts.length > 0) setExpiryAlerts(alerts.sort((a, b) => a.days_until - b.days_until))
      })
      .catch(() => {})
    // Load weekly target from settings
    window.api.settings.get('weeklyRevenueTarget').then(v => {
      if (v != null && !isNaN(Number(v))) {
        setWeeklyTarget(Number(v))
        setTargetInput(String(v))
      }
    }).catch(() => {})
    // Query this week's paid/invoiced dispatch fees
    const now = new Date()
    const dow = now.getDay() === 0 ? 6 : now.getDay() - 1 // 0=Mon
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - dow)
    weekStart.setHours(0, 0, 0, 0)
    const weekStartIso = weekStart.toISOString().split('T')[0]
    window.api.db.query(
      `SELECT COALESCE(SUM(dispatch_fee), 0) AS total FROM loads
       WHERE status IN ('Invoiced','Paid') AND pickup_date >= ?`,
      [weekStartIso]
    ).then(res => {
      if (res.data && res.data.length > 0) {
        const row = res.data[0] as { total: number }
        setWeeklyEarned(row.total ?? 0)
      }
    }).catch(() => {})
  }, [])

  async function saveWeeklyTarget() {
    const n = parseFloat(targetInput)
    if (isNaN(n) || n <= 0) return
    await window.api.settings.set('weeklyRevenueTarget', n).catch(() => {})
    setWeeklyTarget(n)
    setEditingTarget(false)
  }

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

      {/* Driver document expiry alert */}
      {expiryAlerts.length > 0 && !expiryDismissed && (
        <div className='flex items-start gap-3 px-4 py-3 rounded-xl bg-amber-950/40 border border-amber-700/40'>
          <Clock size={15} className='text-amber-400 mt-0.5 shrink-0' />
          <div className='flex-1 min-w-0'>
            <p className='text-sm font-semibold text-amber-300'>
              {expiryAlerts.length} driver document{expiryAlerts.length !== 1 ? 's' : ''} expiring within 30 days
            </p>
            <p className='text-xs text-amber-600 mt-0.5'>
              {expiryAlerts.map(r => `${r.driver_name} — ${r.doc_type} expires ${r.expiry_date} (${r.days_until}d)`).join(' · ')}
            </p>
          </div>
          <button
            onClick={() => navigate('/drivers')}
            className='text-2xs px-2.5 py-1 rounded-lg bg-amber-700/40 hover:bg-amber-700/60 text-amber-300 border border-amber-700/40 shrink-0 transition-colors'
          >
            View Drivers
          </button>
          <button onClick={() => setExpiryDismissed(true)} className='p-1 text-amber-700 hover:text-amber-400 transition-colors shrink-0'>
            <X size={13} />
          </button>
        </div>
      )}

      {/* Weekly Revenue Target */}
      {(weeklyTarget != null || editingTarget) ? (
        <div className='bg-surface-700 rounded-xl border border-surface-400 px-5 py-4 shadow-card'>
          <div className='flex items-center justify-between mb-3'>
            <div className='flex items-center gap-2'>
              <Target size={15} className='text-orange-500' />
              <h2 className='text-sm font-semibold text-gray-200'>Weekly Revenue Target</h2>
            </div>
            {!editingTarget && (
              <button onClick={() => { setEditingTarget(true); setTargetInput(String(weeklyTarget ?? '')) }}
                className='text-2xs text-gray-500 hover:text-orange-400 transition-colors'>
                Edit target
              </button>
            )}
          </div>
          {editingTarget ? (
            <div className='flex items-center gap-2'>
              <span className='text-sm text-gray-400'>$</span>
              <input
                type='number' min='0' step='100'
                value={targetInput}
                onChange={e => setTargetInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') saveWeeklyTarget(); if (e.key === 'Escape') setEditingTarget(false) }}
                className='w-36 h-8 px-3 bg-surface-600 border border-surface-400 rounded-lg text-sm text-gray-200 focus:outline-none focus:border-orange-600/60'
                autoFocus
              />
              <button onClick={saveWeeklyTarget} className='px-3 h-8 text-xs bg-orange-600 hover:bg-orange-500 text-white rounded-lg transition-colors'>Save</button>
              <button onClick={() => setEditingTarget(false)} className='px-3 h-8 text-xs text-gray-400 hover:text-gray-200 transition-colors'>Cancel</button>
            </div>
          ) : weeklyTarget != null ? (() => {
            const pct = Math.min(100, Math.round((weeklyEarned / weeklyTarget) * 100))
            const remaining = weeklyTarget - weeklyEarned
            const barColor = pct >= 100 ? 'bg-green-500' : pct >= 75 ? 'bg-orange-500' : pct >= 40 ? 'bg-yellow-500' : 'bg-surface-500'
            return (
              <div>
                <div className='flex items-end justify-between mb-1.5'>
                  <span className='text-xl font-bold font-mono text-green-400'>${weeklyEarned.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                  <span className='text-sm text-gray-500'>of ${weeklyTarget.toLocaleString()} target · <span className={pct >= 100 ? 'text-green-400 font-semibold' : 'text-gray-400'}>{pct}%</span></span>
                </div>
                <div className='h-2.5 bg-surface-500 rounded-full overflow-hidden'>
                  <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
                </div>
                {pct < 100 && (
                  <p className='text-2xs text-gray-500 mt-1.5'>${remaining.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} remaining this week · based on Invoiced and Paid loads</p>
                )}
                {pct >= 100 && (
                  <p className='text-2xs text-green-400 font-medium mt-1.5'>Target reached this week.</p>
                )}
              </div>
            )
          })() : null}
        </div>
      ) : (
        <button
          onClick={() => setEditingTarget(true)}
          className='flex items-center gap-2 text-2xs text-gray-600 hover:text-orange-400 transition-colors w-full text-left px-1'
        >
          <Target size={11} /> Set a weekly revenue target to track progress here
        </button>
      )}

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
