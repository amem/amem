# Seller accounts and automatic listing: step-by-step

## Why you create the accounts (not me)

Every marketplace requires the real owner to sign up: email and phone verification, identity checks (Etsy, and Envato with a face scan), payout details (bank, PayPal or Stripe) and acceptance of legal terms. Bot sign-ups break their terms and are blocked by CAPTCHAs.

What *can* be automated is everything after sign-up: once you have accounts and API keys, `publisher/publish.py` creates the listings with titles, descriptions, prices, tags, files, images and video, on Etsy, Gumroad and Polar through their official APIs, and uploads to itch.io with butler.

## 1. Create the accounts (about 1.5 hours in total, in this order)

| # | Platform | Time | Why | Sign up |
|---|---|---|---|---|
| 1 | **Gumroad** | 15 min | Fastest store for all 7 products | gumroad.com → Start selling |
| 2 | **Polar** | 15 min | Developer audience, lower fees, handles global tax | polar.sh → Get started → create an organization |
| 3 | **Etsy** | 30 min | Buyers already searching (planners, invoice and watermark tools) | etsy.com/sell |
| 4 | **itch.io** | 15 min | Game players and developers (Neon Stack) | itch.io/register |
| 5 | CrazyGames / GameDistribution | 20 min | Ad revenue from Neon Stack on game portals | developer.crazygames.com · gamedistribution.com |
| 6 | Payhip *(optional)* | 10 min | Another direct store (no product API, so list by hand) | payhip.com |
| 7 | CodeCanyon *(optional, later)* | days | Big audience, but 50% fee, strict review and ID check | codecanyon.net → Become an author |

For payouts, check which methods each platform supports in your country (Stripe, PayPal or Payoneer) **before** you pick your main store.

## 2. Get the API keys

Menu names change from time to time; if one moved, search the platform's help center for "API".

| Platform | Where | Put it in this environment variable |
|---|---|---|
| Gumroad | Settings → Advanced → Applications → create an application → **Generate access token** | `GUMROAD_ACCESS_TOKEN` |
| Polar | Organization settings → Developers → **New token** (organization access token) with products, files and benefits read/write | `POLAR_ACCESS_TOKEN` (and `POLAR_SERVER=sandbox` to test on sandbox.polar.sh first) |
| Etsy | etsy.com/developers → **Create a new app**. Copy the **Keystring** and **Shared secret**, and add the callback URL `http://localhost:3003/callback` | `ETSY_KEYSTRING`, `ETSY_SHARED_SECRET` |
| itch.io | itch.io/user/settings/api-keys → Generate. Install **butler**: itch.io/docs/butler | `BUTLER_API_KEY` |

**Never paste keys into chats, emails or files in this repository.** Put them in your terminal session or your system's environment variables. If a key leaks, revoke it in the platform's settings and create a new one.

## 3. One-time setup per platform

**Etsy**
1. Open your shop and finish the payment and billing setup.
2. Authorize the tool: `python publisher/publish.py etsy-auth`. A browser tab opens; click *Grant access*. Tokens are saved in `publisher/state/` (git-ignored, keep it private).
3. Find category IDs: `python publisher/publish.py etsy-taxonomy --search planner` (then try `template` and `photo`). Put the numbers in `catalog/catalog.json` → `"etsy": {"taxonomy_id": …}` for each Etsy product.
4. If Etsy rejects `when_made`, set `"when_made"` in the catalog to the value Etsy suggests (it changes each year, e.g. `2020_2026`).

**itch.io**
1. Create two projects: **Neon Stack** (Kind of project: *HTML*, pay-what-you-want, viewport 480×800, mobile-friendly) and **Neon Stack: Source Code** (Kind: *Downloadable*, price $19).
2. On each project page, answer the **Generative AI disclosure**: *Yes → Code*.
3. In `catalog/catalog.json`, replace `YOUR_ITCH_USERNAME` with your itch.io username. The publisher refuses to run while the placeholder is there.

**Game portals (optional, extra income)**
Upload `dist/neon-stack-web-v1.0.0.zip` to CrazyGames and/or GameDistribution. Each portal needs its SDK wired into `src/js/portal.js` (see the game's `docs/PORTALS.md`); do this before submitting.

## 4. Run the publisher

Run it on **your own computer** (recommended): it needs internet access to the marketplaces and your product ZIPs.

```bash
# 1. Get the code (this repository, branch claude/amazing-fermi-z9xobq) and the product ZIPs
#    (sent to you in the chat), and put the ZIPs in digital-products-studio/dist/
#    — or rebuild everything:  ./digital-products-studio/scripts/build_all.sh
cd digital-products-studio

# 2. Your keys (macOS/Linux; on Windows PowerShell use:  $env:GUMROAD_ACCESS_TOKEN="…")
export GUMROAD_ACCESS_TOKEN="…"  POLAR_ACCESS_TOKEN="…"
export ETSY_KEYSTRING="…"  ETSY_SHARED_SECRET="…"  BUTLER_API_KEY="…"

# 3. See what's ready
python publisher/publish.py plan

# 4. Dry run: prints every API call, sends nothing
python publisher/publish.py run

# 5. Create DRAFT listings for real, then review them in each dashboard
python publisher/publish.py run --live

# 6. Publish (or click Publish in each dashboard after reviewing)
python publisher/publish.py run --live --publish --platform gumroad
```

**Test on Polar's sandbox first** with `POLAR_SERVER=sandbox` and a sandbox token (sandbox.polar.sh). Nothing real is created there.

What's already listed is remembered in `publisher/state/published.json`, so running again never creates duplicates.

**Running it from this cloud environment instead:** its network policy currently blocks the marketplace hosts. You would need to allow `api.etsy.com`, `api.gumroad.com`, `api.polar.sh` and the upload storage hosts (Amazon S3), and add the keys as environment variables in the environment settings. Your own computer is simpler.

## 5. After the listings exist (manual touches)

- **AI disclosure:** keep the "Built with AI assistance" line in each description; on Etsy, also answer the AI question in the listing form if shown.
- **License tiers:** on Gumroad, add a version "Extended license" at $49 to Neon Stack and "Developer license" at $49 to Invoice Studio (Product → Versions).
- **Categories:** `python publisher/publish.py gumroad-categories` lists Gumroad's categories. Add `"category"` to a product's `gumroad` block in the catalog, or set it in the dashboard.
- **Payhip / Lemon Squeezy:** no product API, so list by hand using `listings/LISTINGS.md`.
- **Links:** put your store links in your Instagram/LinkedIn bio and in the social posts (`../2027-money-planner/marketing/SOCIAL_POSTS.md`).

## 6. Environment variables (reference)

| Variable | Needed for |
|---|---|
| `GUMROAD_ACCESS_TOKEN` | Gumroad |
| `POLAR_ACCESS_TOKEN`, `POLAR_SERVER` | Polar (`production` default, or `sandbox`) |
| `ETSY_KEYSTRING`, `ETSY_SHARED_SECRET`, `ETSY_SHOP_ID` (optional) | Etsy |
| `BUTLER_API_KEY` | itch.io uploads |
