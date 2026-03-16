# OnTrack Dispatch Desktop App — Feature Registry

This document tracks implemented, in-progress, and planned features so AI assistants do not duplicate work or invent conflicting systems.

AI assistants must read this file before adding new features.

Last updated: 2026-03-15

---

# Status Legend

- Planned
- In Progress
- Implemented
- Deprecated

---

# Core Business Workflow

Primary workflow:

Lead → Driver → Load → Invoice

Supporting modules:

Task management
Broker management
Marketing workflow
Analytics
Document / SOP library
Settings and configuration

---

# Feature Registry

## 1. App Shell / Navigation
Status: Implemented

Includes:
- Sidebar navigation (collapsible, 12 nav items)
- Top bar with theme toggle and user badge
- App shell layout with HashRouter
- All 12 routes registered and functional

Key files:
- src/components/layout/AppShell.tsx
- src/components/layout/Sidebar.tsx
- src/components/layout/TopBar.tsx
- src/App.tsx

---

## 2. Core Shared Types
Status: Implemented

Includes:
- Business domain models (Lead, Driver, Load, Broker, Invoice, Task, etc.)
- IPC contract types
- window.api TypeScript ambient declarations

Key files:
- src/types/models.ts
- src/types/global.d.ts
- src/types/auth.ts

---

## 3. Database Schema + Migrations
Status: Implemented

Includes:
- 15 tables across 9 migrations
- addColumnIfMissing() helper for safe schema evolution
- schema_version table tracking applied migrations
- WAL mode, synchronous=NORMAL, cache_size=-32000

Key files:
- electron/main/schema/migrations.ts
- electron/main/db.ts
- docs/DATA_ARCHITECTURE.md

---

## 4. Repository Layer
Status: Implemented

Includes:
- One repo file per entity: leads, drivers, driverDocuments, loads, brokers,
  invoices, tasks, notes, users, audit, documents, marketing
- All CRUD functions typed against src/types/models.ts
- marketingRepo handles marketing_groups and marketing_post_log

Key files:
- electron/main/repositories/

Notes:
UI must never import repository functions directly. All access through IPC.

---

## 5. IPC Handler Layer
Status: Implemented

Includes:
- ~50 IPC handlers across all modules
- All handlers in one registration function in ipcHandlers.ts
- contextBridge in preload exposes window.api with all namespaces

Key files:
- electron/main/ipcHandlers.ts
- electron/preload/index.ts
- src/types/global.d.ts

---

## 6. Dashboard
Status: Implemented

Includes:
- Live KPI cards: drivers needing loads, loads in transit, follow-up leads, outstanding invoices
- Today's task checklist with per-date completion tracking
- Dispatcher board link

Key files:
- src/pages/Dashboard.tsx
- electron/main/dashboard.ts

---

## 7. Leads Module
Status: Implemented

Includes:
- Leads table with status pipeline (New, Contacted, Interested, Signed, Rejected)
- Kanban view toggle
- Add/edit modal + detail drawer with call logs
- Lead scoring: priority computed from authority age (30-180 days) + fleet size (1-3 trucks)
- FMCSA import: paginated QCMobile API (3 pages per search term) + SAFER scraper enrichment
- Authority age filter: only imports carriers 30-180 days old by default
- Fleet size extraction (Power Units) from SAFER public snapshot page
- CSV file import with RFC-4180 parser and auto header detection
- Paste-from-spreadsheet import (TSV from Excel / Google Sheets)
- Clickable MC# and DOT# links — opens FMCSA SAFER snapshot in system browser
- Backfill action: re-enrich existing leads from SAFER, recompute priorities
- FMCSA authority date: MCS-150 form date (closest available proxy)

Key files:
- src/pages/Leads.tsx
- src/components/leads/
- electron/main/repositories/leadsRepo.ts
- electron/main/fmcsaApi.ts
- electron/main/fmcsaImport.ts
- electron/main/csvLeadImport.ts
- src/lib/saferUrl.ts

---

## 8. Drivers Module
Status: Implemented

Includes:
- Driver profiles: name, company, MC/DOT, phone, email, truck/trailer type
- Home base, preferred lanes, min RPM, dispatch percent
- CDL number + expiry, insurance expiry with badge alerts
- Status: Active / Inactive / On Load
- Per-driver document management (CDL, insurance, BOL, POD, Other)
- Notes per driver

Key files:
- src/pages/Drivers.tsx
- src/components/drivers/
- electron/main/repositories/driversRepo.ts
- electron/main/repositories/driverDocumentsRepo.ts

---

## 9. Loads Module
Status: Implemented

Includes:
- Full 7-stage lifecycle: Searching → Booked → Picked Up → In Transit → Delivered → Invoiced → Paid
- RPM auto-calculation, dispatch fee auto-calc
- Driver and broker assignment
- Dispatch board: driver/load status table grouped by driver
- Load opportunity scanner (basic recommendation)

Key files:
- src/pages/Loads.tsx
- src/components/loads/
- electron/main/repositories/loadsRepo.ts
- electron/main/dispatcherBoard.ts
- electron/main/loadScanner.ts

---

## 10. Brokers Module
Status: Implemented

Includes:
- Broker profiles: name, MC#, phone, email, payment terms, credit rating
- Flag management: None / Watch / Avoid / Preferred
- Performance history: load count, avg days-to-pay
- Notes per broker

Key files:
- src/pages/Brokers.tsx
- src/components/brokers/
- electron/main/repositories/brokersRepo.ts

