import { BarChart3 } from 'lucide-react'
import { PagePlaceholder } from '../components/ui/PagePlaceholder'

export function Analytics() {
  return (
    <PagePlaceholder
      icon={<BarChart3 size={32} />}
      title='Analytics'
      description='Lead conversion rates, revenue per driver, lane profitability, and RPM.'
      badge='Phase 2'
    />
  )
}
