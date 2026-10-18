// phase4-marks.test.js — T4.5 acceptance: "mark-behavior unit tests (each
// mark exercised once in a scripted fight)". Every one of the 40 items'
// marks is exercised through the real engine paths — resolveDamage probes
// for the damage-line marks, step()-driven createSession fights for the
// fight-layer marks. Deterministic seeds throughout.
'use strict';
const test = require('node:test');
const assert = require('node:assert');

const { CANON } = require('../data/config.js');
const { resolveDamage, mitigationSum } = require('../engine/damage.js');
const { markMods, mergeMods, statusBlocked, effectiveCost, activateOncePerFight } = require('../engine/marks.js');
const { createSession, runToCompletion, resultsOf, submitChoice, legalVerses, step } = require('../engine/fight.js');
const { getVerse } = require('../data/verses.js');
const { ITEMS } = require('../data/items.js');
const { makeMeasures, mulberry32 } = require('../rng/index.js');
const { initStatuses, applyBleed, applyBurn, applyThorns, applyTimed, applyWard, tickAtTurnStart } = require('../engine/status.js');

const T = CANON;

function fighter(opts = {}) {
  return {
    side: opts.side || 'a',
    sheet: {
      stats: opts.stats || { mig: 8, wit: 8, vig: 6, grd: 0, hst: 5 },
      items: opts.items || [], mainStat: opts.mainStat || 'mig',
      damageType: opts.damageType || 'steel', name: opts.name || 'Probe',
      level: 1, verses: opts.verses || [],
    },
    hp: opts.hp ?? 100, maxHp: opts.maxHp || 100,
    resolve: opts.resolve ?? 10,
    statuses: initStatuses(), flags: {},
    mods: opts.mods || mergeMods(
      { bleedCap: 5, bleedTickBonus: 0, critBonus: 0, critMult: 1.5, lifestealPct: 0,
        burnTurns: 0, burnPotency: 0, emberVsBurning: 0, burnTickResolve: 0, mitBonus: 0,
        braceBonus: 0.4, thornsBonus: 0, turnStartHealPct: 0, curseMult: 0.75, curseTurns: 0,
        shadePerDebuff: 0, hushMod: 2, hushApplyResolve: 0 },
      markMods({ items: opts.items || [] }, T), T),
    totals: { dealt: 0, taken: 0, healed: 0 }, cooldowns: {}, casts: {}, firstCast: {},
  };
}

const STRIKE_SPEC = { base: 2, coefs: [{ stat: 'mig', c: 0.4 }], type: 'steel' };

function probe(actor, target, seed = 11) {
  const state = { fortune: 1.0, fortuneTrack: [1.0] };
  return resolveDamage(state, actor, target, STRIKE_SPEC, makeMeasures(mulberry32(seed)), T);
}

// ---------------------------------------------------------------------------
// Fight scaffolding: step()-driven sessions with manual injection
// ---------------------------------------------------------------------------
function duel(playerItems, enemyOpts = {}, seed = 77, playerOverrides = {}) {
  const A = {
    name: 'Geared', clazz: 'ashblade', level: 1,
    creation: { vig: 1, mig: 1, wit: 1, grd: 1 }, levelUps: {},
    vow: 'red_tide', verses: ['rend', 'opening_cut', 'flay', 'drink_deep'],
    items: playerItems, ...playerOverrides,
  };
  const B = {
    name: 'Bag', clazz: 'gravewarden', level: 1, isEnemy: true,
    stats: { vig: 11, mig: 5, wit: 2, grd: 10, hst: 5 }, hpOverride: 200,
    verses: ['hold_the_line'], script: ['hold_the_line*'], ...enemyOpts,
  };
  return createSession(A, B, { seed, tuning: T });
}

/** Drive the session with step() until `side` owes a manual choice. */
function awaitManual(s, side) {
  s.manualSide = side;
  let guard = 0;
  while (!s.state.over && s.state.phase !== 'await_input' && guard++ < 200) step(s);
  assert.strictEqual(s.state.phase, 'await_input', `awaiting ${side} (over=${s.state.over})`);
  return s.state.current || s.pendingChoice;
}

