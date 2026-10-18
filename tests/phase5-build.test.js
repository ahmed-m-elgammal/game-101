// phase5-build.test.js — T5.1 acceptance: build assembly & validation.
// Every illegal combination is rejected with a specific reason code; the
// canonical serialization is stable across key orders and runs (golden
// strings); assembleBuild feeds buildSheet with ZERO divergence (assembled
// builds fight); story-state injection; the §12.6 Echo-Code dialect.
'use strict';
const test = require('node:test');
const assert = require('node:assert');

const { CANON } = require('../data/config.js');
const {
  assembleBuild, validateBuild, canonicalBuild, serializeBuild, statBudget,
} = require('../engine/build.js');
const { buildSheet, validateAlloc, finalStats, budgetFor } = require('../engine/fighter.js');
const { CLASSES, CLASS_IDS, STAT_KEYS } = require('../data/classes.js');
const { VERSES, getVerse, poolFor } = require('../data/verses.js');
const { VOWS, STORY_VOWS } = require('../data/vows.js');
const { ITEMS, ITEM_BY_ID } = require('../data/items.js');
const { DOCTRINES, DOCTRINE_IDS } = require('../data/doctrines.js');
const { runFight } = require('../engine/fight.js');

const T = CANON;

// The reference legal build per class (16 points at L7 split under every cap).
function legalFor(clazz, over = {}) {
  const caps = {};
  for (const k of STAT_KEYS) caps[k] = 10 - CLASSES[clazz].stats[k];
  // greedy: fill in STAT_KEYS order up to 16, respecting per-stat caps
  const alloc = {}; let left = statBudget(7);
  for (const k of STAT_KEYS) { const p = Math.min(caps[k], left); alloc[k] = p; left -= p; }
  // 16 points must fit under the caps of every class (sum of caps = 50 − 27 = 23)
  assert.strictEqual(left, 0, `${clazz} has room for 16 points`);
  const firstCommon = poolFor(clazz, 1).filter((v) => !v.isStrike).slice(0, 4).map((v) => v.id);
  const gear = ['pallbearers_mace', 'sextons_shroud', 'reliquary_lantern'];
  return {
    name: 'Probe', clazz, level: 7, alloc, vow: CLASSES[clazz].vows[0].id,
    verses: firstCommon, gear: { weapon: gear[0], vestment: gear[1], relic: gear[2] },
    doctrine: 'hymnal', ...over,
  };
}

const MOURNE = {
  name: 'Mourne', clazz: 'hollow_cantor', level: 7,
  alloc: { vig: 3, mig: 1, wit: 2, grd: 6, hst: 4 },
  vow: 'silence',
  verses: ['tolling_bell', 'dirge', 'requiem', 'dissonance'],
  gear: { weapon: 'cantors_tuning_fork', vestment: 'drowned_mantle', relic: 'deaf_wax' },
  doctrine: 'hymnal',
};

// ----------------------------------------------------------------- helpers
const codeOf = (r, c) => r.errors.some((e) => e.code === c && e.field === c.split('_')[0] === 'GEAR' ? true : true) && r.errors.find((e) => e.code === c);
function assertCodes(r, ...codes) {
  assert.strictEqual(r.ok, false, `expected rejection, got ok (errors: ${JSON.stringify(r.errors)})`);
  for (const c of codes) {
    assert.ok(r.errors.some((e) => e.code === c), `missing reason code ${c} in ${JSON.stringify(r.errors)}`);
  }
}
function assertJust(r, c) { // exactly one reason
  assertCodes(r, c);
  assert.strictEqual(r.errors.length, 1, `expected ONLY ${c}, got ${JSON.stringify(r.errors)}`);
}

// ------------------------------------------------------------- legality
test('T5.1: every legal class build assembles and round-trips through buildSheet', () => {
  for (const cls of CLASS_IDS) {
    const r = assembleBuild(legalFor(cls), T);
    assert.strictEqual(r.ok, true, `${cls}: ${JSON.stringify(r.errors)}`);
    const sheet = buildSheet(r.build, T); // zero divergence — never throws
    assert.strictEqual(sheet.clazz, cls);
    assert.strictEqual(sheet.doctrine, 'hymnal');
    assert.strictEqual(validateAlloc(r.build, T).ok, true);
  }
});

