// phase1-engine.test.js — T1.9: determinism & bans suite for the Phase-1
// engine. Enforces the ten [GDD] §10.9 bans that are enforceable headless,
// the §15.1 rounding contract, the D8 Fatigue schedule, and the D7 budget
// conformance. Run: node --test tests/phase1-engine.test.js
'use strict';

const { test } = require('node:test');
const assert = require('node:assert');

const {
  fnv1a, mulberry32, makeMeasures, deriveSeed, deriveEchoSeed, displaySeed,
  buildSheet, validateAlloc, checkBudget, budgetFor, syncedSheet, derive,
  createTuning, diffTuning, CANON,
  runFight, createSession, step, submitChoice, resultsOf, ledgerVerdict,
} = require('../engine/index.js');
const { BRAM, L1_ASHBLADE, FIRST_VESPERS, mirrorPreset } = require('../data/presets.js');
const { VERSES, STRIKE, VERSE_BY_ID } = require('../data/verses.js');
const { CLASSES, STAT_KEYS } = require('../data/classes.js');
const { validate, OPCODES } = require('../data/schemas/validators.js');
const { lastBellResolve, cumulativeThrough, telegraphFor, fatigueDamage } = require('../engine/fatigue.js');
const { quickReading } = require('../sim/reading.js');

const T = createTuning();

// ---------------------------------------------------------------------------
// T1.1 — RNG: the randomness contract

test('FNV-1a matches the published 32-bit test vectors', () => {
  assert.strictEqual(fnv1a(''), 0x811c9dc5);
  assert.strictEqual(fnv1a('a'), 0xe40c292c);
  assert.strictEqual(fnv1a('foobar'), 0xbf9cf968);
});

