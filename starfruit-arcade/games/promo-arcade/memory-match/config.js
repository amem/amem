/*
 * Memory Match — game settings. Brand, products, rewards and coupon codes live in
 * ../brand.config.js; this file only tunes the game itself.
 */
window.GAME_CONFIG = {
  // ---- Board ----
  grid: '4x4',             // '3x4' (6 pairs), '4x4' (8 pairs) or '4x5' (10 pairs; needs 10 products)
  timeLimit: 60,           // seconds per round (0 = no limit)
  flipBackDelay: 0.8,      // seconds two wrong cards stay visible
  // ---- Stars (decide the reward: see brand.config.js → rewards['memory-match']) ----
  stars: {
    threeMaxMovesPerPair: 1.75,  // 3 stars: moves ≤ pairs × this …
    threeMaxSeconds: 35,         // … and finished within this many seconds
    twoMaxMovesPerPair: 2.5,     // 2 stars: moves ≤ pairs × this …
    twoMaxSeconds: 50            // … and finished within this many seconds. Any finish = 1 star.
  },
  // ---- Texts ----
  texts: {
    title: 'Memory Match',
    tag: 'Brain teaser',
    howTo: 'Flip two cards at a time and find every pair. Fewer moves earn more stars.',
    moves: 'Moves',
    time: 'Time',
    stars: 'Stars',
    timeUp: 'Time is up!',
    winTitle: 'All pairs found!',
    loseTitle: 'Nice try!',
    nextText: 'Finish with {need}★ or more to win {reward}. One more go?'
  }
};
