import Database from 'better-sqlite3'

export interface AnalyticsStats {
  leadConversion:    { total: number; signed: number; rate: number }
  leadsByStatus:     Record<string, number>
  driversSigned:     { thisMonth: number; total: number }
  avgRpm:            { value: number; count: number }
  revenueByDriver:   Array<{ driver_id: number; name: string; revenue: number; loads: number }>
  brokerReliability: Array<{ broker_id: number; name: string; loads: number; avgRate: number; flag: string }>
  laneProfitability: Array<{ origin_state: string; dest_state: string; loads: number; avgRpm: number; totalRevenue: number }>
  revenueByMonth:    Array<{ month: string; revenue: number; loads: number }>
}

export function getAnalyticsStats(db: Database.Database): AnalyticsStats {
  const leadTotal  = db.prepare("SELECT COUNT(*) AS c FROM leads").get() as { c: number }
  const leadSigned = db.prepare("SELECT COUNT(*) AS c FROM leads WHERE status='Signed'").get() as { c: number }

  const leadStatusRows = db.prepare(
    "SELECT status, COUNT(*) AS c FROM leads GROUP BY status"
  ).all() as Array<{ status: string; c: number }>
  const leadsByStatus: Record<string, number> = {}
  for (const r of leadStatusRows) leadsByStatus[r.status] = r.c

  const driverTotal = db.prepare("SELECT COUNT(*) AS c FROM drivers").get() as { c: number }
  const now = new Date()
  const monthStart = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-01'
  const driversThisMonth = db.prepare(
    "SELECT COUNT(*) AS c FROM drivers WHERE start_date >= ?"
  ).get(monthStart) as { c: number }

  const rpmRow = db.prepare(
    "SELECT AVG(CAST(rate AS REAL)/CAST(miles AS REAL)) AS avg, COUNT(*) AS cnt FROM loads WHERE miles > 0 AND rate > 0"
  ).get() as { avg: number | null; cnt: number }

  const revenueByDriver = db.prepare(`
    SELECT d.id AS driver_id, d.name, SUM(l.rate) AS revenue, COUNT(l.id) AS loads
    FROM loads l JOIN drivers d ON d.id = l.driver_id
    WHERE l.status IN ('Delivered','Invoiced','Paid') AND l.rate > 0
    GROUP BY d.id ORDER BY revenue DESC LIMIT 10
  `).all() as Array<{ driver_id: number; name: string; revenue: number; loads: number }>

  const brokerReliability = db.prepare(`
    SELECT b.id AS broker_id, b.name, b.flag, COUNT(l.id) AS loads, AVG(l.rate) AS avgRate
    FROM loads l JOIN brokers b ON b.id = l.broker_id
    GROUP BY b.id ORDER BY loads DESC LIMIT 10
  `).all() as Array<{ broker_id: number; name: string; loads: number; avgRate: number; flag: string }>

  const laneProfitability = db.prepare(`
    SELECT origin_state, dest_state,
      COUNT(*) AS loads,
      AVG(CAST(rate AS REAL)/CAST(miles AS REAL)) AS avgRpm,
      SUM(rate) AS totalRevenue
    FROM loads WHERE miles > 0 AND rate > 0 AND origin_state IS NOT NULL AND dest_state IS NOT NULL
    GROUP BY origin_state, dest_state ORDER BY totalRevenue DESC LIMIT 15
  `).all() as Array<{ origin_state: string; dest_state: string; loads: number; avgRpm: number; totalRevenue: number }>

  const revenueByMonth = (db.prepare(`
    SELECT strftime('%Y-%m', pickup_date) AS month,
      SUM(rate) AS revenue, COUNT(*) AS loads
    FROM loads WHERE pickup_date IS NOT NULL AND rate > 0
    GROUP BY month ORDER BY month DESC LIMIT 6
  `).all() as Array<{ month: string; revenue: number; loads: number }>).reverse()

  return {
    leadConversion:    { total: leadTotal.c, signed: leadSigned.c, rate: leadTotal.c > 0 ? Math.round(leadSigned.c / leadTotal.c * 100) : 0 },
    leadsByStatus,
    driversSigned:     { thisMonth: driversThisMonth.c, total: driverTotal.c },
    avgRpm:            { value: Math.round((rpmRow.avg ?? 0) * 100) / 100, count: rpmRow.cnt },
    revenueByDriver,
    brokerReliability,
    laneProfitability,
    revenueByMonth,
  }
}
