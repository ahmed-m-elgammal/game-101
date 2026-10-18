// stress-harness.test.js — Phase-2 re-test wave: adversarial coverage for
// the balance harness (harness/archetypes, matrix, asserts, roster), the
// mini-Reading (sim) and the cached Reading (sim/readingCache): archetype
// legality sweeps, matrix determinism/aggregation, assert verdict boundaries
// with synthetic matrices, anti-lock probes, LRU cache behavior, key
// stability, counter lines, and roster fixture smoke.
'use strict';

const { test } = require('node:test');
const assert = require('node:assert');

const {
  archetypeBuild, standardBuild, ARCHETYPE_IDS, STATUS_FAMILY, STRIKE_ID,
} = require('../harness/archetypes.js');
const {
  runMatrix, classRollup, mirrorRollup, lengthRollup, statusWinContribution,
  MATRIX_LEVELS,
} = require('../harness/matrix.js');
const {
  coreAsserts, statusAsserts, varianceProbe, varianceAssert, antiLockAsserts,
  degenerateBuilds, fullBalanceGate, TARGETS, KNOWN_GAPS,
} = require('../harness/asserts.js');
const { rosterAsserts, FIXTURE_ROSTER } = require('../harness/roster.js');
const { quickReading, fortuneTrack } = require('../sim/reading.js');
const {
  runReading, readingKey, cacheStats, clearReadingCache, counterFor,
  READING_OVERRIDES,
} = require('../sim/readingCache.js');
const { validateAlloc } = require('../engine/fighter.js');
const { createTuning } = require('../tuning.js');
const { CANON } = require('../data/config.js');
const { CLASSES, CLASS_IDS } = require('../data/classes.js');
const { poolFor } = require('../data/verses.js');

const T = createTuning();

// synthetic matrix builder for assert-verdict boundary tests
function syntheticMatrix(rows) {
  return { matchups: rows };
}
const mrow = (over = {}) => ({
  aClass: 'ashblade', bClass: 'cinder_witch', aArch: 'standard', bArch: 'standard',
  level: 5, n: 100, winA: 50, winB: 50, draws: 0, lastBell: 0,
  roundsSum: 900, maxRounds: 18, roundHistogram: {},
  avgRounds: 9, winAPct: 50, winBPct: 50, lastBellPct: 0,
  ...over,
});

// ------------------------------------------------------------- archetypes
for (const cls of CLASS_IDS) {
  for (const arch of ARCHETYPE_IDS) {
    for (const level of [1, 3, 5, 7, 9, 10]) {
      test(`archetype ${cls}/${arch} L${level}: canon-legal build, 4 slottable verses`, () => {
        const b = archetypeBuild(cls, arch, level, T);
        const alloc = validateAlloc(b, T);
        assert.strictEqual(alloc.ok, true, `${cls}/${arch} L${level}: ${alloc.errors.join('; ')}`);
        assert.strictEqual(b.verses.length, 4);
        const pool = poolFor(cls, level).map((v) => v.id);
        for (const v of b.verses) assert.ok(pool.includes(v), `verse ${v} unlocked by L${level}`);
        assert.ok(CLASSES[cls].vows.some((x) => x.id === b.vow), `vow ${b.vow} belongs to ${cls}`);
      });
    }
  }
}
test('archetype: deterministic output for the same inputs', () => {
  assert.deepStrictEqual(archetypeBuild('ashblade', 'standard', 5, T), archetypeBuild('ashblade', 'standard', 5, T));
  assert.deepStrictEqual(archetypeBuild('hollow_cantor', 'status', 9, T), archetypeBuild('hollow_cantor', 'status', 9, T));
});
test('archetype: unknown class/archetype throw loudly', () => {
  assert.throws(() => archetypeBuild('bard', 'standard', 5, T), /unknown archetype/);
  assert.throws(() => archetypeBuild('ashblade', 'speedrun', 5, T), /unknown archetype/);
});
test('archetype: creation sums to exactly 4 for every table row', () => {
  for (const cls of CLASS_IDS) {
    for (const arch of ARCHETYPE_IDS) {
      const b = archetypeBuild(cls, arch, 1, T);
      const sum = ['vig', 'mig', 'wit', 'grd', 'hst'].reduce((a, k) => a + b.creation[k], 0);
      assert.strictEqual(sum, 4, `${cls}/${arch}`);
    }
  }
});
test('archetype: cap-10 allocator never strands points (L10 needs 18, capacity ≥ 19)', () => {
  for (const cls of CLASS_IDS) {
    for (const arch of ARCHETYPE_IDS) {
      const b = archetypeBuild(cls, arch, 10, T);
      const spent = ['vig', 'mig', 'wit', 'grd', 'hst'].reduce((a, k) => a + b.levelUps[k], 0);
      assert.strictEqual(spent, 18, `${cls}/${arch} spent ${spent}`);
    }
  }
});
test('archetype: cinder witch WIT base 9 + creation never breaches cap', () => {
  for (const arch of ARCHETYPE_IDS) {
    const b = archetypeBuild('cinder_witch', arch, 5, T);
    assert.ok(9 + b.creation.wit <= 10, `arch ${arch} wit ${9 + b.creation.wit}`);
  }
});
test('archetype: standardBuild delegates to the standard archetype', () => {
  assert.deepStrictEqual(standardBuild('ashblade', 5, T), archetypeBuild('ashblade', 'standard', 5, T));
});
test('archetype: STATUS_FAMILY maps each class to its signature status', () => {
  assert.deepEqual(STATUS_FAMILY, {
    ashblade: 'bleed', cinder_witch: 'burn', gravewarden: 'stun', hollow_cantor: 'hush',
  });
});
test('archetype: STRIKE_ID export is the canonical strike id', () => {
  assert.strictEqual(STRIKE_ID, 'strike');
});
test('archetype: L1 aggressive builds backfill commons (unlock legality)', () => {
  const b = archetypeBuild('ashblade', 'aggressive', 1, T);
  const pool = poolFor('ashblade', 1).map((v) => v.id);
  for (const v of b.verses) assert.ok(pool.includes(v), `${v} legal at L1`);
});

