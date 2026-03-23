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
// Migration 003 -- Add content + updated_at to documents table
// ---------------------------------------------------------------------------

const migration003: Migration = {
  version: 3,
  description: 'Add content and updated_at columns to documents table',
  up: (db) => {
    addColumnIfMissing(db, 'documents', 'content',    'TEXT')
    addColumnIfMissing(db, 'documents', 'updated_at', "TEXT NOT NULL DEFAULT ''")
    db.exec("INSERT OR IGNORE INTO schema_version (version) VALUES (3)")
  }
}

// ---------------------------------------------------------------------------
// Migration 004 -- Add current_location to drivers table
// ---------------------------------------------------------------------------

const migration004: Migration = {
  version: 4,
  description: 'Add current_location column to drivers (nullable, cleared on load assignment)',
  up: (db) => {
    addColumnIfMissing(db, 'drivers', 'current_location', 'TEXT')
    db.exec("INSERT OR IGNORE INTO schema_version (version) VALUES (4)")
  }
}

// ---------------------------------------------------------------------------
// Migration 005 -- Add updated_at to notes and driver_documents
// Required for future cloud sync / conflict resolution (last-write-wins).
// ---------------------------------------------------------------------------

const migration005: Migration = {
  version: 5,
  description: 'Add updated_at to notes and driver_documents for sync readiness',
  up: (db) => {
    addColumnIfMissing(db, 'notes',            'updated_at', "TEXT NOT NULL DEFAULT ''")
    addColumnIfMissing(db, 'driver_documents', 'updated_at', "TEXT NOT NULL DEFAULT ''")
    db.exec("INSERT OR IGNORE INTO schema_version (version) VALUES (5)")
  }
}

// ---------------------------------------------------------------------------
// Migration 006 -- Add dot_number to leads; backfill FMCSA-imported records
//
// Problem: the FMCSA importer was storing "DOT-XXXXXXX" in mc_number because
// the QC name-search API only returns dotNumber, not MC numbers.
// This migration:
//   1. Adds dot_number TEXT column to leads
//   2. Moves the numeric part of any "DOT-XXXXXXX" value out of mc_number and
//      into dot_number (so existing FMCSA leads are re-mapped correctly)
//   3. Clears mc_number for those rows (it was never a real MC number)
// Future imports write the real MC number into mc_number and the DOT into
// dot_number as separate, properly-labelled fields.
// ---------------------------------------------------------------------------

const migration006: Migration = {
  version: 6,
  description: 'Add dot_number to leads; backfill FMCSA DOT values from mc_number',
  up: (db) => {
    addColumnIfMissing(db, 'leads', 'dot_number', 'TEXT')
    db.exec(
      // Backfill: strip the "DOT-" prefix and write into dot_number
      "UPDATE leads SET dot_number = SUBSTR(mc_number, 5)" +
      "  WHERE source = 'FMCSA' AND mc_number LIKE 'DOT-%';" +
      // Clear mc_number for these rows — it was never a real MC number
      "UPDATE leads SET mc_number = NULL" +
      "  WHERE source = 'FMCSA' AND mc_number LIKE 'DOT-%';" +
      "CREATE INDEX IF NOT EXISTS idx_leads_dot_number ON leads(dot_number);" +
      "INSERT OR IGNORE INTO schema_version (version) VALUES (6)"
    )
  }
}

// ---------------------------------------------------------------------------
// Migration 007 -- Add fleet_size to leads
//
// Stores the number of Power Units reported on SAFER (scraped during FMCSA
// import). Used by computePriority() to identify small fleets (1–3 trucks).
// ---------------------------------------------------------------------------

const migration007: Migration = {
  version: 7,
  description: 'Add fleet_size column to leads for FMCSA Power Units data',
  up: (db) => {
    addColumnIfMissing(db, 'leads', 'fleet_size', 'INTEGER')
    db.exec("INSERT OR IGNORE INTO schema_version (version) VALUES (7)")
  }
}

