/**
 * FMCSA SAFER lookup utilities.
 * Uses shell.openExternal() via IPC so the link always opens in the system
 * browser, not an Electron window.
 */

function saferMcUrl(mc: string): string {
  const num = mc.replace(/^MC-?/i, '').trim()
  return (
    'https://safer.fmcsa.dot.gov/CompanySnapshot.aspx' +
    '?query_type=queryCarrierSnapshot' +
    '&query_param=MC_MX' +
    '&original_query_param=MC_MX' +
    '&query_string=' + encodeURIComponent(num)
  )
}

function saferDotUrl(dot: string): string {
  return (
    'https://safer.fmcsa.dot.gov/CompanySnapshot.aspx' +
    '?query_type=queryCarrierSnapshot' +
    '&query_param=USDOT' +
    '&original_query_param=USDOT' +
    '&query_string=' + encodeURIComponent(dot.trim())
  )
}

/** Opens the FMCSA SAFER company snapshot for an MC number in the system browser. */
export function openSaferMc(mc: string, e?: React.MouseEvent): void {
  e?.preventDefault()
  e?.stopPropagation()
  window.api.shell.openExternal(saferMcUrl(mc))
}

/** Opens the FMCSA SAFER company snapshot for an MC number and copies the MC# to clipboard. */
export function openSaferMcWithCopy(mc: string, e?: React.MouseEvent): void {
  e?.preventDefault()
  e?.stopPropagation()
  window.api.shell.openExternal(saferMcUrl(mc))
  const num = mc.replace(/^MC-?/i, '').trim()
  navigator.clipboard.writeText(num).catch(() => {/* clipboard not available — non-fatal */})
}

/** Opens the FMCSA SAFER company snapshot for a DOT number in the system browser. */
export function openSaferDot(dot: string, e?: React.MouseEvent): void {
  e?.preventDefault()
  e?.stopPropagation()
  window.api.shell.openExternal(saferDotUrl(dot))
}
