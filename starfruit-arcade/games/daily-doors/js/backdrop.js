/*
 * js/backdrop.js — gentle animated background behind the calendar and the scratch card.
 *   BrandKit.backdrop(canvas, 'snow' | 'stars' | 'confetti' | 'none')
 * Still frame (no animation) when the visitor prefers reduced motion.
 */
(function () {
  'use strict';
  var KIT = window.BrandKit;
  var C = KIT.colors;

  KIT.backdrop = function (canvas, kind) {
    if (!canvas || !kind || kind === 'none') return;
    var ctx = canvas.getContext('2d');
    var w = 1, h = 1, dpr = 1;
    var parts = [];
    var colors = [C.primary, C.accent, C.secondary, '#ffffff'];

    function make(initial) {
      var p = {
        x: Math.random() * w,
        y: initial ? Math.random() * h : -10,
        r: kind === 'stars' ? 0.6 + Math.random() * 1.8 : 1 + Math.random() * 2.6,
        vy: kind === 'stars' ? 0 : 14 + Math.random() * 30,
        sway: Math.random() * 6.28,
        tw: Math.random() * 6.28,
        color: colors[(Math.random() * colors.length) | 0],
        rot: Math.random() * 6.28
      };
      if (kind === 'confetti') p.vy *= 0.8;
      return p;
    }

    function resize() {
      var r = canvas.getBoundingClientRect();
      w = Math.max(1, r.width);
      h = Math.max(1, r.height);
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      var n = Math.round(Math.min(140, (w * h) / (kind === 'stars' ? 6000 : 9000)));
      parts = [];
      for (var i = 0; i < n; i++) parts.push(make(true));
    }

    function draw(dt, t) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      for (var i = 0; i < parts.length; i++) {
        var p = parts[i];
        p.y += p.vy * dt;
        p.x += Math.sin(t * 0.8 + p.sway) * 12 * dt;
        p.rot += dt;
        if (p.y > h + 10) parts[i] = make(false);
        if (kind === 'snow') {
          ctx.globalAlpha = 0.75;
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fill();
        } else if (kind === 'stars') {
          ctx.globalAlpha = 0.35 + 0.45 * (0.5 + 0.5 * Math.sin(t * 2 + p.tw));
          ctx.fillStyle = i % 5 ? '#ffffff' : C.accent;
          ctx.fillRect(p.x - p.r, p.y - p.r * 0.2, p.r * 2, p.r * 0.4);
          ctx.fillRect(p.x - p.r * 0.2, p.y - p.r, p.r * 0.4, p.r * 2);
        } else {
          ctx.globalAlpha = 0.55;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.r * 1.4, -p.r * 0.7, p.r * 2.8, p.r * 1.4);
          ctx.restore();
        }
      }
      ctx.globalAlpha = 1;
    }

    window.addEventListener('resize', resize);
    resize();
    if (KIT.reducedMotion) { draw(0, 0); return; }
    KIT.loop(function (dt, t) { draw(dt, t); });
  };
})();
