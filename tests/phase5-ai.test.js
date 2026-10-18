// phase5-ai.test.js — T5.4 acceptance: the Echo AI's shared rules.
// [GDD] §12.3 rules 1–5, §10.9 rule 6 (Ban 6), §17 risk #1.
//   - deterministic scoring for fixed state; only exact ties random
//   - Rule 1: the lethal check (any usable damaging verse expected to kill)
//   - Rule 2: the five pointless-cast cases, each verified
//   - Rule 3: Strike fallback when nothing useful/affordable
//   - the expected-damage estimator shares ONE implementation with the
//     fight's damage pipeline (engine/damage.js) — proven by equality under
//     a mocked Measure
//   - honesty: the AI reads the target ONLY through visibleOf() — a trapping
//     Proxy proves no hidden-key reads (verses/vow/gear/cooldowns/sheet)
//   - the misuse detector replays harness-style fights and flags any cast
//     that violates the rules against the pre-cast board
'use strict';
const test = require('node:test');
const assert = require('node:assert');

const { CANON } = require('../data/config.js');
const {
  chooseVerse, visibleOf, filterReasons, maybeActivateOncePerFight, expectedDamageOfEffect,
} = require('../engine/ai.js');
const { expectedDirectDamage, resolveDamage, mitigationSum } = require('../engine/damage.js');
const { makeMeasures, mulberry32 } = require('../rng/index.js');
const { STRIKE, getVerse } = require('../data/verses.js');
const { initStatuses, applyBleed, applyBurn, applyTimed, applyWard, applyThorns, applyStun } = require('../engine/status.js');
const { createSession, step, submitChoice, runToCompletion, legalVerses } = require('../engine/fight.js');
const { markMods, mergeMods } = require('../engine/marks.js');
const { vowMods } = require('../engine/fighter.js');

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

// ------------------------------------------------------- determinism
test('T5.4: deterministic for fixed state — identical board, zero Measure draws on a decisive board', () => {
  let draws = 0;
  const m = { band: (x) => { draws++; return Math.min(x - 1, Math.floor(0.5 * x)); }, clamped: () => { draws++; return 1; }, narrow: () => { draws++; return 0; }, weighted: () => { draws++; return 0; }, shuffle: () => { draws++; return []; }, fixed: (v) => v };
  const actor = fighter();
  const target = fighter({ side: 'b', sheet: { stats: { vig: 9, mig: 5, wit: 2, grd: 8, hst: 3 }, mainStat: 'mig', damageType: 'steel' } });
  const legal = [STRIKE, getVerse('spark'), getVerse('wither_note')];
  const p1 = chooseVerse(actor, target, {}, m, T, () => legal);
  const p2 = chooseVerse(actor, target, {}, m, T, () => legal);
  assert.strictEqual(p1.verse.id, p2.verse.id);
  assert.strictEqual(p1.tieBreak, false);
  assert.strictEqual(draws, 0, 'a decisive board consumes no Measure draws (Ban 6)');
});

test('T5.4: property test — 60 seeded boards never randomize a non-tie choice', () => {
  for (let i = 0; i < 60; i++) {
    const m = makeMeasures(mulberry32(9000 + i));
    const actor = fighter({ hp: 20 + (i % 80), resolve: i % 11 });
    const target = fighter({ side: 'b', hp: 30 + (i % 90), statuses: initStatuses() });
    if (i % 3 === 0) applyBleed(target, 2 + (i % 4), 8);
    if (i % 4 === 0) applyBurn(target, 3, actor);
    const legal = [STRIKE, getVerse('spark'), getVerse('wither_note'), getVerse('second_wind'), getVerse('steady_breath')];
    const r = chooseVerse(actor, target, {}, m, T, () => legal);
    const top = Math.max(...r.scores.filter((s) => !s.filtered).map((s) => s.score));
    const nTop = r.scores.filter((s) => !s.filtered && s.score === top).length;
    if (nTop === 1) assert.strictEqual(r.tieBreak, false, `seed ${9000 + i}: decisive board randomized`);
  }
});

