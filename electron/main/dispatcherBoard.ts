import Database from 'better-sqlite3'
import type { BoardRow, AvailableLoad, AssignLoadResult } from '../../../src/types/models'

/**
 * getBoardRows -- single join query for the Dispatcher Board.
 * Returns one row per driver with their most-active current load
 * (Booked > Picked Up > In Transit priority) and attached broker.
 */
export function getBoardRows(db: Database.Database): BoardRow[] {
  const sql =
    'SELECT' +
    '  d.id            AS driver_id,' +
    '  d.name          AS driver_name,' +
    '  d.status        AS driver_status,' +
    '  d.company       AS driver_company,' +
    '  d.truck_type,' +
    '  d.trailer_type,' +
    '  d.home_base,' +
    '  d.min_rpm,' +
    '  d.notes         AS driver_notes,' +
    '  l.id            AS load_id_pk,' +
    '  l.load_id       AS load_ref,' +
    '  l.status        AS load_status,' +
    '  l.origin_city,' +
    '  l.origin_state,' +
    '  l.dest_city,' +
    '  l.dest_state,' +
    '  l.pickup_date,' +
    '  l.delivery_date,' +
    '  l.miles,' +
    '  l.rate,' +
    '  l.commodity,' +
    '  l.notes         AS load_notes,' +
    '  b.id            AS broker_id,' +
    '  b.name          AS broker_name,' +
    "  b.flag          AS broker_flag" +
    ' FROM drivers d' +
    ' LEFT JOIN loads l ON l.id = (' +
    '   SELECT id FROM loads WHERE driver_id = d.id' +
    "   AND status IN ('Booked', 'Picked Up', 'In Transit') AND load_mode = 'dispatch'" +
    '   ORDER BY CASE status' +
    "     WHEN 'In Transit' THEN 1" +
    "     WHEN 'Picked Up'  THEN 2" +
    "     WHEN 'Booked'     THEN 3" +
    '   END, pickup_date ASC LIMIT 1' +
    ' )' +
    ' LEFT JOIN brokers b ON b.id = l.broker_id' +
    ' ORDER BY d.name ASC'
  return db.prepare(sql).all() as BoardRow[]
}

/**
 * getAvailableLoads -- loads with status='Searching' and no driver assigned.
 * Used to populate the Available Loads drag panel.
 */
export function getAvailableLoads(db: Database.Database): AvailableLoad[] {
  const sql =
    'SELECT' +
    '  l.id          AS load_id_pk,' +
    '  l.load_id     AS load_ref,' +
    '  l.origin_city,' +
    '  l.origin_state,' +
    '  l.dest_city,' +
    '  l.dest_state,' +
    '  l.pickup_date,' +
    '  l.miles,' +
    '  l.rate,' +
    '  l.broker_id,' +
    '  l.commodity,' +
    '  l.notes,' +
    '  b.name AS broker_name,' +
    '  b.flag AS broker_flag' +
    ' FROM loads l' +
    ' LEFT JOIN brokers b ON b.id = l.broker_id' +
    " WHERE l.status = 'Searching' AND l.driver_id IS NULL AND l.load_mode = 'dispatch'" +
    ' ORDER BY l.pickup_date ASC, l.created_at ASC'
  return db.prepare(sql).all() as AvailableLoad[]
}

/**
 * assignLoadToDriver -- atomic transaction to assign a Searching load to a driver.
 * Guards:
 *   - Load must exist and be in Searching status with no driver
 *   - Driver must exist and not be Inactive
 *   - Driver must not already have an active load (Booked/Picked Up/In Transit)
 * On success: sets load.driver_id, load.status='Booked', driver.status='On Load'
 */
export function assignLoadToDriver(
  db:       Database.Database,
  loadId:   number,
  driverId: number,
): AssignLoadResult {
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')

  const run = db.transaction((): AssignLoadResult => {
    const load = db.prepare('SELECT * FROM loads WHERE id = ?').get(loadId) as any
    if (!load) return { ok: false, error: 'Load not found.' }
    if (load.driver_id !== null) return { ok: false, error: 'Load is already assigned to a driver.' }
    if (load.status !== 'Searching') return { ok: false, error: `Load status is '${load.status}' — only Searching loads can be assigned.` }
    if (load.load_mode !== 'dispatch') return { ok: false, error: 'Only dispatch-mode loads can be assigned from the board.' }

    const driver = db.prepare('SELECT * FROM drivers WHERE id = ?').get(driverId) as any
    if (!driver) return { ok: false, error: 'Driver not found.' }
    if (driver.status === 'Inactive') return { ok: false, error: 'Driver is inactive and cannot be assigned a load.' }

    const activeLoad = db.prepare(
      "SELECT id FROM loads WHERE driver_id = ? AND status IN ('Booked','Picked Up','In Transit') LIMIT 1"
    ).get(driverId) as any
    if (activeLoad) return { ok: false, error: 'Driver already has an active load.' }

    db.prepare(
      "UPDATE loads SET driver_id = ?, status = 'Booked', updated_at = ? WHERE id = ?"
    ).run(driverId, now, loadId)

    db.prepare(
      "UPDATE drivers SET status = 'On Load', current_location = NULL, updated_at = ? WHERE id = ?"
    ).run(now, driverId)

    return { ok: true }
  })

  try {
    return run()
  } catch (e) {
    return { ok: false, error: String(e) }
  }
}
