import { useState, useEffect, useMemo } from 'react'
import { X, Download, FileText } from 'lucide-react'
import type { Driver, Invoice } from '../../types/models'

interface Props {
  drivers: Driver[]
  onClose: () => void
}

interface DriverRow {
  driver: Driver
  grossRevenue:  number
  dispatchFees:  number
  netToDriver:   number
  invoiceCount:  number
}

const CURRENT_YEAR = new Date().getFullYear()

export function Export1099Modal({ drivers, onClose }: Props) {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [year, setYear] = useState(CURRENT_YEAR)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    window.api.invoices.list().then(inv => { setInvoices(inv); setLoading(false) })
  }, [])

  const rows: DriverRow[] = useMemo(() => {
    const yearStr = String(year)
    // paid invoices in the selected year
    const relevant = invoices.filter(i =>
      i.status === 'Paid' &&
      i.driver_id != null &&
      (i.paid_date ?? '').startsWith(yearStr)
    )
    const byDriver = new Map<number, { gross: number; fees: number; count: number }>()
    for (const inv of relevant) {
      const d = inv.driver_id!
      const cur = byDriver.get(d) ?? { gross: 0, fees: 0, count: 0 }
      cur.gross += inv.driver_gross ?? 0
      cur.fees  += inv.dispatch_fee ?? 0
      cur.count++
      byDriver.set(d, cur)
    }
    return drivers
      .filter(d => byDriver.has(d.id))
      .map(d => {
        const { gross, fees, count } = byDriver.get(d.id)!
        return {
          driver: d,
          grossRevenue: gross,
          dispatchFees: fees,
          netToDriver:  gross - fees,
          invoiceCount: count,
        }
      })
      .sort((a, b) => b.grossRevenue - a.grossRevenue)
  }, [invoices, drivers, year])

  const totalGross = rows.reduce((s, r) => s + r.grossRevenue, 0)
  const totalFees  = rows.reduce((s, r) => s + r.dispatchFees, 0)
  const totalNet   = rows.reduce((s, r) => s + r.netToDriver, 0)

  function downloadCsv() {
    const lines = [
      'Driver Name,Company,MC Number,Email,Phone,Gross Revenue,Dispatch Fees,Net to Driver,Invoice Count,Year',
      ...rows.map(r => [
        JSON.stringify(r.driver.name),
        JSON.stringify(r.driver.company ?? ''),
        JSON.stringify(r.driver.mc_number ?? ''),
        JSON.stringify(r.driver.email ?? ''),
        JSON.stringify(r.driver.phone ?? ''),
        r.grossRevenue.toFixed(2),
        r.dispatchFees.toFixed(2),
        r.netToDriver.toFixed(2),
        r.invoiceCount,
        year,
      ].join(',')),
    ]
    const csv  = lines.join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `1099-export-${year}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const fmtMoney = (v: number) => '$' + v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center'>
      <div className='absolute inset-0 bg-black/60 backdrop-blur-sm' onClick={onClose}/>
      <div className='relative w-[720px] max-h-[85vh] bg-surface-800 rounded-xl border border-surface-400 shadow-2xl flex flex-col overflow-hidden'>
        {/* Header */}
        <div className='flex items-center justify-between px-5 py-4 border-b border-surface-500'>
          <div className='flex items-center gap-2'>
            <FileText size={16} className='text-orange-400'/>
            <h2 className='text-base font-semibold text-gray-100'>1099 Export</h2>
          </div>
          <button onClick={onClose} className='p-1.5 rounded-lg hover:bg-surface-600 text-gray-500 hover:text-gray-300'><X size={16}/></button>
        </div>

        {/* Year selector + download */}
        <div className='px-5 py-3 border-b border-surface-600 flex items-center gap-4'>
          <div className='flex items-center gap-2'>
            <span className='text-xs text-gray-500'>Tax Year</span>
            <select value={year} onChange={e => setYear(parseInt(e.target.value))}
              className='h-8 px-2.5 pr-6 text-xs bg-surface-700 border border-surface-400 rounded-lg text-gray-300 focus:outline-none focus:border-orange-600/50 appearance-none'>
              {Array.from({ length: 5 }, (_, i) => CURRENT_YEAR - i).map(y =>
                <option key={y} value={y}>{y}</option>
              )}
            </select>
          </div>
          <span className='text-xs text-gray-600'>{rows.length} driver{rows.length !== 1 ? 's' : ''} with paid invoices</span>
          {rows.length > 0 && (
            <button onClick={downloadCsv}
              className='ml-auto flex items-center gap-1.5 h-8 px-3 text-xs bg-orange-600 hover:bg-orange-500 text-white rounded-lg font-medium'>
              <Download size={12}/> Download CSV
            </button>
          )}
        </div>

        {/* Table */}
        <div className='flex-1 overflow-y-auto'>
          {loading && <div className='px-6 py-8 text-center text-gray-600 text-sm'>Loading...</div>}
          {!loading && rows.length === 0 && (
            <div className='px-6 py-8 text-center text-gray-600 text-sm'>No paid invoices found for {year}.</div>
          )}
          {!loading && rows.length > 0 && (
            <>
              <table className='w-full text-xs'>
                <thead className='sticky top-0 bg-surface-800 border-b border-surface-600'>
                  <tr>
                    <th className='text-left px-5 py-2.5 text-2xs font-medium text-gray-600 uppercase tracking-wider'>Driver</th>
                    <th className='text-right px-4 py-2.5 text-2xs font-medium text-gray-600 uppercase tracking-wider'>Gross Revenue</th>
                    <th className='text-right px-4 py-2.5 text-2xs font-medium text-gray-600 uppercase tracking-wider'>Dispatch Fees</th>
                    <th className='text-right px-4 py-2.5 text-2xs font-medium text-gray-600 uppercase tracking-wider'>Net to Driver</th>
                    <th className='text-right px-5 py-2.5 text-2xs font-medium text-gray-600 uppercase tracking-wider'>Invoices</th>
                  </tr>
                </thead>
                <tbody className='divide-y divide-surface-700'>
                  {rows.map(r => (
                    <tr key={r.driver.id} className='hover:bg-surface-700/30 transition-colors'>
                      <td className='px-5 py-3'>
                        <p className='text-gray-200 font-medium'>{r.driver.name}</p>
                        {r.driver.company && <p className='text-2xs text-gray-600 mt-0.5'>{r.driver.company}</p>}
                        {r.driver.mc_number && <p className='text-2xs text-gray-700 font-mono'>{r.driver.mc_number}</p>}
                      </td>
                      <td className='px-4 py-3 text-right font-mono text-gray-300'>{fmtMoney(r.grossRevenue)}</td>
                      <td className='px-4 py-3 text-right font-mono text-orange-400'>{fmtMoney(r.dispatchFees)}</td>
                      <td className='px-4 py-3 text-right font-mono text-green-400 font-semibold'>{fmtMoney(r.netToDriver)}</td>
                      <td className='px-5 py-3 text-right text-gray-600'>{r.invoiceCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totals */}
              <div className='sticky bottom-0 bg-surface-750 border-t border-surface-500 px-5 py-3 grid grid-cols-4 gap-4'>
                <div>
                  <p className='text-2xs text-gray-600'>Total Gross</p>
                  <p className='text-sm font-mono font-semibold text-gray-200'>{fmtMoney(totalGross)}</p>
                </div>
                <div>
                  <p className='text-2xs text-gray-600'>Total Fees</p>
                  <p className='text-sm font-mono font-semibold text-orange-400'>{fmtMoney(totalFees)}</p>
                </div>
                <div>
                  <p className='text-2xs text-gray-600'>Total Net to Drivers</p>
                  <p className='text-sm font-mono font-semibold text-green-400'>{fmtMoney(totalNet)}</p>
                </div>
                <div className='text-right'>
                  <p className='text-2xs text-gray-600'>{rows.length} carriers &bull; {year}</p>
                  <p className='text-2xs text-gray-700 mt-0.5'>Your earnings = total fees above</p>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Disclaimer */}
        <div className='px-5 py-2.5 border-t border-surface-700 bg-surface-750'>
          <p className='text-2xs text-gray-700'>
            For 1099-NEC filing, use the Dispatch Fees column as non-employee compensation paid to each carrier.
            Net to Driver is for reference only. Consult your CPA before filing.
          </p>
        </div>
      </div>
    </div>
  )
}
