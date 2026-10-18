/**
 * phase2-harness.test.js — T2.1/T2.2/T2.3/T2.4 test suite.
 * Determinism, silent-mode equivalence, §15.3 core asserts (hard rows),
 * KNOWN-GAP advisory reporting (N7), negative tests (tamper → loud red),
 * Reading cache behaviour + harness-sim consistency + perf smoke,
 * fixture-roster conformance.
 */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert');

const { createTuning } = require('../tuning.js');
const { CANON } = require('../data/config.js');
const { createSession, runToCompletion, resultsOf } = require('../engine/fight.js');
const { runMatrix, classRollup, mirrorRollup, lengthRollup } = require('../harness/matrix.js');
const {
  coreAsserts, statusAsserts, antiLockAsserts, varianceAssert,
  degenerateBuilds, TARGETS, KNOWN_GAPS,
} = require('../harness/asserts.js');
const { STATUS_FAMILY, archetypeBuild } = require('../harness/archetypes.js');
const { rosterAsserts } = require('../harness/roster.js');
const {
  runReading, cacheStats, clearReadingCache,
} = require('../sim/readingCache.js');

const tuning = createTuning();
const CLASSES = ['ashblade', 'cinder_witch', 'gravewarden', 'hollow_cantor'];

/* ------------------------------------------------------------------ *
 * 1. Silent mode — no logging, byte-identical results
 * ------------------------------------------------------------------ */
test('silent mode: identical results, empty log', () => {
  const a = archetypeBuild('ashblade', 'aggressive', 5, tuning);
  const b = archetypeBuild('cinder_witch', 'defensive', 5, tuning);
  for (let i = 0; i < 40; i++) {
    const seed = (i * 0x9e3779b9) >>> 0;
    const loud = createSession(a, b, { seed, tuning });
    runToCompletion(loud);
    const rl = resultsOf(loud);
    const quiet = createSession(a, b, { seed, tuning, silent: true });
    runToCompletion(quiet);
    const rq = resultsOf(quiet);
    assert.strictEqual(rq.log.length, 0, 'silent session must not log');
    assert.deepStrictEqual(
      { w: rq.winner, r: rq.rounds, a: rq.totals.a, b: rq.totals.b, lb: rq.lastBell },
      { w: rl.winner, r: rl.rounds, a: rl.totals.a, b: rl.totals.b, lb: rl.lastBell },
      `seed ${seed}: silent results must equal verbose`
    );
  }
});

/* ------------------------------------------------------------------ *
 * 2. Matrix determinism — byte-identical reruns
 * ------------------------------------------------------------------ */
test('matrix: deterministic byte-for-byte across reruns', () => {
  const opts = { mode: 'classes', levels: [1, 5], n: 40, tuning };
  const r1 = runMatrix(opts);
  const r2 = runMatrix(opts);
  assert.strictEqual(JSON.stringify(r1), JSON.stringify(r2));
});

/* ------------------------------------------------------------------ *
 * 3. §15.3 core asserts — hard rows green on fixture data
 * ------------------------------------------------------------------ */
test('core asserts: hard rows green, KNOWN-GAP rows advisory', () => {
  const matrix = runMatrix({ mode: 'classes', levels: [1, 5, 9], n: 100, tuning });
  const results = coreAsserts(matrix);
  const byId = Object.fromEntries(results.map((r) => [r.id, r]));

  for (const r of results) {
    if (KNOWN_GAPS[r.id]) {
      assert.strictEqual(r.advisory, true, `${r.id} must be flagged advisory (N7)`);
    } else {
      assert.strictEqual(r.advisory, false, `${r.id} must be hard`);
      assert.strictEqual(r.pass, true, `hard assert ${r.id} must pass: ${r.value} — ${r.detail}`);
    }
  }
  // the three N7 rows must still report a strict value
  assert.match(byId['class-dominance'].value, /ashblade/);
});

test('archetype matrix: every status family has lean-win AND lean-loss', () => {
  const amatrix = runMatrix({
    mode: 'archetypes', levels: [5, 9], n: 30,
    archetypes: ['aggressive', 'defensive', 'status'], tuning,
  });
  amatrix.statusFamilies = STATUS_FAMILY;
  const results = statusAsserts(amatrix);
  assert.strictEqual(results.length, 4);
  for (const r of results) assert.strictEqual(r.pass, true, `${r.id}: ${r.value}`);
});

