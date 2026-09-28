// Demo videos for store pages and social media, recorded from the real products in headless Chromium.
//
// - Neon Stack is captured frame by frame. The script owns the game's animation clock and a small bot
//   plays (mostly PERFECT drops), so the video is perfectly smooth on any machine.
// - Invoice Studio and Watermark Studio are recorded in real time with the DevTools screencast. A drawn
//   cursor and captions explain each step (store videos autoplay muted), and each video ends on a title
//   card. They stay within 15 seconds, Etsy's limit for listing videos.
//
// Outputs in images/<product>/: video-*.mp4 (H.264; 9:16 cuts for TikTok, Reels and Shorts) and *.gif.
// Run: NODE_PATH=$(npm root -g) node scripts/make_videos.js [neon] [invoice] [watermark]
// Needs Playwright with Chromium, and ffmpeg (set FFMPEG, or `pip install imageio-ffmpeg`).
'use strict';
const path = require('path');
const fs = require('fs');
const os = require('os');
const { execFileSync } = require('child_process');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'images');
const PHOTOS = path.join(__dirname, 'demo-photos');
const PLANNER_IMG = path.resolve(ROOT, '../2027-money-planner/images/listing');
const P = (...p) => path.join(ROOT, 'products', ...p);
const url = (f) => 'file://' + f;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const FPS = 30;
const FONT = "'DejaVu Sans','Liberation Sans',sans-serif";