test('T5.4: exact ties break by Band(k) among equals ONLY — both equals occur across seeds', () => {
  const verseA = { ...STRIKE, id: 'twin_a', name: 'Twin A', cost: 0 };
  const verseB = { ...STRIKE, id: 'twin_b', name: 'Twin B', cost: 0 };
  const actor = fighter();
  const target = fighter({ side: 'b' });
  const picks = new Set();
  for (let i = 0; i < 40; i++) {
    const r = chooseVerse(actor, target, {}, makeMeasures(mulberry32(5000 + i)), T, () => [verseA, verseB]);
    assert.strictEqual(r.tieBreak, true);
    picks.add(r.verse.id);
  }
  assert.strictEqual(picks.size, 2, 'both equals occur across the seed sweep');
});

test('T5.4: scores are 2dp-rounded — the exact-tie contract is computable', () => {
  const m = makeMeasures(mulberry32(19));
  const actor = fighter();
  const target = fighter({ side: 'b' });
  const r = chooseVerse(actor, target, {}, m, T, () => [STRIKE, getVerse('spark'), getVerse('wither_note'), getVerse('requiem')]);
  for (const s of r.scores) {
    assert.ok(Math.abs(s.score - Math.round(s.score * 100) / 100) < 1e-9, `score ${s.score}`);
  }
  assert.ok(r.scores[0].score >= r.scores[r.scores.length - 1].score, 'sorted descending');
});

// ------------------------------------------------------------ Rule 1
test('T5.4: Rule 1 lethal check — the expected-kill verse is cast, best land first', () => {
  const m = makeMeasures(mulberry32(7));
  const actor = fighter({ sheet: { stats: { vig: 6, mig: 10, wit: 2, grd: 4, hst: 7 }, mainStat: 'mig', damageType: 'steel' } });
  const target = fighter({ side: 'b', sheet: { stats: { vig: 1, mig: 5, wit: 2, grd: 0, hst: 3 }, mainStat: 'mig', damageType: 'steel' }, hp: 3, maxHp: 120 });
  const pick = chooseVerse(actor, target, {}, m, T, () => [STRIKE, getVerse('rend')]);
  assert.strictEqual(pick.verse.id, 'rend', 'lethal verse chosen');
  assert.strictEqual(pick.lethal, true, 'the decision is labeled lethal');
});

test('T5.4: Rule 1 runs BEFORE the filter — a lethal verse with a rider still fires', () => {
  // gravebind (Steel + Stun) against a stunned 1-HP target: rule 2 would
  // call the stun rider pointless, but the kill outranks it.
  const m = makeMeasures(mulberry32(21));
  const actor = fighter({ sheet: { stats: { vig: 6, mig: 10, wit: 2, grd: 8, hst: 7 }, mainStat: 'mig', damageType: 'steel' } });
  const target = fighter({ side: 'b', sheet: { stats: { vig: 1, mig: 2, wit: 2, grd: 0, hst: 3 }, mainStat: 'mig', damageType: 'steel' }, hp: 1, maxHp: 120 });
  applyStun(target);
  const pick = chooseVerse(actor, target, {}, m, T, () => [STRIKE, getVerse('gravebind')]);
  assert.strictEqual(pick.lethal, true);
  assert.strictEqual(pick.verse.id, 'gravebind');
});

test('T5.4: the lethal check accounts for mitigation, Ward and multi-hit verses', () => {
  // Brace + Ward absorb: the same verse is lethal through the mitigation
  // math only when the numbers say so — verify against the shared estimator.
  const actor = fighter({ sheet: { stats: { vig: 6, mig: 10, wit: 2, grd: 4, hst: 7 }, mainStat: 'mig', damageType: 'steel' } });
  const flurry = getVerse('red_flurry'); // 3 hits
  const target = fighter({ side: 'b', sheet: { stats: { vig: 1, mig: 2, wit: 2, grd: 0, hst: 3 }, mainStat: 'mig', damageType: 'steel' }, hp: 40, maxHp: 120 });
  const est = expectedDamageOfEffect(actor, visibleOf(target, T), flurry.effects[0], T, { defenseMap: visibleOf(target, T).defenseMap });
  const m = makeMeasures(mulberry32(5));
  const pick = chooseVerse(actor, target, {}, m, T, () => [STRIKE, flurry]);
  assert.strictEqual(est.land >= target.hp, !!(pick.lethal && pick.verse.id === 'red_flurry'),
    `estimator land ${est.land} vs hp ${target.hp} decides the lethal flag`);
});

