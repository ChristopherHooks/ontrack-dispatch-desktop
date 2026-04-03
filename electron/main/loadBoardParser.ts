/**
 * loadBoardParser.ts
 * Two entry points:
 *  1. parseAndScore()      — Claude vision on a screenshot (base64 image)
 *  2. importAndScoreXlsx() — SheetJS parse of a .xlsx file picked via dialog
 * Both return ParseScreenshotResult so the renderer handles them identically.
 *
 * Scoring is profit-first:
 *   Primary:   estimated margin (rate - all_in_miles * cpm)
 *   Secondary: all-in RPM (rate / all_in_miles)
 *   Tertiary:  low origin deadhead, reload market, broker quality, simplicity
 */
import { claudeVision } from './claudeApi'
import { dialog } from 'electron'
import { readFileSync } from 'fs'
import * as XLSX from 'xlsx'
import type { Driver, Broker } from '../../src/types/models'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ParsedLoad {
  pickup_date:  string | null
  rate:         number | null
  rpm:          number | null   // board-displayed RPM (loaded only)
  origin_dh:    number | null   // origin deadhead miles (O-DH column)
  origin_city:  string | null
  origin_state: string | null
  dest_city:    string | null
  dest_state:   string | null
  miles:        number | null   // loaded miles
  length_ft:    number | null
  weight:       number | null
  equip:        string | null
  mode:         string | null
  company:      string | null
  d2p:          number | null
}

export interface ScoredLoad extends ParsedLoad {
  // Calculated financials
  loaded_rpm:          number | null   // rate / loaded miles
  all_in_miles:        number | null   // loaded_miles + origin_dh
  all_in_rpm:          number | null   // rate / all_in_miles
  est_cost:            number | null   // all_in_miles * cpm
  est_margin:          number | null   // rate - est_cost
  negotiation_target:  number | null   // rate needed to hit $2.75 all-in RPM
  // Ranking
  score:               number
  rank:                number
  reasons:             string[]        // why it ranks here
  skip:                boolean
  skip_reason:         string | null
  first_call_rank:     number | null   // 1 / 2 / 3 if in best-first-calls
}

