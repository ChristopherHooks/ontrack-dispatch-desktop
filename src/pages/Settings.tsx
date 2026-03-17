import { useState, useEffect } from 'react'
import { useSettingsStore } from '../store/settingsStore'
import type { Theme } from '../store/settingsStore'
import { Sun, Moon, Monitor, Database, User, HardDrive, AlertTriangle, CheckCircle, Link, FlaskConical } from 'lucide-react'

interface BackupEntry {
  filename: string
  file_path: string
  size_bytes: number
  created_at: string
}

export function Settings() {
  const { theme, setTheme, companyName, ownerName, ownerEmail, defaultDispatchPct } = useSettingsStore()
  const [backups, setBackups]         = useState<BackupEntry[]>([])
  const [creatingBackup, setCreating] = useState(false)
  const [restoreTarget, setRestoreTarget] = useState<string | null>(null)
  const [pendingRestore, setPendingRestore] = useState<string | null>(null)
  const [statusMsg, setStatusMsg]     = useState('')
  const [fmcsaKey, setFmcsaKey]       = useState('')
  const [fmcsaTerms, setFmcsaTerms]   = useState('')
  const [fmcsaSaved, setFmcsaSaved]   = useState(false)
  const [claudeKey, setClaudeKey]     = useState('')
  const [claudeSaved, setClaudeSaved] = useState(false)
  const [backfillBusy, setBackfillBusy] = useState(false)
  const [backfillMsg,  setBackfillMsg]  = useState<{ text: string; ok: boolean } | null>(null)
  const [seedBusy,       setSeedBusy]       = useState(false)
  const [seedMsg,        setSeedMsg]        = useState('')
  const [clearBusy,      setClearBusy]      = useState(false)
  const [docReseedBusy,  setDocReseedBusy]  = useState(false)
  const [docReseedMsg,   setDocReseedMsg]   = useState('')

  useEffect(() => {
    loadBackups()
    window.api.backups.pending().then(setPendingRestore).catch(() => {})
    window.api.settings.get('fmcsa_web_key').then(v => { if (v) setFmcsaKey(String(v)) }).catch(() => {})
    window.api.settings.get('fmcsa_search_terms').then(v => { if (v) setFmcsaTerms(String(v)) }).catch(() => {})
    window.api.settings.get('claude_api_key').then(v => { if (v) setClaudeKey(String(v)) }).catch(() => {})
  }, [])

  async function loadBackups() {
    try {
      const list = await window.api.backups.list()
      setBackups(list)
    } catch {}
  }

  async function handleCreateBackup() {
    setCreating(true)
    setStatusMsg('')
    try {
      const entry = await window.api.backups.create()
      if (entry) {
        setStatusMsg('Backup created: ' + entry.filename)
        await loadBackups()
      } else {
        setStatusMsg('A backup already exists for today.')
      }
    } catch {
      setStatusMsg('Backup failed.')
    } finally {
      setCreating(false)
    }
  }

  async function handleStageRestore(filePath: string, filename: string) {
    const ok = await window.api.backups.stageRestore(filePath)
    if (ok) {
      setPendingRestore(filename)
      setRestoreTarget(null)
      setStatusMsg('Restore staged. Restart OnTrack to apply.')
    } else {
      setStatusMsg('Restore failed: file not found.')
    }
  }

  async function handleSeedData() {
    setSeedBusy(true)
    setSeedMsg('')
    try {
      await window.api.dev.seedTasksOnly() // tasks 101-118 + docs 101-108, INSERT OR IGNORE
      setSeedMsg('Task templates loaded — navigate to Tasks to see them.')
    } catch {
      setSeedMsg('Seed failed. Check the console for details.')
    } finally {
      setSeedBusy(false)
    }
  }

  async function handleReseedDocs() {
    setDocReseedBusy(true)
    setDocReseedMsg('')
    try {
      await (window.api.dev as any).reseedDocs()
      setDocReseedMsg('Document library rebuilt — 20 documents updated in Documents.')
    } catch {
      setDocReseedMsg('Failed. Check the console for details.')
    } finally {
      setDocReseedBusy(false)
    }
  }

  async function handleClearSeedData() {
    if (!window.confirm('Remove all sample brokers, drivers, loads, leads, and invoices? Tasks and documents will not be affected.')) return
    setClearBusy(true)
    setSeedMsg('')
    try {
      await window.api.dev.clearSeedData()
      setSeedMsg('Sample business data removed. Tasks and documents are untouched.')
    } catch {
      setSeedMsg('Clear failed. Check the console for details.')
    } finally {
      setClearBusy(false)
    }
  }

  async function handleSaveFmcsa() {
    await window.api.settings.set('fmcsa_web_key', fmcsaKey.trim())
    await window.api.settings.set('fmcsa_search_terms', fmcsaTerms.trim())
    setFmcsaSaved(true)
    setTimeout(() => setFmcsaSaved(false), 2500)
  }

  async function handleSaveClaude() {
    await window.api.settings.set('claude_api_key', claudeKey.trim())
    setClaudeSaved(true)
    setTimeout(() => setClaudeSaved(false), 2500)
  }

  async function handleBackfill() {
    setBackfillBusy(true)
    setBackfillMsg(null)
    try {
      const r = await (window.api.leads as any).backfillLeadData()
      const hasErrors = r.errors && r.errors.length > 0
      setBackfillMsg({
        ok: !hasErrors,
        text: `Re-prioritized ${r.reprioritized} leads · enriched ${r.enriched} with fleet size` +
              (hasErrors ? ` · ${r.errors.length} error(s)` : ''),
      })
    } catch (e) {
      setBackfillMsg({ ok: false, text: 'Backfill failed: ' + String(e) })
    } finally {
      setBackfillBusy(false)
    }
  }

  function fmtSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  return (
    <div className='max-w-2xl space-y-8 animate-fade-in'>

      <div>
        <h1 className='text-xl font-bold text-gray-100'>Settings</h1>
        <p className='text-sm text-gray-500 mt-1'>Configure your OnTrack Dispatch Dashboard</p>
      </div>

      {/* Appearance */}
      <Section title='Appearance' icon={<Monitor size={16} />}>
        <div>
          <Label>Theme</Label>
          <div className='flex gap-2 mt-2'>
            {([{value: 'dark' as Theme, label: 'Dark', icon: Moon},{value: 'light' as Theme, label: 'Light', icon: Sun},{value: 'system' as Theme, label: 'System', icon: Monitor}] as const).map(({ value, label, icon: Icon }) => (
              <ThemeOption
                key={value}
                active={theme === value}
                label={label}
                icon={<Icon size={16} />}
                onClick={() => setTheme(value)}
              />
            ))}
          </div>
        </div>
      </Section>

      {/* Business info */}
      <Section title='Business Information' icon={<User size={16} />}>
        <div className='grid grid-cols-2 gap-4'>
          <ReadField label='Company' value={companyName} />
          <ReadField label='Owner'   value={ownerName} />
          <ReadField label='Email'   value={ownerEmail} />
          <ReadField label='Default Dispatch %' value={String(defaultDispatchPct) + '%'} />
        </div>
      </Section>

      {/* Data / Storage */}
      <Section title='Data Storage' icon={<Database size={16} />}>
        <div className='space-y-3'>
          <p className='text-sm text-gray-400'>
            Database is stored locally in your app data folder.
            To sync across two computers, move the data folder into Google Drive.
          </p>
          <div className='bg-surface-600 rounded-lg border border-surface-400 p-3'>
            <p className='text-2xs text-gray-500 font-mono'>OnTrackDashboard/</p>
            <p className='text-2xs text-gray-600 font-mono ml-4'>database.db</p>
            <p className='text-2xs text-gray-600 font-mono ml-4'>drivers/</p>
            <p className='text-2xs text-gray-600 font-mono ml-4'>documents/</p>
            <p className='text-2xs text-gray-600 font-mono ml-4'>backups/  (auto-daily)</p>
          </div>
        </div>
      </Section>

      {/* Backup & Restore */}
      <Section title='Backup & Restore' icon={<HardDrive size={16} />}>
        <div className='space-y-4'>

          {/* Status messages */}
          {statusMsg && (
            <div className='flex items-center gap-2 text-xs px-3 py-2 bg-orange-900/20 border border-orange-700/40 text-orange-300 rounded-lg'>
              <CheckCircle size={13} /> {statusMsg}
            </div>
          )}

          {/* Pending restore notice */}
          {pendingRestore && (
            <div className='flex items-center gap-2 text-xs px-3 py-2 bg-yellow-900/20 border border-yellow-700/40 text-yellow-300 rounded-lg'>
              <AlertTriangle size={13} />
              Restore staged: <span className='font-mono'>{pendingRestore}</span> — restart OnTrack to apply.
            </div>
          )}

          <div className='flex items-center justify-between'>
            <div>
              <p className='text-sm text-gray-300 font-medium'>Backups</p>
              <p className='text-xs text-gray-500'>{backups.length} backup{backups.length !== 1 ? 's' : ''} available · auto-created daily</p>
            </div>
            <button
              onClick={handleCreateBackup}
              disabled={creatingBackup}
              className='text-xs px-3 py-1.5 bg-surface-600 hover:bg-surface-500 border border-surface-400 text-gray-300 rounded-lg transition-colors disabled:opacity-50'
            >
              {creatingBackup ? 'Creating...' : 'Create Backup Now'}
            </button>
          </div>

          {backups.length === 0 ? (
            <p className='text-xs text-gray-600 italic'>No backups found in the backups/ folder.</p>
          ) : (
            <div className='space-y-1 max-h-64 overflow-y-auto'>
              {backups.map(b => (
                <div
                  key={b.filename}
                  className='flex items-center gap-3 px-3 py-2.5 bg-surface-600 rounded-lg border border-surface-400'
                >
                  <div className='flex-1 min-w-0'>
                    <p className='text-xs font-mono text-gray-200 truncate'>{b.filename}</p>
                    <p className='text-2xs text-gray-500'>{fmtSize(b.size_bytes)}</p>
                  </div>
                  {restoreTarget === b.file_path ? (
                    <div className='flex items-center gap-2'>
                      <span className='text-2xs text-yellow-400'>Confirm restore?</span>
                      <button
                        onClick={() => handleStageRestore(b.file_path, b.filename)}
                        className='text-2xs px-2 py-1 bg-yellow-700 hover:bg-yellow-600 text-white rounded transition-colors'
                      >
                        Yes, stage it
                      </button>
                      <button
                        onClick={() => setRestoreTarget(null)}
                        className='text-2xs text-gray-500 hover:text-gray-300'
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setRestoreTarget(b.file_path)}
                      className='text-2xs px-3 py-1 border border-surface-300 text-gray-400 hover:text-yellow-400 hover:border-yellow-600/40 rounded-lg transition-colors'
                    >
                      Restore
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </Section>

      {/* Integrations */}
      <Section title='Integrations' icon={<Link size={16} />}>
        <div className='space-y-4'>
          <div>
            <Label>FMCSA Web Key</Label>
            <input
              type='password'
              value={fmcsaKey}
              onChange={e => setFmcsaKey(e.target.value)}
              placeholder='Paste your FMCSA QCMobile web key here'
              className='w-full text-sm bg-surface-600 border border-surface-400 text-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-orange-600/60'
            />
            <p className='text-2xs text-gray-600 mt-1'>
              Register free at mobile.fmcsa.dot.gov/QCDevsite/home — used by the FMCSA import on the Leads page.
            </p>
          </div>
          <div>
            <Label>Search Terms (comma-separated)</Label>
            <input
              type='text'
              value={fmcsaTerms}
              onChange={e => setFmcsaTerms(e.target.value)}
              placeholder='Texas, Georgia, Illinois, Tennessee, Ohio'
              className='w-full text-sm bg-surface-600 border border-surface-400 text-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-orange-600/60'
            />
            <p className='text-2xs text-gray-600 mt-1'>
              Each term triggers one API search. State names work well — many carriers include their home state in their name.
              Leave blank to use the 7 built-in defaults.
            </p>
          </div>
          <div className='flex items-center gap-3'>
            <button
              onClick={handleSaveFmcsa}
              className='text-xs px-4 py-1.5 bg-orange-600 hover:bg-orange-500 text-white rounded-lg transition-colors'
            >
              Save
            </button>
            {fmcsaSaved && (
              <span className='text-xs text-green-400 flex items-center gap-1'>
                <CheckCircle size={12} /> Saved
              </span>
            )}
          </div>

          {/* Re-enrich existing leads */}
          <div className='border-t border-surface-500 pt-4'>
            <p className='text-xs font-medium text-gray-400 mb-1'>Re-enrich Existing Leads</p>
            <p className='text-2xs text-gray-600 mb-3'>
              Scrapes SAFER for any leads missing fleet size, then re-prioritizes all FMCSA leads
              using your current rules (30–180 day authority + 1–3 trucks = High).
            </p>
            <div className='flex items-center gap-3'>
              <button
                onClick={handleBackfill}
                disabled={backfillBusy}
                className='text-xs px-4 py-1.5 bg-surface-500 hover:bg-surface-400 text-gray-300 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
              >
                {backfillBusy ? 'Running…' : 'Re-enrich & Re-prioritize'}
              </button>
              {backfillMsg && (
                <span className={`text-xs flex items-center gap-1 ${backfillMsg.ok ? 'text-green-400' : 'text-orange-400'}`}>
                  <CheckCircle size={12} /> {backfillMsg.text}
                </span>
              )}
            </div>
          </div>
        </div>
      </Section>

      {/* AI Integration */}
      <Section title='AI Integration' icon={<Link size={16} />}>
        <div className='space-y-3'>
          <div>
            <Label>Claude API Key</Label>
            <input
              type='password'
              value={claudeKey}
              onChange={e => setClaudeKey(e.target.value)}
              placeholder='sk-ant-...'
              className='w-full text-sm bg-surface-600 border border-surface-400 text-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-orange-600/60'
            />
            <p className='text-2xs text-gray-600 mt-1'>
              Required for the FB Agents tab (Conversation, Lead Hunter, Content). Get a key at console.anthropic.com.
              Stored locally in app settings — never sent anywhere except Anthropic.
            </p>
          </div>
          <div className='flex items-center gap-3'>
            <button
              onClick={handleSaveClaude}
              className='text-xs px-4 py-1.5 bg-orange-600 hover:bg-orange-500 text-white rounded-lg transition-colors'
            >
              Save
            </button>
            {claudeSaved && (
              <span className='text-xs text-green-400 flex items-center gap-1'>
                <CheckCircle size={12} /> Saved
              </span>
            )}
          </div>
        </div>
      </Section>

      {/* Google Drive sync notes */}
      <Section title='Google Drive Sync' icon={<Database size={16} />}>
        <div className='space-y-3 text-sm text-gray-400'>
          <p>
            OnTrack is local-first. To sync between two computers, move the
            <span className='font-mono text-gray-300 mx-1'>OnTrackDashboard/</span>
            folder into a Google Drive-synced directory, then set the data path here.
          </p>
          <div className='bg-yellow-900/10 border border-yellow-700/30 rounded-lg p-3 space-y-1.5'>
            <p className='text-xs font-semibold text-yellow-400 flex items-center gap-1.5'>
              <AlertTriangle size={12} /> Sync Limitations
            </p>
            <ul className='text-xs text-yellow-300/70 space-y-1 list-disc list-inside'>
              <li>Never open the app on both computers simultaneously — SQLite WAL files are not multi-writer safe.</li>
              <li>Google Drive does not lock files. If both computers sync the same DB at the same time, data corruption can occur.</li>
              <li>Recommended workflow: open on computer A, close fully (including system tray), let Drive sync, then open on computer B.</li>
              <li>Daily backups are your safety net. Restore via the Backup panel above if a conflict occurs.</li>
            </ul>
          </div>
        </div>
      </Section>

      {/* Sample Data */}
      <Section title='Sample Data' icon={<FlaskConical size={16} />}>
        <div className='space-y-3'>
          {seedMsg && (
            <div className='flex items-center gap-2 text-xs px-3 py-2 bg-orange-900/20 border border-orange-700/40 text-orange-300 rounded-lg'>
              <CheckCircle size={13} /> {seedMsg}
            </div>
          )}
          {docReseedMsg && (
            <div className='flex items-center gap-2 text-xs px-3 py-2 bg-green-900/20 border border-green-700/40 text-green-300 rounded-lg'>
              <CheckCircle size={13} /> {docReseedMsg}
            </div>
          )}
          <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
            <div className='bg-surface-600 border border-surface-400 rounded-lg p-4 space-y-2'>
              <p className='text-xs font-semibold text-gray-300'>Load Task Templates</p>
              <p className='text-xs text-gray-500'>
                Adds the built-in daily and weekly task checklist (18 tasks) and SOP documents.
                Safe to run at any time — skips rows that already exist.
              </p>
              <button
                onClick={handleSeedData}
                disabled={seedBusy || clearBusy}
                className='text-xs px-3 py-1.5 bg-orange-600/20 hover:bg-orange-600/30 border border-orange-600/40 text-orange-300 rounded-lg transition-colors disabled:opacity-50'
              >
                {seedBusy ? 'Loading…' : 'Load Task Templates'}
              </button>
            </div>
            <div className='bg-surface-600 border border-surface-400 rounded-lg p-4 space-y-2'>
              <p className='text-xs font-semibold text-gray-300'>Rebuild Document Library</p>
              <p className='text-xs text-gray-500'>
                Writes all 20 expanded SOPs, scripts, training docs, and reference guides to the Documents page.
                Overwrites existing documents 101-108 and adds new ones. Safe to run anytime.
              </p>
              <button
                onClick={handleReseedDocs}
                disabled={docReseedBusy}
                className='text-xs px-3 py-1.5 bg-green-600/20 hover:bg-green-600/30 border border-green-600/40 text-green-300 rounded-lg transition-colors disabled:opacity-50'
              >
                {docReseedBusy ? 'Rebuilding...' : 'Rebuild Document Library'}
              </button>
            </div>
            <div className='bg-surface-600 border border-surface-400 rounded-lg p-4 space-y-2'>
              <p className='text-xs font-semibold text-gray-300'>Remove Sample Business Data</p>
              <p className='text-xs text-gray-500'>
                Deletes sample brokers, drivers, loads, leads, and invoices (id ≥ 101).
                Tasks and documents are not affected.
              </p>
              <button
                onClick={handleClearSeedData}
                disabled={seedBusy || clearBusy}
                className='text-xs px-3 py-1.5 bg-red-600/20 hover:bg-red-600/30 border border-red-600/40 text-red-300 rounded-lg transition-colors disabled:opacity-50'
              >
                {clearBusy ? 'Removing…' : 'Remove Sample Data'}
              </button>
            </div>
          </div>
        </div>
      </Section>

      {/* Version */}
      <div className='text-2xs text-gray-700 pt-4 border-t border-surface-400'>
        OnTrack Dispatch Dashboard v1.0.0 · Electron + React + SQLite
      </div>
    </div>
  )
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className='bg-surface-700 rounded-xl border border-surface-400 p-5 shadow-card'>
      <div className='flex items-center gap-2 mb-4 pb-3 border-b border-surface-400'>
        <span className='text-orange-500'>{icon}</span>
        <h2 className='text-sm font-semibold text-gray-200'>{title}</h2>
      </div>
      {children}
    </div>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return <p className='text-xs font-medium text-gray-400 mb-1'>{children}</p>
}

function ReadField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <Label>{label}</Label>
      <p className='text-sm text-gray-200 bg-surface-600 rounded-lg px-3 py-2 border border-surface-400'>{value}</p>
    </div>
  )
}

function ThemeOption({ active, label, icon, onClick }: { active: boolean; label: string; icon: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={[
        'flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-all',
        active
          ? 'bg-orange-600/20 border-orange-600 text-orange-400'
          : 'bg-surface-600 border-surface-400 text-gray-400 hover:text-gray-200 hover:border-surface-300',
      ].join(' ')}
    >
      {icon}
      {label}
    </button>
  )
}