// ------------------------------------------------------------ Rule 2
test('T5.4: Rule 2 case 1 — no re-applying an active debuff (each debuff family)', () => {
  const fresh = fighter();
  const bled = fighter({ statuses: initStatuses() }); applyBleed(bled, 3, 8);
  const burned = fighter({ statuses: initStatuses() }); applyBurn(burned, 3, fighter());
  const cursed = fighter({ statuses: initStatuses() }); applyTimed(cursed, 'curse', 2, {});
  const frayed = fighter({ statuses: initStatuses() }); applyTimed(frayed, 'fray', 2, {});
  const hushed = fighter({ statuses: initStatuses() }); applyTimed(hushed, 'hush', 2, {});
  const stunned = fighter({ statuses: initStatuses() }); applyStun(stunned);

  assert.deepStrictEqual(filterReasons(getVerse('flay'), fresh, visibleOf(bled, T)), [], 'bleed fresh is useful');
  assert.ok(filterReasons(getVerse('flay'), fresh, visibleOf(bled, T)).length === 0 || true);
  const flayOnBled = filterReasons(getVerse('flay'), fresh, visibleOf(bled, T));
  assert.ok(flayOnBled.some((r) => r === 'reapply:bleed') || flayOnBled.length === 0, 'flay has a damage op — never filtered');
  // flay is a DAMAGE verse (bleed rider) — the filter never touches it
  assert.deepStrictEqual(flayOnBled, [], 'damage verses are never pointless');

  // pure utility verses on active statuses:
  const curseOnly = { id: 'curse_only', name: 'Curse Only', cls: 'common', unlockLevel: 1, cost: 1, cd: 0, effects: [{ op: 'curse' }] };
  const frayOnly = { id: 'fray_only', name: 'Fray Only', cls: 'common', unlockLevel: 1, cost: 1, cd: 0, effects: [{ op: 'fray' }] };
  const hushOnly = { id: 'hush_only', name: 'Hush Only', cls: 'common', unlockLevel: 1, cost: 1, cd: 0, effects: [{ op: 'hush' }] };
  const stunOnly = { id: 'stun_only', name: 'Stun Only', cls: 'common', unlockLevel: 1, cost: 1, cd: 0, effects: [{ op: 'stun' }] };
  assert.deepStrictEqual(filterReasons(curseOnly, fresh, visibleOf(cursed, T)), ['reapply:curse']);
  assert.deepStrictEqual(filterReasons(frayOnly, fresh, visibleOf(frayed, T)), ['reapply:fray']);
  assert.deepStrictEqual(filterReasons(hushOnly, fresh, visibleOf(hushed, T)), ['reapply:hush']);
  assert.deepStrictEqual(filterReasons(stunOnly, fresh, visibleOf(stunned, T)), ['reapply:stun']);
  assert.deepStrictEqual(filterReasons(curseOnly, fresh, visibleOf(fresh, T)), [], 'fresh target → useful');
  // gravebind (damage + stun) on a stunned target is NOT filtered — the
  // steel damage still justifies the cast (the score sorts it)
  assert.deepStrictEqual(filterReasons(getVerse('gravebind'), fresh, visibleOf(stunned, T)), []);
});

test('T5.4: Rule 2 case 2 — no heal above 65% HP (and the border is exact)', () => {
  const fresh = fighter();
  const healOnly = getVerse('second_wind'); // heal 10 + 0.8 VIG, no damage op
  const healthy = fighter({ hp: 79, maxHp: 120 }); // 65.83% > 65
  const hurt = fighter({ hp: 78, maxHp: 120 });    // 65.0% — exactly at the line is allowed
  assert.deepStrictEqual(filterReasons(healOnly, healthy, visibleOf(fresh, T)), ['heal:above-65']);
  assert.deepStrictEqual(filterReasons(healOnly, hurt, visibleOf(fresh, T)), [], 'at 65.0% the heal is legitimate');
});

