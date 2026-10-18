/**
 * model.js — T6.1: the campaign as data. [GDD] §3 (the nine chapters, prose
 * and choices verbatim), §4.4 (the hidden fourth thing — hook only, the gate
 * evaluator is T6.8), §13 (the shrines, F24), §17 (branches are additive;
 * nothing canon is rewritten).
 *
 * Every chapter node validates against the frozen `chapter` schema kind,
 * every scene/shrine node against `scene`, every story choice against
 * `choice` (data/schemas/validators.js — T0.3). The final-choice node is
 * bespoke (§4's ending structure, not a §3 choice: it carries the
 * conditional fourth option, which the 3-option scene cross-check cannot
 * express) and carries its own load-time checks below.
 *
 * Additive-branch rule (§17): branches are NEW nodes keyed by run flags;
 * nothing canon is rewritten. The branch keys this module declares:
 *   Ch4 choice  → Ch6 ally-state (order_whole 4 Wardens / order_split 2 /
 *                 order_fractured 0) — the "visibly changes Ch6's fight
 *                 list" contract (§3 Ch4 carries-forward, §15.4 Ph5).
 *   Ch6-Devotion→ Duel 21 ally bell (the Turned Pour, [02] R7d sheet).
 *   Ch8-Mercy   → the Ch9 finale variant (Oren at the top of the stair).
 *   Ch5-Mercy   → Corvane as a named Echo on the player's ladder (T7.4).
 *
 * Rewards resolve through data/sources.js (the T4.4 reward-integrity
 * registry) — this module never invents a grant; it references source ids.
 * Story vows are class-gated exactly as data/vows.js publishes (§7.2):
 * a gate that does not match the player's class grants the tally, the
 * flags and the chapter's material reward, and records the vow as
 * `unslotted` — the gate is the vow's, never the chapter's (see
 * DECISIONS.md §7, the Phase-6 engineering notes).
 */

const { validate } = require('../data/schemas/validators.js');
const { SOURCE_BY_ID, CHAPTER_FIGHTS, ENEMY_BY_ID } = require('../data/index.js');

const TALLIES = ['mercy', 'ruthless', 'devotion'];

// ---------------------------------------------------------------------------
// Chapter nodes — 9 × (prologue scene, duel nodes, choice node, shrine node)
// ---------------------------------------------------------------------------

