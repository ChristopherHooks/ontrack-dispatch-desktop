# OnTrack Dispatch Dashboard

A local-first Electron desktop application for trucking dispatch operations.
Built for **OnTrack Hauling Solutions** by Chris Hooks.

---

## Features

| Module | Description |
|--------|-------------|
| **Dashboard** | Daily KPIs: drivers needing loads, loads in transit, follow-up leads, outstanding invoices |
| **Dispatcher** | Live driver board grouped by status with RPM, route, and broker flag coloring |
| **Leads** | Carrier CRM with kanban, call logs, lead scoring, follow-up tracking, and FMCSA import |
| **Drivers** | Driver profiles, CDL/insurance expiry alerts, document management |
| **Loads** | Full dispatch lifecycle: Searching → Booked → In Transit → Delivered → Paid |
| **Brokers** | Broker database with flag management, payment terms, performance history |
| **Invoices** | Generate, send, and track dispatch invoices with CSV/print export |
| **Tasks** | Daily dispatch checklist with recurring tasks and completion history |
| **Documents** | Markdown SOP library with category management and inline viewer/editor |
| **Analytics** | Revenue, RPM, lead conversion, lane profitability, broker performance |
| **Help** | Searchable SOPs, workflow walkthroughs, and keyboard shortcuts |
| **Settings** | Theme, business info, backup/restore, Google Drive sync notes |

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
  documents/           # (reserved for future file attachments)
```

### Backup & Restore
- **Auto backup**: created on launch (once per day)
- **Manual backup**: Settings → Backup & Restore → Create Backup Now
- **Restore**: click Restore on any backup; restart app to apply

### Google Drive Sync
Move the `OnTrackDashboard/` folder into a Google Drive directory.
**Never open the app on two computers simultaneously** — SQLite is single-writer.

---

## Database Schema

3 migrations applied automatically on startup:

| Migration | Description |
|-----------|-------------|
| 001 | Initial schema: leads, drivers, brokers, loads, invoices, tasks, documents, users |
| 002 | driver_documents, task_completions, notes, app_settings, backups, audit_log |
| 003 | content + updated_at columns for documents table |

---

## FMCSA Lead Import

OnTrack can pull carrier prospects directly from the FMCSA SAFER database and add them as leads.

> **No web key yet?** The import runs automatically in **mock mode** when no key is configured — generating 14 synthetic leads so the full pipeline (UI banner, dedup, auto-refresh, timestamp) can be tested without a real API key.

### Setup

1. **Register for a free API key** at [mobile.fmcsa.dot.gov/QCDevsite/home](https://mobile.fmcsa.dot.gov/QCDevsite/home) using your Login.gov account.
2. After approval, copy your **web key** (a long alphanumeric string).
3. In OnTrack, go to **Settings → Integrations** and paste the key. Click **Save**.
4. Optionally update the **Search Terms** — each term triggers one API call. Defaults: `Texas, Georgia, Illinois, Tennessee, Ohio, Colorado, Arizona`.

### Running an Import

- Go to **Leads** → click **Import FMCSA Leads** (top-right toolbar button).
- A progress banner appears while the import runs.
- On completion, a summary shows how many leads were found, added, and skipped.

### How It Works

- Searches the FMCSA QCMobile API (`/carriers/name/{term}`) for each search term.
- Filters for carriers with **active common authority** (`commonAuthorityStatus = A`, `allowedToOperate = Y`).
- Deduplicates by DOT number within the batch and against existing DB records (stored as `DOT-{dotNumber}` in the `mc_number` field).
- Adds new carriers as `status = New`, `source = FMCSA`.
- Safe to re-run — existing records are never duplicated.

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+K` | Open global search |
| `Esc` | Close overlay / modal / drawer |
| `?` | Open Help center |

---

## Project Structure

```
app/
  electron/
    main/
      index.ts            # Electron main process
      db.ts               # SQLite init, migrations, WAL
      ipcHandlers.ts      # All IPC handler registration
      analytics.ts        # Analytics aggregation queries
      search.ts           # Global search query
      backup.ts           # Auto + manual backup logic
      scheduler.ts        # Background job ticker
      dispatcherBoard.ts  # Dispatcher board SQL query
      fmcsaApi.ts         # FMCSA QCMobile HTTP client
      fmcsaImport.ts      # FMCSA lead import logic
      repositories/       # Data access layer (one file per entity)
      schema/
        migrations.ts     # All DB migrations
    preload/
      index.ts            # contextBridge IPC API
  src/
    pages/                # One page component per route
    components/
      layout/             # AppShell, Sidebar, TopBar
      ui/                 # GlobalSearch, EmptyState
      brokers/ drivers/ leads/ loads/ invoices/ tasks/
    store/
      settingsStore.ts    # Theme, sidebar, business settings
      uiStore.ts          # Transient UI state (global search)
    types/
      models.ts           # All domain types
      global.d.ts         # window.api type declarations
    data/
      helpArticles.ts     # Static help content
```

---

## Owner

**Chris Hooks** — dispatch@ontrackhaulingsolutions.com  
OnTrack Hauling Solutions
