import { Package } from 'lucide-react'
import { PagePlaceholder } from '../components/ui/PagePlaceholder'

export function Loads() {
  return (
    <PagePlaceholder
      icon={<Package size={32} />}
      title='Dispatch Board'
      description='Active load tracking: Searching → Booked → In Transit → Delivered.'
      badge='Phase 1'
    />
  )
}
