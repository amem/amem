"""Publisher tests against a fake marketplace server (no real accounts or network needed).

Run from the studio folder:  python -m unittest discover -s publisher/tests -v
"""

import email
import email.policy
import json
import os
import sys
import tempfile
import threading
import time
import unittest
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from unittest import mock

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))

import publish  # noqa: E402
from lib import catalog as catalog_mod  # noqa: E402
from lib.http import Http, PublishError, encode_multipart  # noqa: E402
from lib.textfmt import to_html  # noqa: E402
from platforms.etsy import Etsy, pkce_pair  # noqa: E402
from platforms.gumroad import Gumroad  # noqa: E402
from platforms.itch import Itch  # noqa: E402
from platforms.polar import Polar  # noqa: E402


# ---------------------------------------------------------------------------------------
# Fake marketplace server
# ---------------------------------------------------------------------------------------
class FakeAPI:
    def __init__(self):
        self.requests = []
        self.fail = {}  # path prefix -> (status, body)
        handler = self._handler()
        self.server = ThreadingHTTPServer(("127.0.0.1", 0), handler)
        self.base = f"http://127.0.0.1:{self.server.server_address[1]}"
        threading.Thread(target=self.server.serve_forever, daemon=True).start()

    def close(self):
        self.server.shutdown()
        self.server.server_close()

    def find(self, method, path_part, exact=False):
        return [r for r in self.requests if r["method"] == method
                and (r["path"] == path_part if exact else path_part in r["path"])]

    def _handler(self):
        api = self

        class H(BaseHTTPRequestHandler):
            def _body(self):
                n = int(self.headers.get("Content-Length") or 0)
                return self.rfile.read(n) if n else b""

            def _reply(self, status, obj=None, headers=None):
                data = json.dumps(obj or {}).encode()
                self.send_response(status)
                self.send_header("Content-Type", "application/json")
                for k, v in (headers or {}).items():
                    self.send_header(k, v)
                self.send_header("Content-Length", str(len(data)))
                self.end_headers()
                self.wfile.write(data)

            def _handle(self):
                body = self._body()
                # HTTP header names are case-insensitive: store them lower-cased
                rec = {"method": self.command, "path": self.path,
                       "headers": {k.lower(): v for k, v in self.headers.items()}, "body": body}
                ctype = self.headers.get("Content-Type", "")  # (lookup on the original, case-insensitive object)
                if ctype.startswith("application/json") and body:
                    rec["json"] = json.loads(body)
                api.requests.append(rec)
                for prefix, (status, obj) in api.fail.items():
                    if self.path.startswith(prefix):
                        return self._reply(status, obj)
                p, m, b = self.path, self.command, api.base
                # ---- S3-like part uploads
                if p.startswith("/s3/"):
                    return self._reply(200, {}, {"ETag": '"etag-%d"' % len(body)})
                # ---- Gumroad
                if p == "/gumroad/files/presign":
                    size = rec["json"]["file_size"]
                    return self._reply(200, {"success": True, "upload_id": "up1", "key": "attachments/u/k/file",
                                             "file_url": "https://files/x", "parts": [
                                                 {"part_number": 1, "presigned_url": f"{b}/s3/g1?size={size}"}]})
                if p == "/gumroad/files/complete":
                    return self._reply(200, {"success": True, "file_url": "https://s3/attachments/u/k/" + rec["json"]["key"].split("/")[-1]})
                if p == "/gumroad/products" and m == "POST":
                    return self._reply(200, {"success": True, "product": {"id": "gp_1", "short_url": "https://gum.co/abc"}})
                if p == "/gumroad/direct_uploads":
                    return self._reply(200, {"signed_id": "sig_" + rec["json"]["blob"]["filename"],
                                             "direct_upload": {"url": f"{b}/s3/cover", "headers": {"Content-Type": "image/jpeg"}}})
                if p.startswith("/gumroad/products/gp_1/"):
                    return self._reply(200, {"success": True})
                # ---- Polar
                if p == "/polar/v1/files/":
                    j = rec["json"]
                    parts = [dict(pt, url=f"{b}/s3/p{pt['number']}", headers={"x-amz-test": "1"},
                                  expires_at="2030-01-01T00:00:00Z") for pt in j["upload"]["parts"]]
                    fid = "file_%d" % len(api.find("POST", "/polar/v1/files/", exact=True))
                    return self._reply(201, {"id": fid, "upload": {"id": "u_" + fid, "path": "path/" + fid, "parts": parts}})
                if p.startswith("/polar/v1/files/") and p.endswith("/uploaded"):
                    return self._reply(200, {"id": p.split("/")[4], "is_uploaded": True})
                if p == "/polar/v1/benefits/":
                    return self._reply(201, {"id": "ben_1"})
                if p == "/polar/v1/products/":
                    return self._reply(201, {"id": "prod_1"})
                if p == "/polar/v1/products/prod_1/benefits":
                    return self._reply(200, {"id": "prod_1"})
                if p == "/polar/v1/checkout-links/":
                    return self._reply(201, {"id": "cl_1", "url": "https://buy.polar.sh/cl_1"})
                # ---- Etsy
                if p == "/etsy/token":
                    return self._reply(200, {"access_token": "123.new", "refresh_token": "r2", "expires_in": 3600})
                if p == "/etsy/users/me":
                    return self._reply(200, {"user_id": 123, "shop_id": 777})
                if p == "/etsy/shops/777/listings" and m == "POST":
                    return self._reply(201, {"listing_id": 555})
                if p.startswith("/etsy/shops/777/listings/555"):
                    return self._reply(201 if m == "POST" else 200, {"ok": True})
                if p == "/etsy/seller-taxonomy/nodes":
                    return self._reply(200, {"results": [{"id": 1, "name": "Paper & Party Supplies", "children": [
                        {"id": 2078, "name": "Calendars & Planners", "children": []}]}]})
                return self._reply(404, {"error": "not found " + p})

            do_GET = do_POST = do_PUT = do_PATCH = _handle

            def log_message(self, *a):
                pass

        return H


