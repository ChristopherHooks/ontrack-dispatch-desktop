# OnTrack Dispatch Dashboard

Owner: Chris Hooks | OnTrack Hauling Solutions LLC
Stack: Electron 32.3.3 + React 18 + TypeScript + Tailwind CSS + SQLite

## Quick Start

  cd app && npm install && npm run dev

## Build for Production

  npm run package:win
  Output: dist/OnTrack Dispatch Dashboard Setup.exe

## Project Structure

  app/
  +-- electron/main/index.ts       (Electron main process)
  +-- electron/main/db.ts          (SQLite init, schema, auto-backup)
  +-- electron/main/ipcHandlers.ts (IPC: settings, dashboard stats)
  +-- electron/preload/index.ts    (contextBridge API)
  +-- src/main.tsx                 (React entry)
  +-- src/App.tsx                  (Router + layout root)
  +-- src/index.css                (Tailwind + dark/light theme)
  +-- src/components/layout/AppShell.tsx  (Sidebar+TopBar+Outlet)
  +-- src/components/layout/Sidebar.tsx   (Collapsible nav, 12 routes)
  +-- src/components/layout/TopBar.tsx    (Theme toggle + user badge)
  +-- src/pages/Dashboard.tsx     (KPIs + task checklist - BUILT)
  +-- src/pages/Settings.tsx      (Theme + prefs - BUILT)
  +-- src/pages/[10 placeholders] (Phase 1 ready)
  +-- src/store/settingsStore.ts  (Zustand: theme, sidebar, prefs)
  +-- src/store/authStore.ts      (Zustand: user, role, can())
  +-- src/types/auth.ts           (UserRole, permissions matrix)
  +-- src/types/global.d.ts       (window.api types)
  +-- docs/                       (Architecture, decisions, roadmap, handoff, session log)
  +-- CLAUDE.md                   (Primary grounding doc for Claude Code)

## Database (SQLite)

Location: %APPDATA%/ontrack-dispatch-dashboard/OnTrackDashboard/database.db

Tables: leads, drivers, loads, brokers, invoices, tasks, documents, users
Seeded: 6 default daily tasks + Admin user
Auto-backup: backups/YYYY-MM-DD.db on every launch

## Google Drive Sync

1. Move OnTrackDashboard/ into your Google Drive folder
2. In Settings > Data Storage, set the custom data path
3. Do the same on your second computer
Note: WAL mode enabled. Do not write simultaneously from both machines.

## Theme

Dark (default) | Light | System
Toggle from TopBar or Settings. Persisted via electron-store.
.dark class on <html>, Tailwind darkMode: class

## Roles

Admin      - full access
Dispatcher - drivers, loads, brokers, invoices, tasks, documents
Sales      - leads + dashboard only

## Phase Roadmap

Foundation - Scaffold, routing, theme, SQLite, AppShell     - DONE
Phase 1    - Leads, Drivers, Loads, Brokers, Invoices, Tasks - Next
Phase 2    - Marketing, Documents, Analytics, Help/SOPs      - Future
Phase 3    - FMCSA import, AI, Driver portal                 - Future
