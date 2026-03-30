import { useState, useEffect, useMemo } from 'react'
import { CheckCircle2, Circle } from 'lucide-react'
import type { Driver } from '../../types/models'

const STAGES = [
  { id: 'agreement',      label: 'Agreement Signed',    key: 'agreement'      },
  { id: 'coi',            label: 'COI Collected',       key: 'coi'            },
  { id: 'w9',             label: 'W-9 Collected',       key: 'w9'             },
  { id: 'broker-packets', label: 'Broker Packets Sent', key: 'broker-packets' },
  { id: 'rmis',           label: 'RMIS Verified',       key: 'rmis'           },
  { id: 'first-load',     label: 'First Load Ready',    key: 'first-load'     },
]

interface DriverProgress {
  driver: Driver
  checks: Record<string, boolean>
  stage:  number  // 0 = none completed, up to STAGES.length = all done
}

interface Props {
  drivers: Driver[]
  onSelectDriver: (d: Driver) => void
}

export function DriverOnboardingPipeline({ drivers, onSelectDriver }: Props) {
  const [progressMap, setProgressMap] = useState<Map<number, Record<string, boolean>>>(new Map())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const activeDrivers = drivers.filter(d => d.status === 'Active')
    if (activeDrivers.length === 0) { setLoading(false); return }
    Promise.all(
      activeDrivers.map(d =>
        window.api.settings.get(`carrierChecklist_${d.id}`)
          .then(raw => {
            let checks: Record<string, boolean> = {}
            try { if (raw) checks = JSON.parse(raw as string) } catch {}
            return { id: d.id, checks }
          })
      )
    ).then(results => {
      const map = new Map<number, Record<string, boolean>>()
      for (const { id, checks } of results) map.set(id, checks)
      setProgressMap(map)
      setLoading(false)
    })
  }, [drivers])

  const driverProgress: DriverProgress[] = useMemo(() => {
    return drivers
      .filter(d => d.status === 'Active')
      .map(d => {
        const checks = progressMap.get(d.id) ?? {}
        // Stage = number of consecutive stages completed from the start
        let stage = 0
        for (const s of STAGES) {
          if (checks[s.key]) stage++
          else break
        }
        return { driver: d, checks, stage }
      })
      .sort((a, b) => a.stage - b.stage)
  }, [drivers, progressMap])

  // Group drivers by their current stage
  const columns = useMemo(() => {
    const cols: DriverProgress[][] = STAGES.map(() => [])
    const complete: DriverProgress[] = []
    for (const dp of driverProgress) {
      if (dp.stage >= STAGES.length) {
        complete.push(dp)
      } else {
        cols[dp.stage].push(dp)
      }
    }
    return { cols, complete }
  }, [driverProgress])

  if (loading) {
    return <div className='text-gray-600 text-sm px-2 py-8 text-center'>Loading onboarding data...</div>
  }

  if (driverProgress.length === 0) {
    return <div className='text-gray-600 text-sm px-2 py-8 text-center'>No active drivers found.</div>
  }

  const STAGE_COLORS = [
    'border-gray-600 text-gray-500',
    'border-blue-600/40 text-blue-400',
    'border-yellow-600/40 text-yellow-400',
    'border-orange-600/40 text-orange-400',
    'border-purple-600/40 text-purple-400',
    'border-green-600/40 text-green-400',
  ]

  return (
    <div className='overflow-x-auto pb-2'>
      <div className='flex gap-3 min-w-max'>
        {STAGES.map((stage, idx) => {
          const colDrivers = columns.cols[idx]
          return (
            <div key={stage.id} className='w-52 flex-shrink-0'>
              <div className={`flex items-center gap-2 mb-2 px-2 py-1.5 rounded-lg border bg-surface-800 ${STAGE_COLORS[idx]}`}>
                <span className='text-2xs font-semibold uppercase tracking-wider flex-1'>{stage.label}</span>
                <span className='text-2xs font-mono bg-surface-700 px-1.5 py-0.5 rounded'>{colDrivers.length}</span>
              </div>
              <div className='space-y-2'>
                {colDrivers.map(dp => (
                  <DriverCard key={dp.driver.id} dp={dp} onClick={() => onSelectDriver(dp.driver)} />
                ))}
                {colDrivers.length === 0 && (
                  <div className='h-16 border border-dashed border-surface-600 rounded-lg flex items-center justify-center'>
                    <span className='text-2xs text-gray-700'>—</span>
                  </div>
                )}
              </div>
            </div>
          )
        })}

        {/* Completed column */}
        <div className='w-52 flex-shrink-0'>
          <div className='flex items-center gap-2 mb-2 px-2 py-1.5 rounded-lg border border-green-700/40 bg-green-900/10 text-green-400'>
            <span className='text-2xs font-semibold uppercase tracking-wider flex-1'>Ready to Dispatch</span>
            <span className='text-2xs font-mono bg-surface-700 px-1.5 py-0.5 rounded'>{columns.complete.length}</span>
          </div>
          <div className='space-y-2'>
            {columns.complete.map(dp => (
              <DriverCard key={dp.driver.id} dp={dp} onClick={() => onSelectDriver(dp.driver)} complete />
            ))}
            {columns.complete.length === 0 && (
              <div className='h-16 border border-dashed border-surface-600 rounded-lg flex items-center justify-center'>
                <span className='text-2xs text-gray-700'>—</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function DriverCard({ dp, onClick, complete = false }: { dp: DriverProgress; onClick: () => void; complete?: boolean }) {
  return (
    <button onClick={onClick}
      className={`w-full text-left p-3 rounded-lg border transition-colors hover:bg-surface-600 ${
        complete ? 'bg-green-900/10 border-green-700/30' : 'bg-surface-700 border-surface-500'
      }`}
    >
      <p className='text-xs font-semibold text-gray-200 truncate'>{dp.driver.name}</p>
      {dp.driver.company && <p className='text-2xs text-gray-600 truncate mt-0.5'>{dp.driver.company}</p>}
      <div className='flex items-center gap-1 mt-2 flex-wrap'>
        {STAGES.map(s => (
          <span key={s.key} title={s.label}>
            {dp.checks[s.key]
              ? <CheckCircle2 size={10} className='text-green-400'/>
              : <Circle size={10} className='text-gray-700'/>
            }
          </span>
        ))}
        <span className='text-2xs text-gray-700 ml-1'>{dp.stage}/{STAGES.length}</span>
      </div>
    </button>
  )
}
