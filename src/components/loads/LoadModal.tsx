import { useState, useEffect } from 'react'
import { X, ArrowRight, Truck, Calendar, DollarSign, FileText, Tag, Hash, MapPin } from 'lucide-react'
import type { Load, CreateLoadDto, LoadStatus, Driver, Broker } from '../../types/models'
import { LOAD_STATUSES } from './constants'

interface Props { load: Load | null; onSave: (l: Load) => void; onClose: () => void }

const BLANK: CreateLoadDto = {
  load_id: null, driver_id: null, broker_id: null,
  origin_city: null, origin_state: null, dest_city: null, dest_state: null,
  pickup_date: null, delivery_date: null, miles: null, rate: null,
  dispatch_pct: 7, commodity: null, status: 'Searching', invoiced: 0, notes: null,
}
const inp = 'w-full h-8 px-3 bg-surface-500 border border-surface-400 rounded-lg text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-orange-600/60 focus:ring-1 focus:ring-orange-600/20 transition-colors'

function Field({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) {
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

export function LoadModal({ load, onSave, onClose }: Props) {
  const [form, setForm] = useState<CreateLoadDto>(BLANK)
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [brokers, setBrokers] = useState<Broker[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([window.api.drivers.list(), window.api.brokers.list()]).then(([d,b]) => { setDrivers(d); setBrokers(b) })
    if (load) { const { id, created_at, updated_at, ...rest } = load; setForm({ ...BLANK, ...rest }) }
    else setForm(BLANK)
  }, [load])

  const str = <K extends keyof CreateLoadDto>(k: K, v: string) => setForm(p => ({ ...p, [k]: v || null }))
  const num = <K extends keyof CreateLoadDto>(k: K, v: string) => setForm(p => ({ ...p, [k]: v ? parseFloat(v) : null }))

  const rpm = form.rate != null && form.miles != null && form.miles > 0 ? form.rate / form.miles : null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setError('')
    try {
      const saved = load
        ? await window.api.loads.update(load.id, form) as Load
        : await window.api.loads.create(form)
      onSave(saved)
    } catch { setError('Failed to save. Please try again.'); setSaving(false) }
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
                  {drivers.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </Field>
              <Field label='Broker' icon={<Tag size={10} />}>
                <select className={inp} value={form.broker_id??''} onChange={e=>setForm(p=>({...p,broker_id:e.target.value?+e.target.value:null}))}>
                  <option value=''>None</option>
                  {brokers.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
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
              <Field label='Miles' icon={<ArrowRight size={10} />}>
                <input className={inp} type='number' min='0' value={form.miles??''} onChange={e=>num('miles',e.target.value)} placeholder='e.g. 850' />
              </Field>
              <Field label='Rate ($)' icon={<DollarSign size={10} />}>
                <div>
                  <input className={inp} type='number' min='0' step='0.01' value={form.rate??''} onChange={e=>num('rate',e.target.value)} placeholder='e.g. 2100' />
                  {rpm != null && (
                    <p className='text-2xs mt-1'>
                      <span className='text-gray-600'>RPM: </span>
                      <span className={rpm >= (form.driver_id ? 2 : 0) ? 'text-green-400 font-mono font-semibold' : 'text-gray-400 font-mono'}>${rpm.toFixed(2)}/mi</span>
                    </p>
                  )}
                </div>
              </Field>
              <Field label='Dispatch %' icon={<DollarSign size={10} />}>
                <input className={inp} type='number' step='0.1' min='0' max='100' value={form.dispatch_pct??7} onChange={e=>setForm(p=>({...p,dispatch_pct:parseFloat(e.target.value)||7}))} />
              </Field>
              <Field label='Commodity' icon={<Tag size={10} />}>
                <input className={inp} value={form.commodity??''} onChange={e=>str('commodity',e.target.value)} placeholder='e.g. Dry Goods, Frozen Food' />
              </Field>
              <div className='col-span-2'>
                <Field label='Notes' icon={<FileText size={10} />}>
                  <textarea className={`${inp} h-16 py-2 resize-none`} value={form.notes??''} onChange={e=>str('notes',e.target.value)} placeholder='Internal notes...' />
                </Field>
              </div>
            </div>
            {error && <p className='mt-3 text-xs text-red-400'>{error}</p>}
          </div>
          <div className='flex items-center justify-end gap-3 px-6 py-4 border-t border-surface-500'>
            <button type='button' onClick={onClose} className='px-4 h-8 text-sm text-gray-400 hover:text-gray-200 transition-colors'>Cancel</button>
            <button type='submit' disabled={saving} className='px-5 h-8 text-sm font-semibold bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white rounded-lg transition-colors'>
              {saving ? 'Saving...' : load ? 'Save Changes' : 'Create Load'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
