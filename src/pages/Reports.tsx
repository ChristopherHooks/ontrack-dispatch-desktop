import { useState, useEffect } from 'react'
import { TrendingUp, Building2, MapPin, DollarSign, BarChart2, AlertCircle, ArrowRight, Users, ChevronUp, ChevronDown } from 'lucide-react'
import type { DriverWeeklyScorecard } from '../types/models'
import { badge as badgeTokens } from '../styles/uiTokens'

interface WeeklyRevenue  { week: string; week_label: string; dispatch_fee: number; load_count: number }
interface MonthlyRevenue { month: string; month_label: string; dispatch_fee: number; load_count: number }
interface BrokerSummary  { broker_id: number | null; broker_name: string; load_count: number; total_gross: number; total_fee: number; avg_rpm: number | null }
interface IftatRow       { state: string; total_miles: number; load_count: number }
interface InvoiceAgingRow { invoice_id: number; broker_name: string; amount: number; sent_date: string | null; days_out: number; bucket: '0-15' | '16-30' | '31-60' | '60+'; status: string }
interface LanePerformanceRow { origin_state: string; dest_state: string; load_count: number; avg_rpm: number | null; best_rpm: number | null; total_fee: number }
interface CashFlowOutlook {
  pendingDeliveredFee: number; pendingDeliveredCount: number
  invoicesSentTotal: number; invoicesSentCount: number
  paidThisMonthFee: number; paidThisMonthCount: number
}
interface ReportsData {
  weeklyRevenue: WeeklyRevenue[]; monthlyRevenue: MonthlyRevenue[]
  brokerSummary: BrokerSummary[]; iftaByState: IftatRow[]
  invoiceAging: InvoiceAgingRow[]; lanePerformance: LanePerformanceRow[]
  allTimeFeeTot: number; allTimeLoadCount: number; ytdFee: number; ytdLoadCount: number
  cashFlow: CashFlowOutlook
}

const fmtMoney = (v: number) => '$' + v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmtNum   = (v: number) => v.toLocaleString()

const EMPTY_CASH: CashFlowOutlook = {
  pendingDeliveredFee: 0, pendingDeliveredCount: 0,
  invoicesSentTotal: 0,   invoicesSentCount: 0,
  paidThisMonthFee: 0,    paidThisMonthCount: 0,
}
const EMPTY: ReportsData = {
  weeklyRevenue: [], monthlyRevenue: [], brokerSummary: [], iftaByState: [],
  invoiceAging: [], lanePerformance: [],
  allTimeFeeTot: 0, allTimeLoadCount: 0, ytdFee: 0, ytdLoadCount: 0,
  cashFlow: EMPTY_CASH,
}

const BUCKET_COLOR: Record<string, string> = {
  '0-15':  'text-green-400',
  '16-30': 'text-yellow-400',
  '31-60': 'text-orange-400',
  '60+':   'text-red-400',
}
const BUCKET_BG: Record<string, string> = {
  '0-15':  'bg-green-500/10 border-green-500/20',
  '16-30': 'bg-yellow-500/10 border-yellow-500/20',
  '31-60': 'bg-orange-500/10 border-orange-500/20',
  '60+':   'bg-red-500/10 border-red-500/20',
}

function rpmColor(v: number | null): string {
  if (v == null) return 'text-gray-500'
  if (v >= 3.00) return 'text-green-400'
  if (v >= 2.50) return 'text-orange-400'
  return 'text-red-400'
}

function Sec({ title, icon }: { title: string; icon: React.ReactNode }) {
  return (
    <div className='flex items-center gap-2 mb-4'>
      <span className='text-orange-400'>{icon}</span>
      <h2 className='text-sm font-semibold text-gray-100 uppercase tracking-wider'>{title}</h2>
    </div>
  )
}

type ScoreSort = 'dispatcher_revenue' | 'avg_rpm' | 'acceptance_rate' | 'loads_booked'

