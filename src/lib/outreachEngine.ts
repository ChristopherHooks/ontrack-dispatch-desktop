/**
 * outreachEngine.ts
 * Outreach Engine — assembles Facebook group + page posts from
 * rotating template banks with zero AI cost.
 *
 * Rules (from CLAUDE.md):
 * - No emojis ever
 * - Natural, human tone — no hype, no bullet lists
 * - 90-day variety via rotation + seeded randomness
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export interface OutreachVars {
  driver_type:  string   // e.g. "hotshot", "box truck", "dry van"
  lane_region:  string   // e.g. "Southeast", "Texas to Midwest"
  rpm_range:    string   // e.g. "$2.10-$2.40"
  company_name: string
}

export interface GeneratedPost {
  id:          string
  text:        string
  template_id: string
  hook_id:     string
  cta_id:      string
  type:        'group' | 'page'
}

export interface OutreachResult {
  group_posts:  GeneratedPost[]
  page_post:    GeneratedPost
  generated_at: string
}

// ── Seeded PRNG (LCG — deterministic per date + offset) ───────────────────────

function makePrng(seed: number): () => number {
  let s = seed >>> 0
  return function next(): number {
    s = Math.imul(s, 1664525) + 1013904223
    s = s >>> 0
    return s / 0x100000000
  }
}

function dateToSeed(date: string, offset: number): number {
  let h = offset * 2654435761
  for (let i = 0; i < date.length; i++) {
    h = Math.imul(31, h) + date.charCodeAt(i)
  }
  return h >>> 0
}

// ── Pickers ───────────────────────────────────────────────────────────────────

function pick<T>(arr: T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)]
}

function pickN<T>(arr: T[], n: number, rng: () => number): T[] {
  const pool = [...arr]
  const out: T[] = []
  while (out.length < n && pool.length > 0) {
    const i = Math.floor(rng() * pool.length)
    out.push(pool.splice(i, 1)[0])
  }
  return out
}

// ── Hook Bank — 20 hooks, 2 variations each ───────────────────────────────────

interface BankEntry {
  id:         string
  variations: string[]
}

export const HOOKS: BankEntry[] = [
  {
    id: 'h-01',
    variations: [
      'Looking for {driver_type} operators who actually want consistent freight.',
      'If you run {driver_type} and need steady loads, this is worth reading.',
    ],
  },
  {
    id: 'h-02',
    variations: [
      'Dispatcher here. Have open capacity for {driver_type} operators in the {lane_region}.',
      'I have open lanes for {driver_type} operators running the {lane_region} right now.',
    ],
  },
  {
    id: 'h-03',
    variations: [
      'Real talk — most dispatch services send you load board links and call it dispatching.',
      'A lot of dispatchers hand you a load board login and disappear. Not how I work.',
    ],
  },
  {
    id: 'h-04',
    variations: [
      'How many hours a week do you spend chasing loads yourself?',
      'Be honest — how much time are you burning on the load board every week?',
    ],
  },
  {
    id: 'h-05',
    variations: [
      'You got your authority to make money driving, not to sit in front of a load board.',
      'You did not get your authority to spend half your day negotiating with brokers.',
    ],
  },
  {
    id: 'h-06',
    variations: [
      'Working with {driver_type} operators right now. Have freight if your truck is available.',
      'I need {driver_type} capacity in the {lane_region}. If your truck is sitting, send me a message.',
    ],
  },
  {
    id: 'h-07',
    variations: [
      'Rates in the {lane_region} are running {rpm_range} RPM right now for {driver_type}.',
      '{driver_type} lanes out of the {lane_region} have been running {rpm_range} RPM this week.',
    ],
  },
  {
    id: 'h-08',
    variations: [
      'Dispatcher with solid broker relationships and a short list of drivers. That is the model.',
      'Small roster, real relationships. Not taking on 50 trucks and handing out scraps.',
    ],
  },
  {
    id: 'h-09',
    variations: [
      'New authority? You are going to get low-balled every day until you know which brokers are worth talking to.',
      'If you just got your authority, you are about to find out real fast which brokers are worth your time.',
    ],
  },
  {
    id: 'h-10',
    variations: [
      'The load board is not a strategy. It is a race to the bottom.',
      'Posting your truck on a load board and hoping is not a business plan.',
    ],
  },
  {
    id: 'h-11',
    variations: [
      '{driver_type} operator looking for a dispatcher? Here is what actually matters.',
      'Before you hire a dispatcher for your {driver_type}, here is what to look for.',
    ],
  },
  {
    id: 'h-12',
    variations: [
      'I check broker payment history before I book anything. Not all of them pay on time.',
      'Payment terms matter. I pull broker history before committing your truck to anything.',
    ],
  },
  {
    id: 'h-13',
    variations: [
      'Detention time costs you money. I chase it. Most dispatchers do not.',
      'Most dispatchers let detention slide. I put it on the rate con and I collect it.',
    ],
  },
  {
    id: 'h-14',
    variations: [
      'Currently running {driver_type} freight in the {lane_region}. Have a spot opening up.',
      'Taking on one more {driver_type} operator for {lane_region} lanes.',
    ],
  },
  {
    id: 'h-15',
    variations: [
      'If your dispatcher is not negotiating — they are just booking. There is a difference.',
      'Booking a load and negotiating a load are two different things. I do the second one.',
    ],
  },
  {
    id: 'h-16',
    variations: [
      'What does your average RPM look like right now? If it is under {rpm_range}, we should talk.',
      'If your {driver_type} is averaging under {rpm_range} RPM consistently, something is off.',
    ],
  },
  {
    id: 'h-17',
    variations: [
      'Anyone running {driver_type} freight out of the {lane_region} right now?',
      'Any {driver_type} operators working the {lane_region}? I may have something for you.',
    ],
  },
  {
    id: 'h-18',
    variations: [
      'Running your own dispatching is costing you more than my fee. Every time.',
      'The time you spend dispatching yourself is not free. It has a real cost.',
    ],
  },
  {
    id: 'h-19',
    variations: [
      'I work with a handful of carriers. Not a hundred. You get actual attention.',
      'Small roster on purpose. Every operator I work with gets my actual time.',
    ],
  },
  {
    id: 'h-20',
    variations: [
      '{driver_type} freight is moving. I have broker contacts that want capacity right now.',
      '{driver_type} loads are available this week. Have the contacts if you have the truck.',
    ],
  },
]

// ── CTA Bank — 15 CTAs, 2 variations each ────────────────────────────────────

export const CTAS: BankEntry[] = [
  {
    id: 'cta-01',
    variations: [
      'DM me your equipment type and home state.',
      'Message me with your equipment and where you run out of.',
    ],
  },
  {
    id: 'cta-02',
    variations: [
      'Comment your truck type below and I will reach out.',
      'Drop your equipment type in the comments.',
    ],
  },
  {
    id: 'cta-03',
    variations: [
      'DM me directly. I respond same day.',
      'Send me a DM and I will get back to you today.',
    ],
  },
  {
    id: 'cta-04',
    variations: [
      'DM me if you want to talk numbers.',
      'If the numbers matter to you, message me and we can go over them.',
    ],
  },
  {
    id: 'cta-05',
    variations: [
      'Send me a message. No sales pitch, just a straight conversation.',
      'DM me. I do not do pitches — just a straight conversation about what I can do for you.',
    ],
  },
  {
    id: 'cta-06',
    variations: [
      'DM me and I will tell you exactly what your truck should be earning on your lanes.',
      'Send me your equipment and home lanes and I will give you a straight answer on what your freight should pay.',
    ],
  },
  {
    id: 'cta-07',
    variations: [
      'Reach out if you want to see how we work before committing to anything.',
      'DM me if you want the details before you decide anything.',
    ],
  },
  {
    id: 'cta-08',
    variations: [
      'If your truck is available, message me now.',
      'Truck available? Message me.',
    ],
  },
  {
    id: 'cta-09',
    variations: [
      'DM me or comment below — I check this regularly.',
      'Comment here or send me a message. I check both.',
    ],
  },
  {
    id: 'cta-10',
    variations: [
      'Send me a message with your home base and equipment. I will follow up the same day.',
      'DM me your home state and what you are running. I will get back to you today.',
    ],
  },
  {
    id: 'cta-11',
    variations: [
      'No obligation — just a conversation. DM me.',
      'This is not a commitment. Send me a message and we talk.',
    ],
  },
  {
    id: 'cta-12',
    variations: [
      'Comment "interested" and I will reach out.',
      'Drop "interested" in the comments and I will DM you.',
    ],
  },
  {
    id: 'cta-13',
    variations: [
      'DM me with questions. I will give you straight answers.',
      'Have questions? Send me a message. I do not dodge them.',
    ],
  },
  {
    id: 'cta-14',
    variations: [
      'Message me. If it is not a fit, I will tell you that too.',
      'Send me a message. If we are not a match, I will be straight with you about it.',
    ],
  },
  {
    id: 'cta-15',
    variations: [
      "DM me and let's figure out if this makes sense for your operation.",
      'Send me a message and we can figure out pretty quick whether this works for you.',
    ],
  },
]

// ── Pain Point Bank — 15 entries ──────────────────────────────────────────────

interface PainPointEntry {
  id:   string
  text: string
}

export const PAIN_POINTS: PainPointEntry[] = [
  { id: 'pp-01', text: 'spending hours on the load board every day just to keep the truck moving' },
  { id: 'pp-02', text: 'taking low rates because you do not know which brokers are actually negotiable' },
  { id: 'pp-03', text: 'getting ghosted by brokers after delivering a load' },
  { id: 'pp-04', text: 'chasing detention pay that brokers try to ignore' },
  { id: 'pp-05', text: 'getting stuck on bad lanes with no consistent way home' },
  { id: 'pp-06', text: 'working with dispatchers who disappear the moment something goes wrong' },
  { id: 'pp-07', text: 'not knowing which brokers pay slow or not at all until it is too late' },
  { id: 'pp-08', text: 'running your authority solo and doing all your own dispatching on top of it' },
  { id: 'pp-09', text: 'running spot rates week to week when you should be on consistent freight' },
  { id: 'pp-10', text: 'missing loads because you are driving when you should be booking' },
  { id: 'pp-11', text: 'dealing with rate cons that do not match what was quoted on the phone' },
  { id: 'pp-12', text: 'not having enough broker relationships to negotiate from any real position' },
  { id: 'pp-13', text: 'dead miles eating into your margin every time you reposition' },
  { id: 'pp-14', text: 'inconsistent freight — solid week, then nothing' },
  { id: 'pp-15', text: 'paying dispatch fees to someone who just sends you load board links and does nothing else' },
]

// ── Benefit Bank — 15 entries ─────────────────────────────────────────────────

interface BenefitEntry {
  id:   string
  text: string
}

export const BENEFITS: BenefitEntry[] = [
  { id: 'b-01', text: 'I negotiate your rate before anything gets booked — not after the fact' },
  { id: 'b-02', text: 'I check broker payment history before committing your truck to any load' },
  { id: 'b-03', text: 'I chase detention when you are sitting at a dock — that money belongs to you' },
  { id: 'b-04', text: 'I handle the board so you stay focused on driving and making miles' },
  { id: 'b-05', text: 'every rate con gets reviewed before you sign anything' },
  { id: 'b-06', text: 'I keep a small roster on purpose — you get actual attention, not a ticket queue' },
  { id: 'b-07', text: 'I know which brokers are worth the call and which ones to skip entirely' },
  { id: 'b-08', text: 'I route you to minimize dead miles between loads' },
  { id: 'b-09', text: 'I stay on the phone when there is a problem on a load — I do not disappear' },
  { id: 'b-10', text: 'I target freight that keeps your wheels moving, not loads that leave your truck sitting' },
  { id: 'b-11', text: 'I track every load from pickup through payment so nothing falls through the cracks' },
  { id: 'b-12', text: 'consistent lanes, same broker relationships, fewer surprises week to week' },
  { id: 'b-13', text: 'I negotiate detention, TONU, and layover — not just the line haul rate' },
  { id: 'b-14', text: 'you keep driving, I handle every phone call that is not the road' },
  { id: 'b-15', text: 'I only book loads that actually make sense for your equipment and your home lane' },
]

// ── Outreach Template Library — 20 variable-based templates ───────────────────

export interface OutreachTemplate {
  id:           string
  driver_types: string[]   // empty = any driver type fits
  tone:         'direct' | 'conversational' | 'blunt' | 'question' | 'credibility'
  body:         string     // uses {driver_type} {lane_region} {rpm_range} {company_name} {pain_point} {benefit}
}

export const OUTREACH_TEMPLATES: OutreachTemplate[] = [
  {
    id: 'ot-01',
    driver_types: [],
    tone: 'direct',
    body: '{driver_type} operators — if {pain_point} is eating your time and your margin, that is a fixable problem.\n\n{benefit}. Everything else stays off your plate.\n\nIf you are running your own authority and want to see what your truck should actually be making, reach out.',
  },
  {
    id: 'ot-02',
    driver_types: [],
    tone: 'conversational',
    body: 'I talk to a lot of operators who are {pain_point}. Most of them have been doing it long enough that they just accept it as normal.\n\nIt is not normal. {benefit}. That is the job.\n\nIf that sounds like something that would actually help your operation, send me a message.',
  },
  {
    id: 'ot-03',
    driver_types: ['hotshot'],
    tone: 'direct',
    body: 'Hotshot operators — {company_name} has lanes that consistently move freight in the {lane_region}.\n\nRates have been running {rpm_range} RPM on the right loads. Not every load on the board — the ones I am specifically targeting for the operators I work with.\n\n{benefit}. If your gooseneck or flatdeck is sitting, let\'s talk.',
  },
  {
    id: 'ot-04',
    driver_types: [],
    tone: 'blunt',
    body: '{pain_point} costs you money. That is just the math.\n\nI handle that part so you do not have to. {benefit}.\n\nNo long pitch here. DM me your equipment and home state and we can have a straight conversation about whether this is a fit.',
  },
  {
    id: 'ot-05',
    driver_types: ['box truck'],
    tone: 'direct',
    body: 'Box truck and cargo van operators — there is real freight moving right now if you know where to look.\n\nThe {lane_region} has been solid for {driver_type} loads. Rates are at {rpm_range} RPM on the freight I am targeting.\n\n{benefit}. If your truck is available and you want consistent bookings, message me your home base.',
  },
  {
    id: 'ot-06',
    driver_types: [],
    tone: 'question',
    body: 'Quick question for {driver_type} operators: are you actually satisfied with what your truck is making right now?\n\nIf the honest answer is no — and you have been {pain_point} — there is usually a reason for that.\n\n{benefit}. That is a different model than what most dispatchers offer.',
  },
  {
    id: 'ot-07',
    driver_types: [],
    tone: 'credibility',
    body: '{company_name} works with a small number of carriers on purpose. The model only works if I can actually stay on top of your freight.\n\n{benefit}. That is not something I can pull off with 80 trucks on my board.\n\nIf you run {driver_type} and want to see what the {lane_region} should be paying you, DM me.',
  },
  {
    id: 'ot-08',
    driver_types: ['dry van', 'reefer'],
    tone: 'direct',
    body: 'Dry van and reefer operators — the {lane_region} is moving freight right now. Rates on the loads I am targeting are running {rpm_range} RPM.\n\n{benefit}.\n\nIf your trailer is available and you are tired of {pain_point}, reach out.',
  },
  {
    id: 'ot-09',
    driver_types: [],
    tone: 'blunt',
    body: 'A dispatcher takes a percentage of what your truck earns. So the only way that makes sense is if your truck earns more with me than without me.\n\n{benefit}. That is how I justify the fee.\n\nIf that math works for you, DM me.',
  },
  {
    id: 'ot-10',
    driver_types: ['flatbed', 'step deck'],
    tone: 'direct',
    body: 'Flatbed and step deck operators — specialized freight has been moving in the {lane_region}. Rates have been solid for drivers who know how to work it.\n\n{benefit}. I look for loads that actually fit the equipment, not just whatever is available on the board.\n\nIf you run flatbed or step deck and want to talk, DM me your home state.',
  },
  {
    id: 'ot-11',
    driver_types: [],
    tone: 'conversational',
    body: 'Had a conversation with a {driver_type} operator recently who had been {pain_point} for two years. He figured that was just how the business works.\n\nIt is not. {benefit}. It just takes having the right setup and the right broker contacts.\n\nIf any of that sounds familiar, send me a message.',
  },
  {
    id: 'ot-12',
    driver_types: [],
    tone: 'direct',
    body: 'Current rates on {driver_type} freight out of the {lane_region}: {rpm_range} RPM on loads I am actively booking this week.\n\n{benefit}.\n\nIf your truck is running the {lane_region} and you want more consistency in your bookings, DM me.',
  },
  {
    id: 'ot-13',
    driver_types: [],
    tone: 'question',
    body: 'When is the last time your dispatcher called you back within an hour when there was a problem on a load?\n\n{benefit}. That is not a selling point — that is the baseline of what dispatching is supposed to be.\n\nIf you run {driver_type} and you are not getting that, we should talk.',
  },
  {
    id: 'ot-14',
    driver_types: ['hotshot', 'box truck'],
    tone: 'blunt',
    body: '{driver_type} freight gets undervalued constantly because operators do not know what loads should actually pay in their lane.\n\nI know the rates. {benefit}.\n\nIf you are in the {lane_region} and your truck is sitting or running cheap, send me a message.',
  },
  {
    id: 'ot-15',
    driver_types: [],
    tone: 'credibility',
    body: '{company_name} runs {driver_type} freight in the {lane_region}.\n\nThe operators who work with me are not {pain_point}. That is because {benefit}.\n\nIf you want to see what your truck should actually be making on your lanes, reach out.',
  },
  {
    id: 'ot-16',
    driver_types: [],
    tone: 'direct',
    body: 'Open capacity right now for one or two {driver_type} operators in the {lane_region}.\n\n{benefit}. I am looking for drivers who run clean and want freight they can count on week to week.\n\nDM me your equipment and home state.',
  },
  {
    id: 'ot-17',
    driver_types: ['semi', 'dry van', 'reefer', 'flatbed'],
    tone: 'conversational',
    body: 'If you have been running your own authority for a while and {pain_point}, here is what usually causes that.\n\nMost operators do not have real broker relationships — they are at the mercy of whoever posted the load that day. {benefit}. That changes the leverage you have on every single call.\n\nIf you run {driver_type}, message me.',
  },
  {
    id: 'ot-18',
    driver_types: [],
    tone: 'blunt',
    body: 'The difference between a {driver_type} operator who clears {rpm_range} RPM consistently and one who does not is usually not the truck. It is the booking.\n\n{benefit}.\n\nIf you want your truck earning more, reach out.',
  },
  {
    id: 'ot-19',
    driver_types: [],
    tone: 'question',
    body: 'How do you decide which load to take right now? Load board price, urgency, or something more systematic?\n\nIf {pain_point} is part of the answer, that is a process problem. {benefit}.\n\nDM me if you run {driver_type} and want to fix that.',
  },
  {
    id: 'ot-20',
    driver_types: [],
    tone: 'credibility',
    body: 'I built {company_name} to fix one specific problem: {driver_type} operators leaving money on the table because they do not have the time or the broker contacts to get freight right.\n\n{benefit}. The {lane_region} has consistent freight for the right operator.\n\nIf that is you, send me a message.',
  },
]

// ── Page Post Templates — 5 distinct templates ────────────────────────────────

const PAGE_POST_TEMPLATES: string[] = [
  '{company_name} works with {driver_type} operators in the {lane_region}.\n\nWhat that means practically: I handle the load board, I negotiate the rate, I review every rate con before it gets signed, and I chase detention when brokers try to skip it. You drive.\n\nIf you are running {driver_type} freight and want consistent loads without spending half your day on the phone, reach out. DM this page or comment below with your equipment type and home state.',

  'Rates for {driver_type} freight in the {lane_region} have been running {rpm_range} RPM on the loads I have been targeting.\n\nI do not book every load — I book the ones that make sense for your equipment and your lanes. There is a real difference between those two things.\n\n{company_name} has open spots for a small number of new carriers right now. If you run {driver_type} and want to see what consistent bookings look like, send us a message.',

  'Working with {driver_type} operators at {company_name} — here is how it works.\n\nI take a small percentage of gross. In exchange: I am on the board daily, I negotiate before I book, I check broker payment history, and I do not disappear when something goes wrong on a load. That is the whole deal.\n\nIf that sounds better than what you have been getting, DM this page. I follow up same day.',

  'Most dispatchers take your money and send you load board links. That is not what {company_name} does.\n\n{driver_type} operators who work with me get: negotiated rates, vetted brokers, reviewed rate cons, and someone actually available when there is a problem. The {lane_region} has been solid for {driver_type} freight.\n\nIf your truck is available and you want to talk, send a message to this page.',

  'Quick note for {driver_type} operators in the {lane_region}: {company_name} has open spots for new carriers.\n\nI keep a small roster by design. Every operator gets actual attention — not a shared inbox and a form response. Rates on the loads I have been booking are running {rpm_range} RPM for the right freight.\n\nDM this page if you want to have a real conversation about whether this is a fit for your operation.',
]

// ── Humanization — word swap dictionary ──────────────────────────────────────

const WORD_SWAPS: Array<[RegExp, string]> = [
  [/\bright now\b/g, 'at the moment'],
  [/\bat the moment\b/g, 'right now'],
  [/\bconsistent freight\b/g, 'steady freight'],
  [/\bsteady freight\b/g, 'consistent freight'],
  [/\bbroker contacts\b/g, 'broker relationships'],
  [/\bbroker relationships\b/g, 'broker contacts'],
  [/\bequipment type\b/g, 'truck type'],
  [/\btruck type\b/g, 'equipment type'],
  [/\bhome state\b/g, 'home base'],
  [/\bhome base\b/g, 'home state'],
  [/\bDM me\b/g, 'message me'],
  [/\bmessage me\b/g, 'DM me'],
  [/\breach out\b/g, 'send me a message'],
  [/\bsend me a message\b/g, 'reach out'],
]

function applyWordSwaps(text: string, rng: () => number): string {
  let out = text
  for (const [pattern, replacement] of WORD_SWAPS) {
    if (rng() < 0.28) {
      out = out.replace(pattern, replacement)
    }
  }
  return out
}

// ── Variable substitution ─────────────────────────────────────────────────────

function fillVars(
  text: string,
  vars: OutreachVars,
  painPoint: string,
  benefit: string,
): string {
  return text
    .replace(/\{driver_type\}/g,   vars.driver_type)
    .replace(/\{lane_region\}/g,   vars.lane_region)
    .replace(/\{rpm_range\}/g,     vars.rpm_range)
    .replace(/\{company_name\}/g,  vars.company_name)
    .replace(/\{pain_point\}/g,    painPoint)
    .replace(/\{benefit\}/g,       benefit)
}

// ── Post assembly ─────────────────────────────────────────────────────────────

function assembleGroupPost(
  hook:       BankEntry,
  template:   OutreachTemplate,
  cta:        BankEntry,
  vars:       OutreachVars,
  painPoint:  PainPointEntry,
  benefit:    BenefitEntry,
  rng:        () => number,
): string {
  const hookText = pick(hook.variations, rng)
  const ctaText  = pick(cta.variations, rng)
  const filled   = fillVars(template.body, vars, painPoint.text, benefit.text)
  const combined = hookText + '\n\n' + filled + '\n\n' + ctaText
  return applyWordSwaps(combined, rng)
}

function assemblePagePost(
  template:  string,
  vars:      OutreachVars,
  painPoint: PainPointEntry,
  benefit:   BenefitEntry,
  rng:       () => number,
): string {
  const filled = fillVars(template, vars, painPoint.text, benefit.text)
  return applyWordSwaps(filled, rng)
}

// ── Main export: generateTodaysOutreach ───────────────────────────────────────

/**
 * Generates 5 group posts + 1 page post.
 * seedOffset: increment this when the user clicks "Regenerate" to get fresh posts same day.
 */
