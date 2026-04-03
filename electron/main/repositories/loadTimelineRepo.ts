import Database from 'better-sqlite3'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TimelineEvent {
  id:           number
  load_id:      number
  event_type:   string        // 'status' | 'check_call' | 'note'
  label:        string
  scheduled_at: string | null // ISO datetime YYYY-MM-DDTHH:MM
  completed_at: string | null
  notes:        string | null
  created_at:   string
}

export interface ActiveLoadRow {
  id:               number
  load_id:          string | null  // broker reference number (may be null)
  driver_id:        number | null
  driver_name:      string | null
  driver_phone:     string | null
  broker_id:        number | null
  broker_name:      string | null
  origin_city:      string | null
  origin_state:     string | null
  dest_city:        string | null
  dest_state:       string | null
  pickup_date:      string | null
  delivery_date:    string | null
  status:           string
  rate:             number | null
  miles:            number | null
  next_event_label: string | null
  next_event_at:    string | null
}

export interface CheckCallRow {
  event_id:     number
  load_id_pk:   number
  load_ref:     string | null
  driver_name:  string | null
  label:        string
  scheduled_at: string | null
}

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------

export function listTimelineEvents(db: Database.Database, loadId: number): TimelineEvent[] {
  return db.prepare(
    'SELECT * FROM load_timeline_events WHERE load_id = ? ' +
    'ORDER BY COALESCE(scheduled_at, created_at) ASC, id ASC'
  ).all(loadId) as TimelineEvent[]
}

export function addTimelineEvent(
  db: Database.Database,
  loadId: number,
  eventType: string,
  label: string,
  scheduledAt: string | null,
  notes: string | null,
): TimelineEvent {
  const r = db.prepare(
    'INSERT INTO load_timeline_events (load_id, event_type, label, scheduled_at, notes) VALUES (?, ?, ?, ?, ?)'
  ).run(loadId, eventType, label, scheduledAt, notes)
  return db.prepare('SELECT * FROM load_timeline_events WHERE id = ?').get(r.lastInsertRowid as number) as TimelineEvent
}

export function completeTimelineEvent(db: Database.Database, id: number, notes?: string): TimelineEvent | undefined {
  const now = new Date().toISOString().slice(0, 16)
  if (notes !== undefined && notes !== null) {
    db.prepare('UPDATE load_timeline_events SET completed_at = ?, notes = ? WHERE id = ?').run(now, notes, id)
  } else {
    db.prepare('UPDATE load_timeline_events SET completed_at = ? WHERE id = ?').run(now, id)
  }
  return db.prepare('SELECT * FROM load_timeline_events WHERE id = ?').get(id) as TimelineEvent | undefined
}

export function deleteTimelineEvent(db: Database.Database, id: number): boolean {
  return db.prepare('DELETE FROM load_timeline_events WHERE id = ?').run(id).changes > 0
}

// ---------------------------------------------------------------------------
// Scheduling helpers
// ---------------------------------------------------------------------------

function nowPlusMinutes(minutes: number): string {
  return new Date(Date.now() + minutes * 60000).toISOString().slice(0, 16)
}

function dateAtHour(dateStr: string | null, hour: number): string {
  if (dateStr) {
    return dateStr.slice(0, 10) + 'T' + String(hour).padStart(2, '0') + ':00'
  }
  return nowPlusMinutes(hour * 60)
}

function midpointDateTime(d1: string | null, d2: string | null): string {
  if (d1 && d2) {
    const t1 = new Date(d1).getTime()
    const t2 = new Date(d2).getTime()
    return new Date((t1 + t2) / 2).toISOString().slice(0, 16)
  }
  return nowPlusMinutes(12 * 60)
}

// ---------------------------------------------------------------------------
// Auto-scheduling
// ---------------------------------------------------------------------------

/**
 * Schedule default timeline events based on a load status transition.
 * Safe to call multiple times — never inserts a label that already exists for this load.
 */
