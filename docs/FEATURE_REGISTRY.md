# OnTrack Dispatch Desktop App — Feature Registry

This document tracks implemented, in-progress, and planned features so AI assistants do not duplicate work or invent conflicting systems.

AI assistants must read this file before adding new features.

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
Document/SOP library  
Settings and configuration

---

# Feature Registry

## 1. App Shell / Navigation
Status: Implemented

Purpose:
Provides the main desktop layout and top-level navigation.

Includes:
- Sidebar navigation
- Top bar
- App shell layout
- Page routing placeholders

Key files:
- src/components/layout/AppShell.tsx
- src/components/layout/Sidebar.tsx
- src/components/layout/TopBar.tsx

Notes:
This is the UI shell for all future modules.

---

## 2. Core Shared Types
Status: Implemented

Purpose:
Provides shared domain and IPC type definitions.

Includes:
- business domain models
- IPC contract types
- IPC channel definitions

Key files:
- src/types/domain.ts
- src/types/models.ts
- src/types/ipc.ts
- src/types/ipcChannels.ts

Notes:
All features must reuse these shared definitions.

---

## 3. Electron Architecture Guardrails
Status: Implemented

Purpose:
Prevents architectural drift between renderer, preload, and main.

Includes:
- Electron architecture rules
- AI development rules
- project map and context recovery docs

Key files:
- electron/ARCHITECTURE_RULES.md
- docs/AI_DEV_RULES.md
- docs/PROJECT_MAP.md

Notes:
These files are critical for AI-safe development.

---

## 4. Database Schema
Status: Implemented

Purpose:
Defines the local desktop data layer for the app.

Includes:
- schema definitions for core business entities
- local database structure
- development seed support

Key files:
- electron/main/schema/
- electron/main/seed.ts
- docs/DATA_ARCHITECTURE.md

Notes:
This replaces the Excel dashboard structure over time.

---

## 5. Repository Layer
Status: Implemented

Purpose:
Provides structured access to database entities.

Includes:
- repository classes/functions for CRUD operations
- separation between DB logic and UI

Key files:
- electron/main/repositories/

Notes:
UI must never access database logic directly.

---

## 6. IPC Handler Layer
Status: Planned

Purpose:
Connects renderer requests to Electron main process functionality.

Includes:
- IPC handlers for leads
- IPC handlers for drivers
- IPC handlers for loads
- IPC handlers for tasks
- settings handlers

Key files:
- electron/main/...
- electron/preload/...
- src/types/ipcChannels.ts

Notes:
Must be built before fully functional UI modules.

---

## 7. Leads Module
Status: Planned

Purpose:
Manage driver acquisition pipeline.

Expected capabilities:
- list and filter leads
- update lead status
- schedule follow-ups
- track source
- prepare for FMCSA imports

Expected files:
- src/pages/Leads.tsx
- src/features/leads/
- electron/main/repositories/LeadRepository*
- related IPC handlers

Business reference:
Driver Leads tab in the existing dashboard.

---

## 8. Drivers Module
Status: Planned

Purpose:
Manage signed drivers and carrier records.

Expected capabilities:
- driver profiles
- contact data
- equipment data
- preferred lanes
- minimum RPM
- active/inactive status

Expected files:
- src/pages/Drivers.tsx
- src/features/drivers/
- related repositories and IPC handlers

Business reference:
Active Drivers tab in the existing dashboard.

---

## 9. Loads Module
Status: Planned

Purpose:
Track booked and active loads.

Expected capabilities:
- create/edit loads
- track status pipeline
- associate drivers and brokers
- rate and mileage tracking
- delivery alerts

Expected files:
- src/pages/Loads.tsx
- src/features/loads/
- related repositories and IPC handlers

Business reference:
Active Loads tab in the existing dashboard.

---

## 10. Tasks Module
Status: Planned

Purpose:
Track recurring and operational tasks.

Expected capabilities:
- daily task list
- recurring task support
- due dates
- priority and status

Expected files:
- src/pages/Tasks.tsx
- src/features/tasks/
- related repositories and IPC handlers

Business reference:
Tasks tab in the existing dashboard.

---

## 11. Invoices Module
Status: Planned

Purpose:
Track dispatch fee billing and payment status.

Expected capabilities:
- invoice generation support
- payment status tracking
- outstanding balance visibility

Expected files:
- src/pages/Invoices.tsx
- src/features/invoices/
- related repositories and IPC handlers

Business reference:
Invoices tab in the existing dashboard.

---

## 12. Brokers Module
Status: Planned

Purpose:
Track broker contacts and packet status.

Expected capabilities:
- broker profiles
- notes
- packet completion status
- relationship tracking

Expected files:
- src/pages/Brokers.tsx
- src/features/brokers/

---

## 13. Marketing Module
Status: Planned

Purpose:
Support Facebook posting workflow and content queue visibility.

Expected capabilities:
- scheduled post viewing
- checklist tracking
- content calendar visibility

Expected files:
- src/pages/Marketing.tsx
- src/features/marketing/

---

## 14. Documents / SOP Library
Status: Planned

Purpose:
Provide searchable access to SOPs and operational documents.

Expected capabilities:
- searchable SOP library
- category filtering
- inline document display

Expected files:
- src/pages/Documents.tsx
- src/features/documents/

Business reference:
The SOP/help library described in the operations docs.

---

## 15. Settings Module
Status: Planned

Purpose:
Manage application configuration.

Expected capabilities:
- business profile settings
- dispatch defaults
- backup/export controls
- future sync settings

Expected files:
- src/pages/Settings.tsx
- src/features/settings/

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