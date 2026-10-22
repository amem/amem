# Daily Doors — advent & countdown calendar + Scratch & Win (HTML5 source code)

**A new treat behind every door.** A branded online advent calendar for shops, cafés, brands
and creators: one door unlocks every day, customers scratch the foil to reveal a coupon code,
a tip or a message, and they come back tomorrow for the next one. Includes a standalone
**Scratch & Win** card with real prize odds. Rebrand everything in one file.

- **Calendar for any campaign**: 24-door advent, 30-day Ramadan, 12 days of Christmas,
  Black Friday week, a launch countdown… any start date and any number of doors (1–60).
- **Doors unlock by date** at local midnight; past doors can stay open; future doors shake and
  say when they open. A live countdown shows when the next door opens.
- **Scratch-off reveal** with a metallic foil, sparkles, foil dust and a scratch sound, or a
  simple tap-to-open mode. Keyboard and screen-reader users get a "Reveal it all" button.
- **Treat ticket** with coupon code and one-tap Copy, or a message (tips, recipes, thank-yous).
- **Opened doors are remembered** on the device, per campaign.
- **Scratch & Win page** (`scratch.html`): weighted prizes, "not this time" cards, cards-per-day limit.
- **Lead capture** (optional): name / email / phone + consent, posted to any webhook; can be
  required to reveal the code.
- Gift-wrap doors in your brand colours (stripes, dots, zig-zags, plaid, ribbons), shuffled like
  a real advent calendar, with a glowing "Today" door; snow, stars or confetti in the background.
- `?date=YYYY-MM-DD` previews any day of the campaign; `?demo=1` runs a hands-free attract loop.
- Analytics / CRM hooks, share button, all texts translatable, `prefers-reduced-motion` support.
- 28 built-in flat icons (incl. tree, snowflake, candy cane, bell, crescent moon, cookie).
- Vanilla JavaScript, no dependencies, no build step, no external requests, about 150 KB.

## Quick start

1. Unzip and double-click `index.html` (the calendar) or `scratch.html` (the scratch card).
2. Open `config.js` in a text editor, change the name, colours and `startDate`, save, reload.

For development you can also serve the folder with any static server (`npx serve .`).

## Files

| File | What it does |
|---|---|
| `index.html` | The calendar page |
| `scratch.html` | The Scratch & Win page |
| `config.js` | **The one file you edit**: brand, calendar, doors, scratch prizes, texts, hooks |
| `style.css` | Calendar, doors, scratch card and Scratch & Win styles |
| `js/calendar.js` | Dates, door states, countdown, door modal, demo bot |
| `js/scratch.js` | The scratch-off foil (reusable on any element) |
| `js/scratch-page.js` | Scratch & Win logic: weighted prizes, cards per day |
| `js/backdrop.js` | Snow / stars / confetti background |
| `shared/brand.js` | Brand runtime: theme, ticket, lead form, sound, confetti, screens |
| `shared/ui.css` | Shared styles (buttons, overlays, ticket, form) |
| `shared/icons.js` | The built-in icons |

## Set up a campaign (10 minutes)

Everything is in `config.js`.

### 1. Brand
`name`, `tagline`, `logoText` or `logoImage: 'assets/logo.png'`, `logoIcon`, and the seven
`colors`. Button text colours are picked automatically for contrast.

### 2. Dates

```js
calendar: {
  title: 'Advent Calendar',
  startDate: '2026-12-01',   // door 1 opens on this day
  days: 24,                  // number of doors
  allowPastDoors: true,      // missed doors can still be opened
  reveal: 'scratch',         // or 'tap'
  shuffleLayout: true,       // mixed door order
  effect: 'snow'             // 'snow', 'stars', 'confetti', 'none'
}
```

Doors unlock at **midnight in the visitor's own time zone**. Leave `startDate: ''` for the demo
mode (the calendar always starts 6 days before today).

Ideas: Ramadan (`days: 30`, `effect: 'stars'`, `logoIcon: 'moon'`), Black Friday week
(`days: 7`), "12 days of deals" (`days: 12`), a product launch countdown (`days: 5`).

**Test any day** without waiting: `index.html?date=2026-12-10`.

### 3. Doors

```js
doors: [
  { title: 'FREE COOKIE', code: 'DOOR1', description: 'With any hot drink today.', icon: 'cookie' },
  { title: "Baker's tip", description: 'Chill the dough for 30 minutes.', icon: 'star' }
]
```

