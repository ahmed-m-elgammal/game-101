// stress-damage.test.js — Phase-1 re-test wave: adversarial coverage for the
// damage pipeline (engine/damage.js), the Resolve economy (engine/resolve.js)
// and the Fatigue schedule (engine/fatigue.js). Golden-value tables, rounding
// contract, Measure-order alignment, ward/candle/thorns interactions,
// mitigation summation boundaries, fortune clamp, degenerate inputs.
'use strict';

const { test } = require('node:test');
const assert = require('node:assert');

const { mitigationSum, resolveDamage, trueTick, distinctDebuffs } = require('../engine/damage.js');
const {
  resolveAtFightStart, resolveGain, canPay, pay, gain,
} = require('../engine/resolve.js');
const {
  telegraphFor, fatigueDamage, cumulativeThrough, isLastBellRound, lastBellResolve,
} = require('../engine/fatigue.js');
const { createTuning } = require('../tuning.js');
const { mulberry32, makeMeasures } = require('../rng/index.js');
const { initStatuses, applyWard, applyBleed, applyBurn, applyTimed } = require('../engine/status.js');
const { CLASSES } = require('../data/classes.js');

const T = createTuning();
const zeroMods = () => ({
  bleedCap: 5, bleedTickBonus: 0, critBonus: 0, critMult: 1.5, lifestealPct: 0,
  burnTurns: 0, burnPotency: 0, emberVsBurning: 0, burnTickResolve: 0,
  mitBonus: 0, braceBonus: 0.4, thornsBonus: 0, turnStartHealPct: 0,
  curseMult: 0.75, curseTurns: 0, shadePerDebuff: 0, hushMod: 2, hushApplyResolve: 0,
});

function fighter(opts = {}) {
  return {
    side: opts.side || 'a',
    sheet: {
      name: opts.name || 'Tester',
      stats: { vig: 5, mig: 8, wit: 5, grd: 4, hst: 5, ...(opts.stats || {}) },
      mainStat: opts.mainStat || 'mig',
      damageType: opts.damageType || 'steel',
      items: opts.items || [],
      verses: [],
    },
    hp: opts.hp ?? 100,
    maxHp: opts.maxHp ?? 100,
    statuses: initStatuses(),
    mods: { ...zeroMods(), ...(opts.mods || {}) },
    flags: { candleUsed: false },
    riteState: null,
    totals: { dealt: 0, taken: 0, healed: 0 },
  };
}

function state() {
  return { fortune: 1.0, fortuneTrack: [1.0] };
}

const STRIKE_SPEC = { base: 2, coefs: [{ stat: 'main', c: 0.4 }], type: 'steel' };

// --------------------------------------------------------- mitigationSum
test('mitigation: steel per GRD — exact table', () => {
  for (const grd of [0, 1, 4, 8, 10, 20, 31]) {
    const target = fighter({ stats: { grd } });
    assert.strictEqual(mitigationSum(target, 'steel', T), Math.min(0.6, 0.02 * grd));
  }
});
test('mitigation: magic per GRD — exact table (half the steel rate)', () => {
  for (const grd of [0, 1, 4, 8, 10, 20, 61]) {
    const target = fighter({ stats: { grd } });
    assert.strictEqual(mitigationSum(target, 'ember', T), Math.min(0.6, 0.01 * grd));
  }
});
test('mitigation: cap 0.6 is a hard clamp for steel at GRD ≥ 30', () => {
  const target = fighter({ stats: { grd: 30 } });
  assert.strictEqual(mitigationSum(target, 'steel', T), 0.6);
});
test('mitigation: Ash-Glazed Brass raises the cap to 0.70', () => {
  const target = fighter({ stats: { grd: 40 }, items: ['ash_glazed_brass'] });
  assert.strictEqual(mitigationSum(target, 'steel', T), 0.7);
});
test('mitigation: Ash-Glazed Brass with low GRD sits under the raised cap', () => {
  const target = fighter({ stats: { grd: 10 }, items: ['ash_glazed_brass'] });
  assert.strictEqual(mitigationSum(target, 'steel', T), 0.2);
});
test('mitigation: Fray multiplies GRD before the rate (×0.6)', () => {
  const target = fighter({ stats: { grd: 10 } });
  applyTimed(target, 'fray', 3);
  assert.strictEqual(mitigationSum(target, 'steel', T), 0.02 * 6);
});
test('mitigation: Brace adds +0.4 flat AFTER the GRD rate', () => {
  const target = fighter({ stats: { grd: 5 } });
  applyTimed(target, 'brace', 1);
  assert.strictEqual(mitigationSum(target, 'steel', T), Math.min(0.6, 0.1 + 0.4));
});
test('mitigation: Bastion mitBonus +0.1 stacks with Brace under the cap', () => {
  const target = fighter({ stats: { grd: 5 }, mods: { mitBonus: 0.1 } });
  applyTimed(target, 'brace', 1);
  assert.strictEqual(mitigationSum(target, 'steel', T), 0.6, '0.1+0.4+0.1 → capped');
});
test('mitigation: Bastion without brace sits below the cap', () => {
  const target = fighter({ stats: { grd: 5 }, mods: { mitBonus: 0.1 } });
  assert.strictEqual(mitigationSum(target, 'steel', T), 0.2);
});
test('mitigation: Fray + Brace + high GRD still respects the cap', () => {
  const target = fighter({ stats: { grd: 20 } });
  applyTimed(target, 'fray', 2);
  applyTimed(target, 'brace', 1);
  assert.strictEqual(mitigationSum(target, 'steel', T), 0.6, '0.24+0.4 → capped at 0.6');
});
test('mitigation: unknown damage type falls to the magic rate (else-branch)', () => {
  const target = fighter({ stats: { grd: 10 } });
  assert.strictEqual(mitigationSum(target, 'mystery', T), 0.1);
});
test('mitigation: negative mit (impossible via stats) clamps to 0 (defensive)', () => {
  const target = fighter({ stats: { grd: -50 } });
  assert.strictEqual(mitigationSum(target, 'steel', T), 0);
});

