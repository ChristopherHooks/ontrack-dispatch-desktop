/**
 * Driver outreach message templates for the Prospect Drawer.
 * Supports {{name}} and {{company}} as merge fields.
 * Used in the Outreach tab of ProspectDrawer.
 */

export interface OutreachTemplate {
  id:       string
  label:    string     // Short label shown in the picker
  category: 'First Contact' | 'Follow-Up' | 'Re-Engage' | 'Agreement' | 'Other'
  channel:  'Facebook' | 'SMS' | 'Any'
  body:     string     // Message body — use {{name}} for prospect name
}

export const OUTREACH_TEMPLATES: OutreachTemplate[] = [

  // ── First Contact ──────────────────────────────────────────────────────────

  {
    id:       'first-fb-dm-short',
    label:    'First DM (Short)',
    category: 'First Contact',
    channel:  'Facebook',
    body:
      "Hey {{name}}, saw you in the group — are you currently looking for a dispatcher? " +
      "We work with owner-operators and small fleets. Happy to tell you more if you're open to it.",
  },
  {
    id:       'first-fb-dm-detail',
    label:    'First DM (Detailed)',
    category: 'First Contact',
    channel:  'Facebook',
    body:
      "Hey {{name}}, hope you're having a good week on the road. I run OnTrack Hauling Solutions — " +
      "we dispatch owner-ops and small fleets, handle all the broker negotiation, paperwork, and load " +
      "tracking so you can focus on driving. Our fee is a flat % of gross — no hidden charges. " +
      "Would you be open to a quick call to see if we'd be a good fit?",
  },
  {
    id:       'first-sms-intro',
    label:    'First SMS Intro',
    category: 'First Contact',
    channel:  'SMS',
    body:
      "Hi {{name}}, this is Chris from OnTrack Hauling Solutions. I got your number from a referral. " +
      "We dispatch owner-ops — looking to add a few quality drivers. " +
      "Do you have 5 min to chat about what we offer?",
  },
  {
    id:       'first-cold-call-voicemail',
    label:    'Cold Call Voicemail Script',
    category: 'First Contact',
    channel:  'Any',
    body:
      "Hi {{name}}, this is Chris at OnTrack Hauling Solutions. I came across your info and wanted to " +
      "reach out — we specialize in dispatching owner-operators and small fleets. If you're looking for " +
      "consistent loads or just want to compare options, give me a call back at [YOUR NUMBER]. " +
      "Thanks, talk soon.",
  },

  // ── Follow-Up ─────────────────────────────────────────────────────────────

  {
    id:       'followup-no-reply-fb',
    label:    'Follow-Up (No Reply)',
    category: 'Follow-Up',
    channel:  'Facebook',
    body:
      "Hey {{name}}, just circling back from my message last week. I know things get busy on the road — " +
      "no pressure at all. If you ever want to explore dispatch options, just shoot me a message. " +
      "Either way, safe travels!",
  },
  {
    id:       'followup-no-reply-sms',
    label:    'Follow-Up SMS (No Reply)',
    category: 'Follow-Up',
    channel:  'SMS',
    body:
      "Hey {{name}}, Chris from OnTrack again. Just checking in — did you get a chance to think about " +
      "dispatching? No rush, just want to make sure you have the info if you need it.",
  },
  {
    id:       'followup-after-call',
    label:    'Follow-Up After Call',
    category: 'Follow-Up',
    channel:  'Any',
    body:
      "Hey {{name}}, good talking with you earlier. As promised, here's a quick summary of what we offer:\n" +
      "- Flat dispatch fee, no hidden charges\n" +
      "- We find and negotiate loads, handle check calls, and manage paperwork\n" +
      "- You keep full authority — we work under your MC\n\n" +
      "Let me know if you have any questions or want to move forward with a trial load.",
  },
  {
    id:       'followup-interested-next-step',
    label:    'Interested — Next Step',
    category: 'Follow-Up',
    channel:  'Any',
    body:
      "Hey {{name}}, great chatting! The next step is just sending over a few docs — MC cert, W9, " +
      "and a signed dispatch agreement. Once we have those on file, we can start finding you loads " +
      "right away. Want me to send the agreement over now?",
  },

  // ── Re-Engage ─────────────────────────────────────────────────────────────

  {
    id:       'reengage-went-cold',
    label:    'Re-Engage (Went Cold)',
    category: 'Re-Engage',
    channel:  'Any',
    body:
      "Hey {{name}}, it's Chris from OnTrack. We talked a while back but things got busy — " +
      "just wanted to check in and see how things are going with loads. " +
      "If you ever need help finding consistent freight or want to offload the broker calls, " +
      "we're here. No pressure!",
  },
  {
    id:       'reengage-market-hook',
    label:    'Re-Engage (Market Hook)',
    category: 'Re-Engage',
    channel:  'Facebook',
    body:
      "Hey {{name}}, rates have been pretty solid in a few lanes lately — thought of you. " +
      "If you're looking for loads or a second opinion on what you should be running, " +
      "happy to hop on a call. Let me know!",
  },

  // ── Agreement ─────────────────────────────────────────────────────────────

  {
    id:       'agreement-send',
    label:    'Sending Agreement',
    category: 'Agreement',
    channel:  'Any',
    body:
      "Hey {{name}}, sending over the dispatch agreement now. It's straightforward — just covers " +
      "our dispatch fee, how we handle load booking, and termination terms (30 days notice, no lock-in). " +
      "Review it at your own pace and let me know if you have any questions. Once it's signed, " +
      "we can start looking for loads immediately!",
  },
  {
    id:       'agreement-followup',
    label:    'Agreement Follow-Up',
    category: 'Agreement',
    channel:  'Any',
    body:
      "Hey {{name}}, just following up on the dispatch agreement I sent over. " +
      "Did you get a chance to look at it? Happy to walk through any questions or make adjustments " +
      "before you sign. Let me know!",
  },
]

/**
 * Returns templates filtered by category and/or channel.
 */
export function filterTemplates(
  category?: OutreachTemplate['category'],
  channel?:  'Facebook' | 'SMS' | 'Any'
): OutreachTemplate[] {
  return OUTREACH_TEMPLATES.filter(t => {
    if (category && t.category !== category) return false
    if (channel && t.channel !== 'Any' && t.channel !== channel) return false
    return true
  })
}

/**
 * Merge {{name}} and {{company}} fields into a template body.
 */
export function mergeTemplate(template: OutreachTemplate, vars: { name?: string; company?: string }): string {
  return template.body
    .replace(/\{\{name\}\}/g,    vars.name    ?? 'there')
    .replace(/\{\{company\}\}/g, vars.company ?? 'your company')
}
