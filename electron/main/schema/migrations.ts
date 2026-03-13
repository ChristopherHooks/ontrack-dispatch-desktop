import Database from 'better-sqlite3'

export interface Migration {
  version: number
  description: string
  up: (db: Database.Database) => void
}

// Helper: add a column only if it does not already exist

function addColumnIfMissing(
  db: Database.Database,
  table: string,
  column: string,
  definition: string
): void {
  const cols = (db.pragma('table_info(' + table + ')') as Array<{ name: string }>)
    .map(c => c.name)
  if (!cols.includes(column)) {
    db.exec('ALTER TABLE ' + table + ' ADD COLUMN ' + column + ' ' + definition)
  }
}

// ---------------------------------------------------------------------------
// Migration 001 -- Baseline schema (existing 8 tables)
// Existing installs already have schema_version = 1; skipped for them.
// ---------------------------------------------------------------------------

const migration001: Migration = {
  version: 1,
  description: 'Initial schema: leads, drivers, brokers, loads, invoices, tasks, documents, users',
  up: (db) => {
    db.exec(
      'CREATE TABLE IF NOT EXISTS schema_version (' +
      '  version INTEGER PRIMARY KEY,' +
      '  applied_at TEXT NOT NULL DEFAULT (datetime(\'now\'))' +
      ');' +
      'CREATE TABLE IF NOT EXISTS leads (' +
      '  id INTEGER PRIMARY KEY AUTOINCREMENT,' +
      '  name TEXT NOT NULL, company TEXT, mc_number TEXT,' +
      '  phone TEXT, email TEXT, city TEXT, state TEXT,' +
      '  trailer_type TEXT, authority_date TEXT, source TEXT,' +
      '  status TEXT NOT NULL DEFAULT \'New\',' +
      '  priority TEXT NOT NULL DEFAULT \'Medium\',' +
      '  follow_up_date TEXT, notes TEXT,' +
      '  created_at TEXT NOT NULL DEFAULT (datetime(\'now\')),' +
      '  updated_at TEXT NOT NULL DEFAULT (datetime(\'now\'))' +
      ');' +
      'CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);' +
      'CREATE INDEX IF NOT EXISTS idx_leads_follow_up ON leads(follow_up_date);' +
      'CREATE TABLE IF NOT EXISTS drivers (' +
      '  id INTEGER PRIMARY KEY AUTOINCREMENT,' +
      '  name TEXT NOT NULL, company TEXT, mc_number TEXT, dot_number TEXT,' +
      '  phone TEXT, email TEXT, truck_type TEXT, trailer_type TEXT,' +
      '  home_base TEXT, preferred_lanes TEXT,' +
      '  min_rpm REAL, dispatch_percent REAL DEFAULT 7.0,' +
      '  factoring_company TEXT, insurance_expiry TEXT, start_date TEXT,' +
      '  status TEXT NOT NULL DEFAULT \'Active\',' +
      '  notes TEXT,' +
      '  created_at TEXT NOT NULL DEFAULT (datetime(\'now\')),' +
      '  updated_at TEXT NOT NULL DEFAULT (datetime(\'now\'))' +
      ');' +
      'CREATE INDEX IF NOT EXISTS idx_drivers_status ON drivers(status);' +
      'CREATE TABLE IF NOT EXISTS brokers (' +
      '  id INTEGER PRIMARY KEY AUTOINCREMENT,' +
      '  name TEXT NOT NULL, mc_number TEXT,' +
      '  phone TEXT, email TEXT,' +
      '  payment_terms INTEGER DEFAULT 30,' +
      '  credit_rating TEXT, avg_days_pay INTEGER,' +
      '  flag TEXT NOT NULL DEFAULT \'None\',' +
      '  notes TEXT,' +
      '  created_at TEXT NOT NULL DEFAULT (datetime(\'now\')),' +
      '  updated_at TEXT NOT NULL DEFAULT (datetime(\'now\'))' +
      ');' +
      'CREATE TABLE IF NOT EXISTS loads (' +
      '  id INTEGER PRIMARY KEY AUTOINCREMENT,' +
      '  load_id TEXT UNIQUE,' +
      '  driver_id INTEGER REFERENCES drivers(id) ON DELETE SET NULL,' +
      '  broker_id INTEGER REFERENCES brokers(id) ON DELETE SET NULL,' +
      '  origin_city TEXT, origin_state TEXT,' +
      '  dest_city TEXT, dest_state TEXT,' +
      '  pickup_date TEXT, delivery_date TEXT,' +
      '  miles REAL, rate REAL, dispatch_pct REAL,' +
      '  commodity TEXT,' +
      '  status TEXT NOT NULL DEFAULT \'Searching\',' +
      '  invoiced INTEGER DEFAULT 0,' +
      '  notes TEXT,' +
      '  created_at TEXT NOT NULL DEFAULT (datetime(\'now\')),' +
      '  updated_at TEXT NOT NULL DEFAULT (datetime(\'now\'))' +
      ');' +
      'CREATE INDEX IF NOT EXISTS idx_loads_status ON loads(status);' +
      'CREATE INDEX IF NOT EXISTS idx_loads_driver ON loads(driver_id);' +
      'CREATE INDEX IF NOT EXISTS idx_loads_delivery ON loads(delivery_date);' +
      'CREATE TABLE IF NOT EXISTS invoices (' +
      '  id INTEGER PRIMARY KEY AUTOINCREMENT,' +
      '  invoice_number TEXT UNIQUE NOT NULL,' +
      '  driver_id INTEGER REFERENCES drivers(id) ON DELETE SET NULL,' +
      '  week_ending TEXT, driver_gross REAL,' +
      '  dispatch_pct REAL, dispatch_fee REAL,' +
      '  sent_date TEXT, paid_date TEXT,' +
      '  status TEXT NOT NULL DEFAULT \'Draft\',' +
      '  notes TEXT,' +
      '  created_at TEXT NOT NULL DEFAULT (datetime(\'now\')),' +
      '  updated_at TEXT NOT NULL DEFAULT (datetime(\'now\'))' +
      ');' +
      'CREATE TABLE IF NOT EXISTS tasks (' +
      '  id INTEGER PRIMARY KEY AUTOINCREMENT,' +
      '  title TEXT NOT NULL, category TEXT,' +
      '  priority TEXT NOT NULL DEFAULT \'Medium\',' +
      '  due_date TEXT, time_of_day TEXT,' +
      '  recurring INTEGER DEFAULT 0,' +
      '  status TEXT NOT NULL DEFAULT \'Pending\',' +
      '  notes TEXT,' +
      '  created_at TEXT NOT NULL DEFAULT (datetime(\'now\'))' +
      ');' +
      'CREATE INDEX IF NOT EXISTS idx_tasks_due ON tasks(due_date);' +
      'CREATE TABLE IF NOT EXISTS documents (' +
      '  id INTEGER PRIMARY KEY AUTOINCREMENT,' +
      '  title TEXT NOT NULL, category TEXT, file_path TEXT,' +
      '  driver_id INTEGER REFERENCES drivers(id) ON DELETE SET NULL,' +
      '  doc_type TEXT, expiry_date TEXT,' +
      '  created_at TEXT NOT NULL DEFAULT (datetime(\'now\'))' +
      ');' +
      'CREATE TABLE IF NOT EXISTS users (' +
      '  id INTEGER PRIMARY KEY AUTOINCREMENT,' +
      '  name TEXT NOT NULL, email TEXT UNIQUE NOT NULL,' +
      '  role TEXT NOT NULL DEFAULT \'Dispatcher\',' +
      '  active INTEGER DEFAULT 1,' +
      '  created_at TEXT NOT NULL DEFAULT (datetime(\'now\'))' +
      ');' +
      'INSERT OR IGNORE INTO users (id, name, email, role)' +
      ' VALUES (1, \'Chris Hooks\', \'dispatch@ontrackhaulingsolutions.com\', \'Admin\');' +
      'INSERT OR IGNORE INTO schema_version (version) VALUES (1)'
    )
  }
}

