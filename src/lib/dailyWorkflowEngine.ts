/**
 * Daily Workflow Engine
 * Computes a conditional, profit-first task list from current operational data.
 * Pure function — no side effects, no imports from React or IPC.
 *
 * Priority tiers:
 *   Tier 1 (revenue_now)        — book loads, check calls, morning brief
 *   Tier 2 (revenue_protection) — invoice delivered, collect AR, compliance
 *   Tier 3 (pipeline)           — lead follow-up, driver prospects, warm leads
 *   Tier 4 (admin)              — stale loads, marketing
 */

import {
  activeLoadsRoute,
  invoicesRoute,
  leadsRoute,
  loadsRoute,
} from './routeIntents'

export type WorkflowCategory   = 'revenue_now' | 'revenue_protection' | 'pipeline' | 'admin'
export type WorkflowTaskStatus = 'actionable' | 'completed' | 'not_applicable'

export interface DailyWorkflowTask {
  id:           string
  title:        string
  description?: string
  category:     WorkflowCategory
  priority:     number              // lower = shown first; used for sort within group
  status:       WorkflowTaskStatus
  reason?:      string              // shown when not_applicable
  actionLabel?: string
  actionTarget?: string             // route path or '#scroll:<elementId>'
  count?:       number
}

// Input derived entirely from existing Operations data + checkCalls state
export interface WorkflowInput {
  driversNeedingLoads:           number
  loadsInTransit:                number
  overdueCheckCalls:             number
  totalCheckCalls:               number
  overdueLeads:                  number
  uninvoicedDelivered:           number
  overdueInvoices:               number
  expiringDocs:                  number
  staleLoads:                    number
  warmLeads:                     number
  hotProspects:                  number
  todaysGroupCount:              number
  morningBriefCount:             number
  /** load_id_pk of the first overdue check call — used to deep-link directly to that load */
  firstOverdueCheckCallLoadId?:  number
  /** Name of the first idle driver — shown in book_loads task title when count === 1 */
  firstIdleDriverName?:          string
}

export const CATEGORY_META: Record<WorkflowCategory, { label: string; tier: number }> = {
  revenue_now:        { label: 'Revenue Now',        tier: 1 },
  revenue_protection: { label: 'Revenue Protection', tier: 2 },
  pipeline:           { label: 'Pipeline',           tier: 3 },
  admin:              { label: 'Admin',              tier: 4 },
}

export const CATEGORY_ORDER: WorkflowCategory[] = [
  'revenue_now', 'revenue_protection', 'pipeline', 'admin',
]

/**
 * Compute the full ordered task list for the current session.
 *
 * @param input         - counts from Operations data + checkCalls
 * @param manuallyDone  - set of task IDs the dispatcher has manually marked done
 */