test('T5.1: level bounds 1–10 with the specific reason code', () => {
  for (const lvl of [0, 11, -1, 2.5, '7']) {
    assertJust(assembleBuild({ ...MOURNE, level: lvl }, T), 'LEVEL_RANGE');
  }
  for (const lvl of [1, 10]) {
    assert.strictEqual(assembleBuild({ ...legalFor('ashblade'), level: lvl, alloc: legalAlloc('ashblade', lvl) }, T).ok, true);
  }
});

function legalAlloc(clazz, level) {
  const caps = {};
  for (const k of STAT_KEYS) caps[k] = 10 - CLASSES[clazz].stats[k];
  const alloc = {}; let left = statBudget(level);
  for (const k of STAT_KEYS) { const p = Math.min(caps[k], left); alloc[k] = p; left -= p; }
  assert.strictEqual(left, 0, `L${level} budget fits ${clazz}`);
  return alloc;
}

test('T5.1: alloc over the L-cap is ALLOC_OVER (N1: the validator is never loosened)', () => {
  const over = { vig: 4, mig: 4, wit: 4, grd: 4, hst: 4 }; // 20 > 16 at L7
  const r = assembleBuild({ ...MOURNE, alloc: over }, T);
  assertJust(r, 'ALLOC_OVER');
  assert.ok(r.errors[0].message.includes('cap of 16'), r.errors[0].message);
  assert.ok(r.errors[0].message.includes('N1'), 'the message cites N1');
});

test('T5.1: under-spent alloc is ALLOC_SHORTFALL — points are granted, never banked', () => {
  const under = { vig: 1, mig: 0, wit: 2, grd: 0, hst: 0 }; // 3 of 16
  const r = assembleBuild({ ...MOURNE, alloc: under }, T);
  assertJust(r, 'ALLOC_SHORTFALL');
  assert.ok(r.errors[0].message.includes('3 of 16'), r.errors[0].message);
});

test('T5.1: per-stat cap 10 — the §12.6 example shape (wit 9 on a cantor) is rejected', () => {
  // base wit 8 + alloc 9 = 17 > 10 — the corrected-sum example still fails
  // the STAT cap; the point cap is not the stat cap.
  const r = assembleBuild({ ...MOURNE, alloc: { vig: 3, mig: 0, wit: 9, grd: 1, hst: 3 } }, T);
  assertCodes(r, 'STAT_CAP');
  const err = r.errors.find((e) => e.code === 'STAT_CAP');
  assert.strictEqual(err.field, 'alloc.wit');
  assert.ok(err.message.includes('17'), err.message);
});

test('T5.1: verse legality — unknown / wrong class / locked / duplicate / over-slots / Strike', () => {
  assertJust(assembleBuild({ ...MOURNE, verses: ['no_such_verse', 'dirge', 'requiem', 'dissonance'] }, T), 'VERSE_UNKNOWN');
  assertJust(assembleBuild({ ...MOURNE, verses: ['rend', 'dirge', 'requiem', 'dissonance'] }, T), 'VERSE_CLASS');
  // seventh_verse unlocks at L7 for the cantor — it assembles:
  assert.strictEqual(assembleBuild({ ...MOURNE, verses: ['seventh_verse', 'dirge', 'requiem', 'dissonance'] }, T).ok, true);
  // an out-of-class L5 verse on a cantor is unlock- AND class-illegal — probe
  // the unlock on an IN-class L-too-low verse instead (dirge unlocks at L1,
  // so build at L1 with an L2+ cantor verse):
  const later = VERSES.find((v) => v.cls === 'hollow_cantor' && v.unlockLevel === 4);
  const low = { ...legalFor('hollow_cantor'), level: 3, alloc: legalAlloc('hollow_cantor', 3), verses: [later.id, 'dirge', 'wither_note', 'soul_siphon'] };
  assertJust(assembleBuild(low, T), 'VERSE_UNLOCK');
  assertJust(assembleBuild({ ...MOURNE, verses: ['dirge', 'dirge', 'requiem', 'dissonance'] }, T), 'VERSE_DUP');
  assertJust(assembleBuild({ ...MOURNE, verses: ['dirge', 'requiem', 'dissonance', 'lullaby', 'wither_note'] }, T), 'VERSE_SLOT_LIMIT');
  assertJust(assembleBuild({ ...MOURNE, verses: ['strike', 'dirge', 'requiem', 'dissonance'] }, T), 'VERSE_STRIKE_IMPLICIT');
});

