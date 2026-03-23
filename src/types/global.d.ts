import type {
  Lead, Driver, DriverDocument, Load, Broker, Invoice,
  Task, TaskCompletion, Note, User, AuditLogEntry,
  SopDocument, AnalyticsStats, SearchResult, CsvImportResult, FmcsaImportResult, FmcsaImportStatus, BoardRow,
  AvailableLoad, AssignLoadResult, ScannerRecommendation,
  ClaudeResponse,
  FbConversation, FbConvStage, CreateFbConversationDto, UpdateFbConversationDto,
  FbPost, FbPostStatus, CreateFbPostDto, UpdateFbPostDto,
  FbQueuePost, FbQueueStatus, FbContentCategory, CreateFbQueuePostDto, UpdateFbQueuePostDto,
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
      operations: {
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
      }
      drivers: {
        list:               (status?: string) => Promise<Driver[]>
        get:                (id: number) => Promise<Driver | undefined>
        create:             (dto: CreateDriverDto) => Promise<Driver>
        update:             (id: number, dto: UpdateDriverDto) => Promise<Driver | undefined>
        delete:             (id: number) => Promise<boolean>
        fetchAuthorityDate: (driverId: number, mcNumber: string) => Promise<Driver | null>
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
      loads: {
        list:            (status?: string) => Promise<Load[]>
        get:             (id: number) => Promise<Load | undefined>
        create:          (dto: CreateLoadDto) => Promise<Load>
        update:          (id: number, dto: UpdateLoadDto) => Promise<Load | undefined>
        delete:          (id: number) => Promise<boolean>
        parseScreenshot: (imageBase64: string, mediaType: string, driverId: number, cpm: number) => Promise<ParseScreenshotResult>
        importXlsx:      (driverId: number, cpm: number) => Promise<ParseScreenshotResult>
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
      fbConv: {
        list:             (stage?: string)                     => Promise<FbConversation[]>
        get:              (id: number)                         => Promise<FbConversation | undefined>
        create:           (dto: CreateFbConversationDto)       => Promise<FbConversation>
        update:           (id: number, dto: UpdateFbConversationDto) => Promise<FbConversation | undefined>
        delete:           (id: number)                         => Promise<boolean>
        exists:           (name: string, phone: string | null) => Promise<boolean>
        generateReply:    (payload: { name: string; stage: string; lastMessage: string | null; trailer: string | null; location: string | null }) => Promise<ClaudeResponse>
        generateFollowUp: (payload: { name: string; stage: string; lastMessageAt: string | null }) => Promise<ClaudeResponse>
        suggestQuestion:  (payload: { name: string; stage: string; lastMessage: string | null; trailer: string | null; location: string | null }) => Promise<ClaudeResponse>
        handoffSummary:   (payload: { name: string; phone: string | null; trailer: string | null; location: string | null; stage: string; notes: string | null }) => Promise<ClaudeResponse>
      }
      fbHunter: {
        list:         (status?: FbPostStatus)                    => Promise<FbPost[]>
        create:       (dto: CreateFbPostDto)                     => Promise<FbPost>
        update:       (id: number, dto: UpdateFbPostDto)         => Promise<FbPost | undefined>
        delete:       (id: number)                               => Promise<boolean>
        exists:       (rawText: string)                          => Promise<boolean>
        classify:     (payload: { rawText: string })             => Promise<ClaudeResponse>
        draftComment: (payload: { rawText: string; intent: string }) => Promise<ClaudeResponse>
        draftDm:      (payload: { intent: string; extractedInfo: string }) => Promise<ClaudeResponse>
      }
      fbContent: {
        list:             (status?: FbQueueStatus)               => Promise<FbQueuePost[]>
        create:           (dto: CreateFbQueuePostDto)            => Promise<FbQueuePost>
        update:           (id: number, dto: UpdateFbQueuePostDto) => Promise<FbQueuePost | undefined>
        delete:           (id: number)                           => Promise<boolean>
        suggestCategory:  ()                                     => Promise<FbContentCategory>
        recentCategories: (days?: number)                        => Promise<string[]>
        generatePost:     (payload: { category: string; recentCategories: string[] }) => Promise<ClaudeResponse>
        generateVariation:(payload: { content: string })         => Promise<ClaudeResponse>
        suggestReplies:   (payload: { content: string })         => Promise<ClaudeResponse>
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
