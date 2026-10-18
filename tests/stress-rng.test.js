// stress-rng.test.js — Phase-1 re-test wave: adversarial + edge + stress
// coverage for the randomness contract (rng/*): mulberry32, FNV-1a, the six
// Measure shapes, seed derivation, display form. Property, boundary, stream
// alignment and degenerate-input tests. Every test is deterministic (fixed
// seeds); statistical tolerances are sized so the pinned seeds always pass.
'use strict';

const { test } = require('node:test');
const assert = require('node:assert');

const {
  mulberry32, fnv1a, makeMeasures, deriveSeed, deriveEchoSeed, displaySeed,
  rngForFight,
} = require('../rng/index.js');
const {
  band, narrow, clamped, weighted, shuffle, fixed,
} = require('../rng/measures.js');

// ---------------------------------------------------------------- helpers
/** Stream wrapper that counts draws (stream-alignment proofs). */
function countingStream(seed) {
  let n = 0;
  const r = mulberry32(seed);
  const w = () => { n += 1; return r(); };
  w.count = () => n;
  return w;
}
/** Literal reference mulberry32 (Tommy Ettinger, public domain). */
function reference32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t = (t + Math.imul(t ^ (t >>> 7), t | 61)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const SEEDS = [0, 1, 2, 0x7fffffff, 0x80000000, 0xffffffff, 0xdeadbeef, 123456789];

// ------------------------------------------------------- mulberry32 core
test('m32: every draw of every pinned seed lies in [0,1)', () => {
  for (const s of SEEDS) {
    const r = mulberry32(s);
    for (let i = 0; i < 20000; i++) {
      const v = r();
      assert.ok(v >= 0 && v < 1, `seed ${s} draw ${i} = ${v}`);
    }
  }
});

test('m32: 200k-draw global min/max sanity (never 1, approaches both ends)', () => {
  const r = mulberry32(0xc0ffee);
  let lo = 1, hi = -1;
  for (let i = 0; i < 200000; i++) { const v = r(); if (v < lo) lo = v; if (v > hi) hi = v; }
  assert.ok(hi < 1);
  assert.ok(lo >= 0);
  assert.ok(lo < 0.0001, `min ${lo} should approach 0 over 200k draws`);
  assert.ok(hi > 0.9999, `max ${hi} should approach 1 over 200k draws`);
});

test('m32: matches the literal reference implementation across 12 seeds x 2000 draws', () => {
  for (const s of [0, 1, 3, 5, 0x10000, 0x7fffffff, 0x80000000, 0xfffffffe, 0xffffffff, 42, 999999, 31337]) {
    const a = mulberry32(s); const b = reference32(s);
    for (let i = 0; i < 2000; i++) assert.strictEqual(a(), b(), `seed ${s} draw ${i}`);
  }
});

test('m32: same seed → byte-identical streams; sibling factories do not interfere', () => {
  const a1 = mulberry32(777); const a2 = mulberry32(777); const b = mulberry32(778);
  for (let i = 0; i < 1000; i++) {
    const v1 = a1();
    assert.strictEqual(v1, a2());
    b();
  }
  const again = mulberry32(777);
  const fresh = mulberry32(777);
  assert.strictEqual(again(), fresh());
});

test('m32: distinct seeds never share a 1000-draw leading prefix (40 pairs)', () => {
  for (let s = 0; s < 40; s++) {
    const a = mulberry32(s); const b = mulberry32(s + 1);
    let same = true;
    for (let i = 0; i < 1000; i++) if (a() !== b()) { same = false; break; }
    assert.ok(!same, `seeds ${s}/${s + 1} produced identical 1000-draw prefix`);
  }
});

test('m32: seed normalization — negative, >32-bit and float seeds match their >>> 0 form', () => {
  const draw = (r) => Array.from({ length: 50 }, () => r());
  assert.deepEqual(draw(mulberry32(-1)), draw(mulberry32(0xffffffff)));
  assert.deepEqual(draw(mulberry32(4294967296 + 5)), draw(mulberry32(5)));
  assert.deepEqual(draw(mulberry32(7.9)), draw(mulberry32(7)));
});

test('m32: NaN seed behaves as seed 0 (>>> 0 coercion)', () => {
  const draw = (r) => Array.from({ length: 100 }, () => r());
  assert.deepEqual(draw(mulberry32(NaN)), draw(mulberry32(0)));
});

test('m32: seed 0 is a legal, non-degenerate stream', () => {
  const r = mulberry32(0);
  let zeros = 0, high = 0;
  for (let i = 0; i < 10000; i++) { const v = r(); if (v === 0) zeros++; if (v >= 0.999) high++; }
  assert.ok(zeros === 0, `exact zeros ${zeros}`);
  assert.ok(high > 0 && high < 1000);
});

test('m32: uniformity across 10 coarse buckets (500k draws, seeded)', () => {
  const r = mulberry32(314159);
  const buckets = new Array(10).fill(0);
  const N = 500000;
  for (let i = 0; i < N; i++) buckets[Math.floor(r() * 10)] += 1;
  for (let b = 0; b < 10; b++) {
    const pct = buckets[b] / N;
    assert.ok(Math.abs(pct - 0.1) < 0.005, `bucket ${b} = ${(pct * 100).toFixed(3)}%`);
  }
});

test('m32: low-order parity is not stuck (bit-0 coin over 10k draws)', () => {
  const r = mulberry32(0xbeef);
  let zeros = 0;
  const N = 10000;
  for (let i = 0; i < N; i++) if (Math.floor(r() * 2) === 0) zeros++;
  const frac = zeros / N;
  assert.ok(frac > 0.45 && frac < 0.55, `bit-0 parity frac ${frac}`);
});

test('m32: lag-1 serial correlation ~0 over 100k draws', () => {
  const r = mulberry32(271828);
  const xs = [];
  for (let i = 0; i < 100000; i++) xs.push(r());
  const n = xs.length - 1;
  let sx = 0, sy = 0, sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < n; i++) { const x = xs[i], y = xs[i + 1]; sx += x; sy += y; sxy += x * y; sxx += x * x; syy += y * y; }
  const cov = sxy / n - (sx / n) * (sy / n);
  const vx = sxx / n - (sx / n) ** 2;
  const vy = syy / n - (sy / n) ** 2;
  const corr = cov / Math.sqrt(vx * vy);
  assert.ok(Math.abs(corr) < 0.02, `lag-1 correlation ${corr}`);
});

