/**
 * reading.js — T2.4: the full 200-seed Reading behind the pre-fight panel.
 * [GDD] §10.8, §11.5; TASKS T2.4. Wraps sim.js's quickReading (same engine,
 * same determinism contract) with:
 *   • an LRU cache keyed on the CANONICAL build strings of both sides +
 *     level-sync state + n + a tuning fingerprint (session overrides change
 *     the numbers, so they change the key — a tweaked constant is a new
 *     Reading, never a stale one);
 *   • the named counter line (§5.8 canon table + per-fight overrides hook);
 *   • allocation-light reuse by the harness (T2.1) and the post-fight
 *     "worse build" verdict (§10.7).
 *
 * PURITY: this file never reads the clock or RNG — timing belongs to the
 * caller (UI / benchmarks). The synced repo copy lives under sim/ where the
 * bans gate enforces exactly that.
 */

const { quickReading } = require('./reading.js');
const { diffTuning } = require('../tuning.js');
const { COUNTER_TABLE } = require('../data/classes.js');

const CACHE_MAX = 64; // memory-safe on mobile ([GDD] §11.2 budget)

const cache = new Map(); // key → reading payload (insertion-ordered = LRU)
const stats = { hits: 0, misses: 0, evictions: 0 };

/** Stable stringify: object keys sorted recursively so key order never splits the cache. */
function stableStringify(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const keys = Object.keys(value).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`).join(',')}}`;
}

/**
 * Canonical cache key: both builds (stable form), the sync band, the seed
 * count, and the tuning fingerprint (deviations from canon only — canon
 * runs share one key shape).
 */
function readingKey(buildA, buildB, opts = {}) {
  const fp = diffTuning(opts.tuning);
  return stableStringify({
    a: buildA,
    b: buildB,
    syncBand: opts.syncBand == null ? null : opts.syncBand,
    n: opts.n == null ? 200 : opts.n,
    tuningFingerprint: fp,
  });
}

/**
 * Counter-line source: §5.8 canon table by class pair, with a hand-written
 * override hook for named fights (top-12 overrides arrive with the real
 * roster, T3.6; the hook is part of the T2.4 contract).
 */
const READING_OVERRIDES = {};

function counterFor(buildA, buildB) {
  const key = `${buildA.clazz}:${buildB.clazz}`;
  if (READING_OVERRIDES[key]) return READING_OVERRIDES[key];
  return COUNTER_TABLE[buildA.clazz]?.[buildB.clazz] || null;
}

/** Cache introspection for the UI. */
function cacheStats() {
  return { size: cache.size, max: CACHE_MAX, ...stats };
}

function clearReadingCache() {
  cache.clear();
  stats.hits = 0;
  stats.misses = 0;
  stats.evictions = 0;
}

/**
 * Run (or fetch from cache) the Reading for one matchup.
 * @param {object} buildA - the player-side build
 * @param {object} buildB - the opposing build
 * @param {object} [opts] - { n=200, tuning, syncBand (band level for D2 sync) }
 * @returns {object} reading — winAPct, winBPct, avgRounds, counterLine, cached, key…
 */
function runReading(buildA, buildB, opts = {}) {
  const n = Math.max(1, Math.min(20000, opts.n || 200));
  const key = readingKey(buildA, buildB, { ...opts, n });

  const hit = cache.get(key);
  if (hit) {
    // LRU refresh
    cache.delete(key);
    cache.set(key, hit);
    stats.hits += 1;
    return { ...hit, cached: true, key };
  }

  const raw = quickReading(buildA, buildB, { n, tuning: opts.tuning });
  const payload = {
    n: raw.n,
    winAPct: raw.n ? (raw.winA / raw.n) * 100 : 0,
    winBPct: raw.n ? (raw.winB / raw.n) * 100 : 0,
    draws: raw.draws,
    avgRounds: raw.avgRounds,
    minRounds: raw.minRounds,
    maxRounds: raw.maxRounds,
    counterLine: counterFor(buildA, buildB),
    variance: {
      overallSpreadPct: raw.variance.overallSpreadPct,
      worstLengthSpreadPct: raw.variance.byLength.reduce(
        (m, b) => Math.max(m, b.spreadPct), 0
      ),
    },
  };

  cache.set(key, payload);
  if (cache.size > CACHE_MAX) {
    const oldest = cache.keys().next().value;
    cache.delete(oldest);
    stats.evictions += 1;
  }
  stats.misses += 1;
  return { ...payload, cached: false, key };
}


module.exports = { readingKey, counterFor, cacheStats, clearReadingCache, runReading, READING_OVERRIDES };
