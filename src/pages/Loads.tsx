import { useState, useEffect, useMemo } from 'react'
import type { Load, LoadStatus, Driver, Broker } from '../types/models'
import { LoadsToolbar, type LoadFilters } from '../components/loads/LoadsToolbar'
import { LoadsTable }  from '../components/loads/LoadsTable'
import { LoadModal }   from '../components/loads/LoadModal'
import { LoadDrawer }  from '../components/loads/LoadDrawer'
import { DRIVER_STATUS_STYLES } from '../components/drivers/constants'
import { LOAD_STATUS_STYLES } from '../components/loads/constants'

export function Loads() {
  const [loads,    setLoads]    = useState<Load[]>([])
  const [drivers,  setDrivers]  = useState<Driver[]>([])
  const [brokers,  setBrokers]  = useState<Broker[]>([])
  const [loading,  setLoading]  = useState(true)
  const [view,     setView]     = useState<'list' | 'board'>('list')
  const [search,   setSearch]   = useState('')
  const [filters,  setFilters]  = useState<LoadFilters>({ status: '' })
  const [sortKey,  setSortKey]  = useState<keyof Load>('pickup_date')
  const [sortDir,  setSortDir]  = useState<'asc' | 'desc'>('asc')
  const [selected, setSelected] = useState<Load | null>(null)
  const [editLoad, setEditLoad] = useState<Load | null>(null)
  const [modal,    setModal]    = useState(false)

  const reload = async () => {
    setLoading(true)
    try {
      const [l, d, b] = await Promise.all([window.api.loads.list(), window.api.drivers.list(), window.api.brokers.list()])
      setLoads(l); setDrivers(d); setBrokers(b)
    } finally { setLoading(false) }
  }
  useEffect(() => { reload() }, [])

  const handleSort = (key: keyof Load) => {
    if (key === sortKey) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }
  const handleSave = (saved: Load) => {
    setLoads(p => p.some(l => l.id === saved.id) ? p.map(l => l.id === saved.id ? saved : l) : [saved, ...p])
    if (selected?.id === saved.id) setSelected(saved)
    setModal(false); setEditLoad(null)
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

  const filtered = useMemo(() => {
    let r = loads
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
    if (filters.status) r = r.filter(l => l.status === filters.status)
    return [...r].sort((a, b) => {
      const av = a[sortKey] ?? ''; const bv = b[sortKey] ?? ''
      return sortDir === 'asc' ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av))
    })
  }, [loads, search, filters, sortKey, sortDir, drivers])

  return (
    <div className='space-y-4 max-w-[1400px] animate-fade-in'>
      <div>
        <h1 className='text-xl font-semibold text-gray-100'>{view === 'board' ? 'Dispatch Board' : 'Loads'}</h1>
        <p className='text-sm text-gray-500 mt-0.5'>{view === 'board' ? 'Driver status and current load assignments' : 'Track loads through the full lifecycle'}</p>
      </div>
      <LoadsToolbar search={search} onSearch={setSearch} filters={filters} onFilters={setFilters} view={view} onView={setView} total={filtered.length} onAdd={openAdd}/>
      {view === 'list'
        ? <LoadsTable loads={filtered} drivers={drivers} loading={loading} sortKey={sortKey} sortDir={sortDir} onSort={handleSort} onSelect={setSelected} onEdit={openEdit}/>
        : <DispatchBoard drivers={drivers} loads={loads} loading={loading} onLoadClick={setSelected}/>
      }
      {selected&&<LoadDrawer load={selected} drivers={drivers} brokers={brokers} onClose={()=>setSelected(null)} onEdit={openEdit} onStatusChange={handleStatus} onDelete={handleDelete}/>}
      {modal&&<LoadModal load={editLoad} onClose={()=>{setModal(false);setEditLoad(null)}} onSave={handleSave}/>}
    </div>
  )
}

// ── Dispatch Board ──────────────────────────────────────────────────────────
const ACTIVE_STATUSES = ['Booked', 'Picked Up', 'In Transit'] as const

interface BoardProps {
  drivers: Driver[]; loads: Load[]; loading: boolean; onLoadClick: (l: Load) => void
}

function DispatchBoard({ drivers, loads, loading, onLoadClick }: BoardProps) {
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

  return (
    <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'>
      {drivers.map(d => {
        const currentLoad = loadByDriver[d.id]
        const needsLoad = d.status === 'Active' && !currentLoad
        const rpm = currentLoad?.rate != null && currentLoad?.miles != null && currentLoad.miles > 0
          ? currentLoad.rate / currentLoad.miles : null
        const rpmOk = rpm == null || d.min_rpm == null || rpm >= d.min_rpm

        return (
          <div key={d.id} className={[
            'rounded-xl border p-4 transition-all',
            d.status === 'Inactive' ? 'bg-surface-800 border-surface-600 opacity-50' :
            needsLoad ? 'bg-orange-950/30 border-orange-700/40 shadow-card hover:border-orange-600/60' :
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
            {d.home_base&&<p className='text-2xs text-gray-600 mb-3'>📍 {d.home_base}</p>}
            {/* Load status */}
            {needsLoad ? (
              <div className='flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-orange-900/30 border border-orange-700/30'>
                <div className='w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse shrink-0'/>
                <span className='text-2xs text-orange-400 font-medium'>Needs Load</span>
                {d.min_rpm!=null&&<span className='text-2xs text-orange-600 ml-auto'>Min ${d.min_rpm.toFixed(2)}</span>}
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
                </div>
              </button>
            ) : d.status === 'Inactive' ? (
              <p className='text-2xs text-gray-700 italic'>Inactive</p>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}