function acceptanceBadge(rate: number, noResp: number): string {
  if (rate >= 70) return badgeTokens.success
  if (rate >= 40) return badgeTokens.caution
  if (noResp > 3) return badgeTokens.danger
  return badgeTokens.warning
}

function rpmBadge(v: number | null): string {
  if (v == null)   return 'text-gray-500'
  if (v >= 3.00)   return 'text-green-400 font-semibold'
  if (v >= 2.50)   return 'text-orange-400'
  return 'text-red-400'
}

export function Reports() {
  const [data, setData]     = useState<ReportsData>(EMPTY)
  const [loading, setLoading] = useState(true)
  const [scorecards, setScorecards] = useState<DriverWeeklyScorecard[]>([])
  const [scoreSort, setScoreSort]   = useState<ScoreSort>('dispatcher_revenue')
  const [scoreSortDir, setScoreSortDir] = useState<'desc' | 'asc'>('desc')

  useEffect(() => {
    window.api.reports.data().then(d => {
      setData(d as ReportsData)
      setLoading(false)
    })
    window.api.drivers.allWeeklyScorecards().then(setScorecards).catch(() => {})
  }, [])

  const sortedScorecards = [...scorecards].sort((a, b) => {
    const av = (a[scoreSort] as number | null) ?? -1
    const bv = (b[scoreSort] as number | null) ?? -1
    return scoreSortDir === 'desc' ? bv - av : av - bv
  })

  function toggleSort(col: ScoreSort) {
    if (scoreSort === col) {
      setScoreSortDir(d => d === 'desc' ? 'asc' : 'desc')
    } else {
      setScoreSort(col)
      setScoreSortDir('desc')
    }
  }

  if (loading) return (
    <div className='space-y-4 max-w-[1200px] animate-fade-in'>
      <h1 className='text-xl font-semibold text-gray-100'>Reports</h1>
      <div className='grid grid-cols-1 gap-4'>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className='h-48 rounded-xl bg-surface-700 animate-pulse' />
        ))}
      </div>
    </div>
  )

  const maxWeeklyFee = Math.max(...data.weeklyRevenue.map(w => w.dispatch_fee), 1)
  const maxMonthlyFee = Math.max(...data.monthlyRevenue.map(m => m.dispatch_fee), 1)
  const maxBrokerFee = Math.max(...data.brokerSummary.map(b => b.total_fee), 1)
  const maxMiles = Math.max(...data.iftaByState.map(r => r.total_miles), 1)

  return (
    <div className='space-y-6 max-w-[1200px] animate-fade-in'>
      <div>
        <h1 className='text-xl font-semibold text-gray-100'>Reports</h1>
        <p className='text-sm text-gray-500 mt-0.5'>Revenue, broker performance, and IFTA mileage summary</p>
      </div>

      {/* KPI strip */}
      <div className='grid grid-cols-2 lg:grid-cols-4 gap-3'>
        {[
          { label: 'YTD Revenue',    value: fmtMoney(data.ytdFee),          sub: `${fmtNum(data.ytdLoadCount)} loads paid` },
          { label: 'All-Time Revenue', value: fmtMoney(data.allTimeFeeTot), sub: `${fmtNum(data.allTimeLoadCount)} loads total` },
          { label: 'Avg per Load (YTD)', value: data.ytdLoadCount > 0 ? fmtMoney(data.ytdFee / data.ytdLoadCount) : '—', sub: 'dispatch fee per load' },
          { label: 'Top Broker',
            value: data.brokerSummary[0]?.broker_name ?? '—',
            sub: data.brokerSummary[0] ? `${fmtMoney(data.brokerSummary[0].total_fee)} earned` : 'no data' },
        ].map(k => (
          <div key={k.label} className='bg-surface-700 rounded-xl border border-surface-400 px-4 py-3'>
            <p className='text-2xs text-gray-400 uppercase tracking-wider'>{k.label}</p>
            <p className='text-lg font-bold font-mono text-green-400 mt-1 truncate'>{k.value}</p>
            <p className='text-2xs text-gray-400 mt-0.5'>{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Driver Performance — This Week */}
      <div className='bg-surface-700 rounded-xl border border-surface-400 p-5'>
        <div className='flex items-center justify-between mb-1'>
          <Sec title='Driver Performance — This Week' icon={<Users size={14} />} />
        </div>
        <p className='text-2xs text-gray-600 mb-4'>
          Dispatch-mode loads with pickup this week (Mon–Sun). Offer stats from the same window. Sorted by Dispatcher Cut by default.
        </p>
        {scorecards.length === 0 ? (
          <p className='text-sm text-gray-600 italic'>No driver activity recorded for this week yet.</p>
        ) : (
          <div className='overflow-x-auto'>
            <table className='w-full text-xs'>
              <thead>
                <tr className='border-b border-surface-400'>
                  <th className='text-left text-2xs text-gray-400 uppercase tracking-wider pb-2 pr-3'>Driver</th>
                  {([
                    { key: 'loads_booked',       label: 'Loads' },
                    { key: null,                  label: 'Gross' },
                    { key: 'dispatcher_revenue',  label: 'Disp. Cut' },
                    { key: 'avg_rpm',             label: 'Avg RPM' },
                    { key: 'acceptance_rate',     label: 'Acc. Rate' },
                    { key: null,                  label: 'Avg Resp' },
                    { key: null,                  label: 'Acc / Dec / NR' },
                    { key: null,                  label: 'Open' },
                  ] as Array<{ key: ScoreSort | null; label: string }>).map(({ key, label }) => (
                    <th
                      key={label}
                      onClick={key ? () => toggleSort(key) : undefined}
                      className={`text-right text-2xs text-gray-400 uppercase tracking-wider pb-2 select-none ${key ? 'cursor-pointer hover:text-gray-200' : ''}`}
                    >
                      <span className='inline-flex items-center gap-0.5 justify-end'>
                        {label}
                        {key && scoreSort === key && (
                          scoreSortDir === 'desc' ? <ChevronDown size={10} /> : <ChevronUp size={10} />
                        )}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedScorecards.map(s => {
                  const fmtResp = (m: number | null) => {
                    if (m == null) return '—'
                    return m < 60 ? `${m.toFixed(0)}m` : `${(m / 60).toFixed(1)}h`
                  }
                  return (
                    <tr key={s.driver_id} className='border-b border-surface-600 last:border-0'>
                      <td className='py-2 text-gray-200 font-medium pr-3 whitespace-nowrap'>{s.driver_name}</td>
                      <td className='py-2 text-right text-gray-400 font-mono'>{s.loads_booked}</td>
                      <td className='py-2 text-right text-gray-400 font-mono'>{fmtMoney(s.gross_revenue)}</td>
                      <td className='py-2 text-right text-green-400 font-mono font-semibold'>{fmtMoney(s.dispatcher_revenue)}</td>
                      <td className={`py-2 text-right font-mono ${rpmBadge(s.avg_rpm)}`}>
                        {s.avg_rpm != null ? `$${s.avg_rpm.toFixed(2)}` : '—'}
                      </td>
                      <td className='py-2 text-right'>
                        {s.accepted_count + s.declined_count + s.no_response_count > 0 ? (
                          <span className={`text-2xs px-1.5 py-0.5 rounded font-medium ${acceptanceBadge(s.acceptance_rate, s.no_response_count)}`}>
                            {s.acceptance_rate.toFixed(1)}%
                          </span>
                        ) : (
                          <span className='text-gray-600'>—</span>
                        )}
                      </td>
                      <td className='py-2 text-right text-gray-400 font-mono'>{fmtResp(s.avg_response_minutes)}</td>
                      <td className='py-2 text-right'>
                        <span className='text-green-400'>{s.accepted_count}</span>
                        <span className='text-gray-600'> / </span>
                        <span className='text-red-400'>{s.declined_count}</span>
                        <span className='text-gray-600'> / </span>
                        <span className='text-gray-500'>{s.no_response_count}</span>
                      </td>
                      <td className='py-2 text-right'>
                        {s.open_offer_count > 0
                          ? <span className='text-orange-400 font-mono'>{s.open_offer_count}</span>
                          : <span className='text-gray-700'>—</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 30-Day Cash Flow Outlook */}
      <div className='bg-surface-700 rounded-xl border border-surface-400 p-5'>
        <Sec title='30-Day Cash Flow Outlook' icon={<BarChart2 size={14} />} />
        <div className='grid grid-cols-1 sm:grid-cols-3 gap-4'>
          {/* Bucket 1: Pending invoicing */}
          <div className='rounded-xl border bg-yellow-500/8 dark:bg-yellow-900/15 border-yellow-500/25 dark:border-yellow-700/30 px-4 py-3'>
            <p className='text-2xs font-medium text-yellow-600 dark:text-yellow-400 uppercase tracking-wider mb-2'>Pending Invoicing</p>
            <p className='text-xl font-bold font-mono text-yellow-600 dark:text-yellow-400'>{fmtMoney(data.cashFlow.pendingDeliveredFee)}</p>
            <p className='text-2xs text-gray-500 dark:text-gray-400 mt-1'>{data.cashFlow.pendingDeliveredCount} delivered load{data.cashFlow.pendingDeliveredCount !== 1 ? 's' : ''} not yet invoiced</p>
            <p className='text-2xs text-gray-500 mt-0.5'>Estimated dispatch fee. Invoice to unlock payment.</p>
          </div>
          {/* Bucket 2: Invoiced, awaiting payment */}
          <div className='rounded-xl border bg-orange-500/8 dark:bg-orange-900/15 border-orange-500/25 dark:border-orange-700/30 px-4 py-3'>
            <p className='text-2xs font-medium text-orange-600 dark:text-orange-400 uppercase tracking-wider mb-2'>Invoiced — Awaiting Payment</p>
            <p className='text-xl font-bold font-mono text-orange-600 dark:text-orange-400'>{fmtMoney(data.cashFlow.invoicesSentTotal)}</p>
            <p className='text-2xs text-gray-500 dark:text-gray-400 mt-1'>{data.cashFlow.invoicesSentCount} invoice{data.cashFlow.invoicesSentCount !== 1 ? 's' : ''} sent or overdue</p>
            <p className='text-2xs text-gray-500 mt-0.5'>Track payment in Invoices. Follow up on overdue accounts.</p>
          </div>
          {/* Bucket 3: Paid this month */}
          <div className='rounded-xl border bg-green-500/8 dark:bg-green-900/15 border-green-500/25 dark:border-green-700/30 px-4 py-3'>
            <p className='text-2xs font-medium text-green-600 dark:text-green-400 uppercase tracking-wider mb-2'>Collected This Month</p>
            <p className='text-xl font-bold font-mono text-green-600 dark:text-green-400'>{fmtMoney(data.cashFlow.paidThisMonthFee)}</p>
            <p className='text-2xs text-gray-500 dark:text-gray-400 mt-1'>{data.cashFlow.paidThisMonthCount} invoice{data.cashFlow.paidThisMonthCount !== 1 ? 's' : ''} paid this calendar month</p>
            <p className='text-2xs text-gray-500 mt-0.5'>Cash received in your account or confirmed paid.</p>
          </div>
        </div>
        {(() => {
          const pipeline = data.cashFlow.pendingDeliveredFee + data.cashFlow.invoicesSentTotal + data.cashFlow.paidThisMonthFee
          if (pipeline === 0) return null
          return (
            <p className='text-2xs text-gray-400 mt-4'>
              Total pipeline this month: <span className='text-gray-200 font-mono font-semibold'>{fmtMoney(pipeline)}</span>
              {' '}(pending + outstanding + collected)
            </p>
          )
        })()}
      </div>

      {/* Weekly revenue */}
      <div className='bg-surface-700 rounded-xl border border-surface-400 p-5'>
        <Sec title='Weekly Revenue (last 12 weeks)' icon={<TrendingUp size={14} />} />
        {data.weeklyRevenue.length === 0
          ? <p className='text-sm text-gray-600 italic'>No paid invoices in the last 12 weeks.</p>
          : (
          <div className='space-y-2'>
            {data.weeklyRevenue.map(w => (
              <div key={w.week} className='flex items-center gap-3'>
                <p className='text-2xs text-gray-400 w-36 shrink-0 text-right'>{w.week_label}</p>
                <div className='flex-1 bg-surface-600 rounded-full h-5 overflow-hidden'>
                  <div
                    className='h-full bg-orange-600/70 rounded-full transition-all'
                    style={{ width: `${(w.dispatch_fee / maxWeeklyFee) * 100}%` }}
                  />
                </div>
                <p className='text-xs font-mono text-gray-300 w-20 shrink-0'>{fmtMoney(w.dispatch_fee)}</p>
                <p className='text-2xs text-gray-600 w-16 shrink-0'>{w.load_count} load{w.load_count !== 1 ? 's' : ''}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Monthly revenue */}
      <div className='bg-surface-700 rounded-xl border border-surface-400 p-5'>
        <Sec title='Monthly Revenue (last 6 months)' icon={<DollarSign size={14} />} />
        {data.monthlyRevenue.length === 0
          ? <p className='text-sm text-gray-600 italic'>No paid invoices in the last 6 months.</p>
          : (
          <div className='space-y-2'>
            {data.monthlyRevenue.map(m => (
              <div key={m.month} className='flex items-center gap-3'>
                <p className='text-2xs text-gray-400 w-20 shrink-0 text-right'>{m.month_label}</p>
                <div className='flex-1 bg-surface-600 rounded-full h-5 overflow-hidden'>
                  <div
                    className='h-full bg-green-600/70 rounded-full transition-all'
                    style={{ width: `${(m.dispatch_fee / maxMonthlyFee) * 100}%` }}
                  />
                </div>
                <p className='text-xs font-mono text-gray-300 w-20 shrink-0'>{fmtMoney(m.dispatch_fee)}</p>
                <p className='text-2xs text-gray-600 w-16 shrink-0'>{m.load_count} load{m.load_count !== 1 ? 's' : ''}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Broker summary */}
      <div className='bg-surface-700 rounded-xl border border-surface-400 p-5'>
        <Sec title='Broker Performance' icon={<Building2 size={14} />} />
        {data.brokerSummary.length === 0
          ? <p className='text-sm text-gray-600 italic'>No completed loads yet.</p>
          : (
          <div className='overflow-x-auto'>
            <table className='w-full text-xs'>
              <thead>
                <tr className='border-b border-surface-400'>
                  <th className='text-left text-2xs text-gray-400 uppercase tracking-wider pb-2'>Broker</th>
                  <th className='text-right text-2xs text-gray-400 uppercase tracking-wider pb-2'>Loads</th>
                  <th className='text-right text-2xs text-gray-400 uppercase tracking-wider pb-2'>Gross</th>
                  <th className='text-right text-2xs text-gray-400 uppercase tracking-wider pb-2'>Fee Earned</th>
                  <th className='text-right text-2xs text-gray-400 uppercase tracking-wider pb-2'>Avg RPM</th>
                  <th className='pb-2 w-32'></th>
                </tr>
              </thead>
              <tbody>
                {data.brokerSummary.map((b, i) => (
                  <tr key={i} className='border-b border-surface-600 last:border-0'>
                    <td className='py-2 text-gray-200 font-medium'>{b.broker_name}</td>
                    <td className='py-2 text-right text-gray-400 font-mono'>{b.load_count}</td>
                    <td className='py-2 text-right text-gray-400 font-mono'>{fmtMoney(b.total_gross)}</td>
                    <td className='py-2 text-right text-green-400 font-mono font-semibold'>{fmtMoney(b.total_fee)}</td>
                    <td className='py-2 text-right text-gray-400 font-mono'>{b.avg_rpm != null ? `$${b.avg_rpm.toFixed(2)}` : '—'}</td>
                    <td className='py-2 pl-3'>
                      <div className='w-full bg-surface-600 rounded-full h-1.5'>
                        <div className='h-full bg-orange-500/60 rounded-full' style={{ width: `${(b.total_fee / maxBrokerFee) * 100}%` }} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Invoice Aging */}
      <div className='bg-surface-700 rounded-xl border border-surface-400 p-5'>
        <Sec title='Accounts Receivable Aging' icon={<AlertCircle size={14} />} />
        {data.invoiceAging.length === 0
          ? <p className='text-sm text-gray-600 italic'>No outstanding invoices. All caught up.</p>
          : (
          <>
            {/* Bucket summary */}
            <div className='grid grid-cols-4 gap-3 mb-4'>
              {(['0-15','16-30','31-60','60+'] as const).map(b => {
                const rows = data.invoiceAging.filter(r => r.bucket === b)
                const total = rows.reduce((s, r) => s + r.amount, 0)
                return (
                  <div key={b} className={`rounded-lg border px-3 py-2.5 ${rows.length > 0 ? BUCKET_BG[b] : 'bg-surface-600/30 border-surface-400'}`}>
                    <p className={`text-2xs font-semibold uppercase tracking-wider mb-1 ${rows.length > 0 ? BUCKET_COLOR[b] : 'text-gray-600'}`}>{b} days</p>
                    <p className={`text-lg font-bold font-mono ${rows.length > 0 ? BUCKET_COLOR[b] : 'text-gray-700'}`}>{fmtMoney(total)}</p>
                    <p className='text-2xs text-gray-600 mt-0.5'>{rows.length} invoice{rows.length !== 1 ? 's' : ''}</p>
                  </div>
                )
              })}
            </div>
            {/* Line-by-line */}
            <div className='overflow-x-auto'>
              <table className='w-full text-xs'>
                <thead>
                  <tr className='border-b border-surface-400'>
                    <th className='text-left text-2xs text-gray-400 uppercase tracking-wider pb-2'>Invoice</th>
                    <th className='text-left text-2xs text-gray-400 uppercase tracking-wider pb-2'>Broker</th>
                    <th className='text-right text-2xs text-gray-400 uppercase tracking-wider pb-2'>Amount</th>
                    <th className='text-right text-2xs text-gray-400 uppercase tracking-wider pb-2'>Sent</th>
                    <th className='text-right text-2xs text-gray-400 uppercase tracking-wider pb-2'>Days Out</th>
                    <th className='text-left text-2xs text-gray-400 uppercase tracking-wider pb-2 pl-3'>Bucket</th>
                  </tr>
                </thead>
                <tbody>
                  {data.invoiceAging.map(r => (
                    <tr key={r.invoice_id} className='border-b border-surface-600 last:border-0'>
                      <td className='py-2 text-gray-400 font-mono'>#{r.invoice_id}</td>
                      <td className='py-2 text-gray-200 font-medium'>{r.broker_name}</td>
                      <td className='py-2 text-right text-gray-200 font-mono font-semibold'>{fmtMoney(r.amount)}</td>
                      <td className='py-2 text-right text-gray-500'>{r.sent_date ?? '—'}</td>
                      <td className={`py-2 text-right font-mono font-semibold ${BUCKET_COLOR[r.bucket]}`}>{r.days_out}d</td>
                      <td className='py-2 pl-3'>
                        <span className={`text-2xs px-1.5 py-0.5 rounded border font-medium ${BUCKET_BG[r.bucket]} ${BUCKET_COLOR[r.bucket]}`}>{r.bucket}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Lane Performance */}
      <div className='bg-surface-700 rounded-xl border border-surface-400 p-5'>
        <Sec title='Lane Performance' icon={<ArrowRight size={14} />} />
        <p className='text-2xs text-gray-600 mb-4'>Completed loads grouped by origin → destination state, sorted by average RPM. Identifies your strongest corridors.</p>
        {data.lanePerformance.length === 0
          ? <p className='text-sm text-gray-600 italic'>No completed loads with state data yet.</p>
          : (
          <div className='overflow-x-auto'>
            <table className='w-full text-xs'>
              <thead>
                <tr className='border-b border-surface-400'>
                  <th className='text-left text-2xs text-gray-400 uppercase tracking-wider pb-2'>Lane</th>
                  <th className='text-right text-2xs text-gray-400 uppercase tracking-wider pb-2'>Loads</th>
                  <th className='text-right text-2xs text-gray-400 uppercase tracking-wider pb-2'>Avg RPM</th>
                  <th className='text-right text-2xs text-gray-400 uppercase tracking-wider pb-2'>Best RPM</th>
                  <th className='text-right text-2xs text-gray-400 uppercase tracking-wider pb-2'>Fee Earned</th>
                </tr>
              </thead>
              <tbody>
                {data.lanePerformance.map((r, i) => (
                  <tr key={i} className='border-b border-surface-600 last:border-0'>
                    <td className='py-2 text-gray-200 font-medium flex items-center gap-1.5'>
                      <span>{r.origin_state}</span>
                      <ArrowRight size={10} className='text-gray-600' />
                      <span>{r.dest_state}</span>
                    </td>
                    <td className='py-2 text-right text-gray-400 font-mono'>{r.load_count}</td>
                    <td className={`py-2 text-right font-mono font-semibold ${rpmColor(r.avg_rpm)}`}>
                      {r.avg_rpm != null ? `$${r.avg_rpm.toFixed(2)}` : '—'}
                    </td>
                    <td className={`py-2 text-right font-mono ${rpmColor(r.best_rpm)}`}>
                      {r.best_rpm != null ? `$${r.best_rpm.toFixed(2)}` : '—'}
                    </td>
                    <td className='py-2 text-right text-green-400 font-mono'>{fmtMoney(r.total_fee)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* IFTA mileage */}
      <div className='bg-surface-700 rounded-xl border border-surface-400 p-5'>
        <Sec title='IFTA Mileage by State' icon={<MapPin size={14} />} />
        <p className='text-2xs text-gray-600 mb-4'>
          Miles are attributed to each load's destination state — an approximation for IFTA reference only.
          Consult your IFTA filing software for exact per-state mileage reporting.
        </p>
        {data.iftaByState.length === 0
          ? <p className='text-sm text-gray-600 italic'>No completed loads with mileage data.</p>
          : (
          <div className='grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2'>
            {data.iftaByState.map(r => (
              <div key={r.state} className='bg-surface-600 rounded-lg px-3 py-2'>
                <div className='flex items-center justify-between mb-1'>
                  <p className='text-xs font-bold text-gray-200'>{r.state}</p>
                  <p className='text-2xs text-gray-600'>{r.load_count} load{r.load_count !== 1 ? 's' : ''}</p>
                </div>
                <div className='w-full bg-surface-500 rounded-full h-1 mb-1'>
                  <div className='h-full bg-blue-500/60 rounded-full' style={{ width: `${(r.total_miles / maxMiles) * 100}%` }} />
                </div>
                <p className='text-xs font-mono text-blue-400'>{fmtNum(r.total_miles)} mi</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
