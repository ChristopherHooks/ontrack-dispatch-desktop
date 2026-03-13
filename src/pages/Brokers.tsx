import { Building2 } from 'lucide-react'
import { PagePlaceholder } from '../components/ui/PagePlaceholder'

export function Brokers() {
  return (
    <PagePlaceholder
      icon={<Building2 size={32} />}
      title='Broker Database'
      description='Broker contacts, credit ratings, payment history, and relationship flags.'
      badge='Phase 1'
    />
  )
}
