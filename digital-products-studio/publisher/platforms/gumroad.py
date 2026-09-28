"""Gumroad API v2: create products with files, cover and thumbnail.

Credential (environment variable):
  GUMROAD_ACCESS_TOKEN   Gumroad → Settings → Advanced → Applications → create an app → "Generate access token"
                         (needs the edit_products scope)

Flow (checked against Gumroad's open-source API code, antiwork/gumroad, Sept 2026):
  POST /v2/files/presign {filename, file_size}  → {upload_id, key, parts[{part_number, presigned_url}]}
  PUT  each 100 MB part to its presigned_url    → ETag
  POST /v2/files/complete {upload_id, key, parts[{part_number, etag}]} → {file_url}
  POST /v2/products {name, description(html), price(cents), tags[], files[{url, display_name}], draft}
  POST /v2/direct_uploads {blob{filename, byte_size, checksum(md5 base64), content_type}} → signed_id + upload URL
  POST /v2/products/{id}/covers {signed_blob_id};  POST /v2/products/{id}/thumbnail {signed_blob_id}
"""

import base64
import hashlib
import mimetypes
import os

from lib.http import PublishError
from lib.textfmt import to_html

API = "https://api.gumroad.com/v2"
PART_SIZE = 100 * 1024 * 1024


def valid_tags(tags):
    """Gumroad tags: 2-20 characters, no commas, can't start with '#' (Tag model validation)."""
    return [t.strip() for t in tags if 2 <= len(t.strip()) <= 20 and "," not in t and not t.strip().startswith("#")]


class Gumroad:
    name = "gumroad"

    def __init__(self, http, state_dir=None, log=print, api=API):
        self.http = http
        self.log = log
        self.api = api

    def ready(self):
        return (True, "ok") if os.environ.get("GUMROAD_ACCESS_TOKEN") else (False, "GUMROAD_ACCESS_TOKEN not set")

    def _h(self):
        token = os.environ.get("GUMROAD_ACCESS_TOKEN", "")
        if self.http.live and not token:
            raise PublishError("Set GUMROAD_ACCESS_TOKEN.")
        return {"Authorization": f"Bearer {token}"}

    def _check(self, resp, what):
        if self.http.live and not resp.get("success", False):
            raise PublishError(f"Gumroad {what}: {resp.get('message', resp)}")
        return resp

    def upload_file(self, path):
        size = path.stat().st_size
        if not self.http.live:
            self.log(f"  [dry-run] upload {path.name} ({size / 1048576:.1f} MB) via presign → PUT parts → complete")
            return f"<file_url:{path.name}>"
        pre = self._check(self.http.request("POST", f"{self.api}/files/presign", headers=self._h(),
                                            json_body={"filename": path.name, "file_size": size},
                                            what=f"presign {path.name}"), "presign")
        done = []
        with open(path, "rb") as fh:
            for part in pre["parts"]:
                chunk = fh.read(PART_SIZE)
                resp = self.http.request("PUT", part["presigned_url"], data=chunk, expect_json=False,
                                         what=f"upload {path.name} part {part['part_number']}")
                done.append({"part_number": part["part_number"], "etag": (resp.header("ETag") or "").strip()})
        fin = self._check(self.http.request("POST", f"{self.api}/files/complete", headers=self._h(),
                                            json_body={"upload_id": pre["upload_id"], "key": pre["key"], "parts": done},
                                            what=f"complete {path.name}"), "complete upload")
        return fin["file_url"]

    def direct_upload(self, path):
        data = path.read_bytes()
        ctype = mimetypes.guess_type(path.name)[0] or "image/jpeg"
        blob = {"filename": path.name, "byte_size": len(data),
                "checksum": base64.b64encode(hashlib.md5(data).digest()).decode(), "content_type": ctype}
        res = self.http.request("POST", f"{self.api}/direct_uploads", headers=self._h(), json_body={"blob": blob},
                                what=f"reserve upload {path.name}")
        if self.http.live:
            du = res["direct_upload"]
            self.http.request("PUT", du["url"], headers=du.get("headers") or {}, data=data, expect_json=False,
                              what=f"upload {path.name}")
        return res.get("signed_id")

    def categories(self):
        """Gumroad's product categories (use one as "category" in the catalog)."""
        res = self.http.request("GET", f"{self.api}/categories", headers=self._h(), what="list categories")
        return res.get("categories", res)

    def publish(self, product, make_public):
        cfg = product.platform("gumroad")
        files = [product.path(p) for p in cfg.get("files", [])] or product.files()
        file_entries = [{"url": self.upload_file(f), "display_name": f.name} for f in files]
        body = {
            "name": cfg.get("name", product.title),
            "description": to_html(cfg.get("description") or product.description),
            "price": int(round(float(cfg.get("price", product.price)) * 100)),
            "custom_summary": cfg.get("summary", product.summary),
            "tags": valid_tags(cfg.get("tags", product.tags))[:10],
            "files": file_entries,
            "draft": not make_public,
        }
        if cfg.get("custom_permalink"):
            body["custom_permalink"] = cfg["custom_permalink"]
        if cfg.get("category"):
            body["category"] = cfg["category"]
        res = self._check(self.http.request("POST", f"{self.api}/products", headers=self._h(), json_body=body,
                                            what="create product"), "create product")
        prod = res.get("product") if isinstance(res.get("product"), dict) else res
        pid = prod.get("id")
        if self.http.live and res.get("warning"):
            self.log(f"  ! Gumroad: {res['warning']}")
        cover = cfg.get("cover") or (str(product.images()[0]) if product.images() else None)
        if cover:
            sid = self.direct_upload(product.path(cover))
            self.http.request("POST", f"{self.api}/products/{pid}/covers", headers=self._h(),
                              json_body={"signed_blob_id": sid}, what="add cover")
        if cfg.get("thumbnail"):
            sid = self.direct_upload(product.path(cfg["thumbnail"]))
            self.http.request("POST", f"{self.api}/products/{pid}/thumbnail", headers=self._h(),
                              json_body={"signed_blob_id": sid}, what="set thumbnail")
        return {"id": pid, "url": prod.get("short_url", f"<short_url of {pid}>"),
                "state": "published" if make_public else "draft"}
