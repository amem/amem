/*
 * Swapsy — levels.js
 * The 24 levels. Edit or add your own:
 *
 *   {
 *     name: 'My Level',
 *     moves: 20,                       // moves available
 *     kinds: 5,                        // piece colours in play (4 = easy … 6 = hard)
 *     goal: { type: 'score' },         // 'score' (reach stars[0]), 'collect' or 'jelly'
 *     // goal: { type: 'collect', items: { 0: 15, 2: 15 } }   piece index → how many to clear
 *     // goal: { type: 'jelly' }                              clear every jelly cell
 *     stars: [2000, 3500, 5000],       // scores for 1, 2 and 3 stars (1 star also needs the goal)
 *     layout: [                        // optional, one string per row (up to 9 × 9):
 *       '..jjjj..',                    //   . = cell   # = no cell   j = jelly   J = double jelly
 *       ...
 *     ]
 *   }
 * Without a layout the board is 8 × 8 with no jelly.
 */
(function () {
  'use strict';
  var G = window.__GAME__ = window.__GAME__ || {};
  var lib = G.lib = G.lib || {};

  lib.levels = [
    { name: 'First Swap', moves: 15, kinds: 5, goal: { type: 'score' }, stars: [1500, 2800, 4000] },
    { name: 'Berry Picking', moves: 18, kinds: 5, goal: { type: 'collect', items: { 0: 15, 1: 15 } }, stars: [2000, 2900, 3800] },
    { name: 'Jelly Jam', moves: 20, kinds: 5, goal: { type: 'jelly' }, stars: [3000, 3900, 5100],
      layout: ['........', '........', '..jjjj..', '..jjjj..', '..jjjj..', '..jjjj..', '........', '........'] },
    { name: 'Rounded Corners', moves: 18, kinds: 5, goal: { type: 'score' }, stars: [2500, 4000, 5000],
      layout: ['#......#', '........', '........', '........', '........', '........', '........', '#......#'] },
    { name: 'Rainbow Hunt', moves: 20, kinds: 5, goal: { type: 'collect', items: { 2: 20, 3: 20, 4: 20 } }, stars: [2500, 3800, 4900] },
    { name: 'Diamond', moves: 22, kinds: 5, goal: { type: 'jelly' }, stars: [2500, 3500, 4600],
      layout: ['###..###', '##.jj.##', '#.jjjj.#', '.jjjjjj.', '.jjjjjj.', '#.jjjj.#', '##.jj.##', '###..###'] },
    { name: 'Six Flavours', moves: 22, kinds: 6, goal: { type: 'score' }, stars: [1800, 2600, 3300] },
    { name: 'Twin Towers', moves: 24, kinds: 5, goal: { type: 'collect', items: { 0: 20, 4: 20 } }, stars: [1800, 2600, 3400],
      layout: ['...##...', '...##...', '...##...', '........', '........', '...##...', '...##...', '...##...'] },
    { name: 'Double Jelly', moves: 26, kinds: 5, goal: { type: 'jelly' }, stars: [4500, 6300, 8200],
      layout: ['........', '.jjjjjj.', '.jJJJJj.', '.jJ..Jj.', '.jJ..Jj.', '.jJJJJj.', '.jjjjjj.', '........'] },
    { name: 'Hourglass', moves: 22, kinds: 5, goal: { type: 'score' }, stars: [1600, 2500, 3100],
      layout: ['........', '#......#', '##....##', '###..###', '###..###', '##....##', '#......#', '........'] },
    { name: 'Full Basket', moves: 26, kinds: 6, goal: { type: 'collect', items: { 1: 20, 2: 20, 5: 20 } }, stars: [2000, 3200, 4100] },
    { name: 'Frame', moves: 30, kinds: 5, goal: { type: 'jelly' }, stars: [4500, 6500, 8400],
      layout: ['jjjjjjjj', 'j......j', 'j......j', 'j......j', 'j......j', 'j......j', 'j......j', 'jjjjjjjj'] },
    { name: 'Big Board', moves: 22, kinds: 6, goal: { type: 'score' }, stars: [2200, 2900, 3600],
      layout: ['.........', '.........', '.........', '.........', '.........', '.........', '.........', '.........', '.........'] },
    { name: 'Cross Roads', moves: 24, kinds: 5, goal: { type: 'collect', items: { 0: 30, 3: 30 } }, stars: [2500, 3700, 4800],
      layout: ['##....##', '##....##', '........', '........', '........', '........', '##....##', '##....##'] },
    { name: 'Checkerboard', moves: 28, kinds: 5, goal: { type: 'jelly' }, stars: [4500, 6500, 8500],
      layout: ['j.j.j.j.', '.j.j.j.j', 'j.j.j.j.', '.j.j.j.j', 'j.j.j.j.', '.j.j.j.j', 'j.j.j.j.', '.j.j.j.j'] },
    { name: 'Heart', moves: 24, kinds: 6, goal: { type: 'score' }, stars: [1450, 1950, 2300],
      layout: ['#..##..#', '........', '........', '........', '#......#', '##....##', '###..###', '########'] },
    { name: 'Sweet Six', moves: 26, kinds: 6, goal: { type: 'collect', items: { 0: 18, 1: 18, 2: 18, 3: 18 } }, stars: [2000, 3000, 4000] },
    { name: 'Island', moves: 28, kinds: 5, goal: { type: 'jelly' }, stars: [5000, 6400, 8300],
      layout: ['........', '........', '..JJJJ..', '.JJJJJJ.', '.JJJJJJ.', '..JJJJ..', '........', '........'] },
    { name: 'Gaps', moves: 24, kinds: 6, goal: { type: 'score' }, stars: [1350, 1750, 2000],
      layout: ['........', '.#....#.', '........', '...##...', '...##...', '........', '.#....#.', '........'] },
    { name: 'Harvest', moves: 28, kinds: 6, goal: { type: 'collect', items: { 3: 25, 4: 25, 5: 25 } }, stars: [2500, 4100, 5400],
      layout: ['.........', '.........', '.........', '.........', '.........', '.........', '.........', '.........', '.........'] },
    { name: 'Spiral Jelly', moves: 32, kinds: 6, goal: { type: 'jelly' }, stars: [3000, 4200, 5500],
      layout: ['jjjjjjj.', '.......j', '.jjjjj.j', '.j...j.j', '.j.j.j.j', '.j...j.j', '.jjjjj.j', '........'] },
    { name: 'Butterfly', moves: 24, kinds: 6, goal: { type: 'score' }, stars: [1600, 2000, 2300],
      layout: ['..#..#..', '...##...', '........', '........', '........', '........', '...##...', '..#..#..'] },
    { name: 'Grand Feast', moves: 30, kinds: 6, goal: { type: 'collect', items: { 0: 20, 1: 20, 2: 20, 3: 20, 4: 20 } }, stars: [2400, 3700, 4800] },
    { name: 'Jelly Kingdom', moves: 32, kinds: 6, goal: { type: 'jelly' }, stars: [3000, 4400, 5700],
      layout: ['j..jj..j', 'jj.jj.jj', 'jjjjjjjj', '.jJJJJj.', '.jjjjjj.', '........', '........', '........'] }
  ];
})();
