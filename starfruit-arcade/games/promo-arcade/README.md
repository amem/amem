# Promo Arcade — branded mini-games kit (HTML5 source code)

**Branded mini-games that turn visitors into customers.** Three quick, polished games
(Catch Rush, Memory Match and Spin & Win) plus a "Play & Win" hub page, all driven by one
config file. Put a shop, café, gym, salon or event on them in five minutes: logo, colours,
products, prizes and coupon codes. Share the link on Instagram, print it as a QR code on
the counter, embed it on a website or run it on a kiosk tablet.

- **3 games in one kit**: Catch Rush (catch the falling products in 30 s), Memory Match
  (3D flip cards with star rating) and Spin & Win (prize wheel with real odds).
- **One-file rebrand**: `brand.config.js` holds name, logo, colours, fonts, products, game
  names, rewards, wheel prizes, call-to-action, legal text and every shared text.
  Button text colours are picked automatically for contrast.
- **Coupon rewards**: score tiers (Catch Rush), star tiers (Memory Match) and a weighted
  prize wheel, shown on a coupon ticket with a one-tap **Copy** button.
- **Lead capture** (optional): name / email / phone with a consent checkbox, posted to any
  webhook (Google Apps Script, Zapier, Make, your own server). Can be required to reveal the code.
- **Spins per day** limit for the wheel, stored on the device.
- **22 built-in flat icons** (fruit, café, food, retail, gifts) that look the same on every
  phone, or use your own product photos or emoji.
- Hub page with animated game previews and a rewards list.
- Juicy feel: confetti, particles, combos, chasing LED lights, a ticking wheel flapper,
  synthesized sound (no audio files), screen shake (off with "reduce motion").
- Mobile-first, works in portrait and landscape, inside iframes and from `file://`.
- Hooks for analytics / CRM (`onGameStart`, `onGameOver`, `onWin`, `onLead`).
- Accessible: real buttons, keyboard play (Memory Match arrow keys, Space/Enter), focus
  outlines, `prefers-reduced-motion` support.
- `?demo=1` attract mode on every game for trailers and kiosk screens.
- Vanilla JavaScript, no dependencies, no build step, no external requests, about 210 KB.

## Quick start

1. Unzip.
2. Double-click `index.html` (the hub) or any game's `index.html`.
3. Open `brand.config.js` in a text editor, change the name and colours, save and reload.

For development you can also serve the folder with any static server (`npx serve .`, the VS
Code Live Server extension…).

## Files

| File | What it does |
|---|---|
| `index.html` | Hub page: brand header, "Play & Win" hero, 3 game cards, rewards list, footer |
| `brand.config.js` | **The one file you edit** for a new brand (fully commented) |
| `shared/brand.js` | Shared runtime: theme, rewards, coupon ticket, lead form, sound, confetti, screens |
| `shared/ui.css` | All styles, driven by the brand colours (CSS variables) |
| `shared/icons.js` | The built-in flat SVG icons |
| `catch-rush/` | `index.html`, `config.js` (gameplay tuning), `game.js` |
| `memory-match/` | `index.html`, `config.js` (grid, time, stars), `game.js` |
| `spin-win/` | `index.html`, `config.js` (spin feel, look), `game.js` |

## The 5-minute rebrand

Everything below is in `brand.config.js`.

| Key | What it changes |
|---|---|
| `name`, `tagline` | Business name (page titles, share text) and the slogan |
| `logoText`, `logoIcon` | Text logo and the built-in icon beside it (`''` hides the icon) |
| `logoImage` | Your logo file, e.g. `'assets/logo.png'`; replaces the text logo everywhere |
| `cupText` | The short word printed on the Catch Rush cup |
| `colors` | `primary` (buttons), `secondary`, `accent` (gold, coupons), `background`, `surface`, `text`, `deep` (header, overlays, wheel rim) |
| `fonts` | Heading and body font stacks (system fonts, nothing is downloaded) |
| `products` | 6–10 items that fall in Catch Rush and fill the Memory Match cards |
| `games` | Game names, hub descriptions, how-to lines, `enabled: false` to hide a game |
| `rewards` | Coupon tiers for Catch Rush (by score) and Memory Match (by stars) |
| `wheel` | Spin & Win segments (label, odds, prize, code) and `spinsPerDay` |
| `cta` | Call-to-action button ("Order now") on result screens and the hub; hidden while `url` is empty |
| `leadCapture` | Lead form on/off, required or optional, fields, consent text, webhook |
| `share`, `legal` | Share message and the terms line under every game |
| `texts` | Every shared word on screen, for translation |
| `storageKey` | Change it per client so saved data never mixes |

