// phase5-doctrines.test.js — T5.5 acceptance: the four §12.2 behavior
// profiles layered over the T5.4 shared rules.
//   - Hymnal: strict slot-order playback (first usable slot)
//   - Predator: highest expected damage; defends ONLY below 30% HP
//   - Bulwark: defensive verses first below 70% HP or without a shield;
//     otherwise follows Hymnal
//   - Cantor's Hand: blends Hymnal with the verse most likely to be
//     punished by the opponent's active statuses (visible board only)
//   - shared rules hold under every doctrine: lethal first, the pointless
//     filter, the Strike fallback, Band(k) ties only, zero Measure draws
//   - no doctrine on the sheet → the T5.4 default scorer, byte-identical
//   - the honesty boundary holds under every doctrine (trapping Proxy)
//   - the harness comparison reports win-rate deltas by matchup
'use strict';
const test = require('node:test');
const assert = require('node:assert');

const { CANON } = require('../data/config.js');
const { chooseVerse, visibleOf } = require('../engine/ai.js');
const { chooseVerseByDoctrine, punishScore, strippedVis } = require('../engine/doctrines.js');
const { STRIKE, getVerse } = require('../data/verses.js');
const { initStatuses, applyBleed, applyBurn, applyTimed, applyWard } = require('../engine/status.js');
const { runFight } = require('../engine/fight.js');
const { standardBuild } = require('../harness/matrix.js');
const { compareDoctrines } = require('../harness/doctrines.js');
const { FLOOR_POPULATION, ECHO_BY_ID, buildOf } = require('../data/named-echoes.js');
const { buildSheet } = require('../engine/fighter.js');
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

// A decisive Measure: counts draws, breaks ties at index 0.
function countingMeasure() {
  const m = { draws: 0 };
  m.band = (n) => { m.draws += 1; return 0; };
  m.clamped = () => { m.draws += 1; return 1; };
  m.narrow = () => { m.draws += 1; return 0; };
  m.weighted = () => { m.draws += 1; return 0; };
  m.shuffle = (a) => { m.draws += 1; return a; };
  m.fixed = (v) => v;
  return m;
}

// ------------------------------------------------- the no-doctrine default
test('T5.5: a sheet without a doctrine plays the T5.4 default scorer byte-identically', () => {
  const m1 = makeMeasures(mulberry32(4242));
  const m2 = makeMeasures(mulberry32(4242));
  const actor = fighter({ sheet: { stats: { vig: 6, mig: 8, wit: 9, grd: 4, hst: 7 }, mainStat: 'wit', damageType: 'ember', verses: ['spark', 'wither_note'] } });
  const target = fighter({ side: 'b', sheet: { stats: { vig: 9, mig: 5, wit: 2, grd: 8, hst: 3 }, mainStat: 'mig', damageType: 'steel' } });
  const legal = [STRIKE, getVerse('spark'), getVerse('wither_note')];
  const viaLayer = chooseVerseByDoctrine(actor, target, {}, m1, T, () => legal);
  const direct = chooseVerse(actor, target, {}, m2, T, () => legal);
  assert.strictEqual(viaLayer.verse.id, direct.verse.id);
  assert.strictEqual(JSON.stringify(viaLayer.scores.map((s) => [s.id, s.score])), JSON.stringify(direct.scores.map((s) => [s.id, s.score])));
  assert.strictEqual(viaLayer.doctrine, undefined);
});

// ------------------------------------------------------------- Hymnal
test('T5.5 Hymnal: plays the slotted verses strictly in the player\u2019s order, not the scorer\u2019s', () => {
  // slot 1 steady_breath (a ward), slot 2 conflagration (big ember) —
  // the default scorer prefers the damage, the Hymnal plays slot 1.
  const actor = fighter();
  const target = fighter({ side: 'b', sheet: { stats: { vig: 9, mig: 5, wit: 2, grd: 8, hst: 3 }, mainStat: 'mig', damageType: 'steel' } });
  const legal = [STRIKE, getVerse('steady_breath'), getVerse('conflagration')];
  const def = chooseVerse(actor, target, {}, countingMeasure(), T, () => legal);
  const hym = chooseVerseByDoctrine({ ...actor, sheet: { ...actor.sheet, doctrine: 'hymnal' } }, target, {}, countingMeasure(), T, () => legal);
  assert.notStrictEqual(def.verse.id, hym.verse.id, 'the scorer and the Hymnal must disagree here');
  assert.strictEqual(hym.verse.id, 'steady_breath');
  assert.strictEqual(hym.doctrine, 'hymnal');
});

