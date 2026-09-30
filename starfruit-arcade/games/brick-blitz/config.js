/*
 * Brick Blitz — configuration.
 * Every reskinnable value lives in this file: colours, tuning, texts and hooks.
 * Edit, save, reload the page. No build step needed.
 */
window.GAME_CONFIG = {
  // ---- Meta ----
  title: 'Brick Blitz',                     // game name (window title, share text)
  studio: 'Starfruit Arcade',               // studio credit shown in footers

  // ---- Theme ----
  theme: {
    bgTop: '#170b3b',                       // page background gradient, top
    bgBottom: '#040210',                    // page background gradient, bottom
    gridColor: '#ff2fd0',                   // moving neon perspective grid behind the playfield
    horizonColor: '#8a3cff',                // soft glow along the grid horizon
    starColor: '#9fe8ff',                   // floating background particles
    fieldColor: 'rgba(8, 6, 26, 0.9)',      // playfield panel fill
    railColors: ['#22e5ff', '#ff3dcf'],     // neon wall gradient (left/top → right/bottom)
    textColor: '#ffffff',                   // HUD values
    labelColor: '#8fa3d9',                  // HUD labels
    accent: '#22e5ff',                      // primary accent (aim guide, highlights)
    accent2: '#ff3dcf',                     // secondary accent (combo, banners)
    glow: true,                             // pre-rendered neon glow (set false for very low-end devices)
    defaultPalette: 'neon',                 // row palette used when a level does not name one
    palettes: {                             // brick colours per row, top row first (cycles when a level is taller)
      neon:   ['#ff3d8b', '#ff4fd8', '#d64dff', '#9d5cff', '#6f6bff', '#3d8bff', '#22c3ff', '#22e5ff', '#2bffd0', '#3dff8e', '#a4ff3d', '#ecff3d', '#ffd23d', '#ff9a3d'],
      sunset: ['#ffe45c', '#ffc94d', '#ffab40', '#ff8c42', '#ff6b4a', '#ff4d6d', '#ff3d8b', '#e83da8', '#c43dc8', '#9b3de6', '#7a4dff', '#5b5bff', '#3d7bff', '#22a8ff'],
      ocean:  ['#7af6ff', '#4de8ff', '#22d3ff', '#22b4ff', '#3d95ff', '#5b7bff', '#7a6bff', '#22e5d0', '#2bffc0', '#3dffa0', '#22d3ff', '#3d95ff', '#5b7bff', '#7a6bff'],
      toxic:  ['#e8ff3d', '#c6ff3d', '#a4ff3d', '#7dff3d', '#3dff6b', '#3dff8e', '#2bffc0', '#22e5ff', '#3dff8e', '#7dff3d', '#a4ff3d', '#c6ff3d', '#e8ff3d', '#ffd23d'],
      candy:  ['#ff6bd6', '#ff5cc0', '#ff4da8', '#ff3d8b', '#ff4d6d', '#ff6b6b', '#ff8c8c', '#ff5cc0', '#e04dff', '#b85cff', '#ff6bd6', '#ff4da8', '#ff3d8b', '#ff4d6d'],
      gold:   ['#ffe45c', '#ffd23d', '#ffc233', '#ffb02e', '#ff9a2e', '#ff862e', '#ff6f2e', '#ffd23d', '#ffb02e', '#ff9a2e', '#ff862e', '#ff6f2e', '#ffd23d', '#ffb02e']
    },
    steel: '#93a0c4',                       // unbreakable steel bricks
    explosive: '#ff4a2a',                   // explosive "X" bricks
    mystery: '#ffd23f',                     // guaranteed power-up "?" bricks
    paddle: ['#9ffbff', '#2266ff'],         // paddle body gradient (top, bottom)
    paddleAccent: '#ff3dcf',                // paddle end caps
    ball: '#ffffff',                        // ball core
    ballGlow: '#63f1ff',                    // ball glow and trail
    fireball: '#ff7a1a',                    // ball colour while Fireball is active
    laser: '#ff4f7b'                        // laser bolts
  },

  // ---- Images (optional) ----
  images: {
    brick: '',                              // e.g. 'img/brick.png' — tinted with the row colour ('' = procedural neon brick)
    paddle: '',                             // e.g. 'img/paddle.png' — stretched to the paddle size ('' = procedural)
    ball: ''                                // e.g. 'img/ball.png' — drawn at the ball diameter ('' = procedural)
  },

  // ---- Paddle ----
  paddle: {
    width: 112,                             // normal paddle width (logical px; the playfield is 640 × 960)
    height: 18,                             // paddle thickness
    keySpeed: 950,                          // keyboard speed (px/s)
    maxBounceAngle: 60,                     // degrees from vertical when the ball hits the paddle edge
    velocityInfluence: 12,                  // max extra degrees added by a fast-moving paddle
    wideFactor: 1.55,                       // width multiplier for the Wide power-up
    shrinkFactor: 0.65                      // width multiplier for the Shrink power-up
  },

  // ---- Ball ----
  ball: {
    radius: 9,                              // ball radius (logical px)
    startSpeed: 420,                        // speed on level 1 (px/s)
    maxSpeed: 900,                          // hard speed cap (px/s)
    speedUpPerHit: 2.2,                     // px/s added on every brick hit (reset each life / level)
    speedUpPerLevel: 0.045,                 // +4.5 % base speed per level
    loopSpeedUp: 0.10,                      // +10 % speed for each completed loop of all 12 levels
    minVerticalAngle: 15,                   // degrees — prevents near-horizontal endless bouncing
    maxBalls: 12                            // cap for Multi-ball
  },

  // ---- Gameplay ----
  lives: 3,                                 // lives at the start of a run
  maxLives: 6,                              // lives cap (+1 Life capsules stop at this)
  catchAutoRelease: 3,                      // seconds before a caught ball launches by itself
  laserCooldown: 0.26,                      // seconds between laser shots
  laserSpeed: 1250,                         // laser bolt speed (px/s)

  // ---- Power-ups ----
  powerups: {
    dropChance: 0.13,                       // chance a normal brick drops a capsule ("?" bricks always drop)
    maxOnScreen: 4,                         // capsules falling at the same time
    fallSpeed: 175,                         // capsule fall speed (px/s)
    slowFactor: 0.62,                       // ball speed multiplier while Slow is active
    types: {                                // weight = relative drop chance, duration in seconds
      multi:  { weight: 16, color: '#22e5ff', letter: 'M' },
      wide:   { weight: 15, color: '#3dff8e', letter: 'W', duration: 15 },
      laser:  { weight: 12, color: '#ff3b5c', letter: 'L', duration: 10 },
      slow:   { weight: 11, color: '#5b7cff', letter: 'S', duration: 12 },
      fire:   { weight: 9,  color: '#ff9a1f', letter: 'F', duration: 8 },
      catch:  { weight: 11, color: '#e8ff3d', letter: 'C', duration: 15 },
      life:   { weight: 3,  color: '#ff5fd2', letter: '+' },
      shrink: { weight: 6,  color: '#9a6bff', letter: '-', duration: 10 }
    }
  },

  // ---- Scoring ----
  scoring: {
    hit: 10,                                // damaging a multi-hit brick
    brick: 50,                              // destroying a brick (× its max hit points)
    explosive: 80,                          // destroying an "X" brick
    mystery: 100,                           // destroying a "?" brick
    capsule: 100,                           // catching a capsule
    levelClear: 1000,                       // bonus for clearing a level
    lifeBonus: 500,                         // bonus per remaining life on level clear
    comboStep: 4,                           // brick hits (without touching the paddle) per +1 multiplier
    maxMultiplier: 8                        // combo multiplier cap
  },

  // ---- Feel ----
  screenShake: true,                        // camera shake on explosions / lost lives (auto-off with reduced motion)
  particles: 1,                             // particle amount multiplier (0.5 = half, 0 = none)
  slowMoLastBrick: true,                    // brief slow motion when the last brick of a level breaks

  // ---- Sound ----
  sound: true,                              // sound on by default (the player's choice is remembered)
  volume: 0.7,                              // master volume 0..1

  // ---- Demo bot ----
  bot: {
    speed: 1500,                            // max paddle speed of the bot (px/s)
    skill: 0.92                             // 0..1 — how accurately it aims at bricks
  },

  // ---- Texts ----
  texts: {
    titleTop: 'BRICK',                      // logo, first word
    titleBottom: 'BLITZ',                   // logo, second word
    tagline: 'Smash. Power up. Blitz through 12 levels.',
    play: 'Play',
    levels: 'Levels',
    selectLevel: 'Select level',
    back: 'Back',
    best: 'Best',
    score: 'Score',
    level: 'Level',
    lives: 'Lives',
    sound: 'Sound',
    paused: 'Paused',
    resume: 'Resume',
    restart: 'Restart',
    home: 'Home',
    gameOver: 'Game over',
    newBest: 'NEW BEST!',
    playAgain: 'Play again',
    share: 'Share',
    copied: 'Copied!',
    reached: 'Reached level {level}',
    levelClear: 'LEVEL {level} CLEAR',
    clearBonus: 'CLEAR BONUS',
    livesBonus: 'LIVES BONUS',
    victory: 'VICTORY!',
    victorySub: 'All 12 levels smashed',
    loop: 'LOOP {loop}',
    loopSub: 'Speed +10%',
    lastLife: 'LAST LIFE!',
    combo: 'COMBO',
    launchHint: 'Click or press Space to launch',
    launchHintTouch: 'Tap to launch · drag to move',
    howTo: 'Move to aim · Space / tap to launch · catch the capsules',
    powerupsTitle: 'POWER-UPS',
    controlsHint: 'SPACE launch / fire · ESC pause · M mute',
    powerups: {                             // flash text + legend names per capsule
      multi: 'MULTI-BALL!',
      wide: 'WIDE PADDLE!',
      laser: 'LASERS!',
      slow: 'SLOW BALL',
      fire: 'FIREBALL!',
      catch: 'CATCH!',
      life: '+1 LIFE!',
      shrink: 'SHRINK!'
    },
    shareText: 'I scored {score} in Brick Blitz! Can you beat it?'  // share / clipboard text; {score} is replaced
  },

  // ---- Hooks ----
  hooks: {
    onGameStart: function () {},            // a run starts (Play, level select, Play again)
    onGameOver: function (score) {},        // the run ended with this score
    onLevelUp: function (level) {},         // a level (1-12) was cleared; 2nd argument = loop number
    // Called before "Play again". Return a Promise to pause the game while an
    // interstitial ad shows (e.g. GameDistribution / CrazyGames / AdSense H5 SDK).
    beforeRestart: function () { return Promise.resolve(); }
  }
};
