# OnTrack — Full Audit, Refactor Plan, and Broker Module Design

Generated: 2026-04-15

---

## PHASE 1 — SYSTEM AUDIT (NO CHANGES)

### A. Redundancies

**Duplicate data / overlapping tables:**
- `brokerCallLogRepo.ts` (broker-specific contact log) overlaps with `notesRepo.ts` (generic entity notes). Both store timestamped broker communication — two systems for the same need.
- `reports.ts` and `analytics.ts` both compute broker performance, lane profitability, and revenue. Reports page and Analytics page pull from separate but logically identical queries.
- `outreachEngine.ts` still uses `localStorage` for weekly refresh state (`getWeeklyRefreshState` / `markAiRefreshDone`). `outreachRepo.ts` already has a DB-backed version (`getLastRefresh` / `logRefresh`). Two systems tracking the same state.
- `FindLoads.tsx`, `LoadMatch.tsx`, and `Dispatcher Board` all surface available loads for assignment. Three entry points with partial overlap in purpose.
- `driver_prospects` (migration 035) and `leads` table both track prospective drivers/carriers with stage, priority, follow-up date, and contact log. Conceptually the same pipeline, stored in two different tables.

**Duplicate logic:**
- Broker scoring logic existed both in `brokerIntelligence.ts` and inline in `BrokerDrawer.tsx` (Session 20 fixed this partially — confirm `INTEL_RATING_STYLE` and scoring IIFE are fully removed from `BrokerDrawer.tsx`).
- `loadScanner.ts` deadhead estimation (same-city=10mi, same-state=75mi, cross-state=250mi) duplicated inside `FindLoads.tsx` client-side broker intel computation.

---

### B. Inefficiencies

- `ipcHandlers.ts` is a monolith (~50+ channels, noted since Session 18, never split). Any edit requires navigating hundreds of lines; high collision risk.
- All `logAudit()` calls hardcode `userId = 1`. This is a repeated assumption in every repo — could break silently if multi-user is ever added.
- `brokerIntelligence.ts` runs a full load history query on every call with no caching. Called on mount in multiple pages simultaneously.
- `Marketing.tsx` is 1,549 lines (Session 27 note). Single largest component; any change is high surface area.
- Multiple independent IPC calls on page mount (Promise.all patterns) that could be collapsed into single batched endpoints for faster initial load.
- `outreachEngine.ts` localStorage state is redundant now that the DB-backed version is live. Dead persistence path still executing.
- `loadScanner.ts` deadhead is a 3-rule placeholder. It actively produces inaccurate RPM scores and there is no UI indicator that it is an estimate.

---

### C. Risk Areas

- `ipcHandlers.ts` monolith: editing any handler risks accidentally breaking an adjacent one. No unit tests guard against regression.
- `migrations.ts` has 39 migrations in a single MIGRATIONS array export. No migration number validation — a skipped or duplicated version number would silently corrupt schema_version tracking.
- `offResult` IPC listener leak in `preload/index.ts` (browserImport group) has been carried since Session 21. Non-blocking now; could become a memory issue if the FindLoads page mounts frequently.
- Several repos appear partially implemented with no confirmed UI wiring: `driverOnboardingRepo.ts`, `fbContentRepo.ts`, `fbHunterRepo.ts`, `fbConversationRepo.ts`, `prospectOutreachRepo.ts`, `loadAccessorialsRepo.ts`. Dead or orphaned backend code increases maintenance confusion.
- `sandbox: false` on BrowserWindow was intentionally deferred in Session 20 as risky. Leaving it unaddressed keeps a known security gap open.
- `Marketing.tsx` at 1,549 lines: one render error can crash the entire Marketing module with no granular recovery.
- `carrier_broker_approvals` table (migration not visible in audit window) is referenced in `carrierBrokerApprovalRepo.ts` but the migration that creates it is not confirmed in the migrations list reviewed. Needs verification.

---

### D. Existing Features Reusable for Broker Mode

