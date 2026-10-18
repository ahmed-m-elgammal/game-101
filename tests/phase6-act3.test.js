// phase6-act3.test.js — T6.4 acceptance: Act III (Chapters 7–9, Duels 15–21,
// the finale). [GDD] §3 Act III, §4.4 (the hidden hook), §9.3, D30/D4,
// [02] R7d (the ally bodies). Differential cases: the Ch7/Ch8 reward paths,
// the Duel 21 ally integration (Turned Pour / Oren / both), Ilvane's three
// phases, Duel 20's no-debuff guarantee, and the final choice + the gate.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');

const RS = require('../story/runState.js');
const D = require('../story/director.js');
const M = require('../story/model.js');
const { createSession, runToCompletion, resultsOf, spawnAlly } = require('../engine/fight.js');
const { CANON } = require('../data/config.js');
const { getVerse } = require('../data/verses.js');
const { getEnemy, enemyBuild, TURNED_POUR_ALLY } = require('../data/enemies.js');
const { VOW_BY_ID } = require('../data/index.js');

/** The verified full-passage kit: an Ashblade, the seed-7 chain. */
function stageAct3({ ch4 = 'ch4_disarm', ch5 = 'ch5_spare', ch6 = 'ch6_quench', ch7 = 'ch7_read', ch8 = 'ch8_sendup', seed = 7 } = {}) {
  const run = RS.createRunState({ clazz: 'ashblade', name: 'Act3' });
  D.walkChapter(run, { choice: 'ch1_mace', seed });
  D.walkChapter(run, { choice: 'ch2_sing', seed: seed + 1 });
  D.walkChapter(run, { choice: 'ch3_finish', seed: seed + 2 });
  D.walkChapter(run, { choice: ch4, seed: seed + 3 });
  D.walkChapter(run, { choice: ch5, seed: seed + 4 });
  D.walkChapter(run, { choice: ch6, seed: seed + 5 });
  D.walkChapter(run, { choice: ch7, seed: seed + 6 });
  D.walkChapter(run, { choice: ch8, seed: seed + 7 });
  return run;
}

/** Unit-level staging: linear entries + choices, no fights. */
function fastStage(clazz, choices) {
  const run = RS.createRunState({ clazz, name: 'Fast' });
  choices.forEach((c, i) => {
    RS.enterChapter(run, i + 1);
    RS.recordChoice(run, c);
  });
  return run;
}

// ---------------------------------------------------------------------------
// T6.4 — Ch7 and Ch8 reward paths land exactly as decided
// ---------------------------------------------------------------------------

test('T6.4: Ch7 — read the name (Fixed Point, any) / burn it (No Paper, Cantor-gated) / keep it (The Kept Name, D30)', () => {
  const gates = [
    ['ch7_read', 'fixed_point', 'any'],
    ['ch7_burn', 'no_paper', 'hollow_cantor'],
    ['ch7_keep', 'kept_name', 'any'],
  ];
  for (const [option, vowId, gate] of gates) {
    const vow = VOW_BY_ID.get(vowId);
    assert.strictEqual(vow.source, `ch7_${option === 'ch7_read' ? 'devotion' : option === 'ch7_burn' ? 'mercy' : 'ruthless'}`, `${vowId} sources from its choice row`);
    // an Ashblade earns the 'any' vows, never the Cantor-gated one
    const run = fastStage('ashblade', ['ch1_mace', 'ch2_sing', 'ch3_finish', 'ch4_disarm', 'ch5_spare', 'ch6_quench', option]);
    const earned = run.storyVows.includes(vowId);
    assert.strictEqual(earned, gate === 'any', `${option} → ${vowId} ${gate === 'any' ? 'earned' : 'gated for an Ashblade'}`);
  }
  // the Cantor earns No Paper
  const cantor = fastStage('hollow_cantor', ['ch1_mace', 'ch2_sing', 'ch3_finish', 'ch4_disarm', 'ch5_spare', 'ch6_quench', 'ch7_burn']);
  assert.ok(cantor.storyVows.includes('no_paper'), 'the Cantor earns No Paper');
});

