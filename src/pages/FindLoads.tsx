import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { parseDriverIdParam } from '../lib/routeIntents'
import {
  Loader2, AlertCircle, ArrowRight,
  CheckCircle2, XCircle, ChevronDown, ChevronUp, Plus,
  Phone, TrendingUp, MapPin, Radio,
  Copy, Check, Calculator, ExternalLink,
  Bookmark, BookmarkCheck, Users, Navigation, Home, Compass,
} from 'lucide-react'
import type { Driver, Load, Broker } from '../types/models'
import { checkProfitability, PROFIT_THRESHOLDS } from '../lib/profitability'
import type { ProfitCheck, ProfitBand } from '../lib/profitability'
import type { ScoredLoad, ParseScreenshotResult } from '../types/global'
import type { DriverLaneFitRow } from '../types/models'
import { getSuggestedLanes, tagLabel, tagStyle } from '../services/laneSuggestionService'
import type { LaneSuggestion, SearchStrategy } from '../services/laneSuggestionService'
import { resolveMarket, getMarket } from '../data/freightMarkets'

// ---------------------------------------------------------------------------
// Formatters
// ---------------------------------------------------------------------------

function fmt$(v: number | null) { return v != null ? '$' + v.toLocaleString() : '—' }
function fmtRpm(v: number | null) { return v != null ? '$' + v.toFixed(2) : '—' }
function fmtN(v: number | null)   { return v != null ? v.toLocaleString() : '—' }

function route(load: ScoredLoad) {
  const o = [load.origin_city, load.origin_state].filter(Boolean).join(', ') || '—'
  const d = [load.dest_city,   load.dest_state  ].filter(Boolean).join(', ') || '—'
  return { o, d }
}

function marginColor(v: number | null) {
  if (v == null)  return 'text-gray-500'
  if (v >= 1000)  return 'text-green-400'
  if (v >= 600)   return 'text-orange-400'
  if (v >= 300)   return 'text-yellow-400'
  return 'text-red-400'
}

function rpmColor(v: number | null) {
  if (v == null) return 'text-gray-500'
  if (v >= 3.0)  return 'text-green-400'
  if (v >= 2.50) return 'text-orange-400'
  if (v >= 2.0)  return 'text-yellow-400'
  return 'text-red-400'
}

function timeAgo(d: Date): string {
  const mins = Math.floor((Date.now() - d.getTime()) / 60000)
  if (mins < 1)  return 'just now'
  if (mins < 60) return `${mins} min ago`
  const hrs = Math.floor(mins / 60)
  return `${hrs} hr${hrs !== 1 ? 's' : ''} ago`
}

// ---------------------------------------------------------------------------
// Paste import parser — heuristic extraction from DAT / Truckstop copied text
// ---------------------------------------------------------------------------

const US_STATES = new Set([
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN',
  'IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV',
  'NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN',
  'TX','UT','VT','VA','WA','WV','WI','WY','DC',
])

// DAT load block structure (each load is multiline, separated by '–'):
//   Line 0:  time posted       "2m" | "3h"
//   Line 1:  rate or –         "$1,200" | "–"
//   Line 2:  $/mi (optional)   "$3.47*/mi"
//   Line 3:  miles             "346"
//   Line 4:  origin city,state "Coppell, TX"
//   Line 5:  origin DH         "(21)"
//   Line 6:  dest city,state   "Beaumont, TX"
//   Line 7:  dest DH           "(88)"
//   Line 8:  pickup date       "4/17" | "4/17 - 4/20"
//   Line 9:  equipment code    "V" | "VR" | "F"
//   Line 10: trailer size      "53 ft"
//   Line 11: weight            "35,000 lbs"
//   Line 12: load type         "Full" | "Partial"
//   Line 13: company name
//   Line 14: contact (email/phone)
//   Line 15: credit score      "97 CS"
//   Line 16: days to pay       "17 DTP" | "– DTP"
//   (trailing –)

const EQUIP_MAP: Record<string, string> = {
  V:  'Van', VR: 'Reefer', F: 'Flatbed', R: 'Reefer',
  SD: 'Step Deck', RGN: 'RGN', T: 'Tanker',
}

// ── Date normalization helper ─────────────────────────────────────────────────
// DAT paste dates arrive as "M/D" or "M/D - M/D". Screenshot import produces
// "YYYY-MM-DD" already. This function normalizes any single date token to
// "YYYY-MM-DD" using the current year, and returns null for unrecognized strings.
const _YEAR = new Date().getFullYear()
function _normDate(s: string): string | null {
  if (!s) return null
  s = s.trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s           // already YYYY-MM-DD
  const m = s.match(/^(\d{1,2})\/(\d{1,2})$/)
  if (!m) return null
  return `${_YEAR}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}`
}

// Parse a DAT date field (may be "4/17", "4/17 - 4/20", or "YYYY-MM-DD") and
// return [pickupDate, deliveryDate] both as "YYYY-MM-DD" or null.
function _parseDateField(raw: string | null): [string | null, string | null] {
  if (!raw) return [null, null]
  const s = raw.trim()
  // Already YYYY-MM-DD (from screenshot import) — no range possible in this format
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return [s, null]
  // DAT paste format: "M/D" or "M/D - M/D"
  const parts = s.split(/\s+-\s+/)
  return [_normDate(parts[0] ?? ''), _normDate(parts[1] ?? '')]
}

// ── Field classifiers (module-level so they are not recreated on every call) ──
const _parseCity = (s: string): [string, string] | null => {
  const m = s.match(/^(.+),\s+([A-Z]{2})$/)
  return m && US_STATES.has(m[2]) ? [m[1].trim(), m[2]] : null
}

function parsePastedLoads(raw: string): ScoredLoad[] {
  // ── Step 1: Normalize ────────────────────────────────────────────────────
  // Strip Unicode Format chars (Cf: zero-width spaces, direction marks, BOM…)
  // that clipboard APIs inject invisibly, then trim/filter empty lines.
  const lines = raw
    .split(/\r?\n/)
    .map(l => l.replace(/\p{Cf}/gu, '').replace(/\u00A0/g, ' ').trim())
    .filter(l => l.length > 0)

  // ── Step 2: Classifiers ──────────────────────────────────────────────────
  const isMiles   = (s: string) => /^\d{2,4}$/.test(s) && +s >= 20 && +s <= 4000
  const isDh      = (s: string) => /^\(\d+\)$/.test(s)
  const isRate    = (s: string) => /^\$([\d,]+)$/.test(s)
  const isRpm     = (s: string) => /^\$[\d.]+\*?\/mi$/.test(s)
  const isAge     = (s: string) => /^\d+[mh]$/.test(s)
  const isDate    = (s: string) => /^\d+\/\d+/.test(s)
  const isEquip   = (s: string) => Object.prototype.hasOwnProperty.call(EQUIP_MAP, s)
  const isWeight  = (s: string) => /^[\d,]+ lbs$/.test(s)
  const isLength  = (s: string) => /^\d+ ft$/.test(s)
  const isCs      = (s: string) => /^\d+ CS$/.test(s)
  const isDtp     = (s: string) => /^[\d\u2013\-]+ DTP$/.test(s)
  const isSep     = (s: string) => s === '\u2013' || s === '\u2014' || s === '\u2012' || s === '-'
  const isPhone   = (s: string) => /^\(?\d{3}\)?[\s.\-]\d{3}[\s.\-]\d{4}/.test(s)
  const isEmail   = (s: string) => /^[\w.+\-]+@[\w.\-]+$/.test(s)
  const isContact = (s: string) => isPhone(s) || isEmail(s)
  const isState   = (s: string) => /^[A-Z]{2}$/.test(s) && US_STATES.has(s)

  // ── Step 3: State machine ────────────────────────────────────────────────
  // A new record is triggered by a pure-integer miles line (20–4000).
  // Rate ownership: rate/RPM lines appearing in the TAIL of a record (after
  // its origin/dest fields, before the next miles line) belong to THAT record,
  // not the next one. DAT formats each listing as: fields → separator → age →
  // rate/RPM. The next listing then starts cleanly with its miles line.
  //
  // States:
  //   preamble  – consuming leading noise before the first miles line
  //   origin    – next City, ST line is the origin
  //   dest      – optional origin DH, then next City, ST is the destination
  //   tail      – all remaining fields until the next miles trigger

  type SMState = 'preamble' | 'origin' | 'dest' | 'tail'

  interface RawRecord {
    miles: number; rate: number | null
    origin_city: string | null; origin_state: string | null; origin_dh: number | null
    dest_city:   string | null; dest_state:   string | null; dest_dh:   number | null
    pickup_date: string | null; equip: string | null
    weight: number | null; company: string | null
    phone: string | null; email: string | null
    cancelled: boolean
  }

  const makeRec = (miles: number): RawRecord => ({
    miles, rate: null,
    origin_city: null, origin_state: null, origin_dh: null,
    dest_city:   null, dest_state:   null, dest_dh:   null,
    pickup_date: null, equip: null, weight: null, company: null,
    phone: null, email: null,
    cancelled: false,
  })

  let smState: SMState  = 'preamble'
  let cur: RawRecord | null = null
  let pendingCityName: string | null = null   // buffer for stacked "City\nST" format
  const rawRecs: RawRecord[] = []

  const finalize = () => {
    if (cur?.origin_city && cur?.dest_city && !cur.cancelled) rawRecs.push(cur)
    cur = null
  }

  for (const line of lines) {
    switch (smState) {

      case 'preamble': {
        if (isMiles(line)) {
          pendingCityName = null
          cur = makeRec(+line); smState = 'origin'
        }
        // rate, age, RPM, separator, 'Factoring': all skipped in preamble
        break
      }

      case 'origin': {
        const c = _parseCity(line)
        if (c) {
          // Single-line "City, ST" format
          pendingCityName = null
          cur!.origin_city = c[0]; cur!.origin_state = c[1]; smState = 'dest'
        } else if (pendingCityName !== null && isState(line)) {
          // Stacked format: previous line was city name, this line is the state code
          cur!.origin_city = pendingCityName; cur!.origin_state = line
          pendingCityName = null; smState = 'dest'
        } else if (isMiles(line)) {
          // Another miles before we got origin — abandon current, start fresh
          pendingCityName = null
          finalize(); cur = makeRec(+line)
        } else if (!isSep(line) && !isAge(line) && !isRate(line) && !isRpm(line) && line.length > 1) {
          // Could be the city name on its own line (stacked format)
          pendingCityName = line
        }
        break
      }

      case 'dest': {
        if (isDh(line)) {
          cur!.origin_dh = parseInt(line.slice(1, -1))
        } else {
          const c = _parseCity(line)
          if (c) {
            // Single-line "City, ST" format
            pendingCityName = null
            cur!.dest_city = c[0]; cur!.dest_state = c[1]; smState = 'tail'
          } else if (pendingCityName !== null && isState(line)) {
            // Stacked format
            cur!.dest_city = pendingCityName; cur!.dest_state = line
            pendingCityName = null; smState = 'tail'
          } else if (isMiles(line)) {
            pendingCityName = null
            finalize(); cur = makeRec(+line); smState = 'origin'
          } else if (!isSep(line) && !isAge(line) && !isRate(line) && !isRpm(line) && line.length > 1) {
            pendingCityName = line
          }
        }
        break
      }

      case 'tail': {
        if (isMiles(line)) {
          finalize(); cur = makeRec(+line); smState = 'origin'
        } else if (isDh(line) && !cur!.dest_dh) {
          cur!.dest_dh = parseInt(line.slice(1, -1))
        } else if (isDate(line) && !cur!.pickup_date) {
          cur!.pickup_date = line   // keep full string, e.g. "4/17 - 4/20"; normalized in handleAdd
        } else if (isEquip(line) && !cur!.equip) {
          cur!.equip = EQUIP_MAP[line]
        } else if (isWeight(line)) {
          cur!.weight = parseInt(line.replace(/[^\d]/g, ''))
        } else if (isRate(line) && cur!.rate === null) {
          // Rate in the tail belongs to THIS record (it follows the load's fields)
          cur!.rate = parseFloat(line.slice(1).replace(/,/g, ''))
        } else if (isPhone(line)) {
          if (!cur!.phone) cur!.phone = line
        } else if (isEmail(line)) {
          if (!cur!.email) cur!.email = line
        } else if (/^cancell?ed$/i.test(line)) {
          // Mark entire record as cancelled — excluded from final results
          cur!.cancelled = true
        } else if (
          isRpm(line) || isLength(line) || isCs(line) || isDtp(line) ||
          isSep(line) || isAge(line) ||
          line === 'Full' || line === 'Partial' || line === 'Factoring'
        ) {
          // skip
        } else if (!cur!.company && /^[A-Za-z]/.test(line) && line.length > 3) {
          cur!.company = line
        }
        break
      }
    }
  }
  finalize()

  // ── Diagnostics (remove when no longer needed) ───────────────────────────
  console.log('[parsePastedLoads] lines:', lines.length, '| records:', rawRecs.length)
  rawRecs.forEach((r, i) => {
    const rpm   = r.rate != null ? (r.rate / r.miles).toFixed(2) : 'n/a'
    const dhSrc = r.origin_dh != null ? `dh ${r.origin_dh}mi (parsed)` : 'dh – (heuristic)'
    console.log(`  [${i + 1}] ${r.origin_city}, ${r.origin_state} → ${r.dest_city}, ${r.dest_state} | ${r.miles}mi | $${r.rate ?? '–'} | rpm $${rpm} | ${dhSrc}`)
  })

  // ── Step 4: Map to ScoredLoad[] ──────────────────────────────────────────
  let nextRank = 1
  const results: ScoredLoad[] = rawRecs.map(r => {
    const loadedRpm  = r.rate != null && r.miles > 0 ? r.rate / r.miles : null
    const allInMiles = r.origin_dh != null ? r.miles + r.origin_dh : r.miles
    const allInRpm   = r.rate != null && allInMiles > 0 ? r.rate / allInMiles : null
    return {
      pickup_date:        r.pickup_date,
      rate:               r.rate,
      rpm:                loadedRpm,
      origin_dh:          r.origin_dh,
      origin_city:        r.origin_city!,
      origin_state:       r.origin_state!,
      dest_city:          r.dest_city!,
      dest_state:         r.dest_state!,
      miles:              r.miles,
      length_ft:          null,
      weight:             r.weight,
      equip:              r.equip,
      mode:               null,
      company:            r.company,
      phone:              r.phone,
      email:              r.email,
      d2p:                null,
      loaded_rpm:         loadedRpm,
      all_in_miles:       allInMiles,
      all_in_rpm:         allInRpm,
      est_cost:           null,
      est_margin:         null,
      negotiation_target: null,
      score:              loadedRpm != null ? Math.round(loadedRpm * 30) : 50,
      rank:               nextRank++,
      reasons:            ['Pasted import'],
      skip:               false,
      skip_reason:        null,
      first_call_rank:    null,
    }
  })

  // Assign first_call_rank to top 3 by all-in RPM (uses parsed DH when available)
  const byRpm = [...results].sort((a, b) => (b.all_in_rpm ?? b.loaded_rpm ?? 0) - (a.all_in_rpm ?? a.loaded_rpm ?? 0))
  byRpm.slice(0, 3).forEach((l, i) => { l.first_call_rank = i + 1 })

  return results
}

