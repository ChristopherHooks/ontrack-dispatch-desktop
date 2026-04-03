import Database from 'better-sqlite3'

/**
 * Returns the onboarding checklist state for a single driver as a
 * Record<check_key, completed: boolean>.
 */
export function getDriverOnboardingChecklist(
  db: Database.Database,
  driver_id: number
): Record<string, boolean> {
  const rows = db.prepare(
    'SELECT check_key, completed FROM driver_onboarding_checklist WHERE driver_id = ?'
  ).all(driver_id) as Array<{ check_key: string; completed: number }>

  const result: Record<string, boolean> = {}
  for (const r of rows) {
    result[r.check_key] = r.completed === 1
  }
  return result
}

/**
 * Toggles (or sets) a single checklist item for a driver. Upserts the row.
 * Returns the updated full checklist record.
 */
export function setDriverOnboardingItem(
  db: Database.Database,
  driver_id: number,
  check_key: string,
  completed: boolean
): Record<string, boolean> {
  db.prepare(
    'INSERT INTO driver_onboarding_checklist (driver_id, check_key, completed, completed_at) ' +
    'VALUES (?, ?, ?, CASE WHEN ? = 1 THEN datetime(\'now\') ELSE NULL END) ' +
    'ON CONFLICT(driver_id, check_key) DO UPDATE SET ' +
    '  completed    = excluded.completed,' +
    '  completed_at = excluded.completed_at'
  ).run(driver_id, check_key, completed ? 1 : 0, completed ? 1 : 0)

  return getDriverOnboardingChecklist(db, driver_id)
}
