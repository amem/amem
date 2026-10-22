# 04 — itch.io: free browser games + source-code pages

itch.io does two jobs for you:
1. **Free browser games** that anyone can play: proof of quality, traffic, and a link for
   Fiverr / Upwork / Reddit.
2. **Paid source-code pages** for developers who want to reskin the games.

All files come from `npm run build` (in `dist/`) and `npm run assets` (in `marketing/out/`).

---

## 1. Browser game pages (4 projects, free)

Create one project per game: *Dashboard → Create new project*.

| Field | Value |
|---|---|
| Title | `Neon Stack` / `Cosmic Merge` / `Brick Blitz` / `Promo Arcade — Play & Win demo` |
| Project URL | `neon-stack`, `cosmic-merge`, `brick-blitz`, `promo-arcade` |
| Short description | the `tagline` from `catalog.json` |
| Classification | Games |
| Kind of project | **HTML** |
| Release status | Released |
| Pricing | **No payments** (or "$0 or donate") |
| Uploads | `dist/itch/<id>-html5-v1.0.0.zip`, tick **"This file will be played in the browser"** |
| Viewport | 960 × 600 (Promo Arcade: 960 × 640) |
| Options | ✓ Mobile friendly (orientation: default) · ✓ Fullscreen button · ✗ Automatically start on page load (click-to-play loads faster in lists) |
| Description | see below |
| Genre | Neon Stack: Action · Cosmic Merge: Puzzle · Brick Blitz: Action · Promo Arcade: Other |
| Tags | from `catalog.json` → `tags`, plus `html5`, `browser`, `mobile` |
| AI disclosure | answer itch.io's question about generative AI honestly |
| Cover image | `marketing/out/itch/<id>-cover.png` (630 × 500) |
| Screenshots | `marketing/out/screenshots/<id>-desktop-1.png`, `<id>-phone-1.png`, `<id>-desktop-2.png` |
| Trailer | upload `marketing/out/video/<id>-trailer-landscape.mp4` to YouTube, paste the link |
| Visibility | Public |

**Game page description template:**

> **[Title]: [tagline]**
>
> [summary from catalog.json]
>
> **How to play:** [controls from catalog.json]
>
> **Features**
> - [feature 1]
> - [feature 2]
> - [feature 3]
>
> Plays on phone, tablet and desktop. No download.
>
> 🛠 **Want this game with your own theme or brand?** The full source code is for sale:
> [link to the source-code page]. Custom versions on request: [your website link].

**Theme the page:** *Edit theme* → background colour from the game's `accent` in
`catalog.json`, dark text panel, banner image optional. Consistent pages look professional.

## 2. Source-code pages (4 projects + bundle, paid)

Create a second project per product, so the free game page stays clean.

| Field | Value |
|---|---|
| Title | `Neon Stack — HTML5 Source Code` (same pattern for each) |
| Classification | **Game assets** (or Tools) |
| Kind of project | Downloadable |
| Pricing | Paid, **minimum = the Standard price** in `catalog.json` (Neon Stack $15, Cosmic Merge $19, Brick Blitz $17, Promo Arcade $29, Bundle $59) |
| Uploads | `dist/source/<id>-v1.0.0-standard.zip` |
| Tags | `source-code`, `html5`, `javascript`, `template`, `reskin`, + genre tags |
| Cover / screenshots | same as the game page |

**Description template:**

> **[Title] — HTML5 source code (vanilla JavaScript)**
>
> Play the free demo first: [link to the free game page].
>
> [summary]
>
> **What you get**
> - Complete, commented source code (no frameworks, no build step, no dependencies)
> - One `config.js` with every colour, text and tuning value
> - Buyer README: reskinning guide, ad-hook examples, publishing steps
> - Demo mode for trailers (`?demo=1`)
> - Standard license: use in one end product (game, client project or website)
>
> **Need unlimited projects or client work?** The Extended license is on [Gumroad link].
>
> Support: message me on itch.io.

The **bundle** page: title `Starfruit Arcade — 4 HTML5 Games Source Code Bundle`, upload
`dist/source/starfruit-arcade-bundle-v1.0.0-standard.zip`, link the four free game pages.

> Why Extended only on Gumroad? itch.io sells one price per project. Gumroad has versions
> (Standard / Extended) on one product page, so the choice is clearer there.

## 3. Payments setup

*Settings → Payments*: choose the payment mode itch.io offers you, connect the payout account
and finish the **tax interview**. Leave the revenue share at the default to start (it helps
itch.io keep the platform running, and you can change it per project later).

## 4. Collections and visibility

- Create a collection **"Starfruit Arcade"** with all 4 games and add it to your profile.
- Fill your creator profile: avatar `marketing/out/brand/studio-logo.png`, bio, website link.
- Join a game jam now and then: jams are the biggest free traffic source on itch.io (only
  submit a new game made for the jam, following its rules).

## 5. Devlog template (post on release, then monthly)

> **Title:** [Game] 1.0 is out: [one hook]
>
> Hi! [Game] is a [genre] you can play right in your browser: [link].
>
> **What it is:** [2 sentences]
> **How it was made:** vanilla JavaScript + Canvas, no engine. [One interesting detail, e.g.
> "the merge physics is a custom position-based solver that keeps 60 bodies stable."]
> [GIF or screenshot]
>
> **What's next:** [next update idea]
>
> Developers: the full source code is available here: [source page]. Questions welcome in the comments!

Ideas for later devlogs: "How I made the wheel land exactly on the prize", "Making canvas games
crisp on phones", "5 tips for HTML5 games on portals". Each one is also a Reddit / LinkedIn post.
