import { useState, useEffect } from 'react'
import { X, Edit2, Trash2, Plus, ArrowRight, Printer, FileText } from 'lucide-react'
import type { Load, LoadStatus, Driver, Broker, Note } from '../../types/models'
import { LOAD_STATUS_STYLES, LOAD_STATUS_NEXT } from './constants'

interface Props {
  load: Load; drivers: Driver[]; brokers: Broker[]
  onClose: () => void; onEdit: (l: Load) => void
  onStatusChange: (l: Load, s: LoadStatus) => void; onDelete: (l: Load) => void
}
const fmt = (d: string | null) => { if (!d) return '—'; const [y,m,day]=d.split('-'); return `${m}/${day}/${y}` }
const fmtDT = (dt: string) => new Date(dt).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})
const fmtMoney = (v: number | null) => v != null ? '$' + v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'

const PRINT_BASE = `<style>
  *{box-sizing:border-box;margin:0;padding:0;}
  body{font-family:Arial,sans-serif;font-size:12px;color:#111;padding:36px;}
  h1{font-size:20px;font-weight:700;margin-bottom:2px;}
  .sub{color:#555;font-size:11px;margin-bottom:20px;}
  .section{margin-bottom:18px;}
  .section-title{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#777;margin-bottom:6px;padding-bottom:3px;border-bottom:1px solid #ddd;}
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:6px 24px;}
  .field{margin-bottom:4px;}
  .label{font-size:9px;color:#888;text-transform:uppercase;letter-spacing:.06em;}
  .value{font-size:12px;color:#111;font-weight:500;margin-top:1px;}
  .total-box{background:#f5f5f5;border:1px solid #ddd;border-radius:4px;padding:12px 16px;margin-top:16px;}
  .total-label{font-size:10px;color:#666;text-transform:uppercase;letter-spacing:.06em;}
  .total-value{font-size:22px;font-weight:700;color:#111;margin-top:2px;}
  .footer{margin-top:32px;padding-top:12px;border-top:1px solid #ddd;font-size:9px;color:#999;}
  .badge{display:inline-block;background:#1a1a1a;color:#fff;font-size:9px;padding:2px 8px;border-radius:3px;letter-spacing:.04em;}
</style>`

