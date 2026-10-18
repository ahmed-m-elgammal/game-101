// stress-status.test.js — Phase-1 re-test wave: adversarial coverage for the
// status engine (engine/status.js): the ten statuses, application caps and
// refresh rules, the fixed tick order, DoT math, duration bookkeeping, stun
// lock semantics, cleanse family, chips. Includes bug-detector tests for the
// re-test finding F-STATUS-1: DoT tick bonuses and Hush depth must come from
// the APPLYING fighter (source), not the holder ([GDD] §7.1 vow texts:
// "Bleed ticks +1" (Red Tide), "+1 Resolve whenever YOUR Burn ticks"
// (Kindling), "Hush reduces Resolve gain by 3" (Silence)).
'use strict';

const { test } = require('node:test');
const assert = require('node:assert');

const {
  TICK_ORDER, DEBUFF_KEYS, BUFF_KEYS, CHIP_META,
  initStatuses, distinctDebuffs, hasDebuff,
  applyBleed, applyBurn, applyTimed, applyWard, applyThorns, applyStun,
  cleanseAll, cleanseOne, consumeDebuffs, tickAtTurnStart, chips,
} = require('../engine/status.js');
const { createTuning } = require('../tuning.js');

const T = createTuning();
const zeroMods = () => ({
  bleedCap: 5, bleedTickBonus: 0, critBonus: 0, critMult: 1.5, lifestealPct: 0,
  burnTurns: 0, burnPotency: 0, emberVsBurning: 0, burnTickResolve: 0,
  mitBonus: 0, braceBonus: 0.4, thornsBonus: 0, turnStartHealPct: 0,
  curseMult: 0.75, curseTurns: 0, shadePerDebuff: 0, hushMod: 2, hushApplyResolve: 0,
});

function fresh() {
  return { hp: 100, maxHp: 100, statuses: initStatuses(), mods: zeroMods() };
}
/** Collect tick events with the engine's own call shape. */
function tick(f, tuning = T, mods = f.mods) {
  const trues = [];
  const events = [];
  const out = tickAtTurnStart(f, tuning, mods,
    (amount, key) => trues.push({ amount, key }),
    (ev) => events.push(ev));
  return { out, trues, events };
}

// ----------------------------------------------------------- shape basics
test('shape: TICK_ORDER is the canon fixed order (BURN→BLEED→THORN→FATIGUE)', () => {
  assert.deepEqual(TICK_ORDER, ['burn', 'bleed', 'thorns', 'fatigue']);
});
test('shape: DEBUFF_KEYS lists exactly the six debuffs', () => {
  assert.deepEqual(DEBUFF_KEYS, ['bleed', 'burn', 'curse', 'fray', 'hush', 'stun']);
});
test('shape: BUFF_KEYS lists exactly the four buffs + rite marker', () => {
  assert.deepEqual(BUFF_KEYS, ['brace', 'ward', 'thorns', 'rite']);
});
test('shape: CHIP_META covers every status key + rite with name/color/glyph', () => {
  const keys = [...DEBUFF_KEYS, 'brace', 'ward', 'thorns', 'fatigue', 'rite'];
  for (const k of keys) {
    assert.ok(CHIP_META[k], `chip meta for ${k}`);
    assert.ok(CHIP_META[k].name && CHIP_META[k].color && CHIP_META[k].glyph);
  }
});
test('shape: initStatuses returns every key null', () => {
  const s = initStatuses();
  for (const k of ['bleed', 'burn', 'curse', 'fray', 'hush', 'brace', 'ward', 'thorns', 'stun', 'fatigue', 'rite']) {
    assert.strictEqual(s[k], null, k);
  }
});
test('shape: distinctDebuffs counts only non-null debuff slots', () => {
  const f = fresh();
  assert.strictEqual(distinctDebuffs(f), 0);
  applyTimed(f, 'curse', 2);
  assert.strictEqual(distinctDebuffs(f), 1);
  applyBleed(f, 2, 8);
  assert.strictEqual(distinctDebuffs(f), 2);
  applyWard(f, 10, 3); // buff — not counted
  assert.strictEqual(distinctDebuffs(f), 2);
});
test('shape: hasDebuff true iff any debuff present', () => {
  const f = fresh();
  assert.strictEqual(hasDebuff(f), false);
  applyTimed(f, 'stun', 1); // stun slot set directly
  f.statuses.stun = { skipNext: true, turnsSince: 0, lock: 2 };
  assert.strictEqual(hasDebuff(f), true);
});

