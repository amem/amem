/*
 * js/scratch.js — scratch-off foil drawn on a canvas over any element.
 *
 *   var card = BrandKit.scratchCard(hostElement, { onReveal: fn, threshold: 0.5, label: 'Scratch here' });
 *   card.reset();          // fresh foil
 *   card.reveal();         // remove the foil now (keyboard / "Reveal it all")
 *   card.autoScratch(1.4); // demo bot: scratches a zig-zag path, then reveals
 *
 * The foil is drawn with paths only (no images), so reading its pixels to measure progress
 * works everywhere, including from file://.
 */
(function () {
  'use strict';
  var KIT = window.BrandKit;
  var C = KIT.colors;
  var mix = KIT.color.mix;
  var HEADING_FONT = getComputedStyle(document.documentElement).getPropertyValue('--f-heading') || 'sans-serif';

  KIT.scratchCard = function (host, opts) {
    opts = opts || {};
    var threshold = opts.threshold || 0.5;
    var foil = document.createElement('canvas');
    foil.className = 'sc-foil';
    var dust = document.createElement('canvas');
    dust.className = 'sc-dust';
    dust.setAttribute('aria-hidden', 'true');
    foil.setAttribute('aria-hidden', 'true');
    host.appendChild(foil);
    host.appendChild(dust);
    var ctx = foil.getContext('2d', { willReadFrequently: true });
    var dctx = dust.getContext('2d');
    var w = 1, h = 1, dpr = 1, brush = 24;
    var done = false, touched = false, last = null, pointerId = null;
    var checkAt = 0, soundAt = 0;
    var flakes = [], dustRunning = false;
    var auto = null;

    function seeded(seed) {
      return function () { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    }

    function paint() {
      var r = host.getBoundingClientRect();
      w = Math.max(1, r.width);
      h = Math.max(1, r.height);
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      [foil, dust].forEach(function (c) { c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); });
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      dctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      brush = Math.max(24, Math.min(w, h) * 0.17);
      ctx.globalCompositeOperation = 'source-over';
      // Metallic silver with diagonal sheen.
      var g = ctx.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, '#d9dde3');
      g.addColorStop(0.35, '#f4f6f8');
      g.addColorStop(0.55, '#b9bfc9');
      g.addColorStop(0.8, '#e7eaee');
      g.addColorStop(1, '#a9b0bb');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.lineWidth = 2;
      for (var x = -h; x < w; x += 9) {
        ctx.beginPath();
        ctx.moveTo(x, h);
        ctx.lineTo(x + h, 0);
        ctx.stroke();
      }
      // Brand-coloured sparkles.
      var rnd = seeded(11);
      var cols = [C.primary, C.accent, C.secondary];
      for (var i = 0; i < Math.round(w * h / 1400); i++) {
        var sx = rnd() * w, sy = rnd() * h, s = 3 + rnd() * 5;
        ctx.fillStyle = cols[i % 3];
        ctx.globalAlpha = 0.45;
        ctx.beginPath();
        ctx.moveTo(sx, sy - s); ctx.lineTo(sx + s * 0.3, sy - s * 0.3); ctx.lineTo(sx + s, sy);
        ctx.lineTo(sx + s * 0.3, sy + s * 0.3); ctx.lineTo(sx, sy + s); ctx.lineTo(sx - s * 0.3, sy + s * 0.3);
        ctx.lineTo(sx - s, sy); ctx.lineTo(sx - s * 0.3, sy - s * 0.3);
        ctx.closePath();
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      // Label pill.
      var label = opts.label || 'Scratch here';
      var fs = Math.max(13, Math.min(w * 0.075, h * 0.12, 24));
      ctx.font = '800 ' + Math.round(fs) + 'px ' + HEADING_FONT;
      var tw = ctx.measureText(label).width;
      var pw = tw + fs * 3.2, ph = fs * 2.2;
      var px = (w - pw) / 2, py = (h - ph) / 2;
      ctx.fillStyle = C.deep;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(px, py, pw, ph, ph / 2); else ctx.rect(px, py, pw, ph);
      ctx.fill();
      // Coin icon.
      var cx = px + fs * 1.15, cy = py + ph / 2;
      ctx.fillStyle = C.accent;
      ctx.beginPath(); ctx.arc(cx, cy, fs * 0.55, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = mix(C.accent, '#000000', 0.3);
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(cx, cy, fs * 0.36, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = KIT.color.onColor(C.deep);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, px + fs * 2.1, cy + 1);
    }

    function scratchLine(a, b) {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = brush;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(b.x, b.y, brush / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
      touched = true;
      var t = performance.now();
      if (t - soundAt > 70) { soundAt = t; KIT.sfx.scratch(); }
      for (var i = 0; i < 2; i++) {
        flakes.push({ x: b.x + (Math.random() - 0.5) * brush, y: b.y, vx: (Math.random() - 0.5) * 80, vy: -Math.random() * 60, life: 0.6, r: 1 + Math.random() * 2.2 });
      }
      if (!dustRunning) { dustRunning = true; requestAnimationFrame(dustFrame); }
      if (t > checkAt) { checkAt = t + 140; if (progress() >= threshold) reveal(); }
    }

    var dustLast = 0;
    function dustFrame(t) {
      var dt = Math.min(0.05, (t - (dustLast || t)) / 1000);
      dustLast = t;
      dctx.clearRect(0, 0, w, h);
      flakes = flakes.filter(function (f) {
        f.life -= dt;
        f.vy += 500 * dt;
        f.x += f.vx * dt;
        f.y += f.vy * dt;
        if (f.life <= 0) return false;
        dctx.globalAlpha = Math.min(1, f.life * 3);
        dctx.fillStyle = '#c3c8d0';
        dctx.fillRect(f.x, f.y, f.r, f.r);
        return true;
      });
      dctx.globalAlpha = 1;
      if (flakes.length) requestAnimationFrame(dustFrame);
      else { dustRunning = false; dustLast = 0; dctx.clearRect(0, 0, w, h); }
    }

    /** Share of the foil already scratched away (0–1), sampled on a coarse grid. */
    function progress() {
      var data = ctx.getImageData(0, 0, foil.width, foil.height).data;
      var step = Math.max(4, Math.round(8 * dpr));
      var clear = 0, total = 0;
      for (var y = 0; y < foil.height; y += step) {
        for (var x = 0; x < foil.width; x += step) {
          total++;
          if (data[(y * foil.width + x) * 4 + 3] < 128) clear++;
        }
      }
      return total ? clear / total : 0;
    }

    function point(e) {
      var r = foil.getBoundingClientRect();
      return { x: (e.clientX - r.left) * (w / r.width), y: (e.clientY - r.top) * (h / r.height) };
    }

    function reveal() {
      if (done) return;
      done = true;
      auto = null;
      foil.classList.add('is-gone');
      if (opts.onReveal) opts.onReveal();
    }

    foil.addEventListener('pointerdown', function (e) {
      if (done || (opts.canScratch && !opts.canScratch())) return;
      e.preventDefault();
      pointerId = e.pointerId;
      try { foil.setPointerCapture(e.pointerId); } catch (err) { /* not supported */ }
      last = point(e);
      scratchLine(last, { x: last.x + 0.1, y: last.y });
      if (opts.onStart) opts.onStart();
    });
    foil.addEventListener('pointermove', function (e) {
      if (done || last === null || e.pointerId !== pointerId) return;
      var p = point(e);
      scratchLine(last, p);
      last = p;
    });
    var end = function () { last = null; pointerId = null; };
    foil.addEventListener('pointerup', end);
    foil.addEventListener('pointercancel', end);

    function autoScratch(seconds) {
      var dur = (seconds || 1.4) * 1000;
      var t0 = performance.now();
      var rows = 5;
      var prev = null;
      var token = auto = {};
      (function step(t) {
        if (done || auto !== token) return;
        var k = Math.min(1, (t - t0) / dur);
        var row = Math.min(rows - 1, Math.floor(k * rows));
        var within = k * rows - row;
        var x = row % 2 ? w * (0.95 - within * 0.9) : w * (0.05 + within * 0.9);
        var y = h * (0.12 + row * (0.76 / (rows - 1))) + Math.sin(within * Math.PI * 3) * h * 0.04;
        var p = { x: x, y: y };
        if (prev) scratchLine(prev, p);
        prev = p;
        if (k < 1) requestAnimationFrame(step);
        else reveal();
      })(t0);
    }

    function reset() {
      done = false;
      touched = false;
      auto = null;
      last = null;
      flakes = [];
      foil.classList.remove('is-gone');
      paint();
    }

    window.addEventListener('resize', function () { if (!done && !touched) paint(); });
    reset();

    return {
      reset: reset,
      reveal: reveal,
      autoScratch: autoScratch,
      isDone: function () { return done; },
      progress: progress
    };
  };
})();
