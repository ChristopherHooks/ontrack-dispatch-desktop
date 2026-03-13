import Database from 'better-sqlite3'

/**
 * Idempotent dev/demo seed. Uses explicit IDs and INSERT OR IGNORE.
 * Safe to call on every launch — only inserts once.
 */
export function seedDatabase(db: Database.Database): void {
  const flag = db.prepare('SELECT value FROM app_settings WHERE key = ?').get('dev_seed_applied')
  if (flag) { console.log('[Seed] Already applied, skipping'); return }
  console.log('[Seed] Applying dev/demo seed data...')

  // Seed brokers
  const insB = db.prepare('INSERT OR IGNORE INTO brokers (id, name, mc_number, phone, email, payment_terms, flag, notes) VALUES (?,?,?,?,?,?,?,?)')
  insB.run(101, 'Coyote Logistics', 'MC-100001', '(800) 225-5568', 'ops@coyote.example.com', 21, 'Preferred', 'Fast payer, reliable loads')
  insB.run(102, 'Echo Global Logistics', 'MC-100002', '(800) 354-7993', 'dispatch@echo.example.com', 30, 'None', 'Standard terms')
  insB.run(103, 'Worldwide Express', 'MC-100003', '(877) 263-8473', 'freight@wwex.example.com', 45, 'Avoid', 'Slow payment history - 60+ days avg')

  // Seed drivers
  const insD = db.prepare('INSERT OR IGNORE INTO drivers (id, name, company, mc_number, phone, email, truck_type, trailer_type, home_base, dispatch_percent, status) VALUES (?,?,?,?,?,?,?,?,?,?,?)')
  insD.run(101, 'Michael Carter', 'Carter Trucking LLC', 'MC-112233', '(555) 201-1001', 'mcarter@example.com', 'Semi', 'Dry Van', 'Dallas TX', 7.0, 'Active')
  insD.run(102, 'Sandra Reyes', 'SR Freight Inc', 'MC-223344', '(555) 201-2002', 'sreyes@example.com', 'Semi', 'Reefer', 'Houston TX', 7.0, 'Active')
  insD.run(103, 'James Holloway', 'Holloway Transport', 'MC-334455', '(555) 201-3003', 'jholloway@example.com', 'Semi', 'Flatbed', 'Atlanta GA', 8.0, 'Active')
  insD.run(104, 'Tanya Brooks', 'Brooks Logistics', 'MC-445566', '(555) 201-4004', 'tbrooks@example.com', 'Semi', 'Dry Van', 'Charlotte NC', 7.0, 'Inactive')

  // Seed leads
  const insL = db.prepare('INSERT OR IGNORE INTO leads (id, name, company, mc_number, phone, email, city, state, trailer_type, source, status, priority, notes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)')
  insL.run(101, 'David Nguyen', 'Nguyen Express', 'MC-556677', '(555) 301-1001', 'dnguyen@example.com', 'Memphis', 'TN', 'Dry Van', 'Facebook', 'Contacted', 'High', 'Looking for steady lanes Memphis to Atlanta')
  insL.run(102, 'Linda Park', 'Park Freight Co', 'MC-667788', '(555) 301-2002', 'lpark@example.com', 'Nashville', 'TN', 'Reefer', 'DAT Board', 'New', 'Medium', 'Cold chain specialist')
  insL.run(103, 'Robert Silva', 'Silva Transport', 'MC-778899', '(555) 301-3003', 'rsilva@example.com', 'Birmingham', 'AL', 'Flatbed', 'Referral', 'Interested', 'High', 'Ready to sign next week')

  // Seed loads
  const insLd = db.prepare('INSERT OR IGNORE INTO loads (id, load_id, driver_id, broker_id, origin_city, origin_state, dest_city, dest_state, pickup_date, delivery_date, miles, rate, dispatch_pct, commodity, status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
  insLd.run(101, 'ONT-2024-001', 101, 101, 'Dallas', 'TX', 'Atlanta', 'GA', '2024-03-11', '2024-03-13', 781, 1950.00, 7.0, 'General Freight', 'Delivered')
  insLd.run(102, 'ONT-2024-002', 102, 102, 'Houston', 'TX', 'Chicago', 'IL', '2024-03-12', '2024-03-15', 1090, 2720.00, 7.0, 'Produce', 'In Transit')
  insLd.run(103, 'ONT-2024-003', 103, 101, 'Atlanta', 'GA', 'Charlotte', 'NC', '2024-03-13', '2024-03-14', 249, 675.00, 8.0, 'Steel Coils', 'Booked')

  // Seed invoices
  const insI = db.prepare('INSERT OR IGNORE INTO invoices (id, invoice_number, load_id, driver_id, driver_gross, dispatch_pct, dispatch_fee, status, notes) VALUES (?,?,?,?,?,?,?,?,?)')
  insI.run(101, 'INV-2024-001', 101, 101, 1950.00, 7.0, 136.50, 'Paid', 'Load ONT-2024-001')
  insI.run(102, 'INV-2024-002', 102, 102, 2720.00, 7.0, 190.40, 'Sent', 'Load ONT-2024-002')

  // Mark seed applied
  db.prepare('INSERT OR IGNORE INTO app_settings (key, value) VALUES (?, ?)').run('dev_seed_applied', '1')
  console.log('[Seed] Seed data applied successfully')
}
