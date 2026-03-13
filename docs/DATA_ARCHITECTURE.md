# Data Architecture -- OnTrack Dispatch Dashboard

## 13-Table SQLite Schema

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
| task_completions | Per-date completion records |
| notes | Free-form notes on any entity |
| app_settings | Key-value configuration |
| backups | Backup file registry |
| audit_log | create/update/delete history |

## Migration Strategy

Versioned via the schema_version table. runMigrations() in
electron/main/schema/migrations.ts applies only unapplied versions.

- v1 -- Baseline 8 tables. Existing installs already at v1.
- v2 -- 8 new columns via addColumnIfMissing() + 6 new tables.

Add new Migration objects to MIGRATIONS array to extend the schema.

## Repository Pattern

All queries in electron/main/repositories/. The renderer never imports
better-sqlite3 directly. IPC handlers call repo functions via getDb().

Each repo exports: list, get, create, update, delete -- typed against
src/types/models.ts. Use import type to avoid runtime cross-process imports.

## Type Source of Truth

src/types/models.ts  -- interfaces matching SQLite schema column-for-column.
src/types/auth.ts    -- re-exports User, UserRole, ThemePreference; adds auth helpers.
src/types/global.d.ts -- ambient Window.api and shared JSX interfaces.

## Seed Data

electron/main/seed.ts -- idempotent dev seed, guarded by app_settings key
dev_seed_applied. Explicit IDs start at 101+. Wrap call in app.isPackaged check.

## Storage and Reliability

WAL mode + synchronous = NORMAL -- crash-safe, single-user performance.
Daily backup via database.backup() to dataDir/backups/YYYY-MM-DD.db.
Data directory: AppData/Roaming/OnTrackDashboard/ or custom path from settings.
