import Database from 'better-sqlite3'
import type { DriverProspect, CreateDriverProspectDto, UpdateDriverProspectDto } from '../../../src/types/models'
import { logAudit } from './auditRepo'

export function listDriverProspects(db: Database.Database, stage?: string): DriverProspect[] {
  if (stage) {
    return db.prepare(
      'SELECT * FROM driver_prospects WHERE stage = ? ORDER BY follow_up_date ASC, created_at DESC'
    ).all(stage) as DriverProspect[]
  }
  return db.prepare(
    'SELECT * FROM driver_prospects ORDER BY follow_up_date ASC, created_at DESC'
  ).all() as DriverProspect[]
}

export function getDriverProspect(db: Database.Database, id: number): DriverProspect | undefined {
  return db.prepare('SELECT * FROM driver_prospects WHERE id = ?').get(id) as DriverProspect | undefined
}

export function createDriverProspect(db: Database.Database, dto: CreateDriverProspectDto): DriverProspect {
  const r = db.prepare(
    'INSERT INTO driver_prospects ' +
    '(name, phone, email, city, state, cdl_class, equipment_interest, years_experience, ' +
    ' source, stage, priority, follow_up_date, notes, ' +
    ' last_contact_date, contact_attempt_count, contact_method, converted_driver_id) ' +
    'VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)'
  ).run(
    dto.name,
    dto.phone                 ?? null,
    dto.email                 ?? null,
    dto.city                  ?? null,
    dto.state                 ?? null,
    dto.cdl_class             ?? null,
    dto.equipment_interest    ?? null,
    dto.years_experience      ?? null,
    dto.source                ?? null,
    dto.stage,
    dto.priority,
    dto.follow_up_date        ?? null,
    dto.notes                 ?? null,
    dto.last_contact_date     ?? null,
    dto.contact_attempt_count ?? 0,
    dto.contact_method        ?? null,
    dto.converted_driver_id   ?? null,
  )
  const newId = r.lastInsertRowid as number
  logAudit(db, 1, 'driver_prospect', newId, 'create', undefined, dto)
  return db.prepare('SELECT * FROM driver_prospects WHERE id = ?').get(newId) as DriverProspect
}

export function updateDriverProspect(
  db: Database.Database,
  id: number,
  dto: UpdateDriverProspectDto
): DriverProspect | undefined {
  const existing = getDriverProspect(db, id)
  if (existing == null) return undefined
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
  const m = { ...existing, ...dto }
  db.prepare(
    'UPDATE driver_prospects SET ' +
    'name=?, phone=?, email=?, city=?, state=?, cdl_class=?, equipment_interest=?, years_experience=?, ' +
    'source=?, stage=?, priority=?, follow_up_date=?, notes=?, ' +
    'last_contact_date=?, contact_attempt_count=?, contact_method=?, converted_driver_id=?, ' +
    'updated_at=? WHERE id=?'
  ).run(
    m.name,
    m.phone                 ?? null,
    m.email                 ?? null,
    m.city                  ?? null,
    m.state                 ?? null,
    m.cdl_class             ?? null,
    m.equipment_interest    ?? null,
    m.years_experience      ?? null,
    m.source                ?? null,
    m.stage,
    m.priority,
    m.follow_up_date        ?? null,
    m.notes                 ?? null,
    m.last_contact_date     ?? null,
    m.contact_attempt_count ?? 0,
    m.contact_method        ?? null,
    m.converted_driver_id   ?? null,
    now,
    id,
  )
  logAudit(db, 1, 'driver_prospect', id, 'update', existing, dto)
  return getDriverProspect(db, id)
}

export function deleteDriverProspect(db: Database.Database, id: number): boolean {
  const existing = getDriverProspect(db, id)
  if (!existing) return false
  const changed = db.prepare('DELETE FROM driver_prospects WHERE id = ?').run(id).changes > 0
  if (changed) logAudit(db, 1, 'driver_prospect', id, 'delete', existing, undefined)
  return changed
}
