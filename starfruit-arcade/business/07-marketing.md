# 07 — Marketing: outreach, social, Reddit, video, calendar

The single most effective move for this business: **show a business owner their own brand
inside a playable game.** Everything else (posts, Reddit, videos) builds visibility over time.

---

## 1. Local-business outreach (your fastest first sale)

### Who to contact
Cafés, juice bars, bakeries, ice-cream shops, restaurants, salons, barbers, gyms, yoga studios,
boutiques, phone shops, small online stores, event organisers, and anyone running a "grand
opening". Look for: an active Instagram account, a recent promotion, a clear logo.

Build a list of 20 in a spreadsheet: *name, type, Instagram, website, email/contact form,
status, date contacted, follow-up date, notes.*

### The 5-minute demo
For each of the top 5: rebrand Spin & Win (or Catch Rush) with their logo and colours
([08-order-fulfillment.md](08-order-fulfillment.md) §1), record a 10–15 second screen video on
your phone, and send it with the message below.

**Important:** these demos are **private previews** for that business only. Do not post their
logo or name publicly, and do not imply you work with them. Delete the demo if they say no.

### First message (Instagram DM, email or contact form)

> Hi [first name or business name]! I make small games for local businesses. I put [business]
> on a spin-the-wheel to show you the idea, here is a 15-second preview: [video].
>
> Customers scan a QR code at the counter (or tap a link in your bio), spin, and win a coupon
> you choose, like 10% off or a free [product]. You can also collect their emails for your
> offers.
>
> It costs $[price] one-time and I can set it up this week. Would you like to try it?

Keep it short, friendly and specific. One message, one video, one question.

### Follow-up (after 3–4 days, once)

> Hi [name], just checking you saw the wheel I made for [business]. Happy to adjust the prizes
> or colours if you want to test it for a week. No pressure at all!

Then stop. No reply after two messages = move on.

### When they say yes
Tell them how to order: through your Fiverr gig (safest for both, see [10-rules-and-safety.md](10-rules-and-safety.md))
or a simple written agreement and invoice if you invoice directly in your country. Deliver
with [08-order-fulfillment.md](08-order-fulfillment.md).

### Email subject lines that get opened
- `I put [business] on a prize wheel (15-second preview)`
- `A free game idea for [business]'s customers`
- `[business] + spin to win = ?`

## 2. Social posts

Post from the studio accounts. Show the product moving, not a logo.

**Instagram / TikTok captions (pick one per post):**
1. "This spin-the-wheel took 5 minutes to brand for a juice bar. Customers scan, spin, win. 🎡
   Want one for your shop? Link in bio."
2. "POV: your customers play a game while waiting for their coffee… and leave with a coupon. ☕🎁"
3. "Made a merge puzzle from scratch in JavaScript. No engine, 60 FPS on a phone. Play it free 👇"
4. "Stack it perfect. One tap, 60 seconds, try to beat 30. 🔥"
5. "Before / after: a generic wheel vs the same wheel in a café's colours. Which one would you spin?"
6. "How the wheel lands exactly on the prize you set the odds for 🧵 (carousel)"

**LinkedIn (business owners, marketers, agencies):**
> Small businesses ask me how to get more people to join their mailing list. One answer that
> works: a 30-second game. Customers scan a QR code, play, and leave their email to get a
> coupon. Here is a demo with a made-up smoothie bar: [link to hub].
> Happy to share how to set one up: comment "wheel" and I will send details.

**Hashtags (mix 5–8):** #smallbusiness #marketingideas #gamification #qrcode #html5games
#indiedev #gamedev #javascript #webgames #localbusiness #cafeowner #promotion

## 3. Short videos (TikTok, Reels, Shorts)

Ready-made: `marketing/out/video/<game>-trailer-portrait.mp4` (vertical, ~20 s, no sound).
In the app: add a trending sound or a soft beat, a big text hook in the first second, and a
caption with the link in bio.

**Hooks that work (first-second text):**
- "Can you beat 30?" (Neon Stack)
- "Merge them all into a black hole 🕳️" (Cosmic Merge)
- "This took a café owner 5 minutes" (Promo Arcade)
- "Wait for the jackpot…" (Spin & Win, cut right before the wheel stops)
- "I coded this game in JavaScript, no engine"

**Simple formats to repeat:**
1. *Gameplay + score challenge* (one per game).
2. *Brand transformation:* default demo → client colours (with a fictional brand, or with
   written permission from a real client).
3. *Behind the code:* screen recording of `config.js`, change one colour, the game updates.
4. *Satisfying moment:* the merge chain, the brick explosion, the wheel landing.

Record new clips with `?demo=1` on your phone (screen recorder) or re-run `npm run assets`.

## 4. Reddit and communities

Read each subreddit's rules first. Many allow sharing your own game only on certain days, in
weekly threads, or with a flair. Be a member, not a billboard: comment helpfully elsewhere too.

| Where | What to post |
|---|---|
| r/WebGames | One free game per post, a playable link, a one-line description |
| r/playmygame | Ask for feedback, answer every comment |
| r/IndieDev, r/indiegames | A GIF of a satisfying moment + a short story |
| r/gamedev | Only in the self-promotion / feedback threads; share a technique, not a sales pitch |
| r/javascript, r/webdev | "Showoff" threads: how something was built (merge physics, crisp canvas) |
| r/smallbusiness, r/marketing | Only answer questions helpfully; never drop links unasked |

**Post template (r/WebGames / r/playmygame):**
> **Title:** Cosmic Merge: drop and merge planets into a black hole (free, browser, mobile-friendly)
> Body: I built this physics merge puzzle in plain JavaScript. It plays on phone and desktop,
> no download. Feedback welcome, especially on difficulty! [link to the itch.io game page]

## 5. Your website as the hub

Every post, proposal and DM should point to **one** place: your website (or the itch.io
profile until the site is live). Keep `site/site.config.js` up to date so every button works.

## 6. 4-week content calendar

| Week | Mon | Wed | Fri | Daily |
|---|---|---|---|---|
| 1 | Launch post (all 4 games) | Spin & Win trailer | r/WebGames: Neon Stack | 5 business DMs |
| 2 | Cosmic Merge trailer | Behind the code (config.js) | r/playmygame: Brick Blitz | 5 business DMs |
| 3 | Brand transformation (fictional brand) | Catch Rush challenge | itch.io devlog | 5 DMs + follow-ups |
| 4 | Client result or "what I learned" | Brick Blitz satisfying clip | LinkedIn post for businesses | 5 DMs + follow-ups |

Batch-produce: record 4 clips in one sitting on Sunday, schedule them for the week.

## 7. Measure what works

Every week, write down: messages sent → replies → orders; posts → profile visits → link clicks;
which game got the most plays. Do more of the top channel, drop the weakest one.
