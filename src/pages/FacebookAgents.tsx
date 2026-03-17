import { useState, useEffect, useRef } from 'react'
import {
  MessageCircle, Search, Megaphone, Plus, Trash2, Copy, Check,
  ChevronDown, AlertTriangle, RefreshCw, UserPlus, Phone,
  CalendarDays, Loader2, X, ArrowRight,
} from 'lucide-react'
import type {
  FbConversation, FbConvStage, CreateFbConversationDto,
  FbPost, FbPostStatus,
  FbQueuePost, FbContentCategory,
  ClaudeResponse,
} from '../types/models'

// ── Shared constants ────────────────────────────────────────────────────────

const STAGES: FbConvStage[] = ['New', 'Replied', 'Interested', 'Call Ready', 'Converted', 'Dead']

const STAGE_STYLES: Record<FbConvStage, string> = {
  'New':        'bg-surface-600 text-gray-400 border-surface-400',
  'Replied':    'bg-blue-900/30 text-blue-400 border-blue-700/40',
  'Interested': 'bg-yellow-900/30 text-yellow-400 border-yellow-700/40',
  'Call Ready': 'bg-orange-900/30 text-orange-400 border-orange-700/40',
  'Converted':  'bg-green-900/30 text-green-400 border-green-700/40',
  'Dead':       'bg-surface-600 text-gray-700 border-surface-500',
}

const INTENT_STYLES: Record<string, string> = {
  'Needs Dispatcher':               'bg-orange-900/30 text-orange-400 border-orange-700/40',
  'Needs Load':                     'bg-blue-900/30 text-blue-400 border-blue-700/40',
  'Empty Truck':                    'bg-yellow-900/30 text-yellow-400 border-yellow-700/40',
  'Looking for Consistent Freight': 'bg-green-900/30 text-green-400 border-green-700/40',
  'General Networking':             'bg-teal-900/30 text-teal-400 border-teal-700/40',
  'Low Intent':                     'bg-surface-600 text-gray-500 border-surface-400',
  'Ignore':                         'bg-surface-600 text-gray-700 border-surface-500',
}

const CATEGORIES: FbContentCategory[] = [
  'Driver Recruitment', 'Educational', 'New Authority Tip',
  'Lane Availability', 'Small Fleet Positioning', 'Trust / Credibility', 'Engagement Question',
]

const CATEGORY_STYLES: Record<string, string> = {
  'Driver Recruitment':        'bg-orange-900/30 text-orange-400',
  'Educational':               'bg-blue-900/30 text-blue-400',
  'New Authority Tip':         'bg-green-900/30 text-green-400',
  'Lane Availability':         'bg-yellow-900/30 text-yellow-400',
  'Small Fleet Positioning':   'bg-purple-900/30 text-purple-400',
  'Trust / Credibility':       'bg-teal-900/30 text-teal-400',
  'Engagement Question':       'bg-pink-900/30 text-pink-400',
}

