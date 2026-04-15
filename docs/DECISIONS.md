# Technical Decisions — OnTrack Dispatch Dashboard

This file records major technical decisions, the reasoning behind them,
and any constraints they impose on future work.

---

## DEC-001: Electron 32.3.3 LTS (not 41.x)

**Decision:** Pin Electron at 32.3.3 LTS.

**Reason:** Electron 41 removes `v8::PropertyCallbackInfo::This()` from its
bundled V8, which breaks better-sqlite3's native module compilation. No current
version of better-sqlite3 is compatible with Electron 41. Electron 32 is the
current LTS and is stable for production use.

**Constraint:** Do not upgrade Electron without first verifying better-sqlite3
compatibility. Check the better-sqlite3 GitHub issues before any upgrade.

---

## DEC-002: No "type":"module" in package.json

**Decision:** Do not add `"type":"module"` to package.json.

**Reason:** When `"type":"module"` is present, rolldown outputs `.js` files
instead of `.mjs`. Electron 32 does not reliably detect `.js` preload scripts
as ESM via package.json type traversal — the preload silently fails to run,
which means `contextBridge` never executes and `window.api` is undefined.
Without `"type":"module"`, rolldown outputs `.mjs` files, which Electron always
recognizes unambiguously as ESM.

**Constraint:** Preload path in main/index.ts must use `.mjs` extension:
`join(__dirname, '../preload/index.mjs')`

---

## DEC-003: No externalizeDepsPlugin()

**Decision:** Do not use `externalizeDepsPlugin()` from electron-vite.

**Reason:** It is deprecated in electron-vite v5. It also only reads
`dependencies` in package.json, not `devDependencies` — and `electron` is a
devDependency. This caused `electron` to be bundled into the main process
output (554 KB), causing `getElectronPath()` to fail at runtime.

**Replacement:** Use explicit `rollupOptions.external` with a `nodeExternal`
array containing `['electron', 'better-sqlite3', 'electron-store',
...builtinModules, ...builtinModules.map(m => 'node:' + m)]`.

---

## DEC-004: HashRouter (not BrowserRouter)

**Decision:** Use React Router's HashRouter.

**Reason:** The Electron renderer loads from a `file://` URL. BrowserRouter
requires a web server to handle navigation paths — deep links like
`file:///app/leads` return a 404 without a server. HashRouter uses URL fragments
(`#/leads`) which are always resolved client-side.

**Constraint:** All routes must be relative. No server-side routing assumptions.

---

## DEC-005: CJS for postcss.config.js and tailwind.config.js

**Decision:** Use `module.exports` (CommonJS) syntax in both config files.

**Reason:** Without `"type":"module"` in package.json, Node.js treats all `.js`
files as CJS. Using `export default` causes a `MODULE_TYPELESS_PACKAGE_JSON`
parse warning. CJS `module.exports` avoids this.

**Constraint:** Do not convert these files to ESM unless `"type":"module"` is
intentionally added to package.json (which is blocked by DEC-002).

---

## DEC-006: better-sqlite3 v12.6.2 with @electron/rebuild

**Decision:** Use better-sqlite3 v12.6.2 and rebuild it via @electron/rebuild
as a postinstall step.

**Reason:** Native Node modules must be compiled against the exact Node.js
headers bundled with the Electron version being used. A mismatch in
NODE_MODULE_VERSION causes a runtime crash. The `postinstall` script
`electron-rebuild -f -w better-sqlite3` ensures this happens automatically
after every `npm install`.

**Constraint:** Do not remove the postinstall script. If adding other native
modules, add them to the `-w` flag list.

---

## DEC-007: Explicit seed task IDs (1-6)

**Decision:** Seed tasks are inserted with explicit `id` values (1, 2, 3...6).

**Reason:** Without explicit IDs, `INSERT OR IGNORE` has no PK to conflict on —
SQLite assigns a new auto-generated PK each launch, so every launch inserts 6
new rows. Explicit IDs cause the PK constraint to fire correctly, suppressing
re-inserts.

**Additional fix:** A dedup `DELETE` runs before the INSERT on every launch to
collapse any duplicate rows that existed before this fix was applied.

---

## DEC-008: SQLite in main process only

**Decision:** All database access happens in the Electron main process.

**Reason:** better-sqlite3 is a native Node.js module — it cannot run in the
renderer process (which is a browser context). All DB calls go through IPC.

---

## DEC-009: Marketing anti-repetition via DB scoring (not date-seeded rotation)

**Decision:** The daily suggested post is selected by scoring all 78 templates at render
time using a weighted algorithm, not by a simple date-seed index.

**Reason:** A date-seed rotation would repeat the same template every 78 days regardless
of actual use. The scoring approach weights by: days since last use (14-day rolling window
penalizes recently used templates heavily) and total use count (long-term fairness). The
highest-scoring template is shown first; offset cycling lets the user skip to the next best.

**Implementation:** `selectSuggestedTemplate()` in `src/lib/marketingUtils.ts`. Recent IDs
and usage counts are loaded from `marketing_post_log` via IPC on page mount.

---

## DEC-010: FMCSA pagination via start offset (not size parameter)

**Decision:** The FMCSA QCMobile API is paginated using the `start` offset parameter
(`/carriers/name/{term}?start=0`, `start=50`, `start=100`) rather than a `size` parameter.

**Reason:** The API does not support a `size` parameter — it always returns up to 50 results
per call. Pagination must be done by incrementing the `start` offset. The import pipeline
fetches up to 3 pages (150 results) per search term and stops early when a page returns
fewer than 50 results, indicating the last page.

**Constraint:** Do not add a `size` query parameter — it is silently ignored by the API.

---

## DEC-011: Fleet size extracted from SAFER public snapshot page