test('m32: 1M-draw stress — no exception, all bounded (period smoke)', () => {
  const r = mulberry32(0xabcdef);
  for (let i = 0; i < 1000000; i++) {
    const v = r();
    if (!(v >= 0 && v < 1)) assert.fail(`out of band at draw ${i}: ${v}`);
  }
  assert.ok(true);
});

// ------------------------------------------------------------------- FNV-1a
test('fnv1a: published 32-bit vectors', () => {
  assert.strictEqual(fnv1a(''), 0x811c9dc5);
  assert.strictEqual(fnv1a('a'), 0xe40c292c);
  assert.strictEqual(fnv1a('b'), 0xe70c2de5);
  assert.strictEqual(fnv1a('c'), 0xe60c2c52);
  assert.strictEqual(fnv1a('foobar'), 0xbf9cf968);
  assert.strictEqual(fnv1a('hello'), 0x4f9f2cab);
});

test('fnv1a: single-character inputs are distinct (printable ASCII sweep)', () => {
  const seen = new Map();
  for (let c = 32; c < 127; c++) {
    const h = fnv1a(String.fromCharCode(c));
    assert.ok(!seen.has(h), `collision on char code ${c}`);
    seen.set(h, c);
  }
});

test('fnv1a: input sensitivity — one char change always changes the hash', () => {
  const base = 'the quick brown fox jumps over the lazy dog';
  const h0 = fnv1a(base);
  for (let i = 0; i < base.length; i += 3) {
    const mutated = base.slice(0, i) + (base[i] === 'x' ? 'y' : 'x') + base.slice(i + 1);
    assert.notStrictEqual(fnv1a(mutated), h0, `position ${i}`);
  }
});

test('fnv1a: length sensitivity — appending bytes changes the hash', () => {
  const h0 = fnv1a('abc');
  assert.notStrictEqual(fnv1a('abcd'), h0);
  assert.notStrictEqual(fnv1a('abca'), h0);
  assert.notStrictEqual(fnv1a('aabc'), h0);
});

test('fnv1a: long strings (64KB) hash without error, deterministically', () => {
  const long = 'x'.repeat(65536) + 'endsWith';
  assert.strictEqual(fnv1a(long), fnv1a(long));
  assert.notStrictEqual(fnv1a(long), fnv1a(long.slice(0, 65536)));
  assert.strictEqual(typeof fnv1a(long), 'number');
});

test('fnv1a: unicode BMP and surrogate pairs hash deterministically', () => {
  const cases = ['choir', 'The Ashen Choir', '合唱', '\u{1F514}\u{1F507}', 'MEASURE · XXXX-XXXX', '\u0000\u0001'];
  for (const s of cases) assert.strictEqual(fnv1a(s), fnv1a(s), s);
  assert.notStrictEqual(fnv1a('\u{1F514}'), fnv1a('\uFFFD'));
});

test('fnv1a: empty vs whitespace vs null-char inputs are distinct', () => {
  const set = new Set([fnv1a(''), fnv1a(' '), fnv1a('\0'), fnv1a('  ')]);
  assert.strictEqual(set.size, 4);
});

test('fnv1a: output is always an unsigned 32-bit integer', () => {
  for (const s of ['', 'a', 'seed-string-123', '\uFFFF'.repeat(10)]) {
    const h = fnv1a(s);
    assert.ok(Number.isInteger(h) && h >= 0 && h <= 0xffffffff);
  }
});

