/**
 * fix-doc-categories.js
 *
 * Directly updates document categories in the live OnTrack database.
 * Run from the app folder:
 *   node scripts/fix-doc-categories.js
 *
 * The script auto-detects the database path. Pass a custom path as an argument:
 *   node scripts/fix-doc-categories.js "C:\path\to\database.db"
 */

const path = require('path')
const fs   = require('fs')

// ---------------------------------------------------------------------------
// Locate the database
// ---------------------------------------------------------------------------
function findDbPath() {
  // Explicit argument
  if (process.argv[2]) return process.argv[2]

  // Auto-detect Windows APPDATA path
  const appData = process.env.APPDATA
  if (appData) {
    const candidate = path.join(appData, 'OnTrack Dispatch Dashboard', 'OnTrackDashboard', 'database.db')
    if (fs.existsSync(candidate)) return candidate
  }

  // Try USERPROFILE as fallback
  const userProfile = process.env.USERPROFILE
  if (userProfile) {
    const candidate = path.join(userProfile, 'AppData', 'Roaming', 'OnTrack Dispatch Dashboard', 'OnTrackDashboard', 'database.db')
    if (fs.existsSync(candidate)) return candidate
  }

  return null
}

// ---------------------------------------------------------------------------
// Category assignments — id → new category
// ---------------------------------------------------------------------------
const ASSIGNMENTS = {
  101: 'Dispatch',    // Load Booking SOP
  102: 'Drivers',     // Driver Onboarding Checklist
  103: 'Finance',     // Invoice Submission Process
  104: 'Brokers',     // Broker Packet Requirements
  105: 'Policy',      // Driver Safety Compliance
  106: 'Marketing',   // Facebook Driver Search SOP
  107: 'Sales',       // Warm Lead Follow-Up Script
  108: 'Sales',       // FMCSA Lead Review Checklist
  109: 'Reference',   // How to Find Loads — Load Board Guide
  110: 'Reference',   // Trucking Industry Glossary
  111: 'Reference',   // What Is Freight Dispatch?
  112: 'Brokers',     // Rate Negotiation Guide
  113: 'Sales',       // Cold Call Script
  114: 'Dispatch',    // Daily Dispatch Routine
  115: 'Dispatch',    // Breakdown and Emergency Procedures
  116: 'Brokers',     // How to Vet a New Broker
  117: 'Drivers',     // Explaining Your Dispatch Fee
  118: 'Dispatch',    // Reading a Rate Confirmation
  119: 'Drivers',     // Driver Communication Standards
  120: 'Sales',       // New Driver Pitch
  121: 'Template',    // Dispatch Agreement (OnTrack)
  122: 'Drivers',     // Signed Driver Onboarding Workflow
  123: 'Reference',   // First-Run Setup Guide / FB Groups
  124: 'Template',    // Driver Onboarding Email Template
  125: 'Template',    // Prospect Introduction Email Template
  126: 'Template',    // W-9 Form (Blank)
  127: 'Drivers',     // New Authority Driver Expectations
  128: 'Brokers',     // Building Broker Relationships for New Authorities
  129: 'Dispatch',    // New Authority Daily Load Workflow
  130: 'Marketing',   // Facebook Group Post Protocol
}

// Valid categories — any doc NOT in ASSIGNMENTS but with a stray category
// gets remapped automatically
const VALID = new Set(['Dispatch','Drivers','Sales','Marketing','Brokers','Finance','Template','Reference','Policy','Other'])
const STALE_REMAP = {
  'SOP':           'Reference',
  'Training':      'Reference',
  'New Authority': 'Dispatch',
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
const dbPath = findDbPath()
if (!dbPath) {
  console.error('\nCould not find database.db automatically.')
  console.error('Pass the path manually:')
  console.error('  node scripts/fix-doc-categories.js "C:\\Users\\YourName\\AppData\\Roaming\\OnTrack Dispatch Dashboard\\OnTrackDashboard\\database.db"\n')
  process.exit(1)
}

console.log('\nDatabase:', dbPath)

// Load better-sqlite3 from the project node_modules
let Database
try {
  Database = require(path.join(__dirname, '..', 'node_modules', 'better-sqlite3'))
} catch (e) {
  console.error('Could not load better-sqlite3. Make sure you are running from the app folder.\n', e.message)
  process.exit(1)
}

const db = new Database(dbPath)

// Apply explicit assignments for seeded doc IDs
const updateStmt = db.prepare('UPDATE documents SET category = ? WHERE id = ? AND category != ?')
let changed = 0

for (const [id, cat] of Object.entries(ASSIGNMENTS)) {
  const info = updateStmt.run(cat, Number(id), cat)
  if (info.changes > 0) {
    console.log(`  [${id}] → ${cat}`)
    changed++
  }
}

// Fix any remaining docs with stale/unknown categories (user-created or legacy)
const allDocs = db.prepare('SELECT id, title, category FROM documents').all()
for (const doc of allDocs) {
  if (VALID.has(doc.category)) continue
  const newCat = STALE_REMAP[doc.category] || 'Other'
  const info = db.prepare('UPDATE documents SET category = ? WHERE id = ?').run(newCat, doc.id)
  if (info.changes > 0) {
    console.log(`  [${doc.id}] "${doc.title}" ${doc.category} → ${newCat}`)
    changed++
  }
}

db.close()
console.log(`\nDone. ${changed} document(s) updated.`)
console.log('Reload the Documents page in OnTrack to see the changes.\n')
