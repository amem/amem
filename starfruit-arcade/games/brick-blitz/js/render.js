/*
 * Brick Blitz — render.js
 * All drawing: neon background, playfield and rails, bricks (pre-rendered sprites),
 * paddle, balls with trails, capsules, lasers, HUD, banners and the landscape
 * side panels. Reads the game state object; never changes game rules.
 *
 * The playfield is 640 logical px wide and L.H tall (960, or up to 1200 on tall
 * phones so the paddle zone uses the extra height). It is scaled to fit and
 * centred; everything outside it is decorative background.
 *
 * RESKIN WITH IMAGES: set GAME_CONFIG.images.brick / paddle / ball. Bricks are
 * tinted with their row colour; see makeBrick(), drawPaddle() and drawBalls().
 */
(function () {
  'use strict';

  var M = window.__GAME__._m;
  var cfg = window.GAME_CONFIG;
  var th = cfg.theme;
  var L = M.physics.layout;
  var fx = M.fx;
  var T = cfg.texts;
  var FONT = '"Avenir Next", "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
  var TAU = Math.PI * 2;
  var PAD = 7;

  var canvas = null;
  var ctx = null;
  var W = 1, H = 1, dpr = 1, s = 1, ox = 0, oy = 0;
  var fade = 0;
  var bgGrad = null;
  var glowCache = {};
  var brickCache = {};
  var motes = [];
  var images = { brick: null, paddle: null, ball: null };

  // ------------------------------------------------------------------ helpers
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  function hexToRgb(hex) {
    var h = String(hex).replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function mix(a, b, t) {
    var x = hexToRgb(a), y = hexToRgb(b);
    return 'rgb(' + Math.round(x[0] + (y[0] - x[0]) * t) + ',' + Math.round(x[1] + (y[1] - x[1]) * t) + ',' + Math.round(x[2] + (y[2] - x[2]) * t) + ')';
  }
  function rgba(hex, a) {
    var x = hexToRgb(hex);
    return 'rgba(' + x[0] + ',' + x[1] + ',' + x[2] + ',' + a + ')';
  }
  function roundRect(c, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }
  function easeOutBack(t) {
    var c1 = 1.70158, c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  }

  /** Soft additive glow sprite for a colour (cached). */
  function glowDot(color) {
    var spr = glowCache[color];
    if (spr) return spr;
    spr = document.createElement('canvas');
    spr.width = spr.height = 64;
    var c = spr.getContext('2d');
    var g = c.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, rgba(color, 0.9));
    g.addColorStop(0.35, rgba(color, 0.35));
    g.addColorStop(1, rgba(color, 0));
    c.fillStyle = g;
    c.fillRect(0, 0, 64, 64);
    glowCache[color] = spr;
    return spr;
  }

  // ------------------------------------------------------------------ bricks
  /** Pre-render one brick look at the current screen scale. */
  function makeBrick(type, color, maxHp) {
    var w = L.cellW - 2 * L.inset;
    var h = L.cellH - 2 * L.inset;
    var k = s * dpr;
    var cv = document.createElement('canvas');
    cv.width = Math.ceil((w + 2 * PAD) * k);
    cv.height = Math.ceil((h + 2 * PAD) * k);
    var c = cv.getContext('2d');
    c.scale(k, k);
    c.translate(PAD, PAD);

    if (th.glow !== false && type !== 'steel') {
      c.shadowColor = color;
      c.shadowBlur = type === 'explosive' ? 12 : 9;
    }
    roundRect(c, 0, 0, w, h, 5);
    var g = c.createLinearGradient(0, 0, 0, h);
    if (type === 'steel') {
      g.addColorStop(0, '#eef2fb');
      g.addColorStop(0.45, th.steel);
      g.addColorStop(1, '#4f5a78');
    } else {
      g.addColorStop(0, mix(color, '#ffffff', 0.38));
      g.addColorStop(0.5, color);
      g.addColorStop(1, mix(color, '#000000', 0.32));
    }
    c.fillStyle = g;
    c.fill();
    c.shadowBlur = 0;

    if (images.brick && type === 'normal') {
      c.save();
      roundRect(c, 0, 0, w, h, 5);
      c.clip();
      c.drawImage(images.brick, 0, 0, w, h);
      c.globalCompositeOperation = 'source-atop';
      c.globalAlpha = 0.45;
      c.fillStyle = color;
      c.fillRect(0, 0, w, h);
      c.restore();
    }

    // Glossy top highlight and crisp outline.
    c.fillStyle = 'rgba(255,255,255,0.38)';
    roundRect(c, 4, 2.2, w - 8, 3, 1.5);
    c.fill();
    c.strokeStyle = type === 'steel' ? 'rgba(255,255,255,0.55)' : mix(color, '#ffffff', 0.55);
    c.lineWidth = 1.2;
    roundRect(c, 0.6, 0.6, w - 1.2, h - 1.2, 4.5);
    c.stroke();

    if (type === 'normal' && maxHp >= 2) {
      // Armoured plate: inset frame + rivets.
      c.strokeStyle = 'rgba(0,0,0,0.38)';
      c.lineWidth = 2;
      roundRect(c, 5, 5, w - 10, h - 10, 3);
      c.stroke();
      c.fillStyle = 'rgba(255,255,255,0.75)';
      var rv = [[3.5, h / 2], [w - 3.5, h / 2]];
      if (maxHp >= 3) rv.push([w / 2, 3], [w / 2, h - 3]);
      for (var i = 0; i < rv.length; i++) {
        c.beginPath();
        c.arc(rv[i][0], rv[i][1], 1.6, 0, TAU);
        c.fill();
      }
      if (maxHp >= 3) {
        c.save();
        roundRect(c, 6, 6, w - 12, h - 12, 2);
        c.clip();
        c.strokeStyle = 'rgba(0,0,0,0.22)';
        c.lineWidth = 2;
        for (var x = -h; x < w; x += 7) {
          c.beginPath();
          c.moveTo(x, h);
          c.lineTo(x + h, 0);
          c.stroke();
        }
        c.restore();
      }
    } else if (type === 'steel') {
      c.fillStyle = 'rgba(40,48,70,0.7)';
      var bolts = [[5, 5], [w - 5, 5], [5, h - 5], [w - 5, h - 5]];
      for (var b = 0; b < bolts.length; b++) {
        c.beginPath();
        c.arc(bolts[b][0], bolts[b][1], 2, 0, TAU);
        c.fill();
      }
      c.fillStyle = 'rgba(255,255,255,0.25)';
      c.beginPath();
      c.moveTo(w * 0.35, 0);
      c.lineTo(w * 0.5, 0);
      c.lineTo(w * 0.3, h);
      c.lineTo(w * 0.15, h);
      c.closePath();
      c.fill();
    } else if (type === 'explosive') {
      // Hazard stripes + burst glyph.
      c.save();
      roundRect(c, 2, 2, w - 4, h - 4, 4);
      c.clip();
      c.fillStyle = 'rgba(20,6,0,0.35)';
      for (var sx = -h; sx < w; sx += 10) {
        c.beginPath();
        c.moveTo(sx, h);
        c.lineTo(sx + 5, h);
        c.lineTo(sx + 5 + h, 0);
        c.lineTo(sx + h, 0);
        c.closePath();
        c.fill();
      }
      c.restore();
      c.translate(w / 2, h / 2);
      c.fillStyle = '#fff4c2';
      c.beginPath();
      for (var p = 0; p < 16; p++) {
        var a = (p / 16) * TAU;
        var rr = p % 2 ? 3.2 : 7.5;
        c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
      }
      c.closePath();
      c.fill();
    } else if (type === 'mystery') {
      c.fillStyle = '#3a2600';
      c.font = '900 17px ' + FONT;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText('?', w / 2, h / 2 + 1);
    }
    return cv;
  }

  function brickSprite(b) {
    var key = b.type + '|' + b.color + '|' + b.maxHp;
    return brickCache[key] || (brickCache[key] = makeBrick(b.type, b.color, b.maxHp));
  }

  function drawCracks(b) {
    var dmg = 1 - b.hp / b.maxHp;
    ctx.strokeStyle = 'rgba(10,6,24,0.75)';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    var n = dmg > 0.6 ? 3 : 2;
    for (var i = 0; i < n; i++) {
      var sx = b.x + ((b.seed * (i + 3) * 7) % 38) + 6;
      var sy = b.y + (i % 2 ? b.h : 0);
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx + ((b.seed + i * 11) % 9) - 4, b.y + b.h * 0.45);
      ctx.lineTo(sx + ((b.seed + i * 5) % 13) - 6, b.y + (i % 2 ? 0 : b.h));
    }
    ctx.stroke();
  }

  function drawBricks(S) {
    var intro = S.phase === 'intro';
    for (var i = 0; i < S.bricks.length; i++) {
      var b = S.bricks[i];
      if (!b.alive) continue;
      var dy = 0;
      var alpha = 1;
      if (intro) {
        var k = clamp((S.phaseT - b.delay) / 0.4, 0, 1);
        if (k <= 0) continue;
        dy = -(1 - easeOutBack(k)) * 40;
        alpha = k;
      }
      ctx.globalAlpha = alpha;
      ctx.drawImage(brickSprite(b), b.x - PAD, b.y - PAD + dy, b.w + PAD * 2, b.h + PAD * 2);
      if (b.hp < b.maxHp) drawCracks(b);
      if (b.type === 'explosive' || b.type === 'mystery') {
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = alpha * (0.25 + 0.2 * Math.sin(S.time * 6 + b.c));
        ctx.drawImage(glowDot(b.color), b.x - 12, b.y - 12 + dy, b.w + 24, b.h + 24);
        ctx.globalCompositeOperation = 'source-over';
      }
      if (b.flash > 0) {
        ctx.globalAlpha = b.flash * 0.85;
        ctx.fillStyle = '#ffffff';
        roundRect(ctx, b.x, b.y + dy, b.w, b.h, 5);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  // ------------------------------------------------------------------ actors
  function drawPaddle(S) {
    var p = S.paddle;
    var sq = p.squash;
    var w = p.w * (1 + 0.08 * sq);
    var h = p.h * (1 - 0.28 * sq);
    var x = p.x - w / 2;
    var y = p.y + (p.h - h);
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.55;
    ctx.drawImage(glowDot(th.paddle[0]), p.x - w * 0.75, y - 26, w * 1.5, 70);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    if (images.paddle) {
      ctx.drawImage(images.paddle, x, y, w, h);
    } else {
      var g = ctx.createLinearGradient(0, y, 0, y + h);
      g.addColorStop(0, th.paddle[0]);
      g.addColorStop(1, th.paddle[1]);
      ctx.fillStyle = g;
      roundRect(ctx, x, y, w, h, h / 2);
      ctx.fill();
      ctx.fillStyle = th.paddleAccent;
      roundRect(ctx, x, y, 16, h, h / 2);
      ctx.fill();
      roundRect(ctx, x + w - 16, y, 16, h, h / 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      roundRect(ctx, x + 14, y + 2.5, w - 28, 3, 1.5);
      ctx.fill();
    }
    if (S.timers.laser > 0) {
      ctx.fillStyle = th.laser;
      roundRect(ctx, p.x - p.w * 0.36 - 3.5, y - 8, 7, 11, 2);
      ctx.fill();
      roundRect(ctx, p.x + p.w * 0.36 - 3.5, y - 8, 7, 11, 2);
      ctx.fill();
    }
    if (S.timers.catch > 0) {
      ctx.strokeStyle = rgba(cfg.powerups.types.catch.color, 0.55 + 0.35 * Math.sin(S.time * 8));
      ctx.lineWidth = 2.5;
      roundRect(ctx, x - 3, y - 3, w + 6, h + 6, h / 2 + 3);
      ctx.stroke();
    }
  }

  function drawBalls(S) {
    var fire = S.timers.fire > 0;
    var color = fire ? th.fireball : th.ballGlow;
    for (var i = 0; i < S.balls.length; i++) {
      var b = S.balls[i];
      ctx.globalCompositeOperation = 'lighter';
      var n = b.trail.length / 2;
      for (var t = n - 1; t >= 1; t--) {
        var f = 1 - t / n;
        ctx.globalAlpha = f * 0.38;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(b.trail[t * 2], b.trail[t * 2 + 1], b.r * (0.35 + 0.65 * f), 0, TAU);
        ctx.fill();
      }
      ctx.globalAlpha = fire ? 0.95 : 0.8;
      ctx.drawImage(glowDot(color), b.x - b.r * 3.4, b.y - b.r * 3.4, b.r * 6.8, b.r * 6.8);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      if (images.ball) {
        ctx.drawImage(images.ball, b.x - b.r, b.y - b.r, b.r * 2, b.r * 2);
      } else {
        var g = ctx.createRadialGradient(b.x - b.r * 0.35, b.y - b.r * 0.35, 0, b.x, b.y, b.r);
        g.addColorStop(0, '#ffffff');
        g.addColorStop(1, fire ? '#ffd29a' : th.ball);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, TAU);
        ctx.fill();
      }
    }
  }

  function drawAim(S) {
    if (S.pilot !== 'player' || S.phase !== 'play') return;
    for (var i = 0; i < S.balls.length; i++) {
      var b = S.balls[i];
      if (!b.stuck) continue;
      var rel = clamp(b.stuckOffset / (S.paddle.w / 2), -1, 1);
      var a = rel * 30 * Math.PI / 180;
      ctx.save();
      ctx.setLineDash([3, 9]);
      ctx.lineCap = 'round';
      ctx.lineWidth = 3;
      ctx.strokeStyle = rgba(th.accent, 0.45 + 0.25 * Math.sin(S.time * 5));
      ctx.beginPath();
      ctx.moveTo(b.x, b.y - b.r - 6);
      ctx.lineTo(b.x + Math.sin(a) * 150, b.y - b.r - 6 - Math.cos(a) * 150);
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawCapsules(S) {
    var types = cfg.powerups.types;
    for (var i = 0; i < S.capsules.length; i++) {
      var c = S.capsules[i];
      var def = types[c.type];
      var w = 42, h = 18;
      var x = c.x - w / 2, y = c.y - h / 2;
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.6;
      ctx.drawImage(glowDot(def.color), c.x - 34, c.y - 22, 68, 44);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      var g = ctx.createLinearGradient(0, y, 0, y + h);
      g.addColorStop(0, mix(def.color, '#ffffff', 0.45));
      g.addColorStop(0.5, def.color);
      g.addColorStop(1, mix(def.color, '#000000', 0.35));
      ctx.fillStyle = g;
      roundRect(ctx, x, y, w, h, h / 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.7)';
      ctx.lineWidth = 1.2;
      ctx.stroke();
      var shine = (Math.sin(c.t * 5) * 0.5 + 0.5) * (w - 12);
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      roundRect(ctx, x + 4 + shine * 0.2, y + 3, 10, 3, 1.5);
      ctx.fill();
      ctx.fillStyle = '#12081f';
      ctx.font = '900 13px ' + FONT;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(def.letter, c.x, c.y + 1);
    }
  }

  function drawLasers(S) {
    ctx.globalCompositeOperation = 'lighter';
    for (var i = 0; i < S.lasers.length; i++) {
      var l = S.lasers[i];
      ctx.globalAlpha = 0.7;
      ctx.drawImage(glowDot(th.laser), l.x - 10, l.y - 8, 20, 32);
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#ffe1ea';
      ctx.fillRect(l.x - 1.5, l.y, 3, 16);
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  // ------------------------------------------------------------------ field
  function drawField(S) {
    ctx.fillStyle = th.fieldColor;
    roundRect(ctx, 0, 0, 640, L.H, 22);
    ctx.fill();
    ctx.save();
    roundRect(ctx, 0, 0, 640, L.H, 22);
    ctx.clip();
    ctx.strokeStyle = 'rgba(120,140,255,0.05)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (var gx = 40; gx < 640; gx += 40) { ctx.moveTo(gx, L.top); ctx.lineTo(gx, L.H); }
    for (var gy = L.top + 40; gy < L.H; gy += 40) { ctx.moveTo(0, gy); ctx.lineTo(640, gy); }
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.035)';
    ctx.fillRect(0, 0, 640, L.hudH);
    ctx.restore();

    // Neon rails (left, top, right walls).
    var g = ctx.createLinearGradient(0, 0, 640, 0);
    g.addColorStop(0, th.railColors[0]);
    g.addColorStop(1, th.railColors[1]);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(L.left - 5, L.H - 4);
    ctx.lineTo(L.left - 5, L.top - 5);
    ctx.lineTo(L.right + 5, L.top - 5);
    ctx.lineTo(L.right + 5, L.H - 4);
    ctx.globalAlpha = 0.22;
    ctx.strokeStyle = g;
    ctx.lineWidth = 12;
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.lineWidth = 3;
    ctx.stroke();
    // Danger fade below the paddle.
    var d = ctx.createLinearGradient(0, L.paddleY + 30, 0, L.H);
    d.addColorStop(0, rgba(th.accent2, 0));
    d.addColorStop(1, rgba(th.accent2, 0.12));
    ctx.fillStyle = d;
    ctx.fillRect(L.left, L.paddleY + 30, L.right - L.left, L.H - L.paddleY - 30);
  }

  function label(str, x, y, align, color, size) {
    ctx.font = '800 ' + (size || 14) + 'px ' + FONT;
    ctx.textAlign = align || 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = color || th.labelColor;
    ctx.fillText(String(str).toUpperCase().split('').join(' '), x, y);
  }

  function drawHud(S) {
    if (S.pilot === 'title') return;
    label(T.score || 'Score', 28, 34);
    ctx.font = '900 32px ' + FONT;
    ctx.textAlign = 'left';
    ctx.fillStyle = th.textColor;
    var scoreStr = String(Math.round(S.shownScore));
    ctx.fillText(scoreStr, 28, 72);
    if (S.mult >= 2) {
      var sw = ctx.measureText(scoreStr).width;
      ctx.fillStyle = th.accent2;
      roundRect(ctx, 38 + sw, 50, 44, 24, 12);
      ctx.fill();
      ctx.fillStyle = '#12081f';
      ctx.font = '900 15px ' + FONT;
      ctx.textAlign = 'center';
      ctx.fillText('×' + S.mult, 60 + sw, 67);
    }
    label((T.level || 'Level') + ' ' + (S.levelIndex + 1) + (S.loop > 0 ? '  ·  ' + (T.loop || 'Loop {loop}').replace('{loop}', S.loop + 1) : ''), 320, 34, 'center');
    var n = S.lives;
    var lw = 24, gap = 8;
    var total = n * lw + (n - 1) * gap;
    for (var i = 0; i < n; i++) {
      var lx = 320 - total / 2 + i * (lw + gap);
      var g = ctx.createLinearGradient(0, 56, 0, 64);
      g.addColorStop(0, th.paddle[0]);
      g.addColorStop(1, th.paddle[1]);
      ctx.fillStyle = g;
      roundRect(ctx, lx, 56, lw, 8, 4);
      ctx.fill();
    }
  }

  function drawTimers(S) {
    var types = cfg.powerups.types;
    var list = [];
    for (var k in S.timers) {
      if (Object.prototype.hasOwnProperty.call(S.timers, k) && S.timers[k] > 0 && types[k] && types[k].duration) list.push(k);
    }
    if (!list.length) return;
    var w = 74, h = 22, gap = 10;
    var total = list.length * w + (list.length - 1) * gap;
    var y = L.H - 34;
    for (var i = 0; i < list.length; i++) {
      var key = list[i];
      var def = types[key];
      var x = 320 - total / 2 + i * (w + gap);
      ctx.fillStyle = 'rgba(8,6,26,0.8)';
      roundRect(ctx, x, y, w, h, h / 2);
      ctx.fill();
      ctx.fillStyle = rgba(def.color, 0.85);
      roundRect(ctx, x, y, Math.max(h, w * (S.timers[key] / def.duration)), h, h / 2);
      ctx.fill();
      ctx.fillStyle = '#12081f';
      ctx.font = '900 13px ' + FONT;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(def.letter, x + 9, y + h / 2 + 1);
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'right';
      ctx.fillText(Math.ceil(S.timers[key]) + 's', x + w - 9, y + h / 2 + 1);
    }
  }

  function drawBanner(S) {
    var b = S.banner;
    if (!b) return;
    var inT = clamp(b.t / 0.35, 0, 1);
    var outT = clamp((b.life - b.t) / 0.35, 0, 1);
    var a = Math.min(inT, outT);
    var sc = easeOutBack(inT);
    var cy = L.H * 0.56;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(320, cy);
    ctx.scale(sc, sc);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    var big = b.kind === 'intro' ? 64 : 50;
    ctx.font = '900 ' + big + 'px ' + FONT;
    ctx.lineWidth = 8;
    ctx.strokeStyle = 'rgba(8,4,24,0.85)';
    ctx.strokeText(b.title, 0, 0);
    ctx.shadowColor = b.kind === 'intro' ? th.accent : th.accent2;
    ctx.shadowBlur = 24;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(b.title, 0, 0);
    ctx.shadowBlur = 0;
    if (b.sub) {
      ctx.font = '900 24px ' + FONT;
      ctx.fillStyle = b.kind === 'intro' ? th.accent2 : th.accent;
      ctx.fillText(String(b.sub).split('').join(' '), 0, big * 0.85);
    }
    if (b.lines) {
      for (var i = 0; i < b.lines.length; i++) {
        var show = clamp((b.t - 0.4 - i * 0.3) / 0.25, 0, 1);
        if (show <= 0) continue;
        ctx.globalAlpha = a * show;
        ctx.font = '800 20px ' + FONT;
        ctx.fillStyle = th.labelColor;
        ctx.fillText(b.lines[i][0] + '  +' + b.lines[i][1], 0, big * 0.9 + (b.sub ? 34 : 0) + i * 30);
      }
    }
    ctx.restore();
  }

  // ------------------------------------------------------------------ screen space
  function drawBackground(t) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);
    var hy = H * 0.55;
    var depth = H - hy;
    ctx.strokeStyle = th.gridColor;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.18;
    ctx.beginPath();
    var phase = (t * 0.3) % 1;
    for (var k = 0; k < 14; k++) {
      var z = k + 1 - phase;
      var y = hy + depth * (0.22 / (z * 0.18 + 0.02)) * 0.1;
      if (y > H || y < hy) continue;
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
    }
    for (var v = -14; v <= 14; v++) {
      ctx.moveTo(W / 2 + v * W * 0.015, hy);
      ctx.lineTo(W / 2 + v * W * 0.2, H + depth * 0.2);
    }
    ctx.stroke();
    ctx.globalAlpha = 1;
    var band = ctx.createLinearGradient(0, hy - 40, 0, hy + 40);
    band.addColorStop(0, rgba(th.horizonColor, 0));
    band.addColorStop(0.5, rgba(th.horizonColor, 0.35));
    band.addColorStop(1, rgba(th.horizonColor, 0));
    ctx.fillStyle = band;
    ctx.fillRect(0, hy - 40, W, 80);
    ctx.fillStyle = th.starColor;
    for (var i = 0; i < motes.length; i++) {
      var m = motes[i];
      var my = ((m.y - t * m.v) % 1 + 1) % 1;
      ctx.globalAlpha = m.a * (0.6 + 0.4 * Math.sin(t * 2 + m.p));
      ctx.fillRect(m.x * W, my * H, m.r, m.r);
    }
    ctx.globalAlpha = 1;
  }

  function panelBox(x, y, w, h) {
    ctx.fillStyle = 'rgba(12,8,36,0.72)';
    roundRect(ctx, x, y, w, h, 18);
    ctx.fill();
    ctx.strokeStyle = 'rgba(143,163,217,0.25)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  function drawSidePanels(S) {
    var side = ox;
    if (side < 230 || S.pilot === 'title') return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var pw = Math.min(260, side - 48);
    var lx = (side - pw) / 2;
    var rx = W - side + (side - pw) / 2;
    var level = M.levels[S.levelIndex];
    // Left: level + best + controls.
    var top = Math.max(24, H / 2 - 150);
    var hints = T.controlsHint ? String(T.controlsHint).split('·') : [];
    panelBox(lx, top, pw, 196 + (hints.length ? 20 + hints.length * 20 : 0));
    label(T.level || 'Level', lx + 20, top + 34, 'left', th.labelColor, 13);
    ctx.font = '900 44px ' + FONT;
    ctx.fillStyle = th.textColor;
    ctx.textAlign = 'left';
    ctx.fillText(String(S.levelIndex + 1), lx + 20, top + 82);
    ctx.font = '900 16px ' + FONT;
    ctx.fillStyle = th.accent2;
    ctx.fillText(level ? level.name : '', lx + 20, top + 108);
    label(T.best || 'Best', lx + 20, top + 146, 'left', th.labelColor, 13);
    ctx.font = '900 22px ' + FONT;
    ctx.fillStyle = th.textColor;
    ctx.fillText(String(S.best), lx + 20, top + 176);
    // Right: power-up legend.
    var types = cfg.powerups.types;
    var names = T.powerups || {};
    var keys = Object.keys(types);
    var rowH = 34;
    var ph = 56 + keys.length * rowH;
    var rtop = Math.max(24, H / 2 - ph / 2);
    panelBox(rx, rtop, pw, ph);
    label(T.powerupsTitle || 'Power-ups', rx + 20, rtop + 34, 'left', th.labelColor, 13);
    for (var i = 0; i < keys.length; i++) {
      var def = types[keys[i]];
      var y = rtop + 54 + i * rowH;
      ctx.fillStyle = def.color;
      roundRect(ctx, rx + 20, y + 4, 38, 18, 9);
      ctx.fill();
      ctx.fillStyle = '#12081f';
      ctx.font = '900 12px ' + FONT;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(def.letter, rx + 39, y + 14);
      ctx.fillStyle = th.textColor;
      ctx.font = '700 14px ' + FONT;
      ctx.textAlign = 'left';
      ctx.fillText(String(names[keys[i]] || keys[i]).replace(/!$/, ''), rx + 70, y + 14);
      ctx.textBaseline = 'alphabetic';
    }
    for (var h = 0; h < hints.length; h++) {
      label(hints[h].trim(), lx + 20, top + 214 + h * 20, 'left', 'rgba(143,163,217,0.75)', 11);
    }
  }

  // ------------------------------------------------------------------ public
  function init(cv) {
    canvas = cv;
    ctx = canvas.getContext('2d');
    for (var i = 0; i < 70; i++) {
      motes.push({ x: Math.random(), y: Math.random(), r: Math.random() < 0.2 ? 2 : 1, v: 0.01 + Math.random() * 0.03, a: 0.2 + Math.random() * 0.5, p: Math.random() * TAU });
    }
    ['brick', 'paddle', 'ball'].forEach(function (key) {
      var src = cfg.images && cfg.images[key];
      if (!src) return;
      var img = new Image();
      img.onload = function () { images[key] = img; brickCache = {}; };
      img.src = src;
    });
  }

  function resize() {
    W = Math.max(1, window.innerWidth);
    H = Math.max(1, window.innerHeight);
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    var aspect = H / W;
    var fieldH = aspect > 1.55 ? clamp(Math.round(640 * aspect * 0.92), 960, 1200) : 960;
    L.H = fieldH;
    L.paddleY = fieldH - 88;
    s = Math.min(W / 640, H / fieldH);
    ox = (W - 640 * s) / 2;
    oy = (H - fieldH * s) / 2;
    brickCache = {};
    bgGrad = ctx.createLinearGradient(0, 0, 0, H);
    bgGrad.addColorStop(0, th.bgTop);
    bgGrad.addColorStop(1, th.bgBottom);
    var root = document.documentElement.style;
    root.setProperty('--field-left', ox + 'px');
    root.setProperty('--field-top', oy + 'px');
    root.setProperty('--field-right', (W - ox - 640 * s) + 'px');
    root.setProperty('--field-width', 640 * s + 'px');
    root.setProperty('--hud-h', L.hudH * s + 'px');
  }

  function draw(S, dt) {
    drawBackground(S.time);
    drawSidePanels(S);
    var sh = fx.shakeState;
    ctx.setTransform(dpr * s, 0, 0, dpr * s, dpr * (ox + sh.x * s), dpr * (oy + sh.y * s));
    drawField(S);
    drawHud(S);
    drawBricks(S);
    drawCapsules(S);
    drawLasers(S);
    drawAim(S);
    drawPaddle(S);
    drawBalls(S);
    fx.draw(ctx, glowDot);
    fx.drawTexts(ctx, FONT);
    drawTimers(S);
    drawBanner(S);
    if (fade > 0) {
      fade = Math.max(0, fade - dt / 0.35);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.globalAlpha = fade;
      ctx.fillStyle = th.bgBottom;
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;
    }
  }

  M.render = {
    init: init,
    resize: resize,
    draw: draw,
    fadeIn: function () { fade = 1; },
    toField: function (clientX, clientY) { return { x: (clientX - ox) / s, y: (clientY - oy) / s }; }
  };
})();
