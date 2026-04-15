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
      'Looking for {driver_type} operators who actually want consistent freight. Not everybody does.',
      'If you run {driver_type} and you\'re tired of chasing loads yourself, keep reading.',
    ],
  },
  {
    id: 'h-02',
    variations: [
      'Dispatcher here. Got open {driver_type} capacity in the {lane_region} if anyone needs it.',
      'I\'ve got {driver_type} lanes open in the {lane_region}. Truck sitting? Message me.',
    ],
  },
  {
    id: 'h-03',
    variations: [
      'Most dispatch services hand you a load board login and call it a day. That\'s not dispatching.',
      'Real talk — a lot of these dispatch services are just sending you DAT links. That\'s it. That\'s the whole service.',
    ],
  },
  {
    id: 'h-04',
    variations: [
      'How many hours a week are you doing your own dispatching? Be honest.',
      'Be real with yourself — how much time are you losing on the load board every week?',
    ],
  },
  {
    id: 'h-05',
    variations: [
      'You didn\'t get your authority to spend half the week on a load board.',
      'Got your authority to drive and make money. Not to sit on hold with brokers.',
    ],
  },
  {
    id: 'h-06',
    variations: [
      'Working with {driver_type} operators right now. Got freight if your truck\'s available.',
      'Need {driver_type} capacity in the {lane_region}. If you\'re sitting, hit me up.',
    ],
  },
  {
    id: 'h-07',
    variations: [
      '{driver_type} out of the {lane_region} has been running {rpm_range} RPM. Not on every load but on the right ones.',
      'Rates in the {lane_region} — {rpm_range} RPM for {driver_type} right now. That\'s what I\'m seeing.',
    ],
  },
  {
    id: 'h-08',
    variations: [
      'Short driver list, real broker relationships. That\'s the whole model.',
      'I don\'t take on 80 trucks. Small roster on purpose. You actually get my time.',
    ],
  },
  {
    id: 'h-09',
    variations: [
      'New authority? You\'re going to get low-balled constantly until you know which brokers are actually worth the call.',
      'Just got your authority? Good. Now learn which brokers pay slow before you find out the hard way.',
    ],
  },
  {
    id: 'h-10',
    variations: [
      'The load board isn\'t a strategy. It\'s a race to whoever takes the lowest rate.',
      'Posting your truck and waiting isn\'t a business plan. It\'s just hoping.',
    ],
  },
  {
    id: 'h-11',
    variations: [
      'Shopping for a dispatcher for your {driver_type}? Here\'s what actually matters.',
      '{driver_type} operator looking for dispatch help — a few things worth knowing first.',
    ],
  },
  {
    id: 'h-12',
    variations: [
      'I pull broker payment history before I book anything. Some of these guys pay in 45 days. Hard pass.',
      'Not all brokers pay on time. I check before committing your truck. That\'s just basic.',
    ],
  },
  {
    id: 'h-13',
    variations: [
      'Detention pay. Most dispatchers let it go. I don\'t. That\'s your money.',
      'I chase detention. Most dispatchers don\'t even bring it up. Difference.',
    ],
  },
  {
    id: 'h-14',
    variations: [
      'Got a spot opening up for one more {driver_type} operator in the {lane_region}.',
      'Taking on one more {driver_type} right now. Running the {lane_region}.',
    ],
  },
  {
    id: 'h-15',
    variations: [
      'If your dispatcher isn\'t negotiating the rate, they\'re just booking it. Not the same thing.',
      'Booking a load and negotiating a load are two different jobs. Most dispatchers only do the first one.',
    ],
  },
  {
    id: 'h-16',
    variations: [
      'What\'s your average RPM right now? If it\'s under {rpm_range} on {driver_type}, something\'s off.',
      'If you\'re running {driver_type} and averaging under {rpm_range} RPM, that\'s a problem worth fixing.',
    ],
  },
  {
    id: 'h-17',
    variations: [
      'Anyone running {driver_type} freight out of the {lane_region}? Got something that might work.',
      '{driver_type} operators in the {lane_region} — I may have capacity for one more.',
    ],
  },
  {
    id: 'h-18',
    variations: [
      'The hours you spend dispatching yourself aren\'t free. They cost you miles.',
      'Doing your own dispatching while also driving is costing you more than my fee. Every time.',
    ],
  },
  {
    id: 'h-19',
    variations: [
      'I work with a handful of carriers. Not a hundred. You actually get attention.',
      'Small list on purpose. I know every driver I work with by name. Can\'t do that with 80 trucks.',
    ],
  },
  {
    id: 'h-20',
    variations: [
      '{driver_type} freight is moving. I\'ve got broker contacts looking for capacity.',
      'Got {driver_type} loads available this week. I\'ve got the contacts — just need the truck.',
    ],
  },
]

