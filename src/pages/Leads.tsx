import { useState, useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { Lead, LeadStatus, CsvImportResult, FmcsaImportResult, FmcsaImportStatus } from '../types/models'
import { LeadsToolbar, type LeadFilters, DEFAULT_FILTERS } from '../components/leads/LeadsToolbar'
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

interface SummaryCount {
  label:       string
  count:       number
  color:       string
  filterApply: Partial<LeadFilters>
}

export function Leads() {
  const [searchParams] = useSearchParams()
  const [leads,    setLeads]    = useState<Lead[]>([])
  const [loading,  setLoading]  = useState(true)
  const [view,     setView]     = useState<'table' | 'kanban'>('table')
  const [search,   setSearch]   = useState('')
  const [filters,  setFilters]  = useState<LeadFilters>(() => {
    const f = searchParams.get('filter')
    if (f === 'overdue')    return { ...DEFAULT_FILTERS, overdue: true }
    if (f === 'dueToday')   return { ...DEFAULT_FILTERS, followUpToday: true }
    if (f === 'warm')       return { ...DEFAULT_FILTERS, warm: true }
    if (f === 'untouched')  return { ...DEFAULT_FILTERS, untouched: true }
    if (f === 'duplicates') return { ...DEFAULT_FILTERS, duplicates: true }
    return DEFAULT_FILTERS
  })
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
  const [showSourceStats, setShowSourceStats] = useState(false)

  const reload = async () => {
    setLoading(true)
    try     { setLeads(await window.api.leads.list()) }
    finally { setLoading(false) }
  }
  useEffect(() => {
    reload().then(() => {
      // Auto-open a specific lead drawer when navigated with ?open=<id>
      const openId = searchParams.get('open')
      if (openId) {
        const id = parseInt(openId, 10)
        window.api.leads.get(id).then(lead => {
          if (lead) setSelected(lead)
        }).catch(() => {})
      }
    })
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
    const key = await window.api.settings.get('fmcsa_web_key').catch(() => null)
    if (!key || String(key).trim() === '') {
      setImportResult({
        leadsFound: 0, leadsAdded: 0, duplicatesSkipped: 0,
        errors: ['FMCSA key not configured — add it in Settings > Integrations before importing.'],
      })
      return
    }
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

  // ── Duplicate MC detection (client-side, no extra IPC needed) ──────────
  const duplicateMcNumbers = useMemo((): Set<string> => {
    const counts = new Map<string, number>()
    for (const l of leads) {
      if (l.mc_number) counts.set(l.mc_number, (counts.get(l.mc_number) ?? 0) + 1)
    }
    const dupes = new Set<string>()
    for (const [mc, n] of counts.entries()) {
      if (n > 1) dupes.add(mc)
    }
    return dupes
  }, [leads])

  const duplicateLeadCount = useMemo(
    () => leads.filter(l => l.mc_number != null && duplicateMcNumbers.has(l.mc_number)).length,
    [leads, duplicateMcNumbers]
  )

  // ── Source analytics ─────────────────────────────────────────────────────
  const sourceStats = useMemo(() => {
    const map = new Map<string, { total: number; converted: number }>()
    for (const l of leads) {
      const src = l.source?.trim() || 'Unknown'
      const cur = map.get(src) ?? { total: 0, converted: 0 }
      cur.total++
      if (['Converted','Signed'].includes(l.status)) cur.converted++
      map.set(src, cur)
    }
    return Array.from(map.entries())
      .map(([src, { total, converted }]) => ({ src, total, converted, rate: total > 0 ? Math.round((converted / total) * 100) : 0 }))
      .sort((a, b) => b.total - a.total)
  }, [leads])

  // ── Summary counts (computed from full unfiltered list) ──────────────────
  const summaryCounts = useMemo((): SummaryCount[] => {
    const untouchedNew  = leads.filter(l => l.status === 'New' && (l.contact_attempt_count ?? 0) === 0).length
    const dueToday      = leads.filter(l => l.follow_up_date === today).length
    const interested    = leads.filter(l => l.status === 'Interested' || l.status === 'Call Back Later').length
    const converted     = leads.filter(l => l.status === 'Converted' || l.status === 'Signed').length
    const result: SummaryCount[] = [
      { label: 'New / Untouched',   count: untouchedNew,       color: 'text-gray-400 border-surface-400',       filterApply: { untouched: true } },
      { label: 'Due Today',         count: dueToday,           color: 'text-orange-400 border-orange-800/40',   filterApply: { followUpToday: true } },
      { label: 'Warm / Interested', count: interested,         color: 'text-yellow-400 border-yellow-800/40',   filterApply: { warm: true } },
      { label: 'Converted',         count: converted,          color: 'text-emerald-400 border-emerald-800/40', filterApply: { status: 'Converted' } },
    ]
    if (duplicateLeadCount > 0) {
      result.push({ label: 'Duplicates', count: duplicateLeadCount, color: 'text-red-400 border-red-800/40', filterApply: { duplicates: true } })
    }
    return result
  }, [leads, today, duplicateLeadCount])

  const applyCount = (c: SummaryCount) => {
    setFilters({ ...DEFAULT_FILTERS, ...c.filterApply })
  }

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
    if (filters.status)        r = r.filter(l => l.status   === filters.status)
    if (filters.priority)      r = r.filter(l => l.priority === filters.priority)
    if (filters.source)        r = r.filter(l => l.source   === filters.source)
    if (filters.overdue)       r = r.filter(l => l.follow_up_date != null && l.follow_up_date < today)
    if (filters.followUpToday) r = r.filter(l => l.follow_up_date === today)
    if (filters.warm)          r = r.filter(l => l.status === 'Interested' || l.status === 'Call Back Later')
    if (filters.untouched)     r = r.filter(l => l.status === 'New' && (l.contact_attempt_count ?? 0) === 0)
    if (filters.duplicates)    r = r.filter(l => l.mc_number != null && duplicateMcNumbers.has(l.mc_number))

    const INACTIVE_STATUSES = new Set(['Not Interested', 'Bad Fit', 'Rejected', 'Inactive MC'])

    return [...r].sort((a, b) => {
      // Inactive statuses always sort to the bottom regardless of active sort column
      const aInactive = INACTIVE_STATUSES.has(a.status) ? 1 : 0
      const bInactive = INACTIVE_STATUSES.has(b.status) ? 1 : 0
      if (aInactive !== bInactive) return aInactive - bInactive

      // Authority date: sort by age (ascending = youngest/least-aged first = most recent date first).
      // Nulls always go last regardless of direction.
      if (sortKey === 'authority_date') {
        const at = a.authority_date ? new Date(a.authority_date.trim()).getTime() : null
        const bt = b.authority_date ? new Date(b.authority_date.trim()).getTime() : null
        if (at === null && bt === null) return 0
        if (at === null) return 1   // nulls last
        if (bt === null) return -1  // nulls last
        // asc = youngest (largest timestamp) first
        return sortDir === 'asc' ? bt - at : at - bt
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
        <p className='text-sm text-gray-500 mt-0.5'>Find, contact, and convert owner-operators into signed drivers.</p>
      </div>

      {/* ── Pipeline Summary ── */}
      <div className='flex items-center gap-3 flex-wrap'>
        {summaryCounts.map(c => (
          <button
            key={c.label}
            onClick={() => applyCount(c)}
            title={`Filter to: ${c.label}`}
            className={`flex items-center gap-2 px-3 h-8 rounded-lg border bg-surface-700 hover:bg-surface-600 transition-colors ${c.color}`}
          >
            <span className='text-lg font-semibold leading-none'>{c.count}</span>
            <span className='text-2xs text-gray-500'>{c.label}</span>
          </button>
        ))}
        {leads.length > 0 && (
          <span className='text-2xs text-gray-700 ml-1'>{leads.length} total leads</span>
        )}
      </div>

      {/* Source Analytics */}
      {sourceStats.length > 0 && sourceStats.some(s => s.src !== 'Unknown') && (
        <div className='bg-surface-800 border border-surface-600 rounded-xl overflow-hidden'>
          <button onClick={() => setShowSourceStats(v => !v)}
            className='flex items-center justify-between w-full px-4 py-2.5 hover:bg-surface-700/40 transition-colors'>
            <span className='text-2xs font-medium text-gray-500 uppercase tracking-wider'>Lead Source Analytics</span>
            <span className='text-gray-600 text-sm'>{showSourceStats ? '−' : '+'}</span>
          </button>
          {showSourceStats && (
            <div className='px-4 pb-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4'>
              {sourceStats.filter(s => s.src !== 'Unknown').map(({ src, total, converted, rate }) => (
                <button key={src} onClick={() => setFilters({ ...DEFAULT_FILTERS, source: src })}
                  className='text-left p-2.5 rounded-lg bg-surface-700 hover:bg-surface-600 border border-surface-500 transition-colors'>
                  <p className='text-xs font-medium text-gray-300 truncate'>{src}</p>
                  <p className='text-2xs text-gray-600 mt-1'>{total} lead{total !== 1 ? 's' : ''}</p>
                  <p className={`text-xs font-semibold mt-0.5 ${rate >= 20 ? 'text-green-400' : rate >= 10 ? 'text-yellow-400' : 'text-gray-600'}`}>
                    {converted} converted ({rate}%)
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

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
        <p className='text-xs text-gray-400'>FMCSA import: never run — click Import FMCSA Leads to start.</p>
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
        duplicateCount={duplicateLeadCount}
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
            onStatusChange={handleStatusChange}
            duplicateMcNumbers={duplicateMcNumbers}
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
          onUpdate={updated => {
            setLeads(p => p.map(l => l.id === updated.id ? updated : l))
            setSelected(updated)
          }}
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
