# Prompts for the Claude panel in your Chrome

The Claude side panel in your Chrome (Claude in Chrome) can click and type in your browser. Paste one prompt at a time into that panel. It stops whenever a step must be yours.

## Before you start (5 minutes)

1. Download `amem-products-all.zip` (attached in the chat) and unzip it into your **Downloads** folder. You get `Downloads/amem-products/` with the 8 product ZIPs, `images/` and `planner/`. Don't unzip the product ZIPs inside it; they are uploaded as they are.
2. Stay at your computer: the panel will hand over to you for Google sign-in, terms, CAPTCHAs, verification and payout details.

---

## Prompt 1: Gumroad store and 7 products

```
Help me set up my Gumroad store in this browser.

RULES
- Stop and ask me to take over whenever you reach: a Google sign-in or consent screen, accepting terms, a CAPTCHA, phone or ID verification, payment/payout/bank/tax details, or any password or 2FA code. I will do that step and tell you to continue.
- Do not publish anything. Keep every product unpublished; I will review and publish myself.
- Do not message anyone, and do not change settings I did not ask for.
- When a file must be uploaded, ask me to pick it from Downloads/amem-products.
- If a step fails twice, stop and tell me what happened.

STEP 1. On gumroad.com, click "Start selling" and sign up with Google using mostapha.amkaitir@gmail.com (hand the Google screens over to me). Choose a store name like "AMEM Studio" if asked.

STEP 2. Create these 7 products (type: Digital product). For each one: set the name and price, open the description link and paste its text exactly, then ask me to upload the product file and the cover image.
1. Neon Stack: HTML5 Game Source Code (One-Tap Tower Stacking) | $19 | file neon-stack-v1.0.0.zip | cover images/neon-stack/cover.jpg | description https://raw.githubusercontent.com/amem/amem/claude/amazing-fermi-z9xobq/digital-products-studio/listings/neon-stack.txt
2. Invoice Studio: Offline Invoice & Quote Generator | $19 | file invoice-studio-v1.0.0.zip | cover images/invoice-studio/cover.jpg | description https://raw.githubusercontent.com/amem/amem/claude/amazing-fermi-z9xobq/digital-products-studio/listings/invoice-studio.txt
3. Watermark Studio: Batch Watermark, Resize & Rename Photos | $12 | file watermark-studio-v1.0.0.zip | cover images/watermark-studio/cover.jpg | description https://raw.githubusercontent.com/amem/amem/claude/amazing-fermi-z9xobq/digital-products-studio/listings/watermark-studio.txt
4. Python Automation Kit: 11 Time-Saving Scripts | $15 | file py-automation-kit-v1.0.0.zip | cover images/py-automation-kit/cover.jpg | description https://raw.githubusercontent.com/amem/amem/claude/amazing-fermi-z9xobq/digital-products-studio/listings/py-automation-kit.txt
5. 2027 Money Planner: Budget Spreadsheet + Holiday Gift Tracker | $12.99 | file 2027-Money-Planner.zip | cover planner/gumroad-cover.jpg | description https://raw.githubusercontent.com/amem/amem/claude/amazing-fermi-z9xobq/digital-products-studio/listings/planner-bundle.txt
6. Christmas Budget & Gift Tracker Spreadsheet | $5.99 | file Holiday-Budget-Gift-Tracker.zip | cover planner/etsy-holiday-01-hero.jpg | description https://raw.githubusercontent.com/amem/amem/claude/amazing-fermi-z9xobq/digital-products-studio/listings/planner-holiday.txt
7. Debt Payoff Planner: Snowball & Avalanche Spreadsheet | $6.99 | file Debt-Payoff-Planner.zip | cover planner/etsy-debt-01-hero.jpg | description https://raw.githubusercontent.com/amem/amem/claude/amazing-fermi-z9xobq/digital-products-studio/listings/planner-debt.txt

STEP 3. Show me a table: product, price, status (unpublished), and anything still missing.
```

After you review each product, click **Publish** yourself. Then create a discount code `LAUNCH25` (25% off, 7 days) under Checkout → Discounts.

---

## Prompt 2: Fiverr gigs (drafts)

Create your Fiverr seller profile first (Fiverr asks for personal details and phone verification, which you do yourself). Then paste:

```
Help me create Fiverr gig drafts in this browser. I'm already signed in to my Fiverr seller account.
RULES: do not publish gigs, do not message anyone, and stop and ask me for any verification, payment or terms step.
Open https://github.com/amem/amem/blob/claude/amazing-fermi-z9xobq/digital-products-studio/launch/FIVERR_UPWORK.md and read the "Fiverr: 4 gigs" section.
For each of the 4 gigs, create a new gig and fill in the title, category, search tags, the 3 packages (price, delivery days, revisions, description), the gig description and the buyer requirements. When gig images are needed, ask me to upload images/<product>/cover.jpg from Downloads/amem-products. Save each gig as a draft and show me a summary at the end.
```

---

## Prompt 3: Upwork profile (no proposals)

```
Help me fill in my Upwork freelancer profile in this browser. I'm already signed in.
RULES: never submit proposals or send messages (Upwork bans automated proposals). Stop and ask me for identity verification, payment, tax or terms steps, and before saving anything.
Open https://github.com/amem/amem/blob/claude/amazing-fermi-z9xobq/digital-products-studio/launch/FIVERR_UPWORK.md, read the "Upwork" section, and fill in my profile title, overview, skills and hourly rate. Then show me what you changed.
```

Proposals: use the template in that file, personalize it for each job, and click **Send** yourself.

---

## Prompt 4: Etsy listings (after your shop is open)

Open your Etsy shop yourself first (setup fee, bank, identity). Then paste:

```
Help me create Etsy listing drafts in this browser. I'm signed in to Etsy Shop Manager.
RULES: save as drafts only (do not publish or activate), and stop and ask me for any payment, fee, verification or terms step.
Read https://github.com/amem/amem/blob/claude/amazing-fermi-z9xobq/2027-money-planner/listings/ETSY_LISTINGS.md (3 planner listings) and https://github.com/amem/amem/blob/claude/amazing-fermi-z9xobq/digital-products-studio/listings/LISTINGS.md (Invoice Studio and Watermark Studio Etsy titles and tags; descriptions are in the .txt files in the same folder).
For each of the 5 listings: create a digital listing with its title, price, 13 tags, description and "Digital files" type. Ask me to upload the photos and files from Downloads/amem-products. Answer Etsy's AI question honestly: these products were made with AI assistance. Show me a summary at the end.
```
