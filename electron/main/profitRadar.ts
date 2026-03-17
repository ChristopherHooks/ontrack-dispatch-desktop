/**
 * Profit Radar — main-process data service
 *
 * Scans existing SQLite data and produces a ranked list of revenue
 * opportunities. All queries are read-only and deterministic.
 * No new tables required — reuses drivers, leads, fb_conversations,
 * marketing_groups, and loads.
 *
 * Two exports:
 *   getProfitRadarData()    — synchronous, fast, always succeeds
 *   getProfitRadarSummary() — async, calls Claude, returns null on any error
 */
import Database from 'better-sqlite3'
import type Store from 'electron-store'
import { claudeComplete } from './claudeApi'

// ---------------------------------------------------------------------------
// Output types
// ---------------------------------------------------------------------------

export interface DriverOpportunity {
  driverId:  number
  name:      string
  truckType: string | null
  homeBase:  string | null
  location:  string | null   // current_location field
  score:     number
}

export interface LeadHeat {
  convId:      number
  name:        string
  stage:       string         // Call Ready | Interested | Replied | New
  lastMessage: string | null
  followUpAt:  string | null
  phone:       string | null
  nextAction:  string         // deterministic recommendation
  score:       number
}

export interface GroupPerformance {
  groupId:        number
  name:           string
  leadsGenerated: number
  signedDrivers:  number
  priority:       string
  lastPostedAt:   string | null
  score:          number
}

export interface BrokerLane {
  originState: string
  destState:   string
  avgRpm:      number
  loads:       number
  score:       number
}

export interface ProfitRadarData {
  idleDrivers: DriverOpportunity[]
  leadHeat:    LeadHeat[]
  topGroups:   GroupPerformance[]
  topLanes:    BrokerLane[]
}

// ---------------------------------------------------------------------------
// Next-action map for FB conversation stages
// ---------------------------------------------------------------------------

const NEXT_ACTION: Record<string, string> = {
  'Call Ready':  'Call now — driver is ready to sign',
  'Interested':  'Schedule a call this week',
  'Replied':     'Follow up with more info',
  'New':         'Start the conversation',
}

// ---------------------------------------------------------------------------
// Main data function (synchronous)
// ---------------------------------------------------------------------------

export function getProfitRadarData(db: Database.Database): ProfitRadarData {
  const todayIso = new Date().toISOString().split('T')[0]

  // ── Idle drivers: Active with no current load ─────────────────────────────
  const rawDrivers = db.prepare(
    "SELECT d.id, d.name, d.truck_type, d.home_base, d.current_location FROM drivers d" +
    " WHERE d.status = 'Active'" +
    " AND NOT EXISTS (" +
    "   SELECT 1 FROM loads l WHERE l.driver_id = d.id" +
    "   AND l.status IN ('Booked', 'Picked Up', 'In Transit')" +
    ")" +
    " ORDER BY d.name ASC LIMIT 10"
  ).all() as Array<{
    id: number; name: string; truck_type: string | null
    home_base: string | null; current_location: string | null
  }>

  const idleDrivers: DriverOpportunity[] = rawDrivers.map(d => {
    let score = 50
    if (d.current_location) score += 20   // location known — easy to match
    if (d.truck_type)        score += 10   // equipment known
    if (d.home_base)         score += 5    // home base known
    return {
      driverId:  d.id,
      name:      d.name,
      truckType: d.truck_type,
      homeBase:  d.home_base,
      location:  d.current_location,
      score,
    }
  }).sort((a, b) => b.score - a.score)

  // ── Lead heat: FB conversations in active stages ──────────────────────────
  const rawConvs = db.prepare(
    "SELECT id, name, stage, last_message, follow_up_at, phone FROM fb_conversations" +
    " WHERE stage IN ('Call Ready','Interested','Replied','New')" +
    " ORDER BY" +
    "   CASE stage WHEN 'Call Ready' THEN 0 WHEN 'Interested' THEN 1" +
    "              WHEN 'Replied' THEN 2 ELSE 3 END ASC," +
    "   follow_up_at ASC NULLS LAST" +
    " LIMIT 10"
  ).all() as Array<{
    id: number; name: string; stage: string
    last_message: string | null; follow_up_at: string | null; phone: string | null
  }>

  const STAGE_SCORE: Record<string, number> = {
    'Call Ready': 90, 'Interested': 70, 'Replied': 40, 'New': 20,
  }

  const leadHeat: LeadHeat[] = rawConvs.map(c => {
    let score = STAGE_SCORE[c.stage] ?? 20
    if (c.follow_up_at && c.follow_up_at <= todayIso) score += 25
    if (c.phone) score += 5
    return {
      convId:      c.id,
      name:        c.name,
      stage:       c.stage,
      lastMessage: c.last_message,
      followUpAt:  c.follow_up_at,
      phone:       c.phone,
      nextAction:  NEXT_ACTION[c.stage] ?? 'Follow up',
      score,
    }
  }).sort((a, b) => b.score - a.score)

  // ── Top groups: by historical performance + priority ──────────────────────
  const rawGroups = db.prepare(
    "SELECT id, name, leads_generated_count, signed_drivers_count, priority, last_posted_at" +
    " FROM marketing_groups WHERE active = 1" +
    " ORDER BY leads_generated_count DESC, signed_drivers_count DESC LIMIT 10"
  ).all() as Array<{
    id: number; name: string; leads_generated_count: number
    signed_drivers_count: number; priority: string; last_posted_at: string | null
  }>

  const topGroups: GroupPerformance[] = rawGroups.map(g => {
    let score = g.leads_generated_count * 15 + g.signed_drivers_count * 25
    if (g.priority === 'High')   score += 30
    else if (g.priority === 'Medium') score += 15
    if (!g.last_posted_at)       score += 10  // never posted = high opportunity
    if (g.last_posted_at === todayIso) score -= 15  // already posted today
    return {
      groupId:        g.id,
      name:           g.name,
      leadsGenerated: g.leads_generated_count,
      signedDrivers:  g.signed_drivers_count,
      priority:       g.priority,
      lastPostedAt:   g.last_posted_at,
      score,
    }
  }).sort((a, b) => b.score - a.score).slice(0, 5)

  // ── Top broker lanes: avg RPM on completed loads ──────────────────────────
  const rawLanes = db.prepare(
    "SELECT origin_state, dest_state," +
    " ROUND(AVG(CAST(rate AS REAL) / NULLIF(CAST(miles AS REAL), 0)), 2) AS avg_rpm," +
    " COUNT(*) AS loads" +
    " FROM loads" +
    " WHERE origin_state IS NOT NULL AND dest_state IS NOT NULL" +
    "   AND rate IS NOT NULL AND miles IS NOT NULL AND miles > 0" +
    " GROUP BY origin_state, dest_state HAVING loads >= 2" +
    " ORDER BY avg_rpm DESC LIMIT 5"
  ).all() as Array<{ origin_state: string; dest_state: string; avg_rpm: number; loads: number }>

  const topLanes: BrokerLane[] = rawLanes.map(l => ({
    originState: l.origin_state,
    destState:   l.dest_state,
    avgRpm:      l.avg_rpm,
    loads:       l.loads,
    score:       Math.round(l.avg_rpm * 10 + l.loads * 2),
  }))

  return { idleDrivers, leadHeat, topGroups, topLanes }
}

