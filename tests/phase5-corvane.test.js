// phase5-corvane.test.js — T5.8 acceptance: the Ch5 counterbuild selection
// end to end. [GDD] §9.2, [02] R6, D11 (APPROVED).
//   - fight-start hook: read tags → pick row → generate the sheet at L7
//   - the lock is frozen at chapter start; Re-bells preserve it
//   - the lock is THE PICK: changing the build mid-run cannot re-roll
//   - first loss → the Reading gains the axis line + fired row, once
//   - determinism: same run → same counter across retries and save/load
//   - exploit regression: retry-farming a softer counter is impossible
'use strict';
const test = require('node:test');
const assert = require('node:assert');

const { CANON } = require('../data/config.js');
const { lockCounterbuild, isLocked, resolveCorvaneBuild, recordCorvaneLoss } = require('../store/counterbuild.js');
const { corvaneCounterbuild, buildStringOf, COUNTER_RULES, CORVANE_SHEET_IDS } = require('../data/corvane.js');
const { enemyBuild, getEnemy } = require('../data/enemies.js');
const { runFight } = require('../engine/fight.js');
const { standardBuild } = require('../harness/matrix.js');

const T = CANON;
const L7 = 45; // budget(7)

test('T5.8: the chapter-start hook locks the pick into the run state', () => {
  const run = {};
  const build = standardBuild('ashblade', 7, T); // rend/flay kit → the bleed row
  const rec = lockCounterbuild(run, build, 5);
  assert.strictEqual(rec.locked, true);
  assert.strictEqual(rec.chapter, 5);
  assert.strictEqual(rec.buildString, buildStringOf(build));
  assert.ok(COUNTER_RULES.some((r) => r.lean === rec.lean) || rec.lean === 'neutral');
  assert.ok(CORVANE_SHEET_IDS.includes(rec.sheetId));
  assert.strictEqual(isLocked(run), true);
  // re-lock is a no-op — the first chapter start owns the run
  const other = standardBuild('gravewarden', 7, T);
  const again = lockCounterbuild(run, other, 5);
  assert.strictEqual(again.sheetId, rec.sheetId, 'a second call cannot re-pick');
  assert.strictEqual(run.corvane.losses, 0);
});

test('T5.8: the sheet is generated at L7 on the budget (45)', () => {
  const run = {};
  lockCounterbuild(run, standardBuild('hollow_cantor', 7, T), 5);
  const sheet = resolveCorvaneBuild(run);
  assert.strictEqual(sheet.level, 7);
  const sum = Object.values(sheet.stats).reduce((a, b) => a + b, 0);
  assert.strictEqual(sum, L7, `stats sum ${sum} = budget(7)`);
  // and it fights: the full Ch5 flow end-to-end
  const r = runFight(standardBuild('ashblade', 7, T), enemyBuild({ ...getEnemy('corvane'), ...sheet }), { seed: 9, tuning: T });
  assert.ok(r.over && (r.winner === 'a' || r.winner === 'b'));
});

test('T5.8: Re-bell retries resolve the SAME sheet — 20 retries, byte-identical', () => {
  const run = {};
  const build = standardBuild('cinder_witch', 7, T);
  lockCounterbuild(run, build, 5);
  const first = JSON.stringify(resolveCorvaneBuild(run));
  for (let i = 1; i <= 20; i++) {
    assert.strictEqual(JSON.stringify(resolveCorvaneBuild(run)), first, `retry ${i}: the lock holds`);
  }
});

test('T5.8: the lock is THE PICK — re-slotting after chapter start cannot re-roll (D11)', () => {
  const run = {};
  const bleed = standardBuild('ashblade', 7, T);
  lockCounterbuild(run, bleed, 5);
  const locked = JSON.stringify(resolveCorvaneBuild(run));
  // the player rebuilds mid-run into a warden wall — Corvane does not care
  const run2 = { ...run };
  const relocked = lockCounterbuild(run2, standardBuild('gravewarden', 7, T), 5);
  assert.strictEqual(relocked.sheetId, run.corvane.sheetId);
  assert.strictEqual(JSON.stringify(resolveCorvaneBuild(run2)), locked);
  // a FRESH chapter start with the new build re-picks by seed — and even
  // then the same inputs pick the same way (determinism, not re-rolling)
  const fresh = corvaneCounterbuild(standardBuild('gravewarden', 7, T), 5);
  assert.strictEqual(fresh.sheetId, corvaneCounterbuild(standardBuild('gravewarden', 7, T), 5).sheetId);
});

