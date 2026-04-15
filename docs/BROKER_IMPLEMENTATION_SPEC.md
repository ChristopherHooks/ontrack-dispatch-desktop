# OnTrack — Evidence-Backed Implementation Specification

Generated: 2026-04-15
Scope: Verified against source. No claims without file/line evidence.

---

## 1. VERIFIED REDUNDANCIES

---

### R1 — outreachEngine.ts has dead localStorage functions

**Files:**
- `src/lib/outreachEngine.ts` lines 669–692: `getWeeklyRefreshState()` and `markAiRefreshDone()` write/read `localStorage`

**Overlap:**
- `electron/main/repositories/outreachRepo.ts`: `getLastRefresh()` / `logRefresh()` — DB-backed equivalents
- `electron/preload/index.ts` lines 307–313: `window.api.outreach.getLastRefresh` / `logRefresh` — fully exposed
- `src/pages/Marketing.tsx` line 20: imports only `generateTodaysOutreach, OutreachVars, GeneratedPost, OutreachResult` from `outreachEngine.ts` — the localStorage functions are imported in the module but not called from Marketing.tsx (grep confirms zero callsites)

**Status:** The localStorage functions exist and are defined but have zero callsites in the renderer. The DB path is the active path.

**Action:** Delete `getWeeklyRefreshState()` and `markAiRefreshDone()` from `outreachEngine.ts` (lines 669–692). No callsite cleanup needed in Marketing.tsx.

**Confidence:** High.

---

### R2 — analytics.ts and reports.ts compute similar but NOT identical broker/lane data

**Files:**
- `electron/main/analytics.ts`: `brokerReliability` (all loads, no status filter, returns `avgRate`), `laneProfitability` (all loads, orders by `totalRevenue`)
- `electron/main/reports.ts`: `brokerSummary` (Delivered/Invoiced/Paid only, returns `total_fee` + `avg_rpm` + FSC-inclusive gross), `lanePerformance` (Delivered/Invoiced/Paid, returns `best_rpm` + `total_fee`, orders by `avg_rpm`)

**Exact difference:**
- `analytics.ts` `brokerReliability` = no status filter, 10 rows, `AVG(rate)` not RPM
- `reports.ts` `brokerSummary` = status-filtered, 20 rows, `dispatch_fee` + `total_gross` including FSC
- Different consumers: `Analytics.tsx` uses `analytics:stats`; `Reports.tsx` uses `reports:data`

**Verdict:** Conceptual overlap; meaningfully different queries and output shapes. Do NOT merge. Note for future: if Analytics page is ever deprecated in favor of Reports, `analytics.ts` becomes removable.

**Confidence:** High (queries read side-by-side).

---

### R3 — broker_call_log table overlaps with notes table in purpose

**Files:**
- `electron/main/repositories/brokerCallLogRepo.ts`: `broker_call_log` table (`id, broker_id, note, created_at`)
- `electron/main/schema/migrations.ts` migration031: creates `broker_call_log`
- `electron/main/repositories/notesRepo.ts`: `notes` table (`entity_type, entity_id, content, user_id, created_at`)
- `src/components/brokers/BrokerDrawer.tsx` lines 74, 108, 112: calls `window.api.brokerCallLog.*`

**Verdict:** Same conceptual purpose (timestamped contact notes on a broker). `broker_call_log` is simpler (no user_id routing). Migration 031 is live, data may exist. Merging requires a data migration. Low urgency — keep as-is until broker mode build is complete.

**Action:** Defer. Do not merge for broker rollout.

**Confidence:** High.

---

### R4 — preload offResult listener leak (not a redundancy but a known defect)

**File:** `electron/preload/index.ts` lines 322–324
```
offResult: (cb: (data: unknown) => void) =>
  ipcRenderer.removeListener('loads:browser-import', (_e: unknown, data: unknown) => cb(data)),
```
The anonymous wrapper is a new function reference on each call — `removeListener` never matches. Carried since Session 21.

**Impact:** FindLoads.tsx poll is the active mechanism; the push listener leaks on unmount but is not the active path.

**Action:** Fix as a standalone cleanup step, not part of broker rollout.

**Confidence:** High.

---

## 2. VERIFIED RISK AREAS

---

### Risk 1 — FB IPC handlers wired in main process, not exposed to renderer

