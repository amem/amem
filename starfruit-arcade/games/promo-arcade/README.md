# Promo Arcade — branded mini-games kit (HTML5 source code)

**Branded mini-games that turn visitors into customers.** Three ready-made games for shops,
cafés, restaurants, gyms, events and online stores: players have fun for 30 seconds and win a
real coupon code. Rebrand everything (logo, colours, products, prizes, texts) in **one file**.

- **Catch Rush**: catch the falling products in a cup printed with your logo; golden items
  score 5×, bombs cost time; the score unlocks a coupon tier.
- **Memory Match**: flip cards with your products, earn up to three stars; stars unlock a coupon.
- **Spin & Win**: a prize wheel with your own segments and odds, ticking pointer, chasing
  lights and confetti; optional spins-per-day limit.
- **Hub page** (`index.html`): "Play & Win" landing page linking the three games, prize list,
  steps and legal text.
- Coupon card with one-tap copy, optional **lead-capture form** (name / e-mail / phone + consent)
  that posts to your webhook (Google Sheets, Zapier, Make, your API).
- Call-to-action button (order / book / visit), share button, analytics hooks.
- 20 built-in flat product icons (fruit, café, retail) or your own pictures; automatic text
  contrast for any brand colours, light or dark.
- Mobile-first for QR codes, Instagram links and kiosks; keyboard and screen-reader friendly.
- Vanilla JavaScript, no dependencies, no build step, no external requests by default, ~100 KB.

## Quick start

1. Unzip.
2. Double-click `index.html` (the hub) or any game's `index.html`.
3. Open `brand.config.js` in any text editor, change the brand, save, reload.

## 5-minute rebrand

Everything lives in **`brand.config.js`** (fully commented):

| Section | What to change |
|---|---|
| `name`, `tagline`, `logoText` | Your business name and slogan |
| `logoIcon` / `logoImage` | A built-in icon in a round badge, or your own logo file (`'assets/logo.png'`) |
| `colors` | `primary`, `secondary`, `accent`, `background`, `text` — button text colours adapt automatically |
| `products` | 6–8 items: `{ name, icon }`, `{ name, image: 'assets/x.png' }` or `{ name, emoji }` |
| `rewards['catch-rush']` | Score thresholds → coupon (`minScore`, `title`, `code`, `description`) |
| `rewards['memory-match']` | Stars (1–3) → coupon |
| `rewards['spin-win']` | Wheel segments: `label`, `color`, `weight` (odds), `win`, coupon fields; `spinsPerDay` |
| `cta` | Button text + link to your shop, menu or booking page |
| `leadCapture` | The optional form (see below) |
| `hub` | Hub page texts and which games are listed |
| `legal`, `termsUrl` | Promotion terms shown on the hub and title screens |
| `texts` | Every interface word, for translation |
| `demoNotice`, `studioCredit` | Set to `''` to remove for a real client |

Game-specific tuning (round length, difficulty, star rules, wheel speed) is in each game's
`config.js`.

**Built-in icons:** strawberry, pineapple, mango, banana, kiwi, watermelon, coconut, blueberry,
coffee, cupcake, donut, icecream, pizza, burger, gift, bag, shirt, heart, gem, star. Add your own
in `shared/icons.js`.

**Product pictures:** square PNG/WebP, transparent background, ~256 px, e.g.
`assets/latte.png`, referenced as `{ name: 'Latte', image: 'assets/latte.png' }`.

## Lead capture (optional)

`leadCapture.enabled: true` shows a form with the coupon. With `required: true` the code is
revealed only after the form is sent; otherwise it is optional ("Email me this code").

On submit the kit calls `hooks.onLead(data)` and, when `webhookUrl` is set, POSTs JSON:

```json
{ "name": "Sam", "email": "sam@example.com", "phone": "", "consent": true,
  "game": "spin-win", "reward": "10% OFF", "code": "SPIN10", "score": "",
  "brand": "Juicy Jungle", "time": "2026-10-22T12:00:00.000Z" }
```

- **Google Sheets**: create an Apps Script web app with a `doPost(e)` that appends
  `JSON.parse(e.postData.contents)` to a sheet; set `webhookFormat: 'text'`.
- **Zapier / Make**: use a "Catch hook" / "Custom webhook" trigger URL; `webhookFormat: 'json'`.

Privacy: you are responsible for consent text, a privacy policy and how the data is stored
(GDPR / local law). Coupon codes in the config are visible in the page source; for one-time
codes, generate them in your webhook and send them by e-mail.

## Analytics and tracking hooks

```js
hooks: {
  onGameStart: function (game) { /* e.g. gtag('event', 'game_start', { game }) */ },
  onGameOver:  function (game, score) {},
  onWin:       function (game, reward) {},   // { title, code, description }
  onLead:      function (data) {},
  onCtaClick:  function (game) {}
}
```

Hooks are not called in `?demo=1` mode.

## Embedding and publishing

- **Any static host** (Netlify, Vercel, GitHub Pages, your web host): upload the folder.
- **Embed** a single game on your site:

```html
<iframe src="promo-arcade/spin-win/index.html" width="420" height="760"
        style="border:0;max-width:100%" allow="clipboard-write; web-share" title="Spin & Win"></iframe>
```

- **QR code** for a shop window or event: point it at the hub URL.
- **Kiosk / trade-show tablet**: open the hub in the browser's full-screen / kiosk mode.
  Set `spinsPerDay: 0` so every visitor can play.
- To publish one game alone, set `hubLink: false`.

## Files

| Path | What it does |
|---|---|
| `brand.config.js` | **The file you edit** |
| `index.html`, `shared/hub.js` | Hub page |
| `shared/brand.js` | Shared runtime: theme, screens, coupon, lead form, sound, hooks |
| `shared/ui.css` | Shared styles (all colours come from the config) |
| `shared/icons.js` | Built-in product icons |
| `catch-rush/` | `index.html`, `config.js`, `game.js` |
| `memory-match/` | `index.html`, `config.js`, `game.js`, `memory.css` |
| `spin-win/` | `index.html`, `config.js`, `game.js` |

## Controls

| Game | Touch | Mouse | Keyboard |
|---|---|---|---|
| Catch Rush | Drag | Move | ← → |
| Memory Match | Tap cards | Click cards | Tab + Enter |
| Spin & Win | Tap the wheel or Spin | Click | Space / Enter |
| All | Pause button | Pause button | Esc / P pause, M mute |

## Browser support

Latest Chrome, Edge, Firefox, Safari, iOS Safari and Android Chrome.

## FAQ

**Can each player win only once?** Set `spinsPerDay: 1` for the wheel (remembered on the
device). For strict one-per-person rules, use `required` lead capture and check entries in your
webhook.

**Can I change the odds of the wheel?** Yes: `weight` is the relative chance of each segment.

**Can I use it for a giveaway on Instagram?** Yes: share the hub link in your bio or stories.
Follow the platform's promotion rules.

**Can I record a demo video?** Open any game with `?demo=1`.

**Support:** contact the seller through the marketplace you purchased from.
