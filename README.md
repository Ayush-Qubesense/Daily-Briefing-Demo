# Daily Briefing Assistant — Demo

A standalone, static demo of the **Daily Activity Briefing** ("F3") concept from the
Qubesense OPRS AI proposal: every morning, each user gets an auto-written summary of the
last operating shift — jobs completed, jobs that ran over, late deployments/arrivals,
hours worked, approvals waiting, and overdue maintenance — shown in-app and (in the real
product) delivered by email.

This is a **concept demo for stakeholders**, not the product. The report itself is
**curated content** rendered entirely in the browser — no external AI, no API keys — so
it can't fail on stage. The one real piece of plumbing is a small **Python backend**
(`api/send-email.py`) that can send an actual trial email over SMTP, to prove the
"delivered by email" part of the concept, not just simulate it. The persona shown is a
generic **Manager / Supervisor** working title (not tied to a specific person).

> **The numbers are curated, but the model is real.** Every KPI and section maps 1:1 to the
> Qubesense NextGen OPRS schema — `SP_DailyBriefing_Activity(@ClientID, @date)` over
> `FormDataPRIDEDispatchTicket*`, `MaintenanceDueList`, and the payroll time-card tables.
> See the header comment in [`data.js`](data.js) for the exact source→metric mapping, so the
> jump from demo to live data is just swapping the mock object for the stored-proc result.

> The real generation engine — OpsFlo AI (`/api/ask`) running on live OPRS data — lives in
> the OPRS repo and is a **"next step" talking point**, not part of this demo.

---

## What's in the demo

- **Top bar** with the OpsFlo wordmark, a horizontal nav, and a user avatar — the app chrome
  stays on screen at all times.
- **Empty-state landing page** — no dashboard clutter; a short blurb points at the **Demo**
  button.
- **📋 Demo** — a floating button, bottom-right. Clicking it simulates AI generation (a brief
  loading state), then opens the **generated report**: 12 category tiles (Jobs Scheduled,
  Jobs Completed, Jobs Pending, Jobs Overran, On-Time Rate, Tickets Closed, Sites Touched,
  Approvals Pending, Late Deployments, Overdue Maintenance, Hours Worked, Crew Clocked In)
  plus detail tables for jobs that ran over, late deployments/arrivals, approvals, and
  overdue maintenance.
- **Preview Email** — from the report modal, opens an on-screen preview of the exact HTML
  email that would be sent (plain-text-style layout, reusing the same data).
- **Send Trial Email** — inside that preview, an editable "Send to" field (prefilled from
  `DEMO.userEmail`) plus a button that calls the Python backend to **actually send** the
  report over SMTP. This is the one non-simulated action in the demo.

Styled to match the **OpsFlo "AI Health & Predictive Maintenance" dashboard theme**
(Inter font, `#5A8DEE` primary, `#f8f7fa` canvas, `rounded-xl` cards, the OpsFlo top navbar +
horizontal menu). Fully responsive so it looks right on a projector or a shared laptop.

---

## Files

| File | Purpose |
|------|---------|
| `index.html` | Navbar + empty-state landing page + the bottom-right "Demo" button. |
| `styles.css` | OpsFlo/Frest theme tokens + custom components (FAB, report modal, email preview, send form). |
| `script.js`  | Renders the navbar; generates the report + email preview from `DEMO`; wires the real send. |
| `data.js`    | **The curated content** — edit this to change what's shown. |
| `api/send-email.py` | Vercel Python serverless function — sends the report over SMTP. |
| `requirements.txt` | Python deps for the serverless function (`Flask`). |
| `.env.example` | Template for the SMTP env vars the send function needs. |
| `assets/logo.svg` | Fallback SVG wordmark (the top bar uses the exact OpsFlo raster logo, inlined). |
| `vercel.json` | Minimal static config (clean URLs). |

Tailwind CSS, the Inter font, and SweetAlert2 load from CDNs (this is a normal website, not a
CSP-restricted page, so CDNs are fine).

---

## Run locally

### Just the UI (no real email sending)

No build step. Any of these works:

