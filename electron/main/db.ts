import Database from 'better-sqlite3'
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

function runMigrations(database: Database.Database): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS schema_version (
      version INTEGER PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS leads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      company TEXT, mc_number TEXT, phone TEXT,
      email TEXT, city TEXT, state TEXT,
      trailer_type TEXT, authority_date TEXT, source TEXT,
      status TEXT NOT NULL DEFAULT 'New',
      follow_up_date TEXT, notes TEXT,
      priority TEXT DEFAULT 'Medium',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
    CREATE INDEX IF NOT EXISTS idx_leads_follow_up ON leads(follow_up_date);
    CREATE TABLE IF NOT EXISTS drivers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL, company TEXT, mc_number TEXT, dot_number TEXT,
      phone TEXT, email TEXT, truck_type TEXT, trailer_type TEXT,
      home_base TEXT, preferred_lanes TEXT,
      min_rpm REAL, dispatch_percent REAL DEFAULT 7.0,
      factoring_company TEXT, insurance_expiry TEXT, start_date TEXT,
      status TEXT NOT NULL DEFAULT 'Active',
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_drivers_status ON drivers(status);
    CREATE TABLE IF NOT EXISTS brokers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL, mc_number TEXT,
      phone TEXT, email TEXT,
      payment_terms INTEGER DEFAULT 30,
      credit_rating TEXT, avg_days_pay INTEGER,
      flag TEXT DEFAULT 'None',
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS loads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      load_id TEXT UNIQUE,
      driver_id INTEGER REFERENCES drivers(id) ON DELETE SET NULL,
      broker_id INTEGER REFERENCES brokers(id) ON DELETE SET NULL,
      origin_city TEXT, origin_state TEXT,
      dest_city TEXT, dest_state TEXT,
      pickup_date TEXT, delivery_date TEXT,
      miles REAL, rate REAL, dispatch_pct REAL,
      commodity TEXT,
      status TEXT NOT NULL DEFAULT 'Searching',
      invoiced INTEGER DEFAULT 0,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_loads_status ON loads(status);
    CREATE INDEX IF NOT EXISTS idx_loads_driver ON loads(driver_id);
    CREATE INDEX IF NOT EXISTS idx_loads_delivery ON loads(delivery_date);
    CREATE TABLE IF NOT EXISTS invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_number TEXT UNIQUE NOT NULL,
      driver_id INTEGER REFERENCES drivers(id) ON DELETE SET NULL,
      week_ending TEXT, driver_gross REAL,
      dispatch_pct REAL, dispatch_fee REAL,
      sent_date TEXT, paid_date TEXT,
      status TEXT NOT NULL DEFAULT 'Draft',
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL, category TEXT,
      priority TEXT DEFAULT 'Medium',
      due_date TEXT, time_of_day TEXT,
      recurring INTEGER DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'Pending',
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_tasks_due ON tasks(due_date);
    CREATE TABLE IF NOT EXISTS documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL, category TEXT, file_path TEXT,
      driver_id INTEGER REFERENCES drivers(id) ON DELETE SET NULL,
      doc_type TEXT, expiry_date TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL, email TEXT UNIQUE NOT NULL,
      role TEXT NOT NULL DEFAULT 'Dispatcher',
      active INTEGER DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    INSERT OR IGNORE INTO users (id, name, email, role)
    VALUES (1, 'Chris Hooks', 'dispatch@ontrackhaulingsolutions.com', 'Admin');
    DELETE FROM tasks
    WHERE due_date = 'Daily' AND recurring = 1
      AND id NOT IN (
        SELECT MIN(id) FROM tasks
        WHERE due_date = 'Daily' AND recurring = 1
        GROUP BY title
      );
    INSERT OR IGNORE INTO tasks (id, title, category, priority, due_date, time_of_day, recurring) VALUES
      (1, 'Post in 5+ Facebook groups',        'Marketing', 'High',   'Daily', '9:00 AM',  1),
      (2, 'Reply to driver posts for loads',   'Marketing', 'High',   'Daily', '9:45 AM',  1),
      (3, 'DM drivers from Facebook',          'Marketing', 'High',   'Daily', '10:30 AM', 1),
      (4, 'Check load boards (DAT/TruckStop)', 'Dispatch',  'High',   'Daily', '11:30 AM', 1),
      (5, 'Update Active Loads status',        'Dispatch',  'High',   'Daily', '3:30 PM',  1),
      (6, 'Follow up with pipeline leads',     'Leads',     'Medium', 'Daily', '4:30 PM',  1);
    INSERT OR IGNORE INTO schema_version (version) VALUES (1);
  `)
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
