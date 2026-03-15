import { IpcMain, dialog, app } from 'electron'
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
  listDocuments, getDocument, createDocument, updateDocument, deleteDocument, searchDocuments,
} from './repositories'
import { createBackup, listBackups, stageRestore } from './backup'
import { getAnalyticsStats } from './analytics'
import { globalSearch } from './search'
import { importFmcsaLeads, writeImportMeta, readImportStatus } from './fmcsaImport'
import { importLeadsFromCsv, importLeadsFromText } from './csvLeadImport'
import { runSeedIfEmpty, resetAndReseed } from './seed'
import { getBoardRows, getAvailableLoads, assignLoadToDriver } from './dispatcherBoard'
import { getRecommendations } from './loadScanner'
import { getDashboardStats } from './dashboard'

export function registerDbHandlers(ipcMain: IpcMain, store: Store<any>): void {

  // -- Settings --
  ipcMain.handle('settings:get',    (_e, key: string) => store.get(key))
  ipcMain.handle('settings:set',    (_e, key: string, value: unknown) => { store.set(key, value) })
  ipcMain.handle('settings:getAll', () => store.store)

  // -- Dashboard --
  ipcMain.handle('dashboard:stats', () => getDashboardStats(getDb()))

  // -- Generic DB query (dev/debug only — disabled in packaged builds) --
  if (!app.isPackaged) {
    ipcMain.handle('db:query', (_e, sql: string, params?: unknown[]) => {
      try {
        const data = getDb().prepare(sql).all(...(params ?? []))
        return { data, error: null }
      } catch (err) {
        return { data: null, error: String(err) }
      }
    })
  }

  // -- Leads --
  ipcMain.handle('leads:list',         (_e, status?: string) => listLeads(getDb(), status))
  ipcMain.handle('leads:get',          (_e, id: number) => getLead(getDb(), id))
  ipcMain.handle('leads:create',       (_e, dto: unknown) => createLead(getDb(), dto as any))
  ipcMain.handle('leads:update',       (_e, id: number, dto: unknown) => updateLead(getDb(), id, dto as any))
  ipcMain.handle('leads:delete',       (_e, id: number) => deleteLead(getDb(), id))
  ipcMain.handle('leads:importFmcsa',  async () => {
    const webKey    = store.get('fmcsa_web_key') as string | undefined
    const termsRaw  = store.get('fmcsa_search_terms') as string | undefined
    const searchTerms = termsRaw
      ? termsRaw.split(',').map((t: string) => t.trim()).filter(Boolean)
      : undefined
    const result = await importFmcsaLeads(getDb(), webKey, searchTerms)
    writeImportMeta(getDb(), result, 'manual')
    store.set('last_fmcsa_import_at', new Date().toISOString())
    return result
  })
  ipcMain.handle('leads:importStatus', () => readImportStatus(getDb()))
  ipcMain.handle('leads:importCsv', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      title:       'Import Leads from CSV',
      buttonLabel: 'Import',
      filters:     [{ name: 'CSV Files', extensions: ['csv', 'txt'] }],
      properties:  ['openFile'],
    })
    if (canceled || filePaths.length === 0) return null
    return importLeadsFromCsv(getDb(), filePaths[0])
  })
  ipcMain.handle('leads:importPaste', (_e, text: string) => importLeadsFromText(getDb(), text))

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
  ipcMain.handle('tasks:list',            (_e, cat?: string, due?: string) => listTasks(getDb(), cat, due))
  ipcMain.handle('tasks:get',             (_e, id: number) => getTask(getDb(), id))
  ipcMain.handle('tasks:create',          (_e, dto: unknown) => createTask(getDb(), dto as any))
  ipcMain.handle('tasks:update',          (_e, id: number, dto: unknown) => updateTask(getDb(), id, dto as any))
  ipcMain.handle('tasks:delete',          (_e, id: number) => deleteTask(getDb(), id))
  ipcMain.handle('tasks:markComplete',    (_e, taskId: number, date: string, uid?: number) => markTaskComplete(getDb(), taskId, date, uid))
  ipcMain.handle('tasks:markIncomplete',  (_e, taskId: number, date: string) => markTaskIncomplete(getDb(), taskId, date))
  ipcMain.handle('tasks:completions',     (_e, taskId: number) => getTaskCompletions(getDb(), taskId))
  ipcMain.handle('tasks:completionsForDate', (_e, date: string) => getCompletionsForDate(getDb(), date))

  // -- Notes --
  ipcMain.handle('notes:list',   (_e, et: string, eid: number) => listNotes(getDb(), et, eid))
  ipcMain.handle('notes:create', (_e, dto: unknown) => createNote(getDb(), dto as any))
  ipcMain.handle('notes:delete', (_e, id: number) => deleteNote(getDb(), id))

  // -- Users --
  ipcMain.handle('users:list',       () => listUsers(getDb()))
  ipcMain.handle('users:get',        (_e, id: number) => getUser(getDb(), id))
  ipcMain.handle('users:getByEmail', (_e, email: string) => getUserByEmail(getDb(), email))
  ipcMain.handle('users:create',     (_e, dto: unknown) => createUser(getDb(), dto as any))
  ipcMain.handle('users:update',     (_e, id: number, dto: unknown) => updateUser(getDb(), id, dto as any))

  // -- Audit Log --
  ipcMain.handle('audit:list', (_e, et?: string, eid?: number) => listAuditLog(getDb(), et, eid))

  // -- Backups --
  ipcMain.handle('backups:list',         () => listBackups(getDataDir()))
  ipcMain.handle('backups:create',       () => createBackup(getDb(), getDataDir(), 'manual'))
  ipcMain.handle('backups:stageRestore', (_e, fp: string) => stageRestore(fp, store))
  ipcMain.handle('backups:pending',      () => { const v = store.get('pendingRestore'); return v ? v : null })

  // -- Documents --
  ipcMain.handle('documents:list',   (_e, cat?: string) => listDocuments(getDb(), cat))
  ipcMain.handle('documents:get',    (_e, id: number) => getDocument(getDb(), id))
  ipcMain.handle('documents:create', (_e, dto: unknown) => createDocument(getDb(), dto as any))
  ipcMain.handle('documents:update', (_e, id: number, dto: unknown) => updateDocument(getDb(), id, dto as any))
  ipcMain.handle('documents:delete', (_e, id: number) => deleteDocument(getDb(), id))
  ipcMain.handle('documents:search', (_e, q: string) => searchDocuments(getDb(), q))

  // -- Analytics --
  ipcMain.handle('analytics:stats', () => getAnalyticsStats(getDb()))

  // -- Global Search --
  ipcMain.handle('search:global', (_e, q: string) => globalSearch(getDb(), q))

  // -- Dispatcher Board --
  ipcMain.handle('dispatcher:board',         () => getBoardRows(getDb()))
  ipcMain.handle('dispatch:availableLoads',   () => getAvailableLoads(getDb()))
  ipcMain.handle('dispatch:assignLoad', (_e, payload: { loadId: number; driverId: number }) =>
    assignLoadToDriver(getDb(), payload.loadId, payload.driverId))

  // -- Load Opportunity Scanner --
  ipcMain.handle('scanner:recommendLoads', (_e, payload: { driverId?: number }) =>
    getRecommendations(getDb(), payload?.driverId))

  // -- Dev Seed (non-packaged builds only) --
  ipcMain.handle('dev:seed',      () => { runSeedIfEmpty(getDb()); return { ok: true } })
  ipcMain.handle('dev:reseed',    () => { resetAndReseed(getDb());  return { ok: true } })
}
