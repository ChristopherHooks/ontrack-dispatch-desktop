# Session Log — OnTrack Dispatch Dashboard

## 2026-04-15 — Session 36: Inline Assignment + Consistency Pass

### Work Completed

Inline editing pass across Loads table and Drivers table, plus consistency
enforcement for the driver On Load → Active transition.

**src/components/loads/LoadsTable.tsx**
- New `DriverDropdown` component. Portal-positioned (same pattern as the
  existing `StatusDropdown`). Shows non-Inactive drivers + currently assigned
  driver (even if On Load). Includes `(on load)` label for secondary drivers
  so the dispatcher sees the risk. Busy state shows `…` during async call.
- `onDriverChange` optional prop added. Static driver name text replaced
  with `<DriverDropdown>`. `dMap` constant removed (no longer needed).

**src/pages/Loads.tsx**
- `handleDriverChange(load, newDriverId | null)` added.
  Three branches, all reusing existing IPC:
  1. Unassign (`null`): `loads.update(id, { driver_id: null })` → Session 35
     backend reverts load to Searching and old driver to Active.
  2. Fresh assign: `dispatcher.assignLoad` → Session 33 offer tracking fires.
  3. Reassign (`driverA → driverB`): unassign first (temporarily Searching),
     then `assignLoad` for new driver. Both loads and drivers re-fetched.
- `handleDriverChange` passed to `<LoadsTable onDriverChange={...}>`.

**src/components/drivers/DriversTable.tsx**
- New `DriverStatusDropdown` component. Same portal pattern.
  Shows all `DRIVER_STATUSES`; current status shown dimmed/disabled.
- `onStatusChange` optional prop added. Static status badge replaced with
  `<DriverStatusDropdown>`. Added `useRef`, `useEffect`, `createPortal`
  imports; added `DriverStatus` and `DRIVER_STATUSES` imports.

**src/pages/Drivers.tsx**
- `handleStatus` extended with a pre-change consistency guard:
  - Only triggers when `drv.status === 'On Load'` and target `!== 'On Load'`
  - Calls `loads.list()` and finds any Booked/Picked Up/In Transit load for
    this driver
  - Shows `window.confirm(...)` naming the specific load ref
  - On confirm: unassigns the load via `loads.update(activeLoad.id, { driver_id: null })`
    (backend reverts load to Searching; driver status update follows immediately after)
  - On cancel: early return, nothing changes
- `handleStatus` now passed as `onStatusChange` to `<DriversTable>` (previously
  was only used by `<DriverDrawer onStatusChange={handleStatus}>`).

**DriverDrawer — Location field**: confirmed already fully implemented.
`saveLocation()` → `drivers.update({ current_location })` → `onUpdate(updated)`
→ `handleUpdate` in Drivers.tsx → `setDrivers` + `setSelected`. No changes needed.

### Validation
- tsc --noEmit: zero errors
- No new IPC channels
- No schema changes
- All Session 33/34/35 fixes untouched

---

## 2026-04-15 — Session 35: Load Unassignment Fix

### Work Completed

Fixed the load unassignment flow so removing a driver fully reverts the
driver/load relationship across the DB and all relevant UI surfaces.

**Root causes identified:**
Three layered bugs, all introduced by `updateLoad` being a generic field-updater
with no business-logic awareness:
1. `drivers.status` not reset to `'Active'` — the load update never touched the drivers table
2. `loads.status` not reverted to `'Searching'` — the form dto included `status: 'Booked'`, which was written as-is
3. `drivers` state in Loads.tsx not refreshed after save — `handleSave` only called `setLoads`, not `setDrivers`

**electron/main/ipcHandlers.ts**
- `loads:update` handler expanded from a one-liner to a full function
- Reads existing load before update (`getLoad`)
- Detects driver removal: `before.driver_id != null && patch.driver_id === null`
- Mutates patch to include `status: 'Searching'` when status would otherwise remain `'Booked'`
- After `updateLoad`, resets old driver to `'Active'` (guarded: only if no other Booked/Picked Up/In Transit loads remain for that driver)
- The Session 33 `dispatch:assignLoad` fix (offer create+accept) is untouched

**src/pages/Loads.tsx**
- `handleSave` now detects driver removal by comparing previous load's `driver_id` to saved load's `driver_id`
- If driver was removed, calls `window.api.drivers.list().then(setDrivers)` — non-blocking, catches errors silently
- Keeps the embedded DispatchBoard and LoadDrawer's `drivers` prop in sync

### Surfaces fixed
- **Loads drawer** — Assignment section shows "Unassigned", status badge correctly reverts to "Searching", action bar no longer offers "Mark Picked Up" for an unassigned load
- **Loads board (DispatchBoard embedded in Loads.tsx)** — driver status badge returns to available after driver list refresh
- **Dispatcher Board (standalone page)** — driver correctly appears in "Needs Load" group on next load/refresh, load re-enters Available Loads panel

### Validation
- tsc --noEmit: zero errors
- No schema changes
- No new IPC channels
- `dispatch:assignLoad` offer-tracking fix untouched

---

## 2026-04-15 — Session 34: Driver Performance Tier System

### Work Completed

Lightweight, data-driven driver tier system (A/B/C/UNRATED) computed on the
frontend from existing scorecard fields. No schema changes, no new IPC.

**src/lib/driverTierService.ts (new)**
- `computeDriverTier(TierInput): DriverTierResult` — pure function.
- UNRATED: insufficient data (< 3 resolved offers AND < 2 loads booked).
- C: any single trigger — acceptance < 40%, no_response >= 3, avg_response > 120 min.
- A: all conditions — acceptance >= 70%, avg_response <= 60 min, no_response <= 1,
  loads >= 2.
- B: has data, not A or C.
- Exports: `TIER_BADGE` (Tailwind token classes), `TIER_LABEL`, `tierSortRank()`.

**src/types/models.ts**
- Re-exports `DriverTier`, `DriverTierResult`, `TierInput` from driverTierService.
- `MorningDispatchBriefRow` extended with 4 fields: `accepted_count`, `declined_count`,
  `no_response_count`, `loads_booked` (all `number`).

**electron/main/morningDispatchBrief.ts**
- Passes 4 new fields from scorecard map into each row. Zero-default when missing.

**src/components/drivers/DriverDrawer.tsx**
- Import added. Tier badge rendered in header (beside status badge) when `weeklyCard`
  is available. Computed inline via IIFE to keep JSX clean.

**src/components/operations/MorningDispatchBrief.tsx**
- Import added. `driverTierResult` computed per DriverCard. Badge rendered beside
  driver name. Separate name avoids collision with existing `tier` (load score).

**src/pages/Reports.tsx**
- Import added. `ScoreSort` extended with `'tier'`. Sort logic special-cases tier
  using `tierSortRank()` instead of direct field access. New "Tier" column (last).
  Badge shows reason on hover via HTML `title` attribute.

### Validation
- tsc --noEmit: zero errors
- No schema changes
- No new IPC channels
- No existing functionality broken

---

## 2026-04-15 — Session 33: Dynamic Daily Workflow System

### Work Completed

Replaced the static Morning Briefing checklist on the Operations page with a
conditional, profit-first Daily Workflow panel. All changes additive — no schema
changes, no new IPC channels beyond a single count field.

**src/lib/dailyWorkflowEngine.ts (new)**
- Pure function `computeDailyWorkflow(input, manuallyDone)` → `DailyWorkflowTask[]`.
- 11 tasks across 4 tiers: revenue_now, revenue_protection, pipeline, admin.
- Each task is either `actionable` (count > 0), `not_applicable` (auto-skipped with
  a reason string), or `completed` (manually toggled by the dispatcher).
- Profit-first ordering: book loads → check calls → invoice → AR → compliance →
  lead follow-up → driver prospects → warm leads → stale cleanup → marketing.
- Tasks that have no underlying data skip automatically. No checklist theater.

**src/components/operations/DailyWorkflowPanel.tsx (new)**
- Renders task groups by category with tier labels (Revenue Now, Revenue Protection,
  Pipeline, Admin).
- Actionable tasks: bold title, orange count badge, always-visible action button,
  manual mark-done checkbox.
- Not-applicable tasks: compact gray row with reason text — visible but non-intrusive.
- Completed tasks: green checkmark, strikethrough title, click to undo.
- Scroll action support: `#scroll:morning-dispatch-brief` scrolls to the
  MorningDispatchBrief section without page navigation.

**electron/main/operations.ts**
- Added `overdueInvoices: number` count (invoices WHERE status = 'Overdue').
- Added to `OperationsData` interface and return object.

**src/types/models.ts**
- Added `overdueInvoices: number` to `OperationsData` interface.

**src/pages/Operations.tsx**
- Removed static Morning Briefing (6-row checklist) — superseded by Daily Workflow.
- Added `workflowDone: Set<string>` state for per-session manual completions.
- Computed `overdueCheckCalls` from existing `checkCalls` state.
- Calls `computeDailyWorkflow()` with all current operational data + manuallyDone set.
- Wrapped `<MorningDispatchBrief>` in `<div id='morning-dispatch-brief'>` for scroll target.
- Added imports: DailyWorkflowPanel, computeDailyWorkflow, DailyWorkflowTask.
- Removed unused lucide-react imports (CheckCircle2, Circle, Receipt).
- EMPTY constant updated with `overdueInvoices: 0`.

### No-change list
- No new IPC channels, no preload changes.
- No schema migrations.
- No changes to MorningDispatchBrief, Profit Radar, KPI strip, or any other page.
- tsc --noEmit passes with zero errors.

---

## 2026-04-15 — Session 32: Morning Dispatch Brief

### Work Completed

Additive feature: Morning Dispatch Brief section on the Operations page.
No schema changes. No rewrites of existing systems. All additive.

**electron/main/morningDispatchBrief.ts (new)**
- `getMorningDispatchBrief(db)`: assembles driver-first morning planning data.
  Uses `getRecommendations` (loadScanner, unchanged) for eligible drivers + top 5 loads.
  Trims to top 3 per driver. Enriches with current_location + min_rpm via a direct
  driver query, and acceptance_rate / avg_response_minutes / dispatcher_revenue via
  `getAllDriversWeeklyScorecards` (driverPerformanceRepo, unchanged).
  Sort: has suggestions first -> best top score desc -> no-suggestion rows last.

**src/types/models.ts**
- Added `MorningDispatchBriefRow` interface with driver context fields and suggestions array.

**electron/main/ipcHandlers.ts**
- Added `operations:morningBrief` handler.

**electron/preload/index.ts**
- Added `morningBrief()` to the `operations` namespace.

**src/types/global.d.ts**
- Imported `MorningDispatchBriefRow`.
- Added `morningBrief: () => Promise<MorningDispatchBriefRow[]>` to operations API type.

**src/components/operations/MorningDispatchBrief.tsx (new)**
- Section header with driver count.
- DriverCard per eligible driver: name, location, min RPM, acceptance rate,
  avg response time, weekly dispatcher revenue.
- SuggestionRow per top-3 load: score indicator, lane (origin -> dest), RPM,
  deadhead (orange if > 200 mi), gross rate, broker, pickup date, Assign button.
- Assign calls `window.api.dispatcher.assignLoad({ loadId, driverId })` and marks
  row as assigned on success. Refresh callback fires to re-pull the brief.
- Empty states for: no eligible drivers, eligible driver but no suggestions.

**src/pages/Operations.tsx**
- Added `morningBrief` and `briefLoading` state.
- Added `refreshMorningBrief` helper.
- Fetch fires independently (does not block main data render).
- `MorningDispatchBrief` component rendered between Morning Briefing checklist and KPI strip.

**Session 32 addendum — load_offers integration patch:**

`MorningDispatchBrief.tsx` SuggestionRow updated to mirror the canonical Loads.tsx
offer workflow:
- `useEffect` on mount calls `loadOffers.create(driverId, loadId)` (find-or-create —
  safe against re-render/reopen) and stores `offerId` in local state.
- `handleAssign` now calls `loadOffers.updateStatus(offerId, 'accepted')` after a
  successful `dispatcher.assignLoad`. Matches Loads.tsx handleAssign exactly.
- `handleSkip` added: calls `loadOffers.updateStatus(offerId, 'declined')` and hides
  the row. X button added alongside Assign.
- `X` icon imported from lucide-react. `LoadOffer` type imported from models.
- `useEffect` added to React imports.
- No new IPC channels, no schema changes, no repo changes.

---

## 2026-04-15 — Session 31: Per-Driver Weekly Scorecard System

### Work Completed

Additive feature: Per-Driver Weekly Scorecard. No schema changes. No existing
behavior altered.

**driverPerformanceRepo.ts (new)**
- `getDriverWeeklyScorecard(db, driverId)`: returns scorecard for a single driver
  covering the current Mon–Sun window. Includes revenue metrics (loads_booked,
  gross_revenue, dispatcher_revenue, avg_rpm), offer behavior stats (accepted,
  declined, no_response, open, acceptance_rate, avg_response_minutes), and
  trend vs prior week (revenue_trend_pct, loads_trend_delta).
- `getAllDriversWeeklyScorecards(db)`: single-query join across all non-Inactive
  drivers. Returns rows sorted by dispatcher_revenue DESC, loads_booked DESC.
  No trend data (all-drivers endpoint).
- Week bounds computed in JS (getWeekBounds helper). Offer stats use the same
  hardened acceptance_rate logic as getDriverAcceptanceStats (resolved-only
  denominator, NULLIF guard).

**repositories/index.ts**
- Added export for driverPerformanceRepo.

**src/types/models.ts**
- Added DriverWeeklyScorecard interface.

