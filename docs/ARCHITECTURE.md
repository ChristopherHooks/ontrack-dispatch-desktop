# Architecture — OnTrack Dispatch Dashboard

Last updated: 2026-04-15

## Process Model

```
┌─────────────────────────────────────────────────────────────┐
│  Electron Main Process (Node.js)                             │
│  electron/main/index.ts      — app lifecycle, BrowserWindow  │
│  electron/main/db.ts         — SQLite init, migrations, WAL  │
│  electron/main/ipcHandlers.ts — ~70 IPC channel handlers     │
│  electron/main/repositories/ — all DB CRUD (one file/entity) │
│  electron/main/schema/       — versioned migrations          │
└──────────────────────┬──────────────────────────────────────┘
                       │ IPC (contextBridge, contextIsolation: true)
┌──────────────────────▼──────────────────────────────────────┐
│  Preload Script (isolated context)                           │
│  electron/preload/index.ts — exposes window.api              │
└──────────────────────┬──────────────────────────────────────┘
                       │ window.api.*
┌──────────────────────▼──────────────────────────────────────┐
│  Renderer Process (React 18 + Vite)                          │
│  src/main.tsx → src/App.tsx → pages + components             │
│  Zustand stores: settingsStore, authStore, uiStore           │
└─────────────────────────────────────────────────────────────┘
```

## Key Architectural Decisions

- **HashRouter** (not BrowserRouter): Required for Electron file:// protocol. Hash-based routing
  works without a server. BrowserRouter requires a web server to handle deep links.

- **contextIsolation + contextBridge**: All IPC calls go through window.api (defined in preload).
  Renderer never has direct access to Node.js or Electron APIs.

- **better-sqlite3 in main process only**: SQLite is synchronous. Runs in main, never renderer.
  All DB access goes through IPC channels.

- **WAL journal mode**: Allows concurrent reads without blocking writes. Better performance
  for a desktop app with occasional background backup operations.

- **electron-store for settings**: Lightweight key-value store backed by JSON file in %APPDATA%.
  Used for: theme, sidebarCollapsed, dataPath, companyName, ownerName, fmcsaWebKey, etc.

- **Zustand for renderer state**: settingsStore (theme, sidebar, business prefs),
  authStore (current user + role-based permission checks), uiStore (transient state: global search open).

- **Repository pattern**: All DB queries in electron/main/repositories/. ipcHandlers.ts calls
  repo functions. The renderer never imports better-sqlite3 or any repo file directly.

## Directory Structure

```
app/
├── electron/
│   ├── main/
│   │   ├── index.ts              Main process entry, BrowserWindow, lifecycle
│   │   ├── db.ts                 SQLite init, runMigrations(), WAL, backup wiring
│   │   ├── ipcHandlers.ts        All IPC handler registrations (~70 channels)
│   │   ├── analytics.ts          Analytics aggregation queries
│   │   ├── backup.ts             Auto daily + manual backup; staged restore
│   │   ├── dashboard.ts          Dashboard KPI query (getDashboardStats)
│   │   ├── dispatcherBoard.ts    Dispatcher board SQL (dispatch-mode loads only)
│   │   ├── fmcsaApi.ts           FMCSA QCMobile HTTP client + SAFER scraper
│   │   ├── fmcsaImport.ts        FMCSA lead import pipeline + backfill
│   │   ├── csvLeadImport.ts      CSV/TSV lead import with header detection
│   │   ├── loadScanner.ts        Load recommendation engine (dispatch-mode loads only)
│   │   ├── operations.ts         Operations page driver/load queries (dispatch-mode only)
│   │   ├── profitRadar.ts        Profit radar queries (dispatch-mode loads only)
│   │   ├── scheduler.ts          Background job ticker (minute-tick setInterval)
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
│   │   │   ├── outreachRepo.ts   (outreach_refresh_log + performance queries)
│   │   │   ├── datPostingsRepo.ts      (dat_postings — broker load DAT board entries)
│   │   │   ├── carrierOffersRepo.ts    (carrier_offers — carrier bids on broker loads)
│   │   │   ├── brokerCarrierVettingRepo.ts (broker_carrier_vetting — carrier compliance)
│   │   │   └── index.ts          Re-exports all repos
│   │   └── schema/
│   │       └── migrations.ts     Versioned DB migrations (44 applied)
│   └── preload/
│       └── index.ts              contextBridge → window.api (all namespaces)
├── src/
│   ├── main.tsx                  React entry point
│   ├── App.tsx                   HashRouter + all 12 routes
│   ├── index.css                 Tailwind directives + dark/light CSS vars
│   ├── pages/                    One page component per route
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
│   │   ├── Help.tsx              Articles + Glossary + keyboard shortcuts
│   │   └── Settings.tsx          Theme, business info, backup, integrations
│   ├── components/
│   │   ├── layout/               AppShell, Sidebar, TopBar
│   │   ├── ui/                   GlobalSearch overlay, EmptyState
│   │   ├── brokers/              BrokerDrawer, BrokersTable, BrokerModal
│   │   ├── drivers/              DriverDrawer, DriversTable, DriverModal
│   │   ├── leads/                LeadDrawer, LeadsTable, LeadModal, LeadsToolbar, PasteImportModal
│   │   ├── loads/                LoadDrawer, LoadsTable, LoadModal
│   │   ├── invoices/             InvoiceDrawer, InvoicesTable, InvoiceModal
│   │   └── tasks/                TaskDrawer, TaskModal, TasksToolbar, constants
│   ├── lib/
│   │   ├── postTemplates.ts      78 marketing post templates (11 categories)
│   │   ├── marketingUtils.ts     Anti-repetition scoring, variation generator, image prompts
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
│       ├── helpArticles.ts       Static help content (articles, shortcuts)
│       └── industryTerms.ts      Trucking industry terms and acronyms index (60+ terms)
├── CLAUDE.md
├── README.md
├── package.json
├── electron.vite.config.ts
├── tsconfig.json
├── tailwind.config.js            CJS (module.exports) — not ESM
└── postcss.config.js             CJS (module.exports) — not ESM
```