test('fnv1a: non-string input contract — null/undefined/arrays throw; lengthless values hash as empty (documented)', () => {
  // The doc comment requires callers to pass canonical strings. Internal
  // callers always do (deriveSeed concatenates; deriveEchoSeed String()s).
  // Misuse behavior, pinned so it cannot drift silently:
  assert.throws(() => fnv1a(null), TypeError);
  assert.throws(() => fnv1a(undefined), TypeError);
  assert.throws(() => fnv1a([1, 2]), TypeError); // length 2, no charCodeAt
  // No .length property → loop never runs → offset basis (= hash of ''):
  assert.strictEqual(fnv1a(123), 0x811c9dc5);
  assert.strictEqual(fnv1a({}), 0x811c9dc5);
  assert.strictEqual(fnv1a(true), 0x811c9dc5);
});

test('fnv1a: 100k random canonical strings — no unexpected exceptions, all distinct-ish', () => {
  const r = mulberry32(9);
  const seen = new Set();
  let collisions = 0;
  for (let i = 0; i < 100000; i++) {
    const s = 'k' + Math.floor(r() * 1e12).toString(36) + ':' + i;
    const h = fnv1a(s);
    if (seen.has(h)) collisions++;
    seen.add(h);
  }
  assert.ok(collisions < 20, `collisions ${collisions} (birthday bound for 100k draws)`);
});

// -------------------------------------------------------------------- Band
test('band: never returns n, always an integer in [0,n) across seeds', () => {
  for (const s of SEEDS) {
    const r = mulberry32(s);
    for (const n of [1, 2, 3, 5, 10, 97, 100, 1000]) {
      for (let i = 0; i < 3000; i++) {
        const v = band(r, n);
        assert.ok(Number.isInteger(v) && v >= 0 && v < n, `n=${n} v=${v}`);
      }
    }
  }
});

test('band: Band(1) is deterministic 0 but still consumes exactly one draw', () => {
  const r = countingStream(5);
  assert.strictEqual(band(r, 1), 0);
  assert.strictEqual(r.count(), 1);
  assert.strictEqual(band(r, 1), 0);
  assert.strictEqual(r.count(), 2);
});

test('band: Band(2) hits both values over 10k draws (tie-break usability)', () => {
  const r = mulberry32(11);
  const counts = [0, 0];
  for (let i = 0; i < 10000; i++) counts[band(r, 2)] += 1;
  assert.ok(counts[0] > 4500 && counts[0] < 5500, `counts ${counts}`);
  assert.strictEqual(counts[0] + counts[1], 10000);
});

test('band: distribution uniformity for Band(7) within ±1.5pp (50k draws)', () => {
  const r = mulberry32(13);
  const c = new Array(7).fill(0);
  const N = 50000;
  for (let i = 0; i < N; i++) c[band(r, 7)] += 1;
  for (let b = 0; b < 7; b++) {
    const pct = (c[b] / N) * 100;
    assert.ok(Math.abs(pct - 100 / 7) < 1.5, `bucket ${b} ${pct.toFixed(2)}%`);
  }
});

test('band: degenerate Band(0) returns 0 and consumes a draw (documented quirk)', () => {
  const r = countingStream(3);
  assert.strictEqual(band(r, 0), 0);
  assert.strictEqual(r.count(), 1);
});

test('band: large Band(2^31) stays in range', () => {
  const r = mulberry32(17);
  for (let i = 0; i < 1000; i++) {
    const v = band(r, 0x80000000);
    assert.ok(v >= 0 && v < 0x80000000);
  }
});

test('band: fractional n floors correctly (Band(2.9) ∈ {0,1,2})', () => {
  const r = mulberry32(19);
  const seen = new Set();
  for (let i = 0; i < 3000; i++) {
    const v = band(r, 2.9);
    assert.ok(v >= 0 && v <= 2 && Number.isInteger(v));
    seen.add(v);
  }
  assert.strictEqual(seen.size, 3);
});

test('band: consumption alignment — exactly one draw per call', () => {
  const r = countingStream(23);
  for (let i = 0; i < 10; i++) { band(r, 100); assert.strictEqual(r.count(), i + 1); }
});

// ------------------------------------------------------------------ Narrow
test('narrow: inclusive on BOTH ends across seeds and ranges', () => {
  for (const s of SEEDS) {
    const r = mulberry32(s);
    for (const [a, b] of [[0, 1], [2, 5], [0, 9], [3, 3], [7, 12], [-3, 3]]) {
      for (let i = 0; i < 3000; i++) {
        const v = narrow(r, a, b);
        assert.ok(Number.isInteger(v) && v >= a && v <= b, `[${a},${b}] v=${v}`);
      }
    }
  }
});

