import { computeLeadScore } from '../../lib/leadScore'
import type { Lead } from '../../types/models'

interface Props {
  lead:       Lead
  showLabel?: boolean
  size?:      'sm' | 'md'
}

export function LeadScoreBadge({ lead, showLabel = false, size = 'sm' }: Props) {
  const { total, grade } = computeLeadScore(lead)
  const color =
    grade === 'Hot'  ? 'bg-orange-900/40 text-orange-400 border-orange-700/50' :
    grade === 'Warm' ? 'bg-yellow-900/30 text-yellow-400 border-yellow-700/50' :
                       'bg-surface-600 text-gray-400 border-surface-400'
  const cls = size === 'md' ? 'text-xs px-2 py-0.5' : 'text-2xs px-1.5 py-0.5'
  return (
    <span
      className={`inline-flex items-center gap-1 rounded border font-semibold tabular-nums shrink-0 ${cls} ${color}`}
      title={`Score: ${total}/100 (${grade})`}
    >
      {total}
      {showLabel && <span className='font-normal opacity-75'>{grade}</span>}
    </span>
  )
}
