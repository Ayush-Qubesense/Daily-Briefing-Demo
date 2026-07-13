/* ============================================================================
   Daily Briefing dashboard — rendering + interactions (OpsFlo / Frest theme)
   ----------------------------------------------------------------------------
   Reads the global `DEMO` object from data.js. The dashboard is a persistent
   page (not a modal): static chrome (navbar, sidebar, header) renders
   immediately on load, then generateBriefing() shows a loading skeleton,
   asks Gemini to narrate the shift, and renders the full dashboard in place.
   "Generate New Briefing" re-narrates in place via regenerateNarrative() —
   the KPIs/donut/schedule/risks never change, only the AI paragraph does.
   "Share by Email" reuses the same email-preview + real-SMTP-send flow as
   before; "Download PDF" is a real window.print() with print-friendly CSS.
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
const nowTime = () => new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
const fmtUSD = (n) => `$${Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
const shiftDateKey = (d) => `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}/${d.getFullYear()}`;

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
  document.title = `Daily Briefing · ${DEMO.userName} · OpsFlo AI`;
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
  dollar:   '<line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',
};
const TONE = {
  success: "#28c76f",
  danger:  "#ea5455",
  warning: "#ff9f43",
  info:    "#5A8DEE",
  purple:  "#7367F0",
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
    { label: "Hours Worked",       value: DEMO.kpis[3].value,     sub: `${DEMO.crewClockedIn} crew clocked in`,         tone: "info",    icon: "clock"    },
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

// The session's active narrative — the computed fallbackNarrative() until/
// unless a live Gemini call replaces it (see generateBriefing/
// regenerateNarrative). The dashboard and the actually-sent email both read
// from this, so they always match.
let currentNarrative = fallbackNarrative();

// Revenue/billing figures, loaded from assets/field-service-data.json (a
// synthetic Field Service Report export) via fetchRevenueData()/
// applyShiftMetrics() below — all anchored to the same "yesterday" date as
// the shift-count fields on DEMO, so every number on the dashboard describes
// the same day. This hardcoded object (real figures for 07/12/2026, the
// dataset's own "yesterday" at the time it was generated) is only the
// fallback shown if that fetch fails — same "can't fail on stage" pattern
// as fallbackNarrative() for the Gemini call.
let REVENUE = {
  revenueYesterday: 52770, jobsYesterday: 9, billableJobsYesterday: 7,
  revenue7d: 221957.5, jobs7d: 69, revenue7dDeltaPct: -11,
  revenueMTD: 379625, jobsMTD: 126,
  byOperationYesterday: [
    { operation: "Clamp Install", revenue: 33972.5 },
    { operation: "MLE + >=2 Clamps Install", revenue: 10782.5 },
    { operation: "Clamp Install, MLE Install", revenue: 4462.5 },
    { operation: "MLE Install", revenue: 1807.5 },
    { operation: "Clamp Pull", revenue: 1745 },
  ],
  dailyTrend: [
    { date: "07/06/2026", revenue: 32907.5 },
    { date: "07/07/2026", revenue: 20420 },
    { date: "07/08/2026", revenue: 27617.5 },
    { date: "07/09/2026", revenue: 64547.5 },
    { date: "07/10/2026", revenue: 14480 },
    { date: "07/11/2026", revenue: 9215 },
    { date: "07/12/2026", revenue: 52770 },
  ],
};

// When the briefing was last (re)generated — real wall-clock time, refreshed
// on every fetchNarrative() call, not a fixed demo string.
let generatedAtTime = nowTime();

// Set once the dashboard's real content (not the loading skeleton) has been
// rendered — gates the FAB so early clicks during the initial load are ignored.
let dashboardRendered = false;

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

/* --------------------------- dashboard: sidebar sections -------------------- */
// Order here must match renderDashboard()'s actual composition order below —
// this drives both the sidebar nav list and (via scroll-spy) what counts as
// "next"/"previous" while scrolling, so a mismatch reads as a broken sidebar.
const SECTIONS = [
  { id: "sec-executive-summary",   label: "Executive Summary",   icon: "list"     },
  { id: "sec-revenue-overview",    label: "Revenue Overview",    icon: "dollar"   },
  { id: "sec-yesterday-summary",   label: "Yesterday Summary",   icon: "list"     },
  { id: "sec-schedule-highlights", label: "Schedule Highlights", icon: "clock"    },
  { id: "sec-risks-alerts",        label: "Risks & Alerts",      icon: "alarm"    },
  { id: "sec-jobs-overview",       label: "Jobs Overview",       icon: "calendar" },
  { id: "sec-ai-insights",         label: "AI Insights",         icon: "trend"    },
  { id: "sec-team-utilization",    label: "Team & Utilization",  icon: "users"    },
  { id: "sec-approvals-pending",   label: "Approvals & Pending", icon: "shield"   },
  { id: "sec-actions-recommended", label: "Actions Recommended", icon: "target"   },
];

// Re-run after every fetchNarrative() (initial load + each regenerate) so the
// "as of" time never goes stale — always the real moment of last generation.
function updateAboutText() {
  $("dbAboutText").textContent =
    `This briefing is generated by OpsFlo AI using real-time data from your system as of ${generatedAtTime}, ${todayLong()}.`;
}

