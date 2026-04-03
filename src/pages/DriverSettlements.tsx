import { useState, useEffect, useMemo } from 'react'
import { FileText, Printer, ChevronDown } from 'lucide-react'
import type { Driver, Invoice, Load } from '../types/models'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const fmt = (n: number) =>
  '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const fmtDate = (d: string | null) => {
  if (!d) return '—'
  const [y, m, day] = d.split('-')
  return `${m}/${day}/${y}`
}

function monthOptions(): { value: string; label: string }[] {
  const opts = []
  const now = new Date()
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    opts.push({ value, label })
  }
  return opts
}

// ---------------------------------------------------------------------------

export function DriverSettlements() {
  const [drivers,  setDrivers]  = useState<Driver[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loads,    setLoads]    = useState<Load[]>([])
  const [loading,  setLoading]  = useState(true)

  const [driverId,    setDriverId]    = useState<number | ''>('')
  const [periodMonth, setPeriodMonth] = useState<string>(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })

  useEffect(() => {
    Promise.all([
      window.api.drivers.list(),
      window.api.invoices.list(),
      window.api.loads.list(),
    ]).then(([d, i, l]) => {
      setDrivers(d); setInvoices(i); setLoads(l)
      setLoading(false)
    })
  }, [])

  const months = useMemo(() => monthOptions(), [])

  const selectedDriver = drivers.find(d => d.id === driverId) ?? null

  // Invoices for the selected driver/period
  const periodInvoices = useMemo(() => {
    if (!driverId) return []
    return invoices.filter(inv => {
      if (inv.driver_id !== driverId) return false
      const dateKey = inv.paid_date ?? inv.week_ending ?? inv.sent_date ?? inv.created_at.slice(0, 10)
      return dateKey.startsWith(periodMonth)
    })
  }, [invoices, driverId, periodMonth])

  // Loads linked to those invoices
  const linkedLoadIds = useMemo(() =>
    new Set(periodInvoices.map(i => i.load_id).filter(Boolean)),
    [periodInvoices]
  )
  const periodLoads = useMemo(() =>
    loads.filter(l => linkedLoadIds.has(l.id)),
    [loads, linkedLoadIds]
  )

  const totalGross    = periodInvoices.reduce((s, i) => s + (i.driver_gross    ?? 0), 0)
  const totalFees     = periodInvoices.reduce((s, i) => s + (i.dispatch_fee    ?? 0), 0)
  const totalFactored = periodInvoices.reduce((s, i) => s + (i.factored_amount ?? 0), 0)
  const netToDriver   = totalGross - totalFees

  const monthLabel = months.find(m => m.value === periodMonth)?.label ?? periodMonth

  const handlePrint = () => window.print()

  const inp = 'bg-surface-700 border border-surface-500 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-orange-600/60'

  if (loading) {
    return <div className='flex items-center justify-center h-full text-gray-600 text-sm'>Loading...</div>
  }

  return (
    <div className='flex flex-col h-full'>
      {/* Toolbar */}
      <div className='px-5 py-3 border-b border-surface-600 flex items-center gap-4 shrink-0 print:hidden'>
        <FileText size={16} className='text-orange-400' />
        <h1 className='text-sm font-semibold text-gray-100'>Driver Pay Settlements</h1>
        <div className='flex items-center gap-3 ml-auto'>
          <select
            className={inp}
            value={driverId}
            onChange={e => setDriverId(e.target.value ? Number(e.target.value) : '')}
          >
            <option value=''>Select driver...</option>
            {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <select
            className={inp}
            value={periodMonth}
            onChange={e => setPeriodMonth(e.target.value)}
          >
            {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
          {selectedDriver && periodInvoices.length > 0 && (
            <button
              onClick={handlePrint}
              className='flex items-center gap-1.5 px-3 h-8 text-xs font-medium bg-orange-600 hover:bg-orange-500 text-white rounded-lg transition-colors'
            >
              <Printer size={12} />
              Print / Save PDF
            </button>
          )}
        </div>
      </div>

      <div className='flex-1 overflow-y-auto p-6'>
        {!selectedDriver ? (
          <div className='flex flex-col items-center justify-center h-48 text-gray-600'>
            <FileText size={28} className='mb-2' />
            <p className='text-sm'>Select a driver and period to generate their settlement.</p>
          </div>
        ) : (
          /* ── Settlement Sheet ── */
          <div className='max-w-3xl mx-auto'>
            {/* Header */}
            <div className='flex items-start justify-between mb-6 pb-5 border-b border-surface-600 print:border-gray-300'>
              <div>
                <h2 className='text-lg font-bold text-gray-100 print:text-black'>Driver Pay Settlement</h2>
                <p className='text-sm text-gray-400 mt-1 print:text-gray-600'>{monthLabel}</p>
              </div>
              <div className='text-right'>
                <p className='text-sm font-semibold text-gray-100 print:text-black'>OnTrack Hauling Solutions</p>
                <p className='text-xs text-gray-500 print:text-gray-600 mt-0.5'>
                  Generated {new Date().toLocaleDateString('en-US', { dateStyle: 'long' })}
                </p>
              </div>
            </div>

            {/* Driver info */}
            <div className='grid grid-cols-3 gap-4 mb-6 bg-surface-700/50 rounded-xl border border-surface-500 p-4 print:bg-gray-50 print:border-gray-200'>
              <div>
                <p className='text-2xs text-gray-500 uppercase tracking-wide'>Driver</p>
                <p className='text-sm font-semibold text-gray-100 mt-0.5 print:text-black'>{selectedDriver.name}</p>
                {selectedDriver.company && <p className='text-xs text-gray-500 print:text-gray-600'>{selectedDriver.company}</p>}
              </div>
              <div>
                <p className='text-2xs text-gray-500 uppercase tracking-wide'>MC #</p>
                <p className='text-sm text-gray-300 font-mono mt-0.5 print:text-black'>{selectedDriver.mc_number ?? '—'}</p>
              </div>
              <div>
                <p className='text-2xs text-gray-500 uppercase tracking-wide'>Dispatch %</p>
                <p className='text-sm text-gray-300 font-mono mt-0.5 print:text-black'>{selectedDriver.dispatch_percent ?? 7}%</p>
              </div>
            </div>

            {/* Load / invoice table */}
            {periodInvoices.length === 0 ? (
              <div className='text-center py-10 text-gray-600 text-sm'>
                No paid invoices found for {selectedDriver.name} in {monthLabel}.
              </div>
            ) : (
              <>
                <table className='w-full text-sm mb-6'>
                  <thead>
                    <tr className='border-b-2 border-surface-500 print:border-gray-300 text-2xs text-gray-500 uppercase tracking-wide'>
                      <th className='text-left py-2 pr-4'>Invoice</th>
                      <th className='text-left py-2 pr-4'>Route</th>
                      <th className='text-right py-2 pr-4'>Gross Rate</th>
                      <th className='text-right py-2 pr-4'>Dispatch Fee</th>
                      <th className='text-right py-2'>Net to Driver</th>
                    </tr>
                  </thead>
                  <tbody>
                    {periodInvoices.map(inv => {
                      const linkedLoad = periodLoads.find(l => l.id === inv.load_id)
                      const route = linkedLoad
                        ? [linkedLoad.origin_state, linkedLoad.dest_state].filter(Boolean).join(' → ')
                        : '—'
                      const net = (inv.driver_gross ?? 0) - (inv.dispatch_fee ?? 0)
                      return (
                        <tr key={inv.id} className='border-b border-surface-700 print:border-gray-200'>
                          <td className='py-2.5 pr-4'>
                            <p className='font-mono text-orange-400 print:text-black'>{inv.invoice_number}</p>
                            <p className='text-2xs text-gray-600 print:text-gray-500'>
                              {fmtDate(inv.paid_date ?? inv.week_ending)}
                            </p>
                          </td>
                          <td className='py-2.5 pr-4 text-gray-300 print:text-black'>{route}</td>
                          <td className='py-2.5 pr-4 text-right font-mono text-gray-200 print:text-black'>
                            {inv.driver_gross != null ? fmt(inv.driver_gross) : '—'}
                          </td>
                          <td className='py-2.5 pr-4 text-right font-mono text-red-400 print:text-red-700'>
                            {inv.dispatch_fee != null ? `(${fmt(inv.dispatch_fee)})` : '—'}
                          </td>
                          <td className='py-2.5 text-right font-mono font-semibold text-green-400 print:text-green-700'>
                            {fmt(net)}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot>
                    <tr className='border-t-2 border-surface-500 print:border-gray-400 font-semibold'>
                      <td colSpan={2} className='py-3 text-gray-300 print:text-black'>
                        Totals ({periodInvoices.length} invoice{periodInvoices.length !== 1 ? 's' : ''})
                      </td>
                      <td className='py-3 text-right font-mono text-gray-100 print:text-black'>{fmt(totalGross)}</td>
                      <td className='py-3 text-right font-mono text-red-400 print:text-red-700'>({fmt(totalFees)})</td>
                      <td className='py-3 text-right font-mono text-green-400 print:text-green-700 text-base'>{fmt(netToDriver)}</td>
                    </tr>
                  </tfoot>
                </table>

                {/* Summary cards */}
                <div className='grid grid-cols-3 gap-4 mb-6'>
                  <div className='rounded-xl border border-surface-500 px-4 py-3 print:border-gray-200'>
                    <p className='text-2xs text-gray-500 uppercase tracking-wide'>Total Gross</p>
                    <p className='text-xl font-bold font-mono text-gray-100 print:text-black mt-1'>{fmt(totalGross)}</p>
                  </div>
                  <div className='rounded-xl border border-surface-500 px-4 py-3 print:border-gray-200'>
                    <p className='text-2xs text-gray-500 uppercase tracking-wide'>Dispatch Fees</p>
                    <p className='text-xl font-bold font-mono text-red-400 print:text-red-700 mt-1'>({fmt(totalFees)})</p>
                  </div>
                  <div className='rounded-xl border border-green-600/40 bg-green-900/10 px-4 py-3 print:border-green-400 print:bg-green-50'>
                    <p className='text-2xs text-green-500 uppercase tracking-wide'>Net to Driver</p>
                    <p className='text-xl font-bold font-mono text-green-400 print:text-green-700 mt-1'>{fmt(netToDriver)}</p>
                  </div>
                </div>

                {totalFactored > 0 && (
                  <div className='bg-surface-700/50 border border-surface-500 rounded-xl px-4 py-3 print:border-gray-200 print:bg-gray-50 mb-4'>
                    <p className='text-xs text-gray-400 print:text-gray-600'>
                      <strong>Factoring Note:</strong> {fmt(totalFactored)} was advanced through factoring this period.
                      The net above reflects gross minus dispatch fees only — factoring repayment is separate.
                    </p>
                  </div>
                )}

                {/* Signature line */}
                <div className='mt-8 pt-5 border-t border-surface-600 print:border-gray-300 grid grid-cols-2 gap-8 hidden print:grid'>
                  <div>
                    <div className='border-b border-black mt-8 mb-1' />
                    <p className='text-xs text-gray-600'>{selectedDriver.name} — Driver Signature / Date</p>
                  </div>
                  <div>
                    <div className='border-b border-black mt-8 mb-1' />
                    <p className='text-xs text-gray-600'>OnTrack Hauling Solutions — Dispatcher Signature / Date</p>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
