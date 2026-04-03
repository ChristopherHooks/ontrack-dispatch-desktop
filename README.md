# OnTrack Dispatch Dashboard

A local-first Electron desktop application for trucking dispatch operations.
Built for **OnTrack Hauling Solutions** by Chris Hooks.

---

## Features

| Module | Description |
|--------|-------------|
| **Dashboard** | Daily KPIs: drivers needing loads, loads in transit, follow-up leads, outstanding invoices |
| **Dispatcher** | Live driver board grouped by status with RPM, route, and broker flag coloring |
| **Leads** | Carrier CRM: kanban, call logs, lead scoring, FMCSA import, CSV/paste import, SAFER links |
| **Drivers** | Driver profiles, CDL/insurance expiry alerts, document management |
| **Loads** | Full 7-stage dispatch lifecycle: Searching → Booked → In Transit → Delivered → Paid |
| **Brokers** | Broker database with flag management, payment terms, performance history |
| **Invoices** | Generate, send, and track dispatch invoices with CSV/print export |
| **Tasks** | Daily dispatch checklist with recurring tasks and per-date completion history |
| **Marketing** | Daily post workflow: suggested post, anti-repetition, variation generator, group rotation, image prompts |
| **Documents** | Markdown SOP library: 20 comprehensive docs, category filter, folder scanning |
| **Analytics** | Revenue, RPM, lead conversion, lane profitability, broker performance |
| **Help** | Searchable SOPs, workflow walkthroughs, keyboard shortcuts, industry terms index |
| **Settings** | Theme, business info, backup/restore, FMCSA integration, Google Drive sync notes |

---

## Tech Stack

| Item | Version |
|------|---------|
| Electron | 32.3.3 LTS |
| React | 18 |
| TypeScript | 5.4 |
| Bundler | electron-vite 5 (rolldown) |
| Database | better-sqlite3 v12.6.2 (local SQLite) |
| State | Zustand |
| Router | React Router v6 (HashRouter) |
| Styles | Tailwind CSS 3, dark mode |
| Settings | electron-store |

---

## Prerequisites

- **Node.js** 18+ (LTS recommended)
- **npm** 9+
- Windows 10/11 (primary target; macOS and Linux should work but are untested)

---

## Setup & Development

```bash
# 1. Clone the repository
git clone <repo-url>
cd ONTRACK_v2/app

# 2. Install dependencies
npm install

# 3. Rebuild native modules for Electron
npx electron-rebuild

# 4. Start dev server
npm run dev
```

The app opens automatically. Hot-reload is active for renderer code.
Main process changes require a manual restart (`Ctrl+C` then `npm run dev`).

---

## Building for Production

```bash
# Type-check + bundle
npm run build

# Package as installer (electron-builder)
npm run package
```

Output: `dist/` directory with platform-specific installer.

---

## Data Storage

All data is stored locally:

```
%APPDATA%/OnTrack Dispatch Dashboard/OnTrackDashboard/
  database.db          # SQLite database (WAL mode)
  backups/             # Auto-daily + manual backups
    YYYY-MM-DD.db
  documents/           # Scanned operational documents
```

### Backup & Restore
- **Auto backup**: created on launch (once per day) and every 6 hours
- **Manual backup**: Settings → Backup & Restore → Create Backup Now
- **Restore**: click Restore on any backup; restart app to apply

### Google Drive Sync
Move the `OnTrackDashboard/` folder into a Google Drive directory.
**Never open the app on two computers simultaneously** — SQLite is single-writer.

---

## Database Schema

9 migrations applied automatically on startup:

| Migration | Description |
|-----------|-------------|
| 001 | Initial schema: leads, drivers, brokers, loads, invoices, tasks, documents, users |
| 002 | driver_documents, task_completions, notes, app_settings, backups, audit_log; new columns |
| 003 | content + updated_at columns for documents table |
| 004 | current_location column for drivers |
| 005 | updated_at on notes and driver_documents |
| 006 | dot_number column on leads; backfill FMCSA DOT values from mc_number |
| 007 | fleet_size column on leads (Power Units from FMCSA SAFER) |
| 008 | marketing_groups table (group rotation tracker) |
| 009 | marketing_post_log table; truck_type_tags, region_tags, active columns on marketing_groups |

---

## FMCSA Lead Import

