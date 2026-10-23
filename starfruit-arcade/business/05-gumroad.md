# 05 — Gumroad: source-code products, bundle and discount codes

Gumroad is the cleanest checkout for source code: one page per product with a **Standard**
and an **Extended** version, instant download, and links you can paste anywhere (website,
itch.io, Reddit, YouTube descriptions, Upwork).

> Check Gumroad's current fees and payout rules in its help centre. Sales through Gumroad's own
> marketplace ("Discover") usually cost a higher fee than sales from your own links.

Files come from `npm run build` → `dist/source/`, images from `npm run assets` → `marketing/out/gumroad/`.

---

## 1. Product setup (repeat for the 7 products)

*Products → New product → Digital product.*

| Field | Value |
|---|---|
| Name | `Neon Stack — HTML5 Game Source Code` (same pattern for each) |
| Price | the **Standard** price from `catalog.json` |
| Cover | `marketing/out/gumroad/<id>-cover.png` (1280 × 720) |
| Thumbnail | `marketing/out/gumroad/<id>-thumb.png` (600 × 600) |
| Extra covers | 2–3 screenshots from `marketing/out/screenshots/` and the trailer MP4 |
| Summary | the `tagline` |
| URL slug | the product `id`, e.g. `neon-stack` |
| Tags | html5, javascript, game, source code, + the catalog tags |

**Versions** (*Product → Content/Options → Versions*; the name may differ slightly):

| Version | Price | File |
|---|---|---|
| Standard license | Standard price | `dist/source/<id>-v1.0.0-standard.zip` |
| Extended license | Extended price | `dist/source/<id>-v1.0.0-extended.zip` |

Prices (USD): Neon Stack 15 / 49 · Cosmic Merge 19 / 69 · Brick Blitz 17 / 59 · Swapsy 29 / 99 ·
Promo Arcade 29 / 99 · Daily Doors 25 / 89 · Perfect Match Quiz 25 / 89.

Name pattern for the kits: `Daily Doors — Advent Calendar & Scratch Card Kit (HTML5)`,
`Perfect Match Quiz — Product-Finder Quiz Kit (HTML5)`, `Swapsy — HTML5 Match-3 Game Source Code`.

If versions cannot carry separate files in your Gumroad setup, upload both zips and name them
clearly ("Standard license files", "Extended license files"); the license text inside each zip
is what counts.

**Checkout settings:** turn off "Allow customers to pay what they want" at launch, turn on
"Ask for a review after purchase" if offered, and add a custom "thank you" message (below).

## 2. Product description template

> ### Play it first
> Free demo in your browser: [itch.io game page or your website /play/<id>/]
>
> ### What it is
> [summary from catalog.json]
>
> ### What you get
> - Full source code: vanilla JavaScript, HTML and CSS, no frameworks, no build step
> - [feature 1]
> - [feature 2]
> - [feature 3]
> - One `config.js` (Promo Arcade: `brand.config.js`) with every colour, text and tuning value, fully commented
> - Buyer README: reskinning guide, ad-hook examples, publishing on itch.io / portals / your site
> - Demo mode for trailers (`?demo=1`)
>
> ### Which license?
> **Standard**: use it in **one** end product (one game, one client project or one website).
> **Extended**: **unlimited** end products, including client work and paid apps.
> Both: you may not resell or share the source code itself as a template.
>
> ### Requirements
> Any modern browser. A text editor to customise. No coding needed to change colours and texts.
>
> ### Support
> Reply to your receipt email or message me on Gumroad.

**For Promo Arcade, Daily Doors and Perfect Match Quiz**, add a line at the top:
> 🏪 Freelancers: this kit is built for client work. Rebrand it in 5 minutes for shops, cafés and
> events, and charge for the setup. The Extended license covers unlimited clients.

**For Daily Doors**, also add a seasonal line (change it with the calendar):
> 🎄 Advent, Ramadan, Black Friday week, a 12-day launch countdown: set a start date and the
> doors open by themselves, one per day.

**Thank-you message (after purchase):**
> Thanks for your purchase! Start with README.md in the zip. If anything is unclear or you find a
> bug, reply to this email and I will help. If the product helps you, an honest rating on this
> page helps other developers find it.

## 3. The bundle

*New product → Bundle* (if Gumroad offers the bundle type in your account; otherwise a regular
digital product with the bundle zip).

| Field | Value |
|---|---|
| Name | `Starfruit Arcade — 7 HTML5 Games & Kits Source Code Bundle` |
| Price | Standard **$99** / Extended **$299** (as versions) |
| Files | `dist/source/starfruit-arcade-bundle-v1.0.0-standard.zip` / `-extended.zip` |
| Cover / thumb | `marketing/out/gumroad/bundle-cover.png` / `bundle-thumb.png` |
| Description | "All 7 products, one price: save over 35 % against buying them one by one." Then a 2-line summary of each product with its demo link. |

## 4. Discount codes

*Checkout → Discounts* (Gumroad calls them offer codes or discounts):

| Code | Discount | Use it for | Limit |
|---|---|---|---|
| `LAUNCH30` | 30 % off everything | First 2 weeks, in launch posts | 50 uses, expires day 14 |
| `REDDIT20` | 20 % off | Reddit / forum posts (only where self-promotion is allowed) | 30 uses |
| `DEVLOG15` | 15 % off | itch.io devlogs and YouTube descriptions | no limit |
| `CLIENT50` | 50 % off Promo Arcade Extended | Freelancers who hire you for a first rebrand | ask-only |
| `ADVENT25` | 25 % off Daily Doors | 1 Oct – 20 Nov, posts aimed at shops planning December | 40 uses |

Track which code sells: it tells you which channel works.

## 5. After the products are live

1. Paste each product URL into `site/site.config.js` (`products.<id>.gumroad` and `links.gumroad`).
2. `npm run build`, re-deploy `dist/site` (see [01-accounts-setup.md](01-accounts-setup.md) §5).
3. Add the Gumroad link to every itch.io source-code page ("Extended license here").
4. Pin the bundle as the first product on your Gumroad profile.

## 6. Updates

When you improve a product: bump `version` in `catalog.json`, add a `CHANGELOG.md` entry,
`npm run build`, replace the files on Gumroad and use "Send update to customers" (if available)
with a two-line note. Free updates make buyers trust you, and every update is a reason to post.
