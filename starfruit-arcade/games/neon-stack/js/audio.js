/*
 * audio.js — synthesized sound effects (Web Audio API, no audio files).
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

    // Soft feedback echo used by chimes: gives them a shimmering synthwave tail.
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
    /** Wooden-ish "tock" when a block lands. */
    place: function (level) {
      if (!ready()) return;
      var v = 1 + ((level || 0) % 6) * 0.03;
      hiss('bandpass', 1500 * v, 800 * v, 1.6, 0, 0.002, 0.06, 0.45);
      tone('sine', 200 * v, 92 * v, 0, 0.003, 0.12, 0.55);
    },
    /** Pitch-rising pentatonic chime; combo 1 = root note. */
    perfect: function (combo) {
      if (!ready()) return;
      var n = Math.max(0, Math.min((combo || 1) - 1, 14));
      var semis = PENTATONIC[n % 5] + 12 * Math.floor(n / 5);
      var f = noteFreq(523.25, semis);
      tone('sine', f, f, 0, 0.004, 0.6, 0.3, true);
      tone('triangle', f * 2, f * 2, 0, 0.004, 0.22, 0.07, true);
      tone('sine', 190, 95, 0, 0.003, 0.1, 0.35);
    },
    /** Little rising blip when the block regrows. */
    grow: function () {
      if (!ready()) return;
      tone('sine', 620, 1240, 0.05, 0.01, 0.14, 0.1, true);
    },
    /** Swish + tock when a block gets trimmed. */
    slice: function () {
      if (!ready()) return;
      hiss('bandpass', 4200, 650, 0.9, 0, 0.012, 0.2, 0.42);
      tone('sine', 170, 85, 0, 0.003, 0.1, 0.4);
    },
    /** Deep boom on game over. */
    gameOver: function () {
      if (!ready()) return;
      tone('sine', 130, 34, 0, 0.01, 0.95, 0.85);
      tone('triangle', 196, 49, 0.02, 0.01, 0.7, 0.14);
      hiss('lowpass', 900, 110, 0.7, 0, 0.005, 0.75, 0.55);
    },
    /** Rising arpeggio every milestone. */
    milestone: function () {
      if (!ready()) return;
      var steps = [0, 4, 7, 12];
      for (var i = 0; i < steps.length; i++) {
        var f = noteFreq(659.25, steps[i]);
        tone('triangle', f, f, i * 0.075, 0.005, 0.32, 0.16, true);
      }
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
