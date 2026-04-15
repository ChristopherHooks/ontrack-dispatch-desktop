import { Search, X, Building2, Plus } from 'lucide-react'
import type { BrokerFlag } from '../../types/models'
import { BROKER_FLAGS } from './constants'

export interface BrokerFilters { flag: string; contact_type: string }

interface Props {
  search: string; onSearch: (v: string) => void
  filters: BrokerFilters; onFilter: (f: BrokerFilters) => void
  count: number; onAdd: () => void
}

export function BrokersToolbar({ search, onSearch, filters, onFilter, count, onAdd }: Props) {
  return (
    <div className='flex items-center gap-2 px-4 py-3 border-b border-surface-600 bg-surface-800 shrink-0 flex-wrap'>
      <Building2 size={15} className='text-gray-600 shrink-0' />
      <span className='text-sm font-semibold text-gray-300 mr-1'>Brokers</span>
      <span className='text-2xs text-gray-600 bg-surface-600 px-2 py-0.5 rounded-full'>{count}</span>
      <div className='flex-1' />
      <div className='relative'>
        <Search size={12} className='absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none' />
        <input value={search} onChange={e => onSearch(e.target.value)} placeholder='Search brokers...'
          className='h-8 w-52 pl-8 pr-6 bg-surface-600 border border-surface-400 rounded-lg text-xs text-gray-300 placeholder-gray-600 focus:outline-none focus:border-orange-600/50' />
        {search && <button onClick={() => onSearch('')} className='absolute right-2 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400'><X size={10} /></button>}
      </div>
      <select value={filters.contact_type} onChange={e => onFilter({ ...filters, contact_type: e.target.value })}
        className='h-8 px-2 bg-surface-600 border border-surface-400 rounded-lg text-xs text-gray-400 focus:outline-none'>
        <option value=''>All Types</option>
        <option value='broker'>Broker</option>
        <option value='shipper'>Shipper</option>
      </select>
      <select value={filters.flag} onChange={e => onFilter({ ...filters, flag: e.target.value })}
        className='h-8 px-2 bg-surface-600 border border-surface-400 rounded-lg text-xs text-gray-400 focus:outline-none'>
        <option value=''>All Flags</option>
        {BROKER_FLAGS.map(f => <option key={f} value={f}>{f}</option>)}
      </select>
      <button onClick={onAdd}
        className='flex items-center gap-1.5 h-8 px-3 text-xs font-semibold bg-orange-600 hover:bg-orange-500 text-white rounded-lg transition-colors'>
        <Plus size={12} />Add Broker
      </button>
    </div>
  )
}
