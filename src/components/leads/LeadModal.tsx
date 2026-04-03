import { useState, useEffect } from 'react'
import { X, User, Building2, Phone, Mail, MapPin, Truck, Calendar, Tag, Star, FileText } from 'lucide-react'
import type { Lead, CreateLeadDto, LeadStatus, LeadPriority } from '../../types/models'
import { STATUSES, PRIORITIES, TRAILER_TYPES, LEAD_SOURCES } from './constants'

interface Props { lead: Lead | null; onSave: (l: Lead) => void; onClose: () => void }

const BLANK: CreateLeadDto = {
  name: '', company: null, mc_number: null, phone: null, email: null,
  city: null, state: null, trailer_type: null, trailer_length: null, authority_date: null,
  fleet_size: null, source: null, status: 'New', priority: 'Medium',
  follow_up_date: null, follow_up_time: null, notes: null,
  last_contact_date: null, contact_attempt_count: 0,
  contact_method: null, outreach_outcome: null, follow_up_notes: null,
}

const inp = 'w-full h-8 px-3 bg-surface-500 border border-surface-400 rounded-lg text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-orange-600/60 focus:ring-1 focus:ring-orange-600/20 transition-colors'
const sel = inp

function Field({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <label className='flex items-center gap-1.5 text-2xs text-gray-500 mb-1.5 font-medium uppercase tracking-wider'>
        {icon}{label}
      </label>
      {children}
    </div>
  )
}

