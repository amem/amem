/*
 * game.js — Neon Stack core: state machine, stacking rules, camera, input and UI.
 * Loaded last; uses the modules registered by storage.js, audio.js, render.js,
 * effects.js and bot.js on window.__GAME__.modules.
 *
 * Rounds are driven by one of three "pilots":
 *   'player' — a real game (Play button)
 *   'title'  — the calm bot building a tower behind the title screen
 *   'demo'   — the bot in ?demo=1 attract mode (trailers, screenshots)
 */
(function () {
  'use strict';
  var NS = window.__GAME__ = window.__GAME__ || {};
  var M = NS.modules;
  var cfg = window.GAME_CONFIG || {};
  var R = M.render;
  var FX = M.effects;
  var audio = M.audio;
  var storage = M.storage;
  var bot = M.bot;

  var gp = cfg.gameplay || {};
  var camCfg = cfg.camera || {};
  var demoCfg = cfg.demo || {};
  var T = cfg.texts || {};
  var hooks = cfg.hooks || {};
  var blockCfg = cfg.block || {};
  var theme = cfg.theme || {};

  var B = blockCfg.size || 100;
  var BH = blockCfg.height || 24;
  var FLOOR = -(blockCfg.pedestalLevels || 14) * BH;
  var FILL = blockCfg.screenFill || 1;
  var RANGE = (gp.slideRange || 1.4) * B;
  var TOL = gp.perfectTolerance == null ? 4 : gp.perfectTolerance;
  var GROW_AFTER = gp.growAfter || 3;
  var GROW = gp.growAmount || 8;
  var MILESTONE = gp.milestoneEvery || 10;
  var ZOOM_TIME = camCfg.zoomOutDuration || 1.1;
  var OVERLAY_DELAY = Math.min(ZOOM_TIME, 1) + 0.2;
  var FADE_COLOR = '#07030f';

  var DEMO = /[?&]demo=1\b/.test(location.search) || /^#demo\b/.test(location.hash);
  var REDUCED = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var SHAKE = cfg.screenShake !== false && !REDUCED;
  var COARSE = !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);

  // ------------------------------------------------------------------ state
  var screen = DEMO ? 'playing' : 'title';
  var pilot = DEMO ? 'demo' : 'title';
  var tower = [];
  var mover = null;
  var score = 0;
  var combo = 0;
  var best = storage.get('best', 0) || 0;
  var newBest = false;
  var roundOver = false;
  var overTimer = 0;
  var overlayShown = false;
  var restartQueued = false;
  var time = 0;
  var inputBlockedUntil = 0;
  var shake = 0;
  var fadeAlpha = DEMO ? 1 : 0;
  var fadeDir = DEMO ? -1 : 0;
  var fadeCb = null;
  var baseScale = 1;
  var bgHue = 0;
  var restOy = 0;
  var zoom = null;
  var cam = R.cam;
  var pt = { x: 0, y: 0 };

  // ------------------------------------------------------------------ dom
  var $ = function (sel) { return document.querySelector(sel); };
  var canvas = $('#game');
  var hud = $('#hud');
  var scoreEl = $('#score');
  var hintEl = $('#hint');
  var toastEl = $('#toast');
  var screens = { title: $('#screen-title'), paused: $('#screen-pause'), gameover: $('#screen-over') };

  function text(key, fallback) { return T[key] == null ? fallback : T[key]; }
  function now() { return (window.performance && performance.now()) || Date.now(); }
  function landscape() { return R.W / R.H > 1.1; }

  function callHook(name, arg) {
    try {
      if (typeof hooks[name] === 'function') return hooks[name](arg);
    } catch (e) {
      if (window.console) console.error('Neon Stack hook "' + name + '" failed:', e);
    }
    return undefined;
  }

  // ------------------------------------------------------------------ tower
  function makeBlock(x, z, w, d, level) {
    return { x: x, z: z, w: w, d: d, level: level, col: R.colorsFor(level), placedAt: -10, grewAt: -10, growAxis: 'x', flash: 0 };
  }

  function top() { return tower[tower.length - 1]; }

  function resetTower() {
    tower.length = 0;
    tower.push(makeBlock(0, 0, B, B, 0));
    score = 0;
    combo = 0;
    newBest = false;
    roundOver = false;
    overTimer = 0;
    overlayShown = false;
    restartQueued = false;
    zoom = null;
    shake = 0;
    FX.reset();
    bot.newRound();
    spawnMover();
    bgHue = R.hueFor(0) + (theme.backgroundHueOffset || 0);
    snapCamera();
    updateScore(false);
  }

  function spawnMover() {
    var prev = top();
    var level = tower.length;
    var axis = level % 2 === 1 ? 'x' : 'z';
    var speed = Math.min(gp.maxSpeed || 330, (gp.baseSpeed || 150) + level * (gp.speedGain || 3));
    mover = {
      x: prev.x, z: prev.z, w: prev.w, d: prev.d, level: level, axis: axis,
      off: -RANGE, dir: 1, col: R.colorsFor(level), speed: speed
    };
    if (pilot !== 'player') bot.newBlock(level, axis === 'x' ? prev.w : prev.d);
    applyMover();
  }

  function applyMover() {
    var prev = top();
    if (mover.axis === 'x') { mover.x = prev.x + mover.off; mover.z = prev.z; }
    else { mover.x = prev.x; mover.z = prev.z + mover.off; }
  }

  function updateMover(dt) {
    var speed = mover.speed * (pilot === 'title' ? (demoCfg.titleSpeed || 0.8) : 1);
    mover.off += mover.dir * speed * dt;
    if (mover.off > RANGE) { mover.off = RANGE; mover.dir = -1; }
    else if (mover.off < -RANGE) { mover.off = -RANGE; mover.dir = 1; }
    if (pilot !== 'player') {
      var hit = bot.update(mover.off);
      if (hit !== null) {
        mover.off = hit;
        applyMover();
        place();
        return;
      }
    }
    applyMover();
  }

  /** Drop the sliding block: perfect snap, trim, or miss. */
  function place() {
    if (!mover || roundOver) return;
    var prev = top();
    var m = mover;
    var size = m.axis === 'x' ? m.w : m.d;
    var off = m.off;
    var abs = Math.abs(off);
    var level = m.level;
    var e = level * BH;
    if (abs >= size) { miss(); return; }

    var block;
    if (abs <= TOL) {
      combo++;
      block = makeBlock(prev.x, prev.z, m.w, m.d, level);
      if (combo >= GROW_AFTER) {
        var grown = Math.min(B, size + GROW);
        if (grown > size + 0.01) {
          if (m.axis === 'x') block.w = grown; else block.d = grown;
          block.grewAt = time;
          block.growAxis = m.axis;
          audio.sfx.grow();
        }
      }
      block.flash = 0.9;
      FX.ripple(block.x, block.z, block.w, block.d, e + BH, m.col.hue, 0);
      if (combo >= 3) FX.ripple(block.x, block.z, block.w, block.d, e + BH, m.col.hue, 0.13);
      FX.burst(block.x, block.z, block.w, block.d, e + BH, m.col.hue, 12 + Math.min(combo, 10) * 2, 1);
      FX.text(text('perfect', 'PERFECT') + (combo > 1 ? ' ×' + combo : ''), block.x, block.z, e + BH,
        R.hsl(m.col.hue, 100, 72), 24 + Math.min(combo, 8) * 1.6);
      audio.sfx.perfect(combo);
    } else {
      combo = 0;
      var sign = off > 0 ? 1 : -1;
      var keptCenter = off / 2;
      var cutCenter = off / 2 + sign * size / 2;
      if (m.axis === 'x') {
        block = makeBlock(prev.x + keptCenter, prev.z, size - abs, m.d, level);
        FX.addDebris(prev.x + cutCenter, prev.z, abs, m.d, level, m.col, 'x', sign, 1.5);
      } else {
        block = makeBlock(prev.x, prev.z + keptCenter, m.w, size - abs, level);
        FX.addDebris(prev.x, prev.z + cutCenter, m.w, abs, level, m.col, 'z', sign, 1.5);
      }
      block.flash = 0.35;
      audio.sfx.slice();
    }
    block.placedAt = time;
    tower.push(block);
    audio.sfx.place(level);
    score = tower.length - 1;
    if (pilot !== 'title') updateScore(true);
    if (score % MILESTONE === 0 && pilot !== 'title') {
      FX.screenText(score + '!', 0.5, landscape() ? 0.26 : 0.22, R.hsl(R.hueFor(level), 100, 70), Math.min(96, R.H * 0.12));
      audio.sfx.milestone();
      if (pilot === 'player') callHook('onLevelUp', score);
    }
    if (pilot === 'player') hideHint();
    spawnMover();
  }

  function miss() {
    var m = mover;
    FX.addDebris(m.x, m.z, m.w, m.d, m.level, m.col, m.axis, m.off >= 0 ? 1 : -1, 2.2);
    mover = null;
    endRound();
  }

  function endRound() {
    roundOver = true;
    overTimer = 0;
    combo = 0;
    audio.sfx.gameOver();
    if (pilot === 'player') {
      if (SHAKE) shake = 1;
      newBest = score > best;
      if (newBest) {
        best = score;
        storage.set('best', best);
      }
      screen = 'gameover';
      hideHint();
      callHook('onGameOver', score);
    }
    startZoomOut();
  }

  // ------------------------------------------------------------------ camera
  function computeScale() {
    var W = R.W, H = R.H;
    var span = landscape() ? Math.min(W * 0.3, H * 0.42) : Math.min(W * 0.44, H * 0.3);
    baseScale = (span / (2 * B * R.COS)) * FILL;
  }

  /** Where the camera wants to be while a round is in progress. */
  function followTarget(out) {
    var t = top();
    var titleMode = pilot === 'title';
    var anchor = titleMode ? (landscape() ? 0.5 : 0.7) : (camCfg.anchor || 0.44);
    var cx = titleMode && landscape() ? R.W * 0.66 : R.W * 0.5;
    placePoint(out, baseScale, t.x, t.z, (t.level + 1) * BH, cx, anchor * R.H);
    return out;
  }

  /** Camera so that world point (x, z, e) lands on screen point (sx, sy) at scale s. */
  function placePoint(out, s, x, z, e, sx, sy) {
    out.s = s;
    out.ox = sx - (x - z) * R.COS * s;
    out.oy = sy + e * s - (x + z) * R.SIN * s;
    return out;
  }

  var target = { s: 1, ox: 0, oy: 0 };
  function snapCamera() {
    followTarget(target);
    cam.s = target.s;
    cam.ox = target.ox;
    cam.oy = target.oy;
    restOy = cam.oy;
  }

  /** Game-over framing: the whole tower, beside (landscape) or above (portrait) the result card. */
  function startZoomOut() {
    var t = top();
    var eTop = (t.level + 1) * BH;
    var wide = landscape();
    var playerCard = pilot === 'player';
    var availH = wide ? R.H * 0.8 : R.H * (playerCard ? 0.5 : 0.72);
    var availW = wide ? R.W * (playerCard ? 0.52 : 0.9) : R.W * 0.9;
    var s = Math.min(baseScale, availH / (eTop + B * 1.1), availW / (2.4 * B * R.COS));
    var cx = wide && playerCard ? R.W * 0.34 : R.W * 0.5;
    var cy = wide ? R.H * 0.52 : R.H * (playerCard ? 0.34 : 0.5);
    if (pilot === 'title' && wide) cx = R.W * 0.66;
    R.project(t.x, t.z, eTop, pt);
    zoom = {
      t: 0,
      x: t.x, z: t.z,
      e0: eTop, e1: eTop / 2,
      sx0: pt.x, sy0: pt.y, sx1: cx, sy1: cy,
      s0: cam.s, s1: s
    };
  }

  function easeInOut(k) { return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; }

  function updateCamera(dt) {
    if (zoom) {
      zoom.t = Math.min(1, zoom.t + dt / ZOOM_TIME);
      var k = easeInOut(zoom.t);
      placePoint(cam, zoom.s0 + (zoom.s1 - zoom.s0) * k, zoom.x, zoom.z,
        zoom.e0 + (zoom.e1 - zoom.e0) * k, zoom.sx0 + (zoom.sx1 - zoom.sx0) * k, zoom.sy0 + (zoom.sy1 - zoom.sy0) * k);
      return;
    }
    followTarget(target);
    var f = 1 - Math.exp(-(camCfg.followSpeed || 5) * dt);
    cam.s += (target.s - cam.s) * f;
    cam.ox += (target.ox - cam.ox) * f;
    cam.oy += (target.oy - cam.oy) * f;
  }

  // ------------------------------------------------------------------ loop
  function update(dt) {
    time += dt;
    if (screen === 'paused') return;

    if (mover && !roundOver) updateMover(dt);
    updateCamera(dt);
    FX.update(dt);
    if (shake > 0) shake = Math.max(0, shake - dt * 2.2);

    var hueTarget = R.hueFor(top().level) + (theme.backgroundHueOffset || 0);
    bgHue += (hueTarget - bgHue) * (1 - Math.exp(-2 * dt));

    if (roundOver) {
      overTimer += dt;
      if (pilot === 'player') {
        if (!overlayShown && overTimer >= OVERLAY_DELAY) {
          overlayShown = true;
          showGameOver();
        }
      } else if (!restartQueued && overTimer >= ZOOM_TIME + (demoCfg.restartDelay || 1.5)) {
        restartQueued = true;
        fadeThen(resetTower);
      }
    }

    if (fadeDir === 1) {
      fadeAlpha += dt / 0.22;
      if (fadeAlpha >= 1) {
        fadeAlpha = 1;
        fadeDir = -1;
        var cb = fadeCb;
        fadeCb = null;
        if (cb) cb();
      }
    } else if (fadeDir === -1) {
      fadeAlpha -= dt / 0.3;
      if (fadeAlpha <= 0) { fadeAlpha = 0; fadeDir = 0; }
    }
  }

  function fadeThen(cb) {
    fadeDir = 1;
    fadeCb = cb;
  }

  function draw() {
    var ctx = R.ctx;
    ctx.setTransform(R.dpr, 0, 0, R.dpr, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';

    var sx = 0, sy = 0;
    if (shake > 0) {
      var amp = shake * shake * 12;
      sx = (Math.random() - 0.5) * amp;
      sy = (Math.random() - 0.5) * amp;
    }
    var lift = Math.max(0, cam.oy - restOy);
    R.drawBackground({ hue: bgHue, lift: lift, time: time, floorY: cam.oy - FLOOR * cam.s });

    cam.ox += sx;
    cam.oy += sy;
    var base = tower[0];
    R.drawFloor(FLOOR, base.col.hue);
    FX.drawDebris(-1);
    R.drawPedestal(base, FLOOR, base.col.hue);
    for (var i = 0; i < tower.length; i++) R.drawBlock(tower[i], time);
    if (mover) {
      R.drawCuboid(mover.x, mover.z, mover.w, mover.d, mover.level * BH, BH, mover.col, 0, 0.5 + 0.5 * Math.sin(time * 6));
    }
    FX.drawDebris(1);
    FX.drawOverlay();
    cam.ox -= sx;
    cam.oy -= sy;

    R.drawVignette();
    R.fillScreen(FADE_COLOR, fadeAlpha);
  }

  var last = 0;
  function frame(ts) {
    var dt = last ? Math.min(0.05, Math.max(0, (ts - last) / 1000)) : 1 / 60;
    last = ts;
    update(dt);
    draw();
    requestAnimationFrame(frame);
  }

  // ------------------------------------------------------------------ ui
  function showScreen(name) {
    for (var key in screens) {
      if (Object.prototype.hasOwnProperty.call(screens, key)) screens[key].classList.toggle('show', key === name);
    }
    hud.classList.toggle('show', screen === 'playing' || screen === 'paused');
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    inputBlockedUntil = now() + 150;
    if (name && name !== 'title' && screens[name]) {
      var primary = screens[name].querySelector('.btn-primary');
      if (primary && !COARSE) setTimeout(function () { if (screens[name].classList.contains('show')) primary.focus({ preventScroll: true }); }, 60);
    }
  }

  function updateScore(pop) {
    scoreEl.textContent = String(score);
    if (pop) {
      scoreEl.classList.remove('pop');
      void scoreEl.offsetWidth;
      scoreEl.classList.add('pop');
    }
  }

  function renderBest() {
    var nodes = document.querySelectorAll('[data-best]');
    for (var i = 0; i < nodes.length; i++) nodes[i].textContent = String(best);
  }

  function showGameOver() {
    $('#final-score').textContent = String(score);
    $('#new-best').hidden = !newBest;
    renderBest();
    showScreen('gameover');
  }

  var hintOn = false;
  function showHint() {
    if (storage.get('hinted', false)) return;
    hintEl.textContent = COARSE ? text('tapToPlace', 'Tap to drop the block') : text('clickToPlace', 'Click or press Space to drop');
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
    for (var i = 0; i < labels.length; i++) labels[i].textContent = muted ? text('soundOff', 'Off') : text('soundOn', 'On');
  }

  // ------------------------------------------------------------------ flow
  function startGame() {
    pilot = 'player';
    screen = 'playing';
    resetTower();
    fadeAlpha = 1;
    fadeDir = -1;
    showScreen(null);
    showHint();
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
    resetTower();
    fadeAlpha = 1;
    fadeDir = -1;
    hideHint();
    renderBest();
    showScreen('title');
  }

  function pause() {
    if (screen !== 'playing' || pilot !== 'player') return;
    screen = 'paused';
    showScreen('paused');
  }

  function resume() {
    if (screen !== 'paused') return;
    screen = 'playing';
    showScreen(null);
  }

  function share() {
    var msg = text('shareText', 'I scored {score} in {title}!')
      .replace('{score}', String(score))
      .replace('{title}', text('title', 'NEON STACK'));
    if (navigator.share) {
      navigator.share({ text: msg }).catch(function () {});
      return;
    }
    var done = function () { toast(text('copied', 'Copied!')); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(msg).then(done, function () { toast(msg); });
    } else {
      toast(msg);
    }
  }

  var ACTIONS = {
    play: startGame,
    restart: restart,
    resume: resume,
    pause: pause,
    home: goHome,
    share: share,
    sound: function () { audio.toggleMute(); }
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

  function tryPlace() {
    if (screen !== 'playing' || pilot !== 'player' || now() < inputBlockedUntil) return;
    place();
  }

  canvas.addEventListener('pointerdown', function (e) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.preventDefault();
    audio.unlock();
    tryPlace();
  });

  window.addEventListener('keydown', function (e) {
    var key = e.key;
    var tag = e.target && e.target.tagName;
    if (key === ' ' || key === 'Spacebar' || key === 'Enter') {
      if (tag === 'BUTTON' || tag === 'A' || tag === 'INPUT') return;
      if (screen === 'playing' && pilot === 'player') {
        e.preventDefault();
        if (!e.repeat) {
          audio.unlock();
          tryPlace();
        }
      } else if (screen === 'title' && !e.repeat && now() >= inputBlockedUntil) {
        e.preventDefault();
        audio.unlock();
        startGame();
      }
    } else if (key === 'Escape' || key === 'p' || key === 'P') {
      if (screen === 'playing') pause();
      else if (screen === 'paused') resume();
    } else if (key === 'm' || key === 'M') {
      audio.unlock();
      audio.toggleMute();
    }
  });

  document.addEventListener('visibilitychange', function () { if (document.hidden) pause(); });
  window.addEventListener('blur', pause);
  // Block page gestures (pinch zoom, long-press menu) inside the game.
  document.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  document.addEventListener('gesturestart', function (e) { e.preventDefault(); });

  window.addEventListener('resize', function () {
    R.resize();
    computeScale();
    if (!zoom) snapCamera();
    else if (roundOver) startZoomOut();
  });

  // ------------------------------------------------------------------ boot
  (function boot() {
    var nodes = document.querySelectorAll('[data-text]');
    for (var i = 0; i < nodes.length; i++) {
      var val = T[nodes[i].getAttribute('data-text')];
      if (val != null) nodes[i].textContent = val;
    }
    var words = String(text('title', 'NEON STACK')).split(/\s+/);
    var logo = $('#title-logo');
    logo.innerHTML = '';
    var first = document.createElement('span');
    first.className = 'logo-neon';
    first.textContent = words[0];
    logo.appendChild(first);
    if (words.length > 1) {
      var rest = document.createElement('span');
      rest.className = 'logo-grad';
      rest.textContent = words.slice(1).join(' ');
      logo.appendChild(rest);
    }
    document.title = words.map(function (w) { return w.charAt(0) + w.slice(1).toLowerCase(); }).join(' ');
    var credit = document.querySelector('[data-credit]');
    if (credit) credit.textContent = cfg.studio ? '© ' + cfg.studio : '';
    if (DEMO) document.body.classList.add('is-demo');

    R.init(canvas);
    R.resize();
    computeScale();
    audio.onChange(renderSound);
    renderSound();
    renderBest();
    resetTower();
    if (DEMO) {
      showScreen(null);
      hud.classList.add('show');
    } else {
      showScreen('title');
    }
    requestAnimationFrame(frame);
  })();

  // ------------------------------------------------------------------ debug / test API
  NS.id = 'neon-stack';
  NS.version = '1.0.0';
  NS.getState = function () {
    return { screen: screen, score: score, best: best, combo: combo, level: top().level, demo: DEMO };
  };
  NS.start = startGame;
  NS.forceGameOver = function () {
    if (pilot === 'player' && screen === 'playing' && mover && !roundOver) miss();
  };
})();