test('T6.4: Ch8 — send her up (Oren\'s Post + the flag) / take the ring (Vigil\'s Ring, D4-canonical) / walk past (The Long Walk Down)', () => {
  const up = fastStage('ashblade', ['ch1_mace', 'ch2_sing', 'ch3_finish', 'ch4_disarm', 'ch5_spare', 'ch6_quench', 'ch7_read', 'ch8_sendup']);
  assert.ok(up.storyVows.includes('oren_s_post'), 'Oren\'s Post (D4)');
  assert.strictEqual(RS.hasFlag(up, 'oren_sent_up'), true);
  const ring = fastStage('ashblade', ['ch1_mace', 'ch2_sing', 'ch3_finish', 'ch4_disarm', 'ch5_spare', 'ch6_quench', 'ch7_read', 'ch8_ring']);
  assert.ok(ring.items.includes('vigils_ring') && ring.items.includes('vigils_mantle'), 'the ring row (ch8_ruthless)');
  const walk = fastStage('ashblade', ['ch1_mace', 'ch2_sing', 'ch3_finish', 'ch4_disarm', 'ch5_spare', 'ch6_quench', 'ch7_read', 'ch8_walk']);
  assert.ok(walk.storyVows.includes('long_walk_down'), 'The Long Walk Down');
  assert.strictEqual(RS.hasFlag(walk, 'oren_sent_up'), false);
});

// ---------------------------------------------------------------------------
// T6.4 — Duel 21 ally integration (the R7d pattern)
// ---------------------------------------------------------------------------

function duel21Session(run, seed) {
  const player = D.playerBuildOf(run);
  const enemy = D.enemyBuildFor(run, 'ilvane');
  const session = createSession(player, enemy, { seed, tuning: CANON });
  const spawned = D.spawnCampaignAllies(session, run);
  return { session, spawned, player, enemy };
}

test('T6.4: the Turned Pour ally joins Duel 21 exactly as [02] R7d publishes it', () => {
  const run = fastStage('ashblade', ['ch1_mace', 'ch2_sing', 'ch3_finish', 'ch4_disarm', 'ch5_spare', 'ch6_turn', 'ch7_read', 'ch8_walk']);
  const { session, spawned } = duel21Session(run, 9);
  assert.deepStrictEqual(spawned, ['turned_pour']);
  const ally = session.fighters.a.guards[0];
  assert.ok(ally, 'the bell stands beside the Vigil');
  assert.strictEqual(ally.sheet.name, 'The Turned Pour');
  assert.strictEqual(ally.maxHp, 140, 'the R7d HP line');
  assert.strictEqual(ally.statuses.thorns.value, 6, 'Thorns 6');
  assert.strictEqual(ally.isAlly, true);
  assert.strictEqual(ally.sheet.special.debuffImmune.includes('curse'), true, 'cannot be targeted by Ilvane\'s Curse');
  runToCompletion(session);
  assert.ok(session.log.some((l) => /fights beside/.test(l.text)), 'the narration names the ally');
});

test('T6.4: the Oren-present variant — she waits at the top of the stair, and it changes that fight', () => {
  const run = fastStage('ashblade', ['ch1_mace', 'ch2_sing', 'ch3_finish', 'ch4_disarm', 'ch5_spare', 'ch6_quench', 'ch7_read', 'ch8_sendup']);
  const { session, spawned } = duel21Session(run, 9);
  assert.deepStrictEqual(spawned, ['oren']);
  const ally = session.fighters.a.guards[0];
  assert.match(ally.sheet.name, /Oren/);
  assert.strictEqual(ally.maxHp, 172, 'her published sheet — data, not design');
  assert.strictEqual(ally.sheet.special.regenPerTurn, 4, 'her regen rides the ally body');
  // the variant is real: same seed, no ally → a different fight
  const plain = createSession(D.playerBuildOf(run), D.enemyBuildFor(run, 'ilvane'), { seed: 9, tuning: CANON });
  runToCompletion(plain);
  runToCompletion(session);
  const withAlly = JSON.stringify(resultsOf(session));
  const without = JSON.stringify(resultsOf(plain));
  assert.notStrictEqual(withAlly, without, 'the Oren-present variant changes Duel 21 (state assert)');
});

test('T6.4: both allies stand when both flags are set — the turn and the send-up stack', () => {
  const run = fastStage('ashblade', ['ch1_mace', 'ch2_sing', 'ch3_finish', 'ch4_disarm', 'ch5_spare', 'ch6_turn', 'ch7_read', 'ch8_sendup']);
  const { session, spawned } = duel21Session(run, 9);
  assert.deepStrictEqual(spawned, ['turned_pour', 'oren']);
  assert.strictEqual(session.fighters.a.guards.length, 2);
  // and the walker takes them through the real fight
  RS.enterChapter(run, 9);
  const r = D.fightDuel(run, 'ilvane', { seed: 21, maxAttempts: 40 });
  assert.strictEqual(r.won, true, 'the finale is clearable with both allies');
});

