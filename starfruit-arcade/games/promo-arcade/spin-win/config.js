/* ==========================================================================
   SPIN & WIN — gameplay settings
   The wheel segments (prizes, odds, codes) and the spins-per-day limit live in
   ../brand.config.js → wheel. This file only tunes the look and feel.
   ========================================================================== */
window.GAME_CONFIG = {

  // ---- Spin feel ------------------------------------------------------------------
  spinSeconds: 5.4,              // length of a spin
  extraTurns: [5, 7],            // full turns before stopping (random between the two)
  idleSpeed: 0.12,               // slow rotation while waiting, in turns per second (0 = still)
  resultDelay: 1.1,              // seconds to admire the result before the prize card opens

  // ---- Look -------------------------------------------------------------------------------
  bulbs: 24,                     // LED lights around the rim
  segmentColors: [],             // e.g. ['#ff5b2e', '#13a874']; empty = automatic brand colours
  loseColor: '',                 // colour of "no prize" segments ('' = soft background colour)
  screenShake: true,             // small bump when a big prize lands (off with "reduce motion")

  // ---- Texts ----------------------------------------------------------------------------
  texts: {
    spin: 'SPIN',
    hint: 'Tap SPIN or the wheel',
    ready: 'Tap SPIN to play',
    spinning: 'Good luck!',
    spinsLeft: '{n} spin(s) left today',
    comeBack: 'Come back tomorrow for another spin',
    comeBackShort: 'Come back tomorrow',
    winHeading: 'You won!',
    loseHeading: 'So close!',
    loseSub: 'No prize this time. Give it another spin!',
    spinAgain: 'Spin again',
    banner: '{label}!',
    shareText: 'I just won {reward} on the {brand} prize wheel! Try your luck:'
  }
};