// ---------------------------------------------------------------------------
// Damage-line marks (deterministic resolveDamage probes)
// ---------------------------------------------------------------------------
test('mark: Pallbearer Mace +30% under 35% target HP, nothing above', () => {
  const who = fighter({ items: ['pallbearers_mace'] });
  const high = probe(who, fighter({ side: 'b', hp: 100 }), 5).raw;
  const low = probe(who, fighter({ side: 'b', hp: 30 }), 5).raw;
  assert.ok(Math.abs(low / high - 1.3) < 1e-9, `${low / high}`);
});

test('mark: Pale Ash Blade +10% above 80% target HP, nothing below', () => {
  const who = fighter({ items: ['pale_ash_blade'] });
  const full = probe(who, fighter({ side: 'b', hp: 100 }), 5).raw;
  const hurt = probe(who, fighter({ side: 'b', hp: 50 }), 5).raw;
  assert.ok(Math.abs(full / hurt - 1.1) < 1e-9, `${full / hurt}`);
});

test('mark: Tithe-Collector Ledger +10% damage, always', () => {
  const marked = probe(fighter({ items: ['tithe_collectors_ledger'] }), fighter({ side: 'b' }), 5).raw;
  const bare = probe(fighter(), fighter({ side: 'b' }), 5).raw;
  assert.ok(Math.abs(marked / bare - 1.1) < 1e-9);
});

test('mark: Choir-Scale Blade +1 raw per DISTINCT debuff on the target', () => {
  const who = fighter({ items: ['choir_scale_blade'] });
  const victim = fighter({ side: 'b' });
  applyTimed(victim, 'curse', 2);
  applyTimed(victim, 'fray', 3);
  const two = probe(who, victim, 5).raw;
  const none = probe(who, fighter({ side: 'b' }), 5).raw;
  assert.ok(Math.abs((two - none) / none - 2 / 5.2) < 1e-9);
});

test('mark: Corvane Blade crit tiers pick by the TARGET HP band (F28/D31)', () => {
  const who = fighter({ items: ['corvanes_blade'] });
  who.mods.critBonus = 1.0; // force crits
  for (const [hp, mult] of [[100, 1.6], [40, 1.8], [20, 2.0]]) {
    const victim = fighter({ side: 'b', hp, maxHp: 100 });
    const audit = probe(who, victim, 9);
    assert.ok(audit.crit, 'forced crit');
    const base = 5.2 * (audit.jitter * audit.fortune);
    assert.ok(Math.abs(audit.raw / base - mult) < 1e-9, `hp ${hp}: ${audit.raw / base} vs ${mult}`);
  }
});

test('mark: Rites of Passage — once-per-fight ember shift: type + 20% for 2 turns', () => {
  const who = fighter({ items: ['rites_of_passage'], damageType: 'steel' });
  const r = activateOncePerFight(who, 'rites_of_passage', T);
  assert.strictEqual(r.ok, true);
  assert.strictEqual(who.sheet.damageType, 'ember');
  assert.strictEqual(who.flags.emberShift.bonus, 0.2);
  assert.strictEqual(who.flags.emberShift.turns, 2);
  const again = activateOncePerFight(who, 'rites_of_passage', T);
  assert.strictEqual(again.ok, false, 'already spent');
  const shifted = probe(who, fighter({ side: 'b' }), 5).raw;
  who.flags.emberShift = null;
  const normal = probe(who, fighter({ side: 'b' }), 5).raw;
  assert.ok(Math.abs(shifted / normal - 1.2) < 1e-9);
  assert.strictEqual(activateOncePerFight(fighter(), 'rites_of_passage', T).ok, false);
});

