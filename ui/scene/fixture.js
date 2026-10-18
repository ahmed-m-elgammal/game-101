/**
 * fixture.js — T3.9 fixture scene node: the opening of Chapter 1.
 * Every line is canon ([GDD] §3 "Chapter 1 — The Candle Crypt"); the choice
 * is the chapter's canon choice verbatim, with the F26/A2 grant note. This
 * is demo data for the renderer seed — the real story data layer is Phase 6.
 */

export const CH1_OPENING = {
  id: 'ch1_open',
  chapter: 'ch1',
  heading: 'Chapter 1 — The Candle Crypt',
  plate: 'assets/img/act1-plate.webp', // T8.9 asset; the slot lazy-loads and degrades
  prose: [
    { text: 'You wake on a stone shelf with a candle in your hand that will not go out and no memory of your own name. The name comes back when you say it, and it stays as long as you keep saying it.' },
    { speaker: 'Maren', text: 'Vigil. That is a job, not a name. It will do for now.' },
    { text: 'The crypt is full of people who are not moving. A sexton is still digging. A bell-ringer is still ringing. They do not see you. You find a hymn-book and the candle answers when you read it aloud — words come out wearing weight. That is a verse, and that is the whole combat tutorial: you say something, it happens, and then it has to recharge.' },
  ],
  choices: [
    {
      id: 'ch1_mace',
      label: 'Take the Pallbearer\'s Mace.',
      tally: 'ruthless',
      gift: 'Pallbearer\'s Mace — +30% damage against targets under 35% HP. (§8.1)',
    },
    {
      id: 'ch1_shroud',
      label: 'Take the Sexton\'s Shroud.',
      tally: 'mercy',
      gift: 'Sexton\'s Shroud — +2 GRD, start each fight with 10 Ward. (§8.1)',
    },
    {
      id: 'ch1_hymn',
      label: 'Burn the hymn-book and learn the verses yourself.',
      tally: 'devotion',
      gift: 'Grave-Shovel of Bram — +2 GRD, start each fight with Brace. (§8.1)',
    },
  ],
  duelId: 'tutorial_bram',
};
