import { Search, Plus, Filter } from 'lucide-react'
import type { TaskCategory } from '../../types/models'
import { CATEGORIES } from './constants'

interface Props {
  search: string
  onSearch: (v: string) => void
  category: string
  onCategory: (v: string) => void
  view: 'today' | 'all' | 'history'
  onView: (v: 'today' | 'all' | 'history') => void
  totalToday: number
  doneToday: number
  onAdd: () => void
}

export function TasksToolbar({
  search, onSearch, category, onCategory,
  view, onView, totalToday, doneToday, onAdd,
}: Props) {
  const pct = totalToday > 0 ? Math.round((doneToday / totalToday) * 100) : 0

  return (
    <div className='space-y-3'>
      {/* View tabs */}
      <div className='flex items-center justify-between'>
        <div className='flex gap-1 bg-surface-600 rounded-lg p-1 border border-surface-400'>
          {(['today', 'all', 'history'] as const).map(v => (
            <button
              key={v}
              onClick={() => onView(v)}
              className={[
                'px-4 py-1.5 rounded-md text-sm font-medium transition-all capitalize',
                view === v
                  ? 'bg-orange-600 text-white shadow-sm'
                  : 'text-gray-400 hover:text-gray-200',
              ].join(' ')}
            >
              {v === 'today' ? 'Today' : v === 'all' ? 'All Tasks' : 'History'}
            </button>
          ))}
        </div>
        <button
          onClick={onAdd}
          className='flex items-center gap-2 bg-orange-600 hover:bg-orange-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors'
        >
          <Plus size={15} />
          Add Task
        </button>
      </div>

      {/* Today progress bar */}
      {view === 'today' && totalToday > 0 && (
        <div className='bg-surface-700 rounded-lg border border-surface-400 px-4 py-3 flex items-center gap-4'>
          <div className='flex-1'>
            <div className='flex justify-between text-xs text-gray-400 mb-1.5'>
              <span>Today's progress</span>
              <span className='font-medium text-gray-200'>{doneToday} / {totalToday} done</span>
            </div>
            <div className='h-2 bg-surface-500 rounded-full overflow-hidden'>
              <div
                className='h-full bg-orange-500 rounded-full transition-all duration-500'
                style={{ width: pct + '%' }}
              />
            </div>
          </div>
          <span className={['text-sm font-bold tabular-nums', pct === 100 ? 'text-green-400' : 'text-orange-400'].join(' ')}>
            {pct}%
          </span>
        </div>
      )}

      {/* Search + filter row (all/history views) */}
      {view !== 'today' && (
        <div className='flex gap-2'>
          <div className='relative flex-1'>
            <Search size={14} className='absolute left-3 top-1/2 -translate-y-1/2 text-gray-500' />
            <input
              value={search}
              onChange={e => onSearch(e.target.value)}
              placeholder='Search tasks...'
              className='w-full pl-8 pr-3 py-2 bg-surface-600 border border-surface-400 rounded-lg text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-orange-500'
            />
          </div>
          <div className='relative'>
            <Filter size={14} className='absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none' />
            <select
              value={category}
              onChange={e => onCategory(e.target.value)}
              className='pl-8 pr-3 py-2 bg-surface-600 border border-surface-400 rounded-lg text-sm text-gray-200 focus:outline-none focus:border-orange-500 appearance-none cursor-pointer'
            >
              <option value=''>All Categories</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
      )}
    </div>
  )
}