// ---------------------------------------------------------------------------
// Migration 008 -- Add marketing_groups table
//
// Stores Facebook/social group rotation for the Marketing tab.
// Tracks when each group was last posted to, so the dispatcher knows
// which groups are "due" for a post today.
// ---------------------------------------------------------------------------

const migration008: Migration = {
  version: 8,
  description: 'Add marketing_groups table for social posting rotation tracker',
  up: (db) => {
    db.exec(
      'CREATE TABLE IF NOT EXISTS marketing_groups (' +
      '  id INTEGER PRIMARY KEY AUTOINCREMENT,' +
      '  name TEXT NOT NULL,' +
      '  url TEXT,' +
      '  platform TEXT NOT NULL DEFAULT \'Facebook\',' +
      '  last_posted_at TEXT,' +   // YYYY-MM-DD
      '  notes TEXT,' +
      '  created_at TEXT NOT NULL DEFAULT (datetime(\'now\'))' +
      ');' +
      "INSERT OR IGNORE INTO schema_version (version) VALUES (8)"
    )
  }
}

// ---------------------------------------------------------------------------
// Migration 009 -- Expand marketing: post log table + group tag/active columns
//
// marketing_post_log: one row per posting action, drives anti-repetition and
// outcome tracking (replies, leads generated).
// marketing_groups gains truck_type_tags, region_tags, and active flag for
// smarter group suggestions.
// ---------------------------------------------------------------------------

const migration009: Migration = {
  version: 9,
  description: 'Add marketing_post_log table; add truck_type_tags, region_tags, active to marketing_groups',
  up: (db) => {
    addColumnIfMissing(db, 'marketing_groups', 'truck_type_tags', "TEXT NOT NULL DEFAULT '[]'")
    addColumnIfMissing(db, 'marketing_groups', 'region_tags',     "TEXT NOT NULL DEFAULT '[]'")
    addColumnIfMissing(db, 'marketing_groups', 'active',          'INTEGER NOT NULL DEFAULT 1')
    db.exec(
      'CREATE TABLE IF NOT EXISTS marketing_post_log (' +
      '  id INTEGER PRIMARY KEY AUTOINCREMENT,' +
      '  template_id TEXT NOT NULL,' +
      '  category TEXT NOT NULL,' +
      '  truck_type TEXT,' +
      '  used_date TEXT NOT NULL,' +
      '  groups_posted_to TEXT NOT NULL DEFAULT \'[]\'' + ',' +
      '  posted INTEGER NOT NULL DEFAULT 0,' +
      '  replies_count INTEGER NOT NULL DEFAULT 0,' +
      '  leads_generated INTEGER NOT NULL DEFAULT 0,' +
      '  notes TEXT,' +
      '  created_at TEXT NOT NULL DEFAULT (datetime(\'now\'))' +
      ');' +
      'CREATE INDEX IF NOT EXISTS idx_post_log_date ON marketing_post_log(used_date);' +
      "INSERT OR IGNORE INTO schema_version (version) VALUES (9)"
    )
  }
}

// ---------------------------------------------------------------------------
// Migration 010 -- fb_conversations (Facebook Conversation/Conversion Agent)
// ---------------------------------------------------------------------------

const migration010: Migration = {
  version: 10,
  description: 'Add fb_conversations table for Facebook Conversation Agent (Agent 1)',
  up: (db) => {
    db.exec(
      'CREATE TABLE IF NOT EXISTS fb_conversations (' +
      '  id INTEGER PRIMARY KEY AUTOINCREMENT,' +
      '  lead_id INTEGER REFERENCES leads(id) ON DELETE SET NULL,' +
      '  name TEXT NOT NULL,' +
      '  phone TEXT,' +
      '  platform TEXT NOT NULL DEFAULT \'Facebook\',' +
      '  stage TEXT NOT NULL DEFAULT \'New\',' +
      '  last_message TEXT,' +
      '  last_message_at TEXT,' +
      '  follow_up_at TEXT,' +
      '  notes TEXT,' +
      '  created_at TEXT NOT NULL DEFAULT (datetime(\'now\')),' +
      '  updated_at TEXT NOT NULL DEFAULT (datetime(\'now\'))' +
      ');' +
      'CREATE INDEX IF NOT EXISTS idx_fb_conv_stage ON fb_conversations(stage);' +
      'CREATE INDEX IF NOT EXISTS idx_fb_conv_follow_up ON fb_conversations(follow_up_at);' +
      "INSERT OR IGNORE INTO schema_version (version) VALUES (10)"
    )
  }
}

