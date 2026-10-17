/**
 * tuning.js — session-local tuning over the canon constants. ENG-5: canon
 * values live in data/config.js as the single source; this module merges
 * overrides non-destructively and reports every deviation so nothing is
 * ever tuned silently.
 *
 * The Phase-1 Tuning Bench (the "adjust what you're building" panel) writes
 * overrides here; the engine receives the merged object everywhere.
 */

const { CANON } = require('./data/config.js');

function isPlainObject(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

/** Deep-merge user overrides over CANON. Arrays replace, objects merge. */
function createTuning(overrides) {
  if (!overrides) return CANON;
  return deepMerge(CANON, overrides);
}

function deepMerge(base, over) {
  const out = Array.isArray(base) ? base.slice() : { ...base };
  for (const [k, v] of Object.entries(over || {})) {
    if (isPlainObject(v) && isPlainObject(base[k])) out[k] = deepMerge(base[k], v);
    else out[k] = v;
  }
  return out;
}

/** Flatten CANON to path → value for the deviation report. */
function flatten(obj, prefix = '') {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    const p = prefix ? `${prefix}.${k}` : k;
    if (isPlainObject(v)) Object.assign(out, flatten(v, p));
    else out[p] = v;
  }
  return out;
}

const FLAT_CANON = flatten(CANON);

/** Tag map: which decision/provisional governs each path. */
const TUNING_TAGS = {
  'fatigue.schedule': 'D8',
  'fatigue.telegraphRound': 'D8',
  'fatigue.startRound': 'D8',
  'fatigue.lastBellRound': 'D8',
  'budgetBase': 'D7/N5',
  'budgetPerLevel': 'D7/N5',
  'levelSync.statPerLevel': 'D2',
  'levelSync.hpPctPerLevel': 'D2',
  'levelSync.capLevels': 'D2',
  'bramHP': 'PROVISIONAL:D12',
  'vigilsRestCost': 'PROVISIONAL:D17',
  'ilvanePhase2HealPct': 'PROVISIONAL:D31',
  'burnBase': 'ENG (canon silent on base)',
  'mitCap': '§5.1',
  'mitCapAshGlazed': '§8.3',
  'jitterWidth': '§10.5 / Ban 1',
  'fortuneMin': '§10.6',
  'fortuneMax': '§10.6',
  'resolveIncome': '§5.3',
  'resolveCap': '§5.3',
};

/**
 * Deviation report — every override that differs from canon, with the
 * canon value, the current value, and its governing tag. Zero entries
 * means the engine is running pure canon.
 */
function diffTuning(tuning) {
  const flat = flatten(tuning);
  const diffs = [];
  for (const [path, value] of Object.entries(flat)) {
    const canon = FLAT_CANON[path];
    if (canon === undefined) {
      diffs.push({ path, canon: '(absent)', current: value, tag: 'custom' });
      continue;
    }
    if (JSON.stringify(canon) !== JSON.stringify(value)) {
      diffs.push({ path, canon, current: value, tag: TUNING_TAGS[path] || 'canon' });
    }
  }
  return diffs;
}


module.exports = { createTuning, diffTuning, TUNING_TAGS };
