import Database from 'better-sqlite3'
import { getRecommendations } from './loadScanner'
import { getAllDriversWeeklyScorecards } from './repositories/driverPerformanceRepo'
import type { MorningDispatchBriefRow } from '../../src/types/models'

// ---------------------------------------------------------------------------
// Morning Dispatch Brief
// Assembles the driver-first morning planning data for the Operations page.
//
// For each eligible driver (Active, no current in-progress dispatch load):
//   - Top 3 scored load recommendations (via existing loadScanner logic)
//   - Behavior context: acceptance rate, avg response time, weekly dispatcher revenue
//   - Location / min RPM from driver record
//
// Sort order: has suggestions → best top-suggestion score → no suggestions last.
// ---------------------------------------------------------------------------

type DriverDetail = {
  id:               number
  current_location: string | null
  min_rpm:          number | null
}

export function getMorningDispatchBrief(db: Database.Database): MorningDispatchBriefRow[] {
  // 1. Load recommendations — reuses existing scanner logic entirely
  const recommendations = getRecommendations(db)

  if (recommendations.length === 0) return []

  // 2. Driver details for eligible drivers (current_location, min_rpm)
  const driverIds = recommendations.map(r => r.driver_id)
  const placeholders = driverIds.map(() => '?').join(',')
  const driverDetails = db.prepare(
    `SELECT id, current_location, min_rpm FROM drivers WHERE id IN (${placeholders})`
  ).all(...driverIds) as DriverDetail[]

  const detailMap = new Map<number, DriverDetail>(
    driverDetails.map(d => [d.id, d])
  )

  // 3. Weekly scorecard data — reuse existing all-drivers query
  const scorecards = getAllDriversWeeklyScorecards(db)
  const scorecardMap = new Map(scorecards.map(s => [s.driver_id, s]))

  // 4. Merge into MorningDispatchBriefRow[]
  const rows: MorningDispatchBriefRow[] = recommendations.map(rec => {
    const detail = detailMap.get(rec.driver_id)
    const sc     = scorecardMap.get(rec.driver_id)
    const top3   = rec.recommendations.slice(0, 3)

    return {
      driver_id:               rec.driver_id,
      driver_name:             rec.driver_name,
      current_location:        detail?.current_location ?? null,
      min_rpm:                 detail?.min_rpm ?? null,
      acceptance_rate:         sc?.acceptance_rate != null ? sc.acceptance_rate : null,
      avg_response_minutes:    sc?.avg_response_minutes ?? null,
      dispatcher_revenue_week: sc?.dispatcher_revenue ?? null,
      suggestions: top3.map(r => ({
        load_id:     r.load_id_pk,
        origin:      r.origin_city && r.origin_state
                       ? `${r.origin_city}, ${r.origin_state}`
                       : r.origin_city ?? null,
        destination: r.dest_city && r.dest_state
                       ? `${r.dest_city}, ${r.dest_state}`
                       : r.dest_city ?? null,
        rpm:         r.rpm,
        deadhead:    r.deadhead_miles,
        gross_rate:  r.gross_rate,
        broker_name: r.broker_name,
        pickup_date: r.pickup_date,
        pickup_time: null,
        score:       r.score,
      })),
    }
  })

  // 5. Sort: valid suggestions first → best score desc → no-suggestion rows last
  rows.sort((a, b) => {
    const aHas = a.suggestions.length > 0
    const bHas = b.suggestions.length > 0
    if (aHas && !bHas) return -1
    if (!aHas && bHas) return 1
    const aTop = a.suggestions[0]?.score ?? -999
    const bTop = b.suggestions[0]?.score ?? -999
    return bTop - aTop
  })

  return rows
}
