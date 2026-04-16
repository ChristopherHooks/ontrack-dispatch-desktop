import Database from 'better-sqlite3'
import type { Task } from '../../src/types/models'
import { getCompletionsForDate } from './repositories/tasksRepo'

// ---------------------------------------------------------------------------
// Operations Control Panel data service
// Aggregates data from multiple tables into a single payload for the
// Operations page. Designed for fast reads — no joins over large sets.
// ---------------------------------------------------------------------------

export interface OperationsData {
  // Briefing counts
  driversNeedingLoads:   number   // Active drivers with no current load
  loadsInTransit:        number   // Loads with status 'In Transit'
  overdueLeads:          number   // Leads with follow_up_date <= today, not Signed/Rejected
  todaysGroupCount:      number   // Marketing groups eligible to post in today
  outstandingInvoices:   number   // Draft, Sent, or Overdue invoices
  overdueInvoices:       number   // Overdue invoices only (past payment terms)
  revenueThisMonth:      number   // Sum of dispatch_fee from Paid invoices this calendar month
  uninvoicedDelivered:   number   // Delivered loads with no invoice yet

  // Loads stuck past their expected dates
  staleLoads: Array<{ id: number; load_id: string | null; status: string; driver_name: string | null; pickup_date: string | null; delivery_date: string | null; days_past: number }>

  // Expiring documents (within 45 days)
  expiringDocs: Array<{ driver_id: number; driver_name: string; doc_type: string; expiry_date: string; days_until: number }>

  // Revenue Opportunities
  warmLeads:        Array<{ id: number; name: string; company: string | null; status: string; priority: string; follow_up_date: string | null }>
  availableDrivers: Array<{ id: number; name: string; truck_type: string | null; home_base: string | null; current_location: string | null }>
  hotProspects:     Array<{ id: number; name: string; stage: string; priority: string; phone: string | null; follow_up_date: string | null }>

  // Daily Checklist (mirrors dashboard)
  todayTasks:    Task[]
  completedToday: number[]

  // 7-Day Sprint tracking — counts used by the launch sprint panel
  totalDrivers:         number   // All driver records regardless of status
  totalBrokers:         number   // All broker records
  totalLeads:           number   // Active (non-terminal) leads
  hasSentOrPaidInvoice: boolean  // True once the first invoice has been sent

  // Weekly scorecard — last 7 calendar days
  weeklyScorecard: {
    loadsCompleted:  number
    grossRevenue:    number
    dispatchRevenue: number
    avgRpm:          number | null
    bestLane:        string | null
    bestBroker:      string | null
    invoicesSent:    number
  }
}

function parseTimeOfDay(s: string | null | undefined): number {
  if (!s) return 9999
  const m = s.match(/^(\d+):(\d+)\s*(AM|PM)$/i)
  if (!m) return 9999
  let h = parseInt(m[1])
  const pm = m[3].toUpperCase() === 'PM'
  if (pm && h !== 12) h += 12
  else if (!pm && h === 12) h = 0
  return h * 60 + parseInt(m[2])
}

