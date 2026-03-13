import { Users } from 'lucide-react'
import { PagePlaceholder } from '../components/ui/PagePlaceholder'

export function Leads() {
  return (
    <PagePlaceholder
      icon={<Users size={32} />}
      title='Lead Pipeline'
      description='Manage driver leads from FMCSA scraping, Facebook outreach, and referrals.'
      badge='Phase 1'
    />
  )
}
