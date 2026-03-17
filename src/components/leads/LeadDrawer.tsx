import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, Phone, Mail, MapPin, Truck, Calendar, Tag, Trash2,
         Plus, PhoneCall, ChevronDown, AlertTriangle, Check,
         Zap, UserPlus, Send } from 'lucide-react'
import type { Lead, LeadStatus, LeadPriority, Note } from '../../types/models'
import { useSettingsStore } from '../../store/settingsStore'
import { LeadScoreBadge } from './LeadScoreBadge'
import { computeLeadScore } from '../../lib/leadScore'
import { STATUS_STYLES, STATUS_DOTS, PRIORITY_STYLES, STATUSES, PRIORITIES, TRAILER_TYPES, CONTACT_METHODS } from './constants'
import { openSaferMc, openSaferDot } from '../../lib/saferUrl'

interface Props {
  lead:           Lead
  onClose:        () => void
  onEdit:         (l: Lead) => void
  onUpdate:       (l: Lead) => void
  onStatusChange: (l: Lead, s: LeadStatus) => void
  onDelete:       (l: Lead) => void
}

interface CallEntry {
  id: number; type: string; outcome: string; duration: string; summary: string; created_at: string
}

const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const fmtDate = (d: string | null) => {
  if (!d) return '—'
  const [y, m, day] = d.split('-')
  return `${months[+m-1]} ${+day}, ${y}`
}
const fmtDT = (dt: string) => {
  const d = new Date(dt)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' · ' +
    d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}
const authAge = (d: string | null) => {
  if (!d) return '—'
  const mo = (new Date().getFullYear() - new Date(d).getFullYear()) * 12 + (new Date().getMonth() - new Date(d).getMonth())
  return mo < 12 ? `${mo} months` : `${Math.floor(mo / 12)}y ${mo % 12}mo`
}

