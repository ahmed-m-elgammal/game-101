/**
 * asserts.js — T2.2: the published §15.3 targets as executable asserts,
 * plus the anti-lock regression set. Every assert returns an actionable
 * result: which measurement, which value, which band — and on failure,
 * the matchup/build pair that broke it. Failures are loud, never silent.
 *
 * Threshold provenance (recorded, ENG-8):
 *   §15.3 canon targets — class ≤58% overall, mirrors ~50% ±3, fights
 *   average 7–12 rounds, zero fights >20 rounds, Last-Bell ≤5%.
 *   N6 ruling — Ban 1's ±12% is asserted as per-length σ ≤ 12% of mean
 *   over CONTESTED length buckets (≥30 fights), across 10k seeds.
 *   Anti-lock bounds — stun-skip ≤40% (mechanistic ceiling ≈33% under the
 *   two-turn re-lock rule), hush-starved victim still casts ≥20% non-Strike,
 *   sustain/turtle builds ≤58% (the PvP cap itself), zero-damage ≤35%.
 */

import { quickReading } from '../sim.js';
import { createSession, runToCompletion, resultsOf } from '../engine/fight.js';
import { runMatrix, classRollup, mirrorRollup, lengthRollup } from './matrix.js';
import { archetypeBuild, STATUS_FAMILY } from './archetypes.js';

export const TARGETS = {
  classMaxWinPct: 58,          // §15.3: no class above ~58% overall
  mirrorBandPct: [47, 53],     // §15.3: mirrors ~50% (±3)
  avgRoundsBand: [7, 12],      // §15.3: average fight 7–12 rounds
  maxRoundsCeiling: 20,        // §15.3: no fight reaches round 20 (D8 Last Bell)
  lastBellMaxPct: 5,           // [02] §7 assert 2
  varianceSigmaPct: 12,        // N6: per-length σ, contested buckets
  contestedMinCount: 30,       // …contested = bucket holds ≥30 fights
  leanWinPct: 55,              // a status-lean build wins some matchup ≥55%…
  leanLossPct: 45,             // …and loses some matchup ≤45% (lean-loss exists)
  stunSkipMaxFrac: 0.4,        // anti-lock: stun cannot eat >40% of victim turns
  hushNonStrikeMinFrac: 0.2,   // anti-lock: hush-starved victim still casts kits
  sustainWinMaxPct: 58,        // anti-lock: sustain/turtle obey the PvP cap
  zeroDamageWinMaxPct: 35,     // anti-lock: no damage → no wins
};

function result(id, label, pass, value, detail, advisory = false) {
  return { id, label, pass, value, detail, advisory };
}

/**
 * KNOWN-GAP register (finding N7, docs/DECISIONS.md): §15.3 rows that the
 * FIXTURE content does not meet yet. These asserts still run and report the
 * strict verdict, but CI treats them as advisory (WARN, not FAIL) until the
 * Phase-4 tuning wave turns them green — at which point each row is
 * promoted back to a hard gate (T4.12). No row is ever removed or relaxed
 * silently: promotion/demotion is a recorded decision.
 *
 * Measured at freeze (n=2000/probe, Phase 2):
 *   class-dominance  — Ashblade 90.2% overall vs ≤58% cap (Cinder 76.3%,
 *                      Cantor 24.4%, Warden 9.1%). Canon's counter-web
 *                      expects Cinder > Ashblade; bleed out-races burn.
 *   anti-heal-sustain — Long Dark mason 64.3% vs Ashblade aggressive (cap 58).
 *   anti-zero-damage  — Strike-only turtle beats Cantor aggressive 75.0%
 *                       via the Last Bell HP race (cap 35).
 */
export const KNOWN_GAPS = {
  'class-dominance': { finding: 'N7', promoteAt: 'T4.12' },
  'anti-heal-sustain': { finding: 'N7', promoteAt: 'T4.12' },
  'anti-zero-damage': { finding: 'N7', promoteAt: 'T4.12' },
};

function verdict(id, label, pass, value, detail) {
  return result(id, label, pass, value, detail, !!KNOWN_GAPS[id]);
}

/* ------------------------------------------------------------------ *
 * Core §15.3 asserts over a matrix result (runMatrix output)
 * ------------------------------------------------------------------ */

