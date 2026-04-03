/**
 * Agent 1 — Facebook Conversation / Conversion Agent
 * Tracks conversation threads, stages, and follow-up queue.
 */
import Database from 'better-sqlite3'

export type FbConvStage =
  | 'New'
  | 'Replied'
  | 'Interested'
  | 'Call Ready'
  | 'Converted'
  | 'Dead'

export const FB_CONV_STAGES: FbConvStage[] = [
  'New', 'Replied', 'Interested', 'Call Ready', 'Converted', 'Dead',
]

export interface FbConversation {
  id:              number
  lead_id:         number | null
  name:            string
  phone:           string | null
  platform:        string           // 'Facebook' | 'Instagram' | 'Other'
  stage:           FbConvStage
  last_message:    string | null    // most recent message text
  last_message_at: string | null    // ISO timestamp
  follow_up_at:    string | null    // YYYY-MM-DD
  notes:           string | null
  created_at:      string
  updated_at:      string
}

export type CreateFbConversationDto = Omit<FbConversation, 'id' | 'created_at' | 'updated_at'>
export type UpdateFbConversationDto = Partial<CreateFbConversationDto>

export function listFbConversations(
  db:     Database.Database,
  stage?: string,
): FbConversation[] {
  if (stage && stage !== 'All') {
    return db.prepare(
      'SELECT * FROM fb_conversations WHERE stage = ? ORDER BY follow_up_at ASC, created_at DESC'
    ).all(stage) as FbConversation[]
  }
  return db.prepare(
    'SELECT * FROM fb_conversations ORDER BY follow_up_at ASC, created_at DESC'
  ).all() as FbConversation[]
}

export function getFbConversation(
  db: Database.Database,
  id: number,
): FbConversation | undefined {
  return db.prepare('SELECT * FROM fb_conversations WHERE id = ?').get(id) as FbConversation | undefined
}

export function createFbConversation(
  db:  Database.Database,
  dto: CreateFbConversationDto,
): FbConversation {
  const r = db.prepare(
    'INSERT INTO fb_conversations (lead_id, name, phone, platform, stage, last_message, last_message_at, follow_up_at, notes) ' +
    'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(
    dto.lead_id    ?? null,
    dto.name,
    dto.phone      ?? null,
    dto.platform   ?? 'Facebook',
    dto.stage      ?? 'New',
    dto.last_message    ?? null,
    dto.last_message_at ?? null,
    dto.follow_up_at    ?? null,
    dto.notes      ?? null,
  )
  return db.prepare('SELECT * FROM fb_conversations WHERE id = ?').get(r.lastInsertRowid as number) as FbConversation
}

export function updateFbConversation(
  db:  Database.Database,
  id:  number,
  dto: UpdateFbConversationDto,
): FbConversation | undefined {
  const fields: string[] = []
  const values: unknown[] = []
  for (const [k, v] of Object.entries(dto)) {
    if (v !== undefined) { fields.push(k + ' = ?'); values.push(v) }
  }
  if (fields.length === 0) return getFbConversation(db, id)
  fields.push('updated_at = ?')
  values.push(new Date().toISOString())
  values.push(id)
  db.prepare('UPDATE fb_conversations SET ' + fields.join(', ') + ' WHERE id = ?').run(...values)
  return getFbConversation(db, id)
}

export function deleteFbConversation(db: Database.Database, id: number): boolean {
  return (db.prepare('DELETE FROM fb_conversations WHERE id = ?').run(id)).changes > 0
}

/** Duplicate guard: same name + same phone combo */
export function fbConversationExists(
  db:    Database.Database,
  name:  string,
  phone: string | null,
): boolean {
  if (phone) {
    return !!db.prepare(
      'SELECT id FROM fb_conversations WHERE lower(name) = lower(?) AND phone = ? LIMIT 1'
    ).get(name, phone)
  }
  return !!db.prepare(
    'SELECT id FROM fb_conversations WHERE lower(name) = lower(?) AND phone IS NULL LIMIT 1'
  ).get(name)
}

/** Conversations due for follow-up today or earlier */
export function listOverdueFbConversations(db: Database.Database): FbConversation[] {
  const today = new Date().toISOString().split('T')[0]
  return db.prepare(
    "SELECT * FROM fb_conversations WHERE follow_up_at <= ? AND stage NOT IN ('Converted','Dead') ORDER BY follow_up_at ASC"
  ).all(today) as FbConversation[]
}
