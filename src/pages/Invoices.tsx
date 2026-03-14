import { useState, useEffect, useMemo } from 'react'
import type { Invoice, InvoiceStatus, Driver, Load, Broker } from '../types/models'
import { InvoicesToolbar, type InvoiceFilters } from '../components/invoices/InvoicesToolbar'
import { InvoicesTable } from '../components/invoices/InvoicesTable'
import { InvoiceModal } from '../components/invoices/InvoiceModal'
import { InvoiceDrawer } from '../components/invoices/InvoiceDrawer'

export function Invoices() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [drivers, setDrivers]   = useState<Driver[]>([])
  const [loads, setLoads]       = useState<Load[]>([])
  const [brokers, setBrokers]   = useState<Broker[]>([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [filters, setFilters]   = useState<InvoiceFilters>({ status: '' })
  const [sortKey, setSortKey]   = useState<keyof Invoice>('created_at')
  const [sortDir, setSortDir]   = useState<'asc' | 'desc'>('desc')
  const [selected, setSelected] = useState<Invoice | null>(null)
  const [editInv, setEditInv]   = useState<Invoice | null>(null)
  const [prefill, setPrefill]   = useState<Load | null>(null)
  const [modal, setModal]       = useState(false)

  const reload = async () => {
    setLoading(true)
    const [inv, drv, ld, brk] = await Promise.all([
      window.api.invoices.list(),
      window.api.drivers.list(),
      window.api.loads.list(),
      window.api.brokers.list(),
    ])
    setInvoices(inv); setDrivers(drv); setLoads(ld); setBrokers(brk)
    setLoading(false)
  }
  useEffect(() => { reload() }, [])

  const handleSort = (k: keyof Invoice) => {
    if (sortKey === k) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(k); setSortDir('asc') }
  }

  const filtered = useMemo(() => {
    let list = [...invoices]
    if (search) {
      const q = search.toLowerCase()
      const driverMap = new Map(drivers.map(d => [d.id, d.name.toLowerCase()]))
      list = list.filter(inv =>
        inv.invoice_number.toLowerCase().includes(q) ||
        (inv.driver_id != null && (driverMap.get(inv.driver_id) ?? '').includes(q))
      )
    }
    if (filters.status) list = list.filter(inv => inv.status === filters.status)
    list.sort((a, b) => {
      const av = String(a[sortKey] ?? ''); const bv = String(b[sortKey] ?? '')
      return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
    })
    return list
  }, [invoices, search, filters, sortKey, sortDir, drivers])

  const totalOutstanding = useMemo(() =>
    invoices.filter(i => i.status === 'Draft' || i.status === 'Sent' || i.status === 'Overdue')
      .reduce((s, i) => s + (i.dispatch_fee ?? 0), 0),
    [invoices]
  )

  const openGenerate = () => { setEditInv(null); setPrefill(null); setModal(true) }
  const openEdit = (inv: Invoice) => { setEditInv(inv); setPrefill(null); setModal(true); setSelected(null) }

  const handleSave = (saved: Invoice) => {
    setInvoices(p => p.find(i => i.id === saved.id) ? p.map(i => i.id === saved.id ? saved : i) : [saved, ...p])
    setModal(false)
    setSelected(saved)
  }

  const handleStatusChange = async (inv: Invoice, status: InvoiceStatus) => {
    const updates: Partial<Invoice> = { status }
    if (status === 'Sent' && !inv.sent_date) updates.sent_date = new Date().toISOString().split('T')[0]
    if (status === 'Paid' && !inv.paid_date) updates.paid_date = new Date().toISOString().split('T')[0]
    const updated = await window.api.invoices.update(inv.id, updates)
    if (updated) {
      setInvoices(p => p.map(i => i.id === updated.id ? updated : i))
      setSelected(updated)
      // If load is linked, mark load as Invoiced/Paid too
      if (inv.load_id && (status === 'Sent' || status === 'Paid')) {
        const loadStatus = status === 'Paid' ? 'Paid' : 'Invoiced'
        const updatedLoad = await window.api.loads.update(inv.load_id, { status: loadStatus })
        if (updatedLoad) setLoads(p => p.map(l => l.id === inv.load_id ? updatedLoad : l))
      }
    }
  }

  return (
    <div className='flex flex-col h-full'>
      <InvoicesToolbar
        search={search} onSearch={setSearch}
        filters={filters} onFilter={setFilters}
        count={filtered.length}
        totalOutstanding={totalOutstanding}
        onGenerate={openGenerate}
      />
      <InvoicesTable
        invoices={filtered} drivers={drivers} loading={loading}
        sortKey={sortKey} sortDir={sortDir} onSort={handleSort}
        onSelect={setSelected}
      />
      {selected && (
        <InvoiceDrawer
          invoice={selected}
          drivers={drivers} loads={loads} brokers={brokers}
          onClose={() => setSelected(null)}
          onEdit={openEdit}
          onStatusChange={handleStatusChange}
        />
      )}
      {modal && (
        <InvoiceModal
          invoice={editInv}
          prefillLoad={prefill}
          onSave={handleSave}
          onClose={() => setModal(false)}
        />
      )}
    </div>
  )
}
