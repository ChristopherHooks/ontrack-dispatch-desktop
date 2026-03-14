import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import type { Invoice, Driver } from '../../types/models'
import { INVOICE_STATUS_STYLES } from './constants'

interface Props {
  invoices: Invoice[]; drivers: Driver[]; loading: boolean
  sortKey: keyof Invoice; sortDir: 'asc' | 'desc'
  onSort: (k: keyof Invoice) => void
  onSelect: (inv: Invoice) => void
}

const COLS: { key: keyof Invoice; label: string; w: string }[] = [
  { key: 'invoice_number', label: 'Invoice #',  w: 'w-32' },
  { key: 'driver_id',      label: 'Driver',      w: 'w-36' },
  { key: 'week_ending',    label: 'Week Ending', w: 'w-28' },
  { key: 'driver_gross',   label: 'Gross',       w: 'w-24' },
  { key: 'dispatch_pct',   label: 'Disp %',      w: 'w-16' },
  { key: 'dispatch_fee',   label: 'Fee Earned',  w: 'w-24' },
  { key: 'status',         label: 'Status',      w: 'w-20' },
  { key: 'sent_date',      label: 'Sent',        w: 'w-24' },
  { key: 'paid_date',      label: 'Paid',        w: 'w-24' },
]

const fmt = (d: string | null) => { if (!d) return '---'; const [y,m,day] = d.split('-'); return `${m}/${day}/${y}` }
function Sk() { return <div className='h-4 bg-surface-600 rounded animate-pulse' /> }
function SI({ col, sk, sd }: { col: keyof Invoice; sk: keyof Invoice; sd: string }) {
  if (col !== sk) return <ChevronsUpDown size={10} className='opacity-30' />
  return sd === 'asc' ? <ChevronUp size={10} className='text-orange-400' /> : <ChevronDown size={10} className='text-orange-400' />
}

const OVERDUE_MS = 30 * 24 * 60 * 60 * 1000
function effectiveStatus(inv: Invoice) {
  if (inv.status === 'Sent' && inv.sent_date && Date.now() - new Date(inv.sent_date).getTime() > OVERDUE_MS) return 'Overdue'
  return inv.status
}

export function InvoicesTable({ invoices, drivers, loading, sortKey, sortDir, onSort, onSelect }: Props) {
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
          </tr>
        </thead>
        <tbody>
          {loading
            ? Array.from({ length: 5 }, (_, i) => (
              <tr key={i} className='border-b border-surface-600'>
                {COLS.map(c => <td key={c.key} className='px-3 py-2.5'><Sk /></td>)}
              </tr>
            ))
            : invoices.length === 0
              ? <tr><td colSpan={COLS.length} className='text-center py-16 text-sm text-gray-600'>No invoices yet. Generate an invoice from a completed load.</td></tr>
              : invoices.map(inv => {
                const driver = drivers.find(d => d.id === inv.driver_id)
                const status = effectiveStatus(inv)
                return (
                  <tr key={inv.id} onClick={() => onSelect(inv)}
                    className='group border-b border-surface-600 hover:bg-surface-700/50 cursor-pointer transition-colors'>
                    <td className='px-3 py-2.5 font-mono text-gray-200 text-2xs'>{inv.invoice_number}</td>
                    <td className='px-3 py-2.5 text-gray-300'>{driver?.name ?? <span className='text-gray-600'>---</span>}</td>
                    <td className='px-3 py-2.5 text-gray-400'>{fmt(inv.week_ending)}</td>
                    <td className='px-3 py-2.5 font-mono text-gray-200'>{inv.driver_gross != null ? `$${inv.driver_gross.toLocaleString()}` : '---'}</td>
                    <td className='px-3 py-2.5 text-gray-400'>{inv.dispatch_pct != null ? `${inv.dispatch_pct}%` : '---'}</td>
                    <td className='px-3 py-2.5 font-mono text-green-400 font-semibold'>{inv.dispatch_fee != null ? `$${inv.dispatch_fee.toFixed(2)}` : '---'}</td>
                    <td className='px-3 py-2.5'>
                      <span className={`text-2xs px-2 py-0.5 rounded-full border ${INVOICE_STATUS_STYLES[status]}`}>{status}</span>
                    </td>
                    <td className='px-3 py-2.5 text-gray-400'>{fmt(inv.sent_date)}</td>
                    <td className='px-3 py-2.5 text-gray-400'>{fmt(inv.paid_date)}</td>
                  </tr>
                )
              })
          }
        </tbody>
      </table>
    </div>
  )
}