OnTrack pulls carrier prospects directly from the FMCSA SAFER database and adds them as leads.

### Setup

1. Register for a free API key at [mobile.fmcsa.dot.gov/QCDevsite/home](https://mobile.fmcsa.dot.gov/QCDevsite/home) using your Login.gov account.
2. After approval, copy your **web key** (a long alphanumeric string).
3. In OnTrack, go to **Settings → Integrations** and paste the key. Click Save.
4. Optionally update the **Search Terms** — each term runs a paginated API search. Default terms target the top 8 US freight-volume states: `Texas, Georgia, Illinois, Tennessee, Ohio, Florida, Indiana, Pennsylvania`.

### Running an Import

- Go to **Leads** → click **Import FMCSA Leads** in the toolbar.
- A progress banner appears while the import runs (typically 2-5 minutes for 8 search terms).
- Summary shows how many leads were found, added, and skipped.

### How It Works

1. Searches the FMCSA QCMobile API (`/carriers/name/{term}`) for each search term, fetching up to **3 pages × 50 results = 150 carriers per term**.
2. Filters for carriers with **active common authority** (`commonAuthorityStatus = A`, `allowedToOperate = Y`).
3. For each qualifying carrier, fetches the public SAFER snapshot page to retrieve phone number, MCS-150 date, and fleet size (Power Units).
4. Fetches the MC docket number — carriers without an MC docket are skipped (no operating authority for hire).
5. **Authority age filter**: carriers with a known authority date outside the 30–180 day window are skipped. Carriers with no date are kept.
6. Deduplicates by DOT number against existing DB records. Safe to re-run.
7. Assigns priority: **High** = 30-180 days old AND 1-3 trucks; **Medium** = one condition met; **Low** = neither.

### Clickable SAFER Links

MC# and DOT# fields across the app (Leads, Drivers, Brokers, Dashboard) are clickable links. Clicking one opens the FMCSA SAFER carrier snapshot page for that carrier in your system browser.

### CSV / Paste Import

Leads can also be imported from a CSV file (File → Import CSV in Leads toolbar) or pasted directly from Excel/Google Sheets (Tab-separated). The importer auto-detects column headers and deduplicates by MC number.

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+K` | Open global search |
| `Esc` | Close overlay / modal / drawer |
| `?` | Open Help center |
| `F12` | Toggle DevTools (dev builds only) |

---

## Project Structure

```
app/
  electron/
    main/
      index.ts            # Electron main process
      db.ts               # SQLite init, migrations, WAL, backup
      ipcHandlers.ts      # All IPC handler registration (~50 channels)
      analytics.ts        # Analytics aggregation queries
      backup.ts           # Auto + manual backup logic
      dashboard.ts        # Dashboard KPI query
      dispatcherBoard.ts  # Dispatcher board SQL query
      fmcsaApi.ts         # FMCSA QCMobile HTTP client + SAFER scraper
      fmcsaImport.ts      # FMCSA lead import pipeline
      csvLeadImport.ts    # CSV/TSV lead import with header detection
      loadScanner.ts      # Load recommendation engine
      scheduler.ts        # Background job ticker
      search.ts           # Global search query
      seed.ts             # Dev seed data (guarded, ids start at 101)
      repositories/       # Data access layer (one file per entity)
      schema/
        migrations.ts     # All 9 DB migrations
    preload/
      index.ts            # contextBridge IPC API (window.api)
  src/
    pages/                # One page component per route (12 pages)
    components/
      layout/             # AppShell, Sidebar, TopBar
      ui/                 # GlobalSearch, EmptyState
      brokers/ drivers/ leads/ loads/ invoices/ tasks/
    lib/
      postTemplates.ts    # 78 marketing post templates
      marketingUtils.ts   # Anti-repetition, variations, image prompts
      saferUrl.ts         # FMCSA SAFER URL builder
    store/
      settingsStore.ts    # Theme, sidebar, business settings
      authStore.ts        # User session + role permissions
      uiStore.ts          # Transient UI state (global search)
    types/
      models.ts           # All domain types
      global.d.ts         # window.api TypeScript declarations
    data/
      helpArticles.ts     # Static help content
```

---

## Owner

**Chris Hooks** — dispatch@ontrackhaulingsolutions.com
OnTrack Hauling Solutions
