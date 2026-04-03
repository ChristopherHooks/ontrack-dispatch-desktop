import Database from 'better-sqlite3'
import type { Load, CreateLoadDto, UpdateLoadDto } from '../../../src/types/models'
import { logAudit } from './auditRepo'

const ACTIVE_STATUSES = ['Booked', 'Picked Up', 'In Transit']

export function listLoads(db: Database.Database, status?: string): Load[] {
  if (status) {
    return db.prepare('SELECT * FROM loads WHERE status = ? ORDER BY pickup_date ASC').all(status) as Load[]
  }
  return db.prepare('SELECT * FROM loads ORDER BY pickup_date ASC, created_at DESC').all() as Load[]
}

export function getLoad(db: Database.Database, id: number): Load | undefined {
  return db.prepare('SELECT * FROM loads WHERE id = ?').get(id) as Load | undefined
}

export function createLoad(db: Database.Database, dto: CreateLoadDto): Load {
  const r = db.prepare(
    'INSERT INTO loads (load_id, driver_id, broker_id, origin_city, origin_state,' +
    'dest_city, dest_state, pickup_date, delivery_date, miles, deadhead_miles, rate, fuel_surcharge, dispatch_pct,' +
    'trailer_type, commodity, status, invoiced, notes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)'
  ).run(dto.load_id ?? null, dto.driver_id ?? null, dto.broker_id ?? null,
    dto.origin_city ?? null, dto.origin_state ?? null, dto.dest_city ?? null,
    dto.dest_state ?? null, dto.pickup_date ?? null, dto.delivery_date ?? null,
    dto.miles ?? null, dto.deadhead_miles ?? null, dto.rate ?? null, dto.fuel_surcharge ?? null,
    dto.dispatch_pct ?? null, dto.trailer_type ?? null, dto.commodity ?? null,
    dto.status, dto.invoiced ?? 0, dto.notes ?? null)
  const newId = r.lastInsertRowid as number
  logAudit(db, 1, 'load', newId, 'create', undefined, dto)
  return db.prepare('SELECT * FROM loads WHERE id = ?').get(newId) as Load
}

export function updateLoad(db: Database.Database, id: number, dto: UpdateLoadDto): Load | undefined {
  const existing = getLoad(db, id)
  if (existing == null) return undefined
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
  const m = { ...existing, ...dto }
  db.prepare(
    'UPDATE loads SET load_id=?,driver_id=?,broker_id=?,origin_city=?,origin_state=?,' +
    'dest_city=?,dest_state=?,pickup_date=?,delivery_date=?,miles=?,deadhead_miles=?,rate=?,fuel_surcharge=?,dispatch_pct=?,' +
    'trailer_type=?,commodity=?,status=?,invoiced=?,notes=?,updated_at=? WHERE id=?'
  ).run(m.load_id, m.driver_id, m.broker_id, m.origin_city, m.origin_state,
    m.dest_city, m.dest_state, m.pickup_date, m.delivery_date, m.miles, m.deadhead_miles ?? null,
    m.rate, m.fuel_surcharge ?? null, m.dispatch_pct, m.trailer_type, m.commodity,
    m.status, m.invoiced, m.notes, now, id)
  logAudit(db, 1, 'load', id, 'update', existing, dto)
  return getLoad(db, id)
}

export function deleteLoad(db: Database.Database, id: number): boolean {
  const existing = getLoad(db, id)
  if (!existing) return false
  // Guard: refuse to delete a load that is actively in transit
  if (ACTIVE_STATUSES.includes(existing.status)) {
    throw new Error(`Cannot delete load #${id} — status is "${existing.status}". Change status to Searching or Delivered first.`)
  }
  const changed = db.prepare('DELETE FROM loads WHERE id = ?').run(id).changes > 0
  if (changed) logAudit(db, 1, 'load', id, 'delete', existing, undefined)
  return changed
}
