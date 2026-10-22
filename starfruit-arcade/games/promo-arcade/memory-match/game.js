/*
 * Memory Match — flip cards, find the pairs of the brand's products.
 * Fewer moves and a faster finish earn more stars; stars unlock a coupon tier
 * from brand.config.js → rewards['memory-match'].
 *
 * Built with plain DOM buttons (keyboard and screen-reader friendly) and CSS 3D flips.
 * Pilots: 'title' (bot flipping behind the title card), 'player', 'idle', 'demo'.
 */
(function () {
  'use strict';

  var PA = window.PromoArcade;
  var cfg = window.GAME_CONFIG;
  var TX = cfg.texts || {};
  var STAR = cfg.stars || {};
  var board = document.getElementById('mm-board');
  var hud = document.getElementById('mm-hud');

  var GRIDS = { '3x4': [3, 4], '4x4': [4, 4], '4x5': [4, 5] };
  var cols = 4, rows = 4, pairs = 8;
  var deck = [];          // { pid, el, up, matched }
  var first = -1;
  var locked = false;
  var moves = 0;
  var found = 0;
  var elapsed = 0;
  var pilot = 'title';
  var paused = false;
  var timers = [];
  var memory = {};        // bot memory: pid → [indices seen]
  var botT = 0;
  var finished = false;
  var lastTickSecond = -1;

  function later(fn, ms) { var id = setTimeout(fn, ms); timers.push(id); return id; }
  function clearLater() { timers.forEach(clearTimeout); timers.length = 0; }
  function limit() { return cfg.timeLimit || 0; }
  function fmt(sec) {
    sec = Math.max(0, Math.ceil(sec));
    return Math.floor(sec / 60) + ':' + (sec % 60 < 10 ? '0' : '') + (sec % 60);
  }

  // ------------------------------------------------------------------ deck
  function chooseGrid() {
    var g = GRIDS[cfg.grid] || GRIDS['4x4'];
    var n = PA.products.length;
    if ((g[0] * g[1]) / 2 > n) g = n >= 8 ? GRIDS['4x4'] : GRIDS['3x4'];
    cols = g[0];
    rows = g[1];
    pairs = Math.min((cols * rows) / 2, n);
  }

  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function buildDeck() {
    clearLater();
    chooseGrid();
    var ids = shuffle(PA.products.map(function (p) { return p.index; })).slice(0, pairs);
    var cards = shuffle(ids.concat(ids));
    board.innerHTML = '';
    deck = cards.map(function (pid, i) {
      var p = PA.products[pid];
      var el = document.createElement('button');
      el.type = 'button';
      el.className = 'mm-card';
      el.setAttribute('aria-label', 'Card ' + (i + 1));
      el.innerHTML = '<span class="mm-inner"><span class="mm-face mm-back">' +
        (PA.brand.logoIcon ? '<img src="' + PA.iconURL(PA.brand.logoIcon) + '" alt="" draggable="false">' : '') +
        '</span><span class="mm-face mm-front">' + PA.productHTML(p) + '<span class="mm-name">' + PA.esc(p.name) + '</span></span></span>';
      el.addEventListener('click', function () {
        if (pilot !== 'player' || !PA.inputReady()) return;
        flip(i);
      });
      board.appendChild(el);
      return { pid: pid, el: el, up: false, matched: false };
    });
    first = -1;
    locked = false;
    moves = 0;
    found = 0;
    elapsed = 0;
    finished = false;
    memory = {};
    lastTickSecond = -1;
    layout();
    renderHud();
  }

  // ------------------------------------------------------------------ layout
  function layout() {
    var W = innerWidth, H = innerHeight;
    var availW = W - 24;
    var availH = H - 66 - 16 - 56 - 10;
    var gap = Math.max(6, Math.min(14, availW * 0.025));
    var w = Math.min((availW - gap * (cols - 1)) / cols, ((availH - gap * (rows - 1)) / rows) / 1.22, 132);
    w = Math.max(40, Math.floor(w));
    var s = document.documentElement.style;
    s.setProperty('--mm-cols', cols);
    s.setProperty('--mm-w', w + 'px');
    s.setProperty('--mm-h', Math.round(w * 1.22) + 'px');
    s.setProperty('--mm-gap', Math.round(gap) + 'px');
  }

  // ------------------------------------------------------------------ rules
  function starsFor(done) {
    if (!done) return 0;
    if (moves <= pairs * (STAR.threeMaxMovesPerPair || 1.75) && elapsed <= (STAR.threeMaxSeconds || 35)) return 3;
    if (moves <= pairs * (STAR.twoMaxMovesPerPair || 2.5) && elapsed <= (STAR.twoMaxSeconds || 50)) return 2;
    return 1;
  }
  /** Stars the player is still on track for (shown live in the HUD). */
  function liveStars() {
    if (moves <= pairs * (STAR.threeMaxMovesPerPair || 1.75) && elapsed <= (STAR.threeMaxSeconds || 35)) return 3;
    if (moves <= pairs * (STAR.twoMaxMovesPerPair || 2.5) && elapsed <= (STAR.twoMaxSeconds || 50)) return 2;
    return 1;
  }

  function see(i) {
    var c = deck[i];
    var keep = pilot === 'title' ? 0.6 : 0.78;
    if (Math.random() > keep) return;
    var list = memory[c.pid] || (memory[c.pid] = []);
    if (list.indexOf(i) < 0) list.push(i);
  }

  function flip(i) {
    var c = deck[i];
    if (!c || locked || c.matched || c.up || finished) return;
    c.up = true;
    c.el.classList.add('is-up');
    c.el.setAttribute('aria-label', PA.products[c.pid].name);
    PA.audio.play('flip');
    see(i);
    if (first < 0) { first = i; return; }
    var a = deck[first], b = c;
    var ia = first;
    first = -1;
    moves++;
    locked = true;
    renderHud();
    if (a.pid === b.pid) {
      later(function () {
        a.matched = b.matched = true;
        a.el.classList.add('is-matched');
        b.el.classList.add('is-matched');
        a.el.disabled = b.el.disabled = true;
        sparkle(a.el);
        sparkle(b.el);
        PA.audio.play('match');
        found++;
        locked = false;
        renderHud();
        if (found >= pairs) later(function () { complete(true); }, 520);
      }, 240);
    } else {
      later(function () {
        a.el.classList.add('is-wrong');
        b.el.classList.add('is-wrong');
        PA.audio.play('miss');
      }, 320);
      later(function () {
        [a, b].forEach(function (x) {
          x.up = false;
          x.el.classList.remove('is-up', 'is-wrong');
          x.el.setAttribute('aria-label', 'Card ' + (deck.indexOf(x) + 1));
        });
        locked = false;
      }, 320 + (cfg.flipBackDelay || 0.8) * 1000);
    }
    return ia;
  }

  function sparkle(el) {
    if (PA.reducedMotion) return;
    var r = el.getBoundingClientRect();
    for (var k = 0; k < 10; k++) {
      var d = document.createElement('span');
      d.className = 'mm-spark';
      var a = (k / 10) * Math.PI * 2;
      d.style.left = (r.left + r.width / 2 - 5) + 'px';
      d.style.top = (r.top + r.height / 2 - 5) + 'px';
      d.style.setProperty('--dx', Math.cos(a) * (40 + Math.random() * 30) + 'px');
      d.style.setProperty('--dy', Math.sin(a) * (40 + Math.random() * 30) + 'px');
      d.style.background = k % 2 ? PA.colors.secondary : PA.colors.accent;
      document.body.appendChild(d);
      setTimeout(function (n) { return function () { n.remove(); }; }(d), 750);
    }
  }

  function complete(won) {
    if (finished) return;
    finished = true;
    var stars = starsFor(won);
    if (pilot === 'title') {
      later(buildDeck, 1600);
      return;
    }
    var r = PA.rewardFor('memory-match', stars);
    var timeBonus = limit() ? Math.max(0, Math.round(limit() - elapsed)) * 10 : 0;
    var score = found * 100 + (won ? timeBonus : 0);
    if (pilot === 'player') pilot = 'idle';
    PA.finish({
      score: score,
      reward: r.reward,
      next: r.next,
      title: won ? null : (TX.timeUp || 'Time is up!'),
      stats: [[TX.moves || 'Moves', moves], [TX.time || 'Time', fmt(elapsed)], [TX.stars || 'Stars', '★★★'.slice(0, stars) + '☆☆☆'.slice(0, 3 - stars)]]
    });
  }

  // ------------------------------------------------------------------ hud
  function renderHud() {
    var left = limit() ? limit() - elapsed : elapsed;
    var urgent = limit() && left <= 10 && !finished;
    var st = liveStars();
    hud.innerHTML =
      '<span class="mm-chip"><small>' + PA.esc(TX.moves || 'Moves') + '</small>' + moves + '</span>' +
      '<span class="mm-chip' + (urgent ? ' is-urgent' : '') + '"><small>' + PA.esc(TX.time || 'Time') + '</small>' + fmt(left) + '</span>' +
      '<span class="mm-chip mm-stars" aria-label="' + st + ' stars">' + '★★★'.slice(0, st) + '<span class="off">' + '★★★'.slice(0, 3 - st) + '</span></span>';
  }

  // ------------------------------------------------------------------ bot
  function unknownCard(except) {
    var options = [];
    for (var i = 0; i < deck.length; i++) {
      var c = deck[i];
      if (c.up || c.matched || i === except) continue;
      var known = false;
      for (var pid in memory) if (memory[pid].indexOf(i) >= 0) known = true;
      if (!known) options.push(i);
    }
    if (!options.length) {
      for (var j = 0; j < deck.length; j++) if (!deck[j].up && !deck[j].matched && j !== except) options.push(j);
    }
    return options.length ? options[Math.floor(Math.random() * options.length)] : -1;
  }

  function botStep() {
    if (locked || finished) return;
    if (first < 0) {
      for (var pid in memory) {
        var known = memory[pid].filter(function (i) { return !deck[i].matched && !deck[i].up; });
        if (known.length >= 2) { flip(known[0]); return; }
      }
      var u = unknownCard(-1);
      if (u >= 0) flip(u);
      return;
    }
    var mate = (memory[deck[first].pid] || []).filter(function (i) { return i !== first && !deck[i].matched; });
    var target = mate.length ? mate[0] : unknownCard(first);
    if (target >= 0) flip(target);
  }

  // ------------------------------------------------------------------ loop
  var last = 0;
  function frame(ts) {
    var dt = last ? Math.min(0.1, (ts - last) / 1000) : 0;
    last = ts;
    var screen = PA.screen();
    if (pilot === 'player' && screen === 'playing' && !paused && !finished) {
      elapsed += dt;
      var sec = Math.floor(elapsed);
      if (sec !== lastTickSecond) {
        lastTickSecond = sec;
        if (limit() && limit() - elapsed <= 10) PA.audio.play('tock');
        renderHud();
      }
      if (limit() && elapsed >= limit()) {
        elapsed = limit();
        renderHud();
        PA.audio.play('timeup');
        complete(false);
      }
    } else if ((pilot === 'title' || pilot === 'demo') && !paused) {
      botT -= dt;
      if (botT <= 0) {
        botT = pilot === 'title' ? 0.85 : 0.55;
        botStep();
      }
      if (pilot === 'demo' && !finished) {
        elapsed += dt;
        if (Math.floor(elapsed) !== lastTickSecond) { lastTickSecond = Math.floor(elapsed); renderHud(); }
      }
    }
    requestAnimationFrame(frame);
  }

  window.addEventListener('resize', layout);

  PA.loadProducts(function () {
    buildDeck();
    PA.mountGame({
      id: 'memory-match',
      title: TX.title || 'Memory Match',
      tag: TX.tag,
      howTo: TX.howTo,
      winTitle: TX.winTitle,
      loseTitle: TX.loseTitle,
      nextText: TX.nextText,
      start: function () {
        pilot = PA.demo ? 'demo' : 'player';
        paused = false;
        buildDeck();
        botT = 0.6;
      },
      pause: function () { paused = true; },
      resume: function () { paused = false; },
      stop: function () { pilot = 'title'; buildDeck(); },
      forceEnd: function () { complete(found >= pairs); },
      state: function () {
        return { score: found * 100, moves: moves, pairsFound: found, pairs: pairs, timeLeft: limit() ? Math.max(0, Math.round(limit() - elapsed)) : null };
      }
    });
    requestAnimationFrame(frame);
  });
})();
