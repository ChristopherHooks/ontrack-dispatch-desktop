import { useState, useEffect, useMemo } from 'react'
import type { Driver, Load } from '../../types/models'

const DAYS = 7
const today = () => {
  const d = new Date(); d.setHours(0, 0, 0, 0); return d
}
function addDays(d: Date, n: number): Date {
  const r = new Date(d); r.setDate(r.getDate() + n); return r
}
function isoDate(d: Date): string { return d.toISOString().slice(0, 10) }
const fmtShort = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
const DOW = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

interface Props {
  drivers: Driver[]
}

export function DriverAvailabilityCalendar({ drivers }: Props) {
  const [loads, setLoads] = useState<Load[]>([])
  const [weekOffset, setWeekOffset] = useState(0)

  useEffect(() => {
    window.api.loads.list().then(setLoads)
  }, [])

  const weekStart = useMemo(() => {
    const base = today()
    base.setDate(base.getDate() + weekOffset * 7)
    return base
  }, [weekOffset])

  const days = useMemo(() =>
    Array.from({ length: DAYS }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  )

  const activeDrivers = useMemo(() =>
    drivers.filter(d => d.status === 'Active').sort((a,b) => a.name.localeCompare(b.name)),
    [drivers]
  )

  // For each driver, find their active or upcoming load
  function getDriverLoad(driverId: number): Load | null {
    const active = loads.filter(l =>
      l.driver_id === driverId &&
      ['Booked','Picked Up','In Transit'].includes(l.status)
    ).sort((a,b) => (a.delivery_date ?? '').localeCompare(b.delivery_date ?? ''))
    return active[0] ?? null
  }

  function getDayStatus(driverId: number, day: Date): 'on-load' | 'available' | 'delivering' | 'off' {
    const dl = getDriverLoad(driverId)
    if (!dl) return 'available'
    const dayIso = isoDate(day)
    const pickup   = dl.pickup_date   ?? ''
    const delivery = dl.delivery_date ?? ''
    if (dayIso >= pickup && dayIso <= delivery) return 'on-load'
    if (dayIso === delivery) return 'delivering'
    return 'available'
  }

  const todayIso = isoDate(today())

  return (
    <div className='bg-surface-800 border border-surface-400 rounded-xl overflow-hidden'>
      {/* Header */}
      <div className='flex items-center justify-between px-4 py-3 border-b border-surface-600'>
        <h3 className='text-sm font-semibold text-gray-200'>Driver Availability — 7-Day View</h3>
        <div className='flex items-center gap-2'>
          <button onClick={() => setWeekOffset(0)} className='text-2xs text-gray-600 hover:text-orange-400 px-2 py-1 rounded hover:bg-surface-600 transition-colors'>Today</button>
          <button onClick={() => setWeekOffset(v => v - 1)} className='text-xs text-gray-500 hover:text-gray-300 px-2 py-1 rounded hover:bg-surface-600 transition-colors'>&#8592;</button>
          <span className='text-xs text-gray-400'>{fmtShort(weekStart)} – {fmtShort(addDays(weekStart, 6))}</span>
          <button onClick={() => setWeekOffset(v => v + 1)} className='text-xs text-gray-500 hover:text-gray-300 px-2 py-1 rounded hover:bg-surface-600 transition-colors'>&#8594;</button>
        </div>
      </div>

      {activeDrivers.length === 0 && (
        <div className='px-6 py-8 text-center text-gray-600 text-sm'>No active drivers.</div>
      )}

      {activeDrivers.length > 0 && (
        <div className='overflow-x-auto'>
          <table className='w-full min-w-[640px]'>
            <thead>
              <tr className='border-b border-surface-600'>
                <th className='text-left px-4 py-2.5 text-2xs font-medium text-gray-600 uppercase tracking-wider w-36'>Driver</th>
                {days.map(d => {
                  const isToday = isoDate(d) === todayIso
                  return (
                    <th key={d.toISOString()} className={`px-2 py-2.5 text-center text-2xs font-medium uppercase tracking-wider ${isToday ? 'text-orange-400' : 'text-gray-600'}`}>
                      <div>{DOW[d.getDay()]}</div>
                      <div className={`text-xs font-semibold mt-0.5 ${isToday ? 'text-orange-400' : 'text-gray-400'}`}>{d.getDate()}</div>
                    </th>
                  )
                })}
                <th className='text-left px-4 py-2.5 text-2xs font-medium text-gray-600 uppercase tracking-wider'>Status / Next Avail.</th>
              </tr>
            </thead>
            <tbody className='divide-y divide-surface-700'>
              {activeDrivers.map(driver => {
                const currentLoad = getDriverLoad(driver.id)
                const deliveryIso = currentLoad?.delivery_date ?? null
                const nextAvail   = deliveryIso
                  ? addDays(new Date(deliveryIso + 'T00:00:00'), 1)
                  : null
                const isAvailNow  = !currentLoad

                return (
                  <tr key={driver.id} className='hover:bg-surface-700/30 transition-colors'>
                    <td className='px-4 py-2.5'>
                      <p className='text-xs font-medium text-gray-200 truncate max-w-[120px]'>{driver.name}</p>
                      {driver.home_base && <p className='text-2xs text-gray-600 truncate'>{driver.home_base}</p>}
                    </td>
                    {days.map(d => {
                      const status = getDayStatus(driver.id, d)
                      const isToday = isoDate(d) === todayIso
                      const cell =
                        status === 'on-load'    ? 'bg-orange-500/20 border-orange-500/30' :
                        status === 'delivering' ? 'bg-yellow-500/20 border-yellow-500/30' :
                                                  'bg-green-500/10 border-green-500/20'
                      return (
                        <td key={d.toISOString()} className='px-1 py-2.5'>
                          <div className={`mx-1 h-7 rounded border flex items-center justify-center ${cell} ${isToday ? 'ring-1 ring-orange-500/30' : ''}`}>
                            {status === 'on-load'    && <span className='text-2xs text-orange-400 font-medium'>On Load</span>}
                            {status === 'delivering' && <span className='text-2xs text-yellow-400 font-medium'>Delivering</span>}
                            {status === 'available'  && <span className='text-2xs text-green-400 font-medium'>Open</span>}
                          </div>
                        </td>
                      )
                    })}
                    <td className='px-4 py-2.5'>
                      {isAvailNow ? (
                        <span className='text-2xs font-semibold text-green-400'>Available Now</span>
                      ) : currentLoad ? (
                        <div>
                          <p className='text-2xs text-gray-400 truncate max-w-[140px]'>
                            {[currentLoad.origin_state, currentLoad.dest_state].filter(Boolean).join(' \u2192 ')}
                          </p>
                          {nextAvail && (
                            <p className='text-2xs text-gray-600 mt-0.5'>
                              Avail {fmtShort(nextAvail)}
                            </p>
                          )}
                        </div>
                      ) : null}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Legend */}
      <div className='flex items-center gap-4 px-4 py-2 border-t border-surface-700'>
        <div className='flex items-center gap-1.5'>
          <div className='w-3 h-3 rounded bg-green-500/20 border border-green-500/30'/>
          <span className='text-2xs text-gray-600'>Open</span>
        </div>
        <div className='flex items-center gap-1.5'>
          <div className='w-3 h-3 rounded bg-orange-500/20 border border-orange-500/30'/>
          <span className='text-2xs text-gray-600'>On Load</span>
        </div>
        <div className='flex items-center gap-1.5'>
          <div className='w-3 h-3 rounded bg-yellow-500/20 border border-yellow-500/30'/>
          <span className='text-2xs text-gray-600'>Delivering</span>
        </div>
      </div>
    </div>
  )
}
