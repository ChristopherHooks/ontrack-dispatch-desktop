/**
 * laneSuggestionService.ts
 * Deterministic, local lane suggestion engine for dispatch search planning.
 *
 * No AI. No external services. All scoring is static + local DB history.
 *
 * How scoring works:
 *   base     = lane.priority * 10          (static freight market importance)
 *   +bonus   = toward-home preference
 *   +bonus   = strategy filter alignment
 *   +bonus   = historical lane frequency (how often this corridor was booked)
 *   +bonus   = historical average RPM on this corridor (if good)
 */

import { resolveMarket, getMarket } from '../data/freightMarkets'
import { FREIGHT_LANES }           from '../data/freightLanes'
import type { MarketKey }           from '../data/freightMarkets'
import type { TripCategory }        from '../data/freightLanes'

// ─── Public types ─────────────────────────────────────────────────────────────

export type SearchStrategy = 'all' | 'volume' | 'short' | 'home'

export interface LaneSuggestion {
  originMarket:  MarketKey
  originLabel:   string
  destMarket:    MarketKey
  destLabel:     string
  tags:          string[]
  priority:      number
  estimatedMiles: number
  tripCategory:  TripCategory
  towardHome:    boolean
  score:         number
}

/** Minimal load shape needed for historical scoring */
export interface HistoricalLoad {
  driver_id?:   number | null
  dest_city?:   string | null
  dest_state?:  string | null
  origin_city?: string | null
  origin_state?: string | null
  miles?:       number | null
  rate?:        number | null
  status?:      string
}

export interface SuggestionParams {
  currentLocation: string | null | undefined
  homeBase:        string | null | undefined
  trailerType?:    string | null | undefined
  driverId?:       number | null
  historicalLoads?: HistoricalLoad[]
  strategy?:       SearchStrategy
  limit?:          number
}

// ─── Tag display helpers ───────────────────────────────────────────────────────

const TAG_LABELS: Record<string, string> = {
  'high-volume':       'High Volume',
  'short-reposition':  'Reposition',
  'reload-market':     'Reload Mkt',
  'strong-corridor':   'Strong Lane',
  'regional':          'Regional',
  'long-haul':         'Long Haul',
  'Southeast':         'Southeast',
  'toward-home':       'Toward Home',
}

const TAG_STYLES: Record<string, string> = {
  'high-volume':       'border-green-700/40 bg-green-900/10 text-green-400',
  'strong-corridor':   'border-orange-700/40 bg-orange-900/10 text-orange-400',
  'reload-market':     'border-purple-700/40 bg-purple-900/10 text-purple-400',
  'short-reposition':  'border-gray-600/50 bg-surface-700 text-gray-400',
  'regional':          'border-gray-600/50 bg-surface-700 text-gray-500',
  'long-haul':         'border-yellow-700/40 bg-yellow-900/10 text-yellow-500',
  'Southeast':         'border-blue-700/40 bg-blue-900/10 text-blue-400',
  'toward-home':       'border-blue-600/50 bg-blue-900/20 text-blue-300',
}

export function tagLabel(tag: string): string {
  return TAG_LABELS[tag] ?? tag
}

export function tagStyle(tag: string): string {
  return TAG_STYLES[tag] ?? 'border-gray-600/50 bg-surface-700 text-gray-500'
}

// ─── Core suggestion engine ───────────────────────────────────────────────────

/**
 * Returns scored outbound lane suggestions for a driver's current location.
 * All scoring is deterministic — no randomness, no AI.
 */
export function getSuggestedLanes(params: SuggestionParams): LaneSuggestion[] {
  const {
    currentLocation,
    homeBase,
    driverId,
    historicalLoads = [],
    strategy = 'all',
    limit = 8,
  } = params

  const originKey = resolveMarket(currentLocation)
  if (!originKey) return []

  const originMarket = getMarket(originKey)
  if (!originMarket) return []

  const lanes = FREIGHT_LANES[originKey] ?? []
  if (lanes.length === 0) return []

  // Resolve home base market for toward-home scoring
  const homeKey = resolveMarket(homeBase)

  // Build historical frequency and RPM map from past loads for this driver
  // keyed by destination market key
  const histFreq = new Map<MarketKey, number>()
  const histRpm  = new Map<MarketKey, number[]>()

  const driverLoads = driverId != null
    ? historicalLoads.filter(l => l.driver_id === driverId)
    : historicalLoads

  for (const load of driverLoads) {
    if (!['Delivered', 'Invoiced', 'Paid'].includes(load.status ?? '')) continue
    const destCity = [load.dest_city, load.dest_state].filter(Boolean).join(', ')
    const mk = resolveMarket(destCity)
    if (!mk) continue

    histFreq.set(mk, (histFreq.get(mk) ?? 0) + 1)

    if (load.rate != null && load.miles != null && load.miles > 0) {
      const rpm = load.rate / load.miles
      const arr = histRpm.get(mk) ?? []
      arr.push(rpm)
      histRpm.set(mk, arr)
    }
  }

  // Score each lane
  const scored: LaneSuggestion[] = lanes.map(lane => {
    const destMarket  = getMarket(lane.dest)
    const towardHome  = !!(homeKey && lane.dest === homeKey)
    const freq        = histFreq.get(lane.dest) ?? 0
    const rpmArr      = histRpm.get(lane.dest) ?? []
    const avgRpm      = rpmArr.length > 0 ? rpmArr.reduce((s, v) => s + v, 0) / rpmArr.length : null

    // Base score
    let score = lane.priority * 10

    // Toward home bonus
    if (towardHome) score += 25

    // Historical frequency bonus (up to +30)
    score += Math.min(freq * 8, 30)

    // Historical RPM bonus — reward lanes where we've achieved good rates
    if (avgRpm != null && avgRpm >= 2.5) score += 15
    else if (avgRpm != null && avgRpm >= 2.0) score += 8

    // Strategy modifiers
    if (strategy === 'volume' && lane.tags.includes('high-volume')) score += 30
    if (strategy === 'short'  && lane.tripCategory === 'short')     score += 35
    if (strategy === 'home'   && towardHome)                        score += 40

    // Build final tag list — inject 'toward-home' if applicable and not already present
    const tags = towardHome ? ['toward-home', ...lane.tags] : [...lane.tags]

    return {
      originMarket:   originKey,
      originLabel:    originMarket.label,
      destMarket:     lane.dest,
      destLabel:      destMarket?.label ?? lane.dest,
      tags,
      priority:       lane.priority,
      estimatedMiles: lane.estimatedMiles,
      tripCategory:   lane.tripCategory,
      towardHome,
      score,
    }
  })

  // Sort by score descending, then priority as tiebreaker
  scored.sort((a, b) => b.score - a.score || b.priority - a.priority)

  return scored.slice(0, limit)
}
