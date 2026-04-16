/**
 * guidanceResolver.ts
 * Lightweight rule-based helper that maps a workflow context key
 * to a ranked list of relevant SopDocuments.
 *
 * No AI calls. No runtime summarization.
 * Scoring: category match (+2 primary, +1 secondary) + title keyword match (+1 each).
 */

import type { SopDocument } from '../types/models'

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