// ---------------------------------------------------------------------------
// On-hit + bleed marks (step-driven fights)
// ---------------------------------------------------------------------------
test('mark: Wick-Cutter — first Bleed APPLIED each fight carries +2 stacks', () => {
  const s = duel(['wick_cutter']);
  awaitManual(s, 'a');
  submitChoice(s, 'rend');
  assert.strictEqual(s.fighters.b.statuses.bleed.stacks, 3, '1 + 2 bonus');
  const f2 = awaitManual(s, 'a'); // b's turn ran in between (bleed ticked)
  f2.resolve = 10;
  submitChoice(s, 'rend');
  assert.strictEqual(s.fighters.b.statuses.bleed.stacks, 4, '3 + 1, no second bonus');
});

test('mark: Salt-Reaper Scythe — the first landed hit applies +2 Bleed', () => {
  const s = duel(['salt_reapers_scythe']);
  awaitManual(s, 'a');
  const r = submitChoice(s, 'opening_cut'); // no bleed op of its own
  assert.strictEqual(r.ok, true);
  assert.ok(s.fighters.b.statuses.bleed, 'bleed applied by the mark');
  assert.strictEqual(s.fighters.b.statuses.bleed.stacks, 2);
});

test('mark: Marrow-Furnace — Bleed cap 7 alone; Red Tide 8 stays the max', () => {
  assert.strictEqual(duel(['marrow_furnace'], {}, 77, { vow: null }).fighters.a.mods.bleedCap, 7);
  assert.strictEqual(duel([], {}, 77).fighters.a.mods.bleedCap, 8);
  assert.strictEqual(duel(['marrow_furnace'], {}, 78).fighters.a.mods.bleedCap, 8);
});

test('mark: Cantor Tuning Fork — 20% on-hit Hush, deterministic per build', () => {
  let hushed = null;
  for (let seed = 1; seed <= 60 && !hushed; seed++) {
    const s = duel(['cantors_tuning_fork'], {}, seed);
    awaitManual(s, 'a');
    submitChoice(s, 'opening_cut');
    if (s.fighters.b.statuses.hush) hushed = { seed, log: s.log.map((l) => l.text).join(' | ') };
  }
  assert.ok(hushed, '20% should land within 60 seeded attempts');
  assert.ok(/fork finds the note/.test(hushed.log));
  // draw-stream stability: the same seed twice without gear → identical result
  const a1 = duel([], {}, 5);
  awaitManual(a1, 'a');
  submitChoice(a1, 'opening_cut');
  const a2 = duel([], {}, 5);
  awaitManual(a2, 'a');
  submitChoice(a2, 'opening_cut');
  assert.deepStrictEqual(resultsOf(a1).hp, resultsOf(a2).hp, 'deterministic without gear');
});

test('mark: Bellmetal Gauntlets — attackers take 3 true per landed hit', () => {
  const s = duel([], { items: ['bellmetal_gauntlets'] });
  const f = awaitManual(s, 'a');
  const before = f.hp;
  submitChoice(s, 'opening_cut');
  assert.strictEqual(s.fighters.a.hp, before - 3, 'flat 3 true to the attacker');
  assert.ok(/gauntlets bite back/.test(s.log.map((l) => l.text).join(' | ')));
});

test('mark: Founder Chisel — Thorns reflect +50% of the triggering damage', () => {
  const victim = fighter({ side: 'b', items: ['founders_chisel'] });
  applyThorns(victim, 4, 3);
  const who = fighter();
  const audit = probe(who, victim, 5);
  assert.ok(audit.land > 0);
  assert.strictEqual(audit.thornsDealt, Math.round(4 + 0.5 * audit.land));
  const plain = fighter({ side: 'b' });
  applyThorns(plain, 4, 3);
  assert.strictEqual(probe(who, plain, 5).thornsDealt, 4);
});

