/**
 * mulberry32.js — the one PRNG of The Ashen Choir. [GDD] §10.3.
 * Pure factory: `mulberry32(seed)` returns a function producing uniform
 * floats in [0, 1). Stateless per fight, no globals, identical streams on
 * Node and browser (32-bit integer math only).
 */

/**
 * @param {number} seed - unsigned 32-bit seed
 * @returns {() => number} stream of floats in [0, 1)
 */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t = (t + Math.imul(t ^ (t >>> 7), t | 61)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
