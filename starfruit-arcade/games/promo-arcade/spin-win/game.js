/*
 * Spin & Win — game.js
 * A branded prize wheel. The prize is drawn first (weighted by brand.config.js →
 * wheel.segments[].weight), then the wheel eases out to land on it with a small overshoot
 * and settle. The flapper ticks on every peg, LED bulbs chase around the rim, and wins
 * open the reward ticket (with optional lead capture). Optional spins-per-day limit.
 */
(function () {
  'use strict';
  var PA = window.PromoArcade;
  var B = PA.brand;
  var C = PA.colors;
  var mix = PA.color.mix;
  var rgba = PA.color.rgba;
  var fmt = PA.fmt;
  var cfg = window.GAME_CONFIG || {};
  var tx = cfg.texts || {};
  var wheelCfg = B.wheel || {};
  var TAU = Math.PI * 2;
  var SHAKE = cfg.screenShake !== false && !PA.reducedMotion;
  var HEADING_FONT = getComputedStyle(document.documentElement).getPropertyValue('--f-heading') || 'sans-serif';
  function font(size) { return '800 ' + Math.round(size) + 'px ' + HEADING_FONT; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function easeOutCubic(k) { return 1 - Math.pow(1 - k, 3); }
  function easeInOutSine(k) { return -(Math.cos(Math.PI * k) - 1) / 2; }
  function easeOutBack(k) { var c = 1.7; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); }

  var canvas = document.getElementById('game');
  var ctx = canvas.getContext('2d');
  var stage = document.getElementById('stage');
  var spinBtn = document.getElementById('spin-btn');
  var statusEl = document.getElementById('hud-status');

  // ---------------------------------------------------------------- segments
  var segs = (wheelCfg.segments && wheelCfg.segments.length ? wheelCfg.segments : [
    { label: 'PRIZE', weight: 1, win: true, title: 'PRIZE', code: 'PRIZE' }, { label: 'TRY AGAIN', weight: 1, win: false }
  ]).map(function (s, i) { return PA.extend({ index: i }, s); });
  var N = segs.length;
  var SEG = TAU / N;
  var jackpot = PA.rewards.jackpot();
  (function assignColors() {
    var custom = cfg.segmentColors && cfg.segmentColors.length ? cfg.segmentColors : null;
    var cycle = custom || [C.primary, C.secondary, C.accent, mix(C.primary, C.accent, 0.45)];
    var loseColor = cfg.loseColor || mix(C.background, C.surface, 0.4);
    var w = 0;
    segs.forEach(function (s, i) {
      if (s.color) s.fill = s.color;
      else if (custom) s.fill = custom[i % custom.length];
      else if (!s.win) s.fill = loseColor;
      else s.fill = cycle[w++ % cycle.length];
      s.ink = PA.color.onColor(s.fill, C.deep);
      s.img = s.icon ? PA.image(PA.iconSrc(s.icon)) : null;
    });
  })();

  // ---------------------------------------------------------------- spins per day
  var LIMIT = wheelCfg.spinsPerDay || 0;
  function today() {
    var d = new Date();
    return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
  }
  function spinsUsed() {
    var rec = shell.store.get('spins', null);
    return rec && rec.day === today() ? rec.count : 0;
  }
  function spinsLeft() { return (!LIMIT || shell.demo) ? Infinity : Math.max(0, LIMIT - spinsUsed()); }
  function useSpin() {
    if (!LIMIT || shell.demo) return;
    shell.store.set('spins', { day: today(), count: spinsUsed() + 1 });
  }

  // ---------------------------------------------------------------- state
  var W = 1, H = 1, dpr = 1, cx = 0, cy = 0, R = 100, rimW = 10;
  var faceCanvas = null, glowCanvas = null;
  var rot = 0;                     // wheel rotation (radians, clockwise)
  var spin = null;                 // active spin { from, to, overshoot, t, dur, seg }
  var phase = 'idle';              // 'idle' | 'spinning' | 'landed'
  var landed = null, landedT = 0;
  var lastPeg = 0;
  var flap = 0, flapV = 0;
  var bulbPhase = 0;
  var bannerText = '', bannerT = 0;
  var shakeMag = 0;
  var wins = 0;
  var demoT = 0;
  var clock = 0;

  var shell = PA.game({
    id: 'spin-win',
    key: 'spinWin',
    texts: tx,
    demoDelay: 2600,
    teaser: jackpot ? fmt(PA.texts.winUpTo, { title: jackpot.title || jackpot.label }) : '',
    art: [PA.iconSrc('star'), PA.iconSrc('gift'), PA.iconSrc('star')],
    start: ready,
    stop: function () { spin = null; phase = 'idle'; landed = null; bannerText = ''; },
    forceGameOver: function () {
      if (phase === 'spinning' && spin) { rot = spin.to; resolve(spin.seg, true); }
      else if (phase === 'idle') startSpin(true);
      else if (phase === 'landed' && landed) finish();
    },
    score: function () { return wins; },
    state: function () {
      return { spinning: phase === 'spinning', lastPrize: landed ? landed.label : '', spinsLeft: spinsLeft() === Infinity ? -1 : spinsLeft(), phase: phase };
    },
    onKey: function (e, down) {
      if (down && (e.key === ' ' || e.key === 'Enter')) { e.preventDefault(); tryUserSpin(); }
    },
    onAction: function (name) { if (name === 'spin') tryUserSpin(); },
    shareText: function (r, vars) {
      return r.reward ? fmt(tx.shareText || '{reward} at {brand}!', vars) : fmt((B.share && B.share.text) || '{game} at {brand}', vars);
    }
  });

  function ready() {
    spin = null;
    phase = 'idle';
    landed = null;
    bannerText = '';
    demoT = 1.1;
    updateUi();
    if (spinsLeft() > 0) shell.hint(tx.hint || '');
  }

  function updateUi() {
    var left = spinsLeft();
    var canSpin = phase === 'idle' && left > 0;
    spinBtn.disabled = !canSpin;
    spinBtn.classList.toggle('is-ready', canSpin && shell.screen() === 'playing');
    var text;
    if (phase === 'spinning') text = tx.spinning || 'Good luck!';
    else if (left <= 0) text = tx.comeBackShort || 'Come back tomorrow';
    else if (left !== Infinity) text = fmt(tx.spinsLeft || '{n} spins left today', { n: left });
    else text = tx.ready || 'Tap SPIN to play';
    statusEl.textContent = text;
  }

  // ---------------------------------------------------------------- spinning
  function pickSegment() {
    var total = 0;
    segs.forEach(function (s) { total += Math.max(0, s.weight == null ? 1 : s.weight); });
    if (total <= 0) return segs[Math.floor(Math.random() * N)];
    var r = Math.random() * total;
    for (var i = 0; i < N; i++) {
      r -= Math.max(0, segs[i].weight == null ? 1 : segs[i].weight);
      if (r < 0) return segs[i];
    }
    return segs[N - 1];
  }

  function tryUserSpin() {
    if (shell.screen() !== 'playing' || shell.demo || !shell.ready()) return;
    shell.hideHint();
    startSpin(false);
  }

  function startSpin(instant) {
    if (phase !== 'idle' || spinsLeft() <= 0) return;
    var seg = pickSegment();
    useSpin();
    // Land the segment centre (± a random offset) under the pointer at 12 o'clock.
    var offset = (Math.random() - 0.5) * SEG * 0.6;
    var want = -((seg.index + 0.5) * SEG + offset);
    var from = rot - 0.12;
    var delta = ((want - from) % TAU + TAU) % TAU;
    var turns = cfg.extraTurns || [5, 7];
    var extra = Math.round(turns[0] + Math.random() * Math.max(0, turns[1] - turns[0]));
    spin = { from: from, start: rot, to: from + extra * TAU + delta, overshoot: SEG * (0.08 + Math.random() * 0.1), t: 0, dur: cfg.spinSeconds || 5.4, seg: seg };
    phase = 'spinning';
    if (instant) {
      rot = spin.to;
      resolve(seg, true);
      return;
    }
    PA.sfx.whoosh();
    updateUi();
  }

  function resolve(seg, instant) {
    spin = null;
    phase = 'landed';
    landed = seg;
    landedT = 0;
    updateUi();
    if (seg.win) {
      wins++;
      bannerText = fmt(tx.banner || '{label}!', { label: seg.title || seg.label });
      bannerT = 0;
      var big = seg === jackpot;
      if (!instant) {
        PA.confetti({ x: canvas.getBoundingClientRect().left + cx, y: canvas.getBoundingClientRect().top + cy, count: big ? 200 : 110, power: big ? 1.2 : 0.9 });
        if (big && SHAKE) shakeMag = 12;
        PA.sfx.golden();
      }
    } else {
      bannerText = seg.label;
      bannerT = 0;
      if (!instant) PA.sfx.miss();
    }
    if (instant) finish();
  }

  function finish() {
    var seg = landed;
    if (!seg) return;
    var left = spinsLeft();
    var reward = seg.win ? { title: seg.title || seg.label, code: seg.code || '', description: seg.description || '' } : null;
    shell.end({
      heading: seg.win ? (tx.winHeading || 'You won!') : (tx.loseHeading || 'So close!'),
      sub: seg.win ? '' : (tx.loseSub || ''),
      hideScore: true,
      art: seg.win ? (seg.img ? PA.iconSrc(seg.icon) : PA.iconSrc('gift')) : '',
      score: wins,
      reward: reward,
      nextText: left <= 0 ? (tx.comeBack || 'Come back tomorrow for another spin') : '',
      againText: left <= 0 ? (tx.comeBackShort || 'Come back tomorrow') : (tx.spinAgain || 'Spin again'),
      noMorePlays: left <= 0
    });
  }

  // ---------------------------------------------------------------- drawing caches
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

  function fitLines(g, label, maxW, maxSize) {
    var size = maxSize;
    g.font = font(size);
    var oneLine = g.measureText(label).width;
    var words = label.split(' ');
    if (oneLine > maxW && words.length > 1) {
      var mid = Math.ceil(words.length / 2);
      var lines = [words.slice(0, mid).join(' '), words.slice(mid).join(' ')];
      var widest = Math.max(g.measureText(lines[0]).width, g.measureText(lines[1]).width);
      size = Math.min(maxSize * 0.9, size * maxW / widest);
      return { lines: lines, size: size };
    }
    if (oneLine > maxW) size *= maxW / oneLine;
    return { lines: [label], size: size };
  }

  function buildFace() {
    var o = offscreen(R * 2, R * 2);
    var g = o.g;
    g.translate(R, R);
    for (var i = 0; i < N; i++) {
      var s = segs[i];
      var a0 = -Math.PI / 2 + i * SEG, a1 = a0 + SEG;
      var grad = g.createRadialGradient(0, 0, R * 0.15, 0, 0, R);
      grad.addColorStop(0, mix(s.fill, '#ffffff', 0.22));
      grad.addColorStop(0.75, s.fill);
      grad.addColorStop(1, mix(s.fill, '#000000', 0.12));
      g.fillStyle = grad;
      g.beginPath();
      g.moveTo(0, 0);
      g.arc(0, 0, R, a0, a1);
      g.closePath();
      g.fill();
      g.strokeStyle = 'rgba(255, 255, 255, 0.55)';
      g.lineWidth = Math.max(1.5, R * 0.012);
      g.stroke();

      // Label (reads from the centre outwards) and optional icon near the rim.
      g.save();
      g.rotate(a0 + SEG / 2);
      var outer = R * 0.9;
      if (s.img && s.img.complete && s.img.naturalWidth) {
        var isz = Math.min(R * 0.2, 2 * R * 0.8 * Math.sin(SEG / 2) * 0.7);
        g.save();
        g.translate(R * 0.8, 0);
        g.rotate(Math.PI / 2);
        g.drawImage(s.img, -isz / 2, -isz / 2, isz, isz);
        g.restore();
        outer = R * 0.8 - isz * 0.62;
      }
      var inner = R * 0.27;
      var chord = 2 * ((inner + outer) / 2) * Math.sin(SEG / 2);
      var fit = fitLines(g, String(s.label || ''), outer - inner, Math.min(R * 0.12, chord * 0.42));
      g.font = font(fit.size);
      g.textAlign = 'right';
      g.textBaseline = 'middle';
      g.fillStyle = s.ink;
      var lh = fit.size * 1.02;
      fit.lines.forEach(function (line, li) {
        g.fillText(line, outer, (li - (fit.lines.length - 1) / 2) * lh);
      });
      g.restore();
    }
    // Pegs on the segment borders.
    for (i = 0; i < N; i++) {
      var a = -Math.PI / 2 + i * SEG;
      var px = Math.cos(a) * R * 0.955, py = Math.sin(a) * R * 0.955;
      g.fillStyle = 'rgba(0, 0, 0, 0.25)';
      g.beginPath(); g.arc(px + 1, py + 2, R * 0.03, 0, TAU); g.fill();
      g.fillStyle = '#ffffff';
      g.beginPath(); g.arc(px, py, R * 0.028, 0, TAU); g.fill();
    }
    faceCanvas = o.c;

    var gs = rimW * 1.6;
    var gl = offscreen(gs, gs);
    var rg = gl.g.createRadialGradient(gs / 2, gs / 2, 0, gs / 2, gs / 2, gs / 2);
    rg.addColorStop(0, rgba(C.accent, 0.9));
    rg.addColorStop(0.35, rgba(C.accent, 0.45));
    rg.addColorStop(1, rgba(C.accent, 0));
    gl.g.fillStyle = rg;
    gl.g.fillRect(0, 0, gs, gs);
    glowCanvas = gl.c;
  }

  function resize() {
    var r = stage.getBoundingClientRect();
    W = Math.max(1, Math.round(r.width));
    H = Math.max(1, Math.round(r.height));
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    var top = 70, bottom = H - 96;
    var outerR = Math.max(60, Math.min(W - 28, bottom - top - 10) / 2);
    rimW = outerR * 0.11;
    R = outerR - rimW;
    cx = W / 2;
    cy = top + (bottom - top) / 2;
    buildFace();
  }

  // ---------------------------------------------------------------- update & render
  function update(dt) {
    var screen = shell.screen();
    bulbPhase += dt * (phase === 'spinning' ? 14 : 3);
    if (phase === 'spinning' && spin && screen !== 'paused') {
      spin.t += dt;
      var pre = 0.2;                 // small wind-up backwards before the release
      var k = (spin.t - pre) / (spin.dur - pre);
      var main = 0.86;
      if (spin.t < pre) {
        rot = spin.start + (spin.from - spin.start) * Math.sin((spin.t / pre) * Math.PI / 2);
      } else if (k < main) {
        rot = spin.from + (spin.to + spin.overshoot - spin.from) * easeOutCubic(k / main);
      } else if (k < 1) {
        rot = spin.to + spin.overshoot * (1 - easeInOutSine((k - main) / (1 - main)));
      } else {
        rot = spin.to;
        resolve(spin.seg, false);
      }
    } else if (phase === 'idle' && screen !== 'paused') {
      rot += TAU * (cfg.idleSpeed == null ? 0.12 : cfg.idleSpeed) * dt * (screen === 'playing' ? 0.5 : 1);
    }
    if (phase === 'landed' && screen === 'playing') {
      landedT += dt;
      if (landedT >= (cfg.resultDelay || 1.1)) finish();
    }
    if (shell.demo && screen === 'playing' && phase === 'idle') {
      demoT -= dt;
      if (demoT <= 0) startSpin(false);
    }

    // Flapper: kicked by every peg, then springs back.
    var peg = Math.floor((rot + Math.PI * 2 * 1000) / SEG);
    if (peg !== lastPeg) {
      var speed = Math.abs(peg - lastPeg);
      lastPeg = peg;
      if (phase === 'spinning') {
        flap = -0.55;
        flapV = 0;
        if (speed < 3) PA.sfx.peg();
      }
    }
    flapV += (-flap * 180 - flapV * 14) * dt;
    flap += flapV * dt;
    bannerT += dt;
    shakeMag = Math.max(0, shakeMag - dt * 30);
  }

  function drawBackground() {
    var g = ctx.createRadialGradient(cx, cy, R * 0.3, cx, cy, Math.max(W, H) * 0.8);
    g.addColorStop(0, mix(C.deep, C.secondary, 0.35));
    g.addColorStop(1, C.deep);
    ctx.fillStyle = g;
    ctx.fillRect(-20, -20, W + 40, H + 40);
    // Slow sunburst behind the wheel.
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(clock * 0.05);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.045)';
    var L = Math.max(W, H);
    for (var i = 0; i < 18; i++) {
      ctx.rotate(TAU / 18);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(L, -L * 0.09);
      ctx.lineTo(L, L * 0.09);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  function drawRim() {
    var outer = R + rimW;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
    ctx.beginPath(); ctx.arc(cx, cy + rimW * 0.5, outer + 2, 0, TAU); ctx.fill();
    var g = ctx.createLinearGradient(cx, cy - outer, cx, cy + outer);
    g.addColorStop(0, mix(C.deep, '#ffffff', 0.2));
    g.addColorStop(1, mix(C.deep, '#000000', 0.25));
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(cx, cy, outer, 0, TAU); ctx.arc(cx, cy, R - 1, 0, TAU, true); ctx.fill();
    ctx.strokeStyle = C.accent;
    ctx.lineWidth = Math.max(2, rimW * 0.12);
    ctx.beginPath(); ctx.arc(cx, cy, outer - ctx.lineWidth / 2, 0, TAU); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy, R + ctx.lineWidth / 2, 0, TAU); ctx.stroke();

    var n = cfg.bulbs || 24;
    var br = rimW * 0.2;
    var celebrating = phase === 'landed' && landed && landed.win;
    for (var i = 0; i < n; i++) {
      var a = -Math.PI / 2 + (i / n) * TAU;
      var x = cx + Math.cos(a) * (R + rimW / 2), y = cy + Math.sin(a) * (R + rimW / 2);
      var on = celebrating ? Math.floor(landedT * 8) % 2 === 0 : (Math.floor(bulbPhase) + i) % 3 === 0;
      if (on && glowCanvas) ctx.drawImage(glowCanvas, x - glowCanvas.lw / 2, y - glowCanvas.lh / 2, glowCanvas.lw, glowCanvas.lh);
      ctx.fillStyle = on ? '#fffbe6' : mix(C.accent, C.deep, 0.55);
      ctx.beginPath(); ctx.arc(x, y, br, 0, TAU); ctx.fill();
    }
  }

  function drawHub() {
    var hr = R * 0.2;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.beginPath(); ctx.arc(cx, cy + 3, hr + 4, 0, TAU); ctx.fill();
    ctx.fillStyle = C.deep;
    ctx.beginPath(); ctx.arc(cx, cy, hr + rimW * 0.35, 0, TAU); ctx.fill();
    ctx.fillStyle = C.surface;
    ctx.beginPath(); ctx.arc(cx, cy, hr, 0, TAU); ctx.fill();
    var logo = hubLogo;
    if (logo && logo.complete && logo.naturalWidth) {
      var s = hr * 1.35;
      ctx.drawImage(logo, cx - s / 2, cy - s / 2, s, s);
    }
  }
  var hubLogo = PA.image(B.logoImage ? PA.asset(B.logoImage) : PA.iconSrc(B.logoIcon || 'gift'));

  function drawPointer() {
    var outer = R + rimW;
    var pw = rimW * 1.25, ph = rimW * 2.2;
    ctx.save();
    ctx.translate(cx, cy - outer + rimW * 0.15);
    ctx.rotate(flap);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.moveTo(-pw + 2, -ph * 0.25 + 3); ctx.lineTo(pw + 2, -ph * 0.25 + 3); ctx.lineTo(2, ph * 0.75 + 3);
    ctx.closePath(); ctx.fill();
    var g = ctx.createLinearGradient(-pw, 0, pw, 0);
    g.addColorStop(0, mix(C.accent, '#ffffff', 0.35));
    g.addColorStop(1, mix(C.accent, '#000000', 0.15));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, ph * 0.75);
    ctx.lineTo(-pw, -ph * 0.15);
    ctx.quadraticCurveTo(-pw, -ph * 0.42, 0, -ph * 0.42);
    ctx.quadraticCurveTo(pw, -ph * 0.42, pw, -ph * 0.15);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = mix(C.accent, '#000000', 0.3);
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = C.deep;
    ctx.beginPath(); ctx.arc(0, -ph * 0.12, pw * 0.32, 0, TAU); ctx.fill();
    ctx.restore();
  }

  function drawHighlight() {
    if (phase !== 'landed' || !landed) return;
    var blink = 0.25 + 0.25 * Math.sin(landedT * 14);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rot);
    var a0 = -Math.PI / 2 + landed.index * SEG;
    ctx.fillStyle = 'rgba(255, 255, 255, ' + blink.toFixed(3) + ')';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, R, a0, a0 + SEG);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawBanner() {
    if (!bannerText || phase !== 'landed') return;
    var s = easeOutBack(Math.min(1, bannerT * 4));
    var size = Math.min(W * 0.1, R * 0.32, 64) * s;
    if (size < 2) return;
    ctx.font = font(size);
    var tw = ctx.measureText(bannerText).width;
    var bw = tw + size * 1.2, bh = size * 1.6;
    var y = cy + R + rimW - bh * 0.2;
    ctx.fillStyle = landed.win ? C.primary : C.deep;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(cx - bw / 2, y - bh / 2, bw, bh, bh / 2);
    else ctx.rect(cx - bw / 2, y - bh / 2, bw, bh);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = landed.win ? PA.color.onColor(C.primary) : PA.color.onColor(C.deep);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(bannerText, cx, y + size * 0.04);
  }

  function render() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (shakeMag > 0) ctx.translate((Math.random() - 0.5) * shakeMag, (Math.random() - 0.5) * shakeMag);
    drawBackground();
    drawRim();
    if (faceCanvas) {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rot);
      ctx.drawImage(faceCanvas, -R, -R, R * 2, R * 2);
      ctx.restore();
    }
    drawHighlight();
    drawHub();
    drawPointer();
    drawBanner();
  }

  // ---------------------------------------------------------------- input
  canvas.addEventListener('pointerdown', function (e) {
    var r = canvas.getBoundingClientRect();
    var dx = e.clientX - r.left - cx, dy = e.clientY - r.top - cy;
    if (dx * dx + dy * dy <= (R + rimW) * (R + rimW)) tryUserSpin();
  });
  canvas.addEventListener('contextmenu', function (e) { e.preventDefault(); });

  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', function () { setTimeout(resize, 120); });
  resize();
  updateUi();
  PA.ready(buildFace);

  var lastScreen = '';
  PA.loop(function (dt) {
    clock += dt;
    var screen = shell.screen();
    if (screen !== lastScreen) { lastScreen = screen; updateUi(); }
    if (screen !== 'paused') update(dt);
    render();
  });
})();