def multipart_parts(req):
    """Parse a recorded multipart request into {name: (filename, bytes or text)}."""
    raw = b"Content-Type: " + req["headers"]["content-type"].encode() + b"\r\n\r\n" + req["body"]
    msg = email.message_from_bytes(raw, policy=email.policy.HTTP)
    out = {}
    for part in msg.iter_parts():
        name = part.get_param("name", header="content-disposition")
        out[name] = (part.get_filename(), part.get_payload(decode=True))
    return out


# ---------------------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------------------
def make_catalog(tmp, etsy_extra=None):
    root = Path(tmp)
    (root / "dist").mkdir()
    (root / "images").mkdir()
    (root / "listings").mkdir()
    (root / "dist" / "product.zip").write_bytes(b"PK" + os.urandom(3000))
    (root / "images" / "cover.jpg").write_bytes(b"\xff\xd8" + b"img" * 100)
    (root / "images" / "second.jpg").write_bytes(b"\xff\xd8" + b"two" * 50)
    (root / "listings" / "desc.txt").write_text("Great tool.\n\n★ FEATURES\n• Fast\n• Private <3\n", encoding="utf-8")
    etsy = {"enabled": True, "taxonomy_id": 2078, "tags": ["budget", "planner"], "price": 9.99}
    etsy.update(etsy_extra or {})
    cat = {
        "root": "..",
        "products": [{
            "id": "tool", "title": "Handy Tool", "summary": "Does things", "price_usd": 12.5,
            "tags": ["tool", "productivity"], "description_file": "listings/desc.txt",
            "files": ["dist/product.zip"], "images": ["images/cover.jpg", "images/second.jpg"],
            "etsy": etsy,
            "gumroad": {"enabled": True, "custom_permalink": "handy-tool"},
            "polar": {"enabled": True},
            "itch": {"enabled": True, "builds": [{"path": "dist/product.zip", "target": "me/handy-tool:win"}]},
        }]
    }
    (root / "catalog").mkdir()
    path = root / "catalog" / "catalog.json"
    path.write_text(json.dumps(cat))
    return path


