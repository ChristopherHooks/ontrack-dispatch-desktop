import { Megaphone } from 'lucide-react'
import { PagePlaceholder } from '../components/ui/PagePlaceholder'

export function Marketing() {
  return (
    <PagePlaceholder
      icon={<Megaphone size={32} />}
      title='Marketing'
      description='Facebook post queue, group rotation schedule, and engagement tracking.'
      badge='Phase 2'
    />
  )
}
