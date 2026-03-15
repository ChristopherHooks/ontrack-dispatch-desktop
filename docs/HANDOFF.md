# Handoff -- OnTrack Dispatch Dashboard

This file captures the current state of the project for session continuity.
Update this file at the end of every meaningful work session.

---

## Last Updated

2026-03-14

## Current Branch

feature/first-real-task

---

## What Was Completed (Most Recent Sessions)

### Session 11 -- Seed Cleanup + Sample Data Controls (complete)

- `seed.ts`: Added `seedTasksAndDocsOnly(db)` — calls internal `seedTasks` + `seedDocuments` via INSERT OR IGNORE; never touches business data tables
- `seed.ts`: Added `clearNonTaskSeedData(db)` — deletes id >= 101 from brokers, drivers, loads, leads, invoices, notes, driver_documents; leaves tasks + documents untouched
- IPC: `dev:seedTasksOnly` and `dev:clearSeedData` handlers registered in `ipcHandlers.ts`
- Preload: `window.api.dev.seedTasksOnly()` and `.clearSeedData()` exposed
- `global.d.ts`: Both methods typed
- Settings "Sample Data" section redesigned: two-card layout
  - **"Load Task Templates"** (orange) — calls `seedTasksOnly`; only seeds tasks 101-118 + docs 101-108
  - **"Remove Sample Data"** (red, with confirm dialog) — calls `clearSeedData`; strips fake business data

### Session 10 -- CSV/Paste Import + v2-Readiness + Recurring Tasks + F12 DevTools (complete)

- **CSV/Paste Lead Import**: `csvLeadImport.ts` with HEADER_MAP (including space-separated aliases), auto header-row detection (scans first 5 lines), RFC-4180 parser; IPC handlers `leads:importCsv` + `leads:importPaste`; `PasteImportModal` component; result banner in Leads page
- **v2-Readiness (Migration 005)**: Added `updated_at` to `notes` and `driver_documents` tables; extracted `getDashboardStats()` into `electron/main/dashboard.ts`; `db:query` IPC gated behind `!app.isPackaged`; `syncAdminUserFromStore()` in db.ts
- **Recurring Tasks (18 total)**: `seed.ts` expanded to tasks 101-118; tasks 111-115 are daily Marketing tasks (Facebook sweep, algorithm training, driver post sweep, response monitoring, final sweep); tasks 116-118 are weekly (Monday FMCSA review, Wednesday warm lead follow-up, Friday driver conversation review); documents 106-108 are matching SOP/reference docs
- **`isTaskForToday` fix**: Removed incorrect `if (recurring === 1) return true`; added day-of-week matching via `DOW.includes(dueDate)` check; dashboard SQL updated to match
- **F12 DevTools**: `before-input-event` listener in `index.ts` wires F12 to `toggleDevTools()`
- **`seedMissingItems(db)`**: Bypasses dev_seed_applied guard; inserts tasks 111-118 + docs 106-108 via INSERT OR IGNORE (for already-seeded databases)

### Session 9 -- Seed Data System (complete)

- `electron/main/seed.ts` (new): idempotent seed with 8 brokers, 15 drivers, 40 loads, 50 leads, 12 invoices, 10 tasks, 5 SOP documents
- Guard: checks `app_settings.dev_seed_applied = '1'` -- skips if already seeded
- IDs start at 101 to avoid collision with user-created records (autoincrement from 1)
- `runSeedIfEmpty(db)` called in `index.ts` after `initDatabase()`, wrapped in `!app.isPackaged` (dev only)
- `resetAndReseed(db)`: deletes all rows with `id >= 101`, clears guard, re-seeds
- IPC: `dev:seed` and `dev:reseed` channels registered; exposed as `window.api.dev.seed()` / `.reseed()`
- Load statuses distributed: Searching (3), Booked (5), Picked Up (5), In Transit (7), Delivered (10), Invoiced (6), Paid (4)
- RPM range 1.8--3.2 across all loads; lanes: TX-GA, IL-TX, CA-AZ, MO-CO, TX-TN, and more
- SOP documents stored as markdown using proper TypeScript `\n` escape sequences

