import { CheckSquare } from 'lucide-react'
import { PagePlaceholder } from '../components/ui/PagePlaceholder'

export function Tasks() {
  return (
    <PagePlaceholder
      icon={<CheckSquare size={32} />}
      title='Daily Tasks'
      description='Recurring daily task checklist synced from the OnTrack daily briefing.'
      badge='Phase 1'
    />
  )
}