// ---------------------------------------------------------------------------
// Migration 011 -- fb_posts (Facebook Lead Hunter Agent)
// ---------------------------------------------------------------------------

const migration011: Migration = {
  version: 11,
  description: 'Add fb_posts table for Facebook Lead Hunter Agent (Agent 2)',
  up: (db) => {
    db.exec(
      'CREATE TABLE IF NOT EXISTS fb_posts (' +
      '  id INTEGER PRIMARY KEY AUTOINCREMENT,' +
      '  raw_text TEXT NOT NULL,' +
      '  author_name TEXT,' +
      '  group_name TEXT,' +
      '  posted_at TEXT,' +
      '  intent TEXT,' +
      '  extracted_name TEXT,' +
      '  extracted_phone TEXT,' +
      '  extracted_location TEXT,' +
      '  extracted_equipment TEXT,' +
      '  recommended_action TEXT,' +
      '  draft_comment TEXT,' +
      '  draft_dm TEXT,' +
      '  lead_id INTEGER REFERENCES leads(id) ON DELETE SET NULL,' +
      '  status TEXT NOT NULL DEFAULT \'queued\',' +
      '  created_at TEXT NOT NULL DEFAULT (datetime(\'now\'))' +
      ');' +
      'CREATE INDEX IF NOT EXISTS idx_fb_posts_status ON fb_posts(status);' +
      'CREATE INDEX IF NOT EXISTS idx_fb_posts_intent ON fb_posts(intent);' +
      "INSERT OR IGNORE INTO schema_version (version) VALUES (11)"
    )
  }
}

// ---------------------------------------------------------------------------
// Migration 012 -- fb_post_queue (Facebook Content Agent)
// ---------------------------------------------------------------------------

const migration012: Migration = {
  version: 12,
  description: 'Add fb_post_queue table for Facebook Content + Posting Agent (Agent 3)',
  up: (db) => {
    db.exec(
      'CREATE TABLE IF NOT EXISTS fb_post_queue (' +
      '  id INTEGER PRIMARY KEY AUTOINCREMENT,' +
      '  content TEXT NOT NULL,' +
      '  category TEXT NOT NULL,' +
      '  variation_of INTEGER REFERENCES fb_post_queue(id) ON DELETE SET NULL,' +
      '  scheduled_for TEXT,' +
      '  group_ids TEXT NOT NULL DEFAULT \'[]\',' +
      '  status TEXT NOT NULL DEFAULT \'draft\',' +
      '  posted_at TEXT,' +
      '  created_at TEXT NOT NULL DEFAULT (datetime(\'now\'))' +
      ');' +
      'CREATE INDEX IF NOT EXISTS idx_fb_queue_status ON fb_post_queue(status);' +
      'CREATE INDEX IF NOT EXISTS idx_fb_queue_scheduled ON fb_post_queue(scheduled_for);' +
      "INSERT OR IGNORE INTO schema_version (version) VALUES (12)"
    )
  }
}

// ---------------------------------------------------------------------------
// Migration 013 -- Extend marketing_groups for Facebook Groups workflow
//
// Adds five new columns used by the group recommendation engine:
//   category            — content category (hotshot, box_truck, owner_operator, etc.)
//   priority            — posting priority (High, Medium, Low)
//   last_reviewed_at    — YYYY-MM-DD when Chris last reviewed this group's health
//   leads_generated_count — total leads attributed to this group (manually updated)
//   signed_drivers_count  — total signed drivers attributed (manually updated)
// ---------------------------------------------------------------------------