class Base(unittest.TestCase):
    def setUp(self):
        self.api = FakeAPI()
        self._tmp = tempfile.TemporaryDirectory()
        self.tmp = Path(self._tmp.name)
        self.catalog = make_catalog(self.tmp)
        _, self.products = catalog_mod.load(self.catalog)
        self.product = self.products[0]
        self.logs = []
        self.http = Http(live=True, log=self.logs.append, retries=0, timeout=10)
        self.env = mock.patch.dict(os.environ, {
            "GUMROAD_ACCESS_TOKEN": "gum-token", "POLAR_ACCESS_TOKEN": "polar-token",
            "ETSY_KEYSTRING": "key123", "ETSY_SHARED_SECRET": "sec456", "BUTLER_API_KEY": "b"})
        self.env.start()

    def tearDown(self):
        self.env.stop()
        self.api.close()
        self._tmp.cleanup()


# ---------------------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------------------
class TextAndCatalogTest(unittest.TestCase):
    def test_to_html_escapes_and_structures(self):
        out = to_html("Hello <script>x</script> **bold** https://a.example/b\n\n★ FEATURES\n• One\n• Two & more")
        self.assertIn("&lt;script&gt;", out)
        self.assertNotIn("<script>", out)
        self.assertIn("<strong>bold</strong>", out)
        self.assertIn('<a href="https://a.example/b">', out)
        self.assertIn("<h3>FEATURES</h3><ul><li>One</li><li>Two &amp; more</li></ul>", out.replace("\n", ""))

    def test_catalog_validation(self):
        with tempfile.TemporaryDirectory() as t:
            path = make_catalog(t, {"tags": ["x" * 21] + [str(i) for i in range(13)], "title": "t" * 141})
            _, products = catalog_mod.load(path)
            problems = catalog_mod.validate_etsy(products[0])
            self.assertTrue(any("14 tags" in p for p in problems))
            self.assertTrue(any("longer than 20" in p for p in problems))
            self.assertTrue(any("141 characters" in p for p in problems))
            bad = Path(t) / "catalog" / "bad.json"
            bad.write_text(json.dumps({"products": [{"id": "a", "title": "A"}]}))
            with self.assertRaises(catalog_mod.CatalogError):
                catalog_mod.load(bad)

    def test_multipart_encoding(self):
        with tempfile.TemporaryDirectory() as t:
            f = Path(t) / "pic.png"
            f.write_bytes(b"\x89PNG-bytes")
            body, ctype = encode_multipart({"rank": 2}, {"image": f})
            parts = multipart_parts({"headers": {"content-type": ctype}, "body": body})
            self.assertEqual(parts["rank"][1], b"2")
            self.assertEqual(parts["image"], ("pic.png", b"\x89PNG-bytes"))

    def test_pkce(self):
        verifier, challenge = pkce_pair()
        self.assertGreaterEqual(len(verifier), 43)
        self.assertNotIn("=", challenge)


