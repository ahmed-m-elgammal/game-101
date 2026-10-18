// stress-fighter.test.js — Phase-1 re-test wave: adversarial coverage for
// fighter construction (engine/fighter.js) and the canon presets
// (data/presets.js). Budget math (D7/N5), allocation validation, cap-10,
// D2 level sync, vow modifier bundles, sheet assembly, derived read-outs,
// build lines, and every preset's canon conformance.
'use strict';

const { test } = require('node:test');
const assert = require('node:assert');

const {
  budgetFor, validateAlloc, checkBudget, finalStats, syncedSheet, vowMods,
  buildSheet, derive, buildLine,
} = require('../engine/fighter.js');
const { createTuning, diffTuning } = require('../tuning.js');
const { CANON } = require('../data/config.js');
const { CLASSES, STAT_KEYS, CLASS_IDS } = require('../data/classes.js');
const { RITES } = require('../data/rites.js');
const { VERSE_BY_ID, poolFor } = require('../data/verses.js');
const { BRAM, L1_ASHBLADE, FIRST_VESPERS, mirrorPreset } = require('../data/presets.js');

const T = createTuning();
const KEYS = STAT_KEYS;
const zero = () => ({ vig: 0, mig: 0, wit: 0, grd: 0, hst: 0 });

/** A legal L-level player build for a class, alloc given. */
function mkBuild(clazz, level, creation, levelUps, extra = {}) {
  return {
    name: 'Test ' + clazz, clazz, level,
    creation: { ...zero(), ...creation },
    levelUps: { ...zero(), ...levelUps },
    vow: null, verses: [], items: [], ...extra,
  };
}

// -------------------------------------------------------------- budgetFor
for (let L = 1; L <= 10; L++) {
  test(`budgetFor(L${L}) = ${33 + 2 * (L - 1)} exactly (D7/N5 formula)`, () => {
    assert.strictEqual(budgetFor(L, T), 33 + 2 * (L - 1));
  });
}
test('budgetFor: tuning overrides move the curve (single-source rule)', () => {
  const t2 = createTuning({ budgetBase: 40, budgetPerLevel: 3 });
  assert.strictEqual(budgetFor(1, t2), 40);
  assert.strictEqual(budgetFor(5, t2), 40 + 3 * 4);
  assert.strictEqual(budgetFor(1, T), 33, 'canon untouched');
});
test('budgetFor: L0 edge — formula yields base − perLevel (documented, unreachable in data)', () => {
  assert.strictEqual(budgetFor(0, T), 31);
});

// ------------------------------------------------------------ validateAlloc
for (const cls of CLASS_IDS) {
  test(`validateAlloc[${cls}]: legal L1 build (creation 4, no level-ups) passes`, () => {
    const alloc = cls === 'cinder_witch' ? { wit: 1, hst: 2, vig: 1 }
      : cls === 'ashblade' ? { mig: 2, hst: 1, vig: 1 }
      : cls === 'gravewarden' ? { grd: 2, vig: 1, mig: 1 }
      : { wit: 2, hst: 1, vig: 1 };
    const r = validateAlloc(mkBuild(cls, 1, alloc, {}), T);
    assert.strictEqual(r.ok, true, r.errors.join('; '));
    assert.strictEqual(r.total, 4);
  });
}