export function generateTodaysOutreach(
  vars:                    OutreachVars,
  recentlyUsedTemplateIds: Set<string>,
  seedOffset:              number = 0,
): OutreachResult {
  const today = new Date().toISOString().split('T')[0]
  const rng   = makePrng(dateToSeed(today, seedOffset))

  // Score templates: prefer unused, prefer matching driver type
  const driverLower = vars.driver_type.toLowerCase()
  const scored = OUTREACH_TEMPLATES.map(t => {
    let score = rng() * 8   // jitter for variety
    if (!recentlyUsedTemplateIds.has(t.id)) score += 20
    const typeMatch =
      t.driver_types.length === 0 ||
      t.driver_types.some(dt => driverLower.includes(dt) || dt.includes(driverLower))
    if (typeMatch) score += 10
    return { t, score }
  })
  scored.sort((a, b) => b.score - a.score)
  const templatePool = scored.map(s => s.t)

  // Pick 5 unique templates for group posts
  const groupTemplates = pickN(templatePool, 5, rng)

  // Pick unique hooks, CTAs, pain points, benefits
  const hooks      = pickN(HOOKS,        5, rng)
  const ctas       = pickN(CTAS,         5, rng)
  const painPoints = pickN(PAIN_POINTS,  5, rng)
  const benefits   = pickN(BENEFITS,     5, rng)

  // Assemble 5 group posts
  const group_posts: GeneratedPost[] = groupTemplates.map((template, i) => ({
    id:          `gp-${today}-${seedOffset}-${i}`,
    text:        assembleGroupPost(hooks[i], template, ctas[i], vars, painPoints[i], benefits[i], rng),
    template_id: template.id,
    hook_id:     hooks[i].id,
    cta_id:      ctas[i].id,
    type:        'group' as const,
  }))

  // Assemble 1 page post
  const pageTemplate = pick(PAGE_POST_TEMPLATES, rng)
  const pagePP       = pick(PAIN_POINTS,         rng)
  const pageBenefit  = pick(BENEFITS,            rng)
  const page_post: GeneratedPost = {
    id:          `pp-${today}-${seedOffset}`,
    text:        assemblePagePost(pageTemplate, vars, pagePP, pageBenefit, rng),
    template_id: 'page-post',
    hook_id:     '',
    cta_id:      '',
    type:        'page' as const,
  }

  return { group_posts, page_post, generated_at: new Date().toISOString() }
}