class GumroadTest(Base):
    def test_full_flow_creates_draft_with_file_and_cover(self):
        g = Gumroad(self.http, api=self.api.base + "/gumroad", log=self.logs.append)
        res = g.publish(self.product, make_public=False)
        self.assertEqual(res, {"id": "gp_1", "url": "https://gum.co/abc", "state": "draft"})
        presign = self.api.find("POST", "/gumroad/files/presign")[0]
        self.assertEqual(presign["json"], {"filename": "product.zip", "file_size": 3002})
        self.assertEqual(presign["headers"]["authorization"], "Bearer gum-token")
        put = self.api.find("PUT", "/s3/g1")[0]
        self.assertEqual(len(put["body"]), 3002)
        complete = self.api.find("POST", "/gumroad/files/complete")[0]["json"]
        self.assertEqual(complete["parts"], [{"part_number": 1, "etag": '"etag-3002"'}])
        create = self.api.find("POST", "/gumroad/products")[0]["json"]
        self.assertEqual(create["price"], 1250)
        self.assertIs(create["draft"], True)
        self.assertEqual(create["custom_permalink"], "handy-tool")
        self.assertEqual(create["files"][0]["display_name"], "product.zip")
        self.assertTrue(create["files"][0]["url"].startswith("https://s3/"))
        self.assertIn("<li>Private &lt;3</li>", create["description"])
        blob = self.api.find("POST", "/gumroad/direct_uploads")[0]["json"]["blob"]
        self.assertEqual(blob["filename"], "cover.jpg")
        self.assertEqual(len(blob["checksum"]), 24)  # base64 of a 16-byte MD5
        cover = self.api.find("POST", "/gumroad/products/gp_1/covers")[0]["json"]
        self.assertEqual(cover, {"signed_blob_id": "sig_cover.jpg"})

    def test_publish_flag_and_api_error(self):
        g = Gumroad(self.http, api=self.api.base + "/gumroad", log=self.logs.append)
        g.publish(self.product, make_public=True)
        self.assertIs(self.api.find("POST", "/gumroad/products")[0]["json"]["draft"], False)
        self.api.fail["/gumroad/products"] = (200, {"success": False, "message": "Invalid price"})
        with self.assertRaises(PublishError) as ctx:
            g.publish(self.product, make_public=True)
        self.assertIn("Invalid price", str(ctx.exception))


class PolarTest(Base):
    def test_full_flow_draft(self):
        pol = Polar(self.http, api=self.api.base + "/polar", log=self.logs.append)
        res = pol.publish(self.product, make_public=False)
        self.assertEqual(res, {"id": "prod_1", "url": None, "state": "draft"})
        files = self.api.find("POST", "/polar/v1/files/", exact=True)
        self.assertEqual([f["json"]["service"] for f in files], ["downloadable", "product_media", "product_media"])
        self.assertEqual(files[0]["json"]["upload"]["parts"], [{"number": 1, "chunk_start": 0, "chunk_end": 3002}])
        self.assertEqual(files[0]["json"]["mime_type"], "application/zip")
        put = self.api.find("PUT", "/s3/p1")[0]
        self.assertEqual(put["headers"].get("x-amz-test"), "1")
        done = self.api.find("POST", "/uploaded")[0]["json"]
        self.assertEqual(done["id"], "u_file_1")
        self.assertEqual(done["parts"][0]["checksum_etag"], '"etag-3002"')
        benefit = self.api.find("POST", "/polar/v1/benefits/")[0]["json"]
        self.assertEqual(benefit["type"], "downloadables")
        self.assertEqual(benefit["properties"]["files"], ["file_1"])
        self.assertLessEqual(len(benefit["description"]), 40)
        product = self.api.find("POST", "/polar/v1/products/")[0]["json"]
        self.assertEqual(product["prices"], [{"amount_type": "fixed", "price_amount": 1250, "price_currency": "usd"}])
        self.assertEqual(product["visibility"], "draft")
        self.assertEqual(product["medias"], ["file_2", "file_3"])
        attach = self.api.find("POST", "/polar/v1/products/prod_1/benefits")[0]["json"]
        self.assertEqual(attach, {"benefits": ["ben_1"]})
        self.assertEqual(self.api.find("POST", "checkout-links"), [])

    def test_public_creates_checkout_link(self):
        pol = Polar(self.http, api=self.api.base + "/polar", log=self.logs.append)
        res = pol.publish(self.product, make_public=True)
        self.assertEqual(res["url"], "https://buy.polar.sh/cl_1")
        link = self.api.find("POST", "/polar/v1/checkout-links/")[0]["json"]
        self.assertEqual(link, {"payment_processor": "stripe", "product_id": "prod_1"})

    def test_multipart_chunks_cover_the_file(self):
        big = self.tmp / "big.bin"
        big.write_bytes(os.urandom(25 * 1024 * 1024 + 7))
        pol = Polar(self.http, api=self.api.base + "/polar", log=self.logs.append)
        pol.upload(big, "downloadable")
        parts = self.api.find("POST", "/polar/v1/files/", exact=True)[0]["json"]["upload"]["parts"]
        self.assertEqual([(p["chunk_start"], p["chunk_end"]) for p in parts],
                         [(0, 10485760), (10485760, 20971520), (20971520, 26214407)])
        self.assertEqual(sum(len(r["body"]) for r in self.api.find("PUT", "/s3/p")), 26214407)