export interface ParseScreenshotResult {
  loads:       ScoredLoad[]
  driver_name: string
  raw_count:   number
  error?:      string
  cancelled?:  boolean
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const NEW_AUTH_RISK_BROKERS = [
  'landstar', 'coyote', 'echo global', 'ch robinson', 'chrw',
  'transplace', 'werner', 'schneider',
]

// Cities with strong freight density / reload boards
const RELOAD_MARKETS = new Set([
  'chicago', 'atlanta', 'dallas', 'houston', 'columbus', 'indianapolis',
  'nashville', 'charlotte', 'memphis', 'st. louis', 'st louis', 'kansas city',
  'denver', 'phoenix', 'los angeles', 'seattle', 'portland', 'salt lake city',
  'cincinnati', 'louisville', 'detroit', 'cleveland', 'pittsburgh',
  'minneapolis', 'milwaukee', 'omaha', 'oklahoma city', 'raleigh', 'richmond',
  'jacksonville', 'orlando', 'miami', 'tampa', 'new orleans',
])

function isReloadMarket(city: string | null): boolean {
  if (!city) return false
  return RELOAD_MARKETS.has(city.toLowerCase())
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseTrailerLengthFt(raw: string | null): number | null {
  if (!raw) return null
  const m = raw.match(/(\d+)/)
  return m ? parseInt(m[1], 10) : null
}

function findBroker(companyName: string | null, brokers: Broker[]): Broker | undefined {
  if (!companyName) return undefined
  const lower = companyName.toLowerCase()
  return brokers.find(b => {
    const bn = (b.name ?? '').toLowerCase()
    if (!bn) return false
    const shortA = lower.substring(0, 8)
    const shortB = bn.substring(0, 8)
    return bn.includes(shortA) || lower.includes(shortB)
  })
}

// ---------------------------------------------------------------------------
// Profit-first scoring engine
// ---------------------------------------------------------------------------

function scoreLoad(load: ParsedLoad, driver: Driver, brokers: Broker[], cpm: number): ScoredLoad {
  const reasons: string[] = []
  let skip = false
  let skip_reason: string | null = null

  // --- Calculated fields ---
  const loaded_miles = load.miles
  const rate = load.rate

  const loaded_rpm = (rate != null && loaded_miles && loaded_miles > 0)
    ? rate / loaded_miles : null

  const all_in_miles = (loaded_miles != null && load.origin_dh != null)
    ? loaded_miles + load.origin_dh : null

  const all_in_rpm = (rate != null && all_in_miles && all_in_miles > 0)
    ? rate / all_in_miles : null

  const est_cost   = all_in_miles != null ? Math.round(all_in_miles * cpm) : null
  const est_margin = (rate != null && est_cost != null) ? rate - est_cost : null

  // Negotiation target: rate required to hit $2.75 all-in RPM
  const negotiation_target = (all_in_miles != null && (all_in_rpm == null || all_in_rpm < 2.75))
    ? Math.ceil(all_in_miles * 2.75 / 50) * 50   // round up to nearest $50
    : null

  // --- Hard filters (skip these entirely) ---

  // Equipment mismatch
  const equip = (load.equip ?? '').toUpperCase()
  if (equip === 'CONG') {
    if (!(driver.trailer_type ?? '').toLowerCase().includes('cong')) {
      skip = true
      skip_reason = 'CONG load — requires Conestoga trailer'
    }
  }

  // Length violation
  const trailerLen = parseTrailerLengthFt(driver.trailer_length)
  if (!skip && trailerLen && load.length_ft && load.length_ft > trailerLen) {
    skip = true
    skip_reason = `Load ${load.length_ft}ft exceeds trailer ${trailerLen}ft`
  }

  // Broker blacklisted/avoided
  const matched = findBroker(load.company, brokers)
  if (!skip && matched) {
    if (matched.flag === 'Blacklisted') {
      skip = true
      skip_reason = 'Broker blacklisted'
    } else if (matched.flag === 'Avoid') {
      skip = true
      skip_reason = 'Broker flagged Avoid'
    }
  }

  // Negative margin
  if (!skip && est_margin != null && est_margin < 0) {
    skip = true
    skip_reason = `Negative margin — est. -$${Math.abs(Math.round(est_margin))}`
  }

  // Min RPM floor check (driver setting)
  const minRpm = driver.min_rpm
  if (!skip && minRpm && loaded_rpm != null && loaded_rpm < minRpm) {
    reasons.push(`Loaded RPM $${loaded_rpm.toFixed(2)} below floor $${minRpm.toFixed(2)}`)
  }

  // --- Score (profit-first, per spec) ---
  let score = 0

  // 1. Estimated margin (primary) ----------------------------------------
  if (est_margin != null) {
    score += est_margin * 0.08
    if (est_margin >= 1000)      reasons.push(`Strong margin ~$${Math.round(est_margin)}`)
    else if (est_margin >= 600)  reasons.push(`Good margin ~$${Math.round(est_margin)}`)
    else if (est_margin >= 300)  reasons.push(`Thin margin ~$${Math.round(est_margin)}`)
    else                          reasons.push(`Weak margin ~$${Math.round(est_margin)}`)
  } else if (rate != null) {
    // No DH data — use loaded margin as fallback, apply a discount
    const fallbackCost = (loaded_miles ?? 0) * cpm
    const fallbackMargin = rate - fallbackCost
    score += fallbackMargin * 0.05
    reasons.push('DH unknown — margin estimate based on loaded miles only')
  }

  // 2. All-in RPM (secondary) --------------------------------------------
  if (all_in_rpm != null) {
    score += all_in_rpm * 8
    if (all_in_rpm >= 4.0)       reasons.push(`Excellent all-in RPM $${all_in_rpm.toFixed(2)}`)
    else if (all_in_rpm >= 3.0)  reasons.push(`Strong all-in RPM $${all_in_rpm.toFixed(2)}`)
    else if (all_in_rpm >= 2.50) reasons.push(`Fair all-in RPM $${all_in_rpm.toFixed(2)}`)
    else                          reasons.push(`Weak all-in RPM $${all_in_rpm.toFixed(2)}`)
  }

  // 3. Origin deadhead (tertiary) ----------------------------------------
  if (load.origin_dh != null) {
    if (load.origin_dh <= 5)        { score += 15; reasons.push('Zero deadhead') }
    else if (load.origin_dh <= 30)  { score += 10; reasons.push(`Light DH ${load.origin_dh}mi`) }
    else if (load.origin_dh <= 75)  { score += 4 }
    else if (load.origin_dh <= 120) { score -= 4 }
    else                             { score -= 12; reasons.push(`Heavy DH ${load.origin_dh}mi`) }
  }

  // 4. Destination reload potential --------------------------------------
  if (isReloadMarket(load.dest_city)) {
    score += 5
    reasons.push(`Good reload market — ${load.dest_city}`)
  }

  // 5. Broker quality ----------------------------------------------------
  if (matched) {
    if (matched.flag === 'Slow Pay')  { score -= 8;  reasons.push('Known slow pay') }
    else if (matched.flag === 'Preferred') { score += 8; reasons.push('Preferred broker') }
  }
  if (NEW_AUTH_RISK_BROKERS.some(n => (load.company ?? '').toLowerCase().includes(n))) {
    score -= 5
    reasons.push('May require established authority')
  }

  // 6. Simplicity --------------------------------------------------------
  if (load.mode === 'TL')        { score += 3 }
  else if (load.mode === 'LTL')  { score -= 8; reasons.push('LTL') }
  else if (load.mode === 'PTL')  { score -= 3 }

  // D2P bonus
  if (load.d2p != null) {
    if (load.d2p <= 10)      { score += 8; reasons.push(`Fast pay ${load.d2p}d`) }
    else if (load.d2p <= 15) { score += 4; reasons.push(`Quick pay ${load.d2p}d`) }
    else if (load.d2p > 35)  { score -= 3 }
  }

  return {
    ...load,
    loaded_rpm,
    all_in_miles,
    all_in_rpm,
    est_cost,
    est_margin,
    negotiation_target,
    score,
    rank:            0,
    reasons,
    skip,
    skip_reason,
    first_call_rank: null,
  }
}

// Sort and rank; mark top 3 non-skipped as first-call candidates
function rankLoads(loads: ScoredLoad[]): ScoredLoad[] {
  loads.sort((a, b) => {
    if (a.skip !== b.skip) return a.skip ? 1 : -1
    return b.score - a.score
  })
  let callRank = 1
  loads.forEach((l, i) => {
    l.rank = i + 1
    if (!l.skip && callRank <= 3) {
      l.first_call_rank = callRank++
    }
  })
  return loads
}

// ---------------------------------------------------------------------------
// Claude vision extraction prompt
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT =
  'You are a data extraction assistant. Extract structured data from trucking load board screenshots. ' +
  'Return only valid JSON arrays with no markdown, no code fences, no explanation.'

const EXTRACTION_PROMPT =
  'Extract every visible load row from this Truckstop load board screenshot into a JSON array.\n\n' +
  'Each element must have these exact keys (null if the column is blank or not visible):\n' +
  '- pickup_date: string  (e.g. "3/23")\n' +
  '- rate: number         (dollar amount, no $ symbol)\n' +
  '- rpm: number          (rate per mile, no $ symbol)\n' +
  '- origin_dh: number    (O-DH column — origin deadhead in miles)\n' +
  '- origin_city: string\n' +
  '- origin_state: string (2-letter abbreviation)\n' +
  '- dest_city: string\n' +
  '- dest_state: string   (2-letter abbreviation)\n' +
  '- miles: number        (Distance column)\n' +
  '- length_ft: number    (Length column in feet, numeric only)\n' +
  '- weight: number       (Weight column in lbs)\n' +
  '- equip: string        (Equip column: F, FSD, CONG, etc)\n' +
  '- mode: string         (Mode column: TL, LTL, PTL)\n' +
  '- company: string      (Company column — broker/carrier name, full visible text)\n' +
  '- d2p: number          (D2P column — days to pay, strip asterisks, numeric only)\n\n' +
  'Return ONLY the JSON array. No other text.'

// ---------------------------------------------------------------------------
// parseAndScore — screenshot (vision) path
// ---------------------------------------------------------------------------

export async function parseAndScore(
  apiKey:      string,
  imageBase64: string,
  mediaType:   'image/png' | 'image/jpeg' | 'image/webp',
  driver:      Driver,
  brokers:     Broker[],
  cpm:         number = 0.75,
): Promise<ParseScreenshotResult> {
  const result = await claudeVision(apiKey, imageBase64, mediaType, EXTRACTION_PROMPT, SYSTEM_PROMPT, 4096)

  if (!result.ok) {
    return { loads: [], driver_name: driver.name, raw_count: 0, error: result.error }
  }

  let rawLoads: ParsedLoad[] = []
  try {
    const jsonMatch = result.content.match(/\[[\s\S]*\]/)
    if (!jsonMatch) {
      return { loads: [], driver_name: driver.name, raw_count: 0, error: 'No JSON array found in Claude response' }
    }
    rawLoads = JSON.parse(jsonMatch[0]) as ParsedLoad[]
    if (!Array.isArray(rawLoads)) throw new Error('Not an array')
  } catch (e) {
    return { loads: [], driver_name: driver.name, raw_count: 0, error: 'Failed to parse response: ' + String(e) }
  }

  const scored = rankLoads(rawLoads.map(l => scoreLoad(l, driver, brokers, cpm)))
  return { loads: scored, driver_name: driver.name, raw_count: rawLoads.length }
}

// ---------------------------------------------------------------------------
// XLSX import path
// ---------------------------------------------------------------------------

function mapHeader(raw: string): keyof ParsedLoad | null {
  const h = raw.trim().toLowerCase().replace(/[^a-z0-9]/g, '')
  if (/^pickup/.test(h) || h === 'date')                                    return 'pickup_date'
  if (h === 'rate' || h === 'rateusd' || h === 'rate$' || h === 'price')    return 'rate'
  if (h === 'rpm' || h === 'ratepermile' || h === 'ratepermi')              return 'rpm'
  if (h === 'odh' || h === 'origindh' || h === 'deadhead' || h === 'dh')   return 'origin_dh'
  if (h === 'ocity' || h === 'origincity' || h === 'origin')                return 'origin_city'
  if (h === 'ost' || h === 'originstate' || h === 'ostate')                 return 'origin_state'
  if (h === 'dcity' || h === 'destcity' || h === 'destination')             return 'dest_city'
  if (h === 'dst' || h === 'deststate' || h === 'dstate')                   return 'dest_state'
  if (h === 'distance' || h === 'miles' || h === 'mi')                      return 'miles'
  if (h === 'length' || h === 'lengthft' || h === 'len')                    return 'length_ft'
  if (h === 'weight' || h === 'weightlbs' || h === 'wt')                    return 'weight'
  if (h === 'equip' || h === 'equipment' || h === 'trailtype')              return 'equip'
  if (h === 'mode' || h === 'loadtype' || h === 'type')                     return 'mode'
  if (h === 'company' || h === 'broker' || h === 'carrier' || h === 'shipper') return 'company'
  if (h === 'd2p' || h === 'daystopay' || h === 'payday' || h === 'dtp')    return 'd2p'
  return null
}

function parseNum(v: unknown): number | null {
  if (v == null || v === '') return null
  const n = parseFloat(String(v).replace(/[$,*\s]/g, ''))
  return isNaN(n) ? null : n
}

function parseStr(v: unknown): string | null {
  if (v == null || v === '') return null
  return String(v).trim() || null
}

function rowToLoad(row: Record<string, unknown>, colMap: Map<string, keyof ParsedLoad>): ParsedLoad {
  const load: ParsedLoad = {
    pickup_date: null, rate: null, rpm: null, origin_dh: null,
    origin_city: null, origin_state: null, dest_city: null, dest_state: null,
    miles: null, length_ft: null, weight: null, equip: null, mode: null,
    company: null, d2p: null,
  }
  for (const [col, field] of colMap.entries()) {
    const val = row[col]
    if (field === 'pickup_date' || field === 'origin_city' || field === 'origin_state' ||
        field === 'dest_city'   || field === 'dest_state'  || field === 'equip' ||
        field === 'mode'        || field === 'company') {
      (load[field] as string | null) = parseStr(val)
    } else {
      (load[field] as number | null) = parseNum(val)
    }
  }
  return load
}

export async function importAndScoreXlsx(
  driver:  Driver,
  brokers: Broker[],
  cpm:     number = 0.75,
): Promise<ParseScreenshotResult> {
  const picked = await dialog.showOpenDialog({
    title:      'Select load board export',
    filters:    [{ name: 'Excel / CSV files', extensions: ['xlsx', 'xls', 'csv'] }],
    properties: ['openFile'],
  })
  if (picked.canceled || !picked.filePaths.length) {
    return { loads: [], driver_name: driver.name, raw_count: 0, cancelled: true }
  }

  try {
    const buf      = readFileSync(picked.filePaths[0])
    const workbook = XLSX.read(buf, { type: 'buffer' })
    const sheet    = workbook.Sheets[workbook.SheetNames[0]]
    const rows     = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null })

    if (!rows.length) {
      return { loads: [], driver_name: driver.name, raw_count: 0, error: 'No data rows found in file' }
    }

    const colMap = new Map<string, keyof ParsedLoad>()
    for (const key of Object.keys(rows[0])) {
      const field = mapHeader(key)
      if (field) colMap.set(key, field)
    }

    if (!colMap.size) {
      return {
        loads: [], driver_name: driver.name, raw_count: 0,
        error: 'Could not recognize column headers. Expected: Rate, RPM, O-City, D-City, Distance, Company, D2P etc.',
      }
    }

    const rawLoads = rows
      .map(r => rowToLoad(r, colMap))
      .filter(l => l.rate != null || l.origin_city != null || l.company != null)

    const scored = rankLoads(rawLoads.map(l => scoreLoad(l, driver, brokers, cpm)))
    return { loads: scored, driver_name: driver.name, raw_count: rawLoads.length }
  } catch (e) {
    return { loads: [], driver_name: driver.name, raw_count: 0, error: 'Failed to read file: ' + String(e) }
  }
}
