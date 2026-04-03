import { Notification } from 'electron'
import type Database from 'better-sqlite3'
import { importFmcsaLeads, writeImportMeta } from './fmcsaImport'

export type JobName =
  | 'fmcsa-scraper'
  | 'task-daily-reset'
  | 'fb-search-0700'
  | 'fb-search-1000'
  | 'fb-search-1300'
  | 'fb-search-1600'
  | 'fb-groups-update'
  | 'doc-expiry-check'
  | 'prospect-followup-check'

interface JobConfig {
  name:        JobName
  hour:        number        // 24-hour clock
  minute:      number
  daysOfWeek?: number[]      // 0=Sun 1=Mon … undefined=every day
  handler:     () => Promise<void>
}

// ---------------------------------------------------------------------------
// Module-level factories set by startScheduler
// ---------------------------------------------------------------------------

let _getDb:  (() => Database.Database) | null = null
let _getKey: ((key: string) => unknown) | null = null

// ---------------------------------------------------------------------------
// Job handlers
// ---------------------------------------------------------------------------

async function runFmcsScraper(): Promise<void> {
  if (!_getDb || !_getKey) {
    console.warn('[Scheduler] FMCSA scraper: not yet initialised — skipping')
    return
  }
  const db        = _getDb()
  const webKey    = _getKey('fmcsa_web_key')    as string | undefined
  const termsRaw  = _getKey('fmcsa_search_terms') as string | undefined
  const searchTerms = termsRaw
    ? termsRaw.split(',').map((t: string) => t.trim()).filter(Boolean)
    : undefined
  const result = await importFmcsaLeads(db, webKey, searchTerms)
  writeImportMeta(db, result, 'scheduled')
  console.log('[Scheduler] FMCSA import done. Added:', result.leadsAdded, '/ Found:', result.leadsFound)
}

/**
 * Resets the status column back to 'Pending' for all recurring and daily tasks
 * so the Operations checklist starts fresh each morning.
 */
async function runDailyTaskReset(): Promise<void> {
  if (!_getDb) {
    console.warn('[Scheduler] task-daily-reset: not yet initialised — skipping')
    return
  }
  const db = _getDb()
  const result = db.prepare(
    "UPDATE tasks SET status = 'Pending' WHERE " +
    "due_date = 'Daily' OR " +
    "due_date IN ('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday') OR " +
    "recurring = 1"
  ).run()
  console.log('[Scheduler] task-daily-reset: reset', result.changes, 'recurring tasks to Pending')
}

/**
 * Fires a native notification prompting Chris to search Facebook groups for
 * driver leads. Runs four times per weekday (7 AM, 10 AM, 1 PM, 4 PM).
 * Each slot is a separate job so the per-day dedup key does not block the
 * later slots from firing.
 */
async function runFbGroupSearch(slot: string): Promise<void> {
  const messages: Record<string, string> = {
    '07': 'Morning sweep — search your Facebook groups for driver leads now. Log any contacts in Leads.',
    '10': 'Mid-morning check — scan groups for new driver posts. Keywords: looking for dispatcher, need dispatch.',
    '13': 'Afternoon pass — check groups for the last 2 hours of driver activity. Message any new prospects.',
    '16': 'End-of-day sweep — final scan for driver inquiries. Update Leads and set follow-ups.',
  }
  const body = messages[slot] ?? 'Time to search your Facebook groups for driver leads.'
  if (Notification.isSupported()) {
    new Notification({ title: 'FB Group Search', body }).show()
  }
  console.log('[Scheduler] FB group search reminder fired — slot', slot)
}

/**
 * Sunday job: sends a reminder notification to review and update the
 * Facebook groups list, then flags groups with no posts in 30+ days
 * as needing review (clears last_reviewed_at so the category gap panel
 * highlights them).
 */
async function runFbGroupsUpdate(): Promise<void> {
  if (Notification.isSupported()) {
    new Notification({
      title:  'Weekly FB Groups Review',
      body:   'Time to review your Facebook groups list. Go to Marketing > Groups and check the Category Coverage panel for gaps.',
    }).show()
  }

  if (!_getDb) return
  try {
    const db = _getDb()
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const cutoff = thirtyDaysAgo.toISOString().split('T')[0]

    // Flag stale groups — clear last_reviewed_at so the category gap panel
    // surfaces them as needing attention
    const result = db.prepare(
      "UPDATE marketing_groups SET last_reviewed_at = NULL " +
      "WHERE (last_posted_at IS NULL OR last_posted_at < ?) AND active = 1"
    ).run(cutoff)

    console.log('[Scheduler] fb-groups-update: flagged', result.changes, 'stale groups for review')
  } catch (err) {
    console.error('[Scheduler] fb-groups-update DB error:', err)
  }
}

