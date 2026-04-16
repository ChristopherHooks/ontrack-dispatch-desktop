/**
 * ContextGuidancePanel
 * Compact inline panel showing contextually relevant SOP documents
 * with short inline previews extracted from document content.
 * Supports an optional "primary" recommended doc with a reason string,
 * rendered with an orange accent treatment above secondary docs.
 * Clicking any entry opens the document via the native popout window.
 * No AI. No new data store. Reads from existing SopDocument records.
 */

import { BookOpen, Zap } from 'lucide-react'
import type { SopDocument } from '../../types/models'
import { categoryBadge, badge as badgeTokens } from '../../styles/uiTokens'

// Uses the shared categoryBadge map — consistent across all components
const CAT_BADGE: Record<string, string> = categoryBadge
const BADGE_DEFAULT = badgeTokens.neutral

// Markdown heading pattern — skip these entirely
const HEADING_RE = /^#{1,6}\s/

// Bullet / numbered list item — captures the text after the marker
const BULLET_RE  = /^(?:[-*•]|\d+\.)\s+(.+)/

/**
 * Extract up to `max` short preview lines from raw markdown content.
 *
 * Strategy (in priority order):
 *  1. Lines that match a bullet/list pattern — strip the marker
 *  2. If fewer than `max` bullets found, pad with short non-empty non-heading lines <= 80 chars
 *  3. Truncate each line to 72 chars for display.
 *  Returns [] if content is null/empty.
 */
function extractPreview(content: string | null, max = 2): string[] {
  if (!content?.trim()) return []

  const lines = content.split('\n').map(l => l.trim()).filter(Boolean)
  const bullets: string[] = []
  const fallback: string[] = []

  for (const line of lines) {
    if (HEADING_RE.test(line)) continue
    if (line.startsWith('```') || line === '---') continue

    const match = BULLET_RE.exec(line)
    if (match) {
      const text = match[1].replace(/\*\*/g, '').trim()
      if (text.length > 0) bullets.push(text)
    } else if (line.length <= 80 && fallback.length < max) {
      const clean = line.replace(/\*\*/g, '').replace(/`/g, '').trim()
      if (clean.length > 0) fallback.push(clean)
    }

    if (bullets.length >= max) break
  }

  const results = bullets.length > 0
    ? bullets.slice(0, max)
    : fallback.slice(0, max)

  return results.map(l => l.length > 72 ? l.slice(0, 69) + '…' : l)
}

function DocButton({ doc, primary = false }: { doc: SopDocument; primary?: boolean }) {
  const preview = extractPreview(doc.content)
  const open = () => window.api.documents.popout(doc.id).catch(() => {})

  if (primary) {
    return (
      <button
        onClick={open}
        className='w-full flex flex-col gap-0.5 px-2.5 py-2 rounded-lg bg-orange-500/10 dark:bg-orange-950/30 hover:bg-orange-500/15 dark:hover:bg-orange-950/50 border border-orange-500/30 dark:border-orange-700/40 hover:border-orange-500/50 dark:hover:border-orange-600/60 transition-colors text-left group'
      >
        <div className='flex items-center gap-1.5 mb-1'>
          <Zap size={9} className='text-orange-500 dark:text-orange-400 shrink-0' />
          <span className='text-xs text-orange-600 dark:text-orange-400 font-semibold uppercase tracking-wider'>Recommended now</span>
        </div>
        <div className='flex items-center gap-2 mb-0.5'>
          <span className='flex-1 text-xs text-gray-100 group-hover:text-white font-semibold truncate'>
            {doc.title}
          </span>
          <span className={`text-2xs px-1.5 py-0.5 rounded border shrink-0 ${CAT_BADGE[doc.category] ?? BADGE_DEFAULT}`}>
            {doc.category}
          </span>
        </div>
        {preview.length > 0 && (
          <ul className='mt-1 space-y-0.5 pl-1'>
            {preview.map((line, i) => (
              <li key={i} className='flex items-start gap-1.5'>
                <span className='text-orange-500 shrink-0 leading-tight' aria-hidden>·</span>
                <span className='text-2xs text-gray-400 leading-tight'>{line}</span>
              </li>
            ))}
          </ul>
        )}
      </button>
    )
  }

  return (
    <button
      onClick={open}
      className='w-full flex flex-col gap-0.5 px-2.5 py-2 rounded-lg bg-surface-700 hover:bg-surface-600 border border-surface-400 hover:border-surface-300 transition-colors text-left group'
    >
      <div className='flex items-center gap-2 mb-0.5'>
        <span className='flex-1 text-xs text-gray-200 group-hover:text-gray-100 font-medium truncate'>
          {doc.title}
        </span>
        <span className={`text-2xs px-1.5 py-0.5 rounded shrink-0 ${CAT_BADGE[doc.category] ?? BADGE_DEFAULT}`}>
          {doc.category}
        </span>
      </div>
      {preview.length > 0 && (
        <ul className='mt-0.5 space-y-0.5 pl-1'>
          {preview.map((line, i) => (
            <li key={i} className='flex items-start gap-1.5'>
              <span className='text-gray-400 shrink-0 leading-tight' aria-hidden>·</span>
              <span className='text-2xs text-gray-500 leading-tight'>{line}</span>
            </li>
          ))}
        </ul>
      )}
    </button>
  )
}

interface Props {
  docs: SopDocument[]
  /** Primary "recommended now" document — rendered with orange accent above secondary docs */
  primary?: SopDocument | null
  /** Short reason string shown under the "Recommended now" label */
  reason?: string | null
  /** Label shown above the document list */
  label?: string
}

export function ContextGuidancePanel({ docs, primary, reason, label = 'Related SOPs' }: Props) {
  const hasContent = (primary != null) || docs.length > 0
  if (!hasContent) return null

  return (
    <div className='mt-3 pt-3 border-t border-surface-400/60'>
      <div className='flex items-center gap-1.5 mb-2'>
        <BookOpen size={10} className='text-gray-500 shrink-0' />
        <p className='text-2xs text-gray-500 uppercase tracking-wider font-semibold'>{label}</p>
      </div>
      <div className='space-y-1'>
        {primary && (
          <>
            {reason && (
              <p className='text-xs text-gray-400 italic mb-1.5 pl-0.5'>{reason}</p>
            )}
            <DocButton doc={primary} primary />
          </>
        )}
        {docs.map(doc => (
          <DocButton key={doc.id} doc={doc} />
        ))}
      </div>
    </div>
  )
}
