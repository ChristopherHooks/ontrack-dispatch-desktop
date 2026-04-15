# Data Architecture -- OnTrack Dispatch Dashboard

Last updated: 2026-04-15

## SQLite Schema (20+ tables)

| Table | Purpose |
|---|---|
| users | Admin / Dispatcher / Sales accounts |
| leads | Prospect carriers before onboarding |
| drivers | Active carrier relationships |
| driver_documents | CDL, insurance, BOL, POD files per driver |
| loads | Freight loads — dispatch-mode (OnTrack dispatches a driver) or broker-mode (OnTrack brokers to a carrier); distinguished by `load_mode` column |
| brokers | Freight broker and shipper contacts; distinguished by `contact_type` column ('broker' or 'shipper') |
| invoices | Dispatch fee invoices |
| tasks | Daily recurring and one-off tasks |
| task_completions | Per-date completion records (not a status flag) |
| notes | Free-form notes on any entity (also stores call logs via entity_type) |
| app_settings | Key-value configuration + FMCSA import metadata |
| backups | Backup file registry |
| audit_log | create/update/delete history |
| marketing_groups | Facebook group rotation tracker with truck type tags |
| marketing_post_log | History of posts used, groups posted to, results |
| outreach_refresh_log | Tracks weekly outreach template refresh dates |
| dat_postings | DAT load board postings for broker-mode loads |
| carrier_offers | Carrier bids/offers received for broker-mode loads; one offer per load can be Accepted |
| broker_carrier_vetting | Compliance vetting record for the selected carrier on a broker-mode load |

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
| v10–v19 | Additional columns and tables: operations tracking, analytics improvements, industry terms support, audit log enhancements. See migrations.ts for full list. |
| v20–v29 | Dispatcher board, profit radar, operations filters; deadhead_miles and fuel_surcharge on loads; min_rpm on drivers |
| v30–v39 | Outreach engine: outreach_refresh_log table (v39); performance tracking columns on marketing_post_log |
| v40 | load_mode column on loads (TEXT DEFAULT 'dispatch') — additive, all existing rows default to dispatch |
| v41 | contact_type column on brokers (TEXT DEFAULT 'broker') — additive, all existing rows default to broker |
| v42 | dat_postings table: id, load_id, posted_at, expires_at, rate, notes, created_at, updated_at |
| v43 | carrier_offers table: id, load_id, carrier_name, mc_number, dot_number, rate, contact_name, contact_phone, status, notes, created_at, updated_at |
| v44 | broker_carrier_vetting table: id, load_id, carrier_name, carrier_mc, carrier_dot, insurance_verified, authority_verified, agreement_signed, notes, created_at, updated_at |

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
| loadsRepo.ts | loads table (listLoads computes has_accepted_offer + has_vetting via EXISTS subqueries) |
| brokersRepo.ts | brokers table |
| invoicesRepo.ts | invoices table |
| tasksRepo.ts | tasks + task_completions tables |
| notesRepo.ts | notes table |
| usersRepo.ts | users table |
| auditRepo.ts | audit_log table |
| documentsRepo.ts | documents table |
| marketingRepo.ts | marketing_groups + marketing_post_log tables |
| outreachRepo.ts | outreach_refresh_log table + performance aggregation queries |
| datPostingsRepo.ts | dat_postings table |
| carrierOffersRepo.ts | carrier_offers table; includes acceptCarrierOffer() atomic transaction |
| brokerCarrierVettingRepo.ts | broker_carrier_vetting table |

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
