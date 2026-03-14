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

Seed data active in dev builds (guard: `dev_seed_applied`). All pages populated on first launch.

Fully operational pages:
- Dashboard (live KPIs)
- Leads (full CRM + FMCSA import button)
- Drivers (full profile + documents)
- Loads + Dispatch Board (full lifecycle)
- Brokers (full profile + performance)
- Invoices (full lifecycle + PDF/CSV/email export)
- Tasks (daily checklist + all tasks + history + full CRUD)
- Settings (theme, business info, Backup & Restore, Google Drive notes)
- Documents (markdown SOP library, category filter, viewer/editor)
- Analytics (KPIs, revenue by month/driver, lane profitability, broker volume)
- Help (articles, keyboard shortcuts reference, search)

Global features:
- Global search overlay (Ctrl+K)
- EmptyState component
- uiStore for transient UI state

PagePlaceholder stubs:
- Marketing

---

## Current Blockers

None. Build is clean.

---

## Recommended Next Steps (Priority Order)

1. Marketing module
2. Wire real FMCSA Safer API into `fetchFmcsaCandidates()` in `electron/main/fmcsaImport.ts`
3. Wire real FMCSA Safer API into `fetchFmcsaCandidates()` in `electron/main/fmcsaImport.ts`
4. Email/SMTP integration for invoices (replace mailto:)

---

## Files Touched in Most Recent Session (Session 9)

### New files:
- electron/main/seed.ts

### Modified:
- electron/main/index.ts -- import runSeedIfEmpty; call after initDatabase() (dev-only)
- electron/main/ipcHandlers.ts -- import resetAndReseed; register dev:seed and dev:reseed handlers
- electron/preload/index.ts -- expose window.api.dev.seed() and .reseed()
- src/types/global.d.ts -- add dev namespace typed

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