test('validateAlloc: creation sum 3 rejected', () => {
  const r = validateAlloc(mkBuild('ashblade', 1, { mig: 2, hst: 1 }, {}), T);
  assert.strictEqual(r.ok, false);
  assert.ok(r.errors.some((e) => e.includes('creation must total 4')));
});
test('validateAlloc: creation sum 5 rejected', () => {
  const r = validateAlloc(mkBuild('ashblade', 1, { mig: 2, hst: 2, vig: 1 }, {}), T);
  assert.strictEqual(r.ok, false);
});
test('validateAlloc: creation sum 0 (all zeros) rejected', () => {
  const r = validateAlloc(mkBuild('ashblade', 1, {}, {}), T);
  assert.strictEqual(r.ok, false);
});
test('validateAlloc: levelUps under-budget rejected at L5 (need 8)', () => {
  const r = validateAlloc(mkBuild('ashblade', 5, { mig: 2, hst: 1, vig: 1 }, { mig: 4 }), T);
  assert.strictEqual(r.ok, false);
  assert.ok(r.errors.some((e) => e.includes('must total 8')));
});
test('validateAlloc: levelUps over-budget rejected at L5 (9 of 8)', () => {
  const r = validateAlloc(mkBuild('ashblade', 5, { mig: 2, hst: 1, vig: 1 }, { mig: 5, hst: 4 }), T);
  assert.strictEqual(r.ok, false);
});
test('validateAlloc: exact levelUps total at L5 passes (cap-aware spread)', () => {
  // ashblade L5: mig already capped by creation (8+2); rooms: hst 2, vig 3, grd 6, wit 8
  const r = validateAlloc(mkBuild('ashblade', 5, { mig: 2, hst: 1, vig: 1 }, { hst: 2, vig: 3, grd: 3 }), T);
  assert.strictEqual(r.ok, true, r.errors.join('; '));
});
test('validateAlloc: L10 requires 18 level-up points (cap-aware spread)', () => {
  const r = validateAlloc(mkBuild('ashblade', 10, { mig: 2, hst: 1, vig: 1 }, { hst: 2, vig: 3, grd: 6, wit: 7 }), T);
  assert.strictEqual(r.ok, true, r.errors.join('; '));
});
test('validateAlloc: L10 with 17 points rejected', () => {
  const r = validateAlloc(mkBuild('ashblade', 10, { mig: 2, hst: 1, vig: 1 }, { mig: 4, hst: 4, vig: 3, grd: 3, wit: 3 }), T);
  assert.strictEqual(r.ok, false);
});
test('validateAlloc: any stat pushed above cap 10 is rejected (per-stat sweep via level-ups)', () => {
  // L6 grants 10 level-up points; pouring ALL of them into one stat breaches
  // every stat's cap (all bases are ≤ 9). Creation stays legal (4).
  for (const k of KEYS) {
    const creation = clsCreation('ashblade');
    if (creation[k]) { creation[k] = 0; creation.grd === undefined; }
    const levelUps = { ...zero(), [k]: 10 };
    // top up the creation sum to exactly 4 without touching k
    let left = 4;
    for (const j of KEYS) {
      if (j === k) continue;
      const put = Math.min(10 - CLASSES.ashblade.base[j], left);
      creation[j] = put; left -= put;
    }
    assert.strictEqual(left, 0, `creation filler for ${k}`);
    const r = validateAlloc(mkBuild('ashblade', 6, creation, levelUps), T);
    assert.strictEqual(r.ok, false, `stat ${k} should breach cap`);
    assert.ok(r.errors.some((e) => e.includes('above cap 10')), `cap message for ${k}: ${r.errors.join('; ')}`);
  }
});
function clsCreation(cls) {
  const partial = cls === 'ashblade' ? { mig: 2, hst: 1, vig: 1 }
    : cls === 'cinder_witch' ? { wit: 1, hst: 2, vig: 1 }
    : cls === 'gravewarden' ? { grd: 2, vig: 1, mig: 1 }
    : { wit: 2, hst: 1, vig: 1 };
  return { ...zero(), ...partial };
}
test('validateAlloc: negative creation below class base is rejected', () => {
  const r = validateAlloc(mkBuild('ashblade', 1, { mig: 4, hst: 2, vig: -2 }, {}), T);
  assert.strictEqual(r.ok, false);
  assert.ok(r.errors.some((e) => e.includes('below class base')));
});
test('validateAlloc: levelUps cannot push below base (negative levelUps)', () => {
  const r = validateAlloc(mkBuild('ashblade', 3, { mig: 2, hst: 2 }, { mig: 2, hst: -2, vig: 4 }), T);
  assert.strictEqual(r.ok, false);
});
test('validateAlloc: fractional creation that sums correctly is currently accepted (lenient engine boundary — documented)', () => {
  // Schema-level int validation happens in data/schemas (echoCode.alloc) and
  // future save validation; buildSheet's own check is sum- and cap-based.
  const r = validateAlloc(mkBuild('ashblade', 1, { mig: 1.5, hst: 1.5, vig: 1 }, {}), T);
  assert.strictEqual(r.ok, true);
});
test('validateAlloc: fractional that breaches the cap is still rejected', () => {
  const r = validateAlloc(mkBuild('cinder_witch', 1, { wit: 1.5, hst: 2, vig: 0.5 }, {}), T);
  assert.strictEqual(r.ok, false);
});
test('validateAlloc: missing creation object entirely → rejected with clear error', () => {
  const build = mkBuild('ashblade', 1, {}, {});
  build.creation = undefined;
  const r = validateAlloc(build, T);
  assert.strictEqual(r.ok, false);
  assert.ok(r.errors.some((e) => e.includes('creation must total 4 (got 0)')));
});
test('validateAlloc: missing levelUps object → treated as zeros', () => {
  const build = mkBuild('ashblade', 1, { mig: 2, hst: 1, vig: 1 }, {});
  build.levelUps = undefined;
  const r = validateAlloc(build, T);
  assert.strictEqual(r.ok, true);
});
test('validateAlloc: L1 with nonzero levelUps rejected (expected 0)', () => {
  const r = validateAlloc(mkBuild('ashblade', 1, { mig: 2, hst: 1, vig: 1 }, { mig: 1 }), T);
  assert.strictEqual(r.ok, false);
  assert.ok(r.errors.some((e) => e.includes('must total 0 (got 1)')));
});
test('validateAlloc: unknown class throws (CLASSES[undefined].base)', () => {
  assert.throws(() => validateAlloc({ clazz: 'nope', level: 1, creation: {}, levelUps: {} }, T), TypeError);
});
test('validateAlloc: total field = creation + levelUps (not the cap count)', () => {
  const r = validateAlloc(mkBuild('ashblade', 5, { mig: 2, hst: 1, vig: 1 }, { mig: 8 }), T);
  assert.strictEqual(r.total, 12);
});
for (const L of [2, 3, 4, 6, 7, 8, 9]) {
  test(`validateAlloc: L${L} needs exactly ${2 * (L - 1)} level-up points`, () => {
    const pts = 2 * (L - 1);
    const creation = clsCreation('ashblade');
    const levelUps = zero();
    let rest = pts;
    // spend along canonical stat order, respecting cap (base + creation)
    for (const k of KEYS) {
      const room = 10 - CLASSES.ashblade.base[k] - creation[k];
      const put = Math.min(room, rest);
      levelUps[k] = put; rest -= put;
      if (rest === 0) break;
    }
    assert.strictEqual(rest, 0, `capacity math must absorb ${pts} points`);
    const r = validateAlloc(mkBuild('ashblade', L, creation, levelUps), T);
    assert.strictEqual(r.ok, true, r.errors.join('; '));
  });
}