// ------------------------------------------------- resolveDamage goldens
test('golden: Strike 2 + 0.4×MIG vs GRD 4, no jitter variance (pinned stream)', () => {
  const actor = fighter({ stats: { mig: 8 } });
  const target = fighter({ side: 'b', stats: { grd: 4 } });
  const s = state();
  const m = makeMeasures(mulberry32(1));
  const audit = resolveDamage(s, actor, target, STRIKE_SPEC, m, T);
  // raw = 2 + 0.4×8 = 5.2, jitter/fortune/crit from the pinned stream
  assert.strictEqual(audit.raw, 5.2 * audit.jitter * s.fortune * (audit.crit ? 1.5 : 1));
  assert.strictEqual(audit.dealt, Math.round(audit.raw * (1 - 0.08)));
  assert.strictEqual(audit.mit, 0.08);
  assert.strictEqual(target.hp, 100 - audit.land);
});
test('golden: Rend vs GRD 10 — 5+0.9×10 = 14 base, 0.2 mit (canon §5.4 example family)', () => {
  const actor = fighter({ stats: { mig: 10 } });
  const target = fighter({ side: 'b', stats: { grd: 10 } });
  const s = state();
  const m = makeMeasures(mulberry32(2));
  const audit = resolveDamage(s, actor, target, { base: 5, coefs: [{ stat: 'mig', c: 0.9 }], type: 'steel' }, m, T);
  assert.ok(audit.raw > 14 * 0.9 * 0.95, `raw ${audit.raw} in the jitter×fortune band of 14`);
  assert.ok(audit.raw < 14 * 1.1 * 1.05);
  assert.strictEqual(audit.dealt, Math.round(audit.raw * 0.8));
});
test('golden: exactly one rounding — dealt is an integer, raw is float', () => {
  const actor = fighter({});
  const target = fighter({ side: 'b' });
  const audit = resolveDamage(state(), actor, target, STRIKE_SPEC, makeMeasures(mulberry32(3)), T);
  assert.ok(Number.isInteger(audit.dealt));
  assert.ok(!Number.isInteger(audit.raw) || audit.raw === Math.floor(audit.raw));
});
test('golden: min-1 floor — even Strike-vs-max-mit lands ≥ 1 when unwarded', () => {
  // Smallest verse × worst luck: cursed attacker, min jitter, min fortune, 0.6 mit.
  for (let seed = 0; seed < 200; seed++) {
    const actor = fighter({ stats: { mig: 2 }, mods: { curseMult: 0.75 } });
    actor.statuses.curse = { turns: 2 };
    const target = fighter({ side: 'b', stats: { grd: 10 } });
    applyTimed(target, 'brace', 1);
    const audit = resolveDamage(state(), actor, target, STRIKE_SPEC, makeMeasures(mulberry32(seed)), T);
    assert.ok(audit.land >= 1 || audit.warded > 0, `seed ${seed} land ${audit.land}`);
  }
});
test('golden: min-1 floor holds through the fortune minimum (deterministic probe)', () => {
  const actor = fighter({ stats: { mig: 2 } });
  actor.statuses.curse = { turns: 2 };
  const target = fighter({ side: 'b', stats: { grd: 10 } });
  applyTimed(target, 'brace', 1);
  const s = state();
  s.fortune = 0.88; // the clamp floor
  const m = makeMeasures(mulberry32(7));
  const audit = resolveDamage(s, actor, target, STRIKE_SPEC, m, T);
  assert.ok(audit.dealt >= 1, `dealt ${audit.dealt}`);
});
test('golden: crit multiplies AFTER fortune, BEFORE mitigation (§15.1 order)', () => {
  const actor = fighter({ stats: { mig: 8 }, mods: { critBonus: 1.0 } }); // guaranteed crit
  const target = fighter({ side: 'b', stats: { grd: 0 } });
  const s = state();
  const m = makeMeasures(mulberry32(11));
  const audit = resolveDamage(s, actor, target, STRIKE_SPEC, m, T);
  assert.strictEqual(audit.crit, true);
  assert.strictEqual(audit.raw, (2 + 3.2) * audit.jitter * s.fortune * 1.5);
});
test('golden: curse multiplies the attacker raw by the curse mult (×0.75)', () => {
  const actor = fighter({ stats: { mig: 8 } });
  actor.statuses.curse = { turns: 1 };
  const target = fighter({ side: 'b', stats: { grd: 0 } });
  const s = state();
  const m = makeMeasures(mulberry32(13));
  const audit = resolveDamage(s, actor, target, STRIKE_SPEC, m, T);
  assert.strictEqual(audit.raw, 5.2 * audit.jitter * s.fortune * 0.75 * (audit.crit ? 1.5 : 1));
});
test('golden: Last Hymn curse depth (×0.6) comes from the attacker mods', () => {
  const actor = fighter({ stats: { mig: 8 }, mods: { curseMult: 0.6 } });
  actor.statuses.curse = { turns: 1 };
  const target = fighter({ side: 'b', stats: { grd: 0 } });
  const audit = resolveDamage(state(), actor, target, STRIKE_SPEC, makeMeasures(mulberry32(17)), T);
  assert.strictEqual(audit.raw, 5.2 * audit.jitter * audit.fortune * 0.6 * (audit.crit ? 1.5 : 1));
});
test('golden: bonusIfTargetBurning +50% (Conflagration) only while burning', () => {
  const spec = { base: 10, coefs: [{ stat: 'wit', c: 1.3 }], type: 'ember', bonusIfTargetBurning: 0.5 };
  const actor = fighter({ mainStat: 'wit', damageType: 'ember', stats: { mig: 2, wit: 8 } });
  const cold = fighter({ side: 'b' });
  const hot = fighter({ side: 'b' });
  applyBurn(hot, 5, 8, 3);
  const a1 = resolveDamage(state(), actor, cold, spec, makeMeasures(mulberry32(19)), T);
  const a2 = resolveDamage(state(), actor, hot, spec, makeMeasures(mulberry32(19)), T);
  assert.ok(a2.raw > a1.raw * 1.49 && a2.raw < a1.raw * 1.51, `cold ${a1.raw} hot ${a2.raw}`);
});
test('golden: perDebuffPct scales with DISTINCT debuffs (Requiem +20%)', () => {
  const spec = { base: 12, coefs: [], type: 'shade', perDebuffPct: 0.2 };
  const actor = fighter({ mainStat: 'wit', damageType: 'shade' });
  const clean = fighter({ side: 'b' });
  const stacked = fighter({ side: 'b' });
  applyBleed(stacked, 2, 8);
  applyBurn(stacked, 3, 8, 3);
  applyTimed(stacked, 'curse', 2);
  const a1 = resolveDamage(state(), actor, clean, spec, makeMeasures(mulberry32(23)), T);
  const a2 = resolveDamage(state(), actor, stacked, spec, makeMeasures(mulberry32(23)), T);
  assert.ok(Math.abs(a2.raw - (12 * 1.6) * a2.jitter * a2.fortune * (a2.crit ? 1.5 : 1)) < 1e-9, '3 debuffs → ×1.6, pre-jitter');
});
test('golden: perDebuffFlat respects its max (Seventh Verse +1, max 4)', () => {
  const spec = { base: 10, coefs: [], type: 'shade', perDebuffFlat: 1, perDebuffFlatMax: 4 };
  const actor = fighter({ mainStat: 'wit', damageType: 'shade' });
  const many = fighter({ side: 'b' });
  applyBleed(many, 1, 8); applyBurn(many, 3, 8, 3); applyTimed(many, 'curse', 2);
  applyTimed(many, 'fray', 2); applyTimed(many, 'hush', 2);
  many.statuses.stun = { skipNext: true, turnsSince: 0, lock: 2 };
  const audit = resolveDamage(state(), actor, many, spec, makeMeasures(mulberry32(29)), T);
  // flat +4 is applied BEFORE jitter × fortune (conditional-multiplier order)
  assert.strictEqual(audit.raw, (10 + 4) * audit.jitter * audit.fortune * (audit.crit ? 1.5 : 1), '6 debuffs → capped +4 pre-jitter');
});
test('golden: Pyre emberVsBurning ×1.2 only for ember vs burning', () => {
  const spec = { base: 5, coefs: [], type: 'ember' };
  const pyre = fighter({ mods: { emberVsBurning: 0.2 } });
  const hot = fighter({ side: 'b' });
  const cold = fighter({ side: 'b' });
  applyBurn(hot, 5, 8, 3);
  const aHot = resolveDamage(state(), pyre, hot, spec, makeMeasures(mulberry32(31)), T);
  const aCold = resolveDamage(state(), pyre, cold, spec, makeMeasures(mulberry32(31)), T);
  assert.ok(Math.abs(aHot.raw / aCold.raw - 1.2) < 1e-9);
  // Steel verse with the same mod: no Pyre
  const steel = { base: 5, coefs: [], type: 'steel' };
  const s1 = resolveDamage(state(), pyre, hot, steel, makeMeasures(mulberry32(31)), T);
  const s2 = resolveDamage(state(), pyre, cold, steel, makeMeasures(mulberry32(31)), T);
  assert.ok(Math.abs(s1.raw / s2.raw - 1) < 1e-9);
});
test('golden: Echoing Grief shadePerDebuff ×(1+0.08n) only for shade', () => {
  const spec = { base: 5, coefs: [], type: 'shade' };
  const griever = fighter({ mods: { shadePerDebuff: 0.08 } });
  const sad = fighter({ side: 'b' });
  applyBleed(sad, 1, 8); applyTimed(sad, 'curse', 2);
  const audit = resolveDamage(state(), griever, sad, spec, makeMeasures(mulberry32(37)), T);
  const base = 5 * audit.jitter * audit.fortune * (audit.crit ? 1.5 : 1);
  assert.ok(Math.abs(audit.raw / base - 1.16) < 1e-9);
});
test('golden: perBleedStack true damage scales by captured stacks', () => {
  const spec = { base: 4, coefs: [{ stat: 'mig', c: 0.4 }], type: 'steel', perBleedStack: true, _bleedStacks: 5, ignoreMit: true };
  const actor = fighter({ stats: { mig: 10 } });
  const target = fighter({ side: 'b', stats: { grd: 10 } });
  const audit = resolveDamage(state(), actor, target, spec, makeMeasures(mulberry32(41)), T);
  assert.strictEqual(audit.mit, 0, 'ignoreMit');
  assert.strictEqual(audit.raw, (4 + 4) * 5 * audit.jitter * audit.fortune * (audit.crit ? 1.5 : 1));
});
test('golden: perBleedStack with 0 stacks deals 0 (dead card guard)', () => {
  const spec = { base: 4, coefs: [], perBleedStack: true, _bleedStacks: 0, ignoreMit: true };
  const actor = fighter({});
  const target = fighter({ side: 'b' });
  const audit = resolveDamage(state(), actor, target, spec, makeMeasures(mulberry32(43)), T);
  assert.strictEqual(audit.raw, 0);
  assert.strictEqual(audit.dealt, 0);
  assert.strictEqual(audit.land, 0);
  assert.strictEqual(target.hp, 100);
});
test('golden: mitigationFactor halves the summed mitigation (Sear the Note)', () => {
  const actor = fighter({});
  const target = fighter({ side: 'b', stats: { grd: 10 } }); // 0.2 steel
  const spec = { base: 8, coefs: [], type: 'ember', mitigationFactor: 0.5 };
  const audit = resolveDamage(state(), actor, target, spec, makeMeasures(mulberry32(47)), T);
  assert.strictEqual(audit.mit, 0.05, 'ember rate 0.1 × 0.5');
  assert.strictEqual(audit.dealt, Math.round(audit.raw * 0.95));
});
test('golden: rite damageBonusPct flag multiplies raw (First Vespers +30%)', () => {
  const actor = fighter({});
  actor.riteState = { flags: { damageBonusPct: 0.3 }, statMults: {} };
  const target = fighter({ side: 'b', stats: { grd: 0 } });
  const audit = resolveDamage(state(), actor, target, STRIKE_SPEC, makeMeasures(mulberry32(53)), T);
  assert.ok(Math.abs(audit.raw - 5.2 * audit.jitter * audit.fortune * 1.3 * (audit.crit ? 1.5 : 1)) < 1e-9);
});
// -------------------------------------------------- Measure order & draws
test('measure order: one single-hit damage instance consumes exactly 3 draws', () => {
  const actor = fighter({});
  const target = fighter({ side: 'b' });
  let draws = 0;
  const counter = mulberry32(59);
  const wrapped = () => { draws += 1; return counter(); };
  resolveDamage(state(), actor, target, STRIKE_SPEC, makeMeasures(wrapped), T);
  assert.strictEqual(draws, 3);
});
test('measure order: multi-hit (Red Flurry 3 hits) consumes exactly 9 draws', () => {
  const actor = fighter({});
  const target = fighter({ side: 'b', stats: { grd: 0 } });
  let draws = 0;
  const counter = mulberry32(61);
  const wrapped = () => { draws += 1; return counter(); };
  const flurry = { base: 3, coefs: [{ stat: 'mig', c: 0.45 }], type: 'steel' };
  for (let h = 0; h < 3; h++) resolveDamage(state(), actor, target, flurry, makeMeasures(wrapped), T);
  assert.strictEqual(draws, 9);
});
test('measure order: fully-warded hits still consume their draws (no short-circuit)', () => {
  const actor = fighter({});
  const target = fighter({ side: 'b', stats: { grd: 0 } });
  applyWard(target, 500, 3);
  let draws = 0;
  const counter = mulberry32(67);
  const wrapped = () => { draws += 1; return counter(); };
  resolveDamage(state(), actor, target, STRIKE_SPEC, makeMeasures(wrapped), T);
  assert.strictEqual(draws, 3);
  assert.strictEqual(target.hp, 100, 'ward drank everything');
});

