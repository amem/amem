"""Etsy Open API v3: OAuth (PKCE) and digital listings.

Credentials (environment variables):
  ETSY_KEYSTRING, ETSY_SHARED_SECRET   from https://www.etsy.com/developers/your-apps
  ETSY_SHOP_ID                         optional (otherwise read from /users/me)
Tokens are saved by `publish.py etsy-auth` in publisher/state/etsy_tokens.json (git-ignored).

Endpoints used (all under https://api.etsy.com/v3/application):
  POST  /shops/{shop_id}/listings                          createDraftListing (type=download)
  POST  /shops/{shop_id}/listings/{id}/images              uploadListingImage (multipart)
  POST  /shops/{shop_id}/listings/{id}/files               uploadListingFile  (multipart)
  POST  /shops/{shop_id}/listings/{id}/videos              uploadListingVideo (multipart)
  PATCH /shops/{shop_id}/listings/{id}                     updateListing (state=active)
Since 9 Feb 2026 Etsy requires the x-api-key header as "keystring:shared_secret".
"""

import base64
import hashlib
import json
import os
import secrets
import time
import urllib.parse
import webbrowser
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path

from lib.catalog import validate_etsy
from lib.http import PublishError

API = "https://api.etsy.com/v3/application"
TOKEN_URL = "https://api.etsy.com/v3/public/oauth/token"
AUTH_URL = "https://www.etsy.com/oauth/connect"
SCOPES = "listings_r listings_w shops_r"
REDIRECT = "http://localhost:3003/callback"


def _creds():
    key, secret = os.environ.get("ETSY_KEYSTRING"), os.environ.get("ETSY_SHARED_SECRET")
    if not key or not secret:
        raise PublishError("Set ETSY_KEYSTRING and ETSY_SHARED_SECRET (from your Etsy app page).")
    return key, secret


class Etsy:
    name = "etsy"

    def __init__(self, http, state_dir, log=print, api=API, token_url=TOKEN_URL):
        self.http = http
        self.log = log
        self.api = api
        self.token_url = token_url
        self.token_file = Path(state_dir) / "etsy_tokens.json"
        self._shop_id = os.environ.get("ETSY_SHOP_ID")

    # --- auth ---------------------------------------------------------------------
    def ready(self):
        has_keys = bool(os.environ.get("ETSY_KEYSTRING") and os.environ.get("ETSY_SHARED_SECRET"))
        if not has_keys:
            return False, "ETSY_KEYSTRING / ETSY_SHARED_SECRET not set"
        if not self.token_file.exists():
            return False, "not authorized yet: run `publish.py etsy-auth`"
        return True, "ok"

    def _headers(self):
        if not self.http.live:  # dry-run works without credentials
            return {"x-api-key": "<keystring>:<shared_secret>", "Authorization": "Bearer <token>"}
        key, secret = _creds()
        headers = {"x-api-key": f"{key}:{secret}"}
        if self.http.live:
            headers["Authorization"] = "Bearer " + self._access_token()
        return headers

    def _access_token(self):
        tokens = json.loads(self.token_file.read_text())
        if tokens["expires_at"] - 60 < time.time():
            key, _ = _creds()
            fresh = self.http.request("POST", self.token_url, form={
                "grant_type": "refresh_token", "client_id": key, "refresh_token": tokens["refresh_token"]},
                what="refresh Etsy token")
            tokens = _save_tokens(self.token_file, fresh)
        return tokens["access_token"]

    def shop_id(self):
        if self._shop_id:
            return self._shop_id
        me = self.http.request("GET", f"{self.api}/users/me", headers=self._headers(), what="get my shop id")
        self._shop_id = str(me.get("shop_id"))
        return self._shop_id

    # --- publishing -------------------------------------------------------------------
    def publish(self, product, make_public):
        cfg = product.platform("etsy")
        problems = validate_etsy(product)
        if problems:
            raise PublishError("Etsy data problems: " + "; ".join(problems))
        shop = self.shop_id()
        h = self._headers()
        body = {
            "quantity": int(cfg.get("quantity", 999)),
            "title": cfg.get("title", product.title),
            "description": cfg.get("description") or product.description,
            "price": float(cfg.get("price", product.price)),
            "who_made": cfg.get("who_made", "i_did"),
            "when_made": cfg.get("when_made", "2020_2026"),
            "taxonomy_id": int(cfg["taxonomy_id"]),
            "type": "download",
            "tags": cfg.get("tags", product.tags),
            "materials": cfg.get("materials", []),
            "is_supply": False,
            "should_auto_renew": True,
        }
        listing = self.http.request("POST", f"{self.api}/shops/{shop}/listings", headers=h, json_body=body,
                                    what="create draft listing")
        lid = listing.get("listing_id")
        images = [product.path(p) for p in cfg.get("images", [])] or product.images()
        for rank, img in enumerate(images[:20], 1):
            self.http.request("POST", f"{self.api}/shops/{shop}/listings/{lid}/images", headers=h,
                              form={"rank": rank}, files={"image": img}, what=f"upload image {rank}: {img.name}")
        files = [product.path(p) for p in cfg.get("files", [])] or product.files()
        for rank, f in enumerate(files[:5], 1):
            self.http.request("POST", f"{self.api}/shops/{shop}/listings/{lid}/files", headers=h,
                              form={"name": f.name, "rank": rank}, files={"file": f}, what=f"upload file {f.name}")
        if cfg.get("video"):
            video = product.path(cfg["video"])
            self.http.request("POST", f"{self.api}/shops/{shop}/listings/{lid}/videos", headers=h,
                              form={"name": video.name}, files={"video": video}, what="upload video")
        if make_public:
            self.http.request("PATCH", f"{self.api}/shops/{shop}/listings/{lid}", headers=h,
                              json_body={"state": "active"}, what="activate listing")
        return {"id": lid, "url": f"https://www.etsy.com/listing/{lid}", "state": "active" if make_public else "draft"}

    def taxonomy(self, search):
        nodes = self.http.request("GET", f"{self.api}/seller-taxonomy/nodes", headers=self._headers(), what="seller taxonomy")
        found = []

        def walk(items, trail):
            for n in items or []:
                path = trail + [n.get("name", "")]
                if search.lower() in n.get("name", "").lower():
                    found.append((n.get("id"), " > ".join(path)))
                walk(n.get("children"), path)

        walk(nodes.get("results") if isinstance(nodes, dict) else [], [])
        return found


