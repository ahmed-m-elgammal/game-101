/**
 * index.js — harness barrel (T2.1/T2.2/T2.3/T2.4 surface).
 * Pure functions only: no DOM, no clock, no globals, no Math.random.
 * Timing/benchmarks live in the callers (tests, tools, dashboard).
 */
Object.assign(exports, require('./archetypes.js'));
Object.assign(exports, require('./matrix.js'));
Object.assign(exports, require('./asserts.js'));
Object.assign(exports, require('./roster.js'));
const _re0 = require('../sim/readingCache.js'); exports.runReading = _re0.runReading; exports.readingKey = _re0.readingKey; exports.counterFor = _re0.counterFor; exports.cacheStats = _re0.cacheStats; exports.clearReadingCache = _re0.clearReadingCache; exports.READING_OVERRIDES = _re0.READING_OVERRIDES;
