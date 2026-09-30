/*
 * game.js — Cosmic Merge core: layout, jar, dropper, merges, scoring, demo bot,
 * canvas HUD and the DOM screens. Uses the modules registered on
 * window.__GAME__.lib by storage.js, audio.js, sprites.js and physics.js.
 *
 * World units: the jar's inner width is JAR_W units, y grows downward, the jar
 * rim is at y = 0 and the floor at y = JAR_H. Everything is drawn in world units
 * through one canvas transform, so the whole game scales to any screen.
 *
 * Rounds are driven by one of three pilots:
 *   'player' — a real game (Play button)
 *   'title'  — the bot filling the jar behind the title screen
 *   'demo'   — the bot in ?demo=1 attract mode (trailers, screenshots)
 */
(function () {
  'use strict';
  var G = window.__GAME__;
  var L = G.lib;
  var cfg = window.GAME_CONFIG;
  var storage = L.storage;
  var audio = L.audio;
  var sprites = L.sprites;
  var th = cfg.theme;
  var P = cfg.physics;
  var D = cfg.dropper;
  var RULES = cfg.rules;
  var BOT = cfg.bot || {};
  var T = cfg.texts;
  var hooks = cfg.hooks || {};
  var TIERS = cfg.tiers;
  var LAST = TIERS.length - 1;
  var MAX_DROP = Math.max.apply(null, D.droppableTiers);

  var JAR_W = 400;
  var JAR_H = Math.round(JAR_W * (RULES.jarAspect || 1.3));
  var DROP_ZONE = JAR_W * 0.36;
  var FLOOR_ZONE = JAR_W * 0.06;
  var WALL = 9;
  var DANGER_Y = JAR_H * (RULES.dangerLine == null ? 0.045 : RULES.dangerLine);
  var UFO_Y = -DROP_ZONE + 30;
  var FONT = '"Avenir Next", "Nunito", "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
  var TAU = Math.PI * 2;

  var DEMO = /[?&]demo=1\b/.test(location.search) || /^#demo\b/.test(location.hash);
  var REDUCED = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var SHAKE = cfg.screenShake !== false && !REDUCED;
  var COARSE = !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);

  var world = new L.World({
    left: 0,
    right: JAR_W,
    floor: JAR_H,
    gravity: P.gravity * JAR_W,
    substeps: P.substeps,
    iterations: P.iterations,
    airDamping: P.airDamping,
    friction: P.friction,
    restitution: P.restitution,
    maxSpeed: P.maxSpeed * JAR_W,
    restSpeed: P.restSpeed * JAR_W,
    growTime: P.mergeGrowTime
  });

  // ------------------------------------------------------------------ state
  var screen = DEMO ? 'playing' : 'title';
  var pilot = DEMO ? 'demo' : 'title';
  var score = 0;
  var shownScore = 0;
  var best = storage.get('best', 0) || 0;
  var bestTier = storage.get('bestTier', 0) || 0;
  var newBest = false;
  var current = 0;
  var next = 0;
  var cooldown = 0;
  var heldScale = 1;
  var aimX = JAR_W / 2;
  var ufoX = JAR_W / 2;
  var keyDir = 0;
  var pressing = false;
  var discovered = [];
  var highest = 0;
  var combo = 0;
  var comboTimer = 0;
  var over = false;
  var overTimer = 0;
  var overlayShown = false;
  var restartQueued = false;
  var warnLevel = 0;
  var nearLevel = 0;
  var warnBeepAt = 0;
  var botTarget = null;
  var botWait = 0;
  var time = 0;
  var acc = 0;
  var shake = 0;
  var fadeAlpha = DEMO ? 1 : 0;
  var fadeDir = DEMO ? -1 : 0;
  var fadeCb = null;
  var inputBlockedUntil = 0;

  // ------------------------------------------------------------------ helpers
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function now() { return (window.performance && performance.now()) || Date.now(); }
  function radiusOf(t) { return TIERS[t].radius * JAR_W; }
  function text(key, fallback) { return T[key] == null ? fallback : T[key]; }

  function callHook(name, arg) {
    try {
      if (typeof hooks[name] === 'function') return hooks[name](arg);
    } catch (e) {
      if (window.console) console.error('Cosmic Merge hook "' + name + '" failed:', e);
    }
    return undefined;
  }

  function pickTier() {
    var tiers = D.droppableTiers;
    var weights = D.weights || [];
    var total = 0;
    var i;
    for (i = 0; i < tiers.length; i++) total += weights[i] == null ? 1 : weights[i];
    var r = Math.random() * total;
    for (i = 0; i < tiers.length; i++) {
      r -= weights[i] == null ? 1 : weights[i];
      if (r <= 0) return tiers[i];
    }
    return tiers[0];
  }

  // ------------------------------------------------------------------ pools
  function pool(n, make) {
    var arr = [];
    for (var i = 0; i < n; i++) { var o = make(); o.on = false; arr.push(o); }
    return arr;
  }
  function take(arr) {
    for (var i = 0; i < arr.length; i++) if (!arr[i].on) return arr[i];
    var oldest = arr[0];
    for (var j = 1; j < arr.length; j++) if (arr[j].age / arr[j].life > oldest.age / oldest.life) oldest = arr[j];
    return oldest;
  }
  var parts = pool(320, function () { return { x: 0, y: 0, vx: 0, vy: 0, age: 0, life: 1, size: 1, img: null }; });
  var rings = pool(20, function () { return { x: 0, y: 0, r0: 0, r1: 0, age: 0, life: 1, color: '#fff', width: 1 }; });
  var texts = pool(14, function () { return { str: '', x: 0, y: 0, age: 0, life: 1, color: '#fff', size: 20, banner: false, icon: -1 }; });

  function burst(x, y, tier, count, power) {
    if (cfg.particles === false) return;
    var dots = sprites.dots(tier);
    var R = radiusOf(tier);
    for (var i = 0; i < count; i++) {
      var p = take(parts);
      var a = Math.random() * TAU;
      var sp = (0.5 + Math.random()) * JAR_W * 0.55 * power;
      p.on = true;
      p.x = x + Math.cos(a) * R * 0.6;
      p.y = y + Math.sin(a) * R * 0.6;
      p.vx = Math.cos(a) * sp;
      p.vy = Math.sin(a) * sp - JAR_W * 0.15;
      p.age = 0;
      p.life = 0.45 + Math.random() * 0.55;
      p.size = (5 + Math.random() * 9) * (0.8 + power * 0.4);
      p.img = dots[i % 3];
    }
  }

  function ring(x, y, r0, r1, color, life, width) {
    var o = take(rings);
    o.on = true;
    o.x = x; o.y = y; o.r0 = r0; o.r1 = r1; o.color = color; o.age = 0; o.life = life; o.width = width;
  }

  function floatText(str, x, y, color, size, life) {
    var o = take(texts);
    o.on = true;
    o.banner = false;
    o.str = str; o.x = x; o.y = y; o.color = color; o.size = size; o.age = 0; o.life = life || 1; o.icon = -1;
  }

  function banner(str, icon) {
    for (var i = 0; i < texts.length; i++) if (texts[i].banner) texts[i].on = false;
    var o = take(texts);
    o.on = true;
    o.banner = true;
    o.str = str; o.icon = icon; o.age = 0; o.life = 2.2; o.color = th.accent; o.size = 30;
  }

  // ------------------------------------------------------------------ bodies
  function spawn(tier, x, y, vx, vy, growFrom) {
    var b = world.add(tier, radiusOf(tier), x, y, vx, vy, growFrom);
    b.blinkAt = time + 1 + Math.random() * 4;
    b.surprisedUntil = 0;
    b.happyUntil = 0;
    b.born = time;
    b.overT = 0;
    return b;
  }

  /** Centre y at which a falling circle of radius r at x first touches the pile. */
  function landingY(x, r) {
    var y = JAR_H - r;
    var list = world.bodies;
    for (var i = 0; i < list.length; i++) {
      var b = list[i];
      var dx = Math.abs(b.x - x);
      var rr = b.r + r;
      if (dx >= rr) continue;
      var cy = b.y - Math.sqrt(rr * rr - dx * dx);
      if (cy < y) y = cy;
    }
    return y;
  }

  function heldY(tier) {
    return UFO_Y + 22 + radiusOf(tier);
  }

  function resetJar() {
    world.clear();
    score = 0;
    shownScore = 0;
    newBest = false;
    discovered = [];
    highest = 0;
    combo = 0;
    comboTimer = 0;
    over = false;
    overTimer = 0;
    overlayShown = false;
    restartQueued = false;
    warnLevel = 0;
    nearLevel = 0;
    cooldown = 0.35;
    heldScale = 0;
    botTarget = null;
    botWait = 0.6;
    shake = 0;
    acc = 0;
    for (var i = 0; i <= MAX_DROP; i++) discovered[i] = i === 0;
    current = pickTier();
    next = pickTier();
    aimX = ufoX = JAR_W / 2;
    var lists = [parts, rings, texts];
    for (var l = 0; l < lists.length; l++) for (var j = 0; j < lists[l].length; j++) lists[l][j].on = false;
  }

  function drop() {
    if (over || cooldown > 0) return false;
    var r = radiusOf(current);
    var x = clamp(aimX, r, JAR_W - r);
    aimX = ufoX = x;
    var b = spawn(current, x, heldY(current), 0, JAR_W * 0.2, null);
    b.surprisedUntil = time + 0.35;
    current = next;
    next = pickTier();
    cooldown = D.cooldown || 0.5;
    heldScale = 0;
    combo = 0;          // combos count chain reactions of one drop only
    comboTimer = 0;
    audio.sfx.drop();
    if (pilot === 'player') hideHint();
    return true;
  }

  // ------------------------------------------------------------------ merges
  function processMerges() {
    var list = world.merges;
    if (!list.length) return;
    for (var i = 0; i < list.length; i++) {
      var a = list[i][0];
      var b = list[i][1];
      if (a.dead || b.dead) continue;
      a.dead = b.dead = true;
      var ma = 1 / a.im;
      var mb = 1 / b.im;
      var m = ma + mb;
      var x = (a.x * ma + b.x * mb) / m;
      var y = (a.y * ma + b.y * mb) / m;
      if (a.tier >= LAST) {
        bigBang(x, y);
        continue;
      }
      var t = a.tier + 1;
      var nb = spawn(t, x, y, (a.vx * ma + b.vx * mb) / m, ((a.vy * ma + b.vy * mb) / m) * 0.5, a.R / radiusOf(t));
      nb.happyUntil = time + 0.9;
      onMerge(t, x, y);
    }
    list.length = 0;
    world.removeDead();
  }

  function addScore(points) {
    score += points;
    if (pilot === 'player' && score > best) {
      best = score;
      newBest = true;
      storage.set('best', best);
    }
  }

  function onMerge(t, x, y) {
    combo = comboTimer > 0 ? combo + 1 : 1;
    comboTimer = RULES.comboWindow || 1;
    var mult = Math.min(RULES.comboMaxMultiplier || 5, combo);
    var points = TIERS[t].score * mult;
    addScore(points);
    var c = TIERS[t].colors;
    var R = radiusOf(t);
    burst(x, y, t, 10 + t * 3, 0.6 + t * 0.06);
    ring(x, y, R * 0.6, R * 1.9, c[2] || '#fff', 0.45, 5 + t * 0.6);
    floatText('+' + points, x, y - R * 0.2, '#ffffff', 20 + t * 1.6, 0.9);
    if (combo >= 2) floatText(text('combo', 'COMBO ×{n}').replace('{n}', combo), x, y - R - 16, th.accent, 22 + Math.min(combo, 6) * 2, 1.1);
    if (t >= 8) audio.sfx.big(t); else audio.sfx.merge(t, combo);
    if (SHAKE) shake = Math.max(shake, clamp(0.08 + t * 0.07, 0, 0.9) * (cfg.shakeStrength || 1));
    if (!discovered[t]) {
      discovered[t] = true;
      if (t > MAX_DROP) {
        banner(text('newTier', 'NEW: {name}!').replace('{name}', TIERS[t].name), t);
        audio.sfx.newTier();
        if (pilot === 'player') callHook('onLevelUp', t);
      }
    }
    if (t > highest) highest = t;
    if (pilot === 'player' && t > bestTier) {
      bestTier = t;
      storage.set('bestTier', bestTier);
    }
    var list = world.bodies;
    for (var i = 0; i < list.length; i++) {
      var o = list[i];
      if (o.dead) continue;
      var dx = o.x - x, dy = o.y - y;
      if (dx * dx + dy * dy < (R * 2.2) * (R * 2.2)) o.surprisedUntil = Math.max(o.surprisedUntil, time + 0.4);
    }
  }

  function bigBang(x, y) {
    addScore(RULES.blackHoleBonus || 1000);
    world.blast(x, y, JAR_W * 0.7, JAR_W * 2.2);
    burst(x, y, LAST, 90, 2.2);
    burst(x, y, LAST - 1, 60, 1.6);
    ring(x, y, 20, JAR_W * 1.2, '#ffffff', 0.9, 14);
    ring(x, y, 10, JAR_W * 0.8, TIERS[LAST].colors[3] || '#b26bff', 1.1, 10);
    floatText(text('bigBang', 'BIG BANG!'), x, y, th.accent, 44, 1.6);
    audio.sfx.bigBang();
    if (SHAKE) shake = 1;
  }

  // ------------------------------------------------------------------ rules
  function checkOverflow(dt) {
    var worst = 0;
    var near = 0;
    var list = world.bodies;
    var grace = RULES.graceSeconds == null ? 1 : RULES.graceSeconds;
    for (var i = 0; i < list.length; i++) {
      var b = list[i];
      if (b.age < grace) { b.overT = 0; continue; }
      var topY = b.y - b.r;
      if (topY < DANGER_Y) {
        b.overT += dt;
        if (b.overT > worst) worst = b.overT;
      } else {
        b.overT = 0;
      }
      var closeness = 1 - clamp((topY - DANGER_Y) / (JAR_H * 0.14), 0, 1);
      if (closeness > near) near = closeness;
    }
    var limit = RULES.overflowSeconds || 2.5;
    warnLevel = worst / limit;
    nearLevel = near;
    if (worst > 0 && time >= warnBeepAt) {
      audio.sfx.warn(Math.min(2, Math.floor(warnLevel * 3)));
      warnBeepAt = time + 0.5 - warnLevel * 0.25;
    }
    if (worst >= limit) gameOver();
  }

  function gameOver() {
    if (over) return;
    over = true;
    overTimer = 0;
    audio.sfx.gameOver();
    if (SHAKE) shake = Math.max(shake, 0.6);
    var list = world.bodies;
    for (var i = 0; i < list.length; i++) list[i].surprisedUntil = time + 3;
    if (pilot === 'player') {
      screen = 'gameover';
      hideHint();
      callHook('onGameOver', score);
    }
  }

  // ------------------------------------------------------------------ demo bot
  function exposed(b) {
    var list = world.bodies;
    for (var i = 0; i < list.length; i++) {
      var c = list[i];
      if (c === b || c.dead) continue;
      if (c.y < b.y - b.r * 0.3 && Math.abs(c.x - b.x) < (c.r + b.r) * 0.85) return false;
    }
    return true;
  }

  function botChooseX() {
    var r = radiusOf(current);
    var list = world.bodies;
    var target = null;
    for (var i = 0; i < list.length; i++) {
      var b = list[i];
      if (b.dead || b.tier !== current || !exposed(b)) continue;
      if (!target || b.y < target.y) target = b;
    }
    if (target && Math.random() < 0.85) return clamp(target.x + (Math.random() - 0.5) * r * 0.4, r, JAR_W - r);
    var bestX = JAR_W / 2;
    var bestY = -Infinity;
    for (var k = 0; k < 8; k++) {
      var x = r + Math.random() * (JAR_W - 2 * r);
      var y = landingY(x, r) + Math.random() * r * 0.8;
      if (y > bestY) { bestY = y; bestX = x; }
    }
    return bestX;
  }

  function updateBot(dt) {
    if (over) return;
    if (botTarget === null) {
      botWait -= dt;
      if (botWait <= 0 && cooldown <= 0) botTarget = botChooseX();
      return;
    }
    aimX = botTarget;
    if (Math.abs(ufoX - botTarget) < 1.5 && cooldown <= 0) {
      drop();
      botTarget = null;
      botWait = (BOT.dropInterval || 0.8) * (pilot === 'title' ? 1.35 : 1) * (0.75 + Math.random() * 0.5);
    }
  }

  // ------------------------------------------------------------------ update
  function update(dt) {
    time += dt;
    if (screen === 'paused') return;

    if (pilot !== 'player') updateBot(dt);
    else if (keyDir !== 0) aimX = clamp(aimX + keyDir * (D.keyboardSpeed || 1.1) * JAR_W * dt, 0, JAR_W);

    var r = radiusOf(current);
    aimX = clamp(aimX, r, JAR_W - r);
    ufoX += (aimX - ufoX) * (1 - Math.exp(-(D.followSharpness || 22) * dt));
    if (cooldown > 0) cooldown -= dt;
    if (cooldown <= 0 && heldScale < 1) heldScale = Math.min(1, heldScale + dt * 5);

    var step = 1 / (P.stepHz || 120);
    acc = Math.min(acc + dt, step * 8);
    while (acc >= step) {
      acc -= step;
      world.step(step);
      processMerges();
    }

    var list = world.bodies;
    for (var i = 0; i < list.length; i++) {
      var b = list[i];
      if (b.impact > JAR_W * 0.9) {
        audio.sfx.bump(b.impact / (JAR_W * 3));
        b.surprisedUntil = Math.max(b.surprisedUntil, time + 0.35);
      }
    }

    if (comboTimer > 0) comboTimer -= dt;
    if (!over) checkOverflow(dt);
    if (shake > 0) shake = Math.max(0, shake - dt * 1.8);
    shownScore += (score - shownScore) * (1 - Math.exp(-10 * dt));
    if (Math.abs(score - shownScore) < 0.5) shownScore = score;

    updatePools(dt);

    if (over) {
      overTimer += dt;
      if (pilot === 'player') {
        if (!overlayShown && overTimer >= 0.9) {
          overlayShown = true;
          showGameOver();
        }
      } else if (!restartQueued && overTimer >= (BOT.restartDelay || 1.5)) {
        restartQueued = true;
        fadeThen(resetJar);
      }
    }

    if (fadeDir === 1) {
      fadeAlpha += dt / 0.25;
      if (fadeAlpha >= 1) {
        fadeAlpha = 1;
        fadeDir = -1;
        var cb = fadeCb;
        fadeCb = null;
        if (cb) cb();
      }
    } else if (fadeDir === -1) {
      fadeAlpha -= dt / 0.35;
      if (fadeAlpha <= 0) { fadeAlpha = 0; fadeDir = 0; }
    }
  }

  function fadeThen(cb) {
    fadeDir = 1;
    fadeCb = cb;
  }

  function updatePools(dt) {
    var i, o;
    for (i = 0; i < parts.length; i++) {
      o = parts[i];
      if (!o.on) continue;
      o.age += dt;
      if (o.age >= o.life) { o.on = false; continue; }
      o.vx *= 1 - 2.2 * dt;
      o.vy = o.vy * (1 - 2.2 * dt) + JAR_W * 0.6 * dt;
      o.x += o.vx * dt;
      o.y += o.vy * dt;
    }
    for (i = 0; i < rings.length; i++) {
      o = rings[i];
      if (!o.on) continue;
      o.age += dt;
      if (o.age >= o.life) o.on = false;
    }
    for (i = 0; i < texts.length; i++) {
      o = texts[i];
      if (!o.on) continue;
      o.age += dt;
      if (o.age >= o.life) o.on = false;
    }
  }

  // ------------------------------------------------------------------ layout
  var canvas = document.getElementById('game');
  var ctx = canvas.getContext('2d');
  var W = 1, H = 1, dpr = 1, k = 1, jarX = 0, jarY = 0, wide = false;
  var builtK = 1;
  var rebuildTimer = 0;
  var hudRects = { score: null, next: null, evo: null, evoCols: 11 };
  var bg = null;
  var stars = [];

  function layout() {
    W = Math.max(1, window.innerWidth);
    H = Math.max(1, window.innerHeight);
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    wide = W / H > 0.9;
    var worldH = DROP_ZONE + JAR_H + FLOOR_ZONE;
    if (!wide) {
      var hudH = 58;
      var evoH = clamp((W - 32) / 11, 26, 42) + 22;
      var availH = H - 12 - hudH - evoH - 16;
      k = Math.min((W - 24) / (JAR_W + WALL * 2), availH / worldH);
      jarX = (W - JAR_W * k) / 2;
      var used = worldH * k;
      jarY = 12 + hudH + Math.max(0, (availH - used) * 0.45) + DROP_ZONE * k;
      hudRects.score = { x: 12, y: 12, w: Math.min(150, W * 0.36), h: hudH };
      hudRects.next = { x: W - 12 - 104 - 10 - 78, y: 12, w: 78, h: hudH };
      hudRects.evo = { x: 12, y: H - evoH - 6, w: W - 24, h: evoH };
      hudRects.evoCols = 11;
    } else {
      k = Math.min((W - 2 * 210 - 32) / (JAR_W + WALL * 2), (H - 28) / worldH);
      jarX = (W - JAR_W * k) / 2;
      jarY = (H - worldH * k) / 2 + DROP_ZONE * k;
      var side = jarX - WALL * k;
      var pw = clamp(side - 40, 150, 250);
      var leftX = (side - pw) / 2;
      var rightX = W - side + (side - pw) / 2;
      var topY = Math.max(76, jarY - DROP_ZONE * k * 0.35);
      hudRects.score = { x: leftX, y: topY, w: pw, h: 96 };
      hudRects.next = { x: rightX, y: topY, w: pw, h: 104 };
      hudRects.evoCols = pw > 210 ? 4 : 3;
      var rows = Math.ceil(TIERS.length / hudRects.evoCols);
      var cell = (pw - 24) / hudRects.evoCols;
      hudRects.evo = { x: rightX, y: topY + 104 + 14, w: pw, h: rows * cell + 40 };
      document.documentElement.style.setProperty('--side-w', Math.round(side) + 'px');
    }
    buildBackground();
    clearTimeout(rebuildTimer);
    var kd = k * dpr;
    if (!sprites.tier(0) || Math.abs(kd - builtK) / builtK > 0.02) {
      if (!sprites.tier(0)) rebuildSprites();
      else rebuildTimer = setTimeout(rebuildSprites, 160);
    }
  }

  function rebuildSprites() {
    builtK = k * dpr;
    sprites.build(builtK, JAR_W);
  }

  function buildBackground() {
    var nebula = null;
    if (th.nebula !== false) {
      nebula = document.createElement('canvas');
      nebula.width = 256;
      nebula.height = 256;
      var n = nebula.getContext('2d');
      var cols = th.nebulaColors || ['#7c3aed', '#ff4fa3', '#22d3ee'];
      var blobs = [[0.25, 0.3, 0.45], [0.75, 0.25, 0.4], [0.6, 0.75, 0.5], [0.2, 0.8, 0.35], [0.5, 0.5, 0.3]];
      for (var i = 0; i < blobs.length; i++) {
        var bl = blobs[i];
        var g = n.createRadialGradient(bl[0] * 256, bl[1] * 256, 0, bl[0] * 256, bl[1] * 256, bl[2] * 256);
        g.addColorStop(0, sprites.rgba(cols[i % cols.length], 0.55));
        g.addColorStop(1, sprites.rgba(cols[i % cols.length], 0));
        n.fillStyle = g;
        n.fillRect(0, 0, 256, 256);
      }
    }
    var grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, th.bgTop);
    grad.addColorStop(1, th.bgBottom);
    bg = { grad: grad, nebula: nebula };
    if (!stars.length) {
      for (var s = 0; s < 150; s++) {
        stars.push({ x: Math.random(), y: Math.random(), r: Math.random() < 0.12 ? 1.5 : 0.5 + Math.random() * 0.8, p: Math.random() * TAU, sp: 0.5 + Math.random() * 2.5 });
      }
    }
  }

  // ------------------------------------------------------------------ drawing
  function drawImg(img, x, y, angle, sc) {
    var w = (img.width * sc) / builtK;
    var h = (img.height * sc) / builtK;
    if (angle) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.drawImage(img, -w / 2, -h / 2, w, h);
      ctx.restore();
    } else {
      ctx.drawImage(img, x - w / 2, y - h / 2, w, h);
    }
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function drawBackground() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = bg.grad;
    ctx.fillRect(0, 0, W, H);
    if (bg.nebula) {
      var m = Math.max(W, H) * 1.3;
      ctx.globalAlpha = 0.55;
      ctx.globalCompositeOperation = 'lighter';
      ctx.drawImage(bg.nebula, W / 2 - m / 2 + Math.sin(time * 0.05) * m * 0.06, H / 2 - m / 2 + Math.cos(time * 0.04) * m * 0.05, m, m);
      ctx.globalAlpha = 0.3;
      ctx.drawImage(bg.nebula, W / 2 - m * 0.4, H / 2 - m * 0.4, m * 0.8, m * 0.8);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
    }
    if (th.stars !== false) {
      ctx.fillStyle = '#ffffff';
      for (var i = 0; i < stars.length; i++) {
        var st = stars[i];
        ctx.globalAlpha = (0.35 + 0.65 * (0.5 + 0.5 * Math.sin(time * st.sp + st.p))) * (st.r > 1 ? 1 : 0.7);
        ctx.fillRect(st.x * W, st.y * H, st.r, st.r);
      }
      ctx.globalAlpha = 1;
    }
  }

  function setWorldTransform(sx, sy) {
    ctx.setTransform(dpr * k, 0, 0, dpr * k, dpr * (jarX + sx), dpr * (jarY + sy));
  }

  function jarPath(inset) {
    var r = 26;
    var x0 = -inset, x1 = JAR_W + inset, y0 = -18, y1 = JAR_H + inset;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x0, y1 - r);
    ctx.quadraticCurveTo(x0, y1, x0 + r, y1);
    ctx.lineTo(x1 - r, y1);
    ctx.quadraticCurveTo(x1, y1, x1, y1 - r);
    ctx.lineTo(x1, y0);
  }

  function drawJarBack() {
    var glow = ctx.createRadialGradient(JAR_W / 2, JAR_H + 10, 10, JAR_W / 2, JAR_H + 10, JAR_W * 0.75);
    glow.addColorStop(0, sprites.rgba(th.jarFloorGlow, 0.5));
    glow.addColorStop(1, sprites.rgba(th.jarFloorGlow, 0));
    ctx.fillStyle = glow;
    ctx.fillRect(-JAR_W * 0.3, JAR_H * 0.5, JAR_W * 1.6, JAR_H * 0.75);
    jarPath(0);
    ctx.closePath();
    var fill = ctx.createLinearGradient(0, 0, 0, JAR_H);
    fill.addColorStop(0, 'rgba(255,255,255,0.015)');
    fill.addColorStop(1, th.jarFill);
    ctx.fillStyle = fill;
    ctx.fill();
  }

  function drawJarFront() {
    jarPath(WALL / 2);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.strokeStyle = sprites.rgba(th.jarWall, 0.18);
    ctx.lineWidth = WALL * 2.2;
    ctx.stroke();
    ctx.strokeStyle = sprites.rgba(th.jarWall, 0.55);
    ctx.lineWidth = WALL;
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = 1.6;
    jarPath(1);
    ctx.stroke();
    // Glass reflection: a soft vertical sheen along the left wall.
    var sheen = ctx.createLinearGradient(0, 0, JAR_W * 0.12, 0);
    sheen.addColorStop(0, 'rgba(255,255,255,0.10)');
    sheen.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = sheen;
    ctx.fillRect(2, 0, JAR_W * 0.12, JAR_H * 0.85);
    // Glowing rim caps.
    for (var s = 0; s < 2; s++) {
      var cx = s === 0 ? -WALL / 2 : JAR_W + WALL / 2;
      var g = ctx.createRadialGradient(cx, -18, 0, cx, -18, 26);
      g.addColorStop(0, sprites.rgba(th.jarRim, 0.9));
      g.addColorStop(1, sprites.rgba(th.jarRim, 0));
      ctx.fillStyle = g;
      ctx.fillRect(cx - 26, -44, 52, 52);
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(cx, -18, WALL * 0.55, 0, TAU);
      ctx.fill();
    }
  }

  function drawDangerLine() {
    var danger = warnLevel > 0;
    var level = danger ? 1 : nearLevel;
    var pulse = 0.5 + 0.5 * Math.sin(time * (danger ? 14 : 5));
    ctx.save();
    ctx.setLineDash([10, 9]);
    ctx.lineDashOffset = -time * 20;
    ctx.lineWidth = 2.5 + (danger ? 2 * pulse : 0);
    ctx.strokeStyle = level > 0.05 ? sprites.rgba(th.dangerColor, 0.35 + 0.6 * level * (danger ? pulse : 0.7)) : th.dangerIdle;
    ctx.beginPath();
    ctx.moveTo(4, DANGER_Y);
    ctx.lineTo(JAR_W - 4, DANGER_Y);
    ctx.stroke();
    ctx.restore();
    if (danger) {
      // Countdown ring at the right end of the line.
      var cx = JAR_W - 22, cy = DANGER_Y + 24;
      ctx.lineWidth = 5;
      ctx.strokeStyle = 'rgba(255,255,255,0.18)';
      ctx.beginPath();
      ctx.arc(cx, cy, 13, 0, TAU);
      ctx.stroke();
      ctx.strokeStyle = th.dangerColor;
      ctx.beginPath();
      ctx.arc(cx, cy, 13, -Math.PI / 2, -Math.PI / 2 + TAU * clamp(warnLevel, 0, 1));
      ctx.stroke();
      ctx.fillStyle = sprites.rgba(th.dangerColor, 0.08 + 0.1 * pulse);
      ctx.fillRect(0, 0, JAR_W, DANGER_Y + 30);
    }
  }

  function faceFor(b) {
    if (time < b.happyUntil) return 3;
    if (time < b.surprisedUntil) return 2;
    if (time > b.blinkAt) {
      if (time > b.blinkAt + 0.13) b.blinkAt = time + 2 + Math.random() * 4;
      return 1;
    }
    return 0;
  }

  function drawBody(tier, x, y, angle, sc, face) {
    var set = sprites.tier(tier);
    if (!set) return;
    if (set.glow) drawImg(set.glow, x, y, 0, sc * (1 + 0.05 * Math.sin(time * 3 + tier)));
    if (set.fx) drawImg(set.fx, x, y, set.style === 'sun' ? time * 0.25 : -time * 1.8, sc);
    drawImg(set.surface, x, y, angle, sc);
    if (set.faces) drawImg(set.faces[face], x, y, angle, sc);
    if (set.shade) drawImg(set.shade, x, y, 0, sc);
  }

  function drawBodies() {
    var list = world.bodies;
    for (var i = 0; i < list.length; i++) {
      var b = list[i];
      var sc = b.r / b.R;
      var since = time - b.born;
      if (b.growFrom < 1 && since < 0.45) sc *= 1 + 0.12 * Math.sin(Math.min(1, since / 0.45) * Math.PI);
      drawBody(b.tier, b.x, b.y, b.angle, sc, faceFor(b));
    }
  }

  function drawDropper() {
    var bob = Math.sin(time * 2.4) * 3;
    var y = UFO_Y + bob;
    var r = radiusOf(current);
    var hy = heldY(current) + bob;
    if (!over) {
      // Aim guide from the held body down to where it will land.
      var land = landingY(ufoX, r);
      if (heldScale > 0.5 && land > hy + r) {
        ctx.save();
        ctx.setLineDash([2, 9]);
        ctx.lineCap = 'round';
        ctx.lineWidth = 3;
        ctx.strokeStyle = th.aimColor;
        ctx.globalAlpha = heldScale;
        ctx.beginPath();
        ctx.moveTo(ufoX, hy + r + 6);
        ctx.lineTo(ufoX, land + r);
        ctx.stroke();
        ctx.restore();
      }
      // Tractor beam.
      var beam = ctx.createLinearGradient(0, y, 0, hy + r);
      beam.addColorStop(0, th.ufoBeam);
      beam.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = beam;
      ctx.beginPath();
      ctx.moveTo(ufoX - 14, y + 6);
      ctx.lineTo(ufoX + 14, y + 6);
      ctx.lineTo(ufoX + r * 1.25, hy + r);
      ctx.lineTo(ufoX - r * 1.25, hy + r);
      ctx.closePath();
      ctx.fill();
      if (heldScale > 0) drawBody(current, ufoX, hy, 0, easeOutBack(heldScale), 0);
    }
    var ufo = sprites.ufo();
    if (ufo) drawImg(ufo, ufoX, y, clamp((aimX - ufoX) * 0.01, -0.25, 0.25), 1);
  }

  function easeOutBack(t) {
    var c1 = 1.70158, c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  }

  function drawEffects() {
    var i, o, t;
    ctx.globalCompositeOperation = 'lighter';
    for (i = 0; i < parts.length; i++) {
      o = parts[i];
      if (!o.on) continue;
      t = o.age / o.life;
      var s = o.size * (1 - t * 0.5);
      ctx.globalAlpha = 1 - t * t;
      ctx.drawImage(o.img, o.x - s, o.y - s, s * 2, s * 2);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    for (i = 0; i < rings.length; i++) {
      o = rings[i];
      if (!o.on) continue;
      t = o.age / o.life;
      var e = 1 - Math.pow(1 - t, 3);
      ctx.globalAlpha = (1 - t) * 0.85;
      ctx.strokeStyle = o.color;
      ctx.lineWidth = o.width * (1 - t) + 1;
      ctx.beginPath();
      ctx.arc(o.x, o.y, o.r0 + (o.r1 - o.r0) * e, 0, TAU);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (i = 0; i < texts.length; i++) {
      o = texts[i];
      if (!o.on || o.banner) continue;
      t = o.age / o.life;
      var pop = o.age < 0.14 ? 1.4 - 0.4 * (o.age / 0.14) : 1;
      ctx.globalAlpha = t > 0.65 ? (1 - t) / 0.35 : 1;
      ctx.font = '900 ' + Math.round(o.size * pop) + 'px ' + FONT;
      var ty = o.y - (1 - Math.pow(1 - t, 2)) * 46;
      ctx.lineWidth = 5;
      ctx.strokeStyle = 'rgba(20,10,50,0.75)';
      ctx.strokeText(o.str, o.x, ty);
      ctx.fillStyle = o.color;
      ctx.fillText(o.str, o.x, ty);
    }
    ctx.globalAlpha = 1;
  }

  // ---- canvas HUD (screen space)
  function panel(r) {
    roundRect(r.x, r.y, r.w, r.h, 16);
    ctx.fillStyle = th.panelFill;
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = th.panelStroke;
    ctx.stroke();
  }

  function drawIcon(tier, cx, cy, radius, dim) {
    var img = sprites.icon(tier, dim);
    if (!img) return;
    var s = (img.width * radius) / sprites.iconRadius;
    ctx.drawImage(img, cx - s / 2, cy - s / 2, s, s);
  }

  function label(str, x, y, align) {
    ctx.font = '800 11px ' + FONT;
    ctx.textAlign = align || 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = 'rgba(244,241,255,0.62)';
    ctx.fillText(String(str).toUpperCase().split('').join(' '), x, y);
  }

  function drawHud() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var showPanels = pilot !== 'title';
    var r;
    if (showPanels) {
      r = hudRects.score;
      panel(r);
      label(text('score', 'Score'), r.x + 14, r.y + 19);
      ctx.font = '900 ' + (wide ? 38 : 26) + 'px ' + FONT;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = th.textColor;
      ctx.fillText(String(Math.round(shownScore)), r.x + 14, r.y + (wide ? 60 : 47));
      if (wide) {
        label(text('best', 'Best') + '  ' + best, r.x + 14, r.y + 84);
      } else {
        ctx.font = '800 11px ' + FONT;
        ctx.textAlign = 'right';
        ctx.fillStyle = th.accent;
        ctx.fillText('★ ' + best, r.x + r.w - 12, r.y + 19);
      }

      r = hudRects.next;
      panel(r);
      label(text('next', 'Next'), wide ? r.x + 14 : r.x + r.w / 2, r.y + 19, wide ? 'left' : 'center');
      var nr = wide ? 30 : 17;
      drawIcon(next, wide ? r.x + r.w / 2 : r.x + r.w / 2, r.y + (wide ? 62 : 39), nr * (0.75 + TIERS[next].radius * 2.2), false);
    }

    r = hudRects.evo;
    if (!r) return;
    panel(r);
    var cols = hudRects.evoCols;
    if (wide) {
      label(text('evolution', 'Evolution'), r.x + 14, r.y + 22);
      var cell = (r.w - 24) / cols;
      for (var i = 0; i < TIERS.length; i++) {
        var cx = r.x + 12 + cell * (i % cols) + cell / 2;
        var cy = r.y + 34 + cell * Math.floor(i / cols) + cell / 2;
        drawEvoIcon(i, cx, cy, cell * 0.36);
      }
    } else {
      var step = (r.w - 16) / TIERS.length;
      for (var j = 0; j < TIERS.length; j++) {
        drawEvoIcon(j, r.x + 8 + step * j + step / 2, r.y + r.h / 2, Math.min(step * 0.4, 18));
      }
    }
  }

  function drawEvoIcon(i, cx, cy, radius) {
    var lit = pilot === 'title' ? i <= Math.max(bestTier, MAX_DROP) : !!discovered[i];
    if (i === highest && pilot !== 'title') {
      ctx.fillStyle = sprites.rgba(th.accent, 0.22 + 0.1 * Math.sin(time * 4));
      ctx.beginPath();
      ctx.arc(cx, cy, radius * 1.45, 0, TAU);
      ctx.fill();
    }
    drawIcon(i, cx, cy, radius, !lit);
  }

  function drawBanner() {
    for (var i = 0; i < texts.length; i++) {
      var o = texts[i];
      if (!o.on || !o.banner) continue;
      var t = o.age / o.life;
      var inT = Math.min(1, o.age / 0.3);
      var a = t > 0.75 ? (1 - t) / 0.25 : 1;
      var cx = jarX + (JAR_W * k) / 2;
      var cy = jarY + JAR_H * k * 0.3;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.globalAlpha = a;
      var sc = easeOutBack(inT);
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(sc, sc);
      ctx.font = '900 26px ' + FONT;
      var tw = ctx.measureText(o.str).width;
      var w = tw + 80;
      roundRect(-w / 2, -30, w, 60, 30);
      ctx.fillStyle = 'rgba(20,12,56,0.82)';
      ctx.fill();
      ctx.strokeStyle = sprites.rgba(th.accent, 0.8);
      ctx.lineWidth = 2;
      ctx.stroke();
      if (o.icon >= 0) drawIcon(o.icon, -w / 2 + 34, 0, 18, false);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = th.accent;
      ctx.fillText(o.str, 18, 1);
      ctx.restore();
      ctx.globalAlpha = 1;
    }
  }

  function draw() {
    drawBackground();
    var sx = 0, sy = 0;
    if (shake > 0) {
      var amp = shake * shake * 14;
      sx = (Math.random() - 0.5) * amp;
      sy = (Math.random() - 0.5) * amp;
    }
    setWorldTransform(sx, sy);
    drawJarBack();
    drawDangerLine();
    drawBodies();
    drawJarFront();
    drawDropper();
    drawEffects();
    drawHud();
    drawBanner();
    if (fadeAlpha > 0.001) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.globalAlpha = Math.min(1, fadeAlpha);
      ctx.fillStyle = th.bgTop;
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;
    }
  }

  var last = 0;
  function frame(ts) {
    var dt = last ? Math.min(0.05, Math.max(0, (ts - last) / 1000)) : 1 / 60;
    last = ts;
    update(dt);
    draw();
    requestAnimationFrame(frame);
  }

  // ------------------------------------------------------------------ DOM ui
  var $ = function (sel) { return document.querySelector(sel); };
  var hud = $('#hud');
  var hintEl = $('#hint');
  var toastEl = $('#toast');
  var screens = { title: $('#screen-title'), paused: $('#screen-pause'), gameover: $('#screen-over') };

  function showScreen(name) {
    for (var key in screens) {
      if (Object.prototype.hasOwnProperty.call(screens, key)) screens[key].classList.toggle('show', key === name);
    }
    hud.classList.toggle('show', screen === 'playing' || screen === 'paused');
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    inputBlockedUntil = now() + 150;
    pressing = false;
    if (name && name !== 'title' && screens[name] && !COARSE) {
      var primary = screens[name].querySelector('.btn-primary');
      setTimeout(function () { if (screens[name].classList.contains('show') && primary) primary.focus({ preventScroll: true }); }, 60);
    }
  }

  function renderBest() {
    var nodes = document.querySelectorAll('[data-best]');
    for (var i = 0; i < nodes.length; i++) nodes[i].textContent = String(best);
  }

  function iconURL(tier) {
    try { return sprites.icon(tier, false).toDataURL(); } catch (e) { return ''; }
  }

  function showGameOver() {
    $('#final-score').textContent = String(score);
    $('#new-best').hidden = !newBest;
    var reached = $('#reached-icon');
    reached.src = iconURL(highest);
    reached.alt = TIERS[highest].name;
    $('#reached-name').textContent = TIERS[highest].name;
    renderBest();
    showScreen('gameover');
  }

  var hintOn = false;
  function showHint() {
    if (storage.get('hinted', false)) return;
    hintEl.textContent = COARSE ? text('hint', 'Move to aim · tap to drop') : text('hint', 'Move to aim · click to drop') + '  ·  ' + text('hintKeys', 'Arrows + Space');
    hintEl.classList.add('show');
    hintOn = true;
  }
  function hideHint() {
    if (!hintOn) return;
    hintOn = false;
    hintEl.classList.remove('show');
    storage.set('hinted', true);
  }

  var toastTimer = 0;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('show'); }, 1600);
  }

  function renderSound() {
    var muted = audio.isMuted();
    document.body.classList.toggle('is-muted', muted);
    var labels = document.querySelectorAll('[data-sound-label]');
    for (var i = 0; i < labels.length; i++) labels[i].textContent = muted ? text('off', 'Off') : text('on', 'On');
  }

  // ------------------------------------------------------------------ flow
  function startGame() {
    pilot = 'player';
    screen = 'playing';
    resetJar();
    fadeAlpha = 1;
    fadeDir = -1;
    showScreen(null);
    showHint();
    audio.sfx.start();
    callHook('onGameStart');
  }

  function restart() {
    var hold;
    try { hold = hooks.beforeRestart && hooks.beforeRestart(); } catch (e) { hold = null; }
    Promise.resolve(hold).then(startGame, startGame);
  }

  function goHome() {
    pilot = 'title';
    screen = 'title';
    resetJar();
    fadeAlpha = 1;
    fadeDir = -1;
    hideHint();
    renderBest();
    showScreen('title');
  }

  function pause() {
    if (screen !== 'playing' || pilot !== 'player') return;
    screen = 'paused';
    keyDir = 0;
    showScreen('paused');
  }

  function resume() {
    if (screen !== 'paused') return;
    screen = 'playing';
    showScreen(null);
  }

  function share() {
    var msg = text('shareText', 'I scored {score} in Cosmic Merge!').replace('{score}', String(score));
    if (navigator.share) {
      navigator.share({ text: msg }).catch(function () {});
      return;
    }
    var done = function () { toast(text('copied', 'Copied!')); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(msg).then(done, function () { toast(msg); });
    else toast(msg);
  }

  var ACTIONS = {
    play: startGame,
    restart: restart,
    resume: resume,
    pause: pause,
    home: goHome,
    share: share,
    sound: function () { audio.toggle(); renderSound(); }
  };

  document.addEventListener('click', function (e) {
    var el = e.target.closest ? e.target.closest('[data-action]') : null;
    if (!el) return;
    var fn = ACTIONS[el.getAttribute('data-action')];
    if (!fn) return;
    audio.unlock();
    audio.sfx.click();
    fn();
  });

  // ------------------------------------------------------------------ input
  function playerCanAct() {
    return screen === 'playing' && pilot === 'player' && !over && now() >= inputBlockedUntil;
  }

  function toWorldX(clientX) { return (clientX - jarX) / k; }

  canvas.addEventListener('pointerdown', function (e) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.preventDefault();
    audio.unlock();
    if (!playerCanAct()) return;
    pressing = true;
    aimX = toWorldX(e.clientX);
    if (canvas.setPointerCapture) {
      try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* not capturable */ }
    }
  });
  canvas.addEventListener('pointermove', function (e) {
    if (screen !== 'playing' || pilot !== 'player') return;
    if (pressing || e.pointerType === 'mouse') aimX = toWorldX(e.clientX);
  });
  canvas.addEventListener('pointerup', function (e) {
    if (!pressing) return;
    pressing = false;
    if (!playerCanAct()) return;
    aimX = toWorldX(e.clientX);
    drop();
  });
  canvas.addEventListener('pointercancel', function () { pressing = false; });

  window.addEventListener('keydown', function (e) {
    var key = e.key;
    var tag = e.target && e.target.tagName;
    if (key === ' ' || key === 'Spacebar' || key === 'Enter') {
      if (tag === 'BUTTON' || tag === 'A' || tag === 'INPUT') return;
      if (screen === 'playing' && pilot === 'player') {
        e.preventDefault();
        audio.unlock();
        if (!e.repeat && playerCanAct()) drop();
      } else if (screen === 'title' && !e.repeat && now() >= inputBlockedUntil) {
        e.preventDefault();
        audio.unlock();
        startGame();
      }
    } else if (key === 'ArrowLeft' || key === 'a' || key === 'A') {
      keyDir = -1;
    } else if (key === 'ArrowRight' || key === 'd' || key === 'D') {
      keyDir = 1;
    } else if (key === 'Escape' || key === 'p' || key === 'P') {
      if (screen === 'playing') pause();
      else if (screen === 'paused') resume();
    } else if (key === 'm' || key === 'M') {
      audio.unlock();
      audio.toggle();
      renderSound();
    }
  });
  window.addEventListener('keyup', function (e) {
    if ((e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') && keyDir < 0) keyDir = 0;
    if ((e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') && keyDir > 0) keyDir = 0;
  });

  document.addEventListener('visibilitychange', function () { if (document.hidden) pause(); });
  window.addEventListener('blur', function () { keyDir = 0; pause(); });
  document.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  document.addEventListener('gesturestart', function (e) { e.preventDefault(); });
  window.addEventListener('resize', layout);

  // ------------------------------------------------------------------ boot
  (function boot() {
    var nodes = document.querySelectorAll('[data-text]');
    for (var i = 0; i < nodes.length; i++) {
      var val = T[nodes[i].getAttribute('data-text')];
      if (val != null) nodes[i].textContent = val;
    }
    var words = String(text('title', 'COSMIC MERGE')).split(/\s+/);
    var logo = $('#title-logo');
    logo.innerHTML = '';
    for (var w = 0; w < words.length; w++) {
      var span = document.createElement('span');
      span.textContent = words[w];
      logo.appendChild(span);
    }
    var credit = document.querySelector('[data-credit]');
    if (credit) credit.textContent = cfg.studio ? '© ' + cfg.studio : '';
    if (DEMO) document.body.classList.add('is-demo');
    layout();
    sprites.loadImages(function () { rebuildSprites(); });
    var chain = $('#title-chain');
    if (chain) {
      for (var t = 0; t < TIERS.length; t++) {
        var img = document.createElement('img');
        img.src = iconURL(t);
        img.alt = TIERS[t].name;
        img.title = TIERS[t].name;
        chain.appendChild(img);
      }
    }
    renderSound();
    renderBest();
    resetJar();
    if (DEMO) {
      showScreen(null);
      hud.classList.add('show');
    } else {
      showScreen('title');
    }
    requestAnimationFrame(frame);
  })();

  // ------------------------------------------------------------------ debug / test API
  G.getState = function () {
    return { screen: screen, score: score, best: best, bodies: world.bodies.length, highestTier: highest, demo: DEMO };
  };
  G.start = startGame;
  G.lib.world = world; // internal: lets automated tests inspect the simulation
  G.forceGameOver = function () {
    if (pilot === 'player' && screen === 'playing' && !over) gameOver();
  };
})();
