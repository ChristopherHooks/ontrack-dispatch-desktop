import { useState, useEffect, useMemo } from 'react'
import { X, ArrowRight, Truck, Calendar, DollarSign, FileText, Tag, Hash, MapPin, Info, AlertTriangle, CheckSquare, Square, Clock } from 'lucide-react'
import type { Load, CreateLoadDto, LoadStatus, Driver, Broker, Invoice } from '../../types/models'
import { LOAD_STATUSES } from './constants'
import { Term } from '../ui/Term'

// ---------------------------------------------------------------------------
// Rate benchmarks — static reference, general U.S. spot market averages.
// These are ballpark figures for a beginner; actual rates vary by corridor
// and cycle. Source: general DAT / industry knowledge as of 2025.
// ---------------------------------------------------------------------------
interface Benchmark { label: string; low: number; avg: number; good: number; unit: string }
const BENCHMARKS: Array<{ match: string[]; data: Benchmark }> = [
  {
    match: ['dry van', 'dryvan', 'van', '53'],
    data:  { label: 'Dry Van', low: 1.80, avg: 2.30, good: 2.80, unit: '/mi' },
  },
  {
    match: ['reefer', 'refrigerated', 'temp', 'frozen'],
    data:  { label: 'Reefer', low: 2.20, avg: 2.80, good: 3.40, unit: '/mi' },
  },
  {
    match: ['flatbed', 'flat bed', 'flat'],
    data:  { label: 'Flatbed', low: 2.20, avg: 2.80, good: 3.50, unit: '/mi' },
  },
  {
    match: ['step deck', 'stepdeck', 'step'],
    data:  { label: 'Step Deck', low: 2.40, avg: 3.00, good: 3.80, unit: '/mi' },
  },
  {
    match: ['hotshot', 'hot shot'],
    data:  { label: 'Hotshot', low: 1.50, avg: 2.20, good: 3.00, unit: '/mi' },
  },
  {
    match: ['box truck', 'box', '26 ft', '26ft', '26-ft'],
    data:  { label: 'Box Truck', low: 1.40, avg: 1.90, good: 2.50, unit: '/mi' },
  },
  {
    match: ['cargo van', 'sprinter', 'cargo'],
    data:  { label: 'Cargo Van', low: 1.20, avg: 1.60, good: 2.10, unit: '/mi' },
  },
]

function getBenchmark(trailerType: string | null): Benchmark | null {
  if (!trailerType) return null
  const q = trailerType.toLowerCase()
  for (const { match, data } of BENCHMARKS) {
    if (match.some(m => q.includes(m))) return data
  }
  return null
}

interface Props { load: Load | null; prefill?: Partial<CreateLoadDto> | null; onSave: (l: Load) => void; onClose: () => void }

const BLANK: CreateLoadDto = {
  load_id: null, driver_id: null, broker_id: null,
  origin_city: null, origin_state: null, dest_city: null, dest_state: null,
  pickup_date: null, delivery_date: null, miles: null, deadhead_miles: null,
  rate: null, fuel_surcharge: null,
  dispatch_pct: 7, trailer_type: null, commodity: null, status: 'Searching', invoiced: 0, notes: null,
}
const inp = 'w-full h-8 px-3 bg-surface-500 border border-surface-400 rounded-lg text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-orange-600/60 focus:ring-1 focus:ring-orange-600/20 transition-colors'

function Field({ label, icon, children }: { label: React.ReactNode; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <label className='flex items-center gap-1.5 text-2xs text-gray-500 mb-1.5 font-medium uppercase tracking-wider'>{icon}{label}</label>
      {children}
    </div>
  )
}
function Sec({ title }: { title: string }) {
  return <div className='col-span-2 pt-1 border-t border-surface-500'><p className='text-2xs font-semibold text-gray-600 uppercase tracking-wider pt-2'>{title}</p></div>
}

