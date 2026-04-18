export interface HelpArticle {
  id: string
  title: string
  category: string
  tags: string[]
  summary: string
  content: string
}

export interface Shortcut {
  keys: string[]
  description: string
}

export const DOC_CATEGORIES = ['All', 'Dispatch', 'Drivers', 'Sales', 'Finance', 'Reference', 'Template', 'Policy', 'Other'] as const

export const HELP_CATEGORIES = [
  'Getting Started',
  'Operations',
  'Dispatch',
  'Leads',
  'Drivers',
  'Brokers',
  'Invoices',
  'Marketing',
  'Analytics',
  'Backup & Data',
] as const

export const KEYBOARD_SHORTCUTS: Shortcut[] = [
  { keys: ['Ctrl', 'K'],    description: 'Open global search' },
  { keys: ['?'],            description: 'Open Help center' },
  { keys: ['Esc'],          description: 'Close overlay / modal / drawer' },
  { keys: ['Ctrl', 'B'],    description: 'Toggle sidebar' },
  { keys: ['Enter'],        description: 'Open selected search result' },
  { keys: ['↑', '↓'],       description: 'Navigate search results' },
]

export const HELP_ARTICLES: HelpArticle[] = [
  // ── Getting Started ──────────────────────────────────────────────────────

  {
    id: 'getting-started',
    title: 'Getting Started with OnTrack',
    category: 'Getting Started',
    tags: ['overview', 'setup', 'navigation', 'modules'],
    summary: 'A full orientation to the OnTrack Dispatch Dashboard and every module in the sidebar.',
    content: `## Welcome to OnTrack Dispatch Dashboard
OnTrack is a local-first desktop application built for trucking dispatch operations. All data stays on your computer — no cloud required.

## Sidebar Navigation
The left sidebar contains every module in the app. Collapse it with the arrow button to gain screen space.

- Operations — command center: KPIs, AI summary, warm leads, today's tasks
- Dispatcher Board — fleet status at a glance; assign loads; handle urgent drivers
- Find Loads — paste load board data, score and rank loads, add to system
- Active Loads — live tracking board with Load Health, timeline urgency, and check calls
- Dispatch Calendar — pickup and delivery view; driver availability windows for forward planning
- Leads — carrier prospect pipeline with Do This Now panel, overdue tracking, and call logs
- Drivers — driver profiles, documents, CDL/insurance expiry tracking
- Loads — full load lifecycle from Searching to Paid
- Brokers — broker database with flags, payment terms, lane intel
- Invoices — generate, send, and track dispatch fee invoices
- Marketing — Facebook group posting, step-based daily workflow, post history
- Tasks — daily dispatch checklist with recurring task support
- Documents — SOP and reference library
- Analytics — revenue, RPM, lane profitability, and lead conversion reports

## Global Search
Press Ctrl+K anywhere to search across leads, drivers, loads, brokers, invoices, tasks, and documents at once.

## Keyboard Shortcuts
Press ? (question mark) from any page to open the Help center and see all shortcuts.

## Settings
Click Settings at the bottom of the sidebar to configure your company name, dispatch percent, invoice details, and backup options.`,
  },

  {
    id: 'first-run',
    title: 'First-Run Setup Checklist',
    category: 'Getting Started',
    tags: ['setup', 'onboarding', 'settings', 'first run'],
    summary: 'What to configure before using OnTrack for the first time.',
    content: `## Before You Start Dispatching
Complete these steps once to set up OnTrack for your operation.

## Step 1 — Settings
Go to Settings and fill in:
- Company name (appears on invoices)
- Your dispatch email address
- Default dispatch percent (7% is typical)
- Payment terms (Net 7, Net 15, etc.)

## Step 2 — Add Your Drivers
Go to Drivers and click + New Driver for each driver you currently dispatch.
Fill in: name, company, MC/DOT number, phone, email, truck type, trailer type, home base, dispatch percent.
Enter CDL number and expiry date and insurance expiry date so OnTrack can alert you when they are approaching.

## Step 3 — Add Your Active Brokers
Go to Brokers and add any brokers you work with regularly.
Set payment terms, flag status (Preferred, Slow Pay, Avoid, Blacklisted), and notes.

## Step 4 — Add Your Current Loads
Go to Loads and add any loads currently in progress. Set the correct status for each load.

## Step 5 — Import Leads
Go to Leads and add any carrier prospects you are currently working.
Set status and next follow-up date so the dashboard alerts you on overdue leads.

## Step 6 — Seed the Document Library
Go to Settings > Dev Tools > Rebuild Document Library to load the full SOP and reference library.

## Step 7 — Review Marketing Groups
Go to Marketing > Groups to review the Facebook group list. Mark groups active or inactive based on your operation.`,
  },

  // ── Operations ────────────────────────────────────────────────────────────

  {
    id: 'operations-overview',
    title: 'Operations: Your Daily Command Center',
    category: 'Operations',
    tags: ['operations', 'dashboard', 'kpi', 'ai summary', 'check calls', 'profit radar'],
    summary: 'How to use the Operations page to run your day from one screen.',
    content: `## What Operations Does
Operations is the first page you should open each morning. It pulls data from every module and surfaces the most important things that need your attention right now.

## KPI Cards (top row)
The top row shows at-a-glance numbers:
- Revenue MTD — dispatch fees collected this month
- Loads In Transit — loads currently moving
- Drivers Avail. — active drivers who need loads today
- Overdue Leads — leads whose follow-up date has passed
- Groups to Post — Facebook groups eligible to post to today
- Open Invoices — invoices in Draft, Sent, or Overdue status

Click any KPI card to navigate directly to that module.

## Profit Radar (AI Summary)
The Profit Radar section runs an AI analysis of your operation and surfaces actionable insights: which lanes are performing, which drivers are idle too long, which leads are heating up. Click Refresh to regenerate.

## Warm Leads
Shows leads graded Hot or Warm with their last contact date and follow-up status. Click any lead to open it directly.

## Available Drivers
Shows every driver currently without a load. Includes home base and last known location so you can find freight for their lane quickly.

## Today's Tasks
Pulled from the Tasks module — shows what is due or overdue today. Check off tasks directly from this panel.

## Check Calls
Log inbound check calls from your drivers here. Each entry records the driver, time, and notes. Check calls appear in the Active Loads timeline as well.`,
  },

  {
    id: 'dispatcher-board',
    title: 'Dispatcher Board: Action-Driven Fleet Management',
    category: 'Operations',
    tags: ['dispatcher', 'board', 'assign load', 'best matches', 'needs load', 'urgency', 'do this now'],
    summary: 'Use the Dispatcher Board to identify urgent drivers, assign loads from Best Matches, and monitor in-transit deliveries.',
    content: `## Purpose
The Dispatcher Board is your primary tool for managing the fleet throughout the day. It shows every driver grouped by status, surfaces urgent actions at the top, and connects you directly to the best available loads for each driver.

## When to Use
Open the Dispatcher Board every morning and check back throughout the day — especially when a driver delivers or becomes available.

## Step 1 — Read the "Do This Now" Strip
A compact action summary appears at the top of the board when there are urgent items:
- Orange dot = driver needs a load assigned (losing money idle)
- Red dot = delivery overdue; check on that driver immediately
Click any item in the strip to jump to that driver's recommendations.

## Step 2 — Handle "Needs Load" Drivers First
The Needs Load section is highlighted in orange. Each row shows "Losing money — no load" — these drivers are costing you revenue every hour they sit idle.
Do not move on to other tasks until every Needs Load driver has either a load assigned or a clear reason for waiting.

## Step 3 — Use "Find Best Load" to Get Recommendations
Click "Find Best Load" on any Needs Load driver row (or click the row itself).
The Best Matches panel opens on the right, showing the top 3 loads ranked for that driver:
- Rank 1 is marked "Best Match" with an orange badge — start here
- Each card shows RPM, broker flag, route, and rate
- Validate: RPM meets your minimum, broker is not flagged Avoid or Blacklisted

## Step 4 — Assign Immediately
Click Assign on the Best Match card.
Confirm in the dialog. The driver moves to Booked automatically.
Do not delay the assignment — loads on the board go fast.

## Step 5 — Monitor In-Transit Deliveries
In the In Transit and Picked Up sections, the delivery date is color-coded:
- Red + "Overdue" = delivery date has passed. Call the driver now.
- Yellow + "Due today" = delivery is today. Confirm ETA.
- Orange + "Tomorrow" = delivery is tomorrow. No action needed yet.

## Step 6 — Log Check Calls
Use the "Call" button on any in-transit driver row to log a check call without leaving the board.

## Driver Groups (Reference)
- Needs Load — active, no current load (urgent)
- Booked — load confirmed, not yet picked up
- Picked Up — driver has the load, en route to delivery
- In Transit — rolling to destination
- Available Soon — on a load, approaching delivery
- Inactive — not currently dispatching

## Filters
Filter by trailer type or broker using the dropdowns. Search by driver name or city.`,
  },

  {
    id: 'active-loads',
    title: 'Active Loads: Load Health and Timeline Management',
    category: 'Operations',
    tags: ['active loads', 'load health', 'check call', 'timeline', 'at risk', 'watch', 'on track', 'coming up next'],
    summary: 'Monitor Load Health, act on overdue events, and drive check calls from the timeline.',
    content: `## Purpose
Active Loads shows every load currently in motion — Booked, Picked Up, In Transit. It is your real-time tracking board. The goal is to ensure nothing slips without you knowing.

## When to Use
Check Active Loads at the start of every day and after every check call. Re-check any time you see a red indicator on the Dispatcher Board or Operations page.

## Load Health (top priority signal)
Every selected load shows a "Load Health" label next to the status badge:
- On Track (green) — all timeline events are scheduled and current
- Watch (yellow) — a check call or event is due within 4 hours
- At Risk (red) — a timeline event is overdue; action required now

Address every "At Risk" load before doing anything else on this page.

## Left Panel — Load Cards
Each card in the left list shows a colored dot:
- Green dot = On Track
- Yellow dot = Watch (upcoming within 4 hours)
- Red dot = At Risk (overdue)

The next event also shows relative timing: "in 2h", "in 45m", "overdue 1h".
Sort your attention by the red dots first, then yellow.

## Selecting a Load
Click any load card to open its detail view on the right. If the load has no timeline events yet, OnTrack initializes a default schedule automatically.

## Next Action Panel
The Next Action panel shows the single most urgent pending event for the selected load.
- Red background = overdue. Do this now.
- Orange background = due soon. Do this next.
Actions: Mark Done (completes the event), Done + Schedule Next in 4h (marks done and books the next check call), Call Driver (opens phone dialer).

## Coming Up Next
Below the Next Action panel, "Coming up next" shows the next 1 to 2 scheduled events.
Use this to stay ahead of the schedule without scrolling through the full timeline.

## Timeline — Color Signals
The full timeline shows all events in order:
- Red row + AlertTriangle icon = overdue (act immediately)
- Orange text + Clock icon = upcoming within 4 hours (prepare now)
- Green checkmark = completed (no action needed)
- Muted = completed events pushed below a divider

Time is shown both absolutely (9:30 AM) and relatively (in 2h, overdue 1h) so you always know how urgent it is.

## Scheduling Check Calls
When there is no pending check call:
- Use the quick-schedule buttons: +2h, +4h, +8h
- Or type a time manually by adding a timeline event

## Advancing Load Status
Use the Update Status section at the bottom to mark a load as Picked Up, In Transit, or Delivered.
When marked Delivered, OnTrack prompts you to create the invoice immediately.

## Message Helpers
Use the Message Helpers section to generate ready-to-send messages for common scenarios: driver check-in, broker update, POD request, or delivery confirmation.`,
  },

  // ── Dispatch ─────────────────────────────────────────────────────────────

  {
    id: 'booking-a-load',
    title: 'Load Booking SOP',
    category: 'Dispatch',
    tags: ['load', 'dispatch', 'booking', 'best matches', 'RPM', 'rate con', 'broker', 'workflow'],
    summary: 'Start from Best Matches on the Dispatcher Board. Validate RPM and broker. Assign immediately.',
    content: `## Purpose
Book loads fast and decisively. Every hour a driver sits idle is revenue lost. Do not browse — use Best Matches.

## When to Use
Any time a driver enters "Needs Load" status on the Dispatcher Board.

## Pre-Booking Checklist
Confirm ALL of the following before booking:
1. Driver is available — status is Active and not currently on a load
2. Equipment matches — trailer type on the load matches the driver's trailer
3. Driver insurance is current — check driver profile; expired = do not dispatch
4. MC authority is active — if uncertain, verify on FMCSA SAFER
5. Deadhead is acceptable — empty miles from driver to pickup; under 100 miles preferred

## Step 1 — Go to Dispatcher Board
Open the Dispatcher Board. Find the driver in the "Needs Load" group.

## Step 2 — Open Best Matches
Click "Find Best Load" on the driver row, or click the row itself.
The Best Matches panel appears on the right with the top 3 loads ranked for that driver.

## Step 3 — Validate the Top Result
Start with Rank 1 (marked "Best Match"):
- RPM meets your minimum (Dry Van $2.00+, Reefer $2.50+, Flatbed $2.25+)
- Broker is not flagged Avoid or Blacklisted in your Brokers database
- Pickup date and lane work for the driver's location

If Rank 1 does not work, check Rank 2 then Rank 3.
If none of the top 3 work, use Find Loads to paste load board data and score alternatives.

## Step 4 — Call the Broker and Negotiate
Introduce yourself and confirm the load is still available.
Counter 10 to 15% above the posted rate. If posted at $1,800, counter with $2,000.
Accept only after driver has verbally confirmed.

## Step 5 — Assign in OnTrack
Click Assign on the Best Match card.
Confirm in the modal. The driver moves to Booked.

## Step 6 — Confirm Rate and Enter Load Details
Open the load in OnTrack and fill in: origin, destination, pickup date, delivery date, rate, miles, commodity, and load reference number.

## Step 7 — Send Driver Instructions
Confirm with the driver: pickup address, date and time, shipper contact, commodity, and delivery address. Tell them the rate confirmation is coming to their email.

## RPM Targets (Reference)
- Dry Van: minimum $2.00/mile, target $2.50+
- Reefer: minimum $2.50/mile, target $3.00+
- Flatbed: minimum $2.25/mile, target $2.75+`,
  },

  {
    id: 'find-loads',
    title: 'Find Loads: Score and Import from Load Boards',
    category: 'Dispatch',
    tags: ['find loads', 'load board', 'paste', 'score', 'DAT', 'Truckstop'],
    summary: 'Paste load board results into OnTrack to score, rank, and add the best loads directly to your system.',
    content: `## What Find Loads Does
Find Loads lets you paste raw load board data — from DAT, Truckstop, screenshots, or any text — and have OnTrack score each load and rank them. The top-ranked loads are flagged as your best first calls.

## How to Use It
1. Copy load listings from your load board (DAT, Truckstop, etc.)
2. Paste the text into the input area on the Find Loads page
3. Click Parse — OnTrack extracts origin, destination, rate, miles, and other fields
4. Loads are scored and sorted; the top 3 appear as Best First Call cards

## Best First Call Cards
The top 3 ranked loads are displayed prominently as Call #1, Call #2, and Call #3 with gold, silver, and bronze badges. These are the loads with the best combination of rate, RPM, lane fit, and broker reputation.

## Scoring Factors
Each load is scored on:
- RPM versus your minimum thresholds by equipment type
- Dispatcher margin (rate minus estimated driver cost)
- Broker flag status from your Brokers database
- Lane performance from your load history

## Adding a Load to the System
Click Add to System on any load card to create a load record in Loads. The load opens pre-filled so you can assign a driver, confirm details, and change status to Booked when ready.

## Supported Input Formats
Find Loads can parse structured text from DAT, Truckstop, and broker emails. For screenshot-based input, use the image paste option.`,
  },

  {
    id: 'loads-page',
    title: 'Managing Loads',
    category: 'Dispatch',
    tags: ['loads', 'status', 'rate', 'RPM', 'invoice', 'lifecycle'],
    summary: 'How to create, update, and track loads through the full dispatch lifecycle.',
    content: `## Load Statuses
Searching > Booked > Picked Up > In Transit > Delivered > Invoiced > Paid

## Creating a Load
Go to Loads > New Load. Required fields: origin city and state, destination city and state, pickup date, rate, miles. Assign a driver and broker if known.

## Updating Load Status
Open the load drawer and click the status field to advance it. Each status change is logged with a timestamp.

## Load Drawer Fields
- Route: origin and destination
- Dates: pickup and delivery
- Rate and miles (RPM calculates automatically)
- Driver and broker assignment
- Commodity and load reference number
- Notes

## Generating an Invoice
Once a load reaches Delivered status, click Generate Invoice in the load drawer. OnTrack calculates the dispatch fee automatically using the driver's dispatch percent. The invoice is created in Draft status.

## Filtering Loads
Use the toolbar to filter by status, driver, broker, or date range. The search box matches on route, driver name, and broker name.

## RPM Color Coding
RPM is color coded in the table: green ($3.00+), orange ($2.50-$2.99), yellow ($2.00-$2.49), red (below $2.00).`,
  },

  // ── Leads ─────────────────────────────────────────────────────────────────

  {
    id: 'lead-pipeline',
    title: 'Lead Pipeline SOP',
    category: 'Leads',
    tags: ['leads', 'CRM', 'follow-up', 'pipeline', 'do this now', 'call log', 'score', 'overdue'],
    summary: 'Work the Do This Now panel first, call overdue leads, log every attempt, and follow up 2-3 times before moving on.',
    content: `## Lead Statuses
New > Attempted > Contacted > Interested > Signed (or Not Interested / Bad Fit / Rejected)

## Daily Lead Routine
1. Open the Leads page
2. Read the "Do This Now — Pipeline" panel at the top — it surfaces the highest-urgency leads first
3. Work every lead in the panel before anything else
4. Then scan the table for overdue follow-up dates (red rows)
5. Log every call attempt — even no-answers count

## The "Do This Now" Panel
The orange panel at the top of the Leads page shows up to 5 leads that need action right now, sorted by urgency:
- Overdue follow-up date (red) — call these first
- Follow-up due today (orange) — call these next
- Warm leads with no recent contact (yellow) — do not let them go cold
- Untouched new leads (blue) — make first contact
Each row shows the next action label so you know exactly what to do: "First call", "Follow up", "Call back", "Send info", "Schedule call".

## Next-Action Labels (Reference)
Each lead row shows a small label under the company name to tell you the exact next step:
- First call — new lead, never contacted
- Follow up — called before, no answer or attempted contact
- Call back — voicemail was left; wait for return or try again
- Send info — driver is interested; send dispatch agreement or rate sheet
- Schedule call — driver wants to talk; get a time on the calendar

## Adding a Lead
Click + New Lead. Required: name, phone or email. Recommended: MC number, company, trailer type, home base. Always set a follow-up date. Leads past their follow-up date turn the row red and appear at the top of the Do This Now panel.

## Lead Score
Every lead is scored 0–100 automatically based on contact completeness, authority age, follow-up recency, and status progress. Use the score to prioritize who to call when the pipeline is full.

## Logging Call Attempts
Open the lead drawer and go to the Call Log tab. Log every attempt: date, outcome (Reached, Voicemail, No Answer, etc.), and notes. This is how OnTrack knows when you last contacted someone and what the next action should be.

Most leads require 2 to 3 follow-up attempts before you get a real conversation. Do not mark "Not Interested" after one no-answer.

## FMCSA Verification
Before signing, click the MC or DOT number on any lead row to open the SAFER profile in your browser. Verify authority is active and insurance is current.

## Advancing to Signed
When a lead agrees to dispatch, set status to Signed. The lead exits the pipeline. Go to Drivers and create a driver profile for them.

## Filtering and Search
Filter by status, trailer type, priority, or follow-up date range. Search matches name, company, MC number, and email.`,
  },

  // ── Drivers ───────────────────────────────────────────────────────────────

  {
    id: 'driver-management',
    title: 'Adding and Managing Drivers',
    category: 'Drivers',
    tags: ['driver', 'onboarding', 'CDL', 'insurance', 'expiry', 'documents', 'location'],
    summary: 'How to add drivers, upload documents, track expiry dates, and update current location.',
    content: `## Adding a New Driver
Go to Drivers and click + New Driver. Fill in:
- Name, company, MC number, DOT number
- Phone and email
- Truck type and trailer type
- Home base and preferred lanes
- Dispatch percent (default 7%)
- Factoring company if applicable
- CDL number and expiry date
- Insurance expiry date
- Start date

## Driver Statuses
- Active — available for loads
- On Load — currently dispatched (updates automatically when a load is booked or in transit)
- Inactive — not currently working

## Expiry Alerts
Drivers with CDL or insurance expiring within 30 days show a warning badge in the table. Check the Drivers page regularly and contact drivers well in advance of expiry.

## Current Location
The Current Location field in the driver drawer Contact section shows where the driver is right now. Click the pencil icon to edit, type a city and state, then press Enter or click the checkmark to save. This feeds into load matching and the Operations dashboard.

## Driver Documents
Open the driver drawer and go to the Documents tab to upload:
- CDL copy
- Certificate of Insurance (COI)
- W-9 form
- Signed dispatch agreement
- BOL or POD copies

## Filtering the Table
Filter by status, trailer type, or search by name, MC number, or home base.`,
  },

  // ── Brokers ───────────────────────────────────────────────────────────────

  {
    id: 'broker-management',
    title: 'Managing Brokers',
    category: 'Brokers',
    tags: ['brokers', 'flag', 'payment terms', 'preferred', 'avoid', 'blacklist', 'intel'],
    summary: 'Build and maintain a broker database with payment history, flags, and lane performance.',
    content: `## Why Broker Records Matter
A good broker database protects you from slow payers and bad actors and helps you move faster when booking. Every time you book a load, OnTrack checks the broker's flag and surfaces warnings automatically.

## Adding a Broker
Go to Brokers and click + New Broker. Fill in: company name, MC number, contact name, phone, email, payment terms, and notes.

## Broker Flags
- Preferred — reliable payer, good rates, use first
- None — neutral, no issues
- Slow Pay — pays outside agreed terms; add notes with typical delay
- Avoid — problematic but usable in specific situations
- Blacklisted — do not book under any circumstances

Flags appear as color-coded badges in the Brokers table and in load recommendations across the app.

## Payment Terms
Enter the broker's agreed payment terms (Net 7, Net 15, Net 30, Quick Pay, etc.). These feed into invoice due date calculations and overdue tracking.

## Lane Intel
As you complete loads with a broker, OnTrack builds a lane history. In Analytics > Broker Reliability, you will see each broker's average RPM and payment performance based on your actual transaction history.

## Broker Notes
Use the Notes field to record important information: contact preferences, rate con email address, common commodities, problem patterns, and anything else useful for future bookings.

## Searching and Filtering
Search by broker name, MC number, or contact name. Filter by flag status to quickly find all preferred brokers or all flagged brokers.`,
  },

  // ── Invoices ──────────────────────────────────────────────────────────────

  {
    id: 'invoicing',
    title: 'Creating and Sending Invoices',
    category: 'Invoices',
    tags: ['invoice', 'billing', 'dispatch fee', 'payment', 'overdue', 'draft', 'sent', 'paid'],
    summary: 'Generate dispatch invoices from delivered loads, email them to drivers, and track payment.',
    content: `## Invoice Lifecycle
Draft > Sent > Paid (or Overdue)

## Generating an Invoice from a Load
1. Open a load that is in Delivered status or later
2. Click Generate Invoice in the load drawer
3. Review the auto-calculated fields: driver gross, dispatch percent, dispatch fee
4. Save — the invoice is created in Draft status and linked to that load

## Sending the Invoice
1. Open the invoice from the Invoices page
2. Click Email Invoice to open a pre-filled email in your default mail client
3. Send the email to the driver
4. Change invoice status to Sent after the email is sent

## Marking as Paid
When payment is received, open the invoice and mark it Paid. The linked load status also updates to Paid. The paid date is recorded for payment history and analytics.

## Overdue Invoices
An invoice becomes Overdue when the current date exceeds the due date (calculated from the invoice date plus payment terms) and the invoice is not yet marked Paid. Overdue invoices appear in the Operations KPI card and are highlighted in the Invoices table.

## Invoice Numbering
Invoice numbers are generated automatically in sequence. The format is configurable in Settings.

## Filtering and Search
Filter by status (Draft, Sent, Paid, Overdue), driver, or date range. The search box matches driver name, broker name, and invoice number.`,
  },

  // ── Marketing ─────────────────────────────────────────────────────────────

  {
    id: 'marketing-groups',
    title: 'Marketing SOP: Daily Facebook Group Workflow',
    category: 'Marketing',
    tags: ['marketing', 'Facebook', 'groups', 'post templates', 'coverage', 'daily workflow', 'pending'],
    summary: 'Five-step daily posting workflow: Post Today list, open group, copy post, paste and post, mark posted.',
    content: `## Purpose
The Marketing module manages your Facebook group list for driver recruitment and tracks your posting history. The goal is consistent daily presence across your active groups without repeating content.

## Daily Posting Workflow (5 Steps)
Do this once per day, ideally in the morning.

Step 1 — Open Marketing and look at the "Post Today" recommendations at the top of the Groups tab.
These are the groups that are overdue for a post or that have not been posted to in the longest time.

Step 2 — Click the first recommended group.
The right panel shows the group details and a Generate Post button.

Step 3 — Click Generate Post.
OnTrack picks a template appropriate for the group's category. Templates rotate automatically — the same post will not repeat within 90 days for the same group.
Review the post. Edit if needed.

Step 4 — Click Copy, then open the Facebook group in your browser and paste the post.
Post it. Do not close the tab yet.

Step 5 — Return to OnTrack and click Mark Posted.
This logs the post and removes the group from today's recommendations.
If the post is still pending (same-day, not yet visible), it shows a "Pending" state — that is normal.

Repeat for the remaining recommended groups.

## Groups Tab
Each group card shows:
- Last posted date
- Priority (High, Medium, Low)
- Signed drivers attributed to that group
- Active or Inactive toggle

High priority groups should be posted to every 2 to 3 days. Medium priority every 4 to 5 days. Low priority weekly.

## Adding a Group
Click + Add Group. Enter the group name, Facebook URL, category (Owner Operator, Hotshot, Reefer, Flatbed, General Trucking, etc.), and priority. Set Active so it appears in daily recommendations.

## Post History
The History tab shows every logged post: group, template used, and date. Use this to confirm you are maintaining coverage and to review what was recently posted in a group.

## Coverage Analysis
The Coverage section shows how many active groups you have per truck type. Gaps are flagged. If you have no Reefer groups, you are missing that driver segment — find and add groups to fill the gap.

## Tracking Replies
OnTrack does not connect directly to Facebook. If someone replies to your post with interest, add them as a lead immediately (click + New Lead), then open the lead drawer and log the initial contact in the Call Log tab. Set a follow-up date within 24 hours.`,
  },

  // ── Analytics ─────────────────────────────────────────────────────────────

  {
    id: 'analytics',
    title: 'Analytics: Revenue, RPM, and Pipeline Reports',
    category: 'Analytics',
    tags: ['analytics', 'revenue', 'RPM', 'lead conversion', 'lane', 'broker', 'profitability'],
    summary: 'Read your financial and operational performance across revenue, RPM, lanes, and lead conversion.',
    content: `## What Analytics Shows
The Analytics page aggregates data from Loads, Leads, and Drivers to show how your dispatch operation is performing financially and operationally.

## Revenue by Driver
Shows gross revenue and dispatch fees earned per driver for the selected period. Useful for identifying top earners and underperforming drivers.

## Revenue by Month
A bar chart showing total dispatch revenue month over month. Use this to identify seasonal patterns and growth trends.

## Average RPM
Shows your fleet's average Rate Per Mile across all completed loads. Compare to your targets: Dry Van $2.50+, Reefer $3.00+, Flatbed $2.75+.

## Lead Conversion
- Total leads added versus leads that converted to Signed
- Conversion rate as a percentage
- Pipeline breakdown by status showing where leads are getting stuck

## Lane Profitability
Ranks your most common routes by average RPM and load count. Use this to focus your load board searches on your best-performing lanes.

## Broker Reliability
Ranks brokers you have worked with by payment performance and average rate. Use this to decide which brokers to prioritize.

## Data Requirements
Analytics pulls from your completed load records. The more loads you have logged with accurate rates, miles, driver assignments, and broker assignments, the more useful the reports will be.`,
  },

  // ── Backup & Data ─────────────────────────────────────────────────────────

  {
    id: 'backup-restore',
    title: 'Backup, Restore, and Data Safety',
    category: 'Backup & Data',
    tags: ['backup', 'restore', 'data', 'safety', 'Google Drive', 'export'],
    summary: 'OnTrack backs up automatically on launch. How to restore from a backup and keep your data safe.',
    content: `## Automatic Backups
OnTrack creates a backup automatically every time the app launches and every 6 hours while running. Backups are stored in:
OnTrackDashboard/backups/YYYY-MM-DD.db

## Manual Backup
Go to Settings > Backup & Restore and click Create Backup Now to save a backup immediately.

## Restoring a Backup
1. Go to Settings > Backup & Restore
2. Find the backup date you want to restore
3. Click Restore, then confirm
4. Restart OnTrack — the restore is applied on the next launch

## Google Drive Sync
To keep data safe offsite or sync between computers: move the OnTrackDashboard/ folder into Google Drive.
Important: never open OnTrack on two computers at the same time. SQLite is a single-writer database and simultaneous access will corrupt the file.

## Dev Tools (Settings > Dev Tools)
- Seed Missing Items — adds any missing default records without touching existing data. Safe to run at any time.
- Rebuild Document Library — replaces all seeded documents with the latest version. Run this after an app update to get new and updated SOPs. Does not affect documents you created yourself.
- Reset and Reseed — wipes all data and starts fresh. Use only on a clean install.

## Exporting Data
Use Settings > Export to download your leads, drivers, loads, and invoices as CSV files for use in Excel or Google Sheets.`,
  },

  // ── Tasks ─────────────────────────────────────────────────────────────────

  {
    id: 'tasks',
    title: 'Daily Tasks and Recurring Checklist',
    category: 'Operations',
    tags: ['tasks', 'checklist', 'daily', 'recurring', 'routine'],
    summary: 'Use the Tasks module to manage your daily dispatch checklist and recurring routines.',
    content: `## What the Tasks Module Does
Tasks is a daily checklist for your dispatch operation. It keeps you on track with routine activities like updating driver statuses, following up on leads, posting to Facebook groups, and sending invoices.

## Task Statuses
Each task is either Pending or Complete for the current day. Recurring tasks reset automatically each day.

## Creating a Task
Click + New Task and fill in:
- Title — what needs to be done
- Category — Dispatch, Leads, Marketing, Admin, etc.
- Priority — High, Medium, Low
- Time of day — Morning, Afternoon, Evening, Anytime
- Recurring — check this to have the task reset every day

## Recurring Tasks
Tasks marked Recurring reset to Pending at the start of each new day. Use recurring tasks for your daily routine: check active loads, review overdue leads, post to Facebook groups.

## One-Time Tasks
Tasks without Recurring checked stay in their current state until you complete or delete them. Use one-time tasks for specific action items that come up during the day.

## Operations Integration
Today's tasks appear in the Operations command center so you can check them off without leaving the main dashboard.

## Priority and Ordering
Tasks are sorted by priority (High first) and then by time of day. High priority tasks with no completion appear at the top of the list.`,
  },

  // ── SOPs ──────────────────────────────────────────────────────────────────

  {
    id: 'daily-dispatch-routine',
    title: 'Daily Dispatch Routine SOP',
    category: 'Dispatch',
    tags: ['daily routine', 'morning routine', 'dispatcher board', 'active loads', 'leads', 'check calls', 'calendar'],
    summary: 'Five-step morning routine to run every day before taking new work.',
    content: `## Purpose
A consistent daily routine prevents missed check calls, lets idle drivers sit unnoticed, and keeps leads from going cold. Run this every morning before taking on new requests.

## Step 1 — Dispatcher Board (5 minutes)
Open the Dispatcher Board first.
Read the "Do This Now" strip at the top.
Every orange dot is a driver losing money with no load. Handle all Needs Load drivers before anything else.
For each Needs Load driver: click "Find Best Load", review the Best Matches panel, validate RPM and broker, assign immediately.
Do not move to Step 2 until every Needs Load driver has a load or a documented reason for waiting.

## Step 2 — Active Loads — At Risk Loads (5 minutes)
Open Active Loads.
Scan the load card list on the left for red dots (At Risk).
Click each red-dot load. Read the Next Action panel. The background will be red if the event is overdue.
Mark the event done, schedule the next check call, or call the driver — whichever the panel calls for.
Then check yellow-dot loads (Watch — due within 4 hours). Note the next event time and prepare to act.

## Step 3 — Dispatch Calendar (2 minutes)
Open the Dispatch Calendar.
Scan today's pickup and delivery events.
Any delivery today — confirm the driver is on track. Any pickup today — confirm the driver knows the address and shipper contact.
Look at tomorrow's events so nothing catches you off guard overnight.

## Step 4 — Lead Pipeline (5 minutes)
Open Leads.
Read the "Do This Now — Pipeline" panel.
Call or follow up on every lead in the panel from top to bottom.
Log each attempt in the call log even if it is a no-answer or voicemail.
Check for red rows (overdue follow-up date) below the panel and work those next.

## Step 5 — Marketing Post (5 minutes)
Open Marketing.
Check the "Post Today" recommendations.
Generate and post to the first 2 to 3 recommended groups.
Mark each posted before moving on.

## End of Day
Before closing for the day:
- Check Active Loads for any events due before midnight
- Schedule any morning check calls needed for overnight drivers
- Confirm tomorrow's pickups are locked in with drivers

## Total Time
This routine takes 20 to 30 minutes when the operation is healthy. If it is taking longer, something in the pipeline is backlogged and needs attention.`,
  },

  {
    id: 'check-call-sop',
    title: 'Check Call SOP',
    category: 'Dispatch',
    tags: ['check call', 'driver contact', 'timeline', 'in transit', 'active loads', 'location', 'ETA'],
    summary: 'How to conduct and log check calls from the Active Loads timeline.',
    content: `## Purpose
A check call confirms the driver is moving, on schedule, and without issues. It also protects you if a broker disputes delivery timing. Log every check call — no exceptions.

## When to Call
- Every 4 to 8 hours on in-transit loads, or at the interval agreed with the broker
- Immediately when an Active Loads event turns red (overdue)
- Any time a driver has not checked in within the expected window
- Before and after any pickup or delivery appointment

## How to Conduct the Call
Keep check calls short and structured. Cover three things:

1. Location — "Where are you right now?" Get a city and state or a mile marker.
2. ETA — "What is your ETA to [delivery city]?" If they are behind, get a realistic new ETA.
3. Issues — "Any problems with the load, truck, or delivery appointment?" If yes, note details.

If the driver does not answer: leave a voicemail with your name, the load reference number, and ask for a call back within 30 minutes. Then schedule a follow-up event on the timeline for 30 to 45 minutes out.

## Logging in Active Loads
1. Open Active Loads and select the load
2. Find the current pending event in the Next Action panel or timeline
3. Click Mark Done to complete the event
4. Click "Done + Schedule Next in 4h" to immediately book the next check call
5. Add notes in the event detail if the driver reported anything unusual

## Logging a Late or Missed Check Call
If a check call was missed (the event shows overdue), still log it when you do make contact.
Mark the overdue event done with a note explaining the delay.
Then schedule the next event normally.

## Escalation
If you cannot reach a driver after 2 attempts, 30 minutes apart:
- Try the driver's emergency contact if available
- Contact the broker to see if they have heard from the driver
- Check if the driver has delivery appointment contact info and call the shipper or receiver

## After Delivery
When the driver confirms delivery: open the load, advance status to Delivered, note the actual delivery time, and generate the invoice.`,
  },

  {
    id: 'fmcsa-import',
    title: 'FMCSA Import SOP',
    category: 'Leads',
    tags: ['FMCSA', 'import', 'carrier', 'MC number', 'DOT', 'enrichment', 'skipped', 'failed'],
    summary: 'Import carrier data from FMCSA SAFER to create or enrich leads in bulk.',
    content: `## Purpose
The FMCSA import tool lets you pull carrier records directly from the FMCSA SAFER database and create leads in bulk. Use it to prospect new carriers in a specific lane, equipment type, or authority age range.

## When to Use
- Prospecting a new driver segment (hotshot, reefer, flatbed)
- Building a call list for a specific region or lane
- Refreshing data on existing leads whose MC info may be outdated

## How to Import
1. Go to Leads — the FMCSA import panel appears in the toolbar area above the lead table
2. Confirm your FMCSA key is configured (Settings > Integrations) — the panel will warn you if it is not
3. Click Run Scan (or the import button) — OnTrack queries the FMCSA SAFER database automatically
4. Wait for the scan to complete — results appear immediately below the button

## Understanding the Import Results
After the scan, OnTrack shows a summary line:
- added — new prospect records created from FMCSA data
- skipped — carriers already in your system (matched by MC number); no changes made
- lookup(s) failed — records where FMCSA enrichment returned incomplete data (shown only when > 0)

A high skipped count is normal on repeat scans once your prospect list is built up. If lookups failed, the underlying FMCSA data may be incomplete — those carriers were not added.

## After Import
Newly imported leads land in "New" status with no follow-up date set.
Immediately after import: sort by lead score, set a follow-up date on the top 10 to 20 leads, and add them to your daily call list.
Do not import more leads than you can follow up on within 48 hours — a lead that sits untouched for a week is a wasted import.

## FMCSA Verification (Individual Leads)
To verify a single lead's FMCSA status at any time: click the MC number or DOT number on any lead row. This opens the carrier's SAFER profile directly in your browser.
Verify before signing any new driver: authority must be Active, insurance must be current.

## Fallback (Manual Entry)
If FMCSA data is unavailable or incomplete, enter leads manually. The import tool is a supplement to your lead generation process — not a replacement for relationship-driven prospecting.`,
  },

  // ── Documents ─────────────────────────────────────────────────────────────

  {
    id: 'documents',
    title: 'Documents: SOP and Reference Library',
    category: 'Getting Started',
    tags: ['documents', 'SOP', 'library', 'categories', 'edit', 'create'],
    summary: 'Navigate the document library, find SOPs, and create or edit documents.',
    content: `## Document Categories
Documents are organized into categories that match the left sidebar tabs:
- Dispatch — load booking, emergency procedures, rate confirmation guide, daily routine
- Drivers — onboarding, CDL and insurance requirements, dispatch agreement
- Sales — cold call scripts, follow-up scripts, pitch documents, lead review
- Marketing — Facebook post protocols, group management guides
- Brokers — broker vetting, rate negotiation, broker relationship guides
- Finance — invoice submission, revenue tracking
- Template — blank forms and reusable templates (W-9, dispatch agreement, onboarding email)
- Reference — industry guides, glossary, load board guide, business overview
- Policy — driver communication standards, safety compliance
- Other — miscellaneous documents

## Finding a Document
Click a category in the left sidebar to filter the list. Use the search box to search by title or content. All documents are full-text searchable.

## Reading a Document
Click any document in the list to open it in the right panel. Documents render markdown formatting including headers, lists, and emphasis.

## Creating a Document
Click + New Document. Enter a title, select a category, and write your content in the editor. Content supports markdown formatting. Click Save.

## Editing a Document
Open any document and click the Edit button. Make your changes and click Save. The updated timestamp is recorded automatically.

## Seeded Documents
OnTrack ships with a library of pre-written SOPs covering every aspect of dispatch operations. To load or refresh the library, go to Settings > Dev Tools > Rebuild Document Library.

## Popping Out a Document
Click the pop-out icon on any open document to open it in a separate window. Useful when you want to reference a document while working in another part of the app.`,
  },
]
