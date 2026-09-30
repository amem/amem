# Neon Stack — HTML5 source code

**Stack it perfect. Stack it high.** A one-tap isometric stacking game with a neon synthwave
look. Blocks slide in; tap to drop. Whatever hangs over the edge is sliced off, perfect drops
chain into combos that make the block grow back, and when you finally miss, the camera pulls
back to show off your whole tower.

- One-tap gameplay: tap, click or Space. Anyone understands it in two seconds.
- Isometric 2.5D rendering on Canvas 2D with neon edges, a retro sun and a synthwave grid.
- Perfect-drop combos with rising musical chimes, ripples, sparks and block regrow.
- Cinematic zoom-out on game over, falling slices, milestone banners every 10 blocks.
- Title screen with a live, bot-built tower behind it; `?demo=1` attract mode for trailers.
- Pause (Esc/P, auto-pause when the tab is hidden), sound toggle (M), best score saved.
- Hooks for ads and analytics, share button, fully translatable texts.
- Vanilla JavaScript, no dependencies, no build step, no external requests, ~80 KB.
- Runs from `file://`, any web server, itch.io and web game portals. Phone, tablet and desktop.

## Quick start

1. Unzip.
2. Double-click `index.html`. That's it.

For development with live reload, serve the folder with any static server, for example
`npx serve .` or the VS Code "Live Server" extension.

## Files

| File | What it does |
|---|---|
| `index.html` | Page markup: canvas, HUD, title / pause / game-over screens |
| `style.css` | All interface styling (overlays, buttons, HUD) |
| `config.js` | **Every reskinnable value**: colours, block size, speed, difficulty, texts, hooks |
| `js/storage.js` | Safe `localStorage` wrapper (falls back to memory in private mode) |
| `js/audio.js` | Synthesized sound effects (Web Audio API, no audio files) |
| `js/render.js` | Isometric projection, background, pedestal and block drawing |
| `js/effects.js` | Pooled debris, sparks, ripples and floating texts |
| `js/bot.js` | The demo player used on the title screen and in `?demo=1` |
| `js/game.js` | Game rules, camera, input, screens and the `window.__GAME__` API |

## Reskinning

Open `config.js`. Every key has a comment; save and reload to see the change.

| Key | Effect |
|---|---|
| `theme.hueStart`, `theme.hueStep` | Colour of the first block and how fast the rainbow shifts up the tower |
| `theme.saturation`, `theme.lightness` | Block colour intensity |
| `theme.backgroundHueOffset` | Background colour relative to the tower (150 = complementary) |
| `theme.sun`, `theme.gridFloor`, `theme.bokeh`, `theme.neonEdges` | Turn scenery pieces on or off |
| `theme.sunColors`, `theme.gridColor`, `theme.horizonColor` | Synthwave palette |
| `block.size`, `block.height` | Block footprint and thickness |
| `gameplay.baseSpeed`, `speedGain`, `maxSpeed` | Difficulty curve |
| `gameplay.perfectTolerance` | How forgiving a PERFECT is (world units) |
| `gameplay.growAfter`, `growAmount` | Combo needed before blocks regrow, and by how much |
| `camera.anchor`, `camera.zoomOutDuration` | Where the tower top sits on screen; game-over zoom length |
| `texts.*` | Every word on screen, for translation or rebranding |
| `studio` | The credit line on the title screen |
| `storageKey` | Change it per reskin so best scores of different versions don't mix |

The title splits on the first space: the first word gets the neon-tube style, the rest the
gradient style (`texts.title: 'NEON STACK'`).

**Image-based blocks.** Blocks are drawn procedurally in `drawCuboid()` in `js/render.js`.
The four projected top-face corners (`P[0..7]`) and the side height (`dh`) are computed at the
top of that function; replace the three `fill()` calls with `ctx.drawImage` / pattern fills to
use textures (wood, candy, your brand's packaging…).

**UI colours and fonts** live in the `:root` variables at the top of `style.css`.

## Monetization and analytics

`config.js` → `hooks`:

```js
hooks: {
  onGameStart: function () {},              // a round begins
  onGameOver: function (score) {},          // a round ended
  onLevelUp: function (milestone) {},       // every 10 blocks (10, 20, 30…)
  beforeRestart: function () {              // before "Play again": show an interstitial
    return new Promise(function (resolve) {
      // Example with a generic ad SDK — call resolve() when the ad closes or fails.
      if (window.MyAdSdk) window.MyAdSdk.showInterstitial({ onClose: resolve, onError: resolve });
      else resolve();
    });
  }
}
```

Web game portals ask for "gameplay start/stop" events: call their SDK from `onGameStart` and
`onGameOver`. The game already pauses itself when the tab is hidden and mutes with **M**.

**Embed on any website:**

```html
<iframe src="neon-stack/index.html" width="480" height="800" style="border:0;max-width:100%"
        allow="autoplay; fullscreen" title="Neon Stack"></iframe>
```

It adapts to any size; portrait 9:16 and landscape 16:9 both work.

## Publishing

- **itch.io**: zip the folder contents (so `index.html` is at the zip root), create a project,
  Kind = HTML, upload the zip, tick "This file will be played in the browser". Viewport
  960 × 600 (or 540 × 960 for portrait), enable "Mobile friendly" and "Fullscreen button".
- **Web game portals** (CrazyGames, GameDistribution, GamePix…): upload the same zip and wire
  their SDK into `hooks` as shown above.
- **Your own site**: upload the folder to any static host (Netlify, GitHub Pages, Vercel,
  shared hosting) and link to `index.html`.

## Controls

| Action | Touch | Mouse | Keyboard |
|---|---|---|---|
| Drop the block | Tap | Click | Space / Enter |
| Pause | Pause button | Pause button | Esc / P |
| Sound on/off | Sound button | Sound button | M |

## Browser support

Latest Chrome, Edge, Firefox, Safari, iOS Safari and Android Chrome.

## FAQ

**Sound doesn't play at first.** Browsers only allow audio after the first tap or click; the game
unlocks it on the first interaction.

**How do I make it easier?** Raise `gameplay.perfectTolerance` and lower `gameplay.baseSpeed`.

**How do I reset the best score?** Change `storageKey` in `config.js` (or clear the site data).

**Can I record a trailer?** Open `index.html?demo=1`: the built-in bot plays forever with only
the score on screen.

**Support:** contact the seller through the marketplace you purchased from.
