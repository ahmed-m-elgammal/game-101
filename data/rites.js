/**
 * rites.js (data) — Rites of Passage data objects. [GDD] §5.7.
 * Shape (canon): { trigger: {atHP} | {onTurn}, change: {damageType,
 * statMults, versePool, flags, special}, line }.
 *
 * FIXTURE rites for the Phase-1 viewer and the harness. Real boss data lands
 * in Phase 4 (T4.x); the engine (engine/rites.js) consumes this shape
 * unchanged. "First Vespers" is the canon §9.1 Act-boss row.
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
};


module.exports = { RITES };