// ---------------------------------------------------------------------------
// Load acceptance checklist items — shown when booking a new load
// ---------------------------------------------------------------------------
const CHECKLIST_ITEMS = [
  'Broker flag reviewed — not on Avoid list',
  'Rate meets or exceeds minimum RPM target',
  'Equipment type matches driver trailer',
  'Pickup date is today or in the future',
  'Mileage is reasonable (not blank or zero)',
]

export function LoadModal({ load, prefill, onSave, onClose }: Props) {
  const [form, setForm] = useState<CreateLoadDto>(BLANK)
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [brokers, setBrokers] = useState<Broker[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  // Pre-submit checklist state
  const [showChecklist, setShowChecklist] = useState(false)
  const [checkedItems, setCheckedItems] = useState<boolean[]>(CHECKLIST_ITEMS.map(() => false))

  useEffect(() => {
    Promise.all([window.api.drivers.list(), window.api.brokers.list(), window.api.invoices.list()])
      .then(([d,b,inv]) => { setDrivers(d); setBrokers(b); setInvoices(inv) })
    if (load) { const { id, created_at, updated_at, ...rest } = load; setForm({ ...BLANK, ...rest }) }
    else if (prefill) setForm({ ...BLANK, ...prefill })
    else setForm(BLANK)
  }, [load, prefill])

  const str = <K extends keyof CreateLoadDto>(k: K, v: string) => setForm(p => ({ ...p, [k]: v || null }))
  const num = <K extends keyof CreateLoadDto>(k: K, v: string) => setForm(p => ({ ...p, [k]: v ? parseFloat(v) : null }))

  const rpm = form.rate != null && form.miles != null && form.miles > 0 ? form.rate / form.miles : null

  // Derived broker and driver for inline warnings
  const selectedBroker = form.broker_id ? brokers.find(b => b.id === form.broker_id) ?? null : null
  const selectedDriver = form.driver_id ? drivers.find(d => d.id === form.driver_id) ?? null : null
  const brokerFlag     = (selectedBroker as any)?.flag as string | null | undefined
  const isBookingNew   = !load && form.status === 'Booked'

  // Broker overexposure: sum of outstanding dispatch fees for this broker
  const brokerExposure = useMemo(() => {
    if (!form.broker_id) return 0
    return invoices
      .filter(i => i.broker_id === form.broker_id && ['Sent','Overdue'].includes(i.status))
      .reduce((s, i) => s + (i.dispatch_fee ?? 0), 0)
  }, [invoices, form.broker_id])
  const brokerOverLimit = selectedBroker?.credit_limit != null && brokerExposure > selectedBroker.credit_limit

  async function doSave() {
    setSaving(true); setError('')
    try {
      const saved = load
        ? await window.api.loads.update(load.id, form) as Load
        : await window.api.loads.create(form)
      onSave(saved)
    } catch { setError('Failed to save. Please try again.'); setSaving(false) }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    // Show checklist confirmation when booking a new load
    if (isBookingNew && !showChecklist) {
      setCheckedItems(CHECKLIST_ITEMS.map(() => false))
      setShowChecklist(true)
      return
    }
    await doSave()
  }

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm'>
      <div className='w-full max-w-2xl bg-surface-800 border border-surface-400 rounded-2xl shadow-2xl mx-4 max-h-[90vh] flex flex-col animate-fade-in'>
        <div className='flex items-center justify-between px-6 py-4 border-b border-surface-500'>
          <h2 className='text-base font-semibold text-gray-100'>{load ? 'Edit Load' : 'New Load'}</h2>
          <button onClick={onClose} className='p-1.5 rounded-lg hover:bg-surface-600 text-gray-500 hover:text-gray-300 transition-colors'><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} className='flex flex-col flex-1 min-h-0'>
          <div className='overflow-y-auto flex-1 px-6 py-5'>
            <div className='grid grid-cols-2 gap-4'>
              <Field label='Load / Ref #' icon={<Hash size={10} />}>
                <input className={inp} value={form.load_id??''} onChange={e=>str('load_id',e.target.value)} placeholder='Broker ref number' />
              </Field>

              <Field label='Status' icon={<Tag size={10} />}>
                <select className={inp} value={form.status} onChange={e=>setForm(p=>({...p,status:e.target.value as LoadStatus}))}>
                  {LOAD_STATUSES.map(s=><option key={s} value={s}>{s}</option>)}
                </select>
              </Field>
              <Field label='Driver' icon={<Truck size={10} />}>
                <select className={inp} value={form.driver_id??''} onChange={e=>setForm(p=>({...p,driver_id:e.target.value?+e.target.value:null}))}>
                  <option value=''>Unassigned</option>
                  {drivers.map(d=><option key={d.id} value={d.id}>{d.name}{d.status==='On Load'?' (On Load)':''}</option>)}
                </select>
                {selectedDriver?.status === 'On Load' && form.status === 'Booked' && (
                  <div className='flex items-start gap-1.5 mt-1.5 px-2.5 py-1.5 rounded-lg bg-yellow-900/20 border border-yellow-700/30'>
                    <Clock size={11} className='text-yellow-400 mt-0.5 shrink-0' />
                    <p className='text-2xs text-yellow-300'>
                      <strong>{selectedDriver.name}</strong> already has an active load. Confirm they will be available on the pickup date before booking.
                    </p>
                  </div>
                )}
              </Field>
              <Field label='Broker' icon={<Tag size={10} />}>
                <select className={inp} value={form.broker_id??''} onChange={e=>setForm(p=>({...p,broker_id:e.target.value?+e.target.value:null}))}>
                  <option value=''>None</option>
                  {brokers.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
                {brokerFlag === 'Avoid' && (
                  <div className='flex items-start gap-1.5 mt-1.5 px-2.5 py-1.5 rounded-lg bg-red-900/25 border border-red-700/40'>
                    <AlertTriangle size={11} className='text-red-400 mt-0.5 shrink-0' />
                    <p className='text-2xs text-red-300'>
                      <strong>Avoid flag</strong> — this broker is flagged. Do not book loads with them. Remove the broker or update their status before proceeding.
                    </p>
                  </div>
                )}
                {brokerFlag === 'Watch' && (
                  <div className='flex items-start gap-1.5 mt-1.5 px-2.5 py-1.5 rounded-lg bg-yellow-900/20 border border-yellow-700/30'>
                    <AlertTriangle size={11} className='text-yellow-400 mt-0.5 shrink-0' />
                    <p className='text-2xs text-yellow-300'>
                      <strong>Watch flag</strong> — proceed with caution. Verify payment terms and get a signed rate con before dispatch.
                    </p>
                  </div>
                )}
              {brokerOverLimit && (
                <div className='flex items-start gap-1.5 mt-1.5 px-2.5 py-1.5 rounded-lg bg-orange-900/25 border border-orange-700/40'>
                  <AlertTriangle size={11} className='text-orange-400 mt-0.5 shrink-0' />
                  <p className='text-2xs text-orange-300'>
                    <strong>Credit limit exceeded</strong> — {selectedBroker?.name} has ${brokerExposure.toFixed(2)} in outstanding invoices against a ${selectedBroker?.credit_limit?.toLocaleString()} limit. Collect before booking another load.
                  </p>
                </div>
              )}
              </Field>
              <Sec title='Route' />
              <Field label='Origin City' icon={<MapPin size={10} />}>
                <input className={inp} value={form.origin_city??''} onChange={e=>str('origin_city',e.target.value)} placeholder='Atlanta' />
              </Field>
              <Field label='Origin State' icon={<MapPin size={10} />}>
                <input className={`${inp} uppercase`} value={form.origin_state??''} onChange={e=>setForm(p=>({...p,origin_state:e.target.value.toUpperCase().slice(0,2)||null}))} placeholder='GA' maxLength={2} />
              </Field>
              <Field label='Dest City' icon={<ArrowRight size={10} />}>
                <input className={inp} value={form.dest_city??''} onChange={e=>str('dest_city',e.target.value)} placeholder='Dallas' />
              </Field>
              <Field label='Dest State' icon={<ArrowRight size={10} />}>
                <input className={`${inp} uppercase`} value={form.dest_state??''} onChange={e=>setForm(p=>({...p,dest_state:e.target.value.toUpperCase().slice(0,2)||null}))} placeholder='TX' maxLength={2} />
              </Field>
              <Sec title='Schedule & Financials' />
              <Field label='Pickup Date' icon={<Calendar size={10} />}>
                <input className={inp} type='date' value={form.pickup_date??''} onChange={e=>str('pickup_date',e.target.value)} />
              </Field>
              <Field label='Delivery Date' icon={<Calendar size={10} />}>
                <input className={inp} type='date' value={form.delivery_date??''} onChange={e=>str('delivery_date',e.target.value)} />
              </Field>
              <Field label='Loaded Miles' icon={<ArrowRight size={10} />}>
                <input className={inp} type='number' min='0' value={form.miles??''} onChange={e=>num('miles',e.target.value)} placeholder='e.g. 850' />
              </Field>
              <Field label='Deadhead Miles' icon={<ArrowRight size={10} />}>
                <input className={inp} type='number' min='0' value={(form as any).deadhead_miles??''} onChange={e=>num('deadhead_miles' as any,e.target.value)} placeholder='Empty miles to pickup' />
              </Field>
              <Field label='Rate ($)' icon={<DollarSign size={10} />}>
                <div>
                  <input className={inp} type='number' min='0' step='0.01' value={form.rate??''} onChange={e=>num('rate',e.target.value)} placeholder='e.g. 2100' />
                  {rpm != null && (
                    <p className='text-2xs mt-1'>
                      <Term word='RPM' def='Rate Per Mile — total load rate divided by total miles. The key metric for comparing loads across different distances.'><span className='text-gray-600'>RPM</span></Term>
                      <span className='text-gray-600'>: </span>
                      <span className={rpm >= (form.driver_id ? 2 : 0) ? 'text-green-400 font-mono font-semibold' : 'text-gray-400 font-mono'}>${rpm.toFixed(2)}/mi</span>
                    </p>
                  )}
                </div>
              </Field>
              <Field label='Fuel Surcharge / FSC ($)' icon={<DollarSign size={10} />}>
                <input className={inp} type='number' min='0' step='0.01' value={(form as any).fuel_surcharge??''} onChange={e=>num('fuel_surcharge' as any,e.target.value)} placeholder='Optional FSC line item' />
              </Field>
              <Field label={<Term word='Dispatch %' def='Your fee — a percentage of the gross load rate. At 7% on a $2,100 load, you collect $147. Applied to the broker-paid rate shown on the rate confirmation.'>Dispatch %</Term>} icon={<DollarSign size={10} />}>
                <input className={inp} type='number' step='0.1' min='0' max='100' value={form.dispatch_pct??7} onChange={e=>setForm(p=>({...p,dispatch_pct:parseFloat(e.target.value)||7}))} />
              </Field>
              <Field label='Commodity' icon={<Tag size={10} />}>
                <input className={inp} value={form.commodity??''} onChange={e=>str('commodity',e.target.value)} placeholder='e.g. Dry Goods, Frozen Food' />
              </Field>
              <Field label='Trailer Type' icon={<Truck size={10} />}>
                <input className={inp} value={form.trailer_type??''} onChange={e=>str('trailer_type',e.target.value)} placeholder='e.g. Dry Van, Reefer, Flatbed' />
              </Field>
              <div className='col-span-2'>
                <Field label='Notes' icon={<FileText size={10} />}>
                  <textarea className={`${inp} h-16 py-2 resize-none`} value={form.notes??''} onChange={e=>str('notes',e.target.value)} placeholder='Internal notes...' />
                </Field>
              </div>

              {/* Rate context — appears when a known trailer type is entered */}
              {(() => {
                const bm = getBenchmark(form.trailer_type)
                if (!bm) return null
                const rpmVal = rpm
                let badge: { label: string; cls: string } | null = null
                if (rpmVal != null) {
                  if (rpmVal >= bm.good)       badge = { label: 'Good rate',    cls: 'text-green-400' }
                  else if (rpmVal >= bm.avg)   badge = { label: 'Average rate', cls: 'text-yellow-400' }
                  else if (rpmVal >= bm.low)   badge = { label: 'Below average', cls: 'text-orange-400' }
                  else                         badge = { label: 'Low — push back', cls: 'text-red-400' }
                }
                return (
                  <div className='col-span-2 bg-surface-700 rounded-xl border border-surface-500 px-4 py-3'>
                    <div className='flex items-center gap-1.5 mb-2'>
                      <Info size={11} className='text-gray-500' />
                      <span className='text-2xs font-semibold text-gray-500 uppercase tracking-wide'>{bm.label} — Rate Reference</span>
                      {badge && <span className={`ml-auto text-2xs font-bold ${badge.cls}`}>{badge.label}</span>}
                    </div>
                    <div className='flex items-center gap-4'>
                      {[
                        { tier: 'Low',  val: bm.low,  cls: 'text-red-400' },
                        { tier: 'Avg',  val: bm.avg,  cls: 'text-yellow-400' },
                        { tier: 'Good', val: bm.good, cls: 'text-green-400' },
                      ].map(({ tier, val, cls }) => (
                        <div key={tier}>
                          <p className='text-2xs text-gray-600'>{tier}</p>
                          <p className={`text-xs font-mono font-semibold ${cls}`}>${val.toFixed(2)}{bm.unit}</p>
                        </div>
                      ))}
                      {rpmVal != null && (
                        <div className='ml-auto'>
                          <p className='text-2xs text-gray-600'>Your RPM</p>
                          <p className='text-xs font-mono font-bold text-gray-200'>${rpmVal.toFixed(2)}{bm.unit}</p>
                        </div>
                      )}
                    </div>
                    <p className='text-2xs text-gray-600 mt-2'>General U.S. spot averages. Actual rates vary by lane and cycle — verify against DAT before calling.</p>
                  </div>
                )
              })()}
            </div>
              {/* Profitability Pre-check — shown when rate, miles, and dispatch % are filled */}
              {form.rate != null && form.miles != null && form.miles > 0 && (() => {
                const grossRate   = form.rate
                const fsc         = form.fuel_surcharge ?? 0
                const totalGross  = grossRate + fsc
                const dispFee     = totalGross * ((form.dispatch_pct ?? 7) / 100)
                const driverGross = totalGross - dispFee
                // Fuel estimate: driver.cpm or 0.45 * miles as rough proxy
                const cpmRate     = selectedDriver?.cpm ?? 0.45
                const fuelEst     = cpmRate * form.miles
                const driverNet   = driverGross - fuelEst
                const minRpm      = selectedDriver?.min_rpm
                const rpmMet      = minRpm == null || rpm == null || rpm >= minRpm
                return (
                  <div className='mt-3 bg-surface-700 rounded-xl border border-surface-500 px-4 py-3'>
                    <div className='flex items-center gap-1.5 mb-3'>
                      <Info size={11} className='text-gray-500' />
                      <span className='text-2xs font-semibold text-gray-500 uppercase tracking-wide'>Profitability Pre-check</span>
                      <span className={`ml-auto text-2xs font-bold ${rpmMet ? 'text-green-400' : 'text-red-400'}`}>
                        {rpmMet ? (rpm != null && rpm >= 2.5 ? 'Strong' : rpm != null && rpm >= 2.0 ? 'OK' : 'Marginal') : 'Below Min RPM'}
                      </span>
                    </div>
                    <div className='grid grid-cols-4 gap-2'>
                      <div>
                        <p className='text-2xs text-gray-600'>Gross Rate</p>
                        <p className='text-xs font-mono font-semibold text-gray-200 mt-0.5'>${totalGross.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className='text-2xs text-gray-600'>Dispatch Fee</p>
                        <p className='text-xs font-mono font-semibold text-orange-400 mt-0.5'>-${dispFee.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className='text-2xs text-gray-600'>Fuel Est.</p>
                        <p className='text-xs font-mono font-semibold text-red-400 mt-0.5'>-${fuelEst.toFixed(2)}</p>
                        <p className='text-2xs text-gray-700'>${cpmRate.toFixed(2)}/mi</p>
                      </div>
                      <div>
                        <p className='text-2xs text-gray-600'>Driver Net</p>
                        <p className={`text-xs font-mono font-semibold mt-0.5 ${driverNet > 0 ? 'text-green-400' : 'text-red-400'}`}>${driverNet.toFixed(2)}</p>
                      </div>
                    </div>
                    {!rpmMet && minRpm != null && rpm != null && (
                      <p className='text-2xs text-red-400 mt-2'>RPM ${rpm.toFixed(2)} is below {selectedDriver?.name?.split(' ')[0] ?? 'driver'}&apos;s minimum ${minRpm.toFixed(2)}.</p>
                    )}
                    <p className='text-2xs text-gray-700 mt-2'>Fuel estimate based on {selectedDriver?.cpm != null ? 'driver CPM' : 'default $0.45/mi'} — does not include tolls or deadhead.</p>
                  </div>
                )
              })()}
            {error && <p className='mt-3 text-xs text-red-400'>{error}</p>}
          </div>
          {/* Pre-booking checklist — shown when creating a Booked load */}
          {showChecklist && (
            <div className='mx-6 mb-2 rounded-xl border border-orange-700/40 bg-orange-900/10 p-4'>
              <div className='flex items-center gap-2 mb-3'>
                <AlertTriangle size={13} className='text-orange-400 shrink-0' />
                <p className='text-sm font-semibold text-orange-300'>Pre-Booking Checklist</p>
              </div>
              <p className='text-2xs text-gray-400 mb-3'>Confirm each item before committing this load as Booked.</p>
              <ul className='space-y-2'>
                {CHECKLIST_ITEMS.map((item, i) => (
                  <li key={i}>
                    <button
                      type='button'
                      onClick={() => setCheckedItems(p => p.map((v, j) => j === i ? !v : v))}
                      className='flex items-start gap-2 w-full text-left group'
                    >
                      {checkedItems[i]
                        ? <CheckSquare size={13} className='text-green-400 mt-0.5 shrink-0' />
                        : <Square      size={13} className='text-gray-500 mt-0.5 shrink-0 group-hover:text-gray-300' />
                      }
                      <span className={`text-xs transition-colors ${checkedItems[i] ? 'text-gray-400 line-through' : 'text-gray-200'}`}>{item}</span>
                    </button>
                  </li>
                ))}
              </ul>
              {checkedItems.every(Boolean) && (
                <p className='mt-3 text-2xs text-green-400 font-medium'>All items confirmed — ready to book.</p>
              )}
            </div>
          )}
          <div className='flex items-center justify-end gap-3 px-6 py-4 border-t border-surface-500'>
            <button type='button' onClick={onClose} className='px-4 h-8 text-sm text-gray-400 hover:text-gray-200 transition-colors'>Cancel</button>
            {showChecklist && (
              <button type='button' onClick={() => setShowChecklist(false)} className='px-4 h-8 text-sm text-gray-400 hover:text-gray-200 border border-surface-500 rounded-lg transition-colors'>
                Back
              </button>
            )}
            <button
              type='submit'
              disabled={saving || (showChecklist && !checkedItems.every(Boolean))}
              className='px-5 h-8 text-sm font-semibold bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white rounded-lg transition-colors'
            >
              {saving ? 'Saving...' : showChecklist ? 'Confirm Booking' : load ? 'Save Changes' : 'Create Load'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
