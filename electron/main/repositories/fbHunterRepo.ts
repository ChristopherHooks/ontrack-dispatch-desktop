/**
 * Agent 2 — Facebook Lead Hunter Agent
 * Ingestion queue for Facebook posts — classify, extract, convert to lead.
 */
import Database from 'better-sqlite3'

export type FbPostIntent =
  | 'Needs Dispatcher'
  | 'Needs Load'
  | 'Empty Truck'
  | 'Looking for Consistent Freight'
  | 'General Networking'
  | 'Low Intent'
  | 'Ignore'

export type FbPostStatus = 'queued' | 'reviewed' | 'converted' | 'ignored'

export const FB_POST_INTENTS: FbPostIntent[] = [
  'Needs Dispatcher',
  'Needs Load',
  'Empty Truck',
  'Looking for Consistent Freight',
  'General Networking',
  'Low Intent',
  'Ignore',
]

export const INTENT_PRIORITY: Record<FbPostIntent, number> = {
  'Needs Dispatcher':               1,
  'Looking for Consistent Freight': 2,
  'Empty Truck':                    3,
  'Needs Load':                     4,
  'General Networking':             5,
  'Low Intent':                     6,
  'Ignore':                         7,
}

export interface FbPost {
  id:                  number
  raw_text:            string
  author_name:         string | null
  group_name:          string | null
  posted_at:           string | null      // ISO or freeform date from the post
  intent:              FbPostIntent | null
  extracted_name:      string | null
  extracted_phone:     string | null
  extracted_location:  string | null
  extracted_equipment: string | null
  recommended_action:  string | null
  draft_comment:       string | null
  draft_dm:            string | null
  lead_id:             number | null      // set after "Convert to Lead"
  status:              FbPostStatus
  created_at:          string
}

export type CreateFbPostDto = Omit<FbPost, 'id' | 'created_at'>
export type UpdateFbPostDto = Partial<CreateFbPostDto>

export function listFbPosts(
  db:      Database.Database,
  status?: FbPostStatus,
): FbPost[] {
  if (status) {
    return db.prepare(
      'SELECT * FROM fb_posts WHERE status = ? ORDER BY created_at DESC'
    ).all(status) as FbPost[]
  }
  return db.prepare(
    'SELECT * FROM fb_posts ORDER BY created_at DESC'
  ).all() as FbPost[]
}

export function getFbPost(db: Database.Database, id: number): FbPost | undefined {
  return db.prepare('SELECT * FROM fb_posts WHERE id = ?').get(id) as FbPost | undefined
}

export function createFbPost(db: Database.Database, dto: CreateFbPostDto): FbPost {
  const r = db.prepare(
    'INSERT INTO fb_posts (raw_text, author_name, group_name, posted_at, intent, ' +
    'extracted_name, extracted_phone, extracted_location, extracted_equipment, ' +
    'recommended_action, draft_comment, draft_dm, lead_id, status) ' +
    'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(
    dto.raw_text,
    dto.author_name      ?? null,
    dto.group_name       ?? null,
    dto.posted_at        ?? null,
    dto.intent           ?? null,
    dto.extracted_name   ?? null,
    dto.extracted_phone  ?? null,
    dto.extracted_location  ?? null,
    dto.extracted_equipment ?? null,
    dto.recommended_action  ?? null,
    dto.draft_comment    ?? null,
    dto.draft_dm         ?? null,
    dto.lead_id          ?? null,
    dto.status           ?? 'queued',
  )
  return db.prepare('SELECT * FROM fb_posts WHERE id = ?').get(r.lastInsertRowid as number) as FbPost
}

export function updateFbPost(
  db:  Database.Database,
  id:  number,
  dto: UpdateFbPostDto,
): FbPost | undefined {
  const fields: string[] = []
  const values: unknown[] = []
  for (const [k, v] of Object.entries(dto)) {
    if (v !== undefined) { fields.push(k + ' = ?'); values.push(v) }
  }
  if (fields.length === 0) return getFbPost(db, id)
  values.push(id)
  db.prepare('UPDATE fb_posts SET ' + fields.join(', ') + ' WHERE id = ?').run(...values)
  return getFbPost(db, id)
}

export function deleteFbPost(db: Database.Database, id: number): boolean {
  return (db.prepare('DELETE FROM fb_posts WHERE id = ?').run(id)).changes > 0
}

/**
 * Duplicate guard: compares first 200 chars of raw_text.
 * Prevents re-adding the same post after copy-paste.
 */
export function fbPostExists(db: Database.Database, rawText: string): boolean {
  const snippet = rawText.trim().slice(0, 200)
  return !!db.prepare(
    'SELECT id FROM fb_posts WHERE substr(trim(raw_text), 1, 200) = ? LIMIT 1'
  ).get(snippet)
}
