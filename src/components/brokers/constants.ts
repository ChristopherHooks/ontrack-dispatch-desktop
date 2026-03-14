import type { BrokerFlag } from '../../types/models'

export const FLAG_STYLES: Record<BrokerFlag, string> = {
  None:        'bg-surface-600 border-surface-400 text-gray-500',
  Preferred:   'bg-green-900/30 border-green-700/40 text-green-400',
  Avoid:       'bg-orange-900/30 border-orange-700/40 text-orange-400',
  'Slow Pay':  'bg-yellow-900/30 border-yellow-700/40 text-yellow-400',
  Blacklisted: 'bg-red-900/30 border-red-700/40 text-red-400',
}

export const BROKER_FLAGS: BrokerFlag[] = ['None', 'Preferred', 'Slow Pay', 'Avoid', 'Blacklisted']
export const CREDIT_RATINGS = ['A+', 'A', 'B+', 'B', 'C', 'D', 'Unknown']
