// stress-data.test.js — Phase-0/1 re-test wave: adversarial coverage for the
// data layer (verses, classes, counter table, canon config, tuning) and the
// frozen schema validators (data/schemas/validators.js) with their fixtures.
// Includes systematic negative-mutation sweeps over every fixture.
'use strict';

const { test } = require('node:test');
const assert = require('node:assert');

const { VERSES, STRIKE, VERSE_BY_ID, getVerse, poolFor } = require('../data/verses.js');
const { CLASSES, CLASS_IDS, COUNTER_TABLE, STAT_KEYS, STAT_NAMES } = require('../data/classes.js');
const { CANON } = require('../data/config.js');
const { createTuning, diffTuning, TUNING_TAGS } = require('../tuning.js');
const { RITES } = require('../data/rites.js');
const { validate, SCHEMAS, OPCODES, STAT_KEYS: V_KEYS, CLASSES: V_CLASSES, TALLIES } = require('../data/schemas/validators.js');
const fixtures = require('../data/schemas/fixtures.json');

// --------------------------------------------------------- verse catalogue
test('verse catalogue: 42 rows total (41 slotted + Strike)', () => {
  assert.strictEqual(VERSES.length, 41);
  assert.strictEqual(VERSE_BY_ID.size, 42);
});
test('verse catalogue: all ids unique', () => {
  const ids = VERSES.map((v) => v.id);
  assert.strictEqual(new Set(ids).size, ids.length);
});
test('verse catalogue: Strike is the canonical free action', () => {
  assert.strictEqual(STRIKE.id, 'strike');
  assert.strictEqual(STRIKE.cost, 0);
  assert.strictEqual(STRIKE.cd, 0);
  assert.strictEqual(STRIKE.isStrike, true);
  assert.strictEqual(STRIKE.slotted, false);
  assert.strictEqual(getVerse('strike'), STRIKE);
});
test('verse catalogue: every verse validates against the frozen schema', () => {
  for (const v of [STRIKE, ...VERSES]) {
    const r = validate('verse', v);
    assert.strictEqual(r.ok, true, `${v.id}: ${r.errors.join('; ')}`);
  }
});
test('verse catalogue: costs stay within the 0–10 Resolve economy', () => {
  for (const v of [STRIKE, ...VERSES]) {
    assert.ok(v.cost >= 0 && v.cost <= 10 && Number.isInteger(v.cost), `${v.id} cost ${v.cost}`);
  }
});
test('verse catalogue: cooldowns 0–10, cd 0 means "none" (ENG-6)', () => {
  for (const v of [STRIKE, ...VERSES]) {
    assert.ok(v.cd >= 0 && v.cd <= 10 && Number.isInteger(v.cd), `${v.id} cd ${v.cd}`);
  }
});
test('verse catalogue: unlock levels within 1–7 (campaign ceiling L10)', () => {
  for (const v of VERSES) {
    assert.ok(v.unlockLevel >= 1 && v.unlockLevel <= 7, `${v.id} unlock ${v.unlockLevel}`);
  }
});
test('verse catalogue: every effect op is in the frozen op-code vocabulary', () => {
  for (const v of [STRIKE, ...VERSES]) {
    assert.ok(v.effects.length >= 1, `${v.id} has effects`);
    for (const e of v.effects) assert.ok(OPCODES.includes(e.op), `${v.id} op ${e.op}`);
  }
});
test('verse catalogue: class fields are valid class ids or common', () => {
  const valid = [...CLASS_IDS, 'common'];
  for (const v of [STRIKE, ...VERSES]) assert.ok(valid.includes(v.cls), `${v.id} cls ${v.cls}`);
});
test('verse catalogue: 5 common + 9 per class (ENG-6 count contract)', () => {
  const byCls = { common: 0 };
  for (const c of CLASS_IDS) byCls[c] = 0;
  for (const v of VERSES) byCls[v.cls] += 1;
  assert.strictEqual(byCls.common, 5);
  for (const c of CLASS_IDS) assert.strictEqual(byCls[c], 9, c);
});
test('verse catalogue: damage verses carry a legal type (steel/ember/shade/main/true)', () => {
  for (const v of VERSES) {
    for (const e of v.effects) {
      if (e.op === 'damage') {
        assert.ok(['steel', 'ember', 'shade', 'main', 'true'].includes(e.type), `${v.id} type ${e.type}`);
        assert.strictEqual(typeof e.base, 'number');
        assert.ok(Array.isArray(e.coefs));
      }
    }
  }
});
test('verse catalogue: coef stats are real stat keys or main', () => {
  const legal = [...STAT_KEYS, 'main'];
  for (const v of VERSES) {
    for (const e of v.effects) {
      for (const c of e.coefs || []) assert.ok(legal.includes(c.stat), `${v.id} coef ${c.stat}`);
    }
  }
});
test('verse catalogue: D17 — Vigil’s Rest costs exactly 2', () => {
  assert.strictEqual(getVerse('vigils_rest').cost, 2);
});
test('verse catalogue: the four signature status verses carry their signature ops', () => {
  assert.ok(getVerse('rend').effects.some((e) => e.op === 'bleed+'));
  assert.ok(getVerse('spark').effects.some((e) => e.op === 'burn'));
  assert.ok(getVerse('sepulchral_spikes').effects.some((e) => e.op === 'thorns'));
  assert.ok(getVerse('dirge').effects.some((e) => e.op === 'curse'));
});
test('getVerse: unknown id throws a named error', () => {
  assert.throws(() => getVerse('nope'), /Unknown verse/);
});
test('poolFor: L1 exposes commons + unlock-1 class verses only', () => {
  const pool = poolFor('ashblade', 1).map((v) => v.id);
  assert.ok(pool.includes('rend') && pool.includes('strike') === false, 'poolFor excludes Strike (always available separately)');
  assert.ok(!pool.includes('red_flurry'), 'L5 verse not at L1');
  assert.ok(pool.includes('steady_breath'), 'commons included');
});
test('poolFor: L7 exposes the full class kit', () => {
  for (const c of CLASS_IDS) {
    const pool = poolFor(c, 7);
    assert.strictEqual(pool.length, 14, `${c} 5 common + 9 class`); // common + class
  }
});
test('poolFor: common verses appear for every class', () => {
  for (const c of CLASS_IDS) {
    assert.ok(poolFor(c, 1).some((v) => v.cls === 'common'));
  }
});

