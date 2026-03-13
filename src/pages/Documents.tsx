import { FolderOpen } from 'lucide-react'
import { PagePlaceholder } from '../components/ui/PagePlaceholder'

export function Documents() {
  return (
    <PagePlaceholder
      icon={<FolderOpen size={32} />}
      title='Documents'
      description='SOP library, driver documents, and rate confirmations — all searchable.'
      badge='Phase 2'
    />
  )
}