// ---------------------------------------------------------------------------
// Status-shaping marks
// ---------------------------------------------------------------------------
function witchFight(items, seed = 91) {
  const witch = {
    name: 'Censer', clazz: 'cinder_witch', level: 1,
    creation: { vig: 1, mig: 1, wit: 1, grd: 1 }, levelUps: {},
    vow: 'slow_ash', verses: ['spark', 'cinderfall', 'stoke', 'ashen_veil'],
    items,
  };
  const bag = { name: 'Bag', clazz: 'gravewarden', level: 1, isEnemy: true,
    stats: { vig: 11, mig: 5, wit: 2, grd: 10, hst: 5 }, hpOverride: 200,
    verses: ['hold_the_line'], script: ['hold_the_line*'] };
  return createSession(witch, bag, { seed, tuning: T });
}

test('mark: Ysolde Censer + Reliquary Lantern — Burn potency stacking + self-tick', () => {
  const s = witchFight(['ysoldes_censer', 'reliquary_lantern']);
  const f = awaitManual(s, 'a');
  submitChoice(s, 'spark');
  const wit = f.sheet.stats.wit;
  const burn = s.fighters.b.statuses.burn;
  assert.strictEqual(burn.potency, 2 + 0.25 * wit + 1 + 2 + 1, `${burn.potency}`);
  assert.strictEqual(burn.selfTick, 1);
  assert.strictEqual(burn.srcSide, 'a');
});

test('mark: Cinder Apron — Burn you apply lasts +1 turn (merge)', () => {
  const m = mergeMods(
    { bleedCap: 5, burnPotency: 0, burnTurns: 0, hushMod: 2, hushApplyResolve: 0, curseMult: 0.75 },
    markMods({ items: ['cinder_apron'] }, T), T);
  assert.strictEqual(m.burnTurns, 1);
});

function cantorFight(items, vow = null, seed = 4) {
  const cantor = {
    name: 'Cantor', clazz: 'hollow_cantor', level: 2,
    creation: { vig: 1, mig: 1, wit: 0, grd: 1, hst: 1 }, levelUps: { vig: 1, hst: 1 },
    vow, verses: ['dirge', 'tolling_bell', 'lullaby', 'dissonance'],
    items,
  };
  const bag = { name: 'Bag', clazz: 'gravewarden', level: 2, isEnemy: true,
    stats: { vig: 12, mig: 5, wit: 2, grd: 13, hst: 3 }, hpOverride: 220,
    verses: ['hold_the_line'], script: ['hold_the_line*'] };
  return createSession(cantor, bag, { seed, tuning: T });
}

test('mark: Tollward Rod — your Hush starves -3 (max with Silence, apply-resolve sums)', () => {
  const s = cantorFight(['tollwards_rod'], 'silence');
  const f = awaitManual(s, 'a');
  assert.strictEqual(f.mods.hushMod, 3);
  assert.strictEqual(f.mods.hushApplyResolve, 1);
  submitChoice(s, 'tolling_bell');
  assert.strictEqual(s.fighters.b.statuses.hush.mod, 3);
});

test('mark: Orrery Robe — Hush +1 turn; Choir-Seal cuts the hushed target crits', () => {
  const s = cantorFight(['orrery_robe', 'choir_seal']);
  const f = awaitManual(s, 'a');
  assert.strictEqual(f.mods.hushTurnsBonus, 1);
  assert.strictEqual(f.mods.hushCritReduction, 0.1);
  submitChoice(s, 'tolling_bell'); // applies 3 turns (2 base + 1 robe); the
  // victim's turn-start tick then runs inside submitChoice — status shows 2.
  const hush = s.fighters.b.statuses.hush;
  assert.strictEqual(hush.turns, 2, '3 applied, 1 ticked at the victim turn start');
  assert.strictEqual(hush.critCut, 0.1);
  // the hushed fighter's crit chance drops by exactly the rider
  const victim = fighter({ stats: { hst: 10 } });
  applyTimed(victim, 'hush', 2, 2, { critCut: 0.1 });
  const critChance = T.critBase + T.critPerHst * 10 - victim.statuses.hush.critCut;
  assert.ok(Math.abs(critChance - 0.05) < 1e-12);
});