const FFMPEG = process.env.FFMPEG || (() => {
  try {
    return execFileSync('python3', ['-c', 'import imageio_ffmpeg; print(imageio_ffmpeg.get_ffmpeg_exe())'],
      { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
  } catch (e) {
    return 'ffmpeg';
  }
})();
const ffmpeg = (...args) => execFileSync(FFMPEG, ['-y', '-hide_banner', '-loglevel', 'error', ...args], { stdio: 'inherit' });
const H264 = ['-c:v', 'libx264', '-preset', 'slow', '-crf', '20', '-pix_fmt', 'yuv420p', '-r', String(FPS), '-movflags', '+faststart'];
const gifFilter = (fps, width, colors) =>
  `fps=${fps},scale=${width}:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=${colors}:stats_mode=diff[p];` +
  '[b][p]paletteuse=dither=bayer:bayer_scale=4:diff_mode=rectangle';

function report(file, seconds) {
  const mb = (fs.statSync(file).size / 1048576).toFixed(1);
  console.log(`  ${path.relative(ROOT, file)}  ${mb} MB${seconds ? `  ${seconds.toFixed(1)} s` : ''}`);
}

async function renderCard(browser, tmp, name, w, h, bg, body) {
  const html = path.join(tmp, name + '.html');
  fs.writeFileSync(html, `<!doctype html><meta charset="utf-8"><style>*{box-sizing:border-box;margin:0;padding:0}
    body{width:${w}px;height:${h}px;overflow:hidden;position:relative;font-family:${FONT};background:${bg};color:#fff}</style>${body}`);
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  await page.goto(url(html));
  const png = path.join(tmp, name + '.png');
  await page.screenshot({ path: png });
  await page.close();
  return png;
}

// ------------------------------------------------------------------------------------------
// Neon Stack: frame-by-frame capture
// ------------------------------------------------------------------------------------------
const NEON = { bg: 'radial-gradient(ellipse at 50% 30%,#2a0f3d,#0b1020 70%)', a: '#6ff7ff', b: '#ff5cf4' };
const neonTitle = (size) => `<div style="font-size:${size}px;font-weight:900;letter-spacing:.04em;line-height:1;` +
  `background:linear-gradient(90deg,${NEON.a},${NEON.b});-webkit-background-clip:text;background-clip:text;color:transparent">NEON STACK</div>`;

// One entry per drop: 0 = PERFECT, n = land about n units off (a piece is sliced off), 'miss' = end the run.
const NEON_PLAN = [0, 0, 0, 14, 0, 0, 0, 0, 12, 0, 0, 0, 16, 0, 0, 0, 0, 0, 13, 0, 0, 0, 0, 0, 0, 'miss'];

function steppedClock() {
  // Replaces the browser's animation clock: the script advances it one video frame at a time.
  let queue = [];
  let now = 0;
  window.requestAnimationFrame = (cb) => queue.push(cb);
  window.__advance = (ms) => {
    now += ms;
    const due = queue;
    queue = [];
    due.forEach((cb) => cb(now));
  };
}

function neonBot(plan) {
  const N = window.__neon;
  let i = 0;
  let current = null;
  let born = 0;
  let prev = Infinity;
  window.__bot = () => {
    const s = N.state;
    const m = s.moving;
    if (s.mode !== 'playing' || !m || i >= plan.length) return;
    if (m !== current) {
      current = m;
      born = s.time;
      prev = Infinity;
    }
    const t = N.top();
    const off = Math.abs(m[m.axis] - t[m.axis]);
    const goal = plan[i];
    const drop = goal === 'miss' ? s.time - born > 0.15 && off > (m.axis === 'x' ? t.w : t.d) + 4
      : goal === 0 ? off <= 4.5 // within the 5-unit PERFECT tolerance
        : off <= goal && prev > goal;
    prev = off;
    if (drop) {
      i++;
      N.tap();
    }
  };
}

async function recordNeon(browser, tmp) {
  const dir = path.join(tmp, 'neon');
  fs.mkdirSync(dir);
  const ctx = await browser.newContext({ viewport: { width: 540, height: 960 }, deviceScaleFactor: 2 });
  await ctx.addInitScript(steppedClock);
  const page = await ctx.newPage();
  await page.goto(url(P('neon-stack', 'src', 'index.html')) + '?test=1');
  await page.waitForFunction(() => window.__neon && window.__advance);
  await page.evaluate(neonBot, NEON_PLAN);
  // CSS animations (the pulsing "TAP TO PLAY", the combo pop) run on the real clock, which moves
  // faster than the stepped game clock here: slow them down to match once the pace is known.
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Animation.enable');
  let n = 0;
  const started = Date.now();
  async function frame(bot) {
    const mode = await page.evaluate((bot) => {
      for (let k = 0; k < 2; k++) {
        window.__advance(1000 / 60);
        if (bot) window.__bot();
      }
      return window.__neon.state.mode;
    }, bot);
    await page.screenshot({ path: path.join(dir, `f${String(n++).padStart(5, '0')}.jpg`), type: 'jpeg', quality: 92 });
    if (n === 10) {
      const realMsPerFrame = (Date.now() - started) / n;
      await cdp.send('Animation.setPlaybackRate', { playbackRate: Math.min(1, 1000 / FPS / realMsPerFrame) });
    }
    return mode;
  }
  for (let i = 0; i < 1.2 * FPS; i++) await frame(false); // title screen
  const startFrame = n;
  await page.evaluate(() => window.__neon.tap());
  while ((await frame(true)) !== 'over') {
    if (n > 60 * FPS) throw new Error('the Neon Stack bot did not finish its run');
  }
  for (let i = 0; i < 1.8 * FPS; i++) await frame(false); // game-over screen
  const score = await page.evaluate(() => window.__neon.state.score);
  await ctx.close();
  return { dir, frames: n, startFrame, score };
}

async function makeNeon(browser, tmp) {
  const rec = await recordNeon(browser, tmp);
  const icon = url(P('neon-stack', 'src', 'assets', 'icon-512.png'));
  const center = 'position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center';
  const pill = (text, color, size) => `<span style="display:inline-block;margin:0 10px;font-size:${size}px;font-weight:800;` +
    `padding:${size * 0.5}px ${size * 1.05}px;border-radius:999px;background:${color};color:#0b1020">${text}</span>`;

  const endVertical = await renderCard(browser, tmp, 'neon-end-vertical', 1080, 1920, NEON.bg, `
    <div style="${center}">
      <img src="${icon}" style="width:280px;border-radius:64px;box-shadow:0 0 90px rgba(111,247,255,.35)">
      <div style="margin-top:70px">${neonTitle(150)}</div>
      <div style="font-size:72px;font-weight:800;margin-top:70px">Can you beat ${rec.score}?</div>
      <div style="margin-top:60px">${pill('Play free in your browser', NEON.a, 46)}</div>
      <div style="font-size:38px;margin-top:40px;opacity:.75">on itch.io</div>
    </div>`);

  const X = 1250;
  const Y = 60; // where the 540×960 gameplay sits in the 16:9 frame
  const background = await renderCard(browser, tmp, 'neon-background', 1920, 1080, NEON.bg, `
    <div style="position:absolute;left:120px;top:150px;width:1010px">
      <div style="font-size:28px;font-weight:700;letter-spacing:6px;color:${NEON.a}">HTML5 GAME · FULL SOURCE CODE</div>
      <div style="margin-top:26px">${neonTitle(128)}</div>
      <div style="font-size:40px;line-height:1.35;margin-top:34px;opacity:.92">A one-tap arcade game you can reskin and publish.</div>
      <ul style="list-style:none;font-size:34px;line-height:1.55;margin-top:44px">${[
        'No engine, no dependencies: plain JavaScript',
        'Texts, colors and difficulty in one config file',
        'Mobile and desktop, retina-ready',
        'Game-portal and ad hooks included',
      ].map((t) => `<li style="padding-left:52px;position:relative"><span style="position:absolute;left:0;color:${NEON.a};font-weight:800">✓</span>${t}</li>`).join('')}</ul>
    </div>
    <div style="position:absolute;left:${X - 20}px;top:${Y - 20}px;width:580px;height:1000px;border-radius:44px;background:#05060d;
      box-shadow:0 0 0 2px rgba(111,247,255,.35),0 30px 80px rgba(0,0,0,.6)"></div>`);

  const end16x9 = await renderCard(browser, tmp, 'neon-end-16x9', 1920, 1080, NEON.bg, `
    <div style="${center}">
      <img src="${icon}" style="width:200px;border-radius:46px;box-shadow:0 0 70px rgba(111,247,255,.35)">
      <div style="margin-top:44px">${neonTitle(130)}</div>
      <div style="font-size:44px;margin-top:34px;opacity:.92">HTML5 game source code · instant download</div>
      <div style="margin-top:48px">${pill('No engine', NEON.a, 32)}${pill('Reskin in minutes', NEON.b, 32)}${pill('Mobile + desktop', NEON.a, 32)}</div>
    </div>`);

  const seq = path.join(rec.dir, 'f%05d.jpg');
  const seconds = rec.frames / FPS;
  const FADE = 0.4;
  const END = 2.6;
  const norm = `fps=${FPS},settb=AVTB,setsar=1,format=yuv420p`;
  const xfade = `xfade=transition=fade:duration=${FADE}:offset=${(seconds - FADE).toFixed(3)}`;
  const out = (f) => path.join(OUT, 'neon-stack', f);
  const still = (png) => ['-loop', '1', '-framerate', String(FPS), '-t', String(END), '-i', png];

  ffmpeg('-framerate', String(FPS), '-i', seq, ...still(endVertical),
    '-filter_complex', `[0:v]${norm}[a];[1:v]${norm}[b];[a][b]${xfade}[v]`,
    '-map', '[v]', ...H264, out('video-gameplay-vertical.mp4'));
  report(out('video-gameplay-vertical.mp4'), seconds + END - FADE);

  ffmpeg('-loop', '1', '-framerate', String(FPS), '-i', background, '-framerate', String(FPS), '-i', seq, ...still(end16x9),
    '-filter_complex', `[1:v]scale=540:960:flags=lanczos[g];[0:v][g]overlay=x=${X}:y=${Y}:shortest=1,${norm}[a];[2:v]${norm}[b];[a][b]${xfade}[v]`,
    '-map', '[v]', ...H264, out('video-source-code.mp4'));
  report(out('video-source-code.mp4'), seconds + END - FADE);

  // 6 looping seconds of play, starting 1 s into the run
  ffmpeg('-framerate', String(FPS), '-start_number', String(rec.startFrame + FPS), '-t', '6', '-i', seq,
    '-vf', gifFilter(15, 360, 128), '-loop', '0', out('gameplay.gif'));
  report(out('gameplay.gif'));
  console.log(`  bot score: ${rec.score}`);
}

// ------------------------------------------------------------------------------------------
// Web apps: real-time screencast with a drawn cursor, captions and an end card
// ------------------------------------------------------------------------------------------
function demoUi(opts) {
  const css = document.createElement('style');
  css.textContent = `
    #demo-cursor{position:fixed;left:0;top:0;width:30px;height:30px;z-index:2147483647;pointer-events:none;
      transform:translate(${innerWidth / 2}px,${innerHeight / 2}px);transition:transform .5s cubic-bezier(.25,.8,.25,1),opacity .3s;
      filter:drop-shadow(0 2px 3px rgba(0,0,0,.4))}
    #demo-cursor svg{position:absolute;left:0;top:0}
    #demo-cursor i{position:absolute;left:-12px;top:-13px;width:32px;height:32px;border-radius:50%;background:${opts.accent};opacity:0}
    #demo-cursor.click i{animation:demo-ripple .5s ease-out}
    @keyframes demo-ripple{from{transform:scale(.3);opacity:.6}to{transform:scale(1.9);opacity:0}}
    #demo-caption{position:fixed;left:50%;bottom:34px;z-index:2147483646;pointer-events:none;transform:translate(-50%,16px);
      background:rgba(20,20,30,.9);color:#fff;font:700 28px/1.25 ${opts.font};padding:15px 30px;border-radius:999px;
      opacity:0;transition:opacity .25s,transform .25s;white-space:nowrap;box-shadow:0 12px 30px rgba(0,0,0,.25)}
    #demo-caption.on{opacity:1;transform:translate(-50%,0)}
    #demo-end{position:fixed;inset:0;z-index:2147483645;display:flex;flex-direction:column;align-items:center;
      justify-content:center;text-align:center;background:${opts.bg};color:${opts.ink};font-family:${opts.font};
      opacity:0;transition:opacity .5s;pointer-events:none}
    #demo-end.on{opacity:1}`;
  document.head.appendChild(css);
  const cursor = document.createElement('div');
  cursor.id = 'demo-cursor';
  cursor.innerHTML = '<i></i><svg viewBox="0 0 24 24" width="30" height="30"><path d="M3 2l17 10.5-7.4 1.7-3.9 7z" ' +
    'fill="#fff" stroke="#111" stroke-width="1.5" stroke-linejoin="round"/></svg>';
  const caption = document.createElement('div');
  caption.id = 'demo-caption';
  const end = document.createElement('div');
  end.id = 'demo-end';
  end.innerHTML = opts.end;
  document.body.append(end, caption, cursor);
  window.__demo = {
    move(x, y) { cursor.style.transform = `translate(${x - 3.75}px,${y - 2.5}px)`; }, // the arrow's tip lands on (x, y)
    click() {
      cursor.classList.remove('click');
      void cursor.offsetWidth; // restart the ripple
      cursor.classList.add('click');
    },
    caption(text) {
      const swap = () => { caption.textContent = text; caption.classList.add('on'); };
      if (caption.classList.contains('on')) {
        caption.classList.remove('on');
        setTimeout(swap, 250);
      } else swap();
    },
    end() {
      caption.classList.remove('on');
      cursor.style.opacity = '0';
      end.classList.add('on');
    },
  };
}

function endCard(t, name, tagline, pills) {
  return `
    <div style="font-size:26px;font-weight:700;letter-spacing:6px;text-transform:uppercase;color:${t.accent}">Instant download</div>
    <div style="font-size:104px;font-weight:800;letter-spacing:-2px;margin-top:18px;color:${t.accent}">${name}</div>
    <div style="font-size:38px;margin-top:20px;opacity:.85">${tagline}</div>
    <div style="margin-top:46px">${pills.map((p, i) => `<span style="display:inline-block;margin:0 9px;font-size:28px;font-weight:700;` +
      `padding:14px 30px;border-radius:999px;background:${i % 2 ? t.accent2 : t.accent};color:${i % 2 ? t.ink : '#fff'}">${p}</span>`).join('')}</div>`;
}

const caption = (page, text) => page.evaluate((t) => window.__demo.caption(t), text);

async function pointAt(page, selector) {
  const loc = page.locator(selector).first();
  const scrolled = await loc.evaluate((el) => {
    const r = el.getBoundingClientRect();
    if (r.top >= 70 && r.bottom <= window.innerHeight - 110) return false; // clear of the caption
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return true;
  });
  if (scrolled) await sleep(500);
  const b = await loc.boundingBox();
  await page.evaluate(([x, y]) => window.__demo.move(x, y), [b.x + b.width / 2, b.y + b.height / 2]);
  await sleep(520);
  await page.evaluate(() => window.__demo.click());
  return loc;
}
async function clickOn(page, selector) {
  await (await pointAt(page, selector)).click();
}
async function typeInto(page, selector, text) {
  const loc = await pointAt(page, selector);
  await loc.fill('');
  await loc.pressSequentially(text, { delay: 40 });
}
async function choose(page, selector, value) {
  await pointAt(page, selector);
  await page.selectOption(selector, value);
}

async function screencast(page, script) {
  const cdp = await page.context().newCDPSession(page);
  const frames = [];
  cdp.on('Page.screencastFrame', (f) => {
    frames.push({ data: f.data, t: f.metadata.timestamp || Date.now() / 1000 });
    cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {});
  });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: 1920, maxHeight: 1080, everyNthFrame: 1 });
  const marks = await script();
  const end = Date.now() / 1000;
  await cdp.send('Page.stopScreencast');
  return { frames, end, marks };
}

// Screencast frames arrive only when the screen changes: each one is held until the next.
function encodeScreencast(rec, dir, out, maxSeconds) {
  fs.mkdirSync(dir);
  const name = (i) => `f${String(i).padStart(5, '0')}.jpg`;
  const list = ['ffconcat version 1.0'];
  rec.frames.forEach((f, i) => {
    fs.writeFileSync(path.join(dir, name(i)), Buffer.from(f.data, 'base64'));
    const next = i + 1 < rec.frames.length ? rec.frames[i + 1].t : rec.end;
    list.push(`file ${name(i)}`, `duration ${Math.max(0.001, next - f.t).toFixed(4)}`);
  });
  list.push(`file ${name(rec.frames.length - 1)}`);
  fs.writeFileSync(path.join(dir, 'list.ffconcat'), list.join('\n') + '\n');
  ffmpeg('-f', 'concat', '-safe', '0', '-i', path.join(dir, 'list.ffconcat'), '-t', String(maxSeconds),
    '-vf', `scale=1920:1080:flags=lanczos,fps=${FPS},setsar=1,format=yuv420p`, ...H264, out);
  const seconds = Math.min(maxSeconds, rec.end - rec.frames[0].t);
  report(out, seconds);
  return seconds;
}

function appGif(video, out) {
  ffmpeg('-ss', '1.2', '-t', '8', '-i', video, '-vf', gifFilter(10, 800, 128), '-loop', '0', out);
  report(out);
}

// 9:16 version for TikTok, Reels and Shorts: the demo in the middle, a headline above, the name below,
// clear of the areas those apps cover with their own buttons and captions.
async function verticalCut(browser, tmp, t, video, out, [eyebrow, headline], [name, note]) {
  const frame = await renderCard(browser, tmp, path.basename(out, '.mp4'), 1080, 1920, t.bg, `
    <div style="position:absolute;left:70px;right:70px;top:230px;text-align:center;color:${t.ink}">
      <div style="font-size:30px;font-weight:700;letter-spacing:5px;text-transform:uppercase;color:${t.accent}">${eyebrow}</div>
      <div style="font-size:84px;font-weight:800;line-height:1.1;letter-spacing:-1px;margin-top:26px">${headline}</div>
    </div>
    <div style="position:absolute;left:0;top:600px;width:1080px;height:608px;box-shadow:0 24px 60px rgba(0,0,0,.18)"></div>
    <div style="position:absolute;left:0;right:0;top:1290px;text-align:center;color:${t.ink}">
      <div style="font-size:66px;font-weight:800;color:${t.accent}">${name}</div>
      <div style="font-size:38px;margin-top:18px;opacity:.8">${note}</div>
    </div>`);
  ffmpeg('-loop', '1', '-framerate', String(FPS), '-i', frame, '-i', video,
    '-filter_complex', `[1:v]scale=1080:608:flags=lanczos[v];[0:v][v]overlay=x=0:y=600:shortest=1,fps=${FPS},setsar=1,format=yuv420p[o]`,
    '-map', '[o]', ...H264, out);
  report(out);
}

async function appPage(browser, file, theme, endHtml) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1.5, acceptDownloads: true });
  const page = await ctx.newPage();
  page.on('dialog', (d) => d.accept());
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(url(file));
  return { ctx, page, errors, ui: () => page.evaluate(demoUi, { ...theme, font: FONT, end: endHtml }) };
}

async function makeInvoice(browser, tmp) {
  const t = { bg: '#f5f6f4', ink: '#1f2522', accent: '#2f5d50', accent2: '#e9b872' };
  const { ctx, page, errors, ui } = await appPage(browser, P('invoice-studio', 'src', 'index.html'), t,
    endCard(t, 'Invoice Studio', 'Offline invoice &amp; quote generator', ['Works offline', 'PDF in one click', 'No subscription']));
  await page.addStyleTag({ content: '.toast{display:none!important}' });
  await page.click('text=Explore with sample data');
  await page.waitForSelector('table.list tbody tr');
  await ui();
  await sleep(300);
  const line = (i, field) => `.item-row >> nth=${i} >> .item-${field}`;
  const rec = await screencast(page, async () => {
    const t0 = Date.now();
    await caption(page, 'Invoices & quotes that work offline');
    await sleep(1300);
    await clickOn(page, '#new-doc');
    await page.waitForSelector('.editor');
    await caption(page, 'Totals and taxes update as you type');
    await choose(page, '#doc-client', { label: 'Acme Coffee Roasters' });
    await typeInto(page, line(0, 'desc'), 'Brand identity design');
    await typeInto(page, line(0, 'price'), '1200');
    await clickOn(page, '#add-item');
    await typeInto(page, line(1, 'desc'), 'Business cards (500)');
    await typeInto(page, line(1, 'price'), '180');
    await caption(page, 'Track payments · save as PDF');
    await choose(page, '#doc-status', 'paid');
    await page.waitForSelector('.preview-wrap .stamp');
    await sleep(1100);
    const endAt = (Date.now() - t0) / 1000;
    await page.evaluate(() => window.__demo.end());
    await sleep(2700);
    return { endAt };
  });
  await ctx.close();
  if (errors.length) throw new Error('Invoice Studio: ' + errors.join('; '));
  console.log(`  end card at ${rec.marks.endAt.toFixed(1)} s`);
  const video = path.join(OUT, 'invoice-studio', 'video-demo.mp4');
  encodeScreencast(rec, path.join(tmp, 'invoice'), video, 15);
  appGif(video, path.join(OUT, 'invoice-studio', 'demo.gif'));
  await verticalCut(browser, tmp, t, video, path.join(OUT, 'invoice-studio', 'video-demo-vertical.mp4'),
    ['For freelancers &amp; small businesses', 'Professional invoices in seconds'], ['Invoice Studio', 'Works offline · no subscription']);
}

async function makeWatermark(browser, tmp) {
  const t = { bg: '#f6f5fb', ink: '#1d1b29', accent: '#5b3df5', accent2: '#ffc45c' };
  const { ctx, page, errors, ui } = await appPage(browser, P('watermark-studio', 'src', 'index.html'), t,
    endCard(t, 'Watermark Studio', 'Batch watermark, resize &amp; rename photos', ['Nothing is uploaded', 'Text or logo', 'One ZIP download']));
  await ui();
  await sleep(300);
  const photos = [
    path.join(PHOTOS, 'latte.jpg'), path.join(PHOTOS, 'cat.jpg'), path.join(PHOTOS, 'rocket-launch.jpg'),
    path.join(PLANNER_IMG, 'etsy-bundle-01-hero.jpg'), path.join(PLANNER_IMG, 'etsy-holiday-01-hero.jpg'),
  ].filter((f) => fs.existsSync(f));
  const rec = await screencast(page, async () => {
    const t0 = Date.now();
    await caption(page, 'Add your photos, as many as you like');
    await pointAt(page, '#dropzone');
    await page.setInputFiles('#file-input', photos);
    await page.waitForSelector(`#file-list li >> nth=${photos.length - 1}`);
    await sleep(800);
    await caption(page, 'Type your watermark or add a logo');
    await typeInto(page, '#wm-text', '© 2026 Your Shop');
    await sleep(500);
    await caption(page, 'Tiled pattern stops photo theft');
    await clickOn(page, 'label:has(input[name="layout"][value="tiled"])');
    await sleep(900);
    await caption(page, 'Resize, convert and rename in bulk');
    await choose(page, '#resize-mode', 'long'); // longest side 2000 px (the default size)
    await choose(page, '#format', 'jpeg');
    await typeInto(page, '#pattern', 'shop-photo-{n}');
    await caption(page, 'One ZIP. Nothing is uploaded.');
    const download = page.waitForEvent('download');
    await clickOn(page, '#download');
    await download;
    await sleep(1000);
    const endAt = (Date.now() - t0) / 1000;
    await page.evaluate(() => window.__demo.end());
    await sleep(2700);
    return { endAt };
  });
  await ctx.close();
  if (errors.length) throw new Error('Watermark Studio: ' + errors.join('; '));
  console.log(`  end card at ${rec.marks.endAt.toFixed(1)} s`);
  const video = path.join(OUT, 'watermark-studio', 'video-demo.mp4');
  encodeScreencast(rec, path.join(tmp, 'watermark'), video, 15);
  appGif(video, path.join(OUT, 'watermark-studio', 'demo.gif'));
  await verticalCut(browser, tmp, t, video, path.join(OUT, 'watermark-studio', 'video-demo-vertical.mp4'),
    ['For Etsy sellers &amp; photographers', 'Watermark all your photos at once'], ['Watermark Studio', 'Private: nothing is uploaded']);
}

(async () => {
  const only = process.argv.slice(2);
  const want = (k) => !only.length || only.includes(k);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'amem-videos-'));
  const browser = await chromium.launch();
  try {
    if (want('neon')) { console.log('Neon Stack'); await makeNeon(browser, tmp); }
    if (want('invoice')) { console.log('Invoice Studio'); await makeInvoice(browser, tmp); }
    if (want('watermark')) { console.log('Watermark Studio'); await makeWatermark(browser, tmp); }
  } finally {
    await browser.close();
    fs.rmSync(tmp, { recursive: true, force: true });
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
