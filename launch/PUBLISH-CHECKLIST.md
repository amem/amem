# Publish ClientBot Studio on Gumroad: checklist

Allow about 30 minutes. You need a Gumroad account with payouts set up (**Settings → Payments**). Gumroad's layout changes from time to time, so if a button has moved, look for the same setting nearby.

## Before you start

- [ ] Download the two product zips:
  - `ClientBot-Studio-v1.0.0-Agency.zip`
  - `ClientBot-Studio-v1.0.0-Agency-Pro.zip`
- [ ] Have the `launch/images/` folder and `launch/gumroad-listing.md` open.
- [ ] Decide your support email (it appears in receipts and the refund policy).

## 1. Create the product

- [ ] Gumroad → **Products → New product**
- [ ] Type: **Digital product**
- [ ] Name: copy from `gumroad-listing.md` → *Product name*
- [ ] Price: **$297**
- [ ] Click **Next: Customize**

## 2. Product page

- [ ] **Description:** open `gumroad-description.html` in your browser, copy everything below the yellow box, and paste it into the description editor. Replace each *[Insert image: …]* line with the matching image from `images/`.
- [ ] **Cover:** upload in order `1-cover-hero.png`, `2-cover-how-it-works.png`, `3-cover-features.png`, `4-cover-whats-included.png`, then the `shot-*.png` screenshots.
- [ ] **Thumbnail:** `thumbnail-square.png`
- [ ] **URL:** `clientbot-studio`
- [ ] **Summary:** copy from `gumroad-listing.md`
- [ ] **Call to action:** `Get ClientBot Studio`
- [ ] **Additional details:** add the rows from `gumroad-listing.md` (Format, License, Runs on, AI providers, Updates, Version)

## 3. Versions (the two tiers)

- [ ] In the product editor, add a **Versions** variant:
  - `Agency License`: $297 (+$0), description from `gumroad-listing.md`
  - `Agency Pro`: $497 (+$200), description from `gumroad-listing.md`

## 4. Content (what buyers download)

- [ ] **Content** tab → turn on different content per version (if offered), then upload:
  - Agency License → `ClientBot-Studio-v1.0.0-Agency.zip`
  - Agency Pro → `ClientBot-Studio-v1.0.0-Agency-Pro.zip`
- [ ] Add the welcome text from `gumroad-listing.md` above the download.
- [ ] Optional: turn on **license keys** ("generate a unique license key per sale"). The software doesn't check them, but they help you verify buyers when they ask for support.

## 5. Settings

- [ ] **Category:** Software Development. **Tags:** from `gumroad-listing.md`.
- [ ] **Refund policy:** paste the 14-day guarantee text.
- [ ] **Receipt:** customize with the receipt text.
- [ ] Leave "pay what you want" **off**.

## 6. Launch extras

- [ ] **Discount:** create offer code `LAUNCH50` → $50 off → limit 20 uses → applies to this product.
- [ ] **Affiliates:** enable affiliates at 30–40% so AI-agency creators can promote it.
- [ ] **Workflows:** create the 3 emails from `gumroad-listing.md` (trigger: purchase of this product; days 1, 3 and 7).
- [ ] **Pro upgrades:** when an Agency buyer asks to upgrade, create a single-use offer code for $297 off this product and send it with the product link. They choose Agency Pro and pay the $200 difference.

## 7. Publish and test

- [ ] Click **Publish**.
- [ ] Open the product page in a private window and check the images, description and both versions.
- [ ] Buy it yourself with a 100%-off test discount code (create one, then delete it) to see the receipt, the download and the workflow emails exactly as buyers do.
- [ ] Download each zip from that test purchase and open `START-HERE.md`.

## 8. Get the first sales

- [ ] Record a 2–3 minute demo video (script in `launch-posts.md`) and add it as the first cover item.
- [ ] Post the launch posts from `launch-posts.md` (X, LinkedIn, Reddit/communities: follow each community's self-promotion rules).
- [ ] Email your list or network with the `LAUNCH50` code.
- [ ] After each sale, ask for a rating and a one-line testimonial. Add the best ones to the description.

## Updating the product later

In the product repository:

1. Make your change, bump `version` in `package.json`, add a `CHANGELOG.md` entry, run `npm test`, and commit.
2. Run `node scripts/package.mjs`. It writes both zips to `release/`, and the Agency zip keeps only its 3 templates.
3. In Gumroad, replace each version's file, update the "Version" detail, and email your buyers from the **Emails** section.
