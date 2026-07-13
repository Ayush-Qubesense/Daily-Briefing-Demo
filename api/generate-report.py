"""
Vercel Python serverless function — POST /api/generate-report
----------------------------------------------------------------------------
Writes the report's narrative paragraph with Gemini, from numbers the
frontend already computed (reportCategories() etc. in script.js). This
function never computes or recounts anything itself — it's handed a fixed
set of stats and asked to narrate them, so an LLM is never doing arithmetic.

Required environment variable: GEMINI_API_KEY (from aistudio.google.com/apikey)
Optional: GEMINI_MODEL (defaults to gemini-2.5-flash)
"""

import os

from flask import Flask, jsonify, request

app = Flask(__name__)

DEFAULT_MODEL = "gemini-2.5-flash"

PROMPT_TEMPLATE = """You are writing the narrative summary paragraph for an internal
operations "Daily Work Report" sent to a {role}. Write 3 to 5 sentences, professional
report tone, third person, no greeting, no markdown, no bullet points — plain prose only.

Use ONLY the numbers given below. Do not invent, estimate, or recompute any figure, and
do not add facts that aren't given.

Shift data:
- Jobs scheduled: {jobsScheduled}
- Jobs completed: {jobsCompleted}
- Jobs pending (rolled into today): {jobsPending}
- Tickets closed: {ticketsClosed}, across {sitesTouched} sites
- Jobs that ran over estimate: {overranCount}, combined overrun {overranHours} hours
- Late deployments/arrivals: {lateCount}
- Crew clocked in: {crewClockedIn}, total hours worked: {hoursWorked}
- Approvals pending: {approvalsCount}
- Overdue maintenance items: {maintenanceCount}; top priority: {topMaintenanceAsset} ({topMaintenanceDue})

Write the paragraph now."""


def _missing_env_vars():
    return [] if os.environ.get("GEMINI_API_KEY") else ["GEMINI_API_KEY"]


def _build_prompt(stats):
    top = stats.get("topMaintenance") or {}
    return PROMPT_TEMPLATE.format(
        role=stats.get("role", "Manager / Supervisor"),
        jobsScheduled=stats.get("jobsScheduled", 0),
        jobsCompleted=stats.get("jobsCompleted", 0),
        jobsPending=stats.get("jobsPending", 0),
        ticketsClosed=stats.get("ticketsClosed", 0),
        sitesTouched=stats.get("sitesTouched", 0),
        overranCount=stats.get("overranCount", 0),
        overranHours=stats.get("overranHours", 0),
        lateCount=stats.get("lateCount", 0),
        crewClockedIn=stats.get("crewClockedIn", 0),
        hoursWorked=stats.get("hoursWorked", 0),
        approvalsCount=stats.get("approvalsCount", 0),
        maintenanceCount=stats.get("maintenanceCount", 0),
        topMaintenanceAsset=top.get("asset", "none"),
        topMaintenanceDue=top.get("due", "n/a"),
    )


@app.route("/api/generate-report", methods=["POST"])
def generate_report():
    missing = _missing_env_vars()
    if missing:
        return jsonify({
            "ok": False,
            "error": f"Server is missing Gemini configuration: {', '.join(missing)}. "
                     f"Set this as an environment variable (see .env.example) and restart.",
        }), 500

    stats = request.get_json(silent=True) or {}
    if not stats:
        return jsonify({"ok": False, "error": "Missing shift stats in request body."}), 400

    try:
        from google import genai

        model = os.environ.get("GEMINI_MODEL", DEFAULT_MODEL)
        client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])
        response = client.models.generate_content(model=model, contents=_build_prompt(stats))
        narrative = (response.text or "").strip()
        if not narrative:
            return jsonify({"ok": False, "error": "Gemini returned an empty response."}), 502
    except Exception as exc:  # noqa: BLE001 — surface the real reason for debugging
        return jsonify({"ok": False, "error": f"Gemini generation failed: {exc}"}), 502

    return jsonify({"ok": True, "narrative": narrative})
