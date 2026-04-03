import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, X, Truck, Users, Package, Building2, FileText, CheckSquare, FolderOpen } from 'lucide-react'
import { useUIStore } from '../../store/uiStore'
import type { SearchResult, SearchResultType } from '../../types/models'

const TYPE_ICON: Record<SearchResultType, React.ReactNode> = {
  lead:     <Users size={14} />,
  driver:   <Truck size={14} />,
  load:     <Package size={14} />,
  broker:   <Building2 size={14} />,
  invoice:  <FileText size={14} />,
  task:     <CheckSquare size={14} />,
  document: <FolderOpen size={14} />,
}
const TYPE_LABEL: Record<SearchResultType, string> = {
  lead: 'Lead', driver: 'Driver', load: 'Load', broker: 'Broker',
  invoice: 'Invoice', task: 'Task', document: 'Document',
}
const TYPE_COLOR: Record<SearchResultType, string> = {
  lead:     'text-blue-400',
  driver:   'text-green-400',
  load:     'text-orange-400',
  broker:   'text-purple-400',
  invoice:  'text-yellow-400',
  task:     'text-teal-400',
  document: 'text-gray-400',
}

export function GlobalSearch() {
  const { globalSearchOpen, openGlobalSearch, closeGlobalSearch } = useUIStore()
  const [query, setQuery]     = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); openGlobalSearch() }
      if (e.key === '?' && !['INPUT','TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        e.preventDefault(); navigate('/help')
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [openGlobalSearch, navigate])

  useEffect(() => {
    if (globalSearchOpen) {
      setQuery(''); setResults([]); setSelected(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [globalSearchOpen])

  useEffect(() => {
    if (!query.trim()) { setResults([]); return }
    setLoading(true)
    const t = setTimeout(async () => {
      try { const r = await window.api.search.global(query); setResults(r); setSelected(0) } catch {}
      setLoading(false)
    }, 200)
    return () => clearTimeout(t)
  }, [query])

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Escape') { closeGlobalSearch(); return }
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(s => Math.min(s + 1, results.length - 1)) }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)) }
    if (e.key === 'Enter' && results[selected]) navigateTo(results[selected])
  }
  function navigateTo(r: SearchResult) { navigate(r.route); closeGlobalSearch() }

  if (!globalSearchOpen) return null

  return (
    <div className='fixed inset-0 z-50 flex items-start justify-center pt-24 bg-black/60 backdrop-blur-sm'
      onClick={closeGlobalSearch}>
      <div className='w-full max-w-lg mx-4 bg-surface-700 rounded-xl border border-surface-400 shadow-2xl overflow-hidden'
        onClick={e => e.stopPropagation()}>
        <div className='flex items-center gap-3 px-4 py-3 border-b border-surface-400'>
          <Search size={16} className='text-gray-500 shrink-0' />
          <input ref={inputRef} type='text'
            placeholder='Search leads, drivers, loads, brokers...'
            value={query} onChange={e => setQuery(e.target.value)} onKeyDown={handleKey}
            className='flex-1 bg-transparent text-sm text-gray-100 placeholder-gray-600 outline-none' />
          <button onClick={closeGlobalSearch} className='text-gray-600 hover:text-gray-300'><X size={14}/></button>
        </div>
        <div className='max-h-80 overflow-y-auto'>
          {loading && <p className='text-xs text-gray-600 text-center py-4'>Searching...</p>}
          {!loading && query.trim() && results.length === 0 && (
            <p className='text-xs text-gray-600 text-center py-4'>No results for &ldquo;{query}&rdquo;</p>
          )}
          {results.map((r, i) => (
            <button key={r.type + ':' + r.id} onClick={() => navigateTo(r)}
              className={'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ' + (i === selected ? 'bg-surface-600' : 'hover:bg-surface-600/50')}>
              <span className={TYPE_COLOR[r.type]}>{TYPE_ICON[r.type]}</span>
              <div className='flex-1 min-w-0'>
                <p className='text-sm text-gray-200 truncate'>{r.title}</p>
                <p className='text-xs text-gray-500 truncate'>{r.subtitle}</p>
              </div>
              <span className='text-2xs text-gray-600 shrink-0'>{TYPE_LABEL[r.type]}</span>
            </button>
          ))}
          {!query.trim() && (
            <div className='px-4 py-3 text-xs text-gray-600'>
              <p>Search across leads, drivers, loads, brokers, invoices, tasks, and documents</p>
              <p className='mt-0.5 text-gray-700'>Tip: press <kbd className='px-1 rounded bg-surface-600 text-gray-500'>?</kbd> to open Help</p>
              <p className='mt-1 text-gray-700'>Tip: press <kbd className='px-1 rounded bg-surface-600 text-gray-500'>Esc</kbd> to close</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
