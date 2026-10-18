// phase5-honesty.test.js — T5.6 acceptance: the AI honesty firewall.
// [GDD] §12.3 rules 4–5: the AI may read the opponent's VISIBLE statuses,
// HP and Resolve — never slotted verses, vow, gear, or future casts. This
// is what keeps the ladder honest, enforced by construction (visibleOf is
// the only target view; it is frozen and shape-pinned) and by test:
//   - the projection carries exactly the documented keys and is deep-frozen
//   - poison-equality: same visible board, different hidden hands →
//     byte-identical choices through the DEFAULT scorer AND all four
//     doctrines (the T5.4 pin, extended to the doctrine layer)
//   - the architecture scan: engine/ai*.js + engine/doctrines.js import no
//     vow/gear accessors and never read a raw `opponent.sheet`/`target.sheet`
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const { CANON } = require('../data/config.js');
const { visibleOf } = require('../engine/ai.js');
const { chooseVerseByDoctrine } = require('../engine/doctrines.js');
const { STRIKE, getVerse } = require('../data/verses.js');
const { initStatuses, applyBleed, applyBurn } = require('../engine/status.js');
const { makeMeasures, mulberry32 } = require('../rng/index.js');

const T = CANON;

function fighter(opts = {}) {
  return {
    sheet: {
      stats: { vig: 6, mig: 8, wit: 9, grd: 4, hst: 7 },
      mainStat: 'wit', damageType: 'ember', verses: [], items: [], ...(opts.sheet || {}),
    },
    side: opts.side || 'a',
    hp: opts.hp != null ? opts.hp : 100, maxHp: opts.maxHp != null ? opts.maxHp : 120,
    statuses: opts.statuses || initStatuses(),
    cooldowns: {}, casts: {}, flags: { candleUsed: false },
    mods: opts.mods || {}, riteState: opts.riteState || null,
    resolve: opts.resolve != null ? opts.resolve : 5,
    opponent: null, totals: { dealt: 0, taken: 0, healed: 0 },
  };
}

// ------------------------------------------------- the projection shape
test('T5.6: the projection carries exactly the documented keys — and nothing else', () => {
  const t = fighter({ side: 'b', sheet: { stats: { vig: 9, mig: 5, wit: 2, grd: 8, hst: 3 }, mainStat: 'mig', damageType: 'steel', verses: ['rend'], vow: 'duelist', items: ['wick_cutter'] } });
  applyBleed(t, 2, 8);
  const vis = visibleOf(t, T);
  assert.deepStrictEqual(Object.keys(vis).sort(), ['defense', 'defenseMap', 'hp', 'maxHp', 'resolve', 'statuses'],
    'no verse list, no vow, no items, no cooldowns, no sheet identity');
  assert.deepStrictEqual(Object.keys(vis.statuses), ['bleed'], 'chips only, with values');
  assert.deepStrictEqual(Object.keys(vis.defense).sort(), ['ember', 'shade', 'steel']);
});

test('T5.6: the projection is deep-frozen — the firewall cannot be mutated open', () => {
  const t = fighter({ side: 'b' });
  applyBurn(t, 3, null);
  const vis = visibleOf(t, T);
  assert.strictEqual(Object.isFrozen(vis), true);
  assert.strictEqual(Object.isFrozen(vis.statuses), true);
  assert.strictEqual(Object.isFrozen(vis.statuses.burn), true);
  assert.strictEqual(Object.isFrozen(vis.defense), true);
  // a mutation attempt cannot graft a hidden field on
  const before = JSON.stringify(vis);
  try { vis.hiddenHand = ['rend']; } catch { /* strict callers throw */ }
  try { vis.statuses.burn.potency = 99; } catch { /* strict callers throw */ }
  assert.strictEqual(JSON.stringify(vis), before, 'the projection did not drift');
});

