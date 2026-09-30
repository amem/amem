#!/usr/bin/env node
// Generates every listing image and trailer from the live games (demo mode).
//
//   node scripts/make-assets.mjs                  capture + compose + video
//   node scripts/make-assets.mjs --skip-capture   re-compose from existing screenshots
//   node scripts/make-assets.mjs --skip-video
//
// Output: marketing/out/
//   screenshots/  raw gameplay captures (desktop 1280×720, phone 780×1688, card 800×500)
//   fiverr/       gig images 1280×769 (3 per gig)
//   itch/         covers 630×500
//   gumroad/      covers 1280×720 + thumbnails 600×600
//   upwork/       portfolio images 1600×1200
//   site/         website card images + social preview (og-image 1200×630)
//   brand/        studio logo 800×800
//   video/        20-second trailers, landscape 1280×720 and portrait 720×1280 (.webm)
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { startServer } from './lib/server.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'marketing', 'out');
const SHOTS = path.join(OUT, 'screenshots');
const TMP = path.join(ROOT, '.qa', 'compose');
const catalog = JSON.parse(fs.readFileSync(path.join(ROOT, 'catalog.json'), 'utf8'));
const P = Object.fromEntries(catalog.products.map((p) => [p.id, p]));
const flag = (name) => process.argv.includes('--' + name);

// Game pages and how long the demo bot needs before it looks its best.
const CAPTURES = [
  { key: 'neon-stack', page: 'games/neon-stack/index.html', wait: 14 },
  { key: 'cosmic-merge', page: 'games/cosmic-merge/index.html', wait: 26 },
  { key: 'brick-blitz', page: 'games/brick-blitz/index.html', wait: 6 },
  { key: 'catch-rush', page: 'games/promo-arcade/catch-rush/index.html', wait: 8 },
  { key: 'memory-match', page: 'games/promo-arcade/memory-match/index.html', wait: 8 },
  { key: 'spin-win', page: 'games/promo-arcade/spin-win/index.html', wait: 5 },
];
const VIEWS = {
  desktop: { viewport: { width: 1280, height: 720 } },
  phone: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  card: { viewport: { width: 800, height: 500 } },
};
const TRAILERS = ['neon-stack', 'cosmic-merge', 'brick-blitz', 'catch-rush'];

for (const dir of ['screenshots', 'fiverr', 'itch', 'gumroad', 'upwork', 'site', 'brand', 'video']) {
  fs.mkdirSync(path.join(OUT, dir), { recursive: true });
}
fs.mkdirSync(TMP, { recursive: true });

const server = await startServer(ROOT);
const browser = await chromium.launch();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function pool(items, size, fn) {
  const queue = [...items];
  await Promise.all(Array.from({ length: size }, async () => {
    while (queue.length) await fn(queue.shift());
  }));
}

// ------------------------------------------------------------------ capture
async function capture(c) {
  for (const [view, opts] of Object.entries(VIEWS)) {
    const ctx = await browser.newContext(opts);
    const page = await ctx.newPage();
    if (view !== 'card') {
      await page.goto(`${server.url}/${c.page}`, { waitUntil: 'load' });
      await sleep(2500);
      await page.screenshot({ path: path.join(SHOTS, `${c.key}-${view}-title.png`) });
    }
    await page.goto(`${server.url}/${c.page}?demo=1`, { waitUntil: 'load' });
    await sleep(c.wait * 1000);
    await page.screenshot({ path: path.join(SHOTS, `${c.key}-${view}-1.png`) });
    await sleep(3500);
    await page.screenshot({ path: path.join(SHOTS, `${c.key}-${view}-2.png`) });
    await ctx.close();
    console.log(`  captured ${c.key} (${view})`);
  }
}