**File:** `electron/main/ipcHandlers.ts`
- Line 24: imports `listFbConversations, getFbConversation, createFbConversation, updateFbConversation, deleteFbConversation, fbConversationExists` from repositories
- Line 25-26: imports `listFbPosts, createFbPost, updateFbPost, deleteFbPost, fbPostExists` and `listFbQueuePosts ... getRecentFbPostCategories`
- Lines 434–516: `fbConv:*`, `fbHunter:*`, `fbContent:*` handlers registered

**Not in preload:** `electron/preload/index.ts` has no `fbConv`, `fbHunter`, or `fbContent` namespace.
**Page status:** `src/pages/FacebookAgents.tsx` returns `null` — file header says "removed."

**Risk:** Dead IPC handlers consuming startup registration time; if someone adds preload exposure without a live page, a crash vector is introduced with no visible UI to catch it.

**Mitigation:** Remove `fbConv:*`, `fbHunter:*`, `fbContent:*` handlers from `ipcHandlers.ts` AND remove the three repo imports from the import block. Keep the repo files in place (they contain useful table schemas and query patterns). Verify `tsc --noEmit` after removal.

---

### Risk 2 — ipcHandlers.ts is 670 lines with no domain separation

**File:** `electron/main/ipcHandlers.ts` (670 lines, 161 IPC channels per preload count)

**Risk:** Any syntax error in one handler can cause the entire IPC layer to fail to register. No test coverage. High collision risk for concurrent edits.

**Mitigation:** Do NOT split before broker rollout. Split is the last step after all broker handlers are confirmed working.

---

### Risk 3 — Migration array is a single long export with no gap/duplicate detection

**File:** `electron/main/schema/migrations.ts` line 1127: MIGRATIONS array
**Count:** 39 migrations (001–039), all confirmed sequential with no gaps.
**Risk:** A future migration with a duplicate version number would silently skip or corrupt `schema_version`.
**Mitigation:** Add one pre-flight check to `runMigrations()` before broker migrations are added. Low effort, high protection.

---

### Risk 4 — loads table DELETE guard only covers Booked/Picked Up/In Transit

**File:** `electron/main/repositories/loadsRepo.ts` lines 5, 54–57:
```typescript
const ACTIVE_STATUSES = ['Booked', 'Picked Up', 'In Transit']
if (ACTIVE_STATUSES.includes(existing.status)) { throw ... }
```
When broker-mode loads are added with status `'Carrier Selected'`, that status is not in `ACTIVE_STATUSES`. A broker load with a committed carrier could be deleted without a guard.

**Mitigation:** Update `ACTIVE_STATUSES` to include `'Carrier Selected'` when broker statuses are added.

---

## 3. ORPHANED OR PARTIALLY WIRED MODULES

---

### fbConversationRepo.ts / fbHunterRepo.ts / fbContentRepo.ts

**File paths:**
- `electron/main/repositories/fbConversationRepo.ts`
- `electron/main/repositories/fbHunterRepo.ts`
- `electron/main/repositories/fbContentRepo.ts`

**IPC handlers:** Registered in `ipcHandlers.ts` lines 434–516. Imported at lines 24–26.
**Preload exposure:** None. No `fbConv`, `fbHunter`, or `fbContent` namespace in `preload/index.ts`.
**Renderer usage:** Zero. `FacebookAgents.tsx` returns null.
**Status:** Wired in main process only. Dead from renderer's perspective.
**Action:** Remove the 3 handler blocks from `ipcHandlers.ts` and the 3 import lines. Keep the repo files.
**Confidence:** High.

---

### carrierBrokerApprovalRepo.ts

**File:** `electron/main/repositories/carrierBrokerApprovalRepo.ts`
**Migration:** 032 (confirmed, `carrier_broker_approvals` table)
**IPC:** `ipcHandlers.ts` lines 280–282 (`carrierApprovals:list/upsert/delete`)
**Preload:** `preload/index.ts` lines 125–129 (`carrierApprovals` namespace)
**Renderer usage:** `src/components/drivers/DriverDrawer.tsx` lines 99, 146, 163

**Status:** Fully wired and in active use.
**Action:** None. Not orphaned.

---

### driverProspectsRepo.ts / prospectOutreachRepo.ts

**IPC:** wired in `ipcHandlers.ts` lines 285–294
**Preload:** exposed at lines 132–145
**Renderer usage:** `src/pages/DriverAcquisition.tsx`, `src/components/driver-acquisition/ProspectDrawer.tsx`

**Status:** Fully wired and in active use.
**Action:** None.

---

### driverOnboardingRepo.ts

