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
  ownerPhone: string
  defaultDispatchPct:   number
  fuelPricePerGallon:   number   // USD/gallon for rate calculator, default 4.00
  onboardingComplete: boolean
  wizardMinimized: boolean           // not persisted — survives component remounts, resets on app restart
  firstDispatchComplete: boolean
  firstDispatchGuideMinimized: boolean  // not persisted
  firstLaunchDate: string   // ISO date set once on first run, persisted
  // Actions
  setTheme: (theme: Theme) => void
  setSidebarCollapsed: (collapsed: boolean) => void
  toggleSidebar: () => void
  setOnboardingComplete: () => Promise<void>
  setWizardMinimized: (v: boolean) => void
  setFirstDispatchComplete: () => Promise<void>
  setFirstDispatchGuideMinimized: (v: boolean) => void
  loadFromStore: () => Promise<void>
  persistSetting: (key: string, value: unknown) => Promise<void>
}

export const useSettingsStore = create<SettingsState>()(subscribeWithSelector((set, get) => ({
  theme: 'dark',
  sidebarCollapsed: false,
  dataPath: '',
  companyName: '',
  ownerName: '',
  ownerEmail: '',
  ownerPhone: '',
  defaultDispatchPct:   7,
  fuelPricePerGallon:   4.00,
  onboardingComplete: false,
  wizardMinimized: false,
  firstDispatchComplete: false,
  firstDispatchGuideMinimized: false,
  firstLaunchDate: '',

  setWizardMinimized: (v) => set({ wizardMinimized: v }),
  setFirstDispatchGuideMinimized: (v) => set({ firstDispatchGuideMinimized: v }),

  setFirstDispatchComplete: async () => {
    set({ firstDispatchComplete: true })
    await get().persistSetting('firstDispatchComplete', true)
  },

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

  setOnboardingComplete: async () => {
    set({ onboardingComplete: true })
    await get().persistSetting('onboardingComplete', true)
  },

  loadFromStore: async () => {
    const all = await window.api.settings.getAll() as Record<string, unknown>
    const theme = (all.theme as Theme) ?? 'dark'
    set({
      theme,
      sidebarCollapsed:   Boolean(all.sidebarCollapsed),
      dataPath:           String(all.dataPath ?? ''),
      companyName:        typeof all.companyName  === 'string' ? all.companyName  : '',
      ownerName:          typeof all.ownerName    === 'string' ? all.ownerName    : '',
      ownerEmail:         typeof all.ownerEmail   === 'string' ? all.ownerEmail   : '',
      ownerPhone:         typeof all.ownerPhone   === 'string' ? all.ownerPhone   : '',
      defaultDispatchPct:   typeof all.defaultDispatchPct   === 'number' ? all.defaultDispatchPct   : 7,
      fuelPricePerGallon:   typeof all.fuelPricePerGallon   === 'number' ? all.fuelPricePerGallon   : 4.00,
      onboardingComplete:      Boolean(all.onboardingComplete),
      firstDispatchComplete:   Boolean(all.firstDispatchComplete),
      firstLaunchDate:         typeof all.firstLaunchDate === 'string' && all.firstLaunchDate
                                 ? all.firstLaunchDate
                                 : new Date().toISOString().split('T')[0],
    })
    // Persist firstLaunchDate if this is the first run
    if (!all.firstLaunchDate) {
      const today = new Date().toISOString().split('T')[0]
      await window.api.settings.set('firstLaunchDate', today)
    }
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