// -------------------------------------------------------------- applyBleed
test('bleed: fresh application stores stacks, srcMIG, turns 3 (+ source tick bonus 0)', () => {
  const f = fresh();
  const s = applyBleed(f, 2, 8);
  assert.deepEqual(s, { stacks: 2, srcMIG: 8, tickBonus: 0, turns: 3 });
});
test('bleed: stacking adds and refreshes duration to 3', () => {
  const f = fresh();
  applyBleed(f, 2, 8);
  f.statuses.bleed.turns = 1;
  const s = applyBleed(f, 2, 6);
  assert.strictEqual(s.stacks, 4);
  assert.strictEqual(s.turns, 3, 'refreshed');
});
test('bleed: strongest srcMIG retained on reapplication', () => {
  const f = fresh();
  applyBleed(f, 1, 9);
  applyBleed(f, 1, 4);
  assert.strictEqual(f.statuses.bleed.srcMIG, 9);
  applyBleed(f, 1, 12);
  assert.strictEqual(f.statuses.bleed.srcMIG, 12);
});
test('bleed: default cap 5 refuses the 6th stack', () => {
  const f = fresh();
  for (let i = 0; i < 6; i++) applyBleed(f, 1, 8);
  assert.strictEqual(f.statuses.bleed.stacks, 5);
});
test('bleed: Red Tide cap 8 honored via explicit cap arg', () => {
  const f = fresh();
  for (let i = 0; i < 10; i++) applyBleed(f, 1, 8, 8);
  assert.strictEqual(f.statuses.bleed.stacks, 8);
});
test('bleed: cap 0 stores 0 stacks (degenerate but deterministic)', () => {
  const f = fresh();
  const s = applyBleed(f, 3, 8, 0);
  assert.strictEqual(s.stacks, 0);
});
test('bleed: zero stacks application creates a 0-stack status (ticks deal 0)', () => {
  const f = fresh();
  applyBleed(f, 0, 8);
  assert.ok(f.statuses.bleed);
  const { trues } = tick(f);
  assert.strictEqual(trues.find((t) => t.key === 'bleed').amount, 0);
});
test('bleed: bug detector — source tick bonus rides on the stored status (Red Tide)', () => {
  // §7.1 Red Tide: "Bleed ticks +1" — the +1 belongs to the ASHBLADE's
  // application and must survive on the VICTIM's status until it ticks.
  const f = fresh();
  applyBleed(f, 3, 8, 8, 1); // 5th arg = source tick bonus
  const { trues } = tick(f);
  const bleedTick = trues.find((t) => t.key === 'bleed');
  assert.ok(bleedTick, 'bleed ticked');
  // 3 stacks × (2 + 0.18×8 + 1) = 3 × 4.44 = 13.32 → trueTick rounds to 13
  assert.strictEqual(Math.round(bleedTick.amount), 13);
});

