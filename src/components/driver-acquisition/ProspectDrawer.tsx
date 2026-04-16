import { useState, useEffect } from 'react'
import {
  X, Phone, Mail, MapPin, Pencil, Trash2, ChevronRight,
  ChevronLeft, Calendar, UserPlus, Copy, Check, MessageSquare,
} from 'lucide-react'
import type { DriverProspect, ProspectStage, Note, ProspectOutreachEntry } from '../../types/models'
import { STAGES, STAGE_STYLES, STAGE_DOTS, PRIORITY_STYLES } from './constants'
import { OUTREACH_TEMPLATES, mergeTemplate, type OutreachTemplate } from '../../lib/driverOutreachTemplates'

interface Props {
  prospect:      DriverProspect
  onClose:       () => void
  onEdit:        (p: DriverProspect) => void
  onDelete:      (p: DriverProspect) => void
  onUpdate:      (updated: DriverProspect) => void
  onStageChange: (p: DriverProspect, stage: ProspectStage) => void
}

const OUTREACH_METHODS  = ['Call', 'SMS', 'Facebook Message', 'Other'] as const
const OUTREACH_OUTCOMES = ['No Answer', 'Left Voicemail', 'Spoke', 'Replied', 'Not Interested', 'Other'] as const

const ROW = ({ label, value }: { label: string; value: React.ReactNode }) => (
  value ? (
    <div className='flex items-start gap-3'>
      <span className='text-2xs text-gray-400 w-28 shrink-0 pt-0.5 uppercase tracking-wide'>{label}</span>
      <span className='text-sm text-gray-300'>{value}</span>
    </div>
  ) : null
)