export function getOperationsData(db: Database.Database): OperationsData {

  const loadsInTransit = (db.prepare(
    "SELECT COUNT(*) AS c FROM loads WHERE status = 'In Transit'"
  ).get() as { c: number }).c

  const driversNeedingLoads = (db.prepare(
    "SELECT COUNT(*) AS c FROM drivers d" +
    " WHERE d.status = 'Active'" +
    " AND NOT EXISTS (" +
    "   SELECT 1 FROM loads l" +
    "   WHERE l.driver_id = d.id" +
    "   AND l.status IN ('Booked', 'Picked Up', 'In Transit') AND l.load_mode = 'dispatch'" +
    ")"
  ).get() as { c: number }).c

  const overdueLeads = (db.prepare(
    "SELECT COUNT(*) AS c FROM leads" +
    " WHERE follow_up_date <= date('now') AND status NOT IN ('Signed','Rejected')"
  ).get() as { c: number }).c

  const todaysGroupCount = (db.prepare(
    "SELECT COUNT(*) AS c FROM marketing_groups" +
    " WHERE active = 1 AND platform = 'Facebook'" +
    " AND (last_posted_at IS NULL OR last_posted_at < date('now'))" +
    " AND (snooze_until IS NULL OR snooze_until <= date('now'))"
  ).get() as { c: number }).c

  const outstandingInvoices = (db.prepare(
    "SELECT COUNT(*) AS c FROM invoices WHERE status IN ('Draft','Sent','Overdue')"
  ).get() as { c: number }).c

  const overdueInvoices = (db.prepare(
    "SELECT COUNT(*) AS c FROM invoices WHERE status = 'Overdue'"
  ).get() as { c: number }).c

  const revenueThisMonth = ((db.prepare(
    "SELECT COALESCE(SUM(dispatch_fee),0) AS total FROM invoices" +
    " WHERE status = 'Paid'" +
    " AND strftime('%Y-%m', paid_date) = strftime('%Y-%m', 'now')"
  ).get() as { total: number }).total)

  // Loads stuck past their expected dates — Booked past pickup, or In Transit/Picked Up past delivery
  type StaleRow = { id: number; load_id: string | null; status: string; driver_name: string | null; pickup_date: string | null; delivery_date: string | null; days_past: number }
  const staleLoads: StaleRow[] = (db.prepare(
    "SELECT l.id, l.load_id, l.status, d.name AS driver_name, l.pickup_date, l.delivery_date," +
    "  CAST(julianday('now') - julianday(COALESCE(l.pickup_date, l.delivery_date)) AS INTEGER) AS days_past" +
    " FROM loads l LEFT JOIN drivers d ON d.id = l.driver_id" +
    " WHERE (l.status = 'Booked' AND l.pickup_date IS NOT NULL AND l.pickup_date < date('now', '-1 days'))" +
    "    OR (l.status IN ('Picked Up','In Transit') AND l.delivery_date IS NOT NULL AND l.delivery_date < date('now'))" +
    " ORDER BY days_past DESC LIMIT 10"
  ).all() as StaleRow[])

  // Expiring documents: CDL & insurance from drivers table + individual docs, within 60 days
  type ExpiryRow = { driver_id: number; driver_name: string; doc_type: string; expiry_date: string; days_until: number }
  const expiringDocs: ExpiryRow[] = (db.prepare(
    "SELECT d.id AS driver_id, d.name AS driver_name, 'CDL' AS doc_type, d.cdl_expiry AS expiry_date," +
    "  CAST((julianday(d.cdl_expiry) - julianday('now')) AS INTEGER) AS days_until" +
    " FROM drivers d WHERE d.status = 'Active' AND d.cdl_expiry IS NOT NULL" +
    "  AND d.cdl_expiry <= date('now', '+60 days') AND d.cdl_expiry >= date('now')" +
    " UNION ALL" +
    " SELECT d.id, d.name, 'Insurance', d.insurance_expiry," +
    "  CAST((julianday(d.insurance_expiry) - julianday('now')) AS INTEGER)" +
    " FROM drivers d WHERE d.status = 'Active' AND d.insurance_expiry IS NOT NULL" +
    "  AND d.insurance_expiry <= date('now', '+60 days') AND d.insurance_expiry >= date('now')" +
    " UNION ALL" +
    " SELECT d.id, d.name, 'Medical Card', d.medical_card_expiry," +
    "  CAST((julianday(d.medical_card_expiry) - julianday('now')) AS INTEGER)" +
    " FROM drivers d WHERE d.status = 'Active' AND d.medical_card_expiry IS NOT NULL" +
    "  AND d.medical_card_expiry <= date('now', '+60 days') AND d.medical_card_expiry >= date('now')" +
    " UNION ALL" +
    " SELECT d.id, d.name, dd.doc_type, dd.expiry_date," +
    "  CAST((julianday(dd.expiry_date) - julianday('now')) AS INTEGER)" +
    " FROM driver_documents dd JOIN drivers d ON d.id = dd.driver_id" +
    " WHERE d.status = 'Active' AND dd.expiry_date IS NOT NULL" +
    "  AND dd.expiry_date <= date('now', '+60 days') AND dd.expiry_date >= date('now')" +
    " ORDER BY days_until ASC LIMIT 20"
  ).all() as ExpiryRow[])

  // Warm/hot leads: not closed, high/medium priority or follow-up within 3 days
  const warmLeads = db.prepare(
    "SELECT id, name, company, status, priority, follow_up_date FROM leads" +
    " WHERE status NOT IN ('Signed','Rejected','Inactive MC')" +
    " AND (priority IN ('High','Medium')" +
    "   OR (follow_up_date IS NOT NULL AND follow_up_date <= date('now', '+3 days')))" +
    " ORDER BY" +
    "   CASE WHEN follow_up_date <= date('now') THEN 0 ELSE 1 END ASC," +
    "   CASE priority WHEN 'High' THEN 0 WHEN 'Medium' THEN 1 ELSE 2 END ASC," +
    "   follow_up_date ASC" +
    " LIMIT 10"
  ).all() as Array<{ id: number; name: string; company: string | null; status: string; priority: string; follow_up_date: string | null }>

  // Active drivers with no current load assignment
  const availableDrivers = db.prepare(
    "SELECT d.id, d.name, d.truck_type, d.home_base, d.current_location FROM drivers d" +
    " WHERE d.status = 'Active'" +
    " AND NOT EXISTS (" +
    "   SELECT 1 FROM loads l" +
    "   WHERE l.driver_id = d.id" +
    "   AND l.status IN ('Booked', 'Picked Up', 'In Transit') AND l.load_mode = 'dispatch'" +
    ")" +
    " ORDER BY d.name ASC LIMIT 10"
  ).all() as Array<{ id: number; name: string; truck_type: string | null; home_base: string | null; current_location: string | null }>

  // Hot driver prospects: active stages, high/medium priority or overdue follow-up
  const hotProspects = db.prepare(
    "SELECT id, name, stage, priority, phone, follow_up_date FROM driver_prospects" +
    " WHERE stage NOT IN ('Handed Off')" +
    " AND (priority IN ('High','Medium')" +
    "   OR (follow_up_date IS NOT NULL AND follow_up_date <= date('now', '+3 days')))" +
    " ORDER BY" +
    "   CASE WHEN follow_up_date <= date('now') THEN 0 ELSE 1 END ASC," +
    "   CASE priority WHEN 'High' THEN 0 WHEN 'Medium' THEN 1 ELSE 2 END ASC," +
    "   follow_up_date ASC" +
    " LIMIT 8"
  ).all() as Array<{ id: number; name: string; stage: string; priority: string; phone: string | null; follow_up_date: string | null }>

  // 7-Day Sprint counts
  const totalDrivers = (db.prepare("SELECT COUNT(*) AS c FROM drivers").get() as { c: number }).c
  const totalBrokers = (db.prepare("SELECT COUNT(*) AS c FROM brokers").get() as { c: number }).c
  const totalLeads   = (db.prepare(
    "SELECT COUNT(*) AS c FROM leads WHERE status NOT IN ('Rejected','Converted','Signed','Inactive MC','Bad Fit','Not Interested')"
  ).get() as { c: number }).c
  const hasSentOrPaidInvoice = (db.prepare(
    "SELECT COUNT(*) AS c FROM invoices WHERE status IN ('Sent','Overdue','Paid')"
  ).get() as { c: number }).c > 0

  // Delivered loads with no invoice yet
  const uninvoicedDelivered = (db.prepare(
    "SELECT COUNT(*) AS c FROM loads l" +
    " WHERE l.status = 'Delivered'" +
    " AND NOT EXISTS (" +
    "   SELECT 1 FROM invoices i WHERE i.load_id = l.id" +
    ")"
  ).get() as { c: number }).c

  // Today's tasks (same logic as dashboard)
  const DOW = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
  const todayDow = DOW[new Date().getDay()]
  const todayTasksRaw = db.prepare(
    "SELECT * FROM tasks WHERE due_date = date('now') OR due_date = 'Daily' OR due_date = ?"
  ).all(todayDow) as Task[]
  const todayTasks = [...todayTasksRaw].sort(
    (a, b) => parseTimeOfDay(a.time_of_day) - parseTimeOfDay(b.time_of_day)
  )

  const todayIso = new Date().toISOString().split('T')[0]
  const completedToday = getCompletionsForDate(db, todayIso).map(c => c.task_id)

  // ── Weekly Scorecard — last 7 days ───────────────────────────────────────
  type ScoreRow = { loads_completed: number; gross_revenue: number; dispatch_revenue: number; avg_rpm: number | null }
  const scoreRow = db.prepare(
    "SELECT COUNT(*) AS loads_completed," +
    "  COALESCE(SUM(l.rate), 0) AS gross_revenue," +
    "  COALESCE(SUM(i.dispatch_fee), 0) AS dispatch_revenue," +
    "  CASE WHEN SUM(CASE WHEN l.miles > 0 THEN l.miles ELSE 0 END) > 0" +
    "    THEN ROUND(SUM(CASE WHEN l.miles > 0 THEN l.rate ELSE 0 END) * 1.0 /" +
    "         SUM(CASE WHEN l.miles > 0 THEN l.miles ELSE 0 END), 2)" +
    "    ELSE NULL END AS avg_rpm" +
    " FROM loads l" +
    " LEFT JOIN invoices i ON i.load_id = l.id" +
    " WHERE l.status IN ('Delivered','Invoiced','Paid')" +
    " AND l.delivery_date >= date('now', '-7 days')"
  ).get() as ScoreRow

  type LaneRow = { lane: string; count: number }
  const bestLaneRow = db.prepare(
    "SELECT (origin_state || ' → ' || dest_state) AS lane, COUNT(*) AS count" +
    " FROM loads WHERE status IN ('Delivered','Invoiced','Paid')" +
    " AND delivery_date >= date('now', '-7 days')" +
    " AND origin_state IS NOT NULL AND dest_state IS NOT NULL" +
    " GROUP BY lane ORDER BY count DESC LIMIT 1"
  ).get() as LaneRow | undefined

  type BrokerRow = { name: string; cnt: number }
  const bestBrokerRow = db.prepare(
    "SELECT b.name, COUNT(*) AS cnt FROM loads l" +
    " JOIN brokers b ON b.id = l.broker_id" +
    " WHERE l.status IN ('Delivered','Invoiced','Paid')" +
    " AND l.delivery_date >= date('now', '-7 days')" +
    " GROUP BY b.id ORDER BY cnt DESC LIMIT 1"
  ).get() as BrokerRow | undefined

  const invoicesSentThisWeek = (db.prepare(
    "SELECT COUNT(*) AS c FROM invoices WHERE sent_date >= date('now', '-7 days')"
  ).get() as { c: number }).c

  const weeklyScorecard = {
    loadsCompleted:  scoreRow.loads_completed,
    grossRevenue:    scoreRow.gross_revenue,
    dispatchRevenue: scoreRow.dispatch_revenue,
    avgRpm:          scoreRow.avg_rpm,
    bestLane:        bestLaneRow?.lane ?? null,
    bestBroker:      bestBrokerRow?.name ?? null,
    invoicesSent:    invoicesSentThisWeek,
  }

  return {
    driversNeedingLoads,
    loadsInTransit,
    overdueLeads,
    todaysGroupCount,
    outstandingInvoices,
    overdueInvoices,
    revenueThisMonth,
    uninvoicedDelivered,
    staleLoads,
    expiringDocs,
    warmLeads,
    availableDrivers,
    hotProspects,
    todayTasks,
    completedToday,
    totalDrivers,
    totalBrokers,
    totalLeads,
    hasSentOrPaidInvoice,
    weeklyScorecard,
  }
}