**electron/main/ipcHandlers.ts**
- Added `drivers:weeklyScorecard` and `drivers:allWeeklyScorecards` handlers.

**electron/preload/index.ts**
- Added `weeklyScorecard(driverId)` and `allWeeklyScorecards()` to drivers namespace.

**src/types/global.d.ts**
- Imported DriverWeeklyScorecard.
- Added method signatures to drivers API type block.

**src/pages/Reports.tsx**
- Added "Driver Performance — This Week" section after KPI strip.
- Table: Driver, Loads, Gross, Disp. Cut, Avg RPM, Acc. Rate, Avg Resp,
  Acc/Dec/NR breakdown, Open Offers.
- Client-side sort on Loads, Disp. Cut, Avg RPM, Acc. Rate. Click header to toggle
  direction. Default: Disp. Cut descending.
- Uses existing badge/token system.

**src/components/drivers/DriverDrawer.tsx**
- Added `weeklyCard` state and fetch in useEffect.
- Added "This Week" compact panel after Current Load, before Carrier Setup.
- Shows: loads, gross, dispatcher cut + % trend vs last week, avg RPM, acceptance
  rate, avg response time. All conditionally rendered — section hidden if null.

## 2026-04-15 — Session 30: Load Offer Tracking — Data Integrity Hardening

### Work Completed

Data integrity pass on the Load Offer Tracking System (Session 29). No redesign —
all changes are additive or narrowly targeted at the three root causes: duplicate
open offers, inaccurate acceptance_rate denominator, and no manual no_response path.

**loadOffersRepo.ts — find-or-create guard**
- `createOffer` now checks for an existing open offer (outcome IS NULL) for the same
  (driver_id, load_id) before inserting. Returns the existing row if found.
  This prevents duplicate open offers from panel reopen / React rerender without
  blocking new offers when a previously-declined load is shown again.

**loadOffersRepo.ts — mark functions hardened**
- `markAccepted`, `markDeclined`, `markNoResponse` each add `AND outcome IS NULL`
  to the WHERE clause. Resolved offers cannot be overwritten by a stale IPC call.

**loadOffersRepo.ts — getDriverAcceptanceStats**
- Added `open_offer_count` (SUM where outcome IS NULL)
- `acceptance_rate` denominator changed from COUNT(*) to resolved-only count
  (accepted + declined + no_response). NULLIF(resolved_count, 0) guards divide-by-zero.
  When resolved_count = 0 (all open), rate coerces to 0 — never NULL in the return struct.

**loadOffersRepo.ts — sweepNoResponse**
- Added explicit comments explaining the three-layer safety (outcome IS NULL,
  responded_at IS NULL, julianday arithmetic) so the intent is clear to future editors.

**src/types/models.ts**
- `LoadOfferStats`: added `open_offer_count: number` field with JSDoc explaining
  resolved-only rate semantics.

**src/pages/Loads.tsx — DispatchBoard**
- Added `loadingOffers` boolean state; `openOfferPanel` sets it true before the
  async fetch and false in `finally`, preventing double-fire from rapid button clicks.
- Added `handleMarkNoResponse(al)`: calls `updateStatus(offerId, 'no_response')` and
  dismisses the row — manual override without waiting for the 2-hour sweep.
- Added "N/R" (No Response) button per offer row in the panel (Clock icon).
- "Find Load" button disabled and shows "Loading..." while `loadingOffers` is true.

**src/components/drivers/DriverDrawer.tsx — Load Behavior**
- Breakdown row now shows `open_offer_count` in orange when > 0.
- Acceptance Rate label appends "(excl. open)" when open offers exist, so the
  dispatcher understands why the displayed rate may not sum to 100%.

### Files Changed
- `electron/main/repositories/loadOffersRepo.ts` — find-or-create, hardened marks, stats
- `src/types/models.ts` — open_offer_count in LoadOfferStats
- `src/pages/Loads.tsx` — loadingOffers guard, handleMarkNoResponse, N/R button
- `src/components/drivers/DriverDrawer.tsx` — open_offer_count display
- `docs/SESSION_LOG.md` — this entry
- `docs/HANDOFF.md` — updated

---

## 2026-04-15 — Session 29: Load Offer Tracking System

### Work Completed

Full Load Offer Tracking System implemented across DB, repository, IPC, and UI layers.
Every load offered to every driver is now recorded with outcome (accepted / declined / no_response)
and decline reason. DispatchBoard gains a "Find Load" inline panel; DriverDrawer gains a
Load Behavior stats section.

**Migration 045**
- `load_offers` table: id, driver_id (FK), load_id (FK), offered_at, responded_at, outcome CHECK,
  decline_reason, created_at, updated_at
- Indexes on driver_id, load_id, outcome

**loadOffersRepo.ts (new)**
- `createOffer(db, driverId, loadId)` — inserts pending offer
- `markAccepted(db, offerId)` — sets outcome + responded_at
- `markDeclined(db, offerId, reason?)` — sets outcome + reason + responded_at
- `markNoResponse(db, offerId)` — sets outcome + responded_at
- `getOffersByDriver(db, driverId)` — all offers newest first
- `getDriverAcceptanceStats(db, driverId)` — total, accepted, declined, no_response, acceptance_rate, avg_response_minutes
- `sweepNoResponse(db)` — bulk UPDATE for offers 2+ hours old with no outcome

**IPC + Preload + Types**
- 3 new handlers: `loadOffers:create`, `loadOffers:updateStatus`, `loadOffers:getDriverStats`
- Preload: `window.api.loadOffers` namespace
- `models.ts`: `LoadOffer`, `LoadOfferStats`, `LoadOfferOutcome`, `LOAD_OFFER_DECLINE_REASONS`
- `global.d.ts`: full TypeScript declarations

**DispatchBoard (Loads.tsx)**
- "Find Load" button on Needs Load driver cards
- Fetches available loads + creates offer records for each load shown
- Assign button: calls `dispatcher.assignLoad` + `loadOffers.updateStatus('accepted')`
- Skip button: opens decline reason dropdown; calls `loadOffers.updateStatus('declined', reason)`
- Decline reasons: Rate too low, Too far, Bad lane, Driver unavailable, Other

**DriverDrawer.tsx**
- New "Load Behavior" section (hidden when total_offers = 0)
- Shows: acceptance rate %, total offers, avg response time, breakdown (accepted / declined / no response)

**Scheduler (no_response sweep)**
- `sweepNoResponse()` called every tick (every minute)
- Marks all offers with outcome=NULL and offered_at 2+ hours ago as no_response

### Files Changed

- `electron/main/schema/migrations.ts` — migration 045
- `electron/main/repositories/loadOffersRepo.ts` — NEW
- `electron/main/repositories/index.ts` — export added
- `electron/main/ipcHandlers.ts` — import + 3 handlers
- `electron/preload/index.ts` — loadOffers namespace
- `src/types/models.ts` — LoadOffer, LoadOfferStats, LoadOfferOutcome, LOAD_OFFER_DECLINE_REASONS
- `src/types/global.d.ts` — import + window.api.loadOffers declarations
- `src/pages/Loads.tsx` — DispatchBoard offer panel
- `src/components/drivers/DriverDrawer.tsx` — Load Behavior section
- `electron/main/scheduler.ts` — sweepNoResponse every tick

---

## 2026-04-15 — Session 28: Outreach Engine — DB wiring, performance panel, dashboard reminder, bug fix

### Work Completed

Completed the full Outreach Engine integration. Session 27 built the generation
core; Session 28 replaced the localStorage refresh tracking with a proper
DB-backed system, added performance visibility into the Post History tab, added
a dashboard reminder banner, wrote the implementation spec, and fixed a runtime
crash that prevented the Marketing tab from loading.

**1 — Migration 039**
- `electron/main/schema/migrations.ts` — new `outreach_refresh_log` table
  (id, refreshed_at, notes, template_count_added); migration added to MIGRATIONS array

**2 — outreachRepo.ts (new)**
- `getLastRefresh(db)` — latest refresh row or null
- `logRefresh(db, notes, templateCountAdded)` — insert refresh record
- `getOutreachPerformance(db)` — aggregates marketing_post_log by template_id; score = replies + leads*3
- `getOutreachSummary(db)` — total posts/replies/leads, top template, stale template list (8+ uses, score=0)

**3 — IPC wiring**
- `repositories/index.ts` — re-export added
- `ipcHandlers.ts` — 4 new handlers: outreach:getLastRefresh, outreach:logRefresh, outreach:performance, outreach:summary
- `preload/index.ts` — outreach namespace with 4 methods
- `global.d.ts` — full TypeScript types for window.api.outreach

**4 — Marketing.tsx (modified)**
- Replaced localStorage refresh state with DB-backed `loadOutreachMeta()` fetching getLastRefresh + performance + summary on mount
- "Mark refresh done" button writes to DB via outreach.logRefresh and reloads meta
- `OutreachPerformancePanel` wired into Post History tab (shown when total_posts > 0)
- Added missing `import OutreachPerformancePanel` statement — this was the bug causing "OutreachPerformancePanel is not defined" crash on Marketing tab load

**5 — OutreachPerformancePanel.tsx (new)**
- Location: `src/components/marketing/OutreachPerformancePanel.tsx`
- Stat tiles, top-5 template table with score coloring, stale warning block, bottom-3 table

**6 — Dashboard.tsx (modified)**
- Fetches outreach.getLastRefresh() on mount
- Blue dismissible banner when no refresh logged or last refresh >= 7 days ago
- "Go to Outreach" button navigates to /marketing

**7 — docs/OUTREACH_ENGINE_SPEC.md (new)**
- Full implementation reference covering all 9 sections: architecture, schema,
  generation logic, humanization, UI integration, weekly refresh, files/functions
  reference, output format, build order

### Files Changed
- `electron/main/schema/migrations.ts` (modified)
- `electron/main/repositories/outreachRepo.ts` (new)
- `electron/main/repositories/index.ts` (modified)
- `electron/main/ipcHandlers.ts` (modified)
- `electron/preload/index.ts` (modified)
- `src/types/global.d.ts` (modified)
- `src/pages/Marketing.tsx` (modified)
- `src/components/marketing/OutreachPerformancePanel.tsx` (new)
- `src/pages/Dashboard.tsx` (modified)
- `docs/OUTREACH_ENGINE_SPEC.md` (new)
- `docs/HANDOFF.md` (updated)
- `docs/SESSION_LOG.md` (updated)

---

## 2026-04-14 — Session 27: Outreach Engine

### Work Completed

Built the Outreach Engine — a zero-AI-cost daily Facebook outreach system that generates 5 group posts + 1 page post in one click.

**1 — outreachEngine.ts (new)**
- Hook bank: 20 hooks, 2 natural-sounding variations each (40 total opening lines)
- CTA bank: 15 CTAs, 2 variations each (30 closers)
- Pain point bank: 15 entries — specific, concrete, written in dispatcher voice
- Benefit bank: 15 entries — phrased as first-person "I do X" statements
- Template library: 20 variable-based outreach templates using `{driver_type}`, `{lane_region}`, `{rpm_range}`, `{company_name}`, `{pain_point}`, `{benefit}`; tagged by driver type for relevance filtering
- 5 page post templates — distinct from group posts, slightly more structured
- `generateTodaysOutreach()`: seeded PRNG (LCG, deterministic by date + offset) so same-day picks are stable; scores templates by recency + driver type match; picks 5 unique templates, hooks, CTAs, pain points, benefits; assembles and fills all variables
- Humanization: word-swap dictionary (14 swap pairs, 28% application rate) — alternates "DM me"/"message me", "right now"/"at the moment", "broker contacts"/"broker relationships", etc.
- `getWeeklyRefreshState()` / `markAiRefreshDone()`: localStorage-backed weekly AI refresh reminder (triggers after 7 days)
- `computeTemplateScores()`: ranks templates by post log replies + leads for performance-weighted selection
- `groupSuccessScore()`: derives group performance from leads_generated_count + signed_drivers_count

**2 — Marketing.tsx (modified)**
- Added `Zap` and `AlertTriangle` to lucide imports
- Imported `generateTodaysOutreach`, `getWeeklyRefreshState`, `markAiRefreshDone`, and related types
- Extended `activeTab` type to include `'outreach'`
- Added 7 new state variables: `outreachResult`, `outreachSeed`, `outreachCopied`, `outreachDriverType`, `outreachLaneRegion`, `outreachRpmRange`, `refreshState`
- Added 4th tab "Outreach Engine" (Zap icon) to existing tab bar
- New Outreach Engine tab panel: driver type dropdown, lane region input, RPM range input, Generate + Regenerate buttons, 5 group post cards, 1 page post card, weekly refresh reminder banner, weekly AI usage plan checklist
- `OutreachPostCard` component: per-post Copy + Mark Used actions; Mark Used logs to marketing_post_log via existing IPC so anti-repetition engine learns over time; local `markedUsed` state shows "Logged" confirmation

### Files Changed
- `src/lib/outreachEngine.ts` (new, 717 lines)
- `src/pages/Marketing.tsx` (modified, +289 lines, now 1549 lines)

### No migrations, no new IPC, no changes outside Marketing module

---

## 2026-03-29 — Session 26: Eight Further App Improvements

### Work Completed

Eight improvements across driver ops, invoicing, broker management, reporting, and lead tracking.

**1 — Driver Run Sheet PDF (LoadDrawer)**
- `LoadDrawer.tsx` — `printRunSheet(load, driver, broker)` added; same DOM-inject + `window.print()` + cleanup pattern as settlement PDF; sections: Driver & Equipment, Pickup, Delivery, Broker Contact, Special Instructions, mileage/rate summary box
- "Run Sheet" button visible in action bar only for Booked / Picked Up / In Transit loads

