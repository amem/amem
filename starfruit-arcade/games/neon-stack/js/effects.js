/*
 * effects.js — pooled juice: falling debris, spark particles, perfect ripples
 * and floating texts. Pools are allocated once; nothing is created per frame.
 */
(function () {
  'use strict';
  var NS = window.__GAME__ = window.__GAME__ || {};
  var M = NS.modules = NS.modules || {};
  var R = M.render;
  var cfg = window.GAME_CONFIG || {};
  var B = (cfg.block && cfg.block.size) || 100;
  var BH = (cfg.block && cfg.block.height) || 24;
  var GRAVITY = B * 14;

  function pool(n, make) {
    var arr = [];
    for (var i = 0; i < n; i++) { var o = make(); o.on = false; arr.push(o); }
    return arr;
  }
  function take(arr) {
    for (var i = 0; i < arr.length; i++) if (!arr[i].on) return arr[i];
    // Pool exhausted: recycle the oldest.
    var oldest = arr[0];
    for (var j = 1; j < arr.length; j++) if (arr[j].age > oldest.age) oldest = arr[j];
    return oldest;
  }

  var debris = pool(24, function () { return { x: 0, z: 0, w: 0, d: 0, e: 0, vx: 0, vz: 0, ve: 0, age: 0, life: 0, col: null, side: 1 }; });
  var sparks = pool(220, function () { return { x: 0, z: 0, e: 0, vx: 0, vz: 0, ve: 0, age: 0, life: 0, hue: 0, size: 0 }; });
  var ripples = pool(10, function () { return { x: 0, z: 0, w: 0, d: 0, e: 0, age: 0, delay: 0, life: 0, hue: 0 }; });
  var texts = pool(8, function () { return { str: '', x: 0, z: 0, e: 0, sx: 0, sy: 0, screen: false, age: 0, life: 0, color: '', size: 0 }; });
  var pt = { x: 0, y: 0 };

  function reset() {
    var lists = [debris, sparks, ripples, texts];
    for (var l = 0; l < lists.length; l++) for (var i = 0; i < lists[l].length; i++) lists[l][i].on = false;
  }

  /**
   * Falling cut-off piece. side: +1 = near side (drawn in front of the tower),
   * -1 = far side (drawn behind). axis/sign give the outward drift direction.
   */
  function addDebris(x, z, w, d, level, col, axis, sign, life) {
    var o = take(debris);
    o.on = true;
    o.x = x; o.z = z; o.w = w; o.d = d; o.e = level * BH;
    var push = B * (0.35 + Math.random() * 0.25) * sign;
    o.vx = axis === 'x' ? push : (Math.random() - 0.5) * B * 0.15;
    o.vz = axis === 'z' ? push : (Math.random() - 0.5) * B * 0.15;
    o.ve = B * 0.4;
    o.age = 0;
    o.life = life || 1.5;
    o.col = col;
    o.side = sign;
  }

  /** Sparks from the perimeter of a top face. */
  function burst(x, z, w, d, e, hue, count, power) {
    for (var i = 0; i < count; i++) {
      var o = take(sparks);
      o.on = true;
      var edge = Math.random() * 4 | 0;
      var u = Math.random() - 0.5;
      var px = edge === 0 ? -0.5 : edge === 1 ? 0.5 : u;
      var pz = edge === 2 ? -0.5 : edge === 3 ? 0.5 : u;
      o.x = x + px * w;
      o.z = z + pz * d;
      o.e = e;
      var sp = B * (0.4 + Math.random() * 0.9) * (power || 1);
      o.vx = px * sp * 2;
      o.vz = pz * sp * 2;
      o.ve = B * (0.6 + Math.random() * 1.4) * (power || 1);
      o.age = 0;
      o.life = 0.6 + Math.random() * 0.6;
      o.hue = hue + (Math.random() - 0.5) * 40;
      o.size = 6 + Math.random() * 10;
    }
  }

  function ripple(x, z, w, d, e, hue, delay) {
    var o = take(ripples);
    o.on = true;
    o.x = x; o.z = z; o.w = w; o.d = d; o.e = e;
    o.age = 0; o.delay = delay || 0; o.life = 0.6; o.hue = hue;
  }

  /** Floating text anchored to a world point (rises & fades). */
  function text(str, x, z, e, color, size) {
    var o = take(texts);
    o.on = true; o.screen = false;
    o.str = str; o.x = x; o.z = z; o.e = e;
    o.age = 0; o.life = 1.1; o.color = color; o.size = size;
  }

  /** Big screen-space text (milestones). fx/fy are fractions of the screen. */
  function screenText(str, fx, fy, color, size) {
    var o = take(texts);
    o.on = true; o.screen = true;
    o.str = str; o.sx = fx; o.sy = fy;
    o.age = 0; o.life = 1.4; o.color = color; o.size = size;
  }

  function update(dt) {
    var i, o;
    for (i = 0; i < debris.length; i++) {
      o = debris[i];
      if (!o.on) continue;
      o.age += dt;
      o.ve -= GRAVITY * dt;
      o.e += o.ve * dt;
      o.x += o.vx * dt;
      o.z += o.vz * dt;
      if (o.age > o.life) o.on = false;
    }
    for (i = 0; i < sparks.length; i++) {
      o = sparks[i];
      if (!o.on) continue;
      o.age += dt;
      o.ve -= GRAVITY * 0.18 * dt;
      o.vx *= 1 - 1.8 * dt;
      o.vz *= 1 - 1.8 * dt;
      o.x += o.vx * dt; o.z += o.vz * dt; o.e += o.ve * dt;
      if (o.age > o.life) o.on = false;
    }
    for (i = 0; i < ripples.length; i++) {
      o = ripples[i];
      if (!o.on) continue;
      o.age += dt;
      if (o.age > o.delay + o.life) o.on = false;
    }
    for (i = 0; i < texts.length; i++) {
      o = texts[i];
      if (!o.on) continue;
      o.age += dt;
      if (o.age > o.life) o.on = false;
    }
  }

  /** Draw debris on one side of the tower (-1 behind, +1 in front). */
  function drawDebris(side) {
    var ctx = R.ctx;
    for (var i = 0; i < debris.length; i++) {
      var o = debris[i];
      if (!o.on || o.side !== side) continue;
      var fade = o.life - o.age;
      ctx.globalAlpha = fade < 0.5 ? Math.max(0, fade / 0.5) : 1;
      R.drawCuboid(o.x, o.z, o.w, o.d, o.e, BH, o.col, 0, 0);
    }
    ctx.globalAlpha = 1;
  }

  function easeOut(t) { return 1 - (1 - t) * (1 - t) * (1 - t); }

  /** Ripples, sparks and texts (on top of everything in the world). */
  function drawOverlay() {
    var ctx = R.ctx, cam = R.cam, i, o, t;
    var k = Math.max(0.5, Math.min(1.6, cam.s));
    ctx.lineJoin = 'round';
    for (i = 0; i < ripples.length; i++) {
      o = ripples[i];
      if (!o.on || o.age < o.delay) continue;
      t = (o.age - o.delay) / o.life;
      var g = easeOut(t) * B * 0.42;
      R.pathRect(o.x, o.z, o.w + g * 2, o.d + g * 2, o.e);
      var a = (1 - t) * (1 - t);
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = R.hsla(o.hue, 100, 65, 0.55 * a);
      ctx.lineWidth = (7 * (1 - t) + 2) * k;
      ctx.stroke();
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = 'rgba(255,255,255,' + (0.95 * a).toFixed(3) + ')';
      ctx.lineWidth = (2.2 * (1 - t) + 0.8) * k;
      ctx.stroke();
    }

    ctx.globalCompositeOperation = 'lighter';
    for (i = 0; i < sparks.length; i++) {
      o = sparks[i];
      if (!o.on) continue;
      t = o.age / o.life;
      R.project(o.x, o.z, o.e, pt);
      var sz = o.size * (1 - t * 0.6) * Math.sqrt(k);
      ctx.globalAlpha = 1 - t * t;
      ctx.drawImage(R.glowSprite(o.hue, true), pt.x - sz, pt.y - sz, sz * 2, sz * 2);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (i = 0; i < texts.length; i++) {
      o = texts[i];
      if (!o.on) continue;
      t = o.age / o.life;
      var x, y;
      if (o.screen) {
        x = o.sx * R.W;
        y = o.sy * R.H - easeOut(t) * R.H * 0.04;
      } else {
        R.project(o.x, o.z, o.e, pt);
        x = pt.x;
        y = pt.y - easeOut(t) * 70;
      }
      var pop = o.age < 0.16 ? 1.45 - 0.45 * easeOut(o.age / 0.16) : 1;
      var alpha = t > 0.6 ? 1 - (t - 0.6) / 0.4 : 1;
      ctx.globalAlpha = Math.max(0, alpha);
      ctx.font = '900 ' + Math.round(o.size * pop) + 'px ' + R.FONT;
      ctx.shadowColor = o.color;
      ctx.shadowBlur = o.size * 0.55;
      ctx.fillStyle = o.color;
      ctx.fillText(o.str, x, y);
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(255,255,255,0.92)';
      ctx.fillText(o.str, x, y);
    }
    ctx.shadowColor = 'rgba(0,0,0,0)';
    ctx.globalAlpha = 1;
  }

  M.effects = {
    reset: reset,
    addDebris: addDebris,
    burst: burst,
    ripple: ripple,
    text: text,
    screenText: screenText,
    update: update,
    drawDebris: drawDebris,
    drawOverlay: drawOverlay
  };
})();
