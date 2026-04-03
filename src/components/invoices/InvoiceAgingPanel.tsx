import { useMemo } from 'react'
import { AlertTriangle, Clock, CheckCircle2, DollarSign } from 'lucide-react'
import type { Invoice, Driver, Broker } from '../../types/models'

interface Props {
  invoices: Invoice[]
  drivers:  Driver[]
  brokers:  Broker[]
  onSelect: (inv: Invoice) => void
}

interface AgeBucket {
  label:    string
  min:      number
  max:      number | null
  color:    string
  headerCls: string
  icon:     React.ReactNode
}

const BUCKETS: AgeBucket[] = [
  {
    label: 'Current (0-30 days)',
    min: 0, max: 30,
    color: 'border-green-700/40 bg-green-900/10',
    headerCls: 'text-green-400',
    icon: <CheckCircle2 size={13} className='text-green-400' />,
  },
  {
    label: '31–60 days',
    min: 31, max: 60,
    color: 'border-yellow-700/40 bg-yellow-900/10',
    headerCls: 'text-yellow-400',
    icon: <Clock size={13} className='text-yellow-400' />,
  },
  {
    label: '61–90 days',
    min: 61, max: 90,
    color: 'border-orange-700/40 bg-orange-900/10',
    headerCls: 'text-orange-400',
    icon: <AlertTriangle size={13} className='text-orange-400' />,
  },
  {
    label: '90+ days',
    min: 91, max: null,
    color: 'border-red-700/40 bg-red-900/10',
    headerCls: 'text-red-400',
    icon: <AlertTriangle size={13} className='text-red-400' />,
  },
]

const fmt = (n: number) =>
  '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const fmtDate = (d: string | null) => {
  if (!d) return '—'
  const [y, m, day] = d.split('-')
  return `${m}/${day}/${y}`
}

export function InvoiceAgingPanel({ invoices, drivers, brokers, onSelect }: Props) {
  const todayMs = useMemo(() => new Date().setHours(0, 0, 0, 0), [])

  const outstanding = useMemo(
    () => invoices.filter(i => i.status === 'Sent' || i.status === 'Overdue'),
    [invoices]
  )

  const withAge = useMemo(() =>
    outstanding.map(inv => {
      const base = inv.sent_date ?? inv.created_at.slice(0, 10)
      const days = Math.floor((todayMs - new Date(base).setHours(0, 0, 0, 0)) / 86_400_000)
      return { inv, days }
    }).sort((a, b) => b.days - a.days),
    [outstanding, todayMs]
  )

  const driverMap = useMemo(() => new Map(drivers.map(d => [d.id, d.name])), [drivers])
  const brokerMap = useMemo(() => new Map(brokers.map(b => [b.id, b.name])), [brokers])

  const totalOutstanding = outstanding.reduce((s, i) => s + (i.dispatch_fee ?? 0), 0)
  const totalOverdue90   = withAge.filter(r => r.days > 90).reduce((s, r) => s + (r.inv.dispatch_fee ?? 0), 0)

  if (outstanding.length === 0) {
    return (
      <div className='flex flex-col items-center justify-center h-48 text-gray-600'>
        <CheckCircle2 size={28} className='text-green-500 mb-2' />
        <p className='text-sm'>No outstanding invoices — all clear.</p>
      </div>
    )
  }

  return (
    <div className='space-y-5'>
      {/* Summary bar */}
      <div className='grid grid-cols-4 gap-3'>
        <div className='bg-surface-700 border border-surface-500 rounded-xl px-4 py-3'>
          <p className='text-2xs text-gray-500 uppercase tracking-wide mb-1'>Total Outstanding</p>
          <p className='text-lg font-semibold text-gray-100 font-mono'>{fmt(totalOutstanding)}</p>
          <p className='text-2xs text-gray-600 mt-0.5'>{outstanding.length} invoice{outstanding.length !== 1 ? 's' : ''}</p>
        </div>
        {BUCKETS.slice(1).map(b => {
          const items = withAge.filter(r => r.days >= b.min && (b.max == null || r.days <= b.max))
          const total = items.reduce((s, r) => s + (r.inv.dispatch_fee ?? 0), 0)
          return (
            <div key={b.label} className={`rounded-xl border px-4 py-3 ${b.color}`}>
              <p className={`text-2xs uppercase tracking-wide mb-1 ${b.headerCls}`}>{b.label}</p>
              <p className={`text-lg font-semibold font-mono ${b.headerCls}`}>{fmt(total)}</p>
              <p className='text-2xs text-gray-600 mt-0.5'>{items.length} invoice{items.length !== 1 ? 's' : ''}</p>
            </div>
          )
        })}
      </div>

      {totalOverdue90 > 0 && (
        <div className='flex items-start gap-2.5 px-4 py-3 rounded-xl border border-red-700/40 bg-red-900/10'>
          <AlertTriangle size={13} className='text-red-400 mt-0.5 shrink-0' />
          <p className='text-xs text-red-300'>
            <strong>{fmt(totalOverdue90)}</strong> is more than 90 days old. Consider escalating collections or flagging these brokers.
          </p>
        </div>
      )}

      {/* Per-bucket tables */}
      {BUCKETS.map(bucket => {
        const items = withAge.filter(r =>
          r.days >= bucket.min && (bucket.max == null || r.days <= bucket.max)
        )
        if (items.length === 0) return null
        return (
          <div key={bucket.label}>
            <div className={`flex items-center gap-2 mb-2`}>
              {bucket.icon}
              <h3 className={`text-xs font-semibold uppercase tracking-wide ${bucket.headerCls}`}>
                {bucket.label}
              </h3>
              <span className='text-2xs text-gray-600'>
                {fmt(items.reduce((s, r) => s + (r.inv.dispatch_fee ?? 0), 0))}
              </span>
            </div>
            <div className='rounded-xl border border-surface-500 overflow-hidden'>
              <table className='w-full text-xs'>
                <thead>
                  <tr className='bg-surface-700 text-gray-500 uppercase tracking-wide text-2xs'>
                    <th className='text-left px-3 py-2'>Invoice</th>
                    <th className='text-left px-3 py-2'>Driver</th>
                    <th className='text-left px-3 py-2'>Broker</th>
                    <th className='text-right px-3 py-2'>Amount</th>
                    <th className='text-right px-3 py-2'>Sent</th>
                    <th className='text-right px-3 py-2'>Age</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(({ inv, days }) => (
                    <tr
                      key={inv.id}
                      onClick={() => onSelect(inv)}
                      className='border-t border-surface-600 hover:bg-surface-600/50 cursor-pointer transition-colors'
                    >
                      <td className='px-3 py-2 text-orange-400 font-mono'>{inv.invoice_number}</td>
                      <td className='px-3 py-2 text-gray-300'>{inv.driver_id ? driverMap.get(inv.driver_id) ?? '—' : '—'}</td>
                      <td className='px-3 py-2 text-gray-400'>{inv.broker_id ? brokerMap.get(inv.broker_id) ?? '—' : '—'}</td>
                      <td className='px-3 py-2 text-right font-mono text-gray-200'>
                        {inv.dispatch_fee != null ? fmt(inv.dispatch_fee) : '—'}
                      </td>
                      <td className='px-3 py-2 text-right text-gray-500'>{fmtDate(inv.sent_date)}</td>
                      <td className={`px-3 py-2 text-right font-semibold ${
                        days > 90 ? 'text-red-400' : days > 60 ? 'text-orange-400' : days > 30 ? 'text-yellow-400' : 'text-green-400'
                      }`}>
                        {days}d
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      })}
    </div>
  )
}
