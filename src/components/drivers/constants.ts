import type { DriverStatus, DriverDocType } from '../../types/models'

export const DRIVER_STATUS_STYLES: Record<DriverStatus, string> = {
  Active:    'bg-green-900/30 border-green-700/40 text-green-400',
  'On Load': 'bg-blue-900/30 border-blue-700/40 text-blue-400',
  Inactive:  'bg-surface-600 border-surface-400 text-gray-500',
}

export const DRIVER_STATUSES: DriverStatus[] = ['Active', 'On Load', 'Inactive']
export const TRUCK_TYPES = ['Semi - Sleeper', 'Semi - Day Cab', 'Straight Truck', 'Box Truck', 'Sprinter Van']
export const TRAILER_TYPES_DRV = ['Dry Van', 'Reefer', 'Flatbed', 'Step Deck', 'Lowboy', 'Tanker', 'Auto Carrier', 'Hotshot', 'Power Only', 'Other']
export const DOC_TYPES: DriverDocType[] = ['CDL', 'Insurance', 'BOL', 'POD', 'COI', 'Lease', 'W9', 'Other']
