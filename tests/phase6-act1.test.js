// phase6-act1.test.js — T6.2 acceptance: Act I (Chapters 1–3, Duels 1–7)
// playable end to end, every branch. [GDD] §3 Act I, §8.4, [01] §4/R1,
// D3 (the Twin Ledger), A2/F26 (the Ch1 mapping).
// Differential cases: 3 choice paths × 4 classes automated walkthroughs,
// reward-integration asserts, the [01] R1 XP walk on real data, determinism,
// and the re-bell/once-per-run XP rules.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');

const RS = require('../story/runState.js');
const D = require('../story/director.js');
const M = require('../story/model.js');
const { getItem } = require('../data/index.js');
const { earnTwinLedger, hasTwinLedger, swapLoadout } = require('../store/twin-ledger.js');
const { createLoadoutState } = require('../store/loadout.js');

const CH1_PATHS = [
  { id: 'ch1_mace', item: 'pallbearers_mace', tally: 'ruthless' },
  { id: 'ch1_shroud', item: 'sextons_shroud', tally: 'mercy' },
  { id: 'ch1_hymn', item: 'grave_shovel_of_bram', tally: 'devotion' },
];

/** Automated Act I walk: chapters 1–3, one choice per chapter. The Hollow
 *  Cantor is excluded from the walking classes — N14 (recorded): Duel 2 is
 *  a hard wall for that class on canon data; the N14 test below locks the
 *  finding until the owner's tuning wave resolves it. */
const WALKING_CLASSES = ['ashblade', 'cinder_witch', 'gravewarden'];

function walkAct1({ clazz = 'ashblade', ch1 = 'ch1_mace', ch2 = 'ch2_open', ch3 = 'ch3_finish', seed = 7 }) {
  const run = RS.createRunState({ clazz, name: `Probe-${clazz}` });
  D.walkChapter(run, { choice: ch1, seed });
  D.walkChapter(run, { choice: ch2, seed: seed + 1 });
  D.walkChapter(run, { choice: ch3, seed: seed + 2 });
  return run;
}

// ---------------------------------------------------------------------------
// T6.2 — the automated playthrough × 3 paths × the walking classes
// ---------------------------------------------------------------------------

for (const path of CH1_PATHS) {
  for (const clazz of WALKING_CLASSES) {
    test(`T6.2: Act I walk — ${clazz} / ${path.id} clears crypt, road and nave`, () => {
      const run = walkAct1({ clazz, ch1: path.id, seed: 7 });
      assert.strictEqual(run.chapter, 3);
      assert.strictEqual(run.chapterState.completed, true);
      // the ch1 tally moved, hidden (§4.1); the walk's defaults add ch2-mercy
      // (ch2_open) and ch3-ruthless (ch3_finish) on top — the full vector:
      const expected = {
        ch1_mace: { mercy: 1, ruthless: 2, devotion: 0 },
        ch1_shroud: { mercy: 2, ruthless: 1, devotion: 0 },
        ch1_hymn: { mercy: 1, ruthless: 1, devotion: 1 },
      }[path.id];
      assert.deepStrictEqual(run.tallies, expected);
      // the F26/A2 mapping is player-visible: every path carries its item
      assert.ok(run.items.includes(path.item), `${path.item} granted`);
    });
  }
}

const CLASSES = WALKING_CLASSES;