// ---------------------------------------------------------------------------
// Migration 002 -- Add missing columns; add 6 new tables
// ---------------------------------------------------------------------------

const migration002: Migration = {
  version: 2,
  description: 'Add missing columns; driver_documents, task_completions, notes, app_settings, backups, audit_log',
  up: (db) => {
    addColumnIfMissing(db, 'drivers',  'cdl_number',       'TEXT')
    addColumnIfMissing(db, 'drivers',  'cdl_expiry',       'TEXT')
    addColumnIfMissing(db, 'users',    'theme_preference', 'TEXT NOT NULL DEFAULT \'system\'')
    addColumnIfMissing(db, 'users',    'last_login_at',    'TEXT')
    addColumnIfMissing(db, 'users',    'updated_at',       "TEXT NOT NULL DEFAULT ''")
    addColumnIfMissing(db, 'tasks',    'updated_at',       "TEXT NOT NULL DEFAULT ''")
    addColumnIfMissing(db, 'tasks',    'assigned_to',      'INTEGER REFERENCES users(id) ON DELETE SET NULL')
    addColumnIfMissing(db, 'invoices', 'load_id',          'INTEGER REFERENCES loads(id) ON DELETE SET NULL')
    db.exec(
      'CREATE TABLE IF NOT EXISTS driver_documents (' +
      '  id INTEGER PRIMARY KEY AUTOINCREMENT,' +
      '  driver_id INTEGER NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,' +
      '  title TEXT NOT NULL,' +
      '  doc_type TEXT NOT NULL DEFAULT \'Other\',' +
      '  file_path TEXT, expiry_date TEXT, notes TEXT,' +
      '  created_at TEXT NOT NULL DEFAULT (datetime(\'now\'))' +
      ');' +
      'CREATE INDEX IF NOT EXISTS idx_driver_docs_driver ON driver_documents(driver_id);' +
      'CREATE TABLE IF NOT EXISTS task_completions (' +
      '  id INTEGER PRIMARY KEY AUTOINCREMENT,' +
      '  task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,' +
      '  completed_date TEXT NOT NULL,' +
      '  completed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,' +
      '  created_at TEXT NOT NULL DEFAULT (datetime(\'now\'))' +
      ');' +
      'CREATE UNIQUE INDEX IF NOT EXISTS idx_task_comp_unique ON task_completions(task_id, completed_date);' +
      'CREATE TABLE IF NOT EXISTS notes (' +
      '  id INTEGER PRIMARY KEY AUTOINCREMENT,' +
      '  entity_type TEXT NOT NULL,' +
      '  entity_id INTEGER NOT NULL,' +
      '  content TEXT NOT NULL,' +
      '  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,' +
      '  created_at TEXT NOT NULL DEFAULT (datetime(\'now\'))' +
      ');' +
      'CREATE INDEX IF NOT EXISTS idx_notes_entity ON notes(entity_type, entity_id);' +
      'CREATE TABLE IF NOT EXISTS app_settings (' +
      '  id INTEGER PRIMARY KEY AUTOINCREMENT,' +
      '  key TEXT UNIQUE NOT NULL,' +
      '  value TEXT,' +
      '  updated_at TEXT NOT NULL DEFAULT (datetime(\'now\'))' +
      ');' +
      'CREATE TABLE IF NOT EXISTS backups (' +
      '  id INTEGER PRIMARY KEY AUTOINCREMENT,' +
      '  filename TEXT NOT NULL,' +
      '  file_path TEXT NOT NULL,' +
      '  size_bytes INTEGER,' +
      '  created_at TEXT NOT NULL DEFAULT (datetime(\'now\'))' +
      ');' +
      'CREATE TABLE IF NOT EXISTS audit_log (' +
      '  id INTEGER PRIMARY KEY AUTOINCREMENT,' +
      '  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,' +
      '  entity_type TEXT NOT NULL,' +
      '  entity_id INTEGER,' +
      '  action TEXT NOT NULL,' +
      '  old_values TEXT, new_values TEXT,' +
      '  created_at TEXT NOT NULL DEFAULT (datetime(\'now\'))' +
      ');' +
      'CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_log(entity_type, entity_id);' +
      'INSERT OR IGNORE INTO schema_version (version) VALUES (2)'
    )
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export const MIGRATIONS: Migration[] = [migration001, migration002]

export function runMigrations(db: Database.Database): void {
  // Ensure schema_version table exists before checking applied versions
  db.exec(
    'CREATE TABLE IF NOT EXISTS schema_version (' +
    '  version INTEGER PRIMARY KEY,' +
    '  applied_at TEXT NOT NULL DEFAULT (datetime(\'now\'))' +
    ')'
  )
  const applied = new Set(
    (db.prepare('SELECT version FROM schema_version').all() as Array<{ version: number }>)
      .map(r => r.version)
  )
  for (const m of MIGRATIONS) {
    if (!applied.has(m.version)) {
      console.log('[DB] Applying migration', m.version, ':', m.description)
      m.up(db)
    }
  }
}
