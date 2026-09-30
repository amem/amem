/*
 * Brick Blitz — game.js
 * Rules and flow: levels, ball / paddle / brick collisions, power-ups, lasers,
 * explosions, scoring, lives, level select, demo bot, input and the DOM screens.
 * Drawing lives in render.js; this file only mutates the state object S.
 *
 * Rounds are driven by one of three pilots:
 *   'player' — a real run (Play button or level select)
 *   'title'  — the bot playing behind the title screen
 *   'demo'   — the bot in ?demo=1 attract mode (trailers, screenshots)
 */
(function () {
  'use strict';

  var API = window.__GAME__;
  var M = API._m;
  var cfg = window.GAME_CONFIG;
  var store = M.storage;
  var audio = M.audio;
  var fx = M.fx;
  var PH = M.physics;
  var R = M.render;
  var L = PH.layout;
  var LEVELS = M.levels;
  var T = cfg.texts;
  var hooks = cfg.hooks || {};
  var PCFG = cfg.powerups;
  var SC = cfg.scoring;
  var BALL = cfg.ball;
  var PAD = cfg.paddle;
  var BOT = cfg.bot || {};

  var DEMO = /[?&]demo=1\b/.test(location.search) || /^#demo\b/.test(location.hash);
  var COARSE = !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
  var DEG = Math.PI / 180;
  var hit = { nx: 0, ny: 0, pen: 0, corner: false, d2: 0, sx: 0, sy: 0 };

  // ------------------------------------------------------------------ state
  var S = {
    screen: DEMO ? 'playing' : 'title',
    pilot: DEMO ? 'demo' : 'title',
    phase: 'intro',
    phaseT: 0,
    time: 0,
    timeScale: 1,
    slowMoT: 0,
    score: 0,
    shownScore: 0,
    best: store.get('best', 0) || 0,
    newBest: false,
    lives: cfg.lives || 3,
    levelIndex: 0,
    loop: 0,
    unlocked: Math.max(1, store.get('unlocked', 1) || 1),
    bricks: [],
    breakable: 0,
    paddle: { x: 320, y: L.paddleY, w: PAD.width, h: PAD.height, vx: 0, squash: 0, targetX: 320 },
    balls: [],
    capsules: [],
    lasers: [],
    timers: { wide: 0, laser: 0, slow: 0, fire: 0, catch: 0, shrink: 0 },
    comboHits: 0,
    mult: 1,
    banner: null,
    laserCd: 0,
    showHint: false,
    reached: 1,
    demo: DEMO,
    coarse: COARSE
  };

  var explodeQueue = [];
  var keys = { left: false, right: false };
  var pointerActive = false;
  var inputBlockedUntil = 0;
  var botLaunchT = 0;
  var botTargetBrick = null;
  var botPlanned = false;
  var botNoise = 0;

  function now() { return (window.performance && performance.now()) || Date.now(); }
  function text(key, fallback) { return T[key] == null ? fallback : T[key]; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  function callHook(name, a, b) {
    try {
      if (typeof hooks[name] === 'function') return hooks[name](a, b);
    } catch (e) {
      if (window.console) console.error('Brick Blitz hook "' + name + '" failed:', e);
    }
    return undefined;
  }

  // ------------------------------------------------------------------ levels
  function baseSpeed() {
    return BALL.startSpeed * (1 + BALL.speedUpPerLevel * S.levelIndex) * (1 + (BALL.loopSpeedUp || 0) * S.loop);
  }

  function buildLevel(index) {
    var level = LEVELS[index];
    var palette = cfg.theme.palettes[level.palette] || cfg.theme.palettes[cfg.theme.defaultPalette];
    var bricks = [];
    var breakable = 0;
    for (var r = 0; r < level.rows.length && r < L.maxRows; r++) {
      var row = level.rows[r];
      for (var c = 0; c < L.cols; c++) {
        var ch = row.charAt(c);
        if (!ch || ch === '.') continue;
        var type = ch === 'S' ? 'steel' : ch === 'X' ? 'explosive' : ch === '?' ? 'mystery' : 'normal';
        var hp = type === 'normal' ? parseInt(ch, 10) || 1 : 1;
        var color = type === 'steel' ? cfg.theme.steel : type === 'explosive' ? cfg.theme.explosive
          : type === 'mystery' ? cfg.theme.mystery : palette[r % palette.length];
        bricks.push({
          c: c, r: r,
          x: L.gridX + c * L.cellW + L.inset,
          y: L.gridY + r * L.cellH + L.inset,
          w: L.cellW - L.inset * 2,
          h: L.cellH - L.inset * 2,
          type: type, hp: hp, maxHp: hp, color: color,
          alive: true, flash: 0,
          delay: (r * 0.05 + Math.abs(c - 5.5) * 0.025),
          seed: (r * 31 + c * 17) % 97
        });
        if (type !== 'steel') breakable++;
      }
    }
    S.bricks = bricks;
    S.breakable = breakable;
  }

  function startLevel(index) {
    S.levelIndex = index;
    buildLevel(index);
    S.capsules.length = 0;
    S.lasers.length = 0;
    explodeQueue.length = 0;
    resetTimers();
    S.comboHits = 0;
    S.mult = 1;
    S.paddle.w = PAD.width;
    newBall();
    S.phase = 'intro';
    S.phaseT = 0;
    S.banner = { kind: 'intro', title: text('level', 'Level') + ' ' + (index + 1), sub: LEVELS[index].name, t: 0, life: 1.5 };
    S.reached = Math.max(S.reached, index + 1);
    audio.play('appear');
  }

  function resetTimers() {
    for (var k in S.timers) if (Object.prototype.hasOwnProperty.call(S.timers, k)) S.timers[k] = 0;
  }

  function newBall() {
    S.balls.length = 0;
    S.balls.push({
      x: S.paddle.x, y: S.paddle.y - BALL.radius - 1, dx: 0, dy: -1,
      speed: baseSpeed(), r: BALL.radius, stuck: true, stuckOffset: 0, stuckT: 0, trail: []
    });
    botLaunchT = 0.7;
  }

  // ------------------------------------------------------------------ runs
  function beginRun(levelIndex) {
    S.score = 0;
    S.shownScore = 0;
    S.newBest = false;
    S.lives = cfg.lives || 3;
    S.loop = 0;
    S.reached = levelIndex + 1;
    S.paddle.x = S.paddle.targetX = 320;
    fx.clear();
    startLevel(levelIndex);
  }

  function addScore(points) {
    S.score += points;
    if (S.pilot === 'player' && S.score > S.best) {
      S.best = S.score;
      S.newBest = true;
      store.set('best', S.best);
    }
  }

  // ------------------------------------------------------------------ bricks
  function damageBrick(b, byLaser) {
    if (!b.alive) return;
    if (b.type === 'steel') {
      b.flash = 1;
      audio.play('steel');
      return;
    }
    b.hp--;
    b.flash = 1;
    var cx = b.x + b.w / 2, cy = b.y + b.h / 2;
    if (!byLaser) {
      S.comboHits++;
      S.mult = Math.min(SC.maxMultiplier || 8, 1 + Math.floor(S.comboHits / (SC.comboStep || 4)));
    }
    if (b.hp > 0) {
      addScore((SC.hit || 10) * S.mult);
      fx.sparks(cx, cy, b.color, 6, 260);
      audio.play('hit', b.r);
      return;
    }
    destroyBrick(b);
  }

  function destroyBrick(b) {
    if (!b.alive) return;
    b.alive = false;
    S.breakable--;
    var cx = b.x + b.w / 2, cy = b.y + b.h / 2;
    var points = b.type === 'explosive' ? SC.explosive : b.type === 'mystery' ? SC.mystery : SC.brick * b.maxHp;
    addScore(points * S.mult);
    fx.shards(cx, cy, b.w, b.h, b.color, 14, 1);
    fx.glow(cx, cy, b.color, 46, 0.35);
    if (S.mult >= 2) fx.text(cx, cy, '+' + points * S.mult, b.color, 20, 0.7);
    audio.play('brick', b.r);
    if (b.type === 'explosive') {
      explodeQueue.push({ brick: b, t: 0.05 });
    }
    maybeDropCapsule(b);
    if (S.breakable <= 0) levelCleared();
  }

  function explode(b) {
    var cx = b.x + b.w / 2, cy = b.y + b.h / 2;
    fx.ring(cx, cy, cfg.theme.explosive, 120, 0.5, 10);
    fx.ring(cx, cy, '#ffe45c', 70, 0.35, 6);
    fx.embers(cx, cy, '#ff9a3d', 16, 180);
    fx.sparks(cx, cy, '#ffd23d', 18, 520);
    fx.shake(0.35);
    audio.play('explosion');
    for (var i = 0; i < S.bricks.length; i++) {
      var o = S.bricks[i];
      if (!o.alive || o.type === 'steel') continue;
      if (Math.abs(o.c - b.c) <= 1 && Math.abs(o.r - b.r) <= 1) {
        if (o.type === 'explosive') destroyBrick(o);
        else { o.hp = 0; destroyBrick(o); }
      }
    }
  }

  // ------------------------------------------------------------------ power-ups
  var POSITIVE = ['multi', 'wide', 'laser', 'slow', 'fire', 'catch', 'life'];

  function pickPowerup(positiveOnly) {
    var types = PCFG.types;
    var total = 0;
    var k;
    for (k in types) {
      if (!Object.prototype.hasOwnProperty.call(types, k)) continue;
      if (positiveOnly && POSITIVE.indexOf(k) < 0) continue;
      if (k === 'life' && S.lives >= (cfg.maxLives || 6)) continue;
      total += types[k].weight;
    }
    var r = Math.random() * total;
    for (k in types) {
      if (!Object.prototype.hasOwnProperty.call(types, k)) continue;
      if (positiveOnly && POSITIVE.indexOf(k) < 0) continue;
      if (k === 'life' && S.lives >= (cfg.maxLives || 6)) continue;
      r -= types[k].weight;
      if (r <= 0) return k;
    }
    return 'multi';
  }

  function maybeDropCapsule(b) {
    if (S.capsules.length >= (PCFG.maxOnScreen || 4)) return;
    var sure = b.type === 'mystery';
    if (!sure && Math.random() > PCFG.dropChance) return;
    S.capsules.push({ x: b.x + b.w / 2, y: b.y + b.h / 2, type: pickPowerup(sure), t: 0 });
  }

  function applyPowerup(type, x, y) {
    var def = PCFG.types[type];
    var names = T.powerups || {};
    addScore(SC.capsule || 100);
    fx.text(x, y - 30, names[type] || type.toUpperCase(), def.color, 26, 1.1);
    fx.ring(x, y, def.color, 90, 0.45, 8);
    switch (type) {
      case 'multi':
        splitBalls();
        audio.play('powerup');
        break;
      case 'life':
        S.lives = Math.min(cfg.maxLives || 6, S.lives + 1);
        audio.play('life');
        break;
      case 'shrink':
        S.timers.shrink = def.duration;
        S.timers.wide = 0;
        audio.play('powerdown');
        break;
      case 'wide':
        S.timers.wide = def.duration;
        S.timers.shrink = 0;
        audio.play('powerup');
        break;
      default:
        S.timers[type] = def.duration;
        audio.play('powerup');
    }
  }

  function splitBalls() {
    var max = BALL.maxBalls || 12;
    var source = S.balls.slice();
    for (var i = 0; i < source.length && S.balls.length < max; i++) {
      var b = source[i];
      if (b.stuck) launch(b);
      for (var s = -1; s <= 1 && S.balls.length < max; s += 2) {
        var nb = { x: b.x, y: b.y, dx: b.dx, dy: b.dy, speed: b.speed, r: b.r, stuck: false, stuckOffset: 0, stuckT: 0, trail: [] };
        PH.rotate(nb, s * 24 * DEG);
        PH.enforceAngle(nb, BALL.minVerticalAngle);
        S.balls.push(nb);
      }
    }
  }

  // ------------------------------------------------------------------ ball
  function launch(b) {
    if (!b.stuck) return;
    b.stuck = false;
    b.caught = false;
    var rel = clamp(b.stuckOffset / (S.paddle.w / 2), -1, 1);
    var angle = rel * 30 * DEG + clamp(S.paddle.vx / PAD.keySpeed, -1, 1) * 8 * DEG;
    b.dx = Math.sin(angle);
    b.dy = -Math.cos(angle);
    PH.enforceAngle(b, BALL.minVerticalAngle);
    audio.play('launch');
  }

  function launchAll() {
    var any = false;
    for (var i = 0; i < S.balls.length; i++) {
      if (S.balls[i].stuck) { launch(S.balls[i]); any = true; }
    }
    return any;
  }

  function currentSpeed(b) {
    return Math.min(BALL.maxSpeed, b.speed) * (S.timers.slow > 0 ? PCFG.slowFactor : 1);
  }

  function updateBall(b, dt) {
    var p = S.paddle;
    if (b.stuck) {
      b.x = clamp(p.x + b.stuckOffset, L.left + b.r, L.right - b.r);
      b.y = p.y - b.r - 0.5;
      b.stuckT += dt;
      if (b.caught && S.phase === 'play' && (b.stuckT > (cfg.catchAutoRelease || 3) || S.timers.catch <= 0)) launch(b);
      return;
    }
    var dist = currentSpeed(b) * dt;
    var steps = Math.max(1, Math.ceil(dist / (b.r * 0.45)));
    var len = dist / steps;
    for (var s = 0; s < steps; s++) {
      b.x += b.dx * len;
      b.y += b.dy * len;

      // Walls.
      if (b.x - b.r < L.left) { b.x = L.left + b.r; if (b.dx < 0) { b.dx = -b.dx; wallHit(b); } }
      else if (b.x + b.r > L.right) { b.x = L.right - b.r; if (b.dx > 0) { b.dx = -b.dx; wallHit(b); } }
      if (b.y - b.r < L.top) { b.y = L.top + b.r; if (b.dy < 0) { b.dy = -b.dy; wallHit(b); } }

      // Paddle.
      if (b.dy > 0 && b.y + b.r >= p.y && b.y - b.r <= p.y + p.h &&
          PH.circleRect(b.x, b.y, b.r, p.x - p.w / 2, p.y, p.w, p.h, hit)) {
        paddleHit(b);
        if (b.stuck) return;
        continue;
      }

      // Bricks (only cells near the ball).
      if (b.y - b.r < L.gridY + L.maxRows * L.cellH) brickCollisions(b);

      if (b.y - b.r > L.H) { b.lost = true; return; }
    }
    if (S.timers.fire > 0 && Math.random() < 0.6) fx.embers(b.x, b.y, cfg.theme.fireball, 1, 40);
  }

  function wallHit(b) {
    PH.enforceAngle(b, BALL.minVerticalAngle);
    audio.play('wall');
    fx.sparks(b.x, b.y, cfg.theme.ballGlow, 3, 180);
  }

  function paddleHit(b) {
    var p = S.paddle;
    b.y = p.y - b.r - 0.5;
    var rel = clamp((b.x - p.x) / (p.w / 2), -1, 1);
    var angle = rel * PAD.maxBounceAngle * DEG + clamp(p.vx / PAD.keySpeed, -1, 1) * (PAD.velocityInfluence || 0) * DEG;
    angle = clamp(angle, -75 * DEG, 75 * DEG);
    b.dx = Math.sin(angle);
    b.dy = -Math.cos(angle);
    PH.enforceAngle(b, BALL.minVerticalAngle);
    p.squash = 1;
    S.comboHits = 0;
    S.mult = 1;
    fx.sparks(b.x, p.y, cfg.theme.paddle[0], 8, 320, -Math.PI / 2, 1.6);
    audio.play('paddle');
    if (S.timers.catch > 0) {
      b.stuck = true;
      b.caught = true;
      b.stuckT = 0;
      b.stuckOffset = b.x - p.x;
      audio.play('stick');
    }
  }

  function brickCollisions(b) {
    var fire = S.timers.fire > 0;
    var c0 = Math.floor((b.x - b.r - L.gridX) / L.cellW);
    var c1 = Math.floor((b.x + b.r - L.gridX) / L.cellW);
    var r0 = Math.floor((b.y - b.r - L.gridY) / L.cellH);
    var r1 = Math.floor((b.y + b.r - L.gridY) / L.cellH);
    var bestBrick = null;
    var bestPen = 0;
    var bnx = 0, bny = 0;
    for (var i = 0; i < S.bricks.length; i++) {
      var o = S.bricks[i];
      if (!o.alive || o.c < c0 || o.c > c1 || o.r < r0 || o.r > r1) continue;
      if (!PH.circleRect(b.x, b.y, b.r, o.x, o.y, o.w, o.h, hit)) continue;
      if (fire && o.type !== 'steel') {
        o.hp = 0;
        destroyBrick(o);
        fx.embers(o.x + o.w / 2, o.y + o.h / 2, cfg.theme.fireball, 6, 120);
        continue;
      }
      if (hit.pen > bestPen) {
        bestPen = hit.pen;
        bestBrick = o;
        bnx = hit.nx;
        bny = hit.ny;
      }
    }
    if (!bestBrick) return;
    b.x += bnx * bestPen;
    b.y += bny * bestPen;
    PH.reflect(b, bnx, bny);
    PH.enforceAngle(b, BALL.minVerticalAngle);
    b.speed = Math.min(BALL.maxSpeed, b.speed + (BALL.speedUpPerHit || 0));
    damageBrick(bestBrick, false);
  }

  // ------------------------------------------------------------------ flow
  function levelCleared() {
    if (S.phase !== 'play') return;
    S.phase = 'clear';
    S.phaseT = 0;
    if (cfg.slowMoLastBrick !== false && !fx.reducedMotion) S.slowMoT = 0.7;
    var bonusLives = S.lives * (SC.lifeBonus || 0);
    addScore((SC.levelClear || 0) + bonusLives);
    var levelNo = S.levelIndex + 1;
    var finished = S.levelIndex === LEVELS.length - 1;
    S.banner = {
      kind: finished ? 'victory' : 'clear',
      title: finished ? text('victory', 'VICTORY!') : text('levelClear', 'LEVEL {level} CLEAR').replace('{level}', levelNo),
      sub: finished ? text('victorySub', 'All 12 levels smashed') : null,
      lines: [[text('clearBonus', 'CLEAR BONUS'), SC.levelClear || 0], [text('livesBonus', 'LIVES BONUS'), bonusLives]],
      t: 0,
      life: 2.6
    };
    audio.play(finished ? 'victory' : 'levelClear');
    S.balls.forEach(function (b) { fx.glow(b.x, b.y, cfg.theme.ballGlow, 40, 0.4); });
    S.balls.length = 0;
    S.capsules.length = 0;
    S.lasers.length = 0;
    if (S.pilot === 'player') {
      var unlock = Math.min(LEVELS.length, levelNo + 1);
      if (unlock > S.unlocked) {
        S.unlocked = unlock;
        store.set('unlocked', S.unlocked);
      }
      callHook('onLevelUp', levelNo, S.loop + 1);
    }
  }

  function nextLevel() {
    var idx = S.levelIndex + 1;
    if (idx >= LEVELS.length) {
      idx = 0;
      S.loop++;
      fx.text(320, L.H * 0.45, text('loop', 'LOOP {loop}').replace('{loop}', S.loop + 1), cfg.theme.accent2, 40, 1.8);
    }
    startLevel(idx);
  }

  function lifeLost() {
    S.lives--;
    resetTimers();
    S.capsules.length = 0;
    S.lasers.length = 0;
    S.comboHits = 0;
    S.mult = 1;
    fx.shake(0.45);
    audio.play('lifeLost');
    fx.ring(S.paddle.x, S.paddle.y, cfg.theme.accent2, 160, 0.6, 10);
    if (S.lives <= 0) {
      gameOver();
      return;
    }
    S.phase = 'lost';
    S.phaseT = 0;
    if (S.lives === 1) fx.text(320, L.H * 0.55, text('lastLife', 'LAST LIFE!'), cfg.theme.accent2, 38, 1.4);
  }

  function gameOver() {
    S.phase = 'over';
    S.phaseT = 0;
    S.balls.length = 0;
    audio.play('gameOver');
    if (S.pilot === 'player') {
      S.screen = 'gameover';
      hideHint();
      callHook('onGameOver', S.score);
    }
  }

  // ------------------------------------------------------------------ demo bot
  /**
   * Where the bot wants to send the ball: a random reachable brick (the lowest brick of a
   * column, unless that column is closed off by steel). When every remaining brick hides
   * behind steel, aim up through an open column so the ball bounces around behind it.
   */
  function pickBotTarget() {
    var lowest = {};
    var i, c;
    for (i = 0; i < S.bricks.length; i++) {
      var o = S.bricks[i];
      if (!o.alive) continue;
      if (!lowest[o.c] || o.r > lowest[o.c].r) lowest[o.c] = o;
    }
    var reachable = [];
    var open = [];
    for (c = 0; c < L.cols; c++) {
      var b = lowest[c];
      if (!b) open.push(c);
      else if (b.type !== 'steel') reachable.push(b);
    }
    if (reachable.length) {
      var pick = reachable[Math.floor(Math.random() * reachable.length)];
      return { x: pick.x + pick.w / 2, y: pick.y + pick.h, brick: pick };
    }
    if (open.length) {
      c = open[Math.floor(Math.random() * open.length)];
      return { x: L.gridX + (c + 0.5) * L.cellW, y: L.top, brick: null };
    }
    return null;
  }

  function updateBot(dt) {
    var p = S.paddle;
    var target = 320;
    var lowest = null;
    for (var i = 0; i < S.balls.length; i++) {
      var b = S.balls[i];
      if (b.stuck) continue;
      if (b.dy > 0 && (!lowest || b.y > lowest.y)) lowest = b;
    }
    if (lowest) {
      if (!botPlanned) {
        // Plan once per descent: which brick to send the ball at, plus a little human error.
        botTargetBrick = pickBotTarget();
        var skill = BOT.skill == null ? 0.9 : BOT.skill;
        botNoise = (Math.random() - 0.5) * (1 - skill) * 1.2;
        botPlanned = true;
      }
      var px = PH.predictX(lowest.x, lowest.y, lowest.dx, lowest.dy, p.y - lowest.r, L.left + lowest.r, L.right - lowest.r);
      if (px === null) px = lowest.x;
      var rel = 0;
      var aim = botTargetBrick;
      if (aim && (!aim.brick || aim.brick.alive)) {
        var theta = Math.atan2(aim.x - px, p.y - aim.y);
        rel = clamp(theta / (PAD.maxBounceAngle * DEG), -0.9, 0.9);
      }
      target = px - clamp(rel + botNoise, -0.95, 0.95) * p.w / 2;
    } else {
      botPlanned = false;
      var cap = null;
      for (var j = 0; j < S.capsules.length; j++) {
        var cp = S.capsules[j];
        if (cp.type !== 'shrink' && (!cap || cp.y > cap.y)) cap = cp;
      }
      var any = S.balls.length ? S.balls[0] : null;
      target = cap ? cap.x : any ? any.x : 320;
    }
    var maxMove = (BOT.speed || 1500) * dt;
    p.targetX = p.x + clamp(target - p.x, -maxMove, maxMove);

    var stuck = false;
    for (var s = 0; s < S.balls.length; s++) if (S.balls[s].stuck) stuck = true;
    if (stuck && S.phase === 'play') {
      botLaunchT -= dt;
      if (botLaunchT <= 0) {
        launchAll();
        botLaunchT = 0.7;
      }
    }
    if (S.timers.laser > 0) fireLasers();
  }

  // ------------------------------------------------------------------ lasers
  function fireLasers() {
    if (S.timers.laser <= 0 || S.laserCd > 0 || S.phase !== 'play') return;
    S.laserCd = cfg.laserCooldown || 0.26;
    var p = S.paddle;
    S.lasers.push({ x: p.x - p.w * 0.36, y: p.y - 6 });
    S.lasers.push({ x: p.x + p.w * 0.36, y: p.y - 6 });
    audio.play('laser');
  }

  function updateLasers(dt) {
    var speed = cfg.laserSpeed || 1250;
    for (var i = S.lasers.length - 1; i >= 0; i--) {
      var l = S.lasers[i];
      l.y -= speed * dt;
      var gone = l.y < L.top;
      if (!gone) {
        for (var j = 0; j < S.bricks.length; j++) {
          var o = S.bricks[j];
          if (!o.alive || l.x < o.x || l.x > o.x + o.w || l.y > o.y + o.h || l.y + 14 < o.y) continue;
          damageBrick(o, true);
          fx.sparks(l.x, o.y + o.h, cfg.theme.laser, 5, 240, Math.PI / 2, 1.4);
          gone = true;
          break;
        }
      }
      if (gone) S.lasers.splice(i, 1);
    }
  }

  // ------------------------------------------------------------------ update
  function primaryAction() {
    if (S.screen !== 'playing' || S.pilot !== 'player' || now() < inputBlockedUntil) return;
    if (S.phase !== 'play') return;
    if (launchAll()) { hideHint(); return; }
    fireLasers();
  }

  function update(dt) {
    S.time += dt;
    if (S.screen === 'paused') return;
    if (S.slowMoT > 0) {
      S.slowMoT -= dt;
      dt *= 0.3;
    }
    S.phaseT += dt;
    var p = S.paddle;

    // Paddle.
    if (S.pilot !== 'player') updateBot(dt);
    else if (keys.left || keys.right) {
      p.targetX = p.x + ((keys.right ? 1 : 0) - (keys.left ? 1 : 0)) * PAD.keySpeed * dt;
    }
    var widthTarget = PAD.width * (S.timers.wide > 0 ? PAD.wideFactor : 1) * (S.timers.shrink > 0 ? PAD.shrinkFactor : 1);
    p.w += (widthTarget - p.w) * Math.min(1, dt * 10);
    p.y = L.paddleY;
    var half = p.w / 2;
    var newX = clamp(p.targetX, L.left + half, L.right - half);
    p.vx = dt > 0 ? (newX - p.x) / dt : 0;
    p.x = newX;
    p.targetX = newX;
    if (p.squash > 0) p.squash = Math.max(0, p.squash - dt * 5);

    for (var k in S.timers) if (Object.prototype.hasOwnProperty.call(S.timers, k) && S.timers[k] > 0) S.timers[k] = Math.max(0, S.timers[k] - dt);
    if (S.laserCd > 0) S.laserCd -= dt;

    if (S.phase === 'intro' && S.phaseT >= 1.3) {
      S.phase = 'play';
      S.phaseT = 0;
      if (S.pilot === 'player') showLaunchHint();
    }

    if (S.phase === 'play' || S.phase === 'intro') {
      for (var i = S.balls.length - 1; i >= 0; i--) {
        var b = S.balls[i];
        updateBall(b, dt);
        b.trail.unshift(b.x, b.y);
        if (b.trail.length > 16) b.trail.length = 16;
        if (b.lost) S.balls.splice(i, 1);
      }
      if (S.phase === 'play' && S.balls.length === 0) lifeLost();
      updateCapsules(dt);
      updateLasers(dt);
    }

    for (var e = explodeQueue.length - 1; e >= 0; e--) {
      explodeQueue[e].t -= dt;
      if (explodeQueue[e].t <= 0) {
        var eb = explodeQueue[e].brick;
        explodeQueue.splice(e, 1);
        explode(eb);
      }
    }
    for (var bi = 0; bi < S.bricks.length; bi++) {
      if (S.bricks[bi].flash > 0) S.bricks[bi].flash = Math.max(0, S.bricks[bi].flash - dt * 6);
    }

    if (S.phase === 'lost' && S.phaseT >= 1.0) {
      newBall();
      S.phase = 'play';
      S.phaseT = 0;
      if (S.pilot === 'player') showLaunchHint();
    } else if (S.phase === 'clear' && S.phaseT >= 2.6) {
      nextLevel();
    } else if (S.phase === 'over') {
      if (S.pilot === 'player') {
        if (!overlayShown && S.phaseT >= 0.9) {
          overlayShown = true;
          showGameOver();
        }
      } else if (S.phaseT >= 1.6) {
        startBotRun();
      }
    }

    if (S.banner) {
      S.banner.t += dt;
      if (S.banner.t >= S.banner.life) S.banner = null;
    }
    S.shownScore += (S.score - S.shownScore) * Math.min(1, dt * 12);
    if (Math.abs(S.score - S.shownScore) < 0.5) S.shownScore = S.score;
    fx.update(dt);
  }

  function updateCapsules(dt) {
    var p = S.paddle;
    var fall = PCFG.fallSpeed || 175;
    for (var i = S.capsules.length - 1; i >= 0; i--) {
      var c = S.capsules[i];
      c.t += dt;
      c.y += fall * dt;
      if (c.y + 9 >= p.y && c.y - 9 <= p.y + p.h && Math.abs(c.x - p.x) <= p.w / 2 + 18) {
        S.capsules.splice(i, 1);
        applyPowerup(c.type, c.x, p.y);
      } else if (c.y > L.H + 20) {
        S.capsules.splice(i, 1);
      }
    }
  }

  // ------------------------------------------------------------------ DOM ui
  var $ = function (sel) { return document.querySelector(sel); };
  var hud = $('#hud');
  var hintEl = $('#hint');
  var toastEl = $('#toast');
  var screens = { title: $('#screen-title'), levels: $('#screen-levels'), paused: $('#screen-pause'), gameover: $('#screen-over') };
  var overlayShown = false;

  function showScreen(name) {
    for (var key in screens) {
      if (Object.prototype.hasOwnProperty.call(screens, key)) screens[key].classList.toggle('show', key === name);
    }
    hud.classList.toggle('show', S.screen === 'playing' || S.screen === 'paused');
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    inputBlockedUntil = now() + 150;
    if (name && name !== 'title' && screens[name] && !COARSE) {
      var primary = screens[name].querySelector('.btn-primary, .level-btn:not([disabled])');
      setTimeout(function () { if (screens[name].classList.contains('show') && primary) primary.focus({ preventScroll: true }); }, 60);
    }
  }

  function renderBest() {
    var nodes = document.querySelectorAll('[data-best]');
    for (var i = 0; i < nodes.length; i++) nodes[i].textContent = String(S.best);
  }

  function showGameOver() {
    $('#final-score').textContent = String(S.score);
    $('#new-best').hidden = !S.newBest;
    $('#reached').textContent = text('reached', 'Reached level {level}').replace('{level}', S.reached);
    renderBest();
    showScreen('gameover');
  }

  function renderLevelGrid() {
    var grid = $('#level-grid');
    grid.innerHTML = '';
    for (var i = 0; i < LEVELS.length; i++) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'level-btn';
      btn.setAttribute('data-level', String(i));
      var locked = i + 1 > S.unlocked;
      btn.disabled = locked;
      btn.innerHTML = '<span class="level-no">' + (i + 1) + '</span><span class="level-name"></span>' +
        (locked ? '<svg class="lock" viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2" fill="currentColor"/><path d="M8 11V8a4 4 0 0 1 8 0v3" fill="none" stroke="currentColor" stroke-width="2"/></svg>' : '');
      btn.querySelector('.level-name').textContent = LEVELS[i].name;
      btn.setAttribute('aria-label', text('level', 'Level') + ' ' + (i + 1) + ' ' + LEVELS[i].name + (locked ? ' (locked)' : ''));
      grid.appendChild(btn);
    }
  }

  var hintOn = false;
  function showLaunchHint() {
    if (store.get('hinted', false)) return;
    hintEl.textContent = COARSE ? text('launchHintTouch', 'Tap to launch · drag to move') : text('launchHint', 'Click or press Space to launch');
    hintEl.classList.add('show');
    hintOn = true;
  }
  function hideHint() {
    if (!hintOn) return;
    hintOn = false;
    hintEl.classList.remove('show');
    store.set('hinted', true);
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
    for (var i = 0; i < labels.length; i++) labels[i].textContent = muted ? 'Off' : 'On';
  }

  // ------------------------------------------------------------------ flow actions
  function startGame(levelIndex) {
    S.pilot = 'player';
    S.screen = 'playing';
    overlayShown = false;
    beginRun(levelIndex || 0);
    R.fadeIn();
    showScreen(null);
    callHook('onGameStart');
  }

  function startBotRun() {
    var pool = S.pilot === 'demo' ? [1, 2, 4, 5, 6, 7] : [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
    beginRun(pool[Math.floor(Math.random() * pool.length)]);
    R.fadeIn();
  }

  function restart() {
    var hold;
    try { hold = hooks.beforeRestart && hooks.beforeRestart(); } catch (e) { hold = null; }
    Promise.resolve(hold).then(function () { startGame(0); }, function () { startGame(0); });
  }

  function goHome() {
    S.pilot = 'title';
    S.screen = 'title';
    hideHint();
    startBotRun();
    renderBest();
    showScreen('title');
  }

  function pause() {
    if (S.screen !== 'playing' || S.pilot !== 'player') return;
    S.screen = 'paused';
    keys.left = keys.right = false;
    showScreen('paused');
  }

  function resume() {
    if (S.screen !== 'paused') return;
    S.screen = 'playing';
    showScreen(null);
  }

  function share() {
    var msg = text('shareText', 'I scored {score} in Brick Blitz!').replace('{score}', String(S.score));
    if (navigator.share) {
      navigator.share({ text: msg }).catch(function () {});
      return;
    }
    var done = function () { toast(text('copied', 'Copied!')); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(msg).then(done, function () { toast(msg); });
    else toast(msg);
  }

  var ACTIONS = {
    play: function () { startGame(0); },
    levels: function () { renderLevelGrid(); showScreen('levels'); },
    back: function () { showScreen('title'); },
    restart: restart,
    resume: resume,
    pause: pause,
    home: goHome,
    share: share,
    sound: function () { audio.toggle(); }
  };

  document.addEventListener('click', function (e) {
    if (!e.target.closest) return;
    var lvl = e.target.closest('[data-level]');
    if (lvl && !lvl.disabled) {
      audio.unlock();
      audio.play('click');
      startGame(parseInt(lvl.getAttribute('data-level'), 10) || 0);
      return;
    }
    var el = e.target.closest('[data-action]');
    if (!el) return;
    var fn = ACTIONS[el.getAttribute('data-action')];
    if (!fn) return;
    audio.unlock();
    audio.play('click');
    fn();
  });

  // ------------------------------------------------------------------ input
  var canvas = document.getElementById('game');

  function movePaddleTo(clientX, clientY) {
    if (S.pilot !== 'player' || S.screen !== 'playing') return;
    var pt = R.toField(clientX, clientY);
    S.paddle.targetX = pt.x;
  }

  canvas.addEventListener('pointerdown', function (e) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.preventDefault();
    audio.unlock();
    pointerActive = true;
    movePaddleTo(e.clientX, e.clientY);
    primaryAction();
  });
  canvas.addEventListener('pointermove', function (e) {
    if (e.pointerType === 'mouse' || pointerActive) movePaddleTo(e.clientX, e.clientY);
  });
  window.addEventListener('pointerup', function () { pointerActive = false; });
  window.addEventListener('pointercancel', function () { pointerActive = false; });

  window.addEventListener('keydown', function (e) {
    var key = e.key;
    var tag = e.target && e.target.tagName;
    if (key === ' ' || key === 'Spacebar' || key === 'Enter') {
      if (tag === 'BUTTON' || tag === 'A' || tag === 'INPUT') return;
      if (S.screen === 'playing' && S.pilot === 'player') {
        e.preventDefault();
        audio.unlock();
        if (!e.repeat || S.timers.laser > 0) primaryAction();
      } else if (S.screen === 'title' && !screens.levels.classList.contains('show') && !e.repeat && now() >= inputBlockedUntil) {
        e.preventDefault();
        audio.unlock();
        startGame(0);
      }
    } else if (key === 'ArrowLeft' || key === 'a' || key === 'A') {
      keys.left = true;
    } else if (key === 'ArrowRight' || key === 'd' || key === 'D') {
      keys.right = true;
    } else if (key === 'Escape' || key === 'p' || key === 'P') {
      if (S.screen === 'playing') pause();
      else if (S.screen === 'paused') resume();
      else if (screens.levels.classList.contains('show')) showScreen('title');
    } else if (key === 'm' || key === 'M') {
      audio.unlock();
      audio.toggle();
    }
  });
  window.addEventListener('keyup', function (e) {
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keys.left = false;
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keys.right = false;
  });

  document.addEventListener('visibilitychange', function () { if (document.hidden) pause(); });
  window.addEventListener('blur', pause);
  document.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  document.addEventListener('gesturestart', function (e) { e.preventDefault(); });
  window.addEventListener('resize', function () { R.resize(); });

  // ------------------------------------------------------------------ loop
  var last = 0;
  function frame(ts) {
    var dt = last ? Math.min(0.05, Math.max(0, (ts - last) / 1000)) : 1 / 60;
    last = ts;
    update(dt);
    R.draw(S, dt);
    requestAnimationFrame(frame);
  }

  (function boot() {
    for (var i = 0; i < LEVELS.length; i++) {
      for (var r = 0; r < LEVELS[i].rows.length; r++) {
        if (LEVELS[i].rows[r].length !== L.cols && window.console) {
          console.warn('Brick Blitz: level ' + (i + 1) + ' row ' + r + ' is not ' + L.cols + ' characters wide');
        }
      }
    }
    var nodes = document.querySelectorAll('[data-text]');
    for (var n = 0; n < nodes.length; n++) {
      var val = T[nodes[n].getAttribute('data-text')];
      if (typeof val === 'string') nodes[n].textContent = val;
    }
    document.title = cfg.title || 'Brick Blitz';
    var credit = document.querySelector('[data-credit]');
    if (credit) credit.textContent = cfg.studio ? '© ' + cfg.studio : '';
    if (DEMO) document.body.classList.add('is-demo');
    R.init(canvas);
    R.resize();
    audio.onChange(renderSound);
    renderSound();
    renderBest();
    startBotRun();
    if (DEMO) {
      showScreen(null);
      hud.classList.add('show');
    } else {
      showScreen('title');
    }
    requestAnimationFrame(frame);
  })();

  // ------------------------------------------------------------------ debug / test API
  API.id = 'brick-blitz';
  API.version = '1.0.0';
  API.getState = function () {
    return {
      screen: S.screen, score: S.score, best: S.best, level: S.levelIndex + 1, lives: S.lives,
      balls: S.balls.length, bricksLeft: S.breakable, loop: S.loop, demo: DEMO
    };
  };
  API.start = function () { startGame(0); };
  M.state = S; // internal: lets automated tests inspect the simulation
  API.forceGameOver = function () {
    if (S.pilot === 'player' && S.screen === 'playing' && S.phase !== 'over') {
      S.lives = 1;
      S.balls.length = 0;
      lifeLost();
    }
  };
})();
