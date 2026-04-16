import Database from 'better-sqlite3'
import type { DriverWeeklyScorecard } from '../../../src/types/models'

// ---------------------------------------------------------------------------
// Week boundary helpers
// ---------------------------------------------------------------------------

interface WeekBounds {
  weekStart:  string   // YYYY-MM-DD (Monday)
  weekEnd:    string   // YYYY-MM-DD (Sunday)
  priorStart: string   // YYYY-MM-DD (previous Monday)
  priorEnd:   string   // YYYY-MM-DD (previous Sunday)
}

function getWeekBounds(): WeekBounds {
  const now = new Date()
  // (0=Sun,1=Mon,...,6=Sat) → days since last Monday
  const daysFromMonday = (now.getDay() + 6) % 7
  const monday = new Date(now)
  monday.setDate(now.getDate() - daysFromMonday)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)

  const priorMonday = new Date(monday)
  priorMonday.setDate(monday.getDate() - 7)
  const priorSunday = new Date(monday)
  priorSunday.setDate(monday.getDate() - 1)

  const fmt = (d: Date) => d.toISOString().slice(0, 10)
  return {
    weekStart:  fmt(monday),
    weekEnd:    fmt(sunday),
    priorStart: fmt(priorMonday),
    priorEnd:   fmt(priorSunday),
  }
}

// ---------------------------------------------------------------------------
// Single-driver weekly scorecard
// ---------------------------------------------------------------------------

export function getDriverWeeklyScorecard(
  db:       Database.Database,
  driverId: number,
): DriverWeeklyScorecard {
  const { weekStart, weekEnd, priorStart, priorEnd } = getWeekBounds()

  // Driver name
  const driverRow = db.prepare('SELECT name FROM drivers WHERE id = ?').get(driverId) as
    { name: string } | undefined

  // Load stats — dispatch-mode, status past "Searching", pickup_date in window
  const loadRow = db.prepare(`
    SELECT
      COUNT(*)                                                                  AS loads_booked,
      COALESCE(SUM(COALESCE(rate, 0)), 0)                                       AS gross_revenue,
      COALESCE(SUM(CASE WHEN rate IS NOT NULL AND dispatch_pct IS NOT NULL
        THEN rate * dispatch_pct / 100.0 ELSE 0 END), 0)                        AS dispatcher_revenue,
      CASE WHEN SUM(CASE WHEN miles > 0 THEN 1 ELSE 0 END) > 0
        THEN SUM(CASE WHEN miles > 0 THEN rate / CAST(miles AS REAL) ELSE 0 END)
           / SUM(CASE WHEN miles > 0 THEN 1 ELSE 0 END)
        ELSE NULL END                                                            AS avg_rpm
    FROM loads
    WHERE driver_id = ?
      AND load_mode = 'dispatch'
      AND status NOT IN ('Searching')
      AND pickup_date >= ? AND pickup_date <= ?
  `).get(driverId, weekStart, weekEnd) as {
    loads_booked:       number
    gross_revenue:      number
    dispatcher_revenue: number
    avg_rpm:            number | null
  }

  // Offer stats — current week
  const offerRow = db.prepare(`
    SELECT
      COUNT(*)                                                                      AS total_offers,
      SUM(CASE WHEN outcome = 'accepted'    THEN 1 ELSE 0 END)                     AS accepted_count,
      SUM(CASE WHEN outcome = 'declined'    THEN 1 ELSE 0 END)                     AS declined_count,
      SUM(CASE WHEN outcome = 'no_response' THEN 1 ELSE 0 END)                     AS no_response_count,
      SUM(CASE WHEN outcome IS NULL         THEN 1 ELSE 0 END)                     AS open_offer_count,
      ROUND(
        100.0 * SUM(CASE WHEN outcome = 'accepted' THEN 1 ELSE 0 END)
        / NULLIF(SUM(CASE WHEN outcome IS NOT NULL THEN 1 ELSE 0 END), 0),
        1
      )                                                                             AS acceptance_rate,
      ROUND(AVG(CASE WHEN responded_at IS NOT NULL THEN
        (julianday(responded_at) - julianday(offered_at)) * 1440 END), 1)          AS avg_response_minutes
    FROM load_offers
    WHERE driver_id = ?
      AND date(offered_at) >= ? AND date(offered_at) <= ?
  `).get(driverId, weekStart, weekEnd) as {
    total_offers:         number
    accepted_count:       number
    declined_count:       number
    no_response_count:    number
    open_offer_count:     number
    acceptance_rate:      number | null
    avg_response_minutes: number | null
  }

  // Prior-week stats (for trend)
  const priorRow = db.prepare(`
    SELECT
      COUNT(*)                                                             AS loads_booked,
      COALESCE(SUM(CASE WHEN rate IS NOT NULL AND dispatch_pct IS NOT NULL
        THEN rate * dispatch_pct / 100.0 ELSE 0 END), 0)                   AS dispatcher_revenue
    FROM loads
    WHERE driver_id = ?
      AND load_mode = 'dispatch'
      AND status NOT IN ('Searching')
      AND pickup_date >= ? AND pickup_date <= ?
  `).get(driverId, priorStart, priorEnd) as {
    loads_booked:       number
    dispatcher_revenue: number
  }

  const revTrendPct: number | null =
    priorRow.dispatcher_revenue > 0
      ? Math.round(((loadRow.dispatcher_revenue - priorRow.dispatcher_revenue) / priorRow.dispatcher_revenue) * 100)
      : null

  const loadsTrendDelta: number =
    loadRow.loads_booked - priorRow.loads_booked

  return {
    driver_id:            driverId,
    driver_name:          driverRow?.name ?? 'Unknown',
    loads_booked:         loadRow.loads_booked ?? 0,
    gross_revenue:        loadRow.gross_revenue ?? 0,
    dispatcher_revenue:   loadRow.dispatcher_revenue ?? 0,
    avg_rpm:              loadRow.avg_rpm ?? null,
    accepted_count:       offerRow.accepted_count ?? 0,
    declined_count:       offerRow.declined_count ?? 0,
    no_response_count:    offerRow.no_response_count ?? 0,
    open_offer_count:     offerRow.open_offer_count ?? 0,
    acceptance_rate:      offerRow.acceptance_rate ?? 0,
    avg_response_minutes: offerRow.avg_response_minutes ?? null,
    revenue_trend_pct:    revTrendPct,
    loads_trend_delta:    loadsTrendDelta,
  }
}

