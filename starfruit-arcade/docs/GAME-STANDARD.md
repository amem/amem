# Starfruit Arcade — Game Product Standard (v1)

Every game in `games/` is a **commercial product**: it is played free on itch.io / web
portals, sold as source code on itch.io / Gumroad / CodeCanyon, and used as a
portfolio piece for Fiverr / Upwork. Buyers must be able to open it, understand it and
reskin it in minutes. This document is the bar every game must clear.

## 1. Tech rules

| Rule | Why |
|---|---|
| Vanilla JavaScript + HTML5 Canvas 2D. **No frameworks, no build step, no npm deps.** | Buyers open `index.html` and it works. |
| **Classic `<script>` tags only — never `type="module"`**, no `fetch()` of local files. | Must run from `file://` (double-clicked `index.html`) — ES modules and fetch break there. |
| **Zero external requests**: no CDNs, no web fonts, no analytics, no images from URLs. | Works offline, passes portal review, no licensing risk. |
| **No third-party assets.** All graphics are drawn in code (canvas / CSS / inline SVG / emoji). All sound is synthesized with the Web Audio API. | We can legally sell 100% of it. |
| `'use strict'`, everything inside an IIFE; only globals: `window.GAME_CONFIG` (config.js) and `window.__GAME__` (debug/test API). | Clean namespace, embeds safely. |
| Total size of a game folder < 300 KB. | Fast load on portals & mobile. |

## 2. File layout (exact)

```
games/<game-id>/
  index.html          markup + overlay screens, loads the scripts in order
  style.css           all UI styling (overlays, buttons, HUD)
  config.js           window.GAME_CONFIG = {...}  — EVERY reskinnable value, commented
  js/
    audio.js          Web Audio synth SFX + mute handling
    storage.js        safe localStorage wrapper (try/catch, in-memory fallback)
    game.js           game logic + rendering + loop
    ui.js             screen/overlay management, HUD, buttons   (optional split — keep files focused)
  README.md           buyer documentation (see §7)
  CHANGELOG.md        "## 1.0.0 — initial release" + feature list
```
Additional files under `js/` are fine if they keep things readable (e.g. `physics.js`, `levels.js`, `bot.js`).
Do **not** create LICENSE files — the release script adds the license.

## 3. Screens & UX (all games)

1. **Title screen**: game logo/title (styled text), tagline, best score, a big primary
   **Play** button with attribute `data-action="play"`, a sound toggle, "How to play"
   one-liner, small footer `config.studio` credit. The game world should animate
   behind the title (attract mode / idle animation) — never a dead static screen.
2. **HUD** while playing: score (top-center, big, readable), plus game-specific info
   (level, lives, combo…), a pause button (top-right, `data-action="pause"`), mute button.
3. **Pause overlay**: Resume (`data-action="resume"`), Restart (`data-action="restart"`),
   Sound toggle, Home (`data-action="home"`). `Esc` / `P` toggle pause.
   Auto-pause when the tab is hidden (`visibilitychange`) and on window `blur`.
4. **Game over overlay**: score, best, a **"NEW BEST!"** badge when beaten, primary
   **Play again** (`data-action="restart"`), secondary Home, and a **Share** button
   (Web Share API when available, otherwise copy "I scored N in <Title>!" to clipboard
   with a small toast "Copied!").
5. Transitions: overlays fade/scale in (CSS, 150–250 ms). Buttons have hover/active states,
   focus-visible outlines. Minimum touch target 44×44 px.
6. First-run hint: a subtle animated "Tap to …" / "Click or press Space" hint on the first
   round only (remember with storage).

## 4. Input

- Pointer Events (mouse + touch + pen) on the canvas. `touch-action: none` on the game
  area, prevent page scroll / pinch-zoom / double-tap zoom / long-press menu / text selection.
- Keyboard: `Space`/`Enter` = primary action, arrows / A-D where relevant, `Esc`/`P` pause, `M` mute.
- Ignore input for ~150 ms after a screen change so the click that pressed "Play" does
  not also trigger an in-game action.

## 5. Rendering, feel & performance

