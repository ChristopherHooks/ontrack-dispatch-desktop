import { useState, useEffect } from 'react'
import { X, Phone, Mail, MapPin, Truck, Calendar, Tag, Edit2, Trash2,
         Plus, PhoneCall, ChevronDown, AlertTriangle } from 'lucide-react'
import type { Lead, LeadStatus, Note } from '../../types/models'
import { LeadScoreBadge } from './LeadScoreBadge'
import { computeLeadScore } from '../../lib/leadScore'
import { STATUS_STYLES, PRIORITY_STYLES, STATUSES } from './constants'

interface Props {
  lead:           Lead
  onClose:        () => void
  onEdit:         (l: Lead) => void
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

export function LeadDrawer({ lead, onClose, onEdit, onStatusChange, onDelete }: Props) {
  const [notes, setNotes]           = useState<Note[]>([])
  const [calls, setCalls]           = useState<CallEntry[]>([])
  const [noteText, setNoteText]     = useState('')
  const [addingNote, setAddingNote] = useState(false)
  const [addingCall, setAddingCall] = useState(false)
  const [callForm, setCallForm]     = useState({ type: 'Call', outcome: 'Answered', duration: '', summary: '' })
  const [showScore, setShowScore]   = useState(false)
  const [confirmDel, setConfirmDel] = useState(false)
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
              <span className={`text-2xs px-2 py-0.5 rounded-full border ${STATUS_STYLES[lead.status]}`}>{lead.status}</span>
              <span className={`text-2xs px-1.5 py-0.5 rounded-full ${PRIORITY_STYLES[lead.priority]}`}>{lead.priority}</span>
            </div>
          </div>
          <button onClick={onClose} className='p-1.5 rounded-lg hover:bg-surface-600 text-gray-500 hover:text-gray-300 ml-3 shrink-0'><X size={16} /></button>
        </div>

        {/* Scrollable body */}
        <div className='flex-1 overflow-y-auto'>

          {/* Action bar */}
          <div className='flex items-center gap-1.5 px-5 py-3 border-b border-surface-600 flex-wrap shrink-0'>
            <button onClick={() => onEdit(lead)} className='flex items-center gap-1.5 px-2.5 h-7 text-xs font-medium bg-surface-600 hover:bg-surface-500 text-gray-300 rounded-lg transition-colors'><Edit2 size={11} /> Edit</button>
            {lead.phone && <a href={`tel:${lead.phone}`} className='flex items-center gap-1.5 px-2.5 h-7 text-xs font-medium bg-surface-600 hover:bg-surface-500 text-gray-300 rounded-lg transition-colors'><Phone size={11} /> Call</a>}
            {STATUSES.filter(s => s !== lead.status).slice(0, 3).map(s => (
              <button key={s} onClick={() => onStatusChange(lead, s)} className='px-2 h-7 text-2xs text-gray-600 hover:text-orange-400 rounded hover:bg-surface-600 transition-colors'>→ {s}</button>
            ))}
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

          {/* Overdue banner */}
          {overdue && (
            <div className='mx-5 mt-4 flex items-center gap-2 px-3 py-2 rounded-lg bg-orange-900/20 border border-orange-700/30'>
              <AlertTriangle size={12} className='text-orange-400 shrink-0' />
              <p className='text-xs text-orange-300'>Follow-up overdue since <strong>{fmtDate(lead.follow_up_date)}</strong></p>
            </div>
          )}

          {/* Contact details */}
          <div className='px-5 py-4 border-b border-surface-600'>
            <p className='text-2xs font-medium text-gray-600 uppercase tracking-wider mb-3'>Contact</p>
            <div className='grid grid-cols-2 gap-3'>
              {lead.phone && <Row icon={<Phone size={12} />} label='Phone' value={lead.phone} />}
              {lead.email && <Row icon={<Mail size={12} />} label='Email' value={lead.email} />}
              {location   && <Row icon={<MapPin size={12} />} label='Location' value={location} />}
              {lead.trailer_type && <Row icon={<Truck size={12} />} label='Trailer' value={lead.trailer_type} />}
              {lead.mc_number    && <Row icon={<Tag size={12} />} label='MC Number' value={lead.mc_number} mono />}
              <Row icon={<Calendar size={12} />} label='Authority Age' value={authAge(lead.authority_date)} />
              {lead.source       && <Row icon={<Tag size={12} />} label='Source' value={lead.source} />}
              {lead.follow_up_date && <Row icon={<Calendar size={12} />} label='Follow-Up' value={fmtDate(lead.follow_up_date)} />}
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
