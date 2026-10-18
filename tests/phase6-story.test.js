// phase6-story.test.js — T6.1 acceptance: the story data model & run state.
// [GDD] §3 (the nine chapters), §4.1 (hidden tallies), §13/§15 (story module,
// save shape), §17 (additive branches). Differential cases: graph walk,
// flag-injection, hiddenness architecture, serialization round-trips, and
// the nonsense-scenario guards (bad class, out-of-order chapters, double
// choices, memory-market edges).
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');

const M = require('../story/model.js');
const RS = require('../story/runState.js');
const { validate } = require('../data/schemas/validators.js');
const { SOURCE_BY_ID, ENEMY_BY_ID, VOW_BY_ID, ITEM_BY_ID, CLASS_IDS } = require('../data/index.js');

// ---------------------------------------------------------------------------
// T6.1 — the graph: 9 chapters × (prologue scene, duel nodes, choice, shrine)
// ---------------------------------------------------------------------------

test('T6.1: the campaign graph loads — 9 chapters, 3 acts, 21 duels, in order', () => {
  assert.strictEqual(M.CHAPTERS.length, 9);
  for (let i = 0; i < 9; i++) {
    const h = M.CHAPTERS[i];
    assert.strictEqual(h.index, i + 1);
    assert.strictEqual(h.act, Math.floor(i / 3) + 1);
  }
  const duels = M.CHAPTERS.flatMap((h) => h.duels);
  assert.strictEqual(duels.length, 21);
  assert.strictEqual(new Set(duels).size, 21, 'every duel appears exactly once');
  // §3.0: chapters 3, 6, 9 have three fights; the rest have two
  for (const h of M.CHAPTERS) {
    assert.strictEqual(h.duels.length, [3, 6, 9].includes(h.index) ? 3 : 2);
  }
  // every duel is a roster row, and the roster's duel number matches its walk position
  let pos = 0;
  for (const h of M.CHAPTERS) {
    h.duels.forEach((id, i) => {
      const row = ENEMY_BY_ID.get(id);
      assert.ok(row, `${id} resolves in the roster`);
      assert.strictEqual(row.duel, pos + i + 1, `${id} is duel ${pos + i + 1} (§9's numbering)`);
      assert.strictEqual(row.chapter, h.index);
    });
    pos += h.duels.length;
  }
});

test('T6.1: every chapter node validates against the frozen chapter/scene schema kinds', () => {
  for (const h of M.CHAPTERS) {
    assert.deepStrictEqual(validate('chapter', h, {}), { ok: true, errors: [] }, h.id);
    for (const scene of [h.scene, h.shrine]) {
      assert.deepStrictEqual(validate('scene', scene, {}), { ok: true, errors: [] }, scene.id);
      assert.ok(scene.prose.length >= 1);
    }
  }
});

test('T6.1: the graph walk is reachable in order — chapterAt/choiceFor line up with the walk', () => {
  for (let i = 1; i <= 9; i++) {
    assert.strictEqual(M.chapterAt(i).index, i);
    const choice = M.choiceFor(i);
    if (i < 9) assert.ok(M.CHOICES.includes(choice), `ch${i} choice is a story choice`);
    else assert.strictEqual(choice, M.FINAL_CHOICE);
  }
  assert.throws(() => M.chapterAt(0), /no chapter/);
  assert.throws(() => M.chapterAt(10), /no chapter/);
});

test('T6.1: act bosses are the chapter\'s last duel and the canon rows (First Vespers, Mother Bell, Ilvane)', () => {
  assert.strictEqual(M.chapterAt(3).actBoss, 'first_vespers');
  assert.strictEqual(M.chapterAt(6).actBoss, 'mother_bell');
  assert.strictEqual(M.chapterAt(9).actBoss, 'ilvane');
  for (const h of M.CHAPTERS) {
    if (h.actBoss) assert.strictEqual(h.duels[h.duels.length - 1], h.actBoss, `${h.id}: the act boss closes the chapter`);
  }
});

test('T6.1: a shrine node per chapter — and F24\'s tenth shrine is named as the crypt\'s hidden one', () => {
  for (const h of M.CHAPTERS) assert.strictEqual(h.hasShrine, true);
  const last = M.chapterAt(9).shrine.prose.map((p) => p.text).join(' ');
  assert.match(last, /tenth shrine/);
  // and the tenth shrine EXISTS as data (the inventory counts 10 — F24)
  assert.deepStrictEqual(validate('scene', M.HIDDEN_SHRINE, {}), { ok: true, errors: [] });
  assert.strictEqual(M.HIDDEN_SHRINE.id, 'crypt_hidden_shrine');
});

// ---------------------------------------------------------------------------
// T6.1 — the choice table: 9 choices, sources resolve, gates are the vows'
// ---------------------------------------------------------------------------