// ----------------------------------------------------------------- matrix
test('matrix: small run — matchup count, per-matchup sums, n bounds', () => {
  const m = runMatrix({ classes: ['ashblade', 'cinder_witch'], levels: [1], mode: 'classes', n: 5, tuning: T });
  assert.strictEqual(m.matchups.length, 4, '2 classes × 2 sides');
  for (const row of m.matchups) {
    assert.strictEqual(row.n, 5);
    assert.strictEqual(row.winA + row.winB + row.draws, 5);
    assert.ok(row.avgRounds >= 1 && row.avgRounds <= 20);
    assert.ok(row.winAPct + row.winBPct === 100);
  }
  assert.strictEqual(m.totals.n, 20);
});
test('matrix: deterministic — two identical runs agree byte-for-byte', () => {
  const a = runMatrix({ classes: ['ashblade'], levels: [1], n: 8, tuning: T });
  const b = runMatrix({ classes: ['ashblade'], levels: [1], n: 8, tuning: T });
  assert.deepStrictEqual(a, b);
});
test('matrix: levels are sorted ascending regardless of input order', () => {
  const m = runMatrix({ classes: ['ashblade'], levels: [9, 1, 5], n: 1, tuning: T });
  assert.deepEqual(m.levels, [1, 5, 9]);
});
test('matrix: empty levels array falls back to the default six', () => {
  const m = runMatrix({ classes: ['ashblade'], levels: [], n: 1, tuning: T });
  assert.deepEqual(m.levels, MATRIX_LEVELS);
});
test('matrix: n coercion — 0 falls to the 200 default (falsy), negatives clamp to 1', () => {
  const m0 = runMatrix({ classes: ['ashblade'], levels: [1], n: 0, tuning: T });
  assert.strictEqual(m0.nPerMatchup, 200, 'n=0 is falsy → documented default 200');
  const mN = runMatrix({ classes: ['ashblade'], levels: [1], n: -7, tuning: T });
  assert.strictEqual(mN.nPerMatchup, 1);
  const m1 = runMatrix({ classes: ['ashblade'], levels: [1], n: 1, tuning: T });
  assert.strictEqual(m1.nPerMatchup, 1);
});
test('matrix: archetypes mode expands to arch × arch rows', () => {
  const m = runMatrix({
    classes: ['ashblade'], levels: [5], mode: 'archetypes',
    archetypes: ['aggressive', 'defensive'], n: 2, tuning: T,
  });
  assert.strictEqual(m.matchups.length, 4, '2×2 arch pairs');
  assert.ok(m.matchups.every((r) => ['aggressive', 'defensive'].includes(r.aArch)));
});
test('matrix: onMatchup callback fires once per matchup in order', () => {
  const seen = [];
  runMatrix({
    classes: ['ashblade', 'gravewarden'], levels: [1], mode: 'classes', n: 2, tuning: T,
    onMatchup: (row, i) => seen.push([i, row.aClass, row.bClass]),
  });
  assert.deepStrictEqual(seen.map((s) => s[0]), [1, 2, 3, 4]);
});
test('matrix: round histogram folds into totals and length rollup', () => {
  const m = runMatrix({ classes: ['ashblade', 'cinder_witch'], levels: [1, 5], mode: 'classes', n: 10, tuning: T });
  const histSum = Object.values(m.totals.roundHistogram).reduce((a, b) => a + b, 0);
  assert.strictEqual(histSum, m.totals.n);
  const len = lengthRollup(m);
  assert.strictEqual(len.n, m.totals.n);
  assert.strictEqual(len.histogram.reduce((a, b) => a + b, 0), len.n);
});
test('matrix: lastBell counts agree between totals and rollup', () => {
  const m = runMatrix({ classes: ['ashblade', 'cinder_witch'], levels: [1], mode: 'classes', n: 10, tuning: T });
  assert.strictEqual(lengthRollup(m).lastBell, m.totals.lastBell);
});
test('matrix: statusWinContribution passes through every matchup', () => {
  const m = runMatrix({ classes: ['ashblade'], levels: [1], mode: 'classes', n: 2, tuning: T });
  assert.strictEqual(statusWinContribution(m).length, m.matchups.length);
});