// ------------------------------------------------------------- checkBudget
test('checkBudget: exact conformance at L1 (sum 33)', () => {
  const r = checkBudget({ vig: 11, mig: 5, wit: 2, grd: 10, hst: 5 }, 1, T);
  assert.deepEqual(r, { ok: true, sum: 33, budget: 33, edge: 0 });
});
test('checkBudget: exact conformance at L7 (sum 45 — First Vespers row)', () => {
  const r = checkBudget({ vig: 8, mig: 2, wit: 14, grd: 8, hst: 13 }, 7, T);
  assert.deepEqual(r, { ok: true, sum: 45, budget: 45, edge: 0 });
});
test('checkBudget: +1 over budget flagged with edge +1', () => {
  const r = checkBudget({ vig: 12, mig: 5, wit: 2, grd: 10, hst: 5 }, 1, T);
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.edge, 1);
});
test('checkBudget: −1 under budget flagged with edge −1', () => {
  const r = checkBudget({ vig: 10, mig: 5, wit: 2, grd: 10, hst: 5 }, 1, T);
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.edge, -1);
});
test('checkBudget: empty stats → sum 0, never ok', () => {
  const r = checkBudget({}, 1, T);
  assert.strictEqual(r.sum, 0);
  assert.strictEqual(r.ok, false);
});
test('checkBudget: missing stat keys count as 0', () => {
  const r = checkBudget({ vig: 33 }, 1, T);
  assert.strictEqual(r.sum, 33);
  assert.strictEqual(r.ok, true);
});
test('checkBudget: negative sum flagged (edge negative)', () => {
  const r = checkBudget({ vig: -5 }, 1, T);
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.edge, -38);
});

// -------------------------------------------------------------- finalStats
test('finalStats: base + creation + levelUps per stat (ashblade)', () => {
  const s = finalStats(mkBuild('ashblade', 5, { mig: 2, hst: 1, vig: 1 }, { mig: 8 }), T);
  assert.deepEqual(s, { vig: 7, mig: 10, wit: 2, grd: 4, hst: 8 });
});
test('finalStats: cap clamps at 10 even when math would exceed (direct call)', () => {
  // finalStats itself clamps; validateAlloc is the loud layer above it.
  const build = mkBuild('ashblade', 5, { mig: 4, hst: 2, vig: 1 }, { mig: 8 });
  const s = finalStats(build, T);
  assert.strictEqual(s.mig, 10);
});
test('finalStats: never returns fractional stat for integer input', () => {
  const s = finalStats(mkBuild('hollow_cantor', 7, { wit: 2, hst: 1, vig: 1 }, { wit: 1, hst: 8, vig: 4, grd: 3, mig: 1 }), T);
  for (const k of KEYS) assert.ok(Number.isInteger(s[k]));
});
test('finalStats: all four classes produce 27 + 4 base+creation at L1', () => {
  for (const cls of CLASS_IDS) {
    const creation = cls === 'ashblade' ? { mig: 2, hst: 1, vig: 1 }
      : cls === 'cinder_witch' ? { wit: 1, hst: 2, vig: 1 }
      : cls === 'gravewarden' ? { grd: 2, vig: 1, mig: 1 }
      : { wit: 2, hst: 1, vig: 1 };
    const s = finalStats(mkBuild(cls, 1, creation, {}), T);
    const sum = KEYS.reduce((a, k) => a + s[k], 0);
    assert.strictEqual(sum, 31, `${cls} sums ${sum}`);
  }
});

// ------------------------------------------------------------- syncedSheet
test('syncedSheet: at/below band returns the SAME object (identity fast path)', () => {
  const sheet = buildSheet(mirrorPreset('ashblade', 5), T);
  assert.strictEqual(syncedSheet(sheet, 5, T), sheet);
  assert.strictEqual(syncedSheet(sheet, 7, T), sheet, 'below band too');
});
test('syncedSheet: +1 over band → +1 in canonical order (vig first, uncapped) and +4% HP', () => {
  const sheet = buildSheet(L1_ASHBLADE, T); // L1: vig 6 < 10, maxHp 108
  const out = syncedSheet(sheet, 0, T); // 1 level over band 0
  assert.strictEqual(out.syncedOver, 1);
  assert.strictEqual(out.stats.vig, sheet.stats.vig + 1);
  assert.strictEqual(out.maxHp, Math.round(sheet.maxHp * 1.04));
});
test('syncedSheet: +3 over band caps at capLevels=3', () => {
  const sheet = buildSheet(L1_ASHBLADE, T); // level 1, band 0 → over 1; need an L10 sheet
  const l10 = buildSheet(mkBuild('ashblade', 10, { mig: 2, hst: 1, vig: 1 }, { hst: 2, vig: 2, grd: 6, wit: 8 }), T);
  const out = syncedSheet(l10, 6, T); // 4 over → capped 3
  assert.strictEqual(out.syncedOver, 3);
  assert.strictEqual(out.maxHp, Math.round(l10.maxHp * 1.12));
});
test('syncedSheet: over-band points skip capped stats in canonical order', () => {
  // Gravewarden defensive at L10: vig and grd both sit at cap 10.
  const sheet = buildSheet(archetype('gravewarden', 'defensive', 10), T);
  const before = { ...sheet.stats };
  const out = syncedSheet(sheet, 7, T);
  assert.strictEqual(out.syncedOver, 3);
  assert.ok(out.stats.vig <= 10 && out.stats.grd <= 10);
  const gained = KEYS.filter((k) => out.stats[k] > before[k]);
  assert.ok(gained.every((k) => out.stats[k] <= 10));
  assert.strictEqual(gained.length, Math.min(3, KEYS.filter((k) => before[k] < 10).length));
});
test('syncedSheet: input sheet is never mutated', () => {
  const sheet = buildSheet(mirrorPreset('ashblade', 5), T);
  const snapshot = JSON.stringify(sheet);
  syncedSheet(sheet, 3, T);
  assert.strictEqual(JSON.stringify(sheet), snapshot);
});
test('syncedSheet: HP rounding is exact Math.round on the ORIGINAL sheet (not compounding)', () => {
  // An L3 build with hpOverride 108: over-band levels exercise the HP chain.
  const mk = (level) => buildSheet({ ...mkBuild('ashblade', level, { mig: 2, hst: 1, vig: 1 }, { hst: 2, vig: 2 }), hpOverride: 108 }, T);
  assert.strictEqual(syncedSheet(mk(3), 2, T).maxHp, Math.round(108 * 1.04)); // over 1
  assert.strictEqual(syncedSheet(mk(3), 1, T).maxHp, Math.round(108 * 1.08)); // over 2
  assert.strictEqual(syncedSheet(mk(3), 0, T).maxHp, Math.round(108 * 1.12)); // over 3 (capped)
  assert.strictEqual(Math.round(108 * 1.04), 112);
  assert.strictEqual(Math.round(108 * 1.08), 117, '108×1.08 = 116.64 → 117 (round-half-up on .64? no — 116.64 rounds to 117)');
  assert.strictEqual(Math.round(108 * 1.12), 121, '108×1.12 = 120.96 → 121');
});
test('syncedSheet: synced sheet keeps vow/verses/items identity', () => {
  const sheet = buildSheet(L1_ASHBLADE, T);
  const out = syncedSheet(sheet, 0, T);
  assert.strictEqual(out.vow, sheet.vow);
  assert.deepEqual(out.verses, sheet.verses);
  assert.deepEqual(out.items, sheet.items);
  assert.strictEqual(out.level, sheet.level);
});
test('syncedSheet: 0 levels over band returns sheet with no syncedOver field', () => {
  const sheet = buildSheet(mirrorPreset('ashblade', 5), T);
  const out = syncedSheet(sheet, 5, T);
  assert.strictEqual(out.syncedOver, undefined);
});
// helper used above
function archetype(clazz, arch, level) {
  const { archetypeBuild } = require('../harness/archetypes.js');
  return archetypeBuild(clazz, arch, level, T);
}

