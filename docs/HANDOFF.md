# Handoff -- OnTrack Dispatch Dashboard

This file captures the current state of the project for session continuity.
Update this file at the end of every meaningful work session.

---

## Last Updated

2026-04-17 (Session 40, Round 3)

## Current Branch

feature/first-real-task

---

## What Was Completed (Most Recent Sessions)

### Session 40 — Pre-Booking Profit Check in Find Loads (complete — 3 rounds)

Pure frontend feature. No schema changes, no IPC changes, no new dependencies.

**New file: `src/lib/profitability.ts`**
- `PROFIT_THRESHOLDS` const: centralized threshold config (REJECT_NET=100, THIN_NET=250, STRONG_NET=400, LONG_DEADHEAD_MI=200, HIGH_DH_RATIO=0.30)
- `LocationBasis` type: `'actual' | 'estimated'` — distinguishes confirmed driver location from fallbacks
- `checkProfitability(ProfitInput): ProfitCheck` — typed, pure function; carries `locationBasis` through to `ProfitResult`
- Returns `ProfitIncomplete` with `missingField` when location, CPM, rate, or miles are null

**Modified: `src/pages/FindLoads.tsx`**
- `dropCityBasis` state (`'actual' | 'estimated'`): set in same useEffect as `dropCity`
  - active-load dest → `'estimated'` (mid-haul drop, not confirmed position)
  - `current_location` → `'actual'` (dispatcher-confirmed)
  - home_base → `'estimated'` (standing default)
- `profitChecks` memo: passes `locationBasis: dropCityBasis` into each `checkProfitability` call
- `ProfitStrip`: always visible in LoadRow (no expand required); Net is hero value (text-xl font-bold, band color); supporting 3 metrics (Deadhead/Gross/Eff. RPM) at text-sm; "Loaded / Total / Cost" toggle reveals detail row; why-reasons expander for thin/reject; location basis pill in header
- `ProfitStrip` in FirstCallCard: same layout, shown above broker footer
- `hideBands` state (`Set<ProfitBand>`): filter toggles for 'reject' and 'thin' in results summary bar; loads with incomplete/no check data are never filtered out
- `sortedGoodLoads`: filter-then-sort pipeline; filter applied first to `goodLoads`, sort applied to filtered result
- `laneProjectedNet()` + `bandFromNet()` helpers: projected minimum net badge on lane suggestion cards (only when driver has both cpm and min_rpm set); tooltip shows calculation context
- `LoadRow`: always-visible profit sub-row (`<tr>`) inserted after main row; expanded section shows reasons/equipment only (strip removed from expand section)

tsc --noEmit: zero errors (verified after all 3 rounds).

---

### Session 39 — Find Loads Overhaul + CRM Seed Fix (complete)

**Find Loads page** (`src/pages/FindLoads.tsx`):
- Removed `PlanningModal` (copy-to-Claude flow). No longer exists.
- Added `SuggestedLanesPanel` — shows scored outbound lane cards in the empty state.
  Strategy tabs: All Lanes, Best Volume, Short Runs, Toward Home.
- Added `LaneSuggestionCard` — lane card with Fill DAT / Truckstop buttons.
  Buttons open the load board and copy structured search context to clipboard.
- Added `ImportOptionsPanel` — import instructions collapsed to secondary section.
- "Plan the Week" button → "Search Strategy" (toggles panel when results are loaded).

**New static data** (no AI, no external calls):
- `src/data/freightMarkets.ts` — 35 U.S. freight markets, city alias resolver.
- `src/data/freightLanes.ts` — Outbound lane map: priority, miles, trip category, tags.
- `src/services/laneSuggestionService.ts` — Scoring engine (priority + home + history).

**CRM seed fix** (`electron/main/seed.ts`):
- `seedLeads(db)` removed from `runSeedIfEmpty()`.
- Fresh installs and dev reseeds start with an empty CRM.
- Personal lead data is never pre-populated automatically.

### Session 38 — Reason-Based Unassignment Tracking (complete)

Every driver removal from an active load now records a reason. Only driver-fault
reasons (`driver_backed_out`, `no_response_after_acceptance`) count toward
`fallout_count` and tier degradation.

**Migration 047** — adds `unassignment_reason TEXT` to `driver_fallout_log` via
`addColumnIfMissing`. NULL treated as fallout for backward compat.

**`driverFalloutRepo.ts`** — `logFallout` gains `unassignmentReason?` param;
all SQL queries filter by reason. Added `total_unassignments` + `neutral_unassignments`.

**`ipcHandlers.ts`** — `loads:update` strips `unassignment_reason` from the dto
before the DB write, passes it to `logFallout`.

**`models.ts`** — `UNASSIGNMENT_REASONS` const array (8 entries, each with `value`,
`label`, `fallout` flag). `UpdateLoadDto` includes `unassignment_reason?: string`.

**`src/components/loads/constants.ts`** — `UNASSIGNMENT_REASON_OPTIONS` added.

**`LoadsTable.tsx` DriverDropdown** — two-phase UI: driver list → reason sub-panel
(when unassigning a currently-assigned driver). Back arrow, 8 reasons with `(fallout)`
label on driver-fault ones. Reassign path auto-passes `'admin_correction'`.

**`Loads.tsx`** — `handleDriverChange(load, driverId, reason?)` threads reason
through both unassign and reassign paths.

**`Drivers.tsx`** — `pendingUnassign` state replaces `window.confirm` for the
On Load → other status change path. Overlay modal shows 8 reason buttons + Cancel.
`handleConfirmUnassign(reason)` does the load unassign + driver status update.

tsc --noEmit: zero errors.

---

### Session 37 — Driver Reliability / Fallout Tracking + Tier in Drivers Table (complete)

New `driver_fallout_log` table (migration 046) tracks driver removals from active
loads. Separate reliability metrics (`fallout_count`, `accepted_not_completed_count`,
`completion_rate`) surface in the Driver Drawer without touching acceptance rate.
Tier badge now visible in the main Drivers table. Tier logic conservatively
incorporates fallout signal: 3+ fallouts → Tier C; more than 1 fallout blocks Tier A.

**electron/main/schema/migrations.ts** — migration046: `driver_fallout_log` table + indexes

**New file: `electron/main/repositories/driverFalloutRepo.ts`**
- `logFallout`, `getDriverFalloutStats`, `getAllDriverFalloutCounts`

**electron/main/ipcHandlers.ts**
- `loads:update`: calls `logFallout` on active-load driver removal (try/catch, non-critical)
- New: `drivers:falloutStats`, `drivers:allFalloutCounts`

**electron/preload/index.ts** — `falloutStats`, `allFalloutCounts` in drivers namespace

**src/types/models.ts** — `DriverFalloutStats`, `DriverFalloutCountRow` interfaces

**src/types/global.d.ts** — types imported; two new driver api methods typed

**src/lib/driverTierService.ts**
- `TierInput.fallout_count` added
- Thresholds: `C_FALLOUT: 3`, `A_FALLOUT: 1`
- `computeDriverTier`: fallout_count checked before acceptance rate in C path;
  `fallout_count <= 1` added to A conditions

**src/components/drivers/DriversTable.tsx**
- `tierMap?: Map<number, DriverTierResult>` prop
- Tier column (non-sortable) with `TIER_BADGE` tokens and hover tooltip

**src/pages/Drivers.tsx**
- `loadTierMap()`: parallel fetch of scorecards + fallout counts → tier map
- `tierMap` passed to `DriversTable`

**src/components/drivers/DriverDrawer.tsx**
- `falloutStats` state + fetch via `drivers.falloutStats(id)`
- Tier header badge uses real fallout_count
- Load Behavior section: Reliability block (Fallouts, Mid-Trip, Completion %)

**Other callers fixed (fallout_count: 0 default):**
- `src/pages/Reports.tsx` — both computeDriverTier call sites
- `src/components/operations/MorningDispatchBrief.tsx`

tsc --noEmit: zero errors.

---

### Session 36 — Inline Assignment + Consistency Pass (complete)

Surgical inline-editing pass across Loads table, Drivers table, and Driver Drawer
to enforce assignment consistency and reduce friction. No new IPC channels.
No schema changes. No redesigns.

**src/components/loads/LoadsTable.tsx**
- `DriverDropdown` component added (portal, same pattern as `StatusDropdown`)
- Shows non-Inactive drivers + currently assigned driver; "Unassigned" at top
- "On Load" drivers shown with `(on load)` label so dispatcher knows the risk
- `onDriverChange?: (l, driverId | null) => Promise<void>` prop added
- Driver cell now renders `<DriverDropdown>` instead of static text

**src/pages/Loads.tsx** — `handleDriverChange` added:
- `null` → unassign: `loads.update(id, { driver_id: null })` (Session 35 backend reverts load+driver)
- `null → driverId` → assign: `dispatcher.assignLoad` (Session 33 offer tracking fires)
- `driverA → driverB` → reassign: unassign first (→ Searching), then `assignLoad` for new driver
- All paths reload drivers state so Dispatch Board / Loads board stay in sync

**src/components/drivers/DriversTable.tsx**
- `DriverStatusDropdown` component added (portal, same pattern)
- `onStatusChange?: (d, status) => Promise<void>` prop added
- Status cell now renders `<DriverStatusDropdown>` instead of static badge

