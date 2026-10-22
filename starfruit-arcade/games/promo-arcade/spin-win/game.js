/*
 * Spin & Win — a prize wheel in the brand's colours.
 * The result is chosen first by weighted odds (brand.config.js → rewards['spin-win']),
 * then the wheel eases out to land on it, with a ticking flapper and chasing lights.
 * Optional spins-per-day limit is remembered on the player's device.
 *
 * Pilots: 'title' (slow idle rotation behind the title card), 'player', 'idle', 'demo'.
 */
(function () {
  'use strict';

  var PA = window.PromoArcade;
  var cfg = window.GAME_CONFIG;
  var TX = cfg.texts || {};
  var SW = (PA.brand.rewards || {})['spin-win'] || {};
  var SEGS = SW.segments || [];
  var N = Math.max(1, SEGS.length);
  var SEG = (Math.PI * 2) / N;
  var TAU = Math.PI * 2;
  var COL = PA.colors;
  var FONT = getComputedStyle(document.documentElement).getPropertyValue('--pa-font') || 'sans-serif';

  var canvas = document.getElementById('stage');
  var ctx = canvas.getContext('2d');
  var W = 1, H = 1, dpr = 1, R = 100, cx = 0, cy = 0;
  var disc = null;
  var icons = {};

  var pilot = 'title';
  var paused = false;
  var time = 0;
  var rot = 0;            // wheel rotation (radians, clockwise)
  var spin = null;        // { from, total, bounce, t, dur, settle, index }
  var lastIdx = -1;
  var flap = 0;
  var winGlow = 0;
  var resultIdx = -1;
  var resultT = 0;
  var demoT = 0;

  var spinBtn = document.createElement('button');
  spinBtn.type = 'button';
  spinBtn.className = 'pa-btn pa-btn-primary pa-btn-big sw-spin';
  spinBtn.setAttribute('data-action', 'spin');
  spinBtn.textContent = TX.spin || 'Spin';
  spinBtn.style.cssText = 'position:fixed;z-index:15;left:50%;transform:translateX(-50%);bottom:calc(env(safe-area-inset-bottom,0px) + 28px);min-width:220px;';
  document.body.appendChild(spinBtn);

  // ------------------------------------------------------------------ limit
  function today() {
    var d = new Date();
    return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
  }
  function spinsUsed() {
    var rec = PA.storage.get('spins', null);
    return rec && rec.date === today() ? rec.count : 0;
  }
  function canSpin() {
    var max = SW.spinsPerDay || 0;
    return PA.demo || !max || spinsUsed() < max;
  }
  function countSpin() {
    if (!SW.spinsPerDay || PA.demo) return;
    PA.storage.set('spins', { date: today(), count: spinsUsed() + 1 });
  }

  // ------------------------------------------------------------------ layout & disc
  function resize() {
    W = Math.max(1, innerWidth);
    H = Math.max(1, innerHeight);
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    var top = 74, bottom = 120;
    R = Math.max(80, Math.min(W * 0.43, (H - top - bottom) / 2 - 18, 330));
    cx = W / 2;
    cy = top + (H - top - bottom) / 2 + 6;
    buildDisc();
  }

  function buildDisc() {
    var size = Math.ceil(R * 2 * dpr);
    disc = document.createElement('canvas');
    disc.width = disc.height = size;
    var c = disc.getContext('2d');
    c.scale(dpr, dpr);
    c.translate(R, R);
    for (var i = 0; i < N; i++) {
      var sgm = SEGS[i];
      var a0 = -Math.PI / 2 + i * SEG;
      var a1 = a0 + SEG;
      var color = sgm.color || (i % 2 ? COL.primary : COL.secondary);
      var g = c.createRadialGradient(0, 0, R * 0.2, 0, 0, R);
      g.addColorStop(0, PA.mix(color, '#ffffff', 0.18));
      g.addColorStop(1, color);
      c.fillStyle = g;
      c.beginPath();
      c.moveTo(0, 0);
      c.arc(0, 0, R, a0, a1);
      c.closePath();
      c.fill();
      c.strokeStyle = 'rgba(255,255,255,0.75)';
      c.lineWidth = Math.max(2, R * 0.012);
      c.stroke();
      // Label along the radius.
      c.save();
      c.rotate(a0 + SEG / 2);
      var textColor = PA.onColor(color);
      c.fillStyle = textColor;
      c.textAlign = 'right';
      c.textBaseline = 'middle';
      var lines = String(sgm.label || '').split('\n');
      var fs = Math.max(11, Math.min(R * 0.1, (SEG * R * 0.55) / Math.max(1, lines.length) * 0.75));
      var lane = R * (sgm.icon ? 0.4 : 0.5);   // label space between the icon and the rim
      c.font = '900 ' + fs + 'px ' + FONT;
      var widest = 0;
      for (var m = 0; m < lines.length; m++) widest = Math.max(widest, c.measureText(lines[m].toUpperCase()).width);
      while (fs > 9 && widest > lane) {
        fs -= 0.5;
        c.font = '900 ' + fs + 'px ' + FONT;
        widest = 0;
        for (var q = 0; q < lines.length; q++) widest = Math.max(widest, c.measureText(lines[q].toUpperCase()).width);
      }
      for (var l = 0; l < lines.length; l++) {
        var y = (l - (lines.length - 1) / 2) * fs * 1.02;
        c.fillText(lines[l].toUpperCase(), R * 0.8, y);
      }
      if (sgm.icon && icons[sgm.icon]) {
        var isz = R * 0.14;
        c.translate(R * 0.31, 0);
        c.rotate(Math.PI / 2);
        c.drawImage(icons[sgm.icon], -isz / 2, -isz / 2, isz, isz);
      }
      c.restore();
    }
    // Inner shadow ring.
    var sh = c.createRadialGradient(0, 0, R * 0.82, 0, 0, R);
    sh.addColorStop(0, 'rgba(0,0,0,0)');
    sh.addColorStop(1, 'rgba(0,0,0,0.22)');
    c.fillStyle = sh;
    c.beginPath();
    c.arc(0, 0, R, 0, TAU);
    c.fill();
  }

  // ------------------------------------------------------------------ spinning
  function pickIndex() {
    var total = 0;
    var i;
    for (i = 0; i < N; i++) total += Math.max(0, SEGS[i].weight == null ? 1 : SEGS[i].weight);
    var r = Math.random() * total;
    for (i = 0; i < N; i++) {
      r -= Math.max(0, SEGS[i].weight == null ? 1 : SEGS[i].weight);
      if (r <= 0) return i;
    }
    return N - 1;
  }

  function rotationFor(index, from) {
    var local = (index + 0.5 + (Math.random() - 0.5) * 0.6) * SEG;
    var delta = ((-local - from) % TAU + TAU) % TAU;
    var turns = cfg.minTurns + Math.floor(Math.random() * (cfg.maxTurns - cfg.minTurns + 1));
    return delta + turns * TAU;
  }

  function startSpin() {
    if (spin || resultIdx >= 0 || paused) return;
    if (pilot === 'player') {
      if (!PA.inputReady()) return;
      if (!canSpin()) { PA.toast(TX.limitText || ''); return; }
      countSpin();
    }
    var index = pickIndex();
    spin = { from: rot, total: rotationFor(index, rot), bounce: SEG * 0.08, t: 0, dur: cfg.spinSeconds || 5.2, settle: 0, index: index };
    PA.audio.play('spin');
    renderButton();
  }

  function finishSpin() {
    var idx = spin.index;
    rot = spin.from + spin.total;
    spin = null;
    resultIdx = idx;
    resultT = 0;
    winGlow = 1;
    renderButton();
  }

  function reportResult() {
    var sgm = SEGS[resultIdx] || {};
    var won = !!sgm.win;
    var reward = won ? { title: sgm.title || sgm.label, code: sgm.code || '', description: sgm.description || '' } : null;
    var last = resultIdx;
    if (pilot === 'player') pilot = 'idle';
    PA.finish({
      score: null,
      reward: reward,
      title: won ? (TX.winTitle || 'You won!') : (TX.loseTitle || 'So close!'),
      subtitle: won ? null : (TX.loseText || ''),
      nextText: won ? null : (canSpin() ? TX.againText : TX.limitText),
      demoDelay: 1800
    });
    lastPrize = last;
  }
  var lastPrize = -1;

  function easeOutQuart(k) { return 1 - Math.pow(1 - k, 4); }

  function update(dt) {
    time += dt;
    if (paused) return;
    if (spin) {
      if (spin.settle > 0) {
        spin.settle += dt / 0.4;
        var k = Math.min(1, spin.settle);
        rot = spin.from + spin.total + spin.bounce * (1 - (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2));
        if (k >= 1) finishSpin();
      } else {
        spin.t += dt / spin.dur;
        var e = easeOutQuart(Math.min(1, spin.t));
        rot = spin.from + (spin.total + spin.bounce) * e;
        if (spin.t >= 1) spin.settle = 0.0001;
      }
    } else if (pilot === 'title' || (pilot === 'idle' && resultIdx < 0)) {
      rot += dt * 0.25;
    }

    // Flapper ticks when a segment edge passes the pointer.
    var idx = Math.floor((((-rot) % TAU) + TAU) % TAU / SEG);
    if (idx !== lastIdx) {
      if (lastIdx >= 0 && spin) {
        flap = 1;
        PA.audio.play('tick');
      }
      lastIdx = idx;
    }
    flap = Math.max(0, flap - dt * 7);

    if (resultIdx >= 0) {
      resultT += dt;
      winGlow = 0.5 + 0.5 * Math.sin(time * 8);
      if (resultT >= 0.7 && resultT - dt < 0.7) {
        if (pilot === 'player' || pilot === 'demo') reportResult();
      }
      if (pilot === 'title' && resultT > 1.5) resultIdx = -1;
    }

    if (pilot === 'demo' && !spin && resultIdx < 0) {
      demoT -= dt;
      if (demoT <= 0) startSpin();
    }
  }

  // ------------------------------------------------------------------ drawing
  function draw() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    // Spotlight behind the wheel.
    var g = ctx.createRadialGradient(cx, cy, R * 0.2, cx, cy, R * 1.9);
    g.addColorStop(0, PA.rgba(COL.secondary, 0.22));
    g.addColorStop(1, PA.rgba(COL.secondary, 0));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    // Outer rim with chasing lights.
    var rim = R * 0.13;
    ctx.fillStyle = PA.mix(COL.primary, '#000000', 0.25);
    ctx.beginPath();
    ctx.arc(cx, cy + 6, R + rim, 0, TAU);
    ctx.fill();
    var rimG = ctx.createLinearGradient(0, cy - R - rim, 0, cy + R + rim);
    rimG.addColorStop(0, PA.mix(COL.primary, '#ffffff', 0.25));
    rimG.addColorStop(1, PA.mix(COL.primary, '#000000', 0.15));
    ctx.fillStyle = rimG;
    ctx.beginPath();
    ctx.arc(cx, cy, R + rim, 0, TAU);
    ctx.fill();
    var n = cfg.lights || 24;
    var speed = spin ? 14 : 3;
    var phase = Math.floor(time * speed);
    for (var i = 0; i < n; i++) {
      var a = (i / n) * TAU;
      var on = (i + phase) % 2 === 0;
      if (resultIdx >= 0) on = Math.floor(time * 6) % 2 === 0;
      var lx = cx + Math.cos(a) * (R + rim * 0.52);
      var ly = cy + Math.sin(a) * (R + rim * 0.52);
      var lr = Math.max(3, rim * 0.22);
      if (on) {
        var lg = ctx.createRadialGradient(lx, ly, 0, lx, ly, lr * 3);
        lg.addColorStop(0, PA.rgba(COL.secondary, 0.9));
        lg.addColorStop(1, PA.rgba(COL.secondary, 0));
        ctx.fillStyle = lg;
        ctx.beginPath();
        ctx.arc(lx, ly, lr * 3, 0, TAU);
        ctx.fill();
      }
      ctx.fillStyle = on ? '#fffbe8' : PA.mix(COL.secondary, '#000000', 0.45);
      ctx.beginPath();
      ctx.arc(lx, ly, lr, 0, TAU);
      ctx.fill();
    }

    // Wheel disc.
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rot);
    if (disc) ctx.drawImage(disc, -R, -R, R * 2, R * 2);
    if (resultIdx >= 0) {
      var a0 = -Math.PI / 2 + resultIdx * SEG;
      ctx.fillStyle = 'rgba(255,255,255,' + (0.15 + 0.25 * winGlow).toFixed(3) + ')';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, R, a0, a0 + SEG);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    // Hub.
    var hr = R * 0.2;
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.arc(cx, cy + 4, hr, 0, TAU);
    ctx.fill();
    ctx.fillStyle = COL.secondary;
    ctx.beginPath();
    ctx.arc(cx, cy, hr, 0, TAU);
    ctx.fill();
    ctx.fillStyle = COL.primary;
    ctx.beginPath();
    ctx.arc(cx, cy, hr * 0.8, 0, TAU);
    ctx.fill();
    var logo = icons.__logo;
    if (logo) ctx.drawImage(logo, cx - hr * 0.55, cy - hr * 0.55, hr * 1.1, hr * 1.1);

    // Pointer (flapper) at the top.
    ctx.save();
    ctx.translate(cx, cy - R - rim * 0.35);
    ctx.rotate(-flap * 0.45);
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.moveTo(-R * 0.08, -R * 0.06 + 3);
    ctx.lineTo(R * 0.08, -R * 0.06 + 3);
    ctx.lineTo(0, R * 0.13 + 3);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(-R * 0.085, -R * 0.07);
    ctx.lineTo(R * 0.085, -R * 0.07);
    ctx.lineTo(0, R * 0.13);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = COL.secondary;
    ctx.beginPath();
    ctx.moveTo(-R * 0.06, -R * 0.05);
    ctx.lineTo(R * 0.06, -R * 0.05);
    ctx.lineTo(0, R * 0.1);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function renderButton() {
    var show = PA.screen() === 'playing' && !spin && resultIdx < 0 && pilot === 'player';
    spinBtn.hidden = !show;
    spinBtn.disabled = !canSpin();
  }

  var last = 0;
  function frame(ts) {
    var dt = last ? Math.min(0.05, Math.max(0, (ts - last) / 1000)) : 1 / 60;
    last = ts;
    update(dt);
    draw();
    renderButton();
    requestAnimationFrame(frame);
  }

  // ------------------------------------------------------------------ input
  canvas.addEventListener('pointerdown', function (e) {
    if (pilot !== 'player' || PA.screen() !== 'playing') return;
    var dx = e.clientX - cx, dy = e.clientY - cy;
    if (dx * dx + dy * dy <= (R * 1.15) * (R * 1.15)) startSpin();
  });
  window.addEventListener('keydown', function (e) {
    if ((e.key === ' ' || e.key === 'Enter') && pilot === 'player' && PA.screen() === 'playing') {
      var tag = e.target && e.target.tagName;
      if (tag === 'BUTTON' || tag === 'INPUT' || tag === 'A') return;
      e.preventDefault();
      startSpin();
    }
  });
  window.addEventListener('resize', resize);

  // ------------------------------------------------------------------ boot
  function loadIcons(cb) {
    var keys = [];
    SEGS.forEach(function (s) { if (s.icon && keys.indexOf(s.icon) < 0) keys.push(s.icon); });
    var pending = keys.length + 1;
    function done() { if (--pending === 0) cb(); }
    keys.forEach(function (k) {
      var img = new Image();
      img.onload = function () { icons[k] = img; done(); };
      img.onerror = done;
      img.src = PA.iconURL(k);
    });
    var logo = new Image();
    logo.onload = function () { icons.__logo = logo; done(); };
    logo.onerror = done;
    logo.src = PA.brand.logoImage || PA.iconURL(PA.brand.logoIcon || 'star');
  }

  loadIcons(function () {
    resize();
    PA.mountGame({
      id: 'spin-win',
      title: TX.title || 'Spin & Win',
      tag: TX.tag,
      howTo: TX.howTo,
      limitText: TX.limitText,
      start: function () {
        pilot = PA.demo ? 'demo' : 'player';
        paused = false;
        spin = null;
        resultIdx = -1;
        demoT = 0.9;
      },
      pause: function () { paused = true; },
      resume: function () { paused = false; },
      stop: function () { pilot = 'title'; spin = null; resultIdx = -1; },
      canStart: canSpin,
      forceEnd: function () {
        if (resultIdx >= 0) return;
        if (!spin) {
          var index = pickIndex();
          spin = { from: rot, total: rotationFor(index, rot), bounce: 0, t: 1, dur: 1, settle: 0, index: index };
        }
        finishSpin();
        reportResult();
      },
      state: function () {
        return {
          spinning: !!spin,
          lastPrize: lastPrize >= 0 ? (SEGS[lastPrize].title || SEGS[lastPrize].label) : null,
          spinsLeft: SW.spinsPerDay ? Math.max(0, SW.spinsPerDay - spinsUsed()) : null
        };
      },
      actions: { spin: startSpin }
    });
    requestAnimationFrame(frame);
  });
})();
