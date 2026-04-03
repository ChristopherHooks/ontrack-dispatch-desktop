import { useState, useEffect, useMemo } from 'react'
import { Plus, Search, X, Users } from 'lucide-react'
import type { DriverProspect, ProspectStage } from '../types/models'
import { DriverAcquisitionKanban } from '../components/driver-acquisition/DriverAcquisitionKanban'
import { ProspectModal }          from '../components/driver-acquisition/ProspectModal'
import { ProspectDrawer }         from '../components/driver-acquisition/ProspectDrawer'
import { STAGE_STYLES, STAGE_DOTS, STAGES, PRIORITIES, SOURCES } from '../components/driver-acquisition/constants'

// ── Filters ───────────────────────────────────────────────────────────────────

interface Filters {
  stage:    ProspectStage | ''
  priority: string
  source:   string
}

const DEFAULT_FILTERS: Filters = { stage: '', priority: '', source: '' }

// ── Summary tile ─────────────────────────────────────────────────────────────

function StageTile({ stage, count, active, onClick }: {
  stage: ProspectStage; count: number; active: boolean; onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      title={`Filter to ${stage}`}
      className={`flex items-center gap-2 px-3 h-8 rounded-lg border transition-colors text-left ${
        active
          ? STAGE_STYLES[stage]
          : 'bg-surface-700 border-surface-400 text-gray-500 hover:bg-surface-600'
      }`}
    >
      <span className={`w-2 h-2 rounded-full shrink-0 ${STAGE_DOTS[stage]}`} />
      <span className='text-lg font-semibold leading-none'>{count}</span>
      <span className='text-2xs'>{stage}</span>
    </button>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function DriverAcquisition() {
  const [prospects, setProspects]   = useState<DriverProspect[]>([])
  const [loading,   setLoading]     = useState(true)
  const [search,    setSearch]      = useState('')
  const [filters,   setFilters]     = useState<Filters>(DEFAULT_FILTERS)
  const [selected,  setSelected]    = useState<DriverProspect | null>(null)
  const [editP,     setEditP]       = useState<DriverProspect | null>(null)
  const [modal,     setModal]       = useState(false)

  const reload = async () => {
    setLoading(true)
    try   { setProspects(await window.api.driverProspects.list()) }
    finally { setLoading(false) }
  }

  useEffect(() => { reload() }, [])

  const handleSave = (saved: DriverProspect) => {
    setProspects(p =>
      p.some(x => x.id === saved.id) ? p.map(x => x.id === saved.id ? saved : x) : [saved, ...p]
    )
    if (selected?.id === saved.id) setSelected(saved)
    setModal(false); setEditP(null)
  }

  const handleDelete = async (p: DriverProspect) => {
    await window.api.driverProspects.delete(p.id)
    setProspects(prev => prev.filter(x => x.id !== p.id))
    if (selected?.id === p.id) setSelected(null)
  }

  const handleUpdate = (updated: DriverProspect) => {
    setProspects(p => p.map(x => x.id === updated.id ? updated : x))
    if (selected?.id === updated.id) setSelected(updated)
  }

  const handleStageChange = async (p: DriverProspect, stage: ProspectStage) => {
    const updated = await window.api.driverProspects.update(p.id, { stage })
    if (updated) {
      setProspects(prev => prev.map(x => x.id === updated.id ? updated : x))
      if (selected?.id === updated.id) setSelected(updated)
    }
  }

  const openEdit = (p: DriverProspect) => { setEditP(p); setModal(true) }
  const openAdd  = ()                    => { setEditP(null); setModal(true) }

  // ── Stage counts (from unfiltered data) ──────────────────────────────────
  const stageCounts = useMemo(() => {
    const counts: Partial<Record<ProspectStage, number>> = {}
    for (const p of prospects) counts[p.stage] = (counts[p.stage] ?? 0) + 1
    return counts
  }, [prospects])

  // ── Filtered list ─────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let r = prospects
    if (search) {
      const q = search.toLowerCase()
      r = r.filter(p =>
        p.name.toLowerCase().includes(q) ||
        (p.phone ?? '').includes(q) ||
        (p.city  ?? '').toLowerCase().includes(q) ||
        (p.state ?? '').toLowerCase().includes(q) ||
        (p.equipment_interest ?? '').toLowerCase().includes(q)
      )
    }
    if (filters.stage)    r = r.filter(p => p.stage    === filters.stage)
    if (filters.priority) r = r.filter(p => p.priority === filters.priority)
    if (filters.source)   r = r.filter(p => p.source   === filters.source)
    return r
  }, [prospects, search, filters])

  const activeCount  = useMemo(() => prospects.filter(p => p.stage !== 'Handed Off').length, [prospects])
  const signedCount  = useMemo(() => prospects.filter(p => p.stage === 'Signed' || p.stage === 'Handed Off').length, [prospects])
  const overdueCount = useMemo(() => {
    const today = new Date().toISOString().split('T')[0]
    return prospects.filter(p =>
      p.follow_up_date && p.follow_up_date < today && p.stage !== 'Handed Off'
    ).length
  }, [prospects])

  const isFiltered = filters.stage !== '' || filters.priority !== '' || filters.source !== '' || search !== ''

  return (
    <div className='space-y-4 max-w-[1600px] animate-fade-in'>
      {/* Page header */}
      <div className='flex items-start justify-between gap-4'>
        <div>
          <h1 className='text-xl font-semibold text-gray-100'>Driver Acquisition</h1>
          <p className='text-sm text-gray-500 mt-0.5'>Track driver candidates from first contact through signing</p>
        </div>
        <button
          onClick={openAdd}
          className='flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white text-sm font-medium rounded-lg transition-colors shrink-0'
        >
          <Plus size={15} /> Add Prospect
        </button>
      </div>

      {/* Summary bar */}
      <div className='flex items-center gap-2 flex-wrap'>
        {STAGES.map(stage => (
          <StageTile
            key={stage}
            stage={stage}
            count={stageCounts[stage] ?? 0}
            active={filters.stage === stage}
            onClick={() => setFilters(f => ({
              ...f,
              stage: f.stage === stage ? '' : stage,
            }))}
          />
        ))}
        <div className='ml-2 flex items-center gap-3 text-2xs text-gray-600 border-l border-surface-500 pl-3'>
          <span>{activeCount} active</span>
          {signedCount > 0 && <span className='text-emerald-600'>{signedCount} signed</span>}
          {overdueCount > 0 && <span className='text-red-500'>{overdueCount} overdue</span>}
        </div>
      </div>

      {/* Toolbar */}
      <div className='flex items-center gap-3 flex-wrap'>
        {/* Search */}
        <div className='relative flex-1 min-w-[200px] max-w-xs'>
          <Search size={13} className='absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none' />
          <input
            className='w-full bg-surface-700 border border-surface-500 rounded-lg pl-8 pr-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-orange-600/60'
            placeholder='Search prospects...'
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => setSearch('')} className='absolute right-2 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400'>
              <X size={12} />
            </button>
          )}
        </div>

        {/* Priority filter */}
        <select
          className='bg-surface-700 border border-surface-500 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-orange-600/60'
          value={filters.priority}
          onChange={e => setFilters(f => ({ ...f, priority: e.target.value }))}
        >
          <option value=''>All Priorities</option>
          {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
        </select>

        {/* Source filter */}
        <select
          className='bg-surface-700 border border-surface-500 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-orange-600/60'
          value={filters.source}
          onChange={e => setFilters(f => ({ ...f, source: e.target.value }))}
        >
          <option value=''>All Sources</option>
          {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        {isFiltered && (
          <button
            onClick={() => { setFilters(DEFAULT_FILTERS); setSearch('') }}
            className='flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 transition-colors'
          >
            <X size={12} /> Clear filters
          </button>
        )}

        <span className='text-2xs text-gray-700 ml-auto'>
          {loading ? '...' : `${filtered.length} of ${prospects.length}`}
        </span>
      </div>

      {/* Empty state */}
      {!loading && prospects.length === 0 && (
        <div className='flex flex-col items-center justify-center py-20 text-center'>
          <Users size={32} className='text-gray-700 mb-3' />
          <p className='text-gray-500 text-sm font-medium'>No driver prospects yet</p>
          <p className='text-gray-700 text-xs mt-1 max-w-xs'>
            Add your first prospect from a Facebook group, cold call, or referral to start building your driver pipeline.
          </p>
          <button
            onClick={openAdd}
            className='mt-4 px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white text-sm font-medium rounded-lg transition-colors'
          >
            Add First Prospect
          </button>
        </div>
      )}

      {/* Kanban */}
      {(loading || prospects.length > 0) && (
        <DriverAcquisitionKanban
          prospects={filtered}
          loading={loading}
          onSelect={setSelected}
          onStageChange={handleStageChange}
        />
      )}

      {/* Drawer */}
      {selected && (
        <ProspectDrawer
          prospect={selected}
          onClose={() => setSelected(null)}
          onEdit={openEdit}
          onDelete={handleDelete}
          onUpdate={handleUpdate}
          onStageChange={handleStageChange}
        />
      )}

      {/* Modal */}
      {modal && (
        <ProspectModal
          prospect={editP}
          onClose={() => { setModal(false); setEditP(null) }}
          onSave={handleSave}
        />
      )}
    </div>
  )
}