# --- one-time authorization (PKCE) ---------------------------------------------------------
def _save_tokens(path, data):
    tokens = {
        "access_token": data["access_token"],
        "refresh_token": data["refresh_token"],
        "expires_at": time.time() + int(data.get("expires_in", 3600)),
    }
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(tokens))
    try:
        os.chmod(path, 0o600)
    except OSError:
        pass
    return tokens


def pkce_pair():
    verifier = base64.urlsafe_b64encode(secrets.token_bytes(48)).rstrip(b"=").decode()
    challenge = base64.urlsafe_b64encode(hashlib.sha256(verifier.encode()).digest()).rstrip(b"=").decode()
    return verifier, challenge


def authorize(http, state_dir, log=print, open_browser=True):
    """Open Etsy's consent page, catch the redirect on localhost:3003, save tokens."""
    key, _ = _creds()
    verifier, challenge = pkce_pair()
    state = secrets.token_urlsafe(16)
    url = AUTH_URL + "?" + urllib.parse.urlencode({
        "response_type": "code", "client_id": key, "redirect_uri": REDIRECT, "scope": SCOPES,
        "state": state, "code_challenge": challenge, "code_challenge_method": "S256"})
    result = {}

    class Handler(BaseHTTPRequestHandler):
        def do_GET(self):  # noqa: N802
            q = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
            result.update({k: v[0] for k, v in q.items()})
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.end_headers()
            self.wfile.write("<h2>Etsy connected. You can close this tab.</h2>".encode())

        def log_message(self, *args):
            pass

    log("1. Make sure your Etsy app lists this redirect URI: " + REDIRECT)
    log("2. Opening Etsy to approve access (or paste this link in your browser):\n   " + url)
    if open_browser:
        webbrowser.open(url)
    server = HTTPServer(("127.0.0.1", 3003), Handler)
    server.timeout = 300
    server.handle_request()
    server.server_close()
    if result.get("state") != state or "code" not in result:
        raise PublishError("Authorization failed or was cancelled: " + json.dumps(result))
    data = http.request("POST", TOKEN_URL, form={
        "grant_type": "authorization_code", "client_id": key, "redirect_uri": REDIRECT,
        "code": result["code"], "code_verifier": verifier}, what="exchange code for tokens")
    _save_tokens(Path(state_dir) / "etsy_tokens.json", data)
    log("Etsy authorized. Tokens saved to publisher/state/etsy_tokens.json (keep this file private).")
