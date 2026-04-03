import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import type { DriverProspect, CreateDriverProspectDto } from '../../types/models'
import {
  STAGES, PRIORITIES, SOURCES, CDL_CLASSES, EQUIPMENT_TYPES, CONTACT_METHODS,
} from './constants'

interface Props {
  prospect: DriverProspect | null   // null = create new
  onClose:  () => void
  onSave:   (saved: DriverProspect) => void
}

const EMPTY: CreateDriverProspectDto = {
  name:                  '',
  phone:                 null,
  email:                 null,
  city:                  null,
  state:                 null,
  cdl_class:             null,
  equipment_interest:    null,
  years_experience:      null,
  source:                null,
  stage:                 'Spotted',
  priority:              'Medium',
  follow_up_date:        null,
  notes:                 null,
  last_contact_date:     null,
  contact_attempt_count: 0,
  contact_method:        null,
  converted_driver_id:   null,
}

function field(label: string, children: React.ReactNode) {
  return (
    <div className='space-y-1'>
      <label className='text-xs text-gray-400 font-medium'>{label}</label>
      {children}
    </div>
  )
}

const inputCls = 'w-full bg-surface-600 border border-surface-400 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-orange-600/60'
const selectCls = inputCls

export function ProspectModal({ prospect, onClose, onSave }: Props) {
  const isEdit = prospect !== null
  const [form, setForm] = useState<CreateDriverProspectDto>(
    isEdit ? {
      name:                  prospect.name,
      phone:                 prospect.phone,
      email:                 prospect.email,
      city:                  prospect.city,
      state:                 prospect.state,
      cdl_class:             prospect.cdl_class,
      equipment_interest:    prospect.equipment_interest,
      years_experience:      prospect.years_experience,
      source:                prospect.source,
      stage:                 prospect.stage,
      priority:              prospect.priority,
      follow_up_date:        prospect.follow_up_date,
      notes:                 prospect.notes,
      last_contact_date:     prospect.last_contact_date,
      contact_attempt_count: prospect.contact_attempt_count,
      contact_method:        prospect.contact_method,
      converted_driver_id:   prospect.converted_driver_id,
    } : { ...EMPTY }
  )
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState<string | null>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const set = <K extends keyof CreateDriverProspectDto>(key: K, val: CreateDriverProspectDto[K]) =>
    setForm(f => ({ ...f, [key]: val }))

  const nullOrStr = (v: string) => v.trim() === '' ? null : v.trim()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) { setError('Name is required.'); return }
    setSaving(true)
    setError(null)
    try {
      const dto: CreateDriverProspectDto = {
        ...form,
        name:               form.name.trim(),
        phone:              nullOrStr(form.phone ?? ''),
        email:              nullOrStr(form.email ?? ''),
        city:               nullOrStr(form.city ?? ''),
        state:              nullOrStr(form.state ?? ''),
        cdl_class:          nullOrStr(form.cdl_class ?? ''),
        equipment_interest: nullOrStr(form.equipment_interest ?? ''),
        notes:              nullOrStr(form.notes ?? ''),
        contact_method:     nullOrStr(form.contact_method ?? ''),
        source:             nullOrStr(form.source ?? ''),
      }
      const saved = isEdit
        ? await window.api.driverProspects.update(prospect.id, dto)
        : await window.api.driverProspects.create(dto)
      if (!saved) throw new Error('No record returned from server.')
      onSave(saved as DriverProspect)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60'>
      <div className='bg-surface-700 border border-surface-400 rounded-xl shadow-xl w-full max-w-xl max-h-[90vh] flex flex-col'>
        {/* Header */}
        <div className='flex items-center justify-between px-5 py-4 border-b border-surface-500 shrink-0'>
          <h2 className='text-sm font-semibold text-gray-100'>
            {isEdit ? 'Edit Prospect' : 'Add Driver Prospect'}
          </h2>
          <button onClick={onClose} className='text-gray-500 hover:text-gray-300 transition-colors'>
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className='overflow-y-auto flex-1 px-5 py-4 space-y-4'>
          {error && (
            <div className='bg-red-900/30 border border-red-800/50 text-red-300 text-sm px-3 py-2 rounded-lg'>
              {error}
            </div>
          )}

          {/* Name */}
          {field('Name *', (
            <input
              className={inputCls}
              value={form.name}
              onChange={e => set('name', e.target.value)}
              placeholder='Full name'
              autoFocus
            />
          ))}

          {/* Phone + Email */}
          <div className='grid grid-cols-2 gap-3'>
            {field('Phone', (
              <input
                className={inputCls}
                value={form.phone ?? ''}
                onChange={e => set('phone', e.target.value || null)}
                placeholder='(555) 000-0000'
              />
            ))}
            {field('Email', (
              <input
                className={inputCls}
                type='email'
                value={form.email ?? ''}
                onChange={e => set('email', e.target.value || null)}
                placeholder='driver@example.com'
              />
            ))}
          </div>

          {/* City + State */}
          <div className='grid grid-cols-2 gap-3'>
            {field('City', (
              <input
                className={inputCls}
                value={form.city ?? ''}
                onChange={e => set('city', e.target.value || null)}
                placeholder='City'
              />
            ))}
            {field('State', (
              <input
                className={inputCls}
                value={form.state ?? ''}
                onChange={e => set('state', e.target.value || null)}
                placeholder='TX'
                maxLength={2}
              />
            ))}
          </div>

          {/* Source + CDL Class */}
          <div className='grid grid-cols-2 gap-3'>
            {field('Source', (
              <select
                className={selectCls}
                value={form.source ?? ''}
                onChange={e => set('source', e.target.value || null)}
              >
                <option value=''>-- Select source --</option>
                {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            ))}
            {field('CDL Class', (
              <select
                className={selectCls}
                value={form.cdl_class ?? ''}
                onChange={e => set('cdl_class', e.target.value || null)}
              >
                <option value=''>-- Unknown --</option>
                {CDL_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            ))}
          </div>

          {/* Equipment + Years */}
          <div className='grid grid-cols-2 gap-3'>
            {field('Equipment Interest', (
              <select
                className={selectCls}
                value={form.equipment_interest ?? ''}
                onChange={e => set('equipment_interest', e.target.value || null)}
              >
                <option value=''>-- Unknown --</option>
                {EQUIPMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            ))}
            {field('Years Experience', (
              <input
                className={inputCls}
                type='number'
                min={0}
                max={50}
                value={form.years_experience ?? ''}
                onChange={e => set('years_experience', e.target.value ? parseInt(e.target.value) : null)}
                placeholder='0'
              />
            ))}
          </div>

          {/* Stage + Priority */}
          <div className='grid grid-cols-2 gap-3'>
            {field('Stage', (
              <select
                className={selectCls}
                value={form.stage}
                onChange={e => set('stage', e.target.value as typeof form.stage)}
              >
                {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            ))}
            {field('Priority', (
              <select
                className={selectCls}
                value={form.priority}
                onChange={e => set('priority', e.target.value as typeof form.priority)}
              >
                {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            ))}
          </div>

          {/* Follow-up Date */}
          {field('Follow-up Date', (
            <input
              className={inputCls}
              type='date'
              value={form.follow_up_date ?? ''}
              onChange={e => set('follow_up_date', e.target.value || null)}
            />
          ))}

          {/* Last Contact */}
          <div className='grid grid-cols-2 gap-3'>
            {field('Last Contact Date', (
              <input
                className={inputCls}
                type='date'
                value={form.last_contact_date ?? ''}
                onChange={e => set('last_contact_date', e.target.value || null)}
              />
            ))}
            {field('Contact Method', (
              <select
                className={selectCls}
                value={form.contact_method ?? ''}
                onChange={e => set('contact_method', e.target.value || null)}
              >
                <option value=''>-- None --</option>
                {CONTACT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            ))}
          </div>

          {/* Notes */}
          {field('Notes', (
            <textarea
              className={`${inputCls} resize-none`}
              rows={3}
              value={form.notes ?? ''}
              onChange={e => set('notes', e.target.value || null)}
              placeholder='Any relevant info...'
            />
          ))}
        </form>

        {/* Footer */}
        <div className='flex items-center justify-end gap-3 px-5 py-4 border-t border-surface-500 shrink-0'>
          <button
            type='button'
            onClick={onClose}
            className='px-4 py-2 text-sm text-gray-400 hover:text-gray-200 transition-colors'
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className='px-5 py-2 text-sm font-medium bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white rounded-lg transition-colors'
          >
            {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Prospect'}
          </button>
        </div>
      </div>
    </div>
  )
}
