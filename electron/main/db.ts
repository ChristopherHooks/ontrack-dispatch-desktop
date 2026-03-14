import Database from 'better-sqlite3'
import { runMigrations } from './schema/migrations'
import { app } from 'electron'
import { join } from 'path'
import { existsSync, mkdirSync } from 'fs'
import { createBackup } from './backup'

let db: Database.Database | null = null
let _dataDir: string = ''

export function getDb(): Database.Database {
  if (!db) throw new Error('Database not initialized')
  return db
}

export function getDataDir(): string {
  return _dataDir
}

export function initDatabase(customDataPath?: string): void {
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
  // Auto daily backup (skips if already done today)
  createBackup(db, _dataDir)
  console.log('[DB] Initialized at:', dbPath)
}