const migration013: Migration = {
  version: 13,
  description: 'Add category, priority, last_reviewed_at, leads_generated_count, signed_drivers_count to marketing_groups',
  up: (db) => {
    addColumnIfMissing(db, 'marketing_groups', 'category',               "TEXT NOT NULL DEFAULT 'mixed'")
    addColumnIfMissing(db, 'marketing_groups', 'priority',               "TEXT NOT NULL DEFAULT 'Medium'")
    addColumnIfMissing(db, 'marketing_groups', 'last_reviewed_at',       'TEXT')
    addColumnIfMissing(db, 'marketing_groups', 'leads_generated_count',  'INTEGER NOT NULL DEFAULT 0')
    addColumnIfMissing(db, 'marketing_groups', 'signed_drivers_count',   'INTEGER NOT NULL DEFAULT 0')
    db.exec("INSERT OR IGNORE INTO schema_version (version) VALUES (13)")
  }
}

// ---------------------------------------------------------------------------
// Migration 014 -- Update task notes to use [[doc]] cross-reference links
// Runs once. Adds [[Document Name]] links to seed tasks that reference SOPs
// so the dashboard can render them as clickable doc-modal openers.
// ---------------------------------------------------------------------------

const migration014: Migration = {
  version: 14,
  description: 'Update task notes with [[doc]] cross-reference links for dashboard subtask display',
  up: (db) => {
    db.prepare('UPDATE tasks SET notes = ? WHERE id = 116').run(
      'Run FMCSA import or review leads imported from the past week.\n' +
      '1. Go to Leads page and click FMCSA Import\n' +
      '2. Score each new lead: fleet size, trailer type, and lane match\n' +
      '3. Assign follow-up dates -- High = 2 days, Medium = 5 days, Low = 10 days\n' +
      '4. Move leads you have already spoken with to Contacted status\n' +
      '5. Archive dead leads as Rejected with a reason note\n' +
      'See: [[FMCSA Lead Review Checklist]]'
    )
    db.prepare('UPDATE tasks SET notes = ? WHERE id = 117').run(
      'Call or message all Contacted and Interested leads that have not responded in 3+ days.\n' +
      '1. Pull all leads with status Contacted or Interested and a follow-up date on or before today\n' +
      '2. Phone or text each lead using the follow-up script\n' +
      '3. Log the outcome in the lead notes immediately after each call\n' +
      '4. Goal: at least 2 new Interested leads per session\n' +
      '5. After 3 unanswered attempts, mark the lead as Rejected with note "No response after 3 attempts"\n' +
      'See: [[Warm Lead Follow-Up Script]]'
    )
    db.prepare('UPDATE tasks SET notes = ? WHERE id = 119').run(
      'Review and update the Facebook groups list every Sunday.\n' +
      '1. Go to Marketing > Groups and check the Category Coverage panel for gaps\n' +
      '2. Save your Facebook Groups page as HTML and import it into the app (see doc below)\n' +
      '3. Check for inactive or low-performing groups and deactivate them\n' +
      '4. Search Facebook for new groups in any underweight categories\n' +
      '5. Add new groups found manually via the Add Group button\n' +
      '6. Mark this task complete when done\n' +
      'See: [[How to Update Facebook Groups]] | [[How to Save Facebook Groups as HTML]]'
    )
    db.prepare('UPDATE tasks SET notes = ? WHERE id = 111').run(
      'Morning sweep -- search Facebook groups for owner-operators looking for dispatch.\n' +
      '1. Open each group in your target list and search for recent posts\n' +
      '2. Keywords: looking for dispatcher, need dispatch, seeking dispatch service\n' +
      '3. Send a brief DM to any promising post authors\n' +
      '4. Log every new contact in the Leads page with status New\n' +
      'See: [[Facebook Driver Search SOP]]'
    )
    db.prepare('UPDATE tasks SET notes = ? WHERE id = 113').run(
      'Second pass through Facebook groups -- catch anything missed in the morning.\n' +
      '1. Check all groups for posts made in the last 2 hours\n' +
      '2. Use the same keywords: available truck, looking for loads, need a dispatcher\n' +
      '3. Message any new prospects and add them to Leads\n' +
      'See: [[Facebook Driver Search SOP]]'
    )
    db.exec("INSERT OR IGNORE INTO schema_version (version) VALUES (14)")
  }
}