test('T5.1: slot order is the Echo priority — order preserved, not sorted', () => {
  const a = assembleBuild({ ...MOURNE, verses: ['requiem', 'dirge'] }, T);
  const b = assembleBuild({ ...MOURNE, verses: ['dirge', 'requiem'] }, T);
  assert.notDeepStrictEqual(a.build.verses, b.build.verses);
  assert.deepStrictEqual(a.build.verses, ['requiem', 'dirge']);
});

test('T5.1: vow legality — unknown, wrong class, story-state locked, hidden', () => {
  assertJust(assembleBuild({ ...MOURNE, vow: 'no_such_vow' }, T), 'VOW_UNKNOWN');
  assertJust(assembleBuild({ ...MOURNE, vow: 'red_tide' }, T), 'VOW_CLASS'); // ashblade vow on cantor
  assertJust(assembleBuild({ ...MOURNE, vow: 'ysoldes_vow' }, T), 'VOW_STORY_LOCKED');
  assert.strictEqual(assembleBuild({ ...MOURNE, vow: 'ysoldes_vow', storyState: ['ysoldes_vow'] }, T).ok, true);
  // story vows of another class earned — still class-locked
  const r = assembleBuild({ ...MOURNE, vow: 'grey_duelist', storyState: ['grey_duelist'] }, T);
  assertCodes(r, 'VOW_CLASS'); // grey_duelist is ashblade-bound
  // the hidden vow needs the explicit path (§7.2: excluded from every picker)
  assertJust(assembleBuild({ ...MOURNE, vow: 'counter_voice', storyState: ['counter_voice'] }, T), 'VOW_HIDDEN');
  assert.strictEqual(assembleBuild({ ...MOURNE, vow: 'counter_voice', storyState: ['counter_voice'], allowHiddenVow: true }, T).ok, true);
});

test('T5.1: story-state parameter — earned set injected by campaign state', () => {
  // the vow must be IN the injected set; extra earned ids neither help nor hurt
  const earned = STORY_VOWS.filter((v) => !v.hidden).map((v) => v.id);
  const withIt = assembleBuild({ ...legalFor('hollow_cantor'), vow: 'ysoldes_vow', storyState: earned }, T);
  assert.strictEqual(withIt.ok, true, JSON.stringify(withIt.errors));
  const withoutIt = assembleBuild({ ...legalFor('hollow_cantor'), vow: 'ysoldes_vow', storyState: earned.filter((x) => x !== 'ysoldes_vow') }, T);
  assertJust(withoutIt, 'VOW_STORY_LOCKED');
  const empty = assembleBuild({ ...legalFor('hollow_cantor'), vow: 'ysoldes_vow', storyState: [] }, T);
  assertJust(empty, 'VOW_STORY_LOCKED');
});

test('T5.1: gear legality — unknown id, wrong slot; empty slots and the array dialect', () => {
  assertJust(assembleBuild({ ...MOURNE, gear: { weapon: 'no_such_item', vestment: null, relic: null } }, T), 'GEAR_UNKNOWN');
  assertJust(assembleBuild({ ...MOURNE, gear: { weapon: 'drowned_mantle', vestment: null, relic: null } }, T), 'GEAR_SLOT');
  // a duplicate cannot occupy two legal slots (one id per slot by shape) —
  // the mis-slot code is what fires:
  assertCodes(assembleBuild({ ...MOURNE, gear: { weapon: 'deaf_wax', vestment: 'deaf_wax', relic: null } }, T), 'GEAR_SLOT');
  // array dialect and empty slots are accepted
  const arr = assembleBuild({ ...MOURNE, gear: ['cantors_tuning_fork', 'drowned_mantle', null] }, T);
  assert.strictEqual(arr.ok, true, JSON.stringify(arr.errors));
  assert.deepStrictEqual(arr.build.items, ['cantors_tuning_fork', 'drowned_mantle']);
});

