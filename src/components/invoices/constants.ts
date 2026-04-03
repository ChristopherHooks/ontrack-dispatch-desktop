import type { InvoiceStatus } from '../../types/models'

export const INVOICE_STATUS_STYLES: Record<InvoiceStatus, string> = {
  Draft:   'bg-surface-600 border-surface-400 text-gray-400',
  Sent:    'bg-blue-900/30 border-blue-700/40 text-blue-400',
  Overdue: 'bg-red-900/30 border-red-700/40 text-red-400',
  Paid:    'bg-green-900/30 border-green-700/40 text-green-400',
}

export const INVOICE_STATUSES: InvoiceStatus[] = ['Draft', 'Sent', 'Overdue', 'Paid']

export function genInvoiceNumber(): string {
  const y = new Date().getFullYear()
  const seq = String(Math.floor(Math.random() * 9000) + 1000)
  return `INV-${y}-${seq}`
}
