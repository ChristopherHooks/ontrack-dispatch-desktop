# OUTREACH_ENGINE_SPEC.md

Comprehensive implementation reference for the OnTrack Hauling Solutions Outreach Engine.
Last updated: 2026-04-15

---

## 1. Architecture Overview

The Outreach Engine is a zero-AI-cost daily post generator. It runs entirely on
the local machine using deterministic logic seeded by the current date. There are
no API calls, no network requests, and no per-generation cost. The system produces
5 group posts and 1 business page post per click.

The architecture has three layers:

**Renderer (src/lib/outreachEngine.ts)** — All post generation lives here. The
engine holds every template, hook, CTA, pain point, and benefit bank in memory.
It exposes a single generation function. No DB access occurs at generation time.

**Main process (electron/main/repositories/outreachRepo.ts)** — Handles the two
DB-backed features: weekly refresh tracking and post performance aggregation.
Both read from tables that already exist (outreach_refresh_log and
marketing_post_log). The repo follows the same pattern as every other repo in
the codebase.

**IPC bridge** — Four channels connect renderer to main for the DB features.
The post generation itself never crosses the bridge.

---

## 2. Database Schema

### outreach_refresh_log

Created in migration 039.

```sql
CREATE TABLE IF NOT EXISTS outreach_refresh_log (
  id                   INTEGER PRIMARY KEY AUTOINCREMENT,
  refreshed_at         TEXT NOT NULL DEFAULT (datetime('now')),
  notes                TEXT,
  template_count_added INTEGER NOT NULL DEFAULT 0
)
```

Stores one row each time Chris logs a completed weekly template refresh. The
engine checks the most recent row to determine whether a refresh reminder should
appear.

### marketing_post_log (pre-existing, migration 035)

```sql
CREATE TABLE IF NOT EXISTS marketing_post_log (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  post_date        TEXT NOT NULL,
  group_id         INTEGER,
  group_name       TEXT,
  template_id      TEXT NOT NULL,
  hook_id          TEXT NOT NULL,
  cta_id           TEXT NOT NULL,
  post_type        TEXT NOT NULL CHECK (post_type IN ('group','page')),
  posted           INTEGER NOT NULL DEFAULT 0,
  replies_count    INTEGER NOT NULL DEFAULT 0,
  leads_generated  INTEGER NOT NULL DEFAULT 0,
  created_at       TEXT NOT NULL DEFAULT (datetime('now'))
)
```

Already existed before this feature. The Outreach Engine reads it for
performance aggregation only — it never writes to it (the Marketing page's
existing post log UI handles writes).

---

## 3. Generation Logic

### Entry point

```typescript
generateTodaysOutreach(
  vars: OutreachVars,
  recentlyUsedTemplateIds: Set<string>,
  seedOffset: number = 0
): OutreachResult
```

Called from Marketing.tsx when the user clicks "Generate today's posts" or
"Regenerate (next variation)".

`vars` is built from three dropdowns the user fills in once per session:
driver_type, lane_region, rpm_range. company_name is pulled from settings.

`recentlyUsedTemplateIds` is a Set of template IDs that have been used in the
past 14 days (queried from marketing_post_log before generation).

`seedOffset` starts at 0 and increments by 1 each time the user clicks
Regenerate, producing a different but still deterministic result.

### PRNG

Linear Congruential Generator seeded by date string + seedOffset. Pure
arithmetic — no Math.random().

```typescript
function makePrng(seed: number): () => number {
  let s = seed >>> 0
  return function next(): number {
    s = Math.imul(s, 1664525) + 1013904223
    s = s >>> 0
    return s / 0x100000000
  }
}

function dateToSeed(date: string, offset: number): number {
  let h = offset * 2654435761
  for (let i = 0; i < date.length; i++) {
    h = Math.imul(31, h) + date.charCodeAt(i)
  }
  return h >>> 0
}
```

The same date + same offset always produces the same posts. Different offsets
produce different results. This means generation is reproducible and debuggable
without any randomness.

### Template scoring and selection

Each template receives a score before selection:

- Base score: random float 0–1 from PRNG (ensures variety across calls)
- Recency penalty: -0.35 per day if used in last 14 days (oldest days count less)
- Driver type match bonus: +0.25 if the template's driver_types array includes
  the current driver_type value (or the template accepts all types)

Templates are sorted by score descending. The top 5 become group posts. The
page post is always generated from PAGE_POST_TEMPLATES, which is a separate
smaller bank.

The page post uses its own PRNG call derived from the same seed so it stays
consistent with the group posts.

### Variable substitution

After a template body is selected, these tokens are replaced:

| Token            | Source                              |
|------------------|-------------------------------------|
| {driver_type}    | OutreachVars.driver_type            |
| {lane_region}    | OutreachVars.lane_region            |
| {rpm_range}      | OutreachVars.rpm_range              |
| {company_name}   | OutreachVars.company_name           |
| {pain_point}     | Random pick from PAIN_POINTS bank   |
| {benefit}        | Random pick from BENEFITS bank      |

Picks for pain_point and benefit are also PRNG-seeded, so they are stable
across re-renders but change with Regenerate.

---

## 4. Humanization System

### Word-swap layer

Applied after variable substitution. 14 swap pairs are defined:

```typescript
const WORD_SWAPS: [string, string][] = [
  ['we are',       "we're"],
  ['I am',         "I'm"],
  ['do not',       "don't"],
  ['cannot',       "can't"],
  ['will not',     "won't"],
  ['it is',        "it's"],
  ['that is',      "that's"],
  ['there is',     "there's"],
  ['you are',      "you're"],
  ['they are',     "they're"],
  ['what is',      "what's"],
  ['here is',      "here's"],
  ['does not',     "doesn't"],
  ['did not',      "didn't"],
]
```

Each pair is applied with a 28% probability per occurrence. The probability
roll uses the PRNG so results are deterministic but feel varied across days.
Matching is case-insensitive; original casing is preserved in the output.

### Design intent

The templates themselves are written with deliberate imperfections: sentence
fragments, uneven paragraph lengths, contractions, punchy short CTAs. The
word-swap layer is a secondary pass that adds variation on top of the base
texture. Together they reduce the AI-generated feel without any actual AI
involvement at generation time.

---

## 5. UI Workflow Integration

### Outreach Engine tab (Marketing page, 4th tab)

The tab contains three sections:

**Configuration row** — Three dropdowns: Driver Type, Lane Region, RPM Range.
Values persist in component state for the session. These drive the OutreachVars
passed to the engine.

**Generate button** — Calls generateTodaysOutreach. Shows a spinner during the
synchronous-but-wrapped call. Result replaces any prior outreachResult in state.

**Regenerate button** — Increments outreachSeed by 1 and calls generate again.
The resulting variation is visually identical in structure but uses different
template/hook/CTA picks and different word-swap rolls.

**Post cards** — One OutreachPostCard per generated post. Each card shows:
- Post type badge (group / page)
- Template ID label (small, gray)
- Full post body
- Copy button that writes the post text to clipboard and shows a brief "Copied"
  confirmation per card

### Post History tab

The OutreachPerformancePanel component is shown at the bottom of the Post
History tab when total_posts > 0. It renders:

- Three stat tiles: Posts Logged, Total Replies, Leads Generated
- Top templates table (up to 5 rows): Template, Uses, Replies, Leads, Score
- Stale template warning block: shown when any template has 8+ uses and score 0
- Lowest performing table (up to 3 rows, 3+ uses only)

Score formula: replies + (leads * 3). Coloring: green >= 10, yellow >= 4,
gray = 0.

### Dashboard reminder banner

When Dashboard.tsx mounts, it calls outreach.getLastRefresh(). If the result is
null or older than 7 days, a dismissible blue banner appears above the Weekly
Revenue Target widget. The banner states how many days since the last refresh
(or that no refresh has been logged) and includes a "Go to Outreach" button
that navigates to /marketing. The banner is session-dismissed only (no DB
write) — it returns on next app launch until a real refresh is logged.

---

## 6. Weekly Refresh System

### Purpose