test('T5.5 Hymnal: a pointless first slot is skipped — the next slot plays', () => {
  // slot 1 purify while clean (filtered), slot 2 spark (usable).
  const actor = fighter();
  const target = fighter({ side: 'b' });
  const legal = [STRIKE, getVerse('purify'), getVerse('spark')];
  const r = chooseVerseByDoctrine({ ...actor, sheet: { ...actor.sheet, doctrine: 'hymnal' } }, target, {}, countingMeasure(), T, () => legal);
  assert.strictEqual(r.verse.id, 'spark');
  assert.ok(r.filter.purify.length > 0, 'the skipped slot carries its filter reasons');
});

test('T5.5 Hymnal: the lethal check (shared Rule 1) outranks slot order', () => {
  const actor = fighter();
  const target = fighter({ side: 'b', hp: 3 });
  const legal = [STRIKE, getVerse('tolling_bell'), getVerse('conflagration')];
  const r = chooseVerseByDoctrine({ ...actor, sheet: { ...actor.sheet, doctrine: 'hymnal' } }, target, {}, countingMeasure(), T, () => legal);
  assert.strictEqual(r.lethal, true);
  assert.strictEqual(r.verse.id, 'conflagration', 'the killing blow is cast regardless of its slot');
});

test('T5.5 Hymnal: nothing usable → Strike fallback (shared Rule 3)', () => {
  const actor = fighter({ hp: 100, maxHp: 100 });
  const target = fighter({ side: 'b' });
  const legal = [STRIKE, getVerse('purify')]; // cleanse when clean → filtered
  const r = chooseVerseByDoctrine({ ...actor, sheet: { ...actor.sheet, doctrine: 'hymnal' } }, target, {}, countingMeasure(), T, () => legal);
  assert.strictEqual(r.verse.id, STRIKE.id);
  assert.strictEqual(r.fallback, true);
});

// ------------------------------------------------------------ Predator
test('T5.5 Predator: above 30% HP it plays the highest EXPECTED damage, not the highest score', () => {
  // drink_deep carries lifesteal — the shared score inflates it on a
  // wounded actor; the Predator\u2019s rule is damage, so the bigger hit wins.
  const actor = fighter({ hp: 40, maxHp: 120, sheet: { stats: { vig: 6, mig: 14, wit: 2, grd: 4, hst: 7 }, mainStat: 'mig', damageType: 'steel', doctrine: 'predator' } });
  const target = fighter({ side: 'b', hp: 100, maxHp: 120, sheet: { stats: { vig: 9, mig: 5, wit: 2, grd: 8, hst: 3 }, mainStat: 'mig', damageType: 'steel' } });
  const legal = [STRIKE, getVerse('drink_deep'), getVerse('red_flurry')];
  const def = chooseVerse(actor, target, {}, countingMeasure(), T, () => legal);
  const pred = chooseVerseByDoctrine(actor, target, {}, countingMeasure(), T, () => legal);
  assert.strictEqual(pred.verse.id, 'red_flurry', 'the flurry out-damages the bite');
  assert.strictEqual(pred.doctrine, 'predator');
  if (def.verse.id === pred.verse.id) {
    assert.fail('test setup: the default scorer should prefer the lifesteal here');
  }
});

test('T5.5 Predator: above 30% HP it never defends — the Ward verse is refused', () => {
  const actor = fighter({ hp: 50, maxHp: 120, sheet: { stats: { vig: 6, mig: 8, wit: 9, grd: 4, hst: 7 }, mainStat: 'wit', damageType: 'ember', doctrine: 'predator' } });
  const target = fighter({ side: 'b', sheet: { stats: { vig: 9, mig: 5, wit: 2, grd: 8, hst: 3 }, mainStat: 'mig', damageType: 'steel' } });
  const legal = [STRIKE, getVerse('steady_breath'), getVerse('spark'), getVerse('conflagration')];
  const r = chooseVerseByDoctrine(actor, target, {}, countingMeasure(), T, () => legal);
  assert.notStrictEqual(r.verse.id, 'steady_breath', 'never defends above the line');
  assert.strictEqual(r.verse.id, 'conflagration', 'the biggest hit, not the shield');
});