// ----------------------------------------------------------------- vowMods
test('vowMods: no vow → all defaults', () => {
  const sheet = buildSheet(mkBuild('ashblade', 1, { mig: 2, hst: 1, vig: 1 }, {}), T);
  const m = vowMods(sheet, T);
  assert.strictEqual(m.bleedCap, 5);
  assert.strictEqual(m.bleedTickBonus, 0);
  assert.strictEqual(m.critBonus, 0);
  assert.strictEqual(m.critMult, 1.5);
  assert.strictEqual(m.lifestealPct, 0);
  assert.strictEqual(m.mitBonus, 0);
  assert.strictEqual(m.braceBonus, 0.4);
  assert.strictEqual(m.thornsBonus, 0);
  assert.strictEqual(m.turnStartHealPct, 0);
  assert.strictEqual(m.curseMult, 0.75);
  assert.strictEqual(m.curseTurns, 0);
  assert.strictEqual(m.shadePerDebuff, 0);
  assert.strictEqual(m.hushMod, 2);
  assert.strictEqual(m.hushApplyResolve, 0);
  assert.strictEqual(m.burnTickResolve, 0);
});
test('vowMods: every class vow flips exactly its documented fields', () => {
  const cases = [
    ['ashblade', 'red_tide', (m) => { assert.strictEqual(m.bleedCap, 8); assert.strictEqual(m.bleedTickBonus, 1); }],
    ['ashblade', 'duelist', (m) => { assert.strictEqual(m.critBonus, 0.15); assert.strictEqual(m.critMult, 1.75); }],
    ['ashblade', 'hunger', (m) => { assert.strictEqual(m.lifestealPct, 0.12); }],
    ['cinder_witch', 'slow_ash', (m) => { assert.strictEqual(m.burnTurns, 2); assert.strictEqual(m.burnPotency, 1); }],
    ['cinder_witch', 'pyre', (m) => { assert.strictEqual(m.emberVsBurning, 0.2); }],
    ['cinder_witch', 'kindling', (m) => { assert.strictEqual(m.burnTickResolve, 1); }],
    ['gravewarden', 'bastion', (m) => { assert.strictEqual(m.mitBonus, 0.1); assert.strictEqual(m.braceBonus, 0.6); }],
    ['gravewarden', 'thorn_bearer', (m) => { assert.strictEqual(m.thornsBonus, 4); }],
    ['gravewarden', 'long_dark', (m) => { assert.strictEqual(m.turnStartHealPct, 0.04); }],
    ['hollow_cantor', 'last_hymn', (m) => { assert.strictEqual(m.curseMult, 0.6); assert.strictEqual(m.curseTurns, 1); }],
    ['hollow_cantor', 'echoing_grief', (m) => { assert.strictEqual(m.shadePerDebuff, 0.08); }],
    ['hollow_cantor', 'silence', (m) => { assert.strictEqual(m.hushMod, 3); assert.strictEqual(m.hushApplyResolve, 1); }],
  ];
  for (const [cls, vow, check] of cases) {
    const sheet = buildSheet(mkBuild(cls, 1,
      cls === 'ashblade' ? { mig: 2, hst: 1, vig: 1 }
        : cls === 'cinder_witch' ? { wit: 1, hst: 2, vig: 1 }
        : cls === 'gravewarden' ? { grd: 2, vig: 1, mig: 1 }
        : { wit: 2, hst: 1, vig: 1 }, {}, { vow }), T);
    check(vowMods(sheet, T), vow);
  }
  assert.strictEqual(cases.length, 12, 'all twelve class vows covered');
});
test('vowMods: unknown vow id falls back to defaults (no crash)', () => {
  const sheet = buildSheet(mkBuild('ashblade', 1, { mig: 2, hst: 1, vig: 1 }, {}, { vow: 'mystery' }), T);
  const m = vowMods(sheet, T);
  assert.strictEqual(m.bleedCap, 5);
  assert.strictEqual(m.critBonus, 0);
});
test('vowMods: tuning override changes the delivered numbers (single source)', () => {
  const t2 = createTuning({ vows: { hungerPct: 0.3 }, braceBonusBastion: 0.9 });
  const ash = buildSheet(mkBuild('ashblade', 1, { mig: 2, hst: 1, vig: 1 }, {}, { vow: 'hunger' }), t2);
  assert.strictEqual(vowMods(ash, t2).lifestealPct, 0.3);
  const war = buildSheet(mkBuild('gravewarden', 1, { grd: 2, vig: 1, mig: 1 }, {}, { vow: 'bastion' }), t2);
  assert.strictEqual(vowMods(war, t2).braceBonus, 0.9);
});

