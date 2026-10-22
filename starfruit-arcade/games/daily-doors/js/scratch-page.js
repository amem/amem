/*
 * js/scratch-page.js — Scratch & Win card (scratch.html).
 * The prize is drawn first (weighted by config.js → scratch.prizes[].weight), printed under
 * the foil, and revealed by scratching. Optional cards-per-day limit stored on the device.
 */
(function () {
  'use strict';
  var KIT = window.BrandKit;
  var B = KIT.brand;
  var T = KIT.texts;
  var fmt = KIT.fmt;
  var sc = KIT.extend({ title: 'Scratch & Win', subtitle: '', cardsPerDay: 0, prizes: [] }, B.scratch);
  var PRIZES = sc.prizes && sc.prizes.length ? sc.prizes : [{ title: 'Thanks for playing!', weight: 1, win: false, icon: 'heart' }];
  var LIMIT = sc.cardsPerDay || 0;

  var host = document.getElementById('card-host');
  var ticket = document.getElementById('ticket');
  var emptyMsg = document.getElementById('empty');
  var statusEl = document.getElementById('status');
  var prizeImg = document.getElementById('prize-img');
  var prizeTitle = document.getElementById('prize-title');
  var prizeDesc = document.getElementById('prize-desc');

  var prize = null;
  var revealed = false;
  var wins = 0;
  var botT = 0;
  var card = null;

  var jackpot = PRIZES.filter(function (p) { return p.win; }).sort(function (a, b) { return (a.weight || 1) - (b.weight || 1); })[0];

  var shell = KIT.game({
    id: 'scratch-win',
    title: sc.title,
    teaser: jackpot ? fmt(T.winUpTo || 'Win up to {title}', { title: jackpot.title }) : '',
    art: [KIT.iconSrc('star'), KIT.iconSrc('gift'), KIT.iconSrc('star')],
    demoDelay: 2400,
    start: newCard,
    stop: function () { prize = null; },
    forceGameOver: function () {
      if (!prize) newCard();
      if (!prize) { finish(); return; }
      revealed = true;
      finish();
    },
    score: function () { return wins; },
    state: function () { return { prize: prize ? prize.title : '', revealed: revealed, cardsLeft: cardsLeft() === Infinity ? -1 : cardsLeft() }; },
    onKey: function (e, down) {
      if (down && (e.key === ' ' || e.key === 'Enter') && card && prize && !revealed) { e.preventDefault(); card.reveal(); }
    },
    onAction: function (name) { if (name === 'reveal' && card && prize && !revealed) card.reveal(); },
    shareText: function (r, vars) {
      return r.reward ? fmt(T.scratchShare || '{reward} at {brand}!', vars) : fmt(sc.title + ' · {brand}', vars);
    }
  });

  // ---------------------------------------------------------------- cards per day
  function today() { var d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
  function used() { var rec = shell.store.get('cards', null); return rec && rec.day === today() ? rec.count : 0; }
  function cardsLeft() { return (!LIMIT || shell.demo) ? Infinity : Math.max(0, LIMIT - used()); }
  function useCard() { if (LIMIT && !shell.demo) shell.store.set('cards', { day: today(), count: used() + 1 }); }

  function pick() {
    var total = 0;
    PRIZES.forEach(function (p) { total += Math.max(0, p.weight == null ? 1 : p.weight); });
    var r = Math.random() * total;
    for (var i = 0; i < PRIZES.length; i++) {
      r -= Math.max(0, PRIZES[i].weight == null ? 1 : PRIZES[i].weight);
      if (r < 0) return PRIZES[i];
    }
    return PRIZES[PRIZES.length - 1];
  }

  function status(text) { statusEl.textContent = text; }

  function newCard() {
    revealed = false;
    botT = 1.2;
    if (cardsLeft() <= 0) {
      prize = null;
      ticket.classList.add('is-empty');
      emptyMsg.hidden = false;
      emptyMsg.textContent = T.comeBack || '';
      status(T.comeBack || '');
      return;
    }
    ticket.classList.remove('is-empty');
    emptyMsg.hidden = true;
    prize = pick();
    useCard();
    prizeImg.src = KIT.iconSrc(prize.icon) || KIT.iconSrc(prize.win ? 'gift' : 'heart');
    prizeTitle.textContent = prize.title || '';
    prizeDesc.textContent = prize.description || '';
    if (!card) {
      card = KIT.scratchCard(host, {
        label: T.scratchHere || 'Scratch here',
        canScratch: function () { return shell.screen() === 'playing' && !shell.demo && !!prize; },
        onStart: shell.hideHint,
        onReveal: onRevealed
      });
    } else {
      card.reset();
    }
    var left = cardsLeft();
    status(left !== Infinity ? fmt(T.cardsLeft || '{n} left', { n: left }) : (T.scratchHint || sc.subtitle || ''));
  }

  function onRevealed() {
    if (!prize || revealed) return;
    revealed = true;
    var r = host.getBoundingClientRect();
    if (prize.win) {
      KIT.confetti({ x: r.left + r.width / 2, y: r.top + r.height / 2, count: 120, power: 0.9 });
      KIT.sfx.golden();
    } else {
      KIT.sfx.miss();
    }
    setTimeout(function () { if (revealed && shell.screen() === 'playing') finish(); }, 1000);
  }

  function finish() {
    var left = cardsLeft();
    var p = prize;
    if (p && p.win) wins++;
    shell.end({
      heading: !p ? sc.title : p.win ? (T.winHeading || 'You won!') : (T.loseHeading || 'Not this time'),
      sub: p && !p.win ? (p.description || '') : '',
      hideScore: true,
      score: wins,
      art: p ? (KIT.iconSrc(p.icon) || KIT.iconSrc('gift')) : '',
      reward: p && p.win ? { title: p.title || '', code: p.code || '', description: p.description || '' } : null,
      nextText: left <= 0 ? (T.comeBack || '') : '',
      againText: left <= 0 ? (T.comeBack || '') : (T.newCard || 'New card'),
      noMorePlays: left <= 0
    });
  }

  // ---------------------------------------------------------------- page setup & demo bot
  document.querySelectorAll('[data-sc]').forEach(function (n) {
    var v = sc[n.getAttribute('data-sc')];
    n.textContent = v || '';
    n.hidden = !v;
  });
  var calLink = document.querySelector('[data-calendar-link]');
  if (calLink) {
    calLink.hidden = B.crossLinks === false;
    var label = calLink.querySelector('span');
    if (label) label.textContent = (B.calendar && B.calendar.title) || label.textContent;
  }
  KIT.backdrop(document.getElementById('fx'), (B.calendar && B.calendar.effect) === 'snow' ? 'confetti' : (B.calendar && B.calendar.effect) || 'confetti');
  status(sc.subtitle || '');

  KIT.loop(function (dt) {
    if (!shell.demo || shell.screen() !== 'playing' || !prize || revealed) return;
    botT -= dt;
    if (botT <= 0) { botT = 99; card.autoScratch(1.6); }
  });
})();
