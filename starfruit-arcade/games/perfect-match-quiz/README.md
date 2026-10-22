# Perfect Match Quiz — personality & trivia quiz kit (HTML5 source code)

**Find your perfect match in 60 seconds.** A branded quiz that turns visitors into
customers: "Which flavour are you?", "Find your perfect skincare routine", "Which plan fits
your team?" or "How well do you know our city?". Every result recommends a product, can
unlock a coupon, collects the lead and creates a shareable result image for Instagram stories.

- **Two quiz types in one kit**
  - *Personality / product finder*: each answer adds points to one or more outcomes; the best
    match wins, with a "your mix" percentage breakdown.
  - *Trivia*: one correct answer per question, instant right/wrong feedback with an
    explanation, optional timer, result tiers by score.
- **Results that sell**: product recommendation, coupon ticket with Copy button, per-result
  call-to-action button, and "score 4 to win…" nudges on trivia.
- **Shareable result image** (1080 × 1350): one tap shares it on phones that support sharing,
  or downloads it as a PNG.
- **Lead capture** (optional): name / email / phone + consent, sent to any webhook with the
  quiz result attached; can be required to reveal the code.
- Picture answers (built-in icons or your own images) or text answers, 2–8 per question,
  optional shuffling, Back button, progress bar, smooth card transitions.
- Keyboard play (1–9 to answer), screen-reader friendly buttons, reduced-motion support.
- Analytics hooks for every answer and result (`onAnswer`, `onResult`, `onLead`…).
- `?demo=1` attract mode answers by itself for trailers and kiosks.
- One-file setup in `config.js`; all texts translatable. Vanilla JavaScript, no dependencies,
  no build step, no external requests, about 135 KB.

## Quick start

1. Unzip and double-click `index.html` (personality quiz) or `trivia.html` (trivia example).
2. Open `config.js` in a text editor, change the brand and the questions, save and reload.

## Files

| File | What it does |
|---|---|
| `index.html` | The quiz page |
| `trivia.html` | Same page with the trivia example loaded |
| `config.js` | **The one file you edit**: brand, quiz, outcomes, rewards, texts, hooks |
| `examples/trivia.js` | A complete trivia quiz (copy its `quiz` block into `config.js` to use it) |
| `style.css` | Quiz styles |
| `js/quiz.js` | Quiz engine, results, result image, demo bot |
| `shared/brand.js` | Brand runtime: theme, ticket, lead form, sound, confetti, screens |
| `shared/ui.css` | Shared styles (buttons, overlays, ticket, form) |
| `shared/icons.js` | The built-in icons |

## Write your quiz (15 minutes)

### Personality / product finder

```js
quiz: {
  type: 'personality',
  title: 'Which coffee matches your mood?',
  subtitle: '5 quick questions.',
  allowBack: true,
  shuffleAnswers: false,
  questions: [
    {
      text: 'How do you start your morning?',
      answers: [
        { text: 'Up at 6, ready to go', icon: 'coffee', points: { espresso: 2 } },
        { text: 'Slowly, with a good book', icon: 'heart', points: { latte: 2 } },
        { text: 'Somewhere in between', icon: 'star', points: { espresso: 1, latte: 1 } }
      ]
    }
  ],
  outcomes: [
    { id: 'espresso', title: 'Bold Espresso', product: 'Double Shot', icon: 'coffee',
      description: 'Focused and fearless.',
      reward: { title: '10% OFF', code: 'BOLD10', description: 'Any espresso drink.' },
      cta: { text: 'Order now', url: 'https://your-shop.example/espresso' } },
    { id: 'latte', title: 'Velvet Latte', product: 'Oat Latte', icon: 'cup', description: 'Calm and creative.' }
  ]
}
```

- `points` can give points to several outcomes (`{ espresso: 1, latte: 1 }`).
- Ties go to the outcome listed first.
- `icon` uses the built-in icons (see `shared/icons.js`); use `image: 'assets/espresso.png'` for
  your own product photos (square, about 256 × 256 px).