export function computeDailyWorkflow(
  input: WorkflowInput,
  manuallyDone: Set<string>,
): DailyWorkflowTask[] {
  const tasks: DailyWorkflowTask[] = []
  const done = (id: string): WorkflowTaskStatus =>
    manuallyDone.has(id) ? 'completed' : 'actionable'

  // ── Tier 1: Revenue Now ─────────────────────────────────────────────────────

  // Morning Dispatch Brief — show when drivers have load suggestions
  if (input.morningBriefCount > 0) {
    tasks.push({
      id: 'morning_brief',
      title: 'Review Morning Dispatch Brief',
      description: `${input.morningBriefCount} driver${input.morningBriefCount !== 1 ? 's' : ''} with load suggestions ready`,
      category: 'revenue_now', priority: 10,
      status: done('morning_brief'),
      actionLabel: 'Jump to brief', actionTarget: '#scroll:morning-dispatch-brief',
      count: input.morningBriefCount,
    })
  } else {
    tasks.push({
      id: 'morning_brief', title: 'Morning Dispatch Brief',
      category: 'revenue_now', priority: 10,
      status: 'not_applicable',
      reason: 'No drivers with load suggestions',
    })
  }

  // Book loads — show when active drivers have no current assignment
  if (input.driversNeedingLoads > 0) {
    const oneDriver = input.driversNeedingLoads === 1 && input.firstIdleDriverName
    tasks.push({
      id: 'book_loads',
      title: oneDriver
        ? `Book load for ${input.firstIdleDriverName}`
        : `Book loads — ${input.driversNeedingLoads} drivers available`,
      description: oneDriver
        ? `${input.firstIdleDriverName} is available and needs a load`
        : 'Active drivers with no current load assigned',
      category: 'revenue_now', priority: 11,
      status: done('book_loads'),
      actionLabel: 'Find Loads', actionTarget: '/findloads',
      count: input.driversNeedingLoads,
    })
  } else {
    tasks.push({
      id: 'book_loads', title: 'Book loads for idle drivers',
      category: 'revenue_now', priority: 11,
      status: 'not_applicable',
      reason: 'All active drivers are assigned',
    })
  }

  // Check calls — skip if no active loads; surface overdue calls first
  if (input.overdueCheckCalls > 0) {
    tasks.push({
      id: 'check_calls',
      title: `${input.overdueCheckCalls} overdue check call${input.overdueCheckCalls !== 1 ? 's' : ''}`,
      description: 'Active loads past their scheduled check-in time',
      category: 'revenue_now', priority: 12,
      status: done('check_calls'),
      actionLabel: 'Active Loads',
      actionTarget: activeLoadsRoute(input.firstOverdueCheckCallLoadId),
      count: input.overdueCheckCalls,
    })
  } else if (input.totalCheckCalls > 0) {
    tasks.push({
      id: 'check_calls', title: 'Check calls — all on schedule',
      category: 'revenue_now', priority: 12,
      status: 'not_applicable',
      reason: `${input.totalCheckCalls} upcoming — none overdue yet`,
    })
  } else {
    tasks.push({
      id: 'check_calls', title: 'Check calls',
      category: 'revenue_now', priority: 12,
      status: 'not_applicable',
      reason: 'No active loads require check calls',
    })
  }

  // ── Tier 2: Revenue Protection ──────────────────────────────────────────────

  // Invoice delivered loads — skip when all delivered loads are already invoiced
  if (input.uninvoicedDelivered > 0) {
    tasks.push({
      id: 'invoice_delivered',
      title: `Invoice ${input.uninvoicedDelivered} delivered load${input.uninvoicedDelivered !== 1 ? 's' : ''}`,
      description: 'Get paid faster — these are done and waiting for an invoice',
      category: 'revenue_protection', priority: 20,
      status: done('invoice_delivered'),
      actionLabel: 'Invoices', actionTarget: invoicesRoute(true),
      count: input.uninvoicedDelivered,
    })
  } else {
    tasks.push({
      id: 'invoice_delivered', title: 'Invoice delivered loads',
      category: 'revenue_protection', priority: 20,
      status: 'not_applicable',
      reason: 'No delivered uninvoiced loads',
    })
  }

  // AR / overdue invoice collection — skip when no overdue invoices
  if (input.overdueInvoices > 0) {
    tasks.push({
      id: 'ar_followup',
      title: `Collect on ${input.overdueInvoices} overdue invoice${input.overdueInvoices !== 1 ? 's' : ''}`,
      description: 'Past payment terms — send follow-up and push for payment',
      category: 'revenue_protection', priority: 21,
      status: done('ar_followup'),
      actionLabel: 'View Invoices', actionTarget: '/invoices',
      count: input.overdueInvoices,
    })
  } else {
    tasks.push({
      id: 'ar_followup', title: 'AR / payment follow-up',
      category: 'revenue_protection', priority: 21,
      status: 'not_applicable',
      reason: 'No overdue invoices pending collection',
    })
  }

  // Compliance — skip when all docs are current
  if (input.expiringDocs > 0) {
    tasks.push({
      id: 'compliance',
      title: `${input.expiringDocs} compliance doc${input.expiringDocs !== 1 ? 's' : ''} expiring soon`,
      description: 'Expiring documents can block dispatch — act before they lapse',
      category: 'revenue_protection', priority: 22,
      status: done('compliance'),
      actionLabel: 'Drivers', actionTarget: '/drivers',
      count: input.expiringDocs,
    })
  } else {
    tasks.push({
      id: 'compliance', title: 'Compliance review',
      category: 'revenue_protection', priority: 22,
      status: 'not_applicable',
      reason: 'All compliance documents current',
    })
  }

  // ── Tier 3: Pipeline Building ───────────────────────────────────────────────

  // Overdue lead follow-ups — cap daily target at 3; show total as context when backlog is larger
  if (input.overdueLeads > 0) {
    const leadTarget = Math.min(input.overdueLeads, 3)
    tasks.push({
      id: 'lead_followup',
      title: `Follow up with ${leadTarget} overdue lead${leadTarget !== 1 ? 's' : ''} today`,
      description: input.overdueLeads > 3
        ? `${input.overdueLeads} total overdue — start with the top 3`
        : 'Call or update these leads to keep the pipeline moving',
      category: 'pipeline', priority: 30,
      status: done('lead_followup'),
      actionLabel: 'View Leads', actionTarget: leadsRoute('overdue'),
      count: leadTarget,
    })
  } else {
    tasks.push({
      id: 'lead_followup', title: 'Lead follow-ups',
      category: 'pipeline', priority: 30,
      status: 'not_applicable',
      reason: 'No follow-ups due today',
    })
  }

  // Driver prospect follow-up — cap daily target at 3
  if (input.hotProspects > 0) {
    const prospectTarget = Math.min(input.hotProspects, 3)
    tasks.push({
      id: 'driver_prospects',
      title: `Follow up with ${prospectTarget} driver prospect${prospectTarget !== 1 ? 's' : ''} today`,
      description: input.hotProspects > 3
        ? `${input.hotProspects} total due — start with the top 3`
        : 'High/medium priority or overdue follow-up dates',
      category: 'pipeline', priority: 31,
      status: done('driver_prospects'),
      actionLabel: 'Driver Pipeline', actionTarget: '/driver-acquisition',
      count: prospectTarget,
    })
  } else {
    tasks.push({
      id: 'driver_prospects', title: 'Driver prospect follow-ups',
      category: 'pipeline', priority: 31,
      status: 'not_applicable',
      reason: 'No driver prospects due for follow-up',
    })
  }

  // Warm lead outreach — cap daily target at 3
  if (input.warmLeads > 0) {
    const warmTarget = Math.min(input.warmLeads, 3)
    tasks.push({
      id: 'warm_leads',
      title: `Reach out to ${warmTarget} warm lead${warmTarget !== 1 ? 's' : ''} today`,
      description: input.warmLeads > 3
        ? `${input.warmLeads} with upcoming follow-up dates — start with the top 3`
        : 'High/medium priority leads with follow-up due within 3 days',
      category: 'pipeline', priority: 32,
      status: done('warm_leads'),
      actionLabel: 'View Leads', actionTarget: leadsRoute('upcoming'),
      count: warmTarget,
    })
  } else {
    tasks.push({
      id: 'warm_leads', title: 'Warm lead outreach',
      category: 'pipeline', priority: 32,
      status: 'not_applicable',
      reason: 'No warm leads in pipeline right now',
    })
  }

  // ── Tier 4: Admin / Cleanup ─────────────────────────────────────────────────

  // Stale loads — only when loads are stuck past their expected dates
  if (input.staleLoads > 0) {
    tasks.push({
      id: 'stale_loads',
      title: `${input.staleLoads} load${input.staleLoads !== 1 ? 's' : ''} past expected date`,
      description: 'Check status and update or escalate with the driver',
      category: 'admin', priority: 40,
      status: done('stale_loads'),
      actionLabel: 'View Loads', actionTarget: loadsRoute({ stale: true }),
      count: input.staleLoads,
    })
  } else {
    tasks.push({
      id: 'stale_loads', title: 'Stale load cleanup',
      category: 'admin', priority: 40,
      status: 'not_applicable',
      reason: 'All loads progressing on schedule',
    })
  }

  // Facebook marketing — badge shows daily target (2-3), description gives total eligible as context
  if (input.todaysGroupCount > 0) {
    tasks.push({
      id: 'marketing',
      title: 'Post to 2-3 recommended Facebook groups today',
      description: `${input.todaysGroupCount} group${input.todaysGroupCount !== 1 ? 's' : ''} eligible — pick the highest-priority 2-3`,
      category: 'admin', priority: 41,
      status: done('marketing'),
      actionLabel: 'Marketing', actionTarget: '/marketing',
      count: Math.min(input.todaysGroupCount, 3),
    })
  } else {
    tasks.push({
      id: 'marketing', title: 'Facebook marketing posts',
      category: 'admin', priority: 41,
      status: 'not_applicable',
      reason: 'No groups eligible to post today',
    })
  }

  return tasks.sort((a, b) => a.priority - b.priority)
}