// -------------------------------------------------------------- buildSheet
test('buildSheet: full field inventory for a player build', () => {
  const s = buildSheet(L1_ASHBLADE, T);
  assert.strictEqual(s.name, 'Ashblade (canon example)');
  assert.strictEqual(s.clazz, 'ashblade');
  assert.strictEqual(s.className, 'Ashblade');
  assert.strictEqual(s.level, 1);
  assert.strictEqual(s.damageType, 'steel');
  assert.strictEqual(s.mainStat, 'mig');
  assert.strictEqual(s.vow, 'red_tide');
  assert.strictEqual(s.vowName, 'Red Tide');
  assert.deepEqual(s.verses, ['rend', 'opening_cut', 'flay', 'drink_deep']);
  assert.deepEqual(s.items, []);
  assert.strictEqual(s.isEnemy, false);
  assert.strictEqual(s.rite, null);
  assert.strictEqual(s.maxHp, 108);
  assert.strictEqual(s.stats.mig, 10);
  assert.ok(s.alloc);
});
test('buildSheet: name defaults to the class name when omitted', () => {
  const b = mkBuild('ashblade', 1, { mig: 2, hst: 1, vig: 1 }, {});
  delete b.name;
  assert.strictEqual(buildSheet(b, T).name, 'Ashblade');
});
test('buildSheet: verse list is hard-sliced to 4', () => {
  const b = mkBuild('ashblade', 5, { mig: 2, hst: 1, vig: 1 }, { hst: 2, vig: 3, grd: 3 }, {
    verses: ['rend', 'opening_cut', 'flay', 'drink_deep', 'red_flurry', 'crimson_waltz'],
  });
  assert.strictEqual(buildSheet(b, T).verses.length, 4);
});
test('buildSheet: missing verses field → empty array', () => {
  const b = mkBuild('ashblade', 1, { mig: 2, hst: 1, vig: 1 }, {});
  delete b.verses;
  assert.deepEqual(buildSheet(b, T).verses, []);
});
test('buildSheet: throws on illegal player creation sum', () => {
  assert.throws(() => buildSheet(mkBuild('ashblade', 1, { mig: 3, hst: 1 }, {}), T), /Invalid allocation/);
});
test('buildSheet: throws on illegal player levelUps total', () => {
  assert.throws(() => buildSheet(mkBuild('ashblade', 4, { mig: 2, hst: 1, vig: 1 }, { mig: 3 }), T), /Invalid allocation/);
});
test('buildSheet: throws when a player stat breaches cap 10', () => {
  assert.throws(() => buildSheet(mkBuild('cinder_witch', 1, { wit: 2, hst: 2 }, {}), T), /above cap 10/);
});
test('buildSheet: enemy hand-stats pass through untouched', () => {
  const s = buildSheet(BRAM, T);
  assert.deepEqual(s.stats, { vig: 11, mig: 5, wit: 2, grd: 10, hst: 5 });
  assert.strictEqual(s.isEnemy, true);
  assert.strictEqual(s.maxHp, 120);
});
test('buildSheet: enemy over budget throws with the sums in the message', () => {
  const over = { ...BRAM, stats: { vig: 12, mig: 5, wit: 2, grd: 10, hst: 5 } };
  assert.throws(() => buildSheet(over, T), /Enemy over budget: 34 vs 33/);
});
test('buildSheet: enemy under budget throws too (±0 rule)', () => {
  const under = { ...BRAM, stats: { vig: 10, mig: 5, wit: 2, grd: 10, hst: 5 } };
  assert.throws(() => buildSheet(under, T), /Enemy over budget: 32 vs 33/);
});
test('buildSheet: enemy WITHOUT hand stats falls back to alloc math and still must hit budget', () => {
  // creation(4) + levelUps(0) = 31 ≠ 33 → throws (budget gate catches it)
  const b = { ...mkBuild('gravewarden', 1, { grd: 2, vig: 1, mig: 1 }, {}), isEnemy: true };
  assert.throws(() => buildSheet(b, T), /Enemy over budget: 31 vs 33/);
});
test('buildSheet: enemy with alloc that exactly hits budget passes', () => {
  // gravewarden L2: base 27 + creation 4 (grd2 vig1 mig1 → vig/grd hit cap)
  // + levelUps 4 into non-capped mig/hst → stats sum 35 = budget(2).
  const b = { ...mkBuild('gravewarden', 2, { grd: 2, vig: 1, mig: 1 }, { mig: 2, hst: 2 }), isEnemy: true };
  const s = buildSheet(b, T);
  const sum = KEYS.reduce((a, k) => a + s.stats[k], 0);
  assert.strictEqual(sum, 35);
  assert.strictEqual(s.maxHp, 60 + 8 * (9 + 1)); // vig 10
});
test('buildSheet: hpOverride beats the HP formula (Bram 120 vs formula 188)', () => {
  const s = buildSheet(BRAM, T);
  assert.strictEqual(s.maxHp, 120);
  assert.notStrictEqual(s.maxHp, 60 + 8 * 11);
});
test('buildSheet: hpOverride null → formula path', () => {
  const b = { ...BRAM, hpOverride: null };
  assert.strictEqual(buildSheet(b, T).maxHp, 60 + 8 * 11);
});
test('buildSheet: hpOverride 0 is accepted as a (degenerate) value — documented', () => {
  const b = { ...BRAM, hpOverride: 0 };
  assert.strictEqual(buildSheet(b, T).maxHp, 0);
});
test('buildSheet: unknown vow id → vowName falls back to the raw id', () => {
  const s = buildSheet(mkBuild('ashblade', 1, { mig: 2, hst: 1, vig: 1 }, {}, { vow: 'mystery' }), T);
  assert.strictEqual(s.vowName, 'mystery');
});
test('buildSheet: alloc snapshot mirrors the build inputs', () => {
  const s = buildSheet(mkBuild('ashblade', 5, { mig: 2, hst: 1, vig: 1 }, { hst: 2, vig: 3, grd: 3 }), T);
  assert.deepEqual(s.alloc.creation, { vig: 1, mig: 2, wit: 0, grd: 0, hst: 1 });
  assert.deepEqual(s.alloc.levelUps, { vig: 3, mig: 0, wit: 0, grd: 3, hst: 2 });
  assert.strictEqual(s.alloc.total, 12);
});
test('buildSheet: JSON round-trip preserves the sheet exactly', () => {
  const s = buildSheet(FIRST_VESPERS, T);
  const rt = JSON.parse(JSON.stringify(s));
  assert.deepEqual(rt, s);
});
test('buildSheet: rite id passes through for enemies that carry one', () => {
  assert.strictEqual(buildSheet(FIRST_VESPERS, T).rite, 'first_vespers');
});
test('buildSheet: all four class sheets carry their canon damageType + mainStat', () => {
  const expect = {
    ashblade: ['steel', 'mig'], cinder_witch: ['ember', 'wit'],
    gravewarden: ['steel', 'mig'], hollow_cantor: ['shade', 'wit'],
  };
  for (const [cls, [dt, ms]] of Object.entries(expect)) {
    const creation = cls === 'ashblade' ? { mig: 2, hst: 1, vig: 1 }
      : cls === 'cinder_witch' ? { wit: 1, hst: 2, vig: 1 }
      : cls === 'gravewarden' ? { grd: 2, vig: 1, mig: 1 }
      : { wit: 2, hst: 1, vig: 1 };
    const s = buildSheet(mkBuild(cls, 1, creation, {}), T);
    assert.strictEqual(s.damageType, dt);
    assert.strictEqual(s.mainStat, ms);
  }
});

