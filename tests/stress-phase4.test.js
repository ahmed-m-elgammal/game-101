// stress-phase4.test.js — Phase-4 re-test wave: adversarial coverage for the
// content layer and its fight-facing surfaces. Extreme values + nonsense
// scenarios, per the owner's request: the 21-fight roster run against every
// class, hand-forged enemy sheets beyond the player caps (the EnemyForge
// sandbox), Corvane selection fed garbage builds, the Floor parish vs
// degenerate probes, and the XP economy's boundary values.
//
// Every assertion encodes a DOCUMENTED invariant (canon §refs, D-decisions,
// module header contracts) — never incidental behavior:
//   - D8: every auto fight terminates by the Last Bell (round ≤ 20)
//   - §10.3/D5 determinism: same seed + same builds → same result
//   - engine hygiene: no NaN/Infinity may reach HP, results, or log text
//   - T4.9/D11: the counter pick is a pure function of (build string, chapter)
//   - T4.1: bad data fails loudly — a named error, never silent corruption
'use strict';
const test = require('node:test');
const assert = require('node:assert');

const { CANON } = require('../data/config.js');
const { runFight, createSession, runToCompletion } = require('../engine/fight.js');
const { enemyBuild, getEnemy, ENEMIES, ENEMY_BY_ID } = require('../data/enemies.js');
const { standardBuild } = require('../harness/matrix.js');
const { buildSheet, derive } = require('../engine/fighter.js');
const { corvaneCounterbuild, detectLean, buildStringOf, corvaneSheet, CORVANE_SHEET_IDS, COUNTER_RULES } = require('../data/corvane.js');
const { NAMED_ECHOES, RITE_USERS, buildOf } = require('../data/named-echoes.js');
const { ITEMS, ITEM_BY_ID } = require('../data/items.js');
const { xpForFight, levelForXp, floorXp, statPointsForLevel, XP_THRESHOLDS, LEVEL_CAP } = require('../data/progression.js');

const T = CANON;
const CLASSES = ['ashblade', 'cinder_witch', 'gravewarden', 'hollow_cantor'];

// ------------------------------------------------------------ fight invariants

/** Shared invariant sweep over a finished results object. */
function assertFightSane(r, label) {
  assert.strictEqual(r.over, true, `${label}: fight must reach an end state`);
  assert.ok(r.winner === 'a' || r.winner === 'b', `${label}: winner must be a side (got ${r.winner})`);
  assert.ok(r.rounds >= 1 && r.rounds <= T.fatigue.lastBellRound,
    `${label}: rounds ${r.rounds} outside 1..${T.fatigue.lastBellRound}`);
  assert.ok(Number.isFinite(r.hp.a) && Number.isFinite(r.hp.b), `${label}: finite final HP`);
  assert.ok(r.hp.a <= r.maxHp.a && r.hp.b <= r.maxHp.b, `${label}: HP never exceeds max`);
  const text = JSON.stringify(r.log);
  assert.ok(!text.includes('NaN'), `${label}: no NaN in the log`);
  assert.ok(!text.includes('Infinity'), `${label}: no Infinity in the log`);
  assert.ok(!text.includes('undefined'), `${label}: no undefined in the log`);
}

/** Run a fight and sweep the invariants. */
function saneFight(a, b, seed, label) {
  const r = runFight(structuredClone(a), structuredClone(b), { seed, tuning: T });
  assertFightSane(r, label);
  return r;
}

// ------------------------------------------------- 1. the roster × class matrix

