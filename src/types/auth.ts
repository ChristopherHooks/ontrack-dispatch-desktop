export type UserRole = 'Admin' | 'Dispatcher' | 'Sales'

export interface User {
  id: number
  name: string
  email: string
  role: UserRole
  active: boolean
}

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
