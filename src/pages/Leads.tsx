import { useState, useEffect, useMemo } from 'react'
import type { Lead, LeadStatus, FmcsaImportResult } from '../types/models'
import { LeadsToolbar, type LeadFilters } from '../components/leads/LeadsToolbar'
import { LeadsTable }  from '../components/leads/LeadsTable'
import { LeadsKanban } from '../components/leads/LeadsKanban'
import { LeadModal }   from '../components/leads/LeadModal'
import { LeadDrawer }  from '../components/leads/LeadDrawer'

export function Leads() {
  const [leads,    setLeads]    = useState<Lead[]>([])
  const [loading,  setLoading]  = useState(true)
  const [view,     setView]     = useState<'table' | 'kanban'>('table')
  const [search,   setSearch]   = useState('')
  const [filters,  setFilters]  = useState<LeadFilters>({ status: '', priority: '', source: '', overdue: false })
  const [sortKey,  setSortKey]  = useState<keyof Lead>('follow_up_date')
  const [sortDir,  setSortDir]  = useState<'asc' | 'desc'>('asc')
  const [selected,     setSelected]     = useState<Lead | null>(null)
  const [editLead,     setEditLead]     = useState<Lead | null>(null)
  const [modal,        setModal]        = useState(false)
  const [importBusy,   setImportBusy]   = useState(false)
  const [importResult, setImportResult] = useState<FmcsaImportResult | null>(null)
  const [lastImportAt, setLastImportAt] = useState<string | null>(null)

  const reload = async () => {
    setLoading(true)
    try     { setLeads(await window.api.leads.list()) }
    finally { setLoading(false) }
  }
  useEffect(() => {
    reload()
    window.api.settings.get('last_fmcsa_import_at').then(v => {
      if (typeof v === 'string') setLastImportAt(v)
    })
  }, [])

  const handleSort = (key: keyof Lead) => {
    if (key === sortKey) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  const handleSave = (saved: Lead) => {
    setLeads(p => p.some(l => l.id === saved.id)
      ? p.map(l => l.id === saved.id ? saved : l)
      : [saved, ...p])
    if (selected?.id === saved.id) setSelected(saved)
    setModal(false); setEditLead(null)
  }

  const handleDelete = async (lead: Lead) => {
    await window.api.leads.delete(lead.id)
    setLeads(p => p.filter(l => l.id !== lead.id))
    if (selected?.id === lead.id) setSelected(null)
  }

  const handleStatusChange = async (lead: Lead, status: LeadStatus) => {
    const updated = await window.api.leads.update(lead.id, { status })
    if (updated) {
      setLeads(p => p.map(l => l.id === updated.id ? updated : l))
      if (selected?.id === updated.id) setSelected(updated)
    }
  }

  const handleImport = async () => {
    setImportBusy(true)
    setImportResult(null)
    try {
      const result = await window.api.leads.importFmcsa()
      setImportResult(result)
      const ts = await window.api.settings.get('last_fmcsa_import_at')
      if (typeof ts === 'string') setLastImportAt(ts)
      if (result.leadsAdded > 0) await reload()
    } finally {
      setImportBusy(false)
    }
  }

  const openEdit = (lead: Lead) => { setEditLead(lead); setModal(true) }
  const openAdd  = ()           => { setEditLead(null); setModal(true) }

  const today = new Date().toISOString().split('T')[0]

  const filtered = useMemo(() => {
    let r = leads
    if (search) {
      const q = search.toLowerCase()
      r = r.filter(l =>
        l.name.toLowerCase().includes(q) ||
        (l.company   ?? '').toLowerCase().includes(q) ||
        (l.mc_number ?? '').toLowerCase().includes(q) ||
        (l.phone     ?? '').toLowerCase().includes(q)
      )
    }
    if (filters.status)   r = r.filter(l => l.status   === filters.status)
    if (filters.priority) r = r.filter(l => l.priority === filters.priority)
    if (filters.source)   r = r.filter(l => l.source   === filters.source)
    if (filters.overdue)  r = r.filter(l => l.follow_up_date != null && l.follow_up_date < today)
    return [...r].sort((a, b) => {
      const av = a[sortKey] ?? ''
      const bv = b[sortKey] ?? ''
      return sortDir === 'asc'
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av))
    })
  }, [leads, search, filters, sortKey, sortDir, today])

  return (
    <div className='space-y-4 max-w-[1400px] animate-fade-in'>
      <div>
        <h1 className='text-xl font-semibold text-gray-100'>Leads</h1>
        <p className='text-sm text-gray-500 mt-0.5'>Manage your carrier pipeline</p>
      </div>

      {importResult && (
        <div className={`rounded-md px-4 py-3 text-sm flex items-start justify-between gap-4
          ${importResult.errors.length > 0
            ? 'bg-yellow-900/40 border border-yellow-700/50 text-yellow-200'
            : 'bg-green-900/40 border border-green-700/50 text-green-200'}`}
        >
          <div className='space-y-1'>
            <div className='flex gap-4 font-medium'>
              <span>Found: {importResult.leadsFound}</span>
              <span>Added: {importResult.leadsAdded}</span>
              <span>Skipped: {importResult.duplicatesSkipped}</span>
            </div>
            {importResult.errors.map((e, i) => (
              <p key={i} className='text-xs opacity-80'>{e}</p>
            ))}
          </div>
          <button
            onClick={() => setImportResult(null)}
            className='opacity-60 hover:opacity-100 transition-opacity text-lg leading-none'
            aria-label='Dismiss'
          >×</button>
        </div>
      )}

      <LeadsToolbar
        search={search}     onSearch={setSearch}
        filters={filters}   onFilters={setFilters}
        view={view}         onView={setView}
        total={filtered.length}
        onAdd={openAdd}
        onImport={handleImport}
        importBusy={importBusy}
        lastImportAt={lastImportAt}
      />

      {view === 'table'
        ? <LeadsTable
            leads={filtered}   loading={loading}
            sortKey={sortKey}  sortDir={sortDir}
            onSort={handleSort}
            onSelect={setSelected}
            onEdit={openEdit}
            onDelete={handleDelete}
          />
        : <LeadsKanban
            leads={filtered}  loading={loading}
            onSelect={setSelected}
            onStatusChange={handleStatusChange}
          />
      }

      {selected && (
        <LeadDrawer
          lead={selected}
          onClose={() => setSelected(null)}
          onEdit={openEdit}
          onStatusChange={handleStatusChange}
          onDelete={handleDelete}
        />
      )}

      {modal && (
        <LeadModal
          lead={editLead}
          onClose={() => { setModal(false); setEditLead(null) }}
          onSave={handleSave}
        />
      )}
    </div>
  )
}
