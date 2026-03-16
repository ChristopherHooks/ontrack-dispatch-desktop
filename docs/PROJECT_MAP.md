# OnTrack Dispatch Desktop App — Project Map

This document provides a high-level overview of the repository so AI agents can quickly understand the system architecture without scanning the entire codebase.

AI assistants must read this file at the start of each session.

---

# Purpose of the Application

OnTrack Dispatch Desktop is a local-first internal operations platform for a trucking dispatch company (OnTrack Hauling Solutions, owner Chris Hooks).

The software replaces spreadsheets and manual workflows with a structured system for:

- Lead acquisition and carrier outreach
- Driver onboarding and document tracking
- Load dispatch and lifecycle management
- Broker tracking and relationship management
- Task management and daily dispatch checklists
- Invoice generation and payment tracking
- Marketing content workflow (Facebook group posting)
- Dispatch analytics and lane profitability
- Document and SOP library

Primary workflow:

Lead → Driver → Load → Invoice

---

# Technology Stack

| Layer | Technology |
|---|---|
| Desktop Framework | Electron 32.3.3 LTS |
| Frontend | React 18 + TypeScript |
| Build System | electron-vite 5 (rolldown) |
| Styling | Tailwind CSS 3 (dark mode via class) |
| State Management | Zustand (settingsStore, authStore, uiStore) |
| Settings Persistence | electron-store (JSON in %APPDATA%) |
| Database | better-sqlite3 v12.6.2 (local SQLite, WAL mode) |
| IPC | contextBridge (contextIsolation: true) |
| Router | React Router v6 (HashRouter) |

---

# Repository Structure

```
app/
├── electron/
│   ├── main/
│   │   ├── index.ts              Main process entry, BrowserWindow, lifecycle
│   │   ├── db.ts                 SQLite init, runMigrations(), auto-backup, WAL
│   │   ├── ipcHandlers.ts        All IPC handler registrations (~50 channels)
│   │   ├── analytics.ts          Analytics aggregation queries
│   │   ├── backup.ts             Auto daily + manual backup logic
│   │   ├── dashboard.ts          Dashboard KPI query
│   │   ├── dispatcherBoard.ts    Dispatcher board SQL
│   │   ├── fmcsaApi.ts           FMCSA QCMobile HTTP client + SAFER scraper
│   │   ├── fmcsaImport.ts        FMCSA lead import pipeline
│   │   ├── csvLeadImport.ts      CSV/TSV lead import with header detection
│   │   ├── loadScanner.ts        Load recommendation engine
│   │   ├── scheduler.ts          Background job ticker (fmcsa, briefing, marketing)
│   │   ├── search.ts             Global search query (all entities)
│   │   ├── seed.ts               Dev seed data (guarded by app_settings flag)
│   │   ├── repositories/         One file per entity, all DB CRUD
│   │   │   ├── leadsRepo.ts
│   │   │   ├── driversRepo.ts
│   │   │   ├── driverDocumentsRepo.ts
│   │   │   ├── loadsRepo.ts
│   │   │   ├── brokersRepo.ts
│   │   │   ├── invoicesRepo.ts
│   │   │   ├── tasksRepo.ts
│   │   │   ├── notesRepo.ts
│   │   │   ├── usersRepo.ts
│   │   │   ├── auditRepo.ts
│   │   │   ├── documentsRepo.ts
│   │   │   ├── marketingRepo.ts  (marketing_groups + marketing_post_log)
│   │   │   └── index.ts          Re-exports all repos
│   │   └── schema/
│   │       └── migrations.ts     All 9 DB migrations
│   └── preload/
│       └── index.ts              contextBridge → window.api (all namespaces)
├── src/
│   ├── main.tsx                  React entry point
│   ├── App.tsx                   HashRouter + all routes
│   ├── index.css                 Tailwind directives + CSS custom properties
│   ├── pages/
│   │   ├── Dashboard.tsx         KPI cards + today's task checklist
│   │   ├── Leads.tsx             Carrier CRM + FMCSA/CSV import
│   │   ├── Drivers.tsx           Driver profiles + documents
│   │   ├── Loads.tsx             Load lifecycle + dispatch board
│   │   ├── Brokers.tsx           Broker directory + flags
│   │   ├── Invoices.tsx          Invoice lifecycle + export
│   │   ├── Tasks.tsx             Daily checklist + all tasks + history
│   │   ├── Marketing.tsx         Daily post workflow + group rotation
│   │   ├── Documents.tsx         SOP library + folder scanner
│   │   ├── Analytics.tsx         Revenue, RPM, lane, broker charts
│   │   ├── Help.tsx              Searchable articles + keyboard shortcuts
│   │   └── Settings.tsx          Theme, business info, backup, integrations
│   ├── components/
│   │   ├── layout/               AppShell, Sidebar, TopBar
│   │   ├── ui/                   GlobalSearch overlay, EmptyState
│   │   ├── brokers/              BrokerDrawer, BrokersTable
│   │   ├── drivers/              DriverDrawer, DriversTable
│   │   ├── leads/                LeadDrawer, LeadsTable, LeadModal, LeadsToolbar
│   │   ├── loads/                LoadDrawer, LoadsTable
│   │   ├── invoices/             InvoiceDrawer, InvoicesTable
│   │   └── tasks/                TaskDrawer, TaskModal, TasksToolbar, constants
│   ├── lib/
│   │   ├── postTemplates.ts      78 marketing post templates (11 categories)
│   │   ├── marketingUtils.ts     Anti-repetition scoring, variation generator,
│   │   │                         image prompts, daily tasks, group suggestion
│   │   └── saferUrl.ts           FMCSA SAFER URL builder for MC# / DOT# links
│   ├── store/
│   │   ├── settingsStore.ts      Zustand: theme, sidebar, business prefs
│   │   ├── authStore.ts          Zustand: user session, role, can()
│   │   └── uiStore.ts            Zustand: transient UI (global search open/closed)
│   ├── types/
│   │   ├── models.ts             All domain interfaces (Lead, Driver, Load, etc.)
│   │   ├── auth.ts               UserRole + ROLE_PERMISSIONS matrix
│   │   └── global.d.ts           window.api TypeScript ambient declarations
│   └── data/
│       └── helpArticles.ts       Static help content (articles, shortcuts)
├── docs/
│   ├── ARCHITECTURE.md           Process model, IPC channels, schema
│   ├── DATA_ARCHITECTURE.md      Full schema table list, migration strategy
│   ├── DECISIONS.md              Technical decisions log (DEC-001 through DEC-012)
│   ├── FEATURE_REGISTRY.md       Feature status registry (AI must read before adding)
│   ├── HANDOFF.md                Session-by-session work log and current app state
│   ├── ROADMAP.md                Completed and planned work
│   ├── SESSION_LOG.md            Reverse-chronological session summaries
│   ├── AI_DEV_RULES.md           Rules for AI-assisted development
│   ├── PROJECT_MAP.md            This file
│   └── MARKETING_SOP.md         Daily marketing workflow SOP
├── CLAUDE.md                     Primary AI grounding document (read first)
├── README.md                     Setup, features, FMCSA guide
├── package.json
├── electron.vite.config.ts
├── tsconfig.json
├── tailwind.config.js            CJS (module.exports, not ESM — see DEC-005)
└── postcss.config.js             CJS (module.exports, not ESM — see DEC-005)
```

