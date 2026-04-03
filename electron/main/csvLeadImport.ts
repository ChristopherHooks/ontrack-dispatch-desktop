import fs from 'fs'
import type Database from 'better-sqlite3'
import type { LeadStatus, LeadPriority } from '../../src/types/models'

export interface CsvImportResult {
  totalRows:         number
  inserted:          number
  duplicatesSkipped: number
  invalidSkipped:    number
  errors:            string[]
}

const VALID_STATUSES   = new Set(['New', 'Contacted', 'Interested', 'Signed', 'Rejected'])
const VALID_PRIORITIES = new Set(['High', 'Medium', 'Low'])

// Header aliases -> canonical Lead field names.
// '_location' is a sentinel meaning combined 'city, state'.
const HEADER_MAP: Record<string, string> = {
  name: 'name', contact: 'name', contact_name: 'name', driver_name: 'name',
  'driver name': 'name', 'contact name': 'name',
  company: 'company', company_name: 'company', carrier: 'company', carrier_name: 'company',
  'company name': 'company', 'carrier name': 'company',
  mc: 'mc_number', mc_number: 'mc_number', 'mc number': 'mc_number',
  mc_num: 'mc_number', mc_no: 'mc_number', motor_carrier: 'mc_number',
  phone: 'phone', phone_number: 'phone', 'phone number': 'phone',
  tel: 'phone', telephone: 'phone', cell: 'phone', mobile: 'phone',
  email: 'email', email_address: 'email', 'email address': 'email',
  city: 'city', state: 'state', st: 'state',
  location: '_location', 'city/state': '_location',
  'city, state': '_location', city_state: '_location',
  trailer_type: 'trailer_type', trailer: 'trailer_type', 'trailer type': 'trailer_type',
  equipment: 'trailer_type', equipment_type: 'trailer_type', 'equipment type': 'trailer_type',
  authority_date: 'authority_date', auth_date: 'authority_date',
  'authority date': 'authority_date',
  source: 'source', lead_source: 'source', 'lead source': 'source',
  status: 'status', lead_status: 'status',
  priority: 'priority',
  follow_up_date: 'follow_up_date', follow_up: 'follow_up_date',
  'follow up': 'follow_up_date', 'follow up date': 'follow_up_date',
  notes: 'notes', note: 'notes', comments: 'notes', comment: 'notes', remarks: 'notes',
}

// RFC-4180-compatible CSV line parser (handles quoted fields + escaped quotes)
function parseCsvLine(line: string): string[] {
  const fields: string[] = []
  let current = ''
  let inQuotes = false
  let i = 0
  while (i < line.length) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') { current += '"'; i += 2; continue }
        inQuotes = false; i++; continue
      }
      current += ch; i++
    } else {
      if (ch === '"') { inQuotes = true; i++; continue }
      if (ch === ',') { fields.push(current.trim()); current = ''; i++; continue }
      current += ch; i++
    }
  }
  fields.push(current.trim())
  return fields
}

function normaliseHeader(h: string): string {
  return HEADER_MAP[h.trim().toLowerCase().replace(/\s+/g, ' ')] ?? ''
}

function normaliseStatus(raw: string): LeadStatus {
  const t = raw.trim()
  const cap = t.charAt(0).toUpperCase() + t.slice(1).toLowerCase()
  return VALID_STATUSES.has(cap) ? (cap as LeadStatus) : 'New'
}

function normalisePriority(raw: string): LeadPriority {
  const t = raw.trim()
  const cap = t.charAt(0).toUpperCase() + t.slice(1).toLowerCase()
  return VALID_PRIORITIES.has(cap) ? (cap as LeadPriority) : 'Medium'
}

function formatPhone(raw: string): string {
  const d = raw.replace(/[^0-9]/g, '')
  if (d.length === 10) return '(' + d.slice(0,3) + ') ' + d.slice(3,6) + '-' + d.slice(6)
  if (d.length === 11 && d[0] === '1') return '(' + d.slice(1,4) + ') ' + d.slice(4,7) + '-' + d.slice(7)
  return raw.trim()
}

