import Database from 'better-sqlite3'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface OutreachRefreshEntry {
  id:                   number
  refreshed_at:         string   // ISO datetime
  notes:                string | null
  template_count_added: number
}

export interface OutreachTemplatePerf {
  template_id:    string
  uses:           number
  total_replies:  number
  total_leads:    number
  score:          number   // replies*1 + leads*3
}

// ── Refresh Log ───────────────────────────────────────────────────────────────

/**
 * Returns the most recent refresh entry, or null if none exists.
 * Used on Marketing page mount to decide whether to show the amber reminder banner.
 */
export function getLastRefresh(db: Database.Database): OutreachRefreshEntry | null {
  return (db.prepare(
    'SELECT * FROM outreach_refresh_log ORDER BY refreshed_at DESC LIMIT 1'
  ).get() as OutreachRefreshEntry | undefined) ?? null
}

/**
 * Inserts a refresh record. Call this when Chris clicks "Mark done" on the
 * weekly refresh banner.
 */
export function logRefresh(
  db:                  Database.Database,
  notes:               string | null,
  templateCountAdded:  number,
): OutreachRefreshEntry {
  const r = db.prepare(
    'INSERT INTO outreach_refresh_log (notes, template_count_added) VALUES (?, ?)'
  ).run(notes, templateCountAdded)
  return db.prepare(
    'SELECT * FROM outreach_refresh_log WHERE id = ?'
  ).get(r.lastInsertRowid as number) as OutreachRefreshEntry
}

// ── Performance ───────────────────────────────────────────────────────────────

/**
 * Aggregates marketing_post_log by template_id to produce a ranked performance
 * table. Score = total_replies + (total_leads * 3).
 *
 * Only rows where posted = 1 are counted.
 * Results ordered best → worst by score.
 */
export function getOutreachPerformance(db: Database.Database): OutreachTemplatePerf[] {
  return db.prepare(`
    SELECT
      template_id,
      COUNT(*)                                         AS uses,
      COALESCE(SUM(replies_count),   0)                AS total_replies,
      COALESCE(SUM(leads_generated), 0)                AS total_leads,
      COALESCE(SUM(replies_count), 0) + COALESCE(SUM(leads_generated), 0) * 3 AS score
    FROM marketing_post_log
    WHERE posted = 1
    GROUP BY template_id
    ORDER BY score DESC, uses DESC
  `).all() as OutreachTemplatePerf[]
}

/**
 * Returns a simple summary:
 *   - total posts logged
 *   - total replies
 *   - total leads
 *   - top_template_id (highest score)
 *   - stale_template_ids: templates with uses >= 8 and score = 0
 */
export function getOutreachSummary(db: Database.Database): {
  total_posts:        number
  total_replies:      number
  total_leads:        number
  top_template_id:    string | null
  stale_template_ids: string[]
} {
  const perf = getOutreachPerformance(db)
  const totals = db.prepare(
    "SELECT COUNT(*) AS posts, COALESCE(SUM(replies_count),0) AS replies, COALESCE(SUM(leads_generated),0) AS leads FROM marketing_post_log WHERE posted = 1"
  ).get() as { posts: number; replies: number; leads: number }

  return {
    total_posts:        totals.posts,
    total_replies:      totals.replies,
    total_leads:        totals.leads,
    top_template_id:    perf[0]?.template_id ?? null,
    stale_template_ids: perf.filter(p => p.uses >= 8 && p.score === 0).map(p => p.template_id),
  }
}
