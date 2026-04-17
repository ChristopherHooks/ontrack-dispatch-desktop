import { useState, useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { parseStaleParam, parseLoadStatusParam } from '../lib/routeIntents'
import { ChevronLeft, ChevronRight, Bell, Search, Check, XCircle, Clock } from 'lucide-react'
import type { Load, LoadStatus, Driver, Broker, CreateLoadDto, AvailableLoad } from '../types/models'
import { LOAD_OFFER_DECLINE_REASONS } from '../types/models'
import { LoadsToolbar, type LoadFilters, type LoadView } from '../components/loads/LoadsToolbar'
import { LoadsTable }  from '../components/loads/LoadsTable'
import { LoadModal }   from '../components/loads/LoadModal'
import { LoadDrawer }  from '../components/loads/LoadDrawer'
import { RateHistoryModal } from '../components/loads/RateHistoryModal'
import { DRIVER_STATUS_STYLES } from '../components/drivers/constants'
import { LOAD_STATUS_STYLES } from '../components/loads/constants'

export function Loads() {
  const [searchParams]             = useSearchParams()
  const [loads,    setLoads]    = useState<Load[]>([])
  const [drivers,  setDrivers]  = useState<Driver[]>([])
  const [brokers,  setBrokers]  = useState<Broker[]>([])
  const [loading,  setLoading]  = useState(true)
  const [view,     setView]     = useState<LoadView>('list')
  const [search,   setSearch]   = useState('')
  const [filters,  setFilters]  = useState<LoadFilters>({ status: '', load_mode: '' })
  const [sortKey,  setSortKey]  = useState<keyof Load>('pickup_date')
  const [sortDir,  setSortDir]  = useState<'asc' | 'desc'>('asc')
  const [selected, setSelected] = useState<Load | null>(null)
  const [editLoad, setEditLoad] = useState<Load | null>(null)
  const [modal,    setModal]    = useState(false)
  const [prefill,  setPrefill]  = useState<Partial<CreateLoadDto> | null>(null)
  const [rateHistoryOpen, setRateHistoryOpen] = useState(false)
  // staleMode: true when navigated from DoThisNow "stale loads" action — restricts view to in-progress loads
  const [staleMode, setStaleMode] = useState(false)

  const reload = async () => {
    setLoading(true)
    try {
      const [l, d, b] = await Promise.all([window.api.loads.list(), window.api.drivers.list(), window.api.brokers.list()])
      setLoads(l); setDrivers(d); setBrokers(b)
      // Auto-open new load modal if navigated from Find Loads
      if (searchParams.get('new') === '1') {
        const brokerName = searchParams.get('broker_name')
        const matched    = brokerName
          ? (b as Broker[]).find(br => br.name.toLowerCase() === brokerName.toLowerCase())
          : null
        const driverId = searchParams.get('driver_id')
        setPrefill({
          origin_city:  searchParams.get('origin_city')  || null,
          origin_state: searchParams.get('origin_state') || null,
          dest_city:    searchParams.get('dest_city')    || null,
          dest_state:   searchParams.get('dest_state')   || null,
          rate:         searchParams.get('rate')   ? Number(searchParams.get('rate'))  : null,
          miles:        searchParams.get('miles')  ? Number(searchParams.get('miles')) : null,
          broker_id:    matched ? matched.id : null,
          driver_id:    driverId ? Number(driverId) : null,
          status:       'Booked',
        })
        setModal(true)
      }
    } finally { setLoading(false) }
  }
  // Apply URL-driven filters on first load
  // ?stale=1  → restrict to in-progress loads (Booked / Picked Up / In Transit)
  // ?status=X → pre-set the status filter dropdown to a specific status
  useEffect(() => {
    if (parseStaleParam(searchParams)) {
      setStaleMode(true)
    } else {
      const status = parseLoadStatusParam(searchParams)
      if (status) setFilters(f => ({ ...f, status }))
    }
  }, [])

  useEffect(() => { reload() }, [])

  const handleSort = (key: keyof Load) => {
    if (key === sortKey) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }
  const handleSave = (saved: Load) => {
    setLoads(p => p.some(l => l.id === saved.id) ? p.map(l => l.id === saved.id ? saved : l) : [saved, ...p])
    if (selected?.id === saved.id) setSelected(saved)
    // When a driver is unassigned, refresh drivers so the board reflects the status reset.
    // The backend resets the old driver to Active; we need that change in local state.
    const prev = loads.find(l => l.id === saved.id)
    if (prev?.driver_id != null && saved.driver_id == null) {
      window.api.drivers.list().then(setDrivers).catch(() => {})
    }
    setModal(false); setEditLoad(null)
  }

  // Inline driver assignment / unassignment / reassignment from the Loads table.
  // All three paths use existing IPC handlers — no new backend logic.
  const handleDriverChange = async (load: Load, newDriverId: number | null, reason?: string) => {
    if (newDriverId === load.driver_id) return

    if (newDriverId === null) {
      // Unassign: backend reverts load → Searching, driver → Active
      const updated = await window.api.loads.update(load.id, { driver_id: null, unassignment_reason: reason })
      if (updated) {
        setLoads(p => p.map(l => l.id === updated.id ? updated : l))
        if (selected?.id === updated.id) setSelected(updated)
        window.api.drivers.list().then(setDrivers).catch(() => {})
      }
    } else if (load.driver_id == null) {
      // Fresh assignment via existing dispatch:assignLoad (handles offer tracking)
      const result = await window.api.dispatcher.assignLoad({ loadId: load.id, driverId: newDriverId })
      if (result.ok) {
        const [newLoads, newDrivers] = await Promise.all([
          window.api.loads.list(), window.api.drivers.list(),
        ])
        setLoads(newLoads); setDrivers(newDrivers)
        if (selected?.id === load.id) setSelected(newLoads.find(l => l.id === load.id) ?? null)
      }
    } else {
      // Reassign: unassign old (→ Searching + old driver → Active), then assign new.
      // Use reason from caller (passed as 'admin_correction' by DriverDropdown for reassigns).
      const unassigned = await window.api.loads.update(load.id, { driver_id: null, unassignment_reason: reason ?? 'admin_correction' })
      if (!unassigned) return
      const result = await window.api.dispatcher.assignLoad({ loadId: load.id, driverId: newDriverId })
      if (result.ok) {
        const [newLoads, newDrivers] = await Promise.all([
          window.api.loads.list(), window.api.drivers.list(),
        ])
        setLoads(newLoads); setDrivers(newDrivers)
        if (selected?.id === load.id) setSelected(newLoads.find(l => l.id === load.id) ?? null)
      }
    }
  }
  const handleDelete = async (load: Load) => {
    await window.api.loads.delete(load.id)
    setLoads(p => p.filter(l => l.id !== load.id))
    if (selected?.id === load.id) setSelected(null)
  }
  const handleStatus = async (load: Load, status: LoadStatus) => {
    const updated = await window.api.loads.update(load.id, { status })
    if (updated) {
      setLoads(p => p.map(l => l.id === updated.id ? updated : l))
      if (selected?.id === updated.id) setSelected(updated)
    }
  }
  const openEdit = (load: Load) => { setEditLoad(load); setModal(true) }
  const openAdd  = () => { setEditLoad(null); setModal(true) }
  const handleDuplicate = (load: Load) => {
    setPrefill({
      driver_id:    load.driver_id,
      broker_id:    load.broker_id,
      origin_city:  load.origin_city,
      origin_state: load.origin_state,
      dest_city:    load.dest_city,
      dest_state:   load.dest_state,
      miles:        load.miles,
      dispatch_pct: load.dispatch_pct,
      trailer_type: load.trailer_type,
      commodity:    load.commodity,
      status:       'Searching',
    })
    setEditLoad(null)
    setModal(true)
    setSelected(null)
  }

  const STALE_STATUSES = ['Booked', 'Picked Up', 'In Transit'] as const

  const filtered = useMemo(() => {
    let r = loads
    // staleMode: show only in-progress loads (past-expected-date candidates)
    if (staleMode) r = r.filter(l => (STALE_STATUSES as readonly string[]).includes(l.status))
    if (search) {
      const q = search.toLowerCase()
      const dMap = Object.fromEntries(drivers.map(d => [d.id, d.name.toLowerCase()]))
      r = r.filter(l =>
        (l.load_id ?? '').toLowerCase().includes(q) ||
        (l.origin_city ?? '').toLowerCase().includes(q) ||
        (l.dest_city ?? '').toLowerCase().includes(q) ||
        (l.driver_id ? dMap[l.driver_id]?.includes(q) : false) ||
        (l.commodity ?? '').toLowerCase().includes(q)
      )
    }
    if (filters.load_mode) r = r.filter(l => l.load_mode === filters.load_mode)
    if (filters.status) r = r.filter(l => l.status === filters.status)
    return [...r].sort((a, b) => {
      const av = a[sortKey] ?? ''; const bv = b[sortKey] ?? ''
      return sortDir === 'asc' ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av))
    })
  }, [loads, search, filters, staleMode, sortKey, sortDir, drivers])

  return (
    <div className='space-y-4 max-w-[1400px] animate-fade-in'>
      <div>
        <h1 className='text-xl font-semibold text-gray-100'>
          {view === 'board' ? 'Dispatch Board' : view === 'calendar' ? 'Load Calendar' : 'Loads'}
        </h1>
        <p className='text-sm text-gray-500 mt-0.5'>
          {view === 'board' ? 'Driver status and current load assignments'
            : view === 'calendar' ? 'Loads by pickup date — weekly view'
            : 'Track loads through the full lifecycle'}
        </p>
      </div>
      <LoadsToolbar search={search} onSearch={setSearch} filters={filters} onFilters={setFilters} view={view} onView={setView} total={filtered.length} onAdd={openAdd} onRateHistory={() => setRateHistoryOpen(true)}/>
      {view === 'list'
        ? <LoadsTable loads={filtered} drivers={drivers} loading={loading} sortKey={sortKey} sortDir={sortDir} onSort={handleSort} onSelect={setSelected} onEdit={openEdit} onStatusChange={handleStatus} onDriverChange={handleDriverChange}/>
        : view === 'board'
        ? <DispatchBoard drivers={drivers} loads={loads} loading={loading} onLoadClick={setSelected}/>
        : <LoadCalendar loads={loads} drivers={drivers} onLoadClick={setSelected}/>
      }
      {selected&&<LoadDrawer load={selected} drivers={drivers} brokers={brokers} onClose={()=>setSelected(null)} onEdit={openEdit} onStatusChange={handleStatus} onDelete={handleDelete} onDuplicate={handleDuplicate}/>}
      {modal&&<LoadModal load={editLoad} prefill={prefill} onClose={()=>{setModal(false);setEditLoad(null);setPrefill(null)}} onSave={handleSave}/>}
      {rateHistoryOpen&&<RateHistoryModal loads={loads} brokers={brokers} onClose={()=>setRateHistoryOpen(false)}/>}
    </div>
  )
}

