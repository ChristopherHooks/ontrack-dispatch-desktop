import { create } from 'zustand'
import type { User, UserRole } from '../types/auth'
import { hasPermission } from '../types/auth'

interface AuthStore {
  user: User | null
  setUser: (user: User) => void
  clearUser: () => void
  can: (module: string) => boolean
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  // Default to Admin for single-user phase
  user: {
    id: 1,
    name: 'Chris Hooks',
    email: 'dispatch@ontrackhaulingsolutions.com',
    role: 'Admin' as UserRole,
    active: true,
  },

  setUser: (user) => set({ user }),
  clearUser: () => set({ user: null }),

  can: (module) => {
    const { user } = get()
    if (!user) return false
    return hasPermission(user.role, module)
  },
}))
