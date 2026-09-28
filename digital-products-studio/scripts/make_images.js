// Store images for every product: real screenshots of the apps (driven in headless Chromium),
// composed into covers (1280×720), thumbnails (600×600), Etsy photos (2400×1800) and an itch.io cover.
// Run: NODE_PATH=$(npm root -g) node scripts/make_images.js
'use strict';
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'images');
const SHOTS = path.join(OUT, '_shots');
const PLANNER_IMG = path.resolve(ROOT, '../2027-money-planner/images/listing');
const P = (...p) => path.join(ROOT, 'products', ...p);
const url = (f) => 'file://' + f;
const shot = (prod, name) => url(path.join(SHOTS, prod, name));

async function captureShots(browser) {
  // ---- Neon Stack: title, natural play, mobile
  const game = url(P('neon-stack', 'src', 'index.html')) + '?test=1';
  for (const [name, vp] of [['desk', { width: 1280, height: 720 }], ['mob', { width: 420, height: 800 }]]) {
    const page = await browser.newPage({ viewport: vp });
    await page.goto(game);
    await page.waitForFunction(() => window.__neon);
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(SHOTS, 'neon-stack', `mk-title-${name}.png`) });
    await page.evaluate(() => __neon.tap());
    for (let i = 0; i < 18; i++) {
      await page.evaluate((k) => { __neon.setOffset([0, 4, 7, 0, 3, 9, 0, 0, 5][k % 9]); __neon.tap(); }, i);
      await page.waitForTimeout(260);
    }
    await page.evaluate(() => __neon.setOffset(0));
    await page.waitForTimeout(700);
    await page.screenshot({ path: path.join(SHOTS, 'neon-stack', `mk-play-${name}.png`) });
    await page.close();
  }

  // ---- Watermark Studio: our own product photos, watermarked
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const wm = await ctx.newPage();
  await wm.goto(url(P('watermark-studio', 'src', 'index.html')));
  const photos = ['etsy-bundle-01-hero.jpg', 'etsy-holiday-01-hero.jpg', 'etsy-debt-01-hero.jpg']
    .map((f) => path.join(PLANNER_IMG, f)).filter((f) => fs.existsSync(f));
  await wm.setInputFiles('#file-input', photos);
  await wm.waitForSelector('#file-list li');
  await wm.fill('#wm-text', '© {year} AMEM Sheets');
  await wm.fill('#text-size', '5');
  await wm.fill('#opacity', '75');
  await wm.fill('#pattern', 'shop-{n}');
  await wm.evaluate(() => { window.scrollTo(0, 0); document.querySelector('.settings').scrollTop = 0; });
  await wm.waitForTimeout(500);
  await wm.screenshot({ path: path.join(SHOTS, 'watermark-studio', 'mk-single.png') });
  await wm.click('label:has(input[name="layout"][value="tiled"])');
  await wm.fill('#angle', '-30');
  await wm.fill('#opacity', '35');
  await wm.fill('#text-size', '4');
  await wm.evaluate(() => { window.scrollTo(0, 0); document.querySelector('.settings').scrollTop = 0; });
  await wm.waitForTimeout(500);
  await wm.screenshot({ path: path.join(SHOTS, 'watermark-studio', 'mk-tiled.png') });
  await wm.locator('#preview').screenshot({ path: path.join(SHOTS, 'watermark-studio', 'mk-tiled-canvas.png') });
  await ctx.close();
}

// ------------------------------------------------------------------------------------------
// Composition
// ------------------------------------------------------------------------------------------
const CSS = `
*{box-sizing:border-box;margin:0;padding:0}
body{width:W;height:H;overflow:hidden;font-family:'DejaVu Sans','Liberation Sans',sans-serif;position:relative;background:BG;color:INK}
.h1{font-weight:800;letter-spacing:-1px;line-height:1.05}
.eyebrow{text-transform:uppercase;letter-spacing:4px;font-weight:700}
.pill{display:inline-block;border-radius:999px;font-weight:700;margin:0 10px 12px 0}
.card{background:#fff;border-radius:18px;box-shadow:0 18px 50px rgba(0,0,0,.25);overflow:hidden}
.card img,.frame img{display:block;width:100%}
.frame{background:#111;border-radius:22px;padding:12px;box-shadow:0 30px 70px rgba(0,0,0,.35)}
.frame .in{border-radius:10px;overflow:hidden}
.phone{background:#111;border-radius:34px;padding:12px;box-shadow:0 30px 70px rgba(0,0,0,.4)}
.phone img{display:block;width:100%;border-radius:24px}
ul.check li{list-style:none;padding-left:1.3em;position:relative;margin:.3em 0}
ul.check li:before{content:"✓";position:absolute;left:0;font-weight:800}
`;
const page = (w, h, bg, ink, body) =>
  `<!doctype html><html><head><meta charset="utf-8"><style>${CSS.replace('W', w + 'px').replace('H', h + 'px').replace('BG', bg).replace('INK', ink)}</style></head><body>${body}</body></html>`;

