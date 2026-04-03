# AI Development Rules — OnTrack Desktop App

These rules govern how AI assistants (Claude Code, ChatGPT, etc.) may modify this repository.

Failure to follow these rules causes architectural drift, unstable builds, and security risks.

AI agents MUST read this file before making any changes.

---

# 1. Architecture Overview

This is an Electron + React desktop application.

Architecture layers:

Renderer (React UI)
↓
Preload bridge
↓
Electron main process
↓
Database + repositories

Rules:

Renderer NEVER talks directly to the database.
Renderer NEVER imports Electron APIs.
Renderer ONLY communicates through IPC.

---

# 2. File Responsibility

Renderer UI

src/
pages/
components/
store/

Electron Main Process

electron/main/

Electron Preload

electron/preload/

Types

src/types/

Documentation

docs/

---

# 3. IPC Rules

All IPC channel type declarations are in:

src/types/global.d.ts  (window.api ambient declarations)

Do not invent new channel strings.

All IPC communication must go through the preload bridge.

Renderer code may NOT call ipcMain or access Node APIs directly.

---

# 4. Database Rules

All database logic must live in:

electron/main/repositories/

Schemas must live in:

electron/main/schema/

UI components must NEVER access the database.

They must call an IPC handler.

---

# 5. Data Models

Domain models must be defined in:

src/types/

Do not redefine models in multiple places.

All layers must import shared types.

---

# 6. Commit Safety Rules

AI must NEVER automatically commit code.

AI must:

1. Describe the change
2. Show modified files
3. Ask the human to review
4. Wait for approval before committing

---

# 7. Forbidden Actions

AI may NOT:

- modify package.json dependencies without explanation
- change Electron security settings
- add Node APIs to renderer code
- bypass IPC architecture
- add build artifacts to the repo
- modify Git history

---

# 8. Development Order

Features must be implemented in this order:

1. types
2. schema
3. repository
4. IPC handler
5. UI

Do not build UI before backend logic exists.

---

# 9. Context Recovery

When a new AI session begins, the AI must read:

CLAUDE.md
docs/ARCHITECTURE.md
docs/DATA_ARCHITECTURE.md
docs/AI_DEV_RULES.md
src/types/

Then summarize understanding before writing code.

---

# 10. Purpose of This App

This application is a **dispatch operations platform for a trucking dispatch company**.

Primary modules:

Lead pipeline
Driver management
Load tracking
Invoicing
Tasks
Broker management

The app replaces the Excel dashboard currently used for dispatch operations.

---

End of rules.