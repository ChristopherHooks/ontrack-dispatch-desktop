import Database from 'better-sqlite3'
import type { CarrierOffer, CreateCarrierOfferDto, UpdateCarrierOfferDto } from '../../../src/types/models'

export function listCarrierOffers(db: Database.Database, loadId: number): CarrierOffer[] {
  return db.prepare('SELECT * FROM carrier_offers WHERE load_id = ? ORDER BY offered_at DESC').all(loadId) as CarrierOffer[]
}

export function getCarrierOffer(db: Database.Database, id: number): CarrierOffer | undefined {
  return db.prepare('SELECT * FROM carrier_offers WHERE id = ?').get(id) as CarrierOffer | undefined
}

export function createCarrierOffer(db: Database.Database, dto: CreateCarrierOfferDto): CarrierOffer {
  const r = db.prepare(
    'INSERT INTO carrier_offers (load_id, carrier_name, mc_number, phone, offered_rate, status, counter_rate, final_rate, notes) ' +
    'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(
    dto.load_id,
    dto.carrier_name,
    dto.mc_number ?? null,
    dto.phone ?? null,
    dto.offered_rate ?? null,
    dto.status ?? 'Pending',
    dto.counter_rate ?? null,
    dto.final_rate ?? null,
    dto.notes ?? null,
  )
  return db.prepare('SELECT * FROM carrier_offers WHERE id = ?').get(r.lastInsertRowid as number) as CarrierOffer
}

export function updateCarrierOffer(db: Database.Database, id: number, dto: UpdateCarrierOfferDto): CarrierOffer | undefined {
  const existing = getCarrierOffer(db, id)
  if (existing == null) return undefined
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
  const m = { ...existing, ...dto }
  db.prepare(
    'UPDATE carrier_offers SET carrier_name=?,mc_number=?,phone=?,offered_rate=?,status=?,counter_rate=?,final_rate=?,notes=?,updated_at=? WHERE id=?'
  ).run(m.carrier_name, m.mc_number ?? null, m.phone ?? null, m.offered_rate ?? null, m.status, m.counter_rate ?? null, m.final_rate ?? null, m.notes ?? null, now, id)
  return getCarrierOffer(db, id)
}

export function deleteCarrierOffer(db: Database.Database, id: number): boolean {
  return db.prepare('DELETE FROM carrier_offers WHERE id = ?').run(id).changes > 0
}

/**
 * Atomically accept one offer and sync related records:
 *   1. Applies any dto field updates and forces status = 'Accepted'
 *   2. Sets all other offers for the same load to 'Rejected' (skips already-Rejected)
 *   3. Updates the parent load status to 'Carrier Selected'
 * Runs in a single SQLite transaction so there is no partial-update state.
 */
export function acceptCarrierOffer(
  db: Database.Database,
  id: number,
  dto?: UpdateCarrierOfferDto,
): { offer: CarrierOffer; allOffers: CarrierOffer[] } {
  const existing = getCarrierOffer(db, id)
  if (existing == null) throw new Error(`Carrier offer ${id} not found`)
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')

  db.transaction(() => {
    if (dto != null && Object.keys(dto).length > 0) {
      const m = { ...existing, ...dto }
      db.prepare(
        'UPDATE carrier_offers SET carrier_name=?,mc_number=?,phone=?,offered_rate=?,status=?,counter_rate=?,final_rate=?,notes=?,updated_at=? WHERE id=?'
      ).run(m.carrier_name, m.mc_number ?? null, m.phone ?? null, m.offered_rate ?? null,
        'Accepted', m.counter_rate ?? null, m.final_rate ?? null, m.notes ?? null, now, id)
    } else {
      db.prepare('UPDATE carrier_offers SET status=?,updated_at=? WHERE id=?').run('Accepted', now, id)
    }
    db.prepare(
      "UPDATE carrier_offers SET status='Rejected',updated_at=? WHERE load_id=? AND id!=? AND status!='Rejected'"
    ).run(now, existing.load_id, id)
    db.prepare("UPDATE loads SET status='Carrier Selected',updated_at=? WHERE id=?")
      .run(now, existing.load_id)
  })()

  return {
    offer:     getCarrierOffer(db, id)!,
    allOffers: listCarrierOffers(db, existing.load_id),
  }
}