// --------------------------------------------------------------- applyBurn
test('burn: fresh application stores potency, srcWIT, turns (+ source kindling 0)', () => {
  const f = fresh();
  const s = applyBurn(f, 6, 9, 3);
  assert.deepEqual(s, { potency: 6, srcWIT: 9, turns: 3, kindling: 0, srcSide: null });
});
test('burn: reapplication keeps the HIGHER potency and refreshes duration', () => {
  const f = fresh();
  applyBurn(f, 6, 9, 3);
  const s = applyBurn(f, 4, 5, 3);
  assert.strictEqual(s.potency, 6, 'lower potency ignored');
  assert.strictEqual(s.turns, 3, 'duration refreshed');
  const s2 = applyBurn(f, 10, 5, 3);
  assert.strictEqual(s2.potency, 10, 'higher potency wins');
});
test('burn: strongest srcWIT retained', () => {
  const f = fresh();
  applyBurn(f, 5, 9, 3);
  applyBurn(f, 5, 3, 3);
  assert.strictEqual(f.statuses.burn.srcWIT, 9);
});
test('burn: bug detector — source Kindling bonus rides on the stored burn', () => {
  // §7.1 Kindling: "+1 Resolve whenever YOUR Burn ticks" — the flag belongs
  // to the caster who APPLIED the burn, stored at application time.
  const f = fresh();
  applyBurn(f, 5, 9, 3, 1, 'a'); // 5th = source kindling, 6th = source side
  const { events } = tick(f);
  const res = events.find((e) => e.kind === 'resolve');
  assert.ok(res, 'resolve event fired from the burn tick');
  assert.strictEqual(res.amount, 1);
  assert.strictEqual(res.side, 'a', 'event routes to the SOURCE side');
});
test('burn: no kindling stored → no resolve event (plain burn)', () => {
  const f = fresh();
  applyBurn(f, 5, 9, 3);
  const { events } = tick(f);
  assert.strictEqual(events.length, 0);
});

// -------------------------------------------------------------- applyTimed
test('timed: sets {turns} and overwrites on reapplication', () => {
  const f = fresh();
  applyTimed(f, 'curse', 2);
  assert.deepEqual(f.statuses.curse, { turns: 2 });
  applyTimed(f, 'curse', 5);
  assert.deepEqual(f.statuses.curse, { turns: 5 });
});
test('timed: works for every timed key (curse/fray/hush/brace)', () => {
  for (const k of ['curse', 'fray', 'hush', 'brace']) {
    const f = fresh();
    applyTimed(f, k, 2);
    assert.strictEqual(f.statuses[k].turns, 2, k);
  }
});
test('timed: hush carries its depth for the gain floor (Silence routing)', () => {
  // The HUSHED fighter's next gain must use the depth the APPLIER chose:
  // 2 (default) or 3 (vow Silence), stored on the status at application.
  const f = fresh();
  const s = applyTimed(f, 'hush', 2, 3); // 4th arg = hush depth (source-defined)
  assert.strictEqual(s.mod, 3, 'stored depth');
});
test('timed: hush WITHOUT an explicit depth stores none — the gain reads the canon 2', () => {
  const f = fresh();
  const s = applyTimed(f, 'hush', 2);
  assert.strictEqual(s.mod, undefined, 'bare {turns} shape');
  // The canon depth resolves at READ time (resolveGain: mod ?? tuning.hushMod)
  const { resolveGain } = require('../engine/resolve.js');
  f.resolve = 0;
  assert.strictEqual(resolveGain(f, T), 1, 'income 3 − depth 2 → floored at 1');
});

// --------------------------------------------------------------- applyWard
test('ward: fresh pool + turns', () => {
  const f = fresh();
  assert.deepEqual(applyWard(f, 12, 3), { pool: 12, turns: 3 });
});
test('ward: never stacks — reapplication takes the higher pool', () => {
  const f = fresh();
  applyWard(f, 12, 3);
  const s = applyWard(f, 8, 3);
  assert.strictEqual(s.pool, 12, 'lower pool refused');
  const s2 = applyWard(f, 20, 3);
  assert.strictEqual(s2.pool, 20, 'higher pool wins');
});
test('ward: refresh resets duration even when pool refused', () => {
  const f = fresh();
  applyWard(f, 12, 1);
  const s = applyWard(f, 6, 3);
  assert.strictEqual(s.pool, 12);
  assert.strictEqual(s.turns, 3);
});
test('ward: zero pool is storable and present (chip shows 0 absorb)', () => {
  const f = fresh();
  applyWard(f, 0, 3);
  assert.strictEqual(f.statuses.ward.pool, 0);
});

