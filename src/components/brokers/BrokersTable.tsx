import { useState, useRef, useEffect } from 'react'
import { ChevronUp, ChevronDown, ChevronsUpDown, Edit2, Trash2, ChevronDown as DropIcon } from 'lucide-react'
import type { Broker } from '../../types/models'
import { FLAG_STYLES, BROKER_FLAGS, CREDIT_RATINGS } from './constants'
import type { BrokerFlag } from '../../types/models'
import { openSaferMc } from '../../lib/saferUrl'

interface Props {
  brokers: Broker[]; loading: boolean
  sortKey: keyof Broker; sortDir: 'asc' | 'desc'
  onSort: (k: keyof Broker) => void
  onSelect: (b: Broker) => void
  onEdit: (b: Broker) => void
  onDelete: (b: Broker) => void
  onUpdateAuthority?: (b: Broker, newAuth: number, minDays: number | null) => Promise<void>
  onUpdateBroker?: (b: Broker, patch: Partial<Broker>) => Promise<void>
}

const COLS: { key: keyof Broker; label: string; w: string }[] = [
  { key: 'name',          label: 'Broker',       w: 'w-44' },
  { key: 'mc_number',     label: 'MC #',          w: 'w-24' },
  { key: 'phone',         label: 'Phone',         w: 'w-32' },
  { key: 'email',         label: 'Email',         w: 'w-44' },
  { key: 'payment_terms', label: 'Terms',         w: 'w-20' },
  { key: 'credit_rating', label: 'Credit',        w: 'w-16' },
  { key: 'avg_days_pay',  label: 'Avg Days Pay',  w: 'w-28' },
  { key: 'flag',          label: 'Flag',          w: 'w-28' },
  { key: 'new_authority', label: 'New Auth',      w: 'w-28' },
]

// Converts broker new_authority + min_authority_days to a single option value
function authValue(b: Broker): string {
  if (!b.new_authority) return ''
  return b.min_authority_days != null ? String(b.min_authority_days) : 'any'
}

// Parses an option value back to { newAuth, minDays }
function parseAuthValue(v: string): { newAuth: number; minDays: number | null } {
  if (v === '') return { newAuth: 0, minDays: null }
  if (v === 'any') return { newAuth: 1, minDays: null }
  return { newAuth: 1, minDays: parseInt(v) }
}

const AUTH_OPTIONS: { value: string; label: string }[] = [
  { value: '',    label: 'No' },
  { value: 'any', label: 'Yes — any age' },
  { value: '30',  label: 'Yes — 30d+' },
  { value: '60',  label: 'Yes — 60d+' },
  { value: '90',  label: 'Yes — 90d+' },
  { value: '180', label: 'Yes — 180d+' },
]