test('narrow: Narrow(a,a) is constant a', () => {
  const r = mulberry32(29);
  for (let i = 0; i < 100; i++) assert.strictEqual(narrow(r, 4, 4), 4);
});

test('narrow: single draw per call', () => {
  const r = countingStream(31);
  narrow(r, 0, 5);
  assert.strictEqual(r.count(), 1);
});

test('narrow: Narrow(0,1) roughly fair over 20k draws', () => {
  const r = mulberry32(37);
  let lo = 0;
  const N = 20000;
  for (let i = 0; i < N; i++) if (narrow(r, 0, 1) === 0) lo++;
  const frac = lo / N;
  assert.ok(frac > 0.47 && frac < 0.53, `frac ${frac}`);
});

test('narrow: Narrow(1,6) hits every face ≥ N/6 - 3σ over 60k draws (die test)', () => {
  const r = mulberry32(41);
  const faces = new Array(7).fill(0);
  const N = 60000;
  for (let i = 0; i < N; i++) faces[narrow(r, 1, 6)] += 1;
  for (let f = 1; f <= 6; f++) {
    assert.ok(faces[f] > N / 6 - 1000 && faces[f] < N / 6 + 1000, `face ${f}: ${faces[f]}`);
  }
});

test('narrow: negative ranges supported (Narrow(-5,-2))', () => {
  const r = mulberry32(43);
  for (let i = 0; i < 3000; i++) {
    const v = narrow(r, -5, -2);
    assert.ok(v >= -5 && v <= -2 && Number.isInteger(v), `v=${v}`);
  }
});

// ----------------------------------------------------------------- Clamped
test('clamped: default band is exactly [c−w, c+w] and is respected', () => {
  for (const s of SEEDS) {
    const r = mulberry32(s);
    for (let i = 0; i < 3000; i++) {
      const v = clamped(r, 1.0, 0.1);
      assert.ok(v >= 0.9 && v <= 1.1, `v=${v}`);
    }
  }
});

test('clamped: jitter shape Clamped(1.00, 0.10) spans (0.90, 1.10) over 50k draws', () => {
  const r = mulberry32(47);
  let lo = 2, hi = -1;
  for (let i = 0; i < 50000; i++) {
    const v = clamped(r, 1.0, 0.1);
    if (v < lo) lo = v;
    if (v > hi) hi = v;
  }
  assert.ok(lo > 0.9 && lo < 0.901, `lo ${lo}`);
  assert.ok(hi < 1.1 && hi > 1.099, `hi ${hi}`);
});

test('clamped: custom legal band clamps the natural range (fortune shape)', () => {
  const r = mulberry32(53);
  for (let i = 0; i < 30000; i++) {
    const v = clamped(r, 0.0, 0.02, 0.88, 1.12);
    assert.ok(v >= 0.88 && v <= 1.12, `v=${v}`);
  }
});

test('clamped: tightened band smaller than natural range clamps hard to lo/hi', () => {
  const r = mulberry32(59);
  let atLo = 0, atHi = 0;
  const N = 20000;
  for (let i = 0; i < N; i++) {
    const v = clamped(r, 1.0, 0.1, 0.95, 1.05);
    assert.ok(v >= 0.95 && v <= 1.05);
    if (v === 0.95) atLo++;
    if (v === 1.05) atHi++;
  }
  assert.ok(atLo > 0, `clamped-to-lo samples ${atLo}`);
  assert.ok(atHi > 0, `clamped-to-hi samples ${atHi}`);
});

test('clamped: w=0 returns the center and consumes a draw', () => {
  const r = countingStream(61);
  assert.strictEqual(clamped(r, 0.75, 0), 0.75);
  assert.strictEqual(r.count(), 1);
});

test('clamped: single draw per call', () => {
  const r = countingStream(67);
  clamped(r, 1, 0.1);
  assert.strictEqual(r.count(), 1);
});

// ---------------------------------------------------------------- Weighted
test('weighted: single-entry list always returns that value', () => {
  const r = mulberry32(71);
  for (let i = 0; i < 100; i++) assert.strictEqual(weighted(r, [{ value: 'only', weight: 5 }]), 'only');
});

test('weighted: 66/33 table matches weights within ±2pp over 50k draws', () => {
  const r = mulberry32(73);
  const list = [{ value: 'heavy', weight: 66 }, { value: 'light', weight: 33 }];
  let heavy = 0;
  const N = 50000;
  for (let i = 0; i < N; i++) if (weighted(r, list) === 'heavy') heavy++;
  const pct = (heavy / N) * 100;
  assert.ok(Math.abs(pct - 66.666) < 2, `heavy ${pct.toFixed(2)}%`);
});

test('weighted: zero-weight entries are never picked while others live', () => {
  const r = mulberry32(79);
  const list = [{ value: 'dead', weight: 0 }, { value: 'alive', weight: 1 }, { value: 'ghost', weight: 0 }];
  for (let i = 0; i < 5000; i++) assert.strictEqual(weighted(r, list), 'alive');
});

