/**
 * index.js — engine barrel. Phase 1 (T1.1–T1.9) surface.
 * Pure functions only: no DOM, no clock, no globals, no Math.random.
 */
export * from '../rng/index.js';
export * from './fighter.js';
export * from './build.js';
export * from './status.js';
export * from './damage.js';
export * from './resolve.js';
export * from './fatigue.js';
export * from './ai.js';
export {
  createSession, legalVerses, submitChoice, step, runToCompletion,
  runFight, resultsOf, ledgerVerdict, executeVerse, spawnAlly,
} from './fight.js';
export { evalRites, temperatureState, temperatureDefenseMult } from './rites.js';
export { CANON } from '../data/config.js';
export { createTuning, diffTuning, TUNING_TAGS } from '../tuning.js';