- `reward` and `cta` are optional per outcome. Without `cta` the general `cta` is used.
- 4–8 questions and 3–6 outcomes work best.

### Trivia

Open `examples/trivia.js` for a complete example. In short:

```js
quiz: {
  type: 'trivia',
  timePerQuestion: 15,          // 0 = no timer
  shuffleAnswers: true,
  questions: [
    { text: 'Which country is famous for gelato?',
      answers: [{ text: 'Italy' }, { text: 'Norway' }, { text: 'Brazil' }],
      correct: 0,               // position of the right answer, from 0
      explain: 'Gelato is the Italian take on ice cream.' }
  ],
  results: [
    { min: 0, title: 'Rookie', description: 'Have another go!' },
    { min: 4, title: 'Expert', reward: { title: '10% OFF', code: 'SMART10' } }
  ]
}
```

`min` is the minimum number of correct answers. Below a rewarded tier, players see
"Get 4 right to win 10% OFF".

## Lead capture

```js
leadCapture: {
  enabled: true, required: false, fields: ['name', 'email'],
  consentText: 'I agree to receive offers by email. Unsubscribe anytime.',
  webhookUrl: '', webhookFormat: 'form'
}
```

The form appears on the result ticket when the result has a coupon code. Each lead is POSTed
with `name`, `email`, `phone`, `consent`, `result`, `reward`, `code`, `game`, `brand`, `time`
and `page`, so you can segment your mailing list by result.

**Google Sheets (free):** in a Google Sheet open *Extensions → Apps Script*, paste the script,
*Deploy → New deployment → Web app → Who has access: Anyone*, and copy the URL into `webhookUrl`.

```js
function doPost(e) {
  var p = e.parameter;
  SpreadsheetApp.getActiveSheet().appendRow([p.time, p.result, p.reward, p.code, p.name, p.email, p.phone, p.consent]);
  return ContentService.createTextOutput('ok');
}
```

Zapier, Make, n8n and most email tools accept the same webhook. **Privacy:** the business
running the quiz is responsible for the data; keep the consent checkbox and link a privacy
policy in `legal`. Nothing is sent while `webhookUrl` is empty.

## Result image

"Save my result" draws a 1080 × 1350 image (brand name, quiz title, result picture and name,
product, "Take the quiz" button). On phones that support sharing files it opens the share sheet
(Instagram, WhatsApp…); elsewhere it downloads a PNG. Set `share.image: false` to hide the
button. The drawing code is `drawCard()` in `js/quiz.js`.

## Hooks

```js
hooks: {
  onGameStart: function (quiz) {},
  onAnswer:   function (index, answer) {},   // every answer, e.g. send to your analytics
  onResult:   function (result) {},          // the outcome / tier object
  onGameOver: function (quiz, score) {},
  onWin:      function (quiz, reward) {},
  onLead:     function (data) {}
}
```

Hooks never run in `?demo=1` mode.

## Embedding

Upload the folder to any static host and share the link, print it as a QR code, or embed it:

```html
<iframe src="https://your-site.example/quiz/index.html" width="100%" height="760"
        style="border:0;max-width:900px" allow="clipboard-write; web-share" title="Quiz"></iframe>
```

For itch.io: zip the folder, HTML project, "This file will be played in the browser",
viewport 960 × 720, mobile friendly, fullscreen button.

## Controls

| Action | Touch / mouse | Keyboard |
|---|---|---|
| Answer | Tap or click an answer | 1–9, or Tab + Enter |
| Back | "Back" button | Backspace |
| Pause / mute | Top-bar buttons | Esc / P, M |

## Browser support

Latest Chrome, Edge, Firefox and Safari on desktop; iOS Safari 16.4+ and Android Chrome. Works
offline and from `file://`.

## FAQ

**Can I have more than one quiz?** Copy the folder, one per quiz, and give each a different
`storageKey`.

**Can I link answers to products in my shop?** Yes: each outcome's `cta.url` can open the
product page.

**Can I translate it?** Edit `texts` in `config.js`.

**Support:** contact the seller through the marketplace you purchased from.
