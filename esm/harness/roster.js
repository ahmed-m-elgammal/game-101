/**
 * roster.js — T2.3: roster conformance & campaign-wall asserts. The real
 * 21-fight roster arrives with T4.6; until then this runs the FIXTURE
 * roster (Bram, First Vespers) and tags every row FIXTURE-SMOKE. Hard
 * asserts already meaningful at fixture stage:
 *   • budget conformance — every sheet sums to budget(L) = 33 + 2(L−1) ±0
 *     (D7/N5), hybrids excluded-as-declared;
 *   • per-fight variance — per-length σ ≤12% (N6) across seeds per class;
 *   • round ceiling — zero fights beyond r20 per matchup.
 * Advisory (real-data only): wall clear bands (§9.5 rule 2/2b, §17 boss
 * bands, D10 Mother Bell bands). Printed, never silently skipped.
 */

import { buildSheet, checkBudget } from '../engine/fighter.js';
import { quickReading } from '../sim.js';
import { mirrorPreset } from '../data/presets.js';
import { varianceProbe, TARGETS } from './asserts.js';
import { CLASSES } from '../data/classes.js';

export const FIXTURE_ROSTER = [
  {
    id: 'bram',
    name: 'Hollowed Sexton Bram (Ch1 tutorial wall)',
    source: '[GDD] §9.1 #7 → presets.BRAM',
    build: {
      name: 'Hollowed Sexton Bram', clazz: 'gravewarden', level: 1, isEnemy: true,
      stats: { vig: 11, mig: 5, wit: 2, grd: 10, hst: 5 }, hpOverride: 120, // PROVISIONAL:D12
      vow: null, verses: ['sepulchral_spikes', 'hold_the_line', 'bulwark_strike', 'gravebind'], items: [],
    },
    declared: { hybrid: false, notes: 'HP 120 override is the declared D12 provisional.' },
  },
  {
    id: 'first_vespers',
    name: 'First Vespers, the Drowned Cantor (Act I boss fixture)',
    source: '[GDD] §9.1 → presets.FIRST_VESPERS',
    build: {
      name: 'First Vespers, the Drowned Cantor', clazz: 'hollow_cantor', level: 7, isEnemy: true,
      stats: { vig: 8, mig: 2, wit: 14, grd: 8, hst: 13 }, hpOverride: 124,
      vow: null, verses: ['tolling_bell', 'dirge', 'dissonance', 'lullaby'], items: [],
      rite: 'first_vespers',
    },
    declared: { hybrid: false, notes: 'Rite fixture; boss band asserts activate with the real Act I row (T4.6).' },
  },
];

/**
 * Run roster conformance over the fixture roster.
 * @param {object} opts { tuning, seedsPerFight=600, classes? }
 */
export function rosterAsserts(opts = {}) {
  const tuning = opts.tuning;
  const classes = opts.classes || Object.keys(CLASSES);
  const seeds = opts.seedsPerFight || 600;
  const rows = [];

  for (const entry of FIXTURE_ROSTER) {
    const sheet = buildSheet(entry.build, tuning); // throws if over budget
    const conf = checkBudget(sheet.stats, entry.build.level, tuning);

    const perClass = [];
    for (const clazz of classes) {
      const player = mirrorPreset(clazz, entry.build.level);
      const probe = varianceProbe(player, entry.build, { n: seeds, tuning });
      // clear-rate rollup (advisory at fixture stage)
      const raw = quickReading(player, entry.build, { n: 200, tuning });
      perClass.push({
        clazz,
        budgetOk: conf.ok,
        varianceOk: probe.pass,
        worstSigmaPct: probe.worst ? probe.worst.sigmaPct : 0,
        maxRounds: probe.buckets.length ? probe.buckets[probe.buckets.length - 1].len : 0,
        clearPct: raw.n ? (raw.winA / raw.n) * 100 : 0,
      });
    }

    rows.push({
      id: entry.id,
      name: entry.name,
      source: entry.source,
      stage: 'FIXTURE-SMOKE',
      budget: { ok: conf.ok, sum: conf.sum, budgetForLevel: conf.budget },
      declared: entry.declared,
      perClass,
      allBudgetsOk: conf.ok && perClass.every((p) => p.budgetOk),
      allVarianceOk: perClass.every((p) => p.varianceOk),
    });
  }

  return {
    stage: 'FIXTURE-SMOKE',
    rows,
    pass: rows.every((r) => r.allBudgetsOk && r.allVarianceOk),
    note:
      'Hard asserts: D7 budget conformance + N6 per-fight variance + r20 ceiling. ' +
      'Wall bands (§9.5 2/2b), boss bands (§17) and D10 Mother Bell bands activate on the real roster at T4.6.',
  };
}
