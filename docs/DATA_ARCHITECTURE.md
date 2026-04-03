# Data Architecture -- OnTrack Dispatch Dashboard

Last updated: 2026-03-17

## SQLite Schema (15+ tables)

| Table | Purpose |
|---|---|
| users | Admin / Dispatcher / Sales accounts |
| leads | Prospect carriers before onboarding |
| drivers | Active carrier relationships |
| driver_documents | CDL, insurance, BOL, POD files per driver |
| loads | Individual dispatched freight loads |
| brokers | Broker directory with credit flags |
| invoices | Dispatch fee invoices |
| tasks | Daily recurring and one-off tasks |
| task_completions | Per-date completion records (not a status flag) |
| notes | Free-form notes on any entity (also stores call logs via entity_type) |
| app_settings | Key-value configuration + FMCSA import metadata |
| backups | Backup file registry |
| audit_log | create/update/delete history |
| marketing_groups | Facebook group rotation tracker with truck type tags |
| marketing_post_log | History of posts used, groups posted to, results |

## Migration Strategy

Versioned via the schema_version table. runMigrations() in
electron/main/schema/migrations.ts applies only unapplied versions.

| Version | Description |
|---|---|
| v1 | Baseline 8 tables: leads, drivers, loads, brokers, invoices, tasks, documents, users |
| v2 | 8 new columns via addColumnIfMissing() + 6 new tables (driver_documents, task_completions, notes, app_settings, backups, audit_log) |
| v3 | content + updated_at columns for documents table |
| v4 | current_location column for drivers |
| v5 | updated_at on notes and driver_documents |
| v6 | dot_number column on leads; backfill FMCSA DOT values from mc_number |
| v7 | fleet_size column on leads (Power Units from FMCSA SAFER) |
| v8 | marketing_groups table (group rotation tracker) |
| v9 | marketing_post_log table; truck_type_tags, region_tags, active columns on marketing_groups |
| v10-v19 | Additional columns and tables added in sessions 16-20. See migrations.ts for full list. |

Add new Migration objects to MIGRATIONS array to extend the schema.
Use addColumnIfMissing() for adding columns to existing tables — safe to re-apply.

## Repository Pattern

All queries in electron/main/repositories/. The renderer never imports
better-sqlite3 directly. IPC handlers call repo functions via getDb().

Each repo exports: list, get, create, update, delete -- typed against
src/types/models.ts. Use import type to avoid runtime cross-process imports.

| Repository | Entity |
|---|---|
| leadsRepo.ts | leads table |
| driversRepo.ts | drivers table |
| driverDocumentsRepo.ts | driver_documents table |
| loadsRepo.ts | loads table |
| brokersRepo.ts | brokers table |
| invoicesRepo.ts | invoices table |
| tasksRepo.ts | tasks + task_completions tables |
| notesRepo.ts | notes table |
| usersRepo.ts | users table |
| auditRepo.ts | audit_log table |
| documentsRepo.ts | documents table |
| marketingRepo.ts | marketing_groups + marketing_post_log tables |

## Type Source of Truth

src/types/models.ts   -- interfaces matching SQLite schema column-for-column.
src/types/auth.ts     -- re-exports User, UserRole, ThemePreference; adds auth helpers.
src/types/global.d.ts -- ambient window.api TypeScript declarations.

## Seed Data

electron/main/seed.ts -- idempotent dev seed, guarded by app_settings key
dev_seed_applied. Explicit IDs start at 101+. Wrap call in app.isPackaged check.

Functions:
- runSeedIfEmpty(db)        -- full seed (8 brokers, 15 drivers, 40 loads, 50 leads, 12 invoices)
- resetAndReseed(db)        -- deletes id >= 101, clears guard, re-seeds
- seedTasksAndDocsOnly(db)  -- only 18 task templates + 8 SOP stubs, safe for production
- reseedDocuments(db)       -- overwrites/adds 20 comprehensive SOP documents (INSERT OR REPLACE)
- seedMissingItems(db)      -- adds tasks 111-118 + docs 106-108 without guard check
- clearNonTaskSeedData(db)  -- removes all seed business data, leaves tasks + documents intact

## Storage and Reliability

WAL mode + synchronous = NORMAL -- crash-safe, single-user performance.
Daily backup via database.backup() to dataDir/backups/YYYY-MM-DD.db.
6-hour periodic backup: up to 5 restore points per day.
Staged restore: stageRestore() saves path to electron-store; applied at next startup before DB opens.
Data directory: %APPDATA%/OnTrack Dispatch Dashboard/OnTrackDashboard/ (or custom path from settings).