test('T5.1: doctrine legality — unknown refused; all four canon doctrines accepted', () => {
  assertJust(assembleBuild({ ...MOURNE, doctrine: 'standard' }, T), 'DOCTRINE_UNKNOWN');
  assertJust(assembleBuild({ ...MOURNE, doctrine: undefined }, T), 'DOCTRINE_UNKNOWN');
  for (const d of DOCTRINE_IDS) {
    if (d === 'cantors_hand') continue;
    assert.strictEqual(assembleBuild({ ...MOURNE, doctrine: d }, T).ok, true, d);
  }
});

test("T5.1: Cantor's Hand is reserved (Rite users + one named Echo) — reason-coded, not silent", () => {
  const r = assembleBuild({ ...MOURNE, doctrine: 'cantors_hand' }, T);
  assertJust(r, 'DOCTRINE_RESERVED');
  assert.ok(r.errors[0].message.includes('Reserved for the Rites users'), r.errors[0].message);
  // a Rite user may hold it
  assert.strictEqual(assembleBuild({ ...MOURNE, doctrine: 'cantors_hand', rite: 'halbrey_passage' }, T).ok, true);
  // the named-Echo opt-in path (T5.5/T7.2 names the Echo)
  assert.strictEqual(assembleBuild({ ...MOURNE, doctrine: 'cantors_hand', allowReservedDoctrine: true }, T).ok, true);
});

test('T5.1: unknown rite is refused; a known rite assembles', () => {
  assertJust(assembleBuild({ ...MOURNE, rite: 'no_such_rite' }, T), 'RITE_UNKNOWN');
  assert.strictEqual(assembleBuild({ ...MOURNE, rite: 'first_vespers' }, T).ok, true);
});

// --------------------------------------------------- serialization
test('T5.1: canonical serialization is key-order independent (golden string)', () => {
  const shuffled = {
    doctrine: 'hymnal',
    gear: { relic: 'deaf_wax', vestment: 'drowned_mantle', weapon: 'cantors_tuning_fork' },
    verses: ['tolling_bell', 'dirge', 'requiem', 'dissonance'],
    vow: 'silence',
    alloc: { hst: 4, grd: 6, wit: 2, mig: 1, vig: 3 },
    level: 7, clazz: 'hollow_cantor', name: 'Mourne',
  };
  const s1 = serializeBuild(MOURNE);
  const s2 = serializeBuild(shuffled);
  assert.strictEqual(s1, s2);
  // golden string — stable across runs (T9.1 save identity + Echo Codes)
  assert.strictEqual(s1, '{"v":1,"name":"Mourne","cls":"hollow_cantor","level":7,"alloc":{"vig":3,"mig":1,"wit":2,"grd":6,"hst":4},"vow":"silence","verses":["tolling_bell","dirge","requiem","dissonance"],"gear":{"weapon":"cantors_tuning_fork","vestment":"drowned_mantle","relic":"deaf_wax"},"doctrine":"hymnal","rite":null}');
});

test('T5.1: serialization is stable across repeated runs and deep-frozen input', () => {
  const frozen = JSON.parse(JSON.stringify(MOURNE));
  const a = serializeBuild(frozen);
  const b = serializeBuild(frozen);
  assert.strictEqual(a, b);
  // slot order matters — a different priority is a DIFFERENT string
  assert.notStrictEqual(serializeBuild({ ...MOURNE, verses: ['dirge', 'tolling_bell', 'requiem', 'dissonance'] }), a);
});