// ------------------------------------------------------------------ derive
test('derive: crit chance = 5% + 1%/HST', () => {
  for (const hst of [0, 3, 7, 10]) {
    const sheet = { stats: { vig: 5, mig: 5, wit: 5, grd: 5, hst }, maxHp: 100 };
    assert.strictEqual(derive(sheet, T).critChance, 0.05 + 0.01 * hst);
  }
});
test('derive: mitigation rates per GRD, capped at 0.6', () => {
  for (const grd of [0, 4, 8, 10, 30]) {
    const sheet = { stats: { vig: 5, mig: 5, wit: 5, grd, hst: 5 }, maxHp: 100 };
    const d = derive(sheet, T);
    assert.strictEqual(d.mitSteel, Math.min(0.6, 0.02 * grd));
    assert.strictEqual(d.mitMagic, Math.min(0.6, 0.01 * grd));
  }
});
test('derive: hp mirrors maxHp', () => {
  const sheet = { stats: { vig: 5, mig: 5, wit: 5, grd: 5, hst: 5 }, maxHp: 137 };
  assert.strictEqual(derive(sheet, T).hp, 137);
});
test('derive: GRD 30 (impossible in-game) still clamps at the cap (defensive)', () => {
  const sheet = { stats: { vig: 5, mig: 5, wit: 5, grd: 30, hst: 5 }, maxHp: 100 };
  assert.strictEqual(derive(sheet, T).mitSteel, 0.6);
  assert.strictEqual(derive(sheet, T).mitMagic, 0.3);
});

// --------------------------------------------------------------- buildLine
test('buildLine: canonical one-line format', () => {
  const sheet = buildSheet(L1_ASHBLADE, T);
  const names = { rend: 'Rend', opening_cut: 'Opening Cut', flay: 'Flay', drink_deep: 'Drink Deep' };
  assert.strictEqual(buildLine(sheet, names),
    'Ashblade · Red Tide · Strike / Rend / Opening Cut / Flay / Drink Deep');
});
test('buildLine: unknown verse id falls back to the raw id (never crashes)', () => {
  const sheet = buildSheet(mkBuild('ashblade', 1, { mig: 2, hst: 1, vig: 1 }, {}, { verses: ['mystery_id'] }), T);
  assert.ok(buildLine(sheet, {}).includes('mystery_id'));
});
test('buildLine: no vow renders "no vow"', () => {
  const sheet = buildSheet(mkBuild('ashblade', 1, { mig: 2, hst: 1, vig: 1 }, {}), T);
  assert.ok(buildLine(sheet, {}).includes('· no vow ·'));
});
test('buildLine: Strike always leads the verse list', () => {
  const sheet = buildSheet(L1_ASHBLADE, T);
  assert.ok(buildLine(sheet, {}).startsWith('Ashblade · Red Tide · Strike / '));
});