test('stress: all 21 roster rows vs every class — termination, hygiene, determinism', () => {
  assert.strictEqual(ENEMIES.length, 21);
  let fights = 0;
  for (const row of ENEMIES) {
    for (const cls of CLASSES) {
      for (const seed of [11, 707]) {
        const player = standardBuild(cls, row.level, T);
        const r = saneFight(player, enemyBuild(row), seed, `${row.id} vs ${cls} @${seed}`);
        fights += 1;
        // D5/§10.3: re-running the same inputs must reproduce the same fight
        const again = runFight(structuredClone(player), enemyBuild(row), { seed, tuning: T });
        assert.strictEqual(again.winner, r.winner, `${row.id} vs ${cls} @${seed}: determinism`);
        assert.strictEqual(again.rounds, r.rounds, `${row.id} vs ${cls} @${seed}: determinism`);
      }
    }
  }
  assert.strictEqual(fights, 168);
});

test('stress: every enemy sheet derives finite read-outs (crit, mitigation)', () => {
  for (const row of ENEMIES) {
    const sheet = buildSheet(enemyBuild(row), T);
    const d = derive(sheet, T);
    assert.ok(Number.isFinite(d.critChance), `${row.id}: crit finite`);
    assert.ok(Number.isFinite(d.mitSteel) && Number.isFinite(d.mitMagic), `${row.id}: mitigation finite`);
    assert.ok(Number.isFinite(sheet.maxHp) && sheet.maxHp > 0, `${row.id}: maxHp > 0`);
    for (const k of Object.keys(sheet.stats)) {
      assert.ok(Number.isInteger(sheet.stats[k]) && sheet.stats[k] >= 0, `${row.id}: stat ${k} non-negative integer`);
    }
  }
});

// ------------------------------------- 2. hand-forged extreme sheets (sandbox)

// The EnemyForge sandbox lets a user push stats past the player cap of 10 and
// override HP. The frozen enemy schema (validators.js) is the in-contract
// envelope: stats ≥ 0 integers, hp ≥ 1, level 1–10. The ENGINE must survive
// the whole envelope — terminate, stay finite, stay deterministic.
test('stress: extreme enemy stat sheets (all-20, one-stat spikes) fight to termination', () => {
  const blobs = [
    { vig: 20, mig: 20, wit: 20, grd: 20, hst: 20 },  // the EnemyForge max slider
    { vig: 0, mig: 0, wit: 0, grd: 0, hst: 20 },      // pure crit monster
    { vig: 0, mig: 0, wit: 20, grd: 0, hst: 0 },      // pure burn monster, 1 HP pool
    { vig: 20, mig: 0, wit: 0, grd: 0, hst: 0 },      // HP wall, no offense
    { vig: 0, mig: 0, wit: 0, grd: 20, hst: 0 },      // pure mitigation turtle
    { vig: 9, mig: 9, wit: 9, grd: 9, hst: 9 },       // uniform 45 = budget(7)
  ];
  for (const stats of blobs) {
    for (const cls of ['ashblade', 'hollow_cantor']) {
      const build = {
        name: 'Forged', clazz: 'ashblade', level: 7, isEnemy: true,
        stats, hpOverride: 120, budgetOverride: true, verses: ['opening_cut'], items: [],
      };
      const r = saneFight(standardBuild(cls, 7, T), build, 5, `forged ${JSON.stringify(stats)} vs ${cls}`);
      // determinism under the same nonsense
      const again = runFight(structuredClone(standardBuild(cls, 7, T)), structuredClone(build), { seed: 5, tuning: T });
      assert.strictEqual(again.winner, r.winner);
    }
  }
});

test('stress: enemy level extremes (1 and 10) with over-budget sheets stay sane', () => {
  for (const level of [1, 10]) {
    const build = {
      name: 'Forged', clazz: 'cinder_witch', level, isEnemy: true,
      stats: { vig: 20, mig: 20, wit: 20, grd: 20, hst: 20 }, hpOverride: 200,
      budgetOverride: true, verses: ['conflagration', 'spark'], items: [],
    };
    saneFight(standardBuild('ashblade', level, T), build, 3, `forged L${level} vs ashblade L${level}`);
  }
});

