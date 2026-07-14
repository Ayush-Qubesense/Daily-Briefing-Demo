# Daily Briefing Assistant — Demo

A standalone, static demo of the **Daily Activity Briefing** ("F3") concept from the
Qubesense OPRS AI proposal: every morning, each user gets an auto-written summary of the
last operating shift — jobs completed, jobs that ran over, late deployments/arrivals,
hours worked, approvals waiting, and overdue maintenance — shown in-app and (in the real
product) delivered by email.

This is a **concept demo for stakeholders**, not the product, but two pieces of it are
real rather than simulated: a small **Python backend** (`api/generate-report.py`) asks
**Gemini** to write the narrative paragraph from the shift's numbers each time you click
**Demo** — the numbers themselves stay deterministic (computed in `data.js`/`script.js`,
never counted or guessed by the model), Gemini only narrates them — and a second function
(`api/send-email.py`) can send that report as an actual trial email over SMTP. Both are
optional: with no `GEMINI_API_KEY`/SMTP vars set, the app **falls back to the curated
narrative and a network-error toast on send**, so it still can't fail on stage even
unconfigured. The persona shown is a generic **Manager / Supervisor** working title (not
tied to a specific person).

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
- **📋 Demo** — a floating button, bottom-right. Clicking it calls Gemini (with a loading
  state while it writes) to narrate the shift, then opens the **generated report**: the
  fresh AI narrative plus 12 category tiles (Jobs Scheduled, Jobs Completed, Jobs Pending,
  Jobs Overran, On-Time Rate, Tickets Closed, Sites Touched, Approvals Pending, Late
  Deployments, Overdue Maintenance, Hours Worked, Crew Clocked In) and detail tables for
  jobs that ran over, late deployments/arrivals, approvals, and overdue maintenance. No
  `GEMINI_API_KEY` configured → silently uses the curated `DEMO.narrative` instead, same
  numbers either way. Click **Demo** again and the wording changes — proof it's live.
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
| `data.js`    | **The curated content** — edit this to change what's shown, and the AI's fallback narrative. |
| `api/generate-report.py` | Vercel Python serverless function — asks Gemini to narrate the shift's numbers. |
| `api/send-email.py` | Vercel Python serverless function — sends the report over SMTP. |
| `dev_server.py` | Local-only convenience server (not deployed) — serves the static site + both functions on one port without needing the Vercel CLI. |
| `requirements.txt` | Python deps for the serverless functions (`Flask`, `google-genai`). |
| `.env.example` | Template for the SMTP + Gemini env vars the functions need. |
| `assets/logo.png` | OpsFlo wordmark used in the top navbar (text fallback if it fails to load). |
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

The "Demo" button and email preview both work this way, but with no backend behind a
plain static server, Gemini generation and **Send Trial Email** will fail with a network
error and the report silently falls back to the curated narrative — for real AI + real
send you need one of the Python functions running too (below).

### With real Gemini generation and/or email send

```bash
pip install -r requirements.txt
cp .env.example .env   # then fill in real values, see below
```

Then either:

- **`python dev_server.py`** — no Vercel CLI/login needed; serves the static site and
  both functions together on `http://localhost:3000` (or set `PORT`). Good for quick
  local testing.
- **`vercel dev`** (needs `npm i -g vercel` once) — closer to how it behaves once
  deployed, since it's the actual Vercel Python runtime rather than a Flask stand-in.

**Gemini setup:** get a free key at [aistudio.google.com/apikey](https://aistudio.google.com/apikey)
and set `GEMINI_API_KEY` in `.env`. Optional `GEMINI_MODEL` overrides the default
(`gemini-2.5-flash`). No key set → the report just uses the curated `DEMO.narrative`,
no error shown.

**SMTP setup (Gmail):** `SMTP_USER`/`SMTP_PASS` must be a Google Account **App Password**
(Account → Security → 2-Step Verification → App Passwords — requires 2-Step Verification
to be turned on first; your normal Gmail password will not work). Set `SMTP_HOST`,
`SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, and `FROM_EMAIL` in `.env` per `.env.example`.
Any other SMTP provider (Outlook, a company relay, etc.) works too — just point the same
five variables at it.

`.env` is gitignored — never commit real credentials. (`.env.example` is **not**
gitignored — it should only ever hold placeholder values, never real ones.)

---

## Personalize for a demo

Open **`data.js`** and edit the top of the `DEMO` object:

```js
userName:     "Manager",                   // navbar name + avatar initials + generated report — kept generic on purpose
userInitials: "MG",                        // avatar circle text
userEmail:    "manager.n@indoglobus.com",  // shown in the email preview's "To" field
role:         "Manager / Supervisor",
```

`userName` is intentionally a generic working title rather than a real person's name, so
the demo isn't tied to one individual — change it if you want something more specific for
a given audience. Everything on screen (navbar, the generated report, the email preview) is
rendered from `DEMO`, so it's the single place to edit. If you change a KPI or category
number, update the `narrative` sentence to match — the demo is written to be self-consistent.

---

## Talking points — "what's next" (not built here)

- **Live OPRS data** feeding the report categories and the Gemini prompt, in place of the
  curated `data.js` — the generation call itself is already real, only the input data is mocked.
- **Per-role variants** — dispatcher, field tech, executive.
- **Scheduled morning delivery** (background job) that sends automatically, instead of a
  manual trial-send button.

These are natural "here's where this goes in the product" follow-ups — intentionally out of
scope for a can't-fail stakeholder demo.
