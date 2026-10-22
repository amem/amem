# 04 — itch.io: free games + paid source code

itch.io is where web games get discovered. Use **two pages per game**:

1. **The free browser game** (exposure, donations, links to everything else).
2. **The source-code page** (the paid product), classified as a game asset/template.

Files: `dist/itch/<game>-html5-v1.0.0.zip` (browser build) and
`dist/source/<game>-v1.0.0-standard.zip` (source + Standard license). Run `npm run build` first.
Images: `marketing/out/itch/` (covers 630×500) and `marketing/out/screenshots/`.

---

## Page settings for every free browser game

| Field | Value |
|---|---|
| Kind of project | HTML |
| Upload | the `-html5-` zip → tick **This file will be played in the browser** |
| Embed options | Viewport 960 × 600 (Neon Stack / Cosmic Merge also work at 540 × 960), **Mobile friendly** on, **Fullscreen button** on, Automatically start on page load off |
| Pricing | **$0 or donate** (suggested $2) |
| Classification | Games · Genre as below |
| Release status | Released |
| Community | Comments on |
| Visibility | Public (after you check the page in draft) |

Add 3–5 screenshots, the cover, and the trailer (upload the `.webm` to YouTube unlisted/public
and paste the link). At the end of each description, link the source-code page and your
Fiverr/Upwork profile ("Want a game like this for your brand? Hire me.").

## Page settings for every source-code page

| Field | Value |
|---|---|
| Kind of project | Downloadable |
| Classification | Game assets (or Tools) |
| Upload | the `-standard.zip` |
| Pricing | Paid, minimum price from the table below, "let people pay more" on |
| Tags | `html5`, `source-code`, `template`, `javascript`, `game-template` + genre tags |

| Product | Standard license | Extended license (link to Gumroad) |
|---|---|---|
| Neon Stack | $15 | $49 |
| Cosmic Merge | $19 | $69 |
| Brick Blitz | $17 | $59 |
| Promo Arcade | $29 | $99 |
| Bundle (itch.io bundle of all four) | $59 | $179 |

Create the bundle in your itch.io dashboard → *Bundles* once the four pages are live.

---

## Neon Stack

**Short description (tagline)**
<!-- limit: 120 -->
```text
Stack it perfect. Stack it high. A one-tap neon stacking game for phone and desktop.
```
**Genre:** Arcade · **Tags:** `hyper-casual`, `one-button`, `isometric`, `neon`, `synthwave`, `mobile`, `html5`

**Description**
```text
Blocks slide in. Tap to drop. Whatever hangs over the edge gets sliced off.

Line up perfect drops to chain combos, hear the music rise, and watch your block grow back. Miss, and the camera pulls back to show off your whole tower.

• One-tap: tap, click or press Space
• Isometric neon synthwave look
• Perfect-drop combos with rising chimes
• Milestones every 10 blocks
• Plays on phones, tablets and computers

How high can you stack?

—
Developer? Get the full source code (one config file to reskin): [link to source page]
Want a game like this for your brand? [link to your Fiverr / Upwork / website]
```

**Source page title:** `Neon Stack — HTML5 Game Template (Source Code)`
**Source page description**
```text
The complete source code of Neon Stack, a polished one-tap isometric stacking game.

Play it first: [link to the free game]

WHAT YOU GET
• Vanilla JavaScript + Canvas, no dependencies, no build step
• Runs from file://, any web host, itch.io and web game portals
• One commented config file: colours, block size, speed, difficulty, texts
• Title, pause and game-over screens, sound effects (synthesized, no audio files)
• Demo/attract mode (?demo=1) for trailers
• Hooks for ads and analytics (gameplay start/stop, interstitial before restart)
• Buyer README with reskin, embed and publishing guides

LICENSE
Standard: one end product, commercial use allowed. Extended (unlimited projects, client work): [Gumroad link].

Questions? Use the comments below.
```

## Cosmic Merge

**Short description**
<!-- limit: 120 -->
```text
Drop. Merge. Make a star. A cosy physics merge puzzle with cute planets.
```
**Genre:** Puzzle · **Tags:** `merge`, `physics`, `casual`, `space`, `cute`, `relaxing`, `mobile`, `html5`