// ---------------------------------------------------------------- presets
test('preset L1_ASHBLADE: canon-legal, MIG 10, 108 HP (§13 example reconciliation)', () => {
  const alloc = validateAlloc(L1_ASHBLADE, T);
  assert.strictEqual(alloc.ok, true, alloc.errors.join('; '));
  const s = buildSheet(L1_ASHBLADE, T);
  assert.strictEqual(s.stats.mig, 10, 'MIG maxed at L1 under cap-10');
  assert.strictEqual(s.maxHp, 108);
  assert.strictEqual(s.stats.hst, 9);
  assert.strictEqual(s.stats.vig, 6);
});
test('preset BRAM: budget(1)=33 exact, HP 120 PROVISIONAL:D12, gravewarden kit', () => {
  const conf = checkBudget(BRAM.stats, BRAM.level, T);
  assert.ok(conf.ok);
  const s = buildSheet(BRAM, T);
  assert.strictEqual(s.maxHp, 120);
  for (const v of s.verses) assert.ok(VERSE_BY_ID.has(v), `verse ${v} exists`);
});
test('preset FIRST_VESPERS: budget(7)=45 exact, rite registered, HP 124', () => {
  const conf = checkBudget(FIRST_VESPERS.stats, FIRST_VESPERS.level, T);
  assert.ok(conf.ok);
  assert.ok(RITES[FIRST_VESPERS.rite], 'rite id resolves');
  const s = buildSheet(FIRST_VESPERS, T);
  assert.strictEqual(s.maxHp, 124);
  assert.strictEqual(s.level, 7);
});
for (const cls of CLASS_IDS) {
  for (let L = 1; L <= 10; L++) {
    test(`mirrorPreset(${cls}, L${L}): canon-legal allocation + slottable loadout`, () => {
      const p = mirrorPreset(cls, L);
      const alloc = validateAlloc(p, T);
      assert.strictEqual(alloc.ok, true, `${cls} L${L}: ${alloc.errors.join('; ')}`);
      assert.strictEqual(p.verses.length, 4, '4 slotted verses');
      const pool = poolFor(cls, L).map((v) => v.id);
      for (const v of p.verses) assert.ok(pool.includes(v), `verse ${v} unlocked by L${L}`);
      const s = buildSheet(p, T);
      assert.ok(s.maxHp >= 60 + 8 * 5, 'sane HP floor');
    });
  }
}
test('mirrorPreset: deterministic — same class/level → identical build', () => {
  assert.deepEqual(mirrorPreset('ashblade', 5), mirrorPreset('ashblade', 5));
  assert.deepEqual(mirrorPreset('hollow_cantor', 9), mirrorPreset('hollow_cantor', 9));
});
test('mirrorPreset: L1 spends 0 level-ups; L10 spends 18', () => {
  const l1 = mirrorPreset('ashblade', 1);
  assert.strictEqual(KEYS.reduce((a, k) => a + l1.levelUps[k], 0), 0);
  const l10 = mirrorPreset('ashblade', 10);
  assert.strictEqual(KEYS.reduce((a, k) => a + l10.levelUps[k], 0), 18);
});
test('mirrorPreset: default level is 5', () => {
  assert.deepEqual(mirrorPreset('ashblade'), mirrorPreset('ashblade', 5));
});
test('canon invariants: 4 classes, 5 stat keys, class base sums 27 each', () => {
  assert.strictEqual(CLASS_IDS.length, 4);
  assert.deepEqual(KEYS, ['vig', 'mig', 'wit', 'grd', 'hst']);
  for (const cls of CLASS_IDS) {
    assert.strictEqual(KEYS.reduce((a, k) => a + CLASSES[cls].base[k], 0), 27, cls);
  }
});
test('canon invariants: tuning overrides never mutate CANON (deep isolation)', () => {
  const before = JSON.stringify(CANON);
  const t2 = createTuning({ hpBase: 999, fatigue: { startRound: 5 }, statusTurns: { bleed: 9 } });
  assert.strictEqual(t2.hpBase, 999);
  assert.strictEqual(t2.fatigue.startRound, 5);
  assert.strictEqual(t2.statusTurns.bleed, 9);
  assert.strictEqual(CANON.hpBase, 60);
  assert.strictEqual(JSON.stringify(CANON), before, 'CANON byte-identical after overrides');
});
test('canon invariants: createTuning() with no args returns the CANON object itself', () => {
  assert.strictEqual(createTuning(), CANON);
  assert.strictEqual(createTuning(null), CANON);
  assert.strictEqual(createTuning(undefined), CANON);
});
test('canon invariants: array overrides REPLACE, not merge', () => {
  const t2 = createTuning({ fatigue: { schedule: [9, 9, 9] } });
  assert.deepEqual(t2.fatigue.schedule, [9, 9, 9]);
  assert.strictEqual(t2.fatigue.schedule.length, 3);
});
test('diffTuning: canon tuning → zero deviations', () => {
  assert.deepEqual(diffTuning(CANON), []);
  assert.deepEqual(diffTuning(createTuning()), []);
});
test('diffTuning: every override is reported with path, canon value and tag', () => {
  const t2 = createTuning({ hpBase: 70, resolveCap: 12 });
  const diffs = diffTuning(t2);
  const hp = diffs.find((d) => d.path === 'hpBase');
  assert.ok(hp, 'hpBase reported');
  assert.strictEqual(hp.canon, 60);
  assert.strictEqual(hp.current, 70);
  const cap = diffs.find((d) => d.path === 'resolveCap');
  assert.ok(cap);
  assert.ok(typeof cap.tag === 'string' && cap.tag.length > 0);
});
test('diffTuning: nested override paths are dotted', () => {
  const diffs = diffTuning(createTuning({ fatigue: { startRound: 10 } }));
  const row = diffs.find((d) => d.path === 'fatigue.startRound');
  assert.ok(row);
  assert.strictEqual(row.canon, 16);
  assert.strictEqual(row.current, 10);
});
test('diffTuning: unknown (custom) paths are reported as custom', () => {
  const t2 = createTuning({ experiment: 5 });
  const diffs = diffTuning(t2);
  const row = diffs.find((d) => d.path === 'experiment');
  assert.ok(row);
  assert.strictEqual(row.canon, '(absent)');
  assert.strictEqual(row.tag, 'custom');
});

// ======================================================================
// Systematic sweeps — round out fighter coverage past the 150 mark
// ======================================================================

