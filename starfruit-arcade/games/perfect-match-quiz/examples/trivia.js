/* ==========================================================================
   EXAMPLE — a trivia quiz (used by trivia.html)
   --------------------------------------------------------------------------
   Loaded after config.js, it replaces BRAND_CONFIG.quiz with a trivia quiz.
   To make trivia your main quiz, copy this "quiz" block into config.js and
   delete this file.
   correct = position of the right answer in the list, starting at 0.
   results: min = minimum correct answers; reward (optional) = coupon.
   ========================================================================== */
window.BRAND_CONFIG.quiz = {
  type: 'trivia',
  title: 'How well do you know ice cream?',
  subtitle: '6 questions, 15 seconds each. Score 4+ to win a reward!',
  allowBack: false,
  shuffleAnswers: true,
  timePerQuestion: 15,
  questions: [
    {
      text: 'Which country is famous for gelato?',
      answers: [{ text: 'Italy' }, { text: 'Norway' }, { text: 'Brazil' }, { text: 'Canada' }],
      correct: 0,
      explain: 'Gelato is the Italian take on ice cream: denser and served a little warmer.'
    },
    {
      text: 'What is a sorbet mainly made of?',
      answers: [{ text: 'Cream' }, { text: 'Fruit' }, { text: 'Eggs' }, { text: 'Yogurt' }],
      correct: 1,
      explain: 'Sorbet is fruit (or juice), sugar and water. No dairy at all.'
    },
    {
      text: 'Vanilla comes from which kind of plant?',
      answers: [{ text: 'A rose' }, { text: 'A palm tree' }, { text: 'An orchid' }, { text: 'A tulip' }],
      correct: 2,
      explain: 'Vanilla beans are the pods of a climbing orchid.'
    },
    {
      text: 'What gives chocolate ice cream its flavour?',
      answers: [{ text: 'Caramel' }, { text: 'Coffee' }, { text: 'Malt' }, { text: 'Cocoa' }],
      correct: 3,
      explain: 'Cocoa powder or melted chocolate, both made from cocoa beans.'
    },
    {
      text: 'Which frozen treat is wrapped in a soft rice dough?',
      answers: [{ text: 'Mochi ice cream' }, { text: 'Spumoni' }, { text: 'A sundae' }, { text: 'A float' }],
      correct: 0,
      explain: 'Mochi is a chewy rice cake, wrapped around a ball of ice cream.'
    },
    {
      text: 'Kulfi is a traditional frozen dessert from…',
      answers: [{ text: 'Scandinavia' }, { text: 'South Asia' }, { text: 'South America' }, { text: 'Australia' }],
      correct: 1,
      explain: 'Kulfi is a dense, slow-frozen milk dessert loved across South Asia.'
    }
  ],
  results: [
    { min: 0, title: 'Cone Rookie', icon: 'icecream', description: 'Every expert starts somewhere. Have another go!' },
    { min: 4, title: 'Scoop Scholar', icon: 'cupcake', description: 'You really know your scoops.',
      reward: { title: '10% OFF', code: 'SMART10', description: 'Any cup or cone.' } },
    { min: 6, title: 'Ice Cream Genius', icon: 'diamond', description: 'A perfect score. We are impressed!',
      reward: { title: 'FREE SCOOP', code: 'GENIUS', description: 'One scoop of your choice, on us.' } }
  ]
};
