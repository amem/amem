/*
 * shared/brand.js — Promo Arcade shared runtime (window.PromoArcade).
 *
 * Applies brand.config.js to every page (colours → CSS variables with automatic text
 * contrast, logo, texts), and provides what the three games share: safe storage,
 * synthesized sound, confetti, toasts, copy/share, reward tiers, the reward ticket with
 * the optional lead-capture form, the hub page, and the game shell (screens, pause,
 * keyboard, demo mode and the window.__GAME__ test API).
 *
 * Load order on every page: brand.config.js → shared/icons.js → shared/brand.js → game files.
 */
(function () {
  'use strict';
  var PA = window.PromoArcade = window.PromoArcade || {};
  var B = window.BRAND_CONFIG || {};
  var doc = document;
  var root = doc.documentElement;

  // ---------------------------------------------------------------- helpers
  function extend(target) {
    for (var i = 1; i < arguments.length; i++) {
      var src = arguments[i];
      if (!src) continue;
      for (var k in src) if (Object.prototype.hasOwnProperty.call(src, k)) target[k] = src[k];
    }
    return target;
  }
  function $(sel, scope) { return (scope || doc).querySelector(sel); }
  function $$(sel, scope) { return Array.prototype.slice.call((scope || doc).querySelectorAll(sel)); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function fmt(str, vars) {
    return String(str == null ? '' : str).replace(/\{(\w+)\}/g, function (m, k) {
      return vars && vars[k] != null ? vars[k] : m;
    });
  }
  function now() { return (window.performance && performance.now) ? performance.now() : Date.now(); }
  function callHook(name) {
    var fn = B.hooks && B.hooks[name];
    if (typeof fn !== 'function') return undefined;
    try {
      return fn.apply(null, Array.prototype.slice.call(arguments, 1));
    } catch (e) {
      if (window.console) console.error('[Promo Arcade] hooks.' + name + ' failed:', e);
      return undefined;
    }
  }

  PA.version = '1.0.0';
  PA.brand = B;
  PA.esc = esc;
  PA.fmt = fmt;
  PA.extend = extend;
  PA.hook = callHook;
  PA.reducedMotion = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);

  // ---------------------------------------------------------------- texts
  var DEFAULT_TEXTS = {
    allGames: 'All games', play: 'Play', playAgain: 'Play again', resume: 'Resume', restart: 'Restart',
    home: 'Home', share: 'Share', sound: 'Sound', on: 'On', off: 'Off', paused: 'Paused', best: 'Best',
    newBest: 'New best!', youWon: 'You won', yourCode: 'Your code', copy: 'Copy', copied: 'Code copied!',
    nextReward: 'Score {min} to win {title}', winUpTo: 'Win up to {title}',
    leadTitle: 'Where should we send your code?', leadTitleRequired: 'Enter your details to reveal your code',
    leadName: 'Your name', leadEmail: 'Email address', leadPhone: 'Phone number',
    leadSubmit: 'Send me the code', leadReveal: 'Reveal my code', leadThanks: 'Thanks! Your code is on its way.',
    leadInvalid: 'Please check the highlighted field.', shareCopied: 'Link copied. Paste it anywhere!',
    demoNotice: 'Demo brand'
  };
  var T = PA.texts = extend({}, DEFAULT_TEXTS, B.texts);

  // ---------------------------------------------------------------- paths
  // Paths in brand.config.js are relative to the kit folder (the parent of shared/).
  var me = doc.currentScript && doc.currentScript.src;
  var kitRoot = me ? me.replace(/shared\/brand\.js(?:[?#].*)?$/, '') : '';
  PA.asset = function (p) {
    if (!p) return '';
    if (/^(data:|blob:|[a-z]+:|\/)/i.test(p)) return p;
    return kitRoot + p;
  };

  // ---------------------------------------------------------------- colours
  function parseHex(hex) {
    var h = String(hex || '').trim().replace(/^#/, '');
    if (h.length === 3) h = h.charAt(0) + h.charAt(0) + h.charAt(1) + h.charAt(1) + h.charAt(2) + h.charAt(2);
    if (!/^[0-9a-f]{6}$/i.test(h)) return null;
    var n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function toHex(rgb) {
    return '#' + rgb.map(function (v) {
      var s = Math.max(0, Math.min(255, Math.round(v))).toString(16);
      return s.length < 2 ? '0' + s : s;
    }).join('');
  }
  function mix(a, b, t) {
    var A = parseHex(a) || [0, 0, 0], C = parseHex(b) || [0, 0, 0];
    return toHex([A[0] + (C[0] - A[0]) * t, A[1] + (C[1] - A[1]) * t, A[2] + (C[2] - A[2]) * t]);
  }
  function rgba(hex, a) {
    var c = parseHex(hex) || [0, 0, 0];
    return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')';
  }
  function luminance(hex) {
    var c = parseHex(hex) || [0, 0, 0];
    var l = c.map(function (v) {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * l[0] + 0.7152 * l[1] + 0.0722 * l[2];
  }
  function contrast(a, b) {
    var x = luminance(a), y = luminance(b);
    return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
  }
  /** White or near-black text, whichever reads better on `bg` (white wins ties on bold buttons). */
  function onColor(bg, dark) {
    dark = dark || '#1d1410';
    return contrast(bg, '#ffffff') >= 2.9 || contrast(bg, '#ffffff') >= contrast(bg, dark) ? '#ffffff' : dark;
  }

  var C = extend({
    primary: '#ff5b2e', secondary: '#13a874', accent: '#ffc928', background: '#fff3e3',
    surface: '#ffffff', text: '#2b1708', deep: '#0d4d3a'
  }, B.colors);
  PA.colors = C;
  PA.color = { mix: mix, rgba: rgba, onColor: onColor, contrast: contrast };

  function applyTheme() {
    var s = root.style;
    var set = function (k, v) { s.setProperty(k, v); };
    set('--c-primary', C.primary);
    set('--c-on-primary', onColor(C.primary, mix(C.text, '#000000', 0.3)));
    set('--c-primary-dark', mix(C.primary, '#000000', 0.2));
    set('--c-primary-soft', mix(C.primary, C.background, 0.84));
    set('--c-secondary', C.secondary);
    set('--c-on-secondary', onColor(C.secondary, mix(C.text, '#000000', 0.3)));
    set('--c-secondary-dark', mix(C.secondary, '#000000', 0.22));
    set('--c-accent', C.accent);
    set('--c-on-accent', onColor(C.accent, mix(C.text, '#000000', 0.3)));
    set('--c-accent-dark', mix(C.accent, '#000000', 0.25));
    set('--c-bg', C.background);
    set('--c-bg-2', mix(C.background, C.primary, 0.08));
    set('--c-surface', C.surface);
    set('--c-text', C.text);
    set('--c-muted', mix(C.text, C.surface, 0.42));
    set('--c-line', mix(C.text, C.surface, 0.86));
    set('--c-deep', C.deep);
    set('--c-deep-2', mix(C.deep, '#000000', 0.3));
    set('--c-on-deep', onColor(C.deep));
    var f = B.fonts || {};
    if (f.heading) set('--f-heading', f.heading);
    if (f.body) set('--f-body', f.body);
    var meta = $('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', C.deep);
  }

  // ---------------------------------------------------------------- storage
  var ls = null;
  try {
    ls = window.localStorage;
    ls.setItem('__pa_probe', '1');
    ls.removeItem('__pa_probe');
  } catch (e) {
    ls = null;
  }
  var memory = {};
  /** Namespaced storage that never throws (private mode, sandboxed iframes, file://). */
  PA.store = function (ns) {
    var prefix = (B.storageKey || 'promo-arcade') + ':' + ns + ':';
    return {
      get: function (key, fallback) {
        var raw = null;
        if (ls) { try { raw = ls.getItem(prefix + key); } catch (e) { raw = null; } }
        if (raw === null && Object.prototype.hasOwnProperty.call(memory, prefix + key)) raw = memory[prefix + key];
        if (raw === null || raw === undefined) return fallback;
        try { return JSON.parse(raw); } catch (e) { return fallback; }
      },
      set: function (key, value) {
        var raw = JSON.stringify(value);
        memory[prefix + key] = raw;
        if (ls) { try { ls.setItem(prefix + key, raw); } catch (e) { /* quota or denied: memory copy kept */ } }
      }
    };
  };
  var kitStore = PA.store('kit');

  // ---------------------------------------------------------------- images & products
  var imgCache = {};
  var pending = 0;
  var readyQueue = [];
  function flushReady() {
    if (pending > 0) return;
    var q = readyQueue;
    readyQueue = [];
    q.forEach(function (fn) { fn(); });
  }
  /** Cached HTMLImageElement for a URL (data URIs included). */
  PA.image = function (src) {
    if (!src) return null;
    if (imgCache[src]) return imgCache[src];
    var img = new Image();
    imgCache[src] = img;
    pending++;
    var done = function () {
      if (img.__done) return;
      img.__done = true;
      pending--;
      flushReady();
    };
    img.onload = done;
    img.onerror = function () { img.__failed = true; done(); };
    img.src = src;
    return img;
  };
  /**
   * Calls fn once every image requested so far has loaded (or after 3 s at most).
   * Always asynchronous, so the calling script finishes its own setup first.
   */
  PA.ready = function (fn) {
    var called = false;
    var once = function () { if (!called) { called = true; fn(); } };
    readyQueue.push(once);
    setTimeout(once, 3000);
    setTimeout(flushReady, 0);
  };
  PA.iconSrc = function (key) { return PA.icons && PA.icons.has(key) ? PA.icons.uri(key) : ''; };
  function emojiSrc(emoji) {
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><text x="32" y="53" font-size="52" text-anchor="middle">' +
      esc(emoji) + '</text></svg>');
  }
  var FALLBACK_COLORS = [C.primary, C.secondary, C.accent, mix(C.primary, C.accent, 0.5), mix(C.secondary, C.deep, 0.3)];
  PA.productSrc = function (p) {
    if (!p) return PA.iconSrc('star');
    if (p.image) return PA.asset(p.image);
    if (p.emoji) return emojiSrc(p.emoji);
    return PA.iconSrc(p.icon) || PA.iconSrc('star');
  };
  PA.products = ((B.products && B.products.length) ? B.products : [{ name: 'Star', icon: 'star' }]).map(function (p, i) {
    var src = PA.productSrc(p);
    return { name: p.name || '', color: p.color || FALLBACK_COLORS[i % FALLBACK_COLORS.length], src: src, img: PA.image(src) };
  });

  // ---------------------------------------------------------------- audio
  var AC = window.AudioContext || window.webkitAudioContext;
  var sndCfg = B.sound || {};
  var VOLUME = typeof sndCfg.volume === 'number' ? sndCfg.volume : 0.7;
  var muted = !!kitStore.get('muted', sndCfg.enabledByDefault === false);
  var actx = null, master = null, noiseBuf = null;
  var PENT = [0, 2, 4, 7, 9];

  function buildAudio() {
    actx = new AC();
    master = actx.createGain();
    master.gain.value = muted ? 0 : VOLUME;
    var comp = actx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.ratio.value = 4;
    master.connect(comp);
    comp.connect(actx.destination);
    var len = Math.floor(actx.sampleRate * 0.8);
    noiseBuf = actx.createBuffer(1, len, actx.sampleRate);
    var d = noiseBuf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  }
  function unlock() {
    if (!AC) return;
    if (!actx) { try { buildAudio(); } catch (e) { actx = null; return; } }
    if (actx.state === 'suspended' && actx.resume) actx.resume().catch(function () {});
  }
  function tone(freq, t, dur, o) {
    o = o || {};
    var osc = actx.createOscillator();
    var g = actx.createGain();
    osc.type = o.type || 'triangle';
    osc.frequency.setValueAtTime(freq, t);
    if (o.slide) osc.frequency.exponentialRampToValueAtTime(o.slide, t + dur);
    var peak = o.gain || 0.25;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + (o.attack || 0.008));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g);
    g.connect(master);
    osc.start(t);
    osc.stop(t + dur + 0.03);
  }
  function noise(t, dur, o) {
    o = o || {};
    var src = actx.createBufferSource();
    src.buffer = noiseBuf;
    var f = actx.createBiquadFilter();
    f.type = o.filter || 'bandpass';
    f.frequency.setValueAtTime(o.freq || 1200, t);
    if (o.sweep) f.frequency.exponentialRampToValueAtTime(o.sweep, t + dur);
    f.Q.value = o.q || 1;
    var g = actx.createGain();
    g.gain.setValueAtTime(o.gain || 0.2, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f);
    f.connect(g);
    g.connect(master);
    src.start(t);
    src.stop(t + dur + 0.03);
  }
  var note = function (semi) { return 523.25 * Math.pow(2, semi / 12); };
  function play(fn) {
    if (muted || !actx || actx.state !== 'running') return;
    try { fn(actx.currentTime + 0.01); } catch (e) { /* audio is best-effort */ }
  }
  var sfx = {
    tap: function () { play(function (t) { tone(740, t, 0.07, { gain: 0.18 }); }); },
    catchItem: function (combo) {
      play(function (t) {
        var s = PENT[combo % 5] + 12 * (Math.floor(combo / 5) % 2);
        tone(note(s), t, 0.14, { gain: 0.3 });
        tone(note(s + 12), t + 0.02, 0.09, { type: 'sine', gain: 0.1 });
      });
    },
    golden: function () {
      play(function (t) { [0, 4, 7, 12, 16].forEach(function (s, i) { tone(note(s + 7), t + i * 0.045, 0.16, { gain: 0.2 }); }); });
    },
    bad: function () {
      play(function (t) {
        tone(160, t, 0.38, { type: 'sawtooth', gain: 0.22, slide: 50 });
        noise(t, 0.32, { filter: 'lowpass', freq: 900, sweep: 120, gain: 0.5 });
      });
    },
    tick: function () { play(function (t) { tone(1500, t, 0.03, { type: 'square', gain: 0.05 }); }); },
    urgent: function () { play(function (t) { tone(988, t, 0.1, { type: 'square', gain: 0.09 }); }); },
    count: function () { play(function (t) { tone(659, t, 0.14, { gain: 0.24 }); }); },
    go: function () { play(function (t) { tone(988, t, 0.3, { gain: 0.28 }); tone(1319, t + 0.02, 0.3, { type: 'sine', gain: 0.12 }); }); },
    flip: function () { play(function (t) { noise(t, 0.08, { freq: 2600, q: 0.8, gain: 0.22 }); tone(520, t, 0.07, { type: 'sine', gain: 0.07, slide: 900 }); }); },
    match: function (n) {
      play(function (t) {
        var s = PENT[(n || 0) % 5];
        tone(note(s + 7), t, 0.14, { gain: 0.24 });
        tone(note(s + 14), t + 0.08, 0.24, { gain: 0.22 });
      });
    },
    miss: function () { play(function (t) { tone(330, t, 0.18, { gain: 0.2, slide: 210 }); }); },
    peg: function () { play(function (t) { tone(1900 + Math.random() * 300, t, 0.025, { type: 'square', gain: 0.045 }); noise(t, 0.02, { filter: 'highpass', freq: 4000, gain: 0.12 }); }); },
    whoosh: function () { play(function (t) { noise(t, 0.7, { freq: 400, sweep: 2400, q: 1.2, gain: 0.28 }); }); },
    win: function () {
      play(function (t) {
        [0, 4, 7, 12].forEach(function (s, i) { tone(note(s), t + i * 0.09, 0.22, { gain: 0.24 }); });
        [0, 4, 7, 12].forEach(function (s) { tone(note(s + 12), t + 0.4, 0.7, { type: 'sine', gain: 0.08 }); });
      });
    },
    lose: function () {
      play(function (t) { [7, 4, 0].forEach(function (s, i) { tone(note(s - 5), t + i * 0.13, 0.22, { gain: 0.18 }); }); });
    },
    copy: function () { play(function (t) { tone(988, t, 0.06, { gain: 0.15 }); tone(1319, t + 0.06, 0.09, { gain: 0.15 }); }); }
  };
  function setMuted(m) {
    muted = !!m;
    kitStore.set('muted', muted);
    if (master && actx) master.gain.setTargetAtTime(muted ? 0 : VOLUME, actx.currentTime, 0.02);
    syncSoundUi();
  }
  function syncSoundUi() {
    if (doc.body) doc.body.classList.toggle('is-muted', muted);
    $$('[data-sound-label]').forEach(function (n) { n.textContent = muted ? T.off : T.on; });
    $$('[data-action="sound"]').forEach(function (n) { n.setAttribute('aria-pressed', muted ? 'false' : 'true'); });
  }
  PA.audio = {
    unlock: unlock,
    isMuted: function () { return muted; },
    setMuted: setMuted,
    toggle: function () { unlock(); setMuted(!muted); if (!muted) sfx.tap(); }
  };
  PA.sfx = sfx;

  // ---------------------------------------------------------------- confetti
  var conf = { canvas: null, ctx: null, parts: [], running: false, last: 0, dpr: 1 };
  function confettiFrame(t) {
    var c = conf.ctx;
    var dt = Math.min(0.05, (t - conf.last) / 1000 || 0.016);
    conf.last = t;
    var w = conf.canvas.width, h = conf.canvas.height, dpr = conf.dpr;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, w, h);
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    var alive = [];
    for (var i = 0; i < conf.parts.length; i++) {
      var p = conf.parts[i];
      p.life -= dt;
      if (p.life <= 0 || p.y > innerHeight + 40) continue;
      p.vy += 820 * dt;
      p.vx *= Math.pow(0.4, dt);
      p.vy *= Math.pow(0.7, dt);
      p.x += (p.vx + Math.sin(p.phase += dt * 6) * 40) * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
      c.globalAlpha = Math.min(1, p.life * 2);
      c.save();
      c.translate(p.x, p.y);
      c.rotate(p.rot);
      c.fillStyle = p.color;
      if (p.round) {
        c.beginPath();
        c.arc(0, 0, p.w * 0.45, 0, Math.PI * 2);
        c.fill();
      } else {
        c.scale(1, Math.abs(Math.cos(p.phase * 0.7)) * 0.8 + 0.2);
        c.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      }
      c.restore();
      alive.push(p);
    }
    c.globalAlpha = 1;
    conf.parts = alive;
    if (alive.length) requestAnimationFrame(confettiFrame);
    else {
      conf.running = false;
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.clearRect(0, 0, w, h);
    }
  }
  /** Confetti burst. opts: { x, y (viewport px), count, spread (deg), power, colors }. */
  PA.confetti = function (opts) {
    opts = opts || {};
    if (!conf.canvas) {
      conf.canvas = doc.createElement('canvas');
      conf.canvas.className = 'pa-confetti';
      conf.canvas.setAttribute('aria-hidden', 'true');
      doc.body.appendChild(conf.canvas);
      conf.ctx = conf.canvas.getContext('2d');
    }
    conf.dpr = Math.min(window.devicePixelRatio || 1, 2);
    var W = Math.round(innerWidth * conf.dpr), H = Math.round(innerHeight * conf.dpr);
    if (conf.canvas.width !== W || conf.canvas.height !== H) { conf.canvas.width = W; conf.canvas.height = H; }
    var colors = opts.colors || [C.primary, C.secondary, C.accent, '#ffffff', mix(C.primary, C.accent, 0.5)];
    var n = Math.round((opts.count || 120) * (PA.reducedMotion ? 0.3 : 1));
    var x = opts.x != null ? opts.x : innerWidth / 2;
    var y = opts.y != null ? opts.y : innerHeight * 0.35;
    var spread = (opts.spread || 360) * Math.PI / 180;
    var power = opts.power || 1;
    for (var i = 0; i < n; i++) {
      var a = -Math.PI / 2 + (Math.random() - 0.5) * spread;
      var sp = (260 + Math.random() * 520) * power;
      conf.parts.push({
        x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 120 * power,
        w: 6 + Math.random() * 6, h: 9 + Math.random() * 8, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 12,
        phase: Math.random() * 6, life: 2.2 + Math.random() * 1.4, round: Math.random() < 0.25,
        color: colors[(Math.random() * colors.length) | 0]
      });
    }
    if (!conf.running) {
      conf.running = true;
      conf.last = now();
      requestAnimationFrame(confettiFrame);
    }
  };

  // ---------------------------------------------------------------- toast, copy, share
  var toastTimer = 0;
  PA.toast = function (msg) {
    var t = $('#pa-toast');
    if (!t) {
      t = doc.createElement('div');
      t.id = 'pa-toast';
      t.className = 'pa-toast';
      t.setAttribute('role', 'status');
      t.setAttribute('aria-live', 'polite');
      doc.body.appendChild(t);
    }
    t.textContent = msg;
    t.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('is-on'); }, 2000);
  };
  PA.copy = function (text) {
    return new Promise(function (resolve) {
      var fallback = function () {
        var ta = doc.createElement('textarea');
        ta.value = text;
        ta.setAttribute('readonly', '');
        ta.style.cssText = 'position:fixed;top:-100px;left:0;opacity:0';
        doc.body.appendChild(ta);
        ta.select();
        var ok = false;
        try { ok = doc.execCommand('copy'); } catch (e) { ok = false; }
        doc.body.removeChild(ta);
        resolve(ok);
      };
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(function () { resolve(true); }, fallback);
      } else {
        fallback();
      }
    });
  };
  function shareUrl() {
    if (B.share && B.share.url) return B.share.url;
    return /^https?:$/.test(location.protocol) ? location.href.replace(/[?#].*$/, '') : '';
  }
  PA.share = function (text) {
    var url = shareUrl();
    if (navigator.share) {
      navigator.share({ title: B.name || doc.title, text: text, url: url || undefined }).catch(function () {});
      return;
    }
    PA.copy(url ? text + ' ' + url : text).then(function (ok) { PA.toast(ok ? T.shareCopied : text); });
  };

  // ---------------------------------------------------------------- rewards
  function tiers(gameKey) {
    var list = (B.rewards && B.rewards[gameKey]) || [];
    return list.slice().sort(function (a, b) { return (a.min || 0) - (b.min || 0); });
  }
  PA.rewards = {
    tiers: tiers,
    /** Best tier reached for `value` (score or stars), or null. */
    forValue: function (gameKey, value) {
      var r = null;
      tiers(gameKey).forEach(function (t) { if (value >= (t.min || 0)) r = t; });
      return r;
    },
    /** First tier above `value`, or null. */
    next: function (gameKey, value) {
      var list = tiers(gameKey);
      for (var i = 0; i < list.length; i++) if (value < (list[i].min || 0)) return list[i];
      return null;
    },
    top: function (gameKey) {
      var list = tiers(gameKey);
      return list.length ? list[list.length - 1] : null;
    },
    /** The rarest winning wheel segment (the jackpot). */
    jackpot: function () {
      var segs = ((B.wheel && B.wheel.segments) || []).filter(function (s) { return s.win; });
      segs.sort(function (a, b) { return (a.weight || 1) - (b.weight || 1); });
      return segs[0] || null;
    }
  };

  // ---------------------------------------------------------------- leads
  PA.submitLead = function (data) {
    var lc = B.leadCapture || {};
    var payload = extend({
      brand: B.name || '',
      time: new Date().toISOString(),
      page: /^https?:$/.test(location.protocol) ? location.href.replace(/[?#].*$/, '') : ''
    }, data);
    callHook('onLead', payload);
    if (!lc.webhookUrl || !window.fetch) return;
    var opts = { method: 'POST', mode: 'no-cors', keepalive: true };
    if (lc.webhookFormat === 'json') {
      opts.headers = { 'Content-Type': 'text/plain;charset=utf-8' };
      opts.body = JSON.stringify(payload);
    } else {
      var form = new URLSearchParams();
      Object.keys(payload).forEach(function (k) { form.append(k, payload[k] == null ? '' : String(payload[k])); });
      opts.body = form;
    }
    try { fetch(lc.webhookUrl, opts).catch(function () {}); } catch (e) { /* offline: the hook still ran */ }
  };

  var FIELD_DEFS = {
    name: { type: 'text', autocomplete: 'name', label: function () { return T.leadName; }, ok: function (v) { return v.trim().length >= 2; } },
    email: { type: 'email', autocomplete: 'email', label: function () { return T.leadEmail; }, ok: function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()); } },
    phone: { type: 'tel', autocomplete: 'tel', label: function () { return T.leadPhone; }, ok: function (v) { return v.replace(/\D/g, '').length >= 6; } }
  };
  var formSeq = 0;

  /**
   * Renders the reward ticket (title, description, code + Copy) into `box`, with the
   * lead-capture form when enabled. `opts.demo` skips sending stored leads again.
   */
  PA.renderReward = function (box, reward, game, opts) {
    opts = opts || {};
    var lc = B.leadCapture || {};
    var stored = kitStore.get('lead', null);
    var needForm = !!lc.enabled && !stored;
    var locked = needForm && !!lc.required;
    box.innerHTML =
      '<div class="pa-ticket">' +
        '<p class="pa-ticket-kicker">' + esc(T.youWon) + '</p>' +
        '<p class="pa-ticket-title">' + esc(reward.title || reward.label || '') + '</p>' +
        (reward.description ? '<p class="pa-ticket-desc">' + esc(reward.description) + '</p>' : '') +
        (reward.code ?
          '<div class="pa-code' + (locked ? ' is-locked' : '') + '">' +
            '<span class="pa-code-label">' + esc(T.yourCode) + '</span>' +
            '<span class="pa-code-value" data-code>' + esc(locked ? '••••••' : reward.code) + '</span>' +
            '<button type="button" class="btn btn-sm btn-accent" data-copy' + (locked ? ' disabled' : '') + '>' + esc(T.copy) + '</button>' +
          '</div>' : '') +
      '</div>';
    var codeBox = $('.pa-code', box);
    var copyBtn = $('[data-copy]', box);
    if (copyBtn) {
      copyBtn.addEventListener('click', function () {
        PA.copy(reward.code).then(function (ok) {
          sfx.copy();
          PA.toast(ok ? T.copied : reward.code);
          copyBtn.textContent = ok ? '✓' : T.copy;
          setTimeout(function () { copyBtn.textContent = T.copy; }, 1600);
        });
      });
    }
    var unlockCode = function () {
      if (!codeBox) return;
      codeBox.classList.remove('is-locked');
      codeBox.classList.add('is-revealed');
      $('[data-code]', codeBox).textContent = reward.code;
      copyBtn.disabled = false;
    };
    if (lc.enabled && stored && !opts.demo && reward.code) {
      PA.submitLead(extend({}, stored, { game: game, reward: reward.title || '', code: reward.code }));
    }
    if (!needForm || !reward.code) return;

    var fields = (lc.fields && lc.fields.length ? lc.fields : ['email']).filter(function (f) { return FIELD_DEFS[f]; });
    var id = 'pa-lead-' + (++formSeq);
    var form = doc.createElement('form');
    form.className = 'pa-lead';
    form.noValidate = true;
    form.innerHTML =
      '<p class="pa-lead-title">' + esc(locked ? T.leadTitleRequired : T.leadTitle) + '</p>' +
      '<div class="pa-lead-fields">' +
      fields.map(function (f) {
        var d = FIELD_DEFS[f];
        return '<label class="pa-field" for="' + id + '-' + f + '"><span class="pa-sr">' + esc(d.label()) + '</span>' +
          '<input id="' + id + '-' + f + '" name="' + f + '" type="' + d.type + '" autocomplete="' + d.autocomplete +
          '" placeholder="' + esc(d.label()) + '" required></label>';
      }).join('') +
      '</div>' +
      (lc.consentText ? '<label class="pa-consent"><input type="checkbox" name="consent" required><span>' + esc(lc.consentText) + '</span></label>' : '') +
      '<button type="submit" class="btn btn-secondary btn-block">' + esc(locked ? T.leadReveal : T.leadSubmit) + '</button>' +
      '<p class="pa-lead-msg" role="status" aria-live="polite"></p>';
    $('.pa-ticket', box).appendChild(form);
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var data = {};
      var bad = null;
      fields.forEach(function (f) {
        var input = form.elements[f];
        var ok = FIELD_DEFS[f].ok(input.value);
        input.classList.toggle('is-invalid', !ok);
        input.setAttribute('aria-invalid', ok ? 'false' : 'true');
        if (!ok && !bad) bad = input;
        data[f] = input.value.trim();
      });
      var consent = form.elements.consent;
      if (consent) {
        consent.parentNode.classList.toggle('is-invalid', !consent.checked);
        if (!consent.checked && !bad) bad = consent;
      }
      if (bad) {
        $('.pa-lead-msg', form).textContent = T.leadInvalid;
        bad.focus();
        sfx.miss();
        return;
      }
      data.consent = consent ? true : '';
      kitStore.set('lead', data);
      PA.submitLead(extend({}, data, { game: game, reward: reward.title || '', code: reward.code }));
      form.innerHTML = '<p class="pa-lead-done">' + esc(T.leadThanks) + '</p>';
      unlockCode();
      sfx.match(2);
    });
  };

  // ---------------------------------------------------------------- page branding
  function logoMarkup() {
    if (B.logoImage) {
      return '<img class="pa-logo-img" src="' + esc(PA.asset(B.logoImage)) + '" alt="' + esc(B.name || '') + '">';
    }
    var icon = B.logoIcon && PA.iconSrc(B.logoIcon);
    return (icon ? '<img class="pa-logo-icon" src="' + icon + '" alt="">' : '') +
      '<span class="pa-logo-text">' + esc(B.logoText || B.name || '') + '</span>';
  }
  function renderBrand() {
    applyTheme();
    $$('[data-brand-logo]').forEach(function (n) { n.innerHTML = logoMarkup(); n.setAttribute('aria-label', B.name || ''); });
    var map = { name: B.name, tagline: B.tagline, legal: B.legal, credit: B.studioCredit };
    $$('[data-brand]').forEach(function (n) {
      var v = map[n.getAttribute('data-brand')];
      n.textContent = v || '';
      if (!v) n.hidden = true;
    });
    $$('[data-t]').forEach(function (n) {
      var k = n.getAttribute('data-t');
      if (T[k] != null) n.textContent = T[k];
    });
    var cta = B.cta || {};
    $$('[data-cta]').forEach(function (n) {
      if (cta.url) {
        n.href = cta.url;
        n.textContent = cta.text || 'Order now';
        n.hidden = false;
      } else {
        n.hidden = true;
      }
    });
    syncSoundUi();
  }
  PA.renderBrand = renderBrand;

  // ---------------------------------------------------------------- loop helper
  /** requestAnimationFrame loop with dt (seconds) clamped to 1/20 s. */
  PA.loop = function (fn) {
    var last = now();
    function frame(t) {
      var dt = Math.min(0.05, Math.max(0, (t - last) / 1000));
      last = t;
      fn(dt, t / 1000);
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  };

  // ---------------------------------------------------------------- game shell
  var STAR_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.6l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.4l-5.8 3.1 1.1-6.5-4.7-4.6 6.5-.9z"/></svg>';
  PA.starsMarkup = function (n) {
    var out = '';
    for (var i = 1; i <= 3; i++) out += '<span class="pa-star' + (i <= n ? ' is-on' : '') + '" style="--i:' + i + '">' + STAR_SVG + '</span>';
    return out;
  };

  /**
   * Creates the shared screen flow for one game page.
   * def: { id, key ('catchRush'…, picks title/howTo/rewards from brand.config.js), texts, teaser, art,
   *        start(), forceGameOver(), score(), state(), pause(), resume(), stop(),
   *        onKey(e, down), onAction(name, el, e), shareText(result), demoDelay }
   * Returns { screen(), demo, ready(), end(result), store, hint(text), hideHint() }.
   */
  PA.game = function (def) {
    var id = def.id;
    var info = (B.games && B.games[def.key]) || {};
    var title = info.title || def.title || '';
    var store = PA.store(id);
    var demo = /[?&]demo=1(?:&|$)/.test(location.search);
    var screen = 'title';
    var screenAt = now();
    var best = store.get('best', 0) || 0;
    var lastResult = null;
    var shown = false; // no autofocus on page load, only on later screen changes
    var body = doc.body;
    var screens = { title: $('#screen-title'), paused: $('#screen-pause'), gameover: $('#screen-over') };
    var hintEl = $('#pa-hint');
    body.classList.toggle('is-demo', demo);

    function show(name) {
      screen = name;
      screenAt = now();
      body.setAttribute('data-screen', name);
      Object.keys(screens).forEach(function (k) {
        var node = screens[k];
        if (!node) return;
        var on = k === name && !(demo && k === 'gameover');
        node.classList.toggle('is-on', on);
        node.setAttribute('aria-hidden', on ? 'false' : 'true');
        if ('inert' in node) node.inert = !on;
        if (on) {
          node.scrollTop = 0;
          var f = shown && $('[data-autofocus]', node);
          if (f && !matchMedia('(pointer: coarse)').matches) {
            try { f.focus({ preventScroll: true }); } catch (e) { f.focus(); }
          }
        }
      });
      $$('[data-best]').forEach(function (n) { n.textContent = best; });
      shown = true;
    }

    function start() {
      if (!demo) unlock();
      hideHint();
      if (def.start) def.start();
      show('playing');
      if (!demo) callHook('onGameStart', id);
    }
    function pause() {
      if (screen !== 'playing' || demo) return;
      show('paused');
      if (def.pause) def.pause();
    }
    function resume() {
      if (screen !== 'paused') return;
      show('playing');
      if (def.resume) def.resume();
    }
    function home() {
      if (def.stop) def.stop();
      hideHint();
      show('title');
    }

    function renderResult(r, isBest) {
      var o = screens.gameover;
      if (!o) return;
      var q = function (sel) { return $(sel, o); };
      q('[data-over="heading"]').textContent = r.heading || '';
      var art = q('[data-over="art"]');
      if (art) {
        art.hidden = !r.art;
        art.innerHTML = r.art ? '<img src="' + esc(r.art) + '" alt="">' : '';
      }
      var sub = q('[data-over="sub"]');
      if (sub) { sub.textContent = r.sub || ''; sub.hidden = !r.sub; }
      var stars = q('[data-over="stars"]');
      if (stars) {
        stars.hidden = r.stars == null;
        stars.innerHTML = r.stars == null ? '' : PA.starsMarkup(r.stars);
      }
      var score = q('[data-over="score"]');
      if (score) {
        score.hidden = !!r.hideScore;
        score.textContent = r.score || 0;
      }
      var nb = q('[data-over="newbest"]');
      if (nb) nb.hidden = !isBest;
      var stats = q('[data-over="stats"]');
      if (stats) {
        var list = (r.stats || []).slice();
        if (!r.hideScore) list.push({ label: T.best, value: best });
        stats.innerHTML = list.map(function (s) {
          return '<span class="pa-stat"><b>' + esc(s.value) + '</b> ' + esc(s.label) + '</span>';
        }).join('');
        stats.hidden = !list.length;
      }
      var rb = q('[data-over="reward"]');
      o.classList.toggle('has-reward', !!r.reward);
      if (r.reward) {
        PA.renderReward(rb, r.reward, id);
      } else {
        rb.innerHTML = r.nextText ? '<p class="pa-next">' + esc(r.nextText) + '</p>' : '';
      }
      var again = q('[data-over="again"]');
      if (again) {
        again.textContent = r.againText || T.playAgain;
        var btn = again.closest('button');
        if (btn) btn.disabled = !!r.noMorePlays;
      }
    }

    function end(result) {
      if (screen !== 'playing' && screen !== 'paused') return;
      var r = result || {};
      var score = r.score || 0;
      var isBest = !demo && !r.hideScore && score > best;
      if (!demo && score > best) { best = score; store.set('best', best); }
      lastResult = r;
      hideHint();
      if (demo) {
        show('gameover');
        setTimeout(function () { if (screen === 'gameover') start(); }, def.demoDelay || 1600);
        return;
      }
      callHook('onGameOver', id, score);
      if (r.reward) callHook('onWin', id, r.reward);
      renderResult(r, isBest);
      show('gameover');
      if (r.reward) {
        sfx.win();
        setTimeout(function () { PA.confetti({ count: 150, y: innerHeight * 0.3 }); }, 120);
      } else {
        sfx.lose();
      }
    }

    function share() {
      var r = lastResult || {};
      var vars = { game: title, brand: B.name || '', score: r.score || 0, reward: r.reward ? (r.reward.title || '') : '' };
      var text = def.shareText ? def.shareText(r, vars) : fmt((B.share && B.share.text) || '{game} at {brand}: {score}!', vars);
      PA.share(text);
    }

    function showHint(text) {
      if (!hintEl || demo || store.get('hinted', false)) return;
      hintEl.textContent = text;
      hintEl.classList.add('is-on');
    }
    function hideHint() {
      if (hintEl && hintEl.classList.contains('is-on')) {
        hintEl.classList.remove('is-on');
        store.set('hinted', true);
      }
    }

    doc.addEventListener('click', function (e) {
      var t = e.target && e.target.closest ? e.target.closest('[data-action]') : null;
      if (!t || t.disabled) return;
      var a = t.getAttribute('data-action');
      unlock();
      if (a === 'play') { if (screen === 'title') { sfx.tap(); start(); } }
      else if (a === 'pause') pause();
      else if (a === 'resume') { sfx.tap(); resume(); }
      else if (a === 'restart') { if (screen !== 'title') { sfx.tap(); start(); } }
      else if (a === 'home') { sfx.tap(); home(); }
      else if (a === 'sound') PA.audio.toggle();
      else if (a === 'share') share();
      else if (def.onAction) def.onAction(a, t, e);
    });

    doc.addEventListener('keydown', function (e) {
      var tag = (e.target && e.target.tagName) || '';
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      var k = e.key;
      if (k === 'Escape' || k === 'p' || k === 'P') {
        if (screen === 'playing') { e.preventDefault(); pause(); }
        else if (screen === 'paused') { e.preventDefault(); resume(); }
        return;
      }
      if (k === 'm' || k === 'M') { PA.audio.toggle(); return; }
      var onControl = tag === 'BUTTON' || tag === 'A';
      if ((k === ' ' || k === 'Enter') && !onControl && !e.repeat) {
        if (screen === 'title') { e.preventDefault(); start(); return; }
        if (screen === 'gameover' && !demo && !(lastResult && lastResult.noMorePlays)) { e.preventDefault(); start(); return; }
      }
      if (screen === 'playing' && def.onKey) def.onKey(e, true);
    });
    doc.addEventListener('keyup', function (e) { if (def.onKey) def.onKey(e, false); });
    doc.addEventListener('visibilitychange', function () { if (doc.hidden) pause(); });
    window.addEventListener('blur', pause);

    window.__GAME__ = {
      id: id,
      version: PA.version,
      getState: function () {
        var s = { screen: screen, score: def.score ? def.score() : 0, best: best };
        return def.state ? extend(s, def.state()) : s;
      },
      start: function () { if (screen === 'title' || screen === 'gameover') start(); },
      forceGameOver: function () { if (screen === 'playing' || screen === 'paused') def.forceGameOver(); }
    };

    renderBrand();
    $$('[data-game-title]').forEach(function (n) { n.textContent = title; });
    var gt = def.texts || {};
    $$('[data-g]').forEach(function (n) {
      var k = n.getAttribute('data-g');
      if (gt[k] != null) n.textContent = gt[k];
    });
    $$('[data-game-howto]').forEach(function (n) { n.textContent = info.howTo || ''; n.hidden = !info.howTo; });
    var teaser = def.teaser || '';
    if (!teaser && def.key) {
      var top = PA.rewards.top(def.key);
      if (top) teaser = fmt(T.winUpTo, { title: top.title });
    }
    $$('[data-reward-teaser]').forEach(function (n) {
      n.textContent = teaser;
      (n.closest('.pa-teaser') || n).hidden = !teaser;
    });
    var art = def.art || PA.products.slice(0, 3).map(function (p) { return p.src; });
    $$('[data-title-art]').forEach(function (n) {
      n.innerHTML = art.map(function (src) { return '<img src="' + esc(src) + '" alt="">'; }).join('');
    });
    doc.title = title + ' · ' + (B.name || '');
    show('title');
    if (demo) PA.ready(function () { if (screen === 'title') start(); });

    return {
      demo: demo,
      title: title,
      store: store,
      screen: function () { return screen; },
      /** True once ~150 ms have passed since the last screen change (ignores the Play click). */
      ready: function () { return now() - screenAt > 150; },
      end: end,
      hint: showHint,
      hideHint: hideHint,
      best: function () { return best; }
    };
  };

  // ---------------------------------------------------------------- hub page
  PA.initHub = function () {
    renderBrand();
    doc.title = (B.name || '') + ' · ' + ((B.hub && B.hub.kicker) || 'Play & Win');
    var hub = extend({ kicker: 'Play & Win', headline: 'Play a game. Win a treat.', subline: '', rewardsTitle: 'Rewards', button: 'Spin the wheel' }, B.hub);
    $$('[data-hub]').forEach(function (n) {
      var v = hub[n.getAttribute('data-hub')];
      n.textContent = v || '';
      if (!v) n.hidden = true;
    });
    var games = B.games || {};
    var titleOf = function (k, d) { return (games[k] && games[k].title) || d; };
    var tiles = [];
    $$('[data-game]').forEach(function (card) {
      var k = card.getAttribute('data-game');
      var g = games[k] || {};
      if (g.enabled === false) { card.hidden = true; return; }
      $('[data-game-title]', card).textContent = g.title || '';
      $('[data-game-desc]', card).textContent = g.description || '';
      var top = k === 'spinWin' ? PA.rewards.jackpot() : PA.rewards.top(k);
      var line = $('[data-game-reward]', card);
      if (top) line.textContent = fmt(T.winUpTo, { title: top.title || top.label });
      else line.hidden = true;
    });

    // Hero: floating products around the logo.
    var hero = $('[data-hero-products]');
    if (hero) {
      hero.innerHTML = PA.products.slice(0, 8).map(function (p, i) {
        return '<img class="hub-float f' + i + '" src="' + esc(p.src) + '" alt="">';
      }).join('');
    }
    var heroLogo = $('[data-hero-logo]');
    if (heroLogo) {
      var icon = B.logoImage ? PA.asset(B.logoImage) : PA.iconSrc(B.logoIcon || 'gift');
      heroLogo.innerHTML = icon ? '<img src="' + esc(icon) + '" alt="">' : '';
    }

    // Card previews.
    var p = PA.products;
    var pick = function (i) { return esc(p[i % p.length].src); };
    var catchPrev = $('[data-preview="catchRush"]');
    if (catchPrev) {
      catchPrev.innerHTML = [0, 1, 2, 3].map(function (i) {
        return '<img class="cr-drop d' + i + '" src="' + pick(i) + '" alt="">';
      }).join('') + '<span class="cr-cup"><span>' + esc(B.cupText || '') + '</span></span>';
    }
    var memPrev = $('[data-preview="memoryMatch"]');
    if (memPrev) {
      var backIcon = esc(PA.iconSrc(B.logoIcon) || PA.iconSrc('star'));
      memPrev.innerHTML = [0, 1, 2, 0, 3, 1].map(function (pi, i) {
        return '<span class="mm-mini m' + i + '"><span class="mm-mini-in"><span class="mm-mini-back"><img src="' + backIcon +
          '" alt=""></span><span class="mm-mini-front"><img src="' + pick(pi) + '" alt=""></span></span></span>';
      }).join('');
    }
    var spinPrev = $('[data-preview="spinWin"]');
    if (spinPrev) {
      var segs = (B.wheel && B.wheel.segments) || [];
      var n = Math.max(segs.length, 1);
      var palette = [C.primary, C.accent, C.secondary, mix(C.primary, '#ffffff', 0.35)];
      var stops = segs.map(function (s, i) {
        var col = s.color || palette[i % palette.length];
        return col + ' ' + (i * 360 / n) + 'deg ' + ((i + 1) * 360 / n) + 'deg';
      }).join(',');
      spinPrev.innerHTML = '<span class="sw-mini" style="background:conic-gradient(' + (stops || C.primary) + ')"></span><span class="sw-mini-hub"></span><span class="sw-mini-pin"></span>';
    }

    // Rewards strip.
    var strip = $('[data-reward-list]');
    if (strip) {
      var items = [];
      var cr = PA.rewards.top('catchRush'), mm = PA.rewards.top('memoryMatch'), jp = PA.rewards.jackpot();
      if (cr && games.catchRush && games.catchRush.enabled !== false) items.push({ r: cr, where: titleOf('catchRush', 'Catch Rush') });
      if (mm && games.memoryMatch && games.memoryMatch.enabled !== false) items.push({ r: mm, where: titleOf('memoryMatch', 'Memory Match') });
      if (jp && games.spinWin && games.spinWin.enabled !== false) items.push({ r: jp, where: titleOf('spinWin', 'Spin & Win') });
      strip.innerHTML = items.map(function (it) {
        return '<li class="hub-ticket"><span class="hub-ticket-title">' + esc(it.r.title || it.r.label) + '</span>' +
          '<span class="hub-ticket-desc">' + esc(it.r.description || '') + '</span>' +
          '<span class="hub-ticket-where">' + esc(it.where) + '</span></li>';
      }).join('');
      if (!items.length) strip.parentNode.hidden = true;
    }
  };
})();
