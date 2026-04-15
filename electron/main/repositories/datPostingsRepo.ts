import Database from 'better-sqlite3'
import type { DatPosting, CreateDatPostingDto, UpdateDatPostingDto } from '../../../src/types/models'

export function listDatPostings(db: Database.Database, loadId: number): DatPosting[] {
  return db.prepare('SELECT * FROM dat_postings WHERE load_id = ? ORDER BY posted_at DESC').all(loadId) as DatPosting[]
}

export function getDatPosting(db: Database.Database, id: number): DatPosting | undefined {
  return db.prepare('SELECT * FROM dat_postings WHERE id = ?').get(id) as DatPosting | undefined
}

export function createDatPosting(db: Database.Database, dto: CreateDatPostingDto): DatPosting {
  const r = db.prepare(
    'INSERT INTO dat_postings (load_id, posted_rate, expires_at, posting_ref, status, notes) ' +
    'VALUES (?, ?, ?, ?, ?, ?)'
  ).run(
    dto.load_id,
    dto.posted_rate ?? null,
    dto.expires_at ?? null,
    dto.posting_ref ?? null,
    dto.status ?? 'active',
    dto.notes ?? null,
  )
  return db.prepare('SELECT * FROM dat_postings WHERE id = ?').get(r.lastInsertRowid as number) as DatPosting
}

export function updateDatPosting(db: Database.Database, id: number, dto: UpdateDatPostingDto): DatPosting | undefined {
  const existing = getDatPosting(db, id)
  if (existing == null) return undefined
  const m = { ...existing, ...dto }
  db.prepare(
    'UPDATE dat_postings SET posted_rate=?,expires_at=?,posting_ref=?,status=?,notes=? WHERE id=?'
  ).run(m.posted_rate ?? null, m.expires_at ?? null, m.posting_ref ?? null, m.status, m.notes ?? null, id)
  return getDatPosting(db, id)
}

export function deleteDatPosting(db: Database.Database, id: number): boolean {
  return db.prepare('DELETE FROM dat_postings WHERE id = ?').run(id).changes > 0
}