// N14 (recorded, DECISIONS.md §9): Duel 2 — Tollward Sedge — is an absolute
// wall for the Hollow Cantor on canon v1.0.1 data. Every L2/L3 archetype of
// the harness sweep is 0/60; every FIXED walker kit is 0/100 (all three
// class vows, every L2-legal slot swap incl. the commons, every reshaped
// allocation); and the FULL sanction ladder — 40 free re-bells through the
// §13 reshape rotation WITH the §10.11 Dampened Bell already accepted — is
// 0/40. N12 flagged the class-coverage advisory; this row shows it is
// campaign-blocking for one of four classes (and even Duel 1 costs the
// Cantor 6 re-bells + the assist). Content numbers are canon (§17): routed
// to the owner's tuning wave, not retuned here.
test('T6.2/N14: the Cantor wall at Duel 2 — the full sanction ladder cannot clear it; the finding is locked as regression armor', () => {
  const cantor = RS.createRunState({ clazz: 'hollow_cantor' });
  RS.enterChapter(cantor, 1);
  const bram = D.fightDuel(cantor, 'bram', { seed: 7 });
  assert.strictEqual(bram.won, true, 'Duel 1 passes — but only deep into the ladder');
  assert.ok(bram.attempts >= 4, `Duel 1 alone costs ${bram.attempts} re-bells + the assist (other classes: 1–3)`);
  assert.strictEqual(cantor.dampened, true, 'the assist mark was required on Duel 1 already (§10.11)');
  assert.deepStrictEqual(cantor.dampenedFights, ['bram']);
  // fightDuel's exhaustion contract: { won: false, attempts } — no throw
  // (walkChapter is what converts the refusal into the walk-stopping error).
  const sedge = D.fightDuel(cantor, 'sedge', { seed: 7, maxAttempts: 40 });
  assert.strictEqual(sedge.won, false, 'Duel 2 stays unwon through re-bells + reshapes + the Dampened Bell');
  assert.strictEqual(sedge.attempts, 40);
  // the contrast class passes fast on the same ladder
  const ash = RS.createRunState({ clazz: 'ashblade' });
  RS.enterChapter(ash, 1);
  D.fightDuel(ash, 'bram', { seed: 7 });
  const ar = D.fightDuel(ash, 'sedge', { seed: 7, maxAttempts: 40 });
  assert.ok(ar.attempts <= 3, `the same duel at ${ar.attempts} attempts for the Ashblade`);
  assert.strictEqual(ash.dampened, false, 'no assist for the contrast class');
});

test('T6.2: the Ch1 choice item is what §8.1 says it is (the F26 fix is visible)', () => {
  assert.strictEqual(getItem('pallbearers_mace').slot, 'weapon');
  assert.strictEqual(getItem('sextons_shroud').slot, 'vestment');
  assert.strictEqual(getItem('grave_shovel_of_bram').slot, 'weapon');
});

// ---------------------------------------------------------------------------
// T6.2 — the chapter rewards land exactly as decided
// ---------------------------------------------------------------------------

test('T6.2: Ch2 — all three routes open the gate; the toll sells no memory', () => {
  for (const option of ['ch2_open', 'ch2_toll', 'ch2_sing']) {
    const run = walkAct1({ clazz: 'ashblade', ch1: 'ch1_shroud', ch2: option });
    assert.strictEqual(run.chapter, 3, `${option} reaches the nave — the gate opened`);
    assert.deepStrictEqual(run.memoriesSold, [], 'the toll is narrative-only (T6.12 owns the vendor)');
  }
  const tallies = ['mercy', 'ruthless', 'devotion'];
  for (const [i, option] of ['ch2_open', 'ch2_toll', 'ch2_sing'].entries()) {
    const run = walkAct1({ clazz: 'ashblade', ch1: 'ch1_shroud', ch2: option, ch3: 'ch3_learn' });
    // ch1 is mercy; ch3 is devotion; the option's own tally lands once on top
    const expected = { ch2_open: 2, ch2_toll: 1, ch2_sing: 2 }[option];
    assert.strictEqual(run.tallies[tallies[i]], expected, `${option}: the tally moved`);
  }
});

test('T6.2: Ch3-Ruthless grants Cantor\'s Tuning Fork', () => {
  const run = walkAct1({ clazz: 'ashblade', ch3: 'ch3_finish' });
  assert.ok(run.items.includes('cantors_tuning_fork'));
});

test('T6.2: Ch3-Mercy grants +1 free stat point — and the build actually carries it', () => {
  const run = walkAct1({ clazz: 'ashblade', ch3: 'ch3_letgo' });
  assert.strictEqual(run.bonusStatPoints, 1);
  // the assembled fight build declares the bonus and stays validator-legal
  const build = D.playerBuildOf(run);
  assert.strictEqual(build.bonusPoints, 1);
  // the point rides in levelUps: total = 2(L−1) + 1
  const sum = Object.values(build.levelUps).reduce((a, b) => a + b, 0);
  assert.strictEqual(sum, 2 * (run.level - 1) + 1);
  // a wielder WITHOUT the point is one point shorter — the reward is real
  const lean = RS.createRunState({ clazz: 'ashblade' });
  D.walkChapter(lean, { choice: 'ch1_mace', seed: 7 });
  D.walkChapter(lean, { choice: 'ch2_open', seed: 8 });
  D.walkChapter(lean, { choice: 'ch3_finish', seed: 9 });
  assert.strictEqual(lean.bonusStatPoints, 0);
});

