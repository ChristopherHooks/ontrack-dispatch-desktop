import Database from 'better-sqlite3'

export interface LoadDeduction {
  id:         number
  load_id:    number
  label:      string
  amount:     number
  created_at: string
}

export interface CreateLoadDeductionDto {
  load_id: number
  label:   string
  amount:  number
}

export function listLoadDeductions(db: Database.Database, loadId: number): LoadDeduction[] {
  return db.prepare('SELECT * FROM load_deductions WHERE load_id = ? ORDER BY created_at ASC').all(loadId) as LoadDeduction[]
}

export function createLoadDeduction(db: Database.Database, dto: CreateLoadDeductionDto): LoadDeduction {
  const r = db.prepare('INSERT INTO load_deductions (load_id, label, amount) VALUES (?, ?, ?)').run(dto.load_id, dto.label, dto.amount)
  return db.prepare('SELECT * FROM load_deductions WHERE id = ?').get(r.lastInsertRowid as number) as LoadDeduction
}

export function deleteLoadDeduction(db: Database.Database, id: number): boolean {
  return db.prepare('DELETE FROM load_deductions WHERE id = ?').run(id).changes > 0
}
