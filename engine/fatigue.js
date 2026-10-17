/**
 * fatigue.js — "The Bell Tolls" + The Last Bell. [GDD] §5.6, §10.5, §10.9
 * rule 10, §10.10; D8 APPROVED schedule.
 *
 * ONE schedule, ONE clock: telegraph TOLL IN 3/2/1 on r13–15; true damage
 * 2/4/8/16/32 on r16–20 (cumulative 62); at the end of r20 THE LAST BELL —
 * higher HP% wins, exact ties go to the defender. No fight exceeds 20
 * rounds, because round 20 ends the fight.
 *
 * The schedule lives in tuning (single source, ENG-5), not in code.
 */

function telegraphFor(round, tuning) {
  const t = tuning.fatigue;
  if (round < t.telegraphRound || round >= t.startRound) return null;
  return t.startRound - round; // 3, 2, 1
}

/** True-damage amount this round (0 before r16). */
function fatigueDamage(round, tuning) {
  const t = tuning.fatigue;
  if (round < t.startRound || round > t.lastBellRound) return 0;
  return t.schedule[round - t.startRound] || 0;
}

/** Cumulative fatigue through a round — the harness asserts 62 by r20. */
function cumulativeThrough(round, tuning) {
  let sum = 0;
  for (let r = tuning.fatigue.startRound; r <= Math.min(round, tuning.fatigue.lastBellRound); r++) {
    sum += fatigueDamage(r, tuning);
  }
  return sum;
}

function isLastBellRound(round, tuning) {
  return round === tuning.fatigue.lastBellRound;
}

/**
 * The Last Bell — end-of-r20 resolution. Higher HP% wins; exact ties go to
 * the defender (side 'b'). Returns {winner, lastBell:true}.
 */
function lastBellResolve(a, b) {
  const pa = a.hp / a.maxHp;
  const pb = b.hp / b.maxHp;
  if (pa > pb + 1e-12) return { winner: 'a', lastBell: true };
  if (pb > pa + 1e-12) return { winner: 'b', lastBell: true };
  return { winner: 'b', lastBell: true }; // exact tie → defender
}


module.exports = { telegraphFor, fatigueDamage, cumulativeThrough, isLastBellRound, lastBellResolve };
