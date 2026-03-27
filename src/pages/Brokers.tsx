import { useState, useEffect, useMemo } from 'react'
import type { Broker, BrokerFlag } from '../types/models'
import { BrokersToolbar, type BrokerFilters } from '../components/brokers/BrokersToolbar'
import { BrokersTable } from '../components/brokers/BrokersTable'
import { BrokerModal } from '../components/brokers/BrokerModal'
import { BrokerDrawer } from '../components/brokers/BrokerDrawer'
import { STARTER_BROKERS } from '../data/starterBrokers'
import { Building2, Download } from 'lucide-react'

export function Brokers() {
  const [brokers, setBrokers]   = useState<Broker[]>([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [filters, setFilters]   = useState<BrokerFilters>({ flag: '' })
  const [sortKey, setSortKey]   = useState<keyof Broker>('name')
  const [sortDir, setSortDir]   = useState<'asc' | 'desc'>('asc')
  const [selected, setSelected] = useState<Broker | null>(null)
  const [editBrk, setEditBrk]   = useState<Broker | null>(null)
  const [modal, setModal]       = useState(false)

  const reload = async () => {
    setLoading(true)
    const data = await window.api.brokers.list()
    setBrokers(data); setLoading(false)
  }
  useEffect(() => { reload() }, [])

  const handleSort = (k: keyof Broker) => {
    if (sortKey === k) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(k); setSortDir('asc') }
  }

  const filtered = useMemo(() => {
    let list = [...brokers]
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(b =>
        b.name.toLowerCase().includes(q) ||
        (b.mc_number ?? '').toLowerCase().includes(q) ||
        (b.phone ?? '').includes(q) ||
        (b.email ?? '').toLowerCase().includes(q)
      )
    }
    if (filters.flag) list = list.filter(b => b.flag === filters.flag)
    list.sort((a, b) => {
      const av = String(a[sortKey] ?? ''); const bv = String(b[sortKey] ?? '')
      return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
    })
    return list
  }, [brokers, search, filters, sortKey, sortDir])

  const [seeding, setSeeding] = useState(false)

  const openAdd  = () => { setEditBrk(null); setModal(true) }
  const openEdit = (b: Broker) => { setEditBrk(b); setModal(true); setSelected(null) }

  const seedStarterBrokers = async () => {
    setSeeding(true)
    for (const b of STARTER_BROKERS) {
      try { await window.api.brokers.create({ ...b, flag: 'None' }) } catch { /* skip duplicates */ }
    }
    await reload()
    setSeeding(false)
  }

  const handleSave = (saved: Broker) => {
    setBrokers(p => p.find(b => b.id === saved.id) ? p.map(b => b.id === saved.id ? saved : b) : [saved, ...p])
    setModal(false)
  }

  const handleDelete = async (b: Broker) => {
    await window.api.brokers.delete(b.id)
    setBrokers(p => p.filter(x => x.id !== b.id))
    setSelected(null)
  }

  const handleFlagChange = async (b: Broker, flag: BrokerFlag) => {
    const updated = await window.api.brokers.update(b.id, { flag })
    if (updated) {
      setBrokers(p => p.map(x => x.id === b.id ? updated : x))
      setSelected(updated)
    }
  }

  const handleUpdateAuthority = async (b: Broker, newAuth: number, minDays: number | null) => {
    const updated = await window.api.brokers.update(b.id, { new_authority: newAuth, min_authority_days: minDays })
    if (updated) {
      setBrokers(p => p.map(x => x.id === b.id ? updated : x))
      if (selected?.id === b.id) setSelected(updated)
    }
  }

  const handleUpdateBroker = async (b: Broker, patch: Partial<Broker>) => {
    const updated = await window.api.brokers.update(b.id, patch)
    if (updated) {
      setBrokers(p => p.map(x => x.id === b.id ? updated : x))
      if (selected?.id === b.id) setSelected(updated)
    }
  }

  return (
    <div className='flex flex-col h-full'>
      <BrokersToolbar
        search={search} onSearch={setSearch}
        filters={filters} onFilter={setFilters}
        count={filtered.length} onAdd={openAdd}
      />

      {/* Starter broker nudge — shown when list is empty and not loading */}
      {!loading && brokers.length === 0 && (
        <div className='mx-6 mt-4 flex items-center justify-between gap-4 bg-surface-700 border border-orange-800/40 rounded-xl px-5 py-4'>
          <div className='flex items-center gap-3'>
            <Building2 size={18} className='text-orange-400 shrink-0' />
            <div>
              <p className='text-sm font-medium text-gray-200'>No brokers yet</p>
              <p className='text-xs text-gray-500 mt-0.5'>
                Load 20 established brokers to your list — a starting point for getting your carriers approved and finding freight.
              </p>
            </div>
          </div>
          <button
            onClick={seedStarterBrokers}
            disabled={seeding}
            className='flex items-center gap-2 px-4 py-2 text-sm font-medium bg-orange-600 hover:bg-orange-500 text-white rounded-xl transition-colors shrink-0 disabled:opacity-60'
          >
            <Download size={14} />
            {seeding ? 'Adding...' : 'Add Starter Brokers'}
          </button>
        </div>
      )}

      <BrokersTable
        brokers={filtered} loading={loading}
        sortKey={sortKey} sortDir={sortDir} onSort={handleSort}
        onSelect={setSelected} onEdit={openEdit} onDelete={handleDelete}
        onUpdateAuthority={handleUpdateAuthority}
        onUpdateBroker={handleUpdateBroker}
      />
      {selected && (
        <BrokerDrawer
          broker={selected}
          onClose={() => setSelected(null)}
          onEdit={openEdit}
          onDelete={handleDelete}
          onFlagChange={handleFlagChange}
        />
      )}
      {modal && (
        <BrokerModal broker={editBrk} onSave={handleSave} onClose={() => setModal(false)} />
      )}
    </div>
  )
}
