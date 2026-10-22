# Swapsy — HTML5 match-3 source code

**Swap. Match. Smile.** A cute, polished match-3 puzzle with 24 levels, special pieces, jelly,
cascades and saved progress. Glossy jelly pieces with little faces, juicy effects, and a
difficulty curve tuned with thousands of simulated games. Reskin it with your own colours or
product pictures for an advergame, or publish it on web game portals.

- **24 handcrafted levels** with three goal types: reach a score, collect pieces, clear jelly
  (single and double). Shaped boards up to 9 × 9 with holes.
- **Special pieces**: 4 in a row → line blaster, L / T shape → bomb, 5 in a row → rainbow.
- **Special combos**: blaster + blaster (cross), blaster + bomb (3-wide cross), bomb + bomb (5 × 5),
  rainbow + piece (all of that colour), rainbow + rainbow (whole board).
- Chain-reaction cascades with rising chimes, praise banners, bonus points for moves left.
- **Stars and progress**: 1–3 stars per level, level select, unlocks and best scores saved.
- Hints after a few seconds of no input; automatic reshuffle when no moves are left.
- Swipe, tap-tap or keyboard (arrows + Space) controls.
- Six colour-blind-friendly piece shapes (heart, circle, star, leaf, drop, diamond), all drawn in
  code, or your own images.
- Title screen with a live bot playing; `?demo=1` attract mode for trailers.
- Pause (Esc / P, auto-pause on hidden tab), sound toggle (M), share button.
- Hooks for ads and analytics, fully translatable texts.
- Vanilla JavaScript, no dependencies, no build step, no external requests, about 100 KB.

## Quick start

1. Unzip.
2. Double-click `index.html`.

For development, serve the folder with any static server (`npx serve .`, VS Code Live Server).

## Files

| File | What it does |
|---|---|
| `index.html` | Page markup: canvas, HUD, title / levels / pause / result screens |
| `style.css` | Interface styling |
| `config.js` | **Every reskinnable value**: theme colours, pieces, scoring, timing, texts, hooks |
| `js/levels.js` | **The 24 levels** (see "Designing levels") |
| `js/board.js` | Match-3 rules: matches, specials, combos, gravity, move finding, shuffle (no drawing) |
| `js/render.js` | All drawing: background, board, jelly, pieces, specials, effects |
| `js/game.js` | Flow, animations, goals, stars, input, hints, demo bot, HUD, screens |
| `js/audio.js` | Synthesized sound effects (Web Audio API, no audio files) |
| `js/storage.js` | Safe `localStorage` wrapper (falls back to memory) |
| `tools/balance.mjs` | Level balancing simulator (Node.js, optional) |

## Reskinning

| `config.js` key | What it changes |
|---|---|
| `theme.skyTop`, `theme.skyBottom` | Background gradient |
| `theme.board`, `cellA`, `cellB` | Board panel and checkerboard cells |
| `theme.jelly`, `theme.accent`, `theme.ink` | Jelly colour, highlights, text outline |
| `pieces[]` | Up to 6 pieces: `name`, `color`, `shape` (`heart`, `circle`, `star`, `leaf`, `drop`, `diamond`) |
| `pieces[].image` | Use your own picture instead, e.g. `'assets/donut.png'` (square, transparent background) |
| `faces` | `false` removes the cute faces |
| `points`, `bonusPerMove` | Scoring |
| `hintDelay`, `swapTime`, `fallSpeed` | Feel |
| `unlockAll` | `true` opens every level from the start |
| `texts` | Every word on screen (translations) |
| `storageKey` | Change it for each reskin so saved progress never mixes |

**Branded version (advergame):** give each piece a product picture (`image`), set the theme
colours to the brand's, change `texts.title` / `tagline`, and edit `js/levels.js` to a handful
of levels. The pieces are drawn by `pieceSprite()` / `drawBase()` in `js/render.js`.

## Designing levels

Open `js/levels.js`:

```js
{ name: 'Jelly Jam', moves: 20, kinds: 5, goal: { type: 'jelly' }, stars: [3000, 3900, 5100],
  layout: ['........', '........', '..jjjj..', '..jjjj..', '..jjjj..', '..jjjj..', '........', '........'] }
```

| Key | Meaning |
|---|---|
| `moves` | Moves available |
| `kinds` | Piece colours in play (4 easy, 5 normal, 6 hard) |
| `goal` | `{ type: 'score' }` (reach `stars[0]`), `{ type: 'collect', items: { 0: 15, 2: 15 } }` (piece index → count), `{ type: 'jelly' }` |
| `stars` | Scores for 1, 2 and 3 stars (1 star also needs the goal) |
| `layout` | Optional rows of `.` cell, `#` no cell, `j` jelly, `J` double jelly (up to 9 × 9) |

Score levels run until the moves are used up; collect and jelly levels end as soon as the goal
is reached, and every move left becomes `bonusPerMove` points.

## Monetization

Wire the hooks in `config.js` to an ad or analytics SDK:

```js
hooks: {
  onGameStart: function (level) { /* sdk.gameplayStart() */ },
  onGameOver:  function (score) { /* sdk.gameplayStop() */ },
  onLevelUp:   function (level) { /* analytics event */ },
  beforeRestart: function () {
    // Show an interstitial between levels; the game waits for the Promise.
    return new Promise(function (resolve) {
      /* sdk.showMidgameAd({ onFinished: resolve, onError: resolve }) */
      resolve();
    });
  }
}
```

`beforeRestart` runs before "Next level", "Replay" and "Try again". Embed with an iframe:

```html
<iframe src="swapsy/index.html" width="480" height="800" style="border:0" allow="autoplay" title="Swapsy"></iframe>
```

Recommended sizes: 480 × 800 (portrait) or 960 × 600; any size works.

## Publishing

- **itch.io:** zip the folder, create an HTML project, upload, tick "This file will be played in
  the browser", viewport 540 × 860 (or 960 × 640), enable "Mobile friendly" and the fullscreen button.
- **CrazyGames / GameDistribution and other portals:** add the portal's SDK script tag to
  `index.html`, call it from the hooks, and follow the portal's checklist (the game already pauses
  on hidden tabs, has a mute button and makes no external requests).
- **Your own website:** upload the folder to any static host.

## Controls

| Action | Touch | Mouse | Keyboard |
|---|---|---|---|
| Swap | Swipe a piece toward a neighbour, or tap two neighbours | Drag or click two neighbours | Arrows to move the cursor, Space to pick, then an arrow to swap |
| Pause | Pause button | Pause button | Esc / P |
| Sound | Sound button | Sound button | M |

## Browser support

Latest Chrome, Edge, Firefox and Safari on desktop; iOS Safari 15+ and Android Chrome. Works
offline and from `file://`.

## FAQ

**How was the difficulty tuned?** Every level was played hundreds of times by a simulated player
(half best moves, half random), and moves, goals and star scores were set from the results:
early levels are won about 90 % of the time, the hardest ones about 40–60 %. The simulator is
included: `node tools/balance.mjs` (needs Node.js 18+) prints the win rate and score spread of every
level, so you can balance your own levels the same way.

**Can I add more levels?** Yes, add entries to `js/levels.js`; the level select grows by itself.

**Can I change the number of columns?** Each level's `layout` sets its size (up to 9 × 9).

**Is there a level editor?** Levels are plain text in `js/levels.js`, readable at a glance.

**Support:** contact the seller through the marketplace you purchased from.
