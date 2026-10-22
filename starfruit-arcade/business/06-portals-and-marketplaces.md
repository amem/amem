# 06 — Web game portals and code marketplaces

Two more income streams for the same games: **ad revenue share** on web game portals, and
**template sales** on CodeCanyon. Both are slower to start than Fiverr but compound over time.

> Portal SDKs and submission rules change. Always read the portal's current developer docs
> before integrating; the code below shows the *shape* of the integration.

## 1. Web game portals (ad revenue share)

| Portal | How to get in | Notes |
|---|---|---|
| **CrazyGames** | Developer portal: upload a zip, pass their QA | Requires their SDK for ads; games often start in a limited test launch and get promoted if players engage |
| **GameDistribution** | Developer account, upload, integrate their SDK | Distributes your game to many partner sites; revenue share on ads |
| **GamePix** | Developer account, upload | Accepts HTML5 games with their SDK |
| **Poki** | Curated: apply through their developer page | Very selective; apply with your best game (Cosmic Merge) |
| **Newgrounds** | Upload directly | Community feedback, small ad share |

### Integration pattern (works with every game in this repo)

Each game exposes the hooks portals need in `config.js` → `hooks`. Make a **separate copy per
portal** (e.g. `portal-builds/crazygames/cosmic-merge/`), add the portal's SDK `<script>` to that
copy's `index.html`, then wire the hooks:

```js
// Shape of a typical portal integration — rename the calls to the portal's current SDK API.
hooks: {
  onGameStart: function () { PortalSDK.gameplayStart(); },
  onGameOver:  function (score) { PortalSDK.gameplayStop(); },
  beforeRestart: function () {
    return new Promise(function (resolve) {
      PortalSDK.showMidgameAd({ onFinished: resolve, onError: resolve });
    });
  }
}
```

Portal checklist (all already true for these games): pauses when the tab is hidden, mute
button, no external links during play, works in an iframe at any size, loads fast, no console
errors. Add the portal's logo/branding only if their rules ask for it.

## 2. CodeCanyon (Envato) — HTML5 game templates

CodeCanyon has a large audience of developers buying HTML5 game templates. Review is strict
and can take a week or more; "soft rejects" with improvement notes are normal — fix and resubmit.

What to prepare per item:
- [ ] Item name: e.g. `Cosmic Merge - HTML5 Physics Merge Game (Vanilla JavaScript)`
- [ ] Main zip: the source folder + `README.md` (documentation) + license note per Envato rules
      (Envato provides its own licenses; remove `LICENSE.md` for Envato uploads).
- [ ] Live preview URL: the game on your website.
- [ ] Inline preview image 590 × 300 and thumbnail 80 × 80: `marketing/out/codecanyon/`.
- [ ] Description with features, controls, browser support, changelog, reskin guide link.
- [ ] Category: HTML5 → Games.

Selling on CodeCanyon under Envato's exclusive author program typically pays a higher rate
but means you cannot sell the same item elsewhere; non-exclusive lets you keep itch.io and
Gumroad. Start **non-exclusive**.

## 3. App stores (later)

The games can be wrapped as Android/iOS apps with a web-view wrapper (e.g. Capacitor). This
needs developer accounts, store assets and privacy policies; only do it for a game that already
performs well on the web.
