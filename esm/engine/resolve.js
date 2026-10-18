/**
 * resolve.js — the combat economy. [GDD] §5.3, §10.10 (Hush floor row), §15.2.
 * Start 3 (second mover 4); +3 at each turn start (Hush −2, Silence −3,
 * never below +1); cap 10; Strike refunds +1. Banking past big verses is a
 * real strategy — the cap makes it honest.
 */

export function resolveAtFightStart(f, isSecondMover, tuning) {
  // T6.3 — the §5.3 start Resolve, plus the run-boon / story-vow start bonus
  // (mods.startResolveBonus: the furnace-fed flag's +1, Twelve Tolls' and
  // Fixed Point's startBonus — the same +1 pool the marks layer adds on top
  // of later, cap respected). Second-mover compensation lands first.
  f.resolve = Math.min(
    tuning.resolveCap,
    (isSecondMover ? tuning.resolveStartSecondMover : tuning.resolveStart)
      + (f.mods && f.mods.startResolveBonus ? f.mods.startResolveBonus : 0),
  );
}

/** Turn-start income, Hush-modified, floored at +1, capped at 10. */
export function resolveGain(f, tuning) {
  // Hush depth comes from the APPLIER (stored on the status at application
  // time; F-STATUS-1). A bare {turns} shape (older saves/tests) falls back
  // to the canon default depth.
  const hush = f.statuses.hush ? (f.statuses.hush.mod ?? tuning.hushMod) : 0;
  const gain = Math.max(tuning.hushFloor, tuning.resolveIncome - hush);
  f.resolve = Math.min(tuning.resolveCap, f.resolve + gain);
  return gain;
}

export function canPay(f, cost) {
  return f.resolve >= cost;
}

export function pay(f, cost, tuning) {
  f.resolve = Math.max(0, f.resolve - cost);
  if (f.resolve > tuning.resolveCap) f.resolve = tuning.resolveCap;
}

export function gain(f, amount, tuning) {
  f.resolve = Math.min(tuning.resolveCap, f.resolve + amount);
  return f.resolve;
}