function printRateConfirmation(load: Load, driver: Driver | undefined, broker: Broker | undefined) {
  const origin = [load.origin_city, load.origin_state].filter(Boolean).join(', ') || '—'
  const dest   = [load.dest_city,   load.dest_state  ].filter(Boolean).join(', ') || '—'
  const dispFee = load.rate != null && load.dispatch_pct != null ? load.rate * (load.dispatch_pct / 100) : null
  const rpm = load.rate != null && load.miles != null && load.miles > 0 ? load.rate / load.miles : null

  const style = document.createElement('style')
  style.id = '__rc_print_style'
  style.textContent = '@media print { body > * { display:none !important; } #rc-print-root { display:block !important; } } #rc-print-root { display:none; }'
  document.head.appendChild(style)
  const root = document.createElement('div')
  root.id = 'rc-print-root'
  root.innerHTML = PRINT_BASE + `
    <h1>Rate Confirmation</h1>
    <div class="sub">OnTrack Hauling Solutions &nbsp;&bull;&nbsp; dispatch@ontrackhaulingsolutions.com &nbsp;&bull;&nbsp; Generated ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</div>

    <div class="section">
      <div class="section-title">Load Details</div>
      <div class="grid">
        <div class="field"><div class="label">Load / Ref #</div><div class="value">${load.load_id ?? ('Load #' + load.id)}</div></div>
        <div class="field"><div class="label">Status</div><div class="value"><span class="badge">${load.status}</span></div></div>
        <div class="field"><div class="label">Commodity</div><div class="value">${load.commodity ?? '—'}</div></div>
        <div class="field"><div class="label">Trailer Type</div><div class="value">${load.trailer_type ?? '—'}</div></div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">Route</div>
      <div class="grid">
        <div class="field"><div class="label">Origin</div><div class="value">${origin}</div></div>
        <div class="field"><div class="label">Destination</div><div class="value">${dest}</div></div>
        <div class="field"><div class="label">Pickup Date</div><div class="value">${fmt(load.pickup_date)}</div></div>
        <div class="field"><div class="label">Delivery Date</div><div class="value">${fmt(load.delivery_date)}</div></div>
        <div class="field"><div class="label">Miles</div><div class="value">${load.miles != null ? load.miles.toLocaleString() + ' mi' : '—'}</div></div>
        ${rpm != null ? `<div class="field"><div class="label">Rate Per Mile</div><div class="value">$${rpm.toFixed(2)}/mi</div></div>` : ''}
      </div>
    </div>

    <div class="section">
      <div class="section-title">Parties</div>
      <div class="grid">
        <div class="field"><div class="label">Driver</div><div class="value">${driver?.name ?? '—'}${driver?.company ? ' (' + driver.company + ')' : ''}</div></div>
        <div class="field"><div class="label">Broker</div><div class="value">${broker?.name ?? '—'}</div></div>
        ${driver?.mc_number ? `<div class="field"><div class="label">MC #</div><div class="value">${driver.mc_number}</div></div>` : ''}
        ${broker?.mc_number ? `<div class="field"><div class="label">Broker MC #</div><div class="value">${broker.mc_number}</div></div>` : ''}
      </div>
    </div>

    <div class="total-box">
      <div class="total-label">Gross Rate</div>
      <div class="total-value">${fmtMoney(load.rate)}</div>
      ${dispFee != null ? `<div style="margin-top:8px;"><div class="total-label">Dispatch Fee (${load.dispatch_pct}%)</div><div style="font-size:15px;font-weight:600;color:#555;margin-top:2px;">${fmtMoney(dispFee)}</div></div>` : ''}
    </div>

    ${load.notes ? `<div class="section" style="margin-top:16px;"><div class="section-title">Notes</div><p style="font-size:11px;color:#444;">${load.notes}</p></div>` : ''}
    <div class="footer">OnTrack Hauling Solutions &nbsp;&bull;&nbsp; This document is for internal dispatch use. Verify all details against the broker rate confirmation before dispatching.</div>
  `
  document.body.appendChild(root)
  window.print()
  document.body.removeChild(root)
  document.head.removeChild(style)
}

function printSettlement(load: Load, driver: Driver | undefined, broker: Broker | undefined) {
  const origin   = [load.origin_city, load.origin_state].filter(Boolean).join(', ') || '—'
  const dest     = [load.dest_city,   load.dest_state  ].filter(Boolean).join(', ') || '—'
  const dispFee  = load.rate != null && load.dispatch_pct != null ? load.rate * (load.dispatch_pct / 100) : null
  const driverNet = load.rate != null && dispFee != null ? load.rate - dispFee : null
  const rpm = load.rate != null && load.miles != null && load.miles > 0 ? load.rate / load.miles : null

  const style = document.createElement('style')
  style.id = '__settle_print_style'
  style.textContent = '@media print { body > * { display:none !important; } #settle-print-root { display:block !important; } } #settle-print-root { display:none; }'
  document.head.appendChild(style)
  const root = document.createElement('div')
  root.id = 'settle-print-root'
  root.innerHTML = PRINT_BASE + `
    <h1>Settlement Statement</h1>
    <div class="sub">OnTrack Hauling Solutions &nbsp;&bull;&nbsp; dispatch@ontrackhaulingsolutions.com &nbsp;&bull;&nbsp; ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</div>

    <div class="section">
      <div class="section-title">Driver</div>
      <div class="grid">
        <div class="field"><div class="label">Name</div><div class="value">${driver?.name ?? '—'}</div></div>
        <div class="field"><div class="label">Company</div><div class="value">${driver?.company ?? '—'}</div></div>
        ${driver?.mc_number ? `<div class="field"><div class="label">MC #</div><div class="value">${driver.mc_number}</div></div>` : ''}
        <div class="field"><div class="label">Dispatch %</div><div class="value">${load.dispatch_pct != null ? load.dispatch_pct + '%' : '—'}</div></div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">Load</div>
      <div class="grid">
        <div class="field"><div class="label">Load / Ref #</div><div class="value">${load.load_id ?? ('Load #' + load.id)}</div></div>
        <div class="field"><div class="label">Broker</div><div class="value">${broker?.name ?? '—'}</div></div>
        <div class="field"><div class="label">Route</div><div class="value">${origin} to ${dest}</div></div>
        <div class="field"><div class="label">Miles</div><div class="value">${load.miles != null ? load.miles.toLocaleString() + ' mi' : '—'}</div></div>
        <div class="field"><div class="label">Pickup</div><div class="value">${fmt(load.pickup_date)}</div></div>
        <div class="field"><div class="label">Delivery</div><div class="value">${fmt(load.delivery_date)}</div></div>
        ${rpm != null ? `<div class="field"><div class="label">Rate Per Mile</div><div class="value">$${rpm.toFixed(2)}/mi</div></div>` : ''}
        ${load.commodity ? `<div class="field"><div class="label">Commodity</div><div class="value">${load.commodity}</div></div>` : ''}
      </div>
    </div>

    <div class="total-box">
      <div class="grid">
        <div><div class="total-label">Gross Rate</div><div class="total-value">${fmtMoney(load.rate)}</div></div>
        <div><div class="total-label">Dispatch Fee (${load.dispatch_pct ?? 0}%)</div><div class="total-value" style="color:#c00;">&minus;&nbsp;${fmtMoney(dispFee)}</div></div>
      </div>
      <div style="border-top:2px solid #ccc;margin-top:14px;padding-top:12px;">
        <div class="total-label">Driver Net</div>
        <div class="total-value" style="color:#1a7a1a;">${fmtMoney(driverNet)}</div>
      </div>
    </div>

    <div class="footer" style="margin-top:24px;">
      <p>Driver signature: _________________________ &nbsp;&nbsp; Date: __________</p>
      <p style="margin-top:8px;">OnTrack Hauling Solutions &nbsp;&bull;&nbsp; This statement is for settlement purposes only and does not constitute a payment guarantee. Actual payment subject to broker release.</p>
    </div>
  `
  document.body.appendChild(root)
  window.print()
  document.body.removeChild(root)
  document.head.removeChild(style)
}
function Row({ label, value, accent=false }: { label:string; value:string; accent?:boolean }) {
  return <div><p className='text-2xs text-gray-600'>{label}</p><p className={`text-sm mt-0.5 ${accent?'text-green-400 font-mono font-semibold':value==='—'?'text-gray-700':'text-gray-300'}`}>{value}</p></div>
}
function Sec({ title }: { title:string }) {
  return <p className='text-2xs font-medium text-gray-400 uppercase tracking-wider mb-3'>{title}</p>
}
export function LoadDrawer({ load, drivers, brokers, onClose, onEdit, onStatusChange, onDelete }: Props) {
  const [notes,setNotes]       = useState<Note[]>([])
  const [noteText,setNoteText] = useState('')
  const [addNote,setAddNote]   = useState(false)
  const [confirmDel,setConf]   = useState(false)

  useEffect(() => { window.api.notes.list('load', load.id).then(setNotes) }, [load.id])

  const saveNote = async () => {
    if (!noteText.trim()) return
    const n = await window.api.notes.create({entity_type:'load',entity_id:load.id,content:noteText.trim(),user_id:null})
    setNotes(p=>[n,...p]); setNoteText(''); setAddNote(false)
  }
  const delNote = async (id:number) => { await window.api.notes.delete(id); setNotes(p=>p.filter(n=>n.id!==id)) }

  const driver   = drivers.find(d=>d.id===load.driver_id)
  const broker   = brokers.find(b=>b.id===load.broker_id)
  const rpm      = load.rate!=null&&load.miles!=null&&load.miles>0 ? load.rate/load.miles : null
  const dispFee  = load.rate!=null&&load.dispatch_pct!=null ? load.rate*(load.dispatch_pct/100) : null
  const nextSt   = LOAD_STATUS_NEXT[load.status]
  const origin   = [load.origin_city,load.origin_state].filter(Boolean).join(', ')||'—'
  const dest     = [load.dest_city,load.dest_state].filter(Boolean).join(', ')||'—'
  const rpmOk    = rpm==null||driver?.min_rpm==null||rpm>=driver.min_rpm

  return (
    <div className='fixed inset-0 z-50 flex'>
      <div className='flex-1 bg-black/50 backdrop-blur-sm' onClick={onClose} />
      <div className='w-[480px] bg-surface-800 border-l border-surface-400 shadow-2xl flex flex-col overflow-hidden animate-slide-in'>
        <div className='flex items-start justify-between px-5 pt-5 pb-4 border-b border-surface-500 shrink-0'>
          <div className='flex-1 min-w-0'>
            <div className='flex items-center gap-2 mb-1'>
              <h2 className='text-lg font-semibold text-gray-100'>{load.load_id??`Load #${load.id}`}</h2>
              <span className={`text-2xs px-2 py-0.5 rounded-full border ${LOAD_STATUS_STYLES[load.status]}`}>{load.status}</span>
            </div>
            <p className='text-sm text-gray-500 flex items-center gap-1.5'>
              <span>{origin}</span><ArrowRight size={12} className='text-gray-600'/><span>{dest}</span>
            </p>
          </div>
          <button onClick={onClose} className='p-1.5 rounded-lg hover:bg-surface-600 text-gray-500 hover:text-gray-300 ml-3 shrink-0'><X size={16}/></button>
        </div>
        <div className='flex-1 overflow-y-auto'>
          {/* Action bar */}
          <div className='flex items-center gap-1.5 px-5 py-3 border-b border-surface-600 flex-wrap shrink-0'>
            <button onClick={()=>onEdit(load)} className='flex items-center gap-1.5 px-2.5 h-7 text-xs font-medium bg-surface-600 hover:bg-surface-500 text-gray-300 rounded-lg transition-colors'><Edit2 size={11}/>Edit</button>
            {nextSt&&(
              <button onClick={()=>onStatusChange(load,nextSt)} className='flex items-center gap-1.5 px-2.5 h-7 text-xs font-medium bg-orange-600 hover:bg-orange-500 text-white rounded-lg transition-colors'>
                Mark {nextSt}
              </button>
            )}
            {['Booked','Picked Up','In Transit'].includes(load.status) && (
              <button onClick={()=>printRateConfirmation(load,driver,broker)} title='Print rate confirmation'
                className='flex items-center gap-1.5 px-2.5 h-7 text-xs font-medium bg-surface-600 hover:bg-surface-500 text-gray-300 rounded-lg transition-colors'>
                <Printer size={11}/>Rate Conf.
              </button>
            )}
            {['Delivered','Invoiced','Paid'].includes(load.status) && (
              <button onClick={()=>printSettlement(load,driver,broker)} title='Print driver settlement statement'
                className='flex items-center gap-1.5 px-2.5 h-7 text-xs font-medium bg-surface-600 hover:bg-surface-500 text-gray-300 rounded-lg transition-colors'>
                <FileText size={11}/>Settlement
              </button>
            )}
            <div className='flex-1'/>
            {!confirmDel
              ?<button onClick={()=>setConf(true)} className='p-1.5 rounded hover:bg-surface-600 text-gray-600 hover:text-red-400 transition-colors'><Trash2 size={13}/></button>
              :<div className='flex items-center gap-1'>
                <span className='text-2xs text-red-400'>Delete?</span>
                <button onClick={()=>onDelete(load)} className='text-2xs px-2 py-0.5 rounded bg-red-900/40 text-red-400 hover:bg-red-900/60'>Yes</button>
                <button onClick={()=>setConf(false)} className='text-2xs px-2 py-0.5 rounded bg-surface-600 text-gray-400'>No</button>
              </div>
            }
          </div>
          {/* Route */}
          <div className='px-5 py-4 border-b border-surface-600'>
            <Sec title='Route'/>
            <div className='flex items-center gap-3 mb-3'>
              <div className='flex-1'>
                <p className='text-2xs text-gray-600'>Origin</p>
                <p className='text-sm text-gray-200 font-medium mt-0.5'>{origin}</p>
              </div>
              <ArrowRight size={16} className='text-gray-600 shrink-0'/>
              <div className='flex-1 text-right'>
                <p className='text-2xs text-gray-600'>Destination</p>
                <p className='text-sm text-gray-200 font-medium mt-0.5'>{dest}</p>
              </div>
            </div>
            <div className='grid grid-cols-2 gap-3'>
              <Row label='Miles' value={load.miles!=null?load.miles.toLocaleString():'—'}/>
              <Row label='Commodity' value={load.commodity??'—'}/>
              <Row label='Pickup' value={fmt(load.pickup_date)}/>
              <Row label='Delivery' value={fmt(load.delivery_date)}/>
            </div>
          </div>
          {/* Financials */}
          <div className='px-5 py-4 border-b border-surface-600'>
            <Sec title='Financials'/>
            <div className='grid grid-cols-2 gap-3'>
              <Row label='Gross Rate' value={load.rate!=null?`$${load.rate.toLocaleString()}`:'—'}/>
              <div>
                <p className='text-2xs text-gray-600'>Rate Per Mile</p>
                <p className={`text-sm mt-0.5 font-mono font-semibold ${rpm==null?'text-gray-700':rpmOk?'text-green-400':'text-red-400'}`}>
                  {rpm!=null?`$${rpm.toFixed(2)}/mi`:'—'}
                  {!rpmOk&&driver?.min_rpm!=null&&<span className='text-2xs text-red-500 font-normal ml-1'>(min ${driver.min_rpm.toFixed(2)})</span>}
                </p>
              </div>
              <Row label='Dispatch %' value={load.dispatch_pct!=null?`${load.dispatch_pct}%`:'—'}/>
              <Row label='Dispatch Fee' value={dispFee!=null?`$${dispFee.toFixed(2)}`:'—'} accent={dispFee!=null}/>
            </div>
          </div>
          {/* Assignment */}
          <div className='px-5 py-4 border-b border-surface-600'>
            <Sec title='Assignment'/>
            <div className='grid grid-cols-2 gap-3'>
              <div>
                <p className='text-2xs text-gray-600'>Driver</p>
                {driver
                  ?<p className='text-sm text-gray-200 mt-0.5 font-medium'>{driver.name}{driver.company&&<span className='text-gray-500 font-normal'> · {driver.company}</span>}</p>
                  :<p className='text-sm text-yellow-600 mt-0.5'>Unassigned</p>
                }
              </div>
              <div>
                <p className='text-2xs text-gray-600'>Broker</p>
                <p className='text-sm text-gray-300 mt-0.5'>{broker?.name??'—'}</p>
                {broker && (() => {
                  const slowDiff  = broker.avg_days_pay != null ? broker.avg_days_pay - broker.payment_terms : null
                  const payScore  = slowDiff == null ? null : slowDiff <= 0 ? 'On Time' : slowDiff <= 7 ? 'Slightly Late' : slowDiff <= 14 ? 'Slow' : 'Very Slow'
                  const payColor  = payScore === 'On Time' ? 'text-green-400' : payScore === 'Slightly Late' ? 'text-yellow-400' : payScore ? 'text-red-400' : 'text-gray-600'
                  return (
                    <div className='flex items-center gap-2 mt-1 flex-wrap'>
                      {broker.payment_terms > 0 && <span className='text-2xs text-gray-600'>Net {broker.payment_terms}</span>}
                      {broker.avg_days_pay != null && <span className='text-2xs text-gray-500'>avg {Math.round(broker.avg_days_pay)}d</span>}
                      {payScore && <span className={`text-2xs font-semibold ${payColor}`}>{payScore}</span>}
                      {broker.flag !== 'None' && (
                        <span className={`text-2xs px-1.5 py-0 rounded border ${
                          broker.flag === 'Preferred'   ? 'border-green-700/40 text-green-400' :
                          broker.flag === 'Slow Pay'    ? 'border-yellow-700/40 text-yellow-500' :
                          broker.flag === 'Avoid'       ? 'border-red-700/40 text-red-400' :
                          broker.flag === 'Blacklisted' ? 'border-red-700/40 text-red-400' :
                                                          'border-surface-500 text-gray-500'
                        }`}>{broker.flag}</span>
                      )}
                      {broker.credit_rating && broker.credit_rating !== 'Unknown' && (
                        <span className='text-2xs text-gray-600'>{broker.credit_rating}</span>
                      )}
                    </div>
                  )
                })()}
              </div>
              {load.load_id&&<Row label='Broker Ref #' value={load.load_id} mono/>}
            </div>
          </div>
          {/* Notes */}
          <div className='px-5 py-4'>
            <div className='flex items-center justify-between mb-3'>
              <Sec title='Notes'/>
              <button onClick={()=>setAddNote(v=>!v)} className='flex items-center gap-1 text-2xs text-gray-600 hover:text-orange-400 transition-colors mb-3'><Plus size={10}/>Add</button>
            </div>
            {addNote&&(
              <div className='mb-3'>
                <textarea value={noteText} onChange={e=>setNoteText(e.target.value)} rows={3}
                  className='w-full bg-surface-600 border border-surface-400 rounded-lg px-3 py-2 text-sm text-gray-200 resize-none focus:outline-none focus:border-orange-600/50 placeholder-gray-600'
                  placeholder='Add a note...'/>
                <div className='flex gap-2 mt-1.5'>
                  <button onClick={saveNote} className='px-3 py-1 text-2xs font-medium bg-orange-600 hover:bg-orange-500 text-white rounded-lg'>Save</button>
                  <button onClick={()=>{setAddNote(false);setNoteText('')}} className='px-3 py-1 text-2xs text-gray-500 hover:text-gray-300 rounded-lg'>Cancel</button>
                </div>
              </div>
            )}
            {notes.length===0
              ?<p className='text-2xs text-gray-700 italic'>No notes yet.</p>
              :notes.map(n=>(
                <div key={n.id} className='group/note flex items-start gap-2 py-2 border-b border-surface-600 last:border-0'>
                  <div className='flex-1 min-w-0'>
                    <p className='text-xs text-gray-300 whitespace-pre-wrap'>{n.content}</p>
                    <p className='text-2xs text-gray-700 mt-0.5'>{fmtDT(n.created_at)}</p>
                  </div>
                  <button onClick={()=>delNote(n.id)} className='opacity-0 group-hover/note:opacity-100 p-1 rounded hover:bg-surface-600 text-gray-600 hover:text-red-400 transition-all'><X size={10}/></button>
                </div>
              ))
            }
          </div>
        </div>
      </div>
    </div>
  )
}