// ── CTA Bank — 15 CTAs, 2 variations each ────────────────────────────────────

export const CTAS: BankEntry[] = [
  {
    id: 'cta-01',
    variations: [
      'DM me. Equipment type and home state. That\'s it.',
      'Message me with what you\'re running and where you\'re based.',
    ],
  },
  {
    id: 'cta-02',
    variations: [
      'Drop your truck type in the comments and I\'ll reach out.',
      'Comment below. I check this.',
    ],
  },
  {
    id: 'cta-03',
    variations: [
      'DM me directly. I\'m usually back within a few hours.',
      'Send me a message. I don\'t let these sit.',
    ],
  },
  {
    id: 'cta-04',
    variations: [
      'Want to talk numbers? DM me.',
      'If the rate conversation matters to you, message me and we\'ll go through it.',
    ],
  },
  {
    id: 'cta-05',
    variations: [
      'No pitch. Just a real conversation. DM me.',
      'Message me. I don\'t do sales calls — just straight talk about whether this makes sense.',
    ],
  },
  {
    id: 'cta-06',
    variations: [
      'DM me your truck and lanes. I\'ll tell you what you should be making.',
      'Send me your equipment and home lanes. I\'ll give you a straight answer on what the freight should pay.',
    ],
  },
  {
    id: 'cta-07',
    variations: [
      'Want to see how it works before you commit to anything? DM me.',
      'No commitment. Just message me if you want more detail.',
    ],
  },
  {
    id: 'cta-08',
    variations: [
      'Truck available? Message me now.',
      'If you\'ve got capacity, hit me up.',
    ],
  },
  {
    id: 'cta-09',
    variations: [
      'DM me or drop something in the comments. I check both.',
      'Comment here or message me. Either way works.',
    ],
  },
  {
    id: 'cta-10',
    variations: [
      'Message me your home base and what you\'re running. I\'ll follow up same day.',
      'DM me your state and equipment. I\'ll get back to you today.',
    ],
  },
  {
    id: 'cta-11',
    variations: [
      'No obligation. Just a conversation. Message me.',
      'Not asking you to sign anything. Just DM me and we\'ll talk.',
    ],
  },
  {
    id: 'cta-12',
    variations: [
      'Comment "interested" and I\'ll reach out.',
      'Drop "interested" below. I\'ll DM you.',
    ],
  },
  {
    id: 'cta-13',
    variations: [
      'Got questions? DM me. I\'ll give you straight answers.',
      'Message me with questions. I don\'t dodge them.',
    ],
  },
  {
    id: 'cta-14',
    variations: [
      'Message me. If it\'s not a fit, I\'ll say that too.',
      'DM me. If it doesn\'t make sense for you I\'ll be upfront about it.',
    ],
  },
  {
    id: 'cta-15',
    variations: [
      'DM me and we\'ll figure out pretty quick if this works for your operation.',
      'Send me a message. Takes about 5 minutes to know if it\'s a fit.',
    ],
  },
]

// ── Pain Point Bank — 15 entries ──────────────────────────────────────────────

interface PainPointEntry {
  id:   string
  text: string
}

