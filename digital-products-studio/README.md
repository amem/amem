# Digital Products Studio

Four new digital products (a game, two web apps and a script pack), store images and copy for each, and a **publisher** that lists them automatically on Etsy, Gumroad, Polar and itch.io through their official APIs. It also lists the three spreadsheet products from `../2027-money-planner`.

➡ **Start here:** [`launch/ACCOUNTS_AND_AUTOMATION.md`](launch/ACCOUNTS_AND_AUTOMATION.md)

## Products

| Product | What it is | Tests | Price |
|---|---|---|---|
| **Neon Stack** | One-tap HTML5 tower-stacking game with full source (no engine, no dependencies), portal-ready | 14 | $19 |
| **Invoice Studio** | Offline invoice and quote web app: taxes, discounts, payments, 7 languages, PDF | 18 unit + browser (plus 1 screenshot run) | $19 ($12.99 on Etsy) |
| **Watermark Studio** | Batch text/logo watermarks, resize, rename and ZIP, entirely in the browser | 13 | $12 ($9.99 on Etsy) |
| **Python Automation Kit** | 11 scripts (organize, rename, duplicates, images, PDF, Excel, backups, monitor, mail merge, contacts) + a menu | 24 | $15 |
| Money Planner ×3 | Spreadsheets from the first project | checked separately | $5.99–12.99 |

Every product was tested in a real browser or Python environment. Examples: the invoice math, the ZIP files produced by the watermark tool (checked image by image), the game played automatically, and each script run on real files.

## Folder map

```
digital-products-studio/
├── research/CODE_PRODUCTS_RESEARCH.md   what sells, where, fees, which platforms have listing APIs
├── products/                            ← product source code (NOT in git: this repo is public)
│   ├── neon-stack/  invoice-studio/  watermark-studio/  py-automation-kit/
├── catalog/catalog.json                 every product × marketplace: titles, prices, tags, files, images
├── listings/                            descriptions (+ LISTINGS.md for manual listing)
├── images/<product>/                    covers, thumbnails, Etsy photos, itch.io cover, demo videos and GIFs
├── marketing/LAUNCH_POSTS.md            ready-to-post copy: TikTok/Reels, Reddit, Product Hunt, LinkedIn, X, Dev.to
├── publisher/                           automatic listing tool (Python standard library only) + 19 tests
├── scripts/build_all.sh                 run all tests → package ZIPs → store images → plan
├── scripts/package.py                   product ZIPs → dist/
├── scripts/make_images.js               store images from real screenshots
├── scripts/make_videos.js               demo videos and GIFs recorded from the real products (demo-photos/: CC0 samples)
└── launch/ACCOUNTS_AND_AUTOMATION.md    create accounts, get API keys, run the publisher
```

## Why the product source is not in this repository

`amem/amem` is a **public** GitHub repository. Committing the source code of paid products would let anyone download them for free, so `products/` and `dist/` are git-ignored. The product ZIPs were delivered in the chat. For a permanent, version-controlled home, create a **private** repository and copy `products/` into it.

## Publisher in 30 seconds

```bash
python publisher/publish.py plan               # readiness per product and marketplace
python publisher/publish.py run                # dry run: shows every API call, sends nothing
python publisher/publish.py run --live         # creates DRAFT listings
python publisher/publish.py run --live --publish
```

- **Dry run by default**, **drafts by default**, credentials only from environment variables.
- Already-listed products are skipped.
- Unedited placeholders (such as `YOUR_ITCH_USERNAME`) block a live run.

## Rebuild everything

```bash
PYTHON=/path/to/python-with-pillow-openpyxl-pypdf ./scripts/build_all.sh
```

This needs Node 18+ with Playwright and Chromium, and Python 3.9+.