- `loadsRepo.ts` + loads table — full freight lifecycle infrastructure. A `load_mode` field separates dispatch vs broker loads without a new table.
- `loadTimelineRepo.ts` — check call engine and status auto-scheduling fully reusable for broker carrier follow-up cadence.
- `brokerCallLogRepo.ts` — contact log pattern (timestamped notes per entity) directly reusable for broker-mode carrier outreach logs.
- `carrierBrokerApprovalRepo.ts` — already implements per-driver broker submission/approval tracking. Pattern is reusable for broker-mode carrier compliance (packet received, insurance verified, authority confirmed).
- `invoicesRepo.ts` — invoice structure handles broker-mode shipper billing with minimal additions (add `invoice_type` field).
- `brokerIntelligence.ts` — scoring algorithm reusable as a template for carrier vetting score in broker mode.
- `notesRepo.ts` — generic entity notes attach to any entity_type without changes.
- `auditRepo.ts` — audit trail works for any entity without modification.
- `loadScanner.ts` — load recommendation / scoring engine logic is architecture-reusable for broker carrier matching.
- `brokersRepo.ts` — existing broker profiles contain MC#, payment terms, credit rating, and flags. The broker table can serve double duty as a "shipper" directory with a `contact_type` field, avoiding a new table.

---

## PHASE 2 — REFACTOR PLAN (SAFE + MINIMAL)

### R1 — Remove outreachEngine.ts localStorage refresh state
- **What:** Delete `getWeeklyRefreshState()` and `markAiRefreshDone()` from `outreachEngine.ts`. Update all call sites in `Marketing.tsx` to use `window.api.outreach.getLastRefresh()` and `window.api.outreach.logRefresh()`.
- **Replaces:** Duplicate localStorage persistence path.
- **Why safe:** DB-backed version already implemented and in use. localStorage reads are purely cosmetic state that the DB already handles.
- **Impact:** Low.

### R2 — Collapse analytics.ts and reports.ts broker/lane queries into shared helpers
- **What:** Extract duplicate SQL fragments (broker performance, lane RPM aggregations) into shared helper functions in a new `electron/main/queryHelpers.ts`. Both `analytics.ts` and `reports.ts` import from it.
- **Replaces:** Duplicated query strings across two files.
- **Why safe:** Pure extraction — no query logic changes. Both files keep their public API intact.
- **Impact:** Low.

### R3 — Unify broker contact log and generic notes
- **What:** Deprecate `brokerCallLogRepo.ts`. Migrate `broker_call_log` entries to `notes` table using `entity_type = 'broker_contact'`. Remove the `broker_call_log` table after migration (migration 040).
- **Replaces:** `brokerCallLogRepo.ts` + `broker_call_log` table.
- **Why safe:** Notes system already supports any entity_type. Migration script copies all existing rows.
- **Impact:** Medium. Requires updating `BrokerDrawer.tsx` to use `notesRepo` instead of `brokerCallLogRepo`.

### R4 — Split ipcHandlers.ts into domain files
- **What:** Separate `ipcHandlers.ts` into domain handler files: `handlers/leads.ts`, `handlers/loads.ts`, `handlers/brokers.ts`, `handlers/drivers.ts`, `handlers/invoices.ts`, `handlers/marketing.ts`, `handlers/system.ts`. `ipcHandlers.ts` becomes an index that imports and calls each `registerXxxHandlers(ipcMain, getDb)`.
- **Replaces:** Monolithic `ipcHandlers.ts`.
- **Why safe:** No IPC channel names change. Purely structural refactor. Can be done one domain at a time.
- **Impact:** Medium. High value for maintainability. Zero user-facing change.

### R5 — Audit and wire or remove orphaned repos
- **What:** For each of `fbContentRepo.ts`, `fbHunterRepo.ts`, `prospectOutreachRepo.ts`, `driverOnboardingRepo.ts`, `loadAccessorialsRepo.ts` — verify whether IPC handlers and UI exist. If wired: document in FEATURE_REGISTRY. If not wired: remove the repo file until the feature is intentionally built.
- **Why safe:** Removing dead code that has no wired IPC channel cannot break existing functionality. Verify no handler calls the repo before deleting.
- **Impact:** Low. Reduces noise in `repositories/` directory.

