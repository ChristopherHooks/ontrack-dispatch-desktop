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
  listInvoices, getInvoice, createInvoice, updateInvoice, deleteInvoice, autoFlagOverdueInvoices, bulkUpdateInvoices,
  listLoadAttachments, createLoadAttachment, deleteLoadAttachment,
  listLoadDeductions, createLoadDeduction, deleteLoadDeduction,
  listTasks, getTask, createTask, updateTask, deleteTask,
  markTaskComplete, markTaskIncomplete, getTaskCompletions, getCompletionsForDate,
  listNotes, createNote, updateNote, deleteNote,
  listUsers, getUser, getUserByEmail, createUser, updateUser,
  listAuditLog,
  listDocuments, getDocument, createDocument, updateDocument, deleteDocument, searchDocuments,
  listMarketingGroups, createMarketingGroup, updateMarketingGroup, markGroupPosted, deleteMarketingGroup,
  getTodaysGroups, getCategoryAnalysis, seedFbGroups, markGroupReviewed, snoozeGroup,
  listPostLog, createPostLog, updatePostLog, deletePostLog, getRecentlyUsedTemplateIds, getTemplateUsageCounts,
  listBrokerCallLog, createBrokerCallLog, deleteBrokerCallLog,
  listCarrierBrokerApprovals, upsertCarrierBrokerApproval, deleteCarrierBrokerApproval,
  listDriverProspects, getDriverProspect, createDriverProspect, updateDriverProspect, deleteDriverProspect,
  listProspectOutreach, createProspectOutreach, deleteProspectOutreach,
  getDriverOnboardingChecklist, setDriverOnboardingItem,
  listLoadAccessorials, createLoadAccessorial, updateLoadAccessorial, deleteLoadAccessorial,
  getLastRefresh, logRefresh, getOutreachPerformance, getOutreachSummary,
  listDatPostings, getDatPosting, createDatPosting, updateDatPosting, deleteDatPosting,
  listCarrierOffers, getCarrierOffer, createCarrierOffer, updateCarrierOffer, deleteCarrierOffer, acceptCarrierOffer,
  getVetting, upsertVetting, deleteVetting,
  createOffer, markAccepted, markDeclined, markNoResponse, getDriverAcceptanceStats,
  getDriverWeeklyScorecard, getAllDriversWeeklyScorecards,
  logFallout, getDriverFalloutStats, getAllDriverFalloutCounts,
} from './repositories'
import { claudeComplete } from './claudeApi'
import { createBackup, listBackups, stageRestore } from './backup'
import { getAnalyticsStats } from './analytics'
import { globalSearch } from './search'
import { importFmcsaLeads, writeImportMeta, readImportStatus, backfillLeadData } from './fmcsaImport'
import { getAuthorityDateByMc } from './fmcsaApi'
import { importLeadsFromCsv, importLeadsFromText } from './csvLeadImport'
import { runSeedIfEmpty, resetAndReseed, seedMissingItems, seedTasksAndDocsOnly, clearNonTaskSeedData, reseedDocuments, reseedTasks, addTestData, removeTestData } from './seed'
import { getBoardRows, getAvailableLoads, assignLoadToDriver } from './dispatcherBoard'
import { getRecommendations } from './loadScanner'
import { getDashboardStats } from './dashboard'
import { getOperationsData } from './operations'
import { getMorningDispatchBrief } from './morningDispatchBrief'
import { getProfitRadarData, getProfitRadarSummary } from './profitRadar'
import {
  listTimelineEvents, addTimelineEvent, completeTimelineEvent, deleteTimelineEvent,
  applyStatusChange, initLoadTimeline, getActiveLoads, getUpcomingCheckCalls,
} from './repositories/loadTimelineRepo'
import { getBrokerIntelAll, getLaneIntelAll, getDriverLaneFits } from './brokerIntelligence'
import { parseAndScore, importAndScoreXlsx } from './loadBoardParser'
import { getLastBrowserImport } from './webServer'
import { getReportsData } from './reports'

