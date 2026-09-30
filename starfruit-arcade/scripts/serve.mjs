#!/usr/bin/env node
// Preview the built website (run `npm run build` first):  node scripts/serve.mjs [port]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { startServer } from './lib/server.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE = path.join(ROOT, 'dist', 'site');
if (!fs.existsSync(SITE)) {
  console.error('dist/site not found — run `npm run build` first.');
  process.exit(1);
}
const { url } = await startServer(SITE, Number(process.argv[2] || 8080));
console.log(`Website: ${url}/\nGames:   ${url}/play/<game-id>/\nPress Ctrl+C to stop.`);
