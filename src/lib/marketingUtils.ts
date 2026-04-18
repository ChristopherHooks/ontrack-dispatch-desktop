/**
 * marketingUtils.ts
 * Utilities for the Marketing daily execution workflow.
 * No emojis. No AI calls. Fully local/offline.
 */

import { POST_TEMPLATES, renderTemplate, type PostTemplate, type PostCategory } from './postTemplates'

// ── Constants ─────────────────────────────────────────────────────────────────

export const TRUCK_TYPES: PostCategory[] = ['Dry Van', 'Reefer', 'Flatbed', 'Step Deck', 'Hotshot']

export function getTruckType(t: PostTemplate): string | null {
  return (TRUCK_TYPES as string[]).includes(t.category) ? t.category : null
}

// ── Daily Tasks ───────────────────────────────────────────────────────────────

export interface DailyTask {
  id:        string
  label:     string
  completed: boolean
}

const DEFAULT_DAILY_TASKS: Array<{ id: string; label: string }> = [
  { id: 'post_hotshot',    label: 'Post 1 hotshot template to recommended groups' },
  { id: 'post_freight',    label: 'Post 1 reefer, dry van, or flatbed template' },
  { id: 'post_2_3_groups', label: 'Post to 2-3 recommended groups today' },
  { id: 'log_outcomes',    label: 'Log replies and leads for each post' },
  { id: 'convert_leads',   label: 'Convert any interested replies into leads' },
]

export function loadDailyTasks(today: string): DailyTask[] {
  const key = `marketing_tasks_${today}`
  try {
    const raw = localStorage.getItem(key)
    if (raw) {
      const saved = JSON.parse(raw) as DailyTask[]
      // Merge saved completions into default list (in case tasks change)
      const completedIds = new Set(saved.filter(t => t.completed).map(t => t.id))
      return DEFAULT_DAILY_TASKS.map(t => ({ ...t, completed: completedIds.has(t.id) }))
    }
  } catch { /* ignore */ }
  return DEFAULT_DAILY_TASKS.map(t => ({ ...t, completed: false }))
}

export function saveDailyTasks(today: string, tasks: DailyTask[]): void {
  const key = `marketing_tasks_${today}`
  try {
    localStorage.setItem(key, JSON.stringify(tasks))
  } catch { /* ignore */ }
}

// ── Anti-Repetition / Template Selection ─────────────────────────────────────

export function selectSuggestedTemplate(
  recentlyUsedIds: Set<string>,
  usageCounts: Map<string, number>,
  catFilter: PostCategory | 'All',
  offset: number,
): { template: PostTemplate; reason: string } {
  const pool = catFilter !== 'All'
    ? POST_TEMPLATES.filter(t => t.category === catFilter)
    : POST_TEMPLATES

  if (pool.length === 0) {
    return { template: POST_TEMPLATES[0], reason: 'Default selection' }
  }

  // Score each template
  const scored = pool.map(t => {
    let score = 0
    if (!recentlyUsedIds.has(t.id)) score += 10         // Not used recently = strong preference
    const cnt = usageCounts.get(t.id) ?? 0
    score += Math.max(0, 8 - cnt * 2)                   // Lower use count = higher score
    return { template: t, score }
  })

  // Sort by score descending, then by id for stable ordering
  scored.sort((a, b) => b.score - a.score || a.template.id.localeCompare(b.template.id))

  const idx = ((offset % scored.length) + scored.length) % scored.length
  const chosen = scored[idx]

  let reason: string
  const notUsedRecently = !recentlyUsedIds.has(chosen.template.id)
  const cnt = usageCounts.get(chosen.template.id) ?? 0
  if (notUsedRecently && cnt === 0) {
    reason = 'Never used — fresh content'
  } else if (notUsedRecently) {
    reason = `Not used in the last 14 days (used ${cnt} time${cnt === 1 ? '' : 's'} total)`
  } else {
    reason = `All options used recently — picking least-used (${cnt} time${cnt === 1 ? '' : 's'})`
  }

  return { template: chosen.template, reason }
}

// ── Image Prompts ─────────────────────────────────────────────────────────────
// Copy-ready prompts for AI image generators (Midjourney, DALL-E, Leonardo, etc.)

