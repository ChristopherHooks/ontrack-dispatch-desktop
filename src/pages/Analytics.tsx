import { useEffect, useState } from 'react'
import { BarChart3, TrendingUp, Truck, DollarSign, Users, Package } from 'lucide-react'
import type { AnalyticsStats } from '../types/models'
import { EmptyState } from '../components/ui/EmptyState'

const PIPELINE_STAGES: Array<{ status: string; label: string; chipColor: string; barColor: string }> = [
  { status: 'New',        label: 'New',       chipColor: 'text-blue-400',   barColor: 'bg-blue-500'   },
  { status: 'Contacted',  label: 'Contacted', chipColor: 'text-yellow-400', barColor: 'bg-yellow-500' },
  { status: 'Interested', label: 'Interested',chipColor: 'text-orange-400', barColor: 'bg-orange-500' },
  { status: 'Signed',     label: 'Converted', chipColor: 'text-green-400',  barColor: 'bg-green-500'  },
  { status: 'Rejected',   label: 'Rejected',  chipColor: 'text-gray-500',   barColor: 'bg-gray-600'   },
]

const EMPTY: AnalyticsStats = {
  leadConversion:    { total: 0, signed: 0, rate: 0 },
  leadsByStatus:     {},
  driversSigned:     { thisMonth: 0, total: 0 },
  avgRpm:            { value: 0, count: 0 },
  revenueByDriver:   [],
  brokerReliability: [],
  laneProfitability: [],
  revenueByMonth:    [],
}

function fmt$(n: number) { return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) }
function fmtRpm(n: number) { return '$' + n.toFixed(2) }
function pct(n: number) { return n + '%' }

function Bar({ value, max, color = 'bg-orange-500' }: { value: number; max: number; color?: string }) {
  const w = max > 0 ? Math.max(2, Math.round((value / max) * 100)) : 0
  return (
    <div className='flex-1 bg-surface-600 rounded-full h-1.5'>
      <div className={color + ' h-1.5 rounded-full transition-all'} style={{ width: w + '%' }} />
    </div>
  )
}

