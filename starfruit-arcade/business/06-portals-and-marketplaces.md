# 06 — Web game portals and code marketplaces

Two more "slow money" channels:

- **Web game portals** (CrazyGames, GameDistribution, Poki, GamePix…) show your free games to
  millions of players and pay a share of the **ad revenue**.
- **Code marketplaces** (CodeCanyon) sell your source code to developers worldwide.

Neither is fast, and each has a review. Submit after the shop basics are running (days 8–14).

> Every portal has its own SDK, technical checklist, revenue terms and exclusivity rules, and
> they change. Read the developer documentation and terms of each one before you submit, and
> keep a list of where each game is published.

---

## 1. What portals look for

The four games (Neon Stack, Cosmic Merge, Brick Blitz, Swapsy) already meet the usual technical checklist.
Promo Arcade, Daily Doors and Perfect Match Quiz are business kits and are not meant for portals.

- [x] Loads fast, small download, no external requests
- [x] Works on desktop and mobile, any aspect ratio, inside an iframe
- [x] Pause when the tab is hidden, mute button, no sound before the first tap
- [x] No external links that pull players away (the itch.io build has none)
- [x] Hooks for ads: `onGameStart`, `onGameOver`, `beforeRestart` (Promise) in each `config.js`

What you add per portal: **its SDK** (a script tag) and **ad calls** in the hooks.

### Wiring an SDK (example pattern)

In the game's `config.js`:

```js
hooks: {
  onGameStart: function () { /* portal.gameplayStart() */ },
  onGameOver:  function (score) { /* portal.gameplayStop() */ },
  beforeRestart: function () {
    // Show a midgame ad between rounds; the game waits until the Promise resolves.
    return new Promise(function (resolve) {
      /* portal.showMidgameAd({ onFinished: resolve, onError: resolve }) */
      resolve();
    });
  }
}
```

Replace the commented calls with the real function names from the portal's SDK docs, add the
SDK `<script>` tag to `index.html` (portals allow their own SDK as the one external request),
mute the game during ads (`M` toggles mute; or call the audio module), and test with the
portal's test mode. Keep one zip per portal: `neon-stack-crazygames.zip`, etc.

> Do not add a portal SDK to the builds you sell or upload to itch.io. Keep the clean build as
> the master copy.

## 2. Portals

### CrazyGames
- Large web-game portal with a developer portal. You upload an HTML5 build, integrate their SDK
  for ads, and the game goes through a review and usually a limited test release first; wider
  release depends on how players respond.
- Best candidates: **Swapsy** (match-3 is one of the most played genres on the web), **Cosmic
  Merge** (merge games are popular) and **Brick Blitz**.
- Prepare: 3–5 screenshots, a short gameplay video (`marketing/out/video/`), a clear description.

### GameDistribution
- Distributes your game to many partner websites and pays a share of the ad revenue. Requires
  their SDK and their submission checklist.
- Good for volume: submit **all four games**.

### Poki
- Very selective: they pick and playtest games before publishing. Apply through their developer
  page with your best game; if they pass, keep going with the others.

### GamePix and others
- GamePix, Y8, Kongregate-style portals and smaller networks accept HTML5 games too. Check each
  one's current status, SDK and terms. Avoid sites that want you to give up your rights or pay
  to be listed.

### Exclusivity
Some portals ask for web exclusivity or offer better terms for it. If you accept exclusivity
somewhere, do not upload the same game to competing portals. Your itch.io page and website may
or may not be allowed: read the clause before agreeing.

### Realistic expectations
Most portal games earn little; a few earn well. Revenue depends on plays, country mix and ad
rates. Treat portals as a long-term bonus and a source of "played by N players" proof for
your Fiverr / Upwork profile.

## 3. CodeCanyon (Envato Market)

CodeCanyon has an **HTML5 games** category where buyers look for reskinnable games.

**Before you submit:**
1. Read the author terms. **Exclusive** authors get a better rate but may sell the item only
   on Envato. **Non-exclusive** lets you keep selling on itch.io and Gumroad. Start non-exclusive.
2. Envato's reviewers are strict about quality, documentation and originality. Review can take
   days to weeks, and soft rejections with feedback are common. Fix and resubmit.
3. Envato uses its own licenses (Regular / Extended), not yours. Remove `LICENSE.md` from the
   Envato upload and do not mention outside licenses.

**Package for Envato:**
- Main zip: the game folder from `dist/source/<id>-v1.0.0-standard.zip` without `LICENSE.md`,
  plus a `documentation/` folder (export the README to HTML or PDF).
- Thumbnail 80 × 80 and inline preview image 590 × 300 (crop from `marketing/out/gumroad/<id>-cover.png`).
- A live preview URL: your website's `/play/<id>/`.
- Description: reuse the Gumroad description without prices or outside links.

**Pricing:** Envato items in this category often sell for roughly $15–$40 (Regular). Check
current similar items and price in the middle.

Start with **Swapsy** or **Cosmic Merge** (the most complete games), learn from the review, then submit
the others. Swapsy's included balancing simulator (`tools/balance.mjs`) and its level format are
worth a line in the description: buyers of match-3 templates want to add levels.

The business kits also fit CodeCanyon (*JavaScript → Miscellaneous* or the category reviewers
point you to): Daily Doors before October, so it is live for the Christmas buying season.

## 4. Other places to list the source code

- **itch.io** and **Gumroad** (done in docs 04 and 05).
- **Your website**: every product card links to its pages.
- **GitHub**: a free, small, open-source mini-game (not the paid ones) with a link to your shop
  is a good way to be found by developers. Never publish the paid source code.

## 5. Tracking

Add a sheet "Portals" to your sales log:

| Game | Portal | Status | Date | Link | Plays/month | Revenue/month | Notes |
|---|---|---|---|---|---|---|---|

Update it monthly. After 2–3 months you will know which game and which portal deserve more work
(a level pack, a seasonal theme, a sequel).
