/**
 * OnTrack Dispatch Dashboard - Domain Models
 * Replaces domain.ts (camelCase/string IDs). Matches SQLite schema exactly.
 * DTOs: CreateXxxDto = INSERT fields; UpdateXxxDto = all optional PATCH fields
 */

export type UserRole        = "Admin" | "Dispatcher" | "Sales"
export type ThemePreference = "dark" | "light" | "system"

export type LeadStatus   =
  | "New"
  | "Attempted"
  | "Voicemail Left"
  | "Contacted"
  | "Interested"
  | "Call Back Later"
  | "Not Interested"
  | "Bad Fit"
  | "Converted"
  | "Signed"        // legacy — kept for existing records
  | "Rejected"      // legacy — kept for existing records
  | "Inactive MC"   // legacy — kept for existing records
export type LeadPriority = "High" | "Medium" | "Low"

export type DriverStatus  = "Active" | "Inactive" | "On Load"
export type DriverDocType = "CDL" | "Insurance" | "BOL" | "POD" | "COI" | "Lease" | "W9" | "Other"

export type LoadStatus = "Searching" | "Booked" | "Picked Up" | "In Transit" | "Delivered" | "Invoiced" | "Paid" | "Carrier Selected"

export type BrokerFlag = "None" | "Preferred" | "Avoid" | "Slow Pay" | "Blacklisted"
export type InvoiceStatus = "Draft" | "Sent" | "Overdue" | "Paid"

export type TaskStatus   = "Pending" | "Done"
export type TaskPriority = "High" | "Medium" | "Low"
export type TaskCategory = "Marketing" | "Dispatch" | "Leads" | "Admin" | "Other"

export type NoteEntityType = "lead" | "lead_call" | "driver" | "load" | "broker" | "invoice" | "driver_prospect"
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
  dot_number: string | null   // FMCSA USDOT number (set on FMCSA-imported leads)
  phone: string | null
  email: string | null
  city: string | null
  state: string | null
  trailer_type: string | null
  trailer_length: string | null // e.g. "48'", "53'", "36' Gooseneck"
  authority_date: string | null
  fleet_size: number | null     // Power Units from SAFER (FMCSA-imported leads only)
  source: string | null
  status: LeadStatus
  priority: LeadPriority
  follow_up_date: string | null
  follow_up_time: string | null  // HH:MM — triggers OS reminder at that time on follow_up_date (migration 021)
  notes: string | null
  // Outreach tracking (migration 019)
  last_contact_date:     string | null  // YYYY-MM-DD of last outreach
  contact_attempt_count: number         // total times contacted/attempted
  contact_method:        string | null  // last method: Call, SMS, Email, DM
  outreach_outcome:      string | null  // last outcome summary
  follow_up_notes:       string | null  // quick outreach context note
  created_at: string
  updated_at: string
}
// dot_number is set automatically during FMCSA import; not part of the manual-create form
// fleet_size is editable so dispatchers can fill it in when SAFER doesn't have the data
export type CreateLeadDto = Omit<Lead, "id" | "created_at" | "updated_at" | "dot_number">
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
  trailer_length: string | null  // e.g. "48'", "53'", "36' Gooseneck"
  authority_date: string | null  // YYYY-MM-DD — date MC authority was granted (migration 023)
  home_base: string | null
  current_location: string | null  // temporary position; cleared on load assignment
  preferred_lanes: string | null
  cpm: number | null              // cost-per-mile; used as default in Find Loads
  min_rpm: number | null
  dispatch_percent: number        // default 7.0
  factoring_company: string | null
  insurance_expiry: string | null      // YYYY-MM-DD
  medical_card_expiry: string | null   // YYYY-MM-DD — DOT physical, renews every 24 months
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
  deadhead_miles: number | null   // empty miles to pickup (migration 029)
  rate: number | null             // total gross rate in dollars
  fuel_surcharge: number | null   // FSC line item (migration 029)
  dispatch_pct: number | null
  trailer_type: string | null
  commodity: string | null
  load_mode: 'dispatch' | 'broker'   // added migration 040; default 'dispatch'
  status: LoadStatus
  invoiced: 0 | 1
  notes: string | null
  created_at: string
  updated_at: string
  // Computed by listLoads only — absent on individual get/create/update responses
  has_accepted_offer?: 0 | 1
  has_vetting?: 0 | 1
}
export type CreateLoadDto = Omit<Load, "id" | "created_at" | "updated_at" | "has_accepted_offer" | "has_vetting">
export type UpdateLoadDto = Partial<CreateLoadDto>

