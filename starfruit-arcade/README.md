# Starfruit Arcade

An HTML5 game studio in a folder: seven finished products (four games and three marketing
kits), a storefront website, listing images and trailers, and a step-by-step plan to sell them
as products and as freelance services.

**Start here → [business/README.md](business/README.md)** (the 14-day launch plan).

## What is inside

| Folder | Contents |
|---|---|
| `games/neon-stack/` | One-tap isometric stacking game |
| `games/cosmic-merge/` | Physics merge puzzle |
| `games/brick-blitz/` | 12-level brick-breaker with power-ups |
| `games/promo-arcade/` | Branded mini-games kit for businesses (Catch Rush, Memory Match, Spin & Win + hub) |
| `games/daily-doors/` | Advent / countdown calendar + Scratch & Win card for campaigns |
| `games/perfect-match-quiz/` | Product-finder / personality and trivia quiz kit |
| `games/swapsy/` | Match-3 puzzle with 24 levels |
| `site/` | Portfolio + storefront website (links in `site/site.config.js`) |
| `business/` | Launch plan, platform guides, gig texts, outreach templates, pricing, rules |
| `marketing/out/` | Listing images for Fiverr, Upwork, itch.io, Gumroad, the website + trailers |
| `docs/` | Product standard and the buyer licenses |
| `scripts/` | QA, build and asset tools |
| `catalog.json` | Product names, prices and features (single source of truth) |

Every game opens by double-clicking its `index.html`. No install needed to play or edit.

## Commands (need Node.js 18+)

```bash
npm install          # once: installs the test browser used by the tools
npm run qa           # plays every game automatically and checks for errors
npm run build        # builds dist/: upload zips, source-code zips, website, laptop kit
npm run assets       # regenerates screenshots, listing images and trailers
npm run serve        # builds and serves the website at a local address
npm run sync-kits    # copies the shared brand runtime from Promo Arcade into the other kits
```

`dist/` after a build:

- `dist/itch/`: browser builds to upload to itch.io
- `dist/source/`: Standard / Extended source-code zips to sell
- `dist/site/`: the website, ready to drag onto Netlify Drop
- `dist/laptop/`: one zip per project folder to keep on your computer