**IPC:** `ipcHandlers.ts` lines 297–298
**Preload:** lines 147–151
**Renderer usage:** `src/components/drivers/DriverDrawer.tsx` lines 97, 137; `src/components/drivers/DriverOnboardingPipeline.tsx`

**Status:** Fully wired and in active use.
**Action:** None.

---

### loadAccessorialsRepo.ts

**IPC:** `ipcHandlers.ts` lines 301–304
**Preload:** lines 153–159
**Renderer usage:** `src/components/loads/LoadAccessorialsPanel.tsx` lines 32, 42, 57

**Status:** Fully wired and in active use.
**Action:** None.

---

## 4. BROKER ARCHITECTURE SPEC

### Conceptual boundary

The existing `brokers` table = freight brokers OnTrack dispatches against (they source loads for drivers OnTrack manages). This is NOT changing.

Broker mode = OnTrack acting as a broker: takes a load order from a shipper, posts it on DAT, receives carrier calls, vets and selects a carrier, manages the move, bills the shipper.

---

### Changes to existing tables

**`loads` table — add `load_mode` column**
```sql
-- migration 040
ALTER TABLE loads ADD COLUMN load_mode TEXT NOT NULL DEFAULT 'dispatch'
-- Values: 'dispatch' | 'broker'
-- Existing rows default to 'dispatch' — zero data impact
```

**`brokers` table — add `contact_type` column**
```sql
-- migration 041
ALTER TABLE brokers ADD COLUMN contact_type TEXT NOT NULL DEFAULT 'broker'
-- Values: 'broker' | 'shipper'
-- Existing rows default to 'broker' — zero data impact
-- Shippers are the companies that give loads to OnTrack in broker mode
```

No other existing tables require changes for the initial broker module.

---

### New tables

**`dat_postings` — migration 042**
```sql
CREATE TABLE IF NOT EXISTS dat_postings (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  load_id     INTEGER NOT NULL REFERENCES loads(id) ON DELETE CASCADE,
  posted_rate REAL,
  posted_at   TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at  TEXT,
  posting_ref TEXT,      -- DAT reference number or internal label
  status      TEXT NOT NULL DEFAULT 'active', -- active | expired | filled
  notes       TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_dat_load ON dat_postings(load_id);
```

**`carrier_offers` — migration 043**
```sql
CREATE TABLE IF NOT EXISTS carrier_offers (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  load_id       INTEGER NOT NULL REFERENCES loads(id) ON DELETE CASCADE,
  carrier_name  TEXT NOT NULL,
  mc_number     TEXT,
  phone         TEXT,
  offered_rate  REAL,
  offered_at    TEXT NOT NULL DEFAULT (datetime('now')),
  status        TEXT NOT NULL DEFAULT 'Pending',
  -- status values: Pending | Accepted | Rejected | Countered
  counter_rate  REAL,
  final_rate    REAL,
  notes         TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_offers_load ON carrier_offers(load_id);
```

**`broker_carrier_vetting` — migration 044**
```sql
CREATE TABLE IF NOT EXISTS broker_carrier_vetting (
  id                      INTEGER PRIMARY KEY AUTOINCREMENT,
  load_id                 INTEGER NOT NULL REFERENCES loads(id) ON DELETE CASCADE,
  carrier_mc              TEXT,
  carrier_name            TEXT,
  insurance_verified      INTEGER NOT NULL DEFAULT 0,  -- 0 | 1
  authority_active        INTEGER NOT NULL DEFAULT 0,  -- 0 | 1
  safety_rating           TEXT,
  -- safety_rating values: Satisfactory | Conditional | Unsatisfactory | Not Rated
  carrier_packet_received INTEGER NOT NULL DEFAULT 0,  -- 0 | 1
  vetting_date            TEXT,
  notes                   TEXT,
  created_at              TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_vetting_load ON broker_carrier_vetting(load_id);
-- One vetting record per load (accepted carrier)
```

---

### New TypeScript types (additions to models.ts)

```typescript
// Add to Load interface
load_mode: 'dispatch' | 'broker'

// Add to Broker interface
contact_type: 'broker' | 'shipper'

// New union — broker-mode load statuses
export type BrokerLoadStatus =
  | 'Intake'            // load received from shipper
  | 'Posted'            // posted on DAT
  | 'Offers Received'   // at least one carrier has called
  | 'Carrier Selected'  // offer accepted, vetting complete
  | 'Picked Up'         // shared with dispatch mode
  | 'In Transit'        // shared with dispatch mode
  | 'Delivered'         // shared with dispatch mode
  | 'Invoiced'          // shipper billed
  | 'Paid'              // shipper paid

// New interfaces
export interface DatPosting { ... }
export interface CarrierOffer { ... }
export interface BrokerCarrierVetting { ... }
```

