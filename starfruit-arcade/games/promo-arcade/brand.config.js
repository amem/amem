/* ==========================================================================
   PROMO ARCADE — BRAND CONFIG
   --------------------------------------------------------------------------
   This is the ONE file you edit to put your business on all three games
   (Catch Rush, Memory Match, Spin & Win) and on the hub page.

   • Save the file and reload the page — no build step.
   • Colours are hex values ('#RRGGBB'). Text colours on buttons are picked
     automatically for good contrast.
   • Paths (logoImage, product images) are relative to THIS folder,
     e.g. 'assets/logo.png' → promo-arcade/assets/logo.png
   • The default brand "Juicy Jungle" is a fictional demo smoothie bar.
   ========================================================================== */
window.BRAND_CONFIG = {

  // ---- Identity -------------------------------------------------------------
  name: 'Juicy Jungle',                 // Business name (page titles, share text, alt texts)
  tagline: 'Blend. Sip. Win.',          // Short slogan shown under the logo on the hub
  logoText: 'Juicy Jungle',             // Text logo (used when logoImage is empty); also printed on the Catch Rush cup
  logoIcon: 'pineapple',                // Built-in icon inside the round logo badge ('' = no badge). Keys: see "products" below
  logoImage: '',                        // Optional image logo, e.g. 'assets/logo.png' (replaces badge + text logo). ~200×60 px, transparent PNG/SVG
  demoNotice: 'Juicy Jungle is a fictional demo brand.', // Shown in the hub footer — set to '' for your real brand
  hubLink: true,                        // Show the "All games" link on the game pages (false when you publish a single game)

  // ---- Colours ----------------------------------------------------------------
  colors: {
    primary:    '#E0245E',              // Buttons, the catcher cup, wheel hub, card backs
    secondary:  '#FFC23D',              // Coupons, stars, score highlights, wheel pointer
    accent:     '#2EE6A8',              // Combos, success states, progress bars
    background: '#0A3D33',              // Page background (dark or light both work)
    text:       '#FFF7EA'               // Main text colour on the background
  },
  font: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif', // System fonts only — nothing is downloaded

  // ---- Products -------------------------------------------------------------
  // 6–8 items. Used as falling items (Catch Rush), card faces (Memory Match; 4×4 needs 8)
  // and decorations (hub, wheel). Each item needs a name + ONE picture source:
  //   icon:  built-in flat SVG icon. Fruit: strawberry, pineapple, mango, banana, kiwi,
  //          watermelon, coconut, blueberry · Café: coffee, cupcake, donut, icecream,
  //          pizza, burger · Retail: gift, bag, shirt, heart, gem, star
  //   image: your own picture, e.g. 'assets/latte.png' (square, transparent background, 256 px)
  //   emoji: an emoji, e.g. '🍓' (look depends on the player's device)
  // color: the item's main colour (juice splashes, card tint).
  products: [
    { name: 'Strawberry', icon: 'strawberry', color: '#FF3B5C' },
    { name: 'Pineapple',  icon: 'pineapple',  color: '#FFC21A' },
    { name: 'Mango',      icon: 'mango',      color: '#FF9F1C' },
    { name: 'Banana',     icon: 'banana',     color: '#FFD93B' },
    { name: 'Kiwi',       icon: 'kiwi',       color: '#7ED957' },
    { name: 'Watermelon', icon: 'watermelon', color: '#FF4D5E' },
    { name: 'Coconut',    icon: 'coconut',    color: '#F4E6CF' },
    { name: 'Blueberry',  icon: 'blueberry',  color: '#5566E0' }
  ],

  // ---- Rewards & coupon codes ---------------------------------------------------
  // Codes live in the page source: use generic promo codes (or unique codes created
  // by your webhook, see README → Lead capture).
  rewards: {
    // Catch Rush: the best tier whose minScore is reached wins.
    'catch-rush': [
      { minScore: 250, title: '5% OFF',   code: 'JUICY5',  description: '5% off your next smoothie.' },
      { minScore: 500, title: '10% OFF',  code: 'JUICY10', description: '10% off any smoothie or bowl.' },
      { minScore: 800, title: '15% OFF',  code: 'JUICY15', description: '15% off your whole order today.' }
    ],
    // Memory Match: stars earned (1–3) → reward. Star rules live in memory-match/config.js.
    'memory-match': [
      { minStars: 1, title: '5% OFF',       code: 'MATCH5',   description: '5% off your next smoothie.' },
      { minStars: 2, title: '10% OFF',      code: 'MATCH10',  description: '10% off any smoothie or bowl.' },
      { minStars: 3, title: 'FREE TOPPING', code: 'TOPPING3', description: 'A free topping of your choice.' }
    ],
    // Spin & Win: one wheel segment per entry (6–12 recommended, drawn clockwise).
    //   label:  text on the wheel (use \n for a line break)   weight: relative odds
    //   win:    false = no prize ("Try again")                  icon: optional product icon key
    //   title / code / description: the coupon shown when the segment wins
    'spin-win': {
      spinsPerDay: 0,                   // 0 = unlimited. 1 = one spin per player per day (remembered on the device)
      segments: [
        { label: '10%\nOFF',    color: '#E0245E', weight: 22, win: true,  icon: 'strawberry', title: '10% OFF',       code: 'SPIN10',   description: '10% off any smoothie or bowl.' },
        { label: 'Try\nagain',  color: '#0F5A4B', weight: 18, win: false },
        { label: 'Free\ntopping', color: '#FFC23D', weight: 16, win: true, icon: 'blueberry', title: 'FREE TOPPING', code: 'TOPPING', description: 'A free topping of your choice.' },
        { label: '15%\nOFF',    color: '#7B2FF7', weight: 10, win: true,  icon: 'mango',      title: '15% OFF',       code: 'SPIN15',   description: '15% off your whole order today.' },
        { label: 'So\nclose!',  color: '#0F5A4B', weight: 16, win: false },
        { label: 'Free\nsmoothie', color: '#2EE6A8', weight: 3, win: true, icon: 'pineapple', title: 'FREE SMOOTHIE', code: 'FREESIP', description: 'One free regular smoothie.' },
        { label: '5%\nOFF',     color: '#FF7A3D', weight: 12, win: true,  icon: 'banana',     title: '5% OFF',        code: 'SPIN5',    description: '5% off your next smoothie.' },
        { label: '2 for 1',     color: '#E0245E', weight: 3,  win: true,  icon: 'watermelon', title: '2 FOR 1',       code: 'TWOFOR1',  description: 'Buy one smoothie, get one free.' }
      ]
    }
  },
  rewardNote: 'Show this code at the counter or enter it at checkout. Valid for 7 days.', // Under every coupon ('' = hide)

  // ---- Call to action -------------------------------------------------------
  cta: {
    text: 'Order now',                  // Button text on the result screen and the hub
    url: '',                            // Your shop / booking / menu link. Empty = button hidden
    newTab: true                        // Open the link in a new tab
  },

  // ---- Lead capture ---------------------------------------------------------
  // Shown with the coupon on the result screen. You are responsible for privacy /
  // GDPR compliance (consent text, privacy policy, data storage).
  leadCapture: {
    enabled: true,                      // Show the form at all
    required: false,                    // true = the code is revealed only after the form is sent
    fields: ['name', 'email'],          // Any of: 'name', 'email', 'phone'
    title: 'Where should we send your code?',
    optionalButton: 'Email me this code', // Link that opens the form when it is optional
    labels: { name: 'First name', email: 'E-mail', phone: 'Phone' },
    consentText: 'I agree to receive offers from Juicy Jungle by e-mail. I can unsubscribe at any time.', // '' = no checkbox
    submitText: 'Send my code',
    thanksText: 'Thanks! Your code is on its way.',
    errorText: 'Please fill in all fields correctly.',
    consentError: 'Please tick the box to continue.',
    webhookUrl: '',                     // POST JSON here on submit (Google Apps Script, Zapier, Make, your API). Empty = no request
    webhookFormat: 'json'               // 'json' (Content-Type: application/json) or 'text' (text/plain — for Google Apps Script)
  },

  // ---- Share ------------------------------------------------------------------
  share: {
    text: 'I scored {score} in {game} at {brand}! Can you beat me?', // {score} {game} {brand}
    winText: 'I just won {reward} playing {game} at {brand}!',       // Used when a prize was won
    url: ''                             // Link to share. Empty = the current page when it is online
  },

  // ---- Hub page (index.html) ------------------------------------------------------
  hub: {
    heroKicker: 'Limited-time promo',
    heroTitle: 'Play & Win',
    heroText: 'Play a quick game and unlock a real discount at Juicy Jungle. It takes 30 seconds.',
    heroButton: 'Choose a game',
    gamesTitle: 'Pick your game',
    prizesTitle: 'What you can win',
    stepsTitle: 'How it works',
    steps: [
      { title: 'Play', text: 'Pick a game and play a short round.' },
      { title: 'Win', text: 'Unlock a coupon code instantly.' },
      { title: 'Redeem', text: 'Show the code in store or use it online.' }
    ],
    // Games listed on the hub, in this order. Remove an entry to hide a game.
    games: [
      { id: 'catch-rush',   title: 'Catch Rush',   tag: '30-second challenge', text: 'Catch the falling fruit, dodge the bombs and score big.' },
      { id: 'memory-match', title: 'Memory Match', tag: 'Brain teaser',        text: 'Flip the cards, find every pair and earn up to three stars.' },
      { id: 'spin-win',     title: 'Spin & Win',   tag: 'Instant prize',       text: 'One spin of the lucky wheel. Every spin could be a winner.' }
    ],
    playText: 'Play',
    upTo: 'Win up to {reward}'
  },

  // ---- Legal ------------------------------------------------------------------
  legal: 'Promotion valid while stocks last. One reward per customer per day. No purchase necessary. Codes have no cash value and cannot be combined with other offers.',
  termsText: 'Terms & conditions',     // Link text for termsUrl
  termsUrl: '',                         // Optional link to your full terms / privacy policy

  // ---- Shared interface texts (translate here) ------------------------------------
  texts: {
    allGames: 'All games', play: 'Play', playAgain: 'Play again', resume: 'Resume',
    restart: 'Restart', home: 'Home', paused: 'Paused', share: 'Share', copy: 'Copy',
    copied: 'Copied!', codeCopied: 'Code copied!', copyFailed: 'Select the code to copy it.',
    shareCopied: 'Copied — paste it anywhere!', soundOn: 'Sound on', soundOff: 'Sound off',
    score: 'Score', best: 'Best', newBest: 'NEW BEST!', youWon: 'You won',
    locked: 'Fill in the form to reveal your code', prizes: 'Prizes',
    pause: 'Pause', credit: 'Game kit by {studio}'
  },

  // ---- Sound & credits --------------------------------------------------------
  sound: true,                          // Sound on by default (players can mute; the choice is remembered)
  studioCredit: 'Starfruit Arcade',     // Small credit line ('' = remove)

  // ---- Hooks (analytics, CRM, tracking pixels) ----------------------------------
  // game = 'catch-rush' | 'memory-match' | 'spin-win'. Not called in ?demo=1 mode.
  hooks: {
    onGameStart: function (game) {},            // A round starts
    onGameOver:  function (game, score) {},     // Result screen shown
    onWin:       function (game, reward) {},    // A coupon was won: reward = { title, code, description }
    onLead:      function (data) {},            // Lead form sent: { name, email, phone, consent, game, reward, code, score, brand, time }
    onCtaClick:  function (game) {}             // The call-to-action button was clicked
  }
};
