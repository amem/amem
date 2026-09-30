/*
 * audio.js — every sound effect is synthesized with the Web Audio API (no audio files).
 * The AudioContext is created on the first user gesture (browser autoplay rules).
 */
(function () {
  'use strict';

  var G = window.__GAME__;
  var cfg = window.GAME_CONFIG;
  var storage = G.lib.storage;

  var AC = window.AudioContext || window.webkitAudioContext;
  var ctx = null;
  var master = null;
  var noiseBuf = null;
  var muted = !storage.get('sound', cfg.sound !== false);
  var lastBump = 0;
  var lastMerge = 0;
  var mergeStack = 0;

  // Pentatonic steps: each tier sounds one note higher than the previous one.
  var STEPS = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24, 26, 28, 31];

  function init() {
    if (ctx || !AC) return;
    try {
      ctx = new AC();
    } catch (e) {
      ctx = null;
      return;
    }
    var comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.knee.value = 10;
    comp.ratio.value = 6;
    comp.attack.value = 0.004;
    comp.release.value = 0.2;
    master = ctx.createGain();
    master.gain.value = muted ? 0 : (cfg.volume == null ? 0.7 : cfg.volume);
    master.connect(comp);
    comp.connect(ctx.destination);
    var len = Math.floor(ctx.sampleRate * 1.2);
    noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    var data = noiseBuf.getChannelData(0);
    for (var i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  }

  // Call from any user gesture: creates / resumes the context.
  function unlock() {
    init();
    if (ctx && ctx.state === 'suspended') {
      try { ctx.resume(); } catch (e) { /* ignored */ }
    }
  }

  function ready() {
    return ctx && !muted && ctx.state === 'running';
  }

  function env(g, t0, v, a, d) {
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, v), t0 + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
  }

  // Oscillator voice: f → f2 over d seconds.
  function tone(f, f2, d, type, v, delay, a) {
    var t0 = ctx.currentTime + (delay || 0);
    var osc = ctx.createOscillator();
    var g = ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(f, t0);
    if (f2 && f2 !== f) osc.frequency.exponentialRampToValueAtTime(f2, t0 + d);
    env(g, t0, v, a || 0.006, d);
    osc.connect(g);
    g.connect(master);
    osc.start(t0);
    osc.stop(t0 + d + 0.03);
  }

  // Filtered noise voice: filter sweeps f → f2.
  function noise(f, f2, d, v, type, q, delay, a) {
    var t0 = ctx.currentTime + (delay || 0);
    var src = ctx.createBufferSource();
    var filt = ctx.createBiquadFilter();
    var g = ctx.createGain();
    src.buffer = noiseBuf;
    filt.type = type || 'bandpass';
    filt.Q.value = q || 1;
    filt.frequency.setValueAtTime(f, t0);
    if (f2 && f2 !== f) filt.frequency.exponentialRampToValueAtTime(f2, t0 + d);
    env(g, t0, v, a || 0.01, d);
    src.connect(filt);
    filt.connect(g);
    g.connect(master);
    src.start(t0, Math.random() * 0.5);
    src.stop(t0 + d + 0.03);
  }

  function note(step) {
    return 262 * Math.pow(2, step / 12);
  }

  var sfx = {
    drop: function () {
      if (!ready()) return;
      tone(280, 720, 0.14, 'triangle', 0.16);
      noise(900, 3200, 0.12, 0.05, 'bandpass', 0.8);
    },
    bump: function (strength) {
      if (!ready()) return;
      var now = ctx.currentTime;
      if (now - lastBump < 0.06) return;
      lastBump = now;
      var s = Math.max(0.15, Math.min(1, strength));
      tone(150 + s * 40, 70, 0.1, 'sine', 0.2 * s);
      noise(600, 250, 0.06, 0.05 * s, 'lowpass', 0.7);
    },
    merge: function (tier, combo) {
      if (!ready()) return;
      var now = ctx.currentTime;
      mergeStack = now - lastMerge < 0.05 ? mergeStack + 1 : 0;
      lastMerge = now;
      if (mergeStack > 2) return; // avoid a wall of sound on simultaneous merges
      var f = note(STEPS[Math.min(STEPS.length - 1, tier + Math.min(3, combo - 1))] + 7);
      tone(f * 0.7, f * 1.25, 0.16, 'sine', 0.28);
      tone(f * 2, f * 2.5, 0.12, 'triangle', 0.06, 0.03);
      noise(2400, 1200, 0.05, 0.05, 'bandpass', 2);
      if (combo > 1) tone(f * 1.5, f * 2, 0.18, 'sine', 0.08, 0.07);
    },
    big: function (tier) {
      if (!ready()) return;
      noise(180, 2600, 0.9, 0.22, 'bandpass', 0.9, 0, 0.12);
      tone(110, 38, 0.8, 'sine', 0.42);
      var base = note(STEPS[Math.min(STEPS.length - 1, tier)]);
      for (var i = 0; i < 4; i++) tone(base * [1, 1.25, 1.5, 2][i], 0, 0.5, 'triangle', 0.07, 0.08 + i * 0.07);
    },
    bigBang: function () {
      if (!ready()) return;
      noise(80, 4000, 1.6, 0.35, 'bandpass', 0.6, 0, 0.05);
      tone(90, 25, 1.4, 'sine', 0.6);
      tone(45, 30, 1.6, 'triangle', 0.25);
      for (var i = 0; i < 6; i++) tone(note(12 + STEPS[i + 2]), 0, 0.6, 'triangle', 0.06, 0.25 + i * 0.08);
    },
    newTier: function () {
      if (!ready()) return;
      var seq = [0, 4, 7, 12];
      for (var i = 0; i < seq.length; i++) tone(note(seq[i] + 12), 0, 0.22, 'triangle', 0.09, 0.12 + i * 0.07);
    },
    warn: function (level) {
      if (!ready()) return;
      tone(760 + level * 260, 0, 0.09, 'square', 0.05);
    },
    gameOver: function () {
      if (!ready()) return;
      var seq = [523, 440, 370, 294, 220];
      for (var i = 0; i < seq.length; i++) tone(seq[i], seq[i] * 0.97, 0.26, 'triangle', 0.14, i * 0.14);
      noise(1200, 200, 0.9, 0.06, 'lowpass', 0.5, 0.1);
    },
    start: function () {
      if (!ready()) return;
      tone(330, 990, 0.25, 'sine', 0.14);
      tone(495, 1485, 0.25, 'triangle', 0.05, 0.05);
    },
    click: function () {
      if (!ready()) return;
      tone(880, 620, 0.06, 'sine', 0.12);
    }
  };

  function setMuted(m) {
    muted = !!m;
    storage.set('sound', !muted);
    if (master && ctx) {
      master.gain.setTargetAtTime(muted ? 0 : (cfg.volume == null ? 0.7 : cfg.volume), ctx.currentTime, 0.02);
    }
  }

  G.lib.audio = {
    unlock: unlock,
    sfx: sfx,
    isMuted: function () { return muted; },
    setMuted: setMuted,
    toggle: function () { setMuted(!muted); return muted; }
  };
})();
