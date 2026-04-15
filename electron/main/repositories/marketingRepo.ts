import Database from 'better-sqlite3'
import { FACEBOOK_GROUPS } from '../fbGroupsSeed'

export interface MarketingGroup {
  id:                     number
  name:                   string
  url:                    string | null
  platform:               string
  last_posted_at:         string | null  // YYYY-MM-DD
  notes:                  string | null
  truck_type_tags:        string         // JSON array string e.g. '["Hotshot","Dry Van"]'
  region_tags:            string         // JSON array string
  active:                 number         // 1 | 0
  category:               string         // hotshot | box_truck | owner_operator | dispatcher | general_loads | reefer | mixed | other
  priority:               string         // High | Medium | Low
  last_reviewed_at:       string | null  // YYYY-MM-DD
  snooze_until:           string | null  // YYYY-MM-DD — group excluded from queue until this date
  leads_generated_count:  number
  signed_drivers_count:   number
  created_at:             string
}

// A group + the deterministic reasons it was selected today
export interface GroupRecommendation {
  group:   MarketingGroup
  score:   number
  reasons: string[]
}

// Category coverage analysis
export interface CategoryGapAnalysis {
  counts:       Record<string, number>  // active group count per category
  total:        number                  // total active groups
  gaps:         string[]                // categories with < 3 active groups
  overweight:   string[]                // categories with > 30% of total
  suggestions:  string[]                // human-readable search phrase suggestions
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
    'INSERT OR IGNORE INTO marketing_groups (name, url, platform, notes, truck_type_tags, region_tags) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(name, url, platform, notes, JSON.stringify(truckTypeTags), JSON.stringify(regionTags))
  // If the row was inserted, return it by its new id.
  // If INSERT OR IGNORE skipped due to duplicate name, return the existing row.
  if (r.changes > 0) {
    return db.prepare('SELECT * FROM marketing_groups WHERE id = ?').get(r.lastInsertRowid as number) as MarketingGroup
  }
  return db.prepare(
    'SELECT * FROM marketing_groups WHERE LOWER(TRIM(name)) = LOWER(TRIM(?))'
  ).get(name) as MarketingGroup
}

