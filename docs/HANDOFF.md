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

### Session 13 -- Document Library Expansion + Marketing Template Overhaul (complete)

**Document Library (reseedDocuments function):**
- Added `reseedDocuments(db)` to `seed.ts` — uses INSERT OR REPLACE, overwrites docs 101-108 and adds 109-120
- 20 total documents, all fully written SOPs, scripts, training guides, and reference material
- New docs 109-120: What Is Freight Dispatch (Reference), Trucking Industry Glossary (Reference), How to Find Loads — Load Board Guide (Reference), Rate Negotiation Guide (SOP), Cold Call Script (SOP), Daily Dispatch Routine (SOP), Breakdown and Emergency Procedures (SOP), How to Vet a New Broker (SOP), Explaining Your Dispatch Fee (Training), Reading a Rate Confirmation (Training), Driver Communication Standards (Policy), New Driver Pitch (SOP)
- Existing docs 101-108 expanded from short stubs to full operational depth (400-600 words each)
- IPC: `dev:reseedDocs` handler in `ipcHandlers.ts`
- Preload: `window.api.dev.reseedDocs()` added
- Settings: "Rebuild Document Library" green button added to Sample Data section with confirmation message

**Marketing Templates — complete rewrite:**
- `src/lib/postTemplates.ts` fully rewritten: 78 templates (up from 45), no emojis anywhere
- Added 5 truck-type categories: Dry Van (8), Reefer (7), Flatbed (8), Step Deck (6), Hotshot (6)
- Existing categories retained and rewritten: Driver Recruitment (10), Value Prop (8), Engagement (8), New Authority (7), Trust (5), Freight Market (5)
- All templates rewritten in natural, human conversational tone — no bullet lists with symbols, no hype
- 78 templates = ~2.5 months of unique daily posts before any repeat
- `CATEGORY_COLORS` updated with colors for all 5 new truck-type categories
- `CATEGORY_FILTER_OPTIONS` in `Marketing.tsx` updated — truck types appear first in filter bar

**Project standards:**
- No-emoji rule added to `CLAUDE.md` under "Content and Copy Rules — Never Violate"

### Session 12 -- FMCSA Auth Sort Fix + Fleet Size + Priority Calc + Invoice Delete + Marketing Tab (complete)