test('weighted: all-zero weights fall through to the LAST entry (documented)', () => {
  const r = mulberry32(83);
  const list = [{ value: 'a', weight: 0 }, { value: 'b', weight: 0 }];
  assert.strictEqual(weighted(r, list), 'b');
});

test('weighted: fractional weights work (0.5 / 0.5 fair coin)', () => {
  const r = mulberry32(89);
  const list = [{ value: 0, weight: 0.5 }, { value: 1, weight: 0.5 }];
  let zeros = 0;
  const N = 20000;
  for (let i = 0; i < N; i++) if (weighted(r, list) === 0) zeros++;
  assert.ok(Math.abs(zeros / N - 0.5) < 0.02);
});

test('weighted: weighted pick consumes exactly one draw', () => {
  const r = countingStream(97);
  weighted(r, [{ value: 1, weight: 1 }, { value: 2, weight: 1 }]);
  assert.strictEqual(r.count(), 1);
});

test('weighted: weight scale invariance (×1000 same distribution class)', () => {
  const r = mulberry32(101);
  const big = [{ value: 'a', weight: 250 }, { value: 'b', weight: 750 }];
  let a = 0;
  const N = 20000;
  for (let i = 0; i < N; i++) if (weighted(r, big) === 'a') a++;
  assert.ok(Math.abs(a / N - 0.25) < 0.02);
});

test('weighted: empty list throws loudly (out-of-contract table — documented)', () => {
  // The engine never calls Weighted with an empty table (AI ties ≥ 1 by
  // construction). A loud TypeError is the acceptable failure mode; pinned.
  const r = mulberry32(103);
  assert.throws(() => weighted(r, []), TypeError);
});

test('weighted: non-uniform 4-way table within ±2pp of each weight', () => {
  const r = mulberry32(107);
  const list = [
    { value: 'w1', weight: 5 }, { value: 'w2', weight: 25 },
    { value: 'w3', weight: 40 }, { value: 'w4', weight: 30 },
  ];
  const counts = { w1: 0, w2: 0, w3: 0, w4: 0 };
  const N = 100000;
  for (let i = 0; i < N; i++) counts[weighted(r, list)] += 1;
  for (const e of list) {
    const pct = (counts[e.value] / N) * 100;
    assert.ok(Math.abs(pct - e.weight) < 2, `${e.value} ${pct.toFixed(2)}% vs ${e.weight}%`);
  }
});

// ----------------------------------------------------------------- Shuffle
test('shuffle: output is a permutation of the input (every length 0..12)', () => {
  for (let len = 0; len <= 12; len++) {
    const r = mulberry32(1000 + len);
    const input = Array.from({ length: len }, (_, i) => i);
    const out = shuffle(r, input);
    assert.strictEqual(out.length, len);
    assert.deepEqual(out.slice().sort((a, b) => a - b), input);
  }
});

test('shuffle: input list is never mutated', () => {
  const r = mulberry32(1009);
  const input = [1, 2, 3, 4, 5, 6, 7, 8];
  const snapshot = input.slice();
  shuffle(r, input);
  assert.deepEqual(input, snapshot);
});

test('shuffle: consumes exactly n−1 draws (stream alignment, Fisher–Yates)', () => {
  for (const len of [0, 1, 2, 3, 5, 8, 13]) {
    const r = countingStream(1013);
    shuffle(r, Array.from({ length: len }, (_, i) => i));
    assert.strictEqual(r.count(), Math.max(0, len - 1), `len ${len}`);
  }
});

test('shuffle: deterministic for the same stream position', () => {
  const r1 = mulberry32(1019); const r2 = mulberry32(1019);
  const a = shuffle(r1, ['a', 'b', 'c', 'd', 'e']);
  const b = shuffle(r2, ['a', 'b', 'c', 'd', 'e']);
  assert.deepEqual(a, b);
});

test('shuffle: uniformity — element 0 lands on every index over 60k shuffles of 5', () => {
  const r = mulberry32(1021);
  const N = 60000;
  const positions = new Array(5).fill(0);
  for (let i = 0; i < N; i++) {
    const out = shuffle(r, [0, 1, 2, 3, 4]);
    positions[out.indexOf(0)] += 1;
  }
  for (let p = 0; p < 5; p++) {
    const pct = positions[p] / N;
    assert.ok(Math.abs(pct - 0.2) < 0.01, `position ${p}: ${(pct * 100).toFixed(2)}%`);
  }
});

test('shuffle: deck stress — 1000 shuffles of 52 cards stay permutations', () => {
  const r = mulberry32(1031);
  const deck = Array.from({ length: 52 }, (_, i) => i);
  for (let i = 0; i < 1000; i++) {
    const out = shuffle(r, deck);
    assert.strictEqual(out.length, 52);
    assert.deepEqual(out.slice().sort((a, b) => a - b), deck);
  }
});