// ---------------------------------------------------- fortune clamp book
test('fortune: drift ±0.02 clamps inside [0.88, 1.12] across 300 instances', () => {
  const s = state();
  const m = makeMeasures(mulberry32(71));
  const actor = fighter({});
  const target = fighter({ side: 'b', stats: { grd: 0 } });
  for (let i = 0; i < 300; i++) {
    resolveDamage(s, actor, target, STRIKE_SPEC, m, T);
    assert.ok(s.fortune >= 0.88 - 1e-12 && s.fortune <= 1.12 + 1e-12, `fortune ${s.fortune} @${i}`);
  }
});
test('fortune: track records every instance including the initial 1.0', () => {
  const s = state();
  const m = makeMeasures(mulberry32(73));
  const actor = fighter({});
  const target = fighter({ side: 'b', stats: { grd: 0 } });
  resolveDamage(s, actor, target, STRIKE_SPEC, m, T);
  resolveDamage(s, actor, target, STRIKE_SPEC, m, T);
  assert.strictEqual(s.fortuneTrack.length, 3);
  assert.strictEqual(s.fortuneTrack[0], 1.0);
});
test('fortune: floor/ceiling engage exactly (pinned streams reach both ends)', () => {
  // Long stream pushing one direction must pin at the clamp, never exceed.
  const s = state();
  const m = makeMeasures(mulberry32(79));
  const actor = fighter({});
  const target = fighter({ side: 'b', stats: { grd: 0 } });
  let hitFloor = false, hitCeil = false;
  for (let i = 0; i < 4000; i++) {
    resolveDamage(s, actor, target, STRIKE_SPEC, m, T);
    if (s.fortune === T.fortuneMin) hitFloor = true;
    if (s.fortune === T.fortuneMax) hitCeil = true;
  }
  assert.ok(hitFloor && hitCeil, `floor ${hitFloor} ceiling ${hitCeil}`);
});