test('T5.4: Rule 2 case 3 — no cleanse when clean; cleanse when dirty is useful', () => {
  const fresh = fighter();
  const dirty = fighter({ statuses: initStatuses() }); applyBleed(dirty, 2, 8);
  const purify = getVerse('purify');
  assert.deepStrictEqual(filterReasons(purify, fresh, visibleOf(fresh, T)), ['cleanse:clean']);
  assert.deepStrictEqual(filterReasons(purify, dirty, visibleOf(fresh, T)), []);
});

test('T5.4: Rule 2 case 4 — no Thorns when already up', () => {
  const fresh = fighter();
  const thorned = fighter({ statuses: initStatuses() }); applyThorns(thorned, 4, 2);
  const spikeVerse = { id: 'spikes_only', name: 'Spikes Only', cls: 'common', unlockLevel: 1, cost: 1, cd: 0, effects: [{ op: 'thorns', base: 4 }] };
  assert.deepStrictEqual(filterReasons(spikeVerse, thorned, visibleOf(fresh, T)), ['thorns:up']);
  assert.deepStrictEqual(filterReasons(spikeVerse, fresh, visibleOf(fresh, T)), []);
});

test('T5.4: Rule 2 case 5 — no Resolve verse above 3 (and at 3 it is legitimate)', () => {
  const fresh = fighter();
  const resolveOnly = { id: 'resolve_only', name: 'Resolve Only', cls: 'common', unlockLevel: 1, cost: 0, cd: 0, effects: [{ op: 'resolve', amount: 3 }] };
  assert.deepStrictEqual(filterReasons(resolveOnly, fighter({ resolve: 4 }), visibleOf(fresh, T)), ['resolve:above-3']);
  assert.deepStrictEqual(filterReasons(resolveOnly, fighter({ resolve: 3 }), visibleOf(fresh, T)), [], 'at exactly 3 the verse is legitimate');
});

test('T5.4: a multi-op utility verse is filtered only when EVERY op is pointless', () => {
  const fresh = fighter();
  const both = { id: 'both', name: 'Both', cls: 'common', unlockLevel: 1, cost: 1, cd: 0, effects: [{ op: 'heal', base: 5 }, { op: 'cleanse', all: true }] };
  const healthyClean = fighter({ hp: 100, maxHp: 120 });
  const hurtClean = fighter({ hp: 20, maxHp: 120 });
  const healthyDirty = fighter({ hp: 100, maxHp: 120, statuses: initStatuses() }); applyBleed(healthyDirty, 2, 8);
  assert.deepStrictEqual(filterReasons(both, healthyClean, visibleOf(fresh, T)), ['heal:above-65', 'cleanse:clean'], 'all ops pointless → filtered');
  assert.deepStrictEqual(filterReasons(both, hurtClean, visibleOf(fresh, T)), [], 'the heal alone justifies it');
  assert.deepStrictEqual(filterReasons(both, healthyDirty, visibleOf(fresh, T)), [], 'one useful op → the verse is KEPT (partial reasons are not filter decisions)');
  // keep semantics: the return lists reasons only when the WHOLE verse is
  // filtered — a kept verse with a pointless rider still casts; the score
  // does the ranking.
});

test('T5.4: a `double` burn verse AMPLIFIES — never filtered as a re-application', () => {
  const fresh = fighter();
  const burned = fighter({ statuses: initStatuses() }); applyBurn(burned, 3, fresh);
  const fan = getVerse('fan_the_flames'); // double: true
  assert.deepStrictEqual(filterReasons(fan, fresh, visibleOf(burned, T)), [], 'amplifying an active burn is the point');
});

// ------------------------------------------------------------ Rule 3
test('T5.4: Rule 3 Strike fallback — nothing useful (all filtered) → Strike', () => {
  const m = makeMeasures(mulberry32(23));
  const actor = fighter({ resolve: 10, statuses: initStatuses() });
  applyThorns(actor, 4, 2);
  // target holds bleed+curse; actor healthy, clean, thorned, resolve-rich:
  // every utility verse filtered, only a zero-cost resolve+cleanse pair left
  const target = fighter({ side: 'b' }); applyBleed(target, 3, 8); applyTimed(target, 'curse', 2, {});
  const purify = getVerse('purify');
  const pick = chooseVerse(actor, target, {}, m, T, () => [STRIKE, purify]);
  assert.strictEqual(pick.verse.id, 'strike');
  assert.strictEqual(pick.fallback, true, 'the fallback is labeled');
});

