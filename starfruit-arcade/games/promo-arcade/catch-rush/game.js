/*
 * Catch Rush — a 30-second catch game in the brand's colours.
 * Products fall from the sky; the player moves a branded cup to catch them,
 * golden ones are worth more, bombs cost time. The score unlocks a coupon tier
 * from brand.config.js → rewards['catch-rush'].
 *
 * Game units: the screen is 900 units tall; its width follows the screen shape.
 * Pilots: 'title' (bot behind the title card), 'player', 'idle' (after a round),
 * 'demo' (?demo=1).
 */
(function () {
  'use strict';

  var PA = window.PromoArcade;
  var cfg = window.GAME_CONFIG;
  var TX = cfg.texts || {};
  var ICONS = window.PA_ICONS || {};
  var B = PA.brand;
  var COL = PA.colors;
  var TAU = Math.PI * 2;
  var FONT = getComputedStyle(document.documentElement).getPropertyValue('--pa-font') || 'sans-serif';

  var canvas = document.getElementById('stage');
  var ctx = canvas.getContext('2d');
  var W = 1, H = 1, dpr = 1, s = 1, VW = 600;
  var VH = 900;

  var bombImg = new Image();
  bombImg.src = PA.iconURL('bomb');

  // ------------------------------------------------------------------ state
  var pilot = 'title';
  var running = false;   // a timed round is in progress
  var paused = false;
  var time = 0;
  var roundT = 0;
  var timeLeft = cfg.duration;
  var score = 0;
  var shownScore = 0;
  var combo = 0;
  var bestCombo = 0;
  var caught = 0;
  var spawnT = 0;
  var ending = 0;
  var lastTick = 0;
  var shake = 0;
  var flash = 0;
  var cup = { x: 300, tx: 300, w: cfg.catcherWidth, h: 96, squash: 0, wobble: 0, vx: 0 };
  var items = [];
  var parts = [];
  var texts = [];
  var keys = { left: false, right: false };
  var pointerDown = false;
  var bubbles = [];

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lerp(a, b, k) { return a + (b - a) * k; }
  function cupTop() { return VH - 64 - cup.h; }

  // ------------------------------------------------------------------ layout
  function resize() {
    W = Math.max(1, innerWidth);
    H = Math.max(1, innerHeight);
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    s = H / VH;
    VW = W / s;
    if (VW < 420) { s = W / 420; VW = 420; }
    cup.x = clamp(cup.x, cup.w / 2, VW - cup.w / 2);
    cup.tx = cup.x;
    if (!bubbles.length) {
      for (var i = 0; i < 14; i++) bubbles.push({ x: Math.random(), y: Math.random(), r: 30 + Math.random() * 110, v: 0.01 + Math.random() * 0.025, c: i % 3 });
    }
  }

  // ------------------------------------------------------------------ rounds
  function reset() {
    items.length = 0;
    parts.length = 0;
    texts.length = 0;
    score = shownScore = 0;
    combo = bestCombo = caught = 0;
    roundT = 0;
    timeLeft = cfg.duration;
    spawnT = 0.4;
    ending = 0;
    lastTick = 0;
    cup.x = cup.tx = VW / 2;
  }

  function start() {
    pilot = PA.demo ? 'demo' : 'player';
    reset();
    running = true;
    paused = false;
  }

  function finishRound() {
    running = false;
    ending = 0;
    items.forEach(function (it) { if (it.kind !== 'bomb') burst(it.x, it.y, it.color, 6); });
    items.length = 0;
    var r = PA.rewardFor('catch-rush', score);
    PA.finish({
      score: score,
      reward: r.reward,
      next: r.next,
      stats: [[TX.caught || 'Caught', caught], [TX.bestCombo || 'Best combo', '×' + Math.max(1, multiplierFor(bestCombo))]]
    });
    if (pilot === 'player') pilot = 'idle';
  }

  function multiplierFor(c) { return Math.min(cfg.maxMultiplier || 4, 1 + Math.floor(c / (cfg.comboStep || 5))); }

  // ------------------------------------------------------------------ spawning
  function spawn(progress) {
    var p = PA.products;
    var r = Math.random();
    var bombShare = lerp(cfg.bombStart, cfg.bombEnd, progress);
    var kind = r < bombShare ? 'bomb' : r < bombShare + cfg.goldenChance ? 'gold' : 'item';
    var prod = p.length ? p[Math.floor(Math.random() * p.length)] : null;
    var size = kind === 'bomb' ? 74 : 76;
    items.push({
      kind: kind,
      img: kind === 'bomb' ? bombImg : (prod ? prod.img : null),
      color: kind === 'bomb' ? '#ff6b3d' : kind === 'gold' ? COL.secondary : (prod ? prod.color : COL.secondary),
      x: 50 + Math.random() * (VW - 100),
      y: -60,
      vy: lerp(cfg.speedStart, cfg.speedEnd, progress) * (0.85 + Math.random() * 0.3),
      size: size,
      rot: Math.random() * TAU,
      vr: (Math.random() - 0.5) * 2.4,
      sway: Math.random() * TAU
    });
  }

  // ------------------------------------------------------------------ effects
  function burst(x, y, color, n) {
    for (var i = 0; i < n; i++) {
      var a = Math.random() * TAU, sp = 120 + Math.random() * 380;
      parts.push({ x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 180, r: 5 + Math.random() * 9, life: 0.5 + Math.random() * 0.5, age: 0, color: color });
    }
  }
  function floatText(str, x, y, color, size) {
    texts.push({ str: str, x: x, y: y, color: color, size: size || 34, age: 0, life: 0.9 });
  }

  // ------------------------------------------------------------------ bot
  function botTarget() {
    var top = cupTop();
    var best = null, bestScore = -Infinity;
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      if (it.kind === 'bomb' || it.y > top) continue;
      var tReach = (top - it.y) / it.vy;
      var need = Math.abs(it.x - cup.x) / 1300;
      if (need > tReach + 0.05) continue;
      var sc = -tReach + (it.kind === 'gold' ? 0.6 : 0);
      if (sc > bestScore) { bestScore = sc; best = it; }
    }
    var tx = best ? best.x : VW / 2;
    for (var j = 0; j < items.length; j++) {
      var b = items[j];
      if (b.kind !== 'bomb') continue;
      if (b.y > top - 260 && b.y < top + 10 && Math.abs(b.x - tx) < cup.w * 0.75) {
        tx = b.x + (tx >= b.x ? 1 : -1) * cup.w * 0.85;
      }
    }
    return clamp(tx, cup.w / 2, VW - cup.w / 2);
  }

  // ------------------------------------------------------------------ update
  function update(dt) {
    time += dt;
    if (paused) return;
    var progress = running ? clamp(roundT / cfg.duration, 0, 1) : 0.35;

    // Cup movement.
    if (pilot === 'title' || pilot === 'demo') {
      var target = botTarget();
      var maxMove = 1300 * dt;
      cup.tx = cup.x + clamp(target - cup.x, -maxMove, maxMove);
    } else if (keys.left || keys.right) {
      cup.tx = cup.x + ((keys.right ? 1 : 0) - (keys.left ? 1 : 0)) * cfg.keySpeed * dt;
    }
    var nx = clamp(cup.x + (cup.tx - cup.x) * Math.min(1, dt * 22), cup.w / 2, VW - cup.w / 2);
    cup.vx = (nx - cup.x) / Math.max(dt, 0.001);
    cup.x = nx;
    cup.squash = Math.max(0, cup.squash - dt * 4);
    cup.wobble = Math.max(0, cup.wobble - dt * 2);

    // Timer.
    if (running) {
      roundT += dt;
      timeLeft -= dt;
      if (timeLeft <= 5 && Math.ceil(timeLeft) !== lastTick && timeLeft > 0) {
        lastTick = Math.ceil(timeLeft);
        PA.audio.play('tock');
      }
      if (timeLeft <= 0) {
        timeLeft = 0;
        running = false;
        ending = 1.1;
        PA.audio.play('timeup');
        floatText(TX.timeUp || 'TIME!', VW / 2, VH * 0.42, COL.secondary, 96);
      }
    } else if (ending > 0) {
      ending -= dt;
      if (ending <= 0) finishRound();
    }

    // Spawning: during a round, or slowly behind the title screen.
    var spawning = running || pilot === 'title';
    if (spawning) {
      spawnT -= dt;
      if (spawnT <= 0) {
        spawn(progress);
        var widthFactor = clamp(VW / 600, 0.8, 2.4);
        spawnT = lerp(cfg.spawnStart, cfg.spawnEnd, progress) / widthFactor * (pilot === 'title' ? 1.5 : 1);
      }
    }

    // Items.
    var top = cupTop();
    for (var i = items.length - 1; i >= 0; i--) {
      var it = items[i];
      var prevY = it.y;
      it.y += it.vy * dt;
      it.rot += it.vr * dt;
      it.x += Math.sin(time * 2 + it.sway) * 12 * dt;
      var half = cup.w / 2 - 6;
      if (prevY + it.size * 0.3 < top + 18 && it.y + it.size * 0.3 >= top + 4 && Math.abs(it.x - cup.x) < half) {
        items.splice(i, 1);
        onCatch(it);
        continue;
      }
      if (it.y - it.size > VH) {
        items.splice(i, 1);
        if (it.kind !== 'bomb' && running) combo = 0;
      }
    }

    // Effects.
    for (var p = parts.length - 1; p >= 0; p--) {
      var q = parts[p];
      q.age += dt;
      if (q.age >= q.life) { parts.splice(p, 1); continue; }
      q.vy += 1300 * dt;
      q.x += q.vx * dt;
      q.y += q.vy * dt;
    }
    for (var tt = texts.length - 1; tt >= 0; tt--) {
      texts[tt].age += dt;
      if (texts[tt].age >= texts[tt].life) texts.splice(tt, 1);
    }
    shake = Math.max(0, shake - dt * 2.5);
    flash = Math.max(0, flash - dt * 3);
    shownScore += (score - shownScore) * Math.min(1, dt * 12);
    if (Math.abs(score - shownScore) < 0.5) shownScore = score;
  }

  function onCatch(it) {
    var y = cupTop();
    if (it.kind === 'bomb') {
      combo = 0;
      shake = 1;
      flash = 1;
      cup.wobble = 1;
      burst(it.x, y, '#ff6b3d', 22);
      burst(it.x, y, '#2b2b3a', 10);
      PA.audio.play('bomb');
      if (running) {
        timeLeft = Math.max(0, timeLeft - cfg.bombPenalty);
        floatText(PA.fill(TX.bomb || '-{s}s', { s: cfg.bombPenalty }), it.x, y - 50, '#ff6b6b', 44);
      }
      return;
    }
    combo++;
    caught++;
    bestCombo = Math.max(bestCombo, combo);
    var mult = multiplierFor(combo);
    var pts = (it.kind === 'gold' ? cfg.goldenPoints : cfg.points) * mult;
    if (running || pilot === 'title') score += pts;
    cup.squash = 1;
    burst(it.x, y + 10, it.color, it.kind === 'gold' ? 26 : 14);
    floatText('+' + pts, it.x, y - 40, it.kind === 'gold' ? COL.secondary : '#ffffff', it.kind === 'gold' ? 46 : 36);
    if (combo > 0 && combo % (cfg.comboStep || 5) === 0 && mult > 1) {
      floatText(PA.fill(TX.combo || '×{n} COMBO', { n: mult }), cup.x, y - 110, COL.accent, 40);
    }
    PA.audio.play(it.kind === 'gold' ? 'gold' : 'catch', Math.min(combo, 10));
  }

  // ------------------------------------------------------------------ drawing
  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function drawBackground() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, PA.mix(COL.background, COL.text, PA.lightBackground ? 0.04 : 0.1));
    g.addColorStop(1, PA.lightBackground ? PA.mix(COL.background, COL.primary, 0.1) : PA.mix(COL.background, '#000000', 0.3));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    var cols = [COL.primary, COL.secondary, COL.accent];
    for (var i = 0; i < bubbles.length; i++) {
      var b = bubbles[i];
      var y = ((b.y - time * b.v) % 1 + 1) % 1;
      ctx.globalAlpha = 0.07;
      ctx.fillStyle = cols[b.c];
      ctx.beginPath();
      ctx.arc(b.x * W, y * (H + 200) - 100, b.r * s, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawCounter() {
    var y = VH - 64;
    ctx.fillStyle = PA.rgba(COL.secondary, 0.16);
    ctx.fillRect(0, y, VW, 64);
    ctx.fillStyle = PA.rgba(COL.secondary, 0.5);
    ctx.fillRect(0, y, VW, 4);
  }

  function drawCup() {
    var w = cup.w * (1 + 0.08 * cup.squash);
    var h = cup.h * (1 - 0.12 * cup.squash);
    var x = cup.x, y = VH - 64 - h;
    var tilt = Math.sin(time * 30) * 0.08 * cup.wobble + clamp(cup.vx / 6000, -0.08, 0.08);
    ctx.save();
    ctx.translate(x, y + h);
    ctx.rotate(tilt);
    // Shadow.
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(0, 4, w * 0.48, 9, 0, 0, TAU);
    ctx.fill();
    // Body (tapered cup).
    var g = ctx.createLinearGradient(-w / 2, 0, w / 2, 0);
    g.addColorStop(0, PA.mix(COL.primary, '#000000', 0.18));
    g.addColorStop(0.45, COL.primary);
    g.addColorStop(1, PA.mix(COL.primary, '#000000', 0.25));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(-w / 2, -h);
    ctx.lineTo(w / 2, -h);
    ctx.lineTo(w * 0.38, -6);
    ctx.quadraticCurveTo(w * 0.36, 0, w * 0.3, 0);
    ctx.lineTo(-w * 0.3, 0);
    ctx.quadraticCurveTo(-w * 0.36, 0, -w * 0.38, -6);
    ctx.closePath();
    ctx.fill();
    // Band with the logo text.
    ctx.save();
    ctx.clip();
    ctx.fillStyle = PA.rgba('#ffffff', 0.92);
    ctx.fillRect(-w / 2, -h * 0.62, w, h * 0.3);
    var label = String(B.logoText || B.name || '').toUpperCase();
    var fs = 22;
    ctx.font = '900 ' + fs + 'px ' + FONT;
    while (fs > 10 && ctx.measureText(label).width > w * 0.78) {
      fs -= 1;
      ctx.font = '900 ' + fs + 'px ' + FONT;
    }
    ctx.fillStyle = COL.primary;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, 0, -h * 0.47);
    ctx.restore();
    // Rim.
    ctx.fillStyle = PA.mix(COL.primary, '#ffffff', 0.35);
    roundRect(-w / 2 - 6, -h - 8, w + 12, 14, 7);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fillRect(-w * 0.34, -h + 12, 8, h * 0.4);
    ctx.restore();
  }

  function drawItems() {
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      var sz = it.size;
      if (it.kind === 'gold') {
        var pulse = 1 + 0.12 * Math.sin(time * 10 + it.sway);
        var g = ctx.createRadialGradient(it.x, it.y, sz * 0.2, it.x, it.y, sz * 0.85 * pulse);
        g.addColorStop(0, PA.rgba(COL.secondary, 0.8));
        g.addColorStop(1, PA.rgba(COL.secondary, 0));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(it.x, it.y, sz * 0.85 * pulse, 0, TAU);
        ctx.fill();
        ctx.strokeStyle = COL.secondary;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(it.x, it.y, sz * 0.56, 0, TAU);
        ctx.stroke();
      }
      if (!it.img || (it.img.complete === false)) continue;
      ctx.save();
      ctx.translate(it.x, it.y);
      ctx.rotate(it.kind === 'bomb' ? Math.sin(time * 6 + it.sway) * 0.25 : it.rot * 0.35);
      ctx.drawImage(it.img, -sz / 2, -sz / 2, sz, sz);
      ctx.restore();
    }
  }

  function drawEffects() {
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i];
      ctx.globalAlpha = 1 - p.age / p.life;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * (1 - p.age / p.life * 0.5), 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (var t = 0; t < texts.length; t++) {
      var tx = texts[t];
      var k = tx.age / tx.life;
      var pop = tx.age < 0.12 ? 0.6 + tx.age / 0.12 * 0.5 : 1.1 - Math.min(0.1, (tx.age - 0.12));
      ctx.globalAlpha = k > 0.7 ? (1 - k) / 0.3 : 1;
      ctx.font = '900 ' + Math.round(tx.size * pop) + 'px ' + FONT;
      ctx.lineWidth = 7;
      ctx.strokeStyle = 'rgba(0,0,0,0.35)';
      var y = tx.y - k * 50;
      ctx.strokeText(tx.str, tx.x, y);
      ctx.fillStyle = tx.color;
      ctx.fillText(tx.str, tx.x, y);
    }
    ctx.globalAlpha = 1;
  }

  function drawHud() {
    if (pilot === 'title' || pilot === 'idle') return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var top = 70;
    var w = Math.min(330, W - 32);
    var x = (W - w) / 2;
    var urgent = running && timeLeft <= 5;
    // Timer bar.
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    roundRect(x, top, w, 12, 6);
    ctx.fill();
    var k = clamp(timeLeft / cfg.duration, 0, 1);
    ctx.fillStyle = urgent ? (Math.floor(time * 6) % 2 ? COL.primary : COL.secondary) : COL.accent;
    roundRect(x, top, Math.max(12, w * k), 12, 6);
    ctx.fill();
    // Score + time pills.
    ctx.textBaseline = 'middle';
    ctx.font = '900 32px ' + FONT;
    ctx.textAlign = 'left';
    ctx.fillStyle = COL.text;
    ctx.fillText(String(Math.round(shownScore)), x, top + 42);
    ctx.textAlign = 'right';
    ctx.fillStyle = urgent ? COL.secondary : COL.text;
    var secs = Math.ceil(timeLeft);
    ctx.font = '900 ' + (urgent ? 34 + Math.sin(time * 12) * 3 : 32) + 'px ' + FONT;
    ctx.fillText('0:' + (secs < 10 ? '0' : '') + secs, x + w, top + 42);
    var mult = multiplierFor(combo);
    if (mult > 1) {
      ctx.textAlign = 'center';
      ctx.font = '900 16px ' + FONT;
      ctx.fillStyle = COL.accent;
      ctx.fillText(PA.fill(TX.combo || '×{n} COMBO', { n: mult }), W / 2, top + 42);
    }
  }

  function draw() {
    drawBackground();
    var sx = shake ? (Math.random() - 0.5) * 16 * shake : 0;
    var sy = shake ? (Math.random() - 0.5) * 16 * shake : 0;
    ctx.setTransform(dpr * s, 0, 0, dpr * s, dpr * sx, dpr * sy);
    drawCounter();
    drawItems();
    drawCup();
    drawEffects();
    drawHud();
    if (flash > 0) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = 'rgba(255,60,60,' + (flash * 0.25).toFixed(3) + ')';
      ctx.fillRect(0, 0, W, H);
    }
  }

  var last = 0;
  function frame(ts) {
    var dt = last ? Math.min(0.05, Math.max(0, (ts - last) / 1000)) : 1 / 60;
    last = ts;
    update(dt);
    draw();
    requestAnimationFrame(frame);
  }

  // ------------------------------------------------------------------ input
  function toGame(clientX) { return clientX / s; }
  canvas.addEventListener('pointerdown', function (e) {
    if (pilot !== 'player' || !PA.inputReady()) return;
    pointerDown = true;
    cup.tx = toGame(e.clientX);
  });
  canvas.addEventListener('pointermove', function (e) {
    if (pilot !== 'player' || PA.screen() !== 'playing') return;
    if (pointerDown || e.pointerType === 'mouse') cup.tx = toGame(e.clientX);
  });
  window.addEventListener('pointerup', function () { pointerDown = false; });
  window.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keys.left = true;
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keys.right = true;
  });
  window.addEventListener('keyup', function (e) {
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keys.left = false;
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keys.right = false;
  });
  window.addEventListener('resize', resize);

  // ------------------------------------------------------------------ boot
  resize();
  PA.loadProducts(function () {
    PA.mountGame({
      id: 'catch-rush',
      title: TX.title || 'Catch Rush',
      tag: TX.tag,
      howTo: TX.howTo,
      winTitle: TX.winTitle,
      loseTitle: TX.loseTitle,
      nextText: TX.nextText,
      start: start,
      pause: function () { paused = true; keys.left = keys.right = false; },
      resume: function () { paused = false; },
      stop: function () { running = false; pilot = 'title'; reset(); },
      forceEnd: function () {
        if (!running && ending <= 0) return;
        running = false;
        finishRound();
      },
      state: function () {
        return { score: score, timeLeft: Math.round(timeLeft * 10) / 10, combo: combo, caught: caught, items: items.length };
      }
    });
    requestAnimationFrame(frame);
  });
})();
