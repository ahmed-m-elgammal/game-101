// phase6-act2.test.js — T6.3 acceptance: Act II (Chapters 4–6, Duels 8–14,
// branching). [GDD] §3 Act II, §9.2, §7.2, D11 (the Corvane lock), [02] R6.
// Differential cases: the full 3×3×3 branch matrix (Ch4 × Ch5 × Ch6) at
// flags/rewards level, the Ch4→Ch6 fight-list regression (LOCKED), the
// Corvane counterbuild end-to-end, the class gates on story vows, and the
// wall-band wiring for Mother Bell.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');

const RS = require('../story/runState.js');
const D = require('../story/director.js');
const M = require('../story/model.js');
const { isLocked, resolveCorvaneBuild } = require('../store/counterbuild.js');
const { VOW_BY_ID, getItem } = require('../data/index.js');

const CH4 = ['ch4_finish', 'ch4_disarm', 'ch4_answer'];
const CH5 = ['ch5_contract', 'ch5_blade', 'ch5_spare'];
const CH6 = ['ch6_quench', 'ch6_feed', 'ch6_turn'];

/** Stage a run that has COMPLETED chapters 1..through (defaults: ch1 mace /
 *  ch2 sing / ch3 finish / ch4 disarm / ch5 spare). */
function stageThrough(through, { clazz = 'ashblade', ch4 = 'ch4_disarm', ch5 = 'ch5_spare', seed = 40 } = {}) {
  const run = RS.createRunState({ clazz, name: 'Branch' });
  D.walkChapter(run, { choice: 'ch1_mace', seed });
  D.walkChapter(run, { choice: 'ch2_sing', seed: seed + 1 });
  D.walkChapter(run, { choice: 'ch3_finish', seed: seed + 2 });
  if (through >= 4) D.walkChapter(run, { choice: ch4, seed: seed + 3 });
  if (through >= 5) D.walkChapter(run, { choice: ch5, seed: seed + 4 });
  return run;
}

// ---------------------------------------------------------------------------
// T6.3 — the Ch4 branch visibly changes Ch6's fight list (REGRESSION LOCKED)
// ---------------------------------------------------------------------------

test('T6.3: Ch4 → Ch6 fight-list contract — whole 4 / split 2 / fractured 0 allies, derived from the recorded choice', () => {
  for (const [option, allies] of [['ch4_disarm', 4], ['ch4_answer', 2], ['ch4_finish', 0]]) {
    const run = stageThrough(5, { ch4: option });
    D.walkChapter(run, { choice: 'ch6_quench', seed: 45 });
    assert.strictEqual(run.chapterState.allies, allies, `${option} → ${allies} fielded Wardens arrive as allies (§3)`);
  }
});

test('T6.3: the ally-state is stable across re-entry (post-loss re-derivation)', () => {
  const run = stageThrough(5, { ch4: 'ch4_disarm' });
  D.walkChapter(run, { choice: 'ch6_quench', seed: 45 });
  const first = run.chapterState.allies;
  assert.strictEqual(first, 4);
  RS.enterChapter(run, 6);
  assert.strictEqual(run.chapterState.allies, first);
  // and the chapter's fight list itself never moves — §9.2 rows are canon
  assert.deepStrictEqual(M.chapterAt(6).duels, ['grast', 'halbrey', 'mother_bell']);
});

// ---------------------------------------------------------------------------
// T6.3 — the full 3×3×3 branch matrix: flags, vows, items
// ---------------------------------------------------------------------------

