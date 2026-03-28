import { IpcMain, dialog, app, shell } from 'electron'
import { join, basename, extname } from 'path'
import { readFileSync, mkdirSync, copyFileSync, existsSync } from 'fs'
import Store from 'electron-store'
import { getDb, getDataDir } from './db'
import {
  listLeads, getLead, createLead, updateLead, deleteLead,
  listDrivers, getDriver, createDriver, updateDriver, deleteDriver, getDriverCompliance,
  listDriverDocuments, getDriverDocument, createDriverDocument, updateDriverDocument, deleteDriverDocument,
  listLoads, getLoad, createLoad, updateLoad, deleteLoad,
  listBrokers, getBroker, createBroker, updateBroker, deleteBroker,
  listInvoices, getInvoice, createInvoice, updateInvoice, deleteInvoice,
  listTasks, getTask, createTask, updateTask, deleteTask,
  markTaskComplete, markTaskIncomplete, getTaskCompletions, getCompletionsForDate,
  listNotes, createNote, updateNote, deleteNote,
  listUsers, getUser, getUserByEmail, createUser, updateUser,
  listAuditLog,
  listDocuments, getDocument, createDocument, updateDocument, deleteDocument, searchDocuments,
  listMarketingGroups, createMarketingGroup, updateMarketingGroup, markGroupPosted, deleteMarketingGroup,
  getTodaysGroups, getCategoryAnalysis, seedFbGroups, markGroupReviewed, snoozeGroup,
  listPostLog, createPostLog, updatePostLog, deletePostLog, getRecentlyUsedTemplateIds, getTemplateUsageCounts,
  listFbConversations, getFbConversation, createFbConversation, updateFbConversation, deleteFbConversation, fbConversationExists,
  listFbPosts, createFbPost, updateFbPost, deleteFbPost, fbPostExists,
  listFbQueuePosts, createFbQueuePost, updateFbQueuePost, deleteFbQueuePost, suggestNextCategory, getRecentFbPostCategories,
} from './repositories'
import { claudeComplete } from './claudeApi'
import { createBackup, listBackups, stageRestore } from './backup'
import { getAnalyticsStats } from './analytics'
import { globalSearch } from './search'
import { importFmcsaLeads, writeImportMeta, readImportStatus, backfillLeadData } from './fmcsaImport'
import { getAuthorityDateByMc } from './fmcsaApi'
import { importLeadsFromCsv, importLeadsFromText } from './csvLeadImport'
import { runSeedIfEmpty, resetAndReseed, seedMissingItems, seedTasksAndDocsOnly, clearNonTaskSeedData, reseedDocuments } from './seed'
import { getBoardRows, getAvailableLoads, assignLoadToDriver } from './dispatcherBoard'
import { getRecommendations } from './loadScanner'
import { getDashboardStats } from './dashboard'
import { getOperationsData } from './operations'
import { getProfitRadarData, getProfitRadarSummary } from './profitRadar'
import {
  listTimelineEvents, addTimelineEvent, completeTimelineEvent, deleteTimelineEvent,
  applyStatusChange, initLoadTimeline, getActiveLoads, getUpcomingCheckCalls,
} from './repositories/loadTimelineRepo'
import { getBrokerIntelAll, getLaneIntelAll, getDriverLaneFits } from './brokerIntelligence'
import { parseAndScore, importAndScoreXlsx } from './loadBoardParser'
import { getLastBrowserImport } from './webServer'

