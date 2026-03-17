# Roadmap — OnTrack Dispatch Dashboard

Last updated: 2026-03-15

---

## Foundation — COMPLETE

- [x] Electron + electron-vite + React + TypeScript project scaffold
- [x] Tailwind CSS 3 + dark/light theme system
- [x] AppShell: fixed sidebar + TopBar + main content area
- [x] React Router v6 with HashRouter + all routes registered
- [x] SQLite database init, schema (19 migrations applied), WAL mode, auto-backup
- [x] IPC channels: settings, dashboard stats, all CRUD modules
- [x] Zustand stores: settingsStore, authStore, uiStore
- [x] electron-store settings persistence
- [x] Daily task seed data with explicit IDs, dedup on launch
- [x] Grounding docs: CLAUDE.md, README.md, docs/

---

## Phase 1 — CRUD Modules — COMPLETE

### Leads CRM — COMPLETE
- [x] Leads table with kanban toggle, sortable columns, call logs
- [x] Add/edit lead modal + detail drawer
- [x] Lead scoring: priority computed from authority age + fleet size
- [x] FMCSA import: paginated QCMobile API + SAFER scraper enrichment
- [x] Fleet size extraction (Power Units) from SAFER snapshot page
- [x] CSV file import + paste-from-spreadsheet import (TSV)
- [x] 30-180 day authority age filter (only new authorities imported)
- [x] Clickable MC# and DOT# links to FMCSA SAFER snapshot page
- [x] Backfill: re-enrich existing leads from SAFER, recompute priorities

### Drivers — COMPLETE
- [x] Driver profiles with CDL, insurance, equipment, home base, preferred lanes
- [x] Document management per driver (CDL, insurance, BOL, POD)
- [x] Active/Inactive/On Load status lifecycle
- [x] Expiry badge alerts on CDL and insurance dates

### Loads — COMPLETE
- [x] Full 7-stage lifecycle: Searching → Booked → Picked Up → In Transit → Delivered → Invoiced → Paid
- [x] RPM calculation, dispatch fee auto-calc
- [x] Driver and broker assignment
- [x] Dispatch board (driver/load status grouped view)

### Brokers — COMPLETE
- [x] Broker profiles with MC#, payment terms, credit rating, flag management
- [x] Performance history (load count, avg days-to-pay)
- [x] None / Watch / Avoid / Preferred flags

### Invoices — COMPLETE
- [x] Generate invoice from delivered load
- [x] Status lifecycle: Draft → Sent → Paid / Disputed
- [x] Print/PDF and CSV export
- [x] Two-step delete confirm
- [x] Invoice cascade updates linked load status

### Tasks — COMPLETE
- [x] Daily checklist view with per-date completion tracking (task_completions table)
- [x] All Tasks table + 30-day completion history
- [x] Recurring tasks (Daily, day-of-week, specific date)
- [x] 18 seeded task templates (daily ops + marketing + weekly reviews)
- [x] Full CRUD: create, edit, delete, mark complete/incomplete

### Dashboard — COMPLETE
- [x] Live KPI cards: drivers needing loads, loads in transit, follow-up leads, outstanding invoices
- [x] Today's task checklist embedded in dashboard
- [x] Real driver/load status data (not placeholder)

---

## Phase 2 — Operational Support — COMPLETE

### Marketing — COMPLETE
- [x] 78 post templates, 11 categories, no emojis anywhere
- [x] Daily suggested post with anti-repetition scoring (14-day rolling window + use count)
- [x] Variation generator: swaps opening line and CTA per template
- [x] Image prompt for every suggested post (copy-ready, matched to truck type/category)
- [x] Today's checklist (5 daily tasks, localStorage persistence, resets daily)
- [x] Group manager: platform, truck type tags, active flag, last posted date
- [x] Suggested groups panel: matched by truck type, sorted by posting recency
- [x] Post history logging (marketing_post_log table): replies, leads generated, notes
- [x] Template library: all 78 templates with use count and recency indicator

### Documents / SOP Library — COMPLETE
- [x] Markdown SOP library with category filtering and inline viewer/editor
- [x] 20 comprehensive documents: SOPs, scripts, training guides, references
- [x] Folder scanning for operational docs (.docx, .md, .txt, .pdf)
- [x] Search, reindex, and Rebuild Document Library action in Settings

### Analytics — COMPLETE
- [x] Revenue by month, revenue by driver
- [x] Lane profitability, broker performance charts
- [x] Lead conversion tracking

### Help — COMPLETE
- [x] Searchable articles and workflow walkthroughs
- [x] Keyboard shortcuts reference
- [x] Inline SOP viewer

### Global Search — COMPLETE
- [x] Ctrl+K overlay: searches leads, drivers, loads, brokers, invoices

---

## Phase 3 — Advanced Features

### Partially Done
- [x] FMCSA lead import (pagination, enrichment, fleet size, priority scoring — complete)
- [ ] Email/SMTP integration for invoices (currently opens mailto:, no direct send)
- [ ] Driver document expiry push notifications (badge alerts exist, push alerts do not)

### Planned
- [ ] Lane guidance tool: given driver home base + preferred lanes, surface common freight corridors and load availability — designed for dispatchers without route knowledge
- [ ] Sunday night load planning workflow: structured weekly booking queue
- [ ] Load board guidance: DAT/Truckstop workflow integration or step-by-step process docs
- [ ] Driver portal: mobile-friendly web view or separate Electron window
- [ ] Google Drive sync: move DB folder into Drive for multi-device access
  - Note: WAL mode is on. Never open the app on two computers simultaneously.
- [ ] Multi-user support: login screen, role enforcement on UI routes
- [ ] AI-assisted outreach: suggested follow-up messages for warm leads

---

## Known Limitations / Open Tech Debt

- Email/SMTP: invoices use mailto: — opens local email client, no direct send from app
- Driver document expiry: badge alerts only, no OS-level push notification
- Lane data: preferred_lanes field on drivers is free text — no structured lane analysis yet
- No user login screen (single-user mode, defaulting to Admin)
- FMCSA authority date is MCS-150 form date, not the exact authority grant date (usually within a few weeks)