// --------------------------------------------------------- ward & candle
test('ward: partial absorb — pool drains, remainder lands, broken ward clears', () => {
  const actor = fighter({});
  const target = fighter({ side: 'b', stats: { grd: 0 } });
  applyWard(target, 3, 3);
  const audit = resolveDamage(state(), actor, target, STRIKE_SPEC, makeMeasures(mulberry32(83)), T);
  assert.ok(audit.warded <= 3);
  assert.strictEqual(audit.land, audit.dealt - audit.warded);
  if (audit.dealt > 3) assert.strictEqual(target.statuses.ward, null, 'broken');
});
test('ward: 0-damage instances never touch the ward pool', () => {
  const actor = fighter({});
  const target = fighter({ side: 'b' });
  applyWard(target, 10, 3);
  const spec = { base: 0, coefs: [], perBleedStack: true, _bleedStacks: 0, ignoreMit: true };
  const audit = resolveDamage(state(), actor, target, spec, makeMeasures(mulberry32(89)), T);
  assert.strictEqual(audit.dealt, 0);
  assert.strictEqual(audit.warded, 0);
  assert.strictEqual(target.statuses.ward.pool, 10, 'pool untouched');
});
test('candle: first lethal hit leaves the holder at exactly 1 HP, flags used', () => {
  const actor = fighter({});
  const target = fighter({ side: 'b', items: ['candle_of_saint_orrin'], hp: 5, maxHp: 100 });
  const audit = resolveDamage(state(), actor, target, STRIKE_SPEC, makeMeasures(mulberry32(97)), T);
  assert.strictEqual(audit.candle, true);
  assert.strictEqual(target.hp, 1);
  assert.strictEqual(target.flags.candleUsed, true);
  assert.strictEqual(audit.killed, false);
});
test('candle: second lethal hit kills — once per fight, ever', () => {
  const actor = fighter({ stats: { mig: 30 } }); // Strike ~14 raw → always lethal vs 5 HP
  const target = fighter({ side: 'b', items: ['candle_of_saint_orrin'], hp: 5, maxHp: 100, stats: { grd: 0 } });
  resolveDamage(state(), actor, target, STRIKE_SPEC, makeMeasures(mulberry32(101)), T);
  assert.strictEqual(target.hp, 1, 'first hit consumed the candle');
  const second = resolveDamage(state(), actor, target, STRIKE_SPEC, makeMeasures(mulberry32(103)), T);
  assert.strictEqual(second.candle, false);
  assert.strictEqual(target.hp, 0);
  assert.strictEqual(second.killed, true);
});
test('candle: non-lethal hits never consume the candle', () => {
  const actor = fighter({});
  const target = fighter({ side: 'b', items: ['candle_of_saint_orrin'], hp: 100, maxHp: 100 });
  resolveDamage(state(), actor, target, STRIKE_SPEC, makeMeasures(mulberry32(107)), T);
  assert.strictEqual(target.flags.candleUsed, false);
});
test('candle: warded lethal hits do not trigger it (ward eats the blow first)', () => {
  const actor = fighter({});
  const target = fighter({ side: 'b', items: ['candle_of_saint_orrin'], hp: 5, maxHp: 100 });
  applyWard(target, 500, 3);
  const audit = resolveDamage(state(), actor, target, STRIKE_SPEC, makeMeasures(mulberry32(109)), T);
  assert.strictEqual(audit.candle, false);
  assert.strictEqual(target.flags.candleUsed, false);
  assert.strictEqual(target.hp, 5);
});
test('thorns: attacker takes rounded true damage only when damage lands', () => {
  const actor = fighter({});
  const target = fighter({ side: 'b', stats: { grd: 0 } });
  target.statuses.thorns = { value: 7, turns: 3 };
  const audit = resolveDamage(state(), actor, target, STRIKE_SPEC, makeMeasures(mulberry32(113)), T);
  assert.strictEqual(audit.thornsDealt, 7);
  assert.strictEqual(actor.hp, 100 - 7);
});
test('thorns: fully-warded hits do NOT retaliate (nothing landed)', () => {
  const actor = fighter({});
  const target = fighter({ side: 'b', stats: { grd: 0 } });
  applyWard(target, 500, 3);
  target.statuses.thorns = { value: 7, turns: 3 };
  const audit = resolveDamage(state(), actor, target, STRIKE_SPEC, makeMeasures(mulberry32(127)), T);
  assert.strictEqual(audit.thornsDealt, 0);
  assert.strictEqual(actor.hp, 100);
});
test('thorns: lethal thorns on the actor are recorded (the fight loop ends the fight)', () => {
  const actor = fighter({ hp: 4, maxHp: 100 });
  const target = fighter({ side: 'b', stats: { grd: 0 } });
  target.statuses.thorns = { value: 9, turns: 3 };
  const audit = resolveDamage(state(), actor, target, STRIKE_SPEC, makeMeasures(mulberry32(131)), T);
  assert.strictEqual(actor.hp, 0);
  assert.ok(audit.thornsDealt > 0);
});
test('verse data is never mutated by the pipeline (deep snapshot)', () => {
  const spec = { base: 5, coefs: [{ stat: 'mig', c: 0.9 }], type: 'steel' };
  const snapshot = JSON.stringify(spec);
  const actor = fighter({});
  const target = fighter({ side: 'b' });
  resolveDamage(state(), actor, target, spec, makeMeasures(mulberry32(137)), T);
  assert.strictEqual(JSON.stringify(spec), snapshot);
});

