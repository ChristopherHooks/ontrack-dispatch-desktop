import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { parseDriverIdParam } from '../lib/routeIntents'
import {
  FileSpreadsheet, Loader2, AlertCircle, ArrowRight,
  CheckCircle2, XCircle, ChevronDown, ChevronUp, Plus,
  Phone, TrendingUp, Globe, Radio, MapPin,
  Copy, Check, Calculator, ExternalLink,
  Bookmark, BookmarkCheck, Users, Navigation, Home,
  Compass,
} from 'lucide-react'
import type { Driver, Load, Broker } from '../types/models'
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
  load, onAdd, brokerIntel, bookmarked, onBookmark,
}: {
  load: ScoredLoad
  onAdd: (l: ScoredLoad) => void
  brokerIntel: BrokerIntelMap
  bookmarked: boolean
  onBookmark: (l: ScoredLoad) => void
}) {
  const { o, d } = route(load)
  const badge = CALL_BADGE[load.first_call_rank ?? 0] ?? 'bg-gray-600'
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

      <div className='space-y-0.5'>
        <div className='flex items-center justify-between text-2xs text-gray-600'>
          <span className='truncate max-w-[120px]'>{load.company ?? '—'}</span>
          <span>{load.pickup_date ?? '—'}</span>
        </div>
        <BrokerIntelBadge company={load.company} intel={brokerIntel} />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Full ranked load row (Top 5 table)
// ---------------------------------------------------------------------------

function LoadRow({
  load, onAdd, brokerIntel, bookmarked, onBookmark,
}: {
  load: ScoredLoad
  onAdd: (l: ScoredLoad) => void
  brokerIntel: BrokerIntelMap
  bookmarked: boolean
  onBookmark: (l: ScoredLoad) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const { o, d } = route(load)

  return (
    <>
      <tr className='border-b border-surface-600 last:border-0 hover:bg-surface-700 transition-colors'>
        <td className='pl-4 pr-2 py-2.5 text-xs font-bold text-gray-400'>{load.rank}</td>
        <td className='pr-3 py-2.5'>
          <span className='flex items-center gap-1 text-xs'>
            <span className='text-gray-300'>{o}</span>
            <ArrowRight size={9} className='text-gray-600 shrink-0' />
            <span className='text-gray-400'>{d}</span>
          </span>
        </td>
        <td className='pr-3 py-2.5 text-xs font-semibold text-gray-200'>{fmt$(load.rate)}</td>
        <td className='pr-3 py-2.5 text-xs font-mono text-gray-500'>{fmtRpm(load.loaded_rpm)}</td>
        <td className={`pr-3 py-2.5 text-xs font-mono font-semibold ${rpmColor(load.all_in_rpm)}`}>
          {fmtRpm(load.all_in_rpm)}
        </td>
        <td className={`pr-3 py-2.5 text-xs font-semibold ${marginColor(load.est_margin)}`}>
          {fmt$(load.est_margin)}
        </td>
        <td className='pr-3 py-2.5 text-xs text-orange-400'>
          {load.negotiation_target != null ? fmt$(load.negotiation_target) : ''}
        </td>
        <td className='pr-3 py-2.5 text-xs text-gray-500'>
          {load.origin_dh != null ? `${load.origin_dh}mi` : '—'}
        </td>
        <td className='pr-3 py-2.5 text-xs text-gray-500'>{fmtN(load.miles)}mi</td>
        <td className='pr-3 py-2.5 text-xs text-gray-400 max-w-[150px]'>
          <span className='truncate block'>{load.company ?? '—'}</span>
          <BrokerIntelBadge company={load.company} intel={brokerIntel} />
        </td>
        <td className='pr-3 py-2.5 text-xs text-gray-600'>{load.pickup_date ?? '—'}</td>
        <td className='pr-3 py-2.5'>
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

      {expanded && (
        <tr>
          <td colSpan={12} className='pl-8 pr-4 pb-3 pt-0'>
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

      {/* Tags + miles */}
      <div className='flex items-center gap-1 flex-wrap'>
        {visibleTags.map(tag => (
          <span key={tag} className={`text-2xs px-1.5 py-0 rounded border ${tagStyle(tag)}`}>
            {tagLabel(tag)}
          </span>
        ))}
        <span className='text-2xs text-gray-600 ml-auto shrink-0'>
          ~{lane.estimatedMiles.toLocaleString()} mi
        </span>
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
  driver, allLoads, selectedLane, onSelectLane,
}: {
  driver:        Driver
  allLoads:      Load[]
  selectedLane:  LaneSuggestion | null
  onSelectLane:  (lane: LaneSuggestion | null) => void
}) {
  const [strategy, setStrategy] = useState<SearchStrategy>('all')

  const originKey    = resolveMarket(driver.current_location)
  const originMarket = originKey ? getMarket(originKey) : null

  const suggestions: LaneSuggestion[] = useMemo(() => getSuggestedLanes({
    currentLocation: driver.current_location,
    homeBase:        driver.home_base,
    trailerType:     driver.trailer_type,
    driverId:        driver.id,
    historicalLoads: allLoads,
    strategy,
    limit: 8,
  }), [driver, allLoads, strategy])

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
  // New state
  const [resultTimestamp,  setResultTimestamp ] = useState<Date | null>(null)
  const [compareDriverId,  setCompareDriverId ] = useState<number | null>(null)
  const [bookmarked,       setBookmarked      ] = useState<Set<number>>(new Set())
  const [showStrategy,     setShowStrategy    ] = useState(false)
  const [selectedLane,     setSelectedLane    ] = useState<LaneSuggestion | null>(null)
  const [cmdCopied,        setCmdCopied       ] = useState(false)
  const [datCopied,        setDatCopied       ] = useState(false)

  const lastSeqRef = useRef(0)

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

  // Resolve driver's current position
  useEffect(() => {
    if (!driverId) { setDropCity(null); return }
    const driver = drivers.find(d => d.id === driverId)
    Promise.all([
      window.api.loads.list('In Transit'),
      window.api.loads.list('Picked Up'),
      window.api.loads.list('Booked'),
    ]).then(([inTransit, pickedUp, booked]: [Load[], Load[], Load[]]) => {
      const active = [...inTransit, ...pickedUp, ...booked].find(l => l.driver_id === driverId)
      if (active?.dest_city) {
        setDropCity([active.dest_city, active.dest_state].filter(Boolean).join(', '))
      } else if (driver?.current_location) {
        setDropCity(driver.current_location)
      } else {
        setDropCity(driver?.home_base ?? null)
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
      setResultTimestamp(new Date())
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = (load: ScoredLoad) => {
    const params = new URLSearchParams()
    if (load.origin_city)   params.set('origin_city',  load.origin_city)
    if (load.origin_state)  params.set('origin_state', load.origin_state)
    if (load.dest_city)     params.set('dest_city',    load.dest_city)
    if (load.dest_state)    params.set('dest_state',   load.dest_state)
    if (load.rate != null)  params.set('rate',         String(load.rate))
    if (load.miles != null) params.set('miles',        String(load.miles))
    if (load.company)       params.set('broker_name',  load.company)
    if (driverId)           params.set('driver_id',    String(driverId))
    navigate(`/loads?new=1&${params.toString()}`)
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
      (dropCity
        ? `, currently dropping in ${dropCity}`
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
      if (dropCity) parts.push(dropCity)
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
  }

  const selectedDriver  = drivers.find(d => d.id === driverId)
  const brokerIntel     = buildBrokerIntel(brokers, allLoads)
  const goodLoads       = result?.loads.filter(l => !l.skip) ?? []
  const top5            = goodLoads.slice(0, 5)
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

        {/* Current search origin hint */}
        {dropCity && (
          <div className='flex items-center gap-1.5 text-sm'>
            <MapPin size={12} className='text-orange-400 shrink-0' />
            <span className='text-gray-500'>Search DAT from: </span>
            <span className='text-orange-300 font-medium'>{dropCity}</span>
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

        {/* Import XLSX */}
        <button
          onClick={handleImport}
          disabled={!driverId || loading || browserListening}
          className='flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors'
        >
          {loading ? <Loader2 size={15} className='animate-spin' /> : <FileSpreadsheet size={15} />}
          {loading ? 'Analyzing...' : 'Import XLSX'}
        </button>

        {/* Import from Browser */}
        <button
          onClick={startBrowserListen}
          disabled={!driverId || loading}
          className={[
            'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
            browserListening
              ? 'bg-blue-700 hover:bg-blue-600 text-white'
              : 'bg-surface-600 hover:bg-surface-500 text-gray-300 border border-surface-400',
            (!driverId || loading) ? 'opacity-40 cursor-not-allowed' : '',
          ].join(' ')}
          title='Have Claude read your DAT or Truckstop tab and import the results'
        >
          {browserListening
            ? <><Radio size={15} className='animate-pulse' /> Listening...</>
            : <><Globe size={15} /> Import from Browser</>
          }
        </button>

        {/* Open DAT */}
        <button
          onClick={openDat}
          className={[
            'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm border transition-colors',
            datCopied
              ? 'bg-green-800/40 border-green-700/50 text-green-300'
              : 'bg-surface-600 hover:bg-surface-500 text-gray-400 hover:text-gray-200 border-surface-400',
          ].join(' ')}
          title={
            datCopied
              ? 'Search details copied to clipboard'
              : dropCity
                ? `Open DAT — search from ${dropCity}`
                : 'Open DAT load board'
          }
        >
          {datCopied ? <Check size={13} /> : <ExternalLink size={13} />}
          <span>{datCopied ? 'Copied' : 'DAT'}</span>
        </button>

        {/* Plan the Week — opens Suggested Lanes / search strategy panel */}
        <button
          onClick={() => setShowStrategy(s => !s)}
          className={[
            'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm border transition-colors',
            showStrategy
              ? 'bg-orange-700/30 border-orange-600/50 text-orange-300'
              : 'bg-surface-600 hover:bg-surface-500 text-gray-400 hover:text-gray-200 border-surface-400',
          ].join(' ')}
          title='Open lane planning — see suggested search corridors for this driver'
        >
          <Compass size={13} />
          <span>Plan the Week</span>
        </button>

        {/* Driver summary */}
        {selectedDriver && (
          <span className='text-xs text-gray-500'>
            {[selectedDriver.trailer_type, selectedDriver.trailer_length].filter(Boolean).join(' · ')}
            {selectedDriver.min_rpm ? ` · Min $${selectedDriver.min_rpm.toFixed(2)}/mi` : ''}
            {selectedDriver.home_base ? ` · ${selectedDriver.home_base}` : ''}
          </span>
        )}
      </div>

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
                  {dropCity ?? "the driver's current city"}
                </span>
                {' '}and run your search.
              </p>
              <p>2. Tell Claude:</p>
              <div className='flex items-start gap-2'>
                <p className='flex-1 font-mono text-xs bg-surface-800 border border-surface-500 px-3 py-2 rounded-lg text-gray-200 leading-relaxed'>
                  Import loads from my {selectedDriver?.trailer_type ?? 'DAT/Truckstop'} tab for{' '}
                  {selectedDriver?.name ?? 'my driver'}
                  {selectedDriver?.min_rpm ? `, min $${selectedDriver.min_rpm.toFixed(2)}/mi` : ''}
                  {dropCity
                    ? `, currently dropping in ${dropCity}`
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
                <span className='font-semibold text-gray-100'>{goodLoads.length}</span> ranked loads for{' '}
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
              <span className='text-xs text-gray-600'>
                {result.raw_count} loads in file · CPM ${cpm.toFixed(2)}
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
              if (!d2 || !top5.length) return null
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
                      {top5.map((load, i) => {
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
                  />
                ))}
              </div>
            </div>
          )}

          {/* Top 5 Ranked Loads */}
          {top5.length > 0 && (
            <div className='space-y-3'>
              <div className='flex items-center gap-2'>
                <TrendingUp size={14} className='text-green-400' />
                <h2 className='text-sm font-semibold text-gray-200'>Top {top5.length} Ranked Loads</h2>
                <span className='text-xs text-gray-600'>Sorted by estimated margin and all-in RPM</span>
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
                    {top5.map((load, i) => (
                      <LoadRow
                        key={i}
                        load={load}
                        onAdd={handleAdd}
                        brokerIntel={brokerIntel}
                        bookmarked={bookmarked.has(load.rank)}
                        onBookmark={toggleBookmark}
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
