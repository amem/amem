/*
 * shared/icons.js — built-in flat product icons (hand-authored SVG, 64 × 64).
 * Used by brand.config.js → products[].icon and logoIcon. Every icon looks the same
 * on every device (unlike emoji) and is small enough to ship inline.
 * Add your own: PA_ICONS.myicon = '<svg …>…</svg>' and reference it as icon: 'myicon'.
 */
(function () {
  'use strict';

  function svg(body) {
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' + body + '</svg>';
  }
  var shine = function (cx, cy, rx, ry, rot) {
    return '<ellipse cx="' + cx + '" cy="' + cy + '" rx="' + rx + '" ry="' + ry + '" fill="#fff" opacity=".32" transform="rotate(' + (rot || 0) + ' ' + cx + ' ' + cy + ')"/>';
  };

  window.PA_ICONS = {
    // ---------------------------------------------------------------- fruit
    strawberry: svg(
      '<path d="M32 60C17 51 8 38 9.5 27 11 18.5 19 14.5 26 17c2.4.9 4.4 2 6 3.2 1.6-1.2 3.6-2.3 6-3.2 7-2.5 15 1.5 16.5 10C56 38 47 51 32 60Z" fill="#FF3B5C"/>' +
      '<path d="M12.5 20.2C11 33 20 47 32 55c12-8 21-22 19.5-34.8 1.5 1.8 2.6 4 3 6.8C56 38 47 51 32 60 17 51 8 38 9.5 27c.4-2.8 1.5-5 3-6.8Z" fill="#D81E45"/>' +
      '<g fill="#FFE27A"><ellipse cx="22" cy="30" rx="1.3" ry="2.1"/><ellipse cx="32" cy="29" rx="1.3" ry="2.1"/><ellipse cx="42" cy="30" rx="1.3" ry="2.1"/><ellipse cx="26" cy="39" rx="1.3" ry="2.1"/><ellipse cx="37" cy="39" rx="1.3" ry="2.1"/><ellipse cx="46" cy="38" rx="1.3" ry="2.1"/><ellipse cx="19" cy="38" rx="1.3" ry="2.1"/><ellipse cx="31" cy="48" rx="1.3" ry="2.1"/><ellipse cx="40" cy="47" rx="1.3" ry="2.1"/><ellipse cx="24" cy="47" rx="1.3" ry="2.1"/></g>' +
      '<path d="M32 22c-2-6-8-9-14-8 3 2 5 4 6 7-4-1-8 0-11 3 6 0 11 1 15 3 1-3 2-4 4-5 2 1 3 2 4 5 4-2 9-3 15-3-3-3-7-4-11-3 1-3 3-5 6-7-6-1-12 2-14 8Z" fill="#35B558"/>' +
      '<path d="M32 17c0-5 1.5-9 4-12" stroke="#2A8F45" stroke-width="3" stroke-linecap="round" fill="none"/>' +
      shine(20, 32, 3.5, 7, -25)),
    pineapple: svg(
      '<path d="M32 3l4.5 10.5L44 7l-2 11.5 8.5-2.5-7 9.5H20.5l-7-9.5L22 18.5 20 7l7.5 6.5z" fill="#35B558"/>' +
      '<path d="M32 9l2.5 9h-5z" fill="#2A8F45"/>' +
      '<clipPath id="p"><ellipse cx="32" cy="43" rx="16" ry="19"/></clipPath>' +
      '<ellipse cx="32" cy="43" rx="16" ry="19" fill="#FFC21A"/>' +
      '<g clip-path="url(#p)" stroke="#E0960A" stroke-width="2.2" fill="none"><path d="M10 28l38 38M10 38l28 28M14 22l38 38M22 20l34 34M54 28L16 66M54 38L26 66M50 22L12 60M42 20L8 54"/></g>' +
      '<g fill="#B86E00"><circle cx="32" cy="34" r="1.4"/><circle cx="25" cy="41" r="1.4"/><circle cx="39" cy="41" r="1.4"/><circle cx="32" cy="48" r="1.4"/><circle cx="25" cy="55" r="1.4"/><circle cx="39" cy="55" r="1.4"/></g>' +
      shine(24, 36, 3, 8, 15)),
    mango: svg(
      '<defs><linearGradient id="m" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#FF7A1C"/><stop offset=".55" stop-color="#FFB020"/><stop offset="1" stop-color="#FFE03D"/></linearGradient></defs>' +
      '<path d="M13 37C11 23 23 12 37 13c10.5.8 16 9 14 19.5C48.5 46 36 56.5 24 54.5c-6.5-1-10-9-11-17.5Z" fill="url(#m)"/>' +
      '<path d="M18 46c3 5 7 8.5 12 9 9 1 18-5 22.5-14-5 9-14 13-21.5 11.5-5-1-9.5-3-13-6.5Z" fill="#E8551E" opacity=".55"/>' +
      '<path d="M37 13c2.5-6.5 9-9.5 16-8.5-2.5 6.5-9 10-16 8.5Z" fill="#35B558"/>' +
      '<path d="M36 13c-1-2.5-1-4.5.5-7" stroke="#6B4A1E" stroke-width="2.5" stroke-linecap="round" fill="none"/>' +
      shine(24, 30, 4, 8, 30)),
    banana: svg(
      '<path d="M9 17c3 24 22 38 46 33-2-2.2-2.2-4.6-.8-6.8C34 47 19 35 15 15.5c-2.3-.4-4.4.1-6 1.5Z" fill="#FFD93B"/>' +
      '<path d="M15 15.5C19 35 34 47 54.2 43.2c-.7 1.2-1.1 2.4-1 3.6C33 50 17 38.5 12.2 18.4c.8-1.4 1.8-2.4 2.8-2.9Z" fill="#F2B40F"/>' +
      '<path d="M9 17c-1.2-2.2-.5-4.8 1.6-6l5.6 4.5c-2.6-.6-5 0-7.2 1.5Z" fill="#6B4A1E"/>' +
      '<path d="M54.2 43.2l3.6 1.5c-1.2 1.7-1.4 3.4-.6 5.1l-2.4.2c-1.4-2.3-1.6-4.6-.6-6.8Z" fill="#6B4A1E"/>' +
      '<path d="M17 20c4 13 13 22 26 25" stroke="#fff" stroke-width="2.5" stroke-linecap="round" opacity=".45" fill="none"/>'),
    kiwi: svg(
      '<circle cx="32" cy="32" r="27" fill="#8B5E34"/>' +
      '<circle cx="32" cy="32" r="23.5" fill="#6CCB45"/>' +
      '<circle cx="32" cy="32" r="17" fill="#8EDC62"/>' +
      '<ellipse cx="32" cy="32" rx="7.5" ry="6.5" fill="#F2F7C8"/>' +
      '<g fill="#2B1B10">' + (function () {
        var out = '';
        for (var i = 0; i < 12; i++) {
          var a = i / 12 * Math.PI * 2;
          var x = (32 + Math.cos(a) * 11).toFixed(1), y = (32 + Math.sin(a) * 10).toFixed(1);
          out += '<ellipse cx="' + x + '" cy="' + y + '" rx="1" ry="2" transform="rotate(' + (a * 180 / Math.PI + 90).toFixed(0) + ' ' + x + ' ' + y + ')"/>';
        }
        return out;
      })() + '</g>' +
      shine(22, 20, 4, 2.5, -35)),
    watermelon: svg(
      '<path d="M5 18a27 27 0 0 0 54 0Z" fill="#2E9E4F"/>' +
      '<path d="M8.5 18a23.5 23.5 0 0 0 47 0Z" fill="#C4F0A8"/>' +
      '<path d="M11.5 18a20.5 20.5 0 0 0 41 0Z" fill="#FF4D5E"/>' +
      '<rect x="11.5" y="17" width="41" height="3" fill="#fff" opacity=".22"/>' +
      '<g fill="#2B1B10"><path d="M22 25c1 2 1 4 0 5-1-1-1.5-3 0-5Z"/><path d="M32 27c1 2 1 4 0 5-1-1-1.5-3 0-5Z"/><path d="M42 25c1 2 1 4 0 5-1-1-1.5-3 0-5Z"/><path d="M27 33c1 2 1 4 0 5-1-1-1.5-3 0-5Z"/><path d="M37 33c1 2 1 4 0 5-1-1-1.5-3 0-5Z"/></g>'),
    coconut: svg(
      '<path d="M40 4l-6 26" stroke="#FF6FAE" stroke-width="4" stroke-linecap="round"/>' +
      '<path d="M38.5 10.5l-1.5 6.5M36.7 18.3l-1.2 5" stroke="#fff" stroke-width="4" stroke-linecap="butt"/>' +
      '<circle cx="32" cy="38" r="23" fill="#7A4A2A"/>' +
      '<path d="M12 30a21 9 0 0 1 40 0" fill="none" stroke="#5E361C" stroke-width="2"/>' +
      '<ellipse cx="32" cy="30" rx="19" ry="8" fill="#FFF8EC"/>' +
      '<ellipse cx="32" cy="30.5" rx="15" ry="5.5" fill="#F4E6CF"/>' +
      '<g fill="#5E361C"><circle cx="24" cy="46" r="1.8"/><circle cx="40" cy="47" r="1.8"/><circle cx="32" cy="52" r="1.8"/></g>' +
      shine(20, 42, 3, 6, 20)),
    blueberry: svg(
      '<circle cx="21" cy="40" r="14" fill="#4A5AD8"/>' +
      '<circle cx="43" cy="40" r="14" fill="#5566E0"/>' +
      '<circle cx="32" cy="22" r="13" fill="#6272EA"/>' +
      '<g fill="#2C347F"><path d="M21 33l2 3 3.5-.5-2 3 2 3-3.5-.5-2 3-2-3-3.5.5 2-3-2-3 3.5.5z"/><path d="M43 33l2 3 3.5-.5-2 3 2 3-3.5-.5-2 3-2-3-3.5.5 2-3-2-3 3.5.5z"/><path d="M32 15l2 3 3.5-.5-2 3 2 3-3.5-.5-2 3-2-3-3.5.5 2-3-2-3 3.5.5z"/></g>' +
      shine(15, 35, 2.5, 4, -30) + shine(37, 35, 2.5, 4, -30) + shine(26, 17, 2.5, 4, -30)),

    // ---------------------------------------------------------------- café
    coffee: svg(
      '<path d="M24 14c-3-3 3-5 0-8M32 14c-3-3 3-5 0-8M40 14c-3-3 3-5 0-8" stroke="#B89A80" stroke-width="2.5" stroke-linecap="round" fill="none"/>' +
      '<ellipse cx="31" cy="55" rx="23" ry="5" fill="#D9C4AE"/>' +
      '<path d="M47 27h3a8 8 0 0 1 0 16h-4" stroke="#E0245E" stroke-width="4.5" fill="none"/>' +
      '<path d="M12 22h37v16a15 15 0 0 1-15 15h-7a15 15 0 0 1-15-15Z" fill="#E0245E"/>' +
      '<rect x="12" y="30" width="37" height="6" fill="#fff" opacity=".85"/>' +
      '<ellipse cx="30.5" cy="22" rx="18.5" ry="4" fill="#7A4A2A"/>' +
      '<ellipse cx="27" cy="21.5" rx="6" ry="1.4" fill="#C08457"/>'),
    cupcake: svg(
      '<path d="M16 36h32l-5 22H21Z" fill="#6C8CFF"/>' +
      '<path d="M22 36l3 22M30 36l1 22M38 36l-1 22M45 36l-3 22" stroke="#4E6CE0" stroke-width="2.5"/>' +
      '<path d="M12.5 37c-3.5-6 1-12 7-11 0-7.5 8.5-11.5 13.5-7.5 4.5-5 13.5-2 13.5 5.5 6.5.5 9 7.5 5 13Z" fill="#FFD1E6"/>' +
      '<path d="M16 31c5 3 10 2 14-1 5 3 11 3 16-1" stroke="#FF8FC0" stroke-width="2.5" stroke-linecap="round" fill="none"/>' +
      '<circle cx="33" cy="13" r="5.5" fill="#E0245E"/><path d="M33 8c1-3 3-5 6-6" stroke="#2A8F45" stroke-width="2" fill="none" stroke-linecap="round"/>' +
      '<g fill="#FFC23D"><rect x="20" y="27" width="4" height="1.8" rx=".9" transform="rotate(30 22 28)"/><rect x="38" y="24" width="4" height="1.8" rx=".9" transform="rotate(-30 40 25)"/><rect x="28" y="22" width="4" height="1.8" rx=".9"/></g>'),
    donut: svg(
      '<path fill-rule="evenodd" d="M32 8a25 25 0 1 0 0 50 25 25 0 1 0 0-50Zm0 17a8 8 0 1 1 0 16 8 8 0 1 1 0-16Z" fill="#E8A65A"/>' +
      '<path fill-rule="evenodd" d="M32 11c11.5 0 21 8 21 19 0 3-2 4-3.5 6s-1 5-4.5 5-3-4-6-3.5c-2.5.5-3 4-7 4s-4.5-3.5-7-4c-3-.5-2.5 3.5-6 3.5s-3-3.5-4.5-5.5S11 33 11 30c0-11 9.5-19 21-19Zm0 14.5a7.5 7.5 0 1 0 0 15 7.5 7.5 0 1 0 0-15Z" fill="#FF6FAE"/>' +
      '<g><rect x="20" y="17" width="5" height="2" rx="1" fill="#FFC23D" transform="rotate(25 22 18)"/><rect x="38" y="15" width="5" height="2" rx="1" fill="#2EE6A8" transform="rotate(-20 40 16)"/><rect x="45" y="25" width="5" height="2" rx="1" fill="#6C8CFF" transform="rotate(60 47 26)"/><rect x="15" y="28" width="5" height="2" rx="1" fill="#fff" transform="rotate(-50 17 29)"/><rect x="30" y="13" width="5" height="2" rx="1" fill="#6C8CFF"/><rect x="44" y="34" width="5" height="2" rx="1" fill="#FFC23D" transform="rotate(10 46 35)"/><rect x="18" y="37" width="5" height="2" rx="1" fill="#2EE6A8" transform="rotate(40 20 38)"/></g>' +
      shine(22, 20, 4, 2, -30)),
    icecream: svg(
      '<path d="M21 36h22L32 61Z" fill="#E8A65A"/>' +
      '<path d="M24 41l12 12M30 39l9 9M23 45l7 7M40 41L28 53M34 39l-9 9M41 45l-7 7" stroke="#C4803A" stroke-width="1.8"/>' +
      '<circle cx="25" cy="31" r="10" fill="#FF8FC0"/>' +
      '<circle cx="39" cy="31" r="10" fill="#7FE3C4"/>' +
      '<circle cx="32" cy="20" r="10.5" fill="#FFF1D6"/>' +
      '<circle cx="32" cy="8.5" r="4" fill="#E0245E"/>' +
      shine(28, 16, 3, 2, -30)),
    pizza: svg(
      '<path d="M32 60L8 15c15-7.5 33-7.5 48 0Z" fill="#FFD166"/>' +
      '<path d="M8 15c15-7.5 33-7.5 48 0l-3.2 6C39 14.5 25 14.5 11.2 21Z" fill="#D98B3A"/>' +
      '<g fill="#E0413A"><circle cx="26" cy="27" r="4.5"/><circle cx="39" cy="28" r="4.5"/><circle cx="32" cy="40" r="4.5"/><circle cx="31" cy="51" r="3"/></g>' +
      '<g fill="#35B558"><path d="M21 34l3 1-1 3z"/><path d="M41 38l3 1-1 3z"/></g>'),
    burger: svg(
      '<path d="M10 30c0-12.5 10-20 22-20s22 7.5 22 20Z" fill="#F2A541"/>' +
      '<g fill="#FFF3D6"><ellipse cx="24" cy="19" rx="1.6" ry="1"/><ellipse cx="32" cy="16" rx="1.6" ry="1"/><ellipse cx="40" cy="19" rx="1.6" ry="1"/><ellipse cx="28" cy="24" rx="1.6" ry="1"/><ellipse cx="37" cy="24" rx="1.6" ry="1"/></g>' +
      '<path d="M8 31h48l-4.5 4.5-4-3-4 3-4-3-4 3-4-3-4 3-4-3-4 3-4-3-4 3Z" fill="#6CCB45"/>' +
      '<path d="M10 35h44l-9 6-5.5-3Z" fill="#FFD23D"/>' +
      '<rect x="9" y="38" width="46" height="8.5" rx="4.2" fill="#7A3E1D"/>' +
      '<path d="M10 47.5h44v2.5a6 6 0 0 1-6 6H16a6 6 0 0 1-6-6Z" fill="#E8913A"/>'),

    // ---------------------------------------------------------------- retail
    gift: svg(
      '<rect x="10" y="28" width="44" height="29" rx="4" fill="#E0245E"/>' +
      '<rect x="7" y="20" width="50" height="11" rx="3.5" fill="#FF4F7E"/>' +
      '<rect x="28" y="20" width="8" height="37" fill="#FFC23D"/>' +
      '<path d="M32 20c-4-9-15-11-15-4 0 4 7 5 15 4Zm0 0c4-9 15-11 15-4 0 4-7 5-15 4Z" fill="#FFC23D"/>' +
      '<rect x="10" y="31" width="44" height="2.5" fill="#000" opacity=".12"/>'),
    bag: svg(
      '<path d="M22 24v-5a10 10 0 0 1 20 0v5" stroke="#0F5A4B" stroke-width="3.5" fill="none" stroke-linecap="round"/>' +
      '<path d="M11 22h42l-3 36H14Z" fill="#2EE6A8"/>' +
      '<path d="M11 22h42l-.6 7H11.6Z" fill="#1FC790"/>' +
      '<circle cx="22" cy="26" r="2" fill="#0F5A4B"/><circle cx="42" cy="26" r="2" fill="#0F5A4B"/>' +
      '<path d="M32 36l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z" fill="#fff" opacity=".9"/>'),
    shirt: svg(
      '<path d="M22 8L8 16l5.5 12.5 6-3V57h25V25.5l6 3L56 16 42 8c-2 5-5.5 7.5-10 7.5S24 13 22 8Z" fill="#5B8CFF"/>' +
      '<path d="M22 8c2 5 5.5 7.5 10 7.5S40 13 42 8l-3-1.6C37.5 10 35 12 32 12s-5.5-2-7-5.6Z" fill="#3E6BE0"/>' +
      '<path d="M8 16l5.5 12.5 3-1.5L10.5 15Z" fill="#3E6BE0"/>' +
      '<rect x="19.5" y="36" width="25" height="5" fill="#fff" opacity=".85"/>'),
    heart: svg(
      '<path d="M32 57S7 43 7 24c0-8.5 6.5-15 14-15 5 0 9 3 11 7.5C34 12 38 9 43 9c7.5 0 14 6.5 14 15 0 19-25 33-25 33Z" fill="#FF3B6B"/>' +
      '<path d="M32 57S7 43 7 24c0-2 .4-4 1-5.8C10 36 32 49 32 49s22-13 24-30.8c.6 1.8 1 3.8 1 5.8 0 19-25 33-25 33Z" fill="#E0245E"/>' +
      shine(19, 21, 4, 6, -35)),
    gem: svg(
      '<path d="M16 9h32l12 17-28 33L4 26Z" fill="#48C7FF"/>' +
      '<path d="M4 26h56L32 59Z" fill="#1E9BE0"/>' +
      '<path d="M16 9l6 17h20l6-17Z" fill="#8FE1FF"/>' +
      '<path d="M22 26l10 33 10-33Z" fill="#5AD0FF"/>' +
      '<path d="M16 9L4 26h18ZM48 9l12 17H42Z" fill="#6CD6FF"/>' +
      '<path d="M20 13l-3 6" stroke="#fff" stroke-width="2.5" stroke-linecap="round" opacity=".8"/>'),
    star: svg(
      '<path d="M32 4.5l8.3 17 18.7 2.6-13.6 13 3.3 18.6L32 46.8l-16.7 8.9 3.3-18.6L5 24.1l18.7-2.6Z" fill="#FFC23D"/>' +
      '<path d="M32 4.5v42.3l-16.7 8.9 3.3-18.6L5 24.1l18.7-2.6Z" fill="#FFD66B"/>' +
      '<path d="M32 46.8l16.7 8.9-3.3-18.6L59 24.1 32 36Z" fill="#F2A800" opacity=".7"/>'),

    // ---------------------------------------------------------------- game pieces
    bomb: svg(
      '<circle cx="29" cy="38" r="20" fill="#2B2B3A"/>' +
      '<rect x="33" y="14" width="10" height="9" rx="2" fill="#4A4A5E" transform="rotate(35 38 18)"/>' +
      '<path d="M42 16c3-6 8-8 13-6" stroke="#9C7B55" stroke-width="3" fill="none" stroke-linecap="round"/>' +
      '<path d="M56 4l1.6 4.4 4.4 1.6-4.4 1.6L56 16l-1.6-4.4L50 10l4.4-1.6Z" fill="#FFD23D"/>' +
      '<circle cx="56" cy="10" r="2" fill="#FF7A3D"/>' +
      shine(21, 30, 4, 7, 35))
  };
})();
