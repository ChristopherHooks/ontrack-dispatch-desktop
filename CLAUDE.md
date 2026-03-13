# CLAUDE.md — OnTrack Dispatch Dashboard

This file is the primary grounding document for Claude Code.
Read this first. Then read the docs/ files listed below.

---

## What This Project Is

OnTrack Dispatch Dashboard is a local-first Electron desktop application for
OnTrack Hauling Solutions. It manages leads, drivers, loads, brokers, invoices,
daily dispatch tasks, and documents for a trucking dispatch operation.

Owner: Chris Hooks — dispatch@ontrackhaulingsolutions.com

---

## Grounding Documents (read in this order)

1. CLAUDE.md ← you are here
2. README.md
3. docs/ARCHITECTURE.md
4. docs/DECISIONS.md
5. docs/ROADMAP.md
6. docs/HANDOFF.md
7. docs/SESSION_LOG.md

---

## Core Operating Rules

### Stateless Contractor Mindset
Treat yourself as a stateless contractor. Re-ground from these docs at the start
of every session. Do not rely on prior chat context if it conflicts with repo files.
The repository is the source of truth.

### Before Coding — Always Do This First
1. Read the grounding documents above
2. Provide a re-grounding summary:
   - Current app state
   - Active constraints and rules
   - The task being asked for
   - Files to inspect before editing
   - What you will not touch unless necessary
3. Do not write code until the summary is complete

### Git Rules — Never Violate
- NEVER run: git commit, git push, git pull, git merge, git rebase, git reset, or force push
- NEVER modify main directly
- All commits are performed by Chris
- Your role: summarize diffs, suggest messages, list files, provide commands for Chris to run

### Branching
- main → stable, always runnable
- dev → integration branch
- feature/* → new feature work
- fix/* → bug fixes

### Three-Phase Workflow
Every task follows three phases:
- PHASE 1 RE-GROUND: read docs, summarize, list files, explain plan, identify risks
- PHASE 2 IMPLEMENT: minimum necessary changes only — no scope creep
- PHASE 3 WRAP-UP: summary, file list, test checklist, commit message, git commands

### Scope Discipline
- Keep changes tightly scoped to the requested task
- Do not refactor unrelated code
- Do not rename files unless necessary
- Do not change dependencies unless required
- Prefer the smallest safe fix
- Repo files are authoritative and chats are disposable.

---

## Quick Tech Reference

| Item | Value |
|------|-------|
| Electron | 32.3.3 LTS |
| React | 18 |
| TypeScript | Yes |
| Bundler | electron-vite 5 (rolldown) |
| Database | better-sqlite3 v12.6.2 |
| State | Zustand |
| Router | React Router v6, HashRouter |
| Styles | Tailwind CSS 3, darkMode: class |
| Settings | electron-store |

**Critical:** Do NOT use `externalizeDepsPlugin()` — deprecated in electron-vite v5.
Use explicit `rollupOptions.external` instead. See docs/DECISIONS.md.

**Critical:** Do NOT add `"type":"module"` to package.json.
Rolldown outputs `.mjs` (always ESM) without it. With it, preload breaks in Electron 32.

---

## Default Run Command

```
cd app && npm run dev
```

---

## End-of-Session Rule

When Chris asks for a handoff or wrap-up, update or propose updates to:
- docs/HANDOFF.md
- docs/SESSION_LOG.md
