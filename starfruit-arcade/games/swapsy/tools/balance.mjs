#!/usr/bin/env node
// Swapsy level balancing simulator (optional developer tool, needs Node.js 18+).
//
//   node tools/balance.mjs [runs=80] [skill=0.5]
//
// Plays every level in js/levels.js `runs` times with a simulated player that picks the best
// move with probability `skill` and a random legal move otherwise (0.5 ≈ an average player),
// then prints the win rate and score percentiles. Use them to set `moves` and `stars`:
// a good curve wins ~90 % early and ~40–60 % on the hardest levels.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RUNS = Number(process.argv[2] || 80);
const SKILL = Number(process.argv[3] || 0.5);
const ctx = { window: {}, Math, console, Map, Object, Array, JSON };
vm.createContext(ctx);
for (const f of ['config.js', 'js/board.js', 'js/levels.js']) vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx);
const cfg = ctx.window.GAME_CONFIG || {};
const { Board, levels } = ctx.window.__GAME__.lib;
const BONUS = cfg.bonusPerMove == null ? 150 : cfg.bonusPerMove;

function parse(lv) {
  const layout = lv.layout || Array(8).fill('........');
  return {
    rows: layout.length, cols: layout[0].length,
    mask: layout.map((row) => [...row].map((ch) => ch !== '#')),
    jelly: layout.map((row) => [...row].map((ch) => (ch === 'J' ? 2 : ch === 'j' ? 1 : 0)))
  };
}
const pct = (arr, p) => { const s = [...arr].sort((a, b) => a - b); return s.length ? s[Math.min(s.length - 1, Math.floor(p * s.length))] : '-'; };

console.log(`Swapsy balance — ${RUNS} runs per level, skill ${SKILL}\n`);
console.log('lvl name              goal     win   score p25 / p50 / p75 / p90     win median   stars');
levels.forEach((lv, i) => {
  const scores = [], winScores = [];
  let wins = 0;
  for (let run = 0; run < RUNS; run++) {
    const p = parse(lv);
    const kinds = Math.min(lv.kinds || 5, (cfg.pieces || []).length || 6);
    const b = new Board({ rows: p.rows, cols: p.cols, kinds, mask: p.mask, jelly: p.jelly, points: cfg.points });
    b.fill();
    const need = lv.goal.type === 'collect' ? { ...lv.goal.items } : null;
    let score = 0, moves = lv.moves, done = false;
    const met = () => lv.goal.type === 'score' ? score >= lv.stars[0]
      : lv.goal.type === 'jelly' ? b.jellyLeft() === 0 : Object.values(need).every((n) => n <= 0);
    while (moves > 0 && !done) {
      let list = b.moves();
      if (!list.length) { b.shuffle(); list = b.moves(); if (!list.length) break; }
      if (need) list.forEach((m) => [m.a, m.b].forEach((q) => { const t = b.get(q.r, q.c); if (t && need[t.kind] > 0) m.score += 2; }));
      list.sort((x, y) => y.score - x.score);
      const m = Math.random() < SKILL ? list[0] : list[Math.floor(Math.random() * list.length)];
      b.swap(m.a, m.b);
      moves--;
      let n = 1, res;
      while ((res = b.step(n, n === 1 ? [m.a, m.b] : null, n === 1 ? m : null))) {
        score += res.points;
        if (need) res.removed.forEach((x) => { if (need[x.tile.kind] > 0) need[x.tile.kind]--; });
        b.collapse();
        n++;
      }
      if (!b.findMove()) b.shuffle();
      if (lv.goal.type !== 'score' && met()) done = true;
    }
    if (met()) { wins++; score += moves * BONUS; winScores.push(score); }
    scores.push(score);
  }
  console.log(
    String(i + 1).padStart(3), (lv.name || '').padEnd(17), lv.goal.type.padEnd(8),
    (Math.round(wins / RUNS * 100) + '%').padStart(4), '  ',
    [0.25, 0.5, 0.75, 0.9].map((q) => String(pct(scores, q)).padStart(5)).join(' /'), '   ',
    String(pct(winScores, 0.5)).padStart(6), '     ', lv.stars.join('/')
  );
});