// ---------------------------------------------------------------- rollups
test('classRollup: mirrors excluded; games double-count both sides of non-mirrors', () => {
  const m = syntheticMatrix([
    mrow({ aClass: 'ashblade', bClass: 'ashblade', aArch: 'standard', bArch: 'standard', n: 10, winA: 5, winB: 5 }),
    mrow({ aClass: 'ashblade', bClass: 'cinder_witch', n: 10, winA: 6, winB: 4 }),
  ]);
  const rollup = classRollup(m);
  const ash = rollup.find((r) => r.id === 'ashblade');
  assert.strictEqual(ash.games, 10, 'mirror row excluded');
  assert.strictEqual(ash.winPct, 60);
  const cinder = rollup.find((r) => r.id === 'cinder_witch');
  assert.strictEqual(cinder.games, 10);
  assert.strictEqual(cinder.winPct, 40);
});
test('classRollup: same class different archetype is NOT a mirror', () => {
  const m = syntheticMatrix([
    mrow({ aClass: 'ashblade', bClass: 'ashblade', aArch: 'standard', bArch: 'aggressive', n: 10, winA: 7, winB: 3 }),
  ]);
  const ash = classRollup(m).find((r) => r.id === 'ashblade');
  assert.strictEqual(ash.games, 20, 'counted for both sides');
  assert.ok(Math.abs(ash.winPct - 50) < 1e-9);
});
test('mirrorRollup: only true mirrors count; side-A win rate exposed', () => {
  const m = syntheticMatrix([
    mrow({ aClass: 'ashblade', bClass: 'ashblade', aArch: 'standard', bArch: 'standard', n: 100, winA: 52, winB: 48 }),
    mrow({ aClass: 'ashblade', bClass: 'cinder_witch', n: 100, winA: 90, winB: 10 }),
  ]);
  const mir = mirrorRollup(m);
  assert.strictEqual(mir.games, 100);
  assert.strictEqual(mir.winAPct, 52);
});
test('lengthRollup: empty matrix yields zeroed aggregate without NaN', () => {
  const len = lengthRollup(syntheticMatrix([]));
  assert.strictEqual(len.n, 0);
  assert.strictEqual(len.avgRounds, 0);
  assert.deepEqual(len.histogram, []);
});
test('lengthRollup: histogram length covers maxRounds (no gaps misindex)', () => {
  const m = syntheticMatrix([
    mrow({ n: 10, roundsSum: 100, maxRounds: 12, roundHistogram: { 8: 5, 12: 5 } }),
    mrow({ n: 10, roundsSum: 150, maxRounds: 15, roundHistogram: { 10: 5, 15: 5 } }),
  ]);
  const len = lengthRollup(m);
  assert.strictEqual(len.maxRounds, 15);
  assert.strictEqual(len.histogram.length, 15);
  assert.strictEqual(len.histogram[7], 5);
  assert.strictEqual(len.histogram[14], 5);
});