// ---------------------------------------------------------------------------
// AI Summary (async — returns null if API key not set or call fails)
// ---------------------------------------------------------------------------

export async function getProfitRadarSummary(
  data:  ProfitRadarData,
  store: Store<Record<string, unknown>>,
): Promise<string | null> {
  const apiKey = store.get('claude_api_key') as string | undefined
  if (!apiKey?.trim()) return null

  // Build a concise data brief for Claude
  const lines: string[] = []
  if (data.idleDrivers.length > 0) {
    const names = data.idleDrivers.slice(0, 3).map(d => {
      const loc = d.location ?? d.homeBase
      return loc ? `${d.name} near ${loc}` : d.name
    }).join(', ')
    lines.push(`${data.idleDrivers.length} idle driver${data.idleDrivers.length !== 1 ? 's' : ''}: ${names}`)
  }
  if (data.leadHeat.length > 0) {
    const hot = data.leadHeat.filter(l => ['Call Ready', 'Interested'].includes(l.stage))
    if (hot.length > 0) {
      lines.push(`${hot.length} high-priority FB lead${hot.length !== 1 ? 's' : ''}: ${hot.slice(0, 3).map(l => `${l.name} (${l.stage})`).join(', ')}`)
    }
    const overdue = data.leadHeat.filter(l => l.followUpAt && l.followUpAt <= new Date().toISOString().split('T')[0])
    if (overdue.length > 0) lines.push(`${overdue.length} lead${overdue.length !== 1 ? 's' : ''} with overdue follow-up`)
  }
  if (data.topGroups.length > 0) {
    const best = data.topGroups[0]
    lines.push(`Best performing group: ${best.name} (${best.leadsGenerated} leads generated, ${best.signedDrivers} signed drivers)`)
  }
  if (data.topLanes.length > 0) {
    const best = data.topLanes[0]
    lines.push(`Highest-RPM lane: ${best.originState} to ${best.destState} at $${best.avgRpm.toFixed(2)}/mile over ${best.loads} loads`)
  }

  if (lines.length === 0) return null

  const result = await claudeComplete(
    apiKey,
    lines.join('\n'),
    'You are a dispatch operations assistant for a trucking company. Given a brief data summary, write exactly 2 sentences describing the most important revenue opportunities right now. Be specific with names and numbers. No greetings, no bullet points, no emojis. Plain declarative sentences only.',
    180,
  )
  return result.ok ? result.content.trim() : null
}
