import type Database from 'better-sqlite3'
import { searchCarriersByName, getCarrierSafer, getCarrierDockets } from './fmcsaApi'

// Days since a date string (YYYY-MM-DD). Returns null if date is missing.
function daysSince(dateStr: string | null): number | null {
  if (!dateStr) return null
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24))
}
import type { ApiCarrier } from './fmcsaApi'

export interface FmcsaImportResult {
  leadsFound:        number
  leadsAdded:        number
  duplicatesSkipped: number
  failedEnrichment:  number   // carriers where SAFER/dockets lookup timed out or failed
  usedFallback:      boolean  // true when the 0-365 day fallback window was used
  errors:            string[]
}

export interface FmcsaImportStatus {
  lastAttemptedAt:   string | null
  lastSuccessAt:     string | null
  source:            'manual' | 'scheduled' | null
  leadsFound:        number
  leadsAdded:        number
  duplicatesSkipped: number
  failedEnrichment:  number
  lastError:         string | null
}

/**
 * Default search terms. Each term becomes one paginated set of API calls to
 * /carriers/name/{term} (up to 3 pages × 50 results = 150 per term).
 * State names work well because many owner-operators name their company after
 * their home state (e.g. 'Texas Freight LLC', 'Georgia Transport Inc').
 *
 * Terms are ordered by freight volume. The top 8 states by freight tonnage
 * account for the majority of small-carrier new authorities.
 * Override via Settings > Integrations > Search Terms.
 */
export const DEFAULT_SEARCH_TERMS = [
  // User's primary operating states
  'Oklahoma', 'Arkansas', 'Alabama',
  // Core SE / Southcentral freight corridor
  'Texas', 'Tennessee', 'Georgia', 'Mississippi', 'Louisiana',
  // Midwest connections into the corridor
  'Missouri', 'Illinois', 'Indiana', 'Kentucky',
  // Extended SE and Mid-Atlantic
  'Ohio', 'North Carolina', 'South Carolina', 'Virginia', 'Florida',
  // Central plains and mountain corridor (TX/OK connections)
  'Kansas', 'Nebraska', 'Colorado',
  // Upper Midwest (high freight tonnage)
  'Michigan', 'Wisconsin', 'Iowa', 'Minnesota',
  // Northeast high-volume
  'Pennsylvania', 'New Jersey',
  // Industry keyword terms — find carriers whose names contain common trucking
  // words regardless of geography. These access a completely different carrier
  // pool than the state-name terms above and are critical once the geographic
  // pool saturates.
  'Trucking', 'Transport', 'Hauling', 'Freight', 'Express', 'Logistics',
  'Carrier', 'Dispatch', 'Solutions', 'Services',
]

/**
 * Authority age window for "ideal" leads — 30 to 365 days since MC grant.
 * New authorities in this window are still figuring out dispatch and are
 * the most receptive to outreach.
 */
export const AUTHORITY_MIN_DAYS = 30
export const AUTHORITY_MAX_DAYS = 365

/**
 * Priority based on authority age and fleet size.
 * High   = 30–180 days old AND 1–3 trucks (brand-new small fleet — prime target)
 * Medium = 30–180 days old OR 1–3 trucks (partially meets target criteria)
 * Low    = older authority with no small-fleet signal
 */
function computePriority(authorityDate: string | null, fleetSize: number | null): 'High' | 'Medium' | 'Low' {
  const smallFleet = fleetSize !== null && fleetSize >= 1 && fleetSize <= 3
  if (!authorityDate) return smallFleet ? 'Medium' : 'Low'
  const daysOld = Math.floor((Date.now() - new Date(authorityDate).getTime()) / (1000 * 60 * 60 * 24))
  const newAuthority = daysOld >= 30 && daysOld <= 180
  if (newAuthority && smallFleet) return 'High'
  if (newAuthority || smallFleet) return 'Medium'
  return 'Low'
}

function formatPhone(raw: string): string {
  const d = raw.replace(/[^0-9]/g, '')
  if (d.length === 10)
    return '(' + d.slice(0, 3) + ') ' + d.slice(3, 6) + '-' + d.slice(6)
  if (d.length === 11 && d[0] === '1')
    return '(' + d.slice(1, 4) + ') ' + d.slice(4, 7) + '-' + d.slice(7)
  // Return null for unrecognised formats rather than storing garbage
  return ''
}

function toTitleCase(s: string): string {
  return s.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')
}

