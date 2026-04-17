import Database from 'better-sqlite3'

// ---------------------------------------------------------------------------
// Driver Fallout Repo
// Tracks cases where a driver was assigned to an active load but removed
// before delivery. Every removal is recorded (full audit trail); only
// driver-fault reasons count toward the reliability fallout_count.
// ---------------------------------------------------------------------------

/**
 * Reasons that represent true driver reliability failure.
 * Only these increase fallout_count and can lower driver tier.
 */
export const FALLOUT_REASONS = new Set([
  'driver_backed_out',
  'no_response_after_acceptance',
])

export interface DriverFalloutStats {
  /** Reliability-penalised removals (driver-fault reasons only). */
  fallout_count:                number
  /** Subset of fallout_count: removed while load was Picked Up or In Transit. */
  accepted_not_completed_count: number
  /**
   * completion_rate: completed_loads / (completed_loads + fallout_count).
   * null when there is not enough data to compute a meaningful rate.
   */
  completion_rate:              number | null
  /** Total recorded unassignments regardless of reason (for audit display). */
  total_unassignments:          number
  /** Removals that were non-penalised (admin/neutral reasons). */
  neutral_unassignments:        number
}

export interface DriverFalloutCountRow {
  driver_id:                    number
  fallout_count:                number
  accepted_not_completed_count: number
}

/**
 * Log an unassignment event. Always inserts for full audit trail.
 * The `unassignment_reason` determines whether this counts as fallout
 * (see FALLOUT_REASONS). NULL reason is treated as fallout for backward compat.
 */
export function logFallout(
  db:                  Database.Database,
  driverId:            number,
  loadId:              number,
  loadStatus:          string,
  unassignmentReason?: string,
  notes?:              string,
): void {
  db.prepare(
    'INSERT INTO driver_fallout_log ' +
    '(driver_id, load_id, load_status_at_removal, unassignment_reason, notes) ' +
    'VALUES (?, ?, ?, ?, ?)'
  ).run(driverId, loadId, loadStatus, unassignmentReason ?? null, notes ?? null)
}

/**
 * Per-driver fallout stats for the Driver Drawer performance section.
 * fallout_count counts only driver-fault reasons (or NULL for backward compat).
 */
export function getDriverFalloutStats(
  db:       Database.Database,
  driverId: number,
): DriverFalloutStats {
  const row = db.prepare(`
    SELECT
      COUNT(*) AS total_unassignments,
      SUM(CASE
        WHEN unassignment_reason IS NULL
          OR unassignment_reason IN ('driver_backed_out','no_response_after_acceptance')
        THEN 1 ELSE 0 END)                                                AS fallout_count,
      SUM(CASE
        WHEN (unassignment_reason IS NULL
          OR unassignment_reason IN ('driver_backed_out','no_response_after_acceptance'))
          AND load_status_at_removal IN ('Picked Up','In Transit')
        THEN 1 ELSE 0 END)                                                AS accepted_not_completed_count
    FROM driver_fallout_log
    WHERE driver_id = ?
  `).get(driverId) as {
    total_unassignments:          number
    fallout_count:                number
    accepted_not_completed_count: number
  }

  const falloutCount = row.fallout_count ?? 0
  const totalCount   = row.total_unassignments ?? 0
  const ancCount     = row.accepted_not_completed_count ?? 0
  const neutralCount = totalCount - falloutCount

  const completedRow = db.prepare(
    "SELECT COUNT(*) AS c FROM loads WHERE driver_id = ? AND status IN ('Delivered','Invoiced','Paid')"
  ).get(driverId) as { c: number }

  const completed      = completedRow.c ?? 0
  const total          = completed + falloutCount
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : null

  return {
    fallout_count:                falloutCount,
    accepted_not_completed_count: ancCount,
    completion_rate:              completionRate,
    total_unassignments:          totalCount,
    neutral_unassignments:        neutralCount,
  }
}

/**
 * Batch query returning only driver-fault fallout counts for all drivers.
 * Used by the Drivers table to compute tier without N individual IPC calls.
 */
export function getAllDriverFalloutCounts(
  db: Database.Database,
): DriverFalloutCountRow[] {
  return db.prepare(`
    SELECT
      driver_id,
      SUM(CASE
        WHEN unassignment_reason IS NULL
          OR unassignment_reason IN ('driver_backed_out','no_response_after_acceptance')
        THEN 1 ELSE 0 END) AS fallout_count,
      SUM(CASE
        WHEN (unassignment_reason IS NULL
          OR unassignment_reason IN ('driver_backed_out','no_response_after_acceptance'))
          AND load_status_at_removal IN ('Picked Up','In Transit')
        THEN 1 ELSE 0 END) AS accepted_not_completed_count
    FROM driver_fallout_log
    GROUP BY driver_id
  `).all() as DriverFalloutCountRow[]
}
