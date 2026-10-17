/**
 * measures.js — the six Measure shapes. [GDD] §10.4, §10.5.
 *
 * Every random value in the game is one of these six shapes. There is no
 * "roll a percentage" anywhere in the codebase. All factories consume the
 * ONE shared mulberry32 stream in a fixed order, so a fight replay is
 * byte-identical for the same seed.
 *
 * Canonical per-instance consumption order (damage path, §15.1 + §10.6):
 *   1. jitter   — clamped(center 1.00, width 0.10)   float
 *   2. fortune  — clamped(0.00, 0.02) drift          float
 *   3. crit     — band(100)                          int
 * Multi-hit verses repeat that order per hit (Red Flurry: three of each).
 */

/** @typedef {() => number} Stream - float stream in [0,1) */

/**
 * Fixed(v) — never random. Consumes nothing.
 * @param {number} v
 * @returns {number}
 */
function fixed(v) { return v; }

/**
 * Band(n) — uniform integer in [0, n). Consumes one float.
 * @param {Stream} r
 * @param {number} n - positive integer
 * @returns {number}
 */
function band(r, n) { return Math.floor(r() * n); }

/**
 * Narrow(a, b) — uniform integer in [a, b] inclusive. Consumes one float.
 * @param {Stream} r
 * @param {number} a
 * @param {number} b
 * @returns {number}
 */
function narrow(r, a, b) { return a + Math.floor(r() * (b - a + 1)); }

/**
 * Clamped(c, w) — uniform float in [c−w, c+w], then clamped to the legal
 * band. With no explicit band the legal band IS [c−w, c+w]; callers may
 * tighten it (e.g. fortune drift clamped to the fight band).
 * @param {Stream} r
 * @param {number} c - center
 * @param {number} w - half-width
 * @param {number} [lo] - optional legal lower bound
 * @param {number} [hi] - optional legal upper bound
 * @returns {number}
 */
function clamped(r, c, w, lo, hi) {
  const v = (c - w) + r() * (2 * w);
  const low = lo === undefined ? c - w : lo;
  const high = hi === undefined ? c + w : hi;
  return Math.min(high, Math.max(low, v));
}

/**
 * Weighted(list) — weighted pick from a fixed table. Consumes one float.
 * @param {Stream} r
 * @param {{value: *, weight: number}[]} list
 * @returns {*}
 */
function weighted(r, list) {
  let total = 0;
  for (const entry of list) total += entry.weight;
  let roll = r() * total;
  for (const entry of list) {
    roll -= entry.weight;
    if (roll < 0) return entry.value;
  }
  return list[list.length - 1].value;
}

/**
 * Shuffle(list) — Fisher–Yates over the same stream. Consumes n−1 Band
 * draws. Returns a copy; the input list is never mutated.
 * @param {Stream} r
 * @param {*[]} list
 * @returns {*[]}
 */
function shuffle(r, list) {
  const out = list.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    const tmp = out[i]; out[i] = out[j]; out[j] = tmp;
  }
  return out;
}

/**
 * The Measure facade — one object bound to one stream, in the §10.5 shape
 * names, so engine code reads exactly like the Measure table.
 * @param {Stream} stream
 */
function makeMeasures(stream) {
  return {
    /** Fixed(v) — no draw */
    fixed: (v) => fixed(v),
    /** Band(n) — uniform int [0, n) */
    band: (n) => band(stream, n),
    /** Narrow(a, b) — uniform int [a, b] */
    narrow: (a, b) => narrow(stream, a, b),
    /** Clamped(c, w, [lo, hi]) — uniform float, clamped */
    clamped: (c, w, lo, hi) => clamped(stream, c, w, lo, hi),
    /** Weighted(list) */
    weighted: (list) => weighted(stream, list),
    /** Shuffle(list) */
    shuffle: (list) => shuffle(stream, list),
  };
}


module.exports = { fixed, band, narrow, clamped, weighted, shuffle, makeMeasures };
