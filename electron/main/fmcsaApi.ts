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

const BASE_URL           = 'https://mobile.fmcsa.dot.gov/qc/services'
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

// ── HTTP helper ───────────────────────────────────────────────────────────

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