test('T5.8: the first loss reveals the axis + the fired row — exactly once', () => {
  const run = {};
  const build = standardBuild('ashblade', 7, T); // a tagged lean
  lockCounterbuild(run, build, 5);
  const r1 = recordCorvaneLoss(run);
  assert.ok(r1, 'the first loss reveals');
  assert.strictEqual(r1.axis, run.corvane.lean);
  assert.ok(r1.label && r1.brings && r1.why, 'the Reading gains the row');
  assert.strictEqual(typeof r1.line, 'string');
  assert.strictEqual(run.corvane.revealed, true);
  const r2 = recordCorvaneLoss(run);
  assert.strictEqual(r2, null, 'from the second loss, the standard whisper applies (hook returns null)');
  const r3 = recordCorvaneLoss(run);
  assert.strictEqual(r3, null);
  assert.strictEqual(run.corvane.losses, 3);
});

test('T5.8: the lock survives save/load — plain JSON round-trip (T9.1 pre-integration)', () => {
  const run = {};
  lockCounterbuild(run, standardBuild('ashblade', 7, T), 5);
  recordCorvaneLoss(run);
  const saved = JSON.parse(JSON.stringify(run));
  assert.strictEqual(isLocked(saved), true);
  assert.strictEqual(saved.corvane.losses, 1);
  assert.strictEqual(saved.corvane.revealed, true);
  assert.strictEqual(JSON.stringify(resolveCorvaneBuild(saved)), JSON.stringify(resolveCorvaneBuild(run)));
  // a loaded run does not re-reveal on its next loss
  assert.strictEqual(recordCorvaneLoss(saved), null);
});

test('T5.8: the neutral fallback works — unrecognised builds pick from the neutral pool', () => {
  // a build with no tags at all: no tagged verses, no vow, no items
  const blank = { name: 'Blank', clazz: 'ashblade', level: 1, verses: ['strike'], items: [], vow: null };
  const pick = corvaneCounterbuild(blank, 5);
  assert.strictEqual(pick.lean, 'neutral');
  assert.ok(pick.sheetId.startsWith('corvane_neutral_'), 'the seeded neutral pool');
  const run = {};
  const rec = lockCounterbuild(run, blank, 5);
  assert.strictEqual(rec.lean, 'neutral');
  assert.strictEqual(rec.fired.lean, 'neutral');
  const reveal = recordCorvaneLoss(run);
  assert.ok(reveal && reveal.axis === 'neutral', 'the neutral reveal still fires once');
});

test('T5.8: exploit regression — 20 loss+re-bell loops across a changed build string', () => {
  // The farm: lose, re-bell, rebuild into something the current counter is
  // weak against, fight again. D11 kills it: the lock never moves.
  const run = {};
  lockCounterbuild(run, standardBuild('ashblade', 7, T), 5);
  const lockedSheet = JSON.stringify(resolveCorvaneBuild(run));
  const classes = ['ashblade', 'cinder_witch', 'gravewarden', 'hollow_cantor'];
  for (let i = 0; i < 20; i++) {
    recordCorvaneLoss(run);
    lockCounterbuild(run, standardBuild(classes[i % 4], 7, T), 5); // every rebuild
    assert.strictEqual(JSON.stringify(resolveCorvaneBuild(run)), lockedSheet, `loop ${i}: the counter did not move`);
  }
  assert.strictEqual(run.corvane.losses, 20);
  assert.strictEqual(run.corvane.revealed, true, 'and the reveal fired only at the first loss');
});
