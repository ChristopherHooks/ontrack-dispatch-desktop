import Database from 'better-sqlite3'
import { runMigrations } from './schema/migrations'
import { app } from 'electron'
import { join } from 'path'
import { existsSync, mkdirSync } from 'fs'

let db: Database.Database | null = null

export function getDb(): Database.Database {
  if (!db) throw new Error('Database not initialized')
  return db
}

export function initDatabase(customDataPath?: string): void {
  const dataDir = (customDataPath && customDataPath !== '')
    ? customDataPath
    : join(app.getPath('userData'), 'OnTrackDashboard')

  if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true })
  for (const dir of ['documents', 'drivers', 'backups']) {
    const p = join(dataDir, dir)
    if (!existsSync(p)) mkdirSync(p, { recursive: true })
  }

  const dbPath = join(dataDir, 'database.db')
  db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.pragma('synchronous = NORMAL')
  db.pragma('foreign_keys = ON')
  db.pragma('cache_size = -32000')

  runMigrations(db)
  scheduleAutoBackup(db, dataDir)
  console.log('[DB] Initialized at:', dbPath)
}

function scheduleAutoBackup(database: Database.Database, dataDir: string): void {
  const today = new Date().toISOString().split('T')[0]
  const backupPath = join(dataDir, 'backups', today + '.db')
  if (!existsSync(backupPath)) {
    try {
      database.backup(backupPath)
      console.log('[DB] Auto-backup created:', backupPath)
    } catch (err) {
      console.error('[DB] Backup failed:', err)
    }
  }
}
