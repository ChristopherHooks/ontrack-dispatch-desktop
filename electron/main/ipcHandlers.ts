import { IpcMain } from 'electron'
import Store from 'electron-store'
import { getDb } from './db'

// Registers all IPC handlers for database operations.
// Renderer communicates via window.api.* (defined in preload).
export function registerDbHandlers(ipcMain: IpcMain, store: Store): void {

  // ── Settings ─────────────────────────────────────────────────────────────
  ipcMain.handle('settings:get', (_e, key: string) => store.get(key))
  ipcMain.handle('settings:set', (_e, key: string, value: unknown) => {
    store.set(key, value)
  })
  ipcMain.handle('settings:getAll', () => store.store)

  // ── Generic CRUD helpers ─────────────────────────────────────────────────
  // Each module (leads, drivers, etc.) will add specific handlers in Phase 2.
  // For now we expose a safe query-runner for read-only operations.
  ipcMain.handle('db:query', (_e, sql: string, params: unknown[] = []) => {
    try {
      const db = getDb()
      return { data: db.prepare(sql).all(...params), error: null }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      return { data: null, error: msg }
    }
  })

  // ── Dashboard stats ───────────────────────────────────────────────────────
  ipcMain.handle('dashboard:stats', () => {
    const db = getDb()
    return {
      driversNeedingLoads: db.prepare(
        "SELECT COUNT(*) as c FROM drivers WHERE status='Active' " +
        "AND id NOT IN (SELECT driver_id FROM loads WHERE status IN ('Searching','Booked','Picked Up','In Transit'))"
      ).get(),
      loadsInTransit: db.prepare("SELECT COUNT(*) as c FROM loads WHERE status='In Transit'").get(),
      leadsFollowUp: db.prepare("SELECT COUNT(*) as c FROM leads WHERE follow_up_date <= date('now') AND status NOT IN ('Signed','Rejected')").get(),
      outstandingInvoices: db.prepare("SELECT COUNT(*) as c FROM invoices WHERE status IN ('Sent','Overdue')").get(),
      todayTasks: db.prepare(
        "SELECT * FROM tasks WHERE (due_date='Daily' OR due_date=date('now')) " +
        "ORDER BY CASE " +
        "  WHEN time_of_day IS NULL THEN 9999 " +
        "  WHEN time_of_day LIKE '%PM' " +
        "    AND CAST(substr(time_of_day, 1, instr(time_of_day, ':') - 1) AS INTEGER) != 12 " +
        "    THEN (CAST(substr(time_of_day, 1, instr(time_of_day, ':') - 1) AS INTEGER) + 12) * 60 " +
        "         + CAST(substr(time_of_day, instr(time_of_day, ':') + 1, 2) AS INTEGER) " +
        "  WHEN time_of_day LIKE '%AM' " +
        "    AND CAST(substr(time_of_day, 1, instr(time_of_day, ':') - 1) AS INTEGER) = 12 " +
        "    THEN CAST(substr(time_of_day, instr(time_of_day, ':') + 1, 2) AS INTEGER) " +
        "  ELSE CAST(substr(time_of_day, 1, instr(time_of_day, ':') - 1) AS INTEGER) * 60 " +
        "       + CAST(substr(time_of_day, instr(time_of_day, ':') + 1, 2) AS INTEGER) " +
        "END"
      ).all(),
    }
  })
}
