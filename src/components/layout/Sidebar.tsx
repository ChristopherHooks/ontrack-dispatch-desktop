import { NavLink } from 'react-router-dom'
import { useSettingsStore } from '../../store/settingsStore'
import {
  LayoutDashboard, Users, Truck, Package, Building2,
  FileText, Megaphone, CheckSquare, FolderOpen,
  BarChart3, HelpCircle, Settings, ChevronLeft, ChevronRight, Kanban
} from 'lucide-react'

interface NavItem {
  to:    string
  label: string
  icon:  React.ReactNode
}

const NAV_ITEMS: NavItem[] = [
  { to: '/dashboard',  label: 'Dashboard',  icon: <LayoutDashboard size={18} /> },
  { to: '/dispatcher', label: 'Dispatcher', icon: <Kanban size={18} /> },
  { to: '/leads',      label: 'Leads',      icon: <Users size={18} /> },
  { to: '/drivers',    label: 'Drivers',    icon: <Truck size={18} /> },
  { to: '/loads',      label: 'Loads',      icon: <Package size={18} /> },
  { to: '/brokers',    label: 'Brokers',    icon: <Building2 size={18} /> },
  { to: '/invoices',   label: 'Invoices',   icon: <FileText size={18} /> },
  { to: '/marketing',  label: 'Marketing',  icon: <Megaphone size={18} /> },
  { to: '/tasks',      label: 'Tasks',      icon: <CheckSquare size={18} /> },
  { to: '/documents',  label: 'Documents',  icon: <FolderOpen size={18} /> },
  { to: '/analytics',  label: 'Analytics',  icon: <BarChart3 size={18} /> },
]

const BOTTOM_ITEMS: NavItem[] = [
  { to: '/help',       label: 'Help',       icon: <HelpCircle size={18} /> },
  { to: '/settings',   label: 'Settings',   icon: <Settings size={18} /> },
]

export function Sidebar() {
  const { sidebarCollapsed, toggleSidebar } = useSettingsStore()
  const w = sidebarCollapsed ? 60 : 220

  return (
    <aside
      className='fixed left-0 top-0 h-screen flex flex-col bg-surface-750 border-r border-surface-400 z-50 transition-all duration-250'
      style={{ width: w }}
    >
      {/* Logo / Brand */}
      <div className='flex items-center gap-3 px-3 py-4 border-b border-surface-400 shrink-0'>
        <div className='w-8 h-8 rounded-lg bg-orange-600 flex items-center justify-center shrink-0 shadow-glow-orange'>
          <Truck size={16} className='text-white' />
        </div>
        {!sidebarCollapsed && (
          <div className='min-w-0'>
            <p className='text-xs font-bold text-white truncate leading-tight'>OnTrack</p>
            <p className='text-2xs text-gray-500 truncate'>Dispatch Dashboard</p>
          </div>
        )}
      </div>

      {/* Main nav */}
      <nav className='flex-1 overflow-y-auto py-3 px-2 space-y-0.5'>
        {NAV_ITEMS.map((item) => (
          <SidebarLink key={item.to} item={item} collapsed={sidebarCollapsed} />
        ))}
      </nav>

      {/* Bottom nav */}
      <div className='py-3 px-2 border-t border-surface-400 space-y-0.5'>
        {BOTTOM_ITEMS.map((item) => (
          <SidebarLink key={item.to} item={item} collapsed={sidebarCollapsed} />
        ))}
      </div>

      {/* Collapse toggle */}
      <button
        onClick={toggleSidebar}
        className='absolute -right-3 top-16 w-6 h-6 rounded-full bg-surface-600 border border-surface-400 flex items-center justify-center text-gray-400 hover:text-orange-500 hover:border-orange-600 transition-colors shadow-card'
        title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {sidebarCollapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </button>
    </aside>
  )
}

function SidebarLink({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  return (
    <NavLink
      to={item.to}
      title={collapsed ? item.label : undefined}
      className={({ isActive }) =>
        [
          'flex items-center gap-3 px-2.5 py-2 rounded-lg text-sm transition-all duration-150 group',
          isActive
            ? 'bg-orange-600/20 text-orange-400 font-medium'
            : 'text-gray-400 hover:bg-surface-600 hover:text-gray-100',
        ].join(' ')
      }
    >
      <span className='shrink-0 group-[.active]:text-orange-400'>{item.icon}</span>
      {!collapsed && <span className='truncate'>{item.label}</span>}
    </NavLink>
  )
}