export function updateMarketingGroup(
  db: Database.Database,
  id: number,
  updates: Partial<{
    name: string; url: string | null; platform: string; notes: string | null
    truck_type_tags: string[]; region_tags: string[]; active: boolean
    category: string; priority: string; last_reviewed_at: string | null
    leads_generated_count: number; signed_drivers_count: number
  }>
): MarketingGroup | undefined {
  const fields: string[] = []
  const values: unknown[] = []
  if (updates.name                  !== undefined) { fields.push('name = ?');                  values.push(updates.name) }
  if (updates.url                   !== undefined) { fields.push('url = ?');                   values.push(updates.url) }
  if (updates.platform              !== undefined) { fields.push('platform = ?');              values.push(updates.platform) }
  if (updates.notes                 !== undefined) { fields.push('notes = ?');                 values.push(updates.notes) }
  if (updates.truck_type_tags       !== undefined) { fields.push('truck_type_tags = ?');       values.push(JSON.stringify(updates.truck_type_tags)) }
  if (updates.region_tags           !== undefined) { fields.push('region_tags = ?');           values.push(JSON.stringify(updates.region_tags)) }
  if (updates.active                !== undefined) { fields.push('active = ?');                values.push(updates.active ? 1 : 0) }
  if (updates.category              !== undefined) { fields.push('category = ?');              values.push(updates.category) }
  if (updates.priority              !== undefined) { fields.push('priority = ?');              values.push(updates.priority) }
  if (updates.last_reviewed_at      !== undefined) { fields.push('last_reviewed_at = ?');      values.push(updates.last_reviewed_at) }
  if (updates.leads_generated_count !== undefined) { fields.push('leads_generated_count = ?'); values.push(updates.leads_generated_count) }
  if (updates.signed_drivers_count  !== undefined) { fields.push('signed_drivers_count = ?');  values.push(updates.signed_drivers_count) }
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

// ── Facebook Groups Recommendation Engine ─────────────────────────────────────

/**
 * Seed all groups from the static FACEBOOK_GROUPS data file using INSERT OR IGNORE.
 * Safe to call multiple times — never overwrites last_posted_at or performance counters.
 * Called from seedMissingItems() and dev:seedMissing IPC handler.
 */
export function seedFbGroups(db: Database.Database): void {
  const ins = db.prepare(
    'INSERT OR IGNORE INTO marketing_groups ' +
    '(name, url, platform, notes, truck_type_tags, region_tags, active, category, priority) ' +
    'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  )
  const tx = db.transaction(() => {
    for (const g of FACEBOOK_GROUPS) {
      ins.run(
        g.name,
        g.url,
        'Facebook',
        g.notes,
        JSON.stringify([]),  // truck_type_tags: use category instead
        JSON.stringify([]),  // region_tags
        g.active ? 1 : 0,
        g.category,
        g.priority,
      )
    }
  })
  tx()
}

/**
 * Select today's recommended groups to post in.
 * Scoring (deterministic, no AI):
 *   +50  never posted
 *   +2   per day since last post (capped at 30 pts)
 *   +30  High priority
 *   +15  Medium priority
 *   +10  not reviewed in >30 days
 * Category diversity: at most 3 groups per category in the final set.
 */
export function getTodaysGroups(db: Database.Database, n = 8): GroupRecommendation[] {
  const today = new Date().toISOString().split('T')[0]
  const rows = db.prepare(
    "SELECT * FROM marketing_groups WHERE active = 1 AND platform = 'Facebook'" +
    " AND (snooze_until IS NULL OR snooze_until <= ?)"
  ).all(today) as MarketingGroup[]

  const scored: GroupRecommendation[] = rows.map(g => {
    const reasons: string[] = []
    let score = 0

    // Never posted
    if (!g.last_posted_at) {
      score += 50
      reasons.push('Never posted')
    } else {
      const days = Math.floor(
        (new Date(today).getTime() - new Date(g.last_posted_at).getTime()) / 86400000
      )
      const pts = Math.min(days * 2, 30)
      score += pts
      if (days >= 7)       reasons.push('Last posted ' + days + 'd ago')
      else if (days >= 3)  reasons.push('Due for post (' + days + 'd)')
    }

    // Priority bonus
    if (g.priority === 'High')   { score += 30; reasons.push('High priority') }
    else if (g.priority === 'Medium') { score += 15 }

    // Stale review
    if (!g.last_reviewed_at) {
      score += 10
    } else {
      const reviewDays = Math.floor(
        (new Date(today).getTime() - new Date(g.last_reviewed_at).getTime()) / 86400000
      )
      if (reviewDays > 30) { score += 10; reasons.push('Review overdue') }
    }

    // Already posted today — deprioritize
    if (g.last_posted_at === today) {
      score = -999
    }

    // Small random jitter (±4) so equal-score groups shuffle on each refresh
    score += (Math.random() * 8) - 4

    return { group: g, score, reasons }
  })

  // Sort descending
  scored.sort((a, b) => b.score - a.score)

  // Apply category diversity: max 3 per category
  const result: GroupRecommendation[] = []
  const catCounts: Record<string, number> = {}
  for (const item of scored) {
    if (item.score < 0) continue  // already posted today
    const cat = item.group.category || 'mixed'
    if ((catCounts[cat] ?? 0) >= 3) continue
    result.push(item)
    catCounts[cat] = (catCounts[cat] ?? 0) + 1
    if (result.length >= n) break
  }

  // If diversity cap left us short, fill from remaining
  if (result.length < n) {
    for (const item of scored) {
      if (item.score < 0) continue
      if (result.find(r => r.group.id === item.group.id)) continue
      result.push(item)
      if (result.length >= n) break
    }
  }

  return result
}

/**
 * Analyze category coverage across all active groups.
 * Returns counts per category, gaps (< 3 groups), overweight (> 30%),
 * and plain-English search phrase suggestions for each gap.
 */
export function getCategoryAnalysis(db: Database.Database): CategoryGapAnalysis {
  const rows = db.prepare(
    "SELECT category FROM marketing_groups WHERE active = 1 AND platform = 'Facebook'"
  ).all() as Array<{ category: string }>

  const ALL_CATS = ['hotshot', 'box_truck', 'owner_operator', 'dispatcher', 'general_loads', 'reefer', 'mixed', 'other']
  const counts: Record<string, number> = {}
  for (const cat of ALL_CATS) counts[cat] = 0
  for (const r of rows) counts[r.category] = (counts[r.category] ?? 0) + 1

  const total = rows.length
  const gaps = ALL_CATS.filter(c => c !== 'other' && (counts[c] ?? 0) < 3)
  const overweight = ALL_CATS.filter(c => total > 0 && (counts[c] / total) > 0.30)

  const SEARCH_PHRASES: Record<string, string[]> = {
    hotshot:        ['hotshot trucking CDL non CDL', 'hotshot loads owner operator', 'hotshot dispatch service'],
    box_truck:      ['box truck loads owner operator', 'cargo van and box truck dispatch', '26ft box truck freight'],
    owner_operator: ['owner operators looking for dispatcher', 'new authority truck dispatcher', 'owner operator network trucking'],
    dispatcher:     ['truck dispatcher USA', 'freight dispatcher owner operator', 'dispatch service for truckers'],
    general_loads:  ['truck load board USA', 'freight broker owner operator', 'dry van loads flatbed loads'],
    reefer:         ['reefer load board', 'refrigerated freight owner operator', 'reefer truck dispatcher'],
    mixed:          ['CDL trucking jobs owner operator', 'trucking network USA', 'trucker community USA'],
  }

  const suggestions: string[] = gaps.flatMap(cat => {
    const catLabel = cat.replace('_', ' ')
    const phrases = SEARCH_PHRASES[cat] ?? []
    return [
      'You are underweight in ' + catLabel + ' groups (' + (counts[cat] ?? 0) + ' active).',
      ...phrases.map(p => 'Search Facebook for: "' + p + '"'),
    ]
  })

  return { counts, total, gaps, overweight, suggestions }
}

/**
 * Mark a group as reviewed today (updates last_reviewed_at).
 */
export function markGroupReviewed(db: Database.Database, id: number, date: string): MarketingGroup | undefined {
  db.prepare('UPDATE marketing_groups SET last_reviewed_at = ? WHERE id = ?').run(date, id)
  return db.prepare('SELECT * FROM marketing_groups WHERE id = ?').get(id) as MarketingGroup | undefined
}

/**
 * Snooze a group — excludes it from getTodaysGroups and the Operations count
 * until the given date (typically today + 30 days).
 */
export function snoozeGroup(db: Database.Database, id: number, until: string): MarketingGroup | undefined {
  db.prepare('UPDATE marketing_groups SET snooze_until = ? WHERE id = ?').run(until, id)
  return db.prepare('SELECT * FROM marketing_groups WHERE id = ?').get(id) as MarketingGroup | undefined
}