function renderSidebar() {
  $("dbDateLabel").textContent = todayLong();
  $("dbSidebarNav").innerHTML = SECTIONS.map((s, i) => `
    <button type="button" class="db-sidebar-nav-btn${i === 0 ? " active" : ""}" data-section="${s.id}">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0">${CAT_ICON[s.icon]}</svg>
      <span>${esc(s.label)}</span>
    </button>`).join("");
  $("dbSidebarNav").querySelectorAll("[data-section]").forEach((btn) => {
    btn.addEventListener("click", () => {
      setActiveSidebarItem(btn.dataset.section);
      document.getElementById(btn.dataset.section)?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
  updateAboutText();
}

/* --------------------------- dashboard: header ------------------------------ */
function headerHtml() {
  return `
    <div class="db-header">
      <div class="db-header-left">
        <div class="db-header-icon">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M9 13h6M9 17h6M9 9h1"/></svg>
        </div>
        <div>
          <h1 class="db-header-title">Daily Briefing</h1>
          <p class="db-header-sub">AI-powered summary of your operations for ${esc(yesterdayLong())}</p>
        </div>
      </div>
      <div class="db-header-actions">
        <button type="button" id="shareEmailBtn" class="btn-ghost-op">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 6-10 7L2 6"/></svg>
          Share by Email
        </button>
        <button type="button" id="downloadPdfBtn" class="btn-ghost-op">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Download PDF
        </button>
      </div>
    </div>`;
}

/* --------------------------- dashboard: chart helpers ------------------------ */
// Hand-built SVG donut/ring — no charting library exists in this repo. Each
// segment is one <circle> whose stroke-dasharray/-dashoffset carves out its
// arc; wrapping in a -90deg rotated <g> starts the first segment at 12 o'clock.
function buildDonutSvg(segments, { size = 160, stroke = 22 } = {}) {
  const total = segments.reduce((sum, seg) => sum + seg.value, 0) || 1;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  let cumulative = 0;
  const circles = segments.map((seg) => {
    const len = (seg.value / total) * c;
    const circle = `<circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${seg.color}" stroke-width="${stroke}" stroke-dasharray="${len} ${c - len}" stroke-dashoffset="${-cumulative}" />`;
    cumulative += len;
    return circle;
  }).join("");
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><g transform="rotate(-90 ${size / 2} ${size / 2})">${circles}</g></svg>`;
}

/* --------------------------- dashboard: data → view helpers ----------------- */
// Completed + In Progress + Pending + a computed Unworked residual
// exhaustively and non-overlappingly split jobsScheduled. NOT the same
// thing as `overran` (jobs that ran over their time ESTIMATE — a completed
// job can be in both). Named "Unworked", not "Overdue", to avoid reading as
// a synonym of `overran` elsewhere on the dashboard — this bucket is jobs
// never picked up at all, a different failure mode from a completed job
// that simply took longer than planned.
function computedUnworkedJobs() {
  return Math.max(0, DEMO.jobsScheduled - DEMO.kpis[0].value - DEMO.jobsInProgress - DEMO.jobsPending);
}

function jobsOverviewSegments() {
  return [
    { label: "Completed",   value: DEMO.kpis[0].value,     tone: "success" },
    { label: "In Progress", value: DEMO.jobsInProgress,    tone: "info"    },
    { label: "Pending",     value: DEMO.jobsPending,       tone: "warning" },
    { label: "Unworked",    value: computedUnworkedJobs(), tone: "danger"  },
  ];
}

function buildRiskAlerts() {
  const alerts = [];
  if (DEMO.overran.length) alerts.push({ dot: "high", headline: `${DEMO.overran.length} job${DEMO.overran.length === 1 ? "" : "s"} ran over estimate`, desc: "Action required" });
  if (DEMO.late.length) alerts.push({ dot: "med", headline: `${DEMO.late.length} deployment${DEMO.late.length === 1 ? "" : "s"}/arrival${DEMO.late.length === 1 ? "" : "s"} ran late`, desc: "Monitor closely" });
  if (DEMO.maintenance.length) alerts.push({ dot: "high", headline: `${DEMO.maintenance.length} maintenance item${DEMO.maintenance.length === 1 ? "" : "s"} overdue`, desc: "Escalation needed" });
  return alerts;
}

function countHighRisk() {
  return DEMO.late.filter((l) => l.risk === "high").length + DEMO.maintenance.filter((m) => m.risk === "high").length;
}

function calloutSummaryText() {
  const rate = Math.round((DEMO.kpis[0].value / DEMO.jobsScheduled) * 100);
  return `Overall operations are ${rate >= 75 ? "on track" : "behind schedule"}. ${rate}% of jobs completed, ${DEMO.approvals.length} pending approval${DEMO.approvals.length === 1 ? "" : "s"}, and ${countHighRisk()} risk${countHighRisk() === 1 ? "" : "s"} need attention.`;
}

function greetingWord() {
  const h = new Date().getHours();
  return h < 12 ? "morning" : h < 18 ? "afternoon" : "evening";
}

function buildActionsRecommended() {
  const items = [];
  if (DEMO.approvals.length) items.push(`Approve ${DEMO.approvals.length} pending item${DEMO.approvals.length === 1 ? "" : "s"}`);
  if (DEMO.late.length) items.push(`Follow up on ${DEMO.late.length} late deployment${DEMO.late.length === 1 ? "" : "s"}/arrival${DEMO.late.length === 1 ? "" : "s"}`);
  if (DEMO.overran.length) items.push(`Review ${DEMO.overran.length} job${DEMO.overran.length === 1 ? "" : "s"} that ran over estimate`);
  const overdue = computedUnworkedJobs();
  if (overdue) items.push(`Clear ${overdue} overdue job${overdue === 1 ? "" : "s"}`);
  if (DEMO.maintenance.length) items.push(`Resolve ${DEMO.maintenance.length} overdue maintenance item${DEMO.maintenance.length === 1 ? "" : "s"}, starting with ${DEMO.maintenance[0].asset}`);
  return items;
}

// All 4 bullets are computed from real DEMO data (none hardcoded) — #1 is the
// first thing in this app to actually read DEMO.kpis[0].spark.
function buildAiInsights() {
  const spark = DEMO.kpis[0].spark || [];
  const last = spark[spark.length - 1];
  const prev = spark[spark.length - 2];
  const delta = last != null && prev != null ? last - prev : null;
  const completedText =
    delta == null ? "Job completions are being tracked shift over shift."
    : delta > 0 ? `Jobs completed rose by ${delta} versus the previous shift.`
    : delta < 0 ? `Jobs completed fell by ${Math.abs(delta)} versus the previous shift.`
    : "Jobs completed held steady versus the previous shift.";
  const unworked = computedUnworkedJobs();
  return [
    { icon: "trend",  text: completedText },
    { icon: "users",  text: `Team utilization is optimal at ${DEMO.team.utilizationRate}%.` },
    { icon: "target", text: `On-time performance is holding at ${DEMO.gauge.value}% today.` },
    { icon: "alarm",  text: `Focus on clearing ${unworked} unworked job${unworked === 1 ? "" : "s"} to stay on target.` },
  ];
}

/* --------------------------- dashboard: KPI card ----------------------------- */
function buildKpiCard({ label, value, sub, tone, delta, icon }) {
  const subHtml = sub ? `<div class="stat-card2-sub stat-card2-sub-plain">${esc(sub)}</div>` : "";
  const deltaHtml = delta
    ? `<div class="stat-card2-sub stat-card2-sub-${delta.dir === "up" ? "up" : "down"}">
        <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor"><path d="${delta.dir === "up" ? "M12 4l8 12H4z" : "M12 20 4 8h16z"}"/></svg>
        ${esc(delta.delta)} vs yesterday
      </div>`
    : "";
  return `
    <div class="stat-card2">
      <div class="stat-card2-icon stat-card2-icon-${tone}">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${CAT_ICON[icon]}</svg>
      </div>
      <div>
        <div class="stat-card2-value">${esc(value)}</div>
        <div class="stat-card2-label">${esc(label)}</div>
        ${subHtml}${deltaHtml}
      </div>
    </div>`;
}

/* --------------------------- dashboard: section builders --------------------- */
// Status KPIs only — revenue moved to its own dedicated section
// (revenueOverviewSectionHtml) and the narrative paragraph to its own card
// (yesterdaySummaryCardHtml), matching the reorganized reference layout.
function executiveSummarySectionHtml() {
  const unworked = computedUnworkedJobs();
  const cards = [
    buildKpiCard({ label: "Total Jobs", value: DEMO.jobsScheduled, sub: "scheduled for the shift", tone: "info", icon: "calendar" }),
    buildKpiCard({
      label: "Jobs Completed", value: DEMO.kpis[0].value, tone: "success", icon: "check",
      sub: `${Math.round((DEMO.kpis[0].value / DEMO.jobsScheduled) * 100)}% completion rate`,
      delta: DEMO.kpis[0].trend ? { dir: DEMO.kpis[0].trend.dir, delta: DEMO.kpis[0].trend.delta } : null,
    }),
    buildKpiCard({ label: "Jobs Pending", value: DEMO.jobsPending, sub: "rolled into today", tone: "warning", icon: "clock" }),
    buildKpiCard({ label: "Pending Approvals", value: DEMO.approvals.length, sub: "ready to approve", tone: "purple", icon: "shield" }),
    buildKpiCard({ label: "Unworked Jobs", value: unworked, sub: "never picked up", tone: "danger", icon: "alarm" }),
  ].join("");

  return `
    <section class="db-section" id="sec-executive-summary">
      <div class="db-callout">
        <div class="db-callout-main">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><path d="M15 4V2M15 16v-2M8 9h2M20 9h2M17.8 11.8 19 13M15 9h0M17.8 6.2 19 5M3 21l9-9M12.2 6.2 11 5"/></svg>
          <div>
            <p class="db-callout-title">Good ${greetingWord()}, ${esc(DEMO.userName)}! Here's your AI-generated briefing.</p>
            <p class="db-callout-sub">${esc(calloutSummaryText())}</p>
          </div>
        </div>
        <span class="db-callout-badge">Data as of ${esc(generatedAtTime)} · Complete</span>
      </div>
      <div class="db-stat-row">${cards}</div>
    </section>`;
}

// The AI narrative paragraph, promoted to its own card (used to live inline
// at the bottom of Executive Summary) so it sits alongside Schedule
// Highlights and Risks & Alerts instead of stretching the KPI section.
function yesterdaySummaryCardHtml() {
  return `
    <div class="op-card db-card">
      <div class="db-card-head"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M9 13h6M9 17h6M9 9h1"/></svg>Yesterday Summary</div>
      <p class="rp-narrative">${esc(currentNarrative)}</p>
    </div>`;
}

// Revenue Overview: 3 stat blocks (Yesterday/This Week/Month-to-Date), a
// trailing-7-day trend bar chart, and a same-day revenue-by-operation donut.
// All of it comes from REVENUE, computed by applyShiftMetrics() from the
// same "yesterday" anchor date as the status KPIs above, so the whole
// dashboard describes one consistent day.
function revenueStatBlockHtml({ value, label, sub, deltaPct, sparkline }) {
  const deltaHtml = deltaPct != null
    ? `<span class="revenue-stat-delta-${deltaPct >= 0 ? "up" : "down"}">${deltaPct >= 0 ? "↑" : "↓"} ${Math.abs(deltaPct)}% vs prior week</span>`
    : "";
  const sparkHtml = sparkline ? `<div class="revenue-stat-spark">${buildSparklineSvg(sparkline)}</div>` : "";
  return `
    <div class="revenue-stat-card">
      <div class="revenue-stat-value">${esc(value)}</div>
      <div class="revenue-stat-label">${esc(label)}</div>
      <div class="revenue-stat-sub">${esc(sub)}${deltaHtml}</div>
      ${sparkHtml}
    </div>`;
}

function buildSparklineSvg(values, { width = 80, height = 22, color = TONE.success } = {}) {
  if (values.length < 2) return "";
  const max = Math.max(...values), min = Math.min(...values);
  const range = max - min || 1;
  const points = values.map((v, i) => {
    const x = (i / (values.length - 1)) * width;
    const y = height - ((v - min) / range) * height;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><polyline points="${points}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}

// Rounds a step up to a "nice" 1/2/5/10 × 10^n number, Heckbert-style, so
// axis ticks read like $20K/$40K instead of $17,432/$34,864.
function niceStep(value) {
  if (value <= 0) return 1;
  const exp = Math.floor(Math.log10(value));
  const frac = value / Math.pow(10, exp);
  const niceFrac = frac < 1.5 ? 1 : frac < 3 ? 2 : frac < 7 ? 5 : 10;
  return niceFrac * Math.pow(10, exp);
}
function fmtUSDShort(n) {
  return n >= 1000 ? `$${Math.round(n / 1000)}K` : fmtUSD(n);
}

function buildBarChartHtml(series) {
  const rawMax = Math.max(...series.map((s) => s.revenue), 1);
  const step = niceStep(rawMax / 3);
  const axisMax = Math.ceil(rawMax / step) * step;
  const axisTicks = [];
  for (let v = axisMax; v >= 0; v -= step) axisTicks.push(v);

  const lastIdx = series.length - 1;
  const bars = series.map((s, i) => {
    const pct = axisMax > 0 ? Math.max(2, Math.round((s.revenue / axisMax) * 100)) : 0;
    const [mm, dd, yyyy] = s.date.split("/");
    const label = new Date(Number(yyyy), Number(mm) - 1, Number(dd))
      .toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const isLast = i === lastIdx;
    return `
      <div class="bar-chart-col">
        ${isLast ? `<div class="bar-chart-value">${fmtUSD(s.revenue)}</div>` : ""}
        <div class="bar-chart-bar${isLast ? " bar-chart-bar-highlight" : ""}" style="height:${pct}%" title="${esc(label)}: ${fmtUSD(s.revenue)}"></div>
        <div class="bar-chart-label">${esc(label)}</div>
      </div>`;
  }).join("");
  const gridlines = axisTicks.map((t) => {
    const top = axisMax > 0 ? ((axisMax - t) / axisMax) * 100 : 0;
    return `<div class="bar-chart-gridline" style="top:${top}%"></div>`;
  }).join("");
  return `
    <div class="bar-chart">
      <div class="bar-chart-axis">${axisTicks.map((t) => `<span>${fmtUSDShort(t)}</span>`).join("")}</div>
      <div class="bar-chart-bars">${gridlines}${bars}</div>
    </div>`;
}

// Top 4 operation types by yesterday's revenue + an "Other" bucket for the
// rest, so the donut stays readable even though the source data has ~10
// operation categories (most of them one-off).
function revenueOperationDonutHtml(byOperation, total) {
  const palette = [TONE.info, TONE.success, TONE.warning, TONE.purple, TONE.danger];
  const top = byOperation.slice(0, 4);
  const rest = total - top.reduce((sum, o) => sum + o.revenue, 0);
  const slices = rest > 0.5 ? [...top, { operation: "Other", revenue: rest }] : top;
  const legend = slices.map((s, i) => `
    <div class="donut-legend-row">
      <span class="donut-legend-dot" style="background:${palette[i % palette.length]}"></span>
      <span class="donut-legend-label" title="${esc(s.operation)}">${esc(s.operation)}</span>
      <span class="donut-legend-count">${fmtUSD(s.revenue)} (${total ? Math.round((s.revenue / total) * 100) : 0}%)</span>
    </div>`).join("");
  return `
    <div class="db-donut-row">
      <div class="donut-wrap" style="width:130px;height:130px">
        ${buildDonutSvg(slices.map((s, i) => ({ value: s.revenue, color: palette[i % palette.length] })), { size: 130, stroke: 18 })}
        <div class="donut-center-label"><strong>${fmtUSD(total)}</strong><span>Total</span></div>
      </div>
      <div class="donut-legend">${legend}</div>
    </div>`;
}

function revenueOverviewSectionHtml() {
  const stats = [
    revenueStatBlockHtml({
      value: fmtUSD(REVENUE.revenueYesterday), label: "Revenue Yesterday", sub: `${REVENUE.billableJobsYesterday} billable jobs`,
      sparkline: REVENUE.dailyTrend.map((d) => d.revenue),
    }),
    revenueStatBlockHtml({ value: fmtUSD(REVENUE.revenue7d), label: "Revenue This Week", sub: `${REVENUE.jobs7d} jobs`, deltaPct: REVENUE.revenue7dDeltaPct }),
    revenueStatBlockHtml({ value: fmtUSD(REVENUE.revenueMTD), label: "Revenue Month-to-Date", sub: `${REVENUE.jobsMTD} jobs` }),
  ].join("");
  return `
    <section class="db-section" id="sec-revenue-overview">
      <div class="op-card db-card">
        <div class="db-card-head"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${CAT_ICON.dollar}</svg>Revenue Overview</div>
        <div class="revenue-overview-row">
          <div class="revenue-stat-group">${stats}</div>
          <div class="revenue-chart-col">
            <p class="revenue-chart-title">Daily Revenue Trend</p>
            ${buildBarChartHtml(REVENUE.dailyTrend)}
          </div>
          <div class="revenue-chart-col">
            <p class="revenue-chart-title">Revenue by Operation Type</p>
            ${revenueOperationDonutHtml(REVENUE.byOperationYesterday, REVENUE.revenueYesterday)}
          </div>
        </div>
      </div>
    </section>`;
}

function jobsOverviewCardHtml() {
  const segs = jobsOverviewSegments();
  const total = DEMO.jobsScheduled;
  const legend = segs.map((s) => `
    <div class="donut-legend-row">
      <span class="donut-legend-dot" style="background:${TONE[s.tone]}"></span>
      <span class="donut-legend-label">${esc(s.label)}</span>
      <span class="donut-legend-count">${s.value} (${Math.round((s.value / total) * 100)}%)</span>
    </div>`).join("");
  return `
    <div class="op-card db-card">
      <div class="db-card-head"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${CAT_ICON.calendar}</svg>Jobs Overview</div>
      <p class="db-card-caption">Distribution by status</p>
      <div class="db-donut-row">
        <div class="donut-wrap">
          ${buildDonutSvg(segs.map((s) => ({ value: s.value, color: TONE[s.tone] })))}
          <div class="donut-center-label"><strong>${total}</strong><span>Total</span></div>
        </div>
        <div class="donut-legend">${legend}</div>
      </div>
      <span class="db-card-link">View all jobs →</span>
    </div>`;
}

// Single-shift schedule performance only — the report covers one shift, so
// this deliberately has no forward-looking (tomorrow/this-week) data.
function scheduleHighlightsCardHtml() {
  const late = DEMO.late.length;
  const onTime = Math.max(0, DEMO.jobsScheduled - late);
  const rows = [
    { label: "Jobs Scheduled", count: DEMO.jobsScheduled, status: `${onTime} on time · ${late} late` },
    { label: "Tickets Closed", count: DEMO.ticketsClosed, status: `across ${DEMO.sitesTouched} sites` },
    { label: "On-Time Rate", count: `${DEMO.gauge.value}%`, status: DEMO.gauge.value >= 75 ? "On track" : "Below target" },
  ];
  return `
    <div class="op-card db-card">
      <div class="db-card-head"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${CAT_ICON.clock}</svg>Schedule Highlights</div>
      ${rows.map((r) => `
        <div class="schedule-highlight-row">
          <span class="schedule-highlight-label">${esc(r.label)}</span>
          <div class="schedule-highlight-meta">
            <span class="schedule-highlight-count">${esc(r.count)}</span>
            <span class="schedule-highlight-status">${esc(r.status)}</span>
          </div>
        </div>`).join("")}
      <span class="db-card-link">View shift details →</span>
    </div>`;
}

function risksAlertsCardHtml() {
  const alerts = buildRiskAlerts();
  return `
    <div class="op-card db-card">
      <div class="db-card-head">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${CAT_ICON.alarm}</svg>
        Risks &amp; Alerts
        ${alerts.length ? `<span class="risk-alert-badge">${alerts.length}</span>` : ""}
      </div>
      ${alerts.map((a) => `
        <div class="risk-alert-row">
          <span class="risk-dot risk-dot-${a.dot}"></span>
          <div>
            <div class="risk-alert-headline">${esc(a.headline)}</div>
            <div class="risk-alert-desc">${esc(a.desc)}</div>
          </div>
        </div>`).join("")}
      <span class="db-card-link">View all alerts →</span>
    </div>`;
}

function aiInsightsSectionHtml() {
  const insights = buildAiInsights();
  return `
    <div class="op-card db-card db-card-flex">
      <div class="db-card-head"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 4V2M15 16v-2M8 9h2M20 9h2M17.8 11.8 19 13M15 9h0M17.8 6.2 19 5M3 21l9-9M12.2 6.2 11 5"/></svg>AI Insights</div>
      <div class="ai-insight-list">
        ${insights.map((i) => `
          <div class="ai-insight-item">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;color:#5A8DEE">${CAT_ICON[i.icon]}</svg>
            <span>${esc(i.text)}</span>
          </div>`).join("")}
      </div>
    </div>`;
}

function approvalsPendingSectionHtml() {
  return `
    <div class="op-card db-card">
      <div class="db-card-head"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${CAT_ICON.shield}</svg>Approvals &amp; Pending (${DEMO.approvals.length})</div>
      ${DEMO.approvals.map((a) => `
        <div class="approval-row">
          <div>
            <div class="approval-row-title">${esc(a.title)}</div>
            <div class="approval-row-meta">${esc(a.meta)}</div>
          </div>
          <span class="badge-type">${esc(a.type)}</span>
          <button type="button" class="approve-btn" disabled title="Simulated — approving isn't wired up in this demo">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            Approve
          </button>
        </div>`).join("")}
    </div>`;
}

function teamUtilizationSectionHtml() {
  const avgHours = (DEMO.kpis[3].value / DEMO.crewClockedIn).toFixed(1);
  const rows = [
    { label: "Crew Clocked In", value: DEMO.crewClockedIn, icon: "users" },
    { label: "Hours Worked", value: DEMO.kpis[3].value, icon: "clock" },
    { label: "Avg Hours / Crew Member", value: avgHours, icon: "target" },
    { label: "Team Utilization", value: `${DEMO.team.utilizationRate}%`, icon: "trend" },
  ];
  return `
    <div class="op-card db-card">
      <div class="db-card-head"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${CAT_ICON.users}</svg>Team &amp; Utilization</div>
      <div class="db-stat-row db-stat-row-plain">
        ${rows.map((r) => `
          <div class="team-stat-row">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:#5A8DEE;flex-shrink:0">${CAT_ICON[r.icon]}</svg>
            <div>
              <div class="team-stat-value">${esc(r.value)}</div>
              <div class="team-stat-label">${esc(r.label)}</div>
            </div>
          </div>`).join("")}
      </div>
    </div>`;
}

function actionsRecommendedSectionHtml() {
  const items = buildActionsRecommended();
  return `
    <div class="op-card db-card">
      <div class="db-card-head"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${CAT_ICON.target}</svg>Actions Recommended</div>
      ${items.map((text) => `
        <div class="action-item">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;color:#5A8DEE"><circle cx="12" cy="12" r="9"/></svg>
          <span>${esc(text)}</span>
        </div>`).join("")}
    </div>`;
}

/* --------------------------- dashboard: loading skeleton --------------------- */
// Mirrors renderDashboard()'s section ids 1:1 so sidebar scroll-spy targets
// exist even mid-load, and so the real content drops into the same shape.
function renderDashboardSkeleton() {
  const kpiSkel = Array.from({ length: 5 }, () => `
    <div class="stat-card2"><div class="skel skel-value"></div><div class="skel skel-label"></div></div>`).join("");
  const cardSkel = `
    <div class="op-card db-card">
      <div class="skel skel-title" style="width:140px"></div>
      <div class="skel skel-line" style="margin-top:14px"></div>
      <div class="skel skel-line" style="width:80%"></div>
      <div class="skel skel-line" style="width:60%"></div>
    </div>`;
  return `
    <section class="db-section" id="sec-executive-summary">
      <div class="db-callout skel-narrative-box">
        <div class="skel skel-line" style="width:60%"></div>
        <div class="skel skel-line" style="width:85%;margin-bottom:0"></div>
      </div>
      <div class="db-stat-row">${kpiSkel}</div>
    </section>
    <section class="db-section" id="sec-revenue-overview">${cardSkel}</section>
    <section class="db-section" id="sec-yesterday-summary">${cardSkel}</section>
    <div class="db-row-2col">
      <section class="db-section" id="sec-schedule-highlights">${cardSkel}</section>
      <section class="db-section" id="sec-risks-alerts">${cardSkel}</section>
    </div>
    <div class="db-row-2col">
      <section class="db-section" id="sec-jobs-overview">${cardSkel}</section>
      <section class="db-section" id="sec-ai-insights">${cardSkel}</section>
    </div>
    <section class="db-section" id="sec-team-utilization">${cardSkel}</section>
    <section class="db-section" id="sec-approvals-pending">${cardSkel}</section>
    <section class="db-section" id="sec-actions-recommended">${cardSkel}</section>`;
}

function renderDashboard() {
  $("dashboardMain").innerHTML = [
    executiveSummarySectionHtml(),
    revenueOverviewSectionHtml(),
    `<section class="db-section" id="sec-yesterday-summary">${yesterdaySummaryCardHtml()}</section>`,
    `<div class="db-row-2col">
       <section class="db-section" id="sec-schedule-highlights">${scheduleHighlightsCardHtml()}</section>
       <section class="db-section" id="sec-risks-alerts">${risksAlertsCardHtml()}</section>
     </div>`,
    `<div class="db-row-2col">
       <section class="db-section" id="sec-jobs-overview">${jobsOverviewCardHtml()}</section>
       <section class="db-section" id="sec-ai-insights">${aiInsightsSectionHtml()}</section>
     </div>`,
    `<section class="db-section" id="sec-team-utilization">${teamUtilizationSectionHtml()}</section>`,
    `<section class="db-section" id="sec-approvals-pending">${approvalsPendingSectionHtml()}</section>`,
    `<section class="db-section" id="sec-actions-recommended">${actionsRecommendedSectionHtml()}</section>`,
  ].join("");
  dashboardRendered = true;
  wireScrollSpy();
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
        <div class="ep-client-row"><span class="ep-client-label">Sent</span><span class="ep-client-value">${esc(generatedAtTime)} today</span></div>
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

// Plain bullet lines (no table/grid) — used for the condensed "Briefing
// Highlights" summary, kept deliberately lighter than the detail tables.
function inlineBulletList(items) {
  return items.map((text) =>
    `<p style="margin:0 0 6px;font-size:12.5px;line-height:1.5;color:#2b2f38;">&bull;&nbsp; ${esc(text)}</p>`
  ).join("");
}

// A short digest of what's new on the dashboard beyond the stat grid/tables
// below — shift schedule performance, team utilization, and the top
// recommended actions — summarized in a few lines rather than mirroring the
// full dashboard cards (donut chart, AI Insights grid, etc.) in the email.
// Single-shift data only, matching the rest of the report's scope.
function buildEmailHighlights() {
  const late = DEMO.late.length;
  const onTime = Math.max(0, DEMO.jobsScheduled - late);
  return [
    `${DEMO.jobsScheduled} jobs scheduled — ${onTime} on time, ${late} late, ${DEMO.gauge.value}% on-time rate`,
    `Team utilization is at ${DEMO.team.utilizationRate}%, with ${DEMO.crewClockedIn} crew clocked in`,
    ...buildActionsRecommended().slice(0, 3),
  ];
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
            ${inlineSectionCard("Briefing highlights", null, inlineBulletList(buildEmailHighlights()), "#5A8DEE")}
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

async function openEmailPreview() {
  await Swal.fire({
    html: emailPreviewHtml() + sendToFormHtml(),
    width: 700,
    padding: "1.25rem",
    showConfirmButton: true,
    confirmButtonText: "Close",
    confirmButtonColor: "#5A8DEE",
    showClass: { popup: "swal-email-show" },
    hideClass: { popup: "swal-email-hide" },
    didOpen: (popup) => wireSendTrialEmail(popup),
  });
}

/* --------------------------- dashboard: generate / regenerate --------------- */
// Shown whenever Gemini isn't reachable/configured. Built from live DEMO
// values (same shape as the old hardcoded DEMO.narrative paragraph) rather
// than a fixed string, so it can't drift out of sync with the KPI tiles
// once applyShiftMetrics() starts overwriting ticketsClosed/sitesTouched/
// crewClockedIn from real data.
function fallbackNarrative() {
  const totalOverHours = DEMO.overran.reduce((sum, o) => sum + o.over, 0);
  const top = DEMO.maintenance[0];
  return `Yesterday's shift closed ${DEMO.ticketsClosed} ticket${DEMO.ticketsClosed === 1 ? "" : "s"} across ${DEMO.sitesTouched} site${DEMO.sitesTouched === 1 ? "" : "s"}. Of ${DEMO.jobsScheduled} jobs scheduled, ${DEMO.kpis[0].value} were completed and ${DEMO.jobsPending} carried over into today; ${DEMO.overran.length} ran over estimate for a combined ${totalOverHours.toFixed(2)} hours of overrun, and ${DEMO.late.length} deployments or arrivals were logged late. ${DEMO.crewClockedIn} crew members clocked a total of ${DEMO.kpis[3].value} hours. ${DEMO.approvals.length} approvals are awaiting your review, and ${DEMO.maintenance.length} maintenance items are overdue${top ? ` — the highest priority being the ${top.asset}, now ${top.due}` : ""}.`;
}

async function fetchNarrative() {
  try {
    const res = await fetch("/api/generate-report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildReportStatsPayload()),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.ok && data.narrative) {
      currentNarrative = data.narrative;
    } else {
      console.warn("Gemini generation unavailable, using curated narrative:", data.error);
      currentNarrative = fallbackNarrative();
    }
  } catch (err) {
    console.warn("Gemini generation request failed, using curated narrative:", err);
    currentNarrative = fallbackNarrative();
  }
  generatedAtTime = nowTime();
  updateAboutText();
}

// Counts derived straight from a day's job rows. Deliberately NOT
// jobsScheduled/Completed/Pending/InProgress: those four are a closed,
// mutually-exclusive split (jobsScheduled ≡ their sum, see
// computedUnworkedJobs()) tied to a jobStatus field this data doesn't have —
// overwriting jobsScheduled alone from a real, independently-varying count
// broke that invariant (Unworked Jobs would clamp to 0 on any day real
// volume undercut the curated completed+pending+inProgress). Tickets
// Closed/Sites Touched/Crew Clocked In carry no such constraint, so they're
// safe to derive from real data.
// Also sums Total ($) and counts billable (Total > 0) rows, and buckets
// revenue by Operation — all for this single day only, so the Revenue
// Overview section's donut total matches its "Revenue Yesterday" stat block.
function computeShiftMetrics(jobs, dateStr) {
  const rows = jobs.filter((j) => j["Start Date"] === dateStr);
  const tickets = new Set(), sites = new Set(), crew = new Set();
  let revenue = 0, billableJobs = 0;
  const byOperation = new Map();
  rows.forEach((j) => {
    String(j["Tickets"]).split(",").forEach((t) => tickets.add(t.trim()));
    sites.add(`${j["Lease"]}|${j["Well"]}`);
    String(j["Employee"]).split(",").forEach((e) => crew.add(e.trim()));
    const total = j["Total"] || 0;
    revenue += total;
    if (total > 0) billableJobs++;
    byOperation.set(j["Operation"], (byOperation.get(j["Operation"]) || 0) + total);
  });
  return {
    rowCount: rows.length, ticketsClosed: tickets.size, sitesTouched: sites.size, crewClockedIn: crew.size,
    revenue, billableJobs,
    byOperation: [...byOperation.entries()]
      .map(([operation, opRevenue]) => ({ operation, revenue: opRevenue }))
      .filter((o) => o.revenue > 0)
      .sort((a, b) => b.revenue - a.revenue),
  };
}

// Sums Total ($) for the `days`-day window ending on (and including) endDate.
function sumRevenueWindow(jobs, endDate, days) {
  const start = new Date(endDate);
  start.setDate(start.getDate() - (days - 1));
  let revenue = 0, count = 0;
  jobs.forEach((j) => {
    const d = new Date(j["Start Date"]);
    if (d >= start && d <= endDate) { revenue += j["Total"] || 0; count++; }
  });
  return { revenue, count };
}

// Sums Total ($) from the 1st of endDate's month through endDate.
function sumRevenueMTD(jobs, endDate) {
  let revenue = 0, count = 0;
  jobs.forEach((j) => {
    const d = new Date(j["Start Date"]);
    if (d.getFullYear() === endDate.getFullYear() && d.getMonth() === endDate.getMonth() && d <= endDate) {
      revenue += j["Total"] || 0; count++;
    }
  });
  return { revenue, count };
}

// Per-day revenue for the trailing `days` days ending on endDate — feeds the
// Daily Revenue Trend bar chart.
function dailyRevenueSeries(jobs, endDate, days) {
  const series = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(endDate);
    d.setDate(d.getDate() - i);
    const key = shiftDateKey(d);
    const revenue = jobs.filter((j) => j["Start Date"] === key).reduce((sum, j) => sum + (j["Total"] || 0), 0);
    series.push({ date: key, revenue });
  }
  return series;
}

// Overwrites Tickets Closed / Sites Touched / Crew Clocked In on DEMO, and
// rebuilds REVENUE, all anchored to the same "yesterday" date (the shift
// this briefing reports on) so every number on the dashboard describes the
// same day. Falls back to the most recent date the file actually has if the
// exact day falls outside its window (e.g. demoed well after the data was
// generated), and leaves DEMO/REVENUE untouched if neither lookup finds
// anything.
function applyShiftMetrics(data) {
  if (!data || !Array.isArray(data.jobs) || !data.jobs.length) return;
  const jobs = data.jobs;
  // Zeroed to midnight: sumRevenueWindow/sumRevenueMTD compare whole days,
  // and a `new Date()` timestamp (today's wall-clock time) as the boundary
  // would cut off part of the oldest day in every window — e.g. loading the
  // page at 4pm would exclude same-day-but-earlier rows from 7 days back.
  let anchorDate = new Date();
  anchorDate.setDate(anchorDate.getDate() - 1);
  anchorDate.setHours(0, 0, 0, 0);
  let shift = computeShiftMetrics(jobs, shiftDateKey(anchorDate));
  if (!shift.rowCount && data.dateRange?.end) {
    anchorDate = new Date(data.dateRange.end);
    anchorDate.setHours(0, 0, 0, 0);
    shift = computeShiftMetrics(jobs, shiftDateKey(anchorDate));
  }
  if (!shift.rowCount) return;

  DEMO.ticketsClosed = shift.ticketsClosed;
  DEMO.sitesTouched = shift.sitesTouched;
  DEMO.crewClockedIn = shift.crewClockedIn;

  const week = sumRevenueWindow(jobs, anchorDate, 7);
  const prevWeekEnd = new Date(anchorDate);
  prevWeekEnd.setDate(prevWeekEnd.getDate() - 7);
  const prevWeek = sumRevenueWindow(jobs, prevWeekEnd, 7);
  const mtd = sumRevenueMTD(jobs, anchorDate);

  REVENUE = {
    revenueYesterday: shift.revenue,
    jobsYesterday: shift.rowCount,
    billableJobsYesterday: shift.billableJobs,
    revenue7d: week.revenue,
    jobs7d: week.count,
    revenue7dDeltaPct: prevWeek.revenue > 0 ? Math.round(((week.revenue - prevWeek.revenue) / prevWeek.revenue) * 100) : null,
    revenueMTD: mtd.revenue,
    jobsMTD: mtd.count,
    byOperationYesterday: shift.byOperation,
    dailyTrend: dailyRevenueSeries(jobs, anchorDate, 7),
  };
}

// Pulls revenue/billing figures and the 3 derivable shift counts from the
// synthetic Field Service Report data checked into
// assets/field-service-data.json. On failure (file missing, bad fetch)
// REVENUE keeps its hardcoded fallback and DEMO keeps its curated values,
// so the dashboard never shows a blank/broken card.
async function fetchRevenueData() {
  try {
    const res = await fetch("assets/field-service-data.json");
    if (!res.ok) throw new Error(`status ${res.status}`);
    const data = await res.json();
    applyShiftMetrics(data);
  } catch (err) {
    console.warn("Field service data unavailable, using fallback figures:", err);
  }
}

// Runs once, on load: skeleton → fetch → full render. Builds the entire
// section DOM (and wires scroll-spy) exactly once.
async function generateBriefing() {
  $("dashboardMain").innerHTML = renderDashboardSkeleton();
  const minDelay = new Promise((r) => setTimeout(r, 700));
  // Must land before fetchNarrative() so its payload (built from DEMO)
  // reflects the shift counts applyShiftMetrics() may have just overwritten
  // — otherwise the AI narrative and the dashboard could cite different
  // numbers for the same shift.
  await fetchRevenueData();
  await Promise.all([fetchNarrative(), minDelay]);
  renderDashboard();
}

// Runs on every subsequent "Generate New Briefing" click: only the AI
// narrative paragraph re-fetches and repaints — the KPIs/donut/schedule/risks
// are deterministic and never change, so they never re-flash, and scroll
// position is naturally preserved (no full-page re-render).
async function regenerateNarrative() {
  const fab = $("fabGenerate");
  const el = document.querySelector(".rp-narrative");
  fab.disabled = true;
  if (el) el.classList.add("narrative-pulse");
  await fetchNarrative();
  if (el) {
    el.textContent = currentNarrative;
    el.classList.remove("narrative-pulse");
  }
  fab.disabled = false;
}

/* --------------------------- dashboard: scroll-spy --------------------------- */
function wireScrollSpy() {
  const sections = Array.from(document.querySelectorAll(".db-section[id]"));
  if (!sections.length) return;
  // IntersectionObserver callbacks only report entries whose intersection
  // status *changed* since the last firing, not every currently-visible
  // section — so state must be tracked across callbacks rather than derived
  // solely from the latest `entries` array, or a fast scroll (e.g. from a
  // sidebar click) can leave a stale/wrong section highlighted.
  const intersecting = new Map(sections.map((s) => [s.id, false]));
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((e) => intersecting.set(e.target.id, e.isIntersecting));
    const visible = sections
      .filter((s) => intersecting.get(s.id))
      .sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top);
    if (visible[0]) setActiveSidebarItem(visible[0].id);
  }, { rootMargin: "-140px 0px -55% 0px", threshold: 0 });
  sections.forEach((s) => observer.observe(s));
}

function setActiveSidebarItem(id) {
  $("dbSidebarNav").querySelectorAll("[data-section]").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.section === id);
  });
}

/* --------------------------- dashboard: header buttons + FAB ---------------- */
function wireHeaderButtons() {
  $("shareEmailBtn")?.addEventListener("click", openEmailPreview);
  $("downloadPdfBtn")?.addEventListener("click", () => window.print());
}

function wireFab() {
  $("fabGenerate").addEventListener("click", () => {
    if (dashboardRendered) regenerateNarrative(); // ignore clicks during the initial load
  });
}

/* --------------------------- boot ------------------------------------------ */
document.addEventListener("DOMContentLoaded", () => {
  renderNav();
  renderChrome();
  renderSidebar();
  $("dbHeader").innerHTML = headerHtml();
  wireHeaderButtons();
  wireFab();
  generateBriefing();
});