export function scheduleDefaultEvents(
  db: Database.Database,
  loadId: number,
  newStatus: string,
  pickupDate: string | null,
  deliveryDate: string | null,
): void {
  const existingLabels = new Set(
    (db.prepare('SELECT label FROM load_timeline_events WHERE load_id = ?').all(loadId) as Array<{ label: string }>)
      .map(r => r.label)
  )

  const add = (label: string, type: string, at: string | null) => {
    if (!existingLabels.has(label)) {
      addTimelineEvent(db, loadId, type, label, at, null)
      existingLabels.add(label)
    }
  }

  if (newStatus === 'Booked') {
    add('Load Booked',       'status',     nowPlusMinutes(0))
    add('Driver Dispatched', 'check_call', nowPlusMinutes(60))
    add('Pickup Check Call', 'check_call', dateAtHour(pickupDate, 8))
  }

  if (newStatus === 'Picked Up') {
    add('Picked Up',            'status',     nowPlusMinutes(0))
    add('Mid-Route Check Call', 'check_call', midpointDateTime(pickupDate, deliveryDate))
    add('Delivery ETA Confirm', 'check_call', dateAtHour(deliveryDate, 10))
  }

  if (newStatus === 'In Transit') {
    add('In Transit',           'status',     nowPlusMinutes(0))
    add('Delivery ETA Confirm', 'check_call', dateAtHour(deliveryDate, 10))
  }

  if (newStatus === 'Delivered') {
    add('Delivered',   'status',     nowPlusMinutes(0))
    add('POD Request', 'check_call', nowPlusMinutes(30))
  }

  if (newStatus === 'Completed') {
    add('Load Completed', 'status', nowPlusMinutes(0))
  }
}

/**
 * Apply a status change: update the load record, add a status timeline event,
 * and auto-schedule the next set of check call events.
 */
export function applyStatusChange(
  db: Database.Database,
  loadId: number,
  newStatus: string,
  notes: string | null,
): void {
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
  db.prepare('UPDATE loads SET status = ?, updated_at = ? WHERE id = ?').run(newStatus, now, loadId)
  const row = db.prepare('SELECT pickup_date, delivery_date FROM loads WHERE id = ?').get(loadId) as
    | { pickup_date: string | null; delivery_date: string | null }
    | undefined
  addTimelineEvent(db, loadId, 'status', newStatus, new Date().toISOString().slice(0, 16), notes)
  scheduleDefaultEvents(db, loadId, newStatus, row?.pickup_date ?? null, row?.delivery_date ?? null)
}

/**
 * Initialize the timeline for a newly booked load.
 * Only runs if no events exist yet for this load (idempotent).
 */
export function initLoadTimeline(db: Database.Database, loadId: number): void {
  const count = (db.prepare(
    'SELECT COUNT(*) AS c FROM load_timeline_events WHERE load_id = ?'
  ).get(loadId) as { c: number }).c
  if (count > 0) return
  const row = db.prepare('SELECT pickup_date, delivery_date FROM loads WHERE id = ?').get(loadId) as
    | { pickup_date: string | null; delivery_date: string | null }
    | undefined
  scheduleDefaultEvents(db, loadId, 'Booked', row?.pickup_date ?? null, row?.delivery_date ?? null)
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/**
 * All active loads (Booked | Picked Up | In Transit) with driver and broker info
 * plus the next uncompleted timeline event label and time.
 */
export function getActiveLoads(db: Database.Database): ActiveLoadRow[] {
  return db.prepare(`
    SELECT
      l.id,
      l.load_id,
      l.driver_id,
      d.name   AS driver_name,
      d.phone  AS driver_phone,
      l.broker_id,
      b.name   AS broker_name,
      l.origin_city,
      l.origin_state,
      l.dest_city,
      l.dest_state,
      l.pickup_date,
      l.delivery_date,
      l.status,
      l.rate,
      l.miles,
      (SELECT label        FROM load_timeline_events
       WHERE load_id = l.id AND completed_at IS NULL
       ORDER BY COALESCE(scheduled_at, created_at) ASC LIMIT 1) AS next_event_label,
      (SELECT scheduled_at FROM load_timeline_events
       WHERE load_id = l.id AND completed_at IS NULL
       ORDER BY COALESCE(scheduled_at, created_at) ASC LIMIT 1) AS next_event_at
    FROM loads l
    LEFT JOIN drivers d ON d.id = l.driver_id
    LEFT JOIN brokers b ON b.id = l.broker_id
    WHERE l.status IN ('Booked', 'Picked Up', 'In Transit')
    ORDER BY l.pickup_date ASC NULLS LAST, l.id ASC
  `).all() as ActiveLoadRow[]
}

/**
 * Upcoming uncompleted check call events for the Operations panel.
 * Sorted ascending by scheduled time so the most urgent appears first.
 */
export function getUpcomingCheckCalls(db: Database.Database, n = 6): CheckCallRow[] {
  return db.prepare(`
    SELECT
      e.id       AS event_id,
      e.load_id  AS load_id_pk,
      l.load_id  AS load_ref,
      d.name     AS driver_name,
      e.label,
      e.scheduled_at
    FROM load_timeline_events e
    JOIN  loads   l ON l.id = e.load_id
    LEFT JOIN drivers d ON d.id = l.driver_id
    WHERE e.event_type = 'check_call'
      AND e.completed_at IS NULL
      AND l.status IN ('Booked', 'Picked Up', 'In Transit')
    ORDER BY COALESCE(e.scheduled_at, e.created_at) ASC
    LIMIT ?
  `).all(n) as CheckCallRow[]
}