// ------------------------------------------------- core assert boundaries
test('core asserts: class-dominance boundary at 58% (57.9 pass / 58.1 advisory-fail)', () => {
  const pass = coreAsserts(syntheticMatrix([
    mrow({ aClass: 'ashblade', bClass: 'cinder_witch', n: 1000, winA: 579, winB: 421 }),
    mrow({ aClass: 'hollow_cantor', bClass: 'gravewarden', n: 1000, winA: 500, winB: 500 }),
  ]));
  assert.strictEqual(pass[0].pass, true, pass[0].value);
  const fail = coreAsserts(syntheticMatrix([
    mrow({ aClass: 'ashblade', bClass: 'cinder_witch', n: 1000, winA: 581, winB: 419 }),
    mrow({ aClass: 'hollow_cantor', bClass: 'gravewarden', n: 1000, winA: 500, winB: 500 }),
  ]));
  assert.strictEqual(fail[0].pass, false);
  assert.strictEqual(fail[0].advisory, true, 'N7 rows run advisory');
});
test('core asserts: mirror band edges 47/53 inclusive', () => {
  const at47 = coreAsserts(syntheticMatrix([mrow({ aClass: 'x', bClass: 'x', n: 1000, winA: 470, winB: 530 })]));
  const at53 = coreAsserts(syntheticMatrix([mrow({ aClass: 'x', bClass: 'x', n: 1000, winA: 530, winB: 470 })]));
  const at54 = coreAsserts(syntheticMatrix([mrow({ aClass: 'x', bClass: 'x', n: 1000, winA: 540, winB: 460 })]));
  assert.strictEqual(at47[1].pass, true);
  assert.strictEqual(at53[1].pass, true);
  assert.strictEqual(at54[1].pass, false);
});
test('core asserts: fight-length band 7–12 boundaries', () => {
  // avg 6.99 → fail; avg 7.0 → pass; avg 12 → pass; avg 12.01 → fail
  const mk = (roundsSum, n) => syntheticMatrix([mrow({ roundsSum, n, winA: n / 2, winB: n / 2 })]);
  assert.strictEqual(coreAsserts(mk(699, 100))[2].pass, false);
  assert.strictEqual(coreAsserts(mk(700, 100))[2].pass, true);
  assert.strictEqual(coreAsserts(mk(1200, 100))[2].pass, true);
  assert.strictEqual(coreAsserts(mk(1201, 100))[2].pass, false);
});
test('core asserts: round ceiling — longest fight 20 passes, 21 fails', () => {
  const at20 = coreAsserts(syntheticMatrix([mrow({ maxRounds: 20, n: 10, roundsSum: 100 })]));
  const at21 = coreAsserts(syntheticMatrix([mrow({ maxRounds: 21, n: 10, roundsSum: 110 })]));
  assert.strictEqual(at20[3].pass, true);
  assert.strictEqual(at21[3].pass, false);
});
test('core asserts: last-bell rate cap 5% (5.0 pass / 5.01 fail)', () => {
  const at5 = coreAsserts(syntheticMatrix([mrow({ n: 100, lastBell: 5, lastBellPct: 5, roundsSum: 1000 })]));
  const over = coreAsserts(syntheticMatrix([mrow({ n: 100, lastBell: 6, lastBellPct: 6, roundsSum: 1000 })]));
  assert.strictEqual(at5[4].pass, true);
  assert.strictEqual(over[4].pass, false);
});
test('core asserts: empty matrix degrades safely (dominance row n/a, mirror vacuous)', () => {
  const res = coreAsserts(syntheticMatrix([]));
  assert.strictEqual(res.length, 5);
  assert.strictEqual(res[0].pass, true, 'no classes → vacuously true');
  assert.strictEqual(res[1].pass, true, 'no mirrors → vacuously true');
});

// ------------------------------------------------------------ statusAsserts
test('status asserts: lean-win ≥55 and lean-loss ≤45 detected', () => {
  const rows = [];
  // bleed family (ashblade/status): one big win, one bad loss, one mid
  rows.push(mrow({ aClass: 'ashblade', aArch: 'status', bClass: 'gravewarden', bArch: 'standard', level: 5, n: 100, winA: 70, winB: 30, winAPct: 70, winBPct: 30 }));
  rows.push(mrow({ aClass: 'ashblade', aArch: 'status', bClass: 'cinder_witch', bArch: 'standard', level: 5, n: 100, winA: 30, winB: 70, winAPct: 30, winBPct: 70 }));
  rows.push(mrow({ aClass: 'hollow_cantor', aArch: 'status', bClass: 'ashblade', bArch: 'standard', level: 5, n: 100, winA: 80, winB: 20, winAPct: 80, winBPct: 20 }));
  const m = syntheticMatrix(rows);
  m.statusFamilies = { ashblade: 'bleed' };
  const out = statusAsserts(m);
  assert.strictEqual(out.length, 1);
  assert.strictEqual(out[0].pass, true, out[0].value);
  assert.match(out[0].value, /best 70.0% · worst 30.0%/);
});
test('status asserts: missing lean-loss row fails the family', () => {
  const rows = [
    mrow({ aClass: 'ashblade', aArch: 'status', bClass: 'gravewarden', bArch: 'standard', n: 100, winA: 70, winB: 30, winAPct: 70, winBPct: 30 }),
    mrow({ aClass: 'ashblade', aArch: 'status', bClass: 'cinder_witch', bArch: 'standard', n: 100, winA: 60, winB: 40, winAPct: 60, winBPct: 40 }),
  ];
  const m = syntheticMatrix(rows);
  m.statusFamilies = { ashblade: 'bleed' };
  const out = statusAsserts(m);
  assert.strictEqual(out[0].pass, false, 'worst 60% > 45% cap');
});
test('status asserts: status archetype absent from the matrix → explicit fail row', () => {
  const m = syntheticMatrix([mrow({})]);
  m.statusFamilies = { ashblade: 'bleed' };
  const out = statusAsserts(m);
  assert.strictEqual(out.length, 1);
  assert.strictEqual(out[0].pass, false);
  assert.match(out[0].value, /no rows/);
});
test('status asserts: no families → no rows (structural no-op)', () => {
  assert.strictEqual(statusAsserts(syntheticMatrix([mrow({})])).length, 0);
});