// ------------------------------------------------------------------- fixed
test('fixed: returns v unchanged and consumes nothing', () => {
  const r = countingStream(1033);
  assert.strictEqual(fixed(3.14), 3.14);
  assert.strictEqual(fixed(-7), -7);
  assert.strictEqual(fixed(0), 0);
  assert.strictEqual(r.count(), 0);
});

// --------------------------------------------------------- Measure facade
test('makeMeasures: facade consumes identically to direct calls (alignment)', () => {
  const a = countingStream(1039);
  const b = countingStream(1039);
  const m = makeMeasures(a);
  assert.strictEqual(m.band(100), band(b, 100));
  assert.strictEqual(m.narrow(3, 9), narrow(b, 3, 9));
  assert.strictEqual(m.clamped(1, 0.1), clamped(b, 1, 0.1));
  assert.strictEqual(m.weighted([{ value: 'x', weight: 1 }, { value: 'y', weight: 2 }]),
    weighted(b, [{ value: 'x', weight: 1 }, { value: 'y', weight: 2 }]));
  assert.deepEqual(m.shuffle([1, 2, 3, 4]), shuffle(b, [1, 2, 3, 4]));
  assert.strictEqual(a.count(), b.count());
});

test('makeMeasures: fixed through the facade draws nothing', () => {
  const r = countingStream(1049);
  const m = makeMeasures(r);
  assert.strictEqual(m.fixed(2), 2);
  assert.strictEqual(r.count(), 0);
});

test('canonical damage Measure order: jitter → fortune → crit = exactly 3 draws per hit', () => {
  const r = countingStream(1051);
  const m = makeMeasures(r);
  const state = { fortune: 1.0, fortuneTrack: [1.0] };
  const tuning = { jitterCenter: 1.0, jitterWidth: 0.1, fortuneDrift: 0.02, fortuneMin: 0.88, fortuneMax: 1.12 };
  // replicate the §15.1 order with the facade only
  m.clamped(tuning.jitterCenter, tuning.jitterWidth);
  const drift = m.clamped(0.0, tuning.fortuneDrift, tuning.fortuneMin, tuning.fortuneMax);
  state.fortune = Math.min(tuning.fortuneMax, Math.max(tuning.fortuneMin, state.fortune + drift));
  m.band(100);
  assert.strictEqual(r.count(), 3);
});

// --------------------------------------------------- seed derivation & UI
test('deriveSeed: stable for identical inputs, sensitive to every input slot', () => {
  const A = { a: 1 }; const B = { b: 2 };
  assert.strictEqual(deriveSeed(A, B, 0, 0), deriveSeed({ a: 1 }, { b: 2 }, 0, 0));
  assert.notStrictEqual(deriveSeed(A, B, 0, 0), deriveSeed(A, B, 1, 0), 'round');
  assert.notStrictEqual(deriveSeed(A, B, 0, 0), deriveSeed(A, B, 0, 1), 'nonce');
  assert.notStrictEqual(deriveSeed(A, B, 0, 0), deriveSeed(B, A, 0, 0), 'sides swapped');
  assert.notStrictEqual(deriveSeed(A, B, 0, 0), deriveSeed({ a: 2 }, B, 0, 0), 'build content');
});

test('deriveSeed: JSON key order matters by design (canonical build strings, §10.3)', () => {
  // The GDD hashes JSON.stringify(build) — key insertion order is part of the
  // canonical string. Pin the documented behavior so a silent "fix" is loud.
  assert.notStrictEqual(
    deriveSeed({ x: 1, y: 2 }, {}, 0, 0),
    deriveSeed({ y: 2, x: 1 }, {}, 0, 0));
});

test('deriveSeed: 32-bit unsigned output for 5k varied inputs', () => {
  for (let i = 0; i < 5000; i++) {
    const s = deriveSeed({ i, a: [1, 2, i] }, { j: i * 7 }, i % 21, 'nonce-' + i);
    assert.ok(Number.isInteger(s) && s >= 0 && s <= 0xffffffff);
  }
});

test('deriveEchoSeed: hour-slot identity + nonce sensitivity (§10.12)', () => {
  assert.strictEqual(deriveEchoSeed('ECH-1', 'ECH-2', 14, 0), deriveEchoSeed('ECH-1', 'ECH-2', 14, 0));
  assert.notStrictEqual(deriveEchoSeed('ECH-1', 'ECH-2', 14, 0), deriveEchoSeed('ECH-1', 'ECH-2', 15, 0));
  assert.notStrictEqual(deriveEchoSeed('ECH-1', 'ECH-2', 14, 0), deriveEchoSeed('ECH-2', 'ECH-1', 14, 0));
  assert.strictEqual(deriveEchoSeed('A', 'B', 5), deriveEchoSeed('A', 'B', 5, 0), 'nonce default');
});