const CHAPTERS = [
  {
    id: 'ch1', act: 1, index: 1,
    title: 'The Candle Crypt',
    location: 'Cathedral of Saint Orrin, the sealed crypt',
    levelBand: ['1', '2'],
    duels: ['bram', 'sedge'],
    choiceId: 'ch1_choice',
    hasShrine: true,
    actBoss: null,
    unlock: null,
    scene: {
      id: 'ch1_open', chapter: 'ch1',
      heading: 'Chapter 1 — The Candle Crypt',
      prose: [
        { text: 'You wake on a stone shelf with a candle in your hand that will not go out and no memory of your own name. The name comes back when you say it, and it stays as long as you keep saying it.' },
        { speaker: 'Maren', text: 'Vigil. That is a job, not a name. It will do for now.' },
        { text: 'The crypt is full of people who are not moving. A sexton is still digging. A bell-ringer is still ringing. They do not see you. You find a hymn-book and the candle answers when you read it aloud — words come out wearing weight. That is a verse, and that is the whole combat tutorial: you say something, it happens, and then it has to recharge.' },
      ],
    },
    shrine: {
      id: 'ch1_shrine', chapter: 'ch1',
      heading: 'The shrine in the crypt',
      prose: [
        { text: 'A bowl of dead candles and one that is not. The inscription, in a hand that shook: SAY THE NAME. SAY IT AGAIN.' },
      ],
    },
    carries: 'An Ashblade who took the Mace has 30% damage vs low-HP targets from Chapter 1 onward — intentional (§3): the choices should be able to trivialise a wall.',
  },
  {
    id: 'ch2', act: 1, index: 2,
    title: 'The Salt Road',
    location: 'The Old Staithe, causeway level, tar pits and toll gates',
    levelBand: ['2', '3'],
    duels: ['brack', 'reaper_silt'],
    choiceId: 'ch2_choice',
    hasShrine: true,
    actBoss: null,
    unlock: null,
    scene: {
      id: 'ch2_open', chapter: 'ch2',
      heading: 'Chapter 2 — The Salt Road',
      prose: [
        { text: 'The way out of the crypt is up through the nave, and the nave is a foot of black water with a rose window sinking into it. The city you climb out into has been at war with itself for five years and has not noticed you.' },
        { text: 'You meet the Toll-Warden, an Echo who taxes the living and the dead with equal contempt, and you meet the first Salt Road question: the causeway gate is held by people who will let you through if you are useful. Everyone in Verrow has an answer to that question.' },
      ],
    },
    shrine: {
      id: 'ch2_shrine', chapter: 'ch2',
      heading: 'The shrine at the toll',
      prose: [
        { text: 'A toll box with the lock long since sold. The inscription: WHAT WAS PAID WAS NOT MINE. WHAT WAS KEPT WAS.' },
      ],
    },
    carries: 'All three routes open the gate. The route decides what the rest of Verrow calls you. The "pay the toll in memories" option is narrative-only — the vendor mechanic is Ch5 (T6.12); they stay distinct.',
  },
  {
    id: 'ch3', act: 1, index: 3,
    title: 'The Drowned Nave',
    location: 'The nave, half underwater',
    levelBand: ['3', '4'],
    duels: ['drowned_choristers', 'pell', 'first_vespers'],
    choiceId: 'ch3_choice',
    hasShrine: true,
    actBoss: 'first_vespers',
    unlock: 'floor',
    unlockLine: 'Unlocks: the Choir Floor. Your Echo can be bound, challenged, and rated. This is where the game stops being a single-player RPG.',
    scene: {
      id: 'ch3_open', chapter: 'ch3',
      heading: 'Chapter 3 — The Drowned Nave',
      prose: [
        { text: 'The wardens in the water will not touch you. Maren explains why, and the explanation is the first hard lie in the game: they will not touch you because the candle is burning, and the candle is a thing the Hush respects. You are, at this point, a walking ward, and the game lets you enjoy that for about ninety seconds.' },
        { text: 'Then Collector Pell arrives with an offer. He buys memories. He has already bought three of yours.' },
      ],
    },
    shrine: {
      id: 'ch3_shrine', chapter: 'ch3',
      heading: 'The shrine in the flood',
      prose: [
        { text: 'Candle stubs floating in a stone font, still lit underwater. The inscription: THE WATER KEEPS WHAT THE FIRE CANNOT.' },
      ],
    },
    carries: 'Act I ends: a class, a vow, a stat spread, 3 items, a working 4-verse loadout, and the Choir Floor.',
  },
  {
    id: 'ch4', act: 2, index: 4,
    title: 'The Thimble Warrens',
    location: 'The alms quarter, one level up. Condemned, dry, full of people.',
    levelBand: ['4', '5'],
    duels: ['sable', 'ysolde'],
    choiceId: 'ch4_choice',
    hasShrine: true,
    actBoss: null,
    unlock: 'vendor',
    unlockLine: 'The Ledger House keeps a vendor in the Wick Market ahead (T6.12 consumes the flag).',
    scene: {
      id: 'ch4_open', chapter: 'ch4',
      heading: 'Chapter 4 — The Thimble Warrens',
      prose: [
        { text: 'The Warrens are where the living go when the Hush takes someone. The Tallow Order runs it, and the Order\'s entire reason for existing is Chapter 9. Warden Cassock finds you because you are carrying a candle and the Order has been looking for a Vigil for nine years.' },
        { text: 'The Order wants you to end the Hymn. The Order also has a Ninth Sister who has started burning Echoes for their marrow because she has read the same books you have and reached a worse conclusion.' },
      ],
    },
    shrine: {
      id: 'ch4_shrine', chapter: 'ch4',
      heading: 'The shrine in the Warrens',
      prose: [
        { text: 'A soldier\'s cairn with a candle burning at the top of it. The inscription: WE WERE COUNTED. REMEMBER THE NUMBER.' },
      ],
    },
    carries: 'The first choice that visibly changes Chapter 6\'s fight list: Mercy — the Order whole, four fielded Wardens arrive as allies; Ruthless — the Marrow-Furnace at the cost of a fractured Order; Devotion — Ysolde\'s Vow and a quieter, split road.',
  },
  {
    id: 'ch5', act: 2, index: 5,
    title: 'The Wick Market',
    location: 'The trade quarter. Legally sanctioned duelling, licensed murder, excellent wine.',
    levelBand: ['5', '6'],
    duels: ['wick_lad', 'corvane'],
    choiceId: 'ch5_choice',
    hasShrine: true,
    actBoss: null,
    unlock: null,
    scene: {
      id: 'ch5_open', chapter: 'ch5',
      heading: 'Chapter 5 — The Wick Market',
      prose: [
        { text: 'The Wick Market is where Echoes are sold. A duelling licence costs less than a loaf. Corvane is the best duellist in the quarter and he has been waiting for you specifically, because somebody told him what your build does, and he brought the answer to it.' },
      ],
    },
    shrine: {
      id: 'ch5_shrine', chapter: 'ch5',
      heading: 'The shrine behind the market',
      prose: [
        { text: 'An apothecary\'s shelf, cleared of everything but the candles. The inscription: EVERYTHING HERE WAS BOUGHT. SOME OF IT WAS PAID FOR.' },
      ],
    },
    carries: 'Corvane\'s counterbuild is picked at chapter start and locked for the run (D11). Losing to him is the lesson, not the ending: the first loss names the axis he punished.',
  },
  {
    id: 'ch6', act: 2, index: 6,
    title: 'The Bellfoundry',
    location: 'The hot terrace, one level below the Orrery',
    levelBand: ['6', '7'],
    duels: ['grast', 'halbrey', 'mother_bell'],
    choiceId: 'ch6_choice',
    hasShrine: true,
    actBoss: 'mother_bell',
    unlock: null,
    scene: {
      id: 'ch6_open', chapter: 'ch6',
      heading: 'Chapter 6 — The Bellfoundry',
      prose: [
        { text: 'Halbrey\'s foundry is pouring bells out of Echo-iron — metal recovered from people who died in the Hush, reforged into resonance. Every new bell adds a voice to the Hymn. Ilvane is not forcing anyone. Everyone here is a craftsman doing excellent work on a horrible commission, and they are proud.' },
      ],
    },
    shrine: {
      id: 'ch6_shrine', chapter: 'ch6',
      heading: 'The shrine at the hot terrace',
      prose: [
        { text: 'A cooling pit swept clean, one candle standing in the middle of it. The inscription: THE POUR REMEMBERS THE MOULD.' },
      ],
    },
    carries: 'Duel 13 is the campaign\'s Rite of Passage teach moment (Halbrey): Steel → Shade → Ember, shown on his panel before the Floor ever shows you a player who uses it.',
  },
  {
    id: 'ch7', act: 3, index: 7,
    title: 'The Orrery of Ash',
    location: 'The observatory, high above the foundry. A dome of ash-glazed brass.',
    levelBand: ['7', '8'],
    duels: ['yune', 'first_movement'],
    choiceId: 'ch7_choice',
    hasShrine: true,
    actBoss: null,
    unlock: null,
    scene: {
      id: 'ch7_open', chapter: 'ch7',
      heading: 'Chapter 7 — The Orrery of Ash',
      prose: [
        { text: 'Everything in the Orrery is a model of a bell. Ilvane built the city as an instrument.' },
        { text: 'Here Maren tells you. Not in a cutscene — in a fight, because she is an Echo too and has been holding back the only weapon that matters. She tells you while the Lector is copying your verses.' },
      ],
    },
    shrine: {
      id: 'ch7_shrine', chapter: 'ch7',
      heading: 'The shrine in the dome',
      prose: [
        { text: 'A lens-maker\'s bench, the brass gone black. The inscription: THE SKY IS A LID. THE BELL IS A KEY.' },
      ],
    },
    carries: 'THE REVEAL — told in combat, while the Lector copies your verses (§3 Ch7).',
  },
  {
    id: 'ch8', act: 3, index: 8,
    title: 'The Lower Silence',
    location: 'Under the cathedral, under the waterline. The road back down.',
    levelBand: ['8', '9'],
    duels: ['tide_bound', 'oren'],
    choiceId: 'ch8_choice',
    hasShrine: true,
    actBoss: null,
    unlock: null,
    scene: {
      id: 'ch8_open', chapter: 'ch8',
      heading: 'Chapter 8 — The Lower Silence',
      prose: [
        { text: 'The stair down to the Lower Silence is the road the last Vigil walked, in the same direction, five years ago, and did not walk back up.' },
      ],
    },
    shrine: {
      id: 'ch8_shrine', chapter: 'ch8',
      heading: 'The shrine at the waterline',
      prose: [
        { text: 'A drowned bell-cage with a dry candle inside it. The inscription: DOWN IS THE DIRECTION. IT WAS ALWAYS THE DIRECTION.' },
      ],
    },
    carries: 'The last Vigil\'s road, walked the other way.',
  },
  {
    id: 'ch9', act: 3, index: 9,
    title: 'The Ashen Choir',
    location: 'The Bellmouth, the top of the city, full of singing',
    levelBand: ['9', '10'],
    duels: ['unbound_chorus', 'ilvanes_second', 'ilvane'],
    choiceId: 'ch9_final',
    hasShrine: true,
    actBoss: 'ilvane',
    unlock: null,
    scene: {
      id: 'ch9_open', chapter: 'ch9',
      heading: 'Chapter 9 — The Ashen Choir',
      prose: [
        { text: 'The Bellmouth is not a room. It is a throat. Everyone who died in the Hush is in here, standing, singing the note Ilvane has been holding for five years because he has nobody to hand it to.' },
      ],
    },
    shrine: {
      id: 'ch9_shrine', chapter: 'ch9',
      heading: 'The last shrine',
      prose: [
        { text: 'No bowl. No inscription. A shelf of rock at the throat of the city, and room for exactly one candle. The tenth shrine — the crypt\'s hidden one — waits below, for whoever walks back down.' },
      ],
    },
    carries: 'Duel 20 is the only fight in the game where the enemy uses no debuffs at all — a genuine change of pace. Phase III of the Bellmouth is the design thesis: he copies verses; he does not copy marks.',
  },
];

