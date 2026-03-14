import { ChevronUp, ChevronDown, ChevronsUpDown, Edit2, Trash2 } from 'lucide-react'
import type { Broker } from '../../types/models'
import { FLAG_STYLES } from './constants'

interface Props {
  brokers: Broker[]; loading: boolean
  sortKey: keyof Broker; sortDir: 'asc' | 'desc'
  onSort: (k: keyof Broker) => void
  onSelect: (b: Broker) => void
  onEdit: (b: Broker) => void
  onDelete: (b: Broker) => void
}

const COLS: { key: keyof Broker; label: string; w: string }[] = [
  { key: 'name',          label: 'Broker',       w: 'w-44' },
  { key: 'mc_number',     label: 'MC #',          w: 'w-24' },
  { key: 'phone',         label: 'Phone',         w: 'w-32' },
  { key: 'email',         label: 'Email',         w: 'w-44' },
  { key: 'payment_terms', label: 'Terms',         w: 'w-20' },
  { key: 'credit_rating', label: 'Credit',        w: 'w-16' },
  { key: 'avg_days_pay',  label: 'Avg Days Pay',  w: 'w-28' },
  { key: 'flag',          label: 'Flag',          w: 'w-28' },
]

function Sk() { return <div className='h-4 bg-surface-600 rounded animate-pulse' /> }

function SI({ col, sk, sd }: { col: keyof Broker; sk: keyof Broker; sd: string }) {
  if (col !== sk) return <ChevronsUpDown size={10} className='opacity-30' />
  return sd === 'asc' ? <ChevronUp size={10} className='text-orange-400' /> : <ChevronDown size={10} className='text-orange-400' />
}

export function BrokersTable({ brokers, loading, sortKey, sortDir, onSort, onSelect, onEdit, onDelete }: Props) {
  return (
    <div className='flex-1 overflow-auto'>
      <table className='w-full text-xs border-collapse'>
        <thead className='sticky top-0 bg-surface-800 z-10'>
          <tr className='border-b border-surface-500'>
            {COLS.map(c => (
              <th key={c.key} onClick={() => onSort(c.key)}
                className={`${c.w} px-3 py-2.5 text-left text-2xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:text-gray-300 transition-colors`}>
                <div className='flex items-center gap-1'>{c.label}<SI col={c.key} sk={sortKey} sd={sortDir} /></div>
              </th>
            ))}
            <th className='w-16 px-3 py-2.5' />
          </tr>
        </thead>
        <tbody>
          {loading
            ? Array.from({ length: 6 }, (_, i) => (
              <tr key={i} className='border-b border-surface-600'>
                {COLS.map(c => <td key={c.key} className='px-3 py-2.5'><Sk /></td>)}
                <td className='px-3 py-2.5' />
              </tr>
            ))
            : brokers.length === 0
              ? <tr><td colSpan={COLS.length + 1} className='text-center py-16 text-sm text-gray-600'>No brokers yet. Add your first broker to get started.</td></tr>
              : brokers.map(b => (
                <tr key={b.id} onClick={() => onSelect(b)}
                  className='group border-b border-surface-600 hover:bg-surface-700/50 cursor-pointer transition-colors'>
                  <td className='px-3 py-2.5 font-medium text-gray-200'>{b.name}</td>
                  <td className='px-3 py-2.5 font-mono text-gray-400 text-2xs'>{b.mc_number ?? '---'}</td>
                  <td className='px-3 py-2.5 text-gray-400'>{b.phone ?? '---'}</td>
                  <td className='px-3 py-2.5 text-gray-400 truncate max-w-[176px]'>{b.email ?? '---'}</td>
                  <td className='px-3 py-2.5 text-gray-300'>{b.payment_terms ? `Net ${b.payment_terms}` : '---'}</td>
                  <td className='px-3 py-2.5'>
                    <span className={
                      b.credit_rating === 'A+' || b.credit_rating === 'A' ? 'font-semibold text-green-400' :
                      b.credit_rating === 'B+' || b.credit_rating === 'B' ? 'font-semibold text-blue-400' :
                      b.credit_rating === 'C' ? 'text-yellow-400' : 'text-gray-500'
                    }>{b.credit_rating ?? '---'}</span>
                  </td>
                  <td className='px-3 py-2.5'>
                    {b.avg_days_pay != null
                      ? <span className={b.avg_days_pay > b.payment_terms + 5 ? 'text-red-400 font-semibold' : 'text-gray-300'}>{b.avg_days_pay}d</span>
                      : <span className='text-gray-600'>---</span>
                    }
                  </td>
                  <td className='px-3 py-2.5'>
                    {b.flag !== 'None'
                      ? <span className={`text-2xs px-2 py-0.5 rounded-full border ${FLAG_STYLES[b.flag]}`}>{b.flag}</span>
                      : <span className='text-gray-700'>---</span>
                    }
                  </td>
                  <td className='px-3 py-2.5'>
                    <div className='flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity'>
                      <button onClick={e => { e.stopPropagation(); onEdit(b) }} className='p-1 rounded hover:bg-surface-600 text-gray-600 hover:text-orange-400'><Edit2 size={11} /></button>
                      <button onClick={e => { e.stopPropagation(); onDelete(b) }} className='p-1 rounded hover:bg-surface-600 text-gray-600 hover:text-red-400'><Trash2 size={11} /></button>
                    </div>
                  </td>
                </tr>
              ))
          }
        </tbody>
      </table>
    </div>
  )
}