Templates go stale. Facebook group audiences see the same patterns and ignore
them. The system reminds Chris every 7 days to run the weekly AI plan: use
Claude claude.ai (the chat interface, not the app) to generate 5 fresh group
templates and 1 fresh page post template, then paste them into outreachEngine.ts.

### DB tracking

`outreach_refresh_log` stores each completed refresh. Only the most recent row
matters. The system never deletes rows — they serve as an audit trail of when
refreshes happened and how many templates were added each time.

To log a refresh, the app calls:

```typescript
window.api.outreach.logRefresh(notes: string | null, templateCountAdded: number)
```

The UI exposes a "Mark refresh done" button in the Outreach Engine tab whenever
the refresh banner is shown. That button calls logRefresh(null, 0) and then
reloads the meta state so the banner disappears.

### Stale detection logic (outreachRepo.ts)

```typescript
export function getLastRefresh(db: Database): OutreachRefreshEntry | null {
  return db.prepare(
    'SELECT * FROM outreach_refresh_log ORDER BY refreshed_at DESC LIMIT 1'
  ).get() as OutreachRefreshEntry | null
}
```

The renderer computes "needs refresh" from the returned row:

```typescript
const outreachNeedsRefresh = (() => {
  if (!lastRefresh) return true
  const days = Math.floor(
    (Date.now() - new Date(lastRefresh.refreshed_at).getTime()) / 86400000
  )
  return days >= 7
})()
```

---

## 7. Files and Functions Reference

### src/lib/outreachEngine.ts

Primary engine file. Never import in main process — renderer-only.

| Export | Purpose |
|--------|---------|
| OutreachVars | Input type: driver_type, lane_region, rpm_range, company_name |
| GeneratedPost | Output type: id, text, template_id, hook_id, cta_id, type |
| OutreachResult | Wrapper: group_posts[], page_post, generated_at |
| generateTodaysOutreach | Main entry point — call once per generate/regenerate |
| getWeeklyRefreshState | Legacy localStorage helper — no longer used in UI |
| markAiRefreshDone | Legacy localStorage helper — no longer used in UI |

Banks (all module-scoped, not exported):

| Constant | Count | Description |
|----------|-------|-------------|
| OUTREACH_TEMPLATES | 20 | Full post body templates with variable tokens |
| HOOKS | 20 | Opening line variants (2 per hook object) |
| CTAS | 15 | Closing call-to-action variants (2 per CTA object) |
| PAIN_POINTS | 15 | {pain_point} fill-in strings |
| BENEFITS | 15 | {benefit} fill-in strings |
| PAGE_POST_TEMPLATES | 5 | Business page post bodies |
| WORD_SWAPS | 14 | Humanization swap pairs |

### electron/main/repositories/outreachRepo.ts

| Function | Signature | Description |
|----------|-----------|-------------|
| getLastRefresh | (db) => OutreachRefreshEntry or null | Most recent refresh log row |
| logRefresh | (db, notes, templateCountAdded) => OutreachRefreshEntry | Insert new refresh row |
| getOutreachPerformance | (db) => OutreachTemplatePerf[] | Aggregated stats per template_id |
| getOutreachSummary | (db) => OutreachSummary | Totals + top template + stale list |

### electron/main/ipcHandlers.ts (outreach section)

| Channel | Handler |
|---------|---------|
| outreach:getLastRefresh | getLastRefresh(getDb()) |
| outreach:logRefresh | logRefresh(getDb(), notes, templateCountAdded) |
| outreach:performance | getOutreachPerformance(getDb()) |
| outreach:summary | getOutreachSummary(getDb()) |

### electron/preload/index.ts (outreach namespace)

```typescript
outreach: {
  getLastRefresh:  () => ipcRenderer.invoke('outreach:getLastRefresh'),
  logRefresh:      (notes, templateCountAdded) =>
                     ipcRenderer.invoke('outreach:logRefresh', notes, templateCountAdded),
  performance:     () => ipcRenderer.invoke('outreach:performance'),
  summary:         () => ipcRenderer.invoke('outreach:summary'),
},
```

### src/types/global.d.ts (outreach API types)