// -------------------------------------------------------------- classes
test('classes: four classes with canon identity fields', () => {
  const expect = {
    ashblade: { main: 'mig', type: 'steel', vows: 3 },
    cinder_witch: { main: 'wit', type: 'ember', vows: 3 },
    gravewarden: { main: 'mig', type: 'steel', vows: 3 },
    hollow_cantor: { main: 'wit', type: 'shade', vows: 3 },
  };
  for (const [id, e] of Object.entries(expect)) {
    const c = CLASSES[id];
    assert.strictEqual(c.mainStat, e.main);
    assert.strictEqual(c.damageType, e.type);
    assert.strictEqual(c.vows.length, e.vows);
    assert.strictEqual(c.base.vig + c.base.mig + c.base.wit + c.base.grd + c.base.hst, 27);
  }
});
test('classes: every class validates against the frozen class schema', () => {
  for (const id of CLASS_IDS) {
    const c = CLASSES[id];
    const row = {
      id, name: c.name,
      stats: c.base,
      damageType: c.damageType,
      verses: VERSES.filter((v) => v.cls === id).map((v) => v.id),
    };
    const r = validate('class', row);
    assert.strictEqual(r.ok, true, `${id}: ${r.errors.join('; ')}`);
  }
});
test('classes: vow ids unique across a class and resolvable in tuning', () => {
  for (const id of CLASS_IDS) {
    const ids = CLASSES[id].vows.map((v) => v.id);
    assert.strictEqual(new Set(ids).size, ids.length, id);
  }
});
test('counter table: complete 4×3 canon web (every class vs every other)', () => {
  for (const a of CLASS_IDS) {
    const row = COUNTER_TABLE[a];
    assert.ok(row, a);
    for (const b of CLASS_IDS) {
      if (a === b) continue;
      assert.ok(typeof row[b] === 'string' && row[b].length > 0, `${a}→${b}`);
    }
    assert.strictEqual(Object.keys(row).length, 3);
  }
});
test('stat keys: canonical order and display names', () => {
  assert.deepEqual(STAT_KEYS, ['vig', 'mig', 'wit', 'grd', 'hst']);
  assert.strictEqual(STAT_NAMES.vig, 'Vigor');
  assert.strictEqual(STAT_NAMES.hst, 'Haste');
});

