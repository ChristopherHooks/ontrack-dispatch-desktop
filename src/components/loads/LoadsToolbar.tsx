import { Search, X, Plus, ChevronDown, LayoutGrid, List, CalendarDays, TrendingUp } from 'lucide-react'
import type { LoadStatus } from '../../types/models'
import { ALL_LOAD_STATUSES } from './constants'

export interface LoadFilters { status: LoadStatus | ''; load_mode: string }
export type LoadView = 'list' | 'board' | 'calendar'
interface Props {
  search: string; onSearch: (v: string) => void
  filters: LoadFilters; onFilters: (f: LoadFilters) => void
  view: LoadView; onView: (v: LoadView) => void
  total: number; onAdd: () => void
  onRateHistory: () => void
}
const sel = 'h-8 px-3 pr-7 text-xs bg-surface-600 border border-surface-400 rounded-lg text-gray-300 focus:outline-none focus:border-orange-600/50 appearance-none cursor-pointer hover:border-surface-300 transition-colors'

export function LoadsToolbar({ search, onSearch, filters, onFilters, view, onView, total, onAdd, onRateHistory }: Props) {
  return (
    <div className='flex items-center gap-2 flex-wrap'>
      <div className='relative flex-1 min-w-48'>
        <Search size={13} className='absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none' />
        <input
          value={search} onChange={e => onSearch(e.target.value)} placeholder='Search loads...'
          className='w-full h-8 pl-8 pr-8 text-xs bg-surface-600 border border-surface-400 rounded-lg text-gray-300 placeholder-gray-600 focus:outline-none focus:border-orange-600/50 transition-colors'
        />
        {search && (
          <button onClick={() => onSearch('')} className='absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400'><X size={12} /></button>
        )}
      </div>
      <div className='relative'>
        <select value={filters.load_mode} onChange={e => onFilters({ ...filters, load_mode: e.target.value })} className={sel}>
          <option value=''>All Modes</option>
          <option value='dispatch'>Dispatch</option>
          <option value='broker'>Broker</option>
        </select>
        <ChevronDown size={11} className='absolute right-2 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none' />
      </div>
      <div className='relative'>
        <select value={filters.status} onChange={e => onFilters({ ...filters, status: e.target.value as LoadStatus | '' })} className={sel}>
          <option value=''>All Statuses</option>
          {ALL_LOAD_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <ChevronDown size={11} className='absolute right-2 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none' />
      </div>
      <span className='text-xs text-gray-600 whitespace-nowrap'>{total} load{total !== 1 ? 's' : ''}</span>
      <div className='flex items-center rounded-lg border border-surface-400 overflow-hidden'>
        <button onClick={() => onView('list')} className={`h-8 px-2.5 text-xs flex items-center gap-1.5 transition-colors ${view === 'list' ? 'bg-surface-500 text-gray-200' : 'bg-surface-600 text-gray-500 hover:text-gray-300'}`}>
          <List size={13} /> Loads
        </button>
        <button onClick={() => onView('board')} className={`h-8 px-2.5 text-xs flex items-center gap-1.5 transition-colors border-l border-surface-400 ${view === 'board' ? 'bg-surface-500 text-gray-200' : 'bg-surface-600 text-gray-500 hover:text-gray-300'}`}>
          <LayoutGrid size={13} /> Dispatch
        </button>
        <button onClick={() => onView('calendar')} className={`h-8 px-2.5 text-xs flex items-center gap-1.5 transition-colors border-l border-surface-400 ${view === 'calendar' ? 'bg-surface-500 text-gray-200' : 'bg-surface-600 text-gray-500 hover:text-gray-300'}`}>
          <CalendarDays size={13} /> Calendar
        </button>
      </div>
      <button onClick={onRateHistory} title='Look up historical rates by lane'
        className='flex items-center gap-1.5 h-8 px-3 text-xs rounded-lg font-medium transition-colors bg-surface-600 hover:bg-surface-500 text-gray-300 border border-surface-400'>
        <TrendingUp size={13} /> Rate History
      </button>
      <button onClick={onAdd} className='flex items-center gap-1.5 h-8 px-3 text-xs rounded-lg font-medium transition-colors bg-orange-600 hover:bg-orange-500 text-white'>
        <Plus size={13} /> Add Load
      </button>
    </div>
  )
}