- Canvas fills the viewport (or a letter-boxed logical area that scales), crisp on
  high-DPI screens (`devicePixelRatio`, capped at 2), re-layout on resize/orientation change.
  Must look good in **portrait phone (390×844)**, **landscape desktop (1280×720)** and
  inside an **itch.io iframe (e.g. 960×600)**.
- `requestAnimationFrame` loop, delta-time clamped (max ~1/20 s) so tab-switches don't explode physics.
  Use a fixed-step or sub-stepped update where physics accuracy matters.
- **Juice is mandatory**: particles, easing/tweening, screen shake (disabled when
  `prefers-reduced-motion: reduce` or `config.screenShake === false`), floating score
  text, hit flashes, smooth camera. The game must feel premium in a 5-second video clip.
- Visual style: modern, vibrant, cohesive palette, soft glows / gradients; readable
  text with shadows. No clip-art look. Distinctive enough to stand out on an itch.io grid.
- Keep 60 fps on a mid-range phone: pool particles, avoid per-frame allocations in hot
  loops, avoid `shadowBlur` on hundreds of objects per frame (pre-render glows to
  offscreen canvases if needed).

## 6. Config, hooks, demo mode, debug API

- `config.js` holds all texts (for translation), colours/theme, tuning numbers, and a
  `studio` string (default `"Starfruit Arcade"`). Each key has a one-line comment. Group keys
  with header comments (`// ---- Theme ----`, `// ---- Gameplay ----`, `// ---- Texts ----`, `// ---- Hooks ----`).
- **Monetization hooks** in config (all optional, no-ops by default), called by the game:
  ```js
  hooks: {
    onGameStart:  function () {},
    onGameOver:   function (score) {},
    onLevelUp:    function (level) {},          // if the game has levels/milestones
    // Called before "Play again". Return a Promise to pause the game while an
    // interstitial ad shows (e.g. GameDistribution / CrazyGames / AdSense H5 SDK).
    beforeRestart: function () { return Promise.resolve(); }
  }
  ```
- **Demo / attract mode**: `index.html?demo=1` starts immediately with a built-in bot
  playing well (and looking good) forever, UI hidden except score, no game over screen
  (auto-restart after a short pause). Used to record trailers and screenshots. The same
  bot may drive the animated background of the title screen.
- **Debug/test API** (always present, harmless):
  ```js
  window.__GAME__ = {
    id: '<game-id>', version: '1.0.0',
    getState: function () { return { screen: 'title'|'playing'|'paused'|'gameover', score: n, best: n /* + game-specific */ }; },
    start: function () {},         // same as pressing Play
    forceGameOver: function () {}  // ends the current round → game over overlay (used by QA)
  };
  ```
  `getState().screen` must be exactly one of `'title' | 'playing' | 'paused' | 'gameover'`
  (the QA script checks these transitions).
- Seedable randomness is nice-to-have, not required.

## 7. Buyer README.md (per game) — sections in this order

1. Title + one-paragraph pitch + feature bullet list.
2. Quick start (double-click `index.html`; or `npx serve` / VS Code Live Server).
3. File structure table.
4. Reskinning guide: table of the most important `config.js` keys; how to change
   colours, texts, difficulty; how to replace procedural graphics with images (point to
   the exact draw function(s)).
5. Monetization: how to wire `hooks` to an ad SDK (short example for a generic
   interstitial), how to embed with an `<iframe>` snippet, recommended iframe size.
6. Publishing: itch.io (zip the folder, "HTML" kind, "This file will be played in the
   browser", viewport size, mobile friendly, fullscreen button), CrazyGames/GameDistribution note,
   and your own website.
7. Controls table, browser support (latest Chrome, Edge, Firefox, Safari, iOS Safari, Android Chrome).
8. FAQ (3–5 items) and "Support: contact the seller through the marketplace you purchased from."
No personal names, e-mails or URLs anywhere.

## 8. Definition of done

- `node scripts/qa-game.mjs games/<game-id>` passes (no console errors, no failed requests,
  screenshots look right at every viewport, from both `http://` and `file://`).
- Played through manually via the QA screenshots: title → play → score changes → game over → play again works.
- Demo mode runs for 60 s without errors and without getting stuck.
- README complete, config fully commented, no TODOs, no dead code, no `console.log` spam.