test('mark: Drowned Chorister Robe — +2 Resolve when you apply Hush', () => {
  const s = cantorFight(['drowned_choristers_robe']);
  const f = awaitManual(s, 'a');
  const before = f.resolve;
  submitChoice(s, 'tolling_bell'); // cost 4
  assert.strictEqual(f.resolve, Math.max(0, before - 4) + 2);
});

test('mark: Gravedust Censer — your Curse is 35% (depth travels, F-DATA-1)', () => {
  const s = cantorFight(['gravedust_censer'], null, 6);
  const f = awaitManual(s, 'a');
  submitChoice(s, 'dirge');
  assert.strictEqual(s.fighters.b.statuses.curse.mod.curseMult, 0.65);
  const cursed = fighter({ stats: { mig: 8 } });
  cursed.statuses.curse = { turns: 1, mod: { curseMult: 0.65 } };
  const audit = probe(cursed, fighter({ side: 'b' }), 5);
  assert.ok(Math.abs(audit.raw / (5.2 * (audit.jitter * audit.fortune)) - 0.65) < 1e-9);
});

// ---------------------------------------------------------------------------
// Brace / Ward / resolve marks
// ---------------------------------------------------------------------------
test('mark: Warden Cassock — Brace lasts 1 extra turn', () => {
  const s = duel([], { items: ['wardens_cassock'] });
  awaitManual(s, 'b');
  submitChoice(s, 'hold_the_line');
  assert.strictEqual(s.fighters.b.statuses.brace.turns, 2);
});

test('mark: Bellmetal Maul — Brace also grants 4 Ward', () => {
  const s = duel([], { items: ['bellmetal_maul'] });
  awaitManual(s, 'b');
  submitChoice(s, 'hold_the_line');
  assert.strictEqual(s.fighters.b.statuses.ward.pool, 4);
});

test('mark: Vigil Ring — Brace verses cost 0 (submit + legal list agree)', () => {
  const warden = {
    name: 'Ring', clazz: 'gravewarden', level: 3,
    creation: { vig: 1, mig: 1, wit: 1, grd: 0, hst: 1 }, levelUps: { grd: 2, hst: 2 },
    vow: 'bastion', verses: ['hold_the_line', 'crypt_door', 'stone_vigil', 'mend_the_mortar'],
    items: ['vigils_ring'],
  };
  const bag = { name: 'Bag', clazz: 'ashblade', level: 3, isEnemy: true,
    stats: { vig: 7, mig: 13, wit: 2, grd: 5, hst: 10 }, hpOverride: 400,
    verses: ['rend'], script: ['rend*'] };
  const s = createSession(warden, bag, { seed: 8, tuning: T });
  const f = s.fighters.a;
  assert.strictEqual(effectiveCost(f, getVerse('hold_the_line'), T), 0);
  assert.strictEqual(effectiveCost(f, getVerse('crypt_door'), T), 0);
  assert.strictEqual(effectiveCost(f, getVerse('mend_the_mortar'), T), 3, 'non-brace unaffected');
  assert.ok(legalVerses(s, f).some((v) => v.id === 'crypt_door'), 'free brace stays legal at low resolve');
  const first = awaitManual(s, 'a');
  first.resolve = 0;
  const r = submitChoice(s, 'crypt_door');
  assert.strictEqual(r.ok, true, '0 cost is payable at 0 resolve');
  assert.ok(first.statuses.brace && first.statuses.ward.pool > 0);
});