// ── Weekly AI refresh reminder ────────────────────────────────────────────────

const REFRESH_LS_KEY = 'outreach_last_ai_refresh'

export function getWeeklyRefreshState(): {
  needsRefresh: boolean
  daysSince:    number | null
  lastDate:     string | null
} {
  try {
    const raw = localStorage.getItem(REFRESH_LS_KEY)
    if (!raw) return { needsRefresh: true, daysSince: null, lastDate: null }
    const days = Math.floor((Date.now() - new Date(raw).getTime()) / 86400000)
    return {
      needsRefresh: days >= 7,
      daysSince:    days,
      lastDate:     raw.split('T')[0],
    }
  } catch {
    return { needsRefresh: false, daysSince: null, lastDate: null }
  }
}

export function markAiRefreshDone(): void {
  try {
    localStorage.setItem(REFRESH_LS_KEY, new Date().toISOString())
  } catch { /* ignore */ }
}

// ── Performance helpers ───────────────────────────────────────────────────────

/**
 * Given the raw post log, compute a success score per template_id.
 * Score = (replies * 1) + (leads * 3). Higher = better.
 */
export function computeTemplateScores(
  postLog: Array<{ template_id: string; replies_count: number; leads_generated: number }>,
): Map<string, number> {
  const map = new Map<string, number>()
  for (const entry of postLog) {
    const prev = map.get(entry.template_id) ?? 0
    map.set(entry.template_id, prev + entry.replies_count + entry.leads_generated * 3)
  }
  return map
}

/**
 * Compute a group success score from its tracked metrics.
 * Combines leads generated and signed drivers.
 */
export function groupSuccessScore(leadsGeneratedCount: number, signedDriversCount: number): number {
  return leadsGeneratedCount + signedDriversCount * 5
}