// ---------------------------------------------------------------------------
// Migration 015 -- Deduplicate marketing_groups + add unique index on name
//
// Fixes the root cause of duplicate groups appearing in the Marketing page:
// the table had no UNIQUE constraint, so INSERT OR IGNORE never triggered and
// every HTML import or seedGroups call added fresh duplicate rows.
//
// Step 1: Remove duplicate rows, keeping the one with the lowest id for each
//         case-insensitive trimmed name (preserves the earliest import).
// Step 2: Create a unique index on LOWER(TRIM(name)) so INSERT OR IGNORE now
//         correctly skips any name that already exists.
// ---------------------------------------------------------------------------

const migration015: Migration = {
  version: 15,
  description: 'Deduplicate marketing_groups and add unique name index to prevent future duplicates',
  up: (db) => {
    // Remove duplicates — keep the row with the smallest id per unique name
    db.exec(
      'DELETE FROM marketing_groups ' +
      'WHERE id NOT IN (' +
      '  SELECT MIN(id) FROM marketing_groups GROUP BY LOWER(TRIM(name))' +
      ')'
    )
    // Create unique index so INSERT OR IGNORE works correctly going forward
    db.exec(
      'CREATE UNIQUE INDEX IF NOT EXISTS uq_marketing_groups_name ' +
      'ON marketing_groups (LOWER(TRIM(name)))'
    )
    db.exec("INSERT OR IGNORE INTO schema_version (version) VALUES (15)")
  }
}

// ---------------------------------------------------------------------------
// Migration 016 -- Add load_timeline_events table
//
// Stores the Active Load Timeline and Check Call Engine data.
// One row per event (status change, check call, or dispatcher note) per load.
// Linked to loads via ON DELETE CASCADE so events are cleaned up with the load.
// ---------------------------------------------------------------------------

const migration016: Migration = {
  version: 16,
  description: 'Add load_timeline_events table for Active Load Timeline and Check Call Engine',
  up: (db) => {
    db.exec(
      'CREATE TABLE IF NOT EXISTS load_timeline_events (' +
      '  id INTEGER PRIMARY KEY AUTOINCREMENT,' +
      '  load_id INTEGER NOT NULL REFERENCES loads(id) ON DELETE CASCADE,' +
      '  event_type TEXT NOT NULL DEFAULT \'check_call\',' +
      '  label TEXT NOT NULL,' +
      '  scheduled_at TEXT,' +
      '  completed_at TEXT,' +
      '  notes TEXT,' +
      '  created_at TEXT NOT NULL DEFAULT (datetime(\'now\'))' +
      ');' +
      'CREATE INDEX IF NOT EXISTS idx_timeline_load  ON load_timeline_events(load_id);' +
      'CREATE INDEX IF NOT EXISTS idx_timeline_sched ON load_timeline_events(scheduled_at);' +
      "INSERT OR IGNORE INTO schema_version (version) VALUES (16)"
    )
  }
}

// ---------------------------------------------------------------------------
// Migration 017 -- Add broker_id to invoices
//
// Invoices had no linkage to the brokers table. Adding broker_id so invoices
// can be filtered and attributed per broker without joining through loads.
// ---------------------------------------------------------------------------

const migration017: Migration = {
  version: 17,
  description: 'Add broker_id FK to invoices table',
  up: (db) => {
    addColumnIfMissing(db, 'invoices', 'broker_id', 'INTEGER REFERENCES brokers(id) ON DELETE SET NULL')
    db.exec("INSERT OR IGNORE INTO schema_version (version) VALUES (17)")
  }
}

