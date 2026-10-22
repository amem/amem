# Starfruit Arcade

A complete, ready-to-sell HTML5 game business: four finished products, a portfolio and
storefront website, listing images and trailers, and a step-by-step sales kit for Fiverr,
Upwork, itch.io, Gumroad and web game portals.

> "Starfruit Arcade" is a placeholder studio name. Rename it everywhere with a project-wide
> search and replace (check the name is free first).

**Start here → [business/README.md](business/README.md)** (the 14-day launch plan).

## The products

| # | Product | What it is | Source price (Std / Ext) |
|---|---|---|---|
| 01 | [Neon Stack](games/neon-stack/) | One-tap isometric stacking game, neon synthwave | $15 / $49 |
| 02 | [Cosmic Merge](games/cosmic-merge/) | Physics drop-and-merge puzzle with cute planets | $19 / $69 |
| 03 | [Brick Blitz](games/brick-blitz/) | Neon brick-breaker, 12 levels, 8 power-ups | $17 / $59 |
| 04 | [Promo Arcade](games/promo-arcade/) | Branded mini-games kit for businesses: catch, memory, prize wheel + coupons and lead capture | $29 / $99 |

Every product: vanilla JavaScript, no dependencies, no build step, works offline and from
`file://`, phone + desktop, title/pause/game-over screens, synthesized sound, ad and analytics
hooks, a `?demo=1` attract mode, and a buyer README. Open any `index.html` to play.

## What is in this folder

```
games/          the four products (each folder is a complete, sellable product)
site/           portfolio + storefront website (built into dist/site with all games playable)
business/       the sales kit: launch plan, gigs, proposals, store listings, playbooks
marketing/out/  generated listing images and trailers (npm run assets)
docs/           product standard and buyer licenses
scripts/        QA, release builder, asset generator, copy checker, preview server
```

## Commands

Requires Node.js 18+. Run `npm install` once (installs Playwright for QA and assets; on a new
computer also run `npx playwright install chromium`).

| Command | What it does |
|---|---|
| `npm run build` | Validates the products and writes everything to `dist/`: itch.io zips, Standard/Extended source zips, the bundle, the website and one zip per project folder |
| `npm run serve` | Builds, then serves the website at http://localhost:8080 |
| `npm run qa` | Plays every game automatically in a headless browser (desktop, phone, iframe, file://) and fails on any error |
| `npm run assets` | Regenerates all listing images and trailers from the live games |
| `npm run check:copy` | Checks every listing text against the platform's character limits |
| `npm test` | All checks |

## Put it on your computer

From the files sent in chat (or `dist/laptop/` after `npm run build`): download the zips, then
extract them into one folder, for example **Documents/Starfruit Arcade/**. Each zip contains a
single project folder (`01-neon-stack`, …, `08-release-files`).

Windows (PowerShell), after the zips are in Downloads:
```powershell
$dst = "$HOME\Documents\Starfruit Arcade"; New-Item -ItemType Directory -Force $dst | Out-Null
Get-ChildItem "$HOME\Downloads\0*-*.zip" | ForEach-Object { Expand-Archive $_.FullName -DestinationPath $dst -Force }
```

macOS / Linux:
```bash
mkdir -p ~/Documents/"Starfruit Arcade"
for z in ~/Downloads/0*-*.zip; do unzip -oq "$z" -d ~/Documents/"Starfruit Arcade"; done
```

The `starfruit-arcade-complete-workspace.zip` contains this whole folder (tools included) if
you want to keep building on your computer.

## Licenses

Your products are sold under [docs/licenses](docs/licenses) (Standard: one end product;
Extended: unlimited end products, client work included). The website's fonts are SIL Open Font
License (see `site/fonts/OFL.txt`). Everything else in the games is original code with
procedural graphics and synthesized sound, so there are no third-party assets to clear.