// ------------------------------------------------------------- applyThorns
test('thorns: fresh value + turns', () => {
  const f = fresh();
  assert.deepEqual(applyThorns(f, 6, 3), { value: 6, turns: 3 });
});
test('thorns: strongest stands — never stacks', () => {
  const f = fresh();
  applyThorns(f, 6, 3);
  assert.strictEqual(applyThorns(f, 4, 3).value, 6);
  assert.strictEqual(applyThorns(f, 9, 3).value, 9);
});
test('thorns: refresh resets duration', () => {
  const f = fresh();
  applyThorns(f, 6, 1);
  assert.strictEqual(applyThorns(f, 2, 3).turns, 3);
  assert.strictEqual(applyThorns(f, 2, 3).value, 6);
});

// --------------------------------------------------------------- applyStun
test('stun: first application succeeds with skipNext + lock 2', () => {
  const f = fresh();
  assert.strictEqual(applyStun(f), true);
  assert.deepEqual(f.statuses.stun, { skipNext: true, turnsSince: 0, lock: 2 });
});
test('stun: re-stun while pending is blocked', () => {
  const f = fresh();
  applyStun(f);
  assert.strictEqual(applyStun(f), false);
});
test('stun: re-stun within two taken turns is blocked (§10.10 lock)', () => {
  const f = fresh();
  applyStun(f);
  f.statuses.stun.skipNext = false; // stun resolved this turn
  f.statuses.stun.turnsSince = 0;
  assert.strictEqual(applyStun(f), false, '0 turns taken');
  f.statuses.stun.turnsSince = 1;
  assert.strictEqual(applyStun(f), false, '1 turn taken');
  f.statuses.stun.turnsSince = 2;
  assert.strictEqual(applyStun(f), true, '2 turns taken → lock lifted');
});
test('stun: lock field is informative only — the turnsSince gate rules', () => {
  const f = fresh();
  applyStun(f);
  f.statuses.stun.skipNext = false;
  f.statuses.stun.turnsSince = 2;
  assert.strictEqual(applyStun(f), true);
  assert.strictEqual(f.statuses.stun.turnsSince, 0, 'reset on new stun');
});

// ---------------------------------------------------------- cleanse family
test('cleanseAll: removes ALL six debuff kinds incl. stacks, keeps buffs', () => {
  const f = fresh();
  applyBleed(f, 5, 8);
  applyBurn(f, 6, 9, 3);
  applyTimed(f, 'curse', 2);
  applyTimed(f, 'fray', 2);
  applyTimed(f, 'hush', 2);
  f.statuses.stun = { skipNext: true, turnsSince: 0, lock: 2 };
  applyWard(f, 10, 3);
  applyTimed(f, 'brace', 1);
  applyThorns(f, 5, 3);
  const removed = cleanseAll(f);
  assert.deepEqual(removed.slice().sort(), ['bleed', 'burn', 'curse', 'fray', 'hush', 'stun']);
  for (const k of DEBUFF_KEYS) assert.strictEqual(f.statuses[k], null, k);
  assert.ok(f.statuses.ward && f.statuses.brace && f.statuses.thorns, 'buffs survive');
});
test('cleanseAll: empty returns []', () => {
  assert.deepEqual(cleanseAll(fresh()), []);
});
test('cleanseOne: removes the OLDEST debuff in DEBUFF_KEYS order', () => {
  const f = fresh();
  applyBurn(f, 5, 8, 3);       // burn (2nd in order)
  applyBleed(f, 2, 8);         // bleed (1st)
  applyTimed(f, 'curse', 2);   // curse (3rd)
  assert.strictEqual(cleanseOne(f), 'bleed');
  assert.strictEqual(cleanseOne(f), 'burn');
  assert.strictEqual(cleanseOne(f), 'curse');
  assert.strictEqual(cleanseOne(f), null);
});
test('cleanseOne: stun is cleansable (6th in order)', () => {
  const f = fresh();
  f.statuses.stun = { skipNext: true, turnsSince: 0, lock: 2 };
  assert.strictEqual(cleanseOne(f), 'stun');
});
test('consumeDebuffs: removes up to n in canonical order and returns them', () => {
  const f = fresh();
  applyBurn(f, 5, 8, 3);
  applyTimed(f, 'curse', 2);
  applyTimed(f, 'fray', 2);
  applyBleed(f, 2, 8);
  const gone = consumeDebuffs(f, 2);
  assert.deepEqual(gone, ['bleed', 'burn']);
  assert.strictEqual(f.statuses.bleed, null);
  assert.strictEqual(f.statuses.burn, null);
  assert.ok(f.statuses.curse && f.statuses.fray, 'rest untouched');
});
test('consumeDebuffs: n larger than available takes all', () => {
  const f = fresh();
  applyTimed(f, 'curse', 2);
  assert.deepEqual(consumeDebuffs(f, 5), ['curse']);
});
test('consumeDebuffs: n=0 takes nothing', () => {
  const f = fresh();
  applyTimed(f, 'curse', 2);
  assert.deepEqual(consumeDebuffs(f, 0), []);
  assert.ok(f.statuses.curse);
});