// ------------------------------------------------------------ KNOWN_GAPS
test('KNOWN_GAPS registry: exactly the three N7 rows, promoteAt T4.12', () => {
  assert.deepEqual(Object.keys(KNOWN_GAPS).sort(), ['anti-heal-sustain', 'anti-stun-lock'.length ? 'anti-zero-damage' : '', 'class-dominance'].filter(Boolean).sort());
  for (const g of Object.values(KNOWN_GAPS)) {
    assert.strictEqual(g.finding, 'N7');
    assert.strictEqual(g.promoteAt, 'T4.12');
  }
});
test('advisory stamping: gap rows carry advisory=true; hard rows do not', () => {
  const fail = coreAsserts(syntheticMatrix([
    mrow({ aClass: 'ashblade', bClass: 'cinder_witch', n: 1000, winA: 900, winB: 100 }),
    mrow({ aClass: 'hollow_cantor', bClass: 'gravewarden', n: 1000, winA: 500, winB: 500 }),
  ]));
  const dominance = fail.find((r) => r.id === 'class-dominance');
  assert.strictEqual(dominance.advisory, true);
  const mirror = fail.find((r) => r.id === 'mirror-parity');
  assert.strictEqual(mirror.advisory, false);
});

// ------------------------------------------------------------ variance probe
test('variance probe: canon matchup — contested buckets ≤ 12% σ, fortune exact', () => {
  const { mirrorPreset } = require('../data/presets.js');
  const probe = varianceProbe(mirrorPreset('ashblade', 5), mirrorPreset('gravewarden', 5), { n: 2000, tuning: T });
  assert.ok(probe.pass, JSON.stringify(probe.worst));
  assert.ok(probe.worst.sigmaPct <= TARGETS.varianceSigmaPct);
  assert.strictEqual(probe.fortune.ok, true);
  assert.ok(probe.fortune.min >= T.fortuneMin - 1e-9);
  assert.ok(probe.fortune.max <= T.fortuneMax + 1e-9);
});
test('variance assert: deterministic value for a fixed matchup (regression pin)', () => {
  const { mirrorPreset } = require('../data/presets.js');
  const a = varianceAssert(mirrorPreset('cinder_witch', 5), mirrorPreset('hollow_cantor', 5), { n: 1500, tuning: T });
  const b = varianceAssert(mirrorPreset('cinder_witch', 5), mirrorPreset('hollow_cantor', 5), { n: 1500, tuning: T });
  assert.deepStrictEqual(a, b);
  assert.strictEqual(a.pass, true);
});

