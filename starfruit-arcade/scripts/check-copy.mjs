#!/usr/bin/env node
// Checks every copy-paste block in business/*.md that is preceded by
// <!-- limit: N --> against its platform character limit. Exit 1 if any block is too long.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIR = path.join(ROOT, 'business');
let failures = 0;
let checked = 0;

for (const name of fs.readdirSync(DIR).filter((f) => f.endsWith('.md')).sort()) {
  const lines = fs.readFileSync(path.join(DIR, name), 'utf8').split('\n');
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/<!--\s*limit:\s*(\d+)\s*-->/);
    if (!m) continue;
    const limit = Number(m[1]);
    let j = i + 1;
    while (j < lines.length && !lines[j].startsWith('```')) j++;
    const body = [];
    for (j += 1; j < lines.length && !lines[j].startsWith('```'); j++) body.push(lines[j]);
    const text = body.join('\n');
    const length = [...text].length;
    checked++;
    if (length > limit) {
      failures++;
      console.log(`✗ ${name}:${i + 1}  ${length}/${limit}  "${text.slice(0, 50).replace(/\n/g, ' ')}…"`);
    }
  }
}
console.log(failures ? `\n✗ ${failures} of ${checked} blocks exceed their limit` : `✓ ${checked} copy blocks within platform limits`);
process.exit(failures ? 1 : 0);
