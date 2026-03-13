# Architecture — OnTrack Dispatch Dashboard

## Process Model

```
┌─────────────────────────────────────────────────────┐
│  Electron Main Process (Node.js)                     │
│  electron/main/index.ts   — app lifecycle, BrowserWindow │
│  electron/main/db.ts      — SQLite init, schema, backup  │
│  electron/main/ipcHandlers.ts — IPC channel handlers     │
└──────────────────────┬──────────────────────────────┘
                       │ IPC (contextBridge)
┌──────────────────────▼──────────────────────────────┐
│  Preload Script (isolated context)                   │
│  electron/preload/index.ts — exposes window.api      │
└──────────────────────┬──────────────────────────────┘
                       │ window.api.*
┌──────────────────────▼──────────────────────────────┐
│  Renderer Process (React + Vite)                     │
│  src/main.tsx → src/App.tsx → pages + components     │
└─────────────────────────────────────────────────────┘
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
  Used for: theme, sidebarCollapsed, dataPath, companyName, ownerName, etc.

- **Zustand for renderer state**: settingsStore (theme, sidebar, business prefs) and
  authStore (current user + role-based permission checks).

## Directory Structure

```
app/
├── electron/
│   ├── main/
│   │   ├── index.ts          Main process entry, BrowserWindow creation
│   │   ├── db.ts             SQLite init, schema migrations, auto-backup
│   │   └── ipcHandlers.ts    All IPC channel registrations
│   └── preload/
│       └── index.ts          contextBridge → window.api
├── src/
│   ├── main.tsx              React entry point
│   ├── App.tsx               HashRouter + all 12 routes
│   ├── index.css             Tailwind directives + dark/light CSS vars
│   ├── components/
│   │   └── layout/
│   │       ├── AppShell.tsx  Sidebar + TopBar + <Outlet>
│   │       ├── Sidebar.tsx   Collapsible nav, 12 items, toggle button
│   │       └── TopBar.tsx    Theme switcher + user badge
│   ├── pages/
│   │   ├── Dashboard.tsx     KPI cards + today's tasks (BUILT)
│   │   ├── Settings.tsx      Theme + business prefs (BUILT)
│   │   └── [10 placeholders] Leads, Drivers, Loads, Brokers, Invoices,
│   │                         Marketing, Tasks, Documents, Analytics, Help
│   ├── store/
│   │   ├── settingsStore.ts  Zustand: theme, sidebar, prefs
│   │   └── authStore.ts      Zustand: user session, role, can()
│   └── types/
│       ├── auth.ts           UserRole type + ROLE_PERMISSIONS matrix
│       └── global.d.ts       window.api TypeScript declarations
├── CLAUDE.md
├── README.md
├── package.json
├── electron.vite.config.ts
├── tsconfig.json
├── tailwind.config.js        CJS (module.exports) — not ESM
└── postcss.config.js         CJS (module.exports) — not ESM
```

## IPC Channels

| Channel | Direction | Description |
|---------|-----------|-------------|
| settings:get(key) | renderer→main | Get one setting value |
| settings:set(key, value) | renderer→main | Set one setting value |
| settings:getAll() | renderer→main | Get all settings as object |
| dashboard:stats() | renderer→main | KPI counts + today's tasks |
| db:query(sql, params) | renderer→main | Read-only dev helper |

## Database Schema

```sql
-- All tables use INTEGER PRIMARY KEY AUTOINCREMENT
-- All timestamps stored as ISO 8601 TEXT
-- Foreign keys: ON
-- WAL journal mode, synchronous=NORMAL, cache_size=-32000

leads     (id, company_name, contact_name, phone, email, status,
           source, notes, follow_up_date, created_at, updated_at)

drivers   (id, name, phone, email, cdl_number, cdl_expiry, status,
           truck_number, trailer_type, home_base, notes, created_at)

loads     (id, driver_id, broker_id, origin, destination, pickup_date,
           delivery_date, rate, dispatch_fee, status, notes, created_at)

brokers   (id, company_name, contact_name, phone, email, mc_number,
           preferred, notes, created_at)

invoices  (id, load_id, driver_id, amount, status, sent_date,
           paid_date, notes, created_at)

tasks     (id, title, category, priority, status, due_date,
           time_of_day, recurring, notes, created_at)

documents (id, name, type, file_path, related_to, related_id,
           notes, created_at)

users     (id, name, email, role, active, created_at)
```

## Seed Data

On first launch, 6 daily tasks are seeded with explicit IDs 1–6:
- A dedup DELETE runs every launch before the INSERT OR IGNORE
- This prevents duplicate rows if the app launches before seeding is detected

## Build Output

electron-vite + rolldown outputs to `out/`:
```
out/main/index.mjs      Main process bundle (9 KB)
out/preload/index.mjs   Preload bundle
out/renderer/           Vite-built React app (HTML + JS + CSS)
```

## Theme System

- Type: `'dark' | 'light' | 'system'`
- Applied by toggling `.dark` class on `<html>` element
- Tailwind `darkMode: 'class'` reads this class
- Persisted to electron-store on every change
- Light mode overrides defined in `src/index.css` under `html:not(.dark)`