// ---------------------------------------------------------------------------
// The nine story choices + the final choice — §3 verbatim, rewards via
// data/sources.js source ids. `vow` is the §7.2 story vow the option earns;
// its class gate is read from data/vows.js (cls 'any' or the class id).
// ---------------------------------------------------------------------------

const CHOICES = [
  {
    id: 'ch1_choice', chapter: 'ch1',
    prompt: 'The two things you were carrying. The crypt had a shroud on a body and a mace in a hand. Someone took the mace. You can take what they took.',
    options: [
      { id: 'ch1_mace', label: 'Take the Pallbearer\'s Mace.', tally: 'ruthless', source: 'ch1_choice_ruthless', gift: 'The dead get lighter when you decide they were carrying too much.' },
      { id: 'ch1_shroud', label: 'Take the Sexton\'s Shroud.', tally: 'mercy', source: 'ch1_choice_mercy', gift: 'You cover the body before you take anything.' },
      { id: 'ch1_hymn', label: 'Burn the hymn-book and learn the verses yourself.', tally: 'devotion', source: 'ch1_choice_devotion', gift: 'The book was Ilvane\'s. You would rather not read his handwriting.' },
    ],
    note: 'F26/A2: all three paths grant their item — the difference is the extra line, and the extra line is remembered.',
  },
  {
    id: 'ch2_choice', chapter: 'ch2',
    prompt: 'The gate. Brack\'s replacement at the gate is sixteen years old and terrified, and holding the gate is the only job he has ever had.',
    options: [
      { id: 'ch2_open', label: 'Open the gate and let the queue through.', tally: 'mercy', source: 'ch2_choice', gift: 'They will be late, and alive, and it is the same sentence.' },
      { id: 'ch2_toll', label: 'Pay the toll in memories.', tally: 'ruthless', source: 'ch2_choice', gift: 'Sell him a year of your past. He lets you through smiling.', narrativeOnly: true },
      { id: 'ch2_sing', label: 'Sing the gate open.', tally: 'devotion', source: 'ch2_choice', gift: 'You use a verse on a door. Maren is quiet for a long moment afterwards.' },
    ],
    note: 'All three routes open the gate; all three carry the chapter\'s material gift (the registry\'s word). The toll option is narrative-only — no memory is actually sold (the vendor mechanic is Ch5, T6.12; they stay distinct).',
  },
  {
    id: 'ch3_choice', chapter: 'ch3',
    prompt: 'The choristers in the water. Three hundred people are standing in the nave with their mouths open. They are not drowning. They are not breathing. They are waiting to be finished.',
    options: [
      { id: 'ch3_finish', label: 'Finish them.', tally: 'ruthless', source: 'ch3_ruthless', gift: 'It\'s the fastest way to make a Hush stop. It is exactly what the Hush wants.' },
      { id: 'ch3_letgo', label: 'Let them go.', tally: 'mercy', source: 'ch3_mercy', statPoint: 1, gift: 'You break the loop. They walk out. Nobody in Verrow is ready for how many people walk out.' },
      { id: 'ch3_learn', label: 'Learn their song.', tally: 'devotion', source: 'ch3_devotion', twinLedger: true, gift: 'You take the note instead of the mercy or the kill. Something in the Bellmouth answers.' },
    ],
    note: 'D3: the Twin Ledger is a second saved loadout, never a reshaping discount — reshaping is already free everywhere.',
  },
  {
    id: 'ch4_choice', chapter: 'ch4',
    prompt: 'The Ninth Sister. Ysolde is down. She is nineteen, she has read everything you have read, and she is about to do to the Echoes what you just did in the nave.',
    options: [
      { id: 'ch4_finish', label: 'Finish her.', tally: 'ruthless', source: 'ch4_ruthless', flags: ['order_fractured'], gift: 'You take the marrow-furnace. It is a real item and it is terrible.' },
      { id: 'ch4_disarm', label: 'Disarm her and let her live.', tally: 'mercy', source: 'ch4_mercy', flags: ['order_whole'], vow: 'wardens_oath', gift: 'She goes to the Warrens. In Chapter 6 the Order is whole and united because of you.' },
      { id: 'ch4_answer', label: 'Take her book and answer her.', tally: 'devotion', source: 'ch4_devotion', flags: ['order_split'], vow: 'ysoldes_vow', gift: 'She kneels. In Chapter 6 the Order splits, and half of it will not help you.' },
    ],
    note: 'The first choice that visibly changes Chapter 6\'s fight list: whole → four fielded Wardens arrive as allies; split → two; fractured → none. (§3 Ch4 carries-forward.)',
  },
  {
    id: 'ch5_choice', chapter: 'ch5',
    prompt: 'Corvane\'s contract. He offers you a seat on the market ladder and a cut. He also offers, off-record, to tell you what he knows about the man who sold him your build.',
    options: [
      { id: 'ch5_contract', label: 'Take the contract.', tally: 'ruthless', source: null, vow: 'ledgers_price', flags: ['corvane_contract'], gift: 'Ledger House pays you. You are, briefly, their problem.' },
      { id: 'ch5_blade', label: 'Take his blade when he falls.', tally: 'ruthless', source: 'ch5_ruthless', flags: ['corvane_dead'], gift: 'You get Corvane\'s Blade, and it crits harder the lower your HP.' },
      { id: 'ch5_spare', label: 'Spare him.', tally: 'mercy', source: 'ch5_mercy', flags: ['corvane_spared'], vow: 'grey_duelist', gift: 'He lives, he becomes a named Echo on your ladder, and he will show up in your Vigil Ledger fighting for you, not against you, forever after.' },
    ],
    note: 'Two of the three paths are Ruthless — the tally is not a 3-3-3 symmetry, and that is canon. The spared Corvane is the T7.4 ladder-Echo flag.',
  },
  {
    id: 'ch6_choice', chapter: 'ch6',
    prompt: 'The furnace. The recasting can be stopped. Everyone in the foundry loses their livelihood and the last two years of work in one afternoon. Nobody dies. That is the point — the cruelty here is economic, and it is the cruellest thing in the game.',
    options: [
      { id: 'ch6_quench', label: 'Quench it.', tally: 'mercy', source: null, flags: ['gate_key', 'halbrey_hostile'], gift: 'The Echo-iron cools. The Echoes in it are finally, permanently still. Halbrey hates you. Cassock gives you the Gate key.' },
      { id: 'ch6_feed', label: 'Feed it.', tally: 'ruthless', source: null, flags: ['furnace_fed'], vow: 'twelve_tolls', gift: 'You put something of yours in the pour. You come out of this fight with +1 permanent Resolve at the start of every fight, forever, and Halbrey names the bell after you.' },
      { id: 'ch6_turn', label: 'Turn the pour.', tally: 'devotion', source: null, flags: ['pour_turned'], vow: 'turned_pour', gift: 'You re-tune the bell to a different note and it fights on your side in Chapter 9 as an ally. You do not fully understand what you have done yet.' },
    ],
    note: 'The Gate key is Cassock\'s — a progression key (flag), not the Ch8 Leaden Key relic; the registry keeps them distinct. The feed\'s +1 starting Resolve is the flag\'s effect for every class; Twelve Tolls (§7.2) is the vow carrier for a Cinder Witch — same source, same +1, never stacking (DECISIONS.md §7).',
  },
  {
    id: 'ch7_choice', chapter: 'ch7',
    prompt: 'The record. The Orrery keeps a record of the Vigil who fell. It has a name, and the name is not the one you chose at creation, and it is written in Ilvane\'s hand.',
    options: [
      { id: 'ch7_read', label: 'Read the name aloud.', tally: 'devotion', source: 'ch7_devotion', vow: 'fixed_point', gift: 'You say it, and the Orrery answers, and something in the Bellmouth stops singing for exactly one second.' },
      { id: 'ch7_burn', label: 'Burn the record.', tally: 'mercy', source: 'ch7_mercy', vow: 'no_paper', gift: 'Whatever you were, you were a person, and a person does not have to keep their paperwork.' },
      { id: 'ch7_keep', label: 'Take the name and keep it.', tally: 'ruthless', source: 'ch7_ruthless', vow: 'kept_name', gift: 'You pocket it. You do not read it. You keep it. Maren does not push, which tells you she knows exactly what\'s in there.' },
    ],
    note: 'D30: The Kept Name is the Ruthless reward — "The first debuff you apply each fight costs 1 less Resolve."',
  },
  {
    id: 'ch8_choice', chapter: 'ch8',
    prompt: 'The gate. Oren is down. Behind her is the stair to the Bellmouth and the drowned old city, and the Hush, which is the Hymn, which is a room full of people singing your name.',
    options: [
      { id: 'ch8_sendup', label: 'Send her up first.', tally: 'mercy', source: 'ch8_mercy', flags: ['oren_sent_up'], vow: 'oren_s_post', gift: 'She goes out. She will be waiting at the top of the stair in Chapter 9, and it changes that fight.' },
      { id: 'ch8_ring', label: 'Take the Gate ring.', tally: 'ruthless', source: 'ch8_ruthless', gift: 'Vigil\'s Ring. +3 GRD and Brace is free.' },
      { id: 'ch8_walk', label: 'Walk past her.', tally: 'devotion', source: 'ch8_devotion', vow: 'long_walk_down', gift: 'You don\'t take the ring, you don\'t send her up. You just go. Maren walks with you and does not say anything, which is the most Maren has ever said.' },
    ],
    note: 'D4: Oren\'s Post is the Mercy reward — "while Braced, you cannot be Stunned." Vigil\'s Ring stays the canonical Ruthless relic.',
  },
];

