import type { LeadStatus, LeadPriority } from '../../types/models'

export const STATUS_STYLES: Record<LeadStatus, string> = {
  New:              'bg-surface-600 text-gray-300 border-surface-400',
  Attempted:        'bg-orange-900/30 text-orange-400 border-orange-800/40',
  'Voicemail Left': 'bg-violet-900/30 text-violet-400 border-violet-800/40',
  Contacted:        'bg-blue-900/30 text-blue-400 border-blue-800/40',
  Interested:       'bg-yellow-900/30 text-yellow-400 border-yellow-800/40',
  'Call Back Later':'bg-cyan-900/30 text-cyan-400 border-cyan-800/40',
  'Not Interested': 'bg-red-900/30 text-red-400 border-red-800/40',
  'Bad Fit':        'bg-gray-800/60 text-gray-500 border-gray-700/40',
  Converted:        'bg-emerald-900/30 text-emerald-400 border-emerald-800/40',
  Signed:           'bg-green-900/30 text-green-400 border-green-800/40',
  Rejected:         'bg-red-900/30 text-red-400 border-red-800/40',
  'Inactive MC':    'bg-purple-900/30 text-purple-400 border-purple-800/40',
}

export const STATUS_DOTS: Record<LeadStatus, string> = {
  New:              'bg-gray-500',
  Attempted:        'bg-orange-400',
  'Voicemail Left': 'bg-violet-400',
  Contacted:        'bg-blue-400',
  Interested:       'bg-yellow-400',
  'Call Back Later':'bg-cyan-400',
  'Not Interested': 'bg-red-500',
  'Bad Fit':        'bg-gray-600',
  Converted:        'bg-emerald-400',
  Signed:           'bg-green-400',
  Rejected:         'bg-red-500',
  'Inactive MC':    'bg-purple-400',
}

export const PRIORITY_STYLES: Record<LeadPriority, string> = {
  High:   'bg-red-900/30 text-red-400',
  Medium: 'bg-yellow-900/30 text-yellow-500',
  Low:    'bg-surface-600 text-gray-500',
}

// Active outreach statuses shown first; legacy statuses kept at bottom for existing records
export const STATUSES: LeadStatus[] = [
  'New', 'Attempted', 'Voicemail Left', 'Contacted', 'Interested', 'Call Back Later',
  'Not Interested', 'Bad Fit', 'Converted',
  'Signed', 'Rejected', 'Inactive MC',
]

export const PRIORITIES: LeadPriority[] = ['High', 'Medium', 'Low']

export const CONTACT_METHODS = ['Call', 'SMS', 'Email', 'DM', 'Voicemail']

export const TRAILER_TYPES = [
  'Dry Van', 'Reefer', 'Flatbed', 'Tanker',
  'Step Deck', 'RGN', 'Lowboy', 'Car Hauler', 'Other',
]

export const LEAD_SOURCES = [
  'Facebook', 'Referral', 'DAT Board', 'FMCSA Lookup',
  'Website', 'Cold Call', 'Load Board', 'Other',
]
