/*
 * Catch Rush — game.js
 * Products fall from the sky; the player slides a branded cup to catch them before the
 * timer runs out. Golden stars are worth more, bombs and rotten items cost seconds.
 * Canvas 2D with pre-rendered sprites. Screens, rewards, sound and the test API come
 * from ../shared/brand.js; gameplay numbers from config.js.
 */
(function () {
  'use strict';
  var PA = window.PromoArcade;
  var B = PA.brand;
  var C = PA.colors;
  var mix = PA.color.mix;
  var rgba = PA.color.rgba;
  var cfg = window.GAME_CONFIG || {};
  var tx = cfg.texts || {};

  var canvas = document.getElementById('game');
  var ctx = canvas.getContext('2d');
  var stage = document.getElementById('stage');
  var hudScore = document.getElementById('hud-score');
  var hudTime = document.getElementById('hud-time');
  var hudTimeValue = document.getElementById('hud-time-value');
  var hudCombo = document.getElementById('hud-combo');
  var hudComboValue = document.getElementById('hud-combo-value');

  var ROUND = cfg.roundSeconds || 30;
  var URGENT = cfg.urgentSeconds == null ? 5 : cfg.urgentSeconds;
  var POINTS = cfg.points || 10;
  var GOLDEN_POINTS = cfg.goldenPoints || 50;
  var PENALTY = cfg.badTimePenalty == null ? 3 : cfg.badTimePenalty;
  var STEPS = cfg.comboSteps || [5, 12, 20];
  var SHAKE = cfg.screenShake !== false && !PA.reducedMotion;
  var HEADING_FONT = getComputedStyle(document.documentElement).getPropertyValue('--f-heading') || 'sans-serif';

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lerp(a, b, k) { return a + (b - a) * k; }
  function easeOutBack(k) { var c = 1.7; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); }
  function font(size) { return '800 ' + Math.round(size) + 'px ' + HEADING_FONT; }

  // ---------------------------------------------------------------- layout
  var W = 1, H = 1, dpr = 1;
  var field = { x: 0, w: 1 };
  var S = 48;
  var cupW = 0, cupH = 0, cupY = 0, mouthY = 0, counterH = 0, minX = 0, maxX = 1;
  var bgCanvas = null, counterCanvas = null, cupCanvas = null, glowCanvas = null;
  var sprites = { products: [], golden: null, bad: [] };
  var goldenImg = PA.image(PA.iconSrc(cfg.goldenIcon || 'star'));
  var badImgs = (cfg.badItems && cfg.badItems.length ? cfg.badItems : ['bomb']).map(function (k) { return PA.image(PA.iconSrc(k)); });

  // ---------------------------------------------------------------- state
  var st = {};
  var items = [];
  var cup = { x: 0, target: 0, vx: 0, tilt: 0, squash: 0, hurt: 0 };
  var keys = { left: false, right: false };
  var pointerDown = false;
  var parts = [], pool = [], floaters = [], banner = null;
  var shakeMag = 0, flash = 0, flashColor = '#ffffff';
  var clock = 0;

  function resetWorld() {
    st = {
      phase: 'idle', phaseT: 0, goShown: false, timeLeft: ROUND, elapsed: 0,
      score: 0, combo: 0, bestCombo: 0, caught: 0, spawnAcc: 0, lastProduct: -1, lastSecond: -1
    };
    items.length = 0;
    floaters.length = 0;
    banner = null;
    flash = 0;
    shakeMag = 0;
    cup.target = cup.x = clamp(W / 2, minX, maxX);
    cup.squash = cup.hurt = cup.tilt = 0;
    keys.left = keys.right = false;
    updateHud();
  }

  // ---------------------------------------------------------------- shell
  var shell = PA.game({
    id: 'catch-rush',
    key: 'catchRush',
    texts: tx,
    demoDelay: 1800,
    start: startRound,
    stop: resetWorld,
    forceGameOver: finish,
    score: function () { return st.score; },
    state: function () {
      return { timeLeft: Math.max(0, Math.ceil(st.timeLeft)), combo: st.combo, caught: st.caught, items: items.length, phase: st.phase };
    },
    onKey: function (e, down) {
      var k = e.key;
      if (k === 'ArrowLeft' || k === 'a' || k === 'A') { keys.left = down; e.preventDefault(); }
      else if (k === 'ArrowRight' || k === 'd' || k === 'D') { keys.right = down; e.preventDefault(); }
      if (down && (keys.left || keys.right)) shell.hideHint();
    }
  });

  function startRound() {
    resetWorld();
    if (cfg.countdown === false) {
      st.phase = 'play';
    } else {
      st.phase = 'countdown';
      showBanner(tx.ready || 'Ready?', C.deep, 0.75, 0.8);
      PA.sfx.count();
    }
    shell.hint(tx.hint || '');
  }

  function finish() {
    st.phase = 'idle';
    var reward = PA.rewards.forValue('catchRush', st.score);
    var next = PA.rewards.next('catchRush', st.score);
    shell.end({
      heading: tx.timeUp || "Time's up!",
      score: st.score,
      stats: [{ label: tx.caught || 'caught', value: st.caught }, { label: tx.bestCombo || 'best combo', value: st.bestCombo }],
      reward: reward,
      nextText: !reward && next ? PA.fmt(PA.texts.nextReward, { min: next.min, title: next.title }) : ''
    });
  }

  // ---------------------------------------------------------------- sprites & backgrounds
  function offscreen(w, h) {
    var c = document.createElement('canvas');
    c.width = Math.max(1, Math.ceil(w * dpr));
    c.height = Math.max(1, Math.ceil(h * dpr));
    var g = c.getContext('2d');
    g.scale(dpr, dpr);
    c.lw = w;
    c.lh = h;
    return { c: c, g: g };
  }

  function makeSprite(img, size, color) {
    var pad = Math.round(size * 0.22);
    var o = offscreen(size + pad * 2, size + pad * 2);
    var g = o.g;
    g.shadowColor = 'rgba(40, 20, 0, 0.3)';
    g.shadowBlur = size * 0.14;
    g.shadowOffsetY = size * 0.08;
    if (img && img.complete && img.naturalWidth) {
      g.drawImage(img, pad, pad, size, size);
    } else {
      g.fillStyle = color || C.primary;
      g.beginPath();
      g.arc(pad + size / 2, pad + size / 2, size * 0.42, 0, Math.PI * 2);
      g.fill();
    }
    return o.c;
  }

  function buildSprites() {
    sprites.products = PA.products.map(function (p) { return makeSprite(p.img, S, p.color); });
    sprites.golden = makeSprite(goldenImg, S * 1.05, C.accent);
    sprites.bad = badImgs.map(function (img) { return makeSprite(img, S, '#333'); });
    var gs = S * 2.2;
    var o = offscreen(gs, gs);
    var grad = o.g.createRadialGradient(gs / 2, gs / 2, 0, gs / 2, gs / 2, gs / 2);
    grad.addColorStop(0, rgba(C.accent, 0.75));
    grad.addColorStop(0.45, rgba(C.accent, 0.3));
    grad.addColorStop(1, rgba(C.accent, 0));
    o.g.fillStyle = grad;
    o.g.fillRect(0, 0, gs, gs);
    glowCanvas = o.c;
  }

  function leaf(g, x, y, len, angle, color) {
    g.save();
    g.translate(x, y);
    g.rotate(angle);
    g.fillStyle = color;
    g.beginPath();
    g.moveTo(0, 0);
    g.bezierCurveTo(len * 0.3, -len * 0.28, len * 0.75, -len * 0.22, len, 0);
    g.bezierCurveTo(len * 0.75, len * 0.22, len * 0.3, len * 0.28, 0, 0);
    g.fill();
    g.strokeStyle = 'rgba(255, 255, 255, 0.22)';
    g.lineWidth = Math.max(1.5, len * 0.018);
    g.beginPath();
    g.moveTo(len * 0.04, 0);
    g.quadraticCurveTo(len * 0.5, -len * 0.03, len * 0.95, 0);
    g.stroke();
    g.restore();
  }

  function buildBackground() {
    var o = offscreen(W, H);
    var g = o.g;
    var sky = g.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, mix(C.accent, C.background, 0.5));
    sky.addColorStop(0.55, C.background);
    sky.addColorStop(1, mix(C.background, C.secondary, 0.12));
    g.fillStyle = sky;
    g.fillRect(0, 0, W, H);

    var m = Math.min(W, H);
    var sx = field.x + field.w * 0.8, sy = H * 0.17, sr = m * 0.15;
    g.fillStyle = rgba(C.accent, 0.18);
    g.beginPath(); g.arc(sx, sy, sr * 1.7, 0, Math.PI * 2); g.fill();
    g.fillStyle = rgba(C.accent, 0.5);
    g.beginPath(); g.arc(sx, sy, sr, 0, Math.PI * 2); g.fill();

    // Rolling hills behind the counter.
    var base = H - counterH;
    g.fillStyle = mix(C.secondary, C.background, 0.62);
    g.beginPath();
    g.moveTo(0, base);
    for (var x = 0; x <= W + 20; x += 20) g.lineTo(x, base - H * 0.1 - Math.sin(x / (W * 0.18) + 1) * H * 0.035);
    g.lineTo(W, base);
    g.fill();
    g.fillStyle = mix(C.secondary, C.background, 0.42);
    g.beginPath();
    g.moveTo(0, base);
    for (x = 0; x <= W + 20; x += 20) g.lineTo(x, base - H * 0.045 - Math.sin(x / (W * 0.11) + 3) * H * 0.02);
    g.lineTo(W, base);
    g.fill();

    // Soft bubbles.
    var seed = 7;
    var rnd = function () { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    g.fillStyle = 'rgba(255, 255, 255, 0.35)';
    for (var i = 0; i < 14; i++) {
      g.beginPath();
      g.arc(rnd() * W, rnd() * H * 0.7, 3 + rnd() * m * 0.018, 0, Math.PI * 2);
      g.fill();
    }

    // Jungle leaves framing the top corners.
    var dark = mix(C.secondary, C.deep, 0.35);
    var mid = C.secondary;
    var L = Math.max(90, m * 0.32);
    leaf(g, -L * 0.1, -L * 0.05, L * 1.05, 0.55, dark);
    leaf(g, -L * 0.05, L * 0.1, L * 0.85, 0.15, mid);
    leaf(g, L * 0.1, -L * 0.15, L * 0.75, 1.05, mix(mid, C.accent, 0.25));
    leaf(g, W + L * 0.1, -L * 0.05, L * 1.05, Math.PI - 0.55, dark);
    leaf(g, W + L * 0.05, L * 0.12, L * 0.8, Math.PI - 0.12, mid);
    leaf(g, W - L * 0.1, -L * 0.15, L * 0.7, Math.PI - 1.05, mix(mid, C.accent, 0.25));
    bgCanvas = o.c;

    // Counter (drawn in front of falling items).
    var oc = offscreen(W, counterH);
    var cg = oc.g;
    cg.fillStyle = C.deep;
    cg.fillRect(0, 0, W, counterH);
    var stripe = Math.max(18, counterH * 0.55);
    cg.fillStyle = 'rgba(255, 255, 255, 0.05)';
    for (x = 0; x < W; x += stripe * 2) cg.fillRect(x, 0, stripe, counterH);
    cg.fillStyle = mix(C.deep, '#ffffff', 0.25);
    cg.fillRect(0, 0, W, Math.max(5, counterH * 0.14));
    if (B.tagline && counterH > 30) {
      var label = B.tagline.toUpperCase();
      var fs = counterH * 0.36;
      cg.font = font(fs);
      var lw = cg.measureText(label).width;
      if (lw > W * 0.86) cg.font = font(fs * W * 0.86 / lw);
      cg.textAlign = 'center';
      cg.textBaseline = 'middle';
      cg.fillStyle = rgba(PA.color.onColor(C.deep), 0.38);
      cg.fillText(label, W / 2, counterH * 0.6);
    }
    counterCanvas = oc.c;
  }

  function buildCup() {
    var pad = S * 0.6;
    var o = offscreen(cupW + pad * 2, cupH + pad * 1.4);
    var g = o.g;
    var x0 = pad, y0 = pad * 1.2;
    var top = cupW, bot = cupW * 0.76;
    var inset = (top - bot) / 2;

    // Straw.
    g.strokeStyle = C.secondary;
    g.lineCap = 'round';
    g.lineWidth = S * 0.16;
    g.beginPath();
    g.moveTo(x0 + top * 0.62, y0 + cupH * 0.2);
    g.lineTo(x0 + top * 0.8, y0 - pad * 0.95);
    g.stroke();

    // Body.
    var body = function () {
      g.beginPath();
      g.moveTo(x0, y0);
      g.lineTo(x0 + top, y0);
      g.lineTo(x0 + top - inset, y0 + cupH - S * 0.12);
      g.quadraticCurveTo(x0 + top - inset - 1, y0 + cupH, x0 + top - inset - S * 0.14, y0 + cupH);
      g.lineTo(x0 + inset + S * 0.14, y0 + cupH);
      g.quadraticCurveTo(x0 + inset + 1, y0 + cupH, x0 + inset, y0 + cupH - S * 0.12);
      g.closePath();
    };
    var grad = g.createLinearGradient(x0, 0, x0 + top, 0);
    grad.addColorStop(0, mix(C.primary, '#ffffff', 0.18));
    grad.addColorStop(0.55, C.primary);
    grad.addColorStop(1, mix(C.primary, '#000000', 0.22));
    g.fillStyle = grad;
    body();
    g.fill();

    // Band with the brand word.
    g.save();
    body();
    g.clip();
    var by = y0 + cupH * 0.36, bh = cupH * 0.38;
    g.fillStyle = C.surface;
    g.fillRect(x0, by, top, bh);
    g.fillStyle = 'rgba(255, 255, 255, 0.28)';
    g.fillRect(x0 + top * 0.08, y0, top * 0.08, cupH);
    g.restore();
    var word = String(B.cupText || B.name || '').toUpperCase();
    if (word) {
      var size = bh * 0.62;
      g.font = font(size);
      var tw = g.measureText(word).width;
      if (tw > bot * 0.86) { size *= (bot * 0.86) / tw; g.font = font(size); }
      g.fillStyle = C.primary;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(word, x0 + top / 2, by + bh * 0.54);
    }

    // Rim and inside.
    g.fillStyle = mix(C.primary, '#000000', 0.45);
    g.beginPath();
    g.ellipse(x0 + top / 2, y0 + 1, top / 2 - 2, S * 0.13, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = mix(C.surface, C.primary, 0.12);
    g.beginPath();
    g.roundRect ? g.roundRect(x0 - S * 0.06, y0 - S * 0.05, top + S * 0.12, S * 0.16, S * 0.08) : g.rect(x0 - S * 0.06, y0 - S * 0.05, top + S * 0.12, S * 0.16);
    g.fill();
    cupCanvas = o.c;
    cupCanvas.ax = pad;          // cup body left edge inside the sprite
    cupCanvas.ay = y0 + cupH;    // cup bottom inside the sprite
  }

  function resize() {
    var r = stage.getBoundingClientRect();
    W = Math.max(1, Math.round(r.width));
    H = Math.max(1, Math.round(r.height));
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    field.w = Math.min(W, Math.max(560, H * 1.15));
    field.x = (W - field.w) / 2;
    S = clamp(Math.min(H * 0.095, field.w * 0.14), 40, 76);
    counterH = clamp(H * 0.09, 34, 64);
    cupW = S * 2.1;
    cupH = S * 1.35;
    cupY = H - counterH - cupH + S * 0.06;
    mouthY = cupY + S * 0.06;
    minX = field.x + cupW / 2 + 4;
    maxX = field.x + field.w - cupW / 2 - 4;
    cup.x = clamp(cup.x || W / 2, minX, maxX);
    cup.target = clamp(cup.target || W / 2, minX, maxX);
    buildBackground();
    buildCup();
    buildSprites();
  }

  // ---------------------------------------------------------------- effects
  function part() { return pool.pop() || {}; }
  function juice(x, y, color, golden) {
    var n = PA.reducedMotion ? 6 : 14;
    for (var i = 0; i < n; i++) {
      var p = part();
      var a = -Math.PI / 2 + (Math.random() - 0.5) * 2.4;
      var sp = S * (3 + Math.random() * 6);
      p.type = 'drop'; p.x = x; p.y = y; p.vx = Math.cos(a) * sp; p.vy = Math.sin(a) * sp;
      p.r = S * (0.05 + Math.random() * 0.07); p.color = color; p.life = p.max = 0.45 + Math.random() * 0.35;
      parts.push(p);
    }
    var ring = part();
    ring.type = 'ring'; ring.x = x; ring.y = y; ring.vx = ring.vy = 0; ring.r = S * 0.3; ring.color = golden ? C.accent : '#ffffff';
    ring.life = ring.max = 0.35;
    parts.push(ring);
    if (golden) {
      for (i = 0; i < 10; i++) {
        var s = part();
        var b = Math.random() * Math.PI * 2;
        s.type = 'spark'; s.x = x; s.y = y - S * 0.3; s.vx = Math.cos(b) * S * 5; s.vy = Math.sin(b) * S * 5 - S * 2;
        s.r = S * 0.12; s.color = i % 2 ? C.accent : '#ffffff'; s.life = s.max = 0.7; s.rot = b;
        parts.push(s);
      }
    }
  }
  function smoke(x, y) {
    for (var i = 0; i < 10; i++) {
      var p = part();
      var a = Math.random() * Math.PI * 2;
      p.type = 'smoke'; p.x = x; p.y = y; p.vx = Math.cos(a) * S * 2.2; p.vy = Math.sin(a) * S * 2.2 - S * 1.5;
      p.r = S * (0.18 + Math.random() * 0.18); p.color = i % 3 ? '#4a4a52' : '#ff9a1c'; p.life = p.max = 0.55 + Math.random() * 0.3;
      parts.push(p);
    }
  }
  function floatText(x, y, text, color, scale) {
    floaters.push({ x: x, y: y, text: text, color: color, life: 0.9, max: 0.9, size: S * 0.62 * (scale || 1) });
  }
  function showBanner(text, color, life, scale) {
    banner = { text: text, color: color, life: life, max: life, scale: scale || 1 };
  }
  function shake(mag) { if (SHAKE) shakeMag = Math.max(shakeMag, mag); }

  function updateFx(dt) {
    var g = H * 1.6;
    for (var i = parts.length - 1; i >= 0; i--) {
      var p = parts[i];
      p.life -= dt;
      if (p.life <= 0) { pool.push(parts[i]); parts.splice(i, 1); continue; }
      if (p.type === 'drop' || p.type === 'spark') p.vy += g * dt;
      if (p.type === 'smoke') { p.vx *= 0.9; p.vy *= 0.9; p.r += S * dt * 0.9; }
      if (p.type === 'ring') p.r += S * 5 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.type === 'spark') p.rot += dt * 8;
    }
    for (i = floaters.length - 1; i >= 0; i--) {
      var f = floaters[i];
      f.life -= dt;
      f.y -= S * 1.4 * dt;
      if (f.life <= 0) floaters.splice(i, 1);
    }
    if (banner) { banner.life -= dt; if (banner.life <= 0) banner = null; }
    shakeMag = Math.max(0, shakeMag - dt * 40);
    flash = Math.max(0, flash - dt * 2.2);
  }

  // ---------------------------------------------------------------- gameplay
  function multiplier() {
    var m = 1;
    for (var i = 0; i < STEPS.length; i++) if (st.combo >= STEPS[i]) m++;
    return m;
  }

  function spawn(progress) {
    var r = Math.random();
    var golden = cfg.goldenChance == null ? 0.06 : cfg.goldenChance;
    var bad = lerp(cfg.badChanceStart == null ? 0.14 : cfg.badChanceStart, cfg.badChanceEnd == null ? 0.26 : cfg.badChanceEnd, progress);
    var kind = r < golden ? 'golden' : r < golden + bad ? 'bad' : 'product';
    var idx = 0;
    var color = C.accent;
    if (kind === 'product') {
      var n = PA.products.length;
      idx = Math.floor(Math.random() * n);
      if (n > 1 && idx === st.lastProduct) idx = (idx + 1 + Math.floor(Math.random() * (n - 1))) % n;
      st.lastProduct = idx;
      color = PA.products[idx].color;
    } else if (kind === 'bad') {
      idx = Math.floor(Math.random() * badImgs.length);
      color = '#3a3a44';
    }
    var speed = H * lerp(cfg.fallSpeedStart || 0.36, cfg.fallSpeedEnd || 0.72, progress) * (0.88 + Math.random() * 0.3);
    if (kind === 'golden') speed *= 1.12;
    var margin = S * 0.7;
    items.push({
      kind: kind, idx: idx, color: color,
      x: field.x + margin + Math.random() * (field.w - margin * 2), y: -S * 0.6,
      vy: speed, ay: speed * 0.1, ph: Math.random() * 6, wf: 1.4 + Math.random() * 1.6,
      wa: S * (0.2 + Math.random() * 0.5), age: 0, missed: false
    });
  }

  function catchItem(it, attract) {
    var x = it.x, y = mouthY - S * 0.1;
    cup.squash = 1;
    if (it.kind === 'bad') {
      smoke(x, y);
      cup.hurt = 1;
      if (attract) return;
      st.combo = 0;
      st.timeLeft = Math.max(0, st.timeLeft - PENALTY);
      floatText(x, y - S * 0.6, PA.fmt(tx.penalty || '−{s}s', { s: PENALTY }), '#e5383b', 1.2);
      shake(16);
      flash = 0.35;
      flashColor = '#ff2a2a';
      PA.sfx.bad();
      updateHud();
      return;
    }
    var golden = it.kind === 'golden';
    juice(x, y, golden ? C.accent : it.color, golden);
    if (attract) return;
    st.combo++;
    st.caught++;
    if (st.combo > st.bestCombo) st.bestCombo = st.combo;
    var m = multiplier();
    var pts = (golden ? GOLDEN_POINTS : POINTS) * m;
    st.score += pts;
    floatText(x, y - S * 0.7, '+' + pts, golden ? mix(C.accent, '#000000', 0.15) : C.deep, golden ? 1.35 : 1);
    if (STEPS.indexOf(st.combo) >= 0) {
      showBanner(PA.fmt(tx.comboBurst || 'COMBO ×{n}!', { n: m }), C.primary, 0.9, 0.75);
      PA.sfx.golden();
    } else if (golden) {
      PA.sfx.golden();
    } else {
      PA.sfx.catchItem(st.combo);
    }
    if (golden) { flash = 0.25; flashColor = '#ffffff'; }
    updateHud();
    hudScore.classList.remove('is-bump');
    void hudScore.offsetWidth;
    hudScore.classList.add('is-bump');
  }

  function bot(dt) {
    var botSpeed = field.w * 1.5;
    var best = null, bestScore = Infinity, i, it, tA;
    for (i = 0; i < items.length; i++) {
      it = items[i];
      if (it.missed || it.kind === 'bad' || it.y > mouthY) continue;
      tA = (mouthY - it.y) / it.vy;
      if (Math.abs(it.x - cup.x) > botSpeed * tA + cupW * 0.4) continue;
      var score = tA - (it.kind === 'golden' ? 0.7 : 0);
      if (score < bestScore) { bestScore = score; best = it; }
    }
    var target = best ? best.x : field.x + field.w / 2 + Math.sin(clock * 0.8) * field.w * 0.22;
    for (i = 0; i < items.length; i++) {
      it = items[i];
      if (it.kind !== 'bad' || it.missed || it.y > mouthY) continue;
      tA = (mouthY - it.y) / it.vy;
      if (tA < 0.6 && Math.abs(it.x - target) < cupW * 0.8) target = it.x + (target >= it.x ? 1 : -1) * cupW;
    }
    target = clamp(target, minX, maxX);
    var step = botSpeed * dt;
    cup.target += clamp(target - cup.target, -step, step);
  }

  function update(dt, attract) {
    if (!attract) {
      st.phaseT += dt;
      if (st.phase === 'countdown') {
        if (st.phaseT >= 0.75 && !st.goShown) {
          st.goShown = true;
          showBanner(tx.go || 'GO!', C.primary, 0.6, 1.1);
          PA.sfx.go();
        }
        if (st.phaseT >= 1.2) { st.phase = 'play'; st.phaseT = 0; }
      } else if (st.phase === 'play') {
        st.elapsed += dt;
        st.timeLeft -= dt;
        var sec = Math.ceil(st.timeLeft);
        if (sec !== st.lastSecond) {
          st.lastSecond = sec;
          if (sec <= URGENT && sec > 0) PA.sfx.urgent();
          updateHud();
        }
        if (st.timeLeft <= 0) {
          st.timeLeft = 0;
          st.phase = 'ending';
          st.phaseT = 0;
          showBanner(tx.timeUp || "Time's up!", C.deep, 1.1, 0.85);
          PA.sfx.go();
          updateHud();
        }
      } else if (st.phase === 'ending' && st.phaseT >= 1.05) {
        finish();
        return;
      }
    }

    var progress = attract ? 0.1 : clamp(st.elapsed / ROUND, 0, 1);
    if (attract || st.phase === 'play') {
      st.spawnAcc += dt * lerp(cfg.spawnPerSecondStart || 1.3, cfg.spawnPerSecondEnd || 3, progress) * (attract ? 0.75 : 1);
      while (st.spawnAcc >= 1) { st.spawnAcc -= 1; spawn(progress); }
    }

    if (attract || shell.demo) {
      bot(dt);
    } else {
      var dir = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
      if (dir) cup.target = clamp(cup.target + dir * (cfg.keyboardSpeed || 1.25) * field.w * dt, minX, maxX);
    }
    var prev = cup.x;
    cup.x += (cup.target - cup.x) * Math.min(1, dt * 20);
    cup.vx = (cup.x - prev) / Math.max(dt, 0.0001);
    cup.tilt += (clamp(cup.vx / 2600, -0.2, 0.2) - cup.tilt) * Math.min(1, dt * 10);
    cup.squash = Math.max(0, cup.squash - dt * 5);
    cup.hurt = Math.max(0, cup.hurt - dt * 2.4);

    for (var i = items.length - 1; i >= 0; i--) {
      var it = items[i];
      var prevY = it.y;
      it.age += dt;
      it.vy += it.ay * dt;
      it.y += it.vy * dt;
      it.x += Math.sin(clock * it.wf + it.ph) * it.wa * dt;
      if (!it.missed && prevY < mouthY && it.y >= mouthY) {
        if (Math.abs(it.x - cup.x) <= cupW * 0.5 + S * 0.15) {
          catchItem(it, attract);
          items.splice(i, 1);
          continue;
        }
        it.missed = true;
        if (it.kind !== 'bad' && !attract && st.phase === 'play' && st.combo) { st.combo = 0; updateHud(); }
      }
      if (it.y - S > H) items.splice(i, 1);
    }
  }

  function updateHud() {
    hudScore.textContent = st.score;
    var sec = Math.max(0, Math.ceil(st.timeLeft));
    hudTimeValue.textContent = sec;
    hudTime.classList.toggle('is-urgent', st.phase === 'play' && sec <= URGENT);
    var m = multiplier();
    hudComboValue.textContent = '×' + m;
    hudCombo.classList.toggle('is-hot', m > 1);
  }

  // ---------------------------------------------------------------- rendering
  function drawItem(it) {
    var spr = it.kind === 'product' ? sprites.products[it.idx] : it.kind === 'golden' ? sprites.golden : sprites.bad[it.idx];
    if (!spr) return;
    var sc = 0.6 + 0.4 * easeOutBack(Math.min(1, it.age * 4));
    if (it.missed) ctx.globalAlpha = 0.75;
    ctx.save();
    ctx.translate(it.x, it.y);
    if (it.kind === 'golden' && glowCanvas) {
      var gl = 1 + Math.sin(clock * 8) * 0.12;
      ctx.drawImage(glowCanvas, -glowCanvas.lw * gl / 2, -glowCanvas.lh * gl / 2, glowCanvas.lw * gl, glowCanvas.lh * gl);
    }
    ctx.rotate(Math.sin(it.age * 2.2 + it.ph) * (it.kind === 'bad' ? 0.45 : 0.3));
    ctx.scale(sc, sc);
    ctx.drawImage(spr, -spr.lw / 2, -spr.lh / 2, spr.lw, spr.lh);
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  function drawCup() {
    if (!cupCanvas) return;
    var sq = Math.sin(cup.squash * Math.PI) * 0.14;
    var wob = cup.hurt > 0 ? Math.sin(cup.hurt * 30) * 0.12 * cup.hurt : 0;
    var baseY = cupY + cupH;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
    ctx.beginPath();
    ctx.ellipse(cup.x, baseY - 2, cupW * 0.42, S * 0.1, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.save();
    ctx.translate(cup.x, baseY);
    ctx.rotate(cup.tilt * 0.6 + wob);
    ctx.scale(1 + sq, 1 - sq);
    ctx.drawImage(cupCanvas, -cupCanvas.ax - cupW / 2, -cupCanvas.ay, cupCanvas.lw, cupCanvas.lh);
    ctx.restore();
  }

  function drawParts() {
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i];
      var k = p.life / p.max;
      ctx.globalAlpha = Math.min(1, k * 1.6);
      if (p.type === 'ring') {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = S * 0.1 * k;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.stroke();
      } else if (p.type === 'spark') {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.r, -p.r * 0.22, p.r * 2, p.r * 0.44);
        ctx.fillRect(-p.r * 0.22, -p.r, p.r * 0.44, p.r * 2);
        ctx.restore();
      } else {
        ctx.fillStyle = p.color;
        if (p.type === 'smoke') ctx.globalAlpha = k * 0.7;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  function drawText(text, x, y, size, color, alpha) {
    ctx.globalAlpha = alpha;
    ctx.font = font(size);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(4, size * 0.2);
    ctx.strokeStyle = '#ffffff';
    ctx.strokeText(text, x, y);
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
    ctx.globalAlpha = 1;
  }

  function render() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (shakeMag > 0) ctx.translate((Math.random() - 0.5) * shakeMag, (Math.random() - 0.5) * shakeMag);
    if (bgCanvas) ctx.drawImage(bgCanvas, 0, 0, W, H);
    for (var i = 0; i < items.length; i++) drawItem(items[i]);
    if (counterCanvas) ctx.drawImage(counterCanvas, -20, H - counterH, W + 40, counterH);
    drawCup();
    drawParts();
    for (i = 0; i < floaters.length; i++) {
      var f = floaters[i];
      drawText(f.text, f.x, f.y, f.size, f.color, Math.min(1, f.life / f.max * 2));
    }
    if (banner) {
      var age = banner.max - banner.life;
      var s = easeOutBack(Math.min(1, age * 5)) * banner.scale;
      var size = Math.min(W * 0.15, 84) * s;
      if (size > 1) drawText(banner.text, W / 2, H * 0.4, size, banner.color, Math.min(1, banner.life * 4));
    }
    if (flash > 0) {
      ctx.globalAlpha = flash * 0.5;
      ctx.fillStyle = flashColor;
      ctx.fillRect(-20, -20, W + 40, H + 40);
      ctx.globalAlpha = 1;
    }
  }

  // ---------------------------------------------------------------- input
  function controllable() { return shell.screen() === 'playing' && !shell.demo && shell.ready(); }
  function aim(e) {
    var r = canvas.getBoundingClientRect();
    cup.target = clamp(e.clientX - r.left, minX, maxX);
  }
  canvas.addEventListener('pointerdown', function (e) {
    if (!controllable()) return;
    pointerDown = true;
    try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* not supported */ }
    aim(e);
    shell.hideHint();
  });
  canvas.addEventListener('pointermove', function (e) {
    if (!controllable()) return;
    if (pointerDown || e.pointerType === 'mouse') aim(e);
  });
  var release = function () { pointerDown = false; };
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', release);
  canvas.addEventListener('contextmenu', function (e) { e.preventDefault(); });

  // ---------------------------------------------------------------- boot
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', function () { setTimeout(resize, 120); });
  resize();
  resetWorld();
  PA.ready(buildSprites);

  PA.loop(function (dt) {
    clock += dt;
    var screen = shell.screen();
    if (screen === 'playing') update(dt, false);
    else if (screen === 'title') update(dt, true);
    if (screen !== 'paused') updateFx(dt);
    render();
  });
})();