export function registerDbHandlers(ipcMain: IpcMain, store: Store<any>): void {

  // -- Settings --
  ipcMain.handle('settings:get',    (_e, key: string) => store.get(key))
  ipcMain.handle('settings:set',    (_e, key: string, value: unknown) => { store.set(key, value) })
  ipcMain.handle('settings:getAll', () => store.store)

  // -- Dashboard --
  ipcMain.handle('dashboard:stats', () => getDashboardStats(getDb()))

  // -- Operations Control Panel --
  ipcMain.handle('operations:data',         () => getOperationsData(getDb()))
  ipcMain.handle('operations:morningBrief', () => getMorningDispatchBrief(getDb()))

  // -- Reports --
  ipcMain.handle('reports:data', () => getReportsData(getDb()))

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

  // -- AI Follow-Up Generator for warm leads --
  ipcMain.handle('leads:generateFollowUp', async (_e, payload: {
    name:               string
    company:            string | null
    status:             string
    trailerType:        string | null
    lastContactDate:    string | null
    contactAttempts:    number
    outreachOutcome:    string | null
  }) => {
    const apiKey = store.get('claude_api_key') as string | undefined
    if (!apiKey?.trim()) return null
    const context = [
      `Lead: ${payload.name}${payload.company ? ' (' + payload.company + ')' : ''}`,
      `Status: ${payload.status}`,
      payload.trailerType   ? `Equipment: ${payload.trailerType}` : null,
      payload.lastContactDate ? `Last contact: ${payload.lastContactDate}` : 'Never contacted',
      payload.contactAttempts > 0 ? `Attempts: ${payload.contactAttempts}` : null,
      payload.outreachOutcome ? `Last outcome: ${payload.outreachOutcome}` : null,
    ].filter(Boolean).join('. ')
    const result = await claudeComplete(
      apiKey,
      context,
      'You are a freight dispatcher writing a short, natural follow-up message to a truck driver lead. ' +
      'Write 2-3 sentences max. Sound like a real person, not a form letter. Mention dispatch services briefly. ' +
      'No emojis. No bullet points. No subject line. Just the message body ready to send via SMS or email.',
      120,
    )
    return result.ok ? result.content.trim() : null
  })

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

  // -- Loads --
  ipcMain.handle('loads:list',   (_e, status?: string) => listLoads(getDb(), status))
  ipcMain.handle('loads:get',    (_e, id: number) => getLoad(getDb(), id))
  ipcMain.handle('loads:create', (_e, dto: unknown) => createLoad(getDb(), dto as any))
  ipcMain.handle('loads:update', (_e, id: number, dto: unknown) => {
    const db    = getDb()
    const before = getLoad(db, id)
    const patch  = dto as Record<string, unknown>

    // Extract unassignment_reason before handing patch to updateLoad.
    // This field is not a load column — it only drives fallout logging.
    const unassignmentReason = typeof patch.unassignment_reason === 'string'
      ? patch.unassignment_reason
      : undefined
    const cleanPatch = { ...patch }
    delete cleanPatch.unassignment_reason

    // Detect driver removal: load had a driver, dto explicitly clears it
    const driverRemoved = before?.driver_id != null && cleanPatch.driver_id === null

    // When removing a driver, also revert load status to Searching so the load
    // re-enters the available pool. Only apply when status is still 'Booked'
    // (i.e. the user didn't deliberately set a different target status in the form).
    const finalPatch = driverRemoved && (!cleanPatch.status || cleanPatch.status === 'Booked')
      ? { ...cleanPatch, status: 'Searching' }
      : cleanPatch

    const updated = updateLoad(db, id, finalPatch as any)

    // Log fallout when driver is removed from an active load (before delivery).
    // Reason is stored for every removal; fallout_count only increments for
    // driver-fault reasons (see driverFalloutRepo.ts / FALLOUT_REASONS).
    if (driverRemoved && updated && before?.status && ['Booked', 'Picked Up', 'In Transit'].includes(before.status)) {
      try { logFallout(db, before.driver_id as number, id, before.status, unassignmentReason) } catch (_) { /* non-critical */ }
    }

    // Reflect driver-fault unassignment reasons in load_offers so the Load Behavior
    // breakdown counters stay accurate. A new offer row is inserted (the original
    // accepted offer is left untouched) to represent the post-acceptance outcome.
    if (driverRemoved && updated && unassignmentReason) {
      try {
        const t = new Date().toISOString().slice(0, 19).replace('T', ' ')
        if (unassignmentReason === 'no_response_after_acceptance') {
          db.prepare(
            'INSERT INTO load_offers' +
            '  (driver_id, load_id, outcome, offered_at, responded_at, decline_reason, created_at, updated_at)' +
            '  VALUES (?, ?, ?, ?, ?, NULL, ?, ?)'
          ).run(before!.driver_id, id, 'no_response', t, t, t, t)
        } else if (unassignmentReason === 'driver_backed_out') {
          db.prepare(
            'INSERT INTO load_offers' +
            '  (driver_id, load_id, outcome, offered_at, responded_at, decline_reason, created_at, updated_at)' +
            '  VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
          ).run(before!.driver_id, id, 'declined', t, t, 'driver_backed_out', t, t)
        }
      } catch (_) { /* non-critical */ }
    }

    // Reset old driver status to Active — mirrors the inverse of assignLoadToDriver.
    // Guard: only if the driver has no other active loads.
    if (driverRemoved && updated) {
      const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
      const hasOtherLoad = db.prepare(
        "SELECT id FROM loads WHERE driver_id = ? AND status IN ('Booked','Picked Up','In Transit') LIMIT 1"
      ).get(before!.driver_id) as { id: number } | undefined
      if (!hasOtherLoad) {
        db.prepare("UPDATE drivers SET status = 'Active', updated_at = ? WHERE id = ?")
          .run(now, before!.driver_id)
      }
    }

    return updated
  })
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

  // -- Broker Call Log --
  ipcMain.handle('brokerCallLog:list',   (_e, brokerId: number) => listBrokerCallLog(getDb(), brokerId))
  ipcMain.handle('brokerCallLog:create', (_e, dto: unknown) => createBrokerCallLog(getDb(), dto as any))
  ipcMain.handle('brokerCallLog:delete', (_e, id: number) => deleteBrokerCallLog(getDb(), id))

  ipcMain.handle('carrierApprovals:list',   (_e, driverId: number) => listCarrierBrokerApprovals(getDb(), driverId))
  ipcMain.handle('carrierApprovals:upsert', (_e, dto: unknown) => upsertCarrierBrokerApproval(getDb(), dto as any))
  ipcMain.handle('carrierApprovals:delete', (_e, id: number) => deleteCarrierBrokerApproval(getDb(), id))

  // -- Driver Prospects (Acquisition Pipeline) --
  ipcMain.handle('driverProspects:list',   (_e, stage?: string)              => listDriverProspects(getDb(), stage))
  ipcMain.handle('driverProspects:get',    (_e, id: number)                  => getDriverProspect(getDb(), id))
  ipcMain.handle('driverProspects:create', (_e, dto: unknown)                => createDriverProspect(getDb(), dto as any))
  ipcMain.handle('driverProspects:update', (_e, id: number, dto: unknown)    => updateDriverProspect(getDb(), id, dto as any))
  ipcMain.handle('driverProspects:delete', (_e, id: number)                  => deleteDriverProspect(getDb(), id))

  // -- Prospect Outreach Log --
  ipcMain.handle('prospectOutreach:list',   (_e, prospect_id: number)    => listProspectOutreach(getDb(), prospect_id))
  ipcMain.handle('prospectOutreach:create', (_e, dto: unknown)           => createProspectOutreach(getDb(), dto as any))
  ipcMain.handle('prospectOutreach:delete', (_e, id: number)             => deleteProspectOutreach(getDb(), id))

  // -- Driver Onboarding Checklist --
  ipcMain.handle('driverOnboarding:get', (_e, driver_id: number)                           => getDriverOnboardingChecklist(getDb(), driver_id))
  ipcMain.handle('driverOnboarding:set', (_e, driver_id: number, key: string, val: boolean) => setDriverOnboardingItem(getDb(), driver_id, key, val))

  // -- Load Accessorials --
  ipcMain.handle('loadAccessorials:list',   (_e, load_id: number)          => listLoadAccessorials(getDb(), load_id))
  ipcMain.handle('loadAccessorials:create', (_e, dto: unknown)             => createLoadAccessorial(getDb(), dto as any))
  ipcMain.handle('loadAccessorials:update', (_e, id: number, dto: unknown) => updateLoadAccessorial(getDb(), id, dto as any))
  ipcMain.handle('loadAccessorials:delete', (_e, id: number)               => deleteLoadAccessorial(getDb(), id))

  // -- Outreach Engine --
  ipcMain.handle('outreach:getLastRefresh', () => getLastRefresh(getDb()))
  ipcMain.handle('outreach:logRefresh',     (_e, notes: string | null, templateCountAdded: number) =>
    logRefresh(getDb(), notes ?? null, templateCountAdded ?? 0)
  )
  ipcMain.handle('outreach:performance',    () => getOutreachPerformance(getDb()))
  ipcMain.handle('outreach:summary',        () => getOutreachSummary(getDb()))

  // -- Broker Mode: DAT Postings --
  ipcMain.handle('datPostings:list',   (_e, loadId: number)          => listDatPostings(getDb(), loadId))
  ipcMain.handle('datPostings:get',    (_e, id: number)              => getDatPosting(getDb(), id))
  ipcMain.handle('datPostings:create', (_e, dto: unknown)            => createDatPosting(getDb(), dto as any))
  ipcMain.handle('datPostings:update', (_e, id: number, dto: unknown) => updateDatPosting(getDb(), id, dto as any))
  ipcMain.handle('datPostings:delete', (_e, id: number)              => deleteDatPosting(getDb(), id))

  // -- Broker Mode: Carrier Offers --
  ipcMain.handle('carrierOffers:list',   (_e, loadId: number)          => listCarrierOffers(getDb(), loadId))
  ipcMain.handle('carrierOffers:get',    (_e, id: number)              => getCarrierOffer(getDb(), id))
  ipcMain.handle('carrierOffers:create', (_e, dto: unknown)            => createCarrierOffer(getDb(), dto as any))
  ipcMain.handle('carrierOffers:update',  (_e, id: number, dto: unknown) => updateCarrierOffer(getDb(), id, dto as any))
  ipcMain.handle('carrierOffers:delete',  (_e, id: number)              => deleteCarrierOffer(getDb(), id))
  ipcMain.handle('carrierOffers:accept',  (_e, id: number, dto?: unknown) => acceptCarrierOffer(getDb(), id, dto as any))

  // -- Broker Mode: Carrier Vetting --
  ipcMain.handle('brokerVetting:get',    (_e, loadId: number) => getVetting(getDb(), loadId))
  ipcMain.handle('brokerVetting:upsert', (_e, dto: unknown)   => upsertVetting(getDb(), dto as any))
  ipcMain.handle('brokerVetting:delete', (_e, loadId: number) => deleteVetting(getDb(), loadId))

  // -- Load Offer Tracking --
  ipcMain.handle('loadOffers:create',
    (_e, driverId: number, loadId: number) => createOffer(getDb(), driverId, loadId))
  ipcMain.handle('loadOffers:updateStatus',
    (_e, offerId: number, outcome: string, reason?: string) => {
      const db = getDb()
      if (outcome === 'accepted')    return markAccepted(db, offerId)
      if (outcome === 'declined')    return markDeclined(db, offerId, reason)
      if (outcome === 'no_response') return markNoResponse(db, offerId)
      throw new Error('Unknown outcome: ' + outcome)
    })
  ipcMain.handle('loadOffers:getDriverStats',
    (_e, driverId: number) => getDriverAcceptanceStats(getDb(), driverId))

  // -- Driver Performance Scorecards --
  ipcMain.handle('drivers:weeklyScorecard',
    (_e, driverId: number) => getDriverWeeklyScorecard(getDb(), driverId))
  ipcMain.handle('drivers:allWeeklyScorecards',
    () => getAllDriversWeeklyScorecards(getDb()))

  // -- Driver Fallout / Reliability --
  ipcMain.handle('drivers:falloutStats',
    (_e, driverId: number) => getDriverFalloutStats(getDb(), driverId))
  ipcMain.handle('drivers:allFalloutCounts',
    () => getAllDriverFalloutCounts(getDb()))

  // -- Invoices --
  ipcMain.handle('invoices:list',   (_e, status?: string) => listInvoices(getDb(), status))
  ipcMain.handle('invoices:get',    (_e, id: number) => getInvoice(getDb(), id))
  ipcMain.handle('invoices:create', (_e, dto: unknown) => createInvoice(getDb(), dto as any))
  ipcMain.handle('invoices:update', (_e, id: number, dto: unknown) => updateInvoice(getDb(), id, dto as any))
  ipcMain.handle('invoices:delete',   (_e, id: number) => deleteInvoice(getDb(), id))
  ipcMain.handle('invoices:autoFlag',  () => autoFlagOverdueInvoices(getDb()))
  ipcMain.handle('invoices:bulkUpdate', (_e, ids: number[], status: string, extra?: Record<string, string | null>) =>
    bulkUpdateInvoices(getDb(), ids, status, extra ?? {}))

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
  ipcMain.handle('dispatch:assignLoad', (_e, payload: { loadId: number; driverId: number }) => {
    const db     = getDb()
    const result = assignLoadToDriver(db, payload.loadId, payload.driverId)
    if (result.ok) {
      // Ensure a load_offer record exists (find-or-create), then mark it accepted.
      // Mirrors the pattern used in Loads.tsx and MorningDispatchBrief.
      const offer = createOffer(db, payload.driverId, payload.loadId)
      markAccepted(db, offer.id)
    }
    return result
  })

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

  // -- Load Attachments --
  ipcMain.handle('loadAttachments:list',   (_e, loadId: number) => listLoadAttachments(getDb(), loadId))
  ipcMain.handle('loadAttachments:create', (_e, dto: unknown) => createLoadAttachment(getDb(), dto as any))
  ipcMain.handle('loadAttachments:delete', (_e, id: number) => deleteLoadAttachment(getDb(), id))
  ipcMain.handle('loadAttachments:open',   (_e, absolutePath: string) => {
    if (typeof absolutePath !== 'string' || !existsSync(absolutePath)) return
    shell.openPath(absolutePath)
  })
  ipcMain.handle('loadAttachments:pick', async (_e, loadId: number) => {
    const result = await dialog.showOpenDialog({
      title: 'Attach File to Load',
      buttonLabel: 'Attach',
      properties: ['openFile'],
      filters: [
        { name: 'Documents', extensions: ['pdf','doc','docx','jpg','jpeg','png','tif','tiff','xls','xlsx','csv'] },
        { name: 'All Files', extensions: ['*'] },
      ],
    })
    if (result.canceled || result.filePaths.length === 0) return null
    const src = result.filePaths[0]
    const destDir = join(app.getPath('userData'), 'load-attachments', String(loadId))
    mkdirSync(destDir, { recursive: true })
    const ts = Date.now()
    const origName = basename(src)
    const safeName = `${ts}_${origName.replace(/[^a-zA-Z0-9._-]/g, '_')}`
    const dest = join(destDir, safeName)
    copyFileSync(src, dest)
    return { storedPath: dest, displayName: origName }
  })

  // -- Load Deductions --
  ipcMain.handle('loadDeductions:list',   (_e, loadId: number) => listLoadDeductions(getDb(), loadId))
  ipcMain.handle('loadDeductions:create', (_e, dto: unknown) => createLoadDeduction(getDb(), dto as any))
  ipcMain.handle('loadDeductions:delete', (_e, id: number) => deleteLoadDeduction(getDb(), id))

  // -- Dev Seed (non-packaged builds only) --
  ipcMain.handle('dev:seed',          () => { runSeedIfEmpty(getDb());      return { ok: true } })
  ipcMain.handle('dev:reseed',        () => { resetAndReseed(getDb());      return { ok: true } })
  ipcMain.handle('dev:seedMissing',   () => { seedMissingItems(getDb());    return { ok: true } })
  ipcMain.handle('dev:seedTasksOnly', () => { seedTasksAndDocsOnly(getDb()); return { ok: true } })
  ipcMain.handle('dev:clearSeedData', () => { clearNonTaskSeedData(getDb()); return { ok: true } })
  ipcMain.handle('dev:reseedDocs',    () => { reseedDocuments(getDb());      return { ok: true } })
  ipcMain.handle('dev:reseedTasks',   () => { reseedTasks(getDb());          return { ok: true } })
  ipcMain.handle('dev:addTestData',    () => addTestData(getDb()))
  ipcMain.handle('dev:removeTestData', () => removeTestData(getDb()))
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