// ------------------------------------------------------------ anti-lock set
test('degenerate builds: every probe build is canon-legal', () => {
  const B = degenerateBuilds(T);
  for (const key of ['stunLock', 'hushStarve', 'healSustain', 'wardTurtle', 'zeroDamage']) {
    const alloc = validateAlloc(B[key], T);
    assert.strictEqual(alloc.ok, true, `${key}: ${alloc.errors.join('; ')}`);
    assert.strictEqual(B[key].verses.length, 4);
  }
  assert.strictEqual(Object.keys(B.victims).length, 3);
});
test('anti-lock asserts: deterministic verdicts at small n', () => {
  const a = antiLockAsserts(T, { n: 60 });
  const b = antiLockAsserts(T, { n: 60 });
  assert.deepStrictEqual(a, b);
  assert.strictEqual(a.length, 5, 'five anti-lock rows');
  assert.ok(a.every((r) => typeof r.pass === 'boolean'));
});
test('anti-lock asserts: stun-lock and hush-starve hold at n=60 (hard rows)', () => {
  const rows = antiLockAsserts(T, { n: 60 });
  const stun = rows.find((r) => r.id === 'anti-stun-lock');
  const hush = rows.find((r) => r.id === 'anti-hush-starve');
  const ward = rows.find((r) => r.id === 'anti-ward-turtle');
  assert.strictEqual(stun.pass, true, stun.value);
  assert.strictEqual(hush.pass, true, hush.value);
  assert.strictEqual(ward.pass, true, ward.value);
  assert.strictEqual(stun.advisory, false);
});
test('TARGETS: every threshold matches its recorded provenance (ENG-8/N6)', () => {
  assert.strictEqual(TARGETS.classMaxWinPct, 58);
  assert.deepEqual(TARGETS.mirrorBandPct, [47, 53]);
  assert.deepEqual(TARGETS.avgRoundsBand, [7, 12]);
  assert.strictEqual(TARGETS.maxRoundsCeiling, 20);
  assert.strictEqual(TARGETS.lastBellMaxPct, 5);
  assert.strictEqual(TARGETS.varianceSigmaPct, 12);
  assert.strictEqual(TARGETS.contestedMinCount, 30);
  assert.strictEqual(TARGETS.stunSkipMaxFrac, 0.4);
  assert.strictEqual(TARGETS.hushNonStrikeMinFrac, 0.2);
  assert.strictEqual(TARGETS.sustainWinMaxPct, 58);
  assert.strictEqual(TARGETS.zeroDamageWinMaxPct, 35);
});

// --------------------------------------------------------------- sim layer
test('quickReading: outcome counts sum to n; bounds respected (n clamp)', () => {
  const { mirrorPreset } = require('../data/presets.js');
  const A = mirrorPreset('ashblade', 5);
  const B = mirrorPreset('cinder_witch', 5);
  const r = quickReading(A, B, { n: 60, tuning: T });
  assert.strictEqual(r.n, 60);
  assert.strictEqual(r.winA + r.winB + r.draws, 60);
  assert.strictEqual(r.perSeed.length, 60);
  assert.strictEqual(quickReading(A, B, { n: 0, tuning: T }).n, 200, 'n=0 → default 200');
  assert.strictEqual(quickReading(A, B, { n: -3, tuning: T }).n, 1, 'n<1 → 1');
  assert.strictEqual(quickReading(A, B, { n: 999999, tuning: T }).n, 20000, 'n clamp 20000');
});
test('quickReading: deterministic per-seed table', () => {
  const { mirrorPreset } = require('../data/presets.js');
  const a = quickReading(mirrorPreset('ashblade', 3), mirrorPreset('gravewarden', 3), { n: 30, tuning: T });
  const b = quickReading(mirrorPreset('ashblade', 3), mirrorPreset('gravewarden', 3), { n: 30, tuning: T });
  assert.deepStrictEqual(a, b);
});
test('quickReading: variance buckets sorted by length with sane spreads', () => {
  const { mirrorPreset } = require('../data/presets.js');
  const r = quickReading(mirrorPreset('ashblade', 5), mirrorPreset('hollow_cantor', 5), { n: 120, tuning: T });
  const lens = r.variance.byLength.map((b) => b.len);
  assert.deepEqual(lens, lens.slice().sort((x, y) => x - y));
  for (const b of r.variance.byLength) {
    assert.ok(b.max >= b.min);
    assert.ok(b.spreadPct >= 0);
  }
  assert.ok(r.minRounds <= r.avgRounds && r.avgRounds <= r.maxRounds);
});
test('fortuneTrack: every sampled fight stays inside the hard band', () => {
  const { mirrorPreset } = require('../data/presets.js');
  for (const seed of [1, 2, 3, 4, 5]) {
    const track = fortuneTrack(mirrorPreset('ashblade', 5), mirrorPreset('cinder_witch', 5), seed, T);
    assert.strictEqual(track[0], 1.0);
    for (const f of track) {
      assert.ok(f >= T.fortuneMin - 1e-12 && f <= T.fortuneMax + 1e-12, `fortune ${f}`);
    }
  }
});