/**
 * Checks driver documents expiring within 30 days and fires a native
 * notification once per day per expiring document.
 */
async function runDocExpiryCheck(): Promise<void> {
  if (!_getDb) {
    console.warn('[Scheduler] doc-expiry-check: not yet initialised — skipping')
    return
  }
  if (!Notification.isSupported()) return
  const db = _getDb()

  interface ExpiryRow {
    driver_name: string
    doc_type:    string
    expiry_date: string
    days_left:   number
  }

  const today = todayStr()
  const in30  = new Date()
  in30.setDate(in30.getDate() + 30)
  const cutoff = in30.toISOString().split('T')[0]

  const rows = db.prepare(
    'SELECT d.name AS driver_name, dd.doc_type, dd.expiry_date,' +
    "  CAST(julianday(dd.expiry_date) - julianday('now') AS INTEGER) AS days_left" +
    ' FROM driver_documents dd JOIN drivers d ON d.id = dd.driver_id' +
    " WHERE dd.expiry_date IS NOT NULL AND dd.expiry_date BETWEEN ? AND ?" +
    " ORDER BY dd.expiry_date ASC"
  ).all(today, cutoff) as ExpiryRow[]

  if (rows.length === 0) return

  // Fire one summary notification if multiple docs expiring, individual if just one
  if (rows.length === 1) {
    const r = rows[0]
    const urgency = r.days_left <= 7 ? 'URGENT: ' : ''
    new Notification({
      title: `${urgency}Document Expiring Soon`,
      body:  `${r.driver_name} — ${r.doc_type} expires in ${r.days_left} day${r.days_left !== 1 ? 's' : ''} (${r.expiry_date})`,
    }).show()
  } else {
    const urgent = rows.filter(r => r.days_left <= 7)
    const title = urgent.length > 0 ? `URGENT: ${urgent.length} Document${urgent.length > 1 ? 's' : ''} Expiring This Week` : `${rows.length} Driver Documents Expiring Soon`
    const body = rows.slice(0, 3).map(r => `${r.driver_name}: ${r.doc_type} (${r.days_left}d)`).join(', ')
      + (rows.length > 3 ? ` +${rows.length - 3} more` : '')
    new Notification({ title, body }).show()
  }

  console.log('[Scheduler] doc-expiry-check: found', rows.length, 'expiring documents')
}

/**
 * 8 AM daily — check for driver prospects with a follow-up date of today.
 * Fires a single summary notification so you know who to contact.
 */
async function runProspectFollowupCheck(): Promise<void> {
  if (!_getDb) {
    console.warn('[Scheduler] prospect-followup-check: not yet initialised — skipping')
    return
  }
  if (!Notification.isSupported()) return
  const db = _getDb()

  interface ProspectRow { name: string; stage: string; phone: string | null }

  const rows = db.prepare(
    "SELECT name, stage, phone FROM driver_prospects" +
    " WHERE follow_up_date = date('now') AND stage NOT IN ('Handed Off')" +
    " ORDER BY name ASC"
  ).all() as ProspectRow[]

  if (rows.length === 0) return

  if (rows.length === 1) {
    const r = rows[0]
    new Notification({
      title: 'Prospect Follow-Up Today',
      body:  `${r.name} (${r.stage})${r.phone ? ' — ' + r.phone : ''}`,
    }).show()
  } else {
    const preview = rows.slice(0, 3).map(r => r.name).join(', ')
      + (rows.length > 3 ? ` +${rows.length - 3} more` : '')
    new Notification({
      title: `${rows.length} Prospect Follow-Ups Today`,
      body:  preview,
    }).show()
  }

  console.log('[Scheduler] prospect-followup-check: found', rows.length, 'prospects due today')
}

// ---------------------------------------------------------------------------
// Lead follow-up reminder checker (runs every tick, not via JOBS array)
// ---------------------------------------------------------------------------

// In-memory set prevents duplicate notifications within the same app session.
// Key format: `${leadId}_${YYYY-MM-DD}_${HH:MM}`
const _notifiedReminders = new Set<string>()

interface LeadReminderRow {
  id: number
  name: string
  follow_up_time: string
  phone: string | null
}

