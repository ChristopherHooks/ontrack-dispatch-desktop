import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import {
  Truck, MapPin, CheckSquare, Square, Check, Loader2,
  Package, Building2, ArrowRight, ArrowRightLeft, TrendingUp,
} from 'lucide-react'
import type {
  ScannerRecommendation, LoadRecommendation,
  BrokerIntelRow, LaneIntelRow, DriverLaneFitRow,
} from '../types/models'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ChecklistStep {
  id:     string
  label:  string
  detail: string
  done:   boolean
}

const CHECKLIST_TEMPLATE: Omit<ChecklistStep, 'done'>[] = [
  { id: 'broker',  label: 'Verify broker',         detail: 'Check broker flag and confirm contact info' },
  { id: 'pickup',  label: 'Confirm pickup details', detail: 'Date, origin city, commodity' },
  { id: 'rate',    label: 'Agree on rate',          detail: 'Accept rate or negotiate to target' },
  { id: 'rc',      label: 'Get rate confirmation',  detail: 'Obtain RC number from broker' },
  { id: 'log',     label: 'Load logged in system',  detail: 'Verify load record is complete' },
  { id: 'notify',  label: 'Notify driver',          detail: 'Confirm pickup details with driver' },
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmtCurrency(v: number | null | undefined): string {
  if (v == null) return '—'
  return '$' + v.toLocaleString()
}

function fmtRpm(v: number | null | undefined): string {
  if (v == null) return '—'
  return '$' + v.toFixed(2) + '/mi'
}

function rpmColor(rpm: number | null): string {
  if (rpm == null) return 'text-gray-500'
  if (rpm >= 3.00) return 'text-green-400'
  if (rpm >= 2.50) return 'text-orange-400'
  return 'text-red-400'
}

function scoreBadge(score: number): { label: string; cls: string } {
  if (score >= 5) return { label: 'Strong', cls: 'bg-green-500/20 text-green-400' }
  if (score >= 3) return { label: 'Good',   cls: 'bg-orange-500/20 text-orange-400' }
  if (score >= 1) return { label: 'Fair',   cls: 'bg-yellow-500/20 text-yellow-500' }
  return              { label: 'Weak',   cls: 'bg-gray-500/20 text-gray-500' }
}

const FLAG_COLORS: Record<string, string> = {
  'Preferred':   'text-green-400',
  'Slow Pay':    'text-yellow-400',
  'Avoid':       'text-orange-400',
  'Blacklisted': 'text-red-400',
  'None':        'text-gray-500',
}

const RATING_CHIP: Record<string, { label: string; cls: string }> = {
  'Preferred': { label: 'Preferred Broker', cls: 'bg-green-500/15 text-green-400 border-green-500/25' },
  'Strong':    { label: 'Strong Broker',    cls: 'bg-green-500/10 text-green-400 border-green-500/20' },
  'Neutral':   { label: 'Neutral',          cls: 'bg-gray-500/10 text-gray-400 border-gray-500/20' },
  'Caution':   { label: 'Caution',          cls: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/25' },
  'Avoid':     { label: 'Avoid',            cls: 'bg-red-500/15 text-red-400 border-red-500/25' },
}

const STRENGTH_CHIP: Record<string, { label: string; cls: string }> = {
  'Strong':  { label: 'Strong Lane',  cls: 'bg-green-500/10 text-green-400 border-green-500/20' },
  'Average': { label: 'Avg Lane',     cls: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
  'Weak':    { label: 'Weak Lane',    cls: 'bg-gray-500/10 text-gray-500 border-gray-500/20' },
}

const FIT_CHIP: Record<string, { label: string; cls: string }> = {
  'Strong Fit':  { label: 'Driver Fit: Strong', cls: 'bg-green-500/10 text-green-400 border-green-500/20' },
  'Has History': { label: 'Driver: Has History', cls: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  'New Lane':    { label: 'New Lane for Driver', cls: 'bg-gray-500/10 text-gray-500 border-gray-500/20' },
}

function buildDeterministicOpener(load: LoadRecommendation): string {
  const rpm    = load.rpm
  const rate   = load.rate
  const miles  = load.miles
  const origin = [load.origin_city, load.origin_state].filter(Boolean).join(', ') || 'origin'
  const dest   = [load.dest_city, load.dest_state].filter(Boolean).join(', ') || 'destination'

  if (rpm != null && rpm < 2.50 && miles != null) {
    const targetRate = Math.round(2.50 * miles)
    return (
      `Rate of ${fmtCurrency(rate)} (${fmtRpm(rpm)}) on ${origin} to ${dest} is below the $2.50/mi floor. ` +
      `Counter with $${targetRate.toLocaleString()} — say: "I need to be closer to $2.50/mi to cover deadhead on this lane. ` +
      `Can you get to $${targetRate.toLocaleString()} all-in?"`
    )
  }
  return (
    `Rate of ${fmtCurrency(rate)} (${fmtRpm(rpm)}) on ${origin} to ${dest} is acceptable. ` +
    `Say: "This works for us. Please send the rate confirmation to dispatch@ontrackhaulingsolutions.com."`
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function LoadMatch() {
  const [searchParams]     = useSearchParams()
  const navigate           = useNavigate()

  const [allRecs,          setAllRecs]          = useState<ScannerRecommendation[]>([])
  const [loading,          setLoading]          = useState(true)
  const [selectedDriverId, setSelectedDriverId] = useState<number | null>(null)
  const [selectedLoad,     setSelectedLoad]     = useState<LoadRecommendation | null>(null)
  const [checklist,        setChecklist]        = useState<ChecklistStep[]>(
    CHECKLIST_TEMPLATE.map(s => ({ ...s, done: false }))
  )
  const [aiScript,         setAiScript]         = useState<string | null>(null)
  const [aiLoading,        setAiLoading]        = useState(false)
  const [booking,          setBooking]          = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [bookError,        setBookError]        = useState<string | null>(null)

  // Intel state
  const [brokerIntel,  setBrokerIntel]  = useState<BrokerIntelRow[]>([])
  const [laneIntel,    setLaneIntel]    = useState<LaneIntelRow[]>([])
  const [driverFit,    setDriverFit]    = useState<DriverLaneFitRow[]>([])

  // Load all available drivers and their recommendations
  useEffect(() => {
    window.api.scanner.recommendLoads({})
      .then((recs: ScannerRecommendation[]) => {
        setAllRecs(recs)
        setLoading(false)
        const paramId = searchParams.get('driverId')
        if (paramId) {
          const id = parseInt(paramId, 10)
          if (recs.some(r => r.driver_id === id)) setSelectedDriverId(id)
        }
      })
      .catch(() => setLoading(false))

    // Fetch global broker + lane intel once
    window.api.intel.allBrokers().then(setBrokerIntel).catch(() => {})
    window.api.intel.allLanes().then(setLaneIntel).catch(() => {})
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Reset load panel when driver changes; fetch driver-specific lane fit
  useEffect(() => {
    setSelectedLoad(null)
    setChecklist(CHECKLIST_TEMPLATE.map(s => ({ ...s, done: false })))
    setAiScript(null)
    setBooking('idle')
    setBookError(null)
    setDriverFit([])
    if (selectedDriverId != null) {
      window.api.intel.driverFit(selectedDriverId).then(setDriverFit).catch(() => {})
    }
  }, [selectedDriverId])

  // Reset checklist + script when load changes
  useEffect(() => {
    setChecklist(CHECKLIST_TEMPLATE.map(s => ({ ...s, done: false })))
    setAiScript(null)
    setBooking('idle')
    setBookError(null)
  }, [selectedLoad?.load_id_pk])

  const selectedRec    = allRecs.find(r => r.driver_id === selectedDriverId) ?? null
  const candidateLoads = selectedRec?.recommendations ?? []
  const allChecked     = checklist.every(s => s.done)

  // Intel lookup helpers
  function getBrokerIntel(brokerName: string | null): BrokerIntelRow | null {
    if (!brokerName) return null
    return brokerIntel.find(b => b.broker_name.toLowerCase() === brokerName.toLowerCase()) ?? null
  }

  function getLaneIntel(originState: string | null, destState: string | null): LaneIntelRow | null {
    if (!originState || !destState) return null
    return laneIntel.find(l => l.origin_state === originState && l.dest_state === destState) ?? null
  }

  function getDriverLaneFit(originState: string | null, destState: string | null): DriverLaneFitRow | null {
    if (!originState || !destState) return null
    return driverFit.find(f => f.origin_state === originState && f.dest_state === destState) ?? null
  }

  function toggleStep(id: string) {
    setChecklist(prev => prev.map(s => s.id === id ? { ...s, done: !s.done } : s))
  }

  async function generateAiScript() {
    if (!selectedLoad || !selectedRec) return
    setAiLoading(true)
    setAiScript(null)
    try {
      const result = await window.api.loadMatch.nego({
        rate:          selectedLoad.rate,
        miles:         selectedLoad.miles,
        rpm:           selectedLoad.rpm,
        deadheadMiles: selectedLoad.deadhead_miles,
        origin:        [selectedLoad.origin_city, selectedLoad.origin_state].filter(Boolean).join(', '),
        dest:          [selectedLoad.dest_city, selectedLoad.dest_state].filter(Boolean).join(', '),
        brokerName:    selectedLoad.broker_name,
        driverName:    selectedRec.driver_name,
      })
      setAiScript(typeof result === 'string' && result ? result : null)
    } catch {
      setAiScript(null)
    } finally {
      setAiLoading(false)
    }
  }

  async function bookLoad() {
    if (!selectedLoad || !selectedDriverId) return
    setBooking('loading')
    setBookError(null)
    try {
      const result = await window.api.dispatcher.assignLoad({
        loadId:   selectedLoad.load_id_pk,
        driverId: selectedDriverId,
      })
      if (result && result.ok === false) {
        setBooking('error')
        setBookError(result.error ?? 'Could not book load.')
      } else {
        setBooking('success')
      }
    } catch (e: unknown) {
      setBooking('error')
      setBookError(e instanceof Error ? e.message : 'Booking failed.')
    }
  }

  function resetAndReload() {
    setBooking('idle')
    setSelectedLoad(null)
    setSelectedDriverId(null)
    setLoading(true)
    window.api.scanner.recommendLoads({})
      .then((recs: ScannerRecommendation[]) => { setAllRecs(recs); setLoading(false) })
      .catch(() => setLoading(false))
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className='flex h-full bg-surface-800 overflow-hidden'>

      {/* ── Panel 1: Available Drivers ── */}
      <div className='w-52 flex-shrink-0 border-r border-surface-400 flex flex-col bg-surface-750'>
        <div className='px-4 py-3 border-b border-surface-400'>
          <div className='flex items-center gap-2'>
            <Truck size={13} className='text-orange-500' />
            <p className='text-sm font-semibold text-gray-200'>Available Drivers</p>
          </div>
          {!loading && (
            <p className='text-xs text-gray-500 mt-0.5 pl-5'>{allRecs.length} needing loads</p>
          )}
        </div>

        <div className='flex-1 overflow-y-auto'>
          {loading ? (
            <div className='flex items-center justify-center h-32'>
              <Loader2 size={16} className='animate-spin text-gray-600' />
            </div>
          ) : allRecs.length === 0 ? (
            <p className='px-4 py-6 text-xs text-gray-600 italic'>No drivers need loads right now.</p>
          ) : (
            allRecs.map(rec => {
              const isSelected = rec.driver_id === selectedDriverId
              return (
                <button
                  key={rec.driver_id}
                  onClick={() => setSelectedDriverId(prev => prev === rec.driver_id ? null : rec.driver_id)}
                  className={[
                    'w-full text-left px-4 py-3 border-b border-surface-500 transition-colors',
                    isSelected
                      ? 'bg-orange-600/15 border-l-[3px] border-l-orange-500 pl-[13px]'
                      : 'hover:bg-surface-700',
                  ].join(' ')}
                >
                  <p className='text-sm font-medium text-gray-200 truncate'>{rec.driver_name}</p>
                  {rec.home_base && (
                    <p className='text-xs text-gray-500 mt-0.5 flex items-center gap-1 truncate'>
                      <MapPin size={9} className='shrink-0' />{rec.home_base}
                    </p>
                  )}
                  <p className='text-xs text-gray-600 mt-0.5'>
                    {rec.recommendations.length} load{rec.recommendations.length !== 1 ? 's' : ''} matched
                  </p>
                </button>
              )
            })
          )}
        </div>
      </div>

      {/* ── Panel 2: Candidate Loads ── */}
      <div className='flex-1 flex flex-col overflow-hidden'>
        <div className='px-4 py-3 border-b border-surface-400 bg-surface-750'>
          <div className='flex items-center gap-2'>
            <Package size={13} className='text-orange-500' />
            <p className='text-sm font-semibold text-gray-200'>
              {selectedRec ? `Loads for ${selectedRec.driver_name}` : 'Candidate Loads'}
            </p>
          </div>
          <p className='text-xs text-gray-500 mt-0.5 pl-5'>
            {selectedRec
              ? `${candidateLoads.length} match${candidateLoads.length !== 1 ? 'es' : ''} — ranked by RPM and deadhead`
              : 'Select a driver to see scored load matches'}
          </p>
        </div>

        <div className='flex-1 overflow-y-auto p-3 space-y-2'>
          {!selectedDriverId ? (
            <div className='flex flex-col items-center justify-center h-full text-center gap-3'>
              <ArrowRightLeft size={28} className='text-gray-700' />
              <p className='text-sm text-gray-400'>Select a driver on the left to see matched loads.</p>
            </div>
          ) : candidateLoads.length === 0 ? (
            <div className='flex flex-col items-center justify-center h-full text-center gap-3'>
              <Package size={28} className='text-gray-700' />
              <p className='text-sm text-gray-400'>No available loads match this driver right now.</p>
              <p className='text-xs text-gray-400'>Add loads with status Searching in the Loads page.</p>
            </div>
          ) : (
            candidateLoads.map((load, idx) => {
              const isSelected  = selectedLoad?.load_id_pk === load.load_id_pk
              const flagColor   = FLAG_COLORS[load.broker_flag ?? 'None'] ?? 'text-gray-500'
              const badge       = scoreBadge(load.score)
              const bIntel      = getBrokerIntel(load.broker_name)
              const lIntel      = getLaneIntel(load.origin_state, load.dest_state)
              const dFit        = getDriverLaneFit(load.origin_state, load.dest_state)
              const ratingChip  = bIntel ? RATING_CHIP[bIntel.rating]   : null
              const strengthChip= lIntel ? STRENGTH_CHIP[lIntel.strength] : null
              const fitChip     = dFit   ? FIT_CHIP[dFit.fit]           : null
              return (
                <button
                  key={load.load_id_pk}
                  onClick={() => setSelectedLoad(isSelected ? null : load)}
                  className={[
                    'w-full text-left rounded-lg border px-3 py-3 transition-colors',
                    isSelected
                      ? 'border-orange-500 bg-orange-600/10'
                      : 'border-surface-400 bg-surface-700 hover:border-surface-300',
                  ].join(' ')}
                >
                  <div className='flex items-start gap-2'>
                    <span className='text-xs font-bold text-gray-600 mt-0.5 w-5 shrink-0'>#{idx + 1}</span>
                    <div className='flex-1 min-w-0'>

                      {/* Origin → Dest */}
                      <div className='flex items-center gap-1.5 flex-wrap'>
                        <span className='text-sm font-medium text-gray-200'>
                          {[load.origin_city, load.origin_state].filter(Boolean).join(', ') || '—'}
                        </span>
                        <ArrowRight size={11} className='text-gray-600 shrink-0' />
                        <span className='text-sm font-medium text-gray-200'>
                          {[load.dest_city, load.dest_state].filter(Boolean).join(', ') || '—'}
                        </span>
                      </div>

                      {/* Rate + RPM + Miles */}
                      <div className='flex items-center gap-3 mt-1.5 flex-wrap'>
                        <span className='text-sm font-bold text-gray-100'>{fmtCurrency(load.rate)}</span>
                        <span className={`text-xs font-semibold ${rpmColor(load.rpm)}`}>{fmtRpm(load.rpm)}</span>
                        {load.miles != null && (
                          <span className='text-xs text-gray-500'>{load.miles.toLocaleString()} mi</span>
                        )}
                        <span className='text-xs text-gray-600'>{load.deadhead_miles} mi deadhead</span>
                      </div>

                      {/* Broker + Pickup + Score */}
                      <div className='flex items-center gap-3 mt-1 flex-wrap'>
                        {load.broker_name && (
                          <span className={`text-xs flex items-center gap-1 ${flagColor}`}>
                            <Building2 size={9} />
                            {load.broker_name}
                            {load.broker_flag && load.broker_flag !== 'None' && ` — ${load.broker_flag}`}
                          </span>
                        )}
                        {load.pickup_date && (
                          <span className='text-xs text-gray-600'>Pickup {load.pickup_date}</span>
                        )}
                        <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${badge.cls}`}>
                          {badge.label}
                        </span>
                      </div>

                      {/* Intel chips */}
                      {(ratingChip || strengthChip || fitChip) && (
                        <div className='flex items-center gap-1.5 mt-1.5 flex-wrap'>
                          {ratingChip && (
                            <span className={`text-2xs px-1.5 py-0.5 rounded border font-medium ${ratingChip.cls}`}>
                              {ratingChip.label}
                            </span>
                          )}
                          {strengthChip && (
                            <span className={`text-2xs px-1.5 py-0.5 rounded border font-medium ${strengthChip.cls}`}>
                              {strengthChip.label}
                            </span>
                          )}
                          {fitChip && (
                            <span className={`text-2xs px-1.5 py-0.5 rounded border font-medium ${fitChip.cls}`}>
                              {fitChip.label}
                            </span>
                          )}
                        </div>
                      )}

                    </div>
                    {isSelected && <Check size={14} className='text-orange-400 mt-0.5 shrink-0' />}
                  </div>
                </button>
              )
            })
          )}
        </div>
      </div>

      {/* ── Panel 3: Booking Workspace ── */}
      <div className='w-72 flex-shrink-0 border-l border-surface-400 flex flex-col overflow-y-auto bg-surface-750'>

        {/* ── Booking success ── */}
        {booking === 'success' ? (
          <div className='flex flex-col items-center justify-center h-full p-6 text-center gap-4'>
            <div className='w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center'>
              <Check size={22} className='text-green-400' />
            </div>
            <div>
              <p className='text-sm font-semibold text-gray-200'>Load Booked</p>
              <p className='text-xs text-gray-500 mt-1'>
                {selectedRec?.driver_name} has been assigned. Driver status set to On Load.
              </p>
            </div>
            <div className='flex flex-col gap-2 w-full'>
              <button
                onClick={() => navigate('/operations')}
                className='w-full py-2 rounded-lg text-xs text-gray-300 border border-surface-400 hover:bg-surface-600 transition-colors'
              >
                Back to Operations
              </button>
              <button
                onClick={resetAndReload}
                className='w-full py-2 rounded-lg text-xs text-orange-400 hover:text-orange-300 transition-colors'
              >
                Book another load
              </button>
            </div>
          </div>

        /* ── No load selected ── */
        ) : !selectedLoad ? (
          <div className='flex flex-col items-center justify-center h-full p-6 text-center gap-3'>
            <CheckSquare size={24} className='text-gray-700' />
            <p className='text-sm text-gray-400'>Select a load from the center panel to open the booking workspace.</p>
          </div>

        /* ── Booking workspace ── */
        ) : (
          <>
            {/* Load summary header */}
            <div className='px-4 py-3 border-b border-surface-400'>
              <p className='text-2xs font-semibold text-gray-500 uppercase tracking-wider mb-1'>Selected Load</p>
              <p className='text-sm font-medium text-gray-200 flex items-center gap-1.5 flex-wrap'>
                {[selectedLoad.origin_city, selectedLoad.origin_state].filter(Boolean).join(', ') || '—'}
                <ArrowRight size={10} className='text-gray-600 shrink-0' />
                {[selectedLoad.dest_city, selectedLoad.dest_state].filter(Boolean).join(', ') || '—'}
              </p>
              <p className='text-xs text-gray-500 mt-0.5'>
                {fmtCurrency(selectedLoad.rate)} — {fmtRpm(selectedLoad.rpm)} — {selectedLoad.miles ?? '?'} mi loaded
              </p>
              {selectedRec && (
                <p className='text-xs text-gray-600 mt-0.5'>Driver: {selectedRec.driver_name}</p>
              )}
            </div>

            {/* Intelligence Context */}
            {(() => {
              const bIntel = getBrokerIntel(selectedLoad.broker_name)
              const lIntel = getLaneIntel(selectedLoad.origin_state, selectedLoad.dest_state)
              const dFit   = getDriverLaneFit(selectedLoad.origin_state, selectedLoad.dest_state)
              if (!bIntel && !lIntel && !dFit) return null
              return (
                <div className='px-4 py-3 border-b border-surface-400'>
                  <div className='flex items-center gap-1.5 mb-2'>
                    <TrendingUp size={11} className='text-orange-500' />
                    <p className='text-2xs font-semibold text-gray-500 uppercase tracking-wider'>Intelligence</p>
                  </div>
                  <div className='space-y-2'>

                    {/* Broker intel row */}
                    {bIntel && (() => {
                      const chip = RATING_CHIP[bIntel.rating]
                      return (
                        <div className='flex items-start justify-between gap-2'>
                          <div className='min-w-0'>
                            <p className='text-2xs text-gray-500'>Broker</p>
                            <p className='text-xs text-gray-300 truncate'>{bIntel.broker_name}</p>
                            {bIntel.caution_note && (
                              <p className='text-2xs text-yellow-500 mt-0.5'>{bIntel.caution_note}</p>
                            )}
                            {bIntel.loads_count > 0 && (
                              <p className='text-2xs text-gray-600 mt-0.5'>
                                {bIntel.loads_count} load{bIntel.loads_count !== 1 ? 's' : ''} history
                                {bIntel.avg_rpm != null && ` — avg ${fmtRpm(bIntel.avg_rpm)}`}
                              </p>
                            )}
                          </div>
                          <span className={`text-2xs px-1.5 py-0.5 rounded border font-semibold shrink-0 ${chip.cls}`}>
                            {bIntel.rating}
                          </span>
                        </div>
                      )
                    })()}

                    {/* Lane intel row */}
                    {lIntel && (() => {
                      const chip = STRENGTH_CHIP[lIntel.strength]
                      return (
                        <div className='flex items-start justify-between gap-2'>
                          <div className='min-w-0'>
                            <p className='text-2xs text-gray-500'>Lane</p>
                            <p className='text-xs text-gray-300'>
                              {lIntel.origin_state} → {lIntel.dest_state}
                            </p>
                            <p className='text-2xs text-gray-600 mt-0.5'>
                              {lIntel.loads_count} run{lIntel.loads_count !== 1 ? 's' : ''} — avg {fmtRpm(lIntel.avg_rpm)}
                            </p>
                          </div>
                          <span className={`text-2xs px-1.5 py-0.5 rounded border font-semibold shrink-0 ${chip.cls}`}>
                            {lIntel.strength}
                          </span>
                        </div>
                      )
                    })()}

                    {/* Driver fit row */}
                    {dFit && (() => {
                      const chip = FIT_CHIP[dFit.fit]
                      return (
                        <div className='flex items-start justify-between gap-2'>
                          <div className='min-w-0'>
                            <p className='text-2xs text-gray-500'>Driver Fit</p>
                            <p className='text-xs text-gray-300 truncate'>{selectedRec?.driver_name ?? 'Driver'}</p>
                            {dFit.loads_count > 0 && (
                              <p className='text-2xs text-gray-600 mt-0.5'>
                                {dFit.loads_count} run{dFit.loads_count !== 1 ? 's' : ''} on this lane
                                {dFit.avg_rpm != null && ` — ${fmtRpm(dFit.avg_rpm)} avg`}
                              </p>
                            )}
                          </div>
                          <span className={`text-2xs px-1.5 py-0.5 rounded border font-semibold shrink-0 ${chip.cls}`}>
                            {dFit.fit}
                          </span>
                        </div>
                      )
                    })()}

                  </div>
                </div>
              )
            })()}

            {/* Booking checklist */}
            <div className='px-4 py-3 border-b border-surface-400'>
              <p className='text-2xs font-semibold text-gray-500 uppercase tracking-wider mb-2.5'>Booking Checklist</p>
              <ul className='space-y-2'>
                {checklist.map(step => (
                  <li key={step.id}>
                    <button
                      onClick={() => toggleStep(step.id)}
                      className='flex items-start gap-2 w-full text-left group'
                    >
                      <span className='shrink-0 mt-0.5'>
                        {step.done
                          ? <CheckSquare size={14} className='text-green-400' />
                          : <Square size={14} className='text-gray-600 group-hover:text-gray-400 transition-colors' />
                        }
                      </span>
                      <div>
                        <p className={`text-xs transition-colors ${step.done ? 'line-through text-gray-600' : 'text-gray-300'}`}>
                          {step.label}
                        </p>
                        {!step.done && (
                          <p className='text-2xs text-gray-700 mt-0.5 leading-relaxed'>{step.detail}</p>
                        )}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>

              {/* Progress bar */}
              <div className='mt-3'>
                <div className='h-1 rounded-full bg-surface-500'>
                  <div
                    className='h-1 rounded-full bg-orange-500 transition-all duration-300'
                    style={{ width: `${(checklist.filter(s => s.done).length / checklist.length) * 100}%` }}
                  />
                </div>
                <p className='text-2xs text-gray-600 mt-1'>
                  {checklist.filter(s => s.done).length}/{checklist.length} complete
                </p>
              </div>
            </div>

            {/* Rate analysis + negotiation */}
            <div className='px-4 py-3 border-b border-surface-400'>
              <div className='flex items-center justify-between mb-2.5'>
                <p className='text-2xs font-semibold text-gray-500 uppercase tracking-wider'>Rate Analysis</p>
                <button
                  onClick={generateAiScript}
                  disabled={aiLoading}
                  className='text-2xs text-orange-400 hover:text-orange-300 disabled:opacity-50 transition-colors'
                >
                  {aiLoading ? 'Loading...' : aiScript ? 'Refresh AI' : 'AI Script'}
                </button>
              </div>

              {/* Always-visible rate math */}
              <div className='space-y-1.5 mb-3'>
                <div className='flex items-center justify-between'>
                  <span className='text-xs text-gray-500'>Rate</span>
                  <span className='text-xs font-medium text-gray-300'>{fmtCurrency(selectedLoad.rate)}</span>
                </div>
                <div className='flex items-center justify-between'>
                  <span className='text-xs text-gray-500'>RPM</span>
                  <span className={`text-xs font-semibold ${rpmColor(selectedLoad.rpm)}`}>{fmtRpm(selectedLoad.rpm)}</span>
                </div>
                <div className='flex items-center justify-between'>
                  <span className='text-xs text-gray-500'>Loaded miles</span>
                  <span className='text-xs text-gray-300'>{selectedLoad.miles?.toLocaleString() ?? '—'}</span>
                </div>
                <div className='flex items-center justify-between'>
                  <span className='text-xs text-gray-500'>Deadhead</span>
                  <span className='text-xs text-gray-300'>{selectedLoad.deadhead_miles} mi</span>
                </div>
              </div>

              {/* Negotiation opener — deterministic, always shown */}
              <div className='bg-surface-600 rounded-lg p-2.5'>
                <p className='text-2xs text-gray-400 mb-1.5 font-medium'>Suggested opener</p>
                <p className='text-xs text-gray-300 leading-relaxed'>
                  {buildDeterministicOpener(selectedLoad)}
                </p>
              </div>

              {/* AI-enhanced script — shows when loaded */}
              {aiLoading && (
                <div className='mt-2 flex items-center gap-1.5 text-xs text-gray-600'>
                  <Loader2 size={11} className='animate-spin' />Generating AI script...
                </div>
              )}
              {aiScript && !aiLoading && (
                <div className='mt-2 bg-orange-500/5 border border-orange-500/20 rounded-lg p-2.5'>
                  <p className='text-2xs text-orange-400 mb-1.5 font-medium'>AI-enhanced script</p>
                  <p className='text-xs text-gray-300 leading-relaxed'>{aiScript}</p>
                </div>
              )}
            </div>

            {/* Book Load action */}
            <div className='px-4 py-4'>
              {bookError && (
                <div className='mb-3 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20'>
                  <p className='text-xs text-red-400'>{bookError}</p>
                </div>
              )}
              <button
                onClick={bookLoad}
                disabled={booking === 'loading'}
                className={[
                  'w-full py-2.5 rounded-lg text-sm font-semibold transition-all duration-200',
                  allChecked
                    ? 'bg-orange-600 hover:bg-orange-500 text-white shadow-glow-orange'
                    : 'bg-orange-600/50 text-white/70 hover:bg-orange-600/60',
                  booking === 'loading' ? 'opacity-70 cursor-not-allowed' : '',
                ].join(' ')}
              >
                {booking === 'loading'
                  ? (
                    <span className='flex items-center justify-center gap-2'>
                      <Loader2 size={14} className='animate-spin' />Booking...
                    </span>
                  )
                  : 'Book Load'
                }
              </button>
              {!allChecked && (
                <p className='text-2xs text-gray-700 text-center mt-1.5'>
                  Complete the checklist before booking.
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