async function captureHub() {
  for (const view of ['desktop', 'phone']) {
    const ctx = await browser.newContext(VIEWS[view]);
    const page = await ctx.newPage();
    await page.goto(`${server.url}/games/promo-arcade/index.html`, { waitUntil: 'load' });
    await sleep(2000);
    await page.screenshot({ path: path.join(SHOTS, `promo-hub-${view}.png`) });
    await ctx.close();
  }
  // Card image for Promo Arcade = the hub page.
  const ctx = await browser.newContext(VIEWS.card);
  const page = await ctx.newPage();
  await page.goto(`${server.url}/games/promo-arcade/index.html`, { waitUntil: 'load' });
  await sleep(2000);
  await page.screenshot({ path: path.join(SHOTS, 'promo-arcade-card-1.png') });
  await ctx.close();
  console.log('  captured promo hub');
}

async function recordTrailers() {
  const VIDEO = path.join(OUT, 'video');
  const shapes = {
    landscape: { viewport: { width: 1280, height: 720 } },
    portrait: { viewport: { width: 720, height: 1280 } },
  };
  await pool(TRAILERS.flatMap((key) => Object.keys(shapes).map((shape) => ({ key, shape }))), 2, async ({ key, shape }) => {
    const c = CAPTURES.find((x) => x.key === key);
    const dir = path.join(TMP, `video-${key}-${shape}`);
    fs.rmSync(dir, { recursive: true, force: true });
    const ctx = await browser.newContext({ ...shapes[shape], recordVideo: { dir, size: shapes[shape].viewport } });
    const page = await ctx.newPage();
    await page.goto(`${server.url}/${c.page}?demo=1`, { waitUntil: 'load' });
    await sleep(20000);
    const video = page.video();
    await ctx.close();
    fs.copyFileSync(await video.path(), path.join(VIDEO, `${key}-trailer-${shape}.webm`));
    fs.rmSync(dir, { recursive: true, force: true });
    console.log(`  recorded ${key} (${shape})`);
  });
}

// ------------------------------------------------------------------ compose helpers
const shot = (name) => `/marketing/out/screenshots/${name}.png`;
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

const BASE_CSS = `
@import url('/site/fonts/fonts.css');
*{box-sizing:border-box;margin:0;padding:0}
:root{--ink:#17231d;--paper:#f3f5ec;--star:#f4c22b;--leaf:#2e7a4e;--coral:#e8503f;--white:#ffffff}
html,body{overflow:hidden}
body{position:relative;font-family:'Figtree',system-ui,sans-serif;color:var(--ink);-webkit-font-smoothing:antialiased}
.display{font-family:'Unbounded','Arial Black',sans-serif;font-weight:800;letter-spacing:-0.02em;line-height:1.02}
.mono{font-family:'JetBrains Mono',monospace;font-weight:500;letter-spacing:.02em}
.abs{position:absolute}
.phone{position:absolute;aspect-ratio:390/844;background:#0b0f0d;border-radius:11%/5.2%;padding:2.6%;
  box-shadow:0 0 0 2px #26302b,0 30px 60px -20px rgba(0,0,0,.55)}
.phone img{width:100%;height:100%;object-fit:cover;border-radius:9%/4.2%;display:block}
.laptop{position:absolute}
.laptop .lid{background:#0b0f0d;border-radius:18px 18px 0 0;padding:2.2% 2.2% 2.6%;box-shadow:0 0 0 2px #26302b}
.laptop .lid img{width:100%;aspect-ratio:16/9;object-fit:cover;display:block;border-radius:4px}
.laptop .base{height:18px;margin:0 -6%;background:linear-gradient(#c9cfc6,#9aa39b);border-radius:0 0 22px 22px;
  box-shadow:0 30px 50px -20px rgba(0,0,0,.5)}
.chips{display:flex;flex-wrap:wrap;gap:12px}
.chip{font-family:'JetBrains Mono',monospace;font-weight:500;font-size:22px;padding:10px 18px;border-radius:999px;border:2px solid currentColor}
.mark{width:64px;height:64px}
.brandline{display:flex;align-items:center;gap:14px;font-family:'Unbounded',sans-serif;font-weight:800;font-size:26px}
`;
const MARK = fs.readFileSync(path.join(ROOT, 'site', 'favicon.svg'), 'utf8').replace('<svg ', '<svg class="mark" ');
const phone = (src, style) => `<div class="phone" style="${style}"><img src="${src}" alt=""></div>`;
const laptop = (src, style) => `<div class="laptop" style="${style}"><div class="lid"><img src="${src}" alt=""></div><div class="base"></div></div>`;