export function registerDbHandlers(ipcMain: IpcMain, store: Store<any>): void {

  // -- Settings --
  ipcMain.handle('settings:get',    (_e, key: string) => store.get(key))
  ipcMain.handle('settings:set',    (_e, key: string, value: unknown) => { store.set(key, value) })
  ipcMain.handle('settings:getAll', () => store.store)

  // -- Dashboard --
  ipcMain.handle('dashboard:stats', () => getDashboardStats(getDb()))

  // -- Operations Control Panel --
  ipcMain.handle('operations:data', () => getOperationsData(getDb()))

  // -- Profit Radar --
  ipcMain.handle('profitRadar:data',    ()  => getProfitRadarData(getDb()))
  ipcMain.handle('profitRadar:summary', async () => getProfitRadarSummary(getProfitRadarData(getDb()), store))

  // -- Active Load Timeline --
  ipcMain.handle('timeline:activeLoads',    ()                          => getActiveLoads(getDb()))
  ipcMain.handle('timeline:upcomingCalls',  (_e, n?: number)            => getUpcomingCheckCalls(getDb(), n))
  ipcMain.handle('timeline:events',         (_e, loadId: number)        => listTimelineEvents(getDb(), loadId))
  ipcMain.handle('timeline:addEvent',       (_e, loadId: number, eventType: string, label: string, scheduledAt: string | null, notes: string | null) =>
    addTimelineEvent(getDb(), loadId, eventType, label, scheduledAt, notes))
  ipcMain.handle('timeline:completeEvent',  (_e, id: number, notes?: string) => completeTimelineEvent(getDb(), id, notes))
  ipcMain.handle('timeline:deleteEvent',    (_e, id: number)            => deleteTimelineEvent(getDb(), id))
  ipcMain.handle('timeline:statusChange',   (_e, loadId: number, newStatus: string, notes: string | null) =>
    applyStatusChange(getDb(), loadId, newStatus, notes))
  ipcMain.handle('timeline:initLoad',       (_e, loadId: number)        => initLoadTimeline(getDb(), loadId))
  ipcMain.handle('timeline:generateMessage', async (_e, p: { driverName: string; route: string; messageType: string }) => {
    const apiKey = store.get('claude_api_key') as string | undefined
    const prompts: Record<string, string> = {
      check_in:        `Write a brief, professional check-in text message to driver ${p.driverName} on load ${p.route}. Ask for current location and estimated arrival time. 1-2 sentences, no emojis, direct and friendly.`,
      broker_update:   `Write a brief broker status update for a load on route ${p.route}. Driver is in transit and on schedule. 2 sentences, professional tone.`,
      pod_request:     `Write a brief message to driver ${p.driverName} requesting proof of delivery (POD) for the completed load on route ${p.route}. 1-2 sentences.`,
      delivery_confirm:`Write a brief delivery confirmation to send to the broker for a load on route ${p.route}. Confirm the load was delivered successfully today. 1-2 sentences.`,
    }
    const prompt = prompts[p.messageType] ?? `Write a brief operational message for driver ${p.driverName} on load ${p.route}. 1-2 sentences.`
    return claudeComplete(
      apiKey ?? '',
      prompt,
      'You are a professional trucking dispatcher writing brief operational messages. No emojis. Clear and direct.',
      150,
    )
  })

  // -- Broker Intelligence + Lane Memory --
  ipcMain.handle('intel:allBrokers',  ()                       => getBrokerIntelAll(getDb()))
  ipcMain.handle('intel:allLanes',    ()                       => getLaneIntelAll(getDb()))
  ipcMain.handle('intel:driverFit',   (_e, driverId: number)  => getDriverLaneFits(getDb(), driverId))

  // -- Load Match: Negotiation Script --
  ipcMain.handle('loadMatch:nego', async (_e, payload: {
    rate:          number | null
    miles:         number | null
    rpm:           number | null
    deadheadMiles: number
    origin:        string
    dest:          string
    brokerName:    string | null
    driverName:    string
  }) => {
    const apiKey = store.get('claude_api_key') as string | undefined
    if (!apiKey?.trim()) return null
    const brief = [
      `Lane: ${payload.origin} to ${payload.dest}`,
      `Rate: ${payload.rate != null ? '$' + payload.rate.toLocaleString() : 'unknown'}, ${payload.miles ?? '?'} loaded miles`,
      `RPM: ${payload.rpm != null ? '$' + payload.rpm.toFixed(2) + '/mi' : 'unknown'}`,
      `Deadhead: ${payload.deadheadMiles} miles`,
      payload.brokerName ? `Broker: ${payload.brokerName}` : null,
    ].filter(Boolean).join('. ')
    const result = await claudeComplete(
      apiKey,
      brief,
      'You are a freight dispatcher. Given this load\'s rate and lane details, write exactly 2 sentences: a one-sentence rate assessment and a specific word-for-word call opener to use when negotiating with the broker. Be direct with numbers. No greetings, no bullet points, no emojis.',
      120,
    )
    return result.ok ? result.content.trim() : null
  })

  // -- Generic DB query (dev/debug only — disabled in packaged builds, SELECT-only) --
  if (!app.isPackaged) {
    ipcMain.handle('db:query', (_e, sql: string, params?: unknown[]) => {
      if (typeof sql !== 'string' || !sql.trim().toUpperCase().startsWith('SELECT')) {
        return { data: null, error: 'Only SELECT statements are permitted on this channel' }
      }
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
  ipcMain.handle('leads:importStatus',   () => readImportStatus(getDb()))
  ipcMain.handle('leads:backfillLeadData', () => backfillLeadData(getDb()))
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
  ipcMain.handle('drivers:delete',     (_e, id: number) => deleteDriver(getDb(), id))
  ipcMain.handle('drivers:compliance', ()               => getDriverCompliance(getDb()))

  // Fetch authority grant date from FMCSA SAFER by MC number and save to driver record
  ipcMain.handle('drivers:fetchAuthorityDate', async (_e, driverId: number, mcNumber: string) => {
    if (typeof mcNumber !== 'string' || !mcNumber.trim()) return null
    const { authorityDate } = await getAuthorityDateByMc(mcNumber)
    if (!authorityDate) return null
    return updateDriver(getDb(), driverId, { authority_date: authorityDate } as any)
  })

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

  // -- Load Board Screenshot Parser (vision) --
  ipcMain.handle('loads:parseScreenshot', async (_e, imageBase64: string, mediaType: string, driverId: number, cpm: number = 0.75) => {
    const apiKey = store.get('claude_api_key') as string | undefined
    if (!apiKey) return { error: 'Claude API key not configured. Add it in Settings > AI Integration.' }
    const driver = getDriver(getDb(), driverId)
    if (!driver) return { error: 'Driver not found.' }
    const brokers = listBrokers(getDb())
    return parseAndScore(apiKey, imageBase64, mediaType as 'image/png' | 'image/jpeg' | 'image/webp', driver, brokers, cpm)
  })

  // -- Load Board XLSX Import --
  ipcMain.handle('loads:importXlsx', async (_e, driverId: number, cpm: number = 0.75) => {
    const driver = getDriver(getDb(), driverId)
    if (!driver) return { error: 'Driver not found.' }
    const brokers = listBrokers(getDb())
    return importAndScoreXlsx(driver, brokers, cpm)
  })

  // -- Browser Import poll channel (renderer calls this to pick up last POST from Claude in Chrome) --
  ipcMain.handle('loads:getLastBrowserImport', () => getLastBrowserImport())

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
  ipcMain.handle('invoices:delete', (_e, id: number) => deleteInvoice(getDb(), id))

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
  ipcMain.handle('notes:update', (_e, id: number, content: string) => updateNote(getDb(), id, content))
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

  // -- Marketing --
  ipcMain.handle('marketing:groups:list',          () => listMarketingGroups(getDb()))
  ipcMain.handle('marketing:groups:create',        (_e, name: string, url: string | null, platform: string, notes: string | null, truckTypeTags: string[], regionTags: string[]) =>
    createMarketingGroup(getDb(), name, url, platform, notes, truckTypeTags, regionTags))
  ipcMain.handle('marketing:groups:update',        (_e, id: number, updates: Parameters<typeof updateMarketingGroup>[2]) =>
    updateMarketingGroup(getDb(), id, updates))
  ipcMain.handle('marketing:groups:markPosted',    (_e, id: number, date: string) => markGroupPosted(getDb(), id, date))
  ipcMain.handle('marketing:groups:delete',        (_e, id: number) => deleteMarketingGroup(getDb(), id))
  ipcMain.handle('marketing:groups:todaysGroups',  (_e, n?: number) => getTodaysGroups(getDb(), n))
  ipcMain.handle('marketing:groups:catAnalysis',   () => getCategoryAnalysis(getDb()))
  ipcMain.handle('marketing:groups:seedGroups',    () => { seedFbGroups(getDb()); return { ok: true } })
  ipcMain.handle('marketing:groups:markReviewed',  (_e, id: number, date: string) => markGroupReviewed(getDb(), id, date))
  ipcMain.handle('marketing:groups:snoozeGroup',   (_e, id: number, until: string) => snoozeGroup(getDb(), id, until))
  ipcMain.handle('marketing:groups:importHtml',    async () => {
    const result = await dialog.showOpenDialog({
      title: 'Select your saved Facebook Groups HTML file',
      filters: [{ name: 'HTML Files', extensions: ['html', 'htm'] }],
      properties: ['openFile'],
    })
    if (result.canceled || !result.filePaths[0]) return { added: 0, found: 0, canceled: true }
    const html = readFileSync(result.filePaths[0], 'utf-8')
    const groups = parseFbGroupsFromHtml(html)
    const db = getDb()
    const ins = db.prepare(
      'INSERT OR IGNORE INTO marketing_groups ' +
      '(name, url, platform, notes, truck_type_tags, region_tags, active, category, priority) ' +
      'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    )
    let added = 0
    db.transaction(() => {
      for (const g of groups) {
        const r = ins.run(g.name, g.url, 'Facebook', 'Imported from HTML', '[]', '[]', 1, 'mixed', 'Medium')
        if (r.changes > 0) added++
      }
    })()
    return { added, found: groups.length }
  })

  ipcMain.handle('marketing:post:list',         (_e, limit?: number) => listPostLog(getDb(), limit))
  ipcMain.handle('marketing:post:create',       (_e, templateId: string, category: string, truckType: string | null, usedDate: string, groupsPostedTo: string[], posted: boolean, repliesCount: number, leadsGenerated: number, notes: string | null) =>
    createPostLog(getDb(), templateId, category, truckType, usedDate, groupsPostedTo, posted, repliesCount, leadsGenerated, notes))
  ipcMain.handle('marketing:post:update',       (_e, id: number, updates: Parameters<typeof updatePostLog>[2]) =>
    updatePostLog(getDb(), id, updates))
  ipcMain.handle('marketing:post:delete',       (_e, id: number) => deletePostLog(getDb(), id))
  ipcMain.handle('marketing:post:recentIds',    (_e, days?: number) => getRecentlyUsedTemplateIds(getDb(), days))
  ipcMain.handle('marketing:post:usageCounts',  () => getTemplateUsageCounts(getDb()))

  // -- FB Conversation Agent (Agent 1) — CRUD --
  ipcMain.handle('fbConv:list',   (_e, stage?: string) => listFbConversations(getDb(), stage))
  ipcMain.handle('fbConv:get',    (_e, id: number) => getFbConversation(getDb(), id))
  ipcMain.handle('fbConv:create', (_e, dto: unknown) => createFbConversation(getDb(), dto as any))
  ipcMain.handle('fbConv:update', (_e, id: number, dto: unknown) => updateFbConversation(getDb(), id, dto as any))
  ipcMain.handle('fbConv:delete', (_e, id: number) => deleteFbConversation(getDb(), id))
  ipcMain.handle('fbConv:exists', (_e, name: string, phone: string | null) => fbConversationExists(getDb(), name, phone))

  // -- FB Conversation Agent — AI actions --
  ipcMain.handle('fb:conv:generateReply', async (_e, p: { name: string; stage: string; lastMessage: string | null; trailer: string | null; location: string | null }) => {
    const apiKey = store.get('claude_api_key') as string | undefined
    return claudeComplete(
      apiKey ?? '',
      `Name: ${p.name}\nStage: ${p.stage}\nLast message: ${p.lastMessage ?? 'none'}\nEquipment: ${p.trailer ?? 'unknown'}\nLocation: ${p.location ?? 'unknown'}\n\nWrite a short, friendly Facebook DM reply (2-3 sentences) that builds rapport and naturally moves the conversation toward a phone call.`,
      'You write short, natural Facebook DM replies for a trucking dispatch company called OnTrack Hauling Solutions. Replies should sound human, not salesy.',
      200,
    )
  })
  ipcMain.handle('fb:conv:generateFollowUp', async (_e, p: { name: string; stage: string; lastMessageAt: string | null }) => {
    const apiKey = store.get('claude_api_key') as string | undefined
    return claudeComplete(
      apiKey ?? '',
      `Name: ${p.name}\nStage: ${p.stage}\nLast contact: ${p.lastMessageAt ?? 'unknown'}\n\nWrite a short follow-up message (1-2 sentences). Friendly, not pushy. Acknowledge time passed.`,
      'You write short, natural Facebook DM follow-ups for a trucking dispatcher.',
      150,
    )
  })
  ipcMain.handle('fb:conv:suggestQuestion', async (_e, p: { name: string; stage: string; lastMessage: string | null; trailer: string | null; location: string | null }) => {
    const apiKey = store.get('claude_api_key') as string | undefined
    return claudeComplete(
      apiKey ?? '',
      `Lead: ${p.name}\nStage: ${p.stage}\nEquipment: ${p.trailer ?? 'unknown'}\nLocation: ${p.location ?? 'unknown'}\nLast message: ${p.lastMessage ?? 'none'}\n\nSuggest the single best qualifying question to ask this lead next. Return just the question, nothing else.`,
      'You help trucking dispatchers qualify carrier leads on Facebook.',
      100,
    )
  })
  ipcMain.handle('fb:conv:handoffSummary', async (_e, p: { name: string; phone: string | null; trailer: string | null; location: string | null; stage: string; notes: string | null }) => {
    const apiKey = store.get('claude_api_key') as string | undefined
    return claudeComplete(
      apiKey ?? '',
      `Name: ${p.name}\nPhone: ${p.phone ?? 'not captured'}\nEquipment: ${p.trailer ?? 'unknown'}\nLocation: ${p.location ?? 'unknown'}\nStage: ${p.stage}\nNotes: ${p.notes ?? 'none'}\n\nWrite a brief call-ready handoff summary (3-4 sentences) for a dispatcher to read before calling this carrier.`,
      'You write concise call-ready carrier summaries for trucking dispatchers.',
      250,
    )
  })

  // -- FB Lead Hunter Agent (Agent 2) — CRUD --
  ipcMain.handle('fbHunter:list',   (_e, status?: string) => listFbPosts(getDb(), status as any))
  ipcMain.handle('fbHunter:create', (_e, dto: unknown) => createFbPost(getDb(), dto as any))
  ipcMain.handle('fbHunter:update', (_e, id: number, dto: unknown) => updateFbPost(getDb(), id, dto as any))
  ipcMain.handle('fbHunter:delete', (_e, id: number) => deleteFbPost(getDb(), id))
  ipcMain.handle('fbHunter:exists', (_e, rawText: string) => fbPostExists(getDb(), rawText))

  // -- FB Lead Hunter Agent — AI actions --
  ipcMain.handle('fb:hunter:classify', async (_e, p: { rawText: string }) => {
    const apiKey = store.get('claude_api_key') as string | undefined
    return claudeComplete(
      apiKey ?? '',
      `Facebook post: "${p.rawText.slice(0, 800)}"\n\nReturn valid JSON only (no markdown, no code block):\n{"intent":"Needs Dispatcher"|"Needs Load"|"Empty Truck"|"Looking for Consistent Freight"|"General Networking"|"Low Intent"|"Ignore","extractedName":string|null,"extractedPhone":string|null,"extractedLocation":string|null,"extractedEquipment":string|null,"recommendedAction":string,"why":string}`,
      'You classify Facebook posts for a trucking dispatch company. Return valid JSON only. No explanations, no markdown.',
      350,
    )
  })
  ipcMain.handle('fb:hunter:draftComment', async (_e, p: { rawText: string; intent: string }) => {
    const apiKey = store.get('claude_api_key') as string | undefined
    return claudeComplete(
      apiKey ?? '',
      `Intent: ${p.intent}\nPost: "${p.rawText.slice(0, 400)}"\n\nWrite a short public Facebook comment (1-2 sentences) showing genuine interest. Friendly, not salesy. No generic phrases like "DM me".`,
      'You write brief public Facebook comments for a trucking dispatch company called OnTrack Hauling Solutions.',
      150,
    )
  })
  ipcMain.handle('fb:hunter:draftDm', async (_e, p: { intent: string; extractedInfo: string }) => {
    const apiKey = store.get('claude_api_key') as string | undefined
    return claudeComplete(
      apiKey ?? '',
      `Intent: ${p.intent}\nExtracted info: ${p.extractedInfo}\n\nWrite a short, direct Facebook DM opening (2-3 sentences) to start a dispatching conversation. Introduce the company briefly.`,
      'You write concise Facebook DMs for a trucking dispatcher at OnTrack Hauling Solutions looking for carriers to work with.',
      200,
    )
  })

  // -- FB Content Agent (Agent 3) — CRUD --
  ipcMain.handle('fbContent:list',       (_e, status?: string) => listFbQueuePosts(getDb(), status as any))
  ipcMain.handle('fbContent:create',     (_e, dto: unknown) => createFbQueuePost(getDb(), dto as any))
  ipcMain.handle('fbContent:update',     (_e, id: number, dto: unknown) => updateFbQueuePost(getDb(), id, dto as any))
  ipcMain.handle('fbContent:delete',     (_e, id: number) => deleteFbQueuePost(getDb(), id))
  ipcMain.handle('fbContent:suggestCat', () => suggestNextCategory(getDb()))
  ipcMain.handle('fbContent:recentCats', (_e, days?: number) => getRecentFbPostCategories(getDb(), days))

  // -- FB Content Agent — AI actions --
  ipcMain.handle('fb:content:generatePost', async (_e, p: { category: string; recentCategories: string[] }) => {
    const apiKey     = store.get('claude_api_key') as string | undefined
    const company    = (store.get('companyName') as string | undefined) ?? 'OnTrack Hauling Solutions'
    const owner      = (store.get('ownerName')   as string | undefined) ?? 'Chris'
    return claudeComplete(
      apiKey ?? '',
      `Company: ${company}\nContact: ${owner}\nCategory: ${p.category}\nRecent categories (vary your angle): ${p.recentCategories.slice(0, 5).join(', ') || 'none'}\n\nWrite one Facebook post for this category. Natural human tone. No hashtag spam. No bullet lists. 2-4 sentences. End with a clear call to action.`,
      'You write Facebook posts for a trucking dispatch company. Posts should sound human, professional, and build trust with independent owner-operators.',
      300,
    )
  })
  ipcMain.handle('fb:content:generateVariation', async (_e, p: { content: string }) => {
    const apiKey = store.get('claude_api_key') as string | undefined
    return claudeComplete(
      apiKey ?? '',
      `Original post:\n${p.content}\n\nWrite one variation of this post with different wording. Same core message, different angle or opening. 2-4 sentences.`,
      'You rewrite Facebook posts for a trucking dispatch company. Keep the professional, human tone.',
      250,
    )
  })
  ipcMain.handle('fb:content:suggestReplies', async (_e, p: { content: string }) => {
    const apiKey = store.get('claude_api_key') as string | undefined
    return claudeComplete(
      apiKey ?? '',
      `Post: "${p.content}"\n\nSuggest 3 short reply options (1 sentence each) for likely comments on this post. Format as:\n1. [reply]\n2. [reply]\n3. [reply]`,
      'You suggest comment replies for Facebook posts from a trucking dispatch company.',
      200,
    )
  })

  // -- Shell utilities --
  ipcMain.handle('shell:openExternal', (_e, url: string) => {
    if (typeof url !== 'string') return
    let parsed: URL
    try { parsed = new URL(url) } catch { return }
    if (!['https:', 'http:', 'mailto:'].includes(parsed.protocol)) return
    shell.openExternal(url)
  })

  // Opens a local file (relative to app root) in the OS default application
  ipcMain.handle('shell:openFile', (_e, relativePath: string) => {
    if (typeof relativePath !== 'string') return
    const fullPath = join(app.getAppPath(), relativePath)
    shell.openPath(fullPath)
  })

  // Opens a driver document attachment by absolute path
  ipcMain.handle('driverDocs:openAttachment', (_e, absolutePath: string) => {
    if (typeof absolutePath !== 'string') return
    if (!existsSync(absolutePath)) return
    shell.openPath(absolutePath)
  })

  // Opens file picker, copies chosen file into userData/driver-docs/{driverId}/,
  // returns { storedPath, displayName } or null if user cancelled
  ipcMain.handle('driverDocs:pickFile', async (_e, driverId: number) => {
    const result = await dialog.showOpenDialog({
      title: 'Attach Document',
      buttonLabel: 'Attach',
      properties: ['openFile'],
      filters: [
        { name: 'Documents', extensions: ['pdf','doc','docx','jpg','jpeg','png','tif','tiff'] },
        { name: 'All Files', extensions: ['*'] },
      ],
    })
    if (result.canceled || result.filePaths.length === 0) return null

    const src = result.filePaths[0]
    const destDir = join(app.getPath('userData'), 'driver-docs', String(driverId))
    mkdirSync(destDir, { recursive: true })

    const ts      = Date.now()
    const origName = basename(src)
    const ext      = extname(src)
    const safeName = `${ts}_${origName.replace(/[^a-zA-Z0-9._-]/g, '_')}`
    const dest     = join(destDir, safeName)

    copyFileSync(src, dest)
    return { storedPath: dest, displayName: origName.replace(ext, '') + ext }
  })

  // -- Dev Seed (non-packaged builds only) --
  ipcMain.handle('dev:seed',          () => { runSeedIfEmpty(getDb());      return { ok: true } })
  ipcMain.handle('dev:reseed',        () => { resetAndReseed(getDb());      return { ok: true } })
  ipcMain.handle('dev:seedMissing',   () => { seedMissingItems(getDb());    return { ok: true } })
  ipcMain.handle('dev:seedTasksOnly', () => { seedTasksAndDocsOnly(getDb()); return { ok: true } })
  ipcMain.handle('dev:clearSeedData', () => { clearNonTaskSeedData(getDb()); return { ok: true } })
  ipcMain.handle('dev:reseedDocs',    () => { reseedDocuments(getDb());      return { ok: true } })
}

// ── Helpers ────────────────────────────────────────────────────────────────────

/**
 * Parse saved Facebook HTML to extract group name + URL pairs.
 * Looks for <a href="...facebook.com/groups/..."> anchor tags.
 * Uses INSERT OR IGNORE so re-importing the same file is always safe.
 */
function parseFbGroupsFromHtml(html: string): Array<{ name: string; url: string }> {
  const results: Array<{ name: string; url: string }> = []
  const seen = new Set<string>()
  // Match anchor tags whose href contains a Facebook group URL
  const re = /<a\b[^>]*\bhref=["']([^"']*facebook\.com\/groups\/([^"'?&#/][^"'?&#]*))[^"']*["'][^>]*>([\s\S]*?)<\/a>/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(html)) !== null) {
    const url  = m[1].split('?')[0].replace(/\/$/, '')
    const text = m[3].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
    if (seen.has(url)) continue
    if (!text || text.length < 3 || text.length > 150) continue
    // Skip obvious UI chrome
    const lower = text.toLowerCase()
    if (['see all', 'join', 'visit', 'more', 'groups', 'your groups', 'invite'].includes(lower)) continue
    seen.add(url)
    results.push({ name: text, url })
  }
  return results
}