**Decision:** Carrier fleet size (Power Units count) is scraped from the FMCSA SAFER
public carrier snapshot page rather than from the QCMobile API.

**Reason:** The QCMobile JSON API does not reliably include Power Units for most carriers.
The SAFER HTML snapshot page (the same page a browser shows at safer.fmcsa.dot.gov) always
includes the Power Units field in a consistent table structure. A regex extracts the value
after "Power Units".

**Implementation:** `getCarrierSafer()` in `electron/main/fmcsaApi.ts`.

---

## DEC-012: CSV lead import uses free-text header detection (not fixed column positions)

**Decision:** The CSV importer scans the first 5 lines of the file for a header row rather
than assuming a fixed column layout.

**Reason:** Dispatchers export lead spreadsheets from various tools (Google Sheets, Excel,
custom CRMs) with different column orders and header names. A fixed-position importer would
fail on most real files. The header detection approach maps column names to field aliases
using a HEADER_MAP lookup, is case-insensitive, and ignores columns it does not recognize.

**Implementation:** `csvLeadImport.ts` in `electron/main/`.

---

## DEC-013: Industry glossary is static client-side data (not a DB table)

**Decision:** The trucking industry terms and acronyms index is stored as a static TypeScript
array in `src/data/industryTerms.ts`, not in the SQLite database.

**Reason:** The glossary is reference content that does not change per user, does not need
to be queried server-side, and does not benefit from DB persistence. Static data is simpler,
type-safe, and loads instantly with no IPC round-trip. Filtering and sorting are done
client-side in the renderer.

---

## DEC-014: Two-meaning "broker" disambiguation via load_mode and contact_type

**Decision:** The word "broker" has two distinct meanings in the app. These are kept separate
by two additive columns:

1. `brokers.contact_type` ('broker' | 'shipper', default 'broker') — classifies an entry in
   the brokers table as either a freight broker (OnTrack dispatches against them) or a direct
   shipper (customer for broker-mode loads).
2. `loads.load_mode` ('dispatch' | 'broker', default 'dispatch') — classifies an individual
   load as dispatch mode (OnTrack dispatches one of its drivers) or broker mode (OnTrack acts
   as the freight broker, finding and contracting a carrier on behalf of a shipper).

**Reason:** Using a single "broker" concept conflated two fundamentally different business
relationships. The `brokers` table was already used for counterparties in dispatch mode;
introducing broker mode for loads required a clean way to store shippers in the same table
without breaking existing broker records. The load_mode approach similarly preserves all
existing dispatch loads without migration data transforms.

**Constraint:** Never filter brokers or loads on the word "broker" alone. Always use
`contact_type` or `load_mode` explicitly.

---

## DEC-015: Additive column migration strategy for broker mode

**Decision:** Broker mode was introduced via four additive migrations (v40–v44) using
`addColumnIfMissing()` for the column additions and `CREATE TABLE IF NOT EXISTS` for
the new tables. No existing rows were modified.

**Reason:** load_mode = 'dispatch' and contact_type = 'broker' defaults mean every existing
row in loads and brokers already carries the correct value for its existing behavior.
A migration that backfills data or alters column types would risk data loss or corrupt
behavior on production databases. Additive-only migrations are always safe to re-apply.

**Constraint:** Never ALTER an existing column type or DROP a column in a migration. Always
add new columns with defaults or create new tables. Use addColumnIfMissing() for columns.

---

## DEC-016: acceptCarrierOffer() as an atomic SQLite transaction

**Decision:** Accepting a carrier offer is implemented as a single `db.transaction()()` call
in `carrierOffersRepo.ts` that performs three writes atomically:
1. Update the target offer to status='Accepted' (with optional DTO field updates).
2. Update all other offers for the same load to status='Rejected' (skipping already-Rejected).
3. Update the parent load to status='Carrier Selected'.

**Reason:** These three writes are semantically a single business action. If any one step
fails, the others must not persist — an accepted offer without rejected competitors would
leave the load in an inconsistent state (multiple "accepted" offers visible). SQLite
transactions guarantee all-or-nothing execution.

**Side effect:** After `accept()` returns, the React component also calls
`onStatusChange(load, 'Carrier Selected')` to sync parent React state. This causes a
redundant DB write (the load was already updated by the transaction). This is intentional
and idempotent — the parent state sync is necessary for the UI to reflect the new status
without a full page reload.

**Constraint:** Do not split the three writes across separate IPC calls. The accept
operation must always go through `carrierOffers:accept` (not `loads:update` + `carrierOffers:update`).

---

## DEC-017: Dispatch/broker workflow separation via load_mode filter in query files

**Decision:** All dispatch-only queries — dispatcher board, load scanner, dashboard
drivers-needing-loads KPI, operations driver queries, and profit radar idle driver query —
were updated to append `AND l.load_mode = 'dispatch'` (or equivalent) to their WHERE clauses.
This was done in the query files (`dispatcherBoard.ts`, `loadScanner.ts`, `dashboard.ts`,
`operations.ts`, `profitRadar.ts`) rather than at the IPC handler or repo level.

**Reason:** Broker-mode loads have a different workflow (carrier sourcing via offers, not
driver assignment from a board). Showing broker loads in the dispatcher board or load scanner
would produce misleading data — e.g., a broker load might show as "unassigned" and appear in
the available load recommendations even though it is actively being covered by a carrier offer.
Filtering at the query level keeps the separation clean without adding complexity to the
renderer or IPC layer.

**Constraint:** Any new dispatch-centric query (e.g., revenue-per-driver, on-time metrics)
must also filter to `load_mode = 'dispatch'` unless the intent is to aggregate both modes.
Broker-mode loads should be analyzed separately when implementing broker analytics.
