import { useState } from 'react'
import { HelpCircle, Search, ChevronRight, ChevronDown, Keyboard } from 'lucide-react'
import { HELP_ARTICLES, HELP_CATEGORIES, KEYBOARD_SHORTCUTS } from '../data/helpArticles'
import type { HelpArticle } from '../data/helpArticles'

const CATEGORY_COLORS: Record<string, string> = {
  'Getting Started': 'bg-green-900/30 text-green-400 border-green-700/40',
  'Dispatch':        'bg-orange-900/30 text-orange-400 border-orange-700/40',
  'Leads':           'bg-blue-900/30 text-blue-400 border-blue-700/40',
  'Drivers':         'bg-purple-900/30 text-purple-400 border-purple-700/40',
  'Invoicing':       'bg-yellow-900/30 text-yellow-400 border-yellow-700/40',
  'Backup & Data':   'bg-teal-900/30 text-teal-400 border-teal-700/40',
}

export function Help() {
  const [search, setSearch]     = useState('')
  const [category, setCategory] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)

  const filtered = HELP_ARTICLES.filter(a => {
    if (category && a.category !== category) return false
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return a.title.toLowerCase().includes(q) || a.summary.toLowerCase().includes(q) || a.tags.some(t => t.includes(q))
  })

  return (
    <div className='max-w-4xl space-y-6 animate-fade-in'>
      <div>
        <h1 className='text-xl font-bold text-gray-100'>Help & SOPs</h1>
        <p className='text-sm text-gray-500 mt-1'>Workflows, SOPs, and keyboard shortcuts for OnTrack Dispatch Dashboard</p>
      </div>

      {/* Search */}
      <div className='relative'>
        <Search size={15} className='absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500' />
        <input type='text' placeholder='Search articles...' value={search}
          onChange={e => setSearch(e.target.value)}
          className='w-full pl-10 pr-4 py-2.5 bg-surface-700 border border-surface-400 rounded-xl text-sm text-gray-200 placeholder-gray-600 outline-none focus:border-orange-600/60' />
      </div>

      {/* Category pills */}
      <div className='flex flex-wrap gap-2'>
        <button onClick={() => setCategory(null)}
          className={'px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ' +
            (!category ? 'bg-orange-600/20 border-orange-600 text-orange-400' : 'bg-surface-700 border-surface-400 text-gray-400 hover:text-gray-200')}>
          All Topics
        </button>
        {HELP_CATEGORIES.map(cat => (
          <button key={cat} onClick={() => setCategory(c => c === cat ? null : cat)}
            className={'px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ' +
              (category === cat ? 'bg-orange-600/20 border-orange-600 text-orange-400' : 'bg-surface-700 border-surface-400 text-gray-400 hover:text-gray-200')}>
            {cat}
          </button>
        ))}
      </div>

      {/* Articles */}
      <div className='space-y-3'>
        {filtered.length === 0 ? (
          <div className='bg-surface-700 rounded-xl border border-surface-400 p-8 text-center'>
            <HelpCircle size={32} className='text-gray-700 mx-auto mb-2' />
            <p className='text-sm text-gray-500'>No articles match your search.</p>
          </div>
        ) : filtered.map(article => (
          <ArticleCard key={article.id} article={article}
            expanded={expanded === article.id}
            onToggle={() => setExpanded(e => e === article.id ? null : article.id)} />
        ))}
      </div>

      {/* Keyboard Shortcuts */}
      <div className='bg-surface-700 rounded-xl border border-surface-400 p-5'>
        <div className='flex items-center gap-2 mb-4 pb-3 border-b border-surface-400'>
          <Keyboard size={15} className='text-orange-500' />
          <h2 className='text-sm font-semibold text-gray-200'>Keyboard Shortcuts</h2>
        </div>
        <div className='grid grid-cols-1 sm:grid-cols-2 gap-2'>
          {KEYBOARD_SHORTCUTS.map((s, i) => (
            <div key={i} className='flex items-center justify-between py-1.5 px-3 bg-surface-600 rounded-lg'>
              <span className='text-xs text-gray-400'>{s.description}</span>
              <div className='flex items-center gap-1'>
                {s.keys.map((k, ki) => (
                  <span key={ki} className='px-1.5 py-0.5 bg-surface-500 border border-surface-300 rounded text-2xs text-gray-300 font-mono'>{k}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function ArticleCard({ article, expanded, onToggle }: { article: HelpArticle; expanded: boolean; onToggle: () => void }) {
  const cc = CATEGORY_COLORS[article.category] ?? 'bg-surface-600 text-gray-400 border-surface-400'
  return (
    <div className='bg-surface-700 rounded-xl border border-surface-400 overflow-hidden shadow-card'>
      <button onClick={onToggle}
        className='w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-surface-600/30 transition-colors'>
        <div className='flex-1 min-w-0'>
          <div className='flex items-center gap-2 mb-1'>
            <span className={'text-2xs px-1.5 py-0.5 rounded border ' + cc}>{article.category}</span>
          </div>
          <h3 className='text-sm font-semibold text-gray-200'>{article.title}</h3>
          <p className='text-xs text-gray-500 mt-0.5'>{article.summary}</p>
        </div>
        {expanded ? <ChevronDown size={15} className='text-gray-500 shrink-0'/> : <ChevronRight size={15} className='text-gray-500 shrink-0'/>}
      </button>
      {expanded && (
        <div className='px-6 pb-5 pt-2 border-t border-surface-400'>
          <div className='prose-sm text-gray-300 space-y-2 whitespace-pre-wrap text-sm leading-relaxed'>
            {article.content.trim().split(String.fromCharCode(10)).map((line, i) => {
              if (line.startsWith('### ')) return <h4 key={i} className='text-sm font-semibold text-gray-200 mt-3 mb-1'>{line.slice(4)}</h4>
              if (line.startsWith('## '))  return <h3 key={i} className='text-base font-bold text-gray-100 mt-4 mb-1'>{line.slice(3)}</h3>
              if (line.startsWith('# '))   return <h2 key={i} className='text-lg font-bold text-white mt-4 mb-2'>{line.slice(2)}</h2>
              if (line.startsWith('- ') || line.startsWith('* ')) return <div key={i} className='flex gap-2 ml-2 text-sm'><span className='text-orange-500 shrink-0 mt-0.5'>&#8226;</span><span>{line.slice(2)}</span></div>
              if (line.startsWith('> '))   return <blockquote key={i} className='border-l-2 border-orange-600 pl-3 text-gray-400 italic text-sm'>{line.slice(2)}</blockquote>
              if (!line.trim())            return <div key={i} className='h-1' />
              return <p key={i} className='text-sm text-gray-300'>{line}</p>
            })}
          </div>
        </div>
      )}
    </div>
  )
}
