import Database from 'better-sqlite3'
import type { LoadOffer, LoadOfferStats } from '../../../src/types/models'

function nowStr(): string {
  return new Date().toISOString().slice(0, 19).replace('T', ' ')
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Return the most recent open offer (outcome IS NULL) for a (driver, load) pair,
 * or undefined if none exists.
 */
function findOpenOffer(
  db:       Database.Database,
  driverId: number,
  loadId:   number,
): LoadOffer | undefined {
  return db.prepare(
    'SELECT * FROM load_offers' +
    '  WHERE driver_id = ? AND load_id = ? AND outcome IS NULL' +
    '  ORDER BY offered_at DESC LIMIT 1'
  ).get(driverId, loadId) as LoadOffer | undefined
}

// ---------------------------------------------------------------------------
// Write operations
// ---------------------------------------------------------------------------

/**
 * Find-or-create: returns the existing open offer if one already exists for
 * this (driver_id, load_id) pair, otherwise inserts a fresh one.
 *
 * An "open" offer is any row where outcome IS NULL.  Resolved outcomes
 * (accepted, declined, no_response) never block creation of a new offer —
 * showing a previously-declined load to a driver again is a genuine new event.
 *
 * This prevents duplicate open offers caused by panel reopen / rerender
 * without limiting historical tracking of repeated exposures.
 */
export function createOffer(
  db:       Database.Database,
  driverId: number,
  loadId:   number,
): LoadOffer {
  const existing = findOpenOffer(db, driverId, loadId)
  if (existing != null) return existing

  const r = db.prepare(
    'INSERT INTO load_offers (driver_id, load_id, offered_at, created_at, updated_at)' +
    " VALUES (?, ?, datetime('now'), datetime('now'), datetime('now'))"
  ).run(driverId, loadId)
  return db.prepare('SELECT * FROM load_offers WHERE id = ?')
    .get(r.lastInsertRowid as number) as LoadOffer
}

/**
 * Mark an offer as accepted and record responded_at.
 * Only updates rows that are still open (outcome IS NULL) to prevent
 * accidentally overwriting a resolved offer.
 */
export function markAccepted(db: Database.Database, offerId: number): LoadOffer | undefined {
  const t = nowStr()
  db.prepare(
    "UPDATE load_offers SET outcome = 'accepted', responded_at = ?, updated_at = ?" +
    '  WHERE id = ? AND outcome IS NULL'
  ).run(t, t, offerId)
  return db.prepare('SELECT * FROM load_offers WHERE id = ?').get(offerId) as LoadOffer | undefined
}

/**
 * Mark an offer as declined with an optional reason and record responded_at.
 * Only updates rows that are still open.
 */
export function markDeclined(
  db:      Database.Database,
  offerId: number,
  reason?: string,
): LoadOffer | undefined {
  const t = nowStr()
  db.prepare(
    "UPDATE load_offers SET outcome = 'declined', responded_at = ?, decline_reason = ?, updated_at = ?" +
    '  WHERE id = ? AND outcome IS NULL'
  ).run(t, reason ?? null, t, offerId)
  return db.prepare('SELECT * FROM load_offers WHERE id = ?').get(offerId) as LoadOffer | undefined
}

/**
 * Mark an offer as no_response (manual dispatcher action or automated sweep).
 * Only updates rows that are still open.
 */
export function markNoResponse(db: Database.Database, offerId: number): LoadOffer | undefined {
  const t = nowStr()
  db.prepare(
    "UPDATE load_offers SET outcome = 'no_response', responded_at = ?, updated_at = ?" +
    '  WHERE id = ? AND outcome IS NULL'
  ).run(t, t, offerId)
  return db.prepare('SELECT * FROM load_offers WHERE id = ?').get(offerId) as LoadOffer | undefined
}

// ---------------------------------------------------------------------------
// Read operations
// ---------------------------------------------------------------------------

/** Return all offers for a driver, newest first. */
export function getOffersByDriver(db: Database.Database, driverId: number): LoadOffer[] {
  return db.prepare(
    'SELECT * FROM load_offers WHERE driver_id = ? ORDER BY offered_at DESC'
  ).all(driverId) as LoadOffer[]
}

/**
 * Return aggregated acceptance statistics for a driver.
 *
 * acceptance_rate denominator: resolved offers only (accepted + declined + no_response).
 * Open offers are excluded from the rate calculation because they have not been
 * acted on yet — including them would skew the number as the panel is opened.
 *
 * Edge cases:
 *   - No offers at all: returns zero-value struct (no division).
 *   - Only open offers (resolved_count = 0): acceptance_rate returned as 0.
 *   - responded_at missing: excluded from avg_response_minutes average.
 */
export function getDriverAcceptanceStats(
  db:       Database.Database,
  driverId: number,
): LoadOfferStats {
  const row = db.prepare(
    'SELECT' +
    '  COUNT(*)                                                                   AS total_offers,' +
    "  SUM(CASE WHEN outcome = 'accepted'    THEN 1 ELSE 0 END)                  AS accepted_count," +
    "  SUM(CASE WHEN outcome = 'declined'    THEN 1 ELSE 0 END)                  AS declined_count," +
    "  SUM(CASE WHEN outcome = 'no_response' THEN 1 ELSE 0 END)                  AS no_response_count," +
    '  SUM(CASE WHEN outcome IS NULL         THEN 1 ELSE 0 END)                  AS open_offer_count,' +
    // Acceptance rate uses resolved offers as denominator, not total.
    // NULLIF guards against divide-by-zero when there are only open offers.
    '  ROUND(' +
    "    100.0 * SUM(CASE WHEN outcome = 'accepted' THEN 1 ELSE 0 END)" +
    '    / NULLIF(' +
    "      SUM(CASE WHEN outcome IS NOT NULL THEN 1 ELSE 0 END)," +
    '      0' +
    '    ), 1' +
    ')                                                                            AS acceptance_rate,' +
    // avg_response_minutes: only rows with a recorded response time
    '  ROUND(AVG(CASE WHEN responded_at IS NOT NULL THEN' +
    '    (julianday(responded_at) - julianday(offered_at)) * 1440 END), 1)        AS avg_response_minutes' +
    ' FROM load_offers WHERE driver_id = ?'
  ).get(driverId) as (LoadOfferStats & { acceptance_rate: number | null }) | undefined

  if (row == null) {
    return {
      total_offers:         0,
      accepted_count:       0,
      declined_count:       0,
      no_response_count:    0,
      open_offer_count:     0,
      acceptance_rate:      0,
      avg_response_minutes: null,
    }
  }

  return {
    ...row,
    // Coerce NULL (only-open-offers case) to 0 so callers never see null here
    acceptance_rate: row.acceptance_rate ?? 0,
  }
}

// ---------------------------------------------------------------------------
// Background sweep
// ---------------------------------------------------------------------------

/**
 * Mark all open offers older than 2 hours as no_response.
 *
 * Safety guarantees:
 *   - `outcome IS NULL`  — never overwrites accepted, declined, or no_response rows
 *   - `responded_at IS NULL` — belt-and-suspenders; a resolved row will always
 *     have responded_at set, so this double-guards against any partial-update state
 *   - julianday arithmetic — only targets rows where ≥ 2 hours have elapsed
 *
 * Returns the count of rows updated (for scheduler logging).
 */
export function sweepNoResponse(db: Database.Database): number {
  const t = nowStr()
  const result = db.prepare(
    'UPDATE load_offers' +
    "  SET outcome = 'no_response', responded_at = ?, updated_at = ?" +
    '  WHERE outcome IS NULL' +
    '    AND responded_at IS NULL' +
    "    AND (julianday('now') - julianday(offered_at)) * 24 >= 2"
  ).run(t, t)
  return result.changes
}
