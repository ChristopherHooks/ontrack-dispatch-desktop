/**
 * Broker Intelligence + Lane Memory
 *
 * Derives broker ratings, lane strength, and driver-lane fit
 * from existing loads/brokers/drivers data. No new schema needed.
 *
 * Scoring is fully deterministic and explainable.
 */

import type { Database } from 'better-sqlite3'

// --------------------------------------------------------------------------
// Types
// --------------------------------------------------------------------------

export type BrokerRating = 'Preferred' | 'Strong' | 'Neutral' | 'Caution' | 'Avoid'

export interface BrokerIntelRow {
  broker_id:    number
  broker_name:  string
  flag:         string
  loads_count:  number
  avg_rpm:      number | null   // avg rate/miles for loads with miles > 0
  total_revenue: number
  score:        number          // 0–100
  rating:       BrokerRating
  caution_note: string | null   // short human-readable explanation when rating is Caution/Avoid
}

export type LaneStrength = 'Strong' | 'Average' | 'Weak'

export interface LaneIntelRow {
  origin_state:  string
  dest_state:    string
  loads_count:   number
  avg_rpm:       number
  total_revenue: number
  strength:      LaneStrength
}

export type DriverLaneFit = 'Strong Fit' | 'Has History' | 'New Lane'

export interface DriverLaneFitRow {
  origin_state: string
  dest_state:   string
  loads_count:  number
  avg_rpm:      number | null
  fit:          DriverLaneFit
}

// --------------------------------------------------------------------------
// Scoring helpers
// --------------------------------------------------------------------------

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v))
}

function brokerScore(
  flag: string,
  loads_count: number,
  avg_rpm: number | null
): number {
  // Blacklisted brokers always score 0
  if (flag === 'Blacklisted') return 0

  let score = 50

  // RPM adjustment: benchmark is $2.00/mi
  if (avg_rpm !== null) {
    const diff = avg_rpm - 2.0
    score += clamp(diff * 15, -20, 20)   // ±20 pts across ±$1.33/mi range
  }

  // Volume bonus: up to +15 pts for established relationship
  score += Math.min(loads_count * 3, 15)

  // Flag adjustments
  if (flag === 'Preferred') score += 25
  if (flag === 'Slow Pay')  score -= 20
  if (flag === 'Avoid')     score -= 40

  return clamp(Math.round(score), 0, 100)
}

function brokerRating(score: number, flag: string): BrokerRating {
  if (flag === 'Blacklisted' || flag === 'Avoid') return 'Avoid'
  if (score >= 65) return flag === 'Preferred' ? 'Preferred' : 'Strong'
  if (score >= 40) return 'Neutral'
  if (score >= 20) return 'Caution'
  return 'Avoid'
}

function brokerCautionNote(
  rating: BrokerRating,
  flag: string,
  avg_rpm: number | null,
  loads_count: number
): string | null {
  if (rating === 'Preferred' || rating === 'Strong' || rating === 'Neutral') return null
  if (flag === 'Blacklisted') return 'Broker is blacklisted'
  if (flag === 'Avoid')       return 'Broker is flagged Avoid'
  if (flag === 'Slow Pay')    return 'Broker has slow pay history'
  if (loads_count === 0)      return 'No load history with this broker'
  if (avg_rpm !== null && avg_rpm < 1.50) return `Low average RPM ($${avg_rpm.toFixed(2)}/mi)`
  return 'Low overall score — verify before booking'
}

function laneStrength(avg_rpm: number, loads_count: number): LaneStrength {
  if (avg_rpm >= 2.50 && loads_count >= 3) return 'Strong'
  if (avg_rpm >= 1.80 || loads_count >= 2) return 'Average'
  return 'Weak'
}

function driverLaneFit(loads_count: number, avg_rpm: number | null): DriverLaneFit {
  if (loads_count >= 2 && avg_rpm !== null && avg_rpm >= 2.25) return 'Strong Fit'
  if (loads_count >= 1) return 'Has History'
  return 'New Lane'
}

