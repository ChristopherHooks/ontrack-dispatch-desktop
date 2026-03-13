import { useSettingsStore } from '../store/settingsStore'
import type { Theme } from '../store/settingsStore'
import { Sun, Moon, Monitor, Database, User, Percent } from 'lucide-react'

export function Settings() {
  const { theme, setTheme, companyName, ownerName, ownerEmail, defaultDispatchPct } = useSettingsStore()

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
            {([
              { value: 'dark' as Theme,   label: 'Dark',   icon: Moon },
              { value: 'light' as Theme,  label: 'Light',  icon: Sun },
              { value: 'system' as Theme, label: 'System', icon: Monitor },
            ] as const).map(({ value, label, icon: Icon }) => (
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
        <p className='text-2xs text-gray-600 mt-3'>Business settings are editable in Phase 1 build.</p>
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
          <p className='text-2xs text-gray-600'>Data path configuration available in Phase 1 build.</p>
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
