import { IpcMain } from 'electron'
import Store from 'electron-store'
import { getDb, getDataDir } from './db'
import {
  listLeads, getLead, createLead, updateLead, deleteLead,
  listDrivers, getDriver, createDriver, updateDriver, deleteDriver,
  listDriverDocuments, getDriverDocument, createDriverDocument, updateDriverDocument, deleteDriverDocument,
  listLoads, getLoad, createLoad, updateLoad, deleteLoad,
  listBrokers, getBroker, createBroker, updateBroker, deleteBroker,
  listInvoices, getInvoice, createInvoice, updateInvoice,
  listTasks, getTask, createTask, updateTask, deleteTask,
  markTaskComplete, markTaskIncomplete, getTaskCompletions, getCompletionsForDate,
  listNotes, createNote, deleteNote,
  listUsers, getUser, getUserByEmail, createUser, updateUser,
  listAuditLog,
} from './repositories'
import { createBackup, listBackups, stageRestore } from './backup'

export function registerDbHandlers(ipcMain: IpcMain, store: Store<any>): void {

  // -- Settings --
  ipcMain.handle('settings:get',    (_e, key: string) => store.get(key))
  ipcMain.handle('settings:set',    (_e, key: string, value: unknown) => { store.set(key, value) })
  ipcMain.handle('settings:getAll', () => store.store)

  // -- Dashboard --
  ipcMain.handle('dashboard:stats', () => {
    const db = getDb()
    const driversNeedingLoads = db.prepare(
      "SELECT COUNT(*) AS c FROM drivers d"
      + " WHERE d.status = 'Active'"
      + " AND NOT EXISTS ("
      + "   SELECT 1 FROM loads l"
      + "   WHERE l.driver_id = d.id"
      + "   AND l.status IN ('Booked', 'Picked Up', 'In Transit')"
      + ")"
    ).get()
    const loadsInTransit = db.prepare(
      "SELECT COUNT(*) AS c FROM loads WHERE status = 'In Transit'"
    ).get()
    const leadsFollowUp = db.prepare(
      "SELECT COUNT(*) AS c FROM leads WHERE follow_up_date <= date('now') AND status NOT IN ('Signed','Rejected')"
    ).get()
    const outstandingInvoices = db.prepare(
      "SELECT COUNT(*) AS c FROM invoices WHERE status IN ('Draft','Sent','Overdue')"
    ).get()
    const todayTasksRaw = db.prepare(
      "SELECT * FROM tasks WHERE due_date = date('now') OR due_date = 'Daily'"
    ).all() as any[]
    const tMin = (s: string | null): number => {
      if (!s) return 9999
      const m = s.match(/^(\d+):(\d+)\s*(AM|PM)$/i)
      if (!m) return 9999
      let h = parseInt(m[1])
      const pm = m[3].toUpperCase() === 'PM'
      if (pm && h !== 12) h += 12
      else if (!pm && h === 12) h = 0
      return h * 60 + parseInt(m[2])
    }
    const todayTasks = todayTasksRaw.sort((a, b) => tMin(a.time_of_day) - tMin(b.time_of_day))
    return { driversNeedingLoads, loadsInTransit, leadsFollowUp, outstandingInvoices, todayTasks }
  })

  ipcMain.handle('db:query', (_e, sql: string, params?: unknown[]) => {
    try {
      const data = getDb().prepare(sql).all(...(params ?? []))
      return { data, error: null }
    } catch (err) {
      return { data: null, error: String(err) }
    }
  })
  // -- Leads --
  ipcMain.handle('leads:list',   (_e, status?: string) => listLeads(getDb(), status))
  ipcMain.handle('leads:get',    (_e, id: number) => getLead(getDb(), id))
  ipcMain.handle('leads:create', (_e, dto: unknown) => createLead(getDb(), dto as any))
  ipcMain.handle('leads:update', (_e, id: number, dto: unknown) => updateLead(getDb(), id, dto as any))
  ipcMain.handle('leads:delete', (_e, id: number) => deleteLead(getDb(), id))

  // -- Drivers --
  ipcMain.handle('drivers:list',   (_e, status?: string) => listDrivers(getDb(), status))
  ipcMain.handle('drivers:get',    (_e, id: number) => getDriver(getDb(), id))
  ipcMain.handle('drivers:create', (_e, dto: unknown) => createDriver(getDb(), dto as any))
  ipcMain.handle('drivers:update', (_e, id: number, dto: unknown) => updateDriver(getDb(), id, dto as any))
  ipcMain.handle('drivers:delete', (_e, id: number) => deleteDriver(getDb(), id))

  // -- Driver Documents --
  ipcMain.handle('driverDocs:list',   (_e, driverId: number) => listDriverDocuments(getDb(), driverId))
  ipcMain.handle('driverDocs:get',    (_e, id: number) => getDriverDocument(getDb(), id))
  ipcMain.handle('driverDocs:create', (_e, dto: unknown) => createDriverDocument(getDb(), dto as any))
  ipcMain.handle('driverDocs:update', (_e, id: number, dto: unknown) => updateDriverDocument(getDb(), id, dto as any))
  ipcMain.handle('driverDocs:delete', (_e, id: number) => deleteDriverDocument(getDb(), id))

  // -- Loads --
  ipcMain.handle('loads:list',   (_e, status?: string) => listLoads(getDb(), status))
  ipcMain.handle('loads:get',    (_e, id: number) => getLoad(getDb(), id))
  ipcMain.handle('loads:create', (_e, dto: unknown) => createLoad(getDb(), dto as any))
  ipcMain.handle('loads:update', (_e, id: number, dto: unknown) => updateLoad(getDb(), id, dto as any))
  ipcMain.handle('loads:delete', (_e, id: number) => deleteLoad(getDb(), id))

  // -- Brokers --
  ipcMain.handle('brokers:list',   () => listBrokers(getDb()))
  ipcMain.handle('brokers:get',    (_e, id: number) => getBroker(getDb(), id))
  ipcMain.handle('brokers:create', (_e, dto: unknown) => createBroker(getDb(), dto as any))
  ipcMain.handle('brokers:update', (_e, id: number, dto: unknown) => updateBroker(getDb(), id, dto as any))
  ipcMain.handle('brokers:delete', (_e, id: number) => deleteBroker(getDb(), id))

  // -- Invoices --
  ipcMain.handle('invoices:list',   (_e, status?: string) => listInvoices(getDb(), status))
  ipcMain.handle('invoices:get',    (_e, id: number) => getInvoice(getDb(), id))
  ipcMain.handle('invoices:create', (_e, dto: unknown) => createInvoice(getDb(), dto as any))
  ipcMain.handle('invoices:update', (_e, id: number, dto: unknown) => updateInvoice(getDb(), id, dto as any))

  // -- Tasks --
  ipcMain.handle('tasks:list',              (_e, category?: string, dueDate?: string) => listTasks(getDb(), category, dueDate))
  ipcMain.handle('tasks:get',              (_e, id: number) => getTask(getDb(), id))
  ipcMain.handle('tasks:create',           (_e, dto: unknown) => createTask(getDb(), dto as any))
  ipcMain.handle('tasks:update',           (_e, id: number, dto: unknown) => updateTask(getDb(), id, dto as any))
  ipcMain.handle('tasks:delete',           (_e, id: number) => deleteTask(getDb(), id))
  ipcMain.handle('tasks:markComplete',     (_e, taskId: number, date: string, userId?: number) => markTaskComplete(getDb(), taskId, date, userId))
  ipcMain.handle('tasks:markIncomplete',   (_e, taskId: number, date: string) => markTaskIncomplete(getDb(), taskId, date))
  ipcMain.handle('tasks:completions',      (_e, taskId: number) => getTaskCompletions(getDb(), taskId))
  ipcMain.handle('tasks:completionsForDate', (_e, date: string) => getCompletionsForDate(getDb(), date))

  // -- Notes --
  ipcMain.handle('notes:list',   (_e, entityType: string, entityId: number) => listNotes(getDb(), entityType, entityId))
  ipcMain.handle('notes:create', (_e, dto: unknown) => createNote(getDb(), dto as any))
  ipcMain.handle('notes:delete', (_e, id: number) => deleteNote(getDb(), id))

  // -- Users --
  ipcMain.handle('users:list',       () => listUsers(getDb()))
  ipcMain.handle('users:get',        (_e, id: number) => getUser(getDb(), id))
  ipcMain.handle('users:getByEmail', (_e, email: string) => getUserByEmail(getDb(), email))
  ipcMain.handle('users:create',     (_e, dto: unknown) => createUser(getDb(), dto as any))
  ipcMain.handle('users:update',     (_e, id: number, dto: unknown) => updateUser(getDb(), id, dto as any))

  // -- Audit Log --
  ipcMain.handle('audit:list', (_e, entityType?: string, entityId?: number) => listAuditLog(getDb(), entityType, entityId))

  // -- Backups --
  ipcMain.handle('backups:list',         () => listBackups(getDataDir()))
  ipcMain.handle('backups:create',       () => createBackup(getDb(), getDataDir(), 'manual'))
  ipcMain.handle('backups:stageRestore', (_e, filePath: string) => stageRestore(filePath, store))
  ipcMain.handle('backups:pending',      () => { const v = store.get('pendingRestore'); return v ? v : null })
}
