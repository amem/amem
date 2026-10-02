/*
 * Memory Match — game.js
 * Classic pairs game with the brand's products on 3D flip cards (DOM + CSS, so every card
 * is a real button: tap, click, Tab / arrow keys + Enter all work). Stars depend on the
 * number of moves; the stars decide the reward. A built-in bot with imperfect memory plays
 * the attract screen and demo mode.
 */
(function () {
  'use strict';
  var PA = window.PromoArcade;
  var B = PA.brand;
  var C = PA.colors;
  var esc = PA.esc;
  var fmt = PA.fmt;
  var cfg = window.GAME_CONFIG || {};
  var tx = cfg.texts || {};
  var P = PA.extend({ pair: 100, secondLeft: 10, star: 250 }, cfg.points);
  var STAR_MOVES = PA.extend({ three: 12, two: 18 }, cfg.starMoves);
  var LIMIT = cfg.timeLimit == null ? 60 : cfg.timeLimit;
  var URGENT = cfg.urgentSeconds == null ? 10 : cfg.urgentSeconds;
  var FALLBACK_ICONS = ['star', 'heart', 'gift', 'diamond', 'cup', 'donut', 'cupcake', 'icecream', 'coffee', 'bag'];

  var grid = String(cfg.grid || '4x4').split('x').map(Number);
  if (grid.length !== 2 || !grid[0] || !grid[1] || (grid[0] * grid[1]) % 2) grid = [4, 4];
  var PAIRS = grid[0] * grid[1] / 2;

  var wrap = document.getElementById('board-wrap');
  var board = document.getElementById('board');
  var hudPairs = document.getElementById('hud-pairs');
  var hudTotal = document.getElementById('hud-total');
  var hudTime = document.getElementById('hud-time');
  var hudTimeValue = document.getElementById('hud-time-value');
  var hudMoves = document.getElementById('hud-moves-value');
  var bannerEl = document.createElement('div');
  bannerEl.className = 'mm-banner';
  bannerEl.setAttribute('aria-hidden', 'true');
  document.getElementById('stage').appendChild(bannerEl);

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function shuffle(list) {
    for (var i = list.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = list[i]; list[i] = list[j]; list[j] = t;
    }
    return list;
  }

  // ---------------------------------------------------------------- state
  var cards = [];
  var mode = 'attract';            // 'attract' (title background) | 'live'
  var phase = 'idle';              // 'deal' | 'preview' | 'play' | 'done'
  var first = null, lock = true;
  var moves = 0, found = 0, score = 0, timeLeft = LIMIT, elapsed = 0, lastSecond = -1;
  var timers = [];
  var memory = {};
  var botT = 0;
  var cols = grid[0];

  /** Pause-safe timeout: counts down only while the game loop runs. */
  function wait(sec, fn) { timers.push({ t: sec, fn: fn }); }
  function runTimers(dt) {
    var due = [];
    timers = timers.filter(function (tm) {
      tm.t -= dt;
      if (tm.t <= 0) { due.push(tm); return false; }
      return true;
    });
    due.forEach(function (tm) { tm.fn(); });
  }

  var shell = PA.game({
    id: 'memory-match',
    key: 'memoryMatch',
    texts: tx,
    demoDelay: 1500,
    start: function () { deal('live'); },
    stop: function () { deal('attract'); },
    forceGameOver: function () { finish(found === PAIRS); },
    score: function () { return score; },
    state: function () {
      return { timeLeft: Math.max(0, Math.ceil(timeLeft)), moves: moves, pairsFound: found, pairs: PAIRS, phase: phase };
    },
    onKey: function (e, down) {
      if (!down) return;
      var dir = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -cols, ArrowDown: cols }[e.key];
      if (dir === undefined) return;
      e.preventDefault();
      var cur = -1;
      for (var i = 0; i < cards.length; i++) if (cards[i].el === document.activeElement) cur = i;
      var next = cur < 0 ? 0 : clamp(cur + dir, 0, cards.length - 1);
      if (cards[next]) cards[next].el.focus();
    }
  });

  // ---------------------------------------------------------------- deck & board
  function makeDeck() {
    var pool = shuffle(PA.products.map(function (p) { return { key: p.src, src: p.src, name: p.name, color: p.color }; }));
    var seen = {};
    pool = pool.filter(function (d) { if (seen[d.key]) return false; seen[d.key] = true; return true; });
    for (var i = 0; pool.length < PAIRS && i < FALLBACK_ICONS.length; i++) {
      var src = PA.iconSrc(FALLBACK_ICONS[i]);
      if (src && !seen[src]) { seen[src] = true; pool.push({ key: src, src: src, name: '', color: C.accent }); }
    }
    pool = pool.slice(0, PAIRS);
    return shuffle(pool.concat(pool.map(function (d) { return PA.extend({}, d); })));
  }

  function label(card) {
    var text = card.matched ? fmt(tx.cardMatched || '{name}, matched', { name: card.name || card.i + 1 })
      : card.flipped ? (card.name || String(card.i + 1))
        : fmt(tx.cardHidden || 'Card {n}, face down', { n: card.i + 1 });
    card.el.setAttribute('aria-label', text);
  }
  function setFlip(card, on) {
    card.flipped = on;
    card.el.classList.toggle('is-flipped', on);
    label(card);
  }

  function deal(newMode) {
    mode = newMode;
    timers = [];
    first = null;
    lock = true;
    moves = found = score = 0;
    elapsed = 0;
    timeLeft = LIMIT;
    lastSecond = -1;
    memory = {};
    botT = 0.6;
    banner('');
    var backSrc = B.logoImage ? PA.asset(B.logoImage) : (PA.iconSrc(B.logoIcon) || PA.iconSrc('star'));
    var names = cfg.showNames !== false;
    board.innerHTML = '';
    board.classList.remove('is-won');
    cards = makeDeck().map(function (d, i) {
      var el = document.createElement('button');
      el.type = 'button';
      el.className = 'mm-card';
      el.style.setProperty('--d', (i * 0.035).toFixed(3) + 's');
      el.innerHTML =
        '<span class="mm-inner">' +
          '<span class="mm-face mm-back"><span class="mm-back-badge"><img src="' + esc(backSrc) + '" alt=""></span></span>' +
          '<span class="mm-face mm-front" style="--tint:' + esc(d.color) + '"><img src="' + esc(d.src) + '" alt="">' +
            (names && d.name ? '<span class="mm-name">' + esc(d.name) + '</span>' : '') +
          '</span>' +
        '</span>';
      var card = { el: el, key: d.key, name: d.name, i: i, flipped: false, matched: false };
      el.addEventListener('click', function () { onCardClick(card); });
      board.appendChild(el);
      label(card);
      return card;
    });
    layout();
    board.classList.remove('is-dealt');
    void board.offsetWidth;
    board.classList.add('is-dealt');
    phase = 'deal';
    updateHud();
    var dealTime = 0.35 + cards.length * 0.035;
    wait(dealTime + 0.3, function () { board.classList.remove('is-dealt'); });
    var preview = mode === 'live' ? (cfg.previewSeconds == null ? 1.2 : cfg.previewSeconds) : 0;
    wait(dealTime, function () {
      if (preview <= 0) { beginPlay(); return; }
      phase = 'preview';
      cards.forEach(function (c) { setFlip(c, true); });
      banner(tx.memorize || 'Memorize!');
      PA.sfx.flip();
      wait(preview, function () {
        banner('');
        cards.forEach(function (c) { setFlip(c, false); });
        PA.sfx.flip();
        wait(0.45, beginPlay);
      });
    });
  }

  function beginPlay() {
    phase = 'play';
    lock = false;
    if (mode === 'live') {
      shell.hint(tx.hint || '');
      PA.sfx.go();
    }
  }

  function banner(text) {
    bannerEl.textContent = text;
    bannerEl.classList.toggle('is-on', !!text);
  }

  function layout() {
    var r = wrap.getBoundingClientRect();
    var a = Math.min(grid[0], grid[1]), b = Math.max(grid[0], grid[1]);
    cols = r.width > r.height * 1.05 ? b : a;
    var rows = (PAIRS * 2) / cols;
    var gap = Math.round(clamp(Math.min(r.width, r.height) * 0.022, 6, 14));
    var cw = Math.floor(Math.min((r.width - gap * (cols - 1)) / cols, ((r.height - gap * (rows - 1)) / rows) * 0.8, 150));
    cw = Math.max(cw, 30);
    var ch = Math.floor(cw / 0.8);
    board.style.setProperty('--cols', cols);
    board.style.setProperty('--cw', cw + 'px');
    board.style.setProperty('--ch', ch + 'px');
    board.style.setProperty('--gap', gap + 'px');
    board.classList.toggle('is-small', cw < 76);
  }

  // ---------------------------------------------------------------- play
  function onCardClick(card) {
    if (shell.screen() !== 'playing' || shell.demo || mode !== 'live' || !shell.ready()) return;
    shell.hideHint();
    flip(card);
  }

  function remember(card) {
    if (Math.random() < (mode === 'attract' ? 0.6 : 0.78)) memory[card.i] = card.key;
  }

  function sparkle(card) {
    if (mode !== 'live') return;
    var r = card.el.getBoundingClientRect();
    PA.confetti({ x: r.left + r.width / 2, y: r.top + r.height / 2, count: 22, power: 0.42 });
  }

  function flip(card) {
    if (phase !== 'play' || lock || card.flipped || card.matched) return false;
    setFlip(card, true);
    if (mode === 'live') PA.sfx.flip();
    remember(card);
    if (!first) { first = card; return true; }
    var a = first, b = card;
    first = null;
    moves++;
    lock = true;
    updateHud();
    if (a.key === b.key) {
      wait(0.28, function () {
        a.matched = b.matched = true;
        a.el.classList.add('is-matched');
        b.el.classList.add('is-matched');
        label(a);
        label(b);
        found++;
        score = found * P.pair;
        lock = false;
        if (mode === 'live') PA.sfx.match(found);
        sparkle(a);
        sparkle(b);
        updateHud();
        if (found === PAIRS) complete();
      });
    } else {
      var delay = cfg.mismatchDelay == null ? 0.7 : cfg.mismatchDelay;
      wait(Math.min(0.35, delay), function () {
        a.el.classList.add('is-wrong');
        b.el.classList.add('is-wrong');
        if (mode === 'live') PA.sfx.miss();
      });
      wait(delay, function () {
        a.el.classList.remove('is-wrong');
        b.el.classList.remove('is-wrong');
        setFlip(a, false);
        setFlip(b, false);
        lock = false;
      });
    }
    return true;
  }

  function complete() {
    phase = 'done';
    lock = true;
    board.classList.add('is-won');
    if (mode === 'attract') { wait(1.6, function () { deal('attract'); }); return; }
    wait(0.9, function () { finish(true); });
  }

  function starsFor() {
    var k = PAIRS / 8;
    if (moves <= Math.round(STAR_MOVES.three * k)) return 3;
    if (moves <= Math.round(STAR_MOVES.two * k)) return 2;
    return 1;
  }

  function finish(won) {
    var screen = shell.screen();
    if (screen !== 'playing' && screen !== 'paused') return;
    phase = 'done';
    lock = true;
    timers = [];
    banner('');
    var stars = won ? starsFor() : 0;
    score = found * P.pair + (won ? (LIMIT ? Math.ceil(timeLeft) * P.secondLeft : 0) + stars * P.star : 0);
    var reward = stars ? PA.rewards.forValue('memoryMatch', stars) : null;
    var next = PA.rewards.next('memoryMatch', stars);
    var nextText = '';
    if (!reward && next) nextText = fmt(next.min <= 1 ? tx.nextFirst : tx.nextStars, { n: next.min, title: next.title });
    shell.end({
      heading: won ? (tx.allFound || 'All pairs found!') : (LIMIT && timeLeft <= 0 ? (tx.timeUp || "Time's up!") : (tx.roundOver || 'Round over')),
      stars: stars,
      score: score,
      stats: [
        { label: tx.pairsFound || 'pairs', value: found + '/' + PAIRS },
        { label: tx.movesLabel || 'moves', value: moves },
        { label: tx.secondsLabel || 'seconds', value: Math.round(elapsed) }
      ],
      reward: reward,
      nextText: nextText
    });
  }

  function botStep() {
    var open = cards.filter(function (c) { return !c.matched && !c.flipped; });
    if (!open.length) return;
    var pick = null, i, j;
    if (first) {
      for (i = 0; i < open.length && !pick; i++) if (memory[open[i].i] === first.key) pick = open[i];
    } else {
      for (i = 0; i < open.length && !pick; i++) {
        var k = memory[open[i].i];
        if (!k) continue;
        for (j = i + 1; j < open.length; j++) if (memory[open[j].i] === k) { pick = open[i]; break; }
      }
    }
    if (!pick) {
      var unseen = open.filter(function (c) { return memory[c.i] === undefined; });
      var from = unseen.length ? unseen : open;
      pick = from[Math.floor(Math.random() * from.length)];
    }
    flip(pick);
  }

  function updateHud() {
    hudPairs.textContent = found;
    hudTotal.textContent = PAIRS;
    hudMoves.textContent = moves;
    hudTime.hidden = !LIMIT;
    var sec = Math.max(0, Math.ceil(timeLeft));
    hudTimeValue.textContent = sec;
    hudTime.classList.toggle('is-urgent', mode === 'live' && phase === 'play' && sec <= URGENT);
  }

  // ---------------------------------------------------------------- loop
  PA.loop(function (dt) {
    var screen = shell.screen();
    if (screen === 'paused' || screen === 'gameover') return;
    runTimers(dt);
    if (mode === 'live' && phase === 'play' && screen === 'playing') {
      elapsed += dt;
      if (LIMIT) {
        timeLeft -= dt;
        var sec = Math.ceil(timeLeft);
        if (sec !== lastSecond) {
          lastSecond = sec;
          if (sec <= 5 && sec > 0) PA.sfx.urgent();
          updateHud();
        }
        if (timeLeft <= 0) {
          timeLeft = 0;
          updateHud();
          finish(false);
          return;
        }
      }
    }
    if ((mode === 'attract' || shell.demo) && phase === 'play' && !lock) {
      botT -= dt;
      if (botT <= 0) {
        botStep();
        botT = mode === 'attract' ? 0.8 : 0.32 + Math.random() * 0.2;
      }
    }
  });

  window.addEventListener('resize', layout);
  window.addEventListener('orientationchange', function () { setTimeout(layout, 120); });
  deal('attract');
})();