function AuthDropdown({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const current = AUTH_OPTIONS.find(o => o.value === value)
  const isYes = value !== ''

  useEffect(() => {
    if (!open) return
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open])

  return (
    <div ref={ref} className='relative' onClick={e => e.stopPropagation()}>
      <button
        onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-1.5 h-6 pl-2 pr-1.5 rounded border text-2xs font-semibold transition-colors whitespace-nowrap
          ${isYes
            ? 'bg-orange-600 border-orange-500 text-white hover:bg-orange-500'
            : 'bg-surface-700 border-surface-500 text-gray-400 hover:bg-surface-600 hover:text-gray-100 hover:border-surface-300'
          }`}>
        {current?.label ?? 'No'}
        <DropIcon size={9} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className='absolute left-0 top-7 z-50 min-w-[140px] bg-surface-800 border border-surface-400 rounded-lg shadow-2xl overflow-hidden'>
          {AUTH_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => { onChange(opt.value); setOpen(false) }}
              className={`w-full text-left px-3 py-2 text-xs font-medium transition-colors
                ${opt.value === value
                  ? 'bg-orange-600 text-white'
                  : 'text-gray-100 hover:bg-surface-600 hover:text-white'
                }`}>
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function FlagDropdown({ value, onChange }: { value: BrokerFlag; onChange: (v: BrokerFlag) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    function handle(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open])
  const cls = FLAG_STYLES[value]
  return (
    <div ref={ref} className='relative' onClick={e => e.stopPropagation()}>
      <button onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-1 text-2xs px-2 py-0.5 rounded-full border font-medium transition-colors hover:opacity-80 ${cls}`}>
        {value === 'None' ? '---' : value}
        <DropIcon size={9} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className='absolute left-0 top-7 z-50 min-w-[120px] bg-surface-800 border border-surface-400 rounded-lg shadow-2xl overflow-hidden'>
          {BROKER_FLAGS.map(f => (
            <button key={f} onClick={() => { onChange(f); setOpen(false) }}
              className={`w-full text-left px-3 py-2 text-xs font-medium transition-colors
                ${f === value ? 'opacity-50 cursor-default' : 'text-gray-100 hover:bg-surface-600 hover:text-white'}`}>
              {f === 'None' ? 'None' : f}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

const CREDIT_COLORS: Record<string, string> = {
  'A+': 'bg-green-600 text-white border-green-500',
  'A':  'bg-green-600 text-white border-green-500',
  'B+': 'bg-blue-600 text-white border-blue-500',
  'B':  'bg-blue-600 text-white border-blue-500',
  'C':  'bg-amber-500 text-white border-amber-400',
  'D':  'bg-red-600 text-white border-red-500',
  'Unknown': 'bg-surface-500 text-gray-300 border-surface-400',
}

function CreditDropdown({ value, onChange }: { value: string | null; onChange: (v: string | null) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    function handle(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open])
  const display = value ?? '---'
  const cls = value ? (CREDIT_COLORS[value] ?? CREDIT_COLORS['Unknown']) : 'bg-surface-600 border-surface-400 text-gray-400'
  return (
    <div ref={ref} className='relative' onClick={e => e.stopPropagation()}>
      <button onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-1 text-2xs px-2 py-0.5 rounded-full border font-semibold transition-colors hover:opacity-80 ${cls}`}>
        {display}
        <DropIcon size={9} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className='absolute left-0 top-7 z-50 min-w-[100px] bg-surface-800 border border-surface-400 rounded-lg shadow-2xl overflow-hidden'>
          <button onClick={() => { onChange(null); setOpen(false) }}
            className='w-full text-left px-3 py-2 text-xs text-gray-400 hover:bg-surface-600 hover:text-white transition-colors'>
            Clear
          </button>
          {CREDIT_RATINGS.map(r => (
            <button key={r} onClick={() => { onChange(r); setOpen(false) }}
              className={`w-full text-left px-3 py-2 text-xs font-medium transition-colors
                ${r === value ? 'opacity-50 cursor-default' : 'text-gray-100 hover:bg-surface-600 hover:text-white'}`}>
              {r}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function AvgDaysInput({ value, onChange }: { value: number | null; onChange: (v: number | null) => void }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value != null ? String(value) : '')
  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => { if (editing) inputRef.current?.focus() }, [editing])
  const commit = () => {
    const n = parseInt(draft)
    onChange(isNaN(n) || n < 0 ? null : n)
    setEditing(false)
  }
  if (editing) {
    return (
      <input ref={inputRef} type='number' min='0' value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false) }}
        onClick={e => e.stopPropagation()}
        className='w-16 h-6 px-1.5 text-xs bg-surface-700 border border-orange-500 rounded text-gray-100 outline-none'
      />
    )
  }
  return (
    <button onClick={e => { e.stopPropagation(); setDraft(value != null ? String(value) : ''); setEditing(true) }}
      className='text-xs text-gray-300 hover:text-orange-400 transition-colors'
      title='Click to edit'>
      {value != null ? `${value}d` : <span className='text-gray-600'>---</span>}
    </button>
  )
}

function Sk() { return <div className='h-4 bg-surface-600 rounded animate-pulse' /> }

function SI({ col, sk, sd }: { col: keyof Broker; sk: keyof Broker; sd: string }) {
  if (col !== sk) return <ChevronsUpDown size={10} className='opacity-30' />
  return sd === 'asc' ? <ChevronUp size={10} className='text-orange-400' /> : <ChevronDown size={10} className='text-orange-400' />
}

export function BrokersTable({ brokers, loading, sortKey, sortDir, onSort, onSelect, onEdit, onDelete, onUpdateAuthority, onUpdateBroker }: Props) {
  return (
    <div className='flex-1 overflow-auto'>
      <table className='w-full text-xs border-collapse'>
        <thead className='sticky top-0 bg-surface-800 z-10'>
          <tr className='border-b border-surface-500'>
            {COLS.map(c => (
              <th key={c.key} onClick={() => onSort(c.key)}
                className={`${c.w} px-3 py-2.5 text-left text-2xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:text-gray-300 transition-colors`}>
                <div className='flex items-center gap-1'>{c.label}<SI col={c.key} sk={sortKey} sd={sortDir} /></div>
              </th>
            ))}
            <th className='w-16 px-3 py-2.5' />
          </tr>
        </thead>
        <tbody>
          {loading
            ? Array.from({ length: 6 }, (_, i) => (
              <tr key={i} className='border-b border-surface-600'>
                {COLS.map(c => <td key={c.key} className='px-3 py-2.5'><Sk /></td>)}
                <td className='px-3 py-2.5' />
              </tr>
            ))
            : brokers.length === 0
              ? <tr><td colSpan={COLS.length + 1} className='text-center py-16 text-sm text-gray-600'>No brokers yet. Add your first broker to get started.</td></tr>
              : brokers.map(b => (
                <tr key={b.id} onClick={() => onSelect(b)}
                  className='group border-b border-surface-600 hover:bg-surface-700/50 cursor-pointer transition-colors'>
                  <td className='px-3 py-2.5 font-medium text-gray-200'>{b.name}</td>
                  <td className='px-3 py-2.5 font-mono text-2xs'>
                    {b.mc_number
                      ? <button onClick={e => openSaferMc(b.mc_number, e)}
                          className='text-gray-400 hover:text-orange-400 hover:underline transition-colors cursor-pointer'
                          title='View on FMCSA SAFER'>{b.mc_number}</button>
                      : <span className='text-gray-700'>---</span>}
                  </td>
                  <td className='px-3 py-2.5 text-gray-400'>{b.phone ?? '---'}</td>
                  <td className='px-3 py-2.5 text-gray-400 truncate max-w-[176px]'>{b.email ?? '---'}</td>
                  <td className='px-3 py-2.5 text-gray-300'>{b.payment_terms ? `Net ${b.payment_terms}` : '---'}</td>
                  <td className='px-3 py-2.5'>
                    {onUpdateBroker
                      ? <CreditDropdown value={b.credit_rating ?? null} onChange={v => onUpdateBroker(b, { credit_rating: v ?? undefined })} />
                      : <span className={b.credit_rating === 'A+' || b.credit_rating === 'A' ? 'font-semibold text-green-400' : b.credit_rating === 'B+' || b.credit_rating === 'B' ? 'font-semibold text-blue-400' : b.credit_rating === 'C' ? 'text-amber-400' : 'text-gray-500'}>{b.credit_rating ?? '---'}</span>
                    }
                  </td>
                  <td className='px-3 py-2.5'>
                    {onUpdateBroker
                      ? <AvgDaysInput value={b.avg_days_pay ?? null} onChange={v => onUpdateBroker(b, { avg_days_pay: v ?? undefined })} />
                      : <span className={b.avg_days_pay != null && b.avg_days_pay > (b.payment_terms ?? 0) + 5 ? 'text-red-400 font-semibold' : 'text-gray-300'}>{b.avg_days_pay != null ? `${b.avg_days_pay}d` : '---'}</span>
                    }
                  </td>
                  <td className='px-3 py-2.5'>
                    {onUpdateBroker
                      ? <FlagDropdown value={b.flag} onChange={v => onUpdateBroker(b, { flag: v })} />
                      : b.flag !== 'None'
                        ? <span className={`text-2xs px-2 py-0.5 rounded-full border ${FLAG_STYLES[b.flag]}`}>{b.flag}</span>
                        : <span className='text-gray-600'>---</span>
                    }
                  </td>
                  <td className='px-3 py-2.5'>
                    {onUpdateAuthority ? (
                      <AuthDropdown
                        value={authValue(b)}
                        onChange={async v => {
                          const { newAuth, minDays } = parseAuthValue(v)
                          await onUpdateAuthority(b, newAuth, minDays)
                        }}
                      />
                    ) : (
                      <span className={b.new_authority ? 'text-orange-400' : 'text-gray-700'}>
                        {b.new_authority
                          ? (b.min_authority_days ? `${b.min_authority_days}d+` : 'Any age')
                          : '---'}
                      </span>
                    )}
                  </td>
                  <td className='px-3 py-2.5'>
                    <div className='flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity'>
                      <button onClick={e => { e.stopPropagation(); onEdit(b) }} className='p-1 rounded hover:bg-surface-600 text-gray-600 hover:text-orange-400'><Edit2 size={11} /></button>
                      <button onClick={e => { e.stopPropagation(); onDelete(b) }} className='p-1 rounded hover:bg-surface-600 text-gray-600 hover:text-red-400'><Trash2 size={11} /></button>
                    </div>
                  </td>
                </tr>
              ))
          }
        </tbody>
      </table>
    </div>
  )
}