export function coreAsserts(matrix) {
  const out = [];

  // 1. no class above ~58% overall (mirrors excluded)
  const rollup = classRollup(matrix).slice().sort((a, b) => b.winPct - a.winPct);
  const top = rollup[0];
  out.push(verdict(
    'class-dominance',
    `no class >${TARGETS.classMaxWinPct}% overall`,
    !top || top.winPct <= TARGETS.classMaxWinPct,
    top ? `${top.id} ${top.winPct.toFixed(1)}%` : 'n/a',
    rollup.map((r) => `${r.id} ${r.winPct.toFixed(1)}% (${r.games}g)`).join(' · '),
  ));

  // 2. mirrors ~50% ±3
  const mirror = mirrorRollup(matrix);
  const [lo, hi] = TARGETS.mirrorBandPct;
  const mirrorPass = mirror.games === 0 || (mirror.winAPct >= lo && mirror.winAPct <= hi);
  out.push(result(
    'mirror-parity',
    `mirrors ~50% ±3 (side-A in [${lo}, ${hi}])`,
    mirrorPass,
    `${mirror.winAPct.toFixed(1)}% over ${mirror.games} mirror fights`,
    'Drift here is a first-mover / tie-break bias, not content.',
  ));

  // 3. average fight length 7–12 rounds
  const len = lengthRollup(matrix);
  const [rlo, rhi] = TARGETS.avgRoundsBand;
  out.push(result(
    'fight-length',
    `average fight ${rlo}–${rhi} rounds`,
    len.avgRounds >= rlo && len.avgRounds <= rhi,
    `${len.avgRounds.toFixed(2)} avg over ${len.n} fights`,
    `histogram rounds 1..${len.maxRounds}: ${len.histogram.join(', ')}`,
  ));

  // 4. zero fights >20 rounds (structural: D8 Last Bell must hold everywhere)
  out.push(result(
    'round-ceiling',
    `zero fights beyond round ${TARGETS.maxRoundsCeiling}`,
    len.maxRounds <= TARGETS.maxRoundsCeiling,
    `longest fight: ${len.maxRounds} rounds`,
    'Mechanism: fatigue doubling + The Last Bell (D8).',
  ));

  // 5. Last-Bell frequency ≤5%
  out.push(result(
    'last-bell-rate',
    `Last-Bell resolution ≤${TARGETS.lastBellMaxPct}% of fights`,
    len.lastBellPct <= TARGETS.lastBellMaxPct,
    `${len.lastBellPct.toFixed(2)}%`,
    '[02] §7 assert 2 — the bell is a backstop, not a feature.',
  ));

  return out;
}

/* ------------------------------------------------------------------ *
 * Status coverage: every signature status has lean-win AND lean-loss
 * ------------------------------------------------------------------ */

/**
 * @param matrix - an 'archetypes'-mode matrix result
 */
export function statusAsserts(matrix) {
  const byKey = new Map(); // `${clazz}/${arch}` → [{winPct, label}]
  const push = (clazz, arch, winPct, label) => {
    const k = `${clazz}/${arch}`;
    if (!byKey.has(k)) byKey.set(k, []);
    byKey.get(k).push({ winPct, label });
  };
  for (const m of matrix.matchups) {
    if (m.aClass === m.bClass && m.aArch === m.bArch) continue;
    push(m.aClass, m.aArch, m.winAPct, `${m.aArch} vs ${m.bClass}/${m.bArch} L${m.level}`);
    push(m.bClass, m.bArch, m.winBPct, `${m.bArch} vs ${m.aClass}/${m.aArch} L${m.level}`);
  }

  const rows = matrix.statusFamilies || {};
  const out = [];
  for (const [clazz, family] of Object.entries(rows)) {
    const rowsFor = byKey.get(`${clazz}/status`) || [];
    if (!rowsFor.length) {
      out.push(result(`status-${family}`, `${family}: lean-win & lean-loss exist`, false, 'no rows', 'status archetype missing from matrix'));
      continue;
    }
    const best = rowsFor.reduce((a, b) => (b.winPct > a.winPct ? b : a));
    const worst = rowsFor.reduce((a, b) => (b.winPct < a.winPct ? b : a));
    const leanWin = best.winPct >= TARGETS.leanWinPct;
    const leanLoss = worst.winPct <= TARGETS.leanLossPct;
    out.push(result(
      `status-${family}`,
      `${family}: lean-win (≥${TARGETS.leanWinPct}%) & lean-loss (≤${TARGETS.leanLossPct}%) exist`,
      leanWin && leanLoss,
      `best ${best.winPct.toFixed(1)}% · worst ${worst.winPct.toFixed(1)}%`,
      `${best.label} · ${worst.label}`,
    ));
  }
  return out;
}