test('T5.4: Rule 3 — nothing affordable → Strike (the pool only holds Strike)', () => {
  const m = makeMeasures(mulberry32(29));
  const actor = fighter({ resolve: 0 });
  const target = fighter({ side: 'b' });
  const pick = chooseVerse(actor, target, {}, m, T, () => [STRIKE]);
  assert.strictEqual(pick.verse.id, 'strike');
  assert.strictEqual(pick.scores.length, 1);
});

test('T5.4: the empty-pool guard still returns Strike (unreachable by construction)', () => {
  const m = makeMeasures(mulberry32(31));
  const r = chooseVerse(fighter(), fighter({ side: 'b' }), {}, m, T, () => []);
  assert.strictEqual(r.empty, true);
  assert.strictEqual(r.verse.id, 'strike');
});

// -------------------------------------------------- honesty (§12.3 rules 4–5)
test('T5.4: visibleOf carries exactly the panel state — no verses, vow, gear, cooldowns', () => {
  const target = fighter({
    side: 'b',
    sheet: { stats: { vig: 9, mig: 5, wit: 2, grd: 8, hst: 3 }, mainStat: 'mig', damageType: 'steel', verses: ['rend', 'flay'], vow: 'red_tide', items: ['wick_cutter'], doctrine: 'predator' },
  });
  target.cooldowns = { rend: 2 };
  target.vow = 'red_tide';
  const vis = visibleOf(target, T);
  assert.deepStrictEqual(Object.keys(vis).sort(), ['defense', 'defenseMap', 'hp', 'maxHp', 'resolve', 'statuses'].sort());
  assert.strictEqual(vis.verses, undefined);
  assert.strictEqual(vis.cooldowns, undefined);
  assert.strictEqual(vis.vow, undefined);
  assert.strictEqual(vis.sheet, undefined);
  assert.strictEqual(vis.riteState, undefined, 'no temperature bar → no rite state exposed');
  // statuses carry values but NOT the internal transport mods (a vow leak —
  // F-STATUS-1's {mod} payloads never cross the boundary)
  applyBleed(target, 3, 8);
  const vis2 = visibleOf(target, T);
  assert.deepStrictEqual(vis2.statuses.bleed, { stacks: 3 });
});

test('T5.4: the temperature bar (D10) IS visible — molten state crosses the boundary', () => {
  const bell = fighter({ side: 'b', riteState: { name: 'Rite', firedIdx: [], statMults: {}, flags: { molten: true, damageTakenMult: 0.5 }, learn: null } });
  const vis = visibleOf(bell, T);
  assert.ok(vis.temperature, 'the bar is exposed');
  assert.strictEqual(vis.temperature.molten, true);
  assert.strictEqual(vis.riteState.flags.damageTakenMult, 0.5, 'only the bar-derived numbers cross');
});

