# First-Run Setup Guide

This is a one-time checklist. Complete these steps before entering any real data or running imports.

---

## Required Setup Order

### 1. Business Information

Settings > Business Information

Fill in company name, owner name, email, and default dispatch percentage.
This information appears in invoices and outreach templates.

---

### 2. FMCSA Web Key

Settings > Integrations

Add your QCMobile API key (the "FMCSA Web Key" field).
Without this key the FMCSA lead import will not run.
Register for a free key at qcmobileapp.com if you do not have one.

---

### 3. Claude API Key

Settings > AI Integration

Add your Claude API key.
Without this key the Facebook Agents AI buttons will not work.
The rest of the app works without it.

---

### 4. Remove Sample Data

Settings > Setup

The app ships with sample drivers, loads, brokers, leads, and invoices.
Before entering real data:

1. Click **Remove Sample Data** and confirm — strips all fake business records.
2. Click **Load Task Templates** — seeds the daily checklist with 18 default tasks.
3. Click **Rebuild Document Library** — loads the full SOP library (20 documents).

Do this before adding any real records. Once real data is mixed with sample data, cleanup is harder.

---

### 5. First FMCSA Import

Leads > Import FMCSA Leads

Click **Import FMCSA Leads** to pull carriers with new MC authority (30-180 days old) into your pipeline.
The first import takes 30-60 seconds.
Expected result: 20-100 new leads depending on current FMCSA activity.

---

## Before You Begin Real Work

- [ ] Business information filled in (Settings > Business Information)
- [ ] FMCSA key entered (Settings > Integrations)
- [ ] Claude API key entered (Settings > AI Integration)
- [ ] Sample data removed (Settings > Setup > Remove Sample Data)
- [ ] Task templates loaded (Settings > Setup > Load Task Templates)
- [ ] Document library built (Settings > Setup > Rebuild Document Library)
- [ ] First FMCSA import completed (Leads > Import FMCSA Leads)
- [ ] At least one Facebook group added (Marketing > Groups > Add Group)

---

## What Happens If You Skip Steps

| Skipped step | Consequence |
|---|---|
| Business Information | Invoices show blank company and owner name |
| FMCSA key | Import button shows an error; no leads are imported |
| Claude API key | Facebook Agent AI buttons show an error; everything else works |
| Remove sample data | Fake records mix with real ones; reports and KPIs are inaccurate |
| Task templates | Daily checklist is empty on the Dashboard |

---

## After Setup

See **Daily Dispatch Routine** in the Documents library for the ongoing daily workflow.