// budgetFor under tuning perturbations (per-level sweep)
for (const [base, per] of [[33, 2], [27, 0], [40, 3], [33, 5]]) {
  for (const L of [1, 3, 5, 7, 10]) {
    test(`sweep budgetFor base=${base} per=${per} @L${L} = ${base + per * (L - 1)}`, () => {
      const t2 = createTuning({ budgetBase: base, budgetPerLevel: per });
      assert.strictEqual(budgetFor(L, t2), base + per * (L - 1));
    });
  }
}

// per-class buildSheet field sweeps at several levels
for (const cls of CLASS_IDS) {
  for (const L of [1, 5, 10]) {
    test(`sweep buildSheet[${cls} L${L}]: mirror preset assembles a valid sheet with class identity`, () => {
      const p = mirrorPreset(cls, L);
      const s = buildSheet(p, T);
      assert.strictEqual(s.clazz, cls);
      assert.strictEqual(s.className, CLASSES[cls].name);
      assert.strictEqual(s.damageType, CLASSES[cls].damageType);
      assert.strictEqual(s.mainStat, CLASSES[cls].mainStat);
      assert.strictEqual(s.level, L);
      assert.ok(s.maxHp >= 60 + 8 * 5 && s.maxHp <= 60 + 8 * 10);
      for (const k of KEYS) {
        assert.ok(Number.isInteger(s.stats[k]) && s.stats[k] >= CLASSES[cls].base[k] && s.stats[k] <= 10, `${k}=${s.stats[k]}`);
      }
    });
  }
}

// validateAlloc error-message quality sweep (each failure names its field)
for (const [label, build, fragment] of [
  ['creation short', mkBuild('ashblade', 1, { mig: 2, hst: 1 }, {}), 'creation must total 4 (got 3)'],
  ['levelUps short', mkBuild('ashblade', 2, { mig: 2, hst: 1, vig: 1 }, {}), 'level-ups must total 2 (got 0)'],
  ['cap breach vig', mkBuild('cinder_witch', 6, { wit: 1, hst: 2, vig: 1 }, { vig: 10 }), 'vig above cap 10'],
  ['below base', mkBuild('ashblade', 1, { mig: 5, hst: 1, vig: -2 }, {}), 'below class base'],
]) {
  test(`sweep validateAlloc error names the problem: ${label}`, () => {
    const r = validateAlloc(build, T);
    assert.strictEqual(r.ok, false);
    assert.ok(r.errors.some((e) => e.includes(fragment)), r.errors.join('; '));
  });
}

// vowMods sweep: each vow leaves every NON-documented field at default
for (const [cls, vow, touched] of [
  ['ashblade', 'red_tide', ['bleedCap', 'bleedTickBonus']],
  ['ashblade', 'duelist', ['critBonus', 'critMult']],
  ['ashblade', 'hunger', ['lifestealPct']],
  ['cinder_witch', 'slow_ash', ['burnTurns', 'burnPotency']],
  ['cinder_witch', 'pyre', ['emberVsBurning']],
  ['cinder_witch', 'kindling', ['burnTickResolve']],
  ['gravewarden', 'bastion', ['mitBonus', 'braceBonus']],
  ['gravewarden', 'thorn_bearer', ['thornsBonus']],
  ['gravewarden', 'long_dark', ['turnStartHealPct']],
  ['hollow_cantor', 'last_hymn', ['curseMult', 'curseTurns']],
  ['hollow_cantor', 'echoing_grief', ['shadePerDebuff']],
  ['hollow_cantor', 'silence', ['hushMod', 'hushApplyResolve']],
]) {
  test(`sweep vowMods[${vow}]: only ${touched.join(', ')} deviate from defaults`, () => {
    const sheet = buildSheet(mkBuild(cls, 1, clsCreation(cls), {}, { vow }), T);
    const mods = vowMods(sheet, T);
    const base = vowMods(buildSheet(mkBuild(cls, 1, clsCreation(cls), {}), T), T);
    for (const key of Object.keys(base)) {
      if (touched.includes(key)) {
        assert.notStrictEqual(mods[key], base[key], `${key} should deviate`);
      } else {
        assert.strictEqual(mods[key], base[key], `${key} should stay default`);
      }
    }
  });
}

// derive sweep across the full HST/GRD grids
for (let hst = 0; hst <= 10; hst++) {
  test(`sweep derive crit @HST ${hst} = ${(0.05 + 0.01 * hst).toFixed(2)}`, () => {
    const sheet = { stats: { vig: 5, mig: 5, wit: 5, grd: 5, hst }, maxHp: 100 };
    assert.strictEqual(derive(sheet, T).critChance, 0.05 + 0.01 * hst);
  });
}
for (let grd = 0; grd <= 10; grd++) {
  test(`sweep derive mitigation @GRD ${grd} respects both rates and the cap`, () => {
    const sheet = { stats: { vig: 5, mig: 5, wit: 5, grd, hst: 5 }, maxHp: 100 };
    const d = derive(sheet, T);
    assert.strictEqual(d.mitSteel, Math.min(0.6, 0.02 * grd));
    assert.strictEqual(d.mitMagic, Math.min(0.01 * grd, 0.6));
  });
}

// buildLine sweep: every preset renders a readable line without crashing
for (const cls of CLASS_IDS) {
  test(`sweep buildLine[${cls}]: starts with class name, contains vow or 'no vow', has Strike`, () => {
    const sheet = buildSheet(mirrorPreset(cls, 5), T);
    const line = buildLine(sheet, {});
    assert.ok(line.startsWith(CLASSES[cls].name + ' · '));
    assert.ok(line.includes(' · no vow · '));
    assert.ok(line.startsWith('') && line.includes('Strike'));
    assert.ok(!line.includes('undefined'), 'no undefined leaks into player-facing text');
  });
}