/**
 * The final choice (§3 Ch9 / §4) — bespoke node. Four options: three canon
 * paths + the hidden fourth thing, which renders ONLY when the T6.8 gate is
 * met (hook here; the gate evaluator is T6.8, and its own-lost-Echo input
 * needs the T7.4 own-Echo duel capability — cross-phase, called out in the
 * audit). Not a `choice`-kind node: the endings are not tallies, and the
 * scene kind caps at 3 options by design (§3's format). Its own checks run
 * at load, below.
 */
const FINAL_CHOICE = {
  kind: 'final_choice', id: 'ch9_final', chapter: 'ch9',
  prompt: 'The baton. Three options. The epilogue is then filtered by your dominant tally.',
  options: [
    { id: 'ch9_silence', label: 'Silence the Hymn.', ending: 'ending_a', gift: 'Stop the song. Every Echo in the Bellmouth lies down, including you.' },
    { id: 'ch9_baton', label: 'Take the baton.', ending: 'ending_c', gift: 'Ilvane is five years tired and you are not. You rule Verrow as a sovereign of the unquiet dead.' },
    { id: 'ch9_sing', label: 'Sit down and sing.', ending: 'ending_b', gift: 'You take a seat in the Choir and become the next voice in the Hymn, forever.' },
    { id: 'ch9_unmake', label: 'The fourth thing.', ending: 'ending_unmake', gate: 'unmake', hidden: true, gift: 'It appears only if the Hidden Ending condition is met (§4.4).' },
  ],
};

