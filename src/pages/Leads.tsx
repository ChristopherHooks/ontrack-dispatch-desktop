import { useState, useEffect, useMemo } from 'react'
import type { Lead, LeadStatus, CsvImportResult, FmcsaImportResult, FmcsaImportStatus } from '../types/models'
import { LeadsToolbar, type LeadFilters } from '../components/leads/LeadsToolbar'
import { LeadsTable }  from '../components/leads/LeadsTable'
import { LeadsKanban } from '../components/leads/LeadsKanban'
import { LeadModal }        from '../components/leads/LeadModal'
import { LeadDrawer }       from '../components/leads/LeadDrawer'
import { PasteImportModal } from '../components/leads/PasteImportModal'

function fmtAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 2)  return 'just now'
  if (mins < 60) return mins + 'm ago'
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)  return hrs + 'h ago'
  return Math.floor(hrs / 24) + 'd ago'
}

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
  const [importBusy,      setImportBusy]      = useState(false)
  const [importResult,    setImportResult]    = useState<FmcsaImportResult | null>(null)
  const [lastImportAt,    setLastImportAt]    = useState<string | null>(null)
  const [importStatus,    setImportStatus]    = useState<FmcsaImportStatus | null>(null)
  const [csvImportBusy,   setCsvImportBusy]   = useState(false)
  const [csvImportResult, setCsvImportResult] = useState<CsvImportResult | null>(null)
  const [showPasteModal,  setShowPasteModal]  = useState(false)

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
    window.api.leads.importStatus().then(setImportStatus).catch(() => {})
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
      window.api.leads.importStatus().then(setImportStatus).catch(() => {})
      if (result.leadsAdded > 0) await reload()
    } finally {
      setImportBusy(false)
    }
  }

  const handleImportCsv = async () => {
    setCsvImportBusy(true)
    setCsvImportResult(null)
    try {
      const result = await window.api.leads.importCsv()
      if (result === null) return  // user cancelled the file picker
      setCsvImportResult(result)
      if (result.inserted > 0) await reload()
    } finally {
      setCsvImportBusy(false)
    }
  }

  const handlePasteResult = async (result: CsvImportResult) => {
    setCsvImportResult(result)
    if (result.inserted > 0) await reload()
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
      // Authority date: sort by age (ascending = youngest/least-aged first = most recent date first).
      // Nulls always go last regardless of direction.
      if (sortKey === 'authority_date') {
        const av = a.authority_date ?? ''
        const bv = b.authority_date ?? ''
        if (!av && !bv) return 0
        if (!av) return 1
        if (!bv) return -1
        // Invert date comparison so "ascending age" = newest date first
        return sortDir === 'asc'
          ? bv.localeCompare(av)
          : av.localeCompare(bv)
      }
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

      {importStatus?.lastAttemptedAt ? (
        <div className='flex flex-wrap items-center gap-x-2 text-xs text-gray-600'>
          <span className='text-gray-500'>FMCSA last run:</span>
          <span className='text-gray-400'>{fmtAgo(importStatus.lastAttemptedAt)}</span>
          <span className={importStatus.source === 'scheduled' ? 'text-blue-400/80' : 'text-orange-400/70'}>
            · {importStatus.source === 'scheduled' ? 'Scheduled' : 'Manual'}
          </span>
          <span>· Found {importStatus.leadsFound}</span>
          <span>· Added <span className='text-gray-400'>{importStatus.leadsAdded}</span></span>
          <span>· Skipped {importStatus.duplicatesSkipped}</span>
          {importStatus.lastError && (
            <span className='text-yellow-600/80'>· {importStatus.lastError.slice(0, 80)}</span>
          )}
        </div>
      ) : (
        <p className='text-xs text-gray-700'>FMCSA import: never run — click Import FMCSA Leads to start.</p>
      )}

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

      {csvImportResult && (
        <div className={`rounded-md px-4 py-3 text-sm flex items-start justify-between gap-4
          ${csvImportResult.errors.length > 0
            ? 'bg-yellow-900/40 border border-yellow-700/50 text-yellow-200'
            : 'bg-green-900/40 border border-green-700/50 text-green-200'}`}
        >
          <div className='space-y-1'>
            <p className='font-medium text-xs uppercase tracking-wide opacity-60 mb-1'>CSV Import Result</p>
            <div className='flex gap-4 font-medium'>
              <span>Rows read: {csvImportResult.totalRows}</span>
              <span>Inserted: {csvImportResult.inserted}</span>
              <span>Duplicates: {csvImportResult.duplicatesSkipped}</span>
              {csvImportResult.invalidSkipped > 0 && (
                <span>Invalid: {csvImportResult.invalidSkipped}</span>
              )}
            </div>
            {csvImportResult.errors.slice(0, 5).map((e, i) => (
              <p key={i} className='text-xs opacity-80'>{e}</p>
            ))}
            {csvImportResult.errors.length > 5 && (
              <p className='text-xs opacity-60'>…and {csvImportResult.errors.length - 5} more issues</p>
            )}
          </div>
          <button
            onClick={() => setCsvImportResult(null)}
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
        onImportCsv={handleImportCsv}
        csvImportBusy={csvImportBusy}
        onPaste={() => setShowPasteModal(true)}
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

      {showPasteModal && (
        <PasteImportModal
          onClose={() => setShowPasteModal(false)}
          onResult={handlePasteResult}
        />
      )}
    </div>
  )
}
