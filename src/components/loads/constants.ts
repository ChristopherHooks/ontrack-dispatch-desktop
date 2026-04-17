import type { LoadStatus } from '../../types/models'

export const LOAD_STATUS_STYLES: Record<LoadStatus, string> = {
  Searching:          'bg-amber-500 border-amber-400 text-white',
  Booked:             'bg-blue-600 border-blue-500 text-white',
  'Picked Up':        'bg-orange-600 border-orange-500 text-white',
  'In Transit':       'bg-indigo-600 border-indigo-500 text-white',
  Delivered:          'bg-teal-600 border-teal-500 text-white',
  Invoiced:           'bg-purple-600 border-purple-500 text-white',
  Paid:               'bg-green-600 border-green-500 text-white',
  'Carrier Selected': 'bg-sky-600 border-sky-500 text-white',
}

// Dispatch-mode statuses only — used in dispatch modal and table inline picker
export const LOAD_STATUSES: LoadStatus[] = ['Searching', 'Booked', 'Picked Up', 'In Transit', 'Delivered', 'Invoiced', 'Paid']

// Broker-mode statuses — used in LoadModal when load_mode === 'broker'
export const BROKER_LOAD_STATUSES: LoadStatus[] = ['Searching', 'Carrier Selected', 'Picked Up', 'In Transit', 'Delivered', 'Invoiced', 'Paid']

// All statuses for filter dropdowns (both modes)
export const ALL_LOAD_STATUSES: LoadStatus[] = [...LOAD_STATUSES, 'Carrier Selected']

export const UNASSIGNMENT_REASON_OPTIONS = [
  { value: 'mistaken_assignment',          label: 'Mistaken Assignment',          fallout: false },
  { value: 'admin_correction',             label: 'Admin Correction',             fallout: false },
  { value: 'broker_change',               label: 'Broker Change',                fallout: false },
  { value: 'equipment_issue',              label: 'Equipment Issue',              fallout: false },
  { value: 'compliance_issue',             label: 'Compliance Issue',             fallout: false },
  { value: 'driver_backed_out',            label: 'Driver Backed Out',            fallout: true  },
  { value: 'no_response_after_acceptance', label: 'No Response After Acceptance', fallout: true  },
  { value: 'other',                        label: 'Other',                        fallout: false },
] as const

export const LOAD_STATUS_NEXT: Partial<Record<LoadStatus, LoadStatus>> = {
  Searching:          'Booked',
  Booked:             'Picked Up',
  'Picked Up':        'In Transit',
  'In Transit':       'Delivered',
  Delivered:          'Invoiced',
  Invoiced:           'Paid',
  'Carrier Selected': 'Picked Up',
}