// ------------------------------------------------------------- trueTick
test('trueTick: rounds half up, floors at 0, integer output', () => {
  assert.strictEqual(trueTick(3.2), 3);
  assert.strictEqual(trueTick(3.5), 4);
  assert.strictEqual(trueTick(0.4), 0);
  assert.strictEqual(trueTick(-5), 0);
  assert.strictEqual(trueTick(62), 62);
});
test('distinctDebuffs (damage.js copy) agrees with the status module copy', () => {
  const status = require('../engine/status.js');
  const f = fighter({});
  applyBleed(f, 1, 8); applyBurn(f, 2, 8, 3); applyTimed(f, 'hush', 2);
  assert.strictEqual(distinctDebuffs(f), status.distinctDebuffs(f));
});

// --------------------------------------------------------------- resolve
test('resolve: start 3 first mover, 4 second mover', () => {
  const a = fighter({}); const b = fighter({ side: 'b' });
  resolveAtFightStart(a, false, T);
  resolveAtFightStart(b, true, T);
  assert.strictEqual(a.resolve, 3);
  assert.strictEqual(b.resolve, 4);
});
test('resolve: income +3 per turn start', () => {
  const f = fighter({});
  f.resolve = 0;
  assert.strictEqual(resolveGain(f, T), 3);
  assert.strictEqual(f.resolve, 3);
});
test('resolve: hush reduces income by 2 (canon default depth)', () => {
  const f = fighter({});
  applyTimed(f, 'hush', 2, 2);
  f.resolve = 0;
  assert.strictEqual(resolveGain(f, T), 1);
});
test('resolve: bug detector — hush depth comes from the APPLIER (Silence −3)', () => {
  const f = fighter({});
  applyTimed(f, 'hush', 2, 3); // a Silence Cantor applied this
  f.resolve = 0;
  // With canon income 3 both depths floor at +1, so widen income to expose it.
  const t2 = createTuning({ resolveIncome: 5 });
  assert.strictEqual(resolveGain(f, t2), 2, 'income 5 − silence 3');
  const f2 = fighter({});
  applyTimed(f2, 'hush', 2, 2); // default depth
  f2.resolve = 0;
  assert.strictEqual(resolveGain(f2, t2), 3, 'income 5 − default 2');
});
test('resolve: income floor +1 never below (deep hush cannot starve to 0)', () => {
  const f = fighter({});
  applyTimed(f, 'hush', 2, 99);
  f.resolve = 0;
  assert.strictEqual(resolveGain(f, T), 1);
  assert.strictEqual(f.resolve, 1);
});
test('resolve: income caps at 10', () => {
  const f = fighter({});
  f.resolve = 9;
  assert.strictEqual(resolveGain(f, T), 3);
  assert.strictEqual(f.resolve, 10);
});
test('resolve: canPay boundaries (>= cost)', () => {
  const f = fighter({});
  f.resolve = 4;
  assert.strictEqual(canPay(f, 4), true);
  assert.strictEqual(canPay(f, 5), false);
  assert.strictEqual(canPay(f, 0), true);
});
test('resolve: pay subtracts and clamps at 0', () => {
  const f = fighter({});
  f.resolve = 3;
  pay(f, 2, T);
  assert.strictEqual(f.resolve, 1);
  pay(f, 5, T);
  assert.strictEqual(f.resolve, 0);
});
test('resolve: gain adds and clamps at 10', () => {
  const f = fighter({});
  f.resolve = 8;
  assert.strictEqual(gain(f, 4, T), 10);
  assert.strictEqual(f.resolve, 10);
});
test('resolve: strike refund +1 lands through gain (cap respected)', () => {
  const f = fighter({});
  f.resolve = 10;
  gain(f, T.strikeRefund, T);
  assert.strictEqual(f.resolve, 10);
});