// ---------------------------------------------------------------------------
// Profitability Strip
// ---------------------------------------------------------------------------

const BAND_STYLE: Record<ProfitBand, { border: string; text: string; bg: string }> = {
  strong:     { border: 'border-green-700/40',  text: 'text-green-400',  bg: 'bg-green-900/10'  },
  acceptable: { border: 'border-orange-700/40', text: 'text-orange-400', bg: 'bg-orange-900/10' },
  thin:       { border: 'border-yellow-700/40', text: 'text-yellow-400', bg: 'bg-yellow-900/10' },
  reject:     { border: 'border-red-700/40',    text: 'text-red-400',    bg: 'bg-red-900/10'    },
}

const BAND_LABEL: Record<ProfitBand, string> = {
  strong:     'Strong',
  acceptable: 'Acceptable',
  thin:       'Thin margin',
  reject:     'Reject',
}

const MISSING_MSG: Record<string, string> = {
  location: 'Set driver location to calculate profitability',
  cpm:      'Set driver CPM to calculate profitability',
  rate:     'Needs manual rate entry',
  miles:    'Load miles missing',
}

function ProfitStrip({ check }: { check: ProfitCheck }) {
  const [showWhy,     setShowWhy    ] = useState(false)
  const [showDetails, setShowDetails] = useState(false)

  if (check.incomplete) {
    return (
      <div className='flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-surface-500 bg-surface-700'>
        <AlertCircle size={10} className='text-gray-600 shrink-0' />
        <span className='text-2xs text-gray-600'>{MISSING_MSG[check.missingField] ?? 'Incomplete data'}</span>
      </div>
    )
  }

  const {
    band, locationBasis,
    deadheadMiles, loadedMiles, totalMiles,
    grossRevenue, estimatedCost, estimatedNet, effectiveRpm, whyReasons,
  } = check
  const s       = BAND_STYLE[band]
  const canWhy  = (band === 'thin' || band === 'reject') && whyReasons.length > 0

  return (
    <div className={`rounded-lg border px-3 py-2.5 space-y-2 ${s.border} ${s.bg}`}>

      {/* Header: band label + location basis + why toggle */}
      <div className='flex items-center gap-2 justify-between'>
        <div className='flex items-center gap-2 min-w-0'>
          <span className={`text-xs font-bold uppercase tracking-wide shrink-0 ${s.text}`}>
            {BAND_LABEL[band]}
          </span>
          <span className={`text-2xs px-1.5 py-px rounded border shrink-0 ${
            locationBasis === 'actual'
              ? 'border-blue-700/40 text-blue-400'
              : 'border-surface-400 text-gray-500'
          }`}>
            {locationBasis === 'actual' ? 'Actual location' : 'Est. location'}
          </span>
        </div>
        {canWhy && (
          <button
            onClick={() => setShowWhy(w => !w)}
            className='text-2xs text-gray-500 hover:text-gray-300 transition-colors shrink-0'
          >
            {showWhy ? 'less' : 'why?'}
          </button>
        )}
      </div>

      {/* Primary metric row — Net is intentionally larger to dominate */}
      <div className='flex items-end gap-5'>
        {/* Net — hero value */}
        <div>
          <p className='text-2xs text-gray-600 uppercase tracking-wide leading-none'>Net</p>
          <p className={`text-xl font-mono font-bold leading-tight ${s.text}`}>
            ${Math.round(estimatedNet).toLocaleString()}
          </p>
        </div>
        {/* Supporting metrics */}
        <div className='grid grid-cols-3 gap-x-4 gap-y-0 pb-0.5'>
          {([
            ['Deadhead',  `${deadheadMiles}mi`],
            ['Gross',     `$${Math.round(grossRevenue).toLocaleString()}`],
            ['Eff. RPM',  `$${effectiveRpm.toFixed(2)}`],
          ] as [string, string][]).map(([lbl, val]) => (
            <div key={lbl}>
              <p className='text-2xs text-gray-600 uppercase tracking-wide leading-none'>{lbl}</p>
              <p className='text-sm font-mono font-semibold leading-snug text-gray-200'>{val}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Footer: Details toggle */}
      <button
        onClick={() => setShowDetails(d => !d)}
        className='text-2xs text-gray-600 hover:text-gray-400 transition-colors'
      >
        {showDetails ? 'Hide details' : 'Loaded / Total / Cost \u25be'}
      </button>

      {/* Secondary detail row */}
      {showDetails && (
        <div className='grid grid-cols-3 gap-x-4 pt-1.5 border-t border-surface-600/60'>
          {([
            ['Loaded mi',  `${loadedMiles.toLocaleString()}mi`],
            ['Total mi',   `${totalMiles.toLocaleString()}mi`],
            ['Est. cost',  `$${Math.round(estimatedCost).toLocaleString()}`],
          ] as [string, string][]).map(([lbl, val]) => (
            <div key={lbl}>
              <p className='text-2xs text-gray-600 uppercase tracking-wide leading-none'>{lbl}</p>
              <p className='text-xs font-mono text-gray-400 leading-snug'>{val}</p>
            </div>
          ))}
        </div>
      )}

      {/* Why reasons */}
      {showWhy && whyReasons.length > 0 && (
        <div className='flex flex-wrap gap-1.5 pt-0.5 border-t border-surface-600/60'>
          {whyReasons.map((r, i) => (
            <span key={i} className='text-2xs px-2 py-0.5 rounded-full bg-surface-600 border border-surface-500 text-gray-400'>
              {r}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Compact single-line profit display for ranked table rows
// ---------------------------------------------------------------------------

function CompactProfitBar({
  check, onAddRate,
}: {
  check: ProfitCheck
  onAddRate?: () => void
}) {
  if (check.incomplete) {
    return (
      <div className='flex items-center gap-1.5'>
        <AlertCircle size={10} className='text-gray-600 shrink-0' />
        {check.missingField === 'rate' && onAddRate ? (
          <span className='text-2xs text-gray-500'>
            No rate —{' '}
            <button
              onClick={onAddRate}
              className='text-orange-400 hover:text-orange-300 underline transition-colors'
            >
              add rate
            </button>
          </span>
        ) : (
          <span className='text-2xs text-gray-600'>
            {MISSING_MSG[check.missingField] ?? 'Incomplete data'}
          </span>
        )}
      </div>
    )
  }

  const { band, deadheadMiles, grossRevenue, estimatedNet, effectiveRpm } = check
  const s = BAND_STYLE[band]

  return (
    <div className={`inline-flex items-center gap-4 px-2.5 py-1 rounded border text-2xs ${s.border} ${s.bg}`}>
      {/* Net — hero value */}
      <div className='flex items-baseline gap-1'>
        <span className='text-gray-500 uppercase tracking-wide'>Net</span>
        <span className={`font-mono font-bold text-sm ${s.text}`}>
          ${Math.round(estimatedNet).toLocaleString()}
        </span>
      </div>
      <div className='flex items-baseline gap-1'>
        <span className='text-gray-500 uppercase tracking-wide'>DH</span>
        <span className='font-mono text-gray-400'>{deadheadMiles}mi</span>
      </div>
      <div className='flex items-baseline gap-1'>
        <span className='text-gray-500 uppercase tracking-wide'>Gross</span>
        <span className='font-mono text-gray-400'>${Math.round(grossRevenue).toLocaleString()}</span>
      </div>
      <div className='flex items-baseline gap-1'>
        <span className='text-gray-500 uppercase tracking-wide'>Eff RPM</span>
        <span className='font-mono text-gray-400'>${effectiveRpm.toFixed(2)}</span>
      </div>
      <span className={`font-semibold uppercase tracking-wide ${s.text}`}>
        {BAND_LABEL[band]}
      </span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Broker Intel Badge
// ---------------------------------------------------------------------------

const CALL_BADGE = ['', 'bg-yellow-500', 'bg-gray-400', 'bg-orange-700'] as const

type BrokerIntelMap = Map<string, { avgRpm: number | null; loadCount: number; flag: string }>

function BrokerIntelBadge({ company, intel }: { company: string | null | undefined; intel: BrokerIntelMap }) {
  if (!company) return null
  const row = intel.get(company.toLowerCase())
  if (!row) return null
  const flagWarn = row.flag === 'Avoid' || row.flag === 'Blacklisted' || row.flag === 'Slow Pay'
  return (
    <div className='flex items-center gap-1.5 flex-wrap'>
      {row.loadCount > 0 && row.avgRpm != null && (
        <span className='text-2xs text-gray-500'>
          Our avg <span className='text-gray-300 font-mono'>${row.avgRpm.toFixed(2)}/mi</span>
          <span className='text-gray-700'> ({row.loadCount} loads)</span>
        </span>
      )}
      {row.loadCount === 0 && (
        <span className='text-2xs text-gray-700'>No history</span>
      )}
      {flagWarn && (
        <span className={`text-2xs px-1.5 py-0 rounded border ${
          row.flag === 'Avoid' || row.flag === 'Blacklisted'
            ? 'border-red-700/40 text-red-400'
            : 'border-yellow-700/40 text-yellow-500'
        }`}>{row.flag}</span>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Best First Call card
// ---------------------------------------------------------------------------

function FirstCallCard({
  load, onAdd, brokerIntel, bookmarked, onBookmark, profitCheck, brokers, onCreateBroker,
}: {
  load: ScoredLoad
  onAdd: (l: ScoredLoad) => void
  brokerIntel: BrokerIntelMap
  bookmarked: boolean
  onBookmark: (l: ScoredLoad) => void
  profitCheck: ProfitCheck
  brokers: import('../types/models').Broker[]
  onCreateBroker: (l: ScoredLoad) => void
}) {
  const { o, d } = route(load)
  const badge = CALL_BADGE[load.first_call_rank ?? 0] ?? 'bg-gray-600'
  const matchedBroker = load.company
    ? brokers.find(b => b.name.toLowerCase() === load.company!.toLowerCase())
    : null
  const displayPhone = matchedBroker?.phone ?? load.phone ?? null
  const displayEmail = matchedBroker?.email ?? load.email ?? null
  return (
    <div className='flex-1 min-w-[220px] rounded-xl border border-surface-400 bg-surface-700 p-4 space-y-2.5'>
      <div className='flex items-center justify-between'>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full text-white ${badge}`}>
          Call #{load.first_call_rank}
        </span>
        <div className='flex items-center gap-1'>
          <button
            onClick={() => onBookmark(load)}
            className={`p-1 rounded transition-colors ${bookmarked ? 'text-orange-400' : 'text-gray-600 hover:text-gray-400'}`}
            title={bookmarked ? 'Remove bookmark' : 'Save load'}
          >
            {bookmarked ? <BookmarkCheck size={13} /> : <Bookmark size={13} />}
          </button>
          <button
            onClick={() => onAdd(load)}
            className='flex items-center gap-1 text-2xs px-2 py-0.5 rounded-full bg-orange-600 hover:bg-orange-500 text-white border border-orange-500 font-medium transition-colors'
          >
            <Plus size={9} /> Add
          </button>
        </div>
      </div>

      <div className='flex items-center gap-1 text-sm'>
        <span className='text-gray-200 font-medium'>{o}</span>
        <ArrowRight size={12} className='text-gray-500 shrink-0' />
        <span className='text-gray-400'>{d}</span>
      </div>

      <div className='grid grid-cols-2 gap-x-4 gap-y-1 text-xs'>
        <div>
          <span className='text-gray-600 uppercase tracking-wide text-2xs'>Rate</span>
          <p className='text-gray-200 font-semibold'>{fmt$(load.rate)}</p>
        </div>
        <div>
          <span className='text-gray-600 uppercase tracking-wide text-2xs'>Est. Margin</span>
          <p className={`font-semibold ${marginColor(load.est_margin)}`}>{fmt$(load.est_margin)}</p>
        </div>
        <div>
          <span className='text-gray-600 uppercase tracking-wide text-2xs'>All-in RPM</span>
          <p className={`font-mono font-semibold ${rpmColor(load.all_in_rpm)}`}>{fmtRpm(load.all_in_rpm)}</p>
        </div>
        <div>
          <span className='text-gray-600 uppercase tracking-wide text-2xs'>DH / Miles</span>
          <p className='text-gray-400'>
            {load.origin_dh != null ? `${load.origin_dh}` : '?'} / {fmtN(load.miles)}
          </p>
        </div>
      </div>

      {load.negotiation_target != null && (
        <div className='rounded-lg bg-surface-600 border border-surface-400 px-3 py-1.5 text-xs'>
          <span className='text-gray-500'>Negotiate to </span>
          <span className='text-orange-300 font-semibold'>{fmt$(load.negotiation_target)}</span>
          <span className='text-gray-600'> for $2.75 all-in</span>
        </div>
      )}

      {/* Pre-booking profit check */}
      <ProfitStrip check={profitCheck} />

      <div className='space-y-0.5'>
        <div className='flex items-center justify-between text-2xs text-gray-600'>
          <span className='truncate max-w-[120px]'>{load.company ?? '—'}</span>
          <span>{load.pickup_date ?? '—'}</span>
        </div>
        <BrokerIntelBadge company={load.company} intel={brokerIntel} />
        {/* Broker contact info */}
        {(displayPhone || displayEmail) && (
          <div className='flex flex-col gap-0.5 pt-0.5'>
            {displayPhone && (
              <span className='text-2xs text-gray-500 font-mono'>{displayPhone}</span>
            )}
            {displayEmail && (
              <span className='text-2xs text-gray-500 truncate'>{displayEmail}</span>
            )}
          </div>
        )}
        {/* Create broker action if no match */}
        {load.company && !matchedBroker && (
          <button
            onClick={() => onCreateBroker(load)}
            className='text-2xs text-blue-400 hover:text-blue-300 underline transition-colors'
          >
            + Create broker record
          </button>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Full ranked load row (table)
// ---------------------------------------------------------------------------

function LoadRow({
  load, onAdd, brokerIntel, bookmarked, onBookmark, profitCheck, onRateEdit, brokers, onCreateBroker,
}: {
  load: ScoredLoad
  onAdd: (l: ScoredLoad) => void
  brokerIntel: BrokerIntelMap
  bookmarked: boolean
  onBookmark: (l: ScoredLoad) => void
  profitCheck: ProfitCheck
  onRateEdit?: (rate: number) => void
  brokers: import('../types/models').Broker[]
  onCreateBroker: (l: ScoredLoad) => void
}) {
  const [expanded,    setExpanded   ] = useState(false)
  const [addingRate,  setAddingRate  ] = useState(false)
  const [rateInput,   setRateInput  ] = useState('')
  const { o, d } = route(load)
  const matchedBroker = load.company
    ? brokers.find(b => b.name.toLowerCase() === load.company!.toLowerCase())
    : null
  const displayPhone = matchedBroker?.phone ?? load.phone ?? null
  const displayEmail = matchedBroker?.email ?? load.email ?? null

  const handleSaveRate = () => {
    const v = parseFloat(rateInput.replace(/[$,]/g, ''))
    if (isNaN(v) || v <= 0) return
    onRateEdit?.(v)
    setAddingRate(false)
    setRateInput('')
  }

  return (
    <>
      <tr className='border-b border-surface-600 hover:bg-surface-700 transition-colors'>
        <td className='pl-4 pr-2 py-1.5 text-xs font-bold text-gray-400'>{load.rank}</td>
        <td className='pr-3 py-1.5'>
          <span className='flex items-center gap-1 text-xs'>
            <span className='text-gray-200 font-medium'>{o}</span>
            <ArrowRight size={9} className='text-gray-500 shrink-0' />
            <span className='text-gray-400'>{d}</span>
          </span>
        </td>
        <td className='pr-3 py-1.5 text-xs font-mono font-semibold text-gray-200'>{fmt$(load.rate)}</td>
        <td className='pr-3 py-1.5 text-xs font-mono text-gray-500'>{fmtRpm(load.loaded_rpm)}</td>
        <td className={`pr-3 py-1.5 text-xs font-mono font-semibold ${rpmColor(load.all_in_rpm)}`}>
          {fmtRpm(load.all_in_rpm)}
        </td>
        <td className={`pr-3 py-1.5 text-xs font-mono font-semibold ${marginColor(load.est_margin)}`}>
          {fmt$(load.est_margin)}
        </td>
        <td className='pr-3 py-1.5 text-xs font-mono text-orange-400'>
          {load.negotiation_target != null ? fmt$(load.negotiation_target) : ''}
        </td>
        <td className='pr-3 py-1.5 text-xs font-mono text-gray-500'>
          {load.origin_dh != null ? `${load.origin_dh}mi` : '—'}
        </td>
        <td className='pr-3 py-1.5 text-xs font-mono text-gray-500'>{fmtN(load.miles)}mi</td>
        <td className='pr-3 py-1.5 text-xs text-gray-400 max-w-[150px]'>
          <span className='truncate block'>{load.company ?? '—'}</span>
          <BrokerIntelBadge company={load.company} intel={brokerIntel} />
          {displayPhone && (
            <span className='block text-2xs text-gray-600 font-mono truncate'>{displayPhone}</span>
          )}
          {displayEmail && (
            <span className='block text-2xs text-gray-600 truncate'>{displayEmail}</span>
          )}
          {load.company && !matchedBroker && (
            <button
              onClick={() => onCreateBroker(load)}
              className='text-2xs text-blue-400 hover:text-blue-300 underline transition-colors'
            >
              + Create broker
            </button>
          )}
        </td>
        <td className='pr-3 py-1.5 text-xs text-gray-500'>{load.pickup_date ?? '—'}</td>
        <td className='pr-3 py-1.5'>
          <div className='flex items-center gap-1'>
            <button
              onClick={() => onBookmark(load)}
              className={`p-1 rounded transition-colors ${bookmarked ? 'text-orange-400' : 'text-gray-600 hover:text-gray-400'}`}
              title={bookmarked ? 'Remove bookmark' : 'Save load'}
            >
              {bookmarked ? <BookmarkCheck size={12} /> : <Bookmark size={12} />}
            </button>
            <button
              onClick={() => onAdd(load)}
              className='flex items-center gap-1 text-2xs px-2 py-0.5 rounded-full bg-orange-600 hover:bg-orange-500 text-white border border-orange-500 font-medium transition-colors'
            >
              <Plus size={9} /> Add
            </button>
            <button
              onClick={() => setExpanded(e => !e)}
              className='p-1 rounded text-gray-600 hover:text-gray-300 transition-colors'
            >
              {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
          </div>
        </td>
      </tr>

      {/* Compact profit bar — always visible, no expand required */}
      <tr className='border-b border-surface-600 last:border-0'>
        <td colSpan={12} className='pl-8 pr-4 py-1'>
          {addingRate ? (
            <div className='flex items-center gap-2'>
              <span className='text-2xs text-gray-500'>Rate $</span>
              <input
                type='number'
                value={rateInput}
                onChange={e => setRateInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSaveRate(); if (e.key === 'Escape') { setAddingRate(false); setRateInput('') } }}
                placeholder='850'
                autoFocus
                className='w-24 bg-surface-700 border border-surface-500 focus:border-orange-500 text-gray-100 text-xs rounded px-2 py-1 font-mono focus:outline-none'
              />
              <button
                onClick={handleSaveRate}
                disabled={!rateInput.trim()}
                className='text-2xs px-2 py-1 rounded bg-orange-600 hover:bg-orange-500 text-white disabled:opacity-40 transition-colors'
              >
                Save
              </button>
              <button
                onClick={() => { setAddingRate(false); setRateInput('') }}
                className='text-2xs px-2 py-1 rounded bg-surface-600 hover:bg-surface-500 text-gray-400 border border-surface-500 transition-colors'
              >
                Cancel
              </button>
            </div>
          ) : (
            <CompactProfitBar
              check={profitCheck}
              onAddRate={onRateEdit ? () => setAddingRate(true) : undefined}
            />
          )}
        </td>
      </tr>

      {expanded && (
        <tr>
          <td colSpan={12} className='pl-8 pr-4 pb-3 pt-1'>
            <div className='flex flex-wrap gap-2 items-center'>
              {load.reasons.map((r, i) => (
                <span key={i} className='text-2xs px-2 py-0.5 rounded-full bg-surface-600 text-gray-400 border border-surface-500'>
                  {r}
                </span>
              ))}
              {load.weight != null && (
                <span className='text-2xs text-gray-600'>{fmtN(load.weight)} lbs</span>
              )}
              {load.length_ft != null && (
                <span className='text-2xs text-gray-600'>{load.length_ft}ft load</span>
              )}
              {load.d2p != null && (
                <span className='text-2xs text-gray-600'>D2P {load.d2p}d</span>
              )}
              {load.equip && (
                <span className='text-2xs text-gray-600'>{load.equip}{load.mode ? ` / ${load.mode}` : ''}</span>
              )}
              {load.all_in_miles != null && (
                <span className='text-2xs text-gray-600'>{fmtN(load.all_in_miles)}mi all-in</span>
              )}
              {load.est_cost != null && (
                <span className='text-2xs text-gray-600'>Est. cost {fmt$(load.est_cost)}</span>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

// ---------------------------------------------------------------------------
// Rate Calculator — always visible, collapsible
// ---------------------------------------------------------------------------

function RateCalculator() {
  const [open, setOpen]    = useState(false)
  const [rateS, setRate]   = useState('')
  const [milesS, setMiles] = useState('')
  const [dhS,   setDh]     = useState('')
  const [cpmS,  setCpm]    = useState('0.75')

  const r   = parseFloat(rateS)  || 0
  const mi  = parseFloat(milesS) || 0
  const dh  = parseFloat(dhS)    || 0
  const cpm = parseFloat(cpmS)   || 0

  const loadedRpm = mi > 0 && r > 0   ? r / mi       : null
  const aim       = mi + dh
  const allInRpm  = aim > 0 && r > 0  ? r / aim      : null
  const estCost   = aim > 0 && cpm > 0 ? aim * cpm   : null
  const estMargin = estCost != null && r > 0 ? r - estCost : null

  return (
    <div className='rounded-xl border border-surface-400 bg-surface-800'>
      <button
        onClick={() => setOpen(o => !o)}
        className='w-full flex items-center justify-between px-4 py-2.5 text-sm text-gray-400 hover:text-gray-200 transition-colors'
      >
        <div className='flex items-center gap-2'>
          <Calculator size={14} className='text-gray-500' />
          <span>Quick Rate Calculator</span>
        </div>
        {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </button>

      {open && (
        <div className='px-4 pb-4 border-t border-surface-600 pt-3 space-y-3'>
          <div className='grid grid-cols-4 gap-3'>
            {([
              ['Rate $', rateS,  setRate,  '2500'],
              ['Miles',  milesS, setMiles, '850'],
              ['DH mi',  dhS,    setDh,    '45'],
              ['CPM $',  cpmS,   setCpm,   '0.75'],
            ] as [string, string, (v: string) => void, string][]).map(([label, val, set, ph]) => (
              <div key={label}>
                <label className='text-2xs text-gray-600 uppercase tracking-wide block mb-1'>{label}</label>
                <input
                  type='number'
                  value={val}
                  onChange={e => set(e.target.value)}
                  placeholder={ph}
                  className='w-full bg-surface-700 border border-surface-500 text-gray-100 text-sm rounded-lg px-2 py-1.5 focus:outline-none focus:border-orange-500 font-mono'
                />
              </div>
            ))}
          </div>
          <div className='grid grid-cols-4 gap-3 pt-1'>
            <div>
              <p className='text-2xs text-gray-600 uppercase tracking-wide'>Loaded RPM</p>
              <p className={`text-sm font-mono font-semibold mt-0.5 ${rpmColor(loadedRpm)}`}>
                {loadedRpm != null ? '$' + loadedRpm.toFixed(2) : '—'}
              </p>
            </div>
            <div>
              <p className='text-2xs text-gray-600 uppercase tracking-wide'>All-in RPM</p>
              <p className={`text-sm font-mono font-semibold mt-0.5 ${rpmColor(allInRpm)}`}>
                {allInRpm != null ? '$' + allInRpm.toFixed(2) : '—'}
              </p>
            </div>
            <div>
              <p className='text-2xs text-gray-600 uppercase tracking-wide'>Est. Cost</p>
              <p className='text-sm font-mono text-gray-400 mt-0.5'>
                {estCost != null ? '$' + Math.round(estCost).toLocaleString() : '—'}
              </p>
            </div>
            <div>
              <p className='text-2xs text-gray-600 uppercase tracking-wide'>Est. Margin</p>
              <p className={`text-sm font-mono font-semibold mt-0.5 ${marginColor(estMargin)}`}>
                {estMargin != null ? '$' + Math.round(estMargin).toLocaleString() : '—'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Lane Fit Panel — shown in empty state
// ---------------------------------------------------------------------------

function LaneFitPanel({ driverId, driverName }: { driverId: number; driverName: string }) {
  const [lanes, setLanes] = useState<DriverLaneFitRow[]>([])

  useEffect(() => {
    window.api.intel.driverFit(driverId)
      .then(rows => setLanes(rows.slice(0, 6)))
      .catch(() => {})
  }, [driverId])

  if (!lanes.length) return null

  return (
    <div className='rounded-xl border border-surface-400 bg-surface-800 p-4 space-y-3'>
      <div className='flex items-center gap-2'>
        <Navigation size={13} className='text-blue-400' />
        <h3 className='text-sm font-medium text-gray-300'>{driverName} Lane History</h3>
        <span className='text-xs text-gray-600'>Strongest corridors — search these first</span>
      </div>
      <div className='grid grid-cols-3 gap-2'>
        {lanes.map((lane, i) => (
          <div key={i} className={`rounded-lg border px-3 py-2 space-y-1 ${
            lane.fit === 'Strong Fit'  ? 'border-green-700/40 bg-green-900/10'  :
            lane.fit === 'Has History' ? 'border-blue-700/40 bg-blue-900/10'    :
            'border-surface-500 bg-surface-700'
          }`}>
            <div className='flex items-center gap-1 text-xs font-medium text-gray-200'>
              <span>{lane.origin_state}</span>
              <ArrowRight size={9} className='text-gray-600' />
              <span>{lane.dest_state}</span>
            </div>
            <div className='flex items-center justify-between'>
              <span className={`text-2xs ${
                lane.fit === 'Strong Fit'  ? 'text-green-400' :
                lane.fit === 'Has History' ? 'text-blue-400'  : 'text-gray-500'
              }`}>{lane.fit}</span>
              {lane.avg_rpm != null && (
                <span className='text-2xs font-mono text-gray-600'>${lane.avg_rpm.toFixed(2)}/mi</span>
              )}
            </div>
            <p className='text-2xs text-gray-700'>
              {lane.loads_count} load{lane.loads_count !== 1 ? 's' : ''}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Lane Suggestion Card
// Clicking selects the lane and expands a structured search preset.
// Each preset field has its own copy button. Open DAT / Truckstop
// opens the board and copies the full preset string to clipboard.
// ---------------------------------------------------------------------------

function copyText(text: string, setCopied: (v: boolean) => void) {
  navigator.clipboard.writeText(text).then(() => {
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }).catch(() => {})
}

function FieldCopyRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <div className='flex items-center justify-between gap-2 py-0.5'>
      <span className='text-2xs text-gray-600 w-14 shrink-0'>{label}</span>
      <span className='text-2xs text-gray-300 flex-1 font-mono'>{value}</span>
      <button
        onClick={() => copyText(value, setCopied)}
        title={`Copy ${label}`}
        className='text-2xs px-1.5 py-0.5 rounded border border-surface-500 text-gray-600 hover:text-gray-300 hover:border-surface-400 transition-colors shrink-0'
      >
        {copied ? <Check size={9} /> : <Copy size={9} />}
      </button>
    </div>
  )
}

/** Projected net at driver's minimum RPM. Returns null when cpm or min_rpm is missing. */
function laneProjectedNet(driver: Driver, estimatedMiles: number): number | null {
  if (driver.min_rpm == null || driver.cpm == null) return null
  const dh       = 75 // same-market deadhead estimate
  const minGross = driver.min_rpm * estimatedMiles
  const cost     = (dh + estimatedMiles) * driver.cpm
  return minGross - cost
}

/** Band at a given net, using shared thresholds. RPM gate skipped (no actual rate). */
function bandFromNet(net: number): ProfitBand {
  const T = PROFIT_THRESHOLDS
  if (net < T.REJECT_NET) return 'reject'
  if (net < T.THIN_NET)   return 'thin'
  if (net >= T.STRONG_NET) return 'strong'
  return 'acceptable'
}

function LaneSuggestionCard({
  lane, driver, isSelected, onSelect,
}: {
  lane:       LaneSuggestion
  driver:     Driver
  isSelected: boolean
  onSelect:   () => void
}) {
  const [datCopied, setDatCopied] = useState(false)
  const [tsCopied,  setTsCopied ] = useState(false)
  const [allCopied, setAllCopied] = useState(false)

  const destCity  = lane.destLabel.split(',')[0]
  const destState = lane.destLabel.split(',')[1]?.trim() ?? ''
  const equip     = [driver.trailer_type, driver.trailer_length].filter(Boolean).join(' ')

  // Ordered preset fields — what the dispatcher enters into DAT/Truckstop manually
  const presetFields: { label: string; value: string }[] = [
    { label: 'Origin',  value: lane.originLabel },
    { label: 'Dest',    value: lane.destLabel },
    ...(equip ? [{ label: 'Equip', value: equip }] : []),
    ...(driver.min_rpm != null ? [{ label: 'Min RPM', value: `$${driver.min_rpm.toFixed(2)}/mi` }] : []),
    { label: '~Miles',  value: `${lane.estimatedMiles.toLocaleString()} mi` },
  ]

  function buildFullPreset() {
    return presetFields.map(f => `${f.label}: ${f.value}`).join(' | ')
  }

  // Opens the board and copies the full preset to clipboard so the dispatcher
  // can paste it as a reference while entering search fields manually.
  function openBoard(url: string, setCopied: (v: boolean) => void) {
    window.api.shell.openExternal(url)
    copyText(buildFullPreset(), setCopied)
  }

  const visibleTags = lane.tags.slice(0, 3)

  return (
    <div
      className={[
        'rounded-xl border flex flex-col gap-2 transition-all',
        isSelected
          ? 'border-orange-500/70 bg-surface-700 p-3 ring-1 ring-orange-600/20'
          : 'border-surface-400 bg-surface-700 p-3 hover:border-surface-300 cursor-pointer',
      ].join(' ')}
      onClick={!isSelected ? onSelect : undefined}
    >

      {/* Route header — always visible */}
      <div className='flex items-center gap-1.5 min-w-0'>
        <span className='text-xs font-medium text-gray-400 shrink-0'>{lane.originLabel.split(',')[0]}</span>
        <ArrowRight size={11} className='text-gray-600 shrink-0' />
        <span className='text-sm font-semibold text-orange-300 truncate'>{destCity}</span>
        {destState && <span className='text-2xs text-gray-500 shrink-0'>{destState}</span>}
        {lane.towardHome && (
          <Home size={11} className='text-blue-400 shrink-0 ml-auto' title='Toward home base' />
        )}
      </div>

      {/* Tags + miles + projected profit signal */}
      <div className='flex items-center gap-1 flex-wrap'>
        {visibleTags.map(tag => (
          <span key={tag} className={`text-2xs px-1.5 py-0 rounded border ${tagStyle(tag)}`}>
            {tagLabel(tag)}
          </span>
        ))}
        <span className='text-2xs text-gray-600 ml-auto shrink-0'>
          ~{lane.estimatedMiles.toLocaleString()} mi
        </span>
        {(() => {
          const net = laneProjectedNet(driver, lane.estimatedMiles)
          if (net == null) return null
          const band = bandFromNet(net)
          const cls =
            band === 'strong'     ? 'border-green-700/50 text-green-400'   :
            band === 'acceptable' ? 'border-orange-700/50 text-orange-400' :
            band === 'thin'       ? 'border-yellow-700/50 text-yellow-500' :
                                    'border-red-700/50 text-red-400'
          return (
            <span className={`text-2xs px-1.5 py-px rounded border shrink-0 font-mono ${cls}`}
              title={`Projected min net at $${driver.min_rpm!.toFixed(2)}/mi: $${Math.round(net).toLocaleString()}`}
            >
              ~${Math.round(net).toLocaleString()}
            </span>
          )
        })()}
      </div>

      {/* Expanded: active preset fields + external board actions */}
      {isSelected && (
        <>
          {/* Active preset header */}
          <div className='border-t border-surface-600 pt-2 space-y-0.5'>
            <div className='flex items-center justify-between mb-1.5'>
              <div className='flex items-center gap-1.5'>
                <span className='inline-block w-1.5 h-1.5 rounded-full bg-orange-400 shrink-0' />
                <p className='text-2xs text-orange-400 font-semibold uppercase tracking-wide'>Active Preset</p>
              </div>
              <button
                onClick={() => onSelect()}
                title='Clear preset'
                className='text-2xs text-gray-600 hover:text-gray-300 transition-colors'
              >
                Clear ×
              </button>
            </div>
            {presetFields.map(f => (
              <FieldCopyRow key={f.label} label={f.label} value={f.value} />
            ))}
          </div>

          {/* Copy all + external board actions */}
          <div className='border-t border-surface-600 pt-2 space-y-2'>
            {/* Copy All — standalone row */}
            <button
              onClick={() => copyText(buildFullPreset(), setAllCopied)}
              className={`w-full flex items-center justify-center gap-1.5 text-2xs py-1.5 rounded border transition-colors ${
                allCopied
                  ? 'bg-green-900/30 border-green-700/50 text-green-400'
                  : 'bg-surface-600 border-surface-500 text-gray-400 hover:text-gray-200'
              }`}
            >
              {allCopied ? <><Check size={9} /> Preset Copied</> : <><Copy size={9} /> Copy Full Preset</>}
            </button>
            {/* Open external boards — each copies the preset to clipboard */}
            <div className='flex gap-1.5'>
              <button
                onClick={() => openBoard('https://one.dat.com/search-loads', setDatCopied)}
                className={`flex items-center justify-center gap-1 text-2xs px-2 py-1 rounded border transition-colors flex-1 ${
                  datCopied
                    ? 'bg-green-900/30 border-green-700/50 text-green-400'
                    : 'bg-surface-600 border-surface-500 text-gray-400 hover:text-gray-200'
                }`}
                title='Open DAT and copy preset to clipboard'
              >
                {datCopied ? <><Check size={9} /> Copied</> : <><ExternalLink size={9} /> Open DAT</>}
              </button>
              <button
                onClick={() => openBoard('https://www.truckstop.com/public/load-search/', setTsCopied)}
                className={`flex items-center justify-center gap-1 text-2xs px-2 py-1 rounded border transition-colors flex-1 ${
                  tsCopied
                    ? 'bg-green-900/30 border-green-700/50 text-green-400'
                    : 'bg-surface-600 border-surface-500 text-gray-400 hover:text-gray-200'
                }`}
                title='Open Truckstop and copy preset to clipboard'
              >
                {tsCopied ? <><Check size={9} /> Copied</> : <><ExternalLink size={9} /> Truckstop</>}
              </button>
            </div>
            <p className='text-2xs text-gray-700 text-center leading-tight'>
              Open the board, paste or enter the preset fields above
            </p>
          </div>
        </>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Suggested Lanes Panel
// ---------------------------------------------------------------------------

const STRATEGY_LABELS: Record<SearchStrategy, string> = {
  all:    'All Lanes',
  volume: 'Best Volume',
  short:  'Short Runs',
  home:   'Toward Home',
}

function SuggestedLanesPanel({
  driver, allLoads, selectedLane, onSelectLane, locationOverride,
}: {
  driver:           Driver
  allLoads:         Load[]
  selectedLane:     LaneSuggestion | null
  onSelectLane:     (lane: LaneSuggestion | null) => void
  locationOverride?: string | null
}) {
  const [strategy, setStrategy] = useState<SearchStrategy>('all')

  const effectiveLocation = locationOverride ?? driver.current_location
  const originKey    = resolveMarket(effectiveLocation)
  const originMarket = originKey ? getMarket(originKey) : null

  const suggestions: LaneSuggestion[] = useMemo(() => getSuggestedLanes({
    currentLocation: effectiveLocation,
    homeBase:        driver.home_base,
    trailerType:     driver.trailer_type,
    driverId:        driver.id,
    historicalLoads: allLoads,
    strategy,
    limit: 8,
  }), [effectiveLocation, driver.home_base, driver.trailer_type, driver.id, allLoads, strategy])

  // When driver changes, clear the selected lane
  const prevDriverId = useRef(driver.id)
  useEffect(() => {
    if (prevDriverId.current !== driver.id) {
      onSelectLane(null)
      prevDriverId.current = driver.id
    }
  }, [driver.id, onSelectLane])

  function toggleLane(lane: LaneSuggestion) {
    onSelectLane(selectedLane?.destMarket === lane.destMarket ? null : lane)
  }

  return (
    <div className='rounded-xl border border-surface-400 bg-surface-800 p-4 space-y-3'>

      {/* Header */}
      <div className='flex items-start justify-between gap-3 flex-wrap'>
        <div className='flex items-center gap-2'>
          <Compass size={14} className='text-orange-400 shrink-0' />
          <span className='text-sm font-medium text-gray-200'>Suggested Search Lanes</span>
          {originMarket
            ? <span className='text-xs text-gray-500'>from {originMarket.label}</span>
            : driver.current_location
              ? <span className='text-xs text-orange-500'>
                  Location not recognized — update in Drivers page
                </span>
              : <span className='text-xs text-gray-600'>Set driver location to see suggestions</span>
          }
        </div>

        {/* Strategy filter tabs */}
        <div className='flex gap-1.5 flex-wrap'>
          {(Object.keys(STRATEGY_LABELS) as SearchStrategy[]).map(s => (
            <button
              key={s}
              onClick={() => setStrategy(s)}
              className={`text-2xs px-2.5 py-1 rounded-full border transition-colors ${
                strategy === s
                  ? 'bg-orange-600 border-orange-500 text-white'
                  : 'bg-surface-700 border-surface-500 text-gray-400 hover:text-gray-200 hover:border-surface-400'
              }`}
            >
              {STRATEGY_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      {/* Lane grid */}
      {!originKey ? (
        <div className='flex flex-col items-center gap-2 py-6 text-center'>
          <Navigation size={18} className='text-gray-600' />
          <p className='text-sm text-gray-500'>No location set for this driver.</p>
          <p className='text-xs text-gray-600'>
            Set a current location on the Drivers page to unlock lane suggestions.
          </p>
        </div>
      ) : suggestions.length === 0 ? (
        <p className='text-xs text-gray-500 text-center py-4'>
          No lanes match this strategy. Switch to "All Lanes".
        </p>
      ) : (
        <div className='grid grid-cols-2 gap-2'>
          {suggestions.map((lane, i) => (
            <LaneSuggestionCard
              key={i}
              lane={lane}
              driver={driver}
              isSelected={selectedLane?.destMarket === lane.destMarket}
              onSelect={() => toggleLane(lane)}
            />
          ))}
        </div>
      )}

      {/* Driver context footer */}
      <div className='flex items-center gap-3 pt-1.5 border-t border-surface-600 flex-wrap'>
        {driver.current_location && (
          <div className='flex items-center gap-1 text-2xs text-gray-500'>
            <MapPin size={10} className='text-orange-400' />
            <span>{driver.current_location}</span>
          </div>
        )}
        {driver.trailer_type && (
          <span className='text-2xs text-gray-600'>
            {[driver.trailer_type, driver.trailer_length].filter(Boolean).join(' ')}
          </span>
        )}
        {driver.min_rpm != null && (
          <span className='text-2xs text-gray-600'>Min ${driver.min_rpm.toFixed(2)}/mi</span>
        )}
        {driver.home_base && (
          <div className='flex items-center gap-1 text-2xs text-gray-600'>
            <Home size={9} />
            <span>{driver.home_base}</span>
          </div>
        )}
        {!selectedLane && originKey && (
          <span className='text-2xs text-gray-700 ml-auto'>
            Click a lane to open its search preset
          </span>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Import Options Panel — collapsible, shown in empty state as secondary info
// ---------------------------------------------------------------------------

function ImportOptionsPanel() {
  const [open, setOpen] = useState(false)
  return (
    <div className='rounded-xl border border-surface-500 bg-surface-800'>
      <button
        onClick={() => setOpen(o => !o)}
        className='w-full flex items-center justify-between px-4 py-2.5 text-sm text-gray-500 hover:text-gray-300 transition-colors'
      >
        <span>How to import loads from DAT / Truckstop</span>
        {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </button>
      {open && (
        <div className='px-4 pb-4 border-t border-surface-600 pt-3 space-y-3 text-sm text-gray-500'>
          <div>
            <p className='text-gray-400 font-medium mb-1'>Import from Browser (recommended)</p>
            <p>
              Click "Import from Browser" above, then tell Claude which tab to read. Works
              directly with DAT and Truckstop — no export or conversion needed.
            </p>
          </div>
          <div className='border-t border-surface-600 pt-3'>
            <p className='text-gray-400 font-medium mb-1'>Import XLSX</p>
            <p>
              Export search results from DAT or Truckstop as a spreadsheet, then click
              "Import XLSX" to select the file and score loads automatically.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Broker Intel builder
// ---------------------------------------------------------------------------

function buildBrokerIntel(brokers: Broker[], loads: Load[]): BrokerIntelMap {
  const map = new Map<string, { avgRpm: number | null; loadCount: number; flag: string }>()
  for (const b of brokers) {
    const key    = b.name.toLowerCase()
    const bLoads = loads.filter(l => l.broker_id === b.id && ['Delivered', 'Invoiced', 'Paid'].includes(l.status))
    const rpmLds = bLoads.filter(l => l.rate != null && l.miles != null && l.miles > 0)
    const avgRpm = rpmLds.length > 0
      ? rpmLds.reduce((s, l) => s + l.rate! / l.miles!, 0) / rpmLds.length
      : null
    map.set(key, { avgRpm, loadCount: bLoads.length, flag: b.flag })
  }
  return map
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function FindLoads() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [drivers,          setDrivers         ] = useState<Driver[]>([])
  const [brokers,          setBrokers         ] = useState<Broker[]>([])
  const [allLoads,         setAllLoads        ] = useState<Load[]>([])
  const [driverId,         setDriverId        ] = useState<number | null>(null)
  const [cpm,              setCpm             ] = useState<number>(0.75)
  const [loading,          setLoading         ] = useState(false)
  const [result,           setResult          ] = useState<ParseScreenshotResult | null>(null)
  const [error,            setError           ] = useState<string | null>(null)
  const [showRejected,     setShowRejected    ] = useState(false)
  const [browserListening, setBrowserListening] = useState(false)
  const [dropCity,         setDropCity        ] = useState<string | null>(null)
  const [dropCityBasis,    setDropCityBasis   ] = useState<'actual' | 'estimated'>('estimated')
  // New state
  const [resultTimestamp,  setResultTimestamp ] = useState<Date | null>(null)
  const [compareDriverId,  setCompareDriverId ] = useState<number | null>(null)
  const [bookmarked,       setBookmarked      ] = useState<Set<number>>(new Set())
  const [showStrategy,     setShowStrategy    ] = useState(false)
  const [selectedLane,     setSelectedLane    ] = useState<LaneSuggestion | null>(null)
  const [cmdCopied,        setCmdCopied       ] = useState(false)
  const [datCopied,        setDatCopied       ] = useState(false)
  const [profitSort,       setProfitSort      ] = useState<'net' | 'rpm' | null>(null)
  const [hideBands,        setHideBands       ] = useState<Set<ProfitBand>>(new Set())
  const [resultSource,     setResultSource    ] = useState<'file' | 'browser' | 'sample' | 'paste' | null>(null)
  const [showPaste,        setShowPaste       ] = useState(false)
  const [showAllLoads,     setShowAllLoads    ] = useState(false)
  const [pasteText,        setPasteText       ] = useState('')
  const [parseStatus,      setParseStatus     ] = useState<string | null>(null)
  const [dropCityOverride, setDropCityOverride] = useState<string | null>(null)
  const [editingDropCity,  setEditingDropCity ] = useState(false)
  const [dropCityInput,    setDropCityInput   ] = useState('')

  const lastSeqRef = useRef(0)

  // Reset "show all" whenever a new result is loaded
  useEffect(() => { setShowAllLoads(false) }, [result])

  // ── Session persistence for pasted/file results ───────────────────────────
  // Persist non-browser results to sessionStorage so navigating to Add Load
  // and returning does not wipe the parsed result.
  const SESSION_KEY = `ontrack_findloads_${driverId ?? 'default'}`
  useEffect(() => {
    if (!result || !resultSource || resultSource === 'browser') return
    try { sessionStorage.setItem(SESSION_KEY, JSON.stringify({ result, resultSource })) }
    catch { /* quota – silent */ }
  }, [result, resultSource, SESSION_KEY])

  // Restore on mount (once, before the browser-import restore runs)
  const sessionRestored = useRef(false)
  useEffect(() => {
    if (sessionRestored.current) return
    sessionRestored.current = true
    // Scan all session keys for this page to find a result (any driver)
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i)
      if (!key?.startsWith('ontrack_findloads_')) continue
      try {
        const saved = JSON.parse(sessionStorage.getItem(key) ?? '')
        if (saved?.result?.loads?.length) {
          setResult(saved.result)
          setResultSource(saved.resultSource)
          return
        }
      } catch { /* corrupt entry */ }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    window.api.drivers.list('Active').then(setDrivers)
    Promise.all([window.api.brokers.list(), window.api.loads.list()])
      .then(([b, l]) => { setBrokers(b); setAllLoads(l) })
      .catch(() => {})

    // Restore last import on mount — no timestamp since we don't know when it was
    window.api.loads.getLastBrowserImport().then(({ seq, payload }) => {
      if (seq > 0 && payload?.loads?.length) {
        lastSeqRef.current = seq
        setResult(payload)
      }
    }).catch(() => {})

    // IPC push listener
    const cb = (data: unknown) => {
      setBrowserListening(false)
      const payload = data as ParseScreenshotResult
      if (!payload?.loads?.length) {
        setError('No loads received. Make sure Claude posted the scored results.')
        return
      }
      setResult(payload)
      setResultSource('browser')
      setResultTimestamp(new Date())
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(window.api as any).browserImport.onResult(cb)

    // Poll every 2s — picks up new browser imports while tab is open
    const interval = setInterval(async () => {
      try {
        const { seq, payload } = await window.api.loads.getLastBrowserImport()
        if (seq > lastSeqRef.current && payload?.loads?.length) {
          lastSeqRef.current = seq
          setBrowserListening(false)
          setResult(payload)
          setResultSource('browser')
          setResultTimestamp(new Date())
        }
      } catch { /* main process not ready — ignore */ }
    }, 2000)

    return () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(window.api as any).browserImport.offResult(cb)
      clearInterval(interval)
    }
  }, [])

  const startBrowserListen = () => {
    if (browserListening) { setBrowserListening(false); return }
    setError(null)
    setBrowserListening(true)
  }

  useEffect(() => {
    if (drivers.length && !driverId) {
      const id = parseDriverIdParam(searchParams)
      if (id) {
        const match = drivers.find(d => d.id === id)
        setDriverId(match ? id : drivers[0].id)
      } else {
        setDriverId(drivers[0].id)
      }
    }
  }, [drivers, driverId, searchParams])

  // Default CPM from driver profile
  useEffect(() => {
    if (!driverId) return
    const driver = drivers.find(d => d.id === driverId)
    if (driver?.cpm != null)      setCpm(driver.cpm)
    else if (driver?.min_rpm != null) setCpm(driver.min_rpm)
    else setCpm(0.75)
  }, [driverId, drivers])

  // Resolve driver's current position and record whether it is the confirmed
  // current_location ('actual') or a fallback estimate ('estimated').
  // Priority: active-load drop city → current_location → home_base.
  // Only current_location is treated as 'actual'; the others are fallbacks.
  useEffect(() => {
    if (!driverId) { setDropCity(null); setDropCityBasis('estimated'); return }
    const driver = drivers.find(d => d.id === driverId)
    Promise.all([
      window.api.loads.list('In Transit'),
      window.api.loads.list('Picked Up'),
      window.api.loads.list('Booked'),
    ]).then(([inTransit, pickedUp, booked]: [Load[], Load[], Load[]]) => {
      const active = [...inTransit, ...pickedUp, ...booked].find(l => l.driver_id === driverId)
      if (active?.dest_city) {
        // Estimated: we know where the load ends, not where the driver is mid-haul
        setDropCity([active.dest_city, active.dest_state].filter(Boolean).join(', '))
        setDropCityBasis('estimated')
      } else if (driver?.current_location) {
        // Actual: dispatcher has confirmed the driver's current position
        setDropCity(driver.current_location)
        setDropCityBasis('actual')
      } else {
        // Estimated: home base is a standing default, not a live position
        setDropCity(driver?.home_base ?? null)
        setDropCityBasis('estimated')
      }
    })
  }, [driverId, drivers])

  const handleImport = async () => {
    if (!driverId) return
    setLoading(true)
    setError(null)
    try {
      const res = await window.api.loads.importXlsx(driverId, cpm)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((res as any).cancelled) return
      if (res.error) { setError(res.error); return }
      setResult(res)
      setResultSource('file')
      setResultTimestamp(new Date())
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }

  const handleLoadSample = () => {
    // Synthetic loads designed to exercise all profit bands and edge cases.
    // Rates/miles chosen so deadhead heuristic (same-state=75mi, cross-state=250mi)
    // produces clear strong / acceptable / thin / reject outcomes at typical CPM.
    const samples: ScoredLoad[] = [
      // --- STRONG (TX->TX same-state, high rate, reasonable miles) ---
      {
        pickup_date: new Date().toISOString().slice(0, 10),
        rate: 2800, rpm: 2.80, origin_dh: 30,
        origin_city: 'Dallas',    origin_state: 'TX',
        dest_city:   'Houston',   dest_state:   'TX',
        miles: 1000, length_ft: 48, weight: 42000,
        equip: 'Van', mode: 'FTL', company: 'Echo Global',
        d2p: null, phone: null, email: null,
        loaded_rpm: 2.80, all_in_miles: 1075, all_in_rpm: 2.60,
        est_cost: 807, est_margin: 1993, negotiation_target: 2900,
        score: 95, rank: 1, reasons: ['High RPM', 'Same-state short DH'],
        skip: false, skip_reason: null, first_call_rank: 1,
      },
      // --- STRONG (long haul, high rate) ---
      {
        pickup_date: new Date().toISOString().slice(0, 10),
        rate: 4500, rpm: 3.00, origin_dh: 45,
        origin_city: 'Atlanta',   origin_state: 'GA',
        dest_city:   'Chicago',   dest_state:   'IL',
        miles: 1500, length_ft: 53, weight: 38000,
        equip: 'Van', mode: 'FTL', company: 'Coyote Logistics',
        d2p: null, phone: null, email: null,
        loaded_rpm: 3.00, all_in_miles: 1750, all_in_rpm: 2.57,
        est_cost: 1313, est_margin: 3187, negotiation_target: 4600,
        score: 88, rank: 2, reasons: ['Top RPM', 'Long haul premium'],
        skip: false, skip_reason: null, first_call_rank: 2,
      },
      // --- ACCEPTABLE (mid-rate, moderate miles, cross-state DH) ---
      {
        pickup_date: new Date().toISOString().slice(0, 10),
        rate: 1800, rpm: 2.25, origin_dh: 60,
        origin_city: 'Nashville', origin_state: 'TN',
        dest_city:   'Charlotte', dest_state:   'NC',
        miles: 800, length_ft: 48, weight: 35000,
        equip: 'Van', mode: 'FTL', company: 'XPO Logistics',
        d2p: null, phone: null, email: null,
        loaded_rpm: 2.25, all_in_miles: 1050, all_in_rpm: 1.71,
        est_cost: 788, est_margin: 1012, negotiation_target: 1900,
        score: 62, rank: 3, reasons: ['Decent RPM'],
        skip: false, skip_reason: null, first_call_rank: null,
      },
      // --- THIN (low rate, short miles, cross-state deadhead eats margin) ---
      {
        pickup_date: new Date().toISOString().slice(0, 10),
        rate: 950, rpm: 1.90, origin_dh: 90,
        origin_city: 'Memphis',   origin_state: 'TN',
        dest_city:   'Little Rock', dest_state: 'AR',
        miles: 500, length_ft: 48, weight: 28000,
        equip: 'Van', mode: 'FTL', company: 'Total Quality Logistics',
        d2p: null, phone: null, email: null,
        loaded_rpm: 1.90, all_in_miles: 750, all_in_rpm: 1.27,
        est_cost: 563, est_margin: 387, negotiation_target: 1050,
        score: 34, rank: 4, reasons: ['Short run', 'Low RPM'],
        skip: false, skip_reason: null, first_call_rank: null,
      },
      // --- THIN (long deadhead case — cross-state 250mi DH, modest rate) ---
      {
        pickup_date: new Date().toISOString().slice(0, 10),
        rate: 1200, rpm: 2.00, origin_dh: 200,
        origin_city: 'Phoenix',   origin_state: 'AZ',
        dest_city:   'Las Vegas', dest_state:   'NV',
        miles: 600, length_ft: 53, weight: 40000,
        equip: 'Reefer', mode: 'FTL', company: 'Uber Freight',
        d2p: null, phone: null, email: null,
        loaded_rpm: 2.00, all_in_miles: 850, all_in_rpm: 1.41,
        est_cost: 638, est_margin: 562, negotiation_target: 1300,
        score: 28, rank: 5, reasons: ['Long DH', 'Backhaul lane'],
        skip: false, skip_reason: null, first_call_rank: null,
      },
      // --- REJECT (rate barely covers cost at any CPM) ---
      {
        pickup_date: new Date().toISOString().slice(0, 10),
        rate: 550, rpm: 1.38, origin_dh: 40,
        origin_city: 'St. Louis', origin_state: 'MO',
        dest_city:   'Kansas City', dest_state: 'MO',
        miles: 400, length_ft: 48, weight: 22000,
        equip: 'Van', mode: 'FTL', company: 'Mode Transport',
        d2p: null, phone: null, email: null,
        loaded_rpm: 1.38, all_in_miles: 475, all_in_rpm: 1.16,
        est_cost: 356, est_margin: 194, negotiation_target: 700,
        score: 10, rank: 6, reasons: ['Very low RPM', 'Short haul'],
        skip: false, skip_reason: null, first_call_rank: null,
      },
      // --- REJECT (cross-state DH kills a mediocre rate) ---
      {
        pickup_date: new Date().toISOString().slice(0, 10),
        rate: 700, rpm: 1.40, origin_dh: 250,
        origin_city: 'Denver',    origin_state: 'CO',
        dest_city:   'Salt Lake City', dest_state: 'UT',
        miles: 500, length_ft: 48, weight: 30000,
        equip: 'Flatbed', mode: 'FTL', company: 'Convoy',
        d2p: null, phone: null, email: null,
        loaded_rpm: 1.40, all_in_miles: 750, all_in_rpm: 0.93,
        est_cost: 563, est_margin: 137, negotiation_target: 900,
        score: 5, rank: 7, reasons: ['Dead freight lane', 'Extreme DH'],
        skip: false, skip_reason: null, first_call_rank: null,
      },
    ]

    const driverName = selectedDriver?.name ?? 'Sample Driver'

    setResult({
      loads:       samples,
      driver_name: driverName,
      raw_count:   samples.length,
    })
    setResultSource('sample')
    setResultTimestamp(new Date())
  }

  const handleParsePaste = () => {
    const loads = parsePastedLoads(pasteText)
    if (loads.length === 0) {
      // Count time-marker blocks for diagnostics
      const blockCount = pasteText.split(/\r?\n/).filter(l => /^\d+[mh]$/.test(l.trim().replace(/\p{Cf}/gu, ''))).length
      setParseStatus(
        blockCount > 0
          ? `Found ${blockCount} load blocks but could not extract locations. Check that city/state lines follow "City, ST" format.`
          : 'No load blocks found. Each load must start with a time-posted line (e.g. "5m" or "3h").'
      )
      return
    }
    const driverName = selectedDriver?.name ?? 'Pasted loads'
    setResult({ loads, driver_name: driverName, raw_count: loads.length })
    setResultSource('paste')
    setResultTimestamp(new Date())
    setShowPaste(false)
    setPasteText('')
    setParseStatus(null)
  }

  const handleAdd = (load: ScoredLoad) => {
    const params = new URLSearchParams()
    if (load.origin_city)    params.set('origin_city',    load.origin_city)
    if (load.origin_state)   params.set('origin_state',   load.origin_state)
    if (load.dest_city)      params.set('dest_city',      load.dest_city)
    if (load.dest_state)     params.set('dest_state',     load.dest_state)
    if (load.rate != null)   params.set('rate',           String(load.rate))
    if (load.miles != null)  params.set('miles',          String(load.miles))
    if (load.origin_dh != null) params.set('deadhead_miles', String(load.origin_dh))
    const [pickupDate, rawSecondDate] = _parseDateField(load.pickup_date)
    if (pickupDate)          params.set('pickup_date',    pickupDate)
    // DAT date ranges are board availability windows, not confirmed drop dates.
    // Do not prefill delivery_date. Preserve the raw window as a note instead.
    if (rawSecondDate && load.pickup_date?.includes('-')) {
      params.set('notes', `DAT board window: ${load.pickup_date}`)
    }
    if (load.equip)          params.set('trailer_type',   load.equip)
    if (load.company)        params.set('broker_name',    load.company)
    if (driverId)            params.set('driver_id',      String(driverId))
    // Prefer matched broker_id over broker_name lookup in Loads.tsx
    const matched = load.company
      ? brokers.find(b => b.name.toLowerCase() === load.company!.toLowerCase())
      : null
    if (matched)             params.set('broker_id',      String(matched.id))
    navigate(`/loads?new=1&${params.toString()}`)
  }

  const handleCreateBroker = (load: ScoredLoad) => {
    const params = new URLSearchParams()
    params.set('new', '1')
    if (load.company) params.set('name',  load.company)
    if (load.phone)   params.set('phone', load.phone)
    if (load.email)   params.set('email', load.email)
    navigate(`/brokers?${params.toString()}`)
  }

  // Inline rate editor: update a parsed load's rate and recompute RPM fields.
  // profitChecks memo reacts automatically because result changes.
  const handleRateEdit = (rank: number, rate: number) => {
    setResult(prev => {
      if (!prev) return prev
      const loads = prev.loads.map(l => {
        if (l.rank !== rank) return l
        const loadedRpm = l.miles != null && l.miles > 0 ? rate / l.miles : null
        const allInRpm  = l.all_in_miles != null && l.all_in_miles > 0 ? rate / l.all_in_miles : loadedRpm
        return { ...l, rate, loaded_rpm: loadedRpm, all_in_rpm: allInRpm }
      })
      // Re-rank first_call_rank by all-in RPM (uses parsed DH when available)
      const ranked = [...loads]
        .filter(l => !l.skip && (l.all_in_rpm ?? l.loaded_rpm) != null)
        .sort((a, b) => (b.all_in_rpm ?? b.loaded_rpm ?? 0) - (a.all_in_rpm ?? a.loaded_rpm ?? 0))
      ranked.slice(0, 3).forEach((l, i) => { l.first_call_rank = i + 1 })
      ranked.slice(3).forEach(l => { l.first_call_rank = null })
      return { ...prev, loads }
    })
  }

  const toggleBookmark = (load: ScoredLoad) => {
    setBookmarked(prev => {
      const next = new Set(prev)
      if (next.has(load.rank)) next.delete(load.rank)
      else next.add(load.rank)
      return next
    })
  }

  const copyBrowserCommand = () => {
    if (!selectedDriver) return
    const cmd =
      `Import loads from my ${selectedDriver.trailer_type ?? 'DAT/Truckstop'} tab for ${selectedDriver.name}` +
      (selectedDriver.min_rpm ? `, min $${selectedDriver.min_rpm.toFixed(2)}/mi` : '') +
      (effectiveDropCity
        ? `, currently dropping in ${effectiveDropCity}`
        : selectedDriver.home_base ? `, home base ${selectedDriver.home_base}` : '')
    navigator.clipboard.writeText(cmd).then(() => {
      setCmdCopied(true)
      setTimeout(() => setCmdCopied(false), 2000)
    }).catch(() => {})
  }

  const openDat = () => {
    window.api.shell.openExternal('https://one.dat.com/search-loads')
    // DAT uses localStorage state — URL params don't exist. Copy search context
    // to clipboard so the user can reference it when filling in the DAT form.
    // If a lane is selected, use its preset; otherwise fall back to driver context.
    let clipText: string
    if (selectedLane) {
      const equip = [selectedDriver?.trailer_type, selectedDriver?.trailer_length].filter(Boolean).join(' ')
      const parts: string[] = [
        `Origin: ${selectedLane.originLabel}`,
        `Dest: ${selectedLane.destLabel}`,
        ...(equip ? [`Equip: ${equip}`] : []),
        ...(selectedDriver?.min_rpm != null ? [`Min RPM: $${selectedDriver.min_rpm.toFixed(2)}/mi`] : []),
        `~Miles: ${selectedLane.estimatedMiles.toLocaleString()} mi`,
      ]
      clipText = parts.join(' | ')
    } else {
      const parts: string[] = []
      if (effectiveDropCity) parts.push(effectiveDropCity)
      if (selectedDriver?.trailer_type) parts.push(selectedDriver.trailer_type)
      if (selectedDriver?.trailer_length) parts.push(selectedDriver.trailer_length)
      if (selectedDriver?.min_rpm) parts.push(`Min $${selectedDriver.min_rpm.toFixed(2)}/mi`)
      clipText = parts.join(' | ')
    }
    if (clipText) {
      navigator.clipboard.writeText(clipText).then(() => {
        setDatCopied(true)
        setTimeout(() => setDatCopied(false), 3000)
      }).catch(() => {})
    }
  }

  const clearResults = () => {
    setResult(null)
    setError(null)
    setResultTimestamp(null)
    setBookmarked(new Set())
    setCompareDriverId(null)
    setResultSource(null)
    // Clear persisted session so it doesn't restore on next mount
    try { sessionStorage.removeItem(SESSION_KEY) } catch { /* silent */ }
  }

  const selectedDriver  = drivers.find(d => d.id === driverId)
  const brokerIntel     = buildBrokerIntel(brokers, allLoads)
  // Manual origin override — takes precedence over the auto-resolved dropCity.
  const effectiveDropCity      = dropCityOverride ?? dropCity
  const effectiveDropCityBasis = dropCityOverride ? 'estimated' : dropCityBasis

  // Compute per-load profitability using the driver's actual resolved location.
  // Uses dropCity (active-load dest → current_location → home_base) so the
  // deadhead estimate reflects where the driver will actually be on pickup day.
  const profitChecks = useMemo((): Map<number, ProfitCheck> => {
    if (!result || !selectedDriver) return new Map()
    const map = new Map<number, ProfitCheck>()
    for (const load of result.loads) {
      if (load.skip) continue
      map.set(load.rank, checkProfitability({
        driverLocation:      effectiveDropCity,
        locationBasis:       effectiveDropCityBasis,
        driverCpm:           cpm,           // resolved state: driver.cpm → min_rpm fallback → 0.75
        driverMinRpm:        selectedDriver.min_rpm,
        pickupCity:          load.origin_city,
        pickupState:         load.origin_state,
        loadedMiles:         load.miles,
        grossRate:           load.rate,
        parsedDeadheadMiles: load.origin_dh,
      }))
    }
    return map
  }, [result, selectedDriver, cpm, effectiveDropCity, effectiveDropCityBasis])

  const INCOMPLETE_CHECK: ProfitCheck = { incomplete: true, missingField: 'location' }

  const goodLoads = result?.loads.filter(l => !l.skip) ?? []

  const toggleHideBand = (band: ProfitBand) => {
    setHideBands(prev => {
      const next = new Set(prev)
      if (next.has(band)) next.delete(band); else next.add(band)
      return next
    })
  }

  // Filter by band, then sort. Loads with no check data are never hidden.
  const sortedGoodLoads = useMemo(() => {
    const base = hideBands.size === 0
      ? goodLoads
      : goodLoads.filter(l => {
          const c = profitChecks.get(l.rank)
          return !c || c.incomplete || !hideBands.has(c.band)
        })
    if (!profitSort || profitChecks.size === 0) return base
    return [...base].sort((a, b) => {
      const ca = profitChecks.get(a.rank)
      const cb = profitChecks.get(b.rank)
      if (!ca || ca.incomplete || !cb || cb.incomplete) return 0
      return profitSort === 'net'
        ? cb.estimatedNet - ca.estimatedNet
        : cb.effectiveRpm - ca.effectiveRpm
    })
  }, [goodLoads, hideBands, profitSort, profitChecks])

  const visibleLoads    = showAllLoads ? sortedGoodLoads : sortedGoodLoads.slice(0, 5)
  const firstCalls      = goodLoads
    .filter(l => l.first_call_rank != null)
    .sort((a, b) => (a.first_call_rank ?? 9) - (b.first_call_rank ?? 9))
  const rejectedLoads   = result?.loads.filter(l => l.skip) ?? []
  const bookmarkedLoads = result ? result.loads.filter(l => bookmarked.has(l.rank)) : []

  return (
    <div className='space-y-6'>

      {/* Header */}
      <div>
        <h1 className='text-xl font-semibold text-gray-100'>Find Loads</h1>
        <p className='text-sm text-gray-500 mt-0.5'>
          Import a load board export and get profit-first ranked results for any driver
        </p>
      </div>

      {/* Controls row */}
      <div className='flex items-center gap-4 flex-wrap'>

        {/* Driver selector */}
        <div className='flex items-center gap-3'>
          <span className='text-sm text-gray-400 shrink-0'>Driver:</span>
          <select
            value={driverId ?? ''}
            onChange={e => setDriverId(Number(e.target.value))}
            className='bg-surface-700 border border-surface-500 text-gray-100 text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-orange-500'
          >
            {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>

        {/* Current search origin — click to override */}
        {effectiveDropCity && !editingDropCity && (
          <div className='flex items-center gap-1.5 text-sm'>
            <MapPin size={12} className='text-orange-400 shrink-0' />
            <span className='text-gray-500 shrink-0'>Search DAT from:</span>
            <button
              onClick={() => { setDropCityInput(effectiveDropCity); setEditingDropCity(true) }}
              className='text-orange-300 font-medium hover:text-orange-200 hover:underline transition-colors'
              title='Click to override origin for DAT search'
            >
              {effectiveDropCity}
            </button>
            {dropCityOverride && (
              <button
                onClick={() => { setDropCityOverride(null); clearResults() }}
                className='text-2xs text-gray-600 hover:text-gray-400 transition-colors'
                title='Reset to driver-derived location'
              >
                reset
              </button>
            )}
          </div>
        )}
        {editingDropCity && (
          <div className='flex items-center gap-1.5'>
            <MapPin size={12} className='text-orange-400 shrink-0' />
            <input
              autoFocus
              value={dropCityInput}
              onChange={e => setDropCityInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  const v = dropCityInput.trim()
                  setDropCityOverride(v || null)
                  setEditingDropCity(false)
                  clearResults()
                }
                if (e.key === 'Escape') {
                  setEditingDropCity(false)
                }
              }}
              placeholder='City, ST'
              className='w-36 bg-surface-700 border border-orange-500/60 text-gray-100 text-sm rounded-lg px-2 py-1 focus:outline-none focus:border-orange-400 font-medium'
            />
            <button
              onClick={() => { setDropCityOverride(dropCityInput.trim() || null); setEditingDropCity(false); clearResults() }}
              className='text-2xs px-2 py-1 rounded bg-orange-600 hover:bg-orange-500 text-white transition-colors'
            >
              Set
            </button>
            <button
              onClick={() => setEditingDropCity(false)}
              className='text-2xs text-gray-600 hover:text-gray-400 transition-colors'
            >
              Cancel
            </button>
          </div>
        )}

        {/* CPM */}
        <div className='flex items-center gap-2'>
          <span className='text-sm text-gray-400 shrink-0'>CPM $</span>
          <input
            type='number'
            value={cpm}
            min={0.10}
            max={5.00}
            step={0.01}
            onChange={e => setCpm(parseFloat(e.target.value) || 0.75)}
            className='w-20 bg-surface-700 border border-surface-500 text-gray-100 text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-orange-500 font-mono'
          />
        </div>

        {/* Paste Loads — primary real-world import path */}
        <button
          onClick={() => { setShowPaste(p => !p); setParseStatus(null) }}
          disabled={loading || browserListening}
          className={[
            'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed',
            showPaste
              ? 'bg-orange-600 hover:bg-orange-500 text-white'
              : 'bg-orange-600 hover:bg-orange-500 text-white',
          ].join(' ')}
          title='Paste load results directly from DAT or Truckstop'
        >
          <Copy size={15} />
          Paste Loads
        </button>

        {/* Clear Data — only shown when results are loaded */}
        {result && resultSource !== 'browser' && (
          <button
            onClick={clearResults}
            className='text-xs text-gray-600 hover:text-red-400 border border-surface-500 hover:border-red-700/50 px-3 py-1.5 rounded-lg transition-colors'
            title='Remove current parsed result set'
          >
            Clear Data
          </button>
        )}

        {/* Driver summary */}
        {selectedDriver && (
          <span className='text-xs text-gray-500'>
            {[selectedDriver.trailer_type, selectedDriver.trailer_length].filter(Boolean).join(' · ')}
            {selectedDriver.min_rpm ? ` · Min $${selectedDriver.min_rpm.toFixed(2)}/mi` : ''}
            {selectedDriver.home_base ? ` · ${selectedDriver.home_base}` : ''}
          </span>
        )}
      </div>

      {/* Paste loads panel */}
      {showPaste && (
        <div className='rounded-xl border border-surface-400 bg-surface-700 p-4 space-y-3'>
          <div className='flex items-center justify-between'>
            <p className='text-sm font-medium text-gray-200'>Paste load results</p>
            <p className='text-2xs text-gray-600'>Select rows in DAT or Truckstop, copy, and paste below</p>
          </div>
          <textarea
            value={pasteText}
            onChange={e => { setPasteText(e.target.value); setParseStatus(null) }}
            placeholder={'Select rows in DAT, press Ctrl+C, then paste here.\n\nExpected format:\n2m\n$1,200\n$3.47*/mi\n270\nDallas, TX\n(22)\nHouston, TX\n(0)\n4/17\nV\n53 ft\n...'}
            rows={6}
            className='w-full bg-surface-800 border border-surface-500 text-gray-200 text-xs font-mono rounded-lg px-3 py-2 focus:outline-none focus:border-orange-500 resize-y placeholder:text-gray-700'
          />
          {parseStatus && (
            <p className='text-xs text-yellow-400 flex items-center gap-1.5'>
              <AlertCircle size={11} /> {parseStatus}
            </p>
          )}
          <div className='flex items-center gap-3'>
            <button
              onClick={handleParsePaste}
              disabled={!pasteText.trim()}
              className='flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors'
            >
              <Calculator size={14} />
              Parse Loads
            </button>
            <button
              onClick={() => { setShowPaste(false); setPasteText(''); setParseStatus(null) }}
              className='text-xs text-gray-600 hover:text-gray-400 transition-colors'
            >
              Cancel
            </button>
            <span className='text-2xs text-gray-700 ml-auto'>
  Select load rows in DAT, copy (Ctrl+C), paste here
            </span>
          </div>
        </div>
      )}

      {/* Active preset banner — shown when a lane is applied */}
      {selectedLane && (
        <div className='flex items-center gap-2 px-3 py-2 rounded-lg border border-orange-500/50 bg-orange-900/15 text-xs flex-wrap'>
          <span className='inline-block w-1.5 h-1.5 rounded-full bg-orange-400 shrink-0' />
          <span className='text-orange-300 font-semibold shrink-0'>Active Preset</span>
          <span className='text-gray-500 shrink-0'>—</span>
          <span className='text-gray-200 font-medium'>
            {selectedLane.originLabel.split(',')[0]}
          </span>
          <ArrowRight size={10} className='text-gray-500 shrink-0' />
          <span className='text-gray-200 font-medium'>{selectedLane.destLabel}</span>
          <span className='text-gray-500'>~{selectedLane.estimatedMiles.toLocaleString()} mi</span>
          <span className='text-gray-700 hidden sm:inline'>·</span>
          <span className='text-gray-600 text-2xs hidden sm:inline'>
            DAT button copies this preset · Open lane card to copy individual fields
          </span>
          <button
            onClick={() => setSelectedLane(null)}
            title='Clear active preset'
            className='ml-auto text-gray-500 hover:text-gray-300 transition-colors shrink-0 px-1'
          >
            ×
          </button>
        </div>
      )}

      {/* Rate Calculator — always visible, collapsed by default */}
      <RateCalculator />

      {/* Browser import listening state */}
      {browserListening && (
        result ? (
          <div className='flex items-center justify-between px-4 py-2 rounded-lg border border-blue-700/40 bg-blue-900/10'>
            <div className='flex items-center gap-2'>
              <Radio size={13} className='text-blue-400 animate-pulse shrink-0' />
              <span className='text-xs text-blue-300'>
                Listening for new import — results will update automatically
              </span>
            </div>
            <button
              onClick={startBrowserListen}
              className='text-xs text-gray-600 hover:text-gray-400 transition-colors'
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className='rounded-xl border border-blue-700/50 bg-blue-900/10 p-5 space-y-3'>
            <div className='flex items-center gap-2'>
              <Radio size={14} className='text-blue-400 animate-pulse shrink-0' />
              <p className='text-sm font-medium text-blue-300'>Waiting for Claude to send load data...</p>
            </div>
            <div className='space-y-1.5 text-sm text-gray-400'>
              <p>
                1. In DAT, set your search origin to{' '}
                <span className='text-orange-300 font-medium'>
                  {effectiveDropCity ?? "the driver's current city"}
                </span>
                {' '}and run your search.
              </p>
              <p>2. Tell Claude:</p>
              <div className='flex items-start gap-2'>
                <p className='flex-1 font-mono text-xs bg-surface-800 border border-surface-500 px-3 py-2 rounded-lg text-gray-200 leading-relaxed'>
                  Import loads from my {selectedDriver?.trailer_type ?? 'DAT/Truckstop'} tab for{' '}
                  {selectedDriver?.name ?? 'my driver'}
                  {selectedDriver?.min_rpm ? `, min $${selectedDriver.min_rpm.toFixed(2)}/mi` : ''}
                  {effectiveDropCity
                    ? `, currently dropping in ${effectiveDropCity}`
                    : selectedDriver?.home_base ? `, home base ${selectedDriver.home_base}` : ''
                  }
                </p>
                <button
                  onClick={copyBrowserCommand}
                  className='flex items-center gap-1 text-2xs px-2.5 py-1.5 rounded-lg bg-surface-600 hover:bg-surface-500 text-gray-300 border border-surface-400 transition-colors shrink-0 mt-0.5'
                  title='Copy command to clipboard'
                >
                  {cmdCopied ? <><Check size={10} /> Copied</> : <><Copy size={10} /> Copy</>}
                </button>
              </div>
              <p>
                3. Claude will read the tab, score the loads using deadhead from that city, and the
                results will appear here automatically.
              </p>
            </div>
            <button
              onClick={startBrowserListen}
              className='text-xs text-gray-600 hover:text-gray-400 transition-colors'
            >
              Cancel
            </button>
          </div>
        )
      )}

      {/* Suggested lanes panel — shown in empty state (always) and when toggled with results */}
      {!result && !error && !loading && !browserListening && selectedDriver && (
        <div className='space-y-4'>
          <SuggestedLanesPanel
            driver={selectedDriver}
            allLoads={allLoads}
            selectedLane={selectedLane}
            onSelectLane={setSelectedLane}
            locationOverride={dropCityOverride}
          />

          {/* Lane fit history (historical corridors from past loads) */}
          {driverId && (
            <LaneFitPanel driverId={driverId} driverName={selectedDriver.name} />
          )}

          {/* Import options — secondary, collapsible */}
          <ImportOptionsPanel />
        </div>
      )}

      {/* Suggested lanes strip when results are loaded and strategy panel is toggled */}
      {result && showStrategy && selectedDriver && (
        <SuggestedLanesPanel
          driver={selectedDriver}
          allLoads={allLoads}
          selectedLane={selectedLane}
          onSelectLane={setSelectedLane}
          locationOverride={dropCityOverride}
        />
      )}

      {/* Error */}
      {error && (
        <div className='flex items-start gap-3 p-4 rounded-xl bg-red-900/20 border border-red-700/40 text-red-400 text-sm'>
          <AlertCircle size={16} className='shrink-0 mt-0.5' />
          <span>{error}</span>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className='space-y-6'>

          {/* Summary bar */}
          <div className='flex items-center justify-between flex-wrap gap-2'>
            <div className='flex items-center gap-3'>
              <CheckCircle2 size={16} className='text-green-400' />
              <span className='text-sm text-gray-300'>
                <span className='font-semibold text-gray-100'>{goodLoads.length}</span>{' '}
                {resultSource === 'sample' ? 'ranked sample loads for' : resultSource === 'paste' ? 'pasted loads for' : 'ranked loads for'}{' '}
                <span className='text-orange-400'>{result.driver_name}</span>
                {rejectedLoads.length > 0 && (
                  <span className='text-gray-600'> · {rejectedLoads.length} rejected</span>
                )}
                {bookmarkedLoads.length > 0 && (
                  <span className='text-orange-500'> · {bookmarkedLoads.length} saved</span>
                )}
              </span>
            </div>
            <div className='flex items-center gap-3'>
              {/* Band filter toggles */}
              {(['reject', 'thin'] as ProfitBand[]).map(band => {
                const active = hideBands.has(band)
                return (
                  <button
                    key={band}
                    onClick={() => toggleHideBand(band)}
                    className={[
                      'text-2xs px-2 py-0.5 rounded border transition-colors',
                      active
                        ? band === 'reject'
                          ? 'bg-red-900/30 border-red-700/50 text-red-400'
                          : 'bg-yellow-900/30 border-yellow-700/50 text-yellow-500'
                        : 'bg-surface-700 border-surface-500 text-gray-500 hover:text-gray-300 hover:border-surface-400',
                    ].join(' ')}
                    title={active ? `Show ${band} loads` : `Hide ${band} loads`}
                  >
                    {active ? `Show ${band}` : `Hide ${band}`}
                  </button>
                )
              })}
              <span className='text-xs text-gray-600'>
                {resultSource === 'sample' ? 'sample data' : resultSource === 'paste' ? `${result.raw_count} pasted` : `${result.raw_count} loads in file`} · CPM ${cpm.toFixed(2)}
                {resultTimestamp && (
                  <span className='text-gray-700'> · {timeAgo(resultTimestamp)}</span>
                )}
              </span>
              <button
                onClick={clearResults}
                className='text-xs text-gray-600 hover:text-gray-400 transition-colors'
              >
                Clear
              </button>
            </div>
          </div>

          {/* Saved loads panel */}
          {bookmarkedLoads.length > 0 && (
            <div className='space-y-3'>
              <div className='flex items-center gap-2'>
                <BookmarkCheck size={14} className='text-orange-400' />
                <h2 className='text-sm font-semibold text-gray-200'>Saved Loads</h2>
                <span className='text-xs text-gray-600'>Loads pinned for follow-up</span>
              </div>
              <div className='rounded-xl border border-orange-700/30 bg-surface-800 overflow-x-auto'>
                <table className='w-full text-sm border-collapse'>
                  <thead>
                    <tr className='border-b border-surface-600'>
                      {['#', 'Route', 'Rate', 'All-in RPM', 'Est. Margin', 'Broker', ''].map((h, i) => (
                        <th key={i} className='text-left text-2xs font-medium text-gray-400 uppercase tracking-wider pb-2 pr-3 pl-4 pt-2 whitespace-nowrap select-none'>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {bookmarkedLoads.map((load, i) => {
                      const { o, d } = route(load)
                      return (
                        <tr key={i} className='border-b border-surface-600 last:border-0 hover:bg-surface-700 transition-colors'>
                          <td className='pl-4 pr-2 py-2.5 text-xs font-bold text-gray-400'>{load.rank}</td>
                          <td className='pr-3 py-2.5'>
                            <span className='flex items-center gap-1 text-xs'>
                              <span className='text-gray-300'>{o}</span>
                              <ArrowRight size={9} className='text-gray-600' />
                              <span className='text-gray-400'>{d}</span>
                            </span>
                          </td>
                          <td className='pr-3 py-2.5 text-xs font-semibold text-gray-200'>{fmt$(load.rate)}</td>
                          <td className={`pr-3 py-2.5 text-xs font-mono font-semibold ${rpmColor(load.all_in_rpm)}`}>
                            {fmtRpm(load.all_in_rpm)}
                          </td>
                          <td className={`pr-3 py-2.5 text-xs font-semibold ${marginColor(load.est_margin)}`}>
                            {fmt$(load.est_margin)}
                          </td>
                          <td className='pr-3 py-2.5 text-xs text-gray-400 truncate max-w-[140px]'>
                            {load.company ?? '—'}
                          </td>
                          <td className='pr-3 py-2.5'>
                            <div className='flex items-center gap-1'>
                              <button
                                onClick={() => toggleBookmark(load)}
                                className='p-1 rounded text-orange-400 hover:text-orange-300 transition-colors'
                                title='Remove bookmark'
                              >
                                <BookmarkCheck size={12} />
                              </button>
                              <button
                                onClick={() => handleAdd(load)}
                                className='flex items-center gap-1 text-2xs px-2 py-0.5 rounded-full bg-orange-600 hover:bg-orange-500 text-white border border-orange-500 font-medium transition-colors'
                              >
                                <Plus size={9} /> Add
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Compare driver */}
          <div className='space-y-3'>
            <div className='flex items-center gap-3 flex-wrap'>
              <Users size={13} className='text-gray-600' />
              <span className='text-xs text-gray-600'>Compare margins for a second driver:</span>
              <select
                value={compareDriverId ?? ''}
                onChange={e => setCompareDriverId(e.target.value ? Number(e.target.value) : null)}
                className='bg-surface-700 border border-surface-500 text-gray-300 text-xs rounded-lg px-2 py-1 focus:outline-none focus:border-orange-500'
              >
                <option value=''>— select driver —</option>
                {drivers.filter(d => d.id !== driverId).map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>

            {compareDriverId && (() => {
              const d2 = drivers.find(d => d.id === compareDriverId)
              if (!d2 || !visibleLoads.length) return null
              const cpm2 = d2.cpm ?? d2.min_rpm ?? 0.75
              return (
                <div className='rounded-xl border border-surface-400 bg-surface-800 overflow-x-auto'>
                  <div className='px-4 py-2 border-b border-surface-600 flex items-center gap-2 text-xs text-gray-400'>
                    <Users size={12} />
                    <span>Margin comparison: {result.driver_name} vs {d2.name}</span>
                    <span className='text-gray-600 ml-auto'>
                      CPM ${cpm.toFixed(2)} vs ${cpm2.toFixed(2)}
                    </span>
                  </div>
                  <table className='w-full text-xs border-collapse'>
                    <thead>
                      <tr className='border-b border-surface-600'>
                        {['Route', 'Rate', result.driver_name, d2.name, 'Better for'].map((h, i) => (
                          <th key={i} className={[
                            'text-left text-2xs font-medium uppercase tracking-wide px-4 py-2',
                            i === 2 ? 'text-orange-500' : i === 3 ? 'text-blue-400' : 'text-gray-500',
                          ].join(' ')}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {visibleLoads.map((load, i) => {
                        const aim     = load.all_in_miles ?? ((load.miles ?? 0) + (load.origin_dh ?? 0))
                        const margin2 = load.rate != null && aim > 0 ? load.rate - aim * cpm2 : null
                        const m1      = load.est_margin
                        const winner  = m1 != null && margin2 != null
                          ? (m1 >= margin2 ? 'driver1' : 'driver2') : null
                        const { o, d } = route(load)
                        return (
                          <tr key={i} className='border-b border-surface-600 last:border-0 hover:bg-surface-700'>
                            <td className='px-4 py-2.5'>
                              <span className='flex items-center gap-1 text-xs'>
                                <span className='text-gray-300'>{o}</span>
                                <ArrowRight size={8} className='text-gray-600' />
                                <span className='text-gray-400'>{d}</span>
                              </span>
                            </td>
                            <td className='px-4 py-2.5 text-xs font-semibold text-gray-200'>{fmt$(load.rate)}</td>
                            <td className={`px-4 py-2.5 text-xs font-semibold ${winner === 'driver1' ? 'text-green-400' : marginColor(m1)}`}>
                              {fmt$(m1)}
                            </td>
                            <td className={`px-4 py-2.5 text-xs font-semibold ${winner === 'driver2' ? 'text-green-400' : marginColor(margin2)}`}>
                              {fmt$(margin2)}
                            </td>
                            <td className='px-4 py-2.5 text-xs'>
                              {winner === 'driver1' && (
                                <span className='text-orange-400 font-medium'>{result.driver_name}</span>
                              )}
                              {winner === 'driver2' && (
                                <span className='text-blue-400 font-medium'>{d2.name}</span>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )
            })()}
          </div>

          {/* Best First Calls */}
          {firstCalls.length > 0 && (
            <div className='space-y-3'>
              <div className='flex items-center gap-2'>
                <Phone size={14} className='text-orange-400' />
                <h2 className='text-sm font-semibold text-gray-200'>Best First Calls</h2>
                <span className='text-xs text-gray-600'>Call these brokers first — highest profit potential</span>
              </div>
              <div className='flex gap-3 flex-wrap'>
                {firstCalls.map((load, i) => (
                  <FirstCallCard
                    key={i}
                    load={load}
                    onAdd={handleAdd}
                    brokerIntel={brokerIntel}
                    bookmarked={bookmarked.has(load.rank)}
                    onBookmark={toggleBookmark}
                    profitCheck={profitChecks.get(load.rank) ?? INCOMPLETE_CHECK}
                    brokers={brokers}
                    onCreateBroker={handleCreateBroker}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Ranked Loads */}
          {visibleLoads.length > 0 && (
            <div className='space-y-3'>
              <div className='flex items-center gap-2 flex-wrap'>
                <TrendingUp size={14} className='text-green-400' />
                <h2 className='text-sm font-semibold text-gray-200'>
                  {showAllLoads ? `All ${sortedGoodLoads.length}` : `Top ${visibleLoads.length}`} Ranked Loads
                </h2>
                <span className='text-xs text-gray-600'>
                  {profitSort ? `Sorted by driver ${profitSort === 'net' ? 'net' : 'eff. RPM'}` : 'Sorted by estimated margin and all-in RPM'}
                </span>
                {/* Show count / toggle */}
                {sortedGoodLoads.length > 5 && (
                  <div className='flex items-center gap-1'>
                    {(['top5', 'all'] as const).map(v => (
                      <button
                        key={v}
                        onClick={() => setShowAllLoads(v === 'all')}
                        className={[
                          'text-2xs px-2 py-0.5 rounded border transition-colors',
                          (v === 'all') === showAllLoads
                            ? 'bg-orange-600/20 border-orange-500/60 text-orange-300'
                            : 'bg-surface-700 border-surface-500 text-gray-500 hover:text-gray-200 hover:border-surface-400',
                        ].join(' ')}
                      >
                        {v === 'top5' ? 'Top 5' : `All ${sortedGoodLoads.length}`}
                      </button>
                    ))}
                  </div>
                )}
                <span className='text-2xs text-gray-700'>
                  {showAllLoads
                    ? `Showing all ${sortedGoodLoads.length}`
                    : `Showing ${visibleLoads.length} of ${sortedGoodLoads.length}`}
                </span>
                {/* Profit-based sort controls */}
                <div className='flex items-center gap-1 ml-auto'>
                  <span className='text-2xs text-gray-600'>Sort:</span>
                  {(['net', 'rpm'] as const).map(s => (
                    <button
                      key={s}
                      onClick={() => setProfitSort(prev => prev === s ? null : s)}
                      className={[
                        'text-2xs px-2 py-0.5 rounded border transition-colors',
                        profitSort === s
                          ? 'bg-orange-600/20 border-orange-500/60 text-orange-300'
                          : 'bg-surface-700 border-surface-500 text-gray-500 hover:text-gray-200 hover:border-surface-400',
                      ].join(' ')}
                      title={s === 'net' ? 'Sort by driver estimated net' : 'Sort by effective RPM (driver-specific)'}
                    >
                      {s === 'net' ? 'Net' : 'Eff. RPM'}
                      {profitSort === s && ' \u2193'}
                    </button>
                  ))}
                </div>
              </div>
              <div className='rounded-xl border border-surface-400 bg-surface-800 overflow-x-auto'>
                <table className='w-full text-sm border-collapse'>
                  <thead>
                    <tr className='border-b border-surface-500'>
                      {[
                        '#', 'Route', 'Rate', 'Ld RPM', 'All-in RPM',
                        'Est. Margin', 'Nego Target', 'DH', 'Miles', 'Broker', 'Pickup', '',
                      ].map((h, i) => (
                        <th key={i} className='text-left text-2xs font-medium text-gray-400 uppercase tracking-wider pb-2 pr-3 pl-4 pt-2 whitespace-nowrap select-none'>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {visibleLoads.map((load, i) => (
                      <LoadRow
                        key={i}
                        load={load}
                        onAdd={handleAdd}
                        brokerIntel={brokerIntel}
                        bookmarked={bookmarked.has(load.rank)}
                        onBookmark={toggleBookmark}
                        profitCheck={profitChecks.get(load.rank) ?? INCOMPLETE_CHECK}
                        onRateEdit={rate => handleRateEdit(load.rank, rate)}
                        brokers={brokers}
                        onCreateBroker={handleCreateBroker}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Rejected loads */}
          {rejectedLoads.length > 0 && (
            <div className='space-y-2'>
              <button
                onClick={() => setShowRejected(s => !s)}
                className='flex items-center gap-2 text-xs text-gray-600 hover:text-gray-400 transition-colors'
              >
                {showRejected ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                <XCircle size={12} className='text-red-600' />
                {showRejected ? 'Hide' : 'Show'} {rejectedLoads.length} rejected load{rejectedLoads.length !== 1 ? 's' : ''}
              </button>

              {showRejected && (
                <div className='rounded-xl border border-surface-500 bg-surface-800 overflow-hidden'>
                  {rejectedLoads.map((load, i) => {
                    const { o, d } = route(load)
                    return (
                      <div key={i} className='flex items-center gap-4 px-4 py-2.5 border-b border-surface-600 last:border-0 opacity-60'>
                        <span className='text-xs text-gray-500 w-4 shrink-0'>{load.rank}</span>
                        <span className='flex items-center gap-1 text-xs shrink-0'>
                          <span className='text-gray-400'>{o}</span>
                          <ArrowRight size={9} className='text-gray-600' />
                          <span className='text-gray-500'>{d}</span>
                        </span>
                        <span className='text-xs text-gray-500'>{fmt$(load.rate)}</span>
                        <span className='flex items-center gap-1 text-2xs px-2 py-0.5 rounded-full bg-red-900/30 text-red-500 border border-red-900/50'>
                          <XCircle size={9} />
                          {load.skip_reason ?? 'Skipped'}
                        </span>
                        <span className='text-2xs text-gray-600 truncate'>{load.company ?? ''}</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

        </div>
      )}

    </div>
  )
}
