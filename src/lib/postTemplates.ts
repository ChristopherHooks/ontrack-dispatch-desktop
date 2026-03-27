/**
 * Post template library for OnTrack Marketing tab.
 * Templates are hardcoded — zero API calls, zero cost.
 * [COMPANY] is substituted at render time with the company name from settings.
 *
 * Rules:
 * - No emojis — ever
 * - Natural, human tone — no bullet lists with symbols, no hype language
 * - Enough variety for 90+ days without repeating (98 templates total)
 * - Mix of short-form (1-3 sentences), medium (2-3 short paragraphs), and question posts
 * - First-person where appropriate — sounds like a person, not a company
 * - Direct CTAs: "DM me directly" beats "send us a message"
 */

export type PostCategory =
  | 'Driver Recruitment'
  | 'Value Prop'
  | 'Engagement'
  | 'New Authority'
  | 'Trust'
  | 'Freight Market'
  | 'Dry Van'
  | 'Reefer'
  | 'Flatbed'
  | 'Step Deck'
  | 'Hotshot'
  | 'Hot Lanes'

export interface PostTemplate {
  id:       string
  category: PostCategory
  bestFor:  string
  text:     string
  hashtags: string[]
}

export const POST_TEMPLATES: PostTemplate[] = [

  // ── Driver Recruitment (16) ────────────────────────────────────────────────

  // Short-form direct openers (Facebook-native format)
  {
    id: 'rec-01',
    category: 'Driver Recruitment',
    bestFor: 'Facebook — Owner Operator Groups',
    text: `Dispatcher here. Looking for owner-operators with dry van, flatbed, reefer, or hotshot equipment who want consistent loads without spending half their day on the phone with brokers.\n\nIf that is you, DM me your equipment type and home state and I will tell you exactly what your truck should be earning on your lanes.`,
    hashtags: ['#owneroperator', '#trucking', '#dispatch', '#freightlife'],
  },
  {
    id: 'rec-02',
    category: 'Driver Recruitment',
    bestFor: 'Facebook — Owner Operator Groups',
    text: `Running your own authority and doing your own dispatching? How many hours a week does that actually cost you?\n\nMost of the operators I talk to say somewhere between 5 and 10 hours. That is time off the road. DM me if you want to talk about getting those hours back.`,
    hashtags: ['#owneroperator', '#dispatch', '#trucking', '#truckingbusiness'],
  },
  {
    id: 'rec-03',
    category: 'Driver Recruitment',
    bestFor: 'Facebook — Owner Operator Groups',
    text: `[COMPANY] has capacity for a small number of new carriers right now.\n\nWe work with dry van, flatbed, reefer, step deck, and hotshot operators. New and established authorities both welcome. What we are looking for: someone who runs clean and wants consistent freight.\n\nDM me your equipment type and home state. I will follow up the same day.`,
    hashtags: ['#owneroperator', '#dispatch', '#trucking', '#dryvan', '#hotshot'],
  },
  {
    id: 'rec-04',
    category: 'Driver Recruitment',
    bestFor: 'Facebook — Owner Operator Groups',
    text: `Real talk: a lot of dispatch services send you load board links and call it dispatching.\n\nThat is not what [COMPANY] does. I am on the phone negotiating your rate, checking broker payment history before booking, chasing detention when you are stuck at a dock, and making sure the rate con is right before anything gets signed.\n\nIf you have been through a dispatcher who did not do those things, I understand why you are skeptical. DM me and I will walk you through exactly how we work.`,
    hashtags: ['#owneroperator', '#dispatch', '#trucking', '#truckdriver'],
  },
  {
    id: 'rec-05',
    category: 'Driver Recruitment',
    bestFor: 'Facebook — Owner Operator Groups',
    text: `You got your authority to make money driving, not to spend three hours a day fighting load boards.\n\n[COMPANY] handles the board work. You handle the miles. DM me with your equipment type and where you are based.`,
    hashtags: ['#owneroperator', '#dispatch', '#trucking', '#loadboard'],
  },
  {
    id: 'rec-06',
    category: 'Driver Recruitment',
    bestFor: 'Facebook — Owner Operator Groups',
    text: `The carriers who build something real out of their own authority all have one thing in common: they stopped trying to do every job themselves.\n\n[COMPANY] handles the freight side. You focus on running the truck. DM me if you want to know what that actually looks like in practice.`,
    hashtags: ['#owneroperator', '#dispatch', '#trucking', '#truckingbusiness'],
  },
  {
    id: 'rec-07',
    category: 'Driver Recruitment',
    bestFor: 'Facebook — Owner Operator Groups',
    text: `Owner-operators: what does your weekly gross look like right now versus what you expected when you got your authority?\n\nIf the gap is bigger than you want it to be, that is worth a conversation. DM me your equipment type and lanes and I will tell you what the market is actually paying right now.`,
    hashtags: ['#owneroperator', '#trucking', '#dispatch', '#rpm'],
  },
  {
    id: 'rec-08',
    category: 'Driver Recruitment',
    bestFor: 'Facebook — Owner Operator Groups',
    text: `Quick math on dispatch fees: if [COMPANY] helps you average 20 cents more per mile and you run 8,000 miles a month, that is $1,600 extra gross. Our fee at 7 percent is about $210. Net gain: nearly $1,400 a month.\n\nAnd that is just rate improvement. The time savings are on top of that. DM me if you want to run the numbers for your specific setup.`,
    hashtags: ['#owneroperator', '#dispatch', '#truckingbusiness', '#rpm'],
  },
  {
    id: 'rec-09',
    category: 'Driver Recruitment',
    bestFor: 'Facebook — CDL and Trucking Groups',
    text: `Dispatcher here — [COMPANY] is accepting new carriers.\n\nEquipment: dry van, flatbed, reefer, step deck, hotshot. Authorities: new and established both welcome. What I need from you: run clean, communicate on the road, let me handle the freight side.\n\nDM me your truck type and home state.`,
    hashtags: ['#owneroperator', '#dispatch', '#trucking', '#dryvan', '#flatbed', '#reefer'],
  },
  {
    id: 'rec-10',
    category: 'Driver Recruitment',
    bestFor: 'Facebook — Owner Operator Groups',
    text: `If your current dispatcher is just forwarding you load board links, you do not have a dispatcher. You have a subscription you are paying 10 percent for.\n\n[COMPANY] negotiates every load. DM me if you want to see the difference.`,
    hashtags: ['#owneroperator', '#dispatch', '#trucking', '#truckingbusiness'],
  },
  // Box Truck short-form (high-performing format for box truck groups)
  {
    id: 'rec-11',
    category: 'Driver Recruitment',
    bestFor: 'Facebook — Box Truck Groups',
    text: `Dispatcher here. I need box truck operators for consistent daily loads. If your truck is sitting more than it should, send me a message on messenger with your truck size and where you are based.`,
    hashtags: ['#boxtruck', '#cargovan', '#dispatch', '#trucking'],
  },
  {
    id: 'rec-12',
    category: 'Driver Recruitment',
    bestFor: 'Facebook — Box Truck Groups',
    text: `Looking to add box truck operators to our dispatch roster right now. I have daily freight and I am short on capacity. Pay is honest, loads are consistent, and I handle all the broker calls so you stay on the road.\n\nDM me with your truck size and where you are based.`,
    hashtags: ['#boxtruck', '#boxtruckowner', '#dispatch', '#trucking'],
  },
  {
    id: 'rec-13',
    category: 'Driver Recruitment',
    bestFor: 'Facebook — Box Truck and Cargo Van Groups',
    text: `[COMPANY] has capacity for a limited number of new box truck and cargo van operators. Loads run consistently Monday through Friday. DM me your truck size and home state and I will tell you what we have available on your lane.`,
    hashtags: ['#cargovan', '#boxtruck', '#dispatch', '#truckdriver'],
  },
  {
    id: 'rec-14',
    category: 'Driver Recruitment',
    bestFor: 'Facebook — Box Truck and Cargo Van Groups',
    text: `Dispatcher looking for box truck and sprinter van operators. I negotiate your rates, handle all shipper and broker communication, and make sure you are not sitting empty between loads.\n\nYou drive. I handle everything else. DM me your equipment size and home state.`,
    hashtags: ['#boxtruck', '#sprintervan', '#dispatch', '#owneroperator'],
  },
  {
    id: 'rec-15',
    category: 'Driver Recruitment',
    bestFor: 'Facebook — Box Truck Groups',
    text: `Box truck operators: if your truck is not running as much as it should be, that is worth 5 minutes of your time. DM me directly and I will walk you through exactly what [COMPANY] has available on your lane right now.`,
    hashtags: ['#boxtruck', '#boxtruckowner', '#dispatch', '#trucking'],
  },
  {
    id: 'rec-16',
    category: 'Driver Recruitment',
    bestFor: 'Facebook — Box Truck Groups',
    text: `Need reliable box truck operators. I am a dispatcher with consistent freight in multiple corridors and I have capacity for new drivers right now. If you run a 16, 20, or 26-foot box truck and want steady work, message me here.`,
    hashtags: ['#boxtruck', '#dispatch', '#trucking', '#owneroperator'],
  },

  // ── Value Prop (8) ─────────────────────────────────────────────────────────
  {
    id: 'val-01',
    category: 'Value Prop',
    bestFor: 'Facebook — Owner Operator Groups',
    text: `What does a dispatcher actually do? Here is the honest version.\n\nI search load boards and my direct broker network for freight that matches your equipment and lanes. I call brokers and negotiate — not just take the first number. I review the rate con before it goes to you. I handle shipper and receiver communication while you are on the road. I chase detention when you are stuck at a dock.\n\nThat is [COMPANY] on every load, not just occasionally.`,
    hashtags: ['#dispatch', '#owneroperator', '#trucking', '#truckingbusiness'],
  },
  {
    id: 'val-02',
    category: 'Value Prop',
    bestFor: 'Facebook — Owner Operator Groups',
    text: `If your dispatcher is not getting you better rates than you would get calling brokers cold, they are not earning their percentage. That is just math.\n\n[COMPANY] charges 7 percent. What you get back in better rates, less deadhead, and time savings should more than cover that. If it does not, I have not done my job. DM me and let me show you what that looks like for your lanes.`,
    hashtags: ['#owneroperator', '#dispatch', '#truckingbusiness', '#rpm'],
  },
  {
    id: 'val-03',
    category: 'Value Prop',
    bestFor: 'Facebook — Owner Operator Groups',
    text: `[COMPANY] does not take every load that crosses the board.\n\nI check broker payment history before booking. I pass on loads that do not hit your rate floor. I flag any broker with a pattern of chargebacks or slow payment before your truck ever moves.\n\nYou will not find out after the fact that a broker takes 60 days to pay. That filtering happens upfront.`,
    hashtags: ['#owneroperator', '#dispatch', '#brokers', '#trucking'],
  },
  {
    id: 'val-04',
    category: 'Value Prop',
    bestFor: 'Facebook — Owner Operator Groups',
    text: `Rate per mile is only part of the picture. A high spot rate with a long deadhead and a slow broker is often worse than a slightly lower rate that routes your truck home and pays in 15 days.\n\n[COMPANY] looks at the whole trip when we evaluate a load, not just the number on the post.`,
    hashtags: ['#owneroperator', '#dispatch', '#rpm', '#trucking'],
  },
  {
    id: 'val-05',
    category: 'Value Prop',
    bestFor: 'Facebook — Owner Operator Groups',
    text: `When something goes sideways on a load — and sometimes it does — who handles it?\n\nWith [COMPANY], I am on the phone with the broker the moment there is an issue. Broken appointment, late pickup, detention that needs to be claimed — I manage all of it. You tell me what is happening from the cab, and I take it from there.`,
    hashtags: ['#dispatch', '#owneroperator', '#trucking', '#truckinglife'],
  },
  {
    id: 'val-06',
    category: 'Value Prop',
    bestFor: 'Facebook — Owner Operator Groups',
    text: `Consistent freight is more valuable than peak freight.\n\nA carrier running at $2.40 per mile every week with no gaps is usually in better shape than one who hits $3.20 occasionally but sits for two days in between. [COMPANY] focuses on load volume and consistency, not just the highest rate on any given day.`,
    hashtags: ['#owneroperator', '#dispatch', '#trucking', '#consistency'],
  },
  {
    id: 'val-07',
    category: 'Value Prop',
    bestFor: 'Facebook — Owner Operator Groups',
    text: `Knowing what a lane pays right now versus what it was paying six months ago is the difference between negotiating from a position of knowledge and just hoping for a good number.\n\nI track rates daily across the lanes my carriers run. That market knowledge belongs to every carrier who works with [COMPANY].`,
    hashtags: ['#dispatch', '#trucking', '#logistics', '#owneroperator'],
  },
  {
    id: 'val-08',
    category: 'Value Prop',
    bestFor: 'Facebook — Owner Operator Groups',
    text: `Five things [COMPANY] does that most dispatchers skip:\n\nNegotiate from DAT rate data, not from needing the load filled. Plan backhauls before committing to the outbound. Claim detention every single time, not just when it is easy. Route your truck home when possible. Check broker payment history before booking.\n\nDM me if you want to know what this looks like in practice for your equipment.`,
    hashtags: ['#owneroperator', '#dispatch', '#trucking', '#truckdriver'],
  },

  // ── Engagement (10) ────────────────────────────────────────────────────────
  {
    id: 'eng-01',
    category: 'Engagement',
    bestFor: 'Facebook — Owner Operator Groups',
    text: `Honest question for owner-operators in here: what is the one thing you wish was easier about running your own authority?\n\nFinding consistent loads? Dealing with brokers? Getting home on time? Something else? Drop it below — I read everything.`,
    hashtags: ['#owneroperator', '#trucking', '#truckinglife'],
  },
  {
    id: 'eng-02',
    category: 'Engagement',
    bestFor: 'Facebook — Owner Operator Groups',
    text: `Dispatcher or self-dispatch — what does this group prefer and why?\n\nI have my own take but I want to hear from carriers first. What has your experience been?`,
    hashtags: ['#owneroperator', '#dispatch', '#loadboard', '#trucking'],
  },
  {
    id: 'eng-03',
    category: 'Engagement',
    bestFor: 'Facebook — Owner Operator Groups',
    text: `For everyone who got their authority in the last 12 months: what do you know now that you wish someone had told you on day one?\n\nDrop it below. Let us help the newer folks skip some of the hard lessons.`,
    hashtags: ['#owneroperator', '#newauthority', '#trucking', '#truckingadvice'],
  },
  {
    id: 'eng-04',
    category: 'Engagement',
    bestFor: 'Facebook — Owner Operator Groups',
    text: `What is the worst broker experience you have had? I will share one of mine.\n\nA broker tried to charge back $400 for a supposed redelivery fee on a clean delivery with zero evidence. Took three weeks to reverse it. What is your worst one?`,
    hashtags: ['#owneroperator', '#brokers', '#trucking', '#freightbroker'],
  },
  {
    id: 'eng-05',
    category: 'Engagement',
    bestFor: 'Facebook — Owner Operator Groups',
    text: `Are you actually making what you thought you would when you got your authority?\n\nA lot of operators I talk to are working harder than ever and not seeing it in their take-home after fuel, insurance, and maintenance. What is the biggest factor causing the gap for you?`,
    hashtags: ['#owneroperator', '#trucking', '#truckingbusiness', '#dispatch'],
  },
  {
    id: 'eng-06',
    category: 'Engagement',
    bestFor: 'Facebook — Owner Operator Groups',
    text: `How long did it take before you felt like you had the business side of trucking figured out? Not the driving — the business. Knowing your cost per mile, managing cash flow between loads, dealing with slow-paying brokers. First year? Second year? Still working on it?`,
    hashtags: ['#owneroperator', '#truckingbusiness', '#trucking'],
  },
  {
    id: 'eng-07',
    category: 'Engagement',
    bestFor: 'Facebook — Owner Operator Groups',
    text: `Dry van carriers: what is your biggest challenge right now — finding consistent loads, getting above $2.50 a mile, minimizing deadhead, or managing cash flow between payments?\n\nDrop your answer below. I ask because the answers shape how I look for freight for the carriers I work with.`,
    hashtags: ['#dryvan', '#owneroperator', '#trucking', '#dispatch'],
  },
  {
    id: 'eng-08',
    category: 'Engagement',
    bestFor: 'Facebook — Owner Operator Groups',
    text: `If you could change one thing about how the trucking industry works right now, what would it be?\n\nRates, broker transparency, ELD rules, detention pay, fuel costs? I am genuinely curious what is on people's minds. Drop it below.`,
    hashtags: ['#trucking', '#owneroperator', '#truckinglife', '#freight'],
  },
  {
    id: 'eng-09',
    category: 'Engagement',
    bestFor: 'Facebook — Hotshot Groups',
    text: `Hotshot operators: what does your average rate per mile look like right now, and are you happy with it?\n\nJust asking because the answer varies a lot depending on region and freight type, and I am curious what this group is seeing.`,
    hashtags: ['#hotshot', '#owneroperator', '#trucking', '#rpm'],
  },
  {
    id: 'eng-10',
    category: 'Engagement',
    bestFor: 'Facebook — Owner Operator Groups',
    text: `What is one thing a dispatcher could do that would immediately make you trust them more?\n\nThis is something I think about a lot. Drop your answer below — I am taking notes.`,
    hashtags: ['#owneroperator', '#dispatch', '#trucking', '#trust'],
  },

  // ── New Authority (7) ──────────────────────────────────────────────────────
  {
    id: 'new-01',
    category: 'New Authority',
    bestFor: 'Facebook — New Authority and CDL Groups',
    text: `If you just got your MC number: the first 90 days are hard, and that is normal.\n\nYou are learning rates, figuring out which brokers are worth dealing with, and getting turned down because your authority is too new. That phase passes. The carriers who push through almost always make it. [COMPANY] works with new authorities specifically because we know how to help during that stretch.`,
    hashtags: ['#newauthority', '#owneroperator', '#trucking', '#newMC'],
  },
  {
    id: 'new-02',
    category: 'New Authority',
    bestFor: 'Facebook — New Authority and CDL Groups',
    text: `New authority tip that will save you time: get your COI formatted and ready to send before you start calling brokers.\n\nEvery broker requires it on file before they will move freight with you. They also need to be listed as the certificate holder, which means your insurance agent has to add them by name. That takes a day or two. Get ahead of it. [COMPANY] walks new carriers through this from day one.`,
    hashtags: ['#newauthority', '#owneroperator', '#trucking', '#insurance'],
  },
  {
    id: 'new-03',
    category: 'New Authority',
    bestFor: 'Facebook — New Authority and CDL Groups',
    text: `The most common mistake I see new carriers make: taking the first rate offered because they need the load.\n\nBrokers know new authorities are eager and some lowball specifically because of it. Know your minimum RPM before you call anyone. Or let [COMPANY] negotiate on your behalf — we know what your lane should pay.`,
    hashtags: ['#newauthority', '#owneroperator', '#trucking', '#dispatch'],
  },
  {
    id: 'new-04',
    category: 'New Authority',
    bestFor: 'Facebook — New Authority and CDL Groups',
    text: `"How do I get brokers to work with me when I have no track record?" — one of the most common questions I get from new carriers.\n\nHonest answer: you do not need a long track record. You need clean safety scores, proper insurance in place, a professional carrier packet ready to send, and someone who can introduce you the right way. That last part is where [COMPANY] makes a real difference.`,
    hashtags: ['#newauthority', '#owneroperator', '#trucking', '#dispatch'],
  },
  {
    id: 'new-05',
    category: 'New Authority',
    bestFor: 'Facebook — New Authority and CDL Groups',
    text: `New authority checklist before you book your first load: COI ready to send, carrier packet done, RMIS or Carrier411 profile set up, safety score reviewed on FMCSA, at least three brokers set up and approved.\n\nMissing any of these and you will hit delays at the worst time. [COMPANY] walks new carriers through all of it before the first load moves.`,
    hashtags: ['#newauthority', '#owneroperator', '#FMCSA', '#trucking'],
  },
  {
    id: 'new-06',
    category: 'New Authority',
    bestFor: 'Facebook — New Authority and CDL Groups',
    text: `New to your authority and feeling overwhelmed by the admin side? That is completely normal and it does not mean you made a mistake.\n\nThe business side of running a carrier operation is a full-time job on its own. That is exactly why dispatch exists. [COMPANY] helps new carriers skip the learning curve and start running profitably. DM me if you want to talk through where you are.`,
    hashtags: ['#newauthority', '#owneroperator', '#trucking', '#dispatch'],
  },
  {
    id: 'new-07',
    category: 'New Authority',
    bestFor: 'Facebook — New Authority and CDL Groups',
    text: `Six months into your authority is a good time to pull your CSA scores from the FMCSA portal and make sure everything looks clean.\n\nOne preventable violation in your first year can follow you for 24 months and cause certain brokers to hesitate. Better to catch it early. If you are not sure what your scores mean for your business, [COMPANY] is happy to walk through it with you.`,
    hashtags: ['#newauthority', '#CSA', '#FMCSA', '#owneroperator', '#trucking'],
  },

  // ── Trust (5) ──────────────────────────────────────────────────────────────
  {
    id: 'trust-01',
    category: 'Trust',
    bestFor: 'Facebook — Owner Operator Groups',
    text: `[COMPANY] keeps a small roster on purpose.\n\nI want to know your truck, your lanes, your home time needs, and what a good week actually looks like for you. That level of attention is only possible when I am not spread across 100 carriers. Small roster, real relationships.`,
    hashtags: ['#dispatch', '#owneroperator', '#trucking', '#truckingbusiness'],
  },
  {
    id: 'trust-02',
    category: 'Trust',
    bestFor: 'Facebook — Owner Operator Groups',
    text: `I have worked with enough brokers to know which ones pay in 30 days, which ones push to 45, and which ones are not worth the rate at any number.\n\nThat knowledge belongs to every carrier who works with [COMPANY]. You should not have to learn every lesson the hard way. I already learned most of them.`,
    hashtags: ['#dispatch', '#owneroperator', '#trucking', '#brokers'],
  },
  {
    id: 'trust-03',
    category: 'Trust',
    bestFor: 'Facebook — Owner Operator Groups',
    text: `You see every load offer before I book it. You approve every rate confirmation. No load gets booked without your sign-off.\n\nYour truck, your authority, your call — every time. [COMPANY] works for you, not the other way around.`,
    hashtags: ['#dispatch', '#owneroperator', '#trucking', '#transparency'],
  },
  {
    id: 'trust-04',
    category: 'Trust',
    bestFor: 'Facebook — Owner Operator Groups',
    text: `Our business grows when your business grows. That is not a talking point — it is the actual structure of how I get paid.\n\nIf I am not finding you better loads and better rates than you could get on your own, I have not earned my fee. That is the model at [COMPANY]. Simple and honest.`,
    hashtags: ['#dispatch', '#owneroperator', '#trucking'],
  },
  {
    id: 'trust-05',
    category: 'Trust',
    bestFor: 'Facebook — Owner Operator Groups',
    text: `I want to be upfront about how [COMPANY] works before you reach out.\n\nFlat 7 percent per load, no hidden fees. I negotiate every rate — I do not forward links and call it dispatching. You approve every load. I check broker payment history before booking anything. And I am reachable when something comes up on the road.\n\nIf that sounds like what you have been looking for, DM me.`,
    hashtags: ['#dispatch', '#owneroperator', '#trucking', '#transparency'],
  },

  // ── Freight Market (5) ────────────────────────────────────────────────────
  {
    id: 'mkt-01',
    category: 'Freight Market',
    bestFor: 'Facebook — Owner Operator Groups',
    text: `Dry van carriers: the midwest-to-southeast corridor has been one of the more consistent lanes for outbound freight. TX-IL, TN-OH, GA-MO — these are bread-and-butter routes with steady broker activity.\n\nIf you are running coastal and fighting for loads right now, it is worth knowing what other lanes are doing. [COMPANY] tracks rates on these corridors weekly. DM me if you want specifics on your lanes.`,
    hashtags: ['#dryvan', '#owneroperator', '#trucking', '#freight', '#lanes'],
  },
  {
    id: 'mkt-02',
    category: 'Freight Market',
    bestFor: 'Facebook — Owner Operator Groups',
    text: `Flatbed carriers: infrastructure and construction freight has held up better than general commodities in several markets. Steel, lumber, and building materials lanes have shown steadier rates than spot van freight during this cycle.\n\n[COMPANY] has broker connections in these categories. Message me if you want to know what your lanes are paying.`,
    hashtags: ['#flatbed', '#owneroperator', '#trucking', '#infrastructure'],
  },
  {
    id: 'mkt-03',
    category: 'Freight Market',
    bestFor: 'Facebook — Owner Operator Groups',
    text: `Load boards are not the only place to find freight, and they are often not the best place.\n\nTwo or three strong direct broker relationships change everything. Consistent volume, better rates, and you are not competing with 20 other carriers on every post. It takes longer to build those connections but the long-term payoff is real. [COMPANY] helps carriers identify and develop those relationships.`,
    hashtags: ['#freight', '#owneroperator', '#trucking', '#directbroker'],
  },
  {
    id: 'mkt-04',
    category: 'Freight Market',
    bestFor: 'Facebook — Owner Operator Groups',
    text: `The carriers who do best through soft rate cycles are not always chasing the highest spot rate.\n\nThey have strong broker relationships so they get called when loads open up. They run diversified lanes so a soft corridor does not stall the whole operation. They keep deadhead low so the numbers work even when rates are not great. [COMPANY] helps carriers build that foundation before they need it.`,
    hashtags: ['#freight', '#owneroperator', '#trucking', '#spotrate'],
  },
  {
    id: 'mkt-05',
    category: 'Freight Market',
    bestFor: 'Facebook — Owner Operator Groups',
    text: `If your fuel surcharge is not clearly structured and tied to a published index in your rate confirmations, you may be absorbing cost increases that should be passed through to the shipper.\n\nThat is a quiet margin killer that a lot of carriers do not catch until the numbers are already off. [COMPANY] makes sure our carriers have this set up correctly. Worth a conversation if you are not sure where you stand.`,
    hashtags: ['#fuel', '#FSC', '#owneroperator', '#trucking', '#truckingbusiness'],
  },

  // ── Dry Van (8) ────────────────────────────────────────────────────────────
  {
    id: 'dv-01',
    category: 'Dry Van',
    bestFor: 'Facebook — Dry Van and Owner Operator Groups',
    text: `Dry van is the most competitive equipment type on the board. Brokers know there are always van carriers looking — they use that to their advantage.\n\nKnowing the DAT rate average for your lane before you call is the minimum. [COMPANY] negotiates dry van loads every day and knows when to push and when to book. DM me if you want someone who does that work for you.`,
    hashtags: ['#dryvan', '#owneroperator', '#dispatch', '#trucking'],
  },
  {
    id: 'dv-02',
    category: 'Dry Van',
    bestFor: 'Facebook — Owner Operator Groups',
    text: `Dry van carriers: how are you handling backhauls right now?\n\nA $3.00 outbound rate means a lot less if you deadhead 300 miles to get back to a decent lane. [COMPANY] builds backhaul planning into every load search — the round trip matters as much as the individual load.`,
    hashtags: ['#dryvan', '#owneroperator', '#trucking', '#deadhead'],
  },
  {
    id: 'dv-03',
    category: 'Dry Van',
    bestFor: 'Facebook — Owner Operator Groups',
    text: `Drop and hook loads are not always listed that way on the board.\n\nIf you are spending too much time at live loads, ask brokers specifically what live versus drop availability looks like before booking. Some have pre-loaded trailer pools that never get advertised. [COMPANY] asks this on every dry van load search.`,
    hashtags: ['#dryvan', '#owneroperator', '#trucking', '#dropandhook'],
  },
  {
    id: 'dv-04',
    category: 'Dry Van',
    bestFor: 'Facebook — Owner Operator Groups',
    text: `Consistent dry van freight at $2.40 per mile every week is usually better than occasional loads at $3.20 with long gaps in between.\n\n[COMPANY] focuses on building consistent load volume for dry van carriers. Consistency is what makes the business sustainable long term.`,
    hashtags: ['#dryvan', '#owneroperator', '#trucking', '#dispatch'],
  },
  {
    id: 'dv-05',
    category: 'Dry Van',
    bestFor: 'Facebook — Dry Van Groups',
    text: `Dry van carriers: are you staying OTR or going regional? Both have real tradeoffs and the right answer depends on your cost structure and what you want out of this.\n\nOTR means more potential gross but more time away. Regional means predictable lanes and home time but usually less total revenue. [COMPANY] helps carriers figure out which model makes sense for their specific operation.`,
    hashtags: ['#dryvan', '#owneroperator', '#trucking', '#OTR', '#regional'],
  },
  {
    id: 'dv-06',
    category: 'Dry Van',
    bestFor: 'Facebook — Owner Operator Groups',
    text: `If you run dry van and are not regularly checking the DAT rate index before calling on loads, you are negotiating blind.\n\nThat index tells you what similar loads on your lane paid in the last 15 and 30 days. It is the difference between knowing your counter is reasonable versus guessing. [COMPANY] uses this data on every single call for our dry van carriers.`,
    hashtags: ['#dryvan', '#owneroperator', '#trucking', '#rates'],
  },
  {
    id: 'dv-07',
    category: 'Dry Van',
    bestFor: 'Facebook — Dry Van Groups',
    text: `Dispatcher here with consistent dry van freight on midwest and southeast corridors. If you are running a 53-foot van and looking for a dispatcher who negotiates your rates instead of just forwarding load links, DM me your home base.`,
    hashtags: ['#dryvan', '#owneroperator', '#trucking', '#dispatch'],
  },
  {
    id: 'dv-08',
    category: 'Dry Van',
    bestFor: 'Facebook — Owner Operator Groups',
    text: `Getting comfortable in one or two corridors is easy but it creates real risk when rates soften on those lanes.\n\nDiversifying your lane mix takes upfront work but smooths out the income swings. [COMPANY] helps dry van operators map out lane strategies based on what the market is actually paying, not just what they have always run.`,
    hashtags: ['#dryvan', '#owneroperator', '#trucking', '#lanes'],
  },

  // ── Reefer (7) ────────────────────────────────────────────────────────────
  {
    id: 'ref-01',
    category: 'Reefer',
    bestFor: 'Facebook — Reefer and Owner Operator Groups',
    text: `Reefer operators have a real advantage: temperature-controlled freight commands a premium that dry van freight does not, and that gap has been consistent.\n\nIf you are running reefer and not regularly hitting $3.00 per mile on outbound lanes, your broker relationships or negotiation approach may be holding you back. [COMPANY] works with reefer operators who want to close that gap.`,
    hashtags: ['#reefer', '#owneroperator', '#trucking', '#dispatch'],
  },
  {
    id: 'ref-02',
    category: 'Reefer',
    bestFor: 'Facebook — Reefer Groups',
    text: `Your reefer equipment costs more to run, consumes more fuel, and costs more to insure than a dry van. Your rate floor needs to reflect that.\n\nIf you are booking reefer loads at dry van prices, the math does not work. [COMPANY] makes sure our reefer carriers hold their rate floor and do not get pressured into underpriced loads.`,
    hashtags: ['#reefer', '#owneroperator', '#trucking', '#rpm'],
  },
  {
    id: 'ref-03',
    category: 'Reefer',
    bestFor: 'Facebook — Reefer and Owner Operator Groups',
    text: `Temperature documentation seems like extra paperwork until you need it.\n\nA receiver disputes a delivery and your continuous temp log is the thing that protects you. Most disputes resolve quickly when the data is clean. [COMPANY] reminds our reefer carriers to pull and save temp records on every load — small habit, matters when things go sideways.`,
    hashtags: ['#reefer', '#owneroperator', '#trucking', '#compliance'],
  },
  {
    id: 'ref-04',
    category: 'Reefer',
    bestFor: 'Facebook — Reefer and Owner Operator Groups',
    text: `Reefer carriers running southeast corridors: Florida and Georgia produce creates strong outbound volume seasonally, but the return freight can be inconsistent.\n\nPlanning the backhaul before committing to the outbound is especially important in these markets. [COMPANY] plans round trips for reefer carriers, not just individual loads.`,
    hashtags: ['#reefer', '#owneroperator', '#trucking', '#southeast'],
  },
  {
    id: 'ref-05',
    category: 'Reefer',
    bestFor: 'Facebook — Reefer Groups',
    text: `Reefer carriers who want consistent freight need to be registered with grocery distribution brokers, not just chasing spot market boards.\n\nThose relationships take longer to build but they provide steadier volume and better rates. It is the difference between scrambling every week and running on a predictable schedule. [COMPANY] helps reefer operators build the right broker network.`,
    hashtags: ['#reefer', '#owneroperator', '#trucking', '#dispatch'],
  },
  {
    id: 'ref-06',
    category: 'Reefer',
    bestFor: 'Facebook — Owner Operator Groups',
    text: `Dispatcher here looking for reefer operators. If you are running temperature-controlled freight and want a dispatcher who understands your equipment costs and holds your rate floor, DM me your home base and preferred lanes.`,
    hashtags: ['#reefer', '#owneroperator', '#trucking', '#dispatch'],
  },
  {
    id: 'ref-07',
    category: 'Reefer',
    bestFor: 'Facebook — Reefer Groups',
    text: `Produce and grocery distribution are some of the most consistent reefer lanes in the country, but they require tight delivery windows and zero temperature excursions.\n\nThe carriers who build strong relationships in those lanes run clean and communicate proactively. The rates reflect that reliability. [COMPANY] places carriers in these lanes when the track record supports it.`,
    hashtags: ['#reefer', '#owneroperator', '#trucking', '#produce'],
  },

  // ── Flatbed (8) ───────────────────────────────────────────────────────────
  {
    id: 'fb-01',
    category: 'Flatbed',
    bestFor: 'Facebook — Flatbed and Owner Operator Groups',
    text: `Flatbed carriers have leverage that dry van operators do not: the perception of difficulty. Brokers know flatbed loads are harder to place because fewer carriers run them.\n\nIf you are not using that to negotiate a premium, you are leaving money on the table. [COMPANY] knows when the market will support a higher rate and when to hold out.`,
    hashtags: ['#flatbed', '#owneroperator', '#trucking', '#rates'],
  },
  {
    id: 'fb-02',
    category: 'Flatbed',
    bestFor: 'Facebook — Flatbed Groups',
    text: `Tarping adds time and wear that needs to be in the rate, not absorbed by you.\n\nIf you are regularly booking tarped loads at the same rate as no-tarp freight, you are losing money on those miles. [COMPANY] factors tarping and strapping requirements into every flatbed rate negotiation.`,
    hashtags: ['#flatbed', '#owneroperator', '#trucking', '#rates'],
  },
  {
    id: 'fb-03',
    category: 'Flatbed',
    bestFor: 'Facebook — Flatbed and Owner Operator Groups',
    text: `Infrastructure and construction freight has held steadier than general van freight in this cycle. Steel, lumber, and building materials lanes are showing consistent broker activity in several corridors.\n\n[COMPANY] has broker connections in these categories that do not always show up on public boards. DM me if you want to know what your lanes are paying.`,
    hashtags: ['#flatbed', '#owneroperator', '#trucking', '#construction'],
  },
  {
    id: 'fb-04',
    category: 'Flatbed',
    bestFor: 'Facebook — Flatbed Groups',
    text: `A high-rate flatbed load can become a losing load when you factor in tarp requirements, multiple stops, long loading time, and a difficult delivery. Those details belong in the rate.\n\n[COMPANY] reads every flatbed load carefully before presenting it. Hidden costs get factored in upfront.`,
    hashtags: ['#flatbed', '#owneroperator', '#trucking', '#dispatch'],
  },
  {
    id: 'fb-05',
    category: 'Flatbed',
    bestFor: 'Facebook — Flatbed Groups',
    text: `Steel coil and pipe freight pays well and the volume is consistent for carriers who have the chaining skills. Once you are trusted in that broker network, the loads come to you instead of you hunting the board.\n\n[COMPANY] places flatbed carriers in coil and pipe lanes when the setup is right.`,
    hashtags: ['#flatbed', '#owneroperator', '#trucking', '#steel'],
  },
  {
    id: 'fb-06',
    category: 'Flatbed',
    bestFor: 'Facebook — Flatbed and Owner Operator Groups',
    text: `Flatbed carriers in the southeast: lumber and building materials have been more resilient than a lot of people expected. Residential construction may have slowed but renovation and commercial build activity has kept flatbed demand steady on several corridors.\n\nDM me if you want to know what specific lanes are paying right now.`,
    hashtags: ['#flatbed', '#owneroperator', '#trucking', '#lumber'],
  },
  {
    id: 'fb-07',
    category: 'Flatbed',
    bestFor: 'Facebook — Owner Operator Groups',
    text: `Dispatcher here looking for flatbed operators. I have broker relationships on steel, lumber, and construction material lanes that do not always hit the public boards. If you run flatbed and want loads that pay what the freight is worth, DM me your home base.`,
    hashtags: ['#flatbed', '#owneroperator', '#trucking', '#dispatch'],
  },
  {
    id: 'fb-08',
    category: 'Flatbed',
    bestFor: 'Facebook — Flatbed Groups',
    text: `Oversize and overweight freight commands a premium because most carriers do not want the complexity. If you have OW/OS experience and want to do more of it, building those broker relationships intentionally is worth the time.\n\n[COMPANY] can connect qualified flatbed operators with OW/OS brokers in several corridors.`,
    hashtags: ['#flatbed', '#owneroperator', '#trucking', '#oversize'],
  },

  // ── Step Deck (6) ─────────────────────────────────────────────────────────
  {
    id: 'sd-01',
    category: 'Step Deck',
    bestFor: 'Facebook — Flatbed and Specialty Groups',
    text: `Step deck operators: your equipment opens doors a standard flatbed cannot. Too tall for a standard flat, too large for a van — that is your lane. The carrier pool is smaller, which means less competition and better leverage on rates.\n\n[COMPANY] works with step deck carriers and knows the brokers who regularly move this freight. DM me your home base.`,
    hashtags: ['#stepdeck', '#owneroperator', '#trucking', '#specialty'],
  },
  {
    id: 'sd-02',
    category: 'Step Deck',
    bestFor: 'Facebook — Flatbed and Specialty Groups',
    text: `Specialty freight holds up better in slow cycles because fewer qualified carriers run it.\n\nIf you run step deck and are evaluating whether to stay in specialized freight or transition to standard flatbed, the rate stability argument is real. [COMPANY] can run through the numbers for your specific lanes if you want to think through that decision.`,
    hashtags: ['#stepdeck', '#owneroperator', '#trucking', '#rates'],
  },
  {
    id: 'sd-03',
    category: 'Step Deck',
    bestFor: 'Facebook — Specialty Trucking Groups',
    text: `Do you know what rate premium your step deck commands over standard flatbed for the same lane?\n\nIn most markets it is between 10 and 25 percent for loads that specifically require your equipment. If your dispatcher is not asking for that premium, they are leaving your money behind. [COMPANY] negotiates the step deck premium on every eligible load.`,
    hashtags: ['#stepdeck', '#owneroperator', '#trucking', '#rates'],
  },
  {
    id: 'sd-04',
    category: 'Step Deck',
    bestFor: 'Facebook — Specialty Trucking Groups',
    text: `The best step deck loads tend to move through broker relationships before they hit public boards.\n\nIf you are not yet registered with the specialized brokers who move oversized equipment in your lanes, that is worth fixing. [COMPANY] can help qualified step deck operators get positioned with the right contacts for their region.`,
    hashtags: ['#stepdeck', '#owneroperator', '#trucking', '#dispatch'],
  },
  {
    id: 'sd-05',
    category: 'Step Deck',
    bestFor: 'Facebook — Flatbed and Specialty Groups',
    text: `The wind energy and renewable infrastructure market has created consistent oversized component freight in several regions. Solar skids, turbine components, large electrical equipment — steady volume with a smaller carrier pool.\n\n[COMPANY] has broker connections in this category for step deck carriers who want to explore it.`,
    hashtags: ['#stepdeck', '#owneroperator', '#trucking', '#energy'],
  },
  {
    id: 'sd-06',
    category: 'Step Deck',
    bestFor: 'Facebook — Owner Operator Groups',
    text: `Dispatcher here looking for step deck operators. I have broker contacts for specialty and industrial freight in multiple corridors. If you run step deck and want loads that reflect your equipment's actual value, DM me your home base and preferred lanes.`,
    hashtags: ['#stepdeck', '#owneroperator', '#trucking', '#dispatch'],
  },

  // ── Hotshot (12) ──────────────────────────────────────────────────────────
  // Short-form direct posts (highest performers in hotshot groups)
  {
    id: 'hs-01',
    category: 'Hotshot',
    bestFor: 'Facebook — Hotshot Groups',
    text: `Dispatcher here. Looking for hotshot operators in Texas, Oklahoma, and surrounding states. I have oilfield and industrial freight that needs to move fast and pays accordingly. DM me your equipment and home base.`,
    hashtags: ['#hotshot', '#owneroperator', '#trucking', '#oilfield'],
  },
  {
    id: 'hs-02',
    category: 'Hotshot',
    bestFor: 'Facebook — Hotshot and Owner Operator Groups',
    text: `Running hotshot and spending most of your day chasing loads yourself? That is the part I can take off your plate.\n\n[COMPANY] handles the board work for hotshot operators. You run the loads. DM me your equipment and where you are based.`,
    hashtags: ['#hotshot', '#owneroperator', '#trucking', '#dispatch'],
  },
  {
    id: 'hs-03',
    category: 'Hotshot',
    bestFor: 'Facebook — Hotshot Groups',
    text: `Hotshot operators — I currently have capacity for new carriers on my roster. I focus on oilfield, industrial, and time-sensitive freight that pays a premium because it cannot wait.\n\nIf you run hotshot and want consistent loads without hunting the board every morning, DM me.`,
    hashtags: ['#hotshot', '#owneroperator', '#trucking', '#dispatch'],
  },
  {
    id: 'hs-04',
    category: 'Hotshot',
    bestFor: 'Facebook — Hotshot Groups',
    text: `Oil field hotshot runs on relationships more than almost any other freight category.\n\nEnergy companies need carriers they can reach at 2 AM when a part needs to be somewhere by morning. The operators who build that reputation get repeat calls before anyone else. [COMPANY] helps hotshot carriers build and maintain those critical contacts.`,
    hashtags: ['#hotshot', '#owneroperator', '#trucking', '#oilfield'],
  },
  {
    id: 'hs-05',
    category: 'Hotshot',
    bestFor: 'Facebook — Hotshot and Owner Operator Groups',
    text: `Hotshot operators: are you on all the load boards and broker networks that matter for your category?\n\nBeyond DAT and Truckstop, there are industry-specific networks for oilfield, construction, and industrial freight that surface loads you will never see on the general boards. [COMPANY] knows where hotshot freight actually moves in different markets.`,
    hashtags: ['#hotshot', '#owneroperator', '#trucking', '#loadboard'],
  },
  {
    id: 'hs-06',
    category: 'Hotshot',
    bestFor: 'Facebook — Hotshot Groups',
    text: `The hotshot math can be tricky: high rate per mile does not always mean the load is a good one once you factor in fuel efficiency, deadhead to pickup, and how the load weight uses your capacity.\n\n[COMPANY] helps hotshot operators look at cost per loaded mile and actual take-home, not just the posted rate.`,
    hashtags: ['#hotshot', '#owneroperator', '#trucking', '#rpm'],
  },
  {
    id: 'hs-07',
    category: 'Hotshot',
    bestFor: 'Facebook — Hotshot and Owner Operator Groups',
    text: `Hotshot carriers who want consistent freight need to stop thinking load-by-load and start building route consistency.\n\nThree or four shippers with recurring freight need is fundamentally different from chasing spot loads every day. It takes longer to set up but it is a stable business. [COMPANY] helps hotshot operators identify and pursue those direct shipper relationships.`,
    hashtags: ['#hotshot', '#owneroperator', '#trucking', '#dispatch'],
  },
  {
    id: 'hs-08',
    category: 'Hotshot',
    bestFor: 'Facebook — Hotshot Groups',
    text: `For hotshot operators in Texas, Oklahoma, Louisiana, and New Mexico: the oilfield freight market has stayed active even when general freight has slowed.\n\nIf you are in this region and not already running energy sector loads, it is worth understanding what that market looks like. [COMPANY] has connections in the oilfield logistics space. DM me if you want to learn more.`,
    hashtags: ['#hotshot', '#owneroperator', '#trucking', '#oilfield', '#texas'],
  },
  {
    id: 'hs-09',
    category: 'Hotshot',
    bestFor: 'Facebook — Hotshot Groups',
    text: `Hotshot operators: what does your average RPM look like right now and are you happy with it?\n\nI ask because there is a wide range in this category depending on freight type and region, and a lot of hotshot operators do not realize what their lane is actually capable of paying. Drop it below or DM me.`,
    hashtags: ['#hotshot', '#owneroperator', '#trucking', '#rpm'],
  },
  {
    id: 'hs-10',
    category: 'Hotshot',
    bestFor: 'Facebook — Hotshot and Owner Operator Groups',
    text: `Real talk on hotshot dispatch: I have seen operators running hard every week and still not making the money their miles should produce.\n\nUsually it comes down to deadhead, broker relationships, or taking whatever load is available instead of waiting for the right one. If that sounds familiar, DM me — it is fixable.`,
    hashtags: ['#hotshot', '#owneroperator', '#trucking', '#dispatch'],
  },
  {
    id: 'hs-11',
    category: 'Hotshot',
    bestFor: 'Facebook — Hotshot Groups',
    text: `[COMPANY] dispatches hotshot and takes 7 percent per load. I negotiate every rate, check broker payment history before booking, and I am reachable when something comes up on the road. No forwarded links, no disappearing when there is a problem.\n\nIf you have been through a dispatcher who did not deliver on those things, I understand why you are skeptical. DM me and I will walk you through how I actually work.`,
    hashtags: ['#hotshot', '#owneroperator', '#dispatch', '#trucking'],
  },
  {
    id: 'hs-12',
    category: 'Hotshot',
    bestFor: 'Facebook — Hotshot Groups',
    text: `New to hotshot and trying to figure out the freight side? The learning curve is real but it is shorter with the right support.\n\n[COMPANY] works with new and experienced hotshot operators. If you are earlier in your authority and want to skip some of the hard lessons, DM me.`,
    hashtags: ['#hotshot', '#owneroperator', '#trucking', '#newauthority'],
  },

  // ── Hot Lanes (6) ─────────────────────────────────────────────────────────
  {
    id: 'hl-01',
    category: 'Hot Lanes',
    bestFor: 'Facebook — Owner Operator Groups',
    text: `There are always a few freight corridors outperforming the market at any given time. Right now the southeast-to-midwest lane is one of them — Atlanta to Chicago, Charlotte to Columbus, Nashville to Indianapolis — consistent volume and rates that reflect it.\n\nIf you run that corridor and want to know what your truck should actually be earning right now, DM me your equipment and home base.`,
    hashtags: ['#owneroperator', '#trucking', '#freightlanes', '#dispatch', '#hotlane'],
  },
  {
    id: 'hl-02',
    category: 'Hot Lanes',
    bestFor: 'Facebook — Owner Operator Groups',
    text: `Texas outbound is one of the stronger freight markets in the country right now. DFW, Houston, and San Antonio generate consistent outbound volume and the rates on certain lanes reflect that demand.\n\n[COMPANY] works with carriers in Texas and the surrounding region. If you are based there or run through it regularly, DM me your equipment type and I will tell you what those lanes are currently paying.`,
    hashtags: ['#owneroperator', '#trucking', '#texas', '#freightlanes', '#dispatch'],
  },
  {
    id: 'hl-03',
    category: 'Hot Lanes',
    bestFor: 'Facebook — Owner Operator Groups',
    text: `Not all lanes are created equal and right now the midwest-to-northeast corridor is one of the better spots to be running. Chicago, Indianapolis, and Columbus all have strong outbound freight and northeast rates have held up well.\n\nIf you run this lane and want a dispatcher who tracks what it actually pays and negotiates from that data, DM me.`,
    hashtags: ['#owneroperator', '#trucking', '#freightlanes', '#dispatch', '#midwest'],
  },
  {
    id: 'hl-04',
    category: 'Hot Lanes',
    bestFor: 'Facebook — Owner Operator Groups',
    text: `Which freight corridors are you seeing the best rates on right now?\n\nI track lane data weekly and a few have been consistently above market for the past 30 days. I am curious what carriers in this group are actually seeing on the road. Drop your lane and what it is paying below.`,
    hashtags: ['#owneroperator', '#trucking', '#freightlanes', '#rates', '#hotlane'],
  },
  {
    id: 'hl-05',
    category: 'Hot Lanes',
    bestFor: 'Facebook — Owner Operator Groups',
    text: `If your truck is sitting in a hot freight corridor right now, that is exactly the situation where a dispatcher with active broker relationships makes a real difference.\n\n[COMPANY] monitors lane rates daily. DM me your equipment type and current location and I will tell you what brokers are paying on your lane before you call anyone.`,
    hashtags: ['#owneroperator', '#trucking', '#dispatch', '#freightlanes', '#hotlane'],
  },
  {
    id: 'hl-06',
    category: 'Hot Lanes',
    bestFor: 'Facebook — Owner Operator and Dry Van Groups',
    text: `Florida northbound produce lanes are active right now. Carriers positioned in south Florida and central Florida who can run produce or general freight north are seeing strong rate activity.\n\nIf you run reefer or dry van and want to know what those outbound lanes are paying, DM me your equipment. [COMPANY] has broker connections on several Florida northbound corridors.`,
    hashtags: ['#owneroperator', '#trucking', '#florida', '#freightlanes', '#reefer', '#dryvan'],
  },
]

