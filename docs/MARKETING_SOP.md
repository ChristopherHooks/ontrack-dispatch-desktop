# Marketing Tab — Daily SOP

**Purpose:** Get your daily driver outreach posts done in under 10 minutes.

---

## Daily Workflow

1. Open the Marketing tab.
2. Check the **Today's Checklist** at the top. Five tasks. Work through them.
3. Look at the **Suggested Post** card. This is your primary post for the day.
4. Copy the post text, paste into Facebook (or your platform of choice).
5. Hit **Mark as Used** after posting. A quick log form appears — fill in which groups you posted to, any replies, any leads. Takes 30 seconds.
6. Repeat for a second post type if you have time (use the category filter to switch from Hotshot to Dry Van, etc.).
7. In the **Suggested Groups** panel, mark groups as posted as you go.

That is the full workflow. Everything else is optional detail work.

---

## How Suggested Posts Are Chosen

The system scores every template before showing one:

- Templates not used in the last 14 days score higher.
- Templates with a lower total use count score higher.
- The highest-scoring template is shown first.

If everything has been used recently, the least-recently-used template is picked. The same post will not repeat for at least two weeks under normal daily use.

The **category filter** (Hotshot, Dry Van, Reefer, etc.) narrows selection to that truck type. Use it when you want to target a specific audience that day.

---

## Generating Another Variation

**New Variation** swaps the opening line and call-to-action for the current template using a small bank of alternatives. The body of the post stays the same.

**Skip** moves to the next highest-scored template without logging anything.

If you want a completely different template, use the category filter or click Skip a few times.

---

## How Repetition Is Prevented

Every time you hit **Mark as Used**, the system records the template ID and date in the `marketing_post_log` table. The next time the app selects a suggested post, it pulls the last 14 days of used template IDs and deprioritizes them in the scoring. High use counts also reduce a template's score over time.

You can see the full history in the **Post History** tab.

---

## Adding and Managing Groups

Go to the **Groups** tab.

To add a group:
- Click **Add Group**.
- Enter the name, URL (optional), platform, and truck type tags.
- Truck type tags control which posts the group appears for in the Suggested Groups panel. Leave blank to appear for all post types.

To edit a group, click the edit (pencil) icon on the row. You can update name, URL, platform, truck type tags, and toggle it active or inactive.

Inactive groups are hidden from suggestions but kept in the list.

**Mark Posted** on a group updates the last-posted date to today. The Suggested Groups panel uses this date to deprioritize groups you posted to recently.

---

## Logging Post Outcomes

After clicking **Mark as Used**, the log form appears. Fill in:
- Which groups you posted to (checkboxes from your group list)
- Whether it was actually posted
- Reply count and leads generated
- Any notes

You can also review and delete log entries in the **Post History** tab.

---

## Image Support

Every suggested post displays an **Image prompt** link below the post text. Click it to expand a copy-ready prompt for any AI image generator (Midjourney, DALL-E, Leonardo AI, etc.).

The prompt is matched to the truck type and tone of the post. Copy it, paste into your image tool, download the result, and attach it to your social post.

There is no automatic image generation in the app. The prompts are designed to produce usable results with one generation — no elaborate prompt engineering needed.

---

## All Templates

The **All Templates** tab shows all 78 templates with use counts and a "recent" flag. You can copy any template directly or click **Use** to load it as the current suggestion.

---

## Outreach Engine (zero AI cost)

The **Outreach Engine** tab generates a full day's Facebook outreach in one click — 5 group posts and 1 business page post — with no AI call, no credits spent.

### Daily workflow using the Outreach Engine

1. Go to Marketing > Outreach Engine tab.
2. Set your targeting for today:
   - **Driver type**: pick the audience you are targeting (Hotshot, Box Truck, Dry Van, etc.)
   - **Lane region**: type where you are running loads today (e.g. "Southeast", "Texas to Midwest")
   - **RPM range**: type the rate range you are seeing (e.g. "$2.10-$2.40")
3. Click **Generate Today's Outreach**.
4. Copy each group post and paste into the Facebook groups you are posting to today.
5. Click **Mark used** on each post after copying — this logs it to Post History so it does not repeat.
6. Copy the page post and publish it to your business Facebook page.

If you do not like the set, click **Regenerate** for a fresh batch. You can regenerate as many times as you want at zero cost.

### How posts are assembled

Each group post is built from four parts combined automatically:

- A hook (opening line) — drawn from a bank of 20 hooks, each with 2 natural phrasings
- A body template — drawn from a bank of 20 variable-based templates, filtered to match your driver type
- A pain point and a benefit — pulled from banks of 15 each and filled into the template
- A CTA (closing line) — drawn from a bank of 15 CTAs, each with 2 natural phrasings

All variables ({driver_type}, {lane_region}, {rpm_range}) are filled automatically from your targeting settings. A word-swap pass slightly varies the phrasing so posts do not all sound identical.

The page post uses a separate set of 5 templates with a different structure — longer, slightly more businesslike, but still human tone.

### Anti-repetition

The engine checks your post history before selecting templates. Templates used in the last 14 days are deprioritized. Mark Used on every post you actually copy so the system learns what has been sent.

### Weekly AI refresh reminder

A reminder appears in two places if you have not logged an AI refresh in 7 or more days:

- A blue banner on the main Dashboard with a "Go to Outreach" button
- An amber banner inside the Outreach Engine tab with a "Mark done" button

The reminder is backed by the `outreach_refresh_log` database table, so it persists across app restarts and machine changes. Once per week, spend 10 minutes with AI to generate:

- 5-10 new outreach templates
- 5 new hook opening lines
- 3 new CTA variations
- A new angle you have not tried (new authority, seasonal freight, specific lane pain point)

After adding new content to `src/lib/outreachEngine.ts`, click **Mark done** on the banner inside the Outreach Engine tab to log the refresh and reset the 7-day timer.

### Performance panel (Post History tab)

The Post History tab shows an Outreach Performance section at the bottom once you have posted and logged results. It displays:

- Total posts logged, total replies, and total leads generated across all time
- Top performing templates ranked by score (replies + leads x3)
- A stale template warning for any template with 8 or more uses and zero replies or leads — these should be replaced during your next weekly AI refresh
- Lowest performing templates (3+ uses) so you can see what is not working

Use this panel during your weekly refresh to decide which templates to rotate out.

### Weekly AI usage checklist (shown in the tab)

1. Check the Performance panel — identify templates to retire (8+ uses, score 0)
2. Generate 5-10 new outreach templates with variables to replace retired ones
3. Generate 5 new hook opening lines
4. Generate 3 new CTA variations
5. Try a new angle: new authority, seasonal freight, or specific lane
6. Click Mark done on the refresh banner to log the refresh