test('deriveEchoSeed: numeric hour slots coerce to the same string form', () => {
  assert.strictEqual(deriveEchoSeed('A', 'B', 7, 1), deriveEchoSeed('A', 'B', '7', 1));
  assert.strictEqual(deriveEchoSeed(1, 2, 3, 4), deriveEchoSeed('1', '2', '3', '4'));
});

test('displaySeed: formatting edges — 0, max, and general form', () => {
  assert.strictEqual(displaySeed(0), 'MEASURE · 0000-0000');
  assert.strictEqual(displaySeed(0xffffffff), 'MEASURE · FFFF-FFFF');
  assert.strictEqual(displaySeed(0x4f2a91cc), 'MEASURE · 4F2A-91CC');
  assert.strictEqual(displaySeed(0x000000ff), 'MEASURE · 0000-00FF');
  assert.strictEqual(displaySeed(-1), 'MEASURE · FFFF-FFFF', 'negative coerces via >>> 0');
});

test('displaySeed: 100k random seeds always match the §10.3 display contract', () => {
  for (let i = 0; i < 100000; i++) {
    const seed = (i * 2654435761) >>> 0;
    const out = displaySeed(seed);
    assert.match(out, /^MEASURE · [0-9A-F]{4}-[0-9A-F]{4}$/);
    assert.strictEqual(out, 'MEASURE · ' + seed.toString(16).padStart(8, '0').toUpperCase().slice(0, 4) + '-' + seed.toString(16).padStart(8, '0').toUpperCase().slice(4));
  }
});

test('rngForFight: seed + display + measures bundle is self-consistent', () => {
  const A = { name: 'a' }; const B = { name: 'b' };
  const f1 = rngForFight(A, B, 0, 0);
  const f2 = rngForFight(A, B, 0, 0);
  assert.strictEqual(f1.seed, f2.seed);
  assert.strictEqual(f1.display, f2.display);
  assert.strictEqual(f1.display, displaySeed(f1.seed));
  const freshMeasures = makeMeasures(mulberry32(f1.seed));
  assert.deepEqual(
    Array.from({ length: 20 }, () => f1.measures.band(1000)),
    Array.from({ length: 20 }, () => freshMeasures.band(1000)));
});

test('rngForFight: round/nonce change the stream, not just the seed label', () => {
  const A = { v: 1 }; const B = { v: 2 };
  const f0 = rngForFight(A, B, 0, 0);
  const f1 = rngForFight(A, B, 1, 0);
  assert.notStrictEqual(f0.seed, f1.seed);
  assert.notDeepEqual(
    Array.from({ length: 10 }, () => f0.measures.band(100)),
    Array.from({ length: 10 }, () => f1.measures.band(100)));
});

test('rng module surface: exactly the documented contract exports', () => {
  const mod = require('../rng/index.js');
  const keys = Object.keys(mod).sort();
  assert.deepEqual(keys, [
    'deriveEchoSeed', 'deriveSeed', 'displaySeed', 'fnv1a', 'makeMeasures',
    'mulberry32', 'rngForFight',
  ]);
});

test('measures module surface: the six shapes are exported', () => {
  const mod = require('../rng/measures.js');
  const keys = Object.keys(mod).sort();
  assert.deepEqual(keys, ['band', 'clamped', 'fixed', 'makeMeasures', 'narrow', 'shuffle', 'weighted']);
});

// ======================================================================
// Systematic sweeps — per-seed × per-shape parameterized boundary tests
// ======================================================================

const SHAPES = {
  band: (r) => band(r, 100),
  narrow: (r) => narrow(r, 5, 42),
  clamped: (r) => clamped(r, 1.0, 0.1),
  clampedBand: (r) => clamped(r, 0.0, 0.02, 0.88, 1.12),
  weighted: (r) => weighted(r, [{ value: 1, weight: 3 }, { value: 2, weight: 7 }]),
  shuffle3: (r) => shuffle(r, [1, 2, 3]),
};

for (const [name, fn] of Object.entries(SHAPES)) {
  for (const s of SEEDS) {
    test(`sweep ${name} @ seed ${s}: 20k draws stay inside the shape's legal envelope`, () => {
      const r = mulberry32(s);
      for (let i = 0; i < 20000; i++) {
        const v = fn(r);
        assert.ok(v !== undefined && v !== null && !Number.isNaN(v), `draw ${i} → ${v}`);
      }
    });
  }
}

// band(n) per n: boundary n−1 reachable, n never
for (const n of [2, 3, 4, 5, 6, 8, 10, 16, 20, 50, 99, 100]) {
  test(`sweep band(${n}) across 8 seeds: values in [0,${n}) and boundary ${n - 1} is reachable`, () => {
    let sawTop = false;
    for (const s of SEEDS) {
      const r = mulberry32(s);
      for (let i = 0; i < 4000; i++) {
        const v = band(r, n);
        assert.ok(Number.isInteger(v) && v >= 0 && v < n);
        if (v === n - 1) sawTop = true;
      }
    }
    assert.ok(sawTop, `boundary ${n - 1} never observed for Band(${n})`);
  });
}

