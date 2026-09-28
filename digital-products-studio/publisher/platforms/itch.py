"""itch.io: upload builds and files with butler (itch.io's official command-line uploader).

itch.io has no API to create project pages: create each project once on itch.io (title, price,
cover, "Kind of project"), then this pushes the files, and every later version, automatically.

Setup:
  1. Install butler: https://itch.io/docs/butler/installing.html
  2. BUTLER_API_KEY: https://itch.io/user/settings/api-keys → generate a key
"""

import os
import shutil
import subprocess

from lib.http import PublishError


class Itch:
    name = "itch"

    def __init__(self, http, state_dir=None, log=print, runner=subprocess.run):
        self.http = http
        self.log = log
        self.run = runner

    def ready(self):
        if not os.environ.get("BUTLER_API_KEY"):
            return False, "BUTLER_API_KEY not set"
        if not shutil.which("butler"):
            return False, "butler is not installed"
        return True, "ok"

    def publish(self, product, make_public):
        cfg = product.platform("itch")
        builds = cfg.get("builds", [])
        if not builds:
            raise PublishError("itch: no builds configured")
        results = []
        for b in builds:
            path = product.path(b["path"])
            cmd = ["butler", "push", str(path), b["target"], "--userversion", product.version]
            if b.get("if_changed", True):
                cmd.append("--if-changed")
            if not self.http.live:
                self.log("  [dry-run] " + " ".join(cmd))
                results.append(b["target"])
                continue
            if not shutil.which("butler"):
                raise PublishError("butler is not installed: https://itch.io/docs/butler/installing.html")
            proc = self.run(cmd, capture_output=True, text=True)
            if proc.returncode != 0:
                raise PublishError(f"butler push failed for {b['target']}: {proc.stderr or proc.stdout}")
            self.log(f"  ✓ pushed {path.name} → {b['target']}")
            results.append(b["target"])
        page = cfg.get("page_url", "")
        if not make_public:
            self.log("  note: set the project's visibility to Public on itch.io when you're ready.")
        return {"id": ", ".join(results), "url": page, "state": "uploaded"}