/**
 * Convert an FMCSA authority date to ISO "YYYY-MM-DD".
 * The FMCSA detail endpoint returns dates in one of two formats depending
 * on the API version; both are handled here:
 *   "MM/DD/YYYY"              → older format from the detail endpoint
 *   "YYYY-MM-DDTHH:mm:ss..."  → ISO datetime (newer detail endpoint responses)
 *   "YYYY-MM-DD"              → plain ISO date (some responses)
 * Returns null for any string that doesn't match a known pattern.
 */
function parseMcs150Date(raw: string | null): string | null {
  if (!raw) return null
  const s = raw.trim()
  // MM/DD/YYYY
  const mdy = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s)
  if (mdy) return mdy[3] + '-' + mdy[1].padStart(2, '0') + '-' + mdy[2].padStart(2, '0')
  // ISO datetime "YYYY-MM-DDTHH:mm:ss" or "YYYY-MM-DDThh:mm:ss.sssZ"
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(s)
  if (iso) return iso[1] + '-' + iso[2] + '-' + iso[3]
  return null
}

// ---------------------------------------------------------------------------
// Import metadata helpers — persist run results to app_settings table
// ---------------------------------------------------------------------------

export function writeImportMeta(
  db:     Database.Database,
  result: FmcsaImportResult,
  source: 'manual' | 'scheduled',
): void {
  const now = new Date().toISOString()
  const set = (key: string, val: string) =>
    db.prepare("INSERT OR REPLACE INTO app_settings (key, value, updated_at) VALUES (?, ?, datetime('now'))").run(key, val)
  set('fmcsa_last_attempted_at', now)
  if (result.errors.length === 0) set('fmcsa_last_success_at', now)
  set('fmcsa_last_source',  source)
  set('fmcsa_last_found',   String(result.leadsFound))
  set('fmcsa_last_added',   String(result.leadsAdded))
  set('fmcsa_last_skipped', String(result.duplicatesSkipped))
  set('fmcsa_last_failed',  String(result.failedEnrichment))
  set('fmcsa_last_error',   result.errors.join('; '))
}

export function readImportStatus(db: Database.Database): FmcsaImportStatus {
  const get = (key: string): string | null => {
    const r = db.prepare('SELECT value FROM app_settings WHERE key = ?').get(key) as { value: string } | undefined
    return r?.value ?? null
  }
  return {
    lastAttemptedAt:   get('fmcsa_last_attempted_at'),
    lastSuccessAt:     get('fmcsa_last_success_at'),
    source:            get('fmcsa_last_source') as 'manual' | 'scheduled' | null,
    leadsFound:        parseInt(get('fmcsa_last_found')   ?? '0', 10) || 0,
    leadsAdded:        parseInt(get('fmcsa_last_added')   ?? '0', 10) || 0,
    duplicatesSkipped: parseInt(get('fmcsa_last_skipped') ?? '0', 10) || 0,
    failedEnrichment:  parseInt(get('fmcsa_last_failed')  ?? '0', 10) || 0,
    lastError:         get('fmcsa_last_error') || null,
  }
}

// ---------------------------------------------------------------------------
// Backfill — re-enriches existing FMCSA leads from SAFER + re-prioritizes
// ---------------------------------------------------------------------------

export interface BackfillResult {
  reprioritized: number  // leads whose priority was updated from existing data
  enriched:      number  // leads that received new fleet_size (or auth date) from SAFER
  repaired:      number  // leads whose name was corrected from SAFER legal name
  errors:        string[]
}

/**
 * Two-phase backfill for existing FMCSA leads:
 *
 * Phase 1 (instant, no network):
 *   Re-computes priority for every FMCSA lead using whatever authority_date
 *   and fleet_size is already stored. Fixes leads stuck at the schema default "Medium".
 *
 * Phase 2 (network, ~150 ms/lead):
 *   For leads still missing fleet_size, scrapes the SAFER snapshot page to
 *   retrieve Power Units and fill any missing authority_date, then re-prioritizes.
 *   A 150 ms pause between requests keeps traffic to the government server polite.
 */
