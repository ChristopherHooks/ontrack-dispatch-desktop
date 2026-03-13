# Roadmap — OnTrack Dispatch Dashboard

Last updated: 2026-03-12

---

## Foundation — COMPLETE

All scaffold, infrastructure, and shell work is done.

### Completed
- [x] Electron + electron-vite + React + TypeScript project scaffold
- [x] Tailwind CSS 3 + dark/light theme system
- [x] AppShell: fixed sidebar + TopBar + main content area
- [x] Sidebar: collapsible, 12 nav items, toggle button
- [x] React Router v6 with HashRouter + all 12 routes registered
- [x] SQLite database init, schema (8 tables), WAL mode, auto-backup
- [x] IPC channels: settings, dashboard stats
- [x] Dashboard page: 4 KPI cards + today's task checklist
- [x] Settings page: theme switcher + business preferences
- [x] Zustand stores: settingsStore, authStore
- [x] electron-store settings persistence
- [x] ROLE_PERMISSIONS matrix (Admin, Dispatcher, Sales)
- [x] Daily task seed data (6 tasks, explicit IDs, dedup on launch)
- [x] Chronological task sort (12h time CASE expression)
- [x] Grounding docs: CLAUDE.md, README.md, docs/

---

## Phase 1 — CRUD Modules (Next)

Build full UI for the core operational modules.
Each module follows the same pattern: list view → detail/edit panel → IPC handlers.

### Leads CRM
- [ ] Leads list view (sortable, filterable by status)
- [ ] Add / edit lead form
- [ ] Follow-up date tracking
- [ ] Status pipeline: New → Contacted → Interested → Signed / Rejected
- [ ] IPC handlers: leads:list, leads:get, leads:create, leads:update, leads:delete

### Drivers
- [ ] Driver list view
- [ ] Add / edit driver form (CDL, expiry, truck number, trailer type)
- [ ] Status: Active / Inactive / On Load
- [ ] IPC handlers: drivers:list, drivers:get, drivers:create, drivers:update, drivers:delete

### Loads
- [ ] Load list view (filterable by status)
- [ ] Add / edit load form (driver, broker, origin/dest, dates, rate, dispatch fee)
- [ ] Status pipeline: Searching → Booked → Picked Up → In Transit → Delivered → Invoiced
- [ ] Auto-calculate dispatch fee from rate × default %
- [ ] IPC handlers: loads:list, loads:get, loads:create, loads:update, loads:delete

### Brokers
- [ ] Broker list view
- [ ] Add / edit broker form (MC#, contact, preferred flag)
- [ ] IPC handlers: brokers:list, brokers:get, brokers:create, brokers:update, brokers:delete

### Invoices
- [ ] Invoice list view (Outstanding, Sent, Overdue, Paid)
- [ ] Create invoice from load
- [ ] Mark sent / paid
- [ ] IPC handlers: invoices:list, invoices:get, invoices:create, invoices:update

### Tasks
- [ ] Full task list view (all tasks, not just today)
- [ ] Add / edit task form
- [ ] Mark complete / incomplete (persisted to DB)
- [ ] Filter by category, priority, date
- [ ] IPC handlers: tasks:list, tasks:update

### Dashboard Dispatch Board
- [ ] Replace "No active drivers yet" placeholder with live driver/load status table

---

## Phase 2 — Operational Support

- [ ] Marketing page: Facebook group post tracker, DM log
- [ ] Documents page: file browser for driver docs (COI, BOL, POD, etc.)
- [ ] Analytics page: revenue charts, load volume, top brokers
- [ ] Help / SOPs page: written procedures, quick-reference cards

---

## Phase 3 — Advanced Features

- [ ] FMCSA data import (driver lookup by CDL or DOT)
- [ ] AI integration: suggested responses, load descriptions
- [ ] Driver portal (mobile-friendly web view or separate Electron window)
- [ ] Google Drive sync: move DB folder into Drive, share across two computers
  - Note: WAL mode is enabled. Do not write simultaneously from both machines.

---

## Known Limitations / Tech Debt

- [ ] Task completion state in Dashboard is local UI only (not persisted to DB)
- [ ] Dispatch board on Dashboard is a static placeholder
- [ ] Settings page business prefs (companyName, ownerName, etc.) not yet wired to DB
- [ ] No error boundary / crash recovery UI
- [ ] No user login screen (defaulting to Admin for single-user phase)