- Auth age sort fix in `Leads.tsx`: ascending "Auth Age" now means newest (least aged) first; special-cased `authority_date` sort to invert direction
- Fleet size: migration 007 adds `fleet_size INTEGER` to leads; SAFER scraper regex extracts Power Units; `computePriority()` uses fleet size (1-3 trucks) + authority age (30-180 days) for High/Medium/Low; `leadsRepo` CREATE and UPDATE both include `fleet_size`; `CreateLeadDto` includes fleet_size; LeadModal has Fleet Size input; LeadsTable and LeadDrawer display fleet size
- Backfill: `backfillLeadData(db)` — Phase 1 instant SQL re-prioritize all FMCSA leads, Phase 2 SAFER scrape for leads missing fleet_size (150ms delay per request); Settings "Re-enrich & Re-prioritize" button
- Invoice delete: `deleteInvoice` in `invoicesRepo.ts`; two-step confirm in `InvoiceDrawer.tsx`; `handleDelete` in `Invoices.tsx`
- Marketing tab: `src/lib/postTemplates.ts` (45 templates, 6 categories, date-seeded daily rotation); `src/pages/Marketing.tsx` (Today's Post card, category filters, prev/next, copy, Add to Tasks, Group Rotation tracker); `electron/main/repositories/marketingRepo.ts` (CRUD for marketing_groups); migration 008 adds marketing_groups table; IPC handlers and preload wired

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

All pages fully operational. No PagePlaceholder stubs remaining.

**To populate a fresh database:**
1. Settings > Sample Data > "Load Task Templates" — seeds 18 tasks + 8 basic SOPs
2. Settings > Sample Data > "Rebuild Document Library" — overwrites/adds all 20 comprehensive docs
3. Settings > Sample Data > sample business data seeded automatically on first dev launch

Fully operational pages:
- Dashboard (live KPIs + day-of-week task matching)
- Leads (full CRM + FMCSA import + CSV/paste import + fleet size + backfill)
- Drivers (full profile + documents)
- Loads + Dispatch Board (full lifecycle)
- Brokers (full profile + performance)
- Invoices (full lifecycle + PDF/CSV/email export + delete)
- Tasks (daily checklist + all tasks + history + full CRUD; 18 seeded task templates)
- Settings (theme, business info, Backup & Restore, Google Drive notes, task templates, document library rebuild)
- Documents (markdown SOP library; 20 comprehensive documents after rebuild)
- Analytics (KPIs, revenue by month/driver, lane profitability, broker volume)
- Help (articles, keyboard shortcuts reference, search)
- Marketing (78 post templates, daily rotation, category filters by truck type, group rotation tracker, add-to-tasks)

Global features:
- Global search overlay (Ctrl+K)
- EmptyState component
- uiStore for transient UI state
- F12 toggles DevTools

---

## Current Blockers

None. Build is clean.

---

## Recommended Next Steps (Priority Order)

1. Email/SMTP integration for invoices (replace mailto: with real send)
2. Analytics page enhancements (more charts, date range filters)
3. Driver document expiry notifications (push alerts, not just badge)
4. Hotshot/specialty load board integration or direct broker contact expansion

---

## Files Touched in Most Recent Sessions (12 + 13)

### New files (Session 13):
- (none — all changes were modifications to existing files)

### Modified (Session 13):
- electron/main/seed.ts — added `reseedDocuments(db)` with 20 comprehensive documents using INSERT OR REPLACE
- electron/main/ipcHandlers.ts — added `dev:reseedDocs` handler; imported `reseedDocuments`
- electron/preload/index.ts — added `dev.reseedDocs`
- src/pages/Settings.tsx — added Rebuild Document Library button + state
- src/lib/postTemplates.ts — complete rewrite: 78 templates, 11 categories (5 new truck types), no emojis
- src/pages/Marketing.tsx — updated CATEGORY_FILTER_OPTIONS to include truck-type categories
- CLAUDE.md — added "Content and Copy Rules" section with no-emoji rule

### New files (Session 12):
- electron/main/repositories/marketingRepo.ts
- src/lib/postTemplates.ts
- src/pages/Marketing.tsx

### Modified (Session 12):
- electron/main/fmcsaApi.ts — fleet_size extraction from SAFER Power Units
- electron/main/fmcsaImport.ts — computePriority(), backfillLeadData(), fleet_size in INSERT
- electron/main/schema/migrations.ts — migration 007 (fleet_size), migration 008 (marketing_groups)
- electron/main/repositories/leadsRepo.ts — fleet_size in CREATE and UPDATE SQL
- electron/main/repositories/invoicesRepo.ts — deleteInvoice()
- electron/main/repositories/index.ts — export marketingRepo
- electron/main/ipcHandlers.ts — invoices:delete, leads:backfillLeadData, marketing group handlers
- electron/preload/index.ts — invoices.delete, leads.backfillLeadData, full marketing.groups object
- src/types/models.ts — fleet_size on Lead; CreateLeadDto excludes only dot_number
- src/components/leads/LeadModal.tsx — fleet_size field
- src/components/leads/LeadsTable.tsx — fleet_size display
- src/components/leads/LeadDrawer.tsx — fleet_size row
- src/components/invoices/InvoiceDrawer.tsx — delete with two-step confirm
- src/pages/Leads.tsx — auth age sort fix; backfill button
- src/pages/Invoices.tsx — handleDelete wired
- src/pages/Settings.tsx — Re-enrich & Re-prioritize button

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
