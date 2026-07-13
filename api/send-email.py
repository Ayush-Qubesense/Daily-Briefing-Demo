"""
Vercel Python serverless function — POST /api/send-email
----------------------------------------------------------------------------
Sends the report the frontend already rendered (subject + self-contained
HTML) to a recipient over SMTP. This is the one real side effect in an
otherwise fully static/curated demo, so it's kept intentionally small: no
database, no queue, no templating engine — the HTML arrives ready-to-send
from script.js and this function's only job is to relay it over SMTP.

Required environment variables (see ../.env.example):
    SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, FROM_EMAIL
"""

import os
import re
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from flask import Flask, jsonify, request

app = Flask(__name__)

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
REQUIRED_ENV_VARS = ("SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS", "FROM_EMAIL")


def _missing_env_vars():
    return [name for name in REQUIRED_ENV_VARS if not os.environ.get(name)]


def _send_smtp_mail(to_addr, subject, html_body):
    from_addr = os.environ["FROM_EMAIL"]

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = from_addr
    msg["To"] = to_addr
    msg.attach(MIMEText("This report requires an HTML-capable email client to view.", "plain"))
    msg.attach(MIMEText(html_body, "html"))

    host = os.environ["SMTP_HOST"]
    port = int(os.environ["SMTP_PORT"])
    with smtplib.SMTP(host, port, timeout=20) as server:
        server.starttls()
        server.login(os.environ["SMTP_USER"], os.environ["SMTP_PASS"])
        server.send_message(msg)


@app.route("/api/send-email", methods=["POST"])
def send_email():
    missing = _missing_env_vars()
    if missing:
        return jsonify({
            "ok": False,
            "error": f"Server is missing SMTP configuration: {', '.join(missing)}. "
                     f"Set these as environment variables (see .env.example) and restart.",
        }), 500

    body = request.get_json(silent=True) or {}
    to_addr = str(body.get("to", "")).strip()
    subject = str(body.get("subject", "")).strip() or "Daily Work Report"
    html_body = body.get("html")

    if not to_addr or not EMAIL_RE.match(to_addr):
        return jsonify({"ok": False, "error": "Please provide a valid recipient email address."}), 400
    if not html_body or not isinstance(html_body, str):
        return jsonify({"ok": False, "error": "Missing email HTML content."}), 400

    try:
        _send_smtp_mail(to_addr, subject, html_body)
    except smtplib.SMTPAuthenticationError:
        return jsonify({
            "ok": False,
            "error": "SMTP authentication failed — check SMTP_USER/SMTP_PASS "
                     "(for Gmail, this must be an App Password, not your login password).",
        }), 502
    except Exception as exc:  # noqa: BLE001 — surface the real reason to the demo UI
        return jsonify({"ok": False, "error": f"Failed to send: {exc}"}), 502

    return jsonify({"ok": True})
