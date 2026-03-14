/**
 * OnTrack Dispatch Dashboard - Domain Models
 * Replaces domain.ts (camelCase/string IDs). Matches SQLite schema exactly.
 * DTOs: CreateXxxDto = INSERT fields; UpdateXxxDto = all optional PATCH fields
 */

export type UserRole        = "Admin" | "Dispatcher" | "Sales"
export type ThemePreference = "dark" | "light" | "system"

export type LeadStatus   = "New" | "Contacted" | "Interested" | "Signed" | "Rejected"
export type LeadPriority = "High" | "Medium" | "Low"

export type DriverStatus  = "Active" | "Inactive" | "On Load"
export type DriverDocType = "CDL" | "Insurance" | "BOL" | "POD" | "COI" | "Lease" | "W9" | "Other"

export type LoadStatus = "Searching" | "Booked" | "Picked Up" | "In Transit" | "Delivered" | "Invoiced" | "Paid"

export type BrokerFlag = "None" | "Preferred" | "Avoid" | "Slow Pay" | "Blacklisted"
export type InvoiceStatus = "Draft" | "Sent" | "Overdue" | "Paid"

export type TaskStatus   = "Pending" | "Done"
export type TaskPriority = "High" | "Medium" | "Low"
export type TaskCategory = "Marketing" | "Dispatch" | "Leads" | "Admin" | "Other"

export type NoteEntityType = "lead" | "lead_call" | "driver" | "load" | "broker" | "invoice"
export type AuditAction    = "create" | "update" | "delete"

export interface User {
  id: number
  name: string
  email: string
  role: UserRole
  theme_preference: ThemePreference
  active: 0 | 1
  last_login_at: string | null
  created_at: string
  updated_at: string
}
export type CreateUserDto = Omit<User, "id" | "created_at" | "updated_at" | "last_login_at">
export type UpdateUserDto = Partial<Omit<User, "id" | "created_at" | "updated_at">>

export interface Lead {
  id: number
  name: string
  company: string | null
  mc_number: string | null
  phone: string | null
  email: string | null
  city: string | null
  state: string | null
  trailer_type: string | null
  authority_date: string | null
  source: string | null
  status: LeadStatus
  priority: LeadPriority
  follow_up_date: string | null
  notes: string | null
  created_at: string
  updated_at: string
}
export type CreateLeadDto = Omit<Lead, "id" | "created_at" | "updated_at">
export type UpdateLeadDto = Partial<CreateLeadDto>
export interface Driver {
  id: number
  name: string
  company: string | null
  mc_number: string | null
  dot_number: string | null
  cdl_number: string | null
  cdl_expiry: string | null       // YYYY-MM-DD
  phone: string | null
  email: string | null
  truck_type: string | null
  trailer_type: string | null
  home_base: string | null
  preferred_lanes: string | null
  min_rpm: number | null
  dispatch_percent: number        // default 7.0
  factoring_company: string | null
  insurance_expiry: string | null // YYYY-MM-DD
  start_date: string | null
  status: DriverStatus
  notes: string | null
  created_at: string
  updated_at: string
}
export type CreateDriverDto = Omit<Driver, "id" | "created_at" | "updated_at">
export type UpdateDriverDto = Partial<CreateDriverDto>

export interface DriverDocument {
  id: number
  driver_id: number
  title: string
  doc_type: DriverDocType
  file_path: string | null
  expiry_date: string | null      // YYYY-MM-DD, null = no expiry
  notes: string | null
  created_at: string
}
export type CreateDriverDocumentDto = Omit<DriverDocument, "id" | "created_at">
export type UpdateDriverDocumentDto = Partial<Omit<DriverDocument, "id" | "driver_id" | "created_at">>

export interface Load {
  id: number
  load_id: string | null          // broker reference number
  driver_id: number | null
  broker_id: number | null
  origin_city: string | null
  origin_state: string | null
  dest_city: string | null
  dest_state: string | null
  pickup_date: string | null      // YYYY-MM-DD
  delivery_date: string | null    // YYYY-MM-DD
  miles: number | null
  rate: number | null             // total gross rate in dollars
  dispatch_pct: number | null
  commodity: string | null
  status: LoadStatus
  invoiced: 0 | 1
  notes: string | null
  created_at: string
  updated_at: string
}
export type CreateLoadDto = Omit<Load, "id" | "created_at" | "updated_at">
export type UpdateLoadDto = Partial<CreateLoadDto>

export interface Broker {
  id: number
  name: string
  mc_number: string | null
  phone: string | null
  email: string | null
  payment_terms: number           // net days
  credit_rating: string | null
  avg_days_pay: number | null
  flag: BrokerFlag
  notes: string | null
  created_at: string
  updated_at: string
}
export type CreateBrokerDto = Omit<Broker, "id" | "created_at" | "updated_at">
export type UpdateBrokerDto = Partial<CreateBrokerDto>

