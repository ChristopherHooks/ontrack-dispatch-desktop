import type { InvoiceStatus } from '../../types/models'

export const INVOICE_STATUS_STYLES: Record<InvoiceStatus, string> = {
  Draft:   'bg-amber-900/25 border-amber-700/50 text-amber-400',
  Sent:    'bg-blue-900/40 border-blue-600/60 text-blue-300',
  Overdue: 'bg-red-900/40 border-red-600/60 text-red-300',
  Paid:    'bg-green-900/35 border-green-600/55 text-green-300',
}

export const INVOICE_STATUSES: InvoiceStatus[] = ['Draft', 'Sent', 'Overdue', 'Paid']

export function genInvoiceNumber(): string {
  const y = new Date().getFullYear()
  const seq = String(Math.floor(Math.random() * 9000) + 1000)
  return `INV-${y}-${seq}`
}