export const PAIN_POINTS: PainPointEntry[] = [
  { id: 'pp-01', text: 'burning 3-4 hours a day on the load board just to keep the truck from sitting' },
  { id: 'pp-02', text: 'taking whatever rate the broker posts because you don\'t know if it\'s negotiable' },
  { id: 'pp-03', text: 'delivering a load and then not hearing from the broker again' },
  { id: 'pp-04', text: 'sitting at a dock for 3 hours and never seeing a dime in detention' },
  { id: 'pp-05', text: 'taking a load just to get home and ending up stuck somewhere worse' },
  { id: 'pp-06', text: 'having a problem on a load and your dispatcher going quiet' },
  { id: 'pp-07', text: 'finding out a broker pays in 45-60 days after you\'ve already run the load' },
  { id: 'pp-08', text: 'trying to drive and dispatch at the same time and doing both badly' },
  { id: 'pp-09', text: 'running decent one week and then scrambling to find something the next' },
  { id: 'pp-10', text: 'missing a good load because you were behind the wheel when you needed to be on the phone' },
  { id: 'pp-11', text: 'signing a rate con that doesn\'t match what the broker said on the call' },
  { id: 'pp-12', text: 'not having enough broker contacts to push back when someone low-balls you' },
  { id: 'pp-13', text: 'running 200 miles empty just to get under a load that barely covers fuel' },
  { id: 'pp-14', text: 'solid week, then nothing — no pipeline, no consistency' },
  { id: 'pp-15', text: 'paying a dispatch fee every week to someone who sends you DAT links and disappears' },
]

// ── Benefit Bank — 15 entries ─────────────────────────────────────────────────

interface BenefitEntry {
  id:   string
  text: string
}

