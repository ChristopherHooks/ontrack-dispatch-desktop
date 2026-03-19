import type Database from 'better-sqlite3'
import { importFmcsaLeads, writeImportMeta } from './fmcsaImport'

export type JobName = 'fmcsa-scraper' | 'task-daily-reset'

interface JobConfig {
  name: JobName
  hour: number       // 24-hour clock
  minute: number
  dayOfWeek?: number // 0=Sun 1=Mon … undefined=every day
  handler: () => Promise<void>
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
 *
 * Targets tasks where:
 *   due_date = 'Daily'                        — repeats every day
 *   due_date IN ('Monday' … 'Sunday')         — repeats on a set day of the week
 *   recurring = 1                             — explicitly flagged as recurring
 *
 * One-time tasks with a specific YYYY-MM-DD due_date are intentionally left
 * alone — their 'Done' status is permanent.
 *
 * The task_completions table already tracks completions per-date, so this
 * only corrects the legacy tasks.status column used by the Tasks management UI.
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

// runDailyBriefing and runMarketingQueue are planned for a future session.
// Not registered in JOBS until implemented so they do not fire on a schedule.

// ---------------------------------------------------------------------------
// Job registry
// ---------------------------------------------------------------------------

const JOBS: JobConfig[] = [
  // Fires at 12:00 AM local time (system clock, expected CST for OnTrack).
  // Resets recurring/daily task status so the Operations checklist starts fresh.
  { name: 'task-daily-reset', hour: 0, minute: 0, handler: runDailyTaskReset },
  { name: 'fmcsa-scraper',    hour: 5, minute: 0, handler: runFmcsScraper   },
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
  const now = new Date()
  const h   = now.getHours()
  const m   = now.getMinutes()
  const dow = now.getDay()
  const today = todayStr()

  for (const job of JOBS) {
    if (h !== job.hour || m !== job.minute) continue
    if (job.dayOfWeek !== undefined && job.dayOfWeek !== dow) continue

    let db: Database.Database
    try { db = getDb() } catch { continue }

    if (getLastRun(db, job.name) === today) continue // already ran

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
