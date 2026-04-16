import { useState, useEffect } from 'react'
import {
  Plus, Search, Edit2, Trash2, FileText, X, Save, ExternalLink, FileDown,
  ClipboardList, Truck, Phone, DollarSign, BookOpen, Shield, Folder,
  AlertCircle, Bookmark, Briefcase,
} from 'lucide-react'
import type { SopDocument, CreateSopDocumentDto, DocCategory } from '../types/models'
import { EmptyState } from '../components/ui/EmptyState'
import { renderMd } from '../lib/renderMd'

const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  All:        'All documents across every category.',
  Dispatch:   'Load assignments, check-call procedures, and dispatch SOPs.',
  Drivers:    'Onboarding checklists, orientation materials, and driver policies.',
  Sales:      'Rate sheets, carrier packets, and sales call scripts.',
  Marketing:  'Post templates, hot lane pitches, and outreach copy.',
  Brokers:    'Load lifecycle, DAT posting, carrier vetting, inbound call scripts, and broker relationship SOPs.',
  Finance:    'Invoice templates, settlement worksheets, and accounting SOPs.',
  Template:   'Reusable document templates for common operations.',
  Reference:  'Rate benchmarks, terminology guides, and regulatory references.',
  Policy:     'Company policies, compliance rules, and operating procedures.',
  Other:      'Miscellaneous documents that do not fit another category.',
}

const CATEGORY_COLORS: Record<string, string> = {
  Dispatch:        'bg-blue-600 text-white border-blue-500',
  Drivers:         'bg-green-600 text-white border-green-500',
  Sales:           'bg-orange-600 text-white border-orange-500',
  Marketing:       'bg-purple-600 text-white border-purple-500',
  Brokers:         'bg-teal-600 text-white border-teal-500',
  Finance:         'bg-emerald-600 text-white border-emerald-500',
  Template:        'bg-amber-500 text-white border-amber-400',
  Reference:       'bg-sky-600 text-white border-sky-500',
  Policy:          'bg-red-700 text-white border-red-600',
  Other:           'bg-surface-500 text-gray-300 border-surface-400',
  // Legacy labels — kept so old user-created docs render correctly
  SOP:             'bg-blue-600 text-white border-blue-500',
  Training:        'bg-green-600 text-white border-green-500',
  'New Authority': 'bg-orange-600 text-white border-orange-500',
}

// Titles used to pin docs in the "Start Here" section (partial match, case-insensitive)
const START_HERE_SEARCHES = [
  'Driver Onboarding Checklist',
  'Load Booking',
  'Check Call',
]

// Workflow-ordered category groups for the sidebar nav
const WORKFLOW_GROUPS = [
  {
    label: 'Your Workflow',
    headerClass: 'text-orange-700 dark:text-orange-400',
    cats: [
      { name: 'Dispatch',  Icon: ClipboardList },
      { name: 'Drivers',   Icon: Truck },
      { name: 'Brokers',   Icon: Briefcase },
      { name: 'Sales',     Icon: Phone },
      { name: 'Finance',   Icon: DollarSign },
    ],
  },
  {
    label: 'Reference',
    headerClass: 'text-gray-500',
    cats: [
      { name: 'Reference', Icon: BookOpen },
      { name: 'Template',  Icon: FileText },
      { name: 'Policy',    Icon: Shield },
      { name: 'Other',     Icon: Folder },
    ],
  },
] as const

function fmtDate(iso: string): string {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  } catch { return '' }
}