- **Just open it:** double-click `index.html` (or open it in your browser).
- **Or serve it** (recommended, avoids any file-path quirks):
  ```bash
  npx serve .
  # or
  python -m http.server 8000
  ```
  then open the printed URL (e.g. http://localhost:8000).

The "Demo" button, generated report, and email preview all work this way. **Send Trial
Email** will fail with a network error, since there's no backend behind a plain static
server — for that you need the Python function running too (below).

### With the real email send

The send endpoint is a Vercel Python serverless function, so local testing goes through
the Vercel CLI, which serves the static files *and* `api/send-email.py` together on one
port — the same setup as production.

```bash
npm i -g vercel        # one-time
pip install -r requirements.txt
cp .env.example .env   # then fill in real SMTP values, see below
vercel dev
```

**SMTP setup (Gmail):** `SMTP_USER`/`SMTP_PASS` must be a Google Account **App Password**
(Account → Security → 2-Step Verification → App Passwords — requires 2-Step Verification
to be turned on first; your normal Gmail password will not work). Set `SMTP_HOST`,
`SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, and `FROM_EMAIL` in `.env` per `.env.example`.
Any other SMTP provider (Outlook, a company relay, etc.) works too — just point the same
five variables at it.

`.env` is gitignored — never commit real credentials.

---

## Personalize for a demo

Open **`data.js`** and edit the top of the `DEMO` object:

```js
userName:     "Manager",                   // navbar name + avatar initials + generated report — kept generic on purpose
userInitials: "MG",                        // avatar circle text
userEmail:    "priya.n@indoglobus.com",    // default prefill for the "Send to" field in the email preview
role:         "Manager / Supervisor",
```

`userName` is intentionally a generic working title rather than a real person's name, so
the demo isn't tied to one individual — change it if you want something more specific for
a given audience. Everything on screen (navbar, the generated report, the email preview) is
rendered from `DEMO`, so it's the single place to edit. If you change a KPI or category
number, update the `narrative` sentence to match — the demo is written to be self-consistent.

---

## Deploy to Vercel

Two supported paths:

### Option A — Vercel CLI
```bash
npm i -g vercel
cd Demo
vercel            # first run: accept defaults, no framework preset (it's a static project)
vercel --prod     # gives you the shareable production URL
```
(One-time: `vercel login`.)

### Option B — Git + Vercel dashboard
1. Push this folder to a new GitHub repo.
2. In the Vercel dashboard → **Add New… → Project → Import** the repo.
3. Framework preset: **Other**. Deploy — Vercel auto-detects `api/send-email.py` as a
   Python serverless function alongside the static files.
4. It auto-redeploys on every push.

### Environment variables (required for real sending)

The rest of the demo needs zero configuration, but **Send Trial Email** won't work in
production until you set the same five SMTP variables from `.env.example` on the Vercel
project — either:

```bash
vercel env add SMTP_HOST
vercel env add SMTP_PORT
vercel env add SMTP_USER
vercel env add SMTP_PASS
vercel env add FROM_EMAIL
```

or via the Vercel dashboard → **Project → Settings → Environment Variables**. Redeploy
after adding them.

---

## Before the demo (checklist)

- [ ] Preview locally and click through the whole path once.
- [ ] Set `userEmail` in `data.js` to whoever you're demoing to (or plan to type a different
      address into the "Send to" field live).
- [ ] Set the SMTP env vars (locally in `.env`, or on Vercel via `vercel env add`) and send
      yourself one real trial email beforehand to confirm delivery before you're on stage.
- [ ] Deploy and open the **live URL** once — confirm it renders and **Send Trial Email**
      works on the deployed site, not just locally.
- [ ] Projector check: browser zoom, resolution, and a quick mobile/responsive resize.
- [ ] Rehearse the ~2-minute path: open → click **Demo** → walk through the generated
      report → **Preview Email** → type a recipient → **Send Trial Email** → show it land
      in the inbox.

---

## Talking points — "what's next" (not built here)

- **Real generation** via OpsFlo AI (`/api/ask`) instead of curated text.
- **Live OPRS data** feeding the report categories, in place of the curated `data.js`.
- **Per-role variants** — dispatcher, field tech, executive.
- **Scheduled morning delivery** (background job) that sends automatically, instead of a
  manual trial-send button.

These are natural "here's where this goes in the product" follow-ups — intentionally out of
scope for a can't-fail stakeholder demo.