export function ProspectDrawer({ prospect, onClose, onEdit, onDelete, onUpdate, onStageChange }: Props) {
  const [notes,         setNotes]         = useState<Note[]>([])
  const [noteInput,     setNoteInput]     = useState('')
  const [noteSaving,    setNoteSaving]    = useState(false)
  const [outreach,      setOutreach]      = useState<ProspectOutreachEntry[]>([])
  const [outBusy,       setOutBusy]       = useState(false)
  const [outMethod,     setOutMethod]     = useState<string>(OUTREACH_METHODS[0])
  const [outOutcome,    setOutOutcome]    = useState<string>('')
  const [outNotes,      setOutNotes]      = useState('')
  const [confirmDel,    setConfirmDel]    = useState(false)
  const [tab,           setTab]           = useState<'info' | 'outreach' | 'notes'>('info')
  const [converting,    setConverting]    = useState(false)
  const [convertDone,   setConvertDone]   = useState(false)

  // Template picker state
  const [selectedTpl,   setSelectedTpl]   = useState<OutreachTemplate | null>(null)
  const [tplCopied,     setTplCopied]     = useState(false)

  useEffect(() => {
    window.api.notes.list('driver_prospect', prospect.id).then(setNotes).catch(() => {})
    window.api.prospectOutreach.list(prospect.id).then(setOutreach).catch(() => {})
  }, [prospect.id])

  // ── Notes ──────────────────────────────────────────────────────────────────

  const handleNoteAdd = async () => {
    if (!noteInput.trim()) return
    setNoteSaving(true)
    try {
      const note = await window.api.notes.create({
        entity_type: 'driver_prospect' as any,
        entity_id:   prospect.id,
        content:     noteInput.trim(),
        user_id:     1,
      })
      setNotes(n => [note, ...n])
      setNoteInput('')
    } finally {
      setNoteSaving(false)
    }
  }

  const handleNoteDelete = async (id: number) => {
    await window.api.notes.delete(id)
    setNotes(n => n.filter(x => x.id !== id))
  }

  // ── Outreach log ───────────────────────────────────────────────────────────

  const handleLogOutreach = async () => {
    setOutBusy(true)
    try {
      const entry = await window.api.prospectOutreach.create({
        prospect_id: prospect.id,
        method:      outMethod,
        outcome:     outOutcome || null,
        notes:       outNotes.trim() || null,
      })
      setOutreach(prev => [entry, ...prev])
      setOutNotes('')
      setOutOutcome('')
      // Refresh prospect so attempt_count / last_contact_date update in parent
      const updated = await window.api.driverProspects.get(prospect.id)
      if (updated) onUpdate(updated)
    } finally {
      setOutBusy(false)
    }
  }

  const handleDeleteOutreach = async (id: number) => {
    await window.api.prospectOutreach.delete(id)
    setOutreach(prev => prev.filter(x => x.id !== id))
  }

  // ── Delete ─────────────────────────────────────────────────────────────────

  const handleDelete = async () => {
    if (!confirmDel) { setConfirmDel(true); return }
    await onDelete(prospect)
    onClose()
  }

  // ── Convert to Driver ──────────────────────────────────────────────────────

  const handleConvertToDriver = async () => {
    if (converting) return
    setConverting(true)
    try {
      const newDriver = await window.api.drivers.create({
        name:            prospect.name,
        phone:           prospect.phone,
        email:           prospect.email,
        cdl_class:       prospect.cdl_class,
        truck_type:      prospect.equipment_interest,
        home_base:       prospect.city && prospect.state
                           ? `${prospect.city}, ${prospect.state}`
                           : prospect.city ?? prospect.state ?? null,
        status:          'Active',
        // remaining required fields get sensible defaults from the repo
      } as any)
      const updated = await window.api.driverProspects.update(prospect.id, {
        converted_driver_id: newDriver.id,
        stage: 'Handed Off' as ProspectStage,
      })
      if (updated) onUpdate(updated)
      setConvertDone(true)
    } catch (e) {
      console.error('[ProspectDrawer] convert to driver error:', e)
    } finally {
      setConverting(false)
    }
  }

  // ── Template helpers ───────────────────────────────────────────────────────

  const handleCopyTemplate = () => {
    if (!selectedTpl) return
    const merged = mergeTemplate(selectedTpl, { name: prospect.name })
    navigator.clipboard.writeText(merged).then(() => {
      setTplCopied(true)
      setTimeout(() => setTplCopied(false), 2000)
    })
  }

  // ── Stage navigation ───────────────────────────────────────────────────────

  const currentIdx = STAGES.indexOf(prospect.stage)
  const prevStage  = STAGES[currentIdx - 1] as ProspectStage | undefined
  const nextStage  = STAGES[currentIdx + 1] as ProspectStage | undefined

  const fmtDate = (d: string | null) => {
    if (!d) return null
    const [y, m, day] = d.split('-')
    return `${m}/${day}/${y}`
  }

  const fmtDateTime = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      + ' ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  }

  const dateCls = (d: string | null) => {
    if (!d) return 'text-gray-400'
    const today = new Date().toISOString().split('T')[0]
    if (d < today) return 'text-red-400'
    if (d === today) return 'text-orange-400'
    return 'text-gray-300'
  }

  const canConvert =
    (prospect.stage === 'Signed' || prospect.stage === 'Handed Off') &&
    !prospect.converted_driver_id

  const tplMerged = selectedTpl ? mergeTemplate(selectedTpl, { name: prospect.name }) : ''
  const sel = 'w-full bg-surface-700 border border-surface-500 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-orange-600/60'

  return (
    <div className='fixed inset-0 z-40 flex'>
      {/* Backdrop */}
      <div className='flex-1 bg-black/40' onClick={onClose} />

      {/* Drawer */}
      <div className='w-[440px] max-w-full bg-surface-800 border-l border-surface-500 flex flex-col h-full shadow-xl animate-slide-in-right overflow-hidden'>

        {/* Header */}
        <div className='px-5 py-4 border-b border-surface-600 shrink-0'>
          <div className='flex items-start justify-between gap-2 mb-3'>
            <div className='min-w-0'>
              <h2 className='text-base font-semibold text-gray-100 truncate'>{prospect.name}</h2>
              {prospect.source && (
                <p className='text-xs text-gray-500 mt-0.5'>{prospect.source}</p>
              )}
            </div>
            <button onClick={onClose} className='text-gray-500 hover:text-gray-300 shrink-0 transition-colors'>
              <X size={16} />
            </button>
          </div>

          {/* Stage badge + advance controls */}
          <div className='flex items-center gap-2 flex-wrap'>
            <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${STAGE_STYLES[prospect.stage]}`}>
              <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 ${STAGE_DOTS[prospect.stage]}`} />
              {prospect.stage}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${PRIORITY_STYLES[prospect.priority]}`}>
              {prospect.priority}
            </span>
            <div className='flex items-center gap-1 ml-auto'>
              {prevStage && (
                <button
                  onClick={() => onStageChange(prospect, prevStage)}
                  className='flex items-center gap-0.5 text-2xs text-gray-400 hover:text-gray-300 transition-colors'
                  title={`Back to ${prevStage}`}
                >
                  <ChevronLeft size={12} />
                </button>
              )}
              {nextStage && (
                <button
                  onClick={() => onStageChange(prospect, nextStage)}
                  className='flex items-center gap-1 text-2xs text-orange-500 hover:text-orange-400 transition-colors font-medium'
                  title={`Advance to ${nextStage}`}
                >
                  {nextStage} <ChevronRight size={12} />
                </button>
              )}
            </div>
          </div>

          {/* Convert to Driver button — only when Signed/Handed Off and not yet converted */}
          {canConvert && (
            <div className='mt-3 pt-3 border-t border-surface-600'>
              {convertDone ? (
                <div className='flex items-center gap-2 text-xs text-green-400'>
                  <Check size={12} />
                  Driver record created. Find them in the Drivers page.
                </div>
              ) : (
                <button
                  onClick={handleConvertToDriver}
                  disabled={converting}
                  className='flex items-center gap-2 w-full justify-center px-4 py-2 text-xs font-medium bg-green-700/30 hover:bg-green-700/50 border border-green-600/40 text-green-400 rounded-lg transition-colors disabled:opacity-60'
                >
                  <UserPlus size={13} />
                  {converting ? 'Creating Driver...' : 'Convert to Driver'}
                </button>
              )}
            </div>
          )}

          {/* Already converted badge */}
          {prospect.converted_driver_id && (
            <div className='mt-3 pt-3 border-t border-surface-600'>
              <p className='text-2xs text-gray-500 flex items-center gap-1.5'>
                <UserPlus size={11} className='text-green-500' />
                Converted — driver record #{prospect.converted_driver_id}
              </p>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className='flex border-b border-surface-600 shrink-0'>
          {(['info', 'outreach', 'notes'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 text-xs py-2.5 font-medium capitalize transition-colors ${
                tab === t
                  ? 'text-orange-400 border-b-2 border-orange-500'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {t === 'outreach'
                ? `Outreach${outreach.length > 0 ? ` (${outreach.length})` : ''}`
                : t === 'notes' && notes.length > 0
                  ? `Notes (${notes.length})`
                  : t.charAt(0).toUpperCase() + t.slice(1)
              }
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className='flex-1 overflow-y-auto px-5 py-4'>

          {/* ── Info ── */}
          {tab === 'info' && (
            <div className='space-y-3'>
              {prospect.phone && (
                <div className='flex items-center gap-2'>
                  <Phone size={12} className='text-gray-600 shrink-0' />
                  <a href={`tel:${prospect.phone}`} className='text-sm text-orange-400 hover:underline'>
                    {prospect.phone}
                  </a>
                </div>
              )}
              {prospect.email && (
                <div className='flex items-center gap-2'>
                  <Mail size={12} className='text-gray-600 shrink-0' />
                  <a href={`mailto:${prospect.email}`} className='text-sm text-orange-400 hover:underline truncate'>
                    {prospect.email}
                  </a>
                </div>
              )}
              {(prospect.city || prospect.state) && (
                <div className='flex items-center gap-2'>
                  <MapPin size={12} className='text-gray-600 shrink-0' />
                  <span className='text-sm text-gray-300'>
                    {[prospect.city, prospect.state].filter(Boolean).join(', ')}
                  </span>
                </div>
              )}

              <div className='border-t border-surface-600 pt-3 space-y-2.5'>
                <ROW label='CDL Class'  value={prospect.cdl_class} />
                <ROW label='Equipment'  value={prospect.equipment_interest} />
                <ROW label='Experience' value={prospect.years_experience != null ? `${prospect.years_experience} yr${prospect.years_experience !== 1 ? 's' : ''}` : null} />
                <ROW label='Source'     value={prospect.source} />
                <ROW label='Contacts'   value={prospect.contact_attempt_count > 0 ? `${prospect.contact_attempt_count} attempt${prospect.contact_attempt_count !== 1 ? 's' : ''}` : null} />
                <ROW label='Last Contact' value={fmtDate(prospect.last_contact_date)} />
              </div>

              {prospect.follow_up_date && (
                <div className='border-t border-surface-600 pt-3'>
                  <div className='flex items-center gap-2'>
                    <Calendar size={12} className='text-gray-600 shrink-0' />
                    <span className={`text-sm ${dateCls(prospect.follow_up_date)}`}>
                      Follow-up: {fmtDate(prospect.follow_up_date)}
                    </span>
                  </div>
                </div>
              )}

              {prospect.notes && (
                <div className='border-t border-surface-600 pt-3'>
                  <p className='text-2xs text-gray-400 uppercase tracking-wide mb-1'>Notes</p>
                  <p className='text-sm text-gray-400 whitespace-pre-wrap'>{prospect.notes}</p>
                </div>
              )}
            </div>
          )}

          {/* ── Outreach ── */}
          {tab === 'outreach' && (
            <div className='space-y-4'>

              {/* Log a contact */}
              <div className='bg-surface-700/50 border border-surface-600 rounded-xl p-4 space-y-3'>
                <p className='text-2xs text-gray-500 uppercase tracking-wide font-medium'>Log Contact</p>
                <div className='grid grid-cols-2 gap-2'>
                  <div>
                    <label className='text-2xs text-gray-400 mb-1 block'>Method</label>
                    <select
                      className={sel}
                      value={outMethod}
                      onChange={e => setOutMethod(e.target.value)}
                    >
                      {OUTREACH_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className='text-2xs text-gray-400 mb-1 block'>Outcome</label>
                    <select
                      className={sel}
                      value={outOutcome}
                      onChange={e => setOutOutcome(e.target.value)}
                    >
                      <option value=''>Select...</option>
                      {OUTREACH_OUTCOMES.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                </div>
                <textarea
                  className='w-full bg-surface-600 border border-surface-500 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-orange-600/60 resize-none'
                  rows={2}
                  value={outNotes}
                  onChange={e => setOutNotes(e.target.value)}
                  placeholder='Optional notes...'
                />
                <button
                  onClick={handleLogOutreach}
                  disabled={outBusy}
                  className='w-full py-1.5 text-xs font-medium bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white rounded-lg transition-colors'
                >
                  {outBusy ? 'Saving...' : 'Log Contact'}
                </button>
              </div>

              {/* Template picker */}
              <div className='bg-surface-700/50 border border-surface-600 rounded-xl p-4 space-y-3'>
                <p className='text-2xs text-gray-500 uppercase tracking-wide font-medium flex items-center gap-1.5'>
                  <MessageSquare size={11} />
                  Message Templates
                </p>
                <select
                  className={sel}
                  value={selectedTpl?.id ?? ''}
                  onChange={e => {
                    const tpl = OUTREACH_TEMPLATES.find(t => t.id === e.target.value) ?? null
                    setSelectedTpl(tpl)
                    setTplCopied(false)
                  }}
                >
                  <option value=''>Select a template...</option>
                  {OUTREACH_TEMPLATES.map(t => (
                    <option key={t.id} value={t.id}>[{t.category}] {t.label}</option>
                  ))}
                </select>
                {selectedTpl && (
                  <div className='space-y-2'>
                    <textarea
                      readOnly
                      className='w-full bg-surface-600 border border-surface-500 rounded-lg px-3 py-2 text-xs text-gray-300 resize-none focus:outline-none cursor-text'
                      rows={6}
                      value={tplMerged}
                    />
                    <button
                      onClick={handleCopyTemplate}
                      className='flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-surface-600 hover:bg-surface-500 border border-surface-400 text-gray-300 transition-colors'
                    >
                      {tplCopied ? <Check size={11} className='text-green-400' /> : <Copy size={11} />}
                      {tplCopied ? 'Copied!' : 'Copy to Clipboard'}
                    </button>
                  </div>
                )}
              </div>

              {/* Outreach history */}
              <div>
                <p className='text-2xs text-gray-400 uppercase tracking-wide mb-2'>Contact History</p>
                {outreach.length === 0 ? (
                  <p className='text-sm text-gray-600 text-center py-4'>No contacts logged yet.</p>
                ) : (
                  <div className='space-y-2'>
                    {outreach.map(e => (
                      <div
                        key={e.id}
                        className='bg-surface-700 border border-surface-600 rounded-lg px-3 py-2.5 group flex items-start gap-3'
                      >
                        <div className='flex-1 min-w-0'>
                          <div className='flex items-center gap-2 flex-wrap mb-1'>
                            <span className='text-xs font-medium text-gray-200'>{e.method}</span>
                            {e.outcome && (
                              <span className='text-2xs px-1.5 py-0.5 rounded bg-surface-600 border border-surface-400 text-gray-400'>
                                {e.outcome}
                              </span>
                            )}
                            <span className='text-2xs text-gray-400 ml-auto'>{fmtDateTime(e.created_at)}</span>
                          </div>
                          {e.notes && (
                            <p className='text-xs text-gray-400 whitespace-pre-wrap'>{e.notes}</p>
                          )}
                        </div>
                        <button
                          onClick={() => handleDeleteOutreach(e.id)}
                          className='opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 transition-all shrink-0 mt-0.5'
                        >
                          <X size={10} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Notes ── */}
          {tab === 'notes' && (
            <div className='space-y-3'>
              <div className='flex flex-col gap-2'>
                <textarea
                  className='w-full bg-surface-600 border border-surface-400 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-orange-600/60 resize-none'
                  rows={3}
                  value={noteInput}
                  onChange={e => setNoteInput(e.target.value)}
                  placeholder='Add a note...'
                  onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleNoteAdd() }}
                />
                <button
                  onClick={handleNoteAdd}
                  disabled={noteSaving || !noteInput.trim()}
                  className='self-end px-4 py-1.5 text-xs font-medium bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white rounded-lg transition-colors'
                >
                  {noteSaving ? 'Saving...' : 'Add Note'}
                </button>
              </div>
              <div className='space-y-2'>
                {notes.length === 0 && (
                  <p className='text-sm text-gray-600 py-4 text-center'>No notes yet.</p>
                )}
                {notes.map(n => (
                  <div key={n.id} className='bg-surface-700 border border-surface-500 rounded-lg p-3 group'>
                    <div className='flex items-center justify-between mb-1'>
                      <span className='text-2xs text-gray-400'>
                        {new Date(n.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })}
                      </span>
                      <button
                        onClick={() => handleNoteDelete(n.id)}
                        className='opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 transition-all'
                      >
                        <X size={10} />
                      </button>
                    </div>
                    <p className='text-sm text-gray-300 whitespace-pre-wrap'>{n.content}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className='px-5 py-3 border-t border-surface-600 shrink-0 flex items-center justify-between gap-3'>
          <button
            onClick={handleDelete}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors ${
              confirmDel
                ? 'bg-red-900/50 border-red-700 text-red-300 hover:bg-red-900/70'
                : 'text-gray-500 hover:text-red-400 border-surface-500 hover:border-red-700/40'
            }`}
          >
            <Trash2 size={12} />
            {confirmDel ? 'Confirm Delete' : 'Delete'}
          </button>
          {confirmDel && (
            <button
              onClick={() => setConfirmDel(false)}
              className='text-xs text-gray-500 hover:text-gray-300 transition-colors'
            >
              Cancel
            </button>
          )}
          <button
            onClick={() => onEdit(prospect)}
            className='flex items-center gap-1.5 ml-auto text-xs px-3 py-1.5 rounded-lg bg-surface-600 hover:bg-surface-500 border border-surface-400 text-gray-300 transition-colors'
          >
            <Pencil size={12} /> Edit
          </button>
        </div>
      </div>
    </div>
  )
}
