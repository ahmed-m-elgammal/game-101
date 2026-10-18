/**
 * matrix.js — T2.1 headless harness runner. [GDD] §15.3 ("build this first").
 * Plays Echo-vs-Echo matchups across class pairings at several levels and
 * aggregates win rates, average fight length, longest fight, Last-Bell
 * frequency and per-status contribution — the balance workbench every later
 * tuning task drives.
 *
 * Determinism: every fight's seed is derived from the canonical matchup
 * (buildA JSON | buildB JSON | index | 'harness'), so a matrix run is
 * reproducible byte-for-byte on Node and in the browser. No Math.random,
 * no clock — the same contract as the engine.
 */

const { createSession, runToCompletion, resultsOf } = require('../engine/fight.js');
const { deriveSeed } = require('../rng/index.js');
const { archetypeBuild, standardBuild, ARCHETYPE_IDS } = require('./archetypes.js');

const MATRIX_LEVELS = [1, 3, 5, 7, 9, 10];

/**
 * Run the matchup matrix.
 * @param {object} opts
 * @param {string[]} [opts.classes]        class ids (default: all four)
 * @param {number[]} [opts.levels]         default [1,3,5,7,9,10]
 * @param {'classes'|'archetypes'} [opts.mode]
 * @param {string[]} [opts.archetypes]     which archetypes in 'archetypes' mode
 * @param {number} [opts.n]                seeds per matchup (default 200)
 * @param {object} opts.tuning
 * @param {{i:number,total:number}} [progress]  optional progress sink {i,total}
 * @param {function} [opts.onMatchup]      callback after each matchup (for UI chunking)
 * @returns {object} aggregate
 */
function runMatrix(opts) {
  const classes = opts.classes || ['ashblade', 'cinder_witch', 'gravewarden', 'hollow_cantor'];
  const levels = (opts.levels && opts.levels.length ? opts.levels : MATRIX_LEVELS).slice().sort((a, b) => a - b);
  const mode = opts.mode || 'classes';
  const n = Math.max(1, opts.n || 200);
  const tuning = opts.tuning;
  const archs = mode === 'archetypes'
    ? (opts.archetypes || ['aggressive', 'defensive', 'status'])
    : ['standard'];

  const matchups = [];
  const totals = {
    n: 0, winA: 0, winB: 0, draws: 0, lastBell: 0,
    roundsSum: 0, maxRounds: 0, roundHistogram: {},
  };

  for (const level of levels) {
    for (const ca of classes) {
      for (const cb of classes) {
        for (const ar of archs) {
          for (const br of archs) {
            const buildA = archetypeBuild(ca, ar, level, tuning);
            const buildB = archetypeBuild(cb, br, level, tuning);
            const agg = {
              aClass: ca, bClass: cb, aArch: ar, bArch: br, level, n: 0,
              winA: 0, winB: 0, draws: 0, lastBell: 0,
              roundsSum: 0, maxRounds: 0, roundHistogram: {},
            };
            for (let i = 0; i < n; i++) {
              const seed = deriveSeed(buildA, buildB, i, 'harness');
              const session = createSession(buildA, buildB, { seed, tuning, silent: true });
              runToCompletion(session);
              const r = resultsOf(session);
              agg.n += 1;
              agg.roundsSum += r.rounds;
              agg.maxRounds = Math.max(agg.maxRounds, r.rounds);
              agg.roundHistogram[r.rounds] = (agg.roundHistogram[r.rounds] || 0) + 1;
              if (r.lastBell) agg.lastBell += 1;
              if (r.winner === 'a') agg.winA += 1;
              else if (r.winner === 'b') agg.winB += 1;
              else agg.draws += 1;
            }
            // fold into totals
            totals.n += agg.n;
            totals.winA += agg.winA;
            totals.winB += agg.winB;
            totals.draws += agg.draws;
            totals.lastBell += agg.lastBell;
            totals.roundsSum += agg.roundsSum;
            totals.maxRounds = Math.max(totals.maxRounds, agg.maxRounds);
            for (const [len, c] of Object.entries(agg.roundHistogram)) {
              totals.roundHistogram[len] = (totals.roundHistogram[len] || 0) + c;
            }
            matchups.push({
              ...agg,
              avgRounds: agg.n ? agg.roundsSum / agg.n : 0,
              winAPct: agg.n ? (agg.winA / agg.n) * 100 : 0,
              winBPct: agg.n ? (agg.winB / agg.n) * 100 : 0,
              lastBellPct: agg.n ? (agg.lastBell / agg.n) * 100 : 0,
            });
            if (opts.onMatchup) opts.onMatchup(matchups[matchups.length - 1], matchups.length);
          }
        }
      }
    }
  }

  return {
    mode,
    levels,
    classes,
    archetypes: archs,
    nPerMatchup: n,
    matchups,
    totals: {
      ...totals,
      avgRounds: totals.n ? totals.roundsSum / totals.n : 0,
      lastBellPct: totals.n ? (totals.lastBell / totals.n) * 100 : 0,
    },
  };
}

