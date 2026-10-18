// phase4-content.test.js — T4.1–T4.5 acceptance: the Content Data Layer.
// Every row schema-valid; loader failures name kind/row/field; immutability;
// fixture mode independent; counts canon-exact (42 verses / 24 vows / 40
// items / 40 source rows); reward integrity a/b/c; kit matrix verbatim.
'use strict';
const test = require('node:test');
const assert = require('node:assert');

const { CANON } = require('../data/config.js');
const { validate, OPCODES } = require('../data/schemas/validators.js');
const CLASSES_MOD = require('../data/classes.js');
const { VERSES, STRIKE, getVerse } = require('../data/verses.js');
const { VOWS, CLASS_VOWS, STORY_VOWS, vowsFor } = require('../data/vows.js');
const { ITEMS, WEAPONS, VESTMENTS, RELICS, affinityCount } = require('../data/items.js');
const { SOURCES } = require('../data/sources.js');
const {
  assembleContent, loadReal, makeRegistry, deepFreeze, CONTENT_VERSION,
} = require('../data/index.js');
const { FIXTURE_CONTENT } = require('../data/fixtures.js');
const { markMods, mergeMods } = require('../engine/marks.js');

// ---------------------------------------------------------------------------
// T4.1 — loaders, indexes, immutability, fixture mode, version stamp
// ---------------------------------------------------------------------------
test('T4.1: loadReal() validates every row and freezes the loaded content', () => {
  const c = loadReal();
  assert.strictEqual(c.classes.length, 4);
  assert.strictEqual(c.verses.length, 42, 'canon counts Strike in the 42 (§6.1 has 6 common)');
  assert.strictEqual(c.vows.length, 24);
  assert.strictEqual(c.items.length, 40);
  assert.ok(Object.isFrozen(c) && Object.isFrozen(c.verses) && Object.isFrozen(c.verses[0]));
  assert.ok(Object.isFrozen(c.items[0]) && Object.isFrozen(c.items[0].mark));
});

test('T4.1: malformed row → load error naming kind, row id, and field', () => {
  const bad = JSON.parse(JSON.stringify(FIXTURE_CONTENT));
  bad.verses[0].cost = -5;
  assert.throws(() => assembleContent(bad), (e) => {
    return /data load failed: verse "fix_cut"/.test(e.message) && /below min/.test(e.message);
  });
  const bad2 = JSON.parse(JSON.stringify(FIXTURE_CONTENT));
  bad2.items[0].slot = 'hat';
  assert.throws(() => assembleContent(bad2), (e) => /item "fix_item_ward".*slot/.test(e.message));
  const bad3 = JSON.parse(JSON.stringify(FIXTURE_CONTENT));
  bad3.items[1].source = 'ch99_nowhere';
  assert.throws(() => assembleContent(bad3), (e) => /source "ch99_nowhere" does not resolve/.test(e.message));
  const bad4 = JSON.parse(JSON.stringify(FIXTURE_CONTENT));
  bad4.vows[1].source = 'not_a_source';
  assert.throws(() => assembleContent(bad4), (e) => /vow "fix_vow_story".*not_a_source/.test(e.message));
  const bad5 = JSON.parse(JSON.stringify(FIXTURE_CONTENT));
  bad5.classes[0].verses.push('no_such_verse');
  assert.throws(() => assembleContent(bad5), (e) => /verse "no_such_verse" not in the verse catalogue/.test(e.message));
});

test('T4.1: immutability — mutation attempts throw or no-op, source rows untouched', () => {
  const c = loadReal();
  assert.throws(() => { c.verses[0].cost = 99; }, TypeError);
  assert.throws(() => { c.items[0].mark.push({}); }, TypeError);
  assert.throws(() => { c.indexes.classIds.push('x'); }, TypeError);
  // the module singletons stay mutable (they are the authoring surface)
  assert.strictEqual(getVerse('rend').cost, 2);
  assert.strictEqual(VERSES.length, 41);
});

