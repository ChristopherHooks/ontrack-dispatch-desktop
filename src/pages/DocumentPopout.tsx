import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import type { SopDocument } from '../types/models'
import { renderMd } from '../lib/renderMd'

const CATEGORY_COLORS: Record<string, string> = {
  SOP:       'bg-blue-900/30 text-blue-400 border-blue-700/40',
  Policy:    'bg-purple-900/30 text-purple-400 border-purple-700/40',
  Training:  'bg-green-900/30 text-green-400 border-green-700/40',
  Template:  'bg-yellow-900/30 text-yellow-400 border-yellow-700/40',
  Reference: 'bg-teal-900/30 text-teal-400 border-teal-700/40',
  Other:     'bg-surface-600 text-gray-400 border-surface-400',
}

export function DocumentPopout() {
  const { id } = useParams<{ id: string }>()
  const [doc, setDoc] = useState<SopDocument | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!id) return
    window.api.documents.get(Number(id))
      .then(d => {
        if (d) {
          setDoc(d)
          document.title = d.title + ' — OnTrack'
        } else {
          setError('Document not found.')
        }
      })
      .catch(() => setError('Failed to load document.'))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className='min-h-screen bg-surface-800 flex items-center justify-center'>
        <p className='text-gray-500 text-sm'>Loading...</p>
      </div>
    )
  }

  if (error || !doc) {
    return (
      <div className='min-h-screen bg-surface-800 flex items-center justify-center'>
        <p className='text-red-400 text-sm'>{error || 'Document not found.'}</p>
      </div>
    )
  }

  return (
    <div className='h-screen bg-surface-800 flex flex-col'>
      {/* Header */}
      <div className='bg-surface-700 border-b border-surface-400 px-6 py-3 flex items-center gap-3 shrink-0'>
        <h1 className='text-sm font-semibold text-gray-100 flex-1 truncate'>{doc.title}</h1>
        <span className={'text-2xs px-1.5 py-0.5 rounded border ' + (CATEGORY_COLORS[doc.category] ?? CATEGORY_COLORS.Other)}>
          {doc.category}
        </span>
      </div>
      {/* Content */}
      <div className='flex-1 overflow-y-auto px-8 py-6'>
        {doc.content ? (
          <div
            className='prose-ontrack'
            dangerouslySetInnerHTML={{ __html: renderMd(doc.content) }}
          />
        ) : (
          <p className='text-sm text-gray-600 italic'>No content.</p>
        )}
      </div>
    </div>
  )
}
