/**
 * Agent 3 — Facebook Content + Posting Agent
 * Post queue with category rotation and anti-repeat tracking.
 */
import Database from 'better-sqlite3'

export type FbContentCategory =
  | 'Driver Recruitment'
  | 'Educational'
  | 'New Authority Tip'
  | 'Lane Availability'
  | 'Small Fleet Positioning'
  | 'Trust / Credibility'
  | 'Engagement Question'

export type FbQueueStatus = 'draft' | 'scheduled' | 'posted' | 'skipped'

export const FB_CONTENT_CATEGORIES: FbContentCategory[] = [
  'Driver Recruitment',
  'Educational',
  'New Authority Tip',
  'Lane Availability',
  'Small Fleet Positioning',
  'Trust / Credibility',
  'Engagement Question',
]

export interface FbQueuePost {
  id:            number
  content:       string
  category:      FbContentCategory
  variation_of:  number | null        // FK to parent post if this is a variation
  scheduled_for: string | null        // YYYY-MM-DD
  group_ids:     string               // JSON array of marketing_groups.id
  status:        FbQueueStatus
  posted_at:     string | null        // ISO timestamp
  created_at:    string
}

export type CreateFbQueuePostDto = Omit<FbQueuePost, 'id' | 'created_at'>
export type UpdateFbQueuePostDto = Partial<CreateFbQueuePostDto>

export function listFbQueuePosts(
  db:      Database.Database,
  status?: FbQueueStatus,
): FbQueuePost[] {
  if (status) {
    return db.prepare(
      'SELECT * FROM fb_post_queue WHERE status = ? ORDER BY scheduled_for ASC, created_at DESC'
    ).all(status) as FbQueuePost[]
  }
  // Default: show all except skipped
  return db.prepare(
    "SELECT * FROM fb_post_queue WHERE status != 'skipped' ORDER BY scheduled_for ASC, created_at DESC"
  ).all() as FbQueuePost[]
}

export function createFbQueuePost(db: Database.Database, dto: CreateFbQueuePostDto): FbQueuePost {
  const r = db.prepare(
    'INSERT INTO fb_post_queue (content, category, variation_of, scheduled_for, group_ids, status, posted_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(
    dto.content,
    dto.category,
    dto.variation_of  ?? null,
    dto.scheduled_for ?? null,
    dto.group_ids     ?? '[]',
    dto.status        ?? 'draft',
    dto.posted_at     ?? null,
  )
  return db.prepare('SELECT * FROM fb_post_queue WHERE id = ?').get(r.lastInsertRowid as number) as FbQueuePost
}

export function updateFbQueuePost(
  db:  Database.Database,
  id:  number,
  dto: UpdateFbQueuePostDto,
): FbQueuePost | undefined {
  const fields: string[] = []
  const values: unknown[] = []
  for (const [k, v] of Object.entries(dto)) {
    if (v !== undefined) { fields.push(k + ' = ?'); values.push(v) }
  }
  if (fields.length === 0) {
    return db.prepare('SELECT * FROM fb_post_queue WHERE id = ?').get(id) as FbQueuePost | undefined
  }
  values.push(id)
  db.prepare('UPDATE fb_post_queue SET ' + fields.join(', ') + ' WHERE id = ?').run(...values)
  return db.prepare('SELECT * FROM fb_post_queue WHERE id = ?').get(id) as FbQueuePost | undefined
}

export function deleteFbQueuePost(db: Database.Database, id: number): boolean {
  return (db.prepare('DELETE FROM fb_post_queue WHERE id = ?').run(id)).changes > 0
}

/** Categories used in the last N days — drives rotation logic */
export function getRecentFbPostCategories(db: Database.Database, days = 7): string[] {
  const cutoff = new Date(Date.now() - days * 864e5).toISOString().split('T')[0]
  const rows = db.prepare(
    "SELECT category FROM fb_post_queue WHERE status = 'posted' AND posted_at >= ? ORDER BY posted_at DESC"
  ).all(cutoff) as Array<{ category: string }>
  return rows.map(r => r.category)
}

/**
 * Suggests the next category to use.
 * Logic: first pick a category not used in the last 7 days.
 * If all have been used, pick the one used least recently.
 */
export function suggestNextCategory(db: Database.Database): FbContentCategory {
  const recent = getRecentFbPostCategories(db, 7)
  const unused = FB_CONTENT_CATEGORIES.filter(c => !recent.includes(c))
  if (unused.length > 0) return unused[0]
  // All used — return least-recently-used
  const counts: Record<string, number> = {}
  for (const c of FB_CONTENT_CATEGORIES) counts[c] = 0
  for (const c of recent) if (c in counts) counts[c]++
  return [...FB_CONTENT_CATEGORIES].sort((a, b) => counts[a] - counts[b])[0]
}