**2 — Invoice Aging Table (Reports)**
- `reports.ts` — `InvoiceAgingRow` interface + query: joins invoices → loads → brokers, WHERE status IN ('Sent','Overdue'), computes `days_out` via `julianday()`, buckets: 0-15 / 16-30 / 31-60 / 60+; ORDER BY days_out DESC
- `ReportsData` updated to include `invoiceAging`
- `Reports.tsx` — "Accounts Receivable Aging" section: 4-bucket summary tiles + line-by-line detail table (before IFTA)

**3 — Broker Contact Log**
- Migration 031: `broker_call_log` table (id, broker_id FK CASCADE, note TEXT, created_at), index on broker_id
- `brokerCallLogRepo.ts` (new) — `listBrokerCallLog`, `createBrokerCallLog`, `deleteBrokerCallLog`
- `repositories/index.ts` — export added
- `ipcHandlers.ts` — three handlers: `brokerCallLog:list`, `brokerCallLog:create`, `brokerCallLog:delete`
- `preload/index.ts` — `brokerCallLog` group wired
- `global.d.ts` — `brokerCallLog` type block added
- `BrokerDrawer.tsx` — "Contact Log" section (before Notes): single-line input + timestamped note list with delete per entry

**4 — Driver Document Expiry Alert on Dashboard**
- `global.d.ts` — `compliance: () => Promise<DriverComplianceRow[]>` added to drivers type; `DriverComplianceRow` import added
- `Dashboard.tsx` — on mount, calls `window.api.drivers.compliance()`; flattens cdl_expiry / insurance_expiry / medical_card_expiry / coi_expiry into individual `ExpiryAlert` entries; filters for 0–30 days; dismissible amber banner above Weekly Revenue Target

**5 — Monthly Revenue Pacing Enhancement (Operations)**
- `Operations.tsx` — added `projected = (revenue / dayOfMo) * daysInMo` calculation; `onPace` uses projected vs goal; added "Projected Month End" stat (green/orange) and "Day X of Y / N days left" combined stat

**6 — Lane Performance Table (Reports)**
- `reports.ts` — `LanePerformanceRow` interface + query: groups completed loads by origin_state / dest_state; `avg_rpm` weighted average (CASE WHEN miles > 0), `best_rpm` (MAX), `total_fee`; ORDER BY avg_rpm DESC NULLS LAST LIMIT 30
- `ReportsData` updated to include `lanePerformance`
- `Reports.tsx` — "Lane Performance" section with RPM color coding (before IFTA)

**7 — Dispatcher Net Summary in LoadDrawer Financials**
- `LoadDrawer.tsx` — summary sub-block after financials grid: Your Earnings (dispatch fee) / Driver Net (gross minus dispatch fee minus all deductions); uses already-loaded `deductions` state — no extra IPC

**8 — Leads Last-Contact Aging Column**
- `LeadsTable.tsx` — `daysSinceContact()` helper (uses `last_contact_date`); `contactAgeCls()` helper (red >= 21d, yellow >= 14d, neutral for terminal statuses); "Last Contact" column added after Follow-Up; displays "today" or "Nd ago" with tooltip

### Files Changed
- `src/components/loads/LoadDrawer.tsx` — Run Sheet PDF + Dispatcher Net summary
- `electron/main/reports.ts` — Invoice aging + Lane performance queries + interfaces
- `src/pages/Reports.tsx` — AR Aging section + Lane Performance section
- `electron/main/schema/migrations.ts` — migration031 + MIGRATIONS array
- `electron/main/repositories/brokerCallLogRepo.ts` (new)
- `electron/main/repositories/index.ts` — brokerCallLogRepo export
- `electron/main/ipcHandlers.ts` — three brokerCallLog handlers
- `electron/preload/index.ts` — brokerCallLog group
- `src/types/global.d.ts` — brokerCallLog type, drivers.compliance, DriverComplianceRow import
- `src/components/brokers/BrokerDrawer.tsx` — Contact Log section
- `src/pages/Dashboard.tsx` — document expiry alert banner
- `src/pages/Operations.tsx` — projected month-end + day counter
- `src/components/leads/LeadsTable.tsx` — Last Contact column
- `docs/HANDOFF.md` — Session 26 entry

### Notes for Next Session
- Run `tsc --noEmit` from `app/` to confirm zero TypeScript errors before next feature work
- `offResult` listener leak in preload (browserImport group) — non-blocking, carried from Session 21
- Next migration will be 032

---

## 2026-03-29 — Session 25: Eight More App Improvements

### Work Completed

Eight improvements across load management, invoicing, settlements, broker intelligence, and tooling.

**1 — Check Call Log in LoadDrawer**
- `LoadDrawer.tsx` — "Check Calls" section added (before Notes); uses existing `window.api.timeline` IPC; filters events by `event_type === 'check_call'`; log-call form with single text input, timestamped list, delete per entry
- No new migration or IPC required

**2 — Deadhead Miles + FSC on Loads (migration 029)**
- Migration 029: `deadhead_miles REAL` and `fuel_surcharge REAL` added to loads via `addColumnIfMissing`
- `models.ts` Load interface updated; `loadsRepo.ts` create/update include new columns
- `LoadModal.tsx` — Loaded Miles / Deadhead Miles / FSC fields in form; BLANK constant updated
- `LoadDrawer.tsx` — Route section shows both loaded and deadhead miles; Financials shows FSC; settlement PDF includes FSC + deductions
- `reports.ts` — broker total_gross includes FSC; IFTA total_miles includes deadhead

**3 — Batch Invoice Actions**
- `invoicesRepo.ts` — `bulkUpdateInvoices(db, ids, status, extraFields)` function
- IPC `invoices:bulkUpdate`, preload + global.d.ts wired
- `InvoicesTable.tsx` — checkbox column (select-all in header, per-row); highlighted selected rows; cell-level clicks to avoid conflict with row click
- `Invoices.tsx` — `selectedIds` Set; bulk bar (Mark Sent / Mark Paid / Reset to Draft / Clear); auto-sets sent_date/paid_date on bulk action

**4 — Driver Deductions (migration 030)**
- Migration 030: `load_deductions` table (id, load_id FK CASCADE, label, amount, created_at) + index
- `loadDeductionsRepo.ts` (new) — list/create/delete
- IPC handlers + preload + global.d.ts
- `LoadDrawer.tsx` — Deductions section for Delivered/Invoiced/Paid loads; label + dollar amount; running total; settlement PDF updated to show each deduction as minus line

**5 — Broker Reliability Score**
- `brokerIntelligence.ts` — `paymentGrade()` helper (A–F from avg_days_to_pay vs payment_terms); `getBrokerIntelAll` joins invoices for actual payment speed; `BrokerIntelRow` extended with `avg_days_to_pay`, `payment_grade`, `invoice_count`
- `models.ts` — `BrokerIntelRow` updated
- `BrokerDrawer.tsx` — payment grade badge (A=green → F=red) with avg days and invoice count

**6 — Quick Rate Calculator**
- `src/components/ui/RateCalculator.tsx` (new) — inputs: miles, RPM, FSC, dispatch %, fuel price, MPG; outputs: gross, total, dispatch fee, driver pay, fuel cost, driver net
- `Sidebar.tsx` — Calculator button above Help/Settings; mounts modal with settingsStore values

**7 — Settings Additions**
- `settingsStore.ts` — `fuelPricePerGallon` added (default 4.00), persisted via electron-store
- `Settings.tsx` — Monthly Revenue Goal field (syncs with Operations `revenueGoal` key); Fuel Price ($/gallon) field; both load on mount

### Files Changed
- `electron/main/schema/migrations.ts` — migrations 029 + 030
- `electron/main/repositories/loadsRepo.ts` — deadhead_miles, fuel_surcharge in create/update
- `electron/main/repositories/loadDeductionsRepo.ts` (new)
- `electron/main/repositories/invoicesRepo.ts` — bulkUpdateInvoices
- `electron/main/repositories/index.ts` — loadDeductionsRepo export
- `electron/main/ipcHandlers.ts` — bulkUpdate, loadDeductions:* handlers
- `electron/main/brokerIntelligence.ts` — payment grade, invoice join
- `electron/main/reports.ts` — FSC in broker summary, deadhead in IFTA
- `electron/preload/index.ts` — bulkUpdate, loadDeductions group
- `src/types/global.d.ts` — bulkUpdate, loadDeductions types
- `src/types/models.ts` — Load (2 new fields), BrokerIntelRow (3 new fields)
- `src/store/settingsStore.ts` — fuelPricePerGallon
- `src/pages/Settings.tsx` — Monthly Revenue Goal + Fuel Price fields
- `src/pages/Invoices.tsx` — batch selection state + bulk bar
- `src/components/loads/LoadModal.tsx` — deadhead + FSC fields
- `src/components/loads/LoadDrawer.tsx` — check calls, deductions, deadhead/FSC display, updated settlement PDF
- `src/components/invoices/InvoicesTable.tsx` — checkbox column + multi-select
- `src/components/brokers/BrokerDrawer.tsx` — payment grade badge
- `src/components/layout/Sidebar.tsx` — Rate Calc button + modal
- `src/components/ui/RateCalculator.tsx` (new)

### Notes for Next Session
- Run `tsc --noEmit` from `app/` to confirm zero TypeScript errors
- `offResult` listener leak in preload (browserImport group) — non-blocking, carried from Session 21
- Fuel price in Rate Calculator pre-fills from `fuelPricePerGallon` setting; also editable inline per session

---

## 2026-03-28 — Session 24: Route Fix + Docs and Task Update

### Work Completed

**1 — Morning Briefing "Find Loads" blank screen fix**
- `src/pages/Operations.tsx` — corrected two route path mismatches in the Morning Briefing `rows` array:
  - `'/find-loads'` changed to `'/findloads'`
  - `'/active-loads'` changed to `'/activeloads'`
- Root cause: React Router found no matching route for the hyphenated paths and silently rendered nothing. All other navigation (Sidebar, OnboardingWizard) already used the correct un-hyphenated paths; the Morning Briefing was the only callsite out of sync.

**2 — Saturday task added to seed (ID 133)**
- `electron/main/seed.ts` — added Saturday-specific daily task for weekend revenue push (load booking + lead follow-up + Facebook posting), with explicit `day_of_week: 'Saturday'` recurrence and actionable notes

**3 — Daily Operations Playbook SOP updated (ID 125)**
- `electron/main/seed.ts` — rewrote the Daily Operations Playbook content to be revenue-first, with a clear priority order: loads before leads before marketing, plus an end-of-month urgency protocol

**4 — HANDOFF.md and SESSION_LOG.md updated**

### Files Changed
- `src/pages/Operations.tsx` — route path fix (2 lines)
- `electron/main/seed.ts` — Saturday task (ID 133), updated Daily Operations Playbook (ID 125)
- `docs/HANDOFF.md` — updated
- `docs/SESSION_LOG.md` — this file

### TypeScript
No structural changes. The Operations.tsx edit is a string value correction only — no type changes.

### Notes for Next Session
- Run `tsc --noEmit` to verify zero errors (not run this session)
- Chris should go to Settings > Reseed Documents to pick up the updated Daily Operations Playbook and new Saturday task in the app
- `offResult` IPC listener leak in `electron/preload/index.ts` carried forward from Session 21 — non-blocking

---

## 2026-03-28 — Session 23: Eight App Improvements

### Work Completed

Eight improvements implemented across invoicing, load management, driver pay history, morning briefing, reporting, and document attachments.

**1 — Auto-flag Overdue Invoices on Startup**
- `invoicesRepo.ts` — `autoFlagOverdueInvoices(db)` flips Sent invoices to Overdue when days since sent_date exceeds broker payment_terms (correlated subquery, default 30d)
- IPC handler `invoices:autoFlag`; preload + global.d.ts wired; called silently in `App.tsx` startup useEffect

**2 — Duplicate Load Button**
- `LoadDrawer.tsx` — `onDuplicate` prop + Copy button in action bar
- `Loads.tsx` — `handleDuplicate()` pre-fills modal with route/broker/driver/trailer/commodity, clears rate/dates, forces status to 'Searching'

**3 — Driver Pay History in DriverDrawer**
- `DriverDrawer.tsx` — last 20 Paid invoices for the driver shown in a Pay History section (invoice number, paid date, dispatch fee, driver gross)

**4 — Stale Load Nudges in Morning Briefing**
- `operations.ts` — SQL finds Booked loads past pickup date and Picked Up/In Transit loads past delivery date
- `models.ts` — `staleLoads` added to `OperationsData`
- `Operations.tsx` — sixth BriefRow with load IDs, status, days past; links to /loads

**5 + 8 — Reports Page (Weekly P&L, Monthly P&L, Broker Performance, IFTA)**
- `electron/main/reports.ts` (new) — `getReportsData(db)` returns 12-week revenue, 6-month revenue, top-20 broker table, per-state mileage, all-time and YTD totals
- `src/pages/Reports.tsx` (new) — KPI strip, horizontal bar charts, broker table, IFTA state grid; types inlined to avoid cross-bundle import
- `Sidebar.tsx` — Reports nav item added; `App.tsx` — `/reports` route added

**6 — Load Calendar View**
- `LoadsToolbar.tsx` — `LoadView` type exported; Calendar button added; "Dispatch Board" → "Dispatch"
- `Loads.tsx` — weekly `LoadCalendar` inline component; blue = pickup, green = delivery; prev/next week nav