export function Documents() {
  const [docs, setDocs]               = useState<SopDocument[]>([])
  const [allDocs, setAllDocs]         = useState<SopDocument[]>([])
  const [category, setCategory]       = useState('All')
  const [search, setSearch]           = useState('')
  const [selected, setSelected]       = useState<SopDocument | null>(null)
  const [editing, setEditing]         = useState(false)
  const [creating, setCreating]       = useState(false)
  const [loading, setLoading]         = useState(true)
  const [draft, setDraft]             = useState<Partial<SopDocument>>({})
  const [linkedDoc, setLinkedDoc]     = useState<SopDocument | null>(null)
  const [bannerDismissed, setBannerDismissed] = useState(false)
  const [starterLoading, setStarterLoading]   = useState(false)

  // Pinned "Start Here" docs derived from all docs
  const pinnedDocs = START_HERE_SEARCHES
    .map(q => allDocs.find(d => d.title.toLowerCase().includes(q.toLowerCase())))
    .filter((d): d is SopDocument => d !== undefined)

  // Per-category doc counts for badges
  const catCounts = allDocs.reduce<Record<string, number>>((acc, d) => {
    acc[d.category] = (acc[d.category] ?? 0) + 1
    return acc
  }, {})

  useEffect(() => { load() }, [category])
  useEffect(() => { loadMeta() }, [])

  async function loadMeta() {
    try {
      const all = await window.api.documents.list()
      setAllDocs(all)
    } catch {}
  }

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
      await loadMeta()
    } catch {}
  }

  async function handleDelete(doc: SopDocument) {
    if (!confirm('Delete "' + doc.title + '"?')) return
    await window.api.documents.delete(doc.id)
    if (selected?.id === doc.id) setSelected(null)
    await load()
    await loadMeta()
  }

  async function handleLoadStarterKit() {
    setStarterLoading(true)
    try {
      await window.api.dev.reseedDocs()
      await load()
      await loadMeta()
      setBannerDismissed(true)
    } catch {}
    setStarterLoading(false)
  }

  function startCreate() {
    setDraft({ title: '', category: 'Dispatch', content: '' })
    setCreating(true); setEditing(false); setSelected(null)
  }
  function startEdit(doc: SopDocument) {
    setDraft({ title: doc.title, category: doc.category as DocCategory, content: doc.content ?? '' })
    setEditing(true); setCreating(false)
  }
  function cancelEdit() { setEditing(false); setCreating(false); setDraft({}) }

  function selectDoc(doc: SopDocument) {
    setSelected(doc); setEditing(false); setCreating(false)
  }

  return (
    <div className='h-full flex flex-col gap-4 animate-fade-in'>

      {/* Page header */}
      <div>
        <h1 className='text-xl font-bold text-gray-100'>Documents</h1>
        <p className='text-sm text-gray-500 mt-0.5'>Store SOPs, templates, and reference guides for your team.</p>
      </div>

      {/* New Dispatcher Guide banner */}
      {allDocs.length < 5 && !bannerDismissed && (
        <div className='flex items-center gap-3 px-4 py-3 bg-orange-600/10 border border-orange-700/40 rounded-xl'>
          <AlertCircle size={15} className='shrink-0 text-orange-400' />
          <p className='flex-1 text-sm text-gray-300'>
            New to dispatching? Load the starter kit to get 8 ready-to-use documents.
          </p>
          <button
            onClick={handleLoadStarterKit}
            disabled={starterLoading}
            className='px-3 py-1.5 bg-orange-600 hover:bg-orange-500 disabled:opacity-60 text-white text-xs font-medium rounded-lg transition-colors whitespace-nowrap'>
            {starterLoading ? 'Loading...' : 'Load Starter Kit'}
          </button>
          <button onClick={() => setBannerDismissed(true)} className='text-gray-500 hover:text-gray-300'>
            <X size={14}/>
          </button>
        </div>
      )}

      <div className='flex-1 min-h-0 flex gap-4'>

        {/* Left Panel */}
        <div className='w-64 shrink-0 flex flex-col gap-3'>

          {/* Search */}
          <div className='relative'>
            <Search size={14} className='absolute left-3 top-1/2 -translate-y-1/2 text-gray-500' />
            <input type='text' placeholder='Search documents...' value={search}
              onChange={e => handleSearch(e.target.value)}
              className='w-full pl-8 pr-3 py-2 bg-surface-700 border border-surface-400 rounded-lg text-sm text-gray-200 placeholder-gray-600 outline-none focus:border-orange-600/60' />
          </div>

          {/* Start Here pinned section */}
          {pinnedDocs.length > 0 && (
            <div>
              <p className='flex items-center gap-1.5 text-2xs text-gray-500 font-semibold uppercase tracking-wider px-1 mb-1.5'>
                <Bookmark size={10} className='text-orange-500' /> Start Here
              </p>
              <div className='space-y-1'>
                {pinnedDocs.map(doc => (
                  <button key={doc.id} onClick={() => selectDoc(doc)}
                    className={'w-full text-left px-3 py-2 rounded-r-lg border-l-2 border-l-orange-500 bg-orange-600/10 transition-colors ' +
                      (selected?.id === doc.id ? 'bg-orange-600/20' : 'hover:bg-orange-600/15')}>
                    <p className='text-xs font-semibold text-orange-900 dark:text-orange-300 truncate'>{doc.title}</p>
                    <span className={'text-2xs px-1.5 py-0.5 rounded border mt-1 inline-block ' + (CATEGORY_COLORS[doc.category] ?? CATEGORY_COLORS.Other)}>
                      {doc.category}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Grouped category navigation */}
          <div className='bg-surface-700 rounded-xl border border-surface-400 p-2'>

            {/* All */}
            <button onClick={() => { setCategory('All'); setSearch('') }}
              className={'w-full flex items-center gap-2 text-left px-2 py-1.5 rounded-lg text-sm transition-colors ' +
                (category === 'All' ? 'bg-orange-600/20 text-orange-800 dark:text-orange-400 font-medium' : 'text-gray-400 hover:bg-surface-600 hover:text-gray-200')}>
              <span className='flex-1'>All Documents</span>
              <span className='text-2xs bg-surface-600 text-gray-500 px-1.5 py-0.5 rounded-full'>{allDocs.length}</span>
            </button>

            {WORKFLOW_GROUPS.map(group => (
              <div key={group.label} className='mt-2.5'>
                <p className={'text-2xs font-semibold uppercase tracking-wider px-2 mb-1 ' + group.headerClass}>
                  {group.label}
                </p>
                {group.cats.map(({ name, Icon }) => (
                  <button key={name} onClick={() => { setCategory(name); setSearch('') }}
                    className={'w-full flex items-center gap-2 text-left px-2 py-1.5 rounded-lg text-sm transition-colors ' +
                      (category === name ? 'bg-orange-600/20 text-orange-800 dark:text-orange-400 font-medium' : 'text-gray-400 hover:bg-surface-600 hover:text-gray-200')}>
                    <Icon size={12} className='shrink-0' />
                    <span className='flex-1'>{name}</span>
                    {(catCounts[name] ?? 0) > 0 && (
                      <span className='text-2xs bg-surface-600 text-gray-500 px-1.5 py-0.5 rounded-full'>{catCounts[name]}</span>
                    )}
                  </button>
                ))}
              </div>
            ))}

            {CATEGORY_DESCRIPTIONS[category] && (
              <p className='text-2xs text-gray-600 italic px-2 pt-2 border-t border-surface-500/50 mt-1'>
                {CATEGORY_DESCRIPTIONS[category]}
              </p>
            )}
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
              <button key={doc.id} onClick={() => selectDoc(doc)}
                className={'w-full text-left px-3 py-2 rounded-lg border transition-colors ' +
                  (selected?.id === doc.id ? 'bg-orange-600/15 border-orange-700/40 text-orange-900 dark:text-orange-300' : 'bg-surface-700 border-surface-400 text-gray-300 hover:border-surface-300')}>
                <p className='text-xs font-semibold truncate mb-1'>{doc.title}</p>
                <div className='flex items-center gap-2'>
                  <span className={'text-2xs px-1.5 py-0.5 rounded border shrink-0 ' + (CATEGORY_COLORS[doc.category] ?? CATEGORY_COLORS.Other)}>
                    {doc.category}
                  </span>
                  {doc.updated_at && (
                    <span className='text-2xs text-gray-600 truncate'>{fmtDate(doc.updated_at)}</span>
                  )}
                </div>
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
                <select value={draft.category ?? 'Dispatch'} onChange={e => setDraft(d => ({ ...d, category: e.target.value as DocCategory }))}
                  className='bg-surface-600 border border-surface-400 rounded-lg px-2 py-1.5 text-sm text-gray-300 outline-none'>
                  {(['Dispatch','Drivers','Sales','Finance','Reference','Template','Policy','Other','Marketing','Brokers'] as DocCategory[]).map(c => (
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
                {selected.file_path && (
                  <button
                    onClick={() => window.api.shell.openFile(selected.file_path!)}
                    title='Open PDF file'
                    className='flex items-center gap-1 px-3 py-1.5 text-xs border border-surface-400 text-gray-400 hover:text-orange-400 hover:border-orange-600/40 rounded-lg transition-colors'>
                    <FileDown size={12}/> Open PDF
                  </button>
                )}
                <button onClick={() => window.api.documents.popout(selected.id)}
                  title='Open in new window'
                  className='flex items-center gap-1 px-3 py-1.5 text-xs border border-surface-400 text-gray-400 hover:text-orange-400 hover:border-orange-600/40 rounded-lg transition-colors'>
                  <ExternalLink size={12}/> Pop out
                </button>
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
                      const el = (e.target as HTMLElement).closest('a') as HTMLElement | null
                      if (!el) return
                      const filePath = el.getAttribute('data-file-link')
                      if (filePath) { e.preventDefault(); window.api.shell.openFile(filePath); return }
                      const title = el.getAttribute('data-doc-link')
                      if (!title) return
                      e.preventDefault()
                      try {
                        const all = await window.api.documents.list()
                        const target = all.find((d: SopDocument) => d.title.toLowerCase() === title.toLowerCase())
                        if (target) setLinkedDoc(target)
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

        {/* Linked-doc modal — opens [[cross-reference]] links without leaving current view */}
        {linkedDoc && (
          <LinkedDocModal doc={linkedDoc} onClose={() => setLinkedDoc(null)} />
        )}
      </div>
    </div>
  )
}

// ── Linked Document Modal ─────────────────────────────────────────────────────

function LinkedDocModal({ doc, onClose }: { doc: SopDocument; onClose: () => void }) {
  const [stack, setStack] = useState<SopDocument[]>([doc])
  const current = stack[stack.length - 1]

  async function followLink(title: string) {
    try {
      const all: SopDocument[] = await window.api.documents.list()
      const target = all.find(d => d.title.toLowerCase() === title.toLowerCase())
      if (target) setStack(s => [...s, target])
    } catch {}
  }

  return (
    <div
      className='fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-6'
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className='bg-surface-700 border border-surface-400 rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col'>
        <div className='flex items-center gap-3 px-5 py-3 border-b border-surface-400 shrink-0'>
          {stack.length > 1 && (
            <button
              onClick={() => setStack(s => s.slice(0, -1))}
              className='text-gray-500 hover:text-gray-300 text-xs px-2 py-0.5 border border-surface-400 rounded transition-colors'>
              Back
            </button>
          )}
          <h3 className='text-sm font-semibold text-gray-100 flex-1 truncate'>{current.title}</h3>
          <span className={'text-2xs px-1.5 py-0 rounded border ' + (CATEGORY_COLORS[current.category] ?? CATEGORY_COLORS.Other)}>
            {current.category}
          </span>
          <button onClick={onClose} className='text-gray-500 hover:text-gray-300 ml-1'>
            <X size={16}/>
          </button>
        </div>
        <div className='flex-1 overflow-y-auto px-6 py-5'>
          {current.content ? (
            <div
              dangerouslySetInnerHTML={{ __html: renderMd(current.content) }}
              onClick={async (e) => {
                const link = (e.target as HTMLElement).closest('[data-doc-link]') as HTMLElement | null
                const title = link?.getAttribute('data-doc-link')
                if (title) { e.preventDefault(); await followLink(title) }
              }}
            />
          ) : (
            <p className='text-sm text-gray-600 italic'>No content.</p>
          )}
        </div>
      </div>
    </div>
  )
}
