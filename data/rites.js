/**
 * rites.js (data) — Rites of Passage data objects. [GDD] §5.7.
 * Shape (canon): { trigger: {atHP} | {onTurn}, change: {damageType,
 * statMults, versePool, flags, special}, line }.
 *
 * T4.6/T4.7: the registry now carries the REAL boss rites beside the Phase-1
 * fixture rows (halbrey_demo / ilvane_phase3 stay — they are pinned by the
 * Phase-1/2 test suites and used as teaching fixtures; they are not canon
 * rows and say so in their names). Real rows:
 *   first_vespers          — §9.1 #7 (canon; was the T1.8 fixture, now the row)
 *   pells_ledgers_ward     — §9.1 #6 per N4 (30 Ward + verse-theft at 50%)
 *   halbrey_passage        — §9.2 #13 (66% / 33%: Steel → Shade → Ember)
 *   mother_bell_temperature— §9.2 #14 (molten ↔ cooled + the D10 levers)
 *   ilvane_three_phases    — §9.3 #21 (heal 20% A4/D31, summons, Phase III copy)
 *   + four Floor Rite-user rites (T4.7/T4.8 authored Echoes, §9.4)
 *
 * Engine contract: engine/rites.js evaluates triggers; flag HANDLERS live in
 * engine/fight.js (grantWard / stealLastCast / summonGuard / versePool /
 * moltenThorns). `startFlags` are applied when the runtime is built.
 */