export async function backfillLeadData(db: Database.Database): Promise<BackfillResult> {
  const errors: string[] = []

  // ── Phase 1: Re-prioritize from existing data ───────────────────────────
  type LeadRow = { id: number; authority_date: string | null; fleet_size: number | null }
  const allFmcsa = db.prepare(
    "SELECT id, authority_date, fleet_size FROM leads WHERE dot_number IS NOT NULL"
  ).all() as LeadRow[]

  const setPriority = db.prepare("UPDATE leads SET priority = ? WHERE id = ?")
  for (const lead of allFmcsa) {
    setPriority.run(computePriority(lead.authority_date, lead.fleet_size), lead.id)
  }
  const reprioritized = allFmcsa.length

  // ── Phase 2: SAFER scrape for leads missing fleet_size or state ─────────
  type NeedsEnrichRow = { id: number; dot_number: string; authority_date: string | null; state: string | null }
  const needsEnrich = db.prepare(
    "SELECT id, dot_number, authority_date, state FROM leads WHERE dot_number IS NOT NULL AND (fleet_size IS NULL OR state IS NULL OR state = '')"
  ).all() as NeedsEnrichRow[]

  const setEnriched = db.prepare(
    "UPDATE leads SET fleet_size = ?, authority_date = COALESCE(authority_date, ?), state = COALESCE(NULLIF(state, ''), ?), priority = ? WHERE id = ?"
  )

  let enriched = 0
  for (const lead of needsEnrich) {
    try {
      const safer        = await getCarrierSafer(Number(lead.dot_number))
      const authorityDate = safer.mcs150Date
        ? parseMcs150Date(safer.mcs150Date)
        : lead.authority_date
      const fleetSize = safer.fleetSize
      const state     = safer.state ?? lead.state
      const priority  = computePriority(authorityDate, fleetSize)
      setEnriched.run(fleetSize, authorityDate, state, priority, lead.id)
      enriched++
      // Brief pause — be polite to the government server
      await new Promise(r => setTimeout(r, 150))
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      errors.push('DOT ' + lead.dot_number + ': ' + msg)
    }
  }

  // ── Phase 3: Name repair for leads with corrupted or missing name data ───
  // Targets leads whose name is blank, only 1-2 chars, or matches a known
  // field value (trailer type, status, state code) instead of a real carrier name.
  const KNOWN_BAD = new Set([
    'dry van', 'reefer', 'flatbed', 'tanker', 'step deck', 'rgn', 'lowboy',
    'new', 'contacted', 'interested', 'attempted', 'rejected', 'signed', 'converted',
    'high', 'medium', 'low', 'fmcsa', 'csv import', 'spreadsheet',
  ])
  type NeedsNameRow = { id: number; dot_number: string; name: string }
  const needsName = (db.prepare(
    "SELECT id, dot_number, name FROM leads WHERE dot_number IS NOT NULL"
  ).all() as NeedsNameRow[]).filter(r => {
    const n = (r.name ?? '').trim()
    return n.length <= 2 || KNOWN_BAD.has(n.toLowerCase())
  })

  const setName = db.prepare("UPDATE leads SET name = ? WHERE id = ?")
  let repaired = 0
  for (const lead of needsName) {
    try {
      const safer = await getCarrierSafer(Number(lead.dot_number))
      if (safer.legalName) {
        const fixed = safer.legalName
          .split(' ')
          .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
          .join(' ')
        setName.run(fixed, lead.id)
        repaired++
      }
      await new Promise(r => setTimeout(r, 150))
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      errors.push('Name repair DOT ' + lead.dot_number + ': ' + msg)
    }
  }

  console.log('[FMCSA] Backfill complete. Reprioritized:', reprioritized, 'Enriched:', enriched, 'Names repaired:', repaired)
  return { reprioritized, enriched, repaired, errors }
}

