import { useState, useEffect } from 'react'
import { X, Edit2, Plus, Printer, Mail, CheckCircle, Send, AlertCircle, Download, Trash2 } from 'lucide-react'
import type { Invoice, InvoiceStatus, Driver, Load, Broker, Note } from '../../types/models'
import { INVOICE_STATUS_STYLES } from './constants'

interface Props {
  invoice: Invoice
  drivers: Driver[]
  loads: Load[]
  brokers: Broker[]
  onClose: () => void
  onEdit: (inv: Invoice) => void
  onStatusChange: (inv: Invoice, status: InvoiceStatus) => void
  onDelete: (inv: Invoice) => void
}

const fmt = (d: string | null) => { if (!d) return '---'; const [y,m,day] = d.split('-'); return `${m}/${day}/${y}` }
const fmtDT = (dt: string) => new Date(dt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
const fmtMoney = (v: number | null) => v != null ? `$${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '---'

function Row({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div><p className='text-2xs text-gray-600'>{label}</p><p className={`text-sm mt-0.5 ${accent ?? 'text-gray-300'}`}>{value}</p></div>
  )
}
function Sec({ title }: { title: string }) {
  return <p className='text-2xs font-medium text-gray-400 uppercase tracking-wider mb-3'>{title}</p>
}

function printInvoice(inv: Invoice, driver: Driver | undefined, load: Load | undefined, broker: Broker | undefined) {
  const style = document.createElement('style')
  style.id = '__inv_print_style'
  style.textContent = `@media print { body > * { display: none !important; } #inv-print-root { display: block !important; } } #inv-print-root { display: none; }`
  document.head.appendChild(style)
  const root = document.createElement('div')
  root.id = 'inv-print-root'
  const origin = load ? [load.origin_city, load.origin_state].filter(Boolean).join(', ') : ''
  const dest = load ? [load.dest_city, load.dest_state].filter(Boolean).join(', ') : ''
  root.innerHTML = `
    <style>body{font-family:sans-serif;color:#111;padding:40px;} h1{margin:0 0 4px;font-size:22px;} .sub{color:#666;font-size:13px;margin-bottom:24px;} table{width:100%;border-collapse:collapse;margin-top:16px;} td,th{padding:8px 12px;border:1px solid #ddd;font-size:13px;} th{background:#f5f5f5;text-align:left;} .total{font-size:18px;font-weight:bold;margin-top:20px;text-align:right;} .footer{margin-top:40px;font-size:11px;color:#999;}</style>
    <h1>DISPATCH INVOICE</h1>
    <div class="sub">${inv.invoice_number} &nbsp;|&nbsp; Week ending ${fmt(inv.week_ending)}</div>
    <table>
      <tr><th>Field</th><th>Value</th></tr>
      <tr><td>Driver</td><td>${driver?.name ?? '---'}${driver?.company ? ' (' + driver.company + ')' : ''}</td></tr>
      <tr><td>Load / Ref #</td><td>${load?.load_id ?? (load ? '#' + load.id : '---')}</td></tr>
      <tr><td>Route</td><td>${origin && dest ? origin + ' to ' + dest : '---'}</td></tr>
      <tr><td>Broker</td><td>${broker?.name ?? '---'}</td></tr>
      <tr><td>Gross Rate</td><td>${fmtMoney(inv.driver_gross)}</td></tr>
      <tr><td>Dispatch %</td><td>${inv.dispatch_pct != null ? inv.dispatch_pct + '%' : '---'}</td></tr>
      <tr><td>Sent Date</td><td>${fmt(inv.sent_date)}</td></tr>
      <tr><td>Status</td><td>${inv.status}</td></tr>
    </table>
    <div class="total">Dispatch Fee: ${fmtMoney(inv.dispatch_fee)}</div>
    ${inv.notes ? '<p style="margin-top:16px;font-size:12px;color:#555;">Notes: ' + inv.notes + '</p>' : ''}
    <div class="footer">OnTrack Hauling Solutions &mdash; dispatch@ontrackhaulingsolutions.com &mdash; Generated ${new Date().toLocaleDateString()}</div>
  `
  document.body.appendChild(root)
  window.print()
  document.body.removeChild(root)
  document.head.removeChild(style)
}

function exportCsv(inv: Invoice, driver: Driver | undefined) {
  const rows = [
    ['Invoice Number', 'Driver', 'Week Ending', 'Gross Rate', 'Dispatch %', 'Dispatch Fee', 'Status', 'Sent Date', 'Paid Date'],
    [inv.invoice_number, driver?.name ?? '', inv.week_ending ?? '', inv.driver_gross ?? '', inv.dispatch_pct ?? '', inv.dispatch_fee ?? '', inv.status, inv.sent_date ?? '', inv.paid_date ?? '']
  ]
  const nl = String.fromCharCode(10)
  const csv = rows.map(r => r.map(v => '"' + String(v).replace(/"/g, '""') + '"').join(',')).join(nl)
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = `${inv.invoice_number}.csv`; a.click()
  URL.revokeObjectURL(url)
}

export function InvoiceDrawer({ invoice, drivers, loads, brokers, onClose, onEdit, onStatusChange, onDelete }: Props) {
  const [notes, setNotes] = useState<Note[]>([])
  const [noteText, setNoteText] = useState('')
  const [addNote, setAddNote] = useState(false)
  const [showEmail, setShowEmail] = useState(false)
  const [followUpMode, setFollowUpMode] = useState(false)
  const [emailTo, setEmailTo] = useState('')
  const [confirmDel, setConfirmDel] = useState(false)

  const driver = drivers.find(d => d.id === invoice.driver_id)
  const load = loads.find(l => l.id === invoice.load_id)
  const broker = load ? brokers.find(b => b.id === load.broker_id) : undefined

  useEffect(() => {
    window.api.notes.list('invoice', invoice.id).then(setNotes)
    if (driver?.email) setEmailTo(driver.email)
  }, [invoice.id, driver])

  const saveNote = async () => {
    if (!noteText.trim()) return
    const n = await window.api.notes.create({ entity_type: 'invoice', entity_id: invoice.id, content: noteText.trim(), user_id: null })
    setNotes(p => [n, ...p]); setNoteText(''); setAddNote(false)
  }
  const delNote = async (id: number) => { await window.api.notes.delete(id); setNotes(p => p.filter(n => n.id !== id)) }

  const origin = load ? [load.origin_city, load.origin_state].filter(Boolean).join(', ') : null
  const dest = load ? [load.dest_city, load.dest_state].filter(Boolean).join(', ') : null

  const daysSinceSent = invoice.sent_date
    ? Math.floor((Date.now() - new Date(invoice.sent_date).getTime()) / 86400000)
    : 0
  const terms = broker?.payment_terms ?? 30
  const daysOverdue = Math.max(0, daysSinceSent - terms)
  const isOverdueOrSent = invoice.status === 'Overdue' || invoice.status === 'Sent'

  const emailSubject = `Dispatch Invoice ${invoice.invoice_number}${invoice.week_ending ? ' - Week Ending ' + fmt(invoice.week_ending) : ''}`
  const emailBody = [
    `Hi${driver?.name ? ' ' + driver.name.split(' ')[0] : ''},`,
    '',
    `Please find your dispatch invoice attached.`,
    '',
    `Invoice: ${invoice.invoice_number}`,
    `Week Ending: ${fmt(invoice.week_ending)}`,
    `Gross Rate: ${fmtMoney(invoice.driver_gross)}`,
    `Dispatch Fee (${invoice.dispatch_pct ?? 0}%): ${fmtMoney(invoice.dispatch_fee)}`,
    '',
    'Please confirm receipt. Print the invoice using the Print PDF button in the dashboard.',
    '',
    'OnTrack Hauling Solutions',
    'dispatch@ontrackhaulingsolutions.com',
  ].join('%0A')

  const followUpSubject = `Payment Follow-Up: ${invoice.invoice_number}${invoice.week_ending ? ' - Week Ending ' + fmt(invoice.week_ending) : ''}`
  const followUpBody = [
    `Hi${driver?.name ? ' ' + driver.name.split(' ')[0] : ''},`,
    '',
    `I am following up on dispatch invoice ${invoice.invoice_number}${invoice.week_ending ? ', for the week ending ' + fmt(invoice.week_ending) : ''}. As of today, payment has not been received.`,
    '',
    `Invoice: ${invoice.invoice_number}`,
    `Dispatch Fee: ${fmtMoney(invoice.dispatch_fee)}`,
    `Gross Rate: ${fmtMoney(invoice.driver_gross)}`,
    `Sent: ${fmt(invoice.sent_date)}`,
    daysOverdue > 0 ? `Days Overdue: ${daysOverdue} (terms: ${terms} days)` : `Days Since Sent: ${daysSinceSent}`,
    '',
    `Please send payment at your earliest convenience. If there is a discrepancy with this invoice or you have already sent payment, let me know so I can update my records.`,
    '',
    'OnTrack Hauling Solutions',
    'dispatch@ontrackhaulingsolutions.com',
  ].join('%0A')

  const activeSubject = followUpMode ? followUpSubject : emailSubject
  const activeBody    = followUpMode ? followUpBody    : emailBody
  const mailtoHref = `mailto:${encodeURIComponent(emailTo)}?subject=${encodeURIComponent(activeSubject)}&body=${activeBody}`

  return (
    <div className='fixed inset-0 z-50 flex'>
      <div className='flex-1 bg-black/50 backdrop-blur-sm' onClick={onClose} />
      <div className='w-[500px] bg-surface-800 border-l border-surface-400 shadow-2xl flex flex-col overflow-hidden animate-slide-in'>
        {/* Header */}
        <div className='flex items-start justify-between px-5 pt-5 pb-4 border-b border-surface-500 shrink-0'>
          <div className='flex-1 min-w-0'>
            <div className='flex items-center gap-2 mb-1'>
              <h2 className='text-lg font-semibold text-gray-100 font-mono'>{invoice.invoice_number}</h2>
              <span className={`text-2xs px-2 py-0.5 rounded-full border ${INVOICE_STATUS_STYLES[invoice.status]}`}>{invoice.status}</span>
            </div>
            <p className='text-sm text-gray-500'>Week ending {fmt(invoice.week_ending)}</p>
          </div>
          <button onClick={onClose} className='p-1.5 rounded-lg hover:bg-surface-600 text-gray-500 hover:text-gray-300 ml-3 shrink-0'><X size={16} /></button>
        </div>
        <div className='flex-1 overflow-y-auto'>
          {/* Action bar */}
          <div className='flex items-center gap-1.5 px-5 py-3 border-b border-surface-600 flex-wrap shrink-0'>
            <button onClick={() => onEdit(invoice)} className='flex items-center gap-1.5 px-2.5 h-7 text-xs font-medium bg-surface-600 hover:bg-surface-500 text-gray-300 rounded-lg transition-colors'><Edit2 size={11} />Edit</button>
            {invoice.status === 'Draft' && (
              <button onClick={() => onStatusChange(invoice, 'Sent')} className='flex items-center gap-1.5 px-2.5 h-7 text-xs font-medium bg-blue-700 hover:bg-blue-600 text-white rounded-lg transition-colors'><Send size={11} />Mark Sent</button>
            )}
            {(invoice.status === 'Sent' || invoice.status === 'Overdue') && (
              <button onClick={() => onStatusChange(invoice, 'Paid')} className='flex items-center gap-1.5 px-2.5 h-7 text-xs font-medium bg-green-700 hover:bg-green-600 text-white rounded-lg transition-colors'><CheckCircle size={11} />Mark Paid</button>
            )}
            {invoice.status === 'Sent' && (
              <button onClick={() => onStatusChange(invoice, 'Overdue')} className='flex items-center gap-1.5 px-2.5 h-7 text-xs font-medium bg-red-800 hover:bg-red-700 text-white rounded-lg transition-colors'><AlertCircle size={11} />Flag Overdue</button>
            )}
            {isOverdueOrSent && (
              <button onClick={() => { setFollowUpMode(true); setShowEmail(true) }}
                className='flex items-center gap-1.5 px-2.5 h-7 text-xs font-medium bg-orange-800 hover:bg-orange-700 text-white rounded-lg transition-colors'>
                <Mail size={11} />Follow-up{daysOverdue > 0 ? ` (${daysOverdue}d)` : ''}
              </button>
            )}
            <div className='flex-1' />
            {!confirmDel
              ? <button onClick={() => setConfirmDel(true)} className='p-1.5 rounded hover:bg-surface-600 text-gray-600 hover:text-red-400 transition-colors' title='Delete invoice'><Trash2 size={13} /></button>
              : <div className='flex items-center gap-1'>
                  <span className='text-2xs text-red-400'>Delete?</span>
                  <button onClick={() => onDelete(invoice)} className='text-2xs px-2 py-0.5 rounded bg-red-900/40 text-red-400 hover:bg-red-900/60'>Yes</button>
                  <button onClick={() => setConfirmDel(false)} className='text-2xs px-2 py-0.5 rounded bg-surface-600 text-gray-400'>No</button>
                </div>
            }
            <button onClick={() => printInvoice(invoice, driver, load, broker)} title='Print / Save as PDF'
              className='flex items-center gap-1.5 px-2.5 h-7 text-xs font-medium bg-surface-600 hover:bg-surface-500 text-gray-300 rounded-lg transition-colors'><Printer size={11} />Print PDF</button>
            <button onClick={() => exportCsv(invoice, driver)} title='Export CSV'
              className='flex items-center gap-1.5 px-2.5 h-7 text-xs font-medium bg-surface-600 hover:bg-surface-500 text-gray-300 rounded-lg transition-colors'><Download size={11} />CSV</button>
            <button onClick={() => { setFollowUpMode(false); setShowEmail(v => !v) }}
              className='flex items-center gap-1.5 px-2.5 h-7 text-xs font-medium bg-surface-600 hover:bg-surface-500 text-gray-300 rounded-lg transition-colors'><Mail size={11} />Email</button>
          </div>
          {/* Email Workflow */}
          {showEmail && (
            <div className='px-5 py-4 border-b border-surface-600 bg-surface-700/40'>
              {isOverdueOrSent ? (
                <div className='flex items-center gap-1 mb-3'>
                  <button onClick={() => setFollowUpMode(false)}
                    className={`px-2.5 h-6 text-2xs rounded-md font-medium transition-colors ${!followUpMode ? 'bg-surface-500 text-gray-200' : 'text-gray-500 hover:text-gray-300'}`}>
                    Invoice
                  </button>
                  <button onClick={() => setFollowUpMode(true)}
                    className={`px-2.5 h-6 text-2xs rounded-md font-medium transition-colors ${followUpMode ? 'bg-orange-700 text-white' : 'text-gray-500 hover:text-gray-300'}`}>
                    Follow-up{daysOverdue > 0 ? ` — ${daysOverdue}d overdue` : ''}
                  </button>
                </div>
              ) : (
                <Sec title='Email Invoice' />
              )}
              <p className='text-2xs text-gray-500 mb-3'>
                {followUpMode
                  ? 'Payment follow-up template. Opens in your default email app.'
                  : 'Compose and send via your default email app. SMTP integration available in Settings.'}
              </p>
              <div className='mb-2'>
                <label className='text-2xs text-gray-600 block mb-1'>To</label>
                <input value={emailTo} onChange={e => setEmailTo(e.target.value)}
                  className='w-full h-7 px-2 bg-surface-600 border border-surface-400 rounded-lg text-xs text-gray-300 focus:outline-none focus:border-orange-600/50'
                  placeholder='driver@example.com' />
              </div>
              <div className='mb-2'>
                <label className='text-2xs text-gray-600 block mb-1'>Subject</label>
                <p className='text-xs text-gray-400 px-2 py-1 bg-surface-600 rounded-lg border border-surface-400'>{activeSubject}</p>
              </div>
              <div className='flex items-center gap-2 mt-3'>
                <a href={mailtoHref} className='flex items-center gap-1.5 px-3 h-7 text-xs font-semibold bg-blue-700 hover:bg-blue-600 text-white rounded-lg transition-colors'><Mail size={11} />Open in Email App</a>
                <p className='text-2xs text-gray-600'>Opens {emailTo || 'recipient'} in your default mail client</p>
              </div>
              <p className='text-2xs text-gray-700 mt-2'>To enable SMTP sending, go to Settings &gt; Email Configuration.</p>
            </div>
          )}
          {/* Financials */}
          <div className='px-5 py-4 border-b border-surface-600'>
            <Sec title='Financials' />
            <div className='grid grid-cols-2 gap-3'>
              <Row label='Gross Rate' value={fmtMoney(invoice.driver_gross)} />
              <Row label='Dispatch %' value={invoice.dispatch_pct != null ? `${invoice.dispatch_pct}%` : '---'} />
              <div className='col-span-2 px-3 py-2.5 bg-surface-700 rounded-lg border border-surface-500'>
                <p className='text-2xs text-gray-500'>Dispatch Fee Earned</p>
                <p className='text-xl font-bold font-mono text-green-400 mt-0.5'>{fmtMoney(invoice.dispatch_fee)}</p>
                {invoice.driver_gross != null && invoice.dispatch_pct != null && (
                  <p className='text-2xs text-gray-600 mt-0.5'>{fmtMoney(invoice.driver_gross)} x {invoice.dispatch_pct}%</p>
                )}
              </div>
            </div>
          </div>
          {/* Assignment */}
          <div className='px-5 py-4 border-b border-surface-600'>
            <Sec title='Details' />
            <div className='grid grid-cols-2 gap-3'>
              <div>
                <p className='text-2xs text-gray-600'>Driver</p>
                {driver ? <p className='text-sm text-gray-200 mt-0.5 font-medium'>{driver.name}{driver.company && <span className='text-gray-500 font-normal'> ({driver.company})</span>}</p>
                  : <p className='text-sm text-gray-600 mt-0.5'>---</p>}
              </div>
              <div>
                <p className='text-2xs text-gray-600'>Broker</p>
                <p className='text-sm text-gray-300 mt-0.5'>{broker?.name ?? '---'}</p>
              </div>
              {load && (
                <div className='col-span-2'>
                  <p className='text-2xs text-gray-600'>Linked Load</p>
                  <p className='text-sm text-gray-300 mt-0.5 font-mono'>{load.load_id ?? `#${load.id}`}
                    {origin && dest && <span className='font-sans font-normal text-gray-500'> &mdash; {origin} to {dest}</span>}
                  </p>
                </div>
              )}
              <Row label='Sent Date' value={fmt(invoice.sent_date)} />
              <Row label='Paid Date' value={fmt(invoice.paid_date)} accent={invoice.paid_date ? 'text-green-400' : undefined} />
            </div>
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
                <div key={n.id} className='group/note flex items-start gap-2 py-2 border-b border-surface-600 last:border-0'>
                  <div className='flex-1 min-w-0'>
                    <p className='text-xs text-gray-300 whitespace-pre-wrap'>{n.content}</p>
                    <p className='text-2xs text-gray-700 mt-0.5'>{fmtDT(n.created_at)}</p>
                  </div>
                  <button onClick={() => delNote(n.id)} className='opacity-0 group-hover/note:opacity-100 p-1 rounded hover:bg-surface-600 text-gray-600 hover:text-red-400 transition-all'><X size={10} /></button>
                </div>
              ))
            }
          </div>
        </div>
      </div>
    </div>
  )
}