test('T4.1: indexes serve unlock/affinity/grants queries', () => {
  const c = loadReal();
  const l1 = c.indexes.unlockIndex.get('ashblade|1');
  assert.ok(l1.some((v) => v.id === 'rend') && l1.some((v) => v.id === 'vigils_rest'));
  assert.ok(!l1.some((v) => v.id === 'blood_ledger'), 'L7 verse not at L1');
  assert.strictEqual(c.indexes.unlockIndex.get('ashblade|7').some((v) => v.id === 'blood_ledger'), true);
  assert.deepStrictEqual(c.indexes.affinityIndex.get('cinder_witch').sort(),
    ['cinder_apron', 'reliquary_lantern', 'ysoldes_censer']);
  assert.deepStrictEqual(c.indexes.grantsIndex.get('ch1_choice_ruthless'), ['pallbearers_mace']);
  const l7 = c.indexes.unlockIndex.get('hollow_cantor|7');
  assert.ok(l7.filter((v) => v.cls === 'hollow_cantor').length === 9);
});

test('T4.1: fixture mode loads independently of real content', () => {
  const fx = assembleContent(FIXTURE_CONTENT);
  assert.strictEqual(fx.verses.length, 9);
  assert.strictEqual(fx.vows.length, 2);
  assert.strictEqual(fx.items.length, 2);
  assert.ok(Object.isFrozen(fx.verses[0]));
  assert.ok(fx.indexes.unlockIndex.get('ashblade|7').some((v) => v.id === 'fix_last'));
  // fixture ids never collide with the real catalogue
  const real = loadReal();
  for (const v of fx.verses) {
    assert.strictEqual(real.indexes.verseById.has(v.id), false, v.id);
  }
});

test('T4.1: registry + version stamp (T9.1 save states)', () => {
  const c = loadReal();
  const reg = makeRegistry(c);
  assert.strictEqual(reg.verseIds.length, 42);
  assert.strictEqual(reg.itemIds.length, 40);
  assert.strictEqual(reg.vowIds.length, 24);
  const candle = require('../data/schemas/fixtures.json');
  assert.ok(candle);
  // 2026-10-18 T5.1: the content layer grew the doctrines table (§12.2) —
  // CONTENT_VERSION bumps 4.0.0 → 5.0.0 (the T9.1 stamp contract: bump on
  // any content change).
  assert.match(CONTENT_VERSION.stamp, /^phase-5/);
  const echo = { v: 1, name: 'X', cls: 'ashblade', level: 1, alloc: { vig: 4, mig: 0, wit: 0, grd: 0, hst: 0 }, vow: 'red_tide',
    verses: ['rend', 'opening_cut', 'flay', 'drink_deep'], gear: { weapon: 'wick_cutter' }, doctrine: 'standard' };
  const r = validate('echoCode', echo, reg);
  assert.strictEqual(r.ok, true, r.errors.join('; '));
  const r2 = validate('echoCode', { ...echo, gear: { weapon: 'nope' } }, reg);
  assert.strictEqual(r2.ok, false);
});

test('T4.1: deepFreeze is idempotent and handles nesting', () => {
  const o = deepFreeze({ a: { b: { c: 1 } }, arr: [{ d: 2 }] });
  assert.ok(Object.isFrozen(o) && Object.isFrozen(o.a) && Object.isFrozen(o.a.b));
  assert.ok(Object.isFrozen(o.arr) && Object.isFrozen(o.arr[0]));
});

// ---------------------------------------------------------------------------
// T4.2 — classes: §5.2 verbatim, kit matrix, creation constraints
// ---------------------------------------------------------------------------
test('T4.2: base stat rows match §5.2 exactly and total 27', () => {
  const canon = {
    ashblade: [6, 8, 2, 4, 7],
    cinder_witch: [5, 2, 9, 3, 8],
    gravewarden: [9, 5, 2, 8, 3],
    hollow_cantor: [7, 2, 8, 4, 6],
  };
  for (const [id, [vig, mig, wit, grd, hst]] of Object.entries(canon)) {
    const s = CLASSES_MOD.CLASSES[id].stats;
    assert.deepStrictEqual([s.vig, s.mig, s.wit, s.grd, s.hst], [vig, mig, wit, grd, hst], id);
    assert.strictEqual(vig + mig + wit + grd + hst, 27); // canon rows themselves
    assert.strictEqual(Object.values(s).reduce((a, b) => a + b, 0), 27, `${id} total`);
  }
  // creation constraints: 4 free + 2/level + cap 10 — single source in tuning
  assert.strictEqual(CANON.creationPoints, 4);
  assert.strictEqual(CANON.pointsPerLevel, 2);
  assert.strictEqual(CANON.statCap, 10);
});

