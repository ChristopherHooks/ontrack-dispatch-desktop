import Database from 'better-sqlite3'
import type { Broker, CreateBrokerDto, UpdateBrokerDto } from '../../../src/types/models'
import { logAudit } from './auditRepo'

export function listBrokers(db: Database.Database): Broker[] {
  return db.prepare('SELECT * FROM brokers ORDER BY name ASC').all() as Broker[]
}

export function getBroker(db: Database.Database, id: number): Broker | undefined {
  return db.prepare('SELECT * FROM brokers WHERE id = ?').get(id) as Broker | undefined
}

export function createBroker(db: Database.Database, dto: CreateBrokerDto): Broker {
  const r = db.prepare(
    'INSERT INTO brokers (name, mc_number, phone, email, payment_terms, credit_rating, avg_days_pay, flag, notes, new_authority, min_authority_days, credit_limit) ' +
    'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(dto.name, dto.mc_number ?? null, dto.phone ?? null, dto.email ?? null,
    dto.payment_terms, dto.credit_rating ?? null, dto.avg_days_pay ?? null, dto.flag, dto.notes ?? null,
    dto.new_authority ?? 0, dto.min_authority_days ?? null, dto.credit_limit ?? null)
  const newId = r.lastInsertRowid as number
  logAudit(db, 1, 'broker', newId, 'create', undefined, dto)
  return db.prepare('SELECT * FROM brokers WHERE id = ?').get(newId) as Broker
}

export function updateBroker(db: Database.Database, id: number, dto: UpdateBrokerDto): Broker | undefined {
  const existing = getBroker(db, id)
  if (existing == null) return undefined
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
  const m = { ...existing, ...dto }
  db.prepare('UPDATE brokers SET name=?,mc_number=?,phone=?,email=?,payment_terms=?,credit_rating=?,avg_days_pay=?,flag=?,notes=?,new_authority=?,min_authority_days=?,credit_limit=?,updated_at=? WHERE id=?')
    .run(m.name, m.mc_number, m.phone, m.email, m.payment_terms, m.credit_rating, m.avg_days_pay, m.flag, m.notes, m.new_authority ?? 0, m.min_authority_days ?? null, m.credit_limit ?? null, now, id)
  logAudit(db, 1, 'broker', id, 'update', existing, dto)
  return getBroker(db, id)
}

export function deleteBroker(db: Database.Database, id: number): boolean {
  const existing = getBroker(db, id)
  if (!existing) return false
  const changed = db.prepare('DELETE FROM brokers WHERE id = ?').run(id).changes > 0
  if (changed) logAudit(db, 1, 'broker', id, 'delete', existing, undefined)
  return changed
}
