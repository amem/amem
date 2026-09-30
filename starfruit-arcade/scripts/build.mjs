#!/usr/bin/env node
// Release builder.
//
//   node scripts/build.mjs           validate + build everything into dist/
//   node scripts/build.mjs --check   validate only (exit 1 on errors)
//
// dist/
//   itch/      <id>-html5-v<ver>.zip            upload to itch.io as the browser-playable build
//   source/    <id>-v<ver>-standard.zip          sell: Standard license (1 end product)
//              <id>-v<ver>-extended.zip          sell: Extended license (unlimited end products)
//              starfruit-arcade-bundle-v<ver>-*.zip
//   site/      the portfolio + storefront website with every game playable under play/<id>/
//   laptop/    one zip per project folder (01-neon-stack.zip …) + the complete workspace
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { writeZip, collect } from './lib/zip.mjs';
import { renderSite } from './lib/site-render.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const CHECK_ONLY = process.argv.includes('--check');
const catalog = JSON.parse(fs.readFileSync(path.join(ROOT, 'catalog.json'), 'utf8'));
const VERSION = catalog.version;
const SIZE_BUDGET_KB = { 'promo-arcade': 400 };
const LICENSES = {
  standard: fs.readFileSync(path.join(ROOT, 'docs/licenses/STANDARD-LICENSE.md')),
  extended: fs.readFileSync(path.join(ROOT, 'docs/licenses/EXTENDED-LICENSE.md')),
};

const skipHidden = (rel) => !rel.split('/').some((part) => part.startsWith('.'));
const kb = (bytes) => `${(bytes / 1024).toFixed(0)} KB`;

