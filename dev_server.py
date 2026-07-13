"""
Local-only dev server — NOT deployed to Vercel.

Vercel only turns files under api/ into serverless functions, so this file is
invisible to the actual deployment. It exists purely so you can test the full
flow (static site + real SMTP send + Gemini report generation) locally
without installing/logging into the Vercel CLI: it imports the same Flask
`app` object from api/send-email.py, registers api/generate-report.py's view
function onto that same app, and adds routes to serve the static files next
to them — all three under one local port, same as they'll be on Vercel.

Run:  python dev_server.py
"""
import importlib.util
import os
from pathlib import Path

from flask import abort, send_from_directory

ROOT = Path(__file__).parent


def load_env_file(path):
    if not path.exists():
        return
    for line in path.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        os.environ.setdefault(key.strip(), value.strip())


load_env_file(ROOT / ".env")

def load_api_module(name, filename):
    spec = importlib.util.spec_from_file_location(name, ROOT / "api" / filename)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


send_email = load_api_module("send_email", "send-email.py")
generate_report = load_api_module("generate_report", "generate-report.py")

app = send_email.app
app.add_url_rule(
    "/api/generate-report",
    view_func=generate_report.generate_report,
    methods=["POST"],
)

STATIC_FILES = {"index.html", "script.js", "styles.css", "data.js"}


@app.route("/")
def index():
    return send_from_directory(ROOT, "index.html")


@app.route("/<string:name>")
def root_file(name):
    if name not in STATIC_FILES:
        abort(404)
    return send_from_directory(ROOT, name)


@app.route("/assets/<path:name>")
def assets(name):
    return send_from_directory(ROOT / "assets", name)


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 3000))
    missing_smtp = send_email._missing_env_vars()
    if missing_smtp:
        print(f"Warning: missing SMTP env vars {missing_smtp} — Send Trial Email will fail until .env is filled in.")
    missing_gemini = generate_report._missing_env_vars()
    if missing_gemini:
        print(f"Note: missing {missing_gemini} — reports will use the curated narrative (Gemini fallback).")
    print(f"Serving http://localhost:{port}")
    app.run(host="127.0.0.1", port=port)
