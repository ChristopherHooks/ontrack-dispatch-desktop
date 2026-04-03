// ---------------------------------------------------------------------------
// Lead Nurture Sequences
// Predefined multi-touch follow-up sequences for lead outreach.
// ---------------------------------------------------------------------------

export interface NurtureStep {
  stepNumber:   number         // 1-based
  label:        string         // e.g. "First Contact"
  method:       string         // Call | SMS | Email | DM
  daysFromPrev: number         // days after previous step (0 = same day as sequence start)
  action:       string         // short imperative describing what to do
  scriptHint:   string         // quick cue for the dispatcher
  targetStatus: string         // which lead status this step aims to move toward
}

export interface NurtureSequence {
  id:          string
  name:        string
  description: string
  steps:       NurtureStep[]
}

// ---------------------------------------------------------------------------
// Sequence definitions
// ---------------------------------------------------------------------------

export const NURTURE_SEQUENCES: NurtureSequence[] = [
  {
    id:          'standard-7day',
    name:        'Standard 7-Day',
    description: 'The default warm-up sequence for a fresh lead. 5 touches over 7 days.',
    steps: [
      {
        stepNumber:   1,
        label:        'First Call',
        method:       'Call',
        daysFromPrev: 0,
        action:       'Make the first contact call',
        scriptHint:   'Intro: who you are, what you do, 60-second ask. Goal: qualify equipment & lanes.',
        targetStatus: 'Contacted',
      },
      {
        stepNumber:   2,
        label:        'SMS Follow-Up',
        method:       'SMS',
        daysFromPrev: 1,
        action:       'Send a quick intro text',
        scriptHint:   '"Hey [name], this is Chris from OnTrack — tried to reach you. I work with owner-ops to find loads. Happy to chat if you get a minute. [number]"',
        targetStatus: 'Attempted',
      },
      {
        stepNumber:   3,
        label:        'Email Intro',
        method:       'Email',
        daysFromPrev: 1,
        action:       'Send the intro email with services overview',
        scriptHint:   'Use the intro email template. Keep it to 3 short paragraphs. CTA: reply or call.',
        targetStatus: 'Attempted',
      },
      {
        stepNumber:   4,
        label:        'Second Call',
        method:       'Call',
        daysFromPrev: 2,
        action:       'Second call — reference the email',
        scriptHint:   '"I sent you an email a couple days ago — wanted to make sure you saw it. Did you get a chance to look it over?"',
        targetStatus: 'Contacted',
      },
      {
        stepNumber:   5,
        label:        'Final Touch',
        method:       'SMS',
        daysFromPrev: 3,
        action:       'One last text before moving to long-term nurture',
        scriptHint:   '"Hey [name] — just wrapping up outreach for this week. If you ever need help finding loads, I\'m here. — Chris, OnTrack Hauling"',
        targetStatus: 'Attempted',
      },
    ],
  },
  {
    id:          'warm-14day',
    name:        'Warm 14-Day',
    description: 'For leads who have been contacted but not yet committed. Lighter cadence with higher-value touches.',
    steps: [
      {
        stepNumber:   1,
        label:        'Check-In Call',
        method:       'Call',
        daysFromPrev: 0,
        action:       'Reconnect and gauge current situation',
        scriptHint:   '"Hey [name], it\'s Chris. We spoke a couple weeks back — I just wanted to check in and see if anything has changed with your loads."',
        targetStatus: 'Contacted',
      },
      {
        stepNumber:   2,
        label:        'Value Text',
        method:       'SMS',
        daysFromPrev: 3,
        action:       'Share a recent lane win via text',
        scriptHint:   '"Moved a [trailer type] from [origin] to [dest] at $X.XX/mi last week. Thought of you — that\'s the kind of load I\'m finding for my carriers right now."',
        targetStatus: 'Interested',
      },
      {
        stepNumber:   3,
        label:        'Agreement Nudge',
        method:       'Call',
        daysFromPrev: 4,
        action:       'Ask directly about moving forward',
        scriptHint:   '"I\'d love to get you set up. The agreement is two pages — I can send it right now and we can start looking for loads this week. What do you think?"',
        targetStatus: 'Interested',
      },
      {
        stepNumber:   4,
        label:        'Send Agreement',
        method:       'Email',
        daysFromPrev: 2,
        action:       'Send the dispatch agreement for review',
        scriptHint:   'Attach the agreement PDF. Subject: "OnTrack Dispatch Agreement — [name]". Keep email very short.',
        targetStatus: 'Agreement Sent',
      },
      {
        stepNumber:   5,
        label:        'Sign-Off Follow-Up',
        method:       'Call',
        daysFromPrev: 5,
        action:       'Follow up on the agreement',
        scriptHint:   '"I sent the agreement about a week ago — did you get a chance to look it over? Any questions I can answer?"',
        targetStatus: 'Agreement Sent',
      },
    ],
  },
  {
    id:          'reactivation',
    name:        'Re-Activation',
    description: 'For cold or dormant leads (60+ days inactive). 3-touch re-engagement.',
    steps: [
      {
        stepNumber:   1,
        label:        'Re-Engagement Call',
        method:       'Call',
        daysFromPrev: 0,
        action:       'Re-introduce after a long gap',
        scriptHint:   '"Hey [name] — I know it\'s been a while. I wanted to reach back out because I\'ve been seeing strong rates in your area and thought of you."',
        targetStatus: 'Contacted',
      },
      {
        stepNumber:   2,
        label:        'Re-Engagement SMS',
        method:       'SMS',
        daysFromPrev: 3,
        action:       'Send a short re-engagement text',
        scriptHint:   '"Hey [name], Chris from OnTrack. Rates on [lane] have been strong lately. Worth a quick chat if you\'re looking. — [number]"',
        targetStatus: 'Attempted',
      },
      {
        stepNumber:   3,
        label:        'Final Re-Engagement Email',
        method:       'Email',
        daysFromPrev: 4,
        action:       'Last touch before archiving',
        scriptHint:   '"If the timing is off, no problem at all. I\'ll leave the door open — reach out whenever. I\'d still love to work with you."',
        targetStatus: 'Attempted',
      },
    ],
  },
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Get a sequence by ID */
export function getSequence(id: string): NurtureSequence | undefined {
  return NURTURE_SEQUENCES.find(s => s.id === id)
}

/**
 * Given a sequence and the number of completed outreach attempts so far,
 * return the current step (1-based), or null if sequence is complete.
 */
export function currentStepIndex(sequence: NurtureSequence, attemptsCompleted: number): number {
  return Math.min(attemptsCompleted, sequence.steps.length)
}

/**
 * Returns the next NurtureStep, or null if all steps are complete.
 */
export function nextStep(sequence: NurtureSequence, attemptsCompleted: number): NurtureStep | null {
  const idx = attemptsCompleted
  if (idx >= sequence.steps.length) return null
  return sequence.steps[idx]
}

/**
 * Compute the target date for the next step based on when the last outreach happened.
 * Returns a YYYY-MM-DD string.
 */
export function nextStepDate(step: NurtureStep, lastContactDate: string | null): string {
  const base = lastContactDate ? new Date(lastContactDate + 'T12:00:00') : new Date()
  base.setDate(base.getDate() + Math.max(step.daysFromPrev, 1))
  return base.toISOString().split('T')[0]
}