// ------------------------------------------------------------ reading cache
test('cache: hit on identical matchup, miss on any change; counters move', () => {
  clearReadingCache();
  const { mirrorPreset } = require('../data/presets.js');
  const A = mirrorPreset('ashblade', 5);
  const B = mirrorPreset('cinder_witch', 5);
  const r1 = runReading(A, B, { n: 20, tuning: T });
  assert.strictEqual(r1.cached, false);
  const r2 = runReading(A, B, { n: 20, tuning: T });
  assert.strictEqual(r2.cached, true);
  const stats = cacheStats();
  assert.ok(stats.hits >= 1 && stats.misses >= 1);
  const r3 = runReading(A, B, { n: 21, tuning: T });
  assert.strictEqual(r3.cached, false, 'different n → different key');
});
test('cache: key stability under key-insertion-order churn', () => {
  const a = { name: 'A', clazz: 'ashblade', level: 5, creation: { vig: 1, mig: 2, wit: 0, grd: 0, hst: 1 }, levelUps: { vig: 0, mig: 0, wit: 0, grd: 0, hst: 0 }, vow: null, verses: ['rend'], items: [] };
  const a2 = { items: [], verses: ['rend'], vow: null, levelUps: { hst: 0, grd: 0, wit: 0, mig: 0, vig: 0 }, creation: { hst: 1, grd: 0, wit: 0, mig: 2, vig: 1 }, level: 5, clazz: 'ashblade', name: 'A' };
  assert.strictEqual(
    readingKey(a, a, {}),
    readingKey(a2, a2, {}));
});
test('cache: tuning fingerprint — canon runs share keys; overrides split them', () => {
  const { mirrorPreset } = require('../data/presets.js');
  const A = mirrorPreset('ashblade', 5);
  const B = mirrorPreset('gravewarden', 5);
  clearReadingCache();
  const canon1 = runReading(A, B, { n: 10 });
  const canon2 = runReading(A, B, { n: 10 });
  assert.strictEqual(canon2.cached, true, 'canon fingerprint shared');
  const t2 = createTuning({ hpBase: 61 });
  const tweaked = runReading(A, B, { n: 10, tuning: t2 });
  assert.strictEqual(tweaked.cached, false, 'override → new Reading');
  const tweaked2 = runReading(A, B, { n: 10, tuning: t2 });
  assert.strictEqual(tweaked2.cached, true, 'same override → same key');
});
test('cache: LRU bound at 64 with eviction counting', () => {
  clearReadingCache();
  const { mirrorPreset } = require('../data/presets.js');
  const B = mirrorPreset('cinder_witch', 5);
  for (let i = 0; i < 70; i++) {
    const A = { ...mirrorPreset('ashblade', 5), name: 'churn-' + i };
    runReading(A, B, { n: 5, tuning: T });
  }
  const stats = cacheStats();
  assert.strictEqual(stats.size, 64, 'bounded');
  assert.ok(stats.evictions >= 6, `evictions ${stats.evictions}`);
});
test('cache: LRU refresh on hit (hot entries survive churn)', () => {
  clearReadingCache();
  const { mirrorPreset } = require('../data/presets.js');
  const hot = { ...mirrorPreset('ashblade', 5), name: 'hot' };
  const B = mirrorPreset('gravewarden', 5);
  runReading(hot, B, { n: 5, tuning: T });
  for (let i = 0; i < 70; i++) {
    runReading({ ...mirrorPreset('ashblade', 5), name: 'churn-' + i }, B, { n: 5, tuning: T });
    if (i % 10 === 0) runReading(hot, B, { n: 5, tuning: T }); // keep hot
  }
  const again = runReading(hot, B, { n: 5, tuning: T });
  assert.strictEqual(again.cached, true, 'refreshed entry survived 70 inserts');
});
test('cache: clearReadingCache resets size and counters', () => {
  clearReadingCache();
  const { mirrorPreset } = require('../data/presets.js');
  runReading(mirrorPreset('ashblade', 5), mirrorPreset('cinder_witch', 5), { n: 5, tuning: T });
  clearReadingCache();
  const stats = cacheStats();
  assert.strictEqual(stats.size, 0);
  assert.strictEqual(stats.hits, 0);
  assert.strictEqual(stats.misses, 0);
  assert.strictEqual(stats.evictions, 0);
});
test('cache: payload carries the §5.8 counter line for canon class pairs', () => {
  const { mirrorPreset } = require('../data/presets.js');
  const r = runReading(mirrorPreset('ashblade', 5), mirrorPreset('gravewarden', 5), { n: 5, tuning: T });
  assert.strictEqual(r.counterLine, 'Bleed ignores armor.');
  const r2 = runReading(mirrorPreset('cinder_witch', 5), mirrorPreset('gravewarden', 5), { n: 5, tuning: T });
  assert.strictEqual(r2.counterLine, 'Conflagration cracks armor.');
});
test('cache: counterFor honors the override hook', () => {
  READING_OVERRIDES['ashblade:gravewarden'] = 'The sexton remembers every cut.';
  try {
    const { mirrorPreset } = require('../data/presets.js');
    assert.strictEqual(counterFor(mirrorPreset('ashblade', 5), mirrorPreset('gravewarden', 5)), 'The sexton remembers every cut.');
  } finally {
    delete READING_OVERRIDES['ashblade:gravewarden'];
  }
  const { mirrorPreset } = require('../data/presets.js');
  assert.strictEqual(counterFor(mirrorPreset('ashblade', 5), mirrorPreset('gravewarden', 5)), 'Bleed ignores armor.', 'hook cleans up');
});
test('cache: unknown class pairs yield a null counter line (no crash)', () => {
  assert.strictEqual(counterFor({ clazz: 'ghost' }, { clazz: 'wraith' }), null);
});
test('cache: returned payload exposes win percentages, rounds, variance', () => {
  clearReadingCache();
  const { mirrorPreset } = require('../data/presets.js');
  const r = runReading(mirrorPreset('ashblade', 5), mirrorPreset('cinder_witch', 5), { n: 30, tuning: T });
  for (const k of ['n', 'winAPct', 'winBPct', 'draws', 'avgRounds', 'minRounds', 'maxRounds', 'counterLine', 'variance', 'cached', 'key']) {
    assert.ok(k in r, `payload.${k}`);
  }
  assert.ok(r.winAPct + r.winBPct === 100);
  assert.ok(r.variance.overallSpreadPct >= 0);
});
test('cache: identical builds both sides (true mirror) cache once', () => {
  clearReadingCache();
  const { mirrorPreset } = require('../data/presets.js');
  const M = mirrorPreset('ashblade', 5);
  const r1 = runReading(M, M, { n: 10, tuning: T });
  const r2 = runReading(M, M, { n: 10, tuning: T });
  assert.strictEqual(r1.cached, false);
  assert.strictEqual(r2.cached, true);
});

