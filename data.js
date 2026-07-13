/* ============================================================================
   Daily Activity Briefing — DEMO DATA
   ----------------------------------------------------------------------------
   Content is CURATED for the demo, but modeled 1:1 on the real Qubesense
   NextGen OPRS schema (SP_DailyBriefing_Activity(@ClientID, @date)). Each
   value below maps to a real derivation so the numbers are believable and the
   vocabulary matches the product. No backend, no AI call.

   Real-source mapping (see the pasted schema):
     • Jobs Completed / Rolling / Pending → FormDataPRIDEDispatchTicketChildTotal.jobStatus
     • Tickets Closed / Sites Touched     → FormDataPRIDEDispatchTicket.status = 'Closed'
     • Ran Over Estimate  → JobTotalHours > FormDataPRIDEDispatchTicketChild.EstimatedHours
     • Late Deployment    → DeploymentTimeColorV2 = 'red'  (deploymentDateTimeActual > Scheduled…)
     • Late Arrival       → ETAColour = 'red' AND ReachedToLocation = 'Yes'
     • Approvals Waiting  → ReadyToApproveParent = 1 AND ApprovalStatusParent = 0 (+ child ApprovalStatusChild = 0)
     • Hours Worked / Crew→ FormDataPRIDPayRollReportTimeCardLogs (sum) · headcount = COUNT(DISTINCT EmployeeId)
     • Overdue Maintenance→ MaintenanceDueList: DueDate < now AND Status <> 'Completed' AND IsIgnored = 0

   TO PERSONALIZE FOR A DEMO: change userName / userEmail below. ticketsClosed,
   sitesTouched, and crewClockedIn are overwritten at runtime from
   assets/field-service-data.json (see applyShiftMetrics() in script.js) — edit
   that file to change those 3. jobsScheduled stays fully curated here: it's the
   sum of jobsPending/jobsInProgress/kpis[0] (completed) + a computed "unworked"
   residual (see computedUnworkedJobs() in script.js), so it can't be swapped
   independently without breaking that split. Edit the fields below for
   everything else.
   ============================================================================ */

