import { Truck } from 'lucide-react'
import { PagePlaceholder } from '../components/ui/PagePlaceholder'

export function Drivers() {
  return (
    <PagePlaceholder
      icon={<Truck size={32} />}
      title='Active Drivers'
      description='Driver profiles, documents, dispatch history, and carrier settings.'
      badge='Phase 1'
    />
  )
}