### Logo

Put your logo in a new `assets/` folder next to `brand.config.js` and set
`logoImage: 'assets/logo.png'`. A wide logo on a transparent background works best (it is
shown about 36 px tall in the header). The same image is used on the Memory Match card
backs and in the centre of the wheel.

### Product pictures

Each product uses one picture source:

```js
products: [
  { name: 'Latte',  icon: 'coffee', color: '#8a5a2b' },          // built-in icon
  { name: 'Burger', image: 'assets/burger.png', color: '#e8963a' }, // your own picture
  { name: 'Taco',   emoji: '🌮', color: '#ffb81f' }                 // emoji
]
```

Built-in icons: `strawberry pineapple mango banana kiwi watermelon coconut blueberry coffee
donut cupcake icecream pizza burger gift bag heart diamond star bomb rotten cup`.
Your own pictures should be square PNG / WebP / SVG with a transparent background, around
256 × 256 px. `color` is used for the juice splash and the card outline.

### Rewards and coupon codes

```js
rewards: {
  catchRush: [   // min = minimum score
    { min: 250, title: '10% OFF', code: 'JUNGLE10', description: 'On your next smoothie.' },
    { min: 800, title: '2 FOR 1', code: 'BLEND2X',  description: 'Bring a friend.' }
  ],
  memoryMatch: [ // min = stars (1–3)
    { min: 3, title: 'FREE SMOOTHIE', code: 'GENIUS', description: 'Perfect game!' }
  ]
}
```

The best tier reached is shown. Below the lowest tier the player sees "Score 250 to win
10% OFF", which keeps them playing. Codes are fixed strings, so create them in your POS or
online shop as normal discount codes. Collect leads (below) if you need to know who won.

### Wheel prizes and odds

```js
wheel: {
  spinsPerDay: 1,   // 0 = unlimited
  segments: [
    { label: '10% OFF',   weight: 26, win: true,  title: '10% OFF', code: 'SPIN10', description: 'On your next order.' },
    { label: 'TRY AGAIN', weight: 18, win: false },
    { label: 'FREE GIFT', weight: 3,  win: true,  title: 'FREE GIFT', code: 'LUCKY', icon: 'gift' }
  ]
}
```

`weight` is the relative chance: with weights 26, 18 and 3 the free gift lands
3 / 47 ≈ 6 % of the time. The prize is drawn first and the wheel is animated to land on it,
so the odds are exact. The rarest winning segment is advertised as the jackpot
("Win up to FREE GIFT"). 4 to 12 segments read best. `color` can set a segment colour;
otherwise brand colours are used and "no prize" segments get a soft neutral colour.

`spinsPerDay` is stored on the player's device. It stops casual repeat spins but not
someone who clears their browser data, so keep the big prizes rare or require lead capture.

## Lead capture

```js
leadCapture: {
  enabled: true,
  required: false,             // true = code revealed only after the form is sent
  fields: ['name', 'email'],   // 'name', 'email', 'phone'
  consentText: 'I agree to receive offers by email. Unsubscribe anytime.',
  webhookUrl: '',              // where to send each lead
  webhookFormat: 'form'        // 'form' (recommended) or 'json'
}
```

The form appears on the coupon ticket after a win. Each lead is sent as a POST with the
fields `name`, `email`, `phone`, `consent`, `game`, `reward`, `code`, `brand`, `time` and
`page`. After the first form on a device, later wins are sent automatically with the
saved details.

- **Google Sheets (free)**: in a Google Sheet open *Extensions → Apps Script*, paste the
  script below, then *Deploy → New deployment → Web app → Who has access: Anyone*. Copy
  the web-app URL into `webhookUrl`.
  ```js
  function doPost(e) {
    var p = e.parameter;
    SpreadsheetApp.getActiveSheet().appendRow([p.time, p.brand, p.game, p.reward, p.code, p.name, p.email, p.phone, p.consent]);
    return ContentService.createTextOutput('ok');
  }
  ```
- **Zapier / Make / n8n**: create a "Catch hook" / "Custom webhook" trigger, paste its URL into
  `webhookUrl`, play once to send a test lead, then map the fields to your CRM or mailing list.
- **Your own server**: accept `application/x-www-form-urlencoded` (or JSON sent as
  `text/plain` with `webhookFormat: 'json'`). Requests use `no-cors`, so the page never
  reads the response.