function checkLeadReminders(db: Database.Database): void {
  if (!Notification.isSupported()) return

  const today = todayStr()
  const now   = new Date()
  const hh    = String(now.getHours()).padStart(2, '0')
  const mm    = String(now.getMinutes()).padStart(2, '0')
  const currentTime = `${hh}:${mm}`

  const leads = db.prepare(
    'SELECT id, name, follow_up_time, phone FROM leads ' +
    'WHERE follow_up_date = ? AND follow_up_time IS NOT NULL'
  ).all(today) as LeadReminderRow[]

  for (const lead of leads) {
    const reminderTime = lead.follow_up_time.slice(0, 5) // normalize to HH:MM
    if (reminderTime !== currentTime) continue

    const key = `${lead.id}_${today}_${reminderTime}`
    if (_notifiedReminders.has(key)) continue
    _notifiedReminders.add(key)

    const body = lead.phone
      ? `${lead.name} — ${lead.phone}`
      : lead.name

    new Notification({
      title: 'Follow-Up Reminder',
      body,
    }).show()

    console.log('[Scheduler] Reminder fired for lead:', lead.id, lead.name)
  }
}

// ---------------------------------------------------------------------------
// Job registry
// ---------------------------------------------------------------------------

const JOBS: JobConfig[] = [
  // Midnight — reset recurring task statuses for the day
  { name: 'task-daily-reset', hour: 0, minute: 0, handler: runDailyTaskReset },

  // 5 AM — FMCSA lead import
  { name: 'fmcsa-scraper', hour: 5, minute: 0, handler: runFmcsScraper },

  // FB driver lead search — 4x per weekday (Mon=1 … Fri=5)
  { name: 'fb-search-0700', hour:  7, minute: 0, daysOfWeek: [1,2,3,4,5], handler: () => runFbGroupSearch('07') },
  { name: 'fb-search-1000', hour: 10, minute: 0, daysOfWeek: [1,2,3,4,5], handler: () => runFbGroupSearch('10') },
  { name: 'fb-search-1300', hour: 13, minute: 0, daysOfWeek: [1,2,3,4,5], handler: () => runFbGroupSearch('13') },
  { name: 'fb-search-1600', hour: 16, minute: 0, daysOfWeek: [1,2,3,4,5], handler: () => runFbGroupSearch('16') },

  // Sunday 9 AM — review and refresh the FB groups list
  { name: 'fb-groups-update', hour: 9, minute: 0, daysOfWeek: [0], handler: runFbGroupsUpdate },

  // 8 AM daily — check for driver documents expiring within 30 days
  { name: 'doc-expiry-check', hour: 8, minute: 0, handler: runDocExpiryCheck },

  // 8 AM daily — check for driver prospects with a follow-up due today
  { name: 'prospect-followup-check', hour: 8, minute: 5, handler: runProspectFollowupCheck },
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function todayStr(): string {
  return new Date().toISOString().split('T')[0]
}

function getLastRun(db: Database.Database, name: string): string | null {
  const row = db.prepare(
    'SELECT value FROM app_settings WHERE key = ?'
  ).get('job_last_run_' + name) as { value: string } | undefined
  return row?.value ?? null
}

function setLastRun(db: Database.Database, name: string, date: string): void {
  db.prepare(
    "INSERT OR REPLACE INTO app_settings (key, value, updated_at) VALUES (?, ?, datetime('now'))"
  ).run('job_last_run_' + name, date)
}

// ---------------------------------------------------------------------------
// Main tick
// ---------------------------------------------------------------------------

async function tick(getDb: () => Database.Database): Promise<void> {
  const now   = new Date()
  const h     = now.getHours()
  const m     = now.getMinutes()
  const dow   = now.getDay()
  const today = todayStr()

  // Run lead follow-up reminders every tick
  let db: Database.Database
  try {
    db = getDb()
    checkLeadReminders(db)
  } catch { /* DB not ready yet — skip */ }

  for (const job of JOBS) {
    if (h !== job.hour || m !== job.minute) continue
    if (job.daysOfWeek !== undefined && !job.daysOfWeek.includes(dow)) continue

    try { db = getDb() } catch { continue }

    if (getLastRun(db, job.name) === today) continue // already ran today

    console.log('[Scheduler] Starting job:', job.name)
    try {
      await job.handler()
      setLastRun(db, job.name, today)
      console.log('[Scheduler] Job complete:', job.name)
    } catch (err) {
      console.error('[Scheduler] Job failed:', job.name, err)
    }
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

let _interval: ReturnType<typeof setInterval> | null = null

export function startScheduler(
  getDb:  () => Database.Database,
  getKey: (key: string) => unknown,
): void {
  if (_interval) return
  _getDb  = getDb
  _getKey = getKey
  _interval = setInterval(
    () => tick(getDb).catch(e => console.error('[Scheduler] Uncaught:', e)),
    60_000
  )
  console.log('[Scheduler] Started —', JOBS.map(j => j.name).join(', '))
}

export function stopScheduler(): void {
  if (_interval) {
    clearInterval(_interval)
    _interval = null
    console.log('[Scheduler] Stopped')
  }
}

/** Returns registered job names (for Settings UI display). */
export function getJobNames(): JobName[] {
  return JOBS.map(j => j.name)
}
