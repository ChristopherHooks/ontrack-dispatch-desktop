import Database from 'better-sqlite3'
import type { User, CreateUserDto, UpdateUserDto } from '../../../src/types/models'

export function listUsers(db: Database.Database): User[] {
  return db.prepare('SELECT * FROM users ORDER BY name ASC').all() as User[]
}
export function getUser(db: Database.Database, id: number): User | undefined {
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id) as User | undefined
}
export function getUserByEmail(db: Database.Database, email: string): User | undefined {
  return db.prepare('SELECT * FROM users WHERE email = ?').get(email) as User | undefined
}
export function createUser(db: Database.Database, dto: CreateUserDto): User {
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
  const r = db.prepare('INSERT INTO users (name, email, role, theme_preference, active, updated_at) VALUES (?, ?, ?, ?, ?, ?)')
    .run(dto.name, dto.email, dto.role, dto.theme_preference, dto.active ?? 1, now)
  return db.prepare('SELECT * FROM users WHERE id = ?').get(r.lastInsertRowid as number) as User
}
export function updateUser(db: Database.Database, id: number, dto: UpdateUserDto): User | undefined {
  const existing = getUser(db, id)
  if (existing == null) return undefined
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
  const m = { ...existing, ...dto }
  db.prepare('UPDATE users SET name=?,email=?,role=?,theme_preference=?,active=?,updated_at=? WHERE id=?')
    .run(m.name, m.email, m.role, m.theme_preference, m.active, now, id)
  return getUser(db, id)
}
