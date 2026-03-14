import Database from 'better-sqlite3'
import { join } from 'path'
import { existsSync, mkdirSync, copyFileSync, statSync, readdirSync } from 'fs'

export interface BackupEntry {
  filename: string
  file_path: string
  size_bytes: number
  created_at: string
}

export function ensureBackupDir(dataDir: string): string {
  const backupDir = join(dataDir, 'backups')
  if (!existsSync(backupDir)) mkdirSync(backupDir, { recursive: true })
  return backupDir
}

/** Creates a dated backup. label = undefined means auto-daily (skips if file exists). */
export function createBackup(
  db: Database.Database,
  dataDir: string,
  label?: string
): BackupEntry | null {
  const backupDir = ensureBackupDir(dataDir)
  const today = new Date().toISOString().split('T')[0]
  const suffix = label ? '_' + label : ''
  const filename = today + suffix + '.db'
  const filePath = join(backupDir, filename)

  if (existsSync(filePath) && !label) {
    console.log('[Backup] Auto-backup already exists for today, skipping')
    return null
  }

  try {
    db.backup(filePath)
    const size = statSync(filePath).size
    // Record in backups table (best-effort)
    try {
      db.prepare(
        'INSERT OR IGNORE INTO backups (filename, file_path, size_bytes) VALUES (?, ?, ?)'
      ).run(filename, filePath, size)
    } catch {}
    console.log('[Backup] Created:', filePath)
    return {
      filename,
      file_path: filePath,
      size_bytes: size,
      created_at: new Date().toISOString(),
    }
  } catch (err) {
    console.error('[Backup] Failed:', err)
    return null
  }
}

/** Reads the backups/ directory and returns entries sorted newest-first. */
export function listBackups(dataDir: string): BackupEntry[] {
  const backupDir = ensureBackupDir(dataDir)
  try {
    return readdirSync(backupDir)
      .filter(f => f.endsWith('.db'))
      .map(f => {
        const fp = join(backupDir, f)
        let size = 0
        let mtime = new Date()
        try {
          const s = statSync(fp)
          size = s.size
          mtime = s.mtime
        } catch {}
        return { filename: f, file_path: fp, size_bytes: size, created_at: mtime.toISOString() }
      })
      .sort((a, b) => b.filename.localeCompare(a.filename))
  } catch {
    return []
  }
}

/**
 * Stage a restore: records the backup path in electron-store so the
 * next startup can apply it before opening the database.
 * Returns false if the backup file does not exist.
 */
export function stageRestore(
  backupFilePath: string,
  store: { set: (k: string, v: unknown) => void }
): boolean {
  if (!existsSync(backupFilePath)) return false
  store.set('pendingRestore', backupFilePath)
  console.log('[Backup] Restore staged:', backupFilePath)
  return true
}

/**
 * Called at startup BEFORE initDatabase().
 * If a pendingRestore path is in the store, copies it over database.db.
 */
export function applyPendingRestore(
  dbPath: string,
  store: { get: (k: string) => unknown; delete: (k: string) => void }
): boolean {
  const pending = store.get('pendingRestore') as string | undefined
  if (!pending) return false
  store.delete('pendingRestore')
  if (!existsSync(pending)) {
    console.warn('[Backup] Staged restore file not found:', pending)
    return false
  }
  try {
    copyFileSync(pending, dbPath)
    console.log('[Backup] Restore applied:', pending, '->', dbPath)
    return true
  } catch (err) {
    console.error('[Backup] Restore copy failed:', err)
    return false
  }
}

// ---------------------------------------------------------------------------
// Periodic backup (every 6 hours)
// ---------------------------------------------------------------------------

let _periodicInterval: ReturnType<typeof setInterval> | null = null

/** Returns 'auto-00', 'auto-06', 'auto-12', or 'auto-18' for the current time slot. */
function sixHourLabel(): string {
  const h = new Date().getHours()
  const slot = Math.floor(h / 6) * 6
  return 'auto-' + String(slot).padStart(2, '0')
}

/**
 * Starts a periodic backup that runs immediately (for the current 6-hour slot)
 * and then every 6 hours. Filenames:
 *   YYYY-MM-DD_auto-00.db  (00:00-05:59)
 *   YYYY-MM-DD_auto-06.db  (06:00-11:59)
 *   YYYY-MM-DD_auto-12.db  (12:00-17:59)
 *   YYYY-MM-DD_auto-18.db  (18:00-23:59)
 * Skips if the slot file already exists (never overwrites old backups).
 */
export function startPeriodicBackup(
  getDb: () => Database.Database,
  getDataDir: () => string
): void {
  if (_periodicInterval) return

  function runSlotBackup() {
    try {
      const dataDir = getDataDir()
      const label    = sixHourLabel()
      const today    = new Date().toISOString().split('T')[0]
      const filename = today + '_' + label + '.db'
      const filePath = join(ensureBackupDir(dataDir), filename)
      if (existsSync(filePath)) {
        console.log('[Backup] Slot already backed up:', filename)
        return
      }
      createBackup(getDb(), dataDir, label)
    } catch (err) {
      console.error('[Backup] Periodic backup failed:', err)
    }
  }

  runSlotBackup()  // immediate run for current slot
  _periodicInterval = setInterval(runSlotBackup, 6 * 60 * 60 * 1000)
  console.log('[Backup] Periodic backup started — every 6 hours')
}

export function stopPeriodicBackup(): void {
  if (_periodicInterval) {
    clearInterval(_periodicInterval)
    _periodicInterval = null
    console.log('[Backup] Periodic backup stopped')
  }
}
