import type Database from 'better-sqlite3'

export interface FmcsaImportResult {
  leadsFound:        number
  leadsAdded:        number
  duplicatesSkipped: number
  errors:            string[]
}

// ---------------------------------------------------------------------------
// Candidate shape returned by the FMCSA Safer API (not yet connected)
// ---------------------------------------------------------------------------
interface FmcsaCandidate {
  name:        string
  company:     string | null
  mc_number:   string
  phone:       string | null
  email:       string | null
  city:        string | null
  state:       string | null
  trailer_type: string | null
}

// ---------------------------------------------------------------------------
// Fetch candidates from FMCSA Safer API
// TODO: Replace stub with real HTTP call to FMCSA Safer API
// ---------------------------------------------------------------------------
async function fetchFmcsaCandidates(): Promise<FmcsaCandidate[]> {
  // Real implementation will call:
  //   https://safer.fmcsa.dot.gov/query.asp
  // and map results to FmcsaCandidate[]
  return []
}

// ---------------------------------------------------------------------------
// Main entry point — called by IPC handler for manual trigger
// ---------------------------------------------------------------------------
export async function importFmcsaLeads(
  db: Database.Database
): Promise<FmcsaImportResult> {
  const errors: string[] = []
  let leadsFound        = 0
  let leadsAdded        = 0
  let duplicatesSkipped = 0

  try {
    const candidates = await fetchFmcsaCandidates()
    leadsFound = candidates.length

    if (leadsFound === 0) {
      errors.push('FMCSA Safer API not yet connected. Stub only — no leads fetched.')
      return { leadsFound, leadsAdded, duplicatesSkipped, errors }
    }

    const insert = db.prepare(
      'INSERT INTO leads ' +
      '(name, company, mc_number, phone, email, city, state, trailer_type, ' +
      "source, status, priority, created_at, updated_at) VALUES " +
      "(?, ?, ?, ?, ?, ?, ?, ?, 'FMCSA', 'New', 'Medium', datetime('now'), datetime('now'))"
    )

    for (const c of candidates) {
      const existing = db.prepare(
        'SELECT id FROM leads WHERE mc_number = ?'
      ).get(c.mc_number)

      if (existing) {
        duplicatesSkipped++
        continue
      }

      try {
        insert.run(
          c.name, c.company, c.mc_number, c.phone,
          c.email, c.city, c.state, c.trailer_type
        )
        leadsAdded++
      } catch (rowErr) {
        errors.push(`Failed to insert MC# ${c.mc_number}: ${String(rowErr)}`)
      }
    }
  } catch (err) {
    errors.push(`Import failed: ${String(err)}`)
  }

  return { leadsFound, leadsAdded, duplicatesSkipped, errors }
}