---

# IPC Namespaces (window.api)

All IPC is accessed from the renderer as `window.api.<namespace>.<method>()`.

| Namespace | Methods |
|---|---|
| `settings` | get, set, getAll |
| `dashboard` | stats |
| `leads` | list, get, create, update, delete, importFmcsa, importCsv, importPaste, backfillLeadData |
| `drivers` | list, get, create, update, delete |
| `driverDocuments` | list, get, create, update, delete |
| `loads` | list, get, create, update, delete |
| `brokers` | list, get, create, update, delete |
| `invoices` | list, get, create, update, delete |
| `tasks` | list, get, create, update, delete, markComplete, markIncomplete, getCompletions, getCompletionsForDate |
| `notes` | list, create, delete |
| `users` | list, get, getByEmail, create, update |
| `audit` | list |
| `documents` | list, get, create, update, delete, search |
| `marketing.groups` | list, create, update, markPosted, delete |
| `marketing.post` | list, create, update, delete, recentIds, usageCounts |
| `backup` | createBackup, listBackups, stageRestore |
| `search` | global |
| `scanner` | recommendLoads |
| `dispatcher` | board, availableLoads, assignLoad |
| `dev` | seed, reseed, seedMissing, seedTasksOnly, clearSeedData, reseedDocs |

---

# Database

15 tables across 9 migrations. All access is in the main process via repository functions.
Schema defined in `electron/main/schema/migrations.ts`.
Full table list in `docs/DATA_ARCHITECTURE.md`.

---

# Key Rules for AI Assistants

1. Never access the database from the renderer. All DB calls go through IPC.
2. Never use `externalizeDepsPlugin()` (deprecated in electron-vite 5).
3. Never add `"type":"module"` to package.json (breaks Electron 32 preload).
4. No emojis anywhere — UI copy, templates, comments, documents.
5. Keep changes scoped to the task. Do not refactor adjacent code.
6. Read CLAUDE.md, this file, and HANDOFF.md before any session.