One entry per day, day 1 first. With a `code` it is a coupon; without, a message. If the list
is shorter than `days`, it repeats. `icon` is a built-in icon key (see `shared/icons.js`).

### 4. Scratch & Win prizes

```js
scratch: {
  cardsPerDay: 1,
  prizes: [
    { title: '10% OFF', code: 'LUCKY10', weight: 30, win: true, icon: 'cupcake' },
    { title: 'Not this time', weight: 26, win: false, icon: 'heart' }
  ]
}
```

`weight` is the relative chance; the prize is drawn first, so the odds are exact. The rarest
winning prize is advertised on the title screen ("Win up to …"). `cardsPerDay` is stored on
the player's device.

### 5. Both pages or one?

The calendar and the scratch card link to each other in the top bar. Set `crossLinks: false`
to hide the links and use only one page.

## Lead capture

```js
leadCapture: {
  enabled: true, required: false, fields: ['name', 'email'],
  consentText: 'I agree to receive offers by email. Unsubscribe anytime.',
  webhookUrl: '', webhookFormat: 'form'
}
```

The form appears on the ticket when a door or card has a code. Each lead is POSTed with
`name`, `email`, `phone`, `consent`, `game`, `reward`, `code`, `brand`, `time` and `page`.

**Google Sheets (free):** in a Google Sheet open *Extensions → Apps Script*, paste the script
below, *Deploy → New deployment → Web app → Who has access: Anyone*, and copy the URL into
`webhookUrl`.

```js
function doPost(e) {
  var p = e.parameter;
  SpreadsheetApp.getActiveSheet().appendRow([p.time, p.brand, p.game, p.reward, p.code, p.name, p.email, p.phone, p.consent]);
  return ContentService.createTextOutput('ok');
}
```

Zapier, Make or n8n "catch hook" URLs work the same way. **Privacy:** the business running the
campaign is responsible for the data; keep the consent checkbox and link a privacy policy in
`legal`. Nothing is sent while `webhookUrl` is empty.

## Embedding and sharing

- **Link / QR code:** upload the folder to any static host and share `index.html`'s URL; print
  it as a QR code on receipts, bags and the counter.
- **iframe** on a website:
  ```html
  <iframe src="https://your-site.example/calendar/index.html" width="100%" height="720"
          style="border:0;max-width:1000px" allow="clipboard-write; web-share" title="Advent Calendar"></iframe>
  ```
- **Email newsletters:** link "Open today's door" to the calendar every day of the campaign.

## Hooks

```js
hooks: {
  onGameStart: function (page) {},          // 'daily-doors' or 'scratch-win'
  onGameOver:  function (page, value) {},   // door number, or the number of wins
  onWin:       function (page, reward) {},  // { title, code, description }
  onLead:      function (data) {}
}
```

Hooks never run in `?demo=1` mode.

## Customising the look

- Door colours come from the brand colours; patterns and ribbons are in `style.css`
  (`.dd-leaf.pat-*`, `.has-ribbon`).
- The foil is drawn in `paint()` in `js/scratch.js` (silver gradient, sparkles, label).
- The background effect is in `js/backdrop.js`.

## Publishing

Upload the folder to any static host (Netlify Drop, Cloudflare Pages, GitHub Pages, your own
site by FTP). For itch.io: zip the folder, HTML project, "This file will be played in the
browser", viewport 960 × 720, mobile friendly, fullscreen button.

## Controls

| Action | Touch | Mouse | Keyboard |
|---|---|---|---|
| Open a door | Tap it | Click it | Tab / arrow keys, then Enter |
| Scratch | Drag a finger | Drag with the button pressed | Space / Enter reveals it all |
| Pause / mute | Top-bar buttons | Top-bar buttons | Esc / P, M |

## Browser support

Latest Chrome, Edge, Firefox and Safari on desktop; iOS Safari 16.4+ and Android Chrome. Works
offline and from `file://`.

## FAQ

**Can visitors cheat by changing their computer date?** They can see doors early on their own
device, like any front-end calendar. Keep the biggest offers modest, use one code per customer in
your POS, or require lead capture to see codes.

**Can each door have a different code per customer?** Codes are fixed per door. For unique codes,
collect leads and send codes from your email tool.

**Can I use it every year?** Yes: change `startDate`, the doors and `storageKey`.

**How do I translate it?** Edit `texts` in `config.js`.

**Support:** contact the seller through the marketplace you purchased from.
