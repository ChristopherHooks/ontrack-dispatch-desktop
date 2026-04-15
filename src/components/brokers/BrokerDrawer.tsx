import { useState, useEffect } from 'react'
import { X, Edit2, Trash2, Plus, Phone, Mail, ArrowRight, Pencil, Check, MessageSquare, BarChart2, MapPin } from 'lucide-react'
import type { Broker, BrokerFlag, BrokerRating, Load, Note, Invoice } from '../../types/models'
import { FLAG_STYLES, BROKER_FLAGS } from './constants'
import { LOAD_STATUS_STYLES } from '../loads/constants'
import { openSaferMc } from '../../lib/saferUrl'

interface Props {
  broker: Broker
  onClose: () => void
  onEdit: (b: Broker) => void
  onDelete: (b: Broker) => void
  onFlagChange: (b: Broker, flag: BrokerFlag) => void
}

const fmt = (d: string | null) => { if (!d) return '---'; const [y,m,day] = d.split('-'); return `${m}/${day}/${y}` }
const fmtDT = (dt: string) => new Date(dt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

function Row({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div>
      <p className='text-2xs text-gray-600'>{label}</p>
      <p className={`text-sm mt-0.5 ${accent ?? 'text-gray-300'}`}>{value}</p>
    </div>
  )
}
function Sec({ title }: { title: string }) {
  return <p className='text-2xs font-medium text-gray-400 uppercase tracking-wider mb-3'>{title}</p>
}

const INTEL_RATING_STYLE: Record<BrokerRating, string> = {
  Preferred: 'bg-green-500/15 text-green-400 border-green-500/25',
  Strong:    'bg-green-500/10 text-green-400 border-green-500/20',
  Neutral:   'bg-gray-500/10 text-gray-400 border-gray-500/20',
  Caution:   'bg-yellow-500/15 text-yellow-400 border-yellow-500/25',
  Avoid:     'bg-red-500/15 text-red-400 border-red-500/25',
}

export function BrokerDrawer({ broker, onClose, onEdit, onDelete, onFlagChange }: Props) {
  const [loads,         setLoads]         = useState<Load[]>([])
  const [notes,         setNotes]         = useState<Note[]>([])
  const [noteText,      setNoteText]      = useState('')
  const [addNote,       setAddNote]       = useState(false)
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null)
  const [editNoteText,  setEditNoteText]  = useState('')
  const [confirmDel,    setConf]          = useState(false)
  const [intelRating,   setIntelRating]   = useState<BrokerRating>('Neutral')
  const [payGrade,      setPayGrade]      = useState<string | null>(null)
  const [avgDaysToPay,  setAvgDaysToPay]  = useState<number | null>(null)
  const [invoiceCount,  setInvoiceCount]  = useState<number>(0)
  // Local state for inline-editable authority fields so React re-renders on change
  const [localNewAuth,   setLocalNewAuth]  = useState(broker.new_authority)
  const [localMinDays,   setLocalMinDays]  = useState(broker.min_authority_days)
  // Preferred lanes
  const [localLanes,     setLocalLanes]    = useState<string[]>(() =>
    broker.preferred_lanes ? broker.preferred_lanes.split(',').map(s => s.trim()).filter(Boolean) : []
  )
  const [laneInput,      setLaneInput]     = useState('')
  const [addingLane,     setAddingLane]    = useState(false)
  type CallLogEntry = { id: number; broker_id: number; note: string; created_at: string }
  const [callLog,        setCallLog]       = useState<CallLogEntry[]>([])
  const [callNote,       setCallNote]      = useState('')
  const [addingCall,     setAddingCall]    = useState(false)
  const [brokerInvoices, setBrokerInvoices] = useState<Invoice[]>([])
  const [creditOpen,     setCreditOpen]    = useState(false)

  useEffect(() => {
    setLocalNewAuth(broker.new_authority)
    setLocalMinDays(broker.min_authority_days)
    Promise.all([
      window.api.loads.list(),
      window.api.notes.list('broker', broker.id),
      window.api.intel.allBrokers(),
      window.api.brokerCallLog.list(broker.id),
      window.api.invoices.list(),
    ]).then(([allLoads, notesData, intelData, logData, allInvs]) => {
      setLoads(allLoads.filter(l => l.broker_id === broker.id))
      setNotes(notesData)
      setCallLog(logData)
      setBrokerInvoices((allInvs as Invoice[]).filter(i => i.broker_id === broker.id))
      const row = intelData.find(r => r.broker_id === broker.id)
      if (row) {
        setIntelRating(row.rating)
        setPayGrade(row.payment_grade ?? null)
        setAvgDaysToPay(row.avg_days_to_pay ?? null)
        setInvoiceCount(row.invoice_count ?? 0)
      }
    })
  }, [broker.id])

  const saveNote = async () => {
    if (!noteText.trim()) return
    const n = await window.api.notes.create({ entity_type: 'broker', entity_id: broker.id, content: noteText.trim(), user_id: null })
    setNotes(p => [n, ...p]); setNoteText(''); setAddNote(false)
  }
  const startEditNote = (n: Note) => { setEditingNoteId(n.id); setEditNoteText(n.content) }
  const cancelEditNote = () => { setEditingNoteId(null); setEditNoteText('') }
  const saveEditNote = async (id: number) => {
    if (!editNoteText.trim()) return
    const updated = await window.api.notes.update(id, editNoteText.trim())
    if (updated) setNotes(p => p.map(n => n.id === id ? updated : n))
    setEditingNoteId(null); setEditNoteText('')
  }
  const delNote = async (id: number) => { await window.api.notes.delete(id); setNotes(p => p.filter(n => n.id !== id)) }

  const saveCallLog = async () => {
    if (!callNote.trim()) return
    const entry = await window.api.brokerCallLog.create({ broker_id: broker.id, note: callNote.trim() })
    setCallLog(p => [entry, ...p]); setCallNote(''); setAddingCall(false)
  }
  const delCallLog = async (id: number) => {
    await window.api.brokerCallLog.delete(id)
    setCallLog(p => p.filter(e => e.id !== id))
  }

  const saveLanes = async (lanes: string[]) => {
    const value = lanes.join(', ') || null
    await window.api.brokers.update(broker.id, { preferred_lanes: value })
    setLocalLanes(lanes)
  }
  const addLane = async () => {
    const trimmed = laneInput.trim().toUpperCase()
    if (!trimmed || localLanes.includes(trimmed)) { setLaneInput(''); setAddingLane(false); return }
    const next = [...localLanes, trimmed]
    await saveLanes(next)
    setLaneInput(''); setAddingLane(false)
  }
  const removeLane = async (lane: string) => {
    await saveLanes(localLanes.filter(l => l !== lane))
  }

  const completedLoads = loads.filter(l => ['Delivered', 'Invoiced', 'Paid'].includes(l.status))
  const totalRevenue = completedLoads.reduce((s, l) => s + (l.rate ?? 0), 0)
  const rpmLoads = completedLoads.filter(l => l.miles != null && l.miles > 0 && l.rate != null)
  const avgRpm = rpmLoads.length > 0 ? rpmLoads.reduce((s, l) => s + l.rate! / l.miles!, 0) / rpmLoads.length : 0
  const slowPayDiff = broker.avg_days_pay != null ? broker.avg_days_pay - broker.payment_terms : null
  const payScore = slowPayDiff == null ? null : slowPayDiff <= 0 ? 'On Time' : slowPayDiff <= 7 ? 'Slightly Late' : slowPayDiff <= 14 ? 'Slow' : 'Very Slow'
  const payColor = payScore === 'On Time' ? 'text-green-400' : payScore === 'Slightly Late' ? 'text-yellow-400' : payScore ? 'text-red-400' : 'text-gray-600'

  return (
    <div className='fixed inset-0 z-50 flex'>
      <div className='flex-1 bg-black/50 backdrop-blur-sm' onClick={onClose} />
      <div className='w-[500px] bg-surface-800 border-l border-surface-400 shadow-2xl flex flex-col overflow-hidden animate-slide-in'>
        {/* Header */}
        <div className='flex items-start justify-between px-5 pt-5 pb-4 border-b border-surface-500 shrink-0'>
          <div className='flex-1 min-w-0'>
            <div className='flex items-center gap-2 mb-1 flex-wrap'>
              <h2 className='text-lg font-semibold text-gray-100 truncate'>{broker.name}</h2>
              {broker.contact_type === 'shipper' && (
                <span className='text-2xs px-2 py-0.5 rounded-full border border-violet-700/40 text-violet-400 font-medium'>shipper</span>
              )}
              {broker.flag !== 'None' && (
                <span className={`text-2xs px-2 py-0.5 rounded-full border ${FLAG_STYLES[broker.flag]}`}>{broker.flag}</span>
              )}
            </div>
            {broker.mc_number && (
              <button onClick={e => openSaferMc(broker.mc_number, e)}
                className='text-sm text-gray-500 font-mono hover:text-orange-400 hover:underline transition-colors cursor-pointer'
                title='View on FMCSA SAFER'>{broker.mc_number}</button>
            )}
          </div>
          <button onClick={onClose} className='p-1.5 rounded-lg hover:bg-surface-600 text-gray-500 hover:text-gray-300 ml-3 shrink-0'><X size={16} /></button>
        </div>
        <div className='flex-1 overflow-y-auto'>
          {/* Action bar */}
          <div className='flex items-center gap-1.5 px-5 py-3 border-b border-surface-600 flex-wrap shrink-0'>
            <button onClick={() => onEdit(broker)} className='flex items-center gap-1.5 px-2.5 h-7 text-xs font-medium bg-surface-600 hover:bg-surface-500 text-gray-300 rounded-lg transition-colors'><Edit2 size={11} />Edit</button>
            {broker.phone && <a href={`tel:${broker.phone}`} className='flex items-center gap-1.5 px-2.5 h-7 text-xs font-medium bg-surface-600 hover:bg-surface-500 text-gray-300 rounded-lg transition-colors'><Phone size={11} />Call</a>}
            {broker.email && <a href={`mailto:${broker.email}`} className='flex items-center gap-1.5 px-2.5 h-7 text-xs font-medium bg-surface-600 hover:bg-surface-500 text-gray-300 rounded-lg transition-colors'><Mail size={11} />Email</a>}
            <div className='flex-1' />
            {!confirmDel
              ? <button onClick={() => setConf(true)} className='p-1.5 rounded hover:bg-surface-600 text-gray-600 hover:text-red-400 transition-colors'><Trash2 size={13} /></button>
              : <div className='flex items-center gap-1'>
                  <span className='text-2xs text-red-400'>Delete?</span>
                  <button onClick={() => onDelete(broker)} className='text-2xs px-2 py-0.5 rounded bg-red-900/40 text-red-400 hover:bg-red-900/60'>Yes</button>
                  <button onClick={() => setConf(false)} className='text-2xs px-2 py-0.5 rounded bg-surface-600 text-gray-400'>No</button>
                </div>
            }
          </div>
          {/* Contact & Payment */}
          <div className='px-5 py-4 border-b border-surface-600'>
            <Sec title='Contact & Payment' />
            <div className='grid grid-cols-2 gap-3'>
              <Row label='Phone' value={broker.phone ?? '---'} />
              <Row label='Email' value={broker.email ?? '---'} />
              <Row label='Payment Terms' value={broker.payment_terms ? `Net ${broker.payment_terms} days` : '---'} />
              <Row label='Credit Rating' value={broker.credit_rating ?? 'Unknown'} />
              <Row label='Avg Days to Pay' value={broker.avg_days_pay != null ? `${broker.avg_days_pay} days` : '---'} />
              {payScore && <div><p className='text-2xs text-gray-600'>Payer Score</p><p className={`text-sm mt-0.5 font-semibold ${payColor}`}>{payScore}</p></div>}
              {payGrade && (
                <div>
                  <p className='text-2xs text-gray-600 mb-1'>Payment Grade</p>
                  <div className='flex items-center gap-2'>
                    <span className={`text-sm font-bold px-2.5 py-0.5 rounded-lg border ${
                      payGrade === 'A' ? 'bg-green-500/15 text-green-400 border-green-500/30' :
                      payGrade === 'B' ? 'bg-green-500/10 text-green-300 border-green-500/20' :
                      payGrade === 'C' ? 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30' :
                      payGrade === 'D' ? 'bg-orange-500/15 text-orange-400 border-orange-500/30' :
                                         'bg-red-500/15 text-red-400 border-red-500/30'
                    }`}>{payGrade}</span>
                    <span className='text-2xs text-gray-600'>
                      {avgDaysToPay != null ? `avg ${Math.round(avgDaysToPay)}d` : ''}{invoiceCount > 0 ? ` · ${invoiceCount} inv` : ''}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
          {/* Credit Quality Panel */}
          {(() => {
            const outstanding = brokerInvoices.filter(i => ['Sent','Overdue'].includes(i.status))
            const outstandingTotal = outstanding.reduce((s,i) => s + (i.dispatch_fee ?? 0), 0)
            const paidInvs = brokerInvoices.filter(i => i.status === 'Paid' && i.sent_date && i.paid_date)
            const avgActualDays = paidInvs.length > 0
              ? paidInvs.reduce((s, i) => {
                  const d = (new Date(i.paid_date!).getTime() - new Date(i.sent_date!).getTime()) / 86400000
                  return s + d
                }, 0) / paidInvs.length
              : null
            const overLimitWarning = broker.credit_limit != null && outstandingTotal > broker.credit_limit
            return (
              <div className='px-5 py-3 border-b border-surface-600'>
                <button onClick={() => setCreditOpen(v => !v)} className='flex items-center justify-between w-full'>
                  <div className='flex items-center gap-2'>
                    <BarChart2 size={12} className='text-gray-600'/>
                    <span className='text-2xs font-medium text-gray-400 uppercase tracking-wider'>Credit Quality</span>
                    {overLimitWarning && <span className='text-2xs text-red-400 font-semibold'>Over Limit</span>}
                  </div>
                  <span className='text-gray-600 text-sm'>{creditOpen ? '−' : '+'}</span>
                </button>
                {creditOpen && (
                  <div className='mt-3 grid grid-cols-2 gap-3'>
                    <div>
                      <p className='text-2xs text-gray-600'>Outstanding Balance</p>
                      <p className={`text-sm font-mono font-semibold mt-0.5 ${outstandingTotal > 0 ? 'text-yellow-400' : 'text-gray-700'}`}>
                        ${outstandingTotal.toFixed(2)}
                      </p>
                      <p className='text-2xs text-gray-700 mt-0.5'>{outstanding.length} invoice{outstanding.length !== 1 ? 's' : ''} open</p>
                    </div>
                    <div>
                      <p className='text-2xs text-gray-600'>Credit Limit</p>
                      <p className={`text-sm font-mono font-semibold mt-0.5 ${overLimitWarning ? 'text-red-400' : broker.credit_limit != null ? 'text-gray-300' : 'text-gray-700'}`}>
                        {broker.credit_limit != null ? `$${broker.credit_limit.toLocaleString()}` : 'Not set'}
                      </p>
                      {overLimitWarning && <p className='text-2xs text-red-500 mt-0.5'>Limit exceeded</p>}
                    </div>
                    <div>
                      <p className='text-2xs text-gray-600'>Stated Terms</p>
                      <p className='text-sm text-gray-300 mt-0.5'>Net {broker.payment_terms}d</p>
                    </div>
                    <div>
                      <p className='text-2xs text-gray-600'>Actual Avg Pay</p>
                      <p className={`text-sm font-semibold mt-0.5 ${
                        avgActualDays == null ? 'text-gray-700' :
                        avgActualDays <= broker.payment_terms ? 'text-green-400' :
                        avgActualDays <= broker.payment_terms + 7 ? 'text-yellow-400' : 'text-red-400'
                      }`}>
                        {avgActualDays != null ? `${Math.round(avgActualDays)}d` : '—'}
                      </p>
                      {avgActualDays != null && paidInvs.length > 0 && (
                        <p className='text-2xs text-gray-700 mt-0.5'>{paidInvs.length} paid invoices</p>
                      )}
                    </div>
                    {outstanding.length > 0 && (
                      <div className='col-span-2'>
                        <p className='text-2xs text-gray-600 mb-1.5'>Open Invoices</p>
                        <div className='space-y-1'>
                          {outstanding.map(i => {
                            const daysOut = i.sent_date
                              ? Math.floor((Date.now() - new Date(i.sent_date).getTime()) / 86400000)
                              : null
                            return (
                              <div key={i.id} className='flex items-center justify-between text-2xs'>
                                <span className='text-gray-500 font-mono'>{i.invoice_number}</span>
                                <span className={`px-1.5 py-0.5 rounded border text-2xs ${i.status === 'Overdue' ? 'bg-red-900/20 border-red-700/30 text-red-400' : 'bg-surface-600 border-surface-500 text-gray-500'}`}>{i.status}</span>
                                <span className='text-gray-600'>${(i.dispatch_fee ?? 0).toFixed(2)}</span>
                                <span className='text-gray-700'>{daysOut != null ? `${daysOut}d` : '—'}</span>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })()}
          {/* New Authority Policy */}
          <div className='px-5 py-4 border-b border-surface-600'>
            <Sec title='New Authority Policy' />
            <div className='flex items-center gap-3 flex-wrap'>
              <div>
                <p className='text-2xs text-gray-600 mb-1'>Works With New Auth</p>
                <select
                  value={localNewAuth === 1 ? 'yes' : localNewAuth === 2 ? 'unknown' : 'no'}
                  onChange={async e => {
                    const val = e.target.value === 'yes' ? 1 : e.target.value === 'unknown' ? 2 : 0
                    const minDays = val === 1 ? localMinDays : null
                    await window.api.brokers.update(broker.id, { new_authority: val, min_authority_days: minDays })
                    setLocalNewAuth(val)
                    if (val !== 1) setLocalMinDays(null)
                  }}
                  className='h-7 px-2 text-xs bg-surface-600 border border-surface-400 rounded-lg text-gray-300 focus:outline-none focus:border-orange-600/50'>
                  <option value='unknown'>Unknown</option>
                  <option value='yes'>Yes</option>
                  <option value='no'>No</option>
                </select>
              </div>
              {localNewAuth === 1 && (
                <div>
                  <p className='text-2xs text-gray-600 mb-1'>Min Authority Age</p>
                  <select
                    value={localMinDays ?? ''}
                    onChange={async e => {
                      const val = e.target.value ? parseInt(e.target.value) : null
                      await window.api.brokers.update(broker.id, { min_authority_days: val })
                      setLocalMinDays(val)
                    }}
                    className='h-7 px-2 text-xs bg-surface-600 border border-surface-400 rounded-lg text-gray-300 focus:outline-none focus:border-orange-600/50'>
                    <option value=''>Any age OK</option>
                    <option value='30'>30+ days</option>
                    <option value='60'>60+ days</option>
                    <option value='90'>90+ days</option>
                    <option value='180'>180+ days</option>
                  </select>
                </div>
              )}
              {localNewAuth === 0 && (
                <p className='text-2xs text-gray-600 italic self-end pb-1'>This broker does not load new authorities.</p>
              )}
              {localNewAuth === 2 && (
                <p className='text-2xs text-gray-600 italic self-end pb-1'>New authority policy not confirmed for this broker.</p>
              )}
            </div>
          </div>
          {/* Flag */}
          <div className='px-5 py-4 border-b border-surface-600'>
            <Sec title='Relationship Flag' />
            <div className='flex flex-wrap gap-1.5'>
              {BROKER_FLAGS.map(f => (
                <button key={f} onClick={() => onFlagChange(broker, f)}
                  className={`text-2xs px-2.5 py-1 rounded-full border transition-all ${broker.flag === f ? FLAG_STYLES[f] + ' ring-1 ring-offset-1 ring-offset-surface-800 ring-current' : 'bg-surface-600 border-surface-400 text-gray-600 hover:text-gray-300'}`}>
                  {f}
                </button>
              ))}
            </div>
          </div>
          {/* Performance */}
          <div className='px-5 py-4 border-b border-surface-600'>
            <div className='flex items-center justify-between mb-3'>
              <p className='text-2xs font-medium text-gray-400 uppercase tracking-wider'>Performance</p>
              <span className={`text-2xs px-2 py-0.5 rounded-full border font-semibold ${INTEL_RATING_STYLE[intelRating]}`}>
                {intelRating}
              </span>
            </div>
            <div className='grid grid-cols-2 gap-3'>
              <div><p className='text-2xs text-gray-600'>Total Loads</p><p className='text-sm text-gray-200 mt-0.5 font-semibold'>{loads.length}</p></div>
              <div><p className='text-2xs text-gray-600'>Completed</p><p className='text-sm text-gray-200 mt-0.5 font-semibold'>{completedLoads.length}</p></div>
              <div><p className='text-2xs text-gray-600'>Total Revenue</p><p className='text-sm text-green-400 mt-0.5 font-semibold font-mono'>{totalRevenue > 0 ? `$${totalRevenue.toLocaleString()}` : '---'}</p></div>
              <div><p className='text-2xs text-gray-600'>Avg RPM</p><p className='text-sm text-gray-200 mt-0.5 font-mono font-semibold'>{avgRpm > 0 ? `$${avgRpm.toFixed(2)}/mi` : '---'}</p></div>
            </div>
          </div>
          {/* Preferred Lanes */}
          <div className='px-5 py-4 border-b border-surface-600'>
            <div className='flex items-center justify-between mb-3'>
              <div className='flex items-center gap-2'>
                <MapPin size={11} className='text-gray-600' />
                <p className='text-2xs font-medium text-gray-400 uppercase tracking-wider'>Preferred Lanes</p>
              </div>
              {!addingLane && (
                <button onClick={() => setAddingLane(true)} className='flex items-center gap-1 text-2xs text-gray-600 hover:text-orange-400 transition-colors'>
                  <Plus size={10} />Add Lane
                </button>
              )}
            </div>
            {localLanes.length === 0 && !addingLane && (
              <p className='text-2xs text-gray-700 italic'>No preferred lanes recorded. Add lanes this broker regularly covers (e.g. TX-FL).</p>
            )}
            {localLanes.length > 0 && (
              <div className='flex flex-wrap gap-1.5 mb-2'>
                {localLanes.map(lane => (
                  <span key={lane} className='group/lane flex items-center gap-1 text-2xs px-2 py-0.5 rounded-full border bg-orange-900/20 border-orange-700/30 text-orange-300'>
                    {lane}
                    <button onClick={() => removeLane(lane)} className='opacity-0 group-hover/lane:opacity-100 text-orange-500 hover:text-red-400 transition-all ml-0.5'>
                      <X size={9} />
                    </button>
                  </span>
                ))}
              </div>
            )}
            {addingLane && (
              <div className='flex items-center gap-2 mt-1'>
                <input
                  autoFocus
                  value={laneInput}
                  onChange={e => setLaneInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') addLane(); if (e.key === 'Escape') { setAddingLane(false); setLaneInput('') } }}
                  placeholder='e.g. TX-FL or Chicago-Atlanta'
                  className='flex-1 h-7 px-2 text-xs bg-surface-600 border border-surface-400 rounded-lg text-gray-200 placeholder-gray-600 focus:outline-none focus:border-orange-600/60'
                />
                <button onClick={addLane} className='flex items-center gap-1 px-2 h-7 text-2xs font-medium bg-orange-600 hover:bg-orange-500 text-white rounded-lg transition-colors'>
                  <Check size={10} />Add
                </button>
                <button onClick={() => { setAddingLane(false); setLaneInput('') }} className='text-2xs text-gray-600 hover:text-gray-300 transition-colors'>Cancel</button>
              </div>
            )}
          </div>
          {/* Load History */}
          <div className='px-5 py-4 border-b border-surface-600'>
            <Sec title={`Load History (${loads.length})`} />
            {loads.length === 0
              ? <p className='text-2xs text-gray-700 italic'>No loads with this broker yet.</p>
              : <div className='space-y-1.5 max-h-48 overflow-y-auto pr-1'>
                  {loads.slice(0, 12).map(l => {
                    const origin = [l.origin_city, l.origin_state].filter(Boolean).join(', ') || '---'
                    const dest = [l.dest_city, l.dest_state].filter(Boolean).join(', ') || '---'
                    const rpm = l.rate && l.miles && l.miles > 0 ? (l.rate / l.miles).toFixed(2) : null
                    return (
                      <div key={l.id} className='flex items-center gap-2 px-2.5 py-1.5 bg-surface-700 rounded-lg'>
                        <span className='text-2xs font-mono text-gray-500 w-16 shrink-0 truncate'>{l.load_id ?? `#${l.id}`}</span>
                        <span className='text-2xs text-gray-400 flex-1 truncate'>{origin}</span>
                        <ArrowRight size={10} className='text-gray-600 shrink-0' />
                        <span className='text-2xs text-gray-400 flex-1 truncate'>{dest}</span>
                        {rpm && <span className='text-2xs font-mono text-gray-500 shrink-0'>${rpm}</span>}
                        <span className={`text-2xs px-1.5 py-0.5 rounded-full border shrink-0 ${LOAD_STATUS_STYLES[l.status]}`}>{l.status}</span>
                      </div>
                    )
                  })}
                  {loads.length > 12 && <p className='text-2xs text-gray-700 text-center pt-1'>+{loads.length - 12} more</p>}
                </div>
            }
          </div>
          {/* Contact Log */}
          <div className='px-5 py-4 border-b border-surface-600'>
            <div className='flex items-center justify-between mb-3'>
              <Sec title='Contact Log' />
              <button onClick={() => setAddingCall(v => !v)} className='flex items-center gap-1 text-2xs text-gray-600 hover:text-orange-400 transition-colors mb-3'><Plus size={10} />Log Contact</button>
            </div>
            {addingCall && (
              <div className='mb-3'>
                <input
                  value={callNote}
                  onChange={e => setCallNote(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') saveCallLog() }}
                  placeholder='e.g. Called about TX-FL corridor, offered $2.60/mi — follow up Fri'
                  className='w-full h-8 px-2.5 text-xs bg-surface-600 border border-surface-400 rounded-lg text-gray-200 placeholder-gray-600 focus:outline-none focus:border-orange-600/60'
                />
                <div className='flex gap-2 mt-1.5'>
                  <button onClick={saveCallLog} className='px-3 py-1 text-2xs font-medium bg-orange-600 hover:bg-orange-500 text-white rounded-lg'>Save</button>
                  <button onClick={() => { setAddingCall(false); setCallNote('') }} className='px-3 py-1 text-2xs text-gray-500 hover:text-gray-300 rounded-lg'>Cancel</button>
                </div>
              </div>
            )}
            {callLog.length === 0
              ? <p className='text-2xs text-gray-700 italic'>No contact history yet. Log calls, negotiations, and follow-ups here.</p>
              : callLog.map(e => (
                <div key={e.id} className='group/cl flex items-start gap-2 py-2 border-b border-surface-600 last:border-0'>
                  <MessageSquare size={10} className='text-gray-600 mt-0.5 shrink-0' />
                  <div className='flex-1 min-w-0'>
                    <p className='text-xs text-gray-300'>{e.note}</p>
                    <p className='text-2xs text-gray-700 mt-0.5'>{fmtDT(e.created_at)}</p>
                  </div>
                  <button onClick={() => delCallLog(e.id)} className='opacity-0 group-hover/cl:opacity-100 p-1 rounded hover:bg-surface-600 text-gray-600 hover:text-red-400 transition-all'><X size={10} /></button>
                </div>
              ))
            }
          </div>

          {/* Notes */}
          <div className='px-5 py-4'>
            <div className='flex items-center justify-between mb-3'>
              <Sec title='Notes' />
              <button onClick={() => setAddNote(v => !v)} className='flex items-center gap-1 text-2xs text-gray-600 hover:text-orange-400 transition-colors mb-3'><Plus size={10} />Add</button>
            </div>
            {addNote && (
              <div className='mb-3'>
                <textarea value={noteText} onChange={e => setNoteText(e.target.value)} rows={3}
                  className='w-full bg-surface-600 border border-surface-400 rounded-lg px-3 py-2 text-sm text-gray-200 resize-none focus:outline-none focus:border-orange-600/50 placeholder-gray-600'
                  placeholder='Add a note...' />
                <div className='flex gap-2 mt-1.5'>
                  <button onClick={saveNote} className='px-3 py-1 text-2xs font-medium bg-orange-600 hover:bg-orange-500 text-white rounded-lg'>Save</button>
                  <button onClick={() => { setAddNote(false); setNoteText('') }} className='px-3 py-1 text-2xs text-gray-500 hover:text-gray-300 rounded-lg'>Cancel</button>
                </div>
              </div>
            )}
            {notes.length === 0
              ? <p className='text-2xs text-gray-700 italic'>No notes yet.</p>
              : notes.map(n => (
                <div key={n.id} className='group/note py-2 border-b border-surface-600 last:border-0'>
                  {editingNoteId === n.id ? (
                    <div>
                      <textarea
                        value={editNoteText}
                        onChange={e => setEditNoteText(e.target.value)}
                        rows={3}
                        className='w-full bg-surface-600 border border-orange-600/50 rounded-lg px-3 py-2 text-sm text-gray-200 resize-none focus:outline-none focus:border-orange-600/70 placeholder-gray-600'
                        autoFocus
                      />
                      <div className='flex gap-2 mt-1.5'>
                        <button onClick={() => saveEditNote(n.id)} className='flex items-center gap-1 px-3 py-1 text-2xs font-medium bg-orange-600 hover:bg-orange-500 text-white rounded-lg'><Check size={10} />Save</button>
                        <button onClick={cancelEditNote} className='px-3 py-1 text-2xs text-gray-500 hover:text-gray-300 rounded-lg'>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div className='flex items-start gap-2'>
                      <div className='flex-1 min-w-0'>
                        <p className='text-xs text-gray-300 whitespace-pre-wrap'>{n.content}</p>
                        <p className='text-2xs text-gray-700 mt-0.5'>{fmtDT(n.created_at)}</p>
                      </div>
                      <div className='flex items-center gap-0.5 opacity-0 group-hover/note:opacity-100 transition-all'>
                        <button onClick={() => startEditNote(n)} className='p-1 rounded hover:bg-surface-600 text-gray-600 hover:text-orange-400 transition-colors'><Pencil size={10} /></button>
                        <button onClick={() => delNote(n.id)} className='p-1 rounded hover:bg-surface-600 text-gray-600 hover:text-red-400 transition-colors'><X size={10} /></button>
                      </div>
                    </div>
                  )}
                </div>
              ))
            }
          </div>
        </div>
      </div>
    </div>
  )
}