const DEMO = {
  // --- Persona -------------------------------------------------------------
  userName: "Michael",
  userInitials: "M",
  userEmail: "michael.n@indoglobus.com",
  role: "Manager / Supervisor",
  org: "NG Fleet",
  // Generation time is computed live from the visitor's clock (see nowTime()
  // in script.js), not stored here — a fixed timestamp would go stale.

  // --- AI narrative (the "AI wrote this" moment) ---------------------------
  // No curated paragraph here on purpose: the fallback shown when Gemini is
  // unavailable is now built by fallbackNarrative() in script.js from the
  // fields below, so it can't drift out of sync with the KPI tiles once
  // applyShiftMetrics() overwrites ticketsClosed/sitesTouched/crewClockedIn
  // from assets/field-service-data.json.

  // --- Shift totals + gauge ------------------------------------------------
  jobsScheduled: 14,                            // FormDataPRIDEDispatchTicketChild, shiftdate = @date
  jobsPending: 3,                               // rolled into today · jobStatus = 'Pending'
  jobsInProgress: 1,                            // jobStatus = 'InProgress' — with kpis[0].value (completed) and
                                                 // jobsPending, exhaustively splits jobsScheduled; the 4th ("unworked")
                                                 // bucket is a computed residual, not stored (see script.js)
  ticketsClosed: 6,                             // FormDataPRIDEDispatchTicket.status = 'Closed'
  sitesTouched: 4,                              // COUNT(DISTINCT SiteID) for closed tickets
  crewClockedIn: 16,                            // COUNT(DISTINCT EmployeeId), payroll time-card logs
  gauge: { label: "On-Time Rate", value: 71 },  // (jobsScheduled − late) / jobsScheduled = 10/14

  // --- Team utilization (Team & Utilization) --------------------------------
  team: { utilizationRate: 85 },                // curated: hours worked / hours scheduled

  // --- KPI stat cards ------------------------------------------------------
  // tone → icon/trend accent: success | danger | warning | info
  // trend.good: true = favorable (green) · false = unfavorable (red) · null = neutral (blue)
  // spark = last 7 shifts, for the mini trend line on each card
  kpis: [
    { label: "Jobs Completed",    value: 9,     sub: "of 14 scheduled · 3 rolling", tone: "success", icon: "check",  trend: { delta: "1",    dir: "up",   good: true  }, spark: [6, 7, 7, 8, 7, 8, 9] },
    { label: "Ran Over Estimate", value: 4,     sub: "6.25 h overrun total",        tone: "danger",  icon: "trend",  trend: { delta: "1",    dir: "up",   good: false }, spark: [3, 4, 3, 4, 4, 3, 4] },
    { label: "Approvals Waiting", value: 5,     sub: "ready to approve",            tone: "warning", icon: "shield", trend: { delta: "1",    dir: "up",   good: false }, spark: [3, 3, 4, 4, 4, 5, 5] },
    { label: "Hours Worked",      value: 108.5, sub: "16 crew clocked in",          tone: "info",    icon: "clock",  trend: { delta: "12h",  dir: "up",   good: null  }, spark: [92, 95, 98, 100, 104, 106, 108.5] },
  ],

  // --- Jobs That Ran Over (JobTotalHours > EstimatedHours) -----------------
  overran: [
    { title: "North Site transformer service",    ticket: "DT-2287", est: 6.0, actual: 8.5,  over: 2.5  },
    { title: "HVAC replacement — Central Depot",   ticket: "DT-2290", est: 4.0, actual: 5.25, over: 1.25 },
    { title: "Switchgear inspection — South Site", ticket: "DT-2293", est: 3.0, actual: 4.0,  over: 1.0  },
    { title: "Pump overhaul — East Yard",          ticket: "DT-2299", est: 5.0, actual: 6.5,  over: 1.5  },
  ],

  // --- Late Deployments & Arrivals (DeploymentTimeColorV2/ETAColour='red') --
  // kind: Deployment | Arrival · risk: high (red dot) | med (amber dot)
  late: [
    { title: "Generator swap — North Site",   kind: "Deployment", mins: 28, reason: "Crew reassigned mid-shift", risk: "high" },
    { title: "Pump service — Central Depot",   kind: "Deployment", mins: 17, reason: "Vehicle fault at the yard",  risk: "med"  },
    { title: "Meter install — South Site",     kind: "Arrival",    mins: 22, reason: "Traffic delay en route",     risk: "med"  },
    { title: "Cable pull — East Yard",         kind: "Deployment", mins: 12, reason: "Permit delayed at gate",     risk: "med"  },
  ],

  // --- Approvals Waiting on You --------------------------------------------
  // type → badge: Ticket | Job | Timesheet | Overtime | Purchase Order
  approvals: [
    { title: "Ticket DT-2287 — North Site",       meta: "Ready to approve · 3 child jobs",       type: "Ticket" },
    { title: "Job DT-2290-2 — HVAC completion",   meta: "Awaiting sign-off · completed 4:10 PM",  type: "Job" },
    { title: "Weekly timesheets — Field Crew A",  meta: "9 entries · 102 hrs",                    type: "Timesheet" },
    { title: "Overtime — R. Kumar",               meta: "6.0 hrs OT · North Site",                type: "Overtime" },
    { title: "Purchase order — PO-1042",          meta: "Parts order · $1,240 · East Yard",       type: "Purchase Order" },
  ],

  // --- Overdue Maintenance (MaintenanceDueList) ----------------------------
  // resource: Vehicle | Equipment · risk: high (red) | med (amber)
  maintenance: [
    { asset: "Vehicle NG-114 — Service",       resource: "Vehicle",   due: "2 days overdue", risk: "high" },
    { asset: "Generator GEN-07 — 500 h PM",    resource: "Equipment", due: "1 day overdue",  risk: "high" },
    { asset: "Crane CR-03 — Inspection",       resource: "Equipment", due: "Due today",      risk: "med"  },
    { asset: "Forklift FL-02 — Battery service", resource: "Equipment", due: "Due today",    risk: "med"  },
  ],
};