### R6 — Add migration number validation
- **What:** In `runMigrations()`, add a pre-flight check: assert that `MIGRATIONS.map(m => m.version)` contains no duplicates and no gaps from 1 to N.
- **Why safe:** Read-only validation added to startup. Does not change any migration logic.
- **Impact:** Low. Prevents future bugs silently.

---

## PHASE 3 — BROKER MODULE DESIGN

### Conceptual Separation

The existing `brokers` table = freight brokers OnTrack **works with** (dispatch mode — they source loads for drivers OnTrack dispatches).

The new broker module = OnTrack **operating as a broker** — taking load orders from shippers, posting on DAT, finding and vetting a carrier, moving the freight, and billing the shipper.

These are two distinct roles. The separation must be enforced at the load level, not the broker table.

### Core Design Principles

- Reuse the `loads` table with a `load_mode` column (`'dispatch' | 'broker'`).
- Add `shippers` directory (reuse `brokers` table with `contact_type` column).
- Add `dat_postings` table for DAT board tracking.
- Add `carrier_offers` table for inbound carrier calls.
- Add `broker_carrier_vetting` table for compliance tracking per load.
- Broker-mode lifecycle: `Intake → Posted → Offers Received → Carrier Selected → In Transit → Delivered → Invoiced → Paid`.

### Broker Load Intake

- Shipper submits load: origin, destination, pickup date, delivery date, commodity, weight, trailer type, target rate.
- Stored as a Load with `load_mode = 'broker'` and status `Intake`.
- Shipper contact stored in `brokers` table with `contact_type = 'shipper'` (new column, default `'broker'`).

### DAT Posting Tracking

- New table: `dat_postings` — tracks each time a broker-mode load is posted on DAT.
- Fields: load_id, posted_rate, posted_at, expires_at, posting_ref, status (`active | expired | filled`), notes.
- Multiple postings per load are supported (repost at different rate).

### Inbound Carrier Offer Tracking

- New table: `carrier_offers` — each carrier that calls in response to a DAT posting.
- Fields: load_id, carrier_name, mc_number, phone, offered_rate, offered_at, status (`Pending | Accepted | Rejected | Countered`), counter_rate, notes.
- One offer becomes the accepted carrier — sets `carrier_id` on the load (maps to `brokers` table where `contact_type = 'carrier'` or directly to `drivers.id` if already onboarded).

### Carrier Vetting / Compliance Tracking

- Reuse `carrierBrokerApprovalRepo.ts` pattern. New table: `broker_carrier_vetting`.
- Fields: load_id, carrier_mc, carrier_name, insurance_verified (0/1), authority_active (0/1), safety_rating, carrier_packet_received (0/1), vetting_date, notes.
- Checklist: MC active, insurance on file, safety rating not Unsatisfactory, carrier packet received.

### Rate Negotiation Tracking

- Stored on `carrier_offers` table: `offered_rate`, `counter_rate`, `final_rate`.
- Negotiation log stored in `notes` table (`entity_type = 'carrier_offer'`, `entity_id = offer.id`).
- No separate negotiation table needed.

### Broker-Mode Load Lifecycle

```
Intake → Posted (on DAT) → Offers Received → Carrier Selected → Picked Up → In Transit → Delivered → Invoiced → Paid
```

- Distinct from dispatch lifecycle (`Searching → Booked → Picked Up → In Transit → Delivered → Invoiced → Paid`).
- Both use the same `loads` table; `load_mode` determines which status set applies.
- UI renders different action buttons and status badges based on `load_mode`.

---

## PHASE 4 — DATA MODEL + LOGIC UPDATES

### Schema Additions (New Migrations)

**Migration 040 — `load_mode` on loads**
```sql
ALTER TABLE loads ADD COLUMN load_mode TEXT NOT NULL DEFAULT 'dispatch';
-- Values: 'dispatch' | 'broker'
```

