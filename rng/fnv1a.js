/**
 * fnv1a.js — FNV-1a 32-bit hash. [GDD] §10.3 seed derivation.
 * Pure. No globals. Deterministic across Node and browser (charCodeAt over
 * UTF-16 code units — callers must pass canonical JSON strings so both
 * environments hash the same bytes of the same representation).
 */

/**
 * @param {string} str - canonical string to hash
 * @returns {number} unsigned 32-bit hash
 */
function fnv1a(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}


module.exports = { fnv1a };
