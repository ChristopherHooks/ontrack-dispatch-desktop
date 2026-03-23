import Database from 'better-sqlite3'
import { seedFbGroups } from './repositories/marketingRepo'

export function runSeedIfEmpty(db: Database.Database): void {
  const guard = db.prepare(
    "SELECT value FROM app_settings WHERE key = 'dev_seed_applied'"
  ).get() as { value: string } | undefined
  if (guard?.value === '1') return
  console.log('[Seed] Applying dev seed data...')
  db.transaction(() => {
    seedBrokers(db)
    seedDrivers(db)
    seedLoads(db)
    seedLeads(db)
    seedInvoices(db)
    seedTasks(db)
    seedDocuments(db)
    db.prepare(
      "INSERT OR REPLACE INTO app_settings (key, value, updated_at)" +
      " VALUES ('dev_seed_applied', '1', datetime('now'))"
    ).run()
  })()
  console.log('[Seed] Dev seed complete.')
}

/**
 * Seeds ONLY tasks (101-118) and documents (101-108) via INSERT OR IGNORE.
 * Safe to call on any database at any time — never touches brokers, drivers,
 * loads, leads, invoices, or notes.  Does NOT check the dev_seed_applied guard.
 */
export function seedTasksAndDocsOnly(db: Database.Database): void {
  db.transaction(() => {
    seedTasks(db)
    seedDocuments(db)
  })()
  console.log('[Seed] seedTasksAndDocsOnly: tasks and documents applied (INSERT OR IGNORE).')
}

/**
 * Removes all seed rows (id >= 101) from every table EXCEPT tasks, task_completions,
 * and documents.  Use this to strip out fake sample business data while leaving
 * task templates in place.
 */
export function clearNonTaskSeedData(db: Database.Database): void {
  db.transaction(() => {
    // Order matters — delete dependent tables first to avoid FK constraint issues
    db.prepare('DELETE FROM notes            WHERE id >= 101').run()
    db.prepare('DELETE FROM driver_documents WHERE id >= 101').run()
    db.prepare('DELETE FROM invoices         WHERE id >= 101').run()
    db.prepare('DELETE FROM loads            WHERE id >= 101').run()
    db.prepare('DELETE FROM leads            WHERE id >= 101').run()
    db.prepare('DELETE FROM drivers          WHERE id >= 101').run()
    db.prepare('DELETE FROM brokers          WHERE id >= 101').run()
  })()
  console.log('[Seed] clearNonTaskSeedData: sample brokers/drivers/loads/leads/invoices removed.')
}

/**
 * Inserts only the tasks and documents added after the initial seed (ids 111-118, docs 106-108).
 * Safe to call on any database — uses INSERT OR IGNORE so it is a no-op for rows that
 * already exist.  Does NOT check or touch the dev_seed_applied guard flag.
 */
export function seedMissingItems(db: Database.Database): void {
  // ── Data fixes — outside the main transaction so they always run ─────────────
  // Doc 120 title had an em-dash; normalize to plain hyphen so [[...]] links match.
  db.prepare(
    "UPDATE documents SET title = 'New Driver Pitch - Converting Leads to Signed'" +
    " WHERE id = 120 AND title != 'New Driver Pitch - Converting Leads to Signed'"
  ).run()
  // Patch the em-dash link reference inside doc 122's content to match.
  db.prepare(
    "UPDATE documents SET content = REPLACE(content," +
    " '[[New Driver Pitch \u2014 Converting Leads to Signed]]'," +
    " '[[New Driver Pitch - Converting Leads to Signed]]')" +
    " WHERE id = 122"
  ).run()

  db.transaction(() => {
    const tIns = db.prepare(
      'INSERT OR IGNORE INTO tasks (id, title, category, priority, due_date, time_of_day, recurring, status, notes)' +
      ' VALUES (?,?,?,?,?,?,?,?,?)'
    )
    tIns.run(112,'Facebook Algorithm Training','Marketing','Medium','Daily','9:30 AM',1,'Pending','Like, comment, and share relevant posts in driver groups to train the Facebook algorithm. Engage with at least 5 posts per session. Genuine engagement only -- no spam.')
    tIns.run(114,'Driver Lead Response Monitoring','Marketing','High','Daily','2:00 PM',1,'Pending','Check all DMs and comments from morning posts and outreach. Respond within 2 hours. Move qualified responses to Leads page with status Contacted.')
    tIns.run(116,'Monday FMCSA Lead Review','Leads','High','Monday','8:30 AM',1,'Pending','Run FMCSA import or review leads imported from the past week. Score by fleet size, trailer type, and lane match. Assign follow-up dates. Move high-priority leads to Contacted. See: FMCSA Lead Review Checklist doc.')
    tIns.run(117,'Wednesday Warm Lead Follow-Up','Leads','High','Wednesday','10:00 AM',1,'Pending','Call or message all Contacted and Interested leads that have not responded in 3+ days. Use the warm lead follow-up script. Goal: at least 2 new Interested leads per session. See: Warm Lead Follow-Up Script doc.')
    tIns.run(118,'Friday Driver Conversation Review','Leads','Medium','Friday','3:00 PM',1,'Pending','Review all driver conversations from the week. Update lead statuses. Archive dead leads as Rejected with reason. Identify top 3 leads to prioritize next week. Prep outreach for Monday.')
    tIns.run(119,'Weekly Facebook Groups Review','Marketing','Medium','Sunday','9:00 AM',1,'Pending','Review and update the Facebook groups list. Check for inactive groups or low-performing ones. Look for new groups to join in underweight categories. See the How to Update Facebook Groups document in the Documents library.')

    // ── Comprehensive daily operations tasks (120-132) ──────────────────────
    // These cover every step from morning to EOD, Monday through Friday.
    // Every task has numbered subtasks and [[doc]] links so a new hire
    // can run the business without guesswork.

    // DAILY (Mon-Fri)
    tIns.run(120,'Morning Dashboard Review','Dispatch','High','Daily','8:00 AM',1,'Pending',
      'Start every day here. Open the Dashboard and get your bearings before touching anything else.\n' +
      '1. Look at Drivers Needing Loads -- any Active driver with no load is costing you money. This is your top priority.\n' +
      '2. Look at Loads In Transit -- are all drivers moving? Any ETAs you need to update?\n' +
      '3. Look at Leads Awaiting Follow-Up -- anyone you promised to call today?\n' +
      '4. Look at Outstanding Invoices -- any unpaid invoices over 30 days? Flag them.\n' +
      '5. Scroll through Today\'s Tasks -- note your scheduled times so you do not miss anything.\n' +
      'See: [[Daily Operations Playbook]]')

    tIns.run(121,'Active Load Status Update','Dispatch','High','Daily','8:15 AM',1,'Pending',
      'Confirm every in-transit load is moving and update the app.\n' +
      '1. Go to Loads page.\n' +
      '2. Filter to show Booked, Picked Up, and In Transit loads.\n' +
      '3. For each load: text or call the driver -- "Hey [Name], good morning. Can you confirm your status?"\n' +
      '4. Update the load status in the app based on the driver\'s answer.\n' +
      '5. If a driver has picked up but status is still Booked -- change it to Picked Up.\n' +
      '6. If a load was delivered yesterday and you missed it -- change to Delivered and note the date.\n' +
      '7. If a driver is not responding -- call them. If still no answer after 2 hours, flag it.\n' +
      'See: [[Load Booking and Status SOP]]')

    tIns.run(122,'Post in Today\'s Facebook Groups','Marketing','High','Daily','10:00 AM',1,'Pending',
      'Post content in your recommended groups for today. This is your primary driver acquisition activity.\n' +
      '1. Go to Marketing > Groups tab in the app.\n' +
      '2. Look at the Today\'s Groups panel -- it shows up to 8 groups you should post in today.\n' +
      '3. For each group in the list: open Facebook, find the group, and post your content.\n' +
      '4. Use one of the templates from Marketing > Templates tab, or write naturally in your own voice.\n' +
      '5. After posting in each group: click "Mark Posted" next to that group in the app.\n' +
      '6. Do not post the same exact text in every group -- change a few words each time.\n' +
      '7. If a group requires post approval, allow up to 24 hours before marking it done.\n' +
      'See: [[Facebook Post Script Bank]] | [[Facebook Driver Search SOP]]')

    tIns.run(123,'Midday Driver and Load Check','Dispatch','Medium','Daily','1:00 PM',1,'Pending',
      'Quick midday check to keep loads moving and catch anything missed this morning.\n' +
      '1. Go to Dispatcher Board page.\n' +
      '2. Any Active driver showing "Needs Load"? Go find them a load right now.\n' +
      '3. Log in to your load board (DAT or Truckstop.com).\n' +
      '4. Search for loads near the driver\'s current location, matching their equipment.\n' +
      '5. Call the broker for the load you want. Negotiate if the rate is low.\n' +
      '6. Once booked: add the load in the Loads page with status Booked.\n' +
      '7. Text the driver the pickup details immediately.\n' +
      'See: [[Load Booking and Status SOP]] | [[Broker Rate Negotiation Script]]')

    tIns.run(124,'New Driver Inquiry Response','Leads','High','Daily','3:30 PM',1,'Pending',
      'Check for new driver inquiries and respond before end of business day.\n' +
      '1. Open Facebook and check all DMs and group comment replies.\n' +
      '2. Check email at dispatch@ontrackhaulingsolutions.com.\n' +
      '3. For every new inquiry: add the person to the Leads page immediately with status New.\n' +
      '4. Send them the first-contact response using the script.\n' +
      '5. Set a follow-up date for tomorrow in the lead record.\n' +
      '6. Do not leave any inquiry unanswered overnight -- response speed is your competitive edge.\n' +
      'See: [[Driver Intake Script]]')

    tIns.run(125,'End-of-Day Close Out','Dispatch','Medium','Daily','5:00 PM',1,'Pending',
      'Close out the day properly so tomorrow starts clean.\n' +
      '1. Go to Leads page -- update the status and notes on every lead you interacted with today.\n' +
      '2. Go to Loads page -- confirm all load statuses are current.\n' +
      '3. Check your Facebook DMs one final time for any last-minute messages.\n' +
      '4. Set follow-up dates on any leads that need a call or message tomorrow.\n' +
      '5. Write one sentence in your own notes about today: what worked, what did not.\n' +
      '6. Tomorrow starts at 8:00 AM -- close your browser tabs and stop working.\n' +
      'See: [[Daily Operations Playbook]]')

    // MONDAY-SPECIFIC
    tIns.run(126,'Monday Weekly Goal Review','Dispatch','High','Monday','8:00 AM',1,'Pending',
      'Start every Monday knowing exactly where you stand and what you need to accomplish this week.\n' +
      '1. Go to Invoices page -- total up the dispatch fees paid last week. Write it down.\n' +
      '2. Weekly target: $1,000/week = $4,000/month. Are you on track?\n' +
      '3. Go to Leads page -- how many signed drivers do you have active right now?\n' +
      '4. To hit $4k/month with 7% dispatch: you need roughly $57k in driver gross per month.\n' +
      '   That is about 3 drivers each grossing $19k/month, or 4 drivers at $14k/month.\n' +
      '5. If you are behind: your primary job today is to sign at least 1 more driver.\n' +
      '6. Write your 3 most important actions for this week at the top of your notes.\n' +
      'See: [[Weekly Revenue Tracking Guide]]')

    // TUESDAY-SPECIFIC
    tIns.run(127,'Tuesday Load Board Search','Dispatch','High','Tuesday','9:00 AM',1,'Pending',
      'Tuesday morning load board sweep -- find loads for all available drivers.\n' +
      '1. Go to Dispatcher Board. Identify every Active driver with no current load.\n' +
      '2. For each available driver: open your load board (DAT or Truckstop).\n' +
      '3. Search from their home base or last known location for available loads.\n' +
      '4. Target: RPM at or above the driver\'s minimum (check their driver record in the app).\n' +
      '5. Call the broker, confirm the rate, and get a verbal agreement before hanging up.\n' +
      '6. Email the broker your carrier packet (if new broker) and request the rate confirmation.\n' +
      '7. Add the load in the Loads page and text pickup details to the driver.\n' +
      'See: [[Load Booking and Status SOP]] | [[Broker Rate Negotiation Script]]')

    tIns.run(128,'Tuesday Driver Onboarding Follow-Up','Leads','Medium','Tuesday','2:00 PM',1,'Pending',
      'Follow up with any driver who expressed interest but has not signed yet.\n' +
      '1. Go to Leads page. Filter by status Interested.\n' +
      '2. For each Interested lead with follow_up_date on or before today: call them.\n' +
      '3. Script: "Hey [Name], this is Chris from OnTrack. Just checking in -- are you ready to get moving? I have loads available in your lanes right now."\n' +
      '4. If they say yes: schedule a call to walk through the onboarding steps.\n' +
      '5. If they say not yet: ask what is holding them back and address it directly.\n' +
      '6. Update the lead status and set the next follow-up date.\n' +
      'See: [[Driver Intake Script]] | [[Driver Onboarding Checklist]]')

    // THURSDAY-SPECIFIC
    tIns.run(129,'Thursday Broker Outreach','Leads','Medium','Thursday','10:00 AM',1,'Pending',
      'Build broker relationships to ensure consistent freight for your drivers.\n' +
      '1. Go to Brokers page. Review your Preferred brokers.\n' +
      '2. Call or email your top 3 brokers. Ask: "Do you have any consistent freight coming up in the next week?"\n' +
      '3. Ask specifically about lanes that match your drivers\' home bases and preferred routes.\n' +
      '4. For any broker offering good consistent freight: note their lanes and contact in the broker record.\n' +
      '5. If any broker has been slow to pay: call their accounting department and reference the invoice number.\n' +
      '6. Add any new brokers you booked loads with this week to the Brokers page.\n' +
      'See: [[Broker Rate Negotiation Script]]')

    tIns.run(130,'Thursday Driver Pipeline Review','Leads','High','Thursday','2:00 PM',1,'Pending',
      'Push every warm lead closer to signing. This is your conversion session.\n' +
      '1. Go to Leads page. Filter by status Interested and Contacted.\n' +
      '2. For every Interested lead: this is a signing candidate. Call them today.\n' +
      '3. Opening: "Hey [Name], I wanted to personally reach out. I have a load in [their lane] available Monday and I want to offer it to you first if you want to move forward."\n' +
      '4. If they agree to sign: walk them through the [[Driver Onboarding Checklist]] step by step.\n' +
      '5. For Contacted leads overdue by 5+ days with no response: send one final message, then move to Rejected if still no answer.\n' +
      '6. Update every lead status and note the outcome of each conversation.\n' +
      'See: [[Driver Onboarding Checklist]] | [[Driver Intake Script]]')

    // FRIDAY-SPECIFIC
    tIns.run(131,'Friday Invoice and Payment Review','Admin','High','Friday','8:30 AM',1,'Pending',
      'Handle all invoicing and payment tracking before the weekend.\n' +
      '1. Go to Loads page. Find all loads delivered this week with status Delivered.\n' +
      '2. For each: go to Invoices page, create an invoice, and update the load to status Invoiced.\n' +
      '3. Send the invoice to the broker by email with the POD attached.\n' +
      '4. Check for any invoices marked Overdue -- call that broker today before 5 PM.\n' +
      '5. For any invoice Paid this week: record the amount in your weekly revenue notes.\n' +
      '6. Update the driver\'s pay record for the week.\n' +
      'See: [[Weekly Revenue Tracking Guide]]')

    tIns.run(132,'Friday Weekly Revenue and Pipeline Snapshot','Admin','High','Friday','4:00 PM',1,'Pending',
      'End every Friday knowing exactly where you stand. This 15-minute review keeps you on track.\n' +
      '1. Go to Analytics page. Note this week\'s total revenue and compare to your $1,000/week target.\n' +
      '2. Are you behind? By how much? Write it down.\n' +
      '3. Go to Leads page. Count: how many Interested leads do you have right now?\n' +
      '4. Identify your single most likely sign next week -- write their name down.\n' +
      '5. Go to Dispatcher Board -- any drivers sitting empty going into the weekend?\n' +
      '6. If a driver is empty Friday afternoon: call them and see if they want a short weekend load or are resting.\n' +
      '7. Set your top 3 Monday actions in your notes and close the app.\n' +
      'See: [[Weekly Revenue Tracking Guide]] | [[Daily Operations Playbook]]')

    const dIns = db.prepare(
      'INSERT OR IGNORE INTO documents (id, title, category, content, driver_id, doc_type, expiry_date)' +
      ' VALUES (?,?,?,?,?,?,?)'
    )
    dIns.run(106,'Facebook Driver Search SOP','Marketing','# Facebook Driver Search SOP\n\n## Purpose\nSystematic daily process for finding owner-operator drivers on Facebook who are actively seeking dispatch services.\n\n## Target Groups\n- Dispatch Nation\n- Owner Operators United\n- CDL Truckers Network\n- Trucking & Freight Professionals\n- Independent Owner Operators\n\n## Search Keywords\n- "looking for dispatcher"\n- "need dispatch"\n- "seeking dispatch service"\n- "available truck"\n- "looking for loads"\n- "need a dispatcher"\n\n## Daily Workflow\n1. 9:00 AM -- Morning sweep: search each group for the keywords above. Note any new posts from the last 24 hours.\n2. 9:30 AM -- Algorithm training: like and comment on 5+ relevant posts to boost your visibility in those groups.\n3. 11:30 AM -- Second sweep: check for any new posts since morning.\n4. 2:00 PM -- Response monitoring: reply to any DMs or comments received from outreach.\n5. 4:30 PM -- Final sweep: last check before end of day. Set follow-up reminders for unresponded leads.\n\n## Outreach Message Template\n"Hi [Name], I saw your post and wanted to reach out. I run a dispatch service for owner-operators -- we handle load searching, rate negotiation, paperwork, and broker relationships so you can focus on driving. Our rate is 7% of gross. Would you be open to a quick call this week?"\n\n## Notes\n- Always message from the OnTrack Hauling Solutions page, not a personal account.\n- Log every contact in the Leads page immediately.\n- Do not follow up more than 3 times without a response.',null,null,null)
    dIns.run(107,'Warm Lead Follow-Up Script','SOP','# Warm Lead Follow-Up Script\n\n## Purpose\nScript and process for following up with Contacted and Interested leads who have not responded in 3+ days.\n\n## When to Use\nEvery Wednesday at 10:00 AM. Pull all leads with status Contacted or Interested and follow_up_date on or before today.\n\n## Phone Script\n"Hi, this is Chris from OnTrack Hauling Solutions. I reached out a few days ago about our dispatch service. I wanted to follow up and see if you had any questions or if the timing is better now. We work with owner-operators on a 7% dispatch rate -- no contracts, just results. Do you have 5 minutes to chat?"\n\n## Text/DM Script\n"Hey [Name], just following up from my message earlier this week. Still interested in talking about dispatch? Happy to answer any questions. No pressure at all."\n\n## Email Script\nSubject: Following up -- OnTrack Dispatch Services\n\n"Hi [Name],\n\nI wanted to follow up on my earlier message about OnTrack Hauling Solutions dispatch services.\n\nWe help owner-operators find quality loads, negotiate rates, and handle broker paperwork -- all for 7% of gross revenue with no long-term contracts.\n\nIf you have a few minutes this week, I would love to connect. What does your schedule look like?\n\nBest,\nChris Hooks\nOnTrack Hauling Solutions\ndispatch@ontrackhaulingsolutions.com"\n\n## Follow-Up Rules\n- Attempt 1: Day 3 after initial contact (phone or DM)\n- Attempt 2: Day 7 (email or text)\n- Attempt 3: Day 14 (final call)\n- After 3 attempts with no response: mark lead as Rejected with note "No response after 3 attempts"\n\n## Tracking\nUpdate lead notes after every contact attempt with date, method, and outcome.',null,null,null)
    dIns.run(108,'FMCSA Lead Review Checklist','SOP','# FMCSA Lead Review Checklist\n\n## Purpose\nWeekly Monday process for reviewing FMCSA-imported leads and prioritizing outreach.\n\n## Step 1 -- Run the Import\n1. Go to Leads page.\n2. Click "FMCSA Import" button.\n3. Wait for the import to complete. Note how many leads were added.\n\n## Step 2 -- Score New Leads\nFor each new lead, evaluate:\n- Fleet size: 2+ trucks = High priority. Solo = Medium. Unknown = Low.\n- Trailer type match: Flatbed, Reefer, Dry Van -- all acceptable. Specials (Tanker, HazMat) = lower priority.\n- Authority date: Less than 1 year old = hot lead, new to the industry, may not have dispatcher yet.\n- Location: Drivers in TX, TN, GA, IL, OH, MO = strong lane match for our network.\n\n## Step 3 -- Assign Follow-Up Dates\n- High priority: follow-up within 2 business days.\n- Medium priority: follow-up within 5 business days.\n- Low priority: follow-up within 10 business days.\n\n## Step 4 -- Update Statuses\n- Any lead you have already spoken to: move from New to Contacted.\n- Any lead that expressed interest: move to Interested.\n- Any duplicate you recognize: mark Rejected with note "Duplicate".\n\n## Step 5 -- Review Existing Pipeline\n- Check all Contacted leads for stale follow-up dates.\n- Check all Interested leads -- any ready to close this week?\n- Review any Rejected leads from last week for accuracy.\n\n## Notes\nTarget: review and score all new leads within 2 hours of import on Monday morning.',null,null,null)
    dIns.run(123,'How to Update Facebook Groups','SOP','# How to Update Facebook Groups\n\n## Where the Groups File Lives\nThe Facebook groups list is stored in:\n  electron/main/fbGroupsSeed.ts\n\nThis is a TypeScript file you can open in any text editor or VS Code. Every group is a JavaScript object with clearly labeled fields.\n\n## How to Add a New Group\n1. Open fbGroupsSeed.ts.\n2. Find the section that matches the group\'s category (e.g., "Hotshot", "Owner Operator").\n3. Copy any existing entry and paste it at the end of that section.\n4. Update the name field to exactly match the group name on Facebook.\n5. Leave url as null unless you have the actual group URL.\n6. Set category, priority, and active.\n7. Save the file.\n8. In the app: Settings > Dev Tools > Seed Missing Items.\n\n## How to Add a URL\nIf you find the Facebook group URL:\n1. Open fbGroupsSeed.ts.\n2. Find the entry by name.\n3. Change url: null to url: \'https://www.facebook.com/groups/XXXXXXXX\'.\n4. Save and run Seed Missing Items. Note: INSERT OR IGNORE is used, so the URL update will only apply to NEW groups. For existing rows, update directly in Marketing > Groups > Edit.\n\n## How to Change a Category\n1. Find the group in fbGroupsSeed.ts.\n2. Change the category field to one of: hotshot, box_truck, owner_operator, dispatcher, general_loads, reefer, mixed, other.\n3. Save and run Seed Missing Items (applies to new groups only).\n4. For groups already in the database, go to Marketing > Groups > Edit.\n\n## How to Mark a Group Inactive\nOption A (preferred): In the app, go to Marketing > Groups. Find the group, click Edit, uncheck Active, click Save.\nOption B: In fbGroupsSeed.ts, set active: false. Run Seed Missing Items (applies to new rows only; existing rows require Option A).\n\n## How to Change Priority\nSame as category -- edit fbGroupsSeed.ts for new rows, or use Marketing > Groups > Edit for existing rows.\n\n## How to Track Last Posted / Performance\n- Last posted: click "Mark Posted" next to any group in Marketing > Groups. Updates automatically.\n- Leads generated: manually increment in Marketing > Groups > Edit (leads_generated_count field).\n- Signed drivers: same -- manually track in Marketing > Groups > Edit.\n\n## Weekly Review Process (every Sunday)\n1. Go to Marketing > Groups tab.\n2. Look at the Coverage section -- are any categories underweight?\n3. Look at the Today\'s Recommendations section -- are the right groups showing up?\n4. Check for any groups that are inactive but should be re-activated.\n5. Search Facebook for any new groups in underweight categories.\n6. Add new groups to fbGroupsSeed.ts and run Seed Missing Items.\n7. Mark this task complete in the Tasks page.\n\n## How the App Picks Today\'s Groups\nThe recommendation engine scores every active group using these factors:\n- Never posted: +50 points\n- Each day since last post: +2 points (max 30)\n- High priority: +30 points, Medium: +15 points\n- Review overdue (>30 days): +10 points\n- Already posted today: removed from recommendations\n\nGroups are then sorted by score with a diversity cap of 3 groups per category. The top 8 are shown as today\'s recommendations.\n\n## Related Documents\n- [[Facebook Driver Search SOP]]\n- [[Facebook Groups Review]] (this document)\n\n## Notes\n- Do not delete rows from the file -- mark inactive instead.\n- URLs are optional and can be added at any time.\n- The file is plain TypeScript. If you break the syntax, the app will fail to start. Always check your brackets and commas.',null,null,null)

    // ── Operations playbooks and scripts (125-131) ────────────────────────────

    dIns.run(125,'Daily Operations Playbook','SOP',
      '# Daily Operations Playbook\n\n' +
      '## Overview\n' +
      'This document is the master guide for running OnTrack Hauling Solutions every day. Follow it in order, every weekday, without skipping steps. If you do all of this consistently, you will hit $4,000/month.\n\n' +
      '## The Core Math\n' +
      '- Dispatch rate: 7% of driver gross\n' +
      '- To earn $4,000/month: drivers must gross approximately $57,000/month combined\n' +
      '- With 3 active drivers each grossing $19,000/month: you hit the goal\n' +
      '- Average driver earns $1,000-2,000/week gross on regional runs\n' +
      '- Your job: keep them loaded and find more drivers\n\n' +
      '## Daily Schedule (Every Weekday)\n\n' +
      '### 8:00 AM -- Morning Dashboard Review\n' +
      '1. Open the Dashboard. Look for any red flags: drivers needing loads, overdue leads, outstanding invoices.\n' +
      '2. Note your top 3 priorities for today.\n\n' +
      '### 8:15 AM -- Active Load Status Update\n' +
      '1. Text or call every driver with an active load.\n' +
      '2. Confirm they are moving. Update load statuses in the app.\n\n' +
      '### 9:00 AM -- Facebook Driver Search\n' +
      '1. Open Facebook. Search your target groups for new driver posts.\n' +
      '2. Message any promising drivers using the [[Driver Intake Script]].\n' +
      '3. Log every new contact in Leads immediately.\n\n' +
      '### 9:30 AM -- Algorithm Training\n' +
      '1. Like and comment on 5+ posts in driver groups.\n' +
      '2. This keeps your posts visible to drivers. Do not skip this -- it takes 5 minutes.\n\n' +
      '### 10:00 AM -- Facebook Group Posting Session\n' +
      '1. Go to Marketing > Groups. Look at Today\'s Groups panel.\n' +
      '2. Post in each recommended group. Use templates from Marketing > Templates.\n' +
      '3. Mark each group as posted in the app after you post.\n' +
      'See: [[Facebook Post Script Bank]]\n\n' +
      '### 11:30 AM -- Second Driver Sweep\n' +
      '1. Check Facebook again for any new posts since morning.\n' +
      '2. Message new prospects. Add to Leads.\n\n' +
      '### 1:00 PM -- Midday Driver and Load Check\n' +
      '1. Open Dispatcher Board. Any active driver without a load is your #1 priority.\n' +
      '2. Go to your load board and find them a load. Book it. Update the app.\n' +
      'See: [[Load Booking and Status SOP]]\n\n' +
      '### 2:00 PM -- Lead Response Monitoring\n' +
      '1. Check all Facebook DMs and email for driver responses.\n' +
      '2. Reply to everyone. Update lead statuses.\n\n' +
      '### 3:30 PM -- New Driver Inquiry Response\n' +
      '1. Final check of all incoming messages.\n' +
      '2. Add any new contacts to Leads. Set follow-up dates.\n' +
      'See: [[Driver Intake Script]]\n\n' +
      '### 4:30 PM -- Final Driver Lead Sweep\n' +
      '1. Last check of Facebook and email.\n' +
      '2. Set follow-up reminders for tomorrow.\n\n' +
      '### 5:00 PM -- End-of-Day Close Out\n' +
      '1. Update all lead notes and statuses.\n' +
      '2. Confirm all load statuses are current.\n' +
      '3. Tomorrow starts at 8:00 AM. Stop working.\n\n' +
      '## Non-Negotiable Rules\n' +
      '- Respond to every driver message within 2 hours during business hours\n' +
      '- Never leave a driver empty for more than 24 hours if they want to run\n' +
      '- Log every contact in the app the same day it happens\n' +
      '- If you skip a step today, do not skip it tomorrow\n\n' +
      '## Related Documents\n' +
      '- [[Driver Intake Script]]\n' +
      '- [[Facebook Post Script Bank]]\n' +
      '- [[Load Booking and Status SOP]]\n' +
      '- [[Driver Onboarding Checklist]]\n' +
      '- [[Weekly Revenue Tracking Guide]]',
      null,null,null)

    dIns.run(126,'Facebook Post Script Bank','Template',
      '# Facebook Post Script Bank\n\n' +
      '## How to Use This\n' +
      'Pick one post style per day. Change the wording slightly each time -- do not copy-paste the same exact post into multiple groups without tweaking it. Authentic posts outperform copy-paste every time.\n\n' +
      '## Post Style 1 -- Direct Recruitment\n' +
      '"Any owner-operators in here running [region] lanes looking for a dispatcher? I\'m booking consistent dry van freight right now and have lanes available. Low rate, no contracts. Comment or DM me."\n\n' +
      '## Post Style 2 -- Load Availability\n' +
      '"Just got a load available: [Origin City] to [Destination City], [trailer type], [approximate rate]. Looking for a reliable driver with a [truck type]. If you or someone you know is interested, message me directly."\n\n' +
      '## Post Style 3 -- Value Question\n' +
      '"Quick question for any owner-operators in here -- what is the one thing you wish your dispatcher did better? Just trying to understand what actually matters to you guys."\n\n' +
      '## Post Style 4 -- Authority Tip\n' +
      '"If you got your MC authority in the last 6 months, this one\'s for you. The first 90 days are the hardest -- finding consistent freight, dealing with brokers, figuring out what lanes actually pay. If you want someone in your corner handling that so you can focus on driving, I have availability right now."\n\n' +
      '## Post Style 5 -- Social Proof\n' +
      '"One of my drivers just finished a [Origin State] to [Destination State] run at [rate per mile] RPM. Clean load, good broker, paid on time. If you want more runs like this, I have lanes available. DM me."\n\n' +
      '## Post Style 6 -- Re-engagement\n' +
      '"Still looking for owner-operators for consistent freight. I\'ve been in this group for a while and the drivers I\'ve worked with have been great. If you\'re tired of chasing loads and want someone handling the broker side, let\'s talk."\n\n' +
      '## DM Response Template (when someone replies to a post)\n' +
      '"Hey [Name], thanks for reaching out. Tell me a little about your setup -- what equipment are you running, what lanes do you prefer, and are you currently with a dispatcher or running on your own? I want to make sure we\'re a good fit before we talk numbers."\n\n' +
      '## Rules\n' +
      '- Never use emojis or bullet points with symbols in posts\n' +
      '- Write like you are talking to someone, not advertising\n' +
      '- Keep posts under 150 words\n' +
      '- Respond to every comment within 1 hour\n\n' +
      'See: [[Facebook Driver Search SOP]] | [[Driver Intake Script]]',
      null,null,null)

    dIns.run(127,'Driver Intake Script','SOP',
      '# Driver Intake Script\n\n' +
      '## Purpose\n' +
      'Use this script for every first contact with a new driver prospect -- DM, text, or phone call. The goal is to qualify them quickly and move them toward a 15-minute call.\n\n' +
      '## Step 1 -- First DM Response\n' +
      'When a driver replies to your post or DMs you first:\n\n' +
      '"Hey [Name], thanks for reaching out. I\'d love to learn more about your setup. Can you tell me:\n' +
      '1. What are you running (truck type and trailer)?\n' +
      '2. What lanes or regions do you prefer?\n' +
      '3. Are you currently working with a dispatcher or running on your own?\n\n' +
      'I want to make sure I can actually help before we talk further."\n\n' +
      '## Step 2 -- Qualifying Their Answer\n' +
      'Good signs:\n' +
      '- Dry van, flatbed, reefer, step deck -- all good\n' +
      '- Hotshot / gooseneck / bumper pull (non-CDL) -- accepted, confirm GVWR under 26,001 lbs\n' +
      '- Running without a dispatcher or unhappy with current one\n' +
      '- Has their own authority (MC number)\n' +
      '- Based in TX, TN, GA, IL, OH, MO or anywhere in the Southeast or Midwest\n\n' +
      'Red flags (proceed with caution):\n' +
      '- No authority yet (just applied)\n' +
      '- Looking for 90-day contract loads only\n' +
      '- Wants to pay less than 6%\n\n' +
      '## Step 3 -- Moving to a Call\n' +
      '"Based on what you\'ve told me, I think I can help. I have loads available in your lanes right now. Do you have 15 minutes today or tomorrow for a quick call? I can walk you through exactly how we work and answer any questions."\n\n' +
      '## Step 4 -- The 15-Minute Call\n' +
      'On the call, cover in this order:\n' +
      '1. Confirm their equipment details and preferred lanes\n' +
      '2. Explain the service: 7% of gross, no contracts, you handle load search + rate negotiation + paperwork\n' +
      '3. Ask: "What would make this a no-brainer for you?"\n' +
      '4. If they are ready: send the dispatcher agreement by email\n' +
      '5. Set a start date -- ideally within 3 days\n\n' +
      '## Step 5 -- After the Call\n' +
      '1. Update the lead status to Interested or Signed in the app\n' +
      '2. Set a follow-up date if they need more time\n' +
      '3. If they signed: begin the onboarding steps\n\n' +
      'See: [[Driver Onboarding Checklist]] | [[Warm Lead Follow-Up Script]]',
      null,null,null)

    dIns.run(128,'Load Booking and Status SOP','SOP',
      '# Load Booking and Status SOP\n\n' +
      '## Purpose\n' +
      'Step-by-step guide for finding, booking, and tracking loads for your drivers. Follow this process every time.\n\n' +
      '## Step 1 -- Identify Available Drivers\n' +
      '1. Open Dispatcher Board in the app.\n' +
      '2. Any Active driver with "Needs Load" is your priority.\n' +
      '3. Check their driver record for: equipment type, preferred lanes, minimum RPM.\n\n' +
      '## Step 2 -- Search the Load Board\n' +
      '1. Log in to DAT (dat.com) or Truckstop (truckstop.com).\n' +
      '2. Search from the driver\'s current location or home base.\n' +
      '3. Filter by their equipment type and target lanes.\n' +
      '4. Target loads with RPM at or above their minimum (check driver record).\n' +
      '5. Avoid brokers flagged as "Avoid" or "Slow Pay" in your Brokers page.\n\n' +
      '## Step 3 -- Call the Broker\n' +
      '1. Call the broker\'s dispatch line.\n' +
      '2. Give your MC number and say: "I have a [truck type] available at [location], interested in load [reference number]."\n' +
      '3. If the rate is low, use the [[Broker Rate Negotiation Script]].\n' +
      '4. Get a verbal agreement on the rate before hanging up.\n' +
      '5. Ask for a rate confirmation by email.\n\n' +
      '## Step 4 -- Book the Load in the App\n' +
      '1. Go to Loads page, click New Load.\n' +
      '2. Fill in: Origin, Destination, Driver, Broker, Pickup Date, Rate.\n' +
      '3. Set status to Booked.\n' +
      '4. Enter the broker\'s load reference number in the Load ID field.\n\n' +
      '## Step 5 -- Notify the Driver\n' +
      '1. Text or call the driver with: pickup location, pickup time, delivery location, broker contact, and any special instructions.\n' +
      '2. Confirm they received it and are en route.\n\n' +
      '## Step 6 -- Update Status as Load Progresses\n' +
      '- When driver confirms pickup: change status to Picked Up\n' +
      '- When driver confirms they are on the road: change to In Transit\n' +
      '- When driver delivers: change to Delivered\n' +
      '- After invoicing: change to Invoiced\n\n' +
      '## Step 7 -- After Delivery\n' +
      '1. Get the POD (Proof of Delivery) from the driver by text or email.\n' +
      '2. Create an invoice in the Invoices page.\n' +
      '3. Send the invoice to the broker with the POD attached.\n\n' +
      'See: [[Broker Rate Negotiation Script]] | [[Daily Operations Playbook]]',
      null,null,null)

    dIns.run(129,'Broker Rate Negotiation Script','SOP',
      '# Broker Rate Negotiation Script\n\n' +
      '## Purpose\n' +
      'Use this script to negotiate better rates with brokers. Most brokers have more room than their first offer. A 10-15 cent RPM increase on a 1,000-mile load is $100-150 more in your driver\'s pocket and more in yours.\n\n' +
      '## The Basic Counter\n' +
      '"I appreciate the offer, but based on current fuel costs and my driver\'s minimum, I need to come in at [your target rate]. Can you work with that?"\n\n' +
      '## When They Say No\n' +
      '"I understand. Is there any flexibility at all, or is that a firm number? My driver is sitting right now and I want to make this work if possible."\n\n' +
      '## The Fuel Argument\n' +
      '"Diesel is running [current price] in that corridor right now. At your current offer, my driver barely breaks even after fuel and fixed costs. The minimum I can take to make this profitable for both of us is [rate]."\n\n' +
      '## The Competition Argument\n' +
      '"I actually have another load offer at [slightly higher rate] for this same equipment and time window. I prefer working with you because of your payment history. Can you match it?"\n\n' +
      '## When to Accept Without Negotiating\n' +
      '- Preferred broker with consistent loads\n' +
      '- Rate is already at or above driver\'s minimum RPM\n' +
      '- Driver needs the load immediately and alternatives are limited\n\n' +
      '## After Booking\n' +
      '1. Always get a written rate confirmation before the driver leaves for pickup.\n' +
      '2. Make sure the rate on the rate con matches what was agreed verbally.\n' +
      '3. If the rate con is wrong: call and correct it before pickup.\n\n' +
      'See: [[Load Booking and Status SOP]]',
      null,null,null)

    dIns.run(130,'Driver Onboarding Checklist','SOP',
      '# Driver Onboarding Checklist\n\n' +
      '## Purpose\n' +
      'Follow this checklist every time a new driver agrees to work with OnTrack. Do not start booking loads until every item is complete.\n\n' +
      '## Before You Start\n' +
      '- You have had the 15-minute intake call\n' +
      '- Driver has confirmed they want to move forward\n' +
      '- Driver has an active MC authority (not just applied)\n\n' +
      '## Step 1 -- Collect Driver Information\n' +
      '1. Full legal name (as on their CDL)\n' +
      '2. MC number and DOT number\n' +
      '3. CDL number and expiration date\n' +
      '4. Phone number and email address\n' +
      '5. Truck type (year, make, model if possible)\n' +
      '6. Trailer type (dry van, reefer, flatbed, step deck, etc.)\n' +
      '7. Home base city and state\n' +
      '8. Preferred lanes or regions\n' +
      '9. Minimum RPM (rate per mile) they will run\n' +
      '10. Factoring company name (if they use one)\n' +
      '11. Insurance company and policy expiry date\n\n' +
      '## Step 2 -- Add Driver to the App\n' +
      '1. Go to Drivers page in the OnTrack app.\n' +
      '2. Click New Driver.\n' +
      '3. Fill in all the information collected in Step 1.\n' +
      '4. Set status to Active.\n' +
      '5. Save the record.\n\n' +
      '## Step 3 -- Verify Their Authority\n' +
      '1. Go to https://safer.fmcsa.dot.gov\n' +
      '2. Look up their MC number.\n' +
      '3. Confirm: Operating Status is AUTHORIZED FOR HHG or AUTHORIZED FOR PROPERTY.\n' +
      '4. Confirm: Insurance is active (check the insurance filing section).\n' +
      '5. If anything is wrong: do not book loads until it is resolved.\n\n' +
      '## Step 4 -- Send the Dispatcher Agreement\n' +
      '1. Send the dispatcher agreement by email.\n' +
      '2. Confirm they have signed and returned it before booking any loads.\n' +
      '3. Save the signed agreement.\n\n' +
      '## Step 5 -- Get Their Carrier Packet Ready\n' +
      'You will need to submit a carrier packet to brokers. Collect:\n' +
      '1. Certificate of Insurance (COI) -- driver provides this\n' +
      '2. MC authority letter -- from FMCSA\n' +
      '3. W-9 form -- driver fills this out\n' +
      '4. Void check (for direct deposit, if applicable)\n\n' +
      '## Step 6 -- Book Their First Load\n' +
      '1. Ask the driver: "Where are you right now and when are you available?"\n' +
      '2. Follow the [[Load Booking and Status SOP]] to find their first load.\n' +
      '3. Aim to get them loaded within 24 hours of signing.\n\n' +
      '## Step 7 -- Update the Lead Record\n' +
      '1. Go to Leads page. Find the driver\'s lead record.\n' +
      '2. Change status to Signed.\n' +
      '3. Note the signing date in the lead notes.\n\n' +
      'See: [[Load Booking and Status SOP]] | [[Driver Intake Script]]',
      null,null,null)

    dIns.run(131,'Weekly Revenue Tracking Guide','Reference',
      '# Weekly Revenue Tracking Guide\n\n' +
      '## Your Goal\n' +
      '- Monthly target: $4,000 in dispatch fees\n' +
      '- Weekly target: $1,000 per week\n' +
      '- Daily target: $200 per weekday\n\n' +
      '## The Math\n' +
      'Dispatch fee = 7% of driver gross load revenue.\n' +
      'To earn $1,000 this week: your drivers need to gross about $14,300 in load revenue combined.\n' +
      'Example: 3 drivers each running 2 loads at $2,400 each = $14,400 gross = $1,008 dispatch fees.\n\n' +
      '## How to Track Your Revenue\n\n' +
      '### Every Friday\n' +
      '1. Go to Invoices page in the app.\n' +
      '2. Look at invoices marked Paid this week. Add up the dispatch fee amounts.\n' +
      '3. That is your actual revenue for the week.\n' +
      '4. Compare to the $1,000/week target.\n\n' +
      '### Monthly Check (1st of each month)\n' +
      '1. Go to Analytics page.\n' +
      '2. Look at Revenue by Month chart.\n' +
      '3. Compare to your $4,000/month target.\n\n' +
      '## If You Are Behind\n' +
      'If you are below $1,000 by Friday:\n' +
      '1. Sign more drivers -- this is almost always the root cause.\n' +
      '2. Check if any of your active drivers have been underloaded this week.\n' +
      '3. Check if any invoices from loads this week are still outstanding (unpaid).\n\n' +
      '## Driver Revenue Targets\n' +
      '- Minimum viable driver: $3,500/week gross = $245/week for you\n' +
      '- To hit $4k/month solo: you need 4+ drivers averaging $3,500/week each\n' +
      '- Focus on drivers running 48-state or long regional routes -- they gross more\n\n' +
      '## What to Do When a Driver is Underperforming\n' +
      '1. Call them: "Hey [Name], I noticed you only ran 1 load this week. Is everything okay? Are you available to run more?"\n' +
      '2. If they want more runs: find them a load today.\n' +
      '3. If they are inactive for 2+ weeks with no explanation: mark them Inactive in the app.\n\n' +
      'See: [[Daily Operations Playbook]] | [[Load Booking and Status SOP]]',
      null,null,null)

    dIns.run(124,'How to Save Facebook Groups as HTML','SOP',
      '# How to Save Facebook Groups as HTML\n\n' +
      '## What This Does\n' +
      'This method lets you save your current list of Facebook groups to an HTML file, then import it into the OnTrack app to automatically add any new groups you have joined. Existing groups already in the app are never duplicated.\n\n' +
      '## Step 1 -- Open Your Facebook Groups Page\n' +
      '1. Open a web browser on your computer (Chrome or Edge work best).\n' +
      '2. Go to https://www.facebook.com\n' +
      '3. Log in if needed.\n' +
      '4. In the left sidebar, click "Groups" or go to https://www.facebook.com/groups/\n' +
      '5. Click "Your groups" to see the full list of groups you have joined.\n' +
      '6. Scroll all the way down the page until all groups are visible. Facebook loads groups as you scroll, so if you have many groups, scroll slowly until no more appear.\n\n' +
      '## Step 2 -- Save the Page as HTML\n' +
      '**In Chrome or Edge:**\n' +
      '1. Press Ctrl+S on your keyboard (or File > Save As from the browser menu).\n' +
      '2. A "Save As" dialog will open.\n' +
      '3. Choose where to save it -- your Desktop works well.\n' +
      '4. In the "Save as type" dropdown, select "Webpage, HTML Only" (not "Complete").\n' +
      '5. Give it a recognizable name like facebook-groups-2026-03.html\n' +
      '6. Click Save.\n\n' +
      '## Step 3 -- Import into the App\n' +
      '1. Open the OnTrack app.\n' +
      '2. Go to Marketing > Groups tab.\n' +
      '3. Click the "Import from HTML" button at the top of the Groups tab.\n' +
      '4. A file picker will open. Navigate to where you saved the HTML file.\n' +
      '5. Select the file and click Open.\n' +
      '6. The app will scan the file for Facebook group links and add any new ones it finds.\n' +
      '7. A message will tell you how many groups were found and how many were added.\n\n' +
      '## What Happens After Import\n' +
      '- New groups are added with category "mixed" and priority "Medium" by default.\n' +
      '- Go to Marketing > Groups, find each new group, and update the category and priority using the Edit button.\n' +
      '- The group URL is saved automatically from the HTML file -- no need to copy it manually.\n' +
      '- Groups you were already tracking are not affected (INSERT OR IGNORE).\n\n' +
      '## How Often to Do This\n' +
      'Once a week on Sunday, as part of the Weekly Facebook Groups Review task. Any groups you joined during the week will be picked up automatically.\n\n' +
      '## Troubleshooting\n' +
      '- If the import says "0 groups found": make sure you saved the page correctly and that you were on the "Your groups" page, not a search results page.\n' +
      '- If groups appear with garbled names: the page may not have fully loaded before saving. Try scrolling more slowly and re-saving.\n' +
      '- If a group URL is missing: the group may be private or your browser blocked the link. Add that group manually using the Add Group button.\n\n' +
      '## Related Documents\n' +
      'See: [[How to Update Facebook Groups]]',
      null,null,null)

    // Seed the Facebook groups list from the static data file (INSERT OR IGNORE -- safe to re-run)
    seedFbGroups(db)
  })()
  console.log('[Seed] seedMissingItems: tasks 111-132, documents 106-108/123-131, and FB groups applied (INSERT OR IGNORE).')
}

