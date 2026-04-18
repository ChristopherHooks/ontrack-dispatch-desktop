/**
 * Pre-booking profitability check utility.
 *
 * Uses the driver's actual resolved current location for deadhead estimation
 * rather than the load board's origin_dh value. Returns an incomplete result
 * when required inputs are missing — never fabricates numbers.
 *
 * Deadhead heuristic (no external API):
 *   Same city  →  ~10 mi
 *   Same state →  ~75 mi
 *   Cross-state → ~250 mi
 * Consistent with the Load Match placeholder used elsewhere in this app.
 */

// ---------------------------------------------------------------------------
// Configurable thresholds — tune here, not scattered across the codebase
// ---------------------------------------------------------------------------

export const PROFIT_THRESHOLDS = {
  /** estimatedNet below this → 'reject' */
  REJECT_NET:        100,
  /** estimatedNet below this (but >= REJECT_NET) → 'thin' */
  THIN_NET:          250,
  /** estimatedNet >= this (and RPM gate passes) → 'strong' */
  STRONG_NET:        400,
  /** deadheadMiles >= this → flag "long deadhead" in why-reasons */
  LONG_DEADHEAD_MI:  200,
  /** deadhead / loadedMiles > this → flag "high deadhead-to-loaded ratio" */
  HIGH_DH_RATIO:     0.30,
} as const

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ProfitBand = 'strong' | 'acceptable' | 'thin' | 'reject'

/**
 * 'actual'    — location came from the driver's current_location field directly.
 * 'estimated' — location is a fallback: active-load drop city or home_base.
 *               Numbers are still calculated but should be labelled in the UI.
 */
export type LocationBasis = 'actual' | 'estimated'

export interface ProfitInput {
  /** Driver's resolved current location string, e.g. "Dallas, TX". null = incomplete. */
  driverLocation: string | null
  /**
   * Whether the location is the driver's confirmed current_location ('actual')
   * or a fallback estimate ('estimated'). Passed through to ProfitResult for
   * display labelling — does not affect the calculation.
   */
  locationBasis: LocationBasis
  /** Driver cost-per-mile in $/mi. null = incomplete. */
  driverCpm: number | null
  /** Driver minimum acceptable RPM — optional; gates the 'strong' band. */
  driverMinRpm?: number | null
  /** Load pickup city. */
  pickupCity: string | null
  /** Load pickup state abbreviation. */
  pickupState: string | null
  /** Loaded miles (miles field from load board). */
  loadedMiles: number | null
  /** Gross rate in dollars. */
  grossRate: number | null
  /**
   * Parsed deadhead miles from the load board paste (origin_dh).
   * When present, used directly instead of the heuristic estimator.
   */
  parsedDeadheadMiles?: number | null
}

export interface ProfitResult {
  incomplete: false
  locationBasis: LocationBasis
  deadheadMiles: number
  loadedMiles: number
  totalMiles: number
  grossRevenue: number
  estimatedCost: number
  estimatedNet: number
  effectiveRpm: number
  band: ProfitBand
  /** Non-empty only for 'thin' and 'reject' bands. */
  whyReasons: string[]
}

export type MissingField = 'location' | 'cpm' | 'rate' | 'miles'

export interface ProfitIncomplete {
  incomplete: true
  missingField: MissingField
}

export type ProfitCheck = ProfitResult | ProfitIncomplete

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function estimateDeadhead(
  fromRaw: string,
  toCity: string | null,
  toState: string | null,
): number {
  const parts     = fromRaw.split(',').map(s => s.trim())
  const fromCity  = (parts[0] ?? '').toLowerCase()
  const fromState = (parts[1] ?? '').toUpperCase()
  const toSt      = (toState ?? '').toUpperCase()
  const toC       = (toCity  ?? '').toLowerCase()

  if (toSt !== '' && fromState === toSt) {
    if (toC !== '' && fromCity === toC) return 10
    return 75
  }
  return 250
}

function classifyBand(
  net: number,
  rpm: number,
  minRpm: number | null | undefined,
): ProfitBand {
  const T = PROFIT_THRESHOLDS
  if (net < T.REJECT_NET) return 'reject'
  if (net < T.THIN_NET)   return 'thin'
  if (net >= T.STRONG_NET && (minRpm == null || rpm >= minRpm)) return 'strong'
  return 'acceptable'
}

function buildWhyReasons(
  band: ProfitBand,
  deadheadMiles: number,
  loadedMiles: number,
  effectiveRpm: number,
  minRpm: number | null | undefined,
  estimatedNet: number,
): string[] {
  if (band !== 'thin' && band !== 'reject') return []
  const T = PROFIT_THRESHOLDS
  const reasons: string[] = []
  if (deadheadMiles >= T.LONG_DEADHEAD_MI) {
    reasons.push('long deadhead')
  }
  if (minRpm != null && effectiveRpm < minRpm) {
    reasons.push(
      `low effective RPM ($${effectiveRpm.toFixed(2)}/mi vs min $${minRpm.toFixed(2)}/mi)`,
    )
  }
  if (loadedMiles > 0 && deadheadMiles / loadedMiles > T.HIGH_DH_RATIO) {
    reasons.push('high deadhead-to-loaded ratio')
  }
  if (estimatedNet < T.REJECT_NET) {
    reasons.push('weak net margin')
  }
  if (reasons.length === 0) {
    reasons.push('below minimum profitability threshold')
  }
  return reasons
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function checkProfitability(input: ProfitInput): ProfitCheck {
  if (!input.driverLocation)     return { incomplete: true, missingField: 'location' }
  if (input.driverCpm == null)   return { incomplete: true, missingField: 'cpm' }
  if (input.grossRate == null)   return { incomplete: true, missingField: 'rate' }
  if (input.loadedMiles == null) return { incomplete: true, missingField: 'miles' }

  const deadheadMiles = input.parsedDeadheadMiles != null
    ? input.parsedDeadheadMiles
    : estimateDeadhead(input.driverLocation, input.pickupCity, input.pickupState)
  const loadedMiles   = input.loadedMiles
  const totalMiles    = deadheadMiles + loadedMiles
  const grossRevenue  = input.grossRate
  const estimatedCost = totalMiles * input.driverCpm
  const estimatedNet  = grossRevenue - estimatedCost
  const effectiveRpm  = totalMiles > 0 ? grossRevenue / totalMiles : 0
  const band          = classifyBand(estimatedNet, effectiveRpm, input.driverMinRpm)
  const whyReasons    = buildWhyReasons(
    band,
    deadheadMiles,
    loadedMiles,
    effectiveRpm,
    input.driverMinRpm,
    estimatedNet,
  )

  return {
    incomplete: false,
    locationBasis: input.locationBasis,
    deadheadMiles,
    loadedMiles,
    totalMiles,
    grossRevenue,
    estimatedCost,
    estimatedNet,
    effectiveRpm,
    band,
    whyReasons,
  }
}
