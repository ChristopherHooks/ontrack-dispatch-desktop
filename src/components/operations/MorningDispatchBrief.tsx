import { useState, useEffect } from 'react'
import { Truck, MapPin, ArrowRight, Clock, TrendingUp, AlertTriangle, CheckCircle2, X } from 'lucide-react'
import type { MorningDispatchBriefRow, LoadOffer } from '../../types/models'
import { computeDriverTier, TIER_BADGE, TIER_LABEL } from '../../lib/driverTierService'

// ---------------------------------------------------------------------------
// MorningDispatchBrief
// Driver-first morning planning section for the Operations page.
// Shows eligible drivers with their top 3 load recommendations.
// ---------------------------------------------------------------------------

interface Props {
  rows:    MorningDispatchBriefRow[]
  loading: boolean
  onAssigned?: () => void   // callback to refresh parent after successful assign
}

function fmt$(n: number | null | undefined): string {
  if (n == null) return '—'
  return `$${Math.round(n).toLocaleString('en-US')}`
}

function fmtRpm(n: number | null | undefined): string {
  if (n == null) return '—'
  return `$${n.toFixed(2)}`
}

function fmtDeadhead(n: number | null | undefined): string {
  if (n == null) return '—'
  return `${Math.round(n)} mi dh`
}

function fmtPickup(date: string | null | undefined): string {
  if (!date) return '—'
  // YYYY-MM-DD → M/D
  const parts = date.split('-')
  if (parts.length < 3) return date
  return `${parseInt(parts[1])}/${parseInt(parts[2])}`
}

// Score visual tier: >= 4 = strong, 2–4 = okay, < 2 = weak
function scoreTier(score: number | null | undefined): 'strong' | 'ok' | 'weak' {
  if (score == null) return 'weak'
  if (score >= 4)    return 'strong'
  if (score >= 2)    return 'ok'
  return 'weak'
}

const SCORE_COLORS = {
  strong: 'text-green-400',
  ok:     'text-yellow-400',
  weak:   'text-gray-500',
} as const

// High deadhead threshold (miles) — muted orange cue for dispatcher
const DEADHEAD_WARN = 200

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface SuggestionRowProps {
  sug:       MorningDispatchBriefRow['suggestions'][number]
  driverId:  number
  onAssigned?: () => void
}

