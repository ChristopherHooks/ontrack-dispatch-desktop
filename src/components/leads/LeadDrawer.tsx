import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, Phone, Mail, MapPin, Truck, Calendar, Tag, Trash2,
         Plus, PhoneCall, ChevronDown, AlertTriangle, Check,
         Zap, UserPlus, Send, Bell, Sparkles, Copy, BookOpen } from 'lucide-react'
import type { Lead, LeadStatus, LeadPriority, Note } from '../../types/models'
import { useSettingsStore } from '../../store/settingsStore'
import { LeadScoreBadge } from './LeadScoreBadge'
import { computeLeadScore } from '../../lib/leadScore'
import { STATUS_STYLES, STATUS_DOTS, PRIORITY_STYLES, STATUSES, PRIORITIES, TRAILER_TYPES, CONTACT_METHODS } from './constants'
import { openSaferMc, openSaferDot } from '../../lib/saferUrl'
import { LeadNurturePanel } from './LeadNurturePanel'

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

// ---------------------------------------------------------------------------
// Call Scripts — keyed to lead status
// ---------------------------------------------------------------------------
interface CallScript {
  title:   string
  opener:  string
  points:  string[]
  close:   string
}
const CALL_SCRIPTS: Partial<Record<string, CallScript>> = {
  'New': {
    title:  'First contact',
    opener: 'Hi, is this [name]? This is [your name] with [company]. I came across your info and wanted to reach out real quick — I\'m a freight dispatcher and I help owner-operators find loads and grow their revenue. Do you have about 60 seconds?',
    points: [
      'What kind of equipment are you running? How many trucks?',
      'Are you currently working with a dispatcher, or are you finding your own loads?',
      'What lanes are you running most — do you have a home base you like to work out of?',
      'What\'s your minimum RPM — what rate per mile do you need to make a load worth it?',
    ],
    close: 'I\'d love to send you some info on how we work. What\'s the best email for you? And when\'s a good time to follow up — would later this week work?',
  },
  'Attempted': {
    title:  'Following up after no response',
    opener: 'Hi [name], this is [your name] again from [company]. I tried to reach you a couple times — I know you\'re busy, I just wanted to touch base real quick. Are you available to talk for one minute?',
    points: [
      'I work with owner-operators to find consistent loads at strong rates.',
      'I\'m not going to waste your time — I just want to know if it\'s worth having a quick conversation.',
      'Are you actively looking for loads, or are you pretty well covered right now?',
    ],
    close: 'If now\'s not the right time, no problem. Can I send you a quick text with my info so you have it when you need it?',
  },
  'Voicemail Left': {
    title:  'Following up after voicemail',
    opener: 'Hi [name], this is [your name] from [company] — I left you a voicemail recently. I\'m a freight dispatcher and I wanted to talk for a minute about helping you find better loads. Is now a good time?',
    points: [
      'I specialize in [equipment type] loads in [lane/region].',
      'Most of my drivers see consistent rates above their minimums — I do the broker calls so they don\'t have to.',
      'It takes about 10 minutes to get set up if you\'re interested.',
    ],
    close: 'Would you be open to a 10-minute call this week so I can show you what I\'ve been moving lately?',
  },
  'Contacted': {
    title:  'Keeping the conversation moving',
    opener: 'Hey [name], it\'s [your name] from [company]. We talked [recently / last week] — I wanted to follow up and see if you had any more questions about working together.',
    points: [
      'Remind them of what you discussed: their lane, equipment, RPM target.',
      'Share a specific recent win: "I just moved a flatbed from [origin] to [destination] at $X.XX — that\'s the kind of load I\'m looking for my carriers."',
      'Address any concern they raised last time.',
      'Ask: "Is there anything holding you back from moving forward?"',
    ],
    close: 'I\'d love to send you the dispatch agreement so you can look it over. It\'s straightforward — two pages. Can I send it to your email?',
  },
  'Interested': {
    title:  'They\'re warm — push toward agreement',
    opener: 'Hey [name], [your name] here. Just following up — I know you mentioned you were interested in working together. I want to make this as easy as possible to get started.',
    points: [
      'Do you have any questions about the dispatch agreement or how the fee works?',
      'Walk them through the process: I find the load, you approve it, you run it, I handle the paperwork.',
      'Remind them of the value: "You\'re in the truck — I\'m on the phone with brokers all day so you don\'t have to be."',
      'If they\'re hesitant: "What would need to be true for you to feel comfortable moving forward?"',
    ],
    close: 'Let me send over the agreement today. If everything looks good, you can sign it electronically and we can start looking for your first load this week.',
  },
  'Call Back Later': {
    title:  'They asked you to call back',
    opener: 'Hey [name], it\'s [your name] from [company]. You asked me to follow up [today / this week] — is now still a good time?',
    points: [
      'Reference what they said last time: "You mentioned you might have more availability after [date]."',
      'Don\'t restart the pitch — pick up where you left off.',
      'Ask directly: "Have things opened up a bit? Are you ready to start looking at loads?"',
    ],
    close: 'If you\'re ready, I can have the agreement to you in the next hour and we can start immediately. If you need another week, I completely understand — when should I follow up again?',
  },
  'Agreement Sent': {
    title:  'Agreement is out — follow up on signature',
    opener: 'Hey [name], [your name] here. I sent over the dispatch agreement [a few days ago] — did you get a chance to look it over?',
    points: [
      'If they haven\'t looked: "Do you want me to walk you through it real quick? It\'s two pages — I can go through the main points in five minutes."',
      'If they have questions: answer them directly. The most common: fee percentage, what happens if they don\'t like a load, how invoicing works.',
      'If they\'re hesitant: "Is there something specific in there that doesn\'t feel right? I want to make sure you\'re comfortable with everything."',
      'Key terms: dispatch fee is X%, paid weekly after broker pays. You approve every load before it\'s booked. 30-day notice to terminate.',
    ],
    close: 'If everything looks good, you can sign it electronically right now — it takes 30 seconds. Then I can start looking for loads in your lane today. Want to do that?',
  },
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

// Inline date + time picker for follow-up reminders
function InlineDatetime({ icon, label, date, time, onSaveDate, onSaveTime }:
  { icon: React.ReactNode; label: string; date: string | null; time: string | null
    onSaveDate: (v: string | null) => void; onSaveTime: (v: string | null) => void }) {
  const [editing, setEditing]   = useState(false)
  const [draftDate, setDraftDate] = useState(date ?? '')
  const [draftTime, setDraftTime] = useState(time ?? '')
  const dateRef                 = useRef<HTMLInputElement>(null)

  const activate = () => {
    setDraftDate(date ?? '')
    setDraftTime(time ?? '')
    setEditing(true)
    setTimeout(() => dateRef.current?.showPicker?.(), 50)
  }

  const commit = () => {
    setEditing(false)
    const newDate = draftDate || null
    const newTime = draftTime || null
    if (newDate !== date) onSaveDate(newDate)
    if (newTime !== time) onSaveTime(newTime)
  }

  const cancel = () => {
    setEditing(false)
    setDraftDate(date ?? '')
    setDraftTime(time ?? '')
  }

  const clearTime = (e: React.MouseEvent) => {
    e.stopPropagation()
    onSaveTime(null)
  }

  const fmtTime = (t: string) => {
    const [hStr, mStr] = t.split(':')
    const h = parseInt(hStr, 10)
    const ampm = h >= 12 ? 'PM' : 'AM'
    const h12 = h % 12 || 12
    return `${h12}:${mStr} ${ampm}`
  }

  return (
    <div className='flex items-start gap-2.5'>
      <span className='text-gray-600 mt-0.5 shrink-0'>{icon}</span>
      <div className='flex-1 min-w-0'>
        <p className='text-2xs text-gray-600'>{label}</p>
        {editing ? (
          <div className='flex flex-col gap-1 mt-0.5'>
            <input ref={dateRef} type='date' value={draftDate}
              onChange={e => setDraftDate(e.target.value)}
              onKeyDown={e => { if (e.key === 'Escape') cancel() }}
              className='bg-surface-600 border border-orange-600/50 rounded px-2 py-0.5 text-sm text-gray-100 outline-none w-full' />
            <div className='flex items-center gap-1'>
              <Bell size={10} className='text-gray-600 shrink-0' />
              <input type='time' value={draftTime}
                onChange={e => setDraftTime(e.target.value)}
                onKeyDown={e => { if (e.key === 'Escape') cancel() }}
                className='bg-surface-600 border border-surface-400 rounded px-2 py-0.5 text-sm text-gray-100 outline-none flex-1' />
              <span className='text-2xs text-gray-600'>reminder</span>
            </div>
            <div className='flex gap-1 mt-0.5'>
              <button onClick={commit}
                className='px-2 py-0.5 text-2xs font-medium bg-orange-600 hover:bg-orange-500 text-white rounded transition-colors'>
                Save
              </button>
              <button onClick={cancel}
                className='px-2 py-0.5 text-2xs text-gray-500 hover:text-gray-300 rounded transition-colors'>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className='flex items-center gap-1.5'>
            <button onClick={activate}
              className='text-sm text-left text-gray-300 hover:text-orange-300 transition-colors group'
              title='Click to change date / set reminder time'>
              <span>{date ? fmtDate(date) : <span className='text-gray-600 italic'>Set date</span>}</span>
              <span className='ml-1 opacity-0 group-hover:opacity-60 text-2xs text-orange-500'>[edit]</span>
            </button>
            {time && (
              <span className='flex items-center gap-0.5 text-2xs text-orange-400 bg-orange-900/20 border border-orange-700/30 px-1.5 py-0.5 rounded'
                title={`Reminder set for ${fmtTime(time)}`}>
                <Bell size={9} />
                {fmtTime(time)}
                <button onClick={clearTime} className='ml-0.5 hover:text-red-400 transition-colors' title='Clear reminder time'>
                  <X size={8} />
                </button>
              </span>
            )}
          </div>
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
  const [aiFollowUp, setAiFollowUp]     = useState<string | null>(null)
  const [aiLoading, setAiLoading]       = useState(false)
  const [aiCopied, setAiCopied]         = useState(false)
  const [showScript, setShowScript]     = useState(false)
  const [scriptCopied, setScriptCopied] = useState(false)
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

  const copyScript = (script: CallScript) => {
    const text = [
      script.opener,
      '',
      'Key questions / points:',
      ...script.points.map(p => `- ${p}`),
      '',
      'Close:',
      script.close,
    ].join('\n')
    navigator.clipboard.writeText(text).then(() => {
      setScriptCopied(true)
      setTimeout(() => setScriptCopied(false), 2500)
    }).catch(() => {})
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

  const generateFollowUp = async () => {
    setAiLoading(true)
    setAiFollowUp(null)
    try {
      const msg = await window.api.leads.generateFollowUp({
        name:            lead.name,
        company:         lead.company ?? null,
        status:          lead.status,
        trailerType:     lead.trailer_type ?? null,
        lastContactDate: lead.last_contact_date ?? null,
        contactAttempts: lead.contact_attempt_count ?? 0,
        outreachOutcome: lead.outreach_outcome ?? null,
      })
      setAiFollowUp(msg ?? 'No API key configured. Add your Claude API key in Settings.')
    } catch {
      setAiFollowUp('Failed to generate message. Check your API key in Settings.')
    } finally {
      setAiLoading(false)
    }
  }

  const copyFollowUp = () => {
    if (!aiFollowUp) return
    navigator.clipboard.writeText(aiFollowUp).then(() => {
      setAiCopied(true)
      setTimeout(() => setAiCopied(false), 2000)
    }).catch(() => {})
  }

  const convertToDriver = async () => {
    setConverting(true)
    setConvertedMsg('')
    try {
      const sourceNote = lead.source ? `Source: ${lead.source}` : null
      const combinedNotes = [sourceNote, lead.notes ?? null].filter(Boolean).join('\n\n') || null
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
        notes:             combinedNotes,
      })
      if (driver) {
        // Log the conversion as a note on the new driver record for full audit trail
        const conversionNote = ['Converted from lead.', sourceNote].filter(Boolean).join(' ')
        await window.api.notes.create({ entity_type: 'driver', entity_id: driver.id, content: conversionNote, user_id: null })
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
            {lead.phone && <button onClick={() => (window.api as any).shell.openExternal(`https://voice.google.com/calls?a=nc,${encodeURIComponent(lead.phone)}`)} className='flex items-center gap-1.5 px-2.5 h-7 text-xs font-medium bg-surface-600 hover:bg-surface-500 text-gray-300 rounded-lg transition-colors'><Phone size={11} /> Call</button>}
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
              <p className='text-2xs font-medium text-gray-400 uppercase tracking-wider'>Quick Actions</p>
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
              <div className='w-px h-4 bg-surface-500 self-center mx-0.5' />
              <button
                onClick={generateFollowUp}
                disabled={aiLoading}
                title='Generate an AI-written follow-up message for this lead'
                className='flex items-center gap-1 h-6 px-2 text-2xs font-medium bg-purple-900/20 hover:bg-purple-900/40 border border-purple-800/30 hover:border-purple-700/50 text-purple-300 disabled:opacity-40 disabled:cursor-not-allowed rounded transition-colors'
              >
                <Sparkles size={10} /> {aiLoading ? 'Generating…' : 'AI Follow-Up'}
              </button>
            </div>
            {convertedMsg && (
              <p className='mt-1.5 text-2xs text-emerald-400'>{convertedMsg}</p>
            )}
            {/* AI Follow-Up output */}
            {aiFollowUp && (
              <div className='mt-3 rounded-lg border border-purple-800/30 bg-purple-900/10 p-3'>
                <div className='flex items-center justify-between mb-2'>
                  <div className='flex items-center gap-1.5'>
                    <Sparkles size={10} className='text-purple-400' />
                    <span className='text-2xs font-medium text-purple-300 uppercase tracking-wider'>AI Follow-Up Draft</span>
                  </div>
                  <div className='flex items-center gap-1'>
                    <button
                      onClick={copyFollowUp}
                      className={`flex items-center gap-1 h-5 px-1.5 text-2xs rounded transition-colors ${aiCopied ? 'bg-green-700 text-white' : 'bg-surface-600 hover:bg-surface-500 text-gray-400 hover:text-gray-200'}`}
                    >
                      {aiCopied ? <Check size={9} /> : <Copy size={9} />}
                      {aiCopied ? 'Copied' : 'Copy'}
                    </button>
                    <button onClick={() => setAiFollowUp(null)} className='h-5 px-1 text-2xs text-gray-600 hover:text-gray-400 transition-colors'>
                      <X size={9} />
                    </button>
                  </div>
                </div>
                <p className='text-xs text-gray-300 leading-relaxed whitespace-pre-wrap'>{aiFollowUp}</p>
                <p className='text-2xs text-gray-600 mt-2'>Review and personalize before sending.</p>
              </div>
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

          {/* Call Script */}
          {(() => {
            const script = CALL_SCRIPTS[lead.status]
            if (!script) return null
            return (
              <div className='mx-5 mt-4 rounded-xl border border-surface-500/60 overflow-hidden'>
                <button
                  onClick={() => setShowScript(v => !v)}
                  className='w-full flex items-center justify-between px-3 py-2.5 bg-surface-700/60 hover:bg-surface-700 transition-colors'
                >
                  <div className='flex items-center gap-2'>
                    <BookOpen size={12} className='text-orange-400 shrink-0' />
                    <span className='text-xs font-medium text-gray-300'>Call Script — {script.title}</span>
                  </div>
                  <ChevronDown size={12} className={`text-gray-600 transition-transform ${showScript ? 'rotate-180' : ''}`} />
                </button>
                {showScript && (
                  <div className='px-3 pb-3 pt-2 bg-surface-700/30 space-y-3'>
                    <div>
                      <p className='text-2xs font-semibold text-gray-500 uppercase tracking-wider mb-1'>Opener</p>
                      <p className='text-xs text-gray-300 leading-relaxed'>{script.opener}</p>
                    </div>
                    <div>
                      <p className='text-2xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5'>Key Points</p>
                      <ul className='space-y-1'>
                        {script.points.map((pt, i) => (
                          <li key={i} className='flex items-start gap-2 text-xs text-gray-400 leading-relaxed'>
                            <span className='text-gray-600 shrink-0 mt-0.5'>—</span>
                            {pt}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className='text-2xs font-semibold text-gray-500 uppercase tracking-wider mb-1'>Close</p>
                      <p className='text-xs text-gray-300 leading-relaxed'>{script.close}</p>
                    </div>
                    <button
                      onClick={() => copyScript(script)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-2xs font-medium rounded-lg transition-colors ${scriptCopied ? 'bg-green-700 text-white' : 'bg-surface-600 hover:bg-surface-500 text-gray-300'}`}
                    >
                      {scriptCopied ? <Check size={11} /> : <Copy size={11} />}
                      {scriptCopied ? 'Copied' : 'Copy full script'}
                    </button>
                  </div>
                )}
              </div>
            )
          })()}

          {/* Contact details */}
          <div className='px-5 py-4 border-b border-surface-600'>
            <p className='text-2xs font-medium text-gray-400 uppercase tracking-wider mb-3'>Contact</p>
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
              {lead.trailer_length && (
                <Row icon={<Truck size={12} />} label='Trailer Length' value={lead.trailer_length} />
              )}
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
              <InlineDatetime icon={<Calendar size={12} />} label='Follow-Up'
                date={lead.follow_up_date} time={lead.follow_up_time ?? null}
                onSaveDate={v => saveField('follow_up_date', v)}
                onSaveTime={v => saveField('follow_up_time', v)} />
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

          {/* Nurture Sequence */}
          <div className='px-5 py-4 border-b border-surface-600'>
            <p className='text-2xs font-medium text-gray-400 uppercase tracking-wider mb-3'>Nurture Sequence</p>
            <LeadNurturePanel lead={lead} onUpdate={onUpdate} />
          </div>

          {/* Notes */}
          <div className='px-5 py-4 border-b border-surface-600'>
            <div className='flex items-center justify-between mb-3'>
              <p className='text-2xs font-medium text-gray-400 uppercase tracking-wider'>Notes</p>
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
              <p className='text-2xs font-medium text-gray-400 uppercase tracking-wider'>Call Log</p>
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
              <p className='text-2xs font-medium text-gray-400 uppercase tracking-wider flex-1'>Score Breakdown</p>
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