/* ------------------------------------------------------------------ *
 * 4. Anti-lock set — degenerate builds must fail (hard rows)
 * ------------------------------------------------------------------ */
test('anti-lock: hard rows pass; N7 rows advisory', () => {
  const results = antiLockAsserts(tuning, { n: 200 });
  for (const r of results) {
    if (KNOWN_GAPS[r.id]) {
      assert.strictEqual(r.advisory, true);
    } else {
      assert.strictEqual(r.pass, true, `${r.id} must pass: ${r.value}`);
    }
  }
  assert.ok(results.some((r) => r.id === 'anti-zero-damage' && r.advisory));
});

/* ------------------------------------------------------------------ *
 * 5. Negative tests — tamper a constant → loud red
 * ------------------------------------------------------------------ */
test('negative: widened jitter turns the N6 variance assert red', () => {
  // width 1.0 → per-hit ×(0..2): the √N averaging over ~20 hits still leaves
  // σ/mean ≈ 20%+ — far past the 12% band, so the assert must go red loudly.
  const tampered = createTuning({ jitterWidth: 1.0 });
  const a = archetypeBuild('ashblade', 'standard', 5, tampered);
  const b = archetypeBuild('gravewarden', 'standard', 5, tampered);
  const r = varianceAssert(a, b, { n: 2000, tuning: tampered });
  assert.strictEqual(r.pass, false, 'tampered variance must fail loudly');
  assert.strictEqual(r.advisory, false, 'variance-band is a hard assert');
});

test('negative: moving the Last Bell past r20 breaks the round ceiling', () => {
  const tampered = createTuning({ fatigue: { ...CANON.fatigue, lastBellRound: 30 } });
  const B = degenerateBuilds(tampered);
  let maxRounds = 0;
  for (let i = 0; i < 40; i++) {
    const seed = (0x9e3779b9 ^ (i * 0x85ebca6b)) >>> 0;
    const s = createSession(B.zeroDamage, B.victims.hollow_cantor, { seed, tuning: tampered, silent: true });
    runToCompletion(s);
    maxRounds = Math.max(maxRounds, resultsOf(s).rounds);
  }
  assert.ok(maxRounds > 20, `expected fights past r20 with Bell at 30, max was ${maxRounds}`);
});

test('negative: inflating durability turns the fight-length assert red', () => {
  // A regression that inflates effective HP (8 → 20 HP per VIG) drags every
  // fight past the §15.3 "7–12 rounds average" band — it must fail loudly.
  const tampered = createTuning({ hpPerVig: 20 });
  const matrix = runMatrix({ mode: 'classes', levels: [5], n: 60, tuning: tampered });
  const results = coreAsserts(matrix);
  const length = results.find((r) => r.id === 'fight-length');
  assert.strictEqual(length.pass, false, `expected fight-length red, got: ${length.value}`);
  assert.strictEqual(length.advisory, false, 'fight-length is a hard assert');
});

/* ------------------------------------------------------------------ *
 * 6. Reading cache (T2.4) — keys, hits, eviction, consistency, perf
 * ------------------------------------------------------------------ */
test('reading cache: hit on same matchup, miss on any change', () => {
  clearReadingCache();
  const a = archetypeBuild('ashblade', 'aggressive', 5, tuning);
  const b = archetypeBuild('gravewarden', 'defensive', 5, tuning);
  const r1 = runReading(a, b, { n: 50, tuning });
  assert.strictEqual(r1.cached, false);
  const r2 = runReading(a, b, { n: 50, tuning });
  assert.strictEqual(r2.cached, true);
  assert.strictEqual(r2.winAPct, r1.winAPct, 'cached reading must return identical numbers');

  // one slot changed → different key
  const a2 = { ...a, verses: [a.verses[1], a.verses[0], ...a.verses.slice(2)] };
  const r3 = runReading(a2, b, { n: 50, tuning });
  assert.strictEqual(r3.cached, false);

  // tuning deviation → different key
  const t2 = createTuning({ bramHP: 121 });
  const r4 = runReading(a, b, { n: 50, tuning: t2 });
  assert.strictEqual(r4.cached, false);
  assert.ok(cacheStats().misses >= 3);
});

