import { useEffect } from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell'
import { useSettingsStore } from './store/settingsStore'

// Pages
import { Dashboard }  from './pages/Dashboard'
import { Leads }      from './pages/Leads'
import { Drivers }    from './pages/Drivers'
import { Loads }      from './pages/Loads'
import { Brokers }    from './pages/Brokers'
import { Invoices }   from './pages/Invoices'
import { Marketing }  from './pages/Marketing'
import { Tasks }      from './pages/Tasks'
import { Documents }  from './pages/Documents'
import { Analytics }  from './pages/Analytics'
import { Help }       from './pages/Help'
import { Settings }   from './pages/Settings'

export function App() {
  const loadFromStore = useSettingsStore((s) => s.loadFromStore)

  useEffect(() => {
    loadFromStore()
  }, [loadFromStore])

  return (
    <HashRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path='/' element={<AppShell />}>
          <Route index element={<Navigate to='/dashboard' replace />} />
          <Route path='dashboard'  element={<Dashboard />} />
          <Route path='leads'      element={<Leads />} />
          <Route path='drivers'    element={<Drivers />} />
          <Route path='loads'      element={<Loads />} />
          <Route path='brokers'    element={<Brokers />} />
          <Route path='invoices'   element={<Invoices />} />
          <Route path='marketing'  element={<Marketing />} />
          <Route path='tasks'      element={<Tasks />} />
          <Route path='documents'  element={<Documents />} />
          <Route path='analytics'  element={<Analytics />} />
          <Route path='help'       element={<Help />} />
          <Route path='settings'   element={<Settings />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}