export function Analytics() {
  const [stats, setStats]   = useState<AnalyticsStats>(EMPTY)
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState('')

  useEffect(() => {
    window.api.analytics.stats()
      .then(s => { setStats(s); setLoading(false) })
      .catch(() => { setError('Failed to load analytics.'); setLoading(false) })
  }, [])

  const noData = !loading && stats.avgRpm.count === 0 && stats.leadConversion.total === 0

  if (loading) return (
    <div className='flex items-center justify-center h-64'>
      <p className='text-sm text-gray-400'>Loading analytics...</p>
    </div>
  )
  if (error) return (
    <div className='flex items-center justify-center h-64'>
      <p className='text-sm text-red-400'>{error}</p>
    </div>
  )

  return (
    <div className='space-y-6 max-w-6xl animate-fade-in'>
      <div>
        <h1 className='text-xl font-bold text-gray-100'>Analytics</h1>
        <p className='text-sm text-gray-500 mt-1'>Revenue, lead conversion, lane profitability, and broker performance</p>
      </div>

      {noData && (
        <div className='bg-surface-700 rounded-xl border border-surface-400 p-6'>
          <EmptyState icon={<BarChart3 size={36}/>} title='No data yet'
            description='Add loads, drivers, and leads to start seeing analytics.' />
        </div>
      )}

      {/* KPI Row */}
      <div className='grid grid-cols-2 lg:grid-cols-4 gap-4'>
        <KpiCard icon={<TrendingUp size={18}/>} label='Lead Conversion' value={pct(stats.leadConversion.rate)}
          sub={stats.leadConversion.signed + ' of ' + stats.leadConversion.total + ' leads signed'} accent />
        <KpiCard icon={<Truck size={18}/>} label='Total Drivers' value={String(stats.driversSigned.total)}
          sub={stats.driversSigned.thisMonth + ' added this month'} />
        <KpiCard icon={<DollarSign size={18}/>} label='Avg RPM' value={fmtRpm(stats.avgRpm.value)}
          sub={'across ' + stats.avgRpm.count + ' loads'} accent={stats.avgRpm.value >= 2.5} />
        <KpiCard icon={<Package size={18}/>} label='Total Revenue' value={fmt$(stats.revenueByDriver.reduce((a,d)=>a+d.revenue,0))}
          sub={'from completed loads'} />
      </div>

      {/* Lead Pipeline */}
      {stats.leadConversion.total > 0 && (
        <Section title='Lead Pipeline' icon={<TrendingUp size={15}/>}>
          <div className='grid grid-cols-5 gap-2 mb-5'>
            {PIPELINE_STAGES.map(({ status, label, chipColor }) => (
              <div key={status} className='bg-surface-600 rounded-lg p-2.5 text-center border border-surface-400'>
                <p className={'text-xl font-bold ' + chipColor}>{stats.leadsByStatus[status] ?? 0}</p>
                <p className='text-2xs text-gray-500 mt-0.5'>{label}</p>
              </div>
            ))}
          </div>
          <div className='space-y-2.5'>
            {PIPELINE_STAGES.map(({ status, label, barColor }) => {
              const count = stats.leadsByStatus[status] ?? 0
              const pctVal = stats.leadConversion.total > 0
                ? Math.round(count / stats.leadConversion.total * 100) : 0
              return (
                <div key={status} className='flex items-center gap-3'>
                  <span className='text-xs text-gray-400 w-20 shrink-0'>{label}</span>
                  <Bar value={count} max={stats.leadConversion.total} color={barColor} />
                  <span className='text-xs text-gray-300 w-6 text-right shrink-0'>{count}</span>
                  <span className='text-2xs text-gray-600 w-8 text-right shrink-0'>{pctVal}%</span>
                </div>
              )
            })}
          </div>
        </Section>
      )}

      {/* Revenue by Month */}
      {stats.revenueByMonth.length > 0 && (
        <Section title='Revenue by Month' icon={<BarChart3 size={15}/>}>
          {(() => {
            const maxRev = Math.max(...stats.revenueByMonth.map(m => m.revenue), 1)
            return (
              <div className='space-y-3'>
                {stats.revenueByMonth.map(m => (
                  <div key={m.month} className='flex items-center gap-3'>
                    <span className='text-xs text-gray-500 w-16 shrink-0'>{m.month}</span>
                    <Bar value={m.revenue} max={maxRev} color='bg-orange-500' />
                    <span className='text-xs text-gray-300 w-24 text-right shrink-0'>{fmt$(m.revenue)}</span>
                    <span className='text-2xs text-gray-600 w-16 text-right shrink-0'>{m.loads} load{m.loads !== 1 ? 's' : ''}</span>
                  </div>
                ))}
              </div>
            )
          })()}
        </Section>
      )}

      {/* Revenue by Driver */}
      {stats.revenueByDriver.length > 0 && (
        <Section title='Revenue by Driver' icon={<Truck size={15}/>}>
          {(() => {
            const maxRev = Math.max(...stats.revenueByDriver.map(d => d.revenue), 1)
            return (
              <div className='space-y-2'>
                {stats.revenueByDriver.map(d => (
                  <div key={d.driver_id} className='flex items-center gap-3'>
                    <span className='text-xs text-gray-400 w-32 truncate shrink-0'>{d.name}</span>
                    <Bar value={d.revenue} max={maxRev} color='bg-green-500' />
                    <span className='text-xs text-gray-300 w-24 text-right shrink-0'>{fmt$(d.revenue)}</span>
                    <span className='text-2xs text-gray-600 w-14 text-right shrink-0'>{d.loads} loads</span>
                  </div>
                ))}
              </div>
            )
          })()}
        </Section>
      )}

      <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
        {/* Lane Profitability */}
        {stats.laneProfitability.length > 0 && (
          <Section title='Top Lanes by Revenue' icon={<Package size={15}/>}>
            <div className='space-y-1'>
              <div className='grid grid-cols-4 gap-2 px-2 pb-1 border-b border-surface-400'>
                <span className='text-2xs text-gray-600 col-span-2'>Lane</span>
                <span className='text-2xs text-gray-600 text-right'>Loads</span>
                <span className='text-2xs text-gray-600 text-right'>Avg RPM</span>
              </div>
              {stats.laneProfitability.slice(0, 8).map((l, i) => (
                <div key={i} className='grid grid-cols-4 gap-2 px-2 py-1 rounded hover:bg-surface-600/50'>
                  <span className='text-xs text-gray-300 col-span-2'>{l.origin_state} &#8594; {l.dest_state}</span>
                  <span className='text-xs text-gray-400 text-right'>{l.loads}</span>
                  <span className='text-xs text-orange-400 text-right font-mono'>{fmtRpm(l.avgRpm ?? 0)}</span>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Broker Reliability */}
        {stats.brokerReliability.length > 0 && (
          <Section title='Broker Volume' icon={<Users size={15}/>}>
            <div className='space-y-1'>
              <div className='grid grid-cols-4 gap-2 px-2 pb-1 border-b border-surface-400'>
                <span className='text-2xs text-gray-600 col-span-2'>Broker</span>
                <span className='text-2xs text-gray-600 text-right'>Loads</span>
                <span className='text-2xs text-gray-600 text-right'>Avg Rate</span>
              </div>
              {stats.brokerReliability.slice(0, 8).map(b => (
                <div key={b.broker_id} className='grid grid-cols-4 gap-2 px-2 py-1 rounded hover:bg-surface-600/50'>
                  <span className='text-xs text-gray-300 truncate col-span-2'>{b.name}</span>
                  <span className='text-xs text-gray-400 text-right'>{b.loads}</span>
                  <span className='text-xs text-gray-300 text-right font-mono'>{fmt$(Math.round(b.avgRate ?? 0))}</span>
                </div>
              ))}
            </div>
          </Section>
        )}
      </div>
    </div>
  )
}

function KpiCard({ icon, label, value, sub, accent=false }: { icon: React.ReactNode; label: string; value: string; sub: string; accent?: boolean }) {
  return (
    <div className={'bg-surface-700 rounded-xl border p-4 shadow-card hover:shadow-card-hover transition-shadow ' + (accent ? 'border-orange-600/40' : 'border-surface-400')}>
      <div className={'mb-2 ' + (accent ? 'text-orange-500' : 'text-gray-500')}>{icon}</div>
      <p className='text-2xl font-bold text-gray-100'>{value}</p>
      <p className='text-xs text-gray-500 mt-0.5'>{label}</p>
      <p className='text-2xs text-gray-600 mt-1'>{sub}</p>
    </div>
  )
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className='bg-surface-700 rounded-xl border border-surface-400 p-5 shadow-card'>
      <div className='flex items-center gap-2 mb-4 pb-3 border-b border-surface-400'>
        <span className='text-orange-500'>{icon}</span>
        <h2 className='text-sm font-semibold text-gray-200'>{title}</h2>
      </div>
      {children}
    </div>
  )
}
