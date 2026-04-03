import { useState, useEffect } from 'react'
import { X, Calculator } from 'lucide-react'

interface Props {
  onClose: () => void
  defaultDispatchPct?: number
  fuelPricePerGallon?: number
}

const inp = 'w-full h-8 px-3 bg-surface-600 border border-surface-400 rounded-lg text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-orange-600/60 transition-colors font-mono'

function Row({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: string }) {
  return (
    <div className='flex items-center justify-between py-2 border-b border-surface-600 last:border-0'>
      <div>
        <p className='text-xs text-gray-400'>{label}</p>
        {sub && <p className='text-2xs text-gray-700'>{sub}</p>}
      </div>
      <p className={`text-sm font-mono font-semibold ${accent ?? 'text-gray-200'}`}>{value}</p>
    </div>
  )
}

export function RateCalculator({ onClose, defaultDispatchPct = 7, fuelPricePerGallon = 4.00 }: Props) {
  const [miles,      setMiles]      = useState('')
  const [rpm,        setRpm]        = useState('')
  const [dispPct,    setDispPct]    = useState(String(defaultDispatchPct))
  const [mpg,        setMpg]        = useState('6.5')
  const [fuelPrice,  setFuelPrice]  = useState(String(fuelPricePerGallon))
  const [fsc,        setFsc]        = useState('')

  // Update dispPct if prop changes after mount (settings load)
  useEffect(() => { setDispPct(String(defaultDispatchPct)) }, [defaultDispatchPct])
  useEffect(() => { setFuelPrice(String(fuelPricePerGallon)) }, [fuelPricePerGallon])

  const mi     = parseFloat(miles)   || 0
  const rpmVal = parseFloat(rpm)     || 0
  const pct    = parseFloat(dispPct) || 7
  const mpgVal = parseFloat(mpg)     || 6.5
  const fuel   = parseFloat(fuelPrice) || 4.0
  const fscVal = parseFloat(fsc)    || 0

  const gross      = mi > 0 && rpmVal > 0 ? mi * rpmVal : 0
  const totalGross = gross + fscVal
  const dispFee    = totalGross * (pct / 100)
  const driverPay  = totalGross - dispFee
  const fuelCost   = mi > 0 ? (mi / mpgVal) * fuel : 0
  const netAfterFuel = driverPay - fuelCost

  const fmt = (v: number) => v > 0 ? `$${v.toFixed(2)}` : '—'

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm'>
      <div className='w-full max-w-md bg-surface-800 border border-surface-400 rounded-2xl shadow-2xl mx-4 animate-fade-in'>
        <div className='flex items-center justify-between px-5 py-4 border-b border-surface-500'>
          <div className='flex items-center gap-2'>
            <Calculator size={15} className='text-orange-400' />
            <h2 className='text-sm font-semibold text-gray-100'>Rate Calculator</h2>
          </div>
          <button onClick={onClose} className='p-1.5 rounded-lg hover:bg-surface-600 text-gray-500 hover:text-gray-300 transition-colors'><X size={14} /></button>
        </div>

        <div className='px-5 py-4 space-y-3'>
          <p className='text-2xs text-gray-600 uppercase tracking-wider font-medium'>Load Parameters</p>
          <div className='grid grid-cols-2 gap-3'>
            <div>
              <label className='text-2xs text-gray-600 mb-1 block'>Miles</label>
              <input className={inp} type='number' min='0' value={miles} onChange={e => setMiles(e.target.value)} placeholder='850' />
            </div>
            <div>
              <label className='text-2xs text-gray-600 mb-1 block'>Rate Per Mile ($)</label>
              <input className={inp} type='number' min='0' step='0.01' value={rpm} onChange={e => setRpm(e.target.value)} placeholder='2.30' />
            </div>
            <div>
              <label className='text-2xs text-gray-600 mb-1 block'>FSC / Surcharge ($)</label>
              <input className={inp} type='number' min='0' step='0.01' value={fsc} onChange={e => setFsc(e.target.value)} placeholder='0.00' />
            </div>
            <div>
              <label className='text-2xs text-gray-600 mb-1 block'>Dispatch % </label>
              <input className={inp} type='number' min='0' max='100' step='0.1' value={dispPct} onChange={e => setDispPct(e.target.value)} />
            </div>
          </div>

          <p className='text-2xs text-gray-600 uppercase tracking-wider font-medium pt-1'>Fuel Estimate</p>
          <div className='grid grid-cols-2 gap-3'>
            <div>
              <label className='text-2xs text-gray-600 mb-1 block'>Fuel Price ($/gal)</label>
              <input className={inp} type='number' min='0' step='0.01' value={fuelPrice} onChange={e => setFuelPrice(e.target.value)} />
            </div>
            <div>
              <label className='text-2xs text-gray-600 mb-1 block'>MPG</label>
              <input className={inp} type='number' min='1' step='0.1' value={mpg} onChange={e => setMpg(e.target.value)} />
            </div>
          </div>
        </div>

        <div className='px-5 pb-5'>
          <div className='rounded-xl bg-surface-700 border border-surface-500 px-4 py-3'>
            <Row label='Gross Rate (linehaul)' value={fmt(gross)} />
            {fscVal > 0 && <Row label='Fuel Surcharge' value={fmt(fscVal)} />}
            {fscVal > 0 && <Row label='Total Gross' value={fmt(totalGross)} />}
            <Row label={`Dispatch Fee (${pct}%)`} value={fmt(dispFee)} accent='text-orange-400' sub='Your earned fee' />
            <Row label='Driver Pay' value={fmt(driverPay)} accent='text-green-400' sub='Before fuel' />
            <Row label='Fuel Cost (est.)' value={mi > 0 ? fmt(fuelCost) : '—'} accent='text-red-400' sub={mi > 0 ? `${(mi / mpgVal).toFixed(0)} gal` : undefined} />
            <Row label='Driver Net After Fuel' value={mi > 0 ? fmt(netAfterFuel) : '—'} accent={netAfterFuel > 0 ? 'text-green-300' : 'text-red-400'} />
          </div>
        </div>
      </div>
    </div>
  )
}
