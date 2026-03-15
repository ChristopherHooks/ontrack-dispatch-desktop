import Database from 'better-sqlite3'
import type { Lead, CreateLeadDto, UpdateLeadDto } from '../../../src/types/models'

export function listLeads(db: Database.Database, status?: string): Lead[] {
  if (status) {
    return db.prepare('SELECT * FROM leads WHERE status = ? ORDER BY follow_up_date ASC, created_at DESC').all(status) as Lead[]
  }
  return db.prepare('SELECT * FROM leads ORDER BY follow_up_date ASC, created_at DESC').all() as Lead[]
}

export function getLead(db: Database.Database, id: number): Lead | undefined {
  return db.prepare('SELECT * FROM leads WHERE id = ?').get(id) as Lead | undefined
}

export function createLead(db: Database.Database, dto: CreateLeadDto): Lead {
  const r = db.prepare(
    'INSERT INTO leads (name, company, mc_number, phone, email, city, state, ' +
    'trailer_type, authority_date, fleet_size, source, status, priority, follow_up_date, notes) ' +
    'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(dto.name, dto.company ?? null, dto.mc_number ?? null, dto.phone ?? null,
    dto.email ?? null, dto.city ?? null, dto.state ?? null, dto.trailer_type ?? null,
    dto.authority_date ?? null, dto.fleet_size ?? null, dto.source ?? null, dto.status, dto.priority,
    dto.follow_up_date ?? null, dto.notes ?? null)
  return db.prepare('SELECT * FROM leads WHERE id = ?').get(r.lastInsertRowid as number) as Lead
}

export function updateLead(db: Database.Database, id: number, dto: UpdateLeadDto): Lead | undefined {
  const existing = getLead(db, id)
  if (existing == null) return undefined
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
  const m = { ...existing, ...dto }
  db.prepare(
    'UPDATE leads SET name=?, company=?, mc_number=?, phone=?, email=?, city=?, state=?,' +
    'trailer_type=?, authority_date=?, fleet_size=?, source=?, status=?, priority=?,' +
    'follow_up_date=?, notes=?, updated_at=? WHERE id=?'
  ).run(m.name, m.company, m.mc_number, m.phone, m.email, m.city, m.state,
    m.trailer_type, m.authority_date, m.fleet_size ?? null, m.source, m.status, m.priority,
    m.follow_up_date, m.notes, now, id)
  return getLead(db, id)
}

export function deleteLead(db: Database.Database, id: number): boolean {
  return db.prepare('DELETE FROM leads WHERE id = ?').run(id).changes > 0
}