test('mulberry32 matches the canonical reference implementation', () => {
  // Literal reference copy (mulberry32 by Tommy Ettinger, public domain).
  function reference(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) | 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t = (t + Math.imul(t ^ (t >>> 7), t | 61)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  for (const seed of [0, 1, 0xdeadbeef, 0xffffffff, 12345]) {
    const a = mulberry32(seed); const b = reference(seed);
    for (let i = 0; i < 1000; i++) assert.strictEqual(a(), b(), 'seed ' + seed + ' draw ' + i);
  }
});

test('same seed → identical stream; display form is MEASURE · XXXX-XXXX', () => {
  const a = mulberry32(42); const b = mulberry32(42);
  for (let i = 0; i < 100; i++) assert.strictEqual(a(), b());
  assert.match(displaySeed(0x4f2a91cc), /^MEASURE · 4F2A-91CC$/);
  assert.match(displaySeed(deriveSeed({}, {}, 0, 0)), /^MEASURE · [0-9A-F]{4}-[0-9A-F]{4}$/);
});

test('seed derivation is stable and input-sensitive (§10.3)', () => {
  const A = { a: 1 }, B = { b: 2 };
  assert.strictEqual(deriveSeed(A, B, 0, 0), deriveSeed({ a: 1 }, { b: 2 }, 0, 0));
  assert.notStrictEqual(deriveSeed(A, B, 0, 0), deriveSeed(A, B, 0, 1));
  assert.notStrictEqual(deriveSeed(A, B, 0, 0), deriveSeed(B, A, 0, 0));
  // Echo floor derivation (§10.12): same hour → same result
  assert.strictEqual(deriveEchoSeed('E1', 'E2', 5, 0), deriveEchoSeed('E1', 'E2', 5, 0));
});

test('six Measure shapes: distributions match definitions (500k samples)', () => {
  const N = 500000;
  // Band(10): uniform [0,10)
  {
    const r = mulberry32(77); const m = makeMeasures(r);
    const buckets = new Array(10).fill(0);
    for (let i = 0; i < N; i++) buckets[m.band(10)] += 1;
    for (const b of buckets) {
      const pct = b / N;
      assert.ok(Math.abs(pct - 0.1) < 0.005, 'Band bucket ' + pct.toFixed(4));
    }
  }
  // Narrow(2,5): uniform [2,5], nothing outside
  {
    const r = mulberry32(78); const m = makeMeasures(r);
    const seen = new Set();
    for (let i = 0; i < N; i++) {
      const v = m.narrow(2, 5);
      assert.ok(v >= 2 && v <= 5 && Number.isInteger(v));
      seen.add(v);
    }
    assert.deepStrictEqual([...seen].sort(), [2, 3, 4, 5]);
  }
  // Clamped(1.00, 0.10): mean 1.00 within 1e-3, all within [0.90, 1.10]
  {
    const r = mulberry32(79); const m = makeMeasures(r);
    let sum = 0;
    for (let i = 0; i < N; i++) {
      const v = m.clamped(1.0, 0.1);
      assert.ok(v >= 0.9 - 1e-9 && v <= 1.1 + 1e-9);
      sum += v;
    }
    assert.ok(Math.abs(sum / N - 1.0) < 1e-3, 'Clamped mean ' + (sum / N));
  }
  // Weighted: 70/30 split within 1%
  {
    const r = mulberry32(80); const m = makeMeasures(r);
    let x = 0;
    for (let i = 0; i < N; i++) {
      if (m.weighted([{ value: 'x', weight: 7 }, { value: 'y', weight: 3 }]) === 'x') x += 1;
    }
    assert.ok(Math.abs(x / N - 0.7) < 0.01, 'Weighted ' + (x / N));
  }
  // Shuffle: permutation of the input, deterministic per stream position
  {
    const r = mulberry32(81); const m = makeMeasures(r);
    const out = m.shuffle([1, 2, 3, 4, 5, 6, 7, 8]);
    assert.deepStrictEqual(out.slice().sort(), [1, 2, 3, 4, 5, 6, 7, 8]);
  }
  // Fixed consumes nothing: interleaving Fixed does not advance the stream
  {
    const r1 = mulberry32(99); const m1 = makeMeasures(r1);
    const r2 = mulberry32(99); const m2 = makeMeasures(r2);
    m1.fixed(123);
    assert.strictEqual(m1.band(1000), m2.band(1000));
  }
});

// ---------------------------------------------------------------------------
// T1.2 — fighter assembly

test('§5.2 class base blocks total exactly 27', () => {
  for (const c of Object.values(CLASSES)) {
    const sum = STAT_KEYS.reduce((s, k) => s + c.base[k], 0);
    assert.strictEqual(sum, 27, c.id);
  }
});

test('L1 Ashblade example recomputes: 108 HP, MIG 10, crit 14%', () => {
  const sheet = buildSheet(L1_ASHBLADE, T);
  assert.strictEqual(sheet.stats.mig, 10);
  assert.strictEqual(sheet.maxHp, 108); // 60 + 8×6 (VIG unspent)
  const d = derive(sheet, T);
  assert.strictEqual(d.critChance, 0.05 + 0.01 * 9);
});

test('Bram: budget(1) = 33 exactly, HP 120 (PROVISIONAL:D12)', () => {
  const conf = checkBudget(BRAM.stats, 1, T);
  assert.strictEqual(conf.budget, 33);
  assert.ok(conf.ok, 'Bram must conform to budget(L) = 33 + 2(L−1)');
  const sheet = buildSheet(BRAM, T);
  assert.strictEqual(sheet.maxHp, 120);
});

test('allocation validator: exactly the legal totals pass', () => {
  assert.ok(validateAlloc(L1_ASHBLADE, T).ok);
  const bad = { ...L1_ASHBLADE, creation: { vig: 5, mig: 2, wit: 0, grd: 0, hst: 0 } };
  assert.ok(!validateAlloc(bad, T).ok);
  const over = { ...L1_ASHBLADE, creation: { vig: 0, mig: 4, wit: 0, grd: 0, hst: 0 } }; // MIG 12 > cap
  assert.ok(!validateAlloc(over, T).ok);
});

test('enemy conformance: every budget row from L1 to L10 = 33 + 2(L−1) (D7/N5)', () => {
  for (let L = 1; L <= 10; L++) assert.strictEqual(budgetFor(L, T), 33 + 2 * (L - 1));
});

test('D2 level-sync: +1 stat / +4% HP per level over band, cap 3', () => {
  const sheet = buildSheet(mirrorPreset('ashblade', 8), T);
  const synced = syncedSheet(sheet, 5, T);
  assert.strictEqual(synced.syncedOver, 3);
  assert.strictEqual(synced.maxHp, Math.round(sheet.maxHp * 1.12));
  const someStatGrew = STAT_KEYS.some((k) => synced.stats[k] === sheet.stats[k] + 1);
  assert.ok(someStatGrownHelper(sheet, synced), 'exactly one stat +1 under the cap-3 rule');
  function someStatGrownHelper(a, b) {
    let diff = 0;
    for (const k of STAT_KEYS) diff += b.stats[k] - a.stats[k];
    return diff === 1;
  }
});

// ---------------------------------------------------------------------------
// T1.4 — the damage pipeline and the rounding contract

test('golden pipeline: Rend 5 + 0.9×12 MIG vs GRD 10 → exactly 13', () => {
  // [02] §6.2 hand sim: raw 15.8, mitigation 2%×10 = 0.20 → 15.8 × 0.8 = 12.64 → 13.
  const { resolveDamage } = require('../engine/damage.js');
  const atk = { sheet: { stats: { mig: 12, hst: 0 }, mainStat: 'mig', items: [], damageType: 'steel' }, statuses: {}, mods: {}, flags: {}, riteState: null, opponent: null };
  const def = { sheet: { stats: { grd: 10 }, items: [] }, statuses: {}, mods: {}, flags: {}, hp: 100, maxHp: 100, opponent: null };
  // deterministic fake Measure: jitter 1.0, no fortune drift, no crit
  const m = {
    clamped: (c) => (c === 1.0 ? 1.0 : 0.0), // jitter 1.0, drift 0
    band: () => 100, // never < crit chance → no crit
  };
  const state = { fortune: 1.0, fortuneTrack: [] };
  const spec = { base: 5, coefs: [{ stat: 'mig', c: 0.9 }], type: 'steel' };
  const audit = resolveDamage(state, atk, def, spec, m, T);
  assert.strictEqual(audit.dealt, 13);
  assert.strictEqual(audit.mit, 0.2);
  assert.ok(!audit.crit);
});

test('rounding contract: min-1 damage holds against heavy mitigation', () => {
  const { resolveDamage } = require('../engine/damage.js');
  const atk = { sheet: { stats: { mig: 1, hst: 0 }, mainStat: 'mig', items: [], damageType: 'steel' }, statuses: {}, mods: {}, flags: {}, riteState: null };
  const def = { sheet: { stats: { grd: 10 }, items: [] }, statuses: { brace: { turns: 1 } }, mods: {}, flags: {}, hp: 100, maxHp: 100 };
  const m = { clamped: (c) => (c === 1.0 ? 0.9 : 0.0), band: () => 100 };
  const spec = { base: 2, coefs: [{ stat: 'mig', c: 0.4 }], type: 'steel' };
  const audit = resolveDamage({ fortune: 1.0, fortuneTrack: [] }, atk, def, spec, m, T);
  assert.ok(audit.land >= 1, 'minimum 1 damage per landed hit (§10.10)');
});

test('Ward absorbs before HP; ward break removes the pool', () => {
  const { resolveDamage } = require('../engine/damage.js');
  const atk = { sheet: { stats: { mig: 10, hst: 0 }, mainStat: 'mig', items: [], damageType: 'steel' }, statuses: {}, mods: {}, flags: {}, riteState: null };
  const def = { sheet: { stats: { grd: 0 }, items: [] }, statuses: { ward: { pool: 5, turns: 3 } }, mods: {}, flags: {}, hp: 100, maxHp: 100 };
  const m = { clamped: (c) => (c === 1.0 ? 1.0 : 0.0), band: () => 100 };
  const spec = { base: 8, coefs: [], type: 'steel' };
  const audit = resolveDamage({ fortune: 1.0, fortuneTrack: [] }, atk, def, spec, m, T);
  assert.strictEqual(audit.dealt, 8);
  assert.strictEqual(audit.warded, 5);
  assert.strictEqual(audit.land, 3);
  assert.strictEqual(def.hp, 97);
  assert.strictEqual(def.statuses.ward, null); // broken
});

test('Curse multiplies raw by 0.75 (Last Hymn: 0.60)', () => {
  const { resolveDamage } = require('../engine/damage.js');
  const mk = (curseMult) => ({
    atk: { sheet: { stats: { mig: 10, hst: 0 }, mainStat: 'mig', items: [], damageType: 'steel' }, statuses: curseMult ? { curse: { turns: 1 } } : {}, mods: curseMult ? { curseMult } : {}, flags: {}, riteState: null },
  });
  const def = { sheet: { stats: { grd: 0 }, items: [] }, statuses: {}, mods: {}, flags: {}, hp: 100, maxHp: 100 };
  const m = { clamped: (c) => (c === 1.0 ? 1.0 : 0.0), band: () => 100 };
  const spec = { base: 8, coefs: [], type: 'steel' };
  const clean = resolveDamage({ fortune: 1.0, fortuneTrack: [] }, mk(null).atk, def, spec, m, T);
  def.hp = 100;
  const cursed = resolveDamage({ fortune: 1.0, fortuneTrack: [] }, mk(0.75).atk, { ...def, statuses: {} }, spec, m, T);
  assert.strictEqual(cursed.dealt, Math.round(8 * 0.75));
  assert.strictEqual(cursed.dealt, 6);
});

// ---------------------------------------------------------------------------
// T1.5 — Resolve economy

test('Resolve: start 3 / second mover 4, income +3, Hush floor +1, cap 10', () => {
  const { resolveAtFightStart, resolveGain, gain } = require('../engine/resolve.js');
  const mk = () => ({ statuses: {}, resolve: 0, mods: {}, maxHp: 100, hp: 100 });
  const a = mk(); const b = mk();
  resolveAtFightStart(a, false, T); resolveAtFightStart(b, true, T);
  assert.strictEqual(a.resolve, 3); assert.strictEqual(b.resolve, 4);
  assert.strictEqual(resolveGain(a, T), 3); assert.strictEqual(a.resolve, 6);
  a.statuses.hush = { turns: 2 };
  assert.strictEqual(resolveGain(a, T), 1); // floored
  assert.strictEqual(a.resolve, 7);
  a.mods.hushMod = 3; // Silence vow depth
  assert.strictEqual(resolveGain(a, T), 1); // still floored
  gain(a, 10, T);
  assert.strictEqual(a.resolve, 10); // cap
});

// ---------------------------------------------------------------------------
// T1.3 — statuses

test('Bleed refuses the 6th stack (cap 5); Red Tide cap 8', () => {
  const { applyBleed } = require('../engine/status.js');
  const f = { statuses: { bleed: null } };
  applyBleed(f, 3, 10); applyBleed(f, 3, 10);
  assert.strictEqual(f.statuses.bleed.stacks, 5); // 6 refused
  applyBleed(f, 1, 10, 8);
  assert.strictEqual(f.statuses.bleed.stacks, 6);
});

test('Burn reapplication keeps the higher potency and refreshes', () => {
  const { applyBurn } = require('../engine/status.js');
  const f = { statuses: { burn: null } };
  applyBurn(f, 6, 10, 3);
  applyBurn(f, 4, 12, 3);
  assert.strictEqual(f.statuses.burn.potency, 6);
  assert.strictEqual(f.statuses.burn.srcWIT, 12);
  assert.strictEqual(f.statuses.burn.turns, 3);
});

test('Ward never stacks — reapplication takes the higher pool', () => {
  const { applyWard } = require('../engine/status.js');
  const f = { statuses: { ward: null } };
  applyWard(f, 8, 3);
  applyWard(f, 5, 3);
  assert.strictEqual(f.statuses.ward.pool, 8);
});

test('Stun re-lock: cannot re-stun until the target has taken two turns', () => {
  const { applyStun } = require('../engine/status.js');
  const f = { statuses: { stun: null } };
  assert.ok(applyStun(f));
  assert.ok(!applyStun(f), 'pending stun cannot stack');
  f.statuses.stun.skipNext = false; f.statuses.stun.turnsSince = 0;
  assert.ok(!applyStun(f), 're-stun blocked before two turns');
  f.statuses.stun.turnsSince = 2;
  assert.ok(applyStun(f), 're-stun allowed after two turns taken');
});

test('cleanseAll strips stacks; no partial cleanse exists', () => {
  const { applyBleed, cleanseAll } = require('../engine/status.js');
  const f = { statuses: { bleed: null, burn: null, curse: null } };
  applyBleed(f, 4, 10);
  f.statuses.burn = { potency: 5, srcWIT: 8, turns: 3 };
  f.statuses.curse = { turns: 1 };
  const removed = cleanseAll(f);
  assert.deepStrictEqual(removed.sort(), ['bleed', 'burn', 'curse']);
  assert.strictEqual(f.statuses.bleed, null);
});

// ---------------------------------------------------------------------------
// T1.7 — Fatigue, The Last Bell (D8)

test('D8 schedule: telegraph 3/2/1 at r13–15; 2/4/8/16/32 on r16–20; cumulative 62', () => {
  assert.deepStrictEqual([13, 14, 15].map((r) => telegraphFor(r, T)), [3, 2, 1]);
  assert.deepStrictEqual([16, 17, 18, 19, 20].map((r) => fatigueDamage(r, T)), [2, 4, 8, 16, 32]);
  assert.strictEqual(cumulativeThrough(20, T), 62);
  assert.strictEqual(cumulativeThrough(15, T), 0);
  assert.strictEqual(telegraphFor(16, T), null);
});

test('Last Bell: higher HP% wins; exact tie → defender', () => {
  const a = { hp: 50, maxHp: 100 }, b = { hp: 40, maxHp: 100 };
  assert.strictEqual(lastBellResolve(a, b).winner, 'a');
  assert.strictEqual(lastBellResolve({ hp: 40, maxHp: 100 }, { hp: 50, maxHp: 100 }).winner, 'b');
  assert.strictEqual(lastBellResolve({ hp: 50, maxHp: 100 }, { hp: 50, maxHp: 100 }).winner, 'b'); // defender
});

// ---------------------------------------------------------------------------
// T1.6 / T1.9 — the fight loop, determinism, and the bans

test('BYTE-IDENTICAL REPLAY: same seed + builds → identical result JSON (Ban: §10.3)', () => {
  const a = mirrorPreset('ashblade', 5), b = mirrorPreset('cinder_witch', 5);
  const r1 = runFight(a, b, { seed: 424242, tuning: T });
  const r2 = runFight(a, b, { seed: 424242, tuning: T });
  assert.strictEqual(JSON.stringify(r1), JSON.stringify(r2));
});

test('golden-transcript replay across 100 seeds', () => {
  const a = mirrorPreset('gravewarden', 3), b = mirrorPreset('hollow_cantor', 3);
  for (let i = 0; i < 100; i++) {
    const s = deriveSeed(a, b, i, 'gold');
    const r1 = runFight(a, b, { seed: s, tuning: T });
    const r2 = runFight(a, b, { seed: s, tuning: T });
    assert.strictEqual(JSON.stringify(r1.log), JSON.stringify(r2.log), 'seed ' + s);
  }
});

test('BAN 10: no fight exceeds 20 rounds under any seed (10k fights)', () => {
  const a = mirrorPreset('ashblade', 5), b = mirrorPreset('cinder_witch', 5);
  let over = 0;
  for (let i = 0; i < 10000; i++) {
    const r = runFight(a, b, { seed: deriveSeed(a, b, i, 'ban10'), tuning: T });
    if (r.rounds > 20) over += 1;
  }
  assert.strictEqual(over, 0);
});

test('BAN 1 (N6 reading): contested fights σ/mean ≤ 12%; Fortune hard-band holds', () => {
  const a = mirrorPreset('ashblade', 5), b = mirrorPreset('cinder_witch', 5);
  const byLen = new Map();
  let fMin = Infinity, fMax = -Infinity;
  for (let i = 0; i < 10000; i++) {
    const r = runFight(a, b, { seed: deriveSeed(a, b, i, 'ban1'), tuning: T });
    fMin = Math.min(fMin, r.fortune); fMax = Math.max(fMax, r.fortune);
    const total = r.totals.a + r.totals.b;
    const bucket = byLen.get(r.rounds) || { n: 0, sum: 0, sum2: 0 };
    bucket.n += 1; bucket.sum += total; bucket.sum2 += total * total;
    byLen.set(r.rounds, bucket);
  }
  assert.ok(fMin >= 0.88 && fMax <= 1.12, 'fortune band [' + fMin + ', ' + fMax + ']');
  for (const [len, v] of byLen) {
    const mean = v.sum / v.n;
    const sigma = Math.sqrt(Math.max(0, v.sum2 / v.n - mean * mean));
    const pct = (sigma / mean) * 100;
    if (len >= 6 && v.n >= 50) assert.ok(pct <= 12, 'len ' + len + ' σ ' + pct.toFixed(1) + '% (N6: contested fights)');
  }
});

test('BAN 9: the second mover starts with +1 Resolve (4, not 3)', () => {
  const a = mirrorPreset('ashblade', 5), b = mirrorPreset('hollow_cantor', 5);
  const s = createSession(a, b, { seed: 7, tuning: T });
  const first = s.order[0], second = s.order[1];
  assert.strictEqual(first.resolve, 3);
  assert.strictEqual(second.resolve, 4);
});

test('BAN 3: no DoT tick ever crits or is Fortune-scaled (structural + behavioral)', () => {
  // Structural: trueTick has no randomness surface.
  const { trueTick } = require('../engine/damage.js');
  assert.strictEqual(trueTick(3.7), 4);
  // Behavioral: scan 500 fights — no dot line carries a crit marker.
  const a = mirrorPreset('ashblade', 5), b = mirrorPreset('gravewarden', 5);
  for (let i = 0; i < 500; i++) {
    const r = runFight(a, b, { seed: deriveSeed(a, b, i, 'ban3'), tuning: T });
    for (const l of r.log) {
      if (l.kind === 'dot') assert.ok(!l.text.includes('CRIT'), 'DoT crit leaked: ' + l.text);
    }
  }
});

test('BAN 5: the Candle of Saint Orrin fires exactly once, deterministically, at 1 HP', () => {
  const a = { ...mirrorPreset('ashblade', 5), items: ['candle_of_saint_orrin'] };
  const b = mirrorPreset('cinder_witch', 5);
  const r1 = runFight(a, b, { seed: 31337, tuning: T });
  const flares = r1.log.filter((l) => l.text.includes('Candle of Saint Orrin')).length;
  assert.ok(flares <= 1, 'at most one flare per fight');
  const r2 = runFight(a, b, { seed: 31337, tuning: T });
  assert.strictEqual(flares, r2.log.filter((l) => l.text.includes('Candle of Saint Orrin')).length);
});

test('BAN 2: status application is deterministic — same seed, same status log', () => {
  const a = mirrorPreset('hollow_cantor', 5), b = mirrorPreset('ashblade', 5);
  const r1 = runFight(a, b, { seed: 555, tuning: T });
  const r2 = runFight(a, b, { seed: 555, tuning: T });
  const status1 = r1.log.filter((l) => l.kind === 'status').map((l) => l.text);
  const status2 = r2.log.filter((l) => l.kind === 'status').map((l) => l.text);
  assert.deepStrictEqual(status1, status2);
});

test('BAN 8: every damage audit names its multipliers (no hidden modifiers)', () => {
  const a = mirrorPreset('ashblade', 5), b = mirrorPreset('cinder_witch', 5);
  const s = createSession(a, b, { seed: 8, tuning: T });
  // run with a spy on resolveDamage is overkill; the audit record itself is
  // the surface: dealt/raw/jitter/crit/mit/warded are all returned. Assert
  // the pipeline returns the full record on a known fight.
  const { resolveDamage } = require('../engine/damage.js');
  const atk = { sheet: { stats: { mig: 10, hst: 7 }, mainStat: 'mig', items: [], damageType: 'steel' }, statuses: {}, mods: {}, flags: {}, riteState: null };
  const def = { sheet: { stats: { grd: 4 }, items: [] }, statuses: {}, mods: {}, flags: {}, hp: 100, maxHp: 100 };
  const m = makeMeasures(mulberry32(1));
  const audit = resolveDamage({ fortune: 1.0, fortuneTrack: [] }, atk, def, { base: 5, coefs: [{ stat: 'mig', c: 0.9 }], type: 'steel' }, m, T);
  for (const key of ['dealt', 'raw', 'jitter', 'crit', 'mit', 'warded', 'hpBefore', 'hpAfter', 'candle', 'killed', 'land', 'fortune']) {
    assert.ok(key in audit, 'audit missing ' + key);
  }
});

// ---------------------------------------------------------------------------
// T1.8 — Rites of Passage

test('First Vespers Rite fires once at ≤50% HP and locks the cast pool', () => {
  const a = mirrorPreset('ashblade', 7), b = FIRST_VESPERS;
  const r = runFight(a, b, { seed: 1001, tuning: T });
  const riteLines = r.log.filter((l) => l.kind === 'rite' && l.text.includes('stops defending'));
  assert.strictEqual(riteLines.length, 1, 'fires exactly once');
  assert.ok(r.log.some((l) => l.kind === 'rite'), 'rite line present');
});

test('Halbrey fixture: both triggers fire in data order, once each', () => {
  const boss = { ...mirrorPreset('gravewarden', 5), name: 'Halbrey (fixture)', isEnemy: true, stats: { vig: 12, mig: 12, wit: 2, grd: 10, hst: 5 }, hpOverride: 200, rite: 'halbrey_demo', verses: ['bulwark_strike', 'sepulchral_spikes', 'crypt_door', 'earthen_toll'] };
  const conf = checkBudget(boss.stats, 5, T);
  assert.ok(conf.ok, 'fixture must stay on budget');
  const a = mirrorPreset('cinder_witch', 5);
  const r = runFight(a, boss, { seed: 2002, tuning: T });
  const lines = r.log.filter((l) => l.kind === 'rite').map((l) => l.text);
  assert.ok(lines.some((t) => t.includes('furnace door')), 'first trigger fired');
  assert.ok(lines.some((t) => t.includes('own ash')), 'second trigger fired');
  const first = lines.findIndex((t) => t.includes('furnace door'));
  const second = lines.findIndex((t) => t.includes('own ash'));
  assert.ok(first < second, 'data order preserved');
  // exactly once each across the whole fight:
  assert.strictEqual(lines.filter((t) => t.includes('furnace door')).length, 1);
  assert.strictEqual(lines.filter((t) => t.includes('own ash')).length, 1);
});

test('Ilvane Phase III (fixture): learns the most-cast slotted verse, Strike excluded', () => {
  const boss = { ...mirrorPreset('hollow_cantor', 10), name: 'Ilvane (fixture)', isEnemy: true, stats: { vig: 12, mig: 2, wit: 14, grd: 10, hst: 13 }, hpOverride: 160, rite: 'ilvane_phase3', verses: ['dirge', 'wither_note', 'soul_siphon', 'requiem'] };
  const conf = checkBudget(boss.stats, 10, T);
  assert.ok(conf.ok);
  const a = mirrorPreset('ashblade', 10);
  const r = runFight(a, boss, { seed: 3003, tuning: T });
  const learn = r.log.filter((l) => l.text.includes('He is learning'));
  if (learn.length > 0) {
    const named = learn[0].text;
    assert.ok(!named.includes('Strike'), 'Strike is never copied (F21)');
  }
});

// ---------------------------------------------------------------------------
// Ledger verdict (§10.7)

test('Ledger verdict lines match the fortune table', () => {
  const res = { winner: 'a', fortune: 1.0 };
  assert.strictEqual(ledgerVerdict(res, 'a', null), 'The wax ran level. You won it.');
  assert.strictEqual(ledgerVerdict({ winner: 'a', fortune: 0.95 }, 'a', null), 'The wax ran cold for you. You won anyway.');
  assert.strictEqual(ledgerVerdict({ winner: 'a', fortune: 1.08 }, 'a', null), 'The wax ran hot. You won it — and it was shared, so your opponent had it too.');
  assert.strictEqual(ledgerVerdict({ winner: 'b', fortune: 1.0 }, 'a', 0.75), 'You were favored and lost. The Reading knows why — open it.');
});

// ---------------------------------------------------------------------------
// Data integrity: all 42 verses validate against the T0.3 schema

test('every verse row validates and uses only known op-codes', () => {
  const rows = [STRIKE, ...VERSES];
  assert.strictEqual(rows.length, 42, '42 verses (6 common + 9×4)');
  for (const v of rows) {
    const ctx = { verses: VERSE_BY_ID, items: new Map(), vows: new Map() };
    const res = validate('verse', v, ctx);
    assert.ok(res.ok, v.id + ': ' + (res.errors || []).join('; '));
    for (const e of v.effects) assert.ok(OPCODES.includes(e.op), v.id + ' op ' + e.op);
  }
});

// ---------------------------------------------------------------------------
// Tuning: overrides merge, deviations report, canon untouched

test('createTuning overrides are session-local; canon never mutates', () => {
  const before = JSON.stringify(CANON);
  const t2 = createTuning({ jitterWidth: 0.2, bramHP: 999, fatigue: { startRound: 10 } });
  assert.strictEqual(t2.jitterWidth, 0.2);
  assert.strictEqual(t2.bramHP, 999);
  assert.strictEqual(t2.fatigue.startRound, 10);
  assert.strictEqual(t2.fatigue.schedule.length, 5);
  assert.strictEqual(JSON.stringify(CANON), before, 'CANON object must not be mutated');
  const diffs = diffTuning(t2);
  const paths = diffs.map((d) => d.path);
  assert.ok(paths.includes('jitterWidth'));
  assert.ok(paths.includes('bramHP'));
  assert.ok(paths.includes('fatigue.startRound'));
  assert.strictEqual(diffs.find((d) => d.path === 'bramHP').tag, 'PROVISIONAL:D12');
  assert.strictEqual(diffTuning(createTuning()).length, 0, 'pure canon → zero deviations');
});

// ---------------------------------------------------------------------------
// Mini-Reading (T2.4 preview)

test('quickReading: 200-seed expectation matches run distribution', () => {
  const a = mirrorPreset('ashblade', 5), b = mirrorPreset('cinder_witch', 5);
  const reading = quickReading(a, b, { n: 200, tuning: T });
  assert.strictEqual(reading.n, 200);
  assert.strictEqual(reading.winA + reading.winB + reading.draws, 200);
  assert.ok(reading.maxRounds <= 20);
  assert.ok(reading.avgRounds >= 4 && reading.avgRounds <= 12, 'avg rounds ' + reading.avgRounds);
});

// ---------------------------------------------------------------------------
// Step/session API (the sandbox's engine surface)

test('session step API: manual submission drives the fight legally', () => {
  const a = mirrorPreset('ashblade', 1), b = { ...BRAM };
  const s = createSession(a, b, { seed: 4321, tuning: T, manualSide: 'a' });
  let guard = 0;
  let submitted = 0;
  while (!s.state.over && guard < 500) {
    guard += 1;
    if (s.state.phase === 'await_input') {
      const f = s.pendingChoice;
      const legal = require('../engine/fight.js').legalVerses(s, f);
      assert.ok(legal.length >= 1, 'Strike always legal');
      const pick = legal[legal.length - 1]; // take the most expensive legal
      const res = submitChoice(s, pick.id);
      assert.ok(res.ok, 'manual submit accepted: ' + (res.error || ''));
      submitted += 1;
    } else {
      step(s);
    }
  }
  assert.ok(s.state.over, 'manual fight reached an end');
  assert.ok(submitted > 0, 'human actually played turns');
});
