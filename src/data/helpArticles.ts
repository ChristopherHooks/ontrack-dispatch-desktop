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

export const DOC_CATEGORIES = ['All', 'SOP', 'Policy', 'Training', 'Template', 'Reference', 'New Authority', 'Other'] as const

export const HELP_CATEGORIES = ['Getting Started', 'Dispatch', 'Leads', 'Drivers', 'Invoicing', 'Backup & Data'] as const

export const KEYBOARD_SHORTCUTS: Shortcut[] = [
  { keys: ['Ctrl', 'K'],   description: 'Open global search' },
  { keys: ['Esc'],         description: 'Close overlay / modal / drawer' },
  { keys: ['?'],           description: 'Open Help center' },
  { keys: ['Ctrl', 'B'],   description: 'Toggle sidebar' },
]

export const HELP_ARTICLES: HelpArticle[] = [
  {
    id: 'getting-started',
    title: 'Getting Started with OnTrack',
    category: 'Getting Started',
    tags: ['overview', 'setup', 'navigation'],
    summary: 'A quick orientation to the OnTrack Dispatch Dashboard and its core modules.',
    content: `## Welcome to OnTrack Dispatch Dashboard
OnTrack is a local-first desktop application for managing your trucking dispatch operation.

## Core Modules
- **Dashboard** - Daily KPIs: drivers needing loads, loads in transit, follow-up leads, outstanding invoices
- **Leads** - Carrier lead pipeline with CRM features, kanban view, and call logs
- **Drivers** - Active driver profiles, documents, expiry tracking
- **Loads** - Full dispatch lifecycle from Searching to Paid
- **Brokers** - Broker database with payment terms, flag management, performance history
- **Invoices** - Generate, send, and track dispatch invoices
- **Tasks** - Daily dispatch checklist with recurring task support
- **Documents** - SOP library and markdown documents
- **Analytics** - Revenue, RPM, lane profitability, and lead conversion metrics

## Navigation
Use the sidebar on the left to navigate between modules. Collapse it with the arrow button to gain more screen space.

## Global Search
Press **Ctrl+K** anywhere to open the global search overlay and find leads, drivers, loads, brokers, and more.
    `,
  },
  {
    id: 'booking-a-load',
    title: 'Booking and Dispatching a Load',
    category: 'Dispatch',
    tags: ['load', 'dispatch', 'booking', 'workflow'],
    summary: 'Step-by-step: create a load, assign a driver, track status through to delivery.',
    content: `## Load Lifecycle
A load moves through these statuses: **Searching > Booked > Picked Up > In Transit > Delivered > Invoiced > Paid**

## Step 1: Create the Load
1. Go to **Loads** in the sidebar
2. Click **+ New Load** in the toolbar
3. Enter: origin/dest cities+states, pickup date, delivery date, miles, rate, commodity
4. Assign a driver and broker
5. Save - status defaults to **Searching**

## Step 2: Confirm and Book
Once rate con is confirmed, open the load drawer and change status to **Booked**.

## Step 3: Track Movement
Update status as the load moves: Picked Up > In Transit > Delivered.

## Step 4: Invoice and Collect
After delivery, open the load and click **Generate Invoice**. Mark invoice Sent when emailed, Paid when collected.

## RPM Calculation
Rate Per Mile = Rate / Miles. Shown automatically in the load drawer.
    `,
  },
  {
    id: 'adding-a-driver',
    title: 'Adding and Managing Drivers',
    category: 'Drivers',
    tags: ['driver', 'onboarding', 'documents', 'CDL'],
    summary: 'How to add a new driver, upload documents, and track CDL and insurance expiry.',
    content: `## Adding a New Driver
1. Go to **Drivers** and click **+ New Driver**
2. Fill in: Name, Company, MC/DOT numbers, Phone, Email
3. Set truck/trailer type, home base, preferred lanes
4. Enter dispatch percent (default 7%) and factoring company if applicable
5. Add CDL number and expiry date for compliance tracking

## Driver Documents
Open the driver drawer and go to the **Documents** tab to upload:
- CDL copy
- Insurance certificate (COI)
- W9 / Lease agreement
- BOL / POD copies

## Expiry Alerts
Drivers with CDL or insurance expiring within 30 days show a warning badge. Check the Drivers table regularly.

## Driver Statuses
- **Active** - Available for loads
- **On Load** - Currently dispatched (set automatically when load is Booked/In Transit)
- **Inactive** - Not currently working
    `,
  },
  {
    id: 'lead-pipeline',
    title: 'Managing the Lead Pipeline',
    category: 'Leads',
    tags: ['leads', 'CRM', 'follow-up', 'kanban'],
    summary: 'Track carrier prospects from first contact to signed dispatch agreement.',
    content: `## Lead Statuses
New > Contacted > Interested > Signed (or Rejected)

## Adding a Lead
1. Go to **Leads** and click **+ New Lead**
2. Enter name, company, MC number, contact info, trailer type
3. Set a follow-up date - leads past their follow-up date appear on the Dashboard

## Kanban vs Table View
Toggle between **Table** and **Kanban** views using the toolbar. Kanban shows leads organized by status.

## Call Logs
Open a lead drawer and use the Call Log tab to record each outreach attempt with date, outcome, and notes.

## Lead Scoring
OnTrack automatically scores leads (0-100) based on: contact info completeness, authority date, follow-up recency, and status progress.
    `,
  },
  {
    id: 'invoicing',
    title: 'Creating and Sending Invoices',
    category: 'Invoicing',
    tags: ['invoice', 'billing', 'dispatch fee', 'payment'],
    summary: 'Generate dispatch invoices from delivered loads and track payment status.',
    content: `## Invoice Lifecycle
Draft > Sent > Paid (or Overdue)

## Generate from a Load
1. Open a load that is **Delivered** or later
2. Click **Generate Invoice** in the load drawer
3. Review: driver gross, dispatch %, dispatch fee
4. Save - invoice is created in Draft status

## Send the Invoice
1. Open the invoice from the Invoices page
2. Click **Email Invoice** to open a pre-filled email via your default mail client
3. Mark status as **Sent** after sending

## Mark as Paid
When payment is received, open the invoice and mark it **Paid**. This also updates the linked load status to Paid.

## Overdue Invoices
Invoices past their payment terms without a paid date show as **Overdue** on the Dashboard KPI card.
    `,
  },
  {
    id: 'daily-sop',
    title: 'Daily Dispatch Checklist SOP',
    category: 'Getting Started',
    tags: ['SOP', 'daily', 'checklist', 'routine'],
    summary: 'Standard operating procedure for starting each dispatch day.',
    content: `## Morning Dispatch Routine

### 1. Review Dashboard (5 min)
- Check KPI cards: drivers needing loads, loads in transit, follow-up leads
- Review today's task checklist

### 2. Update Active Loads (10 min)
- Call or text each driver on active loads
- Update load status: Picked Up, In Transit, or Delivered
- Log any issues in the load notes

### 3. Work the Lead Pipeline (20 min)
- Check leads with follow-up dates today or past
- Make calls, log outcomes in Call Log
- Advance promising leads to next status

### 4. Find Loads for Available Drivers (ongoing)
- Use Dispatch Board to see which drivers need loads
- Post to load boards (DAT, Truckstop) for their preferred lanes
- Create load records when booked

### 5. End-of-Day Invoicing (15 min)
- Generate invoices for any loads marked Delivered today
- Mark sent invoices once emailed to drivers
    `,
  },
  {
    id: 'backup-restore',
    title: 'Backup and Restore Data',
    category: 'Backup & Data',
    tags: ['backup', 'restore', 'data', 'safety'],
    summary: 'OnTrack auto-backs up daily. Learn how to restore from a backup if needed.',
    content: `## Automatic Backups
OnTrack creates a daily backup automatically on launch. Backups are stored in:
OnTrackDashboard/backups/YYYY-MM-DD.db

## Manual Backup
Go to **Settings > Backup & Restore** and click **Create Backup Now**.

## Restore a Backup
1. Go to Settings > Backup & Restore
2. Find the backup you want to restore
3. Click **Restore**, then confirm
4. Restart OnTrack - the restore is applied on the next launch

## Google Drive Sync
To sync between two computers: move the OnTrackDashboard/ folder into Google Drive.
CAUTION: Never open OnTrack on two computers at the same time - SQLite is single-writer only.
    `,
  },
]