## IPC Channels

All channels are invoked via `ipcRenderer.invoke()` from the preload and accessed in the renderer
as `window.api.<namespace>.<method>()`.

| Channel | Description |
|---------|-------------|
| settings:get | Get one electron-store setting by key |
| settings:set | Set one electron-store setting |
| settings:getAll | Get all settings as object |
| dashboard:stats | KPI counts + today's task list |
| leads:list | List all leads (with optional filters) |
| leads:get | Get one lead by id |
| leads:create | Insert new lead |
| leads:update | Update lead fields |
| leads:delete | Delete lead by id |
| leads:importFmcsa | Run FMCSA import pipeline |
| leads:importCsv | Open file dialog + parse CSV |
| leads:importPaste | Parse TSV text pasted from spreadsheet |
| leads:backfillLeadData | Re-enrich existing FMCSA leads from SAFER |
| drivers:list / get / create / update / delete | Driver CRUD |
| driverDocuments:list / get / create / update / delete | Driver document CRUD |
| loads:list / get / create / update / delete | Load CRUD |
| brokers:list / get / create / update / delete | Broker CRUD |
| invoices:list / get / create / update / delete | Invoice CRUD |
| tasks:list / get / create / update / delete | Task CRUD |
| tasks:markComplete / markIncomplete | Per-date completion tracking |
| tasks:getCompletions / getCompletionsForDate | Completion history queries |
| notes:list / create / delete | Notes on any entity |
| users:list / get / getByEmail / create / update | User management |
| audit:list | Audit log query |
| documents:list / get / create / update / delete / search | Document library CRUD |
| marketing:groups:list / create / update / markPosted / delete | Group manager |
| marketing:post:list / create / update / delete / recentIds / usageCounts | Post log |
| backup:createBackup | Manual backup |
| backup:listBackups | List backup files |
| backup:stageRestore | Stage a restore for next launch |
| search:global | Cross-entity search (leads, drivers, loads, brokers, invoices) |
| scanner:recommendLoads | Load opportunity recommendations (dispatch-mode loads only) |
| dispatcher:board / availableLoads / assignLoad | Dispatcher board queries (dispatch-mode loads only) |
| datPostings:list / get / create / update / delete | DAT board posting CRUD (broker loads) |
| carrierOffers:list / get / create / update / delete / accept | Carrier offer CRUD + atomic acceptance |
| brokerVetting:get / upsert / delete | Broker carrier vetting record per load |
| dev:seed / reseed / seedMissing / seedTasksOnly / clearSeedData / reseedDocs | Dev tools |
| db:query | Read-only SQL query (dev builds only, gated by !app.isPackaged) |

## Database Schema

20+ tables across 44 migrations. Full schema in docs/DATA_ARCHITECTURE.md.

```
WAL journal mode, synchronous=NORMAL, cache_size=-32000
All tables: INTEGER PRIMARY KEY AUTOINCREMENT
All timestamps: ISO 8601 TEXT
```

## Build Output

electron-vite + rolldown outputs to `out/`:
```
out/main/index.mjs      Main process bundle (~9 KB)
out/preload/index.mjs   Preload bundle
out/renderer/           Vite-built React app (HTML + JS + CSS)
```

## Theme System

- Type: `'dark' | 'light' | 'system'`
- Applied by toggling `.dark` class on `<html>` element
- Tailwind `darkMode: 'class'` reads this class
- Persisted to electron-store on every change
- Light mode overrides defined in `src/index.css` under `html:not(.dark)`