const THEMES = {
  'neon-stack': { bg: 'linear-gradient(135deg,#0b1020,#2a0f3d)', ink: '#fff', accent: '#6ff7ff', accent2: '#ff5cf4' },
  'invoice-studio': { bg: '#f5f6f4', ink: '#1f2522', accent: '#2f5d50', accent2: '#e9b872' },
  'watermark-studio': { bg: '#f6f5fb', ink: '#1d1b29', accent: '#5b3df5', accent2: '#ffc45c' },
  'py-automation-kit': { bg: 'linear-gradient(135deg,#0f172a,#1e293b)', ink: '#e2e8f0', accent: '#38bdf8', accent2: '#facc15' },
};

function pills(t, items, size = 22) {
  return items.map((x, i) => `<span class="pill" style="font-size:${size}px;padding:${size * 0.45}px ${size * 0.9}px;background:${i % 2 ? t.accent2 : t.accent};color:${i % 2 ? '#1d1b29' : (t.ink === '#fff' || t.ink === '#e2e8f0' ? '#0b1020' : '#fff')}">${x}</span>`).join('');
}

function jobs() {
  const J = [];
  const add = (prod, name, w, h, body) => J.push({ prod, name, w, h, html: page(w, h, THEMES[prod].bg, THEMES[prod].ink, body) });

  // ---------- Neon Stack
  let t = THEMES['neon-stack'];
  add('neon-stack', 'cover', 1280, 720, `
    <div class="frame" style="position:absolute;right:250px;top:150px;width:470px;transform:rotate(-2deg)"><div class="in"><img src="${shot('neon-stack', 'mk-play-desk.png')}"></div></div>
    <div class="phone" style="position:absolute;right:60px;top:70px;width:250px"><img src="${shot('neon-stack', 'mk-play-mob.png')}"></div>
    <div style="position:absolute;left:70px;top:90px;width:470px;z-index:2">
      <div class="eyebrow" style="font-size:18px;color:${t.accent}">HTML5 game · source code</div>
      <div class="h1" style="font-size:66px;margin-top:14px;background:linear-gradient(90deg,${t.accent},${t.accent2});-webkit-background-clip:text;color:transparent">NEON STACK</div>
      <div style="font-size:23px;margin-top:18px;opacity:.9;line-height:1.4">One-tap tower stacking game. Clean JavaScript you can reskin and publish.</div>
      <ul class="check" style="font-size:21px;margin-top:24px;line-height:1.4"><li>No engine, no dependencies</li><li>Mobile + desktop, retina-ready</li><li>Reskin in one config file</li><li>Portal and ad hooks included</li></ul>
    </div>`);
  add('neon-stack', 'thumb', 600, 600, `
    <img src="${url(P('neon-stack', 'src', 'assets', 'icon-512.png'))}" style="position:absolute;left:150px;top:70px;width:300px;border-radius:60px">
    <div class="h1" style="position:absolute;left:0;right:0;top:400px;text-align:center;font-size:58px;background:linear-gradient(90deg,${t.accent},${t.accent2});-webkit-background-clip:text;color:transparent">NEON STACK</div>
    <div style="position:absolute;left:0;right:0;top:480px;text-align:center;font-size:22px;opacity:.85">HTML5 game source code</div>`);
  add('neon-stack', 'itch-cover', 630, 500, `
    <img src="${shot('neon-stack', 'mk-play-mob.png')}" style="position:absolute;left:0;top:-330px;width:630px">
    <div style="position:absolute;left:0;right:0;bottom:0;height:150px;background:linear-gradient(transparent,rgba(5,8,20,.95))"></div>
    <div class="h1" style="position:absolute;left:30px;bottom:30px;font-size:54px;color:#fff;text-shadow:0 0 20px ${t.accent}">NEON STACK</div>`);
  add('neon-stack', 'gallery-1', 1280, 720, `
    <div style="position:absolute;left:70px;top:70px;width:600px">
      <div class="eyebrow" style="font-size:18px;color:${t.accent}">Reskin in 5 minutes</div>
      <div class="h1" style="font-size:54px;margin-top:14px">One file controls everything</div>
      <div style="font-size:22px;margin-top:20px;line-height:1.5;opacity:.9">Texts, colors, speed, difficulty, effects and ad frequency all live in <b>js/config.js</b>. Edit, reload, publish.</div>
      <div style="margin-top:28px">${pills(t, ['Vanilla JS', 'No build step', '14 automated tests'], 20)}</div>
    </div>
    <pre style="position:absolute;right:60px;top:90px;width:520px;background:#0d1117;color:#c9d1d9;border-radius:16px;padding:26px;font:18px/1.55 'DejaVu Sans Mono',monospace;box-shadow:0 20px 60px rgba(0,0,0,.5)">window.NEON_CONFIG = {
  text: { title: <span style="color:#a5d6ff">'NEON STACK'</span> },
  baseSpeed: <span style="color:#79c0ff">150</span>,
  maxSpeed: <span style="color:#79c0ff">330</span>,
  perfectTolerance: <span style="color:#79c0ff">5</span>,
  comboToGrow: <span style="color:#79c0ff">3</span>,
  startHue: <span style="color:#79c0ff">190</span>,
  hueStep: <span style="color:#79c0ff">7</span>,
  glow: <span style="color:#ff7b72">true</span>,
  particles: <span style="color:#ff7b72">true</span>,
  adBreakEveryNGames: <span style="color:#79c0ff">3</span>
};</pre>`);

  // ---------- Invoice Studio
  t = THEMES['invoice-studio'];
  add('invoice-studio', 'cover', 1280, 720, `
    <div style="position:absolute;left:60px;top:80px;width:470px">
      <div class="eyebrow" style="font-size:17px;color:${t.accent}">Offline web app</div>
      <div class="h1" style="font-size:66px;margin-top:12px;color:${t.accent}">Invoice Studio</div>
      <div style="font-size:23px;margin-top:16px;line-height:1.4;color:#4b5350">Professional invoices and quotes in your browser. PDF in one click. No subscription.</div>
      <ul class="check" style="font-size:20px;margin-top:20px;line-height:1.4"><li>Invoices, quotes and clients</li><li>Taxes, discounts, partial payments</li><li>40 currencies · 7 languages</li><li>Your data stays on your device</li></ul>
    </div>
    <div class="frame" style="position:absolute;right:40px;top:90px;width:700px"><div class="in"><img src="${shot('invoice-studio', 'editor-sample.png')}"></div></div>`);
  add('invoice-studio', 'thumb', 600, 600, `
    <div class="card" style="position:absolute;left:150px;top:60px;width:300px;transform:rotate(-3deg)"><img src="${shot('invoice-studio', 'doc-modern.png')}"></div>
    <div style="position:absolute;left:0;right:0;bottom:0;height:190px;background:${t.accent}"></div>
    <div class="h1" style="position:absolute;left:0;right:0;bottom:78px;text-align:center;font-size:52px;color:#fff">Invoice Studio</div>
    <div style="position:absolute;left:0;right:0;bottom:36px;text-align:center;font-size:22px;color:#fff;opacity:.9">Invoices &amp; quotes · offline</div>`);
  add('invoice-studio', 'etsy-01', 2400, 1800, `
    <div style="position:absolute;left:110px;top:130px;width:900px">
      <div class="eyebrow" style="font-size:34px;color:#b23a48">Invoice &amp; quote generator</div>
      <div class="h1" style="font-size:140px;margin-top:24px;color:${t.accent}">Invoice Studio</div>
      <div style="font-size:50px;margin-top:30px;line-height:1.35;color:#4b5350">Create invoices &amp; quotes in seconds. Save as PDF. <b style="color:${t.accent}">No subscription.</b></div>
      <ul class="check" style="font-size:42px;margin-top:44px;line-height:1.4"><li>Works offline in your browser</li><li>Taxes, discounts, payments</li><li>40 currencies · 7 languages</li><li>3 designs + your logo</li></ul>
      <div style="margin-top:48px">${pills(t, ['Instant download', 'Private: no account'], 34)}</div>
    </div>
    <div class="frame" style="position:absolute;right:90px;top:160px;width:1260px"><div class="in"><img src="${shot('invoice-studio', 'editor-sample.png')}"></div></div>
    <div class="card" style="position:absolute;right:980px;bottom:110px;width:430px;transform:rotate(-3deg)"><img src="${shot('invoice-studio', 'doc-modern.png')}"></div>`);
  add('invoice-studio', 'etsy-02', 2400, 1800, `
    <div style="text-align:center;padding-top:80px"><div class="eyebrow" style="font-size:32px;color:#b23a48">3 designs · your logo · your colors</div>
    <div class="h1" style="font-size:100px;margin-top:16px;color:${t.accent}">Invoices that look professional</div></div>
    ${['modern', 'classic', 'minimal'].map((d, i) => `<div class="card" style="position:absolute;left:${130 + i * 730}px;top:420px;width:680px"><img src="${shot('invoice-studio', 'doc-' + d + '.png')}"></div>`).join('')}`);
  add('invoice-studio', 'etsy-03', 2400, 1800, `
    <div style="position:absolute;left:110px;top:100px;width:1000px">
      <div class="eyebrow" style="font-size:32px;color:#b23a48">Dashboard</div>
      <div class="h1" style="font-size:96px;margin-top:16px;color:${t.accent}">Know who owes you, at a glance</div>
      <ul class="check" style="font-size:44px;margin-top:40px;line-height:1.45"><li>Outstanding, overdue &amp; paid totals</li><li>Overdue invoices flagged automatically</li><li>Quote → invoice in one click</li><li>Backup &amp; CSV export for your accountant</li></ul>
    </div>
    <div class="frame" style="position:absolute;left:110px;bottom:90px;width:1300px"><div class="in"><img src="${shot('invoice-studio', 'list.png')}"></div></div>
    <div class="phone" style="position:absolute;right:170px;top:220px;width:560px"><img src="${shot('invoice-studio', 'mobile-list.png')}"></div>`);

  // ---------- Watermark Studio
  t = THEMES['watermark-studio'];
  add('watermark-studio', 'cover', 1280, 720, `
    <div style="position:absolute;left:60px;top:80px;width:470px">
      <div class="eyebrow" style="font-size:17px;color:${t.accent}">Batch photo tool</div>
      <div class="h1" style="font-size:62px;margin-top:12px;color:${t.accent}">Watermark Studio</div>
      <div style="font-size:23px;margin-top:16px;line-height:1.4;color:#4b5350">Watermark, resize &amp; rename hundreds of photos at once. <b>Nothing is uploaded.</b></div>
      <ul class="check" style="font-size:20px;margin-top:20px;line-height:1.4"><li>Text or logo watermarks</li><li>Tiled anti-theft pattern</li><li>Resize, convert, rename</li><li>One ZIP download</li></ul>
    </div>
    <div class="frame" style="position:absolute;right:40px;top:90px;width:700px"><div class="in"><img src="${shot('watermark-studio', 'mk-single.png')}"></div></div>`);
  add('watermark-studio', 'thumb', 600, 600, `
    <div class="card" style="position:absolute;left:60px;top:60px;width:480px"><img src="${shot('watermark-studio', 'mk-tiled-canvas.png')}"></div>
    <div style="position:absolute;left:0;right:0;bottom:0;height:190px;background:${t.accent}"></div>
    <div class="h1" style="position:absolute;left:0;right:0;bottom:78px;text-align:center;font-size:48px;color:#fff">Watermark Studio</div>
    <div style="position:absolute;left:0;right:0;bottom:36px;text-align:center;font-size:22px;color:#fff;opacity:.9">Batch · private · offline</div>`);
  add('watermark-studio', 'etsy-01', 2400, 1800, `
    <div style="position:absolute;left:110px;top:130px;width:900px">
      <div class="eyebrow" style="font-size:34px;color:#c43a54">For Etsy sellers &amp; photographers</div>
      <div class="h1" style="font-size:130px;margin-top:24px;color:${t.accent}">Watermark Studio</div>
      <div style="font-size:50px;margin-top:30px;line-height:1.35;color:#4b5350">Protect <b style="color:${t.accent}">hundreds of photos</b> in seconds. Nothing is uploaded.</div>
      <ul class="check" style="font-size:42px;margin-top:44px;line-height:1.4"><li>Text or logo watermark</li><li>Tiled anti-theft pattern</li><li>Resize &amp; rename in bulk</li><li>Works offline, on any computer</li></ul>
      <div style="margin-top:48px">${pills(t, ['Instant download', 'No subscription'], 34)}</div>
    </div>
    <div class="frame" style="position:absolute;right:90px;top:170px;width:1260px"><div class="in"><img src="${shot('watermark-studio', 'mk-single.png')}"></div></div>`);
  add('watermark-studio', 'etsy-02', 2400, 1800, `
    <div style="text-align:center;padding-top:80px"><div class="eyebrow" style="font-size:32px;color:#c43a54">Anti-theft mode</div>
    <div class="h1" style="font-size:100px;margin-top:16px;color:${t.accent}">Make your photos hard to steal</div></div>
    <div class="card" style="position:absolute;left:260px;right:260px;top:420px"><img src="${shot('watermark-studio', 'mk-tiled-canvas.png')}"></div>`);
  add('watermark-studio', 'etsy-03', 2400, 1800, `
    <div style="position:absolute;left:110px;top:100px;width:1050px">
      <div class="eyebrow" style="font-size:32px;color:#c43a54">Everything in one place</div>
      <div class="h1" style="font-size:96px;margin-top:16px;color:${t.accent}">Watermark, resize, rename, done</div>
      <ul class="check" style="font-size:44px;margin-top:40px;line-height:1.5"><li>9 positions or tiled</li><li>Fonts, color, opacity, rotation, outline</li><li>JPG · PNG · WebP output</li><li>shop-01.jpg, shop-02.jpg… renaming</li><li>Removes GPS location data</li></ul>
    </div>
    <div class="frame" style="position:absolute;right:90px;bottom:90px;width:1250px"><div class="in"><img src="${shot('watermark-studio', 'mk-tiled.png')}"></div></div>`);

  // ---------- Python Automation Kit
  t = THEMES['py-automation-kit'];
  const scripts = ['organize_folder', 'bulk_rename', 'find_duplicates', 'image_tool', 'pdf_tool', 'csv_report',
    'merge_spreadsheets', 'backup_folder', 'site_monitor', 'mail_merge', 'extract_contacts'];
  add('py-automation-kit', 'cover', 1280, 720, `
    <div style="position:absolute;left:60px;top:80px;width:520px">
      <div class="eyebrow" style="font-size:17px;color:${t.accent}">11 ready-to-use scripts</div>
      <div class="h1" style="font-size:62px;margin-top:12px;color:#fff">Python Automation Kit</div>
      <div style="font-size:23px;margin-top:16px;line-height:1.4;opacity:.9">Stop doing boring computer work by hand. Files, images, PDFs, Excel, backups, email.</div>
      <div style="margin-top:26px">${pills(t, ['Windows · macOS · Linux', 'Preview + undo', 'Beginner menu'], 18)}</div>
    </div>
    <pre style="position:absolute;right:50px;top:70px;width:590px;background:#0d1117;color:#c9d1d9;border-radius:16px;padding:22px 26px;font:17px/1.6 'DejaVu Sans Mono',monospace;box-shadow:0 20px 60px rgba(0,0,0,.5)"><span style="color:#8b949e">$</span> python toolkit.py

<span style="color:${t.accent2}">Python Automation Kit</span>
========================================
${scripts.map((s, i) => ` <span style="color:#79c0ff">${String(i + 1).padStart(2)}.</span> ${s}.py`).join('\n')}
  0. Quit
<span style="color:#7ee787">Choose a number:</span> _</pre>`);
  add('py-automation-kit', 'thumb', 600, 600, `
    <div style="position:absolute;left:0;right:0;top:120px;text-align:center;font:800 150px 'DejaVu Sans Mono',monospace;color:${t.accent}">&gt;_</div>
    <div class="h1" style="position:absolute;left:0;right:0;top:360px;text-align:center;font-size:50px;color:#fff">Python<br>Automation Kit</div>
    <div style="position:absolute;left:0;right:0;bottom:50px;text-align:center;font-size:22px;color:${t.accent2}">11 time-saving scripts</div>`);
  return J;
}

(async () => {
  const browser = await chromium.launch();
  await captureShots(browser);
  const tmp = fs.mkdtempSync(path.join(require('os').tmpdir(), 'mk-'));
  for (const j of jobs()) {
    const dir = path.join(OUT, j.prod);
    fs.mkdirSync(dir, { recursive: true });
    const html = path.join(tmp, `${j.prod}-${j.name}.html`);
    fs.writeFileSync(html, j.html);
    const page = await browser.newPage({ viewport: { width: j.w, height: j.h } });
    await page.goto(url(html));
    await page.waitForLoadState('networkidle');
    const out = path.join(dir, `${j.name}.jpg`);
    await page.screenshot({ path: out, type: 'jpeg', quality: 88 });
    await page.close();
    console.log(path.relative(ROOT, out));
  }
  await browser.close();
})();