### Session 8 -- FMCSA Manual Import Button (complete)

- Added "FMCSA Import" button to Leads toolbar (replaces disabled placeholder)
- Full IPC pipeline: renderer → preload → ipcHandlers → fmcsaImport.ts
- `electron/main/fmcsaImport.ts` (new): `FmcsaImportResult` interface + `importFmcsaLeads(db)` with dedup-by-mc_number + row-level error handling; `fetchFmcsaCandidates()` is a stub returning [] until real Safer API is wired
- IPC channel: `leads:importFmcsa` — writes `last_fmcsa_import_at` to electron-store after each run
- `FmcsaImportResult` type added to `models.ts` and `global.d.ts`
- Leads toolbar wired: `onImport`, `importBusy`, `lastImportAt` props; spinner on busy; tooltip shows last import timestamp
- Result banner in Leads page: dismissible, shows found/added/skipped/errors, amber = stub/error, green = success
- `last_fmcsa_import_at` loaded on Leads mount from electron-store, updated after each import
- Button styling matches app theme (surface-600/400 tokens, orange hover border)

### Prompt 7 -- Tasks Module + Backup Service + Scheduler + Dashboard Bug Fix (complete)

**Tasks Module:**
- Full Tasks page: Today checklist, All Tasks table, 30-day History view
- TasksToolbar: view tabs (Today/All/History), progress bar, search + category filter, Add Task button
- TaskModal: create/edit -- title, category, priority, due_date (Daily or YYYY-MM-DD), time_of_day, recurring toggle, notes
- TaskDrawer: slide-in with completion history, edit/delete, mark complete/incomplete for today
- Completion persisted by day via task_completions table (not just a status flag)
- New IPC + preload: tasks:completionsForDate

**Automation Scheduler (scaffolded, no external API calls yet):**
- electron/main/scheduler.ts -- minute-tick setInterval, no new npm packages
- Three jobs registered: fmcsa-scraper (05:00), daily-briefing (06:00), marketing-queue (Mon 07:00)
- last_run tracked per job in app_settings to prevent double-fire
- Started on app ready, stopped on window-all-closed

**Backup Service:**
- electron/main/backup.ts -- dedicated module
- Auto daily backup on launch (YYYY-MM-DD.db, skips if already exists)
- 6-hour periodic backup: YYYY-MM-DD_auto-00/06/12/18.db -- up to 5 restore points/day
- Manual backup via Settings UI (YYYY-MM-DD_manual.db)
- Staged restore: stageRestore() writes path to electron-store, applyPendingRestore() runs at next startup BEFORE DB opens -- safe, no WAL conflict
- Backup entries written to backups table (best-effort)

**Settings -- Backup & Restore UI:**
- Lists all backups from backups/ dir with filename + size
- Two-step confirm before staging restore (Restore → Confirm → stages, shows restart notice)
- Manual "Create Backup Now" button
- Google Drive Sync notes section with explicit conflict warnings

**Dashboard KPI Bug Fix:**
- "Drivers Needing a Load" was counting all Active drivers
- Fixed: NOT EXISTS correlated subquery excludes Active drivers already on Booked/Picked Up/In Transit load

### Prompt 6 -- Brokers + Invoices Modules (complete)
- Brokers: full CRUD, flag management, load history, performance metrics
- Invoices: generate from completed loads, status lifecycle, Print PDF, CSV export, email workflow
- Invoice status cascade: Sent/Paid updates linked load

### Prompt 5 -- Drivers + Loads + Dispatch Board (complete)
- Drivers: full profile, documents, notes, expiry alerts, min RPM
- Loads: full 7-stage lifecycle, RPM calc, dispatch fee, driver/broker assignment
- Dispatch Board: embedded in Loads page (table/board toggle)

### Prompt 4 -- Leads CRM (complete)
- Leads table + kanban, modal, drawer, lead scoring, call logs

