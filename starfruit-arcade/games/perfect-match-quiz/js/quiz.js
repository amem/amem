/*
 * js/quiz.js — Perfect Match Quiz engine.
 *
 * Personality quizzes add up answer points per outcome and show the best match with a
 * "your mix" breakdown; trivia quizzes count correct answers and pick a result tier.
 * Results can carry a coupon (with optional lead capture), a call-to-action and a
 * shareable 1080 × 1350 result image drawn on a canvas.
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
  var Q = KIT.extend({
    type: 'personality', title: 'Quiz', subtitle: '', allowBack: true, shuffleAnswers: false,
    timePerQuestion: 0, questions: [], outcomes: [], results: []
  }, B.quiz);
  var TRIVIA = Q.type === 'trivia';
  var QUESTIONS = (Q.questions || []).filter(function (q) { return q && q.answers && q.answers.length; });
  var N = QUESTIONS.length;
  var OUTCOMES = Q.outcomes && Q.outcomes.length ? Q.outcomes : [{ id: 'default', title: 'You did it!', description: '' }];
  var HEADING_FONT = getComputedStyle(document.documentElement).getPropertyValue('--f-heading') || 'sans-serif';

  var $ = function (id) { return document.getElementById(id); };
  var bar = $('qz-bar'), count = $('qz-count'), card = $('qz-card'), questionEl = $('qz-question');
  var qImage = $('qz-image'), answersEl = $('qz-answers'), backBtn = $('qz-back'), explainEl = $('qz-explain');
  var scoreChip = $('qz-score'), timerChip = $('qz-timer'), demoCard = $('qz-demo');

  var index = 0, picks = [], order = [], score = 0, locked = true, timeLeft = 0, lastResult = null;
  var timers = [];
  var botT = 0;

  function wait(sec, fn) { timers.push({ t: sec, fn: fn }); }
  function runTimers(dt) {
    var due = [];
    timers = timers.filter(function (tm) { tm.t -= dt; if (tm.t <= 0) { due.push(tm); return false; } return true; });
    due.forEach(function (tm) { tm.fn(); });
  }
  function shuffle(list) {
    for (var i = list.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = list[i]; list[i] = list[j]; list[j] = t;
    }
    return list;
  }
  function picture(item) {
    if (!item) return '';
    if (item.image) return KIT.asset(item.image);
    return KIT.iconSrc(item.icon);
  }

  var shell = KIT.game({
    id: 'perfect-match-quiz',
    title: Q.title,
    teaser: fmt(T.teaser || '{n} questions', { n: N }),
    art: OUTCOMES.slice(0, 3).map(picture).filter(Boolean),
    demoDelay: 3400,
    start: begin,
    stop: function () { locked = true; timers = []; },
    forceGameOver: function () { finish(); },
    score: function () { return TRIVIA ? score : picks.filter(function (p) { return p != null; }).length; },
    state: function () { return { question: index + 1, questions: N, answered: picks.filter(function (p) { return p != null; }).length, correct: score, type: Q.type }; },
    onKey: function (e, down) {
      if (!down) return;
      var k = parseInt(e.key, 10);
      if (k >= 1 && k <= 9) { e.preventDefault(); choose(k - 1); }
      else if (e.key === 'Backspace') { e.preventDefault(); goBack(); }
    },
    onAction: function (name, el) {
      if (name === 'answer') choose(parseInt(el.getAttribute('data-k'), 10));
      else if (name === 'back') goBack();
      else if (name === 'card') saveCard();
    },
    shareText: function (r, vars) {
      return fmt((B.share && B.share.text) || '{result} · {brand}', {
        result: lastResult ? lastResult.title : '', brand: vars.brand, score: score, total: N
      });
    }
  });

  // ---------------------------------------------------------------- flow
  function begin() {
    timers = [];
    index = 0;
    picks = [];
    score = 0;
    lastResult = null;
    locked = false;
    botT = 1.4;
    demoCard.classList.remove('is-on');
    order = QUESTIONS.map(function (q) {
      var o = q.answers.map(function (a, i) { return i; });
      return Q.shuffleAnswers ? shuffle(o) : o;
    });
    scoreChip.hidden = !TRIVIA;
    timerChip.hidden = !(TRIVIA && Q.timePerQuestion > 0);
    updateScore();
    showQuestion(0, '');
  }

  function showQuestion(i, dir) {
    index = i;
    var q = QUESTIONS[i];
    if (!q) return;
    count.textContent = fmt(T.questionOf || '{n} / {total}', { n: i + 1, total: N });
    bar.style.width = (i / N * 100) + '%';
    backBtn.hidden = !Q.allowBack || TRIVIA || i === 0;
    explainEl.textContent = '';
    explainEl.className = 'qz-explain';
    questionEl.textContent = q.text || '';
    var img = q.image ? KIT.asset(q.image) : '';
    qImage.hidden = !img;
    if (img) qImage.src = img;
    var withPics = q.answers.some(function (a) { return a.icon || a.image; });
    answersEl.className = 'qz-answers' + (withPics ? ' has-pics' : '') + (q.answers.length > 4 ? ' is-many' : '');
    answersEl.innerHTML = order[i].map(function (ai, k) {
      var a = q.answers[ai];
      var pic = picture(a);
      return '<button type="button" class="qz-answer' + (picks[i] === ai ? ' is-picked' : '') + '" data-action="answer" data-k="' + k + '">' +
        (pic ? '<img src="' + esc(pic) + '" alt="">' : '<span class="qz-key">' + (k + 1) + '</span>') +
        '<span class="qz-answer-text">' + esc(a.text || '') + '</span></button>';
    }).join('');
    card.classList.remove('enter-right', 'enter-left');
    void card.offsetWidth;
    if (dir) card.classList.add(dir === 'left' ? 'enter-left' : 'enter-right');
    timeLeft = Q.timePerQuestion || 0;
    updateTimer();
  }

  function choose(k) {
    if (locked || shell.screen() !== 'playing' || !shell.ready()) return;
    var q = QUESTIONS[index];
    var ai = order[index] && order[index][k];
    if (q == null || ai == null) return;
    var btn = answersEl.children[k];
    locked = true;
    picks[index] = ai;
    shell.hideHint();
    if (!shell.demo) KIT.hook('onAnswer', index, q.answers[ai]);
    Array.prototype.forEach.call(answersEl.children, function (b) { b.classList.remove('is-picked'); });
    btn.classList.add('is-picked');
    if (TRIVIA) {
      var ok = ai === q.correct;
      if (ok) {
        score++;
        btn.classList.add('is-right');
        KIT.sfx.match(score);
        var r = btn.getBoundingClientRect();
        KIT.confetti({ x: r.left + r.width / 2, y: r.top + r.height / 2, count: 26, power: 0.45 });
      } else {
        btn.classList.add('is-wrong');
        markCorrect(q);
        KIT.sfx.miss();
      }
      feedback(ok ? (T.correct || 'Correct!') : (T.wrong || 'Not quite'), q.explain, ok);
      updateScore();
      wait(q.explain ? 2 : 1.1, next);
    } else {
      KIT.sfx.catchItem(index + 2);
      bar.style.width = ((index + 1) / N * 100) + '%';
      wait(0.45, next);
    }
  }

  function markCorrect(q) {
    order[index].forEach(function (ai, k) { if (ai === q.correct) answersEl.children[k].classList.add('is-answer'); });
  }

  function feedback(head, explain, ok) {
    explainEl.className = 'qz-explain is-on ' + (ok ? 'is-ok' : 'is-bad');
    explainEl.innerHTML = '<b>' + esc(head) + '</b>' + (explain ? ' ' + esc(explain) : '');
  }

  function next() {
    if (index + 1 < N) { locked = false; showQuestion(index + 1, 'right'); }
    else finish();
  }

  function goBack() {
    if (locked || index === 0 || TRIVIA || !Q.allowBack || shell.screen() !== 'playing') return;
    KIT.sfx.tap();
    showQuestion(index - 1, 'left');
  }

  function updateScore() {
    scoreChip.querySelector('span').textContent = score + ' / ' + N;
  }
  function updateTimer() {
    if (timerChip.hidden) return;
    var s = Math.max(0, Math.ceil(timeLeft));
    timerChip.querySelector('span').textContent = s;
    timerChip.classList.toggle('is-urgent', s <= 5 && !locked);
  }

  // ---------------------------------------------------------------- results
  function personalityResult() {
    var tally = {};
    OUTCOMES.forEach(function (o) { tally[o.id] = 0; });
    picks.forEach(function (ai, qi) {
      if (ai == null) return;
      var pts = QUESTIONS[qi].answers[ai].points || {};
      Object.keys(pts).forEach(function (id) { if (id in tally) tally[id] += Number(pts[id]) || 0; });
    });
    var best = OUTCOMES[0];
    OUTCOMES.forEach(function (o) { if (tally[o.id] > tally[best.id]) best = o; });
    var total = 0;
    Object.keys(tally).forEach(function (id) { total += tally[id]; });
    var mixList = OUTCOMES.map(function (o) { return { title: o.title, pct: total ? Math.round(tally[o.id] / total * 100) : 0 }; })
      .sort(function (a, b) { return b.pct - a.pct; });
    return { item: best, title: best.title, description: best.description, product: best.product, reward: best.reward, cta: best.cta, mix: total ? mixList : [] };
  }

  function triviaResult() {
    var list = (Q.results || []).slice().sort(function (a, b) { return (a.min || 0) - (b.min || 0); });
    var r = null, next = null;
    list.forEach(function (t) { if (score >= (t.min || 0)) r = t; });
    list.forEach(function (t) { if (!next && score < (t.min || 0) && t.reward) next = t; });
    r = r || { title: fmt(T.scoreLine || '{score}/{total}', { score: score, total: N }), description: '' };
    return { item: r, title: r.title, description: r.description, reward: r.reward, cta: r.cta, next: next };
  }

  function finish() {
    var screen = shell.screen();
    if (screen !== 'playing' && screen !== 'paused') return;
    locked = true;
    timers = [];
    bar.style.width = '100%';
    var r = TRIVIA ? triviaResult() : personalityResult();
    lastResult = r;
    if (!shell.demo) KIT.hook('onResult', r.item);
    if (shell.demo) showDemoCard(r);
    shell.end({
      heading: r.title,
      sub: r.description || '',
      art: picture(r.item) || KIT.iconSrc('star'),
      hideScore: true,
      score: TRIVIA ? score : 0,
      reward: r.reward && r.reward.title ? { title: r.reward.title, code: r.reward.code || '', description: r.reward.description || '' } : null,
      leadExtra: { result: r.title },
      nextText: r.next ? fmt(T.nextTrivia || '', { min: r.next.min, title: r.next.reward.title }) : '',
      againText: T.playAgain
    });
    if (!shell.demo) decorateResult(r);
  }

  function decorateResult(r) {
    var kicker = $('qz-result-kicker');
    kicker.textContent = TRIVIA ? fmt(T.scoreLine || '', { score: score, total: N }) : (T.resultKicker || '');
    var product = $('qz-result-product');
    product.hidden = !r.product;
    product.innerHTML = r.product ? '<span>' + esc(T.yourMatch || '') + '</span> <b>' + esc(r.product) + '</b>' : '';
    var mixEl = $('qz-mix');
    mixEl.hidden = !(r.mix && r.mix.length > 1);
    if (r.mix) {
      mixEl.innerHTML = '<p class="qz-mix-title">' + esc(T.matchBreakdown || '') + '</p>' + r.mix.slice(0, 4).map(function (m, i) {
        return '<div class="qz-mix-row' + (i === 0 ? ' is-top' : '') + '"><span class="qz-mix-name">' + esc(m.title) + '</span>' +
          '<span class="qz-mix-track"><span class="qz-mix-fill" style="--w:' + m.pct + '%;--i:' + i + '"></span></span>' +
          '<span class="qz-mix-pct">' + m.pct + '%</span></div>';
      }).join('');
    }
    var cta = document.querySelector('#screen-over [data-cta]');
    var c = r.cta && r.cta.url ? r.cta : (B.cta || {});
    if (cta) {
      cta.hidden = !c.url;
      if (c.url) { cta.href = c.url; cta.textContent = c.text || 'Shop now'; }
    }
    $('qz-save').hidden = !(B.share && B.share.image !== false);
  }

  function showDemoCard(r) {
    var pic = picture(r.item);
    demoCard.innerHTML = (pic ? '<img src="' + esc(pic) + '" alt="">' : '') +
      '<p class="qz-demo-kicker">' + esc(TRIVIA ? fmt(T.scoreLine || '', { score: score, total: N }) : (T.resultKicker || '')) + '</p>' +
      '<p class="qz-demo-title">' + esc(r.title) + '</p>' +
      (r.reward && r.reward.title ? '<p class="qz-demo-reward">' + esc(r.reward.title) + '</p>' : '');
    demoCard.classList.add('is-on');
    var rect = demoCard.getBoundingClientRect();
    KIT.confetti({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 3, count: 90 });
  }

  // ---------------------------------------------------------------- result image
  function wrapText(g, text, maxW) {
    var words = String(text).split(' '), lines = [], line = '';
    words.forEach(function (w) {
      var t = line ? line + ' ' + w : w;
      if (g.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t;
    });
    if (line) lines.push(line);
    return lines;
  }

  function drawCard(withImages) {
    var W = 1080, H = 1350;
    var c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    var g = c.getContext('2d');
    var bg = g.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, C.deep);
    bg.addColorStop(1, mix(C.deep, C.primary, 0.45));
    g.fillStyle = bg;
    g.fillRect(0, 0, W, H);
    [[160, 180, 260, C.primary], [940, 300, 220, C.secondary], [880, 1180, 300, C.accent]].forEach(function (b) {
      g.globalAlpha = 0.22;
      g.fillStyle = b[3];
      g.beginPath(); g.arc(b[0], b[1], b[2], 0, Math.PI * 2); g.fill();
    });
    g.globalAlpha = 1;
    var onDeep = KIT.color.onColor(C.deep);
    g.textAlign = 'center';
    g.textBaseline = 'alphabetic';
    g.fillStyle = onDeep;
    g.font = '800 52px ' + HEADING_FONT;
    g.fillText(B.name || '', W / 2, 130);
    g.globalAlpha = 0.8;
    g.font = '600 34px ' + HEADING_FONT;
    g.fillText(Q.title || '', W / 2, 190);
    g.globalAlpha = 1;
    // Result card.
    var x = 90, y = 250, w = W - 180, h = 860;
    g.fillStyle = C.surface;
    g.beginPath();
    if (g.roundRect) g.roundRect(x, y, w, h, 56); else g.rect(x, y, w, h);
    g.fill();
    var r = lastResult || { title: '', item: null };
    var img = withImages ? KIT.image(picture(r.item)) : null;
    if (img && img.complete && img.naturalWidth) g.drawImage(img, W / 2 - 170, y + 60, 340, 340);
    else {
      g.fillStyle = C.accent;
      g.beginPath(); g.arc(W / 2, y + 230, 150, 0, Math.PI * 2); g.fill();
    }
    g.fillStyle = mix(C.text, C.surface, 0.4);
    g.font = '700 40px ' + HEADING_FONT;
    g.fillText(TRIVIA ? fmt(T.scoreLine || '', { score: score, total: N }) : (T.resultKicker || ''), W / 2, y + 470);
    g.fillStyle = C.primary;
    var size = 104;
    g.font = '800 ' + size + 'px ' + HEADING_FONT;
    var lines = wrapText(g, r.title, w - 100);
    while (lines.length > 2 && size > 60) { size -= 8; g.font = '800 ' + size + 'px ' + HEADING_FONT; lines = wrapText(g, r.title, w - 100); }
    lines.slice(0, 2).forEach(function (l, i) { g.fillText(l, W / 2, y + 590 + i * size * 1.05); });
    if (r.product) {
      g.fillStyle = C.text;
      g.font = '600 40px ' + HEADING_FONT;
      g.fillText(r.product, W / 2, y + h - 90);
    }
    // Call to action.
    g.fillStyle = C.accent;
    g.beginPath();
    if (g.roundRect) g.roundRect(W / 2 - 300, 1170, 600, 100, 50); else g.rect(W / 2 - 300, 1170, 600, 100);
    g.fill();
    g.fillStyle = KIT.color.onColor(C.accent, C.text);
    g.font = '800 44px ' + HEADING_FONT;
    g.fillText((T.takeQuiz || 'Take the quiz') + ' →', W / 2, 1236);
    return c;
  }

  function saveCard() {
    if (!lastResult) return;
    var c = drawCard(true);
    var send = function (blob) {
      if (!blob) return;
      var name = String(lastResult.title || 'result').toLowerCase().replace(/[^a-z0-9]+/g, '-') + '.png';
      var file = null;
      try { file = new File([blob], name, { type: 'image/png' }); } catch (e) { file = null; }
      if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
        navigator.share({ files: [file], title: B.name || '', text: lastResult.title }).catch(function () {});
        return;
      }
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
      KIT.toast(T.cardSaved || 'Saved');
    };
    try {
      c.toBlob(send, 'image/png');
    } catch (e) {
      // Some browsers refuse to export a canvas with SVG images: draw it again without them.
      drawCard(false).toBlob(send, 'image/png');
    }
  }

  // ---------------------------------------------------------------- loop, demo bot, page setup
  KIT.loop(function (dt) {
    var screen = shell.screen();
    if (screen !== 'playing') return;
    runTimers(dt);
    if (TRIVIA && Q.timePerQuestion > 0 && !locked) {
      timeLeft -= dt;
      updateTimer();
      if (timeLeft <= 0) {
        locked = true;
        picks[index] = null;
        markCorrect(QUESTIONS[index]);
        feedback(T.timeUp || "Time's up!", QUESTIONS[index].explain, false);
        KIT.sfx.miss();
        wait(QUESTIONS[index].explain ? 2 : 1.2, next);
      }
    }
    if (shell.demo && !locked) {
      botT -= dt;
      if (botT <= 0) {
        botT = 1.1;
        var q = QUESTIONS[index];
        var k = TRIVIA && Math.random() < 0.75 ? order[index].indexOf(q.correct) : Math.floor(Math.random() * q.answers.length);
        choose(Math.max(0, k));
      }
    }
  });

  document.querySelectorAll('[data-quiz]').forEach(function (n) {
    var v = Q[n.getAttribute('data-quiz')];
    n.textContent = v || '';
    n.hidden = !v;
  });
  var deco = document.querySelector('[data-deco]');
  if (deco) {
    var pics = OUTCOMES.map(picture).filter(Boolean);
    deco.innerHTML = [0, 1, 2, 3, 4, 5].map(function (i) {
      return pics.length ? '<img class="qz-float f' + i + '" src="' + esc(pics[i % pics.length]) + '" alt="">' : '';
    }).join('');
  }
  OUTCOMES.concat(Q.results || []).forEach(function (o) { var src = picture(o); if (src) KIT.image(src); });
  if (!N) { questionEl.textContent = 'Add questions in config.js → quiz.questions'; }
})();