export interface Invoice {
  id: number
  invoice_number: string
  load_id: number | null          // FK -> loads.id
  driver_id: number | null
  week_ending: string | null      // YYYY-MM-DD
  driver_gross: number | null
  dispatch_pct: number | null
  dispatch_fee: number | null     // driver_gross * dispatch_pct / 100
  sent_date: string | null        // YYYY-MM-DD
  paid_date: string | null        // YYYY-MM-DD
  status: InvoiceStatus
  notes: string | null
  created_at: string
  updated_at: string
}
export type CreateInvoiceDto = Omit<Invoice, "id" | "created_at" | "updated_at">
export type UpdateInvoiceDto = Partial<CreateInvoiceDto>

export interface Task {
  id: number
  title: string
  category: TaskCategory | null
  priority: TaskPriority
  due_date: string | null         // Daily or YYYY-MM-DD
  time_of_day: string | null      // e.g. 9:00 AM (chronological sort)
  recurring: 0 | 1
  status: TaskStatus
  assigned_to: number | null      // FK -> users.id
  notes: string | null
  created_at: string
  updated_at: string
}
export type CreateTaskDto = Omit<Task, "id" | "created_at" | "updated_at">
export type UpdateTaskDto = Partial<CreateTaskDto>

export interface TaskCompletion {
  id: number
  task_id: number
  completed_date: string          // YYYY-MM-DD
  completed_by: number | null     // FK -> users.id
  created_at: string
}

export interface Note {
  id: number
  entity_type: NoteEntityType
  entity_id: number
  content: string
  user_id: number | null
  created_at: string
}
export type CreateNoteDto = Omit<Note, "id" | "created_at">

export interface AppSetting {
  id: number
  key: string
  value: string | null
  updated_at: string
}

export interface BackupRecord {
  id: number
  filename: string
  file_path: string
  size_bytes: number | null
  created_at: string
}

export interface AuditLogEntry {
  id: number
  user_id: number | null
  entity_type: string
  entity_id: number | null
  action: AuditAction
  old_values: string | null
  new_values: string | null
  created_at: string
}

// -- SOP / Markdown Documents --
export type DocCategory = 'SOP' | 'Policy' | 'Training' | 'Template' | 'Reference' | 'Other'

export interface SopDocument {
  id: number
  title: string
  category: DocCategory
  content: string | null
  file_path: string | null
  driver_id: number | null
  doc_type: string | null
  expiry_date: string | null
  created_at: string
  updated_at: string
}
export type CreateSopDocumentDto = Omit<SopDocument, 'id' | 'created_at' | 'updated_at'>
export type UpdateSopDocumentDto = Partial<CreateSopDocumentDto>

// -- Analytics --
export interface AnalyticsStats {
  leadConversion:    { total: number; signed: number; rate: number }
  leadsByStatus:     Record<string, number>
  driversSigned:     { thisMonth: number; total: number }
  avgRpm:            { value: number; count: number }
  revenueByDriver:   Array<{ driver_id: number; name: string; revenue: number; loads: number }>
  brokerReliability: Array<{ broker_id: number; name: string; loads: number; avgRate: number; flag: string }>
  laneProfitability: Array<{ origin_state: string; dest_state: string; loads: number; avgRpm: number; totalRevenue: number }>
  revenueByMonth:    Array<{ month: string; revenue: number; loads: number }>
}

// -- FMCSA Import --
export interface FmcsaImportResult {
  leadsFound:        number
  leadsAdded:        number
  duplicatesSkipped: number
  errors:            string[]
}

export interface FmcsaImportStatus {
  lastAttemptedAt:   string | null
  lastSuccessAt:     string | null
  source:            'manual' | 'scheduled' | null
  leadsFound:        number
  leadsAdded:        number
  duplicatesSkipped: number
  lastError:         string | null
}

// -- Dispatcher Board --
export interface BoardRow {
  driver_id:      number
  driver_name:    string
  driver_status:  DriverStatus
  driver_company: string | null
  truck_type:     string | null
  trailer_type:   string | null
  home_base:      string | null
  min_rpm:        number | null
  driver_notes:   string | null
  load_id_pk:     number | null
  load_ref:       string | null   // broker reference number (loads.load_id)
  load_status:    LoadStatus | null
  origin_city:    string | null
  origin_state:   string | null
  dest_city:      string | null
  dest_state:     string | null
  pickup_date:    string | null
  delivery_date:  string | null
  miles:          number | null
  rate:           number | null
  commodity:      string | null
  load_notes:     string | null
  broker_id:      number | null
  broker_name:    string | null
  broker_flag:    BrokerFlag | null
}

// -- Global Search --
export type SearchResultType = 'lead' | 'driver' | 'load' | 'broker' | 'invoice' | 'task' | 'document'
export interface SearchResult {
  type:     SearchResultType
  id:       number
  title:    string
  subtitle: string
  route:    string
}
