import { Search, LayoutList, Columns, Plus, SlidersHorizontal, X, Upload } from 'lucide-react'
import type { LeadStatus, LeadPriority } from '../../types/models'
import { STATUSES, PRIORITIES, LEAD_SOURCES } from './constants'

export interface LeadFilters {
  status:        LeadStatus | ''
  priority:      LeadPriority | ''
  source:        string
  overdue:       boolean
  followUpToday: boolean  // follow_up_date = today
  warm:          boolean  // status in [Interested, Call Back Later]
  untouched:     boolean  // status = New AND contact_attempt_count = 0
}

export const DEFAULT_FILTERS: LeadFilters = {
  status: '', priority: '', source: '', overdue: false,
  followUpToday: false, warm: false, untouched: false,
}

interface Props {
  search:          string
  onSearch:        (v: string) => void
  filters:         LeadFilters
  onFilters:       (f: LeadFilters) => void
  view:            'table' | 'kanban'
  onView:          (v: 'table' | 'kanban') => void
  total:           number
  onAdd:           () => void
  onImport:        () => void
  importBusy:      boolean
  lastImportAt:    string | null
  onImportCsv:     () => void
  csvImportBusy:   boolean
  onPaste:         () => void
}

const selCls =
  'h-7 px-2 bg-surface-600 border border-surface-400 rounded text-xs text-gray-300 ' +
  'focus:outline-none focus:border-orange-600/60 cursor-pointer'

function QuickChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`h-7 px-2.5 rounded text-xs font-medium border transition-colors ${
        active
          ? 'bg-orange-600/20 border-orange-600/50 text-orange-300'
          : 'bg-surface-600 border-surface-400 text-gray-500 hover:text-gray-300 hover:border-surface-300'
      }`}
    >
      {label}
    </button>
  )
}