test('T4.2: damage-type mapping (§5.1/§5.2) + identity strings verbatim', () => {
  assert.strictEqual(CLASSES_MOD.CLASSES.ashblade.damageType, 'steel');
  assert.strictEqual(CLASSES_MOD.CLASSES.cinder_witch.damageType, 'ember');
  assert.strictEqual(CLASSES_MOD.CLASSES.gravewarden.damageType, 'steel');
  assert.strictEqual(CLASSES_MOD.CLASSES.hollow_cantor.damageType, 'shade');
  assert.strictEqual(CLASSES_MOD.CLASSES.ashblade.identity, 'Steel, Bleed stacks, crits, lifesteal');
  assert.strictEqual(CLASSES_MOD.CLASSES.cinder_witch.identity, 'Ember, Burn, burst, resource tricks');
  assert.strictEqual(CLASSES_MOD.CLASSES.gravewarden.identity, 'Armor, Wards, Thorns, Stun');
  assert.strictEqual(CLASSES_MOD.CLASSES.hollow_cantor.identity, 'Shade, Curse, Hush, drain');
  // stat roles data covers all five stats (Reading/creation UI)
  for (const k of ['vig', 'mig', 'wit', 'grd', 'hst']) assert.ok(CLASSES_MOD.STAT_ROLES[k].length >= 1);
});

test('T4.2: kit-vs-kit matrix matches §5.2 NEW table cell for cell', () => {
  const canon = {
    ashblade: { cinder_witch: 'Burn outpaces you.', gravewarden: 'Bleed ignores armor.', hollow_cantor: 'They cleanse your Bleed.' },
    cinder_witch: { ashblade: 'You burn faster than they bleed.', gravewarden: 'Conflagration cracks armor.', hollow_cantor: 'Hush starves your engine.' },
    gravewarden: { ashblade: 'You outlast the burst.', cinder_witch: 'Ward blunts burn.', hollow_cantor: 'Stun locks their lock.' },
    hollow_cantor: { ashblade: 'Curse slows their crits.', cinder_witch: 'Shade outpaces burn.', gravewarden: 'Fray breaks their armor.' },
  };
  assert.deepStrictEqual(CLASSES_MOD.COUNTER_TABLE, canon);
  for (const a of CLASSES_MOD.CLASS_IDS) {
    for (const b of CLASSES_MOD.CLASS_IDS) {
      if (a === b) continue;
      assert.ok(typeof CLASSES_MOD.COUNTER_TABLE[a][b] === 'string', `${a}→${b}`);
    }
  }
});

test('T4.2: every class row validates against the frozen class schema + verse refs resolve', () => {
  const c = loadReal();
  const reg = makeRegistry(c);
  for (const row of c.classes) {
    const r = validate('class', row, reg);
    assert.strictEqual(r.ok, true, `${row.id}: ${r.errors.join('; ')}`);
    assert.strictEqual(row.verses.length, 9);
    for (const vid of row.verses) assert.ok(reg.verseIds.includes(vid));
  }
});

// ---------------------------------------------------------------------------
// T4.3 — verses: 42 rows, counts, unlock calendar, canon table-diff
// ---------------------------------------------------------------------------
test('T4.3: counts per §6 table — 6 common / 9 per class (Strike included in common)', () => {
  const all = [STRIKE, ...VERSES];
  const count = (cls) => all.filter((v) => v.cls === cls).length;
  assert.strictEqual(all.length, 42);
  assert.strictEqual(count('common'), 6);
  assert.strictEqual(count('ashblade'), 9);
  assert.strictEqual(count('cinder_witch'), 9);
  assert.strictEqual(count('gravewarden'), 9);
  assert.strictEqual(count('hollow_cantor'), 9);
  assert.strictEqual(STRIKE.isStrike, true, 'Strike is always available, not a slot');
  assert.strictEqual(STRIKE.cost, 0);
});

test('T4.3: unlock calendar — 3 class verses at L1, then one per level L2–L7', () => {
  for (const cls of ['ashblade', 'cinder_witch', 'gravewarden', 'hollow_cantor']) {
    const rows = VERSES.filter((v) => v.cls === cls);
    assert.strictEqual(rows.filter((v) => v.unlockLevel === 1).length, 3, cls);
    for (let L = 2; L <= 7; L++) {
      assert.strictEqual(rows.filter((v) => v.unlockLevel === L).length, 1, `${cls} L${L}`);
    }
    assert.strictEqual(rows.length, 9);
    // unlock levels monotone 1..7
    const levels = rows.map((v) => v.unlockLevel).sort((a, b) => a - b);
    assert.deepStrictEqual(levels, [1, 1, 1, 2, 3, 4, 5, 6, 7]);
  }
});

