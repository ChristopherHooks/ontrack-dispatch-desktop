import Database from 'better-sqlite3'

// ---------------------------------------------------------------------------
// Carrier Broker Approvals
// Tracks which brokers each driver has been submitted to, approved with,
// or denied by. Used in DriverDrawer to show a per-broker approval matrix.
// ---------------------------------------------------------------------------

export type ApprovalStatus = 'Submitted' | 'Approved' | 'Denied'

export interface CarrierBrokerApproval {
  id:           number
  driver_id:    number
  broker_id:    number
  broker_name:  string   // denormalized for fast display
  status:       ApprovalStatus
  notes:        string | null
  submitted_at: string | null   // ISO date
  approved_at:  string | null   // ISO date
  created_at:   string
}

export interface CreateCarrierBrokerApprovalDto {
  driver_id:    number
  broker_id:    number
  broker_name:  string
  status:       ApprovalStatus
  notes?:       string | null
  submitted_at?: string | null
  approved_at?:  string | null
}

export function listCarrierBrokerApprovals(
  db: Database.Database,
  driverId: number,
): CarrierBrokerApproval[] {
  return db.prepare(
    'SELECT cba.*, b.name AS broker_name FROM carrier_broker_approvals cba' +
    ' JOIN brokers b ON b.id = cba.broker_id' +
    ' WHERE cba.driver_id = ?' +
    ' ORDER BY b.name ASC'
  ).all(driverId) as CarrierBrokerApproval[]
}

export function upsertCarrierBrokerApproval(
  db: Database.Database,
  dto: CreateCarrierBrokerApprovalDto,
): CarrierBrokerApproval {
  // Check for existing row
  const existing = db.prepare(
    'SELECT id FROM carrier_broker_approvals WHERE driver_id = ? AND broker_id = ?'
  ).get(dto.driver_id, dto.broker_id) as { id: number } | undefined

  if (existing) {
    db.prepare(
      'UPDATE carrier_broker_approvals SET status=?, notes=?, submitted_at=?, approved_at=? WHERE id=?'
    ).run(dto.status, dto.notes ?? null, dto.submitted_at ?? null, dto.approved_at ?? null, existing.id)
    return db.prepare(
      'SELECT cba.*, b.name AS broker_name FROM carrier_broker_approvals cba' +
      ' JOIN brokers b ON b.id = cba.broker_id WHERE cba.id = ?'
    ).get(existing.id) as CarrierBrokerApproval
  }

  const r = db.prepare(
    'INSERT INTO carrier_broker_approvals (driver_id, broker_id, status, notes, submitted_at, approved_at)' +
    ' VALUES (?, ?, ?, ?, ?, ?)'
  ).run(dto.driver_id, dto.broker_id, dto.status, dto.notes ?? null, dto.submitted_at ?? null, dto.approved_at ?? null)
  return db.prepare(
    'SELECT cba.*, b.name AS broker_name FROM carrier_broker_approvals cba' +
    ' JOIN brokers b ON b.id = cba.broker_id WHERE cba.id = ?'
  ).get(r.lastInsertRowid) as CarrierBrokerApproval
}

export function deleteCarrierBrokerApproval(db: Database.Database, id: number): boolean {
  return db.prepare('DELETE FROM carrier_broker_approvals WHERE id = ?').run(id).changes > 0
}
