import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { activeLoadsRoute, leadsRoute } from '../lib/routeIntents'
import {
  AlertTriangle, Truck, Users, Megaphone,
  FileText, ChevronRight, ChevronDown, Clock, X,
  CheckSquare, TrendingUp, Package, Star, Phone, Target, MapPin,
} from 'lucide-react'
import { renderMd } from '../lib/renderMd'
import { computeLeadScore } from '../lib/leadScore'
import { openSaferMc, openSaferDot } from '../lib/saferUrl'
import { DRIVER_STATUS_STYLES } from '../components/drivers/constants'
import { LOAD_STATUS_STYLES } from '../components/loads/constants'
import { LaunchSprintPanel } from '../components/operations/LaunchSprintPanel'
import { MorningDispatchBrief } from '../components/operations/MorningDispatchBrief'
import { DailyWorkflowPanel } from '../components/operations/DailyWorkflowPanel'
import { DoThisNowPanel } from '../components/operations/DoThisNowPanel'
import { computeDailyWorkflow } from '../lib/dailyWorkflowEngine'
import type { DailyWorkflowTask } from '../lib/dailyWorkflowEngine'
import { computeDriverTier, TIER_BADGE, TIER_LABEL } from '../lib/driverTierService'
import { useSettingsStore } from '../store/settingsStore'
import { badge as badgeTokens } from '../styles/uiTokens'
import type {
  Task, Driver, Load, Lead, LeadStatus, CheckCallRow,
  OperationsData, ProfitRadarData,
  DriverComplianceRow, MorningDispatchBriefRow,
} from '../types/models'

// ---------------------------------------------------------------------------
// Types (local only — not shared across modules)
// ---------------------------------------------------------------------------

interface ScoredLead extends Lead {
  _score:    number
  _grade:    'Hot' | 'Warm' | 'Cold'
  _overdue:  boolean
  _dueToday: boolean
}

const EMPTY: OperationsData = {
  driversNeedingLoads: 0, loadsInTransit: 0,
  overdueLeads: 0, todaysGroupCount: 0, outstandingInvoices: 0, overdueInvoices: 0,
  revenueThisMonth: 0, uninvoicedDelivered: 0, staleLoads: [], expiringDocs: [],
  warmLeads: [], availableDrivers: [], hotProspects: [], todayTasks: [], completedToday: [],
  totalDrivers: 0, totalBrokers: 0, totalLeads: 0, hasSentOrPaidInvoice: false,
  weeklyScorecard: { loadsCompleted: 0, grossRevenue: 0, dispatchRevenue: 0, avgRpm: null, bestLane: null, bestBroker: null, invoicesSent: 0 },
}