**7 — Load Document Attachments**
- Migration 028: `load_attachments` table with FK to loads (CASCADE)
- `loadAttachmentsRepo.ts` (new) — list/create/delete helpers
- IPC handlers for list/create/delete/open/pick; pick uses `dialog.showOpenDialog` + `copyFileSync` to `userData/load-attachments/{loadId}/`
- `LoadDrawer.tsx` — Attachments section with file picker, title input, open/delete per file

### Files Changed
- `electron/main/repositories/invoicesRepo.ts` — `autoFlagOverdueInvoices`
- `electron/main/repositories/loadAttachmentsRepo.ts` (new)
- `electron/main/repositories/index.ts` — loadAttachmentsRepo export
- `electron/main/schema/migrations.ts` — migration 028
- `electron/main/ipcHandlers.ts` — autoFlag, reports:data, loadAttachments:* handlers
- `electron/main/operations.ts` — staleLoads query
- `electron/main/reports.ts` (new)
- `electron/preload/index.ts` — invoices.autoFlag, reports group, loadAttachments group
- `src/types/global.d.ts` — autoFlag, reports, loadAttachments types
- `src/types/models.ts` — staleLoads on OperationsData
- `src/App.tsx` — autoFlag startup call, Reports import + route
- `src/pages/Operations.tsx` — sixth BriefRow (stale loads)
- `src/pages/Reports.tsx` (new)
- `src/pages/Loads.tsx` — handleDuplicate, LoadView state, LoadCalendar component
- `src/components/layout/Sidebar.tsx` — Reports nav item
- `src/components/loads/LoadsToolbar.tsx` — LoadView type, Calendar button
- `src/components/loads/LoadDrawer.tsx` — Duplicate button, Attachments section
- `src/components/drivers/DriverDrawer.tsx` — Pay History section

### Notes for Next Session
- Run `tsc --noEmit` to verify zero TypeScript errors — not run this session
- `offResult` listener leak in `electron/preload/index.ts` (browserImport group) — carried over from Session 21, non-blocking
- IFTA mileage uses destination state as approximation — clearly labeled in UI; GPS per-state tracking not available

---

## 2026-03-28 — Session 22: Six App Improvements

### Work Completed

Six improvements implemented across compliance tracking, revenue, load intelligence, and invoicing.

**1 — Driver Medical Card Expiry (migration 027)**
- Migration 027 adds `medical_card_expiry TEXT` to `drivers` via `addColumnIfMissing()`
- `Driver` + `DriverComplianceRow` interfaces updated
- `driversRepo.ts` — field included in create, update, and getDriverCompliance
- `operations.ts` — Medical Card added to `expiringDocs` UNION ALL (60-day lookahead, Active drivers only)
- `DriverModal.tsx` — Medical Card Expiry date field added
- `DriverDrawer.tsx` — display row with orange warning when expiring
- `DriversTable.tsx` — Med. Card column with ExpCell

**2 — Morning Briefing Compliance Row**
- `Operations.tsx` — fifth BriefRow shows compliance doc status; links to /drivers

**3 — Smart Rate Floor / Broker Avg RPM on Find Loads**
- `FindLoads.tsx` — parallel fetch of brokers + loads; `buildBrokerIntel()` derives name-keyed Map
- `BrokerIntelBadge` displays avg RPM, load count, flag on load cards
- No backend changes; pure frontend computation

**4 — Rate Confirmation PDF**
- `LoadDrawer.tsx` — `printRateConfirmation()` — letterhead, route, parties, gross rate, dispatch fee
- Shown for Booked/Picked Up/In Transit loads

**5 — Driver Settlement Statement PDF**
- `LoadDrawer.tsx` — `printSettlement()` — gross rate minus fee = driver net, signature line
- Shown for Delivered/Invoiced/Paid loads

**6 — Invoice Follow-Up Email Template**
- `InvoiceDrawer.tsx` — `followUpMode` state; `daysOverdue` from sent date minus broker payment_terms (default 30)
- Assertive follow-up body with days overdue, amounts, and clear payment request
- "Follow-up (Nd)" button in action bar for Sent/Overdue invoices
- Invoice/Follow-up tabs in email panel; `activeSubject`/`activeBody` drive the mailto href

**Discovered already built — no changes needed:**
- Weekly revenue goal (`Operations.tsx`)
- Invoice aging display (`InvoicesTable.tsx` — `effectiveStatus()` + `agingLabel()`)

### Files Changed
- `electron/main/schema/migrations.ts` — migration 027
- `src/types/models.ts` — `medical_card_expiry` on Driver + DriverComplianceRow
- `electron/main/repositories/driversRepo.ts` — create/update/getDriverCompliance
- `electron/main/operations.ts` — expiringDocs Medical Card UNION branch
- `src/components/drivers/DriverModal.tsx` — Medical Card Expiry field
- `src/components/drivers/DriverDrawer.tsx` — Medical Card Expiry display
- `src/components/drivers/DriversTable.tsx` — Med. Card column
- `src/pages/Operations.tsx` — compliance BriefRow
- `src/pages/FindLoads.tsx` — broker intel fetch, BrokerIntelBadge, updated card components
- `src/components/loads/LoadDrawer.tsx` — rate confirmation + settlement PDF, broker payer score
- `src/components/loads/LoadModal.tsx` — prefill prop
- `src/pages/Loads.tsx` — prefill wiring
- `src/pages/Invoices.tsx` — uninvoiced delivered loads banner
- `src/components/invoices/InvoiceDrawer.tsx` — follow-up email template
- `docs/HANDOFF.md` — updated
- `docs/SESSION_LOG.md` — updated

### TypeScript
Not re-verified this session (no tsc run available). Changes follow established patterns; no new dependencies or structural changes introduced.

### Pending
None. All six items complete.

---

## 2026-03-27 — Session 21: Browser Import IPC Fix

### Work Completed

Fixed the browser import delivery path so data POSTed by Claude in Chrome to `localhost:3001` reliably reaches the Find Loads renderer. Live end-to-end test passed: POST returned `{ok:true, count:1}`, result appeared in Find Loads within 2 seconds.

**Root cause:** Electron renderer's `fetch()` to `http://localhost:3001` silently fails (CSP / cross-origin). `webContents.send` IPC push also not reaching renderer (cause unknown without DevTools access). Both failure modes bypass the `catch` block, so there was no visible error.

**Fix:** Added `loads:getLastBrowserImport` IPC invoke channel. Renderer polls via `window.api.loads.getLastBrowserImport()` every 2 seconds using the same invoke path used by all other `window.api.*` calls. Seq-based deduplication (`lastSeqRef`) prevents re-rendering on unchanged data.

### Files Changed
- `electron/main/webServer.ts` — exported `getLastBrowserImport(): { seq, payload }`
- `electron/main/ipcHandlers.ts` — imported and registered `ipcMain.handle('loads:getLastBrowserImport', ...)`
- `electron/preload/index.ts` — exposed `getLastBrowserImport` under `loads` contextBridge group
- `src/types/global.d.ts` — typed `window.api.loads.getLastBrowserImport`
- `src/pages/FindLoads.tsx` — replaced `fetch()` poll with `window.api.loads.getLastBrowserImport()` poll
- `docs/HANDOFF.md` — updated
- `docs/SESSION_LOG.md` — updated

### TypeScript
`tsc --noEmit` passes with zero errors after all changes.

### Known Issues Carried Forward
- `offResult` in `preload/index.ts` creates a new anonymous function wrapper on each call, so `ipcRenderer.removeListener` never fires. The `loads:browser-import` push listener leaks on page unmount. Non-blocking — polling is the active mechanism.

---

## 2026-03-16 — Session 20: Audit Fixes Continued

### Work Completed

Completed the remaining audit fixes from the Session 18 comprehensive audit. All changes pass `tsc --noEmit` with zero errors. 18 migrations total (017 + 018 added this session).

**CAT-A — Audit log writes (all 5 entity repos):**
- `logAudit()` calls added to create/update/delete in: `loadsRepo.ts`, `invoicesRepo.ts`, `brokersRepo.ts`, `driversRepo.ts`, `leadsRepo.ts`
- `deleteLoad()` now guards against deleting a load with status Booked/Picked Up/In Transit (throws `Error` with message explaining why)
- All delete functions now fetch the existing row first to capture old values for the audit entry
- User ID hardcoded to 1 (single admin user) — appropriate for local single-user app

**H-8 + migrations 017/018:**
- Migration 017: `broker_id INTEGER REFERENCES brokers(id) ON DELETE SET NULL` added to `invoices` table
- Migration 018: `trailer_type TEXT` added to `loads` table
- Both use the existing `addColumnIfMissing()` helper — safe to run on databases with existing data

**H-3 — BrokerDrawer production fix + scoring deduplication:**
- Root cause: `BrokerDrawer.tsx` was calling `window.api.db.query()` which is gated behind `!app.isPackaged` in the main process — silently returns nothing in packaged/production builds
- Fix: replaced with `window.api.loads.list()` filtered client-side by `broker_id`
- Added `window.api.intel.allBrokers()` to the `useEffect` Promise.all; broker's rating now comes directly from the intelligence service instead of a duplicated inline IIFE
- Removed ~15-line IIFE that replicated exact scoring logic from `brokerIntelligence.ts`
- `INTEL_RATING_STYLE` moved to module level and typed as `Record<BrokerRating, string>`

**M-8 — Shared interfaces exported from models.ts:**
- `OperationsData`, `DriverOpportunity`, `LeadHeat`, `GroupPerformance`, `BrokerLane`, `ProfitRadarData` added to `src/types/models.ts`
- `Operations.tsx` updated to import them — local copies removed; `ScoredLead` and `NextAction` stay local as they are page-specific

**M-9 — Content-Security-Policy header:**
- `electron/main/index.ts`: `session.defaultSession.webRequest.onHeadersReceived` injects a CSP header — gated behind `app.isPackaged` so it does not run in dev mode (Vite HMR uses inline scripts + WebSocket which strict CSP blocks)
- Policy: `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; object-src 'none'`
- `'unsafe-inline'` required for `style-src` due to Tailwind CSS utility classes

### Files Changed
- `electron/main/repositories/loadsRepo.ts`
- `electron/main/repositories/invoicesRepo.ts`
- `electron/main/repositories/brokersRepo.ts`
- `electron/main/repositories/driversRepo.ts`
- `electron/main/repositories/leadsRepo.ts`
- `electron/main/schema/migrations.ts` (migrations 017, 018)
- `electron/main/index.ts` (CSP + session import)
- `src/components/brokers/BrokerDrawer.tsx`
- `src/types/models.ts`
- `src/pages/Operations.tsx`

### Skipped / Deferred
- M-7: auto-update `marketing_groups.last_posted_at` on post log create — requires reading Marketing.tsx post-save flow; deferred
- M-1: split `ipcHandlers.ts` into domain files — too large a structural refactor for this session
- H-1: `sandbox: false` → `sandbox: true` — intentionally deferred; preload uses `contextBridge` + `ipcRenderer` only but was flagged as risky without test coverage
- L-1/L-2/L-3: README + ARCHITECTURE + DECISIONS doc updates for sessions 16-20 — deferred to dedicated doc-sweep session

---

## 2026-03-16 — Session 19: Audit Fixes

### Work Completed

Applied all Critical + High + selected Medium/Low fixes from the full application audit delivered in Session 18. All 10 changes pass `tsc --noEmit` with zero errors.

**H-5 — Lane intel status filter (`brokerIntelligence.ts`):**
- `getLaneIntelAll` was including Booked/Picked Up/In Transit loads in avgRpm — unconfirmed revenue
- Fixed to `Delivered/Invoiced/Paid` only — lane strength now reflects actual completed loads

**H-7 — `shell:openExternal` URL validation (`ipcHandlers.ts`):**
- Handler now parses the URL with `new URL()` and restricts protocol to `https:`, `http:`, `mailto:`
- Silently returns on invalid URLs or disallowed protocols

**H-2 — `db:query` SELECT-only guard (`ipcHandlers.ts`):**
- Dev-only IPC channel now rejects any SQL that does not begin with `SELECT`
- Returns `{ data: null, error: '...' }` instead of executing writes

**H-4 — React ErrorBoundary (`App.tsx`):**
- Class-based `ErrorBoundary` wraps the entire app above `HashRouter`
- Catches React render errors; shows minimal error screen with message + Reload button instead of blank white window

**H-6 — Migration transaction wrapping (`schema/migrations.ts`):**
- All migration `up()` calls now execute inside `db.transaction(() => m.up(db))()`
- Failed migrations now roll back atomically; no more partial schema states on error

**CAT-C — Remove scheduler stubs (`scheduler.ts`):**
- `runDailyBriefing` and `runMarketingQueue` stub functions removed entirely
- `JOBS` array reduced to just `fmcsa-scraper`; `JobName` type narrowed accordingly
- These jobs will be added back when actually implemented

**L-5 — Type declarations + remove `as any` (`global.d.ts`, `Settings.tsx`):**
- `global.d.ts`: added `backfillLeadData()` to `leads` namespace; added `reseedDocs()` to `dev` namespace
- `Settings.tsx`: both `(window.api.dev as any).reseedDocs()` and `(window.api.leads as any).backfillLeadData()` casts removed

**M-6 — Rename `total_revenue` → `gross_rate` in `LoadRecommendation`:**
- `LoadRecommendation.total_revenue` was the load's single gross rate, not total revenue across multiple loads
- Renamed to `gross_rate` in `models.ts` and `loadScanner.ts`