export function importLeadsFromCsv(
  db:       Database.Database,
  filePath: string,
): CsvImportResult {
  const result: CsvImportResult = {
    totalRows: 0, inserted: 0, duplicatesSkipped: 0, invalidSkipped: 0, errors: [],
  }

  let raw: string
  try {
    raw = fs.readFileSync(filePath, 'utf-8')
  } catch (err) {
    result.errors.push('Could not read file: ' + String(err))
    return result
  }

  // Strip UTF-8 BOM if present, split CRLF/LF, drop blank lines
  const cleaned = raw.charCodeAt(0) === 0xFEFF ? raw.slice(1) : raw
  const LF = String.fromCharCode(10)
  const CR = String.fromCharCode(13)
  const lines = cleaned.split(LF).map(l => l.endsWith(CR) ? l.slice(0, -1) : l).filter(l => l.trim().length > 0)
  if (lines.length < 2) {
    result.errors.push('File is empty or has no data rows.')
    return result
  }

  // Auto-detect header row — skip any title/banner rows above the real column headers.
  // Pick the first line (within the first 5) that has ≥2 recognised header tokens.
  let headerLineIdx = 0
  for (let h = 0; h < Math.min(5, lines.length - 1); h++) {
    const testMapped = parseCsvLine(lines[h]).map(normaliseHeader)
    if (testMapped.filter(m => m !== '').length >= 2) { headerLineIdx = h; break }
  }

  const rawHeaders    = parseCsvLine(lines[headerLineIdx])
  const mappedHeaders = rawHeaders.map(normaliseHeader)

  if (!mappedHeaders.includes('name') && !mappedHeaders.includes('company')) {
    result.errors.push('CSV must have a "name" or "company" column.')
    return result
  }

  const ins = db.prepare(
    'INSERT INTO leads (name, company, mc_number, phone, email, city, state, ' +
    'trailer_type, authority_date, source, status, priority, follow_up_date, notes) ' +
    'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  )
  const seenMc = new Set<string>()

  for (let i = headerLineIdx + 1; i < lines.length; i++) {
    const rowNum = i + 1
    try {
      const values = parseCsvLine(lines[i])
      if (values.every(v => v === '')) continue
      result.totalRows++

      const row: Record<string, string> = {}
      for (let c = 0; c < mappedHeaders.length; c++) {
        const key = mappedHeaders[c]
        if (key) row[key] = (values[c] ?? '').trim()
      }

      // Split combined 'City, ST' location into separate fields
      if (row['_location'] && !row['city'] && !row['state']) {
        const parts = row['_location'].split(',').map((p: string) => p.trim())
        row['city']  = parts[0] ?? ''
        row['state'] = parts[1] ?? ''
      }

      const name = (row['name'] || row['company'] || '').trim()
      if (!name) {
        result.invalidSkipped++
        result.errors.push('Row ' + rowNum + ': no name or company — skipped.')
        continue
      }

      // Deduplicate by mc_number (within file + against DB)
      const mc = (row['mc_number'] ?? '').trim() || null
      if (mc) {
        if (seenMc.has(mc)) { result.duplicatesSkipped++; continue }
        seenMc.add(mc)
        const existing = db.prepare('SELECT id FROM leads WHERE mc_number = ?').get(mc)
        if (existing) { result.duplicatesSkipped++; continue }
      }

      const phone    = row['phone']         ? formatPhone(row['phone']) : null
      const email    = row['email']          || null
      const city     = row['city']           || null
      const state    = row['state']          ? row['state'].toUpperCase().slice(0, 2) : null
      const trailer  = row['trailer_type']   || null
      const authDate = row['authority_date'] || null
      const source   = row['source']         || 'CSV Import'
      const status   = normaliseStatus(row['status']    ?? '')
      const priority = normalisePriority(row['priority'] ?? '')
      const followUp = row['follow_up_date'] || null
      const notes    = row['notes']          || null
      const company  = row['company']        || null

      ins.run(name, company, mc, phone, email, city, state,
              trailer, authDate, source, status, priority, followUp, notes)
      result.inserted++
    } catch (err) {
      result.errors.push('Row ' + rowNum + ': ' + String(err))
      result.invalidSkipped++
    }
  }

  return result
}

// ---------------------------------------------------------------------------
// Paste import: same pipeline as CSV but reads from a text string (TSV from
// Excel / Google Sheets copy-paste). Delimiter is TAB.
// ---------------------------------------------------------------------------
export function importLeadsFromText(
  db:   Database.Database,
  text: string,
): CsvImportResult {
  const result: CsvImportResult = {
    totalRows: 0, inserted: 0, duplicatesSkipped: 0, invalidSkipped: 0, errors: [],
  }

  const TAB = String.fromCharCode(9)
  const LF  = String.fromCharCode(10)
  const CR  = String.fromCharCode(13)

  const cleaned = text.charCodeAt(0) === 0xFEFF ? text.slice(1) : text
  const lines = cleaned.split(LF).map(l => l.endsWith(CR) ? l.slice(0, -1) : l).filter(l => l.trim().length > 0)

  if (lines.length < 2) {
    result.errors.push('No data rows found. Include a header row and at least one data row.')
    return result
  }

  const rawHeaders    = lines[0].split(TAB).map(h => h.trim())
  const mappedHeaders = rawHeaders.map(normaliseHeader)

  if (!mappedHeaders.includes('name') && !mappedHeaders.includes('company')) {
    result.errors.push('Could not find a "name" or "company" column. Make sure your header row is included.')
    return result
  }

  const ins = db.prepare(
    'INSERT INTO leads (name, company, mc_number, phone, email, city, state, ' +
    'trailer_type, authority_date, source, status, priority, follow_up_date, notes) ' +
    'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  )
  const seenMc = new Set<string>()

  for (let i = 1; i < lines.length; i++) {
    const rowNum = i + 1
    try {
      const values = lines[i].split(TAB).map(v => v.trim())
      if (values.every(v => v === '')) continue
      result.totalRows++

      const row: Record<string, string> = {}
      for (let c = 0; c < mappedHeaders.length; c++) {
        const key = mappedHeaders[c]
        if (key) row[key] = (values[c] ?? '').trim()
      }

      if (row['_location'] && !row['city'] && !row['state']) {
        const parts = row['_location'].split(',').map((p: string) => p.trim())
        row['city']  = parts[0] ?? ''
        row['state'] = parts[1] ?? ''
      }

      const name = (row['name'] || row['company'] || '').trim()
      if (!name) {
        result.invalidSkipped++
        result.errors.push('Row ' + rowNum + ': no name or company — skipped.')
        continue
      }

      const mc = (row['mc_number'] ?? '').trim() || null
      if (mc) {
        if (seenMc.has(mc)) { result.duplicatesSkipped++; continue }
        seenMc.add(mc)
        const existing = db.prepare('SELECT id FROM leads WHERE mc_number = ?').get(mc)
        if (existing) { result.duplicatesSkipped++; continue }
      }

      const phone    = row['phone']         ? formatPhone(row['phone']) : null
      const email    = row['email']          || null
      const city     = row['city']           || null
      const state    = row['state']          ? row['state'].toUpperCase().slice(0, 2) : null
      const trailer  = row['trailer_type']   || null
      const authDate = row['authority_date'] || null
      const source   = row['source']         || 'Spreadsheet'
      const status   = normaliseStatus(row['status']    ?? '')
      const priority = normalisePriority(row['priority'] ?? '')
      const followUp = row['follow_up_date'] || null
      const notes    = row['notes']          || null
      const company  = row['company']        || null

      ins.run(name, company, mc, phone, email, city, state,
              trailer, authDate, source, status, priority, followUp, notes)
      result.inserted++
    } catch (err) {
      result.errors.push('Row ' + rowNum + ': ' + String(err))
      result.invalidSkipped++
    }
  }

  return result
}