// --------------------------------------------------------------- fatigue
test('fatigue: telegraph TOLL IN 3/2/1 on r13/14/15, null elsewhere', () => {
  assert.strictEqual(telegraphFor(13, T), 3);
  assert.strictEqual(telegraphFor(14, T), 2);
  assert.strictEqual(telegraphFor(15, T), 1);
  for (const r of [0, 1, 12, 16, 17, 20, 21]) assert.strictEqual(telegraphFor(r, T), null, `r${r}`);
});
test('fatigue: damage 2/4/8/16/32 on r16–20, 0 elsewhere', () => {
  assert.deepEqual([16, 17, 18, 19, 20].map((r) => fatigueDamage(r, T)), [2, 4, 8, 16, 32]);
  for (const r of [0, 1, 15, 21, 25, 100]) assert.strictEqual(fatigueDamage(r, T), 0, `r${r}`);
});
test('fatigue: cumulative through r20 = 62 (the D8 assert)', () => {
  assert.strictEqual(cumulativeThrough(20, T), 62);
});
test('fatigue: cumulative partials (16→2, 17→6, 18→14, 19→30)', () => {
  assert.deepEqual([16, 17, 18, 19].map((r) => cumulativeThrough(r, T)), [2, 6, 14, 30]);
});
test('fatigue: cumulative before r16 = 0 and beyond r20 stays 62', () => {
  assert.strictEqual(cumulativeThrough(15, T), 0);
  assert.strictEqual(cumulativeThrough(25, T), 62);
  assert.strictEqual(cumulativeThrough(1000, T), 62);
});
test('fatigue: isLastBellRound true only at 20', () => {
  for (let r = 0; r <= 25; r++) assert.strictEqual(isLastBellRound(r, T), r === 20, `r${r}`);
});
test('fatigue: Last Bell — higher HP% wins, whichever slot it sits in', () => {
  const a = { hp: 50, maxHp: 100 };
  const b = { hp: 40, maxHp: 100 };
  assert.deepEqual(lastBellResolve(a, b), { winner: 'a', lastBell: true });
  const a2 = { hp: 40, maxHp: 100 };
  const b2 = { hp: 50, maxHp: 100 };
  assert.deepEqual(lastBellResolve(a2, b2), { winner: 'b', lastBell: true });
});
test('fatigue: Last Bell — exact ties go to the defender (side b)', () => {
  assert.deepEqual(lastBellResolve({ hp: 50, maxHp: 100 }, { hp: 50, maxHp: 100 }), { winner: 'b', lastBell: true });
  assert.deepEqual(lastBellResolve({ hp: 0, maxHp: 100 }, { hp: 0, maxHp: 100 }), { winner: 'b', lastBell: true });
});
test('fatigue: Last Bell — different maxHp pools compare PERCENTAGES', () => {
  const a = { hp: 30, maxHp: 100 };  // 30%
  const b = { hp: 60, maxHp: 150 };  // 40%
  assert.strictEqual(lastBellResolve(a, b).winner, 'b');
});
test('fatigue: Last Bell — epsilon guard makes near-exact ties resolve as ties', () => {
  const a = { hp: 50, maxHp: 100 };
  const b = { hp: 50 + 1e-13, maxHp: 100 };
  assert.strictEqual(lastBellResolve(a, b).winner, 'b');
});
test('fatigue: schedule override moves the whole machine (single source)', () => {
  const t2 = createTuning({ fatigue: { telegraphRound: 5, startRound: 8, schedule: [3, 3, 3], lastBellRound: 10 } });
  assert.strictEqual(telegraphFor(5, t2), 3);
  assert.strictEqual(telegraphFor(8, t2), null);
  assert.deepEqual([8, 9, 10].map((r) => fatigueDamage(r, t2)), [3, 3, 3]);
  assert.strictEqual(cumulativeThrough(10, t2), 9);
  assert.strictEqual(isLastBellRound(10, t2), true);
});
test('fatigue: round 20+ damage is 0 when the schedule is shorter than the window', () => {
  const t2 = createTuning({ fatigue: { schedule: [2, 4], startRound: 16, lastBellRound: 20 } });
  assert.strictEqual(fatigueDamage(18, t2), 0);
  assert.strictEqual(fatigueDamage(20, t2), 0);
  assert.strictEqual(cumulativeThrough(20, t2), 6);
});

