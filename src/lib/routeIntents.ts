/**
 * Route Intent System
 * Typed deep-link builders and URL param parsers for Operations → destination
 * page navigation. All param names are defined once here; destination pages
 * import the parse* helpers instead of calling searchParams.get() directly.
 *
 * To add a new deep-link:
 *   1. Add the param constant below
 *   2. Add a route builder function
 *   3. Add a parser function
 *   4. Update the destination page to call the parser
 */

// ── Canonical param names ────────────────────────────────────────────────────

const P_DRIVER_ID         = 'driver_id'   // /findloads
const P_LEAD_FILTER       = 'filter'      // /leads
const P_UNINVOICED        = 'uninvoiced'  // /invoices
const P_LOAD_STALE        = 'stale'       // /loads
const P_LOAD_STATUS       = 'status'      // /loads
const P_LOAD_ID           = 'load_id'     // /activeloads

// ── Lead filter values ───────────────────────────────────────────────────────

export type LeadFilter =
  | 'overdue'
  | 'upcoming'
  | 'warm'
  | 'dueToday'
  | 'untouched'
  | 'duplicates'

const VALID_LEAD_FILTERS = new Set<string>([
  'overdue', 'upcoming', 'warm', 'dueToday', 'untouched', 'duplicates',
])

// ── Route builders ────────────────────────────────────────────────────────────

/** /findloads — optionally pre-select a driver by ID */
export function findLoadsRoute(driverId?: number): string {
  return driverId ? `/findloads?${P_DRIVER_ID}=${driverId}` : '/findloads'
}

/** /leads — optionally apply a named filter on arrival */
export function leadsRoute(filter?: LeadFilter): string {
  return filter ? `/leads?${P_LEAD_FILTER}=${filter}` : '/leads'
}

/** /invoices — optionally scroll to the uninvoiced-loads section */
export function invoicesRoute(uninvoiced?: true): string {
  return uninvoiced ? `/invoices?${P_UNINVOICED}=1` : '/invoices'
}

/** /loads — optionally filter to stale loads or a specific status */
export function loadsRoute(opts: { stale?: true; status?: string } = {}): string {
  const p = new URLSearchParams()
  if (opts.stale)  p.set(P_LOAD_STALE, '1')
  if (opts.status) p.set(P_LOAD_STATUS, opts.status)
  const qs = p.toString()
  return qs ? `/loads?${qs}` : '/loads'
}

/** /activeloads — optionally pre-select and expand a specific load */
export function activeLoadsRoute(loadId?: number): string {
  return loadId ? `/activeloads?${P_LOAD_ID}=${loadId}` : '/activeloads'
}

// ── Param parsers (for use in destination pages) ──────────────────────────────

/** /findloads: parse ?driver_id=X → number | null */
export function parseDriverIdParam(params: URLSearchParams): number | null {
  const v = params.get(P_DRIVER_ID)
  if (!v) return null
  const n = Number(v)
  return isNaN(n) ? null : n
}

/** /leads: parse ?filter=X → LeadFilter | null */
export function parseLeadFilterParam(params: URLSearchParams): LeadFilter | null {
  const v = params.get(P_LEAD_FILTER)
  return VALID_LEAD_FILTERS.has(v ?? '') ? (v as LeadFilter) : null
}

/** /invoices: parse ?uninvoiced=1 → boolean */
export function parseUninvoicedParam(params: URLSearchParams): boolean {
  return params.get(P_UNINVOICED) === '1'
}

/** /loads: parse ?stale=1 → boolean */
export function parseStaleParam(params: URLSearchParams): boolean {
  return params.get(P_LOAD_STALE) === '1'
}

/** /loads: parse ?status=X → string | null */
export function parseLoadStatusParam(params: URLSearchParams): string | null {
  return params.get(P_LOAD_STATUS)
}

/** /activeloads: parse ?load_id=X → number | null */
export function parseLoadIdParam(params: URLSearchParams): number | null {
  const v = params.get(P_LOAD_ID)
  if (!v) return null
  const n = Number(v)
  return isNaN(n) ? null : n
}