test('T5.5 Predator: the 30% line flips defense refusal — paired pool', () => {
  // Same pool, same actor except HP: above the line the Predator refuses
  // the shield and banks Resolve with Strike (labeled fallback); below it,
  // defense becomes eligible and the Ward plays.
  const sheet = { stats: { vig: 6, mig: 8, wit: 9, grd: 4, hst: 7 }, mainStat: 'wit', damageType: 'ember', doctrine: 'predator' };
  const target = fighter({ side: 'b', sheet: { stats: { vig: 9, mig: 5, wit: 2, grd: 8, hst: 3 }, mainStat: 'mig', damageType: 'steel' } });
  const legal = [STRIKE, getVerse('steady_breath'), getVerse('purify')];
  const above = chooseVerseByDoctrine(fighter({ hp: 50, maxHp: 120, sheet }), target, {}, countingMeasure(), T, () => legal);
  assert.strictEqual(above.verse.id, STRIKE.id, 'defense refused above the line');
  assert.strictEqual(above.fallback, true);
  const below = chooseVerseByDoctrine(fighter({ hp: 20, maxHp: 120, sheet }), target, {}, countingMeasure(), T, () => legal);
  assert.strictEqual(below.verse.id, 'steady_breath', 'below the line the shield plays');
});

test('T5.5 Predator: above 30% HP with nothing damaging but Strike → Strike, labeled', () => {
  const actor = fighter({ hp: 50, maxHp: 120, sheet: { stats: { vig: 6, mig: 8, wit: 9, grd: 4, hst: 7 }, mainStat: 'wit', damageType: 'ember', doctrine: 'predator' } });
  const target = fighter({ side: 'b' });
  const legal = [STRIKE, getVerse('steady_breath'), getVerse('purify')];
  const r = chooseVerseByDoctrine(actor, target, {}, countingMeasure(), T, () => legal);
  assert.strictEqual(r.verse.id, STRIKE.id);
  assert.strictEqual(r.fallback, true, 'Strike-only damage is the Rule-3 situation for a Predator');
});

// ------------------------------------------------------------ Bulwark
test('T5.5 Bulwark: below 70% HP the defensive verse plays first', () => {
  const actor = fighter({ hp: 50, maxHp: 120, sheet: { stats: { vig: 6, mig: 8, wit: 9, grd: 4, hst: 7 }, mainStat: 'wit', damageType: 'ember', doctrine: 'bulwark' } });
  const target = fighter({ side: 'b' });
  const legal = [STRIKE, getVerse('conflagration'), getVerse('steady_breath')];
  const r = chooseVerseByDoctrine(actor, target, {}, countingMeasure(), T, () => legal);
  assert.strictEqual(r.verse.id, 'steady_breath');
  assert.strictEqual(r.doctrine, 'bulwark');
});

test('T5.5 Bulwark: at full HP with NO Ward or Brace up, defense still plays first', () => {
  const actor = fighter({ hp: 120, maxHp: 120, sheet: { stats: { vig: 6, mig: 8, wit: 9, grd: 4, hst: 7 }, mainStat: 'wit', damageType: 'ember', doctrine: 'bulwark' } });
  const target = fighter({ side: 'b' });
  const legal = [STRIKE, getVerse('conflagration'), getVerse('steady_breath')];
  const r = chooseVerseByDoctrine(actor, target, {}, countingMeasure(), T, () => legal);
  assert.strictEqual(r.verse.id, 'steady_breath', 'the "or no Ward or Brace" clause');
});

test('T5.5 Bulwark: at full HP with a Brace active it follows Hymnal', () => {
  const actor = fighter({ hp: 120, maxHp: 120, statuses: initStatuses(), sheet: { stats: { vig: 6, mig: 8, wit: 9, grd: 4, hst: 7 }, mainStat: 'wit', damageType: 'ember', doctrine: 'bulwark' } });
  applyTimed(actor, 'brace', { turns: 2 });
  const target = fighter({ side: 'b' });
  const legal = [STRIKE, getVerse('conflagration'), getVerse('spark')]; // no defensive verse at all
  const r = chooseVerseByDoctrine(actor, target, {}, countingMeasure(), T, () => legal);
  // no defensive verse exists → falls through to Hymnal slot order → slot 1
  assert.strictEqual(r.verse.id, 'conflagration');
});