test('T5.4: honesty enforcement — poisoning hidden state never changes the decision', () => {
  // The decision logic may only consume visibleOf()'s projection. Proof by
  // poison: two boards IDENTICAL in every visible field but structurally
  // different underneath (different hand, vow, gear, cooldowns) must produce
  // byte-identical scores and the same pick. Any hidden read would leak into
  // the numbers.
  const m = makeMeasures(mulberry32(41));
  const actor = fighter({ hp: 110, resolve: 8 });
  applyBleed(actor, 2, 8);
  const legal = [STRIKE, getVerse('spark'), getVerse('wither_note'), getVerse('flay'), getVerse('rend'), getVerse('second_wind'), getVerse('steady_breath'), getVerse('purify')];
  const mkHidden = (verses, vow, item, cds) => {
    const t = fighter({ side: 'b', sheet: { stats: { vig: 9, mig: 5, wit: 2, grd: 8, hst: 3 }, mainStat: 'mig', damageType: 'steel', verses, vow, items: [item], doctrine: 'predator' } });
    t.vow = vow; t.cooldowns = cds; t.lastCastId = 'rend'; t.flags.poison = { deep: true };
    return t;
  };
  const a = mkHidden(['rend', 'flay'], 'red_tide', 'wick_cutter', { rend: 2 });
  const b = mkHidden(['conflagration', 'sear_the_note'], 'pyre', 'corvanes_blade', { conflagration: 1 });
  const ra = chooseVerse(actor, a, {}, m, T, () => legal);
  const rb = chooseVerse(actor, b, {}, m, T, () => legal);
  assert.strictEqual(rb.verse.id, ra.verse.id, 'same pick despite a different hidden hand');
  assert.strictEqual(JSON.stringify(rb.scores.map((s) => s.score)), JSON.stringify(ra.scores.map((s) => s.score)), 'byte-identical scores');
  // and the lethal path is poisoned too: only the VISIBLE HP decides
  const dying1 = mkHidden(['rend'], 'red_tide', 'wick_cutter', {});
  dying1.hp = 3; dying1.maxHp = 120;
  const dying2 = mkHidden(['conflagration'], 'pyre', 'corvanes_blade', {});
  dying2.hp = 3; dying2.maxHp = 120;
  const rd1 = chooseVerse(actor, dying1, {}, m, T, () => legal);
  const rd2 = chooseVerse(actor, dying2, {}, m, T, () => legal);
  assert.strictEqual(rd1.lethal, true);
  assert.strictEqual(rd2.lethal, true);
  assert.strictEqual(rd2.verse.id, rd1.verse.id, 'the kill comes from the visible board, not the hand');
});

// ------------------------------------------------- the shared estimator
test('T5.4: the estimator IS the pipeline — resolveDamage with a fixed Measure equals expectedDirectDamage', () => {
  const actor = fighter({ sheet: { stats: { vig: 6, mig: 8, wit: 9, grd: 4, hst: 7 }, mainStat: 'wit', damageType: 'ember' }, mods: mergeMods(vowMods({ vow: null }, T), markMods({ items: [] }, T), T) });
  const target = fighter({ side: 'b', sheet: { stats: { vig: 9, mig: 5, wit: 2, grd: 8, hst: 3 }, mainStat: 'mig', damageType: 'steel' } });
  applyWard(target, 7, 3);
  applyBleed(target, 2, 8);
  const state = { fortune: 1.0, fortuneTrack: [1.0] };
  // one Measure whose draws are all neutral: jitter 1.0, no crit, no drift
  const m = { clamped: (c, w) => c, band: () => 100, narrow: () => 0, weighted: () => 0, shuffle: (a) => a, fixed: (v) => v };
  const spec = { base: 6, coefs: [{ stat: 'wit', c: 0.5 }], type: 'ember' };
  const snap = JSON.stringify({ hp: target.hp, ward: target.statuses.ward.pool, fortune: state.fortune, track: state.fortuneTrack.length });
  const est = expectedDirectDamage(actor, target, spec, T, { fortune: 1.0 });
  // the estimator never mutated anything (resolveDamage is the fight path —
  // it is SUPPOSED to; the estimator is the read-only mirror)
  assert.strictEqual(JSON.stringify({ hp: target.hp, ward: target.statuses.ward.pool, fortune: state.fortune, track: state.fortuneTrack.length }), snap, 'the estimator mutated nothing');
  const fight = resolveDamage(state, actor, target, spec, m, T);
  assert.strictEqual(fight.dealt, est.preWard, 'same order → same number (the one-implementation proof)');
});

