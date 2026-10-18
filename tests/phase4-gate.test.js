// phase4-gate.test.js — T4.12 acceptance: "deliberately breaking any one
// row turns CI red." Runs the real gate against mutated in-memory bundles
// (the gate is a CLI; the negative probes re-run its core checks against
// the same data the loader would reject). Also pins the recorded
// advisories: N10 affinity and the §8.3 stun-amplifier table gap stay WARN,
// never silently green, never hard-failed by ruling.
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { execFileSync, spawnSync } = require('node:child_process');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const GATE = path.join(ROOT, 'tools', 'asserts', 'content.js');
const CAL = path.join(ROOT, 'tools', 'calendar.js');

test('T4.12: the gate passes on the real content (0 hard failures)', () => {
  const r = spawnSync('node', [GATE], { encoding: 'utf8' });
  assert.strictEqual(r.status, 0, `gate output:\n${r.stdout}\n${r.stderr}`);
  assert.match(r.stdout, /0 hard failures, 2 recorded advisory/);
  // the two recorded advisories are visible, by name
  assert.match(r.stdout, /N10/);
  assert.match(r.stdout, /routed to the owner/);
});

test('T4.12 negative: a budget-broken enemy row is rejected by the frozen schema', () => {
  const { validate } = require('../data/schemas/validators.js');
  const { ENEMY_BY_ID } = require('../data/enemies.js');
  const broken = { ...structuredClone(ENEMY_BY_ID.get('sable')), alloc: { ...ENEMY_BY_ID.get('sable').alloc, vig: 13 } };
  const r = validate('enemy', broken, {});
  assert.strictEqual(r.ok, false, 'sum 42 vs budget 41 must fail');
  assert.ok(r.errors.some((e) => e.includes('budget')));
});

test('T4.12 negative: a mis-tiered Echo row (Toll outside the band) is rejected', () => {
  const { validate } = require('../data/schemas/validators.js');
  const { ECHO_BY_ID } = require('../data/named-echoes.js');
  const broken = { ...structuredClone(ECHO_BY_ID.get('brother_ash')), toll: 2000 };
  const r = validate('namedEcho', broken, {});
  assert.strictEqual(r.ok, false, 'Toll 2000 exceeds even the recast ceiling (schema max 1900, the §9.4 band is 800–1400)');
});

test('T4.12 negative: a rite trigger outside the frozen shape is rejected', () => {
  const { validate } = require('../data/schemas/validators.js');
  const broken = { id: 'x', trigger: { atHP: 1.4 }, change: {}, line: 'too hot' };
  const r = validate('rite', broken, {});
  assert.strictEqual(r.ok, false);
});

test('T4.12 negative: the loader refuses a roster whose enemy references an unknown verse', () => {
  const { assembleRoster } = require('../data/index.js');
  const { ENEMIES } = require('../data/enemies.js');
  const broken = structuredClone(ENEMIES).map((e) => (e.id === 'bram' ? { ...e, verses: ['not_a_verse'] } : e));
  assert.throws(() => assembleRoster({ enemies: broken }), /verse "not_a_verse"/);
});

test('T4.12 negative: the loader refuses an Echo whose vows or unlocks are illegal', () => {
  const { assembleRoster } = require('../data/index.js');
  const { NAMED_ECHOES } = require('../data/named-echoes.js');
  const broken = structuredClone(NAMED_ECHOES).map((e) => (e.id === 'salt_widow'
    ? { ...e, build: { ...e.build, verses: ['sear_the_note', 'conflagration', 'spark', 'stoke'] } } // sear unlocks at L7, she is L9 — legal; use a story vow instead
    : e));
  const story = broken.map((e) => (e.id === 'salt_widow'
    ? { ...e, build: { ...e.build, vow: 'kept_name' } } // a story vow cannot sit on a Floor Echo
    : e));
  assert.throws(() => assembleRoster({ echoes: story }), /story vow/);
});

test('T4.12 negative: the calendar byte-diff fails when the tables move', () => {
  // the --check path is the CI hook: mutate the committed file → --check exits 1
  const p = path.join(ROOT, 'data', 'calendar.json');
  const original = require('node:fs').readFileSync(p, 'utf8');
  const parsed = JSON.parse(original);
  parsed.chapters[0].fights[0].xp += 1; // a one-point drift in any table
  require('node:fs').writeFileSync(p, JSON.stringify(parsed, null, 2) + '\n');
  try {
    const r = spawnSync('node', [CAL, '--check'], { encoding: 'utf8' });
    assert.strictEqual(r.status, 1, 'a drifted table must fail the byte-diff');
    assert.match(r.stderr, /STALE/);
  } finally {
    require('node:fs').writeFileSync(p, original);
  }
  const ok = spawnSync('node', [CAL, '--check'], { encoding: 'utf8' });
  assert.strictEqual(ok.status, 0, 'restored file passes again');
});
