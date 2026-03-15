import Database from 'better-sqlite3'

export interface MarketingGroup {
  id:               number
  name:             string
  url:              string | null
  platform:         string
  last_posted_at:   string | null  // YYYY-MM-DD
  notes:            string | null
  truck_type_tags:  string         // JSON array string e.g. '["Hotshot","Dry Van"]'
  region_tags:      string         // JSON array string
  active:           number         // 1 | 0
  created_at:       string
}

export interface PostLog {
  id:               number
  template_id:      string
  category:         string
  truck_type:       string | null
  used_date:        string         // YYYY-MM-DD
  groups_posted_to: string         // JSON array string
  posted:           number         // 1 | 0
  replies_count:    number
  leads_generated:  number
  notes:            string | null
  created_at:       string
}

// ── Marketing Groups ─────────────────────────────────────────────────────────

export function listMarketingGroups(db: Database.Database): MarketingGroup[] {
  return db.prepare('SELECT * FROM marketing_groups ORDER BY last_posted_at ASC NULLS FIRST, name ASC').all() as MarketingGroup[]
}

export function createMarketingGroup(
  db: Database.Database,
  name: string,
  url: string | null,
  platform: string,
  notes: string | null,
  truckTypeTags: string[] = [],
  regionTags: string[] = [],
): MarketingGroup {
  const r = db.prepare(
    'INSERT INTO marketing_groups (name, url, platform, notes, truck_type_tags, region_tags) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(name, url, platform, notes, JSON.stringify(truckTypeTags), JSON.stringify(regionTags))
  return db.prepare('SELECT * FROM marketing_groups WHERE id = ?').get(r.lastInsertRowid as number) as MarketingGroup
}

export function updateMarketingGroup(
  db: Database.Database,
  id: number,
  updates: Partial<{
    name: string; url: string | null; platform: string; notes: string | null
    truck_type_tags: string[]; region_tags: string[]; active: boolean
  }>
): MarketingGroup | undefined {
  const fields: string[] = []
  const values: unknown[] = []
  if (updates.name            !== undefined) { fields.push('name = ?');            values.push(updates.name) }
  if (updates.url             !== undefined) { fields.push('url = ?');             values.push(updates.url) }
  if (updates.platform        !== undefined) { fields.push('platform = ?');        values.push(updates.platform) }
  if (updates.notes           !== undefined) { fields.push('notes = ?');           values.push(updates.notes) }
  if (updates.truck_type_tags !== undefined) { fields.push('truck_type_tags = ?'); values.push(JSON.stringify(updates.truck_type_tags)) }
  if (updates.region_tags     !== undefined) { fields.push('region_tags = ?');     values.push(JSON.stringify(updates.region_tags)) }
  if (updates.active          !== undefined) { fields.push('active = ?');          values.push(updates.active ? 1 : 0) }
  if (fields.length === 0) return db.prepare('SELECT * FROM marketing_groups WHERE id = ?').get(id) as MarketingGroup | undefined
  values.push(id)
  db.prepare(`UPDATE marketing_groups SET ${fields.join(', ')} WHERE id = ?`).run(...values)
  return db.prepare('SELECT * FROM marketing_groups WHERE id = ?').get(id) as MarketingGroup | undefined
}

export function markGroupPosted(db: Database.Database, id: number, date: string): MarketingGroup | undefined {
  db.prepare('UPDATE marketing_groups SET last_posted_at = ? WHERE id = ?').run(date, id)
  return db.prepare('SELECT * FROM marketing_groups WHERE id = ?').get(id) as MarketingGroup | undefined
}

export function deleteMarketingGroup(db: Database.Database, id: number): boolean {
  return db.prepare('DELETE FROM marketing_groups WHERE id = ?').run(id).changes > 0
}

// ── Post Log ─────────────────────────────────────────────────────────────────

export function listPostLog(db: Database.Database, limit = 60): PostLog[] {
  return db.prepare(
    'SELECT * FROM marketing_post_log ORDER BY used_date DESC, created_at DESC LIMIT ?'
  ).all(limit) as PostLog[]
}

export function createPostLog(
  db: Database.Database,
  templateId: string,
  category: string,
  truckType: string | null,
  usedDate: string,
  groupsPostedTo: string[],
  posted: boolean,
  repliesCount: number,
  leadsGenerated: number,
  notes: string | null,
): PostLog {
  const r = db.prepare(
    'INSERT INTO marketing_post_log ' +
    '(template_id, category, truck_type, used_date, groups_posted_to, posted, replies_count, leads_generated, notes) ' +
    'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(templateId, category, truckType, usedDate, JSON.stringify(groupsPostedTo), posted ? 1 : 0, repliesCount, leadsGenerated, notes)
  return db.prepare('SELECT * FROM marketing_post_log WHERE id = ?').get(r.lastInsertRowid as number) as PostLog
}

export function updatePostLog(
  db: Database.Database,
  id: number,
  updates: Partial<{
    groups_posted_to: string[]; posted: boolean
    replies_count: number; leads_generated: number; notes: string | null
  }>
): PostLog | undefined {
  const fields: string[] = []
  const values: unknown[] = []
  if (updates.groups_posted_to !== undefined) { fields.push('groups_posted_to = ?'); values.push(JSON.stringify(updates.groups_posted_to)) }
  if (updates.posted           !== undefined) { fields.push('posted = ?');           values.push(updates.posted ? 1 : 0) }
  if (updates.replies_count    !== undefined) { fields.push('replies_count = ?');    values.push(updates.replies_count) }
  if (updates.leads_generated  !== undefined) { fields.push('leads_generated = ?');  values.push(updates.leads_generated) }
  if (updates.notes            !== undefined) { fields.push('notes = ?');            values.push(updates.notes) }
  if (fields.length === 0) return db.prepare('SELECT * FROM marketing_post_log WHERE id = ?').get(id) as PostLog | undefined
  values.push(id)
  db.prepare(`UPDATE marketing_post_log SET ${fields.join(', ')} WHERE id = ?`).run(...values)
  return db.prepare('SELECT * FROM marketing_post_log WHERE id = ?').get(id) as PostLog | undefined
}

export function deletePostLog(db: Database.Database, id: number): boolean {
  return db.prepare('DELETE FROM marketing_post_log WHERE id = ?').run(id).changes > 0
}

export function getRecentlyUsedTemplateIds(db: Database.Database, days = 14): string[] {
  const cutoff = new Date(Date.now() - days * 86400000).toISOString().split('T')[0]
  return (
    db.prepare(
      'SELECT DISTINCT template_id FROM marketing_post_log WHERE used_date >= ? AND posted = 1'
    ).all(cutoff) as Array<{ template_id: string }>
  ).map(r => r.template_id)
}

export function getTemplateUsageCounts(db: Database.Database): Array<{ template_id: string; cnt: number }> {
  return db.prepare(
    'SELECT template_id, COUNT(*) as cnt FROM marketing_post_log WHERE posted = 1 GROUP BY template_id'
  ).all() as Array<{ template_id: string; cnt: number }>
}
