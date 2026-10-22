/*
 * Swapsy — game.js
 * Flow and feel: screens, level loading, swap → match → clear → fall → cascade, goals,
 * bonus for moves left, stars and saved progress, hints, shuffles, input (swipe, tap-tap,
 * keyboard), the demo bot, HUD and the window.__GAME__ test API.
 */
(function () {
  'use strict';
  var G = window.__GAME__;
  var M = G.modules;
  var lib = G.lib;
  var cfg = window.GAME_CONFIG || {};
  var T = cfg.texts || {};
  var storage = M.storage;
  var audio = M.audio;
  var sfx = audio.sfx;
  var render = M.render;
  var LEVELS = lib.levels;
  var PIECES = cfg.pieces || [];
  var REDUCED = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  var SHAKE = cfg.screenShake !== false && !REDUCED;
  var DEMO = /[?&]demo=1(?:&|$)/.test(location.search);
  var SWAP_TIME = cfg.swapTime || 0.16;
  var FALL = cfg.fallSpeed || 14;

  function $(id) { return document.getElementById(id); }
  function text(key, fallback) { return T[key] == null ? fallback : T[key]; }
  function fmt(str, vars) { return String(str).replace(/\{(\w+)\}/g, function (m, k) { return vars[k] != null ? vars[k] : m; }); }
  function now() { return performance.now(); }
  function callHook(name, a) {
    var fn = cfg.hooks && cfg.hooks[name];
    if (typeof fn !== 'function' || DEMO) return undefined;
    try { return fn(a); } catch (e) { if (window.console) console.error('[Swapsy] hooks.' + name + ' failed:', e); return undefined; }
  }

  var canvas = $('game');
  var hudEl = $('hud');
  var screens = { title: $('screen-title'), levels: $('screen-levels'), paused: $('screen-pause'), gameover: $('screen-over') };

  // ---------------------------------------------------------------- state
  var S = M.view = {
    screen: 'title', screenAt: 0, attract: false,
    level: 0, def: null, board: null, moves: 0, score: 0, need: null,
    phase: 'idle', cascade: 0, pair: null, focus: null, after: null,
    swap: null, shuffleAnim: null,
    selected: null, cursor: null, showCursor: false, drag: null,
    idleT: 0, hint: null, botT: 1,
    popping: [], fx: [], particles: [], floaters: [], banner: null, shake: 0,
    timers: [], result: null
  };
  var progress = storage.get('progress', null) || { unlocked: 1, stars: [], best: [] };
  var bestScore = storage.get('best', 0) || 0;
  var W = 1, H = 1;

  function wait(sec, fn) { S.timers.push({ t: sec, fn: fn }); }

  // ---------------------------------------------------------------- level setup
  function parseLevel(def) {
    var layout = def.layout || ['........', '........', '........', '........', '........', '........', '........', '........'];
    return {
      rows: layout.length,
      cols: layout[0].length,
      mask: layout.map(function (row) { return row.split('').map(function (ch) { return ch !== '#'; }); }),
      jelly: layout.map(function (row) { return row.split('').map(function (ch) { return ch === 'J' ? 2 : ch === 'j' ? 1 : 0; }); })
    };
  }

  function loadLevel(i, attract) {
    S.attract = !!attract;
    S.level = Math.max(0, Math.min(LEVELS.length - 1, i));
    S.def = LEVELS[S.level];
    var p = parseLevel(S.def);
    S.board = new lib.Board({
      rows: p.rows, cols: p.cols, kinds: Math.min(S.def.kinds || 5, PIECES.length || 6),
      mask: p.mask, jelly: p.jelly, points: cfg.points
    });
    S.board.fill();
    for (var r = 0; r < p.rows; r++) for (var c = 0; c < p.cols; c++) {
      var t = S.board.grid[r][c];
      if (t) { t.x = c; t.y = r - p.rows - 1 - (p.rows - r) * 0.15; t.vy = 0; }
    }
    S.moves = S.def.moves;
    S.score = 0;
    S.need = S.def.goal.type === 'collect' ? JSON.parse(JSON.stringify(S.def.goal.items)) : null;
    S.timers = [];
    S.popping = []; S.fx = []; S.particles = []; S.floaters = []; S.banner = null;
    S.selected = null; S.drag = null; S.hint = null; S.swap = null; S.shuffleAnim = null;
    S.cascade = 0; S.idleT = 0; S.botT = 1.2; S.result = null;
    S.phase = 'fall';
    S.after = function () {
      S.phase = 'idle';
      if (!S.attract) showBanner(goalText(), 1.6, '#ffffff', fmt('{l} {n}', { l: text('level', 'Level'), n: S.level + 1 }));
    };
    layout();
    updateHud();
  }

  function goalText() {
    var g = S.def.goal;
    if (g.type === 'collect') return text('goalCollect', 'Collect the pieces');
    if (g.type === 'jelly') return text('goalJelly', 'Clear all the jelly');
    return fmt(text('goalScore', 'Reach {n} points'), { n: S.def.stars[0] });
  }

  function goalMet() {
    var g = S.def.goal;
    if (g.type === 'collect') return Object.keys(S.need).every(function (k) { return S.need[k] <= 0; });
    if (g.type === 'jelly') return S.board.jellyLeft() === 0;
    return S.score >= S.def.stars[0];
  }

  function goalLeft() {
    var g = S.def.goal;
    if (g.type === 'collect') return Object.keys(S.need).reduce(function (n, k) { return n + Math.max(0, S.need[k]); }, 0);
    if (g.type === 'jelly') return S.board.jellyLeft();
    return Math.max(0, S.def.stars[0] - S.score);
  }

  function layout() {
    var rect = canvas.getBoundingClientRect();
    W = Math.max(1, Math.round(rect.width));
    H = Math.max(1, Math.round(rect.height));
    var hudH = hudEl ? hudEl.getBoundingClientRect().height : 0;
    var b = S.board;
    var rows = b ? b.rows : 8, cols = b ? b.cols : 8;
    var top = hudH + 14, bottom = 14 + 6;
    var tile = Math.floor(Math.min((W - 28) / cols, (H - top - bottom) / rows, 84));
    tile = Math.max(24, tile);
    var x = Math.round((W - tile * cols) / 2);
    var y = Math.round(top + Math.max(0, (H - top - bottom - tile * rows) / 2));
    render.resize(W, H, { x: x, y: y, tile: tile, rows: rows, cols: cols });
  }

  // ---------------------------------------------------------------- moves
  function canPlay() {
    return S.screen === 'playing' && !DEMO && !S.attract && S.phase === 'idle' && now() - S.screenAt > 150;
  }

  function doSwap(a, b) {
    if (S.phase !== 'idle' || !S.board.adjacent(a, b)) return false;
    var ta = S.board.get(a.r, a.c), tb = S.board.get(b.r, b.c);
    if (!ta || !tb) return false;
    S.selected = null;
    S.hint = null;
    S.idleT = 0;
    var combo = ta.special === 'rainbow' || tb.special === 'rainbow' || (ta.special && tb.special);
    S.board.swap(a, b);
    var valid = combo || S.board.findRuns().length > 0;
    if (!valid) S.board.swap(a, b);
    S.swap = { ta: ta, tb: tb, a: a, b: b, t: 0, valid: valid };
    S.phase = 'swap';
    if (!S.attract) sfx.swap();
    return true;
  }

  function swapDone() {
    var sw = S.swap;
    S.swap = null;
    if (!sw.valid) {
      if (!S.attract) sfx.nope();
      S.phase = 'idle';
      return;
    }
    S.moves--;
    S.cascade = 1;
    S.pair = { a: sw.a, b: sw.b };
    S.focus = [sw.a, sw.b];
    updateHud();
    resolveStep();
  }

  function resolveStep() {
    var first = S.cascade === 1;
    var res = S.board.step(S.cascade, first ? S.focus : null, first ? S.pair : null);
    if (!res) { endMove(); return; }
    S.phase = 'resolve';
    var t = render.layout().tile;
    var sx = 0, sy = 0;
    res.removed.forEach(function (x) {
      S.popping.push({ tile: x.tile, x: x.tile.x, y: x.tile.y, t: 0.24, max: 0.24 });
      if (S.need && S.need[x.tile.kind] > 0) S.need[x.tile.kind]--;
      var p = render.cellCenter(x.r, x.c);
      sx += p.x; sy += p.y;
      burst(p.x, p.y, (PIECES[x.tile.kind] || {}).color || '#ffffff', 5);
    });
    res.created.forEach(function (x) {
      x.tile.x = x.c; x.tile.y = x.r; x.tile.born = 1;
    });
    res.jelly.forEach(function (j) {
      var p = render.cellCenter(j.r, j.c);
      burst(p.x, p.y, (cfg.theme && cfg.theme.jelly) || '#ff6fb5', 4);
    });
    res.effects.forEach(function (f) {
      var fx = { type: f.type, r: f.r, c: f.c, wide: f.wide, size: f.size, t: 0.45, max: 0.45 };
      if (f.type === 'rainbow') {
        fx.targets = res.removed.slice(0, 40).map(function (x) { return { r: x.r, c: x.c }; });
        fx.t = fx.max = 0.6;
      }
      S.fx.push(fx);
      if (!S.attract) {
        if (f.type === 'bomb') { sfx.bomb(); if (SHAKE) S.shake = Math.max(S.shake, t * 0.22); }
        else if (f.type === 'rainbow') sfx.rainbow();
        else sfx.line();
      }
    });
    if (!S.attract) {
      sfx.match(S.cascade);
      if (res.created.length) sfx.special();
      if (S.cascade >= 3) {
        var praise = T.praise || ['Nice!', 'Great!', 'Awesome!'];
        showBanner(praise[Math.min(S.cascade - 3, praise.length - 1)], 0.9, (cfg.theme && cfg.theme.accent) || '#ffd23f');
      }
    }
    if (res.removed.length) {
      S.score += res.points;
      addFloat('+' + res.points, sx / res.removed.length, sy / res.removed.length, Math.min(1.5, 0.8 + res.removed.length * 0.04));
    }
    updateHud();
    wait(res.effects.length ? 0.34 : 0.22, function () {
      var moves = S.board.collapse();
      moves.forEach(function (m) {
        m.tile.x = m.c;
        if (m.from < 0 || m.tile.y === undefined) m.tile.y = m.from;
        m.tile.vy = m.tile.vy || 0;
      });
      S.phase = 'fall';
      S.after = function () { S.cascade++; resolveStep(); };
    });
  }

  function endMove() {
    S.cascade = 0;
    S.pair = null;
    S.focus = null;
    var type = S.def.goal.type;
    if (type !== 'score' && goalMet()) { win(); return; }
    if (S.moves <= 0) { if (goalMet()) win(); else lose(); return; }
    if (!S.board.findMove()) { shuffleBoard(); return; }
    S.phase = 'idle';
    S.idleT = 0;
  }

  function shuffleBoard() {
    S.phase = 'shuffle';
    if (!S.attract) { sfx.shuffle(); showBanner(text('shuffling', 'Shuffling…'), 1.2, '#ffffff'); }
    var from = {};
    S.board.cellsWhere(function () { return true; }).forEach(function (p) { var tl = S.board.grid[p.r][p.c]; from[tl.id] = { x: tl.x, y: tl.y }; });
    S.board.shuffle();
    S.shuffleAnim = { from: from, t: 0, max: 0.6 };
  }

  function win() {
    S.phase = 'bonus';
    if (!S.attract) { sfx.win(); showBanner(text('levelComplete', 'Level complete!'), 1.4, (cfg.theme && cfg.theme.accent) || '#ffd23f'); }
    var i = 0;
    var bonus = cfg.bonusPerMove == null ? 150 : cfg.bonusPerMove;
    var tickMove = function () {
      if (S.moves <= 0) { wait(0.6, function () { finishLevel(true); }); return; }
      S.moves--;
      S.score += bonus;
      var cells = S.board.cellsWhere(function () { return true; });
      var c = cells[Math.floor(Math.random() * cells.length)];
      if (c) {
        var p = render.cellCenter(c.r, c.c);
        burst(p.x, p.y, (cfg.theme && cfg.theme.accent) || '#ffd23f', 8);
        addFloat('+' + bonus, p.x, p.y, 0.8);
      }
      if (!S.attract) sfx.tick(i++);
      updateHud();
      wait(0.11, tickMove);
    };
    wait(0.9, tickMove);
  }

  function lose() {
    S.phase = 'done';
    if (!S.attract) sfx.lose();
    wait(0.8, function () { finishLevel(false); });
  }

  function starsFor(score, won) {
    if (!won) return 0;
    var s = S.def.stars;
    return score >= s[2] ? 3 : score >= s[1] ? 2 : 1;
  }

  function finishLevel(won) {
    S.phase = 'done';
    S.timers = [];
    var stars = starsFor(S.score, won);
    S.result = { won: won, stars: stars, score: S.score, level: S.level };
    if (S.attract) { wait(1.4, function () { startAttract(); }); return; }
    callHook('onGameOver', S.score);
    if (won) callHook('onLevelUp', S.level + 1);
    var newBest = false;
    if (!DEMO) {
      if (won) {
        progress.stars[S.level] = Math.max(progress.stars[S.level] || 0, stars);
        progress.unlocked = Math.max(progress.unlocked, Math.min(LEVELS.length, S.level + 2));
      }
      if (S.score > (progress.best[S.level] || 0)) { progress.best[S.level] = S.score; newBest = won; }
      storage.set('progress', progress);
      if (S.score > bestScore) { bestScore = S.score; storage.set('best', bestScore); }
    }
    if (DEMO) {
      S.screen = 'gameover';
      setTimeout(function () { if (DEMO) startLevel(won ? (S.level + 1) % LEVELS.length : S.level); }, 1800);
      return;
    }
    showResult(newBest);
  }

  // ---------------------------------------------------------------- effects
  function burst(x, y, color, n) {
    if (REDUCED) n = Math.ceil(n / 2);
    var t = render.layout().tile;
    for (var i = 0; i < n; i++) {
      var a = Math.random() * Math.PI * 2;
      var sp = t * (2 + Math.random() * 4);
      S.particles.push({ x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - t * 2, s: t * (0.08 + Math.random() * 0.1), color: color, life: 0.5 + Math.random() * 0.3, rot: Math.random() * 6 });
    }
  }
  function addFloat(str, x, y, scale) {
    S.floaters.push({ text: str, x: x, y: y, size: render.layout().tile * 0.42 * (scale || 1), color: '#ffffff', life: 0.9 });
  }
  function showBanner(str, life, color, sub) {
    S.banner = { text: str, sub: sub || '', life: life, max: life, color: color };
  }

  // ---------------------------------------------------------------- update loop
  function update(dt) {
    var paused = S.screen === 'paused';
    if (!paused) {
      var due = [];
      S.timers = S.timers.filter(function (tm) { tm.t -= dt; if (tm.t <= 0) { due.push(tm); return false; } return true; });
      due.forEach(function (tm) { tm.fn(); });
    }
    if (paused || !S.board) return;
    var b = S.board;
    // Swap tween.
    if (S.swap) {
      var sw = S.swap;
      sw.t += dt;
      var k = Math.min(1, sw.t / SWAP_TIME);
      if (sw.valid) {
        var e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
        sw.ta.x = sw.a.c + (sw.b.c - sw.a.c) * e; sw.ta.y = sw.a.r + (sw.b.r - sw.a.r) * e;
        sw.tb.x = sw.b.c + (sw.a.c - sw.b.c) * e; sw.tb.y = sw.b.r + (sw.a.r - sw.b.r) * e;
        if (k >= 1) swapDone();
      } else {
        var kk = Math.min(1, sw.t / (SWAP_TIME * 2));
        var there = Math.sin(kk * Math.PI) * 0.55;
        sw.ta.x = sw.a.c + (sw.b.c - sw.a.c) * there; sw.ta.y = sw.a.r + (sw.b.r - sw.a.r) * there;
        sw.tb.x = sw.b.c + (sw.a.c - sw.b.c) * there; sw.tb.y = sw.b.r + (sw.a.r - sw.b.r) * there;
        if (kk >= 1) { sw.ta.x = sw.a.c; sw.ta.y = sw.a.r; sw.tb.x = sw.b.c; sw.tb.y = sw.b.r; swapDone(); }
      }
    }
    // Shuffle tween.
    if (S.shuffleAnim) {
      var sa = S.shuffleAnim;
      sa.t += dt;
      var q = Math.min(1, sa.t / sa.max);
      var eq = 1 - Math.pow(1 - q, 3);
      for (var r0 = 0; r0 < b.rows; r0++) for (var c0 = 0; c0 < b.cols; c0++) {
        var tl = b.grid[r0][c0];
        if (!tl) continue;
        var f = sa.from[tl.id] || { x: c0, y: r0 };
        tl.x = f.x + (c0 - f.x) * eq;
        tl.y = f.y + (r0 - f.y) * eq;
      }
      if (q >= 1) { S.shuffleAnim = null; S.phase = 'idle'; S.idleT = 0; }
    }
    // Gravity: every piece falls to its row.
    var moving = false;
    for (var r = 0; r < b.rows; r++) for (var c = 0; c < b.cols; c++) {
      var t = b.grid[r][c];
      if (!t) continue;
      if (t.born > 0) t.born = Math.max(0, t.born - dt * 3.5);
      if (t.land > 0) t.land = Math.max(0, t.land - dt * 5);
      if (S.swap && (t === S.swap.ta || t === S.swap.tb)) continue;
      if (S.shuffleAnim) continue;
      if (t.x !== c) t.x = c;
      if (t.y === undefined) t.y = r;
      if (t.y < r) {
        moving = true;
        t.vy = (t.vy || 0) + FALL * 3 * dt;
        t.vy = Math.min(t.vy, FALL * 1.6);
        t.y += Math.max(FALL * 0.35, t.vy) * dt;
        if (t.y >= r) { t.y = r; t.vy = 0; t.land = 1; }
      } else if (t.y > r) {
        t.y = r;
      }
    }
    if (S.phase === 'fall' && !moving) {
      var after = S.after;
      S.after = null;
      if (after) after(); else S.phase = 'idle';
    }
    // Effects.
    S.popping = S.popping.filter(function (p) { p.t -= dt; return p.t > 0; });
    S.fx = S.fx.filter(function (fx) { fx.t -= dt; return fx.t > 0; });
    var tile = render.layout().tile;
    S.particles = S.particles.filter(function (p) {
      p.life -= dt; p.vy += tile * 14 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += dt * 6;
      return p.life > 0;
    });
    S.floaters = S.floaters.filter(function (fl) { fl.life -= dt; fl.y -= tile * 1.1 * dt; return fl.life > 0; });
    if (S.banner) { S.banner.life -= dt; if (S.banner.life <= 0) S.banner = null; }
    S.shake = Math.max(0, S.shake - dt * 60);
    // Idle: hints and the bot.
    if (S.phase === 'idle') {
      S.idleT += dt;
      var hintDelay = cfg.hintDelay == null ? 6 : cfg.hintDelay;
      if (!S.hint && hintDelay > 0 && S.idleT > hintDelay && S.screen === 'playing' && !S.attract && !DEMO) {
        var m = b.findMove();
        if (m) S.hint = { ids: [b.get(m.a.r, m.a.c).id, b.get(m.b.r, m.b.c).id] };
      }
      if ((S.attract || DEMO) && (S.screen === 'playing' || S.attract)) {
        S.botT -= dt;
        if (S.botT <= 0) { S.botT = S.attract ? 1.1 : 0.75; botMove(); }
      }
    }
  }

  function botMove() {
    var list = S.board.moves();
    if (!list.length) return;
    if (S.need) list.forEach(function (m) {
      [m.a, m.b].forEach(function (p) { var t = S.board.get(p.r, p.c); if (t && S.need[t.kind] > 0) m.score += 2; });
    });
    list.sort(function (x, y) { return y.score - x.score; });
    var pick = Math.random() < 0.7 ? list[0] : list[Math.floor(Math.random() * Math.min(5, list.length))];
    doSwap(pick.a, pick.b);
  }

  // ---------------------------------------------------------------- HUD
  var hudLevel = $('hud-level'), hudMoves = $('hud-moves'), hudScore = $('hud-score');
  var hudGoals = $('hud-goals'), hudBar = $('hud-bar'), hudStars = $('hud-stars');
  var iconCache = {};
  function pieceIcon(kind) {
    if (iconCache[kind] !== undefined) return iconCache[kind];
    try { iconCache[kind] = render.icon(kind, 30); } catch (e) { iconCache[kind] = ''; }
    return iconCache[kind];
  }
  function updateHud() {
    if (!S.def || S.attract) return;
    hudLevel.textContent = fmt('{l} {n}', { l: text('level', 'Level'), n: S.level + 1 });
    hudMoves.textContent = S.moves;
    hudMoves.parentNode.classList.toggle('is-low', S.moves <= 3 && S.phase !== 'bonus');
    hudScore.textContent = S.score.toLocaleString();
    var g = S.def.goal;
    var html = '';
    if (g.type === 'collect') {
      html = Object.keys(S.need).map(function (k) {
        var left = Math.max(0, S.need[k]);
        var src = pieceIcon(+k);
        return '<span class="goal' + (left ? '' : ' is-done') + '">' +
          (src ? '<img src="' + src + '" alt="">' : '<i style="background:' + ((PIECES[k] || {}).color || '#999') + '"></i>') +
          '<b>' + (left ? left : '✓') + '</b></span>';
      }).join('');
    } else if (g.type === 'jelly') {
      var left = S.board.jellyLeft();
      html = '<span class="goal goal-jelly' + (left ? '' : ' is-done') + '"><i></i><b>' + (left ? left : '✓') + '</b></span>';
    } else {
      html = '<span class="goal goal-score' + (S.score >= S.def.stars[0] ? ' is-done' : '') + '"><b>' + S.def.stars[0].toLocaleString() + '</b></span>';
    }
    if (hudGoals.innerHTML !== html) hudGoals.innerHTML = html;
    var max = S.def.stars[2];
    hudBar.style.width = Math.min(100, S.score / max * 100) + '%';
    var marks = hudStars.children;
    for (var i = 0; i < 3; i++) {
      if (!marks[i]) break;
      marks[i].style.left = (S.def.stars[i] / max * 100) + '%';
      marks[i].classList.toggle('is-on', S.score >= S.def.stars[i]);
    }
  }

  // ---------------------------------------------------------------- screens
  function showScreen(name) {
    S.screen = name;
    S.screenAt = now();
    document.body.setAttribute('data-screen', name);
    Object.keys(screens).forEach(function (k) {
      var on = k === name && !(DEMO && k === 'gameover');
      screens[k].classList.toggle('show', on);
      screens[k].setAttribute('aria-hidden', on ? 'false' : 'true');
    });
    var bestEls = document.querySelectorAll('[data-best]');
    for (var i = 0; i < bestEls.length; i++) bestEls[i].textContent = bestScore.toLocaleString();
    var totalEls = document.querySelectorAll('[data-total-stars]');
    var total = progress.stars.reduce(function (a, b) { return a + (b || 0); }, 0);
    for (i = 0; i < totalEls.length; i++) totalEls[i].textContent = total + ' / ' + LEVELS.length * 3;
  }

  function startLevel(i) {
    if (!DEMO) audio.unlock();
    hideHint();
    loadLevel(i, false);
    S.screen = 'playing';
    showScreen('playing');
    callHook('onGameStart', S.level + 1);
    if (!storage.get('hinted', false) && !DEMO) showHint(text('hint', ''));
  }

  function startAttract() {
    if (S.screen !== 'title' && S.screen !== 'levels') return;
    loadLevel(Math.floor(Math.random() * 6), true);
  }

  function nextLevelIndex() {
    var last = Math.min(progress.unlocked, LEVELS.length) - 1;
    return Math.max(0, last);
  }

  function isUnlocked(i) { return cfg.unlockAll || i < progress.unlocked; }

  function renderLevelGrid() {
    var grid = $('level-grid');
    grid.innerHTML = LEVELS.map(function (lv, i) {
      var open = isUnlocked(i);
      var st = progress.stars[i] || 0;
      return '<button type="button" class="lvl' + (open ? '' : ' is-locked') + '" data-level="' + i + '"' + (open ? '' : ' disabled') +
        ' aria-label="' + text('level', 'Level') + ' ' + (i + 1) + (open ? ', ' + st + ' / 3' : '') + '">' +
        '<span class="lvl-num">' + (open ? i + 1 : '🔒') + '</span>' +
        '<span class="lvl-stars">' + [1, 2, 3].map(function (n) { return '<i class="' + (n <= st ? 'on' : '') + '"></i>'; }).join('') + '</span></button>';
    }).join('');
  }

  function showResult(newBest) {
    var r = S.result;
    var over = screens.gameover;
    over.classList.toggle('is-win', r.won);
    $('over-title').textContent = r.won ? text('levelComplete', 'Level complete!') : text('outOfMoves', 'Out of moves');
    $('over-level').textContent = fmt('{l} {n} · {name}', { l: text('level', 'Level'), n: r.level + 1, name: S.def.name || '' });
    $('final-score').textContent = r.score.toLocaleString();
    $('new-best').hidden = !newBest;
    var starEls = $('over-stars').children;
    for (var i = 0; i < 3; i++) starEls[i].classList.toggle('on', i < r.stars);
    $('over-stars').hidden = !r.won;
    var left = goalLeft();
    $('over-note').textContent = r.won ? (r.level === LEVELS.length - 1 ? text('allDone', '') : '') : fmt(text('almost', ''), { left: left.toLocaleString() });
    $('over-note').hidden = !$('over-note').textContent;
    $('btn-next').hidden = !r.won || r.level >= LEVELS.length - 1;
    $('btn-retry-label').textContent = r.won ? text('replay', 'Replay') : text('tryAgain', 'Try again');
    $('btn-retry').className = 'btn ' + (r.won && r.level < LEVELS.length - 1 ? 'btn-ghost' : 'btn-primary');
    showScreen('gameover');
    if (r.won) for (i = 0; i < r.stars; i++) (function (n) { setTimeout(function () { sfx.star(n); }, 350 + n * 260); })(i + 1);
  }

  function goHome() {
    S.timers = [];
    showScreen('title');
    startAttract();
  }

  function pause() {
    if (S.screen !== 'playing' || DEMO) return;
    showScreen('paused');
  }
  function resume() {
    if (S.screen !== 'paused') return;
    showScreen('playing');
  }

  function withAd(fn) {
    var p = callHook('beforeRestart');
    if (p && typeof p.then === 'function') p.then(fn, fn); else fn();
  }

  // ---------------------------------------------------------------- hint & toast
  var hintEl = $('hint');
  function showHint(str) { if (!str) return; hintEl.textContent = str; hintEl.classList.add('show'); }
  function hideHint() {
    if (hintEl.classList.contains('show')) { hintEl.classList.remove('show'); storage.set('hinted', true); }
  }
  var toastEl = $('toast'), toastTimer = 0;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('show'); }, 1800);
  }
  function share() {
    var msg = fmt(text('shareText', '{score}'), { score: S.result ? S.result.score : S.score, level: S.level + 1 });
    if (navigator.share) { navigator.share({ title: text('title', 'Swapsy'), text: msg }).catch(function () {}); return; }
    var done = function () { toast(text('copied', 'Copied!')); };
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(msg).then(done, function () { toast(msg); });
    else toast(msg);
  }

  // ---------------------------------------------------------------- input
  function cellAt(clientX, clientY) {
    var rect = canvas.getBoundingClientRect();
    var L = render.layout();
    var c = Math.floor((clientX - rect.left - L.x) / L.tile);
    var r = Math.floor((clientY - rect.top - L.y) / L.tile);
    return S.board && S.board.get(r, c) ? { r: r, c: c } : null;
  }

  canvas.addEventListener('pointerdown', function (e) {
    if (!canPlay()) return;
    audio.unlock();
    var cell = cellAt(e.clientX, e.clientY);
    if (!cell) { S.selected = null; return; }
    hideHint();
    S.showCursor = false;
    S.drag = { cell: cell, x: e.clientX, y: e.clientY, id: e.pointerId, moved: false };
    try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* not supported */ }
  });
  canvas.addEventListener('pointermove', function (e) {
    var d = S.drag;
    if (!d || e.pointerId !== d.id || d.moved || !canPlay()) return;
    var dx = e.clientX - d.x, dy = e.clientY - d.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < render.layout().tile * 0.32) return;
    d.moved = true;
    var dir = Math.abs(dx) > Math.abs(dy) ? { r: 0, c: dx > 0 ? 1 : -1 } : { r: dy > 0 ? 1 : -1, c: 0 };
    doSwap(d.cell, { r: d.cell.r + dir.r, c: d.cell.c + dir.c });
  });
  canvas.addEventListener('pointerup', function (e) {
    var d = S.drag;
    S.drag = null;
    if (!d || d.moved || !canPlay()) return;
    var cell = d.cell;
    if (S.selected && S.board.adjacent(S.selected, cell)) { doSwap(S.selected, cell); return; }
    if (S.selected && S.selected.r === cell.r && S.selected.c === cell.c) { S.selected = null; return; }
    S.selected = cell;
    sfx.click();
  });
  canvas.addEventListener('pointercancel', function () { S.drag = null; });
  canvas.addEventListener('contextmenu', function (e) { e.preventDefault(); });

  var DIRS = { ArrowLeft: [0, -1], ArrowRight: [0, 1], ArrowUp: [-1, 0], ArrowDown: [1, 0], a: [0, -1], d: [0, 1], w: [-1, 0], s: [1, 0] };
  document.addEventListener('keydown', function (e) {
    var k = e.key;
    var tag = (e.target && e.target.tagName) || '';
    if (k === 'Escape' || k === 'p' || k === 'P') {
      if (S.screen === 'playing') { pause(); e.preventDefault(); }
      else if (S.screen === 'paused') { resume(); e.preventDefault(); }
      return;
    }
    if (k === 'm' || k === 'M') { audio.unlock(); audio.toggleMute(); return; }
    if (S.screen === 'title' && (k === ' ' || k === 'Enter') && tag !== 'BUTTON') { e.preventDefault(); startLevel(nextLevelIndex()); return; }
    if (S.screen !== 'playing' || DEMO) return;
    var dir = DIRS[k.length === 1 ? k.toLowerCase() : k];
    if (dir) {
      e.preventDefault();
      if (!S.board) return;
      if (S.selected && canPlay()) { doSwap(S.selected, { r: S.selected.r + dir[0], c: S.selected.c + dir[1] }); S.cursor = null; return; }
      var cur = S.cursor || { r: Math.floor(S.board.rows / 2), c: Math.floor(S.board.cols / 2) };
      var next = { r: cur.r + dir[0], c: cur.c + dir[1] };
      if (S.cursor && S.board.get(next.r, next.c)) cur = next;
      S.cursor = cur;
      S.showCursor = true;
      hideHint();
    } else if ((k === ' ' || k === 'Enter') && tag !== 'BUTTON') {
      e.preventDefault();
      if (!S.cursor || !canPlay()) return;
      S.selected = S.selected && S.selected.r === S.cursor.r && S.selected.c === S.cursor.c ? null : { r: S.cursor.r, c: S.cursor.c };
      sfx.click();
    }
  });

  document.addEventListener('click', function (e) {
    var el = e.target.closest ? e.target.closest('[data-action], [data-level]') : null;
    if (!el || el.disabled) return;
    audio.unlock();
    var a = el.getAttribute('data-action');
    if (el.hasAttribute('data-level')) { sfx.click(); startLevel(+el.getAttribute('data-level')); return; }
    sfx.click();
    if (a === 'play') startLevel(nextLevelIndex());
    else if (a === 'levels') { renderLevelGrid(); showScreen('levels'); }
    else if (a === 'back') showScreen('title');
    else if (a === 'pause') pause();
    else if (a === 'resume') resume();
    else if (a === 'restart') withAd(function () { startLevel(S.level); });
    else if (a === 'next') withAd(function () { startLevel(S.level + 1); });
    else if (a === 'home') goHome();
    else if (a === 'share') share();
    else if (a === 'sound') audio.toggleMute();
  });

  document.addEventListener('visibilitychange', function () { if (document.hidden) pause(); });
  window.addEventListener('blur', pause);
  window.addEventListener('resize', function () { layout(); });
  window.addEventListener('orientationchange', function () { setTimeout(layout, 120); });

  function renderSound() {
    var muted = audio.isMuted();
    document.body.classList.toggle('is-muted', muted);
    var labels = document.querySelectorAll('[data-sound-label]');
    for (var i = 0; i < labels.length; i++) labels[i].textContent = muted ? 'Off' : 'On';
  }
  audio.onChange(renderSound);

  // ---------------------------------------------------------------- test API
  G.id = 'swapsy';
  G.version = '1.0.0';
  G.getState = function () {
    var screen = S.screen === 'levels' ? 'title' : S.screen;
    return {
      screen: screen, score: S.score, best: bestScore, level: S.level + 1, moves: S.moves,
      goal: S.def ? S.def.goal.type : '', goalLeft: S.def && S.board ? goalLeft() : 0, phase: S.phase
    };
  };
  G.start = function () { if (S.screen === 'title' || S.screen === 'gameover' || S.screen === 'levels') startLevel(nextLevelIndex()); };
  G.forceGameOver = function () {
    if (S.screen !== 'playing' && S.screen !== 'paused') return;
    if (S.screen === 'paused') showScreen('playing');
    S.swap = null;
    S.timers = [];
    finishLevel(goalMet());
  };

  // ---------------------------------------------------------------- boot
  var texts = document.querySelectorAll('[data-text]');
  for (var ti = 0; ti < texts.length; ti++) {
    var key = texts[ti].getAttribute('data-text');
    if (T[key] != null) texts[ti].textContent = T[key];
  }
  var credit = document.querySelector('[data-credit]');
  if (credit) credit.textContent = cfg.studio ? '© ' + cfg.studio : '';
  renderSound();
  showScreen('title');
  if (DEMO) {
    document.body.classList.add('is-demo');
    startLevel(0);
  } else {
    startAttract();
  }

  var last = now();
  function loop(t) {
    var dt = Math.min(0.05, Math.max(0, (t - last) / 1000));
    last = t;
    update(dt);
    render.frame(t / 1000);
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();
