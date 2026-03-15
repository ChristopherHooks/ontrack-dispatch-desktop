/**
 * FMCSA QCMobile API client — runs in main process only.
 * Docs:     https://mobile.fmcsa.dot.gov/QCDevsite/docs/qcApi
 * API key:  register free at https://mobile.fmcsa.dot.gov/QCDevsite/home
 *
 * NOTE: The QCMobile API is a US government service with no published rate
 * limits. It has a known history of intermittent downtime. All calls are
 * wrapped in try/catch in the caller so failures are non-fatal per search term.
 */
import * as https from 'https'
import * as http  from 'http'

const BASE_URL           = 'https://mobile.fmcsa.dot.gov/qc/services'
const SAFER_BASE         = 'https://safer.fmcsa.dot.gov'
const REQUEST_TIMEOUT_MS = 15_000

// ── API response shapes ────────────────────────────────────────────────────

export interface ApiCarrier {
  dotNumber:             number
  legalName:             string
  dbaName:               string | null
  phyCity:               string | null
  phyState:              string | null
  telephone:             string | null
  commonAuthorityStatus: string   // 'A' = Active, 'I' = Inactive, 'N' = None
  allowedToOperate:      string   // 'Y' | 'N'
}

/** Full carrier record returned by /carriers/{dotNumber}
 *  NOTE: The FMCSA API uses two different field names for the MCS-150 date
 *  depending on which version of the endpoint is hit:
 *    - mcs150Date      (older responses, "MM/DD/YYYY")
 *    - mcs150FormDate  (newer responses, "MM/DD/YYYY" or ISO string)
 *  Both are captured here; callers should check whichever is non-null.
 */
export interface ApiCarrierDetail {
  dotNumber:       number
  legalName:       string
  dbaName:         string | null
  telephone:       string | null
  mcs150Date:      string | null  // "MM/DD/YYYY" or ISO — MCS-150 form date
  mcs150FormDate:  string | null  // alternative field name for same value
  totalPowerUnits: number | null
  phyCity:         string | null
  phyState:        string | null
}

/** One entry from /carriers/{dotNumber}/docket-numbers */
export interface ApiDocketEntry {
  docketNumber: number   // numeric MC/MX number
  prefix:       string   // "MC" | "MX" | "FF" etc.
}

/** Data extracted from the SAFER public snapshot page */
export interface ApiSaferData {
  phone:      string | null   // raw digits/formatting as shown on SAFER
  mcs150Date: string | null   // "MM/DD/YYYY" — MCS-150 form date
  fleetSize:  number | null   // Power Units count; null if not listed
}

// ── HTTP helpers ──────────────────────────────────────────────────────────

/**
 * Plain-text HTTP/HTTPS GET — returns the response body as a string.
 * Follows up to 3 redirects (needed for some SAFER responses).
 * Used for SAFER HTML page scraping; does NOT parse JSON.
 */
function httpGetText(url: string, hops = 0): Promise<string> {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https://') ? https : http
    const req = mod.get(url, {
      headers: {
        Accept: 'text/html,application/xhtml+xml',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    }, (res) => {
      // Follow redirects
      if ((res.statusCode === 301 || res.statusCode === 302) &&
           res.headers.location && hops < 3) {
        res.resume()
        httpGetText(res.headers.location, hops + 1).then(resolve).catch(reject)
        return
      }
      const chunks: Buffer[] = []
      res.on('data', (c: Buffer) => chunks.push(c))
      res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    })
    req.on('error', reject)
    req.setTimeout(REQUEST_TIMEOUT_MS, () => {
      req.destroy()
      reject(new Error('SAFER request timed out after ' + REQUEST_TIMEOUT_MS + 'ms'))
    })
  })
}

function httpGet(url: string): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { Accept: 'application/json' } }, (res) => {
      const chunks: Buffer[] = []
      res.on('data', (c: Buffer) => chunks.push(c))
      res.on('end', () => {
        const body = Buffer.concat(chunks).toString('utf8')
        let data: Record<string, unknown>
        try { data = JSON.parse(body) as Record<string, unknown> }
        catch {
          reject(new Error('Non-JSON response (HTTP ' + res.statusCode + '): ' + body.slice(0, 120)))
          return
        }
        // Detect API-level errors (e.g. invalid webKey)
        if (typeof data.code === 'number' && data.message) {
          reject(new Error('FMCSA API error ' + data.code + ': ' + String(data.message)))
          return
        }
        resolve(data)
      })
    })
    req.on('error', reject)
    req.setTimeout(REQUEST_TIMEOUT_MS, () => {
      req.destroy()
      reject(new Error('FMCSA request timed out after ' + REQUEST_TIMEOUT_MS + 'ms'))
    })
  })
}

// ── Public API functions ──────────────────────────────────────────────────

/**
 * Search carriers by name keyword (e.g. 'Texas', 'Georgia Trucking').
 * Returns carrier objects; content may be empty if no matches.
 * Max 50 results per request (API hard cap).
 */
