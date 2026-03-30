import Database from 'better-sqlite3'

export interface LoadAttachment {
  id:         number
  load_id:    number
  title:      string
  file_path:  string   // absolute path in app data dir
  file_name:  string   // original file name for display
  created_at: string
}

export type CreateLoadAttachmentDto = Omit<LoadAttachment, 'id' | 'created_at'>

export function listLoadAttachments(db: Database.Database, loadId: number): LoadAttachment[] {
  return db.prepare('SELECT * FROM load_attachments WHERE load_id = ? ORDER BY created_at DESC').all(loadId) as LoadAttachment[]
}

export function createLoadAttachment(db: Database.Database, dto: CreateLoadAttachmentDto): LoadAttachment {
  const r = db.prepare(
    'INSERT INTO load_attachments (load_id, title, file_path, file_name) VALUES (?,?,?,?)'
  ).run(dto.load_id, dto.title, dto.file_path, dto.file_name)
  return db.prepare('SELECT * FROM load_attachments WHERE id = ?').get(r.lastInsertRowid as number) as LoadAttachment
}

export function deleteLoadAttachment(db: Database.Database, id: number): boolean {
  return db.prepare('DELETE FROM load_attachments WHERE id = ?').run(id).changes > 0
}