// The §6 table, verbatim (verse → [unlock, cost, cd]). D17: Vigil's Rest cost 2.
const CANON_VERSES = {
  strike: [1, 0, 0],
  steady_breath: [1, 1, 2], purify: [1, 2, 4], second_wind: [1, 3, 5],
  vigils_rest: [1, 2, 3], stand_fast: [1, 2, 4],
  rend: [1, 2, 0], opening_cut: [1, 3, 0], flay: [1, 4, 0], drink_deep: [2, 3, 3],
  reap_the_red: [3, 3, 2], slip_the_hymn: [4, 2, 3], red_flurry: [5, 5, 0],
  crimson_waltz: [6, 4, 3], blood_ledger: [7, 5, 4],
  spark: [1, 2, 0], cinderfall: [1, 4, 0], stoke: [1, 3, 2], ashen_veil: [2, 3, 3],
  choking_smoke: [3, 3, 3], fan_the_flames: [4, 0, 3], conflagration: [5, 6, 3],
  cinder_shroud: [6, 3, 4], sear_the_note: [7, 4, 3],
  bulwark_strike: [1, 2, 0], hold_the_line: [1, 2, 2], sepulchral_spikes: [1, 3, 0],
  gravebind: [2, 4, 4], mend_the_mortar: [3, 3, 3], earthen_toll: [4, 5, 0],
  crypt_door: [5, 4, 4], stone_vigil: [6, 3, 4], last_rites: [7, 4, 4],
  dirge: [1, 2, 0], wither_note: [1, 3, 0], soul_siphon: [1, 3, 2], tolling_bell: [2, 4, 3],
  dissonance: [3, 3, 3], lullaby: [4, 4, 4], requiem: [5, 6, 3], grave_cadence: [6, 4, 3],
  seventh_verse: [7, 6, 4],
};
test('T4.3: table-diff — every verse matches §6.1–§6.5 (unlock/cost/CD)', () => {
  const all = [STRIKE, ...VERSES];
  assert.strictEqual(all.length, Object.keys(CANON_VERSES).length);
  for (const v of all) {
    const row = CANON_VERSES[v.id];
    assert.ok(row, `unknown verse id ${v.id}`);
    assert.strictEqual([v.unlockLevel, v.cost, v.cd].join(','), row.join(','), v.id);
  }
  assert.strictEqual(CANON_VERSES.vigils_rest[1], 2, 'D17: Vigil\'s Rest cost 2 (PROVISIONAL:D17)');
  // class pools stay in §6.2–6.5 priority order
  for (const cls of ['ashblade', 'cinder_witch', 'gravewarden', 'hollow_cantor']) {
    const ids = CLASSES_MOD.CLASSES[cls].verses;
    const sorted = [...ids].sort((a, b) => getVerse(a).unlockLevel - getVerse(b).unlockLevel
      || ids.indexOf(a) - ids.indexOf(b));
    assert.deepStrictEqual(ids, sorted, `${cls} priority order must be unlock-ascending`);
  }
});

test('T4.3: every verse schema-validates against the frozen verse schema', () => {
  const reg = makeRegistry(loadReal());
  for (const v of [STRIKE, ...VERSES]) {
    const r = validate('verse', v, reg);
    assert.strictEqual(r.ok, true, `${v.id}: ${r.errors.join('; ')}`);
  }
});

test('T4.3: every effect op-code path is exercised by content (no dead vocabulary)', () => {
  const used = new Set();
  for (const v of [STRIKE, ...VERSES]) for (const e of v.effects) used.add(e.op);
  for (const v of VOWS) for (const e of v.effects) used.add(e.op);
  for (const it of ITEMS) for (const e of it.mark) used.add(e.op);
  for (const op of OPCODES) {
    assert.ok(used.has(op), `op-code "${op}" is not exercised by any verse/vow/mark row`);
  }
  // verse-expressible ops are exercised by verses specifically
  const verseOps = new Set([STRIKE, ...VERSES].flatMap((v) => v.effects.map((e) => e.op)));
  for (const op of ['damage', 'bleed+', 'burn', 'curse', 'fray', 'hush', 'brace', 'ward',
    'thorns', 'stun', 'heal', 'resolve', 'cleanse', 'selfTrue']) {
    assert.ok(verseOps.has(op), `"${op}" should appear in at least one verse`);
  }
});