export const IMAGE_PROMPTS: Record<string, string> = {
  'Hotshot':
    'Realistic photo of a dually pickup truck pulling a loaded gooseneck trailer on a two-lane highway, golden hour lighting, American countryside in the background, professional trucking photo, no text overlay',
  'Dry Van':
    'Realistic photo of a white 53-foot dry van semi-truck on a wide interstate highway, clear blue sky, daytime driving, professional trucking photo, no text overlay',
  'Reefer':
    'Realistic photo of a refrigerated trailer semi-truck backed into a loading dock at a distribution center, clean professional setting, subtle frost on the trailer, no text overlay',
  'Flatbed':
    'Realistic photo of a flatbed semi-truck loaded with bundled steel beams secured with chains and straps, open highway background, daylight, no text overlay',
  'Step Deck':
    'Realistic photo of a step-deck trailer hauling heavy construction equipment on a highway, overcast sky, wide-load setup, professional transport photo, no text overlay',
  'Driver Recruitment':
    'Professional photo of a truck driver in the cab of a clean semi-truck, confident expression, open road visible through the windshield, natural light, no text overlay',
  'Value Prop':
    'Clean professional image of a dispatch workstation with dual monitors showing load boards and maps, organized modern office, warm lighting, no text overlay',
  'Engagement':
    'Wide shot of several semi-trucks lined up at a busy truck stop, early morning golden hour light, authentic trucking atmosphere, no text overlay',
  'New Authority':
    'Photo of a brand-new semi-truck with fresh DOT authority numbers on the door, owner standing beside it with a confident posture, outdoor natural light, no text overlay',
  'Trust':
    'Photo of a dispatcher and a truck driver reviewing paperwork together at a desk, professional office setting, natural lighting, relaxed and confident posture, no text overlay',
  'Freight Market':
    'Aerial photo of a busy freight distribution center with semi-trucks at loading docks, organized logistics operation, daytime, no text overlay',
}

export function getImagePrompt(template: PostTemplate): string {
  return IMAGE_PROMPTS[template.category] ?? IMAGE_PROMPTS['Value Prop']
}

// ── Variation Generator ───────────────────────────────────────────────────────
// Swaps the opening line and CTA for a lighter variation of the same template.
// If no variant fragments exist for a category, returns the standard render.

