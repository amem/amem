/*
 * Cosmic Merge — game configuration.
 * Every reskinnable value lives here: colours, texts, tiers, physics and rules.
 * Edit, save and reload index.html — no build step needed.
 */
window.GAME_CONFIG = {
  // ---- Identity ----
  studio: 'Starfruit Arcade',          // credit shown on the title screen footer
  storageKey: 'cosmic-merge',          // localStorage prefix (change it per reskin so saves don't collide)

  // ---- Theme ----
  theme: {
    bgTop: '#070a22',                  // background gradient, top colour
    bgBottom: '#1a0c3d',               // background gradient, bottom colour
    nebula: true,                      // draw the slowly drifting nebula clouds
    nebulaColors: ['#7c3aed', '#ff4fa3', '#22d3ee', '#3b82f6'], // nebula cloud tints
    stars: true,                       // draw twinkling stars
    jarFill: 'rgba(130, 150, 255, 0.07)',   // glass tint inside the jar
    jarWall: '#8ea8ff',                // glass wall colour
    jarRim: '#7af3ff',                 // glowing rim / wall-cap colour
    jarFloorGlow: '#b56cff',           // glow under the floor of the jar
    dangerColor: '#ff4d6d',            // danger line colour when a body gets close
    dangerIdle: 'rgba(255, 255, 255, 0.28)', // danger line colour at rest
    aimColor: 'rgba(255, 255, 255, 0.55)',   // dotted aim guide colour
    ufoBody: '#c7d2fe',                // dropper saucer colour
    ufoDome: '#7af3ff',                // dropper dome colour
    ufoBeam: 'rgba(122, 243, 255, 0.16)',    // dropper tractor-beam colour
    panelFill: 'rgba(22, 16, 58, 0.55)',     // side panel (NEXT / evolution) card fill
    panelStroke: 'rgba(160, 170, 255, 0.28)', // side panel border
    textColor: '#f4f1ff',              // canvas text colour
    accent: '#ffcf5c'                  // highlight colour (combo text, new-tier banner)
  },

  // ---- Tiers ----
  // Merge chain from smallest to largest. Two bodies of tier N merge into tier N+1.
  // radius: fraction of the jar's inner width. score: points when this tier is created.
  // style: procedural painter (asteroid, moon, mars, venus, earth, neptune, uranus,
  //        saturn, jupiter, sun, blackhole) — see js/sprites.js.
  // colors: [base, dark, light, accent] used by the painter, particles and icons.
  // image: optional path to your own PNG (e.g. 'img/cherry.png') drawn instead of the painter.
  tiers: [
    { name: 'Asteroid',   radius: 0.046, score: 1,  style: 'asteroid',  colors: ['#9a8674', '#5e4d40', '#cdb9a3', '#7a6656'] },
    { name: 'Moon',       radius: 0.060, score: 3,  style: 'moon',      colors: ['#d8dcea', '#8d93ab', '#ffffff', '#b5bbd0'] },
    { name: 'Mars',       radius: 0.076, score: 6,  style: 'mars',      colors: ['#f0673a', '#a2301a', '#ffae84', '#ffd2b8'] },
    { name: 'Venus',      radius: 0.093, score: 10, style: 'venus',     colors: ['#f6d68d', '#c5903f', '#fff4cc', '#e7b35e'] },
    { name: 'Earth',      radius: 0.113, score: 15, style: 'earth',     colors: ['#2f86ea', '#123f93', '#9fd8ff', '#43c96e'] },
    { name: 'Neptune',    radius: 0.136, score: 21, style: 'neptune',   colors: ['#3a5ee8', '#1a2479', '#86a4ff', '#c9d6ff'] },
    { name: 'Uranus',     radius: 0.162, score: 28, style: 'uranus',    colors: ['#62e2e6', '#1f94a8', '#c4fdff', '#a8f0ef'] },
    { name: 'Saturn',     radius: 0.192, score: 36, style: 'saturn',    colors: ['#ecc76c', '#a97b31', '#fff1c2', '#f7e2b0'] },
    { name: 'Jupiter',    radius: 0.228, score: 45, style: 'jupiter',   colors: ['#eab27a', '#b86a36', '#fbe8cc', '#d0452b'] },
    { name: 'Sun',        radius: 0.272, score: 55, style: 'sun',       colors: ['#ffc933', '#ff7a1a', '#fff6c2', '#ffe066'] },
    { name: 'Black Hole', radius: 0.330, score: 66, style: 'blackhole', colors: ['#0a0414', '#ff9a3d', '#ffe3a3', '#b26bff'] }
  ],
  faces: true,                         // cute faces (eyes blink, surprised after impacts)
  faceColor: '#2b1638',                // eye / mouth colour on light planets
  faceColorDark: '#f8f4ff',            // eye / mouth colour on dark planets (Neptune, Black Hole)
  blushColor: 'rgba(255, 110, 150, 0.45)', // cheek blush

  // ---- Physics ----
  physics: {
    gravity: 6.4,                      // downward acceleration, in jar-widths per second²
    stepHz: 120,                       // fixed simulation rate (steps per second)
    substeps: 4,                       // sub-steps per step (more = stiffer piles, more CPU)
    iterations: 2,                     // collision solver passes per sub-step
    airDamping: 0.12,                  // velocity loss per second while flying
    friction: 0.035,                   // tangential friction at contacts (0 = ice, 0.1 = sticky)
    restitution: 0.12,                 // bounciness (0 = dead, 1 = rubber)
    maxSpeed: 3.2,                     // speed clamp, in jar-widths per second
    restSpeed: 0.012,                  // below this speed (jar-widths/s) resting bodies are calmed
    mergeGrowTime: 0.16                // seconds a merged body takes to grow to full size (soft push)
  },

  // ---- Dropper ----
  dropper: {
    cooldown: 0.5,                     // seconds before the next body can be dropped
    droppableTiers: [0, 1, 2, 3, 4],   // tiers the launcher may hand you
    weights: [34, 28, 20, 12, 6],      // relative chance of each droppable tier (same order)
    keyboardSpeed: 1.1,                // arrow-key aim speed, in jar-widths per second
    followSharpness: 22                // how snappily the saucer follows the pointer
  },

  // ---- Rules ----
  rules: {
    dangerLine: 0.045,                 // danger line position, fraction of jar height below the rim
    overflowSeconds: 2.5,              // seconds a body may stay above the line before game over
    graceSeconds: 1.0,                 // a body must be in play this long before it can trigger game over
    comboWindow: 1.0,                  // seconds between chain-reaction merges (from one drop) to keep a combo going
    comboMaxMultiplier: 5,             // score multiplier cap for combos
    blackHoleBonus: 1000,              // bonus when two Black Holes collide (Big Bang)
    jarAspect: 1.3                     // jar inner height / width
  },

  // ---- Demo bot (title screen background and ?demo=1) ----
  bot: {
    dropInterval: 0.8,                 // seconds between bot drops
    restartDelay: 1.5                  // seconds before the demo restarts after a game over
  },

  // ---- Feel ----
  screenShake: true,                   // false disables shake (also off with prefers-reduced-motion)
  shakeStrength: 1,                    // shake multiplier
  particles: true,                     // merge particles
  sound: true,                         // sound on by default (players can mute; choice is remembered)
  volume: 0.7,                         // master volume 0..1

  // ---- Texts ----
  texts: {
    title: 'COSMIC MERGE',             // logo text (a space splits it into two lines)
    tagline: 'Drop. Merge. Make a star.', // tagline under the logo
    play: 'Play',                      // title screen button
    best: 'Best',                      // best score label
    score: 'Score',                    // score label
    next: 'Next',                      // next-body preview label
    evolution: 'Evolution',            // evolution chain label
    howTo: 'Match two identical planets to merge them into a bigger one.', // title screen one-liner
    hint: 'Move to aim · tap or click to drop', // first-round hint (touch / mouse)
    hintKeys: 'Arrows to aim · Space to drop',  // first-round hint second line
    paused: 'Paused',                  // pause overlay title
    resume: 'Resume',                  // pause overlay button
    restart: 'Restart',                // pause overlay button
    home: 'Home',                      // home button
    sound: 'Sound',                    // sound toggle label
    on: 'On',                          // sound toggle state
    off: 'Off',                        // sound toggle state
    gameOver: 'Jar Overflow!',         // game over title
    playAgain: 'Play again',           // game over primary button
    share: 'Share',                    // share button
    newBest: 'NEW BEST!',              // badge on a new best score
    reached: 'Biggest merge',          // game over: label for the largest tier created
    combo: 'COMBO ×{n}',               // floating combo text ({n} = combo count)
    newTier: 'NEW: {name}!',           // banner when a tier is created for the first time in a run
    bigBang: 'BIG BANG!',              // text when two Black Holes collide
    shareText: 'I scored {score} in Cosmic Merge! Can you make a star?', // share / clipboard text
    copied: 'Copied!'                  // toast after copying the share text
  },

  // ---- Hooks ----
  // Optional callbacks for ads / analytics. All are no-ops by default.
  hooks: {
    onGameStart: function () {},                              // a player round starts
    onGameOver: function (score) {},                          // a player round ends
    onLevelUp: function (tierIndex) {},                       // a tier is created for the first time this round
    beforeRestart: function () { return Promise.resolve(); }  // return a Promise to show an interstitial before "Play again"
  }
};
