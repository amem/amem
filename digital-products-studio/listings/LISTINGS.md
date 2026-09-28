# Listings overview (all products, all marketplaces)

The publisher uses `catalog/catalog.json` and the description files in this folder. Use this page when you list by hand (Payhip, Lemon Squeezy, itch.io pages, CodeCanyon) or want to check the copy.

| Product | Etsy | Gumroad / Polar / Payhip | itch.io | Description |
|---|---|---|---|---|
| Neon Stack (game source) | not listed | $19 (+ $49 Extended license) | Game: pay what you want · Source code: $19 | `neon-stack.txt` |
| Invoice Studio | $12.99 | $19 (+ $49 Developer license) | not listed | `invoice-studio.txt` |
| Watermark Studio | $9.99 | $12 | not listed | `watermark-studio.txt` |
| Python Automation Kit | not listed | $15 | not listed | `py-automation-kit.txt` |
| 2027 Money Planner | $12.99 | $12.99 | not listed | `planner-bundle.txt` |
| Holiday Budget & Gift Tracker | $5.99 | $5.99 | not listed | `planner-holiday.txt` |
| Debt Payoff Planner | $6.99 | $6.99 | not listed | `planner-debt.txt` |

**Files to upload** are in `dist/` (built by `scripts/build_all.sh`, or sent to you in the chat). The planners' files are in `../2027-money-planner/product/dist/`.
**Images** are in `images/<product>/`:
- `cover.jpg` (1280×720) is the Gumroad cover and Polar/Payhip image
- `thumb.jpg` (600×600) is the thumbnail
- `etsy-0N.jpg` (2400×1800) are the Etsy photos
- `itch-cover.jpg` (630×500) is the itch.io cover
- `video-*.mp4` and `*.gif` are the demo videos and GIFs. The app demos last 12–13 s, within Etsy's 15-second limit, and each has a 9:16 cut for TikTok and Reels. See `../marketing/LAUNCH_POSTS.md` for which file goes where.

## Etsy titles and tags

**Invoice Studio**
- Title: `Invoice Generator App, Offline Invoice & Quote Maker, PDF Invoice Template for Small Business & Freelancers, Instant Download`
- Tags: `invoice template, invoice generator, invoice maker, quote template, small business, freelancer invoice, billing template, pdf invoice, business invoice, estimate template, client invoice, bookkeeping, invoice app`

**Watermark Studio**
- Title: `Batch Watermark Tool for Photos, Add Logo or Text Watermark, Resize & Rename Images, Etsy Seller Photo Tool, Works Offline`
- Tags: `watermark, photo watermark, logo watermark, watermark tool, etsy seller tools, product photos, image resizer, photographer tool, batch watermark, copyright photos, shop photos, photo editing, bulk rename`

**Planners:** see `../2027-money-planner/listings/ETSY_LISTINGS.md`.

## itch.io pages (Neon Stack)

**Project 1: "Neon Stack"** (the playable game)
- Kind of project: HTML · Upload: `neon-stack-web-v1.0.0.zip` · tick "This file will be played in the browser"
- Viewport 480 × 800 · Mobile friendly · Fullscreen button on
- Pricing: No payment required (donations on) · Genre: Arcade
- Tags: `arcade, casual, one-button, neon, stacking, relaxing, mobile, singleplayer`
- Short description: *Stack the neon blocks as high as you can. One tap to play.*
- Generative AI disclosure: Yes → Code
- Add a link to the source-code page in the description ("Want to make your own version? Get the source code").

**Project 2: "Neon Stack: HTML5 Source Code"**
- Kind of project: Downloadable · Upload: `neon-stack-v1.0.0.zip` · Price: $19
- Classification: Game assets → Tags: `html5, javascript, source-code, game-template, casual`
- Description: `neon-stack.txt` · Generative AI disclosure: Yes → Code

## CodeCanyon (optional)

It's a strong fit for **Neon Stack** (HTML5 → Games) and **Invoice Studio** (JavaScript → Miscellaneous). Before submitting, add the item documentation Envato asks for (the READMEs cover most of it) and read their AI-generated content policy. Their review is strict and they take 50% of each sale.