// --------------------------------------------------------------------------
// Public query functions
// --------------------------------------------------------------------------

/**
 * Returns intelligence rows for all brokers.
 * Scored from existing loads data. No schema changes needed.
 */
export function getBrokerIntelAll(db: Database): BrokerIntelRow[] {
  const rows = db.prepare(`
    SELECT
      b.id                                           AS broker_id,
      b.name                                         AS broker_name,
      COALESCE(b.flag, 'None')                       AS flag,
      COUNT(l.id)                                    AS loads_count,
      AVG(CASE WHEN l.miles > 0 THEN CAST(l.rate AS REAL) / l.miles ELSE NULL END) AS avg_rpm,
      COALESCE(SUM(l.rate), 0)                       AS total_revenue
    FROM brokers b
    LEFT JOIN loads l ON l.broker_id = b.id
    GROUP BY b.id
    ORDER BY b.name ASC
  `).all() as Array<{
    broker_id: number; broker_name: string; flag: string
    loads_count: number; avg_rpm: number | null; total_revenue: number
  }>

  return rows.map((r) => {
    const score  = brokerScore(r.flag, r.loads_count, r.avg_rpm)
    const rating = brokerRating(score, r.flag)
    const caution_note = brokerCautionNote(rating, r.flag, r.avg_rpm, r.loads_count)
    return {
      broker_id:     r.broker_id,
      broker_name:   r.broker_name,
      flag:          r.flag,
      loads_count:   r.loads_count,
      avg_rpm:       r.avg_rpm,
      total_revenue: r.total_revenue,
      score,
      rating,
      caution_note,
    }
  })
}

/**
 * Returns lane intelligence rows (origin_state → dest_state aggregates).
 * Covers all completed/paid/delivered loads with both states populated.
 */
export function getLaneIntelAll(db: Database): LaneIntelRow[] {
  const rows = db.prepare(`
    SELECT
      origin_state,
      dest_state,
      COUNT(*)                                                          AS loads_count,
      AVG(CASE WHEN miles > 0 THEN CAST(rate AS REAL) / miles END)     AS avg_rpm,
      COALESCE(SUM(rate), 0)                                            AS total_revenue
    FROM loads
    WHERE origin_state IS NOT NULL
      AND dest_state   IS NOT NULL
      AND status IN ('Booked','Picked Up','In Transit','Delivered','Invoiced','Paid')
    GROUP BY origin_state, dest_state
    ORDER BY loads_count DESC, avg_rpm DESC
  `).all() as Array<{
    origin_state: string; dest_state: string
    loads_count: number; avg_rpm: number | null; total_revenue: number
  }>

  return rows.map((r) => ({
    origin_state:  r.origin_state,
    dest_state:    r.dest_state,
    loads_count:   r.loads_count,
    avg_rpm:       r.avg_rpm ?? 0,
    total_revenue: r.total_revenue,
    strength:      laneStrength(r.avg_rpm ?? 0, r.loads_count),
  }))
}

/**
 * Returns lane fit rows for a specific driver.
 * Shows lanes the driver has run and how well they performed.
 */
export function getDriverLaneFits(db: Database, driverId: number): DriverLaneFitRow[] {
  const rows = db.prepare(`
    SELECT
      origin_state,
      dest_state,
      COUNT(*)                                                          AS loads_count,
      AVG(CASE WHEN miles > 0 THEN CAST(rate AS REAL) / miles END)     AS avg_rpm
    FROM loads
    WHERE driver_id    = ?
      AND origin_state IS NOT NULL
      AND dest_state   IS NOT NULL
    GROUP BY origin_state, dest_state
    ORDER BY loads_count DESC, avg_rpm DESC
  `).all(driverId) as Array<{
    origin_state: string; dest_state: string
    loads_count: number; avg_rpm: number | null
  }>

  return rows.map((r) => ({
    origin_state: r.origin_state,
    dest_state:   r.dest_state,
    loads_count:  r.loads_count,
    avg_rpm:      r.avg_rpm,
    fit:          driverLaneFit(r.loads_count, r.avg_rpm),
  }))
}
