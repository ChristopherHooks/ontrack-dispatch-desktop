import Database from 'better-sqlite3'

// ---------------------------------------------------------------------------
// Reports data service
// Provides aggregated financial, broker, and IFTA data for the Reports page.
// ---------------------------------------------------------------------------

export interface WeeklyRevenue {
  week:          string   // YYYY-Www (ISO week)
  week_label:    string   // "Mar 3 – Mar 9"
  dispatch_fee:  number
  load_count:    number
}

export interface MonthlyRevenue {
  month:        string   // YYYY-MM
  month_label:  string   // "Jan 2026"
  dispatch_fee: number
  load_count:   number
}

export interface BrokerSummary {
  broker_id:   number | null
  broker_name: string
  load_count:  number
  total_gross: number
  total_fee:   number
  avg_rpm:     number | null
}

export interface IftatRow {
  state:       string
  total_miles: number
  load_count:  number
}

export interface InvoiceAgingRow {
  invoice_id:   number
  broker_name:  string
  amount:       number
  sent_date:    string | null
  days_out:     number
  bucket:       '0-15' | '16-30' | '31-60' | '60+'
  status:       string
}

export interface LanePerformanceRow {
  origin_state:  string
  dest_state:    string
  load_count:    number
  avg_rpm:       number | null
  best_rpm:      number | null
  total_fee:     number
}

export interface CashFlowOutlook {
  pendingDeliveredFee:   number   // Delivered loads not yet invoiced — estimated fee
  pendingDeliveredCount: number
  invoicesSentTotal:     number   // Invoices in Sent or Overdue status
  invoicesSentCount:     number
  paidThisMonthFee:      number   // Invoices paid in the current calendar month
  paidThisMonthCount:    number
}

export interface ReportsData {
  weeklyRevenue:    WeeklyRevenue[]
  monthlyRevenue:   MonthlyRevenue[]
  brokerSummary:    BrokerSummary[]
  iftaByState:      IftatRow[]
  invoiceAging:     InvoiceAgingRow[]
  lanePerformance:  LanePerformanceRow[]
  allTimeFeeTot:    number
  allTimeLoadCount: number
  ytdFee:           number
  ytdLoadCount:     number
  cashFlow:         CashFlowOutlook
}

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function monthLabel(ym: string): string {
  const [y, m] = ym.split('-')
  return `${MONTH_NAMES[parseInt(m) - 1]} ${y}`
}

function weekLabel(yw: string): string {
  // yw = "2026-W12"
  const [y, wStr] = yw.split('-W')
  const week = parseInt(wStr)
  // Compute Mon of that ISO week
  const jan4 = new Date(`${y}-01-04`)
  const dayOfWeek = jan4.getDay() || 7  // 1=Mon
  const weekStart = new Date(jan4)
  weekStart.setDate(jan4.getDate() - (dayOfWeek - 1) + (week - 1) * 7)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 6)
  const fmt = (d: Date) => `${MONTH_NAMES[d.getMonth()]} ${d.getDate()}`
  return `${fmt(weekStart)} – ${fmt(weekEnd)}`
}