**Migration 041 — `contact_type` on brokers**
```sql
ALTER TABLE brokers ADD COLUMN contact_type TEXT NOT NULL DEFAULT 'broker';
-- Values: 'broker' | 'shipper' | 'carrier'
-- Existing rows default to 'broker' — no data loss
```

**Migration 042 — `dat_postings` table**
```sql
CREATE TABLE IF NOT EXISTS dat_postings (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  load_id     INTEGER NOT NULL REFERENCES loads(id) ON DELETE CASCADE,
  posted_rate REAL,
  posted_at   TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at  TEXT,
  posting_ref TEXT,
  status      TEXT NOT NULL DEFAULT 'active',  -- active | expired | filled
  notes       TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_dat_load ON dat_postings(load_id);
```

**Migration 043 — `carrier_offers` table**
```sql
CREATE TABLE IF NOT EXISTS carrier_offers (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  load_id       INTEGER NOT NULL REFERENCES loads(id) ON DELETE CASCADE,
  carrier_name  TEXT NOT NULL,
  mc_number     TEXT,
  phone         TEXT,
  offered_rate  REAL,
  offered_at    TEXT NOT NULL DEFAULT (datetime('now')),
  status        TEXT NOT NULL DEFAULT 'Pending',  -- Pending | Accepted | Rejected | Countered
  counter_rate  REAL,
  final_rate    REAL,
  notes         TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_offers_load ON carrier_offers(load_id);
```

**Migration 044 — `broker_carrier_vetting` table**
```sql
CREATE TABLE IF NOT EXISTS broker_carrier_vetting (
  id                       INTEGER PRIMARY KEY AUTOINCREMENT,
  load_id                  INTEGER NOT NULL REFERENCES loads(id) ON DELETE CASCADE,
  carrier_mc               TEXT,
  carrier_name             TEXT,
  insurance_verified       INTEGER NOT NULL DEFAULT 0,
  authority_active         INTEGER NOT NULL DEFAULT 0,
  safety_rating            TEXT,  -- Satisfactory | Conditional | Unsatisfactory | Not Rated
  carrier_packet_received  INTEGER NOT NULL DEFAULT 0,
  vetting_date             TEXT,
  notes                    TEXT,
  created_at               TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_vetting_load ON broker_carrier_vetting(load_id);
```

### New Fields on Existing Models

**Load interface additions (TypeScript)**
```typescript
load_mode: 'dispatch' | 'broker'   // migration 040
```

**Broker interface additions (TypeScript)**
```typescript
contact_type: 'broker' | 'shipper' | 'carrier'  // migration 041
```

### New Repositories Required

| Repo | Tables |
|------|--------|
| `datPostingsRepo.ts` | `dat_postings` |
| `carrierOffersRepo.ts` | `carrier_offers` |
| `brokerCarrierVettingRepo.ts` | `broker_carrier_vetting` |

### New Type Unions

```typescript
export type BrokerLoadStatus =
  | 'Intake' | 'Posted' | 'Offers Received' | 'Carrier Selected'
  | 'Picked Up' | 'In Transit' | 'Delivered' | 'Invoiced' | 'Paid'

export type DispatchLoadStatus = LoadStatus  // existing union unchanged
```

### Updated Logic Flows

**Dispatch workflow (no changes):**
- Load created with `load_mode = 'dispatch'` (default).
- Existing 7-stage lifecycle unchanged.
- All existing pages, scanner, and timeline logic unaffected.

**Broker workflow (new path):**
1. Shipper contact added to `brokers` with `contact_type = 'shipper'`.
2. Load created with `load_mode = 'broker'`, status `Intake`.
3. DAT posting created in `dat_postings`; status → `Posted`.
4. Carrier calls logged in `carrier_offers`; status → `Offers Received`.
5. Offer accepted → vetting checklist filled in `broker_carrier_vetting`; status → `Carrier Selected`.
6. Load proceeds through `Picked Up → In Transit → Delivered` (same as dispatch).
7. Invoice generated against shipper (`broker_id` where `contact_type = 'shipper'`); status → `Invoiced → Paid`.

