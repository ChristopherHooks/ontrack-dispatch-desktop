import type { TaskCategory, TaskPriority } from '../../types/models'

export const CATEGORY_STYLES: Record<string, string> = {
  Marketing: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
  Dispatch:  'bg-blue-500/20 text-blue-300 border-blue-500/40',
  Leads:     'bg-green-500/20 text-green-300 border-green-500/40',
  Admin:     'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
  Other:     'bg-gray-500/20 text-gray-400 border-gray-500/40',
}

export const PRIORITY_STYLES: Record<TaskPriority, string> = {
  High:   'bg-red-500/20 text-red-300 border-red-500/40',
  Medium: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
  Low:    'bg-gray-500/20 text-gray-400 border-gray-500/40',
}

export const PRIORITY_DOT: Record<TaskPriority, string> = {
  High:   'bg-red-400',
  Medium: 'bg-orange-400',
  Low:    'bg-gray-500',
}

export const CATEGORIES: TaskCategory[] = ['Marketing', 'Dispatch', 'Leads', 'Admin', 'Other']
export const PRIORITIES: TaskPriority[]  = ['High', 'Medium', 'Low']

export const CATEGORY_ICONS: Record<string, string> = {
  Marketing: 'M',
  Dispatch:  'D',
  Leads:     'L',
  Admin:     'A',
  Other:     'O',
}

/** Returns today's date as YYYY-MM-DD */
export function todayDate(): string {
  return new Date().toISOString().split('T')[0]
}

const DOW = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']

/** True if a task is relevant for today's checklist */
export function isTaskForToday(dueDate: string | null, _recurring: 0 | 1): boolean {
  if (!dueDate) return false
  if (dueDate === 'Daily') return true
  // Day-of-week recurring: 'Monday', 'Tuesday', etc.
  if (DOW.includes(dueDate)) return dueDate === DOW[new Date().getDay()]
  // Specific date
  return dueDate === todayDate()
}
