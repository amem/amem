"""Polar (polar.sh): one-time products with file downloads, product images and a checkout link.

Credentials (environment variables):
  POLAR_ACCESS_TOKEN   Organization Access Token (Polar dashboard → Settings → Developers)
  POLAR_SERVER         "production" (default) or "sandbox" (https://sandbox.polar.sh, for testing)

Flow (field names from the official polar-sdk 0.32 models):
  POST /v1/files/ {name, mime_type, size, service: downloadable|product_media, upload{parts[{number, chunk_start, chunk_end}]}}
  PUT  each part to its presigned url (with the returned headers) → ETag
  POST /v1/files/{id}/uploaded {id: upload.id, path: upload.path, parts[{number, checksum_etag}]}
  POST /v1/benefits/ {type: downloadables, description, properties{files[ids]}}
  POST /v1/products/ {name, description, prices[{amount_type: fixed, price_amount, price_currency}], medias[ids], visibility}
  POST /v1/products/{id}/benefits {benefits[ids]}
  POST /v1/checkout-links/ {payment_processor: stripe, product_id} → shareable url
"""

import mimetypes
import os

from lib.http import PublishError

SERVERS = {"production": "https://api.polar.sh", "sandbox": "https://sandbox-api.polar.sh"}
CHUNK = 10 * 1024 * 1024


class Polar:
    name = "polar"

    def __init__(self, http, state_dir=None, log=print, api=None):
        self.http = http
        self.log = log
        self.api = api or SERVERS.get(os.environ.get("POLAR_SERVER", "production"), SERVERS["production"])

    def ready(self):
        return (True, "ok") if os.environ.get("POLAR_ACCESS_TOKEN") else (False, "POLAR_ACCESS_TOKEN not set")

    def _h(self):
        token = os.environ.get("POLAR_ACCESS_TOKEN", "")
        if self.http.live and not token:
            raise PublishError("Set POLAR_ACCESS_TOKEN.")
        return {"Authorization": f"Bearer {token}"}

    def upload(self, path, service):
        data = path.read_bytes()
        size = len(data)
        parts = [{"number": i + 1, "chunk_start": start, "chunk_end": min(start + CHUNK, size)}
                 for i, start in enumerate(range(0, max(size, 1), CHUNK))]
        mime = mimetypes.guess_type(path.name)[0] or "application/octet-stream"
        created = self.http.request("POST", f"{self.api}/v1/files/", headers=self._h(), json_body={
            "name": path.name, "mime_type": mime, "size": size, "service": service, "upload": {"parts": parts}},
            what=f"create file {path.name} ({service})")
        if not self.http.live:
            return f"<file_id:{path.name}>"
        upload = created["upload"]
        done = []
        for part in upload["parts"]:
            chunk = data[part["chunk_start"]:part["chunk_end"]]
            resp = self.http.request("PUT", part["url"], headers=part.get("headers") or {}, data=chunk,
                                     expect_json=False, what=f"upload {path.name} part {part['number']}")
            done.append({"number": part["number"], "checksum_etag": (resp.header("ETag") or "").strip()})
        self.http.request("POST", f"{self.api}/v1/files/{created['id']}/uploaded", headers=self._h(),
                          json_body={"id": upload["id"], "path": upload["path"], "parts": done},
                          what=f"complete {path.name}")
        return created["id"]

    def publish(self, product, make_public):
        cfg = product.platform("polar")
        files = [product.path(p) for p in cfg.get("files", [])] or product.files()
        images = [product.path(p) for p in cfg.get("images", [])] or product.images()[:4]
        file_ids = [self.upload(f, "downloadable") for f in files]
        media_ids = [self.upload(img, "product_media") for img in images]
        benefit = self.http.request("POST", f"{self.api}/v1/benefits/", headers=self._h(), json_body={
            "type": "downloadables",
            "description": (cfg.get("benefit_description") or f"{product.title} download")[:40],
            "properties": {"files": file_ids}}, what="create download benefit")
        prod = self.http.request("POST", f"{self.api}/v1/products/", headers=self._h(), json_body={
            "name": cfg.get("name", product.title),
            "description": cfg.get("description") or product.description,
            "prices": [{"amount_type": "fixed", "price_amount": int(round(float(cfg.get("price", product.price)) * 100)),
                        "price_currency": cfg.get("currency", "usd")}],
            "medias": media_ids,
            "visibility": "public" if make_public else "draft",
        }, what="create product")
        self.http.request("POST", f"{self.api}/v1/products/{prod['id']}/benefits", headers=self._h(),
                          json_body={"benefits": [benefit["id"]]}, what="attach download to product")
        url = None
        if make_public:
            link = self.http.request("POST", f"{self.api}/v1/checkout-links/", headers=self._h(),
                                     json_body={"payment_processor": "stripe", "product_id": prod["id"]},
                                     what="create checkout link")
            url = link.get("url")
        return {"id": prod["id"], "url": url, "state": "public" if make_public else "draft"}
