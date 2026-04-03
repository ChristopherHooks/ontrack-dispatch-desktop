import Database from 'better-sqlite3'
import type { AuditLogEntry, AuditAction } from '../../../src/types/models'

export function logAudit(db: Database.Database, userId: number | null, entityType: string, entityId: number | null, action: AuditAction, oldValues?: unknown, newValues?: unknown): void {
  db.prepare('INSERT INTO audit_log (user_id, entity_type, entity_id, action, old_values, new_values) VALUES (?, ?, ?, ?, ?, ?)')
    .run(userId, entityType, entityId, action,
      oldValues != null ? JSON.stringify(oldValues) : null,
      newValues != null ? JSON.stringify(newValues) : null)
}
export function listAuditLog(db: Database.Database, entityType?: string, entityId?: number): AuditLogEntry[] {
  if (entityType && entityId != null) {
    return db.prepare('SELECT * FROM audit_log WHERE entity_type = ? AND entity_id = ? ORDER BY created_at DESC').all(entityType, entityId) as AuditLogEntry[]
  }
  if (entityType) {
    return db.prepare('SELECT * FROM audit_log WHERE entity_type = ? ORDER BY created_at DESC').all(entityType) as AuditLogEntry[]
  }
  return db.prepare('SELECT * FROM audit_log ORDER BY created_at DESC LIMIT 500').all() as AuditLogEntry[]
}
