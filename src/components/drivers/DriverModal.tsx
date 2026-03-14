import { useState, useEffect } from 'react'
import { X, User, Building2, Phone, Mail, MapPin, Truck, Calendar, Tag, DollarSign, FileText, Hash } from 'lucide-react'
import type { Driver, CreateDriverDto, DriverStatus } from '../../types/models'
import { DRIVER_STATUSES, TRUCK_TYPES, TRAILER_TYPES_DRV } from './constants'

interface Props { driver: Driver | null; onSave: (d: Driver) => void; onClose: () => void }

const BLANK: CreateDriverDto = {
  name: '', company: null, mc_number: null, dot_number: null, cdl_number: null,
  cdl_expiry: null, phone: null, email: null, truck_type: null, trailer_type: null,
  home_base: null, current_location: null, preferred_lanes: null, min_rpm: null, dispatch_percent: 7,
  factoring_company: null, insurance_expiry: null, start_date: null, status: 'Active', notes: null,
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

export function DriverModal({ driver, onSave, onClose }: Props) {
  const [form, setForm] = useState<CreateDriverDto>(BLANK)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (driver) { const { id, created_at, updated_at, ...rest } = driver; setForm({ ...BLANK, ...rest }) }
    else setForm(BLANK)
  }, [driver])

  const str = <K extends keyof CreateDriverDto>(k: K, v: string) => setForm(p => ({ ...p, [k]: v || null }))
  const num = <K extends keyof CreateDriverDto>(k: K, v: string, fallback: number | null = null) =>
    setForm(p => ({ ...p, [k]: v ? parseFloat(v) : fallback }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) { setError('Name is required.'); return }
    setSaving(true); setError('')
    try {
      const saved = driver
        ? await window.api.drivers.update(driver.id, form) as Driver
        : await window.api.drivers.create(form)
      onSave(saved)
    } catch { setError('Failed to save. Please try again.'); setSaving(false) }
  }

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm'>
      <div className='w-full max-w-2xl bg-surface-800 border border-surface-400 rounded-2xl shadow-2xl mx-4 max-h-[90vh] flex flex-col animate-fade-in'>
        <div className='flex items-center justify-between px-6 py-4 border-b border-surface-500'>
          <h2 className='text-base font-semibold text-gray-100'>{driver ? 'Edit Driver' : 'New Driver'}</h2>
          <button onClick={onClose} className='p-1.5 rounded-lg hover:bg-surface-600 text-gray-500 hover:text-gray-300 transition-colors'><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} className='flex flex-col flex-1 min-h-0'>
          <div className='overflow-y-auto flex-1 px-6 py-5'>
            <div className='grid grid-cols-2 gap-4'>
              <div className='col-span-2'>
                <Field label='Driver Name *' icon={<User size={10} />}>
                  <input className={inp} value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} placeholder='Full name' required />
                </Field>
              </div>
              <Field label='Company / LLC' icon={<Building2 size={10} />}>
                <input className={inp} value={form.company??''} onChange={e=>str('company',e.target.value)} placeholder='Company name' />
              </Field>
              <Field label='Status' icon={<Tag size={10} />}>
                <select className={inp} value={form.status} onChange={e=>setForm(p=>({...p,status:e.target.value as DriverStatus}))}>
                  {DRIVER_STATUSES.map(s=><option key={s} value={s}>{s}</option>)}
                </select>
              </Field>
              <Sec title='Contact' />
              <Field label='Phone' icon={<Phone size={10} />}>
                <input className={inp} type='tel' value={form.phone??''} onChange={e=>str('phone',e.target.value)} placeholder='(555) 000-0000' />
              </Field>
              <Field label='Email' icon={<Mail size={10} />}>
                <input className={inp} type='email' value={form.email??''} onChange={e=>str('email',e.target.value)} placeholder='driver@email.com' />
              </Field>
              <div className='col-span-2'>
                <Field label='Home Base' icon={<MapPin size={10} />}>
                  <input className={`${inp} max-w-xs`} value={form.home_base??''} onChange={e=>str('home_base',e.target.value)} placeholder='Charlotte, NC' />
                </Field>
              </div>
              <div className='col-span-2'>
                <Field label='Current Location' icon={<MapPin size={10} />}>
                  <input className={`${inp} max-w-xs`} value={form.current_location??''} onChange={e=>str('current_location',e.target.value)} placeholder='Memphis, TN' />
                  <p className='text-2xs text-gray-600 mt-1'>Override deadhead origin for load scanner. Cleared automatically when a load is assigned.</p>
                </Field>
              </div>
              <Sec title='Carrier Info' />
              <Field label='MC Number' icon={<Hash size={10} />}>
                <input className={inp} value={form.mc_number??''} onChange={e=>str('mc_number',e.target.value)} placeholder='MC-XXXXXXX' />
              </Field>
              <Field label='DOT Number' icon={<Hash size={10} />}>
                <input className={inp} value={form.dot_number??''} onChange={e=>str('dot_number',e.target.value)} placeholder='DOT-XXXXXXX' />
              </Field>
              <Field label='CDL Number' icon={<Tag size={10} />}>
                <input className={inp} value={form.cdl_number??''} onChange={e=>str('cdl_number',e.target.value)} placeholder='CDL number' />
              </Field>
              <Field label='CDL Expiry' icon={<Calendar size={10} />}>
                <input className={inp} type='date' value={form.cdl_expiry??''} onChange={e=>str('cdl_expiry',e.target.value)} />
              </Field>
              <Field label='Insurance Expiry' icon={<Calendar size={10} />}>
                <input className={inp} type='date' value={form.insurance_expiry??''} onChange={e=>str('insurance_expiry',e.target.value)} />
              </Field>
              <Field label='Start Date' icon={<Calendar size={10} />}>
                <input className={inp} type='date' value={form.start_date??''} onChange={e=>str('start_date',e.target.value)} />
              </Field>
              <Sec title='Equipment' />
              <Field label='Truck Type' icon={<Truck size={10} />}>
                <select className={inp} value={form.truck_type??''} onChange={e=>str('truck_type',e.target.value)}>
                  <option value=''>Select type...</option>
                  {TRUCK_TYPES.map(t=><option key={t} value={t}>{t}</option>)}
                </select>
              </Field>
              <Field label='Trailer Type' icon={<Truck size={10} />}>
                <select className={inp} value={form.trailer_type??''} onChange={e=>str('trailer_type',e.target.value)}>
                  <option value=''>Select type...</option>
                  {TRAILER_TYPES_DRV.map(t=><option key={t} value={t}>{t}</option>)}
                </select>
              </Field>
              <Sec title='Dispatch Settings' />
              <Field label='Min RPM ($/mi)' icon={<DollarSign size={10} />}>
                <input className={inp} type='number' step='0.01' min='0' value={form.min_rpm??''} onChange={e=>num('min_rpm',e.target.value)} placeholder='e.g. 2.50' />
              </Field>
              <Field label='Dispatch %' icon={<DollarSign size={10} />}>
                <input className={inp} type='number' step='0.1' min='0' max='100' value={form.dispatch_percent} onChange={e=>setForm(p=>({...p,dispatch_percent:parseFloat(e.target.value)||7}))} />
              </Field>
              <Field label='Factoring Company' icon={<Building2 size={10} />}>
                <input className={inp} value={form.factoring_company??''} onChange={e=>str('factoring_company',e.target.value)} placeholder='OTR Capital, RTS...' />
              </Field>
              <div className='col-span-2'>
                <Field label='Preferred Lanes' icon={<MapPin size={10} />}>
                  <input className={inp} value={form.preferred_lanes??''} onChange={e=>str('preferred_lanes',e.target.value)} placeholder='e.g. Southeast, TX to CA, OTR' />
                </Field>
              </div>
              <div className='col-span-2'>
                <Field label='Notes' icon={<FileText size={10} />}>
                  <textarea className={`${inp} h-20 py-2 resize-none`} value={form.notes??''} onChange={e=>str('notes',e.target.value)} placeholder='Internal notes...' />
                </Field>
              </div>
            </div>
            {error && <p className='mt-3 text-xs text-red-400'>{error}</p>}
          </div>
          <div className='flex items-center justify-end gap-3 px-6 py-4 border-t border-surface-500'>
            <button type='button' onClick={onClose} className='px-4 h-8 text-sm text-gray-400 hover:text-gray-200 transition-colors'>Cancel</button>
            <button type='submit' disabled={saving} className='px-5 h-8 text-sm font-semibold bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white rounded-lg transition-colors'>
              {saving ? 'Saving...' : driver ? 'Save Changes' : 'Create Driver'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
