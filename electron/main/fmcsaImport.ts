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
  errors:            string[]
}

export interface FmcsaImportStatus {
  lastAttemptedAt:   string | null
  lastSuccessAt:     string | null
  source:            'manual' | 'scheduled' | null
  leadsFound:        number
  leadsAdded:        number
  duplicatesSkipped: number
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
  // High-volume freight corridor states (by annual freight tonnage)
  'Texas', 'Georgia', 'Illinois', 'Tennessee', 'Ohio',
  'Florida', 'Indiana', 'Pennsylvania',
]

/**
 * Authority age window for "ideal" leads — 30 to 180 days since MC grant.
 * New authorities in this window are still figuring out dispatch and are
 * the most receptive to outreach. Older carriers are already set in their ways.
 */
export const AUTHORITY_MIN_DAYS = 30
export const AUTHORITY_MAX_DAYS = 180

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
    lastError:         get('fmcsa_last_error') || null,
  }
}

// ---------------------------------------------------------------------------
// Backfill — re-enriches existing FMCSA leads from SAFER + re-prioritizes
// ---------------------------------------------------------------------------

export interface BackfillResult {
  reprioritized: number  // leads whose priority was updated from existing data
  enriched:      number  // leads that received new fleet_size (or auth date) from SAFER
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

  // ── Phase 2: SAFER scrape for leads missing fleet_size ──────────────────
  type NeedsEnrichRow = { id: number; dot_number: string; authority_date: string | null }
  const needsEnrich = db.prepare(
    "SELECT id, dot_number, authority_date FROM leads WHERE dot_number IS NOT NULL AND fleet_size IS NULL"
  ).all() as NeedsEnrichRow[]

  const setEnriched = db.prepare(
    "UPDATE leads SET fleet_size = ?, authority_date = COALESCE(authority_date, ?), priority = ? WHERE id = ?"
  )

  let enriched = 0
  for (const lead of needsEnrich) {
    try {
      const safer        = await getCarrierSafer(Number(lead.dot_number))
      const authorityDate = safer.mcs150Date
        ? parseMcs150Date(safer.mcs150Date)
        : lead.authority_date
      const fleetSize = safer.fleetSize
      const priority  = computePriority(authorityDate, fleetSize)
      setEnriched.run(fleetSize, authorityDate, priority, lead.id)
      enriched++
      // Brief pause — be polite to the government server
      await new Promise(r => setTimeout(r, 150))
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      errors.push('DOT ' + lead.dot_number + ': ' + msg)
    }
  }

  console.log('[FMCSA] Backfill complete. Reprioritized:', reprioritized, 'Enriched:', enriched)
  return { reprioritized, enriched, errors }
}

// ---------------------------------------------------------------------------
// Main entry point called by IPC handler for manual import
// ---------------------------------------------------------------------------
export async function importFmcsaLeads(
  db:                  Database.Database,
  webKey?:             string,
  searchTerms:         string[] = DEFAULT_SEARCH_TERMS,
  onlyNewAuthorities = true,   // when true, skip carriers outside 30–180 day window
): Promise<FmcsaImportResult> {
  if (!webKey) {
    console.warn('[FMCSA] Import attempted with no web key — aborting.')
    return {
      leadsFound: 0, leadsAdded: 0, duplicatesSkipped: 0,
      errors: ['No FMCSA web key configured. Add your key in Settings > Integrations.'],
    }
  }

  const errors: string[] = []
  let leadsFound = 0, leadsAdded = 0, duplicatesSkipped = 0

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

  console.log('[FMCSA] Starting import with', searchTerms.length, 'search terms')

  for (const term of searchTerms) {
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
        // Only called for genuinely new carriers (~20 per run after dedup).
        // Fetches: MC/docket number + mcs150Date (authority date) + better phone.
        let mcNumber:      string | null = null
        let authorityDate: string | null = null
        let fleetSize:     number | null = null
        // Start with the name-search telephone; enrich below if possible
        let rawPhone: string | null = c.telephone

        try {
          // getCarrierSafer scrapes the public SAFER snapshot page (same source
          // the legacy Python scraper used) — the QC API does not reliably carry
          // phone, authority date, or fleet size for most carriers.
          // getCarrierDockets fetches the MC/docket number (already working).
          const [safer, dockets] = await Promise.all([
            getCarrierSafer(c.dotNumber),
            getCarrierDockets(webKey, c.dotNumber),
          ])

          // Phone from SAFER
          if (safer.phone) rawPhone = safer.phone

          // Authority date from SAFER MCS-150 Form Date ("MM/DD/YYYY" → "YYYY-MM-DD")
          if (safer.mcs150Date) authorityDate = parseMcs150Date(safer.mcs150Date)

          // Fleet size (Power Units) from SAFER
          if (safer.fleetSize !== null) fleetSize = safer.fleetSize

          // First MC docket number becomes the MC# field
          const mcDocket = dockets.find(d => d.prefix === 'MC')
          if (mcDocket) mcNumber = 'MC-' + mcDocket.docketNumber

          console.log(
            '[FMCSA] Enriched DOT', dotStr,
            '| MC:', mcNumber ?? 'none',
            '| Phone:', rawPhone ?? 'none',
            '| AuthDate:', authorityDate ?? 'none',
            '| FleetSize:', fleetSize ?? 'unknown',
          )
        } catch (enrichErr) {
          // Non-fatal — insert with whatever data we have from the search pass
          const msg = enrichErr instanceof Error ? enrichErr.message : String(enrichErr)
          console.warn('[FMCSA] Enrichment failed for DOT ' + dotStr + ' (non-fatal):', msg)
        }

        // Skip carriers with no MC docket — they have no operating authority
        // and cannot be dispatched for hire. Also filters out private carriers.
        if (!mcNumber) { duplicatesSkipped++; continue }

        // Skip carriers outside the 30–180 day new-authority window when
        // onlyNewAuthorities is set. Carriers with no authority date are kept
        // (we cannot confirm their age, so we give them the benefit of the doubt).
        if (onlyNewAuthorities && authorityDate !== null) {
          const age = daysSince(authorityDate)
          if (age !== null && (age < AUTHORITY_MIN_DAYS || age > AUTHORITY_MAX_DAYS)) {
            console.log('[FMCSA] Skipping DOT ' + dotStr + ' — authority age ' + age + ' days (outside 30–180 window)')
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
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error('[FMCSA] Error for term "' + term + '":', msg)
      errors.push('Search "' + term + '": ' + msg)
    }
  }

  console.log('[FMCSA] Import complete. Found:', leadsFound, 'Added:', leadsAdded, 'Skipped:', duplicatesSkipped)
  return { leadsFound, leadsAdded, duplicatesSkipped, errors }
}
