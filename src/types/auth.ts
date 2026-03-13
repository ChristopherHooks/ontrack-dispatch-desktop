import type { User, UserRole, ThemePreference } from './models'

export type { User, UserRole, ThemePreference }

export interface AuthState {
  user: User | null
  isAuthenticated: boolean
}

// Permission matrix per role
export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  Admin:      ['*'],
  Dispatcher: ['dashboard', 'drivers', 'loads', 'brokers', 'invoices', 'tasks', 'documents', 'help', 'settings'],
  Sales:      ['leads', 'dashboard', 'help'],
}

export function hasPermission(role: UserRole, module: string): boolean {
  const perms = ROLE_PERMISSIONS[role]
  return perms.includes('*') || perms.includes(module)
}
