import Database from 'better-sqlite3'
import type { BoardRow } from '../../../src/types/models'

/**
 * getBoardRows — single join query for the Dispatcher Board.
 * Returns one row per driver with their most-active current load
 * (Booked > Picked Up > In Transit priority) and attached broker.
 * Rows with no active load have null load_* and broker_* fields.
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
    '  b.flag          AS broker_flag' +
    ' FROM drivers d' +
    ' LEFT JOIN loads l ON l.id = (' +
    '   SELECT id FROM loads WHERE driver_id = d.id' +
    "   AND status IN ('Booked', 'Picked Up', 'In Transit')" +
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