export const BENEFITS: BenefitEntry[] = [
  { id: 'b-01', text: 'I negotiate the rate before I book it — not after you\'ve already agreed to it' },
  { id: 'b-02', text: 'I pull broker payment history before your truck goes anywhere near their load' },
  { id: 'b-03', text: 'if you\'re sitting at a dock, I\'m on the phone chasing detention — that\'s your money' },
  { id: 'b-04', text: 'I\'m on the board so you can stay on the road' },
  { id: 'b-05', text: 'I read every rate con before you sign it. Every one.' },
  { id: 'b-06', text: 'small roster on purpose — you\'re not getting ignored while I juggle 80 other trucks' },
  { id: 'b-07', text: 'I know which brokers are worth picking up for and which ones to let go to voicemail' },
  { id: 'b-08', text: 'I try to route you so you\'re not burning 200 miles empty between loads' },
  { id: 'b-09', text: 'something goes wrong on a load — I\'m still on the phone. I don\'t go quiet.' },
  { id: 'b-10', text: 'I\'m looking for loads that keep you moving, not ones that leave you sitting at a receiver for 6 hours' },
  { id: 'b-11', text: 'I track the load from pickup to payment — nothing gets lost in the cracks' },
  { id: 'b-12', text: 'same lanes, same brokers, predictable weeks — less of the feast-or-famine thing' },
  { id: 'b-13', text: 'detention, TONU, layover — I go after all of it, not just the line haul' },
  { id: 'b-14', text: 'you drive. I handle the calls, the board, and anything that comes up on the load.' },
  { id: 'b-15', text: 'I\'m not just booking what\'s available — I\'m booking what actually makes sense for your truck and your lanes' },
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
    body: '{driver_type} operators — {pain_point} is a fixable problem. Most people just don\'t fix it.\n\n{benefit}. You drive, everything else is mine to handle.\n\nIf you\'re running your own authority and want to know what your truck should actually be clearing, reach out.',
  },
  {
    id: 'ot-02',
    driver_types: [],
    tone: 'conversational',
    body: 'I talk to operators every week who are {pain_point}. Most of them have been doing it so long they just think that\'s how the industry works.\n\nIt\'s not. {benefit}. That\'s literally what I\'m supposed to be doing.\n\nIf that sounds familiar, send me a message.',
  },
  {
    id: 'ot-03',
    driver_types: ['hotshot'],
    tone: 'direct',
    body: 'Hotshot operators — I\'ve got lanes in the {lane_region} that move freight consistently.\n\nNot every load on the board. The ones I\'m specifically targeting. Rates have been at {rpm_range} RPM on those loads.\n\n{benefit}. Gooseneck or flatdeck sitting? Let\'s talk.',
  },
  {
    id: 'ot-04',
    driver_types: [],
    tone: 'blunt',
    body: '{pain_point}. That\'s just lost money.\n\n{benefit}. That\'s the deal.\n\nNo long explanation. DM me your equipment and home state and we\'ll figure out in about 10 minutes whether this makes sense.',
  },
  {
    id: 'ot-05',
    driver_types: ['box truck'],
    tone: 'direct',
    body: 'Box truck and cargo van operators — there\'s freight moving in the {lane_region} if you know where to look.\n\nI\'ve been running {driver_type} loads out of there at {rpm_range} RPM on the right bookings. {benefit}.\n\nTruck available? Message me your home base.',
  },
  {
    id: 'ot-06',
    driver_types: [],
    tone: 'question',
    body: 'Honest question for {driver_type} operators: is your truck actually making what it should be?\n\nIf you\'ve been {pain_point} and you\'re not sure why — there\'s usually a reason.\n\n{benefit}. That\'s a different setup than most dispatchers run.',
  },
  {
    id: 'ot-07',
    driver_types: [],
    tone: 'credibility',
    body: '{company_name} keeps a short driver list on purpose. I can\'t do this job right with 80 trucks on my board.\n\n{benefit}. Can\'t do that at scale.\n\nIf you run {driver_type} and want to know what the {lane_region} should actually be paying you, DM me.',
  },
  {
    id: 'ot-08',
    driver_types: ['dry van', 'reefer'],
    tone: 'direct',
    body: 'Dry van and reefer operators — {lane_region} freight is moving. I\'m seeing {rpm_range} RPM on the loads I\'m targeting.\n\n{benefit}.\n\nTired of {pain_point}? Trailer available? Reach out.',
  },
  {
    id: 'ot-09',
    driver_types: [],
    tone: 'blunt',
    body: 'A dispatcher takes a cut of what your truck earns. So the only way that\'s worth it is if you\'re clearing more with them than without them.\n\n{benefit}. That\'s how I justify the percentage.\n\nIf that math works for you, DM me.',
  },
  {
    id: 'ot-10',
    driver_types: ['flatbed', 'step deck'],
    tone: 'direct',
    body: 'Flatbed and step deck — specialized freight has been moving in the {lane_region}. Decent rates for operators who know how to work it.\n\n{benefit}. I\'m not just grabbing whatever\'s on the board — I\'m finding loads that fit the equipment.\n\nRun flatbed or step deck? DM me your home state.',
  },
  {
    id: 'ot-11',
    driver_types: [],
    tone: 'conversational',
    body: 'Talked to a {driver_type} operator not long ago who\'d been {pain_point} for two years straight. Thought that was just the job.\n\nIt\'s not. {benefit}. Takes having the right setup and the right contacts.\n\nIf any of that sounds like your situation, send me a message.',
  },
  {
    id: 'ot-12',
    driver_types: [],
    tone: 'direct',
    body: '{driver_type} out of the {lane_region} — I\'m actively booking loads this week at {rpm_range} RPM.\n\n{benefit}.\n\nTruck running that lane? Want it to be more consistent? DM me.',
  },
  {
    id: 'ot-13',
    driver_types: [],
    tone: 'question',
    body: 'Last time you had a problem on a load — how long did it take your dispatcher to call you back?\n\n{benefit}. That\'s not a bonus feature. That\'s the job.\n\nIf you run {driver_type} and you\'re not getting that, we should talk.',
  },
  {
    id: 'ot-14',
    driver_types: ['hotshot', 'box truck'],
    tone: 'blunt',
    body: '{driver_type} freight gets undervalued all the time because operators don\'t know what it should pay in their lane. Brokers know you don\'t know. They act accordingly.\n\nI know the rates. {benefit}.\n\nIn the {lane_region} and running cheap? Message me.',
  },
  {
    id: 'ot-15',
    driver_types: [],
    tone: 'credibility',
    body: '{company_name} runs {driver_type} freight in the {lane_region}.\n\nThe operators I work with aren\'t {pain_point}. That\'s because {benefit}.\n\nWant to know what your truck should actually be making? Reach out.',
  },
  {
    id: 'ot-16',
    driver_types: [],
    tone: 'direct',
    body: 'Got room for one or two more {driver_type} operators in the {lane_region}.\n\n{benefit}. Looking for drivers who run clean and want something they can count on week to week. Not everyone does — and that\'s fine.\n\nDM me your equipment and home state.',
  },
  {
    id: 'ot-17',
    driver_types: ['semi', 'dry van', 'reefer', 'flatbed'],
    tone: 'conversational',
    body: 'If you\'ve been running your own authority for a while and you\'re still {pain_point} — here\'s what\'s usually happening.\n\nMost operators don\'t have actual broker relationships. They\'re just taking what\'s posted. {benefit}. Changes every conversation you have with a broker.\n\nRun {driver_type}? Message me.',
  },
  {
    id: 'ot-18',
    driver_types: [],
    tone: 'blunt',
    body: 'The difference between a {driver_type} operator clearing {rpm_range} RPM and one who isn\'t? Usually not the truck. Usually the booking.\n\n{benefit}.\n\nWant your truck earning more? Reach out.',
  },
  {
    id: 'ot-19',
    driver_types: [],
    tone: 'question',
    body: 'How are you deciding which loads to take right now? Price on the board? Urgency? Something else?\n\nIf {pain_point} is part of the answer, that\'s a process problem — not a truck problem. {benefit}.\n\nRun {driver_type} and want to fix it? DM me.',
  },
  {
    id: 'ot-20',
    driver_types: [],
    tone: 'credibility',
    body: 'Built {company_name} because I kept seeing the same thing — {driver_type} operators leaving money on the table. Not because they couldn\'t drive. Because {pain_point}.\n\n{benefit}. The {lane_region} has consistent freight for the right operator.\n\nIf that\'s you, send me a message.',
  },
]