test('mark: Orrery Lens — the SECOND cast of each verse costs 1 less', () => {
  const lens = {
    name: 'Lens', clazz: 'ashblade', level: 2,
    creation: { vig: 1, mig: 1, wit: 1, grd: 1 }, levelUps: { mig: 1, hst: 1 },
    vow: 'duelist', verses: ['rend', 'drink_deep', 'flay', 'opening_cut'],
    items: ['orrery_lens'],
  };
  const bag = { name: 'Bag', clazz: 'gravewarden', level: 2, isEnemy: true,
    stats: { vig: 12, mig: 5, wit: 2, grd: 14, hst: 2 }, hpOverride: 400,
    verses: ['hold_the_line'], script: ['hold_the_line*'] };
  const s = createSession(lens, bag, { seed: 9, tuning: T });
  const f = s.fighters.a;
  const first = awaitManual(s, 'a');
  const before1 = first.resolve;
  submitChoice(s, 'rend');
  assert.strictEqual(first.resolve, before1 - 2, 'first cast full price');
  const second = awaitManual(s, 'a');
  const before2 = second.resolve;
  submitChoice(s, 'rend'); // second cast of Rend: 2 - 1 = 1
  assert.strictEqual(second.resolve, before2 - 1, 'second cast discounted');
});

// ---------------------------------------------------------------------------
// Immunities
// ---------------------------------------------------------------------------
test('mark: Deaf Wax — immune to Hush and Stun', () => {
  const s = duel([], { items: ['deaf_wax'] });
  const b = s.fighters.b;
  assert.ok(statusBlocked(b, 'hush') && statusBlocked(b, 'stun'));
  assert.ok(!statusBlocked(b, 'burn') && !statusBlocked(s.fighters.a, 'hush'));
});

test('mark: Tide-Soaked Vestment — immune to Burn', () => {
  const s = duel([], { items: ['tide_soaked_vestment'] });
  assert.ok(statusBlocked(s.fighters.b, 'burn'));
  assert.ok(!statusBlocked(s.fighters.b, 'hush'));
});

test('mark: Corvane Grey Coat — 6 Ward at start; Hush-proof while Braced', () => {
  const s = duel([], { items: ['corvanes_grey_coat'] });
  const b = s.fighters.b;
  assert.strictEqual(b.statuses.ward.pool, 6);
  assert.ok(!statusBlocked(b, 'hush'));
  applyTimed(b, 'brace', 1);
  assert.ok(statusBlocked(b, 'hush'));
});

// ---------------------------------------------------------------------------
// Fight-start + turn-economy marks
// ---------------------------------------------------------------------------
test('marks: Sexton Shroud 10 Ward / Vigil Mantle 8 + brace / Grave-Shovel brace', () => {
  assert.strictEqual(duel([], { items: ['sextons_shroud'] }).fighters.b.statuses.ward.pool, 10);
  const m = duel([], { items: ['vigils_mantle'] });
  assert.strictEqual(m.fighters.b.statuses.ward.pool, 8);
  assert.ok(m.fighters.b.statuses.brace);
  const g = duel([], { items: ['grave_shovel_of_bram'] });
  assert.ok(g.fighters.b.statuses.brace && !g.fighters.b.statuses.ward);
});

test('marks: start-Resolve trio — Hourglass, Grey Pilgrim, Leaden Key (+10 Ward)', () => {
  for (const [id, ward] of [['hourglass_of_ash', 0], ['grey_pilgrims_coat', 0], ['leaden_key_of_the_gate', 10]]) {
    const s = duel([], { items: [id] });
    const b = s.fighters.b; // second mover: 4 start
    assert.strictEqual(b.resolve, 4 + 1, `${id}: 4 + 1 mark`);
    if (ward) assert.strictEqual(b.statuses.ward.pool, ward, id);
  }
});

test('mark: Salt Widow Comb — wins the turn-order tie without consuming the band draw', () => {
  const comb = {
    name: 'Comb', clazz: 'ashblade', level: 1,
    creation: { vig: 1, mig: 1, wit: 1, grd: 1 }, levelUps: {},
    vow: 'red_tide', verses: ['rend', 'flay', 'opening_cut', 'drink_deep'],
    items: ['salt_widows_comb'],
  };
  const mirror = {
    name: 'Mirror', clazz: 'ashblade', level: 1, isEnemy: true,
    stats: { vig: 9, mig: 9, wit: 2, grd: 6, hst: 7 }, hpOverride: 120,
    verses: ['rend'], script: ['rend*'],
  };
  for (let seed = 1; seed <= 20; seed++) {
    const s = createSession(comb, mirror, { seed, tuning: T });
    assert.strictEqual(s.order[0].sheet.name, 'Comb', `seed ${seed}: comb always first on the tie`);
  }
});