// Returns YYYY-MM-DD for today + N days
const dateOffset = (days: number): string => {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

function buildIntroMailUrl(to: string, driverName: string, fromEmail: string, fromPhone: string): string {
  const subject = 'OnTrack Hauling Solutions -- Dispatch Services Overview'
  const firstName = driverName.split(' ')[0] || driverName
  const phone = fromPhone || '[Your Phone Number]'
  const body = [
    `Hi ${firstName},`,
    '',
    'Great speaking with you. Here is a quick overview of what I offer.',
    '',
    'I am an independent freight dispatcher working with owner-operators to find loads, negotiate rates, and handle all broker paperwork. My fee is 7% per load, charged only when I book a load for you. No monthly fees, nothing upfront.',
    '',
    'What I do for you:',
    '- Search load boards and call brokers daily for loads that fit your lanes and equipment',
    '- Negotiate rates above the posted price whenever possible',
    '- Send and review rate confirmations before you commit to anything',
    '- Handle carrier packet submissions to new brokers on your behalf',
    '- Follow up on PODs and delivered loads',
    '',
    'You keep full control -- I never book a load without your approval.',
    '',
    'If this sounds like a fit, give me a call and we can go over the details. Takes about 15 minutes.',
    '',
    'Best,',
    'Chris Hooks',
    'OnTrack Hauling Solutions',
    fromEmail || 'dispatch@ontrackhaulingsolutions.com',
    phone,
  ].join('\r\n')
  // Use Gmail compose URL with authuser so it always opens in the correct account
  if (fromEmail) {
    return (
      'https://mail.google.com/mail/?authuser=' + encodeURIComponent(fromEmail) +
      '&view=cm&fs=1' +
      '&to=' + encodeURIComponent(to) +
      '&su=' + encodeURIComponent(subject) +
      '&body=' + encodeURIComponent(body)
    )
  }
  // Fallback: standard mailto if no email is configured in settings
  return `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}

function Row({ icon, label, value, mono = false }: { icon: React.ReactNode; label: string; value: string; mono?: boolean }) {
  return (
    <div className='flex items-start gap-2.5'>
      <span className='text-gray-600 mt-0.5 shrink-0'>{icon}</span>
      <div>
        <p className='text-2xs text-gray-600'>{label}</p>
        <p className={`text-sm text-gray-300 ${mono ? 'font-mono' : ''}`}>{value}</p>
      </div>
    </div>
  )
}

// Inline text input that activates on click
function InlineText({ icon, label, value, placeholder, mono = false, onSave }:
  { icon: React.ReactNode; label: string; value: string | null; placeholder: string; mono?: boolean; onSave: (v: string) => void }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft]     = useState(value ?? '')
  const inputRef              = useRef<HTMLInputElement>(null)

  const activate = () => { setDraft(value ?? ''); setEditing(true); setTimeout(() => inputRef.current?.focus(), 0) }
  const commit   = () => { setEditing(false); if (draft !== (value ?? '')) onSave(draft) }
  const cancel   = () => { setEditing(false); setDraft(value ?? '') }

  return (
    <div className='flex items-start gap-2.5'>
      <span className='text-gray-600 mt-0.5 shrink-0'>{icon}</span>
      <div className='flex-1 min-w-0'>
        <p className='text-2xs text-gray-600'>{label}</p>
        {editing ? (
          <div className='flex items-center gap-1 mt-0.5'>
            <input ref={inputRef} value={draft} onChange={e => setDraft(e.target.value)}
              onBlur={commit}
              onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') cancel() }}
              className='flex-1 min-w-0 bg-surface-600 border border-orange-600/50 rounded px-2 py-0.5 text-sm text-gray-100 outline-none font-mono' />
          </div>
        ) : (
          <button onClick={activate}
            className={`text-sm text-left w-full text-gray-300 hover:text-orange-300 transition-colors group ${mono ? 'font-mono' : ''}`}
            title='Click to edit'>
            <span>{value || <span className='text-gray-600 italic'>{placeholder}</span>}</span>
            <span className='ml-1 opacity-0 group-hover:opacity-60 text-2xs text-orange-500'>[edit]</span>
          </button>
        )}
      </div>
    </div>
  )
}

// Inline date picker
function InlineDate({ icon, label, value, onSave }:
  { icon: React.ReactNode; label: string; value: string | null; onSave: (v: string | null) => void }) {
  const [editing, setEditing] = useState(false)
  const inputRef              = useRef<HTMLInputElement>(null)

  const activate = () => { setEditing(true); setTimeout(() => inputRef.current?.showPicker?.(), 50) }
  const commit   = (v: string) => { setEditing(false); onSave(v || null) }
  const cancel   = () => setEditing(false)

  return (
    <div className='flex items-start gap-2.5'>
      <span className='text-gray-600 mt-0.5 shrink-0'>{icon}</span>
      <div className='flex-1 min-w-0'>
        <p className='text-2xs text-gray-600'>{label}</p>
        {editing ? (
          <input ref={inputRef} type='date' defaultValue={value ?? ''}
            onChange={e => commit(e.target.value)}
            onBlur={cancel}
            onKeyDown={e => { if (e.key === 'Escape') cancel() }}
            className='bg-surface-600 border border-orange-600/50 rounded px-2 py-0.5 text-sm text-gray-100 outline-none' />
        ) : (
          <button onClick={activate}
            className='text-sm text-left text-gray-300 hover:text-orange-300 transition-colors group'
            title='Click to change date'>
            <span>{value ? fmtDate(value) : <span className='text-gray-600 italic'>Set date</span>}</span>
            <span className='ml-1 opacity-0 group-hover:opacity-60 text-2xs text-orange-500'>[edit]</span>
          </button>
        )}
      </div>
    </div>
  )
}

// Inline select
function InlineSelect({ icon, label, value, options, onSave }:
  { icon: React.ReactNode; label: string; value: string | null; options: string[]; onSave: (v: string) => void }) {
  const [editing, setEditing] = useState(false)
  const selectRef             = useRef<HTMLSelectElement>(null)

  const activate = () => { setEditing(true); setTimeout(() => selectRef.current?.focus(), 0) }

  return (
    <div className='flex items-start gap-2.5'>
      <span className='text-gray-600 mt-0.5 shrink-0'>{icon}</span>
      <div className='flex-1 min-w-0'>
        <p className='text-2xs text-gray-600'>{label}</p>
        {editing ? (
          <select ref={selectRef} defaultValue={value ?? ''}
            onChange={e => { onSave(e.target.value); setEditing(false) }}
            onBlur={() => setEditing(false)}
            className='bg-surface-600 border border-orange-600/50 rounded px-1 py-0.5 text-sm text-gray-100 outline-none w-full'>
            <option value=''>— none —</option>
            {options.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        ) : (
          <button onClick={activate}
            className='text-sm text-left text-gray-300 hover:text-orange-300 transition-colors group w-full'
            title='Click to change'>
            <span>{value || <span className='text-gray-600 italic'>Not set</span>}</span>
            <span className='ml-1 opacity-0 group-hover:opacity-60 text-2xs text-orange-500'>[edit]</span>
          </button>
        )}
      </div>
    </div>
  )
}

export function LeadDrawer({ lead, onClose, onEdit, onUpdate, onStatusChange, onDelete }: Props) {
  const navigate = useNavigate()
  const { ownerEmail, ownerPhone } = useSettingsStore()
  const [notes, setNotes]           = useState<Note[]>([])
  const [calls, setCalls]           = useState<CallEntry[]>([])
  const [noteText, setNoteText]     = useState('')
  const [addingNote, setAddingNote] = useState(false)
  const [addingCall, setAddingCall] = useState(false)
  const [callForm, setCallForm]     = useState({ type: 'Call', outcome: 'Answered', duration: '', summary: '' })
  const [showScore, setShowScore]   = useState(false)
  const [confirmDel, setConfirmDel] = useState(false)
  const [statusOpen, setStatusOpen] = useState(false)
  const [priorityOpen, setPriorityOpen] = useState(false)
  const [converting, setConverting] = useState(false)
  const [convertedMsg, setConvertedMsg] = useState('')
  const { total, grade, factors }   = computeLeadScore(lead)

  useEffect(() => {
    Promise.all([
      window.api.notes.list('lead', lead.id),
      window.api.notes.list('lead_call', lead.id),
    ]).then(([n, c]) => {
      setNotes(n)
      setCalls(c.map(note => {
        try { return { ...JSON.parse(note.content), id: note.id, created_at: note.created_at } }
        catch { return { id: note.id, type: 'Call', outcome: '—', duration: '', summary: note.content, created_at: note.created_at } }
      }))
    })
  }, [lead.id])

  // Close status/priority dropdowns when clicking outside
  useEffect(() => {
    if (!statusOpen && !priorityOpen) return
    const handler = () => { setStatusOpen(false); setPriorityOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [statusOpen, priorityOpen])

  const saveField = async (field: string, value: string | number | null) => {
    const updated = await window.api.leads.update(lead.id, { [field]: value })
    if (updated) onUpdate(updated)
  }

  const addNote = async () => {
    if (!noteText.trim()) return
    const n = await window.api.notes.create({ entity_type: 'lead', entity_id: lead.id, content: noteText.trim(), user_id: null })
    setNotes(p => [n, ...p]); setNoteText(''); setAddingNote(false)
  }
  const delNote = async (id: number) => {
    await window.api.notes.delete(id); setNotes(p => p.filter(n => n.id !== id))
  }
  const addCall = async () => {
    const n = await window.api.notes.create({ entity_type: 'lead_call', entity_id: lead.id, content: JSON.stringify(callForm), user_id: null })
    setCalls(p => [{ ...callForm, id: n.id, created_at: n.created_at }, ...p])
    setCallForm({ type: 'Call', outcome: 'Answered', duration: '', summary: '' }); setAddingCall(false)
  }
  const delCall = async (id: number) => {
    await window.api.notes.delete(id); setCalls(p => p.filter(c => c.id !== id))
  }

  // ── Quick Actions ────────────────────────────────────────────────────────

  const logAttempt = async () => {
    const today = new Date().toISOString().split('T')[0]
    const newCount = (lead.contact_attempt_count ?? 0) + 1
    const updated = await window.api.leads.update(lead.id, {
      contact_attempt_count: newCount,
      last_contact_date: today,
      status: lead.status === 'New' ? 'Attempted' : lead.status,
    })
    if (updated) onUpdate(updated)
  }

  const markContacted = async () => {
    const today = new Date().toISOString().split('T')[0]
    const newCount = (lead.contact_attempt_count ?? 0) + 1
    const updated = await window.api.leads.update(lead.id, {
      status: 'Contacted',
      last_contact_date: today,
      contact_attempt_count: newCount,
    })
    if (updated) onUpdate(updated)
  }

  const setFollowUp = async (days: number) => {
    const updated = await window.api.leads.update(lead.id, { follow_up_date: dateOffset(days) })
    if (updated) onUpdate(updated)
  }

  const markNotInterested = async () => {
    const updated = await window.api.leads.update(lead.id, { status: 'Not Interested' })
    if (updated) onUpdate(updated)
  }

  const convertToDriver = async () => {
    setConverting(true)
    setConvertedMsg('')
    try {
      const driver = await window.api.drivers.create({
        name:              lead.name,
        company:           lead.company ?? null,
        mc_number:         lead.mc_number ?? null,
        dot_number:        lead.dot_number ?? null,
        cdl_number:        null,
        cdl_expiry:        null,
        phone:             lead.phone ?? null,
        email:             lead.email ?? null,
        truck_type:        null,
        trailer_type:      lead.trailer_type ?? null,
        home_base:         lead.city && lead.state ? `${lead.city}, ${lead.state}` : (lead.city ?? lead.state ?? null),
        current_location:  null,
        preferred_lanes:   null,
        min_rpm:           null,
        dispatch_percent:  7.0,
        factoring_company: null,
        insurance_expiry:  null,
        start_date:        null,
        status:            'Active',
        notes:             lead.notes ?? null,
      })
      if (driver) {
        const updated = await window.api.leads.update(lead.id, { status: 'Converted' })
        if (updated) onUpdate(updated)
        setConvertedMsg('Driver created. Opening Drivers page…')
        setTimeout(() => { navigate('/drivers') }, 1200)
      }
    } catch {
      setConvertedMsg('Convert failed — check driver details.')
    } finally {
      setConverting(false)
    }
  }

  const today    = new Date().toISOString().split('T')[0]
  const overdue  = Boolean(lead.follow_up_date && lead.follow_up_date < today)
  const location = [lead.city, lead.state].filter(Boolean).join(', ')
  const CALL_TYPES    = ['Call', 'Email', 'SMS', 'Meeting']
  const CALL_OUTCOMES = ['Answered', 'No Answer', 'Voicemail', 'Callback Requested', 'Interested', 'Not Interested']

  return (
    <div className='fixed inset-0 z-50 flex'>
      <div className='flex-1 bg-black/50 backdrop-blur-sm' onClick={onClose} />
      <div className='w-[480px] bg-surface-800 border-l border-surface-400 shadow-2xl flex flex-col overflow-hidden animate-slide-in'>

        {/* Header */}
        <div className='flex items-start justify-between px-5 pt-5 pb-4 border-b border-surface-500 shrink-0'>
          <div className='flex-1 min-w-0'>
            <div className='flex items-center gap-2 mb-1'>
              <h2 className='text-lg font-semibold text-gray-100 truncate'>{lead.name}</h2>
              <LeadScoreBadge lead={lead} showLabel />
            </div>
            {lead.company && <p className='text-sm text-gray-500 truncate'>{lead.company}</p>}
            <div className='flex items-center gap-2 mt-2'>

              {/* Inline status selector */}
              <div className='relative' onMouseDown={e => e.stopPropagation()}>
                <button
                  onClick={() => { setStatusOpen(v => !v); setPriorityOpen(false) }}
                  className={`flex items-center gap-1 text-2xs px-2 py-0.5 rounded-full border transition-colors hover:opacity-80 ${STATUS_STYLES[lead.status]}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOTS[lead.status]}`} />
                  {lead.status}
                  <ChevronDown size={9} className={`transition-transform ${statusOpen ? 'rotate-180' : ''}`} />
                </button>
                {statusOpen && (
                  <div className='absolute top-full left-0 mt-1 bg-surface-700 border border-surface-400 rounded-lg shadow-xl z-10 py-1 min-w-[160px]'>
                    {STATUSES.map(s => (
                      <button key={s} onClick={() => { onStatusChange(lead, s); setStatusOpen(false) }}
                        className='flex items-center gap-2 w-full px-3 py-1.5 text-xs text-gray-300 hover:bg-surface-600 hover:text-gray-100 transition-colors text-left'>
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${STATUS_DOTS[s]}`} />
                        {s}
                        {s === lead.status && <Check size={10} className='ml-auto text-orange-400' />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Inline priority selector */}
              <div className='relative' onMouseDown={e => e.stopPropagation()}>
                <button
                  onClick={() => { setPriorityOpen(v => !v); setStatusOpen(false) }}
                  className={`flex items-center gap-1 text-2xs px-1.5 py-0.5 rounded-full transition-colors hover:opacity-80 ${PRIORITY_STYLES[lead.priority]}`}>
                  {lead.priority}
                  <ChevronDown size={9} className={`transition-transform ${priorityOpen ? 'rotate-180' : ''}`} />
                </button>
                {priorityOpen && (
                  <div className='absolute top-full left-0 mt-1 bg-surface-700 border border-surface-400 rounded-lg shadow-xl z-10 py-1 min-w-[110px]'>
                    {PRIORITIES.map(p => (
                      <button key={p} onClick={() => { saveField('priority', p); setPriorityOpen(false) }}
                        className='flex items-center gap-2 w-full px-3 py-1.5 text-xs text-gray-300 hover:bg-surface-600 hover:text-gray-100 transition-colors text-left'>
                        {p}
                        {p === lead.priority && <Check size={10} className='ml-auto text-orange-400' />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Attempt counter badge */}
              {(lead.contact_attempt_count ?? 0) > 0 && (
                <span className='text-2xs text-gray-600 bg-surface-600 px-1.5 py-0.5 rounded'>
                  {lead.contact_attempt_count} attempt{lead.contact_attempt_count !== 1 ? 's' : ''}
                </span>
              )}

            </div>
          </div>
          <button onClick={onClose} className='p-1.5 rounded-lg hover:bg-surface-600 text-gray-500 hover:text-gray-300 ml-3 shrink-0'><X size={16} /></button>
        </div>

        {/* Scrollable body */}
        <div className='flex-1 overflow-y-auto'>

          {/* Standard action bar */}
          <div className='flex items-center gap-1.5 px-5 py-3 border-b border-surface-600 flex-wrap shrink-0'>
            {lead.phone && <a href={`tel:${lead.phone}`} className='flex items-center gap-1.5 px-2.5 h-7 text-xs font-medium bg-surface-600 hover:bg-surface-500 text-gray-300 rounded-lg transition-colors'><Phone size={11} /> Call</a>}
            <button onClick={() => onEdit(lead)} className='flex items-center gap-1.5 px-2.5 h-7 text-xs font-medium bg-surface-600 hover:bg-surface-500 text-gray-300 rounded-lg transition-colors'>Full Edit</button>
            <div className='flex-1' />
            {!confirmDel
              ? <button onClick={() => setConfirmDel(true)} className='p-1.5 rounded hover:bg-surface-600 text-gray-600 hover:text-red-400 transition-colors'><Trash2 size={13} /></button>
              : <div className='flex items-center gap-1'>
                  <span className='text-2xs text-red-400'>Delete?</span>
                  <button onClick={() => onDelete(lead)} className='text-2xs px-2 py-0.5 rounded bg-red-900/40 text-red-400 hover:bg-red-900/60'>Yes</button>
                  <button onClick={() => setConfirmDel(false)} className='text-2xs px-2 py-0.5 rounded bg-surface-600 text-gray-400'>No</button>
                </div>
            }
          </div>

          {/* ── Quick Actions ── */}
          <div className='px-5 py-3 border-b border-surface-600 bg-surface-700/40'>
            <div className='flex items-center gap-1 mb-2'>
              <Zap size={11} className='text-orange-500' />
              <p className='text-2xs font-medium text-gray-600 uppercase tracking-wider'>Quick Actions</p>
            </div>
            <div className='flex flex-wrap gap-1.5'>
              <button
                onClick={logAttempt}
                title='Log a contact attempt — increments count, sets last contact to today'
                className='flex items-center gap-1 h-6 px-2 text-2xs font-medium bg-surface-600 hover:bg-surface-500 border border-surface-400 hover:border-orange-600/40 text-gray-300 rounded transition-colors'
              >
                <PhoneCall size={10} /> Log Attempt
              </button>
              <button
                onClick={markContacted}
                title='Mark as Contacted and update last contact date'
                className='flex items-center gap-1 h-6 px-2 text-2xs font-medium bg-surface-600 hover:bg-surface-500 border border-surface-400 hover:border-blue-500/40 text-gray-300 rounded transition-colors'
              >
                <Check size={10} /> Mark Contacted
              </button>
              <div className='w-px h-4 bg-surface-500 self-center mx-0.5' />
              <button
                onClick={() => setFollowUp(1)}
                title='Set follow-up to tomorrow'
                className='h-6 px-2 text-2xs font-medium bg-surface-600 hover:bg-surface-500 border border-surface-400 hover:border-orange-600/40 text-gray-300 rounded transition-colors'
              >
                Tmrw
              </button>
              <button
                onClick={() => setFollowUp(3)}
                title='Set follow-up to 3 days from now'
                className='h-6 px-2 text-2xs font-medium bg-surface-600 hover:bg-surface-500 border border-surface-400 hover:border-orange-600/40 text-gray-300 rounded transition-colors'
              >
                +3 Days
              </button>
              <button
                onClick={() => setFollowUp(7)}
                title='Set follow-up to next week'
                className='h-6 px-2 text-2xs font-medium bg-surface-600 hover:bg-surface-500 border border-surface-400 hover:border-orange-600/40 text-gray-300 rounded transition-colors'
              >
                +7 Days
              </button>
              <div className='w-px h-4 bg-surface-500 self-center mx-0.5' />
              <button
                onClick={markNotInterested}
                title='Mark lead as Not Interested'
                className='h-6 px-2 text-2xs font-medium bg-surface-600 hover:bg-red-900/30 border border-surface-400 hover:border-red-800/40 text-gray-400 hover:text-red-400 rounded transition-colors'
              >
                Not Interested
              </button>
              <button
                onClick={convertToDriver}
                disabled={converting || lead.status === 'Converted'}
                title={lead.status === 'Converted' ? 'Already converted' : 'Create a driver record from this lead'}
                className='flex items-center gap-1 h-6 px-2 text-2xs font-medium bg-emerald-900/20 hover:bg-emerald-900/40 border border-emerald-800/30 hover:border-emerald-700/50 text-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed rounded transition-colors'
              >
                <UserPlus size={10} /> {converting ? 'Converting…' : 'Convert to Driver'}
              </button>
            </div>
            {convertedMsg && (
              <p className='mt-1.5 text-2xs text-emerald-400'>{convertedMsg}</p>
            )}
          </div>

          {/* Overdue banner */}
          {overdue && (
            <div className='mx-5 mt-4 flex items-center gap-2 px-3 py-2 rounded-lg bg-orange-900/20 border border-orange-700/30'>
              <AlertTriangle size={12} className='text-orange-400 shrink-0' />
              <p className='text-xs text-orange-300'>Follow-up overdue since <strong>{fmtDate(lead.follow_up_date)}</strong></p>
            </div>
          )}

          {/* Outreach summary row */}
          {((lead.last_contact_date) || (lead.contact_attempt_count ?? 0) > 0) && (
            <div className='mx-5 mt-4 flex items-center gap-4 px-3 py-2 rounded-lg bg-surface-700/50 border border-surface-500/40'>
              {lead.last_contact_date && (
                <div>
                  <p className='text-2xs text-gray-600'>Last Contact</p>
                  <p className='text-xs text-gray-300'>{fmtDate(lead.last_contact_date)}</p>
                </div>
              )}
              {(lead.contact_attempt_count ?? 0) > 0 && (
                <div>
                  <p className='text-2xs text-gray-600'>Attempts</p>
                  <p className='text-xs text-gray-300'>{lead.contact_attempt_count}</p>
                </div>
              )}
              {lead.contact_method && (
                <div>
                  <p className='text-2xs text-gray-600'>Last Method</p>
                  <p className='text-xs text-gray-300'>{lead.contact_method}</p>
                </div>
              )}
              {lead.outreach_outcome && (
                <div className='flex-1 min-w-0'>
                  <p className='text-2xs text-gray-600'>Last Outcome</p>
                  <p className='text-xs text-gray-300 truncate'>{lead.outreach_outcome}</p>
                </div>
              )}
            </div>
          )}

          {/* Contact details */}
          <div className='px-5 py-4 border-b border-surface-600'>
            <p className='text-2xs font-medium text-gray-600 uppercase tracking-wider mb-3'>Contact</p>
            <div className='grid grid-cols-2 gap-3'>
              <InlineText icon={<Phone size={12} />} label='Phone' value={lead.phone} placeholder='Add phone'
                onSave={v => saveField('phone', v || null)} />
              {lead.email && (
                <div className='flex items-start gap-2.5'>
                  <span className='text-gray-600 mt-0.5 shrink-0'><Mail size={12} /></span>
                  <div>
                    <p className='text-2xs text-gray-600'>Email</p>
                    <p className='text-sm text-gray-300 break-all'>{lead.email}</p>
                    <button
                      onClick={() => (window.api as any).shell.openExternal(buildIntroMailUrl(lead.email!, lead.name, ownerEmail, ownerPhone))}
                      className='mt-1 flex items-center gap-1 text-2xs text-orange-400 hover:text-orange-300 transition-colors'
                      title='Open intro email template in your mail client'
                    >
                      <Send size={10} />
                      Send Intro Email
                    </button>
                  </div>
                </div>
              )}
              {location   && <Row icon={<MapPin size={12} />} label='Location' value={location} />}
              <InlineSelect icon={<Truck size={12} />} label='Trailer' value={lead.trailer_type}
                options={TRAILER_TYPES} onSave={v => saveField('trailer_type', v || null)} />
              {lead.fleet_size != null && (
                <Row icon={<Truck size={12} />} label='Fleet Size'
                  value={lead.fleet_size + ' truck' + (lead.fleet_size !== 1 ? 's' : '')} />
              )}
              {lead.mc_number && (
                <div className='flex items-start gap-2.5'>
                  <span className='text-gray-600 mt-0.5 shrink-0'><Tag size={12} /></span>
                  <div>
                    <p className='text-2xs text-gray-600'>MC #</p>
                    <button
                      onClick={e => {
                        const num = lead.mc_number.replace(/^MC-?/i, '').trim()
                        navigator.clipboard.writeText(num).catch(() => {})
                        openSaferMc(lead.mc_number, e)
                      }}
                      className='text-sm font-mono text-gray-300 hover:text-orange-400 hover:underline transition-colors cursor-pointer'
                      title='Open FMCSA SAFER + copy MC to clipboard'
                    >{lead.mc_number}</button>
                  </div>
                </div>
              )}
              {lead.dot_number && (
                <div className='flex items-start gap-2.5'>
                  <span className='text-gray-600 mt-0.5 shrink-0'><Tag size={12} /></span>
                  <div>
                    <p className='text-2xs text-gray-600'>DOT #</p>
                    <button onClick={e => openSaferDot(lead.dot_number!, e)}
                      className='text-sm font-mono text-gray-300 hover:text-orange-400 hover:underline transition-colors cursor-pointer'
                      title='View on FMCSA SAFER'>{lead.dot_number}</button>
                  </div>
                </div>
              )}
              <Row icon={<Calendar size={12} />} label='Authority Age' value={authAge(lead.authority_date)} />
              {lead.source && <Row icon={<Tag size={12} />} label='Source' value={lead.source} />}
              <InlineDate icon={<Calendar size={12} />} label='Follow-Up'
                value={lead.follow_up_date} onSave={v => saveField('follow_up_date', v)} />
              <InlineSelect icon={<PhoneCall size={12} />} label='Last Method'
                value={lead.contact_method} options={CONTACT_METHODS}
                onSave={v => saveField('contact_method', v || null)} />
            </div>
            {/* Outreach notes inline */}
            <div className='mt-3'>
              <InlineText icon={<Tag size={12} />} label='Outreach Notes' value={lead.follow_up_notes}
                placeholder='Quick outreach context…'
                onSave={v => saveField('follow_up_notes', v || null)} />
            </div>
          </div>

          {/* Notes */}
          <div className='px-5 py-4 border-b border-surface-600'>
            <div className='flex items-center justify-between mb-3'>
              <p className='text-2xs font-medium text-gray-600 uppercase tracking-wider'>Notes</p>
              <button onClick={() => setAddingNote(v => !v)}
                className='flex items-center gap-1 text-2xs text-gray-600 hover:text-orange-400 transition-colors'>
                <Plus size={10} /> Add
              </button>
            </div>
            {addingNote && (
              <div className='mb-3'>
                <textarea value={noteText} onChange={e => setNoteText(e.target.value)} rows={3}
                  className='w-full bg-surface-600 border border-surface-400 rounded-lg px-3 py-2 text-sm text-gray-200 resize-none focus:outline-none focus:border-orange-600/50 placeholder-gray-600'
                  placeholder='Add a note...' />
                <div className='flex gap-2 mt-1.5'>
                  <button onClick={addNote} className='px-3 py-1 text-2xs font-medium bg-orange-600 hover:bg-orange-500 text-white rounded-lg transition-colors'>Save</button>
                  <button onClick={() => { setAddingNote(false); setNoteText('') }} className='px-3 py-1 text-2xs text-gray-500 hover:text-gray-300 rounded-lg transition-colors'>Cancel</button>
                </div>
              </div>
            )}
            {notes.length === 0
              ? <p className='text-2xs text-gray-700 italic'>No notes yet.</p>
              : notes.map(n => (
                <div key={n.id} className='group/note flex items-start gap-2 py-2 border-b border-surface-600 last:border-0'>
                  <div className='flex-1 min-w-0'>
                    <p className='text-xs text-gray-300 whitespace-pre-wrap'>{n.content}</p>
                    <p className='text-2xs text-gray-700 mt-0.5'>{fmtDT(n.created_at)}</p>
                  </div>
                  <button onClick={() => delNote(n.id)}
                    className='opacity-0 group-hover/note:opacity-100 p-1 rounded hover:bg-surface-600 text-gray-600 hover:text-red-400 transition-all shrink-0'>
                    <X size={10} /></button>
                </div>
              ))}
          </div>

          {/* Call Log */}
          <div className='px-5 py-4 border-b border-surface-600'>
            <div className='flex items-center justify-between mb-3'>
              <p className='text-2xs font-medium text-gray-600 uppercase tracking-wider'>Call Log</p>
              <button onClick={() => setAddingCall(v => !v)}
                className='flex items-center gap-1 text-2xs text-gray-600 hover:text-orange-400 transition-colors'>
                <Plus size={10} /> Log
              </button>
            </div>
            {addingCall && (
              <div className='mb-3 space-y-2'>
                <div className='grid grid-cols-2 gap-2'>
                  <select value={callForm.type} onChange={e => setCallForm(p => ({ ...p, type: e.target.value }))}
                    className='bg-surface-600 border border-surface-400 rounded-lg px-2 py-1.5 text-xs text-gray-300 focus:outline-none'>
                    {CALL_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                  <select value={callForm.outcome} onChange={e => setCallForm(p => ({ ...p, outcome: e.target.value }))}
                    className='bg-surface-600 border border-surface-400 rounded-lg px-2 py-1.5 text-xs text-gray-300 focus:outline-none'>
                    {CALL_OUTCOMES.map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
                <input value={callForm.duration} onChange={e => setCallForm(p => ({ ...p, duration: e.target.value }))}
                  placeholder='Duration (e.g. 5 min)'
                  className='w-full bg-surface-600 border border-surface-400 rounded-lg px-3 py-1.5 text-xs text-gray-300 focus:outline-none placeholder-gray-600' />
                <textarea value={callForm.summary} onChange={e => setCallForm(p => ({ ...p, summary: e.target.value }))} rows={2}
                  placeholder='Summary...'
                  className='w-full bg-surface-600 border border-surface-400 rounded-lg px-3 py-2 text-xs text-gray-300 resize-none focus:outline-none placeholder-gray-600' />
                <div className='flex gap-2'>
                  <button onClick={addCall} className='px-3 py-1 text-2xs font-medium bg-orange-600 hover:bg-orange-500 text-white rounded-lg transition-colors'>Save</button>
                  <button onClick={() => setAddingCall(false)} className='px-3 py-1 text-2xs text-gray-500 hover:text-gray-300 rounded-lg transition-colors'>Cancel</button>
                </div>
              </div>
            )}
            {calls.length === 0
              ? <p className='text-2xs text-gray-700 italic'>No calls logged yet.</p>
              : calls.map(c => (
                <div key={c.id} className='group/call flex items-start gap-2.5 py-2.5 border-b border-surface-600 last:border-0'>
                  <PhoneCall size={12} className='text-gray-600 mt-0.5 shrink-0' />
                  <div className='flex-1 min-w-0'>
                    <div className='flex items-center gap-2 flex-wrap'>
                      <span className='text-xs font-medium text-gray-300'>{c.type}</span>
                      <span className='text-2xs text-gray-600'>|</span>
                      <span className='text-2xs text-gray-500'>{c.outcome}</span>
                      {c.duration && <><span className='text-2xs text-gray-600'>|</span><span className='text-2xs text-gray-600'>{c.duration}</span></>}
                    </div>
                    {c.summary && <p className='text-xs text-gray-400 mt-0.5'>{c.summary}</p>}
                    <p className='text-2xs text-gray-700 mt-0.5'>{fmtDT(c.created_at)}</p>
                  </div>
                  <button onClick={() => delCall(c.id)}
                    className='opacity-0 group-hover/call:opacity-100 p-1 rounded hover:bg-surface-600 text-gray-600 hover:text-red-400 transition-all shrink-0'>
                    <X size={10} /></button>
                </div>
              ))}
          </div>

          {/* Score Breakdown */}
          <div className='px-5 py-4'>
            <button onClick={() => setShowScore(v => !v)}
              className='flex items-center gap-1.5 w-full text-left'>
              <p className='text-2xs font-medium text-gray-600 uppercase tracking-wider flex-1'>Score Breakdown</p>
              <span className='text-2xs text-gray-600'>{total}/100 · {grade}</span>
              <ChevronDown size={12} className={`text-gray-600 transition-transform ${showScore ? 'rotate-180' : ''}`} />
            </button>
            {showScore && (
              <div className='mt-3 space-y-1.5'>
                {factors.map(f => (
                  <div key={f.label} className='flex items-center gap-2'>
                    <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${f.met ? 'bg-green-500' : 'bg-surface-500'}`} />
                    <span className={`text-2xs flex-1 ${f.met ? 'text-gray-400' : 'text-gray-700'}`}>{f.label}</span>
                    <span className={`text-2xs font-mono ${f.met ? 'text-green-500' : 'text-gray-700'}`}>+{f.points}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}