// ── Page Post Templates — 5 distinct templates ────────────────────────────────

const PAGE_POST_TEMPLATES: string[] = [
  '{company_name} works with {driver_type} operators in the {lane_region}.\n\nHow it works: I\'m on the board every day finding loads, I negotiate the rate before anything gets booked, I go through every rate con before you sign it, and I chase detention when a broker tries to let it slide. You drive. That\'s the split.\n\nIf you\'re running {driver_type} and you\'re tired of doing all of this yourself, DM this page or drop your equipment type and home state in the comments.',

  '{driver_type} freight out of the {lane_region} has been running {rpm_range} RPM on the loads I\'ve been targeting. Not every load — the right loads.\n\nI don\'t just book whatever\'s available. I book what actually makes sense for the equipment and the lane. There\'s a difference, and it shows up in your weekly gross.\n\n{company_name} has a few open spots right now. If you run {driver_type} and want to see what consistent booking looks like, send us a message.',

  'Here\'s how working with {company_name} actually works.\n\nI take a percentage of gross — that\'s the arrangement. In exchange, I\'m on the board daily, I negotiate before I book, I check broker payment history before committing your truck, and I don\'t disappear when something goes sideways on a load. That\'s the whole deal.\n\nIf that sounds better than what you\'ve got now, DM this page. I follow up same day.',

  'Most dispatch services hand you a load board login and call it dispatching. That\'s not what {company_name} does.\n\n{driver_type} operators I work with get actual negotiation on every load, brokers vetted before booking, rate cons reviewed, and someone picking up the phone when there\'s a problem. The {lane_region} has been solid for {driver_type} freight.\n\nTruck available? Want to talk? Message this page.',

  '{driver_type} operators in the {lane_region} — {company_name} has a couple open spots for new carriers.\n\nSmall roster on purpose. I can\'t do this job right with 80 trucks. Rates on what I\'ve been booking are running {rpm_range} RPM for the right freight — not every load on the board, the ones worth taking.\n\nIf you want a real conversation about whether this is a fit, DM this page.',
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