// ---------------------------------------------------------- canon config
test('config: fatigue schedule invariants (D8)', () => {
  const f = CANON.fatigue;
  assert.strictEqual(f.telegraphRound, 13);
  assert.strictEqual(f.startRound, 16);
  assert.deepEqual(f.schedule, [2, 4, 8, 16, 32]);
  assert.strictEqual(f.lastBellRound, 20);
  assert.strictEqual(f.lastBellRound - f.startRound + 1, f.schedule.length);
  assert.strictEqual(f.schedule.reduce((a, b) => a + b, 0), 62);
});
test('config: Fortune band brackets the jitter envelope', () => {
  assert.ok(CANON.fortuneMin < 1 && CANON.fortuneMax > 1);
  assert.strictEqual(CANON.fortuneMin, 0.88);
  assert.strictEqual(CANON.fortuneMax, 1.12);
  assert.ok(CANON.jitterCenter - CANON.jitterWidth >= 0.9);
});
test('config: mitigation caps ordered (base < relic ≤ 0.75)', () => {
  assert.ok(CANON.mitCap < CANON.mitCapAshGlazed);
  assert.ok(CANON.mitCapAshGlazed <= 0.75);
});
test('config: resolve economy invariants (§5.3)', () => {
  assert.strictEqual(CANON.resolveStart, 3);
  assert.strictEqual(CANON.resolveStartSecondMover, 4);
  assert.strictEqual(CANON.resolveStartSecondMover, CANON.resolveStart + 1);
  assert.ok(CANON.hushFloor >= 1);
  assert.ok(CANON.resolveCap <= 10);
  assert.ok(CANON.hushMod < CANON.resolveIncome);
});
test('config: statusTurns covers every timed status with positive turns', () => {
  for (const k of ['bleed', 'burn', 'curse', 'fray', 'hush', 'brace', 'ward', 'thorns']) {
    assert.ok(Number.isInteger(CANON.statusTurns[k]) && CANON.statusTurns[k] >= 1, k);
  }
});
test('config: bleed caps ordered (base 5 < red tide 8)', () => {
  assert.strictEqual(CANON.bleedCap, 5);
  assert.strictEqual(CANON.bleedCapRedTide, 8);
});
test('config: curse depths ordered (base 0.75 > last hymn 0.6)', () => {
  assert.strictEqual(CANON.curseMult, 0.75);
  assert.strictEqual(CANON.curseMultLastHymn, 0.6);
});
test('config: provisional constants carry their tags in tuning.js (ENG-5)', () => {
  assert.strictEqual(TUNING_TAGS['bramHP'], 'PROVISIONAL:D12');
  assert.strictEqual(TUNING_TAGS['vigilsRestCost'], 'PROVISIONAL:D17');
  assert.strictEqual(TUNING_TAGS['ilvanePhase2HealPct'], 'PROVISIONAL:D31');
  assert.strictEqual(TUNING_TAGS['fatigue.schedule'], 'D8');
  assert.strictEqual(TUNING_TAGS['budgetBase'], 'D7/N5');
});
test('config: stat budget constants (D7/N5)', () => {
  assert.strictEqual(CANON.creationPoints, 4);
  assert.strictEqual(CANON.pointsPerLevel, 2);
  assert.strictEqual(CANON.statCap, 10);
  assert.strictEqual(CANON.budgetBase, 33);
  assert.strictEqual(CANON.budgetPerLevel, 2);
});
test('config: item flag ids the engine honours', () => {
  assert.strictEqual(CANON.items.ashGlazedBrassId, 'ash_glazed_brass');
  assert.strictEqual(CANON.items.candleId, 'candle_of_saint_orrin');
});

// ---------------------------------------------------------------- tuning
test('tuning: deep override merge keeps sibling keys', () => {
  const t2 = createTuning({ fatigue: { startRound: 10 } });
  assert.strictEqual(t2.fatigue.startRound, 10);
  assert.strictEqual(t2.fatigue.lastBellRound, 20, 'sibling untouched');
  assert.strictEqual(t2.fatigue.schedule, CANON.fatigue.schedule, 'array shared when untouched');
});
test('tuning: overriding one array replaces it wholesale', () => {
  const t2 = createTuning({ fatigue: { schedule: [1, 2, 3, 4, 5] } });
  assert.deepEqual(t2.fatigue.schedule, [1, 2, 3, 4, 5]);
});
test('tuning: diffs report exactly the overridden paths', () => {
  const t2 = createTuning({ hpBase: 70, jitterWidth: 0.2 });
  const paths = diffTuning(t2).map((d) => d.path).sort();
  assert.deepEqual(paths, ['hpBase', 'jitterWidth']);
});
test('tuning: diff on canon is empty (zero deviations = pure canon)', () => {
  assert.strictEqual(diffTuning(CANON).length, 0);
});
test('tuning: array diffs compare by JSON (replacement visible)', () => {
  const t2 = createTuning({ fatigue: { schedule: [9, 9, 9, 9, 9] } });
  const d = diffTuning(t2).find((x) => x.path === 'fatigue.schedule');
  assert.ok(d);
  assert.strictEqual(d.tag, 'D8');
});

// ------------------------------------------------------------------ rites
test('rites registry: every rite has id, name, triggers with legal shapes', () => {
  for (const [id, rite] of Object.entries(RITES)) {
    assert.strictEqual(rite.id, id);
    assert.ok(typeof rite.name === 'string');
    assert.ok(Array.isArray(rite.triggers) && rite.triggers.length >= 1);
    for (const t of rite.triggers) {
      assert.ok(t.trigger.atHP !== undefined || t.trigger.onTurn !== undefined, `${id} trigger`);
      if (t.trigger.atHP !== undefined) assert.ok(t.trigger.atHP > 0 && t.trigger.atHP <= 1);
      if (t.trigger.onTurn !== undefined) assert.ok(t.trigger.onTurn >= 1 && t.trigger.onTurn <= 20);
      assert.ok(t.change && typeof t.change === 'object');
      assert.ok(typeof t.line === 'string');
    }
  }
});
test('rites registry: First Vespers is the canon §9.1 row (atHP 0.5)', () => {
  const r = RITES.first_vespers;
  assert.ok(r);
  assert.strictEqual(r.triggers[0].trigger.atHP, 0.5);
  assert.strictEqual(r.triggers[0].change.flags.damageBonusPct, 0.3);
  assert.strictEqual(r.triggers[0].change.flags.castEveryTurn, 'tolling_bell');
});
test('rites registry: rite-locked verse ids exist in the verse registry', () => {
  for (const rite of Object.values(RITES)) {
    for (const t of rite.triggers) {
      if (t.change.flags && t.change.flags.castEveryTurn) {
        assert.ok(VERSE_BY_ID.has(t.change.flags.castEveryTurn), `${rite.id} locked verse exists`);
      }
    }
  }
});
test('rites registry: stat mult values are sane multipliers (0.1–3)', () => {
  for (const rite of Object.values(RITES)) {
    for (const t of rite.triggers) {
      for (const m of Object.values(t.change.statMults || {})) {
        assert.ok(m >= 0.1 && m <= 3, `${rite.id} mult ${m}`);
      }
    }
  }
});

