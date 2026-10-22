# 08 — Fulfilling orders fast

The products in `games/` are your production engine. Most orders are a **rebrand or extension**
of something that already works, which is why you can promise a preview in 48 hours.

## Golden rules

1. **Confirm scope in writing** before you start: what the client gets, what is not included,
   the price, the delivery date, the number of revisions.
2. **Preview within 48 hours**, even if rough: a link they can play on their own phone.
3. **Deliver early.** Late delivery hurts your ranking more than a lower price helps it.
4. **One project folder per client**: `clients/<client>-<game>/`. Never edit `games/` for a client.
5. **Test before every delivery**: `node scripts/qa-game.mjs clients/<folder>` (copy the folder
   inside the project first) and play it on your phone.

## Playbook A — Branded mini-game (Gig 1 / Gig 4)

1. `clients/<client>/` ← copy of `games/promo-arcade/`.
2. Put their logo in `clients/<client>/assets/logo.png` and product photos in `assets/`
   (square, transparent background; remove backgrounds with any free background remover).
3. Edit `brand.config.js`: name, tagline, `logoImage: 'assets/logo.png'`, colours, products,
   rewards and codes, CTA link, legal text; set `demoNotice: ''`; keep or remove `studioCredit`.
4. Only one game ordered? Delete the other game folders and set `hubLink: false`, or keep the
   hub with one card.
5. Lead capture: set `leadCapture.enabled`, `required`, `fields` and the client's `webhookUrl`
   (Google Apps Script / Zapier / Make). Send a test entry and check it arrives.
6. Preview: drag the folder into **Netlify Drop** (app.netlify.com/drop) and send the link.
7. Final delivery: the zip of the folder + the live link + a QR code PNG (any free QR generator)
   + 5 lines of "how to change prizes later" (point them to `brand.config.js`).

**Using Claude Code for a rebrand** (paste in a session opened in this project):
```text
Rebrand games/promo-arcade for a client into clients/<client>/:
- Name: <name>, tagline: <tagline>
- Colours: primary <hex>, secondary <hex>, accent <hex>, background <hex>, text <hex>
- Logo: clients/<client>/assets/logo.png
- Products: <name: file or built-in icon> ×8
- Rewards: catch-rush <score → title/code>, memory-match <stars → title/code>, spin-win segments <label, odds, code>
- CTA: <text> → <url>; lead capture <on/off, fields, webhook>
- Remove the demo notice. Run the QA script on each game and fix anything it reports.
```

## Playbook B — Custom HTML5 game / reskin (Gig 2)

1. Start from the closest product (`neon-stack`, `cosmic-merge`, `brick-blitz`).
2. Reskin first via `config.js` (colours, texts, difficulty), then images (each README has a
   "replace graphics with images" section), then new mechanics.
3. Send a preview link by day 2; collect feedback in one list; implement; deliver.
4. Deliver: source zip + README + live link. For portal clients, wire their SDK in `hooks`.

**Prompt for a new feature:**
```text
In clients/<folder> (a copy of games/<game>), add <feature>. Keep the code style, keep all texts
in config.js, keep it working from file:// with no external requests, update README.md, then
run node scripts/qa-game.mjs on it and fix what it reports.
```

## Playbook C — Fixes (Gig 3)

1. Ask for the project before the order; reproduce the problem.
2. Open untrusted projects safely: never run `npm install` with scripts on code you have not
   read (`npm install --ignore-scripts`), and test in a separate browser profile.
3. Fix, then re-test on phone and desktop; write a short change report (what, why, where).
4. Deliver the updated zip (or a pull request) + the report.

## Message templates

**Order started**
```text
Thanks for your order, [name]! I have everything I need. You will get a playable preview link by [day]. If anything comes to mind meanwhile (prizes, colours, texts), just send it here.
```

**Missing information**
```text
Thanks for your order! To start I only need: [list]. As soon as I have them, the 48-hour preview clock starts.
```

**Preview ready**
```text
Your preview is ready: [link]. Please play it on your phone and send all your changes in one message (texts, colours, prizes, difficulty). I'll apply them and deliver the final version by [day].
```

**Delivery**
```text
Here is your finished game 🎉
• Live link: [link]
• QR code: attached
• Source files: attached (to change prizes or texts later, edit brand.config.js — instructions inside)

Please check everything and let me know if you'd like any tweak within the included revisions. If you're happy, an honest review helps my small studio a lot. Thank you!
```

**Scope change**
```text
Great idea! That's outside the original order ([what was included]), so I've sent a custom offer for $[X] (+[N] days). If you'd rather keep the current scope, no problem at all.
```

**Revision limit reached**
```text
Happy to keep improving it! We've used the [N] included revisions, so I've sent a small custom offer for further changes. Thanks for understanding.
```

## Handover checklist

- [ ] Client's brand everywhere, no demo notice, credit removed if requested
- [ ] All links work (CTA, terms, hub)
- [ ] Coupon codes correct; wheel odds as agreed
- [ ] Lead form tested end-to-end (if used)
- [ ] QA script passes; tested on a real phone
- [ ] Zip + live link + QR code + short instructions sent
