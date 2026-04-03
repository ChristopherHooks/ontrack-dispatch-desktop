import type { BrokerFlag } from '../../types/models'

export const FLAG_STYLES: Record<BrokerFlag, string> = {
  None:        'bg-surface-500 border-surface-400 text-gray-300',
  Preferred:   'bg-green-600 border-green-500 text-white',
  Avoid:       'bg-orange-600 border-orange-500 text-white',
  'Slow Pay':  'bg-amber-500 border-amber-400 text-white',
  Blacklisted: 'bg-red-600 border-red-500 text-white',
}

export const BROKER_FLAGS: BrokerFlag[] = ['None', 'Preferred', 'Slow Pay', 'Avoid', 'Blacklisted']
export const CREDIT_RATINGS = ['A+', 'A', 'B+', 'B', 'C', 'D', 'Unknown']
