import Database from 'better-sqlite3'

export interface SopDocument {
  id: number
  title: string
  category: string
  content: string | null
  file_path: string | null
  driver_id: number | null
  doc_type: string | null
  expiry_date: string | null
  created_at: string
  updated_at: string
}

export type CreateSopDocumentDto = {
  title: string
  category?: string | null
  content?: string | null
  file_path?: string | null
  driver_id?: number | null
  doc_type?: string | null
  expiry_date?: string | null
}
export type UpdateSopDocumentDto = Partial<CreateSopDocumentDto>

function ts(): string {
  return new Date().toISOString().slice(0, 19).replace('T', ' ')
}

export function listDocuments(db: Database.Database, category?: string): SopDocument[] {
  if (category && category !== 'All') {
    return db.prepare('SELECT * FROM documents WHERE category = ? ORDER BY title ASC').all(category) as SopDocument[]
  }
  return db.prepare('SELECT * FROM documents ORDER BY title ASC').all() as SopDocument[]
}

export function getDocument(db: Database.Database, id: number): SopDocument | undefined {
  return db.prepare('SELECT * FROM documents WHERE id = ?').get(id) as SopDocument | undefined
}

export function createDocument(db: Database.Database, dto: CreateSopDocumentDto): SopDocument {
  const now = ts()
  const r = db.prepare(
    'INSERT INTO documents (title, category, content, file_path, driver_id, doc_type, expiry_date, created_at, updated_at)' +
    ' VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(
    dto.title,
    dto.category ?? 'Other',
    dto.content ?? null,
    dto.file_path ?? null,
    dto.driver_id ?? null,
    dto.doc_type ?? null,
    dto.expiry_date ?? null,
    now, now
  )
  return getDocument(db, r.lastInsertRowid as number)!
}

export function updateDocument(db: Database.Database, id: number, dto: UpdateSopDocumentDto): SopDocument | undefined {
  const e = getDocument(db, id)
  if (!e) return undefined
  const now = ts()
  db.prepare(
    'UPDATE documents SET title=?,category=?,content=?,file_path=?,driver_id=?,doc_type=?,expiry_date=?,updated_at=? WHERE id=?'
  ).run(
    dto.title ?? e.title,
    dto.category !== undefined ? dto.category : e.category,
    dto.content !== undefined ? dto.content : e.content,
    dto.file_path !== undefined ? dto.file_path : e.file_path,
    dto.driver_id !== undefined ? dto.driver_id : e.driver_id,
    dto.doc_type !== undefined ? dto.doc_type : e.doc_type,
    dto.expiry_date !== undefined ? dto.expiry_date : e.expiry_date,
    now, id
  )
  return getDocument(db, id)
}

export function deleteDocument(db: Database.Database, id: number): boolean {
  return db.prepare('DELETE FROM documents WHERE id = ?').run(id).changes > 0
}

export function searchDocuments(db: Database.Database, query: string): SopDocument[] {
  const q = '%' + query + '%'
  return db.prepare(
    'SELECT * FROM documents WHERE title LIKE ? OR content LIKE ? OR category LIKE ? ORDER BY title ASC LIMIT 20'
  ).all(q, q, q) as SopDocument[]
}