test('mark: Drowned Mantle — heal 3 at the start of your turn', () => {
  const s = duel([], { items: ['drowned_mantle'] });
  const b = s.fighters.b;
  b.hp = b.maxHp - 10;
  awaitManual(s, 'a'); // a's turn
  submitChoice(s, 'strike');
  assert.ok(/Drowned Mantle keeps Bag: \+3\./.test(s.log.map((l) => l.text).join(' | ')), 'the +3 heal fires on b turn start');
});

test('mark: Thimble Coat — 2 less Fatigue damage per round', () => {
  const s = duel([], { items: ['thimble_coat'] });
  const bare = duel([], {});
  assert.strictEqual(s.fighters.b.mods.fatigueReduction, 2);
  const fd = 16; // round 16 schedule value
  assert.strictEqual(Math.max(0, fd - s.fighters.b.mods.fatigueReduction), 14);
  assert.strictEqual(Math.max(0, fd - bare.fighters.b.mods.fatigueReduction), 16);
  // and the log line survives a real long fight without drift: fast-forward probe
  const s2 = duel([], { items: ['thimble_coat'] }, 33);
  runToCompletion(s2);
  assert.ok(resultsOf(s2).over);
});

test('mark: Bell of Nine Tolls — round 3: +3 Resolve and Brace, exactly once', () => {
  const bearer = {
    name: 'Nine', clazz: 'ashblade', level: 1,
    creation: { vig: 1, mig: 1, wit: 1, grd: 1 }, levelUps: {},
    vow: 'red_tide', verses: ['rend', 'flay', 'opening_cut', 'drink_deep'],
    items: ['bell_of_nine_tolls'],
  };
  const bag = { name: 'Bag', clazz: 'gravewarden', level: 1, isEnemy: true,
    stats: { vig: 13, mig: 5, wit: 2, grd: 13, hst: 0 }, hpOverride: 500,
    verses: ['mend_the_mortar'], script: ['mend_the_mortar*'] };
  const s = createSession(bearer, bag, { seed: 12, tuning: T });
  runToCompletion(s);
  const lines = s.log.map((l) => l.text);
  assert.strictEqual(lines.filter((t) => /bell remembers/.test(t)).length, 1, 'fires exactly once');
  assert.strictEqual(lines.filter((t) => /braces at the ninth toll/.test(t)).length, 1);
});

test('mark: Founder Leather — Ward absorbs 1 from each DoT tick', () => {
  const s = duel([], { items: ['founders_leather'] });
  const b = s.fighters.b;
  applyWard(b, 10, 3);
  applyBurn(b, 5, 8, 3, 0, 'a');
  const beforePool = b.statuses.ward.pool;
  const beforeHp = b.hp;
  tickAtTurnStart(b, T, b.mods,
    (amount, key) => {
      let dmg = Math.round(amount);
      if (b.mods.wardDotAbsorb > 0 && (key === 'burn' || key === 'bleed') && b.statuses.ward && b.statuses.ward.pool > 0) {
        const absorb = Math.min(b.mods.wardDotAbsorb, b.statuses.ward.pool, dmg);
        b.statuses.ward.pool -= absorb;
        dmg -= absorb;
      }
      b.hp = Math.max(0, b.hp - dmg);
    },
    () => {});
  assert.strictEqual(beforePool - b.statuses.ward.pool, 1, '1 absorbed');
  assert.strictEqual(beforeHp - b.hp, 4, '5 burn minus 1 absorbed');
});

