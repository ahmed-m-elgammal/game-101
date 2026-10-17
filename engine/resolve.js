/**
 * resolve.js — the combat economy. [GDD] §5.3, §10.10 (Hush floor row), §15.2.
 * Start 3 (second mover 4); +3 at each turn start (Hush −2, Silence −3,
 * never below +1); cap 10; Strike refunds +1. Banking past big verses is a
 * real strategy — the cap makes it honest.
 */

function resolveAtFightStart(f, isSecondMover, tuning) {
  f.resolve = isSecondMover ? tuning.resolveStartSecondMover : tuning.resolveStart;
}

/** Turn-start income, Hush-modified, floored at +1, capped at 10. */
function resolveGain(f, tuning) {
  const hush = f.statuses.hush ? (f.mods.hushMod ?? tuning.hushMod) : 0;
  const gain = Math.max(tuning.hushFloor, tuning.resolveIncome - hush);
  f.resolve = Math.min(tuning.resolveCap, f.resolve + gain);
  return gain;
}

function canPay(f, cost) {
  return f.resolve >= cost;
}

function pay(f, cost, tuning) {
  f.resolve = Math.max(0, f.resolve - cost);
  if (f.resolve > tuning.resolveCap) f.resolve = tuning.resolveCap;
}

function gain(f, amount, tuning) {
  f.resolve = Math.min(tuning.resolveCap, f.resolve + amount);
  return f.resolve;
}


module.exports = { resolveAtFightStart, resolveGain, canPay, pay, gain };
