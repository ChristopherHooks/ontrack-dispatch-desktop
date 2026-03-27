import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Megaphone, Copy, CheckCircle, RefreshCw, Plus, Trash2, X,
  ExternalLink, ChevronDown, ChevronUp, Image, Edit2, Check,
  BookOpen, History, Users, SkipForward
} from 'lucide-react'
import { useSettingsStore } from '../store/settingsStore'
import {
  POST_TEMPLATES, renderTemplate, CATEGORY_COLORS,
  type PostTemplate, type PostCategory,
} from '../lib/postTemplates'
import {
  getTruckType, getImagePrompt, generateVariation, generateShortPost,
  selectSuggestedTemplate, suggestGroupsForPost, fmtDaysSince,
  loadDailyTasks, saveDailyTasks, type DailyTask,
} from '../lib/marketingUtils'

// ── Types ─────────────────────────────────────────────────────────────────────

interface MarketingGroup {
  id:                     number
  name:                   string
  url:                    string | null
  platform:               string
  last_posted_at:         string | null
  notes:                  string | null
  truck_type_tags:        string   // JSON
  region_tags:            string   // JSON
  active:                 number
  category:               string
  priority:               string
  last_reviewed_at:       string | null
  leads_generated_count:  number
  signed_drivers_count:   number
  created_at:             string
}

interface GroupRecommendation {
  group:   MarketingGroup
  score:   number
  reasons: string[]
}

interface CategoryGapAnalysis {
  counts:      Record<string, number>
  total:       number
  gaps:        string[]
  overweight:  string[]
  suggestions: string[]
}

interface PostLog {
  id:               number
  template_id:      string
  category:         string
  truck_type:       string | null
  used_date:        string
  groups_posted_to: string  // JSON
  posted:           number
  replies_count:    number
  leads_generated:  number
  notes:            string | null
  created_at:       string
}

// ── Constants ─────────────────────────────────────────────────────────────────

const CATEGORY_FILTER_OPTIONS: Array<PostCategory | 'All'> = [
  'All',
  'Hotshot', 'Dry Van', 'Reefer', 'Flatbed', 'Step Deck',
  'Driver Recruitment', 'Value Prop', 'Engagement', 'New Authority', 'Trust', 'Freight Market',
  'Hot Lanes',
]

const today = new Date().toISOString().split('T')[0]
const todayLabel = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

const api = () => (window.api as any).marketing

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseTags(json: string): string[] {
  try { return JSON.parse(json) ?? [] } catch { return [] }
}

// ── Log Entry Form ─────────────────────────────────────────────────────────────

interface LogFormProps {
  template: PostTemplate | null
  groups: MarketingGroup[]
  preselected?: string[]
  onSave: (entry: Omit<PostLog, 'id' | 'created_at'>) => void
  onCancel: () => void
}

function LogForm({ template, groups, preselected = [], onSave, onCancel }: LogFormProps) {
  const [selectedGroups, setSelectedGroups] = useState<string[]>(preselected)
  const [posted,         setPosted]         = useState(true)
  const [replies,        setReplies]        = useState(0)
  const [leads,          setLeads]          = useState(0)
  const [notes,          setNotes]          = useState('')

  const toggleGroup = (name: string) => {
    setSelectedGroups(p => p.includes(name) ? p.filter(g => g !== name) : [...p, name])
  }

  const handleSave = () => {
    if (!template) return
    onSave({
      template_id:      template.id,
      category:         template.category,
      truck_type:       getTruckType(template),
      used_date:        today,
      groups_posted_to: JSON.stringify(selectedGroups),
      posted:           posted ? 1 : 0,
      replies_count:    replies,
      leads_generated:  leads,
      notes:            notes.trim() || null,
    })
  }

  return (
    <div className='bg-surface-600 rounded-xl border border-surface-400 p-4 space-y-4'>
      <h3 className='text-sm font-semibold text-gray-200'>Log This Post</h3>

      <div className='space-y-1'>
        <p className='text-2xs text-gray-500 uppercase tracking-wide'>Groups posted to</p>
        <div className='flex flex-wrap gap-1.5 max-h-24 overflow-y-auto'>
          {groups.filter(g => g.active !== 0).map(g => (
            <button
              key={g.id}
              onClick={() => toggleGroup(g.name)}
              className={[
                'text-2xs px-2 py-0.5 rounded-full border transition-colors',
                selectedGroups.includes(g.name)
                  ? 'bg-orange-600 border-orange-600 text-white'
                  : 'border-surface-400 text-gray-500 hover:text-gray-300',
              ].join(' ')}
            >{g.name}</button>
          ))}
          {groups.filter(g => g.active !== 0).length === 0 && (
            <p className='text-2xs text-gray-600'>No groups added yet.</p>
          )}
        </div>
      </div>

      <div className='flex items-center gap-6'>
        <label className='flex items-center gap-2 cursor-pointer'>
          <input
            type='checkbox'
            checked={posted}
            onChange={e => setPosted(e.target.checked)}
            className='accent-orange-500'
          />
          <span className='text-xs text-gray-300'>Marked as posted</span>
        </label>
      </div>

      <div className='grid grid-cols-2 gap-3'>
        <div className='space-y-1'>
          <label className='text-2xs text-gray-500 uppercase tracking-wide'>Replies</label>
          <input
            type='number'
            min={0}
            value={replies}
            onChange={e => setReplies(Number(e.target.value))}
            className='w-full h-8 px-2 bg-surface-500 border border-surface-400 rounded-lg text-sm text-gray-200 focus:outline-none focus:border-orange-600/60'
          />
        </div>
        <div className='space-y-1'>
          <label className='text-2xs text-gray-500 uppercase tracking-wide'>Leads generated</label>
          <input
            type='number'
            min={0}
            value={leads}
            onChange={e => setLeads(Number(e.target.value))}
            className='w-full h-8 px-2 bg-surface-500 border border-surface-400 rounded-lg text-sm text-gray-200 focus:outline-none focus:border-orange-600/60'
          />
        </div>
      </div>

      <div className='space-y-1'>
        <label className='text-2xs text-gray-500 uppercase tracking-wide'>Notes</label>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={2}
          placeholder='Any follow-up items, observations...'
          className='w-full px-3 py-2 bg-surface-500 border border-surface-400 rounded-lg text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-orange-600/60 resize-none'
        />
      </div>

      <div className='flex gap-2'>
        <button
          onClick={handleSave}
          className='px-3 py-1.5 text-xs font-medium bg-orange-600 hover:bg-orange-500 text-white rounded-lg transition-colors'
        >Save Entry</button>
        <button
          onClick={onCancel}
          className='px-3 py-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors'
        >Cancel</button>
      </div>
    </div>
  )
}