test('stress: hpOverride boundaries (1, huge) terminate via kill or Last Bell', () => {
  // 1 HP: any first hit ends it — but the engine must not hang or NaN.
  const oneHp = { name: 'Wisp', clazz: 'ashblade', level: 7, isEnemy: true,
    stats: { vig: 8, mig: 10, wit: 8, grd: 9, hst: 10 }, hpOverride: 1, budgetOverride: true, verses: [], items: [] };
  const r1 = saneFight(standardBuild('gravewarden', 7, T), oneHp, 9, '1-HP enemy');
  assert.ok(r1.winner === 'a' || r1.winner === 'b');
  // Astronomical HP: no kill possible — D8's Last Bell must still end it.
  const wall = { name: 'Wall', clazz: 'gravewarden', level: 7, isEnemy: true,
    stats: { vig: 20, mig: 4, wit: 2, grd: 15, hst: 4 }, hpOverride: 1e9, budgetOverride: true, verses: [], items: [] };
  const r2 = saneFight(standardBuild('ashblade', 7, T), wall, 9, '1e9-HP enemy');
  assert.strictEqual(r2.lastBell, true, 'an unkillable wall only ends at the Last Bell');
});

test('stress: empty verse pools still fight — Strike-only trades end legally', () => {
  const blank = (clazz) => ({ name: 'Blank', clazz, level: 7, isEnemy: true,
    stats: { vig: 9, mig: 9, wit: 9, grd: 9, hst: 9 }, hpOverride: 100, budgetOverride: true, verses: [], items: [] });
  const r = saneFight(blank('ashblade'), blank('cinder_witch'), 21, 'two Strike-only blanks');
  // symmetric Strike trades drift apart through jitter/fortune — the fight
  // ends by kill OR at the Last Bell; only the D8 cap is pinned.
  assert.ok(r.rounds >= 1 && r.rounds <= T.fatigue.lastBellRound);
});

test('stress: Strike-vs-Strike with zero offense still resolves a winner', () => {
  const wet = { name: 'Wet Paper', clazz: 'ashblade', level: 1, isEnemy: true,
    stats: { vig: 6, mig: 0, wit: 0, grd: 0, hst: 0 }, hpOverride: 300, budgetOverride: true, verses: [], items: [] };
  saneFight(wet, { ...structuredClone(wet), name: 'Wetter Paper', clazz: 'cinder_witch' }, 33, '0-MIG mirrors');
});

// ------------------------------------------------- 3. Corvane selection garbage

test('stress: detectLean and the counter pick survive nonsense builds', () => {
  const garbage = [
    {},
    { verses: [] },
    { verses: ['not_a_verse', 'also_fake'], vow: 'nonexistent_vow', items: [42, 'ghost_item'] },
    { verses: [null, undefined, 42, {}, []], vow: 42, items: [{}] },
    { verses: new Array(500).fill('rend') },           // absurd repetition
    { name: null, clazz: null, level: -5, vow: '', verses: '', items: '' },
    { verses: ['rend'], extra: { deep: { cyclic: 1 } } },
  ];
  for (const g of garbage) {
    const det = detectLean(g);
    assert.ok(typeof det.lean === 'string', 'lean is always a string');
    assert.ok(['bleed', 'burn', 'tank', 'debuff', 'crit', 'drain', 'neutral'].includes(det.lean), `lean ${det.lean} is a known axis`);
    // the pick itself never throws and always resolves a real sheet
    const pick = corvaneCounterbuild(g, 5);
    assert.ok(CORVANE_SHEET_IDS.includes(pick.sheetId), `sheetId ${pick.sheetId} resolves`);
    assert.ok(pick.sheet && pick.sheet.stats, 'a sheet object comes back');
  }
});

