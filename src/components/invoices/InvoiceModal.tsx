import { useState, useEffect } from 'react'
import { X, FileText, Truck, DollarSign, Calendar, Hash } from 'lucide-react'
import type { Invoice, CreateInvoiceDto, InvoiceStatus, Load, Driver, Broker } from '../../types/models'
import { INVOICE_STATUSES, genInvoiceNumber } from './constants'

interface Props {
  invoice: Invoice | null
  prefillLoad?: Load | null
  onSave: (inv: Invoice) => void
  onClose: () => void
}

const BLANK: CreateInvoiceDto = {
  invoice_number: '', load_id: null, broker_id: null, driver_id: null,
  week_ending: null, driver_gross: null, dispatch_pct: 7,
  dispatch_fee: null, sent_date: null, paid_date: null,
  status: 'Draft', notes: null,
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

export function InvoiceModal({ invoice, prefillLoad, onSave, onClose }: Props) {
  const [form, setForm] = useState<CreateInvoiceDto>(BLANK)
  const [loads, setLoads] = useState<Load[]>([])
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [brokers, setBrokers] = useState<Broker[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([window.api.loads.list(), window.api.drivers.list(), window.api.brokers.list()]).then(([l, d, b]) => {
      setLoads(l); setDrivers(d); setBrokers(b)
    })
    if (invoice) {
      const { id, created_at, updated_at, ...rest } = invoice
      setForm({ ...BLANK, ...rest })
    } else if (prefillLoad) {
      const fee = prefillLoad.rate != null && prefillLoad.dispatch_pct != null
        ? +(prefillLoad.rate * prefillLoad.dispatch_pct / 100).toFixed(2) : null
      setForm({
        ...BLANK,
        invoice_number: genInvoiceNumber(),
        load_id: prefillLoad.id,
        broker_id: prefillLoad.broker_id,
        driver_id: prefillLoad.driver_id,
        driver_gross: prefillLoad.rate,
        dispatch_pct: prefillLoad.dispatch_pct ?? 7,
        dispatch_fee: fee,
        week_ending: prefillLoad.delivery_date ?? new Date().toISOString().split('T')[0],
      })
    } else {
      setForm({ ...BLANK, invoice_number: genInvoiceNumber() })
    }
  }, [invoice, prefillLoad])

  // Recalculate fee whenever gross or pct change
  const recalcFee = (gross: number | null, pct: number | null) =>
    gross != null && pct != null ? +(gross * pct / 100).toFixed(2) : null

  const setGross = (v: string) => {
    const gross = v ? parseFloat(v) : null
    setForm(p => ({ ...p, driver_gross: gross, dispatch_fee: recalcFee(gross, p.dispatch_pct) }))
  }
  const setPct = (v: string) => {
    const pct = v ? parseFloat(v) : null
    setForm(p => ({ ...p, dispatch_pct: pct, dispatch_fee: recalcFee(p.driver_gross, pct) }))
  }

  const handleLoadChange = (loadId: string) => {
    if (!loadId) { setForm(p => ({ ...p, load_id: null })); return }
    const load = loads.find(l => l.id === parseInt(loadId))
    if (load) {
      const fee = recalcFee(load.rate, load.dispatch_pct)
      setForm(p => ({
        ...p, load_id: load.id, broker_id: load.broker_id, driver_id: load.driver_id,
        driver_gross: load.rate, dispatch_pct: load.dispatch_pct ?? p.dispatch_pct,
        dispatch_fee: fee, week_ending: load.delivery_date ?? p.week_ending,
      }))
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.invoice_number.trim()) { setError('Invoice number is required.'); return }
    setSaving(true); setError('')
    try {
      const saved = invoice
        ? await window.api.invoices.update(invoice.id, form) as Invoice
        : await window.api.invoices.create(form)
      onSave(saved)
    } catch { setError('Failed to save. Please try again.'); setSaving(false) }
  }

  const eligibleLoads = loads.filter(l => ['Delivered', 'Invoiced', 'Paid'].includes(l.status))

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm'>
      <div className='w-full max-w-xl bg-surface-800 border border-surface-400 rounded-2xl shadow-2xl mx-4 max-h-[90vh] flex flex-col animate-fade-in'>
        <div className='flex items-center justify-between px-6 py-4 border-b border-surface-500'>
          <h2 className='text-base font-semibold text-gray-100'>{invoice ? 'Edit Invoice' : 'Generate Invoice'}</h2>
          <button onClick={onClose} className='p-1.5 rounded-lg hover:bg-surface-600 text-gray-500 hover:text-gray-300'><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} className='flex flex-col flex-1 min-h-0'>
          <div className='overflow-y-auto flex-1 px-6 py-5'>
            <div className='grid grid-cols-2 gap-4'>
              <Field label='Invoice Number *' icon={<Hash size={10} />}>
                <input className={`${inp} font-mono`} value={form.invoice_number}
                  onChange={e => setForm(p => ({ ...p, invoice_number: e.target.value }))} required />
              </Field>
              <Field label='Status' icon={<FileText size={10} />}>
                <select className={inp} value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value as InvoiceStatus }))}>
                  {INVOICE_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>
              <div className='col-span-2'>
                <Field label='Link to Load (auto-fills fields)' icon={<Truck size={10} />}>
                  <select className={inp} value={form.load_id ?? ''} onChange={e => handleLoadChange(e.target.value)}>
                    <option value=''>No linked load</option>
                    {eligibleLoads.map(l => {
                      const r = [l.origin_city, l.origin_state].filter(Boolean).join(', ')
                      const d = [l.dest_city, l.dest_state].filter(Boolean).join(', ')
                      return <option key={l.id} value={l.id}>{l.load_id ?? `#${l.id}`}{r && d ? ` -- ${r} to ${d}` : ''}</option>
                    })}
                  </select>
                  {eligibleLoads.length === 0 && (
                    <p className='text-2xs text-gray-600 mt-1'>No completed loads available. Loads must be Delivered, Invoiced, or Paid.</p>
                  )}
                </Field>
              </div>
              <Field label='Driver' icon={<Truck size={10} />}>
                <select className={inp} value={form.driver_id ?? ''} onChange={e => setForm(p => ({ ...p, driver_id: e.target.value ? +e.target.value : null }))}>
                  <option value=''>None</option>
                  {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </Field>
              <Field label='Broker' icon={<FileText size={10} />}>
                <select className={inp} value={form.broker_id ?? ''} onChange={e => setForm(p => ({ ...p, broker_id: e.target.value ? +e.target.value : null }))}>
                  <option value=''>None</option>
                  {brokers.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </Field>
              <Field label='Week Ending' icon={<Calendar size={10} />}>
                <input className={inp} type='date' value={form.week_ending ?? ''} onChange={e => setForm(p => ({ ...p, week_ending: e.target.value || null }))} />
              </Field>
              <Field label='Gross Rate ($)' icon={<DollarSign size={10} />}>
                <input className={inp} type='number' min='0' step='0.01' value={form.driver_gross ?? ''} onChange={e => setGross(e.target.value)} placeholder='e.g. 2100' />
              </Field>
              <Field label='Dispatch %' icon={<DollarSign size={10} />}>
                <input className={inp} type='number' step='0.1' min='0' max='100' value={form.dispatch_pct ?? 7} onChange={e => setPct(e.target.value)} />
              </Field>
              <div className='col-span-2'>
                <Field label='Dispatch Fee (auto-calculated)' icon={<DollarSign size={10} />}>
                  <div className='flex items-center gap-3'>
                    <input className={`${inp} font-mono font-semibold text-green-400 bg-surface-400/50 flex-1`}
                      value={form.dispatch_fee != null ? `$${form.dispatch_fee.toFixed(2)}` : ''} readOnly placeholder='Auto-calculated' />
                    {form.driver_gross != null && form.dispatch_pct != null && (
                      <p className='text-2xs text-gray-600 shrink-0'>${form.driver_gross.toLocaleString()} x {form.dispatch_pct}%</p>
                    )}
                  </div>
                </Field>
              </div>
              <Field label='Sent Date' icon={<Calendar size={10} />}>
                <input className={inp} type='date' value={form.sent_date ?? ''} onChange={e => setForm(p => ({ ...p, sent_date: e.target.value || null }))} />
              </Field>
              <Field label='Paid Date' icon={<Calendar size={10} />}>
                <input className={inp} type='date' value={form.paid_date ?? ''} onChange={e => setForm(p => ({ ...p, paid_date: e.target.value || null }))} />
              </Field>
              <div className='col-span-2'>
                <Field label='Notes' icon={<FileText size={10} />}>
                  <textarea className={`${inp} h-16 py-2 resize-none`} value={form.notes ?? ''}
                    onChange={e => setForm(p => ({ ...p, notes: e.target.value || null }))} placeholder='Internal notes...' />
                </Field>
              </div>
            </div>
            {error && <p className='mt-3 text-xs text-red-400'>{error}</p>}
          </div>
          <div className='flex items-center justify-end gap-3 px-6 py-4 border-t border-surface-500'>
            <button type='button' onClick={onClose} className='px-4 h-8 text-sm text-gray-400 hover:text-gray-200'>Cancel</button>
            <button type='submit' disabled={saving}
              className='px-5 h-8 text-sm font-semibold bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white rounded-lg transition-colors'>
              {saving ? 'Saving...' : invoice ? 'Save Changes' : 'Generate Invoice'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
