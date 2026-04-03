import Database from 'better-sqlite3'
import type { Driver, CreateDriverDto, UpdateDriverDto } from '../../../src/types/models'
import { logAudit } from './auditRepo'

export function listDrivers(db: Database.Database, status?: string): Driver[] {
  if (status) {
    return db.prepare('SELECT * FROM drivers WHERE status = ? ORDER BY name ASC').all(status) as Driver[]
  }
  return db.prepare('SELECT * FROM drivers ORDER BY name ASC').all() as Driver[]
}

export function getDriver(db: Database.Database, id: number): Driver | undefined {
  return db.prepare('SELECT * FROM drivers WHERE id = ?').get(id) as Driver | undefined
}

export function createDriver(db: Database.Database, dto: CreateDriverDto): Driver {
  const r = db.prepare(
    'INSERT INTO drivers (name, company, mc_number, dot_number, cdl_number, cdl_expiry,' +
    'phone, email, truck_type, trailer_type, trailer_length, authority_date, home_base, current_location, preferred_lanes,' +
    'cpm, min_rpm, dispatch_percent, factoring_company, insurance_expiry, medical_card_expiry, start_date, status, notes) ' +
    'VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)'
  ).run(dto.name, dto.company ?? null, dto.mc_number ?? null, dto.dot_number ?? null,
    dto.cdl_number ?? null, dto.cdl_expiry ?? null, dto.phone ?? null, dto.email ?? null,
    dto.truck_type ?? null, dto.trailer_type ?? null, dto.trailer_length ?? null,
    dto.authority_date ?? null,
    dto.home_base ?? null, dto.current_location ?? null, dto.preferred_lanes ?? null,
    dto.cpm ?? null, dto.min_rpm ?? null, dto.dispatch_percent,
    dto.factoring_company ?? null, dto.insurance_expiry ?? null, dto.medical_card_expiry ?? null,
    dto.start_date ?? null, dto.status, dto.notes ?? null)
  const newId = r.lastInsertRowid as number
  logAudit(db, 1, 'driver', newId, 'create', undefined, dto)
  return db.prepare('SELECT * FROM drivers WHERE id = ?').get(newId) as Driver
}

export function updateDriver(db: Database.Database, id: number, dto: UpdateDriverDto): Driver | undefined {
  const existing = getDriver(db, id)
  if (existing == null) return undefined
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
  const m = { ...existing, ...dto }
  db.prepare(
    'UPDATE drivers SET name=?,company=?,mc_number=?,dot_number=?,cdl_number=?,cdl_expiry=?,' +
    'phone=?,email=?,truck_type=?,trailer_type=?,trailer_length=?,authority_date=?,home_base=?,current_location=?,preferred_lanes=?,' +
    'cpm=?,min_rpm=?,dispatch_percent=?,factoring_company=?,insurance_expiry=?,medical_card_expiry=?,start_date=?,' +
    'status=?,notes=?,updated_at=? WHERE id=?'
  ).run(m.name, m.company, m.mc_number, m.dot_number, m.cdl_number, m.cdl_expiry,
    m.phone, m.email, m.truck_type, m.trailer_type, m.trailer_length ?? null,
    m.authority_date ?? null,
    m.home_base, m.current_location ?? null, m.preferred_lanes, m.cpm ?? null, m.min_rpm, m.dispatch_percent,
    m.factoring_company, m.insurance_expiry, m.medical_card_expiry ?? null, m.start_date,
    m.status, m.notes, now, id)
  logAudit(db, 1, 'driver', id, 'update', existing, dto)
  return getDriver(db, id)
}

export function deleteDriver(db: Database.Database, id: number): boolean {
  const existing = getDriver(db, id)
  if (!existing) return false
  const changed = db.prepare('DELETE FROM drivers WHERE id = ?').run(id).changes > 0
  if (changed) logAudit(db, 1, 'driver', id, 'delete', existing, undefined)
  return changed
}

export interface DriverComplianceRow {
  id:                  number
  name:                string
  mc_number:           string | null
  cdl_expiry:          string | null
  insurance_expiry:    string | null
  medical_card_expiry: string | null
  coi_expiry:          string | null   // most recent COI from driver_documents
}

/** Returns all active drivers with their four critical compliance dates. */
export function getDriverCompliance(db: Database.Database): DriverComplianceRow[] {
  return db.prepare(
    'SELECT d.id, d.name, d.mc_number, d.cdl_expiry, d.insurance_expiry, d.medical_card_expiry,' +
    '  (SELECT dd.expiry_date FROM driver_documents dd' +
    '   WHERE dd.driver_id = d.id AND dd.doc_type = \'COI\'' +
    '   ORDER BY dd.expiry_date DESC LIMIT 1) AS coi_expiry' +
    ' FROM drivers d WHERE d.status = \'Active\'' +
    ' ORDER BY d.name ASC'
  ).all() as DriverComplianceRow[]
}
