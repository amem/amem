/*
 * Catch Rush — game settings. Brand, products, rewards and coupon codes live in
 * ../brand.config.js; this file only tunes the game itself.
 */
window.GAME_CONFIG = {
  // ---- Round ----
  duration: 30,            // seconds per round
  // ---- Difficulty (values ramp from *Start to *End over the round) ----
  spawnStart: 0.62,        // seconds between items at the start (on a phone-width screen)
  spawnEnd: 0.27,          // seconds between items at the end
  speedStart: 300,         // fall speed at the start (game units/s; the screen is 900 units tall)
  speedEnd: 580,           // fall speed at the end
  bombStart: 0.12,         // share of bombs at the start
  bombEnd: 0.24,           // share of bombs at the end
  goldenChance: 0.07,      // share of golden items
  // ---- Scoring ----
  points: 10,              // per product caught (× combo multiplier)
  goldenPoints: 50,        // per golden product caught (× combo multiplier)
  bombPenalty: 3,          // seconds lost when a bomb is caught
  comboStep: 5,            // catches in a row per +1 multiplier
  maxMultiplier: 4,        // multiplier cap
  // ---- Controls ----
  catcherWidth: 168,       // cup width (game units)
  keySpeed: 1150,          // arrow-key speed (game units/s)
  // ---- Texts ----
  texts: {
    title: 'Catch Rush',
    tag: '30-second challenge',
    howTo: 'Move the cup to catch the fruit. Golden ones score 5×. Dodge the bombs!',
    hint: 'Drag or use the arrow keys to move',
    time: 'Time',
    combo: '×{n} COMBO',
    timeUp: 'TIME!',
    bomb: '−{s}s',
    caught: 'Caught',
    bestCombo: 'Best combo',
    winTitle: 'You won!',
    loseTitle: 'Nice try!',
    nextText: 'Score {need} to win {reward}. One more go?'
  }
};
