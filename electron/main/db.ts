import Database from 'better-sqlite3'
import Store from 'electron-store'
import { runMigrations } from './schema/migrations'
import { seedMissingItems } from './seed'
import { app } from 'electron'
import { join } from 'path'
import { existsSync, mkdirSync } from 'fs'
import { createBackup, startPeriodicBackup } from './backup'

let db: Database.Database | null = null
let _dataDir: string = ''

export function getDb(): Database.Database {
  if (!db) throw new Error('Database not initialized')
  return db
}

export function getDataDir(): string {
  return _dataDir
}

// ---------------------------------------------------------------------------
// Sync admin user (id=1) from electron-store settings.
// In v1 this is a no-op when store keys are not yet configured — the migration
// seed row remains as-is. When the Settings page later persists ownerName /
// ownerEmail, those values will win on the next launch. In v2 (new-company
// onboarding) the first-run setup flow writes these keys before initDatabase
// runs, so the admin user is created with the correct identity immediately.
// ---------------------------------------------------------------------------
function syncAdminUserFromStore(database: Database.Database, store: Store<Record<string, unknown>>): void {
  const name  = store.get('ownerName')  as string | undefined
  const email = store.get('ownerEmail') as string | undefined
  if (!name && !email) return  // nothing configured yet — leave migration default

  const existing = database.prepare('SELECT id FROM users WHERE id = 1').get()
  if (!existing) {
    database.prepare(
      "INSERT OR IGNORE INTO users (id, name, email, role) VALUES (1, ?, ?, 'Admin')"
    ).run(name ?? 'Admin', email ?? 'admin@local')
  } else {
    if (name)  database.prepare('UPDATE users SET name  = ? WHERE id = 1').run(name)
    if (email) database.prepare('UPDATE users SET email = ? WHERE id = 1').run(email)
  }
}

// Removes leads where the entire CSV row was accidentally stored as the name
// (e.g. "AZ,1,10/08/25,Reefer,FMCSA New Authority,New,,,,High").
// Safe guard: only deletes records that also have no MC and no DOT number.
function cleanCorruptedLeads(database: Database.Database): void {
  const { changes } = database.prepare(
    "DELETE FROM leads WHERE name LIKE '%,FMCSA New Authority,%' AND mc_number IS NULL AND dot_number IS NULL"
  ).run()
  if (changes > 0) console.log('[DB] Removed', changes, 'corrupted leads (CSV row stored as name)')
}

export function initDatabase(customDataPath?: string, store?: Store<Record<string, unknown>>): void {
  _dataDir = (customDataPath && customDataPath !== '')
    ? customDataPath
    : join(app.getPath('userData'), 'OnTrackDashboard')

  if (!existsSync(_dataDir)) mkdirSync(_dataDir, { recursive: true })
  for (const dir of ['documents', 'drivers', 'backups']) {
    const p = join(_dataDir, dir)
    if (!existsSync(p)) mkdirSync(p, { recursive: true })
  }

  const dbPath = join(_dataDir, 'database.db')
  db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.pragma('synchronous = NORMAL')
  db.pragma('foreign_keys = ON')
  db.pragma('cache_size = -32000')

  runMigrations(db)
  seedMissingItems(db)              // idempotent — INSERT OR IGNORE, safe every startup
  cleanCorruptedLeads(db)           // one-time: remove CSV-row-as-name garbage records
  if (store) syncAdminUserFromStore(db, store)
  createBackup(db, _dataDir)           // once at startup (daily, skips if exists)
  startPeriodicBackup(getDb, getDataDir) // every 6 hours
  console.log('[DB] Initialized at:', dbPath)
}