test('T6.4: the furnace-fed boon is live in the finale (+1 starting Resolve, every fight, forever)', () => {
  const fed = fastStage('ashblade', ['ch1_mace', 'ch2_sing', 'ch3_finish', 'ch4_disarm', 'ch5_spare', 'ch6_feed', 'ch7_read', 'ch8_walk']);
  const build = D.playerBuildOf(fed);
  assert.strictEqual(build.startResolveBonus, 1, 'the run boon rides the build');
  const sheet = require('../engine/fighter.js').buildSheet(build, CANON);
  const mods = require('../engine/fighter.js').vowMods(sheet, CANON);
  assert.strictEqual(mods.startResolveBonus, 1);
  // a Twelve Tolls Witch slots the vow instead — same +1, never stacked
  const witch = fastStage('cinder_witch', ['ch1_mace', 'ch2_sing', 'ch3_finish', 'ch4_disarm', 'ch5_spare', 'ch6_feed', 'ch7_read', 'ch8_walk']);
  witch.slottedVow = 'twelve_tolls';
  const wbuild = D.playerBuildOf(witch);
  assert.strictEqual(wbuild.startResolveBonus, undefined, 'the boon zeroes when the vow carries it');
  const wsheet = require('../engine/fighter.js').buildSheet(wbuild, CANON);
  const wmods = require('../engine/fighter.js').vowMods(wsheet, CANON);
  assert.strictEqual(wmods.startResolveBonus, 1, 'the vow\'s own startBonus lands');
});

// ---------------------------------------------------------------------------
// T6.4 — the canon fights of the Choir
// ---------------------------------------------------------------------------

test('T6.4: Duel 20 — Ilvane\'s Second uses no debuffs at all (a genuine change of pace)', () => {
  // data-level: no verse in his pool carries a debuff op
  const row = getEnemy('ilvanes_second');
  for (const id of row.verses) {
    const v = getVerse(id);
    const debuffOps = (v.effects || []).filter((e) => ['bleed+', 'burn', 'curse', 'fray', 'hush', 'stun'].includes(e.op));
    assert.deepStrictEqual(debuffOps, [], `${id} carries no debuff op`);
  }
  // and the fight log never applies one
  const run = stageAct3({});
  RS.enterChapter(run, 9);
  const r = D.fightDuel(run, 'ilvanes_second', { seed: 15, maxAttempts: 40 });
  const log = r.result.log.map((l) => l.text || '').join('\n');
  for (const banned of ['is Bleeding', 'burns for', 'is Cursed', 'is Hushed', "'s guard frays", 'is Stunned']) {
    assert.ok(!log.includes(banned), `Duel 20's log never applies: ${banned}`);
  }
});

test('T6.4: Duel 21 — Ilvane\'s three phases play (the Duellist, the Hymn, the Baton)', () => {
  const run = stageAct3({});
  RS.enterChapter(run, 9);
  const r = D.fightDuel(run, 'ilvane', { seed: 21, maxAttempts: 40 });
  assert.strictEqual(r.won, true);
  const log = r.result.log.map((l) => l.text || '').join('\n');
  assert.ok(/summons|throws itself/i.test(log), 'Phase II: the Hymn summons at the bands');
  assert.ok(/is learning|copies your/i.test(log), 'Phase III: the Baton learns the most-cast slotted verse');
  assert.ok(r.result.rounds <= 20, 'the Last Bell bounds the finale (D8)');
});

test('T6.4: D1 — the campaign delivers L9 by the Bellmouth and L10 on Ilvane\'s corpse', () => {
  const run = stageAct3({});
  assert.ok(run.level >= 9, `the Bellmouth arrival: L${run.level}`);
  D.walkChapter(run, { choice: 'ch9_silence', seed: 21 }); // the finale, prose closed
  assert.strictEqual(run.level, 10, 'L10 is crossed by the finale itself');
  assert.strictEqual(run.xp, 1157, 'the N11-recorded cumulative walk reproduces exactly');
  assert.strictEqual(run.ending, 'ending_a');
});