test('T5.5 Bulwark: shield up and healthy → Hymnal order over the usable set', () => {
  const actor = fighter({ hp: 120, maxHp: 120, statuses: initStatuses(), sheet: { stats: { vig: 6, mig: 8, wit: 9, grd: 4, hst: 7 }, mainStat: 'wit', damageType: 'ember', doctrine: 'bulwark' } });
  applyWard(actor, 20, 9);
  const target = fighter({ side: 'b', sheet: { stats: { vig: 9, mig: 5, wit: 2, grd: 8, hst: 3 }, mainStat: 'mig', damageType: 'steel' } });
  const legal = [STRIKE, getVerse('tolling_bell'), getVerse('conflagration'), getVerse('steady_breath')];
  const r = chooseVerseByDoctrine(actor, target, {}, countingMeasure(), T, () => legal);
  assert.strictEqual(r.verse.id, 'tolling_bell', 'otherwise follows Hymnal — slot 1');
});

test('T5.5 Bulwark: never spams a dead amplifier — Burn amps and debuffs are not defense', () => {
  // the harness-comparison pathology: stoke (no ember) and dirge scored as
  // "defense" under the naive !damage filter. Regression pin.
  const actor = fighter({ hp: 119, maxHp: 120, sheet: { stats: { vig: 6, mig: 8, wit: 9, grd: 4, hst: 7 }, mainStat: 'wit', damageType: 'ember', doctrine: 'bulwark' } });
  const target = fighter({ side: 'b' });
  const legal = [STRIKE, getVerse('stoke'), getVerse('dirge'), getVerse('steady_breath')];
  const r = chooseVerseByDoctrine(actor, target, {}, countingMeasure(), T, () => legal);
  assert.strictEqual(r.verse.id, 'steady_breath', 'the shield is the only true defense in the pool');
});

// ------------------------------------------------------- Cantor's Hand
test('T5.5 Cantor\u2019s Hand: the Bleed-scaling verse is the punished pick vs a bleeding target', () => {
  const actor = fighter({ sheet: { stats: { vig: 6, mig: 14, wit: 9, grd: 4, hst: 7 }, mainStat: 'mig', damageType: 'steel', doctrine: 'cantors_hand' } });
  const target = fighter({ side: 'b', hp: 100, maxHp: 120, sheet: { stats: { vig: 9, mig: 5, wit: 2, grd: 8, hst: 3 }, mainStat: 'mig', damageType: 'steel' } });
  applyBleed(target, 5, 9);
  const legal = [STRIKE, getVerse('conflagration'), getVerse('reap_the_red')];
  const r = chooseVerseByDoctrine(actor, target, {}, countingMeasure(), T, () => legal);
  assert.strictEqual(r.verse.id, 'reap_the_red', 'the verse that feeds on their Bleed');
  assert.ok(punishScore(actor, visibleOf(target, T), getVerse('reap_the_red'), T, 1.0) > 0);
});

test('T5.5 Cantor\u2019s Hand: bonusIfTargetBurning is exploited against a burning target', () => {
  const actor = fighter();
  const target = fighter({ side: 'b', sheet: { stats: { vig: 9, mig: 5, wit: 2, grd: 8, hst: 3 }, mainStat: 'mig', damageType: 'steel' } });
  applyBurn(target, 4, actor);
  const legal = [STRIKE, getVerse('wither_note'), getVerse('conflagration')];
  const r = chooseVerseByDoctrine({ ...actor, sheet: { ...actor.sheet, doctrine: 'cantors_hand' } }, target, {}, countingMeasure(), T, () => legal);
  assert.strictEqual(r.verse.id, 'conflagration');
});

test('T5.5 Cantor\u2019s Hand: a Cleanse answers the debuffs the opponent applied', () => {
  const actor = fighter({ sheet: { stats: { vig: 6, mig: 8, wit: 9, grd: 4, hst: 7 }, mainStat: 'wit', damageType: 'ember', doctrine: 'cantors_hand' } });
  applyBleed(actor, 3, 9);
  applyTimed(actor, 'curse', 2);
  const target = fighter({ side: 'b', sheet: { stats: { vig: 9, mig: 5, wit: 2, grd: 8, hst: 3 }, mainStat: 'mig', damageType: 'steel' } });
  const legal = [STRIKE, getVerse('spark'), getVerse('purify')];
  const r = chooseVerseByDoctrine(actor, target, {}, countingMeasure(), T, () => legal);
  assert.strictEqual(r.verse.id, 'purify');
});