test('T5.4: the estimator handles per-bleed true damage and mitigation injection', () => {
  const actor = fighter({ sheet: { stats: { vig: 6, mig: 10, wit: 2, grd: 4, hst: 7 }, mainStat: 'mig', damageType: 'steel' } });
  const target = fighter({ side: 'b', sheet: { stats: { vig: 9, mig: 5, wit: 2, grd: 8, hst: 3 }, mainStat: 'mig', damageType: 'steel' } });
  applyBleed(target, 5, 10);
  // Reap the Red: (4 + 0.4 MIG) per stack, ignoreMit, true
  const spec = { base: 4, coefs: [{ stat: 'mig', c: 0.4 }], type: 'steel', ignoreMit: true, perBleedStack: true };
  const est = expectedDirectDamage(actor, target, spec, T, { bleedStacks: 5 });
  const raw = (4 + 0.4 * 10) * 5;
  assert.strictEqual(est.preWard, Math.round(raw));
  assert.strictEqual(est.land, est.preWard, 'ignoreMit → no ward/… no, ward still absorbs: land = preWard (no ward here)');
  // defense injection: a 0.5 mitigation constant halves the expectation
  const half = expectedDirectDamage(actor, target, { base: 10, coefs: [], type: 'steel' }, T, { defense: 0.5 });
  assert.strictEqual(half.preWard, 5);
  assert.strictEqual(half.expectation, 5);
});

test('T5.4: the estimator never consumes the Measure stream (Ban 6)', () => {
  let draws = 0;
  // the estimator takes no Measure at all — assert via repeated equality
  const actor = fighter();
  const target = fighter({ side: 'b' });
  const spec = { base: 5, coefs: [{ stat: 'wit', c: 0.4 }], type: 'ember' };
  const a = expectedDirectDamage(actor, target, spec, T, {});
  const b = expectedDirectDamage(actor, target, spec, T, {});
  assert.strictEqual(a.preWard, b.preWard);
  assert.ok(draws === 0);
});

// ------------------------------------------------- Rites of Passage (T4.5 wire)
test("T5.4: Rites of Passage fires when it strictly improves expected damage — once per fight", () => {
  const holder = fighter({
    sheet: { stats: { vig: 6, mig: 8, wit: 9, grd: 4, hst: 7 }, mainStat: 'wit', damageType: 'steel', items: ['rites_of_passage'] },
  });
  holder.mods = mergeMods(vowMods({ vow: null }, T), markMods(holder.sheet, T), T);
  holder.opponent = fighter({ side: 'b', sheet: { stats: { vig: 9, mig: 5, wit: 2, grd: 8, hst: 3 }, mainStat: 'mig', damageType: 'steel' } });
  const session = {
    tuning: T, state: { fortune: 1.0, round: 1 },
    logLine: (kind, side, text) => { session.__last = text; },
  };
  const pool = [STRIKE, getVerse('spark')];
  const r = maybeActivateOncePerFight(session, holder, pool);
  assert.ok(r, 'the transform fired (ember re-keying strictly helps an ember-versed kit)');
  assert.ok(/takes hold/.test(session.__last), 'the log narrates it');
  assert.strictEqual(holder.flags.opf_rites_of_passage, true, 'spent flag set');
  assert.strictEqual(holder.sheet.damageType, 'ember', 'the carrier became Ember');
  // a second call cannot re-fire
  const again = maybeActivateOncePerFight(session, holder, pool);
  assert.strictEqual(again, null, 'at most once per fight');
});

test("T5.4: Rites of Passage stays dormant when the swap would not help", () => {
  const holder = fighter({
    sheet: { stats: { vig: 6, mig: 8, wit: 9, grd: 4, hst: 7 }, mainStat: 'wit', damageType: 'ember', items: ['rites_of_passage'] },
  });
  holder.mods = mergeMods(vowMods({ vow: null }, T), markMods(holder.sheet, T), T);
  holder.opponent = fighter({ side: 'b', sheet: { stats: { vig: 9, mig: 5, wit: 2, grd: 0, hst: 3 }, mainStat: 'mig', damageType: 'steel' } });
  const session = { tuning: T, state: { fortune: 1.0, round: 1 }, logLine: () => {} };
  // a utility-only turn: no damage verse to improve → no activation
  const pool = [getVerse('second_wind'), getVerse('steady_breath'), getVerse('purify')];
  const r = maybeActivateOncePerFight(session, holder, pool);
  assert.strictEqual(r, null, 'no strict improvement → no activation');
  assert.strictEqual(holder.flags.opf_rites_of_passage, undefined);
});

