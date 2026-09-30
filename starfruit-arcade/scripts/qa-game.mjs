#!/usr/bin/env node
// Automated QA for one HTML5 game (see docs/GAME-STANDARD.md §8).
//
//   node scripts/qa-game.mjs games/neon-stack [--play-seconds=6] [--demo-seconds=8]
//        [--only=desktop,mobile,iframe] [--no-file] [--out=.qa/custom]
//
// For each viewport it loads the game, checks the window.__GAME__ API, presses Play,
// plays with random input, pauses/resumes, forces a game over, restarts, runs demo
// mode, and saves screenshots to .qa/<game>/. It also loads the game from file://.
// Exit code 1 when any console error, page error, failed/external request or broken
// screen flow is detected.
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { startServer } from './lib/server.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const m = a.match(/^--([^=]+)(?:=(.*))?$/);
    return m ? [m[1], m[2] ?? true] : ['target', a];
  }),
);
if (!args.target) {
  console.error('Usage: node scripts/qa-game.mjs <game-dir-or-html> [--play-seconds=6] [--demo-seconds=8]');
  process.exit(2);
}

let file = path.resolve(process.cwd(), args.target);
if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
if (!fs.existsSync(file)) {
  console.error('Not found: ' + file);
  process.exit(2);
}
if (!file.startsWith(ROOT + path.sep)) {
  console.error('Target must live inside ' + ROOT);
  process.exit(2);
}
const rel = path.relative(ROOT, file).split(path.sep).join('/');
const gameDir = path.dirname(file);
const qaId = path.relative(ROOT, gameDir).split(path.sep).join('__') || 'root';
const outDir = path.resolve(ROOT, args.out || path.join('.qa', qaId));
fs.mkdirSync(outDir, { recursive: true });

const PLAY_SECONDS = Number(args['play-seconds'] || 6);
const DEMO_SECONDS = Number(args['demo-seconds'] || 8);
const VIEWPORTS = {
  desktop: { viewport: { width: 1280, height: 720 } },
  mobile: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  iframe: { viewport: { width: 960, height: 600 } },
};
const only = args.only ? String(args.only).split(',') : Object.keys(VIEWPORTS);

const issues = [];
const warnings = [];
const notes = [];
const issue = (where, msg) => issues.push(`[${where}] ${msg}`);

function folderSize(dir) {
  let total = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    total += entry.isDirectory() ? folderSize(p) : fs.statSync(p).size;
  }
  return total;
}

function watch(page, where, serverUrl) {
  page.on('console', (msg) => {
    if (msg.type() === 'error') issue(where, 'console.error: ' + msg.text());
    else if (msg.type() === 'warning') warnings.push(`[${where}] console.warn: ${msg.text()}`);
  });
  page.on('pageerror', (err) => issue(where, 'page error: ' + (err.stack || err.message)));
  page.on('requestfailed', (req) => issue(where, `request failed: ${req.url()} (${req.failure()?.errorText})`));
  page.on('request', (req) => {
    const u = req.url();
    const local = u.startsWith('file:') || u.startsWith('data:') || u.startsWith('blob:') ||
      (serverUrl && u.startsWith(serverUrl));
    if (!local) issue(where, 'external request (not allowed): ' + u);
  });
}

const getState = (page) =>
  page.evaluate(() => (window.__GAME__ && typeof window.__GAME__.getState === 'function'
    ? window.__GAME__.getState() : null));

async function press(page, locatorStr, mobile) {
  const loc = page.locator(locatorStr).filter({ visible: true }).first();
  if ((await loc.count()) === 0) return false;
  if (mobile) await loc.tap();
  else await loc.click();
  return true;
}

async function randomPlay(page, seconds, vp, mobile) {
  const { width, height } = vp.viewport;
  const steps = Math.round((seconds * 1000) / 200);
  for (let i = 0; i < steps; i++) {
    const x = Math.round(width * (0.2 + Math.random() * 0.6));
    const y = Math.round(height * (0.35 + Math.random() * 0.45));
    const r = Math.random();
    if (mobile) {
      await page.touchscreen.tap(x, y);
    } else if (r < 0.45) {
      await page.mouse.move(x, y, { steps: 3 });
      await page.mouse.down();
      await page.mouse.move(x + (Math.random() - 0.5) * 120, y, { steps: 3 });
      await page.mouse.up();
    } else if (r < 0.75) {
      await page.keyboard.press('Space');
    } else {
      await page.keyboard.press(Math.random() < 0.5 ? 'ArrowLeft' : 'ArrowRight');
      await page.mouse.move(x, y, { steps: 4 });
    }
    await page.waitForTimeout(200);
  }
}

