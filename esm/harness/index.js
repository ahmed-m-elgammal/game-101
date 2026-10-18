/**
 * index.js — harness barrel (T2.1/T2.2/T2.3/T2.4 surface).
 * Pure functions only: no DOM, no clock, no globals, no Math.random.
 * Timing/benchmarks live in the callers (tests, tools, dashboard).
 */
export * from './archetypes.js';
export * from './matrix.js';
export * from './asserts.js';
export * from './roster.js';
export { runReading, readingKey, counterFor, cacheStats, clearReadingCache, READING_OVERRIDES } from '../reading.js';