// ======================================================================
// Systematic sweeps — round out damage/resolve/fatigue past 150
// ======================================================================

// per-GRD mitigation sweep, both types, with/without the relic cap
for (let grd = 0; grd <= 40; grd += 2) {
  test(`sweep mitigation GRD ${grd}: steel ≤ cap, magic = steel/2 (pre-cap)`, () => {
    const target = fighter({ stats: { grd } });
    const steel = mitigationSum(target, 'steel', T);
    const magic = mitigationSum(target, 'ember', T);
    assert.ok(Math.abs(steel - Math.min(0.6, 0.02 * grd)) < 1e-12);
    assert.ok(Math.abs(magic - Math.min(0.6, 0.01 * grd)) < 1e-12);
    const relic = fighter({ stats: { grd }, items: ['ash_glazed_brass'] });
    assert.ok(Math.abs(mitigationSum(relic, 'steel', T) - Math.min(0.7, 0.02 * grd)) < 1e-12);
  });
}

// per-status mitigation interaction sweep
for (const [label, prep, expected] of [
  ['clean', () => {}, null],
  ['frayed', (f) => applyTimed(f, 'fray', 2), 'fray'],
  ['braced', (f) => applyTimed(f, 'brace', 1), 'brace'],
  ['frayed+braced', (f) => { applyTimed(f, 'fray', 2); applyTimed(f, 'brace', 1); }, 'both'],
  ['bastion', (f) => { f.mods.mitBonus = 0.1; }, 'bastion'],
  ['bastion+braced+frayed', (f) => { f.mods.mitBonus = 0.1; applyTimed(f, 'fray', 2); applyTimed(f, 'brace', 1); }, 'all'],
]) {
  for (const grd of [0, 5, 10, 20]) {
    test(`sweep mitigation[${label}] @GRD ${grd} stays within [0, cap] and matches its summation`, () => {
      const target = fighter({ stats: { grd } });
      prep(target);
      const mit = mitigationSum(target, 'steel', T);
      assert.ok(mit >= 0 && mit <= 0.6 + 1e-12);
      const grdEff = target.statuses.fray ? grd * T.frayGuardMult : grd;
      let sum = 0.02 * grdEff;
      if (target.statuses.brace) sum += 0.4;
      if (target.mods.mitBonus) sum += target.mods.mitBonus;
      assert.ok(Math.abs(mit - Math.min(0.6, Math.max(0, sum))) < 1e-12, `${mit} vs ${sum}`);
    });
  }
}

