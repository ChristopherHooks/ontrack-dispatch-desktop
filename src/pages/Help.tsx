import { HelpCircle } from 'lucide-react'
import { PagePlaceholder } from '../components/ui/PagePlaceholder'

export function Help() {
  return (
    <PagePlaceholder
      icon={<HelpCircle size={32} />}
      title='Help & SOPs'
      description='Searchable knowledge base: all SOPs, checklists, and training documents.'
      badge='Phase 2'
    />
  )
}
