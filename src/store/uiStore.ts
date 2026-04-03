import { create } from 'zustand'

interface UIState {
  globalSearchOpen: boolean
  openGlobalSearch:  () => void
  closeGlobalSearch: () => void
}

export const useUIStore = create<UIState>((set) => ({
  globalSearchOpen:  false,
  openGlobalSearch:  () => set({ globalSearchOpen: true }),
  closeGlobalSearch: () => set({ globalSearchOpen: false }),
}))