export function getReportsData(db: Database.Database): ReportsData {

  // Weekly revenue — last 12 weeks, Paid invoices
  const weeklyRaw = db.prepare(
    "SELECT strftime('%Y-W%W', paid_date) AS week," +
    "  COALESCE(SUM(dispatch_fee), 0) AS dispatch_fee," +
    "  COUNT(*) AS load_count" +
    " FROM invoices" +
    " WHERE status = 'Paid' AND paid_date IS NOT NULL" +
    "   AND paid_date >= date('now', '-84 days')" +
    " GROUP BY week ORDER BY week ASC"
  ).all() as Array<{ week: string; dispatch_fee: number; load_count: number }>

  const weeklyRevenue: WeeklyRevenue[] = weeklyRaw.map(r => ({
    week:         r.week,
    week_label:   weekLabel(r.week),
    dispatch_fee: r.dispatch_fee,
    load_count:   r.load_count,
  }))

  // Monthly revenue — last 6 months
  const monthlyRaw = db.prepare(
    "SELECT strftime('%Y-%m', paid_date) AS month," +
    "  COALESCE(SUM(dispatch_fee), 0) AS dispatch_fee," +
    "  COUNT(*) AS load_count" +
    " FROM invoices" +
    " WHERE status = 'Paid' AND paid_date IS NOT NULL" +
    "   AND paid_date >= date('now', '-180 days')" +
    " GROUP BY month ORDER BY month ASC"
  ).all() as Array<{ month: string; dispatch_fee: number; load_count: number }>

  const monthlyRevenue: MonthlyRevenue[] = monthlyRaw.map(r => ({
    month:        r.month,
    month_label:  monthLabel(r.month),
    dispatch_fee: r.dispatch_fee,
    load_count:   r.load_count,
  }))

  // Broker summary — all time, Delivered/Invoiced/Paid loads
  const brokerRaw = db.prepare(
    "SELECT l.broker_id, COALESCE(b.name, 'Unknown') AS broker_name," +
    "  COUNT(*) AS load_count," +
    "  COALESCE(SUM(COALESCE(l.rate,0) + COALESCE(l.fuel_surcharge,0)), 0) AS total_gross," +
    "  COALESCE(SUM(l.rate * l.dispatch_pct / 100.0), 0) AS total_fee," +
    "  CASE WHEN SUM(CASE WHEN l.miles > 0 THEN 1 ELSE 0 END) > 0" +
    "    THEN SUM(CASE WHEN l.miles > 0 THEN l.rate / l.miles ELSE 0 END)" +
    "       / SUM(CASE WHEN l.miles > 0 THEN 1 ELSE 0 END)" +
    "    ELSE NULL END AS avg_rpm" +
    " FROM loads l LEFT JOIN brokers b ON b.id = l.broker_id" +
    " WHERE l.status IN ('Delivered','Invoiced','Paid')" +
    "   AND l.rate IS NOT NULL AND l.dispatch_pct IS NOT NULL" +
    " GROUP BY l.broker_id ORDER BY total_fee DESC LIMIT 20"
  ).all() as Array<{ broker_id: number | null; broker_name: string; load_count: number; total_gross: number; total_fee: number; avg_rpm: number | null }>

  const brokerSummary: BrokerSummary[] = brokerRaw.map(r => ({
    broker_id:   r.broker_id,
    broker_name: r.broker_name,
    load_count:  r.load_count,
    total_gross: r.total_gross,
    total_fee:   r.total_fee,
    avg_rpm:     r.avg_rpm,
  }))

  // IFTA mileage — completed loads grouped by destination state (approximation)
  // Includes both loaded miles and deadhead miles. Attributed to destination state.
  const iftaRaw = db.prepare(
    "SELECT dest_state AS state," +
    "  COALESCE(SUM(COALESCE(miles,0) + COALESCE(deadhead_miles,0)), 0) AS total_miles," +
    "  COUNT(*) AS load_count" +
    " FROM loads" +
    " WHERE status IN ('Delivered','Invoiced','Paid')" +
    "   AND dest_state IS NOT NULL" +
    " GROUP BY dest_state ORDER BY total_miles DESC LIMIT 50"
  ).all() as IftatRow[]

  // Totals
  const allTimeRow = db.prepare(
    "SELECT COALESCE(SUM(dispatch_fee), 0) AS fee, COUNT(*) AS cnt FROM invoices WHERE status = 'Paid'"
  ).get() as { fee: number; cnt: number }

  const ytdRow = db.prepare(
    "SELECT COALESCE(SUM(dispatch_fee), 0) AS fee, COUNT(*) AS cnt FROM invoices" +
    " WHERE status = 'Paid' AND strftime('%Y', paid_date) = strftime('%Y', 'now')"
  ).get() as { fee: number; cnt: number }

  // Cash flow outlook
  // Bucket 1: Delivered loads with no invoice yet — estimated fee = rate * dispatch_pct / 100
  const deliveredRow = db.prepare(
    "SELECT" +
    "  COALESCE(SUM(rate * dispatch_pct / 100.0), 0) AS est_fee," +
    "  COUNT(*) AS cnt" +
    " FROM loads" +
    " WHERE status = 'Delivered' AND invoiced = 0 AND rate IS NOT NULL AND dispatch_pct IS NOT NULL"
  ).get() as { est_fee: number; cnt: number }

  // Bucket 2: Invoices sent or overdue — amount still owed
  const sentRow = db.prepare(
    "SELECT COALESCE(SUM(dispatch_fee), 0) AS total, COUNT(*) AS cnt" +
    " FROM invoices WHERE status IN ('Sent','Overdue')"
  ).get() as { total: number; cnt: number }

  // Bucket 3: Paid this calendar month
  const paidMonthRow = db.prepare(
    "SELECT COALESCE(SUM(dispatch_fee), 0) AS total, COUNT(*) AS cnt" +
    " FROM invoices" +
    " WHERE status = 'Paid' AND strftime('%Y-%m', paid_date) = strftime('%Y-%m', 'now')"
  ).get() as { total: number; cnt: number }

  const cashFlow: CashFlowOutlook = {
    pendingDeliveredFee:   deliveredRow.est_fee,
    pendingDeliveredCount: deliveredRow.cnt,
    invoicesSentTotal:     sentRow.total,
    invoicesSentCount:     sentRow.cnt,
    paidThisMonthFee:      paidMonthRow.total,
    paidThisMonthCount:    paidMonthRow.cnt,
  }

  // Invoice aging — open invoices (Sent / Overdue) with days outstanding
  const agingRaw = db.prepare(
    "SELECT i.id AS invoice_id," +
    "  COALESCE(b.name, 'Unknown') AS broker_name," +
    "  COALESCE(i.dispatch_fee, 0) AS amount," +
    "  i.sent_date," +
    "  i.status," +
    "  CAST(julianday('now') - julianday(COALESCE(i.sent_date, i.created_at)) AS INTEGER) AS days_out" +
    " FROM invoices i" +
    " LEFT JOIN loads l ON l.id = i.load_id" +
    " LEFT JOIN brokers b ON b.id = l.broker_id" +
    " WHERE i.status IN ('Sent','Overdue')" +
    " ORDER BY days_out DESC"
  ).all() as Array<{ invoice_id: number; broker_name: string; amount: number; sent_date: string | null; days_out: number; status: string }>

  const invoiceAging: InvoiceAgingRow[] = agingRaw.map(r => {
    const d = r.days_out
    const bucket: InvoiceAgingRow['bucket'] = d <= 15 ? '0-15' : d <= 30 ? '16-30' : d <= 60 ? '31-60' : '60+'
    return { ...r, bucket }
  })

  // Lane performance — completed loads grouped by origin_state → dest_state
  const laneRaw = db.prepare(
    "SELECT origin_state, dest_state," +
    "  COUNT(*) AS load_count," +
    "  CASE WHEN SUM(CASE WHEN miles > 0 THEN 1 ELSE 0 END) > 0" +
    "    THEN SUM(CASE WHEN miles > 0 THEN rate / miles ELSE 0 END) / SUM(CASE WHEN miles > 0 THEN 1 ELSE 0 END)" +
    "    ELSE NULL END AS avg_rpm," +
    "  MAX(CASE WHEN miles > 0 THEN rate / miles ELSE NULL END) AS best_rpm," +
    "  COALESCE(SUM(rate * dispatch_pct / 100.0), 0) AS total_fee" +
    " FROM loads" +
    " WHERE status IN ('Delivered','Invoiced','Paid')" +
    "   AND origin_state IS NOT NULL AND dest_state IS NOT NULL" +
    "   AND rate IS NOT NULL AND dispatch_pct IS NOT NULL" +
    " GROUP BY origin_state, dest_state" +
    " ORDER BY avg_rpm DESC NULLS LAST" +
    " LIMIT 30"
  ).all() as LanePerformanceRow[]

  return {
    weeklyRevenue,
    monthlyRevenue,
    brokerSummary,
    iftaByState:      iftaRaw,
    invoiceAging,
    lanePerformance:  laneRaw,
    allTimeFeeTot:    allTimeRow.fee,
    allTimeLoadCount: allTimeRow.cnt,
    ytdFee:           ytdRow.fee,
    ytdLoadCount:     ytdRow.cnt,
    cashFlow,
  }
}
