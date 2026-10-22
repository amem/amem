/*
 * Swapsy — board.js
 * Pure match-3 rules, no drawing: the grid, swaps, matches, special pieces, chain reactions,
 * gravity and refill, move finding (for hints and the bot) and shuffling.
 *
 * Specials: 4 in a row → line blaster (clears its row or column), L / T shape → bomb (3 × 3),
 * 5 in a row → rainbow (swap it with a piece to clear every piece of that colour).
 * Special + special swaps make bigger combos (cross, 3-wide cross, 5 × 5, whole board).
 */
(function () {
  'use strict';
  var G = window.__GAME__ = window.__GAME__ || {};
  var lib = G.lib = G.lib || {};

  var nextId = 1;
  function key(r, c) { return r * 64 + c; }

  var DEFAULT_POINTS = { piece: 10, special: 50, rainbow: 100, jelly: 20 };

  /**
   * opts: { rows, cols, kinds, mask: [[bool]], jelly: [[0..2]], rng, points }
   */
  function Board(opts) {
    this.points = opts.points || DEFAULT_POINTS;
    this.rows = opts.rows;
    this.cols = opts.cols;
    this.kinds = opts.kinds;
    this.rng = opts.rng || Math.random;
    this.mask = opts.mask;
    this.jelly = opts.jelly;
    this.grid = [];
    for (var r = 0; r < this.rows; r++) {
      this.grid.push([]);
      for (var c = 0; c < this.cols; c++) this.grid[r].push(null);
    }
  }
  var P = Board.prototype;

  P.exists = function (r, c) { return r >= 0 && c >= 0 && r < this.rows && c < this.cols && this.mask[r][c]; };
  P.get = function (r, c) { return this.exists(r, c) ? this.grid[r][c] : null; };
  P.newTile = function (kind, special) { return { id: nextId++, kind: kind, special: special || null }; };
  P.randomKind = function () { return Math.floor(this.rng() * this.kinds); };

  /** Fill every cell without ready-made matches, guaranteeing at least one move. */
  P.fill = function () {
    for (var tries = 0; tries < 60; tries++) {
      for (var r = 0; r < this.rows; r++) {
        for (var c = 0; c < this.cols; c++) {
          if (!this.mask[r][c]) { this.grid[r][c] = null; continue; }
          var k, guard = 0;
          do { k = this.randomKind(); guard++; } while (guard < 20 && this.wouldMatch(r, c, k));
          this.grid[r][c] = this.newTile(k);
        }
      }
      if (this.findRuns().length === 0 && this.findMove()) return;
    }
  };

  P.wouldMatch = function (r, c, k) {
    var a = this.get(r, c - 1), b = this.get(r, c - 2);
    if (a && b && !a.special && !b.special && a.kind === k && b.kind === k) return true;
    a = this.get(r - 1, c); b = this.get(r - 2, c);
    return !!(a && b && !a.special && !b.special && a.kind === k && b.kind === k);
  };

  P.swap = function (a, b) {
    var t = this.grid[a.r][a.c];
    this.grid[a.r][a.c] = this.grid[b.r][b.c];
    this.grid[b.r][b.c] = t;
  };

  function matchable(t) { return t && t.special !== 'rainbow'; }

  /** Horizontal and vertical runs of 3+ pieces of the same colour. */
  P.findRuns = function () {
    var runs = [], r, c, len, t, k;
    for (r = 0; r < this.rows; r++) {
      c = 0;
      while (c < this.cols) {
        t = this.get(r, c);
        if (!matchable(t)) { c++; continue; }
        k = t.kind;
        len = 1;
        while (matchable(this.get(r, c + len)) && this.get(r, c + len).kind === k) len++;
        if (len >= 3) {
          var cells = [];
          for (var i = 0; i < len; i++) cells.push({ r: r, c: c + i });
          runs.push({ dir: 'h', kind: k, cells: cells });
        }
        c += len;
      }
    }
    for (c = 0; c < this.cols; c++) {
      r = 0;
      while (r < this.rows) {
        t = this.get(r, c);
        if (!matchable(t)) { r++; continue; }
        k = t.kind;
        len = 1;
        while (matchable(this.get(r + len, c)) && this.get(r + len, c).kind === k) len++;
        if (len >= 3) {
          var vcells = [];
          for (var j = 0; j < len; j++) vcells.push({ r: r + j, c: c });
          runs.push({ dir: 'v', kind: k, cells: vcells });
        }
        r += len;
      }
    }
    return runs;
  };

  /**
   * Groups touching runs, decides which specials to create, and returns
   * { clear: Map(key → {r,c}), create: [{ r, c, kind, special }], groups: n, sizes: [n] }.
   * focus: the swapped cells, preferred spots for new specials.
   */
  P.analyze = function (runs, focus) {
    var parent = runs.map(function (x, i) { return i; });
    function find(i) { while (parent[i] !== i) i = parent[i] = parent[parent[i]]; return i; }
    var owner = {};
    runs.forEach(function (run, i) {
      run.cells.forEach(function (p) {
        var kk = key(p.r, p.c);
        if (owner[kk] !== undefined) parent[find(i)] = find(owner[kk]);
        else owner[kk] = i;
      });
    });
    var groups = {};
    runs.forEach(function (run, i) { var g = find(i); (groups[g] = groups[g] || []).push(run); });
    var clear = new Map();
    var create = [];
    var sizes = [];
    var focusKeys = (focus || []).map(function (p) { return key(p.r, p.c); });
    Object.keys(groups).forEach(function (g) {
      var list = groups[g];
      var cells = new Map();
      var longest = list[0];
      var hasH = false, hasV = false;
      list.forEach(function (run) {
        if (run.cells.length > longest.cells.length) longest = run;
        if (run.dir === 'h') hasH = true; else hasV = true;
        run.cells.forEach(function (p) { cells.set(key(p.r, p.c), p); });
      });
      sizes.push(cells.size);
      var special = null;
      if (longest.cells.length >= 5) special = 'rainbow';
      else if (hasH && hasV) special = 'bomb';
      else if (longest.cells.length === 4) special = longest.dir === 'h' ? 'row' : 'col';
      var spot = null;
      if (special) {
        for (var f = 0; f < focusKeys.length && !spot; f++) if (cells.has(focusKeys[f])) spot = cells.get(focusKeys[f]);
        if (!spot && special === 'bomb') {
          var seen = {};
          list.forEach(function (run) { run.cells.forEach(function (p) { var kk = key(p.r, p.c); if (seen[kk] && !spot) spot = p; seen[kk] = true; }); });
        }
        if (!spot) spot = longest.cells[Math.floor(longest.cells.length / 2)];
        create.push({ r: spot.r, c: spot.c, kind: longest.kind, special: special });
      }
      cells.forEach(function (p, kk) { if (!spot || kk !== key(spot.r, spot.c)) clear.set(kk, p); });
      // A special that sits in the spot of a new special still fires: clear it too.
      if (spot) {
        var t = this.get(spot.r, spot.c);
        if (t && t.special) clear.set(key(spot.r, spot.c), spot);
      }
    }, this);
    return { clear: clear, create: create, groups: Object.keys(groups).length, sizes: sizes };
  };

  P.cellsWhere = function (fn) {
    var out = [];
    for (var r = 0; r < this.rows; r++) for (var c = 0; c < this.cols; c++) {
      var t = this.get(r, c);
      if (t && fn(t, r, c)) out.push({ r: r, c: c });
    }
    return out;
  };

  P.area = function (r0, c0, r1, c1) {
    var out = [];
    for (var r = Math.max(0, r0); r <= Math.min(this.rows - 1, r1); r++) {
      for (var c = Math.max(0, c0); c <= Math.min(this.cols - 1, c1); c++) if (this.get(r, c)) out.push({ r: r, c: c });
    }
    return out;
  };

  /** Effect of one special firing at (r, c): cells to clear + a description for the visuals. */
  P.fire = function (t, r, c) {
    var self = this;
    if (t.special === 'row') return { fx: { type: 'row', r: r, c: c }, cells: this.area(r, 0, r, this.cols - 1) };
    if (t.special === 'col') return { fx: { type: 'col', r: r, c: c }, cells: this.area(0, c, this.rows - 1, c) };
    if (t.special === 'bomb') return { fx: { type: 'bomb', r: r, c: c, size: 1 }, cells: this.area(r - 1, c - 1, r + 1, c + 1) };
    if (t.special === 'rainbow') {
      var present = this.cellsWhere(function (x) { return !x.special; });
      var pick = present.length ? present[Math.floor(self.rng() * present.length)] : null;
      var kind = pick ? self.get(pick.r, pick.c).kind : this.randomKind();
      return { fx: { type: 'rainbow', r: r, c: c, kind: kind }, cells: this.cellsWhere(function (x) { return x.kind === kind && !x.special; }) };
    }
    return { fx: null, cells: [] };
  };

  /**
   * Expands a clear set with every special inside it (chain reactions).
   * Returns { clear, effects } where effects is the ordered list of special firings.
   */
  P.expand = function (clear, skip) {
    var effects = [];
    var fired = {};
    var queue = [];
    clear.forEach(function (p, kk) { queue.push(kk); });
    while (queue.length) {
      var kk = queue.shift();
      var p = clear.get(kk);
      var t = this.get(p.r, p.c);
      if (!t || !t.special || fired[t.id] || (skip && skip[t.id])) continue;
      fired[t.id] = true;
      var res = this.fire(t, p.r, p.c);
      if (res.fx) effects.push(res.fx);
      res.cells.forEach(function (q) {
        var qk = key(q.r, q.c);
        if (!clear.has(qk)) { clear.set(qk, q); queue.push(qk); }
      });
    }
    return { clear: clear, effects: effects };
  };

  /** Special + special (or rainbow + anything) swap. Returns null when it is not a combo. */
  P.combo = function (a, b) {
    var ta = this.get(a.r, a.c), tb = this.get(b.r, b.c);
    if (!ta || !tb) return null;
    if (!(ta.special === 'rainbow' || tb.special === 'rainbow' || (ta.special && tb.special))) return null;
    var clear = new Map();
    var add = function (list) { list.forEach(function (p) { clear.set(key(p.r, p.c), p); }); };
    var effects = [];
    var skip = {};
    skip[ta.id] = skip[tb.id] = true;
    add([a, b]);
    if (ta.special === 'rainbow' && tb.special === 'rainbow') {
      add(this.cellsWhere(function () { return true; }));
      effects.push({ type: 'rainbow', r: b.r, c: b.c, kind: -1 });
    } else if (ta.special === 'rainbow' || tb.special === 'rainbow') {
      var other = ta.special === 'rainbow' ? tb : ta;
      var at = ta.special === 'rainbow' ? b : a;
      add(this.cellsWhere(function (x) { return x.kind === other.kind && x.special !== 'rainbow'; }));
      effects.push({ type: 'rainbow', r: at.r, c: at.c, kind: other.kind });
      if (other.special) { delete skip[other.id]; }
    } else {
      var lines = function (s) { return s === 'row' || s === 'col'; };
      if (lines(ta.special) && lines(tb.special)) {
        add(this.area(b.r, 0, b.r, this.cols - 1));
        add(this.area(0, b.c, this.rows - 1, b.c));
        effects.push({ type: 'row', r: b.r, c: b.c }, { type: 'col', r: b.r, c: b.c });
      } else if (ta.special === 'bomb' && tb.special === 'bomb') {
        add(this.area(b.r - 2, b.c - 2, b.r + 2, b.c + 2));
        effects.push({ type: 'bomb', r: b.r, c: b.c, size: 2 });
      } else {
        for (var d = -1; d <= 1; d++) {
          add(this.area(b.r + d, 0, b.r + d, this.cols - 1));
          add(this.area(0, b.c + d, this.rows - 1, b.c + d));
        }
        effects.push({ type: 'row', r: b.r, c: b.c, wide: true }, { type: 'col', r: b.r, c: b.c, wide: true });
      }
    }
    var ex = this.expand(clear, skip);
    return { clear: ex.clear, effects: effects.concat(ex.effects) };
  };

  /**
   * Removes the pieces in `clear`, reduces jelly under them and creates new specials.
   * Returns { removed: [{ r, c, tile }], jelly: [{ r, c, left }], created: [{ r, c, tile }] }.
   */
  P.apply = function (clear, create) {
    var removed = [], jelly = [], created = [];
    var self = this;
    clear.forEach(function (p) {
      var t = self.grid[p.r][p.c];
      if (!t) return;
      removed.push({ r: p.r, c: p.c, tile: t });
      self.grid[p.r][p.c] = null;
      if (self.jelly[p.r][p.c] > 0) {
        self.jelly[p.r][p.c]--;
        jelly.push({ r: p.r, c: p.c, left: self.jelly[p.r][p.c] });
      }
    });
    (create || []).forEach(function (s) {
      var existing = self.grid[s.r][s.c];
      if (existing && !clear.has(key(s.r, s.c))) {
        existing.special = s.special;
        if (s.special === 'rainbow') existing.kind = -1;
        created.push({ r: s.r, c: s.c, tile: existing });
      } else {
        var t = self.newTile(s.special === 'rainbow' ? -1 : s.kind, s.special);
        self.grid[s.r][s.c] = t;
        created.push({ r: s.r, c: s.c, tile: t });
      }
      if (self.jelly[s.r][s.c] > 0 && !clear.has(key(s.r, s.c))) {
        self.jelly[s.r][s.c]--;
        jelly.push({ r: s.r, c: s.c, left: self.jelly[s.r][s.c] });
      }
    });
    return { removed: removed, jelly: jelly, created: created };
  };

  /** Gravity + refill. Returns [{ tile, r, c, from }] where from = start row (negative = new). */
  P.collapse = function () {
    var moves = [];
    for (var c = 0; c < this.cols; c++) {
      var cells = [];
      for (var r = this.rows - 1; r >= 0; r--) if (this.mask[r][c]) cells.push(r);
      var tiles = [];
      cells.forEach(function (rr) { var t = this.grid[rr][c]; if (t) tiles.push({ t: t, r: rr }); }, this);
      var spawn = 0;
      cells.forEach(function (rr, i) {
        var item = tiles[i];
        if (item) {
          this.grid[rr][c] = item.t;
          if (item.r !== rr) moves.push({ tile: item.t, r: rr, c: c, from: item.r });
        } else {
          var t = this.newTile(this.randomKind());
          this.grid[rr][c] = t;
          spawn++;
          moves.push({ tile: t, r: rr, c: c, from: (cells[cells.length - 1] || 0) - spawn });
        }
      }, this);
    }
    return moves;
  };

  /**
   * Resolves one step of a move: the swap combo (first step only) or the current matches,
   * with chain reactions. Returns null when nothing matches, otherwise
   * { removed, jelly, created, effects, points, cascade }. Call collapse() afterwards.
   */
  P.step = function (cascade, focus, pair) {
    var clear = null, create = [], effects = [];
    if (pair) {
      var cb = this.combo(pair.a, pair.b);
      if (cb) { clear = cb.clear; effects = cb.effects; }
    }
    if (!clear) {
      var runs = this.findRuns();
      if (!runs.length) return null;
      var an = this.analyze(runs, focus);
      var ex = this.expand(an.clear);
      clear = ex.clear;
      create = an.create;
      effects = ex.effects;
    }
    var res = this.apply(clear, create);
    var pts = this.points;
    var points = res.removed.length * pts.piece * cascade + res.jelly.length * pts.jelly;
    res.created.forEach(function (c) { points += c.tile.special === 'rainbow' ? pts.rainbow : pts.special; });
    res.effects = effects;
    res.points = points;
    res.cascade = cascade;
    return res;
  };

  P.adjacent = function (a, b) { return Math.abs(a.r - b.r) + Math.abs(a.c - b.c) === 1; };

  /** Score of swapping a and b (0 = not a legal move). Used for hints and the bot. */
  P.rateSwap = function (a, b) {
    if (!this.exists(a.r, a.c) || !this.exists(b.r, b.c)) return 0;
    var ta = this.get(a.r, a.c), tb = this.get(b.r, b.c);
    if (!ta || !tb) return 0;
    if (ta.special === 'rainbow' || tb.special === 'rainbow') return 40 + (ta.special && tb.special ? 40 : 0);
    if (ta.special && tb.special) return 35;
    this.swap(a, b);
    var runs = this.findRuns();
    var score = 0;
    if (runs.length) {
      var res = this.analyze(runs, [a, b]);
      score = res.clear.size + res.create.length * 12;
      res.clear.forEach(function (p) {
        if (this.jelly[p.r][p.c] > 0) score += 6;
        var t = this.get(p.r, p.c);
        if (t && t.special) score += 10;
      }, this);
    }
    this.swap(a, b);
    return score;
  };

  P.moves = function () {
    var out = [];
    for (var r = 0; r < this.rows; r++) for (var c = 0; c < this.cols; c++) {
      if (!this.get(r, c)) continue;
      [[0, 1], [1, 0]].forEach(function (d) {
        var a = { r: r, c: c }, b = { r: r + d[0], c: c + d[1] };
        var s = this.rateSwap(a, b);
        if (s > 0) out.push({ a: a, b: b, score: s });
      }, this);
    }
    return out;
  };
  P.findMove = function () {
    for (var r = 0; r < this.rows; r++) for (var c = 0; c < this.cols; c++) {
      if (!this.get(r, c)) continue;
      if (this.rateSwap({ r: r, c: c }, { r: r, c: c + 1 }) > 0) return { a: { r: r, c: c }, b: { r: r, c: c + 1 } };
      if (this.rateSwap({ r: r, c: c }, { r: r + 1, c: c }) > 0) return { a: { r: r, c: c }, b: { r: r + 1, c: c } };
    }
    return null;
  };

  /** Re-deals the plain pieces (specials stay) until there is no match and at least one move. */
  P.shuffle = function () {
    var spots = this.cellsWhere(function (t) { return !t.special; });
    var tiles = spots.map(function (p) { return this.grid[p.r][p.c]; }, this);
    for (var tries = 0; tries < 80; tries++) {
      for (var i = tiles.length - 1; i > 0; i--) {
        var j = Math.floor(this.rng() * (i + 1));
        var t = tiles[i]; tiles[i] = tiles[j]; tiles[j] = t;
      }
      spots.forEach(function (p, n) { this.grid[p.r][p.c] = tiles[n]; }, this);
      if (this.findRuns().length === 0 && this.findMove()) return true;
      if (tries > 40) tiles.forEach(function (x) { x.kind = this.randomKind(); }, this);
    }
    return !!this.findMove();
  };

  P.jellyLeft = function () {
    var n = 0;
    for (var r = 0; r < this.rows; r++) for (var c = 0; c < this.cols; c++) if (this.mask[r][c]) n += this.jelly[r][c];
    return n;
  };

  lib.Board = Board;
  lib.cellKey = key;
})();
