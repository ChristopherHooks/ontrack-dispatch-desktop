import { Search, X, UserPlus, ChevronDown } from 'lucide-react'
import type { DriverStatus } from '../../types/models'
import { DRIVER_STATUSES } from './constants'

export interface DriverFilters { status: DriverStatus | '' }
interface Props {
  search: string; onSearch: (v: string) => void
  filters: DriverFilters; onFilters: (f: DriverFilters) => void
  total: number; onAdd: () => void
}
const sel = 'h-8 px-3 pr-7 text-xs bg-surface-600 border border-surface-400 rounded-lg text-gray-300 focus:outline-none focus:border-orange-600/50 appearance-none cursor-pointer hover:border-surface-300 transition-colors'

export function DriversToolbar({ search, onSearch, filters, onFilters, total, onAdd }: Props) {
  return (
    <div className='flex items-center gap-2 flex-wrap'>
      <div className='relative flex-1 min-w-48'>
        <Search size={13} className='absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none' />
        <input
          value={search} onChange={e => onSearch(e.target.value)} placeholder='Search drivers...'
          className='w-full h-8 pl-8 pr-8 text-xs bg-surface-600 border border-surface-400 rounded-lg text-gray-300 placeholder-gray-600 focus:outline-none focus:border-orange-600/50 transition-colors'
        />
        {search && (
          <button onClick={() => onSearch('')} className='absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400'><X size={12} /></button>
        )}
      </div>
      <div className='relative'>
        <select value={filters.status} onChange={e => onFilters({ ...filters, status: e.target.value as DriverStatus | '' })} className={sel}>
          <option value=''>All Statuses</option>
          {DRIVER_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <ChevronDown size={11} className='absolute right-2 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none' />
      </div>
      <span className='text-xs text-gray-600 whitespace-nowrap'>{total} driver{total !== 1 ? 's' : ''}</span>
      <button onClick={onAdd} className='flex items-center gap-1.5 h-8 px-3 text-xs rounded-lg font-medium transition-colors bg-orange-600 hover:bg-orange-500 text-white ml-auto'>
        <UserPlus size={13} /> Add Driver
      </button>
    </div>
  )
}