// ---------------------------------------------------------------------------
// T4.4 — vows: 24 rows, D4 de-dup, reward integrity
// ---------------------------------------------------------------------------
test('T4.4: exactly 24 vows — 12 class + 12 story (D4/D30 reconciliation)', () => {
  assert.strictEqual(VOWS.length, 24);
  assert.strictEqual(CLASS_VOWS.length, 12);
  assert.strictEqual(STORY_VOWS.length, 12);
  const ids = VOWS.map((v) => v.id);
  assert.strictEqual(new Set(ids).size, 24, 'vow ids unique');
  // D4 cuts hold: no Keeper's Ring vow row; the relic-side cut lives in T4.5 tests
  assert.ok(!ids.includes('keepers_ring'));
  // D4 grants Oren's Post; D30 grants The Kept Name
  assert.ok(ids.includes('oren_s_post') && ids.includes('kept_name'));
  // unified naming: the Ysolde row is the story vow, named "Ysolde's Vow"
  const y = VOWS.find((v) => v.id === 'ysoldes_vow');
  assert.strictEqual(y.name, "Ysolde's Vow");
  assert.strictEqual(y.kind, 'story');
});

test('T4.4: every vow schema-validates; story vows carry resolving sources', () => {
  const reg = makeRegistry(loadReal());
  for (const v of VOWS) {
    const r = validate('vow', v, reg);
    assert.strictEqual(r.ok, true, `${v.id}: ${r.errors.join('; ')}`);
  }
  for (const v of STORY_VOWS) {
    assert.ok(reg.sourceIds.includes(v.source), `${v.id} source ${v.source}`);
  }
});

test('T4.4: story gating — class-bound vows only fit their class; Counter-Voice hidden', () => {
  // Ninth Sister's Vow (unified: Ysolde's Vow) = Cantor; Warden's Oath = Gravewarden
  const y = STORY_VOWS.find((v) => v.id === 'ysoldes_vow');
  assert.strictEqual(y.cls, 'hollow_cantor');
  const w = STORY_VOWS.find((v) => v.id === 'wardens_oath');
  assert.strictEqual(w.cls, 'gravewarden');
  // class-gated story vows are NOT offered to other classes
  const ashEarned = vowsFor('ashblade', ['ysoldes_vow', 'wardens_oath', 'ledgers_price']);
  assert.ok(!ashEarned.some((v) => v.id === 'ysoldes_vow'));
  assert.ok(!ashEarned.some((v) => v.id === 'wardens_oath'));
  assert.ok(ashEarned.some((v) => v.id === 'ledgers_price')); // cls 'any'
  // Counter-Voice never appears in pickers even when earned
  const cantor = vowsFor('hollow_cantor', ['counter_voice']);
  assert.ok(!cantor.some((v) => v.id === 'counter_voice'));
  assert.strictEqual(STORY_VOWS.find((v) => v.id === 'counter_voice').hidden, true);
  // creation pool = class vows only
  assert.deepStrictEqual(vowsFor('ashblade', []).map((v) => v.id),
    ['red_tide', 'duelist', 'hunger']);
});

test('T4.4: reward integrity (a) — no effect shared by two rewards of one source', () => {
  const bySource = new Map();
  for (const it of ITEMS) {
    if (!bySource.has(it.source)) bySource.set(it.source, []);
    bySource.get(it.source).push({ kind: 'item', id: it.id, sig: JSON.stringify(it.mark) });
  }
  for (const v of VOWS) {
    if (v.kind !== 'story') continue;
    if (!bySource.has(v.source)) bySource.set(v.source, []);
    bySource.get(v.source).push({ kind: 'vow', id: v.id, sig: JSON.stringify(v.effects) });
  }
  for (const [src, rewards] of bySource) {
    const sigs = rewards.map((r) => r.sig);
    assert.strictEqual(new Set(sigs).size, sigs.length, `${src}: duplicate reward effect`);
  }
});

