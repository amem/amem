/* ==========================================================================
   CATCH RUSH — gameplay settings
   Brand, products, rewards and texts shared by all games live in ../brand.config.js.
   This file only tunes how Catch Rush plays.
   ========================================================================== */
window.GAME_CONFIG = {

  // ---- Round ----------------------------------------------------------------
  roundSeconds: 30,              // length of one round
  countdown: true,               // "Ready… GO!" before items start falling
  urgentSeconds: 5,              // last seconds: pulsing red timer + ticking sound

  // ---- Scoring ----------------------------------------------------------------
  points: 10,                    // per product caught
  goldenPoints: 50,              // per golden star caught
  comboSteps: [5, 12, 20],       // catches in a row needed for ×2, ×3, ×4 points
  badTimePenalty: 3,             // seconds lost when a bomb / rotten item lands in the cup

  // ---- Difficulty (ramps from Start to End over the round) ----------------------
  spawnPerSecondStart: 1.3,      // items per second at the start
  spawnPerSecondEnd: 3.0,        // items per second at the end
  fallSpeedStart: 0.36,          // screen heights per second at the start
  fallSpeedEnd: 0.72,            // screen heights per second at the end
  goldenChance: 0.06,            // chance that a new item is a golden star
  badChanceStart: 0.14,          // chance that a new item is bad, at the start
  badChanceEnd: 0.26,            // … and at the end

  // ---- Items ------------------------------------------------------------------------
  goldenIcon: 'star',            // built-in icon for the bonus item (see ../shared/icons.js)
  badItems: ['bomb', 'rotten'],  // built-in icons for the items to avoid

  // ---- Feel ---------------------------------------------------------------------------
  keyboardSpeed: 1.25,           // cup speed with arrow keys, in field widths per second
  screenShake: true,             // shake on bombs (always off with "reduce motion")

  // ---- Texts ----------------------------------------------------------------------------
  texts: {
    hint: 'Drag to move the cup',
    ready: 'Ready?',
    go: 'GO!',
    timeUp: "Time's up!",
    combo: 'Combo',
    comboBurst: 'COMBO ×{n}!',
    caught: 'caught',
    bestCombo: 'best combo',
    penalty: '−{s}s'
  }
};
