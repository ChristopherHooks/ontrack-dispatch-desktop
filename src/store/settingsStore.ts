import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'

export type Theme = 'dark' | 'light' | 'system'

interface SettingsState {
  theme: Theme
  sidebarCollapsed: boolean
  dataPath: string
  companyName: string
  ownerName: string
  ownerEmail: string
  defaultDispatchPct: number
  // Actions
  setTheme: (theme: Theme) => void
  setSidebarCollapsed: (collapsed: boolean) => void
  toggleSidebar: () => void
  loadFromStore: () => Promise<void>
  persistSetting: (key: string, value: unknown) => Promise<void>
}

export const useSettingsStore = create<SettingsState>()(subscribeWithSelector((set, get) => ({
  theme: 'dark',
  sidebarCollapsed: false,
  dataPath: '',
  companyName: 'OnTrack Hauling Solutions',
  ownerName: 'Chris Hooks',
  ownerEmail: 'dispatch@ontrackhaulingsolutions.com',
  defaultDispatchPct: 7,

  setTheme: (theme) => {
    set({ theme })
    get().persistSetting('theme', theme)
    applyTheme(theme)
  },

  setSidebarCollapsed: (collapsed) => {
    set({ sidebarCollapsed: collapsed })
    get().persistSetting('sidebarCollapsed', collapsed)
  },

  toggleSidebar: () => {
    const next = !get().sidebarCollapsed
    get().setSidebarCollapsed(next)
  },

  loadFromStore: async () => {
    const all = await window.api.settings.getAll() as Record<string, unknown>
    const theme = (all.theme as Theme) ?? 'dark'
    set({
      theme,
      sidebarCollapsed:   Boolean(all.sidebarCollapsed),
      dataPath:           String(all.dataPath ?? ''),
      // Business identity — fall back to compile-time defaults if not yet persisted
      companyName:        typeof all.companyName  === 'string' ? all.companyName  : 'OnTrack Hauling Solutions',
      ownerName:          typeof all.ownerName    === 'string' ? all.ownerName    : 'Chris Hooks',
      ownerEmail:         typeof all.ownerEmail   === 'string' ? all.ownerEmail   : 'dispatch@ontrackhaulingsolutions.com',
      defaultDispatchPct: typeof all.defaultDispatchPct === 'number' ? all.defaultDispatchPct : 7,
    })
    applyTheme(theme)
  },

  persistSetting: async (key, value) => {
    await window.api.settings.set(key, value)
  },
})))

// Apply theme class to document root
export function applyTheme(theme: Theme): void {
  const root = document.documentElement
  if (theme === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    root.classList.toggle('dark', prefersDark)
  } else {
    root.classList.toggle('dark', theme === 'dark')
  }
}