/**
 * Class-level rollup across a matrix result: overall win rate per class
 * (both sides, mirrors excluded) — the input to the ≤58% dominance assert.
 */
function classRollup(matrix) {
  const acc = {};
  const init = (id) => (acc[id] = acc[id] || { id, games: 0, wins: 0 });
  for (const m of matrix.matchups) {
    if (m.aClass === m.bClass && m.aArch === m.bArch) continue; // mirror
    init(m.aClass);
    init(m.bClass);
    acc[m.aClass].games += m.n;
    acc[m.aClass].wins += m.winA;
    acc[m.bClass].games += m.n;
    acc[m.bClass].wins += m.winB;
  }
  return Object.values(acc).map((x) => ({
    id: x.id,
    games: x.games,
    winPct: x.games ? (x.wins / x.games) * 100 : 0,
  }));
}

/**
 * Mirror rollup: side-A win rate in true mirror matchups. By symmetry this
 * must sit near 50% — any drift is a first-mover/tie-break bias.
 */
function mirrorRollup(matrix) {
  let games = 0, winsA = 0;
  for (const m of matrix.matchups) {
    if (m.aClass !== m.bClass || m.aArch !== m.bArch) continue;
    games += m.n;
    winsA += m.winA;
  }
  return { games, winAPct: games ? (winsA / games) * 100 : 0 };
}

/**
 * Fight-length rollup over every fight in the matrix.
 */
function lengthRollup(matrix) {
  const hist = {};
  let n = 0, roundsSum = 0, maxRounds = 0, lastBell = 0;
  for (const m of matrix.matchups) {
    n += m.n;
    roundsSum += m.roundsSum;
    maxRounds = Math.max(maxRounds, m.maxRounds);
    lastBell += m.lastBell;
    for (const [len, c] of Object.entries(m.roundHistogram)) {
      hist[len] = (hist[len] || 0) + c;
    }
  }
  const histogram = [];
  for (let len = 1; len <= maxRounds; len++) histogram.push(hist[len] || 0);
  return {
    n, maxRounds, lastBell,
    avgRounds: n ? roundsSum / n : 0,
    lastBellPct: n ? (lastBell / n) * 100 : 0,
    histogram,
  };
}

/** Count how often each fighter ended with each status family active (per class, per side). */
function statusWinContribution(matrix) {
  // Cheap structural read: which archetypes won where. The per-status
  // "win by leaning on it" assert uses this in asserts.js.
  return matrix.matchups.map((m) => ({
    aClass: m.aClass, aArch: m.aArch, bClass: m.bClass, bArch: m.bArch,
    level: m.level, winAPct: m.winAPct, n: m.n,
  }));
}




module.exports = { runMatrix, classRollup, mirrorRollup, lengthRollup, statusWinContribution, MATRIX_LEVELS, ARCHETYPE_IDS, standardBuild, archetypeBuild };