// ── Group Edit Row ─────────────────────────────────────────────────────────────

interface GroupRowProps {
  group: MarketingGroup
  onUpdate: (id: number, updates: object) => void
  onMarkPosted: (id: number) => void
  onDelete: (id: number) => void
}

const CATEGORY_OPTIONS = ['hotshot','box_truck','owner_operator','dispatcher','general_loads','reefer','mixed','other']
const PRIORITY_OPTIONS = ['High','Medium','Low']

function GroupRow({ group, onUpdate, onMarkPosted, onDelete }: GroupRowProps) {
  const [editing,   setEditing]  = useState(false)
  const [name,      setName]     = useState(group.name)
  const [url,       setUrl]      = useState(group.url ?? '')
  const [platform,  setPlatform] = useState(group.platform)
  const [notes,     setNotes]    = useState(group.notes ?? '')
  const [tags,      setTags]     = useState(() => parseTags(group.truck_type_tags).join(', '))
  const [active,    setActive]   = useState(group.active !== 0)
  const [category,  setCategory] = useState(group.category || 'mixed')
  const [priority,  setPriority] = useState(group.priority || 'Medium')

  const daysSince = fmtDaysSince(group.last_posted_at, today)
  const isOverdue = !group.last_posted_at || (
    Math.floor((new Date(today).getTime() - new Date(group.last_posted_at).getTime()) / 86400000) >= 2
  )
  const postedToday = group.last_posted_at === today

  const handleSave = () => {
    const truckTypeTags = tags.split(',').map(s => s.trim()).filter(Boolean)
    onUpdate(group.id, {
      name: name.trim() || group.name,
      url:  url.trim() || null,
      platform,
      notes: notes.trim() || null,
      truck_type_tags: truckTypeTags,
      active,
      category,
      priority,
    })
    setEditing(false)
  }

  if (editing) {
    return (
      <div className='rounded-lg p-3 border border-orange-700/40 bg-surface-600 space-y-2'>
        <input value={name} onChange={e => setName(e.target.value)}
          placeholder='Group name'
          className='w-full h-8 px-3 bg-surface-500 border border-surface-400 rounded-lg text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-orange-600/60' />
        <div className='grid grid-cols-2 gap-2'>
          <input value={url} onChange={e => setUrl(e.target.value)}
            placeholder='URL (optional)'
            className='h-8 px-3 bg-surface-500 border border-surface-400 rounded-lg text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-orange-600/60' />
          <select value={platform} onChange={e => setPlatform(e.target.value)}
            className='h-8 px-3 bg-surface-500 border border-surface-400 rounded-lg text-sm text-gray-200 focus:outline-none focus:border-orange-600/60'>
            <option>Facebook</option><option>LinkedIn</option><option>Instagram</option><option>Other</option>
          </select>
        </div>
        <div className='grid grid-cols-2 gap-2'>
          <select value={category} onChange={e => setCategory(e.target.value)}
            className='h-8 px-3 bg-surface-500 border border-surface-400 rounded-lg text-sm text-gray-200 focus:outline-none focus:border-orange-600/60'>
            {CATEGORY_OPTIONS.map(c => <option key={c} value={c}>{c.replace('_',' ')}</option>)}
          </select>
          <select value={priority} onChange={e => setPriority(e.target.value)}
            className='h-8 px-3 bg-surface-500 border border-surface-400 rounded-lg text-sm text-gray-200 focus:outline-none focus:border-orange-600/60'>
            {PRIORITY_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <input value={tags} onChange={e => setTags(e.target.value)}
          placeholder='Truck types (e.g. Hotshot, Dry Van)'
          className='w-full h-8 px-3 bg-surface-500 border border-surface-400 rounded-lg text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-orange-600/60' />
        <input value={notes} onChange={e => setNotes(e.target.value)}
          placeholder='Notes (optional)'
          className='w-full h-8 px-3 bg-surface-500 border border-surface-400 rounded-lg text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-orange-600/60' />
        <div className='flex items-center gap-4'>
          <label className='flex items-center gap-2 cursor-pointer'>
            <input type='checkbox' checked={active} onChange={e => setActive(e.target.checked)} className='accent-orange-500' />
            <span className='text-xs text-gray-400'>Active</span>
          </label>
        </div>
        <div className='flex gap-2'>
          <button onClick={handleSave}
            className='flex items-center gap-1 px-2.5 py-1 text-2xs font-medium bg-orange-600 hover:bg-orange-500 text-white rounded-lg'>
            <Check size={11} /> Save
          </button>
          <button onClick={() => setEditing(false)}
            className='px-2.5 py-1 text-2xs text-gray-500 hover:text-gray-300 rounded-lg'>Cancel</button>
        </div>
      </div>
    )
  }

  return (
    <div className={[
      'rounded-lg px-3 py-2.5 border flex items-center gap-3',
      group.active === 0 ? 'border-surface-600 bg-surface-700/50 opacity-50' :
        isOverdue && !postedToday ? 'border-orange-700/30 bg-orange-950/10' : 'border-surface-500 bg-surface-600',
    ].join(' ')}>
      <div className='flex-1 min-w-0'>
        <div className='flex items-center gap-2 flex-wrap'>
          <p className='text-sm font-medium text-gray-200 truncate'>{group.name}</p>
          {group.active === 0 && <span className='text-2xs text-gray-600'>inactive</span>}
          {group.active !== 0 && isOverdue && !postedToday && <span className='text-2xs text-orange-500'>Due</span>}
          {postedToday && <span className='text-2xs text-green-400'>Done today</span>}
          {group.category && group.category !== 'mixed' && (
            <span className='text-2xs px-1.5 py-0 rounded border border-surface-400 text-gray-600'>{group.category.replace('_',' ')}</span>
          )}
          {group.priority === 'High' && (
            <span className='text-2xs text-orange-500'>High</span>
          )}
        </div>
        <p className='text-2xs text-gray-600 mt-0.5'>{group.platform} · {daysSince}</p>
      </div>
      <div className='flex items-center gap-1 shrink-0'>
        {group.url && (
          <a href={group.url} target='_blank' rel='noreferrer'
            className='p-1.5 rounded hover:bg-surface-500 text-gray-600 hover:text-gray-300 transition-colors'>
            <ExternalLink size={12} />
          </a>
        )}
        {group.active !== 0 && !postedToday && (
          <button onClick={() => onMarkPosted(group.id)}
            className='px-2 py-0.5 text-2xs bg-surface-500 hover:bg-orange-600 text-gray-400 hover:text-white rounded transition-colors'>
            Mark Posted
          </button>
        )}
        <button onClick={() => setEditing(true)}
          className='p-1.5 rounded hover:bg-surface-500 text-gray-700 hover:text-gray-300 transition-colors'>
          <Edit2 size={11} />
        </button>
        <button onClick={() => onDelete(group.id)}
          className='p-1.5 rounded hover:bg-surface-500 text-gray-700 hover:text-red-400 transition-colors'>
          <Trash2 size={11} />
        </button>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export function Marketing() {
  const { companyName } = useSettingsStore()
  const company = companyName || 'OnTrack Hauling Solutions'

  // Anti-repetition data
  const [recentIds,    setRecentIds]    = useState<string[]>([])
  const [usageRaw,     setUsageRaw]     = useState<Array<{ template_id: string; cnt: number }>>([])

  // Template selection
  const [catFilter,    setCatFilter]    = useState<PostCategory | 'All'>('All')
  const [offset,       setOffset]       = useState(0)
  const [varSeed,      setVarSeed]      = useState(0)
  const [useVariation, setUseVariation] = useState(false)
  const [shortMode,    setShortMode]    = useState(false)

  // UI state
  const [copied,        setCopied]       = useState(false)
  const [imgCopied,     setImgCopied]    = useState(false)
  const [marked,        setMarked]       = useState(false)
  const [showImgPrompt, setShowImgPrompt] = useState(false)
  const [showLogForm,   setShowLogForm]  = useState(false)
  const [tasksOpen,     setTasksOpen]    = useState(true)

  // Daily tasks
  const [dailyTasks,   setDailyTasks]   = useState<DailyTask[]>(() => loadDailyTasks(today))

  // Groups
  const [groups,       setGroups]       = useState<MarketingGroup[]>([])
  const [showAddGroup, setShowAddGroup] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [newGroupUrl,  setNewGroupUrl]  = useState('')
  const [newGroupPlatform, setNewGroupPlatform] = useState('Facebook')
  const [newGroupTags, setNewGroupTags] = useState('')

  // Facebook Groups workflow
  const [todaysRecs,  setTodaysRecs]   = useState<GroupRecommendation[]>([])
  const [catAnalysis, setCatAnalysis]  = useState<CategoryGapAnalysis | null>(null)
  const [showCoverage, setShowCoverage] = useState(false)

  // Post log
  const [postLog,      setPostLog]      = useState<PostLog[]>([])
  const [activeTab,    setActiveTab]    = useState<'history' | 'groups' | 'templates'>('history')

  // Refs for stable callbacks
  const recentIdsRef = useRef(recentIds)
  const usageRawRef  = useRef(usageRaw)
  recentIdsRef.current = recentIds
  usageRawRef.current  = usageRaw

  // ── Load data ──────────────────────────────────────────────────────────────

  const loadAntiRep = useCallback(async () => {
    const [ids, counts] = await Promise.all([
      api().post.recentIds(14),
      api().post.usageCounts(),
    ])
    setRecentIds(ids)
    setUsageRaw(counts)
  }, [])

  const loadGroups = useCallback(async () => {
    const gs = await api().groups.list()
    setGroups(gs)
  }, [])

  const loadTodaysRecs = useCallback(async () => {
    try {
      const recs = await (window.api as any).marketing.groups.todaysGroups(8)
      setTodaysRecs(recs)
    } catch {}
  }, [])

  const loadCatAnalysis = useCallback(async () => {
    try {
      const analysis = await (window.api as any).marketing.groups.catAnalysis()
      setCatAnalysis(analysis)
    } catch {}
  }, [])

  const loadPostLog = useCallback(async () => {
    const logs = await api().post.list(60)
    setPostLog(logs)
  }, [])

  useEffect(() => {
    loadAntiRep()
    loadGroups()
    loadPostLog()
    loadTodaysRecs()
    loadCatAnalysis()
  }, [loadAntiRep, loadGroups, loadPostLog, loadTodaysRecs, loadCatAnalysis])

  // ── Derived: suggested post ────────────────────────────────────────────────

  const recentSet    = new Set(recentIds)
  const usageMap     = new Map(usageRaw.map(r => [r.template_id, r.cnt]))
  const { template, reason } = selectSuggestedTemplate(recentSet, usageMap, catFilter, offset)
  const truckType    = getTruckType(template)

  const baseText     = renderTemplate(template, company)
  const shortText    = generateShortPost(template, company, varSeed)
  const displayText  = shortMode
    ? shortText
    : useVariation
      ? generateVariation(template, company, varSeed)
      : baseText
  const hashtagStr   = template.hashtags.join(' ')
  const fullPost     = displayText + '\n\n' + hashtagStr
  const imagePrompt  = getImagePrompt(template)

  // ── Derived: suggested groups ──────────────────────────────────────────────

  const suggestedGroups = suggestGroupsForPost(groups, truckType, today, 5)

  // ── Actions ───────────────────────────────────────────────────────────────

  const handleCopy = async () => {
    await navigator.clipboard.writeText(fullPost)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  const handleCopyImgPrompt = async () => {
    await navigator.clipboard.writeText(imagePrompt)
    setImgCopied(true)
    setTimeout(() => setImgCopied(false), 2500)
  }

  const handleNextVariation = () => {
    setUseVariation(true)
    setVarSeed(s => s + 1)
  }

  const handleSkip = () => {
    setOffset(o => o + 1)
    setUseVariation(false)
    setVarSeed(0)
    setShowLogForm(false)
  }

  const handleMarkUsed = async () => {
    // Log with minimal info first — user can fill in details via log form
    await api().post.create(
      template.id, template.category, truckType, today, [], true, 0, 0, null
    )
    setMarked(true)
    setTimeout(() => setMarked(false), 2000)
    setShowLogForm(true)
    await loadAntiRep()
    await loadPostLog()
  }

  const handleLogSave = async (entry: Omit<PostLog, 'id' | 'created_at'>) => {
    // Find the most recent log entry for this template today and update it
    const existing = postLog.find(l => l.template_id === entry.template_id && l.used_date === today)
    if (existing) {
      await api().post.update(existing.id, {
        groups_posted_to: JSON.parse(entry.groups_posted_to),
        posted:           entry.posted === 1,
        replies_count:    entry.replies_count,
        leads_generated:  entry.leads_generated,
        notes:            entry.notes,
      })
    } else {
      await api().post.create(
        entry.template_id, entry.category, entry.truck_type, entry.used_date,
        JSON.parse(entry.groups_posted_to), entry.posted === 1,
        entry.replies_count, entry.leads_generated, entry.notes
      )
    }
    setShowLogForm(false)
    await loadPostLog()
    // Advance to next template
    setOffset(o => o + 1)
    setUseVariation(false)
    setVarSeed(0)
  }

  // ── Daily tasks ────────────────────────────────────────────────────────────

  const toggleTask = (id: string) => {
    setDailyTasks(prev => {
      const next = prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t)
      saveDailyTasks(today, next)
      return next
    })
  }

  const completedCount = dailyTasks.filter(t => t.completed).length

  // ── Group handlers ─────────────────────────────────────────────────────────

  const handleAddGroup = async () => {
    if (!newGroupName.trim()) return
    const tags = newGroupTags.split(',').map(s => s.trim()).filter(Boolean)
    const g = await api().groups.create(
      newGroupName.trim(), newGroupUrl.trim() || null, newGroupPlatform, null, tags, []
    )
    setGroups(p => [...p, g])
    setNewGroupName(''); setNewGroupUrl(''); setNewGroupTags(''); setShowAddGroup(false)
  }

  const handleUpdateGroup = async (id: number, updates: object) => {
    const g = await api().groups.update(id, updates)
    if (g) setGroups(p => p.map(gr => gr.id === id ? g : gr))
  }

  const handleMarkPosted = async (id: number) => {
    const g = await api().groups.markPosted(id, today)
    if (g) {
      setGroups(p => p.map(gr => gr.id === id ? g : gr))
      loadTodaysRecs()
    }
  }

  const handleDeleteGroup = async (id: number) => {
    await api().groups.delete(id)
    setGroups(p => p.filter(g => g.id !== id))
  }

  const handleSeedGroups = async () => {
    await (window.api as any).marketing.groups.seedGroups()
    await loadGroups()
    await loadTodaysRecs()
    await loadCatAnalysis()
  }

  const [importResult, setImportResult] = useState<{ added: number; found: number } | null>(null)
  const handleImportHtml = async () => {
    setImportResult(null)
    const result = await (window.api as any).marketing.groups.importHtml()
    if (result?.canceled) return
    setImportResult(result)
    await loadGroups()
    await loadTodaysRecs()
    await loadCatAnalysis()
  }

  const catCls = CATEGORY_COLORS[template.category]

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className='space-y-5 max-w-5xl animate-fade-in'>

      {/* Page header */}
      <div>
        <h1 className='text-xl font-semibold text-gray-100'>Marketing</h1>
        <p className='text-sm text-gray-500 mt-0.5'>{todayLabel}</p>
      </div>

      {/* Daily Tasks */}
      <div className='bg-surface-700 rounded-xl border border-surface-400 shadow-card overflow-hidden'>
        <button
          onClick={() => setTasksOpen(v => !v)}
          className='w-full flex items-center justify-between px-5 py-3 hover:bg-surface-600/40 transition-colors'
        >
          <div className='flex items-center gap-2'>
            <span className='text-sm font-semibold text-gray-200'>Today&apos;s Checklist</span>
            <span className={[
              'text-2xs px-2 py-0.5 rounded-full font-medium',
              completedCount === dailyTasks.length
                ? 'bg-green-900/40 text-green-400'
                : 'bg-surface-500 text-gray-500',
            ].join(' ')}>
              {completedCount}/{dailyTasks.length} done
            </span>
          </div>
          {tasksOpen ? <ChevronUp size={14} className='text-gray-600' /> : <ChevronDown size={14} className='text-gray-600' />}
        </button>
        {tasksOpen && (
          <div className='px-5 pb-4 space-y-2 border-t border-surface-500/50'>
            {dailyTasks.map(task => (
              <button
                key={task.id}
                onClick={() => toggleTask(task.id)}
                className='w-full flex items-center gap-3 py-1.5 group'
              >
                <div className={[
                  'w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors',
                  task.completed
                    ? 'bg-orange-600 border-orange-600'
                    : 'border-surface-400 group-hover:border-orange-600/50',
                ].join(' ')}>
                  {task.completed && <Check size={10} className='text-white' />}
                </div>
                <span className={['text-xs', task.completed ? 'line-through text-gray-600' : 'text-gray-300'].join(' ')}>
                  {task.label}
                </span>
              </button>
            ))}
            {(() => {
              const stalePosts = postLog.filter(l =>
                l.replies_count === 0 &&
                Math.floor((new Date(today).getTime() - new Date(l.used_date).getTime()) / 86400000) >= 3
              )
              if (stalePosts.length === 0) return null
              return (
                <button
                  onClick={() => setActiveTab('history')}
                  className='w-full flex items-center gap-3 py-1.5 group'
                >
                  <div className='w-4 h-4 rounded border border-yellow-600/60 flex items-center justify-center shrink-0 text-yellow-500'>
                    <span className='text-2xs font-bold leading-none'>{stalePosts.length}</span>
                  </div>
                  <span className='text-xs text-yellow-500 group-hover:text-yellow-400 transition-colors text-left'>
                    Log results for {stalePosts.length} post{stalePosts.length !== 1 ? 's' : ''} from 3+ days ago
                  </span>
                </button>
              )
            })()}
          </div>
        )}
      </div>

      {/* Main two-column */}
      <div className='grid grid-cols-1 xl:grid-cols-3 gap-5'>

        {/* Suggested Post Card — 2/3 width */}
        <div className='xl:col-span-2 space-y-3'>
          <div className='bg-surface-700 rounded-xl border border-surface-400 p-5 shadow-card'>

            {/* Card header */}
            <div className='flex items-center justify-between mb-3'>
              <div className='flex items-center gap-2 flex-wrap'>
                <Megaphone size={14} className='text-orange-500 shrink-0' />
                <span className='text-sm font-semibold text-gray-200'>Suggested Post</span>
                <span className={`text-2xs px-2 py-0.5 rounded-full border ${catCls}`}>{template.category}</span>
                {truckType && <span className='text-2xs text-gray-500'>{truckType}</span>}
                {useVariation && !shortMode && <span className='text-2xs text-blue-400'>variation</span>}
                {shortMode && <span className='text-2xs text-blue-400'>short post</span>}
              </div>
              <div className='flex items-center gap-1'>
                <button onClick={handleSkip}
                  title='Skip to next suggestion'
                  className='flex items-center gap-1 text-2xs px-2 py-1 rounded hover:bg-surface-600 text-gray-500 hover:text-gray-300 transition-colors'>
                  <SkipForward size={11} /> Skip
                </button>
              </div>
            </div>

            {/* Why chosen */}
            <p className='text-2xs text-gray-600 italic mb-3'>{reason}</p>

            {/* Category filter */}
            <div className='flex gap-1.5 flex-wrap mb-4'>
              {CATEGORY_FILTER_OPTIONS.map(cat => (
                <button
                  key={cat}
                  onClick={() => { setCatFilter(cat); setOffset(0); setUseVariation(false); setVarSeed(0) }}
                  className={[
                    'text-2xs px-2 py-0.5 rounded-full border transition-colors',
                    catFilter === cat
                      ? 'bg-orange-600 border-orange-600 text-white'
                      : 'border-surface-400 text-gray-500 hover:text-gray-300 hover:border-surface-300',
                  ].join(' ')}
                >{cat}</button>
              ))}
            </div>

            {/* Post text */}
            <div className='bg-surface-600 rounded-lg p-4 mb-3 border border-surface-500'>
              <p className='text-sm text-gray-200 whitespace-pre-wrap leading-relaxed'>{displayText}</p>
              <p className='text-xs text-gray-600 mt-3 select-all'>{hashtagStr}</p>
            </div>

            {/* Where to post */}
            <p className='text-2xs text-gray-500 mb-4'>
              Best for: <span className='text-gray-400'>{template.bestFor}</span>
            </p>

            {/* Image prompt */}
            <div className='mb-4'>
              <button
                onClick={() => setShowImgPrompt(v => !v)}
                className='flex items-center gap-1.5 text-2xs text-gray-500 hover:text-gray-300 transition-colors'
              >
                <Image size={11} />
                Image prompt
                {showImgPrompt ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
              </button>
              {showImgPrompt && (
                <div className='mt-2 bg-surface-600/60 rounded-lg p-3 border border-surface-500 flex items-start gap-2'>
                  <p className='text-xs text-gray-400 flex-1 leading-relaxed select-all'>{imagePrompt}</p>
                  <button
                    onClick={handleCopyImgPrompt}
                    className='shrink-0 p-1.5 rounded hover:bg-surface-500 text-gray-600 hover:text-orange-400 transition-colors'
                    title='Copy image prompt'
                  >
                    {imgCopied ? <CheckCircle size={13} className='text-green-400' /> : <Copy size={13} />}
                  </button>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className='flex items-center gap-2 flex-wrap'>
              <button
                onClick={handleCopy}
                className='flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-orange-600 hover:bg-orange-500 text-white rounded-lg transition-colors'
              >
                {copied ? <><CheckCircle size={12} /> Copied!</> : <><Copy size={12} /> Copy Post</>}
              </button>
              <button
                onClick={handleNextVariation}
                className='flex items-center gap-1.5 px-3 py-1.5 text-xs bg-surface-500 hover:bg-surface-400 text-gray-300 rounded-lg transition-colors'
              >
                <RefreshCw size={12} /> New Variation
              </button>
              <button
                onClick={() => { setShortMode(v => !v); setUseVariation(false) }}
                className={[
                  'flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg transition-colors border',
                  shortMode
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : 'bg-surface-500 border-surface-400 hover:bg-surface-400 text-gray-300',
                ].join(' ')}
                title='Toggle short-form post (1-2 sentences — better for Facebook group replies)'
              >
                Short Post
              </button>
              <button
                onClick={handleMarkUsed}
                className={[
                  'flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg transition-colors',
                  marked
                    ? 'bg-green-700/40 text-green-400'
                    : 'bg-surface-500 hover:bg-surface-400 text-gray-300',
                ].join(' ')}
              >
                {marked ? <><CheckCircle size={12} /> Marked!</> : <><Check size={12} /> Mark as Used</>}
              </button>
            </div>
          </div>

          {/* Log form — appears after marking used */}
          {showLogForm && (
            <LogForm
              template={template}
              groups={groups}
              preselected={groups.filter(g => g.last_posted_at === today).map(g => g.name)}
              onSave={handleLogSave}
              onCancel={() => { setShowLogForm(false); setOffset(o => o + 1); setUseVariation(false); setVarSeed(0) }}
            />
          )}
        </div>

        {/* Suggested Groups sidebar */}
        <div className='bg-surface-700 rounded-xl border border-surface-400 p-4 shadow-card h-fit'>
          <div className='flex items-center gap-2 mb-3'>
            <Users size={13} className='text-orange-500' />
            <span className='text-sm font-semibold text-gray-200'>Suggested Groups</span>
          </div>
          {suggestedGroups.length === 0 ? (
            <p className='text-2xs text-gray-600 py-4 text-center'>
              No groups due. Add groups in the Groups tab.
            </p>
          ) : (
            <div className='space-y-2'>
              {suggestedGroups.map(g => (
                <div key={g.id} className='flex items-center justify-between gap-2 py-1'>
                  <div className='min-w-0'>
                    {g.url ? (
                      <button
                        onClick={() => window.api.shell.openExternal(g.url!)}
                        className='text-xs text-gray-300 hover:text-orange-400 truncate block max-w-full text-left transition-colors'
                        title={g.url}
                      >{g.name}</button>
                    ) : (
                      <p className='text-xs text-gray-300 truncate'>{g.name}</p>
                    )}
                    <p className='text-2xs text-gray-600'>{fmtDaysSince(g.last_posted_at, today)}</p>
                  </div>
                  <div className='flex items-center gap-1 shrink-0'>
                    {g.url && (
                      <a href={g.url} target='_blank' rel='noreferrer'
                        className='p-1 rounded hover:bg-surface-600 text-gray-600 hover:text-gray-300 transition-colors'>
                        <ExternalLink size={11} />
                      </a>
                    )}
                    <button
                      onClick={() => handleMarkPosted(g.id)}
                      className='px-2 py-0.5 text-2xs bg-surface-600 hover:bg-orange-600 text-gray-400 hover:text-white rounded transition-colors'
                    >Posted</button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className='mt-3 pt-3 border-t border-surface-500/50'>
            <button
              onClick={() => setActiveTab('groups')}
              className='text-2xs text-orange-500 hover:text-orange-400 transition-colors'
            >Manage all groups</button>
          </div>
        </div>
      </div>

      {/* Bottom tabs */}
      <div className='bg-surface-700 rounded-xl border border-surface-400 shadow-card overflow-hidden'>
        <div className='flex border-b border-surface-500/50'>
          {([ ['history', 'Post History', History], ['groups', 'Groups', Users], ['templates', 'All Templates', BookOpen] ] as const).map(([key, label, Icon]) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={[
                'flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium transition-colors border-b-2',
                activeTab === key
                  ? 'border-orange-500 text-orange-400'
                  : 'border-transparent text-gray-500 hover:text-gray-300',
              ].join(' ')}
            >
              <Icon size={12} /> {label}
            </button>
          ))}
        </div>

        {/* Post History tab */}
        {activeTab === 'history' && (
          <div className='p-5'>
            <div className='flex items-center justify-between mb-4'>
              <span className='text-xs text-gray-500'>{postLog.length} recent entries</span>
            </div>
            {postLog.length === 0 ? (
              <p className='text-sm text-gray-600 text-center py-8'>
                No post history yet. Mark posts as used to start tracking.
              </p>
            ) : (
              <div className='overflow-x-auto'>
                <table className='w-full text-xs'>
                  <thead>
                    <tr className='border-b border-surface-500/50'>
                      <th className='text-left py-2 pr-4 text-gray-600 font-medium'>Date</th>
                      <th className='text-left py-2 pr-4 text-gray-600 font-medium'>Category</th>
                      <th className='text-left py-2 pr-4 text-gray-600 font-medium'>Truck</th>
                      <th className='text-left py-2 pr-4 text-gray-600 font-medium'>Groups</th>
                      <th className='text-left py-2 pr-4 text-gray-600 font-medium'>Posted</th>
                      <th className='text-left py-2 pr-4 text-gray-600 font-medium'>Replies</th>
                      <th className='text-left py-2 pr-4 text-gray-600 font-medium'>Leads</th>
                      <th className='text-left py-2 pr-2 text-gray-600 font-medium'>Notes</th>
                      <th className='py-2' />
                    </tr>
                  </thead>
                  <tbody className='divide-y divide-surface-500/30'>
                    {postLog.map(log => {
                      const groupList: string[] = (() => { try { return JSON.parse(log.groups_posted_to) } catch { return [] } })()
                      return (
                        <tr key={log.id} className='hover:bg-surface-600/30 transition-colors'>
                          <td className='py-2 pr-4 text-gray-400 whitespace-nowrap'>{log.used_date}</td>
                          <td className='py-2 pr-4 text-gray-400 whitespace-nowrap'>{log.category}</td>
                          <td className='py-2 pr-4 text-gray-500'>{log.truck_type ?? '—'}</td>
                          <td className='py-2 pr-4 text-gray-500 max-w-[120px] truncate' title={groupList.join(', ')}>
                            {groupList.length ? groupList.join(', ') : '—'}
                          </td>
                          <td className='py-2 pr-4'>
                            {log.posted ? <span className='text-green-400'>Yes</span> : <span className='text-gray-600'>No</span>}
                          </td>
                          <td className='py-2 pr-4 text-gray-400'>{log.replies_count}</td>
                          <td className='py-2 pr-4 text-gray-400'>{log.leads_generated}</td>
                          <td className='py-2 pr-2 text-gray-500 max-w-[140px] truncate' title={log.notes ?? ''}>
                            {log.notes ?? '—'}
                          </td>
                          <td className='py-2'>
                            <button
                              onClick={async () => {
                                await api().post.delete(log.id)
                                await loadPostLog()
                                await loadAntiRep()
                              }}
                              className='p-1 rounded hover:bg-surface-500 text-gray-700 hover:text-red-400 transition-colors'
                            ><Trash2 size={11} /></button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Groups tab */}
        {activeTab === 'groups' && (
          <div className='p-5 space-y-5'>

            {/* Today's Recommendations */}
            <div className='bg-surface-600 rounded-xl border border-surface-400 p-4'>
              <div className='flex items-center justify-between mb-3'>
                <div className='flex items-center gap-2'>
                  <span className='text-sm font-semibold text-gray-200'>Today&apos;s Groups</span>
                  <span className='text-2xs px-2 py-0.5 rounded-full bg-orange-900/30 text-orange-400 border border-orange-700/30'>
                    {todaysRecs.length} recommended
                  </span>
                </div>
                <button onClick={loadTodaysRecs}
                  className='p-1 rounded hover:bg-surface-500 text-gray-600 hover:text-gray-300 transition-colors'
                  title='Refresh recommendations'>
                  <RefreshCw size={12} />
                </button>
              </div>
              {todaysRecs.length === 0 ? (
                <div className='text-center py-4 space-y-2'>
                  <p className='text-xs text-gray-500'>No active groups loaded yet.</p>
                  <button
                    onClick={handleSeedGroups}
                    className='px-3 py-1.5 text-xs bg-orange-700 hover:bg-orange-600 text-white rounded-lg transition-colors'>
                    Load Groups from List
                  </button>
                </div>
              ) : (
                <div className='space-y-2'>
                  {todaysRecs.map(rec => {
                    const postedToday = rec.group.last_posted_at === today
                    return (
                      <div key={rec.group.id}
                        className={[
                          'flex items-center gap-3 rounded-lg px-3 py-2 border transition-colors',
                          postedToday
                            ? 'border-green-700/30 bg-green-950/10'
                            : 'border-surface-500 bg-surface-700/50',
                        ].join(' ')}>
                        <div className='flex-1 min-w-0'>
                          <div className='flex items-center gap-2 flex-wrap'>
                            <p className='text-xs font-medium text-gray-200 truncate'>{rec.group.name}</p>
                            <span className={[
                              'text-2xs px-1.5 py-0 rounded border',
                              rec.group.priority === 'High'   ? 'border-orange-700/40 text-orange-400' :
                              rec.group.priority === 'Medium' ? 'border-blue-700/40 text-blue-400' :
                              'border-surface-400 text-gray-600',
                            ].join(' ')}>{rec.group.priority}</span>
                            <span className='text-2xs text-gray-600'>{rec.group.category.replace('_', ' ')}</span>
                          </div>
                          <div className='flex items-center gap-2 mt-0.5 flex-wrap'>
                            {rec.reasons.map(r => (
                              <span key={r} className='text-2xs text-gray-600 italic'>{r}</span>
                            ))}
                          </div>
                        </div>
                        <div className='flex items-center gap-1 shrink-0'>
                          {rec.group.url && (
                            <a href={rec.group.url} target='_blank' rel='noreferrer'
                              className='p-1 rounded hover:bg-surface-500 text-gray-600 hover:text-gray-300 transition-colors'>
                              <ExternalLink size={11} />
                            </a>
                          )}
                          {postedToday ? (
                            <span className='text-2xs text-green-400 px-2'>Done today</span>
                          ) : (
                            <button
                              onClick={() => handleMarkPosted(rec.group.id)}
                              className='px-2 py-0.5 text-2xs bg-surface-600 hover:bg-orange-600 text-gray-400 hover:text-white rounded transition-colors'>
                              Mark Posted
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Category Coverage */}
            {catAnalysis && (
              <div className='bg-surface-600 rounded-xl border border-surface-400 p-4'>
                <button
                  onClick={() => setShowCoverage(v => !v)}
                  className='w-full flex items-center justify-between'
                >
                  <div className='flex items-center gap-2'>
                    <span className='text-sm font-semibold text-gray-200'>Category Coverage</span>
                    {catAnalysis.gaps.length > 0 && (
                      <span className='text-2xs px-2 py-0.5 rounded-full bg-yellow-900/30 text-yellow-400 border border-yellow-700/30'>
                        {catAnalysis.gaps.length} gap{catAnalysis.gaps.length !== 1 ? 's' : ''}
                      </span>
                    )}
                    {catAnalysis.gaps.length === 0 && (
                      <span className='text-2xs px-2 py-0.5 rounded-full bg-green-900/30 text-green-400 border border-green-700/30'>
                        Balanced
                      </span>
                    )}
                  </div>
                  {showCoverage
                    ? <ChevronUp size={13} className='text-gray-600' />
                    : <ChevronDown size={13} className='text-gray-600' />}
                </button>

                {showCoverage && (
                  <div className='mt-3 space-y-3'>
                    {/* Count grid */}
                    <div className='grid grid-cols-4 gap-2'>
                      {Object.entries(catAnalysis.counts)
                        .filter(([cat]) => cat !== 'other')
                        .sort((a, b) => b[1] - a[1])
                        .map(([cat, count]) => {
                          const isGap = catAnalysis.gaps.includes(cat)
                          const isOver = catAnalysis.overweight.includes(cat)
                          return (
                            <div key={cat}
                              className={[
                                'rounded-lg px-2 py-1.5 border text-center',
                                isGap  ? 'border-yellow-700/40 bg-yellow-950/10' :
                                isOver ? 'border-orange-700/30 bg-orange-950/10' :
                                'border-surface-500 bg-surface-700/40',
                              ].join(' ')}>
                              <p className={[
                                'text-sm font-semibold',
                                isGap ? 'text-yellow-400' : isOver ? 'text-orange-400' : 'text-gray-300',
                              ].join(' ')}>{count}</p>
                              <p className='text-2xs text-gray-600 mt-0.5 leading-tight'>{cat.replace('_', ' ')}</p>
                            </div>
                          )
                        })}
                    </div>

                    {/* Gap suggestions */}
                    {catAnalysis.suggestions.length > 0 && (
                      <div className='space-y-1.5 pt-2 border-t border-surface-500/50'>
                        <p className='text-2xs text-gray-500 font-medium uppercase tracking-wide'>Groups to search for</p>
                        {catAnalysis.suggestions.map((s, i) => (
                          <p key={i} className={[
                            'text-xs leading-relaxed',
                            s.startsWith('You are') ? 'text-yellow-400' : 'text-gray-500 pl-3',
                          ].join(' ')}>{s}</p>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Group list */}
            <div>
            <div className='flex items-center justify-between mb-4'>
              <div className='flex items-center gap-3'>
                <span className='text-xs text-gray-500'>{groups.length} group{groups.length !== 1 ? 's' : ''}</span>
                {importResult && (
                  <span className='text-2xs text-green-400'>
                    Imported: {importResult.added} new of {importResult.found} found
                  </span>
                )}
              </div>
              <div className='flex items-center gap-3'>
                <button
                  onClick={handleImportHtml}
                  className='flex items-center gap-1 text-2xs text-blue-400 hover:text-blue-300 transition-colors'
                  title='Save your Facebook Groups page as HTML, then import it here to add new groups automatically'>
                  <BookOpen size={11} /> Import from HTML
                </button>
                <button
                  onClick={() => setShowAddGroup(v => !v)}
                  className='flex items-center gap-1 text-2xs text-orange-500 hover:text-orange-400 transition-colors'
                ><Plus size={11} /> Add Group</button>
              </div>
            </div>

            {showAddGroup && (
              <div className='mb-4 bg-surface-600 rounded-lg p-3 border border-surface-500 space-y-2'>
                <input
                  value={newGroupName}
                  onChange={e => setNewGroupName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddGroup()}
                  placeholder='Group name (required)'
                  className='w-full h-8 px-3 bg-surface-500 border border-surface-400 rounded-lg text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-orange-600/60'
                />
                <div className='grid grid-cols-2 gap-2'>
                  <input
                    value={newGroupUrl}
                    onChange={e => setNewGroupUrl(e.target.value)}
                    placeholder='Group URL (optional)'
                    className='h-8 px-3 bg-surface-500 border border-surface-400 rounded-lg text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-orange-600/60'
                  />
                  <select
                    value={newGroupPlatform}
                    onChange={e => setNewGroupPlatform(e.target.value)}
                    className='h-8 px-3 bg-surface-500 border border-surface-400 rounded-lg text-sm text-gray-200 focus:outline-none focus:border-orange-600/60'
                  >
                    <option>Facebook</option>
                    <option>LinkedIn</option>
                    <option>Instagram</option>
                    <option>Other</option>
                  </select>
                </div>
                <input
                  value={newGroupTags}
                  onChange={e => setNewGroupTags(e.target.value)}
                  placeholder='Truck types (e.g. Hotshot, Dry Van — comma-separated)'
                  className='w-full h-8 px-3 bg-surface-500 border border-surface-400 rounded-lg text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-orange-600/60'
                />
                <div className='flex gap-2'>
                  <button
                    onClick={handleAddGroup}
                    className='px-3 py-1 text-2xs font-medium bg-orange-600 hover:bg-orange-500 text-white rounded-lg'
                  >Add</button>
                  <button
                    onClick={() => { setShowAddGroup(false); setNewGroupName(''); setNewGroupUrl(''); setNewGroupTags('') }}
                    className='px-3 py-1 text-2xs text-gray-500 hover:text-gray-300 rounded-lg'
                  >Cancel</button>
                </div>
              </div>
            )}

            {groups.length === 0 ? (
              <div className='text-center py-8'>
                <p className='text-sm text-gray-500'>No groups yet.</p>
                <p className='text-2xs text-gray-700 mt-1'>Add the groups you post to so the app can track rotation and suggest where to post.</p>
              </div>
            ) : (
              <div className='space-y-2'>
                {[...groups]
                  .sort((a, b) => {
                    if (a.active !== b.active) return b.active - a.active  // active first
                    if (!a.last_posted_at && !b.last_posted_at) return 0
                    if (!a.last_posted_at) return -1
                    if (!b.last_posted_at) return 1
                    return a.last_posted_at.localeCompare(b.last_posted_at)
                  })
                  .map(group => (
                    <GroupRow
                      key={group.id}
                      group={group}
                      onUpdate={handleUpdateGroup}
                      onMarkPosted={handleMarkPosted}
                      onDelete={handleDeleteGroup}
                    />
                  ))
                }
              </div>
            )}
            </div>
          </div>
        )}

        {/* All Templates tab */}
        {activeTab === 'templates' && (
          <div className='p-5'>
            <div className='space-y-3 max-h-[600px] overflow-y-auto pr-1'>
              {POST_TEMPLATES.map((t, i) => (
                <div key={t.id} className='bg-surface-600 rounded-lg p-3 border border-surface-500'>
                  <div className='flex items-center gap-2 mb-2'>
                    <span className='text-2xs text-gray-700 w-5 text-right'>{i + 1}</span>
                    <span className={`text-2xs px-1.5 py-0.5 rounded-full border ${CATEGORY_COLORS[t.category]}`}>{t.category}</span>
                    <span className='text-2xs text-gray-600 flex-1 truncate'>{t.bestFor}</span>
                    <span className='text-2xs text-gray-700'>
                      used {usageMap.get(t.id) ?? 0}x
                      {recentSet.has(t.id) ? ' · recent' : ''}
                    </span>
                    <button
                      onClick={async () => {
                        const text = renderTemplate(t, company)
                        await navigator.clipboard.writeText(text + '\n\n' + t.hashtags.join(' '))
                      }}
                      className='p-1 rounded hover:bg-surface-500 text-gray-600 hover:text-orange-400 transition-colors'
                      title='Copy'
                    ><Copy size={11} /></button>
                    <button
                      onClick={() => {
                        // Find this template's index in the current pool to set offset
                        const pool = catFilter !== 'All'
                          ? POST_TEMPLATES.filter(p => p.category === catFilter)
                          : POST_TEMPLATES
                        const idx = pool.findIndex(p => p.id === t.id)
                        if (idx >= 0) {
                          setOffset(idx)
                        } else {
                          setCatFilter('All')
                          setOffset(POST_TEMPLATES.indexOf(t))
                        }
                        setUseVariation(false)
                        setVarSeed(0)
                      }}
                      className='p-1 rounded hover:bg-surface-500 text-gray-600 hover:text-orange-400 transition-colors text-2xs px-2'
                      title='Use this template'
                    >Use</button>
                  </div>
                  <p className='text-xs text-gray-400 whitespace-pre-wrap line-clamp-3 leading-relaxed'>
                    {renderTemplate(t, company)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
