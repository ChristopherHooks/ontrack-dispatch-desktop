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

Fully operational pages:
- Dashboard (live KPIs -- driversNeedingLoads bug fixed)
- Leads (full CRM)
- Drivers (full profile + documents)
- Loads + Dispatch Board (full lifecycle)
- Brokers (full profile + performance)
- Invoices (full lifecycle + PDF/CSV/email export)
- Tasks (daily checklist + all tasks + history + full CRUD)
- Settings (theme, business info, Backup & Restore, Google Drive notes)

PagePlaceholder stubs (not yet built):
- Documents, Marketing, Analytics, Help

---

## Current Blockers

None. Build is clean (1527 modules, zero errors).

---

## Recommended Next Steps (Priority Order)

1. Seed data / Migration 003 -- sample drivers, loads, brokers, invoices so app feels populated
2. Documents module -- file management for BOLs, PODs, COIs linked to loads and drivers
3. Dashboard KPI rebuild -- update mini dispatch board to use new corrected "Needs Load" logic
4. Analytics page -- revenue charts, load volume, top brokers
5. FMCSA scraper implementation -- wire up actual Safer API when ready

---

## Files Touched in Most Recent Session (Prompt 7)

### New files:
- electron/main/backup.ts
- electron/main/scheduler.ts
- src/components/tasks/constants.ts
- src/components/tasks/TasksToolbar.tsx
- src/components/tasks/TaskModal.tsx
- src/components/tasks/TaskDrawer.tsx

### Replaced stubs:
- src/pages/Tasks.tsx

### Modified:
- electron/main/db.ts -- added getDataDir(), wired createBackup + startPeriodicBackup
- electron/main/index.ts -- wired scheduler, stopPeriodicBackup, applyPendingRestore
- electron/main/ipcHandlers.ts -- added backup handlers, completionsForDate, fixed driversNeedingLoads query
- electron/main/repositories/tasksRepo.ts -- added getCompletionsForDate
- electron/preload/index.ts -- exposed backups + tasksExtra
- src/types/global.d.ts -- added BackupEntry type + new API surface
- src/pages/Settings.tsx -- added Backup & Restore section + Google Drive Sync section
- docs/HANDOFF.md (this file)
- docs/SESSION_LOG.md