test('T6.1: eight story choices × exactly 3 options + the final node × 4', () => {
  assert.strictEqual(M.CHOICES.length, 8);
  for (const c of M.CHOICES) {
    assert.strictEqual(c.options.length, 3);
    assert.deepStrictEqual(validate('choice', { id: c.id, chapter: c.chapter, prompt: c.prompt, options: c.options }, {}), { ok: true, errors: [] }, c.id);
    const tallies = c.options.map((o) => o.tally);
    for (const t of tallies) assert.ok(M.TALLIES.includes(t));
  }
  assert.strictEqual(M.FINAL_CHOICE.options.length, 4);
  assert.strictEqual(M.FINAL_CHOICE.options.filter((o) => o.hidden).length, 1);
});

test('T6.1: every option\'s source resolves in data/sources.js under its own chapter', () => {
  for (const c of M.CHOICES) {
    for (const o of c.options) {
      if (!o.source) continue;
      const src = SOURCE_BY_ID.get(o.source);
      assert.ok(src, `${o.id}: source ${o.source} resolves`);
      assert.strictEqual(src.chapter, Number(c.chapter.slice(2)));
    }
  }
});

test('T6.1: F26/A2 — all three Ch1 paths grant their item, exactly as decided', () => {
  const c = M.CHOICES.find((x) => x.id === 'ch1_choice');
  const grants = {
    ch1_mace: ['pallbearers_mace'],
    ch1_shroud: ['sextons_shroud'],
    ch1_hymn: ['grave_shovel_of_bram'],
  };
  for (const o of c.options) {
    assert.deepStrictEqual(SOURCE_BY_ID.get(o.source).grants, grants[o.id], `${o.id} grants its own item`);
    assert.ok(ITEM_BY_ID.get(grants[o.id][0]));
  }
});

test('T6.1: Ch2\'s "pay the toll in memories" is narrative-only — no memory moves', () => {
  const c = M.CHOICES.find((x) => x.id === 'ch2_choice');
  const toll = c.options.find((o) => o.id === 'ch2_toll');
  assert.strictEqual(toll.narrativeOnly, true);
  // all three carry the same material grant (the registry's word)
  assert.deepStrictEqual(
    c.options.map((o) => o.source),
    ['ch2_choice', 'ch2_choice', 'ch2_choice'],
  );
});

test('T6.1: story-vow rewards name real story vows, class-gated per §7.2', () => {
  for (const c of M.CHOICES) {
    for (const o of c.options) {
      if (!o.vow) continue;
      const vow = VOW_BY_ID.get(o.vow);
      assert.ok(vow && vow.kind === 'story', `${o.vow} is a story vow`);
      // the §7.2 gate: 'any' or the published class
      assert.ok(vow.cls === 'any' || CLASS_IDS.includes(vow.cls));
      // the vow sources back to the tally path of the SAME chapter (ch5
      // carries two ruthless options under one registry row — the 1:1
      // option wiring lives in the choice table; see the ch5 note)
      if (vow.source) {
        assert.strictEqual(SOURCE_BY_ID.get(vow.source).chapter, Number(c.chapter.slice(2)), `${o.vow} sources from chapter ${c.chapter}`);
      }
    }
  }
});

test('T6.1: the Ch4 → Ch6 ally-state contract is exactly §3\'s four/two/none', () => {
  assert.strictEqual(M.ch6AlliesFor('ch4_disarm'), 4);  // Mercy — the Order whole
  assert.strictEqual(M.ch6AlliesFor('ch4_answer'), 2);  // Devotion — the Order splits
  assert.strictEqual(M.ch6AlliesFor('ch4_finish'), 0);  // Ruthless — fractured
  assert.throws(() => M.ch6AlliesFor('ch1_mace'), /no Ch6 ally-state/);
});

test('T6.1: the flag registry is typed, documented, and the whole surface', () => {
  assert.ok(M.FLAGS.length >= 13);
  for (const f of M.FLAGS) {
    assert.ok(['world', 'progression', 'boon', 'ally', 'unlock', 'reward'].includes(f.type), f.id);
    assert.ok(f.doc && f.doc.length > 10, `${f.id} documents itself`);
    assert.ok(Array.isArray(f.consumers) && f.consumers.length > 0, `${f.id} names its consumers`);
  }
});

// ---------------------------------------------------------------------------
// T6.1 — run state: creation, chapter order, tallies hidden, serialization
// ---------------------------------------------------------------------------