---

## 11. Invoices Module
Status: Implemented

Includes:
- Invoice generation from delivered loads
- Status lifecycle: Draft → Sent → Paid / Disputed
- Print/PDF and CSV export
- Two-step delete with confirmation
- Invoice cascade: marking Paid updates linked load status

Key files:
- src/pages/Invoices.tsx
- src/components/invoices/
- electron/main/repositories/invoicesRepo.ts

Note: Currently uses mailto: for email sending. Direct SMTP is planned (Phase 3).

---

## 12. Tasks Module
Status: Implemented

Includes:
- Daily checklist view: tasks due today (Daily, day-of-week, or specific date)
- Per-date completion tracking via task_completions table (not a status flag)
- All Tasks table + 30-day completion history
- Recurring task support (Daily, specific weekday, one-off date)
- 18 seeded task templates: daily dispatch ops, marketing tasks, weekly reviews
- Full CRUD: TaskModal for create/edit, TaskDrawer for detail

Key files:
- src/pages/Tasks.tsx
- src/components/tasks/
- electron/main/repositories/tasksRepo.ts

---

## 13. Marketing Module
Status: Implemented

Includes:
- 78 post templates across 11 categories (no emojis, natural human tone)
- Daily suggested post: anti-repetition scoring using 14-day window + total use count
- Variation generator: swaps opening line and CTA using category-specific variant pools
- Image prompt for every post: copy-ready prompt matched to truck type and category
- Today's checklist: 5 daily tasks, persisted in localStorage, resets daily
- Group manager: name, URL, platform, truck type tags, active flag, last posted date
- Suggested groups panel: filtered by truck type match, sorted by posting recency
- Post history logging: template, groups posted to, replies, leads generated, notes
- Template library: all 78 templates with use count and recent-use indicator

Key files:
- src/pages/Marketing.tsx
- src/lib/postTemplates.ts
- src/lib/marketingUtils.ts
- electron/main/repositories/marketingRepo.ts (marketing_groups + marketing_post_log)
- docs/MARKETING_SOP.md

---

## 14. Documents / SOP Library
Status: Implemented

Includes:
- Markdown SOP library with category filtering and inline viewer/editor
- 20 comprehensive documents: SOPs, cold call scripts, training guides, references
- Folder scanning for operational docs (.docx, .md, .txt, .pdf)
- Full-text search, reindex, and Rebuild Document Library action in Settings

Key files:
- src/pages/Documents.tsx
- electron/main/repositories/documentsRepo.ts
- electron/main/seed.ts (reseedDocuments)

---

## 15. Analytics Module
Status: Implemented

Includes:
- Revenue by month and by driver
- Lane profitability analysis
- Broker performance metrics
- Lead conversion tracking

Key files:
- src/pages/Analytics.tsx
- electron/main/analytics.ts

---

## 16. Help Module
Status: Implemented

Includes:
- Searchable articles covering core workflows
- Keyboard shortcuts reference
- Inline SOP viewer

Key files:
- src/pages/Help.tsx
- src/data/helpArticles.ts

---

## 17. Settings Module
Status: Implemented

Includes:
- Theme switcher (dark / light / system)
- Business info: company name, owner name, email, phone
- FMCSA integration: API key, search terms
- Backup & Restore: list backups, create manual backup, staged restore
- Sample data controls: load task templates, clear sample data, rebuild document library
- Google Drive sync notes

Key files:
- src/pages/Settings.tsx

---

## 18. Global Search
Status: Implemented

Includes:
- Ctrl+K overlay: searches leads, drivers, loads, brokers, invoices simultaneously
- Keyboard-navigable results list

Key files:
- src/components/ui/GlobalSearch.tsx
- electron/main/search.ts

---

## 19. FMCSA Integration
Status: Implemented

Includes:
- QCMobile API client: paginated name search (up to 150 results per term, 3 pages)
- SAFER public snapshot scraper: phone, MCS-150 date, Power Units (fleet size)
- Authority age filter: skips carriers outside 30-180 day window by default
- Docket number fetch: resolves MC# from DOT number
- Enrichment pipeline: QCMobile + SAFER + dockets in one import pass
- 8 default search terms covering top US freight-volume states
- Backfill: re-enrich existing FMCSA leads missing fleet_size or priority

Key files:
- electron/main/fmcsaApi.ts
- electron/main/fmcsaImport.ts

---

## 20. Backup and Restore
Status: Implemented

Includes:
- Auto daily backup on launch (YYYY-MM-DD.db, skips if already exists today)
- 6-hour periodic auto-backup (up to 5 restore points per day)
- Manual backup via Settings UI
- Staged restore: writes path to electron-store, applies at next startup before DB opens

Key files:
- electron/main/backup.ts

---

## 21. Industry Terms and Acronyms Index
Status: Implemented

Includes:
- 60+ terms across 6 categories: Documents, Equipment, Regulatory, Dispatch, Rates & Freight, Business
- Full-text search across term name and definition
- Category filter pills
- Alphabetical sort
- Embedded in Help page as a Glossary tab alongside the existing Articles tab

Key files:
- src/data/industryTerms.ts
- src/pages/Help.tsx

---

# Rules for AI Assistants

Before adding or modifying a feature:

1. Read this file
2. Check whether the feature already exists
3. Update the status if work has progressed
4. Do not create duplicate implementations
5. Keep feature scope aligned to the registry

If a new feature is added, it must be recorded here.

---

End of feature registry