**Description**
```text
Drop planets into a glass jar. When two of the same touch, they merge into the next one: Asteroid, Moon, Mars, Venus, Earth… all the way to a Black Hole.

Chain merges for combos, discover every planet, and don't let the jar overflow.

• Smooth, satisfying physics
• 11 planets with cute animated faces
• Combo chains and discovery banners
• BIG BANG when two black holes collide
• Plays on phones, tablets and computers

—
Developer? Get the full source code and turn it into a fruit, candy or brand-product game: [link]
Want a game like this for your brand? [link]
```

**Source page title:** `Cosmic Merge — Physics Merge Game Template (Source Code)`
**Source page description:** use the Neon Stack source description, replacing the first lines with:
```text
The complete source code of Cosmic Merge, a drop-and-merge physics puzzle (the genre that took over app stores and streams).

Highlights: stable custom circle physics with 60+ bodies, 11 procedural planets with faces, per-tier custom images (make it fruit, candy or your brand's products), combos, evolution chain, responsive portrait and landscape layouts.
```

## Brick Blitz

**Short description**
<!-- limit: 120 -->
```text
Smash. Power up. Blitz through 12 levels of neon brick-breaking.
```
**Genre:** Action / Arcade · **Tags:** `breakout`, `arkanoid-like`, `arcade`, `retro`, `neon`, `power-ups`, `mobile`, `html5`

**Description**
```text
The classic brick-breaker, turned up to neon.

Blast through 12 handcrafted levels with steel walls, explosive chain reactions and mystery bricks. Catch power-ups: multi-ball, lasers, fireball, catch, wide paddle… and dodge the shrink.

• 12 levels + endless loop mode
• 8 power-ups and combo multipliers
• Level select with saved progress
• Mouse, touch or keyboard

—
Developer? Full source with a plain-text level editor format: [link]
Want a game like this for your brand? [link]
```

**Source page title:** `Brick Blitz — Brick Breaker Game Template (Source Code)`
**Source page:** the Neon Stack description, replacing the first lines with:
```text
The complete source code of Brick Blitz, a neon brick-breaker with 12 levels, 8 power-ups and explosive chain reactions.

Highlights: levels as plain text (design your own in any editor), tunnel-proof ball physics, level select with saved progress, optional image skins for bricks, paddle and ball.
```

## Promo Arcade

Promo Arcade is a B2B product. On itch.io, publish only the **source-code page** (Kind:
Downloadable, Classification: Tools), with the hub as a browser demo upload marked "demo".

**Short description**
<!-- limit: 120 -->
```text
Branded mini-games kit: catch game, memory game and prize wheel with coupons and lead capture.
```
**Tags:** `marketing`, `gamification`, `advergame`, `prize-wheel`, `html5`, `template`, `source-code`

**Description**
```text
Three brandable mini-games for shops, cafés, events and online stores, rebranded from ONE file.

• Catch Rush: catch your products, dodge bombs, score a coupon
• Memory Match: flip cards with your products, earn up to 3 stars
• Spin & Win: prize wheel with your own prizes and odds
• Hub page, coupon cards with one-tap copy, optional e-mail form with webhook
• Automatic contrast for any brand colours, 20 built-in product icons
• Mobile-first: QR codes, Instagram links, kiosks

Play the demo above (fictional brand "Juicy Jungle").

Standard license: one client/brand. Extended license (agencies, unlimited clients): [Gumroad link].
```

---

## Devlog post template (post once per game, then at every update)

```text
Title: [Game] is out — play it free in your browser

Hi! I just released [Game], a [genre] game you can play right here on itch.io, on your phone or computer.

What makes it fun: [one sentence].
What I learned building it: [one sentence about a technical or design challenge].

Play it, and tell me your best score in the comments. The full source code is available for developers who want to make their own version.
```

## After publishing

- [ ] Add each game to your itch.io creator page and pin the best one.
- [ ] Reply to every comment.
- [ ] Join itch.io game jams in the future: each jam entry brings a new wave of visitors to
      your profile and existing games.