async function compose(outRel, width, height, body, extraCss = '') {
  const file = path.join(TMP, outRel.replace(/[\\/]/g, '__') + '.html');
  fs.writeFileSync(file, `<!doctype html><html><head><meta charset="utf-8"><style>${BASE_CSS}
html,body{width:${width}px;height:${height}px}${extraCss}</style></head><body>${body}</body></html>`);
  const ctx = await browser.newContext({ viewport: { width, height } });
  const page = await ctx.newPage();
  await page.goto(`${server.url}/${path.relative(ROOT, file).split(path.sep).join('/')}`, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => Promise.all([...document.images].map((img) => img.decode().catch(() => {}))));
  const broken = await page.evaluate(() => [...document.images].filter((i) => !i.naturalWidth).map((i) => i.src));
  if (broken.length) console.warn(`  ⚠ ${outRel}: missing images ${broken.join(', ')}`);
  await page.screenshot({ path: path.join(OUT, outRel) });
  await ctx.close();
}

// ------------------------------------------------------------------ compositions
async function composeAll() {
  const jobs = [];

  // ---- Website cards + social preview
  for (const p of catalog.products) {
    jobs.push(() => compose(`site/${p.id}-card.png`, 800, 500, `<img src="${shot(`${p.id}-card-1`)}" style="width:800px;height:500px;object-fit:cover">`));
  }
  jobs.push(() => compose('site/og-image.png', 1200, 630, `
    <div class="abs" style="inset:0;background:var(--paper)"></div>
    <div class="abs brandline" style="left:64px;top:56px">${MARK}Starfruit Arcade</div>
    <h1 class="abs display" style="left:64px;top:150px;width:620px;font-size:64px">HTML5 games that play on every screen.</h1>
    <p class="abs" style="left:64px;top:470px;width:560px;font-size:26px;color:#56645b">Play the demos, buy the source code, or hire us to build yours.</p>
    ${phone(shot('cosmic-merge-phone-1'), 'left:720px;top:40px;width:200px;transform:rotate(-4deg)')}
    ${phone(shot('neon-stack-phone-1'), 'left:945px;top:90px;width:200px;transform:rotate(5deg)')}
  `));

  // ---- itch.io covers (630×500)
  for (const p of catalog.products) {
    jobs.push(() => compose(`itch/${p.id}-cover.png`, 630, 500, `
      <img class="abs" src="${shot(`${p.id}-card-1`)}" style="inset:0;width:630px;height:500px;object-fit:cover">
      <div class="abs" style="inset:0;background:linear-gradient(180deg,rgba(0,0,0,0) 35%,rgba(0,0,0,.82) 100%)"></div>
      <h1 class="abs display" style="left:32px;bottom:78px;font-size:58px;color:#fff;text-shadow:0 4px 24px rgba(0,0,0,.5)">${esc(p.title)}</h1>
      <p class="abs" style="left:34px;bottom:36px;font-size:24px;font-weight:700;color:${p.accent === '#ff7a18' ? '#ffd29a' : '#fff'}">${esc(p.tagline)}</p>
    `));
  }

  // ---- Gumroad covers (1280×720) + thumbnails (600×600)
  const deviceShot = (id) => (id === 'promo-arcade'
    ? { wide: shot('promo-hub-desktop'), tall: shot('spin-win-phone-1') }
    : { wide: shot(`${id}-desktop-1`), tall: shot(`${id}-phone-1`) });
  for (const p of catalog.products) {
    const d = deviceShot(p.id);
    jobs.push(() => compose(`gumroad/${p.id}-cover.png`, 1280, 720, `
      <div class="abs" style="inset:0;background:var(--paper)"></div>
      <div class="abs" style="right:0;top:0;bottom:0;width:560px;background:linear-gradient(135deg,${p.accent},${p.accent2})"></div>
      <p class="abs mono" style="left:64px;top:64px;font-size:22px;color:var(--leaf)">HTML5 SOURCE CODE · No. ${p.number}</p>
      <h1 class="abs display" style="left:64px;top:110px;font-size:76px;width:640px">${esc(p.title)}</h1>
      <p class="abs" style="left:64px;top:${p.title.length > 11 ? 290 : 210}px;width:600px;font-size:30px;font-weight:700">${esc(p.tagline)}</p>
      <ul class="abs" style="left:64px;top:${p.title.length > 11 ? 370 : 290}px;width:620px;list-style:none;display:grid;gap:14px;font-size:24px;color:#34423a">
        ${p.features.slice(0, 5).map((f) => `<li style="display:flex;gap:14px"><span style="color:var(--leaf);font-weight:800">✓</span>${esc(f)}</li>`).join('')}
      </ul>
      ${laptop(d.wide, 'left:720px;top:150px;width:500px')}
      ${phone(d.tall, 'left:1050px;top:300px;width:170px;transform:rotate(4deg)')}
    `));
    jobs.push(() => compose(`gumroad/${p.id}-thumb.png`, 600, 600, `
      <div class="abs" style="inset:0;background:linear-gradient(135deg,${p.accent},${p.accent2})"></div>
      ${phone(d.tall, 'left:320px;top:70px;width:210px;transform:rotate(6deg)')}
      <h1 class="abs display" style="left:40px;top:360px;width:300px;font-size:50px;color:#fff;text-shadow:0 4px 18px rgba(0,0,0,.35)">${esc(p.title)}</h1>
      <p class="abs mono" style="left:42px;top:${p.title.length > 11 ? 500 : 480}px;font-size:18px;color:#fff">SOURCE CODE</p>
    `));
  }
  const bundlePhones = ['neon-stack-phone-1', 'cosmic-merge-phone-1', 'brick-blitz-phone-1', 'spin-win-phone-1'];
  jobs.push(() => compose('gumroad/bundle-cover.png', 1280, 720, `
    <div class="abs" style="inset:0;background:var(--ink)"></div>
    <div class="abs brandline" style="left:64px;top:56px;color:var(--star)">${MARK}Starfruit Arcade</div>
    <h1 class="abs display" style="left:64px;top:150px;width:520px;font-size:66px;color:#fff">${esc(catalog.bundle.title.replace('Starfruit Arcade ', ''))}</h1>
    <p class="abs" style="left:64px;top:410px;width:470px;font-size:28px;color:#cfd8cc">${catalog.products.map((p) => esc(p.title)).join(' · ')}</p>
    <p class="abs mono" style="left:64px;top:560px;font-size:22px;color:var(--star)">4 GAMES · FULL SOURCE CODE · 1 PRICE</p>
    ${bundlePhones.map((s, i) => phone(shot(s), `left:${600 + i * 160}px;top:${110 + (i % 2) * 70}px;width:190px;transform:rotate(${[-5, 3, -2, 5][i]}deg)`)).join('')}
  `));
  jobs.push(() => compose('gumroad/bundle-thumb.png', 600, 600, `
    <div class="abs" style="inset:0;background:var(--star)"></div>
    ${bundlePhones.map((s, i) => phone(shot(s), `left:${30 + i * 135}px;top:${60 + (i % 2) * 40}px;width:150px;transform:rotate(${[-5, 3, -2, 5][i]}deg)`)).join('')}
    <h1 class="abs display" style="left:36px;top:430px;font-size:46px">4-game bundle</h1>
    <p class="abs mono" style="left:38px;top:505px;font-size:20px">SOURCE CODE · HTML5</p>
  `));

  // ---- Upwork portfolio (1600×1200)
  for (const p of catalog.products) {
    const d = deviceShot(p.id);
    jobs.push(() => compose(`upwork/${p.id}-portfolio.png`, 1600, 1200, `
      <div class="abs" style="inset:0;background:var(--ink)"></div>
      <div class="abs" style="left:0;right:0;bottom:0;height:360px;background:linear-gradient(135deg,${p.accent},${p.accent2});opacity:.9"></div>
      ${laptop(d.wide, 'left:110px;top:120px;width:1000px')}
      ${phone(d.tall, 'left:1150px;top:250px;width:330px;transform:rotate(3deg)')}
      <h1 class="abs display" style="left:110px;top:900px;font-size:92px;color:#fff">${esc(p.title)}</h1>
      <p class="abs mono" style="left:114px;top:1030px;font-size:30px;color:#fff">${esc(p.genre.toUpperCase())} · HTML5 · JAVASCRIPT · CANVAS</p>
    `));
  }

  // ---- Fiverr gig images (1280×769)
  const W = 1280;
  const H = 769;
  const checklist = (items, color) => `<ul style="list-style:none;display:grid;gap:18px;font-size:30px;font-weight:700">
    ${items.map((t) => `<li style="display:flex;gap:18px;align-items:center"><span style="flex:none;width:40px;height:40px;border-radius:50%;background:${color};color:#17231d;display:grid;place-items:center;font-size:24px">✓</span>${esc(t)}</li>`).join('')}</ul>`;
  const steps = (color) => `<ol style="list-style:none;display:grid;grid-template-columns:repeat(4,1fr);gap:26px">
    ${[['Brief', 'Send your logo, colours and goal'], ['Preview', 'Play it on your phone within 48 hours'], ['Polish', 'Revisions until it feels right'], ['Launch', 'Files, source code and hosting help']]
    .map(([t, d], i) => `<li style="border-top:5px solid ${color};padding-top:18px"><p class="mono" style="font-size:22px;color:${color}">0${i + 1}</p><h3 class="display" style="font-size:34px;margin:8px 0 10px">${t}</h3><p style="font-size:24px;line-height:1.35;opacity:.85">${d}</p></li>`).join('')}</ol>`;

  // Gig 1 — branded mini-game
  jobs.push(() => compose('fiverr/gig1-branded-game-1.png', W, H, `
    <div class="abs" style="inset:0;background:var(--star)"></div>
    <h1 class="abs display" style="left:64px;top:92px;width:600px;font-size:92px">Your brand. Your game.</h1>
    <p class="abs" style="left:66px;top:352px;width:560px;font-size:32px;font-weight:700;line-height:1.3">Branded mini-games for shops, cafés, events and campaigns</p>
    <div class="abs chips" style="left:66px;top:520px;width:560px;color:var(--ink)"><span class="chip">Coupon rewards</span><span class="chip">Lead capture</span><span class="chip">Any phone</span></div>
    ${phone(shot('memory-match-phone-1'), 'left:690px;top:120px;width:230px;transform:rotate(-7deg)')}
    ${phone(shot('spin-win-phone-1'), 'left:1010px;top:120px;width:230px;transform:rotate(7deg)')}
    ${phone(shot('catch-rush-phone-1'), 'left:840px;top:60px;width:260px;z-index:2')}
  `));
  jobs.push(() => compose('fiverr/gig1-branded-game-2.png', W, H, `
    <div class="abs" style="inset:0;background:var(--ink)"></div>
    <h1 class="abs display" style="left:64px;top:56px;font-size:60px;color:var(--star)">3 games. 1 brand file.</h1>
    ${[['catch-rush', 'Catch Rush'], ['memory-match', 'Memory Match'], ['spin-win', 'Spin &amp; Win']].map(([k, label], i) => `
      ${phone(shot(`${k}-phone-1`), `left:${120 + i * 370}px;top:170px;width:250px`)}
      <p class="abs display" style="left:${120 + i * 370}px;top:${170 + 541 + 14}px;width:250px;text-align:center;font-size:26px;color:#fff">${label}</p>`).join('')}
  `, '.phone{box-shadow:0 0 0 2px #3a4a41}'));
  jobs.push(() => compose('fiverr/gig1-branded-game-3.png', W, H, `
    <div class="abs" style="inset:0;background:var(--paper)"></div>
    <h1 class="abs display" style="left:64px;top:56px;font-size:58px">How it works</h1>
    <div class="abs" style="left:64px;right:64px;top:170px">${steps('#2e7a4e')}</div>
    ${laptop(shot('promo-hub-desktop'), 'left:300px;top:450px;width:680px')}
  `));

  // Gig 2 — custom HTML5 game
  jobs.push(() => compose('fiverr/gig2-html5-game-1.png', W, H, `
    <div class="abs" style="inset:0;background:var(--ink)"></div>
    <h1 class="abs display" style="left:64px;top:84px;width:640px;font-size:80px;color:var(--star)">HTML5 games that play everywhere</h1>
    <p class="abs" style="left:66px;top:440px;width:560px;font-size:32px;font-weight:700;color:#fff">Phone · Tablet · Desktop · No install</p>
    <div class="abs chips" style="left:66px;top:540px;width:600px;color:#cfd8cc"><span class="chip">Full source code</span><span class="chip">Ad-SDK ready</span></div>
    ${laptop(shot('brick-blitz-desktop-1'), 'left:700px;top:250px;width:520px')}
    ${phone(shot('neon-stack-phone-1'), 'left:660px;top:120px;width:190px;transform:rotate(-6deg);z-index:2')}
    ${phone(shot('cosmic-merge-phone-1'), 'left:1060px;top:80px;width:190px;transform:rotate(6deg);z-index:2')}
  `, '.phone{box-shadow:0 0 0 2px #3a4a41,0 30px 60px -20px rgba(0,0,0,.7)}'));
  jobs.push(() => compose('fiverr/gig2-html5-game-2.png', W, H, `
    <div class="abs" style="inset:0;background:var(--star)"></div>
    <h1 class="abs display" style="left:64px;top:56px;font-size:58px">Playable preview in 48 hours</h1>
    ${[['neon-stack', 'Neon Stack'], ['cosmic-merge', 'Cosmic Merge'], ['brick-blitz', 'Brick Blitz']].map(([k, label], i) => `
      ${phone(shot(`${k}-phone-1`), `left:${120 + i * 370}px;top:170px;width:250px`)}
      <p class="abs display" style="left:${120 + i * 370}px;top:${170 + 541 + 14}px;width:250px;text-align:center;font-size:26px">${label}</p>`).join('')}
  `));
  jobs.push(() => compose('fiverr/gig2-html5-game-3.png', W, H, `
    <div class="abs" style="inset:0;background:var(--paper)"></div>
    <h1 class="abs display" style="left:64px;top:70px;font-size:58px">What you get</h1>
    <div class="abs" style="left:64px;top:190px;width:560px">${checklist(['Full, commented source code', 'Touch, mouse and keyboard controls', 'Runs in any browser, no install', 'Hooks for ads and analytics', 'One config file to reskin', 'Help putting it online'], '#f4c22b')}</div>
    ${laptop(shot('cosmic-merge-desktop-1'), 'left:660px;top:230px;width:560px')}
  `));

  // Gig 3 — fixes & optimisation
  const code = `<div style="background:#0b0f0d;border-radius:18px;padding:28px 30px;font-family:'JetBrains Mono',monospace;font-size:21px;line-height:1.7;color:#cfd8cc;box-shadow:0 30px 60px -20px rgba(0,0,0,.6)">
    <div style="color:#7f8c84">// update loop</div>
    <div style="background:rgba(232,80,63,.22);color:#ffb4a8">- ball.x += ball.vx;</div>
    <div style="background:rgba(244,194,43,.2);color:#ffe7a0">+ ball.x += ball.vx * dt;</div>
    <div style="background:rgba(232,80,63,.22);color:#ffb4a8">- canvas.width = innerWidth;</div>
    <div style="background:rgba(244,194,43,.2);color:#ffe7a0">+ fitCanvas(canvas, devicePixelRatio);</div>
    <div style="background:rgba(244,194,43,.2);color:#ffe7a0">+ document.onvisibilitychange = pause;</div>
    <div style="color:#7f8c84">// ✓ 60 fps · ✓ mobile · ✓ portal-ready</div></div>`;
  jobs.push(() => compose('fiverr/gig3-fixes-1.png', W, H, `
    <div class="abs" style="inset:0;background:var(--leaf)"></div>
    <h1 class="abs display" style="left:64px;top:84px;width:640px;font-size:76px;color:#fff">Fix &amp; speed up your HTML5 game</h1>
    <div class="abs chips" style="left:66px;top:470px;width:600px;color:var(--star)"><span class="chip">Bugs</span><span class="chip">Mobile layout</span><span class="chip">60 FPS</span><span class="chip">Ads SDK</span></div>
    <div class="abs" style="left:680px;top:110px;width:560px">${code}</div>
    ${phone(shot('brick-blitz-phone-1'), 'left:1010px;top:370px;width:170px;transform:rotate(5deg)')}
  `));
  jobs.push(() => compose('fiverr/gig3-fixes-2.png', W, H, `
    <div class="abs" style="inset:0;background:var(--paper)"></div>
    <h1 class="abs display" style="left:64px;top:70px;font-size:58px">What I fix</h1>
    <div class="abs" style="left:64px;top:190px;width:760px">${checklist(['Crashes, freezes and console errors', 'Touch controls and mobile layout', 'Low FPS, lag and memory leaks', 'Ad SDK integration for game portals', 'Portal checks: pause, mute, iframe size', 'New features and levels'], '#f4c22b')}</div>
    ${phone(shot('cosmic-merge-phone-2'), 'left:900px;top:130px;width:280px;transform:rotate(4deg)')}
  `));
  jobs.push(() => compose('fiverr/gig3-fixes-3.png', W, H, `
    <div class="abs" style="inset:0;background:var(--ink);color:#fff"></div>
    <h1 class="abs display" style="left:64px;top:56px;font-size:58px;color:var(--star)">How it works</h1>
    <div class="abs" style="left:64px;right:64px;top:180px;color:#fff">${steps('#f4c22b').replace(/Send your logo, colours and goal/, 'Share your code and the problem').replace(/Play it on your phone within 48 hours/, 'Fixed price and plan in 24 hours').replace(/Revisions until it feels right/, 'Fix, test on phone and desktop').replace(/Files, source code and hosting help/, 'Clean code and a short report')}</div>
    ${laptop(shot('neon-stack-desktop-1'), 'left:330px;top:470px;width:620px')}
  `));

  // ---- Studio logo (avatar for itch.io / Gumroad)
  jobs.push(() => compose('brand/studio-logo.png', 800, 800, `
    <div class="abs" style="inset:0;background:var(--ink)"></div>
    <div class="abs" style="left:200px;top:120px;width:400px;height:400px">${MARK.replace('class="mark"', 'style="width:400px;height:400px"')}</div>
    <p class="abs display" style="left:0;right:0;top:560px;text-align:center;font-size:62px;color:var(--star)">Starfruit</p>
    <p class="abs display" style="left:0;right:0;top:640px;text-align:center;font-size:40px;color:#fff;letter-spacing:.3em">ARCADE</p>
  `));

  // Run a few at a time to keep memory stable.
  await pool(jobs, 4, (job) => job());
}

try {
  if (!flag('skip-capture')) {
    console.log('Capturing gameplay…');
    await pool(CAPTURES, 3, capture);
    await captureHub();
  }
  console.log('Composing listing images…');
  await composeAll();
  if (!flag('skip-video')) {
    console.log('Recording trailers…');
    await recordTrailers();
  }
} finally {
  await browser.close();
  await server.close();
}
const count = (dir) => fs.readdirSync(path.join(OUT, dir)).length;
console.log(`\nDone → marketing/out/  (${['screenshots', 'fiverr', 'itch', 'gumroad', 'upwork', 'site', 'brand', 'video'].map((d) => `${d}: ${count(d)}`).join(', ')})`);
