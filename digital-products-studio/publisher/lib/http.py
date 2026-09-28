"""Tiny HTTP client on the standard library: JSON, multipart uploads, raw PUTs, retries, dry-run."""

import json
import mimetypes
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid
from pathlib import Path

USER_AGENT = "digital-products-studio-publisher/1.0"


class PublishError(Exception):
    """An API call failed. `status` is the HTTP status (or None for network errors)."""

    def __init__(self, message, status=None, body=None):
        super().__init__(message)
        self.status = status
        self.body = body


class Placeholder(dict):
    """Returned in dry-run mode: any key you read gives a readable placeholder like '<listing_id>'."""

    def __missing__(self, key):
        return f"<{key}>"

    def get(self, key, default=None):
        return self[key]


class Response:
    def __init__(self, status, headers, body):
        self.status = status
        self.headers = headers
        self.body = body

    @property
    def json(self):
        if not self.body:
            return {}
        try:
            return json.loads(self.body.decode("utf-8"))
        except ValueError:
            return {}

    def header(self, name):
        for k, v in self.headers.items():
            if k.lower() == name.lower():
                return v
        return None


def encode_multipart(fields=None, files=None):
    """fields: {name: value}; files: {name: path}. Returns (body bytes, content type)."""
    boundary = "----publisher" + uuid.uuid4().hex
    out = bytearray()
    for name, value in (fields or {}).items():
        out += f"--{boundary}\r\nContent-Disposition: form-data; name=\"{name}\"\r\n\r\n{value}\r\n".encode()
    for name, path in (files or {}).items():
        path = Path(path)
        ctype = mimetypes.guess_type(path.name)[0] or "application/octet-stream"
        out += (f"--{boundary}\r\nContent-Disposition: form-data; name=\"{name}\"; filename=\"{path.name}\"\r\n"
                f"Content-Type: {ctype}\r\n\r\n").encode()
        out += path.read_bytes()
        out += b"\r\n"
    out += f"--{boundary}--\r\n".encode()
    return bytes(out), f"multipart/form-data; boundary={boundary}"


def _summary(payload, limit=300):
    text = json.dumps(payload, ensure_ascii=False) if not isinstance(payload, str) else payload
    return text if len(text) <= limit else text[:limit] + "…"


class Http:
    def __init__(self, live=False, log=print, retries=3, timeout=120, opener=None):
        self.live = live
        self.log = log
        self.retries = retries
        self.timeout = timeout
        self._open = opener or urllib.request.urlopen
        self.calls = []  # (method, url) of every call, useful for tests and reports

    def request(self, method, url, headers=None, json_body=None, form=None, files=None, data=None,
                content_type=None, expect_json=True, what=None):
        """Send a request (or, in dry-run, print it and return placeholders)."""
        self.calls.append((method, url))
        label = what or f"{method} {url}"
        if not self.live:
            detail = ""
            if json_body is not None:
                detail = " " + _summary(json_body)
            elif files:
                detail = " files=" + ", ".join(f"{k}={Path(v).name}" for k, v in files.items())
            elif data is not None:
                detail = f" <{len(data):,} bytes>"
            self.log(f"  [dry-run] {label}{detail}")
            return Response(200, {"ETag": '"dry-run-etag"'}, b"") if not expect_json else Placeholder()

        body = None
        hdrs = {"User-Agent": USER_AGENT, "Accept": "application/json"}
        hdrs.update(headers or {})
        if json_body is not None:
            body = json.dumps(json_body).encode("utf-8")
            hdrs["Content-Type"] = "application/json"
        elif files:
            body, hdrs["Content-Type"] = encode_multipart(form, files)
        elif form is not None:
            body = urllib.parse.urlencode(form).encode("utf-8")
            hdrs["Content-Type"] = "application/x-www-form-urlencoded"
        elif data is not None:
            body = data
            if content_type:
                hdrs["Content-Type"] = content_type

        attempt = 0
        while True:
            attempt += 1
            req = urllib.request.Request(url, data=body, headers=hdrs, method=method)
            try:
                with self._open(req, timeout=self.timeout) as resp:
                    result = Response(resp.status, dict(resp.headers), resp.read())
                break
            except urllib.error.HTTPError as e:
                payload = e.read()
                if e.code in (429, 500, 502, 503, 504) and attempt <= self.retries:
                    wait = float(e.headers.get("Retry-After") or 2 ** attempt)
                    self.log(f"  … {e.code} from server, retrying in {wait:.0f}s")
                    time.sleep(min(wait, 60))
                    continue
                raise PublishError(f"{label} failed: HTTP {e.code} {payload[:500].decode('utf-8', 'replace')}",
                                   e.code, payload) from None
            except urllib.error.URLError as e:
                if attempt <= self.retries:
                    time.sleep(2 ** attempt)
                    continue
                raise PublishError(f"{label} failed: {e.reason}") from None
        self.log(f"  ✓ {label}")
        return result.json if expect_json else result

