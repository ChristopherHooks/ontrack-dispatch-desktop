/**
 * Post template library for OnTrack Marketing tab.
 * Templates are hardcoded — zero API calls, zero cost.
 * [COMPANY] is substituted at render time with the company name from settings.
 *
 * Rules:
 * - No emojis — ever
 * - Natural, human tone — no bullet lists with symbols, no hype language
 * - Enough variety for 90+ days without repeating (78 templates total)
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

export interface PostTemplate {
  id:       string
  category: PostCategory
  bestFor:  string
  text:     string
  hashtags: string[]
}

export const POST_TEMPLATES: PostTemplate[] = [

  // ── Driver Recruitment (10) ────────────────────────────────────────────────
  {
    id: 'rec-01',
    category: 'Driver Recruitment',
    bestFor: 'Facebook — Owner Operator Groups',
    text: `Sitting empty between loads is the most expensive thing an owner-operator can do. Every hour the truck is not moving is money left on the table.\n\n[COMPANY] keeps carriers moving with consistent freight, negotiated rates, and none of the broker phone tag. We handle the back-and-forth so you can focus on the road.\n\nIf you want to see what your truck should actually be earning, send us a message with your equipment type and home base.`,
    hashtags: ['#owneroperator', '#trucking', '#dispatch', '#freightlife'],
  },
  {
    id: 'rec-02',
    category: 'Driver Recruitment',
    bestFor: 'Facebook — Owner Operator Groups',
    text: `New authority? First — congratulations on making the move.\n\nThe first few months are a grind. You are learning rates, figuring out which brokers are worth dealing with, and getting turned down because your authority is too new. That phase passes, but it passes a lot faster with someone in your corner who has already built those relationships.\n\n[COMPANY] works with new and established carriers. If you are early in your authority and want a smoother start, let us talk.`,
    hashtags: ['#newauthority', '#owneroperator', '#trucking', '#dispatch'],
  },
  {
    id: 'rec-03',
    category: 'Driver Recruitment',
    bestFor: 'Facebook — Owner Operator Groups',
    text: `The thing about being an owner-operator is that you are not just a driver. You are also your own logistics coordinator, rate negotiator, and paperwork department.\n\nMost people are great at one or two of those things. Almost nobody is great at all of them, and more importantly, nobody should have to be.\n\nThat is what [COMPANY] is for. We handle the business side so you can be a carrier, not a desk job.`,
    hashtags: ['#owneroperator', '#dispatch', '#trucking', '#truckingbusiness'],
  },
  {
    id: 'rec-04',
    category: 'Driver Recruitment',
    bestFor: 'Facebook — Trucking Groups',
    text: `The difference between struggling and running well as an owner-operator usually comes down to one thing: having someone who knows rates, knows brokers, and pushes back when a load does not pencil.\n\nThat is not something you can get from a load board app. It takes a person who does this every day and has built the relationships over time.\n\nThat is what [COMPANY] brings to every carrier we work with. Message us if you want to learn more about how we work.`,
    hashtags: ['#owneroperator', '#dispatch', '#trucking', '#freightbroker'],
  },
  {
    id: 'rec-05',
    category: 'Driver Recruitment',
    bestFor: 'Facebook — Owner Operator Groups',
    text: `You bought your truck to make money, not to spend three hours a day fighting load boards for freight that barely covers fuel.\n\n[COMPANY] handles the board work. You handle the miles.\n\nWe are selective about who we take on because the model only works if we can give each carrier real attention. Right now we have capacity for a small number of new carriers. Send us a message with your equipment type and where you are based.`,
    hashtags: ['#owneroperator', '#dispatch', '#trucking', '#loadboard'],
  },
  {
    id: 'rec-06',
    category: 'Driver Recruitment',
    bestFor: 'Facebook — Owner Operator Groups',
    text: `Not all dispatch companies work the same way.\n\nSome send you load board links and call it dispatching. That is not what we do.\n\n[COMPANY] is on the phone negotiating your rates, monitoring your load in transit, chasing detention pay when you are stuck at a dock, and making sure the paperwork is right before anything gets signed. If you want to know exactly how we work, ask. We are happy to walk through it.`,
    hashtags: ['#owneroperator', '#dispatch', '#trucking', '#truckdriver'],
  },
  {
    id: 'rec-07',
    category: 'Driver Recruitment',
    bestFor: 'Facebook — Owner Operator Groups',
    text: `Owner-operators: what does your weekly gross look like right now?\n\nIf you are not happy with the answer, that is worth a conversation. Staying busy is not the same as running profitably, and there is a big difference between a full schedule and a good schedule.\n\n[COMPANY] focuses on rate per mile and actual take-home, not just keeping the truck moving. Message us and let us take a look at what your lanes should be paying.`,
    hashtags: ['#owneroperator', '#trucking', '#dispatch', '#rpm'],
  },
  {
    id: 'rec-08',
    category: 'Driver Recruitment',
    bestFor: 'Facebook — Owner Operator Groups',
    text: `Real talk about dispatch fees: a good dispatcher pays for themselves.\n\nIf your dispatcher is not getting you better rates than you would get calling brokers cold, they are not earning their percentage. That is just math.\n\nAt [COMPANY], our fee is 7 percent. What you get back in better rates, less deadhead, and time savings should be more than that. If it is not, we have not done our job. Let us show you what that looks like for your specific setup.`,
    hashtags: ['#owneroperator', '#dispatch', '#trucking', '#truckingbusiness'],
  },
  {
    id: 'rec-09',
    category: 'Driver Recruitment',
    bestFor: 'Facebook — CDL and Trucking Groups',
    text: `[COMPANY] is accepting new carriers.\n\nWe work with dry van, flatbed, reefer, step deck, and hotshot operators. New and established authorities both welcome. If you run clean and want consistent freight, we want to talk.\n\nSend us your equipment type and home state and we will reach out to discuss what your truck should be earning on your preferred lanes.`,
    hashtags: ['#owneroperator', '#dispatch', '#trucking', '#dryvan', '#flatbed', '#reefer'],
  },
  {
    id: 'rec-10',
    category: 'Driver Recruitment',
    bestFor: 'Facebook — Owner Operator Groups',
    text: `Running your own authority is a business. The carriers who build something sustainable are the ones who treat it like one.\n\nThat means knowing your cost per mile, understanding what rates are available on your lanes, and not booking loads just to stay moving.\n\n[COMPANY] helps owner-operators run like a business, not just a driver with a DOT number. If you want to be in that category, let us talk.`,
    hashtags: ['#owneroperator', '#truckingbusiness', '#dispatch', '#trucking'],
  },

  // ── Value Prop (8) ─────────────────────────────────────────────────────────
  {
    id: 'val-01',
    category: 'Value Prop',
    bestFor: 'Facebook — Owner Operator Groups',
    text: `What does a dispatcher actually do? Here is the honest version.\n\nWe search load boards and our direct broker network for freight that matches your equipment and lanes. We call brokers and negotiate — not just accept the first number. We review every rate confirmation before it goes to you. We handle all communication with shippers and receivers while you are in transit. We chase detention pay when you are stuck waiting. And we invoice after delivery so you do not have to.\n\nThat is [COMPANY] on every single load.`,
    hashtags: ['#dispatch', '#owneroperator', '#trucking', '#truckingbusiness'],
  },
  {
    id: 'val-02',
    category: 'Value Prop',
    bestFor: 'Facebook — Owner Operator Groups',
    text: `The math on dispatch is pretty simple.\n\nIf [COMPANY] helps you earn 20 cents more per mile and you run 10,000 miles a month, that is $2,000 in additional gross. Our fee at 7 percent on that gross is roughly $280. Net gain: $1,720 a month, or about $20,000 a year.\n\nThat is just from rate negotiation. The time savings and reduced stress are on top of that.\n\nThe numbers make the case better than anything we could say.`,
    hashtags: ['#owneroperator', '#dispatch', '#truckingbusiness', '#rpm'],
  },
  {
    id: 'val-03',
    category: 'Value Prop',
    bestFor: 'Facebook — Owner Operator Groups',
    text: `How many hours a week do you spend dealing with brokers?\n\nFor most self-dispatching owner-operators, it is somewhere between four and ten hours. Phone calls, emails, load board searches, negotiating, back and forth on rates.\n\nNow think about what you could do with that time instead. More miles. More rest. Time at home.\n\n[COMPANY] gives those hours back. That is the value before you even look at the rate improvements.`,
    hashtags: ['#owneroperator', '#dispatch', '#trucking', '#truckinglife'],
  },
  {
    id: 'val-04',
    category: 'Value Prop',
    bestFor: 'Facebook — Owner Operator Groups',
    text: `Rate per mile matters, but so does utilization.\n\nA truck sitting empty for two days even at a good spot rate is less profitable than a truck that turns loads consistently at a decent rate with minimal deadhead.\n\n[COMPANY] optimizes for your actual take-home, not just the highest rate on any given load. We look at the whole picture — lane routing, deadhead, delivery timing — so the math works for your operation, not just on paper.`,
    hashtags: ['#owneroperator', '#dispatch', '#rpm', '#trucking', '#utilization'],
  },
  {
    id: 'val-05',
    category: 'Value Prop',
    bestFor: 'Facebook — Owner Operator Groups',
    text: `[COMPANY] does not take every load that comes across the board.\n\nWe check broker payment history before booking. We pass on loads that do not meet your rate floor. We avoid carriers with a pattern of late payment or disputes.\n\nYou will never hear us say we booked you a load and then find out the broker takes 60 days to pay. That filtering happens before the load ever reaches your phone.`,
    hashtags: ['#owneroperator', '#dispatch', '#brokers', '#trucking'],
  },
  {
    id: 'val-06',
    category: 'Value Prop',
    bestFor: 'Facebook — Owner Operator Groups',
    text: `When things go sideways on a load — and sometimes they do — the question is who handles it.\n\nWith [COMPANY], we are on the phone with the broker the moment there is an issue. Broken appointment, late pickup, detention that needs to be claimed, delivery rescheduled — we manage all of it. You tell us what is happening and we handle the broker side.\n\nYou should not be doing that from the cab of a truck. That is our job.`,
    hashtags: ['#dispatch', '#owneroperator', '#trucking', '#truckinglife'],
  },
  {
    id: 'val-07',
    category: 'Value Prop',
    bestFor: 'Facebook Page and LinkedIn',
    text: `Dispatch done right is market intelligence, not just load searching.\n\nKnowing what a lane pays in the current market. Knowing which brokers negotiate and which ones post firm. Knowing when to hold out for a better rate and when the market is soft and you should book.\n\nThat knowledge comes from doing this every day across multiple carriers and lanes. It is one of the real advantages of working with [COMPANY] rather than going it alone on the board.`,
    hashtags: ['#dispatch', '#trucking', '#logistics', '#owneroperator'],
  },
  {
    id: 'val-08',
    category: 'Value Prop',
    bestFor: 'Facebook — Owner Operator Groups',
    text: `Five reasons carriers work with [COMPANY] instead of dispatching themselves.\n\nBetter rates — we negotiate from market data, not from needing the load filled. Less deadhead — we plan routes, not just individual loads. No paperwork headaches — rate cons, BOLs, invoicing, all handled. Detention pay — we claim it every time, not just when it is easy. You get home — we route loads so your truck ends up where you need it.\n\nMessage us if you want to see how that works for your specific setup.`,
    hashtags: ['#owneroperator', '#dispatch', '#trucking', '#truckdriver'],
  },

  // ── Engagement (8) ─────────────────────────────────────────────────────────
  {
    id: 'eng-01',
    category: 'Engagement',
    bestFor: 'Facebook — Owner Operator Groups',
    text: `Honest question for owner-operators in here: what is the one thing you wish was easier about running your own authority?\n\nFinding consistent loads? Dealing with brokers? Paperwork? Getting home on time? Something else entirely?\n\nDrop it in the comments. I read everything and I am genuinely curious what this group is dealing with right now.`,
    hashtags: ['#owneroperator', '#trucking', '#truckinglife'],
  },
  {
    id: 'eng-02',
    category: 'Engagement',
    bestFor: 'Facebook — Owner Operator Groups',
    text: `Dispatcher versus going direct on the load board — what does this group prefer and why?\n\nI have thoughts, but I want to hear from carriers first. What has your experience been? What made you go one direction or the other?\n\nDrop your take below.`,
    hashtags: ['#owneroperator', '#dispatch', '#loadboard', '#trucking'],
  },
  {
    id: 'eng-03',
    category: 'Engagement',
    bestFor: 'Facebook — Owner Operator Groups',
    text: `For everyone who got their authority in the last year: what do you know now that you wish someone had told you before you started?\n\nThe things they do not put in the CDL school brochure. The real stuff.\n\nDrop it below — let us help the newer folks skip some of the hard lessons.`,
    hashtags: ['#owneroperator', '#newauthority', '#trucking', '#truckingadvice'],
  },
  {
    id: 'eng-04',
    category: 'Engagement',
    bestFor: 'Facebook — Owner Operator Groups',
    text: `What is the worst broker experience you have ever had? I will share one of ours.\n\nWe had a broker try to charge back $400 for a supposed redelivery fee on a completely clean delivery. No evidence, no explanation, just a deduction on the invoice. We fought it for three weeks and got it reversed, but that is three weeks of back and forth that should never have happened.\n\nWhat is your worst one? Drop it in the comments.`,
    hashtags: ['#owneroperator', '#brokers', '#trucking', '#freightbroker'],
  },
  {
    id: 'eng-05',
    category: 'Engagement',
    bestFor: 'Facebook — Owner Operator Groups',
    text: `If you could change one thing about how the trucking industry works right now, what would it be?\n\nRates? Broker transparency? ELD regulations? Fuel costs? Shipper detention policies? Something else?\n\nGenuinely curious what is on people's minds right now. Drop it below.`,
    hashtags: ['#trucking', '#owneroperator', '#truckinglife', '#freight'],
  },
  {
    id: 'eng-06',
    category: 'Engagement',
    bestFor: 'Facebook — Owner Operator Groups',
    text: `For the owner-operators in this group: how long did it take before you felt like you had the business side figured out?\n\nNot the driving — the business. Knowing your cost per mile. Understanding rates. Managing cash flow between loads. Dealing with slow-paying brokers.\n\nFirst year? Second year? Still working on it? No judgment — this stuff takes time and it is harder than most people expect going in.`,
    hashtags: ['#owneroperator', '#truckingbusiness', '#trucking'],
  },
  {
    id: 'eng-07',
    category: 'Engagement',
    bestFor: 'Facebook — Owner Operator Groups',
    text: `Quick question for dry van carriers: what is your biggest challenge right now?\n\nFinding consistent loads, getting rates above $2.50 a mile, minimizing deadhead, or managing cash flow between payments?\n\nDrop your answer and any context you want to add. I ask because the answers shape what we focus on for the carriers we work with.`,
    hashtags: ['#dryvan', '#owneroperator', '#trucking', '#dispatch'],
  },
  {
    id: 'eng-08',
    category: 'Engagement',
    bestFor: 'Facebook — Owner Operator Groups',
    text: `Serious question: are you making what you thought you would make when you got your authority?\n\nA lot of carriers I talk to are working harder than ever and not seeing it reflected in their actual take-home after fuel, insurance, and maintenance.\n\nWhat is the gap for you, and what do you think is the biggest factor causing it? I am asking because this is what we spend a lot of time thinking about.`,
    hashtags: ['#owneroperator', '#trucking', '#truckingbusiness', '#dispatch'],
  },

  // ── New Authority (7) ──────────────────────────────────────────────────────
  {
    id: 'new-01',
    category: 'New Authority',
    bestFor: 'Facebook — New Authority and CDL Groups',
    text: `To every new MC authority out there: the first 90 days are genuinely hard, and that is normal.\n\nYou are learning rates, figuring out lanes, getting turned down by some brokers because your authority age does not meet their threshold. That phase ends. The carriers who push through that first quarter almost always make it.\n\nStick with it. [COMPANY] is here if you need support during that stretch.`,
    hashtags: ['#newauthority', '#owneroperator', '#trucking', '#newMC'],
  },
  {
    id: 'new-02',
    category: 'New Authority',
    bestFor: 'Facebook — New Authority and CDL Groups',
    text: `New authority tip that will save you time: get your certificate of insurance formatted and ready to email before you start reaching out to brokers.\n\nEvery broker requires it on file before they will move freight with you. They also need to be listed as the certificate holder on it, which means your insurance agent has to add them by name. That process takes a day or two.\n\nGet ahead of it before you need it. [COMPANY] walks new carriers through this setup from day one.`,
    hashtags: ['#newauthority', '#owneroperator', '#trucking', '#FMCSA'],
  },
  {
    id: 'new-03',
    category: 'New Authority',
    bestFor: 'Facebook — New Authority and CDL Groups',
    text: `The most common mistake I see new carriers make: booking the first load offered rather than the best load available.\n\nBrokers know new authorities are eager. Some lowball specifically because of it. They figure you need the load and will take what they offer.\n\nKnow your minimum rate per mile before you call anyone. Know what your lane is paying from DAT. Or let [COMPANY] negotiate on your behalf — we know what your freight should cost.`,
    hashtags: ['#newauthority', '#owneroperator', '#trucking', '#dispatch'],
  },
  {
    id: 'new-04',
    category: 'New Authority',
    bestFor: 'Facebook — New Authority and CDL Groups',
    text: `"How do I get brokers to work with me when I have no track record?" — this is one of the most common questions from new carriers.\n\nThe honest answer: you do not need a track record. You need a clean safety score, proper insurance in place, a professional carrier packet ready to send, and someone who can introduce you the right way.\n\nThat last part is where [COMPANY] makes a real difference for new authorities.`,
    hashtags: ['#newauthority', '#owneroperator', '#trucking', '#dispatch'],
  },
  {
    id: 'new-05',
    category: 'New Authority',
    bestFor: 'Facebook — New Authority and CDL Groups',
    text: `New authority checklist before you book your first load:\n\nInsurance COI ready to send on request. Carrier packet completed. RMIS or Carrier411 profile set up. Safety score reviewed on FMCSA. At least three brokers set up and approved in their system.\n\nMissing any of these and you will hit delays at the worst possible time. [COMPANY] walks new carriers through all of it before the first load ever moves.`,
    hashtags: ['#newauthority', '#owneroperator', '#FMCSA', '#trucking'],
  },
  {
    id: 'new-06',
    category: 'New Authority',
    bestFor: 'Facebook — New Authority and CDL Groups',
    text: `If you are new to your authority and feeling overwhelmed by the admin side — that is completely normal and it does not mean you made a mistake.\n\nThe business side of running a carrier operation is a full-time job on its own. Most drivers did not sign up to also be a logistics coordinator, paperwork manager, and rate analyst.\n\nThat is why dispatch exists. [COMPANY] specializes in helping new carriers skip the learning curve and start running profitably.`,
    hashtags: ['#newauthority', '#owneroperator', '#trucking', '#dispatch'],
  },
  {
    id: 'new-07',
    category: 'New Authority',
    bestFor: 'Facebook — New Authority and CDL Groups',
    text: `Six months into your authority is a good time to pull your CSA scores on the FMCSA portal and make sure everything looks clean.\n\nOne preventable violation in your first year can follow you for 24 months and make certain brokers hesitate. Better to catch it early and understand what it means for your operation.\n\nIf you are not sure how to read your scores or what they mean for your business, [COMPANY] is happy to walk through it with you. No strings attached.`,
    hashtags: ['#newauthority', '#CSA', '#FMCSA', '#owneroperator', '#trucking'],
  },

  // ── Trust (5) ──────────────────────────────────────────────────────────────
  {
    id: 'trust-01',
    category: 'Trust',
    bestFor: 'Facebook Page and LinkedIn',
    text: `[COMPANY] works with a small roster of carriers intentionally.\n\nWe are not a load board with a dispatcher label stuck on it. We want to know your truck, your lanes, your home time needs, and what a good week looks like for you specifically.\n\nThat level of attention is only possible when you are not spread across a hundred carriers. Small roster, real relationships, better outcomes.`,
    hashtags: ['#dispatch', '#owneroperator', '#trucking', '#truckingbusiness'],
  },
  {
    id: 'trust-02',
    category: 'Trust',
    bestFor: 'Facebook Page and LinkedIn',
    text: `We have been working with brokers long enough to know which ones pay in 30 days, which ones push to 45, and which ones are not worth the headache at any rate.\n\nThat knowledge belongs to every carrier who works with [COMPANY]. You do not have to learn every lesson the hard way. We already learned most of them.`,
    hashtags: ['#dispatch', '#owneroperator', '#trucking', '#brokers'],
  },
  {
    id: 'trust-03',
    category: 'Trust',
    bestFor: 'Facebook Page and LinkedIn',
    text: `Transparency is the foundation of how [COMPANY] operates.\n\nYou see every load offer before we book it. You approve every rate confirmation. You know what we are doing and why.\n\nNo load gets booked without your sign-off. Your truck, your business, your call — every time. We work for you, and that means you stay informed.`,
    hashtags: ['#dispatch', '#owneroperator', '#trucking', '#transparency'],
  },
  {
    id: 'trust-04',
    category: 'Trust',
    bestFor: 'Facebook Page and LinkedIn',
    text: `Our business grows when your business grows. That alignment is not a talking point — it is the actual structure of how we get paid.\n\nIf you are earning more, we earn more. If we are not finding you better loads and better rates than you could get on your own, we have not earned our fee.\n\nThat is the model at [COMPANY]. Simple and honest.`,
    hashtags: ['#dispatch', '#owneroperator', '#trucking'],
  },
  {
    id: 'trust-05',
    category: 'Trust',
    bestFor: 'Facebook Page and LinkedIn',
    text: `We have worked with carriers who started with a single truck and a brand new MC number and grew into small fleets over a few years.\n\nThe ones who scaled fastest all did the same thing: they stopped trying to do every job themselves and focused on what they were actually best at — driving and running their operation.\n\n[COMPANY] handles the business side. That is what we are here for.`,
    hashtags: ['#dispatch', '#owneroperator', '#trucking', '#growth'],
  },

  // ── Freight Market (5) ────────────────────────────────────────────────────
  {
    id: 'mkt-01',
    category: 'Freight Market',
    bestFor: 'Facebook — Owner Operator Groups',
    text: `Market note for dry van carriers: the midwest-to-southeast corridor has been consistently strong for outbound freight.\n\nIf you are running coastal and fighting for loads right now, repositioning for even one week can reset your rate expectations. Sometimes the best lane move is not the obvious one.\n\n[COMPANY] tracks rates weekly across major corridors. Ask us what your lanes are actually paying.`,
    hashtags: ['#dryvan', '#owneroperator', '#trucking', '#freight', '#lanes'],
  },
  {
    id: 'mkt-02',
    category: 'Freight Market',
    bestFor: 'Facebook — Owner Operator Groups',
    text: `Flatbed carriers: infrastructure and construction freight has been steady through several corridors where spot rates have softened.\n\nIf you have not tapped into steel, lumber, and machinery lanes yet, those broker relationships are worth building. The volume is there and the rates have held better than general van freight in certain markets.\n\n[COMPANY] has direct broker contacts in these categories. Message us if you want to know more.`,
    hashtags: ['#flatbed', '#owneroperator', '#trucking', '#infrastructure'],
  },
  {
    id: 'mkt-03',
    category: 'Freight Market',
    bestFor: 'Facebook — Owner Operator Groups',
    text: `Load boards are not the only way to find freight, and they are often not the best way.\n\nDirect broker relationships — even just two or three good ones — change the business. Consistent volume, better rates, and you are not competing with 20 other carriers on every post.\n\n[COMPANY] helps carriers identify and build those relationships over time. It takes longer than a load board search, but the long-term payoff is real.`,
    hashtags: ['#freight', '#owneroperator', '#trucking', '#directshipper'],
  },
  {
    id: 'mkt-04',
    category: 'Freight Market',
    bestFor: 'Facebook — Owner Operator Groups',
    text: `Fuel prices affect every carrier differently depending on how your fuel surcharge is structured.\n\nIf your FSC is not tied to a published index or is not included clearly in your rate confirmation language, you may be absorbing cost increases that should be passed through to the shipper. That is a quiet margin killer that a lot of carriers do not notice until the numbers are already off.\n\n[COMPANY] helps carriers structure their surcharge correctly. Worth a conversation if you are not sure where you stand.`,
    hashtags: ['#fuel', '#FSC', '#owneroperator', '#trucking', '#truckingbusiness'],
  },
  {
    id: 'mkt-05',
    category: 'Freight Market',
    bestFor: 'Facebook — Owner Operator Groups',
    text: `Spot rates go up and down — that is just the market. The carriers who do best through the soft cycles are not necessarily the ones chasing the highest spot rate number.\n\nThey are the ones with strong broker relationships so they get calls when loads open up. Diversified lanes so a soft corridor does not stall the whole operation. Low deadhead so the numbers work even when the rates are not great.\n\n[COMPANY] helps carriers build that foundation before they need it.`,
    hashtags: ['#freight', '#owneroperator', '#trucking', '#spotrate'],
  },

  // ── Dry Van (8) ────────────────────────────────────────────────────────────
  {
    id: 'dv-01',
    category: 'Dry Van',
    bestFor: 'Facebook — Dry Van and Owner Operator Groups',
    text: `Dry van carriers: what does your lane portfolio look like right now?\n\nA lot of carriers get comfortable in one or two corridors and end up stuck when rates soften on those lanes. Diversifying your lane mix takes a little upfront work but it smooths out the income swings considerably.\n\n[COMPANY] helps dry van operators map out lane strategies based on what the market is actually paying, not just what they have always run.`,
    hashtags: ['#dryvan', '#owneroperator', '#trucking', '#lanes'],
  },
  {
    id: 'dv-02',
    category: 'Dry Van',
    bestFor: 'Facebook — Owner Operator Groups',
    text: `The midwest and southeast corridors have been some of the more consistent lanes for dry van freight over the past year.\n\nTX-IL, TN-OH, GA-MO — these are bread-and-butter dry van routes with steady broker activity and above-average load availability. If you are based in or passing through these markets, you have options.\n\n[COMPANY] has strong broker relationships on these corridors. DM us your home base and we can talk specifics.`,
    hashtags: ['#dryvan', '#owneroperator', '#trucking', '#midwest', '#southeast'],
  },
  {
    id: 'dv-03',
    category: 'Dry Van',
    bestFor: 'Facebook — Owner Operator Groups',
    text: `Dry van is the most competitive equipment type on the board — which means negotiation skill matters more for a van driver than almost anyone else.\n\nBrokers know there are always van carriers looking for loads. They use that to their advantage. Knowing the DAT rate average for your lane before you pick up the phone is the minimum starting point.\n\n[COMPANY] negotiates dry van loads every day. If you want someone who knows when to push and when to book, that is what we do.`,
    hashtags: ['#dryvan', '#owneroperator', '#dispatch', '#trucking'],
  },
  {
    id: 'dv-04',
    category: 'Dry Van',
    bestFor: 'Facebook — Owner Operator Groups',
    text: `Drop and hook loads are not always listed as drop and hook on the board.\n\nIf you are a dry van carrier and spending too much time at live loads, ask your dispatcher or your brokers specifically what live versus drop availability looks like before booking. Some brokers have pre-loaded trailer pools that never get advertised that way.\n\n[COMPANY] asks these questions as a matter of course when booking for our dry van carriers.`,
    hashtags: ['#dryvan', '#owneroperator', '#trucking', '#dropandhook'],
  },
  {
    id: 'dv-05',
    category: 'Dry Van',
    bestFor: 'Facebook — Dry Van Groups',
    text: `For dry van operators wondering whether to go OTR or stay regional: there is no universal right answer, and anyone who tells you otherwise is selling something.\n\nOTR means more miles and potentially more gross, but also more time away and more wear on the truck. Regional means more home time and predictable lanes, but usually less total revenue.\n\nThe right choice depends on your cost structure and what you actually want out of this. [COMPANY] helps carriers figure out what makes sense for their specific situation.`,
    hashtags: ['#dryvan', '#owneroperator', '#trucking', '#OTR', '#regional'],
  },
  {
    id: 'dv-06',
    category: 'Dry Van',
    bestFor: 'Facebook — Owner Operator Groups',
    text: `If you run dry van and you are not regularly checking the DAT rate index before calling on loads, you are negotiating blind.\n\nThat index tells you what similar loads on your lane paid in the last 15 and 30 days. It is the difference between knowing your counter is reasonable and just guessing.\n\n[COMPANY] uses this data on every call. Our dry van carriers benefit from that on every load, not just occasionally.`,
    hashtags: ['#dryvan', '#owneroperator', '#trucking', '#rates'],
  },
  {
    id: 'dv-07',
    category: 'Dry Van',
    bestFor: 'Facebook — Owner Operator Groups',
    text: `Dry van carriers: how are you handling backhauls right now?\n\nGetting out of certain markets empty is one of the biggest margin killers in this business. A $3.00 outbound rate means a lot less if you deadhead 300 miles to get back to a decent lane.\n\n[COMPANY] builds backhaul planning into every load search for our dry van operators. The round trip matters as much as the individual load.`,
    hashtags: ['#dryvan', '#owneroperator', '#trucking', '#deadhead', '#backhaul'],
  },
  {
    id: 'dv-08',
    category: 'Dry Van',
    bestFor: 'Facebook — Owner Operator Groups',
    text: `Consistent freight is more valuable than peak freight.\n\nA dry van carrier who runs at $2.40 per mile every week with minimal gaps is usually in better shape than one who hits $3.20 occasionally but sits for days in between.\n\n[COMPANY] focuses on building consistent load volume for our dry van carriers, not just chasing the high rate on any given day. Consistency is what makes the business work long term.`,
    hashtags: ['#dryvan', '#owneroperator', '#trucking', '#dispatch'],
  },

  // ── Reefer (7) ────────────────────────────────────────────────────────────
  {
    id: 'ref-01',
    category: 'Reefer',
    bestFor: 'Facebook — Reefer and Owner Operator Groups',
    text: `Reefer carriers have a real advantage in the current market: temperature-controlled freight commands a premium that general van freight does not, and that gap has been consistent.\n\nIf you are running reefer and not regularly hitting $3.00 per mile on your outbound lanes, it is worth looking at whether your broker relationships and negotiation approach are holding you back.\n\n[COMPANY] works with reefer operators and knows what these lanes should pay.`,
    hashtags: ['#reefer', '#owneroperator', '#trucking', '#dispatch'],
  },
  {
    id: 'ref-02',
    category: 'Reefer',
    bestFor: 'Facebook — Reefer Groups',
    text: `Temperature documentation is one of those things that seems like extra paperwork until you need it.\n\nA broker or receiver disputes a delivery because of a temperature variance claim and your continuous temp log is the thing that protects you. Most disputes are resolved quickly when the data is clean and complete.\n\n[COMPANY] reminds reefer carriers to pull and save temp records on every load. It is a small habit that matters when something goes sideways.`,
    hashtags: ['#reefer', '#owneroperator', '#trucking', '#compliance'],
  },
  {
    id: 'ref-03',
    category: 'Reefer',
    bestFor: 'Facebook — Reefer and Owner Operator Groups',
    text: `Produce lanes and grocery distribution are some of the most consistent reefer freight in the country, but they also have tight delivery windows and zero tolerance for temperature excursions.\n\nThe carriers who build strong relationships in those lanes are the ones who run clean, communicate proactively, and never miss a window. The rates reflect that reliability.\n\n[COMPANY] places carriers in produce and grocery lanes when the track record supports it.`,
    hashtags: ['#reefer', '#owneroperator', '#trucking', '#produce'],
  },
  {
    id: 'ref-04',
    category: 'Reefer',
    bestFor: 'Facebook — Owner Operator Groups',
    text: `Reefer operators: your equipment costs more to run and maintain than a dry van. Your fuel costs are higher because the unit runs continuously. Your insurance is typically higher.\n\nAll of that is why your floor rate needs to be higher than a dry van carrier's. If you are booking loads at dry van prices on reefer equipment, the math does not work.\n\n[COMPANY] makes sure our reefer carriers hold their rate floor and do not get pressured into underpriced loads.`,
    hashtags: ['#reefer', '#owneroperator', '#trucking', '#rpm', '#rates'],
  },
  {
    id: 'ref-05',
    category: 'Reefer',
    bestFor: 'Facebook — Reefer Groups',
    text: `The pharmaceutical and medical supply lanes are among the best-paying reefer freight in the market, but they also have strict compliance requirements.\n\nCarriers who want to run pharma freight typically need specific certifications, temperature range documentation, and clean compliance records. It takes some upfront setup but the rates justify it for the right carrier.\n\n[COMPANY] has broker connections in this category and can help qualified reefer operators get positioned for it.`,
    hashtags: ['#reefer', '#owneroperator', '#trucking', '#pharma'],
  },
  {
    id: 'ref-06',
    category: 'Reefer',
    bestFor: 'Facebook — Owner Operator Groups',
    text: `For reefer carriers running southeast and coastal corridors: the produce market out of Florida and Georgia creates strong outbound volume seasonally, but the return freight can be inconsistent.\n\nPlanning the backhaul before you commit to the outbound is especially important in these markets. A great rate south does not mean much if you are empty or at a bad rate heading back north.\n\n[COMPANY] plans round trips for our reefer carriers, not just individual loads.`,
    hashtags: ['#reefer', '#owneroperator', '#trucking', '#southeast', '#backhaul'],
  },
  {
    id: 'ref-07',
    category: 'Reefer',
    bestFor: 'Facebook — Reefer and Owner Operator Groups',
    text: `Reefer carriers who want consistent freight need to be registered and approved with grocery chain distribution brokers — not just the spot market boards.\n\nThose relationships take longer to build but they provide steadier volume and usually better rates than chasing spot freight. It is one of the differences between a reefer carrier who is always scrambling and one who runs on a predictable schedule.\n\n[COMPANY] helps reefer operators build the right broker network for long-term consistency.`,
    hashtags: ['#reefer', '#owneroperator', '#trucking', '#dispatch', '#grocery'],
  },

  // ── Flatbed (8) ───────────────────────────────────────────────────────────
  {
    id: 'fb-01',
    category: 'Flatbed',
    bestFor: 'Facebook — Flatbed and Owner Operator Groups',
    text: `Flatbed operators are dealing with a different kind of market than van drivers right now.\n\nConstruction and infrastructure freight has held up better than general commodities in several corridors. If you are running flatbed and not already tapping into steel, lumber, and building materials lanes, those relationships are worth building.\n\n[COMPANY] has broker connections in these categories that do not always show up on the public boards.`,
    hashtags: ['#flatbed', '#owneroperator', '#trucking', '#construction'],
  },
  {
    id: 'fb-02',
    category: 'Flatbed',
    bestFor: 'Facebook — Flatbed Groups',
    text: `Tarping is one of those things that adds time and cost to a load that a lot of flatbed carriers do not fully account for when they are evaluating a rate.\n\nA load that requires tarping needs to compensate for that extra work and the gear that goes with it. If you are regularly booking tarped loads at the same rate as no-tarp freight, you are leaving money on the table.\n\n[COMPANY] factors tarping and strapping requirements into every rate negotiation for our flatbed carriers.`,
    hashtags: ['#flatbed', '#owneroperator', '#trucking', '#rates'],
  },
  {
    id: 'fb-03',
    category: 'Flatbed',
    bestFor: 'Facebook — Flatbed and Owner Operator Groups',
    text: `Oversize and overweight permits are a specialty that commands a premium, but they also require setup time, route planning, and sometimes escort coordination.\n\nFlatbed carriers who do oversized loads well can consistently earn above-market rates because most carriers do not want the complexity. If you have experience with OW/OS freight and want to do more of it, it is worth building those broker relationships intentionally.\n\n[COMPANY] can connect qualified flatbed operators with OW/OS brokers in several corridors.`,
    hashtags: ['#flatbed', '#owneroperator', '#trucking', '#oversize', '#OW'],
  },
  {
    id: 'fb-04',
    category: 'Flatbed',
    bestFor: 'Facebook — Flatbed Groups',
    text: `Steel coil and pipe are some of the more demanding flatbed loads to rig correctly, but they pay well and the volume is there if you have the equipment and the chaining skills.\n\nCarriers who run these loads consistently build strong relationships with steel brokers and often get repeat business ahead of the open market.\n\n[COMPANY] places flatbed carriers in coil and pipe lanes when the setup is right. If you run this freight and want more of it, let us know.`,
    hashtags: ['#flatbed', '#owneroperator', '#trucking', '#steel', '#coil'],
  },
  {
    id: 'fb-05',
    category: 'Flatbed',
    bestFor: 'Facebook — Flatbed and Owner Operator Groups',
    text: `Flatbed carriers in the southeast: the lumber and building materials market has been more resilient than a lot of people expected.\n\nResidential construction may have slowed in some markets but the renovation and commercial building activity has kept flatbed demand steady on several key corridors. The rates have held better than spot van freight in this cycle.\n\n[COMPANY] tracks these rates and has broker connections in this category. Message us if you want to know what your lanes are paying right now.`,
    hashtags: ['#flatbed', '#owneroperator', '#trucking', '#lumber', '#southeast'],
  },
  {
    id: 'fb-06',
    category: 'Flatbed',
    bestFor: 'Facebook — Owner Operator Groups',
    text: `One thing that separates a strong flatbed dispatcher from an average one: knowing how to read a load for hidden costs.\n\nA high-rate flatbed load can become a losing load when you factor in the tarp requirement, multiple stops, extended loading time, and a difficult delivery location. Those details matter and they need to be in the rate, not absorbed by the carrier.\n\n[COMPANY] reads every flatbed load carefully before presenting it to our carriers.`,
    hashtags: ['#flatbed', '#owneroperator', '#trucking', '#dispatch'],
  },
  {
    id: 'fb-07',
    category: 'Flatbed',
    bestFor: 'Facebook — Flatbed Groups',
    text: `Agricultural equipment and farm machinery moves are specialty flatbed freight that not many carriers run, but the ones who do tend to find consistent volume and decent rates.\n\nThis freight is seasonal and tends to concentrate in the midwest and southeast, but the relationships with ag brokers are worth having. Once you are set up and trusted in that network, the loads come to you.\n\n[COMPANY] has broker contacts in the agricultural equipment category.`,
    hashtags: ['#flatbed', '#owneroperator', '#trucking', '#agriculture', '#equipment'],
  },
  {
    id: 'fb-08',
    category: 'Flatbed',
    bestFor: 'Facebook — Flatbed and Owner Operator Groups',
    text: `Flatbed carriers have one advantage that van drivers often underestimate: the perception of difficulty.\n\nBrokers know flatbed loads are harder to place because fewer carriers run them. That means you have more leverage in rate negotiations than a dry van carrier competing against a dozen other van operators on the same load.\n\nIf you are not using that leverage, [COMPANY] can help. We know when to hold out and when the market will support a premium.`,
    hashtags: ['#flatbed', '#owneroperator', '#trucking', '#rates', '#dispatch'],
  },

  // ── Step Deck (6) ─────────────────────────────────────────────────────────
  {
    id: 'sd-01',
    category: 'Step Deck',
    bestFor: 'Facebook — Flatbed and Specialty Groups',
    text: `Step deck operators: your equipment opens doors that a standard flatbed cannot.\n\nLoads that are too tall for a standard flatbed and too large for a van — that is your lane. Heavy construction equipment, agricultural machinery, manufactured components — freight that other carriers cannot take without an oversize permit.\n\n[COMPANY] works with step deck carriers and knows the brokers who regularly move this category of freight.`,
    hashtags: ['#stepdeck', '#owneroperator', '#trucking', '#specialty'],
  },
  {
    id: 'sd-02',
    category: 'Step Deck',
    bestFor: 'Facebook — Flatbed and Specialty Groups',
    text: `One of the underappreciated things about step deck freight is how well it holds up when the general spot market softens.\n\nSpecialty freight has fewer qualified carriers, which means rates do not drop as dramatically during slow cycles. If you are running step deck and evaluating whether to stay in that category or transition to standard flatbed, the rate stability argument is real.\n\n[COMPANY] can run through the numbers for your specific setup if you want to think through that decision.`,
    hashtags: ['#stepdeck', '#owneroperator', '#trucking', '#rates'],
  },
  {
    id: 'sd-03',
    category: 'Step Deck',
    bestFor: 'Facebook — Specialty Trucking Groups',
    text: `Step deck carriers who want to run industrial and manufacturing equipment freight need to have a clean track record with careful rigging and damage-free deliveries.\n\nThis freight is high-value and the shippers who move it regularly remember which carriers did the job right. One good delivery for a major manufacturer can turn into a steady lane.\n\n[COMPANY] helps step deck operators get introduced to those accounts the right way.`,
    hashtags: ['#stepdeck', '#owneroperator', '#trucking', '#industrial'],
  },
  {
    id: 'sd-04',
    category: 'Step Deck',
    bestFor: 'Facebook — Flatbed and Specialty Groups',
    text: `For step deck carriers: the wind energy and renewable infrastructure market has created a consistent category of oversized component freight in certain regions.\n\nSolar panel skids, turbine components, and large electrical equipment all move on step decks. The volume has been steady and the specialized nature of the loads keeps the carrier pool smaller.\n\n[COMPANY] has broker connections in this category for carriers who want to explore it.`,
    hashtags: ['#stepdeck', '#owneroperator', '#trucking', '#renewable', '#energy'],
  },
  {
    id: 'sd-05',
    category: 'Step Deck',
    bestFor: 'Facebook — Owner Operator Groups',
    text: `Step deck operators: do you actually know the rate premium your equipment commands over standard flatbed for the same origin-destination?\n\nIn most markets it is meaningful — somewhere between 10 and 25 percent for loads that specifically require your equipment. If your dispatcher is not asking for that premium on eligible loads, they are leaving money behind.\n\n[COMPANY] negotiates the step deck premium on every load where it applies.`,
    hashtags: ['#stepdeck', '#owneroperator', '#trucking', '#rates', '#dispatch'],
  },
  {
    id: 'sd-06',
    category: 'Step Deck',
    bestFor: 'Facebook — Specialty Trucking Groups',
    text: `If you run step deck and you are not already registered with the specialized brokers who move oversized equipment, that is worth fixing.\n\nThe general load boards surface a fraction of the step deck freight that is actually moving. The good loads in this category tend to move through relationships before they ever hit a public board.\n\n[COMPANY] can help qualified step deck operators get positioned with the right brokers for their lanes and equipment.`,
    hashtags: ['#stepdeck', '#owneroperator', '#trucking', '#dispatch', '#specialty'],
  },

  // ── Hotshot (6) ───────────────────────────────────────────────────────────
  {
    id: 'hs-01',
    category: 'Hotshot',
    bestFor: 'Facebook — Hotshot and Owner Operator Groups',
    text: `Hotshot carriers occupy a specific niche that the big loads cannot fill: time-sensitive, smaller freight that needs to move fast and cannot wait for a full truck.\n\nOil field parts, construction equipment components, last-minute industrial supplies — this is hotshot territory. The rates per mile can be strong because you are solving an urgency problem, not just moving freight.\n\n[COMPANY] works with hotshot operators and understands how to position your equipment for the loads that pay what the urgency is worth.`,
    hashtags: ['#hotshot', '#owneroperator', '#trucking', '#dispatch'],
  },
  {
    id: 'hs-02',
    category: 'Hotshot',
    bestFor: 'Facebook — Hotshot Groups',
    text: `Oil field hotshot is some of the best-paying work in this category, but it runs on relationships more than almost any other freight type.\n\nEnergy companies and oilfield service providers need carriers they can count on at 2 AM when a part needs to be somewhere by morning. The carriers who build that reputation get repeat calls. The ones who show up late or cannot be reached lose it fast.\n\n[COMPANY] helps hotshot operators build and maintain those critical relationships.`,
    hashtags: ['#hotshot', '#owneroperator', '#trucking', '#oilfield'],
  },
  {
    id: 'hs-03',
    category: 'Hotshot',
    bestFor: 'Facebook — Hotshot and Owner Operator Groups',
    text: `Hotshot operators: are you on all the load boards that matter for your category?\n\nBeyond DAT and Truckstop, there are industry-specific boards and broker networks for oilfield, construction, and industrial freight that surface loads you will never see on the general boards.\n\n[COMPANY] knows where hotshot freight actually moves in different markets. If you want to make sure you are not missing available loads, let us talk.`,
    hashtags: ['#hotshot', '#owneroperator', '#trucking', '#loadboard'],
  },
  {
    id: 'hs-04',
    category: 'Hotshot',
    bestFor: 'Facebook — Hotshot Groups',
    text: `One of the challenges unique to hotshot carriers is that the high rate per mile on small loads sometimes masks how the math actually works.\n\nFuel efficiency is lower on some hotshot configurations. Deadhead to pickup can be significant. Load size affects how efficiently you use your cargo capacity.\n\n[COMPANY] helps hotshot operators look at cost per loaded mile and actual take-home, not just the rate on any given load.`,
    hashtags: ['#hotshot', '#owneroperator', '#trucking', '#rpm'],
  },
  {
    id: 'hs-05',
    category: 'Hotshot',
    bestFor: 'Facebook — Hotshot and Owner Operator Groups',
    text: `Hotshot carriers who want consistent freight rather than random calls need to think about their business like a route, not a series of one-off loads.\n\nBuilding relationships with three or four shippers who have recurring freight need is completely different from chasing spot loads every day. It takes longer to set up but it is a fundamentally more stable business.\n\n[COMPANY] helps hotshot operators identify and pursue those direct relationships in their operating region.`,
    hashtags: ['#hotshot', '#owneroperator', '#trucking', '#dispatch', '#directshipper'],
  },
  {
    id: 'hs-06',
    category: 'Hotshot',
    bestFor: 'Facebook — Hotshot Groups',
    text: `For hotshot carriers in Texas, Oklahoma, and the surrounding energy states: the oilfield freight market has been one of the more active categories even when general freight has slowed.\n\nIf you are in this region and not yet tapping into energy sector freight, it is worth understanding what that market looks like. The loads are demanding but the rates reflect that.\n\n[COMPANY] has connections in the oilfield logistics space. Message us if you want to learn more about getting positioned for this freight.`,
    hashtags: ['#hotshot', '#owneroperator', '#trucking', '#oilfield', '#texas'],
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
  'Driver Recruitment': 'bg-orange-900/40 text-orange-400 border-orange-700/40',
  'Value Prop':         'bg-blue-900/40 text-blue-400 border-blue-700/40',
  'Engagement':         'bg-green-900/40 text-green-400 border-green-700/40',
  'New Authority':      'bg-purple-900/40 text-purple-400 border-purple-700/40',
  'Trust':              'bg-yellow-900/30 text-yellow-500 border-yellow-700/30',
  'Freight Market':     'bg-cyan-900/30 text-cyan-400 border-cyan-700/30',
  'Dry Van':            'bg-sky-900/30 text-sky-400 border-sky-700/30',
  'Reefer':             'bg-teal-900/30 text-teal-400 border-teal-700/30',
  'Flatbed':            'bg-amber-900/30 text-amber-400 border-amber-700/30',
  'Step Deck':          'bg-rose-900/30 text-rose-400 border-rose-700/30',
  'Hotshot':            'bg-indigo-900/30 text-indigo-400 border-indigo-700/30',
}
