import { useState, useEffect, useMemo } from 'react'
import { X, Phone, Edit2, Trash2, Plus, AlertTriangle, Paperclip, FileText, Pencil, Check, MapPin, ScrollText, CheckCircle2, Circle, ChevronDown, Printer, TrendingUp } from 'lucide-react'
import type { Driver, DriverDocument, DriverDocType, DriverStatus, Load, Note, Invoice, SopDocument, LoadOfferStats, DriverWeeklyScorecard, DriverFalloutStats } from '../../types/models'
import { DRIVER_STATUS_STYLES, DRIVER_STATUSES, DOC_TYPES } from './constants'
import { type as typeTokens, badge as badgeTokens } from '../../styles/uiTokens'
import { computeDriverTier, TIER_BADGE, TIER_LABEL } from '../../lib/driverTierService'
import { openSaferMc } from '../../lib/saferUrl'
import { DispatchAgreementModal } from './DispatchAgreementModal'
import { Term } from '../ui/Term'
import { resolveGuidance } from '../../lib/guidanceResolver'
import { ContextGuidancePanel } from '../ui/ContextGuidancePanel'

// Defined at module level so JSX is not nested inside an IIFE inside JSX
// (which causes Babel parse errors in some Vite configurations).
// String props use {"..."} to avoid backslash-escape issues in JSX attributes.
const DRIVER_SETUP_ITEMS: { id: string; label: React.ReactNode }[] = [
  { id: 'agreement',      label: 'Dispatch agreement signed' },
  { id: 'coi',            label: <><Term word='COI' def={'Certificate of Insurance — proof that the carrier has active liability and cargo insurance. Required by every broker before moving freight. Must list the broker as a certificate holder for each broker they work with.'}>COI</Term> collected</> },
  { id: 'w9',             label: <><Term word='W-9' def={"IRS tax form that gives you the carrier's taxpayer identification number. Required before you can issue a 1099 at year end. Collect before the first load moves."}>W-9</Term> form collected</> },
  { id: 'broker-packets', label: <><Term word='carrier packet' def={'A set of documents brokers require before approving a carrier: MC authority, insurance certificate (COI), W-9, and sometimes a signed broker-carrier agreement. Each broker has its own packet requirements.'}>Carrier packet</Term> sent to 5+ brokers</> },
  { id: 'rmis',           label: <><Term word='RMIS' def={'Risk Management Information System — a database brokers use to verify carrier insurance and safety records. Many brokers require carriers to register at rmissecure.com before they will work with them.'}>RMIS</Term> or Carrier411 verified</> },
  { id: 'first-load',     label: 'First load booked' },
]

interface Props {
  driver: Driver; onClose: () => void; onEdit: (d: Driver) => void
  onStatusChange: (d: Driver, s: DriverStatus) => void; onDelete: (d: Driver) => void
  onUpdate?: (d: Driver) => void
}
const EXPIRY_WARN = 60 * 24 * 3600 * 1000
const isExp = (d: string | null) => d != null && new Date(d).getTime() < Date.now() + EXPIRY_WARN

