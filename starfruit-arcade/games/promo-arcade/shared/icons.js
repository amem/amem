/*
 * shared/icons.js — built-in flat product icons (hand-authored SVG, 64 × 64).
 * Used by brand.config.js → products[].icon and logoIcon. They render the same on
 * every device (unlike emoji) and are drawn as images in the games.
 *
 * Add your own: put the inner SVG markup of a 64 × 64 drawing under a new key below,
 * then use that key in brand.config.js.
 */
(function () {
  'use strict';
  var PA = window.PromoArcade = window.PromoArcade || {};

  var HI = 'fill="#fff" opacity=".38"';

  var S = {
    // ---- Fruit (default demo brand) ----
    strawberry:
      '<path d="M32 59C19 52 9.5 40 10 27c.3-7.6 6.4-11.6 13-11 3.4.3 6.4 1.6 9 3.6 2.6-2 5.6-3.3 9-3.6 6.6-.6 12.7 3.4 13 11 .5 13-9 25-22 32z" fill="#f2364a"/>' +
      '<path d="M54 27c.5 13-9 25-22 32-6-3.3-11.3-7.7-15-12.6 5 3.3 10.6 4.6 15 2.6 11-5 20-14 22-22z" fill="#c4213a" opacity=".45"/>' +
      '<g fill="#ffe27a"><ellipse cx="21" cy="30" rx="1.5" ry="2.3"/><ellipse cx="32" cy="28" rx="1.5" ry="2.3"/><ellipse cx="43" cy="30" rx="1.5" ry="2.3"/><ellipse cx="26" cy="39" rx="1.5" ry="2.3"/><ellipse cx="38" cy="39" rx="1.5" ry="2.3"/><ellipse cx="32" cy="48" rx="1.5" ry="2.3"/><ellipse cx="20" cy="40" rx="1.3" ry="2"/><ellipse cx="44" cy="40" rx="1.3" ry="2"/></g>' +
      '<path d="M16 29c0-4 2.4-7 6-8" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".5"/>' +
      '<path d="M32 22c-3-5-10-7.5-15-4.5 4 .8 7 2.6 8.5 5-5.2 0-9.3 2.2-10.5 6.2 5.4-2.4 11.4-2.7 17-1.4 5.6-1.3 11.6-1 17 1.4-1.2-4-5.3-6.2-10.5-6.2 1.5-2.4 4.5-4.2 8.5-5-5-3-12-.5-15 4.5z" fill="#2fae5f"/>' +
      '<path d="M32 21c-.2-5 1.2-9.4 4.5-12.5" fill="none" stroke="#23884a" stroke-width="3" stroke-linecap="round"/>',

    pineapple:
      '<defs><clipPath id="c"><ellipse cx="32" cy="43" rx="15" ry="18"/></clipPath></defs>' +
      '<path d="M32 27 23 7l7.5 8.5L32 3l1.5 12.5L41 7z" fill="#2fae5f"/>' +
      '<path d="M32 27c-5.5-5-12.5-6-17.5-3.2 5 .3 9.5 1.6 13 4.2zM32 27c5.5-5 12.5-6 17.5-3.2-5 .3-9.5 1.6-13 4.2z" fill="#23884a"/>' +
      '<ellipse cx="32" cy="43" rx="15" ry="18" fill="#ffb81f"/>' +
      '<g clip-path="url(#c)"><path d="M38 25c6 3 10 10 10 18s-4 15-10 18c8 0 13-8 13-18s-5-18-13-18z" fill="#e48b0c" opacity=".55"/>' +
      '<g stroke="#c9770a" stroke-width="1.7" opacity=".75" fill="none"><path d="M10 30l34 34M10 40l26 26M16 24l36 36M24 22l30 30M32 22l24 24"/><path d="M54 30 20 64M54 40 28 66M48 24 12 60M40 22 10 52M32 22 8 46"/></g></g>' +
      '<ellipse cx="25" cy="37" rx="3" ry="6.5" ' + HI + '/>',

    mango:
      '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffd43a"/><stop offset=".55" stop-color="#ff9a1f"/><stop offset="1" stop-color="#ff4f3a"/></linearGradient></defs>' +
      '<path d="M13 39c0-14 11.5-25 25-25 9 0 14.5 6 14.5 14.5C52.5 45 39 59 25 59c-7.5 0-12-6.5-12-20z" fill="url(#g)"/>' +
      '<path d="M52.5 28.5C52.5 45 39 59 25 59c-4 0-7-2-9-6 14 4 31-8 36-27z" fill="#d93a2a" opacity=".35"/>' +
      '<path d="M38 15c1.6-5.4 7.6-9 14.5-8-1.8 5.6-7.6 8.8-14.5 8z" fill="#2fae5f"/>' +
      '<path d="M37.5 15.5c-1-3-1-5.3.3-7.5" fill="none" stroke="#7a4a1c" stroke-width="2.6" stroke-linecap="round"/>' +
      '<path d="M19 36c1-6.5 5.4-11.6 11.5-13.5" fill="none" stroke="#fff" stroke-width="3.6" stroke-linecap="round" opacity=".5"/>',

    banana:
      '<path d="M9 19c3.5 23 22 36 45 29.5 3.2-.9 3.2-4.5 0-5.4C35.5 46 22 37 17.5 18.5 16.6 15 9 15 9 19z" fill="#ffd93b"/>' +
      '<path d="M54 43.1c3.2.9 3.2 4.5 0 5.4-15 4.3-28.4.4-37-8.8 10 5.7 23 6.9 37 3.4z" fill="#eab01a"/>' +
      '<path d="M14.5 21c2.2 9.5 7.3 17.4 14.4 22.3" fill="none" stroke="#fff6b8" stroke-width="3" stroke-linecap="round" opacity=".8"/>' +
      '<path d="M9.2 19.5C8.3 15 9.8 11.6 13.3 11l2.2 6.8z" fill="#6b4a1c"/>' +
      '<circle cx="56" cy="45.8" r="2.3" fill="#6b4a1c"/>',

    kiwi:
      '<circle cx="32" cy="32" r="26" fill="#8a5a2b"/>' +
      '<circle cx="32" cy="32" r="22.5" fill="#7cc242"/>' +
      '<circle cx="32" cy="32" r="16" fill="#9bd65a"/>' +
      '<g stroke="#c4ec8a" stroke-width="1.2" opacity=".8"><path d="M32 15v8M32 41v8M15 32h8M41 32h8M20 20l5.5 5.5M38.5 38.5 44 44M44 20l-5.5 5.5M25.5 38.5 20 44"/></g>' +
      '<ellipse cx="32" cy="32" rx="7.5" ry="6.5" fill="#f2f6d6"/>' +
      '<g fill="#2b2b1a">' +
      [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map(function (a) {
        return '<ellipse cx="32" cy="20.5" rx="1.4" ry="2.4" transform="rotate(' + a + ' 32 32)"/>';
      }).join('') +
      '</g>' +
      '<path d="M15 24a19 19 0 0 1 10-9" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".4"/>',

    watermelon:
      '<g transform="rotate(-14 32 34)">' +
      '<path d="M5 22h54c0 17.5-12 32-27 32S5 39.5 5 22z" fill="#2fae5f"/>' +
      '<path d="M9 22h46c0 14.5-10.3 27-23 27S9 36.5 9 22z" fill="#e6f6cf"/>' +
      '<path d="M12.5 22h39c0 12.3-8.7 23-19.5 23S12.5 34.3 12.5 22z" fill="#ff4f62"/>' +
      '<path d="M51.5 22c0 12.3-8.7 23-19.5 23 8-4 14-12 15-23z" fill="#e33a50" opacity=".6"/>' +
      '<g fill="#2b1708"><ellipse cx="22" cy="28" rx="1.6" ry="2.5"/><ellipse cx="32" cy="27" rx="1.6" ry="2.5"/><ellipse cx="42" cy="28" rx="1.6" ry="2.5"/><ellipse cx="27" cy="35" rx="1.6" ry="2.5"/><ellipse cx="37" cy="35" rx="1.6" ry="2.5"/><ellipse cx="32" cy="41" rx="1.5" ry="2.3"/></g>' +
      '<path d="M16 25c1 5 3.2 9 6.4 12" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" opacity=".45"/>' +
      '</g>',

    coconut:
      '<circle cx="32" cy="35" r="24" fill="#7a4a24"/>' +
      '<path d="M56 35c0 13.3-10.7 24-24 24-8 0-15-3.9-19.4-9.9C17 53 23 55 30 55c13 0 23-9 24-21z" fill="#5a3418"/>' +
      '<ellipse cx="32" cy="30" rx="20" ry="15" fill="#fffaf0"/>' +
      '<ellipse cx="32" cy="31" rx="15.5" ry="11" fill="#f1e6cf"/>' +
      '<g stroke="#4a2a12" stroke-width="1.6" stroke-linecap="round" opacity=".55"><path d="M14 47l4-2M21 53l2.5-3M43 53l-2.5-3M50 47l-4-2M32 57.5v-4"/></g>' +
      '<ellipse cx="24" cy="26" rx="6" ry="3" fill="#fff"/>',

    blueberry:
      '<circle cx="21" cy="40" r="13" fill="#4a64d1"/>' +
      '<circle cx="43" cy="40" r="13" fill="#3a52bd"/>' +
      '<circle cx="32" cy="25" r="13.5" fill="#5b79e6"/>' +
      '<g fill="#22357f"><path d="M32 17.5l1.8 2.6 3-.2-1.6 2.6 1.4 2.8-3-.8-1.6 2.5-1.6-2.5-3 .8 1.4-2.8-1.6-2.6 3 .2z" transform="translate(0 -1)"/><circle cx="21" cy="40" r="2.4"/><circle cx="43" cy="40" r="2.4"/></g>' +
      '<ellipse cx="26" cy="20" rx="3.5" ry="2.2" ' + HI + '/><ellipse cx="15.5" cy="35" rx="3" ry="2" ' + HI + '/><ellipse cx="37.5" cy="35" rx="3" ry="2" ' + HI + '/>' +
      '<path d="M40 13c3.5-5 9.5-6.5 14-4.5-3 4.5-8.5 6.4-14 4.5z" fill="#2fae5f"/>',

    // ---- Café, food & retail (for other brands) ----
    coffee:
      '<ellipse cx="30" cy="55" rx="23" ry="5.5" fill="#d9cbb8"/>' +
      '<path d="M48 31h3.5a7.5 7.5 0 0 1 0 15H46" fill="none" stroke="#efe6da" stroke-width="5"/>' +
      '<path d="M11 26h38v14c0 9.4-7.6 15-19 15S11 49.4 11 40z" fill="#fff"/>' +
      '<path d="M49 26v14c0 9.4-7.6 15-19 15 8-2.5 13-8 13-15V26z" fill="#e8dfd2"/>' +
      '<ellipse cx="30" cy="26" rx="19" ry="5" fill="#6b3d1e"/>' +
      '<path d="M30 29c-3.2-2-5.3-3.6-3.6-5.2 1-1 2.6-.6 3.6.6 1-1.2 2.6-1.6 3.6-.6 1.7 1.6-.4 3.2-3.6 5.2z" fill="#e0ad73"/>' +
      '<path d="M23 18c-3-3 3-5.5 0-9M31 17c-3-3 3-5.5 0-9M39 18c-3-3 3-5.5 0-9" fill="none" stroke="#c8b8a6" stroke-width="2.6" stroke-linecap="round"/>',

    donut:
      '<path fill-rule="evenodd" d="M8 34a24 22 0 1 0 48 0 24 22 0 1 0-48 0zM25 32a7 5.5 0 1 0 14 0 7 5.5 0 1 0-14 0z" fill="#e0a05a"/>' +
      '<path fill-rule="evenodd" d="M10 31c0-10 9.8-18 22-18s22 8 22 18c0 3-1.6 5-3.6 4.2-2.8-1-3.3 3.6-6.6 2.8-3.2-.8-2.8-4.8-6.4-3-3 1.6-3.6 5.6-7.6 4.4-3.4-1-2-5.2-5.6-4.6-3.4.6-3.8 3.8-6.6 1.4C11.4 34.8 10 33.4 10 31zM25 32a7 5.5 0 1 0 14 0 7 5.5 0 1 0-14 0z" fill="#ff7eb6"/>' +
      '<g stroke-width="2.6" stroke-linecap="round"><path d="M18 24l3-2" stroke="#ffd23a"/><path d="M27 19l3.4 1" stroke="#4fd1c5"/><path d="M38 19l2.6 2.4" stroke="#fff"/><path d="M45 25l3.4.6" stroke="#ffd23a"/><path d="M16 31l1 3" stroke="#fff"/><path d="M45 32l2.6-2" stroke="#4fd1c5"/><path d="M33 40l3 1" stroke="#ffd23a"/></g>' +
      '<path d="M15 26c2-4 6-7 11-8.4" fill="none" stroke="#fff" stroke-width="2.8" stroke-linecap="round" opacity=".55"/>',

    cupcake:
      '<path d="M13 34h38l-5 24H18z" fill="#4fb3e8"/>' +
      '<g stroke="#2f8fc4" stroke-width="2.6"><path d="M22 34l2.4 24M32 34v24M42 34l-2.4 24"/></g>' +
      '<path d="M11 36c-4-6.5 1.4-12 7-11 0-7.5 7.6-11.5 14-9.4 5.4-5 16-2 16 6.4 6.6 0 9.6 7.6 5 14z" fill="#ffb3d1"/>' +
      '<path d="M53 36H11c-1-1.6-1.5-3.2-1.4-4.7C16 34 44 34 54.3 31.5c.3 1.5-.2 3-1.3 4.5z" fill="#ff8fbf"/>' +
      '<g stroke-width="2.4" stroke-linecap="round"><path d="M20 27l2.6-1.6" stroke="#ffd23a"/><path d="M30 22l3 .6" stroke="#4fd1c5"/><path d="M40 26l2 2.4" stroke="#fff"/><path d="M45 31l2.6-.4" stroke="#ffd23a"/></g>' +
      '<path d="M33 15c.4-3.6 2-6 5-7.4" fill="none" stroke="#2fae5f" stroke-width="2.4" stroke-linecap="round"/>' +
      '<circle cx="33" cy="15" r="5" fill="#f2364a"/><circle cx="31.4" cy="13.4" r="1.4" fill="#fff" opacity=".6"/>',

    icecream:
      '<path d="M19 32h26L32 61z" fill="#e8a65a"/>' +
      '<g stroke="#c47f34" stroke-width="1.8" opacity=".8"><path d="M24 35l14 14M33 34l9 9M22 41l12 12M40 35 27 48M44 37 30 55M31 34 24 41"/></g>' +
      '<circle cx="24" cy="27" r="10.5" fill="#ff9cc5"/>' +
      '<circle cx="40" cy="27" r="10.5" fill="#8fe0c0"/>' +
      '<circle cx="32" cy="16" r="10.5" fill="#fff0bd"/>' +
      '<path d="M15 30c3 3 6 1 9 3s6-1 9 1.5 6-1 8.5 1 6-1 8-3.5" fill="none" stroke="#fff" stroke-width="2" opacity=".5"/>' +
      '<ellipse cx="28" cy="12" rx="3" ry="2" ' + HI + '/>' +
      '<circle cx="32" cy="5.5" r="3.6" fill="#f2364a"/>',

    pizza:
      '<path d="M32 61 7.5 15c15.6-8.4 33.4-8.4 49 0z" fill="#ffcf5a"/>' +
      '<path d="M32 61 56.5 15c-3-1.6-6-2.9-9-3.9z" fill="#f5b53c" opacity=".7"/>' +
      '<path d="M7.5 15c15.6-8.4 33.4-8.4 49 0l-2.6 5.4c-14-7.4-29.8-7.4-43.8 0z" fill="#d98b3a"/>' +
      '<g fill="#e0452f"><circle cx="24" cy="26" r="5"/><circle cx="40" cy="27" r="4.6"/><circle cx="31" cy="40" r="4.4"/></g>' +
      '<g fill="#b8321f" opacity=".5"><circle cx="23" cy="25" r="1.2"/><circle cx="41" cy="26" r="1.2"/><circle cx="30" cy="41" r="1.2"/></g>' +
      '<g fill="none" stroke="#2fae5f" stroke-width="2.4" stroke-linecap="round"><path d="M34 22l3 2M26 35l-2 3M37 48l-1.6 2.6"/></g>',

    burger:
      '<path d="M8 30C8 17.8 18.7 9 32 9s24 8.8 24 21z" fill="#f2a64a"/>' +
      '<path d="M56 30H8c0-2 .3-4 .9-5.8C14 27 50 27 55.1 24.2c.6 1.8.9 3.8.9 5.8z" fill="#de8a2e"/>' +
      '<g fill="#fff3d6"><ellipse cx="22" cy="18" rx="2" ry="1.2" transform="rotate(-20 22 18)"/><ellipse cx="32" cy="15" rx="2" ry="1.2"/><ellipse cx="42" cy="18" rx="2" ry="1.2" transform="rotate(20 42 18)"/><ellipse cx="27" cy="23" rx="2" ry="1.2"/><ellipse cx="38" cy="23" rx="2" ry="1.2"/></g>' +
      '<path d="M6 31c3.2 3.6 6.4-1.2 9.6 2.2s6.4-1.2 9.6 2.2 6.4-1.2 9.6 2.2 6.4-1.2 9.6 2.2 6.4-1.2 9.6 2.2V29H6z" fill="#5cc45a"/>' +
      '<path d="M9 35h46l-8 6.5-6-4.2-7 5.2-6-5.2-7 5.2-6-5.2z" fill="#ffd23a"/>' +
      '<rect x="8" y="39" width="48" height="8.5" rx="4.2" fill="#7a3f1e"/>' +
      '<path d="M9 47h46v3.5a6 6 0 0 1-6 6H15a6 6 0 0 1-6-6z" fill="#e8963a"/>' +
      '<ellipse cx="20" cy="17" rx="5" ry="2.4" transform="rotate(-24 20 17)" ' + HI + '/>',

    gift:
      '<rect x="10" y="28" width="44" height="28" rx="3" fill="#ff5b6e"/>' +
      '<rect x="10" y="28" width="44" height="7" fill="#e0405a" opacity=".6"/>' +
      '<rect x="7" y="20" width="50" height="11" rx="3" fill="#ff7a8a"/>' +
      '<rect x="28" y="20" width="8" height="36" fill="#ffd23a"/>' +
      '<path d="M32 20c-4-8-14-10.5-15.4-4.4C15.4 21 26 21.3 32 20zM32 20c4-8 14-10.5 15.4-4.4C48.6 21 38 21.3 32 20z" fill="#ffd23a" stroke="#e8a600" stroke-width="2" stroke-linejoin="round"/>' +
      '<rect x="12" y="22" width="12" height="3" rx="1.5" ' + HI + '/>',

    bag:
      '<path d="M23 25v-6a9 9 0 0 1 18 0v6" fill="none" stroke="#5b37c9" stroke-width="3.6" stroke-linecap="round"/>' +
      '<path d="M11 22h42l-3 35H14z" fill="#8a5cf6"/>' +
      '<path d="M53 22l-3 35H38l3-35z" fill="#7246e0" opacity=".7"/>' +
      '<circle cx="23" cy="29" r="2.2" fill="#3c2496"/><circle cx="41" cy="29" r="2.2" fill="#3c2496"/>' +
      '<path d="M32 49s-8-4.6-8-10c0-2.6 2-4.5 4.3-4.5 1.7 0 3 1 3.7 2.3.7-1.3 2-2.3 3.7-2.3 2.3 0 4.3 1.9 4.3 4.5 0 5.4-8 10-8 10z" fill="#fff"/>',

    heart:
      '<path d="M32 57S7 42.5 7 24.5C7 16 13.3 10 20.6 10c5 0 9.2 2.8 11.4 7 2.2-4.2 6.4-7 11.4-7C50.7 10 57 16 57 24.5 57 42.5 32 57 32 57z" fill="#ff4f7a"/>' +
      '<path d="M57 24.5C57 42.5 32 57 32 57s-9-5.2-16.5-13.4C24 48 30 50 32 50c10-6 22-14 25-25.5z" fill="#e0315f" opacity=".5"/>' +
      '<ellipse cx="19" cy="22" rx="5" ry="7" transform="rotate(35 19 22)" ' + HI + '/>',

    diamond:
      '<path d="M17 11h30l11 15-26 31L6 26z" fill="#5fd3f3"/>' +
      '<path d="M6 26h52L32 57z" fill="#36b8e0"/>' +
      '<path d="M17 11l6 15h18l6-15z" fill="#9be7fb"/>' +
      '<path d="M23 26l9 31 9-31z" fill="#7bdcf6"/>' +
      '<path d="M17 11 6 26h17zM47 11l11 15H41z" fill="#86e1f8"/>' +
      '<path d="M20 14l-5 7" stroke="#fff" stroke-width="2.6" stroke-linecap="round" opacity=".8"/>',

    // ---- Game items ----
    star:
      '<path d="M32 5.5l8 16.2 17.9 2.6-13 12.6 3.1 17.8L32 46.3 16 54.7l3.1-17.8-13-12.6 17.9-2.6z" fill="#ffc928" stroke="#eb9b00" stroke-width="3" stroke-linejoin="round"/>' +
      '<path d="M32 13.5l5.4 11 10.4 1.5" fill="none" stroke="#fff6c2" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<circle cx="26.5" cy="33" r="2.3" fill="#7a4a00"/><circle cx="37.5" cy="33" r="2.3" fill="#7a4a00"/>' +
      '<path d="M28 39c2.4 2.2 5.6 2.2 8 0" fill="none" stroke="#7a4a00" stroke-width="2.2" stroke-linecap="round"/>',

    bomb:
      '<circle cx="28" cy="39" r="20" fill="#2a2d3a"/>' +
      '<path d="M48 39c0 11-9 20-20 20-7.5 0-14-4-17.4-10.2C15 53 21 55 26 55c11 0 20-8 20-19 0-2.6-.5-5-1.4-7.3C46.8 31.6 48 35.2 48 39z" fill="#1a1c26"/>' +
      '<rect x="31" y="14.5" width="11" height="9" rx="2" transform="rotate(35 36.5 19)" fill="#4a4f63"/>' +
      '<path d="M40 15c3-6 8.5-7.4 12.5-4.4" fill="none" stroke="#a07a40" stroke-width="3" stroke-linecap="round"/>' +
      '<path d="M54 3.5l2 5 5.3 1-4.2 3.4 1 5.3-4.1-3.1-4.4 3 1.2-5.2-4.1-3.5 5.3-.8z" fill="#ff9a1c"/>' +
      '<circle cx="54.6" cy="10.4" r="2.4" fill="#fff2a8"/>' +
      '<ellipse cx="20" cy="31" rx="5" ry="7.5" transform="rotate(35 20 31)" fill="#fff" opacity=".22"/>',

    rotten:
      '<path d="M32 19c-10.5-6.5-25 .2-23 16.5C10.8 50 21 60 32 58c11 2 21.2-8 23-22.5C57 19.2 42.5 12.5 32 19z" fill="#8c9a3c"/>' +
      '<path d="M55 35.5C53.2 50 43 60 32 58c-6 1-11.6-1.6-15.8-6.2C21 54 27 55 32 54c11 1 19-8 21-21 1 .8 1.6 1.7 2 2.5z" fill="#6b7a26" opacity=".7"/>' +
      '<g fill="#5b6020" opacity=".85"><circle cx="18" cy="33" r="4"/><circle cx="45" cy="45" r="5"/><circle cx="44" cy="28" r="2.6"/><circle cx="24" cy="50" r="2.4"/></g>' +
      '<path d="M32 19c0-4.5 1-7.6 4-10" fill="none" stroke="#4a3518" stroke-width="3" stroke-linecap="round"/>' +
      '<g stroke="#2b2a12" stroke-width="2.4" stroke-linecap="round"><path d="M23.5 33.5l5 5M28.5 33.5l-5 5M35.5 33.5l5 5M40.5 33.5l-5 5"/></g>' +
      '<path d="M25 47c2.4-2.4 4.6 1.2 7-1.2s4.6 1.2 7-1.2" fill="none" stroke="#2b2a12" stroke-width="2.4" stroke-linecap="round"/>' +
      '<g fill="none" stroke="#9cb33f" stroke-width="2.4" stroke-linecap="round"><path d="M12 15c-3-3 3-5 0-8.5M52 15c-3-3 3-5 0-8.5"/></g>',

    cup:
      '<path d="M37 15 43.5 2.5" stroke="#13a874" stroke-width="4.5" stroke-linecap="round"/>' +
      '<path d="M13 23c0-8.5 8.5-14 19-14s19 5.5 19 14z" fill="#fff" opacity=".92"/>' +
      '<path d="M15.5 22.5c4-3.5 9-4.6 16.5-4.6s12.5 1.1 16.5 4.6z" fill="#ffb08f"/>' +
      '<rect x="10" y="21.5" width="44" height="6.5" rx="3.2" fill="#f2ebe2"/>' +
      '<path d="M13 28h38l-4.2 28.6A4.5 4.5 0 0 1 42.3 60.5H21.7a4.5 4.5 0 0 1-4.5-3.9z" fill="#ff5b2e"/>' +
      '<path d="M51 28l-4.2 28.6a4.5 4.5 0 0 1-4.5 3.9H36L39 28z" fill="#e2401a" opacity=".55"/>' +
      '<path d="M15.6 36.5h32.8l-1.5 11H17.1z" fill="#fff"/>' +
      '<path d="M32 46c-4.6-1.6-6.4-5.4-4.5-8.6 3 .4 5.2 2.4 6 5.2.8-2.8 3-4.8 6-5.2 1.9 3.2.1 7-4.5 8.6z" fill="#13a874"/>'
  };

  var cache = {};

  function svg(key) {
    var body = S[key];
    return body ? '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">' + body + '</svg>' : '';
  }

  function uri(key) {
    if (!S[key]) return '';
    if (!cache[key]) cache[key] = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg(key));
    return cache[key];
  }

  PA.icons = {
    keys: Object.keys(S),
    has: function (key) { return Object.prototype.hasOwnProperty.call(S, key); },
    svg: svg,
    uri: uri
  };
})();