export function LeadsToolbar({
  search, onSearch, filters, onFilters, view, onView, total, onAdd,
  onImport, importBusy, lastImportAt,
  onImportCsv, csvImportBusy,
  onPaste,
}: Props) {
  const hasFilters =
    filters.status !== '' || filters.priority !== '' ||
    filters.source !== '' || filters.overdue ||
    filters.followUpToday || filters.warm || filters.untouched

  const toggle = (key: 'followUpToday' | 'warm' | 'untouched') => {
    onFilters({ ...filters, [key]: !filters[key] })
  }

  return (
    <div className='flex flex-col gap-3'>

      {/* ── Row 1: search · count · spacer · view toggle · import · add ── */}
      <div className='flex items-center gap-3'>

        {/* Search */}
        <div className='relative flex-1 max-w-sm'>
          <Search size={13} className='absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none' />
          <input
            type='text'
            value={search}
            onChange={e => onSearch(e.target.value)}
            placeholder='Search leads…'
            className='w-full pl-9 pr-8 h-8 bg-surface-600 border border-surface-400 rounded-lg text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-orange-600/60 focus:ring-1 focus:ring-orange-600/20 transition-colors'
          />
          {search && (
            <button
              onClick={() => onSearch('')}
              className='absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300'
            >
              <X size={12} />
            </button>
          )}
        </div>

        <span className='text-2xs text-gray-600 whitespace-nowrap'>
          {total} lead{total !== 1 ? 's' : ''}
        </span>

        <div className='flex-1' />

        {/* View toggle */}
        <div className='flex items-center bg-surface-600 border border-surface-400 rounded-lg p-0.5 gap-0.5'>
          <button
            onClick={() => onView('table')}
            className={`flex items-center gap-1.5 px-2.5 h-6 rounded text-xs font-medium transition-colors ${
              view === 'table'
                ? 'bg-surface-400 text-orange-400'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <LayoutList size={12} /> Table
          </button>
          <button
            onClick={() => onView('kanban')}
            className={`flex items-center gap-1.5 px-2.5 h-6 rounded text-xs font-medium transition-colors ${
              view === 'kanban'
                ? 'bg-surface-400 text-orange-400'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <Columns size={12} /> Board
          </button>
        </div>

        {/* Paste from spreadsheet */}
        <button
          onClick={onPaste}
          title='Paste rows from Excel or Google Sheets'
          className='flex items-center gap-1.5 px-3 h-8 rounded-lg text-xs font-medium border border-surface-400 bg-surface-600 hover:bg-surface-500 hover:border-orange-600/40 text-gray-300 transition-colors'
        >
          <Upload size={12} /> Paste Data
        </button>

        {/* CSV import */}
        <button
          onClick={onImportCsv}
          disabled={csvImportBusy}
          title='Import leads from a CSV file'
          className='flex items-center gap-1.5 px-3 h-8 rounded-lg text-xs font-medium border border-surface-400 bg-surface-600 hover:bg-surface-500 hover:border-orange-600/40 text-gray-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors'
        >
          {csvImportBusy
            ? <><svg className='animate-spin h-3 w-3' viewBox='0 0 24 24' fill='none'><circle className='opacity-25' cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='4' /><path className='opacity-75' fill='currentColor' d='M4 12a8 8 0 018-8v8z' /></svg> Importing…</>
            : <><Upload size={12} /> Import CSV</>
          }
        </button>

        {/* FMCSA import */}
        <button
          onClick={onImport}
          disabled={importBusy}
          title={lastImportAt ? `Last import: ${new Date(lastImportAt).toLocaleString()}` : 'Import leads from FMCSA'}
          className='flex items-center gap-1.5 px-3 h-8 rounded-lg text-xs font-medium border border-surface-400 bg-surface-600 hover:bg-surface-500 hover:border-orange-600/40 text-gray-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors'
        >
          {importBusy
            ? <><svg className='animate-spin h-3 w-3' viewBox='0 0 24 24' fill='none'><circle className='opacity-25' cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='4' /><path className='opacity-75' fill='currentColor' d='M4 12a8 8 0 018-8v8z' /></svg> Importing…</>
            : <><Upload size={12} /> FMCSA Import</>
          }
        </button>

        {/* Add lead */}
        <button
          onClick={onAdd}
          className='flex items-center gap-1.5 px-3 h-8 rounded-lg text-xs font-semibold bg-orange-600 hover:bg-orange-500 active:bg-orange-700 text-white transition-colors shadow-glow-orange'
        >
          <Plus size={13} /> Add Lead
        </button>
      </div>

      {/* ── Row 2: quick chips + dropdown filters ── */}
      <div className='flex items-center gap-2 flex-wrap'>
        <SlidersHorizontal size={12} className='text-gray-600 shrink-0' />

        {/* Quick filter chips */}
        <QuickChip label='Due Today'   active={filters.followUpToday} onClick={() => toggle('followUpToday')} />
        <QuickChip label='Warm'        active={filters.warm}          onClick={() => toggle('warm')} />
        <QuickChip label='Untouched'   active={filters.untouched}     onClick={() => toggle('untouched')} />

        <div className='w-px h-4 bg-surface-500 mx-0.5' />

        <select
          value={filters.status}
          onChange={e => onFilters({ ...filters, status: e.target.value as LeadStatus | '' })}
          className={selCls}
        >
          <option value=''>All Statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        <select
          value={filters.priority}
          onChange={e => onFilters({ ...filters, priority: e.target.value as LeadPriority | '' })}
          className={selCls}
        >
          <option value=''>All Priorities</option>
          {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
        </select>

        <select
          value={filters.source}
          onChange={e => onFilters({ ...filters, source: e.target.value })}
          className={selCls}
        >
          <option value=''>All Sources</option>
          {LEAD_SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        <label className='flex items-center gap-1.5 cursor-pointer select-none'>
          <input
            type='checkbox'
            checked={filters.overdue}
            onChange={e => onFilters({ ...filters, overdue: e.target.checked })}
            className='w-3 h-3 rounded accent-orange-500'
          />
          <span className='text-xs text-gray-500'>Overdue only</span>
        </label>

        {hasFilters && (
          <button
            onClick={() => onFilters(DEFAULT_FILTERS)}
            className='flex items-center gap-1 text-2xs text-orange-400 hover:text-orange-300 transition-colors ml-1'
          >
            <X size={10} /> Clear
          </button>
        )}
      </div>
    </div>
  )
}
