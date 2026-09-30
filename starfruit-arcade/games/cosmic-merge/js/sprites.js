/*
 * sprites.js — procedural planet sprites.
 * Every tier is painted once into offscreen canvases at the exact on-screen pixel size
 * (rebuilt on resize), so drawing a body per frame is just a few drawImage calls.
 *
 * Layers per tier:
 *   surface  — the planet itself (rotates when the body rolls)
 *   faces[]  — cute face states: 0 normal, 1 blink, 2 surprised, 3 happy (rotate with the body)
 *   shade    — fixed lighting: soft shadow, rim light, specular, outline (never rotates)
 *   glow     — optional halo drawn behind the body (Sun, Black Hole)
 *   fx       — optional animated overlay (Sun rays, Black Hole swirl)
 *
 * RESKIN WITH IMAGES: set `image: 'img/your-file.png'` on a tier in config.js and
 * paintImage() below draws it (cropped to a circle) instead of the procedural painter.
 * To change a procedural look, edit the matching function in PAINTERS.
 */
(function () {
  'use strict';

  var G = window.__GAME__;
  var cfg = window.GAME_CONFIG;
  var TAU = Math.PI * 2;

  var EXTENT = { saturn: 1.3, uranus: 1.12 };           // how far a painter draws beyond the radius
  var FACE_Y = { saturn: -0.14, jupiter: -0.12, blackhole: -0.06, earth: 0.02 };
  var EMISSIVE = { sun: true, blackhole: true };         // no shade layer (they glow)
  var LIGHT_FACE = { blackhole: true };                  // light-coloured face on dark bodies

  // ---------- helpers ----------
  function canvas(w, h) {
    var c = document.createElement('canvas');
    c.width = Math.max(1, Math.ceil(w));
    c.height = Math.max(1, Math.ceil(h || w));
    return c;
  }

  function rng(seed) {
    var s = seed >>> 0;
    return function () {
      s = (s + 0x6d2b79f5) >>> 0;
      var t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function hexToRgb(hex) {
    var h = String(hex).replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var n = parseInt(h, 16) || 0;
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  function rgba(hex, a) {
    var c = hexToRgb(hex);
    return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')';
  }

  function mix(a, b, t) {
    var x = hexToRgb(a), y = hexToRgb(b);
    return 'rgb(' + Math.round(x[0] + (y[0] - x[0]) * t) + ',' + Math.round(x[1] + (y[1] - x[1]) * t) + ',' +
      Math.round(x[2] + (y[2] - x[2]) * t) + ')';
  }

  function circle(ctx, x, y, r) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
  }

  function clipUnit(ctx) {
    circle(ctx, 0, 0, 1);
    ctx.clip();
  }

  // Shaded sphere base: light top-left → base → dark edge.
  function ball(ctx, c) {
    var g = ctx.createRadialGradient(-0.35, -0.4, 0.05, 0, 0, 1);
    g.addColorStop(0, c.light);
    g.addColorStop(0.45, c.base);
    g.addColorStop(1, c.dark);
    ctx.fillStyle = g;
    circle(ctx, 0, 0, 1);
    ctx.fill();
  }

  // Organic blob (continents, patches).
  function blob(ctx, rnd, x, y, s, n) {
    var pts = [];
    for (var i = 0; i < n; i++) {
      var a = (i / n) * TAU;
      var rr = s * (0.65 + rnd() * 0.55);
      pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr * (0.75 + rnd() * 0.3)]);
    }
    ctx.beginPath();
    var last = pts[n - 1];
    ctx.moveTo((last[0] + pts[0][0]) / 2, (last[1] + pts[0][1]) / 2);
    for (var j = 0; j < n; j++) {
      var p = pts[j], q = pts[(j + 1) % n];
      ctx.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2);
    }
    ctx.closePath();
  }

  function crater(ctx, x, y, s, c, alpha) {
    ctx.globalAlpha = alpha;
    ctx.fillStyle = c.dark;
    circle(ctx, x, y, s);
    ctx.fill();
    ctx.fillStyle = mix(c.base, c.dark, 0.25);
    circle(ctx, x + s * 0.2, y + s * 0.22, s * 0.8);
    ctx.fill();
    ctx.strokeStyle = rgba(c.light, 0.7);
    ctx.lineWidth = s * 0.16;
    ctx.beginPath();
    ctx.arc(x, y, s * 1.02, Math.PI * 0.95, Math.PI * 1.6);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  function speckle(ctx, rnd, n, color, alpha, maxR) {
    ctx.fillStyle = color;
    for (var i = 0; i < n; i++) {
      var a = rnd() * TAU, d = Math.sqrt(rnd()) * 0.98;
      ctx.globalAlpha = alpha * (0.4 + rnd() * 0.6);
      circle(ctx, Math.cos(a) * d, Math.sin(a) * d, maxR * (0.3 + rnd() * 0.7));
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function wavyBand(ctx, y, amp, freq, phase, width, color) {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    for (var x = -1.15; x <= 1.15; x += 0.05) {
      var yy = y + Math.sin(x * freq + phase) * amp;
      if (x === -1.15) ctx.moveTo(x, yy);
      else ctx.lineTo(x, yy);
    }
    ctx.stroke();
  }

  // Draw an elliptical ring, either the back half (behind the planet) or the front half.
  function ringHalf(ctx, rot, front, draw) {
    ctx.save();
    ctx.rotate(rot);
    ctx.beginPath();
    if (front) ctx.rect(-2, 0, 4, 2);
    else ctx.rect(-2, -2, 4, 2);
    ctx.clip();
    draw();
    ctx.restore();
  }

  function ellipse(ctx, rx, ry) {
    ctx.beginPath();
    ctx.ellipse(0, 0, rx, ry, 0, 0, TAU);
  }

  // ---------- painters (unit space: radius 1, origin at the centre) ----------
  var PAINTERS = {
    asteroid: function (ctx, c, rnd) {
      ball(ctx, c);
      ctx.save();
      clipUnit(ctx);
      speckle(ctx, rnd, 50, c.dark, 0.35, 0.05);
      speckle(ctx, rnd, 30, c.light, 0.25, 0.04);
      var spots = [[-0.38, -0.3, 0.26], [0.38, 0.1, 0.22], [-0.1, 0.48, 0.18], [0.2, -0.52, 0.13], [-0.62, 0.25, 0.12]];
      for (var i = 0; i < spots.length; i++) crater(ctx, spots[i][0], spots[i][1], spots[i][2], c, 0.85);
      ctx.restore();
    },

    moon: function (ctx, c, rnd) {
      ball(ctx, c);
      ctx.save();
      clipUnit(ctx);
      ctx.fillStyle = rgba(c.accent, 0.55);
      blob(ctx, rnd, -0.3, -0.25, 0.32, 7); ctx.fill();
      blob(ctx, rnd, 0.35, 0.3, 0.26, 7); ctx.fill();
      blob(ctx, rnd, 0.3, -0.45, 0.15, 6); ctx.fill();
      speckle(ctx, rnd, 30, c.dark, 0.18, 0.035);
      var spots = [[0.45, -0.1, 0.12], [-0.45, 0.4, 0.14], [0.05, 0.6, 0.1], [-0.1, -0.65, 0.09], [0.62, 0.45, 0.08]];
      for (var i = 0; i < spots.length; i++) crater(ctx, spots[i][0], spots[i][1], spots[i][2], c, 0.6);
      ctx.restore();
    },

    mars: function (ctx, c, rnd) {
      ball(ctx, c);
      ctx.save();
      clipUnit(ctx);
      ctx.fillStyle = rgba(c.dark, 0.42);
      blob(ctx, rnd, -0.35, 0.15, 0.3, 8); ctx.fill();
      blob(ctx, rnd, 0.45, -0.2, 0.22, 7); ctx.fill();
      blob(ctx, rnd, 0.1, 0.62, 0.25, 7); ctx.fill();
      ctx.fillStyle = rgba(c.light, 0.35);
      blob(ctx, rnd, 0.15, -0.1, 0.25, 7); ctx.fill();
      blob(ctx, rnd, -0.5, -0.45, 0.18, 6); ctx.fill();
      ctx.strokeStyle = rgba(c.dark, 0.5);
      ctx.lineWidth = 0.06;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-0.55, 0.35);
      ctx.quadraticCurveTo(0, 0.18, 0.5, 0.38);
      ctx.stroke();
      speckle(ctx, rnd, 30, c.dark, 0.2, 0.04);
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.beginPath();
      ctx.ellipse(0, -0.97, 0.5, 0.2, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.beginPath();
      ctx.ellipse(0.05, 0.99, 0.36, 0.12, 0, 0, TAU);
      ctx.fill();
      ctx.restore();
    },

    venus: function (ctx, c, rnd) {
      ball(ctx, c);
      ctx.save();
      clipUnit(ctx);
      ctx.lineCap = 'round';
      for (var k = 0; k < 9; k++) {
        var y = -1 + k * 0.25 + (rnd() - 0.5) * 0.06;
        wavyBand(ctx, y, 0.07 + rnd() * 0.05, 2 + rnd() * 1.5, rnd() * 6, 0.07 + rnd() * 0.08,
          k % 2 ? rgba(c.light, 0.4) : rgba(c.accent, 0.45));
      }
      ctx.strokeStyle = rgba(c.light, 0.5);
      ctx.lineWidth = 0.06;
      ctx.beginPath();
      for (var a = 0; a < 9; a += 0.2) {
        var rr = 0.03 + a * 0.028;
        var x = 0.42 + Math.cos(a) * rr, yy = 0.3 + Math.sin(a) * rr * 0.7;
        if (a === 0) ctx.moveTo(x, yy);
        else ctx.lineTo(x, yy);
      }
      ctx.stroke();
      ctx.restore();
    },

    earth: function (ctx, c, rnd) {
      var g = ctx.createRadialGradient(-0.3, -0.35, 0.05, 0, 0, 1);
      g.addColorStop(0, c.light);
      g.addColorStop(0.5, c.base);
      g.addColorStop(1, c.dark);
      ctx.fillStyle = g;
      circle(ctx, 0, 0, 1);
      ctx.fill();
      ctx.save();
      clipUnit(ctx);
      var land = [[-0.45, -0.25, 0.36], [0.4, 0.28, 0.32], [0.25, -0.55, 0.2], [-0.35, 0.6, 0.2], [0.85, -0.35, 0.18]];
      for (var i = 0; i < land.length; i++) {
        var l = land[i];
        ctx.fillStyle = mix(c.accent, '#1d7a3e', 0.35);
        blob(ctx, rnd, l[0] + 0.02, l[1] + 0.03, l[2], 9); ctx.fill();
        ctx.fillStyle = c.accent;
        blob(ctx, rnd, l[0], l[1], l[2] * 0.9, 9); ctx.fill();
        ctx.fillStyle = 'rgba(214,236,140,0.55)';
        blob(ctx, rnd, l[0] - l[2] * 0.2, l[1] - l[2] * 0.2, l[2] * 0.4, 6); ctx.fill();
      }
      ctx.strokeStyle = 'rgba(255,255,255,0.78)';
      ctx.lineCap = 'round';
      var clouds = [[-0.7, -0.62, 0.5], [0.0, 0.05, 0.6], [-0.3, 0.42, 0.45], [0.35, -0.15, 0.35], [0.2, 0.75, 0.4]];
      for (var j = 0; j < clouds.length; j++) {
        var cl = clouds[j];
        ctx.lineWidth = 0.07 + rnd() * 0.04;
        ctx.beginPath();
        ctx.moveTo(cl[0], cl[1]);
        ctx.bezierCurveTo(cl[0] + cl[2] * 0.3, cl[1] - 0.1, cl[0] + cl[2] * 0.7, cl[1] + 0.08, cl[0] + cl[2], cl[1] - 0.03);
        ctx.stroke();
      }
      ctx.fillStyle = 'rgba(255,255,255,0.92)';
      ctx.beginPath();
      ctx.ellipse(0, -1.0, 0.55, 0.2, 0, 0, TAU);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(0, 1.0, 0.5, 0.16, 0, 0, TAU);
      ctx.fill();
      ctx.restore();
    },

    neptune: function (ctx, c, rnd) {
      ball(ctx, c);
      ctx.save();
      clipUnit(ctx);
      for (var k = 0; k < 7; k++) {
        ctx.fillStyle = k % 2 ? rgba(c.dark, 0.25) : rgba(c.light, 0.16);
        ctx.fillRect(-1, -1 + k * 0.3, 2, 0.16);
      }
      ctx.strokeStyle = rgba(c.accent, 0.7);
      ctx.lineCap = 'round';
      var st = [[-0.6, -0.35, 0.45], [0.1, 0.5, 0.5], [0.2, -0.62, 0.3], [-0.5, 0.3, 0.25]];
      for (var i = 0; i < st.length; i++) {
        ctx.lineWidth = 0.04 + rnd() * 0.03;
        ctx.beginPath();
        ctx.moveTo(st[i][0], st[i][1]);
        ctx.quadraticCurveTo(st[i][0] + st[i][2] / 2, st[i][1] - 0.05, st[i][0] + st[i][2], st[i][1]);
        ctx.stroke();
      }
      ctx.fillStyle = rgba(c.dark, 0.75);
      ctx.beginPath();
      ctx.ellipse(0.42, 0.22, 0.2, 0.11, -0.15, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = rgba(c.accent, 0.8);
      ctx.lineWidth = 0.035;
      ctx.beginPath();
      ctx.ellipse(0.44, 0.36, 0.14, 0.04, -0.1, 0, Math.PI);
      ctx.stroke();
      ctx.restore();
    },

    uranus: function (ctx, c) {
      var tilt = 1.2;
      function ring() {
        ctx.strokeStyle = rgba(c.accent, 0.6);
        ctx.lineWidth = 0.035;
        ellipse(ctx, 1.1, 0.26); ctx.stroke();
        ctx.strokeStyle = rgba('#ffffff', 0.35);
        ctx.lineWidth = 0.015;
        ellipse(ctx, 1.03, 0.235); ctx.stroke();
      }
      ringHalf(ctx, tilt, false, ring);
      ball(ctx, c);
      ctx.save();
      clipUnit(ctx);
      for (var k = 0; k < 5; k++) {
        ctx.fillStyle = k % 2 ? rgba(c.light, 0.14) : rgba(c.dark, 0.1);
        ctx.fillRect(-1, -0.95 + k * 0.4, 2, 0.22);
      }
      ctx.fillStyle = rgba(c.light, 0.3);
      ctx.beginPath();
      ctx.ellipse(-0.1, -0.72, 0.5, 0.2, 0, 0, TAU);
      ctx.fill();
      ctx.restore();
      ringHalf(ctx, tilt, true, ring);
    },

    saturn: function (ctx, c) {
      var tilt = -0.22;
      function rings() {
        var bands = [[1.08, c.dark, 0.5], [1.13, c.accent, 0.9], [1.18, c.light, 0.85], [1.215, c.dark, 0.35],
          [1.25, c.accent, 0.85], [1.285, c.light, 0.55]];
        for (var i = 0; i < bands.length; i++) {
          ctx.strokeStyle = rgba(bands[i][1], bands[i][2]);
          ctx.lineWidth = 0.04;
          ellipse(ctx, bands[i][0], bands[i][0] * 0.27);
          ctx.stroke();
        }
      }
      ringHalf(ctx, tilt, false, rings);
      ball(ctx, c);
      ctx.save();
      clipUnit(ctx);
      ctx.rotate(tilt);
      var cols = [c.light, c.accent, c.dark, c.light, c.accent, c.dark, c.light];
      for (var k = 0; k < 9; k++) {
        ctx.fillStyle = rgba(cols[k % cols.length], k % 3 === 2 ? 0.28 : 0.35);
        ctx.fillRect(-1.2, -1 + k * 0.23, 2.4, 0.12);
      }
      ctx.fillStyle = 'rgba(40,20,0,0.3)';
      ctx.beginPath();
      ctx.ellipse(0, 0.02, 1.3, 0.34, 0, 0, Math.PI);
      ctx.ellipse(0, 0.02, 1.08, 0.27, 0, Math.PI, 0, true);
      ctx.fill();
      ctx.restore();
      ringHalf(ctx, tilt, true, rings);
    },

    jupiter: function (ctx, c, rnd) {
      ball(ctx, c);
      ctx.save();
      clipUnit(ctx);
      ctx.lineCap = 'butt';
      var cols = [c.light, c.dark, c.light, c.base, c.dark, c.light, c.dark, c.light];
      for (var k = 0; k < 8; k++) {
        wavyBand(ctx, -0.92 + k * 0.26, 0.025, 7 + rnd() * 4, rnd() * 6, 0.12 + rnd() * 0.05,
          rgba(cols[k], k % 2 ? 0.5 : 0.55));
      }
      ctx.strokeStyle = rgba(c.light, 0.35);
      ctx.lineWidth = 0.025;
      for (var s = 0; s < 6; s++) {
        var y = -0.8 + rnd() * 1.6, x = -0.8 + rnd() * 1.2;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.quadraticCurveTo(x + 0.15, y - 0.05, x + 0.3, y);
        ctx.stroke();
      }
      ctx.fillStyle = rgba(c.light, 0.75);
      ctx.beginPath();
      ctx.ellipse(0.36, 0.44, 0.26, 0.15, -0.1, 0, TAU);
      ctx.fill();
      ctx.fillStyle = c.accent;
      ctx.beginPath();
      ctx.ellipse(0.36, 0.44, 0.2, 0.11, -0.1, 0, TAU);
      ctx.fill();
      ctx.fillStyle = rgba('#ffffff', 0.25);
      ctx.beginPath();
      ctx.ellipse(0.32, 0.41, 0.09, 0.04, -0.1, 0, TAU);
      ctx.fill();
      ctx.restore();
    },

    sun: function (ctx, c, rnd) {
      var g = ctx.createRadialGradient(-0.15, -0.2, 0.05, 0, 0, 1);
      g.addColorStop(0, c.light);
      g.addColorStop(0.55, c.base);
      g.addColorStop(0.9, c.dark);
      g.addColorStop(1, mix(c.dark, '#d9480f', 0.4));
      ctx.fillStyle = g;
      circle(ctx, 0, 0, 1);
      ctx.fill();
      ctx.save();
      clipUnit(ctx);
      speckle(ctx, rnd, 90, c.light, 0.3, 0.07);
      speckle(ctx, rnd, 50, c.dark, 0.16, 0.06);
      ctx.strokeStyle = rgba(c.accent, 0.5);
      ctx.lineWidth = 0.05;
      ctx.lineCap = 'round';
      for (var i = 0; i < 7; i++) {
        var a = rnd() * TAU, d = 0.35 + rnd() * 0.45;
        ctx.beginPath();
        ctx.arc(Math.cos(a) * d, Math.sin(a) * d, 0.1 + rnd() * 0.12, a, a + 1.6);
        ctx.stroke();
      }
      ctx.restore();
    },

    blackhole: function (ctx, c) {
      var haze = ctx.createRadialGradient(0, 0, 0.3, 0, 0, 1);
      haze.addColorStop(0, '#000000');
      haze.addColorStop(0.5, c.base);
      haze.addColorStop(0.82, rgba(c.accent, 0.55));
      haze.addColorStop(1, rgba(c.accent, 0.9));
      ctx.fillStyle = haze;
      circle(ctx, 0, 0, 1);
      ctx.fill();
      var tilt = -0.18;
      function disk() {
        var lg = ctx.createLinearGradient(-1, 0, 1, 0);
        lg.addColorStop(0, rgba(c.accent, 0.9));
        lg.addColorStop(0.35, c.dark);
        lg.addColorStop(0.55, c.light);
        lg.addColorStop(1, rgba(c.dark, 0.9));
        ctx.strokeStyle = lg;
        ctx.lineWidth = 0.16;
        ellipse(ctx, 0.8, 0.22); ctx.stroke();
        ctx.strokeStyle = rgba(c.light, 0.9);
        ctx.lineWidth = 0.04;
        ellipse(ctx, 0.74, 0.2); ctx.stroke();
      }
      ringHalf(ctx, tilt, false, disk);
      // gravitationally lensed back of the disk, arching over the horizon
      ctx.save();
      ctx.rotate(tilt);
      ctx.strokeStyle = rgba(c.dark, 0.85);
      ctx.lineWidth = 0.1;
      ctx.beginPath();
      ctx.arc(0, 0, 0.6, Math.PI * 1.05, Math.PI * 1.95);
      ctx.stroke();
      ctx.strokeStyle = rgba(c.light, 0.8);
      ctx.lineWidth = 0.035;
      ctx.beginPath();
      ctx.arc(0, 0, 0.64, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
      ctx.restore();
      // event horizon with a thin photon ring
      ctx.fillStyle = '#000000';
      circle(ctx, 0, 0, 0.5);
      ctx.fill();
      ctx.strokeStyle = rgba(c.light, 0.95);
      ctx.lineWidth = 0.03;
      circle(ctx, 0, 0, 0.515);
      ctx.stroke();
      ringHalf(ctx, tilt, true, disk);
    }
  };

  function paintImage(ctx, img) {
    ctx.save();
    clipUnit(ctx);
    var k = 2 / Math.min(img.width, img.height);
    ctx.drawImage(img, -img.width * k / 2, -img.height * k / 2, img.width * k, img.height * k);
    ctx.restore();
  }

  // ---------- faces ----------
  function drawFace(ctx, kind, col, blush, s) {
    var ex = 0.3 * s, ey = -0.05 * s, er = 0.125 * s;
    ctx.fillStyle = col;
    ctx.strokeStyle = col;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 0.05 * s;
    if (blush) {
      ctx.fillStyle = blush;
      ctx.beginPath();
      ctx.ellipse(-0.52 * s, 0.15 * s, 0.13 * s, 0.075 * s, 0, 0, TAU);
      ctx.ellipse(0.52 * s, 0.15 * s, 0.13 * s, 0.075 * s, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = col;
    }
    for (var side = -1; side <= 1; side += 2) {
      var x = ex * side;
      if (kind === 1) { // blink
        ctx.beginPath();
        ctx.moveTo(x - er, ey);
        ctx.quadraticCurveTo(x, ey + er * 0.7, x + er, ey);
        ctx.stroke();
      } else if (kind === 3) { // happy ^ ^
        ctx.beginPath();
        ctx.moveTo(x - er, ey + er * 0.35);
        ctx.quadraticCurveTo(x, ey - er * 1.1, x + er, ey + er * 0.35);
        ctx.stroke();
      } else {
        var big = kind === 2 ? 1.2 : 1;
        ctx.beginPath();
        ctx.ellipse(x, ey, er * 0.82 * big, er * big, 0, 0, TAU);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.95)';
        circle(ctx, x - er * 0.28, ey - er * 0.38, er * 0.36 * big);
        ctx.fill();
        circle(ctx, x + er * 0.25, ey + er * 0.35, er * 0.14 * big);
        ctx.fill();
        ctx.fillStyle = col;
      }
    }
    if (kind === 2) { // surprised "o"
      ctx.beginPath();
      ctx.ellipse(0, 0.19 * s, 0.07 * s, 0.09 * s, 0, 0, TAU);
      ctx.fill();
    } else if (kind === 3) { // big open smile
      ctx.beginPath();
      ctx.arc(0, 0.1 * s, 0.14 * s, 0, Math.PI);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#ff6f91';
      ctx.beginPath();
      ctx.ellipse(0, 0.2 * s, 0.07 * s, 0.035 * s, 0, 0, TAU);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.arc(0, 0.06 * s, 0.13 * s, Math.PI * 0.2, Math.PI * 0.8);
      ctx.stroke();
    }
  }

  // ---------- fixed lighting layer ----------
  function drawShade(ctx) {
    var g = ctx.createRadialGradient(-0.38, -0.42, 0.02, -0.12, -0.18, 1.32);
    g.addColorStop(0, 'rgba(255,255,255,0.32)');
    g.addColorStop(0.25, 'rgba(255,255,255,0.06)');
    g.addColorStop(0.55, 'rgba(0,0,0,0)');
    g.addColorStop(0.84, 'rgba(14,6,44,0.26)');
    g.addColorStop(1, 'rgba(14,6,44,0.62)');
    ctx.fillStyle = g;
    circle(ctx, 0, 0, 1);
    ctx.fill();
    ctx.save();
    clipUnit(ctx);
    ctx.strokeStyle = 'rgba(160,215,255,0.42)';
    ctx.lineWidth = 0.09;
    ctx.beginPath();
    ctx.arc(0, 0, 0.98, -Math.PI * 0.05, Math.PI * 0.62);
    ctx.stroke();
    ctx.restore();
    var s = ctx.createRadialGradient(-0.42, -0.5, 0, -0.42, -0.5, 0.3);
    s.addColorStop(0, 'rgba(255,255,255,0.6)');
    s.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = s;
    ctx.beginPath();
    ctx.ellipse(-0.42, -0.5, 0.3, 0.2, -0.6, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = 'rgba(16,8,42,0.55)';
    ctx.lineWidth = 0.035;
    circle(ctx, 0, 0, 0.983);
    ctx.stroke();
  }

  // ---------- glows & animated overlays ----------
  function drawGlow(ctx, style, c) {
    var g = ctx.createRadialGradient(0, 0, 0.7, 0, 0, 1.8);
    if (style === 'sun') {
      g.addColorStop(0, rgba(c.accent, 0.7));
      g.addColorStop(0.2, rgba(c.base, 0.38));
      g.addColorStop(0.5, rgba(c.dark, 0.14));
      g.addColorStop(1, rgba(c.dark, 0));
    } else {
      g.addColorStop(0, rgba(c.accent, 0.65));
      g.addColorStop(0.25, rgba(c.accent, 0.3));
      g.addColorStop(0.6, rgba(c.dark, 0.1));
      g.addColorStop(1, rgba(c.accent, 0));
    }
    ctx.fillStyle = g;
    circle(ctx, 0, 0, 1.8);
    ctx.fill();
  }

  function drawSunRays(ctx, c) {
    var n = 14;
    for (var i = 0; i < n; i++) {
      var a = (i / n) * TAU;
      var len = i % 2 ? 1.45 : 1.62;
      ctx.save();
      ctx.rotate(a);
      var g = ctx.createLinearGradient(0.8, 0, len, 0);
      g.addColorStop(0, rgba(c.accent, 0.75));
      g.addColorStop(1, rgba(c.dark, 0));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(0.8, -0.16);
      ctx.quadraticCurveTo(len * 0.8, -0.03, len, 0);
      ctx.quadraticCurveTo(len * 0.8, 0.03, 0.8, 0.16);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }

  function drawSwirl(ctx, c) {
    ctx.lineCap = 'round';
    for (var arm = 0; arm < 3; arm++) {
      ctx.beginPath();
      for (var t = 0; t <= 1; t += 0.04) {
        var a = arm * (TAU / 3) + t * 4.2;
        var d = 0.52 + t * 0.45;
        var x = Math.cos(a) * d, y = Math.sin(a) * d * 0.9;
        if (t === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = rgba(arm === 1 ? c.dark : c.accent, 0.35);
      ctx.lineWidth = 0.07;
      ctx.stroke();
    }
  }

  // ---------- builder ----------
  var images = [];     // loaded custom images per tier (null when procedural)
  var sets = [];       // per tier sprite sets at the current scale
  var icons = [];      // per tier composed icons (bright)
  var iconsDim = [];   // per tier composed icons (dimmed, for undiscovered tiers)
  var dots = [];       // per tier particle glow dots
  var ufo = null;
  var ICON_R = 44;     // icon radius in device pixels

  function colorsOf(t) {
    var c = t.colors || ['#cccccc', '#777777', '#ffffff', '#aaaaaa'];
    return { base: c[0], dark: c[1], light: c[2], accent: c[3] || c[2] };
  }

  function faceScale(i, n) {
    return 1.18 - 0.36 * (i / Math.max(1, n - 1));
  }

  function paintSurface(ctx, i) {
    var t = cfg.tiers[i];
    if (images[i]) paintImage(ctx, images[i]);
    else (PAINTERS[t.style] || PAINTERS.moon)(ctx, colorsOf(t), rng(1013 + i * 7919));
  }

  function unitCanvas(R, ext, paint) {
    var size = Math.ceil(2 * R * ext) + 4;
    var cv = canvas(size);
    var ctx = cv.getContext('2d');
    ctx.translate(size / 2, size / 2);
    ctx.scale(R, R);
    paint(ctx);
    return cv;
  }

  function buildTier(i, R) {
    var t = cfg.tiers[i];
    var style = images[i] ? 'image' : t.style;
    var c = colorsOf(t);
    var set = { R: R, style: style };
    set.ext = EXTENT[style] || 1;
    set.surface = unitCanvas(R, set.ext, function (ctx) { paintSurface(ctx, i); });
    set.faces = null;
    if (cfg.faces !== false) {
      var col = LIGHT_FACE[style] ? cfg.faceColorDark : cfg.faceColor;
      var fy = FACE_Y[style] || 0;
      var fs = faceScale(i, cfg.tiers.length);
      var blush = LIGHT_FACE[style] || style === 'sun' ? null : cfg.blushColor;
      set.faces = [];
      for (var k = 0; k < 4; k++) {
        set.faces.push(unitCanvas(R, 1, (function (kind) {
          return function (ctx) {
            ctx.translate(0, fy);
            drawFace(ctx, kind, col, blush, fs);
          };
        })(k)));
      }
    }
    set.shade = EMISSIVE[style] ? null : unitCanvas(R, 1, drawShade);
    set.glow = EMISSIVE[style] ? unitCanvas(R, 1.8, function (ctx) { drawGlow(ctx, style, c); }) : null;
    set.fx = null;
    if (style === 'sun') set.fx = unitCanvas(R, 1.65, function (ctx) { drawSunRays(ctx, c); });
    if (style === 'blackhole') set.fx = unitCanvas(R, 1, function (ctx) { drawSwirl(ctx, c); });
    return set;
  }

  // Composed icon: glow + surface + face + shade, used for NEXT, evolution chain and banners.
  function buildIcon(i, dim) {
    var set = buildTier(i, ICON_R);
    var size = Math.ceil(ICON_R * 2 * 1.36) + 4;
    var cv = canvas(size);
    var ctx = cv.getContext('2d');
    var m = size / 2;
    function put(img, scale) {
      var w = img.width * scale;
      ctx.drawImage(img, m - w / 2, m - w / 2, w, w);
    }
    if (set.glow) put(set.glow, 0.72);
    if (set.fx) put(set.fx, set.style === 'sun' ? 0.78 : 1);
    put(set.surface, 1);
    if (set.faces) put(set.faces[0], 1);
    if (set.shade) put(set.shade, 1);
    if (dim) {
      ctx.globalCompositeOperation = 'source-atop';
      ctx.fillStyle = 'rgba(16,12,44,0.72)';
      ctx.fillRect(0, 0, size, size);
    }
    return cv;
  }

  function buildDot(color) {
    var cv = canvas(32);
    var ctx = cv.getContext('2d');
    var g = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.25, rgba(color, 0.9));
    g.addColorStop(0.6, rgba(color, 0.3));
    g.addColorStop(1, rgba(color, 0));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 32, 32);
    return cv;
  }

  // UFO dropper sprite, unit = saucer half-width.
  function buildUfo(R) {
    var th = cfg.theme;
    return unitCanvas(R, 1.1, function (ctx) {
      var dome = ctx.createRadialGradient(-0.15, -0.55, 0.02, 0, -0.3, 0.6);
      dome.addColorStop(0, '#ffffff');
      dome.addColorStop(0.35, rgba(th.ufoDome, 0.85));
      dome.addColorStop(1, rgba(th.ufoDome, 0.25));
      ctx.fillStyle = dome;
      ctx.beginPath();
      ctx.ellipse(0, -0.12, 0.46, 0.5, 0, Math.PI, 0);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.6)';
      ctx.lineWidth = 0.04;
      ctx.stroke();
      var body = ctx.createLinearGradient(0, -0.25, 0, 0.3);
      body.addColorStop(0, '#ffffff');
      body.addColorStop(0.4, th.ufoBody);
      body.addColorStop(1, mix(th.ufoBody, '#2a1f66', 0.6));
      ctx.fillStyle = body;
      ctx.beginPath();
      ctx.ellipse(0, 0, 1, 0.26, 0, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = 'rgba(30,20,80,0.6)';
      ctx.lineWidth = 0.04;
      ctx.stroke();
      ctx.fillStyle = mix(th.ufoBody, '#1b1450', 0.55);
      ctx.beginPath();
      ctx.ellipse(0, 0.16, 0.5, 0.12, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = rgba(th.ufoDome, 0.9);
      ctx.beginPath();
      ctx.ellipse(0, 0.2, 0.3, 0.07, 0, 0, TAU);
      ctx.fill();
    });
  }

  function loadImages(onLoad) {
    cfg.tiers.forEach(function (t, i) {
      images[i] = null;
      if (!t.image) return;
      var img = new Image();
      img.onload = function () { images[i] = img; onLoad(); };
      img.src = t.image;
    });
  }

  // Rebuild all body sprites for `k` device pixels per world unit.
  function build(k, jarWidth) {
    sets = [];
    for (var i = 0; i < cfg.tiers.length; i++) {
      sets.push(buildTier(i, Math.max(2, cfg.tiers[i].radius * jarWidth * k)));
    }
    ufo = buildUfo(Math.max(4, 34 * k));
    if (!icons.length || icons.dirty) buildIcons();
  }

  function buildIcons() {
    icons = [];
    iconsDim = [];
    dots = [];
    for (var i = 0; i < cfg.tiers.length; i++) {
      icons.push(buildIcon(i, false));
      iconsDim.push(buildIcon(i, true));
      var c = colorsOf(cfg.tiers[i]);
      dots.push([buildDot(c.base), buildDot(c.light), buildDot(c.accent)]);
    }
  }

  G.lib.sprites = {
    build: build,
    loadImages: function (cb) { loadImages(function () { icons.dirty = true; cb(); }); },
    tier: function (i) { return sets[i]; },
    icon: function (i, dim) { return dim ? iconsDim[i] : icons[i]; },
    iconRadius: ICON_R,
    iconScale: 1.36,
    dots: function (i) { return dots[i]; },
    ufo: function () { return ufo; },
    rgba: rgba,
    mix: mix
  };
})();