class EtsyTest(Base):
    def _etsy(self, expires_in=3600):
        state = self.tmp / "state"
        state.mkdir(exist_ok=True)
        (state / "etsy_tokens.json").write_text(json.dumps({
            "access_token": "123.abc", "refresh_token": "r1", "expires_at": time.time() + expires_in}))
        return Etsy(self.http, state, log=self.logs.append, api=self.api.base + "/etsy",
                    token_url=self.api.base + "/etsy/token")

    def test_draft_listing_with_images_and_files(self):
        res = self._etsy().publish(self.product, make_public=False)
        self.assertEqual(res, {"id": 555, "url": "https://www.etsy.com/listing/555", "state": "draft"})
        create = self.api.find("POST", "/etsy/shops/777/listings")[0]
        self.assertEqual(create["headers"]["x-api-key"], "key123:sec456")
        self.assertEqual(create["headers"]["authorization"], "Bearer 123.abc")
        body = create["json"]
        self.assertEqual((body["type"], body["taxonomy_id"], body["price"], body["who_made"]), ("download", 2078, 9.99, "i_did"))
        self.assertEqual(body["tags"], ["budget", "planner"])
        imgs = self.api.find("POST", "/listings/555/images")
        self.assertEqual([multipart_parts(r)["rank"][1] for r in imgs], [b"1", b"2"])
        self.assertEqual(multipart_parts(imgs[0])["image"][0], "cover.jpg")
        f = multipart_parts(self.api.find("POST", "/listings/555/files")[0])
        self.assertEqual(f["name"][1], b"product.zip")
        self.assertEqual(f["file"][0], "product.zip")
        self.assertEqual(self.api.find("PATCH", "/listings/555"), [])

    def test_publish_activates_and_expired_token_refreshes(self):
        etsy = self._etsy(expires_in=-10)
        etsy.publish(self.product, make_public=True)
        refresh = self.api.find("POST", "/etsy/token")[0]
        self.assertIn(b"grant_type=refresh_token", refresh["body"])
        self.assertIn(b"refresh_token=r1", refresh["body"])
        patch = self.api.find("PATCH", "/etsy/shops/777/listings/555")[0]["json"]
        self.assertEqual(patch, {"state": "active"})
        self.assertEqual(self.api.find("POST", "/etsy/shops/777/listings")[0]["headers"]["authorization"], "Bearer 123.new")

    def test_invalid_listing_is_refused_before_any_call(self):
        with tempfile.TemporaryDirectory() as t:
            _, products = catalog_mod.load(make_catalog(t, {"taxonomy_id": None}))
            with self.assertRaises(PublishError):
                self._etsy().publish(products[0], make_public=False)
        self.assertEqual(self.api.requests, [])

    def test_taxonomy_search(self):
        found = self._etsy().taxonomy("planner")
        self.assertEqual(found, [(2078, "Paper & Party Supplies > Calendars & Planners")])


class ItchTest(Base):
    def test_butler_push(self):
        calls = []

        def runner(cmd, **kw):
            calls.append(cmd)
            return mock.Mock(returncode=0, stdout="ok", stderr="")

        with mock.patch("platforms.itch.shutil.which", return_value="/usr/bin/butler"):
            res = Itch(self.http, log=self.logs.append, runner=runner).publish(self.product, make_public=True)
        self.assertEqual(calls[0][:4], ["butler", "push", str(self.tmp / "dist" / "product.zip"), "me/handy-tool:win"])
        self.assertIn("--userversion", calls[0])
        self.assertEqual(res["id"], "me/handy-tool:win")


