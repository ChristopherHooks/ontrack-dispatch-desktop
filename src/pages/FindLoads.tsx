import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FileSpreadsheet, Loader2, AlertCircle, ArrowRight,
  CheckCircle2, XCircle, ChevronDown, ChevronUp, Plus,
  Phone, TrendingUp, Globe, Radio, MapPin,
  Copy, Check, Calculator, ExternalLink,
  Bookmark, BookmarkCheck, Calendar, Users, Navigation,
} from 'lucide-react'
import type { Driver, Load, Broker } from '../types/models'
import type { ScoredLoad, ParseScreenshotResult } from '../types/global'
import type { DriverLaneFitRow } from '../types/models'

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
// Plan the Week modal
// ---------------------------------------------------------------------------

function PlanningModal({
  drivers, allLoads, onClose,
}: {
  drivers: Driver[]
  allLoads: Load[]
  onClose: () => void
}) {
  const [copied, setCopied] = useState<number | null>(null)

  function dropCityForDriver(driver: Driver): string {
    const active = allLoads.find(l =>
      l.driver_id === driver.id &&
      ['In Transit', 'Picked Up', 'Booked'].includes(l.status)
    )
    if (active?.dest_city) return [active.dest_city, active.dest_state].filter(Boolean).join(', ')
    if (driver.current_location) return driver.current_location
    return driver.home_base ?? 'Unknown'
  }

  function makeCommand(driver: Driver): string {
    const city = dropCityForDriver(driver)
    return (
      `Import loads from my ${driver.trailer_type ?? 'DAT/Truckstop'} tab for ${driver.name}` +
      (driver.min_rpm ? `, min $${driver.min_rpm.toFixed(2)}/mi` : '') +
      `, currently dropping in ${city}`
    )
  }

  function copyCmd(idx: number, cmd: string) {
    navigator.clipboard.writeText(cmd).then(() => {
      setCopied(idx)
      setTimeout(() => setCopied(null), 2000)
    }).catch(() => {})
  }

  const activeDrivers = drivers.filter(d => d.status !== 'Inactive')

  return (
    <div
      className='fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-6'
      onClick={onClose}
    >
      <div
        className='bg-surface-800 border border-surface-400 rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col'
        onClick={e => e.stopPropagation()}
      >
        <div className='flex items-center justify-between px-6 py-4 border-b border-surface-600 shrink-0'>
          <div>
            <h2 className='text-base font-semibold text-gray-100'>Weekly Load Planning</h2>
            <p className='text-xs text-gray-500 mt-0.5'>
              Copy each command into Claude in Chrome to score loads for every driver at once
            </p>
          </div>
          <button
            onClick={onClose}
            className='text-xs text-gray-500 hover:text-gray-300 transition-colors px-2 py-1'
          >
            Close
          </button>
        </div>

        <div className='overflow-y-auto p-6 space-y-3'>
          {activeDrivers.length === 0 && (
            <p className='text-sm text-gray-500 text-center py-8'>No active drivers found.</p>
          )}

          {activeDrivers.map((driver, i) => {
            const city = dropCityForDriver(driver)
            const cmd  = makeCommand(driver)
            const activeLoad = allLoads.find(l =>
              l.driver_id === driver.id &&
              ['In Transit', 'Picked Up', 'Booked'].includes(l.status)
            )

            return (
              <div key={driver.id} className='rounded-xl border border-surface-500 bg-surface-700 p-4 space-y-2.5'>
                <div className='flex items-start justify-between gap-3'>
                  <div className='space-y-0.5'>
                    <div className='flex items-center gap-2 flex-wrap'>
                      <span className='text-sm font-medium text-gray-100'>{driver.name}</span>
                      <span className={`text-2xs px-2 py-0.5 rounded-full ${
                        driver.status === 'On Load'
                          ? 'bg-blue-900/30 text-blue-400'
                          : 'bg-green-900/30 text-green-400'
                      }`}>{driver.status}</span>
                    </div>
                    <p className='text-xs text-gray-500'>
                      {[driver.trailer_type, driver.trailer_length].filter(Boolean).join(' · ')}
                      {driver.min_rpm ? ` · Min $${driver.min_rpm.toFixed(2)}/mi` : ''}
                    </p>
                    {activeLoad && (
                      <p className='text-2xs text-blue-400'>
                        On load — drops{' '}
                        {[activeLoad.dest_city, activeLoad.dest_state].filter(Boolean).join(', ')}
                        {activeLoad.delivery_date ? ` by ${activeLoad.delivery_date}` : ''}
                      </p>
                    )}
                  </div>
                  <div className='flex items-center gap-1.5 text-xs shrink-0'>
                    <MapPin size={11} className='text-orange-400' />
                    <span className='text-orange-300 font-medium'>{city}</span>
                  </div>
                </div>

                <div className='flex items-center gap-2'>
                  <code className='flex-1 min-w-0 text-2xs bg-surface-800 border border-surface-600 rounded-lg px-3 py-1.5 text-gray-300 font-mono truncate block'>
                    {cmd}
                  </code>
                  <button
                    onClick={() => copyCmd(i, cmd)}
                    className='flex items-center gap-1 text-2xs px-2.5 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-white font-medium transition-colors shrink-0'
                  >
                    {copied === i
                      ? <><Check size={10} /> Copied</>
                      : <><Copy size={10} /> Copy</>
                    }
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
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
  const [showPlanning,     setShowPlanning    ] = useState(false)
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
    if (drivers.length && !driverId) setDriverId(drivers[0].id)
  }, [drivers, driverId])

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
    const parts: string[] = []
    if (dropCity) parts.push(dropCity)
    if (selectedDriver?.trailer_type) parts.push(selectedDriver.trailer_type)
    if (selectedDriver?.trailer_length) parts.push(selectedDriver.trailer_length)
    if (selectedDriver?.min_rpm) parts.push(`Min $${selectedDriver.min_rpm.toFixed(2)}/mi`)
    if (parts.length) {
      navigator.clipboard.writeText(parts.join(' | ')).then(() => {
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

        {/* Plan the Week */}
        <button
          onClick={() => setShowPlanning(true)}
          className='flex items-center gap-1.5 px-3 py-2 rounded-lg bg-surface-600 hover:bg-surface-500 text-gray-400 hover:text-gray-200 text-sm border border-surface-400 transition-colors'
          title='Generate search commands for all active drivers'
        >
          <Calendar size={13} />
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

      {/* Empty state — workflow hint + lane history */}
      {!result && !error && !loading && !browserListening && (
        <div className='space-y-4'>
          <div className='rounded-xl border border-surface-500 bg-surface-700 p-5 space-y-3'>
            <p className='text-sm font-medium text-gray-300'>Two ways to import loads</p>
            <div className='space-y-3 text-sm text-gray-500'>
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
                  "Import XLSX" to select the file.
                </p>
              </div>
            </div>
          </div>

          {driverId && selectedDriver && (
            <LaneFitPanel driverId={driverId} driverName={selectedDriver.name} />
          )}
        </div>
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

      {/* Plan the Week modal */}
      {showPlanning && (
        <PlanningModal
          drivers={drivers}
          allLoads={allLoads}
          onClose={() => setShowPlanning(false)}
        />
      )}

    </div>
  )
}