---

### Relationships

```
brokers (contact_type='shipper')
  └── loads (load_mode='broker', broker_id=shipper_id)
        ├── dat_postings (one or more per load)
        ├── carrier_offers (one or more per load)
        └── broker_carrier_vetting (one per load, set when offer accepted)

loads (load_mode='broker', Carrier Selected+)
  └── load_timeline_events  ← reused unchanged
  └── notes                 ← reused unchanged
  └── load_attachments      ← reused unchanged
  └── invoices (broker_id=shipper_id) ← reused unchanged
```

---

### Shared vs broker-specific workflow boundaries

**Shared (no changes):**
- `load_timeline_events` — check call engine works for any load_id regardless of mode
- `notesRepo.ts` — generic entity notes attach by entity_type/entity_id
- `loadAttachmentsRepo.ts` — file attachments work per load_id
- `load_deductions` — deduction line items work per load_id
- `load_accessorials` — detention/lumper items work per load_id
- `invoicesRepo.ts` — invoice generation unchanged; broker-mode invoice points to shipper as `broker_id`
- `auditRepo.ts` — unchanged

**Dispatch-specific (unchanged):**
- `carrierBrokerApprovalRepo.ts` — tracks which freight brokers have approved each driver
- `loadScanner.ts` — load matching for dispatch drivers
- `dispatcherBoard.ts` — should only show dispatch-mode loads (filter by `load_mode='dispatch'`)

**Broker-specific (new):**
- `datPostingsRepo.ts`
- `carrierOffersRepo.ts`
- `brokerCarrierVettingRepo.ts`

---

## 5. MIGRATION PLAN

Current state: 39 migrations (001–039) confirmed. Next migration number: 040.

| # | Variable Name | Purpose | Dependency | Rollback |
|---|---|---|---|---|
| 040 | `migration040` | Add `load_mode TEXT NOT NULL DEFAULT 'dispatch'` to `loads` via `addColumnIfMissing` | None — addColumnIfMissing is safe on existing data | Drop column (SQLite 3.35+) or leave as-is; no data loss |
| 041 | `migration041` | Add `contact_type TEXT NOT NULL DEFAULT 'broker'` to `brokers` via `addColumnIfMissing` | None | Same as above |
| 042 | `migration042` | Create `dat_postings` table + index | Requires `loads` table (exists from migration001) | Drop table |
| 043 | `migration043` | Create `carrier_offers` table + index | Requires `loads` table | Drop table |
| 044 | `migration044` | Create `broker_carrier_vetting` table + unique index | Requires `loads` table | Drop table |

**All use `CREATE TABLE IF NOT EXISTS` and `addColumnIfMissing` — safe to run on existing databases.**

**Important:** The existing `carrier_broker_approvals` table (migration032) is DIFFERENT from `broker_carrier_vetting`. `carrier_broker_approvals` tracks which freight brokers have approved a given driver as a carrier they can haul for. `broker_carrier_vetting` tracks compliance of an inbound carrier OnTrack selects to haul a brokered load. Do NOT conflate these.

---

## 6. IPC / REPO / SERVICE CHANGE MAP

### Existing IPC handlers to update

| Handler | File | Change |
|---|---|---|
| `loads:list` | `ipcHandlers.ts` | Add optional `load_mode` filter parameter |
| `dispatcher:board` | `ipcHandlers.ts` → `dispatcherBoard.ts` | Add `WHERE load_mode = 'dispatch'` filter to board SQL |
| `scanner:recommendLoads` | `ipcHandlers.ts` → `loadScanner.ts` | Add `WHERE load_mode = 'dispatch'` filter to Searching loads query |

### Existing repos to update

| File | Change |
|---|---|
| `electron/main/repositories/loadsRepo.ts` | Add `load_mode` to `createLoad` INSERT and `updateLoad` UPDATE SQL. Add `'Carrier Selected'` to `ACTIVE_STATUSES` guard. |
| `electron/main/repositories/brokersRepo.ts` | Add `contact_type` to `createBroker` INSERT and `updateBroker` UPDATE SQL. |
| `src/types/models.ts` | Add `load_mode` to `Load` interface. Add `contact_type` to `Broker` interface. Add `BrokerLoadStatus` union. Add `DatPosting`, `CarrierOffer`, `BrokerCarrierVetting` interfaces. |
| `src/types/global.d.ts` | Add `datPostings`, `carrierOffers`, `brokerVetting` namespaces to `Window.api`. |