// ---------------------------------------------------------------------------
// Flag registry — typed, documented, cross-chapter. The director throws on
// any flag id not in this table (the registry is the whole surface).
// ---------------------------------------------------------------------------

const FLAGS = [
  { id: 'order_whole', type: 'world', chapter: 4, doc: 'The Order is whole and united because of you (Ysolde disarmed).', consumers: ['ch6 ally-state: the Order sends FOUR fielded Wardens, and they arrive as allies'] },
  { id: 'order_split', type: 'world', chapter: 4, doc: 'The Order splits — half of it will not help you (Ysolde answered).', consumers: ['ch6 ally-state: two of the four fielded Wardens arrive as allies'] },
  { id: 'order_fractured', type: 'world', chapter: 4, doc: 'A fractured Order (Ysolde finished; the marrow-furnace taken).', consumers: ['ch6 ally-state: none — the fractured Order sends nobody'] },
  { id: 'corvane_contract', type: 'world', chapter: 5, doc: 'You took Ledger House\'s contract.', consumers: ['ladder profile line (T7.x); Ledger\'s Price vow is the material carrier'] },
  { id: 'corvane_dead', type: 'world', chapter: 5, doc: 'You took his blade when he fell. Corvane dies.', consumers: ['he can never be the T7.4 ladder Echo'] },
  { id: 'corvane_spared', type: 'world', chapter: 5, doc: 'Corvane lives — a named Echo on your ladder, fighting for you.', consumers: ['T7.4: named-Echo ladder seat + Vigil Ledger ally'] },
  { id: 'gate_key', type: 'progression', chapter: 6, doc: 'Cassock\'s Gate key — the way forward out of the foundry (quench).', consumers: ['chapter progression check; NOT the Ch8 Leaden Key relic'] },
  { id: 'halbrey_hostile', type: 'world', chapter: 6, doc: 'Halbrey hates you (you quenched the pour).', consumers: ['scene framing only — no duel data changes (§9.2 rows are canon)'] },
  { id: 'furnace_fed', type: 'boon', chapter: 6, doc: 'You fed the furnace: +1 permanent starting Resolve, every fight, forever.', consumers: ['engine: build.startResolveBonus on every fight build the director assembles (vowMods); never stacks with the Twelve Tolls vow line — same source'] },
  { id: 'pour_turned', type: 'ally', chapter: 6, doc: 'The Turned Pour — the re-tuned bell fights on your side in Duel 21.', consumers: ['director: the [02] R7d ally body joins Duel 21'] },
  { id: 'oren_sent_up', type: 'ally', chapter: 8, doc: 'Oren went up first — she waits at the top of the stair in Chapter 9, and it changes that fight.', consumers: ['director: the finale runs the Oren-present variant (her published sheet as an ally body, the R7d pattern)'] },
  { id: 'floor_unlocked', type: 'unlock', chapter: 3, doc: 'The Choir Floor unlocks at Act I\'s end.', consumers: ['Phase 7 Floor UI (feature-flag: UI arrives T7.x; the state flag is set here)'] },
  { id: 'vendor_open', type: 'unlock', chapter: 5, doc: 'The Ledger House vendor opens in Act II (the Wick Market).', consumers: ['T6.12 vendor UI + the memory market (D13/D14)'] },
  { id: 'twin_ledger_earned', type: 'reward', chapter: 3, doc: 'Ch3-Devotion earned the Twin Ledger (D3): a second saved loadout, swappable free at shrines and pre-fight.', consumers: ['store/twin-ledger.js earnTwinLedger — the run state carries the earn; the store owns the slot mechanics'] },
];

