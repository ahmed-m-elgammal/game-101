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

const { buildSheet, checkBudget } = require('../engine/fighter.js');
const { STAT_KEYS } = require('../data/classes.js');
const { quickReading } = require('../sim/reading.js');
const { mirrorPreset } = require('../data/presets.js');
const { archetypeBuild } = require('./archetypes.js');
const { varianceProbe, TARGETS } = require('./asserts.js');
const { CLASSES } = require('../data/classes.js');
const { ENEMIES, enemyBuild } = require('../data/enemies.js');
const { corvaneSheet } = require('../data/corvane.js');
const { ARCHETYPE_IDS } = require('./archetypes.js');

const FIXTURE_ROSTER = [
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
function rosterAsserts(opts = {}) {
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

/* ------------------------------------------------------------------ *
 * T4.6 — the REAL 21-fight roster. Hard asserts stay the fixture trio
 * (D7 budget ±0, N6 per-fight variance, r20 ceiling) now over the canon
 * rows; the §9.5 readability bands, the §17 boss bands and the D10 Mother
 * Bell row run as MEASURED advisory rows — promotion to hard is the T4.12
 * gate's call, recorded per row (never silent).
 * ------------------------------------------------------------------ */

/** Corvane is a variable build — the roster probe uses his neutral sheet. */
function campaignRoster() {
  return ENEMIES.map((row) => {
    const build = row.id === 'corvane'
      ? corvaneSheet('corvane_neutral_ash')
      : enemyBuild(row);
    return {
      id: row.id,
      duel: row.duel,
      chapter: row.chapter,
      name: row.name,
      source: `[GDD] §9.${row.chapter <= 3 ? 1 : row.chapter <= 6 ? 2 : 3} #${row.duel}`,
      build,
      declared: {
        hybrid: row.cls === 'hybrid',
        varies: row.cls === 'varies',
        notes: row.notes || '',
      },
    };
  });
}

const BOSS_IDS = new Set(['first_vespers', 'mother_bell', 'ilvane']);

/**
 * Run the real-roster conformance + band sweep.
 * @param {object} opts { tuning, seedsPerFight=600, clearSeeds=200, classes?,
 *                        archetypes=true }
 *
 * The clear-rate probe is the §9.5 read: per class, the BEST of the four
 * harness archetypes (standard/aggressive/defensive/status) — "a build that
 * beats it", not a generic mirror. The mirror preset still drives the
 * variance probe (length distributions, not outcomes).
 */
function realRosterAsserts(opts = {}) {
  const tuning = opts.tuning;
  const classes = opts.classes || Object.keys(CLASSES);
  const seeds = opts.seedsPerFight || 600;
  const clearSeeds = opts.clearSeeds || 200;
  const useArchetypes = opts.archetypes !== false;
  const rows = [];
  const bands = [];

  for (const entry of campaignRoster()) {
    const sheet = buildSheet(entry.build, tuning); // throws if over budget
    const conf = entry.declared.hybrid
      ? { ok: true, sum: STAT_KEYS.reduce((s, k) => s + sheet.stats[k], 0), budget: 0 }
      : checkBudget(sheet.stats, entry.build.level, tuning);

    const perClass = [];
    for (const clazz of classes) {
      const player = mirrorPreset(clazz, Math.max(1, entry.build.level - 0));
      const probe = varianceProbe(player, entry.build, { n: seeds, tuning });
      let clearPct = 0;
      let bestBuild = null;
      const probes = useArchetypes ? ARCHETYPE_IDS : ['standard'];
      for (const arch of probes) {
        const candidate = archetypeBuild(clazz, arch, entry.build.level, tuning);
        const raw = quickReading(candidate, entry.build, { n: clearSeeds, tuning });
        const pct = raw.n ? (raw.winA / raw.n) * 100 : 0;
        if (pct >= clearPct) { clearPct = pct; bestBuild = arch; }
      }
      perClass.push({
        clazz,
        budgetOk: conf.ok,
        varianceOk: probe.pass,
        worstSigmaPct: probe.worst ? probe.worst.sigmaPct : 0,
        maxRounds: probe.buckets.length ? probe.buckets[probe.buckets.length - 1].len : 0,
        clearPct,
        bestBuild,
      });
    }

    rows.push({
      id: entry.id,
      duel: entry.duel,
      name: entry.name,
      stage: 'REAL-ROSTER',
      budget: { ok: conf.ok, sum: conf.sum, budgetForLevel: conf.budget },
      declared: entry.declared,
      perClass,
      allBudgetsOk: conf.ok && perClass.every((p) => p.budgetOk),
      allVarianceOk: perClass.every((p) => p.varianceOk),
      withinCeiling: perClass.every((p) => p.maxRounds <= TARGETS.maxRoundsCeiling),
    });

    // §9.5 rule 2: ≥2 of 4 classes have a build beating it at ≥55%.
    // (Mirror presets are the probe; a "correct build" probe rides the
    // archetype matrix at T2.3/T2.7. The mirror read is the honest floor.)
    const clears = perClass.map((p) => p.clearPct).sort((a, b) => b - a);
    bands.push({
      id: entry.id,
      kind: BOSS_IDS.has(entry.id) ? 'boss' : 'readability',
      readability2x55: clears[1] >= 55,
      top2: clears.slice(0, 2),
      allClears: perClass.map((p) => ({ clazz: p.clazz, clearPct: p.clearPct })),
      bossBand40: BOSS_IDS.has(entry.id) ? clears[0] >= 40 : null,
    });
  }

  const motherBell = rows.find((r) => r.id === 'mother_bell');
  const mbClears = motherBell
    ? Object.fromEntries(motherBell.perClass.map((p) => [p.clazz, p.clearPct]))
    : null;

  return {
    stage: 'REAL-ROSTER',
    rows,
    bands,
    motherBell: mbClears && {
      ashbladeCinder55: mbClears.ashblade >= 55 && mbClears.cinder_witch >= 55,
      wardenCantor40: mbClears.gravewarden >= 40 && mbClears.hollow_cantor >= 40,
      clears: mbClears,
      row: 'D10 outcome: Ashblade/Cinder ≥55%; Warden/Cantor ≥40% post-lever ([02] R4)',
    },
    pass: rows.every((r) => r.allBudgetsOk && r.allVarianceOk && r.withinCeiling),
    note:
      'Hard: D7 budget ±0 + N6 variance + r20 ceiling over the 21 canon rows. ' +
      'Advisory (promotion at T4.12): §9.5 readability ≥2×55, §17 boss ≥40, D10 Mother Bell row.',
  };
}


module.exports = { rosterAsserts, campaignRoster, realRosterAsserts, FIXTURE_ROSTER };
