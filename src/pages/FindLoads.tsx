import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FileSpreadsheet, Loader2, AlertCircle, ArrowRight,
  CheckCircle2, XCircle, ChevronDown, ChevronUp, Plus,
  Phone, TrendingUp, Globe, Radio, MapPin,
} from 'lucide-react'
import type { Driver, Load, Broker } from '../types/models'
import type { ScoredLoad, ParseScreenshotResult } from '../types/global'

// ---------------------------------------------------------------------------
// Formatters
// ---------------------------------------------------------------------------

function fmt$(v: number | null) { return v != null ? '$' + v.toLocaleString() : '—' }
function fmtRpm(v: number | null) { return v != null ? '$' + v.toFixed(2) : '—' }
function fmtN(v: number | null)   { return v != null ? v.toLocaleString() : '—' }

function route(load: ScoredLoad) {
  const o = [load.origin_city, load.origin_state].filter(Boolean).join(', ') || '—'
  const d = [load.dest_city,   load.dest_state  ].filter(Boolean).join(', ') || '—'
  return { o, d }
}

function marginColor(v: number | null) {
  if (v == null)   return 'text-gray-500'
  if (v >= 1000)   return 'text-green-400'
  if (v >= 600)    return 'text-orange-400'
  if (v >= 300)    return 'text-yellow-400'
  return 'text-red-400'
}

function rpmColor(v: number | null) {
  if (v == null)  return 'text-gray-500'
  if (v >= 3.0)   return 'text-green-400'
  if (v >= 2.50)  return 'text-orange-400'
  if (v >= 2.0)   return 'text-yellow-400'
  return 'text-red-400'
}

// ---------------------------------------------------------------------------
// Best First Call card (top 3)
// ---------------------------------------------------------------------------

const CALL_BADGE = ['', 'bg-yellow-500', 'bg-gray-400', 'bg-orange-700'] as const

type BrokerIntelMap = Map<string, { avgRpm: number | null; loadCount: number; flag: string }>

function BrokerIntelBadge({ company, intel }: { company: string | null | undefined; intel: BrokerIntelMap }) {
  if (!company) return null
  const row = intel.get(company.toLowerCase())
  if (!row) return null
  const flagWarn = row.flag === 'Avoid' || row.flag === 'Blacklisted' || row.flag === 'Slow Pay'
  return (
    <div className='flex items-center gap-1.5 flex-wrap'>
      {row.loadCount > 0 && row.avgRpm != null && (
        <span className='text-2xs text-gray-500'>
          Our avg <span className='text-gray-300 font-mono'>${row.avgRpm.toFixed(2)}/mi</span>
          <span className='text-gray-700'> ({row.loadCount} loads)</span>
        </span>
      )}
      {row.loadCount === 0 && (
        <span className='text-2xs text-gray-700'>No history</span>
      )}
      {flagWarn && (
        <span className={`text-2xs px-1.5 py-0 rounded border ${
          row.flag === 'Avoid' || row.flag === 'Blacklisted' ? 'border-red-700/40 text-red-400' : 'border-yellow-700/40 text-yellow-500'
        }`}>{row.flag}</span>
      )}
    </div>
  )
}

