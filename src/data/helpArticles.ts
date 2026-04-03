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

export const DOC_CATEGORIES = ['All', 'Dispatch', 'Drivers', 'Sales', 'Marketing', 'Brokers', 'Finance', 'Template', 'Reference', 'Policy', 'Other'] as const

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

- Operations — command center: KPIs, AI summary, check calls, warm leads, today's tasks
- Load Match — AI-powered load recommendations matched to each driver
- Find Loads — paste load board data, score and rank loads, add to system
- Active Loads — live tracking board for every load currently in motion
- Dispatcher — drag-and-drop board showing all driver statuses at a glance
- Leads — carrier prospect pipeline with CRM features and call logs
- Drivers — driver profiles, documents, CDL/insurance expiry tracking
- Loads — full load lifecycle from Searching to Paid
- Brokers — broker database with flags, payment terms, lane intel
- Invoices — generate, send, and track dispatch fee invoices
- Marketing — Facebook group posting, post templates, coverage analysis
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
- Drivers Needing Loads — active drivers with no current load
- Loads In Transit — loads currently moving
- Overdue Leads — leads whose follow-up date has passed
- Today's Groups — Facebook groups recommended to post in today
- Outstanding Invoices — invoices not yet marked Paid
- FB Inbox — new and active Facebook conversations

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
    title: 'Dispatcher Board',
    category: 'Operations',
    tags: ['dispatcher', 'board', 'drag and drop', 'kanban', 'assign load'],
    summary: 'Use the Dispatcher Board to see all driver statuses and assign loads by dragging.',
    content: `## What the Dispatcher Board Does
The Dispatcher Board shows every driver grouped by their current status. It gives you a single view of your entire fleet at a glance and lets you assign loads to drivers by dragging.

## Driver Groups
Drivers are automatically grouped into:
- Needs Load — active drivers with no current load (highlighted in orange — these need action)
- Booked — driver has a confirmed load, not yet picked up
- Picked Up — driver has picked up the load
- In Transit — driver is rolling to destination
- Available Soon — driver is on a load but approaching delivery
- Inactive — drivers marked Inactive in their profile

## Assigning a Load
1. Click a driver row in the "Needs Load" group to select them
2. The panel on the right shows available loads and AI-recommended loads for that driver
3. Drag a load card onto the driver row, or click the assign button
4. Confirm the assignment in the dialog that appears
5. The driver moves to the Booked group automatically

## Filters
Use the toolbar to filter by trailer type or broker. The search box filters by driver name.

## Refreshing the Board
Click the refresh button in the top-right to reload all driver and load statuses. The board does not auto-refresh to prevent interruptions while you are working.`,
  },

  {
    id: 'active-loads',
    title: 'Active Loads: Tracking Loads in Motion',
    category: 'Operations',
    tags: ['active loads', 'tracking', 'check call', 'timeline', 'status update'],
    summary: 'Monitor every load currently in transit and log check calls and status changes.',
    content: `## What Active Loads Shows
Active Loads shows only the loads that are currently moving — Booked, Picked Up, In Transit. It is built for real-time tracking and does not include Searching, Delivered, or Paid loads.

## Load Cards
Each load card shows:
- Driver name and truck type
- Route: origin to destination
- Current status and pickup/delivery times
- Overdue indicator if a pickup or delivery window has passed
- Timeline of status changes, check calls, and notes

## Advancing a Load Status
Click the status button on any load card to advance it to the next step:
- Booked -> Picked Up
- Picked Up -> In Transit
- In Transit -> Delivered (moves load out of Active Loads)

## Logging Check Calls
Click Log Check Call on any load card to record a driver contact. Enter the time and any notes. The check call appears in that load's timeline.

## Adding Notes
Click Add Note to log any free-form update to a load without changing its status.

## Overdue Loads
Loads with a pickup or delivery time in the past are highlighted in red. Check in with the driver immediately when you see an overdue indicator.`,
  },

  // ── Dispatch ─────────────────────────────────────────────────────────────

  {
    id: 'booking-a-load',
    title: 'Booking and Dispatching a Load',
    category: 'Dispatch',
    tags: ['load', 'dispatch', 'booking', 'workflow', 'rate con', 'broker'],
    summary: 'Step-by-step: find a load, negotiate the rate, confirm with your driver, and enter it in OnTrack.',
    content: `## Load Lifecycle
A load moves through these statuses: Searching > Booked > Picked Up > In Transit > Delivered > Invoiced > Paid

## Pre-Booking Checklist
Before contacting any broker confirm ALL of the following:
1. Driver is available — confirm current location and when and where they are free
2. Equipment type matches — Dry Van, Reefer, Flatbed, Step Deck, etc.
3. Driver insurance is current — check driver profile; expired insurance means do not dispatch
4. MC authority is active — verify on FMCSA SAFER; suspended means stop
5. Deadhead is acceptable — empty miles from driver to pickup; under 100 miles preferred

## Step 1 — Find the Load
Use load boards to find available freight:
- DAT One (dat.com) — industry standard, highest volume
- Truckstop (truckstop.com) — solid alternative
- Direct broker calls — call trusted brokers for freight in your lane

## Step 2 — Evaluate the Rate
Rate Per Mile (RPM) = Total Rate divided by Total Miles.
- Dry Van minimum: $2.00/mile. Target: $2.50+
- Reefer minimum: $2.50/mile. Target: $3.00+
- Flatbed minimum: $2.25/mile. Target: $2.75+
Check the broker in your Brokers page. If flagged Avoid, do not book.

## Step 3 — Call the Broker
Introduce yourself, confirm the load is available, and negotiate.
Start 10-15% above the posted rate. If posted at $1,800 counter with $2,000.
Say: "Let me confirm with my driver and call you back in 5 minutes" if you need time.

## Step 4 — Confirm with Your Driver
Get a clear YES before accepting. Never book without driver confirmation.

## Step 5 — Get the Rate Confirmation
Ask the broker to email the rate confirmation to your dispatch email.
Review it carefully before forwarding to your driver.

## Step 6 — Enter the Load in OnTrack
Go to Loads > New Load. Fill in: origin, destination, pickup date, delivery date, rate, miles, commodity, driver, broker. Set status to Booked.

## Step 7 — Send Driver Instructions
Confirm: pickup address, date and time, shipper contact, commodity, weight, and delivery address. Tell them the rate confirmation is coming to their email.`,
  },

  {
    id: 'load-match',
    title: 'Load Match: AI Load Recommendations',
    category: 'Dispatch',
    tags: ['load match', 'AI', 'recommendations', 'scanner', 'broker intel', 'lane intel'],
    summary: 'Use Load Match to get AI-scored load recommendations matched to each driver\'s lane and equipment.',
    content: `## What Load Match Does
Load Match analyzes your drivers' preferred lanes, equipment types, and home base to recommend the best available loads. It also shows broker intel and historical lane performance.

## Using Load Match
1. Select a driver from the dropdown at the top
2. OnTrack shows recommended loads ranked by fit score (Strong / Good / Fair / Weak)
3. Each recommendation shows: route, rate, RPM, broker flag, and a fit explanation
4. Click Add to System to create a load record and advance to booking

## Broker Intel Panel
For each recommended load, the broker intel section shows:
- Payment reliability rating (Preferred, Neutral, Caution, Avoid)
- Historical payment terms performance
- Flagged status from your Brokers database

## Lane Intel Panel
Shows how the route has performed historically based on your completed loads:
- Average RPM for that lane
- Load frequency
- Lane strength rating (Strong, Average, Weak)

## Driver Lane Fit
Below the recommendations, the driver lane fit section shows which lanes are the strongest match for this driver based on their preferred lanes and home base.

## Booking Checklist
Each recommendation includes a pre-booking checklist with checkboxes to confirm broker verification, pickup details, rate agreement, rate confirmation, load logged, and driver notification.`,
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
    title: 'Managing the Lead Pipeline',
    category: 'Leads',
    tags: ['leads', 'CRM', 'follow-up', 'kanban', 'call log', 'pipeline', 'score'],
    summary: 'Track carrier prospects from first contact through to a signed dispatch agreement.',
    content: `## Lead Statuses
New > Contacted > Interested > Signed (or Rejected)

## Adding a Lead
Go to Leads and click + New Lead. Enter: name, company, MC number, contact info, trailer type, home base, preferred lanes. Set a follow-up date — leads past their follow-up date appear on the Operations page.

## Table vs. Kanban View
Toggle between Table and Kanban views using the toolbar. Kanban shows leads organized by status column for a visual pipeline view.

## Lead Score
OnTrack automatically scores every lead from 0 to 100 based on:
- Contact info completeness
- MC authority date (newer authority = higher priority)
- Follow-up recency
- Status progress

Scores are shown as a badge on each lead row. Use them to prioritize who to call first.

## Call Logs
Open a lead drawer and go to the Call Log tab to record every outreach attempt. Enter: date, outcome (Reached, No Answer, Left VM, etc.), and notes. Call logs build your contact history so you always know where a conversation left off.

## FMCSA Verification
Open a lead drawer and click the FMCSA button to pull up the carrier's SAFER profile in your browser. Verify MC number, DOT number, authority status, and insurance before signing.

## Advancing to Signed
When a lead agrees to a dispatch agreement, change their status to Signed. The lead disappears from the active pipeline and the driver becomes available to add as a Driver profile.

## Filtering and Search
Filter leads by status, trailer type, or follow-up date range. The search bar matches on name, company, MC number, and email.`,
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
As you complete loads with a broker, OnTrack builds a lane history. In Load Match, you will see each broker's average RPM and reliability rating based on your actual transaction history.

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
    title: 'Marketing: Facebook Group Posting',
    category: 'Marketing',
    tags: ['marketing', 'Facebook', 'groups', 'post templates', 'coverage', 'recommendations'],
    summary: 'Manage your Facebook group list, generate post content, and track posting history.',
    content: `## What Marketing Does
The Marketing module manages your list of Facebook groups for driver recruitment, generates post content for each group, tracks posting history, and analyzes your group coverage across truck types and regions.

## Groups Tab
The Groups tab shows every Facebook group in your list with:
- Group name and category (Owner Operator, Hotshot, Reefer, etc.)
- Last posted date
- Priority (High, Medium, Low)
- Signed drivers attributed to that group
- Active or Inactive status

## Today's Recommendations
The top of the Groups tab shows which groups to post in today, scored by how long since you last posted and group priority. Post to the recommended groups first before working through the rest of your list.

## Adding a Group
Click + Add Group and enter the group name, Facebook URL if available, category, and priority. Set Active to include it in recommendations.

## Generating a Post
1. Select a group from the list
2. Click Generate Post
3. OnTrack picks an appropriate post template based on the group's category
4. Review the generated post and click Copy to clipboard
5. Paste into Facebook, post, and click Mark Posted

## Post Templates
The Marketing page maintains a library of post templates covering Driver Recruitment, Educational content, New Authority Tips, Lane Availability, and more. Templates rotate automatically so the same post is not repeated within 90 days for the same group.

## Coverage Analysis
The Coverage section shows how many active groups you have in each truck type category. Gaps (underweight categories) are flagged so you can find and add more groups in those areas.

## Post Log
The History tab shows every post you have marked as posted, including which group, which template, and when.`,
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
