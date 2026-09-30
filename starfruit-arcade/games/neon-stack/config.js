/*
 * NEON STACK — configuration
 * ---------------------------------------------------------------------------
 * Every reskinnable value of the game lives in this file: colours, tuning,
 * texts (for translation) and monetization hooks. Edit, save, reload — no
 * build step. Keep the structure; missing keys fall back to built-in defaults.
 */
window.GAME_CONFIG = {
  // ---- Meta ----
  studio: 'Starfruit Arcade',          // Credit shown in the title-screen footer
  storageKey: 'neon-stack',            // localStorage namespace (change per reskin so best scores don't mix)

  // ---- Theme ----
  theme: {
    hueStart: 188,                     // Hue (0–360) of the first block (188 = cyan)
    hueStep: 6.5,                      // Hue shift per level → smooth rainbow up the tower
    saturation: 92,                    // Block colour saturation, 0–100 (%)
    lightness: 55,                     // Block base lightness, 0–100 (%); top face lighter, sides darker
    backgroundHueOffset: 150,          // Background hue = tower-top hue + this offset (150 ≈ complementary-ish)
    backgroundSaturation: 62,          // Background saturation (%)
    backgroundLightness: 8,            // Background darkness (%) — keep low so the blocks pop
    neonEdges: true,                   // Glowing neon outline on block top faces
    gridFloor: true,                   // Glowing grid floor under the pedestal
    sun: true,                         // Retro striped sun on the horizon behind the tower
    bokeh: true,                       // Drifting soft light particles + stars in the background
    vignette: true,                    // Darkened screen corners
    sunColors: ['#ffe66d', '#ff8a5c', '#ff3d9a', '#b429f9'], // Sun gradient, top → bottom
    horizonColor: '#ff3d9a',           // Glow along the horizon line
    gridColor: '#ff4fd8'               // Neon grid floor colour
  },

  // ---- Blocks ----
  block: {
    size: 100,                         // Starting width & depth of a block (world units; everything scales from this)
    height: 24,                        // Block thickness (world units) — 24 = chunky slabs, 15 = thin tiles
    pedestalLevels: 14,                // Height of the base column, in block heights
    screenFill: 1                      // On-screen size multiplier (1 = default, 0.8 = smaller tower, 1.2 = bigger)
  },

  // ---- Gameplay ----
  gameplay: {
    baseSpeed: 150,                    // Slide speed of the first block (world units per second)
    speedGain: 3,                      // Extra speed added per level
    maxSpeed: 330,                     // Speed cap
    slideRange: 1.4,                   // How far the block travels from centre, × block size
    perfectTolerance: 4,               // Max misalignment (world units) that still counts as PERFECT (snaps)
    growAfter: 3,                      // From this many consecutive perfects on, blocks regrow
    growAmount: 8,                     // Size regained per perfect once growing (capped at block.size)
    milestoneEvery: 10                 // Milestone text + hooks.onLevelUp every N blocks
  },

  // ---- Feel ----
  screenShake: true,                   // Shake on a miss (auto-disabled when the OS asks for reduced motion)
  camera: {
    anchor: 0.44,                      // Keep the tower top at this fraction of screen height while playing
    followSpeed: 5,                    // How fast the camera eases toward the tower top
    zoomOutDuration: 1.1               // Seconds of the game-over "whole tower" zoom-out
  },

  // ---- Sound ----
  sound: {
    enabledByDefault: true,            // Sound on for first-time players
    volume: 0.7                        // Master volume 0–1
  },

  // ---- Demo bot (title background and ?demo=1) ----
  demo: {
    perfectChance: 0.8,                // Share of placements the bot lands perfectly
    missAfterMin: 28,                  // Bot deliberately ends a round somewhere between these heights…
    missAfterMax: 60,                  // …so the game-over zoom-out shows up in trailers
    restartDelay: 1.5,                 // Seconds to admire the tower before the bot starts over
    titleSpeed: 0.8                    // Speed multiplier for the calmer title-screen bot
  },

  // ---- Texts ----
  texts: {
    title: 'NEON STACK',               // First word gets the neon-tube style, the rest the gradient style
    tagline: 'Stack it perfect. Stack it high.',
    play: 'Play',
    best: 'Best',
    score: 'Score',
    howTo: 'Tap, click or press Space to drop the block. Line it up perfectly to keep it big.',
    paused: 'Paused',
    resume: 'Resume',
    restart: 'Restart',
    playAgain: 'Play again',
    home: 'Home',
    share: 'Share',
    sound: 'Sound',
    soundOn: 'On',
    soundOff: 'Off',
    gameOver: 'Game over',
    newBest: 'New best!',
    perfect: 'PERFECT',                // Floating text; combo appended as "×N"
    tapToPlace: 'Tap to drop the block',      // First-round hint on touch screens
    clickToPlace: 'Click or press Space to drop', // First-round hint with mouse / keyboard
    copied: 'Copied!',
    shareText: 'I scored {score} in {title}! Can you stack higher?' // {score} and {title} are replaced
  },

  // ---- Hooks ----
  // Monetization / analytics hooks. All optional; defaults do nothing.
  hooks: {
    onGameStart: function () {},       // A round begins (Play or Play again)
    onGameOver: function (score) {},   // A round ended with this score
    onLevelUp: function (milestone) {},// Every gameplay.milestoneEvery blocks (receives 10, 20, 30…)
    // Called before "Play again" / "Restart". Return a Promise to hold the game
    // while an interstitial ad shows; the round starts when it resolves.
    beforeRestart: function () { return Promise.resolve(); }
  }
};
