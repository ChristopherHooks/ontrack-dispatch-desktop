// ---------------------------------------------------------------------------
// Driver Performance Tier Service
// Computes A/B/C/UNRATED tier from existing scorecard + offer metrics.
// Pure function — no side effects, no imports, no schema changes required.
// ---------------------------------------------------------------------------

export type DriverTier = 'A' | 'B' | 'C' | 'UNRATED'

export interface DriverTierResult {
  tier: DriverTier
  reason?: string
}

export interface TierInput {
  accepted_count:       number
  declined_count:       number
  no_response_count:    number
  loads_booked:         number
  acceptance_rate:      number       // 0–100, pre-computed from resolved offers
  avg_response_minutes: number | null
  /** Times driver was removed from an active load before delivery. 0 = unknown/none. */
  fallout_count:        number
}

// Thresholds — tweak here only
const T = {
  MIN_RESOLVED:    3,   // minimum resolved offers before a grade is issued
  MIN_LOADS:       2,   // minimum loads booked before A/B/C can apply

  A_ACCEPTANCE:   70,   // acceptance_rate >= 70%
  A_RESPONSE:     60,   // avg_response_minutes <= 60
  A_NO_RESPONSE:   1,   // no_response_count <= 1
  A_FALLOUT:       1,   // fallout_count <= 1 required for A

  C_ACCEPTANCE:   40,   // acceptance_rate < 40% → C
  C_NO_RESPONSE:   3,   // no_response_count >= 3 → C
  C_RESPONSE:    120,   // avg_response_minutes > 120 → C
  C_FALLOUT:       2,   // fallout_count >= 2 → C (reliability failure)
}

export function computeDriverTier(input: TierInput): DriverTierResult {
  const { accepted_count, declined_count, no_response_count, loads_booked, acceptance_rate, avg_response_minutes, fallout_count } = input

  const resolved = accepted_count + declined_count + no_response_count

  // Not enough activity to grade
  if (resolved < T.MIN_RESOLVED && loads_booked < T.MIN_LOADS) {
    return { tier: 'UNRATED', reason: 'Not enough data' }
  }

  // C-tier: any single disqualifying trigger
  if (fallout_count >= T.C_FALLOUT) {
    return { tier: 'C', reason: `${fallout_count} load fallouts` }
  }
  if (acceptance_rate < T.C_ACCEPTANCE) {
    return { tier: 'C', reason: `Low acceptance rate (${Math.round(acceptance_rate)}%)` }
  }
  if (no_response_count >= T.C_NO_RESPONSE) {
    return { tier: 'C', reason: `${no_response_count} no-responses` }
  }
  if (avg_response_minutes !== null && avg_response_minutes > T.C_RESPONSE) {
    return { tier: 'C', reason: `Slow response (${Math.round(avg_response_minutes)} min avg)` }
  }

  // A-tier: all conditions must be met
  const responseOk = avg_response_minutes === null || avg_response_minutes <= T.A_RESPONSE
  if (
    acceptance_rate >= T.A_ACCEPTANCE &&
    responseOk &&
    no_response_count <= T.A_NO_RESPONSE &&
    loads_booked >= T.MIN_LOADS &&
    fallout_count <= T.A_FALLOUT
  ) {
    return { tier: 'A' }
  }

  // Default: active driver with data but not A or C
  return { tier: 'B' }
}

/** Lower rank = higher priority in sort (A first, C last) */
export function tierSortRank(tier: DriverTier): number {
  switch (tier) {
    case 'A':       return 0
    case 'B':       return 1
    case 'UNRATED': return 2
    case 'C':       return 3
  }
}

export const TIER_BADGE: Record<DriverTier, string> = {
  A:       'bg-green-900/40 text-green-400 border border-green-700/40',
  B:       'bg-yellow-900/30 text-yellow-400 border border-yellow-700/40',
  C:       'bg-red-900/40 text-red-400 border border-red-700/40',
  UNRATED: 'bg-surface-600 text-gray-500 border border-surface-400',
}

export const TIER_LABEL: Record<DriverTier, string> = {
  A:       'A',
  B:       'B',
  C:       'C',
  UNRATED: '—',
}
