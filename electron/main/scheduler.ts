import type Database from 'better-sqlite3'

export type JobName = 'fmcsa-scraper' | 'daily-briefing' | 'marketing-queue'

interface JobConfig {
  name: JobName
  hour: number       // 24-hour clock
  minute: number
  dayOfWeek?: number // 0=Sun 1=Mon … undefined=every day
  handler: () => Promise<void>
}

// ---------------------------------------------------------------------------
// Scaffolded job handlers (no external API calls yet)
// ---------------------------------------------------------------------------

async function runFmcsScraper(): Promise<void> {
  console.log('[Scheduler] 05:00 FMCSA scraper stub — no API call yet')
  // TODO: fetch FMCSA Safer API, update driver authority records
}

async function runDailyBriefing(): Promise<void> {
  console.log('[Scheduler] 06:00 Daily briefing stub')
  // TODO: build summary of today tasks + loads in transit + follow-ups due
  //       and optionally push to a notification / log file
}

async function runMarketingQueue(): Promise<void> {
  console.log('[Scheduler] Monday 07:00 Weekly marketing queue stub')
  // TODO: build Facebook/DAT post queue from open leads, log to app_settings
}

// ---------------------------------------------------------------------------
// Job registry
// ---------------------------------------------------------------------------

const JOBS: JobConfig[] = [
  { name: 'fmcsa-scraper',   hour: 5, minute: 0,              handler: runFmcsScraper   },
  { name: 'daily-briefing',  hour: 6, minute: 0,              handler: runDailyBriefing  },
  { name: 'marketing-queue', hour: 7, minute: 0, dayOfWeek: 1, handler: runMarketingQueue },
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

export function startScheduler(getDb: () => Database.Database): void {
  if (_interval) return
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
