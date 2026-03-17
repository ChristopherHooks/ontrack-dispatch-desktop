import Database from 'better-sqlite3'
import type { Task } from '../../src/types/models'
import { getCompletionsForDate } from './repositories/tasksRepo'

// ---------------------------------------------------------------------------
// Dashboard stats service
// Extracted from ipcHandlers so business logic lives in a testable service
// rather than inline in the IPC registration file.
// ---------------------------------------------------------------------------

export interface DashboardStats {
  driversNeedingLoads: { c: number }
  loadsInTransit:      { c: number }
  leadsFollowUp:       { c: number }
  outstandingInvoices: { c: number }
  todayTasks:          Task[]
  completedToday:      number[]   // task_ids completed today via task_completions
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

export function getDashboardStats(db: Database.Database): DashboardStats {
  const driversNeedingLoads = db.prepare(
    "SELECT COUNT(*) AS c FROM drivers d" +
    " WHERE d.status = 'Active'" +
    " AND NOT EXISTS (" +
    "   SELECT 1 FROM loads l" +
    "   WHERE l.driver_id = d.id" +
    "   AND l.status IN ('Booked', 'Picked Up', 'In Transit')" +
    ")"
  ).get() as { c: number }

  const loadsInTransit = db.prepare(
    "SELECT COUNT(*) AS c FROM loads WHERE status = 'In Transit'"
  ).get() as { c: number }

  const leadsFollowUp = db.prepare(
    "SELECT COUNT(*) AS c FROM leads" +
    " WHERE follow_up_date <= date('now') AND status NOT IN ('Signed','Rejected')"
  ).get() as { c: number }

  const outstandingInvoices = db.prepare(
    "SELECT COUNT(*) AS c FROM invoices WHERE status IN ('Draft','Sent','Overdue')"
  ).get() as { c: number }

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

  return { driversNeedingLoads, loadsInTransit, leadsFollowUp, outstandingInvoices, todayTasks, completedToday }
}
