# Cosmic Merge — HTML5 source code

**Drop. Merge. Make a star.** A physics merge puzzle in the genre that took over app stores
and streams: drop planets into a glass jar, touch two identical ones together and they merge
into the next size up, from a tiny asteroid all the way to a black hole. Don't let the jar
overflow.

- Custom circle physics (position-based, sub-stepped): piles settle smoothly, nothing tunnels
  through the walls, stable with 60+ bodies.
- 11 procedurally painted planets with cute animated faces (blink, surprised, happy).
- Chain-reaction combos with score multipliers, "NEW: Saturn!" discovery banners and a
  BIG BANG when two black holes collide.
- UFO dropper with an aim guide, NEXT preview, evolution chain, fair overflow countdown.
- Responsive layout: portrait on phones, side panels in landscape and inside iframes.
- Title screen with a live bot filling the jar; `?demo=1` attract mode for trailers.
- Pause (Esc/P, auto-pause on hidden tab), sound toggle (M), best score and best planet saved.
- Hooks for ads and analytics, share button, fully translatable texts.
- Vanilla JavaScript, no dependencies, no build step, no external requests, ~115 KB.
- Runs from `file://`, any web server, itch.io and web game portals.

## Quick start

1. Unzip.
2. Double-click `index.html`.

For development, serve the folder with any static server (`npx serve .`, VS Code Live Server).

## Files

| File | What it does |
|---|---|
| `index.html` | Page markup: canvas, buttons, title / pause / game-over screens |
| `style.css` | Interface styling (screens, buttons, hint, toast) |
| `config.js` | **Every reskinnable value**: colours, planets, physics, rules, texts, hooks |
| `js/storage.js` | Safe `localStorage` wrapper; creates the `window.__GAME__` namespace |
| `js/audio.js` | Synthesized sound effects (Web Audio API, no audio files) |
| `js/sprites.js` | Procedural planet painters, faces, glows, icons and the UFO |
| `js/physics.js` | The circle physics world |
| `js/game.js` | Rules, merges, scoring, demo bot, jar and HUD drawing, screens, input |

## Reskinning

Open `config.js`; every key is commented.

| Key | Effect |
|---|---|
| `tiers[]` | The merge chain: `name`, `radius` (fraction of jar width), `score`, `style`, `colors` |
| `tiers[].image` | Path to your own PNG (e.g. `'img/cherry.png'`): drawn instead of the procedural planet |
| `faces`, `faceColor`, `blushColor` | Cute faces on or off, and their colours |
| `theme.*` | Background, nebula, jar glass, danger line, UFO and panel colours |
| `physics.gravity`, `friction`, `restitution` | Feel of the pile (floaty, sticky, bouncy) |
| `dropper.droppableTiers`, `weights` | Which bodies the player gets, and how often |
| `rules.dangerLine`, `overflowSeconds` | How forgiving the overflow rule is |
| `rules.comboWindow`, `comboMaxMultiplier` | Chain-reaction combo tuning |
| `rules.jarAspect` | Jar height / width |
| `texts.*` | Every word on screen |
| `studio`, `storageKey` | Credit line; save namespace (change per reskin) |

**Fruit, candy or brand-product version.** Give every tier an `image` (square PNG with the
object centred; it is cropped to a circle), rename the tiers and adjust `colors` (used for
particles and icons). Set `faces: false` if your images already have faces.

**Changing the number of tiers.** Add or remove entries in `tiers`; keep radii increasing so
the largest still fits in the jar (≤ 0.36). The last tier is the one that explodes on merge.

**New procedural looks.** Each `style` is a painter function in `PAINTERS` in `js/sprites.js`
drawing into a unit circle; copy one and edit it.

## Monetization and analytics

`config.js` → `hooks`:

```js
hooks: {
  onGameStart: function () {},              // a round begins
  onGameOver: function (score) {},          // the jar overflowed
  onLevelUp: function (tierIndex) {},       // a planet was created for the first time this round
  beforeRestart: function () {              // before "Play again": show an interstitial
    return new Promise(function (resolve) {
      if (window.MyAdSdk) window.MyAdSdk.showInterstitial({ onClose: resolve, onError: resolve });
      else resolve();
    });
  }
}
```

**Embed on any website:**

```html
<iframe src="cosmic-merge/index.html" width="480" height="800" style="border:0;max-width:100%"
        allow="autoplay; fullscreen" title="Cosmic Merge"></iframe>
```

Portrait works best on phones; landscape embeds get side panels automatically.

## Publishing

- **itch.io**: zip the folder contents (`index.html` at the zip root), Kind = HTML, tick
  "This file will be played in the browser", viewport 960 × 600 or 540 × 960, enable
  "Mobile friendly" and "Fullscreen button".
- **Web game portals**: upload the same zip and connect their SDK in `hooks`.
- **Your own site**: upload the folder to any static host.

## Controls

| Action | Touch | Mouse | Keyboard |
|---|---|---|---|
| Aim | Drag | Move | ← → or A / D |
| Drop | Release | Click | Space / Enter |
| Pause | Pause button | Pause button | Esc / P |
| Sound on/off | Sound button | Sound button | M |

## Browser support

Latest Chrome, Edge, Firefox, Safari, iOS Safari and Android Chrome.

## FAQ

**How do I make it easier?** Lower `physics.gravity` slightly, raise `rules.overflowSeconds`,
or give more weight to the smallest tiers in `dropper.weights`.

**Why do bodies feel slippery / sticky?** Tune `physics.friction` (0.02–0.06 is the sweet spot).

**Can I record a trailer?** Open `index.html?demo=1`: the built-in bot plays forever.

**Is the source code in one file?** No, it is split into small, commented modules so each part
is easy to find and change.

**Support:** contact the seller through the marketplace you purchased from.
