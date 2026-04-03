import { useState, useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Receipt } from 'lucide-react'
import type { Invoice, InvoiceStatus, Driver, Load, Broker } from '../types/models'
import { InvoicesToolbar, type InvoiceFilters } from '../components/invoices/InvoicesToolbar'
import { InvoicesTable } from '../components/invoices/InvoicesTable'
import { InvoiceModal } from '../components/invoices/InvoiceModal'
import { InvoiceDrawer } from '../components/invoices/InvoiceDrawer'
import { InvoiceAgingPanel } from '../components/invoices/InvoiceAgingPanel'

export function Invoices() {
  const [searchParams] = useSearchParams()
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
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [bulkBusy, setBulkBusy] = useState(false)
  const [activeTab, setActiveTab] = useState<'invoices' | 'aging'>('invoices')

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

  // Auto-open new invoice modal pre-filled from a load (e.g. navigated from Active Loads after delivery)
  useEffect(() => {
    const isNew   = searchParams.get('new') === '1'
    const loadIdP = searchParams.get('load_id')
    if (!isNew || !loadIdP) return
    const loadId = Number(loadIdP)
    if (!loadId) return
    window.api.loads.get(loadId).then(load => {
      if (load) { setEditInv(null); setPrefill(load); setModal(true) }
    })
  }, [])

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

  const invoicedLoadIds = useMemo(() => new Set(invoices.map(i => i.load_id).filter(Boolean)), [invoices])
  const uninvoicedLoads = useMemo(() =>
    loads.filter(l => l.status === 'Delivered' && !invoicedLoadIds.has(l.id)),
    [loads, invoicedLoadIds]
  )

  const openGenerate = () => { setEditInv(null); setPrefill(null); setModal(true) }
  const openEdit = (inv: Invoice) => { setEditInv(inv); setPrefill(null); setModal(true); setSelected(null) }

  const handleSave = (saved: Invoice) => {
    setInvoices(p => p.find(i => i.id === saved.id) ? p.map(i => i.id === saved.id ? saved : i) : [saved, ...p])
    setModal(false)
    setSelected(saved)
  }

  const handleDelete = async (inv: Invoice) => {
    await window.api.invoices.delete(inv.id)
    setInvoices(p => p.filter(i => i.id !== inv.id))
    setSelected(null)
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

  const openPrefilled = (load: Load) => { setEditInv(null); setPrefill(load); setModal(true) }

  const handleToggle = (id: number) => setSelectedIds(prev => {
    const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next
  })
  const handleToggleAll = (ids: number[]) => {
    const allSelected = ids.every(id => selectedIds.has(id))
    setSelectedIds(allSelected ? new Set() : new Set(ids))
  }

  const handleBulkStatus = async (status: InvoiceStatus) => {
    if (selectedIds.size === 0 || bulkBusy) return
    setBulkBusy(true)
    const today = new Date().toISOString().split('T')[0]
    const extra: Record<string, string | null> = {}
    if (status === 'Sent')  extra.sent_date = today
    if (status === 'Paid')  { extra.sent_date = today; extra.paid_date = today }
    await window.api.invoices.bulkUpdate([...selectedIds], status, extra)
    await reload()
    setSelectedIds(new Set())
    setBulkBusy(false)
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
      {/* Tab bar */}
      <div className='flex border-b border-surface-600 shrink-0 px-1'>
        {(['invoices', 'aging'] as const).map(t => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`px-4 py-2 text-xs font-medium capitalize transition-colors ${
              activeTab === t
                ? 'text-orange-400 border-b-2 border-orange-500'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {t === 'aging' ? 'Aging Report' : 'All Invoices'}
          </button>
        ))}
      </div>
      {uninvoicedLoads.length > 0 && (
        <div className='mx-0 mb-3 rounded-xl border border-orange-700/40 bg-orange-950/25 px-4 py-3'>
          <div className='flex items-center gap-2 mb-2'>
            <Receipt size={13} className='text-orange-400 shrink-0' />
            <span className='text-xs font-semibold text-orange-300'>
              {uninvoicedLoads.length} delivered {uninvoicedLoads.length === 1 ? 'load' : 'loads'} not yet invoiced
            </span>
          </div>
          <div className='space-y-1.5'>
            {uninvoicedLoads.map(l => {
              const driver = drivers.find(d => d.id === l.driver_id)
              const route = [l.origin_city, l.origin_state].filter(Boolean).join(', ') + ' \u2192 ' + [l.dest_city, l.dest_state].filter(Boolean).join(', ')
              return (
                <div key={l.id} className='flex items-center justify-between gap-3 rounded-lg bg-orange-900/20 border border-orange-700/20 px-3 py-1.5'>
                  <div className='min-w-0 flex-1'>
                    <span className='text-xs text-gray-300 font-medium truncate block'>
                      {driver?.name ?? 'Unassigned'}{l.load_id ? <span className='text-gray-600 font-normal'> &middot; {l.load_id}</span> : null}
                    </span>
                    <span className='text-2xs text-gray-500 truncate block'>{route || 'No route'}{l.rate != null ? <span className='text-gray-400'> &middot; ${l.rate.toLocaleString()}</span> : null}</span>
                  </div>
                  <button
                    onClick={() => openPrefilled(l)}
                    className='shrink-0 h-6 px-3 text-2xs font-semibold rounded-lg bg-orange-600 hover:bg-orange-500 text-white transition-colors'
                  >
                    Invoice
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}
      {selectedIds.size > 0 && (
        <div className='flex items-center gap-2 px-4 py-2 bg-surface-700 border-b border-surface-500'>
          <span className='text-xs text-gray-400'>{selectedIds.size} selected</span>
          <div className='flex-1'/>
          <button disabled={bulkBusy} onClick={() => handleBulkStatus('Sent')}
            className='px-3 h-7 text-xs font-medium bg-blue-700 hover:bg-blue-600 text-white rounded-lg disabled:opacity-50 transition-colors'>
            Mark Sent
          </button>
          <button disabled={bulkBusy} onClick={() => handleBulkStatus('Paid')}
            className='px-3 h-7 text-xs font-medium bg-green-700 hover:bg-green-600 text-white rounded-lg disabled:opacity-50 transition-colors'>
            Mark Paid
          </button>
          <button disabled={bulkBusy} onClick={() => handleBulkStatus('Draft')}
            className='px-3 h-7 text-xs font-medium bg-surface-600 hover:bg-surface-500 text-gray-300 rounded-lg disabled:opacity-50 transition-colors'>
            Reset to Draft
          </button>
          <button onClick={() => setSelectedIds(new Set())} className='px-3 h-7 text-xs text-gray-500 hover:text-gray-300 transition-colors'>
            Clear
          </button>
        </div>
      )}
      {activeTab === 'invoices' && (
        <>
          <InvoicesTable
            invoices={filtered} drivers={drivers} loading={loading}
            sortKey={sortKey} sortDir={sortDir} onSort={handleSort}
            onSelect={setSelected}
            selectedIds={selectedIds} onToggle={handleToggle} onToggleAll={handleToggleAll}
          />
        </>
      )}
      {activeTab === 'aging' && (
        <div className='flex-1 overflow-y-auto p-5'>
          <InvoiceAgingPanel
            invoices={invoices}
            drivers={drivers}
            brokers={brokers}
            onSelect={inv => { setSelected(inv); setActiveTab('invoices') }}
          />
        </div>
      )}
      {selected && (
        <InvoiceDrawer
          invoice={selected}
          drivers={drivers} loads={loads} brokers={brokers}
          onClose={() => setSelected(null)}
          onEdit={openEdit}
          onStatusChange={handleStatusChange}
          onDelete={handleDelete}
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