// --------------------------------------------------------- tickAtTurnStart
test('tick order: events fire BURN → BLEED → FATIGUE with thorns counted between', () => {
  const f = fresh();
  applyBurn(f, 5, 8, 3);
  applyBleed(f, 2, 8);
  f.statuses.thorns = { value: 4, turns: 2 };
  f.statuses.fatigue = { amount: 2 };
  const { out } = tick(f);
  const dots = out.filter((e) => e.kind === 'dot').map((e) => e.status);
  assert.deepEqual(dots, ['burn', 'bleed', 'fatigue'], 'thorns has no dot event');
});
test('tick: burn damage = stored potency, duration decrements, expires at 0', () => {
  const f = fresh();
  applyBurn(f, 7, 9, 2);
  const { trues } = tick(f);
  assert.strictEqual(trues[0].amount, 7);
  assert.strictEqual(trues[0].key, 'burn');
  assert.strictEqual(f.statuses.burn.turns, 1);
  tick(f);
  assert.strictEqual(f.statuses.burn, null, 'expired');
});
test('tick: bleed damage = stacks × (2 + 0.18 × srcMIG)', () => {
  const f = fresh();
  applyBleed(f, 4, 10);
  const { trues } = tick(f);
  const amount = 4 * (2 + 0.18 * 10); // 4 × 3.8 = 15.2
  assert.ok(Math.abs(trues.find((t) => t.key === 'bleed').amount - amount) < 1e-9);
});
test('tick: bleed expires after its third tick (turns 3 → 0)', () => {
  const f = fresh();
  applyBleed(f, 1, 0);
  tick(f); tick(f); tick(f);
  assert.strictEqual(f.statuses.bleed, null);
});
test('tick: thorns counter decrements WITHOUT a damage event', () => {
  const f = fresh();
  applyThorns(f, 6, 2);
  const { out, trues } = tick(f);
  assert.strictEqual(trues.length, 0);
  assert.strictEqual(f.statuses.thorns.turns, 1);
  tick(f);
  assert.strictEqual(f.statuses.thorns, null, 'expired quietly');
});
test('tick: fatigue damages when the schedule injected it', () => {
  const f = fresh();
  f.statuses.fatigue = { amount: 16 };
  const { trues } = tick(f);
  assert.deepEqual(trues, [{ amount: 16, key: 'fatigue' }]);
  assert.ok(f.statuses.fatigue, 'fatigue persists until the schedule replaces it');
});
test('tick: non-DoT durations decrement and expire (curse/fray/hush/brace/ward)', () => {
  for (const [k, turns] of [['curse', 2], ['fray', 3], ['hush', 2], ['brace', 1], ['ward', 3]]) {
    const f = fresh();
    if (k === 'ward') applyWard(f, 10, turns);
    else applyTimed(f, k, turns);
    for (let i = 0; i < turns; i++) tick(f);
    assert.strictEqual(f.statuses[k], null, `${k} expired after ${turns} ticks`);
  }
});
test('tick: ward duration expiry does not depend on pool (0-pool ward expires)', () => {
  const f = fresh();
  applyWard(f, 0, 1);
  tick(f);
  assert.strictEqual(f.statuses.ward, null);
});
test('tick: stun turnsSince increments only while no skip is pending', () => {
  const f = fresh();
  applyStun(f);
  tick(f); // skip pending → no count
  assert.strictEqual(f.statuses.stun.turnsSince, 0);
  f.statuses.stun.skipNext = false;
  tick(f);
  assert.strictEqual(f.statuses.stun.turnsSince, 1);
});
test('tick: stun status clears after stunLockTurns + 1 counted turns', () => {
  const f = fresh();
  applyStun(f);
  f.statuses.stun.skipNext = false;
  tick(f); // 1
  tick(f); // 2
  assert.ok(f.statuses.stun, 'still locked (2 < 3)');
  tick(f); // 3 → clear
  assert.strictEqual(f.statuses.stun, null);
});
test('tick: holder with NO statuses ticks cleanly (no events, no crash)', () => {
  const { out, trues, events } = tick(fresh());
  assert.deepEqual(out, []);
  assert.deepEqual(trues, []);
  assert.deepEqual(events, []);
});
test('tick: Kindling unit path — stored burn kindling emits a routed resolve event', () => {
  const f = fresh();
  applyBurn(f, 4, 8, 3, 1, 'b');
  const { events } = tick(f);
  assert.deepEqual(events, [{ kind: 'resolve', amount: 1, why: 'Kindling', side: 'b' }]);
});