test('T4.4: reward integrity (b/c) — sources resolve; pinned tallies cover the campaign', () => {
  const srcIds = new Set(SOURCES.map((s) => s.id));
  for (const it of ITEMS) assert.ok(srcIds.has(it.source), `item ${it.id} source ${it.source}`);
  for (const v of STORY_VOWS) assert.ok(srcIds.has(v.source), `vow ${v.id} source ${v.source}`);
  // every choice-granting source's grants exist in the item catalogue
  const itemIds = new Set(ITEMS.map((i) => i.id));
  for (const s of SOURCES) for (const g of s.grants) assert.ok(itemIds.has(g), `${s.id} grants ${g}`);
  // the A2/F26 pins: Ch1 Ruthless→Mace, Mercy→Shroud, Devotion→Shovel
  const ch1 = (t) => SOURCES.find((s) => s.id === `ch1_choice_${t}`).grants;
  assert.deepStrictEqual(ch1('ruthless'), ['pallbearers_mace']);
  assert.deepStrictEqual(ch1('mercy'), ['sextons_shroud']);
  assert.deepStrictEqual(ch1('devotion'), ['grave_shovel_of_bram']);
  // Ch3 pins from §3: Ruthless → Tuning Fork; Mercy/Devotion → non-item rewards
  assert.deepStrictEqual(SOURCES.find((s) => s.id === 'ch3_ruthless').grants, ['cantors_tuning_fork']);
});

// ---------------------------------------------------------------------------
// T4.5 — items: 40 rows, marks compile, affinity, sources
// ---------------------------------------------------------------------------
test('T4.5: 40 items = 13 weapons + 13 vestments + 14 relics (D4 reconciliation)', () => {
  assert.strictEqual(ITEMS.length, 40);
  assert.strictEqual(WEAPONS.length, 13);
  assert.strictEqual(VESTMENTS.length, 13);
  assert.strictEqual(RELICS.length, 14, '15 minus the cut Ysolde\'s Vow relic row (D4)');
  const ids = ITEMS.map((i) => i.id);
  assert.strictEqual(new Set(ids).size, 40, 'item ids unique');
  assert.ok(!ids.includes('ysoldes_vow_relic') && !ids.includes('ysoldes_vow'),
    'the duplicate Ysolde relic row stays cut');
});

test('T4.5: every item schema-validates; exactly one mark; stats ≤3; sources resolve', () => {
  const reg = makeRegistry(loadReal());
  for (const it of ITEMS) {
    const r = validate('item', it, reg);
    assert.strictEqual(r.ok, true, `${it.id}: ${r.errors.join('; ')}`);
    assert.strictEqual(it.mark.length, 1, `${it.id}: exactly one mark`);
    for (const [k, v] of Object.entries(it.stats)) {
      assert.ok(v >= 0 && v <= 3, `${it.id} stat ${k}=${v}`);
      assert.ok(Object.prototype.hasOwnProperty.call(it.stats, k));
    }
    assert.ok(Object.values(it.stats).reduce((a, b) => a + b, 0) >= 1, `${it.id} gives something`);
  }
});

test('T4.5: mark op-codes all compile to the T0.3 vocabulary; F28/D31 Blade tiers exact', () => {
  for (const it of ITEMS) {
    for (const mk of it.mark) {
      assert.ok(OPCODES.includes(mk.op), `${it.id}: ${mk.op}`);
      assert.ok(mk.note && mk.note.length > 4, `${it.id}: mark carries its canon line`);
    }
  }
  const blade = ITEMS.find((i) => i.id === 'corvanes_blade');
  assert.deepStrictEqual(blade.mark[0].tiers,
    [{ hpAbove: 0.5, mult: 1.6 }, { hpAbove: 0.25, mult: 1.8 }, { hpAbove: 0, mult: 2.0 }]);
  const mantle = ITEMS.find((i) => i.id === 'drowned_mantle');
  assert.strictEqual(mantle.source, 'floor_first_win', 'D15/F14: guaranteed first Floor win');
  const mace = ITEMS.find((i) => i.id === 'pallbearers_mace');
  assert.strictEqual(mace.mark[0].vsHpBelow, 0.35);
});

test('T4.5: affinity — ≥5 per class where canon holds; the Cinder Witch shortfall is N10', () => {
  // Canon v1.0.1 §8 note claims "at least 5 per class" — the §8 tables
  // actually carry 6 Ashblade / 3 Witch / 10 Warden / 6 Cantor. NEW FINDING
  // N10 (DECISIONS.md): the Witch row runs advisory until the owner adds
  // Witch-affinity items (owner's call; nothing invented in Phase 4).
  assert.strictEqual(affinityCount('ashblade'), 6);
  assert.strictEqual(affinityCount('cinder_witch'), 3); // N10 advisory
  assert.strictEqual(affinityCount('gravewarden'), 10);
  assert.strictEqual(affinityCount('hollow_cantor'), 6);
  assert.ok(ITEMS.filter((i) => i.affinity === 'any').length >= 9);
});

