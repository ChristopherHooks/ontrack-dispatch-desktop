import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { TopBar }  from './TopBar'
import { useSettingsStore } from '../../store/settingsStore'

export function AppShell() {
  const collapsed = useSettingsStore((s) => s.sidebarCollapsed)

  return (
    <div className='flex h-screen w-screen overflow-hidden bg-surface-800 text-gray-100'>
      <Sidebar />
      <div
        className='flex flex-col flex-1 min-w-0 transition-all duration-250'
        style={{ marginLeft: collapsed ? 60 : 220 }}
      >
        <TopBar />
        <main className='flex-1 overflow-y-auto p-6 animate-fade-in'>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
