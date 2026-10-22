/* ==========================================================================
   SWAPSY — CONFIG
   Every reskinnable value: colours, pieces, scoring, timing, texts and hooks.
   Levels are in js/levels.js.
   ========================================================================== */
window.GAME_CONFIG = {

  // ---- Theme -----------------------------------------------------------------
  studio: 'Starfruit Arcade',          // credit on the title screen ('' hides it)
  storageKey: 'swapsy',                // change it for each reskin so saved progress never mixes
  theme: {
    skyTop: '#ff8fc7',                 // background gradient, top
    skyBottom: '#8f6bff',              // background gradient, bottom
    board: 'rgba(255, 255, 255, 0.72)',// board panel
    cellA: '#f6efff',                  // checkerboard cell colours
    cellB: '#ece2ff',
    jelly: '#ff6fb5',                  // jelly colour (double jelly is drawn darker)
    ink: '#3a1d6e',                    // dark text colour on the canvas
    accent: '#ffd23f'                  // stars, highlights
  },

  // ---- Pieces (up to 6; levels use the first N, see "kinds" in js/levels.js) -------
  // shape: heart, circle, star, leaf, drop, diamond. image: your own picture instead,
  // e.g. 'assets/latte.png' (square, transparent background). faces: cute faces on pieces.
  pieces: [
    { name: 'Berry', color: '#ff4d6d', shape: 'heart' },
    { name: 'Orange', color: '#ff9f1c', shape: 'circle' },
    { name: 'Lemon', color: '#ffd23f', shape: 'star' },
    { name: 'Mint', color: '#2fcf78', shape: 'leaf' },
    { name: 'Blue', color: '#3fa7ff', shape: 'drop' },
    { name: 'Grape', color: '#a66cff', shape: 'diamond' }
  ],
  faces: true,

  // ---- Gameplay ---------------------------------------------------------------------
  points: { piece: 10, special: 50, rainbow: 100, jelly: 20 }, // per piece × cascade step; specials created; jelly cleared
  bonusPerMove: 150,                   // points for every move left when a level is won
  hintDelay: 6,                        // seconds of no input before a hint wiggles (0 = never)
  swapTime: 0.16,                      // seconds for a swap animation
  fallSpeed: 14,                       // falling speed, in cells per second (accelerates)
  unlockAll: false,                    // true = every level can be played from the start
  screenShake: true,                   // shake on bombs (always off with "reduce motion")

  // ---- Texts -------------------------------------------------------------------------
  texts: {
    title: 'SWAPSY',
    tagline: 'Swap. Match. Smile.',
    play: 'Play',
    levels: 'Levels',
    selectLevel: 'Choose a level',
    back: 'Back',
    level: 'Level',
    moves: 'Moves',
    score: 'Score',
    best: 'Best',
    sound: 'Sound',
    paused: 'Paused',
    resume: 'Resume',
    restart: 'Restart',
    home: 'Home',
    share: 'Share',
    shareText: 'I scored {score} on Swapsy level {level}! Can you beat it?',
    copied: 'Copied!',
    howTo: 'Swap two neighbours to line up 3 or more of the same piece.',
    hint: 'Swipe or tap two neighbours to swap them',
    goalScore: 'Reach {n} points',
    goalCollect: 'Collect the pieces',
    goalJelly: 'Clear all the jelly',
    levelComplete: 'Level complete!',
    outOfMoves: 'Out of moves',
    almost: 'So close! {left} to go.',
    nextLevel: 'Next level',
    replay: 'Replay',
    tryAgain: 'Try again',
    newBest: 'New best!',
    shuffling: 'No moves left! Shuffling…',
    bonus: 'Bonus!',
    allDone: 'You finished every level! 🎉',
    praise: ['Nice!', 'Great!', 'Awesome!', 'Spectacular!', 'Unstoppable!']
  },

  // ---- Hooks (ads, analytics) — all optional --------------------------------------------
  hooks: {
    onGameStart: function (level) {},          // a level starts (1-based)
    onGameOver: function (score) {},           // a level ends (win or lose)
    onLevelUp: function (level) {},            // a level is won
    // Called before "Replay" / "Try again" / "Next level". Return a Promise to pause the
    // game while an interstitial ad shows (e.g. a game-portal SDK).
    beforeRestart: function () { return Promise.resolve(); }
  },

  sound: { enabledByDefault: true, volume: 0.7 }
};
