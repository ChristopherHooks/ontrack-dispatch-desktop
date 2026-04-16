/**
 * guidanceResolver.ts
 * Lightweight rule-based helper that maps a workflow context key
 * to a ranked list of relevant SopDocuments.
 *
 * No AI calls. No runtime summarization.
 * Scoring: category match (+2 primary, +1 secondary) + title keyword match (+1 each).
 */

import type { SopDocument, LoadStatus } from '../types/models'

export type GuidanceContext =
  | 'broker-overview' | 'carrier-offers' | 'carrier-vetting'
  | 'dispatch-board'
  | 'driver-onboarding' | 'driver-documents'
  | 'load-create-dispatch' | 'load-create-broker'

interface ContextRule {
  /** Ordered preferred categories — first gets highest weight */
  categories: string[]
  /** Partial keywords to match against doc title (case-insensitive) */
  keywords: string[]
}

const RULES: Record<GuidanceContext, ContextRule> = {
  'broker-overview': {
    categories: ['Brokers', 'Dispatch'],
    keywords: ['lifecycle', 'workflow', 'script', 'broker', 'load booking', 'overview', 'sop', 'process'],
  },
  'carrier-offers': {
    categories: ['Brokers', 'Sales'],
    keywords: ['carrier', 'offer', 'call', 'inbound', 'negotiat', 'rate', 'selection', 'book'],
  },
  'carrier-vetting': {
    categories: ['Brokers', 'Policy', 'Reference'],
    keywords: ['vet', 'vetting', 'compliance', 'checklist', 'insurance', 'authority', 'packet', 'safety'],
  },
  'dispatch-board': {
    categories: ['Dispatch', 'Reference'],
    keywords: ['dispatch', 'daily', 'check call', 'status', 'assign', 'board', 'routine', 'load booking'],
  },
  'driver-onboarding': {
    categories: ['Drivers', 'Policy'],
    keywords: ['onboard', 'setup', 'checklist', 'agreement', 'w-9', 'w9', 'coi', 'packet', 'carrier setup'],
  },
  'driver-documents': {
    categories: ['Drivers', 'Policy', 'Reference'],
    keywords: ['document', 'cdl', 'insurance', 'compliance', 'expir', 'bol', 'pod', 'file', 'renewal'],
  },
  'load-create-dispatch': {
    categories: ['Dispatch', 'Reference'],
    keywords: ['load booking', 'rate', 'dispatch', 'rate con', 'booking', 'booked', 'confirm', 'checklist'],
  },
  'load-create-broker': {
    categories: ['Brokers', 'Reference'],
    keywords: ['broker', 'posting', 'dat', 'rate', 'book', 'lifecycle', 'workflow', 'load', 'script'],
  },
}

/**
 * Returns up to 3 documents most relevant to the given context,
 * ranked by category + keyword score. Returns empty array if no matches.
 */
export function resolveGuidance(context: GuidanceContext, docs: SopDocument[]): SopDocument[] {
  const rule = RULES[context]

  return docs
    .filter(d => d.category !== 'Template')   // bare templates are not procedural guidance
    .map(doc => {
      const titleLower = doc.title.toLowerCase()
      const catLower   = doc.category.toLowerCase()
      let score = 0

      rule.categories.forEach((cat, idx) => {
        if (catLower === cat.toLowerCase()) score += idx === 0 ? 2 : 1
      })

      rule.keywords.forEach(kw => {
        if (titleLower.includes(kw.toLowerCase())) score += 1
      })

      return { doc, score }
    })
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(x => x.doc)
}

// ---------------------------------------------------------------------------
// State-aware load guidance
// ---------------------------------------------------------------------------

export interface LoadGuidanceResult {
  primary: SopDocument | null
  reason: string | null
  secondary: SopDocument[]
}

interface LoadState {
  load_mode: 'dispatch' | 'broker'
  status: LoadStatus
  invoiced: 0 | 1
}

interface BrokerWorkflowState {
  datPostings: { length: number }
  carrierOffers: Array<{ status: string }>
  vetting: object | null
}

/**
 * Determines the single most-recommended SOP (primary) for a load
 * based on live workflow state, plus supporting secondary SOPs.
 *
 * Broker mode state machine:
 *   no DAT postings          → DAT / posting SOPs
 *   no accepted offer        → carrier offer / inbound call SOPs
 *   accepted + no vetting    → carrier vetting / compliance SOPs
 *   Carrier Selected/Booked  → rate con / pickup SOPs
 *   Delivered + not invoiced → invoice / settlement SOPs
 *   Invoiced/Paid            → general broker overview
 *
 * Dispatch mode state machine:
 *   Searching                → load booking SOPs
 *   Booked / In Transit      → check call SOPs
 *   Delivered + not invoiced → POD / invoice SOPs
 *   otherwise                → general dispatch SOPs
 */
export function resolveGuidanceForLoad(
  load: LoadState,
  brokerState: BrokerWorkflowState,
  docs: SopDocument[]
): LoadGuidanceResult {
  const ranked = (context: GuidanceContext) => resolveGuidance(context, docs)

  let primaryContext: GuidanceContext
  let reason: string

  if (load.load_mode === 'broker') {
    const hasAcceptedOffer = brokerState.carrierOffers.some(o => o.status === 'Accepted')

    if (brokerState.datPostings.length === 0) {
      primaryContext = 'broker-overview'
      reason = 'No DAT posting yet — start with the broker workflow'
    } else if (!hasAcceptedOffer) {
      primaryContext = 'carrier-offers'
      reason = 'Waiting on carrier — review offer and negotiation steps'
    } else if (!brokerState.vetting) {
      primaryContext = 'carrier-vetting'
      reason = 'Offer accepted — complete carrier vetting before dispatch'
    } else if (['Delivered'].includes(load.status) && load.invoiced === 0) {
      primaryContext = 'broker-overview'
      reason = 'Load delivered — ready to invoice'
    } else {
      primaryContext = 'broker-overview'
      reason = null as unknown as string
    }
  } else {
    // dispatch mode
    if (load.status === 'Searching') {
      primaryContext = 'load-create-dispatch'
      reason = 'Searching for a load — review booking checklist'
    } else if (['Booked', 'Picked Up', 'In Transit'].includes(load.status)) {
      primaryContext = 'dispatch-board'
      reason = 'Load is active — check call and status update steps'
    } else if (load.status === 'Delivered' && load.invoiced === 0) {
      primaryContext = 'load-create-dispatch'
      reason = 'Delivered — confirm POD received and invoice ready'
    } else {
      primaryContext = 'load-create-dispatch'
      reason = null as unknown as string
    }
  }

  const all = ranked(primaryContext)
  const primary = all[0] ?? null
  const secondary = all.slice(1, 3)

  return {
    primary,
    reason: reason || null,
    secondary,
  }
}