class RulesTest(unittest.TestCase):
    def test_gumroad_tag_rules(self):
        from platforms.gumroad import valid_tags
        self.assertEqual(valid_tags(["ok tag", "x", "#hash", "a,b", "y" * 21, " spaced "]), ["ok tag", "spaced"])

    def test_placeholders_are_detected(self):
        with tempfile.TemporaryDirectory() as t:
            path = make_catalog(t)
            data = json.loads(path.read_text())
            data["products"][0]["itch"]["builds"][0]["target"] = "YOUR_ITCH_USERNAME/game:html5"
            path.write_text(json.dumps(data))
            _, products = catalog_mod.load(path)
            self.assertEqual(catalog_mod.placeholders(products[0], "itch"), ["YOUR_ITCH_USERNAME/game:html5"])
            self.assertEqual(catalog_mod.placeholders(products[0], "gumroad"), [])
            logs = []
            http = Http(live=True, log=logs.append, opener=mock.Mock(side_effect=AssertionError("no network")))
            clients = {"itch": Itch(http, log=logs.append)}
            results, failures = publish.cmd_run(products, clients, {}, live=True, make_public=False,
                                                only_platform="itch", out=logs.append, state_path=Path(t) / "s.json")
            self.assertEqual(results, [])
            self.assertIn("placeholders", failures[0][2])


class CliTest(Base):
    def test_dry_run_sends_nothing_and_writes_no_state(self):
        opener = mock.Mock(side_effect=AssertionError("network used in dry run"))
        http = Http(live=False, log=self.logs.append, opener=opener)
        state_file = self.tmp / "state.json"
        clients = {n: c(http, self.tmp / "st", self.logs.append) for n, c in publish.CLASSES.items()}
        results, failures = publish.cmd_run(self.products, clients, {}, live=False, make_public=False,
                                            out=self.logs.append, state_path=state_file)
        self.assertEqual(failures, [])
        self.assertEqual({r[1] for r in results}, {"etsy", "gumroad", "polar", "itch"})
        opener.assert_not_called()
        self.assertFalse(state_file.exists())
        self.assertTrue(any("[dry-run]" in line for line in self.logs))

    def test_live_run_records_state_and_skips_next_time(self):
        state_file = self.tmp / "state.json"
        clients = {
            "gumroad": Gumroad(self.http, api=self.api.base + "/gumroad", log=self.logs.append),
            "polar": Polar(self.http, api=self.api.base + "/polar", log=self.logs.append),
        }
        state = {}
        results, failures = publish.cmd_run(self.products, clients, state, live=True, make_public=False,
                                            only_platform="gumroad", out=self.logs.append, state_path=state_file)
        self.assertEqual(len(results), 1)
        saved = json.loads(state_file.read_text())
        self.assertEqual(saved["tool"]["gumroad"]["id"], "gp_1")
        n_before = len(self.api.requests)
        publish.cmd_run(self.products, clients, saved, live=True, make_public=False, only_platform="gumroad",
                        out=self.logs.append, state_path=state_file)
        self.assertEqual(len(self.api.requests), n_before, "second run must not create a duplicate")

    def test_plan_reports_missing_credentials(self):
        lines = []
        with mock.patch.dict(os.environ, {}, clear=True):
            http = Http(live=False)
            clients = {n: c(http, self.tmp / "st", lines.append) for n, c in publish.CLASSES.items()}
            publish.cmd_plan(self.products, clients, {}, out=lines.append)
        text = "\n".join(lines)
        self.assertIn("GUMROAD_ACCESS_TOKEN not set", text)
        self.assertIn("POLAR_ACCESS_TOKEN not set", text)
        self.assertIn("ETSY_KEYSTRING", text)


if __name__ == "__main__":
    unittest.main()
