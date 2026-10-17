/**
 * sim.js — the mini-Reading: N seeded simulations of one matchup.
 * Preview of T2.4 (the full 200-seed Reading lives in Phase 2); same engine,
 * same determinism contract. Runs anywhere: Node harness or browser sandbox.
 *
 * Also the Ban-1 measurement helper: total-damage spread grouped by fight
 * length (the fair reading of §15.3's ±12% target — fights of different
 * lengths have different total damage by construction).
 */

const { deriveSeed, makeMeasures, mulberry32 } = require('../rng/index.js');
const { createSession, runToCompletion, resultsOf } = require('../engine/fight.js');

/**
 * @param {object} buildA
 * @param {object} buildB
 * @param {{n?:number, tuning:object}} opts
 * @returns {{n, winA, winB, draws, avgRounds, avgDamage, minRounds, maxRounds,
 *            variance: {byLength: {len, count, min, max, mean, spreadPct}[],
 *                       overallSpreadPct}, perSeed: Array}}
 */
function quickReading(buildA, buildB, opts) {
  const n = Math.max(1, Math.min(20000, opts.n || 200));
  const tuning = opts.tuning;
  let winA = 0, winB = 0, roundsSum = 0, dmgSum = 0;
  let minRounds = Infinity, maxRounds = 0;
  const byLength = new Map();
  const perSeed = [];

  for (let i = 0; i < n; i++) {
    const seed = deriveSeed(buildA, buildB, i, 'reading');
    const session = createSession(buildA, buildB, { seed, tuning });
    runToCompletion(session);
    const r = resultsOf(session);
    const total = r.totals.a + r.totals.b;
    if (r.winner === 'a') winA += 1;
    else if (r.winner === 'b') winB += 1;
    roundsSum += r.rounds;
    dmgSum += total;
    minRounds = Math.min(minRounds, r.rounds);
    maxRounds = Math.max(maxRounds, r.rounds);
    const bucket = byLength.get(r.rounds) || { len: r.rounds, count: 0, min: Infinity, max: 0, sum: 0 };
    bucket.count += 1;
    bucket.sum += total;
    bucket.min = Math.min(bucket.min, total);
    bucket.max = Math.max(bucket.max, total);
    byLength.set(r.rounds, bucket);
    perSeed.push({ seed, winner: r.winner, rounds: r.rounds, total });
  }

  const variance = {
    byLength: [...byLength.values()]
      .sort((x, y) => x.len - y.len)
      .map((b) => {
        const mean = b.sum / b.count;
        const spreadPct = mean > 0 ? ((b.max - b.min) / mean) * 100 : 0;
        return { len: b.len, count: b.count, min: b.min, max: b.max, mean, spreadPct };
      }),
    overallSpreadPct: 0,
  };
  const meanAll = n > 0 ? dmgSum / n : 0;
  if (n > 0) {
    let lo = Infinity, hi = 0;
    for (const p of perSeed) { lo = Math.min(lo, p.total); hi = Math.max(hi, p.total); }
    variance.overallSpreadPct = meanAll > 0 ? ((hi - lo) / meanAll) * 100 : 0;
  }

  return {
    n,
    winA,
    winB,
    draws: n - winA - winB,
    avgRounds: n > 0 ? roundsSum / n : 0,
    avgDamage: meanAll,
    minRounds: minRounds === Infinity ? 0 : minRounds,
    maxRounds,
    variance,
    perSeed,
  };
}

/**
 * Fortune/Wax demonstration track for the Measure explorer: plays one fight
 * and returns the shared Fortune scalar's path (§10.6 — one scalar, both
 * fighters, hard-clamped to [0.88, 1.12]).
 */
function fortuneTrack(buildA, buildB, seed, tuning) {
  const session = createSession(buildA, buildB, { seed, tuning });
  runToCompletion(session);
  return resultsOf(session).fortuneTrack;
}

/** Re-export for UI convenience. */



module.exports = { quickReading, fortuneTrack, makeMeasures, mulberry32 };
