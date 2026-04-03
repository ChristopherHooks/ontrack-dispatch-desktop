# Electron Architecture Rules

These rules must always be followed when modifying the OnTrack Desktop App.

## Process Separation

Electron has three execution environments:

Main Process
- Runs in Node.js
- Controls application lifecycle
- Creates BrowserWindows
- Handles OS interaction

Preload Script
- Secure bridge between renderer and main
- Uses contextBridge
- Exposes safe APIs to the renderer

Renderer Process
- React / Vite frontend
- Runs in the browser environment
- Must NOT import Node modules directly

## File Boundaries

electron/main/*
- Electron lifecycle
- window creation
- IPC handlers
- filesystem access

electron/preload/*
- contextBridge
- exposed APIs

src/*
- React UI
- business logic
- application state

## Forbidden Actions

Renderer must NEVER:
- import electron
- import fs
- import path
- access Node APIs

Renderer must communicate with main through IPC only.

## IPC Contracts

All IPC types must be defined in:

src/types/ipc.ts

Renderer → Preload → Main

Never bypass this structure.

## Build Expectations

Main entry:
electron/main/index.ts

Preload entry:
electron/preload/index.ts

Renderer entry:
src/main.tsx