test('T5.1: serializing an illegal build throws with the reason codes named', () => {
  assert.throws(() => serializeBuild({ ...MOURNE, level: 11 }), /LEVEL_RANGE/);
  assert.throws(() => serializeBuild({ ...MOURNE, alloc: { vig: 9, mig: 9, wit: 9, grd: 9, hst: 9 } }), /ALLOC_OVER/);
});

test('T5.1: canonicalBuild normalizes both dialects (creation/levelUps and alloc)', () => {
  const viaAlloc = canonicalBuild(MOURNE);
  const viaSplit = canonicalBuild({
    ...MOURNE,
    alloc: undefined,
    creation: { vig: 3, mig: 1, wit: 0, grd: 0, hst: 0 },
    levelUps: { vig: 0, mig: 0, wit: 2, grd: 6, hst: 4 },
  });
  assert.deepStrictEqual(viaAlloc, viaSplit);
  assert.deepStrictEqual(viaSplit.alloc, { vig: 3, mig: 1, wit: 2, grd: 6, hst: 4 });
});

test('T5.1: the deterministic creation/levelUps split fills creation first (STAT_KEYS order)', () => {
  const r = assembleBuild({ ...legalFor('ashblade') }, T);
  const alloc = legalFor('ashblade').alloc;
  let left = 4;
  for (const k of STAT_KEYS) {
    const expect = Math.min(left, alloc[k]);
    assert.strictEqual(r.build.creation[k], expect, `creation.${k}`);
    assert.strictEqual(r.build.levelUps[k], alloc[k] - expect, `levelUps.${k}`);
    left -= expect;
  }
});

test('T5.1: validateBuild returns the errors without the build', () => {
  const v = validateBuild({ ...MOURNE, level: 0 }, T);
  assert.strictEqual(v.ok, false);
  assert.strictEqual(v.build, undefined);
  assert.strictEqual(v.errors.length, 1);
});

// ------------------------------------------------- zero divergence
test('T5.1: assembled builds fight — 20 seeded duels, all terminate within the ceiling', () => {
  for (let seed = 0; seed < 20; seed++) {
    const a = assembleBuild(legalFor('ashblade'), T).build;
    const b = assembleBuild(legalFor('hollow_cantor'), T).build;
    const r = runFight(a, b, { tuning: T, seed });
    assert.ok(r.over && r.winner, `seed ${seed} produced a winner`);
    assert.ok(r.rounds <= 20, `seed ${seed} within the Fatigue ceiling`);
  }
});

test('T5.1: same loadout in different key orders → the same seed derivation through canonical form', () => {
  const { deriveSeed } = require('../rng/index.js');
  const a = canonicalBuild(MOURNE);
  const b = canonicalBuild({
    doctrine: 'hymnal',
    gear: { relic: 'deaf_wax', vestment: 'drowned_mantle', weapon: 'cantors_tuning_fork' },
    verses: ['tolling_bell', 'dirge', 'requiem', 'dissonance'],
    vow: 'silence',
    alloc: { hst: 4, grd: 6, wit: 2, mig: 1, vig: 3 },
    level: 7, clazz: 'hollow_cantor', name: 'Mourne',
  });
  assert.strictEqual(JSON.stringify(a), JSON.stringify(b));
  assert.strictEqual(deriveSeed(a, b, 0, 'reading'), deriveSeed(b, a, 0, 'reading'));
});