**CAT-B / M-2 — Business Information editable; remove hardcoded identity:**
- `settingsStore.ts`: initial state defaults and `loadFromStore` fallbacks changed from `'Chris Hooks'` / `'dispatch@ontrackhaulingsolutions.com'` to empty strings
- `Settings.tsx` Business Information section: converted from read-only `ReadField` display to four editable inputs (Company Name, Owner Name, Email, Default Dispatch %) with a Save button
- Save calls `persistSetting` for each field then re-runs `loadFromStore` to sync Zustand state

**L-4 — Inline confirm for Remove Sample Data (`Settings.tsx`):**
- Replaced `window.confirm()` with inline two-step confirm (Confirm/Cancel buttons) matching the existing Backup Restore UI pattern

### Files Modified (10)
- `electron/main/brokerIntelligence.ts`
- `electron/main/ipcHandlers.ts`
- `electron/main/schema/migrations.ts`
- `electron/main/scheduler.ts`
- `electron/main/loadScanner.ts`
- `src/types/models.ts`
- `src/types/global.d.ts`
- `src/App.tsx`
- `src/store/settingsStore.ts`
- `src/pages/Settings.tsx`

### Build Status
`tsc --noEmit` — exit 0, zero errors

---

## 2026-03-16 — Session 18: Broker Intelligence + Lane Memory

### Work Completed

**New `brokerIntelligence.ts` service (main process):**
- No schema changes — all data derived from existing `brokers`, `loads`, `drivers` tables
- `getBrokerIntelAll(db)`: per-broker score (0–100) + BrokerRating (Preferred/Strong/Neutral/Caution/Avoid) + caution_note; scoring: base 50 + RPM adjustment (±20 pts) + volume bonus (up to +15 for 5+ loads) + flag modifiers
- `getLaneIntelAll(db)`: aggregate by origin_state/dest_state across Booked+ loads; LaneStrength (Strong/Average/Weak) based on avgRpm and loads count
- `getDriverLaneFits(db, driverId)`: per-driver lane history; DriverLaneFit (Strong Fit/Has History/New Lane) based on run count and avg RPM

**3 new IPC handlers:** `intel:allBrokers`, `intel:allLanes`, `intel:driverFit`

**Types added:**
- `models.ts`: `BrokerRating`, `LaneStrength`, `DriverLaneFit`, `BrokerIntelRow`, `LaneIntelRow`, `DriverLaneFitRow`
- `global.d.ts`: imported new types + `intel` namespace added to `Window.api`

**LoadMatch.tsx updates:**
- Intel fetched on mount (`allBrokers`, `allLanes`) + on driver select (`driverFit`)
- Load cards show intel chips: broker rating + lane strength + driver fit
- Booking workspace adds "Intelligence" section — broker intel (rating, history, caution note), lane intel (strength, avg RPM, run count), driver fit (fit label, run count, avg RPM); section hidden when no intel data exists for the selected load

**BrokerDrawer.tsx updates:**
- Performance section header shows intel rating badge — computed client-side from already-fetched `completedLoads`, `avgRpm`, `broker.flag`; no new IPC call required

**Operations.tsx updates:**
- Top Broker Lanes in Profit Radar now include lane strength label (Strong/Average/Weak) computed client-side from existing `avgRpm` + `loads` data; no new data fetch

### Files Created (1)
- `electron/main/brokerIntelligence.ts`

### Files Modified (7)
- `electron/main/ipcHandlers.ts` — import + 3 new handlers
- `electron/preload/index.ts` — `intel` namespace
- `src/types/models.ts` — 6 new types
- `src/types/global.d.ts` — imported new types + `intel` in `Window.api`
- `src/pages/LoadMatch.tsx` — intel state + chips + Intelligence Context panel
- `src/components/brokers/BrokerDrawer.tsx` — rating badge in Performance section
- `src/pages/Operations.tsx` — lane strength labels in Profit Radar top lanes

### App State at End of Session
- Broker Intelligence: all brokers scored and rated; surfaces in LoadMatch, BrokerDrawer, Operations
- Lane Memory: all lanes classified; surfaces in LoadMatch + Operations Profit Radar
- Driver-Lane Fit: per-driver lane history; surfaces in LoadMatch load cards + booking workspace
- No schema migrations required (all derived data)
- Build: clean (`tsc --noEmit` exit 0)

---

## 2026-03-16 — Session 17: Active Load Timeline + Check Call Engine

### Work Completed

**Duplicate marketing_groups fix:**
- Identified root cause: no UNIQUE constraint on `name`, so `INSERT OR IGNORE` silently inserted duplicates on every HTML import or seed run
- Migration 015: `DELETE FROM marketing_groups WHERE id NOT IN (SELECT MIN(id) FROM ... GROUP BY LOWER(TRIM(name)))` purges all existing duplicates, then `CREATE UNIQUE INDEX uq_marketing_groups_name ON marketing_groups (LOWER(TRIM(name)))` prevents future ones
- `createMarketingGroup()` in `marketingRepo.ts` updated to `INSERT OR IGNORE`; returns existing row if name collides

**Active Load Timeline (new table + service):**
- Migration 016: `load_timeline_events` table with `id, load_id, event_type, label, scheduled_at, completed_at, notes, created_at`; ON DELETE CASCADE on load_id
- `loadTimelineRepo.ts`: full CRUD + auto-scheduling engine + `getActiveLoads()` + `getUpcomingCheckCalls()`
- Auto-scheduling (idempotent, checks existing labels before inserting):
  - Booked → Driver Dispatched check_call (+1h) + Pickup Check Call (pickup day 08:00)
  - Picked Up → Mid-Route Check Call (midpoint) + Delivery ETA Confirm (delivery day 10:00)
  - In Transit → Delivery ETA Confirm (delivery day 10:00)
  - Delivered → POD Request check_call (+30min)

**10 new IPC handlers:**
- `timeline:activeLoads`, `timeline:upcomingCalls`, `timeline:events`, `timeline:addEvent`, `timeline:completeEvent`, `timeline:deleteEvent`, `timeline:statusChange`, `timeline:initLoad`, `timeline:generateMessage` (async Claude Haiku, 4 message types)

**ActiveLoads page (`/activeloads`):**
- Left: scrollable list of Booked/Picked Up/In Transit loads with status badge, route, driver, next event time (overdue = red)
- Right: load header + Next Action panel + Timeline + Status Update form + AI Message Helpers
- Next Action: surfaces first pending event; "Mark Done" action; Call Driver tel: link
- Timeline: pending events first, completed below divider; hover reveals Done/delete; inline note input
- Status Update: "Mark as [NextStatus]" + "Mark Delivered" shortcut; optional note + confirm
- AI Messages: Driver Check-In, Broker Update, POD Request, Delivery Confirm — generated text with Copy

**Operations panel integration:**
- `upcomingCalls` state added; fires independently after main data load
- "Upcoming Check Calls" grid section between KPI strip and Profit Radar — only shown when active events exist; overdue = red; each card navigates to `/activeloads`

**Sidebar:** Active Loads 3rd nav item (Activity icon)

### Files Created (2)
- `electron/main/repositories/loadTimelineRepo.ts`
- `src/pages/ActiveLoads.tsx`

### Files Modified (9)
- `electron/main/schema/migrations.ts` — migration 015 + 016
- `electron/main/ipcHandlers.ts` — timeline import + 10 handlers
- `electron/preload/index.ts` — timeline namespace
- `src/types/models.ts` — TimelineEvent, ActiveLoadRow, CheckCallRow
- `src/types/global.d.ts` — timeline in Window.api
- `src/components/layout/Sidebar.tsx` — Active Loads nav item
- `src/App.tsx` — ActiveLoads import + route
- `src/pages/Operations.tsx` — checkCalls state + fetch + Upcoming Check Calls UI
- `electron/main/repositories/marketingRepo.ts` — INSERT OR IGNORE for dedup

### App State at End of Session
- Active Load Timeline: fully operational; auto-scheduling, manual status updates, AI messages all wired
- Upcoming Check Calls: visible on Operations panel when active loads have pending check calls
- Duplicate marketing_groups: purged on next launch, prevented going forward
- All previous pages unchanged and operational
- Build: clean (`tsc --noEmit` exit 0)

---

## 2026-03-16 — Session 16: Load Match + Booking Workspace

### Work Completed

**Load Match page (new guided dispatch workflow at `/loadmatch`):**
- Three-panel layout: drivers (left) — candidate loads (center) — booking workspace (right)
- Reuses existing `scanner.recommendLoads()` and `dispatcher.assignLoad()` — no new DB queries
- Deep-link entry from Operations Profit Radar: idle driver rows navigate to `/loadmatch?driverId=X`; selected driver is auto-set on arrival

**Left panel — Available Drivers:**
- Calls `window.api.scanner.recommendLoads({})` on mount; lists all Active drivers with no current load
- Shows driver name, home base, number of loads matched; selected driver highlighted with orange left border

**Center panel — Candidate Loads:**
- Displays the selected driver's scored load recommendations from `loadScanner.ts`
- Scoring formula (existing): `RPM * 2.0 - deadheadMiles * 0.005`; deadhead estimated by state (same city=10mi, same state=75mi, cross-state=250mi)
- Each card: rank badge, origin→dest, rate, RPM (green ≥ $3.00, orange ≥ $2.50, red below), loaded miles, deadhead, broker name + flag color, pickup date, Strong/Good/Fair/Weak score badge
- Selecting a load opens the right panel workspace

**Right panel — Booking Workspace:**
- Load summary: origin→dest, rate, RPM, driver name
- 6-step booking checklist: Verify broker / Confirm pickup / Agree on rate / Get rate confirmation / Log load / Notify driver — each step toggleable; progress bar shows completion percentage
- Rate analysis table: always visible (rate, RPM color-coded, loaded miles, deadhead)
- Deterministic negotiation opener: computed immediately from RPM vs $2.50/mi floor — if RPM < $2.50, suggests counter-offer with specific dollar amount; otherwise, sends acceptance script
- "AI Script" button: calls `loadMatch:nego` IPC → Claude Haiku for a 2-sentence rate assessment + word-for-word broker opener; appears in an orange-bordered box below deterministic opener; fails gracefully if no API key
- Book Load button: calls `dispatcher.assignLoad()`; glows brighter when all 6 checklist steps are checked; shows error message on failure; success screen shows driver name + "Book another load" / "Back to Operations" options

**New IPC handler:**
- `loadMatch:nego` in `ipcHandlers.ts` — accepts rate/miles/rpm/deadheadMiles/origin/dest/brokerName/driverName; calls `claudeComplete()` with Claude Haiku; returns null if API key absent (deterministic fallback shown in UI)

**Type declarations fixed:**
- `global.d.ts`: Added `operations`, `profitRadar`, and `loadMatch` to `Window.api` interface (the first two were added in Session 15 but missing from the type file)

### Files Created (1)
- `src/pages/LoadMatch.tsx`

### Files Modified (6)
- `electron/main/ipcHandlers.ts` — `loadMatch:nego` handler added
- `electron/preload/index.ts` — `loadMatch` namespace exposed
- `src/types/global.d.ts` — `operations`, `profitRadar`, `loadMatch` types added
- `src/components/layout/Sidebar.tsx` — Load Match 2nd nav item, `ArrowRightLeft` icon
- `src/App.tsx` — `LoadMatch` import + `/loadmatch` route
- `src/pages/Operations.tsx` — idle driver `onClick` changed to `/loadmatch?driverId=X`

### App State at End of Session
- Load Match: fully operational; driver selection, scored load matching, booking checklist, negotiation support, Book Load all working
- Profit Radar idle driver rows: clicking any driver now opens Load Match pre-selected on that driver
- All previous pages unchanged and operational
- Build: clean (`tsc --noEmit` exit 0)

---

## 2026-03-16 — Session 15: Operations Control Panel + Profit Radar

### Work Completed

**Operations Control Panel (new default landing page):**
- Merged Dashboard and Operations pages into a single `Operations.tsx` page
- Route `/operations` is now the app default; `/dashboard` redirects to it
- Dashboard removed from sidebar; Operations added as first nav item with Zap icon
- Page sections (top to bottom): KPI briefing strip, Profit Radar, Next Actions + Revenue Opportunities, Daily Checklist + Mini Dispatch Board, Top Leads
- KPI strip extended to 6 cards: FB Inquiries, Loads In Transit, Drivers Available, Overdue Leads, Groups to Post, Open Invoices
- `operations.ts` updated to include `loadsInTransit` count

**Profit Radar (new embedded feature):**
- `profitRadar.ts` — pure data service with four opportunity streams:
  - **Idle Drivers**: Active with no current load; scored 50 base + 20 for known location + 10 for truck type + 5 for home base
  - **FB Lead Heat**: Conversations in active stages (Call Ready=90, Interested=70, Replied=40, New=20) + 25 for overdue follow-up; deterministic `nextAction` per stage
  - **Top Groups**: Ranked by `leads_generated_count * 15 + signed_drivers_count * 25` + priority bonus
  - **Top Broker Lanes**: Aggregate avg RPM from loads table, minimum 2 loads per lane, top 5 by RPM
- `getProfitRadarSummary()` async function: builds concise data brief, calls Claude Haiku with 180 max tokens, returns null if API key not set or call fails
- IPC: `profitRadar:data` (sync) + `profitRadar:summary` (async)
- Preload: `window.api.profitRadar.data()` + `.summary()`
- UI: three-column grid (Idle Drivers | FB Lead Heat | Top Groups) with score badges and click-nav to relevant page; optional broker lanes row at bottom; AI summary strip loads independently after main data (does not block render)

### Files Created (3)
- `electron/main/operations.ts`
- `electron/main/profitRadar.ts`
- `src/pages/Operations.tsx`