// ── Load Calendar ───────────────────────────────────────────────────────────
const CAL_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function getWeekStart(offset = 0): Date {
  const d = new Date()
  const dow = d.getDay() === 0 ? 6 : d.getDay() - 1 // 0=Mon
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - dow + offset * 7)
  return d
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

interface CalProps {
  loads: Load[]; drivers: Driver[]; onLoadClick: (l: Load) => void
}

function LoadCalendar({ loads, drivers, onLoadClick }: CalProps) {
  const [weekOffset, setWeekOffset] = useState(0)
  const weekStart = getWeekStart(weekOffset)
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart)
    d.setDate(weekStart.getDate() + i)
    return d
  })
  const today = isoDate(new Date())
  const driverMap = Object.fromEntries(drivers.map(d => [d.id, d.name]))

  const loadsForDay = (d: Date) => {
    const key = isoDate(d)
    return loads.filter(l => l.pickup_date === key || l.delivery_date === key)
  }

  const weekLabel = `${MONTH_NAMES[weekStart.getMonth()]} ${weekStart.getDate()} – ${MONTH_NAMES[days[6].getMonth()]} ${days[6].getDate()}, ${days[6].getFullYear()}`

  return (
    <div className='space-y-3'>
      <div className='flex items-center justify-between'>
        <button onClick={() => setWeekOffset(w => w - 1)} className='flex items-center gap-1 h-7 px-2.5 text-xs text-gray-400 hover:text-gray-200 bg-surface-700 hover:bg-surface-600 rounded-lg border border-surface-500 transition-colors'>
          <ChevronLeft size={13} /> Prev
        </button>
        <div className='flex items-center gap-2'>
          <span className='text-sm text-gray-300 font-medium'>{weekLabel}</span>
          {weekOffset !== 0 && (
            <button onClick={() => setWeekOffset(0)} className='text-2xs text-orange-400 hover:text-orange-300 transition-colors'>Today</button>
          )}
        </div>
        <button onClick={() => setWeekOffset(w => w + 1)} className='flex items-center gap-1 h-7 px-2.5 text-xs text-gray-400 hover:text-gray-200 bg-surface-700 hover:bg-surface-600 rounded-lg border border-surface-500 transition-colors'>
          Next <ChevronRight size={13} />
        </button>
      </div>
      <div className='grid grid-cols-7 gap-2'>
        {days.map((d, i) => {
          const key = isoDate(d)
          const dayLoads = loadsForDay(d)
          const isToday = key === today
          return (
            <div key={key} className={['rounded-xl border overflow-hidden', isToday ? 'border-orange-600/50 bg-orange-950/20' : 'border-surface-500 bg-surface-700'].join(' ')}>
              <div className={['flex items-center justify-between px-2 py-1.5 border-b', isToday ? 'border-orange-700/30 bg-orange-900/20' : 'border-surface-600'].join(' ')}>
                <span className='text-2xs font-medium text-gray-400'>{CAL_DAYS[i]}</span>
                <span className={['text-2xs font-bold', isToday ? 'text-orange-400' : 'text-gray-500'].join(' ')}>{d.getDate()}</span>
              </div>
              <div className='p-1.5 space-y-1 min-h-[80px]'>
                {dayLoads.length === 0 && (
                  <p className='text-2xs text-gray-700 italic px-1'>—</p>
                )}
                {dayLoads.map(l => {
                  const isPickup = l.pickup_date === key
                  const origin = [l.origin_city, l.origin_state].filter(Boolean).join(', ')
                  const dest   = [l.dest_city,   l.dest_state  ].filter(Boolean).join(', ')
                  return (
                    <button
                      key={l.id}
                      onClick={() => onLoadClick(l)}
                      className={['w-full text-left rounded px-1.5 py-1 transition-colors',
                        isPickup ? 'bg-blue-900/40 hover:bg-blue-900/60 border border-blue-700/30'
                                 : 'bg-green-900/30 hover:bg-green-900/50 border border-green-700/30',
                      ].join(' ')}
                    >
                      <p className='text-2xs font-medium text-gray-200 truncate'>{l.load_id ?? `#${l.id}`}</p>
                      <p className='text-2xs text-gray-500 truncate'>{isPickup ? origin || '—' : dest || '—'}</p>
                      {l.driver_id && <p className='text-2xs text-gray-600 truncate'>{driverMap[l.driver_id] ?? ''}</p>}
                      <span className={['text-2xs px-1 py-0.5 rounded-sm font-medium', isPickup ? 'text-blue-400' : 'text-green-400'].join(' ')}>
                        {isPickup ? 'Pickup' : 'Delivery'}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
      <p className='text-2xs text-gray-700'>Blue = pickup date, green = delivery date. Click any load to open details.</p>
    </div>
  )
}

// ── Dispatch Board ──────────────────────────────────────────────────────────

/** Hours since a load was last updated. Returns null if updated_at is missing. */
function hoursSinceUpdate(load: Load): number | null {
  if (!load.updated_at) return null
  const diff = Date.now() - new Date(load.updated_at).getTime()
  return diff / (1000 * 60 * 60)
}

const ACTIVE_STATUSES = ['Booked', 'Picked Up', 'In Transit'] as const

interface BoardProps {
  drivers: Driver[]; loads: Load[]; loading: boolean; onLoadClick: (l: Load) => void
}

function DispatchBoard({ drivers, loads, loading, onLoadClick }: BoardProps) {
  // Offer tracking state
  const [offerPanelDriverId, setOfferPanelDriverId] = useState<number | null>(null)
  const [availableLoads, setAvailableLoads]         = useState<AvailableLoad[]>([])
  const [offerMap, setOfferMap]                     = useState<Record<number, number>>({})      // loadId → offerId
  const [declineReasonMap, setDeclineReasonMap]     = useState<Record<number, string>>({})      // loadId → reason
  const [declineOpenId, setDeclineOpenId]           = useState<number | null>(null)             // loadId with reason dropdown open
  const [assigningLoadId, setAssigningLoadId]       = useState<number | null>(null)
  const [dismissedLoadIds, setDismissedLoadIds]     = useState<Set<number>>(new Set())
  const [assignError, setAssignError]               = useState<string | null>(null)
  // Prevents double-fire: if panel is already loading/open for this driver, skip re-entry
  const [loadingOffers, setLoadingOffers]           = useState(false)

  const openOfferPanel = async (driverId: number) => {
    // Guard: do not re-enter if we are already loading offers for this driver
    if (loadingOffers) return
    setLoadingOffers(true)
    setOfferPanelDriverId(driverId)
    setDismissedLoadIds(new Set())
    setDeclineReasonMap({})
    setDeclineOpenId(null)
    setAssignError(null)
    try {
      const avail = await window.api.dispatcher.availableLoads()
      setAvailableLoads(avail)
      // Find-or-create offer records for each available load shown to this driver.
      // The repo-level guard (createOffer) returns the existing open offer if one
      // already exists for this (driver, load) pair, so reopening the panel is safe.
      const entries = await Promise.all(
        avail.map(async (al) => {
          const offer = await window.api.loadOffers.create(driverId, al.load_id_pk)
          return [al.load_id_pk, offer.id] as [number, number]
        })
      )
      setOfferMap(Object.fromEntries(entries))
    } catch (err) {
      console.error('[DispatchBoard] openOfferPanel error:', err)
    } finally {
      setLoadingOffers(false)
    }
  }

  const closeOfferPanel = () => {
    setOfferPanelDriverId(null)
    setAvailableLoads([])
    setOfferMap({})
    setDismissedLoadIds(new Set())
    setDeclineReasonMap({})
    setDeclineOpenId(null)
    setAssignError(null)
    setLoadingOffers(false)
  }

  const handleAssign = async (driverId: number, al: AvailableLoad) => {
    setAssigningLoadId(al.load_id_pk)
    setAssignError(null)
    try {
      const offerId = offerMap[al.load_id_pk]
      const result  = await window.api.dispatcher.assignLoad({ loadId: al.load_id_pk, driverId })
      if (!result.ok) {
        setAssignError(result.error ?? 'Assignment failed.')
        setAssigningLoadId(null)
        return
      }
      if (offerId != null) {
        await window.api.loadOffers.updateStatus(offerId, 'accepted')
      }
      closeOfferPanel()
    } catch (err) {
      setAssignError(String(err))
      setAssigningLoadId(null)
    }
  }

  const handleDecline = async (al: AvailableLoad) => {
    const reason  = declineReasonMap[al.load_id_pk] ?? ''
    const offerId = offerMap[al.load_id_pk]
    if (offerId != null) {
      await window.api.loadOffers.updateStatus(offerId, 'declined', reason || undefined)
    }
    setDismissedLoadIds(prev => new Set([...prev, al.load_id_pk]))
    setDeclineOpenId(null)
  }

  /** Manual no_response: dispatcher marks the offer without waiting for the 2-hour sweep. */
  const handleMarkNoResponse = async (al: AvailableLoad) => {
    const offerId = offerMap[al.load_id_pk]
    if (offerId != null) {
      await window.api.loadOffers.updateStatus(offerId, 'no_response')
    }
    setDismissedLoadIds(prev => new Set([...prev, al.load_id_pk]))
    setDeclineOpenId(null)
  }

  if (loading) return (
    <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'>
      {Array.from({length:8}).map((_,i)=><div key={i} className='h-36 rounded-xl bg-surface-700 animate-pulse'/>)}
    </div>
  )
  if (!drivers.length) return (
    <div className='py-16 text-center'>
      <p className='text-sm text-gray-500'>No drivers yet.</p>
      <p className='text-xs text-gray-700 mt-1'>Add drivers to populate the dispatch board.</p>
    </div>
  )

  const activeLoads = loads.filter(l => ACTIVE_STATUSES.includes(l.status as typeof ACTIVE_STATUSES[number]))
  const loadByDriver: Record<number, Load> = {}
  activeLoads.forEach(l => { if (l.driver_id != null) loadByDriver[l.driver_id] = l })

  // Offer panel — shown as a full-width panel below the grid when a driver is selected
  const offerPanelDriver = offerPanelDriverId != null
    ? drivers.find(d => d.id === offerPanelDriverId) ?? null
    : null
  const visibleOfferLoads = availableLoads.filter(al => !dismissedLoadIds.has(al.load_id_pk))

  return (
    <div className='space-y-4'>
      <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'>
        {drivers.map(d => {
          const currentLoad = loadByDriver[d.id]
          const needsLoad = d.status === 'Active' && !currentLoad
          const rpm = currentLoad?.rate != null && currentLoad?.miles != null && currentLoad.miles > 0
            ? currentLoad.rate / currentLoad.miles : null
          const rpmOk = rpm == null || d.min_rpm == null || rpm >= d.min_rpm

          const hrs = currentLoad ? hoursSinceUpdate(currentLoad) : null
          const isInTransit = currentLoad?.status === 'In Transit'
          const checkCallOverdue = isInTransit && hrs != null && hrs >= 4
          const checkCallWarning = isInTransit && hrs != null && hrs >= 2 && hrs < 4
          const isPanelOpen = offerPanelDriverId === d.id

          return (
            <div key={d.id} className={[
              'rounded-xl border p-4 transition-all',
              d.status === 'Inactive' ? 'bg-surface-800 border-surface-600 opacity-50' :
              isPanelOpen ? 'bg-surface-700 border-orange-600/60 shadow-card' :
              needsLoad ? 'bg-orange-950/30 border-orange-700/40 shadow-card hover:border-orange-600/60' :
              checkCallOverdue ? 'bg-red-950/20 border-red-700/40 shadow-card hover:border-red-600/60' :
              'bg-surface-700 border-surface-400 shadow-card hover:shadow-card-hover',
            ].join(' ')}>
              {/* Driver header */}
              <div className='flex items-start justify-between mb-3'>
                <div className='flex-1 min-w-0'>
                  <p className='text-sm font-semibold text-gray-200 truncate'>{d.name}</p>
                  {d.company&&<p className='text-2xs text-gray-600 truncate'>{d.company}</p>}
                </div>
                <span className={`text-2xs px-2 py-0.5 rounded-full border ml-2 shrink-0 ${DRIVER_STATUS_STYLES[d.status]}`}>{d.status}</span>
              </div>
              {/* Equipment */}
              <div className='flex items-center gap-2 mb-3'>
                {d.truck_type&&<span className='text-2xs px-1.5 py-0.5 rounded bg-surface-600 text-gray-500'>{d.truck_type}</span>}
                {d.trailer_type&&<span className='text-2xs px-1.5 py-0.5 rounded bg-surface-600 text-gray-500'>{d.trailer_type}</span>}
              </div>
              {d.home_base&&<p className='text-2xs text-gray-600 mb-3'>{d.home_base}</p>}
              {/* Load status */}
              {needsLoad ? (
                <div className='space-y-2'>
                  <div className='flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-orange-900/30 border border-orange-700/30'>
                    <div className='w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse shrink-0'/>
                    <span className='text-2xs text-orange-400 font-medium'>Needs Load</span>
                    {d.min_rpm!=null&&<span className='text-2xs text-orange-600 ml-auto'>Min ${d.min_rpm.toFixed(2)}</span>}
                  </div>
                  {!isPanelOpen && (
                    <button
                      disabled={loadingOffers}
                      onClick={() => openOfferPanel(d.id)}
                      className='w-full flex items-center justify-center gap-1.5 h-7 text-2xs font-medium text-gray-300 bg-surface-600 hover:bg-surface-500 border border-surface-400 hover:border-surface-300 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
                    >
                      <Search size={11} />
                      {loadingOffers ? 'Loading...' : 'Find Load'}
                    </button>
                  )}
                  {isPanelOpen && (
                    <button
                      onClick={closeOfferPanel}
                      className='w-full flex items-center justify-center gap-1.5 h-7 text-2xs font-medium text-orange-400 bg-orange-900/20 hover:bg-orange-900/30 border border-orange-700/40 rounded-lg transition-colors'
                    >
                      Close
                    </button>
                  )}
                </div>
              ) : currentLoad ? (
                <button onClick={()=>onLoadClick(currentLoad)} className='w-full text-left'>
                  <div className={`px-2 py-1.5 rounded-lg border ${LOAD_STATUS_STYLES[currentLoad.status]}`}>
                    <div className='flex items-center justify-between mb-1'>
                      <span className='text-2xs font-medium'>{currentLoad.status}</span>
                      {rpm!=null&&<span className={`text-2xs font-mono font-semibold ${rpmOk?'text-green-400':'text-red-400'}`}>${rpm.toFixed(2)}/mi</span>}
                    </div>
                    <p className='text-2xs text-current opacity-80 truncate'>
                      {[currentLoad.origin_city,currentLoad.origin_state].filter(Boolean).join(', ')||'?'} → {[currentLoad.dest_city,currentLoad.dest_state].filter(Boolean).join(', ')||'?'}
                    </p>
                    {currentLoad.pickup_date&&<p className='text-2xs opacity-60 mt-0.5'>Pickup: {currentLoad.pickup_date}</p>}
                    {/* Check-call countdown for In Transit loads */}
                    {isInTransit && hrs != null && (
                      <div className={`flex items-center gap-1 mt-1.5 px-1.5 py-0.5 rounded text-2xs font-medium ${
                        checkCallOverdue  ? 'bg-red-900/40 text-red-300 border border-red-700/40' :
                        checkCallWarning  ? 'bg-yellow-900/30 text-yellow-300 border border-yellow-700/30' :
                                            'bg-surface-600/40 text-gray-500'
                      }`}>
                        <Bell size={9} className='shrink-0' />
                        <span className='ml-0.5'>{
                          checkCallOverdue
                            ? `Check call overdue — ${Math.floor(hrs)}h since update`
                            : checkCallWarning
                            ? `Check call due soon — ${Math.floor(hrs)}h since update`
                            : `Updated ${Math.floor(hrs)}h ago`
                        }</span>
                      </div>
                    )}
                  </div>
                </button>
              ) : d.status === 'Inactive' ? (
                <p className='text-2xs text-gray-700 italic'>Inactive</p>
              ) : null}
            </div>
          )
        })}
      </div>

      {/* Offer Panel — rendered below the grid for the selected driver */}
      {offerPanelDriver && (
        <div className='rounded-xl border border-orange-700/40 bg-surface-800 p-4 space-y-3'>
          <div className='flex items-center justify-between'>
            <p className='text-sm font-semibold text-gray-200'>
              Available Loads for {offerPanelDriver.name}
            </p>
            <button onClick={closeOfferPanel} className='text-2xs text-gray-500 hover:text-gray-300 transition-colors'>
              Close
            </button>
          </div>
          {assignError && (
            <p className='text-2xs text-red-400 bg-red-900/20 border border-red-700/30 rounded-lg px-3 py-2'>{assignError}</p>
          )}
          {availableLoads.length === 0 ? (
            <p className='text-sm text-gray-500 py-4 text-center'>No available loads right now. Add a Searching load to the board first.</p>
          ) : visibleOfferLoads.length === 0 ? (
            <p className='text-sm text-gray-500 py-4 text-center'>All available loads have been reviewed for this driver.</p>
          ) : (
            <div className='space-y-2'>
              {visibleOfferLoads.map(al => {
                const routeFrom = [al.origin_city, al.origin_state].filter(Boolean).join(', ') || '?'
                const routeTo   = [al.dest_city,   al.dest_state  ].filter(Boolean).join(', ') || '?'
                const rpm       = al.rate != null && al.miles != null && al.miles > 0
                  ? (al.rate / al.miles).toFixed(2) : null
                const isAssigning = assigningLoadId === al.load_id_pk
                const isDeclineOpen = declineOpenId === al.load_id_pk

                return (
                  <div key={al.load_id_pk} className='flex flex-col gap-2 rounded-lg border border-surface-500 bg-surface-700 p-3'>
                    <div className='flex items-start justify-between gap-3'>
                      <div className='flex-1 min-w-0'>
                        <p className='text-xs font-medium text-gray-200 truncate'>
                          {routeFrom} &rarr; {routeTo}
                        </p>
                        <div className='flex items-center gap-2 mt-0.5 flex-wrap'>
                          {al.pickup_date && <span className='text-2xs text-gray-500'>Pickup: {al.pickup_date}</span>}
                          {al.miles != null && <span className='text-2xs text-gray-500'>{al.miles} mi</span>}
                          {al.rate  != null && <span className='text-2xs text-green-400 font-mono'>${al.rate.toLocaleString()}</span>}
                          {rpm      != null && <span className='text-2xs text-gray-600 font-mono'>${rpm}/mi</span>}
                          {al.broker_name && <span className='text-2xs text-gray-600 truncate'>{al.broker_name}</span>}
                        </div>
                      </div>
                      <div className='flex items-center gap-1.5 shrink-0'>
                        <button
                          disabled={isAssigning}
                          onClick={() => handleAssign(offerPanelDriver.id, al)}
                          className='flex items-center gap-1 h-7 px-2.5 text-2xs font-medium text-green-300 bg-green-900/30 hover:bg-green-900/50 border border-green-700/40 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
                        >
                          <Check size={11} />
                          {isAssigning ? 'Assigning...' : 'Assign'}
                        </button>
                        <button
                          disabled={isAssigning}
                          onClick={() => setDeclineOpenId(isDeclineOpen ? null : al.load_id_pk)}
                          className='flex items-center gap-1 h-7 px-2.5 text-2xs font-medium text-gray-400 hover:text-gray-200 bg-surface-600 hover:bg-surface-500 border border-surface-400 rounded-lg transition-colors disabled:opacity-50'
                        >
                          <XCircle size={11} />
                          Skip
                        </button>
                        {/* Manual no_response — lets dispatcher resolve the offer without waiting 2 hours */}
                        <button
                          disabled={isAssigning}
                          onClick={() => handleMarkNoResponse(al)}
                          title='Mark as no response — driver did not respond to this offer'
                          className='flex items-center gap-1 h-7 px-2 text-2xs font-medium text-gray-500 hover:text-gray-300 bg-surface-600 hover:bg-surface-500 border border-surface-400 rounded-lg transition-colors disabled:opacity-50'
                        >
                          <Clock size={11} />
                          N/R
                        </button>
                      </div>
                    </div>
                    {/* Decline reason dropdown */}
                    {isDeclineOpen && (
                      <div className='flex items-center gap-2 pt-1 border-t border-surface-600'>
                        <select
                          value={declineReasonMap[al.load_id_pk] ?? ''}
                          onChange={e => setDeclineReasonMap(prev => ({ ...prev, [al.load_id_pk]: e.target.value }))}
                          className='flex-1 h-7 text-2xs bg-surface-600 border border-surface-400 text-gray-300 rounded-lg px-2 focus:outline-none focus:border-orange-500'
                        >
                          <option value=''>Select reason...</option>
                          {LOAD_OFFER_DECLINE_REASONS.map(r => (
                            <option key={r} value={r}>{r}</option>
                          ))}
                        </select>
                        <button
                          onClick={() => handleDecline(al)}
                          className='h-7 px-3 text-2xs font-medium text-orange-300 bg-orange-900/30 hover:bg-orange-900/50 border border-orange-700/40 rounded-lg transition-colors'
                        >
                          Confirm Skip
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
