import Database from 'better-sqlite3'
import type { AvailableLoad, LoadRecommendation, ScannerRecommendation } from '../../../src/types/models'

// TODO: Replace with a real geolocation API (e.g. PC Miler, Google Maps Distance Matrix, HERE Maps)
// Placeholder distance rules:
//   same city + same state  ->  10 miles
//   same state only         ->  75 miles
//   cross-state             -> 250 miles
function estimateDeadheadMiles(
  fromCity:  string | null,
  fromState: string | null,
  toCity:    string | null,
  toState:   string | null,
): number {
  if (!fromState || !toState) return 250
  const fc = (fromCity  ?? '').trim().toLowerCase()
  const fs =  fromState.trim().toLowerCase()
  const tc = (toCity    ?? '').trim().toLowerCase()
  const ts =  toState.trim().toLowerCase()
  if (fc === tc && fs === ts) return 10
  if (fs === ts) return 75
  return 250
}

// Scoring weights -- TODO: expose via settings for dispatcher tuning
const RPM_WEIGHT       = 2.0
const DEADHEAD_PENALTY = 0.005

// score = RPM_WEIGHT * rpm - DEADHEAD_PENALTY * deadheadMiles
function computeScore(rpm: number | null, deadheadMiles: number): number {
  if (rpm == null || rpm <= 0) return -(DEADHEAD_PENALTY * deadheadMiles)
  return RPM_WEIGHT * rpm - DEADHEAD_PENALTY * deadheadMiles
}

// Parses 'City, ST' home_base string into [city, state]
function parseHomeBase(homeBase: string | null): [string | null, string | null] {
  if (!homeBase) return [null, null]
  const parts = homeBase.split(',')
  if (parts.length < 2) return [null, null]
  return [parts[0].trim(), parts[1].trim()]
}

const AVAILABLE_LOADS_SQL =
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
  " WHERE l.status = 'Searching' AND l.driver_id IS NULL" +
  ' ORDER BY l.pickup_date ASC, l.created_at ASC'

// Fetches active drivers needing a load, along with their best known current location:
//   last_dest_city/state: destination of most recently Delivered load (best position proxy)
//   home_base: permanent home location (fallback when no delivery history)
const DRIVERS_BASE_SQL =
  'SELECT' +
  '  d.id               AS driver_id,' +
  '  d.name             AS driver_name,' +
  '  d.home_base,' +
  '  d.current_location,' +
  '  d.min_rpm,' +
  '  ld.dest_city  AS last_dest_city,' +
  '  ld.dest_state AS last_dest_state' +
  ' FROM drivers d' +
  ' LEFT JOIN loads ld ON ld.id = (' +
  '   SELECT id FROM loads' +
  '   WHERE driver_id = d.id' +
  "   AND status = 'Delivered'" +
  '   ORDER BY delivery_date DESC, updated_at DESC LIMIT 1' +
  ' )' +
  " WHERE d.status = 'Active'" +
  ' AND NOT EXISTS (' +
  '   SELECT 1 FROM loads l' +
  '   WHERE l.driver_id = d.id' +
  "   AND l.status IN ('Booked','Picked Up','In Transit')" +
  ' )'

type DriverRow = {
  driver_id:        number
  driver_name:      string
  home_base:        string | null
  current_location: string | null
  min_rpm:          number | null
  last_dest_city:   string | null
  last_dest_state:  string | null
}

/**
 * getRecommendations -- scores all available (Searching) loads for each driver
 * needing a load (Active + no current Booked/Picked Up/In Transit load).
 *
 * Current location priority:
 *   1. Last delivered load's destination city/state (most accurate proxy)
 *   2. Driver home_base parsed as 'City, ST' (fallback if no delivery history)
 *
 * Returns up to 5 recommendations per driver, ranked by score descending.
 * If driverId is provided, returns recommendations for that driver only.
 */
export function getRecommendations(
  db: Database.Database,
  driverId?: number,
): ScannerRecommendation[] {
  const availableLoads = db.prepare(AVAILABLE_LOADS_SQL).all() as AvailableLoad[]

  const driverSql = driverId != null
    ? DRIVERS_BASE_SQL + ' AND d.id = ? ORDER BY d.name ASC'
    : DRIVERS_BASE_SQL + ' ORDER BY d.name ASC'

  const drivers = (driverId != null
    ? db.prepare(driverSql).all(driverId)
    : db.prepare(driverSql).all()) as DriverRow[]

  const results: ScannerRecommendation[] = []

  for (const driver of drivers) {
    // Location priority: current_location > last delivery dest > home_base
    const [homeCity,    homeState   ] = parseHomeBase(driver.home_base)
    const [curCity,     curState    ] = parseHomeBase(driver.current_location)
    const fromCity  = curCity  ?? driver.last_dest_city  ?? homeCity
    const fromState = curState ?? driver.last_dest_state ?? homeState

    const scored: LoadRecommendation[] = availableLoads.map(load => {
      const deadheadMiles = estimateDeadheadMiles(fromCity, fromState, load.origin_city, load.origin_state)
      const loadedMiles   = load.miles ?? 0
      const rpm           = load.rate != null && loadedMiles > 0 ? load.rate / loadedMiles : null
      const score         = computeScore(rpm, deadheadMiles)
      return {
        load_id_pk:     load.load_id_pk,
        load_ref:       load.load_ref,
        origin_city:    load.origin_city,
        origin_state:   load.origin_state,
        dest_city:      load.dest_city,
        dest_state:     load.dest_state,
        rate:           load.rate,
        miles:          load.miles,
        rpm,
        deadhead_miles: deadheadMiles,
        gross_rate:     load.rate,
        score,
        broker_name:    load.broker_name,
        broker_flag:    load.broker_flag,
        pickup_date:    load.pickup_date,
      } satisfies LoadRecommendation
    })

    scored.sort((a, b) => b.score - a.score)

    results.push({
      driver_id:       driver.driver_id,
      driver_name:     driver.driver_name,
      home_base:       driver.home_base,
      recommendations: scored.slice(0, 5),
    })
  }

  return results
}
