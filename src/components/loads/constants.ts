import type { LoadStatus } from '../../types/models'

export const LOAD_STATUS_STYLES: Record<LoadStatus, string> = {
  Searching:    'bg-amber-500 border-amber-400 text-white',
  Booked:       'bg-blue-600 border-blue-500 text-white',
  'Picked Up':  'bg-orange-600 border-orange-500 text-white',
  'In Transit': 'bg-indigo-600 border-indigo-500 text-white',
  Delivered:    'bg-teal-600 border-teal-500 text-white',
  Invoiced:     'bg-purple-600 border-purple-500 text-white',
  Paid:         'bg-green-600 border-green-500 text-white',
}

export const LOAD_STATUSES: LoadStatus[] = ['Searching', 'Booked', 'Picked Up', 'In Transit', 'Delivered', 'Invoiced', 'Paid']
export const LOAD_STATUS_NEXT: Partial<Record<LoadStatus, LoadStatus>> = {
  Searching: 'Booked', Booked: 'Picked Up', 'Picked Up': 'In Transit',
  'In Transit': 'Delivered', Delivered: 'Invoiced', Invoiced: 'Paid',
}
