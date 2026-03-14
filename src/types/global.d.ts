import type {
  Lead, Driver, DriverDocument, Load, Broker, Invoice,
  Task, TaskCompletion, Note, User, AuditLogEntry,
  SopDocument, AnalyticsStats, SearchResult, FmcsaImportResult, FmcsaImportStatus, BoardRow,
  CreateLeadDto, UpdateLeadDto,
  CreateDriverDto, UpdateDriverDto,
  CreateDriverDocumentDto, UpdateDriverDocumentDto,
  CreateLoadDto, UpdateLoadDto,
  CreateBrokerDto, UpdateBrokerDto,
  CreateInvoiceDto, UpdateInvoiceDto,
  CreateTaskDto, UpdateTaskDto,
  CreateNoteDto,
  CreateUserDto, UpdateUserDto,
  CreateSopDocumentDto, UpdateSopDocumentDto,
} from './models'

declare global {

  interface Window {
    api: {
      settings: {
        get:    (key: string) => Promise<unknown>
        set:    (key: string, value: unknown) => Promise<void>
        getAll: () => Promise<Record<string, unknown>>
      }
      dashboard: {
        stats: () => Promise<DashboardStats>
      }
      db: {
        query: (sql: string, params?: unknown[]) => Promise<{ data: unknown[] | null; error: string | null }>
      }
      leads: {
        list:        (status?: string) => Promise<Lead[]>
        get:         (id: number) => Promise<Lead | undefined>
        create:      (dto: CreateLeadDto) => Promise<Lead>
        update:      (id: number, dto: UpdateLeadDto) => Promise<Lead | undefined>
        delete:      (id: number) => Promise<boolean>
        importFmcsa:  () => Promise<FmcsaImportResult>
        importStatus: () => Promise<FmcsaImportStatus>
      }
      drivers: {
        list:   (status?: string) => Promise<Driver[]>
        get:    (id: number) => Promise<Driver | undefined>
        create: (dto: CreateDriverDto) => Promise<Driver>
        update: (id: number, dto: UpdateDriverDto) => Promise<Driver | undefined>
        delete: (id: number) => Promise<boolean>
      }
      driverDocs: {
        list:   (driverId: number) => Promise<DriverDocument[]>
        get:    (id: number) => Promise<DriverDocument | undefined>
        create: (dto: CreateDriverDocumentDto) => Promise<DriverDocument>
        update: (id: number, dto: UpdateDriverDocumentDto) => Promise<DriverDocument | undefined>
        delete: (id: number) => Promise<boolean>
      }
      loads: {
        list:   (status?: string) => Promise<Load[]>
        get:    (id: number) => Promise<Load | undefined>
        create: (dto: CreateLoadDto) => Promise<Load>
        update: (id: number, dto: UpdateLoadDto) => Promise<Load | undefined>
        delete: (id: number) => Promise<boolean>
      }
      brokers: {
        list:   () => Promise<Broker[]>
        get:    (id: number) => Promise<Broker | undefined>
        create: (dto: CreateBrokerDto) => Promise<Broker>
        update: (id: number, dto: UpdateBrokerDto) => Promise<Broker | undefined>
        delete: (id: number) => Promise<boolean>
      }
      invoices: {
        list:   (status?: string) => Promise<Invoice[]>
        get:    (id: number) => Promise<Invoice | undefined>
        create: (dto: CreateInvoiceDto) => Promise<Invoice>
        update: (id: number, dto: UpdateInvoiceDto) => Promise<Invoice | undefined>
      }
      tasks: {
        list:           (category?: string, dueDate?: string) => Promise<Task[]>
        get:            (id: number) => Promise<Task | undefined>
        create:         (dto: CreateTaskDto) => Promise<Task>
        update:         (id: number, dto: UpdateTaskDto) => Promise<Task | undefined>
        delete:         (id: number) => Promise<boolean>
        markComplete:   (taskId: number, date: string, userId?: number) => Promise<void>
        markIncomplete: (taskId: number, date: string) => Promise<void>
        getCompletions: (taskId: number) => Promise<TaskCompletion[]>
      }
      notes: {
        list:   (entityType: string, entityId: number) => Promise<Note[]>
        create: (dto: CreateNoteDto) => Promise<Note>
        delete: (id: number) => Promise<boolean>
      }
      users: {
        list:       () => Promise<User[]>
        get:        (id: number) => Promise<User | undefined>
        getByEmail: (email: string) => Promise<User | undefined>
        create:     (dto: CreateUserDto) => Promise<User>
        update:     (id: number, dto: UpdateUserDto) => Promise<User | undefined>
      }
      audit: {
        list: (entityType?: string, entityId?: number) => Promise<AuditLogEntry[]>
      }
      backups: {
        list:         () => Promise<BackupEntry[]>
        create:       () => Promise<BackupEntry | null>
        stageRestore: (filePath: string) => Promise<boolean>
        pending:      () => Promise<string | null>
      }
      tasksExtra: {
        completionsForDate: (date: string) => Promise<TaskCompletion[]>
      }
      documents: {
        list:   (category?: string) => Promise<SopDocument[]>
        get:    (id: number) => Promise<SopDocument | undefined>
        create: (dto: CreateSopDocumentDto) => Promise<SopDocument>
        update: (id: number, dto: UpdateSopDocumentDto) => Promise<SopDocument | undefined>
        delete: (id: number) => Promise<boolean>
        search: (query: string) => Promise<SopDocument[]>
      }
      analytics: {
        stats: () => Promise<AnalyticsStats>
      }
      search: {
        global: (query: string) => Promise<SearchResult[]>
      }
      dispatcher: {
        board: () => Promise<BoardRow[]>
      }
      dev: {
        seed:   () => Promise<{ ok: boolean }>
        reseed: () => Promise<{ ok: boolean }>
      }
    }
  }

  interface DashboardStats {
    driversNeedingLoads: { c: number }
    loadsInTransit:      { c: number }
    leadsFollowUp:       { c: number }
    outstandingInvoices: { c: number }
    todayTasks:          Task[]
  }

}

export type { BackupEntry }
export {}
