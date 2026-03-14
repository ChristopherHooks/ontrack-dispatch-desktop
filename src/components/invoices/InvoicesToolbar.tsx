import { Search, X, FileText, Plus } from 'lucide-react'
import { INVOICE_STATUSES } from './constants'

export interface InvoiceFilters { status: string }

interface Props {
  search: string; onSearch: (v: string) => void
  filters: InvoiceFilters; onFilter: (f: InvoiceFilters) => void
  count: number; totalOutstanding: number; onGenerate: () => void
}

export function InvoicesToolbar({ search, onSearch, filters, onFilter, count, totalOutstanding, onGenerate }: Props) {
  return (
    <div className='flex items-center gap-2 px-4 py-3 border-b border-surface-600 bg-surface-800 shrink-0 flex-wrap'>
      <FileText size={15} className='text-gray-600 shrink-0' />
      <span className='text-sm font-semibold text-gray-300 mr-1'>Invoices</span>
      <span className='text-2xs text-gray-600 bg-surface-600 px-2 py-0.5 rounded-full'>{count}</span>
      {totalOutstanding > 0 && (
        <span className='text-2xs font-mono text-orange-400 bg-orange-900/20 border border-orange-800/30 px-2 py-0.5 rounded-full'>
          ${totalOutstanding.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} outstanding
        </span>
      )}
      <div className='flex-1' />
      <div className='relative'>
        <Search size={12} className='absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none' />
        <input value={search} onChange={e => onSearch(e.target.value)} placeholder='Search invoices...'
          className='h-8 w-52 pl-8 pr-6 bg-surface-600 border border-surface-400 rounded-lg text-xs text-gray-300 placeholder-gray-600 focus:outline-none focus:border-orange-600/50' />
        {search && <button onClick={() => onSearch('')} className='absolute right-2 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400'><X size={10} /></button>}
      </div>
      <select value={filters.status} onChange={e => onFilter({ ...filters, status: e.target.value })}
        className='h-8 px-2 bg-surface-600 border border-surface-400 rounded-lg text-xs text-gray-400 focus:outline-none'>
        <option value=''>All Status</option>
        {INVOICE_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
      </select>
      <button onClick={onGenerate}
        className='flex items-center gap-1.5 h-8 px-3 text-xs font-semibold bg-orange-600 hover:bg-orange-500 text-white rounded-lg transition-colors'>
        <Plus size={12} />Generate Invoice
      </button>
    </div>
  )
}
