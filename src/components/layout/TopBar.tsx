import { useLocation } from 'react-router-dom'
import { useSettingsStore } from '../../store/settingsStore'
import { useAuthStore } from '../../store/authStore'
import { useUIStore } from '../../store/uiStore'
import { Sun, Moon, Monitor, Search } from 'lucide-react'
import type { Theme } from '../../store/settingsStore'

const PAGE_TITLES: Record<string, string> = {
  '/dashboard':  'Dashboard',
  '/leads':      'Lead Pipeline',
  '/drivers':    'Active Drivers',
  '/loads':      'Dispatch Board',
  '/brokers':    'Broker Database',
  '/invoices':   'Invoices',
  '/marketing':  'Marketing',
  '/tasks':      'Tasks',
  '/documents':  'Documents',
  '/analytics':  'Analytics',
  '/help':       'Help & SOPs',
  '/settings':   'Settings',
}

export function TopBar() {
  const location = useLocation()
  const { theme, setTheme } = useSettingsStore()
  const user = useAuthStore((s) => s.user)
  const { openGlobalSearch } = useUIStore()
  const title = PAGE_TITLES[location.pathname] ?? 'OnTrack'

  const themes: { value: Theme; icon: React.ReactNode; label: string }[] = [
    { value: 'dark',   icon: <Moon size={14} />,    label: 'Dark' },
    { value: 'light',  icon: <Sun size={14} />,     label: 'Light' },
    { value: 'system', icon: <Monitor size={14} />, label: 'System' },
  ]

  return (
    <header className='h-12 shrink-0 flex items-center justify-between px-6 border-b border-surface-400 bg-surface-800'>
      <h1 className='text-sm font-semibold text-gray-100'>{title}</h1>

      <div className='flex items-center gap-3'>
        {/* Global search button */}
        <button onClick={openGlobalSearch}
          className='flex items-center gap-2 px-3 py-1.5 bg-surface-700 hover:bg-surface-600 border border-surface-400 hover:border-surface-300 rounded-lg text-xs text-gray-500 hover:text-gray-300 transition-colors'>
          <Search size={12} />
          <span className='hidden sm:inline'>Search</span>
          <kbd className='hidden sm:inline px-1 bg-surface-600 rounded text-2xs text-gray-600'>Ctrl K</kbd>
        </button>

        {/* Theme switcher */}
        <div className='flex items-center gap-1 bg-surface-700 rounded-lg p-1'>
          {themes.map((t) => (
            <button key={t.value} onClick={() => setTheme(t.value)} title={t.label}
              className={'w-6 h-6 rounded flex items-center justify-center transition-colors ' +
                (theme === t.value ? 'bg-surface-500 text-orange-400' : 'text-gray-500 hover:text-gray-300')}>
              {t.icon}
            </button>
          ))}
        </div>

        {/* User badge */}
        <div className='flex items-center gap-2'>
          <div className='w-7 h-7 rounded-full bg-orange-600 flex items-center justify-center text-xs font-bold text-white'>
            {user?.name.charAt(0) ?? 'U'}
          </div>
          <div className='hidden sm:block'>
            <p className='text-xs font-medium text-gray-200 leading-none'>{user?.name}</p>
            <p className='text-2xs text-gray-500 leading-none mt-0.5'>{user?.role}</p>
          </div>
        </div>
      </div>
    </header>
  )
}