**Shared components (no changes required):**
- `loadTimelineRepo.ts` — timeline events work on any load_id regardless of mode.
- `notesRepo.ts` — notes attach to any entity.
- `invoicesRepo.ts` — invoice generation unchanged; broker-mode invoices point to shipper as `broker_id`.
- `auditRepo.ts` — audit trail unchanged.

---

## PHASE 5 — DOCUMENTATION SYNC

### Outdated Documents

| File | Issue |
|------|-------|
| `docs/DATA_ARCHITECTURE.md` | States "15+ tables, 19 migrations". Actual count: 25+ tables, 39 migrations. Last updated 2026-03-17. |
| `docs/ARCHITECTURE.md` | IPC channel table shows ~50 channels. Actual count is significantly higher (outreach, timeline, intel, operations, profitRadar, reports, loadMatch, loadDeductions, loadAttachments, loadAccessorials, brokerCallLog, carrierBrokerApproval, etc. added after last doc sweep). Last updated 2026-03-15. |
| `docs/FEATURE_REGISTRY.md` | Last updated 2026-03-15. Missing: Active Load Timeline, Load Match, Reports, Outreach Engine, Driver Acquisition Pipeline, FB Agents, Operations Control Panel, Morning Briefing, Rate Calculator, Broker Intelligence, Load Accessorials, Driver Deductions. |
| `docs/ROADMAP.md` | Last updated 2026-03-15. Phase 2 shows Operations Control Panel, Profit Radar, Outreach Engine as planned but they are all complete. Sessions 15-28 work not reflected. |
| `README.md` | Features table missing: Reports, Operations, Load Match, Active Loads, FB Agents. Migration count still says 9. |
| `docs/DECISIONS.md` | Missing decisions for: Claude AI integration (DEC-014), FB Agents web server (DEC-015), Outreach Engine DB-backed refresh vs localStorage (DEC-016). |

### Missing Documentation

- `docs/OUTREACH_ENGINE_SPEC.md` — exists (created Session 28). No entry in `FEATURE_REGISTRY.md`.
- No doc describing the Driver Acquisition Pipeline (driver_prospects, prospect_outreach_log tables, ProspectStage lifecycle).
- No doc describing the FB Agents architecture (webServer.ts, loadBoardParser.ts, Claude in Chrome integration).
- No doc describing the Operations Control Panel + Profit Radar data sources.

### Required Updates (Sections Only)

**`docs/DATA_ARCHITECTURE.md` — Migration table**
Replace "v10-v19: Additional columns and tables" with explicit entries for v10-v39. Add new tables: `load_timeline_events`, `load_attachments`, `load_deductions`, `load_accessorials`, `driver_prospects`, `prospect_outreach_log`, `driver_onboarding_checklist`, `carrier_broker_approvals`, `outreach_refresh_log`.

**`docs/ROADMAP.md` — Phase 2 status**
Mark all Operations Control Panel, Profit Radar, Outreach Engine, Driver Acquisition Pipeline, FB Agents, Load Match, Active Loads, Reports items as complete. Add Phase 3 broker module as planned.

**`docs/FEATURE_REGISTRY.md` — Add missing features**
Sessions 15-28 features need entries: Operations, Profit Radar, Load Match, Active Loads, Timeline/Check Calls, Reports, Outreach Engine, Driver Prospects, FB Agents, Rate Calculator, Load Attachments, Load Deductions, Load Accessorials, Batch Invoices, Broker Contact Log, Broker Intelligence, Driver Compliance Dashboard.

**`docs/ARCHITECTURE.md` — IPC channel table**
Add all channels added in Sessions 15-28. Correct directory tree to include new files: `operations.ts`, `profitRadar.ts`, `reports.ts`, `brokerIntelligence.ts`, `webServer.ts`, `loadBoardParser.ts`, `claudeApi.ts`, all new repo files.

---

## PHASE 6 — SAFE IMPLEMENTATION PLAN

### Step Order (each step is independently testable before proceeding)