// ---------------------------------------------------------------------------
// Migration 018 -- Add trailer_type to loads
//
// Loads did not record the trailer type required by the load. Adding this
// field enables driver-to-load equipment matching in Load Match.
// ---------------------------------------------------------------------------

const migration018: Migration = {
  version: 18,
  description: 'Add trailer_type column to loads table',
  up: (db) => {
    addColumnIfMissing(db, 'loads', 'trailer_type', 'TEXT')
    db.exec("INSERT OR IGNORE INTO schema_version (version) VALUES (18)")
  }
}

// ---------------------------------------------------------------------------
// Migration 019 -- Add outreach tracking fields to leads
//
// Enables the lead follow-up workflow: tracks how many times a lead has been
// contacted, when they were last reached, by what method, the outcome, and
// quick follow-up notes separate from the general notes field.
// ---------------------------------------------------------------------------

const migration019: Migration = {
  version: 19,
  description: 'Add outreach tracking fields to leads: last_contact_date, contact_attempt_count, contact_method, outreach_outcome, follow_up_notes',
  up: (db) => {
    addColumnIfMissing(db, 'leads', 'last_contact_date',     'TEXT')
    addColumnIfMissing(db, 'leads', 'contact_attempt_count', 'INTEGER NOT NULL DEFAULT 0')
    addColumnIfMissing(db, 'leads', 'contact_method',        'TEXT')
    addColumnIfMissing(db, 'leads', 'outreach_outcome',      'TEXT')
    addColumnIfMissing(db, 'leads', 'follow_up_notes',       'TEXT')
    db.exec("INSERT OR IGNORE INTO schema_version (version) VALUES (19)")
  }
}

// ---------------------------------------------------------------------------
// Migration 020 -- Add Facebook Group Post Protocol document + daily task
//
// Creates a reference document listing algorithm-training search terms to use
// before posting in Facebook groups each day, and a recurring Daily task that
// walks through the steps with an inline [[doc link]] to open the document
// from the Operations page without leaving the checklist.
//
// Both inserts are guarded with WHERE NOT EXISTS so re-running is safe.
// ---------------------------------------------------------------------------

const FB_PROTOCOL_DOC = `# Facebook Group Post Protocol

Before posting in any group, spend 2-3 minutes searching relevant terms in that group's search bar. This signals to the algorithm that your account is active in that content category before your post appears, which improves early distribution.

## Steps (per group, per post)

1. Open the group
2. Use the group's internal search bar — not Facebook's main search bar
3. Search 2-3 terms from the list below
4. Like or leave a brief comment on 1-2 recent results
5. Wait 1-2 minutes, then post your content for that group
6. Log the post on the Marketing page to update the group's last posted date

## Search Terms

**Dispatch and services**
- looking for a dispatcher
- need a dispatcher
- dispatcher services
- dispatch help

**Freight and loads**
- freight available
- loads available
- load board
- spot market
- rates are down

**Owner operators**
- owner operator
- running my own authority
- new authority
- got my MC number
- owner op looking for loads
- need loads

**Reefer**
- reefer loads
- temperature controlled freight
- reefer dispatch

**Dry van**
- dry van loads
- dry van lanes
- 53 foot available

**Flatbed and specialized**
- flatbed loads
- step deck available
- flatbed dispatch

**Hotshot**
- hotshot loads
- hotshot dispatch
- CDL hotshot

**General engagement**
- trucking business
- freight market
- trucking community
- trucking tips`

const FB_PROTOCOL_TASK_NOTES =
  '- Open the Marketing page and check today\'s 5 suggested groups [[Facebook Group Post Protocol]]\n' +
  '- In each group: search 2-3 terms from the protocol before posting\n' +
  '- Post your template for the group\n' +
  '- Log each post on the Marketing page to update last posted date'

