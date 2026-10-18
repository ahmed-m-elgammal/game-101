// tests/schemas.test.js — T0.3 validation: every fixture passes its schema;
// the known-bad examples are rejected. Zero dependencies (node --test).
'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const { validate } = require('../data/schemas/validators.js');
const fixtures = require('../data/schemas/fixtures.json');

// minimal test registries — Phase 4 (T4.1) replaces these with the real data layer
const REG = {
  verseIds: ['rend', 'opening_cut', 'flay', 'red_flurry', 'drink_deep', 'blood_ledger', 'duelist_blade', 'ashen_edge', 'last_word', 'tolling_bell', 'dirge', 'requiem', 'dissonance', 'crypt_door', 'shade_bolt', 'steady_breath'],
  itemIds: ['tuning_fork', 'drowned_mantle', 'deaf_wax', 'pallbearers_mace', 'sextons_shroud', 'grave_shovel_of_bram'],
  vowIds: [
    { id: 'silence', kind: 'class', cls: 'hollow_cantor' },
    { id: "oren's_post", kind: 'story', cls: 'any' },
  ],
};

const FIXTURE_KINDS = [
  ['class', 'class'], ['verse', 'verse'], ['vow_class', 'vow'], ['vow_story', 'vow'],
  ['item', 'item'], ['enemy', 'enemy'], ['enemy_boss', 'enemy'], ['rite', 'rite'],
  ['namedEcho', 'namedEcho'], ['chapter', 'chapter'], ['choice', 'choice'],
  ['scene', 'scene'],
  ['objective', 'objective'], ['deed', 'deed'], ['vendorEntry', 'vendorEntry'],
  ['saveState', 'saveState'], ['echoCode_v1', 'echoCode'], ['echoCode_v2', 'echoCode'],
];

test('scene fixtures agree with the ui/scene fixture module (same node)', () => {
  // the browser UI ships its own copy of the demo node; the schema and the
  // UI must never drift apart
  const { CH1_OPENING } = require('../ui-scene-fixture.cjs');
  const sceneFixture = fixtures.scene;
  assert.strictEqual(sceneFixture.id, CH1_OPENING.id);
  assert.strictEqual(JSON.stringify(sceneFixture.choices), JSON.stringify(CH1_OPENING.choices));
});

test('every frozen schema has a valid fixture', () => {
  for (const [fk, kind] of FIXTURE_KINDS) {
    const res = validate(kind, fixtures[fk], REG);
    assert.deepStrictEqual(res, { ok: true, errors: [] }, `${fk} must validate as ${kind}: ${JSON.stringify(res.errors)}`);
  }
});

test('N1 — the original example alloc (sum 18 at L7) is rejected', () => {
  const bad = JSON.parse(JSON.stringify(fixtures.echoCode_v1));
  bad.alloc = { vig: 3, mig: 0, wit: 9, grd: 2, hst: 4 }; // sums 18 > cap 16
  const res = validate('echoCode', bad, REG);
  assert.strictEqual(res.ok, false);
  assert.ok(res.errors.some((e) => e.includes('exceeds the L7 cap of 16')));
});

test('unknown verse id is rejected', () => {
  const bad = JSON.parse(JSON.stringify(fixtures.echoCode_v1));
  bad.verses[0] = 'not_a_verse';
  const res = validate('echoCode', bad, REG);
  assert.strictEqual(res.ok, false);
  assert.ok(res.errors.some((e) => e.includes('unknown verse id')));
});

test('story vow on a bare v1 code (no story-state) is rejected', () => {
  const bad = JSON.parse(JSON.stringify(fixtures.echoCode_v1));
  bad.vow = "oren's_post"; // story vow, v1 code carries no tally
  const res = validate('echoCode', bad, REG);
  assert.strictEqual(res.ok, false);
  assert.ok(res.errors.some((e) => e.includes('story vow')));
});

test('enemy conformance: D7 budget is enforced at ±0 (N5: 33 + 2(L−1))', () => {
  const bad = JSON.parse(JSON.stringify(fixtures.enemy));
  bad.alloc.vig += 1; // now 34 vs budget 33 at L1
  const res = validate('enemy', bad);
  assert.strictEqual(res.ok, false);
  assert.ok(res.errors.some((e) => e.includes('budget 33')));
});

test('vendor entries can never restock (D13/D14)', () => {
  const bad = { ...fixtures.vendorEntry, restock: true };
  const res = validate('vendorEntry', bad);
  assert.strictEqual(res.ok, false);
  assert.ok(res.errors.some((e) => e.includes('never restocks')));
});

test('out-of-level values are rejected', () => {
  const bad = JSON.parse(JSON.stringify(fixtures.echoCode_v1));
  bad.level = 11;
  const res = validate('echoCode', bad, REG);
  assert.strictEqual(res.ok, false);
  assert.ok(res.errors.some((e) => e.includes('level')));
});