**Step 1 — Documentation sync (no code changes)**
- Update `docs/DATA_ARCHITECTURE.md`, `docs/ROADMAP.md`, `docs/FEATURE_REGISTRY.md`, `docs/ARCHITECTURE.md`, `README.md`.
- Test: read updated docs; verify no contradictions with current app state.
- Rollback: git revert the doc files.

**Step 2 — R1: Remove localStorage from outreachEngine.ts**
- Delete `getWeeklyRefreshState()` and `markAiRefreshDone()` from `outreachEngine.ts`.
- Update `Marketing.tsx` to use `window.api.outreach.getLastRefresh()` and `window.api.outreach.logRefresh()` exclusively.
- Test: open Marketing tab; verify Outreach Engine tab loads, generates posts, marks refresh done, shows correct last-refresh date. Verify no localStorage keys written.
- Rollback: revert two files.

**Step 3 — R6: Migration number validation**
- Add pre-flight check in `runMigrations()`.
- Test: launch app; confirm it starts cleanly. Temporarily insert a duplicate migration version and verify it throws.
- Rollback: revert `migrations.ts`.

**Step 4 — R5: Audit and remove orphaned repos**
- Grep `ipcHandlers.ts` for any handler using `fbContentRepo`, `fbHunterRepo`, `prospectOutreachRepo`, `driverOnboardingRepo`, `loadAccessorialsRepo`.
- For any repo with no handler: delete repo file and remove export from `repositories/index.ts`.
- Test: `tsc --noEmit` zero errors; app builds and launches.
- Rollback: restore deleted files from git.

**Step 5 — Broker schema migrations (040-044)**
- Add migrations 040-044 to `migrations.ts`. Add to MIGRATIONS array.
- Test: launch app; confirm migrations run without error; verify new columns and tables exist via `db:query` in DevTools.
- Rollback: removing migrations from a running DB is destructive — test in a branch with a fresh DB first.

**Step 6 — New repo files**
- Create `datPostingsRepo.ts`, `carrierOffersRepo.ts`, `brokerCarrierVettingRepo.ts`.
- Export from `repositories/index.ts`.
- Test: `tsc --noEmit` zero errors.
- Rollback: delete new repo files.

**Step 7 — Wire broker repos to IPC**
- Add IPC handlers for dat_postings, carrier_offers, broker_carrier_vetting in `ipcHandlers.ts`.
- Add to preload `index.ts` and `global.d.ts`.
- Test: invoke channels from browser console; confirm data round-trips.
- Rollback: remove handlers from ipcHandlers + preload + global.d.ts.

**Step 8 — Update models.ts**
- Add `load_mode` to `Load` interface. Add `contact_type` to `Broker` interface.
- Add `BrokerLoadStatus` union type. Add new DTO types for new tables.
- Test: `tsc --noEmit` zero errors.
- Rollback: revert `models.ts`.

**Step 9 — Update existing repo SQL**
- Update `loadsRepo.ts` CREATE and UPDATE to include `load_mode`.
- Update `brokersRepo.ts` CREATE and UPDATE to include `contact_type`.
- Test: create a dispatch load; verify `load_mode = 'dispatch'` stored. Create a shipper contact; verify `contact_type = 'shipper'` stored.
- Rollback: revert the two repo files.

**Step 10 — Broker UI: Shippers tab in Brokers page**
- Add filter toggle to `Brokers.tsx`: All / Brokers / Shippers / Carriers.
- `BrokerModal.tsx`: add `contact_type` dropdown.
- Test: create a shipper contact; verify it appears under Shippers filter and not in the default Brokers view.
- Rollback: revert `Brokers.tsx` and `BrokerModal.tsx`.

**Step 11 — Broker UI: Broker Loads page or filter**
- Add `load_mode` filter to `Loads.tsx` toolbar (Dispatch / Broker / All).
- `LoadModal.tsx`: add `load_mode` field (defaults to 'dispatch').
- Test: create a broker-mode load; verify it shows only under Broker filter.
- Rollback: revert `Loads.tsx` and `LoadModal.tsx`.

