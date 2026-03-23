import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FileSpreadsheet, Loader2, AlertCircle, ArrowRight,
  CheckCircle2, XCircle, ChevronDown, ChevronUp, Plus,
  Phone, TrendingUp,
} from 'lucide-react'
import type { Driver } from '../types/models'
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

function FirstCallCard({ load, onAdd }: { load: ScoredLoad; onAdd: (l: ScoredLoad) => void }) {
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
      <div className='flex items-center justify-between text-2xs text-gray-600'>
        <span className='truncate max-w-[120px]'>{load.company ?? '—'}</span>
        <span>{load.pickup_date ?? '—'}</span>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Full ranked load row (Top 5 table)
// ---------------------------------------------------------------------------

function LoadRow({ load, onAdd }: { load: ScoredLoad; onAdd: (l: ScoredLoad) => void }) {
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
        <td className='pr-3 py-2.5 text-xs text-gray-400 max-w-[130px] truncate'>{load.company ?? '—'}</td>

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

export function FindLoads() {
  const navigate = useNavigate()
  const [drivers,     setDrivers    ] = useState<Driver[]>([])
  const [driverId,    setDriverId   ] = useState<number | null>(null)
  const [cpm,         setCpm        ] = useState<number>(0.75)
  const [loading,     setLoading    ] = useState(false)
  const [result,      setResult     ] = useState<ParseScreenshotResult | null>(null)
  const [error,       setError      ] = useState<string | null>(null)
  const [showRejected,setShowRejected] = useState(false)

  useEffect(() => {
    window.api.drivers.list('Active').then(setDrivers)
  }, [])

  useEffect(() => {
    if (drivers.length && !driverId) setDriverId(drivers[0].id)
  }, [drivers, driverId])

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
            onChange={e => { setDriverId(Number(e.target.value)); setResult(null) }}
            className='bg-surface-700 border border-surface-500 text-gray-100 text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-orange-500'
          >
            {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>

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

        {/* Import button */}
        <button
          onClick={handleImport}
          disabled={!driverId || loading}
          className='flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors'
        >
          {loading ? <Loader2 size={15} className='animate-spin' /> : <FileSpreadsheet size={15} />}
          {loading ? 'Analyzing...' : 'Import XLSX'}
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

      {/* Workflow hint */}
      {!result && !error && !loading && (
        <div className='rounded-xl border border-surface-500 bg-surface-700 p-5 space-y-2'>
          <p className='text-sm font-medium text-gray-300'>How to use</p>
          <ol className='text-sm text-gray-500 space-y-1 list-decimal list-inside'>
            <li>Take a screenshot of your Truckstop search results</li>
            <li>Ask ChatGPT: <span className='font-mono text-xs bg-surface-600 px-1.5 py-0.5 rounded text-gray-300'>"Convert this screenshot to an Excel file"</span></li>
            <li>Download the XLSX ChatGPT creates</li>
            <li>Select your driver and CPM above, click Import XLSX, and choose the file</li>
          </ol>
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
                  <FirstCallCard key={i} load={load} onAdd={handleAdd} />
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
                        <th key={i} className='text-left text-2xs font-medium text-gray-600 uppercase tracking-wider pb-2 pr-3 pl-4 pt-2 whitespace-nowrap select-none'>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {top5.map((load, i) => (
                      <LoadRow key={i} load={load} onAdd={handleAdd} />
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
