# Facebook Agents — How They Work

Last updated: 2026-03-17

There are three Facebook Agents in OnTrack. Each handles a distinct stage of
the Facebook lead-generation workflow. They live together on a single page
(Facebook Agents tab in the sidebar).

---

## The Big Picture

The overall flow is:

```
Facebook posts/DMs spotted by you
         |
         v
  [Agent 2: Lead Hunter]       <-- paste in posts you find manually
  Classify intent, extract
  contact info, draft reply
         |
         v (Convert to Lead)
  [Leads module]               <-- standard lead record created
         |
         v (or: message thread continues)
  [Agent 1: Conversation]      <-- track the DM thread through stages
  Generate replies, follow-ups,
  qualifying questions
         |
         v (when ready to close)
  Convert to Driver record in Drivers module

Meanwhile, on the posting/marketing side:

  [Agent 3: Content Queue]     <-- create and schedule posts to Facebook groups
  Generate posts by category,
  prevent repetition, track queue
```

None of the agents browse Facebook automatically. They are tools you use
manually: you paste content in, click a button to get an AI draft, review it,
then act. The app stores all records so nothing falls through the cracks.

---

## Agent 1: Conversation Agent

**What it is:** A pipeline tracker for active Facebook or Instagram DM threads.

**When to use it:** After you have made initial contact with a carrier through
Facebook and a back-and-forth conversation is in progress. This is for
managing the ongoing relationship, not the first contact.

**Stages a conversation moves through:**

| Stage | Meaning |
|---|---|
| New | You just added them, no reply yet |
| Replied | They responded to your message |
| Interested | They expressed genuine interest in dispatch |
| Call Ready | Ready for a phone call or formal onboarding |
| Converted | Moved to a driver record |
| Dead | Stopped responding or not a fit |

**What the AI buttons do:**

- **Generate Reply** — Drafts a 2-3 sentence DM reply based on where the
  conversation stands, what the carrier said last, their equipment type, and
  their location. Tone is natural and conversational, not salesy.

- **Generate Follow-Up** — Drafts a 1-2 sentence message to send after you
  have not heard back for a while. Friendly, not pushy.

- **Suggest Question** — Suggests a single qualifying question to ask next
  based on the current stage (e.g., ask about CDL if at Replied, ask about
  lanes if at Interested).

- **Handoff Summary** — Writes a 3-4 sentence summary of the carrier and
  where things stand. Useful before a phone call or when handing the
  lead off.

**Convert to Lead button:** Creates a standard lead record in the Leads module
pre-filled with name, phone, and source = Facebook. The conversation stays
linked so you can see both records.

**Database table:** `fb_conversations`

---

## Agent 2: Lead Hunter

**What it is:** A classifier and drafter for Facebook posts you find from
carriers looking for dispatch.

**When to use it:** When you are browsing Facebook groups and see a post from
someone who might be a carrier prospect. You paste the post text in, the AI
figures out what they want and drafts your reply.

**Workflow:**

1. Find a post in a Facebook group (e.g., "Looking for a reliable dispatcher,
   have a dry van, running southeast").
2. Paste it into Lead Hunter.
3. Click **Classify** — the AI reads the post and assigns an intent, extracts
   name, phone, location, and equipment if present, and suggests what to do
   next.
4. Review the classification. Click **Draft Comment** to generate a public
   reply on the post, or **Draft DM** to generate a private message.
5. Copy the draft, post it on Facebook manually.
6. If the person looks like a good lead, click **Convert to Lead** to create
   a lead record.

**Intent categories the AI assigns:**

| Intent | Priority | Meaning |
|---|---|---|
| Needs Dispatcher | Highest | Explicitly looking for dispatch help |
| Looking for Consistent Freight | High | Has a truck, wants steady loads |
| Empty Truck | Medium | Truck available, possibly interested |
| Needs Load | Medium | Looking for a single load, not dispatch |
| General Networking | Low | Not a specific ask |
| Low Intent | Low | Vague post, hard to tell |
| Ignore | Skip | Not relevant (broker, shipper, job ad, etc.) |

Leads converted from "Needs Dispatcher" or "Looking for Consistent Freight"
are automatically set to High priority in the Leads module. Others are Medium.

**Post statuses:**

| Status | Meaning |
|---|---|
| queued | Just added, not acted on yet |
| reviewed | You looked at it and drafted a response |
| converted | Turned into a lead record |
| ignored | Decided not to pursue |

**Database table:** `fb_posts`

---

## Agent 3: Content Queue

**What it is:** A tool for drafting, scheduling, and tracking the marketing
posts you publish in Facebook groups to attract carriers.

**When to use it:** For your daily or weekly posting routine in Facebook
groups. This is not for responding to individual people — it is for
broadcasting your services to groups.

**Categories it rotates through to avoid repetition:**

| Category | Purpose |
|---|---|
| Driver Recruitment | Direct ask for owner-operators to reach out |
| Educational | Tips on authority, factoring, finding loads |
| New Authority Tip | Advice specifically for new MC authority holders |
| Lane Availability | Announce lanes you are currently booking |
| Small Fleet Positioning | Why small fleets (1-3 trucks) win with a dispatcher |
| Trust / Credibility | Testimonials, experience, what sets you apart |
| Engagement Question | Ask the group a question to prompt comments |

**How the rotation works:** The app tracks which categories you have used in
the last 7 days. When you click **Suggest Category**, it returns whichever
category you have gone the longest without using. This prevents you from
posting the same type of content repeatedly.

**What the AI buttons do:**

- **Generate Post** — Writes a 2-4 sentence Facebook post for the selected
  category. Natural human tone, no hashtag spam, ends with a call to action.

- **Generate Variation** — Rewrites the current draft with a different opening
  or angle. Same core message, different words.

- **Suggest Replies** — Given your post text, generates 3 short replies you
  could use to respond to comments on the post.

**Post queue statuses:**

| Status | Meaning |
|---|---|
| draft | Written but not yet scheduled |
| scheduled | Has a date set, ready to post |
| posted | Manually marked as posted |
| skipped | Decided not to use it |

**Database table:** `fb_post_queue`

---

## AI Model Used

All three agents use Claude Haiku (fast, low-cost). Responses are short:
150-350 tokens. An API key must be set in Settings > AI Integration for the AI
buttons to work. Without a key, the buttons return an error and no request
is made.

---

## What the Agents Do NOT Do

- They do not access Facebook, browse groups, or send messages automatically.
- They do not monitor your inbox or notifications.
- They do not know your current leads unless you convert a record manually.
- They do not post anything without you reviewing and doing it yourself.

Everything is draft-and-review. You always see what the AI wrote before
anything leaves the app.

---

## Relationship Between the Three Agents

```
Agent 3 (Content Queue)
  Purpose: Get visibility in Facebook groups
  Output:  Post drafts you publish manually
  Result:  People see your posts and reply or DM you
           |
           v
Agent 2 (Lead Hunter)
  Purpose: Process the posts/replies you spot from carriers
  Output:  Classified intent + reply drafts
  Result:  You engage; interested ones become lead records
           |
           v
Agent 1 (Conversation)
  Purpose: Manage the ongoing DM thread with each prospect
  Output:  Reply drafts, follow-ups, qualifying questions
  Result:  Qualified carriers move to Call Ready, then driver record
```

Agents 2 and 1 can also be used independently. If you get a referral or
someone DMs you directly, you can skip Agent 2 and go straight to creating
a Conversation in Agent 1.