function SuggestionRow({ sug, driverId, onAssigned }: SuggestionRowProps) {
  const [offerId,   setOfferId]  = useState<number | null>(null)
  const [assigning, setAssigning] = useState(false)
  const [assigned,  setAssigned]  = useState(false)
  const [skipped,   setSkipped]   = useState(false)
  const [error,     setError]     = useState<string | null>(null)

  // Find-or-create a load offer when this suggestion is shown to the dispatcher.
  // Mirrors the canonical Loads.tsx openOfferPanel pattern.
  // createOffer is find-or-create at the repo level — safe against re-render / reopen.
  useEffect(() => {
    window.api.loadOffers.create(driverId, sug.load_id)
      .then((offer: LoadOffer) => setOfferId(offer.id))
      .catch(() => {/* non-fatal — assignment still proceeds without offer tracking */})
  }, [driverId, sug.load_id])

  const tier = scoreTier(sug.score)
  const highDeadhead = (sug.deadhead ?? 0) > DEADHEAD_WARN

  const handleAssign = async () => {
    if (assigning || assigned) return
    setAssigning(true)
    setError(null)
    try {
      const result = await window.api.dispatcher.assignLoad({ loadId: sug.load_id, driverId })
      if (result?.ok === false) {
        setError(result.error ?? 'Assignment failed')
        return
      }
      // Mark the offer accepted — mirrors Loads.tsx handleAssign
      if (offerId != null) {
        await window.api.loadOffers.updateStatus(offerId, 'accepted')
      }
      setAssigned(true)
      onAssigned?.()
    } catch (e) {
      setError('Assignment failed')
    } finally {
      setAssigning(false)
    }
  }

  const handleSkip = async () => {
    if (skipped || assigned) return
    // Mark the offer declined — records dispatcher's choice, feeds acceptance_rate
    if (offerId != null) {
      await window.api.loadOffers.updateStatus(offerId, 'declined')
        .catch(() => {/* non-fatal */})
    }
    setSkipped(true)
  }

  if (skipped) return null

  return (
    <div className={`flex items-start gap-3 px-4 py-2.5 border-t border-surface-500/40 hover:bg-surface-600/40 transition-colors ${assigned ? 'opacity-60' : ''}`}>
      {/* Score indicator */}
      <div className={`shrink-0 text-xs font-mono font-semibold mt-0.5 w-8 text-right ${SCORE_COLORS[tier]}`}>
        {sug.score != null ? sug.score.toFixed(1) : '—'}
      </div>

      {/* Lane + details */}
      <div className='flex-1 min-w-0'>
        {/* Lane */}
        <div className='flex items-center gap-1.5 flex-wrap'>
          <span className='text-sm font-medium text-gray-200'>
            {sug.origin ?? '—'}
          </span>
          <ArrowRight size={11} className='text-gray-500 shrink-0' />
          <span className='text-sm font-medium text-gray-200'>
            {sug.destination ?? '—'}
          </span>
        </div>
        {/* Metrics row */}
        <div className='flex items-center gap-3 mt-0.5 flex-wrap'>
          <span className={`text-xs font-mono font-semibold ${tier === 'strong' ? 'text-green-400' : 'text-gray-300'}`}>
            {fmtRpm(sug.rpm)}/mi
          </span>
          <span className={`text-xs ${highDeadhead ? 'text-orange-400' : 'text-gray-500'}`}>
            {fmtDeadhead(sug.deadhead)}
          </span>
          <span className='text-xs text-gray-500'>{fmt$(sug.gross_rate)} gross</span>
          {sug.broker_name && (
            <span className='text-xs text-gray-500 truncate max-w-[120px]'>{sug.broker_name}</span>
          )}
          {sug.pickup_date && (
            <span className='text-xs text-gray-500'>pu {fmtPickup(sug.pickup_date)}</span>
          )}
        </div>
        {error && (
          <p className='text-2xs text-red-400 mt-0.5'>{error}</p>
        )}
      </div>

      {/* Actions */}
      <div className='shrink-0 flex items-center gap-1.5'>
        {assigned ? (
          <span className='flex items-center gap-1 text-xs text-green-400 font-medium'>
            <CheckCircle2 size={12} /> Assigned
          </span>
        ) : (
          <>
            <button
              onClick={handleAssign}
              disabled={assigning}
              className='px-3 py-1 text-xs font-medium bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white rounded-lg transition-colors'
            >
              {assigning ? 'Saving…' : 'Assign'}
            </button>
            <button
              onClick={handleSkip}
              title='Skip — records as declined'
              className='p-1 text-gray-600 hover:text-gray-400 transition-colors rounded'
            >
              <X size={13} />
            </button>
          </>
        )}
      </div>
    </div>
  )
}

interface DriverCardProps {
  row:        MorningDispatchBriefRow
  onAssigned: () => void
}