const OPENING_VARIANTS: Record<PostCategory, string[]> = {
  'Hotshot': [
    'Dispatcher here. Running hotshot and need consistent loads?',
    'Hotshot operators — if you are spending more time chasing freight than running it, DM me.',
    'Running hotshot and sitting between loads more than you should be?',
    'I have hotshot freight and I need operators. DM me your home base.',
    'Hotshot carriers: what does your average rate per mile look like right now?',
  ],
  'Dry Van': [
    'Dispatcher here with consistent dry van freight and capacity for new carriers.',
    'Running a 53-foot dry van and spending too much time fighting the load board?',
    'Dry van operators — if your current dispatcher is just forwarding links, that is not dispatching.',
    'I need dry van operators and I have freight available. DM me your home base.',
    'Dry van carriers: are you actually getting negotiated rates or just accepting what the broker posts?',
  ],
  'Reefer': [
    'Reefer operators — if you are not hitting $3.00 per mile on your outbound lanes, something is off.',
    'Dispatcher here looking for reefer operators on southeast and midwest lanes.',
    'Running reefer and dealing with inconsistent freight? That is fixable.',
    'I dispatch reefer operators and I have capacity for new carriers right now.',
    'Reefer carriers: are your rates reflecting your actual equipment costs?',
  ],
  'Flatbed': [
    'Flatbed operators — you have more rate leverage than most carriers realize.',
    'Dispatcher here with broker relationships in steel, lumber, and construction freight.',
    'Running flatbed and not getting the premium your equipment deserves?',
    'I need flatbed operators. I have freight on lanes that do not always hit the public boards.',
    'Flatbed carriers: when did you last have a dispatcher actually negotiate your tarp premium?',
  ],
  'Step Deck': [
    'Step deck operators — the best loads in your category move through relationships before they hit the boards.',
    'Dispatcher here looking for step deck operators who want specialty freight that pays what it should.',
    'Running step deck and not seeing the rate premium your equipment commands?',
    'I have step deck freight and I am looking for qualified operators in multiple corridors.',
    'Step deck carriers: do you know what your equipment premium is over standard flatbed on your lanes?',
  ],
  'Driver Recruitment': [
    'Dispatcher here. Looking for owner-operators who want to focus on driving, not the admin work.',
    'If you are an owner-operator doing your own dispatching, how many hours a week does that cost you?',
    'Running your own authority is hard enough. The freight side should not be the hardest part.',
    'I have capacity for new carriers right now. DM me your equipment type and home state.',
    'Owner-operators: the ones who build something real eventually stop trying to do every job themselves.',
  ],
  'Value Prop': [
    'Real talk about what dispatch actually is versus what most services deliver.',
    'If your dispatcher is not negotiating your rates, you are overpaying for a load board subscription.',
    'The difference between a good week and a rough week usually comes down to who is working the phones.',
    'I do not forward load board links and call it dispatching. Here is what I actually do.',
    'Good dispatch is not about keeping the truck full. It is about keeping the truck profitable.',
  ],
  'Engagement': [
    'Honest question for owner-operators in here:',
    'Something worth talking about if you are running your own authority right now.',
    'Quick question for carriers in this group:',
    'I hear this a lot from operators I talk to and I am curious what this group thinks.',
    'For the owner-operators in here — drop your answer below.',
  ],
  'New Authority': [
    'If you just got your MC number, here is something worth knowing.',
    'New authority and trying to figure out the freight side? You are not alone.',
    'The first 90 days with a new authority are hard. Here is what to focus on.',
    'New MC in hand and not sure where to start — this is for you.',
    'Getting your authority is step one. Here is what comes next.',
  ],
  'Trust': [
    'I want to be upfront about how I work before you reach out.',
    'Transparency in dispatch is rare. Here is what working with me actually looks like.',
    'There is a lot of noise in the dispatch space. I would rather just show you what I do.',
    'Before you decide on a dispatcher, here is what to look for.',
    'I have worked with enough carriers to know that trust takes time. Here is how I earn it.',
  ],
  'Freight Market': [
    'Quick market update for carriers on midwest and southeast lanes.',
    'What the freight market is doing right now and what it means for owner-operators.',
    'If you are watching rates and wondering what is going on, here is the current picture.',
    'Rate conditions this week and what carriers should know before booking.',
    'The carriers who do best through soft cycles are not just chasing the highest spot rate.',
  ],
}

const CTA_VARIANTS: string[] = [
  'DM me directly — I respond the same day.',
  'Send me a message with your equipment type and home state.',
  'DM me your home base and I will tell you what your lanes are paying.',
  'Comment below or DM me — I get back to everyone.',
  'If this sounds like a fit, send me a message and we will talk.',
  'Drop your equipment type and home state in a DM.',
  'DM me directly. No pitch, just a quick conversation about your setup.',
  'Reach out if you want to know what freight is available on your lanes right now.',
]

export function generateVariation(template: PostTemplate, companyName: string, seed: number): string {
  const rendered = renderTemplate(template, companyName)
  const openings = OPENING_VARIANTS[template.category]

  if (!openings || openings.length === 0) return rendered

  const openingIdx = ((seed % openings.length) + openings.length) % openings.length
  const ctaIdx     = ((seed % CTA_VARIANTS.length) + CTA_VARIANTS.length) % CTA_VARIANTS.length

  const lines = rendered.split('\n\n').filter(l => l.trim())
  if (lines.length < 2) return rendered

  const newOpening = openings[openingIdx]
  const newCta     = CTA_VARIANTS[ctaIdx]

  // Replace first paragraph with variant opening, last paragraph with variant CTA.
  // The CTA variants are safe endings for any trucking post, so no keyword check needed.
  const body = lines.slice(1, -1)

  return [newOpening, ...body, newCta].join('\n\n')
}