// ---------------------------------------------------------------------------
// All-drivers weekly scorecards
// Sorted: dispatcher_revenue DESC, loads_booked DESC.
// Only includes non-Inactive drivers.
// ---------------------------------------------------------------------------

export function getAllDriversWeeklyScorecards(
  db: Database.Database,
): DriverWeeklyScorecard[] {
  const { weekStart, weekEnd } = getWeekBounds()

  const rows = db.prepare(`
    SELECT
      d.id   AS driver_id,
      d.name AS driver_name,
      COALESCE(l.loads_booked,       0)    AS loads_booked,
      COALESCE(l.gross_revenue,      0)    AS gross_revenue,
      COALESCE(l.dispatcher_revenue, 0)    AS dispatcher_revenue,
      l.avg_rpm                            AS avg_rpm,
      COALESCE(o.accepted_count,     0)    AS accepted_count,
      COALESCE(o.declined_count,     0)    AS declined_count,
      COALESCE(o.no_response_count,  0)    AS no_response_count,
      COALESCE(o.open_offer_count,   0)    AS open_offer_count,
      COALESCE(o.acceptance_rate,    0)    AS acceptance_rate,
      o.avg_response_minutes               AS avg_response_minutes
    FROM drivers d
    LEFT JOIN (
      SELECT
        driver_id,
        COUNT(*)                                                               AS loads_booked,
        COALESCE(SUM(COALESCE(rate, 0)), 0)                                    AS gross_revenue,
        COALESCE(SUM(CASE WHEN rate IS NOT NULL AND dispatch_pct IS NOT NULL
          THEN rate * dispatch_pct / 100.0 ELSE 0 END), 0)                     AS dispatcher_revenue,
        CASE WHEN SUM(CASE WHEN miles > 0 THEN 1 ELSE 0 END) > 0
          THEN SUM(CASE WHEN miles > 0 THEN rate / CAST(miles AS REAL) ELSE 0 END)
             / SUM(CASE WHEN miles > 0 THEN 1 ELSE 0 END)
          ELSE NULL END                                                         AS avg_rpm
      FROM loads
      WHERE load_mode = 'dispatch'
        AND driver_id IS NOT NULL
        AND status NOT IN ('Searching')
        AND pickup_date >= ? AND pickup_date <= ?
      GROUP BY driver_id
    ) l ON l.driver_id = d.id
    LEFT JOIN (
      SELECT
        driver_id,
        SUM(CASE WHEN outcome = 'accepted'    THEN 1 ELSE 0 END)               AS accepted_count,
        SUM(CASE WHEN outcome = 'declined'    THEN 1 ELSE 0 END)               AS declined_count,
        SUM(CASE WHEN outcome = 'no_response' THEN 1 ELSE 0 END)               AS no_response_count,
        SUM(CASE WHEN outcome IS NULL         THEN 1 ELSE 0 END)               AS open_offer_count,
        ROUND(
          100.0 * SUM(CASE WHEN outcome = 'accepted' THEN 1 ELSE 0 END)
          / NULLIF(SUM(CASE WHEN outcome IS NOT NULL THEN 1 ELSE 0 END), 0),
          1
        )                                                                       AS acceptance_rate,
        ROUND(AVG(CASE WHEN responded_at IS NOT NULL THEN
          (julianday(responded_at) - julianday(offered_at)) * 1440 END), 1)    AS avg_response_minutes
      FROM load_offers
      WHERE date(offered_at) >= ? AND date(offered_at) <= ?
      GROUP BY driver_id
    ) o ON o.driver_id = d.id
    WHERE d.status != 'Inactive'
    ORDER BY COALESCE(l.dispatcher_revenue, 0) DESC,
             COALESCE(l.loads_booked, 0) DESC
  `).all(weekStart, weekEnd, weekStart, weekEnd) as DriverWeeklyScorecard[]

  return rows.map(r => ({
    ...r,
    // Null coercion safety — SQLite LEFT JOIN may return null for unmatched columns
    loads_booked:         r.loads_booked         ?? 0,
    gross_revenue:        r.gross_revenue         ?? 0,
    dispatcher_revenue:   r.dispatcher_revenue    ?? 0,
    avg_rpm:              r.avg_rpm               ?? null,
    accepted_count:       r.accepted_count        ?? 0,
    declined_count:       r.declined_count        ?? 0,
    no_response_count:    r.no_response_count     ?? 0,
    open_offer_count:     r.open_offer_count      ?? 0,
    acceptance_rate:      r.acceptance_rate       ?? 0,
    avg_response_minutes: r.avg_response_minutes  ?? null,
    revenue_trend_pct:    undefined,
    loads_trend_delta:    undefined,
  }))
}
