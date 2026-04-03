import Database from 'better-sqlite3'

export interface BrokerCallLogEntry {
  id:         number
  broker_id:  number
  note:       string
  created_at: string
}

export interface CreateBrokerCallLogDto {
  broker_id: number
  note:      string
}

export function listBrokerCallLog(db: Database.Database, brokerId: number): BrokerCallLogEntry[] {
  return db.prepare(
    'SELECT * FROM broker_call_log WHERE broker_id = ? ORDER BY created_at DESC'
  ).all(brokerId) as BrokerCallLogEntry[]
}

export function createBrokerCallLog(db: Database.Database, dto: CreateBrokerCallLogDto): BrokerCallLogEntry {
  const result = db.prepare(
    'INSERT INTO broker_call_log (broker_id, note) VALUES (?, ?)'
  ).run(dto.broker_id, dto.note)
  return db.prepare('SELECT * FROM broker_call_log WHERE id = ?').get(result.lastInsertRowid) as BrokerCallLogEntry
}

export function deleteBrokerCallLog(db: Database.Database, id: number): boolean {
  const r = db.prepare('DELETE FROM broker_call_log WHERE id = ?').run(id)
  return r.changes > 0
}
