import type { LoadStatus } from '../../types/models'

export const LOAD_STATUS_STYLES: Record<LoadStatus, string> = {
  Searching:    'bg-yellow-900/30 border-yellow-700/40 text-yellow-400',
  Booked:       'bg-blue-900/30 border-blue-700/40 text-blue-400',
  'Picked Up':  'bg-orange-900/30 border-orange-700/40 text-orange-400',
  'In Transit': 'bg-indigo-900/30 border-indigo-700/40 text-indigo-400',
  Delivered:    'bg-teal-900/30 border-teal-700/40 text-teal-400',
  Invoiced:     'bg-purple-900/30 border-purple-700/40 text-purple-400',
  Paid:         'bg-green-900/30 border-green-700/40 text-green-400',
}

export const LOAD_STATUSES: LoadStatus[] = ['Searching', 'Booked', 'Picked Up', 'In Transit', 'Delivered', 'Invoiced', 'Paid']
export const LOAD_STATUS_NEXT: Partial<Record<LoadStatus, LoadStatus>> = {
  Searching: 'Booked', Booked: 'Picked Up', 'Picked Up': 'In Transit',
  'In Transit': 'Delivered', Delivered: 'Invoiced', Invoiced: 'Paid',
}