### Foundation (complete)
- Electron + React + TypeScript + Tailwind + SQLite + IPC layer fully built
- 8 DB tables, WAL mode, daily auto-backup, all IPC channels wired

---

## Current App State

Task templates seeded via "Load Task Templates" button (Settings). Fake business data (brokers/drivers/loads/leads/invoices) can be cleared via "Remove Sample Data" button.

Fully operational pages:
- Dashboard (live KPIs + day-of-week task matching)
- Leads (full CRM + FMCSA import + CSV/paste import)
- Drivers (full profile + documents)
- Loads + Dispatch Board (full lifecycle)
- Brokers (full profile + performance)
- Invoices (full lifecycle + PDF/CSV/email export)
- Tasks (daily checklist + all tasks + history + full CRUD; 18 seeded task templates including day-of-week recurring)
- Settings (theme, business info, Backup & Restore, Google Drive notes, task templates + seed cleanup)
- Documents (markdown SOP library, category filter, viewer/editor; 8 seeded SOPs)
- Analytics (KPIs, revenue by month/driver, lane profitability, broker volume)
- Help (articles, keyboard shortcuts reference, search)

Global features:
- Global search overlay (Ctrl+K)
- EmptyState component
- uiStore for transient UI state
- F12 toggles DevTools

PagePlaceholder stubs:
- Marketing

---

## Current Blockers

None. Build is clean (tsc --noEmit + electron-vite build both pass).

---

## Recommended Next Steps (Priority Order)

1. Marketing module (only remaining PagePlaceholder stub)
2. Wire real FMCSA Safer API into `fetchFmcsaCandidates()` in `electron/main/fmcsaImport.ts`
3. Email/SMTP integration for invoices (replace mailto:)

---

## Files Touched in Most Recent Sessions (10 + 11)

### New files:
- electron/main/seed.ts
- electron/main/dashboard.ts
- electron/main/csvLeadImport.ts
- src/components/leads/PasteImportModal.tsx

### Modified (Sessions 10-11):
- electron/main/seed.ts -- tasks 111-118, docs 106-108, seedMissingItems, seedTasksAndDocsOnly, clearNonTaskSeedData
- electron/main/ipcHandlers.ts -- dev:seedMissing, dev:seedTasksOnly, dev:clearSeedData handlers; dashboard extracted; db:query gated
- electron/main/index.ts -- F12 DevTools shortcut
- electron/main/db.ts -- syncAdminUserFromStore
- electron/main/schema/migrations.ts -- migration 005 (updated_at on notes + driver_documents)
- electron/preload/index.ts -- dev.seedMissing, dev.seedTasksOnly, dev.clearSeedData; leads.importCsv, leads.importPaste
- src/types/global.d.ts -- all new IPC methods typed
- src/types/models.ts -- CsvImportResult interface
- src/components/tasks/constants.ts -- isTaskForToday day-of-week fix
- src/components/leads/LeadsToolbar.tsx -- CSV/paste import buttons
- src/pages/Leads.tsx -- CSV/paste import state + result banners
- src/pages/Settings.tsx -- two-card sample data section; handleSeedData + handleClearSeedData
- src/store/settingsStore.ts -- companyName, ownerName, ownerEmail, defaultDispatchPct

---

## Files Touched in Session 8

### New files:
- electron/main/fmcsaImport.ts

### Modified:
- electron/main/ipcHandlers.ts -- added leads:importFmcsa handler + last_fmcsa_import_at store write
- electron/preload/index.ts -- exposed leads.importFmcsa
- src/types/models.ts -- added FmcsaImportResult interface
- src/types/global.d.ts -- imported FmcsaImportResult, added importFmcsa to window.api.leads
- src/components/leads/LeadsToolbar.tsx -- wired onImport/importBusy/lastImportAt props, replaced disabled stub button
- src/pages/Leads.tsx -- added handleImport, importBusy, importResult, lastImportAt state + result banner