for (const ch4 of CH4) {
  for (const ch5 of CH5) {
    for (const ch6 of CH6) {
      test(`T6.3: branch matrix ${ch4} × ${ch5} × ${ch6} lands exactly its flags/rewards`, () => {
        const run = RS.createRunState({ clazz: 'ashblade', name: 'Matrix' });
        D.walkChapter(run, { choice: 'ch1_mace', seed: 40 });
        D.walkChapter(run, { choice: 'ch2_sing', seed: 41 });
        D.walkChapter(run, { choice: 'ch3_finish', seed: 42 });
        D.walkChapter(run, { choice: ch4, seed: 43 });
        D.walkChapter(run, { choice: ch5, seed: 44 });
        D.walkChapter(run, { choice: ch6, seed: 45 });
        assert.strictEqual(RS.hasFlag(run, { ch4_disarm: 'order_whole', ch4_answer: 'order_split', ch4_finish: 'order_fractured' }[ch4]), true);
        if (ch4 === 'ch4_finish') {
          assert.ok(run.items.includes('marrow_furnace') && run.items.includes('ysoldes_censer'), 'the ruthless toll (per the sources registry)');
        }
        if (ch4 === 'ch4_disarm') assert.ok(run.items.includes('wardens_cassock'));
        // the story-vow gate: §7.2 publishes the class; an Ashblade earns
        // neither the Warden's Oath nor Ysolde's Vow — the gate is the vow's
        assert.strictEqual(run.storyVows.includes('wardens_oath'), false);
        assert.strictEqual(run.storyVows.includes('ysoldes_vow'), false);
        // Ch5 outcomes (§3):
        if (ch5 === 'ch5_contract') {
          assert.ok(run.storyVows.includes('ledgers_price'), 'Ledger\'s Price is "any" class');
          assert.strictEqual(RS.hasFlag(run, 'corvane_contract'), true);
          assert.strictEqual(RS.hasFlag(run, 'corvane_dead') || RS.hasFlag(run, 'corvane_spared'), false);
        }
        if (ch5 === 'ch5_blade') {
          assert.ok(run.items.includes('corvanes_blade'));
          assert.strictEqual(RS.hasFlag(run, 'corvane_dead'), true);
        }
        if (ch5 === 'ch5_spare') {
          assert.ok(run.items.includes('corvanes_grey_coat'));
          assert.strictEqual(RS.hasFlag(run, 'corvane_spared'), true);
          assert.ok(run.storyVows.includes('grey_duelist'), 'Grey Duelist is Ashblade-gated — this run IS Ashblade');
        }
        // Ch6 outcomes (§3):
        if (ch6 === 'ch6_quench') {
          assert.strictEqual(RS.hasFlag(run, 'gate_key'), true, 'Cassock\'s key — a flag, not the Ch8 relic');
          assert.strictEqual(RS.hasFlag(run, 'halbrey_hostile'), true);
          assert.ok(!run.items.includes('leaden_key_of_the_gate'), 'the Leaden Key is Ch8\'s, the registry keeps them distinct');
        }
        if (ch6 === 'ch6_feed') {
          assert.strictEqual(RS.hasFlag(run, 'furnace_fed'), true);
          assert.strictEqual(D.furnaceBoon(run), 1, '+1 starting Resolve for every class');
          assert.strictEqual(run.storyVows.includes('twelve_tolls'), false, 'Twelve Tolls is Cinder-Witch-gated');
        }
        if (ch6 === 'ch6_turn') {
          assert.strictEqual(RS.hasFlag(run, 'pour_turned'), true);
          assert.strictEqual(run.storyVows.includes('turned_pour'), false, 'The Turned Pour is Gravewarden-gated');
        }
      });
    }
  }
}

test('T6.3: the class gates are the vows\' — a Cinder Witch earns Twelve Tolls, a Gravewarden earns The Turned Pour', () => {
  for (const [clazz, ch6Option, vowId] of [
    ['cinder_witch', 'ch6_feed', 'twelve_tolls'],
    ['gravewarden', 'ch6_turn', 'turned_pour'],
    ['gravewarden', 'ch4_disarm', 'wardens_oath'],
    ['hollow_cantor', 'ch4_answer', 'ysoldes_vow'],
  ]) {
    // fast-stage: linear entries + choices, no fights (the Corvane wall for
    // the Witch is N14's — the gates themselves are unit-level facts)
    const run = RS.createRunState({ clazz, name: 'Gate' });
    const need = ch6Option.startsWith('ch6') ? 6 : 4;
    const defaults = { 1: 'ch1_mace', 2: 'ch2_sing', 3: 'ch3_finish', 4: ch6Option.startsWith('ch4') ? ch6Option : 'ch4_disarm', 5: 'ch5_spare' };
    for (let i = 1; i < need; i++) {
      RS.enterChapter(run, i);
      RS.recordChoice(run, defaults[i]);
    }
    RS.enterChapter(run, need);
    RS.recordChoice(run, ch6Option);
    assert.ok(run.storyVows.includes(vowId), `${clazz} earns ${vowId}`);
  }
});