const fmtDate = (d: string | null) => {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// ── Shared UI components ─────────────────────────────────────────────────────

function AiOutput({ result, loading }: { result: ClaudeResponse | null; loading: boolean }) {
  const [copied, setCopied] = useState(false)
  if (loading) {
    return (
      <div className='flex items-center gap-2 px-4 py-3 bg-surface-600 rounded-lg text-sm text-gray-500'>
        <Loader2 size={14} className='animate-spin' /> Generating...
      </div>
    )
  }
  if (!result) return null
  if (!result.ok) {
    return (
      <div className='flex items-start gap-2 px-3 py-2.5 bg-red-900/20 border border-red-700/30 rounded-lg'>
        <AlertTriangle size={13} className='text-red-400 mt-0.5 shrink-0' />
        <p className='text-xs text-red-300'>{result.error}</p>
      </div>
    )
  }
  const copy = () => {
    navigator.clipboard.writeText(result.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <div className='relative group bg-surface-600 border border-surface-400 rounded-lg px-4 py-3'>
      <p className='text-sm text-gray-200 leading-relaxed whitespace-pre-wrap pr-8'>{result.content}</p>
      <button onClick={copy}
        className='absolute top-2.5 right-2.5 p-1 rounded text-gray-600 hover:text-orange-400 transition-colors'
        title='Copy to clipboard'>
        {copied ? <Check size={13} className='text-green-400' /> : <Copy size={13} />}
      </button>
    </div>
  )
}

function NoApiKey() {
  return (
    <div className='flex items-start gap-2 px-3 py-2.5 bg-yellow-900/20 border border-yellow-700/30 rounded-lg mb-4'>
      <AlertTriangle size={13} className='text-yellow-400 mt-0.5 shrink-0' />
      <p className='text-xs text-yellow-300'>
        Claude API key not configured. Go to <strong>Settings &gt; AI Integration</strong> to add your key.
      </p>
    </div>
  )
}

// ── Agent 1: Conversation / Conversion ──────────────────────────────────────

function ConversationAgent() {
  const [convs, setConvs]         = useState<FbConversation[]>([])
  const [selected, setSelected]   = useState<FbConversation | null>(null)
  const [stageFilter, setStageFilter] = useState<string>('All')
  const [loading, setLoading]     = useState(true)
  const [aiResult, setAiResult]   = useState<ClaudeResponse | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [hasApiKey, setHasApiKey] = useState(true)
  const [adding, setAdding]       = useState(false)
  const [newForm, setNewForm]     = useState({ name: '', phone: '', notes: '' })

  useEffect(() => {
    window.api.settings.get('claude_api_key').then(v => setHasApiKey(!!v)).catch(() => setHasApiKey(false))
    loadConvs()
  }, [])

  const loadConvs = async () => {
    setLoading(true)
    try { setConvs(await window.api.fbConv.list()) } catch {}
    setLoading(false)
  }

  const filtered = stageFilter === 'All' ? convs : convs.filter(c => c.stage === stageFilter)

  const update = async (id: number, dto: object) => {
    const updated = await window.api.fbConv.update(id, dto)
    if (updated) {
      setConvs(p => p.map(c => c.id === id ? updated : c))
      setSelected(updated)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this conversation?')) return
    await window.api.fbConv.delete(id)
    setConvs(p => p.filter(c => c.id !== id))
    if (selected?.id === id) setSelected(null)
  }

  const handleAdd = async () => {
    if (!newForm.name.trim()) return
    const dup = await window.api.fbConv.exists(newForm.name.trim(), newForm.phone.trim() || null)
    if (dup && !confirm('A conversation with this name already exists. Add anyway?')) return
    const dto: CreateFbConversationDto = {
      name: newForm.name.trim(),
      phone: newForm.phone.trim() || null,
      notes: newForm.notes.trim() || null,
      platform: 'Facebook',
      stage: 'New',
      lead_id: null, last_message: null, last_message_at: null, follow_up_at: null,
    }
    const conv = await window.api.fbConv.create(dto)
    setConvs(p => [conv, ...p])
    setSelected(conv)
    setAdding(false)
    setNewForm({ name: '', phone: '', notes: '' })
  }

  const convertToLead = async (conv: FbConversation) => {
    try {
      const lead = await window.api.leads.create({
        name: conv.name,
        company: null,
        mc_number: null,
        phone: conv.phone,
        email: null,
        city: null, state: null,
        trailer_type: null,
        authority_date: null,
        fleet_size: null,
        source: 'Facebook',
        status: 'Contacted',
        priority: 'Medium',
        follow_up_date: conv.follow_up_at ?? null,
        notes: conv.notes ?? null,
      })
      await update(conv.id, { lead_id: lead.id, stage: 'Converted' })
      alert('Lead created! View it in the Leads tab.')
    } catch (e) {
      alert('Failed to create lead: ' + String(e))
    }
  }

  const aiAction = async (action: string) => {
    if (!selected) return
    setAiLoading(true)
    setAiResult(null)
    try {
      let result: ClaudeResponse
      if (action === 'reply') {
        result = await window.api.fbConv.generateReply({
          name: selected.name, stage: selected.stage,
          lastMessage: selected.last_message, trailer: null, location: null,
        })
      } else if (action === 'followup') {
        result = await window.api.fbConv.generateFollowUp({
          name: selected.name, stage: selected.stage, lastMessageAt: selected.last_message_at,
        })
      } else if (action === 'question') {
        result = await window.api.fbConv.suggestQuestion({
          name: selected.name, stage: selected.stage,
          lastMessage: selected.last_message, trailer: null, location: null,
        })
      } else {
        result = await window.api.fbConv.handoffSummary({
          name: selected.name, phone: selected.phone,
          trailer: null, location: null, stage: selected.stage, notes: selected.notes,
        })
      }
      setAiResult(result)
    } catch { setAiResult({ ok: false, error: 'Unexpected error' }) }
    setAiLoading(false)
  }

  const today = new Date().toISOString().split('T')[0]

  return (
    <div className='flex flex-col gap-3 h-full'>
      {!hasApiKey && <NoApiKey />}
      <div className='flex gap-4 flex-1 min-h-0'>
      {/* Left: queue */}
      <div className='w-64 shrink-0 flex flex-col gap-2'>
        <div className='flex items-center gap-2'>
          <select value={stageFilter} onChange={e => setStageFilter(e.target.value)}
            className='flex-1 bg-surface-700 border border-surface-400 rounded-lg px-2 py-1.5 text-xs text-gray-300 outline-none'>
            <option value='All'>All Stages</option>
            {STAGES.map(s => <option key={s}>{s}</option>)}
          </select>
          <button onClick={() => setAdding(v => !v)}
            className='p-1.5 bg-orange-600 hover:bg-orange-500 text-white rounded-lg transition-colors'>
            <Plus size={14} />
          </button>
        </div>
        {adding && (
          <div className='bg-surface-700 border border-surface-400 rounded-lg p-3 space-y-2'>
            <input value={newForm.name} onChange={e => setNewForm(p => ({ ...p, name: e.target.value }))}
              placeholder='Name *' className='w-full bg-surface-600 border border-surface-400 rounded px-2 py-1 text-xs text-gray-200 outline-none' />
            <input value={newForm.phone} onChange={e => setNewForm(p => ({ ...p, phone: e.target.value }))}
              placeholder='Phone (optional)' className='w-full bg-surface-600 border border-surface-400 rounded px-2 py-1 text-xs text-gray-200 outline-none' />
            <textarea value={newForm.notes} onChange={e => setNewForm(p => ({ ...p, notes: e.target.value }))}
              rows={2} placeholder='Notes...' className='w-full bg-surface-600 border border-surface-400 rounded px-2 py-1 text-xs text-gray-200 outline-none resize-none' />
            <div className='flex gap-2'>
              <button onClick={handleAdd} className='px-2 py-1 text-2xs bg-orange-600 hover:bg-orange-500 text-white rounded transition-colors'>Add</button>
              <button onClick={() => setAdding(false)} className='px-2 py-1 text-2xs text-gray-500 hover:text-gray-300 rounded transition-colors'>Cancel</button>
            </div>
          </div>
        )}
        <div className='flex-1 overflow-y-auto space-y-1'>
          {loading ? (
            <p className='text-xs text-gray-700 text-center py-4'>Loading...</p>
          ) : filtered.length === 0 ? (
            <p className='text-xs text-gray-700 italic text-center py-4'>No conversations.</p>
          ) : filtered.map(c => {
            const overdue = c.follow_up_at && c.follow_up_at < today && !['Converted','Dead'].includes(c.stage)
            return (
              <button key={c.id} onClick={() => { setSelected(c); setAiResult(null) }}
                className={'w-full text-left px-3 py-2 rounded-lg border transition-colors ' +
                  (selected?.id === c.id ? 'bg-orange-600/15 border-orange-700/40' : 'bg-surface-700 border-surface-400 hover:border-surface-300')}>
                <div className='flex items-center justify-between gap-1'>
                  <p className='text-xs font-medium text-gray-100 truncate'>{c.name}</p>
                  {overdue && <AlertTriangle size={10} className='text-orange-400 shrink-0' />}
                </div>
                <span className={'text-2xs px-1.5 py-0.5 rounded-full border mt-1 inline-block ' + (STAGE_STYLES[c.stage] ?? STAGE_STYLES.New)}>
                  {c.stage}
                </span>
                {c.follow_up_at && <p className='text-2xs text-gray-700 mt-0.5'>{fmtDate(c.follow_up_at)}</p>}
              </button>
            )
          })}
        </div>
      </div>

      {/* Right: detail */}
      <div className='flex-1 min-w-0 bg-surface-700 rounded-xl border border-surface-400 flex flex-col overflow-hidden'>
        {!selected ? (
          <div className='flex-1 flex items-center justify-center'>
            <div className='text-center'>
              <MessageCircle size={32} className='text-gray-700 mx-auto mb-3' />
              <p className='text-sm text-gray-600'>Select a conversation or add a new one</p>
            </div>
          </div>
        ) : (
          <div className='flex flex-col h-full overflow-y-auto'>
            {/* Header */}
            <div className='flex items-start justify-between px-5 py-4 border-b border-surface-600 shrink-0'>
              <div>
                <h3 className='text-base font-semibold text-gray-100'>{selected.name}</h3>
                {selected.phone && <p className='text-xs text-gray-500 mt-0.5'>{selected.phone}</p>}
                {!hasApiKey && <NoApiKey />}
              </div>
              <button onClick={() => handleDelete(selected.id)} className='text-gray-600 hover:text-red-400 transition-colors p-1'>
                <Trash2 size={14} />
              </button>
            </div>

            <div className='flex-1 px-5 py-4 space-y-4'>
              {/* Stage + follow-up */}
              <div className='grid grid-cols-2 gap-3'>
                <div>
                  <p className='text-2xs text-gray-600 mb-1'>Stage</p>
                  <select value={selected.stage}
                    onChange={e => update(selected.id, { stage: e.target.value })}
                    className='w-full bg-surface-600 border border-surface-400 rounded-lg px-2 py-1.5 text-sm text-gray-300 outline-none'>
                    {STAGES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <p className='text-2xs text-gray-600 mb-1'>Follow-up Date</p>
                  <input type='date' value={selected.follow_up_at ?? ''}
                    onChange={e => update(selected.id, { follow_up_at: e.target.value || null })}
                    className='w-full bg-surface-600 border border-surface-400 rounded-lg px-2 py-1.5 text-sm text-gray-300 outline-none' />
                </div>
              </div>

              {/* Last message */}
              <div>
                <p className='text-2xs text-gray-600 mb-1'>Last Message / Context</p>
                <textarea
                  value={selected.last_message ?? ''}
                  onChange={e => update(selected.id, { last_message: e.target.value || null, last_message_at: new Date().toISOString() })}
                  rows={3} placeholder='Paste their last message or add context...'
                  className='w-full bg-surface-600 border border-surface-400 rounded-lg px-3 py-2 text-sm text-gray-300 resize-none outline-none focus:border-orange-600/50 placeholder-gray-700' />
              </div>

              {/* Notes */}
              <div>
                <p className='text-2xs text-gray-600 mb-1'>Notes</p>
                <textarea
                  value={selected.notes ?? ''}
                  onChange={e => update(selected.id, { notes: e.target.value || null })}
                  rows={2} placeholder='Equipment, location, anything relevant...'
                  className='w-full bg-surface-600 border border-surface-400 rounded-lg px-3 py-2 text-sm text-gray-300 resize-none outline-none focus:border-orange-600/50 placeholder-gray-700' />
              </div>

              {/* AI actions */}
              <div>
                <p className='text-2xs text-gray-600 mb-2'>AI Actions</p>
                <div className='grid grid-cols-2 gap-2'>
                  {[
                    { key: 'reply',    label: 'Generate Reply' },
                    { key: 'followup', label: 'Generate Follow-Up' },
                    { key: 'question', label: 'Suggest Next Question' },
                    { key: 'handoff',  label: 'Call-Ready Summary' },
                  ].map(({ key, label }) => (
                    <button key={key}
                      onClick={() => aiAction(key)}
                      disabled={aiLoading || !hasApiKey}
                      className='flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium bg-surface-600 hover:bg-surface-500 text-gray-300 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed'>
                      {aiLoading ? <Loader2 size={11} className='animate-spin' /> : <RefreshCw size={11} />}
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* AI output */}
              <AiOutput result={aiResult} loading={aiLoading} />

              {/* Convert to Lead */}
              {!selected.lead_id && (
                <button onClick={() => convertToLead(selected)}
                  className='flex items-center gap-2 w-full justify-center py-2 text-xs font-medium border border-orange-600/40 text-orange-400 hover:bg-orange-600/10 rounded-lg transition-colors'>
                  <UserPlus size={13} /> Convert to Lead
                </button>
              )}
              {selected.lead_id && (
                <p className='text-xs text-green-400 text-center'>Converted to Lead #{selected.lead_id}</p>
              )}
            </div>
          </div>
        )}
      </div>
      </div>
    </div>
  )
}

// ── Agent 2: Lead Hunter ─────────────────────────────────────────────────────

interface ClassifyResult {
  intent: string
  extractedName: string | null
  extractedPhone: string | null
  extractedLocation: string | null
  extractedEquipment: string | null
  recommendedAction: string
  why: string
}

function LeadHunterAgent() {
  const [posts, setPosts]           = useState<FbPost[]>([])
  const [selected, setSelected]     = useState<FbPost | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('queued')
  const [loading, setLoading]       = useState(true)
  const [aiResult, setAiResult]     = useState<ClaudeResponse | null>(null)
  const [aiLoading, setAiLoading]   = useState(false)
  const [hasApiKey, setHasApiKey]   = useState(true)
  const [pasteText, setPasteText]   = useState('')
  const [pasteAuthor, setPasteAuthor] = useState('')
  const [pasteGroup, setPasteGroup] = useState('')
  const [adding, setAdding]         = useState(false)

  useEffect(() => {
    window.api.settings.get('claude_api_key').then(v => setHasApiKey(!!v)).catch(() => setHasApiKey(false))
    loadPosts()
  }, [])

  const loadPosts = async (status?: string) => {
    setLoading(true)
    try { setPosts(await (window.api.fbHunter.list as any)(status || statusFilter)) } catch {}
    setLoading(false)
  }

  const filtered = statusFilter === 'All' ? posts : posts.filter(p => p.status === statusFilter)

  const updatePost = async (id: number, dto: object) => {
    const updated = await window.api.fbHunter.update(id, dto)
    if (updated) {
      setPosts(p => p.map(x => x.id === id ? updated : x))
      setSelected(updated)
    }
  }

  const handleAddPost = async () => {
    if (!pasteText.trim()) return
    const dup = await window.api.fbHunter.exists(pasteText.trim())
    if (dup && !confirm('This post already exists in the queue. Add anyway?')) return
    const post = await window.api.fbHunter.create({
      raw_text: pasteText.trim(),
      author_name: pasteAuthor.trim() || null,
      group_name: pasteGroup.trim() || null,
      posted_at: null, intent: null,
      extracted_name: null, extracted_phone: null, extracted_location: null, extracted_equipment: null,
      recommended_action: null, draft_comment: null, draft_dm: null, lead_id: null, status: 'queued',
    })
    setPosts(p => [post, ...p])
    setSelected(post)
    setPasteText(''); setPasteAuthor(''); setPasteGroup('')
    setAdding(false)
    // Auto-classify if API key present
    if (hasApiKey) await classifyPost(post)
  }

  const classifyPost = async (post: FbPost) => {
    setAiLoading(true)
    setAiResult(null)
    const result = await window.api.fbHunter.classify({ rawText: post.raw_text })
    setAiResult(result)
    if (result.ok) {
      try {
        const parsed = JSON.parse(result.content) as ClassifyResult
        const updated = await window.api.fbHunter.update(post.id, {
          intent: parsed.intent as any,
          extracted_name:      parsed.extractedName,
          extracted_phone:     parsed.extractedPhone,
          extracted_location:  parsed.extractedLocation,
          extracted_equipment: parsed.extractedEquipment,
          recommended_action:  parsed.recommendedAction,
        })
        if (updated) { setPosts(p => p.map(x => x.id === post.id ? updated : x)); setSelected(updated) }
      } catch { /* JSON parse failed, raw output still shown */ }
    }
    setAiLoading(false)
  }

  const handleDraftComment = async () => {
    if (!selected) return
    setAiLoading(true); setAiResult(null)
    const result = await window.api.fbHunter.draftComment({ rawText: selected.raw_text, intent: selected.intent ?? 'General Networking' })
    setAiResult(result)
    if (result.ok) await updatePost(selected.id, { draft_comment: result.content, status: 'reviewed' })
    setAiLoading(false)
  }

  const handleDraftDm = async () => {
    if (!selected) return
    setAiLoading(true); setAiResult(null)
    const extractedInfo = [
      selected.extracted_name && 'Name: ' + selected.extracted_name,
      selected.extracted_location && 'Location: ' + selected.extracted_location,
      selected.extracted_equipment && 'Equipment: ' + selected.extracted_equipment,
      selected.extracted_phone && 'Phone: ' + selected.extracted_phone,
    ].filter(Boolean).join(', ') || 'none'
    const result = await window.api.fbHunter.draftDm({ intent: selected.intent ?? 'General Networking', extractedInfo })
    setAiResult(result)
    if (result.ok) await updatePost(selected.id, { draft_dm: result.content, status: 'reviewed' })
    setAiLoading(false)
  }

  const convertToLead = async (post: FbPost) => {
    try {
      const lead = await window.api.leads.create({
        name: post.extracted_name ?? post.author_name ?? 'Unknown',
        company: null,
        mc_number: null,
        phone: post.extracted_phone,
        email: null,
        city: null, state: null,
        trailer_type: post.extracted_equipment,
        authority_date: null,
        fleet_size: null,
        source: 'Facebook',
        status: 'New',
        priority: post.intent === 'Needs Dispatcher' || post.intent === 'Looking for Consistent Freight' ? 'High' : 'Medium',
        follow_up_date: new Date(Date.now() + 864e5).toISOString().split('T')[0],
        notes: 'From FB post: ' + post.raw_text.slice(0, 200),
      })
      await updatePost(post.id, { lead_id: lead.id, status: 'converted' })
      alert('Lead created! View in the Leads tab.')
    } catch (e) { alert('Failed: ' + String(e)) }
  }

  return (
    <div className='flex flex-col gap-3 h-full'>
      {!hasApiKey && <NoApiKey />}
      <div className='flex gap-4 flex-1 min-h-0'>
      {/* Left: queue */}
      <div className='w-64 shrink-0 flex flex-col gap-2'>
        <div className='flex items-center gap-2'>
          <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); loadPosts(e.target.value) }}
            className='flex-1 bg-surface-700 border border-surface-400 rounded-lg px-2 py-1.5 text-xs text-gray-300 outline-none'>
            {['All','queued','reviewed','converted','ignored'].map(s => (
              <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
            ))}
          </select>
          <button onClick={() => setAdding(v => !v)}
            className='p-1.5 bg-orange-600 hover:bg-orange-500 text-white rounded-lg transition-colors'>
            <Plus size={14} />
          </button>
        </div>

        {adding && (
          <div className='bg-surface-700 border border-surface-400 rounded-lg p-3 space-y-2'>
            <input value={pasteAuthor} onChange={e => setPasteAuthor(e.target.value)}
              placeholder='Author name (optional)' className='w-full bg-surface-600 border border-surface-400 rounded px-2 py-1 text-xs text-gray-200 outline-none' />
            <input value={pasteGroup} onChange={e => setPasteGroup(e.target.value)}
              placeholder='Group name (optional)' className='w-full bg-surface-600 border border-surface-400 rounded px-2 py-1 text-xs text-gray-200 outline-none' />
            <textarea value={pasteText} onChange={e => setPasteText(e.target.value)}
              rows={4} placeholder='Paste the post text here...'
              className='w-full bg-surface-600 border border-surface-400 rounded px-2 py-1 text-xs text-gray-200 outline-none resize-none' />
            <div className='flex gap-2'>
              <button onClick={handleAddPost} className='px-2 py-1 text-2xs bg-orange-600 hover:bg-orange-500 text-white rounded transition-colors'>
                Add + Classify
              </button>
              <button onClick={() => setAdding(false)} className='px-2 py-1 text-2xs text-gray-500 hover:text-gray-300 rounded transition-colors'>Cancel</button>
            </div>
          </div>
        )}

        <div className='flex-1 overflow-y-auto space-y-1'>
          {loading ? (
            <p className='text-xs text-gray-700 text-center py-4'>Loading...</p>
          ) : filtered.length === 0 ? (
            <p className='text-xs text-gray-700 italic text-center py-4'>No posts in queue.</p>
          ) : filtered.map(p => (
            <button key={p.id} onClick={() => { setSelected(p); setAiResult(null) }}
              className={'w-full text-left px-3 py-2 rounded-lg border transition-colors ' +
                (selected?.id === p.id ? 'bg-orange-600/15 border-orange-700/40' : 'bg-surface-700 border-surface-400 hover:border-surface-300')}>
              <p className='text-2xs text-gray-500 truncate mb-1'>{p.author_name ?? 'Unknown'}</p>
              {p.intent ? (
                <span className={'text-2xs px-1.5 py-0.5 rounded border ' + (INTENT_STYLES[p.intent] ?? 'bg-surface-600 text-gray-500 border-surface-400')}>
                  {p.intent}
                </span>
              ) : (
                <span className='text-2xs text-gray-700 italic'>Not classified</span>
              )}
              <p className='text-2xs text-gray-600 mt-1 truncate'>{p.raw_text.slice(0, 60)}...</p>
            </button>
          ))}
        </div>
      </div>

      {/* Right: detail */}
      <div className='flex-1 min-w-0 bg-surface-700 rounded-xl border border-surface-400 flex flex-col overflow-hidden'>
        {!selected ? (
          <div className='flex-1 flex items-center justify-center'>
            <div className='text-center'>
              <Search size={32} className='text-gray-700 mx-auto mb-3' />
              <p className='text-sm text-gray-600'>Add a post to classify or select one from the queue</p>
            </div>
          </div>
        ) : (
          <div className='flex flex-col h-full overflow-y-auto'>
            <div className='flex items-start justify-between px-5 py-4 border-b border-surface-600 shrink-0'>
              <div>
                <p className='text-xs text-gray-500'>{selected.author_name ?? 'Unknown author'} {selected.group_name ? '· ' + selected.group_name : ''}</p>
                {!hasApiKey && <NoApiKey />}
              </div>
              <div className='flex items-center gap-2'>
                <select value={selected.status}
                  onChange={e => updatePost(selected.id, { status: e.target.value })}
                  className='bg-surface-600 border border-surface-400 rounded-lg px-2 py-1 text-xs text-gray-300 outline-none'>
                  {['queued','reviewed','converted','ignored'].map(s => <option key={s}>{s}</option>)}
                </select>
                <button onClick={() => { window.api.fbHunter.delete(selected.id); setPosts(p => p.filter(x => x.id !== selected.id)); setSelected(null) }}
                  className='text-gray-600 hover:text-red-400 transition-colors p-1'>
                  <Trash2 size={13} />
                </button>
              </div>
            </div>

            <div className='flex-1 px-5 py-4 space-y-4'>
              {/* Raw text */}
              <div className='bg-surface-600 rounded-lg px-4 py-3 border border-surface-500'>
                <p className='text-xs text-gray-600 mb-1'>Post Text</p>
                <p className='text-sm text-gray-300 leading-relaxed whitespace-pre-wrap'>{selected.raw_text}</p>
              </div>

              {/* Extracted info */}
              {selected.intent && (
                <div className='grid grid-cols-2 gap-2 text-xs'>
                  <div className='col-span-2'>
                    <span className={'inline-block px-2 py-0.5 rounded border text-xs ' + (INTENT_STYLES[selected.intent] ?? '')}>{selected.intent}</span>
                    {selected.recommended_action && <p className='text-gray-400 mt-1'>{selected.recommended_action}</p>}
                  </div>
                  {[
                    ['Name', selected.extracted_name],
                    ['Phone', selected.extracted_phone],
                    ['Location', selected.extracted_location],
                    ['Equipment', selected.extracted_equipment],
                  ].filter(([, v]) => v).map(([label, value]) => (
                    <div key={label as string}>
                      <p className='text-gray-600'>{label}</p>
                      <p className='text-gray-300'>{value}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* AI actions */}
              <div className='flex flex-wrap gap-2'>
                <button onClick={() => classifyPost(selected)} disabled={aiLoading || !hasApiKey}
                  className='flex items-center gap-1.5 px-3 py-1.5 text-xs bg-surface-600 hover:bg-surface-500 text-gray-300 rounded-lg transition-colors disabled:opacity-50'>
                  <RefreshCw size={11} /> {selected.intent ? 'Re-Classify' : 'Classify'}
                </button>
                <button onClick={handleDraftComment} disabled={aiLoading || !hasApiKey}
                  className='flex items-center gap-1.5 px-3 py-1.5 text-xs bg-surface-600 hover:bg-surface-500 text-gray-300 rounded-lg transition-colors disabled:opacity-50'>
                  <MessageCircle size={11} /> Draft Comment
                </button>
                <button onClick={handleDraftDm} disabled={aiLoading || !hasApiKey}
                  className='flex items-center gap-1.5 px-3 py-1.5 text-xs bg-surface-600 hover:bg-surface-500 text-gray-300 rounded-lg transition-colors disabled:opacity-50'>
                  <ArrowRight size={11} /> Draft DM
                </button>
                {!selected.lead_id && (
                  <button onClick={() => convertToLead(selected)}
                    className='flex items-center gap-1.5 px-3 py-1.5 text-xs border border-orange-600/40 text-orange-400 hover:bg-orange-600/10 rounded-lg transition-colors'>
                    <UserPlus size={11} /> Convert to Lead
                  </button>
                )}
              </div>

              {/* Saved drafts */}
              {selected.draft_comment && (
                <div>
                  <p className='text-2xs text-gray-600 mb-1'>Saved Comment Draft</p>
                  <div className='bg-surface-600 rounded-lg px-3 py-2 border border-surface-500'>
                    <p className='text-sm text-gray-300 leading-relaxed'>{selected.draft_comment}</p>
                  </div>
                </div>
              )}
              {selected.draft_dm && (
                <div>
                  <p className='text-2xs text-gray-600 mb-1'>Saved DM Draft</p>
                  <div className='bg-surface-600 rounded-lg px-3 py-2 border border-surface-500'>
                    <p className='text-sm text-gray-300 leading-relaxed'>{selected.draft_dm}</p>
                  </div>
                </div>
              )}

              {/* AI output */}
              <AiOutput result={aiResult} loading={aiLoading} />

              {selected.lead_id && (
                <p className='text-xs text-green-400 text-center'>Converted to Lead #{selected.lead_id}</p>
              )}
            </div>
          </div>
        )}
      </div>
      </div>
    </div>
  )
}

// ── Agent 3: Content + Posting ───────────────────────────────────────────────

function ContentAgent() {
  const [queue, setQueue]               = useState<FbQueuePost[]>([])
  const [selected, setSelected]         = useState<FbQueuePost | null>(null)
  const [category, setCategory]         = useState<FbContentCategory>('Driver Recruitment')
  const [draftContent, setDraftContent] = useState('')
  const [loading, setLoading]           = useState(true)
  const [aiResult, setAiResult]         = useState<ClaudeResponse | null>(null)
  const [aiLoading, setAiLoading]       = useState(false)
  const [hasApiKey, setHasApiKey]       = useState(true)
  const [scheduleDate, setScheduleDate] = useState('')

  useEffect(() => {
    window.api.settings.get('claude_api_key').then(v => setHasApiKey(!!v)).catch(() => setHasApiKey(false))
    loadQueue()
    // Auto-suggest category on load
    window.api.fbContent.suggestCategory().then(setCategory).catch(() => {})
  }, [])

  const loadQueue = async () => {
    setLoading(true)
    try { setQueue(await window.api.fbContent.list()) } catch {}
    setLoading(false)
  }

  const generatePost = async () => {
    setAiLoading(true); setAiResult(null); setDraftContent('')
    const recent = await window.api.fbContent.recentCategories(7).catch(() => [])
    const result = await window.api.fbContent.generatePost({ category, recentCategories: recent })
    setAiResult(result)
    if (result.ok) setDraftContent(result.content)
    setAiLoading(false)
  }

  const generateVariation = async () => {
    if (!draftContent.trim() && !selected?.content) return
    setAiLoading(true); setAiResult(null)
    const source = selected?.content ?? draftContent
    const result = await window.api.fbContent.generateVariation({ content: source })
    setAiResult(result)
    if (result.ok) setDraftContent(result.content)
    setAiLoading(false)
  }

  const suggestReplies = async () => {
    const source = selected?.content ?? draftContent
    if (!source.trim()) return
    setAiLoading(true); setAiResult(null)
    const result = await window.api.fbContent.suggestReplies({ content: source })
    setAiResult(result)
    setAiLoading(false)
  }

  const saveToQueue = async () => {
    if (!draftContent.trim()) return
    const post = await window.api.fbContent.create({
      content: draftContent.trim(),
      category,
      variation_of: null,
      scheduled_for: scheduleDate || null,
      group_ids: '[]',
      status: scheduleDate ? 'scheduled' : 'draft',
      posted_at: null,
    })
    setQueue(p => [post, ...p])
    setSelected(post)
    setDraftContent(''); setScheduleDate('')
  }

  const markPosted = async (post: FbQueuePost) => {
    const updated = await window.api.fbContent.update(post.id, {
      status: 'posted',
      posted_at: new Date().toISOString(),
    })
    if (updated) {
      setQueue(p => p.map(x => x.id === post.id ? updated : x))
      if (selected?.id === post.id) setSelected(updated)
    }
  }

  const deletePost = async (id: number) => {
    await window.api.fbContent.delete(id)
    setQueue(p => p.filter(x => x.id !== id))
    if (selected?.id === id) setSelected(null)
  }

  return (
    <div className='flex flex-col gap-3 h-full'>
      {!hasApiKey && <NoApiKey />}
      <div className='flex gap-4 flex-1 min-h-0'>
      {/* Left: queue */}
      <div className='w-64 shrink-0 flex flex-col gap-2'>
        <p className='text-2xs text-gray-600 font-medium uppercase tracking-wider'>Post Queue</p>
        <div className='flex-1 overflow-y-auto space-y-1'>
          {loading ? (
            <p className='text-xs text-gray-700 text-center py-4'>Loading...</p>
          ) : queue.length === 0 ? (
            <p className='text-xs text-gray-700 italic text-center py-4'>Queue empty. Generate a post.</p>
          ) : queue.map(p => (
            <button key={p.id} onClick={() => setSelected(p)}
              className={'w-full text-left px-3 py-2 rounded-lg border transition-colors ' +
                (selected?.id === p.id ? 'bg-orange-600/15 border-orange-700/40' : 'bg-surface-700 border-surface-400 hover:border-surface-300')}>
              <div className='flex items-center justify-between gap-1 mb-1'>
                <span className={'text-2xs px-1.5 py-0.5 rounded ' + (CATEGORY_STYLES[p.category] ?? 'bg-surface-600 text-gray-400')}>{p.category}</span>
                <span className={'text-2xs ' + (p.status === 'posted' ? 'text-green-500' : p.status === 'scheduled' ? 'text-blue-400' : 'text-gray-600')}>{p.status}</span>
              </div>
              <p className='text-2xs text-gray-500 truncate'>{p.content.slice(0, 60)}...</p>
              {p.scheduled_for && <p className='text-2xs text-gray-700 mt-0.5'>{fmtDate(p.scheduled_for)}</p>}
            </button>
          ))}
        </div>
      </div>

      {/* Right: compose + detail */}
      <div className='flex-1 min-w-0 flex flex-col gap-4'>
        {/* Compose panel */}
        <div className='bg-surface-700 rounded-xl border border-surface-400 p-5 space-y-4'>
          {!hasApiKey && <NoApiKey />}
          <div className='flex items-center gap-3 flex-wrap'>
            <div>
              <p className='text-2xs text-gray-600 mb-1'>Category</p>
              <select value={category} onChange={e => setCategory(e.target.value as FbContentCategory)}
                className='bg-surface-600 border border-surface-400 rounded-lg px-3 py-1.5 text-sm text-gray-300 outline-none'>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className='flex gap-2 mt-4'>
              <button onClick={generatePost} disabled={aiLoading || !hasApiKey}
                className='flex items-center gap-1.5 px-4 py-1.5 text-sm bg-orange-600 hover:bg-orange-500 text-white rounded-lg transition-colors disabled:opacity-50'>
                {aiLoading ? <Loader2 size={13} className='animate-spin' /> : <RefreshCw size={13} />}
                Generate Post
              </button>
              <button onClick={generateVariation} disabled={aiLoading || !hasApiKey || (!draftContent && !selected)}
                className='flex items-center gap-1.5 px-3 py-1.5 text-sm bg-surface-600 hover:bg-surface-500 text-gray-300 rounded-lg transition-colors disabled:opacity-50'>
                Variation
              </button>
              <button onClick={suggestReplies} disabled={aiLoading || !hasApiKey || (!draftContent && !selected)}
                className='flex items-center gap-1.5 px-3 py-1.5 text-sm bg-surface-600 hover:bg-surface-500 text-gray-300 rounded-lg transition-colors disabled:opacity-50'>
                Suggest Replies
              </button>
            </div>
          </div>

          <textarea value={draftContent} onChange={e => setDraftContent(e.target.value)}
            rows={5} placeholder='Generated post will appear here. You can edit it before saving.'
            className='w-full bg-surface-600 border border-surface-400 rounded-lg px-4 py-3 text-sm text-gray-200 resize-none outline-none focus:border-orange-600/50 placeholder-gray-700 leading-relaxed' />

          <div className='flex items-center gap-3 flex-wrap'>
            <div>
              <p className='text-2xs text-gray-600 mb-1'>Schedule For (optional)</p>
              <input type='date' value={scheduleDate} onChange={e => setScheduleDate(e.target.value)}
                className='bg-surface-600 border border-surface-400 rounded-lg px-3 py-1.5 text-sm text-gray-300 outline-none' />
            </div>
            <button onClick={saveToQueue} disabled={!draftContent.trim()}
              className='mt-4 flex items-center gap-1.5 px-4 py-1.5 text-sm border border-orange-600/40 text-orange-400 hover:bg-orange-600/10 rounded-lg transition-colors disabled:opacity-50'>
              <Plus size={13} /> Save to Queue
            </button>
          </div>

          <AiOutput result={aiResult} loading={aiLoading} />
        </div>

        {/* Selected post detail */}
        {selected && (
          <div className='bg-surface-700 rounded-xl border border-surface-400 p-5'>
            <div className='flex items-start justify-between mb-3'>
              <div className='flex items-center gap-2'>
                <span className={'text-xs px-2 py-0.5 rounded ' + (CATEGORY_STYLES[selected.category] ?? '')}>{selected.category}</span>
                <span className={'text-xs ' + (selected.status === 'posted' ? 'text-green-400' : selected.status === 'scheduled' ? 'text-blue-400' : 'text-gray-600')}>
                  {selected.status}
                  {selected.posted_at && ' · ' + fmtDate(selected.posted_at)}
                </span>
              </div>
              <div className='flex items-center gap-2'>
                {selected.status !== 'posted' && (
                  <button onClick={() => markPosted(selected)}
                    className='text-xs px-3 py-1 bg-green-900/30 text-green-400 hover:bg-green-900/50 rounded-lg transition-colors'>
                    Mark Posted
                  </button>
                )}
                <button onClick={() => { setDraftContent(selected.content); setCategory(selected.category) }}
                  className='text-xs px-3 py-1 bg-surface-600 text-gray-400 hover:text-gray-200 rounded-lg transition-colors'>
                  Edit
                </button>
                <button onClick={() => deletePost(selected.id)} className='text-gray-600 hover:text-red-400 transition-colors p-1'>
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
            <p className='text-sm text-gray-300 leading-relaxed whitespace-pre-wrap'>{selected.content}</p>
            {selected.scheduled_for && (
              <p className='text-xs text-blue-400 mt-2 flex items-center gap-1'>
                <CalendarDays size={11} /> Scheduled for {fmtDate(selected.scheduled_for)}
              </p>
            )}
          </div>
        )}
      </div>
      </div>
    </div>
  )
}

// ── Main page ────────────────────────────────────────────────────────────────

type Tab = 'conversation' | 'hunter' | 'content'

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'conversation', label: 'Conversation Agent', icon: <MessageCircle size={15} /> },
  { id: 'hunter',       label: 'Lead Hunter',        icon: <Search size={15} /> },
  { id: 'content',      label: 'Content Agent',      icon: <Megaphone size={15} /> },
]

export function FacebookAgents() {
  const [tab, setTab] = useState<Tab>('conversation')
  const [hasApiKey, setHasApiKey] = useState(true)

  useEffect(() => {
    window.api.settings.get('claude_api_key')
      .then(v => setHasApiKey(!!v))
      .catch(() => setHasApiKey(false))
  }, [])

  return (
    <div className='flex flex-col h-[calc(100vh-112px)] animate-fade-in'>
      <div className='mb-4'>
        <h1 className='text-xl font-semibold text-gray-100'>Facebook Agents</h1>
        <p className='text-sm text-gray-500 mt-0.5'>AI-assisted Facebook marketing and conversion</p>
      </div>

      {/* API key banner — shown when Claude key is not configured */}
      {!hasApiKey && (
        <div className='flex items-start gap-2 px-3 py-2.5 mb-3 bg-yellow-900/20 border border-yellow-700/30 rounded-lg shrink-0'>
          <AlertTriangle size={13} className='text-yellow-400 mt-0.5 shrink-0' />
          <p className='text-xs text-yellow-300'>
            Claude API key not configured — AI features on this page will not work.
            Add your key in <strong>Settings &gt; AI Integration</strong> to enable them.
          </p>
        </div>
      )}

      {/* Tab bar */}
      <div className='flex gap-1 mb-4 bg-surface-700 rounded-xl border border-surface-400 p-1 w-fit'>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={'flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ' +
              (tab === t.id ? 'bg-orange-600/20 text-orange-400' : 'text-gray-500 hover:text-gray-300')}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className='flex-1 min-h-0'>
        {tab === 'conversation' && <ConversationAgent />}
        {tab === 'hunter'       && <LeadHunterAgent />}
        {tab === 'content'      && <ContentAgent />}
      </div>
    </div>
  )
}