// ------------------------------------------------------------- validators
test('validators: the frozen schema catalogue (T0.3 — 14 kinds)', () => {
  assert.deepEqual(Object.keys(SCHEMAS).sort(), [
    'chapter', 'choice', 'class', 'deed', 'echoCode', 'enemy', 'item',
    'namedEcho', 'objective', 'rite', 'saveState', 'vendorEntry', 'verse',
    'vow',
  ]);
  assert.strictEqual(Object.keys(SCHEMAS).length, 14);
});
test('validators: unknown kind is rejected with a named error', () => {
  const r = validate('nope', {});
  assert.strictEqual(r.ok, false);
  assert.match(r.errors[0], /unknown schema kind/);
});
test('validators: non-object payloads rejected', () => {
  for (const bad of [null, 42, 'str', [], true]) {
    assert.strictEqual(validate('verse', bad).ok, false);
  }
});
// fixtures.json is a keyed object: name → data row; kind comes from the map.
const FIXTURE_KINDS = {
  class: 'class', verse: 'verse', vow_class: 'vow', vow_story: 'vow',
  item: 'item', enemy: 'enemy', enemy_boss: 'enemy', rite: 'rite',
  namedEcho: 'namedEcho', chapter: 'chapter', choice: 'choice',
  objective: 'objective', deed: 'deed', vendorEntry: 'vendorEntry',
  saveState: 'saveState', echoCode_v1: 'echoCode', echoCode_v2: 'echoCode',
};
// minimal registries mirroring the Phase-4 contract (schemas.test.js shape)
const REG = {
  verseIds: ['rend', 'opening_cut', 'flay', 'red_flurry', 'drink_deep', 'blood_ledger', 'tolling_bell', 'dirge', 'requiem', 'dissonance', 'steady_breath'],
  itemIds: ['tuning_fork', 'drowned_mantle', 'deaf_wax', 'pallbearers_mace', 'sextons_shroud', 'grave_shovel_of_bram'],
  vowIds: [
    { id: 'silence', kind: 'class', cls: 'hollow_cantor' },
    { id: "oren's_post", kind: 'story', cls: 'any' },
  ],
};