// ---------------------------------------------------------------------------
// Main entry point called by IPC handler for manual import
// ---------------------------------------------------------------------------
export async function importFmcsaLeads(
  db:                  Database.Database,
  webKey?:             string,
  searchTerms:         string[] = DEFAULT_SEARCH_TERMS,
  onlyNewAuthorities = true,   // when true, skip carriers outside 30–180 day window
  targetLeads        = 30,     // stop adding once this many new leads are inserted
): Promise<FmcsaImportResult> {
  if (!webKey) {
    console.warn('[FMCSA] Import attempted with no web key — aborting.')
    return {
      leadsFound: 0, leadsAdded: 0, duplicatesSkipped: 0,
      errors: ['No FMCSA web key configured. Add your key in Settings > Integrations.'],
    }
  }

  const errors: string[] = []
  let leadsFound = 0, leadsAdded = 0, duplicatesSkipped = 0, failedEnrichment = 0
  let usedFallback = false

  // Carriers that passed enrichment but were outside the strict 30-180 day window.
  // Used as a no-HTTP-call fallback if the strict pass yields 0 new leads.
  type FallbackCarrier = {
    name: string; city: string; state: string; dotStr: string
    mcNumber: string; authorityDate: string | null; fleetSize: number | null
    rawPhone: string | null
  }
  const fallbackCarriers: FallbackCarrier[] = []

  // Track DOT numbers seen this run to avoid intra-batch duplicates
  const seenDot = new Set<string>()

  // Dedup query now uses dot_number (migration 006 moved DOT values there)
  const dupCheck = db.prepare('SELECT id FROM leads WHERE dot_number = ?')

  const ins = db.prepare(
    'INSERT INTO leads' +
    ' (name, company, phone, city, state, dot_number, mc_number, authority_date,' +
    '  fleet_size, status, priority, source, notes, created_at)' +
    ' VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  )

  console.log('[FMCSA] Starting import with', searchTerms.length, 'search terms (target:', targetLeads, 'new leads)')

  let reachedTarget = false

  for (const term of searchTerms) {
    if (reachedTarget) break

    try {
      console.log('[FMCSA] Searching for term:', term)
      const carriers: ApiCarrier[] = await searchCarriersByName(webKey, term)
      leadsFound += carriers.length
      console.log('[FMCSA] Found', carriers.length, 'carriers for term:', term)

      for (const c of carriers) {
        // Skip carriers without active common authority
        if (c.commonAuthorityStatus !== 'A') continue
        if (c.allowedToOperate !== 'Y') continue

        const dotStr = String(c.dotNumber)

        // Intra-batch dedup
        if (seenDot.has(dotStr)) { duplicatesSkipped++; continue }
        seenDot.add(dotStr)

        // DB dedup — uses dot_number column (correctly populated by migration 006)
        if (dupCheck.get(dotStr)) { duplicatesSkipped++; continue }

        const name  = toTitleCase(c.legalName || c.dbaName || '')
        const city  = toTitleCase(c.phyCity || '')
        const state = (c.phyState || '').toUpperCase()
        const now   = new Date().toISOString()

        // ── Enrichment pass ────────────────────────────────────────────────
        // Uses allSettled so a SAFER scrape failure does not block the dockets
        // lookup. Previously, Promise.all would throw if either call failed,
        // leaving mcNumber = null and silently dropping valid carriers.
        let mcNumber:      string | null = null
        let authorityDate: string | null = null
        let fleetSize:     number | null = null
        // Start with the name-search telephone; enrich below if possible
        let rawPhone: string | null = c.telephone

        const [saferResult, docketsResult] = await Promise.allSettled([
          getCarrierSafer(c.dotNumber),
          getCarrierDockets(webKey, c.dotNumber),
        ])

        // Count carriers where any enrichment call failed (SAFER timeout, API error, etc.)
        if (saferResult.status === 'rejected' || docketsResult.status === 'rejected') {
          failedEnrichment++
        }

        // Polite pause between per-carrier SAFER requests — prevents rate-limit timeouts
        // on rapid back-to-back calls when processing many carriers per search term
        await new Promise(r => setTimeout(r, 120))

        if (saferResult.status === 'fulfilled') {
          const safer = saferResult.value
          // Phone from SAFER
          if (safer.phone) rawPhone = safer.phone
          // Authority date from SAFER MCS-150 Form Date ("MM/DD/YYYY" → "YYYY-MM-DD")
          if (safer.mcs150Date) authorityDate = parseMcs150Date(safer.mcs150Date)
          // Fleet size (Power Units) from SAFER
          if (safer.fleetSize !== null) fleetSize = safer.fleetSize
        } else {
          console.warn('[FMCSA] SAFER scrape failed for DOT ' + dotStr + ' (non-fatal):',
            saferResult.reason instanceof Error ? saferResult.reason.message : String(saferResult.reason))
        }

        // docketsLookupFailed = true means the API call threw (timeout, 500, etc.)
        // docketsLookupFailed = false means the call succeeded but may have returned []
        let docketsLookupFailed = false
        if (docketsResult.status === 'fulfilled') {
          const mcDocket = docketsResult.value.find(d => d.prefix === 'MC')
          if (mcDocket) mcNumber = 'MC-' + mcDocket.docketNumber
        } else {
          docketsLookupFailed = true
          console.warn('[FMCSA] Dockets lookup failed for DOT ' + dotStr + ' (non-fatal):',
            docketsResult.reason instanceof Error ? docketsResult.reason.message : String(docketsResult.reason))
        }

        console.log(
          '[FMCSA] Enriched DOT', dotStr,
          '| MC:', mcNumber ?? (docketsLookupFailed ? 'lookup-failed' : 'none'),
          '| Phone:', rawPhone ?? 'none',
          '| AuthDate:', authorityDate ?? 'none',
          '| FleetSize:', fleetSize ?? 'unknown',
        )

        // Skip carriers with no MC docket only when the lookup SUCCEEDED and
        // confirmed there is no MC docket. If the lookup failed (timeout, API
        // error) we give the carrier the benefit of the doubt — it has active
        // common authority, so it is likely for-hire and worth importing.
        if (!docketsLookupFailed && !mcNumber) { duplicatesSkipped++; continue }

        // Skip carriers outside the 30–180 day new-authority window when
        // onlyNewAuthorities is set. Carriers with no authority date are kept
        // (we cannot confirm their age, so we give them the benefit of the doubt).
        // Carriers that fail the strict window but are within 0-365 days are cached
        // for a fallback pass that runs only if the strict pass yields 0 new leads.
        if (onlyNewAuthorities && authorityDate !== null) {
          const age = daysSince(authorityDate)
          if (age !== null && (age < AUTHORITY_MIN_DAYS || age > AUTHORITY_MAX_DAYS)) {
            console.log('[FMCSA] Skipping DOT ' + dotStr + ' — authority age ' + age + ' days (outside 30–180 window)')
            if (age >= 0 && age <= 365) {
              fallbackCarriers.push({ name, city, state, dotStr, mcNumber, authorityDate, fleetSize, rawPhone })
            }
            duplicatesSkipped++
            continue
          }
        }

        const phone    = rawPhone ? (formatPhone(rawPhone) || null) : null
        const priority = computePriority(authorityDate, fleetSize)

        ins.run(
          name, null, phone, city, state,
          dotStr,        // dot_number
          mcNumber,      // mc_number  (real MC# or null)
          authorityDate, // authority_date  ("YYYY-MM-DD" or null)
          fleetSize,     // fleet_size (Power Units from SAFER, or null)
          'New',         // status
          priority,      // computed from authority age + fleet size
          'FMCSA', 'Imported from FMCSA SAFER database.', now
        )
        leadsAdded++

        // Stop once the target is met — no need to exhaust all search terms
        if (leadsAdded >= targetLeads) {
          console.log('[FMCSA] Target of ' + targetLeads + ' new leads reached — stopping import.')
          reachedTarget = true
          break
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error('[FMCSA] Error for term "' + term + '":', msg)
      errors.push('Search "' + term + '": ' + msg)
    }
  }

  // ── Fallback pass ──────────────────────────────────────────────────────────
  // If the strict 30-180 day window produced nothing, insert carriers already
  // enriched this run that fall within the wider 0-365 day window.
  // No additional HTTP calls are made — enrichment data was already fetched above.
  if (leadsAdded < 5 && onlyNewAuthorities && fallbackCarriers.length > 0) {
    usedFallback = true
    console.log('[FMCSA] Fewer than 5 leads in authority window — fallback to 0-365 day window (' + fallbackCarriers.length + ' candidates)')
    const now = new Date().toISOString()
    for (const fb of fallbackCarriers) {
      if (leadsAdded >= targetLeads) break
      const phone    = fb.rawPhone ? (formatPhone(fb.rawPhone) || null) : null
      const priority = computePriority(fb.authorityDate, fb.fleetSize)
      ins.run(
        fb.name, null, phone, fb.city, fb.state,
        fb.dotStr, fb.mcNumber, fb.authorityDate, fb.fleetSize,
        'New', priority, 'FMCSA', 'Imported from FMCSA SAFER database.', now
      )
      leadsAdded++
    }
    if (leadsAdded > 0) console.log('[FMCSA] Fallback pass added ' + leadsAdded + ' leads (0-365 day window)')
  }

  console.log('[FMCSA] Import complete. Found:', leadsFound, 'Added:', leadsAdded, 'Skipped:', duplicatesSkipped, 'Failed enrichment:', failedEnrichment, 'Used fallback:', usedFallback)
  return { leadsFound, leadsAdded, duplicatesSkipped, failedEnrichment, usedFallback, errors }
}
