# Publisher: list products automatically

It reads `../catalog/catalog.json` and creates listings through official APIs. It uses only the Python standard library (3.9+), so there's nothing to install.

| Platform | What it does |
|---|---|
| **Etsy** (Open API v3, OAuth PKCE) | Draft digital listing, then images (up to 20), files (up to 5, 20 MB each) and video; activates the listing with `--publish` |
| **Gumroad** (API v2) | Uploads files (presign → S3 → complete), creates the product (draft unless `--publish`), adds the cover and thumbnail |
| **Polar** | Uploads files and images, creates the download benefit and the product (draft/public), attaches the benefit; creates a checkout link with `--publish` |
| **itch.io** (butler) | Pushes the game's web build and the source ZIP to projects you created once on itch.io |

## Commands

```bash
python publisher/publish.py plan
python publisher/publish.py run [--live] [--publish] [--product ID] [--platform etsy|gumroad|polar|itch]
python publisher/publish.py etsy-auth
python publisher/publish.py etsy-taxonomy --search planner
python publisher/publish.py gumroad-categories
```

## Safety

- **Nothing is sent without `--live`.** The dry run prints each call instead.
- **Nothing is public without `--publish`.** Listings are created as drafts for you to review.
- **Keys come from environment variables.** OAuth tokens and the published-listings record live in `publisher/state/`, which is git-ignored.
- **No duplicates:** a product already listed on a platform is skipped on the next run.
- **Checks before any call:** the Etsy title (140 characters), tags (13 per listing, 20 characters each), file count and size, a category ID, and no leftover `YOUR_…` placeholders.

## How it was verified

`python -m unittest discover -s publisher/tests` runs 19 tests against a **fake marketplace server** that imitates each API. The tests cover:
- the exact endpoints, headers (Etsy's `keystring:shared_secret` key, Bearer tokens) and JSON bodies;
- multipart uploads and the multi-part file flows;
- Etsy token refresh;
- drafts versus publishing;
- skipping already-listed products;
- confirming that a dry run never touches the network.

API details were taken from the official SDKs and docs, and from Gumroad's open-source code, in September 2026. The publisher has **not yet run against the live marketplaces**, because that needs your accounts. Do the first real run with `--live` and without `--publish` (drafts), and on Polar's sandbox (`POLAR_SERVER=sandbox`). If an API changed, the error message shows the platform's response.
