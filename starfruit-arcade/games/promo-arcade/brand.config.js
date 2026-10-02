/* ==========================================================================
   PROMO ARCADE — BRAND CONFIG
   --------------------------------------------------------------------------
   This is the ONE file you edit to put a business on all three games
   (Catch Rush, Memory Match, Spin & Win) and on the hub page.

   • Save the file and reload the page. There is no build step.
   • File paths (logoImage, product images) are relative to THIS folder,
     e.g. 'assets/logo.png' means promo-arcade/assets/logo.png.
   • Colours are CSS hex colours (#rgb or #rrggbb). The text colour on
     buttons is chosen automatically for readable contrast.
   • The default brand, "Juicy Jungle", is a fictional smoothie bar.
   ========================================================================== */
window.BRAND_CONFIG = {

  // ---- Identity -------------------------------------------------------------
  name: 'Juicy Jungle',                // business name (page titles, share text)
  tagline: 'Blend. Sip. Win.',         // short slogan shown under the logo
  logoText: 'Juicy Jungle',            // text logo ('' = use name)
  logoIcon: 'cup',                     // built-in icon beside the text logo ('' = none; keys in shared/icons.js)
  logoImage: '',                       // your logo file, e.g. 'assets/logo.png' (replaces the text logo)
  cupText: 'JUICY',                    // short word printed on the Catch Rush cup (up to ~8 letters)

  // ---- Colours --------------------------------------------------------------
  colors: {
    primary: '#ff5b2e',                // main buttons and highlights
    secondary: '#13a874',              // second accent (badges, matches, success)
    accent: '#ffc928',                 // gold: stars, coupons, golden items
    background: '#fff3e3',             // page background
    surface: '#ffffff',                // cards and panels
    text: '#2b1708',                   // main text
    deep: '#0d4d3a'                    // a dark brand colour: header bar, overlays, wheel rim
  },

  // ---- Fonts (system fonts only, so nothing is downloaded) -------------------
  fonts: {
    heading: '"Arial Rounded MT Bold", "Nunito", "Trebuchet MS", "Segoe UI", "Liberation Sans", system-ui, sans-serif',
    body: 'system-ui, -apple-system, "Segoe UI", Roboto, "Liberation Sans", Arial, sans-serif'
  },

  // ---- Products -------------------------------------------------------------
  // 6–10 items. They fall in Catch Rush and fill the Memory Match cards.
  // Each item uses ONE picture source:
  //   icon:  a built-in icon key (see shared/icons.js: strawberry, coffee, donut, pizza, gift…)
  //   image: your own file, e.g. 'assets/latte.png' (square, transparent background looks best)
  //   emoji: '🍓' (quick, but looks different on every phone)
  // color: used for the juice splash and card accents.
  products: [
    { name: 'Strawberry', icon: 'strawberry', color: '#f2364a' },
    { name: 'Pineapple', icon: 'pineapple', color: '#ffb81f' },
    { name: 'Mango', icon: 'mango', color: '#ff8a1f' },
    { name: 'Banana', icon: 'banana', color: '#ffd93b' },
    { name: 'Kiwi', icon: 'kiwi', color: '#7cc242' },
    { name: 'Watermelon', icon: 'watermelon', color: '#ff4f62' },
    { name: 'Coconut', icon: 'coconut', color: '#a87444' },
    { name: 'Blueberry', icon: 'blueberry', color: '#4a64d1' }
  ],

  // ---- Games: names, hub descriptions, on/off --------------------------------
  games: {
    catchRush: {
      enabled: true,                   // false hides the card on the hub page
      title: 'Catch Rush',
      description: 'Catch the falling fruit in 30 seconds. Dodge the bombs!', // hub card text
      howTo: 'Move the cup to catch the fruit. Golden stars are worth 5×. Avoid bombs and rotten fruit!' // title screen
    },
    memoryMatch: {
      enabled: true,
      title: 'Memory Match',
      description: 'Flip the cards and find every pair before time runs out.',
      howTo: 'Flip two cards at a time and find all the pairs. Fewer moves earn more stars!'
    },
    spinWin: {
      enabled: true,
      title: 'Spin & Win',
      description: 'One spin, real prizes. What will you get today?',
      howTo: 'Tap SPIN and watch where the wheel stops. Every win comes with a coupon code.'
    }
  },

  // ---- Rewards (coupon codes) -------------------------------------------------
  // The best tier the player reaches is shown with its code and a Copy button.
  // Catch Rush:   min = minimum score.
  // Memory Match: min = stars earned (1 to 3; stars depend on moves, see memory-match/config.js).
  rewards: {
    catchRush: [
      { min: 250, title: '10% OFF', code: 'JUNGLE10', description: 'On your next smoothie, any size.' },
      { min: 500, title: 'FREE TOPPING', code: 'TOPITUP', description: 'Add chia, granola or coconut on us.' },
      { min: 800, title: '2 FOR 1', code: 'BLEND2X', description: 'Bring a friend: two smoothies for the price of one.' }
    ],
    memoryMatch: [
      { min: 1, title: '5% OFF', code: 'MATCH5', description: 'A little thank-you for playing.' },
      { min: 2, title: '15% OFF', code: 'MATCH15', description: 'Sharp memory! On any drink.' },
      { min: 3, title: 'FREE SMOOTHIE', code: 'GENIUS', description: 'Perfect game. A regular smoothie on the house.' }
    ]
  },

  // ---- Prize wheel (Spin & Win) -----------------------------------------------
  // weight = relative chance: a segment with weight 30 is hit 3× as often as one with 10.
  // win: false segments ("Try again") give no code. color '' = automatic brand colours.
  // icon (optional) = built-in icon key drawn on the segment.
  wheel: {
    spinsPerDay: 0,                    // 0 = unlimited. 1 = one spin per device per day (stored on the device)
    segments: [
      { label: '10% OFF', weight: 26, win: true, title: '10% OFF', code: 'SPIN10', description: 'On your next order.', color: '' },
      { label: 'TRY AGAIN', weight: 18, win: false, color: '' },
      { label: 'FREE SHOT', weight: 14, win: true, title: 'FREE GINGER SHOT', code: 'ZING', description: 'A ginger-lemon shot with any smoothie.', color: '', icon: 'star' },
      { label: '15% OFF', weight: 14, win: true, title: '15% OFF', code: 'SPIN15', description: 'On any drink today.', color: '' },
      { label: 'SO CLOSE', weight: 12, win: false, color: '' },
      { label: 'FREE SMOOTHIE', weight: 3, win: true, title: 'FREE SMOOTHIE', code: 'JACKPOT', description: 'A regular smoothie on the house. Lucky you!', color: '', icon: 'cup' },
      { label: '5% OFF', weight: 26, win: true, title: '5% OFF', code: 'SPIN5', description: 'Every sip counts.', color: '' },
      { label: 'TOPPING', weight: 16, win: true, title: 'FREE TOPPING', code: 'TOPSPIN', description: 'Any topping, on us.', color: '' }
    ]
  },

  // ---- Call to action -----------------------------------------------------------
  cta: {
    text: 'Order now',                 // button on the result screen and hub
    url: ''                            // your shop / booking / menu link ('' hides the button)
  },

  // ---- Lead capture -------------------------------------------------------------
  // Shown on the result screen when a player wins a reward.
  leadCapture: {
    enabled: true,                     // show the form
    required: false,                   // true = the code is revealed only after the form is sent
    fields: ['name', 'email'],         // any of: 'name', 'email', 'phone'
    consentText: 'I agree to receive offers by email. Unsubscribe anytime.', // '' = no checkbox
    webhookUrl: '',                    // where to POST each lead (Google Apps Script, Zapier, Make…). '' = not sent
    webhookFormat: 'form'              // 'form' (works with most tools) or 'json'
  },

  // ---- Share & legal --------------------------------------------------------------
  share: {
    text: 'I just played {game} at {brand} and scored {score}! Can you beat me?', // {game} {brand} {score} {reward}
    url: ''                            // link to share ('' = the current page address)
  },
  legal: 'Juicy Jungle is a fictional demo brand. Example rewards: one code per customer, valid for 30 days, not exchangeable for cash.',

  // ---- Hub page texts -------------------------------------------------------------
  hub: {
    kicker: 'Play & Win',
    headline: 'Play a game. Win a treat.',
    subline: 'Three quick games with real rewards. It takes less than a minute.',
    rewardsTitle: 'Rewards up for grabs',
    button: 'Spin the wheel'           // the hero button opens Spin & Win
  },

  // ---- Shared texts (translate here) -------------------------------------------------
  texts: {
    allGames: 'All games',
    play: 'Play',
    playAgain: 'Play again',
    resume: 'Resume',
    restart: 'Restart',
    home: 'Home',
    share: 'Share',
    sound: 'Sound',
    on: 'On',
    off: 'Off',
    paused: 'Paused',
    best: 'Best',
    newBest: 'New best!',
    youWon: 'You won',
    yourCode: 'Your code',
    copy: 'Copy',
    copied: 'Code copied!',
    nextReward: 'Score {min} to win {title}',
    winUpTo: 'Win up to {title}',
    leadTitle: 'Where should we send your code?',
    leadTitleRequired: 'Enter your details to reveal your code',
    leadName: 'Your name',
    leadEmail: 'Email address',
    leadPhone: 'Phone number',
    leadSubmit: 'Send me the code',
    leadReveal: 'Reveal my code',
    leadThanks: 'Thanks! Your code is on its way.',
    leadInvalid: 'Please check the highlighted field.',
    shareCopied: 'Link copied. Paste it anywhere!',
    demoNotice: 'Demo brand'
  },

  // ---- Hooks (analytics, CRM, ads) — all optional --------------------------------------
  hooks: {
    onGameStart: function (game) {},            // game = 'catch-rush' | 'memory-match' | 'spin-win'
    onGameOver: function (game, score) {},
    onWin: function (game, reward) {},          // reward = { title, code, description }
    onLead: function (data) {}                  // data = { name, email, phone, game, reward, code, … }
  },

  // ---- Misc ------------------------------------------------------------------------------
  sound: { enabledByDefault: true, volume: 0.7 },
  storageKey: 'juicy-jungle',          // unique per client so saved data never mixes
  studioCredit: 'Games by Starfruit Arcade' // '' removes the credit line
};