export function resetAndReseed(db: Database.Database): void {
  db.transaction(() => {
    const tables = ['notes','task_completions','driver_documents','invoices','loads','tasks','documents','drivers','leads','brokers']
    for (const t of tables) {
      db.prepare('DELETE FROM ' + t + ' WHERE id >= 101').run()
    }
    db.prepare("DELETE FROM app_settings WHERE key = 'dev_seed_applied'").run()
  })()
  runSeedIfEmpty(db)
}

function seedBrokers(db: Database.Database): void {
  const ins = db.prepare(
    'INSERT OR IGNORE INTO brokers (id, name, mc_number, phone, email, payment_terms, credit_rating, avg_days_pay, flag, notes)' +
    ' VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  )
  ins.run(101,'CH Robinson','023514','800-323-7587','carriers@chrobinson.com',30,'A',28,'Preferred','Largest 3PL in North America. Fast pay, reliable on all lanes.')
  ins.run(102,'Coyote Logistics','482690','877-637-2311','carriers@coyotelogistics.com',30,'A',22,'Preferred','UPS subsidiary. Consistent loads on Midwest and Southeast lanes.')
  ins.run(103,'Echo Global Freight','724281','800-354-7993','carriers@echo.com',30,'B',35,'None','Good volume broker. Can be slow responding on POD requests.')
  ins.run(104,'XPO Logistics','519147','844-742-5976','dispatch@xpo.com',45,'B+',40,'None','Large carrier network. Net-45 terms -- plan cash flow accordingly.')
  ins.run(105,'Landstar System','195038','800-872-9400','carriers@landstar.com',30,'A+',20,'Preferred','Top-tier broker. Preferred for Southeast and Midwest flatbed lanes.')
  ins.run(106,'Total Quality Logistics','739438','800-580-3101','carriers@tql.com',30,'B',33,'None','High volume spot market broker. Good for short-notice coverage.')
  ins.run(107,'Uber Freight','431563','800-390-3675','carriers@uberfreight.com',45,'C',52,'Slow Pay','Consistently slow on net-45. Push for POD same day or expect delays.')
  ins.run(108,'GlobalTranz','512948','866-275-1900','carriers@globaltranz.com',30,'D',65,'Avoid','Multiple payment disputes on file. Do not book without written rate con.')
}

function seedDrivers(db: Database.Database): void {
  const ins = db.prepare(
    'INSERT OR IGNORE INTO drivers' +
    ' (id, name, company, mc_number, dot_number, cdl_number, cdl_expiry,' +
    '  phone, email, truck_type, trailer_type, home_base, preferred_lanes,' +
    '  min_rpm, dispatch_percent, factoring_company, insurance_expiry, start_date, status, notes)' +
    ' VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)'
  )
  ins.run(101,'Marcus Johnson','MJ Freight LLC','782341','2341789','CDL-TX-4421','2027-08-15','214-555-0181','marcus@mjfreight.com','Kenworth T680','Flatbed','Dallas, TX','TX-GA, TX-TN, TX-IL',2.0,7.0,'OTR Capital','2026-09-01','2023-04-01','Active','Reliable driver on Southeast lanes. Prefers 48-state flatbed runs.')
  ins.run(102,'Tony Garcia','Garcia Trucking','614882','3884521','CDL-TX-8812','2026-11-30','713-555-0292','tony@garciahauling.com','Peterbilt 579','Reefer','Houston, TX','TX-TN, TX-GA, TX-FL',2.2,7.0,'Riviera Finance','2026-06-15','2022-11-15','Active','Reefer specialist. Preferred lanes TX to Southeast. Good with temp-sensitive freight.')
  ins.run(103,'Derek Williams','Williams Transport','498217','1987432','CDL-IL-3309','2027-03-20','312-555-0343','dwilliams@wtrans.com','Freightliner Cascadia','Dry Van','Chicago, IL','IL-TX, IL-GA, IL-TN',1.9,7.0,null,'2026-12-01','2021-06-01','On Load','Experienced Midwest driver. Currently on a load.')
  ins.run(104,'Sandra Mitchell','Mitchell Carriers','337561','2214456','CDL-GA-7721','2028-01-10','404-555-0414','sandra@mitchellcarriers.com','Volvo VNL','Flatbed','Atlanta, GA','GA-IL, GA-TX, GA-OH',2.1,7.5,'RTS Financial','2026-08-20','2022-03-15','Active','Strong Southeast network. Reliable on flatbed loads over 800 miles.')
  ins.run(105,'James Cooper','Cooper Hauling Inc','551234','4432198','CDL-AZ-5519','2027-06-30','602-555-0515','james@cooperhauling.com','International LT','Dry Van','Phoenix, AZ','AZ-CA, AZ-TX, AZ-NV',1.8,7.0,null,'2027-01-15','2023-01-10','On Load','Southwest specialist. Currently booked. Good on short-haul AZ lanes.')
  ins.run(106,'Ricky Torres','Torres Step Deck LLC','209887','3312877','CDL-MO-2234','2027-09-15','816-555-0616','rtorres@torresstepdeck.com','Kenworth W900','Step Deck','Kansas City, MO','MO-CO, MO-TX, MO-IL',2.0,7.0,'Triumph Business Capital','2026-10-30','2022-08-20','Active','Step deck expert. Runs KC to Denver corridor regularly.')
  ins.run(107,'Diane Foster','Foster Van Lines','412090','2990341','CDL-TN-9901','2025-12-15','615-555-0717','diane@fostervanlines.com','Freightliner Cascadia','Dry Van','Nashville, TN','TN-OH, TN-IL, TN-GA',1.9,7.0,null,'2025-09-01','2020-05-01','Inactive','On leave. CDL expires Dec 2025 -- renewal pending. Do not assign loads.')
  ins.run(108,'Brandon Lee','Lee Reefer Express','887432','5543219','CDL-CA-6678','2028-04-20','323-555-0818','brandon@leereeferexp.com','Peterbilt 389','Reefer','Los Angeles, CA','CA-AZ, CA-TX, CA-NV',2.3,8.0,'Apex Capital','2027-03-01','2023-09-01','Active','Reefer driver on West Coast lanes. Higher RPM required for CA compliance costs.')
  ins.run(109,'Kelvin Brown','Brown Flatbed Co','334509','1123488','CDL-CO-4412','2027-07-31','720-555-0919','kbrown@brownflatbed.com','Mack Anthem','Flatbed','Denver, CO','CO-TX, CO-KS, CO-NE',2.0,7.0,'OTR Capital','2026-11-15','2022-12-01','On Load','Mountain region specialist. Currently in transit.')
  ins.run(110,'Patricia Hayes','Hayes Logistics','223781','3341209','CDL-TN-7733','2027-02-28','901-555-1010','patricia@hayeslogistics.com','Volvo VNL','Dry Van','Memphis, TN','TN-NC, TN-OH, TN-GA',1.85,7.0,'Riviera Finance','2026-07-01','2021-09-15','Active','Reliable Southeast corridor driver. Good on TN-Charlotte lanes.')
  ins.run(111,'Oscar Martinez','Martinez Transport','778821','4451239','CDL-TX-3344','2026-08-31','972-555-1111','oscar@martineztrans.com','Kenworth T680','Dry Van','Dallas, TX','TX-GA, TX-IL, TX-MO',1.9,7.0,null,'2026-05-15','2023-02-01','Active','Based in Dallas. Runs Northeast Texas triangle frequently.')
  ins.run(112,'Tasha Robinson','Robinson Reefer LLC','445612','2218890','CDL-TX-8844','2027-11-20','713-555-1212','tasha@robinsonreefer.com','Freightliner Cascadia','Reefer','Houston, TX','TX-TN, TX-GA, TX-FL',2.1,7.5,'RTS Financial','2026-09-30','2023-05-15','On Load','Reefer specialist out of Houston. Currently picked up and en route.')
  ins.run(113,'Danny Nguyen','Nguyen Flatbed','892341','3390121','CDL-AZ-1199','2028-02-15','480-555-1313','danny@nguyenflatbed.com','International LT','Flatbed','Phoenix, AZ','AZ-NV, AZ-CA, AZ-TX',2.0,7.0,null,'2027-06-01','2024-01-10','Active','Newer driver but reliable. Prefers Southwest flatbed runs under 500 miles.')
  ins.run(114,'Crystal Adams','Adams Freight Solutions','667890','5512341','CDL-NC-2255','2025-10-31','704-555-1414','crystal@adamsfreight.com','Peterbilt 579','Dry Van','Charlotte, NC','NC-OH, NC-TN, NC-GA',1.8,7.0,null,'2025-08-01','2020-11-01','Inactive','Suspended insurance as of Aug 2025. Do not dispatch until insurance current.')
  ins.run(115,'Michael Scott','Scott Step LLC','334456','1190087','CDL-OH-5566','2027-05-31','614-555-1515','mscott@scottstep.com','Volvo VNL','Step Deck','Columbus, OH','OH-TN, OH-GA, OH-IL',1.95,7.0,'Triumph Business Capital','2026-08-15','2022-07-20','Active','Step deck driver on Ohio to Southeast corridor. Consistent performer.')
}

function seedLoads(db: Database.Database): void {
  const ins = db.prepare(
    'INSERT OR IGNORE INTO loads' +
    ' (id, load_id, driver_id, broker_id, origin_city, origin_state,' +
    '  dest_city, dest_state, pickup_date, delivery_date,' +
    '  miles, rate, dispatch_pct, commodity, status, invoiced, notes)' +
    ' VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)'
  )
  // -- Searching (no driver assigned) --
  ins.run(101,'CHRB-110401',null,101,'Kansas City','MO','Denver','CO',null,null,600,1380.00,7.0,'Auto Parts','Searching',0,'Spot load. Need flatbed or step deck.')
  ins.run(102,'TQL-220819',null,106,'Chicago','IL','Memphis','TN',null,null,530,1007.00,7.0,'General Freight','Searching',0,'Dry van preferred. Dock to dock.')
  ins.run(103,'COY-334512',null,102,'Atlanta','GA','Houston','TX',null,null,790,1738.00,7.0,'Building Materials','Searching',0,'Partial flatbed OK. Call for details.')
  // -- Booked --
  ins.run(104,'CHRB-110482',105,101,'Phoenix','AZ','Las Vegas','NV','2026-03-18','2026-03-19',290,667.00,7.0,'Electronics','Booked',0,'Driver confirmed. Rate con sent.')
  ins.run(105,'COY-334598',null,102,'Dallas','TX','Atlanta','GA',null,null,900,2070.00,7.0,'Steel Coils','Searching',0,'Flatbed, straps and tarps required. Need driver Dallas to Atlanta.')
  ins.run(106,'ECH-445672',null,103,'Kansas City','MO','Denver','CO',null,null,600,1320.00,7.0,'Machinery Parts','Searching',0,'Step deck needed KC to Denver. Call broker to confirm permits.')
  ins.run(107,'LND-556231',111,105,'Dallas','TX','Nashville','TN','2026-03-20','2026-03-22',665,1463.00,7.0,'General Freight','Booked',0,'Dry van. No touch freight.')
  ins.run(108,'TQL-220904',110,106,'Memphis','TN','Columbus','OH','2026-03-21','2026-03-23',430,946.00,7.0,'Consumer Goods','Booked',0,'Team driver not required. Standard dry van.')
  // -- Picked Up --
  ins.run(109,'COY-335101',112,102,'Houston','TX','Nashville','TN','2026-03-11','2026-03-14',800,1920.00,7.5,'Frozen Goods','Picked Up',0,'Reefer set to -10F. Driver confirmed pickup.')
  ins.run(110,'CHRB-110601',115,101,'Columbus','OH','Atlanta','GA','2026-03-12','2026-03-14',720,1656.00,7.0,'Auto Parts','Picked Up',0,'Step deck. Oversized permit not required.')
  ins.run(111,'ECH-445801',104,103,'Atlanta','GA','Chicago','IL','2026-03-12','2026-03-15',720,1512.00,7.5,'Manufactured Goods','Picked Up',0,'Flatbed loaded. Tarped and secured.')
  ins.run(112,'XPO-661234',null,104,'Phoenix','AZ','Las Vegas','NV',null,null,290,580.00,7.0,'Retail Goods','Searching',0,'Short run AZ to NV. Driver needed.')
  ins.run(113,'LND-556312',108,105,'Los Angeles','CA','Phoenix','AZ','2026-03-13','2026-03-15',370,999.00,8.0,'Produce','Picked Up',0,'Reefer at 34F. Produce load, time sensitive.')
  // -- In Transit --
  ins.run(114,'COY-335201',103,102,'Chicago','IL','Dallas','TX','2026-03-10','2026-03-14',920,1748.00,7.0,'General Freight','In Transit',0,'Driver en route. ETA 3/14 evening.')
  ins.run(115,'CHRB-110702',109,101,'Denver','CO','Dallas','TX','2026-03-09','2026-03-13',1000,2200.00,7.0,'Heavy Equipment','In Transit',0,'Flatbed. Oversize permitted. Driver checked in at Amarillo.')
  ins.run(116,'TQL-221001',102,106,'Houston','TX','Atlanta','GA','2026-03-11','2026-03-14',790,1738.00,7.5,'Reefer Goods','In Transit',0,'Reefer at 36F. On schedule.')
  ins.run(117,'ECH-446001',111,103,'Dallas','TX','Chicago','IL','2026-03-10','2026-03-13',920,1748.00,7.0,'Steel Products','In Transit',0,'Dry van, heavy load. Driver cleared scales.')
  ins.run(118,'LND-556502',104,105,'Atlanta','GA','Nashville','TN','2026-03-12','2026-03-13',250,550.00,7.5,'Paper Products','In Transit',0,'Short run. Flatbed, no tarps needed.')
  ins.run(119,'COY-335302',110,102,'Memphis','TN','Charlotte','NC','2026-03-11','2026-03-14',650,1235.00,7.0,'Consumer Electronics','In Transit',0,'Dry van. Driver reported no issues.')
  ins.run(120,'XPO-661401',115,104,'Columbus','OH','Nashville','TN','2026-03-12','2026-03-13',430,881.50,7.0,'Auto Parts','In Transit',0,'Step deck in transit. ETA tomorrow morning.')
  // -- Delivered --
  ins.run(121,'CHRB-110801',101,101,'Dallas','TX','Atlanta','GA','2026-03-01','2026-03-04',900,1980.00,7.0,'Machinery','Delivered',0,'Delivered on time. POD received.')
  ins.run(122,'COY-335401',102,102,'Houston','TX','Nashville','TN','2026-02-24','2026-02-27',800,1920.00,7.5,'Frozen Goods','Delivered',0,'Reefer load delivered. Temp logs attached.')
  ins.run(123,'ECH-446101',103,103,'Chicago','IL','Dallas','TX','2026-02-20','2026-02-24',920,1748.00,7.0,'General Freight','Delivered',0,'Delivered. Driver noted dock congestion.')
  ins.run(124,'TQL-221101',104,106,'Atlanta','GA','Chicago','IL','2026-02-15','2026-02-18',720,1584.00,7.5,'Flatbed Freight','Delivered',0,'Flatbed delivered on schedule.')
  ins.run(125,'LND-556601',105,105,'Phoenix','AZ','Las Vegas','NV','2026-02-28','2026-03-01',290,580.00,7.0,'Electronics','Delivered',0,'Short run. POD signed and received.')
  ins.run(126,'COY-335501',106,102,'Kansas City','MO','Denver','CO','2026-02-22','2026-02-24',600,1320.00,7.0,'Auto Parts','Delivered',0,'Step deck delivered. No damage reported.')
  ins.run(127,'CHRB-110901',108,101,'Los Angeles','CA','Phoenix','AZ','2026-02-18','2026-02-19',370,962.00,8.0,'Produce','Delivered',0,'Reefer delivered within temp spec.')
  ins.run(128,'XPO-661501',109,104,'Denver','CO','Dallas','TX','2026-02-10','2026-02-14',1000,1900.00,7.0,'Heavy Machinery','Delivered',0,'Oversized load delivered. Permit fees invoiced separately.')
  ins.run(129,'ECH-446201',110,103,'Memphis','TN','Charlotte','NC','2026-02-05','2026-02-07',650,1202.50,7.0,'Consumer Goods','Delivered',0,'POD received. Consignee signed.')
  ins.run(130,'TQL-221201',111,106,'Dallas','TX','Houston','TX','2026-02-01','2026-02-02',240,480.00,7.0,'Industrial Supplies','Delivered',0,'Short local run. POD received same day.')
  // -- Invoiced --
  ins.run(131,'CHRB-111001',101,101,'Dallas','TX','Chicago','IL','2026-01-20','2026-01-24',920,2116.00,7.0,'Steel Coils','Invoiced',1,'Flatbed. Invoice INV-2026-0001 sent.')
  ins.run(132,'COY-335601',102,102,'Houston','TX','Atlanta','GA','2026-01-15','2026-01-19',790,1896.00,7.5,'Reefer Goods','Invoiced',1,'Reefer. Invoice INV-2026-0002 sent.')
  ins.run(133,'ECH-446301',103,103,'Chicago','IL','Memphis','TN','2026-01-10','2026-01-12',530,1007.00,7.0,'General Freight','Invoiced',1,'Invoice INV-2026-0003 sent.')
  ins.run(134,'LND-556701',104,105,'Atlanta','GA','Dallas','TX','2026-01-05','2026-01-09',790,1738.00,7.5,'Building Materials','Invoiced',1,'Invoice INV-2026-0004 sent. Awaiting payment.')
  ins.run(135,'TQL-221301',106,106,'Kansas City','MO','Dallas','TX','2026-01-18','2026-01-21',500,1000.00,7.0,'Auto Parts','Invoiced',1,'Invoice INV-2026-0005 sent.')
  ins.run(136,'COY-335701',108,102,'Los Angeles','CA','Phoenix','AZ','2026-01-08','2026-01-09',370,962.00,8.0,'Produce','Invoiced',1,'Invoice INV-2026-0006 sent. Reefer load.')
  // -- Paid --
  ins.run(137,'CHRB-111101',101,101,'Dallas','TX','Atlanta','GA','2025-12-15','2025-12-18',900,2070.00,7.0,'Machinery','Paid',1,'Paid in full. Wire received 2026-01-12.')
  ins.run(138,'COY-335801',102,102,'Houston','TX','Nashville','TN','2025-12-01','2025-12-04',800,1920.00,7.5,'Frozen Goods','Paid',1,'Paid. Reefer temp logs archived.')
  ins.run(139,'ECH-446401',103,103,'Chicago','IL','Dallas','TX','2025-11-20','2025-11-24',920,1748.00,7.0,'General Freight','Paid',1,'Paid. Full dispute-free settlement.')
  ins.run(140,'LND-556801',109,105,'Denver','CO','Kansas City','MO','2025-11-10','2025-11-12',600,1320.00,7.0,'Auto Parts','Paid',1,'Paid. Flatbed, clean delivery.')
}

function seedLeads(db: Database.Database): void {
  const ins = db.prepare(
    'INSERT OR IGNORE INTO leads' +
    ' (id, name, company, mc_number, phone, email, city, state,' +
    '  trailer_type, authority_date, source, status, priority, follow_up_date, notes)' +
    ' VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)'
  )
  // New
  ins.run(101,'Ray Castillo','Castillo Express LLC','881234','469-555-0101','ray@castilloexp.com','Dallas','TX','Dry Van','2023-06-15','FMCSA','New','High','2026-03-20','Has 2 trucks. Interested in TX-IL lanes.')
  ins.run(102,'Angela Pierce','Pierce Freight Co','774321','901-555-0102','angela@piercefreight.com','Memphis','TN','Reefer','2022-09-01','Referral','New','High','2026-03-18','Referred by Marcus Johnson. Runs Southeast reefer lanes.')
  ins.run(103,'Luis Vega','Vega Hauling','993412','602-555-0103','luis@vegahauling.com','Phoenix','AZ','Flatbed','2021-04-20','FMCSA','New','Medium','2026-03-25','Solo operator. Prefers AZ-CA-NV triangle.')
  ins.run(104,'Tammy Brooks','Brooks Transport Inc','221987','214-555-0104','tammy@brookstrans.com','Dallas','TX','Dry Van','2020-11-30','Facebook','New','Medium','2026-04-01','Saw Facebook post. Has authority 5+ years.')
  ins.run(105,'Jerome Ellis','Ellis Logistics','556712','312-555-0105','jerome@ellislogistics.com','Chicago','IL','Reefer','2023-01-15','Cold Call','New','Low','2026-04-05','Interested but slow to respond. Follow up after April 1.')
  ins.run(106,'Monica Shaw','Shaw Carriers','334891','720-555-0106','monica@shawcarriers.com','Denver','CO','Dry Van','2022-07-10','FMCSA','New','Medium','2026-03-22','2 dry van units based in Denver. Runs CO-TX corridor.')
  ins.run(107,'Derek Hampton','Hampton Flatbed','778234','404-555-0107','derek@hamptonflatbed.com','Atlanta','GA','Flatbed','2021-08-05','Website','New','High','2026-03-16','Came through website form. 3 flatbeds, experienced.')
  ins.run(108,'Cheryl Owens','Owens Reefer LLC','445901','713-555-0108','cheryl@owensreefer.com','Houston','TX','Reefer','2023-03-22','FMCSA','New','Medium','2026-03-28','New authority. Wants to run TX to Southeast.')
  // Contacted
  ins.run(109,'Nathan Ford','Ford Express','662341','816-555-0109','nathan@fordexp.com','Kansas City','MO','Dry Van','2020-05-14','Referral','Contacted','High','2026-03-15','Left voicemail 3/12. Callback expected by 3/15.')
  ins.run(110,'Gloria Rivera','Rivera Transport','889012','615-555-0110','gloria@riveratrans.com','Nashville','TN','Flatbed','2022-12-01','Cold Call','Contacted','Medium','2026-03-17','Email sent 3/10. Awaiting response.')
  ins.run(111,'Sam Whitfield','Whitfield Hauling','334120','614-555-0111','sam@whitfieldhaul.com','Columbus','OH','Dry Van','2019-03-10','FMCSA','Contacted','Low','2026-03-30','Older authority. Solo driver. Slow response rate.')
  ins.run(112,'Carla Nguyen','Nguyen Cold Chain','556234','323-555-0112','carla@nguyencoldchain.com','Los Angeles','CA','Reefer','2023-07-01','Website','Contacted','High','2026-03-16','Reefer fleet of 4. Called 3/13, interested in West Coast lanes.')
  ins.run(113,'Bryan Wells','Wells Trucking','778901','972-555-0113','bryan@wellstrucking.com','Dallas','TX','Step Deck','2021-10-15','Referral','Contacted','Medium','2026-03-19','3 step decks. Referred by Ricky Torres.')
  ins.run(114,'Lisa Grant','Grant Freight Solutions','990123','901-555-0114','lisa@grantfreight.com','Memphis','TN','Dry Van','2022-04-30','Facebook','Contacted','Low','2026-04-10','Saw ad. Has 1 truck. Not urgent.')
  ins.run(115,'Marcus Lee','Lee Carriers Inc','112890','404-555-0115','marcus@leecarriers.com','Atlanta','GA','Flatbed','2020-08-20','Cold Call','Contacted','High','2026-03-15','Has 5 flatbeds. Very interested. Sending packet today.')
  ins.run(116,'Dana Cruz','Cruz Transport LLC','334678','602-555-0116','dana@cruztransport.com','Phoenix','AZ','Dry Van','2023-05-10','FMCSA','Contacted','Medium','2026-03-21','New authority. Solo operator. Running AZ to NV.')
  ins.run(117,'Kevin Moss','Moss Express','556901','312-555-0117','kevin@mossexpress.com','Chicago','IL','Reefer','2022-11-15','Referral','Contacted','High','2026-03-14','Referred by Tony Garcia. 2 reefers. Must follow up today.')
  // Interested
  ins.run(118,'Veronica Hall','Hall Freight LLC','778412','469-555-0118','veronica@hallfreight.com','Dallas','TX','Flatbed','2022-03-18','FMCSA','Interested','High','2026-03-16','Reviewed rates. Wants to start April 1. Send packet.')
  ins.run(119,'Chris Dunn','Dunn Carriers','445109','720-555-0119','chris@dunncarriers.com','Denver','CO','Dry Van','2021-06-25','Website','Interested','High','2026-03-17','Has 2 dry vans. Agreed to 7% dispatch rate. Packet in review.')
  ins.run(120,'Nina Flores','Flores Reefer Co','667234','713-555-0120','nina@floresreefer.com','Houston','TX','Reefer','2023-02-14','Referral','Interested','Medium','2026-03-20','Solo reefer. Wants Houston-Atlanta lane primarily.')
  ins.run(121,'Tyrone Wade','Wade Transport','889561','901-555-0121','tyrone@wadetrans.com','Memphis','TN','Dry Van','2020-09-01','Cold Call','Interested','Medium','2026-03-22','Interested in TN-OH corridor. Reviewing contract.')
  ins.run(122,'Stephanie Kim','Kim Logistics','334789','312-555-0122','stephanie@kimlogistics.com','Chicago','IL','Reefer','2022-06-10','FMCSA','Interested','High','2026-03-15','Fleet of 3 reefers. Very interested. Close this week.')
  ins.run(123,'Andre Jackson','Jackson Step Deck','556023','816-555-0123','andre@jacksonstep.com','Kansas City','MO','Step Deck','2021-12-01','Website','Interested','Medium','2026-03-18','2 step decks. Evaluating our rates vs competitor.')
  ins.run(124,'Paula Reed','Reed Express','778345','404-555-0124','paula@reedexpress.com','Atlanta','GA','Dry Van','2023-04-15','Facebook','Interested','Low','2026-03-25','1 truck. Price-shopping. May not close quickly.')
  ins.run(125,'Gilbert Ortiz','Ortiz Hauling','990678','602-555-0125','gilbert@ortizhaul.com','Phoenix','AZ','Flatbed','2020-07-20','Referral','Interested','High','2026-03-14','3 flatbeds. Referred by Sandra Mitchell. Ready to sign.')
  // Signed (converted drivers)
  ins.run(126,'Robert Tran','Tran Transport','112901','214-555-0126','robert@trantrans.com','Dallas','TX','Dry Van','2019-11-10','FMCSA','Signed',null,null,'Signed and onboarded March 2026. Running TX-IL corridor.')
  ins.run(127,'Felicia Young','Young Carriers','334234','615-555-0127','felicia@youngcarriers.com','Nashville','TN','Reefer','2021-05-20','Referral','Signed',null,null,'Signed Feb 2026. 2 reefer units. Southeast specialist.')
  ins.run(128,'Calvin Price','Price Freight','556567','614-555-0128','calvin@pricefreight.com','Columbus','OH','Flatbed','2020-02-14','Cold Call','Signed',null,null,'Signed Jan 2026. Flatbed on OH-GA corridor.')
  ins.run(129,'Denise Taylor','Taylor Logistics','778890','312-555-0129','denise@taylorlogistics.com','Chicago','IL','Dry Van','2022-08-30','Website','Signed',null,null,'Signed Dec 2025. Running Midwest lanes well.')
  ins.run(130,'Hector Reyes','Reyes Flatbed LLC','990123','713-555-0130','hector@reyesflatbed.com','Houston','TX','Flatbed','2021-01-15','FMCSA','Signed',null,null,'Signed Nov 2025. 2 flatbeds TX to Southeast.')
  ins.run(131,'Tamara Knight','Knight Reefer Co','112456','901-555-0131','tamara@knightreefer.com','Memphis','TN','Reefer','2023-06-01','Referral','Signed',null,null,'Signed Oct 2025. Solo reefer, TN-GA lane.')
  ins.run(132,'Eddie Burns','Burns Transport','334789','404-555-0132','eddie@burnstrans.com','Atlanta','GA','Dry Van','2020-04-10','Facebook','Signed',null,null,'Signed Sep 2025. 1 dry van, consistent performer.')
  ins.run(133,'Lena Stone','Stone Carriers','556012','720-555-0133','lena@stonecarriers.com','Denver','CO','Step Deck','2022-10-25','FMCSA','Signed',null,null,'Signed Aug 2025. Step deck on CO-TX lane.')
  // Rejected
  ins.run(134,'Gary Norton','Norton LLC','778234','469-555-0134','gary@nortonllc.com','Dallas','TX','Dry Van','2018-03-01','Cold Call','Rejected',null,null,'Too many violations on safety score. Cannot onboard.')
  ins.run(135,'Rhonda Powell','Powell Transport','990567','602-555-0135','rhonda@powelltrans.com','Phoenix','AZ','Flatbed','2019-07-15','FMCSA','Rejected',null,null,'Insurance lapsed. Reapply when current.')
  ins.run(136,'Billy Carr','Carr Hauling','112890','816-555-0136','billy@carrhauling.com','Kansas City','MO','Dry Van','2020-12-20','Website','Rejected',null,null,'Wants rates below our minimum. Not a good fit.')
  ins.run(137,'Donna Webb','Webb Freight','334123','323-555-0137','donna@webbfreight.com','Los Angeles','CA','Reefer','2021-05-05','Referral','Rejected',null,null,'Could not verify MC authority. Flagged for review.')
  ins.run(138,'Sam Fletcher','Fletcher Express','556456','901-555-0138','sam@fletcherexp.com','Memphis','TN','Dry Van','2019-09-30','FMCSA','Rejected',null,null,'Out of service order on record. Cannot dispatch.')
  // Additional New / Contacted leads to reach 50 total
  ins.run(139,'Frank Medina','Medina Transport','778789','972-555-0139','frank@medinatrans.com','Dallas','TX','Flatbed','2022-02-01','FMCSA','New','Medium','2026-03-26','2 flatbeds. Expressed interest via web form.')
  ins.run(140,'Connie Burke','Burke Logistics','990012','312-555-0140','connie@burkelogistics.com','Chicago','IL','Dry Van','2023-08-10','Cold Call','New','Low','2026-04-08','New authority. Solo operator. Still evaluating options.')
  ins.run(141,'Leon Harper','Harper Carriers','112345','404-555-0141','leon@harpercarriers.com','Atlanta','GA','Reefer','2021-11-20','Referral','Contacted','Medium','2026-03-20','Referred internally. 2 reefers.')
  ins.run(142,'Irene Patton','Patton Freight','334678','615-555-0142','irene@pattonfreight.com','Nashville','TN','Dry Van','2020-06-14','Website','Contacted','High','2026-03-16','Has 3 trucks. Ready to talk rates.')
  ins.run(143,'Curtis Flynn','Flynn Step LLC','556901','720-555-0143','curtis@flynnstep.com','Denver','CO','Step Deck','2022-09-05','FMCSA','New','Medium','2026-03-27','Step deck running CO-TX. Inquired about min RPM.')
  ins.run(144,'Monique Banks','Banks Express','778123','713-555-0144','monique@banksexp.com','Houston','TX','Dry Van','2023-01-25','Facebook','New','Low','2026-04-12','Facebook inquiry. Solo driver. Price sensitive.')
  ins.run(145,'Harold Simmons','Simmons Hauling','990456','314-555-0145','harold@simmonshauling.com','St. Louis','MO','Flatbed','2021-07-30','Cold Call','Contacted','Medium','2026-03-23','3 flatbeds. Runs MO-TX and MO-IL.')
  ins.run(146,'Tricia Powell','Powell Reefer Inc','112789','602-555-0146','tricia@powellreefer.com','Phoenix','AZ','Reefer','2022-04-18','FMCSA','Interested','High','2026-03-17','2 reefers. Ready to sign pending rate agreement.')
  ins.run(147,'Devon Sutton','Sutton Transport','334012','323-555-0147','devon@suttontrans.com','Los Angeles','CA','Dry Van','2020-10-12','Referral','Interested','Medium','2026-03-21','Interested in CA-AZ-NV lanes. 1 truck.')
  ins.run(148,'Brenda Walsh','Walsh Carriers','556345','614-555-0148','brenda@walshcarriers.com','Columbus','OH','Flatbed','2023-03-07','Website','New','High','2026-03-15','3 flatbeds based in Columbus. Hot lead. Contact today.')
  ins.run(149,'Jerome Bass','Bass Freight LLC','778678','816-555-0149','jerome@bassfreight.com','Kansas City','MO','Dry Van','2019-08-22','FMCSA','Rejected',null,null,'Revoked authority. Cannot onboard per compliance rules.')
  ins.run(150,'Nancy Gibbs','Gibbs Trucking','990901','901-555-0150','nancy@gibbstrucking.com','Memphis','TN','Reefer','2022-12-12','Cold Call','New','Medium','2026-04-03','Solo reefer operator. Interested in TN-GA corridor.')
}

function seedInvoices(db: Database.Database): void {
  const ins = db.prepare(
    'INSERT OR IGNORE INTO invoices' +
    ' (id, invoice_number, load_id, driver_id, week_ending,' +
    '  driver_gross, dispatch_pct, dispatch_fee, sent_date, paid_date, status, notes)' +
    ' VALUES (?,?,?,?,?,?,?,?,?,?,?,?)'
  )
  ins.run(101,'INV-2026-0001',131,101,'2026-01-24',2116.00,7.0,148.12,'2026-01-27',null,'Sent','Awaiting CH Robinson net-30 payment.')
  ins.run(102,'INV-2026-0002',132,102,'2026-01-19',1896.00,7.5,142.20,'2026-01-22',null,'Sent','Reefer load. Awaiting Coyote payment.')
  ins.run(103,'INV-2026-0003',133,103,'2026-01-12',1007.00,7.0,70.49,'2026-01-14',null,'Overdue','Past net-30. Follow up with Echo Global.')
  ins.run(104,'INV-2026-0004',134,104,'2026-01-09',1738.00,7.5,130.35,'2026-01-13',null,'Sent','Awaiting Landstar net-30 payment.')
  ins.run(105,'INV-2026-0005',135,106,'2026-01-21',1000.00,7.0,70.00,'2026-01-24',null,'Sent','TQL load. Payment expected by Feb 23.')
  ins.run(106,'INV-2026-0006',136,108,'2026-01-09',962.00,8.0,76.96,'2026-01-12',null,'Overdue','Uber Freight -- known slow payer. Escalate.')
  ins.run(107,'INV-2025-0101',137,101,'2025-12-18',2070.00,7.0,144.90,'2025-12-22','2026-01-12','Paid','CH Robinson. Paid on time.')
  ins.run(108,'INV-2025-0102',138,102,'2025-12-04',1920.00,7.5,144.00,'2025-12-08','2025-12-30','Paid','Coyote reefer load. Paid net-22.')
  ins.run(109,'INV-2025-0103',139,103,'2025-11-24',1748.00,7.0,122.36,'2025-11-28','2025-12-18','Paid','Echo Global. Paid in full.')
  ins.run(110,'INV-2025-0104',140,109,'2025-11-12',1320.00,7.0,92.40,'2025-11-17','2025-12-08','Paid','Landstar. Paid early -- preferred broker.')
  ins.run(111,'INV-2026-0007',121,101,'2026-03-04',1980.00,7.0,138.60,null,null,'Draft','Load just delivered. Invoice not yet sent.')
  ins.run(112,'INV-2026-0008',122,102,'2026-02-27',1920.00,7.5,144.00,null,null,'Draft','Reefer delivered. Gathering temp logs before invoicing.')
}


function seedTasks(db: Database.Database): void {
  const ins = db.prepare(
    'INSERT OR IGNORE INTO tasks (id, title, category, priority, due_date, time_of_day, recurring, status, notes)' +
    ' VALUES (?,?,?,?,?,?,?,?,?)'
  )
  // ── Daily task list (matches current live task setup) ─────────────────────
  ins.run(101,'Check driver check-ins and update load statuses','Dispatch','High','Daily','8:00 AM',1,'Pending','Confirm all In Transit drivers have checked in. Update load board.')
  ins.run(121,'Active Load Status Update','Dispatch','High','Daily','8:15 AM',1,'Pending','Text or call every driver with an active load. Confirm status and update the app. If a driver is not responding after 2 hours, flag it. See: [[Load Booking and Status SOP]]')
  ins.run(102,'Follow up on overdue invoices','Admin','High','Daily','9:00 AM',1,'Pending','Review invoices older than 30 days. Email or call broker AR department.')
  ins.run(111,'Facebook Driver Search Sweep','Marketing','High','Daily','9:00 AM',1,'Pending','Morning sweep of Facebook groups for driver leads. Search keywords: looking for dispatcher, need dispatch, available truck, looking for loads. Message prospects and log every new contact in the Leads page immediately. See: [[Facebook Driver Search SOP]]')
  ins.run(122,'Post in today\'s 5 Facebook groups','Marketing','High','Daily','9:00 AM',1,'Pending','Post in your recommended groups for today. Go to Marketing > Groups tab and look at the Today\'s Groups panel. Post content in each group, mark it posted in the app, and change the wording slightly between groups. See: [[Facebook Post Script Bank]]')
  ins.run(112,'Facebook Algorithm Training','Marketing','Medium','Daily','9:30 AM',1,'Pending','Like, comment, and share relevant posts in driver groups to train the Facebook algorithm. Engage with at least 5 posts per session. Genuine engagement only -- no spam.')
  ins.run(103,'Review new FMCSA leads and assign follow-up dates','Leads','Medium','Daily','10:00 AM',1,'Pending','Check FMCSA import queue. Score and prioritize new leads.')
  ins.run(104,'Post driver availability to Facebook group','Marketing','Medium','Daily','11:00 AM',1,'Pending','Post any available trucks to the freight group with lanes and equipment.')
  ins.run(123,'Midday Driver and Load Check','Dispatch','Medium','Daily','1:00 PM',1,'Pending','Check Dispatcher Board for any Active drivers without a load. Go to your load board, find a matching load, call the broker, negotiate if needed, and book it. Update the Loads page and text the driver pickup details. See: [[Load Booking and Status SOP]]')
  ins.run(114,'Driver Lead Response Monitoring','Marketing','High','Daily','2:00 PM',1,'Pending','Check all DMs and comments from morning posts and outreach. Respond within 2 hours. Move qualified responses to Leads page with status Contacted.')
  ins.run(105,'Confirm next-day pickup appointments','Dispatch','High','Daily','3:00 PM',1,'Pending','Call or message drivers with pickups tomorrow. Confirm time and location.')
  ins.run(124,'New Driver Inquiry Response','Leads','High','Daily','3:30 PM',1,'Pending','Check Facebook DMs and email for new driver inquiries. Add every new contact to the Leads page with status New. Send the first-contact script and set a follow-up date for tomorrow. Do not leave any inquiry unanswered overnight. See: [[Driver Intake Script]]')
  ins.run(115,'Final Driver Lead Sweep','Marketing','High','Daily','4:30 PM',1,'Pending','Final check of Facebook groups and DMs. Respond to any messages received since 2:00 PM. Set follow-up reminders for unresponded leads for tomorrow morning. Update Leads page with all new contacts from today. See: [[Facebook Driver Search SOP]]')
  ins.run(106,'Send weekly revenue report to owner','Admin','Medium','Daily','5:00 PM',1,'Pending','Export load and invoice totals for the week. Send summary email.')
  ins.run(125,'End-of-Day Close Out','Dispatch','Medium','Daily','5:00 PM',1,'Pending','Update all lead notes and statuses from today. Confirm all load statuses are current. Check Facebook DMs one final time. Set follow-up dates on any open leads. Tomorrow starts at 8:00 AM -- close your browser tabs. See: [[Daily Operations Playbook]]')
}
function seedDocuments(db: Database.Database): void {
  const ins = db.prepare(
    'INSERT OR IGNORE INTO documents (id, title, category, content, driver_id, doc_type, expiry_date)' +
    ' VALUES (?,?,?,?,?,?,?)'
  )
  ins.run(101,'Load Booking SOP','SOP','# Load Booking SOP\n\n## Purpose\nStandard procedure for booking a new load with a carrier.\n\n## Steps\n1. Confirm driver availability and equipment type.\n2. Verify load details: origin, destination, miles, rate, commodity.\n3. Calculate RPM -- must meet driver minimum before booking.\n4. Call or email broker to confirm rate confirmation (rate con).\n5. Send rate con to driver. Get signed acknowledgment.\n6. Enter load into OnTrack with status Booked.\n7. Send pickup instructions including BOL number and shipper contact.\n8. Notify broker of driver name, MC number, truck number, and ETA.\n\n## Notes\nNever dispatch a load without a signed rate con. Always verify insurance is current before dispatch.',null,null,null)
  ins.run(102,'Driver Onboarding Checklist','SOP','# Driver Onboarding Checklist\n\n## Required Documents\n- [ ] Completed carrier packet\n- [ ] Copy of CDL (front and back)\n- [ ] Certificate of Insurance (COI) -- OnTrack named as certificate holder\n- [ ] W-9 form\n- [ ] Signed dispatch agreement\n- [ ] MC authority verification (FMCSA SAFER lookup)\n\n## Setup Steps\n1. Enter driver in OnTrack with all fields completed.\n2. Upload all documents to driver profile.\n3. Set insurance expiry and CDL expiry alerts.\n4. Confirm preferred lanes and minimum RPM.\n5. Assign first load only after all documents are on file.',null,null,null)
  ins.run(103,'Invoice Submission Process','SOP','# Invoice Submission Process\n\n## When to Invoice\nInvoice immediately upon delivery confirmation and POD receipt.\n\n## Steps\n1. Confirm delivery in OnTrack -- update load status to Delivered.\n2. Collect signed POD from driver within 24 hours.\n3. Generate invoice in OnTrack Invoices module.\n4. Attach POD and rate con to invoice email.\n5. Send to broker AR department. CC dispatch@ontrackhaulingsolutions.com.\n6. Update invoice status to Sent.\n7. Follow up if unpaid after 25 days (5 days before net-30 deadline).\n\n## Dispute Resolution\nIf a broker disputes an invoice, pull the signed rate con and POD.\nEscalate to owner if unresolved after 2 contact attempts.',null,null,null)
  ins.run(104,'Broker Packet Requirements','Reference','# Broker Packet Requirements\n\n## What Brokers Require\nMost freight brokers require the following before booking a load:\n\n- Operating authority (MC number active on FMCSA)\n- Certificate of Insurance -- minimum $1M general liability and $100K cargo\n- W-9 for payment setup\n- Signed broker-carrier agreement\n\n## Preferred Brokers\nSee the Brokers page for current flags and payment history.\nAlways check flag before booking. Do not dispatch to Avoid-flagged brokers.',null,null,null)
  ins.run(105,'Driver Safety Compliance','Policy','# Driver Safety Compliance\n\n## Minimum Requirements\nAll drivers dispatched by OnTrack must maintain:\n\n- Valid CDL with correct endorsements for load type\n- Active MC authority (not revoked or suspended)\n- Current commercial insurance on file\n- No out-of-service orders on FMCSA SAFER record\n\n## Expiry Monitoring\nOnTrack alerts when CDL or insurance expires within 60 days.\nDo not dispatch a driver with expired credentials.\n\n## HOS Rules\nRemind drivers of Hours of Service limits.\nNever pressure a driver to violate HOS regulations.',null,null,null)
  ins.run(106,'Facebook Driver Search SOP','Marketing','# Facebook Driver Search SOP\n\n## Purpose\nSystematic daily process for finding owner-operator drivers on Facebook who are actively seeking dispatch services.\n\n## Target Groups\n- Dispatch Nation\n- Owner Operators United\n- CDL Truckers Network\n- Trucking & Freight Professionals\n- Independent Owner Operators\n\n## Search Keywords\n- "looking for dispatcher"\n- "need dispatch"\n- "seeking dispatch service"\n- "available truck"\n- "looking for loads"\n- "need a dispatcher"\n\n## Daily Workflow\n1. 9:00 AM -- Morning sweep: search each group for the keywords above. Note any new posts from the last 24 hours.\n2. 9:30 AM -- Algorithm training: like and comment on 5+ relevant posts to boost your visibility in those groups.\n3. 11:30 AM -- Second sweep: check for any new posts since morning.\n4. 2:00 PM -- Response monitoring: reply to any DMs or comments received from outreach.\n5. 4:30 PM -- Final sweep: last check before end of day. Set follow-up reminders for unresponded leads.\n\n## Outreach Message Template\n"Hi [Name], I saw your post and wanted to reach out. I run a dispatch service for owner-operators -- we handle load searching, rate negotiation, paperwork, and broker relationships so you can focus on driving. Our rate is 7% of gross. Would you be open to a quick call this week?"\n\n## Notes\n- Always message from the OnTrack Hauling Solutions page, not a personal account.\n- Log every contact in the Leads page immediately.\n- Do not follow up more than 3 times without a response.',null,null,null)
  ins.run(107,'Warm Lead Follow-Up Script','SOP','# Warm Lead Follow-Up Script\n\n## Purpose\nScript and process for following up with Contacted and Interested leads who have not responded in 3+ days.\n\n## When to Use\nEvery Wednesday at 10:00 AM. Pull all leads with status Contacted or Interested and follow_up_date on or before today.\n\n## Phone Script\n"Hi, this is Chris from OnTrack Hauling Solutions. I reached out a few days ago about our dispatch service. I wanted to follow up and see if you had any questions or if the timing is better now. We work with owner-operators on a 7% dispatch rate -- no contracts, just results. Do you have 5 minutes to chat?"\n\n## Text/DM Script\n"Hey [Name], just following up from my message earlier this week. Still interested in talking about dispatch? Happy to answer any questions. No pressure at all."\n\n## Email Script\nSubject: Following up -- OnTrack Dispatch Services\n\n"Hi [Name],\n\nI wanted to follow up on my earlier message about OnTrack Hauling Solutions dispatch services.\n\nWe help owner-operators find quality loads, negotiate rates, and handle broker paperwork -- all for 7% of gross revenue with no long-term contracts.\n\nIf you have a few minutes this week, I would love to connect. What does your schedule look like?\n\nBest,\nChris Hooks\nOnTrack Hauling Solutions\ndispatch@ontrackhaulingsolutions.com"\n\n## Follow-Up Rules\n- Attempt 1: Day 3 after initial contact (phone or DM)\n- Attempt 2: Day 7 (email or text)\n- Attempt 3: Day 14 (final call)\n- After 3 attempts with no response: mark lead as Rejected with note "No response after 3 attempts"\n\n## Tracking\nUpdate lead notes after every contact attempt with date, method, and outcome.',null,null,null)
  ins.run(108,'FMCSA Lead Review Checklist','SOP','# FMCSA Lead Review Checklist\n\n## Purpose\nWeekly Monday process for reviewing FMCSA-imported leads and prioritizing outreach.\n\n## Step 1 -- Run the Import\n1. Go to Leads page.\n2. Click "FMCSA Import" button.\n3. Wait for the import to complete. Note how many leads were added.\n\n## Step 2 -- Score New Leads\nFor each new lead, evaluate:\n- Fleet size: 2+ trucks = High priority. Solo = Medium. Unknown = Low.\n- Trailer type match: Flatbed, Reefer, Dry Van -- all acceptable. Specials (Tanker, HazMat) = lower priority.\n- Authority date: Less than 1 year old = hot lead, new to the industry, may not have dispatcher yet.\n- Location: Drivers in TX, TN, GA, IL, OH, MO = strong lane match for our network.\n\n## Step 3 -- Assign Follow-Up Dates\n- High priority: follow-up within 2 business days.\n- Medium priority: follow-up within 5 business days.\n- Low priority: follow-up within 10 business days.\n\n## Step 4 -- Update Statuses\n- Any lead you have already spoken to: move from New to Contacted.\n- Any lead that expressed interest: move to Interested.\n- Any duplicate you recognize: mark Rejected with note "Duplicate".\n\n## Step 5 -- Review Existing Pipeline\n- Check all Contacted leads for stale follow-up dates.\n- Check all Interested leads -- any ready to close this week?\n- Review any Rejected leads from last week for accuracy.\n\n## Notes\nTarget: review and score all new leads within 2 hours of import on Monday morning.',null,null,null)
  ins.run(125,'W-9 Form (Blank)','Template','# W-9 Form -- Blank (Request for Taxpayer Identification)\n\n## What It Is\nIRS Form W-9 is used to collect a driver\'s name, business name, address, and Taxpayer Identification Number (TIN or SSN/EIN). You are required to keep a signed W-9 on file for every driver you dispatch. At year end, if you pay a driver $600 or more, you use the W-9 information to issue a 1099-NEC.\n\n## When to Collect It\nCollect a signed W-9 before the first dispatched load. Do not dispatch any driver without a W-9 on file.\n\n## Where the File Is\nA blank, printable W-9 PDF is saved in your app folder. Click the link below to open it:\n[Open W-9 Blank PDF](resources/templates/W-9_Blank.pdf)\n\nSend it to the driver as an email attachment during onboarding. Ask them to fill it out, sign it, and return it before you book their first load.\n\n## What to Do With It\n- Keep the completed form on file (do not send to IRS)\n- Upload a copy to the driver\'s profile under Documents\n- Use the TIN/SSN at year end to prepare 1099-NEC forms for drivers earning $600+\n\n## Common Driver Questions\n- "Why do you need my SSN?" -- Required by IRS for 1099 reporting at year end.\n- "What if I have an LLC?" -- Use their EIN instead of SSN. Both are acceptable.\n- "Will you share my info?" -- W-9 information is kept confidential and used only for tax reporting.\n\n## Related Documents\nSee [[Driver Onboarding Checklist]] for the full list of required onboarding documents.',null,null,null)
  ins.run(126,'Dispatch Agreement (OnTrack)','Template','# Dispatch Services Agreement -- OnTrack Hauling Solutions LLC\n\n## Purpose\nThis is the binding agreement between OnTrack Hauling Solutions LLC and each driver before dispatch services begin. Both parties must sign before the first load is booked. Click the link below to open the PDF:\n[Open Dispatch Agreement PDF](resources/templates/Dispatch_Agreement_OnTrack.pdf)\n\nAttach the PDF to the driver onboarding email. Collect the signed copy before booking load one.\n\n## Key Terms Summary\n\n### Relationship of the Parties\nOnTrack is an independent contractor, not an employee or freight broker. OnTrack does not hold broker authority and does not take possession of freight. The driver (Carrier) retains full control of their operations.\n\n### Scope of Services\nOnTrack will search load boards, negotiate rates with brokers, relay rate confirmations and pickup instructions, maintain load records, and assist with carrier packet submissions -- all on the driver\'s behalf.\n\n### Load Acceptance\nThe driver has sole authority to accept or decline any load. OnTrack will never book a load without the driver\'s explicit confirmation.\n\n### Dispatch Fee\n7% of the driver\'s gross revenue per dispatched load, calculated from the total rate on the rate confirmation. Fee does not include fuel surcharges, detention, or accessorial charges unless agreed in writing.\n\n### Payment Terms\nInvoiced upon POD confirmation after each delivered load. Payment due within 7 days of invoice by Zelle, ACH, or check payable to OnTrack Hauling Solutions LLC. Late balances may be subject to a 1.5% monthly fee after 30 days.\n\n### Carrier Responsibilities\n- Active MC authority and USDOT number in good standing\n- Current commercial insurance (minimum $750K liability, $100K cargo)\n- Certificate of Insurance with OnTrack named as Certificate Holder\n- Signed W-9 on file before first load\n- Prompt communication on load status, delays, breakdowns\n\n### Non-Exclusivity\nNeither party is exclusive. The driver may use other dispatchers or book independently. OnTrack may serve other carriers simultaneously.\n\n### Termination\nEither party may cancel with 7 days written notice (email or text). Outstanding fees for delivered loads remain due after termination. OnTrack may terminate immediately for non-payment, lapsed authority, expired insurance, or fraud.\n\n### Non-Circumvention\nCarrier may not contact, solicit, or do business directly with any broker or freight source introduced by OnTrack during or within 12 months after this Agreement ends. Brokers the driver had a pre-existing relationship with before this Agreement are excluded. Violation entitles OnTrack to liquidated damages equal to the dispatch fees that would have been earned on loads booked directly with the circumvented broker during the restriction period.\n\n## Related Documents\nSee [[Driver Onboarding Checklist]] for full onboarding workflow.\nSee [[Driver Onboarding Email Template]] for the email to send with this agreement.',null,null,null)
}

// ---------------------------------------------------------------------------
// reseedDocuments — uses INSERT OR REPLACE so it updates existing docs AND
// adds new ones. Call via dev:reseedDocs from Settings.
// ---------------------------------------------------------------------------
export function reseedDocuments(db: Database.Database): void {
  const ups = db.prepare(
    'INSERT OR REPLACE INTO documents (id, title, category, content, driver_id, doc_type, expiry_date)' +
    ' VALUES (?,?,?,?,?,?,?)'
  )

  // ── 101 ── Load Booking SOP ────────────────────────────────────────────────
  ups.run(101, 'Load Booking SOP', 'SOP', [
    '# Load Booking SOP',
    '',
    '## What Is a Load?',
    'A load is a freight shipment. A shipper (company with goods) pays a broker to arrange transportation. The broker pays a carrier (truck driver with operating authority) to haul it. As a dispatcher, you connect your driver with the broker and manage the entire process for 7% of the driver\'s gross.',
    '',
    '## Pre-Booking Checklist',
    'Before contacting any broker confirm ALL of the following:',
    '1. Driver is available -- confirm current location and when/where they are free.',
    '2. Equipment type matches -- Dry Van, Reefer, Flatbed, Step Deck, etc.',
    '3. Driver insurance is current -- check driver profile. Expired insurance = do not dispatch.',
    '4. MC authority is active -- verify on FMCSA SAFER. Suspended = stop. Do not book.',
    '5. Deadhead is acceptable -- empty miles from driver to pickup. Under 100 miles preferred.',
    '',
    '## Step 1 -- Find the Load',
    'Use load boards to find available freight:',
    '- DAT One (dat.com) -- industry standard, highest volume',
    '- Truckstop (truckstop.com) -- solid alternative',
    '- Direct broker calls -- call trusted brokers for freight in your lane',
    'Search by: origin city/state, equipment type, pickup date.',
    '',
    '## Step 2 -- Evaluate Before Calling',
    'Rate Per Mile (RPM) = Total Rate divided by Total Miles.',
    '- Dry Van minimum: $2.00/mile. Target: $2.50+',
    '- Reefer minimum: $2.50/mile. Target: $3.00+',
    '- Flatbed minimum: $2.25/mile. Target: $2.75+',
    'Check the broker in your Brokers page. Flagged? Payment terms? If Avoid -- do not book.',
    '',
    '## Step 3 -- Call the Broker',
    '"Hi, this is [Name] from OnTrack Hauling Solutions. Calling about load [Ref#] from [Origin] to [Destination] -- still available?"',
    '',
    'If yes, ask: all-in rate? Pickup and delivery windows? Commodity and weight? Payment terms?',
    '',
    'Negotiate: start 10-15% above the posted rate. If posted at $1,800 counter with $2,000.',
    'Say: "Let me confirm with my driver -- I will call back in 5 minutes" if you need time.',
    '',
    '## Step 4 -- Confirm with Your Driver',
    '"I have a load from [Origin] to [Destination], [Miles] miles, $[Rate]. Pickup [Date/Time]. Works for you?"',
    'Get a clear YES before accepting. Never book without driver confirmation.',
    '',
    '## Step 5 -- Get the Rate Con',
    'Ask broker to email the rate confirmation to dispatch@ontrackhaulingsolutions.com.',
    'Review it carefully before forwarding to driver. See: Reading a Rate Confirmation document.',
    '',
    '## Step 6 -- Enter Load in OnTrack',
    'Loads > New Load. Fill in: origin, destination, pickup date, delivery date, rate, miles, commodity, driver, broker. Status: Booked.',
    'Notes: load reference number, broker contact name.',
    '',
    '## Step 7 -- Send Driver Instructions',
    '"Hey [Driver], booked you a load. Pickup: [Full Address] on [Date] at [Time]. Shipper contact: [Name] [Phone]. Commodity: [Item], [Weight]. Deliver to: [Address] by [Date/Time]. Rate con coming to your email. Call me with any questions."',
    '',
    '## Step 8 -- Notify the Broker',
    'Confirm: driver name, MC number, truck/trailer number, driver cell phone, ETA to pickup.',
    '',
    '## Step 9 -- Track the Load',
    '- Driver picks up: update status to Picked Up',
    '- Driver rolling: update status to In Transit',
    '- Driver delivers: update status to Delivered',
    'Check in with the driver at least once on long hauls. Log any issues in load notes.',
    '',
    '## Critical Rules',
    '- Never book a load without driver confirmation',
    '- Never dispatch without a rate con on file',
    '- Never dispatch a driver with expired insurance or suspended authority',
    '- Always check broker flag before booking',
    '- If something goes wrong mid-load: see Breakdown and Emergency Procedures document',
  ].join('\n'), null, null, null)

  // ── 102 ── Driver Onboarding Checklist ────────────────────────────────────
  ups.run(102, 'Driver Onboarding Checklist', 'SOP', [
    '# Driver Onboarding Checklist',
    '',
    '## Why This Matters',
    'Every driver you dispatch represents OnTrack. If a driver has expired insurance and causes an accident you could share liability. If their MC is suspended and they get pulled over the load gets stranded. Proper onboarding protects the driver, the broker, and you.',
    '',
    '## Required Documents -- Collect All Before the First Load',
    '',
    '### 1. Driver License / CDL',
    'OnTrack works with both CDL drivers (semi-truck operators) and non-CDL hotshot drivers.',
    '',
    'For CDL drivers:',
    '- Scan or photograph both sides of the CDL',
    '- Not expired',
    '- Correct class: Class A for semi-trucks pulling trailers',
    '- Correct endorsements for load type (T = tanker, H = HazMat)',
    '- No endorsement needed for standard dry van, reefer, or flatbed',
    '',
    'For non-CDL hotshot drivers (vehicles under 26,001 lbs GVWR):',
    '- A standard driver\'s license is sufficient -- no CDL required under 26,001 lbs GVWR',
    '- Common setup: 1-ton pickup truck with a gooseneck or bumper pull trailer',
    '- Typical freight: construction materials, equipment, oilfield supplies, agricultural loads',
    '- Confirm the combined truck + trailer + load GVWR is under 26,001 lbs before treating as non-CDL',
    '- If combined weight exceeds 26,001 lbs: a CDL IS required -- verify before dispatching',
    '',
    '### 2. Certificate of Insurance (COI)',
    'The most critical document. Requirements:',
    '- Minimum $1,000,000 general liability',
    '- Minimum $100,000 cargo coverage',
    '- OnTrack Hauling Solutions must be listed as Certificate Holder',
    '- Contact the driver\'s insurance agent to add us if not listed',
    '- Note the expiry date and enter it in OnTrack',
    '',
    '### 3. W-9 Form',
    'Required for tax purposes. Driver fills it out. You keep it on file.',
    'You do not submit it to the IRS -- it is for your records when issuing a 1099 at year end.',
    '',
    '### 4. Signed Dispatch Agreement',
    'The agreement defines your working relationship:',
    '- Dispatch fee: 7% of driver gross per load',
    '- Driver retains full authority over which loads to accept or decline',
    '- You are an independent contractor, not an employee or broker',
    '- Either party may cancel with 7 days written notice',
    '- No exclusivity required',
    '- Non-Circumvention: driver may not contact or book directly with any broker introduced by OnTrack during or within 12 months after the agreement ends',
    '',
    '### 5. MC Authority Verification',
    'Go to safer.fmcsa.dot.gov and search the MC number. Confirm:',
    '- Status: ACTIVE',
    '- Operation: Authorized For-Hire',
    '- Insurance: On file and current',
    '- No out-of-service orders',
    '',
    '### 6. Carrier Packet',
    'Most brokers require a carrier packet before booking a first load. This is a broker-specific form with MC/DOT number, insurance info, and payment details. One per broker -- complete these as you register with new brokers.',
    '',
    '## Setup in OnTrack',
    '1. Drivers > New Driver -- fill in all fields: name, company, MC, DOT, phone, email',
    '2. Enter truck type, trailer type, home state, preferred lanes',
    '3. Set dispatch percentage (usually 7%)',
    '4. Enter CDL expiry date and insurance expiry date',
    '5. Upload documents to the Documents tab on the driver profile',
    'OnTrack will alert you when expiry dates approach 60 days.',
    '',
    '## Communication Setup',
    '- Confirm preferred contact method: call, text, or both',
    '- Confirm they can receive rate cons by email',
    '- Save driver cell as primary contact',
    '- Add emergency contact if available',
    '',
    '## First Load Guidelines',
    '- Do not dispatch on day one -- verify ALL documents first',
    '- Start with a shorter haul (under 500 miles) to test communication',
    '- Be extra reachable on the first load -- answer every call',
    '- After delivery, debrief: how was the broker? Any issues? How can you improve?',
  ].join('\n'), null, null, null)

  // ── 103 ── Invoice Submission Process ─────────────────────────────────────
  ups.run(103, 'Invoice Submission Process', 'SOP', [
    '# Invoice Submission Process',
    '',
    '## What Is a Dispatch Invoice?',
    'After a load is delivered you invoice the driver for your dispatch fee. Your fee is 7% of the driver\'s gross revenue on that load.',
    'Example: driver earns $2,000 on a load -- your invoice is $140.',
    'Note: you invoice the DRIVER, not the broker. The broker pays the driver directly.',
    '',
    '## Step 1 -- Confirm Delivery',
    'When the driver reports delivery:',
    '1. Ask for the POD (Proof of Delivery) -- a signed delivery receipt from the consignee',
    '2. Driver sends POD by photo, email, or text',
    '3. Update load status in OnTrack to Delivered',
    '4. Note the delivery date and time',
    '',
    '## Step 2 -- Collect the POD',
    'The POD is your proof the load was completed. It must show:',
    '- Delivery date and time',
    '- Consignee signature',
    '- BOL number',
    'If POD is missing: driver must obtain it from the receiver or broker within 24 hours. Do not invoice without a POD.',
    '',
    '## Step 3 -- Generate Invoice in OnTrack',
    'Invoices > New Invoice (or open the delivered load and click Generate Invoice).',
    '- Verify driver gross: the total rate on the rate con',
    '- Verify dispatch percentage',
    '- Verify dispatch fee (auto-calculated)',
    '- Set Week Ending date',
    '- Status: Draft',
    '',
    '## Step 4 -- Send the Invoice Email',
    'Subject: Dispatch Invoice -- [Driver Name] -- Load [Ref#] -- Delivered [Date]',
    '',
    '"Hi [Driver Name],',
    'Attached is the dispatch invoice for the load from [Origin] to [Destination] delivered [Date].',
    'Driver Gross: $[Amount]',
    'Dispatch Fee (7%): $[Amount]',
    'Please remit payment via [Zelle/ACH/check] at your earliest convenience.',
    'Thank you for rolling with OnTrack.',
    'Chris Hooks -- dispatch@ontrackhaulingsolutions.com"',
    '',
    '## Step 5 -- Update Invoice Status',
    'After sending: change status to Sent. Note the sent date.',
    '',
    '## Step 6 -- Payment Follow-Up Schedule',
    '- Day 5 after sending: quick check-in text to driver',
    '- Day 14: follow-up call if not yet paid',
    '- Day 25: firm call -- payment is due within the week',
    '- Day 30+: escalate; this is overdue',
    '',
    '## Factoring Drivers',
    'Some drivers use a factoring company that advances them cash and collects from the broker.',
    'The driver still owes you your dispatch fee regardless of factoring.',
    'Invoice the driver the same way. Communicate clearly about timing if factoring affects cash flow.',
    '',
    '## Dispute Resolution',
    '1. Pull the signed rate con -- confirm the agreed rate',
    '2. Calculate the fee using that exact rate and show your math',
    '3. If still unresolved: remind the driver the dispatch agreement defines the fee percentage',
    '4. Escalate to owner if no resolution after 2 attempts',
    '',
    '## Record Keeping',
    'Keep all invoices, PODs, and rate cons. These are your paper trail for disputes and year-end 1099s.',
  ].join('\n'), null, null, null)

  // ── 104 ── Broker Packet Requirements ─────────────────────────────────────
  ups.run(104, 'Broker Packet Requirements', 'Reference', [
    '# Broker Packet Requirements',
    '',
    '## What Is a Broker Packet?',
    'A carrier (broker) packet is the set of documents a broker requires before they will book loads with you. Every broker has their own form but they all need the same core information. Setting up with a broker is a one-time process per broker.',
    '',
    '## Why You Need This',
    'Brokers carry legal and financial responsibility for loads they arrange. They must verify your driver has proper authority and insurance before booking. Without an approved packet a broker cannot book your driver.',
    '',
    '## Documents Required',
    '',
    '### 1. Operating Authority',
    '- MC number: must be ACTIVE on FMCSA',
    '- DOT number: must be active',
    'Broker verifies this themselves at safer.fmcsa.dot.gov.',
    '',
    '### 2. Certificate of Insurance (COI)',
    '- Minimum $1,000,000 general liability',
    '- Minimum $100,000 cargo insurance',
    '- The BROKER must be listed as Certificate Holder on the COI',
    '- Driver\'s insurance agent emails the COI directly to the broker',
    '- Every broker needs their own COI with their name -- this is the most common setup delay',
    '',
    '### 3. W-9 Form',
    '- Driver\'s legal name and EIN or SSN',
    '- Required for the broker to process payment',
    '- Standard IRS form available at irs.gov',
    '',
    '### 4. Signed Broker-Carrier Agreement',
    'Read before signing. Key items to verify:',
    '- Payment terms (Net-30 is standard; Net-15 or Net-7 is better)',
    '- Quick pay options and any associated fees',
    '- Claims process for damaged cargo',
    '- Exclusivity clauses (avoid these)',
    '',
    '### 5. Voided Check or ACH Form',
    '- For direct deposit payment setup',
    '- Driver\'s business checking account preferred',
    '',
    '## Setting Up a New Broker -- Step by Step',
    '1. Find the broker on a load board or take their inbound call',
    '2. Ask them to email their carrier setup packet',
    '3. Fill out their form completely',
    '4. Have driver\'s insurance agent email the COI with the broker listed as certificate holder',
    '5. Submit W-9, signed agreement, voided check',
    '6. Follow up in 24-48 hours to confirm setup is complete',
    '7. Add broker to OnTrack Brokers page with payment terms and contact info',
    '',
    '## Checking a Broker\'s Creditworthiness',
    'Before the first load:',
    '- Verify broker authority on FMCSA (must have active property broker authority)',
    '- Check Carrier411.com for payment history and complaints',
    '- Check their DAT profile or Truckstop credit score',
    '- Ask: "What are your standard payment terms? Quick pay available?"',
    '- For unknown brokers: first load only and request quick pay',
    '',
    '## Payment Terms Explained',
    '- Net-30: broker pays 30 days after delivery and invoice submission',
    '- Net-15 / Net-7: faster payment -- negotiate for these when possible',
    '- Quick Pay: broker pays in 1-3 business days, usually charges 2-3% fee',
    '- Factoring: driver sells invoice to a factoring company for immediate cash (3-5% fee)',
    '',
    '## Red Flags -- Do Not Book',
    '- Broker authority not found on FMCSA',
    '- Multiple payment complaints on Carrier411',
    '- Broker asks you to call only a personal cell -- no office number',
    '- Unusually high rate with no clear explanation',
    '- Broker pressures you to dispatch without a signed rate con',
    '',
    '## Preferred Brokers',
    'See the Brokers page in OnTrack for current flags and payment history.',
    'Always check the flag before booking. Do not dispatch to Avoid-flagged brokers.',
  ].join('\n'), null, null, null)

  // ── 105 ── Driver Safety Compliance ───────────────────────────────────────
  ups.run(105, 'Driver Safety Compliance', 'Policy', [
    '# Driver Safety Compliance Policy',
    '',
    '## Why Compliance Is Non-Negotiable',
    'As a freight dispatcher you are not the carrier -- the driver is. However, knowingly dispatching a driver with suspended authority, expired insurance, or active safety violations exposes you to serious legal and financial risk. Brokers verify SAFER records. One compliance failure can permanently end a broker relationship.',
    '',
    '## Minimum Requirements for Any Active Driver',
    '',
    '### 1. Valid Driver License (CDL or Non-CDL)',
    'OnTrack dispatches both CDL and non-CDL hotshot drivers.',
    '',
    'CDL drivers (semi-trucks and trailers over 26,001 lbs GVWR):',
    '- Class A CDL required -- not expired, check OnTrack driver profile',
    '- Correct endorsements: T (tanker), H (HazMat), N (tank vehicles)',
    '- No endorsement needed for standard dry van, reefer, or flatbed',
    '',
    'Non-CDL hotshot drivers (under 26,001 lbs GVWR):',
    '- Standard driver\'s license is sufficient -- no CDL required',
    '- Typical equipment: 1-ton pickup truck with gooseneck or bumper pull trailer',
    '- If the combined vehicle + trailer + cargo weight exceeds 26,001 lbs, a CDL IS legally required',
    '- Verify GVWR before first dispatch -- do not assume based on truck type alone',
    '',
    '### 2. Active MC Operating Authority',
    '- Status must be ACTIVE on FMCSA SAFER (safer.fmcsa.dot.gov)',
    '- Not revoked, not suspended, not inactive',
    '- If suspended: do not dispatch. Driver must resolve with FMCSA first.',
    '',
    '### 3. Current Commercial Insurance',
    '- Minimum $750,000 liability (most brokers require $1M)',
    '- Minimum $100,000 cargo coverage',
    '- Policy must be current -- not lapsed',
    '- OnTrack alerts 60 days before expiry -- act early, not day-of',
    '',
    '### 4. No Active Out-of-Service (OOS) Orders',
    '- Check driver\'s SAFER record for OOS flags',
    '- An OOS order means DOT has ordered the driver or vehicle off the road',
    '- Dispatching a driver under an OOS order can result in fines and authority revocation',
    '',
    '### 5. Acceptable SMS Safety Score',
    '- FMCSA grades carriers on Safety Measurement System (SMS) scores',
    '- High percentile in any category signals compliance risk',
    '- Check at ai.fmcsa.dot.gov/SMS',
    '- Alert if scores are elevated in Unsafe Driving or Hours of Service categories',
    '',
    '## Hours of Service (HOS) Rules -- Simplified',
    'Drivers are legally limited in how many hours they can drive:',
    '- 11 hours driving maximum after 10 consecutive hours off duty',
    '- 14-hour window: must complete all driving within 14 hours of first going on duty',
    '- 30-minute break required after 8 hours of consecutive driving',
    '- 60/70-hour limit: cannot drive after 60 hours in 7 days or 70 hours in 8 days',
    '- 34-hour restart: driver can reset the weekly clock with 34 consecutive hours off',
    '',
    'Your responsibility: never pressure a driver to violate HOS. If they cannot make a delivery window legally, rebook the appointment or notify the broker of a delay.',
    '',
    '## Expiry Monitoring Procedure',
    '1. OnTrack shows expiry alerts on driver profiles at 60 days out',
    '2. Contact driver and their insurance agent 45 days before insurance expiry',
    '3. Request updated COI before the expiry date -- do not wait until it lapses',
    '4. Mark CDL renewal reminder on your task list 60 days before CDL expiry',
    '5. Do not book new loads for a driver with expiring credentials until renewal is confirmed',
    '',
    '## Accident or Incident Procedure',
    'See Breakdown and Emergency Procedures document. For accidents:',
    '1. Confirm driver and others are safe first',
    '2. Call 911 if there are injuries or major damage',
    '3. Driver should not admit fault at the scene',
    '4. Notify the broker immediately',
    '5. Document everything: photos, police report number, time, location, damage',
    '6. Log the incident in driver notes in OnTrack',
  ].join('\n'), null, null, null)

  // ── 106 ── Facebook Driver Search SOP ─────────────────────────────────────
  ups.run(106, 'Facebook Driver Search SOP', 'SOP', [
    '# Facebook Driver Search SOP',
    '',
    '## Overview',
    'Facebook is the single best free channel for finding owner-operator drivers. Tens of thousands of CDL and non-CDL hotshot drivers are active in trucking groups daily. OnTrack now works with both CDL semi-truck operators and non-CDL hotshot drivers running pickup trucks with gooseneck or bumper pull trailers. This SOP covers the systematic daily process to find, contact, and convert both driver types into dispatch clients.',
    '',
    '## Target Facebook Groups -- Join All of These',
    '',
    '### Semi-Truck / CDL Groups',
    '- Dispatch Nation',
    '- Owner Operators United',
    '- CDL Truckers Network',
    '- Trucking and Freight Professionals',
    '- Independent Owner Operators',
    '- Truck Drivers and Owner Operators',
    '- Trucking Industry Professionals',
    '- Owner Operator Truck Drivers',
    '- Load Board and Dispatch Tips',
    '- Trucking Owner Operators (multiple regional variants exist)',
    '',
    '### Hotshot / Non-CDL Groups',
    '- Hotshot Trucking',
    '- Hotshot Nation',
    '- Hotshot Trucking and Loads',
    '- Owner Operator Hotshot Drivers',
    '- Hotshot Loads and Dispatching',
    '- Gooseneck Trucking and Hotshot',
    '- Non-CDL Owner Operators',
    '',
    '## Daily Schedule',
    '',
    '### 9:00 AM -- Morning Sweep (15 min)',
    'In each group, use the group search bar to find posts containing:',
    '- "looking for dispatcher"',
    '- "need dispatch"',
    '- "seeking dispatch service"',
    '- "available truck"',
    '- "looking for loads"',
    '- "need a dispatcher"',
    '- "anyone recommend a dispatcher"',
    '- "dispatch services"',
    '- "hotshot dispatcher"',
    '- "looking for hotshot loads"',
    '- "need hotshot dispatch"',
    '- "gooseneck looking for loads"',
    'Note any new posts from the last 24 hours.',
    '',
    '### 9:30 AM -- Algorithm Training (15 min)',
    'Like and leave genuine comments on 5+ posts in driver groups.',
    'This trains Facebook to show your posts to more drivers organically.',
    'Good comment examples:',
    '- Respond to a driver asking about lanes with helpful rate info',
    '- Comment encouragement on a post about a tough delivery',
    '- Share a useful tip about a reliable broker in a lane',
    'Do not spam generic comments. Facebook and group admins will flag you.',
    '',
    '### 11:30 AM -- Second Sweep (10 min)',
    'Quick pass through all groups for posts since 9 AM.',
    'Respond immediately to any new posts matching your keywords.',
    '',
    '### 2:00 PM -- Response Monitoring (10 min)',
    'Check all DMs and comments received from morning outreach.',
    'Respond to every message within 2 hours. Unanswered DMs go cold fast.',
    '',
    '### 4:30 PM -- Final Sweep (10 min)',
    'End-of-day check. Set follow-up reminders for unanswered outreach.',
    'Log all new contacts in OnTrack Leads immediately.',
    '',
    '## Outreach Message Templates',
    '',
    '### Template 1 -- Direct Response to "Looking for Dispatcher" Post',
    '"Hey [Name], just saw your post. I run OnTrack Hauling Solutions -- we dispatch owner-operators on a flat 7% of gross. No contracts, you choose every load. I handle load searching, rate negotiation, rate cons, and broker paperwork. What equipment do you run and what lanes do you prefer? Happy to jump on a quick call."',
    '',
    '### Template 2 -- Cold Outreach to a Driver Venting About Brokers',
    '"Hey [Name], saw your post. Those broker issues are unfortunately common. If you\'re ever open to it I dispatch O/O drivers and handle all the broker back-and-forth so you can focus on driving. No pressure -- just putting myself out there. Feel free to DM if you ever want to chat."',
    '',
    '### Template 4 -- Hotshot / Non-CDL Driver Outreach',
    '"Hey [Name], I\'m a freight dispatcher working with hotshot and owner-operator drivers. We find loads, negotiate rates, and handle broker paperwork so you can focus on driving. I work with CDL and non-CDL setups -- gooseneck, bumper pull, whatever you\'re running. Our rate is 7% per load, no monthly fees. What lanes do you run? Happy to see if we\'re a fit."',
    '',
    '### Template 3 -- Follow-Up After No Response (3 Days Later)',
    '"Hey [Name], just following up on my message from a few days ago about dispatch. No worries if the timing is not right -- just wanted to make sure my message did not get lost. Still happy to chat if you\'re ever interested."',
    '',
    '## Content to Post in Groups (3-5x per week)',
    '- Rate check posts: "Rate check: [Lane] averaging $[X]/mile this week. Anyone running this corridor?"',
    '- Driver recruitment posts: use the Marketing tab templates',
    '- Helpful tips: HOS reminders, broker advice, load board tips',
    '- Success angle: "Our drivers averaged $[X] this week -- if you\'re looking for consistent loads, DM me."',
    '',
    '## Rules -- What NOT to Do',
    '- Do not message the same person more than 3 times without a response',
    '- Do not post spam or generic ads -- group admins will remove you',
    '- Do not promise specific earnings or rates you cannot guarantee',
    '- Always message from the OnTrack Hauling Solutions business page, not your personal account',
    '- Log every outreach in Leads immediately -- do not rely on memory',
  ].join('\n'), null, null, null)

  // ── 107 ── Warm Lead Follow-Up Script ─────────────────────────────────────
  ups.run(107, 'Warm Lead Follow-Up Script', 'SOP', [
    '# Warm Lead Follow-Up Script',
    '',
    '## What Is a Warm Lead?',
    'A warm lead is any driver who has already heard from you at least once and has not yet said no. This includes:',
    '- Contacted status: you reached out, no response yet',
    '- Interested status: showed interest but has not signed yet',
    '- Drivers who said "maybe later" or "I need to think about it"',
    'Warm leads are your highest-value activity. Re-engaging someone who already knows you is 10x easier than cold outreach.',
    '',
    '## Follow-Up Sequence',
    '- Day 1: Initial contact (cold call or DM)',
    '- Day 3: Attempt 2 -- phone call or DM',
    '- Day 7: Attempt 3 -- email or text',
    '- Day 14: Attempt 4 -- final call',
    '- After 4 attempts with no response: mark Rejected with note "No response after 4 attempts"',
    '',
    '## Phone Script -- Standard Follow-Up',
    '"Hi, this is Chris from OnTrack Hauling Solutions. I reached out [a few days ago / last week] about our dispatch service. Wanted to follow up and see if you had any questions or if the timing is better now. [pause and listen]"',
    '',
    'If they engage: "Great. To recap -- we handle load searching, rate negotiation, all broker paperwork, and rate confirmations for 7% of your gross per load. No monthly fees, no contracts. You keep full authority and approve every load before we book it. Does that sound like something that could work for you?"',
    '',
    '## Phone Script -- They Said "Call Me Back Later"',
    '"Absolutely, no problem. What is the best time to reach you? [note the time] I will put it in my calendar. Is this still the best number?"',
    'Then follow through -- call at the exact time you said.',
    '',
    '## Text / DM Script',
    '"Hey [Name], just wanted to circle back on dispatch. Still happy to chat when the timing works. No pressure at all."',
    '',
    '## Email Script',
    'Subject: Quick follow-up -- OnTrack Dispatch',
    '"Hi [Name], just following up on my earlier message.',
    'What we offer: load searching, rate negotiation, broker paperwork, carrier packet management -- all for 7% of gross per load. No contracts, no monthly fees, cancel anytime.',
    'If you have 10 minutes this week I would love to connect.',
    'Best, Chris Hooks -- dispatch@ontrackhaulingsolutions.com"',
    '',
    '## Objection Handling',
    '',
    '**"Your rate is too high"**',
    '"I understand. What rate have you seen elsewhere? [listen] Our 7% includes load searching, rate negotiation, all broker paperwork, and load monitoring. If you are handling all of that yourself, 7% is a fair trade for your time. What is your gross per week averaging right now?"',
    '',
    '**"I already have a dispatcher"**',
    '"No problem at all. If anything ever changes or you want a second opinion on rates, feel free to reach back out. Mind if I check in a couple months from now?"',
    '',
    '**"I find my own loads"**',
    '"That is great -- are you getting consistent rates? A lot of drivers who self-dispatch leave money on the table in rate negotiation. I could look at a recent rate con and tell you if you are getting market rates. No strings attached."',
    '',
    '**"I do not trust dispatchers"**',
    '"That is totally fair -- there are bad actors in this industry. I would rather earn your trust than ask for it. Would you be open to trying one load? If it is not worth it, no hard feelings."',
    '',
    '## When to Close -- Moving from Interested to Signed',
    'Signs a lead is ready to sign:',
    '- They ask about the dispatch agreement or contract terms',
    '- They ask how to get their first load',
    '- They ask about payment -- how do they pay you',
    '',
    'Closing script:',
    '"It sounds like we are on the same page. The next step is simple -- I send you our dispatch agreement, you review it, and if it looks good you sign and send back. Then I collect your carrier packet: MC number, COI, and W-9. After that we are ready to roll. Should I send that over today?"',
    '',
    '## After Every Attempt',
    'Update the lead record in OnTrack:',
    '- Date and method (call, text, DM, email)',
    '- Outcome (no answer, left voicemail, spoke briefly, not interested)',
    '- Next follow-up date',
  ].join('\n'), null, null, null)

  // ── 108 ── FMCSA Lead Review Checklist ────────────────────────────────────
  ups.run(108, 'FMCSA Lead Review Checklist', 'SOP', [
    '# FMCSA Lead Review Checklist',
    '',
    '## Overview',
    'Every Monday morning run the FMCSA import and review new leads. New carrier authorities (under 6 months old) are the hottest leads -- these drivers just got their MC number and many do not have a dispatcher yet.',
    '',
    '## Step 1 -- Run the Import',
    '1. Go to the Leads page',
    '2. Click FMCSA Import in the toolbar',
    '3. Wait for import to complete (may take 1-2 minutes)',
    '4. Note how many new leads were added',
    'If zero new leads: the system may have already imported all recent carriers. Focus on working existing leads.',
    '',
    '## Step 2 -- Reading the Lead Data',
    '',
    '### Authority Date',
    'When the carrier received their MC operating authority:',
    '- Under 90 days old: HOT. Brand new to the industry. Likely no dispatcher. Reach out immediately.',
    '- 90-180 days: Warm. A few months in. May have a dispatcher but could be frustrated or looking.',
    '- 6-24 months: Standard. Worth contacting but they have been approached before. Stand out.',
    '- Over 2 years: Lower priority unless other signals are strong.',
    '',
    '### Fleet Size (Power Units)',
    '- 1 truck: Solo operator. Simpler to manage. Good starting clients.',
    '- 2-3 trucks: Small fleet. Higher revenue potential.',
    '- 4+ trucks: Large fleet. High value but may have in-house dispatch already.',
    '',
    '### Trailer Type',
    '- Dry Van: highest load volume, easiest to place -- top priority',
    '- Reefer: strong demand, higher rates, time-sensitive',
    '- Flatbed: consistent demand, slightly more specialized',
    '- Step Deck / Lowboy: specialized flatbed -- good niche',
    '- Gooseneck / Bumper Pull (Hotshot): non-CDL operators, smaller loads, equipment and construction freight -- accepted',
    '- Tanker / HazMat: requires special endorsements -- lower priority',
    '',
    '### Location',
    'Strong markets for our network: TX, TN, GA, IL, OH, MO, KY, FL, NC',
    '',
    '## Step 3 -- Assign Priority',
    '',
    '**High Priority -- contact within 2 business days:**',
    '- Authority under 90 days AND 1-3 trucks',
    '- Any referred lead (any authority age)',
    '- High-traffic state with matching trailer type',
    '',
    '**Medium Priority -- contact within 5 business days:**',
    '- Authority 90-180 days OR small fleet size',
    '- Leads in secondary markets',
    '',
    '**Low Priority -- contact within 10 business days:**',
    '- Authority over 1 year',
    '- No fleet size data',
    '- Solo operators in low-frequency lanes',
    '',
    '## Step 4 -- Update Lead Statuses',
    'After reviewing, update any leads you recognize:',
    '- Already spoken to them: New to Contacted',
    '- Showed interest: to Interested',
    '- Known duplicate: to Rejected with note "Duplicate"',
    '- Known bad actor (revoked authority, violations): to Rejected with note "Compliance issue"',
    '',
    '## Step 5 -- Review the Existing Pipeline',
    '- All Contacted leads with follow-up dates today or past -- call them today',
    '- All Interested leads -- any ready to sign this week?',
    '- Any leads stuck in New for over 10 days -- reassess or move to Rejected',
    '',
    '## Step 6 -- Build Your Call List',
    'From new and existing High priority leads, build your call list for today.',
    'Target: 10 calls per review session. Log every outcome in lead notes immediately.',
    '',
    '## Notes',
    '- Monday review should take no more than 2 hours total',
    '- Quality of contact matters more than quantity -- a good 10-minute call beats 20 voicemails',
    '- Run the import weekly for fresh leads -- the FMCSA database updates regularly',
  ].join('\n'), null, null, null)

  // ── 109 ── What Is Freight Dispatch? ──────────────────────────────────────
  ups.run(109, 'What Is Freight Dispatch? — Business Overview', 'Reference', [
    '# What Is Freight Dispatch? -- Business Overview',
    '',
    '## The Big Picture',
    'Freight dispatch is the business of connecting truck drivers with freight loads and managing the entire process for a fee. You act as the business manager for independent truck drivers so they can focus on driving while you handle the business side.',
    '',
    '## How the Freight Ecosystem Works',
    '',
    '**Shipper** -- The company that has goods to move.',
    'Example: a manufacturer in Chicago needs to ship 40,000 lbs of auto parts to Dallas.',
    '',
    '**Freight Broker** -- A licensed middleman (must have FMCSA broker authority) who contracts with shippers to arrange transportation. The broker finds carriers, coordinates logistics, and takes a margin.',
    'Examples: Coyote Logistics, CH Robinson, Echo Global Logistics, TQL, Landstar.',
    '',
    '**Carrier** -- The truck driver (or trucking company) with a commercial vehicle and MC operating authority who physically hauls the freight. Most carriers are small -- often 1-3 trucks.',
    '',
    '**Dispatcher** -- That is you. You work FOR the carrier (driver), not the broker. You help the driver find loads, negotiate rates, handle paperwork, and manage broker relationships.',
    '',
    '## How You Make Money',
    'You charge the driver a percentage of their gross revenue per load.',
    'Standard rate: 7%.',
    '',
    'Example:',
    '- Driver hauls a load for $2,000',
    '- Your fee: $140 (7% of $2,000)',
    '- Driver keeps: $1,860',
    '',
    'You do NOT take money from the broker.',
    'You do NOT guarantee driver earnings.',
    'Your income is directly tied to how much the driver earns -- so great dispatching pays more.',
    '',
    'With 5 active drivers averaging $5,000/week gross each:',
    '- Combined driver gross: $25,000/week',
    '- Your weekly revenue: $1,750 (7%)',
    '- Annual revenue at this volume: ~$91,000',
    '',
    '## What You Do Every Day',
    '- Find freight loads on load boards (DAT, Truckstop) matching driver equipment and preferred lanes',
    '- Call brokers and negotiate the best possible rates',
    '- Review rate confirmations and send to drivers',
    '- Book loads, enter them in OnTrack, and send driver instructions',
    '- Track loads in transit and update statuses',
    '- Invoice drivers after delivery',
    '- Prospect for new driver clients through FMCSA data and social media',
    '- Follow up with leads and onboard new drivers',
    '',
    '## What You Do NOT Do',
    '- You are NOT an employee of the driver or broker',
    '- You do NOT have a CDL or drive trucks',
    '- You do NOT hold freight or take possession of goods',
    '- You are NOT a freight broker (you work for carriers, not shippers)',
    '- You do NOT need a broker license to dispatch for carriers',
    '',
    '## The Legal Structure',
    'You operate as an independent contractor to each driver. The dispatch agreement defines this relationship. Each driver retains full authority and makes all final decisions on which loads to accept or reject.',
    '',
    '## What Makes a Great Dispatcher',
    '- Speed: loads move fast -- slow dispatchers lose loads to faster ones',
    '- Relationships: brokers book with dispatchers they know and trust',
    '- Rate knowledge: knowing market rates prevents leaving money on the table',
    '- Communication: drivers need clear, accurate instructions every time',
    '- Organization: tracking multiple loads for multiple drivers requires discipline',
    '- Persistence: building a driver client base requires consistent daily effort',
  ].join('\n'), null, null, null)

  // ── 110 ── Trucking Industry Glossary ─────────────────────────────────────
  ups.run(110, 'Trucking Industry Glossary', 'Reference', [
    '# Trucking Industry Glossary',
    '',
    '## Authority and Compliance',
    '**MC Number** -- Motor Carrier number issued by FMCSA. Required for for-hire carriers. This is the carrier\'s operating license.',
    '**DOT Number** -- Department of Transportation number. Identifies the carrier for safety tracking.',
    '**FMCSA** -- Federal Motor Carrier Safety Administration. Regulates commercial trucking in the US.',
    '**Operating Authority** -- Legal permission to operate as a for-hire carrier. Issued by FMCSA. Must be ACTIVE.',
    '**SAFER** -- Safety and Fitness Electronic Records. Public database at safer.fmcsa.dot.gov.',
    '**SMS Score** -- Safety Measurement System score. FMCSA grades carriers on safety categories. High percentile = compliance risk.',
    '**OOS / Out of Service** -- Order from DOT to stop operating until a violation is resolved.',
    '**CDL** -- Commercial Driver License. Required to operate commercial vehicles over 26,000 lbs.',
    '**Class A CDL** -- Required for combination vehicles (semi-trucks). Covers all commercial vehicles.',
    '**Endorsements** -- Add-ons to a CDL for special cargo: T (tanker), H (HazMat), X (both).',
    '',
    '## Freight and Load Terms',
    '**Load / Shipment** -- A freight job. One pickup point, one delivery point.',
    '**FTL / Full Truckload** -- A load that fills (or nearly fills) an entire trailer.',
    '**LTL / Less-than-Truckload** -- Smaller freight sharing trailer space with other shippers. Dispatchers typically do not handle LTL.',
    '**Commodity** -- What is being hauled. Examples: produce, steel coils, consumer goods, auto parts.',
    '**Rate Con / Rate Confirmation** -- The binding contract between broker and carrier confirming rate, pickup, delivery, and terms.',
    '**BOL / Bill of Lading** -- Legal receipt of freight issued by the shipper at pickup.',
    '**POD / Proof of Delivery** -- Signed receipt from the consignee confirming delivery. Required to invoice.',
    '**Deadhead** -- Empty miles driven without a loaded trailer.',
    '**Drop and Hook** -- Driver drops an empty trailer and hooks up a pre-loaded one. No wait time. Preferred.',
    '**Live Load / Live Unload** -- Driver waits while freight is loaded or unloaded at origin or destination.',
    '**Detention** -- Extra pay when a driver is held at a shipper or receiver beyond the free time (usually 2 hours).',
    '**TONU / Truck Order Not Used** -- Compensation when a load is cancelled after the driver is dispatched.',
    '**Layover Pay** -- Compensation when a driver is forced to wait overnight due to delays not their fault.',
    '',
    '## Rates and Money',
    '**Rate / Total Rate** -- The total dollar amount the broker pays for the load.',
    '**RPM / Rate Per Mile** -- Total rate divided by total miles. Standard measure of load quality.',
    '**Driver Gross** -- Total rate the driver earns on a load before your dispatch fee.',
    '**Dispatch Fee** -- Your percentage of the driver\'s gross (typically 7%).',
    '**FSC / Fuel Surcharge** -- A fee added to offset fuel costs. Often included in the all-in rate.',
    '**Net-30** -- Broker pays invoice within 30 days of delivery and invoice submission.',
    '**Quick Pay** -- Broker pays in 1-3 business days, usually for a fee of 2-3%.',
    '**Factoring** -- A financial service that advances the driver immediate cash on their invoice.',
    '',
    '## Equipment Types',
    '**Dry Van** -- Enclosed box trailer. Most common. Hauls general freight: boxes, pallets, consumer goods.',
    '**Reefer / Refrigerated** -- Temperature-controlled trailer. Hauls produce, meat, pharmaceuticals. Higher rates.',
    '**Flatbed** -- Open platform trailer. Hauls building materials, steel, machinery. Requires straps/tarps.',
    '**Step Deck / Drop Deck** -- Two-level flatbed for taller cargo exceeding standard height limits.',
    '**Lowboy** -- Very low-profile trailer for extremely tall or heavy equipment.',
    '**Tanker** -- Cylindrical trailer for liquids or bulk materials. Requires T endorsement.',
    '**Conestoga / Curtainside** -- Flatbed with a rolling tarp system.',
    '',
    '## People and Roles',
    '**Shipper** -- Company or person who owns the freight and needs it moved.',
    '**Consignee** -- Recipient of the freight at the delivery destination.',
    '**Broker** -- Licensed middleman who arranges transportation between shippers and carriers.',
    '**Carrier** -- Truck driver or trucking company that physically moves the freight.',
    '**Dispatcher** -- Independent business manager for carriers.',
    '**Lumper** -- Person who unloads freight at the delivery point for a fee.',
    '',
    '## Load Board and Industry Tools',
    '**DAT** -- Largest load board in North America. dat.com.',
    '**Truckstop** -- Major load board. truckstop.com.',
    '**Carrier411** -- Free broker credit and payment history database. carrier411.com.',
    '**Posting** -- A load listed on a load board by a broker.',
    '**Preferred Lane** -- The route or corridor a driver likes to run consistently.',
    '**Coverage** -- Area the carrier is willing to operate in.',
  ].join('\n'), null, null, null)

  // ── 111 ── How to Find Loads ───────────────────────────────────────────────
  ups.run(111, 'How to Find Loads — Load Board Guide', 'Reference', [
    '# How to Find Loads -- Load Board Guide',
    '',
    '## Overview',
    'Load boards are online marketplaces where brokers post available loads and dispatchers search for them. This is where you find freight for your drivers every single day.',
    '',
    '## DAT One (dat.com) -- Primary Tool',
    'DAT is the industry standard. The highest volume. The most brokers.',
    '',
    '### Searching on DAT',
    '1. Log in to your DAT account (subscription required)',
    '2. Go to Search Loads',
    '3. Enter: Equipment type, Origin city or zip, Origin radius (100-150 miles), Destination (blank for all or specific city)',
    '4. Set pickup date range',
    '5. Click Search',
    '',
    '### Reading a DAT Posting',
    '- Origin / Destination: where the load starts and ends',
    '- Miles: total trip miles (verify this is accurate)',
    '- Rate: total pay. If it says "Call" you must negotiate by phone',
    '- Equipment: trailer type required',
    '- Pickup date and time window',
    '- Broker company name and phone number',
    '- Reference number: quote this when calling the broker',
    '',
    '### DAT Rate Check -- Do This Before Every Call',
    'Before calling on any load check the DAT Rate Index for the lane.',
    'This shows what similar loads are paying in the current market.',
    'This is your leverage in negotiations.',
    'If DAT says the lane averages $2.20/mile and the broker posts at $1.90 -- you know to counter at $2.30+.',
    '',
    '## Truckstop (truckstop.com) -- Secondary Tool',
    'Similar to DAT. Some brokers post exclusively here.',
    'Truckstop often shows broker credit scores and payment ratings in search results.',
    'A broker with a 98% payment rating is safer than one at 85%.',
    '',
    '## Direct Broker Relationships',
    'Over time, build direct relationships with reliable brokers.',
    'When you have a driver available, call your top 5 brokers directly:',
    '"Hey [Name], it\'s Chris from OnTrack. I have a [equipment] available out of [city] [date]. What do you have moving in that area?"',
    'This often gets better rates than load boards because you are negotiating before the load is publicly posted.',
    '',
    '## What to Look for in a Posting',
    '',
    '**Good signs:**',
    '- Rate is at or above DAT average for the lane',
    '- Drop and hook (no wait time)',
    '- Broker has strong payment history',
    '- Pickup window is flexible',
    '',
    '**Red flags:**',
    '- Rate is significantly below market',
    '- Unusual insurance demands or special conditions',
    '- No rate posted -- must negotiate blind',
    '- Extremely tight pickup or delivery window',
    '- Broker has payment complaints or low credit score',
    '',
    '## The 3-Call Strategy',
    'When a driver is available:',
    '1. Search DAT and identify the top 5 loads matching RPM, lane, and equipment',
    '2. Call them in order from best to worst',
    '3. Accept the first one you can negotiate to your target rate and stop calling',
    'Do not accept the first load you find just to fill the truck.',
    'Take 10 minutes to compare options -- it is worth it.',
    '',
    '## Building Your Broker Contact List',
    'Every time you book a load, save the broker contact:',
    '- Person\'s name and direct number',
    '- Email address',
    '- Payment terms',
    '- Add to the Brokers page in OnTrack',
    '',
    'After 6-12 months you will have 50-100 broker contacts who know your name.',
    'That direct network is where the real rate advantage comes from.',
  ].join('\n'), null, null, null)

  // ── 112 ── Rate Negotiation Guide ─────────────────────────────────────────
  ups.run(112, 'Rate Negotiation Guide', 'SOP', [
    '# Rate Negotiation Guide',
    '',
    '## Why Negotiation Matters',
    'The posted rate on a load board is almost never the broker\'s best rate. Brokers build in margin.',
    'On a $2,000 load a $200 rate increase adds $14 to your fee AND $186 to your driver\'s pocket.',
    'That is the difference between a driver who stays and one who leaves.',
    '',
    '## Know the Market Before You Call',
    '',
    '### Step 1 -- Check DAT Rate Index',
    'Before calling on any load, check what the lane is actually paying:',
    '1. On DAT, search the lane (origin to destination)',
    '2. Look at the 30-day average rate for your equipment type',
    '3. Note the high and low range',
    'This is your leverage. Know the number before you dial.',
    '',
    '### Step 2 -- Know Your Floor',
    'Your floor = the minimum rate the driver will accept.',
    'Ask every driver at onboarding: "What is your minimum RPM for [their equipment type and lanes]?"',
    'Never accept a load below the driver\'s stated minimum. It creates resentment and kills trust.',
    '',
    '## The Negotiation Call',
    '',
    '**Opening -- let them go first:**',
    '"Hi, I\'m calling about load [Ref#] from [Origin] to [Destination]. What\'s the all-in rate on that?"',
    '',
    '**If their rate is below market:**',
    '"I appreciate that, but I\'m showing the lane averaging around $[DAT average] right now.',
    'Can we get to $[your ask]? My driver is available today and we can get moving on this quickly."',
    '',
    '**If their rate is close to market:**',
    '"I have a driver available and ready. Best I can do is $[slightly above their offer] -- can you make that work?"',
    '',
    '**If they say the rate is firm:**',
    '"I understand. Let me check with my driver on that -- can you hold it for 10 minutes?"',
    '(This gives you time to confirm with the driver or decide to walk away.)',
    '',
    '## Negotiation Tactics That Work',
    '',
    '**The Speed Close:**',
    '"I have a driver who can pick up in [X hours]. I need $[rate] to make it work -- can we close this now?"',
    '',
    '**The Relationship Play:**',
    '"I\'ve booked [X loads] with your company and always delivered clean. Can you do $[rate] for a reliable carrier?"',
    '',
    '**The Silence Tactic:**',
    'After stating your counter, stop talking.',
    'Many brokers will fill the silence with a concession.',
    '',
    '**The Volume Play:**',
    '"I have two drivers available in that area. If you have multiple loads moving I can cover them both at $[rate]."',
    '',
    '## When to Walk Away',
    '- Rate is more than 15% below DAT average and they will not move',
    '- Load does not pencil after accounting for deadhead miles',
    '- Pickup or delivery window is not feasible for the driver',
    '- Broker is on your Avoid list',
    'Walking away is not a failure. A bad load accepted is worse than no load. Keep searching.',
    '',
    '## Rate Benchmarks by Equipment',
    'These change with fuel prices and market cycles. Use DAT Rate Index for current data.',
    '- Dry Van: $2.00-$3.50/mile. Minimum: $2.00. Target: $2.50+',
    '- Reefer: $2.50-$4.00/mile. Minimum: $2.50. Target: $3.00+',
    '- Flatbed: $2.25-$3.75/mile. Minimum: $2.25. Target: $2.75+',
    '- Step Deck: $2.50-$4.00/mile. Specialty loads command a premium.',
    '',
    '## After the Negotiation',
    '- Get the agreed rate in writing (rate con) before confirming with driver',
    '- Confirm the all-in rate includes fuel surcharge if applicable',
    '- Note the broker contact name and rate achieved -- use it as a benchmark next time',
  ].join('\n'), null, null, null)

  // ── 113 ── Cold Call Script ────────────────────────────────────────────────
  ups.run(113, 'Cold Call Script — First Driver Contact', 'SOP', [
    '# Cold Call Script -- First Driver Contact',
    '',
    '## Overview',
    'Cold calling FMCSA leads is the most direct way to build your driver client base.',
    'Most new carriers have never been called by a dispatcher before.',
    'Your call may be their first introduction to professional dispatch services.',
    'Be genuine, be brief, and make the conversation about them.',
    '',
    '## Before You Call',
    'Pull up the lead in OnTrack and note:',
    '- Driver name and company name',
    '- State / home base',
    '- Trailer type',
    '- Authority date (how new are they?)',
    '- Any prior contact notes',
    '',
    'Quick FMCSA check:',
    '- Confirm authority is ACTIVE at safer.fmcsa.dot.gov',
    '- Note fleet size if visible',
    '',
    '## The Call',
    '',
    '### Opening (first 5 seconds -- do not rush)',
    '"Hi, is this [Driver Name]? My name is Chris, I\'m calling from OnTrack Hauling Solutions. Do you have just 2 minutes?"',
    'Wait for their answer. If yes, proceed.',
    '',
    '### The 30-Second Pitch',
    '"I\'m a freight dispatcher -- I work for owner-operators finding loads, negotiating rates, and handling all the broker paperwork so you can focus on driving. I saw your authority and wanted to reach out and introduce myself. I only charge a fee of 7% when I actually book a load for you -- no monthly fees, nothing upfront."',
    '',
    '### Qualifying Questions',
    '1. "What equipment do you run?"',
    '2. "What lanes do you prefer? Regional or OTR?"',
    '3. "Do you currently have a dispatcher, or are you finding your own loads?"',
    '4. "How long have you had your authority running?"',
    '',
    '### If They Have No Dispatcher',
    '"A lot of drivers I talk to who self-dispatch spend 3-4 hours a day on the phone with brokers.',
    'I can take that completely off your plate.',
    'How does your week look right now -- are you sitting or do you have loads lined up?"',
    '',
    '### If They Already Have a Dispatcher',
    '"No problem at all -- I\'m not trying to pull you away from anyone.',
    'I just want to put my name out there.',
    'A lot of drivers come back to me when they want to make a change or when their dispatcher is not delivering.',
    'Would it be OK if I followed up in a month or two?"',
    '',
    '### Closing the Call',
    '"I\'d love to set up a 15-minute call this week to go over what we offer and see if it\'s a fit.',
    'Are you free [day] or [day]?"',
    '',
    'If they want info first: "Absolutely -- let me send you a quick text with our info. What\'s the best number?"',
    '',
    'If not interested: "No problem at all. I appreciate your time. If anything changes feel free to reach out. Drive safe."',
    '',
    '## After Every Call',
    'Log in OnTrack immediately:',
    '- Update status (New to Contacted)',
    '- Note date, what was discussed, their current situation',
    '- Set follow-up date based on outcome',
    '- If they asked for info: send within 10 minutes',
    '',
    '## Common Scenarios',
    '',
    '**They are driving:**',
    '"I appreciate you picking up -- I\'ll be super quick. I\'m a freight dispatcher. Can I follow up in a couple hours when you\'re off the road?"',
    '',
    '**Voicemail:**',
    '"Hi [Name], this is Chris from OnTrack Hauling Solutions. I\'m a freight dispatcher working with owner-operators in [state/region].',
    'If you\'re ever looking for help finding loads and handling broker paperwork, give me a call at [number].',
    'Thanks -- drive safe."',
    '',
    '**Rude or impatient:**',
    '"No problem at all, I\'ll let you go. If you ever want to learn more, feel free to reach out. Drive safe."',
    'Mark as Rejected: "Declined - not interested."',
  ].join('\n'), null, null, null)

  // ── 114 ── Daily Dispatch Routine ─────────────────────────────────────────
  ups.run(114, 'Daily Dispatch Routine', 'SOP', [
    '# Daily Dispatch Routine',
    '',
    '## Overview',
    'A dispatcher who runs their day on a schedule outperforms one who reacts.',
    'This routine covers every key activity from morning through end of day.',
    '',
    '## 7:45 AM -- Pre-Day Prep (5 min)',
    '- Check overnight messages from drivers (texts, emails, missed calls)',
    '- Note any urgent issues requiring immediate attention',
    '',
    '## 8:00 AM -- Dashboard Review (10 min)',
    'Open OnTrack and check the Dashboard:',
    '- Drivers Needing Loads: who is coming off a load or already available?',
    '- Loads In Transit: any pickups or deliveries happening today?',
    '- Follow-Up Leads: which leads need contact today?',
    '- Outstanding Invoices: anything overdue?',
    '- Today\'s Tasks: what is on the task list?',
    '',
    '## 8:15 AM -- Driver Check-Ins (15 min)',
    'Contact every driver with an active load:',
    '"Hey [Name], how is everything going? Any updates on your delivery?"',
    '- Update load status in OnTrack based on responses',
    '- Note any delays, delivery issues, or problems',
    '- If a driver is delivered or empty: start planning their next load now',
    '',
    '## 9:00 AM -- Facebook Morning Sweep (20 min)',
    'See Facebook Driver Search SOP for full detail.',
    '- Search all target groups for driver posts',
    '- Respond to overnight messages and comments',
    '- Like and comment on 5+ posts for algorithm training',
    '- Log any new contacts in Leads',
    '',
    '## 9:30 AM -- Load Search for Available Drivers (30-60 min)',
    'This is your highest-revenue activity. Do not skip or rush it.',
    'For each available driver:',
    '1. Confirm their current or upcoming empty location',
    '2. Open DAT and search loads from that area in their equipment type',
    '3. Check DAT Rate Index for the lane before calling',
    '4. Call brokers on the top 3-5 loads',
    '5. Negotiate, confirm with driver, book, and enter in OnTrack',
    '6. Send driver instructions immediately after booking',
    '',
    '## 11:00 AM -- Lead Pipeline Work (30 min)',
    'Open the Leads page:',
    '- Work all leads with follow-up dates today or past due',
    '- Make calls, send texts, update statuses',
    '- Move promising leads forward in the pipeline',
    '- Set new follow-up dates for everyone you contact',
    '',
    '## 12:00 PM -- Midday Driver Check-In (10 min)',
    'Quick text to any driver on a long haul:',
    '"Hey [Name], how are you doing out there? Still on schedule?"',
    'Update load notes if anything has changed.',
    '',
    '## 2:00 PM -- Response Monitoring (15 min)',
    'Check all channels for messages received since morning:',
    '- Facebook DMs and comments',
    '- Text messages',
    '- Email',
    'Respond to everything within 2 hours. Leads and drivers go cold fast.',
    '',
    '## 3:00 PM -- Next-Day Confirmations (20 min)',
    'For every load picking up tomorrow:',
    '- Call or text the driver: "You have a pickup tomorrow at [Time] at [Address]. Ready to go?"',
    '- Confirm they have the rate con and full pickup details',
    '- Verify no truck or schedule issues',
    '',
    '## 4:00 PM -- Second Load Search Pass (30 min)',
    'If any drivers are still without loads for tomorrow:',
    '- Run a second DAT search',
    '- Call direct broker contacts: "Hey [Name], it\'s Chris from OnTrack -- I have a [equipment] available out of [city] tomorrow. Anything moving?"',
    '',
    '## 4:30 PM -- Facebook Afternoon Sweep (10 min)',
    'Quick second pass through driver groups.',
    'Respond to any new posts since morning. Log new contacts.',
    '',
    '## 5:00 PM -- Invoicing (15 min)',
    'For every load marked Delivered today or yesterday:',
    '1. Confirm POD received',
    '2. Generate invoice in OnTrack',
    '3. Email to driver',
    '4. Update invoice status to Sent',
    '',
    '## 5:15 PM -- End-of-Day Wrap-Up (10 min)',
    '- Update all load statuses to current state',
    '- Set tomorrow\'s follow-up dates for outstanding leads',
    '- Mark completed tasks in OnTrack',
    '- Review tomorrow\'s task list',
    '- Note any unresolved issues for first thing tomorrow',
    '',
    '## Weekly Rhythm',
    '- Monday: FMCSA Lead Review (see checklist)',
    '- Wednesday: Warm Lead Follow-Up session (see script)',
    '- Friday: Pipeline review -- assess week, set priorities for next week',
    '- Friday: Review overdue invoices, send follow-ups',
  ].join('\n'), null, null, null)

  // ── 115 ── Breakdown and Emergency Procedures ──────────────────────────────
  ups.run(115, 'Breakdown and Emergency Procedures', 'SOP', [
    '# Breakdown and Emergency Procedures',
    '',
    '## Overview',
    'Things go wrong in trucking. Your job is to stay calm, move fast, and communicate clearly.',
    'How you handle a crisis is what separates professional dispatchers from amateur ones.',
    'Drivers will remember how you showed up when it mattered.',
    '',
    '## Type 1 -- Mechanical Breakdown',
    '',
    '### First 5 Minutes',
    '1. "Are you safe? Are you pulled completely off the road?"',
    '2. "What is the issue -- can the truck still move?"',
    '3. "What is your exact location? Mile marker, highway, nearest exit?"',
    '4. "What time is your delivery appointment?"',
    '',
    '### Your Immediate Actions',
    '1. Search "mobile semi truck repair [city/state]" for roadside assistance options',
    '2. If at a truck stop: many have on-site repair or vendor contacts',
    '3. Call the driver back with 2-3 repair options and phone numbers',
    '4. Calculate if the delivery appointment is still achievable',
    '',
    '### Notify the Broker',
    '"Hi [Name], this is Chris from OnTrack. Our driver [Name] on load [Ref#] has a mechanical issue near [location]. We are working to get repairs underway. Current ETA is uncertain -- I will update you within [1-2 hours]. What is the delivery appointment flexibility?"',
    'Be honest. Do not promise a delivery time you cannot guarantee.',
    'Update the broker every 2 hours until resolved.',
    '',
    '## Type 2 -- Missed Pickup Appointment',
    '1. Call driver: "What is your current ETA to the shipper?"',
    '2. Call the broker immediately -- do not wait for them to call you:',
    '"Hi, this is Chris from OnTrack on load [Ref#]. Our driver is running approximately [X hours] late. ETA is now [time]. Can the shipper accommodate a later arrival or can we reschedule the appointment?"',
    '3. Update load notes with the delay and new ETA',
    '4. If appointment cannot be rescheduled: cooperate with broker finding another carrier',
    '',
    '## Type 3 -- Missed Delivery Appointment',
    'Same process as missed pickup. Notify broker immediately. Offer solutions. Stay professional.',
    'Early notification gives the receiver options. Late notification leaves them with none.',
    '',
    '## Type 4 -- Load Cancellation by Broker',
    '1. Confirm whether the driver is already en route to pickup',
    '2. If driver is committed and driving to pickup: you may be entitled to TONU pay',
    '3. TONU is typically $100-$200 or a percentage of the load rate',
    '4. Request in writing: "Our driver was dispatched and en route. We will need TONU compensation per rate con terms."',
    '5. Update load status in OnTrack and begin searching for a replacement load',
    '',
    '## Type 5 -- Driver Cannot Complete a Load Mid-Transit',
    '1. Find out why: safety issue, equipment failure, personal emergency?',
    '2. Driver safety comes first. Always.',
    '3. Notify the broker immediately: "We have a situation. Please advise the nearest secure location to drop the load."',
    '4. Broker will arrange freight transfer. Document everything.',
    '',
    '## Type 6 -- Accident',
    '',
    '### Immediate Response',
    '1. "Is anyone hurt? Do you need an ambulance? Call 911 now if yes."',
    '2. "Do not leave the scene. Do not admit fault to anyone."',
    '3. "If another vehicle is involved, get their info: name, insurance, plate, phone."',
    '4. "Take photos of everything: truck, trailer, other vehicle, road, damage."',
    '',
    '### After Safety Is Confirmed',
    '1. Call the driver\'s carrier insurance to report the incident',
    '2. Notify the broker: "Our driver was involved in an accident at [location]. Load may be delayed."',
    '3. Document everything: date, time, location, what happened, police report number, damage',
    '4. Add full incident notes to the load AND the driver record in OnTrack',
    '',
    '## Documentation Rule',
    'Every incident, no matter how minor, gets logged in OnTrack notes with:',
    '- Date and time',
    '- What happened',
    '- Who was notified and when',
    '- Resolution or current status',
    'Paper trails protect you. No exceptions.',
  ].join('\n'), null, null, null)

  // ── 116 ── How to Vet a New Broker ────────────────────────────────────────
  ups.run(116, 'How to Vet a New Broker', 'SOP', [
    '# How to Vet a New Broker',
    '',
    '## Why This Matters',
    'Not every company posting loads on DAT is a legitimate, financially stable broker.',
    'Some brokers have poor payment histories. Some double-broker loads (often illegal).',
    'A few are outright fraudulent.',
    'One bad broker can mean your driver works for free.',
    '',
    '## Step 1 -- Verify Broker Authority on FMCSA',
    '1. Go to safer.fmcsa.dot.gov',
    '2. Search by the broker\'s MC number or company name',
    '3. Confirm operating status is ACTIVE as a Property Broker',
    '4. Note how long they have had their authority',
    '5. Look for any compliance flags or name changes',
    '',
    'Red flags:',
    '- Suspended authority',
    '- Authority less than 6 months old',
    '- Unusual number of name or address changes',
    '',
    '## Step 2 -- Check Carrier411 (Free)',
    'Go to carrier411.com and search by broker name or MC number.',
    '- Look at overall rating (5-star scale)',
    '- Read the comments -- look for patterns, not one-off complaints',
    '- Check recency -- recent complaints matter more than old ones',
    '',
    'Red flags on Carrier411:',
    '- Rating under 3.5 stars',
    '- Multiple recent non-payment or slow payment complaints',
    '- Any comments about double-brokering or load fraud',
    '',
    '## Step 3 -- Check DAT Broker Credit Score',
    'DAT One has a broker credit scoring feature:',
    '- 90+: reliable, pay consistently',
    '- 75-89: acceptable, monitor closely',
    '- Under 75: use caution, require quick pay or avoid',
    '',
    '## Step 4 -- Call and Evaluate Professionalism',
    '- Do they have a professional office line or just a cell?',
    '- Do they have a legitimate company website?',
    '- Do they have a carrier setup process with proper documentation?',
    '- Do they provide a written rate confirmation before the load moves?',
    'A legitimate broker ALWAYS provides a signed rate con. No rate con = hard stop.',
    '',
    '## Step 5 -- Start Small',
    'For any new broker:',
    '- Book one smaller load first (under $1,500)',
    '- Monitor payment closely',
    '- Do not book multiple simultaneous loads until they pay',
    '',
    '## Step 6 -- Add to OnTrack Brokers Page',
    '- Clear status for first-time approved brokers',
    '- Note payment terms and contact info',
    '- After first confirmed payment: add note "Paid on time [date]"',
    '- If payment issues arise: change to Caution or Avoid immediately',
    '',
    '## Broker Flag Guide',
    '- Preferred: reliable, good rates, pays on time -- prioritize',
    '- Clear: standard broker, no issues on file',
    '- Caution: one issue or complaint -- use but monitor',
    '- Avoid: do not book any loads with this broker',
    '',
    '## Double-Brokering Warning',
    'Double-brokering is when a broker passes a load to another broker without the shipper\'s knowledge.',
    'This is often illegal and can leave your driver unpaid.',
    '',
    'Signs of double-brokering:',
    '- Broker cannot provide direct shipper contact info',
    '- Rate is unusually high with no explanation',
    '- Pickup location is a truck stop rather than an actual shipper',
    '- The "shipper" on the rate con is actually another broker name',
    '',
    'If you suspect double-brokering: do not take the load.',
  ].join('\n'), null, null, null)

  // ── 117 ── Explaining Your Dispatch Fee ───────────────────────────────────
  ups.run(117, 'Explaining Your Dispatch Fee — Driver Conversations', 'Training', [
    '# Explaining Your Dispatch Fee -- Driver Conversations',
    '',
    '## Overview',
    'The most common question from drivers is: "Why should I pay 7% when I can find my own loads?"',
    'Your answer to this question determines whether you sign the driver or lose them.',
    'This document gives you the knowledge and scripts to answer confidently.',
    '',
    '## What the 7% Actually Covers',
    'When a driver pays 7% of their gross they are getting:',
    '1. Load searching -- hours per day on DAT, Truckstop, and direct broker calls',
    '2. Rate negotiation -- brokers pay more to experienced dispatchers who know the market',
    '3. Broker setup -- carrier packet registration with every new broker (ongoing)',
    '4. Rate confirmation review -- catch errors and low rates before the driver picks up',
    '5. Driver instructions -- full pickup and delivery details sent every time',
    '6. Broker communication -- you handle all broker contact during the load',
    '7. Invoice generation -- creating and sending invoices after each delivery',
    '8. POD tracking -- ensuring proof of delivery is collected',
    '9. Relationship building -- your broker relationships generate better rates over time',
    '10. Compliance monitoring -- tracking insurance and CDL expiry dates',
    '',
    '## The Math Argument',
    'Show drivers what 7% costs them vs the value they receive.',
    '',
    'Example with a driver grossing $8,000/month:',
    '- Your fee: $560/month',
    '- Time saved: 2-3 hours per day on load searching and calls = 40-60 hours/month',
    '- That is $9-14/hour for professional business management',
    '',
    'Ask the driver: "What is your time worth to you? If I can find you better loads while you focus on driving, does $560/month make sense?"',
    '',
    '## Comparison to Alternatives',
    '**Factoring fees:** Many factoring companies charge 3-5% per invoice just to advance cash.',
    'You provide 10x more service for 7%.',
    '',
    '**Broker fees:** Brokers charge shippers 15-25% to arrange freight.',
    'You charge 7% of a rate that was already negotiated for the driver.',
    '',
    '**Hiring an employee dispatcher:** Costs $35,000-50,000/year in salary.',
    'At 7%, a driver with $5,000/week gross pays $18,200/year -- and only when actually running.',
    '',
    '## Objection Handling',
    '',
    '**"7% is too high"**',
    '"What rate are you looking for? [listen] My negotiation consistently gets 10-15% more than what self-dispatching drivers get from brokers.',
    'On a $2,000 load that is $200-300 more in your pocket -- which more than covers the 7%.',
    'I am not a cost. I am a net positive."',
    '',
    '**"I have someone who does it for 5%"**',
    '"Fair comparison. The question is not just the percentage -- it is what you are getting.',
    'What does he do for you on rate negotiation? If the service is great, stick with him.',
    'If there are gaps, I can fill them."',
    '',
    '**"I can find my own loads"**',
    '"You absolutely can. The question is: do you want to spend 3 hours a day doing it?',
    'Most drivers I talk to would rather drive and let me handle the desk work.',
    'What does a day on the phone with brokers cost you in miles not driven?"',
    '',
    '**"What if I do not like a load you find?"**',
    '"You approve every load before I book it. I find it, negotiate the rate, and present it to you.',
    'If you say no, I find another one. You are always in the driver seat -- literally."',
    '',
    '**"No contracts, right?"**',
    '"Correct. You can walk away anytime. I work to earn your business every week -- not lock you in."',
    '',
    '## Calculating Driver Take-Home',
    'Example: $2,500 load, 1,000 miles:',
    '- Rate: $2,500',
    '- Dispatch fee (7%): $175',
    '- Driver gross after dispatch: $2,325',
    '- Estimated fuel at 6.5 MPG, $4.50/gallon over 1,000 miles: ~$692',
    '- Driver take-home after fuel and dispatch: ~$1,633',
    '- Net per mile to driver: $1.63/mile on a $2.50/mile load',
  ].join('\n'), null, null, null)

  // ── 118 ── Reading a Rate Confirmation ────────────────────────────────────
  ups.run(118, 'Reading a Rate Confirmation', 'Training', [
    '# Reading a Rate Confirmation',
    '',
    '## What Is a Rate Confirmation?',
    'A rate confirmation (rate con) is the binding legal agreement between the freight broker and your driver (the carrier).',
    'It defines exactly what was agreed: the rate, load details, pickup and delivery terms, and payment terms.',
    'Always review the rate con before sending it to the driver.',
    'Errors in rate cons cause disputes, missed deliveries, and non-payment.',
    '',
    '## Rate Con Fields -- Line by Line',
    '',
    '### Broker Information',
    '- Broker company name, MC number, address, phone',
    '- Verify: MC number should match what you see in your Brokers page',
    '- Note the accounts payable email for invoice submission',
    '',
    '### Carrier Information',
    '- Carrier name, MC number, DOT number',
    '- Truck number, trailer number',
    '- Driver name and cell phone number',
    '- Verify: the MC number on the rate con MUST exactly match your driver\'s actual MC number.',
    '  If it is wrong, call the broker to correct it before the driver picks up.',
    '',
    '### Load Reference Number',
    '- The broker\'s internal ID for this load',
    '- Quote this on every communication with the broker',
    '- Include it on your invoice',
    '',
    '### Pickup Information',
    '- Shipper name, full address, phone number',
    '- Pickup date',
    '- Appointment time or window (e.g., "open pickup 6AM-4PM" or "appointment 10:00 AM")',
    '- Commodity, weight, number of pieces or pallets',
    '- Special instructions: dock number, check-in process, required equipment',
    '',
    '### Delivery Information',
    '- Consignee name, full address, phone number',
    '- Delivery date',
    '- Appointment time or window',
    '- Special instructions',
    '',
    '### Rate and Pay',
    '- Total rate: the number you negotiated -- verify it matches',
    '- Fuel surcharge: listed separately or included in total?',
    '- Accessorials: extra pay for detention, stop-off charges, etc.',
    '',
    '### Payment Terms',
    '- Net-30, Net-15, Net-7, or Quick Pay (with fee %?)',
    '- Invoicing instructions: where to send invoice, required attachments',
    '',
    '## Checklist Before Sending to Driver',
    '1. Driver MC number is correct',
    '2. Pickup address is complete (not just a city)',
    '3. Delivery address is complete',
    '4. Rate matches what you negotiated on the phone',
    '5. Pickup date and appointment are correct',
    '6. Commodity and weight match expectations',
    '7. Payment terms are as agreed',
    '',
    '## Red Flags in a Rate Con',
    '- Rate is lower than what you negotiated: call broker immediately, do not send to driver',
    '- MC number is not your driver\'s number: possible double-brokering -- investigate',
    '- Pickup or delivery is at a truck stop or unverifiable address: investigate before accepting',
    '- Unusual addendums or clauses you did not discuss on the call: dispute before signing',
    '- No broker MC number on the document: do not use this rate con',
    '',
    '## Storing Rate Cons',
    'Keep a copy of every rate con.',
    'If a broker disputes payment or rate, the rate con is your proof.',
    'In OnTrack, note the load reference number in the load record.',
    'Store rate cons in a folder organized by month and year.',
  ].join('\n'), null, null, null)

  // ── 119 ── Driver Communication Standards ─────────────────────────────────
  ups.run(119, 'Driver Communication Standards', 'Policy', [
    '# Driver Communication Standards',
    '',
    '## Why This Matters',
    'Drivers run on trust. A driver who does not hear from their dispatcher when things get complicated will start self-dispatching or find someone else.',
    'Clear, timely communication is the foundation of every driver relationship that lasts.',
    '',
    '## Response Time Standards',
    '',
    '**During business hours (8AM-6PM):**',
    'Respond within 30 minutes maximum. Target: 10 minutes.',
    '',
    '**Evening (6PM-9PM):**',
    'Respond within 1 hour. If you cannot, send a quick acknowledgment:',
    '"Got your message -- will get back to you shortly."',
    '',
    '**After 9PM:**',
    '- Urgent issues (breakdown, accident, delivery problem): respond immediately',
    '- Non-urgent: respond first thing in the morning',
    '',
    'Standard: if a driver wonders whether you received their message, you are too slow.',
    '',
    '## What to Communicate at Load Booking',
    'Every time you book a load, send the driver ALL of the following in one message:',
    '1. Pickup address: full street address',
    '2. Pickup date and appointment time or window',
    '3. Shipper contact name and phone',
    '4. Commodity and weight',
    '5. Delivery address: full street address',
    '6. Delivery date and appointment time or window',
    '7. Consignee contact name and phone (if available)',
    '8. Broker name and load reference number',
    '9. Rate con is coming by email (confirm email address if first booking)',
    '10. Your cell phone number in case of any issues en route',
    '',
    'Do not send partial information and say "more to come." Send everything at once.',
    '',
    '## During Transit',
    'For loads over 400 miles or multi-day hauls:',
    '- Check in with a brief text at least once per day: "Hey [Name], how is everything rolling? On schedule?"',
    '- Acknowledge any driver check-in within 30 minutes',
    '- If you have not heard from a driver in over 24 hours on a multi-day load: call them',
    '',
    '## At Delivery',
    '1. "Great job -- thank you. Please send me a photo of the signed POD."',
    '2. After POD received: "Got it -- I will get your invoice out today."',
    '3. If they are empty and need a load: "Where are you heading? Let me start looking."',
    '',
    '## Tone and Professionalism',
    '- Friendly and direct: no corporate stiffness, but no slang',
    '- Calm under pressure: never panic in front of the driver even when things go wrong',
    '- Solution-focused: lead with what you are working on, not just the problem',
    '- Honest: never tell a driver something will be fine if you do not know that it will be',
    '',
    'If a broker is slow, a load is hard to find, or an invoice is overdue -- tell the driver.',
    'They would rather know than be kept in the dark.',
    '',
    '## What NOT to Do',
    '- Do not go hours without responding during active load issues',
    '- Do not make promises you cannot keep',
    '- Do not discuss other drivers\' business or rates',
    '- Do not vent broker frustrations to drivers',
    '- Do not accept verbal rate agreements without following up with a written rate con',
    '',
    '## Handling Conflict with a Driver',
    '1. Listen fully before responding -- let them finish',
    '2. Acknowledge the concern: "I hear you -- that is frustrating"',
    '3. Respond with facts, not defensiveness',
    '4. Offer a solution or clear path forward',
    '5. If you made an error, own it: "You are right, I should have caught that. Here is what I am going to do."',
    '6. Log the conversation and resolution in driver notes in OnTrack',
    '',
    '## Emergency Communication',
    'For any emergency (breakdown, accident, medical): drop everything and respond.',
    'No callback later -- call immediately.',
    'Stay on the line until the driver is safe and has a clear next step.',
  ].join('\n'), null, null, null)

  // ── 120 ── New Driver Pitch ────────────────────────────────────────────────
  ups.run(120, 'New Driver Pitch - Converting Leads to Signed', 'SOP', [
    '# New Driver Pitch - Converting Leads to Signed',
    '',
    '## Overview',
    'A lead becomes a client when they sign a dispatch agreement and send you their carrier packet.',
    'This document covers the full conversion process from first interest through first load.',
    '',
    '## The Process at a Glance',
    '1. First contact (cold call, Facebook DM, or inbound inquiry)',
    '2. Qualifying call (10-15 minutes)',
    '3. Follow-up as needed',
    '4. Discovery call or recap pitch',
    '5. Send dispatch agreement',
    '6. Collect carrier packet documents',
    '7. Book first load',
    '',
    '## Qualifying the Lead',
    'Before investing heavily, determine quickly:',
    '- Do they have active MC authority? (verify on FMCSA SAFER)',
    '- What equipment do they run? Semi-truck (CDL) or hotshot/pickup with gooseneck or bumper pull (non-CDL) -- both accepted',
    '- Are they currently running? (idle drivers are harder to retain)',
    '- Do they have a dispatcher now? (are they committed elsewhere?)',
    '- What is their minimum RPM? (is it realistic for their lanes?)',
    '- What state are they based in? (strong lane match for your network?)',
    '- For hotshot drivers: confirm combined GVWR is under 26,001 lbs if they say no CDL',
    '',
    '## The Discovery Call',
    '',
    '### Opening (2 min)',
    '"Thanks for making time. I want to learn about your operation first, then tell you exactly how I work, and see if it makes sense. Sound good?"',
    '',
    '### Learn About Them (5 min)',
    '- "How long have you been running your authority?"',
    '- "What lanes do you typically run?"',
    '- "How many trucks do you operate?"',
    '- "What has been your biggest frustration with dispatch or finding loads?"',
    'Listen carefully. Their frustrations are your selling points.',
    '',
    '### Explain Your Service (5 min)',
    '"Here is how I work. I use DAT and direct broker relationships to find you loads.',
    'I negotiate rates -- I typically get 10-15% more than drivers get calling brokers directly.',
    'I handle all the paperwork: rate cons, broker setup, invoicing.',
    'You focus on driving.',
    'My rate is 7% of your gross per load.',
    'No monthly fees, no commitment -- if I am not adding value you can walk away."',
    '',
    '### Close (1 min)',
    '"Based on what you told me I think we would work well together.',
    'The next step is simple -- I send you our dispatch agreement to review.',
    'It is one page, very straightforward.',
    'If it looks good, sign and send back, then send me your carrier packet and we can get your first load moving.',
    'Should I send that over today?"',
    '',
    '## The Dispatch Agreement',
    'Keep it simple. Key terms:',
    '- You are an independent contractor, not an employee',
    '- Dispatch fee: 7% of driver gross per load',
    '- Driver has final approval on all loads -- nothing booked without consent',
    '- Either party may terminate with 7 days written notice (email or text)',
    '- You are not responsible for broker non-payment',
    '- Non-Circumvention: driver may not contact or book directly with any broker you introduced, during or for 12 months after the agreement ends',
    'Send via email. Do not add unnecessary complexity -- it kills deals.',
    '',
    '## Carrier Packet Collection',
    'After the agreement is signed, collect:',
    '1. MC and DOT number (confirm ACTIVE on FMCSA SAFER)',
    '2. Certificate of Insurance -- with OnTrack listed as certificate holder',
    '3. W-9 form',
    '4. Preferred payment method for your invoice (Zelle, ACH, check)',
    'See [[Driver Onboarding Checklist]] for full document details.',
    '',
    '## The First Load -- Make It Count',
    'The first load sets the tone for the entire relationship.',
    '- Pick a load you are confident about: good rate, reliable broker, reasonable distance',
    '- Communicate more than usual -- give the driver every detail',
    '- Check in at pickup, mid-transit, and at delivery',
    '- Invoice the same day or next morning after delivery',
    '- After payment: "How was the experience? Any feedback?"',
    '',
    'A driver who has a great first load experience will refer other drivers to you.',
    'Word of mouth is your best and cheapest marketing.',
    '',
    '## What Makes Drivers Stay Long-Term',
    '- Consistent load volume: drivers who sit too long will find another dispatcher',
    '- Strong rates: they compare what they earn with you vs what they see on the boards',
    '- Fast response time: they need to reach you and get answers quickly',
    '- No surprises: every rate con, every delivery, handled cleanly and professionally',
    '- You treat them like a business partner, not a number',
  ].join('\n'), null, null, null)

  // ── 121 ── Driver Onboarding Email Template ────────────────────────────────
  ups.run(121, 'Driver Onboarding Email Template', 'Template', [
    '# Driver Onboarding Email Template',
    '',
    '## When to Use',
    'Send this email immediately after a lead is marked Signed and you have collected their carrier packet.',
    'Personalize the bracketed fields before sending.',
    '',
    '## Related Documents',
    'See [[Driver Onboarding Checklist]] for the full document collection process.',
    'See [[Signed Driver Onboarding Workflow]] for the step-by-step process after this email.',
    'See [[Driver Communication Standards]] for ongoing communication guidelines.',
    '',
    '---',
    '',
    '## Email Template',
    '',
    'Subject: Welcome to OnTrack Hauling Solutions -- Here Is What Happens Next',
    '',
    'Hi [Driver Name],',
    '',
    'Welcome to OnTrack Hauling Solutions. I am glad to have you on board.',
    '',
    'Here is a quick overview of how we work together so we start on the same page.',
    '',
    '**Your dispatch agreement is active.** My fee is 7% of your gross per load, charged after each delivery.',
    '',
    '**How load offers work:**',
    'When I find a load that fits your lanes, equipment, and rate requirements I will call or text you with the details before accepting anything.',
    'You always have the final say. I never book a load without your approval.',
    '',
    '**What I handle for you:**',
    '- Searching load boards and calling brokers daily',
    '- Negotiating rates -- I work to get you above the posted rate whenever possible',
    '- Sending and reviewing rate confirmations',
    '- Submitting carrier packets to new brokers on your behalf',
    '- Following up on delivered loads and PODs',
    '',
    '**What I need from you:**',
    '- Availability updates -- let me know when you are free and where you are',
    '- Quick responses to load offers -- freight moves fast and brokers do not wait',
    '- POD photos or scans within 24 hours of delivery',
    '- A heads-up if anything changes: breakdowns, delays, location updates',
    '',
    '**First load:**',
    'I will start searching for your first load now.',
    'I will call you with options -- usually within 1 to 2 business days depending on your location and lanes.',
    '',
    'If you have any questions about how anything works, call or text me any time.',
    '',
    'Looking forward to working with you.',
    '',
    'Best,',
    'Chris Hooks',
    'OnTrack Hauling Solutions',
    'dispatch@ontrackhaulingsolutions.com',
    '[Phone Number]',
  ].join('\n'), null, null, null)

  // ── 122 ── Signed Driver Onboarding Workflow ───────────────────────────────
  // ── 123 ── First-Run Setup Guide ───────────────────────────────────────────
  ups.run(123, 'First-Run Setup Guide', 'SOP', [
    '# First-Run Setup Guide',
    '',
    'Complete these steps before entering real data or running imports.',
    '',
    '## 1. Business Information',
    'Settings > Business Information',
    'Fill in company name, owner name, email, and default dispatch percentage.',
    'This information appears on invoices and outreach templates.',
    '',
    '## 2. FMCSA Web Key',
    'Settings > Integrations',
    'Add your QCMobile API key (the FMCSA Web Key field).',
    'Without this key the FMCSA lead import will not run.',
    '',
    '## 3. Claude API Key',
    'Settings > AI Integration',
    'Add your Claude API key.',
    'Without this key the Facebook Agents AI buttons will not work.',
    'The rest of the app works without it.',
    '',
    '## 4. Remove Sample Data',
    'Settings > Setup',
    '1. Click Remove Sample Data and confirm.',
    '2. Click Load Task Templates to seed the daily checklist.',
    '3. Click Rebuild Document Library to load all 20 SOPs.',
    'Do this before adding real records.',
    '',
    '## 5. First FMCSA Import',
    'Leads > Import FMCSA Leads',
    'Click Import FMCSA Leads to pull carriers with new MC authority into your pipeline.',
    'Expected result: 20-100 new leads on first run.',
    '',
    '## Before You Begin Real Work',
    '- Business information filled in',
    '- FMCSA key entered',
    '- Claude API key entered',
    '- Sample data removed',
    '- Task templates loaded',
    '- Document library built',
    '- First FMCSA import completed',
    '- At least one Facebook group added (Marketing > Groups > Add Group)',
  ].join('\n'), null, null, null)

  ups.run(122, 'Signed Driver Onboarding Workflow', 'SOP', [
    '# Signed Driver Onboarding Workflow',
    '',
    '## Purpose',
    'Step-by-step process to follow once a lead is marked Signed.',
    'Covers everything from document collection through the driver\'s first load.',
    '',
    '## Related Documents',
    '- [[Driver Onboarding Checklist]] -- required documents and setup in OnTrack',
    '- [[Driver Onboarding Email Template]] -- welcome email to send after signing',
    '- [[Load Booking SOP]] -- how to find and book the first load',
    '- [[New Driver Pitch - Converting Leads to Signed]] -- where this lead came from',
    '- [[Driver Communication Standards]] -- communication approach going forward',
    '- [[Daily Dispatch Routine]] -- the recurring workflow once driver is active',
    '',
    '---',
    '',
    '## Step 1 -- Update Lead Status (Immediate)',
    '1. Open the lead in the Leads page.',
    '2. Change status from Interested to Signed.',
    '3. Add a note with the date and how the agreement was sent (email, text, DocuSign).',
    '4. Set follow-up date to today -- you have work to do.',
    '',
    '## Step 2 -- Collect the Carrier Packet (Same Day)',
    'Ask the driver to send you the following. Reference [[Driver Onboarding Checklist]] for full details.',
    '- CDL (both sides) -- CDL drivers only. Non-CDL hotshot drivers: standard driver\'s license copy is sufficient if combined GVWR is under 26,001 lbs',
    '- Certificate of Insurance (COI) with OnTrack listed as certificate holder',
    '- W-9',
    '- Signed dispatch agreement (if not already received)',
    '',
    'If they need help with the COI: tell them to call their insurance agent and say',
    '"I need to add a certificate holder. Company name: OnTrack Hauling Solutions."',
    'This usually takes 24-48 hours.',
    '',
    '## Step 3 -- Verify MC Authority',
    'Go to safer.fmcsa.dot.gov and search by MC number. Confirm:',
    '- Status is ACTIVE',
    '- Operation classification: Authorized For-Hire',
    '- Insurance on file and current',
    '- No out-of-service orders',
    'Do not proceed to Step 4 until authority is verified.',
    '',
    '## Step 4 -- Create Driver Record in OnTrack',
    '1. Drivers > New Driver.',
    '2. Fill in all fields: name, company, MC, DOT, phone, email.',
    '3. Set truck type, trailer type, trailer length, home base, preferred lanes, minimum RPM.',
    '4. Set dispatch percentage (default 7%).',
    '5. Enter CDL expiry date (CDL drivers) or note "Non-CDL Hotshot" in the CDL field. Enter insurance expiry date.',
    '6. Upload documents in the driver profile Documents tab.',
    '7. Set driver status to Active.',
    '',
    '## Step 5 -- Send the Welcome Email',
    'Send the [[Driver Onboarding Email Template]] to the driver.',
    'Personalize the name and phone number fields.',
    'Send from dispatch@ontrackhaulingsolutions.com.',
    '',
    '## Step 6 -- Register With Key Brokers (if new broker needed)',
    'Most major brokers require a carrier packet before booking a first load.',
    'If you have not already registered with brokers in the driver\'s lane:',
    '1. Identify 3-5 active brokers in the driver\'s lane (use the Brokers page).',
    '2. Submit carrier packets -- MC, DOT, COI, W-9, signed broker-carrier agreement.',
    '3. Most approvals take 1-2 business days.',
    '',
    '## Step 7 -- Find and Book the First Load',
    'See [[Load Booking SOP]] for the full booking process.',
    'For the first load, prioritize:',
    '- Shorter haul (under 600 miles) -- easier to manage on day one',
    '- Broker with Preferred or None flag -- do not start a relationship with a Slow Pay broker',
    '- Lane the driver has experience in -- reduces first-load stress',
    '- Rate at or above driver minimum RPM',
    '',
    '## Step 8 -- Post-First-Load Debrief',
    'After the first delivery:',
    '- Call the driver: how was the broker? Any issues with the pickup or delivery?',
    '- Did they receive the rate con on time? Was communication clear?',
    '- Ask: is there anything about how we work together you would change?',
    'Log their feedback in driver notes.',
    '',
    '## Non-Circumvention -- What the Driver Needs to Know',
    'The dispatch agreement includes a Non-Circumvention clause. Make sure the driver understands it:',
    '- Any broker introduced by OnTrack through this relationship cannot be contacted directly by the driver for dispatch purposes during or for 12 months after the agreement ends',
    '- Brokers the driver had a prior relationship with before signing are not restricted -- document any pre-existing relationships in the driver\'s notes at onboarding',
    '- Violation results in liquidated damages equal to 7% of all loads booked directly with the circumvented broker during the restriction period',
    'If a driver has existing broker relationships, log them in driver notes now so there is a clear record.',
    '',
    '## Timeline Summary',
    '- Day 0 (Signed): update Lead status, collect carrier packet, send welcome email',
    '- Day 1-2: verify authority, create driver record in OnTrack, log any pre-existing broker relationships',
    '- Day 2-3: register with brokers if needed',
    '- Day 3-5: book first load',
    '- After first delivery: debrief, confirm communication setup, begin regular dispatch rhythm',
  ].join('\n'), null, null, null)

  // ── 124 ── Prospect Introduction Email Template ─────────────────────────────
  ups.run(124, 'Prospect Introduction Email Template', 'Template', [
    '# Prospect Introduction Email Template',
    '',
    '## When to Use',
    'Send this email when a lead asks you to send information during or after a cold call.',
    'Send it within 10 minutes of hanging up while you are fresh in their mind.',
    'After sending, mark the lead Contacted and set a follow-up date 2 days out.',
    '',
    '## Related Documents',
    'See [[Cold Call Script -- First Driver Contact]] for the call that precedes this email.',
    'See [[Warm Lead Follow-Up Script]] for the follow-up call if they do not respond.',
    'See [[Explaining Your Dispatch Fee -- Driver Conversations]] for fee objection handling.',
    '',
    '---',
    '',
    '## Email Template',
    '',
    'Subject: OnTrack Hauling Solutions -- Dispatch Services Overview',
    '',
    'Hi [Driver Name],',
    '',
    'Great speaking with you. Here is a quick overview of what I offer.',
    '',
    'I am an independent freight dispatcher working with owner-operators to find loads, negotiate rates, and handle all broker paperwork. My fee is 7% per load, charged only when I book a load for you. No monthly fees, nothing upfront.',
    '',
    'What I do for you:',
    '- Search load boards and call brokers daily for loads that fit your lanes and equipment',
    '- Negotiate rates above the posted price whenever possible',
    '- Send and review rate confirmations before you commit to anything',
    '- Handle carrier packet submissions to new brokers on your behalf',
    '- Follow up on PODs and delivered loads',
    '',
    'You keep full control -- I never book a load without your approval.',
    '',
    'If this sounds like a fit, give me a call and we can go over the details. Takes about 15 minutes.',
    '',
    'Best,',
    'Chris Hooks',
    'OnTrack Hauling Solutions',
    'dispatch@ontrackhaulingsolutions.com',
    '[Your Phone Number]',
    '',
    '---',
    '',
    '## After Sending',
    '- Mark lead status: Contacted',
    '- Add a note: "Sent intro email [date]"',
    '- Set follow-up date: 2 days from today',
    '- If no reply in 2 days: call again using the [[Warm Lead Follow-Up Script]]',
  ].join('\n'), null, null, null)

  // ── 125 ── W-9 Form (Blank) ────────────────────────────────────────────────
  ups.run(125, 'W-9 Form (Blank)', 'Template', [
    '# W-9 Form -- Blank (Request for Taxpayer Identification)',
    '',
    '## What It Is',
    'IRS Form W-9 is used to collect a driver\'s name, business name, address, and Taxpayer Identification Number (TIN or SSN/EIN). You are required to keep a signed W-9 on file for every driver you dispatch. At year end, if you pay a driver $600 or more, you use the W-9 information to issue a 1099-NEC.',
    '',
    '## When to Collect It',
    'Collect a signed W-9 before the first dispatched load. Do not dispatch any driver without a W-9 on file.',
    '',
    '## Where the File Is',
    'A blank, printable W-9 PDF is saved in your app folder. Click the link below to open it:',
    '[Open W-9 Blank PDF](resources/templates/W-9_Blank.pdf)',
    '',
    'Send it to the driver as an email attachment during onboarding. Ask them to fill it out, sign it, and return it before you book their first load.',
    '',
    '## What to Do With It',
    '- Keep the completed form on file (do not send to IRS)',
    '- Upload a copy to the driver\'s profile under Documents',
    '- Use the TIN/SSN at year end to prepare 1099-NEC forms for drivers earning $600+',
    '',
    '## Common Driver Questions',
    '- "Why do you need my SSN?" -- Required by IRS for 1099 reporting at year end.',
    '- "What if I have an LLC?" -- Use their EIN instead of SSN. Both are acceptable.',
    '- "Will you share my info?" -- W-9 information is kept confidential and used only for tax reporting.',
    '',
    '## Related Documents',
    'See [[Driver Onboarding Checklist]] for the full list of required onboarding documents.',
  ].join('\n'), null, null, null)

  // ── 126 ── Dispatch Agreement ──────────────────────────────────────────────
  ups.run(126, 'Dispatch Agreement (OnTrack)', 'Template', [
    '# Dispatch Services Agreement -- OnTrack Hauling Solutions LLC',
    '',
    '## Purpose',
    'This is the binding agreement between OnTrack Hauling Solutions LLC and each driver before dispatch services begin. Both parties must sign before the first load is booked. Click the link below to open the PDF:',
    '[Open Dispatch Agreement PDF](resources/templates/Dispatch_Agreement_OnTrack.pdf)',
    '',
    'Attach the PDF to the driver onboarding email. Collect the signed copy before booking load one.',
    '',
    '## Key Terms Summary',
    '',
    '### Relationship of the Parties',
    'OnTrack is an independent contractor, not an employee or freight broker. OnTrack does not hold broker authority and does not take possession of freight. The driver (Carrier) retains full control of their operations.',
    '',
    '### Scope of Services',
    'OnTrack will search load boards, negotiate rates with brokers, relay rate confirmations and pickup instructions, maintain load records, and assist with carrier packet submissions -- all on the driver\'s behalf.',
    '',
    '### Load Acceptance',
    'The driver has sole authority to accept or decline any load. OnTrack will never book a load without the driver\'s explicit confirmation.',
    '',
    '### Dispatch Fee',
    '7% of the driver\'s gross revenue per dispatched load, calculated from the total rate on the rate confirmation. Fee does not include fuel surcharges, detention, or accessorial charges unless agreed in writing.',
    '',
    '### Payment Terms',
    'Invoiced upon POD confirmation after each delivered load. Payment due within 7 days of invoice by Zelle, ACH, or check payable to OnTrack Hauling Solutions LLC. Late balances may be subject to a 1.5% monthly fee after 30 days.',
    '',
    '### Carrier Responsibilities',
    '- Active MC authority and USDOT number in good standing',
    '- Current commercial insurance (minimum $750K liability, $100K cargo)',
    '- Certificate of Insurance with OnTrack named as Certificate Holder',
    '- Signed W-9 on file before first load',
    '- Prompt communication on load status, delays, breakdowns',
    '',
    '### Non-Exclusivity',
    'Neither party is exclusive. The driver may use other dispatchers or book independently. OnTrack may serve other carriers simultaneously.',
    '',
    '### Termination',
    'Either party may cancel with 7 days written notice (email or text). Outstanding fees for delivered loads remain due after termination. OnTrack may terminate immediately for non-payment, lapsed authority, expired insurance, or fraud.',
    '',
    '### Non-Circumvention',
    'Carrier may not contact, solicit, or do business directly with any broker or freight source introduced by OnTrack during or within 12 months after this Agreement ends. Brokers the driver had a pre-existing relationship with before this Agreement are excluded. Violation entitles OnTrack to liquidated damages equal to the dispatch fees that would have been earned on loads booked directly with the circumvented broker during the restriction period.',
    '',
    '## Related Documents',
    'See [[Driver Onboarding Checklist]] for full onboarding workflow.',
    'See [[Driver Onboarding Email Template]] for the email to send with this agreement.',
  ].join('\n'), null, null, null)

  // ── 127 ── New Authority Driver Expectations ──────────────────────────────
  ups.run(127, 'New Authority Driver Expectations', 'New Authority', [
    '# New Authority Driver Expectations',
    '',
    '## Purpose',
    'Set accurate, honest expectations with every new authority driver before the first load is dispatched. Drivers who understand the reality of new authority freight stay motivated and trust the process. Drivers who are surprised by the difficulty quit early.',
    '',
    '## The Reality of New Authority Freight',
    'Most load boards and brokers impose age restrictions on new MC authority. A carrier with less than 30 days of authority may be declined by 80-90% of brokers on a given day. This is normal and expected. It does not reflect the quality of the driver or dispatcher -- it is simply how the industry works during the first 30-90 days.',
    '',
    'Typical broker acceptance thresholds:',
    '- Under 30 days: very few brokers available; focus on spot market calls and broker relationship building',
    '- 30-60 days: moderate access; some load boards open up; broker calls become more productive',
    '- 60-90 days: meaningful improvement; most standard dry van and flatbed brokers accessible',
    '- 90+ days: near-normal access for most freight types',
    '',
    '## What to Tell the Driver',
    'Have this conversation before the first dispatch attempt:',
    '',
    '"Your authority is less than [X] days old. That means a lot of brokers will not work with us yet -- that is completely normal and has nothing to do with your reputation or mine. We are going to hustle hard, make a lot of calls, and build relationships with the brokers who will work with new authorities. Every week that passes, more doors open. The first 30-90 days are the hardest. After that, this gets significantly easier."',
    '',
    '## Daily Commitment Required',
    'New authority dispatching is not passive. It requires:',
    '- Pulling load boards every 1-2 hours throughout the business day',
    '- Calling 20-40 brokers per day, including cold outreach',
    '- Asking every broker whether they work with new authorities and documenting the answer',
    '- Following up with any broker who said "not yet" -- they may change their policy at 30 or 60 days',
    '',
    'Make sure the driver understands that loads may not come in as fast as a seasoned carrier. Encourage them to stay patient, stay available, and communicate daily.',
    '',
    '## Driver Responsibilities During New Authority Period',
    '- Stay reachable during business hours (7am-6pm local time minimum)',
    '- Accept loads in their equipment range even if slightly below their preferred RPM -- building a delivery record is more valuable than holding out for top rates right now',
    '- Reply to rate confirmations within 30 minutes when possible -- brokers who work with new authorities are doing the driver a favor and they remember slow responses',
    '- Keep insurance and authority documents current -- a lapsed certificate during new authority period is very difficult to recover from',
    '',
    '## Red Flags to Watch For',
    '- Driver goes silent for more than 24 hours during a load search -- reach out proactively',
    '- Driver starts booking loads directly with brokers OnTrack introduced -- this violates the Non-Circumvention clause; document and address immediately',
    '- Driver becomes frustrated after 2-3 days without a load -- schedule a call, reassure them, review what brokers are currently accessible',
    '- Driver demands rates that no new-authority broker will pay -- have a direct conversation about market reality',
    '',
    '## Communication Script for Slow Days',
    '"Hey [Driver], I have been working the phones and the boards today. Most brokers I am reaching are requiring 30+ days on authority and we are at [X] days. I have a list of brokers who will work with us and I am keeping after them. I expect we will have something lined up by [timeframe]. Stay ready and I will keep you posted every few hours."',
    '',
    '## Tracking Progress',
    'Log every broker call in the Broker section of OnTrack. Note whether they work with new authorities and what their minimum age requirement is. This data becomes the foundation for faster dispatching as authority age increases.',
    '',
    '## Related Documents',
    'See [[Building Broker Relationships for New Authorities]] for the broker outreach strategy.',
    'See [[New Authority Daily Load Workflow]] for the day-to-day dispatch process.',
  ].join('\n'), null, null, null)

  // ── 128 ── Building Broker Relationships for New Authorities ───────────────
  ups.run(128, 'Building Broker Relationships for New Authorities', 'New Authority', [
    '# Building Broker Relationships for New Authorities',
    '',
    '## Purpose',
    'Identify, qualify, and build lasting relationships with brokers who will work with new authority carriers. The goal is to create a reliable short list of broker contacts who know OnTrack by name and will take calls before posting loads publicly.',
    '',
    '## Finding New-Authority-Friendly Brokers',
    '',
    '### Load Board Filtering',
    'On DAT and Truckstop, filter by equipment type and origin/destination. Call every broker on a load that looks like a reasonable match. Do not skip brokers just because the load rate seems low -- the first call is about qualifying whether they work with new authorities, not just booking that specific load.',
    '',
    '### Direct Cold Outreach',
    'Smaller regional brokers and freight brokerages that specialize in flatbed, construction, or agriculture freight tend to be more flexible with new authorities than large national 3PLs. Search LinkedIn and Google for freight brokers in your driver\'s preferred lanes and call them directly.',
    '',
    '### Ask Other Dispatchers',
    'Dispatcher Facebook groups and forums often contain threads about new-authority-friendly brokers. Search "new authority" in those groups and note any names that come up repeatedly.',
    '',
    '## Qualifying Call Script',
    '"Hi, this is Chris with OnTrack Hauling Solutions. I am a dispatcher calling on behalf of one of my owner-operators. I wanted to ask -- do you work with new authorities? Our carrier has been active for [X] days. We have a [truck type] available out of [location] and I wanted to know if you have freight in that lane and if there is a chance we could work together."',
    '',
    'If they say yes: "Great. What is your minimum authority age requirement? I want to make sure I am not wasting your time if we are not there yet." Then log it in OnTrack.',
    '',
    'If they say no: "Understood. How long do you typically require? I will follow up when we hit that mark." Log the date and set a reminder.',
    '',
    '## Logging Broker Contacts in OnTrack',
    'Every broker called should be added to the Brokers section with:',
    '- "Works With New Auth" set to Yes or No',
    '- Minimum authority age filled in if applicable',
    '- Notes field used to record the contact person\'s name and any load types or lanes they mentioned',
    '',
    'This creates a working database that gets more valuable every week. When authority age increases, the "No" brokers become prospects again.',
    '',
    '## Relationship Building Tactics',
    '',
    '### Follow Up Consistently',
    'If a broker said they need 30 days and you are at 15, call them back on day 28. Say: "Hi, this is Chris from OnTrack. I spoke with you a couple weeks ago about our new authority carrier. We are coming up on 30 days this week and I wanted to check back in. Do you have anything available in [lane]?"',
    '',
    '### Be Professional Every Call',
    'Brokers remember dispatchers who are organized, brief, and easy to work with. Always have the driver\'s information ready: MC number, DOT, equipment type, current location, and availability. Do not put a broker on hold to look up information.',
    '',
    '### Send a Carrier Packet Proactively',
    'When a broker shows interest but is not ready to book yet, offer to send the carrier packet in advance. Say: "I can send the carrier packet now so when we are ready to book, there is no delay on your end." This signals professionalism and speeds up the first booking.',
    '',
    '### Express Lanes vs. New Lanes',
    'New authority carriers are more likely to get loaded quickly in lanes that are currently tight on capacity. Pay attention to load-to-truck ratios on the boards. When a broker\'s freight is sitting and they are struggling to cover it, they are more flexible about authority age.',
    '',
    '## Broker Categories to Prioritize',
    '- Regional produce and agriculture brokers (often more relationship-based)',
    '- Construction material and equipment brokers (flatbed and hotshot friendly)',
    '- Oil field and energy freight brokers in TX, ND, OK (active hotshot market)',
    '- Small and mid-size 3PLs with 5-50 employees (more decision-making flexibility than large nationals)',
    '',
    '## What Not to Do',
    '- Do not misrepresent the authority age -- it will be verified and it will end the relationship permanently',
    '- Do not call the same broker multiple times in one day -- once is fine, follow up the next business day',
    '- Do not bad-mouth brokers who say no to new authorities -- this is policy, not personal',
    '',
    '## Related Documents',
    'See [[New Authority Driver Expectations]] for the driver-facing side of this process.',
    'See [[New Authority Daily Load Workflow]] for the daily operational routine.',
  ].join('\n'), null, null, null)

  // ── 129 ── New Authority Daily Load Workflow ───────────────────────────────
  ups.run(129, 'New Authority Daily Load Workflow', 'New Authority', [
    '# New Authority Daily Load Workflow',
    '',
    '## Purpose',
    'A structured daily routine for dispatching new authority carriers. New authority dispatching requires significantly more active effort than established carrier dispatching. This workflow keeps the process organized and maximizes the chances of getting loads booked.',
    '',
    '## Before the Day Starts',
    '- Confirm driver is available and truck is ready',
    '- Note driver\'s current location and desired destination or lane',
    '- Pull up OnTrack broker list -- filter to brokers marked as working with new authorities',
    '- Review any broker follow-ups from the previous day',
    '',
    '## Morning Block (7:00 AM - 10:00 AM)',
    '',
    '### 7:00 AM -- First Board Pull',
    'Open DAT, Truckstop, and any other subscribed boards. Search for loads matching:',
    '- Driver\'s equipment type and trailer length',
    '- Origin within reasonable deadhead of current location',
    '- Destination in a preferred or workable lane',
    '',
    'Call every broker on a matching load, even if the posted rate is lower than target RPM. New authority carriers sometimes need to accept one or two below-target loads to build a delivery record and establish broker relationships.',
    '',
    '### 7:30 AM - 10:00 AM -- Morning Broker Call Block',
    'Target: 10-15 broker calls before 10 AM.',
    '',
    'Call order:',
    '1. Brokers from OnTrack list who have previously confirmed they work with new authorities',
    '2. Brokers on current load postings that match driver equipment',
    '3. Cold outreach to new brokers not yet in the system',
    '',
    'Script: "Hi, this is Chris at OnTrack Hauling Solutions. I have a [truck type] available out of [city, state] today, looking to go [direction or city]. Do you have anything available that might work? Just so you know upfront, our authority is [X] days old -- I want to be transparent."',
    '',
    'Log every call in OnTrack Brokers section. Note: name of contact, whether they work with new auth, any load discussed, and whether to follow up.',
    '',
    '## Midday Block (10:00 AM - 1:00 PM)',
    '',
    '### 10:00 AM -- Board Refresh',
    'New loads post throughout the morning. Pull boards again and work any new matches. Rates sometimes improve midday as brokers try to cover loads before end of business.',
    '',
    '### 10:30 AM - 12:30 PM -- Second Broker Call Block',
    'Target: 10-15 additional calls.',
    '',
    'Prioritize:',
    '- Brokers who showed interest this morning but did not have matching freight',
    '- Brokers who indicated they might have something later in the day',
    '- Any brokers flagged for follow-up from previous days',
    '',
    '### 12:30 PM -- Driver Check-In',
    'Touch base with the driver. Give them an honest update: how many calls have been made, what responses you have received, any leads that may materialize. If no load is booked by noon, reassure them and set expectations for the afternoon.',
    '',
    '## Afternoon Block (1:00 PM - 5:00 PM)',
    '',
    '### 1:00 PM -- Board Refresh',
    'Afternoon is when many brokers post loads for next-day pickup. This is often the most productive posting window. Pull boards and work new matches aggressively.',
    '',
    '### 1:30 PM - 4:00 PM -- Third Broker Call Block',
    'Target: 10-15 calls.',
    '',
    'Focus on next-day loads if same-day is not materializing. A load that picks up tomorrow is better than holding out for a same-day load that may not come.',
    '',
    '### 4:00 PM -- Final Board Pull',
    'Some brokers post urgent loads late afternoon. Quick pull and call any new matches. Rates on late-afternoon loads are sometimes negotiable upward since the broker needs same-day coverage.',
    '',
    '### 4:30 PM -- End of Day Summary to Driver',
    'Message or call the driver with a clear summary: loads explored, any leads for tomorrow, board conditions in their lane, and expected next steps. Never go silent at end of day -- drivers lose confidence when they stop hearing from their dispatcher.',
    '',
    '## Total Daily Target',
    '- Board pulls: minimum 4 (7am, 10am, 1pm, 4pm)',
    '- Broker calls: 20-40 total across all blocks',
    '- New brokers added to OnTrack database: at least 3-5 per day',
    '- Driver updates: minimum 2 (midday and end of day)',
    '',
    '## If No Load Books After Two Days',
    '1. Review driver current location -- may need to reposition to a larger freight market',
    '2. Review RPM floor -- confirm driver is open to below-target rates temporarily',
    '3. Review equipment type -- confirm trailer is properly listed in carrier packet',
    '4. Call brokers who said no at day 1 -- some restrictions are based on a per-load decision, not a hard policy',
    '5. Post in dispatcher Facebook groups asking for new-authority-friendly broker referrals',
    '',
    '## Tracking Calls and Contacts',
    'Use the OnTrack Broker section to log every broker contacted. The Notes field on each broker record should capture:',
    '- Contact name at that brokerage',
    '- Date last called',
    '- Outcome of the call',
    '- Whether to call back and when',
    '',
    'Over time this list becomes a reliable resource. When a similar new authority driver signs in the future, the list is already built.',
    '',
    '## Related Documents',
    'See [[New Authority Driver Expectations]] for the driver communication strategy.',
    'See [[Building Broker Relationships for New Authorities]] for broker outreach tactics.',
  ].join('\n'), null, null, null)

  // ── 130 ── Facebook Group Post Protocol ───────────────────────────────────
  ups.run(130, 'Facebook Group Post Protocol', 'SOP', [
    '# Facebook Group Post Protocol',
    '',
    '## Purpose',
    'Rules and procedures for posting in Facebook groups to recruit owner-operator drivers. Following this protocol keeps OnTrack visible and credible while avoiding bans, spam flags, and wasted effort.',
    '',
    '## Which Groups to Post In',
    'Post only in groups where owner-operators are active members. The app shows today\'s recommended groups in Marketing > Groups > Today\'s Groups panel.',
    '',
    'Do not post in:',
    '- Groups with fewer than 500 members unless you know the group is highly active',
    '- Groups that are clearly for shippers, brokers, or non-drivers',
    '- Groups that have been flagged as low-response in your tracking',
    '',
    '## Daily Post Limit',
    'Target: post in 5 groups per day, minimum 3.',
    'Do not post in the same group more than once every 48 hours -- Facebook flags this as spam.',
    'After posting in a group, mark it as posted in the app (Marketing > Groups > Mark Posted).',
    '',
    '## What to Post',
    '',
    '### Use the App Templates',
    'Go to Marketing > Templates tab. Choose a template that fits today\'s focus.',
    'Categories available: Hotshot, Dry Van, Reefer, Flatbed, Step Deck, Driver Recruitment, Value Prop.',
    '',
    '### Vary the Content Daily',
    'Do not copy and paste the exact same post into multiple groups on the same day.',
    'Use the Short Post toggle for groups where shorter posts tend to get more replies.',
    'Change at least 1-2 sentences between each group -- the opening line is enough.',
    '',
    '### Post Format Rules',
    '- Write in plain sentences. No bullet points with dashes or symbols.',
    '- No emojis.',
    '- Keep standard posts under 150 words.',
    '- Short posts: 2-3 sentences only.',
    '- End with a simple call to action: "Send me a message" or "Comment below."',
    '- Never include a phone number in a public post -- use DMs for that.',
    '',
    '## After Posting',
    '1. Stay logged in to Facebook for at least 30 minutes after posting.',
    '2. If anyone comments within the first hour, reply immediately -- this boosts the post in the algorithm.',
    '3. Do not reply to comments with a phone number or personal information -- move the conversation to DM.',
    '4. Log any qualified commenters or DMs as new Leads in the app.',
    '',
    '## Algorithm Training (separate from posting)',
    'After posting, spend 5-10 minutes liking, commenting, and reacting to other posts in the same group.',
    'This trains Facebook to show your future posts to more group members.',
    'See: [[Facebook Algorithm Training]] task for the daily engagement checklist.',
    '',
    '## Group Etiquette',
    '- Do not comment on other dispatcher posts criticizing their rates or services.',
    '- Do not post the same exact text in a group you already posted in this week.',
    '- If a group admin messages you about a post, respond politely and adjust.',
    '- If a group bans you: remove it from your active groups list in Marketing > Groups.',
    '',
    '## Tracking What Works',
    'After each posting session, note in your daily summary:',
    '- Which groups you posted in',
    '- How many comments or DMs each post received',
    '- Whether the short or long format got better responses today',
    'Over time this data helps you focus on the groups and formats that convert.',
    '',
    '## Related Documents',
    'See [[Facebook Driver Search SOP]] for the full driver search workflow.',
    'See [[Facebook Post Script Bank]] for post templates and DM response scripts.',
    'See [[How to Update Facebook Groups]] for adding and managing your group list.',
  ].join('\n'), null, null, null)

  // Set file_path on the template PDFs so the Open PDF button works in Documents
  db.prepare("UPDATE documents SET file_path = 'resources/templates/W-9_Blank.pdf' WHERE id = 125").run()
  db.prepare("UPDATE documents SET file_path = 'resources/templates/Dispatch_Agreement_OnTrack.pdf' WHERE id = 126").run()
}
