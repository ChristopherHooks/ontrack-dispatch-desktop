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
  { id: 'post_hotshot',    label: 'Post 1 hotshot template to Facebook groups' },
  { id: 'post_freight',    label: 'Post 1 reefer, dry van, or flatbed template' },
  { id: 'post_3_groups',   label: 'Post to at least 3 groups today' },
  { id: 'add_new_groups',  label: 'Add any newly joined groups to the group list' },
  { id: 'review_history',  label: 'Review recent post history and note any leads' },
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
    'If you run hotshot and need steady loads, we should talk.',
    'Looking for a hotshot dispatcher who keeps you moving and off the phone?',
    'Hotshot operators: we have freight that fits your setup.',
    'Running hotshot and spending too much time chasing loads yourself?',
    'Consistent hotshot freight is hard to find without the right connections.',
  ],
  'Dry Van': [
    'Dry van drivers and owner-operators — we have consistent lanes available.',
    'If you are running a dry van and need a dispatcher, here is what we offer.',
    'Looking for a reliable dispatch partner for your dry van operation?',
    'Dry van freight is our bread and butter, and we keep our drivers moving.',
    'Running a 53-foot dry van and tired of slow load boards?',
  ],
  'Reefer': [
    'Reefer operators who want consistent miles and fair rates — we should talk.',
    'Running a reefer unit and tired of inconsistent freight?',
    'We specialize in reefer dispatch and have lanes open right now.',
    'Reefer drivers looking for a hands-on dispatcher with real freight connections — this is for you.',
    'Temperature-controlled freight pays well when you have the right dispatcher behind you.',
  ],
  'Flatbed': [
    'Flatbed operators looking for a dispatcher who knows the freight — reach out.',
    'If you run a flatbed and want better loads without all the hassle, let us talk.',
    'We have flatbed freight available and are looking for dependable owner-operators.',
    'Flatbed dispatch requires someone who understands specialized freight, and that is what we do.',
    'Running a flatbed takes real skill. Finding the right loads should not be the hard part.',
  ],
  'Step Deck': [
    'Step-deck operators with the right permits and the right attitude — we want to work with you.',
    'If you run a step deck and want a dispatcher who handles the heavy lifting on the freight side, reach out.',
    'Step-deck freight pays well when you have the right partner finding it for you.',
    'Running a step deck and looking for loads that match your equipment and lanes?',
    'Step-deck and lowboy operators — we work with carriers who run specialized freight.',
  ],
  'Driver Recruitment': [
    'Owner-operators who want to focus on driving instead of chasing freight — this is for you.',
    'If you are an owner-operator tired of doing it all yourself, we built something for that.',
    'Running your own authority is hard enough. Let us handle the freight side.',
    'The best owner-operators we work with have one thing in common — they stopped trying to do everything alone.',
    'Looking for carriers who want a real dispatcher, not just a load board forwarding service.',
  ],
  'Value Prop': [
    'Here is what professional dispatch actually looks like in practice.',
    'A lot of owner-operators have never had a dispatcher who actually negotiates for them.',
    'The difference between a good week and a bad week often comes down to who is working the phones for you.',
    'Most dispatch services send you links. That is not what we do.',
    'Good dispatch is not about keeping the truck full. It is about keeping the truck profitable.',
  ],
  'Engagement': [
    'Something worth discussing for anyone running their own authority right now.',
    'A question worth thinking about if you are out here running your own truck.',
    'This comes up more than you might expect in conversations with owner-operators.',
    'One of the most common things we hear from carriers when they first reach out to us.',
    'If you are in the trucking space, this is probably something you have dealt with.',
  ],
  'New Authority': [
    'If you just got your authority, there are a few things worth knowing right away.',
    'New MC number in hand and trying to figure out where to start — this is for you.',
    'Getting your authority is step one. Building a sustainable operation is the harder part.',
    'Brand-new authority and not sure what comes next? We work with carriers at exactly this stage.',
    'The early months with a new authority are the most important. Here is what to focus on.',
  ],
  'Trust': [
    'We want to be straightforward about how we work before you reach out.',
    'Transparency matters in dispatch. Here is what working with us actually looks like.',
    'There is a lot of noise in the dispatch space. We would rather just show you what we do.',
    'Before you decide who to work with, it helps to know what to look for.',
    'We have worked with enough carriers to know that trust takes time. Here is how we earn it.',
  ],
  'Freight Market': [
    'A quick read on what is happening in the freight market right now.',
    'The market has been moving. Here is what that means for owner-operators on the road today.',
    'If you are watching rates and wondering what is going on, this is worth a look.',
    'Freight conditions change fast. Here is the current picture for carriers.',
    'Rate trends this week and what owner-operators should know before booking.',
  ],
}

const CTA_VARIANTS: string[] = [
  'Drop a comment or send a message to get started.',
  'Reach out if you want more details on what we have available.',
  'Send a message and we can go over rates and available freight.',
  'Comment or message us and we will get back to you the same day.',
  'If this sounds like a fit, send a message and we will talk.',
  'Shoot us a message with your equipment type and home base.',
  'Message us directly — we respond fast.',
  'Comment below or send a DM and we will follow up.',
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
