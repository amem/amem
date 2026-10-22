/*
 * audio.js — Swapsy sound effects, synthesized with the Web Audio API (no audio files).
 * The AudioContext is created on the first user gesture (browser autoplay rules).
 * Public: unlock(), sfx.<name>(), isMuted(), setMuted(bool), toggleMute().
 */
(function () {
  'use strict';
  var NS = window.__GAME__ = window.__GAME__ || {};
  var M = NS.modules = NS.modules || {};
  var cfg = window.GAME_CONFIG || {};
  var soundCfg = cfg.sound || {};
  var storage = M.storage;

  var AC = window.AudioContext || window.webkitAudioContext;
  var VOLUME = typeof soundCfg.volume === 'number' ? soundCfg.volume : 0.7;
  var PENTATONIC = [0, 2, 4, 7, 9];

  var ctx = null;
  var master = null;
  var echo = null;
  var noise = null;
  var muted = storage.get('muted', soundCfg.enabledByDefault === false);
  var listeners = [];

  function build() {
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : VOLUME;
    var comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -12;
    comp.knee.value = 12;
    comp.ratio.value = 4;
    master.connect(comp);
    comp.connect(ctx.destination);

    // Soft feedback echo used by chimes: gives them a sparkly tail.
    echo = ctx.createGain();
    echo.gain.value = 0.3;
    var delay = ctx.createDelay(1);
    delay.delayTime.value = 0.17;
    var feedback = ctx.createGain();
    feedback.gain.value = 0.33;
    var tone = ctx.createBiquadFilter();
    tone.type = 'lowpass';
    tone.frequency.value = 2800;
    echo.connect(delay);
    delay.connect(tone);
    tone.connect(feedback);
    feedback.connect(delay);
    tone.connect(master);

    var len = Math.floor(ctx.sampleRate * 1.2);
    noise = ctx.createBuffer(1, len, ctx.sampleRate);
    var data = noise.getChannelData(0);
    for (var i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  }

  /** Create / resume the context. Call from a user gesture handler. */
  function unlock() {
    if (!AC) return;
    try {
      if (!ctx) build();
      if (ctx.state === 'suspended') ctx.resume();
    } catch (e) {
      ctx = null;
    }
  }

  function ready() {
    return ctx && !muted && ctx.state === 'running';
  }

  function envelope(param, t, attack, decay, peak) {
    param.setValueAtTime(0.0001, t);
    param.exponentialRampToValueAtTime(peak, t + attack);
    param.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  }

  function tone(type, f0, f1, delayS, attack, decay, peak, toEcho) {
    var t = ctx.currentTime + (delayS || 0);
    var osc = ctx.createOscillator();
    var gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) osc.frequency.exponentialRampToValueAtTime(f1, t + attack + decay);
    envelope(gain.gain, t, attack, decay, peak);
    osc.connect(gain);
    gain.connect(master);
    if (toEcho) gain.connect(echo);
    osc.start(t);
    osc.stop(t + attack + decay + 0.05);
  }

  function hiss(filterType, f0, f1, q, delayS, attack, decay, peak) {
    var t = ctx.currentTime + (delayS || 0);
    var src = ctx.createBufferSource();
    src.buffer = noise;
    var filter = ctx.createBiquadFilter();
    filter.type = filterType;
    filter.Q.value = q;
    filter.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) filter.frequency.exponentialRampToValueAtTime(f1, t + attack + decay);
    var gain = ctx.createGain();
    envelope(gain.gain, t, attack, decay, peak);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    src.start(t, Math.random() * 0.6);
    src.stop(t + attack + decay + 0.05);
  }

  function noteFreq(base, semitones) {
    return base * Math.pow(2, semitones / 12);
  }

  var sfx = {
    /** Soft whoosh when two pieces trade places. */
    swap: function () {
      if (!ready()) return;
      hiss('bandpass', 900, 2600, 1.2, 0, 0.01, 0.12, 0.22);
      tone('sine', 420, 640, 0, 0.004, 0.09, 0.12);
    },
    /** "Nope" bonk for a swap that makes no match. */
    nope: function () {
      if (!ready()) return;
      tone('triangle', 260, 170, 0, 0.004, 0.16, 0.28);
      tone('triangle', 230, 150, 0.1, 0.004, 0.16, 0.22);
    },
    /** Bubbly pop chime that climbs with every cascade step. */
    match: function (cascade) {
      if (!ready()) return;
      var n = Math.max(0, Math.min((cascade || 1) - 1, 14));
      var semis = PENTATONIC[n % 5] + 12 * Math.floor(n / 5);
      var f = noteFreq(587.33, semis);
      tone('sine', f, f, 0, 0.003, 0.3, 0.26, true);
      tone('triangle', f * 1.5, f * 1.5, 0.03, 0.003, 0.16, 0.08, true);
      hiss('highpass', 3000, 3000, 0.7, 0, 0.002, 0.05, 0.1);
    },
    /** Sparkle when a special piece is created. */
    special: function () {
      if (!ready()) return;
      [0, 4, 7, 12, 16].forEach(function (s, i) {
        var f = noteFreq(880, s);
        tone('triangle', f, f, i * 0.04, 0.004, 0.18, 0.1, true);
      });
    },
    /** Laser zap for a line blaster. */
    line: function () {
      if (!ready()) return;
      tone('sawtooth', 1400, 220, 0, 0.004, 0.28, 0.12);
      hiss('bandpass', 5000, 900, 1.4, 0, 0.004, 0.3, 0.26);
    },
    /** Round boom for a bomb. */
    bomb: function () {
      if (!ready()) return;
      tone('sine', 150, 45, 0, 0.006, 0.55, 0.7);
      hiss('lowpass', 1600, 140, 0.8, 0, 0.004, 0.5, 0.6);
    },
    /** Magic shimmer for a rainbow piece. */
    rainbow: function () {
      if (!ready()) return;
      for (var i = 0; i < 8; i++) {
        var f = noteFreq(784, PENTATONIC[i % 5] + 12 * Math.floor(i / 5));
        tone('sine', f, f, i * 0.035, 0.004, 0.3, 0.09, true);
      }
      hiss('highpass', 6000, 9000, 0.8, 0, 0.05, 0.6, 0.12);
    },
    /** Tick while moves turn into bonus points. */
    tick: function (i) {
      if (!ready()) return;
      var f = noteFreq(988, PENTATONIC[(i || 0) % 5]);
      tone('triangle', f, f, 0, 0.002, 0.08, 0.12);
    },
    /** One star earned on the result screen. */
    star: function (n) {
      if (!ready()) return;
      var f = noteFreq(784, [0, 4, 7][Math.max(0, Math.min(2, (n || 1) - 1))]);
      tone('triangle', f, f, 0, 0.004, 0.4, 0.22, true);
      tone('sine', f * 2, f * 2, 0.02, 0.004, 0.3, 0.08, true);
    },
    /** Fanfare when a level is won. */
    win: function () {
      if (!ready()) return;
      [0, 4, 7, 12, 7, 12, 16].forEach(function (s, i) {
        var f = noteFreq(523.25, s);
        tone('triangle', f, f, i * 0.09, 0.005, 0.3, 0.16, true);
      });
    },
    /** Gentle descending phrase when moves run out. */
    lose: function () {
      if (!ready()) return;
      [7, 4, 0, -5].forEach(function (s, i) {
        var f = noteFreq(392, s);
        tone('triangle', f, f, i * 0.14, 0.006, 0.3, 0.14);
      });
    },
    /** Rustle while the board reshuffles. */
    shuffle: function () {
      if (!ready()) return;
      for (var i = 0; i < 5; i++) hiss('bandpass', 1200 + i * 400, 2400, 1, i * 0.06, 0.01, 0.08, 0.16);
    },
    /** UI button click. */
    click: function () {
      if (!ready()) return;
      tone('triangle', 920, 680, 0, 0.002, 0.07, 0.16);
    }
  };

  function setMuted(value) {
    muted = !!value;
    storage.set('muted', muted);
    if (ctx && master) {
      var t = ctx.currentTime;
      master.gain.cancelScheduledValues(t);
      master.gain.setTargetAtTime(muted ? 0 : VOLUME, t, 0.02);
    }
    for (var i = 0; i < listeners.length; i++) listeners[i](muted);
  }

  M.audio = {
    unlock: unlock,
    sfx: sfx,
    isMuted: function () { return muted; },
    setMuted: setMuted,
    toggleMute: function () { setMuted(!muted); return muted; },
    onChange: function (fn) { listeners.push(fn); }
  };
})();