**Step 12 — Broker UI: DAT Posting section in LoadDrawer**
- In `LoadDrawer.tsx`, for broker-mode loads: show DAT Postings section with add/list/expire actions.
- Test: add a DAT posting to a broker load; verify it appears in drawer.
- Rollback: revert `LoadDrawer.tsx`.

**Step 13 — Broker UI: Carrier Offers section in LoadDrawer**
- In `LoadDrawer.tsx`, for broker-mode loads: show Carrier Offers section with log/accept/reject actions.
- Test: log an offer; accept it; verify load status updates.
- Rollback: revert `LoadDrawer.tsx`.

**Step 14 — Broker UI: Vetting checklist in LoadDrawer**
- In `LoadDrawer.tsx`, for broker-mode loads: show carrier vetting checklist when an offer is accepted.
- Test: complete checklist; verify vetting record stored.
- Rollback: revert `LoadDrawer.tsx`.

**Step 15 — R4: Split ipcHandlers.ts (optional, last)**
- Extract handlers domain-by-domain into `electron/main/handlers/` files.
- Test after each domain: `tsc --noEmit`, app launch, affected IPC channels smoke-tested.
- Note: This is the highest-effort, lowest-urgency refactor. Do last.

---

## PHASE 7 — FINAL VALIDATION CHECKLIST

### Dispatch Workflows

- [ ] Create a load with `load_mode = 'dispatch'` (default); verify all 7 status stages function
- [ ] Dispatcher board shows only dispatch-mode loads
- [ ] Load Match surfaces only dispatch-mode Searching loads
- [ ] Active Loads timeline functions for dispatch loads
- [ ] Invoice generated from dispatch load; status cascade (Invoiced → load status update) works
- [ ] Rate Confirmation and Settlement PDFs generate correctly for dispatch loads
- [ ] FMCSA lead import runs without error; new leads appear in Leads table
- [ ] Driver compliance dashboard shows expiry alerts
- [ ] Broker intelligence scoring appears on Load Match and BrokerDrawer

### Broker Workflows

- [ ] Shipper created in Brokers with `contact_type = 'shipper'`; appears in Shippers filter
- [ ] Broker-mode load created; appears in Broker filter; does not appear in Dispatcher board
- [ ] DAT posting logged on broker load; status updates to Posted
- [ ] Carrier offer logged; accepted offer changes load status to Carrier Selected
- [ ] Vetting checklist completed and stored
- [ ] Broker load progresses through Picked Up → In Transit → Delivered
- [ ] Invoice generated against shipper; paid status cascades correctly

### No Redundant Systems

- [ ] `outreachEngine.ts` uses zero localStorage for refresh state; only DB-backed path active
- [ ] Broker contact log now stored in `notes` table; `broker_call_log` table empty after migration (if R3 implemented)
- [ ] No orphaned repo files remain in `repositories/` without wired IPC handlers

### Documentation Matches Functionality

- [ ] `docs/DATA_ARCHITECTURE.md` migration count matches `MIGRATIONS.length`
- [ ] `docs/FEATURE_REGISTRY.md` includes all implemented features through Session 28
- [ ] `docs/ARCHITECTURE.md` IPC channel table is complete
- [ ] `docs/ROADMAP.md` Phase 2 items marked complete; broker module listed as Phase 3 planned
- [ ] `README.md` features table and migration count current

---

## APPENDIX — NAMING CLARITY NOTE

Throughout this document, "broker" has two distinct meanings in this app:

| Term | Meaning |
|------|---------|
| **Freight broker** (existing) | A company like Coyote, Echo, XPO Logistics that posts loads OnTrack dispatches its drivers against. Stored in `brokers` table with `contact_type = 'broker'`. |
| **Broker mode** (new) | OnTrack itself acting as a freight broker — taking load orders from shippers, posting on DAT, vetting carriers, moving freight, billing shippers. Uses `load_mode = 'broker'` on loads. |

This distinction must be maintained consistently in all future code, UI labels, and documentation to avoid confusion.
