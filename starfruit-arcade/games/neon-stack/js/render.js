/*
 * render.js — all Canvas 2D drawing: isometric projection, background
 * (sky gradient, retro sun, perspective grid, stars, bokeh), the grid floor,
 * the pedestal and the blocks.
 *
 * Isometric projection (world → screen, CSS pixels):
 *   screenX = cam.ox + (x − z) · cos30° · cam.s
 *   screenY = cam.oy + (x + z) · sin30° · cam.s − elevation · cam.s
 * Visible faces of a block: top, "left" (+z side) and "right" (+x side).
 *
 * RESKIN TIP — image-based blocks: replace the body of drawCuboid() (or wrap
 * drawBlock()) with ctx.drawImage calls; the four projected top-face corners
 * and the face height are computed at the top of drawCuboid().
 */
(function () {
  'use strict';
  var NS = window.__GAME__ = window.__GAME__ || {};
  var M = NS.modules = NS.modules || {};
  var cfg = window.GAME_CONFIG || {};
  var theme = cfg.theme || {};
  var blockCfg = cfg.block || {};

  var COS = Math.cos(Math.PI / 6);
  var SIN = 0.5;
  var TAU = Math.PI * 2;
  var FONT = '"Avenir Next", "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
  var B = blockCfg.size || 100;
  var BH = blockCfg.height || 24;

  var R = {
    canvas: null,
    ctx: null,
    W: 1,
    H: 1,
    dpr: 1,
    FONT: FONT,
    COS: COS,
    SIN: SIN,
    // Camera: scale (px per world unit) and screen position of the world origin (x=z=elevation=0).
    cam: { s: 1, ox: 0, oy: 0 }
  };

  var ctx = null;
  var cache = { bgHue: null, bgGrad: null, vignette: null, sun: null, sunR: 0, sunGlow: null, horizon: null };
  var sprites = {};
  var stars = [];
  var bokeh = [];

  function wrapHue(h) { return ((h % 360) + 360) % 360; }
  function hsl(h, s, l) { return 'hsl(' + wrapHue(h).toFixed(1) + ',' + s.toFixed(1) + '%,' + l.toFixed(1) + '%)'; }
  function hsla(h, s, l, a) { return 'hsla(' + wrapHue(h).toFixed(1) + ',' + s.toFixed(1) + '%,' + l.toFixed(1) + '%,' + a.toFixed(3) + ')'; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  R.hsl = hsl;
  R.hsla = hsla;
  R.wrapHue = wrapHue;

  /** Hue of a tower level (unwrapped, so easing between levels is smooth). */
  R.hueFor = function (level) {
    return (theme.hueStart || 0) + level * (theme.hueStep || 0);
  };

  /** Precomputed fill/stroke styles for one level. Computed once per block. */
  R.colorsFor = function (level) {
    var h = R.hueFor(level);
    var s = theme.saturation == null ? 90 : theme.saturation;
    var l = theme.lightness == null ? 55 : theme.lightness;
    return {
      hue: h,
      top: hsl(h, s, clamp(l + 13, 0, 92)),
      left: hsl(h + 4, s * 0.92, clamp(l - 8, 0, 90)),
      right: hsl(h + 8, s * 0.95, clamp(l - 22, 0, 90)),
      edge: hsl(h, 100, clamp(l + 30, 0, 96)),
      glow: hsla(h, 100, 62, 0.4)
    };
  };

  R.init = function (canvas) {
    R.canvas = canvas;
    ctx = R.ctx = canvas.getContext('2d', { alpha: false });
    var i;
    for (i = 0; i < 110; i++) {
      stars.push({ x: Math.random(), y: Math.random(), r: Math.random() < 0.15 ? 1.6 : 0.5 + Math.random() * 0.8, p: Math.random() * TAU, sp: 0.6 + Math.random() * 2 });
    }
    for (i = 0; i < 16; i++) {
      bokeh.push({ x: Math.random(), y: Math.random(), r: 0.03 + Math.random() * 0.09, v: 0.004 + Math.random() * 0.012, a: 0.05 + Math.random() * 0.09, h: Math.random() * 120 - 60, p: Math.random() * TAU, z: 0.25 + Math.random() * 0.5 });
    }
  };

  R.resize = function () {
    var w = Math.max(1, window.innerWidth);
    var h = Math.max(1, window.innerHeight);
    R.dpr = Math.min(window.devicePixelRatio || 1, 2);
    R.W = w;
    R.H = h;
    R.canvas.width = Math.round(w * R.dpr);
    R.canvas.height = Math.round(h * R.dpr);
    cache.bgHue = null;
    cache.sun = null;
    buildVignette();
  };

  // ---------------------------------------------------------------- sprites
  /** Soft round glow sprite tinted with a hue (cached per 10° bucket). */
  R.glowSprite = function (hue, light) {
    var bucket = Math.round(wrapHue(hue) / 10) % 36;
    var key = bucket + (light ? 'l' : 'n');
    var spr = sprites[key];
    if (spr) return spr;
    spr = document.createElement('canvas');
    spr.width = spr.height = 64;
    var c = spr.getContext('2d');
    var g = c.createRadialGradient(32, 32, 0, 32, 32, 32);
    var hh = bucket * 10;
    if (light) {
      g.addColorStop(0, 'hsla(' + hh + ',100%,96%,1)');
      g.addColorStop(0.22, 'hsla(' + hh + ',100%,72%,0.85)');
      g.addColorStop(0.5, 'hsla(' + hh + ',100%,60%,0.25)');
    } else {
      g.addColorStop(0, 'hsla(' + hh + ',90%,70%,0.9)');
      g.addColorStop(0.55, 'hsla(' + hh + ',90%,60%,0.35)');
      g.addColorStop(0.85, 'hsla(' + hh + ',90%,55%,0.08)');
    }
    g.addColorStop(1, 'hsla(' + hh + ',100%,50%,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, 64, 64);
    sprites[key] = spr;
    return spr;
  };

  function buildVignette() {
    var W = R.W, H = R.H;
    var g = ctx.createRadialGradient(W / 2, H * 0.45, Math.min(W, H) * 0.35, W / 2, H * 0.5, Math.max(W, H) * 0.8);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,0.55)');
    cache.vignette = g;
  }

  function buildSun() {
    var r = Math.round(clamp(Math.min(R.W, R.H) * 0.22, 60, 220));
    var cv = document.createElement('canvas');
    cv.width = cv.height = r * 2;
    var c = cv.getContext('2d');
    var cols = theme.sunColors || ['#ffe66d', '#ff8a5c', '#ff3d9a', '#b429f9'];
    var g = c.createLinearGradient(0, 0, 0, r * 2);
    for (var i = 0; i < cols.length; i++) g.addColorStop(i / (cols.length - 1), cols[i]);
    c.fillStyle = g;
    c.beginPath();
    c.arc(r, r, r, 0, TAU);
    c.fill();
    // Retro stripes: gaps get thicker toward the bottom.
    c.globalCompositeOperation = 'destination-out';
    var y = r * 0.9;
    var gap = r * 0.035;
    while (y < r * 2) {
      c.fillRect(0, y, r * 2, gap);
      y += gap + r * 0.11;
      gap *= 1.35;
    }
    cache.sun = cv;
    cache.sunR = r;
    var glow = ctx.createRadialGradient(0, 0, r * 0.6, 0, 0, r * 2.6);
    glow.addColorStop(0, 'rgba(255,90,150,0.34)');
    glow.addColorStop(0.45, 'rgba(255,60,160,0.10)');
    glow.addColorStop(1, 'rgba(255,60,160,0)');
    cache.sunGlow = glow;
  }

  // ------------------------------------------------------------- background
  /**
   * @param {object} view  { hue, lift, time, floorY }
   *   hue   — current (eased) background hue
   *   lift  — how far the camera has risen, in base-scale pixels (drives parallax)
   *   time  — seconds, for animation
   */
  R.drawBackground = function (view) {
    var W = R.W, H = R.H;
    var bgS = theme.backgroundSaturation == null ? 60 : theme.backgroundSaturation;
    var bgL = theme.backgroundLightness == null ? 8 : theme.backgroundLightness;
    var hue = view.hue;
    if (cache.bgHue === null || Math.abs(cache.bgHue - hue) > 0.5) {
      var g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, hsl(hue - 18, bgS * 0.9, bgL * 0.55));
      g.addColorStop(0.55, hsl(hue, bgS, bgL * 1.15));
      g.addColorStop(1, hsl(hue + 22, bgS, bgL * 2.1));
      cache.bgGrad = g;
      cache.bgHue = hue;
    }
    ctx.fillStyle = cache.bgGrad;
    ctx.fillRect(0, 0, W, H);

    var lift = view.lift;
    var t = view.time;

    // Stars — fade in as the tower climbs into the "sky".
    var starA = clamp(0.35 + lift / (H * 3), 0.35, 1);
    ctx.fillStyle = '#ffffff';
    var off = lift * 0.06;
    for (var i = 0; i < stars.length; i++) {
      var st = stars[i];
      var sy = ((st.y * H * 1.2 + off) % (H * 1.2)) - H * 0.1;
      var tw = 0.55 + 0.45 * Math.sin(t * st.sp + st.p);
      ctx.globalAlpha = starA * tw * (st.r > 1 ? 0.95 : 0.6);
      ctx.fillRect(st.x * W, sy, st.r, st.r);
    }
    ctx.globalAlpha = 1;

    // Horizon: retro sun + receding perspective grid. Sinks as the camera rises.
    var horizonY = Math.round(Math.min(H * 0.6 + lift * 0.22, view.floorY - 18));
    if (horizonY < H + cache.sunR * 2 && (theme.sun !== false)) drawHorizon(horizonY, t, hue);

    // Bokeh — big soft out-of-focus lights drifting upward.
    if (theme.bokeh !== false) {
      ctx.globalCompositeOperation = 'lighter';
      var m = Math.min(W, H);
      for (var j = 0; j < bokeh.length; j++) {
        var b = bokeh[j];
        var rad = b.r * m * 2;
        var span = H + rad * 2;
        var by = (((b.y * span - t * b.v * H - lift * b.z * 0.35) % span) + span) % span - rad;
        var bx = b.x * W + Math.sin(t * 0.2 + b.p) * m * 0.03;
        ctx.globalAlpha = b.a * (0.7 + 0.3 * Math.sin(t * 0.5 + b.p));
        ctx.drawImage(R.glowSprite(hue + b.h, false), bx - rad, by - rad, rad * 2, rad * 2);
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }
  };

  function drawHorizon(hy, t, hue) {
    var W = R.W, H = R.H;
    if (!cache.sun) buildSun();
    var r = cache.sunR;
    var sunX = W * 0.5;
    var sunY = hy - r * 0.42;
    // Glow behind the sun.
    ctx.save();
    ctx.translate(sunX, sunY);
    ctx.fillStyle = cache.sunGlow;
    ctx.fillRect(-r * 2.6, -r * 2.6, r * 5.2, r * 5.2);
    ctx.restore();
    // Sun, clipped at the horizon.
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, W, hy);
    ctx.clip();
    ctx.globalAlpha = 0.92;
    ctx.drawImage(cache.sun, sunX - r, sunY - r);
    ctx.restore();

    if (hy >= H) return;
    // Ground below the horizon.
    var gg = ctx.createLinearGradient(0, hy, 0, H);
    gg.addColorStop(0, hsl(hue + 10, 70, 7));
    gg.addColorStop(1, hsl(hue - 10, 60, 3));
    ctx.fillStyle = gg;
    ctx.fillRect(0, hy, W, H - hy);

    // Receding synthwave grid (scrolls toward the viewer).
    var gridCol = theme.gridColor || '#ff4fd8';
    ctx.strokeStyle = gridCol;
    ctx.lineWidth = 1;
    var depth = H - hy;
    ctx.beginPath();
    var phase = (t * 0.35) % 1;
    for (var k = 0; k < 14; k++) {
      var z = (k + 1 - phase);
      var y = hy + depth * (1.2 / (z * 0.9 + 0.2)) * 0.18;
      if (y > H || y < hy) continue;
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
    }
    var cx = W / 2;
    for (var v = -16; v <= 16; v++) {
      ctx.moveTo(cx + v * W * 0.012, hy);
      ctx.lineTo(cx + v * W * 0.16, H + depth * 0.2);
    }
    ctx.globalAlpha = 0.16;
    ctx.stroke();
    ctx.globalAlpha = 1;
    // Fade the grid into the horizon haze.
    var haze = ctx.createLinearGradient(0, hy, 0, hy + Math.max(30, depth * 0.35));
    haze.addColorStop(0, hsla(hue + 10, 70, 7, 1));
    haze.addColorStop(1, hsla(hue + 10, 70, 7, 0));
    ctx.fillStyle = haze;
    ctx.fillRect(0, hy, W, Math.max(30, depth * 0.35));

    // Horizon glow line.
    var hc = theme.horizonColor || '#ff3d9a';
    var band = ctx.createLinearGradient(0, hy - 26, 0, hy + 26);
    band.addColorStop(0, 'rgba(0,0,0,0)');
    band.addColorStop(0.5, hc);
    band.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = 0.28;
    ctx.fillStyle = band;
    ctx.fillRect(0, hy - 26, W, 52);
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = hc;
    ctx.fillRect(0, hy - 0.5, W, 1.5);
    ctx.globalAlpha = 1;
  }

  R.drawVignette = function () {
    if (theme.vignette === false) return;
    ctx.fillStyle = cache.vignette;
    ctx.fillRect(0, 0, R.W, R.H);
  };

  // -------------------------------------------------------------- the floor
  /** Glowing grid platform on the ground plane, drawn with an iso affine transform. */
  R.drawFloor = function (floorElev, hue) {
    if (theme.gridFloor === false) return;
    var cam = R.cam, s = cam.s, d = R.dpr;
    var oy = cam.oy - floorElev * s;
    var ext = B * 3.2;
    if (oy - ext * s > R.H || oy + ext * s < 0) return;
    ctx.save();
    ctx.setTransform(d * COS * s, d * SIN * s, -d * COS * s, d * SIN * s, d * cam.ox, d * oy);
    // Light pool.
    var pool = ctx.createRadialGradient(0, 0, 0, 0, 0, ext);
    pool.addColorStop(0, hsla(hue, 100, 60, 0.30));
    pool.addColorStop(0.4, hsla(hue, 100, 55, 0.10));
    pool.addColorStop(1, hsla(hue, 100, 50, 0));
    ctx.fillStyle = pool;
    ctx.fillRect(-ext, -ext, ext * 2, ext * 2);
    // Grid lines.
    var step = B / 4;
    var n = Math.ceil(ext / step);
    var lines = ctx.createRadialGradient(0, 0, B * 0.5, 0, 0, ext);
    var gc = theme.gridColor || '#ff4fd8';
    lines.addColorStop(0, gc);
    lines.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.strokeStyle = lines;
    ctx.lineWidth = 1.1 / s;
    ctx.globalAlpha = 0.75;
    ctx.beginPath();
    for (var i = -n; i <= n; i++) {
      var p = i * step;
      ctx.moveTo(p, -ext);
      ctx.lineTo(p, ext);
      ctx.moveTo(-ext, p);
      ctx.lineTo(ext, p);
    }
    ctx.stroke();
    ctx.restore();
  };

  // ----------------------------------------------------------- the pedestal
  /** Tall dark column with neon trim under the first block. */
  R.drawPedestal = function (base, floorElev, hue) {
    var cam = R.cam, s = cam.s, ox = cam.ox, oy = cam.oy;
    var x0 = base.x - base.w / 2, x1 = base.x + base.w / 2;
    var z0 = base.z - base.d / 2, z1 = base.z + base.d / 2;
    var topE = 0;
    var lx = ox + (x0 - z1) * COS * s, ly = oy + (x0 + z1) * SIN * s - topE * s;
    var fx = ox + (x1 - z1) * COS * s, fy = oy + (x1 + z1) * SIN * s - topE * s;
    var rx = ox + (x1 - z0) * COS * s, ry = oy + (x1 + z0) * SIN * s - topE * s;
    var dh = (topE - floorElev) * s;
    if (ry > R.H + 2 || fy + dh < -2) return;
    var bottom = fy + dh;

    var gl = ctx.createLinearGradient(0, ly, 0, bottom);
    gl.addColorStop(0, hsl(hue, 45, 22));
    gl.addColorStop(1, hsl(hue + 30, 55, 6));
    ctx.fillStyle = gl;
    ctx.beginPath();
    ctx.moveTo(lx, ly); ctx.lineTo(fx, fy); ctx.lineTo(fx, fy + dh); ctx.lineTo(lx, ly + dh); ctx.closePath();
    ctx.fill();
    var gr = ctx.createLinearGradient(0, ry, 0, bottom);
    gr.addColorStop(0, hsl(hue + 10, 45, 13));
    gr.addColorStop(1, hsl(hue + 30, 55, 4));
    ctx.fillStyle = gr;
    ctx.beginPath();
    ctx.moveTo(fx, fy); ctx.lineTo(rx, ry); ctx.lineTo(rx, ry + dh); ctx.lineTo(fx, fy + dh); ctx.closePath();
    ctx.fill();

    // Horizontal light bands every few levels.
    var lw = clamp(s * 0.8, 0.5, 1.5);
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = hsla(hue, 100, 65, 0.16);
    ctx.lineWidth = lw;
    ctx.beginPath();
    for (var e = BH * 2; e < topE - floorElev; e += BH * 2) {
      var yy = e * s;
      ctx.moveTo(lx, ly + yy); ctx.lineTo(fx, fy + yy); ctx.lineTo(rx, ry + yy);
    }
    ctx.stroke();
    // Neon vertical edges, fading toward the floor.
    var edge = ctx.createLinearGradient(0, fy, 0, bottom);
    edge.addColorStop(0, hsla(hue, 100, 75, 0.95));
    edge.addColorStop(1, hsla(hue, 100, 60, 0.15));
    ctx.strokeStyle = edge;
    ctx.lineWidth = lw * 1.4;
    ctx.beginPath();
    ctx.moveTo(fx, fy); ctx.lineTo(fx, bottom);
    ctx.moveTo(lx, ly); ctx.lineTo(lx, ly + dh);
    ctx.moveTo(rx, ry); ctx.lineTo(rx, ry + dh);
    ctx.stroke();
    ctx.globalCompositeOperation = 'source-over';
  };

  // --------------------------------------------------------------- blocks
  var P = new Float64Array(8); // projected top-face corners: back, right, front, left (x,y pairs)

  /**
   * Draw one cuboid. (x, z) = centre, w along x, d along z, e0 = bottom elevation, hh = height.
   * col = R.colorsFor(level). flash 0..1 = white hit flash on the top face.
   * Returns false when culled (off screen).
   */
  function drawCuboid(x, z, w, d, e0, hh, col, flash, edgeBoost) {
    var cam = R.cam, s = cam.s, ox = cam.ox, oy = cam.oy;
    var x0 = x - w / 2, x1 = x + w / 2, z0 = z - d / 2, z1 = z + d / 2;
    var et = (e0 + hh) * s;
    P[0] = ox + (x0 - z0) * COS * s; P[1] = oy + (x0 + z0) * SIN * s - et; // back
    P[2] = ox + (x1 - z0) * COS * s; P[3] = oy + (x1 + z0) * SIN * s - et; // right
    P[4] = ox + (x1 - z1) * COS * s; P[5] = oy + (x1 + z1) * SIN * s - et; // front
    P[6] = ox + (x0 - z1) * COS * s; P[7] = oy + (x0 + z1) * SIN * s - et; // left
    var dh = hh * s;
    if (P[1] > R.H + 4 || P[5] + dh < -4) return false;
    if (P[2] < -4 || P[6] > R.W + 4) return false;

    // Silhouette in the darkest face colour (avoids anti-aliasing seams), then the lit faces.
    ctx.fillStyle = col.right;
    ctx.beginPath();
    ctx.moveTo(P[6], P[7]); ctx.lineTo(P[0], P[1]); ctx.lineTo(P[2], P[3]);
    ctx.lineTo(P[2], P[3] + dh); ctx.lineTo(P[4], P[5] + dh); ctx.lineTo(P[6], P[7] + dh);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = col.left;
    ctx.beginPath();
    ctx.moveTo(P[6], P[7]); ctx.lineTo(P[4], P[5]); ctx.lineTo(P[4], P[5] + dh); ctx.lineTo(P[6], P[7] + dh);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = col.top;
    ctx.beginPath();
    ctx.moveTo(P[0], P[1]); ctx.lineTo(P[2], P[3]); ctx.lineTo(P[4], P[5]); ctx.lineTo(P[6], P[7]);
    ctx.closePath();
    ctx.fill();
    if (flash > 0.01) {
      ctx.globalAlpha = Math.min(1, flash);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    var lw = clamp(s * 0.75, 0.45, 1.6);
    if (theme.neonEdges !== false) {
      // Neon edge = wide faint stroke + thin bright stroke (cheap fake glow, no shadowBlur).
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = col.glow;
      ctx.lineWidth = lw * (3.2 + (edgeBoost || 0) * 2);
      ctx.lineJoin = 'round';
      ctx.stroke();
      ctx.strokeStyle = col.edge;
      ctx.lineWidth = lw;
      ctx.stroke();
      ctx.globalCompositeOperation = 'source-over';
    }
    // Crisp highlight on the front vertical corner.
    ctx.strokeStyle = 'rgba(255,255,255,0.28)';
    ctx.lineWidth = lw * 0.8;
    ctx.beginPath();
    ctx.moveTo(P[4], P[5]);
    ctx.lineTo(P[4], P[5] + dh);
    ctx.stroke();
    return true;
  }
  R.drawCuboid = drawCuboid;

  /** Draw a placed tower block, including its squash / regrow bump / flash animations. */
  R.drawBlock = function (b, time) {
    var hh = BH, w = b.w, d = b.d, flash = 0;
    var t = time - b.placedAt;
    if (t < 0.3) {
      var k = Math.sin((t / 0.3) * Math.PI) * (1 - t / 0.3);
      hh = BH * (1 - 0.3 * k);
      w *= 1 + 0.035 * k;
      d *= 1 + 0.035 * k;
      flash = b.flash * (1 - t / 0.3);
    }
    var tg = time - b.grewAt;
    if (tg < 0.35) {
      var kb = Math.sin((tg / 0.35) * Math.PI);
      if (b.growAxis === 'x') w *= 1 + 0.07 * kb; else d *= 1 + 0.07 * kb;
    }
    return drawCuboid(b.x, b.z, w, d, b.level * BH, hh, b.col, flash, 0);
  };

  /** Top-face outline path of a rectangle at elevation e (for ripples). */
  R.pathRect = function (x, z, w, d, e) {
    var cam = R.cam, s = cam.s, ox = cam.ox, oy = cam.oy;
    var x0 = x - w / 2, x1 = x + w / 2, z0 = z - d / 2, z1 = z + d / 2;
    var ey = e * s;
    ctx.beginPath();
    ctx.moveTo(ox + (x0 - z0) * COS * s, oy + (x0 + z0) * SIN * s - ey);
    ctx.lineTo(ox + (x1 - z0) * COS * s, oy + (x1 + z0) * SIN * s - ey);
    ctx.lineTo(ox + (x1 - z1) * COS * s, oy + (x1 + z1) * SIN * s - ey);
    ctx.lineTo(ox + (x0 - z1) * COS * s, oy + (x0 + z1) * SIN * s - ey);
    ctx.closePath();
  };

  /** World → screen. Writes into out.x / out.y. */
  R.project = function (x, z, e, out) {
    var cam = R.cam;
    out.x = cam.ox + (x - z) * COS * cam.s;
    out.y = cam.oy + (x + z) * SIN * cam.s - e * cam.s;
    return out;
  };

  /** Solid colour fill of the whole screen (fade transitions). */
  R.fillScreen = function (color, alpha) {
    if (alpha <= 0.001) return;
    ctx.globalAlpha = Math.min(1, alpha);
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, R.W, R.H);
    ctx.globalAlpha = 1;
  };

  M.render = R;
})();