test('T5.6: the D10 bar is exposed ONLY through the temperature field when present', () => {
  const t = fighter({ side: 'b', riteState: { flags: { molten: true, damageTakenMult: 0.5 } } });
  const vis = visibleOf(t, T);
  assert.deepStrictEqual(Object.keys(vis).sort(), ['defense', 'defenseMap', 'hp', 'maxHp', 'resolve', 'riteState', 'statuses', 'temperature']);
  assert.strictEqual(vis.temperature.molten, true);
  const plain = visibleOf(fighter({ side: 'b' }), T);
  assert.ok(!('temperature' in plain) && !('riteState' in plain), 'absent when no bar is exposed');
});

// ------------------------------------------------------- poison-equality
test('T5.6: poison-equality through every doctrine — hidden hands never leak into choices', () => {
  const mkHidden = (verses, vow, item, cds, flags) => {
    const t = fighter({ side: 'b', sheet: { stats: { vig: 9, mig: 5, wit: 2, grd: 8, hst: 3 }, mainStat: 'mig', damageType: 'steel', verses, vow, items: [item] } });
    t.vow = vow; t.cooldowns = cds; t.lastCastId = 'rend'; t.flags = { candleUsed: false, ...flags };
    return t;
  };
  const a = mkHidden(['rend', 'flay'], 'red_tide', 'wick_cutter', { rend: 2 }, { poison: { deep: 1 } });
  const b = mkHidden(['conflagration', 'sear_the_note'], 'pyre', 'corvanes_blade', { conflagration: 1 }, { poison: { deep: 999 } });
  applyBleed(a, 3, 9); applyBleed(b, 3, 9);
  const legal = [STRIKE, getVerse('spark'), getVerse('reap_the_red'), getVerse('steady_breath'), getVerse('purify'), getVerse('tolling_bell')];
  for (const doctrine of [null, 'hymnal', 'predator', 'bulwark', 'cantors_hand']) {
    const actor = fighter({ sheet: { stats: { vig: 6, mig: 14, wit: 9, grd: 4, hst: 7 }, mainStat: 'mig', damageType: 'steel', ...(doctrine ? { doctrine } : {}) } });
    const m1 = makeMeasures(mulberry32(4141));
    const m2 = makeMeasures(mulberry32(4141));
    const ra = chooseVerseByDoctrine(actor, a, {}, m1, T, () => legal);
    const rb = chooseVerseByDoctrine(actor, b, {}, m2, T, () => legal);
    assert.strictEqual(rb.verse.id, ra.verse.id, `${doctrine || 'default'}: same pick despite a different hidden hand`);
    assert.strictEqual(
      JSON.stringify(rb.scores.map((s) => [s.id, s.score, !!s.filtered])),
      JSON.stringify(ra.scores.map((s) => [s.id, s.score, !!s.filtered])),
      `${doctrine || 'default'}: byte-identical score table`);
    assert.strictEqual(ra.doctrine, rb.doctrine);
  }
});

// ------------------------------------------------- architecture firewall
test('T5.6: architecture — the AI layer imports no vow/gear accessors', () => {
  const files = ['engine/ai.js', 'engine/doctrines.js', 'engine/ai-scripts.js'];
  const banned = [/data\/vows/, /data\/items/, /require\(['"]\.\.\/data\/(vows|items)\.js['"]\)/];
  for (const f of files) {
    const p = path.join(__dirname, '..', f);
    if (!fs.existsSync(p)) continue; // ai-scripts.js arrives with T5.7 in this phase
    const src = fs.readFileSync(p, 'utf8');
    for (const rx of banned) {
      assert.ok(!rx.test(src), `${f} must not import vow/gear accessors (matched ${rx})`);
    }
  }
});

test('T5.6: architecture — no raw opponent/target sheet reads in the decision layer', () => {
  // visibleOf/defenseConstant are the boundary; the decision logic behind it
  // reads the projection only. The raw-target accessor pattern is banned in
  // the AI layer's source.
  const files = ['engine/ai.js', 'engine/doctrines.js'];
  for (const f of files) {
    const src = fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
    assert.ok(!/opponent\.sheet/.test(src), `${f}: no raw opponent.sheet reads`);
    assert.ok(!/target\.sheet/.test(src), `${f}: no raw target.sheet reads`);
  }
});
