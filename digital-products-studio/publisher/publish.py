#!/usr/bin/env python3
"""List products on Etsy, Gumroad, Polar and itch.io from one catalog file.

SAFE BY DEFAULT
  • Without --live nothing is sent: you see every API call that WOULD be made (dry run).
  • Without --publish listings are created as DRAFTS so you can review them first.
  • Credentials come only from environment variables (never from files in this repo).
  • Products already listed (recorded in publisher/state/published.json) are skipped.

Commands
  python publisher/publish.py plan                              # what's ready, what's missing
  python publisher/publish.py run                               # dry run for every product/platform
  python publisher/publish.py run --live                        # create DRAFT listings for real
  python publisher/publish.py run --live --publish --product watermark-studio --platform gumroad
  python publisher/publish.py etsy-auth                         # one-time Etsy authorization
  python publisher/publish.py etsy-taxonomy --search planner    # find an Etsy category id

Environment variables
  ETSY_KEYSTRING, ETSY_SHARED_SECRET, ETSY_SHOP_ID (optional)
  GUMROAD_ACCESS_TOKEN
  POLAR_ACCESS_TOKEN, POLAR_SERVER=production|sandbox
  BUTLER_API_KEY (itch.io, with the butler tool installed)
"""

import argparse
import datetime as dt
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

from lib.catalog import PLATFORMS, CatalogError, load, placeholders, validate_etsy  # noqa: E402
from lib.http import Http, PublishError  # noqa: E402
from platforms.etsy import Etsy, authorize  # noqa: E402
from platforms.gumroad import Gumroad  # noqa: E402
from platforms.itch import Itch  # noqa: E402
from platforms.polar import Polar  # noqa: E402

STATE_DIR = HERE / "state"
STATE_FILE = STATE_DIR / "published.json"
DEFAULT_CATALOG = HERE.parent / "catalog" / "catalog.json"
CLASSES = {"etsy": Etsy, "gumroad": Gumroad, "polar": Polar, "itch": Itch}


def load_state(path=STATE_FILE):
    try:
        return json.loads(Path(path).read_text())
    except (OSError, ValueError):
        return {}


def save_state(state, path=STATE_FILE):
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    Path(path).write_text(json.dumps(state, indent=2))


def make_clients(http, log=print):
    return {name: cls(http, STATE_DIR, log) for name, cls in CLASSES.items()}


def cmd_plan(products, clients, state, out=print):
    out(f"{'product':<28} {'platform':<9} {'status'}")
    out("-" * 90)
    for p in products:
        for name in PLATFORMS:
            if not p.enabled(name):
                continue
            notes = []
            done = state.get(p.id, {}).get(name)
            if done:
                notes.append(f"already listed ({done.get('state')}) {done.get('url') or done.get('id')}")
            missing = p.missing_files(name)
            if missing:
                notes.append("missing files: " + ", ".join(m.name for m in missing[:3]) + ("…" if len(missing) > 3 else ""))
            if name == "etsy":
                notes += validate_etsy(p)
            notes += [f"replace placeholder '{v}' in the catalog" for v in placeholders(p, name)]
            ok, why = clients[name].ready()
            if not ok:
                notes.append(why)
            out(f"{p.id:<28} {name:<9} {'READY' if not notes else '; '.join(notes)}")


def cmd_run(products, clients, state, live, make_public, only_product=None, only_platform=None, out=print,
            state_path=STATE_FILE):
    results, failures = [], []
    for p in products:
        if only_product and p.id != only_product:
            continue
        for name in PLATFORMS:
            if only_platform and name != only_platform:
                continue
            if not p.enabled(name):
                continue
            if state.get(p.id, {}).get(name):
                out(f"\n= {p.id} on {name}: already listed, skipping ({state[p.id][name].get('url') or state[p.id][name].get('id')})")
                continue
            out(f"\n→ {p.id} on {name} ({'LIVE' if live else 'dry run'}, {'public' if make_public else 'draft'})")
            unedited = placeholders(p, name)
            if unedited and live:
                failures.append((p.id, name, "catalog still has placeholders: " + ", ".join(unedited)))
                out("  ✗ replace the placeholders in catalog.json first: " + ", ".join(unedited))
                continue
            missing = p.missing_files(name)
            if missing and live:
                failures.append((p.id, name, "missing files: " + ", ".join(str(m) for m in missing)))
                out("  ✗ missing files, skipped: " + ", ".join(m.name for m in missing))
                continue
            try:
                res = clients[name].publish(p, make_public)
            except PublishError as e:
                failures.append((p.id, name, str(e)))
                out(f"  ✗ {e}")
                continue
            results.append((p.id, name, res))
            if live:
                state.setdefault(p.id, {})[name] = dict(res, at=dt.datetime.now().isoformat(timespec="seconds"))
                save_state(state, state_path)
                out(f"  ✓ done: {res.get('url') or res.get('id')}")
    out("\nSummary: " + (f"{len(results)} succeeded" + (f", {len(failures)} failed" if failures else "")))
    for pid, name, why in failures:
        out(f"  ✗ {pid} / {name}: {why[:300]}")
    return results, failures


def main(argv=None):
    ap = argparse.ArgumentParser(description="Publish digital products to marketplaces via their official APIs.")
    ap.add_argument("--catalog", default=str(DEFAULT_CATALOG))
    sub = ap.add_subparsers(dest="cmd", required=True)
    sub.add_parser("plan", help="show readiness per product and platform")
    run = sub.add_parser("run", help="create listings (dry run unless --live)")
    run.add_argument("--live", action="store_true", help="really call the APIs")
    run.add_argument("--publish", action="store_true", help="make listings public (default: drafts)")
    run.add_argument("--product", help="only this product id")
    run.add_argument("--platform", choices=PLATFORMS, help="only this platform")
    sub.add_parser("etsy-auth", help="authorize this tool on your Etsy shop (one time)")
    tax = sub.add_parser("etsy-taxonomy", help="search Etsy categories")
    tax.add_argument("--search", required=True)
    sub.add_parser("gumroad-categories", help="list Gumroad product categories")
    args = ap.parse_args(argv)

    try:
        _, products = load(args.catalog)
    except CatalogError as e:
        print(f"Catalog error: {e}")
        return 2

    live = getattr(args, "live", False) or args.cmd in ("etsy-auth", "etsy-taxonomy", "gumroad-categories")
    http = Http(live=live)
    clients = make_clients(http)
    state = load_state()
    try:
        if args.cmd == "plan":
            cmd_plan(products, clients, state)
        elif args.cmd == "run":
            if args.live and args.publish:
                print("LIVE + PUBLISH: listings will be public immediately.")
            _, failures = cmd_run(products, clients, state, args.live, args.publish, args.product, args.platform)
            return 1 if failures else 0
        elif args.cmd == "etsy-auth":
            authorize(http, STATE_DIR)
        elif args.cmd == "etsy-taxonomy":
            for tid, path in clients["etsy"].taxonomy(args.search):
                print(f"{tid:>8}  {path}")
        elif args.cmd == "gumroad-categories":
            print(json.dumps(clients["gumroad"].categories(), indent=2))
    except PublishError as e:
        print(f"Error: {e}")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