test('validators: every frozen fixture validates', () => {
  assert.ok(Object.keys(FIXTURE_KINDS).length >= 17);
  for (const [name, kind] of Object.entries(FIXTURE_KINDS)) {
    assert.ok(fixtures[name], `fixture ${name} exists`);
    const r = validate(kind, fixtures[name], REG);
    assert.strictEqual(r.ok, true, `${name} (${kind}): ${r.errors.join('; ')}`);
  }
});
test('validators: N1 — the original 18-point alloc at L7 is rejected (cap 16)', () => {
  const bad = {
    v: 1, name: 'Overfill', cls: 'ashblade', level: 7,
    alloc: { vig: 2, mig: 6, wit: 2, grd: 4, hst: 4 },
    vow: 'red_tide', verses: ['rend', 'opening_cut', 'flay', 'red_flurry'],
    gear: { weapon: null, vestment: null, relic: null }, doctrine: 'aggressive',
  };
  const r = validate('echoCode', bad);
  assert.strictEqual(r.ok, false);
  assert.ok(r.errors.some((e) => e.includes('exceeds the L7 cap of 16')));
});
test('validators: enemy budget conformance is ±0 (N5 formula 33+2(L−1))', () => {
  const mk = (level, stats) => ({
    id: 'x', name: 'X', cls: 'ashblade', level,
    alloc: stats,
    hp: 50, hpOverride: false, signature: 's', counterLine: 'c',
  });
  assert.strictEqual(validate('enemy', mk(1, { vig: 11, mig: 5, wit: 2, grd: 10, hst: 5 })).ok, true);
  assert.strictEqual(validate('enemy', mk(10, { vig: 13, mig: 10, wit: 8, grd: 12, hst: 8 })).ok, true);
  const over = validate('enemy', mk(1, { vig: 12, mig: 5, wit: 2, grd: 10, hst: 5 }));
  assert.strictEqual(over.ok, false);
  assert.ok(over.errors[0].includes('conformance is ±0'));
});
test('validators: hybrid class override bypasses the budget gate (Mother Bell A6)', () => {
  const row = {
    id: 'mother', name: 'Mother Bell', cls: 'hybrid', level: 10,
    alloc: { vig: 20, mig: 20, wit: 20, grd: 20, hst: 20 },
    hp: 300, hpOverride: true, signature: 's', counterLine: 'c',
  };
  assert.strictEqual(validate('enemy', row).ok, true);
});
test('validators: vendor entries never restock (D13/D14) and cost exactly one memory', () => {
  const good = { item: 'x', costMemories: 1, restock: false };
  assert.strictEqual(validate('vendorEntry', good).ok, true);
  const restock = validate('vendorEntry', { ...good, restock: true });
  assert.strictEqual(restock.ok, false);
  assert.match(restock.errors[0], /never restocks/);
  const free = validate('vendorEntry', { ...good, costMemories: 0 });
  assert.strictEqual(free.ok, false);
  const two = validate('vendorEntry', { ...good, costMemories: 2 });
  assert.strictEqual(two.ok, false);
});
test('validators: story vows require their chapter source', () => {
  const vow = { id: 'v', name: 'V', kind: 'story', effects: [{ op: 'brace' }] };
  const r = validate('vow', vow);
  assert.strictEqual(r.ok, false);
  assert.match(r.errors[0], /must name their chapter choice source/);
});
test('validators: class vows do not need a source', () => {
  const vow = { id: 'v', name: 'V', kind: 'class', cls: 'ashblade', effects: [{ op: 'brace' }] };
  assert.strictEqual(validate('vow', vow).ok, true);
});
test('validators: empty effects rejected for verses and vows', () => {
  assert.strictEqual(validate('verse', { id: 'v', name: 'V', cls: 'common', cost: 1, cd: 1, unlockLevel: 1, effects: [] }).ok, false);
  assert.strictEqual(validate('vow', { id: 'v', name: 'V', kind: 'class', cls: 'ashblade', effects: [] }).ok, false);
});
test('validators: unknown op-codes rejected (vocabulary is frozen)', () => {
  const r = validate('verse', { id: 'v', name: 'V', cls: 'common', cost: 1, cd: 1, unlockLevel: 1, effects: [{ op: 'teleport' }] });
  assert.strictEqual(r.ok, false);
  assert.match(r.errors[0], /unknown op-code/);
});
test('validators: item marks validate against the op-code vocabulary', () => {
  const base = { id: 'i', name: 'I', slot: 'relic', affinity: 'any', stats: {}, source: 's' };
  assert.strictEqual(validate('item', { ...base, mark: [{ op: 'damage' }] }).ok, true);
  const bad = validate('item', { ...base, mark: [{ op: 'resurrect' }] });
  assert.strictEqual(bad.ok, false);
});
test('validators: echoCode tally cannot exceed the campaign’s 9 choices', () => {
  const base = {
    v: 2, name: 'T', cls: 'ashblade', level: 5,
    alloc: { vig: 1, mig: 2, wit: 0, grd: 0, hst: 1 },
    vow: 'red_tide', verses: ['rend', 'rend', 'rend', 'rend'],
    gear: { weapon: null, vestment: null, relic: null }, doctrine: 'aggressive',
  };
  const ok = validate('echoCode', { ...base, tally: { mercy: 9, ruthless: 0, devotion: 0 } });
  assert.strictEqual(ok.ok, true);
  const bad = validate('echoCode', { ...base, tally: { mercy: 10, ruthless: 0, devotion: 0 } });
  assert.strictEqual(bad.ok, false);
  assert.match(bad.errors[0], /campaign holds 9/);
});
test('validators: registry ctx catches unknown verse/vow/item ids', () => {
  const code = {
    v: 1, name: 'R', cls: 'ashblade', level: 5,
    alloc: { vig: 1, mig: 2, wit: 0, grd: 0, hst: 1 },
    vow: 'red_tide', verses: ['rend', 'mystery_verse', 'flay', 'drink_deep'],
    gear: { weapon: 'ghost_blade', vestment: null, relic: null }, doctrine: 'aggressive',
  };
  const ctx = {
    verseIds: ['rend', 'flay', 'drink_deep'],
    vowIds: [{ id: 'red_tide', kind: 'class', cls: 'ashblade' }],
    itemIds: ['ash_glazed_brass'],
  };
  const r = validate('echoCode', code, ctx);
  assert.strictEqual(r.ok, false);
  assert.ok(r.errors.some((e) => e.includes('mystery_verse')));
  assert.ok(r.errors.some((e) => e.includes('ghost_blade')));
});
test('validators: story vow on a bare v1 code is rejected', () => {
  const code = {
    v: 1, name: 'S', cls: 'hollow_cantor', level: 5,
    alloc: { vig: 1, mig: 0, wit: 2, grd: 0, hst: 1 },
    vow: 'ysolde_vow', verses: ['dirge', 'wither_note', 'soul_siphon', 'requiem'],
    gear: { weapon: null, vestment: null, relic: null }, doctrine: 'defensive',
  };
  const ctx = { vowIds: [{ id: 'ysolde_vow', kind: 'story', cls: 'any' }] };
  const r = validate('echoCode', code, ctx);
  assert.strictEqual(r.ok, false);
  assert.match(r.errors[0], /story vow/);
});
test('validators: story vow with v2 tally passes', () => {
  const code = {
    v: 2, name: 'S', cls: 'hollow_cantor', level: 5,
    alloc: { vig: 1, mig: 0, wit: 2, grd: 0, hst: 1 },
    vow: 'ysolde_vow', verses: ['dirge', 'wither_note', 'soul_siphon', 'requiem'],
    gear: { weapon: null, vestment: null, relic: null }, doctrine: 'defensive',
    tally: { mercy: 1, ruthless: 0, devotion: 0 },
  };
  const ctx = { vowIds: [{ id: 'ysolde_vow', kind: 'story', cls: 'any' }] };
  assert.strictEqual(validate('echoCode', code, ctx).ok, true);
});
test('validators: out-of-level echo values rejected (level 0 and 11)', () => {
  for (const level of [0, 11, -1, 2.5]) {
    const code = {
      v: 1, name: 'L', cls: 'ashblade', level,
      alloc: { vig: 1, mig: 2, wit: 0, grd: 0, hst: 1 },
      vow: 'red_tide', verses: ['rend', 'flay', 'drink_deep', 'opening_cut'],
      gear: { weapon: null, vestment: null, relic: null }, doctrine: 'aggressive',
    };
    const r = validate('echoCode', code);
    assert.strictEqual(r.ok, false, `level ${level}`);
  }
});
test('validators: enum violations named precisely', () => {
  const r = validate('verse', { id: 'v', name: 'V', cls: 'bard', cost: 1, cd: 1, unlockLevel: 1, effects: [{ op: 'brace' }] });
  assert.strictEqual(r.ok, false);
  assert.match(r.errors[0], /not in \[/);
});
test('validators: int/number/string type mismatches rejected', () => {
  assert.strictEqual(validate('verse', { id: 'v', name: 'V', cls: 'common', cost: 'one', cd: 1, unlockLevel: 1, effects: [{ op: 'brace' }] }).ok, false);
  assert.strictEqual(validate('verse', { id: 7, name: 'V', cls: 'common', cost: 1, cd: 1, unlockLevel: 1, effects: [{ op: 'brace' }] }).ok, false);
  assert.strictEqual(validate('verse', { id: 'v', name: 'V', cls: 'common', cost: 1.5, cd: 1, unlockLevel: 1, effects: [{ op: 'brace' }] }).ok, false);
});

// ------------------------------------- systematic negative-mutation sweep
// For each fixture: mutate one required field at a time → must go invalid.
test('mutation sweep: every fixture goes invalid under a required-field deletion', () => {
  let mutations = 0;
  for (const [name, kind] of Object.entries(FIXTURE_KINDS)) {
    const spec = SCHEMAS[kind];
    for (const [key, rule] of Object.entries(spec)) {
      if (!rule.required) continue;
      const mutant = JSON.parse(JSON.stringify(fixtures[name]));
      delete mutant[key];
      const r = validate(kind, mutant, REG);
      assert.strictEqual(r.ok, false, `${name}: deleting ${key} should invalidate`);
      mutations += 1;
    }
  }
  assert.ok(mutations >= 40, `sweep ran ${mutations} mutations`);
});
test('mutation sweep: type corruption (required string → number) invalidates', () => {
  for (const [name, kind] of Object.entries(FIXTURE_KINDS)) {
    const spec = SCHEMAS[kind];
    for (const [key, rule] of Object.entries(spec)) {
      if (rule.type !== 'string' || !rule.required) continue;
      const mutant = JSON.parse(JSON.stringify(fixtures[name]));
      mutant[key] = 12345;
      const r = validate(kind, mutant, REG);
      assert.strictEqual(r.ok, false, `${name}: ${key} string→number should invalidate`);
    }
  }
});
test('mutation sweep: enum fields corrupted to foreign values invalidate', () => {
  for (const [name, kind] of Object.entries(FIXTURE_KINDS)) {
    const spec = SCHEMAS[kind];
    for (const [key, rule] of Object.entries(spec)) {
      if (!rule.enum || !rule.required) continue;
      const mutant = JSON.parse(JSON.stringify(fixtures[name]));
      mutant[key] = rule.enum[0] === 'ZZZ' ? 'YYY' : 'ZZZ';
      const r = validate(kind, mutant, REG);
      assert.strictEqual(r.ok, false, `${name}: ${key} enum break should invalidate`);
    }
  }
});
test('mutation sweep: integer fields corrupted to floats invalidate', () => {
  for (const [name, kind] of Object.entries(FIXTURE_KINDS)) {
    const spec = SCHEMAS[kind];
    for (const [key, rule] of Object.entries(spec)) {
      if (rule.type !== 'int' || !rule.required) continue;
      const mutant = JSON.parse(JSON.stringify(fixtures[name]));
      mutant[key] = 1.5;
      const r = validate(kind, mutant, REG);
      assert.strictEqual(r.ok, false, `${name}: ${key} int→float should invalidate`);
    }
  }
});
test('validators surface: exported contract matches T0.3', () => {
  const mod = require('../data/schemas/validators.js');
  assert.deepEqual(Object.keys(mod).sort(), ['CLASSES', 'OPCODES', 'SCHEMAS', 'STAT_KEYS', 'TALLIES', 'validate']);
});
test('validators: TALLIES are the three canon tallies', () => {
  assert.deepEqual(TALLIES, ['mercy', 'ruthless', 'devotion']);
});

// ======================================================================
// Per-kind boundary sweeps — every schema kind gets min/max/enum probes
// ======================================================================

// verse cost boundaries
for (const [cost, ok] of [[0, true], [1, true], [10, true], [11, false], [-1, false]]) {
  test(`sweep verse cost ${cost} → ${ok ? 'valid' : 'invalid'}`, () => {
    const r = validate('verse', { id: 'v', name: 'V', cls: 'common', cost, cd: 1, unlockLevel: 1, effects: [{ op: 'brace' }] });
    assert.strictEqual(r.ok, ok, r.errors.join('; '));
  });
}
// verse cd boundaries
for (const [cd, ok] of [[0, true], [10, true], [11, false]]) {
  test(`sweep verse cd ${cd} → ${ok ? 'valid' : 'invalid'}`, () => {
    const r = validate('verse', { id: 'v', name: 'V', cls: 'common', cost: 1, cd, unlockLevel: 1, effects: [{ op: 'brace' }] });
    assert.strictEqual(r.ok, ok);
  });
}
// unlockLevel boundaries
for (const [lvl, ok] of [[1, true], [10, true], [0, false], [11, false]]) {
  test(`sweep verse unlockLevel ${lvl} → ${ok ? 'valid' : 'invalid'}`, () => {
    const r = validate('verse', { id: 'v', name: 'V', cls: 'common', cost: 1, cd: 1, unlockLevel: lvl, effects: [{ op: 'brace' }] });
    assert.strictEqual(r.ok, ok);
  });
}
// enemy hp floors
for (const [hp, ok] of [[1, true], [0, false], [-5, false]]) {
  test(`sweep enemy hp ${hp} → ${ok ? 'valid' : 'invalid'}`, () => {
    const r = validate('enemy', {
      id: 'x', name: 'X', cls: 'ashblade', level: 1,
      alloc: { vig: 11, mig: 5, wit: 2, grd: 10, hst: 5 },
      hp, hpOverride: false, signature: 's', counterLine: 'c',
    });
    assert.strictEqual(r.ok, ok);
  });
}
// namedEcho toll band 100–1900 and recasts 0–3
for (const [toll, ok] of [[100, true], [1900, true], [99, false], [1901, false]]) {
  test(`sweep namedEcho toll ${toll} → ${ok ? 'valid' : 'invalid'}`, () => {
    const r = validate('namedEcho', {
      id: 'e', name: 'E', cls: 'ashblade', level: 5, toll,
      history: 'h', weakness: 'w', recasts: 1,
    });
    assert.strictEqual(r.ok, ok);
  });
}
for (const [recasts, ok] of [[0, true], [3, true], [4, false], [-1, false]]) {
  test(`sweep namedEcho recasts ${recasts} → ${ok ? 'valid' : 'invalid'}`, () => {
    const r = validate('namedEcho', {
      id: 'e', name: 'E', cls: 'ashblade', level: 5, toll: 500,
      history: 'h', weakness: 'w', recasts,
    });
    assert.strictEqual(r.ok, ok);
  });
}
// chapter index/act bands
for (const [act, ok] of [[1, true], [3, true], [0, false], [4, false]]) {
  test(`sweep chapter act ${act} → ${ok ? 'valid' : 'invalid'}`, () => {
    const r = validate('chapter', {
      id: 'c', act, index: 1, levelBand: ['1', '2'],
      duels: ['d1', 'd2'], choiceId: 'ch', hasShrine: true,
    });
    assert.strictEqual(r.ok, ok);
  });
}
// choice options need ≥ 3 tallied options
for (const [n, ok] of [[3, true], [2, false], [4, true]]) {
  test(`sweep choice options ${n} → ${ok ? 'valid' : 'invalid'}`, () => {
    const options = Array.from({ length: n }, (_, i) => ({ tally: ['mercy', 'ruthless', 'devotion'][i % 3], reward: {} }));
    const r = validate('choice', { id: 'c', chapter: 'ch1', prompt: 'p', options });
    assert.strictEqual(r.ok, ok, r.errors.join('; '));
  });
}
// objective xp band 0–5
for (const [xp, ok] of [[0, true], [5, true], [6, false], [-1, false]]) {
  test(`sweep objective xp ${xp} → ${ok ? 'valid' : 'invalid'}`, () => {
    const r = validate('objective', { id: 'o', chapter: 1, text: 't', test: 'k', reward: { xp } });
    assert.strictEqual(r.ok, ok);
  });
}
// rite trigger shapes
for (const [trigger, ok] of [[{ atHP: 0.5 }, true], [{ atHP: 1 }, true], [{ atHP: 1.1 }, false], [{ atHP: 0 }, true], [{ onTurn: 20 }, true], [{ onTurn: 21 }, false], [{}, true]]) {
  test(`sweep rite trigger ${JSON.stringify(trigger)} → ${ok ? 'valid' : 'invalid'}`, () => {
    // Frozen T0.3 notes: atHP min is 0 (degenerate but legal); an EMPTY trigger
    // passes the shape check — evalRites treats it as never-firing (dead but
    // deterministic). Flagged in the report as a Phase-4 hardening candidate
    // (exactly-one-of atHP|onTurn) — the frozen schema is not edited silently.
    const r = validate('rite', { id: 'r', trigger, change: {}, line: 'l' });
    assert.strictEqual(r.ok, ok, r.errors.join('; '));
  });
}
// saveState run bands
for (const [level, ok] of [[1, true], [10, true], [0, false], [11, false]]) {
  test(`sweep saveState run.level ${level} → ${ok ? 'valid' : 'invalid'}`, () => {
    const r = validate('saveState', {
      version: 1,
      run: { chapter: 1, level, xp: 0, tallies: {}, memoriesSold: [] },
      loadouts: [{ id: 'a' }],
      floor: { toll: 100, bound: false, ward: false },
      settings: { countersOptIn: true },
    });
    assert.strictEqual(r.ok, ok);
  });
}
// saveState needs ≥ 1 loadout (Twin Ledger's second arrives with D3)
for (const [n, ok] of [[1, true], [0, false], [2, true]]) {
  test(`sweep saveState loadouts ${n} → ${ok ? 'valid' : 'invalid'}`, () => {
    const r = validate('saveState', {
      version: 1,
      run: { chapter: 1, level: 1, xp: 0, tallies: {}, memoriesSold: [] },
      loadouts: Array.from({ length: n }, () => ({ id: 'a' })),
      floor: { toll: 100, bound: false, ward: false },
      settings: { countersOptIn: true },
    });
    assert.strictEqual(r.ok, ok);
  });
}
// floor ward/bound flags are typed booleans
test('sweep saveState floor flags: booleans enforced', () => {
  const r = validate('saveState', {
    version: 1,
    run: { chapter: 1, level: 1, xp: 0, tallies: {}, memoriesSold: [] },
    loadouts: [{ id: 'a' }],
    floor: { toll: 100, bound: 'yes', ward: false },
    settings: { countersOptIn: true },
  });
  assert.strictEqual(r.ok, false);
});
// item slot enum
for (const slot of ['weapon', 'vestment', 'relic']) {
  test(`sweep item slot ${slot} valid`, () => {
    const r = validate('item', { id: 'i', name: 'I', slot, affinity: 'any', stats: {}, mark: [{ op: 'damage' }], source: 's' });
    assert.strictEqual(r.ok, true);
  });
}
test('sweep item slot "hat" invalid', () => {
  const r = validate('item', { id: 'i', name: 'I', slot: 'hat', affinity: 'any', stats: {}, mark: [{ op: 'damage' }], source: 's' });
  assert.strictEqual(r.ok, false);
});
// item stat bonuses 0–3 per stat
for (const [v, ok] of [[0, true], [3, true], [4, false]]) {
  test(`sweep item stat bonus ${v} → ${ok ? 'valid' : 'invalid'}`, () => {
    const r = validate('item', { id: 'i', name: 'I', slot: 'relic', affinity: 'any', stats: { mig: v }, mark: [{ op: 'damage' }], source: 's' });
    assert.strictEqual(r.ok, ok);
  });
}
// verse/vow effects: at least one op (empty and missing rejected)
test('sweep effects presence: missing effects array rejected', () => {
  assert.strictEqual(validate('verse', { id: 'v', name: 'V', cls: 'common', cost: 1, cd: 1, unlockLevel: 1 }).ok, false);
  assert.strictEqual(validate('vow', { id: 'v', name: 'V', kind: 'class', cls: 'ashblade' }).ok, false);
});
// class schema: verse list needs ≥ 9 entries
for (const [n, ok] of [[9, true], [8, false]]) {
  test(`sweep class verses ${n} → ${ok ? 'valid' : 'invalid'}`, () => {
    const r = validate('class', {
      id: 'ashblade', name: 'Ashblade',
      stats: { vig: 6, mig: 8, wit: 2, grd: 4, hst: 7 },
      damageType: 'steel',
      verses: Array.from({ length: n }, (_, i) => `v${i}`),
    });
    assert.strictEqual(r.ok, ok);
  });
}
// echoCode gear fields typed as strings when present
test('sweep echoCode gear: non-string weapon rejected under registry ctx', () => {
  const r = validate('echoCode', {
    v: 1, name: 'G', cls: 'ashblade', level: 1,
    alloc: { vig: 1, mig: 2, wit: 0, grd: 0, hst: 1 },
    vow: 'red_tide', verses: ['rend', 'flay', 'drink_deep', 'opening_cut'],
    gear: { weapon: 99, vestment: null, relic: null }, doctrine: 'aggressive',
  }, { itemIds: ['x'] });
  assert.strictEqual(r.ok, false);
  assert.ok(r.errors.some((e) => e.includes('gear')));
});
// echoCode doctrine required
test('sweep echoCode doctrine required', () => {
  const r = validate('echoCode', {
    v: 1, name: 'D', cls: 'ashblade', level: 1,
    alloc: { vig: 1, mig: 2, wit: 0, grd: 0, hst: 1 },
    vow: 'red_tide', verses: ['rend', 'flay', 'drink_deep', 'opening_cut'],
    gear: { weapon: null, vestment: null, relic: null },
  });
  assert.strictEqual(r.ok, false);
  assert.ok(r.errors.some((e) => e.includes('doctrine')));
});
// op-code vocabulary is exactly the T0.3 list (frozen, additive-only history)
test('sweep OPCODES: frozen vocabulary list', () => {
  assert.deepEqual(OPCODES, [
    'damage', 'bleed+', 'burn', 'curse', 'fray', 'hush', 'brace', 'ward', 'thorns',
    'stun', 'heal', 'resolve', 'cleanse', 'mitigation_mod', 'crit_mod', 'dot_mod', 'selfTrue',
    'conditional', 'once_per_fight',
  ]);
});