### Files Modified (4)
- `electron/main/ipcHandlers.ts` — three new handlers; two new imports
- `electron/preload/index.ts` — `operations` + `profitRadar` namespaces
- `src/components/layout/Sidebar.tsx` — Operations first; Dashboard removed; Zap icon
- `src/App.tsx` — new route; redirect for `/dashboard`

### App State at End of Session
- Operations Control Panel: fully operational; all four data sources wired
- Profit Radar: data service clean; AI summary requires Claude API key in Settings
- All previous pages unchanged and operational
- Build: clean (`tsc --noEmit` exit 0)

---

## 2026-03-15 — Session 14: Marketing Rebuild + FMCSA Improvements + SAFER Links + Docs Sweep + Glossary

### Work Completed

**Marketing tab -- complete rebuild (daily execution system):**
- Migration 009: `marketing_post_log` table (template_id, category, used_date, groups_posted_to JSON, replies_count, leads_generated, notes); `truck_type_tags`, `region_tags`, `active` columns added to `marketing_groups`
- `marketingRepo.ts` rewritten: `updateMarketingGroup`, `listPostLog`, `createPostLog`, `updatePostLog`, `deletePostLog`, `getRecentlyUsedTemplateIds`, `getTemplateUsageCounts`
- 6 new IPC handlers + preload wiring for post log and group update
- `src/lib/marketingUtils.ts` (new): `selectSuggestedTemplate()` (anti-repetition scoring), `generateVariation()` (OPENING_VARIANTS + CTA_VARIANTS), `IMAGE_PROMPTS` (11 categories), `suggestGroupsForPost()`, daily task localStorage helpers
- `Marketing.tsx` complete rewrite: daily checklist, suggested post card with variation/skip/mark-used, LogForm, post history tab, group manager tab with inline edit, template library tab with use counts

**Marketing bug fixes (self-fixed by user in marketingUtils.ts):**
- Expanded `OPENING_VARIANTS` to cover all 11 `PostCategory` values (was 5)
- Removed `isCtaLine` conditional — CTA always replaced unconditionally

**FMCSA SAFER hyperlinks:**
- `src/lib/saferUrl.ts` (new): `saferMcUrl(mc)` and `saferDotUrl(dot)` build SAFER CompanySnapshot URLs
- Wired into: LeadsTable, LeadDrawer, DriversTable, DriverDrawer, BrokersTable, BrokerDrawer, Dashboard
- `window.api.shell.openExternal()` opens links in system browser

**FMCSA scraper improvements:**
- `fmcsaApi.ts`: pagination via `start` offset parameter (3 pages x 50 = up to 150/term), 200ms between pages, early stop when page < 50 results
- `fmcsaImport.ts`: `onlyNewAuthorities = true` parameter; skips carriers with authority date outside 30-180 days
- `DEFAULT_SEARCH_TERMS` updated: TX, GA, IL, TN, OH, FL, IN, PA (top US freight-volume corridor states)

**Industry terms glossary (new feature):**
- `src/data/industryTerms.ts` (new): 60+ terms, 6 categories (Documents, Equipment, Regulatory, Dispatch, Rates & Freight, Business), plain-English definitions
- `Help.tsx` updated: Articles / Glossary tab switcher; Glossary tab: search box, category filter pills, alphabetical `TermCard` list with category color badges

**Documentation sweep (complete):**
- `docs/ROADMAP.md`: full rewrite, all Phase 1+2 complete, Phase 3 documented
- `docs/PROJECT_MAP.md`: full directory tree, complete IPC namespace table
- `docs/FEATURE_REGISTRY.md`: all 21 features with current status and key files
- `docs/ARCHITECTURE.md`: full IPC channel table, full directory tree, updated schema section
- `docs/DATA_ARCHITECTURE.md`: 15 tables, all 9 migrations, all repos, updated seed function list
- `docs/DECISIONS.md`: DEC-009 through DEC-013 added
- `README.md`: FMCSA section updated, Marketing added to features table

### Files Created (3)
- src/data/industryTerms.ts
- src/lib/saferUrl.ts
- src/lib/marketingUtils.ts

### Files Modified (18+)
- src/pages/Help.tsx, src/pages/Marketing.tsx
- electron/main/repositories/marketingRepo.ts
- electron/main/schema/migrations.ts
- electron/main/ipcHandlers.ts, electron/preload/index.ts
- electron/main/fmcsaApi.ts, electron/main/fmcsaImport.ts
- src/components/leads/LeadDrawer.tsx, LeadsTable.tsx, LeadModal.tsx
- src/components/drivers/DriverDrawer.tsx, DriversTable.tsx
- src/components/brokers/BrokerDrawer.tsx, BrokersTable.tsx
- src/pages/Dashboard.tsx
- docs/ROADMAP.md, PROJECT_MAP.md, FEATURE_REGISTRY.md, ARCHITECTURE.md, DATA_ARCHITECTURE.md, DECISIONS.md, README.md

### App State at End of Session
- Marketing: fully operational daily execution system (post selection, variations, logging, groups)
- Help: Glossary tab with 60+ searchable industry terms
- SAFER links: live on all MC# and DOT# fields across the app
- FMCSA scraper: targets new authorities 30-180 days old in high-volume freight zones
- All docs: current as of 2026-03-15
- Build: clean

---

## 2026-03-14 — Session 13: Document Library Expansion + Marketing Template Overhaul

### Work Completed

**Document Library — reseedDocuments():**
- `seed.ts`: added `reseedDocuments(db)` — uses INSERT OR REPLACE so it overwrites existing docs 101-108 and adds new docs 109-120
- 20 total documents covering the full business operation at a depth where a novice could follow them
- Docs 101-108 fully rewritten (from short stubs to 400-600 word SOPs): Load Booking SOP, Driver Onboarding Checklist, Invoice Submission Process, Broker Packet Requirements, Driver Safety Compliance, Facebook Driver Search SOP, Warm Lead Follow-Up Script, FMCSA Lead Review Checklist
- New docs 109-120: What Is Freight Dispatch (Reference), Trucking Industry Glossary (Reference), How to Find Loads — Load Board Guide (Reference), Rate Negotiation Guide (SOP), Cold Call Script — First Driver Contact (SOP), Daily Dispatch Routine (SOP), Breakdown and Emergency Procedures (SOP), How to Vet a New Broker (SOP), Explaining Your Dispatch Fee (Training), Reading a Rate Confirmation (Training), Driver Communication Standards (Policy), New Driver Pitch — Converting Leads to Signed (SOP)
- IPC: `dev:reseedDocs` → `reseedDocuments(getDb())`
- Preload: `window.api.dev.reseedDocs()`
- Settings: "Rebuild Document Library" green button with busy/success state

**Marketing Templates — complete rewrite:**
- `src/lib/postTemplates.ts` fully rewritten
- 78 templates total (up from 45) — 2.5 months of unique daily posts before repeat
- 5 new truck-type categories: Dry Van (8), Reefer (7), Flatbed (8), Step Deck (6), Hotshot (6)
- Existing 6 categories retained and rewritten: Driver Recruitment (10), Value Prop (8), Engagement (8), New Authority (7), Trust (5), Freight Market (5)
- All 78 templates: no emojis, no bullet lists with symbols, natural first-person conversational tone
- `CATEGORY_COLORS` expanded with colors for all 5 new truck types
- `Marketing.tsx` `CATEGORY_FILTER_OPTIONS` updated — truck types appear first in filter row

**Project Standards:**
- `CLAUDE.md`: added "Content and Copy Rules — Never Violate" section; no-emoji rule is now a permanent project constraint alongside Git rules

### Files Modified (7)
- electron/main/seed.ts
- electron/main/ipcHandlers.ts
- electron/preload/index.ts
- src/pages/Settings.tsx
- src/lib/postTemplates.ts
- src/pages/Marketing.tsx
- CLAUDE.md

### App State at End of Session
- Documents page: 20 fully-written operational documents after running Rebuild Document Library
- Marketing tab: 78 templates across 11 categories, no emojis, truck-type filters live
- All other modules unchanged and operational
- Build: clean

---

## 2026-03-14 — Session 12: Auth Sort Fix + Fleet Size + Priority + Invoice Delete + Marketing Tab

### Work Completed

**Auth age sort fix (Leads.tsx):**
- Ascending "Auth Age" sort now means newest (least aged) first — special-cased `authority_date` sort to invert comparison direction so 9mo < 11mo < 1yr in ascending order

**Fleet size + priority:**
- Migration 007: `fleet_size INTEGER` added to leads table
- `fmcsaApi.ts`: SAFER scraper extracts Power Units via regex
- `fmcsaImport.ts`: `computePriority(authorityDate, fleetSize)` — High = 30-180 days AND 1-3 trucks; Medium = one condition; Low = neither; INSERT includes fleet_size and computed priority
- `leadsRepo.ts`: `createLead` and `updateLead` both include fleet_size in SQL
- `models.ts`: `fleet_size` on Lead interface; `CreateLeadDto` omits only dot_number (fleet_size is editable)
- `LeadModal.tsx`: Fleet Size number input
- `LeadsTable.tsx`: fleet size displayed under lead name
- `LeadDrawer.tsx`: Fleet Size row in Contact section

**Backfill (Settings):**
- `backfillLeadData(db)` in `fmcsaImport.ts`: Phase 1 instant SQL re-prioritize all FMCSA leads, Phase 2 SAFER scrape for leads missing fleet_size (150ms delay)
- "Re-enrich & Re-prioritize" button in Settings > Integrations

**Invoice delete:**
- `deleteInvoice` added to `invoicesRepo.ts`
- `InvoiceDrawer.tsx`: Trash2 icon with two-step confirm (matching LeadDrawer pattern)
- `Invoices.tsx`: `handleDelete` wired, closes drawer on success

**Marketing tab (new page):**
- `src/lib/postTemplates.ts`: 45 templates, 6 categories, date-seeded rotation, renderTemplate, CATEGORY_COLORS
- `src/pages/Marketing.tsx`: Today's Post card, category filters, prev/next cycling, copy, Add to Today's Tasks, Group Rotation tracker
- `electron/main/repositories/marketingRepo.ts`: listMarketingGroups, createMarketingGroup, markGroupPosted, deleteMarketingGroup
- Migration 008: marketing_groups table
- IPC + preload: full marketing.groups API

### Files Modified/Created (18)
- src/pages/Leads.tsx, src/lib/postTemplates.ts, src/pages/Marketing.tsx (new)
- electron/main/fmcsaApi.ts, electron/main/fmcsaImport.ts
- electron/main/schema/migrations.ts, electron/main/repositories/leadsRepo.ts
- electron/main/repositories/invoicesRepo.ts, electron/main/repositories/marketingRepo.ts (new)
- electron/main/repositories/index.ts, electron/main/ipcHandlers.ts
- electron/preload/index.ts, src/types/models.ts
- src/components/leads/LeadModal.tsx, LeadsTable.tsx, LeadDrawer.tsx
- src/components/invoices/InvoiceDrawer.tsx, src/pages/Invoices.tsx, src/pages/Settings.tsx

### App State at End of Session
- Leads: auth age sort correct; fleet size displayed and editable; backfill available in Settings
- Invoices: delete with two-step confirm working
- Marketing: fully operational — daily templates, group tracker, task integration
- Build: clean

---

## 2026-03-14 — Session 11: Seed Cleanup + Sample Data Controls

### Work Completed

**seed.ts — three new exported functions:**
- `seedTasksAndDocsOnly(db)` — wraps existing internal `seedTasks()` + `seedDocuments()` in a transaction; INSERT OR IGNORE covers all 18 tasks and 8 documents; never touches brokers/drivers/loads/leads/invoices
- `clearNonTaskSeedData(db)` — deletes id >= 101 from notes, driver_documents, invoices, loads, leads, drivers, brokers (in dependency order); leaves tasks, task_completions, and documents completely untouched
- `seedMissingItems(db)` (from Session 10) — still present; covers tasks 111-118 + docs 106-108

**IPC (ipcHandlers.ts):**
- `dev:seedTasksOnly` → `seedTasksAndDocsOnly(getDb())`
- `dev:clearSeedData` → `clearNonTaskSeedData(getDb())`

**Preload + Types:**
- `window.api.dev.seedTasksOnly()` and `.clearSeedData()` exposed and typed

**Settings page — Sample Data section redesigned:**
- Two-card side-by-side grid layout
- "Load Task Templates" (orange) — calls `seedTasksOnly`; description clearly scoped to tasks and SOPs only
- "Remove Sample Data" (red) — calls `clearSeedData` with `window.confirm` guard; description says tasks + documents are not affected
- `clearBusy` state added; both buttons disabled while either operation is in flight
- `handleSeedData` now calls only `seedTasksOnly` (not the old `seed()` + `seedMissing()` chain)

### Files Modified (5)
- electron/main/seed.ts
- electron/main/ipcHandlers.ts
- electron/preload/index.ts
- src/types/global.d.ts
- src/pages/Settings.tsx

### App State at End of Session
- "Load Task Templates" button: seeds tasks 101-118 + docs 101-108, safe to repeat, never inserts fake drivers/loads
- "Remove Sample Data" button: strips all seed business data with confirmation dialog
- Build: clean (tsc --noEmit + electron-vite build, 3 green bundles)

---

## 2026-03-14 — Session 10: CSV Import + v2-Readiness + Recurring Tasks + F12

### Work Completed

