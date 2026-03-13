import { FileText } from 'lucide-react'
import { PagePlaceholder } from '../components/ui/PagePlaceholder'

export function Invoices() {
  return (
    <PagePlaceholder
      icon={<FileText size={32} />}
      title='Invoices'
      description='Auto-generate weekly dispatch invoices, track payments, flag overdue.'
      badge='Phase 1'
    />
  )
}
