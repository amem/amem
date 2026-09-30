/*
 * Brick Blitz — fx.js
 * Pooled particles, floating score texts, shock-wave rings and screen shake.
 * Nothing here allocates per frame: every effect object comes from a fixed pool.
 */
(function () {
  'use strict';

  var M = window.__GAME__._m;
  var cfg = window.GAME_CONFIG;

  var SHARD = 0, SPARK = 1, GLOW = 2, EMBER = 3;
  var MAX_PARTICLES = 900;
  var amount = typeof cfg.particles === 'number' ? Math.max(0, cfg.particles) : 1;
  var reducedMotion = false;
  try {
    reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch (e) { reducedMotion = false; }
  var shakeEnabled = cfg.screenShake !== false && !reducedMotion;

  function makePool(n, factory) {
    var arr = new Array(n);
    for (var i = 0; i < n; i++) arr[i] = factory();
    return { items: arr, count: 0 };
  }

  var parts = makePool(MAX_PARTICLES, function () {
    return { type: 0, x: 0, y: 0, vx: 0, vy: 0, life: 0, max: 1, size: 1, w: 1, color: '#fff', rot: 0, vr: 0, g: 0, drag: 0 };
  });
  var texts = makePool(48, function () {
    return { x: 0, y: 0, text: '', color: '#fff', life: 0, max: 1, size: 24, vy: 0 };
  });
  var rings = makePool(28, function () {
    return { x: 0, y: 0, r: 0, maxR: 1, life: 0, max: 1, color: '#fff', width: 4 };
  });

  var shake = { trauma: 0, x: 0, y: 0, time: 0 };

  function spawn() {
    if (parts.count >= MAX_PARTICLES) return null;
    return parts.items[parts.count++];
  }

  function count(n) {
    return Math.round(n * amount);
  }

  /** Brick shards: tumbling chips in the brick colour. */
  function shards(x, y, w, h, color, n, power) {
    n = count(n);
    power = power || 1;
    for (var i = 0; i < n; i++) {
      var p = spawn();
      if (!p) return;
      p.type = SHARD;
      p.x = x + (Math.random() - 0.5) * w;
      p.y = y + (Math.random() - 0.5) * h;
      var a = Math.random() * Math.PI * 2;
      var s = (80 + Math.random() * 260) * power;
      p.vx = Math.cos(a) * s;
      p.vy = Math.sin(a) * s - 120 * power;
      p.life = p.max = 0.5 + Math.random() * 0.5;
      p.size = 3 + Math.random() * 5;
      p.w = p.size * (0.4 + Math.random() * 0.6);
      p.color = color;
      p.rot = Math.random() * 6.28;
      p.vr = (Math.random() - 0.5) * 18;
      p.g = 900;
      p.drag = 0.6;
    }
  }

  /** Bright streaks flying out of an impact point. */
  function sparks(x, y, color, n, speed, angle, spread) {
    n = count(n);
    for (var i = 0; i < n; i++) {
      var p = spawn();
      if (!p) return;
      p.type = SPARK;
      p.x = x;
      p.y = y;
      var a = angle === undefined ? Math.random() * Math.PI * 2 : angle + (Math.random() - 0.5) * (spread || 1.2);
      var s = (speed || 300) * (0.35 + Math.random() * 0.8);
      p.vx = Math.cos(a) * s;
      p.vy = Math.sin(a) * s;
      p.life = p.max = 0.18 + Math.random() * 0.3;
      p.size = 1.5 + Math.random() * 1.8;
      p.color = color;
      p.g = 300;
      p.drag = 2.5;
    }
  }

  /** Soft additive glow blob. */
  function glow(x, y, color, size, life, vx, vy) {
    if (amount <= 0) return;
    var p = spawn();
    if (!p) return;
    p.type = GLOW;
    p.x = x;
    p.y = y;
    p.vx = vx || 0;
    p.vy = vy || 0;
    p.life = p.max = life || 0.4;
    p.size = size || 20;
    p.color = color;
    p.g = 0;
    p.drag = 1.5;
  }

  /** Rising ember (fireball trail, explosions). */
  function embers(x, y, color, n, speed) {
    n = count(n);
    for (var i = 0; i < n; i++) {
      var p = spawn();
      if (!p) return;
      p.type = EMBER;
      p.x = x + (Math.random() - 0.5) * 8;
      p.y = y + (Math.random() - 0.5) * 8;
      var a = Math.random() * Math.PI * 2;
      var s = (speed || 60) * Math.random();
      p.vx = Math.cos(a) * s;
      p.vy = Math.sin(a) * s - 40;
      p.life = p.max = 0.25 + Math.random() * 0.35;
      p.size = 5 + Math.random() * 7;
      p.color = color;
      p.g = -120;
      p.drag = 1.2;
    }
  }

  function text(x, y, str, color, size, life) {
    if (texts.count >= texts.items.length) return;
    var t = texts.items[texts.count++];
    t.x = x;
    t.y = y;
    t.text = str;
    t.color = color || '#fff';
    t.size = size || 24;
    t.life = t.max = life || 0.9;
    t.vy = -70;
  }

  function ring(x, y, color, maxR, life, width) {
    if (rings.count >= rings.items.length) return;
    var r = rings.items[rings.count++];
    r.x = x;
    r.y = y;
    r.r = 4;
    r.maxR = maxR || 80;
    r.life = r.max = life || 0.45;
    r.color = color || '#fff';
    r.width = width || 6;
  }

  function addShake(amount) {
    if (!shakeEnabled) return;
    shake.trauma = Math.min(1, shake.trauma + amount);
  }

  function update(dt) {
    var i, p, items = parts.items;
    for (i = parts.count - 1; i >= 0; i--) {
      p = items[i];
      p.life -= dt;
      if (p.life <= 0) {
        parts.count--;
        items[i] = items[parts.count];
        items[parts.count] = p;
        continue;
      }
      var k = 1 - p.drag * dt;
      p.vx *= k;
      p.vy = p.vy * k + p.g * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
    }
    var t, titems = texts.items;
    for (i = texts.count - 1; i >= 0; i--) {
      t = titems[i];
      t.life -= dt;
      if (t.life <= 0) {
        texts.count--;
        titems[i] = titems[texts.count];
        titems[texts.count] = t;
        continue;
      }
      t.y += t.vy * dt;
      t.vy *= 1 - 2.2 * dt;
    }
    var r, ritems = rings.items;
    for (i = rings.count - 1; i >= 0; i--) {
      r = ritems[i];
      r.life -= dt;
      if (r.life <= 0) {
        rings.count--;
        ritems[i] = ritems[rings.count];
        ritems[rings.count] = r;
        continue;
      }
      var q = 1 - r.life / r.max;
      r.r = 4 + (r.maxR - 4) * (1 - Math.pow(1 - q, 3));
    }
    shake.time += dt;
    shake.trauma = Math.max(0, shake.trauma - dt * 1.6);
    var s = shake.trauma * shake.trauma * 18;
    shake.x = s * (Math.sin(shake.time * 71.3) + Math.sin(shake.time * 43.7) * 0.5) / 1.5;
    shake.y = s * (Math.sin(shake.time * 63.1 + 1.3) + Math.sin(shake.time * 37.9) * 0.5) / 1.5;
  }

  /** Draw particles and rings in playfield space. `glowDot(color)` returns a cached sprite. */
  function draw(ctx, glowDot) {
    var i, p, a, items = parts.items;
    // Solid shards first.
    for (i = 0; i < parts.count; i++) {
      p = items[i];
      if (p.type !== SHARD) continue;
      a = p.life / p.max;
      ctx.globalAlpha = a < 0.4 ? a / 0.4 : 1;
      ctx.fillStyle = p.color;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillRect(-p.size / 2, -p.w / 2, p.size, p.w);
      ctx.restore();
    }
    ctx.globalCompositeOperation = 'lighter';
    for (i = 0; i < parts.count; i++) {
      p = items[i];
      a = p.life / p.max;
      if (p.type === SPARK) {
        ctx.globalAlpha = a;
        ctx.strokeStyle = p.color;
        ctx.lineWidth = p.size;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - p.vx * 0.035, p.y - p.vy * 0.035);
        ctx.stroke();
      } else if (p.type === GLOW || p.type === EMBER) {
        var sz = p.type === EMBER ? p.size * a : p.size * (0.6 + 0.4 * a);
        ctx.globalAlpha = p.type === EMBER ? a * 0.9 : a * 0.8;
        ctx.drawImage(glowDot(p.color), p.x - sz, p.y - sz, sz * 2, sz * 2);
      }
    }
    var r, ritems = rings.items;
    for (i = 0; i < rings.count; i++) {
      r = ritems[i];
      a = r.life / r.max;
      ctx.globalAlpha = a;
      ctx.strokeStyle = r.color;
      ctx.lineWidth = Math.max(0.5, r.width * a);
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
  }

  function drawTexts(ctx, font) {
    var i, t, items = texts.items;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (i = 0; i < texts.count; i++) {
      t = items[i];
      var age = t.max - t.life;
      var pop = age < 0.12 ? 0.6 + (age / 0.12) * 0.55 : age < 0.22 ? 1.15 - ((age - 0.12) / 0.1) * 0.15 : 1;
      ctx.globalAlpha = t.life < 0.35 ? t.life / 0.35 : 1;
      ctx.font = '900 ' + Math.round(t.size * pop) + 'px ' + font;
      ctx.lineWidth = 5;
      ctx.strokeStyle = 'rgba(6,4,20,0.85)';
      ctx.strokeText(t.text, t.x, t.y);
      ctx.fillStyle = t.color;
      ctx.fillText(t.text, t.x, t.y);
    }
    ctx.globalAlpha = 1;
  }

  function clear() {
    parts.count = 0;
    texts.count = 0;
    rings.count = 0;
    shake.trauma = 0;
  }

  M.fx = {
    shards: shards,
    sparks: sparks,
    glow: glow,
    embers: embers,
    text: text,
    ring: ring,
    shake: addShake,
    shakeState: shake,
    update: update,
    draw: draw,
    drawTexts: drawTexts,
    clear: clear,
    reducedMotion: reducedMotion,
    particleCount: function () { return parts.count; }
  };
})();
