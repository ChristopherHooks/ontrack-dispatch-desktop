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
    importFmcsa:  () => ipcRenderer.invoke('leads:importFmcsa'),
  },

  // -- Drivers --
  drivers: {
    list:   (status?: string) => ipcRenderer.invoke('drivers:list', status),
    get:    (id: number) => ipcRenderer.invoke('drivers:get', id),
    create: (dto: unknown) => ipcRenderer.invoke('drivers:create', dto),
    update: (id: number, dto: unknown) => ipcRenderer.invoke('drivers:update', id, dto),
    delete: (id: number) => ipcRenderer.invoke('drivers:delete', id),
  },

  // -- Driver Documents --
  driverDocs: {
    list:   (driverId: number) => ipcRenderer.invoke('driverDocs:list', driverId),
    get:    (id: number) => ipcRenderer.invoke('driverDocs:get', id),
    create: (dto: unknown) => ipcRenderer.invoke('driverDocs:create', dto),
    update: (id: number, dto: unknown) => ipcRenderer.invoke('driverDocs:update', id, dto),
    delete: (id: number) => ipcRenderer.invoke('driverDocs:delete', id),
  },

  // -- Loads --
  loads: {
    list:   (status?: string) => ipcRenderer.invoke('loads:list', status),
    get:    (id: number) => ipcRenderer.invoke('loads:get', id),
    create: (dto: unknown) => ipcRenderer.invoke('loads:create', dto),
    update: (id: number, dto: unknown) => ipcRenderer.invoke('loads:update', id, dto),
    delete: (id: number) => ipcRenderer.invoke('loads:delete', id),
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
    search: (query: string) => ipcRenderer.invoke('documents:search', query),
  },

  // -- Analytics --
  analytics: {
    stats: () => ipcRenderer.invoke('analytics:stats'),
  },

  // -- Global Search --
  search: {
    global: (query: string) => ipcRenderer.invoke('search:global', query),
  },

})
