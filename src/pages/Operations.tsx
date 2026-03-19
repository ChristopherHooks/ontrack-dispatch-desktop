import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Zap, AlertTriangle, Truck, Users, MessageSquare, Megaphone,
  FileText, ChevronRight, ChevronDown, Clock, ArrowRight, X,
  CheckSquare, TrendingUp, Package, Star, Phone, Target, MapPin,
} from 'lucide-react'
import { renderMd } from '../lib/renderMd'
import { computeLeadScore } from '../lib/leadScore'
import { openSaferMc, openSaferDot } from '../lib/saferUrl'
import { DRIVER_STATUS_STYLES } from '../components/drivers/constants'
import { LOAD_STATUS_STYLES } from '../components/loads/constants'
import type {
  Task, Driver, Load, Lead, LeadStatus, CheckCallRow,
  OperationsData, DriverOpportunity, LeadHeat, GroupPerformance, BrokerLane, ProfitRadarData,
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

interface NextAction {
  id:     string
  label:  string
  detail: string
  icon:   React.ReactNode
  route:  string
  urgent: boolean
}

const EMPTY: OperationsData = {
  fbConvNew: 0, fbConvActive: 0, driversNeedingLoads: 0, loadsInTransit: 0,
  overdueLeads: 0, todaysGroupCount: 0, outstandingInvoices: 0,
  warmLeads: [], availableDrivers: [], todayTasks: [], completedToday: [],
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
  const navigate = useNavigate()

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
  }, [])

  const todayIso = new Date().toISOString().split('T')[0]
  const today    = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

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

  // ── Next actions ───────────────────────────────────────────────────────────
  const nextActions: NextAction[] = [
    ops.fbConvNew > 0 && {
      id: 'fb-new', urgent: true,
      label:  'Reply to new FB inquiries',
      detail: `${ops.fbConvNew} conversation${ops.fbConvNew !== 1 ? 's' : ''} waiting for a first reply`,
      icon:   <MessageSquare size={14}/>, route: '/facebook',
    },
    ops.overdueLeads > 0 && {
      id: 'leads-overdue', urgent: true,
      label:  'Follow up on overdue leads',
      detail: `${ops.overdueLeads} lead${ops.overdueLeads !== 1 ? 's' : ''} past their follow-up date`,
      icon:   <AlertTriangle size={14}/>, route: '/leads',
    },
    ops.driversNeedingLoads > 0 && {
      id: 'drivers-loads', urgent: ops.driversNeedingLoads >= 2,
      label:  'Find loads for available drivers',
      detail: `${ops.driversNeedingLoads} active driver${ops.driversNeedingLoads !== 1 ? 's' : ''} without a load`,
      icon:   <Truck size={14}/>, route: '/dispatcher',
    },
    ops.todaysGroupCount > 0 && {
      id: 'marketing', urgent: false,
      label:  "Post in today's Facebook groups",
      detail: `${ops.todaysGroupCount} group${ops.todaysGroupCount !== 1 ? 's' : ''} eligible for a post today`,
      icon:   <Megaphone size={14}/>, route: '/marketing',
    },
    ops.fbConvActive > 0 && ops.fbConvNew === 0 && {
      id: 'fb-active', urgent: false,
      label:  'Check active FB conversations',
      detail: `${ops.fbConvActive} conversation${ops.fbConvActive !== 1 ? 's' : ''} in progress`,
      icon:   <MessageSquare size={14}/>, route: '/facebook',
    },
    ops.outstandingInvoices > 0 && {
      id: 'invoices', urgent: false,
      label:  'Review outstanding invoices',
      detail: `${ops.outstandingInvoices} invoice${ops.outstandingInvoices !== 1 ? 's' : ''} in Draft, Sent, or Overdue`,
      icon:   <FileText size={14}/>, route: '/invoices',
    },
  ].filter(Boolean) as NextAction[]

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

      {/* Briefing strip — 6 KPI cards */}
      <div className='grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3'>
        <KpiCard label='FB Inquiries'    value={loading ? '—' : String(ops.fbConvNew)}           icon={<MessageSquare size={16}/>} accent={ops.fbConvNew > 0}           sub='new / needing reply'    onClick={() => navigate('/facebook')}  />
        <KpiCard label='Loads In Transit' value={loading ? '—' : String(ops.loadsInTransit)}     icon={<Package size={16}/>}       accent={false}                        sub='currently moving'       onClick={() => navigate('/loads')}     />
        <KpiCard label='Drivers Avail.'  value={loading ? '—' : String(ops.driversNeedingLoads)} icon={<Truck size={16}/>}         accent={ops.driversNeedingLoads > 0}  sub='need loads today'       onClick={() => navigate('/drivers')}   />
        <KpiCard label='Overdue Leads'   value={loading ? '—' : String(ops.overdueLeads)}        icon={<Users size={16}/>}         accent={ops.overdueLeads > 0}         sub='follow-up past due'     onClick={() => navigate('/leads')}     />
        <KpiCard label='Groups to Post'  value={loading ? '—' : String(ops.todaysGroupCount)}    icon={<Megaphone size={16}/>}     accent={false}                        sub='eligible today'         onClick={() => navigate('/marketing')} />
        <KpiCard label='Open Invoices'   value={loading ? '—' : String(ops.outstandingInvoices)} icon={<FileText size={16}/>}      accent={ops.outstandingInvoices > 0}  sub='draft / sent / overdue' onClick={() => navigate('/invoices')}  />
      </div>

      {/* Upcoming Check Calls — only rendered when active loads have events */}
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
                  onClick={() => navigate('/activeloads')}
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

      {/* Profit Radar */}
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

        {/* Three-column radar grid */}
        <div className='grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-surface-600'>

          {/* Column 1: Idle Drivers */}
          <div className='p-4'>
            <div className='flex items-center gap-1.5 mb-3'>
              <Truck size={12} className='text-orange-500'/>
              <p className='text-2xs font-semibold text-gray-400 uppercase tracking-wider'>Idle Drivers</p>
              <span className='ml-auto text-2xs text-gray-600'>{radar.idleDrivers.length} available</span>
            </div>
            {radar.idleDrivers.length === 0 ? (
              <p className='text-xs text-gray-700 italic'>All active drivers are assigned.</p>
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

          {/* Column 2: FB Lead Heat */}
          <div className='p-4'>
            <div className='flex items-center gap-1.5 mb-3'>
              <MessageSquare size={12} className='text-orange-500'/>
              <p className='text-2xs font-semibold text-gray-400 uppercase tracking-wider'>FB Lead Heat</p>
              <span className='ml-auto text-2xs text-gray-600'>{radar.leadHeat.length} active</span>
            </div>
            {radar.leadHeat.length === 0 ? (
              <p className='text-xs text-gray-700 italic'>No active FB conversations.</p>
            ) : (
              <ul className='space-y-2'>
                {radar.leadHeat.slice(0, 5).map(c => {
                  const stageCls =
                    c.stage === 'Call Ready'  ? 'bg-red-900/30 text-red-400 border-red-700/40' :
                    c.stage === 'Interested'  ? 'bg-orange-900/30 text-orange-400 border-orange-700/40' :
                    c.stage === 'Replied'     ? 'bg-blue-900/30 text-blue-400 border-blue-700/40' :
                                               'bg-surface-600 text-gray-500 border-surface-500'
                  return (
                    <li key={c.convId} className='flex items-start gap-2 cursor-pointer hover:bg-surface-600 rounded-lg px-2 py-1.5 -mx-2 transition-colors' onClick={() => navigate('/facebook')}>
                      <span className='text-2xs font-bold text-orange-400 mt-0.5 w-6 text-center shrink-0'>{c.score}</span>
                      <div className='min-w-0 flex-1'>
                        <div className='flex items-center gap-1.5'>
                          <p className='text-xs font-medium text-gray-200 truncate flex-1'>{c.name}</p>
                          <span className={`text-2xs px-1 py-0 rounded border shrink-0 ${stageCls}`}>{c.stage}</span>
                        </div>
                        <p className='text-2xs text-orange-400/80 mt-0.5 truncate'>{c.nextAction}</p>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          {/* Column 3: Top Groups */}
          <div className='p-4'>
            <div className='flex items-center gap-1.5 mb-3'>
              <Megaphone size={12} className='text-orange-500'/>
              <p className='text-2xs font-semibold text-gray-400 uppercase tracking-wider'>Top Groups</p>
              <span className='ml-auto text-2xs text-gray-600'>by performance</span>
            </div>
            {radar.topGroups.length === 0 ? (
              <p className='text-xs text-gray-700 italic'>No active Facebook groups.</p>
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

      {/* Next Actions + Revenue Opportunities */}
      <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>

        {/* Next Actions */}
        <div className='bg-surface-700 rounded-xl border border-surface-400 p-5 shadow-card'>
          <div className='flex items-center gap-2 mb-4'>
            <Zap size={15} className='text-orange-500'/>
            <h2 className='text-sm font-semibold text-gray-200'>Next Actions</h2>
            <span className='text-2xs text-gray-600 ml-1'>ordered by urgency</span>
          </div>
          {nextActions.length === 0 ? (
            <div className='py-5 text-center'>
              <p className='text-sm text-green-400 font-medium'>All clear — nothing urgent right now.</p>
              <p className='text-xs text-gray-600 mt-1'>Check back after new FB activity or follow-ups come due.</p>
            </div>
          ) : (
            <ul className='space-y-2'>
              {nextActions.map(action => (
                <li key={action.id}>
                  <button
                    onClick={() => navigate(action.route)}
                    className={[
                      'w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-colors group',
                      action.urgent
                        ? 'border-orange-700/40 bg-orange-950/20 hover:bg-orange-950/40'
                        : 'border-surface-500 bg-surface-600 hover:border-surface-300',
                    ].join(' ')}
                  >
                    <span className={action.urgent ? 'text-orange-400' : 'text-gray-500'}>{action.icon}</span>
                    <div className='flex-1 min-w-0'>
                      <p className={['text-xs font-medium truncate', action.urgent ? 'text-orange-300' : 'text-gray-300'].join(' ')}>
                        {action.label}
                      </p>
                      <p className='text-2xs text-gray-600 truncate mt-0.5'>{action.detail}</p>
                    </div>
                    <ArrowRight size={13} className='text-gray-600 group-hover:text-gray-400 shrink-0 transition-colors'/>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Revenue Opportunities */}
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
              <p className='text-xs text-gray-700 italic'>No warm leads right now.</p>
            ) : (
              <ul className='space-y-1'>
                {ops.warmLeads.slice(0, 4).map(lead => {
                  const overdue = lead.follow_up_date && lead.follow_up_date < todayIso
                  return (
                    <li key={lead.id} className='flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-surface-600 transition-colors cursor-pointer' onClick={() => navigate('/leads')}>
                      <span className={['text-2xs px-1 py-0.5 rounded shrink-0',
                        lead.priority === 'High'   ? 'bg-red-900/30 text-red-400' :
                        lead.priority === 'Medium' ? 'bg-yellow-900/30 text-yellow-500' :
                                                     'bg-surface-600 text-gray-500',
                      ].join(' ')}>{lead.priority}</span>
                      <span className='text-xs text-gray-300 flex-1 truncate'>{lead.name}</span>
                      {lead.company && <span className='text-2xs text-gray-600 truncate max-w-[80px]'>{lead.company}</span>}
                      {overdue && <span className='text-2xs text-red-400 shrink-0'>overdue</span>}
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          <div>
            <div className='flex items-center justify-between mb-2'>
              <p className='text-2xs font-medium text-gray-500 uppercase tracking-wider'>Available Drivers</p>
              <button onClick={() => navigate('/dispatcher')} className='text-2xs text-orange-500 hover:text-orange-400 transition-colors'>Open board</button>
            </div>
            {ops.availableDrivers.length === 0 ? (
              <p className='text-xs text-gray-700 italic'>All active drivers are currently assigned.</p>
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
      </div>

      {/* Daily Checklist + Mini Dispatch Board */}
      <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>

        {/* Daily Checklist */}
        <div className='lg:col-span-2 bg-surface-700 rounded-xl border border-surface-400 p-5 shadow-card'>
          <div className='flex items-center justify-between mb-4'>
            <div className='flex items-center gap-2'>
              <CheckSquare size={15} className='text-orange-500'/>
              <h2 className='text-sm font-semibold text-gray-200'>Daily Checklist</h2>
            </div>
            {ops.todayTasks.length > 0 && (
              <span className='text-2xs text-gray-500'>{completedCount} / {ops.todayTasks.length} complete</span>
            )}
          </div>
          {loading ? (
            <p className='text-sm text-gray-600'>Loading...</p>
          ) : ops.todayTasks.length === 0 ? (
            <p className='text-sm text-gray-600'>No tasks scheduled for today.</p>
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

        {/* Mini Dispatch Board */}
        <div className='bg-surface-700 rounded-xl border border-surface-400 p-5 shadow-card'>
          <div className='flex items-center gap-2 mb-4'>
            <Truck size={15} className='text-orange-500'/>
            <h2 className='text-sm font-semibold text-gray-200'>Dispatch Board</h2>
          </div>
          {loading ? (
            <p className='text-xs text-gray-600'>Loading...</p>
          ) : drivers.length === 0 ? (
            <p className='text-xs text-gray-600 text-center py-4'>No drivers yet.</p>
          ) : (
            <div className='space-y-2'>
              {boardDrivers.map(d => {
                const cl = loadByDriver[d.id]
                const needsLoad = d.status === 'Active' && !cl
                return (
                  <div key={d.id} className={['rounded-lg px-3 py-2 border',
                    needsLoad ? 'border-orange-700/40 bg-orange-950/20' : 'border-surface-500 bg-surface-600',
                  ].join(' ')}>
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
          <p className='text-sm text-gray-600'>Loading leads...</p>
        ) : topLeads.length === 0 ? (
          <p className='text-sm text-gray-600'>No active leads. Run an FMCSA import to populate your pipeline.</p>
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
      {sub && <p className='text-2xs text-gray-600 mt-0.5 leading-tight'>{sub}</p>}
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
        <span className={['text-2xs px-1.5 py-0.5 rounded-full shrink-0',
          task.priority === 'High'   ? 'bg-red-900/30 text-red-400' :
          task.priority === 'Medium' ? 'bg-yellow-900/30 text-yellow-500' :
                                       'bg-surface-600 text-gray-500'].join(' ')}>
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
    lead._grade === 'Hot'  ? 'bg-orange-900/40 text-orange-400 border-orange-700/40' :
    lead._grade === 'Warm' ? 'bg-yellow-900/30 text-yellow-500 border-yellow-700/30' :
                             'bg-surface-600 text-gray-500 border-surface-500'

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
            <p className='text-sm text-gray-600'>Loading...</p>
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