/* ------------------------------------------------------------------ *
 * Ban-1 variance assert (N6 reading) — hard fail, 10k seeds
 * ------------------------------------------------------------------ */

function sigmaOf(values) {
  const n = values.length;
  if (n < 2) return 0;
  let s = 0, s2 = 0;
  for (const v of values) { s += v; s2 += v * v; }
  const mean = s / n;
  return Math.sqrt(Math.max(0, s2 / n - mean * mean));
}

/**
 * Per-length σ of total fight damage must be ≤12% of the bucket mean for
 * every contested bucket (≥ TARGETS.contestedMinCount fights). Hard assert:
 * overkill/kill-timing live in the max−min spread; σ isolates the luck band.
 * Also verifies the Fortune clamp [0.88, 1.12] on a sample of tracks.
 * @returns {{pass, buckets, worst, fortune:{min,max,ok}, n}}
 */
export function varianceProbe(buildA, buildB, opts = {}) {
  const n = opts.n || 10000;
  const tuning = opts.tuning;
  const raw = quickReading(buildA, buildB, { n, tuning });

  const buckets = raw.variance.byLength
    .map((b) => {
      const values = [];
      for (const p of raw.perSeed) if (p.rounds === b.len) values.push(p.total);
      const mean = values.length ? values.reduce((s, v) => s + v, 0) / values.length : 0;
      const sigma = sigmaOf(values);
      return {
        len: b.len, count: values.length, mean,
        sigmaPct: mean > 0 ? (sigma / mean) * 100 : 0,
      };
    })
    .filter((b) => b.count >= TARGETS.contestedMinCount);

  const worst = buckets.reduce((m, b) => (b.sigmaPct > (m?.sigmaPct ?? -1) ? b : m), null);
  const pass = buckets.length > 0 && worst.sigmaPct <= TARGETS.varianceSigmaPct;

  // Fortune hard band on a sample of tracks (§10.6)
  let fmin = Infinity, fmax = -Infinity, fok = true;
  const sample = Math.min(200, n);
  for (let i = 0; i < sample; i++) {
    const seed = (i * 2654435761) >>> 0; // fixed probe family, deterministic
    const session = createSession(buildA, buildB, { seed, tuning, silent: true });
    runToCompletion(session);
    const r = resultsOf(session);
    for (const f of r.fortuneTrack) {
      if (f < fmin) fmin = f;
      if (f > fmax) fmax = f;
      if (f < tuning.fortuneMin - 1e-9 || f > tuning.fortuneMax + 1e-9) fok = false;
    }
  }

  return {
    pass,
    n,
    buckets,
    worst,
    fortune: { min: fmin, max: fmax, ok: fok },
    spreadOverallPct: raw.variance.overallSpreadPct,
  };
}

export function varianceAssert(buildA, buildB, opts = {}) {
  const probe = varianceProbe(buildA, buildB, opts);
  const detail = probe.buckets
    .map((b) => `r${b.len}: σ=${b.sigmaPct.toFixed(2)}% (n=${b.count})`)
    .join(' · ');
  const pass = probe.pass && probe.fortune.ok;
  return result(
    'variance-band',
    `Ban 1 — per-length σ ≤${TARGETS.varianceSigmaPct}% (N6) + Fortune clamp [0.88, 1.12]`,
    pass,
    probe.worst ? `worst bucket r${probe.worst.len} σ=${probe.worst.sigmaPct.toFixed(2)}%` : 'no contested buckets',
    `${detail} · fortune [${probe.fortune.min.toFixed(3)}, ${probe.fortune.max.toFixed(3)}] · max−min spread ${probe.spreadOverallPct.toFixed(1)}% (reported, not asserted — N6)`,
  );
}

