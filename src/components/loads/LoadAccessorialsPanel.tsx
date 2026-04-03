import { useState, useEffect } from 'react'
import { Plus, Trash2, DollarSign } from 'lucide-react'
import type { LoadAccessorial, AccessorialType } from '../../types/models'

const ACCESSORIAL_TYPES: AccessorialType[] = ['Detention', 'Lumper', 'FSC', 'Layover', 'TONU', 'Other']

const TYPE_COLOR: Record<AccessorialType, string> = {
  Detention: 'text-yellow-400 bg-yellow-900/20 border-yellow-700/40',
  Lumper:    'text-blue-400  bg-blue-900/20  border-blue-700/40',
  FSC:       'text-orange-400 bg-orange-900/20 border-orange-700/40',
  Layover:   'text-purple-400 bg-purple-900/20 border-purple-700/40',
  TONU:      'text-red-400   bg-red-900/20   border-red-700/40',
  Other:     'text-gray-400  bg-surface-600  border-surface-400',
}

interface Props {
  loadId: number
}

const inp = 'w-full bg-surface-700 border border-surface-500 rounded-lg px-2.5 py-1.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-orange-600/60'

export function LoadAccessorialsPanel({ loadId }: Props) {
  const [items,   setItems]   = useState<LoadAccessorial[]>([])
  const [adding,  setAdding]  = useState(false)
  const [busy,    setBusy]    = useState(false)
  const [form,    setForm]    = useState<{ type: AccessorialType; amount: string; notes: string }>({
    type: 'Detention', amount: '', notes: '',
  })

  useEffect(() => {
    if (!loadId) return
    window.api.loadAccessorials.list(loadId).then(setItems).catch(() => {})
  }, [loadId])

  const total = items.reduce((s, i) => s + i.amount, 0)

  const handleAdd = async () => {
    const amt = parseFloat(form.amount)
    if (isNaN(amt) || amt <= 0) return
    setBusy(true)
    try {
      const entry = await window.api.loadAccessorials.create({
        load_id: loadId,
        type:    form.type,
        amount:  amt,
        notes:   form.notes.trim() || null,
      })
      setItems(prev => [...prev, entry])
      setForm({ type: 'Detention', amount: '', notes: '' })
      setAdding(false)
    } finally {
      setBusy(false)
    }
  }

  const handleDelete = async (id: number) => {
    await window.api.loadAccessorials.delete(id)
    setItems(prev => prev.filter(x => x.id !== id))
  }

  return (
    <div className='space-y-3'>
      {/* Summary */}
      {items.length > 0 && (
        <div className='flex items-center justify-between px-3 py-2 bg-surface-700/60 rounded-lg border border-surface-500'>
          <span className='text-xs text-gray-500'>{items.length} accessorial{items.length !== 1 ? 's' : ''}</span>
          <span className='text-sm font-semibold font-mono text-green-400 flex items-center gap-1'>
            <DollarSign size={12} />
            {total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
      )}

      {/* Existing items */}
      {items.length > 0 && (
        <div className='space-y-1.5'>
          {items.map(item => (
            <div key={item.id} className='flex items-center gap-2 group'>
              <span className={`text-2xs px-2 py-0.5 rounded-full border font-medium shrink-0 ${TYPE_COLOR[item.type as AccessorialType] ?? TYPE_COLOR.Other}`}>
                {item.type}
              </span>
              <span className='text-xs font-mono text-gray-200 shrink-0'>
                ${item.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              {item.notes && (
                <span className='text-xs text-gray-500 truncate flex-1'>{item.notes}</span>
              )}
              <button
                onClick={() => handleDelete(item.id)}
                className='opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 transition-all ml-auto shrink-0'
              >
                <Trash2 size={11} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add form */}
      {adding ? (
        <div className='space-y-2 bg-surface-700/50 border border-surface-600 rounded-xl p-3'>
          <div className='grid grid-cols-2 gap-2'>
            <div>
              <label className='text-2xs text-gray-600 mb-1 block'>Type</label>
              <select
                className={inp}
                value={form.type}
                onChange={e => setForm(p => ({ ...p, type: e.target.value as AccessorialType }))}
              >
                {ACCESSORIAL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className='text-2xs text-gray-600 mb-1 block'>Amount ($)</label>
              <input
                className={inp}
                type='number'
                min='0'
                step='0.01'
                value={form.amount}
                onChange={e => setForm(p => ({ ...p, amount: e.target.value }))}
                placeholder='e.g. 150.00'
              />
            </div>
          </div>
          <div>
            <label className='text-2xs text-gray-600 mb-1 block'>Notes (optional)</label>
            <input
              className={inp}
              value={form.notes}
              onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
              placeholder='e.g. 2 hr detention at shipper'
            />
          </div>
          <div className='flex items-center gap-2 justify-end'>
            <button
              onClick={() => setAdding(false)}
              className='text-xs text-gray-500 hover:text-gray-300 transition-colors'
            >
              Cancel
            </button>
            <button
              onClick={handleAdd}
              disabled={busy || !form.amount}
              className='px-3 py-1.5 text-xs font-medium bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white rounded-lg transition-colors'
            >
              {busy ? 'Adding...' : 'Add'}
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className='flex items-center gap-1.5 text-xs text-gray-600 hover:text-orange-400 transition-colors'
        >
          <Plus size={12} /> Add accessorial
        </button>
      )}
    </div>
  )
}
