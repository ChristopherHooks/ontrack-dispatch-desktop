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
