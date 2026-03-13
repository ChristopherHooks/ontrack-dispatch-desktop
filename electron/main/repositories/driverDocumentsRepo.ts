import Database from 'better-sqlite3'
import type { DriverDocument, CreateDriverDocumentDto, UpdateDriverDocumentDto } from '../../../src/types/models'

export function listDriverDocuments(db: Database.Database, driverId: number): DriverDocument[] {
  return db.prepare('SELECT * FROM driver_documents WHERE driver_id = ? ORDER BY created_at DESC').all(driverId) as DriverDocument[]
}

export function getDriverDocument(db: Database.Database, id: number): DriverDocument | undefined {
  return db.prepare('SELECT * FROM driver_documents WHERE id = ?').get(id) as DriverDocument | undefined
}

export function createDriverDocument(db: Database.Database, dto: CreateDriverDocumentDto): DriverDocument {
  const r = db.prepare(
    'INSERT INTO driver_documents (driver_id, title, doc_type, file_path, expiry_date, notes) ' +
    'VALUES (?, ?, ?, ?, ?, ?)'
  ).run(dto.driver_id, dto.title, dto.doc_type, dto.file_path ?? null, dto.expiry_date ?? null, dto.notes ?? null)
  return db.prepare('SELECT * FROM driver_documents WHERE id = ?').get(r.lastInsertRowid as number) as DriverDocument
}

export function updateDriverDocument(db: Database.Database, id: number, dto: UpdateDriverDocumentDto): DriverDocument | undefined {
  const existing = getDriverDocument(db, id)
  if (existing == null) return undefined
  const m = { ...existing, ...dto }
  db.prepare('UPDATE driver_documents SET title=?,doc_type=?,file_path=?,expiry_date=?,notes=? WHERE id=?')
    .run(m.title, m.doc_type, m.file_path, m.expiry_date, m.notes, id)
  return getDriverDocument(db, id)
}

export function deleteDriverDocument(db: Database.Database, id: number): boolean {
  return db.prepare('DELETE FROM driver_documents WHERE id = ?').run(id).changes > 0
}
