/**
 * index.js — the randomness contract entry point. [GDD] §10.3, §10.12.
 *
 * One PRNG (mulberry32), one seed derivation (FNV-1a over canonical build
 * strings), six Measure shapes, and NO other source of randomness anywhere
 * in the codebase. Engine, sim and rng are the only modules allowed to
 * import this file (enforced by tools/check-bans.js).
 */
const { fnv1a } = require('./fnv1a.js');
const { mulberry32 } = require('./mulberry32.js');
const { makeMeasures } = require('./measures.js');





/**
 * Campaign seed derivation — exactly per [GDD] §10.3:
 *   fnv1a( JSON.stringify(buildA) + '|' + JSON.stringify(buildB) + '|' + round + '|' + nonce )
 * The GDD includes `round` in the hash input; v1 passes round = 0 for the
 * fight-start seed and re-derives with the round number if a per-round
 * stream is ever needed (the Echo floor uses §10.12 instead).
 *
 * @param {object} buildA - fighter A build (JSON-serialisable)
 * @param {object} buildB - fighter B build
 * @param {number} [round]
 * @param {number|string} [nonce]
 * @returns {number} unsigned 32-bit seed
 */
function deriveSeed(buildA, buildB, round = 0, nonce = 0) {
  return fnv1a(
    JSON.stringify(buildA) + '|' + JSON.stringify(buildB) + '|' + round + '|' + nonce
  );
}

/**
 * Echo-vs-Echo seed derivation — exactly per [GDD] §10.12:
 *   hash(challengerEchoCode | defenderEchoCode | hourSlot | nonce)
 *
 * @param {string} challengerEchoCode
 * @param {string} defenderEchoCode
 * @param {number|string} hourSlot - UTC hour slot
 * @param {number|string} [nonce]
 * @returns {number}
 */
function deriveEchoSeed(challengerEchoCode, defenderEchoCode, hourSlot, nonce = 0) {
  return fnv1a(
    String(challengerEchoCode) + '|' + String(defenderEchoCode) + '|' + String(hourSlot) + '|' + String(nonce)
  );
}

/**
 * Short display form — `MEASURE · 4F2A-91CC`. [GDD] §10.3.
 * @param {number} seed
 * @returns {string}
 */
function displaySeed(seed) {
  const hex = (seed >>> 0).toString(16).padStart(8, '0').toUpperCase();
  return 'MEASURE · ' + hex.slice(0, 4) + '-' + hex.slice(4);
}

/**
 * Convenience: derive a seed and return the bound Measure facade.
 * @param {object} buildA
 * @param {object} buildB
 * @param {number} [round]
 * @param {number|string} [nonce]
 */
function rngForFight(buildA, buildB, round = 0, nonce = 0) {
  const seed = deriveSeed(buildA, buildB, round, nonce);
  return { seed, display: displaySeed(seed), measures: makeMeasures(mulberry32(seed)) };
}


module.exports = { deriveSeed, deriveEchoSeed, displaySeed, rngForFight, fnv1a, mulberry32, makeMeasures };
