/**
 * counterbuild.js — T5.8: Corvane selection integration. [GDD] §9.2;
 * [02] R6; D11 (APPROVED). The pick itself is T4.9's pure function
 * (data/corvane.js — detectLean + corvaneCounterbuild); THIS module owns
 * the run-locking semantics that make the exploit impossible:
 *
 *   1. FIGHT-START HOOK — the counterbuild is picked ONCE at chapter start
 *      from the player's build string (seeded) and FROZEN into the run
 *      state. A Re-bell (any retry) resolves the SAME sheet — "He watched
 *      you fight once. He does not forget."
 *   2. THE LOCK IS THE PICK, NOT THE SEED — re-slotting your verses after
 *      the chapter starts cannot re-roll him; the frozen sheet answers the
 *      build you brought to the chapter, every time (D11's kill: the
 *      retry-farming loop needs the pick to move, and it cannot).
 *   3. REVEAL ON FIRST LOSS — the first loss hands the Reading the axis he
 *      punished and the counter-table row that fired, exactly once; from
 *      the second loss the standard Maren's Whisper applies (the caller
 *      falls back to it when the hook returns null).
 *
 * The lock survives save/load: the state is plain JSON (T9.1 consumes the
 * shape; the round-trip is pinned here).
 */

const { corvaneCounterbuild, corvaneSheet, buildStringOf } = require('../data/corvane.js');

/**
 * Chapter-start hook: pick and lock. A re-lock (same run re-entering the
 * chapter, or a mod calling twice) is a no-op — the first chapter start
 * owns the pick for the whole run.
 * @param {object} runState - the campaign run state (mutated in place)
 * @param {object} playerBuild - the build the player brings to the chapter
 * @param {number} chapter - the chapter salt (canon: 5)
 * @returns {object} the frozen lock record
 */
function lockCounterbuild(runState, playerBuild, chapter = 5) {
  if (!runState || typeof runState !== 'object') throw new Error('runState required');
  if (!playerBuild || typeof playerBuild !== 'object') throw new Error('playerBuild required');
  if (runState.corvane && runState.corvane.locked) return runState.corvane; // D11: already locked
  const pick = corvaneCounterbuild(playerBuild, chapter);
  const record = {
    locked: true,
    chapter,
    buildString: buildStringOf(playerBuild),
    lean: pick.lean,
    weights: { ...pick.weights },
    sheetId: pick.sheetId,
    fired: pick.fired ? { lean: pick.fired.lean, label: pick.fired.label, brings: pick.fired.brings, why: pick.fired.why } : null,
    announce: pick.announce,
    revealLine: pick.revealLine,
    losses: 0,
    revealed: false,
  };
  runState.corvane = record;
  return record;
}

/** True when the run carries a live lock (the Ch5 fight-start gate). */
function isLocked(runState) {
  return !!(runState && runState.corvane && runState.corvane.locked);
}

/**
 * Fight-start resolution: the LOCKED sheet, cloned — never re-derived from
 * the current build. This is the build startFight consumes.
 * @returns {object} Corvane's engine build for this run
 */
function resolveCorvaneBuild(runState) {
  if (!isLocked(runState)) throw new Error('corvane counterbuild not locked — call lockCounterbuild at chapter start');
  return corvaneSheet(runState.corvane.sheetId);
}

/**
 * Loss hook: record the loss; the FIRST one returns the Reading payload
 * (axis + fired row + reveal line). From the second loss, returns null —
 * the standard Maren's Whisper applies (caller fallback).
 */
function recordCorvaneLoss(runState) {
  if (!isLocked(runState)) throw new Error('corvane counterbuild not locked');
  const c = runState.corvane;
  c.losses += 1;
  if (c.revealed || c.losses !== 1) return null; // reveal fires exactly once
  c.revealed = true;
  return {
    axis: c.lean,
    label: c.fired ? c.fired.label : c.lean,
    brings: c.fired ? c.fired.brings : 'a normal fight',
    why: c.fired ? c.fired.why : c.revealLine,
    line: c.fired ? 'He did not bring a duelist. He brought an answer.' : c.revealLine,
    announce: c.announce,
  };
}




module.exports = { lockCounterbuild, isLocked, resolveCorvaneBuild, recordCorvaneLoss };