// ---------------------------------------------------------------------------
// Endings (§4) — the path ids the final choice records. The epilogue reveal
// (tally reading, dominant-tally resolution, nine texts) is T6.6/T6.7; this
// module only carries the path table the final choice writes.
// ---------------------------------------------------------------------------

const ENDINGS = [
  { id: 'ending_a', label: 'Silence the Hymn', optionId: 'ch9_silence' },
  { id: 'ending_b', label: 'Join the Choir', optionId: 'ch9_sing' },
  { id: 'ending_c', label: 'Take the Baton', optionId: 'ch9_baton' },
  { id: 'ending_unmake', label: 'UNMAKE', optionId: 'ch9_unmake', hidden: true, gate: 'unmake' },
];

// ---------------------------------------------------------------------------
// Branch arithmetic — the Ch4 → Ch6 fight-list contract, as data.
// ---------------------------------------------------------------------------

/** Fielded Wardens who arrive as ALLIES in Chapter 6, per the Ch4 outcome. */
const CH6_ALLY_WARDENS = {
  ch4_disarm: 4,   // Mercy — the Order whole: "four instead of two, ally-state"
  ch4_answer: 2,   // Devotion — the Order splits: "half of it will not help you"
  ch4_finish: 0,   // Ruthless — a fractured Order sends nobody
};