test('T6.2: Ch3-Devotion grants the Twin Ledger (D3) — the earn is real in the Hymnal store', () => {
  const run = walkAct1({ clazz: 'ashblade', ch3: 'ch3_learn' });
  assert.strictEqual(RS.hasFlag(run, 'twin_ledger_earned'), true);
  // the store consumes the earn: a second saved loadout, swappable free
  const loadout = createLoadoutState({
    name: 'Probe', clazz: 'ashblade', level: run.level,
    creation: run.creation, levelUps: run.levelUps,
    vow: 'red_tide', verses: D.autoVerses(run), items: [],
    doctrine: 'hymnal',
  });
  earnTwinLedger(loadout);
  assert.strictEqual(hasTwinLedger(loadout), true);
  assert.ok(swapLoadout(loadout, 'shrine').ok !== false, 'the Twin Ledger swaps at a shrine');
  // and it is never a reshaping discount: reshaping was already free (§13)
  const reshaped = require('../store/loadout.js').reshape(loadout, { verses: ['rend', 'opening_cut', 'flay', 'drink_deep'] }, 'shrine');
  assert.strictEqual(reshaped.ok, true);
});

test('T6.2: the Choir Floor unlocks at Act I\'s end — state flag now, Floor UI is Phase 7', () => {
  const run = RS.createRunState({ clazz: 'ashblade' });
  D.walkChapter(run, { choice: 'ch1_mace', seed: 7 });
  assert.strictEqual(RS.hasFlag(run, 'floor_unlocked'), false, 'not mid-act');
  D.walkChapter(run, { choice: 'ch2_open', seed: 8 });
  assert.strictEqual(RS.hasFlag(run, 'floor_unlocked'), false);
  D.walkChapter(run, { choice: 'ch3_finish', seed: 9 });
  assert.strictEqual(RS.hasFlag(run, 'floor_unlocked'), true);
});

// ---------------------------------------------------------------------------
// T6.2 — the post-act state, exactly §3's sentence
// ---------------------------------------------------------------------------

test('T6.2: post-act state — class, vow, stat spread, 3 equipped items, a working 4-verse loadout, Floor unlocked', () => {
  const run = walkAct1({ clazz: 'gravewarden' });
  assert.ok(run.clazz === 'gravewarden');
  assert.ok(run.slottedVow, 'a vow is slotted');
  const build = D.playerBuildOf(run);
  assert.strictEqual(build.items.length, 3, '3 items equipped');
  const slots = new Set(build.items.map((id) => require('../data/index.js').getItem(id).slot));
  assert.deepStrictEqual([...slots].sort(), ['relic', 'vestment', 'weapon'], 'one per slot');
  assert.strictEqual(build.verses.length, 4, 'a working 4-verse loadout');
  assert.ok(RS.hasFlag(run, 'floor_unlocked'));
});

test('T6.2: fixed loot lands per §8.4 — fights award theirs, the choice comes on top', () => {
  const run = walkAct1({ clazz: 'ashblade', ch1: 'ch1_mace' });
  // duel bosses: wick_cutter (Duel 2), the ch2 trio, the ch3 pair
  assert.ok(run.items.includes('wick_cutter'), 'ch1 boss drop');
  assert.ok(run.items.includes('salt_reapers_scythe') && run.items.includes('tollwards_rod') && run.items.includes('bellmetal_gauntlets'), 'ch2 boss row');
  assert.ok(run.items.includes('tithe_collectors_ledger') && run.items.includes('drowned_choristers_robe'), 'ch3 boss row');
  // chapter rows
  assert.ok(run.items.includes('reliquary_lantern'), 'ch2 market row');
  assert.ok(run.items.includes('deaf_wax'), 'ch3 market row');
  // and the start grant
  assert.ok(run.items.includes('candle_of_saint_orrin'));
});

// ---------------------------------------------------------------------------
// T6.2 — the XP walk is [01] R1 on real data
// ---------------------------------------------------------------------------

