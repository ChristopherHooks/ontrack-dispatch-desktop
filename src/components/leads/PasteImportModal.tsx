import { useState, useRef, useEffect } from 'react'
import { X } from 'lucide-react'
import type { CsvImportResult } from '../../types/models'

interface Props {
  onClose:  () => void
  onResult: (result: CsvImportResult) => void
}

export function PasteImportModal({ onClose, onResult }: Props) {
  const [text,  setText]  = useState('')
  const [busy,  setBusy]  = useState(false)
  const [error, setError] = useState<string | null>(null)
  const taRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => { taRef.current?.focus() }, [])

  // Use String.fromCharCode to avoid escape-sequence issues in source
  const TAB = String.fromCharCode(9)
  const LF  = String.fromCharCode(10)
  const CR  = String.fromCharCode(13)

  // Live row count: lines minus blank lines minus header row
  const rowCount = text.trim()
    ? text.split(LF).map(l => l.endsWith(CR) ? l.slice(0, -1) : l).filter(l => l.trim().length > 0).length - 1
    : 0

  const handleImport = async () => {
    if (!text.trim()) { setError('Paste your spreadsheet data first.'); return }
    setBusy(true)
    setError(null)
    try {
      const result = await window.api.leads.importPaste(text)
      onResult(result)
      onClose()
    } catch (err) {
      setError('Import failed: ' + String(err))
    } finally {
      setBusy(false)
    }
  }

  const placeholder =
    'company' + TAB + 'mc_number' + TAB + 'phone' + TAB + 'city' + TAB + 'state' + LF +
    'Acme Freight LLC' + TAB + 'MC123456' + TAB + '555-867-5309' + TAB + 'Dallas' + TAB + 'TX' + LF +
    'Blue Ridge Transport' + TAB + 'MC654321' + TAB + '555-100-2000' + TAB + 'Atlanta' + TAB + 'GA'

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm'>
      <div className='bg-surface-800 border border-surface-600 rounded-xl shadow-2xl w-full max-w-lg mx-4'>

        {/* Header */}
        <div className='flex items-center justify-between px-5 py-4 border-b border-surface-600'>
          <div>
            <h2 className='text-sm font-semibold text-gray-100'>Paste Spreadsheet Data</h2>
            <p className='text-xs text-gray-500 mt-0.5'>Copy rows from Excel or Google Sheets, then paste below</p>
          </div>
          <button onClick={onClose} className='text-gray-500 hover:text-gray-300 transition-colors'>
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className='px-5 py-4 space-y-3'>
          <textarea
            ref={taRef}
            value={text}
            onChange={e => { setText(e.target.value); setError(null) }}
            placeholder={placeholder}
            rows={8}
            className='w-full bg-surface-700 border border-surface-500 rounded-lg px-3 py-2 text-xs text-gray-200 placeholder-gray-600 font-mono focus:outline-none focus:border-orange-600/60 focus:ring-1 focus:ring-orange-600/20 resize-none transition-colors'
          />
          <div className='flex items-center justify-between text-2xs text-gray-600'>
            <span>
              {rowCount > 0
                ? rowCount + ' data row' + (rowCount !== 1 ? 's' : '') + ' detected'
                : 'Include your header row as the first line'}
            </span>
            <span>Tab-separated — Excel / Google Sheets copy-paste</span>
          </div>
          {error && <p className='text-xs text-red-400'>{error}</p>}
        </div>

        {/* Footer */}
        <div className='flex items-center justify-end gap-2 px-5 py-4 border-t border-surface-600'>
          <button
            onClick={onClose}
            className='px-4 h-8 rounded-lg text-xs font-medium text-gray-400 hover:text-gray-200 hover:bg-surface-700 transition-colors'
          >
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={busy || rowCount < 1}
            className='flex items-center gap-1.5 px-4 h-8 rounded-lg text-xs font-semibold bg-orange-600 hover:bg-orange-500 active:bg-orange-700 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors shadow-glow-orange'
          >
            {busy
              ? <><svg className='animate-spin h-3 w-3' viewBox='0 0 24 24' fill='none'><circle className='opacity-25' cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='4' /><path className='opacity-75' fill='currentColor' d='M4 12a8 8 0 018-8v8z' /></svg> Importing…</>
              : 'Import ' + (rowCount > 0 ? rowCount + ' row' + (rowCount !== 1 ? 's' : '') : 'Rows')
            }
          </button>
        </div>

      </div>
    </div>
  )
}
