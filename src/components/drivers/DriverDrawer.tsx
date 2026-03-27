import { useState, useEffect } from 'react'
import { X, Phone, Edit2, Trash2, Plus, AlertTriangle, Paperclip, FileText, Pencil, Check, MapPin, ScrollText, CheckCircle2, Circle, ChevronDown } from 'lucide-react'
import type { Driver, DriverDocument, DriverDocType, DriverStatus, Load, Note } from '../../types/models'
import { DRIVER_STATUS_STYLES, DRIVER_STATUSES, DOC_TYPES } from './constants'
import { openSaferMc } from '../../lib/saferUrl'
import { DispatchAgreementModal } from './DispatchAgreementModal'
import { Term } from '../ui/Term'

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
  return <div><p className='text-2xs text-gray-600'>{label}</p><p className={`text-sm mt-0.5 ${mono?'font-mono':''} ${value==='—'?'text-gray-700':'text-gray-300'}`}>{value}</p></div>
}
function Sec({ title }: { title:string }) {
  return <p className='text-2xs font-medium text-gray-600 uppercase tracking-wider mb-3'>{title}</p>
}
export function DriverDrawer({ driver, onClose, onEdit, onStatusChange, onDelete, onUpdate }: Props) {
  const [docs,setDocs]         = useState<DriverDocument[]>([])
  const [notes,setNotes]       = useState<Note[]>([])
  const [load,setLoad]         = useState<Load|null>(null)
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
    Promise.all([
      window.api.driverDocs.list(driver.id),
      window.api.notes.list('driver', driver.id),
      window.api.loads.list(),
      window.api.settings.get(`carrierChecklist_${driver.id}`),
    ]).then(([d,n,loads,rawChecks]) => {
      setDocs(d); setNotes(n)
      const active = (loads as Load[]).filter(l=>l.driver_id===driver.id&&['Booked','Picked Up','In Transit'].includes(l.status))
      setLoad(active[0]??null)
      try { if (rawChecks) setSetupChecks(JSON.parse(rawChecks as string)) } catch { /* ignore */ }
    })
  }, [driver.id])

  const toggleSetupCheck = async (id: string) => {
    const next = { ...setupChecks, [id]: !setupChecks[id] }
    setSetupChecks(next)
    await window.api.settings.set(`carrierChecklist_${driver.id}`, JSON.stringify(next))
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
            {DRIVER_STATUSES.filter(s=>s!==driver.status).map(s=>(
              <button key={s} onClick={()=>onStatusChange(driver,s)} className='px-2 h-7 text-2xs text-gray-600 hover:text-orange-400 rounded hover:bg-surface-600 transition-colors'>→ {s}</button>
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
              <p className='text-2xs text-gray-600 mt-0.5'>
                {load.status}{load.miles!=null?` · ${load.miles.toLocaleString()} mi`:''}{load.rate!=null?` · $${load.rate.toLocaleString()}`:''}
              </p>
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
                    <span className={`text-2xs px-1.5 py-0.5 rounded-full font-medium ${allDone ? 'bg-green-900/40 text-green-400' : 'bg-surface-500 text-gray-500'}`}>
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
                  </div>
                )}
              </div>
            )
          })()}

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
              <p className='text-2xs text-gray-600 flex items-center gap-1'><MapPin size={10}/>Current Location</p>
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
                  <p className={`text-sm ${localLocation?'text-gray-300':'text-gray-700'}`}>{localLocation??'—'}</p>
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
                    <p className='text-2xs text-gray-600'>MC #</p>
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
                    <p className='text-2xs text-gray-600'>MC Age</p>
                    {age ? (
                      <div className='flex items-center gap-1.5 mt-0.5'>
                        <span className='text-sm font-mono text-gray-300'>{age.label}</span>
                        {age.days < 90 && (
                          <span className='text-2xs px-1.5 py-0.5 rounded-full bg-orange-500/15 border border-orange-500/30 text-orange-400 font-medium'>
                            New Auth
                          </span>
                        )}
                      </div>
                    ) : <span className='text-sm text-gray-700'>—</span>}
                  </div>
                )
              })()}
              <Row label='CDL #' value={driver.cdl_number??'—'} mono/>
              <div>
                <p className='text-2xs text-gray-600'>CDL Expiry</p>
                <p className={`text-sm mt-0.5 flex items-center gap-1 ${isExp(driver.cdl_expiry)?'text-orange-400':'text-gray-300'}`}>
                  {isExp(driver.cdl_expiry)&&<AlertTriangle size={11}/>}{fmt(driver.cdl_expiry)}
                </p>
              </div>
              <div>
                <p className='text-2xs text-gray-600'>Insurance Expiry</p>
                <p className={`text-sm mt-0.5 flex items-center gap-1 ${isExp(driver.insurance_expiry)?'text-orange-400':'text-gray-300'}`}>
                  {isExp(driver.insurance_expiry)&&<AlertTriangle size={11}/>}{fmt(driver.insurance_expiry)}
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
                <p className='text-2xs text-gray-600'>Preferred Lanes</p>
                <p className='text-sm text-gray-300 mt-0.5'>{driver.preferred_lanes}</p>
              </div>
            )}
          </div>
          {/* Documents */}
          <div className='px-5 py-4 border-b border-surface-600'>
            <div className='flex items-center justify-between mb-3'>
              <Sec title='Documents'/>
              <button onClick={()=>setAddDoc(v=>!v)} className='flex items-center gap-1 text-2xs text-gray-600 hover:text-orange-400 transition-colors mb-3'><Plus size={10}/>Add</button>
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
              ?<p className='text-2xs text-gray-700 italic'>No documents on file.</p>
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
    {showAgreement && (
      <DispatchAgreementModal driver={driver} onClose={() => setShowAgreement(false)} />
    )}
    </>
  )
}
