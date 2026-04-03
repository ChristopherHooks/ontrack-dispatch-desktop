import Database from 'better-sqlite3'
import type { Note, CreateNoteDto } from '../../../src/types/models'

export function listNotes(db: Database.Database, entityType: string, entityId: number): Note[] {
  return db.prepare('SELECT * FROM notes WHERE entity_type = ? AND entity_id = ? ORDER BY created_at DESC').all(entityType, entityId) as Note[]
}
export function createNote(db: Database.Database, dto: CreateNoteDto): Note {
  const r = db.prepare('INSERT INTO notes (entity_type, entity_id, content, user_id) VALUES (?, ?, ?, ?)')
    .run(dto.entity_type, dto.entity_id, dto.content, dto.user_id ?? null)
  return db.prepare('SELECT * FROM notes WHERE id = ?').get(r.lastInsertRowid as number) as Note
}
export function updateNote(db: Database.Database, id: number, content: string): Note | undefined {
  const changed = db.prepare('UPDATE notes SET content = ? WHERE id = ?').run(content, id).changes
  if (!changed) return undefined
  return db.prepare('SELECT * FROM notes WHERE id = ?').get(id) as Note
}
export function deleteNote(db: Database.Database, id: number): boolean {
  return db.prepare('DELETE FROM notes WHERE id = ?').run(id).changes > 0
}