// Returns human-readable MC age and the raw day count (null if no authority_date set)
function mcAge(authorityDate: string | null): { label: string; days: number } | null {
  if (!authorityDate) return null
  const days = Math.floor((Date.now() - new Date(authorityDate).getTime()) / (1000 * 3600 * 24))
  if (days < 0) return null
  if (days < 30)  return { label: `${days}d`, days }
  if (days < 365) return { label: `${Math.floor(days / 30)}mo`, days }
  const yrs = Math.floor(days / 365)
  const rem = Math.floor((days % 365) / 30)
  return { label: rem > 0 ? `${yrs}yr ${rem}mo` : `${yrs}yr`, days }
}
const fmt = (d: string | null) => { if (!d) return '—'; const [y,m,day]=d.split('-'); return `${m}/${day}/${y}` }
const fmtDT = (dt: string) => new Date(dt).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})
function Row({ label, value, mono=false }: { label:string; value:string; mono?:boolean }) {
  return <div><p className={typeTokens.label}>{label}</p><p className={`text-sm mt-0.5 ${mono?'font-mono':''} ${value==='—'?'text-gray-500':typeTokens.value}`}>{value}</p></div>
}
function Sec({ title }: { title:string }) {
  return <p className={`${typeTokens.sectionTitle} mb-3`}>{title}</p>
}
export function DriverDrawer({ driver, onClose, onEdit, onStatusChange, onDelete, onUpdate }: Props) {
  const [docs,setDocs]         = useState<DriverDocument[]>([])
  const [notes,setNotes]       = useState<Note[]>([])
  const [load,setLoad]           = useState<Load|null>(null)
  const [allDriverLoads,setAllDriverLoads] = useState<Load[]>([])
  const [payHistory,setPayHistory] = useState<Invoice[]>([])
  const [noteText,setNoteText] = useState('')
  const [addNote,setAddNote]   = useState(false)
  const [addDoc,setAddDoc]     = useState(false)
  const [docForm,setDocForm]   = useState({ title:'',doc_type:'CDL' as DriverDocType,expiry_date:'',notes:'' })
  const [pendingFile,setPendingFile] = useState<{ storedPath:string; displayName:string }|null>(null)
  const [confirmDel,setConf]   = useState(false)
  const [localLocation,setLocalLocation]     = useState<string|null>(driver.current_location)
  const [editingLocation,setEditingLocation] = useState(false)
  const [locationText,setLocationText]       = useState(driver.current_location??'')
  const [showAgreement,setShowAgreement]     = useState(false)
  const [setupChecks,setSetupChecks]         = useState<Record<string,boolean>>({})
  const [setupOpen,setSetupOpen]             = useState(true)
  const [approvals,setApprovals]             = useState<CarrierBrokerApprovalRow[]>([])
  const [approvalsOpen,setApprovalsOpen]     = useState(false)
  const [addApproval,setAddApproval]         = useState(false)
  const [allBrokers,setAllBrokers]           = useState<{ id:number; name:string }[]>([])
  const [apprForm,setApprForm]               = useState<{ broker_id:string; status:'Submitted'|'Approved'|'Denied'; notes:string; submitted_at:string; approved_at:string }>({ broker_id:'', status:'Submitted', notes:'', submitted_at:'', approved_at:'' })
  const [sopDocs,setSopDocs]                 = useState<SopDocument[]>([])
  const [offerStats,setOfferStats]           = useState<LoadOfferStats | null>(null)
  const [falloutStats,setFalloutStats]       = useState<DriverFalloutStats | null>(null)
  const [weeklyCard,setWeeklyCard]           = useState<DriverWeeklyScorecard | null>(null)

  useEffect(() => {
    // Sync whenever we switch to a different driver OR the saved value changes
    // (e.g. after onUpdate pushes the confirmed DB value back through the prop).
    // Skip sync while the user is actively editing so we don't clobber their input.
    if (!editingLocation) {
      setLocalLocation(driver.current_location)
      setLocationText(driver.current_location ?? '')
    }
  }, [driver.id, driver.current_location]) // eslint-disable-line react-hooks/exhaustive-deps

  const saveLocation = async () => {
    const val = locationText.trim() || null
    setLocalLocation(val)
    setEditingLocation(false)
    const updated = await window.api.drivers.update(driver.id, { current_location: val })
    if (updated) onUpdate?.(updated)
  }

  // useEffect for data fetch below
  useEffect(() => {
    try {
      Promise.all([
        window.api.driverDocs.list(driver.id),
        window.api.notes.list('driver', driver.id),
        window.api.loads.list(),
        window.api.driverOnboarding.get(driver.id),
        window.api.invoices.list(),
        window.api.carrierApprovals.list(driver.id),
        window.api.brokers.list(),
      ]).then(([d,n,loads,checks,invs,apprvs,brkrs]) => {
        setDocs(d); setNotes(n)
        const driverLoads = (loads as Load[]).filter(l=>l.driver_id===driver.id)
        const active = driverLoads.filter(l=>['Booked','Picked Up','In Transit'].includes(l.status))
        setLoad(active[0]??null)
        setAllDriverLoads(driverLoads)
        setSetupChecks(checks as Record<string, boolean>)
        const history = (invs as Invoice[]).filter(i=>i.driver_id===driver.id&&i.status==='Paid')
          .sort((a,b)=>(b.paid_date??'').localeCompare(a.paid_date??'')).slice(0,20)
        setPayHistory(history)
        setApprovals(apprvs as CarrierBrokerApprovalRow[])
        setAllBrokers((brkrs as { id:number; name:string }[]).map(b => ({ id:b.id, name:b.name })))
        window.api.documents.list().then(setSopDocs).catch(() => {})
        window.api.loadOffers.getDriverStats(driver.id).then(setOfferStats).catch(() => {})
        window.api.drivers.falloutStats(driver.id).then(setFalloutStats).catch(() => {})
        window.api.drivers.weeklyScorecard(driver.id).then(setWeeklyCard).catch(() => {})
      }).catch(err => {
        console.error('DriverDrawer: data fetch error', err)
        // Fall back to core data only (works even when app window hasn't been fully reloaded)
        Promise.all([
          window.api.driverDocs.list(driver.id),
          window.api.notes.list('driver', driver.id),
          window.api.loads.list(),
          window.api.driverOnboarding.get(driver.id),
        ]).then(([d,n,loads,checks]) => {
          setDocs(d); setNotes(n)
          const active = (loads as Load[]).filter(l=>l.driver_id===driver.id&&['Booked','Picked Up','In Transit'].includes(l.status))
          setLoad(active[0]??null)
          setSetupChecks(checks as Record<string, boolean>)
        }).catch(() => { /* non-critical */ })
      })
    } catch (err) {
      // Catches synchronous access errors (e.g. window.api.X undefined during dev hot-reload)
      console.error('DriverDrawer: API unavailable', err)
    }
  }, [driver.id])

  const toggleSetupCheck = async (id: string) => {
    const newVal = !setupChecks[id]
    setSetupChecks(prev => ({ ...prev, [id]: newVal }))
    const updated = await window.api.driverOnboarding.set(driver.id, id, newVal)
    setSetupChecks(updated)
  }

  const saveApproval = async () => {
    if (!apprForm.broker_id) return
    const brokerId = parseInt(apprForm.broker_id)
    const broker   = allBrokers.find(b => b.id === brokerId)
    if (!broker) return
    const row = await window.api.carrierApprovals.upsert({
      driver_id:    driver.id,
      broker_id:    brokerId,
      broker_name:  broker.name,
      status:       apprForm.status,
      notes:        apprForm.notes.trim() || null,
      submitted_at: apprForm.submitted_at || null,
      approved_at:  apprForm.approved_at  || null,
    })
    setApprovals(p => {
      const filtered = p.filter(a => a.broker_id !== brokerId)
      return [...filtered, row].sort((a,b) => a.broker_name.localeCompare(b.broker_name))
    })
    setApprForm({ broker_id:'', status:'Submitted', notes:'', submitted_at:'', approved_at:'' })
    setAddApproval(false)
  }
  const delApproval = async (id: number) => {
    await window.api.carrierApprovals.delete(id)
    setApprovals(p => p.filter(a => a.id !== id))
  }

  const [earningsMonth, setEarningsMonth] = useState(() => {
    const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
  })
  const [showEarningsPicker, setShowEarningsPicker] = useState(false)

  const printEarningsStatement = () => {
    const [yr, mo] = earningsMonth.split('-').map(Number)
    const monthName = new Date(yr, mo - 1, 1).toLocaleString('en-US', { month: 'long', year: 'numeric' })
    const monthLoads = payHistory.filter(inv => {
      const d = inv.paid_date ?? inv.week_ending ?? ''
      return d.startsWith(earningsMonth)
    })
    if (monthLoads.length === 0) {
      // Include all available history for chosen month across all invoices — re-query the full list
    }
    const invLines = monthLoads
    const totalGross     = invLines.reduce((s,i) => s + (i.driver_gross ?? 0), 0)
    const totalDispatch  = invLines.reduce((s,i) => s + (i.dispatch_fee ?? 0), 0)
    const totalNet       = totalGross - totalDispatch

    const PRINT_STYLE = `<style>
      *{box-sizing:border-box;margin:0;padding:0;}
      body{font-family:Arial,sans-serif;font-size:12px;color:#111;padding:36px;}
      h1{font-size:20px;font-weight:700;margin-bottom:2px;}
      .sub{color:#555;font-size:11px;margin-bottom:20px;}
      table{width:100%;border-collapse:collapse;margin-top:16px;}
      th{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#666;border-bottom:2px solid #ddd;padding:6px 8px;text-align:left;}
      td{padding:7px 8px;border-bottom:1px solid #eee;font-size:11px;}
      td.num{text-align:right;font-family:monospace;}
      .total-row td{font-weight:700;border-top:2px solid #999;border-bottom:none;}
      .summary{margin-top:24px;background:#f5f5f5;border:1px solid #ddd;border-radius:4px;padding:14px 18px;}
      .summary-row{display:flex;justify-content:space-between;margin-bottom:6px;font-size:12px;}
      .summary-row.net{font-size:16px;font-weight:700;margin-top:10px;padding-top:10px;border-top:1px solid #ccc;}
      .footer{margin-top:32px;padding-top:12px;border-top:1px solid #ddd;font-size:9px;color:#999;}
    </style>`

    const rows = invLines.map(i => `<tr>
      <td>${i.invoice_number}</td>
      <td>${fmt(i.week_ending ?? i.paid_date)}</td>
      <td>${fmt(i.paid_date)}</td>
      <td class="num">$${(i.driver_gross ?? 0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}</td>
      <td class="num">${i.dispatch_fee != null ? '$' + i.dispatch_fee.toFixed(2) : '—'}</td>
      <td class="num">$${((i.driver_gross ?? 0) - (i.dispatch_fee ?? 0)).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}</td>
    </tr>`).join('')

    const html = PRINT_STYLE + `
      <h1>Driver Earnings Statement</h1>
      <div class="sub">${monthName} &nbsp;&bull;&nbsp; ${driver.name}${driver.company ? ' (' + driver.company + ')' : ''} &nbsp;&bull;&nbsp; OnTrack Hauling Solutions</div>
      ${invLines.length === 0 ? '<p style="color:#999;font-style:italic;">No paid invoices found for this period.</p>' : `
      <table>
        <thead><tr>
          <th>Invoice #</th><th>Week Ending</th><th>Paid Date</th>
          <th style="text-align:right">Gross Rate</th><th style="text-align:right">Dispatch Fee</th><th style="text-align:right">Driver Net</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <div class="summary">
        <div class="summary-row"><span>Total Gross Revenue</span><span>$${totalGross.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}</span></div>
        <div class="summary-row"><span>Total Dispatch Fees</span><span>-$${totalDispatch.toFixed(2)}</span></div>
        <div class="summary-row net"><span>Driver Net Pay</span><span>$${totalNet.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}</span></div>
      </div>`}
      <div class="footer">Generated ${new Date().toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'})} &bull; OnTrack Hauling Solutions &bull; dispatch@ontrackhaulingsolutions.com &bull; For internal use only.</div>
    `
    const style = document.createElement('style')
    style.id = '__es_print_style'
    style.textContent = '@media print { body > * { display:none !important; } #es-print-root { display:block !important; } } #es-print-root { display:none; }'
    document.head.appendChild(style)
    const root = document.createElement('div')
    root.id = 'es-print-root'
    root.innerHTML = html
    document.body.appendChild(root)
    window.print()
    document.body.removeChild(root)
    document.head.removeChild(style)
    setShowEarningsPicker(false)
  }

  const saveNote = async () => {
    if (!noteText.trim()) return
    const n = await window.api.notes.create({entity_type:'driver',entity_id:driver.id,content:noteText.trim(),user_id:null})
    setNotes(p=>[n,...p]); setNoteText(''); setAddNote(false)
  }
  const delNote = async (id:number) => { await window.api.notes.delete(id); setNotes(p=>p.filter(n=>n.id!==id)) }
  const pickFile = async () => {
    const result = await window.api.driverDocs.pickFile(driver.id)
    if (result) setPendingFile(result)
  }
  const saveDoc = async () => {
    if (!docForm.title.trim()) return
    const d = await window.api.driverDocs.create({
      driver_id:driver.id,title:docForm.title.trim(),doc_type:docForm.doc_type,
      file_path:pendingFile?.storedPath??null,expiry_date:docForm.expiry_date||null,notes:docForm.notes||null,
    })
    setDocs(p=>[d,...p])
    setDocForm({title:'',doc_type:'CDL',expiry_date:'',notes:''})
    setPendingFile(null)
    setAddDoc(false)
  }
  const delDoc = async (id:number) => { await window.api.driverDocs.delete(id); setDocs(p=>p.filter(d=>d.id!==id)) }

  return (
    <>
    <div className='fixed inset-0 z-50 flex'>
      <div className='flex-1 bg-black/50 backdrop-blur-sm' onClick={onClose} />
      <div className='w-[500px] bg-surface-800 border-l border-surface-400 shadow-2xl flex flex-col overflow-hidden animate-slide-in'>
        <div className='flex items-start justify-between px-5 pt-5 pb-4 border-b border-surface-500 shrink-0'>
          <div className='flex-1 min-w-0'>
            <h2 className='text-lg font-semibold text-gray-100 truncate'>{driver.name}</h2>
            {driver.company&&<p className='text-sm text-gray-500 truncate mt-0.5'>{driver.company}</p>}
            <div className='flex items-center gap-2 mt-2'>
              <span className={`text-2xs px-2 py-0.5 rounded-full border ${DRIVER_STATUS_STYLES[driver.status]}`}>{driver.status}</span>
              {weeklyCard != null && (() => {
                const { tier } = computeDriverTier({
                  accepted_count:       weeklyCard.accepted_count,
                  declined_count:       weeklyCard.declined_count,
                  no_response_count:    weeklyCard.no_response_count,
                  loads_booked:         weeklyCard.loads_booked,
                  acceptance_rate:      weeklyCard.acceptance_rate ?? 0,
                  avg_response_minutes: weeklyCard.avg_response_minutes,
                  fallout_count:        falloutStats?.fallout_count ?? 0,
                })
                return (
                  <span className={`text-2xs px-1.5 py-0.5 rounded font-bold ${TIER_BADGE[tier]}`}>
                    {TIER_LABEL[tier] !== '—' ? `Tier ${TIER_LABEL[tier]}` : 'Unrated'}
                  </span>
                )
              })()}
              {driver.min_rpm!=null&&<span className='text-2xs text-gray-500'>Min RPM: <span className='text-green-400 font-mono font-semibold'>${driver.min_rpm.toFixed(2)}</span></span>}
            </div>
          </div>
          <button onClick={onClose} className='p-1.5 rounded-lg hover:bg-surface-600 text-gray-500 hover:text-gray-300 ml-3 shrink-0'><X size={16}/></button>
        </div>
        <div className='flex-1 overflow-y-auto'>
          {/* Action bar */}
          <div className='flex items-center gap-1.5 px-5 py-3 border-b border-surface-600 flex-wrap shrink-0'>
            <button onClick={()=>onEdit(driver)} className='flex items-center gap-1.5 px-2.5 h-7 text-xs font-medium bg-surface-600 hover:bg-surface-500 text-gray-300 rounded-lg transition-colors'><Edit2 size={11}/>Edit</button>
            {driver.phone&&<a href={`tel:${driver.phone}`} className='flex items-center gap-1.5 px-2.5 h-7 text-xs font-medium bg-surface-600 hover:bg-surface-500 text-gray-300 rounded-lg transition-colors'><Phone size={11}/>Call</a>}
            <button onClick={()=>setShowAgreement(true)} className='flex items-center gap-1.5 px-2.5 h-7 text-xs font-medium bg-surface-600 hover:bg-surface-500 text-gray-300 rounded-lg transition-colors' title='Generate dispatch service agreement'><ScrollText size={11}/>Agreement</button>
            <div className='relative'>
              <button onClick={()=>setShowEarningsPicker(v=>!v)} className='flex items-center gap-1.5 px-2.5 h-7 text-xs font-medium bg-surface-600 hover:bg-surface-500 text-gray-300 rounded-lg transition-colors' title='Print monthly earnings statement'><Printer size={11}/>Earnings</button>
              {showEarningsPicker && (
                <div className='absolute top-9 left-0 z-20 bg-surface-700 border border-surface-400 rounded-lg shadow-xl p-3 min-w-[200px]'>
                  <p className='text-2xs text-gray-500 mb-2 uppercase tracking-wider'>Select Month</p>
                  <input type='month' value={earningsMonth} onChange={e=>setEarningsMonth(e.target.value)}
                    className='w-full h-8 px-2 bg-surface-600 border border-surface-400 rounded text-xs text-gray-300 focus:outline-none focus:border-orange-600/50'/>
                  <button onClick={printEarningsStatement}
                    className='mt-2 w-full h-7 text-xs bg-orange-600 hover:bg-orange-500 text-white rounded-lg font-medium'>
                    Print Statement
                  </button>
                </div>
              )}
            </div>
            {DRIVER_STATUSES.filter(s=>s!==driver.status).map(s=>(
              <button key={s} onClick={()=>onStatusChange(driver,s)} className='px-2 h-7 text-2xs text-gray-400 hover:text-orange-400 rounded hover:bg-surface-600 transition-colors'>→ {s}</button>
            ))}
            <div className='flex-1'/>
            {!confirmDel
              ?<button onClick={()=>setConf(true)} className='p-1.5 rounded hover:bg-surface-600 text-gray-600 hover:text-red-400 transition-colors'><Trash2 size={13}/></button>
              :<div className='flex items-center gap-1'>
                <span className='text-2xs text-red-400'>Delete?</span>
                <button onClick={()=>onDelete(driver)} className='text-2xs px-2 py-0.5 rounded bg-red-900/40 text-red-400 hover:bg-red-900/60'>Yes</button>
                <button onClick={()=>setConf(false)} className='text-2xs px-2 py-0.5 rounded bg-surface-600 text-gray-400'>No</button>
              </div>
            }
          </div>
          {/* Current Load */}
          {load&&(
            <div className='mx-5 mt-4 px-3 py-2.5 rounded-lg bg-blue-900/20 border border-blue-700/30'>
              <p className='text-2xs text-blue-400 font-medium uppercase tracking-wider mb-1'>Current Load</p>
              <p className='text-xs text-gray-300'>
                {[load.origin_city,load.origin_state].filter(Boolean).join(', ')||'—'} → {[load.dest_city,load.dest_state].filter(Boolean).join(', ')||'—'}
              </p>
              <p className='text-2xs text-gray-400 mt-0.5'>
                {load.status}{load.miles!=null?` · ${load.miles.toLocaleString()} mi`:''}{load.rate!=null?` · $${load.rate.toLocaleString()}`:''}
              </p>
            </div>
          )}
          {/* This Week Scorecard */}
          {weeklyCard != null && (
            <div className='mx-5 mt-4 rounded-xl border border-surface-500 bg-surface-700 p-3'>
              <div className='flex items-center gap-2 mb-2.5'>
                <TrendingUp size={11} className='text-orange-400' />
                <p className='text-xs font-semibold text-gray-300 uppercase tracking-wider'>This Week</p>
                {weeklyCard.loads_trend_delta != null && weeklyCard.loads_trend_delta !== 0 && (
                  <span className={`text-2xs font-medium ml-auto ${weeklyCard.loads_trend_delta > 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {weeklyCard.loads_trend_delta > 0 ? '+' : ''}{weeklyCard.loads_trend_delta} vs last wk
                  </span>
                )}
              </div>
              <div className='grid grid-cols-3 gap-x-3 gap-y-2.5'>
                <div>
                  <p className='text-2xs text-gray-500'>Loads</p>
                  <p className='text-sm font-semibold text-gray-200 mt-0.5'>{weeklyCard.loads_booked}</p>
                </div>
                <div>
                  <p className='text-2xs text-gray-500'>Gross</p>
                  <p className='text-sm font-mono text-gray-300 mt-0.5'>
                    {weeklyCard.gross_revenue > 0 ? `$${weeklyCard.gross_revenue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` : '—'}
                  </p>
                </div>
                <div>
                  <p className='text-2xs text-gray-500'>Disp. Cut</p>
                  <p className={`text-sm font-mono font-semibold mt-0.5 ${weeklyCard.dispatcher_revenue > 0 ? 'text-green-400' : 'text-gray-600'}`}>
                    {weeklyCard.dispatcher_revenue > 0
                      ? `$${weeklyCard.dispatcher_revenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                      : '—'}
                    {weeklyCard.revenue_trend_pct != null && (
                      <span className={`text-2xs font-normal ml-1 ${weeklyCard.revenue_trend_pct >= 0 ? 'text-green-500' : 'text-red-400'}`}>
                        {weeklyCard.revenue_trend_pct >= 0 ? '+' : ''}{weeklyCard.revenue_trend_pct}%
                      </span>
                    )}
                  </p>
                </div>
                {weeklyCard.avg_rpm != null && (
                  <div>
                    <p className='text-2xs text-gray-500'>Avg RPM</p>
                    <p className={`text-sm font-mono font-semibold mt-0.5 ${weeklyCard.avg_rpm >= 3 ? 'text-green-400' : weeklyCard.avg_rpm >= 2.5 ? 'text-orange-400' : 'text-red-400'}`}>
                      ${weeklyCard.avg_rpm.toFixed(2)}
                    </p>
                  </div>
                )}
                {(weeklyCard.accepted_count + weeklyCard.declined_count + weeklyCard.no_response_count) > 0 && (
                  <div>
                    <p className='text-2xs text-gray-500'>Acc. Rate</p>
                    <p className={`text-sm font-mono font-semibold mt-0.5 ${
                      weeklyCard.acceptance_rate >= 70 ? 'text-green-400' :
                      weeklyCard.acceptance_rate >= 40 ? 'text-yellow-400' : 'text-red-400'
                    }`}>
                      {weeklyCard.acceptance_rate.toFixed(1)}%
                    </p>
                  </div>
                )}
                {weeklyCard.avg_response_minutes != null && (
                  <div>
                    <p className='text-2xs text-gray-500'>Avg Resp</p>
                    <p className='text-sm text-gray-300 mt-0.5'>
                      {weeklyCard.avg_response_minutes < 60
                        ? `${weeklyCard.avg_response_minutes.toFixed(0)}m`
                        : `${(weeklyCard.avg_response_minutes / 60).toFixed(1)}h`}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Carrier Setup Checklist */}
          {(() => {
            const done = DRIVER_SETUP_ITEMS.filter(s => setupChecks[s.id]).length
            const allDone = done === DRIVER_SETUP_ITEMS.length
            return (
              <div className='mx-5 mt-4 rounded-xl border border-surface-500 bg-surface-700 overflow-hidden'>
                <button
                  onClick={() => setSetupOpen(o => !o)}
                  className='w-full flex items-center justify-between px-3 py-2.5 hover:bg-surface-600 transition-colors'
                >
                  <div className='flex items-center gap-2'>
                    <p className='text-xs font-medium text-gray-300'>Carrier Setup</p>
                    <span className={`text-2xs px-1.5 py-0.5 rounded-full font-medium ${allDone ? badgeTokens.success : 'bg-surface-500 text-gray-500'}`}>
                      {done}/{DRIVER_SETUP_ITEMS.length}
                    </span>
                  </div>
                  <ChevronDown size={13} className={`text-gray-600 transition-transform ${setupOpen ? 'rotate-180' : ''}`} />
                </button>
                {setupOpen && (
                  <div className='px-3 pb-3 space-y-1 border-t border-surface-600'>
                    {DRIVER_SETUP_ITEMS.map(item => (
                      <button
                        key={item.id}
                        onClick={() => toggleSetupCheck(item.id)}
                        className='w-full flex items-center gap-2.5 py-1.5 group text-left'
                      >
                        {setupChecks[item.id]
                          ? <CheckCircle2 size={13} className='text-green-400 shrink-0' />
                          : <Circle      size={13} className='text-gray-600 shrink-0 group-hover:text-gray-400 transition-colors' />
                        }
                        <span className={`text-xs transition-colors ${setupChecks[item.id] ? 'text-gray-600 line-through' : 'text-gray-300'}`}>
                          {item.label}
                        </span>
                      </button>
                    ))}
                    <ContextGuidancePanel docs={resolveGuidance('driver-onboarding', sopDocs)} label='Onboarding SOPs'/>
                  </div>
                )}
              </div>
            )
          })()}

          {/* Broker Approvals */}
          <div className='mx-5 mt-3 rounded-xl border border-surface-500 bg-surface-700 overflow-hidden'>
            <button
              onClick={() => setApprovalsOpen(o => !o)}
              className='w-full flex items-center justify-between px-3 py-2.5 hover:bg-surface-600 transition-colors'
            >
              <div className='flex items-center gap-2'>
                <p className='text-xs font-medium text-gray-300'>Broker Approvals</p>
                <span className={`text-2xs px-1.5 py-0.5 rounded-full font-medium ${
                  approvals.filter(a => a.status==='Approved').length > 0
                    ? badgeTokens.success
                    : 'bg-surface-500 text-gray-500'
                }`}>
                  {approvals.filter(a=>a.status==='Approved').length} approved
                </span>
              </div>
              <div className='flex items-center gap-2'>
                <span className='text-2xs text-gray-400'>{approvals.length} tracked</span>
                <ChevronDown size={13} className={`text-gray-600 transition-transform ${approvalsOpen ? 'rotate-180' : ''}`} />
              </div>
            </button>
            {approvalsOpen && (
              <div className='border-t border-surface-600'>
                {approvals.length === 0 && !addApproval && (
                  <p className='px-3 py-3 text-2xs text-gray-400 italic'>No broker approvals tracked yet. Add the first one below.</p>
                )}
                {approvals.map(a => (
                  <div key={a.id} className='group flex items-center gap-2 px-3 py-2 border-b border-surface-600 last:border-0'>
                    <div className={`shrink-0 w-1.5 h-1.5 rounded-full ${a.status==='Approved'?'bg-green-400':a.status==='Denied'?'bg-red-400':'bg-yellow-400'}`} />
                    <div className='flex-1 min-w-0'>
                      <span className='text-xs text-gray-300 font-medium'>{a.broker_name}</span>
                      {a.notes && <span className='text-2xs text-gray-400 ml-2'>{a.notes}</span>}
                    </div>
                    <span className={`text-2xs px-1.5 py-0.5 rounded font-medium shrink-0 ${
                      a.status==='Approved'? badgeTokens.success :
                      a.status==='Denied'?   badgeTokens.danger :
                                             badgeTokens.caution
                    }`}>{a.status}</span>
                    <button onClick={() => delApproval(a.id)} className='opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-surface-600 text-gray-600 hover:text-red-400 transition-all shrink-0'>
                      <X size={10}/>
                    </button>
                  </div>
                ))}
                {addApproval ? (
                  <div className='px-3 py-3 space-y-2 border-t border-surface-600'>
                    <select
                      value={apprForm.broker_id}
                      onChange={e => setApprForm(f => ({...f, broker_id:e.target.value}))}
                      className='w-full h-7 px-2 bg-surface-600 border border-surface-400 rounded text-xs text-gray-300 focus:outline-none focus:border-orange-600/50'
                    >
                      <option value=''>Select broker...</option>
                      {allBrokers
                        .filter(b => !approvals.find(a => a.broker_id===b.id))
                        .map(b => <option key={b.id} value={b.id}>{b.name}</option>)
                      }
                    </select>
                    <select
                      value={apprForm.status}
                      onChange={e => setApprForm(f => ({...f, status:e.target.value as 'Submitted'|'Approved'|'Denied'}))}
                      className='w-full h-7 px-2 bg-surface-600 border border-surface-400 rounded text-xs text-gray-300 focus:outline-none focus:border-orange-600/50'
                    >
                      <option>Submitted</option>
                      <option>Approved</option>
                      <option>Denied</option>
                    </select>
                    <input
                      value={apprForm.notes}
                      onChange={e => setApprForm(f => ({...f, notes:e.target.value}))}
                      placeholder='Notes (optional)'
                      className='w-full h-7 px-2 bg-surface-600 border border-surface-400 rounded text-xs text-gray-300 focus:outline-none focus:border-orange-600/50 placeholder-gray-600'
                    />
                    <div className='flex gap-2'>
                      <button onClick={saveApproval} className='px-3 py-1 text-2xs font-medium bg-orange-600 hover:bg-orange-500 text-white rounded-lg'>Save</button>
                      <button onClick={() => setAddApproval(false)} className='px-3 py-1 text-2xs text-gray-500 hover:text-gray-300 rounded-lg'>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setAddApproval(true)}
                    className='flex items-center gap-1 px-3 py-2.5 text-2xs text-gray-400 hover:text-orange-400 transition-colors w-full'
                  >
                    <Plus size={10}/> Add broker approval
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Contact */}
          <div className='px-5 py-4 border-b border-surface-600'>
            <Sec title='Contact'/>
            <div className='grid grid-cols-2 gap-3'>
              <Row label='Phone' value={driver.phone??'—'}/>
              <Row label='Email' value={driver.email??'—'}/>
              <Row label='Home Base' value={driver.home_base??'—'}/>
              <Row label='Start Date' value={fmt(driver.start_date)}/>
            </div>
            {/* Current Location — inline editable */}
            <div className='mt-3'>
              <p className='text-2xs text-gray-400 flex items-center gap-1'><MapPin size={10}/>Current Location</p>
              {editingLocation ? (
                <div className='flex items-center gap-1.5 mt-1'>
                  <input
                    autoFocus
                    value={locationText}
                    onChange={e=>setLocationText(e.target.value)}
                    onKeyDown={e=>{if(e.key==='Enter')saveLocation();if(e.key==='Escape'){setEditingLocation(false);setLocationText(localLocation??'')}}}
                    className='flex-1 h-7 px-2.5 text-sm bg-surface-600 border border-surface-400 rounded-lg text-gray-200 placeholder-gray-600 focus:outline-none focus:border-orange-600/60'
                    placeholder='City, ST'
                  />
                  <button onClick={saveLocation} className='p-1.5 rounded hover:bg-surface-600 text-orange-400 hover:text-orange-300 transition-colors'><Check size={13}/></button>
                  <button onClick={()=>{setEditingLocation(false);setLocationText(localLocation??'')}} className='p-1.5 rounded hover:bg-surface-600 text-gray-600 hover:text-gray-300 transition-colors'><X size={13}/></button>
                </div>
              ) : (
                <div className='group/loc flex items-center gap-1.5 mt-0.5'>
                  <p className={`text-sm ${localLocation?'text-gray-200':'text-gray-500'}`}>{localLocation??'—'}</p>
                  <button onClick={()=>{setEditingLocation(true);setLocationText(localLocation??'')}}
                    className='opacity-0 group-hover/loc:opacity-100 p-1 rounded hover:bg-surface-600 text-gray-600 hover:text-orange-400 transition-all'><Pencil size={11}/></button>
                </div>
              )}
            </div>
          </div>
          {/* Carrier */}
          <div className='px-5 py-4 border-b border-surface-600'>
            <Sec title='Carrier Info'/>
            <div className='grid grid-cols-2 gap-3'>
              {driver.mc_number
                ? <div>
                    <p className='text-2xs text-gray-400'>MC #</p>
                    <button onClick={e => openSaferMc(driver.mc_number, e)}
                      className='text-sm mt-0.5 font-mono text-gray-300 hover:text-orange-400 hover:underline transition-colors cursor-pointer'
                      title='View on FMCSA SAFER'>{driver.mc_number}</button>
                  </div>
                : <Row label='MC #' value='—' mono/>}
              <Row label='DOT #' value={driver.dot_number??'—'} mono/>
              {(() => {
                const age = mcAge(driver.authority_date)
                return (
                  <div>
                    <p className='text-2xs text-gray-400'>MC Age</p>
                    {age ? (
                      <div className='flex items-center gap-1.5 mt-0.5'>
                        <span className='text-sm font-mono text-gray-300'>{age.label}</span>
                        {age.days < 90 && (
                          <span className={`text-2xs px-1.5 py-0.5 rounded-full font-medium ${badgeTokens.warning}`}>
                            New Auth
                          </span>
                        )}
                      </div>
                    ) : <span className='text-sm text-gray-400'>—</span>}
                  </div>
                )
              })()}
              <Row label='CDL #' value={driver.cdl_number??'—'} mono/>
              <div>
                <p className='text-2xs text-gray-400'>CDL Expiry</p>
                <p className={`text-sm mt-0.5 flex items-center gap-1 ${isExp(driver.cdl_expiry)?'text-orange-400':'text-gray-300'}`}>
                  {isExp(driver.cdl_expiry)&&<AlertTriangle size={11}/>}{fmt(driver.cdl_expiry)}
                </p>
              </div>
              <div>
                <p className='text-2xs text-gray-400'>Insurance Expiry</p>
                <p className={`text-sm mt-0.5 flex items-center gap-1 ${isExp(driver.insurance_expiry)?'text-orange-400':'text-gray-300'}`}>
                  {isExp(driver.insurance_expiry)&&<AlertTriangle size={11}/>}{fmt(driver.insurance_expiry)}
                </p>
              </div>
              <div>
                <p className='text-2xs text-gray-400'>Medical Card Expiry</p>
                <p className={`text-sm mt-0.5 flex items-center gap-1 ${isExp(driver.medical_card_expiry)?'text-orange-400':'text-gray-300'}`}>
                  {isExp(driver.medical_card_expiry)&&<AlertTriangle size={11}/>}{fmt(driver.medical_card_expiry??null)}
                </p>
              </div>
            </div>
          </div>
          {/* Equipment & Dispatch */}
          <div className='px-5 py-4 border-b border-surface-600'>
            <Sec title='Equipment & Dispatch'/>
            <div className='grid grid-cols-2 gap-3'>
              <Row label='Truck Type' value={driver.truck_type??'—'}/>
              <Row label='Trailer Type' value={driver.trailer_type??'—'}/>
              <Row label='Trailer Length' value={driver.trailer_length??'—'}/>
              <Row label='Min RPM' value={driver.min_rpm!=null?`$${driver.min_rpm.toFixed(2)}/mi`:'—'}/>
              <Row label='Dispatch %' value={`${driver.dispatch_percent}%`}/>
              <Row label='Factoring Co.' value={driver.factoring_company??'—'}/>
            </div>
            {driver.preferred_lanes&&(
              <div className='mt-3'>
                <p className='text-2xs text-gray-400'>Preferred Lanes</p>
                <p className='text-sm text-gray-300 mt-0.5'>{driver.preferred_lanes}</p>
              </div>
            )}
          </div>
          {/* Documents */}
          <div className='px-5 py-4 border-b border-surface-600'>
            <div className='flex items-center justify-between mb-3'>
              <Sec title='Documents'/>
              <button onClick={()=>setAddDoc(v=>!v)} className='flex items-center gap-1 text-2xs text-gray-400 hover:text-orange-400 transition-colors mb-3'><Plus size={10}/>Add</button>
            </div>
            {addDoc&&(
              <div className='mb-3 p-3 rounded-lg bg-surface-700 space-y-2'>
                <input value={docForm.title} onChange={e=>setDocForm(p=>({...p,title:e.target.value}))} placeholder='Document title'
                  className='w-full h-7 px-2.5 text-xs bg-surface-600 border border-surface-400 rounded-lg text-gray-200 placeholder-gray-600 focus:outline-none'/>
                <div className='grid grid-cols-2 gap-2'>
                  <select value={docForm.doc_type} onChange={e=>setDocForm(p=>({...p,doc_type:e.target.value as DriverDocType}))}
                    className='h-7 px-2 text-xs bg-surface-600 border border-surface-400 rounded-lg text-gray-300 focus:outline-none'>
                    {DOC_TYPES.map(t=><option key={t} value={t}>{t}</option>)}
                  </select>
                  <input type='date' value={docForm.expiry_date} onChange={e=>setDocForm(p=>({...p,expiry_date:e.target.value}))}
                    className='h-7 px-2 text-xs bg-surface-600 border border-surface-400 rounded-lg text-gray-300 focus:outline-none'/>
                </div>
                <div className='flex items-center gap-2'>
                  <button onClick={pickFile}
                    className='flex items-center gap-1 px-2.5 py-1 text-2xs text-gray-400 hover:text-orange-400 bg-surface-600 hover:bg-surface-500 rounded-lg transition-colors border border-surface-400'>
                    <Paperclip size={10}/>
                    {pendingFile ? <span className='truncate max-w-[120px]'>{pendingFile.displayName}</span> : 'Attach File'}
                  </button>
                  <div className='flex-1'/>
                  <button onClick={saveDoc} className='px-3 py-1 text-2xs font-medium bg-orange-600 hover:bg-orange-500 text-white rounded-lg'>Save</button>
                  <button onClick={()=>{setAddDoc(false);setPendingFile(null)}} className='px-3 py-1 text-2xs text-gray-500 hover:text-gray-300 rounded-lg'>Cancel</button>
                </div>
              </div>
            )}
            {docs.length===0
              ?<p className='text-2xs text-gray-500 italic'>No documents on file.</p>
              :docs.map(doc=>(
                <div key={doc.id} className='group/doc flex items-center gap-2 py-2 border-b border-surface-600 last:border-0'>
                  <div className='flex-1 min-w-0'>
                    <div className='flex items-center gap-2'>
                      <span className='text-xs font-medium text-gray-300 truncate'>{doc.title}</span>
                      <span className='text-2xs px-1.5 py-0.5 rounded bg-surface-600 text-gray-500 shrink-0'>{doc.doc_type}</span>
                    </div>
                    {doc.expiry_date&&(
                      <p className={`text-2xs mt-0.5 ${isExp(doc.expiry_date)?'text-orange-400':'text-gray-600'}`}>
                        {isExp(doc.expiry_date)&&'⚠ '}Exp: {fmt(doc.expiry_date)}
                      </p>
                    )}
                    {doc.file_path&&(
                      <button onClick={()=>window.api.driverDocs.openAttachment(doc.file_path!)}
                        className='flex items-center gap-1 text-2xs text-orange-400 hover:text-orange-300 mt-0.5 transition-colors'>
                        <FileText size={10}/>Open file
                      </button>
                    )}
                  </div>
                  <button onClick={()=>delDoc(doc.id)} className='opacity-0 group-hover/doc:opacity-100 p-1 rounded hover:bg-surface-600 text-gray-600 hover:text-red-400 transition-all'><X size={10}/></button>
                </div>
              ))
            }
            <ContextGuidancePanel docs={resolveGuidance('driver-documents', sopDocs)} label='Document SOPs'/>
          </div>
          {/* Performance Scorecard */}
          {(() => {
            const completed = allDriverLoads.filter(l => ['Delivered','Invoiced','Paid'].includes(l.status))
            const rpmLoads  = completed.filter(l => (l.miles ?? 0) > 0 && (l.rate ?? 0) > 0)
            const avgRpm    = rpmLoads.length > 0
              ? rpmLoads.reduce((s, l) => s + l.rate! / l.miles!, 0) / rpmLoads.length
              : null
            const totalFees = payHistory.reduce((s, i) => s + (i.dispatch_fee ?? 0), 0)
            const now = new Date()
            const monthStart = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-01`
            const loadsThisMonth = completed.filter(l => (l.delivery_date ?? l.pickup_date ?? '') >= monthStart).length
            if (completed.length === 0 && payHistory.length === 0) return null
            return (
              <div className='px-5 py-4 border-b border-surface-600'>
                <div className='flex items-center gap-2 mb-3'>
                  <TrendingUp size={12} className='text-orange-400' />
                  <Sec title='Performance'/>
                </div>
                <div className='grid grid-cols-2 gap-3'>
                  <div>
                    <p className={typeTokens.microLabel}>Total Loads</p>
                    <p className='text-sm text-gray-200 font-semibold mt-0.5'>{completed.length}</p>
                  </div>
                  <div>
                    <p className={typeTokens.microLabel}>This Month</p>
                    <p className='text-sm text-gray-200 font-semibold mt-0.5'>{loadsThisMonth}</p>
                  </div>
                  {avgRpm != null && (
                    <div>
                      <p className={typeTokens.microLabel}>Avg RPM</p>
                      <p className={`text-sm font-semibold font-mono mt-0.5 ${avgRpm >= 2 ? 'text-green-400' : avgRpm >= 1.5 ? 'text-yellow-400' : 'text-red-400'}`}>
                        ${avgRpm.toFixed(2)}
                      </p>
                    </div>
                  )}
                  {totalFees > 0 && (
                    <div>
                      <p className={typeTokens.microLabel}>Total Earned (fees)</p>
                      <p className='text-sm text-green-400 font-semibold font-mono mt-0.5'>
                        ${totalFees.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )
          })()}
          {/* Pay History */}
          {payHistory.length > 0 && (
            <div className='px-5 py-4 border-b border-surface-600'>
              <Sec title='Pay History'/>
              <div className='space-y-1'>
                {payHistory.map(inv => (
                  <div key={inv.id} className='flex items-center justify-between py-1.5 border-b border-surface-600 last:border-0'>
                    <div className='min-w-0'>
                      <p className='text-xs font-mono text-gray-300'>{inv.invoice_number}</p>
                      <p className='text-2xs text-gray-400 mt-0.5'>Paid {fmt(inv.paid_date)}</p>
                    </div>
                    <div className='text-right shrink-0 ml-3'>
                      <p className='text-xs font-semibold font-mono text-green-400'>${(inv.dispatch_fee??0).toFixed(2)}</p>
                      {inv.driver_gross!=null&&<p className='text-2xs text-gray-400'>${inv.driver_gross.toLocaleString()} gross</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {/* Load Behavior */}
          {offerStats != null && offerStats.total_offers > 0 && (
            <div className='px-5 py-4 border-t border-surface-600'>
              <Sec title='Load Behavior'/>
              <div className='grid grid-cols-2 gap-x-4 gap-y-3'>
                <div>
                  {/* Rate is based on resolved offers only; open offers are excluded */}
                  <p className={typeTokens.label}>Acceptance Rate</p>
                  <p className={`text-sm mt-0.5 font-mono font-semibold ${
                    offerStats.acceptance_rate >= 70 ? 'text-green-400' :
                    offerStats.acceptance_rate >= 40 ? 'text-yellow-400' :
                    'text-red-400'
                  }`}>
                    {offerStats.acceptance_rate.toFixed(1)}%
                    {offerStats.open_offer_count > 0 && (
                      <span className='text-2xs font-normal text-gray-600 ml-1'>(excl. open)</span>
                    )}
                  </p>
                </div>
                <div>
                  <p className={typeTokens.label}>Total Offers</p>
                  <p className={`text-sm mt-0.5 ${typeTokens.value}`}>{offerStats.total_offers}</p>
                </div>
                <div>
                  <p className={typeTokens.label}>Avg Response</p>
                  <p className={`text-sm mt-0.5 ${typeTokens.value}`}>
                    {offerStats.avg_response_minutes != null
                      ? offerStats.avg_response_minutes < 60
                        ? `${offerStats.avg_response_minutes.toFixed(0)} min`
                        : `${(offerStats.avg_response_minutes / 60).toFixed(1)} hr`
                      : '—'}
                  </p>
                </div>
                <div>
                  <p className={typeTokens.label}>Breakdown</p>
                  <div className='flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5'>
                    <span className='text-2xs text-green-400'>{offerStats.accepted_count} accepted</span>
                    <span className='text-2xs text-red-400'>{offerStats.declined_count} declined</span>
                    <span className='text-2xs text-gray-500'>{offerStats.no_response_count} no response</span>
                    {offerStats.open_offer_count > 0 && (
                      <span className='text-2xs text-orange-500'>{offerStats.open_offer_count} open</span>
                    )}
                  </div>
                </div>
              </div>
              {/* Fallout / Reliability — shown when any fallout data exists */}
              {falloutStats != null && falloutStats.fallout_count > 0 && (
                <div className='mt-3 pt-3 border-t border-surface-600'>
                  <p className={`${typeTokens.label} mb-2`}>Reliability</p>
                  <div className='grid grid-cols-3 gap-x-4 gap-y-2'>
                    <div>
                      <p className={typeTokens.microLabel}>Fallouts</p>
                      <p className={`text-sm font-semibold mt-0.5 ${falloutStats.fallout_count >= 3 ? 'text-red-400' : falloutStats.fallout_count >= 1 ? 'text-yellow-400' : 'text-gray-300'}`}>
                        {falloutStats.fallout_count}
                      </p>
                    </div>
                    <div>
                      <p className={typeTokens.microLabel}>Mid-Trip</p>
                      <p className={`text-sm font-semibold mt-0.5 ${falloutStats.accepted_not_completed_count > 0 ? 'text-orange-400' : 'text-gray-300'}`}>
                        {falloutStats.accepted_not_completed_count}
                      </p>
                    </div>
                    {falloutStats.completion_rate != null && (
                      <div>
                        <p className={typeTokens.microLabel}>Completion</p>
                        <p className={`text-sm font-mono font-semibold mt-0.5 ${falloutStats.completion_rate >= 90 ? 'text-green-400' : falloutStats.completion_rate >= 75 ? 'text-yellow-400' : 'text-red-400'}`}>
                          {falloutStats.completion_rate}%
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
          {/* Notes */}
          <div className='px-5 py-4'>
            <div className='flex items-center justify-between mb-3'>
              <Sec title='Notes'/>
              <button onClick={()=>setAddNote(v=>!v)} className='flex items-center gap-1 text-2xs text-gray-400 hover:text-orange-400 transition-colors mb-3'><Plus size={10}/>Add</button>
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
              ?<p className='text-2xs text-gray-500 italic'>No notes yet.</p>
              :notes.map(n=>(
                <div key={n.id} className='group/note flex items-start gap-2 py-2 border-b border-surface-600 last:border-0'>
                  <div className='flex-1 min-w-0'>
                    <p className='text-xs text-gray-300 whitespace-pre-wrap'>{n.content}</p>
                    <p className='text-2xs text-gray-500 mt-0.5'>{fmtDT(n.created_at)}</p>
                  </div>
                  <button onClick={()=>delNote(n.id)} className='opacity-0 group-hover/note:opacity-100 p-1 rounded hover:bg-surface-600 text-gray-600 hover:text-red-400 transition-all'><X size={10}/></button>
                </div>
              ))
            }
          </div>
        </div>
      </div>
    </div>
    {showAgreement && (
      <DispatchAgreementModal driver={driver} onClose={() => setShowAgreement(false)} />
    )}
    </>
  )
}
