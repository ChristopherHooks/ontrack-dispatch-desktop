import { ChevronUp, ChevronDown, ChevronsUpDown, Send, CheckCircle, Mail } from 'lucide-react'
import type { Invoice, InvoiceStatus, Driver } from '../../types/models'
import { INVOICE_STATUS_STYLES } from './constants'

interface Props {
  invoices: Invoice[]; drivers: Driver[]; loading: boolean
  sortKey: keyof Invoice; sortDir: 'asc' | 'desc'
  onSort: (k: keyof Invoice) => void
  onSelect: (inv: Invoice) => void
  selectedIds?: Set<number>
  onToggle?: (id: number) => void
  onToggleAll?: (ids: number[]) => void
  onStatusChange?: (inv: Invoice, status: InvoiceStatus) => void
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

function daysBetween(from: string, to: string): number {
  return Math.round((new Date(to).getTime() - new Date(from).getTime()) / 86400000)
}
function agingLabel(inv: Invoice, status: string): { text: string; cls: string } | null {
  const today = new Date().toISOString().split('T')[0]
  if ((status === 'Sent' || status === 'Overdue') && inv.sent_date) {
    const d = daysBetween(inv.sent_date, today)
    if (status === 'Overdue') return { text: `${d - 30}d past due`, cls: 'text-red-400' }
    return { text: `${d}d since sent`, cls: 'text-yellow-500' }
  }
  if (status === 'Paid' && inv.sent_date && inv.paid_date) {
    const d = daysBetween(inv.sent_date, inv.paid_date)
    const cls = d <= 7 ? 'text-green-400' : d <= 21 ? 'text-yellow-500' : 'text-gray-500'
    return { text: `paid in ${d}d`, cls }
  }
  return null
}

export function InvoicesTable({ invoices, drivers, loading, sortKey, sortDir, onSort, onSelect, selectedIds, onToggle, onToggleAll, onStatusChange }: Props) {
  const allChecked = invoices.length > 0 && invoices.every(inv => selectedIds?.has(inv.id))
  const colSpanTotal = COLS.length + 1
  return (
    <div className='flex-1 overflow-auto'>
      <table className='w-full text-xs border-collapse'>
        <thead className='sticky top-0 bg-surface-800 z-10'>
          <tr className='border-b border-surface-500'>
            <th className='w-8 px-3 py-2.5'>
              <input type='checkbox' checked={allChecked} onChange={() => onToggleAll?.(invoices.map(i => i.id))}
                className='w-3 h-3 rounded accent-orange-500 cursor-pointer' />
            </th>
            {COLS.map(c => (
              <th key={c.key} onClick={() => onSort(c.key)}
                className={`${c.w} px-3 py-2.5 text-left text-2xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:text-gray-300 transition-colors`}>
                <div className='flex items-center gap-1'>{c.label}<SI col={c.key} sk={sortKey} sd={sortDir} /></div>
              </th>
            ))}
            <th className='w-24 px-3 py-2.5' />
          </tr>
        </thead>
        <tbody>
          {loading
            ? Array.from({ length: 5 }, (_, i) => (
              <tr key={i} className='border-b border-surface-600'>
                <td className='px-3 py-2.5'><Sk /></td>
                {COLS.map(c => <td key={c.key} className='px-3 py-2.5'><Sk /></td>)}
              </tr>
            ))
            : invoices.length === 0
              ? <tr><td colSpan={colSpanTotal} className='text-center py-16 text-sm text-gray-600'>No invoices yet. Generate an invoice from a completed load.</td></tr>
              : invoices.map(inv => {
                const driver  = drivers.find(d => d.id === inv.driver_id)
                const status  = effectiveStatus(inv)
                const aging   = agingLabel(inv, status)
                const checked = selectedIds?.has(inv.id) ?? false
                return (
                  <tr key={inv.id}
                    className={`group border-b border-surface-600 hover:bg-surface-700/50 cursor-pointer transition-colors ${checked ? 'bg-orange-900/10' : ''}`}>
                    <td className='px-3 py-2.5' onClick={e => { e.stopPropagation(); onToggle?.(inv.id) }}>
                      <input type='checkbox' checked={checked} onChange={() => onToggle?.(inv.id)}
                        className='w-3 h-3 rounded accent-orange-500 cursor-pointer' />
                    </td>
                    <td className='px-3 py-2.5 font-mono text-gray-200 text-2xs' onClick={() => onSelect(inv)}>{inv.invoice_number}</td>
                    <td className='px-3 py-2.5 text-gray-300' onClick={() => onSelect(inv)}>{driver?.name ?? <span className='text-gray-600'>---</span>}</td>
                    <td className='px-3 py-2.5 text-gray-400' onClick={() => onSelect(inv)}>{fmt(inv.week_ending)}</td>
                    <td className='px-3 py-2.5 font-mono text-gray-200' onClick={() => onSelect(inv)}>{inv.driver_gross != null ? `$${inv.driver_gross.toLocaleString()}` : '---'}</td>
                    <td className='px-3 py-2.5 text-gray-400' onClick={() => onSelect(inv)}>{inv.dispatch_pct != null ? `${inv.dispatch_pct}%` : '---'}</td>
                    <td className='px-3 py-2.5 font-mono text-green-400 font-semibold' onClick={() => onSelect(inv)}>{inv.dispatch_fee != null ? `$${inv.dispatch_fee.toFixed(2)}` : '---'}</td>
                    <td className='px-3 py-2.5' onClick={() => onSelect(inv)}>
                      <span className={`text-2xs px-2 py-0.5 rounded-full border ${INVOICE_STATUS_STYLES[status]}`}>{status}</span>
                      {aging && <p className={`text-2xs mt-0.5 ${aging.cls}`}>{aging.text}</p>}
                    </td>
                    <td className='px-3 py-2.5 text-gray-400' onClick={() => onSelect(inv)}>{fmt(inv.sent_date)}</td>
                    <td className='px-3 py-2.5 text-gray-400' onClick={() => onSelect(inv)}>{fmt(inv.paid_date)}</td>
                    <td className='px-3 py-2.5' onClick={e => e.stopPropagation()}>
                      {onStatusChange && (
                        <div className='flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity'>
                          {inv.status === 'Draft' && (
                            <button
                              onClick={() => onStatusChange(inv, 'Sent')}
                              title='Mark Sent'
                              className='flex items-center gap-1 px-2 h-6 text-2xs font-medium bg-blue-800 hover:bg-blue-700 text-blue-200 rounded-md transition-colors'>
                              <Send size={9}/>Sent
                            </button>
                          )}
                          {(inv.status === 'Sent' || inv.status === 'Overdue') && (
                            <button
                              onClick={() => onStatusChange(inv, 'Paid')}
                              title='Mark Paid'
                              className='flex items-center gap-1 px-2 h-6 text-2xs font-medium bg-green-800 hover:bg-green-700 text-green-200 rounded-md transition-colors'>
                              <CheckCircle size={9}/>Paid
                            </button>
                          )}
                          {(inv.status === 'Sent' || inv.status === 'Overdue') && (
                            <button
                              onClick={() => onSelect(inv)}
                              title='Open follow-up tools'
                              className='p-1 rounded-md hover:bg-surface-500 text-gray-600 hover:text-orange-400 transition-colors'>
                              <Mail size={11}/>
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })
          }
        </tbody>
      </table>
    </div>
  )
}
