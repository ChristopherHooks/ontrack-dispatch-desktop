import type {
  Lead, Driver, DriverDocument, Load, Broker, Invoice,
  Task, TaskCompletion, Note, User, AuditLogEntry,
  SopDocument, AnalyticsStats, SearchResult, CsvImportResult, FmcsaImportResult, FmcsaImportStatus, BoardRow,
  AvailableLoad, AssignLoadResult, ScannerRecommendation,
  ClaudeResponse,
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
  TimelineEvent, ActiveLoadRow, CheckCallRow,
  BrokerIntelRow, LaneIntelRow, DriverLaneFitRow,
  DriverComplianceRow,
} from './models'

interface CarrierBrokerApprovalRow {
  id:           number
  driver_id:    number
  broker_id:    number
  broker_name:  string
  status:       'Submitted' | 'Approved' | 'Denied'
  notes:        string | null
  submitted_at: string | null
  approved_at:  string | null
  created_at:   string
}

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
      operations: {
        data: () => Promise<unknown>
      }
      reports: {
        data: () => Promise<unknown>
      }
      profitRadar: {
        data:    () => Promise<unknown>
        summary: () => Promise<string | null>
      }
      loadMatch: {
        nego: (payload: {
          rate:          number | null
          miles:         number | null
          rpm:           number | null
          deadheadMiles: number
          origin:        string
          dest:          string
          brokerName:    string | null
          driverName:    string
        }) => Promise<string | null>
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
        importFmcsa:      () => Promise<FmcsaImportResult>
        importStatus:     () => Promise<FmcsaImportStatus>
        importCsv:        () => Promise<CsvImportResult | null>
        importPaste:      (text: string) => Promise<CsvImportResult>
        backfillLeadData: () => Promise<{ reprioritized: number; enriched: number; errors: string[] }>
        generateFollowUp: (payload: {
          name: string; company: string | null; status: string; trailerType: string | null;
          lastContactDate: string | null; contactAttempts: number; outreachOutcome: string | null
        }) => Promise<string | null>
      }
      drivers: {
        list:               (status?: string) => Promise<Driver[]>
        get:                (id: number) => Promise<Driver | undefined>
        create:             (dto: CreateDriverDto) => Promise<Driver>
        update:             (id: number, dto: UpdateDriverDto) => Promise<Driver | undefined>
        delete:             (id: number) => Promise<boolean>
        fetchAuthorityDate: (driverId: number, mcNumber: string) => Promise<Driver | null>
        compliance: () => Promise<DriverComplianceRow[]>
      }
      driverDocs: {
        list:           (driverId: number) => Promise<DriverDocument[]>
        get:            (id: number) => Promise<DriverDocument | undefined>
        create:         (dto: CreateDriverDocumentDto) => Promise<DriverDocument>
        update:         (id: number, dto: UpdateDriverDocumentDto) => Promise<DriverDocument | undefined>
        delete:         (id: number) => Promise<boolean>
        pickFile:       (driverId: number) => Promise<{ storedPath: string; displayName: string } | null>
        openAttachment: (absolutePath: string) => Promise<void>
      }
      loadDeductions: {
        list:   (loadId: number) => Promise<{ id: number; load_id: number; label: string; amount: number; created_at: string }[]>
        create: (dto: { load_id: number; label: string; amount: number }) => Promise<{ id: number; load_id: number; label: string; amount: number; created_at: string }>
        delete: (id: number) => Promise<boolean>
      }
      loadAttachments: {
        list:   (loadId: number) => Promise<{ id: number; load_id: number; title: string; file_path: string; file_name: string; created_at: string }[]>
        create: (dto: { load_id: number; title: string; file_path: string; file_name: string }) => Promise<{ id: number; load_id: number; title: string; file_path: string; file_name: string; created_at: string }>
        delete: (id: number) => Promise<boolean>
        open:   (absolutePath: string) => Promise<void>
        pick:   (loadId: number) => Promise<{ storedPath: string; displayName: string } | null>
      }
      loads: {
        list:            (status?: string) => Promise<Load[]>
        get:             (id: number) => Promise<Load | undefined>
        create:          (dto: CreateLoadDto) => Promise<Load>
        update:          (id: number, dto: UpdateLoadDto) => Promise<Load | undefined>
        delete:          (id: number) => Promise<boolean>
        parseScreenshot: (imageBase64: string, mediaType: string, driverId: number, cpm: number) => Promise<ParseScreenshotResult>
        importXlsx:      (driverId: number, cpm: number) => Promise<ParseScreenshotResult>
        getLastBrowserImport: () => Promise<{ seq: number; payload: ParseScreenshotResult | null }>
      }
      brokers: {
        list:   () => Promise<Broker[]>
        get:    (id: number) => Promise<Broker | undefined>
        create: (dto: CreateBrokerDto) => Promise<Broker>
        update: (id: number, dto: UpdateBrokerDto) => Promise<Broker | undefined>
        delete: (id: number) => Promise<boolean>
      }
      brokerCallLog: {
        list:   (brokerId: number) => Promise<{ id: number; broker_id: number; note: string; created_at: string }[]>
        create: (dto: { broker_id: number; note: string }) => Promise<{ id: number; broker_id: number; note: string; created_at: string }>
        delete: (id: number) => Promise<boolean>
      }
      carrierApprovals: {
        list:   (driverId: number) => Promise<CarrierBrokerApprovalRow[]>
        upsert: (dto: { driver_id: number; broker_id: number; broker_name: string; status: 'Submitted' | 'Approved' | 'Denied'; notes?: string | null; submitted_at?: string | null; approved_at?: string | null }) => Promise<CarrierBrokerApprovalRow>
        delete: (id: number) => Promise<boolean>
      }
      invoices: {
        list:     (status?: string) => Promise<Invoice[]>
        get:      (id: number) => Promise<Invoice | undefined>
        create:   (dto: CreateInvoiceDto) => Promise<Invoice>
        update:   (id: number, dto: UpdateInvoiceDto) => Promise<Invoice | undefined>
        delete:   (id: number) => Promise<boolean>
        autoFlag:   () => Promise<number>
        bulkUpdate: (ids: number[], status: string, extra?: Record<string, string | null>) => Promise<number>
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
        update: (id: number, content: string) => Promise<Note | undefined>
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
        popout: (id: number)    => Promise<void>
      }
      analytics: {
        stats: () => Promise<AnalyticsStats>
      }
      search: {
        global: (query: string) => Promise<SearchResult[]>
      }
      dispatcher: {
        board:          () => Promise<BoardRow[]>
        availableLoads: () => Promise<AvailableLoad[]>
        assignLoad:     (payload: { loadId: number; driverId: number }) => Promise<AssignLoadResult>
      }
      scanner: {
        recommendLoads: (payload: { driverId?: number }) => Promise<ScannerRecommendation[]>
      }
      intel: {
        allBrokers: ()                 => Promise<BrokerIntelRow[]>
        allLanes:   ()                 => Promise<LaneIntelRow[]>
        driverFit:  (driverId: number) => Promise<DriverLaneFitRow[]>
      }
      timeline: {
        activeLoads:     ()                                                                         => Promise<ActiveLoadRow[]>
        upcomingCalls:   (n?: number)                                                               => Promise<CheckCallRow[]>
        events:          (loadId: number)                                                           => Promise<TimelineEvent[]>
        addEvent:        (loadId: number, eventType: string, label: string, scheduledAt: string | null, notes: string | null) => Promise<TimelineEvent>
        completeEvent:   (id: number, notes?: string)                                               => Promise<TimelineEvent | undefined>
        deleteEvent:     (id: number)                                                               => Promise<boolean>
        statusChange:    (loadId: number, newStatus: string, notes: string | null)                 => Promise<void>
        initLoad:        (loadId: number)                                                           => Promise<void>
        generateMessage: (payload: { driverName: string; route: string; messageType: string })     => Promise<ClaudeResponse>
      }
      marketing: {
        groups: {
          list:         () => Promise<unknown[]>
          create:       (name: string, url: string | null, platform: string, notes: string | null, truckTypeTags: string[], regionTags: string[]) => Promise<unknown>
          update:       (id: number, updates: object) => Promise<unknown>
          markPosted:   (id: number, date: string) => Promise<unknown>
          delete:       (id: number) => Promise<boolean>
          todaysGroups: (n?: number) => Promise<unknown[]>
          catAnalysis:  () => Promise<unknown>
          seedGroups:   () => Promise<{ ok: boolean }>
          markReviewed: (id: number, date: string) => Promise<unknown>
          snoozeGroup:  (id: number, until: string) => Promise<unknown>
          importHtml:   () => Promise<{ added: number; found: number; canceled?: boolean }>
        }
      }
      shell: {
        openExternal: (url: string) => Promise<void>
        openFile:     (relativePath: string) => Promise<void>
      }

      dev: {
        seed:          () => Promise<{ ok: boolean }>
        reseed:        () => Promise<{ ok: boolean }>
        seedMissing:   () => Promise<{ ok: boolean }>
        seedTasksOnly: () => Promise<{ ok: boolean }>
        clearSeedData: () => Promise<{ ok: boolean }>
        reseedDocs:    () => Promise<{ ok: boolean }>
        reseedTasks:   () => Promise<{ ok: boolean }>
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

export interface ScoredLoad {
  // Raw data
  pickup_date:  string | null
  rate:         number | null
  rpm:          number | null
  origin_dh:    number | null
  origin_city:  string | null
  origin_state: string | null
  dest_city:    string | null
  dest_state:   string | null
  miles:        number | null
  length_ft:    number | null
  weight:       number | null
  equip:        string | null
  mode:         string | null
  company:      string | null
  d2p:          number | null
  // Calculated financials
  loaded_rpm:         number | null
  all_in_miles:       number | null
  all_in_rpm:         number | null
  est_cost:           number | null
  est_margin:         number | null
  negotiation_target: number | null
  // Ranking
  score:           number
  rank:            number
  reasons:         string[]
  skip:            boolean
  skip_reason:     string | null
  first_call_rank: number | null
}

export interface ParseScreenshotResult {
  loads:       ScoredLoad[]
  driver_name: string
  raw_count:   number
  error?:      string
}

export {}