export type AccessorialType = 'Detention' | 'Lumper' | 'FSC' | 'Layover' | 'TONU' | 'Other'

export interface LoadAccessorial {
  id:         number
  load_id:    number
  type:       AccessorialType
  amount:     number
  notes:      string | null
  created_at: string
}
export type CreateLoadAccessorialDto = Omit<LoadAccessorial, 'id' | 'created_at'>

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
  new_authority: number           // 0 = No, 1 = Yes, 2 = Unknown (migration 023)
  min_authority_days: number | null // minimum MC age in days required (30/60/90/180 or null = any)
  credit_limit: number | null     // max outstanding invoice balance in dollars (migration 034)
  contact_type: 'broker' | 'shipper'  // added migration 041; default 'broker'
  created_at: string
  updated_at: string
}
export type CreateBrokerDto = Omit<Broker, "id" | "created_at" | "updated_at">
export type UpdateBrokerDto = Partial<CreateBrokerDto>

export interface Invoice {
  id: number
  invoice_number: string
  load_id: number | null          // FK -> loads.id
  broker_id: number | null
  driver_id: number | null
  week_ending: string | null      // YYYY-MM-DD
  driver_gross: number | null
  dispatch_pct: number | null
  dispatch_fee: number | null     // driver_gross * dispatch_pct / 100
  sent_date: string | null        // YYYY-MM-DD
  paid_date: string | null        // YYYY-MM-DD
  status: InvoiceStatus
  notes: string | null
  // Factoring
  factored:           number          // 0 or 1 (SQLite boolean)
  factoring_company:  string | null
  advance_rate:       number | null   // percentage e.g. 0.97 = 97%
  factored_amount:    number | null   // dollar amount advanced
  factored_date:      string | null   // YYYY-MM-DD
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
export type DocCategory = 'Dispatch' | 'Drivers' | 'Sales' | 'Marketing' | 'Brokers' | 'Finance' | 'Template' | 'Reference' | 'Policy' | 'Other' | 'SOP' | 'Training' | 'New Authority'

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

// -- Driver Acquisition Pipeline --
export type ProspectStage =
  | 'Spotted'
  | 'Messaged'
  | 'Replied'
  | 'Interested'
  | 'Docs Requested'
  | 'Agreement Sent'
  | 'Signed'
  | 'Handed Off'

export type ProspectPriority = 'High' | 'Medium' | 'Low'
export type ProspectSource   = 'Facebook Group' | 'Facebook Message' | 'Cold Call' | 'Referral' | 'Other'

export interface DriverProspect {
  id:                    number
  name:                  string
  phone:                 string | null
  email:                 string | null
  city:                  string | null
  state:                 string | null
  cdl_class:             string | null   // 'A' | 'B' | 'C' | 'None'
  equipment_interest:    string | null   // Dry Van, Flatbed, Reefer, etc.
  years_experience:      number | null
  source:                string | null
  stage:                 ProspectStage
  priority:              ProspectPriority
  follow_up_date:        string | null   // YYYY-MM-DD
  notes:                 string | null
  last_contact_date:     string | null   // YYYY-MM-DD
  contact_attempt_count: number
  contact_method:        string | null   // Call | SMS | Facebook Message | Other
  converted_driver_id:   number | null   // FK -> drivers.id once Handed Off
  created_at:            string
  updated_at:            string
}

export type CreateDriverProspectDto = Omit<DriverProspect, 'id' | 'created_at' | 'updated_at'>
export type UpdateDriverProspectDto = Partial<CreateDriverProspectDto>

export interface ProspectOutreachEntry {
  id:          number
  prospect_id: number
  method:      string        // 'Call' | 'SMS' | 'Facebook Message' | 'Other'
  outcome:     string | null // 'No Answer' | 'Left Voicemail' | 'Spoke' | 'Replied' | 'Other'
  notes:       string | null
  created_at:  string
}
export type CreateProspectOutreachDto = Omit<ProspectOutreachEntry, 'id' | 'created_at'>

// -- Claude AI Response --
export interface ClaudeOk    { ok: true;  content: string }
export interface ClaudeError { ok: false; error: string }
export type ClaudeResponse = ClaudeOk | ClaudeError

// -- FB Conversation Agent (Agent 1) --
export type FbConvStage =
  | 'New' | 'Replied' | 'Interested' | 'Call Ready' | 'Converted' | 'Dead'

export interface FbConversation {
  id:              number
  lead_id:         number | null
  name:            string
  phone:           string | null
  platform:        string
  stage:           FbConvStage
  last_message:    string | null
  last_message_at: string | null
  follow_up_at:    string | null
  notes:           string | null
  created_at:      string
  updated_at:      string
}
export type CreateFbConversationDto = Omit<FbConversation, 'id' | 'created_at' | 'updated_at'>
export type UpdateFbConversationDto = Partial<CreateFbConversationDto>

// -- FB Lead Hunter Agent (Agent 2) --
export type FbPostIntent =
  | 'Needs Dispatcher'
  | 'Needs Load'
  | 'Empty Truck'
  | 'Looking for Consistent Freight'
  | 'General Networking'
  | 'Low Intent'
  | 'Ignore'

export type FbPostStatus = 'queued' | 'reviewed' | 'converted' | 'ignored'

export interface FbPost {
  id:                  number
  raw_text:            string
  author_name:         string | null
  group_name:          string | null
  posted_at:           string | null
  intent:              FbPostIntent | null
  extracted_name:      string | null
  extracted_phone:     string | null
  extracted_location:  string | null
  extracted_equipment: string | null
  recommended_action:  string | null
  draft_comment:       string | null
  draft_dm:            string | null
  lead_id:             number | null
  status:              FbPostStatus
  created_at:          string
}
export type CreateFbPostDto = Omit<FbPost, 'id' | 'created_at'>
export type UpdateFbPostDto = Partial<CreateFbPostDto>

// -- FB Content Agent (Agent 3) --
export type FbContentCategory =
  | 'Driver Recruitment'
  | 'Educational'
  | 'New Authority Tip'
  | 'Lane Availability'
  | 'Small Fleet Positioning'
  | 'Trust / Credibility'
  | 'Engagement Question'

export type FbQueueStatus = 'draft' | 'scheduled' | 'posted' | 'skipped'

export interface FbQueuePost {
  id:            number
  content:       string
  category:      FbContentCategory
  variation_of:  number | null
  scheduled_for: string | null
  group_ids:     string
  status:        FbQueueStatus
  posted_at:     string | null
  created_at:    string
}
export type CreateFbQueuePostDto = Omit<FbQueuePost, 'id' | 'created_at'>
export type UpdateFbQueuePostDto = Partial<CreateFbQueuePostDto>

// -- Active Load Timeline --
export interface TimelineEvent {
  id:           number
  load_id:      number
  event_type:   string        // 'status' | 'check_call' | 'note'
  label:        string
  scheduled_at: string | null // ISO datetime YYYY-MM-DDTHH:MM
  completed_at: string | null
  notes:        string | null
  created_at:   string
}

export interface ActiveLoadRow {
  id:               number
  load_id:          string | null
  driver_id:        number | null
  driver_name:      string | null
  driver_phone:     string | null
  broker_id:        number | null
  broker_name:      string | null
  origin_city:      string | null
  origin_state:     string | null
  dest_city:        string | null
  dest_state:       string | null
  pickup_date:      string | null
  delivery_date:    string | null
  status:           string
  rate:             number | null
  miles:            number | null
  next_event_label: string | null
  next_event_at:    string | null
}

export interface CheckCallRow {
  event_id:     number
  load_id_pk:   number
  load_ref:     string | null
  driver_name:  string | null
  label:        string
  scheduled_at: string | null
}

// -- Broker Intelligence + Lane Memory --
export type BrokerRating   = 'Preferred' | 'Strong' | 'Neutral' | 'Caution' | 'Avoid'
export type LaneStrength   = 'Strong' | 'Average' | 'Weak'
export type DriverLaneFit  = 'Strong Fit' | 'Has History' | 'New Lane'

export interface BrokerIntelRow {
  broker_id:       number
  broker_name:     string
  flag:            string
  loads_count:     number
  avg_rpm:         number | null
  total_revenue:   number
  score:           number
  rating:          BrokerRating
  caution_note:    string | null
  avg_days_to_pay: number | null
  payment_grade:   string | null   // 'A' | 'B' | 'C' | 'D' | 'F' | null
  invoice_count:   number
}

export interface LaneIntelRow {
  origin_state:  string
  dest_state:    string
  loads_count:   number
  avg_rpm:       number
  total_revenue: number
  strength:      LaneStrength
}

export interface DriverLaneFitRow {
  origin_state: string
  dest_state:   string
  loads_count:  number
  avg_rpm:      number | null
  fit:          DriverLaneFit
}

// -- CSV Lead Import --
export interface CsvImportResult {
  totalRows:         number
  inserted:          number
  duplicatesSkipped: number
  invalidSkipped:    number
  errors:            string[]
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

// -- Dispatcher Board: Available Loads --
export interface AvailableLoad {
  load_id_pk:  number
  load_ref:    string | null
  origin_city:  string | null
  origin_state: string | null
  dest_city:    string | null
  dest_state:   string | null
  pickup_date:  string | null
  miles:        number | null
  rate:         number | null
  broker_id:    number | null
  broker_name:  string | null
  broker_flag:  BrokerFlag | null
  commodity:    string | null
  notes:        string | null
}

export interface AssignLoadResult {
  ok:    boolean
  error?: string
}

// -- Load Opportunity Scanner --
export interface LoadRecommendation {
  load_id_pk:     number
  load_ref:       string | null
  origin_city:    string | null
  origin_state:   string | null
  dest_city:      string | null
  dest_state:     string | null
  rate:           number | null
  miles:          number | null    // loaded miles
  rpm:            number | null
  deadhead_miles: number
  gross_rate:     number | null   // raw rate from the load — mislabeled total_revenue previously
  score:          number
  broker_name:    string | null
  broker_flag:    BrokerFlag | null
  pickup_date:    string | null
}

export interface ScannerRecommendation {
  driver_id:       number
  driver_name:     string
  home_base:       string | null
  recommendations: LoadRecommendation[]
}

// -- Driver Compliance --
export interface DriverComplianceRow {
  id:                  number
  name:                string
  mc_number:           string | null
  cdl_expiry:          string | null
  insurance_expiry:    string | null
  medical_card_expiry: string | null
  coi_expiry:          string | null
}

// -- Operations Dashboard --
export interface OperationsData {
  driversNeedingLoads:   number
  revenueThisMonth:      number
  expiringDocs: Array<{ driver_id: number; driver_name: string; doc_type: string; expiry_date: string; days_until: number }>
  staleLoads:   Array<{ id: number; load_id: string | null; status: string; driver_name: string | null; pickup_date: string | null; delivery_date: string | null; days_past: number }>
  loadsInTransit:        number
  overdueLeads:          number
  todaysGroupCount:      number
  outstandingInvoices:   number
  uninvoicedDelivered:   number
  warmLeads:        Array<{ id: number; name: string; company: string | null; status: string; priority: string; follow_up_date: string | null }>
  availableDrivers: Array<{ id: number; name: string; truck_type: string | null; home_base: string | null; current_location: string | null }>
  hotProspects:     Array<{ id: number; name: string; stage: ProspectStage; priority: string; phone: string | null; follow_up_date: string | null }>
  todayTasks:    Task[]
  completedToday: number[]
  // 7-Day Sprint tracking
  totalDrivers:         number
  totalBrokers:         number
  totalLeads:           number
  hasSentOrPaidInvoice: boolean
  // Weekly scorecard
  weeklyScorecard: {
    loadsCompleted:  number
    grossRevenue:    number
    dispatchRevenue: number
    avgRpm:          number | null
    bestLane:        string | null
    bestBroker:      string | null
    invoicesSent:    number
  }
}

// -- Profit Radar --
export interface DriverOpportunity {
  driverId:  number
  name:      string
  truckType: string | null
  homeBase:  string | null
  location:  string | null
  score:     number
}
export interface LeadHeat {
  convId:      number
  name:        string
  stage:       string
  lastMessage: string | null
  followUpAt:  string | null
  phone:       string | null
  nextAction:  string
  score:       number
}
export interface GroupPerformance {
  groupId:        number
  name:           string
  leadsGenerated: number
  signedDrivers:  number
  priority:       string
  lastPostedAt:   string | null
  score:          number
}
export interface BrokerLane {
  originState: string
  destState:   string
  avgRpm:      number
  loads:       number
  score:       number
}
export interface ProfitRadarData {
  idleDrivers: DriverOpportunity[]
  leadHeat:    LeadHeat[]
  topGroups:   GroupPerformance[]
  topLanes:    BrokerLane[]
}

// -- Broker Mode: DAT Postings --
export type DatPostingStatus = 'active' | 'expired' | 'filled'

export interface DatPosting {
  id:          number
  load_id:     number
  posted_rate: number | null
  posted_at:   string
  expires_at:  string | null
  posting_ref: string | null   // DAT reference number or internal label
  status:      DatPostingStatus
  notes:       string | null
  created_at:  string
}
export type CreateDatPostingDto = Omit<DatPosting, 'id' | 'created_at' | 'posted_at'>
export type UpdateDatPostingDto = Partial<Omit<DatPosting, 'id' | 'load_id' | 'created_at' | 'posted_at'>>

// -- Broker Mode: Carrier Offers --
export type CarrierOfferStatus = 'Pending' | 'Accepted' | 'Rejected' | 'Countered'

export interface CarrierOffer {
  id:           number
  load_id:      number
  carrier_name: string
  mc_number:    string | null
  phone:        string | null
  offered_rate: number | null
  offered_at:   string
  status:       CarrierOfferStatus
  counter_rate: number | null
  final_rate:   number | null
  notes:        string | null
  created_at:   string
  updated_at:   string
}
export type CreateCarrierOfferDto = Omit<CarrierOffer, 'id' | 'created_at' | 'updated_at' | 'offered_at'>
export type UpdateCarrierOfferDto = Partial<Omit<CarrierOffer, 'id' | 'load_id' | 'created_at' | 'updated_at' | 'offered_at'>>

// -- Broker Mode: Carrier Vetting --
export type SafetyRating = 'Satisfactory' | 'Conditional' | 'Unsatisfactory' | 'Not Rated'

export interface BrokerCarrierVetting {
  id:                      number
  load_id:                 number
  carrier_mc:              string | null
  carrier_name:            string | null
  insurance_verified:      0 | 1
  authority_active:        0 | 1
  safety_rating:           SafetyRating | null
  carrier_packet_received: 0 | 1
  vetting_date:            string | null
  notes:                   string | null
  created_at:              string
}
export type CreateBrokerCarrierVettingDto = Omit<BrokerCarrierVetting, 'id' | 'created_at'>