**CSV/Paste Lead Import:**
- `electron/main/csvLeadImport.ts` (new): RFC-4180 CSV parser; HEADER_MAP with space-separated aliases (`'driver name'`, `'company name'`, `'trailer type'`); auto header-row detection (scans first 5 lines, picks first with ≥2 mapped tokens); dedup by mc_number; INSERT OR IGNORE
- IPC: `leads:importCsv` (opens file dialog) + `leads:importPaste` (receives raw text)
- `PasteImportModal.tsx` (new): textarea with live row count; calls `window.api.leads.importPaste()`
- Leads toolbar: "Paste Data" + "Import CSV" buttons
- Leads page: result banners (green/amber), dismissible

**v2-Readiness (Migration 005):**
- `migrations.ts`: migration 005 adds `updated_at` to `notes` and `driver_documents` (addColumnIfMissing pattern)
- `dashboard.ts` (new): extracted `getDashboardStats()` service from ipcHandlers
- `db:query` IPC gated behind `!app.isPackaged`
- `syncAdminUserFromStore()` in db.ts: reads ownerName/ownerEmail from electron-store, updates users row 1

**Recurring Tasks + isTaskForToday fix:**
- seed.ts: tasks 111-115 (daily Marketing), tasks 116-118 (Monday/Wednesday/Friday); docs 106-108 (Facebook SOP, Warm Lead Script, FMCSA Checklist)
- `constants.ts`: removed `if (recurring === 1) return true` bug; added DOW array + day-of-week comparison
- `dashboard.ts`: SQL `WHERE due_date = date('now') OR due_date = 'Daily' OR due_date = ?` with todayDow param

**F12 DevTools:**
- `index.ts`: `before-input-event` listener → `mainWindow.webContents.toggleDevTools()` on F12

**`seedMissingItems(db)` (bypass guard for already-seeded DBs):**
- Inserts tasks 111-118 + docs 106-108 via INSERT OR IGNORE; no guard check

### Files Created (3)
- electron/main/csvLeadImport.ts
- electron/main/dashboard.ts
- src/components/leads/PasteImportModal.tsx

### Files Modified (10)
- electron/main/seed.ts
- electron/main/ipcHandlers.ts
- electron/main/index.ts
- electron/main/db.ts
- electron/main/schema/migrations.ts
- electron/preload/index.ts
- src/types/global.d.ts
- src/types/models.ts
- src/components/tasks/constants.ts
- src/components/leads/LeadsToolbar.tsx
- src/pages/Leads.tsx
- src/pages/Settings.tsx
- src/store/settingsStore.ts

### App State at End of Session
- CSV import: working end-to-end with real Leads.csv files
- Paste import: working for tab-separated spreadsheet data
- 18 recurring tasks seeded (5 daily, 3 weekly, 10 one-time/dated)
- Today view correctly shows only tasks due today (daily + day-of-week match)
- F12 opens DevTools
- Build: clean

### Technical Notes
- `String.fromCharCode()` required for `\r` and `\n` in Python-written TS files on Windows
- HEADER_MAP keys must be lowercase-normalised (trim + toLowerCase)
- `isTaskForToday` — `recurring` flag is display-only; `due_date` is the scheduling field

---

## 2026-03-14 — Session 9: Seed Data System

### Work Completed

**electron/main/seed.ts (new):**
- `runSeedIfEmpty(db)` -- guarded by `app_settings.dev_seed_applied = '1'`; wraps all seeds in a transaction
- `resetAndReseed(db)` -- deletes rows with `id >= 101` from 10 tables, clears guard, re-seeds
- 8 brokers, 15 drivers (9 Active / 4 On Load / 2 Inactive), 40 loads (all 7 statuses), 50 leads (all 5 statuses), 12 invoices, 10 tasks, 5 SOP documents
- Loads span realistic lanes: TX-GA, IL-TX, CA-AZ, MO-CO, TX-TN, GA-IL, MEM-CLT, BNA-CMH -- RPM 1.8-3.2
- Document content stored as single-line TypeScript strings with proper `\n` escape sequences

**Startup (electron/main/index.ts):**
- `runSeedIfEmpty(getDb())` called after `initDatabase()`, wrapped in `!app.isPackaged`

**Dev IPC:**
- `dev:seed` and `dev:reseed` handlers + preload exposure + `global.d.ts` typing

### Files Created (1)
- electron/main/seed.ts

### Files Modified (4)
- electron/main/index.ts
- electron/main/ipcHandlers.ts
- electron/preload/index.ts
- src/types/global.d.ts

### App State at End of Session
- All pages populated on first dev launch
- Build: clean (zero TS errors on both configs)
- `window.api.dev.reseed()` available in browser console for manual reset

### Technical Notes
- `\\n` in Python heredocs on this Windows system collapses to actual newline -- use `chr(92) + chr(110)` for literal backslash-n in doc content escaping
- SQL `NULL` must be lowercase `null` in TypeScript `.run()` calls

---

## 2026-03-14 — Session 8: FMCSA Manual Import Button

### Work Completed

**FMCSA Manual Import — full IPC pipeline:**
- `electron/main/fmcsaImport.ts` (new) — `FmcsaImportResult` interface + `importFmcsaLeads(db)` function
  - `fetchFmcsaCandidates()` stub returns [] (TODO: wire real Safer API)
  - Dedup by `mc_number` via `SELECT id FROM leads WHERE mc_number = ?`
  - Per-row error handling; early return with error message when 0 candidates
  - Inserts with `source='FMCSA'`, `status='New'`, `priority='Medium'`
- `ipcHandlers.ts` — `leads:importFmcsa` handler calls service, then writes `last_fmcsa_import_at` ISO timestamp to electron-store
- `preload/index.ts` — `leads.importFmcsa: () => ipcRenderer.invoke('leads:importFmcsa')`
- `models.ts` — `FmcsaImportResult { leadsFound, leadsAdded, duplicatesSkipped, errors[] }`
- `global.d.ts` — `importFmcsa: () => Promise<FmcsaImportResult>` on `window.api.leads`

**Leads toolbar + page wiring:**
- Replaced the existing disabled "FMCSA Import" placeholder in `LeadsToolbar.tsx` with active wired button
- Props added: `onImport`, `importBusy`, `lastImportAt`
- Button style: `bg-surface-600 border-surface-400` at rest, `hover:border-orange-600/40` — matches app token system
- Spinner shown during import; last import timestamp shown as native title tooltip
- `Leads.tsx`: `handleImport()` calls IPC, stores result + timestamp, conditionally reloads table
- `lastImportAt` loaded on mount from `window.api.settings.get('last_fmcsa_import_at')`
- Dismissible result banner between header and toolbar: amber = error/stub, green = success

### Files Created (1)
- electron/main/fmcsaImport.ts

### Files Modified (6)
- electron/main/ipcHandlers.ts
- electron/preload/index.ts
- src/types/models.ts
- src/types/global.d.ts
- src/components/leads/LeadsToolbar.tsx
- src/pages/Leads.tsx

### App State at End of Session
- FMCSA import button live in Leads toolbar, end-to-end IPC working
- Stub returns 0 leads with "not yet connected" message — expected behavior
- `last_fmcsa_import_at` persisted to electron-store and surfaced in UI on next load
- All prior modules unchanged and operational
- Build: clean

### Known Issues / Deferred
- `fetchFmcsaCandidates()` is a stub — no real API call yet
- Real Safer API integration is next step when credentials/access are available

---

## 2026-03-14 -- Prompt 7: Tasks Module + Backup Service + Scheduler + Dashboard Bug Fix

### Work Completed

**Tasks Module (full CRUD + completion tracking):**
- TasksToolbar -- view tabs (Today / All Tasks / History), progress bar (X of Y / %), search + category filter, Add Task button
- TaskModal -- create/edit: title, category, priority, due_date (accepts 'Daily' or YYYY-MM-DD), time_of_day, recurring toggle, notes
- TaskDrawer -- slide-in: mark complete/incomplete for today, completion history (last 30 logged), edit, two-step delete
- Tasks.tsx -- three views: Today checklist (large checkboxes + priority dots + time badges), All Tasks table (sortable, filterable), 30-day History (which tasks were done each day shown as tag pills)
- Completion persisted by day via task_completions table; recurring tasks independently checkable each day
- New IPC: tasks:completionsForDate(date) -- returns all completions for a given date (used for Today + History views)

**Automation Scheduler (scaffolded):**
- electron/main/scheduler.ts -- minute-tick setInterval, zero new npm packages
- Three jobs: fmcsa-scraper @ 05:00, daily-briefing @ 06:00, marketing-queue @ Mon 07:00
- Each job guarded by last_run key in app_settings -- fires at most once per day
- All job handlers are stubs with TODO comments; no external API calls yet
- Started in index.ts on app ready, stopped on window-all-closed

**Backup Service:**
- electron/main/backup.ts -- standalone module extracted from db.ts
- Auto daily backup: YYYY-MM-DD.db -- on startup, skips if already exists
- Periodic 6-hour backup: YYYY-MM-DD_auto-00/06/12/18.db -- up to 5 restore points per day
- Manual backup: YYYY-MM-DD_manual.db -- via Settings UI button
- Staged restore flow: stageRestore() saves path to electron-store; applyPendingRestore() runs at NEXT startup before DB is opened (WAL-safe, no concurrent write risk)
- Backup records written to backups table (best-effort, does not block)
- listBackups() reads filesystem directly -- works even if DB table is empty

**Settings -- Backup & Restore UI:**
- Lists all .db files in backups/ dir with filename + size
- Two-step confirm: Restore -> 'Confirm restore?' -> 'Yes, stage it'
- After staging: yellow banner shows 'Restart OnTrack to apply'
- 'Create Backup Now' button for on-demand backup
- Google Drive Sync section: explicit conflict warning about WAL + concurrent write risk

**Dashboard Bug Fix -- driversNeedingLoads:**
- Root cause: query was SELECT COUNT(*) FROM drivers WHERE status = 'Active' -- counted all Active drivers with no awareness of loads
- Fix: NOT EXISTS correlated subquery excludes Active drivers who already have a load in Booked / Picked Up / In Transit
- File: electron/main/ipcHandlers.ts, dashboard:stats handler

### Files Created (7 new)
- electron/main/backup.ts
- electron/main/scheduler.ts
- src/components/tasks/constants.ts
- src/components/tasks/TasksToolbar.tsx
- src/components/tasks/TaskModal.tsx
- src/components/tasks/TaskDrawer.tsx
- src/pages/Tasks.tsx (replaced PagePlaceholder stub)

### Files Modified (8)
- electron/main/db.ts -- added getDataDir() export, wired createBackup + startPeriodicBackup
- electron/main/index.ts -- wired startScheduler, stopScheduler, stopPeriodicBackup, applyPendingRestore
- electron/main/ipcHandlers.ts -- added backup IPC handlers, tasks:completionsForDate, fixed driversNeedingLoads query
- electron/main/repositories/tasksRepo.ts -- added getCompletionsForDate()
- electron/preload/index.ts -- exposed backups + tasksExtra namespaces
- src/types/global.d.ts -- added BackupEntry interface + backups/tasksExtra API surface
- src/pages/Settings.tsx -- full rewrite: added Backup & Restore section + Google Drive Sync section
- docs/HANDOFF.md, docs/SESSION_LOG.md

### App State at End of Session
- Tasks page: fully operational (Today checklist, All Tasks, History, CRUD, completion persistence)
- Backup: auto daily + 6-hour periodic + manual; staged restore via Settings UI
- Scheduler: wired and running; job stubs ready for API implementation
- Dashboard 'Needs Load' KPI: corrected -- excludes drivers with active loads
- Build: clean (1527 modules, zero errors)
- Remaining stubs: Documents, Marketing, Analytics, Help

### Technical Notes
- Restore is staged (not immediate) to avoid opening DB while copying over it
- listBackups() reads from filesystem, not DB table, for reliability
- scheduler.ts uses setInterval at 60s tick + last_run guard -- no node-cron dependency
- All file writes this session used Python heredoc (Windows EEXIST constraint applies)
- Scheduler getDb reference uses require() to avoid circular import at module load time

### Known Issues at End of Session
- No seed data -- pages show empty state
- Dashboard mini dispatch board still uses old driver count (needs refresh after KPI fix)
- Email workflow uses mailto: (SMTP deferred)
- FMCSA/briefing/marketing job handlers are stubs

---

Reverse-chronological. Most recent session at the top.

## 2026-03-14 -- Prompt 6: Brokers Module + Invoices Module

### Work Completed