You can also handle leads in code with `hooks.onLead(data)`.

**Privacy**: you (or your client) are the data controller. Write consent text that matches
how the data is used, link a privacy policy in `legal`, and follow local rules such as GDPR.
Nothing is sent anywhere while `webhookUrl` is empty.

## Embedding and sharing

- **Link / QR code**: upload the folder to any static host (see "Publishing") and share the
  hub URL or a game URL. Turn it into a QR code with any QR generator for table tents,
  receipts, flyers and event stands.
- **iframe** on a website (works on Wix, Squarespace, WordPress, Shopify custom HTML blocks):
  ```html
  <iframe src="https://your-site.example/promo/spin-win/index.html"
          width="100%" height="640" style="border:0;max-width:960px" allow="clipboard-write; web-share"
          title="Spin & Win"></iframe>
  ```
- **Kiosk / event tablet**: open a game in the browser, use full screen (F11, or "Add to
  Home Screen" on iPad / Android), and set `spinsPerDay: 0`. `?demo=1` gives an
  attract-mode loop for screens nobody touches.

## Hooks (analytics, CRM, ads)

```js
hooks: {
  onGameStart: function (game) { window.gtag && gtag('event', 'game_start', { game: game }); },
  onGameOver:  function (game, score) { window.gtag && gtag('event', 'game_over', { game: game, score: score }); },
  onWin:       function (game, reward) { window.fbq && fbq('track', 'Lead', { content_name: reward.title }); },
  onLead:      function (data) { /* send to your CRM */ }
}
```

`game` is `'catch-rush'`, `'memory-match'` or `'spin-win'`. Hooks never run in `?demo=1`
mode. If you add analytics scripts to the pages, you are adding external requests, so
update your privacy text.

## Per-game tuning

- `catch-rush/config.js`: round length, points, golden star value, combo steps, time
  penalty, spawn rate and fall speed ramps, bad items, keyboard speed, texts.
- `memory-match/config.js`: grid (`3x4`, `4x4`, `4x5`), preview time, time limit, star
  thresholds, mismatch delay, product names on cards, texts.
- `spin-win/config.js`: spin length, extra turns, idle speed, LED bulb count, custom segment
  colours, texts.

To change graphics beyond colours, see `buildBackground()` and `buildCup()` in
`catch-rush/game.js`, the `.mm-*` rules in `shared/ui.css`, and `buildFace()` / `drawRim()`
in `spin-win/game.js`.

## Publishing

Upload the whole `promo-arcade` folder to any static host. It is plain files, so there is
nothing to install:

- **Netlify Drop / Cloudflare Pages / GitHub Pages / Vercel**: drag the folder in or push it.
- **Your existing website**: upload by FTP into a subfolder such as `/promo/`.
- **itch.io** (as a portfolio demo): zip the folder, create an HTML project, tick "This file
  will be played in the browser", viewport 960 × 640, enable "Mobile friendly" and the
  fullscreen button.

The hub (`index.html`) links to the games and every game links back with "All games".
Hide a game with `games.<name>.enabled: false`.

## Controls

| Game | Touch | Mouse | Keyboard |
|---|---|---|---|
| Catch Rush | Drag | Move the mouse | ← → or A / D |
| Memory Match | Tap a card | Click a card | Tab or arrow keys to move, Enter / Space to flip |
| Spin & Win | Tap SPIN or the wheel | Click SPIN or the wheel | Space / Enter |
| All | Pause button | Pause button | Esc / P pause, M mute |

## Browser support

Latest Chrome, Edge, Firefox and Safari on desktop; iOS Safari 16.4+ and Android Chrome.
Works offline and from `file://` (double-click). Sound starts after the first tap, as
browsers require.

## FAQ

**Can I sell the rebranded games to my clients?** Yes, within the terms of your license:
the Standard license covers one end product (one client), the Extended license unlimited.

**Do I need a server?** No. Any static hosting works. A webhook URL is only needed if you
want to collect leads.

**Can players cheat the codes?** Codes are visible in the page source, like any front-end
coupon. Use modest rewards, one code per customer in your POS, and lead capture with
`required: true` when you want to know who claimed what.

**How do I translate it?** Edit `texts` in `brand.config.js` and the `texts` block in each
game's `config.js`.

**Can I remove the credit line?** Yes: set `studioCredit: ''`.

**Support:** contact the seller through the marketplace you purchased from.