/* ------------------------------------------------------------------ *
 * Anti-lock regression set — each degenerate build MUST fail to lock
 * ------------------------------------------------------------------ */

function fightOnce(buildA, buildB, seed, tuning) {
  const session = createSession(buildA, buildB, { seed, tuning, silent: true });
  runToCompletion(session);
  const r = resultsOf(session);
  const castsOf = (side) => {
    const f = session.fighters[side];
    let total = 0, nonStrike = 0;
    for (const [id, c] of Object.entries(f.casts)) {
      total += c;
      if (id !== 'strike') nonStrike += c;
    }
    return { total, nonStrike };
  };
  return { r, casts: { a: castsOf('a'), b: castsOf('b') } };
}

function probeMatchup(buildA, buildB, tuning, n) {
  let winA = 0, rounds = 0, skippedB = 0, turnsB = 0, nonStrikeB = 0;
  for (let i = 0; i < n; i++) {
    const seed = (0x9e3779b9 ^ (i * 0x85ebca6b)) >>> 0;
    const { r, casts } = fightOnce(buildA, buildB, seed, tuning);
    if (r.winner === 'a') winA += 1;
    rounds += r.rounds;
    // a stunned (or otherwise silent) turn casts nothing; one cast per live turn
    const gaps = Math.max(0, r.rounds - casts.b.total);
    skippedB += gaps;
    turnsB += r.rounds;
    nonStrikeB += casts.b.nonStrike;
  }
  return {
    n,
    winAPct: (winA / n) * 100,
    avgRounds: rounds / n,
    skipFracB: turnsB ? skippedB / turnsB : 0,
    nonStrikeFracB: turnsB ? nonStrikeB / turnsB : 0,
  };
}

/** Degenerate probe builds — purpose-built to attempt each lock. */
export function degenerateBuilds(tuning) {
  const L = 5;
  const mk = (name, clazz, creation, levelUps, vow, verses) => ({
    name, clazz, level: L, creation, levelUps, vow, verses, items: [],
  });
  // Gravewarden probe shell — VIG 9 base means creation {grd:2, vig:1, mig:1}
  // is the legal max-control spread; level-ups finish the caps.
  const wardenShell = (name, vow, verses, levelUps) =>
    mk(name, 'gravewarden', { grd: 2, vig: 1, mig: 1 }, levelUps, vow, verses);
  return {
    // Warden stun-kit: stun on a 4-round cooldown, re-lock at 2 victim turns
    stunLock: archetypeBuild('gravewarden', 'status', L, tuning),
    // Cantor silence engine: hush on demand, gain −3
    hushStarve: archetypeBuild('hollow_cantor', 'status', L, tuning),
    // Long Dark mason: 4% max HP per turn + two heals
    healSustain: wardenShell('heal-sustain probe', 'long_dark',
      ['mend_the_mortar', 'last_rites', 'hold_the_line', 'crypt_door'],
      { mig: 4, hst: 4 }),
    // Ward turtle: two ward engines + brace, no heals
    wardTurtle: wardenShell('ward-turtle probe', 'bastion',
      ['crypt_door', 'stone_vigil', 'hold_the_line', 'steady_breath'],
      { mig: 4, hst: 4 }),
    // Zero-damage stall: utility only — Strike is the fallback blade
    zeroDamage: wardenShell('zero-damage probe', null,
      ['hold_the_line', 'mend_the_mortar', 'crypt_door', 'steady_breath'],
      { mig: 4, hst: 4 }),
    // The victims: aggressive builds of the three non-Warden classes
    victims: {
      ashblade: archetypeBuild('ashblade', 'aggressive', L, tuning),
      cinder_witch: archetypeBuild('cinder_witch', 'aggressive', L, tuning),
      hollow_cantor: archetypeBuild('hollow_cantor', 'aggressive', L, tuning),
    },
  };
}

/**
 * Run the full anti-lock set at L5, n fights per probe.
 * @returns {Array} assert results
 */