**Brokers Module (full profile + performance):**
- BrokersToolbar -- search, flag filter, broker count, Add Broker button
- BrokersTable -- sortable 8-column table; late-payer highlight (red when avg_days_pay > payment_terms + 5)
- BrokerModal -- create/edit: all 9 fields (name, MC #, flag, phone, email, payment terms, credit rating, avg days pay, notes)
- BrokerDrawer -- 500px slide-in: contact/payment, inline flag switcher, performance metrics (total loads, revenue, avg RPM), load history (up to 12), notes
- Brokers.tsx -- orchestrator: search/filter/sort, delete, flag change

**Invoices Module (full lifecycle + export):**
- InvoicesToolbar -- search, status filter, outstanding fee badge, Generate Invoice button
- InvoicesTable -- 9-column table; auto-detects Overdue (sent_date > 30 days with no payment)
- InvoiceModal -- generate/edit: auto-generated invoice number (INV-YYYY-NNNN), load dropdown (Delivered/Invoiced/Paid only), auto-fills driver + gross + dispatch % + week ending, fee auto-calculated
- InvoiceDrawer -- status actions (Mark Sent/Paid/Overdue), Print PDF (window.print() with injected CSS), CSV Export (client-side Blob download), Email workflow (mailto: pre-filled), financials card, notes
- Invoices.tsx -- orchestrator: status cascade (invoice Paid/Sent updates linked load), outstanding total, search

**Types:**
- models.ts -- BrokerFlag extended with "Slow Pay" and "Blacklisted"

### Files Created (10 new)
- src/components/brokers/constants.ts
- src/components/brokers/BrokersToolbar.tsx
- src/components/brokers/BrokersTable.tsx
- src/components/brokers/BrokerModal.tsx
- src/components/brokers/BrokerDrawer.tsx
- src/components/invoices/constants.ts
- src/components/invoices/InvoicesToolbar.tsx
- src/components/invoices/InvoicesTable.tsx
- src/components/invoices/InvoiceModal.tsx
- src/components/invoices/InvoiceDrawer.tsx

### Files Modified (3)
- src/types/models.ts -- extended BrokerFlag union
- src/pages/Brokers.tsx -- replaced PagePlaceholder stub
- src/pages/Invoices.tsx -- replaced PagePlaceholder stub

### App State at End of Session
- Brokers: fully operational (list, CRUD, drawer, flag management, load history, performance metrics)
- Invoices: fully operational (list, generate from load, edit, print PDF, CSV export, email, status lifecycle)
- Invoice status cascade: marking invoice Paid/Sent updates linked load status automatically
- Build: clean (1523 modules, zero errors)
- Remaining stubs: Tasks, Documents, Marketing, Analytics, Help

### Technical Notes
- PDF export: window.print() with dynamically injected @media print CSS -- no new deps
- CSV export: client-side Blob + URL.createObjectURL -- no new IPC handlers
- Email: mailto: link pre-filled with invoice details -- SMTP config deferred to Settings
- Windows write constraint: avoid escape sequences (
) in Python-written JS; use String.fromCharCode(10) instead
- Always use encoding='utf-8' AND newline='' when writing JS/TS files via Python on Windows

### Known Issues at End of Session
- No seed data -- pages show empty until real data is entered
- Email workflow uses mailto: (default mail client) -- SMTP deferred
- Invoice history per driver accessible via search filter (no dedicated driver tab yet)

---

---
## 2026-03-13 — Prompt 5: Drivers Module + Loads Module + Dispatch Board

### Work Completed

**Drivers Module (full profile + documents):**
- `DriversToolbar` — search, status filter (Active / On Load / Inactive), driver count, Add Driver button
- `DriversTable` — sortable 9-column table: Driver, Company, Status, MC #, Equipment, Home Base, Min RPM, CDL Exp, Ins. Exp; expiry warning badges (orange, 60-day window); hover row actions
- `DriverModal` — create/edit modal: all 19 driver fields across 4 sections (Contact, Carrier Info, Equipment, Dispatch Settings) including min_rpm, dispatch %, factoring company, preferred lanes
- `DriverDrawer` — 500px slide-in detail panel: current load banner (Booked/Picked Up/In Transit), contact, carrier (MC#/DOT#/CDL# with expiry warnings), equipment, dispatch settings (min RPM + preferred lanes), linked documents (add/delete with doc type + expiry), notes
- `Drivers.tsx` — orchestrator: search/filter/sort state, status change, delete

**Loads Module (full lifecycle):**
- `LoadsToolbar` — search, status filter (all 7 statuses), load count, table/board toggle, Add Load
- `LoadsTable` — sortable 9-column table: Load #, Driver (unassigned highlight), Route (origin→dest), Miles, Rate, RPM (green if meets driver min, red if below), Pickup, Delivery, Status
- `LoadModal` — create/edit modal: driver dropdown, broker dropdown, route (city+state each end), schedule, miles, rate with live RPM preview, dispatch %, commodity, status, notes
- `LoadDrawer` — 480px slide-in: "Mark [Next Status]" action button, route card (origin→dest), financials (rate, RPM with min-RPM comparison, dispatch %, dispatch fee), assignment (driver + broker), notes

**Dispatch Board:**
- Embedded in Loads page as a second view (table ↔ board toggle in toolbar)
- Responsive card grid (1/2/3/4 columns by breakpoint)
- Each card: driver name, company, status badge, equipment chips, home base
- "Needs Load" highlight (orange glow border, pulsing dot) for Active drivers with no current load
- Drivers on load: clickable load card showing status badge + route + pickup date + RPM (green/red)
- Inactive drivers: dimmed (opacity-50)
- Sort order: Active drivers first, then unloaded before loaded

**Dashboard Mini Dispatch Board (updated):**
- Now fetches real driver + load data in a second parallel useEffect
- Compact list of up to 6 drivers, sorted: Active-unloaded first
- Shows status badge, current load status + route, or "Needs Load" pulse indicator

**Data model:**
- `LoadStatus` union extended with "Paid" (7th lifecycle stage)
- No schema changes, no IPC changes — all relationships joined client-side

### Files Created (10 new)
- src/components/drivers/constants.ts
- src/components/drivers/DriversToolbar.tsx
- src/components/drivers/DriversTable.tsx
- src/components/drivers/DriverModal.tsx
- src/components/drivers/DriverDrawer.tsx
- src/components/loads/constants.ts
- src/components/loads/LoadsToolbar.tsx
- src/components/loads/LoadsTable.tsx
- src/components/loads/LoadModal.tsx
- src/components/loads/LoadDrawer.tsx

### Files Modified (4)
- src/types/models.ts — added "Paid" to LoadStatus union
- src/pages/Drivers.tsx — replaced PagePlaceholder stub
- src/pages/Loads.tsx — replaced stub; includes Loads table + DispatchBoard component
- src/pages/Dashboard.tsx — updated mini dispatch board to show real driver/load data

### App State at End of Session
- Drivers page: fully operational (list, create, edit, drawer, status workflow, documents, notes)
- Loads page: fully operational (list + dispatch board view, create, edit, drawer, status workflow, RPM calc, notes)
- Dashboard: mini dispatch board shows real data
- Brokers, Invoices, Tasks, Documents, Marketing, Analytics, Help: still PagePlaceholder stubs
- No new IPC handlers needed — all relationships joined client-side
- No schema migration needed — LoadStatus "Paid" is TypeScript-only

### Known Issues at End of Session
- TypeScript generic helpers in modals (`num`, `str`) may produce minor TS warnings (not build errors)
- No seed data — Drivers/Loads pages will show empty state until Chris adds real data
- Dispatch Board "Needs Load" KPI on Dashboard still counts all Active drivers (not just those without loads)
- Task completion on Dashboard still visual-only (not persisted)

---


## 2026-03-13 — Prompt 4: Leads Module + Task Sort Fix

### Prompt 4 Complete
- Leads table view built
- Kanban board built
- Lead detail panel/form built
- Search/filter UX added
- Ready for Prompt 5

### Work Completed

**Leads Module (full CRM pipeline):**
- `LeadsTable` — sortable columns (Score, Lead, Status, MC #, Phone, Trailer, Auth Age, Follow-Up, Priority, Source), loading skeletons, empty state, hover row actions
- `LeadsKanban` — 5 status columns (New → Contacted → Interested → Signed → Rejected), card advance button on hover, loading skeletons, no drag-and-drop dependency
- `LeadsToolbar` — search with clear, status/priority/source/overdue filters, Table ↔ Board view toggle, disabled FMCSA Import placeholder, Add Lead button
- `LeadModal` — create/edit form with all 14 fields (name, company, MC #, phone, email, city, state, trailer type, authority date, source, status, priority, follow-up date, notes)
- `LeadDrawer` — slide-in detail panel: contact details, action bar (Edit/Call/→Status/Delete), overdue banner, Notes section (add/delete), Call Log section (type, outcome, duration, summary), collapsible Score Breakdown
- `LeadScoreBadge` — Hot/Warm/Cold badge computed client-side from 8 weighted factors (0–100)
- `leadScore.ts` — pure compute function, no DB column, no migration needed
- `fmcsa.ts` — clean import hook placeholder for future FMCSA API integration
- `constants.ts` — STATUS_STYLES, PRIORITY_STYLES, STATUSES, PRIORITIES, TRAILER_TYPES, LEAD_SOURCES
- `Leads.tsx` — orchestrator page wiring all components with search/filter/sort state and IPC handlers
- Call logs stored in existing `notes` table using `entity_type = 'lead_call'` with JSON content — no new table or migration
- Added `'lead_call'` to `NoteEntityType` union in `models.ts`

**Bug fix — Task sort order regression:**
- Root cause: `ORDER BY time_of_day ASC` in SQLite sorts lexicographically — `'10:30 AM'` sorts before `'9:00 AM'` because `'1' < '9'`
- Fix: removed `time_of_day` from all SQL `ORDER BY` clauses in `tasksRepo.ts`; added `timeToMin()` + `sortTasks()` helpers to sort by parsed minutes-since-midnight in JS
- Same fix applied to `dashboard:stats` `todayTasks` query in `ipcHandlers.ts`

### Files Created
- src/lib/leadScore.ts
- src/lib/fmcsa.ts
- src/components/leads/constants.ts
- src/components/leads/LeadScoreBadge.tsx
- src/components/leads/LeadsToolbar.tsx
- src/components/leads/LeadsTable.tsx
- src/components/leads/LeadsKanban.tsx
- src/components/leads/LeadModal.tsx
- src/components/leads/LeadDrawer.tsx
- src/pages/Leads.tsx

### Files Modified
- src/types/models.ts — added `'lead_call'` to NoteEntityType
- electron/main/repositories/tasksRepo.ts — replaced SQL time sort with JS sort helpers
- electron/main/ipcHandlers.ts — fixed dashboard:stats todayTasks sort

### App State at End of Session
- Leads page fully operational: table view, kanban board, create/edit modal, detail drawer
- Lead scoring computed client-side, no schema changes required
- Call logs and notes persisted to DB via existing notes table
- Task sort order correct: 9:00 AM → 10:30 AM → 1:00 PM (chronological)
- Dashboard, Drivers, Loads, Brokers, Invoices, Tasks pages still on placeholder stubs
- Dashboard rebuild plan approved but not yet implemented (deferred)

### Known Issues at End of Session
- Dashboard is still the original minimal scaffold (rebuild planned, not started)
- Task completion in Dashboard is visual-only (not persisted)
- FMCSA import is a disabled placeholder
- All non-Leads CRUD pages remain as PagePlaceholder stubs

---

## 2026-03-12 — Foundation Complete + Bug Fixes + Grounding Docs

### Work Completed
- Resolved all build errors carried over from prior session:
  - Fixed `\!` bash escape artifacts in settingsStore.ts and authStore.ts
  - Replaced deprecated `externalizeDepsPlugin()` with explicit `rollupOptions.external`
  - Main bundle dropped from 554 KB (electron bundled in) to 9.64 KB
- Resolved Electron/better-sqlite3 native module incompatibility:
  - Downgraded Electron from 41.0.1 → 32.3.3 LTS
  - Upgraded better-sqlite3 from v9 → v12.6.2
  - Added @electron/rebuild + postinstall script
- Resolved `window.api` undefined bug:
  - Identified that `"type":"module"` causes Electron 32 to lose preload ESM detection
  - Reverted to `.mjs` output (no package.json type field)
  - Converted postcss.config.js and tailwind.config.js to CJS module.exports
- Added React Router v7 future flags to suppress deprecation warnings
- Fixed duplicate daily tasks on every app launch:
  - Root cause: INSERT OR IGNORE without explicit ID — no PK conflict, always inserts
  - Fix: explicit IDs 1–6 in INSERT + dedup DELETE before INSERT
- Fixed task timestamp hidden until hover:
  - Root cause: opacity-0 + group-hover:opacity-100 Tailwind classes
  - Fix: removed those classes
- Fixed task sort order (alphabetic → chronological):
  - Root cause: ORDER BY time_of_day is alphabetic — "9:00 AM" > "4:30 PM"
  - Fix: CASE expression converting H:MM AM/PM → minutes-since-midnight integer
- Fixed sidebar collapse button being cut off:
  - Root cause: overflow-hidden on aside clipping absolute -right-3 button
  - Fix: removed overflow-hidden from aside (labels are conditionally rendered)
- Saved standing project instructions to MEMORY.md
- Created all grounding docs: CLAUDE.md + docs/ folder with 5 files

### Files Changed
- electron/main/index.ts
- electron/main/db.ts
- electron/main/ipcHandlers.ts
- electron.vite.config.ts
- package.json
- src/store/settingsStore.ts
- src/store/authStore.ts
- src/App.tsx
- src/pages/Dashboard.tsx
- src/components/layout/Sidebar.tsx
- postcss.config.js
- tailwind.config.js
- CLAUDE.md (created)
- README.md (updated)
- docs/ARCHITECTURE.md (created)
- docs/DECISIONS.md (created)
- docs/ROADMAP.md (created)
- docs/HANDOFF.md (created)
- docs/SESSION_LOG.md (created)

### App State at End of Session
- App launches, window opens, Dashboard renders with live data
- Tasks: 6 daily tasks, chronological order, timestamps always visible
- Sidebar: collapsible, toggle button fully visible
- Theme toggle: works and persists
- 2 benign 3rd-party deprecation warnings (no action needed)
- Ready for Phase 1 CRUD module work

### Known Issues at End of Session
- Task completion not persisted to DB (visual only)
- Dispatch board is a static placeholder
- All Phase 1 pages are PagePlaceholder stubs

---

## Prior Sessions

### Pre-2026-03-12 — Initial Scaffold

Full project scaffold built from scratch:
- Electron + electron-vite + React + TypeScript + Tailwind setup
- SQLite schema (8 tables), WAL mode, auto-backup
- All IPC channels registered
- AppShell, Sidebar, TopBar layout
- Dashboard and Settings pages
- Zustand stores, electron-store, HashRouter
- 12 routes registered