async function runViewport(browser, name, serverUrl) {
  const vp = VIEWPORTS[name];
  const mobile = !!vp.isMobile;
  const context = await browser.newContext(vp);
  const page = await context.newPage();
  watch(page, name, serverUrl);
  const url = `${serverUrl}/${rel}`;
  const shot = (label) => page.screenshot({ path: path.join(outDir, `${name}-${label}.png`) });

  await page.goto(url, { waitUntil: 'load' });
  await page.waitForTimeout(1500);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  if (overflow) issue(name, 'horizontal page overflow (page scrolls sideways)');
  let s = await getState(page);
  if (!s) issue(name, 'window.__GAME__.getState() missing');
  else if (s.screen !== 'title') issue(name, `expected screen "title" on load, got "${s.screen}"`);
  await shot('1-title');

  if (!(await press(page, '[data-action="play"]', mobile))) {
    issue(name, 'no visible [data-action="play"] button on title screen');
    await context.close();
    return;
  }
  await page.waitForTimeout(500);
  s = await getState(page);
  if (s && s.screen !== 'playing') issue(name, `after Play expected "playing", got "${s.screen}"`);

  // Pause / resume straight away, while the round is certainly still running.
  if (s && s.screen === 'playing') {
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);
    s = await getState(page);
    if (s && s.screen !== 'paused') issue(name, `Esc should pause, screen is "${s.screen}"`);
    await shot('3-paused');
    if (!(await press(page, '[data-action="resume"]', mobile))) issue(name, 'no visible [data-action="resume"] on pause overlay');
    await page.waitForTimeout(400);
    s = await getState(page);
    if (s && s.screen !== 'playing') issue(name, `Resume should return to "playing", got "${s.screen}"`);
  }

  await randomPlay(page, PLAY_SECONDS, vp, mobile);
  s = await getState(page);
  notes.push(`[${name}] after ${PLAY_SECONDS}s random play: ${JSON.stringify(s)}`);
  await shot('2-playing');

  const canForce = await page.evaluate(() => !!(window.__GAME__ && window.__GAME__.forceGameOver));
  if (!canForce) issue(name, 'window.__GAME__.forceGameOver() missing');
  else {
    await page.evaluate(() => window.__GAME__.forceGameOver());
    await page.waitForTimeout(1600);
    s = await getState(page);
    if (s && s.screen !== 'gameover') issue(name, `forceGameOver should show "gameover", got "${s.screen}"`);
    await shot('4-gameover');
    if (!(await press(page, '[data-action="restart"]', mobile))) issue(name, 'no visible [data-action="restart"] on game over');
    await page.waitForTimeout(700);
    s = await getState(page);
    if (s && s.screen !== 'playing') issue(name, `Play again should give "playing", got "${s.screen}"`);
    await shot('5-restarted');
  }

  // Demo / attract mode
  await page.goto(url + '?demo=1', { waitUntil: 'load' });
  await page.waitForTimeout(DEMO_SECONDS * 1000);
  s = await getState(page);
  notes.push(`[${name}] demo after ${DEMO_SECONDS}s: ${JSON.stringify(s)}`);
  if (s && s.screen === 'title') issue(name, 'demo=1 should start playing immediately');
  await shot('6-demo');
  await context.close();
}

async function runFileProtocol(browser) {
  const context = await browser.newContext(VIEWPORTS.desktop);
  const page = await context.newPage();
  watch(page, 'file://', null);
  await page.goto(pathToFileURL(file).href, { waitUntil: 'load' });
  await page.waitForTimeout(1200);
  const s = await getState(page);
  if (!s) issue('file://', 'game did not initialise from file:// (window.__GAME__ missing)');
  if (await press(page, '[data-action="play"]', false)) {
    await page.waitForTimeout(400);
    await randomPlay(page, 2, VIEWPORTS.desktop, false);
  }
  await page.screenshot({ path: path.join(outDir, 'file-protocol.png') });
  await context.close();
}

const server = await startServer(ROOT);
const browser = await chromium.launch();
try {
  for (const name of only) {
    if (!VIEWPORTS[name]) throw new Error('Unknown viewport ' + name);
    await runViewport(browser, name, server.url);
  }
  if (!args['no-file']) await runFileProtocol(browser);
} finally {
  await browser.close();
  await server.close();
}

const size = folderSize(gameDir);
if (size > 300 * 1024) warnings.push(`folder size ${(size / 1024).toFixed(0)} KB exceeds 300 KB budget`);

console.log(`\nQA ${rel}  (${(size / 1024).toFixed(0)} KB)  screenshots → ${path.relative(process.cwd(), outDir)}/`);
for (const n of notes) console.log('  • ' + n);
for (const w of warnings) console.log('  ⚠ ' + w);
if (issues.length) {
  console.log(`\n✗ ${issues.length} issue(s):`);
  for (const i of [...new Set(issues)]) console.log('  ✗ ' + i);
  process.exit(1);
}
console.log('\n✓ PASS');
