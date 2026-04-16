/**
 * ContextGuidancePanel
 * Compact inline panel showing 1–3 contextually relevant SOP documents
 * with short inline previews extracted from document content.
 * Clicking any entry opens the document via the native popout window.
 * No AI. No new data store. Reads from existing SopDocument records.
 */

import { BookOpen } from 'lucide-react'
import type { SopDocument } from '../../types/models'

// Mirrors the category badge palette from Documents.tsx (subset used in broker workflow)
const CAT_BADGE: Record<string, string> = {
  Dispatch:  'bg-blue-900/50 text-blue-400 border-blue-700/40',
  Brokers:   'bg-teal-900/50 text-teal-400 border-teal-700/40',
  Sales:     'bg-orange-900/50 text-orange-400 border-orange-700/40',
  Policy:    'bg-red-900/50 text-red-400 border-red-700/40',
  Reference: 'bg-sky-900/50 text-sky-400 border-sky-700/40',
  Finance:   'bg-emerald-900/50 text-emerald-400 border-emerald-700/40',
  SOP:       'bg-blue-900/50 text-blue-400 border-blue-700/40',
}
const BADGE_DEFAULT = 'bg-surface-700 text-gray-500 border-surface-500'

// Markdown heading pattern — skip these entirely, they're not useful preview lines
const HEADING_RE = /^#{1,6}\s/

// Bullet / numbered list item — captures the text after the marker
const BULLET_RE  = /^(?:[-*•]|\d+\.)\s+(.+)/

/**
 * Extract up to `max` short preview lines from raw markdown content.
 *
 * Strategy (in priority order):
 *  1. Lines that match a bullet/list pattern (- / * / • / 1.) — strip the marker
 *  2. If fewer than `max` bullets found, pad with short non-empty non-heading lines
 *     that are <= 80 chars (to avoid grabbing full paragraphs).
 *  3. Truncate each line to 72 chars for display.
 *  Returns [] if content is null/empty.
 */
function extractPreview(content: string | null, max = 3): string[] {
  if (!content?.trim()) return []

  const lines = content.split('\n').map(l => l.trim()).filter(Boolean)
  const bullets: string[] = []
  const fallback: string[] = []

  for (const line of lines) {
    if (HEADING_RE.test(line)) continue               // skip headings
    if (line.startsWith('```') || line === '---') continue  // skip fences/dividers

    const match = BULLET_RE.exec(line)
    if (match) {
      const text = match[1].replace(/\*\*/g, '').trim()  // strip bold markers
      if (text.length > 0) bullets.push(text)
    } else if (line.length <= 80 && fallback.length < max) {
      // Short non-bullet line — usable as fallback
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

interface Props {
  docs: SopDocument[]
  /** Label shown above the document list */
  label?: string
}

export function ContextGuidancePanel({ docs, label = 'Related SOPs' }: Props) {
  if (docs.length === 0) return null

  const open = (doc: SopDocument) => {
    window.api.documents.popout(doc.id).catch(() => {})
  }

  return (
    <div className='mt-3 pt-3 border-t border-surface-600/60'>
      <div className='flex items-center gap-1.5 mb-1.5'>
        <BookOpen size={10} className='text-gray-600 shrink-0' />
        <p className='text-2xs text-gray-600 uppercase tracking-wider font-medium'>{label}</p>
      </div>
      <div className='space-y-1'>
        {docs.map(doc => {
          const preview = extractPreview(doc.content)
          return (
            <button
              key={doc.id}
              onClick={() => open(doc)}
              className='w-full flex flex-col gap-0.5 px-2 py-1.5 rounded bg-surface-700/40 hover:bg-surface-600 border border-surface-600 hover:border-surface-500 transition-colors text-left group'
            >
              {/* Title row */}
              <div className='flex items-center gap-2'>
                <span className='flex-1 text-2xs text-gray-400 group-hover:text-gray-200 font-medium truncate'>
                  {doc.title}
                </span>
                <span
                  className={`text-2xs px-1.5 py-0 rounded border shrink-0 ${CAT_BADGE[doc.category] ?? BADGE_DEFAULT}`}
                >
                  {doc.category}
                </span>
              </div>
              {/* Inline preview lines */}
              {preview.length > 0 && (
                <ul className='mt-0.5 space-y-0.5 pl-1'>
                  {preview.map((line, i) => (
                    <li key={i} className='flex items-start gap-1'>
                      <span className='text-gray-700 shrink-0 leading-tight' aria-hidden>·</span>
                      <span className='text-2xs text-gray-600 leading-tight'>{line}</span>
                    </li>
                  ))}
                </ul>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
