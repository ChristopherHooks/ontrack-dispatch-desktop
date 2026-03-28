import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('api', {

  // -- Settings --
  settings: {
    get:    (key: string) => ipcRenderer.invoke('settings:get', key),
    set:    (key: string, value: unknown) => ipcRenderer.invoke('settings:set', key, value),
    getAll: () => ipcRenderer.invoke('settings:getAll'),
  },

  // -- Dashboard --
  dashboard: {
    stats: () => ipcRenderer.invoke('dashboard:stats'),
  },

  // -- Operations Control Panel --
  operations: {
    data: () => ipcRenderer.invoke('operations:data'),
  },

  // -- Profit Radar --
  profitRadar: {
    data:    () => ipcRenderer.invoke('profitRadar:data'),
    summary: () => ipcRenderer.invoke('profitRadar:summary'),
  },

  // -- Generic DB query (dev/debug) --
  db: {
    query: (sql: string, params?: unknown[]) => ipcRenderer.invoke('db:query', sql, params),
  },

  // -- Leads --
  leads: {
    list:         (status?: string) => ipcRenderer.invoke('leads:list', status),
    get:          (id: number) => ipcRenderer.invoke('leads:get', id),
    create:       (dto: unknown) => ipcRenderer.invoke('leads:create', dto),
    update:       (id: number, dto: unknown) => ipcRenderer.invoke('leads:update', id, dto),
    delete:       (id: number) => ipcRenderer.invoke('leads:delete', id),
    importFmcsa:      () => ipcRenderer.invoke('leads:importFmcsa'),
    importStatus:     () => ipcRenderer.invoke('leads:importStatus'),
    importCsv:        () => ipcRenderer.invoke('leads:importCsv'),
    importPaste:      (text: string) => ipcRenderer.invoke('leads:importPaste', text),
    backfillLeadData: () => ipcRenderer.invoke('leads:backfillLeadData'),
  },

  // -- Drivers --
  drivers: {
    list:               (status?: string) => ipcRenderer.invoke('drivers:list', status),
    get:                (id: number) => ipcRenderer.invoke('drivers:get', id),
    create:             (dto: unknown) => ipcRenderer.invoke('drivers:create', dto),
    update:             (id: number, dto: unknown) => ipcRenderer.invoke('drivers:update', id, dto),
    delete:             (id: number) => ipcRenderer.invoke('drivers:delete', id),
    fetchAuthorityDate: (driverId: number, mcNumber: string) => ipcRenderer.invoke('drivers:fetchAuthorityDate', driverId, mcNumber),
    compliance:         ()                                    => ipcRenderer.invoke('drivers:compliance'),
  },

  // -- Driver Documents --
  driverDocs: {
    list:            (driverId: number) => ipcRenderer.invoke('driverDocs:list', driverId),
    get:             (id: number) => ipcRenderer.invoke('driverDocs:get', id),
    create:          (dto: unknown) => ipcRenderer.invoke('driverDocs:create', dto),
    update:          (id: number, dto: unknown) => ipcRenderer.invoke('driverDocs:update', id, dto),
    delete:          (id: number) => ipcRenderer.invoke('driverDocs:delete', id),
    pickFile:        (driverId: number) => ipcRenderer.invoke('driverDocs:pickFile', driverId),
    openAttachment:  (absolutePath: string) => ipcRenderer.invoke('driverDocs:openAttachment', absolutePath),
  },

  // -- Loads --
  loads: {
    list:            (status?: string) => ipcRenderer.invoke('loads:list', status),
    get:             (id: number) => ipcRenderer.invoke('loads:get', id),
    create:          (dto: unknown) => ipcRenderer.invoke('loads:create', dto),
    update:          (id: number, dto: unknown) => ipcRenderer.invoke('loads:update', id, dto),
    delete:          (id: number) => ipcRenderer.invoke('loads:delete', id),
    parseScreenshot: (imageBase64: string, mediaType: string, driverId: number, cpm: number) =>
      ipcRenderer.invoke('loads:parseScreenshot', imageBase64, mediaType, driverId, cpm),
    importXlsx: (driverId: number, cpm: number) =>
      ipcRenderer.invoke('loads:importXlsx', driverId, cpm),
    getLastBrowserImport: () =>
      ipcRenderer.invoke('loads:getLastBrowserImport'),
  },

  // -- Brokers --
  brokers: {
    list:   () => ipcRenderer.invoke('brokers:list'),
    get:    (id: number) => ipcRenderer.invoke('brokers:get', id),
    create: (dto: unknown) => ipcRenderer.invoke('brokers:create', dto),
    update: (id: number, dto: unknown) => ipcRenderer.invoke('brokers:update', id, dto),
    delete: (id: number) => ipcRenderer.invoke('brokers:delete', id),
  },

  // -- Invoices --
  invoices: {
    list:   (status?: string) => ipcRenderer.invoke('invoices:list', status),
    get:    (id: number) => ipcRenderer.invoke('invoices:get', id),
    create: (dto: unknown) => ipcRenderer.invoke('invoices:create', dto),
    update: (id: number, dto: unknown) => ipcRenderer.invoke('invoices:update', id, dto),
    delete: (id: number) => ipcRenderer.invoke('invoices:delete', id),
  },

  // -- Tasks --
  tasks: {
    list:           (category?: string, dueDate?: string) => ipcRenderer.invoke('tasks:list', category, dueDate),
    get:            (id: number) => ipcRenderer.invoke('tasks:get', id),
    create:         (dto: unknown) => ipcRenderer.invoke('tasks:create', dto),
    update:         (id: number, dto: unknown) => ipcRenderer.invoke('tasks:update', id, dto),
    delete:         (id: number) => ipcRenderer.invoke('tasks:delete', id),
    markComplete:   (taskId: number, date: string, userId?: number) => ipcRenderer.invoke('tasks:markComplete', taskId, date, userId),
    markIncomplete: (taskId: number, date: string) => ipcRenderer.invoke('tasks:markIncomplete', taskId, date),
    getCompletions: (taskId: number) => ipcRenderer.invoke('tasks:completions', taskId),
  },

  // -- Notes --
  notes: {
    list:   (entityType: string, entityId: number) => ipcRenderer.invoke('notes:list', entityType, entityId),
    create: (dto: unknown) => ipcRenderer.invoke('notes:create', dto),
    update: (id: number, content: string) => ipcRenderer.invoke('notes:update', id, content),
    delete: (id: number) => ipcRenderer.invoke('notes:delete', id),
  },

  // -- Users --
  users: {
    list:       () => ipcRenderer.invoke('users:list'),
    get:        (id: number) => ipcRenderer.invoke('users:get', id),
    getByEmail: (email: string) => ipcRenderer.invoke('users:getByEmail', email),
    create:     (dto: unknown) => ipcRenderer.invoke('users:create', dto),
    update:     (id: number, dto: unknown) => ipcRenderer.invoke('users:update', id, dto),
  },

  // -- Audit Log --
  audit: {
    list: (entityType?: string, entityId?: number) => ipcRenderer.invoke('audit:list', entityType, entityId),
  },

  // -- Backups --
  backups: {
    list:         () => ipcRenderer.invoke('backups:list'),
    create:       () => ipcRenderer.invoke('backups:create'),
    stageRestore: (filePath: string) => ipcRenderer.invoke('backups:stageRestore', filePath),
    pending:      () => ipcRenderer.invoke('backups:pending'),
  },

  // -- Tasks extended --
  tasksExtra: {
    completionsForDate: (date: string) => ipcRenderer.invoke('tasks:completionsForDate', date),
  },

  // -- Documents --
  documents: {
    list:   (category?: string) => ipcRenderer.invoke('documents:list', category),
    get:    (id: number) => ipcRenderer.invoke('documents:get', id),
    create: (dto: unknown) => ipcRenderer.invoke('documents:create', dto),
    update: (id: number, dto: unknown) => ipcRenderer.invoke('documents:update', id, dto),
    delete: (id: number) => ipcRenderer.invoke('documents:delete', id),
    search:  (query: string) => ipcRenderer.invoke('documents:search', query),
    popout:  (id: number)    => ipcRenderer.invoke('documents:popout', id),
  },

  // -- Analytics --
  analytics: {
    stats: () => ipcRenderer.invoke('analytics:stats'),
  },

  // -- Global Search --
  search: {
    global: (query: string) => ipcRenderer.invoke('search:global', query),
  },

  // -- Dispatcher Board --
  dispatcher: {
    board:          () => ipcRenderer.invoke('dispatcher:board'),
    availableLoads: () => ipcRenderer.invoke('dispatch:availableLoads'),
    assignLoad:     (payload: { loadId: number; driverId: number }) => ipcRenderer.invoke('dispatch:assignLoad', payload),
  },

  // -- Load Opportunity Scanner --
  scanner: {
    recommendLoads: (payload: { driverId?: number }) => ipcRenderer.invoke('scanner:recommendLoads', payload),
  },

  // -- Active Load Timeline --
  timeline: {
    activeLoads:     ()                                                                           => ipcRenderer.invoke('timeline:activeLoads'),
    upcomingCalls:   (n?: number)                                                                 => ipcRenderer.invoke('timeline:upcomingCalls', n),
    events:          (loadId: number)                                                             => ipcRenderer.invoke('timeline:events', loadId),
    addEvent:        (loadId: number, eventType: string, label: string, scheduledAt: string | null, notes: string | null) => ipcRenderer.invoke('timeline:addEvent', loadId, eventType, label, scheduledAt, notes),
    completeEvent:   (id: number, notes?: string)                                                 => ipcRenderer.invoke('timeline:completeEvent', id, notes),
    deleteEvent:     (id: number)                                                                 => ipcRenderer.invoke('timeline:deleteEvent', id),
    statusChange:    (loadId: number, newStatus: string, notes: string | null)                   => ipcRenderer.invoke('timeline:statusChange', loadId, newStatus, notes),
    initLoad:        (loadId: number)                                                             => ipcRenderer.invoke('timeline:initLoad', loadId),
    generateMessage: (payload: { driverName: string; route: string; messageType: string })       => ipcRenderer.invoke('timeline:generateMessage', payload),
  },

  // -- Broker Intelligence + Lane Memory --
  intel: {
    allBrokers: ()                   => ipcRenderer.invoke('intel:allBrokers'),
    allLanes:   ()                   => ipcRenderer.invoke('intel:allLanes'),
    driverFit:  (driverId: number)   => ipcRenderer.invoke('intel:driverFit', driverId),
  },

  // -- Load Match Workspace --
  loadMatch: {
    nego: (payload: unknown) => ipcRenderer.invoke('loadMatch:nego', payload),
  },

  // -- Marketing --
  marketing: {
    groups: {
      list:         () => ipcRenderer.invoke('marketing:groups:list'),
      create:       (name: string, url: string | null, platform: string, notes: string | null, truckTypeTags: string[], regionTags: string[]) =>
                      ipcRenderer.invoke('marketing:groups:create', name, url, platform, notes, truckTypeTags, regionTags),
      update:       (id: number, updates: object) => ipcRenderer.invoke('marketing:groups:update', id, updates),
      markPosted:   (id: number, date: string) => ipcRenderer.invoke('marketing:groups:markPosted', id, date),
      delete:       (id: number) => ipcRenderer.invoke('marketing:groups:delete', id),
      // Facebook Groups workflow
      todaysGroups:  (n?: number) => ipcRenderer.invoke('marketing:groups:todaysGroups', n),
      catAnalysis:   () => ipcRenderer.invoke('marketing:groups:catAnalysis'),
      seedGroups:    () => ipcRenderer.invoke('marketing:groups:seedGroups'),
      markReviewed:  (id: number, date: string) => ipcRenderer.invoke('marketing:groups:markReviewed', id, date),
      snoozeGroup:   (id: number, until: string) => ipcRenderer.invoke('marketing:groups:snoozeGroup', id, until),
      importHtml:    () => ipcRenderer.invoke('marketing:groups:importHtml'),
    },
    post: {
      list:        (limit?: number) => ipcRenderer.invoke('marketing:post:list', limit),
      create:      (templateId: string, category: string, truckType: string | null, usedDate: string, groupsPostedTo: string[], posted: boolean, repliesCount: number, leadsGenerated: number, notes: string | null) =>
                     ipcRenderer.invoke('marketing:post:create', templateId, category, truckType, usedDate, groupsPostedTo, posted, repliesCount, leadsGenerated, notes),
      update:      (id: number, updates: object) => ipcRenderer.invoke('marketing:post:update', id, updates),
      delete:      (id: number) => ipcRenderer.invoke('marketing:post:delete', id),
      recentIds:   (days?: number) => ipcRenderer.invoke('marketing:post:recentIds', days),
      usageCounts: () => ipcRenderer.invoke('marketing:post:usageCounts'),
    },
  },

  // -- Browser import (Claude in Chrome → OnTrack) --
  // Claude reads a DAT/Truckstop tab, scores the loads, and POSTs to
  // http://localhost:3001/api/loads/browser-import. The main process
  // receives it and forwards to the renderer via this event bridge.
  browserImport: {
    onResult: (cb: (data: unknown) => void) =>
      ipcRenderer.on('loads:browser-import', (_e, data) => cb(data)),
    offResult: (cb: (data: unknown) => void) =>
      ipcRenderer.removeListener('loads:browser-import', (_e: unknown, data: unknown) => cb(data)),
  },

  // -- Shell utilities --
  shell: {
    openExternal: (url: string) => ipcRenderer.invoke('shell:openExternal', url),
    openFile:     (relativePath: string) => ipcRenderer.invoke('shell:openFile', relativePath),
  },

  // -- Dev Utilities (non-packaged builds only) --
  dev: {
    seed:          () => ipcRenderer.invoke('dev:seed'),
    reseed:        () => ipcRenderer.invoke('dev:reseed'),
    seedMissing:   () => ipcRenderer.invoke('dev:seedMissing'),
    seedTasksOnly: () => ipcRenderer.invoke('dev:seedTasksOnly'),
    clearSeedData: () => ipcRenderer.invoke('dev:clearSeedData'),
    reseedDocs:    () => ipcRenderer.invoke('dev:reseedDocs'),
  },

})
