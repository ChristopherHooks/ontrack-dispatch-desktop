import Database from 'better-sqlite3'
import type { Invoice, CreateInvoiceDto, UpdateInvoiceDto } from '../../../src/types/models'

export function listInvoices(db: Database.Database, status?: string): Invoice[] {
  if (status) return db.prepare('SELECT * FROM invoices WHERE status = ? ORDER BY created_at DESC').all(status) as Invoice[]
  return db.prepare('SELECT * FROM invoices ORDER BY created_at DESC').all() as Invoice[]
}
export function getInvoice(db: Database.Database, id: number): Invoice | undefined {
  return db.prepare('SELECT * FROM invoices WHERE id = ?').get(id) as Invoice | undefined
}
export function createInvoice(db: Database.Database, dto: CreateInvoiceDto): Invoice {
  const r = db.prepare(
    'INSERT INTO invoices (invoice_number,load_id,driver_id,week_ending,driver_gross,dispatch_pct,dispatch_fee,sent_date,paid_date,status,notes) ' +
    'VALUES (?,?,?,?,?,?,?,?,?,?,?)'
  ).run(dto.invoice_number, dto.load_id ?? null, dto.driver_id ?? null, dto.week_ending ?? null,
    dto.driver_gross ?? null, dto.dispatch_pct ?? null, dto.dispatch_fee ?? null,
    dto.sent_date ?? null, dto.paid_date ?? null, dto.status, dto.notes ?? null)
  return db.prepare('SELECT * FROM invoices WHERE id = ?').get(r.lastInsertRowid as number) as Invoice
}
export function updateInvoice(db: Database.Database, id: number, dto: UpdateInvoiceDto): Invoice | undefined {
  const existing = getInvoice(db, id)
  if (existing == null) return undefined
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
  const m = { ...existing, ...dto }
  db.prepare('UPDATE invoices SET invoice_number=?,load_id=?,driver_id=?,week_ending=?,driver_gross=?,dispatch_pct=?,dispatch_fee=?,sent_date=?,paid_date=?,status=?,notes=?,updated_at=? WHERE id=?')
    .run(m.invoice_number, m.load_id, m.driver_id, m.week_ending, m.driver_gross, m.dispatch_pct, m.dispatch_fee, m.sent_date, m.paid_date, m.status, m.notes, now, id)
  return getInvoice(db, id)
}