// ── Short-form post generator ─────────────────────────────────────────────────
// Produces a 2-line post: one punchy hook sentence + one direct CTA.
// Designed for Facebook groups where short posts get more replies.

const SHORT_CTAS: string[] = [
  'DM me directly.',
  'Send me a message with your equipment type and home base.',
  'DM me — I respond the same day.',
  'Drop a comment or DM me if this sounds like your situation.',
  'Message me if you want to talk about what is available on your lanes.',
  'DM me your setup and I will follow up.',
  'No pitch, just a conversation. DM me.',
  'Send me a message with your truck type and home state.',
  'Comment below or DM me — I get back to everyone.',
  'DM me if you want to know what your lane is actually paying right now.',
]

export function generateShortPost(template: PostTemplate, companyName: string, seed: number): string {
  const openings = OPENING_VARIANTS[template.category]
  const ctaIdx   = ((seed % SHORT_CTAS.length) + SHORT_CTAS.length) % SHORT_CTAS.length
  const cta      = SHORT_CTAS[ctaIdx]

  if (openings && openings.length > 0) {
    const openIdx = ((seed % openings.length) + openings.length) % openings.length
    return `${openings[openIdx]}\n\n${cta}`
  }

  // Fallback: take first sentence of the template + CTA
  const rendered     = renderTemplate(template, companyName)
  const firstSentEnd = rendered.search(/[.!?]/)
  const hook         = firstSentEnd >= 0
    ? rendered.slice(0, firstSentEnd + 1).trim()
    : rendered.split('\n\n')[0]?.trim() ?? rendered.slice(0, 120).trim()

  return `${hook}\n\n${cta}`
}

// ── Group Suggestion ──────────────────────────────────────────────────────────

export interface MarketingGroupMin {
  id:              number
  name:            string
  url:             string | null
  platform:        string
  last_posted_at:  string | null
  truck_type_tags: string   // JSON
  active:          number
}

export function suggestGroupsForPost(
  groups: MarketingGroupMin[],
  truckType: string | null,
  today: string,
  maxResults = 5,
): MarketingGroupMin[] {
  const active = groups.filter(g => g.active !== 0)

  // Score every active group by recency only (category selection handles distribution)
  const scored = active.map(g => {
    const tags: string[] = (() => { try { return JSON.parse(g.truck_type_tags) } catch { return [] } })()

    const daysSince = g.last_posted_at
      ? Math.floor((new Date(today).getTime() - new Date(g.last_posted_at).getTime()) / 86400000)
      : 999

    const postedToday = g.last_posted_at === today

    let score = 0
    if (daysSince >= 2) score += 3
    if (daysSince >= 5) score += 2
    if (!postedToday) score += 2

    return { group: g, score, daysSince, postedToday, tags }
  }).filter(s => !s.postedToday)

  const picked: MarketingGroupMin[] = []
  const usedIds = new Set<number>()

  const bestFor = (filter: (tags: string[]) => boolean) =>
    scored
      .filter(s => !usedIds.has(s.group.id) && filter(s.tags))
      .sort((a, b) => b.score - a.score || b.daysSince - a.daysSince)[0]

  const pick = (candidate: ReturnType<typeof bestFor>) => {
    if (candidate) {
      picked.push(candidate.group)
      usedIds.add(candidate.group.id)
    }
  }

  // One slot per truck-type category — current template's type goes first
  const orderedCategories = truckType
    ? [truckType, ...TRUCK_TYPES.filter(t => t !== truckType)]
    : [...TRUCK_TYPES]

  for (const cat of orderedCategories) {
    if (picked.length >= maxResults) break
    pick(bestFor(tags => tags.includes(cat)))
  }

  // Fill any remaining slots with untagged general groups (tagged for all audiences)
  while (picked.length < maxResults) {
    const next = bestFor(tags => tags.length === 0)
    if (!next) break
    pick(next)
  }

  return picked
}

export function fmtDaysSince(d: string | null, today: string): string {
  if (!d) return 'Never posted'
  const n = Math.floor((new Date(today).getTime() - new Date(d).getTime()) / 86400000)
  if (n === 0) return 'Posted today'
  if (n === 1) return 'Posted yesterday'
  return `${n} days ago`
}