function FirstCallCard({ load, onAdd, brokerIntel }: { load: ScoredLoad; onAdd: (l: ScoredLoad) => void; brokerIntel: BrokerIntelMap }) {
  const { o, d } = route(load)
  const badge = CALL_BADGE[load.first_call_rank ?? 0] ?? 'bg-gray-600'
  return (
    <div className='flex-1 min-w-[220px] rounded-xl border border-surface-400 bg-surface-700 p-4 space-y-2.5'>
      {/* Rank + call label */}
      <div className='flex items-center justify-between'>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full text-white ${badge}`}>
          Call #{load.first_call_rank}
        </span>
        <button
          onClick={() => onAdd(load)}
          className='flex items-center gap-1 text-2xs px-2 py-0.5 rounded-full bg-orange-600 hover:bg-orange-500 text-white border border-orange-500 font-medium transition-colors'
        >
          <Plus size={9} /> Add
        </button>
      </div>

      {/* Route */}
      <div className='flex items-center gap-1 text-sm'>
        <span className='text-gray-200 font-medium'>{o}</span>
        <ArrowRight size={12} className='text-gray-500 shrink-0' />
        <span className='text-gray-400'>{d}</span>
      </div>

      {/* Financials grid */}
      <div className='grid grid-cols-2 gap-x-4 gap-y-1 text-xs'>
        <div>
          <span className='text-gray-600 uppercase tracking-wide text-2xs'>Rate</span>
          <p className='text-gray-200 font-semibold'>{fmt$(load.rate)}</p>
        </div>
        <div>
          <span className='text-gray-600 uppercase tracking-wide text-2xs'>Est. Margin</span>
          <p className={`font-semibold ${marginColor(load.est_margin)}`}>{fmt$(load.est_margin)}</p>
        </div>
        <div>
          <span className='text-gray-600 uppercase tracking-wide text-2xs'>All-in RPM</span>
          <p className={`font-mono font-semibold ${rpmColor(load.all_in_rpm)}`}>{fmtRpm(load.all_in_rpm)}</p>
        </div>
        <div>
          <span className='text-gray-600 uppercase tracking-wide text-2xs'>DH / Miles</span>
          <p className='text-gray-400'>
            {load.origin_dh != null ? `${load.origin_dh}` : '?'} / {fmtN(load.miles)}
          </p>
        </div>
      </div>

      {/* Negotiation target */}
      {load.negotiation_target != null && (
        <div className='rounded-lg bg-surface-600 border border-surface-400 px-3 py-1.5 text-xs'>
          <span className='text-gray-500'>Negotiate to </span>
          <span className='text-orange-300 font-semibold'>{fmt$(load.negotiation_target)}</span>
          <span className='text-gray-600'> for $2.75 all-in</span>
        </div>
      )}

      {/* Broker + pickup */}
      <div className='space-y-0.5'>
        <div className='flex items-center justify-between text-2xs text-gray-600'>
          <span className='truncate max-w-[120px]'>{load.company ?? '—'}</span>
          <span>{load.pickup_date ?? '—'}</span>
        </div>
        <BrokerIntelBadge company={load.company} intel={brokerIntel} />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Full ranked load row (Top 5 table)
// ---------------------------------------------------------------------------

function LoadRow({ load, onAdd, brokerIntel }: { load: ScoredLoad; onAdd: (l: ScoredLoad) => void; brokerIntel: BrokerIntelMap }) {
  const [expanded, setExpanded] = useState(false)
  const { o, d } = route(load)

  return (
    <>
      <tr className='border-b border-surface-600 last:border-0 hover:bg-surface-700 transition-colors'>
        {/* Rank */}
        <td className='pl-4 pr-2 py-2.5 text-xs font-bold text-gray-400'>{load.rank}</td>

        {/* Route */}
        <td className='pr-3 py-2.5'>
          <span className='flex items-center gap-1 text-xs'>
            <span className='text-gray-300'>{o}</span>
            <ArrowRight size={9} className='text-gray-600 shrink-0' />
            <span className='text-gray-400'>{d}</span>
          </span>
        </td>

        {/* Rate */}
        <td className='pr-3 py-2.5 text-xs font-semibold text-gray-200'>{fmt$(load.rate)}</td>

        {/* Loaded RPM */}
        <td className='pr-3 py-2.5 text-xs font-mono text-gray-500'>{fmtRpm(load.loaded_rpm)}</td>

        {/* All-in RPM */}
        <td className={`pr-3 py-2.5 text-xs font-mono font-semibold ${rpmColor(load.all_in_rpm)}`}>
          {fmtRpm(load.all_in_rpm)}
        </td>

        {/* Est Margin */}
        <td className={`pr-3 py-2.5 text-xs font-semibold ${marginColor(load.est_margin)}`}>
          {fmt$(load.est_margin)}
        </td>

        {/* Nego target */}
        <td className='pr-3 py-2.5 text-xs text-orange-400'>
          {load.negotiation_target != null ? fmt$(load.negotiation_target) : ''}
        </td>

        {/* DH */}
        <td className='pr-3 py-2.5 text-xs text-gray-500'>
          {load.origin_dh != null ? `${load.origin_dh}mi` : '—'}
        </td>

        {/* Miles */}
        <td className='pr-3 py-2.5 text-xs text-gray-500'>{fmtN(load.miles)}mi</td>

        {/* Broker */}
        <td className='pr-3 py-2.5 text-xs text-gray-400 max-w-[150px]'>
          <span className='truncate block'>{load.company ?? '—'}</span>
          <BrokerIntelBadge company={load.company} intel={brokerIntel} />
        </td>

        {/* Date */}
        <td className='pr-3 py-2.5 text-xs text-gray-600'>{load.pickup_date ?? '—'}</td>

        {/* Actions */}
        <td className='pr-3 py-2.5'>
          <div className='flex items-center gap-1'>
            <button
              onClick={() => onAdd(load)}
              className='flex items-center gap-1 text-2xs px-2 py-0.5 rounded-full bg-orange-600 hover:bg-orange-500 text-white border border-orange-500 font-medium transition-colors'
            >
              <Plus size={9} /> Add
            </button>
            <button
              onClick={() => setExpanded(e => !e)}
              className='p-1 rounded text-gray-600 hover:text-gray-300 transition-colors'
            >
              {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
          </div>
        </td>
      </tr>

      {expanded && (
        <tr>
          <td colSpan={12} className='pl-8 pr-4 pb-3 pt-0'>
            <div className='flex flex-wrap gap-2 items-center'>
              {load.reasons.map((r, i) => (
                <span key={i} className='text-2xs px-2 py-0.5 rounded-full bg-surface-600 text-gray-400 border border-surface-500'>
                  {r}
                </span>
              ))}
              {load.weight != null && (
                <span className='text-2xs text-gray-600'>{fmtN(load.weight)} lbs</span>
              )}
              {load.length_ft != null && (
                <span className='text-2xs text-gray-600'>{load.length_ft}ft load</span>
              )}
              {load.d2p != null && (
                <span className='text-2xs text-gray-600'>D2P {load.d2p}d</span>
              )}
              {load.equip && (
                <span className='text-2xs text-gray-600'>{load.equip}{load.mode ? ` / ${load.mode}` : ''}</span>
              )}
              {load.all_in_miles != null && (
                <span className='text-2xs text-gray-600'>{fmtN(load.all_in_miles)}mi all-in</span>
              )}
              {load.est_cost != null && (
                <span className='text-2xs text-gray-600'>Est. cost {fmt$(load.est_cost)}</span>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

// Compute avg RPM per broker name from completed loads
function buildBrokerIntel(brokers: Broker[], loads: Load[]): Map<string, { avgRpm: number | null; loadCount: number; flag: string }> {
  const map = new Map<string, { avgRpm: number | null; loadCount: number; flag: string }>()
  for (const b of brokers) {
    const key = b.name.toLowerCase()
    const bLoads = loads.filter(l => l.broker_id === b.id && ['Delivered','Invoiced','Paid'].includes(l.status))
    const rpmLoads = bLoads.filter(l => l.rate != null && l.miles != null && l.miles > 0)
    const avgRpm = rpmLoads.length > 0
      ? rpmLoads.reduce((s, l) => s + l.rate! / l.miles!, 0) / rpmLoads.length
      : null
    map.set(key, { avgRpm, loadCount: bLoads.length, flag: b.flag })
  }
  return map
}

export function FindLoads() {
  const navigate = useNavigate()
  const [drivers,     setDrivers    ] = useState<Driver[]>([])
  const [brokers,     setBrokers    ] = useState<Broker[]>([])
  const [allLoads,    setAllLoads   ] = useState<Load[]>([])
  const [driverId,    setDriverId   ] = useState<number | null>(null)
  const [cpm,         setCpm        ] = useState<number>(0.75)
  const [loading,     setLoading    ] = useState(false)
  const [result,      setResult     ] = useState<ParseScreenshotResult | null>(null)
  const [error,       setError      ] = useState<string | null>(null)
  const [showRejected,   setShowRejected]    = useState(false)
  const [browserListening, setBrowserListening] = useState(false)
  const [dropCity, setDropCity] = useState<string | null>(null)
  const lastSeqRef = useRef(0)

  useEffect(() => {
    window.api.drivers.list('Active').then(setDrivers)
    Promise.all([window.api.brokers.list(), window.api.loads.list()])
      .then(([b, l]) => { setBrokers(b); setAllLoads(l) })
      .catch(() => {})

    // Restore last import immediately on mount so results survive tab navigation
    window.api.loads.getLastBrowserImport().then(({ seq, payload }) => {
      if (seq > 0 && payload?.loads?.length) {
        lastSeqRef.current = seq
        setResult(payload)
      }
    }).catch(() => {})

    // IPC push listener (kept as fallback — fires if main→renderer IPC is working)
    const cb = (data: unknown) => {
      setBrowserListening(false)
      const payload = data as ParseScreenshotResult
      if (!payload?.loads?.length) {
        setError('No loads received. Make sure Claude posted the scored results.')
        return
      }
      setResult(payload)
    }
    window.api.browserImport.onResult(cb)

    // Poll via IPC invoke every 2 s — picks up new browser imports while tab is open
    const interval = setInterval(async () => {
      try {
        const { seq, payload } = await window.api.loads.getLastBrowserImport()
        if (seq > lastSeqRef.current && payload?.loads?.length) {
          lastSeqRef.current = seq
          setBrowserListening(false)
          setResult(payload)
        }
      } catch { /* main process not ready — ignore */ }
    }, 2000)

    return () => {
      window.api.browserImport.offResult(cb)
      clearInterval(interval)
    }
  }, [])

  // Button toggles the "Waiting..." UI panel — listener is always active above
  // Do NOT clear existing results here; they remain visible until new ones arrive
  const startBrowserListen = () => {
    if (browserListening) {
      setBrowserListening(false)
      return
    }
    setError(null)
    setBrowserListening(true)
  }

  useEffect(() => {
    if (drivers.length && !driverId) setDriverId(drivers[0].id)
  }, [drivers, driverId])

  // When driver changes, default CPM to their profile value (falls back to 0.75)
  useEffect(() => {
    if (!driverId) return
    const driver = drivers.find(d => d.id === driverId)
    if (driver?.cpm != null) setCpm(driver.cpm)
    else if (driver?.min_rpm != null) setCpm(driver.min_rpm)
    else setCpm(0.75)
  }, [driverId, drivers])

  // Resolve driver's current position: active load destination → home_base → null
  useEffect(() => {
    if (!driverId) { setDropCity(null); return }
    const driver = drivers.find(d => d.id === driverId)
    Promise.all([
      window.api.loads.list('In Transit'),
      window.api.loads.list('Picked Up'),
      window.api.loads.list('Booked'),
    ]).then(([inTransit, pickedUp, booked]: [Load[], Load[], Load[]]) => {
      const active = [...inTransit, ...pickedUp, ...booked].find(l => l.driver_id === driverId)
      if (active?.dest_city) {
        setDropCity([active.dest_city, active.dest_state].filter(Boolean).join(', '))
      } else if (driver?.current_location) {
        setDropCity(driver.current_location)
      } else {
        setDropCity(driver?.home_base ?? null)
      }
    })
  }, [driverId, drivers])

  const handleImport = async () => {
    if (!driverId) return
    setLoading(true)
    setError(null)
    try {
      const res = await window.api.loads.importXlsx(driverId, cpm)
      if (res.cancelled) return
      if (res.error) { setError(res.error); return }
      setResult(res)
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = (load: ScoredLoad) => {
    const params = new URLSearchParams()
    if (load.origin_city)   params.set('origin_city',  load.origin_city)
    if (load.origin_state)  params.set('origin_state', load.origin_state)
    if (load.dest_city)     params.set('dest_city',    load.dest_city)
    if (load.dest_state)    params.set('dest_state',   load.dest_state)
    if (load.rate != null)  params.set('rate',         String(load.rate))
    if (load.miles != null) params.set('miles',        String(load.miles))
    if (load.company)       params.set('broker_name',  load.company)
    if (driverId)           params.set('driver_id',    String(driverId))
    navigate(`/loads?new=1&${params.toString()}`)
  }

  const selectedDriver = drivers.find(d => d.id === driverId)
  const brokerIntel    = buildBrokerIntel(brokers, allLoads)

  // Partition results
  const goodLoads     = result?.loads.filter(l => !l.skip) ?? []
  const top5          = goodLoads.slice(0, 5)
  const firstCalls    = goodLoads.filter(l => l.first_call_rank != null)
                                 .sort((a, b) => (a.first_call_rank ?? 9) - (b.first_call_rank ?? 9))
  const rejectedLoads = result?.loads.filter(l => l.skip) ?? []

  return (
    <div className='space-y-6'>

      {/* Header */}
      <div>
        <h1 className='text-xl font-semibold text-gray-100'>Find Loads</h1>
        <p className='text-sm text-gray-500 mt-0.5'>Import a load board export and get profit-first ranked results for any driver</p>
      </div>

      {/* Controls row */}
      <div className='flex items-center gap-4 flex-wrap'>

        {/* Driver selector */}
        <div className='flex items-center gap-3'>
          <span className='text-sm text-gray-400 shrink-0'>Driver:</span>
          <select
            value={driverId ?? ''}
            onChange={e => setDriverId(Number(e.target.value))}
            className='bg-surface-700 border border-surface-500 text-gray-100 text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-orange-500'
          >
            {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>

        {/* Current search origin hint */}
        {dropCity && (
          <div className='flex items-center gap-1.5 text-sm'>
            <MapPin size={12} className='text-orange-400 shrink-0' />
            <span className='text-gray-500'>Search DAT from: </span>
            <span className='text-orange-300 font-medium'>{dropCity}</span>
          </div>
        )}

        {/* CPM */}
        <div className='flex items-center gap-2'>
          <span className='text-sm text-gray-400 shrink-0'>CPM $</span>
          <input
            type='number'
            value={cpm}
            min={0.10}
            max={5.00}
            step={0.01}
            onChange={e => setCpm(parseFloat(e.target.value) || 0.75)}
            className='w-20 bg-surface-700 border border-surface-500 text-gray-100 text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-orange-500 font-mono'
          />
        </div>

        {/* Import XLSX button */}
        <button
          onClick={handleImport}
          disabled={!driverId || loading || browserListening}
          className='flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors'
        >
          {loading ? <Loader2 size={15} className='animate-spin' /> : <FileSpreadsheet size={15} />}
          {loading ? 'Analyzing...' : 'Import XLSX'}
        </button>

        {/* Import from Browser button */}
        <button
          onClick={startBrowserListen}
          disabled={!driverId || loading}
          className={[
            'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
            browserListening
              ? 'bg-blue-700 hover:bg-blue-600 text-white'
              : 'bg-surface-600 hover:bg-surface-500 text-gray-300 border border-surface-400',
            (!driverId || loading) ? 'opacity-40 cursor-not-allowed' : '',
          ].join(' ')}
          title='Have Claude read your DAT or Truckstop tab and import the results'
        >
          {browserListening
            ? <><Radio size={15} className='animate-pulse' /> Listening...</>
            : <><Globe size={15} /> Import from Browser</>
          }
        </button>

        {/* Driver summary */}
        {selectedDriver && (
          <span className='text-xs text-gray-500'>
            {[selectedDriver.trailer_type, selectedDriver.trailer_length].filter(Boolean).join(' · ')}
            {selectedDriver.min_rpm ? ` · Min $${selectedDriver.min_rpm.toFixed(2)}/mi` : ''}
            {selectedDriver.home_base ? ` · ${selectedDriver.home_base}` : ''}
          </span>
        )}
      </div>

      {/* Browser import listening state */}
      {browserListening && (
        result ? (
          // Compact banner when results are already showing
          <div className='flex items-center justify-between px-4 py-2 rounded-lg border border-blue-700/40 bg-blue-900/10'>
            <div className='flex items-center gap-2'>
              <Radio size={13} className='text-blue-400 animate-pulse shrink-0' />
              <span className='text-xs text-blue-300'>Listening for new import — results will update automatically</span>
            </div>
            <button onClick={startBrowserListen} className='text-xs text-gray-600 hover:text-gray-400 transition-colors'>Cancel</button>
          </div>
        ) : (
          // Full instructions panel when no results exist yet
          <div className='rounded-xl border border-blue-700/50 bg-blue-900/10 p-5 space-y-3'>
            <div className='flex items-center gap-2'>
              <Radio size={14} className='text-blue-400 animate-pulse shrink-0' />
              <p className='text-sm font-medium text-blue-300'>Waiting for Claude to send load data...</p>
            </div>
            <div className='space-y-1.5 text-sm text-gray-400'>
              <p>
                1. In DAT, set your search origin to{' '}
                <span className='text-orange-300 font-medium'>{dropCity ?? 'the driver\'s current city'}</span>
                {' '}and run your search.
              </p>
              <p>2. Tell Claude:</p>
              <p className='font-mono text-xs bg-surface-800 border border-surface-500 px-3 py-2 rounded-lg text-gray-200 leading-relaxed'>
                Import loads from my {selectedDriver?.trailer_type ?? 'DAT/Truckstop'} tab for {selectedDriver?.name ?? 'my driver'}
                {selectedDriver?.min_rpm ? `, min $${selectedDriver.min_rpm.toFixed(2)}/mi` : ''}
                {dropCity ? `, currently dropping in ${dropCity}` : selectedDriver?.home_base ? `, home base ${selectedDriver.home_base}` : ''}
              </p>
              <p>3. Claude will read the tab, score the loads using deadhead from that city, and the results will appear here automatically.</p>
            </div>
            <button
              onClick={startBrowserListen}
              className='text-xs text-gray-600 hover:text-gray-400 transition-colors'
            >
              Cancel
            </button>
          </div>
        )
      )}

      {/* Workflow hint — XLSX method */}
      {!result && !error && !loading && !browserListening && (
        <div className='rounded-xl border border-surface-500 bg-surface-700 p-5 space-y-3'>
          <p className='text-sm font-medium text-gray-300'>Two ways to import loads</p>
          <div className='space-y-3 text-sm text-gray-500'>
            <div>
              <p className='text-gray-400 font-medium mb-1'>Import from Browser (recommended)</p>
              <p>Click "Import from Browser" above, then tell Claude which tab to read. Works directly with DAT and Truckstop — no export or conversion needed.</p>
            </div>
            <div className='border-t border-surface-600 pt-3'>
              <p className='text-gray-400 font-medium mb-1'>Import XLSX</p>
              <p>Export search results from DAT or Truckstop as a spreadsheet, then click "Import XLSX" to select the file.</p>
            </div>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className='flex items-start gap-3 p-4 rounded-xl bg-red-900/20 border border-red-700/40 text-red-400 text-sm'>
          <AlertCircle size={16} className='shrink-0 mt-0.5' />
          <span>{error}</span>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className='space-y-6'>

          {/* Summary bar */}
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-3'>
              <CheckCircle2 size={16} className='text-green-400' />
              <span className='text-sm text-gray-300'>
                <span className='font-semibold text-gray-100'>{goodLoads.length}</span> ranked loads for{' '}
                <span className='text-orange-400'>{result.driver_name}</span>
                {rejectedLoads.length > 0 && (
                  <span className='text-gray-600'> · {rejectedLoads.length} rejected</span>
                )}
              </span>
            </div>
            <div className='flex items-center gap-3'>
              <span className='text-xs text-gray-600'>{result.raw_count} loads in file · CPM ${cpm.toFixed(2)}</span>
              <button
                onClick={() => { setResult(null); setError(null) }}
                className='text-xs text-gray-600 hover:text-gray-400 transition-colors'
              >
                Clear
              </button>
            </div>
          </div>

          {/* ---------------------------------------------------------------- */}
          {/* Section C — Best First Calls                                     */}
          {/* ---------------------------------------------------------------- */}
          {firstCalls.length > 0 && (
            <div className='space-y-3'>
              <div className='flex items-center gap-2'>
                <Phone size={14} className='text-orange-400' />
                <h2 className='text-sm font-semibold text-gray-200'>Best First Calls</h2>
                <span className='text-xs text-gray-600'>Call these brokers first — highest profit potential</span>
              </div>
              <div className='flex gap-3 flex-wrap'>
                {firstCalls.map((load, i) => (
                  <FirstCallCard key={i} load={load} onAdd={handleAdd} brokerIntel={brokerIntel} />
                ))}
              </div>
            </div>
          )}

          {/* ---------------------------------------------------------------- */}
          {/* Section A — Top 5 Ranked Loads                                   */}
          {/* ---------------------------------------------------------------- */}
          {top5.length > 0 && (
            <div className='space-y-3'>
              <div className='flex items-center gap-2'>
                <TrendingUp size={14} className='text-green-400' />
                <h2 className='text-sm font-semibold text-gray-200'>Top {top5.length} Ranked Loads</h2>
                <span className='text-xs text-gray-600'>Sorted by estimated margin and all-in RPM</span>
              </div>
              <div className='rounded-xl border border-surface-400 bg-surface-800 overflow-x-auto'>
                <table className='w-full text-sm border-collapse'>
                  <thead>
                    <tr className='border-b border-surface-500'>
                      {[
                        '#', 'Route', 'Rate', 'Ld RPM', 'All-in RPM',
                        'Est. Margin', 'Nego Target', 'DH', 'Miles', 'Broker', 'Pickup', '',
                      ].map((h, i) => (
                        <th key={i} className='text-left text-2xs font-medium text-gray-400 uppercase tracking-wider pb-2 pr-3 pl-4 pt-2 whitespace-nowrap select-none'>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {top5.map((load, i) => (
                      <LoadRow key={i} load={load} onAdd={handleAdd} brokerIntel={brokerIntel} />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ---------------------------------------------------------------- */}
          {/* Section B — Rejected Loads                                        */}
          {/* ---------------------------------------------------------------- */}
          {rejectedLoads.length > 0 && (
            <div className='space-y-2'>
              <button
                onClick={() => setShowRejected(s => !s)}
                className='flex items-center gap-2 text-xs text-gray-600 hover:text-gray-400 transition-colors'
              >
                {showRejected ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                <XCircle size={12} className='text-red-600' />
                {showRejected ? 'Hide' : 'Show'} {rejectedLoads.length} rejected load{rejectedLoads.length !== 1 ? 's' : ''}
              </button>

              {showRejected && (
                <div className='rounded-xl border border-surface-500 bg-surface-800 overflow-hidden'>
                  {rejectedLoads.map((load, i) => {
                    const { o, d } = route(load)
                    return (
                      <div key={i} className='flex items-center gap-4 px-4 py-2.5 border-b border-surface-600 last:border-0 opacity-60'>
                        <span className='text-xs text-gray-500 w-4 shrink-0'>{load.rank}</span>
                        <span className='flex items-center gap-1 text-xs shrink-0'>
                          <span className='text-gray-400'>{o}</span>
                          <ArrowRight size={9} className='text-gray-600' />
                          <span className='text-gray-500'>{d}</span>
                        </span>
                        <span className='text-xs text-gray-500'>{fmt$(load.rate)}</span>
                        <span className='flex items-center gap-1 text-2xs px-2 py-0.5 rounded-full bg-red-900/30 text-red-500 border border-red-900/50'>
                          <XCircle size={9} />
                          {load.skip_reason ?? 'Skipped'}
                        </span>
                        <span className='text-2xs text-gray-600 truncate'>{load.company ?? ''}</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

        </div>
      )}
    </div>
  )
}
