/* ============================================================================
   Daily Work Report — rendering + interactions (OpsFlo / Frest theme)
   ----------------------------------------------------------------------------
   Reads the global `DEMO` object from data.js. The navbar renders on load;
   the report itself is generated on demand from the bottom-right "Demo"
   button, structured into categories (jobs completed, jobs pending, tickets
   closed, jobs overran, approvals pending, late deployments, overdue
   maintenance, hours worked), with a "Preview Email" action that shows the
   exact HTML email a user would receive. Both are SIMULATED — no network call.
   ============================================================================ */

/* --------------------------- small helpers --------------------------------- */
const $ = (id) => document.getElementById(id);
const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );
const initials = (name) =>
  name.trim().split(/\s+/).slice(0, 2).map((w) => w[0].toUpperCase()).join("");
const todayLong = () =>
  new Date().toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  });
const yesterdayLong = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
};

/* --------------------------- horizontal menu nav --------------------------- */
const navItems = [
  { label: "Overview",  icon: '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>' },
  { label: "Daily Briefing", active: true, badge: "AI",
    icon: '<path d="M12 3a6 6 0 0 0-6 6c0 2 1 3.5 2 4.5.7.7 1 1.3 1 2.5h6c0-1.2.3-1.8 1-2.5 1-1 2-2.5 2-4.5a6 6 0 0 0-6-6Z"/><path d="M9 21h6"/><path d="M10 18h4"/>' },
  { label: "Jobs",      icon: '<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>' },
  { label: "Approvals", icon: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>' },
  { label: "Team",      icon: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>' },
  { label: "Schedule",  icon: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>' },
  { label: "Reports",   icon: '<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>' },
  { label: "Settings",  icon: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>' },
];

function renderNav() {
  $("nav").innerHTML = navItems.map((item) => `
    <button class="sb-nav-btn flex items-center gap-2 px-3.5 py-3 rounded-lg transition-all duration-150 relative whitespace-nowrap"
      style="${item.active ? "background:rgba(90,141,238,0.12);color:#5A8DEE;" : "background:transparent;color:#5e5873;"}"
      onmouseover="${item.active ? "" : "this.style.background='rgba(90,141,238,0.08)';this.style.color='#5A8DEE';"}"
      onmouseout="${item.active ? "" : "this.style.background='transparent';this.style.color='#5e5873';"}">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0">${item.icon}</svg>
      <span style="font-size:14px;font-weight:${item.active ? "600" : "500"};line-height:1">${item.label}</span>
      ${item.badge ? `<span style="background:#5A8DEE;color:#fff;font-size:9px;padding:1px 5px;border-radius:10px;font-weight:700;line-height:1.4;margin-left:2px">${item.badge}</span>` : ""}
    </button>`).join("");
}

/* --------------------------- render: chrome -------------------------------- */
function renderChrome() {
  $("userAvatar").textContent = DEMO.userInitials || initials(DEMO.userName);
  $("userNameTop").textContent = DEMO.userName;
  document.title = `Daily Work Report · ${DEMO.userName} · OpsFlo AI`;
}

/* --------------------------- shared: category icons + tones ---------------- */
const CAT_ICON = {
  check:    '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>',
  list:     '<path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01"/>',
  trend:    '<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>',
  shield:   '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>',
  alarm:    '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2"/><path d="M5 3 3 5"/><path d="m19 3 2 2"/>',
  tool:     '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>',
  clock:    '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  target:   '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
  pin:      '<path d="M12 21s-6-5.686-6-10a6 6 0 1 1 12 0c0 4.314-6 10-6 10z"/><circle cx="12" cy="11" r="2"/>',
  users:    '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
};
const TONE = {
  success: "#28c76f",
  danger:  "#ea5455",
  warning: "#ff9f43",
  info:    "#5A8DEE",
};

/* --------------------------- report: category stats ------------------------ */
function reportCategories() {
  const totalOverHours = DEMO.overran.reduce((sum, o) => sum + o.over, 0);
  const late = DEMO.late.length;
  const onTime = Math.max(0, DEMO.jobsScheduled - late);
  const rate = Math.max(0, Math.min(100, Math.round(DEMO.gauge.value)));
  const rateTone = rate >= 75 ? "success" : rate >= 50 ? "warning" : "danger";
  return [
    { label: "Jobs Scheduled",     value: DEMO.jobsScheduled,     sub: "total for the shift",                          tone: "info",    icon: "calendar" },
    { label: "Jobs Completed",     value: DEMO.kpis[0].value,     sub: `of ${DEMO.jobsScheduled} scheduled`,            tone: "success", icon: "check"    },
    { label: "Jobs Pending",       value: DEMO.jobsPending,       sub: "rolled into today",                             tone: "info",    icon: "list"     },
    { label: "Jobs Overran",       value: DEMO.overran.length,    sub: `${totalOverHours.toFixed(2)}h overrun total`,   tone: "danger",  icon: "trend"    },
    { label: "On-Time Rate",       value: `${rate}%`,             sub: `${onTime} on time · ${late} late`,              tone: rateTone,  icon: "target"   },
    { label: "Tickets Closed",     value: DEMO.ticketsClosed,     sub: `across ${DEMO.sitesTouched} sites`,             tone: "success", icon: "check"    },
    { label: "Sites Touched",      value: DEMO.sitesTouched,      sub: "sites visited this shift",                      tone: "info",    icon: "pin"      },
    { label: "Approvals Pending",  value: DEMO.approvals.length,  sub: "ready to approve",                              tone: "warning", icon: "shield"   },
    { label: "Late Deployments",   value: DEMO.late.length,       sub: "deployments & arrivals",                        tone: "warning", icon: "alarm"    },
    { label: "Overdue Maintenance",value: DEMO.maintenance.length,sub: "assets need service",                           tone: "danger",  icon: "tool"     },
    { label: "Hours Worked",       value: DEMO.kpis[3].value,     sub: DEMO.kpis[3].sub,                                tone: "info",    icon: "clock"    },
    { label: "Crew Clocked In",    value: DEMO.crewClockedIn,     sub: "employees on the clock",                        tone: "info",    icon: "users"    },
  ];
}

// Payload for POST /api/generate-report — the numbers are already computed
// here; Gemini only narrates them, it never counts or does arithmetic.
function buildReportStatsPayload() {
  const totalOverHours = DEMO.overran.reduce((sum, o) => sum + o.over, 0);
  const top = DEMO.maintenance[0];
  return {
    role: DEMO.role,
    jobsScheduled: DEMO.jobsScheduled,
    jobsCompleted: DEMO.kpis[0].value,
    jobsPending: DEMO.jobsPending,
    ticketsClosed: DEMO.ticketsClosed,
    sitesTouched: DEMO.sitesTouched,
    overranCount: DEMO.overran.length,
    overranHours: Number(totalOverHours.toFixed(2)),
    lateCount: DEMO.late.length,
    crewClockedIn: DEMO.crewClockedIn,
    hoursWorked: DEMO.kpis[3].value,
    approvalsCount: DEMO.approvals.length,
    maintenanceCount: DEMO.maintenance.length,
    topMaintenance: top ? { asset: top.asset, due: top.due } : null,
  };
}

// The session's active narrative — the curated DEMO.narrative until/unless
// a live Gemini call replaces it (see wireDemoButton). Both the on-screen
// report and the actually-sent email read from this, so they always match.
let currentNarrative = DEMO.narrative;

/* --------------------------- shared: plain data table ----------------------- */
function reportTable(headers, rows, rightCols = []) {
  const cell = (tag, v, i) => `<${tag}${rightCols.includes(i) ? ' class="num"' : ""}>${esc(v)}</${tag}>`;
  return `
    <table class="ep-table">
      <thead><tr>${headers.map((h, i) => cell("th", h, i)).join("")}</tr></thead>
      <tbody>${rows.map((r) => `<tr>${r.map((v, i) => cell("td", v, i)).join("")}</tr>`).join("")}</tbody>
    </table>`;
}

const sectionHtml = (title, count, tableHtml) => `
  <div class="ep-sec-head">${esc(title.toUpperCase())}${count != null ? ` (${count})` : ""}</div>
  ${tableHtml}`;

/* --------------------------- on-screen generated report --------------------- */
function reportHtml() {
  const stats = reportCategories().map((c) => `
    <div class="report-stat">
      <div class="report-stat-value" style="color:${TONE[c.tone]}">${esc(c.value)}</div>
      <div class="report-stat-label">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0">${CAT_ICON[c.icon]}</svg>
        ${esc(c.label)}
      </div>
      <div class="report-stat-sub">${esc(c.sub)}</div>
    </div>`).join("");

  const overranTable = reportTable(
    ["Job", "Ticket", "Est.", "Actual", "Over"],
    DEMO.overran.map((o) => [o.title, o.ticket, `${o.est}h`, `${o.actual}h`, `+${o.over}h`]),
    [2, 3, 4]);
  const lateTable = reportTable(
    ["Item", "Type", "Late by", "Reason"],
    DEMO.late.map((l) => [l.title, l.kind, `${l.mins} min`, l.reason]),
    [2]);
  const approvalsTable = reportTable(
    ["Type", "Item", "Status"],
    DEMO.approvals.map((a) => [a.type, a.title, a.meta]));
  const maintTable = reportTable(
    ["Asset", "Type", "Status"],
    DEMO.maintenance.map((m) => [m.asset, m.resource, m.due]));

  return `
    <div class="report-preview">
      <div class="rp-header">
        <div class="rp-title">Daily Work Report — ${esc(yesterdayLong())}</div>
        <span class="ai-badge" title="This report was written by OpsFlo AI">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 4V2M15 16v-2M8 9h2M20 9h2M17.8 11.8 19 13M15 9h0M17.8 6.2 19 5M3 21l9-9M12.2 6.2 11 5"/></svg>
          Generated by OpsFlo AI
          <span class="ai-time">${esc(DEMO.generatedAt)}</span>
        </span>
      </div>
      <p class="rp-narrative">${esc(currentNarrative)}</p>
      <div class="report-stat-grid">${stats}</div>
      ${sectionHtml("Jobs that ran over", DEMO.overran.length, overranTable)}
      ${sectionHtml("Late deployments & arrivals", DEMO.late.length, lateTable)}
      ${sectionHtml("Approvals pending", DEMO.approvals.length, approvalsTable)}
      ${sectionHtml("Overdue maintenance", DEMO.maintenance.length, maintTable)}
    </div>`;
}

/* --------------------------- email preview ---------------------------------- */
// Rendered inside an <iframe srcdoc> so the preview is the literal HTML that
// gets sent — not a lookalike built from separate markup that can drift out
// of sync with it.
function emailPreviewHtml() {
  const messageHtml = buildEmailMessageHtml();
  return `
    <div class="email-preview">
      <div class="ep-client">
        <div class="ep-client-row"><span class="ep-client-label">Subject</span><span class="ep-client-value">Daily Work Report -- ${esc(yesterdayLong())}</span></div>
        <div class="ep-client-row"><span class="ep-client-label">From</span><span class="ep-client-value">OpsFlo AI &lt;briefings@opsflo.ai&gt;</span></div>
        <div class="ep-client-row"><span class="ep-client-label">To</span><span class="ep-client-value">${esc(DEMO.userName)} &lt;${esc(DEMO.userEmail)}&gt;</span></div>
        <div class="ep-client-row"><span class="ep-client-label">Sent</span><span class="ep-client-value">${esc(DEMO.generatedAt)} today</span></div>
      </div>
      <iframe class="ep-frame" title="Email preview" srcdoc="${esc(messageHtml)}"></iframe>
    </div>`;
}

/* --------------------------- real email body (inline-styled) --------------- */
// Email clients strip <link> stylesheets, so the message actually sent uses
// inline styles rather than the .ep-* classes the on-screen preview relies on.
function inlineTable(headers, rows, rightCols = []) {
  const thStyle = "text-align:left;padding:6px 8px;border-bottom:2px solid #d8d6de;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.03em;color:#6e6b7b;";
  const tdStyle = "padding:6px 8px;border-bottom:1px solid #ebe9f1;font-size:12.5px;color:#2b2f38;vertical-align:top;";
  const rightExtra = "text-align:right;white-space:nowrap;";
  const headCells = headers.map((h, i) => `<th style="${thStyle}${rightCols.includes(i) ? rightExtra : ""}">${esc(h)}</th>`).join("");
  const bodyRows = rows.map((r) => `<tr>${r.map((v, i) => `<td style="${tdStyle}${rightCols.includes(i) ? rightExtra : ""}">${esc(v)}</td>`).join("")}</tr>`).join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:100%;margin:0 0 18px;">
    <thead><tr>${headCells}</tr></thead>
    <tbody>${bodyRows}</tbody>
  </table>`;
}

// 4-across grid of stat tiles (mirrors the on-screen .report-stat-grid), built
// as a plain HTML table since email clients don't reliably support CSS grid.
function inlineStatGrid(categories, cols = 4) {
  const cellWidth = `${Math.floor(100 / cols)}%`;
  const rows = [];
  for (let i = 0; i < categories.length; i += cols) {
    const rowCats = categories.slice(i, i + cols);
    const cells = rowCats.map((c) => `
      <td width="${cellWidth}" style="padding:5px;vertical-align:top;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fafbfd;border:1px solid #ebe9f1;border-radius:8px;">
          <tr><td style="padding:12px 14px;">
            <div style="font-size:21px;font-weight:700;color:${TONE[c.tone] || TONE.info};line-height:1.1;">${esc(c.value)}</div>
            <div style="font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:.03em;color:#6e6b7b;margin-top:5px;">${esc(c.label)}</div>
            <div style="font-size:11px;color:#b9b9c3;margin-top:2px;">${esc(c.sub)}</div>
          </td></tr>
        </table>
      </td>`).join("");
    const pad = Array.from({ length: cols - rowCats.length }, () => `<td width="${cellWidth}"></td>`).join("");
    rows.push(`<tr>${cells}${pad}</tr>`);
  }
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0 22px;">${rows.join("")}</table>`;
}

// A bordered, left-accented card wrapping one detail table — gives each
// section its own visual block instead of a long unbroken scroll of tables.
function inlineSectionCard(title, count, tableHtml, accent) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 16px;">
    <tr><td style="background:#ffffff;border:1px solid #ebe9f1;border-left:4px solid ${accent};border-radius:8px;padding:14px 16px 4px;">
      <div style="font-size:11px;font-weight:700;letter-spacing:.04em;color:#5e5873;text-transform:uppercase;margin-bottom:8px;">${esc(title.toUpperCase())}${count != null ? ` (${count})` : ""}</div>
      ${tableHtml}
    </td></tr>
  </table>`;
}

function buildEmailMessageHtml() {
  const overranTable = inlineTable(
    ["Job", "Ticket", "Est.", "Actual", "Over"],
    DEMO.overran.map((o) => [o.title, o.ticket, `${o.est}h`, `${o.actual}h`, `+${o.over}h`]),
    [2, 3, 4]);
  const lateTable = inlineTable(
    ["Item", "Type", "Late by", "Reason"],
    DEMO.late.map((l) => [l.title, l.kind, `${l.mins} min`, l.reason]),
    [2]);
  const approvalsTable = inlineTable(
    ["Type", "Item", "Status"],
    DEMO.approvals.map((a) => [a.type, a.title, a.meta]));
  const maintTable = inlineTable(
    ["Asset", "Type", "Status"],
    DEMO.maintenance.map((m) => [m.asset, m.resource, m.due]));

  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f8f7fa;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8f7fa;padding:20px 0;">
      <tr><td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;max-width:920px;background:#ffffff;border:1px solid #ebe9f1;border-radius:10px;overflow:hidden;">
          <tr><td style="background:#5A8DEE;padding:20px 28px;">
            <span style="color:#ffffff;font-size:17px;font-weight:700;">OpsFlo AI &middot; Daily Work Report</span>
          </td></tr>
          <tr><td style="padding:26px 28px 28px;">
            <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:#5e5873;">${esc(DEMO.role)}</p>
            <p style="margin:0 0 6px;font-size:13.5px;line-height:1.6;color:#2b2f38;">${esc(currentNarrative)}</p>
            ${inlineStatGrid(reportCategories())}
            ${inlineSectionCard("Jobs that ran over", DEMO.overran.length, overranTable, "#ff9f43")}
            ${inlineSectionCard("Late deployments & arrivals", DEMO.late.length, lateTable, "#ea5455")}
            ${inlineSectionCard("Approvals pending", DEMO.approvals.length, approvalsTable, "#ff9f43")}
            ${inlineSectionCard("Overdue maintenance", DEMO.maintenance.length, maintTable, "#5A8DEE")}
            <p style="margin:8px 0 0;padding-top:14px;border-top:1px solid #ebe9f1;font-size:11.5px;color:#6e6b7b;">
              This is a trial send from the OpsFlo AI daily report demo.
            </p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
}

/* --------------------------- send-to form (real send) ----------------------- */
function sendToFormHtml() {
  return `
    <div class="ep-send">
      <label class="ep-send-label" for="sendToInput">Send a trial email to</label>
      <div class="ep-send-row">
        <input id="sendToInput" class="ep-send-input" type="email" value="" placeholder="name@example.com" />
        <button id="sendTrialBtn" class="ep-send-btn" type="button">Send Trial Email</button>
      </div>
      <div id="sendStatus" class="ep-send-status"></div>
    </div>`;
}

function wireSendTrialEmail(popup) {
  const input = popup.querySelector("#sendToInput");
  const btn = popup.querySelector("#sendTrialBtn");
  const status = popup.querySelector("#sendStatus");
  if (!btn) return;

  btn.addEventListener("click", async () => {
    const to = (input.value || "").trim();
    if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
      status.textContent = "Enter a valid email address.";
      status.className = "ep-send-status ep-send-status-error";
      return;
    }
    btn.disabled = true;
    const original = btn.textContent;
    btn.textContent = "Sending…";
    status.textContent = "";
    status.className = "ep-send-status";

    try {
      const res = await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to,
          subject: `Daily Work Report -- ${yesterdayLong()}`,
          html: buildEmailMessageHtml(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        status.textContent = `Sent to ${to} ✓`;
        status.className = "ep-send-status ep-send-status-ok";
      } else {
        status.textContent = data.error || "Failed to send. Please try again.";
        status.className = "ep-send-status ep-send-status-error";
      }
    } catch (err) {
      status.textContent = "Network error — is the backend running?";
      status.className = "ep-send-status ep-send-status-error";
    } finally {
      btn.disabled = false;
      btn.textContent = original;
    }
  });
}

function openEmailPreview() {
  return Swal.fire({
    html: emailPreviewHtml() + sendToFormHtml(),
    width: 700,
    padding: "1.25rem",
    showConfirmButton: true,
    confirmButtonText: "Close",
    confirmButtonColor: "#5A8DEE",
    didOpen: (popup) => wireSendTrialEmail(popup),
  });
}

/* --------------------------- Demo button: generate report ------------------ */
function wireDemoButton() {
  $("demoBtn").addEventListener("click", async () => {
    Swal.fire({
      title: "Generating report…",
      html: "OpsFlo AI is summarizing yesterday's shift",
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
    });

    const minDelay = new Promise((r) => setTimeout(r, 700));
    const generation = fetch("/api/generate-report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildReportStatsPayload()),
    })
      .then((res) => res.json().then((data) => ({ status: res.status, data })))
      .then(({ status, data }) => {
        if (status === 200 && data.ok && data.narrative) {
          currentNarrative = data.narrative;
        } else {
          console.warn("Gemini generation unavailable, using curated narrative:", data.error);
          currentNarrative = DEMO.narrative;
        }
      })
      .catch((err) => {
        console.warn("Gemini generation request failed, using curated narrative:", err);
        currentNarrative = DEMO.narrative;
      });
    await Promise.all([generation, minDelay]);

    const result = await Swal.fire({
      html: reportHtml(),
      width: 780,
      padding: "1.25rem",
      showCancelButton: true,
      showConfirmButton: true,
      confirmButtonText: "Preview Email",
      cancelButtonText: "Close",
      confirmButtonColor: "#5A8DEE",
      cancelButtonColor: "#fff",
    });

    if (result.isConfirmed) await openEmailPreview();
  });
}

/* --------------------------- boot ------------------------------------------ */
document.addEventListener("DOMContentLoaded", () => {
  renderNav();
  renderChrome();
  wireDemoButton();

  const card = document.querySelector("main .op-card");
  if (card) { card.style.setProperty("--rd", "60ms"); card.classList.add("reveal"); }
});
