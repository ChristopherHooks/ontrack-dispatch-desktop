import Database from 'better-sqlite3'
import type { BrokerCarrierVetting, CreateBrokerCarrierVettingDto } from '../../../src/types/models'

export function getVetting(db: Database.Database, loadId: number): BrokerCarrierVetting | undefined {
  return db.prepare('SELECT * FROM broker_carrier_vetting WHERE load_id = ?').get(loadId) as BrokerCarrierVetting | undefined
}

export function upsertVetting(db: Database.Database, dto: CreateBrokerCarrierVettingDto): BrokerCarrierVetting {
  // ON CONFLICT(load_id) DO UPDATE preserves id and created_at on re-upsert.
  // INSERT OR REPLACE would delete+reinsert, resetting both.
  db.prepare(
    'INSERT INTO broker_carrier_vetting ' +
    '(load_id, carrier_mc, carrier_name, insurance_verified, authority_active, safety_rating, carrier_packet_received, vetting_date, notes) ' +
    'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) ' +
    'ON CONFLICT(load_id) DO UPDATE SET ' +
    '  carrier_mc              = excluded.carrier_mc,' +
    '  carrier_name            = excluded.carrier_name,' +
    '  insurance_verified      = excluded.insurance_verified,' +
    '  authority_active        = excluded.authority_active,' +
    '  safety_rating           = excluded.safety_rating,' +
    '  carrier_packet_received = excluded.carrier_packet_received,' +
    '  vetting_date            = excluded.vetting_date,' +
    '  notes                   = excluded.notes'
  ).run(
    dto.load_id,
    dto.carrier_mc ?? null,
    dto.carrier_name ?? null,
    dto.insurance_verified ?? 0,
    dto.authority_active ?? 0,
    dto.safety_rating ?? null,
    dto.carrier_packet_received ?? 0,
    dto.vetting_date ?? null,
    dto.notes ?? null,
  )
  return db.prepare('SELECT * FROM broker_carrier_vetting WHERE load_id = ?').get(dto.load_id) as BrokerCarrierVetting
}

export function deleteVetting(db: Database.Database, loadId: number): boolean {
  return db.prepare('DELETE FROM broker_carrier_vetting WHERE load_id = ?').run(loadId).changes > 0
}
