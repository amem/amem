/*
 * Brick Blitz — audio.js
 * Every sound is synthesized live with the Web Audio API (no audio files).
 * The AudioContext is created on the first user gesture (browser autoplay rules).
 */
(function () {
  'use strict';

  var M = window.__GAME__._m;
  var cfg = window.GAME_CONFIG;
  var store = M.storage;

  var ctx = null;
  var master = null;
  var noiseBuf = null;
  var volume = typeof cfg.volume === 'number' ? cfg.volume : 0.7;
  var muted = !store.get('sound', cfg.sound !== false);
  var lastPlayed = {};
  var listeners = [];

  // Pentatonic steps: brick hits are pitched by row, top rows ring highest.
  var PENT = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24, 26, 28, 31];

  function ensure() {
    if (ctx) return ctx;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try {
      ctx = new AC();
    } catch (e) {
      ctx = null;
      return null;
    }
    var comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16;
    comp.knee.value = 10;
    comp.ratio.value = 4;
    comp.attack.value = 0.003;
    comp.release.value = 0.18;
    master = ctx.createGain();
    master.gain.value = muted ? 0 : volume;
    master.connect(comp);
    comp.connect(ctx.destination);
    var len = Math.floor(ctx.sampleRate * 1.2);
    noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    var data = noiseBuf.getChannelData(0);
    for (var i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    return ctx;
  }

  /** Call from a user gesture (pointerdown / keydown) to allow sound. */
  function unlock() {
    var c = ensure();
    if (c && c.state === 'suspended' && c.resume) c.resume();
  }

  function hz(semi, base) {
    return (base || 392) * Math.pow(2, semi / 12);
  }

  function tone(o) {
    var t = ctx.currentTime + (o.delay || 0);
    var osc = ctx.createOscillator();
    var g = ctx.createGain();
    var dur = o.dur || 0.1;
    osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(o.f, t);
    if (o.f2) osc.frequency.exponentialRampToValueAtTime(o.f2, t + dur);
    if (o.detune) osc.detune.setValueAtTime(o.detune, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(o.vol || 0.2, t + (o.attack || 0.004));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g);
    g.connect(master);
    osc.start(t);
    osc.stop(t + dur + 0.03);
  }

  function noise(o) {
    var t = ctx.currentTime + (o.delay || 0);
    var dur = o.dur || 0.2;
    var src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    var filter = ctx.createBiquadFilter();
    filter.type = o.filter || 'lowpass';
    filter.frequency.setValueAtTime(o.f || 2000, t);
    if (o.f2) filter.frequency.exponentialRampToValueAtTime(o.f2, t + dur);
    filter.Q.value = o.q || 0.8;
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(o.vol || 0.3, t + (o.attack || 0.004));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filter);
    filter.connect(g);
    g.connect(master);
    src.start(t, Math.random() * 0.4);
    src.stop(t + dur + 0.03);
  }

  function arp(semis, step, o) {
    for (var i = 0; i < semis.length; i++) {
      tone({ f: hz(semis[i], o.base), dur: o.dur, type: o.type, vol: o.vol, delay: i * step + (o.delay || 0) });
    }
  }

  var SFX = {
    paddle: function () {
      tone({ f: 330, f2: 190, dur: 0.13, type: 'sine', vol: 0.34 });
      tone({ f: 660, f2: 400, dur: 0.07, type: 'triangle', vol: 0.12 });
    },
    brick: function (row) {
      var f = hz(PENT[Math.max(0, 13 - Math.min(13, row | 0))]);
      tone({ f: f, dur: 0.11, type: 'square', vol: 0.085 });
      tone({ f: f * 2, dur: 0.09, type: 'triangle', vol: 0.1 });
      noise({ f: 6000, filter: 'highpass', dur: 0.04, vol: 0.06 });
    },
    hit: function (row) {
      var f = hz(PENT[Math.max(0, 13 - Math.min(13, row | 0))]) * 0.75;
      tone({ f: f, f2: f * 0.9, dur: 0.07, type: 'triangle', vol: 0.16 });
      noise({ f: 3500, filter: 'bandpass', q: 2, dur: 0.05, vol: 0.08 });
    },
    steel: function () {
      tone({ f: 1760, dur: 0.16, type: 'square', vol: 0.035 });
      tone({ f: 2637, dur: 0.12, type: 'square', vol: 0.03, detune: 12 });
      tone({ f: 3520, dur: 0.22, type: 'sine', vol: 0.07 });
    },
    wall: function () {
      tone({ f: 980, f2: 760, dur: 0.035, type: 'sine', vol: 0.05 });
    },
    explosion: function () {
      noise({ f: 2600, f2: 110, dur: 0.6, vol: 0.55 });
      tone({ f: 150, f2: 36, dur: 0.45, type: 'sine', vol: 0.55 });
      tone({ f: 80, f2: 30, dur: 0.5, type: 'triangle', vol: 0.3, delay: 0.02 });
    },
    powerup: function () {
      arp([0, 4, 7, 12, 16], 0.05, { base: 523, dur: 0.12, type: 'square', vol: 0.07 });
      arp([12, 16, 19, 24], 0.05, { base: 523, dur: 0.14, type: 'triangle', vol: 0.09, delay: 0.02 });
    },
    powerdown: function () {
      arp([7, 3, 0, -5], 0.07, { base: 330, dur: 0.14, type: 'sawtooth', vol: 0.05 });
      tone({ f: 200, f2: 90, dur: 0.35, type: 'sine', vol: 0.2 });
    },
    life: function () {
      arp([0, 4, 7, 12, 16, 19, 24], 0.055, { base: 523, dur: 0.16, type: 'triangle', vol: 0.14 });
    },
    laser: function () {
      tone({ f: 1700, f2: 380, dur: 0.12, type: 'sawtooth', vol: 0.045 });
      tone({ f: 2600, f2: 900, dur: 0.08, type: 'square', vol: 0.02 });
    },
    launch: function () {
      tone({ f: 300, f2: 780, dur: 0.14, type: 'triangle', vol: 0.2 });
      noise({ f: 1200, f2: 5000, filter: 'bandpass', q: 1.5, dur: 0.12, vol: 0.06 });
    },
    stick: function () {
      tone({ f: 180, f2: 120, dur: 0.1, type: 'sine', vol: 0.3 });
    },
    combo: function (level) {
      tone({ f: hz(12 + Math.min(level, 10) * 2, 392), dur: 0.12, type: 'triangle', vol: 0.12 });
    },
    lifeLost: function () {
      tone({ f: 440, f2: 70, dur: 0.7, type: 'sawtooth', vol: 0.09 });
      tone({ f: 220, f2: 50, dur: 0.8, type: 'sine', vol: 0.35 });
      noise({ f: 1500, f2: 100, dur: 0.5, vol: 0.2 });
    },
    levelClear: function () {
      arp([0, 4, 7, 12, 7, 12, 16, 19, 24], 0.085, { base: 392, dur: 0.18, type: 'square', vol: 0.06 });
      arp([0, 7, 12, 19], 0.17, { base: 196, dur: 0.3, type: 'triangle', vol: 0.18 });
    },
    victory: function () {
      arp([0, 4, 7, 12, 16, 19, 24, 28, 31, 36], 0.09, { base: 392, dur: 0.22, type: 'square', vol: 0.06 });
      arp([0, 0, 7, 7, 12], 0.18, { base: 131, dur: 0.35, type: 'triangle', vol: 0.22 });
    },
    gameOver: function () {
      arp([7, 3, 0, -5, -9], 0.2, { base: 330, dur: 0.34, type: 'triangle', vol: 0.2 });
      tone({ f: 110, f2: 55, dur: 1.1, type: 'sine', vol: 0.25, delay: 0.3 });
    },
    click: function () {
      tone({ f: 880, f2: 640, dur: 0.05, type: 'sine', vol: 0.16 });
    },
    appear: function () {
      arp([12, 19, 24], 0.04, { base: 392, dur: 0.1, type: 'sine', vol: 0.08 });
    }
  };

  var THROTTLE = { explosion: 0.07, brick: 0.022, hit: 0.022, steel: 0.04, wall: 0.05, laser: 0.05 };

  /** Play a named effect. `arg` is effect-specific (row for bricks, level for combo). */
  function play(name, arg) {
    if (muted || !ctx || ctx.state !== 'running' || !SFX[name]) return;
    var now = ctx.currentTime;
    var gap = THROTTLE[name] || 0.015;
    if (lastPlayed[name] && now - lastPlayed[name] < gap) return;
    lastPlayed[name] = now;
    try {
      SFX[name](arg);
    } catch (e) { /* never let audio break the game */ }
  }

  function setMuted(value) {
    muted = !!value;
    store.set('sound', !muted);
    if (master && ctx) master.gain.setTargetAtTime(muted ? 0 : volume, ctx.currentTime, 0.02);
    for (var i = 0; i < listeners.length; i++) listeners[i](muted);
  }

  M.audio = {
    unlock: unlock,
    play: play,
    isMuted: function () { return muted; },
    setMuted: setMuted,
    toggle: function () { setMuted(!muted); if (!muted) play('click'); return muted; },
    onChange: function (fn) { listeners.push(fn); }
  };
})();