test('T6.1: createRunState — class-gated, 4 creation points, the candle starts in the bag', () => {
  for (const clazz of CLASS_IDS) {
    const run = RS.createRunState({ clazz });
    assert.strictEqual(run.level, 1);
    assert.strictEqual(run.chapter, 0);
    assert.deepStrictEqual(Object.values(run.creation).reduce((a, b) => a + b, 0), 4);
    assert.deepStrictEqual(run.items, ['candle_of_saint_orrin']);
    assert.deepStrictEqual(run.tallies, { mercy: 0, ruthless: 0, devotion: 0 });
  }
  assert.throws(() => RS.createRunState({ clazz: 'necromancer' }), /unknown class/);
  assert.throws(() => RS.createRunState({ clazz: 'ashblade', creation: { mig: 3 } }), /exactly 4/);
});

test('T6.1: chapters cannot be entered out of order (§3.0 — the walk is linear)', () => {
  const run = RS.createRunState({ clazz: 'ashblade' });
  assert.throws(() => RS.enterChapter(run, 2), /linear/);
  assert.throws(() => RS.enterChapter(run, 9), /linear/);
  RS.enterChapter(run, 1);
  assert.throws(() => RS.enterChapter(run, 3), /linear/);
  RS.enterChapter(run, 1); // re-entry (post-loss) is legal
  assert.strictEqual(run.chapter, 1);
});

test('T6.1: one choice per chapter; a wrong-chapter or unknown option is refused', () => {
  const run = RS.createRunState({ clazz: 'ashblade' });
  RS.enterChapter(run, 1);
  RS.recordChoice(run, 'ch1_mace');
  assert.throws(() => RS.recordChoice(run, 'ch1_shroud'), /one story choice per chapter/);
  const run2 = RS.createRunState({ clazz: 'ashblade' });
  RS.enterChapter(run2, 1);
  assert.throws(() => RS.recordChoice(run2, 'ch4_disarm'), /belongs to chapter 4/);
  assert.throws(() => RS.recordChoice(run2, 'ch1_nonsense'), /unknown choice option/);
});

test('T6.1: §4.1 — the tallies are never in the play projection (architecture)', () => {
  const run = RS.createRunState({ clazz: 'hollow_cantor' });
  RS.enterChapter(run, 1);
  RS.recordChoice(run, 'ch1_hymn');
  const visible = JSON.stringify(RS.visibleRunStateOf(run));
  for (const banned of ['tallies', 'mercy', 'ruthless', 'devotion', 'unmake', 'choices']) {
    assert.ok(!visible.includes(banned), `the projection never carries "${banned}"`);
  }
  // …while the save holds the truth (the schema requires the tallies)
  const save = JSON.stringify(RS.toSaveState(run));
  assert.ok(save.includes('tallies'));
});

test('T6.1: serialization round-trips byte-identically at every stage of a run', () => {
  const stages = [];
  const run = RS.createRunState({ clazz: 'cinder_witch' });
  RS.enterChapter(run, 1);
  stages.push(JSON.parse(JSON.stringify(run)));
  RS.payFightXp(run, 1, 'regular');
  RS.recordChoice(run, 'ch1_shroud');
  RS.payChapterXp(run);
  RS.enterChapter(run, 2);
  stages.push(JSON.parse(JSON.stringify(run)));
  // the save exists once the campaign opens (the schema pins chapter 1–9)
  const fresh = RS.createRunState({ clazz: 'ashblade' });
  assert.throws(() => RS.toSaveState(fresh), /not opened Chapter 1/);
  for (const snapshot of stages) {
    const save = RS.toSaveState(snapshot);
    const back = RS.fromSaveState(JSON.parse(JSON.stringify(save)));
    assert.deepStrictEqual(back, snapshot, 'fromSaveState(toSaveState(run)) === run');
  }
});

test('T6.1: the save shape validates against the frozen saveState schema', () => {
  const run = RS.createRunState({ clazz: 'gravewarden' });
  RS.enterChapter(run, 1);
  RS.recordChoice(run, 'ch1_mace');
  const save = RS.toSaveState(run);
  assert.deepStrictEqual(validate('saveState', save, {}), { ok: true, errors: [] });
  // a non-conforming run is a REJECTION (chapter out of the schema's range)
  assert.throws(() => RS.toSaveState({ ...run, chapter: 10 }), /rejected/);
});

test('T6.1: fromSaveState refuses junk — wrong version, garbage shapes', () => {
  assert.throws(() => RS.fromSaveState(null), /required/);
  assert.throws(() => RS.fromSaveState({ version: 2, run: {} }), /unsupported save version/);
  assert.throws(() => RS.fromSaveState({ version: 1, run: { clazz: 'nope', level: 1, xp: 0, tallies: {}, memoriesSold: [], creation: {}, levelUps: {}, choices: [], items: [], storyVows: [], flags: {}, floor: {}, unmake: {} } }), /unknown class/);
});