**src/pages/Drivers.tsx** — `handleStatus` extended with consistency guard:
- Before any `On Load → other` status change: calls `loads.list()` and looks for
  an active load (Booked/Picked Up/In Transit) assigned to this driver
- If found: shows `window.confirm(...)` naming the specific load ref
- If confirmed: unassigns the load via `loads.update(id, { driver_id: null })`
  (backend reverts load to Searching, no separate driver status reset needed
  since the explicit status update immediately follows)
- If declined: early return, nothing changes
- Passed as `onStatusChange` to `DriversTable` AND continues to serve the
  DriverDrawer status-change buttons

**Driver Drawer — Location**: already fully implemented in previous sessions
(inline text edit, pencil-on-hover, `saveLocation` → `drivers.update` → `onUpdate` →
`handleUpdate` in Drivers.tsx propagates to DriversTable). No changes needed.

tsc --noEmit: zero errors.

### Session 35 — Load Unassignment Fix (complete)

Fixed two-layer bug where removing a driver from a load left the DB and UI in a
partially reverted state. No schema changes. No new IPC channels. No refactors.

**Root causes (3):**
1. `updateLoad` (loadsRepo.ts) never touches the `drivers` table — old driver stayed
   `'On Load'` in the DB even after `driver_id` was cleared on the load.
2. `LoadModal` sends the current `status` field with the dto. With no explicit revert
   logic, the load stayed `'Booked'` with `driver_id=null`, hiding it from both
   `getAvailableLoads` (filters `status='Searching'`) and the dispatch board.
3. `handleSave` in `Loads.tsx` only updated `loads` state, not `drivers`. The
   embedded `DispatchBoard` continued showing the driver as `'On Load'`.

**electron/main/ipcHandlers.ts** — `loads:update` handler expanded:
- Fetches the load before update (`getLoad`)
- Detects driver removal: `before.driver_id != null && patch.driver_id === null`
- Injects `status: 'Searching'` into the dto when status is still `'Booked'`
  (so the load re-enters the available pool without requiring a manual status change)
- After `updateLoad`, resets old driver to `'Active'` if they have no other active loads
  (mirrors the inverse of `assignLoadToDriver`)
- `loadOffersAccepted` fix from Session 33 (dispatch:assignLoad) is untouched

**src/pages/Loads.tsx** — `handleSave` extended:
- After a save, checks if the previous load had a driver and the saved one does not
- If so, calls `window.api.drivers.list().then(setDrivers)` to refresh drivers state
- Keeps the dispatch board and drawer drivers prop in sync without a full reload

tsc --noEmit: zero errors.

### Session 34 — Driver Performance Tier System (complete)

Lightweight A/B/C/UNRATED driver tier computed dynamically from existing scorecard data.
No schema changes. No new IPC. Pure frontend computation. All additive.

New file: `src/lib/driverTierService.ts` — `computeDriverTier(TierInput): DriverTierResult`.
Exports: `DriverTier`, `DriverTierResult`, `TierInput`, `tierSortRank()`, `TIER_BADGE`,
`TIER_LABEL`. Thresholds in one constant block (`T`). Tier logic:
- UNRATED: resolved < 3 AND loads_booked < 2 (not enough data)
- C: acceptance_rate < 40% OR no_response >= 3 OR avg_response_minutes > 120
- A: all conditions met — acceptance >= 70%, response <= 60 min, no_response <= 1, loads >= 2
- B: has data, passes C checks, does not meet all A conditions

Types: `DriverTier`, `DriverTierResult`, `TierInput` re-exported from `src/types/models.ts`
via `export type { ... } from '../lib/driverTierService'`.
`MorningDispatchBriefRow` extended with 4 new fields: `accepted_count`, `declined_count`,
`no_response_count`, `loads_booked` (all `number`, default 0).

Backend: `electron/main/morningDispatchBrief.ts` now passes the 4 new fields from
scorecard map into each `MorningDispatchBriefRow` (zero-default when no scorecard).

UI — DriverDrawer: tier badge in header row (beside status badge), computed from `weeklyCard`.
Shows "Tier A/B/C" or "Unrated" using `TIER_BADGE` token classes.

UI — MorningDispatchBrief: tier badge in DriverCard header (beside driver name).
Variable name `driverTierResult` used to avoid conflict with existing `tier` (load score tier).

UI — Reports Driver Performance table: new "Tier" column (last column), sortable.
`ScoreSort` extended with `'tier'`. Sort logic special-cased: uses `tierSortRank()` instead
of numeric field access. `asc` sort = A-first (best to worst). Badge shows reason on hover via `title`.

tsc --noEmit: zero errors.

### Session 33 — Dynamic Daily Workflow System (complete)

Replaced the static Morning Briefing checklist on the Operations page with a
conditional, profit-first Daily Workflow panel. No schema changes. All additive.

New file: `src/lib/dailyWorkflowEngine.ts` — `computeDailyWorkflow(input, manuallyDone)`.
Pure function. 11 tasks, 4 tiers. Each task is `actionable`, `not_applicable`
(auto-skipped with reason), or `completed` (manually toggled per-session).
Tasks with no underlying data are skipped automatically with a reason shown.

New file: `src/components/operations/DailyWorkflowPanel.tsx` — renders the workflow.
Grouped by tier (Revenue Now / Revenue Protection / Pipeline / Admin).
Actionable: bold + orange badge + action button. Not-applicable: compact gray + reason.
Completed: green check + strikethrough + click to undo.
Scroll action: `#scroll:morning-dispatch-brief` scrolls in-page to the brief section.

Backend: `overdueInvoices: number` added to `operations.ts` + `models.ts`
(single COUNT query: `invoices WHERE status = 'Overdue'`). No new IPC channel needed
since this field piggybacks on the existing `operations:data` response.

Operations.tsx: static Morning Briefing removed, DailyWorkflowPanel wired in its place.
MorningDispatchBrief wrapped in `<div id='morning-dispatch-brief'>` for scroll target.
tsc --noEmit: zero errors.

### Session 32 — Morning Dispatch Brief (complete)

Driver-first morning planning section on the Operations page. No schema changes. All additive.

New service: `electron/main/morningDispatchBrief.ts` — `getMorningDispatchBrief(db)`.
Reuses `getRecommendations` (loadScanner) unchanged, trims to top 3, enriches with
driver current_location/min_rpm and scorecard behavior data.

New component: `src/components/operations/MorningDispatchBrief.tsx` — collapsible
driver cards with top-3 load suggestions, RPM/deadhead/score visual cues, Assign button.

IPC: `operations:morningBrief`. Preload: `window.api.operations.morningBrief()`.
Type: `MorningDispatchBriefRow` added to models.ts and global.d.ts.

Operations page: section appears between Morning Briefing checklist and KPI strip.
Fetch fires independently (non-blocking).

load_offers integration: SuggestionRow creates an offer via `loadOffers.create`
on mount (find-or-create, safe against re-render). Assign calls `dispatcher.assignLoad`
then `loadOffers.updateStatus(offerId, 'accepted')`. Skip (X button) calls
`loadOffers.updateStatus(offerId, 'declined')` and hides the row.
Mirrors canonical Loads.tsx offer workflow exactly. No new IPC or schema.

### Session 31 — Per-Driver Weekly Scorecard System (complete)

Full per-driver weekly scorecard. No schema changes. All additive.

New file: `electron/main/repositories/driverPerformanceRepo.ts` — two functions:
`getDriverWeeklyScorecard(db, driverId)` (single driver, includes trend) and
`getAllDriversWeeklyScorecards(db)` (all non-inactive drivers, no trend). Revenue
from dispatch-mode loads with pickup_date in Mon–Sun window. Offer stats from
load_offers with offered_at in same window. Same hardened acceptance_rate logic
as Session 29/30 (resolved-only denominator).

IPC: `drivers:weeklyScorecard` and `drivers:allWeeklyScorecards`.
Preload: `window.api.drivers.weeklyScorecard(id)` and `window.api.drivers.allWeeklyScorecards()`.

Reports page: new "Driver Performance — This Week" section — sortable table.
DriverDrawer: new "This Week" compact panel (loads, gross, disp. cut, RPM, acceptance,
response time) inserted after Current Load block.

### Session 30 — Load Offer Tracking: Data Integrity Hardening (complete)

Targeted hardening pass on the Session 29 Load Offer Tracking System. No redesign.

Key changes: `createOffer` is now find-or-create (returns existing open offer for the same
driver+load pair instead of inserting a duplicate). All three mark functions (`markAccepted`,
`markDeclined`, `markNoResponse`) add `AND outcome IS NULL` to prevent overwriting resolved
offers. `getDriverAcceptanceStats` bases acceptance_rate on resolved offers only, adds
`open_offer_count`, and coerces NULL rate to 0. DispatchBoard adds a `loadingOffers` guard
to prevent double-open, and a per-row "N/R" button for manual no_response without the 2-hour
wait. DriverDrawer breakdown now shows open_offer_count in orange when non-zero.

### Session 29 — Load Offer Tracking System (complete)

