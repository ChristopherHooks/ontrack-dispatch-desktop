import { useState, useEffect, useMemo } from 'react'
import type { Driver, DriverStatus } from '../types/models'
import { DriversToolbar, type DriverFilters, type DriverView } from '../components/drivers/DriversToolbar'
import { DriversTable }  from '../components/drivers/DriversTable'
import { DriverModal }   from '../components/drivers/DriverModal'
import { DriverDrawer }  from '../components/drivers/DriverDrawer'
import { DriverAvailabilityCalendar } from '../components/drivers/DriverAvailabilityCalendar'
import { DriverOnboardingPipeline } from '../components/drivers/DriverOnboardingPipeline'
import { Export1099Modal } from '../components/drivers/Export1099Modal'

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

  const reload = async () => {
    setLoading(true)
    try     { setDrivers(await window.api.drivers.list()) }
    finally { setLoading(false) }
  }
  useEffect(() => { reload() }, [])

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
    // with a ghost driver assignment. Check first, then confirm if a conflict exists.
    if (drv.status === 'On Load' && status !== 'On Load') {
      const allLoads = await window.api.loads.list()
      const activeLoad = allLoads.find(l =>
        l.driver_id === drv.id &&
        ['Booked', 'Picked Up', 'In Transit'].includes(l.status)
      )
      if (activeLoad) {
        const loadRef = activeLoad.load_id ?? `#${activeLoad.id}`
        const confirmed = window.confirm(
          `${drv.name} is still assigned to Load ${loadRef}.\n\nUnassign the load and mark driver ${status}?`
        )
        if (!confirmed) return
        // Unassign the load (backend also reverts it to Searching)
        await window.api.loads.update(activeLoad.id, { driver_id: null })
      }
    }
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
        ? <DriversTable drivers={filtered} loading={loading} sortKey={sortKey} sortDir={sortDir} onSort={handleSort} onSelect={setSelected} onEdit={openEdit} onFetchAuthority={handleFetchAuthority} onStatusChange={handleStatus}/>
        : view === 'calendar'
        ? <DriverAvailabilityCalendar drivers={filtered}/>
        : <DriverOnboardingPipeline drivers={filtered} onSelectDriver={setSelected}/>
      }
      {selected&&<DriverDrawer driver={selected} onClose={()=>setSelected(null)} onEdit={openEdit} onStatusChange={handleStatus} onDelete={handleDelete} onUpdate={handleUpdate}/>}
      {modal&&<DriverModal driver={editDrv} onClose={()=>{setModal(false);setEditDrv(null)}} onSave={handleSave}/>}
      {show1099&&<Export1099Modal drivers={drivers} onClose={()=>setShow1099(false)}/>}
    </div>
  )
}
