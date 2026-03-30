import { useState, useEffect } from 'react'
import { X, Building2, Phone, Mail, DollarSign, Tag, FileText, Star } from 'lucide-react'
import type { Broker, CreateBrokerDto, BrokerFlag } from '../../types/models'
import { BROKER_FLAGS, CREDIT_RATINGS } from './constants'

interface Props { broker: Broker | null; onSave: (b: Broker) => void; onClose: () => void }

const BLANK: CreateBrokerDto = {
  name: '', mc_number: null, phone: null, email: null,
  payment_terms: 30, credit_rating: null, avg_days_pay: null,
  flag: 'None', notes: null,
  new_authority: 0, min_authority_days: null,
  credit_limit: null,
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

export function BrokerModal({ broker, onSave, onClose }: Props) {
  const [form, setForm] = useState<CreateBrokerDto>(BLANK)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (broker) { const { id, created_at, updated_at, ...rest } = broker; setForm({ ...BLANK, ...rest }) }
    else setForm(BLANK)
  }, [broker])

  const str = (k: keyof CreateBrokerDto, v: string) => setForm(p => ({ ...p, [k]: v || null }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) { setError('Company name is required.'); return }
    setSaving(true); setError('')
    try {
      const notesText = form.notes?.trim() ?? ''
      const saved = broker
        ? await window.api.brokers.update(broker.id, form) as Broker
        : await window.api.brokers.create(form)
      // For new brokers: if notes were entered, also persist them as a Note entity
      // so they appear immediately in the sidebar notes list.
      if (!broker && notesText) {
        await window.api.notes.create({ entity_type: 'broker', entity_id: saved.id, content: notesText, user_id: null })
      }
      onSave(saved)
    } catch { setError('Failed to save. Please try again.'); setSaving(false) }
  }

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm'>
      <div className='w-full max-w-xl bg-surface-800 border border-surface-400 rounded-2xl shadow-2xl mx-4 max-h-[90vh] flex flex-col animate-fade-in'>
        <div className='flex items-center justify-between px-6 py-4 border-b border-surface-500'>
          <h2 className='text-base font-semibold text-gray-100'>{broker ? 'Edit Broker' : 'New Broker'}</h2>
          <button onClick={onClose} className='p-1.5 rounded-lg hover:bg-surface-600 text-gray-500 hover:text-gray-300'><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} className='flex flex-col flex-1 min-h-0'>
          <div className='overflow-y-auto flex-1 px-6 py-5'>
            <div className='grid grid-cols-2 gap-4'>
              <div className='col-span-2'>
                <Field label='Company Name *' icon={<Building2 size={10} />}>
                  <input className={inp} value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder='e.g. Coyote Logistics' required />
                </Field>
              </div>
              <Field label='MC Number' icon={<Tag size={10} />}>
                <input className={inp} value={form.mc_number ?? ''} onChange={e => str('mc_number', e.target.value)} placeholder='MC-123456' />
              </Field>
              <Field label='Flag' icon={<Star size={10} />}>
                <select className={inp} value={form.flag} onChange={e => setForm(p => ({ ...p, flag: e.target.value as BrokerFlag }))}>
                  {BROKER_FLAGS.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </Field>
              <Field label='Phone' icon={<Phone size={10} />}>
                <input className={inp} value={form.phone ?? ''} onChange={e => str('phone', e.target.value)} placeholder='(555) 000-0000' />
              </Field>
              <Field label='Email' icon={<Mail size={10} />}>
                <input className={inp} type='email' value={form.email ?? ''} onChange={e => str('email', e.target.value)} placeholder='billing@broker.com' />
              </Field>
              <Field label='Payment Terms (days)' icon={<DollarSign size={10} />}>
                <input className={inp} type='number' min='0' max='180'
                  value={form.payment_terms} onChange={e => setForm(p => ({ ...p, payment_terms: parseInt(e.target.value) || 30 }))} placeholder='30' />
              </Field>
              <Field label='Credit Rating' icon={<Star size={10} />}>
                <select className={inp} value={form.credit_rating ?? ''} onChange={e => str('credit_rating', e.target.value)}>
                  <option value=''>Unknown</option>
                  {CREDIT_RATINGS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </Field>
              <div className='col-span-2'>
                <Field label='Avg Days to Pay' icon={<DollarSign size={10} />}>
                  <input className={inp} type='number' min='0' max='365' value={form.avg_days_pay ?? ''}
                    onChange={e => setForm(p => ({ ...p, avg_days_pay: e.target.value ? parseInt(e.target.value) : null }))} placeholder='e.g. 32' />
                </Field>
              </div>
              <Field label='Works With New Authorities' icon={<Star size={10} />}>
                <select className={inp}
                  value={form.new_authority === 1 ? 'yes' : form.new_authority === 2 ? 'unknown' : 'no'}
                  onChange={e => setForm(p => ({
                    ...p,
                    new_authority: e.target.value === 'yes' ? 1 : e.target.value === 'unknown' ? 2 : 0,
                    min_authority_days: e.target.value === 'yes' ? p.min_authority_days : null,
                  }))}>
                  <option value='unknown'>Unknown</option>
                  <option value='yes'>Yes</option>
                  <option value='no'>No</option>
                </select>
              </Field>
              <Field label='Min Authority Age' icon={<Tag size={10} />}>
                <select className={inp} disabled={form.new_authority !== 1}
                  value={form.min_authority_days ?? ''}
                  onChange={e => setForm(p => ({ ...p, min_authority_days: e.target.value ? parseInt(e.target.value) : null }))}>
                  <option value=''>Any age OK</option>
                  <option value='30'>30+ days</option>
                  <option value='60'>60+ days</option>
                  <option value='90'>90+ days</option>
                  <option value='180'>180+ days</option>
                </select>
              </Field>
              <Field label='Credit Limit ($)' icon={<DollarSign size={10} />}>
                <input className={inp} type='number' min='0' step='500'
                  value={form.credit_limit ?? ''}
                  onChange={e => setForm(p => ({ ...p, credit_limit: e.target.value ? parseFloat(e.target.value) : null }))}
                  placeholder='e.g. 5000 — alert if exceeded' />
              </Field>
              <div className='col-span-2'>
                <Field label='Notes' icon={<FileText size={10} />}>
                  <textarea className={`${inp} h-16 py-2 resize-none`} value={form.notes ?? ''} onChange={e => str('notes', e.target.value)} placeholder='Internal notes about this broker...' />
                </Field>
              </div>
            </div>
            {error && <p className='mt-3 text-xs text-red-400'>{error}</p>}
          </div>
          <div className='flex items-center justify-end gap-3 px-6 py-4 border-t border-surface-500'>
            <button type='button' onClick={onClose} className='px-4 h-8 text-sm text-gray-400 hover:text-gray-200'>Cancel</button>
            <button type='submit' disabled={saving}
              className='px-5 h-8 text-sm font-semibold bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white rounded-lg transition-colors'>
              {saving ? 'Saving...' : broker ? 'Save Changes' : 'Add Broker'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
