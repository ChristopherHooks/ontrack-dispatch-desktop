import { useState, useEffect, useMemo } from 'react'
import type { Broker, BrokerFlag } from '../types/models'
import { BrokersToolbar, type BrokerFilters } from '../components/brokers/BrokersToolbar'
import { BrokersTable } from '../components/brokers/BrokersTable'
import { BrokerModal } from '../components/brokers/BrokerModal'
import { BrokerDrawer } from '../components/brokers/BrokerDrawer'

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

  const openAdd  = () => { setEditBrk(null); setModal(true) }
  const openEdit = (b: Broker) => { setEditBrk(b); setModal(true); setSelected(null) }

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