// ---------------------------------------------------------------------------
// T6.1 — memory market + Unmake inputs (D13/D14, §4.4)
// ---------------------------------------------------------------------------

function runWithChoice(optionId) {
  const run = RS.createRunState({ clazz: 'ashblade' });
  RS.enterChapter(run, 1);
  RS.recordChoice(run, optionId);
  return run;
}

test('T6.1: selling a memory marks it *—sold—*, keeps the tally + rewards, closes the Unmake path', () => {
  const run = runWithChoice('ch1_mace');
  const tallyBefore = run.tallies.ruthless;
  const itemsBefore = run.items.length;
  RS.sellMemory(run, 'ch1_mace');
  assert.deepStrictEqual(run.memoriesSold, ['ch1_mace']);
  assert.strictEqual(run.tallies.ruthless, tallyBefore, 'the tally contribution survives (D13)');
  assert.strictEqual(run.items.length, itemsBefore, 'every reward survives (D13)');
  assert.strictEqual(run.unmake.closed, true, '"Pell does not sell back what the candle gives him"');
  assert.throws(() => RS.sellMemory(run, 'ch1_mace'), /already/);
  assert.throws(() => RS.sellMemory(run, 'ch1_shroud'), /never made that choice/);
});

test('T6.1: the baton is not for sale — the final choice is an ending, not a memory', () => {
  const run = runWithChoice('ch1_mace');
  assert.throws(() => RS.sellMemory(run, 'ch9_silence'), /not for sale/);
});

test('T6.1: the Unmake eligibility inputs ride the run state (T6.8 evaluates them)', () => {
  const run = RS.createRunState({ clazz: 'cinder_witch' });
  assert.deepStrictEqual(run.unmake, { lostToOwnEcho: 0, closed: false });
  // the provisional Burn-verse counter (T6.8 input; the Witch unlocks 3 by L7)
  assert.strictEqual(RS.burnVersesUnlocked('cinder_witch', 1), 2); // spark, stoke
  assert.strictEqual(RS.burnVersesUnlocked('cinder_witch', 7), 3); // + sear_the_note
  assert.strictEqual(RS.burnVersesUnlocked('ashblade', 10), 0);    // the Burn set is the Witch's
});

// ---------------------------------------------------------------------------
// T6.1 — D2 level-sync arithmetic + the XP economy edges
// ---------------------------------------------------------------------------

test('T6.1: band ceilings + D2 sync math (cap 3)', () => {
  assert.strictEqual(RS.bandCeiling(1), 2);
  assert.strictEqual(RS.bandCeiling(9), 10);
  assert.strictEqual(RS.syncLevelsFor(1, 1), 0);
  assert.strictEqual(RS.syncLevelsFor(2, 1), 0);
  assert.strictEqual(RS.syncLevelsFor(3, 1), 1);
  assert.strictEqual(RS.syncLevelsFor(6, 2), 3); // ceiling 3 → capped
  assert.strictEqual(RS.syncLevelsFor(10, 2), 3, 'the cap holds — the wall holds at +3');
  assert.strictEqual(RS.syncLevelsFor(10, 9), 0); // the finale's band is 9–10
});

test('T6.1: choices never pay XP and levels never bank a point', () => {
  const run = RS.createRunState({ clazz: 'ashblade' });
  RS.enterChapter(run, 1);
  const xpBefore = run.xp;
  RS.recordChoice(run, 'ch1_mace');
  assert.strictEqual(run.xp, xpBefore, '[01] §4: story choices pay 0');
  // the L1→L2 level-up assigns exactly +2 points, immediately
  const sumBefore = STAT_SUM(run.levelUps);
  RS.payFightXp(run, 2, 'boss'); // 32 XP → crosses 40? no: 32 < 40 — stays L1
  assert.strictEqual(run.level, 1);
  RS.payChapterXp(run); // +10 → 42 ≥ 40 → L2
  assert.strictEqual(run.level, 2);
  assert.strictEqual(STAT_SUM(run.levelUps) - sumBefore, 2, 'never banked ([01] §4)');
  // loud edges
  assert.throws(() => RS.payFightXp(run, 0, 'regular'), /out of range/);
  assert.throws(() => RS.payFightXp(run, 1, 'nonsense'), /unknown fight role/);
});

function STAT_SUM(o) { return Object.values(o).reduce((a, b) => a + b, 0); }

test('T6.1: flags are registry-typed — an unknown flag is a refusal, not a shrug', () => {
  const run = RS.createRunState({ clazz: 'ashblade' });
  RS.setFlag(run, 'floor_unlocked');
  assert.strictEqual(RS.hasFlag(run, 'floor_unlocked'), true);
  assert.throws(() => RS.setFlag(run, 'infinite_money'), /unknown run flag/);
});