test('T5.5 Cantor\u2019s Hand: a clean board → Hymnal order (the blend\u2019s base)', () => {
  const actor = fighter();
  const target = fighter({ side: 'b', sheet: { stats: { vig: 9, mig: 5, wit: 2, grd: 8, hst: 3 }, mainStat: 'mig', damageType: 'steel' } });
  const legal = [STRIKE, getVerse('tolling_bell'), getVerse('conflagration')];
  const r = chooseVerseByDoctrine({ ...actor, sheet: { ...actor.sheet, doctrine: 'cantors_hand' } }, target, {}, countingMeasure(), T, () => legal);
  assert.strictEqual(r.verse.id, 'tolling_bell');
  assert.strictEqual(r.doctrine, 'cantors_hand');
});

// ------------------------------------------------- shared rules + honesty
test('T5.5: every doctrine completes against a trapping-Proxy target — no hidden reads', () => {
  // The boundary (visibleOf/defenseConstant) may read the defender's public
  // math inputs — hp/maxHp/resolve/statuses/riteState/flags/mods and the
  // sheet's stats+items (for the published mitigation cap). Everything ELSE
  // on the raw defender — verses, vow, doctrine identity, specials, rites —
  // must never be read by the decision layer. Allow-list Proxy: any other
  // key throws.
  const SHEET_VISIBLE = ['stats', 'items'];
  const TOP_VISIBLE = ['hp', 'maxHp', 'resolve', 'statuses', 'riteState', 'flags', 'mods', 'sheet', 'side'];
  const mk = () => {
    const base = fighter({ side: 'b', sheet: { stats: { vig: 9, mig: 5, wit: 2, grd: 8, hst: 3 }, mainStat: 'mig', damageType: 'steel', verses: ['rend'], vow: 'duelist', items: [], doctrine: 'predator', special: { x: 1 } } });
    const sheet = new Proxy(base.sheet, {
      get(t, k) {
        if (!SHEET_VISIBLE.includes(k)) throw new Error(`hidden read: ${String(k)}`);
        return Reflect.get(t, k);
      },
    });
    return new Proxy(base, {
      get(t, k) {
        if (k === 'sheet') return sheet;
        if (!TOP_VISIBLE.includes(k)) throw new Error(`hidden read: ${String(k)}`);
        return Reflect.get(t, k);
      },
    });
  };
  const target = mk();
  applyBleed(target, 3, 9);
  const legal = [STRIKE, getVerse('spark'), getVerse('reap_the_red'), getVerse('steady_breath'), getVerse('purify')];
  for (const doctrine of ['hymnal', 'predator', 'bulwark', 'cantors_hand']) {
    const actor = fighter({ sheet: { stats: { vig: 6, mig: 8, wit: 9, grd: 4, hst: 7 }, mainStat: 'wit', damageType: 'ember', doctrine } });
    const r = chooseVerseByDoctrine(actor, target, {}, countingMeasure(), T, () => legal);
    assert.ok(r.verse, `${doctrine} picked without touching hidden keys`);
  }
});

test('T5.5: decisive boards consume ZERO Measure draws under every doctrine (Ban 6)', () => {
  const target = fighter({ side: 'b', sheet: { stats: { vig: 9, mig: 5, wit: 2, grd: 8, hst: 3 }, mainStat: 'mig', damageType: 'steel' } });
  const legal = [STRIKE, getVerse('spark'), getVerse('steady_breath'), getVerse('reap_the_red')];
  for (const doctrine of ['hymnal', 'predator', 'bulwark', 'cantors_hand']) {
    const actor = fighter({ sheet: { stats: { vig: 6, mig: 8, wit: 9, grd: 4, hst: 7 }, mainStat: 'wit', damageType: 'ember', doctrine } });
    const m = countingMeasure();
    chooseVerseByDoctrine(actor, target, {}, m, T, () => legal);
    assert.strictEqual(m.draws, 0, `${doctrine}: a decisive board draws nothing`);
  }
});