### New repos to create

| File | Methods |
|---|---|
| `electron/main/repositories/datPostingsRepo.ts` | `listDatPostings(db, loadId)`, `createDatPosting(db, dto)`, `updateDatPosting(db, id, dto)`, `deleteDatPosting(db, id)` |
| `electron/main/repositories/carrierOffersRepo.ts` | `listCarrierOffers(db, loadId)`, `createCarrierOffer(db, dto)`, `updateCarrierOffer(db, id, dto)`, `deleteCarrierOffer(db, id)` |
| `electron/main/repositories/brokerCarrierVettingRepo.ts` | `getVetting(db, loadId)`, `upsertVetting(db, dto)` |

### New IPC handlers to add (all in ipcHandlers.ts)

```
datPostings:list    (loadId: number)
datPostings:create  (dto)
datPostings:update  (id, dto)
datPostings:delete  (id)

carrierOffers:list    (loadId: number)
carrierOffers:create  (dto)
carrierOffers:update  (id, dto)
carrierOffers:delete  (id)

brokerVetting:get    (loadId: number)
brokerVetting:upsert (dto)
```

### Dead handlers to remove from ipcHandlers.ts (separate step, before broker work)

Handlers for `fbConv:*` (lines 430–436), `fbHunter:*` (lines 475–479), `fbContent:*` (lines 511–516).
Remove corresponding imports from `ipcHandlers.ts` lines 24–26.
These have no preload exposure and no renderer callsites.

### ipcHandlers.ts split — DELAY until after broker rollout

Splitting `ipcHandlers.ts` into domain files is a structural refactor. It provides zero new functionality and introduces risk during broker development. Execute last, after all broker handlers are confirmed working.

---

## 7. DOC UPDATE MAP

| File | Outdated Section | What's Wrong | Fix |
|---|---|---|---|
| `docs/DATA_ARCHITECTURE.md` | Migration table | States "v10-v19: additional columns." Actual: 39 migrations, not 19. New tables not listed: `load_timeline_events`, `load_attachments`, `load_deductions`, `load_accessorials`, `driver_prospects`, `prospect_outreach_log`, `driver_onboarding_checklist`, `carrier_broker_approvals`, `outreach_refresh_log` | Expand migration table to list v10–v39 explicitly. Add new tables to the tables list. |
| `docs/ARCHITECTURE.md` | IPC channel table | Stops at ~50 channels from Session 14. Missing: all channels added Sessions 15–28 (timeline, intel, profitRadar, operations, reports, loadMatch, outreach, loadDeductions, loadAttachments, loadAccessorials, brokerCallLog, carrierApprovals, driverProspects, prospectOutreach, driverOnboarding, fbConv, fbHunter, fbContent). | Append missing channels. Remove fbConv/fbHunter/fbContent after dead handlers are cleaned up. |
| `docs/ARCHITECTURE.md` | Directory tree | Missing: `operations.ts`, `profitRadar.ts`, `reports.ts`, `brokerIntelligence.ts`, `webServer.ts`, `loadBoardParser.ts`, `claudeApi.ts`, 14 new repo files added Sessions 15–28, new page files and component folders. | Update tree. |
| `docs/ROADMAP.md` | Phase 2 | All items shown as planned; all are complete. Sessions 15–28 work absent. Broker module not listed as Phase 3. | Mark Phase 2 complete. Add Phase 3 with broker module items. |
| `docs/FEATURE_REGISTRY.md` | Feature list | Last updated 2026-03-15. Missing 14+ features implemented in Sessions 15–28. | Add: Operations Control Panel, Profit Radar, Load Match, Active Loads + Timeline, Reports, Outreach Engine, Driver Acquisition Pipeline, Carrier Approvals, Driver Onboarding Checklist, Load Accessorials, Batch Invoice Actions, Broker Intelligence, Rate Calculator, Driver Settlements page. |
| `README.md` | Features table | Missing: Reports, Operations, Load Match, Active Loads, Driver Acquisition, FB Agents (placeholder only). Migration count says 9. | Update features table. Update migration count to 39. |
| `docs/DECISIONS.md` | Decision log | Missing decisions for Claude AI integration pattern, the webServer.ts localhost:3001 architecture, and the DB-backed vs localStorage outreach refresh decision. | Add DEC-014 (Claude API integration via claudeApi.ts), DEC-015 (localhost:3001 browser import bridge), DEC-016 (outreach refresh moved to DB in Session 28). |

