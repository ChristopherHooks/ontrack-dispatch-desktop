import type { ProspectStage, ProspectPriority } from '../../types/models'

export const STAGES: ProspectStage[] = [
  'Spotted',
  'Messaged',
  'Replied',
  'Interested',
  'Docs Requested',
  'Agreement Sent',
  'Signed',
  'Handed Off',
]

// Stages that represent active outreach — shown prominently in Kanban
export const ACTIVE_STAGES: ProspectStage[] = [
  'Spotted', 'Messaged', 'Replied', 'Interested', 'Docs Requested', 'Agreement Sent',
]

// Terminal stages — shown in a muted "completed" column
export const TERMINAL_STAGES: ProspectStage[] = ['Signed', 'Handed Off']

export const PRIORITIES: ProspectPriority[] = ['High', 'Medium', 'Low']

export const SOURCES = [
  'Facebook Group',
  'Facebook Message',
  'Cold Call',
  'Referral',
  'Other',
]

export const CDL_CLASSES = ['A', 'B', 'C', 'None']

export const EQUIPMENT_TYPES = [
  'Dry Van',
  'Flatbed',
  'Reefer',
  'Step Deck',
  'Hotshot',
  'Tanker',
  'RGN / Lowboy',
  'Car Hauler',
  'Other',
]

export const CONTACT_METHODS = ['Call', 'SMS', 'Facebook Message', 'Other']

// ── Visual styles ─────────────────────────────────────────────────────────────

export const STAGE_DOTS: Record<ProspectStage, string> = {
  'Spotted':         'bg-gray-500',
  'Messaged':        'bg-blue-400',
  'Replied':         'bg-cyan-400',
  'Interested':      'bg-yellow-400',
  'Docs Requested':  'bg-orange-400',
  'Agreement Sent':  'bg-violet-400',
  'Signed':          'bg-emerald-400',
  'Handed Off':      'bg-green-400',
}

export const STAGE_BORDER: Record<ProspectStage, string> = {
  'Spotted':         'border-gray-600/40 text-gray-400',
  'Messaged':        'border-blue-600/40 text-blue-400',
  'Replied':         'border-cyan-600/40 text-cyan-400',
  'Interested':      'border-yellow-600/40 text-yellow-400',
  'Docs Requested':  'border-orange-600/40 text-orange-400',
  'Agreement Sent':  'border-violet-600/40 text-violet-400',
  'Signed':          'border-emerald-600/40 text-emerald-400',
  'Handed Off':      'border-green-600/40 text-green-400',
}

export const STAGE_STYLES: Record<ProspectStage, string> = {
  'Spotted':         'bg-surface-600 text-gray-300 border-surface-400',
  'Messaged':        'bg-blue-900/30 text-blue-400 border-blue-800/40',
  'Replied':         'bg-cyan-900/30 text-cyan-400 border-cyan-800/40',
  'Interested':      'bg-yellow-900/30 text-yellow-400 border-yellow-800/40',
  'Docs Requested':  'bg-orange-900/30 text-orange-400 border-orange-800/40',
  'Agreement Sent':  'bg-violet-900/30 text-violet-400 border-violet-800/40',
  'Signed':          'bg-emerald-900/30 text-emerald-400 border-emerald-800/40',
  'Handed Off':      'bg-green-900/30 text-green-400 border-green-800/40',
}

export const PRIORITY_STYLES: Record<ProspectPriority, string> = {
  High:   'bg-red-900/30 text-red-400',
  Medium: 'bg-yellow-900/30 text-yellow-500',
  Low:    'bg-surface-600 text-gray-500',
}