/**
 * The crypt's hidden tenth shrine (§13, F24): "Ten shrines across the
 * campaign (nine chapter shrines and the crypt's hidden tenth)." It is where
 * a finished run walks back down to — the post-ending reshape point (§4.5's
 * re-bind rules read it; the Floor UI arrives in Phase 7).
 */
const HIDDEN_SHRINE = {
  id: 'crypt_hidden_shrine', chapter: 'crypt',
  heading: 'The crypt\'s hidden tenth',
  prose: [
    { text: 'Back down through the nave, past the shelf where the candle woke, behind the sexton\'s untouched wall: a bowl of wax older than the Hush, and room for one more name. The inscription is your own handwriting, and it says: WELCOME BACK.' },
  ],
};

// ---------------------------------------------------------------------------
// Load-time validation — a malformed story node is a REJECTION, not a crash
// waiting to happen. Same discipline as data/index.js.
// ---------------------------------------------------------------------------

function failLoad(kind, id, errors) {
  throw new Error(`story/model ${kind} "${id}" invalid:\n  - ${errors.join('\n  - ')}`);
}

function validateChoiceNode(c) {
  const r = validate('choice', { id: c.id, chapter: c.chapter, prompt: c.prompt, options: c.options }, {});
  if (!r.ok) failLoad('choice', c.id, r.errors);
  const chapter = CHAPTERS.find((h) => h.choiceId === c.id);
  if (!chapter) failLoad('choice', c.id, ['no chapter node references this choiceId']);
  if (c.options.length !== 3) failLoad('choice', c.id, [`§3 format holds exactly 3 options (got ${c.options.length})`]);
  for (const o of c.options) {
    if (o.source && !SOURCE_BY_ID.get(o.source)) failLoad('choice', c.id, [`source "${o.source}" does not resolve in data/sources.js`]);
    if (o.source && SOURCE_BY_ID.get(o.source).chapter !== Number(c.chapter.slice(2))) {
      failLoad('choice', c.id, [`source "${o.source}" is filed under chapter ${SOURCE_BY_ID.get(o.source).chapter}, not ${c.chapter}`]);
    }
  }
}

