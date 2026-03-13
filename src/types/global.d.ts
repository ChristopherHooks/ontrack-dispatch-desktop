// Type declarations for the contextBridge API exposed from preload
interface Window {
  api: {
    settings: {
      get: (key: string) => Promise<unknown>
      set: (key: string, value: unknown) => Promise<void>
      getAll: () => Promise<Record<string, unknown>>
    }
    dashboard: {
      stats: () => Promise<DashboardStats>
    }
    db: {
      query: (sql: string, params?: unknown[]) => Promise<{ data: unknown[] | null; error: string | null }>
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

interface Task {
  id: number
  title: string
  category: string | null
  priority: 'High' | 'Medium' | 'Low'
  due_date: string | null
  time_of_day: string | null
  recurring: 0 | 1
  status: 'Pending' | 'Done'
  notes: string | null
}
