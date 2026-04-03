import Database from 'better-sqlite3'
import type { ProspectOutreachEntry, CreateProspectOutreachDto } from '../../../src/types/models'

export function listProspectOutreach(db: Database.Database, prospect_id: number): ProspectOutreachEntry[] {
  return db.prepare(
    'SELECT * FROM prospect_outreach_log WHERE prospect_id = ? ORDER BY created_at DESC'
  ).all(prospect_id) as ProspectOutreachEntry[]
}

export function createProspectOutreach(
  db: Database.Database,
  dto: CreateProspectOutreachDto
): ProspectOutreachEntry {
  const r = db.prepare(
    'INSERT INTO prospect_outreach_log (prospect_id, method, outcome, notes) VALUES (?,?,?,?)'
  ).run(dto.prospect_id, dto.method, dto.outcome ?? null, dto.notes ?? null)

  // Bump last_contact_date and contact_attempt_count on the parent prospect
  db.prepare(
    'UPDATE driver_prospects SET last_contact_date = date(\'now\'), contact_attempt_count = contact_attempt_count + 1, updated_at = datetime(\'now\') WHERE id = ?'
  ).run(dto.prospect_id)

  return db.prepare(
    'SELECT * FROM prospect_outreach_log WHERE id = ?'
  ).get(r.lastInsertRowid) as ProspectOutreachEntry
}

export function deleteProspectOutreach(db: Database.Database, id: number): void {
  db.prepare('DELETE FROM prospect_outreach_log WHERE id = ?').run(id)
}