Full Load Offer Tracking System. Every load shown to a driver on the DispatchBoard is now
recorded with outcome and optional decline reason. DriverDrawer shows a Load Behavior
panel with acceptance stats. A background sweep marks stale offers as no_response.

Schema: migration 045 — `load_offers` table (driver_id FK, load_id FK, offered_at,
responded_at, outcome CHECK, decline_reason). Three indexes.

New repo: `electron/main/repositories/loadOffersRepo.ts` — createOffer, markAccepted,
markDeclined, markNoResponse, getOffersByDriver, getDriverAcceptanceStats, sweepNoResponse.

IPC: `loadOffers:create`, `loadOffers:updateStatus`, `loadOffers:getDriverStats`.

DispatchBoard (Loads.tsx): "Find Load" button on Needs Load cards opens inline panel
showing available loads. Each load has Assign (accepted) and Skip (declined + reason dropdown).

DriverDrawer: "Load Behavior" section shows acceptance rate, offer count, avg response,
accepted/declined/no_response breakdown. Hidden when no offers exist for the driver.

Scheduler: `sweepNoResponse()` runs every tick; marks offers 2+ hours old with no outcome
as no_response.

### Session 28 — Outreach Engine: DB wiring, performance panel, dashboard reminder, bug fix (complete)

Completed the Outreach Engine integration started in Session 27. Replaced the
localStorage-based weekly refresh tracking with a proper DB-backed system, added
full performance visibility, wired a dashboard reminder, and fixed a runtime crash.

**Migration 039 — `outreach_refresh_log` table**
- `electron/main/schema/migrations.ts` — migration039 creates `outreach_refresh_log` (id, refreshed_at, notes, template_count_added); added to MIGRATIONS array

**New file: `electron/main/repositories/outreachRepo.ts`**
- `getLastRefresh(db)` — most recent refresh log row or null
- `logRefresh(db, notes, templateCountAdded)` — insert new refresh row
- `getOutreachPerformance(db)` — aggregates marketing_post_log by template_id; returns uses, total_replies, total_leads, score (replies + leads*3)
- `getOutreachSummary(db)` — totals across all posts; top_template_id; stale_template_ids (8+ uses, score=0)

**Modified: `electron/main/repositories/index.ts`**
- Added `export * from './outreachRepo'`

**Modified: `electron/main/ipcHandlers.ts`**
- 4 new channels: `outreach:getLastRefresh`, `outreach:logRefresh`, `outreach:performance`, `outreach:summary`

**Modified: `electron/preload/index.ts`**
- Added `outreach` namespace with 4 methods exposing the new IPC channels

**Modified: `src/types/global.d.ts`**
- Added full TypeScript types for `window.api.outreach.*`

**Modified: `src/pages/Marketing.tsx`**
- Replaced localStorage refresh state with DB-backed `loadOutreachMeta()` callback (calls getLastRefresh, performance, summary on mount)
- "Mark refresh done" button calls `outreach.logRefresh(null, 0)` and reloads meta
- `OutreachPerformancePanel` wired into Post History tab (shown when total_posts > 0)
- Added missing `import OutreachPerformancePanel` statement (bug fix — caused "not defined" crash on Marketing tab load)

**New file: `src/components/marketing/OutreachPerformancePanel.tsx`**
- 3-tile totals row: Posts Logged, Total Replies, Leads Generated
- Top templates table (up to 5): Template, Uses, Replies, Leads, Score with color coding (green >=10, yellow >=4, gray =0)
- Stale template warning block (8+ uses, score=0)
- Lowest performing table (up to 3, requires 3+ uses)

**Modified: `src/pages/Dashboard.tsx`**
- Fetches `outreach.getLastRefresh()` on mount
- Shows dismissible blue banner when refresh is null or >= 7 days old
- Banner shows days-since count and "Go to Outreach" button navigating to /marketing

**New file: `docs/OUTREACH_ENGINE_SPEC.md`**
- Full implementation reference: architecture, DB schema, generation logic, humanization system, UI integration, weekly refresh system, files/functions reference, output format, build order

### Session 27 — Outreach Engine core (complete)

Built the zero-AI-cost daily outreach generation system.

**New file: `src/lib/outreachEngine.ts`**
- 20 hook entries (2 variations each), 15 CTA entries (2 variations each), 15 pain points, 15 benefits
- 20 variable-based outreach templates tagged by driver type for relevance matching
- 5 page post templates (distinct tone + structure from group posts)
- `generateTodaysOutreach()`: LCG seeded PRNG; scores templates by recency + driver type match; assembles 5 group posts + 1 page post; applies word-swap humanization (14 pairs, 28% rate)
- All templates, hooks, CTAs roughened to sound human: contractions, fragments, uneven structure

**Modified: `src/pages/Marketing.tsx`**
- 4th tab "Outreach Engine" (Zap icon), targeting dropdowns, generate/regenerate buttons
- `OutreachPostCard` sub-component with Copy + Mark Used actions

### Session 26 — Eight More App Improvements (complete)

Eight new improvements across load management, reports, broker relationship tracking, compliance, and leads.

**1. Driver Run Sheet PDF**
- `LoadDrawer.tsx` — `printRunSheet()` function added (same DOM-inject + window.print() pattern as existing Rate Conf and Settlement PDFs); "Run Sheet" button shown for Booked/Picked Up/In Transit status; sheet includes driver/equipment, pickup details, delivery details, broker contact with phone/email/MC#, load ref#, special instructions, mileage/rate

