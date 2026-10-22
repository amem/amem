#!/usr/bin/env node
// Copies the shared brand runtime from games/promo-arcade/shared/ (the master copy) into
// the other business kits, so every kit stays a standalone product with the same features
// and fixes. Parts only Promo Arcade uses (hub page, Memory Match and Spin & Win styles)
// are left out, and the global is renamed to window.BrandKit.
//
//   node scripts/sync-kits.mjs        (npm run sync-kits)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MASTER = path.join(ROOT, 'games', 'promo-arcade', 'shared');
const KITS = ['daily-doors', 'perfect-match-quiz'];
const DROP_CSS_SECTIONS = ['Memory Match', 'Spin & Win', 'hub page'];

const HEADER_JS = `/*
 * shared/brand.js — shared brand runtime (window.BrandKit).
 *
 * Applies config.js (window.BRAND_CONFIG) to the page: colours → CSS variables with automatic
 * text contrast, logo and texts. Provides safe storage, synthesized sound, confetti, toasts,
 * copy/share, reward tiers, the reward ticket with optional lead capture, and the screen shell
 * (title, pause, result, keyboard, demo mode and the window.__GAME__ test API).
 */`;
const HEADER_CSS = `/*
 * shared/ui.css — shared brand styles, driven by the colours in config.js (CSS variables).
 * Product-specific styles live in style.css.
 */`;

// Neutral wording for products that do not include Promo Arcade.
const neutral = (s) => s
  .replace(/window\.PromoArcade/g, 'window.BrandKit')
  .replace(/\[Promo Arcade\]/g, '[BrandKit]')
  .replace(/'promo-arcade'\) \+ ':'/g, "'brand-kit') + ':'")
  .replace(/key \('catchRush'…, picks title\/howTo\/rewards from brand\.config\.js\)/g, 'key (picks title/howTo/rewards from config.js)')
  .replace(/brand\.config\.js/g, 'config.js');

function brandJs(src) {
  let s = src.replace(/^\/\*[\s\S]*?\*\//, HEADER_JS);
  const hub = s.indexOf('  // ---------------------------------------------------------------- hub page');
  if (hub < 0) throw new Error('hub section not found in brand.js');
  s = s.slice(0, hub).replace(/\n+$/, '\n') + '})();\n';
  return neutral(s);
}

function uiCss(src) {
  let s = src.replace(/^\/\*[\s\S]*?\*\//, HEADER_CSS);
  const parts = s.split(/(?=\/\* -{10,} [^*]+\*\/)/);
  s = parts.map((part) => {
    const m = part.match(/^\/\* -{10,} ([^*]+?) \*\//);
    if (!m || !DROP_CSS_SECTIONS.includes(m[1])) return part;
    const keep = part.indexOf('@media (prefers-reduced-motion');
    return keep >= 0 ? part.slice(keep) : '';
  }).join('');
  return s;
}

function iconsJs(src) {
  return neutral(src);
}

for (const kit of KITS) {
  const dir = path.join(ROOT, 'games', kit, 'shared');
  fs.mkdirSync(dir, { recursive: true });
  const read = (f) => fs.readFileSync(path.join(MASTER, f), 'utf8');
  fs.writeFileSync(path.join(dir, 'brand.js'), brandJs(read('brand.js')));
  fs.writeFileSync(path.join(dir, 'ui.css'), uiCss(read('ui.css')));
  fs.writeFileSync(path.join(dir, 'icons.js'), iconsJs(read('icons.js')));
  console.log(`✓ synced games/${kit}/shared/`);
}
