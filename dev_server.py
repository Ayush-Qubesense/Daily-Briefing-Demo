"""
Local-only dev server — NOT deployed to Vercel.

Vercel only turns files under api/ into serverless functions, so this file is
invisible to the actual deployment. It exists purely so you can test the full
flow (static site + real SMTP send) locally without installing/logging into
the Vercel CLI: it imports the same Flask `app` object from
api/send-email.py unchanged and just adds routes to serve the static files
next to it.

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

spec = importlib.util.spec_from_file_location("send_email", ROOT / "api" / "send-email.py")
send_email = importlib.util.module_from_spec(spec)
spec.loader.exec_module(send_email)
app = send_email.app

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
    missing = send_email._missing_env_vars()
    if missing:
        print(f"Warning: missing SMTP env vars {missing} — Send Trial Email will fail until .env is filled in.")
    print(f"Serving http://localhost:{port}")
    app.run(host="127.0.0.1", port=port)
