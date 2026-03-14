import type Database from 'better-sqlite3'
import { searchCarriersByName } from './fmcsaApi'
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
 * Default search terms. Each term becomes one API call to /carriers/name/{term}.
 * State names work well because many carriers include their home state in their
 * company name (e.g. 'Texas Freight LLC', 'Georgia Transport Inc').
 * Override via Settings > Integrations > Search Terms.
 */
export const DEFAULT_SEARCH_TERMS = [
  'Texas', 'Georgia', 'Illinois', 'Tennessee', 'Ohio', 'Colorado', 'Arizona',
]

function formatPhone(raw: string): string {
  const d = raw.replace(/[^0-9]/g, '')
  if (d.length === 10)
    return '(' + d.slice(0, 3) + ') ' + d.slice(3, 6) + '-' + d.slice(6)
  if (d.length === 11 && d[0] === '1')
    return '(' + d.slice(1, 4) + ') ' + d.slice(4, 7) + '-' + d.slice(7)
  return raw
}

function toTitleCase(s: string): string {
  return s.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')
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
// Mock carriers — used automatically when no FMCSA web key is configured.
// Returned two per search term (14 total across 7 default terms).
// All have commonAuthorityStatus='A' and allowedToOperate='Y' so they pass
// the same filter gate as real carriers.
// ---------------------------------------------------------------------------
const MOCK_POOL: ApiCarrier[] = [
  // Texas
  { dotNumber: 3901001, legalName: 'LONE STAR FREIGHT LLC',       dbaName: null,           phyCity: 'Houston',          phyState: 'TX', telephone: '7135550101', commonAuthorityStatus: 'A', allowedToOperate: 'Y' },
  { dotNumber: 3901002, legalName: 'TEXAS IRON TRANSPORT INC',    dbaName: null,           phyCity: 'Dallas',           phyState: 'TX', telephone: '2145550202', commonAuthorityStatus: 'A', allowedToOperate: 'Y' },
  // Georgia
  { dotNumber: 3901003, legalName: 'PEACH STATE LOGISTICS INC',   dbaName: null,           phyCity: 'Atlanta',          phyState: 'GA', telephone: '4045550301', commonAuthorityStatus: 'A', allowedToOperate: 'Y' },
  { dotNumber: 3901004, legalName: 'GEORGIA FLATBED EXPRESS LLC', dbaName: 'GFE Transport', phyCity: 'Savannah',        phyState: 'GA', telephone: '9125550402', commonAuthorityStatus: 'A', allowedToOperate: 'Y' },
  // Illinois
  { dotNumber: 3901005, legalName: 'PRAIRIE WIND FREIGHT LLC',    dbaName: null,           phyCity: 'Chicago',          phyState: 'IL', telephone: '3125550501', commonAuthorityStatus: 'A', allowedToOperate: 'Y' },
  { dotNumber: 3901006, legalName: 'ILLINOIS CENTRAL TRANSPORT',  dbaName: null,           phyCity: 'Peoria',           phyState: 'IL', telephone: '3095550602', commonAuthorityStatus: 'A', allowedToOperate: 'Y' },
  // Tennessee
  { dotNumber: 3901007, legalName: 'VOLUNTEER TRUCKING INC',      dbaName: null,           phyCity: 'Nashville',        phyState: 'TN', telephone: '6155550701', commonAuthorityStatus: 'A', allowedToOperate: 'Y' },
  { dotNumber: 3901008, legalName: 'MUSIC CITY FREIGHT LLC',      dbaName: null,           phyCity: 'Memphis',          phyState: 'TN', telephone: '9015550802', commonAuthorityStatus: 'A', allowedToOperate: 'Y' },
  // Ohio
  { dotNumber: 3901009, legalName: 'BUCKEYE HAULING LLC',         dbaName: null,           phyCity: 'Columbus',         phyState: 'OH', telephone: '6145550901', commonAuthorityStatus: 'A', allowedToOperate: 'Y' },
  { dotNumber: 3901010, legalName: 'GREAT LAKES FREIGHT INC',     dbaName: 'GL Freight',   phyCity: 'Cleveland',        phyState: 'OH', telephone: '2165551002', commonAuthorityStatus: 'A', allowedToOperate: 'Y' },
  // Colorado
  { dotNumber: 3901011, legalName: 'ROCKY MOUNTAIN EXPRESS INC',  dbaName: null,           phyCity: 'Denver',           phyState: 'CO', telephone: '3035551101', commonAuthorityStatus: 'A', allowedToOperate: 'Y' },
  { dotNumber: 3901012, legalName: 'FRONT RANGE FREIGHT LLC',     dbaName: null,           phyCity: 'Colorado Springs', phyState: 'CO', telephone: '7195551202', commonAuthorityStatus: 'A', allowedToOperate: 'Y' },
  // Arizona
  { dotNumber: 3901013, legalName: 'DESERT ROAD TRANSPORT LLC',   dbaName: null,           phyCity: 'Phoenix',          phyState: 'AZ', telephone: '6025551301', commonAuthorityStatus: 'A', allowedToOperate: 'Y' },
  { dotNumber: 3901014, legalName: 'SOUTHWEST HAUL EXPRESS LLC',  dbaName: null,           phyCity: 'Tucson',           phyState: 'AZ', telephone: '5205551402', commonAuthorityStatus: 'A', allowedToOperate: 'Y' },
]

/**
 * Returns 2 mock carriers for the given search term.
 * Terms are matched against DEFAULT_SEARCH_TERMS to select a unique slice so
 * each term yields different carriers and the dedup gate still exercises correctly.
 * Unknown terms fall back to the first two entries.
 */
function getMockCarriers(term: string): ApiCarrier[] {
  const idx   = DEFAULT_SEARCH_TERMS.indexOf(term)
  const start = (idx < 0 ? 0 : idx) * 2
  return MOCK_POOL.slice(start, start + 2)
}

// ---------------------------------------------------------------------------
// Main entry point called by IPC handler for manual import
// ---------------------------------------------------------------------------
export async function importFmcsaLeads(
  db:          Database.Database,
  webKey?:     string,
  searchTerms: string[] = DEFAULT_SEARCH_TERMS,
): Promise<FmcsaImportResult> {
  const errors: string[] = []
  let leadsFound = 0, leadsAdded = 0, duplicatesSkipped = 0
  const useMock = !webKey
  if (useMock) {
    console.log('[FMCSA] *** MOCK MODE *** No web key configured. Returning synthetic leads.')
    console.log('[FMCSA] To switch to real data, add your FMCSA web key in Settings > Integrations.')
  }

  // Track DOT numbers seen this run to avoid intra-batch duplicates
  const seenDot = new Set<string>()

  const ins = db.prepare(
    'INSERT OR IGNORE INTO leads' +
    ' (name, company, phone, city, state, mc_number, status, source, notes, created_at)' +
    ' VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  )

  console.log('[FMCSA] Starting import with', searchTerms.length, 'search terms')

  for (const term of searchTerms) {
    try {
      console.log('[FMCSA] Searching for term:', term)
      const carriers: ApiCarrier[] = useMock
        ? getMockCarriers(term)
        : await searchCarriersByName(webKey!, term)
      leadsFound += carriers.length
      console.log('[FMCSA] Found', carriers.length, 'carriers for term:', term)

      for (const c of carriers) {
        // Skip carriers without active common authority
        if (c.commonAuthorityStatus !== 'A') continue
        if (c.allowedToOperate !== 'Y') continue

        const dotKey = 'DOT-' + c.dotNumber
        if (seenDot.has(dotKey)) { duplicatesSkipped++; continue }
        seenDot.add(dotKey)

        // Skip if already in DB
        const existing = db.prepare('SELECT id FROM leads WHERE mc_number = ?').get(dotKey)
        if (existing) { duplicatesSkipped++; continue }

        const name  = toTitleCase(c.legalName || c.dbaName || '')
        const city  = toTitleCase(c.phyCity || '')
        const state = (c.phyState || '').toUpperCase()
        const phone = c.telephone ? formatPhone(c.telephone) : null
        const now   = new Date().toISOString()

        ins.run(name, null, phone, city, state, dotKey, 'New', 'FMCSA', 'Imported from FMCSA SAFER database.', now)
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
