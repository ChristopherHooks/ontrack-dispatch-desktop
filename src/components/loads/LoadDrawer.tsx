import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, Edit2, Trash2, Plus, ArrowRight, Printer, FileText, Copy, Paperclip, Phone, MessageSquare, Check, ChevronDown, Receipt } from 'lucide-react'
import type { Load, LoadStatus, Driver, Broker, Note, TimelineEvent, DatPosting, CarrierOffer, BrokerCarrierVetting, SopDocument } from '../../types/models'
import { LOAD_STATUS_STYLES, LOAD_STATUS_NEXT } from './constants'
import { resolveGuidance } from '../../lib/guidanceResolver'
import { ContextGuidancePanel } from '../ui/ContextGuidancePanel'

interface Props {
  load: Load; drivers: Driver[]; brokers: Broker[]
  onClose: () => void; onEdit: (l: Load) => void
  onStatusChange: (l: Load, s: LoadStatus) => void; onDelete: (l: Load) => void
  onDuplicate?: (l: Load) => void
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

function printRunSheet(load: Load, driver: Driver | undefined, broker: Broker | undefined) {
  const origin = [load.origin_city, load.origin_state].filter(Boolean).join(', ') || '—'
  const dest   = [load.dest_city,   load.dest_state  ].filter(Boolean).join(', ') || '—'

  const style = document.createElement('style')
  style.id = '__rs_print_style'
  style.textContent = '@media print { body > * { display:none !important; } #rs-print-root { display:block !important; } } #rs-print-root { display:none; }'
  document.head.appendChild(style)
  const root = document.createElement('div')
  root.id = 'rs-print-root'
  root.innerHTML = PRINT_BASE + `
    <h1>Driver Run Sheet</h1>
    <div class="sub">OnTrack Hauling Solutions &nbsp;&bull;&nbsp; dispatch@ontrackhaulingsolutions.com &nbsp;&bull;&nbsp; Generated ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</div>

    <div class="section">
      <div class="section-title">Driver &amp; Equipment</div>
      <div class="grid">
        <div class="field"><div class="label">Driver</div><div class="value">${driver?.name ?? '—'}</div></div>
        <div class="field"><div class="label">Phone</div><div class="value">${driver?.phone ?? '—'}</div></div>
        ${driver?.company ? `<div class="field"><div class="label">Company</div><div class="value">${driver.company}</div></div>` : ''}
        ${driver?.truck_type ? `<div class="field"><div class="label">Truck Type</div><div class="value">${driver.truck_type}</div></div>` : ''}
        <div class="field"><div class="label">Trailer Type</div><div class="value">${load.trailer_type ?? driver?.trailer_type ?? '—'}</div></div>
        <div class="field"><div class="label">Commodity</div><div class="value">${load.commodity ?? '—'}</div></div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">Pickup — ${origin}</div>
      <div class="grid">
        <div class="field"><div class="label">Origin City / State</div><div class="value">${origin}</div></div>
        <div class="field"><div class="label">Pickup Date</div><div class="value" style="font-size:15px;font-weight:700;">${fmt(load.pickup_date)}</div></div>
        ${load.origin_city ? `<div class="field" style="grid-column:span 2;"><div class="label">Pickup Address</div><div class="value">${load.origin_city}${load.origin_state ? ', ' + load.origin_state : ''}</div></div>` : ''}
      </div>
    </div>

    <div class="section">
      <div class="section-title">Delivery — ${dest}</div>
      <div class="grid">
        <div class="field"><div class="label">Destination City / State</div><div class="value">${dest}</div></div>
        <div class="field"><div class="label">Delivery Date</div><div class="value" style="font-size:15px;font-weight:700;">${fmt(load.delivery_date)}</div></div>
        ${load.dest_city ? `<div class="field" style="grid-column:span 2;"><div class="label">Delivery Address</div><div class="value">${load.dest_city}${load.dest_state ? ', ' + load.dest_state : ''}</div></div>` : ''}
      </div>
    </div>

    <div class="section">
      <div class="section-title">Broker Contact</div>
      <div class="grid">
        <div class="field"><div class="label">Broker</div><div class="value">${broker?.name ?? '—'}</div></div>
        <div class="field"><div class="label">Broker Phone</div><div class="value">${broker?.phone ?? '—'}</div></div>
        ${broker?.email ? `<div class="field"><div class="label">Broker Email</div><div class="value">${broker.email}</div></div>` : ''}
        ${broker?.mc_number ? `<div class="field"><div class="label">Broker MC #</div><div class="value">${broker.mc_number}</div></div>` : ''}
        <div class="field"><div class="label">Load / Ref #</div><div class="value" style="font-size:15px;font-weight:700;">${load.load_id ?? ('Load #' + load.id)}</div></div>
        <div class="field"><div class="label">Dispatch Office</div><div class="value">dispatch@ontrackhaulingsolutions.com</div></div>
      </div>
    </div>

    ${load.notes ? `<div class="section"><div class="section-title">Special Instructions</div><p style="font-size:12px;color:#111;padding:10px 12px;background:#f5f5f5;border:1px solid #ddd;border-radius:4px;">${load.notes}</p></div>` : `<div class="section"><div class="section-title">Special Instructions</div><p style="font-size:11px;color:#999;font-style:italic;">None noted.</p></div>`}

    <div class="total-box" style="margin-top:16px;">
      <div class="grid">
        <div><div class="total-label">Loaded Miles</div><div class="total-value" style="font-size:16px;">${load.miles != null ? load.miles.toLocaleString() + ' mi' : '—'}</div></div>
        <div><div class="total-label">Rate</div><div class="total-value" style="font-size:16px;">${load.rate != null ? '$' + load.rate.toLocaleString() : '—'}</div></div>
      </div>
    </div>

    <div class="footer" style="margin-top:32px;">
      <p>Questions? Call dispatch: <strong>dispatch@ontrackhaulingsolutions.com</strong></p>
      <p style="margin-top:6px;">This run sheet is for driver reference only. Refer to the broker rate confirmation for binding rate and delivery terms.</p>
    </div>
  `
  document.body.appendChild(root)
  window.print()
  document.body.removeChild(root)
  document.head.removeChild(style)
}

function printSettlement(load: Load, driver: Driver | undefined, broker: Broker | undefined, deductions: Array<{ label: string; amount: number }> = []) {
  const origin   = [load.origin_city, load.origin_state].filter(Boolean).join(', ') || '—'
  const dest     = [load.dest_city,   load.dest_state  ].filter(Boolean).join(', ') || '—'
  const fsc      = load.fuel_surcharge ?? 0
  const grossTotal = (load.rate ?? 0) + fsc
  const dispFee  = load.rate != null && load.dispatch_pct != null ? load.rate * (load.dispatch_pct / 100) : null
  const dedTotal = deductions.reduce((s, d) => s + d.amount, 0)
  const driverNet = load.rate != null && dispFee != null ? grossTotal - dispFee - dedTotal : null
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
        <div><div class="total-label">Linehaul Rate</div><div class="total-value">${fmtMoney(load.rate)}</div></div>
        ${fsc > 0 ? `<div><div class="total-label">Fuel Surcharge (FSC)</div><div class="total-value">+ ${fmtMoney(fsc)}</div></div>` : ''}
        <div><div class="total-label">Dispatch Fee (${load.dispatch_pct ?? 0}%)</div><div class="total-value" style="color:#c00;">&minus;&nbsp;${fmtMoney(dispFee)}</div></div>
        ${deductions.map(d => `<div><div class="total-label">${d.label}</div><div class="total-value" style="color:#c00;">&minus;&nbsp;${fmtMoney(d.amount)}</div></div>`).join('')}
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
function Row({ label, value, accent=false, mono=false }: { label:string; value:string; accent?:boolean; mono?:boolean }) {
  return <div><p className='text-2xs text-gray-600'>{label}</p><p className={`text-sm mt-0.5 ${accent?'text-green-400 font-mono font-semibold':value==='—'?'text-gray-700':'text-gray-300'}${mono?' font-mono':''}`}>{value}</p></div>
}
function Sec({ title }: { title:string }) {
  return <p className='text-2xs font-medium text-gray-400 uppercase tracking-wider mb-3'>{title}</p>
}
type LoadAttachment = { id: number; load_id: number; title: string; file_path: string; file_name: string; created_at: string }
type Deduction     = { id: number; load_id: number; label: string; amount: number; created_at: string }
type DatForm     = { posted_rate: string; expires_at: string; posting_ref: string; status: 'active'|'expired'|'filled'; notes: string }
type OfferForm   = { carrier_name: string; mc_number: string; phone: string; offered_rate: string; status: 'Pending'|'Accepted'|'Rejected'|'Countered'; counter_rate: string; final_rate: string; notes: string }
type VettingForm = { carrier_mc: string; carrier_name: string; insurance_verified: 0|1; authority_active: 0|1; safety_rating: string; carrier_packet_received: 0|1; vetting_date: string; notes: string }
const DAT_BLANK: DatForm         = { posted_rate:'', expires_at:'', posting_ref:'', status:'active', notes:'' }
const OFFER_BLANK: OfferForm     = { carrier_name:'', mc_number:'', phone:'', offered_rate:'', status:'Pending', counter_rate:'', final_rate:'', notes:'' }
const VETTING_BLANK: VettingForm = { carrier_mc:'', carrier_name:'', insurance_verified:0, authority_active:0, safety_rating:'', carrier_packet_received:0, vetting_date:'', notes:'' }

export function LoadDrawer({ load, drivers, brokers, onClose, onEdit, onStatusChange, onDelete, onDuplicate }: Props) {
  const navigate = useNavigate()
  const [notes,setNotes]             = useState<Note[]>([])
  const [noteText,setNoteText]       = useState('')
  const [addNote,setAddNote]         = useState(false)
  const [confirmDel,setConf]         = useState(false)
  const [attachments,setAttachments] = useState<LoadAttachment[]>([])
  const [attTitle,setAttTitle]       = useState('')
  const [pendingFile,setPendingFile] = useState<{ storedPath: string; displayName: string } | null>(null)
  const [addAtt,setAddAtt]           = useState(false)
  const [checkCalls,setCheckCalls]   = useState<TimelineEvent[]>([])
  const [callLabel,setCallLabel]     = useState('')
  const [addCall,setAddCall]         = useState(false)
  const [deductions,setDeductions]   = useState<Deduction[]>([])
  const [dedLabel,setDedLabel]       = useState('')
  const [dedAmount,setDedAmount]     = useState('')
  const [addDed,setAddDed]           = useState(false)
  const [showMsgTemplates,setShowMsgTemplates] = useState(false)
  const [copiedMsg,setCopiedMsg]              = useState<string|null>(null)
  // --- Broker Mode ---
  const [datPostings,   setDatPostings]   = useState<DatPosting[]>([])
  const [datForm,       setDatForm]       = useState<DatForm>(DAT_BLANK)
  const [editDatId,     setEditDatId]     = useState<number|null>(null)
  const [showDatForm,   setShowDatForm]   = useState(false)
  const [carrierOffers, setCarrierOffers] = useState<CarrierOffer[]>([])
  const [offerForm,     setOfferForm]     = useState<OfferForm>(OFFER_BLANK)
  const [editOfferId,   setEditOfferId]   = useState<number|null>(null)
  const [showOfferForm, setShowOfferForm] = useState(false)
  const [vetting,       setVetting]       = useState<BrokerCarrierVetting|null>(null)
  const [vettingForm,   setVettingForm]   = useState<VettingForm>(VETTING_BLANK)
  const [editVetting,   setEditVetting]   = useState(false)
  // --- Contextual SOP guidance (broker mode only) ---
  const [allDocs, setAllDocs] = useState<SopDocument[]>([])

  useEffect(() => {
    window.api.notes.list('load', load.id).then(setNotes).catch(() => {})
    window.api.timeline.events(load.id).then(evts =>
      setCheckCalls(evts.filter(e => e.event_type === 'check_call'))
    ).catch(() => {})
    try {
      window.api.loadAttachments.list(load.id).then(setAttachments).catch(() => {})
      window.api.loadDeductions.list(load.id).then(setDeductions).catch(() => {})
      window.api.documents.list().then(setAllDocs).catch(() => {})
      if (load.load_mode === 'broker') {
        window.api.datPostings.list(load.id).then(setDatPostings).catch(() => {})
        window.api.carrierOffers.list(load.id).then(setCarrierOffers).catch(() => {})
        window.api.brokerVetting.get(load.id).then(v => setVetting(v ?? null)).catch(() => {})
      }
    } catch {
      // Catches synchronous access errors (e.g. window.api.X undefined during dev hot-reload)
    }
  }, [load.id])

  const saveDed = async () => {
    const amt = parseFloat(dedAmount)
    if (!dedLabel.trim() || isNaN(amt) || amt <= 0) return
    const d = await window.api.loadDeductions.create({ load_id: load.id, label: dedLabel.trim(), amount: amt })
    setDeductions(p => [...p, d]); setDedLabel(''); setDedAmount(''); setAddDed(false)
  }
  const delDed = async (id: number) => { await window.api.loadDeductions.delete(id); setDeductions(p => p.filter(d => d.id !== id)) }

  const saveCheckCall = async () => {
    if (!callLabel.trim()) return
    const e = await window.api.timeline.addEvent(load.id, 'check_call', callLabel.trim(), null, null)
    setCheckCalls(p => [...p, e]); setCallLabel(''); setAddCall(false)
  }
  const delCheckCall = async (id: number) => {
    await window.api.timeline.deleteEvent(id)
    setCheckCalls(p => p.filter(e => e.id !== id))
  }

  const saveNote = async () => {
    if (!noteText.trim()) return
    const n = await window.api.notes.create({entity_type:'load',entity_id:load.id,content:noteText.trim(),user_id:null})
    setNotes(p=>[n,...p]); setNoteText(''); setAddNote(false)
  }
  const delNote = async (id:number) => { await window.api.notes.delete(id); setNotes(p=>p.filter(n=>n.id!==id)) }

  // --- DAT Postings ---
  const openAddDat  = () => { setEditDatId(null); setDatForm(DAT_BLANK); setShowDatForm(true) }
  const openEditDat = (p: DatPosting) => {
    setEditDatId(p.id)
    setDatForm({ posted_rate: p.posted_rate != null ? String(p.posted_rate) : '', expires_at: p.expires_at ?? '', posting_ref: p.posting_ref ?? '', status: p.status, notes: p.notes ?? '' })
    setShowDatForm(true)
  }
  const saveDat = async () => {
    const dto = { posted_rate: datForm.posted_rate ? parseFloat(datForm.posted_rate) : null, expires_at: datForm.expires_at || null, posting_ref: datForm.posting_ref || null, status: datForm.status, notes: datForm.notes || null }
    if (editDatId != null) {
      const updated = await window.api.datPostings.update(editDatId, dto)
      if (updated) setDatPostings(p => p.map(x => x.id === editDatId ? updated : x))
    } else {
      const created = await window.api.datPostings.create({ ...dto, load_id: load.id })
      setDatPostings(p => [...p, created])
    }
    setShowDatForm(false); setEditDatId(null); setDatForm(DAT_BLANK)
  }
  const delDat = async (id: number) => { await window.api.datPostings.delete(id); setDatPostings(p => p.filter(x => x.id !== id)) }

  // --- Carrier Offers ---
  const openAddOffer  = () => { setEditOfferId(null); setOfferForm(OFFER_BLANK); setShowOfferForm(true) }
  const openEditOffer = (o: CarrierOffer) => {
    setEditOfferId(o.id)
    setOfferForm({ carrier_name: o.carrier_name, mc_number: o.mc_number ?? '', phone: o.phone ?? '', offered_rate: o.offered_rate != null ? String(o.offered_rate) : '', status: o.status, counter_rate: o.counter_rate != null ? String(o.counter_rate) : '', final_rate: o.final_rate != null ? String(o.final_rate) : '', notes: o.notes ?? '' })
    setShowOfferForm(true)
  }
  const saveOffer = async () => {
    if (!offerForm.carrier_name.trim()) return
    const dto = { carrier_name: offerForm.carrier_name.trim(), mc_number: offerForm.mc_number || null, phone: offerForm.phone || null, offered_rate: offerForm.offered_rate ? parseFloat(offerForm.offered_rate) : null, status: offerForm.status, counter_rate: offerForm.counter_rate ? parseFloat(offerForm.counter_rate) : null, final_rate: offerForm.final_rate ? parseFloat(offerForm.final_rate) : null, notes: offerForm.notes || null }
    const isAccepting = offerForm.status === 'Accepted'
    if (editOfferId != null) {
      if (isAccepting) {
        // Atomically: update offer fields, reject competitors, sync load to Carrier Selected
        const result = await window.api.carrierOffers.accept(editOfferId, dto)
        setCarrierOffers(result.allOffers)
        onStatusChange(load, 'Carrier Selected')
      } else {
        const updated = await window.api.carrierOffers.update(editOfferId, dto)
        if (updated) setCarrierOffers(p => p.map(x => x.id === editOfferId ? updated : x))
      }
    } else {
      const created = await window.api.carrierOffers.create({ ...dto, load_id: load.id })
      if (isAccepting) {
        // Newly created offer is immediately accepted — run accept to sync competitors + load
        const result = await window.api.carrierOffers.accept(created.id)
        setCarrierOffers(result.allOffers)
        onStatusChange(load, 'Carrier Selected')
      } else {
        setCarrierOffers(p => [...p, created])
      }
    }
    setShowOfferForm(false); setEditOfferId(null); setOfferForm(OFFER_BLANK)
  }
  const delOffer = async (id: number) => { await window.api.carrierOffers.delete(id); setCarrierOffers(p => p.filter(x => x.id !== id)) }
  const acceptOfferDirect = async (o: CarrierOffer) => {
    const result = await window.api.carrierOffers.accept(o.id)
    setCarrierOffers(result.allOffers)
    onStatusChange(load, 'Carrier Selected')
  }

  // --- Carrier Vetting ---
  const openEditVetting = () => {
    if (vetting) {
      // Editing an existing record — load saved values, never auto-overwrite
      setVettingForm({ carrier_mc: vetting.carrier_mc ?? '', carrier_name: vetting.carrier_name ?? '', insurance_verified: vetting.insurance_verified, authority_active: vetting.authority_active, safety_rating: vetting.safety_rating ?? '', carrier_packet_received: vetting.carrier_packet_received, vetting_date: vetting.vetting_date ?? '', notes: vetting.notes ?? '' })
    } else if (acceptedOffer) {
      // No vetting yet — prefill name + MC from the accepted offer as a convenience
      setVettingForm({ ...VETTING_BLANK, carrier_name: acceptedOffer.carrier_name, carrier_mc: acceptedOffer.mc_number ?? '' })
    } else {
      setVettingForm(VETTING_BLANK)
    }
    setEditVetting(true)
  }
  const saveVetting = async () => {
    const saved = await window.api.brokerVetting.upsert({ load_id: load.id, carrier_mc: vettingForm.carrier_mc || null, carrier_name: vettingForm.carrier_name || null, insurance_verified: vettingForm.insurance_verified, authority_active: vettingForm.authority_active, safety_rating: (vettingForm.safety_rating || null) as BrokerCarrierVetting['safety_rating'], carrier_packet_received: vettingForm.carrier_packet_received, vetting_date: vettingForm.vetting_date || null, notes: vettingForm.notes || null })
    setVetting(saved); setEditVetting(false)
  }
  const delVetting = async () => { await window.api.brokerVetting.delete(load.id); setVetting(null) }

  const pickAttachment = async () => {
    const r = await window.api.loadAttachments.pick(load.id)
    if (r) { setPendingFile(r); if (!attTitle) setAttTitle(r.displayName) }
  }
  const saveAttachment = async () => {
    if (!pendingFile || !attTitle.trim()) return
    const a = await window.api.loadAttachments.create({ load_id: load.id, title: attTitle.trim(), file_path: pendingFile.storedPath, file_name: pendingFile.displayName })
    setAttachments(p => [a, ...p]); setAttTitle(''); setPendingFile(null); setAddAtt(false)
  }
  const delAttachment = async (id:number) => { await window.api.loadAttachments.delete(id); setAttachments(p=>p.filter(a=>a.id!==id)) }

  const driver        = drivers.find(d=>d.id===load.driver_id)
  const broker        = brokers.find(b=>b.id===load.broker_id)
  const acceptedOffer = carrierOffers.find(o=>o.status==='Accepted') ?? null
  const rpm      = load.rate!=null&&load.miles!=null&&load.miles>0 ? load.rate/load.miles : null
  const dispFee  = load.rate!=null&&load.dispatch_pct!=null ? load.rate*(load.dispatch_pct/100) : null
  const nextSt   = LOAD_STATUS_NEXT[load.status]
  const origin   = [load.origin_city,load.origin_state].filter(Boolean).join(', ')||'—'
  const dest     = [load.dest_city,load.dest_state].filter(Boolean).join(', ')||'—'
  const rpmOk    = rpm==null||driver?.min_rpm==null||rpm>=driver.min_rpm

  const driverFirst = driver?.name?.split(' ')[0] ?? '[driver]'
  const loadRef     = load.load_id ?? `#${load.id}`
  const rateStr     = load.rate != null ? `$${load.rate.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '[rate]'
  const brokerPhone = broker?.phone ?? '[broker phone]'

  const MSG_TEMPLATES: Array<{ id: string; label: string; text: string }> = [
    {
      id:    'booked',
      label: 'Load confirmed — details for driver',
      text:  `Hey ${driverFirst}, you're confirmed on load ${loadRef}. Pickup: ${origin} on ${fmt(load.pickup_date)}. Delivery: ${dest} on ${fmt(load.delivery_date)}. Rate: ${rateStr}. Broker: ${broker?.name ?? '[broker]'}, contact ${brokerPhone}. Let me know when you're loaded.`,
    },
    {
      id:    'checkcall',
      label: 'Mid-route check call',
      text:  `Hey ${driverFirst}, just checking in — where are you at on load ${loadRef}? Still on track for delivery at ${dest} on ${fmt(load.delivery_date)}? Any issues I should know about?`,
    },
    {
      id:    'delivery',
      label: 'Delivery confirmation request',
      text:  `Hey ${driverFirst}, checking in on load ${loadRef} — are you unloaded at ${dest}? The moment you're clear, let me know and get me the signed BOL. I need it to send the invoice today.`,
    },
    {
      id:    'runsheet',
      label: 'Run sheet sent',
      text:  `Hey ${driverFirst}, run sheet for load ${loadRef} is attached. Route: ${origin} to ${dest}. Pickup ${fmt(load.pickup_date)}, delivery ${fmt(load.delivery_date)}. Rate: ${rateStr}. Hit me back if you have any questions.`,
    },
    {
      id:    'pickup-reminder',
      label: 'Pickup reminder (day before)',
      text:  `Hey ${driverFirst}, reminder — you've got a pickup tomorrow at ${origin} for load ${loadRef}. Broker is ${broker?.name ?? '[broker]'}, contact ${brokerPhone} if you need to reach them. Let me know when you're on your way.`,
    },
  ]

  const copyMsg = (id: string, text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedMsg(id)
      setTimeout(() => setCopiedMsg(null), 2500)
    }).catch(() => {})
  }

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
            {['Booked','Picked Up','In Transit'].includes(load.status) && (
              <button onClick={()=>printRunSheet(load,driver,broker)} title='Print driver run sheet'
                className='flex items-center gap-1.5 px-2.5 h-7 text-xs font-medium bg-surface-600 hover:bg-surface-500 text-gray-300 rounded-lg transition-colors'>
                <Printer size={11}/>Run Sheet
              </button>
            )}
            {['Delivered','Invoiced','Paid'].includes(load.status) && (
              <button onClick={()=>printSettlement(load,driver,broker,deductions)} title='Print driver settlement statement'
                className='flex items-center gap-1.5 px-2.5 h-7 text-xs font-medium bg-surface-600 hover:bg-surface-500 text-gray-300 rounded-lg transition-colors'>
                <FileText size={11}/>Settlement
              </button>
            )}
            {load.status === 'Delivered' && (
              <button onClick={() => { onClose(); navigate(`/invoices?new=1&load_id=${load.id}`) }}
                title='Create invoice for this load — pre-fills driver, broker, rate and dispatch fee'
                className='flex items-center gap-1.5 px-2.5 h-7 text-xs font-medium bg-green-700 hover:bg-green-600 text-white rounded-lg transition-colors'>
                <Receipt size={11}/>Create Invoice
              </button>
            )}
            {onDuplicate && (
              <button onClick={()=>onDuplicate(load)} title='Duplicate this load — same broker, route, driver, trailer type; rate and dates cleared'
                className='flex items-center gap-1.5 px-2.5 h-7 text-xs font-medium bg-surface-600 hover:bg-surface-500 text-gray-300 rounded-lg transition-colors'>
                <Copy size={11}/>Duplicate
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
              <Row label='Loaded Miles' value={load.miles!=null?load.miles.toLocaleString():'—'}/>
              <Row label='Deadhead Miles' value={load.deadhead_miles!=null?load.deadhead_miles.toLocaleString():'—'}/>
              <Row label='Commodity' value={load.commodity??'—'}/>
              <Row label='Trailer' value={load.trailer_type??'—'}/>
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
              {load.fuel_surcharge!=null&&<Row label='Fuel Surcharge (FSC)' value={`$${load.fuel_surcharge.toFixed(2)}`}/>}
              {load.deadhead_miles!=null&&<Row label='Deadhead Miles' value={`${load.deadhead_miles.toLocaleString()} mi`}/>}
              <Row label='Dispatch %' value={load.dispatch_pct!=null?`${load.dispatch_pct}%`:'—'}/>
              <Row label='Dispatch Fee' value={dispFee!=null?`$${dispFee.toFixed(2)}`:'—'} accent={dispFee!=null}/>
            </div>
            {/* Summary: dispatcher earnings + driver net */}
            {dispFee != null && load.rate != null && (() => {
              const fsc      = load.fuel_surcharge ?? 0
              const gross    = load.rate + fsc
              const dedTotal = deductions.reduce((s, d) => s + d.amount, 0)
              const driverNet = gross - dispFee - dedTotal
              return (
                <div className='mt-3 pt-3 border-t border-surface-600 grid grid-cols-2 gap-3'>
                  <div>
                    <p className='text-2xs text-gray-600'>Your Earnings</p>
                    <p className='text-sm mt-0.5 font-mono font-semibold text-green-400'>${dispFee.toFixed(2)}</p>
                    <p className='text-2xs text-gray-700'>dispatch fee</p>
                  </div>
                  <div>
                    <p className='text-2xs text-gray-600'>Driver Net</p>
                    <p className='text-sm mt-0.5 font-mono font-semibold text-gray-300'>${driverNet.toFixed(2)}</p>
                    <p className='text-2xs text-gray-700'>after fee{dedTotal > 0 ? ` + ded` : ''}</p>
                  </div>
                </div>
              )
            })()}
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
                <p className='text-2xs text-gray-600'>{broker?.contact_type === 'shipper' ? 'Shipper' : 'Broker'}</p>
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
            {load.load_mode !== 'broker' && (
              <ContextGuidancePanel docs={resolveGuidance('load-create-dispatch', allDocs)} label='Load Booking SOPs'/>
            )}
          </div>

          {/* ── Broker Mode Panels ── */}
          {load.load_mode === 'broker' && (<>

          {/* Broker next-step cues */}
          {(() => {
            type Cue = { text: string; color: string; action?: () => void; actionLabel?: string }
            const cues: Cue[] = []
            if (datPostings.length === 0)
              cues.push({ text: 'No DAT posting yet', color: 'text-gray-500' })
            if (acceptedOffer && !vetting)
              cues.push({ text: 'Covered — needs vetting', color: 'text-yellow-500', action: openEditVetting, actionLabel: 'Start' })
            if (vetting && load.status === 'Carrier Selected')
              cues.push({ text: 'Vetted — ready for pickup', color: 'text-sky-400' })
            if (cues.length === 0) return null
            return (
              <div className='px-5 py-2 border-b border-surface-600 bg-surface-700/30 flex items-center gap-3 flex-wrap'>
                {cues.map((c, i) => (
                  <span key={i} className={`flex items-center gap-1.5 text-2xs ${c.color}`}>
                    <span className='w-1 h-1 rounded-full bg-current shrink-0' />
                    {c.text}
                    {c.action && (
                      <button onClick={c.action}
                        className='text-2xs font-semibold text-orange-400 hover:text-orange-300 transition-colors underline underline-offset-2'>
                        {c.actionLabel}
                      </button>
                    )}
                  </span>
                ))}
              </div>
            )
          })()}

          {/* DAT Postings */}
          <div className='px-5 py-4 border-b border-surface-600'>
            <div className='flex items-center justify-between mb-3'>
              <Sec title='DAT Postings / Broker Overview'/>
              <button onClick={showDatForm && editDatId==null ? ()=>{setShowDatForm(false);setDatForm(DAT_BLANK)} : openAddDat}
                className='flex items-center gap-1 text-2xs text-gray-600 hover:text-orange-400 transition-colors mb-3'>
                <Plus size={10}/>{showDatForm && editDatId==null ? 'Cancel' : 'Add'}
              </button>
            </div>
            {showDatForm && (
              <div className='mb-3 p-3 rounded-lg bg-surface-700 space-y-2'>
                <p className='text-2xs text-gray-500 font-medium'>{editDatId != null ? 'Edit Posting' : 'New Posting'}</p>
                <div className='grid grid-cols-2 gap-2'>
                  <input value={datForm.posted_rate} onChange={e=>setDatForm(p=>({...p,posted_rate:e.target.value}))} type='number' min='0' step='0.01' placeholder='Posted rate ($)'
                    className='h-7 px-2.5 text-xs bg-surface-600 border border-surface-400 rounded-lg text-gray-200 placeholder-gray-600 focus:outline-none'/>
                  <input value={datForm.expires_at} onChange={e=>setDatForm(p=>({...p,expires_at:e.target.value}))} type='date'
                    className='h-7 px-2.5 text-xs bg-surface-600 border border-surface-400 rounded-lg text-gray-200 focus:outline-none'/>
                  <input value={datForm.posting_ref} onChange={e=>setDatForm(p=>({...p,posting_ref:e.target.value}))} placeholder='Posting ref #'
                    className='h-7 px-2.5 text-xs bg-surface-600 border border-surface-400 rounded-lg text-gray-200 placeholder-gray-600 focus:outline-none'/>
                  <select value={datForm.status} onChange={e=>setDatForm(p=>({...p,status:e.target.value as DatForm['status']}))}
                    className='h-7 px-2.5 text-xs bg-surface-600 border border-surface-400 rounded-lg text-gray-200 focus:outline-none'>
                    <option value='active'>Active</option>
                    <option value='expired'>Expired</option>
                    <option value='filled'>Filled</option>
                  </select>
                </div>
                <input value={datForm.notes} onChange={e=>setDatForm(p=>({...p,notes:e.target.value}))} placeholder='Notes'
                  className='w-full h-7 px-2.5 text-xs bg-surface-600 border border-surface-400 rounded-lg text-gray-200 placeholder-gray-600 focus:outline-none'/>
                <div className='flex gap-2'>
                  <button onClick={saveDat} className='px-3 py-1 text-2xs font-medium bg-orange-600 hover:bg-orange-500 text-white rounded-lg'>Save</button>
                  <button onClick={()=>{setShowDatForm(false);setEditDatId(null);setDatForm(DAT_BLANK)}} className='px-3 py-1 text-2xs text-gray-500 hover:text-gray-300 rounded-lg'>Cancel</button>
                </div>
              </div>
            )}
            {datPostings.length === 0
              ? <p className='text-2xs text-gray-700 italic'>No DAT postings yet.</p>
              : datPostings.map(p => (
                <div key={p.id} className='group/dat flex items-start gap-2 py-2 border-b border-surface-600 last:border-0'>
                  <div className='flex-1 min-w-0'>
                    <div className='flex items-center gap-2 flex-wrap'>
                      {p.posted_rate != null && <span className='text-xs text-green-400 font-mono'>${p.posted_rate.toLocaleString()}</span>}
                      {p.posting_ref && <span className='text-2xs text-gray-500'>#{p.posting_ref}</span>}
                      <span className={`text-2xs px-1.5 py-0 rounded border ${p.status==='active'?'border-green-700/40 text-green-500':p.status==='filled'?'border-orange-700/40 text-orange-400':'border-surface-400 text-gray-600'}`}>{p.status}</span>
                    </div>
                    {p.expires_at && <p className='text-2xs text-gray-700 mt-0.5'>expires {fmt(p.expires_at)}</p>}
                    {p.notes && <p className='text-2xs text-gray-600 mt-0.5 truncate'>{p.notes}</p>}
                  </div>
                  <div className='flex gap-1 opacity-0 group-hover/dat:opacity-100 transition-all'>
                    <button onClick={()=>openEditDat(p)} className='p-1 rounded hover:bg-surface-600 text-gray-600 hover:text-orange-400'><Edit2 size={10}/></button>
                    <button onClick={()=>delDat(p.id)} className='p-1 rounded hover:bg-surface-600 text-gray-600 hover:text-red-400'><X size={10}/></button>
                  </div>
                </div>
              ))
            }
            <ContextGuidancePanel docs={resolveGuidance('broker-overview', allDocs)} label='Broker Workflow SOPs'/>
          </div>

          {/* Carrier Offers */}
          <div className='px-5 py-4 border-b border-surface-600'>
            <div className='flex items-center justify-between mb-3'>
              <Sec title='Carrier Offers'/>
              <button onClick={showOfferForm && editOfferId==null ? ()=>{setShowOfferForm(false);setOfferForm(OFFER_BLANK)} : openAddOffer}
                className='flex items-center gap-1 text-2xs text-gray-600 hover:text-orange-400 transition-colors mb-3'>
                <Plus size={10}/>{showOfferForm && editOfferId==null ? 'Cancel' : 'Add'}
              </button>
            </div>
            {/* Accepted carrier summary — quick-glance card */}
            {acceptedOffer && !showOfferForm && (
              <div className='mb-3 px-3 py-2.5 rounded-lg bg-green-900/20 border border-green-800/30'>
                <div className='flex items-start justify-between gap-3'>
                  <div className='min-w-0'>
                    <p className='text-2xs text-green-600 uppercase tracking-wide font-semibold mb-0.5'>Accepted Carrier</p>
                    <p className='text-sm text-green-300 font-semibold truncate'>{acceptedOffer.carrier_name}</p>
                    <div className='flex items-center gap-2 mt-0.5 flex-wrap'>
                      {acceptedOffer.mc_number && <span className='text-2xs text-gray-500 font-mono'>{acceptedOffer.mc_number}</span>}
                      {acceptedOffer.phone && <span className='text-2xs text-gray-500'>{acceptedOffer.phone}</span>}
                    </div>
                  </div>
                  <div className='text-right shrink-0'>
                    <p className='text-2xs text-gray-600'>Rate</p>
                    <p className='text-sm font-mono font-semibold text-green-400'>
                      {acceptedOffer.final_rate != null ? `$${acceptedOffer.final_rate.toLocaleString()}` :
                       acceptedOffer.offered_rate != null ? `$${acceptedOffer.offered_rate.toLocaleString()}` : '—'}
                    </p>
                  </div>
                </div>
              </div>
            )}
            {showOfferForm && (
              <div className='mb-3 p-3 rounded-lg bg-surface-700 space-y-2'>
                <p className='text-2xs text-gray-500 font-medium'>{editOfferId != null ? 'Edit Offer' : 'New Offer'}</p>
                <div className='grid grid-cols-2 gap-2'>
                  <input value={offerForm.carrier_name} onChange={e=>setOfferForm(p=>({...p,carrier_name:e.target.value}))} placeholder='Carrier name *'
                    className='h-7 px-2.5 text-xs bg-surface-600 border border-surface-400 rounded-lg text-gray-200 placeholder-gray-600 focus:outline-none'/>
                  <input value={offerForm.mc_number} onChange={e=>setOfferForm(p=>({...p,mc_number:e.target.value}))} placeholder='MC number'
                    className='h-7 px-2.5 text-xs bg-surface-600 border border-surface-400 rounded-lg text-gray-200 placeholder-gray-600 focus:outline-none'/>
                  <input value={offerForm.phone} onChange={e=>setOfferForm(p=>({...p,phone:e.target.value}))} placeholder='Phone'
                    className='h-7 px-2.5 text-xs bg-surface-600 border border-surface-400 rounded-lg text-gray-200 placeholder-gray-600 focus:outline-none'/>
                  <input value={offerForm.offered_rate} onChange={e=>setOfferForm(p=>({...p,offered_rate:e.target.value}))} type='number' min='0' step='0.01' placeholder='Offered rate ($)'
                    className='h-7 px-2.5 text-xs bg-surface-600 border border-surface-400 rounded-lg text-gray-200 placeholder-gray-600 focus:outline-none'/>
                  <select value={offerForm.status} onChange={e=>setOfferForm(p=>({...p,status:e.target.value as OfferForm['status']}))}
                    className='h-7 px-2.5 text-xs bg-surface-600 border border-surface-400 rounded-lg text-gray-200 focus:outline-none'>
                    <option value='Pending'>Pending</option>
                    <option value='Accepted'>Accepted</option>
                    <option value='Rejected'>Rejected</option>
                    <option value='Countered'>Countered</option>
                  </select>
                  <input value={offerForm.counter_rate} onChange={e=>setOfferForm(p=>({...p,counter_rate:e.target.value}))} type='number' min='0' step='0.01' placeholder='Counter rate ($)'
                    className='h-7 px-2.5 text-xs bg-surface-600 border border-surface-400 rounded-lg text-gray-200 placeholder-gray-600 focus:outline-none'/>
                  <input value={offerForm.final_rate} onChange={e=>setOfferForm(p=>({...p,final_rate:e.target.value}))} type='number' min='0' step='0.01' placeholder='Final rate ($)'
                    className='col-span-2 h-7 px-2.5 text-xs bg-surface-600 border border-surface-400 rounded-lg text-gray-200 placeholder-gray-600 focus:outline-none'/>
                </div>
                <input value={offerForm.notes} onChange={e=>setOfferForm(p=>({...p,notes:e.target.value}))} placeholder='Notes'
                  className='w-full h-7 px-2.5 text-xs bg-surface-600 border border-surface-400 rounded-lg text-gray-200 placeholder-gray-600 focus:outline-none'/>
                <div className='flex gap-2'>
                  <button onClick={saveOffer} disabled={!offerForm.carrier_name.trim()} className='px-3 py-1 text-2xs font-medium bg-orange-600 hover:bg-orange-500 text-white rounded-lg disabled:opacity-40'>Save</button>
                  <button onClick={()=>{setShowOfferForm(false);setEditOfferId(null);setOfferForm(OFFER_BLANK)}} className='px-3 py-1 text-2xs text-gray-500 hover:text-gray-300 rounded-lg'>Cancel</button>
                </div>
              </div>
            )}
            {carrierOffers.length === 0
              ? <p className='text-2xs text-gray-700 italic'>No carrier offers yet.</p>
              : [...carrierOffers].sort((a,b)=>(a.status==='Accepted'?-1:b.status==='Accepted'?1:0)).map(o => (
                <div key={o.id} className={`group/offer flex items-start gap-2 py-2 border-b border-surface-600 last:border-0 ${o.status==='Accepted'?'bg-green-900/15 rounded-lg px-2 -mx-2 border-green-800/30':''}` }>
                  <div className='flex-1 min-w-0'>
                    <div className='flex items-center gap-2 flex-wrap'>
                      <span className={`text-xs font-medium ${o.status==='Accepted'?'text-green-300':'text-gray-200'}`}>{o.carrier_name}</span>
                      {o.mc_number && <span className='text-2xs text-gray-600'>{o.mc_number}</span>}
                      <span className={`text-2xs px-1.5 py-0 rounded border ${o.status==='Accepted'?'border-green-600/60 text-green-400 font-semibold':o.status==='Rejected'?'border-red-700/40 text-red-400':o.status==='Countered'?'border-yellow-700/40 text-yellow-400':'border-surface-400 text-gray-600'}`}>{o.status}</span>
                    </div>
                    <div className='flex items-center gap-3 mt-0.5 flex-wrap'>
                      {o.offered_rate != null && <span className='text-2xs text-gray-500'>offered <span className='font-mono text-gray-300'>${o.offered_rate.toLocaleString()}</span></span>}
                      {o.counter_rate != null && <span className='text-2xs text-gray-500'>counter <span className='font-mono text-yellow-400'>${o.counter_rate.toLocaleString()}</span></span>}
                      {o.final_rate != null && <span className='text-2xs text-gray-500'>final <span className='font-mono text-green-400'>${o.final_rate.toLocaleString()}</span></span>}
                    </div>
                    {o.phone && <p className='text-2xs text-gray-700 mt-0.5'>{o.phone}</p>}
                    {o.notes && <p className='text-2xs text-gray-600 mt-0.5 truncate'>{o.notes}</p>}
                  </div>
                  <div className='flex gap-1 opacity-0 group-hover/offer:opacity-100 transition-all'>
                    {o.status === 'Pending' && (
                      <button onClick={e=>{e.stopPropagation();acceptOfferDirect(o)}} title='Accept this offer'
                        className='p-1 rounded hover:bg-surface-600 text-gray-600 hover:text-green-400'>
                        <Check size={10}/>
                      </button>
                    )}
                    <button onClick={()=>openEditOffer(o)} className='p-1 rounded hover:bg-surface-600 text-gray-600 hover:text-orange-400'><Edit2 size={10}/></button>
                    <button onClick={()=>delOffer(o.id)} className='p-1 rounded hover:bg-surface-600 text-gray-600 hover:text-red-400'><X size={10}/></button>
                  </div>
                </div>
              ))
            }
            <ContextGuidancePanel docs={resolveGuidance('carrier-offers', allDocs)} label='Carrier Offer SOPs'/>
          </div>

          {/* Carrier Vetting */}
          <div className='px-5 py-4 border-b border-surface-600'>
            <div className='flex items-center justify-between mb-3'>
              <Sec title='Carrier Vetting'/>
              <div className='flex items-center gap-2 mb-3'>
                {!editVetting && (
                  <button onClick={openEditVetting} className='flex items-center gap-1 text-2xs text-gray-600 hover:text-orange-400 transition-colors'>
                    <Edit2 size={10}/>{vetting ? 'Edit' : 'New'}
                  </button>
                )}
                {vetting && !editVetting && (
                  <button onClick={delVetting} className='flex items-center gap-1 text-2xs text-gray-600 hover:text-red-400 transition-colors ml-1'>
                    <Trash2 size={10}/>
                  </button>
                )}
              </div>
            </div>
            {editVetting && (
              <div className='mb-3 p-3 rounded-lg bg-surface-700 space-y-2'>
                <div className='grid grid-cols-2 gap-2'>
                  <input value={vettingForm.carrier_name} onChange={e=>setVettingForm(p=>({...p,carrier_name:e.target.value}))} placeholder='Carrier name'
                    className='h-7 px-2.5 text-xs bg-surface-600 border border-surface-400 rounded-lg text-gray-200 placeholder-gray-600 focus:outline-none'/>
                  <input value={vettingForm.carrier_mc} onChange={e=>setVettingForm(p=>({...p,carrier_mc:e.target.value}))} placeholder='MC number'
                    className='h-7 px-2.5 text-xs bg-surface-600 border border-surface-400 rounded-lg text-gray-200 placeholder-gray-600 focus:outline-none'/>
                  <select value={vettingForm.safety_rating} onChange={e=>setVettingForm(p=>({...p,safety_rating:e.target.value}))}
                    className='h-7 px-2.5 text-xs bg-surface-600 border border-surface-400 rounded-lg text-gray-200 focus:outline-none'>
                    <option value=''>Safety rating</option>
                    <option value='Satisfactory'>Satisfactory</option>
                    <option value='Conditional'>Conditional</option>
                    <option value='Unsatisfactory'>Unsatisfactory</option>
                    <option value='Not Rated'>Not Rated</option>
                  </select>
                  <input value={vettingForm.vetting_date} onChange={e=>setVettingForm(p=>({...p,vetting_date:e.target.value}))} type='date'
                    className='h-7 px-2.5 text-xs bg-surface-600 border border-surface-400 rounded-lg text-gray-200 focus:outline-none'/>
                </div>
                <div className='flex items-center gap-4 py-1'>
                  {([['insurance_verified','Insurance verified'],['authority_active','Authority active'],['carrier_packet_received','Packet received']] as const).map(([field, label]) => (
                    <label key={field} className='flex items-center gap-1.5 cursor-pointer'>
                      <input type='checkbox' checked={vettingForm[field]===1}
                        onChange={e=>setVettingForm(p=>({...p,[field]:e.target.checked?1:0}))}
                        className='w-3 h-3 accent-orange-500'/>
                      <span className='text-2xs text-gray-400'>{label}</span>
                    </label>
                  ))}
                </div>
                <input value={vettingForm.notes} onChange={e=>setVettingForm(p=>({...p,notes:e.target.value}))} placeholder='Notes'
                  className='w-full h-7 px-2.5 text-xs bg-surface-600 border border-surface-400 rounded-lg text-gray-200 placeholder-gray-600 focus:outline-none'/>
                <div className='flex gap-2'>
                  <button onClick={saveVetting} className='px-3 py-1 text-2xs font-medium bg-orange-600 hover:bg-orange-500 text-white rounded-lg'>Save</button>
                  <button onClick={()=>setEditVetting(false)} className='px-3 py-1 text-2xs text-gray-500 hover:text-gray-300 rounded-lg'>Cancel</button>
                </div>
              </div>
            )}
            {!editVetting && vetting && (
              <div className='space-y-2'>
                {(vetting.carrier_name || vetting.carrier_mc) && (
                  <div className='flex items-center gap-2 flex-wrap'>
                    <span className='text-xs text-gray-200 font-medium'>{vetting.carrier_name ?? '—'}</span>
                    {vetting.carrier_mc && <span className='text-2xs text-gray-600'>{vetting.carrier_mc}</span>}
                  </div>
                )}
                {acceptedOffer && (
                  (() => {
                    const nameMismatch = vetting.carrier_name && acceptedOffer.carrier_name &&
                      vetting.carrier_name.trim().toLowerCase() !== acceptedOffer.carrier_name.trim().toLowerCase()
                    const mcMismatch = vetting.carrier_mc && acceptedOffer.mc_number &&
                      vetting.carrier_mc.trim() !== acceptedOffer.mc_number.trim()
                    return (nameMismatch || mcMismatch) ? (
                      <p className='text-2xs text-yellow-500/80 border border-yellow-700/30 rounded px-2 py-1 bg-yellow-900/10'>
                        Vetting carrier differs from accepted offer ({acceptedOffer.carrier_name}{acceptedOffer.mc_number ? ` · ${acceptedOffer.mc_number}` : ''})
                      </p>
                    ) : null
                  })()
                )}
                <div className='flex items-center gap-3 flex-wrap'>
                  {([['insurance_verified','Insurance'],['authority_active','Authority'],['carrier_packet_received','Packet']] as const).map(([field, label]) => (
                    <span key={field} className={`text-2xs flex items-center gap-1 ${vetting[field]===1?'text-green-400':'text-gray-600'}`}>
                      {vetting[field]===1?<Check size={10}/>:<X size={10}/>}{label}
                    </span>
                  ))}
                </div>
                {vetting.safety_rating && (
                  <span className={`text-2xs px-1.5 py-0 rounded border inline-block ${vetting.safety_rating==='Satisfactory'?'border-green-700/40 text-green-500':vetting.safety_rating==='Conditional'?'border-yellow-700/40 text-yellow-400':'border-red-700/40 text-red-400'}`}>
                    {vetting.safety_rating}
                  </span>
                )}
                {vetting.vetting_date && <p className='text-2xs text-gray-600'>Vetted {fmt(vetting.vetting_date)}</p>}
                {vetting.notes && <p className='text-2xs text-gray-600'>{vetting.notes}</p>}
              </div>
            )}
            {!editVetting && !vetting && (
              <p className='text-2xs text-gray-700 italic'>No vetting record yet.</p>
            )}
            <ContextGuidancePanel docs={resolveGuidance('carrier-vetting', allDocs)} label='Vetting SOPs'/>
          </div>

          </>)}
          {/* Deductions */}
          {['Delivered','Invoiced','Paid'].includes(load.status) && (
          <div className='px-5 py-4 border-b border-surface-600'>
            <div className='flex items-center justify-between mb-3'>
              <Sec title='Deductions'/>
              <button onClick={()=>setAddDed(v=>!v)} className='flex items-center gap-1 text-2xs text-gray-600 hover:text-orange-400 transition-colors mb-3'><Plus size={10}/>Add</button>
            </div>
            {addDed&&(
              <div className='mb-3 p-3 rounded-lg bg-surface-700 space-y-2'>
                <input value={dedLabel} onChange={e=>setDedLabel(e.target.value)} placeholder='Label (e.g. Fuel Advance)'
                  className='w-full h-7 px-2.5 text-xs bg-surface-600 border border-surface-400 rounded-lg text-gray-200 placeholder-gray-600 focus:outline-none'/>
                <div className='flex items-center gap-2'>
                  <input value={dedAmount} onChange={e=>setDedAmount(e.target.value)} type='number' min='0' step='0.01' placeholder='Amount ($)'
                    className='w-28 h-7 px-2.5 text-xs bg-surface-600 border border-surface-400 rounded-lg text-gray-200 placeholder-gray-600 focus:outline-none'/>
                  <div className='flex-1'/>
                  <button onClick={saveDed} disabled={!dedLabel.trim()||!dedAmount} className='px-3 py-1 text-2xs font-medium bg-orange-600 hover:bg-orange-500 text-white rounded-lg disabled:opacity-40'>Save</button>
                  <button onClick={()=>{setAddDed(false);setDedLabel('');setDedAmount('')}} className='px-3 py-1 text-2xs text-gray-500 hover:text-gray-300 rounded-lg'>Cancel</button>
                </div>
              </div>
            )}
            {deductions.length===0
              ?<p className='text-2xs text-gray-700 italic'>No deductions — driver receives gross minus dispatch fee.</p>
              :<>
                {deductions.map(d=>(
                  <div key={d.id} className='group/ded flex items-center gap-2 py-2 border-b border-surface-600 last:border-0'>
                    <div className='flex-1 min-w-0'>
                      <span className='text-xs text-gray-300'>{d.label}</span>
                      <span className='text-xs text-red-400 font-mono ml-2'>-${d.amount.toFixed(2)}</span>
                    </div>
                    <button onClick={()=>delDed(d.id)} className='opacity-0 group-hover/ded:opacity-100 p-1 rounded hover:bg-surface-600 text-gray-600 hover:text-red-400 transition-all'><X size={10}/></button>
                  </div>
                ))}
                <div className='pt-2 text-2xs text-gray-600'>
                  Total deducted: <span className='text-red-400 font-mono'>${deductions.reduce((s,d)=>s+d.amount,0).toFixed(2)}</span>
                </div>
              </>
            }
          </div>
          )}
          {/* Attachments */}
          <div className='px-5 py-4 border-b border-surface-600'>
            <div className='flex items-center justify-between mb-3'>
              <Sec title='Attachments'/>
              <button onClick={()=>setAddAtt(v=>!v)} className='flex items-center gap-1 text-2xs text-gray-600 hover:text-orange-400 transition-colors mb-3'><Plus size={10}/>Add</button>
            </div>
            {addAtt&&(
              <div className='mb-3 p-3 rounded-lg bg-surface-700 space-y-2'>
                <input value={attTitle} onChange={e=>setAttTitle(e.target.value)} placeholder='File title'
                  className='w-full h-7 px-2.5 text-xs bg-surface-600 border border-surface-400 rounded-lg text-gray-200 placeholder-gray-600 focus:outline-none'/>
                <div className='flex items-center gap-2'>
                  <button onClick={pickAttachment}
                    className='flex items-center gap-1 px-2.5 py-1 text-2xs text-gray-400 hover:text-orange-400 bg-surface-600 hover:bg-surface-500 rounded-lg transition-colors border border-surface-400'>
                    <Paperclip size={10}/>
                    {pendingFile ? <span className='truncate max-w-[140px]'>{pendingFile.displayName}</span> : 'Choose File'}
                  </button>
                  <div className='flex-1'/>
                  <button onClick={saveAttachment} disabled={!pendingFile||!attTitle.trim()} className='px-3 py-1 text-2xs font-medium bg-orange-600 hover:bg-orange-500 text-white rounded-lg disabled:opacity-40'>Save</button>
                  <button onClick={()=>{setAddAtt(false);setPendingFile(null);setAttTitle('')}} className='px-3 py-1 text-2xs text-gray-500 hover:text-gray-300 rounded-lg'>Cancel</button>
                </div>
              </div>
            )}
            {attachments.length===0
              ?<p className='text-2xs text-gray-700 italic'>No attachments.</p>
              :attachments.map(a=>(
                <div key={a.id} className='group/att flex items-center gap-2 py-2 border-b border-surface-600 last:border-0'>
                  <div className='flex-1 min-w-0'>
                    <button onClick={()=>window.api.loadAttachments.open(a.file_path)}
                      className='flex items-center gap-1 text-xs text-orange-400 hover:text-orange-300 font-medium transition-colors truncate'>
                      <FileText size={11}/>{a.title}
                    </button>
                    <p className='text-2xs text-gray-700 mt-0.5'>{a.file_name}</p>
                  </div>
                  <button onClick={()=>delAttachment(a.id)} className='opacity-0 group-hover/att:opacity-100 p-1 rounded hover:bg-surface-600 text-gray-600 hover:text-red-400 transition-all'><X size={10}/></button>
                </div>
              ))
            }
          </div>
          {/* Check Calls */}
          <div className='px-5 py-4 border-b border-surface-600'>
            <div className='flex items-center justify-between mb-3'>
              <Sec title='Check Calls'/>
              <button onClick={()=>setAddCall(v=>!v)} className='flex items-center gap-1 text-2xs text-gray-600 hover:text-orange-400 transition-colors mb-3'><Plus size={10}/>Log Call</button>
            </div>
            {addCall&&(
              <div className='mb-3'>
                <input value={callLabel} onChange={e=>setCallLabel(e.target.value)}
                  placeholder='e.g. Picked up CHI — ETA Dallas Fri 4pm'
                  className='w-full h-7 px-2.5 text-xs bg-surface-600 border border-surface-400 rounded-lg text-gray-200 placeholder-gray-600 focus:outline-none mb-1.5'/>
                <div className='flex gap-2'>
                  <button onClick={saveCheckCall} className='px-3 py-1 text-2xs font-medium bg-orange-600 hover:bg-orange-500 text-white rounded-lg'>Save</button>
                  <button onClick={()=>{setAddCall(false);setCallLabel('')}} className='px-3 py-1 text-2xs text-gray-500 hover:text-gray-300 rounded-lg'>Cancel</button>
                </div>
              </div>
            )}
            {checkCalls.length===0
              ?<p className='text-2xs text-gray-700 italic'>No check calls logged.</p>
              :checkCalls.map(c=>(
                <div key={c.id} className='group/cc flex items-start gap-2 py-2 border-b border-surface-600 last:border-0'>
                  <Phone size={10} className='text-gray-600 mt-0.5 shrink-0'/>
                  <div className='flex-1 min-w-0'>
                    <p className='text-xs text-gray-300'>{c.label}</p>
                    <p className='text-2xs text-gray-700 mt-0.5'>{fmtDT(c.created_at)}</p>
                  </div>
                  <button onClick={()=>delCheckCall(c.id)} className='opacity-0 group-hover/cc:opacity-100 p-1 rounded hover:bg-surface-600 text-gray-600 hover:text-red-400 transition-all'><X size={10}/></button>
                </div>
              ))
            }
            <ContextGuidancePanel docs={resolveGuidance('dispatch-board', allDocs)} label='Check Call SOPs'/>
          </div>
          {/* Message Templates */}
          {driver && (
            <div className='px-5 py-4 border-b border-surface-600'>
              <button
                onClick={() => setShowMsgTemplates(v => !v)}
                className='flex items-center justify-between w-full mb-0'
              >
                <div className='flex items-center gap-2'>
                  <MessageSquare size={12} className='text-gray-500 shrink-0' />
                  <p className='text-2xs font-medium text-gray-400 uppercase tracking-wider'>Message Templates</p>
                </div>
                <ChevronDown size={12} className={`text-gray-600 transition-transform ${showMsgTemplates ? 'rotate-180' : ''}`} />
              </button>
              {showMsgTemplates && (
                <div className='mt-3 space-y-2'>
                  {MSG_TEMPLATES.map(t => (
                    <div key={t.id} className='rounded-lg border border-surface-500/60 overflow-hidden'>
                      <div className='flex items-center justify-between px-3 py-2 bg-surface-700/50'>
                        <span className='text-2xs font-medium text-gray-400'>{t.label}</span>
                        <button
                          onClick={() => copyMsg(t.id, t.text)}
                          className={`flex items-center gap-1 px-2 py-0.5 text-2xs font-medium rounded transition-colors ${copiedMsg===t.id ? 'bg-green-700 text-white' : 'bg-surface-600 hover:bg-surface-500 text-gray-300'}`}
                        >
                          {copiedMsg===t.id ? <Check size={10}/> : <Copy size={10}/>}
                          {copiedMsg===t.id ? 'Copied' : 'Copy'}
                        </button>
                      </div>
                      <p className='px-3 py-2 text-2xs text-gray-500 leading-relaxed'>{t.text}</p>
                    </div>
                  ))}
                  <p className='text-2xs text-gray-700 mt-1'>Paste into SMS, WhatsApp, or your preferred messaging app.</p>
                </div>
              )}
            </div>
          )}

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