test('stress: the D11 lock is deterministic under absurd chapter salts', () => {
  const build = { verses: ['rend', 'flay'], vow: 'red_tide', items: ['wick_cutter'] };
  for (const chapter of [0, -3, 1e9, 2 ** 53, NaN, 'x', null, undefined]) {
    const a = corvaneCounterbuild(build, chapter);
    for (let i = 0; i < 20; i++) {
      const b = corvaneCounterbuild(build, chapter);
      assert.strictEqual(b.sheetId, a.sheetId, `chapter ${chapter}: retry ${i} identical`);
      assert.strictEqual(JSON.stringify(b.weights), JSON.stringify(a.weights));
    }
  }
});

test('stress: buildStringOf is total over garbage and stable over key order', () => {
  assert.strictEqual(typeof buildStringOf({}), 'string');
  assert.strictEqual(typeof buildStringOf({ verses: null, items: null, vow: null }), 'string');
  // two key orders of one loadout → byte-identical (the D11 seed contract)
  const a = buildStringOf({ name: 'X', clazz: 'ashblade', level: 7, vow: 'duelist', verses: ['rend', 'flay'], items: ['vigils_ring', 'wick_cutter'] });
  const b = buildStringOf({ items: ['vigils_ring', 'wick_cutter'], verses: ['rend', 'flay'], vow: 'duelist', level: 7, clazz: 'ashblade', name: 'X' });
  assert.strictEqual(a, b);
  // item order does not move the seed (sorted); verse order DOES (priority)
  assert.strictEqual(buildStringOf({ verses: ['rend'], items: ['a', 'b'] }), buildStringOf({ verses: ['rend'], items: ['b', 'a'] }));
  assert.notStrictEqual(buildStringOf({ verses: ['rend', 'flay'], items: [] }), buildStringOf({ verses: ['flay', 'rend'], items: [] }));
});

test('stress: all 10 Corvane sheets sit on the L7 budget and fight legally', () => {
  assert.strictEqual(CORVANE_SHEET_IDS.length, 10);
  assert.strictEqual(COUNTER_RULES.length, 6);
  for (const id of CORVANE_SHEET_IDS) {
    const sheet = corvaneSheet(id);
    const sum = Object.values(sheet.stats).reduce((a, b) => a + b, 0);
    assert.strictEqual(sum, 45, `${id}: stats sum ${sum} = budget(7)`);
    assert.strictEqual(sheet.level, 7);
    for (const cls of ['ashblade', 'gravewarden']) {
      saneFight(standardBuild(cls, 7, T), { ...sheet, isEnemy: true, items: [] }, 13, `corvane ${id} vs ${cls}`);
    }
  }
});

// ----------------------------------------------------- 4. the Floor's parish

test('stress: all 12 parish Echoes fight degenerate probes to termination', () => {
  const glassCannon = standardBuild('ashblade', 8, T); // all-in burst probe
  const turtle = standardBuild('gravewarden', 8, T);   // mitigation probe
  for (const echo of [...NAMED_ECHOES, ...RITE_USERS]) {
    const eBuild = buildOf(echo);
    saneFight(structuredClone(glassCannon), eBuild, 17, `${echo.id} vs glass cannon`);
    saneFight(structuredClone(turtle), structuredClone(eBuild), 17, `${echo.id} vs turtle`);
  }
  assert.strictEqual(NAMED_ECHOES.length + RITE_USERS.length, 12);
});

// ------------------------------------------------------ 5. the XP economy edge

test('stress: levelForXp clamps to [1, 10] under absurd inputs', () => {
  assert.throws(() => levelForXp(NaN), /finite/, 'NaN XP is corruption — loud failure, not silent L1');
  assert.throws(() => levelForXp(Infinity), /finite/);
  assert.strictEqual(levelForXp(-5), 1, 'negative XP cannot go below level 1');
  assert.strictEqual(levelForXp(0), 1);
  assert.strictEqual(levelForXp(1e12), LEVEL_CAP, 'astronomical XP clamps to the cap');
  assert.strictEqual(levelForXp(Number.MAX_SAFE_INTEGER), LEVEL_CAP);
  assert.strictEqual(levelForXp(XP_THRESHOLDS[LEVEL_CAP - 1] - 1), 9, 'one under the final threshold is still L9');
  for (let xp = -100; xp < 2000; xp += 7) {
    const lv = levelForXp(xp);
    assert.ok(Number.isInteger(lv) && lv >= 1 && lv <= 10, `xp ${xp} → level ${lv} in range`);
  }
});

