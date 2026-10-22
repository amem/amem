/*
 * Spin & Win — game settings. The wheel segments, their odds, prizes, coupon codes
 * and the spins-per-day limit live in ../brand.config.js → rewards['spin-win'].
 */
window.GAME_CONFIG = {
  spinSeconds: 5.2,        // length of a spin
  minTurns: 5,             // full turns before the wheel slows down (random between min and max)
  maxTurns: 7,
  lights: 24,              // LED bulbs around the wheel
  texts: {
    title: 'Spin & Win',
    tag: 'Instant prize',
    howTo: 'Spin the lucky wheel once and see what you win. Every spin could be a winner!',
    spin: 'Spin',
    spinning: 'Good luck…',
    winTitle: 'You won!',
    loseTitle: 'So close!',
    loseText: 'No prize this time.',
    againText: 'Spin again for another chance.',
    limitText: 'You have used today’s spin. Come back tomorrow!'
  }
};
