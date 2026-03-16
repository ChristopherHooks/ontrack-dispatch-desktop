import type { LeadStatus, LeadPriority } from '../../types/models'

export const STATUS_STYLES: Record<LeadStatus, string> = {
  New:           'bg-surface-600 text-gray-300 border-surface-400',
  Contacted:     'bg-blue-900/30 text-blue-400 border-blue-800/40',
  Interested:    'bg-yellow-900/30 text-yellow-400 border-yellow-800/40',
  Signed:        'bg-green-900/30 text-green-400 border-green-800/40',
  Rejected:      'bg-red-900/30 text-red-400 border-red-800/40',
  'Inactive MC': 'bg-purple-900/30 text-purple-400 border-purple-800/40',
}

export const STATUS_DOTS: Record<LeadStatus, string> = {
  New:           'bg-gray-500',
  Contacted:     'bg-blue-400',
  Interested:    'bg-yellow-400',
  Signed:        'bg-green-400',
  Rejected:      'bg-red-500',
  'Inactive MC': 'bg-purple-400',
}

export const PRIORITY_STYLES: Record<LeadPriority, string> = {
  High:   'bg-red-900/30 text-red-400',
  Medium: 'bg-yellow-900/30 text-yellow-500',
  Low:    'bg-surface-600 text-gray-500',
}

export const STATUSES: LeadStatus[]   = ['New', 'Contacted', 'Interested', 'Signed', 'Rejected', 'Inactive MC']
export const PRIORITIES: LeadPriority[] = ['High', 'Medium', 'Low']

export const TRAILER_TYPES = [
  'Dry Van', 'Reefer', 'Flatbed', 'Tanker',
  'Step Deck', 'RGN', 'Lowboy', 'Car Hauler', 'Other',
]

export const LEAD_SOURCES = [
  'Facebook', 'Referral', 'DAT Board', 'FMCSA Lookup',
  'Website', 'Cold Call', 'Load Board', 'Other',
]