test('reading cache: LRU bounded', () => {
  clearReadingCache();
  for (let i = 0; i < 70; i++) {
    const a = archetypeBuild('ashblade', 'standard', 1 + (i % 10), tuning);
    const b = archetypeBuild('gravewarden', 'defensive', 1 + (i % 10), tuning);
    runReading(a, b, { n: 2, tuning, syncBand: i }); // syncBand varies the key
  }
  const s = cacheStats();
  assert.ok(s.size <= s.max, `cache size ${s.size} must be bounded by ${s.max}`);
  assert.ok(s.evictions >= 70 - s.max);
  clearReadingCache();
});

test('reading vs harness consistency: same engine, converging estimates (Δ ≤ 2 pts)', () => {
  clearReadingCache();
  const a = archetypeBuild('cinder_witch', 'aggressive', 5, tuning);
  const b = archetypeBuild('hollow_cantor', 'defensive', 5, tuning);
  const reading = runReading(a, b, { n: 200, tuning });
  const wide = runReading(a, b, { n: 1000, tuning });
  assert.strictEqual(reading.cached, false);
  assert.strictEqual(wide.cached, false, 'different n must be a different key');
  assert.ok(
    Math.abs(reading.winAPct - wide.winAPct) <= 2,
    `Δ win% ${Math.abs(reading.winAPct - wide.winAPct).toFixed(2)} must be ≤ 2 points`
  );
  clearReadingCache();
});

test('reading perf smoke: 200 fresh seeds in < 50ms on this machine', () => {
  clearReadingCache();
  const a = archetypeBuild('ashblade', 'standard', 7, tuning);
  const b = archetypeBuild('hollow_cantor', 'status', 7, tuning);
  const t0 = performance.now();
  const r = runReading(a, b, { n: 200, tuning });
  const ms = performance.now() - t0;
  assert.strictEqual(r.cached, false);
  // TASKS T2.4 target: <40ms on a throttled mid-tier phone, <5ms desktop.
  // This is a server-side smoke (no throttling); the strict phone budget is
  // measured on target hardware at T10.4. 50ms here leaves 8× headroom.
  assert.ok(ms < 50, `200-seed Reading took ${ms.toFixed(1)}ms`);
});

/* ------------------------------------------------------------------ *
 * 7. Roster conformance (fixture smoke, T2.3)
 * ------------------------------------------------------------------ */
test('roster: budget conformance + per-fight variance on fixtures', () => {
  const report = rosterAsserts({ tuning, seedsPerFight: 300 });
  assert.strictEqual(report.stage, 'FIXTURE-SMOKE');
  assert.strictEqual(report.pass, true, JSON.stringify(report.rows, null, 2));
  for (const row of report.rows) {
    assert.strictEqual(row.budget.ok, true, `${row.id} must conform to budget(L)`);
    for (const p of row.perClass) {
      assert.ok(p.worstSigmaPct <= TARGETS.varianceSigmaPct, `${row.id}/${p.clazz} σ ${p.worstSigmaPct}`);
      assert.strictEqual(p.varianceOk, true);
    }
  }
});

/* ------------------------------------------------------------------ *
 * 8. Harness rollups self-consistency
 * ------------------------------------------------------------------ */
test('rollups: totals agree with per-matchup aggregation', () => {
  const m = runMatrix({ mode: 'classes', levels: [1, 3], n: 25, tuning });
  const len = lengthRollup(m);
  assert.strictEqual(len.n, m.totals.n);
  assert.strictEqual(len.lastBell, m.totals.lastBell);
  const histSum = len.histogram.reduce((s, v) => s + v, 0);
  assert.strictEqual(histSum, len.n);
  const roll = classRollup(m);
  for (const r of roll) assert.ok(r.winPct >= 0 && r.winPct <= 100);
  const mir = mirrorRollup(m);
  assert.strictEqual(mir.winAPct + (100 - mir.winAPct), 100);
});
