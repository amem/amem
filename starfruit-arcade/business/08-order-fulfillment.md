# 08 — Order fulfillment: deliver fast with this repo

Most orders are a rebrand of a product you already own. A clean, repeatable process lets you
deliver in hours and over-deliver on quality.

Tools you need: a code editor (VS Code), a browser, this project, a free static host account
(Netlify), and a free QR-code generator.

---

## 1. The 5-minute rebrand (Promo Arcade: demos and Gig 1 / Gig 4)

1. **Copy the kit:** duplicate `games/promo-arcade/` to a working folder outside the repo, e.g.
   `Documents/Starfruit Arcade/clients/<client-name>/`. Never edit the master copy for a client.
2. **Logo:** save the client's logo as `assets/logo.png` inside the copy (transparent PNG; ask
   for it or, for a private demo only, take it from their public profile picture).
3. **Open `brand.config.js`** and change:
   - `name`, `tagline`, `logoText` (or `logoImage: 'assets/logo.png'`), `cupText`
   - `colors.primary`, `colors.deep` (sample them from the logo or their Instagram grid with a
     colour-picker browser extension), then `secondary`, `accent`, `background`
   - `products`: pick the closest built-in icons (`coffee`, `donut`, `cupcake`, `pizza`, `burger`,
     `icecream`, `gift`, `bag`, `heart`, `diamond`…) or add their product photos as `assets/*.png`
   - `wheel.segments` and `rewards`: their prizes and codes (for demos, plausible ones)
   - `legal`: for demos, "Preview made for <business>. Not live."
   - `storageKey`: the client's name in lowercase
4. **Reload and check** each game on desktop, then on your phone.
5. **Record the preview:** open `spin-win/index.html` on your phone, screen-record one spin
   (10–15 s). For a looping video without touching the screen, add `?demo=1` to the URL.

Time it: after two or three, this takes under 10 minutes.

## 2. Delivering a Promo Arcade order

1. Confirm the brief (template A in §6): game(s), logo, colours, products/prizes, codes, lead
   capture yes/no and where the leads go, languages.
2. Rebrand (§1). For text in another language, translate `texts` in `brand.config.js` and the
   `texts` block of each game's `config.js`.
3. **Lead capture** (if ordered): create the Google Sheet + Apps Script web app from the kit
   README ("Lead capture" section) **in the client's Google account** (share your screen, or
   send them the 5-step instructions), paste the URL into `webhookUrl`, test once, check the row
   appears in their sheet.
4. **Host it:** Netlify Drop → drag the client folder → rename the site to
   `<client>-games.netlify.app` (or the client's own hosting / subdomain).
5. **QR code:** generate a QR code for the hosted URL (PNG and SVG), test it with two phones.
6. **Preview delivery** (template B): link + QR + "what to check" list. Use revisions
   generously but keep them inside the agreed scope.
7. **Final delivery** (template D): the zip of their folder, the link, QR code files, a
   one-page "how to change prizes" note (copy from the README), and the embed snippet for their
   website if they have one.

## 3. Delivering a custom HTML5 game (Gig 2)

1. **Reskin from a product.** Copy the game folder, then change `config.js` (colours, texts,
   difficulty). Replace procedural graphics with images where the README says (each game's
   README names the exact draw functions).
2. **Preview within 48 hours,** even if rough. Early previews prevent big misunderstandings.
3. **Licensing:** the client gets the right to use and modify their game. Your engine stays
   yours: say so in the offer ("delivered with a license to use and modify this game; the
   underlying engine remains the developer's"). For a fully original game, agree on ownership in
   writing before starting.
4. Run the QA tool on your copy before each delivery:
   `node scripts/qa-game.mjs <path-to-copy-inside-the-project>` (copy it into `games/` temporarily).

## 4. Fixes (Gig 3)

1. Ask for the full project and the exact steps, device and browser to reproduce the bug.
2. Reproduce first. If you can't, ask for a screen recording before quoting.
3. Quote a fixed price and deadline in writing before you start (template F).
4. Work in a copy, use git (`git init`) so you can show a clean diff.
5. Deliver the fixed files plus a short report: problem → cause → fix → how you tested.
6. Common fixes and where they live in this repo, ready to reuse:
   - Crisp canvas on phones: devicePixelRatio scaling in any game's `resize()`.
   - Audio not starting on iPhone: create/resume the AudioContext on the first tap (`shared/brand.js` → `unlock()`).
   - Physics speed depends on frame rate: delta-time loop with clamping (`PA.loop` in `shared/brand.js`).
   - Pause on tab switch: `visibilitychange` + `blur` handlers (`PA.game`).

## 5. Quality checklist (every delivery)

- [ ] Plays on a real phone (portrait) and on desktop
- [ ] No errors in the browser console
- [ ] Client's name, logo, colours and texts are spelled correctly everywhere
- [ ] Coupon codes match what the client gave you
- [ ] Lead capture tested end-to-end (if ordered)
- [ ] Link + QR code tested on two phones
- [ ] The zip opens and runs by double-clicking `index.html`
- [ ] No other client's data or names left in the files (search for the previous storageKey)

## 6. Message templates

**A. Order received / brief**
> Thanks for your order, [name]! To start, I need:
> 1) your logo (PNG or SVG), 2) your brand colours (or I can match your logo),
> 3) [6–8 products / your prizes, codes and how often each should win],
> 4) should players leave an email or phone number before getting the code?
> As soon as I have these, you will get a playable preview within [24/48] hours.

**B. Preview**
> Here is your preview: [link] (QR code attached so you can try it on your phone).
> Please check: logo and colours, product names, prizes and codes, the texts.
> Tell me anything you want changed; [N] revision rounds are included.

**C. Revision done**
> Done! I updated [list]. Same link: [link]. Anything else, or shall I prepare the final files?

**D. Final delivery**
> Your game is ready! 🎉
> • Live link: [link] · QR code: attached (PNG for print, SVG for large formats)
> • Source files: attached zip (open index.html to run it locally)
> • How to change prizes later: attached note
> • Website embed: [snippet]
> If anything needs a tweak after launch, just message me. If you are happy with the work,
> I would really appreciate an honest review.

**E. Scope change**
> Good idea! That is outside the current order ([what was agreed]). I can add it for $[X] and
> [N] extra days. Shall I send an offer for it?

**F. Fix quote**
> I reproduced the issue: [short cause]. I can fix it for $[X], delivered by [day], with a short
> report of what changed. Shall I go ahead?

**G. Late or blocked**
> Quick update: [what is done], [what is blocking]. New delivery time: [time]. Sorry for the
> wait, I want it to be right.

## 7. Keep a client folder per order

```
Documents/Starfruit Arcade/clients/<client>/
  brief.md          what was agreed, prices, deadlines, contacts (on the platform only)
  source/           their game folder
  delivered/        every zip you sent, with dates
  qr/               QR codes
```

Back it up (cloud drive or external disk). Delete client personal data (lead exports, emails)
when the job is done unless the agreement says otherwise.