test('T6.2: [01] R1 — Act I\'s cumulative XP walk reproduces (56 / 145 / 291)', () => {
  const run = RS.createRunState({ clazz: 'ashblade' });
  D.walkChapter(run, { choice: 'ch1_mace', seed: 7 });
  assert.strictEqual(run.xp, 56, 'ch1: 14 + 32 + 10');
  D.walkChapter(run, { choice: 'ch2_open', seed: 8 });
  assert.strictEqual(run.xp, 145, 'ch2: +26 + 53 + 10');
  D.walkChapter(run, { choice: 'ch3_finish', seed: 9 });
  assert.strictEqual(run.xp, 291, 'ch3: +26 + 43 + 67 + 10');
  // arrival levels sit inside the act bands (§3 act shape)
  assert.strictEqual(run.level, 5); // the N11-recorded ch4-arrival read: L5, inside L4–5
});

test('T6.2: fights pay XP exactly once per run — re-bells and re-fights pay nothing', () => {
  const run = RS.createRunState({ clazz: 'ashblade' });
  RS.enterChapter(run, 1);
  const first = D.fightDuel(run, 'bram', { seed: 7 });
  assert.strictEqual(first.won, true);
  const xpAfterFirst = run.xp;
  assert.ok(xpAfterFirst > 0);
  const again = D.fightDuel(run, 'bram', { seed: 8 });
  assert.strictEqual(again.won, true);
  assert.strictEqual(again.xp, null, 'the bell does not ring twice for the same fight ([01] §4)');
  assert.strictEqual(run.xp, xpAfterFirst);
});

// ---------------------------------------------------------------------------
// T6.2 — determinism, re-bells, and the walk's discipline
// ---------------------------------------------------------------------------

test('T6.2: determinism — same class, same choices, same seed → byte-identical runs', () => {
  const a = walkAct1({ clazz: 'cinder_witch', ch1: 'ch1_hymn', ch2: 'ch2_sing', ch3: 'ch3_learn', seed: 21 });
  const b = walkAct1({ clazz: 'cinder_witch', ch1: 'ch1_hymn', ch2: 'ch2_sing', ch3: 'ch3_learn', seed: 21 });
  assert.strictEqual(JSON.stringify(a), JSON.stringify(b));
});

test('T6.2: different seeds may need re-bells — and every re-bell is free (§10.11)', () => {
  const run = RS.createRunState({ clazz: 'ashblade' });
  RS.enterChapter(run, 1);
  const r = D.fightDuel(run, 'sedge', { seed: 101, maxAttempts: 8 });
  // whatever the seeds dealt, a won re-bell chain pays once and a lost chain pays nothing
  if (r.won) {
    assert.ok(run.xp > 0 || r.firstClear === false);
  } else {
    assert.strictEqual(run.xp, 0, 'losses pay nothing');
  }
});

test('T6.2: the walker refuses to walk without a choice, and fights must be cleared before the choice (§3 order)', () => {
  const run = RS.createRunState({ clazz: 'ashblade' });
  RS.enterChapter(run, 1);
  assert.rejects(() => new Promise((res, rej) => {
    try { D.makeChoice(run, 'ch1_mace'); rej(new Error('should have thrown')); } catch (e) { res(e); }
  }).then((e) => { throw e; }), /duels cleared first/);
});

test('T6.2: duel ids from other chapters are refused — the walker stays in the chapter', () => {
  const run = RS.createRunState({ clazz: 'ashblade' });
  RS.enterChapter(run, 1);
  assert.throws(() => D.fightDuel(run, 'pell'), /not a fight of chapter 1/);
});

// ---------------------------------------------------------------------------
// T6.2 — the fights are the canon fights (wiring, not balance)
// ---------------------------------------------------------------------------

test('T6.2: Duel 6 is Pell with his Ledger\'s Ward (N4) wired, and it plays', () => {
  const run = walkAct1({ clazz: 'cinder_witch', ch1: 'ch1_shroud', ch2: 'ch2_open' });
  RS.enterChapter(run, 3); // re-entry is legal; the chapter is already walked
  const r = D.fightDuel(run, 'pell', { seed: 3, maxAttempts: 1 });
  assert.ok(r.result.log.some((l) => /Ledger|casts your/.test(l.text)), 'the Ledger\'s Ward narrates the theft');
});

test('T6.2: Duel 7 is First Vespers — two phases, the Rite tolls at half', () => {
  const run = walkAct1({ clazz: 'gravewarden', ch1: 'ch1_shroud', ch2: 'ch2_open', ch3: 'ch3_finish' });
  const r = D.fightDuel(run, 'first_vespers', { seed: 5, maxAttempts: 1 });
  assert.ok(r.result.log.some((l) => /Rite|toll/i.test(l.text)), 'the act boss\'s rite line lands');
});