test('T4.5: markMods compiles every item bundle; gear-free sheets get inert zeros', () => {
  const empty = markMods({ items: [] }, CANON);
  assert.strictEqual(empty.markDamagePct, 0);
  assert.strictEqual(empty.vsHpBelow, null);
  assert.strictEqual(empty.critTiers, null);
  assert.deepStrictEqual(empty.immune, []);
  assert.strictEqual(empty.braceCostsZero, false);
  const geared = markMods({ items: ['tithe_collectors_ledger', 'pallbearers_mace'] }, CANON);
  assert.strictEqual(geared.markDamagePct, 0.1);
  assert.deepStrictEqual(geared.vsHpBelow, { pct: 0.3, hp: 0.35 });
  assert.throws(() => markMods({ items: ['not_an_item'] }, CANON), /Unknown item/);
});

test('T4.5: merge rules — bleed cap max, burn sums, hush max, resolve sums, curse min', () => {
  const T = CANON;
  // red_tide 8 vs marrow 7 → 8
  const m1 = mergeMods(
    { bleedCap: T.bleedCapRedTide, burnPotency: 0, burnTurns: 0, hushMod: T.hushMod, hushApplyResolve: 0, curseMult: T.curseMult },
    markMods({ items: ['marrow_furnace'] }, T), T);
  assert.strictEqual(m1.bleedCap, 8);
  // marrow alone → 7
  const m2 = mergeMods(
    { bleedCap: T.bleedCap, burnPotency: 0, burnTurns: 0, hushMod: T.hushMod, hushApplyResolve: 0, curseMult: T.curseMult },
    markMods({ items: ['marrow_furnace'] }, T), T);
  assert.strictEqual(m2.bleedCap, 7);
  // slow_ash + censer + lantern → potency +4, turns +2
  const m3 = mergeMods(
    { bleedCap: 5, burnPotency: T.vows.slowAshPotency, burnTurns: T.vows.slowAshTurns, hushMod: 2, hushApplyResolve: 0, curseMult: 0.75 },
    markMods({ items: ['ysoldes_censer', 'reliquary_lantern'] }, T), T);
  assert.strictEqual(m3.burnPotency, 1 + 2 + 1);
  assert.strictEqual(m3.burnTurns, 2);
  assert.strictEqual(m3.burnSelfTick, 1);
  // silence + tollwards rod → hushMod 3; silence + chorister robe → +3 apply
  const m4 = mergeMods(
    { bleedCap: 5, burnPotency: 0, burnTurns: 0, hushMod: T.hushModSilence, hushApplyResolve: T.vows.silenceApplyResolve, curseMult: 0.75 },
    markMods({ items: ['tollwards_rod', 'drowned_choristers_robe'] }, T), T);
  assert.strictEqual(m4.hushMod, 3);
  assert.strictEqual(m4.hushApplyResolve, 3);
  // last hymn + gravedust → curse depth min(0.6, 0.65) = 0.6; gravedust alone 0.65
  const m5 = mergeMods(
    { bleedCap: 5, burnPotency: 0, burnTurns: 0, hushMod: 2, hushApplyResolve: 0, curseMult: T.curseMultLastHymn },
    markMods({ items: ['gravedust_censer'] }, T), T);
  assert.strictEqual(m5.curseMult, 0.6);
  const m6 = mergeMods(
    { bleedCap: 5, burnPotency: 0, burnTurns: 0, hushMod: 2, hushApplyResolve: 0, curseMult: T.curseMult },
    markMods({ items: ['gravedust_censer'] }, T), T);
  assert.strictEqual(m6.curseMult, 0.65);
  // gear-free merge is byte-identical to the raw vow bundle on shared fields
  const vm = { bleedCap: 5, burnPotency: 0, burnTurns: 0, hushMod: 2, hushApplyResolve: 0, curseMult: 0.75 };
  const m7 = mergeMods(vm, markMods({ items: [] }, T), T);
  assert.strictEqual(m7.bleedCap, 5);
  assert.strictEqual(m7.hushMod, 2);
  assert.strictEqual(m7.curseMult, 0.75);
});