const RADAR_EMPTY: ProfitRadarData = { idleDrivers: [], leadHeat: [], topGroups: [], topLanes: [] }

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function Operations() {
  const [ops,             setOps]             = useState<OperationsData>(EMPTY)
  const [drivers,         setDrivers]         = useState<Driver[]>([])
  const [loads,           setLoads]           = useState<Load[]>([])
  const [leads,           setLeads]           = useState<Lead[]>([])
  const [loading,         setLoading]         = useState(true)
  const [leadsLoading,    setLeadsLoading]    = useState(true)
  const [radar,           setRadar]           = useState<ProfitRadarData>(RADAR_EMPTY)
  const [radarSummary,    setRadarSummary]    = useState<string | null>(null)
  const [summaryLoading,  setSummaryLoading]  = useState(false)
  const [docModal,        setDocModal]        = useState<string | null>(null)
  const [checkCalls,      setCheckCalls]      = useState<CheckCallRow[]>([])
  const [revenueGoal,     setRevenueGoal]     = useState<number | null>(null)
  const [editingGoal,     setEditingGoal]     = useState(false)
  const [goalInput,       setGoalInput]       = useState('')
  const [compliance,      setCompliance]      = useState<DriverComplianceRow[]>([])
  const [morningBrief,    setMorningBrief]    = useState<MorningDispatchBriefRow[]>([])
  const [briefLoading,    setBriefLoading]    = useState(true)
  const [workflowDone,       setWorkflowDone]       = useState<Set<string>>(new Set())
  const [checklistCollapsed, setChecklistCollapsed] = useState(true)
  const navigate         = useNavigate()
  const companyName      = useSettingsStore((s) => s.companyName)
  const firstLaunchDate  = useSettingsStore((s) => s.firstLaunchDate)

  useEffect(() => {
    Promise.all([
      window.api.operations.data(),
      window.api.drivers.list(),
      window.api.loads.list(),
      window.api.profitRadar.data(),
    ]).then(([o, d, l, r]) => {
      setOps(o as OperationsData)
      setDrivers(d as Driver[])
      setLoads(l as Load[])
      setRadar(r as ProfitRadarData)
      setLoading(false)
      // Fire AI summary independently — does not block main data render
      setSummaryLoading(true)
      window.api.profitRadar.summary()
        .then((s: string | null) => { setRadarSummary(s); setSummaryLoading(false) })
        .catch(() => setSummaryLoading(false))
    }).catch(() => setLoading(false))

    // Upcoming check calls — fires independently, does not block render
    window.api.timeline.upcomingCalls(6)
      .then((c: CheckCallRow[]) => setCheckCalls(c))
      .catch(() => {})

    window.api.leads.list()
      .then((l: Lead[]) => { setLeads(l); setLeadsLoading(false) })
      .catch(() => setLeadsLoading(false))

    window.api.settings.get('revenueGoal')
      .then((v: unknown) => { if (typeof v === 'number' && v > 0) setRevenueGoal(v) })
      .catch(() => {})

    window.api.drivers.compliance()
      .then((rows: DriverComplianceRow[]) => setCompliance(rows))
      .catch(() => {})

    // Morning Dispatch Brief — fires independently, does not block main data render
    window.api.operations.morningBrief()
      .then((rows: MorningDispatchBriefRow[]) => { setMorningBrief(rows); setBriefLoading(false) })
      .catch(() => setBriefLoading(false))
  }, [])

  const refreshMorningBrief = () => {
    setBriefLoading(true)
    window.api.operations.morningBrief()
      .then((rows: MorningDispatchBriefRow[]) => { setMorningBrief(rows); setBriefLoading(false) })
      .catch(() => setBriefLoading(false))
  }

  const saveGoal = async () => {
    const val = parseFloat(goalInput.replace(/[^0-9.]/g, ''))
    if (!isNaN(val) && val > 0) {
      await window.api.settings.set('revenueGoal', val)
      setRevenueGoal(val)
    }
    setEditingGoal(false)
  }

  const todayIso = new Date().toISOString().split('T')[0]
  const today    = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  // ── Daily Workflow — computed from live operational data ───────────────────
  const overdueCallList = checkCalls.filter(c =>
    c.scheduled_at && c.scheduled_at < new Date().toISOString()
  )
  const overdueCheckCalls              = overdueCallList.length
  const firstOverdueCheckCallLoadId    = overdueCallList[0]?.load_id_pk

  const workflowTasks: DailyWorkflowTask[] = (!loading && !briefLoading)
    ? computeDailyWorkflow(
        {
          driversNeedingLoads:          ops.driversNeedingLoads,
          loadsInTransit:               ops.loadsInTransit,
          overdueCheckCalls,
          firstOverdueCheckCallLoadId,
          firstIdleDriverName:          radar.idleDrivers[0]?.name,
          totalCheckCalls:              checkCalls.length,
          overdueLeads:                 ops.overdueLeads,
          uninvoicedDelivered:          ops.uninvoicedDelivered,
          overdueInvoices:     ops.overdueInvoices,
          expiringDocs:        ops.expiringDocs.length,
          staleLoads:          ops.staleLoads.length,
          // Only count warm leads with an upcoming follow-up date (not already overdue —
          // overdue ones are already shown in overdueLeads). Avoids inflating the count
          // with all High/Medium priority leads that have no scheduled follow-up.
          warmLeads: ops.warmLeads.filter(l =>
            l.follow_up_date != null && l.follow_up_date > todayIso
          ).length,
          hotProspects:        ops.hotProspects.length,
          todaysGroupCount:    ops.todaysGroupCount,
          morningBriefCount:   morningBrief.length,
        },
        workflowDone,
      )
    : []

  const handleWorkflowDone   = (id: string) => setWorkflowDone(prev => new Set([...prev, id]))
  const handleWorkflowUndone = (id: string) => setWorkflowDone(prev => { const next = new Set(prev); next.delete(id); return next })

  // ── Dispatch board ─────────────────────────────────────────────────────────
  const activeLoads = loads.filter(l => ['Booked', 'Picked Up', 'In Transit'].includes(l.status))
  const loadByDriver: Record<number, Load> = {}
  activeLoads.forEach(l => { if (l.driver_id != null) loadByDriver[l.driver_id] = l })
  const boardDrivers = [...drivers]
    .sort((a, b) => {
      if (a.status === 'Active' && b.status !== 'Active') return -1
      if (b.status === 'Active' && a.status !== 'Active') return  1
      return (a.id in loadByDriver ? 1 : 0) - (b.id in loadByDriver ? 1 : 0)
    })
    .slice(0, 6)

  // Build tier map from morning brief rows (uses offer + scorecard data already fetched)
  const tierByDriver: Record<number, ReturnType<typeof computeDriverTier>> = {}
  morningBrief.forEach(row => {
    tierByDriver[row.driver_id] = computeDriverTier({
      accepted_count:       row.accepted_count,
      declined_count:       row.declined_count,
      no_response_count:    row.no_response_count,
      loads_booked:         row.loads_booked,
      acceptance_rate:      row.acceptance_rate ?? 0,
      avg_response_minutes: row.avg_response_minutes,
      fallout_count:        0,
    })
  })

  // ── Top leads ──────────────────────────────────────────────────────────────
  const topLeads: ScoredLead[] = leads
    .filter(l => l.status !== 'Signed' && l.status !== 'Rejected')
    .map(l => {
      const { total, grade } = computeLeadScore(l)
      return {
        ...l,
        _score:    total,
        _grade:    grade,
        _overdue:  Boolean(l.follow_up_date && l.follow_up_date < todayIso),
        _dueToday: Boolean(l.follow_up_date && l.follow_up_date === todayIso),
      }
    })
    .sort((a, b) => {
      const boostA = a._overdue ? 20 : a._dueToday ? 12 : 0
      const boostB = b._overdue ? 20 : b._dueToday ? 12 : 0
      return (b._score + boostB) - (a._score + boostA)
    })
    .slice(0, 10)

  const completedCount = ops.todayTasks.filter(t =>
    ops.completedToday.includes(t.id)
  ).length

  const handleLeadStatusChange = async (leadId: number, status: LeadStatus) => {
    const updated = await window.api.leads.update(leadId, { status })
    if (updated) setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status } : l))
  }

  return (
    <div className='space-y-6 max-w-6xl animate-fade-in'>

      {/* Header */}
      <div>
        <p className='text-xs text-gray-500 font-medium uppercase tracking-wider mb-1'>Operations Control Panel</p>
        <h1 className='text-2xl font-bold text-gray-100'>{today}</h1>
      </div>

      {/* Do This Now — priority command center */}
      <DoThisNowPanel
        tasks={workflowTasks}
        idleDrivers={radar.idleDrivers}
        loading={loading || briefLoading}
      />

      {/* 7-Day Launch Sprint — visible until first invoice is sent */}
      <LaunchSprintPanel
        ops={ops}
        companyName={companyName}
        firstLaunchDate={firstLaunchDate}
        loading={loading}
      />

      {/* Daily Workflow — flat ranked priority queue */}
      <DailyWorkflowPanel
        tasks={workflowTasks}
        onMarkDone={handleWorkflowDone}
        onMarkUndone={handleWorkflowUndone}
        loading={loading || briefLoading}
        layout='flat'
      />

      {/* Morning Dispatch Brief — driver-first load planning */}
      <div id='morning-dispatch-brief'>
        <MorningDispatchBrief
          rows={morningBrief}
          loading={briefLoading}
          onAssigned={refreshMorningBrief}
        />
      </div>

      {/* Briefing strip — 6 KPI cards */}
      <div className='grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3'>
        <KpiCard label='Revenue MTD'     value={loading ? '—' : `$${ops.revenueThisMonth.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`} icon={<TrendingUp size={16}/>} accent={false} sub='dispatch fees paid' onClick={() => navigate('/invoices')} />
        <KpiCard label='Loads In Transit' value={loading ? '—' : String(ops.loadsInTransit)}     icon={<Package size={16}/>}       accent={false}                        sub='currently moving'       onClick={() => navigate('/loads')}     />
        <KpiCard label='Drivers Avail.'  value={loading ? '—' : String(ops.driversNeedingLoads)} icon={<Truck size={16}/>}         accent={ops.driversNeedingLoads > 0}  sub='need loads today'       onClick={() => navigate('/drivers')}   />
        <KpiCard label='Overdue Leads'   value={loading ? '—' : String(ops.overdueLeads)}        icon={<Users size={16}/>}         accent={ops.overdueLeads > 0}         sub='follow-up past due'     onClick={() => navigate(leadsRoute('overdue'))}     />
        <KpiCard label='Groups to Post'  value={loading ? '—' : String(ops.todaysGroupCount)}    icon={<Megaphone size={16}/>}     accent={false}                        sub='eligible today'         onClick={() => navigate('/marketing')} />
        <KpiCard label='Open Invoices'   value={loading ? '—' : String(ops.outstandingInvoices)} icon={<FileText size={16}/>}      accent={ops.outstandingInvoices > 0}  sub='draft / sent / overdue' onClick={() => navigate('/invoices')}  />
      </div>

      {/* Weekly Scorecard */}
      {!loading && ops.weeklyScorecard.loadsCompleted > 0 && (() => {
        const sc = ops.weeklyScorecard
        const fmt$ = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`
        return (
          <div className='bg-surface-700 rounded-xl border border-surface-400 shadow-card overflow-hidden'>
            <div className='flex items-center justify-between px-5 py-3 border-b border-surface-500/50'>
              <div className='flex items-center gap-2'>
                <TrendingUp size={13} className='text-green-400' />
                <span className='text-sm font-semibold text-gray-100'>Last 7 Days</span>
              </div>
              <span className='text-xs text-gray-500'>rolling scorecard</span>
            </div>
            <div className='grid grid-cols-2 sm:grid-cols-4 gap-0 divide-x divide-surface-500/40'>
              {[
                { label: 'Loads Delivered', value: String(sc.loadsCompleted) },
                { label: 'Gross Revenue', value: fmt$(sc.grossRevenue) },
                { label: 'Your Fees', value: fmt$(sc.dispatchRevenue) },
                { label: 'Avg RPM', value: sc.avgRpm != null ? `$${sc.avgRpm.toFixed(2)}` : '—' },
              ].map((item, i) => (
                <div key={i} className='px-5 py-3'>
                  <p className='text-2xs text-gray-400'>{item.label}</p>
                  <p className='text-lg font-bold font-mono text-gray-100 mt-0.5'>{item.value}</p>
                </div>
              ))}
            </div>
            {(sc.bestLane || sc.bestBroker) && (
              <div className='flex items-center gap-6 px-5 py-2.5 border-t border-surface-500/40 bg-surface-700/50'>
                {sc.bestLane   && <p className='text-2xs text-gray-500'>Top lane: <span className='text-gray-300 font-medium'>{sc.bestLane}</span></p>}
                {sc.bestBroker && <p className='text-2xs text-gray-500'>Top broker: <span className='text-gray-300 font-medium'>{sc.bestBroker}</span></p>}
                {sc.invoicesSent > 0 && <p className='text-2xs text-gray-500'>{sc.invoicesSent} invoice{sc.invoicesSent !== 1 ? 's' : ''} sent</p>}
              </div>
            )}
          </div>
        )
      })()}

      {/* Revenue Goal Tracker */}
      {(() => {
        const now        = new Date()
        const daysInMo   = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
        const dayOfMo    = now.getDate()
        const daysLeft   = daysInMo - dayOfMo
        const revenue    = ops.revenueThisMonth
        const projected  = dayOfMo > 0 ? (revenue / dayOfMo) * daysInMo : 0
        const pct        = revenueGoal ? Math.min(1, revenue / revenueGoal) : 0
        const onPace     = revenueGoal && dayOfMo > 0
          ? projected >= revenueGoal
          : false
        const remaining  = revenueGoal ? Math.max(0, revenueGoal - revenue) : 0
        const perDay     = daysLeft > 0 ? remaining / daysLeft : remaining
        const fmt$       = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`

        if (!revenueGoal && !editingGoal) {
          return (
            <div className='flex items-center justify-between bg-surface-700 rounded-xl border border-surface-400 px-5 py-3'>
              <div className='flex items-center gap-2'>
                <Target size={14} className='text-gray-600' />
                <span className='text-sm text-gray-500'>No monthly revenue goal set</span>
              </div>
              <button
                onClick={() => { setGoalInput(''); setEditingGoal(true) }}
                className='text-xs text-orange-500 hover:text-orange-400 font-medium transition-colors'
              >
                Set Goal
              </button>
            </div>
          )
        }

        if (editingGoal) {
          return (
            <div className='flex items-center gap-3 bg-surface-700 rounded-xl border border-orange-600/40 px-5 py-3'>
              <Target size={14} className='text-orange-400 shrink-0' />
              <span className='text-sm text-gray-300 shrink-0'>Monthly goal:</span>
              <input
                autoFocus
                type='text'
                value={goalInput}
                onChange={e => setGoalInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') saveGoal(); if (e.key === 'Escape') setEditingGoal(false) }}
                placeholder='e.g. 5000'
                className='w-32 bg-surface-600 border border-surface-400 rounded-lg px-3 py-1.5 text-sm text-gray-100 focus:outline-none focus:border-orange-500'
              />
              <button onClick={saveGoal} className='text-xs px-3 py-1.5 bg-orange-600 hover:bg-orange-500 text-white rounded-lg transition-colors'>Save</button>
              <button onClick={() => setEditingGoal(false)} className='text-xs text-gray-500 hover:text-gray-300 transition-colors'>Cancel</button>
            </div>
          )
        }

        return (
          <div className='bg-surface-700 rounded-xl border border-surface-400 px-5 py-4'>
            <div className='flex items-center justify-between mb-3'>
              <div className='flex items-center gap-2'>
                <Target size={14} className='text-orange-400' />
                <span className='text-xs font-semibold text-gray-200'>Monthly Revenue Goal</span>
                {onPace
                  ? <span className={`text-2xs px-2 py-0.5 rounded-full ${badgeTokens.success}`}>On pace</span>
                  : <span className={`text-2xs px-2 py-0.5 rounded-full ${badgeTokens.caution}`}>Behind pace</span>
                }
              </div>
              <button
                onClick={() => { setGoalInput(String(revenueGoal ?? '')); setEditingGoal(true) }}
                className='text-2xs text-gray-600 hover:text-gray-400 transition-colors'
              >
                Edit
              </button>
            </div>

            {/* Progress bar */}
            <div className='h-2 bg-surface-500 rounded-full overflow-hidden mb-3'>
              <div
                className={`h-full rounded-full transition-all duration-500 ${onPace ? 'bg-green-500' : 'bg-orange-500'}`}
                style={{ width: `${pct * 100}%` }}
              />
            </div>

            {/* Stats row */}
            <div className='flex items-center gap-6 flex-wrap'>
              <div>
                <p className='text-2xs text-gray-400'>Earned MTD</p>
                <p className='text-sm font-bold text-gray-200'>{fmt$(revenue)}</p>
              </div>
              <div>
                <p className='text-2xs text-gray-400'>Goal</p>
                <p className='text-sm font-bold text-gray-200'>{fmt$(revenueGoal!)}</p>
              </div>
              <div>
                <p className='text-2xs text-gray-400'>Projected Month End</p>
                <p className={`text-sm font-bold font-mono ${onPace ? 'text-green-400' : 'text-orange-400'}`}>{fmt$(projected)}</p>
              </div>
              <div>
                <p className='text-2xs text-gray-400'>Remaining</p>
                <p className={`text-sm font-bold ${remaining > 0 ? 'text-orange-400' : 'text-green-400'}`}>{fmt$(remaining)}</p>
              </div>
              <div>
                <p className='text-2xs text-gray-400'>Day {dayOfMo} of {daysInMo}</p>
                <p className='text-sm font-bold text-gray-300'>{daysLeft}d left</p>
              </div>
              {daysLeft > 0 && remaining > 0 && (
                <div>
                  <p className='text-2xs text-gray-400'>Needed per day</p>
                  <p className='text-sm font-bold text-yellow-500'>{fmt$(perDay)}</p>
                </div>
              )}
              {remaining === 0 && (
                <p className='text-sm font-bold text-green-400'>Goal reached.</p>
              )}
            </div>
          </div>
        )
      })()}

      {/* Document Expiry Warnings — only rendered when something is expiring within 45 days */}
      {ops.expiringDocs.length > 0 && (
        <div className='bg-surface-700 rounded-xl border border-red-800/40 shadow-card px-5 py-3'>
          <div className='flex items-center gap-2 mb-3'>
            <AlertTriangle size={14} className='text-red-400' />
            <h2 className='text-xs font-semibold text-gray-200'>Documents Expiring Soon</h2>
            <button
              onClick={() => navigate('/drivers')}
              className='ml-auto text-2xs text-orange-500 hover:text-orange-400 flex items-center gap-1 transition-colors'
            >
              Open Drivers <ChevronRight size={10} />
            </button>
          </div>
          <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2'>
            {ops.expiringDocs.map((doc, i) => (
              <button
                key={i}
                onClick={() => navigate('/drivers')}
                className={`flex items-start gap-2 px-3 py-2 rounded-lg border text-left transition-colors hover:bg-surface-600 ${
                  doc.days_until <= 14 ? 'border-red-800/50 bg-red-950/20' : 'border-surface-400 bg-surface-600/50'
                }`}
              >
                <AlertTriangle size={11} className={`shrink-0 mt-0.5 ${doc.days_until <= 14 ? 'text-red-400' : 'text-yellow-500'}`} />
                <div className='min-w-0'>
                  <p className='text-2xs font-medium text-gray-300 truncate'>{doc.driver_name}</p>
                  <p className='text-2xs text-gray-500 truncate'>{doc.doc_type}</p>
                  <p className={`text-2xs font-medium ${doc.days_until <= 14 ? 'text-red-400' : 'text-yellow-500'}`}>
                    {doc.days_until === 0 ? 'Expires today' : `${doc.days_until}d remaining`}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Upcoming Check Calls — moved up; these are time-sensitive and must be visible */}
      {checkCalls.length > 0 && (
        <div className='bg-surface-700 rounded-xl border border-surface-400 shadow-card px-5 py-3'>
          <div className='flex items-center gap-2 mb-3'>
            <Clock size={14} className='text-orange-500' />
            <h2 className='text-xs font-semibold text-gray-200'>Upcoming Check Calls</h2>
            <button
              onClick={() => navigate('/activeloads')}
              className='ml-auto text-2xs text-orange-500 hover:text-orange-400 flex items-center gap-1 transition-colors'
            >
              Open Active Loads <ChevronRight size={10} />
            </button>
          </div>
          <div className='grid grid-cols-2 sm:grid-cols-3 gap-2'>
            {checkCalls.map(cc => {
              const scheduled = cc.scheduled_at ? new Date(cc.scheduled_at) : null
              const overdue   = scheduled ? scheduled < new Date() : false
              const timeStr   = scheduled
                ? scheduled.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
                : null
              return (
                <button
                  key={cc.event_id}
                  onClick={() => navigate(activeLoadsRoute(cc.load_id_pk))}
                  className={`flex items-start gap-2 px-3 py-2 rounded-lg border text-left transition-colors hover:bg-surface-600 ${
                    overdue ? 'border-red-800/40 bg-red-950/20' : 'border-surface-400 bg-surface-600/50'
                  }`}
                >
                  <Clock size={11} className={`shrink-0 mt-0.5 ${overdue ? 'text-red-400' : 'text-orange-500'}`} />
                  <div className='min-w-0'>
                    <p className='text-2xs font-medium text-gray-300 truncate'>
                      {cc.driver_name ?? (cc.load_ref ? `#${cc.load_ref}` : 'Load')}
                    </p>
                    <p className='text-2xs text-gray-600 truncate'>{cc.label}</p>
                    {timeStr && (
                      <p className={`text-2xs font-medium ${overdue ? 'text-red-400' : 'text-gray-500'}`}>{timeStr}</p>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Carrier Compliance Matrix — after check calls; collapsible */}
      {compliance.length > 0 && (
        <ComplianceMatrix rows={compliance} onNavigate={() => navigate('/drivers')} />
      )}

      {/* Profit Radar — collapsible reference panel */}
      <div className='bg-surface-700 rounded-xl border border-surface-400 shadow-card'>
        {/* Radar header */}
        <div className='flex items-center gap-3 px-5 py-3 border-b border-surface-400'>
          <Target size={15} className='text-orange-500'/>
          <h2 className='text-sm font-semibold text-gray-200'>Profit Radar</h2>
          <span className='text-2xs text-gray-600'>highest-value opportunities right now</span>
          {/* AI Summary pill */}
          <div className='ml-auto'>
            {summaryLoading ? (
              <span className='text-2xs text-gray-600 italic'>Generating summary...</span>
            ) : radarSummary ? (
              <span className='text-2xs text-gray-400 italic max-w-xs lg:max-w-md truncate block text-right'>{radarSummary}</span>
            ) : null}
          </div>
        </div>

        {/* AI Summary — full width below header when long */}
        {!summaryLoading && radarSummary && radarSummary.length > 100 && (
          <div className='px-5 py-2.5 border-b border-surface-600 bg-surface-600/40'>
            <p className='text-xs text-gray-400 italic leading-relaxed'>{radarSummary}</p>
          </div>
        )}

        {/* Two-column radar grid */}
        <div className='grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-surface-600'>

          {/* Column 1: Idle Drivers */}
          <div className='p-4'>
            <div className='flex items-center gap-1.5 mb-3'>
              <Truck size={12} className='text-orange-500'/>
              <p className='text-2xs font-semibold text-gray-400 uppercase tracking-wider'>Idle Drivers</p>
              <span className='ml-auto text-2xs text-gray-600'>{radar.idleDrivers.length} available</span>
            </div>
            {radar.idleDrivers.length === 0 ? (
              <p className='text-xs text-gray-400 italic'>All active drivers are assigned.</p>
            ) : (
              <ul className='space-y-2'>
                {radar.idleDrivers.slice(0, 5).map(d => (
                  <li key={d.driverId} className='flex items-start gap-2 cursor-pointer hover:bg-surface-600 rounded-lg px-2 py-1.5 -mx-2 transition-colors' onClick={() => navigate('/loadmatch?driverId=' + d.driverId)}>
                    <span className='text-2xs font-bold text-orange-400 mt-0.5 w-6 text-center shrink-0'>{d.score}</span>
                    <div className='min-w-0'>
                      <p className='text-xs font-medium text-gray-200 truncate'>{d.name}</p>
                      <div className='flex items-center gap-1.5 mt-0.5 flex-wrap'>
                        {d.truckType && <span className='text-2xs text-gray-600'>{d.truckType}</span>}
                        {(d.location ?? d.homeBase) && (
                          <span className='text-2xs text-gray-600 flex items-center gap-0.5'>
                            <MapPin size={9}/>{d.location ?? d.homeBase}
                          </span>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Column 2: Top Groups */}
          <div className='p-4'>
            <div className='flex items-center gap-1.5 mb-3'>
              <Megaphone size={12} className='text-orange-500'/>
              <p className='text-2xs font-semibold text-gray-400 uppercase tracking-wider'>Top Groups</p>
              <span className='ml-auto text-2xs text-gray-600'>by performance</span>
            </div>
            {radar.topGroups.length === 0 ? (
              <p className='text-xs text-gray-400 italic'>No active Facebook groups.</p>
            ) : (
              <ul className='space-y-2'>
                {radar.topGroups.slice(0, 5).map(g => (
                  <li key={g.groupId} className='flex items-start gap-2 cursor-pointer hover:bg-surface-600 rounded-lg px-2 py-1.5 -mx-2 transition-colors' onClick={() => navigate('/marketing')}>
                    <span className='text-2xs font-bold text-orange-400 mt-0.5 w-6 text-center shrink-0'>{g.score}</span>
                    <div className='min-w-0'>
                      <p className='text-xs font-medium text-gray-200 truncate'>{g.name}</p>
                      <div className='flex items-center gap-1.5 mt-0.5 flex-wrap'>
                        {g.leadsGenerated > 0 && <span className='text-2xs text-green-500'>{g.leadsGenerated} lead{g.leadsGenerated !== 1 ? 's' : ''}</span>}
                        {g.signedDrivers > 0  && <span className='text-2xs text-orange-400'>{g.signedDrivers} signed</span>}
                        <span className={[
                          'text-2xs',
                          g.priority === 'High'   ? 'text-red-400' :
                          g.priority === 'Medium' ? 'text-yellow-500' : 'text-gray-600',
                        ].join(' ')}>{g.priority}</span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Broker lanes row — only shown when data exists */}
        {radar.topLanes.length > 0 && (
          <div className='border-t border-surface-600 px-5 py-3'>
            <div className='flex items-center gap-2 mb-2'>
              <TrendingUp size={12} className='text-orange-500'/>
              <p className='text-2xs font-semibold text-gray-500 uppercase tracking-wider'>Top Broker Lanes by RPM</p>
            </div>
            <div className='flex flex-wrap gap-2'>
              {radar.topLanes.map((lane, i) => {
                const strength = lane.avgRpm >= 2.50 && lane.loads >= 3 ? 'Strong'
                  : lane.avgRpm >= 1.80 || lane.loads >= 2 ? 'Average'
                  : 'Weak'
                const strengthCls = strength === 'Strong' ? 'text-green-400'
                  : strength === 'Average' ? 'text-orange-400'
                  : 'text-gray-500'
                return (
                  <div key={i} className='flex items-center gap-1.5 px-2.5 py-1.5 bg-surface-600 border border-surface-500 rounded-lg'>
                    <span className='text-xs font-medium text-gray-300'>{lane.originState} → {lane.destState}</span>
                    <span className='text-2xs text-green-400 font-semibold'>${lane.avgRpm.toFixed(2)}/mi</span>
                    <span className='text-2xs text-gray-600'>{lane.loads} load{lane.loads !== 1 ? 's' : ''}</span>
                    <span className={`text-2xs font-semibold ${strengthCls}`}>{strength}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Revenue Opportunities — full width (Next Actions surfaced in Do This Now) */}
      <div className='bg-surface-700 rounded-xl border border-surface-400 p-5 shadow-card'>
          <div className='flex items-center gap-2 mb-4'>
            <TrendingUp size={15} className='text-orange-500'/>
            <h2 className='text-sm font-semibold text-gray-200'>Revenue Opportunities</h2>
          </div>

          <div className='mb-4'>
            <div className='flex items-center justify-between mb-2'>
              <p className='text-2xs font-medium text-gray-500 uppercase tracking-wider'>Warm Leads</p>
              <button onClick={() => navigate('/leads')} className='text-2xs text-orange-500 hover:text-orange-400 transition-colors'>View all</button>
            </div>
            {ops.warmLeads.length === 0 ? (
              <p className='text-xs text-gray-400 italic'>No warm leads right now.</p>
            ) : (
              <ul className='space-y-1'>
                {ops.warmLeads.slice(0, 4).map(lead => {
                  const overdue = lead.follow_up_date && lead.follow_up_date < todayIso
                  return (
                    <li key={lead.id} className='flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-surface-600 transition-colors cursor-pointer' onClick={() => navigate(`/leads?open=${lead.id}`)}>
                      <span className={`text-2xs px-1 py-0.5 rounded shrink-0 ${
                        lead.priority === 'High'   ? badgeTokens.danger :
                        lead.priority === 'Medium' ? badgeTokens.caution :
                                                     badgeTokens.neutral
                      }`}>{lead.priority}</span>
                      <span className='text-xs text-gray-300 flex-1 truncate'>{lead.name}</span>
                      {lead.company && <span className='text-2xs text-gray-600 truncate max-w-[80px]'>{lead.company}</span>}
                      {overdue && <span className='text-2xs text-red-400 shrink-0'>overdue</span>}
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          {/* Hot Driver Prospects */}
          {ops.hotProspects.length > 0 && (
            <div className='mb-4'>
              <div className='flex items-center justify-between mb-2'>
                <p className='text-2xs font-medium text-gray-500 uppercase tracking-wider'>Driver Prospects</p>
                <button onClick={() => navigate('/driver-acquisition')} className='text-2xs text-orange-500 hover:text-orange-400 transition-colors'>Pipeline</button>
              </div>
              <ul className='space-y-1'>
                {ops.hotProspects.slice(0, 4).map(p => {
                  const overdue = p.follow_up_date && p.follow_up_date < todayIso
                  return (
                    <li
                      key={p.id}
                      className='flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-surface-600 transition-colors cursor-pointer'
                      onClick={() => navigate('/driver-acquisition')}
                    >
                      <span className={`text-2xs px-1 py-0.5 rounded shrink-0 ${
                        p.priority === 'High'   ? badgeTokens.danger :
                        p.priority === 'Medium' ? badgeTokens.caution :
                                                   badgeTokens.neutral
                      }`}>{p.priority}</span>
                      <span className='text-xs text-gray-300 flex-1 truncate'>{p.name}</span>
                      <span className='text-2xs text-gray-600 shrink-0'>{p.stage}</span>
                      {overdue && <span className='text-2xs text-red-400 shrink-0'>overdue</span>}
                    </li>
                  )
                })}
              </ul>
            </div>
          )}

          <div>
            <div className='flex items-center justify-between mb-2'>
              <p className='text-2xs font-medium text-gray-500 uppercase tracking-wider'>Available Drivers</p>
              <button onClick={() => navigate('/dispatcher')} className='text-2xs text-orange-500 hover:text-orange-400 transition-colors'>Open board</button>
            </div>
            {ops.availableDrivers.length === 0 ? (
              <p className='text-xs text-gray-400 italic'>All active drivers are currently assigned.</p>
            ) : (
              <ul className='space-y-1'>
                {ops.availableDrivers.slice(0, 4).map(driver => (
                  <li key={driver.id} className='flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-surface-600 transition-colors cursor-pointer' onClick={() => navigate('/dispatcher')}>
                    <Truck size={11} className='text-orange-500 shrink-0'/>
                    <span className='text-xs text-gray-300 flex-1 truncate'>{driver.name}</span>
                    {driver.truck_type && <span className='text-2xs text-gray-600 shrink-0'>{driver.truck_type}</span>}
                    {driver.home_base  && <span className='text-2xs text-gray-600 shrink-0'>{driver.home_base}</span>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

      {/* Daily Checklist + Mini Dispatch Board */}
      <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>

        {/* Daily Checklist — collapsed by default */}
        <div className='lg:col-span-2 bg-surface-700 rounded-xl border border-surface-400 shadow-card overflow-hidden'>
          <button
            onClick={() => setChecklistCollapsed(c => !c)}
            className='w-full flex items-center justify-between px-5 py-3 hover:bg-surface-600/30 transition-colors'
          >
            <div className='flex items-center gap-2'>
              <CheckSquare size={14} className='text-orange-500'/>
              <span className='text-sm font-semibold text-gray-200'>Daily Checklist</span>
              {ops.todayTasks.length > 0 && (
                <span className='text-2xs text-gray-500'>{completedCount} / {ops.todayTasks.length} done</span>
              )}
            </div>
            <ChevronDown size={13} className={`text-gray-600 transition-transform ${checklistCollapsed ? '' : 'rotate-180'}`} />
          </button>
          {!checklistCollapsed && (
            <div className='px-5 pb-4 border-t border-surface-500/50 pt-3'>
              {loading ? (
                <p className='text-sm text-gray-400'>Loading...</p>
              ) : ops.todayTasks.length === 0 ? (
                <p className='text-sm text-gray-400'>No tasks scheduled for today.</p>
              ) : (
                <ul className='space-y-1'>
                  {ops.todayTasks.map(task => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      initialDone={ops.completedToday.includes(task.id)}
                      todayIso={todayIso}
                      onDocLink={setDocModal}
                    />
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        {/* Mini Dispatch Board — with tier badges and Match Loads button */}
        <div className='bg-surface-700 rounded-xl border border-surface-400 p-4 shadow-card'>
          <div className='flex items-center justify-between mb-3'>
            <div className='flex items-center gap-2'>
              <Truck size={14} className='text-orange-500'/>
              <span className='text-sm font-semibold text-gray-200'>Dispatch Board</span>
            </div>
            <button onClick={() => navigate('/dispatcher')} className='text-2xs text-orange-500 hover:text-orange-400 transition-colors flex items-center gap-1'>
              Full board <ChevronRight size={10}/>
            </button>
          </div>
          {loading ? (
            <p className='text-xs text-gray-600'>Loading...</p>
          ) : drivers.length === 0 ? (
            <p className='text-xs text-gray-600 text-center py-4'>No drivers yet.</p>
          ) : (
            <div className='space-y-2'>
              {boardDrivers.map(d => {
                const cl        = loadByDriver[d.id]
                const needsLoad = d.status === 'Active' && !cl
                const tier      = tierByDriver[d.id]
                return (
                  <div key={d.id} className={['rounded-lg px-3 py-2 border',
                    needsLoad ? 'border-orange-700/40 bg-orange-950/20' : 'border-surface-500 bg-surface-600',
                  ].join(' ')}>
                    <div className='flex items-center justify-between gap-2'>
                      <p className='text-xs font-medium text-gray-200 truncate flex-1'>{d.name}</p>
                      {tier && tier.tier !== 'UNRATED' && (
                        <span className={`text-2xs px-1.5 py-0.5 rounded font-bold shrink-0 ${TIER_BADGE[tier.tier]}`}>
                          {TIER_LABEL[tier.tier]}
                        </span>
                      )}
                      <span className={`text-2xs px-1.5 py-0.5 rounded-full border shrink-0 ${DRIVER_STATUS_STYLES[d.status]}`}>{d.status}</span>
                    </div>
                    {cl ? (
                      <p className='text-2xs text-gray-500 mt-0.5 flex items-center gap-1'>
                        <span className={`text-2xs px-1 py-0 rounded ${LOAD_STATUS_STYLES[cl.status]}`}>{cl.status}</span>
                        {[cl.origin_state, cl.dest_state].filter(Boolean).join(' → ')}
                      </p>
                    ) : needsLoad ? (
                      <div className='flex items-center justify-between mt-1'>
                        <p className='text-2xs text-orange-500'>Empty — needs load</p>
                        <button
                          onClick={() => navigate(`/loadmatch?driverId=${d.id}`)}
                          className='text-2xs text-orange-400 hover:text-orange-300 border border-orange-600/40 hover:border-orange-500/60 px-2 py-0.5 rounded transition-colors'
                        >
                          Match
                        </button>
                      </div>
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

      {/* Top Leads */}
      <div className='bg-surface-700 rounded-xl border border-surface-400 p-5 shadow-card'>
        <div className='flex items-center justify-between mb-4'>
          <div className='flex items-center gap-2'>
            <Star size={15} className='text-orange-500'/>
            <h2 className='text-sm font-semibold text-gray-200'>Top Leads Today</h2>
            <span className='text-2xs text-gray-600'>· scored by data completeness + follow-up urgency</span>
          </div>
          <button onClick={() => navigate('/leads')} className='text-2xs text-orange-500 hover:text-orange-400 transition-colors'>
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
              <TopLeadRow key={lead.id} rank={i + 1} lead={lead} onStatusChange={handleLeadStatusChange} />
            ))}
          </div>
        )}
      </div>

      {/* Document modal */}
      {docModal && <DocModal title={docModal} onClose={() => setDocModal(null)} />}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Carrier Compliance Matrix
// ---------------------------------------------------------------------------

type ComplianceStatus = 'ok' | 'warn' | 'critical' | 'expired' | 'missing'

function docStatus(expiry: string | null, today: string): ComplianceStatus {
  if (!expiry) return 'missing'
  if (expiry < today) return 'expired'
  const days = Math.round((new Date(expiry).getTime() - new Date(today).getTime()) / 86400000)
  if (days <= 30)  return 'critical'
  if (days <= 60)  return 'warn'
  return 'ok'
}

const STATUS_LABEL: Record<ComplianceStatus, string> = {
  ok:       'OK',
  warn:     'Soon',
  critical: 'Critical',
  expired:  'Expired',
  missing:  'Missing',
}

const COMPLIANCE_CLS: Record<ComplianceStatus, string> = {
  ok:       badgeTokens.success,
  warn:     badgeTokens.caution,
  critical: badgeTokens.danger,
  expired:  badgeTokens.danger,
  missing:  badgeTokens.neutral,
}

function StatusBadge({ status, expiry }: { status: ComplianceStatus; expiry: string | null }) {
  const tip = expiry ? new Date(expiry).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' }) : 'Not on file'
  return (
    <span title={tip} className={`text-2xs px-1.5 py-0.5 rounded border font-medium ${COMPLIANCE_CLS[status]}`}>
      {STATUS_LABEL[status]}
    </span>
  )
}

function ComplianceMatrix({ rows, onNavigate }: { rows: DriverComplianceRow[]; onNavigate: () => void }) {
  const todayIso = new Date().toISOString().split('T')[0]
  const [collapsed, setCollapsed] = useState(true)

  const withStatus = rows.map(r => ({
    ...r,
    cdlStatus: docStatus(r.cdl_expiry, todayIso),
    insStatus: docStatus(r.insurance_expiry, todayIso),
    coiStatus: docStatus(r.coi_expiry, todayIso),
  }))

  const alertCount = withStatus.filter(r =>
    ['critical','expired','missing'].includes(r.cdlStatus) ||
    ['critical','expired','missing'].includes(r.insStatus) ||
    ['critical','expired','missing'].includes(r.coiStatus)
  ).length

  const allClear = alertCount === 0

  return (
    <div className={`bg-surface-700 rounded-xl border shadow-card ${allClear ? 'border-surface-400' : 'border-red-800/40'}`}>
      <button
        onClick={() => setCollapsed(c => !c)}
        className='w-full flex items-center justify-between px-5 py-3 hover:bg-surface-600/30 transition-colors rounded-xl'
      >
        <div className='flex items-center gap-2'>
          <FileText size={14} className={allClear ? 'text-green-400' : 'text-red-400'} />
          <h2 className='text-xs font-semibold text-gray-200'>Carrier Compliance</h2>
          {allClear
            ? <span className={`text-2xs px-2 py-0.5 rounded-full ${badgeTokens.success}`}>All clear</span>
            : <span className={`text-2xs px-2 py-0.5 rounded-full ${badgeTokens.danger}`}>{alertCount} need attention</span>
          }
        </div>
        <div className='flex items-center gap-2'>
          <button
            onClick={e => { e.stopPropagation(); onNavigate() }}
            className='text-2xs text-orange-500 hover:text-orange-400 flex items-center gap-1 transition-colors'
          >
            Open Drivers <ChevronRight size={10} />
          </button>
          <ChevronDown size={13} className={`text-gray-600 transition-transform ${collapsed ? '' : 'rotate-180'}`} />
        </div>
      </button>

      {!collapsed && (
        <div className='px-5 pb-4 border-t border-surface-500'>
          <div className='mt-3 overflow-x-auto'>
            <table className='w-full text-xs'>
              <thead>
                <tr className='border-b border-surface-500'>
                  <th className='text-left pb-2 text-2xs font-medium text-gray-400 pr-4'>Driver</th>
                  <th className='text-left pb-2 text-2xs font-medium text-gray-400 pr-3'>CDL</th>
                  <th className='text-left pb-2 text-2xs font-medium text-gray-400 pr-3'>Insurance</th>
                  <th className='text-left pb-2 text-2xs font-medium text-gray-400'>COI</th>
                </tr>
              </thead>
              <tbody className='divide-y divide-surface-600'>
                {withStatus.map(r => (
                  <tr key={r.id} className='hover:bg-surface-600/30 transition-colors cursor-pointer' onClick={onNavigate}>
                    <td className='py-2 pr-4'>
                      <p className='text-gray-200 font-medium'>{r.name}</p>
                      {r.mc_number && <p className='text-gray-600 text-2xs font-mono'>{r.mc_number}</p>}
                    </td>
                    <td className='py-2 pr-3'><StatusBadge status={r.cdlStatus} expiry={r.cdl_expiry} /></td>
                    <td className='py-2 pr-3'><StatusBadge status={r.insStatus} expiry={r.insurance_expiry} /></td>
                    <td className='py-2'><StatusBadge status={r.coiStatus} expiry={r.coi_expiry} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className='text-2xs text-gray-500 mt-3'>CDL / Insurance from driver profile. COI from attached documents. Hover any badge to see the date. Warn = within 60 days, Critical = within 30 days.</p>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// KPI Card
// ---------------------------------------------------------------------------

function KpiCard({ label, value, icon, accent = false, sub, onClick }: {
  label: string; value: string; icon: React.ReactNode; accent?: boolean; sub?: string; onClick?: () => void
}) {
  return (
    <button onClick={onClick}
      className={['w-full text-left bg-surface-700 rounded-xl border p-4 shadow-card hover:shadow-card-hover hover:bg-surface-600 transition-all',
        accent ? 'border-orange-600/40' : 'border-surface-400'].join(' ')}>
      <div className={['mb-1.5', accent ? 'text-orange-500' : 'text-gray-500'].join(' ')}>{icon}</div>
      <p className='text-2xl font-bold text-gray-100'>{value}</p>
      <p className='text-xs text-gray-400 mt-0.5 leading-tight'>{label}</p>
      {sub && <p className='text-2xs text-gray-400 mt-0.5 leading-tight'>{sub}</p>}
    </button>
  )
}

// ---------------------------------------------------------------------------
// Task Row
// ---------------------------------------------------------------------------

interface TaskItem { id: number; title: string; status: string; time_of_day: string | null; priority: string; notes: string | null }

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

function TaskRow({ task, initialDone, todayIso, onDocLink }: {
  task: TaskItem; initialDone: boolean; todayIso: string; onDocLink: (t: string) => void
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
      if (next) await window.api.tasks.markComplete(task.id, todayIso)
      else       await window.api.tasks.markIncomplete(task.id, todayIso)
    } catch { setDone(!next) }
  }

  return (
    <li className='rounded-lg border border-transparent hover:border-surface-500 transition-colors'>
      <div className='flex items-center gap-2 px-1 py-1.5'>
        <button onClick={toggleDone}
          className={['w-4 h-4 rounded border shrink-0 flex items-center justify-center transition-colors',
            done ? 'bg-orange-600 border-orange-600' : 'border-surface-300 hover:border-orange-500'].join(' ')}>
          {done && <span className='text-white text-2xs'>✓</span>}
        </button>
        <span className={['text-sm flex-1', done ? 'line-through text-gray-600' : 'text-gray-300'].join(' ')}>
          {task.title}
        </span>
        {task.time_of_day && (
          <div className='flex items-center gap-1 text-2xs text-gray-500 shrink-0'>
            <Clock size={10}/>{task.time_of_day}
          </div>
        )}
        <span className={`text-2xs px-1.5 py-0.5 rounded-full shrink-0 ${
          task.priority === 'High'   ? badgeTokens.danger :
          task.priority === 'Medium' ? badgeTokens.caution :
                                       badgeTokens.neutral
        }`}>
          {task.priority}
        </span>
        {hasNotes && (
          <button onClick={() => setExpanded(v => !v)} className='text-gray-600 hover:text-gray-400 transition-colors shrink-0'>
            {expanded ? <ChevronDown size={13}/> : <ChevronRight size={13}/>}
          </button>
        )}
      </div>

      {expanded && hasNotes && (
        <div className='ml-6 pb-2 space-y-1'>
          {hasSteps ? subtasks.map((step, i) => (
            <div key={i} className='flex items-start gap-2'>
              <button onClick={() => setChecked(c => ({ ...c, [i]: !c[i] }))}
                className={['mt-0.5 w-3.5 h-3.5 rounded border shrink-0 flex items-center justify-center transition-colors',
                  checked[i] ? 'bg-green-700 border-green-700' : 'border-surface-400 hover:border-green-600'].join(' ')}>
                {checked[i] && <span className='text-white' style={{fontSize:'8px'}}>✓</span>}
              </button>
              <span className={['text-xs flex-1 leading-snug', checked[i] ? 'line-through text-gray-600' : 'text-gray-400'].join(' ')}>
                {step.text.split(/\[\[(.+?)\]\]/).map((part, pi) =>
                  pi % 2 === 0
                    ? <span key={pi}>{part}</span>
                    : <button key={pi} onClick={() => onDocLink(part)} className='text-orange-400 hover:text-orange-300 underline cursor-pointer font-medium'>{part}</button>
                )}
              </span>
            </div>
          )) : (
            <p className='text-xs text-gray-500 leading-relaxed pr-2'>
              {task.notes!.split(/\[\[(.+?)\]\]/).map((part, pi) =>
                pi % 2 === 0
                  ? <span key={pi}>{part}</span>
                  : <button key={pi} onClick={() => onDocLink(part)} className='text-orange-400 hover:text-orange-300 underline cursor-pointer font-medium'>{part}</button>
              )}
            </p>
          )}
        </div>
      )}
    </li>
  )
}

// ---------------------------------------------------------------------------
// Top Lead Row
// ---------------------------------------------------------------------------

const LEAD_STATUS_OPTIONS: LeadStatus[] = [
  'New', 'Attempted', 'Voicemail Left', 'Contacted', 'Interested', 'Call Back Later',
  'Not Interested', 'Bad Fit', 'Converted',
]

const STATUS_CLS: Record<string, string> = {
  New:              'text-blue-400',
  Attempted:        'text-gray-400',
  'Voicemail Left': 'text-violet-400',
  Contacted:        'text-yellow-500',
  Interested:      'text-green-400',
  'Call Back Later': 'text-sky-400',
  'Not Interested':  'text-gray-500',
  'Bad Fit':         'text-gray-500',
  Converted:         'text-emerald-400',
  Signed:            'text-orange-400',
  Rejected:          'text-gray-600',
  'Inactive MC':     'text-gray-600',
}

function TopLeadRow({ rank, lead, onStatusChange }: {
  rank:           number
  lead:           ScoredLead
  onStatusChange: (id: number, status: LeadStatus) => Promise<void>
}) {
  const [currentStatus, setCurrentStatus] = useState<LeadStatus>(lead.status as LeadStatus)
  const [saving, setSaving] = useState(false)

  const gradeCls =
    lead._grade === 'Hot'  ? badgeTokens.warning :
    lead._grade === 'Warm' ? badgeTokens.caution :
                             badgeTokens.neutral

  const identifier = lead.mc_number ?? (lead.dot_number ? 'DOT-' + lead.dot_number : null)
  const location   = [lead.city, lead.state].filter(Boolean).join(', ')

  // Include legacy status in options if the lead currently has one
  const options = LEAD_STATUS_OPTIONS.includes(currentStatus)
    ? LEAD_STATUS_OPTIONS
    : [...LEAD_STATUS_OPTIONS, currentStatus]

  async function handleStatusChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value as LeadStatus
    const prev = currentStatus
    setCurrentStatus(next)  // optimistic
    setSaving(true)
    try {
      await onStatusChange(lead.id, next)
    } catch {
      setCurrentStatus(prev)  // revert on failure
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className='flex items-center gap-3 py-2.5'>
      <span className='text-2xs text-gray-700 w-4 text-right shrink-0'>{rank}</span>
      <span className={`text-2xs font-bold px-1.5 py-0.5 rounded border min-w-[28px] text-center shrink-0 ${gradeCls}`}>
        {lead._score}
      </span>
      <div className='flex-1 min-w-0'>
        <div className='flex items-center gap-1.5 flex-wrap'>
          <p className='text-xs font-medium text-gray-200 truncate'>{lead.name}</p>
          <select
            value={currentStatus}
            onChange={handleStatusChange}
            disabled={saving}
            title='Change lead status'
            className={`text-2xs bg-transparent border-0 p-0 cursor-pointer focus:outline-none focus:ring-1 focus:ring-orange-600/40 rounded disabled:opacity-50 ${STATUS_CLS[currentStatus] ?? 'text-gray-500'}`}
          >
            {options.map(s => <option key={s} value={s} className='bg-surface-700 text-gray-200'>{s}</option>)}
          </select>
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
          {location && <span className='text-2xs text-gray-600'>{location}</span>}
        </div>
      </div>
      {lead.phone
        ? <a href={`tel:${lead.phone}`} className='flex items-center gap-1 text-2xs text-gray-500 hover:text-orange-400 transition-colors shrink-0'>
            <Phone size={10}/>{lead.phone}
          </a>
        : <span className='text-2xs text-gray-700 shrink-0'>no phone</span>
      }
    </div>
  )
}

// ---------------------------------------------------------------------------
// Document Modal
// ---------------------------------------------------------------------------

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
            <button onClick={() => setStack(s => s.slice(0, -1))}
              className='text-gray-500 hover:text-gray-300 text-xs px-2 py-0.5 border border-surface-400 rounded transition-colors'>
              Back
            </button>
          )}
          <h3 className='text-sm font-semibold text-gray-100 flex-1 truncate'>{current.title}</h3>
          <button onClick={onClose} className='text-gray-500 hover:text-gray-300'><X size={16}/></button>
        </div>
        <div className='flex-1 overflow-y-auto px-6 py-5'>
          {loading ? (
            <p className='text-sm text-gray-400'>Loading...</p>
          ) : current.content ? (
            <div
              dangerouslySetInnerHTML={{ __html: renderMd(current.content) }}
              onClick={async (e) => {
                const link = (e.target as HTMLElement).closest('[data-doc-link]') as HTMLElement | null
                const t = link?.getAttribute('data-doc-link')
                if (t) { e.preventDefault(); await followLink(t) }
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