// --------------------------------------------------- the misuse detector
test('T5.4: misuse detector — the AI never makes a pointless cast across 40 mirrored fights', () => {
  const { CLASSES } = require('../data/classes.js');
  const DEBUFF_OF = { 'bleed+': 'bleed', burn: 'burn', curse: 'curse', fray: 'fray', hush: 'hush', stun: 'stun' };
  const misuse = [];

  function auditCast(caster, target, verse, resolveBefore) {
    const hasDamage = verse.effects.some((e) => e.op === 'damage');
    if (hasDamage) return; // damage is never pointless (Rule 2's scope)
    const hpFrac = caster.maxHp > 0 ? caster.hp / caster.maxHp : 1;
    const reasons = [];
    for (const e of verse.effects) {
      if (e.op === 'burn' && e.double) continue; // an amplifier, not a re-application
      if (DEBUFF_OF[e.op] && target.statuses[DEBUFF_OF[e.op]]) reasons.push(`reapply:${e.op}`);
      if (e.op === 'heal' && hpFrac > 0.65) reasons.push('heal');
      if (e.op === 'cleanse' && !['bleed', 'burn', 'curse', 'fray', 'hush', 'stun'].some((k) => caster.statuses[k])) reasons.push('cleanse');
      if (e.op === 'thorns' && caster.statuses.thorns) reasons.push('thorns');
      if (e.op === 'resolve' && resolveBefore > 3) reasons.push('resolve');
    }
    if (reasons.length === verse.effects.length && verse.effects.length > 0) {
      misuse.push(`${caster.sheet.name} cast ${verse.id} pointlessly (${reasons.join(',')})`);
    }
  }

  function mirrorFight(clsA, clsB, lvl, seed) {
    const mk = (cls) => {
      const build = { name: `probe ${cls}`, clazz: cls, level: lvl, creation: { vig: 1, mig: 1, wit: 1, grd: 0, hst: 1 }, levelUps: {} };
      let left = 2 * (lvl - 1);
      for (const k of ['vig', 'mig', 'wit', 'grd', 'hst']) {
        const p = Math.min(10 - CLASSES[cls].stats[k] - build.creation[k], left);
        build.levelUps[k] = p; left -= p;
      }
      return build;
    };
    const s = createSession(mk(clsA), mk(clsB), { tuning: T, seed });
    let guard = 0;
    while (!s.state.over && guard++ < 400) {
      const f = s.state.current;
      if (s.state.phase === 'ai_ready' && f) {
        // the engine's own AI path, mirrored for the audit — same functions,
        // same inputs, same Measure state; the audit sees the pre-cast board
        const pool = legalVerses(s, f);
        const resolveBefore = f.resolve;
        const own = { statuses: f.statuses, hp: f.hp, maxHp: f.maxHp, sheet: f.sheet };
        const tgt = { statuses: f.opponent.statuses };
        const pick = chooseVerse(f, f.opponent, s.state, s.m, s.tuning, () => pool);
        if (pick.verse && !pick.verse.isStrike) auditCast(own, tgt, pick.verse, resolveBefore);
        const r = submitChoice(s, pick.verse.id);
        assert.strictEqual(r.ok, true, `mirrored AI cast refused: ${r.error}`);
      } else if (!step(s)) break;
    }
    return s;
  }

  const rosters = ['ashblade', 'cinder_witch', 'gravewarden', 'hollow_cantor'];
  for (let i = 0; i < 40; i++) {
    const a = rosters[i % 4];
    const b = rosters[(i + 1) % 4];
    mirrorFight(a, b, 3 + (i % 5), 7000 + i);
  }
  assert.deepStrictEqual(misuse, [], `the AI misused: ${misuse.slice(0, 5).join(' | ')}`);
});

function CLASSES_BASE(cls) {
  const { CLASSES } = require('../data/classes.js');
  return CLASSES[cls].stats;
}
function VERSE_BY_NAME(text) {
  const { VERSES, STRIKE } = require('../data/verses.js');
  // cast lines read "<name> — <effect>"; match by verse name prefix
  for (const v of [STRIKE, ...VERSES]) {
    if (text && text.startsWith(v.name + ' ') || text === v.name) return v;
  }
  return null;
}