// ------------------------------------------------------------------- chips
test('chips: empty fighter → no chips', () => {
  assert.deepEqual(chips(fresh()), []);
});
test('chips: bleed chip shows stacks + turns', () => {
  const f = fresh();
  applyBleed(f, 3, 8);
  const c = chips(f).find((x) => x.key === 'bleed');
  assert.deepEqual(c, { key: 'bleed', turns: 3, num: 3, label: '3 stacks' });
});
test('chips: burn chip shows potency per turn', () => {
  const f = fresh();
  applyBurn(f, 6, 9, 3);
  const c = chips(f).find((x) => x.key === 'burn');
  assert.strictEqual(c.num, 6);
  assert.strictEqual(c.label, '6 per turn');
});
test('chips: curse/fray/hush/brace carry null num with fixed labels', () => {
  const f = fresh();
  applyTimed(f, 'curse', 2);
  applyTimed(f, 'fray', 3);
  applyTimed(f, 'hush', 2, 2);
  applyTimed(f, 'brace', 1);
  const by = Object.fromEntries(chips(f).map((c) => [c.key, c]));
  assert.strictEqual(by.curse.num, null);
  assert.strictEqual(by.curse.label, '−25% dmg');
  assert.strictEqual(by.fray.label, 'Guard ×0.6');
  assert.strictEqual(by.hush.label, 'gain −2');
  assert.strictEqual(by.brace.label, '+40% mit');
});
test('chips: hush label reflects the stored depth (Silence shows −3)', () => {
  const f = fresh();
  applyTimed(f, 'hush', 2, 3);
  const c = chips(f).find((x) => x.key === 'hush');
  assert.strictEqual(c.label, 'gain −3');
});
test('chips: ward shows pool as num', () => {
  const f = fresh();
  applyWard(f, 13, 3);
  const c = chips(f).find((x) => x.key === 'ward');
  assert.strictEqual(c.num, 13);
  assert.strictEqual(c.label, '13 absorb');
});
test('chips: thorns shows value', () => {
  const f = fresh();
  applyThorns(f, 7, 3);
  assert.strictEqual(chips(f).find((x) => x.key === 'thorns').num, 7);
});
test('chips: stun pending shows "skips next" with turns 1', () => {
  const f = fresh();
  applyStun(f);
  const c = chips(f).find((x) => x.key === 'stun');
  assert.strictEqual(c.turns, 1);
  assert.strictEqual(c.label, 'skips next');
});
test('chips: stun lock phase shows remaining lock count', () => {
  const f = fresh();
  applyStun(f);
  f.statuses.stun.skipNext = false;
  f.statuses.stun.turnsSince = 1;
  const c = chips(f).find((x) => x.key === 'stun');
  assert.strictEqual(c.label, 'locked 1/2');
  assert.strictEqual(c.turns, 1);
});
test('chips: fatigue shows amount with turns 0', () => {
  const f = fresh();
  f.statuses.fatigue = { amount: 32 };
  const c = chips(f).find((x) => x.key === 'fatigue');
  assert.deepEqual(c, { key: 'fatigue', turns: 0, num: 32, label: '32 true' });
});
test('chips: rite marker renders its name', () => {
  const f = fresh();
  f.statuses.rite = { turns: 999, name: 'The Toll' };
  const c = chips(f).find((x) => x.key === 'rite');
  assert.strictEqual(c.label, 'The Toll');
  assert.strictEqual(c.turns, null);
});
test('chips: full-board fighter produces every chip in canonical order', () => {
  const f = fresh();
  applyBleed(f, 2, 8);
  applyBurn(f, 3, 8, 3);
  applyTimed(f, 'curse', 2);
  applyTimed(f, 'fray', 3);
  applyTimed(f, 'hush', 2);
  applyTimed(f, 'brace', 1);
  applyWard(f, 5, 3);
  applyThorns(f, 4, 3);
  applyStun(f);
  f.statuses.fatigue = { amount: 2 };
  f.statuses.rite = { turns: 999, name: 'Rite' };
  assert.deepEqual(chips(f).map((c) => c.key),
    ['bleed', 'burn', 'curse', 'fray', 'hush', 'brace', 'ward', 'thorns', 'stun', 'fatigue', 'rite']);
});

