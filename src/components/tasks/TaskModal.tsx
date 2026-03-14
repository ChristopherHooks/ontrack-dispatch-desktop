import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import type { Task, CreateTaskDto, UpdateTaskDto } from '../../types/models'
import { CATEGORIES, PRIORITIES, todayDate } from './constants'

interface Props {
  task?: Task | null
  onSave: (dto: CreateTaskDto | UpdateTaskDto) => Promise<void>
  onClose: () => void
}

const BLANK: CreateTaskDto = {
  title: '',
  category: 'Dispatch',
  priority: 'Medium',
  due_date: 'Daily',
  time_of_day: '',
  recurring: 0,
  status: 'Pending',
  assigned_to: null,
  notes: '',
}

export function TaskModal({ task, onSave, onClose }: Props) {
  const [form, setForm] = useState<CreateTaskDto>(BLANK)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (task) {
      setForm({
        title:       task.title,
        category:    task.category,
        priority:    task.priority,
        due_date:    task.due_date,
        time_of_day: task.time_of_day ?? '',
        recurring:   task.recurring,
        status:      task.status,
        assigned_to: task.assigned_to,
        notes:       task.notes ?? '',
      })
    } else {
      setForm(BLANK)
    }
  }, [task])

  function set(key: keyof CreateTaskDto, val: unknown) {
    setForm(f => ({ ...f, [key]: val }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim()) { setError('Title is required'); return }
    setSaving(true)
    try {
      await onSave({ ...form, title: form.title.trim() })
      onClose()
    } catch (err) {
      setError('Failed to save task')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm'>
      <div className='bg-surface-800 rounded-xl border border-surface-400 shadow-2xl w-full max-w-md mx-4'>
        <div className='flex items-center justify-between px-5 py-4 border-b border-surface-400'>
          <h2 className='text-sm font-semibold text-gray-100'>{task ? 'Edit Task' : 'New Task'}</h2>
          <button onClick={onClose} className='text-gray-500 hover:text-gray-300 transition-colors'>
            <X size={16} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className='p-5 space-y-4'>
          {error && <p className='text-xs text-red-400 bg-red-900/20 border border-red-800 rounded-lg px-3 py-2'>{error}</p>}

          <div>
            <Label>Title *</Label>
            <input
              value={form.title}
              onChange={e => set('title', e.target.value)}
              placeholder='e.g. Call driver about load'
              className='w-full mt-1 px-3 py-2 bg-surface-600 border border-surface-400 rounded-lg text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-orange-500'
            />
          </div>

          <div className='grid grid-cols-2 gap-3'>
            <div>
              <Label>Category</Label>
              <select
                value={form.category ?? ''}
                onChange={e => set('category', e.target.value)}
                className='w-full mt-1 px-3 py-2 bg-surface-600 border border-surface-400 rounded-lg text-sm text-gray-200 focus:outline-none focus:border-orange-500'
              >
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <Label>Priority</Label>
              <select
                value={form.priority}
                onChange={e => set('priority', e.target.value as any)}
                className='w-full mt-1 px-3 py-2 bg-surface-600 border border-surface-400 rounded-lg text-sm text-gray-200 focus:outline-none focus:border-orange-500'
              >
                {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>

          <div className='grid grid-cols-2 gap-3'>
            <div>
              <Label>Due Date</Label>
              <input
                value={form.due_date ?? ''}
                onChange={e => set('due_date', e.target.value)}
                placeholder='Daily or YYYY-MM-DD'
                className='w-full mt-1 px-3 py-2 bg-surface-600 border border-surface-400 rounded-lg text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-orange-500'
              />
              <p className='text-2xs text-gray-600 mt-1'>Use "Daily" for everyday tasks</p>
            </div>
            <div>
              <Label>Time of Day</Label>
              <input
                value={form.time_of_day ?? ''}
                onChange={e => set('time_of_day', e.target.value)}
                placeholder='e.g. 9:00 AM'
                className='w-full mt-1 px-3 py-2 bg-surface-600 border border-surface-400 rounded-lg text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-orange-500'
              />
            </div>
          </div>

          <div className='flex items-center gap-3'>
            <button
              type='button'
              onClick={() => set('recurring', form.recurring === 1 ? 0 : 1)}
              className={[
                'relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none',
                form.recurring === 1 ? 'bg-orange-600' : 'bg-surface-400',
              ].join(' ')}
            >
              <span className={[
                'inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform',
                form.recurring === 1 ? 'translate-x-4' : 'translate-x-0.5',
              ].join(' ')} />
            </button>
            <span className='text-sm text-gray-300'>Recurring task</span>
          </div>

          <div>
            <Label>Notes</Label>
            <textarea
              value={form.notes ?? ''}
              onChange={e => set('notes', e.target.value)}
              rows={2}
              placeholder='Optional notes...'
              className='w-full mt-1 px-3 py-2 bg-surface-600 border border-surface-400 rounded-lg text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-orange-500 resize-none'
            />
          </div>

          <div className='flex justify-end gap-2 pt-1'>
            <button
              type='button'
              onClick={onClose}
              className='px-4 py-2 text-sm text-gray-400 hover:text-gray-200 transition-colors'
            >
              Cancel
            </button>
            <button
              type='submit'
              disabled={saving}
              className='px-5 py-2 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors'
            >
              {saving ? 'Saving...' : task ? 'Save Changes' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return <p className='text-xs font-medium text-gray-400'>{children}</p>
}