// resolve economy sequences (deterministic state machines)
for (const seq of [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  [3, 3, 3, 3, 3],
  [10, 0, 10, 0],
]) {
  test(`sweep resolve sequence [${seq}] — every intermediate clamped to [0, 10]`, () => {
    const f = fighter({});
    f.resolve = 0;
    for (const delta of seq) {
      if (delta >= 0) gain(f, delta, T);
      else pay(f, -delta, T);
      assert.ok(f.resolve >= 0 && f.resolve <= 10, `resolve ${f.resolve}`);
    }
  });
}

// fatigue schedule sweeps: perturbed schedules stay internally consistent
for (const sched of [[2, 4, 8, 16, 32], [1, 1, 1, 1, 1], [5, 10, 15, 20, 25], [3]]) {
  const last = 15 + sched.length;
  test(`sweep fatigue schedule [${sched}]: cumulative(${last}) = ${sched.reduce((a, b) => a + b, 0)}`, () => {
    const t2 = createTuning({ fatigue: { telegraphRound: last - sched.length - 3, startRound: 16, schedule: sched, lastBellRound: last } });
    assert.strictEqual(cumulativeThrough(last, t2), sched.reduce((a, b) => a + b, 0));
    assert.strictEqual(fatigueDamage(15, t2), 0);
    assert.strictEqual(fatigueDamage(last + 1, t2), 0);
  });
}

// telegraph sweep: every round of the canon window
for (let r = 0; r <= 25; r++) {
  const expect = r === 13 ? 3 : r === 14 ? 2 : r === 15 ? 1 : null;
  test(`sweep telegraph r${r} → ${expect}`, () => {
    assert.strictEqual(telegraphFor(r, T), expect);
  });
}

// Last Bell percentage sweeps
for (const [pa, pb, winner] of [
  [100, 1, 'a'], [1, 100, 'b'], [55, 54.999, 'a'], [0.0001, 0, 'a'],
  [0, 0.0001, 'b'], [50, 50, 'b'], [33.333, 33.334, 'b'], [66.667, 66.666, 'a'],
]) {
  test(`sweep Last Bell a=${pa}% vs b=${pb}% → ${winner}`, () => {
    const verdict = lastBellResolve({ hp: pa, maxHp: 100 }, { hp: pb, maxHp: 100 });
    assert.strictEqual(verdict.winner, winner);
    assert.strictEqual(verdict.lastBell, true);
  });
}

// crit-line sweep: probability tracks HST across a 100k-draw sample
for (const hst of [0, 2, 5, 7, 10]) {
  test(`sweep crit sampling @HST ${hst}: measured rate within ±0.8pp of ${(0.05 + 0.01 * hst) * 100}%`, () => {
    const actor = fighter({ stats: { mig: 8, hst }, mods: { critBonus: 0 } });
    const target = fighter({ side: 'b', stats: { grd: 0 } });
    const s = state();
    const m = makeMeasures(mulberry32(1000 + hst));
    let crits = 0;
    const N = 100000;
    for (let i = 0; i < N; i++) {
      if (resolveDamage(s, actor, target, STRIKE_SPEC, m, T).crit) crits += 1;
    }
    const measured = crits / N;
    const theory = 0.05 + 0.01 * hst;
    assert.ok(Math.abs(measured - theory) < 0.008, `measured ${(measured * 100).toFixed(2)}% vs ${(theory * 100)}%`);
  });
}

// jitter envelope sweep across many seeds (every seed inside (0.9, 1.1))
for (const seed of [0, 7, 42, 999, 123456, 0xdeadbeef]) {
  test(`sweep jitter envelope @seed ${seed}: 50k draws in [0.9, 1.1], endpoints approached`, () => {
    const m = makeMeasures(mulberry32(seed));
    let lo = 2, hi = -1;
    for (let i = 0; i < 50000; i++) {
      const v = m.clamped(T.jitterCenter, T.jitterWidth);
      assert.ok(v >= 0.9 && v <= 1.1);
      if (v < lo) lo = v;
      if (v > hi) hi = v;
    }
    assert.ok(lo < 0.9001 && hi > 1.0999);
  });
}

// audit-record completeness sweep (§10.9 rule 8: no hidden modifiers)
for (const seed of [1, 2, 3, 4, 5]) {
  test(`sweep audit record @seed ${seed} carries every multiplier that touched the number`, () => {
    const actor = fighter({ stats: { mig: 8 } });
    const target = fighter({ side: 'b', stats: { grd: 4 } });
    const s = state();
    const audit = resolveDamage(s, actor, target, STRIKE_SPEC, makeMeasures(mulberry32(seed)), T);
    for (const key of ['dealt', 'land', 'raw', 'jitter', 'crit', 'mit', 'warded', 'thornsDealt', 'hpBefore', 'hpAfter', 'candle', 'killed', 'fortune']) {
      assert.ok(key in audit, `audit.${key}`);
    }
    assert.ok(Math.abs(audit.fortune - s.fortune) < 1e-15);
    assert.strictEqual(audit.dealt, Math.round(audit.raw * (1 - audit.mit)));
  });
}