function DriverCard({ row, onAssigned }: DriverCardProps) {
  const [expanded, setExpanded] = useState(true)

  const hasSuggestions = row.suggestions.length > 0
  const bestScore      = row.suggestions[0]?.score ?? null
  const tier           = scoreTier(bestScore)

  const driverTierResult = computeDriverTier({
    accepted_count:       row.accepted_count,
    declined_count:       row.declined_count,
    no_response_count:    row.no_response_count,
    loads_booked:         row.loads_booked,
    acceptance_rate:      row.acceptance_rate ?? 0,
    avg_response_minutes: row.avg_response_minutes,
    fallout_count:        0,
  })

  return (
    <div className='border border-surface-400 rounded-xl overflow-hidden bg-surface-700 shadow-card'>
      {/* Driver header */}
      <button
        className='w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-surface-600/40 transition-colors'
        onClick={() => setExpanded(e => !e)}
      >
        {/* Status dot */}
        <div className={`shrink-0 w-2 h-2 rounded-full ${hasSuggestions ? 'bg-orange-400' : 'bg-gray-600'}`} />

        {/* Driver info */}
        <div className='flex-1 min-w-0'>
          <div className='flex items-center gap-2 flex-wrap'>
            <span className='text-sm font-semibold text-gray-100'>{row.driver_name}</span>
            <span className={`text-2xs px-1.5 py-0.5 rounded font-bold ${TIER_BADGE[driverTierResult.tier]}`}>
              {TIER_LABEL[driverTierResult.tier] !== '—' ? `Tier ${TIER_LABEL[driverTierResult.tier]}` : 'Unrated'}
            </span>
            {row.current_location && (
              <span className='flex items-center gap-1 text-xs text-gray-400'>
                <MapPin size={10} className='shrink-0' />{row.current_location}
              </span>
            )}
            {row.min_rpm != null && (
              <span className='text-xs text-gray-500'>min {fmtRpm(row.min_rpm)}/mi</span>
            )}
          </div>
          {/* Behavior strip */}
          <div className='flex items-center gap-3 mt-0.5 flex-wrap'>
            {row.acceptance_rate != null && (
              <span className={`text-xs ${row.acceptance_rate >= 70 ? 'text-green-400' : row.acceptance_rate >= 40 ? 'text-yellow-400' : 'text-red-400'}`}>
                {Math.round(row.acceptance_rate)}% accept
              </span>
            )}
            {row.avg_response_minutes != null && (
              <span className={`flex items-center gap-0.5 text-xs ${row.avg_response_minutes > 60 ? 'text-orange-400' : 'text-gray-500'}`}>
                <Clock size={10} />{Math.round(row.avg_response_minutes)}m resp
              </span>
            )}
            {row.dispatcher_revenue_week != null && row.dispatcher_revenue_week > 0 && (
              <span className='flex items-center gap-0.5 text-xs text-gray-500'>
                <TrendingUp size={10} />{fmt$(row.dispatcher_revenue_week)} this wk
              </span>
            )}
          </div>
        </div>

        {/* Suggestion count / score badge */}
        <div className='shrink-0 flex items-center gap-2'>
          {hasSuggestions ? (
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${
              tier === 'strong'
                ? 'bg-green-900/30 text-green-400 border-green-700/40'
                : tier === 'ok'
                ? 'bg-yellow-900/30 text-yellow-400 border-yellow-700/40'
                : 'bg-surface-500 text-gray-400 border-surface-400'
            }`}>
              {row.suggestions.length} load{row.suggestions.length !== 1 ? 's' : ''}
            </span>
          ) : (
            <span className='text-xs text-gray-600'>no suggestions</span>
          )}
          <span className='text-gray-600 text-xs'>{expanded ? '▲' : '▼'}</span>
        </div>
      </button>

      {/* Suggestions list */}
      {expanded && (
        <>
          {hasSuggestions ? (
            row.suggestions.map(sug => (
              <SuggestionRow
                key={sug.load_id}
                sug={sug}
                driverId={row.driver_id}
                onAssigned={onAssigned}
              />
            ))
          ) : (
            <div className='px-4 py-3 border-t border-surface-500/40'>
              <p className='text-xs text-gray-500 italic'>
                No available loads match this driver's location. Add loads with status "Searching" to see recommendations.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function MorningDispatchBrief({ rows, loading, onAssigned }: Props) {
  const handleAssigned = () => { onAssigned?.() }

  return (
    <div className='bg-surface-700 rounded-xl border border-surface-400 shadow-card overflow-hidden'>
      {/* Section header */}
      <div className='flex items-center justify-between px-5 py-3 border-b border-surface-500/50'>
        <div className='flex items-center gap-2'>
          <Truck size={13} className={rows.length > 0 ? 'text-orange-400' : 'text-gray-600'} />
          <span className='text-sm font-semibold text-gray-100'>Morning Dispatch Brief</span>
        </div>
        {!loading && (
          <span className='text-xs text-gray-500'>
            {rows.length === 0
              ? 'No drivers need loads'
              : `${rows.length} driver${rows.length !== 1 ? 's' : ''} need${rows.length === 1 ? 's' : ''} a load`}
          </span>
        )}
      </div>

      {/* Body */}
      {loading ? (
        <div className='px-5 py-6 text-sm text-gray-500 italic'>Loading…</div>
      ) : rows.length === 0 ? (
        <div className='px-5 py-5 flex items-center gap-2.5'>
          <CheckCircle2 size={15} className='text-green-500 shrink-0' />
          <span className='text-sm text-gray-400'>All active drivers have loads assigned. Nothing to dispatch right now.</span>
        </div>
      ) : (
        <div className='p-4 space-y-3'>
          {/* Column labels */}
          <div className='flex items-center gap-3 px-4 pb-1'>
            <div className='w-8 text-right'>
              <span className='text-2xs text-gray-600 uppercase tracking-wide'>Score</span>
            </div>
            <div className='flex-1'>
              <span className='text-2xs text-gray-600 uppercase tracking-wide'>Lane / Details</span>
            </div>
            <div className='w-16' />
          </div>

          {/* Driver cards */}
          {rows.map(row => (
            <DriverCard
              key={row.driver_id}
              row={row}
              onAssigned={handleAssigned}
            />
          ))}

          {/* Legend */}
          <div className='flex items-center gap-4 px-1 pt-1'>
            <div className='flex items-center gap-1.5'>
              <AlertTriangle size={10} className='text-orange-400' />
              <span className='text-2xs text-gray-600'>High deadhead ({DEADHEAD_WARN}+ mi)</span>
            </div>
            <div className='flex items-center gap-1.5'>
              <span className='text-2xs text-green-400 font-mono font-semibold'>4.0+</span>
              <span className='text-2xs text-gray-600'>Strong score</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