test('T5.1: §12.6 Echo-Code dialect validates — including the N1-corrected example shape', () => {
  // N1's corrected example: {3,0,9,1,3} sums 16 — but wit 9 on a cantor
  // breaks the STAT cap, so the code path rejects it with that reason (the
  // shape layer's point cap and the stat cap are different guards).
  const n1 = assembleBuild({
    v: 1, name: 'Mourne', cls: 'cantor2' === 'x' ? 'ashblade' : 'hollow_cantor', level: 7,
    alloc: { vig: 3, mig: 0, wit: 9, grd: 1, hst: 3 },
    vow: 'silence', verses: ['tolling_bell', 'dirge', 'requiem', 'dissonance'],
    gear: { weapon: 'tuning_fork', vestment: 'drowned_mantle', relic: 'deaf_wax' },
    doctrine: 'bulwark',
  }, T);
  assert.strictEqual(n1.ok, false);
  assert.ok(n1.errors.some((e) => e.code === 'STAT_CAP'), JSON.stringify(n1.errors));
  // a genuinely legal code-shape build assembles
  const ok = assembleBuild({
    v: 1, name: 'Mourne', cls: 'hollow_cantor', level: 7,
    alloc: { vig: 3, mig: 1, wit: 2, grd: 6, hst: 4 },
    vow: 'silence', verses: ['tolling_bell', 'dirge', 'requiem', 'dissonance'],
    gear: { weapon: 'cantors_tuning_fork', vestment: 'drowned_mantle', relic: 'deaf_wax' },
    doctrine: 'bulwark',
  }, T);
  assert.strictEqual(ok.ok, true, JSON.stringify(ok.errors));
  assert.strictEqual(ok.build.doctrine, 'bulwark');
});

test('T5.1: every class at every boundary level assembles legally (1, 5, 10)', () => {
  for (const cls of CLASS_IDS) {
    for (const lvl of [1, 5, 10]) {
      const r = assembleBuild({ ...legalFor(cls), level: lvl, alloc: legalAlloc(cls, lvl) }, T);
      assert.strictEqual(r.ok, true, `${cls} L${lvl}: ${JSON.stringify(r.errors)}`);
    }
  }
});

test('T5.1: the rejected-build inventory — each reason code fires through its dedicated negative', () => {
  const negatives = [
    ['CLASS_UNKNOWN', { clazz: 'nope' }],
    ['LEVEL_RANGE', { level: 0 }],
    ['ALLOC_SHAPE', { alloc: { vig: -1, mig: 0, wit: 0, grd: 0, hst: 0 } }],
    ['ALLOC_OVER', { alloc: { vig: 16, mig: 16, wit: 16, grd: 16, hst: 16 } }],
    ['ALLOC_SHORTFALL', { alloc: { vig: 0, mig: 0, wit: 0, grd: 0, hst: 0 } }],
    ['STAT_CAP', { alloc: { vig: 3, mig: 1, wit: 9, grd: 1, hst: 2 } }],
    ['VERSE_UNKNOWN', { verses: ['ghost_verse', 'dirge', 'requiem', 'dissonance'] }],
    ['VERSE_CLASS', { verses: ['rend', 'dirge', 'requiem', 'dissonance'] }],
    ['VERSE_DUP', { verses: ['dirge', 'dirge', 'requiem', 'dissonance'] }],
    ['VERSE_SLOT_LIMIT', { verses: ['dirge', 'requiem', 'dissonance', 'lullaby', 'wither_note'] }],
    ['VERSE_STRIKE_IMPLICIT', { verses: ['strike', 'dirge', 'requiem', 'dissonance'] }],
    ['VOW_UNKNOWN', { vow: 'ghost_vow' }],
    ['VOW_CLASS', { vow: 'red_tide' }],
    ['VOW_STORY_LOCKED', { vow: 'ysoldes_vow' }],
    ['VOW_HIDDEN', { vow: 'counter_voice', storyState: ['counter_voice'] }],
    ['GEAR_UNKNOWN', { gear: { weapon: 'ghost_blade', vestment: null, relic: null } }],
    ['GEAR_SLOT', { gear: { weapon: 'drowned_mantle', vestment: null, relic: null } }],
    ['DOCTRINE_UNKNOWN', { doctrine: 'standard' }],
    ['DOCTRINE_RESERVED', { doctrine: 'cantors_hand' }],
    ['RITE_UNKNOWN', { rite: 'ghost_rite' }],
    ['NAME_TYPE', { name: 42 }],
  ];
  for (const [code, patch] of negatives) {
    const r = assembleBuild({ ...MOURNE, ...patch }, T);
    assert.strictEqual(r.ok, false, `${code}: expected rejection`);
    assert.ok(r.errors.some((e) => e.code === code), `${code}: ${JSON.stringify(r.errors)}`);
  }
});
