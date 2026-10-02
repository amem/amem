/* ==========================================================================
   MEMORY MATCH — gameplay settings
   Brand, products (the card pictures), rewards and shared texts live in
   ../brand.config.js. This file only tunes how Memory Match plays.
   ========================================================================== */
window.GAME_CONFIG = {

  // ---- Board ------------------------------------------------------------------
  grid: '4x4',                   // '3x4' (6 pairs), '4x4' (8 pairs) or '4x5' (10 pairs)
  previewSeconds: 1.2,           // all cards are shown face up at the start (0 = no preview)
  mismatchDelay: 0.7,            // seconds two different cards stay visible before flipping back
  showNames: true,               // product name under the picture (hidden on very small cards)

  // ---- Time & stars -------------------------------------------------------------
  timeLimit: 60,                 // seconds to find every pair (0 = no limit)
  urgentSeconds: 10,             // last seconds: pulsing red timer
  starMoves: { three: 12, two: 18 }, // most moves for 3 and 2 stars on a 4×4 board (scaled for other sizes)
                                     // finishing in time always earns at least 1 star

  // ---- Score (for the "best" record) -------------------------------------------------
  points: { pair: 100, secondLeft: 10, star: 250 },

  // ---- Texts ----------------------------------------------------------------------------
  texts: {
    hint: 'Tap a card to flip it',
    moves: 'Moves',
    memorize: 'Memorize!',
    allFound: 'All pairs found!',
    timeUp: "Time's up!",
    roundOver: 'Round over',
    pairsFound: 'pairs',
    movesLabel: 'moves',
    secondsLabel: 'seconds',
    nextFirst: 'Find every pair in time to win {title}',
    nextStars: 'Earn {n} stars to win {title}',
    cardHidden: 'Card {n}, face down',
    cardMatched: '{name}, matched'
  }
};
