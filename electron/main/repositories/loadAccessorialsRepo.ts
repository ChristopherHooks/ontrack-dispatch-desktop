import Database from 'better-sqlite3'
import type { LoadAccessorial, CreateLoadAccessorialDto } from '../../../src/types/models'

export function listLoadAccessorials(db: Database.Database, load_id: number): LoadAccessorial[] {
  return db.prepare(
    'SELECT * FROM load_accessorials WHERE load_id = ? ORDER BY created_at ASC'
  ).all(load_id) as LoadAccessorial[]
}

export function createLoadAccessorial(
  db: Database.Database,
  dto: CreateLoadAccessorialDto
): LoadAccessorial {
  const r = db.prepare(
    'INSERT INTO load_accessorials (load_id, type, amount, notes) VALUES (?,?,?,?)'
  ).run(dto.load_id, dto.type, dto.amount, dto.notes ?? null)
  return db.prepare('SELECT * FROM load_accessorials WHERE id = ?').get(r.lastInsertRowid) as LoadAccessorial
}

export function updateLoadAccessorial(
  db: Database.Database,
  id: number,
  dto: Partial<Pick<LoadAccessorial, 'type' | 'amount' | 'notes'>>
): LoadAccessorial | undefined {
  const fields: string[] = []
  const values: unknown[] = []
  if (dto.type   !== undefined) { fields.push('type = ?');   values.push(dto.type) }
  if (dto.amount !== undefined) { fields.push('amount = ?'); values.push(dto.amount) }
  if (dto.notes  !== undefined) { fields.push('notes = ?');  values.push(dto.notes ?? null) }
  if (fields.length === 0) return db.prepare('SELECT * FROM load_accessorials WHERE id = ?').get(id) as LoadAccessorial | undefined
  values.push(id)
  db.prepare(`UPDATE load_accessorials SET ${fields.join(', ')} WHERE id = ?`).run(...values)
  return db.prepare('SELECT * FROM load_accessorials WHERE id = ?').get(id) as LoadAccessorial | undefined
}

export function deleteLoadAccessorial(db: Database.Database, id: number): void {
  db.prepare('DELETE FROM load_accessorials WHERE id = ?').run(id)
}

/** Sum of accessorial amounts for a load */
export function getAccessorialTotal(db: Database.Database, load_id: number): number {
  const row = db.prepare(
    'SELECT COALESCE(SUM(amount), 0) AS total FROM load_accessorials WHERE load_id = ?'
  ).get(load_id) as { total: number }
  return row.total
}