export function antiLockAsserts(tuning, opts = {}) {
  const n = opts.n || 300;
  const B = degenerateBuilds(tuning);
  const out = [];

  // 1. stun-lock vs Cinder Witch — skip fraction is mechanism-bounded
  const stun = probeMatchup(B.stunLock, B.victims.cinder_witch, tuning, n);
  out.push(verdict(
    'anti-stun-lock',
    `stun-lock fails: victim skip ≤${TARGETS.stunSkipMaxFrac * 100}% of turns`,
    stun.skipFracB <= TARGETS.stunSkipMaxFrac,
    `skip ${(stun.skipFracB * 100).toFixed(1)}% · lock win ${stun.winAPct.toFixed(1)}% · ${stun.avgRounds.toFixed(1)} avg rounds`,
    'Mechanistic ceiling ≈33% under the two-turn re-lock rule (§5.5).',
  ));

  // 2. Hush starvation vs Cinder Witch — Resolve floor keeps the kit alive
  const hush = probeMatchup(B.hushStarve, B.victims.cinder_witch, tuning, n);
  out.push(verdict(
    'anti-hush-starve',
    `hush-starvation fails: victim still casts ≥${TARGETS.hushNonStrikeMinFrac * 100}% non-Strike`,
    hush.nonStrikeFracB >= TARGETS.hushNonStrikeMinFrac,
    `victim non-Strike ${(hush.nonStrikeFracB * 100).toFixed(1)}% · starve win ${hush.winAPct.toFixed(1)}%`,
    'Gain floor +1 (§5.3) guarantees the reply — starvation is pressure, not prison.',
  ));

  // 3+4. heal-sustain & ward-turtle must obey the PvP cap vs every aggressive kit
  for (const [id, build, cap] of [
    ['anti-heal-sustain', B.healSustain, TARGETS.sustainWinMaxPct],
    ['anti-ward-turtle', B.wardTurtle, TARGETS.sustainWinMaxPct],
  ]) {
    const rows = [];
    let pass = true;
    for (const v of Object.values(B.victims)) {
      const p = probeMatchup(build, v, tuning, n);
      rows.push(`${v.clazz}: ${p.winAPct.toFixed(1)}%`);
      if (p.winAPct > cap) pass = false;
    }
    out.push(verdict(
      id,
      `${id.replace('anti-', '')} fails to lock: win ≤${cap}% vs every aggressive kit`,
      pass,
      rows.join(' · '),
      'Sustain may wall one class; it may not own the ladder.',
    ));
  }

  // 5. zero-damage stall must not win — the Strike fallback is not an engine
  const zero = probeMatchup(B.zeroDamage, B.victims.hollow_cantor, tuning, n);
  out.push(verdict(
    'anti-zero-damage',
    `zero-damage stall fails: win ≤${TARGETS.zeroDamageWinMaxPct}% and fights still end`,
    zero.winAPct <= TARGETS.zeroDamageWinMaxPct && zero.avgRounds <= TARGETS.maxRoundsCeiling,
    `win ${zero.winAPct.toFixed(1)}% · ${zero.avgRounds.toFixed(1)} avg rounds`,
    'Last Bell (D8) guarantees the ending; the cap guarantees it is not a strategy.',
  ));

  return out;
}

/* ------------------------------------------------------------------ *
 * Full gate: everything at once (used by CI + the dashboard)
 * ------------------------------------------------------------------ */

export function fullBalanceGate({ tuning, n = 150, archetypeN = 60, levels } = {}) {
  const classes = ['ashblade', 'cinder_witch', 'gravewarden', 'hollow_cantor'];
  const matrix = runMatrix({ classes, levels: levels || [1, 5, 9], mode: 'classes', n, tuning });
  const amatrix = runMatrix({
    classes, levels: levels || [5, 9], mode: 'archetypes',
    archetypes: ['aggressive', 'defensive', 'status'], n: archetypeN, tuning,
  });
  amatrix.statusFamilies = STATUS_FAMILY;
  const core = coreAsserts(matrix);
  const status = statusAsserts(amatrix);
  const locks = antiLockAsserts(tuning, { n: 200 });
  return {
    matrix,
    archetypeMatrix: amatrix,
    core,
    status,
    locks,
    all: [...core, ...status, ...locks],
  };
}
