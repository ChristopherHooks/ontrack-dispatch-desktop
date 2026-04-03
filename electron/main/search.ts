import Database from 'better-sqlite3'

export interface SearchResult {
  type:     'lead' | 'driver' | 'load' | 'broker' | 'invoice' | 'task' | 'document'
  id:       number
  title:    string
  subtitle: string
  route:    string
}

export function globalSearch(db: Database.Database, query: string): SearchResult[] {
  if (!query || query.trim().length < 2) return []
  const q = '%' + query.trim() + '%'
  const results: SearchResult[] = []

  // Leads
  const leads = db.prepare(
    "SELECT id, name, company, status FROM leads WHERE name LIKE ? OR company LIKE ? OR mc_number LIKE ? LIMIT 5"
  ).all(q, q, q) as Array<{ id: number; name: string; company: string | null; status: string }>
  for (const r of leads) {
    results.push({ type: 'lead', id: r.id, title: r.name, subtitle: (r.company ?? '') + ' \u00b7 ' + r.status, route: '/leads' })
  }

  // Drivers
  const drivers = db.prepare(
    "SELECT id, name, company, status FROM drivers WHERE name LIKE ? OR company LIKE ? OR mc_number LIKE ? LIMIT 5"
  ).all(q, q, q) as Array<{ id: number; name: string; company: string | null; status: string }>
  for (const r of drivers) {
    results.push({ type: 'driver', id: r.id, title: r.name, subtitle: (r.company ?? '') + ' \u00b7 ' + r.status, route: '/drivers' })
  }

  // Loads
  const loads = db.prepare(
    "SELECT id, load_id, origin_state, dest_state, status FROM loads WHERE load_id LIKE ? OR commodity LIKE ? OR notes LIKE ? LIMIT 5"
  ).all(q, q, q) as Array<{ id: number; load_id: string | null; origin_state: string | null; dest_state: string | null; status: string }>
  for (const r of loads) {
    const lane = [r.origin_state, r.dest_state].filter(Boolean).join(' \u2192 ')
    results.push({ type: 'load', id: r.id, title: r.load_id ?? ('Load #' + r.id), subtitle: lane + ' \u00b7 ' + r.status, route: '/loads' })
  }

  // Brokers
  const brokers = db.prepare(
    "SELECT id, name, mc_number FROM brokers WHERE name LIKE ? OR mc_number LIKE ? LIMIT 5"
  ).all(q, q) as Array<{ id: number; name: string; mc_number: string | null }>
  for (const r of brokers) {
    results.push({ type: 'broker', id: r.id, title: r.name, subtitle: 'MC: ' + (r.mc_number ?? '\u2014'), route: '/brokers' })
  }

  // Invoices
  const invoices = db.prepare(
    "SELECT id, invoice_number, status FROM invoices WHERE invoice_number LIKE ? OR notes LIKE ? LIMIT 5"
  ).all(q, q) as Array<{ id: number; invoice_number: string; status: string }>
  for (const r of invoices) {
    results.push({ type: 'invoice', id: r.id, title: r.invoice_number, subtitle: r.status, route: '/invoices' })
  }

  // Tasks
  const tasks = db.prepare(
    "SELECT id, title, status FROM tasks WHERE title LIKE ? OR notes LIKE ? LIMIT 5"
  ).all(q, q) as Array<{ id: number; title: string; status: string }>
  for (const r of tasks) {
    results.push({ type: 'task', id: r.id, title: r.title, subtitle: r.status, route: '/tasks' })
  }

  // Documents
  const docs = db.prepare(
    "SELECT id, title, category FROM documents WHERE title LIKE ? OR content LIKE ? OR category LIKE ? LIMIT 5"
  ).all(q, q, q) as Array<{ id: number; title: string; category: string | null }>
  for (const r of docs) {
    results.push({ type: 'document', id: r.id, title: r.title, subtitle: r.category ?? '', route: '/documents' })
  }

  return results
}