// ---------------------------------------------------------------- roster
test('roster: fixture smoke passes — budgets ±0, variance, ceiling', () => {
  const res = rosterAsserts({ tuning: T, seedsPerFight: 200 });
  assert.strictEqual(res.stage, 'FIXTURE-SMOKE');
  assert.strictEqual(res.pass, true, JSON.stringify(res.rows.map((r) => [r.id, r.allBudgetsOk, r.allVarianceOk])));
  assert.strictEqual(res.rows.length, FIXTURE_ROSTER.length);
});
test('roster: every fixture row sums exactly to budget(L)', () => {
  for (const row of rosterAsserts({ tuning: T, seedsPerFight: 100 }).rows) {
    assert.strictEqual(row.budget.ok, true, `${row.id} sum ${row.budget.sum} vs ${row.budget.budgetForLevel}`);
  }
});
test('roster: per-class probes exist for all four classes', () => {
  const res = rosterAsserts({ tuning: T, seedsPerFight: 100 });
  for (const row of res.rows) {
    assert.strictEqual(row.perClass.length, 4);
    for (const p of row.perClass) {
      assert.ok(p.clearPct >= 0 && p.clearPct <= 100);
      assert.ok(p.worstSigmaPct <= TARGETS.varianceSigmaPct + 1e-9, `${row.id}/${p.clazz} σ ${p.worstSigmaPct}`);
    }
  }
});
test('roster: the declared notes ride along (D12 provisional visible)', () => {
  const bram = FIXTURE_ROSTER.find((r) => r.id === 'bram');
  assert.match(bram.declared.notes, /D12/);
});

// ------------------------------------------------------------ full gate
test('full gate: runs end-to-end small and reports every section', () => {
  const gate = fullBalanceGate({ tuning: T, n: 8, archetypeN: 4, levels: [1, 5] });
  for (const key of ['matrix', 'archetypeMatrix', 'core', 'status', 'locks', 'all']) {
    assert.ok(key in gate, `gate.${key}`);
  }
  assert.strictEqual(gate.all.length, gate.core.length + gate.status.length + gate.locks.length);
  assert.ok(gate.all.every((r) => typeof r.pass === 'boolean' && typeof r.id === 'string'));
});
test('full gate: archetypeMatrix carries the status families for statusAsserts', () => {
  const gate = fullBalanceGate({ tuning: T, n: 4, archetypeN: 3, levels: [5] });
  assert.ok(gate.archetypeMatrix.statusFamilies);
  assert.deepEqual(gate.archetypeMatrix.statusFamilies, STATUS_FAMILY);
});