/**
 * Returns today's template using a date-based seed.
 * Same template all day, automatically changes each day.
 * overrideOffset lets the user cycle to the next/prev template manually.
 */
export function getDailyTemplate(overrideOffset = 0): PostTemplate {
  const today = new Date()
  const seed  = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate()
  const base  = seed % POST_TEMPLATES.length
  const idx   = (base + overrideOffset + POST_TEMPLATES.length * 10) % POST_TEMPLATES.length
  return POST_TEMPLATES[idx]
}

/** Replace [COMPANY] token with the actual company name */
export function renderTemplate(template: PostTemplate, companyName: string): string {
  return template.text.replace(/\[COMPANY\]/g, companyName)
}

export const CATEGORY_COLORS: Record<PostCategory, string> = {
  'Driver Recruitment': 'bg-orange-600 text-white border-orange-500',
  'Value Prop':         'bg-blue-600 text-white border-blue-500',
  'Engagement':         'bg-green-600 text-white border-green-500',
  'New Authority':      'bg-purple-600 text-white border-purple-500',
  'Trust':              'bg-amber-500 text-white border-amber-400',
  'Freight Market':     'bg-cyan-600 text-white border-cyan-500',
  'Dry Van':            'bg-sky-600 text-white border-sky-500',
  'Reefer':             'bg-teal-600 text-white border-teal-500',
  'Flatbed':            'bg-amber-600 text-white border-amber-500',
  'Step Deck':          'bg-rose-600 text-white border-rose-500',
  'Hotshot':            'bg-indigo-600 text-white border-indigo-500',
  'Hot Lanes':          'bg-red-600 text-white border-red-500',
}