// ---------------------------------------------------------------- validation
function validate(product) {
  const dir = path.join(ROOT, 'games', product.id);
  const errors = [];
  const warnings = [];
  if (!fs.existsSync(dir)) return { errors: [`games/${product.id}/ is missing`], warnings };

  const required = ['index.html', 'README.md', 'CHANGELOG.md',
    product.id === 'promo-arcade' ? 'brand.config.js' : 'config.js'];
  for (const f of required) if (!fs.existsSync(path.join(dir, f))) errors.push(`missing ${f}`);

  const files = collect(dir, '', skipHidden);
  let bytes = 0;
  for (const { name, data } of files) {
    bytes += data.length;
    if (/^licen[cs]e/i.test(path.basename(name))) errors.push(`${name}: license files are added by the build — remove it`);
    if (!/\.(html|js|css)$/.test(name)) continue;
    const lines = data.toString('utf8').split('\n');
    lines.forEach((line, i) => {
      const where = `${name}:${i + 1}`;
      if (/type\s*=\s*["']module["']/.test(line)) errors.push(`${where}: ES modules break file:// — use classic scripts`);
      if (/\bconsole\.log\(/.test(line)) warnings.push(`${where}: console.log left in code`);
      const urls = line.match(/https?:\/\/[^\s"'`)<>]+/g) || [];
      for (const url of urls) {
        if (/^https?:\/\/www\.w3\.org\//.test(url)) continue; // SVG/XML namespaces
        const comment = /^\s*(\/\/|\*|\/\*|<!--)/.test(line);
        (comment ? warnings : errors).push(`${where}: external URL ${url}`);
      }
    });
  }
  const budget = (SIZE_BUDGET_KB[product.id] || 300) * 1024;
  if (bytes > budget) errors.push(`size ${kb(bytes)} exceeds budget ${kb(budget)}`);
  return { errors, warnings, bytes, files };
}

let failed = false;
const results = {};
for (const product of catalog.products) {
  const r = validate(product);
  results[product.id] = r;
  const status = r.errors.length ? '✗' : '✓';
  console.log(`${status} games/${product.id}  ${r.bytes ? kb(r.bytes) : ''}`);
  for (const e of r.errors) console.log('    ✗ ' + e);
  for (const w of r.warnings) console.log('    ⚠ ' + w);
  if (r.errors.length) failed = true;
}
if (failed) {
  console.error('\nValidation failed.');
  process.exit(1);
}
if (CHECK_ONLY) {
  console.log('\nValidation passed.');
  process.exit(0);
}

// ---------------------------------------------------------------- build
fs.rmSync(DIST, { recursive: true, force: true });
const outputs = [];
const zip = (rel, entries) => outputs.push(writeZip(path.join(DIST, rel), entries));

function bundleReadme() {
  const lines = [
    `# ${catalog.bundle.title} v${VERSION}`,
    '',
    catalog.bundle.tagline,
    '',
    'Each folder is a complete, standalone product with its own README.md.',
    'Open any `index.html` in a browser to play — no install, no build step.',
    '',
  ];
  for (const p of catalog.products) {
    lines.push(`## ${p.title} — \`${p.id}/\``, '', p.summary, '', ...p.features.map((f) => `- ${f}`), '');
  }
  lines.push('License: see LICENSE.md.', '');
  return Buffer.from(lines.join('\n'));
}

for (const product of catalog.products) {
  const { files } = results[product.id];
  zip(`itch/${product.id}-html5-v${VERSION}.zip`, files);
  for (const tier of ['standard', 'extended']) {
    zip(`source/${product.id}-v${VERSION}-${tier}.zip`, [
      ...files.map((f) => ({ name: `${product.id}/${f.name}`, data: f.data })),
      { name: `${product.id}/LICENSE.md`, data: LICENSES[tier] },
    ]);
  }
}
for (const tier of ['standard', 'extended']) {
  const top = catalog.bundle.id;
  zip(`source/${top}-v${VERSION}-${tier}.zip`, [
    ...catalog.products.flatMap((p) =>
      results[p.id].files.map((f) => ({ name: `${top}/${p.id}/${f.name}`, data: f.data }))),
    { name: `${top}/README.md`, data: bundleReadme() },
    { name: `${top}/LICENSE.md`, data: LICENSES[tier] },
  ]);
}

// Website: site/ + every game under play/<id>/ + generated images under img/.
const SITE = path.join(DIST, 'site');
fs.cpSync(path.join(ROOT, 'site'), SITE, { recursive: true, filter: (src) => !path.basename(src).startsWith('.') });
for (const product of catalog.products) {
  fs.cpSync(path.join(ROOT, 'games', product.id), path.join(SITE, 'play', product.id), {
    recursive: true,
    filter: (src) => !path.basename(src).startsWith('.'),
  });
}
const siteImages = path.join(ROOT, 'marketing', 'out', 'site');
if (fs.existsSync(siteImages)) fs.cpSync(siteImages, path.join(SITE, 'img'), { recursive: true });
const siteIndex = path.join(SITE, 'index.html');
fs.writeFileSync(siteIndex, renderSite(fs.readFileSync(siteIndex, 'utf8'), catalog));

// Laptop kit: one zip per project folder, ready to unzip into Documents/Starfruit Arcade/.
const folderZip = (name, dir, filter = skipHidden) => zip(`laptop/${name}.zip`, collect(dir, name, filter));
for (const product of catalog.products) folderZip(`${product.number}-${product.id}`, path.join(ROOT, 'games', product.id));
folderZip('05-portfolio-website', SITE);
folderZip('06-business-kit', path.join(ROOT, 'business'));
if (fs.existsSync(path.join(ROOT, 'marketing', 'out'))) folderZip('07-marketing-assets', path.join(ROOT, 'marketing', 'out'));
zip('laptop/08-release-files.zip', [
  ...collect(path.join(DIST, 'itch'), '08-release-files/itch-io-uploads'),
  ...collect(path.join(DIST, 'source'), '08-release-files/source-code-for-sale'),
]);
const EXCLUDE_TOP = new Set(['node_modules', 'dist', '.qa']);
folderZip('starfruit-arcade-complete-workspace', ROOT, (rel) => {
  const top = rel.split('/')[0];
  return !EXCLUDE_TOP.has(top) && (skipHidden(rel) || rel.startsWith('.github') || rel === '.gitignore');
});

// Manifest with sizes + SHA-256 so uploads can be verified.
const manifest = outputs.map((o) => {
  const hash = crypto.createHash('sha256').update(fs.readFileSync(o.file)).digest('hex').slice(0, 16);
  return `${path.relative(DIST, o.file).padEnd(58)} ${kb(o.bytes).padStart(8)}  ${o.entries} files  sha256:${hash}`;
});
fs.writeFileSync(path.join(DIST, 'MANIFEST.txt'), `Starfruit Arcade v${VERSION} release\n\n${manifest.join('\n')}\n`);
console.log(`\nBuilt ${outputs.length} zips + dist/site/\n`);
console.log(manifest.map((l) => '  ' + l).join('\n'));
