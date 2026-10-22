/*
 * shared/hub.js — builds the hub page (index.html) from brand.config.js → hub.
 * Edit texts, games and prizes in brand.config.js; no HTML changes needed.
 */
(function () {
  'use strict';

  var PA = window.PromoArcade;
  var B = PA.brand;
  var HUB = B.hub || {};
  var esc = PA.esc;
  var products = PA.products;
  var root = document.getElementById('hub');

  function productImg(i, cls, style) {
    var p = products[i % Math.max(1, products.length)];
    if (!p) return '';
    return PA.productHTML(p, cls || '').replace(/^<(img|span) /, '<$1 style="' + (style || '') + '" ');
  }

  function preview(id) {
    if (id === 'catch-rush') {
      var falling = '';
      for (var i = 0; i < 5; i++) {
        falling += productImg(i, '', 'left:' + (8 + i * 19) + '%;animation-delay:' + (-i * 0.55) + 's');
      }
      return '<div class="hub-preview pv-catch" aria-hidden="true">' + falling + '<span class="pv-cup"></span></div>';
    }
    if (id === 'memory-match') {
      var cards = '';
      for (var c = 0; c < 8; c++) cards += '<span>' + productImg(c % 4) + '</span>';
      return '<div class="hub-preview pv-memory" aria-hidden="true">' + cards + '</div>';
    }
    var segs = ((B.rewards || {})['spin-win'] || {}).segments || [];
    var step = 360 / Math.max(1, segs.length);
    var stops = segs.map(function (s, k) { return (s.color || PA.colors.primary) + ' ' + (k * step) + 'deg ' + ((k + 1) * step) + 'deg'; }).join(', ');
    return '<div class="hub-preview pv-wheel" aria-hidden="true"><span class="pv-disc" style="background:conic-gradient(' + stops + ')"></span><span class="pv-pin"></span></div>';
  }

  function gameCard(g) {
    var top = PA.topReward(g.id);
    return '<a class="hub-game" href="' + esc(g.id) + '/index.html">' + preview(g.id) +
      '<div class="hub-game-body">' +
      (g.tag ? '<span class="pa-kicker">' + esc(g.tag) + '</span>' : '') +
      '<h3>' + esc(g.title) + '</h3>' +
      '<p>' + esc(g.text || '') + '</p>' +
      (top ? '<p class="hub-upto">' + esc(PA.fill(HUB.upTo || 'Win up to {reward}', { reward: top.title })) + '</p>' : '') +
      '<span class="pa-btn pa-btn-primary pa-btn-small">' + esc(HUB.playText || 'Play') + '</span>' +
      '</div></a>';
  }

  function prizes() {
    var seen = {};
    var out = [];
    ['spin-win', 'catch-rush', 'memory-match'].forEach(function (id) {
      PA.tiers(id).forEach(function (r, i) {
        if (!r.title || seen[r.title]) return;
        seen[r.title] = true;
        var icon = r.icon ? PA.iconURL(r.icon) : (products[i % products.length] || {}).src;
        out.push('<span class="hub-prize">' + (icon ? '<img src="' + esc(icon) + '" alt="">' : '') + esc(r.title) + '</span>');
      });
    });
    return out.join('');
  }

  var orbit = '';
  var spots = [[39, 2], [74, 18], [74, 58], [39, 76], [4, 58], [4, 18]];
  for (var o = 0; o < spots.length && o < products.length; o++) {
    orbit += productImg(o, '', 'left:' + spots[o][0] + '%;top:' + spots[o][1] + '%;animation-delay:' + (-o * 0.8) + 's');
  }

  var cta = B.cta || {};
  var games = (HUB.games || []);
  var steps = (HUB.steps || []);

  root.innerHTML =
    '<header class="hub-header">' + PA.logoHTML(false) + (B.tagline ? '<p class="hub-tagline">' + esc(B.tagline) + '</p>' : '') + '</header>' +
    '<section class="hub-hero">' +
      '<div>' +
        (HUB.heroKicker ? '<span class="pa-kicker">' + esc(HUB.heroKicker) + '</span>' : '') +
        '<h1>' + esc(HUB.heroTitle || 'Play & Win') + '</h1>' +
        '<p>' + esc(HUB.heroText || '') + '</p>' +
        '<div class="hub-hero-actions">' +
          '<a class="pa-btn pa-btn-light" href="#games">' + esc(HUB.heroButton || 'Choose a game') + '</a>' +
          (cta.url ? '<a class="pa-btn pa-btn-secondary" data-action="cta" href="' + esc(cta.url) + '"' + (cta.newTab !== false ? ' target="_blank" rel="noopener"' : '') + '>' + esc(cta.text || 'Visit') + '</a>' : '') +
        '</div>' +
      '</div>' +
      '<div class="hub-orbit" aria-hidden="true"><span class="hub-plate"></span>' + orbit + '</div>' +
    '</section>' +
    '<section class="hub-section" id="games" aria-labelledby="games-h"><h2 id="games-h">' + esc(HUB.gamesTitle || 'Pick your game') + '</h2>' +
      '<div class="hub-games">' + games.map(gameCard).join('') + '</div></section>' +
    '<section class="hub-section" aria-labelledby="prizes-h"><h2 id="prizes-h">' + esc(HUB.prizesTitle || 'What you can win') + '</h2>' +
      '<div class="hub-prizes">' + prizes() + '</div></section>' +
    (steps.length ? '<section class="hub-section" aria-labelledby="steps-h"><h2 id="steps-h">' + esc(HUB.stepsTitle || 'How it works') + '</h2>' +
      '<ol class="hub-steps">' + steps.map(function (s) { return '<li><h3>' + esc(s.title) + '</h3><p>' + esc(s.text) + '</p></li>'; }).join('') + '</ol></section>' : '') +
    '<footer class="hub-footer">' + PA.footerHTML() + '</footer>';

  document.title = (HUB.heroTitle || 'Play & Win') + ' · ' + (B.name || '');
})();
