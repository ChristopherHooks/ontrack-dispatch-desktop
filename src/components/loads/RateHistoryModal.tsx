import { useState, useMemo } from 'react'
import { X, TrendingUp } from 'lucide-react'
import type { Load, Broker } from '../../types/models'

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY',
]

const fmt = (d: string | null) => { if (!d) return '—'; const [y,m,day]=d.split('-'); return `${m}/${day}/${y}` }
const fmtMoney = (v: number | null) => v != null ? '$' + v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'

interface Props {
  loads: Load[]
  brokers: Broker[]
  onClose: () => void
}

export function RateHistoryModal({ loads, brokers, onClose }: Props) {
  const [origin, setOrigin] = useState('')
  const [dest,   setDest]   = useState('')

  const brokerMap = useMemo(() => new Map(brokers.map(b => [b.id, b.name])), [brokers])

  const results = useMemo(() => {
    if (!origin && !dest) return []
    const completed = loads.filter(l => ['Delivered','Invoiced','Paid'].includes(l.status))
    return completed
      .filter(l =>
        (!origin || (l.origin_state ?? '').toUpperCase() === origin.toUpperCase()) &&
        (!dest   || (l.dest_state   ?? '').toUpperCase() === dest.toUpperCase())
      )
      .sort((a, b) => (b.delivery_date ?? '').localeCompare(a.delivery_date ?? ''))
  }, [loads, origin, dest])

  const stats = useMemo(() => {
    if (results.length === 0) return null
    const ratedLoads = results.filter(l => l.rate != null && l.miles != null && l.miles > 0)
    const avgRpm = ratedLoads.length > 0
      ? ratedLoads.reduce((s, l) => s + l.rate! / l.miles!, 0) / ratedLoads.length
      : null
    const avgRate = results.filter(l => l.rate != null).length > 0
      ? results.filter(l => l.rate != null).reduce((s, l) => s + l.rate!, 0) / results.filter(l => l.rate != null).length
      : null
    const best = ratedLoads.reduce<Load | null>((best, l) => {
      if (!best) return l
      return (l.rate! / l.miles!) > (best.rate! / best.miles!) ? l : best
    }, null)
    return { avgRpm, avgRate, count: results.length, best }
  }, [results])

  const sel = 'h-8 px-3 pr-7 text-xs bg-surface-700 border border-surface-400 rounded-lg text-gray-300 focus:outline-none focus:border-orange-600/50 appearance-none cursor-pointer'

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center'>
      <div className='absolute inset-0 bg-black/60 backdrop-blur-sm' onClick={onClose}/>
      <div className='relative w-[680px] max-h-[85vh] bg-surface-800 rounded-xl border border-surface-400 shadow-2xl flex flex-col overflow-hidden'>
        {/* Header */}
        <div className='flex items-center justify-between px-5 py-4 border-b border-surface-500'>
          <div className='flex items-center gap-2'>
            <TrendingUp size={16} className='text-orange-400'/>
            <h2 className='text-base font-semibold text-gray-100'>Rate History Lookup</h2>
          </div>
          <button onClick={onClose} className='p-1.5 rounded-lg hover:bg-surface-600 text-gray-500 hover:text-gray-300'><X size={16}/></button>
        </div>

        {/* Filters */}
        <div className='px-5 py-4 border-b border-surface-600 flex items-center gap-3'>
          <div className='flex items-center gap-2'>
            <span className='text-xs text-gray-500'>Origin</span>
            <div className='relative'>
              <select value={origin} onChange={e => setOrigin(e.target.value)} className={sel}>
                <option value=''>Any State</option>
                {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <span className='absolute right-2 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none text-xs'>&#8964;</span>
            </div>
          </div>
          <span className='text-gray-600 text-sm'>&#8594;</span>
          <div className='flex items-center gap-2'>
            <span className='text-xs text-gray-500'>Destination</span>
            <div className='relative'>
              <select value={dest} onChange={e => setDest(e.target.value)} className={sel}>
                <option value=''>Any State</option>
                {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <span className='absolute right-2 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none text-xs'>&#8964;</span>
            </div>
          </div>
          {(origin || dest) && (
            <button onClick={() => { setOrigin(''); setDest('') }} className='text-xs text-gray-600 hover:text-gray-400 underline ml-1'>Clear</button>
          )}
          <span className='ml-auto text-xs text-gray-600'>{results.length > 0 ? `${results.length} load${results.length !== 1 ? 's' : ''}` : ''}</span>
        </div>

        {/* Summary bar */}
        {stats && (
          <div className='px-5 py-3 border-b border-surface-600 grid grid-cols-3 gap-4 bg-surface-750'>
            <div>
              <p className='text-2xs text-gray-600 uppercase tracking-wider'>Avg Rate</p>
              <p className='text-sm font-mono font-semibold text-gray-200 mt-0.5'>{stats.avgRate != null ? fmtMoney(stats.avgRate) : '—'}</p>
            </div>
            <div>
              <p className='text-2xs text-gray-600 uppercase tracking-wider'>Avg RPM</p>
              <p className='text-sm font-mono font-semibold text-orange-400 mt-0.5'>{stats.avgRpm != null ? `$${stats.avgRpm.toFixed(2)}/mi` : '—'}</p>
            </div>
            <div>
              <p className='text-2xs text-gray-600 uppercase tracking-wider'>Best RPM</p>
              <p className='text-sm font-mono font-semibold text-green-400 mt-0.5'>
                {stats.best ? `$${(stats.best.rate! / stats.best.miles!).toFixed(2)}/mi` : '—'}
              </p>
              {stats.best && <p className='text-2xs text-gray-700 mt-0.5'>{brokerMap.get(stats.best.broker_id ?? -1) ?? '—'}</p>}
            </div>
          </div>
        )}

        {/* Results table */}
        <div className='flex-1 overflow-y-auto'>
          {!origin && !dest && (
            <div className='flex flex-col items-center justify-center h-48 text-gray-600'>
              <TrendingUp size={28} className='mb-2 text-gray-700'/>
              <p className='text-sm'>Select an origin or destination state to see rate history.</p>
            </div>
          )}
          {(origin || dest) && results.length === 0 && (
            <div className='flex flex-col items-center justify-center h-48 text-gray-600'>
              <p className='text-sm'>No completed loads found for this lane.</p>
            </div>
          )}
          {results.length > 0 && (
            <table className='w-full text-xs'>
              <thead className='sticky top-0 bg-surface-800 border-b border-surface-600'>
                <tr>
                  <th className='text-left px-5 py-2.5 text-2xs font-medium text-gray-600 uppercase tracking-wider'>Lane</th>
                  <th className='text-left px-3 py-2.5 text-2xs font-medium text-gray-600 uppercase tracking-wider'>Broker</th>
                  <th className='text-right px-3 py-2.5 text-2xs font-medium text-gray-600 uppercase tracking-wider'>Rate</th>
                  <th className='text-right px-3 py-2.5 text-2xs font-medium text-gray-600 uppercase tracking-wider'>Miles</th>
                  <th className='text-right px-3 py-2.5 text-2xs font-medium text-gray-600 uppercase tracking-wider'>RPM</th>
                  <th className='text-right px-5 py-2.5 text-2xs font-medium text-gray-600 uppercase tracking-wider'>Delivered</th>
                </tr>
              </thead>
              <tbody className='divide-y divide-surface-700'>
                {results.map(l => {
                  const rpm = l.rate != null && l.miles != null && l.miles > 0 ? l.rate / l.miles : null
                  const laneStr = [
                    [l.origin_city, l.origin_state].filter(Boolean).join(', ') || l.origin_state || '?',
                    [l.dest_city,   l.dest_state  ].filter(Boolean).join(', ') || l.dest_state   || '?',
                  ].join(' \u2192 ')
                  return (
                    <tr key={l.id} className='hover:bg-surface-700/40 transition-colors'>
                      <td className='px-5 py-3 text-gray-300'>{laneStr}</td>
                      <td className='px-3 py-3 text-gray-500'>{brokerMap.get(l.broker_id ?? -1) ?? '—'}</td>
                      <td className='px-3 py-3 text-right font-mono text-gray-300'>{fmtMoney(l.rate)}</td>
                      <td className='px-3 py-3 text-right text-gray-500'>{l.miles != null ? l.miles.toLocaleString() : '—'}</td>
                      <td className={`px-3 py-3 text-right font-mono font-semibold ${rpm == null ? 'text-gray-700' : rpm >= 2.5 ? 'text-green-400' : rpm >= 2.0 ? 'text-yellow-400' : 'text-red-400'}`}>
                        {rpm != null ? `$${rpm.toFixed(2)}` : '—'}
                      </td>
                      <td className='px-5 py-3 text-right text-gray-600'>{fmt(l.delivery_date)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