// ======================================================================
// Systematic sweeps — per-status duration and expiry tables
// ======================================================================

const TURNS_TABLE = tuning().statusTurns;
function tuning() { return createTuning(); }

for (const [key, turns] of Object.entries(TURNS_TABLE)) {
  test(`sweep statusTurns[${key}] = ${turns}: status survives ${turns - 1} ticks, dies on the ${turns}th`, () => {
    if (key === 'bleed') return; // bleed duration is hard-coded 3 at application (see F-STATUS-2 note)
    const f = fresh();
    if (key === 'burn') applyBurn(f, 3, 0, turns);
    else if (key === 'ward') applyWard(f, 10, turns);
    else if (key === 'thorns') applyThorns(f, 4, turns);
    else applyTimed(f, key, turns);
    for (let i = 0; i < turns - 1; i++) tick(f);
    assert.ok(f.statuses[key], `${key} should survive tick ${turns - 1}`);
    tick(f);
    assert.strictEqual(f.statuses[key], null, `${key} expires on tick ${turns}`);
  });
}

for (const stacks of [1, 2, 3, 4, 5]) {
  test(`sweep bleed tick @${stacks} stacks / MIG 8 = ${stacks * 3.44} (rounded ${(Math.round(stacks * (2 + 0.18 * 8)))})`, () => {
    const f = fresh();
    applyBleed(f, stacks, 8);
    const { trues } = tick(f);
    assert.ok(Math.abs(trues[0].amount - stacks * (2 + 0.18 * 8)) < 1e-9);
  });
}

for (const wit of [0, 2, 5, 8, 10, 14]) {
  test(`sweep bleed srcMIG retention @srcWIT ${wit} — burn srcWIT max survives mixed applications`, () => {
    const f = fresh();
    applyBurn(f, 5, wit, 3);
    applyBurn(f, 4, Math.max(0, wit - 2), 3);
    assert.strictEqual(f.statuses.burn.srcWIT, wit);
  });
}

test('sweep: 1000 sequential apply/tick cycles never corrupt the status board', () => {
  const f = fresh();
  for (let i = 0; i < 1000; i++) {
    switch (i % 5) {
      case 0: applyBleed(f, (i % 3) + 1, i % 12); break;
      case 1: applyBurn(f, (i % 4) + 2, i % 12, 3); break;
      case 2: applyWard(f, i % 15, 3); break;
      case 3: applyThorns(f, i % 8, 3); break;
      case 4: applyTimed(f, 'curse', 2); break;
    }
    tick(f);
    for (const k of DEBUFF_KEYS) {
      const s = f.statuses[k];
      if (s) assert.ok(s.turns >= 0 || s.stacks >= 0 || s.potency >= 0, `corrupt ${k} at ${i}`);
    }
  }
});
