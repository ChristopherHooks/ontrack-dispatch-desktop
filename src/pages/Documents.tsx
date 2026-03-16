import { useState, useEffect } from 'react'
import { FolderOpen, Plus, Search, Edit2, Trash2, FileText, X, Save } from 'lucide-react'
import type { SopDocument, CreateSopDocumentDto, DocCategory } from '../types/models'
import { DOC_CATEGORIES } from '../data/helpArticles'
import { EmptyState } from '../components/ui/EmptyState'

const CATEGORY_COLORS: Record<string, string> = {
  SOP:       'bg-blue-900/30 text-blue-400 border-blue-700/40',
  Policy:    'bg-purple-900/30 text-purple-400 border-purple-700/40',
  Training:  'bg-green-900/30 text-green-400 border-green-700/40',
  Template:  'bg-yellow-900/30 text-yellow-400 border-yellow-700/40',
  Reference: 'bg-teal-900/30 text-teal-400 border-teal-700/40',
  Other:     'bg-surface-600 text-gray-400 border-surface-400',
}

function esc(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
function inline(s: string) {
  return s
    // [[Document Title]] → clickable cross-reference (processed before bold/italic)
    .replace(/\[\[(.+?)\]\]/g, '<a data-doc-link="$1" class="text-orange-400 hover:text-orange-300 underline cursor-pointer font-medium">$1</a>')
    .replace(/\*\*(.+?)\*\*/g, '<strong class="text-gray-100 font-semibold">$1</strong>')
    .replace(/\*(.+?)\*/g,     '<em class="text-gray-400">$1</em>')
    .replace(/`(.+?)`/g,       '<code class="bg-surface-600 text-orange-300 px-1 rounded text-xs font-mono">$1</code>')
}
function renderMd(text: string): string {
  const lines = text.split(String.fromCharCode(10))
  const out: string[] = []
  let inUl = false, inOl = false, olIdx = 0
  for (const line of lines) {
    const closeList = () => { if (inUl) { out.push('</ul>'); inUl=false } if (inOl) { out.push('</ol>'); inOl=false } }
    if (line.startsWith('### ')) { closeList(); out.push('<h3 class="text-base font-semibold text-gray-100 mt-4 mb-1">' + inline(esc(line.slice(4))) + '</h3>') }
    else if (line.startsWith('## ')) { closeList(); out.push('<h2 class="text-lg font-bold text-gray-100 mt-5 mb-2">' + inline(esc(line.slice(3))) + '</h2>') }
    else if (line.startsWith('# '))  { closeList(); out.push('<h1 class="text-xl font-bold text-white mt-5 mb-2">' + inline(esc(line.slice(2))) + '</h1>') }
    else if (/^\d+\.\s/.test(line)) {
      if (inUl) { out.push('</ul>'); inUl=false }
      if (!inOl) { out.push('<ol class="list-decimal list-inside space-y-1 my-2 text-gray-300">'); inOl=true; olIdx=0 }
      out.push('<li class="text-sm">' + inline(esc(line.replace(/^\d+\.\s/, ''))) + '</li>')
    }
    else if (line.startsWith('- ') || line.startsWith('* ')) {
      if (inOl) { out.push('</ol>'); inOl=false }
      if (!inUl) { out.push('<ul class="list-disc list-inside space-y-1 my-2 text-gray-300">'); inUl=true }
      out.push('<li class="text-sm">' + inline(esc(line.slice(2))) + '</li>')
    }
    else if (line.startsWith('> ')) { closeList(); out.push('<blockquote class="border-l-2 border-orange-600 pl-3 my-2 text-gray-400 italic text-sm">' + esc(line.slice(2)) + '</blockquote>') }
    else if (line.trim() === '---') { closeList(); out.push('<hr class="border-surface-400 my-3"/>') }
    else if (line.trim() === '')    { closeList(); out.push('<div class="my-1"></div>') }
    else { closeList(); out.push('<p class="text-sm text-gray-300 my-1 leading-relaxed">' + inline(esc(line)) + '</p>') }
  }
  if (inUl) out.push('</ul>')
  if (inOl) out.push('</ol>')
  return out.join('')
}

export function Documents() {
  const [docs, setDocs]           = useState<SopDocument[]>([])
  const [category, setCategory]   = useState('All')
  const [search, setSearch]       = useState('')
  const [selected, setSelected]   = useState<SopDocument | null>(null)
  const [editing, setEditing]     = useState(false)
  const [creating, setCreating]   = useState(false)
  const [loading, setLoading]     = useState(true)
  const [draft, setDraft]         = useState<Partial<SopDocument>>({})

  useEffect(() => { load() }, [category])

  async function load() {
    setLoading(true)
    try {
      const d = search.trim()
        ? await window.api.documents.search(search)
        : await window.api.documents.list(category === 'All' ? undefined : category)
      setDocs(d)
      if (selected) {
        const fresh = d.find(x => x.id === selected.id)
        if (fresh) setSelected(fresh)
      }
    } catch {}
    setLoading(false)
  }

  async function handleSearch(q: string) {
    setSearch(q)
    if (!q.trim()) { load(); return }
    try { const d = await window.api.documents.search(q); setDocs(d) } catch {}
  }

  async function handleSave() {
    if (!draft.title?.trim()) return
    try {
      if (creating) {
        const doc = await window.api.documents.create(draft as CreateSopDocumentDto)
        setSelected(doc); setCreating(false)
      } else if (editing && selected) {
        const doc = await window.api.documents.update(selected.id, draft)
        if (doc) setSelected(doc)
        setEditing(false)
      }
      await load()
    } catch {}
  }

  async function handleDelete(doc: SopDocument) {
    if (!confirm('Delete "' + doc.title + '"?')) return
    await window.api.documents.delete(doc.id)
    if (selected?.id === doc.id) setSelected(null)
    await load()
  }

  function startCreate() {
    setDraft({ title: '', category: 'SOP', content: '' })
    setCreating(true); setEditing(false); setSelected(null)
  }
  function startEdit(doc: SopDocument) {
    setDraft({ title: doc.title, category: doc.category as DocCategory, content: doc.content ?? '' })
    setEditing(true); setCreating(false)
  }
  function cancelEdit() { setEditing(false); setCreating(false); setDraft({}) }

  return (
    <div className='h-full flex gap-4 animate-fade-in'>

      {/* Left Panel */}
      <div className='w-64 shrink-0 flex flex-col gap-3'>
        {/* Search */}
        <div className='relative'>
          <Search size={14} className='absolute left-3 top-1/2 -translate-y-1/2 text-gray-500' />
          <input type='text' placeholder='Search documents...' value={search}
            onChange={e => handleSearch(e.target.value)}
            className='w-full pl-8 pr-3 py-2 bg-surface-700 border border-surface-400 rounded-lg text-sm text-gray-200 placeholder-gray-600 outline-none focus:border-orange-600/60' />
        </div>
        {/* Categories */}
        <div className='bg-surface-700 rounded-xl border border-surface-400 p-2'>
          <p className='text-2xs text-gray-600 font-medium uppercase tracking-wider px-2 mb-2'>Categories</p>
          {DOC_CATEGORIES.map(cat => (
            <button key={cat} onClick={() => { setCategory(cat); setSearch('') }}
              className={'w-full text-left px-2 py-1.5 rounded-lg text-sm transition-colors ' +
                (category === cat ? 'bg-orange-600/20 text-orange-400 font-medium' : 'text-gray-400 hover:bg-surface-600 hover:text-gray-200')}>
              {cat}
            </button>
          ))}
        </div>
        {/* New Doc button */}
        <button onClick={startCreate}
          className='flex items-center justify-center gap-2 py-2 bg-orange-600 hover:bg-orange-500 text-white text-sm font-medium rounded-lg transition-colors'>
          <Plus size={14} /> New Document
        </button>
        {/* Document list */}
        <div className='flex-1 overflow-y-auto space-y-1'>
          {loading ? (
            <p className='text-xs text-gray-600 text-center py-4'>Loading...</p>
          ) : docs.length === 0 ? (
            <p className='text-xs text-gray-600 text-center py-4 italic'>No documents found.</p>
          ) : docs.map(doc => (
            <button key={doc.id} onClick={() => { setSelected(doc); setEditing(false); setCreating(false) }}
              className={'w-full text-left px-3 py-2 rounded-lg border transition-colors ' +
                (selected?.id === doc.id ? 'bg-orange-600/15 border-orange-700/40 text-orange-300' : 'bg-surface-700 border-surface-400 text-gray-300 hover:border-surface-300')}>
              <p className='text-xs font-medium truncate'>{doc.title}</p>
              <span className={'text-2xs px-1.5 py-0.5 rounded border mt-1 inline-block ' + (CATEGORY_COLORS[doc.category] ?? CATEGORY_COLORS.Other)}>
                {doc.category}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Right Panel */}
      <div className='flex-1 min-w-0 bg-surface-700 rounded-xl border border-surface-400 flex flex-col'>
        {(creating || editing) ? (
          /* Editor */
          <div className='flex flex-col h-full'>
            <div className='flex items-center gap-3 px-5 py-3 border-b border-surface-400'>
              <input type='text' placeholder='Document title...' value={draft.title ?? ''}
                onChange={e => setDraft(d => ({ ...d, title: e.target.value }))}
                className='flex-1 bg-surface-600 border border-surface-400 rounded-lg px-3 py-1.5 text-sm text-gray-100 outline-none focus:border-orange-600/60' />
              <select value={draft.category ?? 'SOP'} onChange={e => setDraft(d => ({ ...d, category: e.target.value as DocCategory }))}
                className='bg-surface-600 border border-surface-400 rounded-lg px-2 py-1.5 text-sm text-gray-300 outline-none'>
                {(['SOP','Policy','Training','Template','Reference','Other'] as DocCategory[]).map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <button onClick={handleSave}
                className='flex items-center gap-1.5 px-3 py-1.5 bg-orange-600 hover:bg-orange-500 text-white text-xs font-medium rounded-lg transition-colors'>
                <Save size={13}/> Save
              </button>
              <button onClick={cancelEdit} className='text-gray-500 hover:text-gray-300'><X size={16}/></button>
            </div>
            <textarea
              placeholder='Write markdown content here... Use # for headings, **bold**, *italic*, - for lists'
              value={draft.content ?? ''}
              onChange={e => setDraft(d => ({ ...d, content: e.target.value }))}
              className='flex-1 bg-transparent px-5 py-4 text-sm text-gray-300 outline-none resize-none font-mono leading-relaxed placeholder-gray-700'
            />
          </div>
        ) : selected ? (
          /* Viewer */
          <div className='flex flex-col h-full'>
            <div className='flex items-center gap-3 px-5 py-3 border-b border-surface-400'>
              <div className='flex-1 min-w-0'>
                <h2 className='text-base font-semibold text-gray-100 truncate'>{selected.title}</h2>
                <span className={'text-2xs px-1.5 py-0.5 rounded border ' + (CATEGORY_COLORS[selected.category] ?? CATEGORY_COLORS.Other)}>{selected.category}</span>
              </div>
              <button onClick={() => startEdit(selected)}
                className='flex items-center gap-1 px-3 py-1.5 text-xs border border-surface-400 text-gray-400 hover:text-orange-400 hover:border-orange-600/40 rounded-lg transition-colors'>
                <Edit2 size={12}/> Edit
              </button>
              <button onClick={() => handleDelete(selected)}
                className='text-gray-600 hover:text-red-400 transition-colors'><Trash2 size={15}/>
              </button>
            </div>
            <div className='flex-1 overflow-y-auto px-6 py-5'>
              {selected.content ? (
                <div
                  dangerouslySetInnerHTML={{ __html: renderMd(selected.content) }}
                  onClick={async (e) => {
                    const el = e.target as HTMLElement
                    const title = el.getAttribute('data-doc-link')
                    if (!title) return
                    e.preventDefault()
                    // Fast path: doc is already in the current filtered list
                    const found = docs.find(d => d.title.toLowerCase() === title.toLowerCase())
                    if (found) { setSelected(found); setEditing(false); setCreating(false); return }
                    // Cross-category link: fetch all docs, switch to All category, then navigate
                    try {
                      const all = await window.api.documents.list()
                      const target = all.find((d: SopDocument) => d.title.toLowerCase() === title.toLowerCase())
                      if (target) { setCategory('All'); setSearch(''); setSelected(target); setEditing(false); setCreating(false) }
                    } catch {}
                  }}
                />
              ) : (
                <p className='text-sm text-gray-600 italic'>No content. Click Edit to add content.</p>
              )}
            </div>
          </div>
        ) : (
          /* Empty state */
          <div className='flex-1 flex items-center justify-center'>
            <EmptyState icon={<FileText size={36}/>} title='Select a document'
              description='Choose a document from the list, or create a new one.' />
          </div>
        )}
      </div>
    </div>
  )
}