// ---------------------------------------------------------------------------
// T6.4 — the final choice: three endings + the hidden hook
// ---------------------------------------------------------------------------

test('T6.4: the final choice reaches all three endings, filtered by the tallies the run made', () => {
  // the stageAct3 chain with ch8_ring: mace R, sing D, finish R, disarm M,
  // spare M, quench M, read D, ring R → Mercy 3 · Ruthless 3 · Devotion 2
  const tallies = { mercy: 3, ruthless: 3, devotion: 2 };
  for (const [option, ending] of [
    ['ch9_silence', 'ending_a'],
    ['ch9_baton', 'ending_c'],
    ['ch9_sing', 'ending_b'],
  ]) {
    const run = stageAct3({ ch8: 'ch8_ring' });
    RS.enterChapter(run, 9);
    for (const duel of ['unbound_chorus', 'ilvanes_second', 'ilvane']) {
      D.fightDuel(run, duel, { seed: 21, maxAttempts: 40 });
    }
    D.finalChoice(run, option);
    assert.strictEqual(run.ending, ending);
    assert.deepStrictEqual(run.tallies, tallies, `${option}: the hidden tally behind the epilogue filter`);
    assert.strictEqual(run.choices.length, 9, 'nine choices, one per chapter');
  }
});

test('T6.4: the fourth thing never renders unmet — the hook exists and the gate is T6.8\'s', () => {
  const node = M.FINAL_CHOICE;
  assert.strictEqual(node.options.length, 4);
  const hidden = node.options.find((o) => o.hidden);
  assert.strictEqual(hidden.id, 'ch9_unmake');
  assert.strictEqual(hidden.gate, 'unmake');
  // default: closed
  const run = stageAct3({});
  RS.enterChapter(run, 9);
  for (const duel of ['unbound_chorus', 'ilvanes_second', 'ilvane']) D.fightDuel(run, duel, { seed: 21, maxAttempts: 40 });
  assert.throws(() => D.finalChoice(run, 'ch9_unmake'), /the fourth thing is not there/);
  // the three canon paths remain
  assert.throws(() => D.finalChoice(run, 'ch9_nonsense'), /unknown final option/);
});

test('T6.4: when the gate opens (T6.8\'s evaluator, stubbed here), the fourth thing records the Unmake ending', () => {
  const run = stageAct3({});
  RS.enterChapter(run, 9);
  for (const duel of ['unbound_chorus', 'ilvanes_second', 'ilvane']) D.fightDuel(run, duel, { seed: 21, maxAttempts: 40 });
  D.finalChoice(run, 'ch9_unmake', { unmakeGate: true });
  assert.strictEqual(run.ending, 'ending_unmake');
  // and a run is ended: no further choices (the one-per-chapter gate fires first)
  assert.throws(() => RS.recordChoice(run, 'ch9_silence'), /already chose|the run has ended/);
});

// ---------------------------------------------------------------------------
// T6.4 — the addon: spawnAlly's contract + the §10.11 record
// ---------------------------------------------------------------------------

test('T6.4: spawnAlly refuses without an owner and the ally body acts once per round', () => {
  const s = createSession(
    D.playerBuildOf(stageAct3({})),
    enemyBuild(getEnemy('ilvane')),
    { seed: 3, tuning: CANON },
  );
  assert.throws(() => spawnAlly(s, null, D.turnedPourAllyBuild()), /owner fighter required/);
  const ally = spawnAlly(s, s.fighters.a, D.turnedPourAllyBuild(), { thorns: TURNED_POUR_ALLY.startThorns });
  assert.strictEqual(ally.sheet.verses.length, 1, 'one signature action per round');
  assert.strictEqual(ally.sheet.verses[0], 'strike');
  runToCompletion(s);
  // the bell acted: strike lines appear with the ally as the actor
  const acted = s.log.filter((l) => l.side === 'a' && /The Turned Pour/.test(l.text || '')).length;
  assert.ok(acted > 0, 'the bell attacked during the fight');
});

test('T6.4: the dampened mark persists on the profile and never rides an export', () => {
  const run = stageAct3({});
  const save = RS.toSaveState(run);
  assert.strictEqual(save.run.dampened, run.dampened);
  const visible = JSON.stringify(RS.visibleRunStateOf(run));
  assert.strictEqual(visible.includes('dampened'), false, 'the assist mark is profile-side, not play-surface');
});