**2. Invoice Aging Table in Reports**
- `reports.ts` — `InvoiceAgingRow` interface; `invoiceAging` query: joins invoices → loads → brokers for Sent/Overdue status; computes `days_out` via julianday(); assigns bucket (0-15 / 16-30 / 31-60 / 60+); `ReportsData` updated
- `Reports.tsx` — new "Accounts Receivable Aging" section: bucket summary row (4 color-coded tiles showing total $$ in each bucket) + line-by-line table (invoice #, broker, amount, sent date, days outstanding, bucket badge)

**3. Lane Performance Table in Reports**
- `reports.ts` — `LanePerformanceRow` interface; query groups completed loads by origin_state → dest_state; computes load_count, avg_rpm, best_rpm, total dispatch fee; ordered by avg_rpm DESC; `ReportsData` updated
- `Reports.tsx` — new "Lane Performance" section: table with lane (state arrows), loads, avg RPM (color-coded), best RPM, fee earned

**4. Broker Contact Log — migration 031**
- `migrations.ts` — migration031: `broker_call_log` table (id, broker_id FK CASCADE, note, created_at) + index; added to MIGRATIONS array
- `brokerCallLogRepo.ts` (new) — `BrokerCallLogEntry`, `CreateBrokerCallLogDto`; `list/create/deleteBrokerCallLog`
- `repositories/index.ts` — export added
- `ipcHandlers.ts` — `brokerCallLog:list/create/delete` handlers + import
- `preload/index.ts` — `brokerCallLog` group added
- `global.d.ts` — `brokerCallLog` API type added
- `BrokerDrawer.tsx` — `MessageSquare` icon added; `callLog`, `callNote`, `addingCall` state; fetches log on broker load; "Contact Log" section (before Notes) with single-line input form, timestamped list with delete, persistence via IPC

**5. Driver Document Expiry Alert on Dashboard**
- `global.d.ts` — `compliance` added to `drivers` API type; `DriverComplianceRow` added to imports
- `Dashboard.tsx` — `ExpiryAlert` type; `expiryAlerts` and `expiryDismissed` state; on mount, calls `window.api.drivers.compliance()`, flattens cdl_expiry / insurance_expiry / medical_card_expiry / coi_expiry into individual alerts, filters for expiry within 30 days; renders a dismissible amber banner above the weekly target card; clicking "View Drivers" navigates to /drivers

**6. Monthly Revenue Pacing Widget (enhanced)**
- `Operations.tsx` — Existing revenue goal widget enhanced: `projected` variable added (revenue / dayOfMo * daysInMo); "Projected Month End" stat added to the stats row (green if on pace, orange if behind); "Day X of Y / N days left" stat added alongside

**7. Dispatcher Net Summary in LoadDrawer Financials**
- `LoadDrawer.tsx` — After the existing financials grid, a summary subsection shows: "Your Earnings" = dispatch fee (green), "Driver Net" = gross + FSC - dispatch fee - deductions total (gray); only rendered when dispFee and rate are non-null

**8. Leads Days-Since-Contact Aging Column**
- `LeadsTable.tsx` — `daysSinceContact(lead)` helper uses `last_contact_date`; `contactAgeCls(days, status)` helper: 0-13d = gray, 14-20d = yellow, 21+ = red (skips terminal statuses); "Last Contact" column header added (sortable via `last_contact_date`); cell shows "today" / "Nd ago" with age-based color; tooltip shows raw date

### Session 25 — Eight More App Improvements (complete)

Eight new improvements across load management, invoicing, driver settlements, broker intelligence, and tooling.

**1. Check Call Log in LoadDrawer**
- `LoadDrawer.tsx` — uses existing `window.api.timeline.events/addEvent/deleteEvent` IPC
- Filters for `event_type === 'check_call'`; new "Check Calls" section with log-call form and timestamped list
- No new migration or IPC needed

**2. Deadhead Miles + Fuel Surcharge (FSC) on Loads — migration 029**
- `migrations.ts` — migration 029: `addColumnIfMissing` for `deadhead_miles REAL` and `fuel_surcharge REAL` on loads
- `models.ts` — `Load` interface updated with both fields
- `loadsRepo.ts` — `createLoad` and `updateLoad` include both new columns
- `LoadModal.tsx` — `BLANK` constant updated; Loaded Miles / Deadhead Miles / FSC fields added to form
- `LoadDrawer.tsx` — Route section shows Deadhead Miles; Financials section shows FSC + deadhead; settlement PDF includes FSC as line item
- `reports.ts` — broker summary includes `COALESCE(fuel_surcharge, 0)` in total_gross; IFTA includes deadhead miles

**3. Batch Invoice Actions**
- `invoicesRepo.ts` — `bulkUpdateInvoices(db, ids, status, extraFields)` with parameterized IN clause
- `ipcHandlers.ts` — `invoices:bulkUpdate` handler
- `preload/index.ts` + `global.d.ts` — `bulkUpdate` added to invoices API
- `InvoicesTable.tsx` — checkbox column in header (select-all) and per-row; checked rows highlighted; cell-level onClick to prevent drawer open on checkbox click
- `Invoices.tsx` — `selectedIds` Set state, `handleToggle`/`handleToggleAll`/`handleBulkStatus`; bulk action bar (Mark Sent / Mark Paid / Reset to Draft / Clear) shown when selections exist

**4. Driver Deductions on Settlements — migration 030**
- `migrations.ts` — migration 030: `load_deductions` table (`id, load_id FK→loads CASCADE, label, amount, created_at`) + index
- `loadDeductionsRepo.ts` (new) — `LoadDeduction` interface, `list/create/deleteLoadDeduction`
- `repositories/index.ts` — export added
- `ipcHandlers.ts` — `loadDeductions:list/create/delete` handlers
- `preload/index.ts` + `global.d.ts` — `loadDeductions` API group added
- `LoadDrawer.tsx` — Deductions section (shown for Delivered/Invoiced/Paid): add form (label + amount), list with running total; settlement PDF updated to accept `deductions[]` param, shows each deduction as a line minus item

**5. Broker Reliability Score (Payment Grade)**
- `brokerIntelligence.ts` — `BrokerIntelRow` extended with `avg_days_to_pay`, `payment_grade`, `invoice_count`; `paymentGrade()` helper (A=on time, B=≤5d late, C=≤14d, D=≤30d, F=>30d); `getBrokerIntelAll` joins with invoices to compute actual payment speed from Paid invoices; `payment_terms` included in query
- `models.ts` — `BrokerIntelRow` updated with three new fields
- `BrokerDrawer.tsx` — `payGrade`/`avgDaysToPay`/`invoiceCount` state; grade badge (A=green, B=light green, C=yellow, D=orange, F=red) shown in Contact & Payment section alongside invoice count

**6. Quick Rate Calculator**
- `src/components/ui/RateCalculator.tsx` (new) — standalone modal: miles, RPM, FSC, dispatch %, fuel price, MPG inputs; derives gross, FSC total, dispatch fee, driver pay, fuel cost, driver net after fuel
- `Sidebar.tsx` — Calculator icon button added above Help/Settings; mounts `<RateCalculator>` modal; reads `defaultDispatchPct` and `fuelPricePerGallon` from settingsStore

**7. Settings Additions**
- `settingsStore.ts` — `fuelPricePerGallon: number` (default 4.00) added; loaded from electron-store
- `Settings.tsx` — `Monthly Revenue Goal` field (saves to `revenueGoal` key, same as Operations page uses); `Fuel Price ($/gallon)` field (saves to `fuelPricePerGallon`); both loaded on mount from `window.api.settings.get`

### Session 24 — Route Fix + Docs and Task Update (complete)

**1. Morning Briefing Route Fix**
- `src/pages/Operations.tsx` — corrected `'/find-loads'` to `'/findloads'` and `'/active-loads'` to `'/activeloads'` in the Morning Briefing `rows` array. Clicking "Find Loads" or "Active Loads" was navigating to unregistered routes, causing a blank screen. Fix is two string-value changes; no structural changes.

**2. Saturday Task Added to Seed (ID 133)**
- `electron/main/seed.ts` — new Saturday recurring task: weekend load booking + lead follow-up + Facebook posting with explicit revenue-priority ordering. Chris should go to Settings > Reseed Documents to get it into the live database.

**3. Daily Operations Playbook SOP Updated (ID 125)**
- `electron/main/seed.ts` — full rewrite of the playbook content to put revenue-generating actions first (loads before leads before marketing) and add an end-of-month urgency protocol.

**Files changed this session:**
- `src/pages/Operations.tsx`
- `electron/main/seed.ts`
- `docs/HANDOFF.md`
- `docs/SESSION_LOG.md`

---

### Session 23 — Eight App Improvements (complete)

Eight improvements across invoicing, load management, driver pay tracking, morning briefing, reporting, and document attachments — all implemented in one context window.

**1. Auto-flag Overdue Invoices on Startup**
- `electron/main/repositories/invoicesRepo.ts` — `autoFlagOverdueInvoices(db)`: UPDATE Sent invoices to Overdue when `julianday('now') - julianday(sent_date)` exceeds broker payment_terms (correlated subquery via loads JOIN brokers, defaults to 30 days)
- `electron/main/ipcHandlers.ts` — `ipcMain.handle('invoices:autoFlag', ...)` handler added
- `electron/preload/index.ts` — `autoFlag: () => ipcRenderer.invoke('invoices:autoFlag')` added to invoices group
- `src/types/global.d.ts` — `autoFlag: () => Promise<number>` added to invoices API type
- `src/App.tsx` — `window.api.invoices.autoFlag().catch(() => {})` called in startup useEffect

**2. Duplicate Load Button in LoadDrawer**
- `src/components/loads/LoadDrawer.tsx` — `onDuplicate?: (l: Load) => void` prop; "Duplicate" button in action bar using `Copy` icon from lucide-react
- `src/pages/Loads.tsx` — `handleDuplicate()` pre-fills CreateLoadModal with broker/route/driver/trailer/commodity from original load, status forced to 'Searching', rate/dates cleared; passed as `onDuplicate` to LoadDrawer

**3. Driver Pay History Tab in DriverDrawer**
- `src/components/drivers/DriverDrawer.tsx` — fetches `window.api.invoices.list()` in useEffect, filters by `driver_id` and `status === 'Paid'`, sorts by `paid_date` descending, slices to 20
- Shows invoice number, paid date, dispatch fee (green), and driver gross in a dedicated Pay History section before Notes

**4. Stale Load Status Nudges in Morning Briefing**
- `electron/main/operations.ts` — `staleLoads` query: Booked loads past pickup date (>1 day) OR Picked Up/In Transit loads past delivery date
- `src/types/models.ts` — `staleLoads` array added to `OperationsData` interface
- `src/pages/Operations.tsx` — sixth BriefRow: "All loads progressing on schedule" / "N loads past expected date" with load IDs, status, and days past; links to /loads

**5 + 8. Reports Page with Weekly P&L, Monthly P&L, Broker Performance, and IFTA Mileage**
- `electron/main/reports.ts` (new) — `getReportsData(db)`: weeklyRevenue (12 weeks), monthlyRevenue (6 months), brokerSummary (top 20 by dispatch fee), iftaByState (miles by dest_state), all-time totals, YTD totals
- `electron/main/ipcHandlers.ts` — `ipcMain.handle('reports:data', ...)` handler added
- `electron/preload/index.ts` — `reports: { data: () => ipcRenderer.invoke('reports:data') }` group added
- `src/types/global.d.ts` — `reports: { data: () => Promise<unknown> }` added
- `src/pages/Reports.tsx` (new) — KPI strip, horizontal bar charts for weekly/monthly revenue, broker table with loads/gross/fee/avg RPM, IFTA state grid; all types inlined (no cross-bundle import)
- `src/components/layout/Sidebar.tsx` — Reports nav item added with TrendingUp icon
- `src/App.tsx` — `<Route path='reports' element={<Reports />} />` added

**6. Load Calendar View**
- `src/components/loads/LoadsToolbar.tsx` — `LoadView = 'list' | 'board' | 'calendar'` type exported; Calendar button added to toggle group; "Dispatch Board" renamed to "Dispatch"
- `src/pages/Loads.tsx` — `view` state updated to `LoadView`; `LoadCalendar` inline component renders weekly grid (Mon–Sun), prev/next week navigation; blue = pickup date, green = delivery date

**7. Load Document Attachments**
- `electron/main/schema/migrations.ts` — migration 028: `load_attachments` table (`id, load_id FK→loads CASCADE, title, file_path, file_name, created_at`) + index
- `electron/main/repositories/loadAttachmentsRepo.ts` (new) — `LoadAttachment` interface + `listLoadAttachments`, `createLoadAttachment`, `deleteLoadAttachment`
- `electron/main/repositories/index.ts` — `export * from './loadAttachmentsRepo'` added
- `electron/main/ipcHandlers.ts` — `loadAttachments:list/create/delete/open/pick` handlers; `pick` uses `dialog.showOpenDialog` + `copyFileSync` to `userData/load-attachments/{loadId}/`
- `electron/preload/index.ts` — `loadAttachments: { list, create, delete, open, pick }` group added
- `src/types/global.d.ts` — `loadAttachments` API types added
- `src/components/loads/LoadDrawer.tsx` — Attachments section: file picker, title input, list with open/delete; fetches on load open alongside notes

### Session 22 — Six App Improvements (complete)

Six improvements across compliance, revenue tracking, load intelligence, and invoicing — all implemented in two context windows.

**1. Driver Medical Card Expiry (migration 027)**
- Added `medical_card_expiry TEXT` column to `drivers` table via `addColumnIfMissing()` in migration 027
- Added field to `Driver` + `DriverComplianceRow` interfaces (`src/types/models.ts`)
- Updated `driversRepo.ts` — create/update/getDriverCompliance all include the new field
- Added Medical Card doc type to the `expiringDocs` UNION ALL query in `electron/main/operations.ts`
- `DriverModal.tsx` — added "Medical Card Expiry" date input (DOT physical section)
- `DriverDrawer.tsx` — added Medical Card Expiry display row with orange AlertTriangle when expiring
- `DriversTable.tsx` — added Med. Card column with ExpCell

**2. Morning Briefing Compliance Row**
- `Operations.tsx` — added fifth Morning Briefing row: "All compliance documents current" / "N docs expiring soon" — links to /drivers

**3. Smart Rate Floor on Find Loads (Broker Avg RPM)**
- `FindLoads.tsx` — added `brokers` + `allLoads` state; parallel fetch with `Promise.all`
- Added `buildBrokerIntel()` — pure frontend, name-keyed Map of avg RPM + load count + flag
- Added `BrokerIntelBadge` component shown on load cards
- `FirstCallCard` + `LoadRow` both accept and display `brokerIntel`

**4. Rate Confirmation PDF**
- `LoadDrawer.tsx` — `printRateConfirmation(load, driver, broker)` using `window.print()` pattern
- Button shown in action bar for Booked/Picked Up/In Transit loads

**5. Driver Settlement Statement PDF**
- `LoadDrawer.tsx` — `printSettlement(load, driver, broker)` using same print pattern
- Button shown for Delivered/Invoiced/Paid loads; shows gross minus dispatch fee = driver net

**6. Invoice Follow-Up Email Template**
- `InvoiceDrawer.tsx` — `followUpMode` state, `daysOverdue` computation (days since sent minus broker payment terms, floor 30d)
- `followUpSubject` + `followUpBody` — assertive payment-chasing template referencing days overdue and invoice amount
- "Follow-up (Nd)" action bar button for Sent/Overdue invoices — opens email panel in follow-up mode
- Email panel shows Invoice/Follow-up tabs for Sent/Overdue invoices; subject line switches dynamically
- `mailtoHref` uses `activeSubject`/`activeBody` — single mailto link adapts to selected template

**Already existed (no changes needed):**
- Weekly revenue goal — already fully implemented in `Operations.tsx`
- Invoice aging Days Overdue column — `effectiveStatus()` + `agingLabel()` already in `InvoicesTable.tsx`

### Session 21 — Browser Import IPC Fix (complete)

Fixed the end-to-end browser import flow. Data posted by Claude in Chrome to `localhost:3001` now reliably reaches the Find Loads renderer via an IPC invoke channel. Live test confirmed: `{ok:true, count:1}` POST → results rendered in Find Loads within 2 seconds.

**Root cause of prior failure:**
The renderer was polling via `fetch('http://localhost:3001/api/loads/browser-import')`, which silently fails in the Electron renderer due to CSP / cross-origin restrictions. The `webContents.send` IPC push also did not reach the renderer (root cause unknown without DevTools access).

**Fix — IPC invoke poll channel (`loads:getLastBrowserImport`):**
- `electron/main/webServer.ts`: exported `getLastBrowserImport()` returning `{ seq, payload }` from module-level `_lastImport` / `_lastImportSeq`
- `electron/main/ipcHandlers.ts`: imported `getLastBrowserImport` from `webServer`; added `ipcMain.handle('loads:getLastBrowserImport', () => getLastBrowserImport())`
- `electron/preload/index.ts`: added `getLastBrowserImport: () => ipcRenderer.invoke('loads:getLastBrowserImport')` to the `loads` contextBridge group
- `src/types/global.d.ts`: added `getLastBrowserImport: () => Promise<{ seq: number; payload: ParseScreenshotResult | null }>` to `window.api.loads`
- `src/pages/FindLoads.tsx`: replaced `fetch('http://localhost:3001/...')` poll with `window.api.loads.getLastBrowserImport()` — same reliable invoke path used by all other `window.api.*` calls

**Known remaining issue (non-blocking):**
`offResult` in `electron/preload/index.ts` creates a new anonymous function reference each call, so `ipcRenderer.removeListener` never actually removes the listener. The IPC push listener (`loads:browser-import` channel) leaks on page unmount. This is harmless in practice (page rarely unmounts; polling is now the active mechanism) but should be fixed in a future cleanup session.

### Session 20 — Audit Fixes Continued (complete)

Completed remaining audit fixes from the Session 18 comprehensive audit. All changes pass `tsc --noEmit` with zero errors.

**CAT-A — Audit log writes (all 5 entity repos):**
- `loadsRepo.ts`: `createLoad` + `updateLoad` + `deleteLoad` each call `logAudit()`; `deleteLoad` now fetches the existing row first and throws if load status is Booked/Picked Up/In Transit
- `invoicesRepo.ts`: `createInvoice` + `updateInvoice` + `deleteInvoice` all call `logAudit()`
- `brokersRepo.ts`: `createBroker` + `updateBroker` + `deleteBroker` all call `logAudit()`
- `driversRepo.ts`: `createDriver` + `updateDriver` + `deleteDriver` all call `logAudit()`
- `leadsRepo.ts`: `createLead` + `updateLead` + `deleteLead` all call `logAudit()`
- All calls use hardcoded `userId = 1` (admin user; single-user app); `AuditAction` type used throughout

**H-8 + migration 017 — broker_id on invoices:**
- `migrations.ts`: migration 017 adds `broker_id INTEGER REFERENCES brokers(id) ON DELETE SET NULL` to invoices via `addColumnIfMissing()`

**migration 018 — trailer_type on loads:**
- `migrations.ts`: migration 018 adds `trailer_type TEXT` to loads via `addColumnIfMissing()`

**H-3 — BrokerDrawer production bug + scoring deduplication:**
- `BrokerDrawer.tsx`: replaced `window.api.db.query()` (dev-only channel, silently empty in packaged builds) with `window.api.loads.list()` filtered by `broker_id`
- Added `window.api.intel.allBrokers()` to the `useEffect` Promise.all; finds broker by id and sets `intelRating` state
- Removed the inline IIFE (~15 lines) that duplicated the exact scoring logic from `brokerIntelligence.ts`
- `INTEL_RATING_STYLE` moved from inside component body to module level; typed as `Record<BrokerRating, string>` for TypeScript exhaustiveness

**M-8 — Export shared interfaces from models.ts:**
- Added `OperationsData`, `DriverOpportunity`, `LeadHeat`, `GroupPerformance`, `BrokerLane`, `ProfitRadarData` to `src/types/models.ts`
- `Operations.tsx` now imports these types instead of defining them locally; `ScoredLead` and `NextAction` remain local (not reused elsewhere)

**M-9 — Content-Security-Policy header:**
- `electron/main/index.ts`: `session` imported from electron; CSP header injected via `session.defaultSession.webRequest.onHeadersReceived`, gated behind `app.isPackaged` (dev mode skipped — Vite HMR uses inline scripts + WebSocket that strict CSP blocks)
- Policy: `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; object-src 'none'`
- `'unsafe-inline'` on `style-src` required for Tailwind CSS inline styles

### Session 19 — Audit Fixes (complete)

Applied all Critical + High + selected Medium/Low fixes from the Session 18 audit. All fixes pass `tsc --noEmit` with zero errors.

**H-5 — Lane intel data quality fix (`brokerIntelligence.ts`):**
- `getLaneIntelAll` status filter changed from `Booked/Picked Up/In Transit/Delivered/Invoiced/Paid` to `Delivered/Invoiced/Paid` only
- Removes unconfirmed revenue (Booked loads haven't moved yet) from lane avgRpm calculations

**H-7 — URL protocol validation (`ipcHandlers.ts`):**
- `shell:openExternal` now validates the URL with `new URL()` and restricts protocol to `https:`, `http:`, `mailto:` only
- Non-URL strings or `file:`, `javascript:` etc. are silently dropped — prevents renderer-injected shell escapes

**H-2 — SELECT-only guard on `db:query` (`ipcHandlers.ts`):**
- The dev-only IPC query channel now rejects any SQL that does not start with `SELECT`
- Returns `{ data: null, error: '...' }` for write attempts rather than executing them

**H-4 — ErrorBoundary (`App.tsx`):**
- Class-based `ErrorBoundary` added above `HashRouter`; wraps entire app
- Renders a recovery screen (error message + Reload button) instead of a blank white screen on unhandled render errors

**H-6 — Migration transaction wrapping (`schema/migrations.ts`):**
- Each migration `up()` call is now wrapped in `db.transaction(() => m.up(db))()`
- Failed migrations now fully roll back instead of leaving a partial schema

**CAT-C — Remove unimplemented scheduler stubs (`scheduler.ts`):**
- `runDailyBriefing` and `runMarketingQueue` stub functions removed
- `JobName` type narrowed to `'fmcsa-scraper'` only; JOBS array contains only the FMCSA scraper
- Comment added explaining the two planned jobs will be added when implemented

**L-5 — Remove `as any` casts; add missing type declarations (`global.d.ts`, `Settings.tsx`):**
- `window.api.dev.reseedDocs()` typed in `global.d.ts` → `(window.api.dev as any).reseedDocs()` cast removed in Settings.tsx
- `window.api.leads.backfillLeadData()` typed in `global.d.ts` → `(window.api.leads as any).backfillLeadData()` cast removed in Settings.tsx

**M-6 — Rename `total_revenue` → `gross_rate` in LoadRecommendation (`loadScanner.ts`, `models.ts`):**
- Field was mislabeled — it holds the load's gross rate (single load), not total revenue across loads
- Renamed in `LoadRecommendation` interface in `models.ts` and in `loadScanner.ts` return object

**CAT-B / M-2 — Business Information editable; hardcoded identity removed:**
- `settingsStore.ts`: initial state and `loadFromStore` fallbacks changed from hardcoded `'Chris Hooks'` / `'dispatch@ontrackhaulingsolutions.com'` to empty strings
- `Settings.tsx` Business Information section: `ReadField` components replaced with editable inputs (Company, Owner Name, Email, Default Dispatch %) + Save button; saves via `persistSetting` → electron-store + calls `loadFromStore` to sync

**L-4 — Replace `window.confirm()` with inline confirm (`Settings.tsx`):**
- Remove Sample Data button now uses inline two-step confirm (Confirm/Cancel buttons) instead of `window.confirm()` — consistent with the Restore two-step pattern used in Backup section

### Session 18 — Broker Intelligence + Lane Memory (complete)

**New service: `electron/main/brokerIntelligence.ts`**
- Fully deterministic — no AI, no schema changes; reads from existing `brokers` + `loads` + `drivers` tables
- `getBrokerIntelAll(db)` — per-broker score (0–100) + rating (Preferred / Strong / Neutral / Caution / Avoid) + caution_note; scoring: base 50 + RPM adj (±20 across ±$1.33/mi) + volume bonus (up to +15) + flag adj (Preferred+25, Slow Pay-20, Avoid-40, Blacklisted→0)
- `getLaneIntelAll(db)` — per origin_state/dest_state aggregates from Booked+ loads; strength: Strong (avgRpm≥2.50 AND loads≥3) / Average (avgRpm≥1.80 OR loads≥2) / Weak (else)
- `getDriverLaneFits(db, driverId)` — per driver lane history aggregates; fit: Strong Fit (≥2 loads AND avgRpm≥2.25) / Has History (≥1 load) / New Lane

**3 new IPC handlers:** `intel:allBrokers`, `intel:allLanes`, `intel:driverFit(driverId)`

**Preload:** `window.api.intel.{ allBrokers, allLanes, driverFit }` — all three added to preload namespace

**Types:** `BrokerRating`, `LaneStrength`, `DriverLaneFit`, `BrokerIntelRow`, `LaneIntelRow`, `DriverLaneFitRow` added to `models.ts` and imported in `global.d.ts`; `intel` namespace added to `Window.api`

**LoadMatch.tsx (`/loadmatch`):**
- Fetches `intel.allBrokers()` + `intel.allLanes()` on mount; fetches `intel.driverFit(driverId)` on driver select
- Each load card now shows intel chips below broker/pickup row: broker rating chip (Preferred=green / Neutral=gray / Caution=yellow / Avoid=red) + lane strength chip (Strong/Average/Weak) + driver fit chip (Strong Fit/Has History/New Lane)
- Booking workspace shows "Intelligence" section between load summary header and checklist — only when intel data exists for the selected load; shows broker name + rating + history, lane + strength + avg RPM, driver fit + run count; caution_note shown in yellow when applicable
- All lookups are client-side (no extra IPC per load selection)

**BrokerDrawer.tsx:**
- Performance section header now shows rating badge (Preferred/Strong/Neutral/Caution/Avoid) computed client-side from already-fetched `completedLoads.length`, `avgRpm`, and `broker.flag` — identical scoring logic, no new IPC needed

**Operations.tsx:**
- Profit Radar "Top Broker Lanes by RPM" lane chips now include a lane strength label (Strong=green / Average=orange / Weak=gray) computed client-side from `avgRpm` + `loads` — no new data fetch

### Session 17 — Active Load Timeline + Check Call Engine + Duplicate Group Fix (complete)

**Duplicate marketing_groups fix (migration 015):**
- Root cause: `marketing_groups` had no UNIQUE constraint, so `INSERT OR IGNORE` never actually skipped duplicates; every HTML import or seed call added fresh rows
- Migration 015: deletes duplicate rows (keeps lowest id per LOWER(TRIM(name))); creates `CREATE UNIQUE INDEX uq_marketing_groups_name ON marketing_groups (LOWER(TRIM(name)))` — runs automatically on next launch
- `createMarketingGroup()` updated to `INSERT OR IGNORE` and returns the existing row on a name collision

**Active Load Timeline + Check Call Engine (new system):**
- Migration 016: `load_timeline_events` table — `id, load_id (FK→loads, CASCADE), event_type, label, scheduled_at, completed_at, notes, created_at`; two indexes (load_id, scheduled_at)

**New `loadTimelineRepo.ts` (backend service):**
- `listTimelineEvents(db, loadId)` — all events sorted by scheduled_at/created_at ASC
- `addTimelineEvent(db, loadId, eventType, label, scheduledAt, notes)` — raw insert
- `completeTimelineEvent(db, id, notes?)` — sets completed_at to now
- `deleteTimelineEvent(db, id)` — removes event
- `scheduleDefaultEvents(db, loadId, newStatus, pickupDate, deliveryDate)` — idempotent; auto-schedules check calls based on status:
  - Booked → Load Booked (status), Driver Dispatched (check_call +1h), Pickup Check Call (pickup day 08:00)
  - Picked Up → Picked Up (status), Mid-Route Check Call (midpoint of pickup/delivery), Delivery ETA Confirm (delivery day 10:00)
  - In Transit → In Transit (status), Delivery ETA Confirm (delivery day 10:00)
  - Delivered → Delivered (status), POD Request (check_call +30min)
  - Completed → Load Completed (status)
- `applyStatusChange(db, loadId, newStatus, notes)` — updates load status + adds event + auto-schedules next events
- `initLoadTimeline(db, loadId)` — initializes events for a newly booked load (idempotent, checks for existing events first)
- `getActiveLoads(db)` — Booked/Picked Up/In Transit loads with driver/broker info + next pending event label and time
- `getUpcomingCheckCalls(db, n)` — next N uncompleted check_call events across active loads; used by Operations panel

**New IPC handlers (10 new channels):**
- `timeline:activeLoads`, `timeline:upcomingCalls`, `timeline:events`
- `timeline:addEvent`, `timeline:completeEvent`, `timeline:deleteEvent`
- `timeline:statusChange`, `timeline:initLoad`
- `timeline:generateMessage` (async, Claude Haiku) — generates check-in text, broker update, POD request, or delivery confirm (150 max tokens, fails gracefully if no API key)

**Preload:** `window.api.timeline.*` for all 9 timeline methods

**New `ActiveLoads.tsx` page at `/activeloads`:**
- Two-panel layout: left (load list) / right (timeline + actions)
- Left: active load cards — ref, status badge, route, driver name, next event label + time (overdue = red + warning icon)
- Right panel (shown when a load is selected):
  - Load header: route, status badge, driver, phone, broker, rate, miles + "Call Driver" tel: link
  - Next Action panel: highlights first pending event; overdue events show red; "Mark Done" + "Call Driver" buttons
  - Timeline: pending events (up-top) + completed events (below a divider); each row has check/clock/alert icon; hover shows "Done" + delete buttons; inline "Add note" input
  - Status Update: "Mark as [NextStatus]" button + optional "Mark Delivered" shortcut; note input + confirm/cancel
  - Message Helpers: 4 quick-generate AI buttons (Driver Check-In, Broker Update, Request POD, Delivery Confirm); generated text shown with Copy button
- Auto-inits timeline (calls `initLoad`) if load has no events when first selected
- Clicking a load card when already selected = deselect

**Operations.tsx integration:**
- Added `checkCalls` state (CheckCallRow[]); fetches independently via `window.api.timeline.upcomingCalls(6)` — does not block main render
- New "Upcoming Check Calls" section appears between KPI strip and Profit Radar, but only when active loads have check call events; overdue events show red; clicking any card navigates to `/activeloads`

**Sidebar:** "Active Loads" added as 3rd nav item (Activity icon) between Load Match and Dispatcher

**Models:** `TimelineEvent`, `ActiveLoadRow`, `CheckCallRow` added to `models.ts` and imported in `global.d.ts`

### Session 16 — Load Match + Booking Workspace (complete)

**Load Match page (new guided dispatch workflow):**
- `src/pages/LoadMatch.tsx` — new three-panel page at `/loadmatch`
- Left panel: available drivers (all Active with no current load), showing name, home base, number of loads matched; clicking a driver selects them
- Center panel: candidate loads for the selected driver, sourced from existing `scanner.recommendLoads()` — ranked by RPM and deadhead; each card shows origin→dest, rate, RPM (color-coded), loaded miles, deadhead estimate, broker name + flag, pickup date, Strong/Good/Fair/Weak score badge
- Right panel (Booking Workspace): load summary header, 6-step booking checklist with progress bar, rate analysis table (always visible), deterministic negotiation opener (computed from RPM vs $2.50/mi floor), optional AI-enhanced script button, Book Load action button (glows orange when all checklist steps are checked), success screen with "Book another load" / "Back to Operations" options
- Navigating from Operations Profit Radar idle driver rows now deep-links to `/loadmatch?driverId=X` — driver is auto-selected on arrival

**New IPC endpoint:**
- `loadMatch:nego` — takes `{ rate, miles, rpm, deadheadMiles, origin, dest, brokerName, driverName }`, calls Claude Haiku for a 2-sentence negotiation assessment + word-for-word opener; returns null if API key not set (deterministic opener always shown in UI regardless)

**Reused existing endpoints (no new DB queries):**
- `scanner.recommendLoads({})` — fetches all drivers + scored load matches
- `dispatcher.assignLoad({ loadId, driverId })` — atomic booking transaction
- Both existed from prior sessions; no IPC handler changes required for these

**Sidebar and routing:**
- `ArrowRightLeft` icon; "Load Match" added as 2nd nav item (between Operations and Dispatcher)
- `/loadmatch` route registered in `App.tsx`

**Type declarations:**
- `global.d.ts` updated: `operations`, `profitRadar`, and `loadMatch` added to `Window.api` (these three were missing from the previous session's type update)

### Session 15 — Operations Control Panel + Profit Radar (complete)

**Operations Control Panel (new page, replaces Dashboard as default landing):**
- `src/pages/Operations.tsx` — merged Dashboard + new Operations content into one page
- Sections: KPI briefing strip (6 cards), Next Actions engine, Revenue Opportunities, Daily Checklist, Mini Dispatch Board, Top Leads
- Route `/operations` is now the default; `/dashboard` redirects to `/operations`
- Dashboard removed from sidebar; Operations is first nav item (Zap icon)

**Profit Radar (new feature, embedded in Operations):**
- `electron/main/profitRadar.ts` — deterministic scoring service with four opportunity types:
  - `idleDrivers` — Active drivers with no load; scored by location/equipment completeness
  - `leadHeat` — FB conversations in Call Ready / Interested / Replied / New stages; scored by stage + follow-up urgency; `nextAction` field provides deterministic recommendation per stage
  - `topGroups` — marketing_groups ranked by leads_generated_count + signed_drivers_count + priority
  - `topLanes` — aggregate RPM by origin/dest from loads table (requires >= 2 loads per lane)
- `getProfitRadarSummary()` — async function; calls Claude with concise data brief; returns 2-sentence AI summary or null if API key not configured
- IPC: `profitRadar:data` (sync) + `profitRadar:summary` (async, passes store for API key)
- Preload: `window.api.profitRadar.data()` + `.summary()`
- UI: 3-column radar grid (Idle Drivers | FB Lead Heat | Top Groups) + optional broker lanes row + AI summary strip that loads independently after main data

**Backend additions:**
- `electron/main/operations.ts` — added `loadsInTransit` count to `OperationsData`

### Session 14 -- Marketing Rebuild + FMCSA Improvements + SAFER Links + Docs Sweep + Glossary (complete)

**Marketing tab -- full daily execution system (Marketing.tsx complete rewrite):**
- Daily checklist: 5 tasks in localStorage keyed by date, auto-resets each day
- Suggested post card: anti-repetition scoring (14-day rolling window + use count), offset cycling, skip
- Variation generator: swaps opening line (OPENING_VARIANTS) and CTA (CTA_VARIANTS) for all 11 categories
- Image prompt for every post: copy-ready AI image generation prompt matched to category
- Mark as Used: creates marketing_post_log entry; LogForm captures groups, replies, leads, notes
- Post history tab: lists all logged posts from DB
- Groups tab: inline edit, truck_type_tags, active toggle, last posted display
- Template library tab: all 78 templates with use count and recency indicator
- Migration 009: marketing_post_log table + truck_type_tags, region_tags, active on marketing_groups
- marketingRepo.ts rewritten: updateMarketingGroup, listPostLog, createPostLog, updatePostLog, deletePostLog, getRecentlyUsedTemplateIds, getTemplateUsageCounts

**Bug fixes (user self-fixed in marketingUtils.ts):**
- OPENING_VARIANTS expanded from 5 to all 11 categories -- no-variant case no longer falls back silently
- isCtaLine check removed -- CTA always replaced unconditionally, fixing "variation only changes opening line"

**FMCSA SAFER hyperlinks:**
- src/lib/saferUrl.ts: builds SAFER CompanySnapshot URL for MC# and DOT# lookups
- Wired into Leads, Drivers, Brokers, Dashboard -- clicking MC# or DOT# opens SAFER in system browser

**FMCSA scraper improvements:**
- fmcsaApi.ts: pagination via start offset (3 pages x 50 = 150 per term), 200ms delay between pages
- fmcsaImport.ts: onlyNewAuthorities filter skips carriers outside 30-180 day authority age window
- DEFAULT_SEARCH_TERMS updated to 8 high-volume freight corridor states (TX, GA, IL, TN, OH, FL, IN, PA)
- AUTHORITY_MIN_DAYS and AUTHORITY_MAX_DAYS exported as constants

**Industry terms glossary (new feature):**
- src/data/industryTerms.ts: 60+ terms across 6 categories (Documents, Equipment, Regulatory, Dispatch, Rates & Freight, Business)
- Help page: added Articles / Glossary tab switcher; Glossary tab has search, category filter, alphabetical term cards

**Documentation sweep (all docs updated to current state):**
- docs/ROADMAP.md: complete rewrite -- all Phase 1+2 marked complete, Phase 3 partially done
- docs/PROJECT_MAP.md: full directory tree, IPC namespace table, key rules
- docs/FEATURE_REGISTRY.md: all 21 features documented, statuses current
- docs/ARCHITECTURE.md: full IPC channel table (~50 channels), full directory tree
- docs/DATA_ARCHITECTURE.md: 15 tables, all 9 migrations described, all repo files listed
- docs/DECISIONS.md: DEC-009 through DEC-013 added
- README.md: FMCSA section updated, marketing added to features table

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
1. Settings > Setup > "Load Task Templates" — seeds 18 tasks + 8 basic SOPs
2. Settings > Setup > "Rebuild Document Library" — overwrites/adds all 20 comprehensive docs
3. Settings > Setup > sample business data seeded automatically on first dev launch

Fully operational pages:
- Operations (default landing; KPI strip, Upcoming Check Calls, Profit Radar, Next Actions, Daily Checklist, Mini Dispatch Board, Top Leads)
- Load Match (guided dispatch workflow: driver selection, scored load matching, booking checklist, negotiation support, Book Load action)
- Active Loads (active load timeline + check call engine; per-load timeline, status updates, AI message helpers)
- Dispatcher Board (Kanban-style board with scanner recommendations)
- Leads (full CRM + FMCSA import + CSV/paste import + fleet size + backfill + SAFER links)
- Drivers (full profile + documents + SAFER links)
- Loads (full lifecycle)
- Brokers (full profile + performance + SAFER links)
- Invoices (full lifecycle + PDF/CSV/email export + delete)
- Tasks (daily checklist + all tasks + history + full CRUD; 18 seeded task templates)
- Settings (theme, business info, Backup & Restore, Google Drive notes, task templates, document library rebuild, FMCSA re-enrich)
- Documents (markdown SOP library; 20 comprehensive documents after rebuild)
- Analytics (KPIs, revenue by month/driver, lane profitability, broker volume)
- Help (articles + Glossary tab with 60+ searchable industry terms, keyboard shortcuts reference)
- Marketing (78 post templates, daily rotation, anti-repetition, variation generator, image prompts, post history logging, group manager, all 11 categories with truck types)
- FB Agents (Facebook conversation agent, lead hunter, content agent)

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

1. Fill in Settings > Business Information — company name, your name, email, dispatch % are now editable and save to electron-store
2. Start the outreach loop — Import FMCSA leads, start calling, work the FB pipeline
3. Add loads to the system in Searching status so Load Match has candidates to surface
4. Email/SMTP integration for invoices (replace mailto: with real send)
5. Driver document expiry push notifications (badge alerts exist, OS push does not)
6. Real deadhead estimation — Load Match and the new Pre-Booking Profit Check both use the same heuristic (same city=10mi, same state=75mi, cross-state=250mi). A real API (PC Miler, Google Maps) would improve accuracy of deadhead-based profitability calculations significantly.
7. Surface broker_id and trailer_type in the UI — migration 017/018 added these columns; InvoiceModal and LoadModal do not yet expose them for editing

---

## Files Touched in Most Recent Session (40)

### New:
- `src/lib/profitability.ts` — checkProfitability, ProfitCheck, ProfitBand, ProfitResult, ProfitIncomplete

### Modified:
- `src/pages/FindLoads.tsx` — ProfitStrip component, profitChecks memo, profitSort state, sortedGoodLoads, sort toggles, FirstCallCard/LoadRow profitCheck prop
- `docs/HANDOFF.md` — session 40 entry
- `docs/SESSION_LOG.md` — session 40 entry

---

## Files Touched in Session (38)

### Modified:
- `electron/main/schema/migrations.ts` — migration047 (unassignment_reason column)
- `electron/main/repositories/driverFalloutRepo.ts` — reason-aware logFallout + stats queries
- `electron/main/ipcHandlers.ts` — strip + pass unassignment_reason in loads:update
- `src/types/models.ts` — UNASSIGNMENT_REASONS, UnassignmentReason, UpdateLoadDto
- `src/types/global.d.ts` — DriverFalloutStats extended; UnassignmentReason import
- `src/components/loads/constants.ts` — UNASSIGNMENT_REASON_OPTIONS added
- `src/components/loads/LoadsTable.tsx` — DriverDropdown reason phase UI
- `src/pages/Loads.tsx` — handleDriverChange reason param + threading
- `src/pages/Drivers.tsx` — pendingUnassign state + overlay modal; handleConfirmUnassign
- `docs/HANDOFF.md` — session 38 entry
- `docs/SESSION_LOG.md` — session 38 entry

---

## Files Touched in Session (37)

### New files:
- `electron/main/repositories/driverFalloutRepo.ts`

### Modified:
- `electron/main/schema/migrations.ts` — migration046 (driver_fallout_log)
- `electron/main/repositories/index.ts` — export driverFalloutRepo
- `electron/main/ipcHandlers.ts` — logFallout in loads:update; two new driver handlers
- `electron/preload/index.ts` — falloutStats + allFalloutCounts in drivers namespace
- `src/types/models.ts` — DriverFalloutStats + DriverFalloutCountRow interfaces
- `src/types/global.d.ts` — new types imported; two driver api methods typed
- `src/lib/driverTierService.ts` — fallout_count in TierInput; C/A threshold additions
- `src/pages/Reports.tsx` — fallout_count: 0 default at both computeDriverTier sites
- `src/components/operations/MorningDispatchBrief.tsx` — fallout_count: 0 default
- `src/components/drivers/DriversTable.tsx` — tierMap prop + Tier column
- `src/pages/Drivers.tsx` — loadTierMap(); tierMap state + prop pass-through
- `src/components/drivers/DriverDrawer.tsx` — falloutStats state, fetch, Reliability block
- `docs/HANDOFF.md` — session 37 entry
- `docs/SESSION_LOG.md` — session 37 entry

---

## Files Touched in Most Recent Session (20)

### Modified:
- `electron/main/repositories/loadsRepo.ts` — CAT-A: audit log on create/update/delete; ACTIVE_STATUSES guard on delete
- `electron/main/repositories/invoicesRepo.ts` — CAT-A: audit log on create/update/delete
- `electron/main/repositories/brokersRepo.ts` — CAT-A: audit log on create/update/delete
- `electron/main/repositories/driversRepo.ts` — CAT-A: audit log on create/update/delete
- `electron/main/repositories/leadsRepo.ts` — CAT-A: audit log on create/update/delete
- `electron/main/schema/migrations.ts` — migration 017 (broker_id on invoices); migration 018 (trailer_type on loads)
- `electron/main/index.ts` — M-9: session CSP header via webRequest.onHeadersReceived; import session from electron
- `src/components/brokers/BrokerDrawer.tsx` — H-3: replace db.query with loads.list + intel.allBrokers; remove scoring IIFE; move INTEL_RATING_STYLE to module level
- `src/types/models.ts` — M-8: add OperationsData, DriverOpportunity, LeadHeat, GroupPerformance, BrokerLane, ProfitRadarData
- `src/pages/Operations.tsx` — M-8: import shared types from models.ts; remove local interface definitions

## Files Touched in Most Recent Session (19)

### Modified:
- `electron/main/brokerIntelligence.ts` — H-5: lane intel status filter fix
- `electron/main/ipcHandlers.ts` — H-7: URL protocol validation; H-2: SELECT-only guard on db:query
- `electron/main/schema/migrations.ts` — H-6: wrap migration up() in db.transaction()
- `electron/main/scheduler.ts` — CAT-C: remove runDailyBriefing and runMarketingQueue stubs; narrow JobName; trim JOBS array
- `electron/main/loadScanner.ts` — M-6: rename total_revenue → gross_rate
- `src/types/models.ts` — M-6: rename total_revenue → gross_rate in LoadRecommendation
- `src/types/global.d.ts` — L-5: add backfillLeadData to leads namespace; add reseedDocs to dev namespace
- `src/App.tsx` — H-4: add ErrorBoundary class component; wrap HashRouter
- `src/store/settingsStore.ts` — CAT-B: remove hardcoded personal identity defaults
- `src/pages/Settings.tsx` — CAT-B/M-2: Business Info editable inputs + Save; L-5: remove as any casts; L-4: inline confirm for Remove Sample Data

---

## Files Touched in Session (17)

### New files:
- `electron/main/repositories/loadTimelineRepo.ts`
- `src/pages/ActiveLoads.tsx`

### Modified:
- `electron/main/schema/migrations.ts` — migration 015 (dedup marketing_groups) + migration 016 (load_timeline_events table)
- `electron/main/ipcHandlers.ts` — timeline import + 10 new handlers
- `electron/preload/index.ts` — `timeline` namespace exposed
- `src/types/models.ts` — `TimelineEvent`, `ActiveLoadRow`, `CheckCallRow` types added
- `src/types/global.d.ts` — `timeline` added to `Window.api`; new types imported
- `src/components/layout/Sidebar.tsx` — Active Loads 3rd nav item (`Activity` icon)
- `src/App.tsx` — `ActiveLoads` import + `/activeloads` route
- `src/pages/Operations.tsx` — `checkCalls` state + independent fetch + Upcoming Check Calls section
- `electron/main/repositories/marketingRepo.ts` — `createMarketingGroup` uses `INSERT OR IGNORE`

---

## Files Touched in Most Recent Session (16)

### New files:
- `src/pages/LoadMatch.tsx`

### Modified:
- `electron/main/ipcHandlers.ts` — added `loadMatch:nego` handler (Claude Haiku negotiation script)
- `electron/preload/index.ts` — added `loadMatch` namespace with `nego()`
- `src/types/global.d.ts` — added `operations`, `profitRadar`, `loadMatch` to `Window.api` type
- `src/components/layout/Sidebar.tsx` — Load Match added as 2nd item (`ArrowRightLeft` icon)
- `src/App.tsx` — `LoadMatch` import + `/loadmatch` route
- `src/pages/Operations.tsx` — idle driver rows now navigate to `/loadmatch?driverId=X`

---

## Files Touched in Session 15

### New files:
- `electron/main/operations.ts`
- `electron/main/profitRadar.ts`
- `src/pages/Operations.tsx`

### Modified:
- `electron/main/ipcHandlers.ts` — added `operations:data`, `profitRadar:data`, `profitRadar:summary` handlers
- `electron/preload/index.ts` — added `operations` + `profitRadar` API namespaces
- `src/components/layout/Sidebar.tsx` — Operations as first item; Dashboard removed; Zap icon
- `src/App.tsx` — `/operations` route added; `/dashboard` redirects to `/operations`; default index redirects to `/operations`

---

## Files Touched in Most Recent Session (14)

### New files:
- src/data/industryTerms.ts
- src/lib/saferUrl.ts
- src/lib/marketingUtils.ts

### Modified:
- src/pages/Help.tsx -- added Glossary tab (Articles/Glossary switcher, TermCard component)
- src/pages/Marketing.tsx -- complete rewrite (daily execution system, variation gen, post logging, group manager)
- electron/main/repositories/marketingRepo.ts -- rewritten with post log and group update functions
- electron/main/schema/migrations.ts -- migration 009
- electron/main/ipcHandlers.ts -- new marketing handlers
- electron/preload/index.ts -- extended marketing namespace
- electron/main/fmcsaApi.ts -- pagination via start offset
- electron/main/fmcsaImport.ts -- onlyNewAuthorities filter, updated search terms
- src/components/leads/LeadDrawer.tsx -- SAFER links
- src/components/leads/LeadsTable.tsx -- SAFER links
- src/components/leads/LeadModal.tsx -- fleet_size field
- src/components/drivers/DriverDrawer.tsx -- SAFER links
- src/components/drivers/DriversTable.tsx -- SAFER links
- src/components/brokers/BrokerDrawer.tsx -- SAFER links
- src/components/brokers/BrokersTable.tsx -- SAFER links
- src/pages/Dashboard.tsx -- SAFER links on dashboard KPI
- docs/ROADMAP.md, PROJECT_MAP.md, FEATURE_REGISTRY.md, ARCHITECTURE.md, DATA_ARCHITECTURE.md, DECISIONS.md, README.md -- full sweep

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
