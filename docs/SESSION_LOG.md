# Session Log — OnTrack Dispatch Dashboard

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