test('stress: floorXp decay edges — the min-4 floor and under-level branch', () => {
  // under-level branch (opponent ≥ 2 below): 25%, min 4 — takes precedence
  assert.strictEqual(floorXp(1, 10), 4, 'deep under-level pays the floor');
  assert.strictEqual(floorXp(5, 7), 5, 'exactly 2 below → 25% of 18 = 4.5 → rounds to 5');
  // repeat branch: 50%, min 4
  assert.strictEqual(floorXp(9, 9, { repeat: true }), Math.max(4, Math.round(26 * 0.5)));
  assert.strictEqual(floorXp(1, 9, { repeat: true }), 4, 'repeat of a trivial opponent still pays ≥ 4');
  // first win: 8 + 2L, never decayed
  assert.strictEqual(floorXp(9, 1), 26);
  assert.strictEqual(floorXp(0, 1), 8, 'level-0 opponent (corrupt row) still pays 8');
  for (let o = 0; o <= 12; o++) {
    for (const opts of [{}, { repeat: true }, { firstBind: true }, { firstImport: true }]) {
      const xp = floorXp(o, 5, opts);
      assert.ok(Number.isInteger(xp) && xp >= 4, `floorXp(${o}, 5, ${JSON.stringify(opts)}) = ${xp} ≥ 4`);
    }
  }
});

test('stress: xpForFight and statPointsForLevel fail loudly, not silently', () => {
  assert.throws(() => xpForFight(3, 'weird_role'), /unknown fight role/);
  assert.throws(() => xpForFight(3, null), /unknown fight role/);
  assert.throws(() => statPointsForLevel(0), /level out of range/);
  assert.throws(() => statPointsForLevel(11), /level out of range/);
  assert.throws(() => statPointsForLevel(NaN), /level out of range/);
  assert.strictEqual(statPointsForLevel(1), 4);
  assert.strictEqual(statPointsForLevel(10), 22);
  assert.strictEqual(xpForFight(9, 'boss'), Math.round((10 + 36) * 1.75));
});

// ------------------------------------------------- 6. items × classes crossfire

test('stress: every item equips on every class sheet — marks never corrupt derivation', () => {
  assert.strictEqual(ITEMS.length, 40);
  for (const item of ITEMS) {
    assert.ok(ITEM_BY_ID.get(item.id), `${item.id} resolves`);
    for (const cls of CLASSES) {
      const build = standardBuild(cls, 7, T);
      build.items = [item.id];
      const sheet = buildSheet(build, T);
      const d = derive(sheet, T);
      assert.ok(Number.isFinite(d.critChance) && Number.isFinite(d.mitSteel), `${item.id} on ${cls}: finite derivation`);
    }
  }
});

test('stress: the mitigation-crit-wall items fight their counters to termination', () => {
  const marked = ['ash_glazed_brass', 'vigils_ring', 'candle_of_saint_orrin', 'deaf_wax', 'founders_leather', 'thimble_coat', 'corvanes_blade', 'wick_cutter', 'bellmetal_gauntlets', 'drowned_mantle'];
  for (const id of marked) {
    if (!ITEM_BY_ID.get(id)) continue; // only pinned ids that exist post-D4
    for (const foeId of ['mother_bell', 'sable']) {
      const build = standardBuild('ashblade', 8, T);
      build.items = [id];
      saneFight(build, enemyBuild(getEnemy(foeId)), 23, `${id} vs ${foeId}`);
    }
  }
});
