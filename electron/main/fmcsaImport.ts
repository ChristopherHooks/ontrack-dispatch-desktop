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
// Main entry point called by IPC handler for manual import
// ---------------------------------------------------------------------------
export async function importFmcsaLeads(
  db:          Database.Database,
  webKey?:     string,
  searchTerms: string[] = DEFAULT_SEARCH_TERMS,
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

  const ins = db.prepare(
    'INSERT OR IGNORE INTO leads' +
    ' (name, company, phone, city, state, mc_number, status, source, notes, created_at)' +
    ' VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
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
