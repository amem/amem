/* ==========================================================================
   DAILY DOORS — CONFIG
   --------------------------------------------------------------------------
   The ONE file you edit: brand, calendar dates, what is behind each door, and
   the Scratch & Win prizes (scratch.html).

   • Save the file and reload the page. There is no build step.
   • File paths (logoImage) are relative to this folder, e.g. 'assets/logo.png'.
   • Test any date with ?date=YYYY-MM-DD in the address bar, e.g.
     index.html?date=2026-12-10 shows the calendar as it looks on 10 December.
   • The default brand, "Sugar Pine Bakery", is a fictional demo brand.
   ========================================================================== */
window.BRAND_CONFIG = {

  // ---- Identity -------------------------------------------------------------
  name: 'Sugar Pine Bakery',           // business name (page titles, share text)
  tagline: 'Baked fresh, every single day.',
  logoText: 'Sugar Pine',              // text logo ('' = use name)
  logoIcon: 'tree',                    // built-in icon beside the text logo ('' = none; keys in shared/icons.js)
  logoImage: '',                       // your logo file, e.g. 'assets/logo.png' (replaces the text logo)

  // ---- Colours ----------------------------------------------------------------
  colors: {
    primary: '#d7263d',                // buttons, highlights
    secondary: '#1b8a5a',              // second accent
    accent: '#f6c445',                 // gold: ribbons, "today" glow, coupons
    background: '#fff6ec',             // page background
    surface: '#ffffff',                // cards and panels
    text: '#2c1810',                   // main text
    deep: '#12372a'                    // a dark brand colour: header, calendar frame, overlays
  },
  fonts: {
    heading: '"Arial Rounded MT Bold", "Nunito", "Trebuchet MS", "Segoe UI", "Liberation Sans", system-ui, sans-serif',
    body: 'system-ui, -apple-system, "Segoe UI", Roboto, "Liberation Sans", Arial, sans-serif'
  },

  // ---- Calendar (index.html) --------------------------------------------------
  calendar: {
    title: 'Advent Calendar',
    subtitle: 'A new treat behind every door until Christmas Eve.',
    startDate: '',                     // first door, 'YYYY-MM-DD' (e.g. '2026-12-01'). '' = demo: started 6 days ago
    days: 24,                          // number of doors: 24 (advent), 30 (Ramadan), 12, 7 (Black Friday week)…
    allowPastDoors: true,              // missed doors can still be opened later
    reveal: 'scratch',                 // 'scratch' (scratch-off foil) or 'tap' (door opens straight away)
    shuffleLayout: true,               // doors in a mixed order, like a real advent calendar
    effect: 'snow',                    // background: 'snow', 'stars', 'confetti' or 'none'
    endMessage: 'That was the last door. Thank you, and see you next year!'
  },

  // ---- What is behind each door ---------------------------------------------------
  // One entry per day, in order (day 1 first). If there are fewer entries than days,
  // the list repeats. An entry with a code is a coupon; without a code it is a message
  // (a tip, a recipe idea, a thank-you). icon = built-in icon key.
  doors: [
    { title: 'FREE COOKIE', code: 'DOOR1', description: 'With any hot drink today.', icon: 'cookie' },
    { title: '10% OFF', code: 'JOLLY10', description: 'Any cake or pastry.', icon: 'cupcake' },
    { title: "Baker's tip", description: 'Chill cookie dough for 30 minutes before baking for a crisp edge and a soft middle.', icon: 'star' },
    { title: 'FREE COFFEE', code: 'WARMUP', description: 'A regular filter coffee with any breakfast.', icon: 'coffee' },
    { title: '2 FOR 1 DONUTS', code: 'DOUBLE', description: 'Bring a friend!', icon: 'donut' },
    { title: '15% OFF', code: 'SNOWY15', description: 'Your whole order, today only.', icon: 'snowflake' },
    { title: 'MYSTERY GIFT', code: 'SURPRISE', description: 'Ask at the counter with this code.', icon: 'gift' },
    { title: 'FREE TOPPING', code: 'SPRINKLE', description: 'Extra frosting or sprinkles on any cupcake.', icon: 'cupcake' },
    { title: 'Did you know?', description: 'Our sourdough rests for 36 hours before it meets the oven.', icon: 'heart' },
    { title: 'HOT COCOA 50% OFF', code: 'COCOA50', description: 'Marshmallows included.', icon: 'coffee' },
    { title: 'FREE CANDY CANE', code: 'CANE', description: 'For every kid who visits today.', icon: 'candycane' },
    { title: '20% OFF COOKIES', code: 'CRUMBS20', description: 'Boxes of 6 or more.', icon: 'cookie' },
    { title: 'Recipe idea', description: 'Leftover croissants? Bake them into a cinnamon bread pudding.', icon: 'star' },
    { title: 'FREE GIFT WRAP', code: 'WRAPPED', description: 'On any cake or cookie box.', icon: 'gift' },
    { title: '10% OFF', code: 'MERRY10', description: 'Online orders for pick-up.', icon: 'bag' },
    { title: 'FREE ICE CREAM SCOOP', code: 'SCOOP', description: 'With any slice of pie.', icon: 'icecream' },
    { title: 'Thank you!', description: 'This year you made our ovens busier than ever. Thank you for baking it a great one.', icon: 'heart' },
    { title: 'BIRTHDAY CAKE 15% OFF', code: 'CANDLES', description: 'Order by Friday.', icon: 'cupcake' },
    { title: 'FREE DONUT', code: 'DONUT', description: 'With any drink over $4.', icon: 'donut' },
    { title: 'GINGERBREAD KIT 20% OFF', code: 'GINGER20', description: 'Decorate it at home.', icon: 'tree' },
    { title: 'DOUBLE STAMPS', code: 'STAMPS', description: 'Loyalty card stamps count twice today.', icon: 'star' },
    { title: 'FREE BELL COOKIE', code: 'JINGLE', description: 'Our hand-iced holiday special.', icon: 'bell' },
    { title: '25% OFF', code: 'EVE25', description: 'Everything in the shop. Our biggest deal!', icon: 'diamond' },
    { title: 'MERRY CHRISTMAS', code: 'MERRY', description: 'A free festive treat for every visit today.', icon: 'tree' }
  ],

  // ---- Scratch & Win card (scratch.html) ---------------------------------------------
  // weight = relative chance (a prize with weight 30 comes 3× as often as one with 10).
  scratch: {
    title: 'Scratch & Win',
    subtitle: 'Scratch the card to reveal your prize.',
    cardsPerDay: 0,                    // 0 = unlimited; 1 = one card per device per day
    prizes: [
      { title: '10% OFF', code: 'LUCKY10', description: 'Any cake or pastry.', weight: 30, win: true, icon: 'cupcake' },
      { title: 'FREE COOKIE', code: 'COOKIE', description: 'With any drink.', weight: 25, win: true, icon: 'cookie' },
      { title: 'FREE COFFEE', code: 'BREW', description: 'A regular filter coffee.', weight: 15, win: true, icon: 'coffee' },
      { title: '25% OFF', code: 'JACKPOT25', description: 'Your whole order. Lucky you!', weight: 4, win: true, icon: 'diamond' },
      { title: 'Not this time', description: 'Come back tomorrow for another card!', weight: 26, win: false, icon: 'heart' }
    ]
  },

  // ---- Call to action --------------------------------------------------------------------
  cta: {
    text: 'Order online',              // button on the result screen
    url: ''                            // your shop / menu / booking link ('' hides the button)
  },

  // ---- Lead capture --------------------------------------------------------------------------
  // Shown on the treat ticket when a door or card has a code.
  leadCapture: {
    enabled: true,                     // show the form
    required: false,                   // true = the code is revealed only after the form is sent
    fields: ['name', 'email'],         // any of: 'name', 'email', 'phone'
    consentText: 'I agree to receive offers by email. Unsubscribe anytime.', // '' = no checkbox
    webhookUrl: '',                    // where to POST each lead (Google Apps Script, Zapier, Make…). '' = not sent
    webhookFormat: 'form'              // 'form' (works with most tools) or 'json'
  },

  // ---- Share & legal ----------------------------------------------------------------------------
  share: {
    text: 'I opened door {day} of the {brand} advent calendar and got {reward}! 🎁', // {day} {brand} {reward}
    url: ''                            // link to share ('' = the current page address)
  },
  legal: 'Sugar Pine Bakery is a fictional demo brand. Example offers: one code per customer, valid on the day shown.',

  // ---- Texts (translate here) -----------------------------------------------------------------------
  texts: {
    play: 'Open the calendar',
    playAgain: 'Back to the calendar',
    resume: 'Resume',
    restart: 'Restart',
    home: 'Home',
    share: 'Share',
    sound: 'Sound',
    on: 'On',
    off: 'Off',
    paused: 'Paused',
    best: 'Opened',
    newBest: 'New!',
    youWon: "Today's treat",
    yourCode: 'Your code',
    copy: 'Copy',
    copied: 'Code copied!',
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
    teaser: '{n} doors · {n} treats',
    howTo: 'Open today’s door and scratch the foil to reveal your treat. Come back every day!',
    doorKicker: 'Behind door {day}',
    dayHeading: 'Door {day}',
    today: 'Today',
    opensIn: 'Door {day} opens in {time}',
    opensTomorrow: 'Door {day} opens tomorrow',
    nextDoor: 'Next door in {time}',
    startsIn: 'The calendar opens in {time}',
    calendarOver: 'The calendar has ended',
    days: '{n} days',
    missed: 'Missed it? You can still open it.',
    scratchHere: 'Scratch here',
    scratchHint: 'Scratch the foil with your finger or mouse',
    revealAll: 'Reveal it all',
    close: 'Close',
    scratchHeading: 'Scratch & Win',
    winHeading: 'You won!',
    loseHeading: 'Not this time',
    cardsLeft: '{n} card(s) left today',
    comeBack: 'Come back tomorrow for a new card',
    newCard: 'New card',
    scratchPlay: 'Get my card',
    scratchShare: 'I just won {reward} with the {brand} scratch card! 🎉'
  },

  // ---- Hooks (analytics, CRM) — all optional -----------------------------------------------------------
  hooks: {
    onGameStart: function (page) {},            // page = 'daily-doors' | 'scratch-win'
    onGameOver: function (page, value) {},      // value = door number, or 1/0 for a scratch card win
    onWin: function (page, reward) {},          // reward = { title, code, description }
    onLead: function (data) {}                  // data = { name, email, phone, game, reward, code, … }
  },

  // ---- Misc ------------------------------------------------------------------------------------------------
  sound: { enabledByDefault: true, volume: 0.7 },
  crossLinks: true,                    // top-bar link between the calendar and the Scratch & Win page
  storageKey: 'sugar-pine-calendar',   // unique per client and per campaign
  studioCredit: 'Made with Starfruit Arcade' // '' removes the credit line
};