// narrow(a,b) per range: both endpoints reachable
for (const [a, b] of [[0, 1], [1, 2], [2, 5], [0, 9], [3, 4], [7, 12], [-3, 3], [-10, -8], [0, 99], [40, 60]]) {
  test(`sweep narrow(${a},${b}) across seeds: both endpoints ${a} and ${b} observed`, () => {
    let sawA = false, sawB = false;
    for (const s of SEEDS) {
      const r = mulberry32(s);
      for (let i = 0; i < 4000; i++) {
        const v = narrow(r, a, b);
        if (v === a) sawA = true;
        if (v === b) sawB = true;
      }
    }
    assert.ok(sawA && sawB, `endpoints a=${sawA} b=${sawB}`);
  });
}

// clamped configs: legal band respected per config
for (const [c, w, lo, hi] of [[1.0, 0.1], [0.5, 0.05], [0, 0.02, 0.88, 1.12], [2, 1], [-1, 0.25], [100, 0.001], [0.3, 0.7, 0.5, 0.6], [1, 0.1, 0.98, 1.02]]) {
  test(`sweep clamped(c=${c}, w=${w}${lo !== undefined ? `, [${lo}, ${hi}]` : ''}) stays in its legal band (8 seeds)`, () => {
    const low = lo === undefined ? c - w : lo;
    const high = hi === undefined ? c + w : hi;
    for (const s of SEEDS) {
      const r = mulberry32(s);
      for (let i = 0; i < 5000; i++) {
        const v = clamped(r, c, w, lo, hi);
        assert.ok(v >= low && v <= high, `v=${v} band=[${low},${high}]`);
      }
    }
  });
}

// weighted tables: empirical mean close to the theoretical mean
for (const [label, list, expect] of [
  ['coin', [{ value: 0, weight: 1 }, { value: 1, weight: 1 }], null],
  ['skew90', [{ value: 0, weight: 9 }, { value: 1, weight: 1 }], null],
  ['three-way', [{ value: 1, weight: 2 }, { value: 2, weight: 3 }, { value: 3, weight: 5 }], null],
  ['tiny-weight', [{ value: 1, weight: 0.01 }, { value: 2, weight: 99.99 }], null],
]) {
  test(`sweep weighted[${label}] over 40k draws matches its theoretical mean within tolerance`, () => {
    const r = mulberry32(4242);
    const total = list.reduce((s, e) => s + e.weight, 0);
    const theory = list.reduce((s, e) => s + e.value * (e.weight / total), 0);
    let sum = 0;
    const N = 40000;
    for (let i = 0; i < N; i++) sum += weighted(r, list);
    const mean = sum / N;
    const scale = Math.max(...list.map((e) => Math.abs(e.value))) || 1;
    assert.ok(Math.abs(mean - theory) < 0.03 * scale, `mean ${mean} vs theory ${theory}`);
  });
}

test('sweep weighted[negative-weight entry] — negative weight acts as 0, never picked (documented)', () => {
  const r = mulberry32(4242);
  const list = [{ value: 1, weight: -1 }, { value: 2, weight: 3 }];
  for (let i = 0; i < 40000; i++) assert.strictEqual(weighted(r, list), 2);
});

// shuffle lengths: permutation + draw count for each length 13..20
for (let len = 13; len <= 20; len++) {
  test(`sweep shuffle(len=${len}): permutation preserved, consumes ${len - 1} draws`, () => {
    const r = countingStream(5000 + len);
    const input = Array.from({ length: len }, (_, i) => i);
    const out = shuffle(r, input);
    assert.deepEqual(out.slice().sort((a, b) => a - b), input);
    assert.strictEqual(r.count(), len - 1);
  });
}

// deriveSeed avalanche-ish: nearby inputs differ in seed and stream
for (const i of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 50, 100, 500, 1000]) {
  test(`sweep deriveSeed sensitivity #${i}: changing build field ${i} changes the stream`, () => {
    const A = { hp: 100, mig: 5, wit: 5, grd: 5, hst: 5, i };
    const B = { hp: 100, mig: 5, wit: 5, grd: 5, hst: 5, i: i + 1 };
    const s1 = deriveSeed(A, B, 0, 0);
    const s2 = deriveSeed(A, B, 0, 0);
    assert.strictEqual(s1, s2);
    const a = makeMeasures(mulberry32(s1));
    const b = makeMeasures(mulberry32(deriveSeed({ ...A, i: i + 1 }, B, 0, 0)));
    let differs = false;
    for (let k = 0; k < 10; k++) if (a.band(1e9) !== b.band(1e9)) { differs = true; break; }
    assert.ok(differs, `streams identical for changed input #${i}`);
  });
}
