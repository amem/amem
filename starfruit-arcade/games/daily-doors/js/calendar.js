/*
 * js/calendar.js — Daily Doors advent / countdown calendar (index.html).
 *
 * Door N unlocks at local midnight on startDate + N − 1 days. Opening a door shows a
 * scratch-off foil (or opens straight away with reveal: 'tap'); the treat behind it is a
 * coupon ticket (with optional lead capture) or a message. Opened doors are remembered on
 * the device. ?date=YYYY-MM-DD previews any day; ?demo=1 lets a bot open doors for trailers.
 */
(function () {
  'use strict';
  var KIT = window.BrandKit;
  var B = KIT.brand;
  var C = KIT.colors;
  var T = KIT.texts;
  var fmt = KIT.fmt;
  var esc = KIT.esc;
  var mix = KIT.color.mix;
  var cal = KIT.extend({
    title: 'Advent Calendar', subtitle: '', startDate: '', days: 24, allowPastDoors: true,
    reveal: 'scratch', shuffleLayout: true, effect: 'snow', endMessage: ''
  }, B.calendar);
  var DAYS = Math.max(1, Math.min(60, Math.round(cal.days) || 24));
  var DOORS = B.doors && B.doors.length ? B.doors : [{ title: 'Surprise!', description: '' }];
  var DAY_MS = 86400000;

  var board = document.getElementById('board');
  var wrap = document.getElementById('board-area');
  var nextChip = document.getElementById('next-chip');
  var modal = document.getElementById('door-modal');
  var modalHeading = document.getElementById('door-heading');
  var scratchHost = document.getElementById('scratch-host');
  var prizeImg = document.getElementById('prize-img');
  var prizeTitle = document.getElementById('prize-title');
  var prizeDesc = document.getElementById('prize-desc');

  // ---------------------------------------------------------------- dates
  function parseDate(s) {
    var m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(String(s || '').trim());
    return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null;
  }
  var override = parseDate(new URLSearchParams(location.search).get('date'));
  function now() {
    var d = new Date();
    return override ? new Date(override.getFullYear(), override.getMonth(), override.getDate(), d.getHours(), d.getMinutes(), d.getSeconds()) : d;
  }
  var start = parseDate(cal.startDate);
  if (!start) {
    var t0 = new Date();
    start = new Date(t0.getFullYear(), t0.getMonth(), t0.getDate() - 6);
  }
  function doorDate(day) { return new Date(start.getFullYear(), start.getMonth(), start.getDate() + day - 1); }
  function todayIndex() {
    var n = now();
    return Math.round((new Date(n.getFullYear(), n.getMonth(), n.getDate()) - start) / DAY_MS) + 1;
  }
  function duration(ms) {
    if (ms <= 0) return '00:00:00';
    var days = Math.floor(ms / DAY_MS);
    if (days >= 2) return fmt(T.days || '{n} days', { n: days });
    var s = Math.floor(ms / 1000);
    var pad = function (v) { return (v < 10 ? '0' : '') + v; };
    return pad(Math.floor(s / 3600)) + ':' + pad(Math.floor(s / 60) % 60) + ':' + pad(s % 60);
  }
  function content(day) { return DOORS[(day - 1) % DOORS.length]; }

  // ---------------------------------------------------------------- state
  var openedKey = 'opened:' + start.getFullYear() + '-' + (start.getMonth() + 1) + '-' + start.getDate() + ':' + DAYS;
  var opened = {};
  var doors = [];
  var modalDay = 0;
  var lastDay = 0;
  var lastToday = 0;
  var card = null;
  var botT = 2;
  var cols = 6;

  var shell = KIT.game({
    id: 'daily-doors',
    title: cal.title,
    teaser: fmt(T.teaser || '{n} doors', { n: DAYS }),
    art: [KIT.iconSrc('gift'), KIT.iconSrc(B.logoIcon) || KIT.iconSrc('star'), KIT.iconSrc('gift')],
    demoDelay: 2200,
    start: function () { closeModal(); render(); botT = 1.4; },
    stop: closeModal,
    forceGameOver: function () {
      if (modalDay) { var d = modalDay; markOpened(d); closeModal(); showResult(d); return; }
      var today = Math.min(todayIndex(), DAYS);
      if (today >= 1) { markOpened(today); showResult(today); } else showNotYet();
    },
    score: function () { return Object.keys(opened).length; },
    state: function () { return { today: todayIndex(), days: DAYS, opened: Object.keys(opened).length, doorOpen: modalDay }; },
    onKey: function (e, down) {
      if (!down) return;
      if (modalDay && (e.key === ' ' || e.key === 'Enter') && !(e.target && e.target.tagName === 'BUTTON')) {
        e.preventDefault();
        if (card) card.reveal();
        return;
      }
      var dir = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -cols, ArrowDown: cols }[e.key];
      if (dir === undefined || modalDay) return;
      e.preventDefault();
      var cur = -1;
      for (var i = 0; i < doors.length; i++) if (doors[i].el === document.activeElement) cur = i;
      var next = cur < 0 ? 0 : Math.max(0, Math.min(doors.length - 1, cur + dir));
      doors[next].el.focus();
    },
    onAction: function (name) {
      if (name === 'reveal' && card && modalDay) card.reveal();
      if (name === 'close-door') closeModal();
    },
    shareText: function (r, vars) {
      return fmt((B.share && B.share.text) || '{reward} at {brand}', { day: lastDay, brand: vars.brand, reward: vars.reward || (r.reward && r.reward.title) || '' });
    }
  });
  opened = shell.demo ? {} : (shell.store.get(openedKey, {}) || {});

  function markOpened(day) {
    if (opened[day]) return;
    opened[day] = 1;
    if (!shell.demo) shell.store.set(openedKey, opened);
    render();
  }

  // ---------------------------------------------------------------- board
  function seededOrder() {
    var order = [];
    for (var i = 1; i <= DAYS; i++) order.push(i);
    if (!cal.shuffleLayout) return order;
    var seed = 0;
    String(B.storageKey || 'daily-doors').split('').forEach(function (ch) { seed = (seed * 31 + ch.charCodeAt(0)) % 2147483647; });
    seed = seed || 7;
    for (i = order.length - 1; i > 0; i--) {
      seed = (seed * 16807) % 2147483647;
      var j = seed % (i + 1);
      var tmp = order[i]; order[i] = order[j]; order[j] = tmp;
    }
    return order;
  }

  var PALETTE = [C.primary, C.secondary, mix(C.primary, C.accent, 0.35), mix(C.secondary, C.deep, 0.35), mix(C.primary, C.deep, 0.4)];
  var PATTERNS = ['stripes', 'dots', 'zig', 'plaid', 'plain'];

  function build() {
    board.innerHTML = '';
    doors = seededOrder().map(function (day, i) {
      var c = content(day);
      var el = document.createElement('button');
      el.type = 'button';
      el.className = 'dd-door';
      el.style.setProperty('--door', PALETTE[i % PALETTE.length]);
      el.style.setProperty('--d', (i * 0.03).toFixed(2) + 's');
      var icon = KIT.iconSrc(c.icon) || KIT.iconSrc('gift');
      el.innerHTML =
        '<span class="dd-inner">' +
          '<span class="dd-inside"><img src="' + esc(icon) + '" alt=""><span class="dd-inside-title">' + esc(c.title || '') + '</span></span>' +
          '<span class="dd-leaf pat-' + PATTERNS[(i * 2 + Math.floor(i / 5)) % PATTERNS.length] + (i % 3 === 1 ? ' has-ribbon' : '') + '">' +
            '<span class="dd-num">' + day + '</span><span class="dd-tag">' + esc(T.today || 'Today') + '</span>' +
            '<svg class="dd-lock" viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10.5" width="14" height="10" rx="2.5" fill="currentColor"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" fill="none" stroke="currentColor" stroke-width="2.4"/></svg>' +
          '</span>' +
        '</span>';
      el.addEventListener('click', function () { onDoor(day); });
      board.appendChild(el);
      return { day: day, el: el };
    });
    board.classList.remove('is-dealt');
    void board.offsetWidth;
    board.classList.add('is-dealt');
    setTimeout(function () { board.classList.remove('is-dealt'); }, 600 + DAYS * 30);
    layout();
    render();
  }

  function render() {
    var today = todayIndex();
    lastToday = today;
    doors.forEach(function (d) {
      var el = d.el;
      var isOpen = !!opened[d.day];
      var unlocked = d.day <= today;
      var closedForGood = unlocked && d.day < today && !cal.allowPastDoors && !isOpen;
      el.classList.toggle('is-open', isOpen);
      el.classList.toggle('is-locked', !unlocked || closedForGood);
      el.classList.toggle('is-today', d.day === today && !isOpen);
      el.classList.toggle('is-ready', unlocked && !isOpen && d.day !== today && !closedForGood);
      var label = fmt(T.dayHeading || 'Door {day}', { day: d.day });
      if (isOpen) label += ', ' + (content(d.day).title || '');
      else if (d.day === today) label += ', ' + (T.today || 'Today');
      else if (!unlocked) label += ', ' + fmt(T.opensIn || 'opens in {time}', { day: d.day, time: duration(doorDate(d.day) - now()) });
      el.setAttribute('aria-label', label);
    });
    updateChip();
  }

  function layout() {
    var r = wrap.getBoundingClientRect();
    var W = Math.max(100, r.width), H = Math.max(100, r.height);
    var gap = Math.round(Math.max(6, Math.min(14, Math.min(W, H) * 0.02)));
    var aspect = 0.86;
    var best = 0, bestCols = 4;
    for (var c = 3; c <= Math.min(12, DAYS); c++) {
      var rows = Math.ceil(DAYS / c);
      var cw = Math.min((W - gap * (c - 1)) / c, ((H - gap * (rows - 1)) / rows) * aspect);
      if (cw > best) { best = cw; bestCols = c; }
    }
    cols = bestCols;
    var size = Math.floor(Math.min(best, 150));
    board.style.setProperty('--cols', cols);
    board.style.setProperty('--cw', size + 'px');
    board.style.setProperty('--ch', Math.floor(size / aspect) + 'px');
    board.style.setProperty('--gap', gap + 'px');
    board.classList.toggle('is-small', size < 64);
  }

  function updateChip() {
    var today = todayIndex();
    var n = now();
    var text;
    if (today < 1) text = fmt(T.startsIn || 'Opens in {time}', { time: duration(doorDate(1) - n) });
    else if (today >= DAYS) text = today > DAYS ? (T.calendarOver || '') : (cal.endMessage || '');
    else text = fmt(T.nextDoor || 'Next door in {time}', { time: duration(doorDate(today + 1) - n) });
    if (nextChip.textContent !== text) nextChip.textContent = text;
    nextChip.hidden = !text;
  }

  // ---------------------------------------------------------------- doors
  function doorEl(day) {
    for (var i = 0; i < doors.length; i++) if (doors[i].day === day) return doors[i].el;
    return null;
  }

  function onDoor(day) {
    if (shell.screen() !== 'playing' || shell.demo || !shell.ready() || modalDay) return;
    shell.hideHint();
    activate(day, false);
  }

  function activate(day, auto) {
    var today = todayIndex();
    if (opened[day]) { showResult(day); return; }
    var el = doorEl(day);
    if (day > today || (day < today && !cal.allowPastDoors)) {
      if (el) {
        el.classList.remove('is-shake');
        void el.offsetWidth;
        el.classList.add('is-shake');
      }
      var msg = day > today
        ? fmt(day === today + 1 ? (T.opensTomorrow || T.opensIn) : T.opensIn, { day: day, time: duration(doorDate(day) - now()) })
        : (T.calendarOver || '');
      KIT.toast(msg);
      KIT.sfx.miss();
      return;
    }
    KIT.sfx.open();
    if (cal.reveal === 'tap') {
      markOpened(day);
      setTimeout(function () { showResult(day); }, 450);
      return;
    }
    openModal(day, auto);
  }

  function openModal(day, auto) {
    modalDay = day;
    var c = content(day);
    modalHeading.textContent = fmt(T.doorKicker || 'Behind door {day}', { day: day });
    prizeImg.src = KIT.iconSrc(c.icon) || KIT.iconSrc('gift');
    prizeTitle.textContent = c.title || '';
    prizeDesc.textContent = c.code ? (c.description || '') : '';
    modal.classList.add('is-on');
    modal.setAttribute('aria-hidden', 'false');
    if (!card) {
      card = KIT.scratchCard(scratchHost, {
        label: T.scratchHere || 'Scratch here',
        canScratch: function () { return shell.screen() === 'playing' && !shell.demo; },
        onStart: shell.hideHint,
        onReveal: onRevealed
      });
    } else {
      card.reset();
    }
    if (auto) setTimeout(function () { if (modalDay === day) card.autoScratch(1.5); }, 500);
  }

  function onRevealed() {
    var day = modalDay;
    if (!day) return;
    var r = scratchHost.getBoundingClientRect();
    KIT.confetti({ x: r.left + r.width / 2, y: r.top + r.height / 2, count: 70, power: 0.6 });
    KIT.sfx.golden();
    markOpened(day);
    setTimeout(function () {
      if (modalDay !== day) return;
      closeModal();
      showResult(day);
    }, 900);
  }

  function closeModal() {
    modalDay = 0;
    modal.classList.remove('is-on');
    modal.setAttribute('aria-hidden', 'true');
  }

  function showResult(day) {
    var c = content(day);
    lastDay = day;
    shell.end({
      heading: fmt(T.dayHeading || 'Door {day}', { day: day }),
      kicker: fmt(T.doorKicker || 'Behind door {day}', { day: day }),
      hideScore: true,
      score: day,
      art: KIT.iconSrc(c.icon) || KIT.iconSrc('gift'),
      reward: { title: c.title || '', code: c.code || '', description: c.description || '' },
      againText: T.playAgain
    });
  }

  function showNotYet() {
    shell.end({ heading: cal.title, sub: fmt(T.startsIn || '', { time: duration(doorDate(1) - now()) }), hideScore: true, againText: T.playAgain });
  }

  // ---------------------------------------------------------------- demo bot & clock
  function botStep() {
    var today = Math.min(todayIndex(), DAYS);
    if (today < 1) return;
    var next = 0;
    for (var d = 1; d <= today && !next; d++) if (!opened[d]) next = d;
    if (!next) { opened = {}; render(); next = 1; }
    activate(next, true);
  }

  var tick = 0;
  KIT.loop(function (dt) {
    tick += dt;
    if (tick >= 1) {
      tick = 0;
      if (todayIndex() !== lastToday) render(); else updateChip();
    }
    if (shell.demo && shell.screen() === 'playing' && !modalDay) {
      botT -= dt;
      if (botT <= 0) { botT = 99; botStep(); }
    }
  });

  window.addEventListener('resize', layout);
  window.addEventListener('orientationchange', function () { setTimeout(layout, 120); });
  document.querySelectorAll('[data-cal]').forEach(function (n) {
    var v = cal[n.getAttribute('data-cal')];
    n.textContent = v || '';
    n.hidden = !v;
  });
  var scratchLink = document.querySelector('[data-scratch-link]');
  if (scratchLink) scratchLink.hidden = B.crossLinks === false;
  KIT.backdrop(document.getElementById('fx'), cal.effect);
  build();
})();
