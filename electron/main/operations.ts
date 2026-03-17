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
  fbConvNew:           number   // FB conversations in 'New' stage (awaiting first reply)
  fbConvActive:        number   // All active conversations (not Converted or Dead)
  driversNeedingLoads: number   // Active drivers with no current load
  loadsInTransit:      number   // Loads with status 'In Transit'
  overdueLeads:        number   // Leads with follow_up_date <= today, not Signed/Rejected
  todaysGroupCount:    number   // Marketing groups eligible to post in today
  outstandingInvoices: number   // Draft, Sent, or Overdue invoices

  // Revenue Opportunities
  warmLeads:        Array<{ id: number; name: string; company: string | null; status: string; priority: string; follow_up_date: string | null }>
  availableDrivers: Array<{ id: number; name: string; truck_type: string | null; home_base: string | null; current_location: string | null }>

  // Daily Checklist (mirrors dashboard)
  todayTasks:    Task[]
  completedToday: number[]
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

  const fbConvNew = (db.prepare(
    "SELECT COUNT(*) AS c FROM fb_conversations WHERE stage = 'New'"
  ).get() as { c: number }).c

  const fbConvActive = (db.prepare(
    "SELECT COUNT(*) AS c FROM fb_conversations WHERE stage NOT IN ('Converted', 'Dead')"
  ).get() as { c: number }).c

  const loadsInTransit = (db.prepare(
    "SELECT COUNT(*) AS c FROM loads WHERE status = 'In Transit'"
  ).get() as { c: number }).c

  const driversNeedingLoads = (db.prepare(
    "SELECT COUNT(*) AS c FROM drivers d" +
    " WHERE d.status = 'Active'" +
    " AND NOT EXISTS (" +
    "   SELECT 1 FROM loads l" +
    "   WHERE l.driver_id = d.id" +
    "   AND l.status IN ('Booked', 'Picked Up', 'In Transit')" +
    ")"
  ).get() as { c: number }).c

  const overdueLeads = (db.prepare(
    "SELECT COUNT(*) AS c FROM leads" +
    " WHERE follow_up_date <= date('now') AND status NOT IN ('Signed','Rejected')"
  ).get() as { c: number }).c

  const todaysGroupCount = (db.prepare(
    "SELECT COUNT(*) AS c FROM marketing_groups" +
    " WHERE active = 1 AND platform = 'Facebook'" +
    " AND (last_posted_at IS NULL OR last_posted_at < date('now'))"
  ).get() as { c: number }).c

  const outstandingInvoices = (db.prepare(
    "SELECT COUNT(*) AS c FROM invoices WHERE status IN ('Draft','Sent','Overdue')"
  ).get() as { c: number }).c

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
    "   AND l.status IN ('Booked', 'Picked Up', 'In Transit')" +
    ")" +
    " ORDER BY d.name ASC LIMIT 10"
  ).all() as Array<{ id: number; name: string; truck_type: string | null; home_base: string | null; current_location: string | null }>

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

  return {
    fbConvNew,
    fbConvActive,
    driversNeedingLoads,
    loadsInTransit,
    overdueLeads,
    todaysGroupCount,
    outstandingInvoices,
    warmLeads,
    availableDrivers,
    todayTasks,
    completedToday,
  }
}
