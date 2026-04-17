import { useState, useEffect, useMemo } from 'react'
import type { Driver, DriverStatus } from '../types/models'
import { DriversToolbar, type DriverFilters, type DriverView } from '../components/drivers/DriversToolbar'
import { DriversTable }  from '../components/drivers/DriversTable'
import { DriverModal }   from '../components/drivers/DriverModal'
import { DriverDrawer }  from '../components/drivers/DriverDrawer'
import { DriverAvailabilityCalendar } from '../components/drivers/DriverAvailabilityCalendar'
import { DriverOnboardingPipeline } from '../components/drivers/DriverOnboardingPipeline'
import { Export1099Modal } from '../components/drivers/Export1099Modal'
import { computeDriverTier, type DriverTierResult } from '../lib/driverTierService'
import { UNASSIGNMENT_REASON_OPTIONS } from '../components/loads/constants'
import type { Load } from '../types/models'

export function Drivers() {
  const [drivers,  setDrivers]  = useState<Driver[]>([])
  const [loading,  setLoading]  = useState(true)
  const [search,   setSearch]   = useState('')
  const [filters,  setFilters]  = useState<DriverFilters>({ status: '' })
  const [sortKey,  setSortKey]  = useState<keyof Driver>('name')
  const [sortDir,  setSortDir]  = useState<'asc' | 'desc'>('asc')
  const [selected, setSelected] = useState<Driver | null>(null)
  const [editDrv,  setEditDrv]  = useState<Driver | null>(null)
  const [modal,    setModal]    = useState(false)
  const [view,     setView]     = useState<DriverView>('list')
  const [show1099, setShow1099] = useState(false)
  const [tierMap,  setTierMap]  = useState<Map<number, DriverTierResult>>(new Map())
  const [pendingUnassign, setPendingUnassign] = useState<{ drv: Driver; status: DriverStatus; activeLoad: Load } | null>(null)

  const reload = async () => {
    setLoading(true)
    try     { setDrivers(await window.api.drivers.list()) }
    finally { setLoading(false) }
  }

  const loadTierMap = async () => {
    try {
      const [cards, falloutRows] = await Promise.all([
        window.api.drivers.allWeeklyScorecards(),
        window.api.drivers.allFalloutCounts(),
      ])
      const falloutByDriver = new Map(falloutRows.map(r => [r.driver_id, r.fallout_count]))
      const map = new Map<number, DriverTierResult>(
        cards.map(c => [
          c.driver_id,
          computeDriverTier({
            accepted_count:       c.accepted_count,
            declined_count:       c.declined_count,
            no_response_count:    c.no_response_count,
            loads_booked:         c.loads_booked,
            acceptance_rate:      c.acceptance_rate ?? 0,
            avg_response_minutes: c.avg_response_minutes,
            fallout_count:        falloutByDriver.get(c.driver_id) ?? 0,
          }),
        ])
      )
      setTierMap(map)
    } catch (_) { /* non-critical — table renders without tier if fetch fails */ }
  }

  useEffect(() => { reload(); loadTierMap() }, [])

  const handleSort = (key: keyof Driver) => {
    if (key === sortKey) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }
  const handleSave = (saved: Driver) => {
    setDrivers(p => p.some(d => d.id === saved.id) ? p.map(d => d.id === saved.id ? saved : d) : [saved, ...p])
    if (selected?.id === saved.id) setSelected(saved)
    setModal(false); setEditDrv(null)
  }
  const handleDelete = async (drv: Driver) => {
    await window.api.drivers.delete(drv.id)
    setDrivers(p => p.filter(d => d.id !== drv.id))
    if (selected?.id === drv.id) setSelected(null)
  }
  const handleStatus = async (drv: Driver, status: DriverStatus) => {
    // Consistency guard: changing away from On Load risks leaving a live load
    // with a ghost driver assignment. Check first; if conflict exists, show reason picker.
    if (drv.status === 'On Load' && status !== 'On Load') {
      const allLoads = await window.api.loads.list()
      const activeLoad = allLoads.find(l =>
        l.driver_id === drv.id &&
        ['Booked', 'Picked Up', 'In Transit'].includes(l.status)
      )
      if (activeLoad) {
        // Show reason picker modal instead of window.confirm
        setPendingUnassign({ drv, status, activeLoad })
        return
      }
    }
    const updated = await window.api.drivers.update(drv.id, { status })
    if (updated) {
      setDrivers(p => p.map(d => d.id === updated.id ? updated : d))
      if (selected?.id === updated.id) setSelected(updated)
    }
  }

  const handleConfirmUnassign = async (reason: string) => {
    if (!pendingUnassign) return
    const { drv, status, activeLoad } = pendingUnassign
    setPendingUnassign(null)
    await window.api.loads.update(activeLoad.id, { driver_id: null, unassignment_reason: reason })
    const updated = await window.api.drivers.update(drv.id, { status })
    if (updated) {
      setDrivers(p => p.map(d => d.id === updated.id ? updated : d))
      if (selected?.id === updated.id) setSelected(updated)
    }
  }
  const handleUpdate = (updated: Driver) => {
    setDrivers(p => p.map(d => d.id === updated.id ? updated : d))
    if (selected?.id === updated.id) setSelected(updated)
  }
  const openEdit = (drv: Driver) => { setEditDrv(drv); setModal(true) }
  const openAdd  = () => { setEditDrv(null); setModal(true) }

  const handleFetchAuthority = async (drv: Driver) => {
    if (!drv.mc_number) return
    const updated = await window.api.drivers.fetchAuthorityDate(drv.id, drv.mc_number)
    if (updated) {
      setDrivers(p => p.map(d => d.id === updated.id ? updated : d))
      if (selected?.id === updated.id) setSelected(updated)
    }
  }

  const filtered = useMemo(() => {
    let r = drivers
    if (search) {
      const q = search.toLowerCase()
      r = r.filter(d =>
        d.name.toLowerCase().includes(q) ||
        (d.company ?? '').toLowerCase().includes(q) ||
        (d.mc_number ?? '').toLowerCase().includes(q) ||
        (d.phone ?? '').toLowerCase().includes(q)
      )
    }
    if (filters.status) r = r.filter(d => d.status === filters.status)
    return [...r].sort((a, b) => {
      const av = a[sortKey] ?? ''; const bv = b[sortKey] ?? ''
      return sortDir === 'asc' ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av))
    })
  }, [drivers, search, filters, sortKey, sortDir])

  return (
    <div className='space-y-4 max-w-[1400px] animate-fade-in'>
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-xl font-semibold text-gray-100'>Drivers</h1>
          <p className='text-sm text-gray-500 mt-0.5'>Your driver network. Keep profiles, documents, and availability current before searching loads.</p>
        </div>
        <button onClick={() => setShow1099(true)}
          className='flex items-center gap-1.5 h-8 px-3 text-xs rounded-lg font-medium bg-surface-600 hover:bg-surface-500 text-gray-400 hover:text-gray-200 border border-surface-400 transition-colors'>
          1099 Export
        </button>
      </div>
      <DriversToolbar search={search} onSearch={setSearch} filters={filters} onFilters={setFilters} total={filtered.length} onAdd={openAdd} view={view} onView={setView}/>
      {view === 'list'
        ? <DriversTable drivers={filtered} loading={loading} sortKey={sortKey} sortDir={sortDir} onSort={handleSort} onSelect={setSelected} onEdit={openEdit} onFetchAuthority={handleFetchAuthority} onStatusChange={handleStatus} tierMap={tierMap}/>
        : view === 'calendar'
        ? <DriverAvailabilityCalendar drivers={filtered}/>
        : <DriverOnboardingPipeline drivers={filtered} onSelectDriver={setSelected}/>
      }
      {selected&&<DriverDrawer driver={selected} onClose={()=>setSelected(null)} onEdit={openEdit} onStatusChange={handleStatus} onDelete={handleDelete} onUpdate={handleUpdate}/>}
      {modal&&<DriverModal driver={editDrv} onClose={()=>{setModal(false);setEditDrv(null)}} onSave={handleSave}/>}
      {show1099&&<Export1099Modal drivers={drivers} onClose={()=>setShow1099(false)}/>}
      {pendingUnassign && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/60'>
          <div className='bg-surface-800 border border-surface-400 rounded-xl shadow-2xl w-80 p-5'>
            <p className='text-sm text-gray-200 font-medium mb-1'>Remove driver from load?</p>
            <p className='text-xs text-gray-500 mb-4'>
              {pendingUnassign.drv.name} is assigned to Load {pendingUnassign.activeLoad.load_id ?? `#${pendingUnassign.activeLoad.id}`}.
              Select a reason to continue.
            </p>
            <div className='space-y-1'>
              {UNASSIGNMENT_REASON_OPTIONS.map(r => (
                <button
                  key={r.value}
                  onClick={() => handleConfirmUnassign(r.value)}
                  className='w-full text-left px-3 py-2 rounded-lg text-xs text-gray-200 hover:bg-surface-600 transition-colors border border-transparent hover:border-surface-400'
                >
                  {r.label}
                  {r.fallout && <span className='text-2xs text-red-400 ml-1'>(fallout)</span>}
                </button>
              ))}
            </div>
            <button
              onClick={() => setPendingUnassign(null)}
              className='mt-3 w-full text-center text-xs text-gray-600 hover:text-gray-400 transition-colors'
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