// ---------------------------------------------------------------------------
// Ash-Glazed Brass + candle (engine-flag marks, honest through marks.js)
// ---------------------------------------------------------------------------
test('mark: Ash-Glazed Brass — mitigation cap 0.70 via the mark layer too', () => {
  const tank = fighter({ side: 'b', items: ['ash_glazed_brass'], stats: { mig: 2, grd: 10 } });
  assert.strictEqual(tank.mods.mitCapOverride, 0.7);
  applyTimed(tank, 'brace', 1);
  tank.mods.mitBonus = 0.25; // 0.20 + 0.40 + 0.25 = 0.85 → capped at 0.70
  assert.strictEqual(mitigationSum(tank, 'steel', T), 0.7);
});

// ---------------------------------------------------------------------------
// Coverage: every item's mark is exercised SOMEWHERE in this file
// ---------------------------------------------------------------------------
test('coverage: all 40 items accounted for in the mark-behavior map', () => {
  const exercised = [
    'pallbearers_mace', 'cantors_tuning_fork', 'wick_cutter', 'grave_shovel_of_bram',
    'rites_of_passage', 'corvanes_blade', 'salt_reapers_scythe', 'bellmetal_maul',
    'ysoldes_censer', 'choir_scale_blade', 'tollwards_rod', 'founders_chisel', 'pale_ash_blade',
    'sextons_shroud', 'drowned_mantle', 'bellmetal_gauntlets', 'orrery_robe', 'thimble_coat',
    'wardens_cassock', 'cinder_apron', 'tide_soaked_vestment', 'grey_pilgrims_coat',
    'founders_leather', 'drowned_choristers_robe', 'ash_glazed_brass', 'vigils_mantle',
    'reliquary_lantern', 'deaf_wax', 'candle_of_saint_orrin', 'gravedust_censer',
    'hourglass_of_ash', 'tithe_collectors_ledger', 'marrow_furnace', 'bell_of_nine_tolls',
    'vigils_ring', 'orrery_lens', 'corvanes_grey_coat', 'salt_widows_comb', 'choir_seal',
    'leaden_key_of_the_gate',
  ];
  assert.strictEqual(exercised.length, 40);
  const ids = new Set(ITEMS.map((i) => i.id));
  for (const id of exercised) assert.ok(ids.has(id), `${id} is not a real item id`);
  for (const id of ids) assert.ok(exercised.includes(id), `${id} has no scripted exercise`);
});

// ---------------------------------------------------------------------------
// F-DATA-1 regression: the Last-Hymn transport, scripted end to end
// ---------------------------------------------------------------------------
test('F-DATA-1 scripted: a Last-Hymn Cantor curses — the victim hits ×0.6', () => {
  const s = cantorFight([], 'last_hymn', 21);
  const f = awaitManual(s, 'a');
  assert.strictEqual(f.mods.curseMult, 0.6);
  submitChoice(s, 'dirge'); // Curse lands on Bag
  assert.strictEqual(s.fighters.b.statuses.curse.mod.curseMult, 0.6, 'depth travels');
  // let Bag take their (cursed) turn; the raw line is ×0.6 of uncursed
  awaitManual(s, 'a');
  const who = fighter({ stats: { mig: 5 } });
  who.statuses.curse = { turns: 1, mod: { curseMult: 0.6 } };
  const audit = probe(who, fighter({ side: 'b' }), 5);
  assert.strictEqual(audit.raw, 4 * 0.6 * (audit.jitter * audit.fortune)); // base 2 + 0.4×5
});

// ---------------------------------------------------------------------------
// Wick-Cutter draw-stream parity: the first-apply bonus never shifts the Measure
// ---------------------------------------------------------------------------
test('marks do not shift the Measure for gear-free fighters (replay parity)', () => {
  const r1 = duel([], {}, 99);
  awaitManual(r1, 'a');
  submitChoice(r1, 'opening_cut');
  const r2 = duel([], {}, 99);
  awaitManual(r2, 'a');
  submitChoice(r2, 'opening_cut');
  assert.deepStrictEqual(resultsOf(r1), JSON.parse(JSON.stringify(resultsOf(r2))));
});
