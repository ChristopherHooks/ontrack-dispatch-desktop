# Session Log — OnTrack Dispatch Dashboard

Reverse-chronological. Most recent session at the top.

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