function init() {
  // Chapters — frozen schema kinds + cross-references into the live data.
  for (const h of CHAPTERS) {
    const r = validate('chapter', h, {});
    if (!r.ok) failLoad('chapter', h.id, r.errors);
    const canon = CHAPTER_FIGHTS[h.index - 1];
    if (JSON.stringify(h.duels) !== JSON.stringify(canon)) {
      failLoad('chapter', h.id, [`duels ${JSON.stringify(h.duels)} disagree with the roster walk ${JSON.stringify(canon)}`]);
    }
    for (const scene of [h.scene, h.shrine]) {
      const sr = validate('scene', scene, {});
      if (!sr.ok) failLoad('scene', scene.id, sr.errors);
    }
    if (h.actBoss && !h.duels.includes(h.actBoss)) failLoad('chapter', h.id, [`act boss "${h.actBoss}" is not one of the chapter's duels`]);
    if ((h.index === 3 || h.index === 6 || h.index === 9) !== (h.duels.length === 3)) {
      failLoad('chapter', h.id, ['§3.0: chapters 3, 6, 9 have three fights; the rest have two']);
    }
  }

  // Choices — schema kind + source-registry resolution + per-chapter wiring.
  const seenChapters = new Set();
  for (const c of CHOICES) {
    validateChoiceNode(c);
    if (seenChapters.has(c.chapter)) failLoad('choice', c.id, ['two choices for one chapter — §3.0 holds exactly one story choice per chapter']);
    seenChapters.add(c.chapter);
  }
  if (seenChapters.size !== 8) failLoad('choices', 'set', [`expected 8 story choices (ch1–ch8), got ${seenChapters.size}`]);

  // The final choice — bespoke checks (§4 structure, not the §3 format).
  if (FINAL_CHOICE.options.length !== 4) failLoad('final_choice', FINAL_CHOICE.id, ['the final node holds three canon paths + the hidden fourth']);
  const endings = new Set(ENDINGS.map((e) => e.id));
  for (const o of FINAL_CHOICE.options) {
    if (!endings.has(o.ending)) failLoad('final_choice', o.id, [`ending "${o.ending}" is not in the ending table`]);
    if (o.hidden && o.gate !== 'unmake') failLoad('final_choice', o.id, ['the hidden fourth thing gates on "unmake" (§4.4)']);
  }
  if (FINAL_CHOICE.options.filter((o) => o.hidden).length !== 1) failLoad('final_choice', FINAL_CHOICE.id, ['exactly one hidden option']);

  // Flags — unique, typed.
  const flagIds = new Set();
  for (const f of FLAGS) {
    if (flagIds.has(f.id)) failLoad('flag', f.id, ['duplicate flag id']);
    flagIds.add(f.id);
  }
  for (const c of [...CHOICES, FINAL_CHOICE]) {
    for (const o of c.options) {
      for (const fid of o.flags || []) {
        if (!flagIds.has(fid)) failLoad(c.id, o.id, [`flag "${fid}" is not in the registry`]);
      }
    }
  }

  // Chapter choice wiring, end to end.
  for (const h of CHAPTERS) {
    if (h.index < 9 && !CHOICES.find((c) => c.id === h.choiceId)) failLoad('chapter', h.id, [`choiceId "${h.choiceId}" does not resolve`]);
  }
  if (CHAPTERS[8].choiceId !== FINAL_CHOICE.id) failLoad('chapter', 'ch9', ['the final chapter must end at the final choice']);

  // F24 — ten shrines: nine chapter shrines + the crypt's hidden tenth.
  const shrineCheck = validate('scene', HIDDEN_SHRINE, {});
  if (!shrineCheck.ok) failLoad('scene', HIDDEN_SHRINE.id, shrineCheck.errors);
}

init();

const CHAPTER_BY_ID = new Map(CHAPTERS.map((h) => [h.id, h]));
const CHOICE_BY_ID = new Map(CHOICES.map((c) => [c.id, c]));
const FLAG_BY_ID = new Map(FLAGS.map((f) => [f.id, f]));
const ENDING_BY_OPTION = new Map(FINAL_CHOICE.options.map((o) => [o.id, o.ending]));

function chapterAt(index) {
  const h = CHAPTERS[index - 1];
  if (!h) throw new Error(`no chapter ${index} (the campaign holds nine)`);
  return h;
}
function choiceFor(chapterIndex) {
  const h = CHAPTERS[chapterIndex - 1];
  if (!h) throw new Error(`no chapter ${chapterIndex} (the campaign holds nine)`);
  return h.index === 9 ? FINAL_CHOICE : CHOICE_BY_ID.get(h.choiceId);
}
/** The Ch6 ally-state derived from the Ch4 outcome option id (§3 contract). */
function ch6AlliesFor(ch4OptionId) {
  const n = CH6_ALLY_WARDENS[ch4OptionId];
  if (n === undefined) throw new Error(`no Ch6 ally-state for Ch4 option "${ch4OptionId}"`);
  return n;
}




module.exports = { TALLIES, CHAPTERS, CHOICES, FINAL_CHOICE, FLAGS, ENDINGS, CH6_ALLY_WARDENS, HIDDEN_SHRINE, CHAPTER_BY_ID, CHOICE_BY_ID, FLAG_BY_ID, ENDING_BY_OPTION, chapterAt, choiceFor, ch6AlliesFor };