test('T5.5: the punish component is exactly the status-scaling delta (stripped-vis identity)', () => {
  const actor = fighter({ sheet: { stats: { vig: 6, mig: 14, wit: 9, grd: 4, hst: 7 }, mainStat: 'mig', damageType: 'steel' } });
  const target = fighter({ side: 'b', sheet: { stats: { vig: 9, mig: 5, wit: 2, grd: 8, hst: 3 }, mainStat: 'mig', damageType: 'steel' } });
  // no statuses → stripping changes nothing → every punish score is 0
  const legal = [STRIKE, getVerse('reap_the_red'), getVerse('conflagration'), getVerse('purify')];
  for (const v of legal) {
    assert.strictEqual(punishScore(actor, visibleOf(target, T), v, T, 1.0), 0, `${v.id} punishes nothing on a clean board`);
  }
  // the strip keeps the defensive chips and drops the six debuff keys
  applyWard(target, 9, 3);
  applyBleed(target, 2, 8);
  applyBurn(target, 3, actor);
  applyTimed(target, 'curse', 2);
  const stripped = strippedVis(visibleOf(target, T));
  assert.ok(stripped.statuses.ward, 'ward survives the strip (defense shape identical)');
  assert.ok(!stripped.statuses.bleed && !stripped.statuses.burn && !stripped.statuses.curse);
  assert.ok(punishScore(actor, visibleOf(target, T), getVerse('reap_the_red'), T, 1.0) > 0, 'bleed feeds the reap');
  assert.strictEqual(punishScore(actor, visibleOf(target, T), getVerse('conflagration'), T, 1.0) > 0, true, 'burn feeds the blast');
});

// ------------------------------------------------- wiring: floor Echoes
test('T5.5: buildOf stamps the row\u2019s doctrine onto the build (Floor wiring)', () => {
  assert.strictEqual(FLOOR_POPULATION.length, 12);
  for (const e of FLOOR_POPULATION) {
    const b = buildOf(e);
    assert.strictEqual(b.doctrine, e.doctrine, `${e.id}: doctrine rides the build`);
    const sheet = buildSheet(b, T);
    assert.strictEqual(sheet.doctrine, e.doctrine, `${e.id}: doctrine rides the sheet`);
  }
  assert.strictEqual(ECHO_BY_ID.get('chorister_vey').doctrine, 'cantors_hand',
    'the reserved doctrine lives on its canon row');
});

test('T5.5: a doctrine\u2019d sheet fights end-to-end and completes deterministically', () => {
  const A = { ...standardBuild('cinder_witch', 3, T), doctrine: 'bulwark' };
  const B = standardBuild('hollow_cantor', 3, T);
  const r1 = runFight(structuredClone(A), structuredClone(B), { seed: 7000, tuning: T });
  const r2 = runFight(structuredClone(A), structuredClone(B), { seed: 7000, tuning: T });
  assert.ok(r1.over);
  assert.strictEqual(r1.winner, r2.winner);
  assert.strictEqual(r1.rounds, r2.rounds);
  assert.strictEqual(JSON.stringify(r1.hp), JSON.stringify(r2.hp));
});

// --------------------------------------------- harness comparison report
test('T5.5: the harness comparison reports per-doctrine win rates with a measurable spread', () => {
  const A = standardBuild('cinder_witch', 3, T);
  const B = standardBuild('hollow_cantor', 3, T);
  const seeds = Array.from({ length: 24 }, (_, i) => 7000 + i * 3);
  const r1 = compareDoctrines(A, B, seeds);
  assert.strictEqual(r1.rows.length, 4);
  for (const row of r1.rows) assert.strictEqual(row.seeds, 24);
  // behavioral golden (deterministic): hymnal 22, predator 22, bulwark 12,
  // cantors_hand 24 — the doctrines ARE distinguishable on this matchup.
  const byId = Object.fromEntries(r1.rows.map((x) => [x.doctrine, x.wins]));
  assert.deepStrictEqual(byId, { hymnal: 22, predator: 22, bulwark: 12, cantors_hand: 24 });
  assert.ok(r1.spread > 0);
  assert.strictEqual(r1.best.doctrine, 'cantors_hand');
  // determinism: the same inputs re-run to the identical table
  const r2 = compareDoctrines(A, B, seeds);
  assert.strictEqual(JSON.stringify(r1.rows.map((x) => x.wins)), JSON.stringify(r2.rows.map((x) => x.wins)));
});
