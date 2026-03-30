import Database from 'better-sqlite3'
import type { Invoice, CreateInvoiceDto, UpdateInvoiceDto } from '../../../src/types/models'
import { logAudit } from './auditRepo'

export function listInvoices(db: Database.Database, status?: string): Invoice[] {
  if (status) return db.prepare('SELECT * FROM invoices WHERE status = ? ORDER BY created_at DESC').all(status) as Invoice[]
  return db.prepare('SELECT * FROM invoices ORDER BY created_at DESC').all() as Invoice[]
}
export function getInvoice(db: Database.Database, id: number): Invoice | undefined {
  return db.prepare('SELECT * FROM invoices WHERE id = ?').get(id) as Invoice | undefined
}
export function createInvoice(db: Database.Database, dto: CreateInvoiceDto): Invoice {
  const r = db.prepare(
    'INSERT INTO invoices (invoice_number,load_id,broker_id,driver_id,week_ending,driver_gross,dispatch_pct,dispatch_fee,sent_date,paid_date,status,notes,factored,factoring_company,advance_rate,factored_amount,factored_date) ' +
    'VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)'
  ).run(dto.invoice_number, dto.load_id ?? null, dto.broker_id ?? null, dto.driver_id ?? null,
    dto.week_ending ?? null, dto.driver_gross ?? null, dto.dispatch_pct ?? null,
    dto.dispatch_fee ?? null, dto.sent_date ?? null, dto.paid_date ?? null, dto.status, dto.notes ?? null,
    dto.factored ?? 0, dto.factoring_company ?? null, dto.advance_rate ?? null,
    dto.factored_amount ?? null, dto.factored_date ?? null)
  const newId = r.lastInsertRowid as number
  logAudit(db, 1, 'invoice', newId, 'create', undefined, dto)
  return db.prepare('SELECT * FROM invoices WHERE id = ?').get(newId) as Invoice
}
export function updateInvoice(db: Database.Database, id: number, dto: UpdateInvoiceDto): Invoice | undefined {
  const existing = getInvoice(db, id)
  if (existing == null) return undefined
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
  const m = { ...existing, ...dto }
  db.prepare('UPDATE invoices SET invoice_number=?,load_id=?,broker_id=?,driver_id=?,week_ending=?,driver_gross=?,dispatch_pct=?,dispatch_fee=?,sent_date=?,paid_date=?,status=?,notes=?,factored=?,factoring_company=?,advance_rate=?,factored_amount=?,factored_date=?,updated_at=? WHERE id=?')
    .run(m.invoice_number, m.load_id, m.broker_id, m.driver_id, m.week_ending, m.driver_gross, m.dispatch_pct, m.dispatch_fee, m.sent_date, m.paid_date, m.status, m.notes,
      m.factored ?? 0, m.factoring_company ?? null, m.advance_rate ?? null, m.factored_amount ?? null, m.factored_date ?? null, now, id)
  logAudit(db, 1, 'invoice', id, 'update', existing, dto)
  return getInvoice(db, id)
}
export function deleteInvoice(db: Database.Database, id: number): boolean {
  const existing = getInvoice(db, id)
  if (!existing) return false
  const changed = db.prepare('DELETE FROM invoices WHERE id = ?').run(id).changes > 0
  if (changed) logAudit(db, 1, 'invoice', id, 'delete', existing, undefined)
  return changed
}

// Bulk-update status for a list of invoice IDs.
// Returns number of rows changed.
export function bulkUpdateInvoices(db: Database.Database, ids: number[], status: string, extraFields: Record<string, string | null> = {}): number {
  if (ids.length === 0) return 0
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
  const placeholders = ids.map(() => '?').join(',')
  const extra = Object.entries(extraFields).map(([k]) => `${k}=?`).join(',')
  const extraVals = Object.values(extraFields)
  const sql = `UPDATE invoices SET status=?,${extra ? extra + ',' : ''}updated_at=? WHERE id IN (${placeholders})`
  const r = db.prepare(sql).run(status, ...extraVals, now, ...ids)
  return r.changes
}

// Auto-flag Sent invoices as Overdue when they exceed broker payment terms.
// Falls back to 30 days if no broker/terms can be resolved.
// Returns the number of invoices updated.
export function autoFlagOverdueInvoices(db: Database.Database): number {
  const r = db.prepare(
    "UPDATE invoices SET status = 'Overdue', updated_at = datetime('now')" +
    " WHERE status = 'Sent' AND sent_date IS NOT NULL" +
    "   AND julianday('now') - julianday(sent_date) >" +
    "   COALESCE(" +
    "     (SELECT b.payment_terms FROM brokers b" +
    "      JOIN loads l ON l.broker_id = b.id" +
    "      WHERE l.id = invoices.load_id LIMIT 1)," +
    "     30" +
    "   )"
  ).run()
  return r.changes
}