---

## 8. SAFE BUILD ORDER

Each step has a single gate and a single rollback point.

| Step | Change | Validation Gate | Rollback |
|------|--------|----------------|---------|
| 1 | Remove dead `getWeeklyRefreshState` + `markAiRefreshDone` from `outreachEngine.ts` (lines 669–692) | `tsc --noEmit` zero errors; Marketing tab loads; Outreach Engine generates posts; refresh state persists correctly | `git revert outreachEngine.ts` |
| 2 | Remove `fbConv:*`, `fbHunter:*`, `fbContent:*` handler blocks from `ipcHandlers.ts` (lines 430–516) and the 3 import lines (24–26) | `tsc --noEmit` zero errors; app launches; no channel-not-found errors in DevTools | `git revert ipcHandlers.ts` |
| 3 | Add migration number gap/duplicate pre-flight check to `runMigrations()` | App launches; check fires on startup; deliberately introduce duplicate version to confirm throw, then revert test | `git revert migrations.ts` |
| 4 | Add migrations 040–044 to `migrations.ts` + MIGRATIONS array | App launches; DevTools `db:query SELECT * FROM dat_postings` returns empty (no error); `SELECT load_mode FROM loads LIMIT 1` returns 'dispatch'; `SELECT contact_type FROM brokers LIMIT 1` returns 'broker' | Cannot drop columns/tables on SQLite without recreation — test only on a fresh DB copy |
| 5 | Create `datPostingsRepo.ts`, `carrierOffersRepo.ts`, `brokerCarrierVettingRepo.ts`; export from `repositories/index.ts` | `tsc --noEmit` zero errors | Delete repo files; remove exports from index.ts |
| 6 | Update `loadsRepo.ts` (add `load_mode` to INSERT/UPDATE; add `'Carrier Selected'` to ACTIVE_STATUSES) and `brokersRepo.ts` (add `contact_type` to INSERT/UPDATE) | Create a new load; verify `load_mode = 'dispatch'` stored. Create a broker; verify `contact_type = 'broker'` stored. `tsc --noEmit` zero errors. | `git revert loadsRepo.ts brokersRepo.ts` |
| 7 | Update `models.ts` + `global.d.ts` with new types | `tsc --noEmit` zero errors | `git revert models.ts global.d.ts` |
| 8 | Add new IPC handlers to `ipcHandlers.ts` (9 channels: datPostings, carrierOffers, brokerVetting) | Invoke each channel from DevTools console; confirm round-trip with test data | Remove the 9 handler blocks and 3 repo imports |
| 9 | Add new namespaces to `preload/index.ts` | App launches; `window.api.datPostings.list(1)` resolves in DevTools | Remove the 3 preload namespace blocks |
| 10 | Update `dispatcherBoard.ts` + `loadScanner.ts` to filter `load_mode = 'dispatch'` | Dispatcher board shows same loads as before (no broker loads exist yet); `tsc --noEmit` clean | `git revert dispatcherBoard.ts loadScanner.ts` |
| 11 | Add `contact_type` filter to `Brokers.tsx` toolbar; add `contact_type` field to `BrokerModal.tsx` | Create a shipper; verify it appears under Shippers filter; existing brokers still appear as before | `git revert Brokers.tsx BrokerModal.tsx` |
| 12 | Add `load_mode` field to `LoadModal.tsx`; add mode filter to `Loads.tsx` toolbar | Create broker-mode load; verify it shows under Broker filter; dispatch loads unchanged | `git revert LoadModal.tsx Loads.tsx` |
| 13 | Add DAT Postings section to `LoadDrawer.tsx` (broker-mode loads only) | Add a DAT posting to a broker load; verify it persists and displays | `git revert LoadDrawer.tsx` |
| 14 | Add Carrier Offers section to `LoadDrawer.tsx` (broker-mode loads only) | Log an offer; accept it; verify status updates to Carrier Selected | `git revert LoadDrawer.tsx` |
| 15 | Add Vetting Checklist section to `LoadDrawer.tsx` (shown when offer accepted) | Complete checklist; verify vetting record stored | `git revert LoadDrawer.tsx` |
| 16 | Update documentation (all 6 files in section 7) | Read updated docs; verify no contradictions with app state | `git revert` affected doc files |
| 17 | Split `ipcHandlers.ts` into domain files | `tsc --noEmit` zero errors; all IPC channels still respond; smoke-test 5 channels per domain file | `git revert` — restore monolith |