export function LeadModal({ lead, onSave, onClose }: Props) {
  const [form, setForm] = useState<CreateLeadDto>(BLANK)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (lead) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id, created_at, updated_at, ...rest } = lead
      setForm({ ...BLANK, ...rest })
    } else {
      setForm(BLANK)
    }
  }, [lead])

  const set = <K extends keyof CreateLeadDto>(k: K, v: string) =>
    setForm(p => ({ ...p, [k]: v || null }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) { setError('Name is required.'); return }
    setSaving(true); setError('')
    try {
      const saved = lead
        ? await window.api.leads.update(lead.id, form) as Lead
        : await window.api.leads.create(form)
      onSave(saved)
    } catch {
      setError('Failed to save. Please try again.')
      setSaving(false)
    }
  }

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm'>
      <div className='w-full max-w-2xl bg-surface-800 border border-surface-400 rounded-2xl shadow-2xl mx-4 max-h-[90vh] flex flex-col animate-fade-in'>

        {/* Header */}
        <div className='flex items-center justify-between px-6 py-4 border-b border-surface-500'>
          <h2 className='text-base font-semibold text-gray-100'>{lead ? 'Edit Lead' : 'New Lead'}</h2>
          <button onClick={onClose} className='p-1.5 rounded-lg hover:bg-surface-600 text-gray-500 hover:text-gray-300 transition-colors'><X size={16} /></button>
        </div>

        {/* Scrollable body */}
        <form onSubmit={handleSubmit} className='flex flex-col flex-1 min-h-0'>
          <div className='overflow-y-auto flex-1 px-6 py-5'>
            <div className='grid grid-cols-2 gap-4'>

              <div className='col-span-2'>
                <Field label='Name *' icon={<User size={10} />}>
                  <input className={inp} value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder='Driver or owner name' required />
                </Field>
              </div>

              <Field label='Company' icon={<Building2 size={10} />}>
                <input className={inp} value={form.company ?? ''} onChange={e => set('company', e.target.value)} placeholder='LLC name' />
              </Field>
              <Field label='MC Number' icon={<Tag size={10} />}>
                <input className={inp} value={form.mc_number ?? ''} onChange={e => set('mc_number', e.target.value)} placeholder='MC-XXXXXXX' />
              </Field>
              <Field label='Phone' icon={<Phone size={10} />}>
                <input className={inp} type='tel' value={form.phone ?? ''} onChange={e => set('phone', e.target.value)} placeholder='(555) 000-0000' />
              </Field>
              <Field label='Email' icon={<Mail size={10} />}>
                <input className={inp} type='email' value={form.email ?? ''} onChange={e => set('email', e.target.value)} placeholder='owner@company.com' />
              </Field>
              <Field label='City' icon={<MapPin size={10} />}>
                <input className={inp} value={form.city ?? ''} onChange={e => set('city', e.target.value)} placeholder='Charlotte' />
              </Field>
              <Field label='State' icon={<MapPin size={10} />}>
                <input className={`${inp} uppercase`} value={form.state ?? ''} onChange={e => set('state', e.target.value.toUpperCase().slice(0, 2))} placeholder='NC' maxLength={2} />
              </Field>
              <Field label='Trailer Type' icon={<Truck size={10} />}>
                <select className={sel} value={form.trailer_type ?? ''} onChange={e => set('trailer_type', e.target.value)}>
                  <option value=''>Select type…</option>
                  {TRAILER_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </Field>
              <Field label="Trailer Length" icon={<Truck size={10} />}>
                <input className={inp} value={form.trailer_length ?? ''} onChange={e => set('trailer_length', e.target.value)} placeholder="e.g. 48', 53', 36' Gooseneck" />
              </Field>
              <Field label='Fleet Size (# of Trucks)' icon={<Truck size={10} />}>
                <input
                  className={inp} type='number' min={1} max={9999}
                  value={form.fleet_size ?? ''}
                  onChange={e => setForm(p => ({ ...p, fleet_size: e.target.value ? parseInt(e.target.value, 10) : null }))}
                  placeholder='e.g. 2'
                />
              </Field>
              <Field label='Authority Date' icon={<Calendar size={10} />}>
                <input className={inp} type='date' value={form.authority_date ?? ''} onChange={e => set('authority_date', e.target.value)} />
              </Field>
              <Field label='Source' icon={<Tag size={10} />}>
                <select className={sel} value={form.source ?? ''} onChange={e => set('source', e.target.value)}>
                  <option value=''>Select source…</option>
                  {LEAD_SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>
              <Field label='Status' icon={<Star size={10} />}>
                <select className={sel} value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value as LeadStatus }))}>
                  {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>
              <Field label='Priority' icon={<Star size={10} />}>
                <select className={sel} value={form.priority} onChange={e => setForm(p => ({ ...p, priority: e.target.value as LeadPriority }))}>
                  {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </Field>

              <div className='col-span-2'>
                <Field label='Follow-Up Date' icon={<Calendar size={10} />}>
                  <div className='flex items-center gap-2 flex-wrap'>
                    <input className={`${inp} max-w-xs`} type='date' value={form.follow_up_date ?? ''} onChange={e => set('follow_up_date', e.target.value)} />
                    <div className='flex items-center gap-1.5'>
                      <label className='text-2xs text-gray-500 whitespace-nowrap'>Reminder time</label>
                      <input className={`${inp} w-32`} type='time' value={form.follow_up_time ?? ''} onChange={e => set('follow_up_time', e.target.value)} />
                    </div>
                  </div>
                </Field>
              </div>
              <div className='col-span-2'>
                <Field label='Notes' icon={<FileText size={10} />}>
                  <textarea className={`${inp} h-20 py-2 resize-none`} value={form.notes ?? ''} onChange={e => set('notes', e.target.value)} placeholder='Initial notes about this lead…' />
                </Field>
              </div>
            </div>
            {error && <p className='mt-3 text-xs text-red-400'>{error}</p>}
          </div>

          {/* Footer */}
          <div className='flex items-center justify-end gap-3 px-6 py-4 border-t border-surface-500'>
            <button type='button' onClick={onClose} className='px-4 h-8 text-sm text-gray-400 hover:text-gray-200 transition-colors'>Cancel</button>
            <button type='submit' disabled={saving} className='px-5 h-8 text-sm font-semibold bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white rounded-lg transition-colors'>
              {saving ? 'Saving…' : lead ? 'Save Changes' : 'Create Lead'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
