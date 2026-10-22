/*
 * shared/brand.js — Promo Arcade shared runtime (window.PromoArcade).
 *
 * Applies brand.config.js to every page (colours → CSS variables with automatic
 * text contrast, logo, product pictures) and gives the three games the same
 * building blocks: title / pause / result screens, the coupon card, the optional
 * lead-capture form (webhook), confetti, share, synthesized sounds, storage,
 * analytics hooks and the window.__GAME__ test API.
 *
 * A game page calls PromoArcade.mountGame({...}) once, then PromoArcade.finish({...})
 * whenever a round ends. See catch-rush/game.js for a complete example.
 */
(function () {
  'use strict';

  var B = window.BRAND_CONFIG || {};
  var TX = B.texts || {};
  var ICONS = window.PA_ICONS || {};
  var DEMO = /[?&]demo=1\b/.test(location.search) || /^#demo\b/.test(location.hash);
  var REDUCED = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var COARSE = !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
  var root = document.documentElement;

  function t(key, fallback) { return TX[key] == null ? fallback : TX[key]; }
  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function fill(str, vars) {
    return String(str || '').replace(/\{(\w+)\}/g, function (m, k) { return vars[k] == null ? m : vars[k]; });
  }
  function now() { return (window.performance && performance.now()) || Date.now(); }

  // ------------------------------------------------------------------ colour
  function rgb(hex) {
    var h = String(hex || '#000').replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var n = parseInt(h.slice(0, 6), 16) || 0;
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function luminance(hex) {
    var c = rgb(hex).map(function (v) {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  }
  /** Readable text colour (near-black or white) for a background colour. */
  function onColor(hex) { return luminance(hex) > 0.36 ? '#17120c' : '#ffffff'; }
  function mix(a, b, k) {
    var x = rgb(a), y = rgb(b);
    return '#' + [0, 1, 2].map(function (i) {
      var v = Math.round(x[i] + (y[i] - x[i]) * k);
      return (v < 16 ? '0' : '') + v.toString(16);
    }).join('');
  }
  function rgba(hex, a) { var c = rgb(hex); return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; }

  var C = B.colors || {};
  var COLORS = {
    primary: C.primary || '#E0245E',
    secondary: C.secondary || '#FFC23D',
    accent: C.accent || '#2EE6A8',
    background: C.background || '#0A3D33',
    text: C.text || '#FFF7EA'
  };

  var LIGHT_BG = luminance(COLORS.background) > 0.45;

  function applyTheme() {
    var s = root.style;
    s.setProperty('--pa-primary', COLORS.primary);
    s.setProperty('--pa-on-primary', onColor(COLORS.primary));
    s.setProperty('--pa-primary-dark', mix(COLORS.primary, '#000000', 0.25));
    s.setProperty('--pa-secondary', COLORS.secondary);
    s.setProperty('--pa-on-secondary', onColor(COLORS.secondary));
    s.setProperty('--pa-accent', COLORS.accent);
    s.setProperty('--pa-on-accent', onColor(COLORS.accent));
    s.setProperty('--pa-bg', COLORS.background);
    s.setProperty('--pa-bg-2', mix(COLORS.background, COLORS.text, 0.07));
    s.setProperty('--pa-bg-deep', mix(COLORS.background, '#000000', 0.35));
    s.setProperty('--pa-surface', rgba(COLORS.text, 0.07));
    s.setProperty('--pa-surface-strong', mix(COLORS.background, COLORS.text, 0.1));
    s.setProperty('--pa-text', COLORS.text);
    s.setProperty('--pa-muted', rgba(COLORS.text, 0.72));
    s.setProperty('--pa-line', rgba(COLORS.text, 0.16));
    s.setProperty('--pa-primary-glow', rgba(COLORS.primary, 0.45));
    s.setProperty('--pa-secondary-glow', rgba(COLORS.secondary, 0.45));
    // Secondary colour used as TEXT on the page background: darkened on light brands for contrast.
    s.setProperty('--pa-secondary-text', LIGHT_BG ? mix(COLORS.secondary, '#000000', 0.5) : COLORS.secondary);
    if (B.font) s.setProperty('--pa-font', B.font);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', COLORS.background);
  }

  // ------------------------------------------------------------------ storage
  var prefix = 'promo-arcade:' + String(B.name || 'brand').toLowerCase().replace(/[^a-z0-9]+/g, '-') + ':';
  var memory = {};
  var ls = null;
  try {
    ls = window.localStorage;
    ls.setItem(prefix + 'probe', '1');
    ls.removeItem(prefix + 'probe');
  } catch (e) { ls = null; }
  var storage = {
    get: function (key, fallback) {
      var raw = null;
      try { raw = ls ? ls.getItem(prefix + key) : null; } catch (e) { raw = null; }
      if (raw === null && Object.prototype.hasOwnProperty.call(memory, key)) raw = memory[key];
      if (raw === null || raw === undefined) return fallback;
      try { return JSON.parse(raw); } catch (e) { return fallback; }
    },
    set: function (key, value) {
      var raw = JSON.stringify(value);
      memory[key] = raw;
      try { if (ls) ls.setItem(prefix + key, raw); } catch (e) { /* memory copy is kept */ }
    }
  };

  // ------------------------------------------------------------------ audio (Web Audio synth)
  var audio = (function () {
    var AC = window.AudioContext || window.webkitAudioContext;
    var ctx = null, master = null, noiseBuf = null;
    var muted = !storage.get('sound', B.sound !== false);
    var listeners = [];
    var last = {};
    var PENT = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24];

    function unlock() {
      if (!AC) return;
      try {
        if (!ctx) {
          ctx = new AC();
          var comp = ctx.createDynamicsCompressor();
          comp.threshold.value = -14;
          comp.ratio.value = 5;
          master = ctx.createGain();
          master.gain.value = muted ? 0 : 0.7;
          master.connect(comp);
          comp.connect(ctx.destination);
          var len = Math.floor(ctx.sampleRate * 0.8);
          noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
          var d = noiseBuf.getChannelData(0);
          for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
        }
        if (ctx.state === 'suspended') ctx.resume();
      } catch (e) { ctx = null; }
    }
    function ok() { return ctx && !muted && ctx.state === 'running'; }
    function env(g, t0, peak, a, d) {
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(peak, t0 + a);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + a + d);
    }
    function tone(f0, f1, dur, type, vol, delay) {
      var t0 = ctx.currentTime + (delay || 0);
      var o = ctx.createOscillator(), g = ctx.createGain();
      o.type = type || 'sine';
      o.frequency.setValueAtTime(f0, t0);
      if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
      env(g, t0, vol, 0.006, dur);
      o.connect(g);
      g.connect(master);
      o.start(t0);
      o.stop(t0 + dur + 0.05);
    }
    function noise(f0, f1, dur, vol, type, delay) {
      var t0 = ctx.currentTime + (delay || 0);
      var src = ctx.createBufferSource(), flt = ctx.createBiquadFilter(), g = ctx.createGain();
      src.buffer = noiseBuf;
      flt.type = type || 'bandpass';
      flt.frequency.setValueAtTime(f0, t0);
      if (f1 && f1 !== f0) flt.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
      env(g, t0, vol, 0.004, dur);
      src.connect(flt);
      flt.connect(g);
      g.connect(master);
      src.start(t0, Math.random() * 0.3);
      src.stop(t0 + dur + 0.05);
    }
    function note(step, base) { return (base || 523.25) * Math.pow(2, step / 12); }

    var SFX = {
      click: function () { tone(900, 650, 0.06, 'triangle', 0.14); },
      start: function () { tone(440, 880, 0.18, 'sine', 0.18); tone(660, 1320, 0.18, 'triangle', 0.06, 0.06); },
      catch: function (combo) {
        var f = note(PENT[Math.min(PENT.length - 1, (combo || 1) - 1)]);
        tone(f, f * 1.5, 0.1, 'sine', 0.22);
        noise(3000, 1500, 0.05, 0.05);
      },
      gold: function () { [0, 4, 7, 12].forEach(function (s, i) { tone(note(s + 7), 0, 0.18, 'triangle', 0.12, i * 0.05); }); },
      bomb: function () { noise(900, 120, 0.45, 0.4, 'lowpass'); tone(160, 45, 0.4, 'sine', 0.45); },
      tick: function () { tone(1600, 1200, 0.03, 'square', 0.05); },
      tock: function () { tone(700, 500, 0.05, 'square', 0.07); },
      flip: function () { noise(1800, 4200, 0.09, 0.07, 'bandpass'); },
      match: function () { tone(note(4), 0, 0.2, 'triangle', 0.16); tone(note(11), 0, 0.3, 'sine', 0.14, 0.08); },
      miss: function () { tone(300, 180, 0.18, 'sine', 0.16); },
      win: function () { [0, 4, 7, 12, 16].forEach(function (s, i) { tone(note(s), 0, 0.28, 'triangle', 0.14, i * 0.09); }); noise(4000, 8000, 0.4, 0.05, 'highpass', 0.35); },
      lose: function () { [7, 4, 0].forEach(function (s, i) { tone(note(s - 5), note(s - 6), 0.25, 'triangle', 0.13, i * 0.14); }); },
      spin: function () { noise(300, 2400, 0.5, 0.12, 'bandpass'); },
      timeup: function () { tone(220, 200, 0.5, 'square', 0.08); tone(330, 300, 0.5, 'square', 0.05); }
    };
    var GAP = { tick: 0.025, tock: 0.05, catch: 0.03, flip: 0.04 };

    function play(name, arg) {
      if (!ok() || !SFX[name]) return;
      var t0 = ctx.currentTime;
      if (last[name] && t0 - last[name] < (GAP[name] || 0.012)) return;
      last[name] = t0;
      try { SFX[name](arg); } catch (e) { /* audio must never break the game */ }
    }
    function setMuted(v) {
      muted = !!v;
      storage.set('sound', !muted);
      if (ctx && master) master.gain.setTargetAtTime(muted ? 0 : 0.7, ctx.currentTime, 0.02);
      listeners.forEach(function (fn) { fn(muted); });
    }
    return {
      unlock: unlock,
      play: play,
      isMuted: function () { return muted; },
      toggle: function () { setMuted(!muted); return muted; },
      onChange: function (fn) { listeners.push(fn); }
    };
  })();

  // ------------------------------------------------------------------ icons & products
  function iconURL(key) {
    var s = ICONS[key];
    return s ? 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s) : '';
  }

  var products = (B.products || []).map(function (p, i) {
    var src = p.image || (p.icon && ICONS[p.icon] ? iconURL(p.icon) : '');
    return { index: i, name: p.name || 'Item ' + (i + 1), color: p.color || COLORS.secondary, src: src, emoji: src ? '' : (p.emoji || '★'), img: null };
  });

  function emojiCanvas(emoji) {
    var c = document.createElement('canvas');
    c.width = c.height = 128;
    var x = c.getContext('2d');
    x.textAlign = 'center';
    x.textBaseline = 'middle';
    x.font = '100px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
    x.fillText(emoji, 64, 70);
    return c;
  }

  /** Loads every product picture once (as Image or canvas) then calls cb. */
  function loadProducts(cb) {
    var pending = products.length;
    if (!pending) { cb(); return; }
    function done() { if (--pending === 0) cb(); }
    products.forEach(function (p) {
      if (!p.src) { p.img = emojiCanvas(p.emoji); done(); return; }
      var img = new Image();
      img.onload = function () { p.img = img; done(); };
      img.onerror = function () { p.img = emojiCanvas('★'); done(); };
      img.src = p.src;
    });
  }

  function productHTML(p, cls) {
    if (p.src) return '<img class="' + (cls || '') + '" src="' + esc(p.src) + '" alt="' + esc(p.name) + '" draggable="false">';
    return '<span class="' + (cls || '') + ' pa-emoji" role="img" aria-label="' + esc(p.name) + '">' + esc(p.emoji) + '</span>';
  }

  function logoHTML(big) {
    if (B.logoImage) return '<img class="pa-logo-img' + (big ? ' is-big' : '') + '" src="' + esc(B.logoImage) + '" alt="' + esc(B.name) + '">';
    var badge = B.logoIcon && ICONS[B.logoIcon]
      ? '<span class="pa-logo-badge"><img src="' + iconURL(B.logoIcon) + '" alt=""></span>' : '';
    return '<span class="pa-logo' + (big ? ' is-big' : '') + '">' + badge + '<span class="pa-logo-text">' + esc(B.logoText || B.name || '') + '</span></span>';
  }

  // ------------------------------------------------------------------ rewards
  var REW = B.rewards || {};
  function tiers(game) {
    if (game === 'spin-win') return ((REW['spin-win'] || {}).segments || []).filter(function (s) { return s.win; });
    return REW[game] || [];
  }
  /** Best reward reached for a score (catch-rush) or stars (memory-match); plus the next tier. */
  function rewardFor(game, value) {
    var key = game === 'memory-match' ? 'minStars' : 'minScore';
    var list = tiers(game).slice().sort(function (a, b) { return a[key] - b[key]; });
    var got = null, next = null;
    for (var i = 0; i < list.length; i++) {
      if (value >= list[i][key]) got = list[i];
      else if (!next) next = list[i];
    }
    return { reward: got, next: next, key: key };
  }
  /** The headline prize of a game, for "Win up to …" teasers. */
  function topReward(game) {
    var list = tiers(game);
    if (!list.length) return null;
    if (game === 'spin-win') {
      return list.slice().sort(function (a, b) { return (a.weight || 1) - (b.weight || 1); })[0];
    }
    var key = game === 'memory-match' ? 'minStars' : 'minScore';
    return list.slice().sort(function (a, b) { return b[key] - a[key]; })[0];
  }

  // ------------------------------------------------------------------ hooks
  function hook(name) {
    if (DEMO) return;
    var fn = (B.hooks || {})[name];
    if (typeof fn !== 'function') return;
    try { fn.apply(null, Array.prototype.slice.call(arguments, 1)); } catch (e) {
      if (window.console) console.error('Promo Arcade hook "' + name + '" failed:', e);
    }
  }

  // ------------------------------------------------------------------ toast / copy / share
  var toastEl = null;
  var toastTimer = 0;
  function toast(msg) {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.className = 'pa-toast';
      toastEl.setAttribute('role', 'status');
      toastEl.setAttribute('aria-live', 'polite');
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('show'); }, 1800);
  }

  function copyText(text, okMsg, selectEl) {
    function fallback() {
      if (selectEl) {
        var range = document.createRange();
        range.selectNodeContents(selectEl);
        var sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
      }
      toast(t('copyFailed', 'Select the code to copy it.'));
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { toast(okMsg || t('copied', 'Copied!')); }, fallback);
    } else {
      fallback();
    }
  }

  function share(text) {
    var sh = B.share || {};
    var url = sh.url || (/^https?:/.test(location.protocol) ? location.href.split('#')[0].replace(/[?&]demo=1/, '') : '');
    if (navigator.share) {
      navigator.share({ text: text, url: url || undefined }).catch(function () {});
      return;
    }
    copyText(url ? text + ' ' + url : text, t('shareCopied', 'Copied — paste it anywhere!'));
  }

  // ------------------------------------------------------------------ confetti
  var confetti = (function () {
    var cv = null, cx = null, parts = [], running = false, lastT = 0;
    var palette = [COLORS.primary, COLORS.secondary, COLORS.accent, '#ffffff'];
    function ensure() {
      if (cv) return;
      cv = document.createElement('canvas');
      cv.className = 'pa-confetti';
      cv.setAttribute('aria-hidden', 'true');
      document.body.appendChild(cv);
      cx = cv.getContext('2d');
    }
    function size() {
      var d = Math.min(window.devicePixelRatio || 1, 2);
      cv.width = Math.round(innerWidth * d);
      cv.height = Math.round(innerHeight * d);
      cx.setTransform(d, 0, 0, d, 0, 0);
    }
    function burst(count) {
      if (REDUCED) return;
      ensure();
      size();
      var w = innerWidth, h = innerHeight;
      for (var i = 0; i < (count || 160); i++) {
        var fromLeft = i % 2 === 0;
        parts.push({
          x: fromLeft ? -10 : w + 10, y: h * (0.55 + Math.random() * 0.3),
          vx: (fromLeft ? 1 : -1) * (250 + Math.random() * 520), vy: -(520 + Math.random() * 640),
          w: 6 + Math.random() * 7, h: 9 + Math.random() * 9, r: Math.random() * 6, vr: (Math.random() - 0.5) * 14,
          c: palette[i % palette.length], life: 2.6 + Math.random() * 1.2
        });
      }
      if (!running) { running = true; lastT = now(); requestAnimationFrame(step); }
    }
    function step() {
      var tNow = now();
      var dt = Math.min(0.05, (tNow - lastT) / 1000);
      lastT = tNow;
      cx.clearRect(0, 0, innerWidth, innerHeight);
      for (var i = parts.length - 1; i >= 0; i--) {
        var p = parts[i];
        p.life -= dt;
        if (p.life <= 0 || p.y > innerHeight + 40) { parts.splice(i, 1); continue; }
        p.vy += 900 * dt;
        p.vx *= 1 - 1.4 * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.r += p.vr * dt;
        cx.save();
        cx.translate(p.x, p.y);
        cx.rotate(p.r);
        cx.scale(1, Math.cos(p.r * 1.7));
        cx.globalAlpha = Math.min(1, p.life);
        cx.fillStyle = p.c;
        cx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        cx.restore();
      }
      if (parts.length) requestAnimationFrame(step);
      else { running = false; cx.clearRect(0, 0, innerWidth, innerHeight); }
    }
    return { burst: burst };
  })();

  // ------------------------------------------------------------------ svg ui icons
  var UI = {
    back: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.5 5.5 8 12l6.5 6.5" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    pause: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1.2" fill="currentColor"/><rect x="14" y="5" width="4" height="14" rx="1.2" fill="currentColor"/></svg>',
    soundOn: '<svg class="pa-i-on" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    soundOff: '<svg class="pa-i-off" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M17 9.5l5 5M22 9.5l-5 5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l11-6.5z" fill="currentColor"/></svg>',
    again: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12a7 7 0 1 0 2.1-5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><path d="M4 4v5h5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    share: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="6" cy="12" r="2.6" fill="currentColor"/><circle cx="18" cy="6" r="2.6" fill="currentColor"/><circle cx="18" cy="18" r="2.6" fill="currentColor"/><path d="M8.3 10.8l7.4-3.6M8.3 13.2l7.4 3.6" stroke="currentColor" stroke-width="2"/></svg>',
    home: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 11.5 12 5l8 6.5V20h-5.5v-5h-5v5H4z" fill="currentColor"/></svg>',
    copy: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2.5" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M16 5.5A2.5 2.5 0 0 0 13.5 3h-8A2.5 2.5 0 0 0 3 5.5v8A2.5 2.5 0 0 0 5.5 16" fill="none" stroke="currentColor" stroke-width="2.2"/></svg>',
    cta: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6h9v9M15 6 5 16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>'
  };
  function soundIcons() { return UI.soundOn + UI.soundOff; }

  // ------------------------------------------------------------------ shared page bits
  function renderSound() {
    var muted = audio.isMuted();
    document.body.classList.toggle('pa-muted', muted);
    var btns = document.querySelectorAll('[data-action="sound"]');
    for (var i = 0; i < btns.length; i++) btns[i].setAttribute('aria-label', muted ? t('soundOff', 'Sound off') : t('soundOn', 'Sound on'));
  }

  function footerHTML() {
    var terms = B.termsUrl ? ' <a href="' + esc(B.termsUrl) + '" target="_blank" rel="noopener">' + esc(B.termsText || 'Terms') + '</a>' : '';
    var credit = B.studioCredit ? '<span class="pa-credit">' + esc(fill(t('credit', 'Game kit by {studio}'), { studio: B.studioCredit })) + '</span>' : '';
    var notice = B.demoNotice ? '<span>' + esc(B.demoNotice) + '</span>' : '';
    return '<p class="pa-legal">' + esc(B.legal || '') + terms + '</p><p class="pa-meta">' + notice + credit + '</p>';
  }

  // ------------------------------------------------------------------ game chrome
  var game = null;
  var state = { screen: 'title' };
  var blockedUntil = 0;
  var result = null;
  var demoTimer = 0;

  function $(sel) { return document.querySelector(sel); }

  function buildChrome(def) {
    var hub = B.hubLink !== false;
    var top = document.createElement('header');
    top.className = 'pa-top';
    top.innerHTML =
      (hub ? '<a class="pa-pill pa-back" href="../index.html">' + UI.back + '<span>' + esc(t('allGames', 'All games')) + '</span></a>' : '<span></span>') +
      '<span class="pa-top-brand">' + logoHTML(false) + '</span>' +
      '<span class="pa-top-actions">' +
      '<button type="button" class="pa-icon-btn" data-action="sound">' + soundIcons() + '</button>' +
      '<button type="button" class="pa-icon-btn pa-only-playing" data-action="pause" aria-label="' + esc(t('pause', 'Pause')) + '">' + UI.pause + '</button>' +
      '</span>';
    document.body.appendChild(top);

    var teaser = topReward(def.id);
    var titleScreen = document.createElement('section');
    titleScreen.className = 'pa-screen';
    titleScreen.id = 'pa-title';
    titleScreen.setAttribute('aria-labelledby', 'pa-title-h');
    titleScreen.innerHTML =
      '<div class="pa-card pa-card-title">' +
      '<div class="pa-card-logo">' + logoHTML(true) + '</div>' +
      (def.tag ? '<p class="pa-kicker">' + esc(def.tag) + '</p>' : '') +
      '<h1 class="pa-title" id="pa-title-h">' + esc(def.title) + '</h1>' +
      '<p class="pa-howto">' + esc(def.howTo || '') + '</p>' +
      (teaser ? '<p class="pa-teaser"><span>' + esc(fill((B.hub || {}).upTo || 'Win up to {reward}', { reward: '' }).trim()) + '</span> <strong>' + esc(teaser.title) + '</strong></p>' : '') +
      '<button type="button" class="pa-btn pa-btn-primary pa-btn-big" data-action="play">' + UI.play + '<span>' + esc(t('play', 'Play')) + '</span></button>' +
      '<p class="pa-limit" hidden></p>' +
      '</div>';
    document.body.appendChild(titleScreen);

    var pause = document.createElement('section');
    pause.className = 'pa-screen pa-screen-dim';
    pause.id = 'pa-pause';
    pause.innerHTML =
      '<div class="pa-card pa-card-small">' +
      '<h2 class="pa-heading">' + esc(t('paused', 'Paused')) + '</h2>' +
      '<button type="button" class="pa-btn pa-btn-primary" data-action="resume">' + UI.play + '<span>' + esc(t('resume', 'Resume')) + '</span></button>' +
      '<div class="pa-row">' +
      '<button type="button" class="pa-btn pa-btn-ghost" data-action="restart">' + UI.again + '<span>' + esc(t('restart', 'Restart')) + '</span></button>' +
      '<button type="button" class="pa-btn pa-btn-ghost" data-action="home">' + UI.home + '<span>' + esc(t('home', 'Home')) + '</span></button>' +
      '</div></div>';
    document.body.appendChild(pause);

    var res = document.createElement('section');
    res.className = 'pa-screen';
    res.id = 'pa-result';
    res.setAttribute('aria-live', 'polite');
    res.innerHTML = '<div class="pa-card pa-card-result" id="pa-result-card"></div>';
    document.body.appendChild(res);

    var foot = document.createElement('footer');
    foot.className = 'pa-game-footer';
    foot.innerHTML = footerHTML();
    document.body.appendChild(foot);
  }

  function show(name) {
    var map = { title: 'pa-title', paused: 'pa-pause', gameover: 'pa-result' };
    ['pa-title', 'pa-pause', 'pa-result'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.classList.toggle('show', map[name] === id);
    });
    document.body.setAttribute('data-screen', state.screen);
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    blockedUntil = now() + 160;
    if ((name === 'paused' || name === 'gameover') && !COARSE) {
      var primary = document.querySelector('#' + map[name] + ' .pa-btn-primary');
      if (primary) setTimeout(function () { if (primary.offsetParent) primary.focus({ preventScroll: true }); }, 80);
    }
  }

  function setScreen(name) {
    state.screen = name;
    show(name === 'playing' ? null : name);
  }

  function start() {
    if (!game) return;
    clearTimeout(demoTimer);
    if (!DEMO && game.canStart && !game.canStart()) {
      showLimit();
      return;
    }
    result = null;
    setScreen('playing');
    audio.play('start');
    game.start();
    hook('onGameStart', game.id);
  }

  function showLimit() {
    var msg = game.limitText || '';
    var nodes = document.querySelectorAll('.pa-limit');
    for (var i = 0; i < nodes.length; i++) { nodes[i].textContent = msg; nodes[i].hidden = !msg; }
    toast(msg);
  }

  function pause() {
    if (state.screen !== 'playing' || DEMO) return;
    setScreen('paused');
    if (game.pause) game.pause();
  }
  function resume() {
    if (state.screen !== 'paused') return;
    setScreen('playing');
    if (game.resume) game.resume();
  }
  function home() {
    if (B.hubLink !== false && !DEMO) {
      location.href = '../index.html';
      return;
    }
    if (game.stop) game.stop();
    setScreen('title');
  }

  function couponHTML(reward, locked) {
    return '<div class="pa-coupon' + (locked ? ' is-locked' : '') + '">' +
      '<p class="pa-coupon-kicker">' + esc(t('youWon', 'You won')) + '</p>' +
      '<p class="pa-coupon-title">' + esc(reward.title) + '</p>' +
      (reward.description ? '<p class="pa-coupon-desc">' + esc(reward.description) + '</p>' : '') +
      '<div class="pa-code-row">' +
      '<span class="pa-code" id="pa-code">' + esc(locked ? '••••••' : reward.code) + '</span>' +
      '<button type="button" class="pa-btn pa-btn-secondary pa-btn-small" data-action="copy"' + (locked ? ' disabled' : '') + '>' + UI.copy + '<span>' + esc(t('copy', 'Copy')) + '</span></button>' +
      '</div>' +
      (locked ? '<p class="pa-coupon-note">' + esc(t('locked', 'Fill in the form to reveal your code')) + '</p>'
        : (B.rewardNote ? '<p class="pa-coupon-note">' + esc(B.rewardNote) + '</p>' : '')) +
      '</div>';
  }

  function leadHTML(required) {
    var lc = B.leadCapture || {};
    var labels = lc.labels || {};
    var fields = lc.fields || ['name', 'email'];
    var types = { name: 'text', email: 'email', phone: 'tel' };
    var auto = { name: 'given-name', email: 'email', phone: 'tel' };
    var html = '';
    if (!required) {
      html += '<button type="button" class="pa-link-btn" data-action="lead-open">' + esc(lc.optionalButton || 'Email me this code') + '</button>';
    }
    html += '<form class="pa-lead" id="pa-lead" novalidate' + (required ? '' : ' hidden') + '>' +
      '<p class="pa-lead-title">' + esc(lc.title || '') + '</p>';
    fields.forEach(function (f) {
      html += '<label class="pa-field" for="pa-lead-' + f + '"><span>' + esc(labels[f] || f) + '</span>' +
        '<input id="pa-lead-' + f + '" name="' + f + '" type="' + (types[f] || 'text') + '" autocomplete="' + (auto[f] || 'on') + '" required></label>';
    });
    if (lc.consentText) {
      html += '<label class="pa-check" for="pa-lead-consent"><input id="pa-lead-consent" name="consent" type="checkbox"><span>' + esc(lc.consentText) + '</span></label>';
    }
    html += '<p class="pa-lead-error" role="alert" hidden></p>' +
      '<button type="submit" class="pa-btn pa-btn-secondary">' + esc(lc.submitText || 'Send') + '</button>' +
      '</form>' +
      '<p class="pa-lead-thanks" hidden>' + esc(lc.thanksText || 'Thanks!') + '</p>';
    return html;
  }

  function renderResult(r) {
    var card = $('#pa-result-card');
    var lc = B.leadCapture || {};
    var leadOn = !!(lc.enabled && r.reward);
    var locked = leadOn && !!lc.required && !r.leadSent;
    var html = '<h2 class="pa-result-title">' + esc(r.title) + '</h2>';
    if (r.subtitle) html += '<p class="pa-result-sub">' + esc(r.subtitle) + '</p>';
    if (r.score != null) {
      html += '<div class="pa-score-row"><span class="pa-score-label">' + esc(t('score', 'Score')) + '</span><strong class="pa-score">' + esc(r.score) + '</strong>' +
        (r.newBest ? '<span class="pa-badge">' + esc(t('newBest', 'NEW BEST!')) + '</span>' : '') + '</div>';
    }
    if (r.stats && r.stats.length) {
      html += '<dl class="pa-stats">' + r.stats.map(function (s) {
        return '<div><dt>' + esc(s[0]) + '</dt><dd>' + esc(s[1]) + '</dd></div>';
      }).join('') + '</dl>';
    }
    if (r.reward) html += couponHTML(r.reward, locked);
    else if (r.nextText) html += '<p class="pa-next">' + esc(r.nextText) + '</p>';
    if (leadOn) html += leadHTML(!!lc.required);
    var cta = B.cta || {};
    html += '<div class="pa-actions">' +
      '<button type="button" class="pa-btn pa-btn-primary" data-action="restart">' + UI.again + '<span>' + esc(t('playAgain', 'Play again')) + '</span></button>' +
      (cta.url ? '<a class="pa-btn pa-btn-accent" data-action="cta" href="' + esc(cta.url) + '"' + (cta.newTab !== false ? ' target="_blank" rel="noopener"' : '') + '>' + UI.cta + '<span>' + esc(cta.text || 'Visit') + '</span></a>' : '') +
      '<div class="pa-row">' +
      '<button type="button" class="pa-btn pa-btn-ghost" data-action="share">' + UI.share + '<span>' + esc(t('share', 'Share')) + '</span></button>' +
      '<button type="button" class="pa-btn pa-btn-ghost" data-action="home">' + UI.home + '<span>' + esc(B.hubLink !== false ? t('allGames', 'All games') : t('home', 'Home')) + '</span></button>' +
      '</div></div>' +
      '<p class="pa-limit" hidden></p>';
    card.innerHTML = html;
    var form = $('#pa-lead');
    if (form) form.addEventListener('submit', onLeadSubmit);
  }

  /**
   * End of a round.
   * r = { score, won, reward, next, title, subtitle, stats: [[label, value]], shareText }
   */
  function finish(r) {
    r = r || {};
    if (DEMO) {
      clearTimeout(demoTimer);
      demoTimer = setTimeout(function () { if (game) game.start(); }, r.demoDelay || 2200);
      return;
    }
    if (r.score != null) {
      var best = storage.get('best:' + game.id, 0) || 0;
      r.newBest = r.score > best && r.score > 0;
      if (r.newBest) storage.set('best:' + game.id, r.score);
    }
    if (!r.title) r.title = r.reward ? (game.winTitle || 'You won!') : (game.loseTitle || 'Nice try!');
    if (!r.reward && r.next && !r.nextText && game.nextText) {
      r.nextText = fill(game.nextText, { need: r.next.minScore != null ? r.next.minScore : r.next.minStars, reward: r.next.title });
    }
    result = r;
    setScreen('gameover');
    renderResult(r);
    audio.play(r.reward ? 'win' : 'lose');
    if (r.reward) setTimeout(function () { confetti.burst(170); }, 120);
    hook('onGameOver', game.id, r.score);
    if (r.reward) hook('onWin', game.id, { title: r.reward.title, code: r.reward.code, description: r.reward.description || '' });
    if (game.canStart && !game.canStart()) showLimit();
  }

  function onLeadSubmit(e) {
    e.preventDefault();
    var form = e.target;
    var lc = B.leadCapture || {};
    var err = form.querySelector('.pa-lead-error');
    var data = { name: '', email: '', phone: '', consent: false };
    var valid = true;
    (lc.fields || ['name', 'email']).forEach(function (f) {
      var input = form.querySelector('[name="' + f + '"]');
      var v = input ? input.value.trim() : '';
      data[f] = v;
      var ok = v.length > 0;
      if (f === 'email') ok = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
      if (f === 'phone') ok = /^[+()\d\s.-]{6,}$/.test(v);
      if (input) input.setAttribute('aria-invalid', ok ? 'false' : 'true');
      if (!ok) valid = false;
    });
    if (!valid) {
      err.textContent = lc.errorText || 'Please check the form.';
      err.hidden = false;
      return;
    }
    var consent = form.querySelector('[name="consent"]');
    if (consent) {
      data.consent = consent.checked;
      if (!consent.checked) {
        err.textContent = lc.consentError || 'Please tick the box to continue.';
        err.hidden = false;
        return;
      }
    }
    err.hidden = true;
    var r = result || {};
    data.game = game.id;
    data.reward = r.reward ? r.reward.title : '';
    data.code = r.reward ? r.reward.code : '';
    data.score = r.score == null ? '' : r.score;
    data.brand = B.name || '';
    data.time = new Date().toISOString();
    var button = form.querySelector('button[type="submit"]');
    if (button) button.disabled = true;

    function done() {
      hook('onLead', data);
      form.hidden = true;
      var thanks = document.querySelector('.pa-lead-thanks');
      if (thanks) thanks.hidden = false;
      if (r.reward && lc.required) {
        r.leadSent = true;
        var codeEl = document.getElementById('pa-code');
        if (codeEl) codeEl.textContent = r.reward.code;
        var copyBtn = document.querySelector('[data-action="copy"]');
        if (copyBtn) copyBtn.disabled = false;
        var coupon = document.querySelector('.pa-coupon');
        if (coupon) coupon.classList.remove('is-locked');
        var note = document.querySelector('.pa-coupon-note');
        if (note) note.textContent = B.rewardNote || '';
      }
      audio.play('match');
    }
    if (!lc.webhookUrl) { done(); return; }
    var asText = lc.webhookFormat === 'text';
    try {
      fetch(lc.webhookUrl, {
        method: 'POST',
        mode: asText ? 'no-cors' : 'cors',
        headers: { 'Content-Type': asText ? 'text/plain;charset=utf-8' : 'application/json' },
        body: JSON.stringify(data)
      }).then(done, function () {
        if (button) button.disabled = false;
        err.textContent = 'Could not send the form. Please try again.';
        err.hidden = false;
      });
    } catch (ex) {
      done();
    }
  }

  function onAction(name, el) {
    switch (name) {
      case 'play':
      case 'restart':
        start();
        break;
      case 'pause': pause(); break;
      case 'resume': resume(); break;
      case 'home': home(); break;
      case 'sound': audio.toggle(); break;
      case 'share': {
        var r = result || {};
        var sh = B.share || {};
        var text = r.reward
          ? fill(sh.winText || 'I just won {reward} playing {game} at {brand}!', { reward: r.reward.title, game: game.title, brand: B.name })
          : fill(sh.text || 'I scored {score} in {game} at {brand}!', { score: r.score == null ? '' : r.score, game: game.title, brand: B.name });
        share(text);
        break;
      }
      case 'copy': {
        var code = result && result.reward ? result.reward.code : '';
        if (code) copyText(code, t('codeCopied', 'Code copied!'), document.getElementById('pa-code'));
        break;
      }
      case 'lead-open': {
        var form = document.getElementById('pa-lead');
        if (form) {
          form.hidden = false;
          el.hidden = true;
          var first = form.querySelector('input');
          if (first) first.focus();
        }
        break;
      }
      case 'cta':
        hook('onCtaClick', game ? game.id : 'hub');
        break;
      default:
        if (game && game.actions && game.actions[name]) game.actions[name](el);
    }
  }

  function wireGlobalInput() {
    document.addEventListener('click', function (e) {
      var el = e.target.closest ? e.target.closest('[data-action]') : null;
      if (!el || el.disabled) return;
      var name = el.getAttribute('data-action');
      audio.unlock();
      if (name !== 'cta') audio.play('click');
      onAction(name, el);
    });
    window.addEventListener('keydown', function (e) {
      var k = e.key;
      var tag = e.target && e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (k === 'Escape' || k === 'p' || k === 'P') {
        if (state.screen === 'playing') pause();
        else if (state.screen === 'paused') resume();
      } else if (k === 'm' || k === 'M') {
        audio.unlock();
        audio.toggle();
      } else if ((k === 'Enter' || k === ' ') && state.screen === 'title' && tag !== 'BUTTON' && tag !== 'A' && now() >= blockedUntil) {
        e.preventDefault();
        audio.unlock();
        start();
      }
    });
    document.addEventListener('visibilitychange', function () { if (document.hidden) pause(); });
    window.addEventListener('blur', pause);
    document.addEventListener('pointerdown', function () { audio.unlock(); }, { passive: true });
  }

  /**
   * Register the game running on this page.
   * def = { id, title, tag, howTo, winTitle, loseTitle, nextText, limitText,
   *         start(), pause(), resume(), stop(), forceEnd(), state(), canStart(), actions: {} }
   */
  function mountGame(def) {
    game = def;
    document.title = def.title + ' · ' + (B.name || '');
    buildChrome(def);
    renderSound();
    if (DEMO) document.body.classList.add('pa-demo');
    window.__GAME__ = {
      id: def.id,
      version: '1.0.0',
      getState: function () {
        var s = def.state ? def.state() : {};
        s.screen = state.screen;
        s.demo = DEMO;
        return s;
      },
      start: start,
      forceGameOver: function () { if (state.screen === 'playing' && def.forceEnd) def.forceEnd(); }
    };
    if (DEMO) {
      setScreen('playing');
      def.start();
    } else {
      setScreen('title');
      if (def.canStart && !def.canStart()) showLimit();
    }
  }

  // ------------------------------------------------------------------ boot (every page)
  applyTheme();
  audio.onChange(renderSound);
  wireGlobalInput();

  window.PromoArcade = {
    brand: B,
    colors: COLORS,
    lightBackground: LIGHT_BG,
    demo: DEMO,
    reducedMotion: REDUCED,
    coarse: COARSE,
    storage: storage,
    audio: audio,
    products: products,
    loadProducts: loadProducts,
    productHTML: productHTML,
    iconURL: iconURL,
    logoHTML: logoHTML,
    footerHTML: footerHTML,
    rewardFor: rewardFor,
    topReward: topReward,
    tiers: tiers,
    text: t,
    fill: fill,
    esc: esc,
    mix: mix,
    rgba: rgba,
    onColor: onColor,
    toast: toast,
    confetti: confetti.burst,
    hook: hook,
    mountGame: mountGame,
    finish: finish,
    screen: function () { return state.screen; },
    inputReady: function () { return state.screen === 'playing' && now() >= blockedUntil; },
    renderSound: renderSound
  };
})();
