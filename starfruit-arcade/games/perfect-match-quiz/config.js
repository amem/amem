/* ==========================================================================
   PERFECT MATCH QUIZ — CONFIG
   --------------------------------------------------------------------------
   The ONE file you edit: brand, questions, answers, results and rewards.

   • Two quiz types:
       'personality' — each answer adds points to one or more outcomes; the outcome with
                       the most points is the result ("Which flavour are you?",
                       product finders, "Which plan fits you?").
       'trivia'      — each question has one correct answer; the score picks the result
                       ("How well do you know…?"). See examples/trivia.js.
   • Save the file and reload the page. There is no build step.
   • File paths (logoImage, images) are relative to this folder, e.g. 'assets/logo.png'.
   • The default brand, "Scoop Society", is a fictional demo brand.
   ========================================================================== */
window.BRAND_CONFIG = {

  // ---- Identity -------------------------------------------------------------
  name: 'Scoop Society',               // business name (page titles, share text, result image)
  tagline: 'Ice cream with a personality.',
  logoText: 'Scoop Society',           // text logo ('' = use name)
  logoIcon: 'icecream',                // built-in icon beside the text logo ('' = none; keys in shared/icons.js)
  logoImage: '',                       // your logo file, e.g. 'assets/logo.png' (replaces the text logo)

  // ---- Colours ----------------------------------------------------------------
  colors: {
    primary: '#7c4dff',                // buttons, progress bar, highlights
    secondary: '#ff5fa2',              // second accent
    accent: '#ffc94d',                 // gold: rewards, stars
    background: '#f7f2ff',             // page background
    surface: '#ffffff',                // cards
    text: '#24143f',                   // main text
    deep: '#2b1a5c'                    // dark brand colour: header, overlays, result image
  },
  fonts: {
    heading: '"Arial Rounded MT Bold", "Nunito", "Trebuchet MS", "Segoe UI", "Liberation Sans", system-ui, sans-serif',
    body: 'system-ui, -apple-system, "Segoe UI", Roboto, "Liberation Sans", Arial, sans-serif'
  },

  // ---- The quiz -------------------------------------------------------------------
  quiz: {
    type: 'personality',               // 'personality' or 'trivia'
    title: 'Which ice cream flavour are you?',
    subtitle: '5 quick questions to find your perfect scoop.',
    allowBack: true,                   // "Back" button to change an answer
    shuffleAnswers: false,             // mix the answer order on every play
    timePerQuestion: 0,                // trivia only: seconds per question (0 = no timer)

    // Each answer: text, optional icon (built-in key) or image ('assets/x.png'),
    // and points: { outcomeId: points, … }.
    questions: [
      {
        text: 'Pick your perfect Saturday',
        answers: [
          { text: 'A day at the beach', icon: 'coconut', points: { tropical: 2 } },
          { text: 'A cozy movie marathon', icon: 'cookie', points: { chocolate: 2 } },
          { text: 'A farmers market stroll', icon: 'strawberry', points: { berry: 2 } },
          { text: 'Brunch with friends', icon: 'coffee', points: { vanilla: 2 } }
        ]
      },
      {
        text: 'Choose a colour',
        answers: [
          { text: 'Golden sunset', icon: 'mango', points: { tropical: 2 } },
          { text: 'Deep cocoa', icon: 'cookie', points: { chocolate: 2 } },
          { text: 'Pink blush', icon: 'heart', points: { berry: 2 } },
          { text: 'Creamy white', icon: 'icecream', points: { vanilla: 2 } }
        ]
      },
      {
        text: 'Your go-to snack?',
        answers: [
          { text: 'Fresh fruit salad', icon: 'watermelon', points: { berry: 1, tropical: 1 } },
          { text: 'Warm cookies', icon: 'cookie', points: { chocolate: 2 } },
          { text: 'A glazed donut', icon: 'donut', points: { vanilla: 2 } },
          { text: 'Mango slices', icon: 'mango', points: { tropical: 2 } }
        ]
      },
      {
        text: 'How do your friends describe you?',
        answers: [
          { text: 'Adventurous', icon: 'pineapple', points: { tropical: 2 } },
          { text: 'Comforting', icon: 'heart', points: { chocolate: 2 } },
          { text: 'Playful', icon: 'blueberry', points: { berry: 2 } },
          { text: 'Classy', icon: 'diamond', points: { vanilla: 2 } }
        ]
      },
      {
        text: 'And finally, pick a topping',
        answers: [
          { text: 'Toasted coconut', icon: 'coconut', points: { tropical: 2 } },
          { text: 'Hot fudge', icon: 'cookie', points: { chocolate: 2 } },
          { text: 'Fresh strawberries', icon: 'strawberry', points: { berry: 2 } },
          { text: 'Rainbow sprinkles', icon: 'cupcake', points: { vanilla: 2 } }
        ]
      }
    ],

    // Personality results. id must match the ids used in answers' points.
    // reward (optional) = coupon on the result; cta (optional) = button to the product.
    outcomes: [
      {
        id: 'tropical', title: 'Tropical Explorer', product: 'Mango Coconut Sorbet', icon: 'mango',
        description: 'Sunny, curious and always up for a new adventure. Your scoop is bright, fruity and a little bit wild.',
        reward: { title: '15% OFF', code: 'TROPIC15', description: 'Your first Mango Coconut Sorbet.' },
        cta: { text: 'Find it in store', url: '' }
      },
      {
        id: 'chocolate', title: 'Chocolate Soul', product: 'Triple Fudge Brownie', icon: 'cookie',
        description: 'Warm, loyal and the friend everyone calls first. Rich, deep and comforting, just like your scoop.',
        reward: { title: 'FREE TOPPING', code: 'FUDGE', description: 'Hot fudge on us with any cup.' },
        cta: { text: 'Find it in store', url: '' }
      },
      {
        id: 'berry', title: 'Berry Free Spirit', product: 'Strawberry Swirl', icon: 'strawberry',
        description: 'Playful, creative and impossible not to smile around. Sweet with a little tang.',
        reward: { title: '2 FOR 1', code: 'BERRY2', description: 'Bring a friend for a Strawberry Swirl.' },
        cta: { text: 'Find it in store', url: '' }
      },
      {
        id: 'vanilla', title: 'Vanilla Classic', product: 'Madagascar Vanilla Bean', icon: 'icecream',
        description: 'Elegant, reliable and quietly brilliant. Simple things done perfectly are your thing.',
        reward: { title: '10% OFF', code: 'CLASSIC10', description: 'Any vanilla scoop or shake.' },
        cta: { text: 'Find it in store', url: '' }
      }
    ],

    // Trivia results (type 'trivia'): min = minimum correct answers. See examples/trivia.js.
    results: []
  },

  // ---- Call to action (when an outcome has no cta of its own) ---------------------------
  cta: {
    text: 'Visit our shop',            // button on the result screen
    url: ''                            // '' hides the button
  },

  // ---- Lead capture --------------------------------------------------------------------------
  // Shown on the result ticket when the result has a coupon code.
  leadCapture: {
    enabled: true,                     // show the form
    required: false,                   // true = the code is revealed only after the form is sent
    fields: ['name', 'email'],         // any of: 'name', 'email', 'phone'
    consentText: 'I agree to receive offers by email. Unsubscribe anytime.', // '' = no checkbox
    webhookUrl: '',                    // where to POST each lead (the result is included). '' = not sent
    webhookFormat: 'form'              // 'form' (works with most tools) or 'json'
  },

  // ---- Share & legal ------------------------------------------------------------------------------
  share: {
    text: "I'm a {result}! Which flavour are you? Take the {brand} quiz:", // {result} {brand} {score} {total}
    url: '',                           // link to share ('' = the current page address)
    image: true                        // "Save my result" button: a 1080 × 1350 image for stories and posts
  },
  legal: 'Scoop Society is a fictional demo brand. Example offers: one code per customer, valid for 30 days.',

  // ---- Texts (translate here) -------------------------------------------------------------------------
  texts: {
    play: 'Start the quiz',
    playAgain: 'Retake the quiz',
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
    youWon: 'Your reward',
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
    questionOf: 'Question {n} of {total}',
    back: 'Back',
    resultKicker: 'You are a…',
    yourMatch: 'Your perfect match',
    matchBreakdown: 'Your mix',
    saveCard: 'Save my result',
    cardSaved: 'Image saved. Share it on your story!',
    takeQuiz: 'Take the quiz',
    correct: 'Correct!',
    wrong: 'Not quite',
    timeUp: "Time's up!",
    scoreLine: '{score} of {total} correct',
    nextTrivia: 'Get {min} right to win {title}',
    teaser: '{n} questions · 1 minute'
  },

  // ---- Hooks (analytics, CRM) — all optional -------------------------------------------------------------
  hooks: {
    onGameStart: function (quiz) {},            // quiz = 'perfect-match-quiz'
    onAnswer: function (index, answer) {},      // index = question number from 0, answer = the answer object
    onGameOver: function (quiz, score) {},      // trivia: correct answers; personality: 0
    onResult: function (result) {},             // the outcome / result object
    onWin: function (quiz, reward) {},          // reward = { title, code, description }
    onLead: function (data) {}                  // data = { name, email, phone, game, reward, code, result, … }
  },

  // ---- Misc ----------------------------------------------------------------------------------------------------
  sound: { enabledByDefault: true, volume: 0.7 },
  storageKey: 'scoop-society-quiz',    // unique per client so saved data never mixes
  studioCredit: 'Made with Starfruit Arcade' // '' removes the credit line
};
