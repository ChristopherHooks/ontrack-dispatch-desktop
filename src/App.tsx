import { useEffect, Component, type ReactNode } from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell'
import { useSettingsStore } from './store/settingsStore'

// ---------------------------------------------------------------------------
// ErrorBoundary — catches unhandled React render errors so the whole app
// does not go blank. Renders a minimal recovery screen instead.
// ---------------------------------------------------------------------------

interface EBState { hasError: boolean; message: string }

class ErrorBoundary extends Component<{ children: ReactNode }, EBState> {
  constructor(props: { children: ReactNode }) {
    super(props)
    this.state = { hasError: false, message: '' }
  }
  static getDerivedStateFromError(err: unknown): EBState {
    return { hasError: true, message: err instanceof Error ? err.message : String(err) }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className='min-h-screen bg-surface-800 flex items-center justify-center p-8'>
          <div className='max-w-lg w-full bg-surface-700 border border-red-800/50 rounded-xl p-6 space-y-4'>
            <h1 className='text-red-400 font-semibold text-lg'>Something went wrong</h1>
            <p className='text-gray-400 text-sm'>An unexpected error occurred. Reload the window to recover.</p>
            {this.state.message && (
              <pre className='text-xs text-gray-500 bg-surface-600 rounded p-3 overflow-auto max-h-40 whitespace-pre-wrap'>
                {this.state.message}
              </pre>
            )}
            <button
              onClick={() => window.location.reload()}
              className='text-sm px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg transition-colors'
            >
              Reload
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

// Pages
import { Operations }      from './pages/Operations'
import { FindLoads }       from './pages/FindLoads'
import { LoadMatch }       from './pages/LoadMatch'
import { ActiveLoads }     from './pages/ActiveLoads'
import { Dashboard }          from './pages/Dashboard'
import { DocumentPopout }    from './pages/DocumentPopout'
import { DispatcherBoard } from './pages/DispatcherBoard'
import { Leads }      from './pages/Leads'
import { Drivers }    from './pages/Drivers'
import { Loads }      from './pages/Loads'
import { Brokers }    from './pages/Brokers'
import { Invoices }   from './pages/Invoices'
import { Marketing }       from './pages/Marketing'
import { Tasks }      from './pages/Tasks'
import { Documents }  from './pages/Documents'
import { Analytics }  from './pages/Analytics'
import { Reports }    from './pages/Reports'
import { Help }       from './pages/Help'
import { Settings }   from './pages/Settings'

export function App() {
  const loadFromStore = useSettingsStore((s) => s.loadFromStore)

  useEffect(() => {
    loadFromStore()
    // Auto-flag any Sent invoices that have exceeded broker payment terms
    window.api.invoices.autoFlag().catch(() => { /* non-critical */ })
  }, [loadFromStore])

  return (
    <ErrorBoundary>
    <HashRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        {/* Standalone pop-out window — no AppShell chrome */}
        <Route path='popout/:id' element={<DocumentPopout />} />
        <Route path='/' element={<AppShell />}>
          <Route index element={<Navigate to='/operations' replace />} />
          <Route path='operations'   element={<Operations />} />
          <Route path='loadmatch'    element={<LoadMatch />} />
          <Route path='findloads'    element={<FindLoads />} />
          <Route path='activeloads'  element={<ActiveLoads />} />
          <Route path='dashboard'    element={<Navigate to='/operations' replace />} />
          <Route path='dispatcher'   element={<DispatcherBoard />} />
          <Route path='leads'      element={<Leads />} />
          <Route path='drivers'    element={<Drivers />} />
          <Route path='loads'      element={<Loads />} />
          <Route path='brokers'    element={<Brokers />} />
          <Route path='invoices'   element={<Invoices />} />
          <Route path='marketing'  element={<Marketing />} />
          <Route path='tasks'      element={<Tasks />} />
          <Route path='documents'  element={<Documents />} />
          <Route path='analytics'  element={<Analytics />} />
          <Route path='reports'    element={<Reports />} />
          <Route path='help'       element={<Help />} />
          <Route path='settings'   element={<Settings />} />
        </Route>
      </Routes>
    </HashRouter>
    </ErrorBoundary>
  )
}