```typescript
outreach: {
  getLastRefresh: () => Promise<{
    id: number; refreshed_at: string; notes: string | null;
    template_count_added: number
  } | null>
  logRefresh: (notes: string | null, templateCountAdded: number) => Promise<{
    id: number; refreshed_at: string; notes: string | null;
    template_count_added: number
  }>
  performance: () => Promise<Array<{
    template_id: string; uses: number; total_replies: number;
    total_leads: number; score: number
  }>>
  summary: () => Promise<{
    total_posts: number; total_replies: number; total_leads: number;
    top_template_id: string | null; stale_template_ids: string[]
  }>
}
```

### src/components/marketing/OutreachPerformancePanel.tsx

Props: `{ summary: Summary; perf: PerfRow[] }`

Rendered inside Marketing.tsx Post History tab when `summary.total_posts > 0`.
No AI, no IPC — receives data as props that Marketing.tsx fetches on mount.

### src/pages/Dashboard.tsx (outreach section)

State added: `outreachRefreshDue`, `outreachRefreshDaysSince`, `outreachRefreshDismissed`.

Fetch added in useEffect: calls `window.api.outreach.getLastRefresh()` and sets
refresh-due state if null or >= 7 days old.

Banner added: blue-tinted dismissible alert block shown above Weekly Revenue
Target widget when refresh is due.

---

## 8. Output Format

A single call to generateTodaysOutreach returns:

```typescript
{
  group_posts: [
    {
      id: 'post-0',
      text: '...',          // fully assembled, humanized, ready to copy-paste
      template_id: 'ot-07', // for anti-repetition tracking
      hook_id:     'h-03',
      cta_id:      'c-11',
      type:        'group',
    },
    // ... 4 more
  ],
  page_post: {
    id:          'post-page',
    text:        '...',
    template_id: 'page-post',
    hook_id:     '',
    cta_id:      '',
    type:        'page',
  },
  generated_at: '2026-04-15T14:23:00.000Z',
}
```

Each post.text is the complete string to copy into Facebook. No further
processing is needed. The text already has newlines, no emojis, natural
contractions, and complete variable substitution.

---

## 9. Build Order

When making changes to the Outreach Engine, follow this dependency order to
avoid import errors:

1. **outreachEngine.ts** — standalone, no imports from the app
2. **migrations.ts** — add schema changes before any repo that depends on them
3. **outreachRepo.ts** — depends on the DB tables being present
4. **repositories/index.ts** — re-export new repo
5. **ipcHandlers.ts** — import from repo, register channels
6. **preload/index.ts** — expose channels via contextBridge
7. **global.d.ts** — add TypeScript types for the new API surface
8. **Component files** — Marketing.tsx, OutreachPerformancePanel.tsx, Dashboard.tsx

This order ensures that TypeScript can resolve all types before the UI files
are compiled, and that the DB schema exists before the repo tries to query it.

---

## Weekly AI Plan (run every 7 days)

Open Claude claude.ai (not the app) and run this prompt:

> Write 5 Facebook group post templates for a trucking dispatch service targeting
> owner-operators. Each template should have a different hook style (pain-focused,
> benefit-focused, question-based, social proof, blunt/direct). Use these variable
> tokens: {driver_type}, {lane_region}, {rpm_range}, {company_name}, {pain_point},
> {benefit}. Write rough and human — contractions, some sentence fragments, no
> hype language, no bullet lists with symbols. Each post should be 3-8 sentences
> total. Return only the post bodies, no labels.

Paste the 5 outputs into OUTREACH_TEMPLATES in outreachEngine.ts as new entries
with sequential IDs (ot-21 through ot-25, etc.). Remove the 5 lowest-scoring
templates identified in the Outreach Performance panel. Bump the template count
in the Mark Refresh Done dialog.

---

## Anti-repetition Strategy

The recency penalty in scoring (-0.35 per day, 14-day window) virtually
guarantees no template repeats within two weeks if the bank has 20+ entries.
With 20 templates and 5 posts per day, the minimum repeat window is 4 days on
the math alone — the penalty pushes that to 10-14 days in practice.

For the page post bank (5 entries, 1 post per day), the same template can
theoretically repeat after 5 days. The weekly AI plan should add 1 new page
post template alongside the group templates to keep rotation fresh.