const RITES = {
  /** §9.1 #7 — Act I boss, canon row: Rite at 50% HP. */
  first_vespers: {
    id: 'first_vespers',
    name: 'The Toll',
    triggers: [
      {
        trigger: { atHP: 0.5 },
        change: {
          statMults: {},
          flags: { resolveBonusPerTurn: 1, damageBonusPct: 0.3, castEveryTurn: 'tolling_bell' },
        },
        line: 'First Vespers stops defending. The bell in his throat begins to swing.',
      },
    ],
  },

  /** §9.1 #6 — Pell's Ledger's Ward (N4 provisional wording, approved). */
  pells_ledgers_ward: {
    id: 'pells_ledgers_ward',
    name: 'Ledger\u2019s Ward',
    triggers: [
      {
        trigger: { atHP: 0.5 },
        change: {
          statMults: {},
          flags: { grantWard: 30, stealLastCast: true },
        },
        line: 'Pell buys the memory of your last verse. His ledger pays in Ward.',
      },
    ],
  },

  /** T1.8 spec — multi-trigger sequence (Halbrey pattern: 66% and 33%). FIXTURE. */
  halbrey_demo: {
    id: 'halbrey_demo',
    name: 'The Founder Rite (fixture)',
    triggers: [
      {
        trigger: { atHP: 0.66 },
        change: { damageType: 'ember', statMults: { mig: 1.2, wit: 1.2 } },
        line: 'Halbrey opens the furnace door. The hymn changes key.',
      },
      {
        trigger: { atHP: 0.33 },
        change: { statMults: { mig: 1.4, wit: 1.4, grd: 0.8 } },
        line: 'The last verse of the founder is written in his own ash.',
      },
    ],
  },

  /** §9.2 #13 — the real Halbrey row: Steel → Shade → Ember (66% / 33%).
   *  Stat shifts authored (canon names the shifts, not the numbers). */
  halbrey_passage: {
    id: 'halbrey_passage',
    name: 'Rite of Passage',
    triggers: [
      {
        trigger: { atHP: 0.66 },
        change: {
          damageType: 'shade',
          statMults: { mig: 0.9, wit: 1.6 },
        },
        line: 'Halbrey opens the founder\u2019s book. The hymn changes key — the blade now sings in shade.',
      },
      {
        trigger: { atHP: 0.33 },
        change: {
          damageType: 'ember',
          statMults: { mig: 1.1, wit: 1.2, hst: 1.15 },
        },
        line: 'The last verse of the founder is written in his own ash. It burns.',
      },
    ],
  },

  /** §9.2 #14 — Mother Bell's temperature. Molten is the start state
   *  (startFlags); the 50% crossing cools her. D10 levers live here:
   *  reflectDouble (Warden path — reflect income ×2 while molten) and the
   *  Cantor sour window (engine-side: Curse+Fray held simultaneously). */
  mother_bell_temperature: {
    id: 'mother_bell_temperature',
    name: 'Temperature',
    startFlags: {
      molten: true,
      damageTakenMult: 0.5,
      reflectDouble: true,
      moltenThorns: 8,
      versePool: ['crypt_door', 'bulwark_strike', 'sepulchral_spikes', 'stone_vigil'],
    },
    triggers: [
      {
        trigger: { atHP: 0.5 },
        change: {
          statMults: {},
          flags: {
            molten: false,
            cooled: true,
            damageTakenMult: 1.3,
            reflectDouble: false,
            versePool: ['dirge', 'wither_note', 'lullaby', 'tolling_bell'],
          },
        },
        line: 'Mother Bell cools. The metal pings and settles — the hymn turns to shade and curse.',
      },
    ],
  },

  /** T1.8 spec — Ilvane Phase III "learns the verse you have cast most often". FIXTURE. */
  ilvane_phase3: {
    id: 'ilvane_phase3',
    name: 'The Learning (fixture)',
    triggers: [
      {
        trigger: { onTurn: 5 }, // fixture: the copy lands mid-fight (T1.8)
        change: { special: 'learn_most_cast' },
        line: 'He is learning X.', // X substituted at runtime with the verse name
      },
    ],
  },

  /** §9.3 #21 — the real Ilvane row: three phases. I the duellist (base),
   *  II the Hymn (heal 20% of damage dealt, A4/D31; summons at 50%/25%),
   *  III the Baton (learns your most-cast slotted verse at 100% — F21/D31). */
  ilvane_three_phases: {
    id: 'ilvane_three_phases',
    name: 'The Three Phases',
    triggers: [
      {
        trigger: { atHP: 0.66 },
        change: { statMults: {}, flags: { phase: 2, healPctOfDealt: 0.2 } },
        line: 'The Hymn begins. What he sings, he keeps — Ilvane heals for a fifth of what he deals.',
      },
      {
        trigger: { atHP: 0.5 },
        change: { statMults: {}, flags: { summonGuard: 'chorister_body' } },
        line: 'He raises a chorister from the ash floor.',
      },
      {
        trigger: { atHP: 0.33 },
        change: { statMults: {}, special: 'learn_most_cast', flags: { phase: 3 } },
        line: 'The Baton turns in his hand. He is learning your best verse.',
      },
      {
        trigger: { atHP: 0.25 },
        change: { statMults: {}, flags: { summonGuard: 'chorister_body' } },
        line: 'The last chorister stands up out of the floor.',
      },
    ],
  },

  // ------------------------------------------------ Floor Rite-users (T4.7)
  // Authored Echoes per [GDD] §9.4 ("at release, 4 Rite-users — named Echoes
  // that use the Rite of Passage mechanic so the player meets it on the
  // ladder too"). Names/lines are the prose pass; mechanics reuse the rite
  // vocabulary only. Rows live with their builds in data/named-echoes.js.

  /** Preceptor Nill — Gravewarden L9. At 66% she commits to the wall. */
  nill_second_wall: {
    id: 'nill_second_wall',
    name: 'The Second Wall',
    triggers: [
      {
        trigger: { atHP: 0.66 },
        change: { statMults: { grd: 1.25, vig: 1.15 } },
        line: 'Nill plants the second wall. From here on she does not move.',
      },
    ],
  },

  /** Chorister Vey — Hollow Cantor L8. Sings only the lock until half;
   *  then borrows your voice (the learn mechanic at her own stats). */
  vey_borrowed_voice: {
    id: 'vey_borrowed_voice',
    name: 'The Borrowed Voice',
    startFlags: { versePool: ['dirge', 'lullaby', 'dissonance'] },
    triggers: [
      {
        trigger: { atHP: 0.5 },
        change: {
          statMults: {},
          special: 'learn_most_cast',
          versePool: ['dirge', 'lullaby', 'dissonance', 'tolling_bell'],
        },
        line: 'Vey opens her mouth and your own hymn falls out of it.',
      },
    ],
  },

  /** The Ash Deacon — Cinder Witch L9. The wake: hotter, and +20% damage. */
  deacon_kindle_wake: {
    id: 'deacon_kindle_wake',
    name: 'Kindle the Wake',
    triggers: [
      {
        trigger: { atHP: 0.33 },
        change: { statMults: { wit: 1.3 }, flags: { damageBonusPct: 0.2 } },
        line: 'The Deacon kindles his own wake. The floor burns with him.',
      },
    ],
  },

  /** Sexton Grave, the Last Bell — Gravewarden L8. On turn 5 he tolls. */
  grave_toll_with_me: {
    id: 'grave_toll_with_me',
    name: 'Toll With Me',
    triggers: [
      {
        trigger: { onTurn: 5 },
        change: { statMults: { mig: 1.3, grd: 1.2 } },
        line: 'The Last Bell swings. Grave stops waiting and starts tolling.',
      },
    ],
  },
};




module.exports = { RITES };