export async function searchCarriersByName(
  webKey: string,
  name:   string,
  size    = 50
): Promise<ApiCarrier[]> {
  const url = BASE_URL + '/carriers/name/' + encodeURIComponent(name) +
              '?webKey=' + encodeURIComponent(webKey) + '&start=0&size=' + size
  console.log('[FMCSA] Searching carriers for term:', name)
  const data = await httpGet(url) as { content?: { carrier: ApiCarrier }[] }
  if (!Array.isArray(data?.content)) {
    console.warn('[FMCSA] Unexpected response shape for term ' + name + ':', JSON.stringify(data).slice(0, 200))
    return []
  }
  return data.content.map(r => r.carrier).filter(Boolean)
}

/**
 * Scrape the SAFER public carrier snapshot page for a carrier by DOT number.
 *
 * The QC API does not reliably return phone or MCS-150 date. SAFER is the
 * authoritative government source for both — same data you see when you visit
 * https://safer.fmcsa.dot.gov/CompanySnapshot.aspx manually.
 *
 * No API key required. Extraction uses the same regex approach as the legacy
 * Python scraper (FMCSA_MC_Scraper.py). Non-fatal: returns nulls on any error.
 */
export async function getCarrierSafer(dotNumber: number): Promise<ApiSaferData> {
  const url = SAFER_BASE +
    '/query.asp?searchtype=ANY&query_type=queryCarrierSnapshot' +
    '&query_param=USDOT&query_string=' + dotNumber
  try {
    const html = await httpGetText(url)

    // Strip HTML tags → plain text (equivalent to BeautifulSoup.get_text)
    const text = html
      .replace(/<[^>]+>/g, '\n')
      .replace(/&nbsp;/g, ' ')
      .replace(/&#(\d+);/g, (_, n: string) => String.fromCharCode(Number(n)))
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')

    // Phone — matches "(XXX) XXX-XXXX" and "XXX-XXX-XXXX" variants
    let phone: string | null = null
    const phoneMatch = /Phone:\s*\n?\s*(\(?\d{3}\)?[\s\-.]?\d{3}[\s\-.]?\d{4})/.exec(text)
    if (phoneMatch) phone = phoneMatch[1].trim()

    // MCS-150 Form Date — "MM/DD/YYYY"
    let mcs150Date: string | null = null
    const mcsMatch = /MCS-150 Form Date:\s*\n?\s*([\d/]+)/.exec(text)
    if (mcsMatch) mcs150Date = mcsMatch[1].trim()

    // Power Units — integer fleet size
    // The label and value land in adjacent table cells; after tag-stripping
    // there can be 1–3 newlines between the colon and the digit(s).
    let fleetSize: number | null = null
    const puMatch = /Power Units[^0-9]{0,40}?(\d+)/.exec(text)
    if (puMatch) {
      const n = parseInt(puMatch[1], 10)
      if (!isNaN(n) && n >= 0) fleetSize = n
    }

    console.log('[FMCSA] SAFER DOT ' + dotNumber + ':', { phone, mcs150Date, fleetSize })
    return { phone, mcs150Date, fleetSize }
  } catch (err) {
    console.warn('[FMCSA] getCarrierSafer failed for DOT ' + dotNumber + ':',
      err instanceof Error ? err.message : String(err))
    return { phone: null, mcs150Date: null, fleetSize: null }
  }
}

/**
 * Fetch full carrier detail by DOT number from the QC API.
 * NOTE: The QC API does not reliably return telephone or mcs150Date for most
 * carriers — use getCarrierSafer() instead for those fields.
 * Kept here for potential future use.
 */
export async function getCarrierDetail(
  webKey:    string,
  dotNumber: number
): Promise<ApiCarrierDetail | null> {
  const url = BASE_URL + '/carriers/' + dotNumber +
              '?webKey=' + encodeURIComponent(webKey)
  try {
    const data = await httpGet(url) as { content?: { carrier: ApiCarrierDetail } }
    return data?.content?.carrier ?? null
  } catch (err) {
    console.warn('[FMCSA] getCarrierDetail failed for DOT ' + dotNumber + ':',
      err instanceof Error ? err.message : String(err))
    return null
  }
}

/**
 * Fetch docket numbers (MC / MX numbers) for a carrier by DOT number.
 * Returns an empty array if the carrier has no dockets or the request fails.
 */
export async function getCarrierDockets(
  webKey:    string,
  dotNumber: number
): Promise<ApiDocketEntry[]> {
  const url = BASE_URL + '/carriers/' + dotNumber + '/docket-numbers' +
              '?webKey=' + encodeURIComponent(webKey)
  try {
    const data = await httpGet(url) as { content?: ApiDocketEntry[] }
    return Array.isArray(data?.content) ? data.content : []
  } catch (err) {
    console.warn('[FMCSA] getCarrierDockets failed for DOT ' + dotNumber + ':', err instanceof Error ? err.message : String(err))
    return []
  }
}
