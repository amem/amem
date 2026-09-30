# Brick Blitz — HTML5 source code

**Smash. Power up. Blitz through 12 levels.** A neon brick-breaker with handcrafted levels,
eight power-ups, explosive chain reactions, a level select with saved progress and an endless
loop mode. Fast, juicy and readable on a phone.

- 12 handcrafted levels in a plain-text format you can edit in any text editor.
- Brick types: 1-, 2- and 3-hit plates (with cracks), unbreakable steel, explosive bricks with
  chain reactions, and "?" bricks that always drop a power-up.
- 8 power-ups: Multi-ball, Wide paddle, Lasers, Slow ball, Fireball, Catch, +1 Life, Shrink.
- Tunnel-proof, sub-stepped ball physics; paddle angle control; no endless horizontal loops.
- Combo multiplier, level-clear bonus tally, last-brick slow motion, victory + loop mode.
- Level select with progress saved; best score saved.
- Desktop side panels (level info, power-up legend), taller playfield on tall phones.
- Title screen with a live bot playing; `?demo=1` attract mode for trailers.
- Pause (Esc/P, auto-pause on hidden tab), sound toggle (M), share button.
- Hooks for ads and analytics, fully translatable texts, optional image skins.
- Vanilla JavaScript, no dependencies, no build step, no external requests, ~120 KB.

## Quick start

1. Unzip.
2. Double-click `index.html`.

For development, serve the folder with any static server (`npx serve .`, VS Code Live Server).

## Files

| File | What it does |
|---|---|
| `index.html` | Page markup: canvas, buttons, title / level select / pause / game-over screens |
| `style.css` | Interface styling |
| `config.js` | **Every reskinnable value**: colours, paddle, ball, power-ups, scoring, texts, hooks |
| `js/levels.js` | **The 12 levels** (see "Designing levels" below) |
| `js/storage.js` | Safe `localStorage` wrapper (falls back to memory) |
| `js/audio.js` | Synthesized sound effects (Web Audio API, no audio files) |
| `js/physics.js` | Playfield layout and collision helpers |
| `js/fx.js` | Pooled particles, rings, floating texts and screen shake |
| `js/render.js` | All drawing: background, field, bricks, paddle, balls, HUD, banners |
| `js/game.js` | Rules, power-ups, levels flow, demo bot, input and screens |

## Designing levels

Open `js/levels.js`. Each level is 12 characters wide and up to 14 rows tall:

| Char | Brick |
|---|---|
| `.` | empty |
| `1` `2` `3` | brick with that many hit points |
| `S` | steel, unbreakable (not needed to clear the level) |
| `X` | explosive: destroys its 8 neighbours and chains into other `X` |
| `?` | always drops a power-up |

```js
{
  name: 'MY LEVEL',
  palette: 'sunset',          // any palette from config.js theme.palettes
  rows: [
    '....2222....',
    '...211112...',
    '..21?XX?12..',
    'SS21111112SS'
  ]
}
```

Add, remove or reorder levels freely; the level select grows with the list. The level is
cleared when every breakable brick is gone.

## Reskinning

| Key | Effect |
|---|---|
| `theme.palettes`, `theme.defaultPalette` | Brick colours per row |
| `theme.steel`, `explosive`, `mystery` | Special brick colours |
| `theme.paddle`, `paddleAccent`, `ball`, `ballGlow` | Paddle and ball look |
| `theme.bgTop`, `bgBottom`, `gridColor`, `railColors` | Background and neon walls |
| `images.brick`, `images.paddle`, `images.ball` | Use your own PNGs (bricks are tinted per row) |
| `paddle.width`, `ball.startSpeed`, `ball.maxSpeed` | Difficulty |
| `lives`, `maxLives` | Lives |
| `powerups.dropChance`, `powerups.types.*.weight / duration` | Power-up economy |
| `scoring.*` | Points, combo steps, bonuses |
| `texts.*` | Every word on screen |
| `studio` | Credit line |

## Monetization and analytics

`config.js` → `hooks`:

```js
hooks: {
  onGameStart: function () {},                  // a run starts
  onGameOver: function (score) {},              // the run ended
  onLevelUp: function (level, loop) {},         // level 1–12 cleared (loop = 1, 2, …)
  beforeRestart: function () {                  // before "Play again": show an interstitial
    return new Promise(function (resolve) {
      if (window.MyAdSdk) window.MyAdSdk.showInterstitial({ onClose: resolve, onError: resolve });
      else resolve();
    });
  }
}
```

`onLevelUp` is the natural place for a "midgame" ad on portals.

**Embed on any website:**

```html
<iframe src="brick-blitz/index.html" width="480" height="720" style="border:0;max-width:100%"
        allow="autoplay; fullscreen" title="Brick Blitz"></iframe>
```

## Publishing

- **itch.io**: zip the folder contents (`index.html` at the zip root), Kind = HTML, tick
  "This file will be played in the browser", viewport 960 × 720 (or 540 × 960), enable
  "Mobile friendly" and "Fullscreen button".
- **Web game portals**: upload the same zip and connect their SDK in `hooks`.
- **Your own site**: upload the folder to any static host.

## Controls

| Action | Touch | Mouse | Keyboard |
|---|---|---|---|
| Move paddle | Drag | Move | ← → or A / D |
| Launch / fire lasers | Tap | Click | Space / Enter |
| Pause | Pause button | Pause button | Esc / P |
| Sound on/off | Sound button | Sound button | M |

## Browser support

Latest Chrome, Edge, Firefox, Safari, iOS Safari and Android Chrome.

## FAQ

**How do I make it easier?** Lower `ball.startSpeed` / `ball.maxSpeed`, raise `paddle.width`
or `lives`, or raise `powerups.dropChance`.

**How do I unlock all levels for testing?** Clear the site data, or temporarily change the
`unlocked` default in `js/game.js` (search for `store.get('unlocked'`).

**Can I record a trailer?** Open `index.html?demo=1`: the built-in bot plays level after level.

**Support:** contact the seller through the marketplace you purchased from.