const migration020: Migration = {
  version: 20,
  description: 'Add Facebook Group Post Protocol document and daily group posting task',
  up: (db) => {
    db.prepare(
      'INSERT INTO documents (title, category, content) ' +
      'SELECT ?, ?, ? WHERE NOT EXISTS (' +
      '  SELECT 1 FROM documents WHERE LOWER(TRIM(title)) = LOWER(TRIM(?))' +
      ')'
    ).run('Facebook Group Post Protocol', 'SOP', FB_PROTOCOL_DOC, 'Facebook Group Post Protocol')

    const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
    db.prepare(
      'INSERT INTO tasks (title, category, priority, due_date, time_of_day, recurring, status, notes, updated_at) ' +
      'SELECT ?, ?, ?, ?, ?, ?, ?, ?, ? WHERE NOT EXISTS (' +
      '  SELECT 1 FROM tasks WHERE LOWER(TRIM(title)) = LOWER(TRIM(?))' +
      ')'
    ).run(
      'Post in today\'s 5 Facebook groups', 'Marketing', 'Medium',
      'Daily', '9:00 AM', 1, 'Pending',
      FB_PROTOCOL_TASK_NOTES, now,
      'Post in today\'s 5 Facebook groups'
    )

    db.exec('INSERT OR IGNORE INTO schema_version (version) VALUES (20)')
  },
}

// ---------------------------------------------------------------------------
// Migration 021 — follow-up time reminders
// ---------------------------------------------------------------------------

const migration021: Migration = {
  version: 21,
  description: 'Add follow_up_time to leads for time-specific follow-up reminders',
  up: (db) => {
    addColumnIfMissing(db, 'leads', 'follow_up_time', 'TEXT')
    db.exec("INSERT OR IGNORE INTO schema_version (version) VALUES (21)")
  },
}

const migration022: Migration = {
  version: 22,
  description: 'Add trailer_length to leads and drivers tables',
  up: (db) => {
    addColumnIfMissing(db, 'leads',   'trailer_length', 'TEXT')
    addColumnIfMissing(db, 'drivers', 'trailer_length', 'TEXT')
    db.exec("INSERT OR IGNORE INTO schema_version (version) VALUES (22)")
  },
}

const migration023: Migration = {
  version: 23,
  description: 'Add authority_date to drivers; new_authority and min_authority_days to brokers',
  up: (db) => {
    addColumnIfMissing(db, 'drivers', 'authority_date',    'TEXT')
    addColumnIfMissing(db, 'brokers', 'new_authority',      'INTEGER NOT NULL DEFAULT 0')
    addColumnIfMissing(db, 'brokers', 'min_authority_days', 'INTEGER')
    db.exec("INSERT OR IGNORE INTO schema_version (version) VALUES (23)")
  },
}

// ---------------------------------------------------------------------------
// Migration 024 -- Remove manual FB driver search sweep tasks
//
// Tasks 111 (Facebook Driver Search Sweep), 113 (Driver Post Search Sweep),
// and 115 (Final Driver Lead Sweep) are replaced by automated scheduler
// notifications that fire at 7 AM, 10 AM, 1 PM, and 4 PM on weekdays.
// Removing them from the daily checklist cleans up the Operations checklist.
// ---------------------------------------------------------------------------

const migration024: Migration = {
  version: 24,
  description: 'Remove manual FB driver search sweep tasks (111, 113, 115) — replaced by scheduler notifications',
  up: (db) => {
    db.prepare('DELETE FROM tasks WHERE id IN (111, 113, 115)').run()
    // Also remove any completion records for these tasks
    db.prepare('DELETE FROM task_completions WHERE task_id IN (111, 113, 115)').run()
    db.exec("INSERT OR IGNORE INTO schema_version (version) VALUES (24)")
  },
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export const MIGRATIONS: Migration[] = [migration001, migration002, migration003, migration004, migration005, migration006, migration007, migration008, migration009, migration010, migration011, migration012, migration013, migration014, migration015, migration016, migration017, migration018, migration019, migration020, migration021, migration022, migration023, migration024]

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
      db.transaction(() => m.up(db))()
    }
  }
}