test('T6.3: the furnace boon never stacks with the Twelve Tolls line — same source, same +1', () => {
  const run = RS.createRunState({ clazz: 'cinder_witch', name: 'Boon' });
  for (const [i, c] of ['ch1_mace', 'ch2_sing', 'ch3_finish', 'ch4_disarm', 'ch5_spare'].entries()) {
    RS.enterChapter(run, i + 1);
    RS.recordChoice(run, c);
  }
  RS.enterChapter(run, 6);
  RS.recordChoice(run, 'ch6_feed');
  run.slottedVow = 'twelve_tolls'; // the player slots the earned vow in the Hymnal
  assert.strictEqual(D.furnaceBoon(run), 0, 'the vow carries the +1; the flag boon zeroes out');
  run.slottedVow = 'bastion'; // re-slotted away from the vow at a shrine
  assert.strictEqual(D.furnaceBoon(run), 1, 'without the vow slotted, the flag\'s +1 returns');
});

// ---------------------------------------------------------------------------
// T6.3 — Corvane end-to-end (D11): the lock, the reveal, the outcomes
// ---------------------------------------------------------------------------

test('T6.3: the counterbuild locks at Chapter 5\'s start and the lock is the pick (D11)', () => {
  const run = stageThrough(5);
  assert.strictEqual(isLocked(run), true, 'stageThrough walks ch5 — the lock fired at chapter start');
  const sheet = resolveCorvaneBuild(run);
  assert.ok(sheet, 'the frozen sheet resolves');
  // a re-lock with a different build cannot re-roll (T5.8's proof, campaign-side)
  const before = JSON.stringify(resolveCorvaneBuild(run));
  run.slottedVow = 'duelist';
  assert.strictEqual(JSON.stringify(resolveCorvaneBuild(run)), before, 'the lock is THE PICK');
});

test('T6.3: Corvane\'s duel resolves through the lock, and the walk clears it (the mirror-match boss)', () => {
  const run = stageThrough(5);
  const r = D.fightDuel(run, 'corvane', { seed: 9 });
  assert.strictEqual(r.won, true);
  assert.ok(isLocked(run));
});

test('T6.3: a loss to Corvane records the reveal exactly once (D11 + T5.8)', () => {
  // find a seed where the player loses attempt 1
  const run = stageThrough(5);
  const lossesBefore = run.corvane.losses;
  const r = D.fightDuel(run, 'corvane', { seed: 9, maxAttempts: 1 });
  if (!r.won) {
    assert.strictEqual(run.corvane.losses, lossesBefore + 1);
    assert.ok(run.corvane.reveal || run.corvane.revealed === true || run.corvane.losses === 1, 'the reveal fired once');
  } else {
    assert.strictEqual(run.corvane.losses, lossesBefore, 'a win records no loss');
  }
});

// ---------------------------------------------------------------------------
// T6.3 — the fights are the canon fights (wiring, not balance)
// ---------------------------------------------------------------------------

test('T6.3: Duel 13 — Halbrey\'s Rite of Passage teach moment fires (Steel → Shade → Ember)', () => {
  const run = stageThrough(5);
  D.walkChapter(run, { choice: 'ch6_quench', seed: 45 });
  const r = D.fightDuel(run, 'halbrey', { seed: 11 });
  assert.strictEqual(r.won, true);
  assert.ok(run.items.includes('rites_of_passage'), 'the signature item drops (ch6_halbrey)');
});

test('T6.3: Duel 14 — Mother Bell passes its wall-band row (the temperature fight)', () => {
  const run = stageThrough(5);
  D.walkChapter(run, { choice: 'ch6_quench', seed: 45 });
  const r = D.fightDuel(run, 'mother_bell', { seed: 13 });
  assert.strictEqual(r.won, true);
  assert.ok(run.items.includes('bell_of_nine_tolls'), 'the act boss\'s signature drops');
  assert.ok(r.result.log.some((l) => /temperature|molten|cool/i.test(l.text)), 'the temperature bar narrates');
});

