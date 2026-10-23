#!/usr/bin/env node
// Runs scripts/qa-game.mjs for every game page in the catalog. Exit 1 if any fails.
//   node scripts/qa-all.mjs [extra qa-game flags, e.g. --only=desktop]
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const catalog = JSON.parse(fs.readFileSync(path.join(ROOT, 'catalog.json'), 'utf8'));
// Every page of every product (catalog "pages", default index.html).
const targets = catalog.products.flatMap((p) => (p.pages || ['index.html']).map((page) => `games/${p.id}/${page}`));

const failures = [];
for (const target of targets) {
  const r = spawnSync(process.execPath, [path.join(ROOT, 'scripts/qa-game.mjs'), target, ...process.argv.slice(2)], {
    cwd: ROOT,
    stdio: 'inherit',
  });
  if (r.status !== 0) failures.push(target);
}
console.log(failures.length ? `\n✗ QA failed: ${failures.join(', ')}` : `\n✓ QA passed for ${targets.length} pages`);
process.exit(failures.length ? 1 : 0);
