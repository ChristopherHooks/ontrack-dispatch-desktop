/**
 * extract-seed.js
 *
 * Reads your live OnTrack database and prints TypeScript INSERT OR IGNORE
 * statements for all tasks and documents, ready to paste into seed.ts.
 *
 * Usage (run from the app folder):
 *   node scripts/extract-seed.js
 *
 * The script auto-detects the database path from the default Electron
 * userData location. If your app uses a custom data path you can override:
 *   ONTRACK_DB=C:\path\to\database.db node scripts/extract-seed.js
 */

const path   = require('path')
const os     = require('os')
const fs     = require('fs')

// ── Locate the database ───────────────────────────────────────────────────────

function getDefaultDbPath() {
  const platform = process.platform
  let userData

  if (platform === 'win32') {
    userData = process.env.APPDATA
      ? path.join(process.env.APPDATA, 'ontrack-dispatch-dashboard')
      : path.join(os.homedir(), 'AppData', 'Roaming', 'ontrack-dispatch-dashboard')
  } else if (platform === 'darwin') {
    userData = path.join(os.homedir(), 'Library', 'Application Support', 'ontrack-dispatch-dashboard')
  } else {
    userData = path.join(os.homedir(), '.config', 'ontrack-dispatch-dashboard')
  }

  return path.join(userData, 'OnTrackDashboard', 'database.db')
}

const dbPath = process.env.ONTRACK_DB || getDefaultDbPath()

if (!fs.existsSync(dbPath)) {
  console.error('Database not found at:', dbPath)
  console.error('Run the app at least once to create it, or set ONTRACK_DB=/path/to/database.db')
  process.exit(1)
}

console.error('Reading database from:', dbPath)

// ── Open the database ─────────────────────────────────────────────────────────

let Database
try {
  Database = require('better-sqlite3')
} catch {
  console.error('better-sqlite3 not found. Run: npm install  (from the app folder)')
  process.exit(1)
}

const db = new Database(dbPath, { readonly: true })

// ── Escape helpers ────────────────────────────────────────────────────────────

function esc(val) {
  if (val === null || val === undefined) return 'null'
  if (typeof val === 'number') return String(val)
  // Escape single quotes and backslashes for a JS template literal string
  return "'" + String(val).replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'"
}

function escStr(val) {
  if (val === null || val === undefined) return 'null'
  // Escape for embedding inside single quotes in a JS string
  return String(val).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n')
}

// ── Tasks ─────────────────────────────────────────────────────────────────────

const tasks = db.prepare(
  'SELECT id, title, category, priority, due_date, time_of_day, recurring, status, notes ' +
  'FROM tasks ORDER BY id'
).all()

console.log('// ── TASKS (extracted from live database) ──────────────────────────────────')
console.log('function seedTasks(db: Database.Database): void {')
console.log('  const ins = db.prepare(')
console.log("    'INSERT OR IGNORE INTO tasks (id, title, category, priority, due_date, time_of_day, recurring, status, notes)' +")
console.log("    ' VALUES (?,?,?,?,?,?,?,?,?)'")
console.log('  )')
console.log()

for (const t of tasks) {
  const notes = t.notes ? escStr(t.notes) : null
  const notesArg = notes !== null ? `'${notes}'` : 'null'
  const args = [
    t.id,
    `'${escStr(t.title)}'`,
    `'${escStr(t.category)}'`,
    `'${escStr(t.priority)}'`,
    t.due_date ? `'${escStr(t.due_date)}'` : 'null',
    t.time_of_day ? `'${escStr(t.time_of_day)}'` : 'null',
    t.recurring,
    `'${escStr(t.status)}'`,
    notesArg,
  ].join(',')
  console.log(`  ins.run(${args})`)
}

console.log('}')
console.log()

// ── Documents ─────────────────────────────────────────────────────────────────

const docs = db.prepare(
  'SELECT id, title, category, content, driver_id, doc_type, expiry_date ' +
  'FROM documents ORDER BY id'
).all()

console.log('// ── DOCUMENTS (extracted from live database) ──────────────────────────────')
console.log('function seedDocuments(db: Database.Database): void {')
console.log('  const ins = db.prepare(')
console.log("    'INSERT OR IGNORE INTO documents (id, title, category, content, driver_id, doc_type, expiry_date)' +")
console.log("    ' VALUES (?,?,?,?,?,?,?)'")
console.log('  )')
console.log()

for (const d of docs) {
  const content  = d.content  ? escStr(d.content)  : null
  const docType  = d.doc_type ? escStr(d.doc_type)  : null
  const expiry   = d.expiry_date ? escStr(d.expiry_date) : null
  const args = [
    d.id,
    `'${escStr(d.title)}'`,
    `'${escStr(d.category)}'`,
    content  !== null ? `'${content}'`  : 'null',
    d.driver_id !== null && d.driver_id !== undefined ? d.driver_id : 'null',
    docType  !== null ? `'${docType}'`  : 'null',
    expiry   !== null ? `'${expiry}'`   : 'null',
  ].join(',')
  console.log(`  ins.run(${args})`)
}

console.log('}')

db.close()
console.error('\nDone. Paste the output above into seed.ts, replacing the existing seedTasks() and seedDocuments() functions.')