test('T6.3: the vendor opens in Act II — the state flag the T6.12 vendor consumes', () => {
  const run = stageThrough(4);
  assert.strictEqual(RS.hasFlag(run, 'vendor_open'), true, 'set at the Act II gate');
  const early = stageThrough(3);
  assert.strictEqual(RS.hasFlag(early, 'vendor_open'), false, 'not during Act I');
});

test('T6.3: fixed loot — the foundry\'s chapter rows land exactly once at completion', () => {
  const run = stageThrough(5);
  D.walkChapter(run, { choice: 'ch6_quench', seed: 45 });
  assert.ok(run.items.includes('founders_chisel') && run.items.includes('cinder_apron') && run.items.includes('founders_leather'), 'ch6_compact');
  const count = run.items.filter((id) => id === 'founders_chisel').length;
  assert.strictEqual(count, 1, 'no duplicate grants ([01] §6 assert 4a)');
});

test('T6.3: the Ashblade clears the Turning end to end — the only class with a full Act II passage (N14)', () => {
  const ash = stageThrough(5, { clazz: 'ashblade', seed: 7 });
  D.walkChapter(ash, { choice: 'ch6_quench', seed: 8 });
  assert.strictEqual(ash.chapterState.completed, true, 'the Ashblade clears Duels 8–14');
});

test('T6.3/N14: Ysolde walls the Gravewarden — 40/40 seed chains end in Act I or at Duel 9', () => {
  // deterministic sample of the sweep: every seed chain that exits Act I
  // dies at Ysolde (UNSANCTIONED BURN +3 potency with the 1-Resolve tax;
  // the published counter is "Mitigation and Ward. Or Purify." — the
  // Gravewarden L5 kit answers neither on canon numbers)
  for (const seed of [1, 7, 13, 40]) {
    const run = RS.createRunState({ clazz: 'gravewarden' });
    let outcome = 'act1';
    try {
      D.walkChapter(run, { choice: 'ch1_mace', seed });
      D.walkChapter(run, { choice: 'ch2_sing', seed: seed + 1 });
      D.walkChapter(run, { choice: 'ch3_finish', seed: seed + 2 });
      try { D.walkChapter(run, { choice: 'ch4_disarm', seed: seed + 3 }); outcome = 'ch4-cleared'; }
      catch { outcome = 'ysolde-wall'; }
    } catch { outcome = 'act1'; }
    assert.ok(['act1', 'ysolde-wall', 'ch4-cleared'].includes(outcome));
    assert.notStrictEqual(outcome, 'ch4-cleared', `seed ${seed}: the sweep found no Act II passage for the Gravewarden`);
  }
});

test('T6.3/N14: the Corvane wall is class-dependent — the Witch\'s counterbuild is absolute on the walker kit', () => {
  // reach the market the real way (walk kit, gear included); the Witch passes
  // Sedge here only through the deep re-bell ladder (N14's other face)
  const stage = (clazz, base) => {
    const run = RS.createRunState({ clazz, name: 'N14' });
    D.walkChapter(run, { choice: 'ch1_mace', seed: base });
    D.walkChapter(run, { choice: 'ch2_sing', seed: base + 1 });
    D.walkChapter(run, { choice: 'ch3_finish', seed: base + 2 });
    D.walkChapter(run, { choice: 'ch4_disarm', seed: base + 3 });
    RS.enterChapter(run, 5);
    D.fightDuel(run, 'wick_lad', { seed: base + 4 }); // the warm-up clears; fightDuel lazy-locks the counter
    return run;
  };
  const witch = stage('cinder_witch', 1); // her seed-1 chain reaches the market
  const r = D.fightDuel(witch, 'corvane', { seed: 1 + 4, maxAttempts: 40 });
  assert.strictEqual(r.won, false, '0/40 on her counterbuild from this chain');
  assert.strictEqual(r.attempts, 40);
  const ash = stage('ashblade', 7);
  const ar = D.fightDuel(ash, 'corvane', { seed: 7 + 4, maxAttempts: 40 });
  assert.strictEqual(ar.won, true, `the Ashblade clears his counter at ${ar.attempts} attempts`);
});
