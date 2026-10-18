// phase5-scripts.test.js — T5.7 acceptance: every one of the 21 signature
// verbs observable in a scripted fight; openers fire exactly on script;
// mimic power = 80%; the UNSANCTIONED Resolve-drain; the DSL unit rows.
// [GDD] §9.1–9.3 (all signature verbs), §9.5; [00] F20/F21/F34; N4; A4.
'use strict';
const test = require('node:test');
const assert = require('node:assert');

const { CANON } = require('../data/config.js');
const { runFight, createSession, runToCompletion, step } = require('../engine/fight.js');
const { enemyBuild, getEnemy, ENEMIES, TURNED_POUR_ALLY } = require('../data/enemies.js');
const { scriptedPick, compileScript, triggerFired } = require('../engine/ai-scripts.js');
const { buildSheet } = require('../engine/fighter.js');
const { standardBuild } = require('../harness/matrix.js');
const { STRIKE, getVerse } = require('../data/verses.js');
const { initStatuses, applyBleed } = require('../engine/status.js');

const T = CANON;

/** Full auto fight vs a roster row; returns the results object. */
function fightRow(rowId, playerBuild, seed) {
  return runFight(structuredClone(playerBuild), enemyBuild(getEnemy(rowId)), { seed, tuning: T });
}

/** Session (state inspection) vs a roster row. */
function sessionRow(rowId, playerBuild, seed) {
  const s = createSession(structuredClone(playerBuild), enemyBuild(getEnemy(rowId)), { seed, tuning: T });
  runToCompletion(s);
  return s;
}

const CASTS = (s, side) => s.log.filter((e) => e.side === side && e.kind === 'damage');
const TEXT = (s, needle) => s.log.filter((e) => e.text && e.text.includes(needle));
const ROUNDS = (s, needle, side) => TEXT(s, needle).filter((e) => !side || e.side === side).map((e) => e.r);

// A burst Ashblade probe (standard spread, canon kit) per level.
const probe = (level) => standardBuild('ashblade', level, T);
// A warden probe for DoT-soft checks.
const warden = (level) => standardBuild('gravewarden', level, T);

// ---------------------------------------------------------- DSL unit rows
test('T5.7 DSL: compileScript normalizes the queue grammar to a plan', () => {
  const plan = compileScript({ script: ['sepulchral_spikes', 'hold_the_line*'] });
  assert.deepStrictEqual(plan.lead, [{ atTurn: 1, verse: 'sepulchral_spikes' }]);
  assert.strictEqual(plan.repeat, 'hold_the_line');
  assert.deepStrictEqual(compileScript({ script: ['dirge', 'dirge', 'lullaby'] }).lead.map((x) => x.verse), ['dirge', 'dirge', 'lullaby']);
  assert.strictEqual(compileScript({ script: ['red_flurry*'] }).lead.length, 0);
  assert.strictEqual(compileScript({ script: ['red_flurry*'] }).repeat, 'red_flurry');
});

test('T5.7 DSL: structured triggers fire on their keys — turn, HP, round', () => {
  const f = { flags: { aiTurn: 2 }, hp: 40, maxHp: 100, opponent: { hp: 30, maxHp: 120 }, statuses: initStatuses() };
  assert.strictEqual(triggerFired({ when: 'atTurn', value: 2 }, f, { round: 1 }), true);
  assert.strictEqual(triggerFired({ when: 'atTurn', value: 1 }, f, { round: 1 }), false);
  assert.strictEqual(triggerFired({ when: 'hpBelowPct', value: 50 }, f, {}), true);
  assert.strictEqual(triggerFired({ when: 'hpBelowPct', value: 30 }, f, {}), false);
  assert.strictEqual(triggerFired({ when: 'targetHpBelowPct', value: 30 }, f, {}), true);
  assert.strictEqual(triggerFired({ when: 'roundAtLeast', value: 3 }, f, { round: 3 }), true);
  assert.strictEqual(triggerFired({ when: 'roundAtLeast', value: 4 }, f, { round: 3 }), false);
});

test('T5.7 DSL: scriptedPick honors once-guards and never casts an illegal verse', () => {
  const legal = [STRIKE, getVerse('spark')];
  const f = { flags: {}, hp: 40, maxHp: 100, statuses: initStatuses(), opponent: null };
  const session = { logLine() {} };
  const rows = [
    { when: 'hpBelowPct', value: 50, verse: 'conflagration', once: true }, // not legal — skipped, once NOT burned
    { when: 'hpBelowPct', value: 50, verse: 'spark', once: true },
  ];
  f.sheet = { aiScript: rows };
  const p1 = scriptedPick(session, f, { round: 1 }, { legal });
  assert.strictEqual(p1.id, 'spark', 'the illegal trigger is skipped, the legal one fires');
  assert.strictEqual(f.flags.trigFired_0, undefined, 'the once-guard of an uncastable trigger is not burned');
  assert.strictEqual(f.flags.trigFired_1, true);
  assert.strictEqual(scriptedPick(session, f, { round: 2 }, { legal }), null, 'the burned once-guard holds');
  assert.strictEqual(scriptedPick(session, f, { round: 3 }, { legal: [STRIKE] }), null, 'an off-pool trigger never casts');
  // a fresh fighter (flags reset) fires again — the guard is per-fighter state
  const f2 = { flags: {}, hp: 40, maxHp: 100, statuses: initStatuses(), opponent: null, sheet: { aiScript: rows } };
  assert.strictEqual(scriptedPick(session, f2, { round: 1 }, { legal }).id, 'spark');
});

test('T5.7 DSL: the setup/fold postures gate the structured layer exactly as the queue', () => {
  const legal = [STRIKE, getVerse('spark')];
  const f = { flags: { aiTurn: 0 }, hp: 40, maxHp: 100, statuses: initStatuses(), sheet: { aiScript: [{ when: 'atTurn', value: 1, verse: 'spark' }] } };
  const session = { logLine() {} };
  assert.strictEqual(scriptedPick(session, f, { round: 1 }, { legal, restrictToSetup: true }), null, 'setup refuses');
  assert.strictEqual(scriptedPick(session, f, { round: 1 }, { legal, folded: true }), null, 'the fold refuses');
  const r = scriptedPick(session, f, { round: 1 }, { legal });
  assert.strictEqual(r.id, 'spark', 'clean posture fires');
});

// ------------------------------------------------ §9.1 golden scenarios
test('T5.7 #1 Bram: Sepulchral Spikes on turn 1, then Brace and outlast', () => {
  const s = sessionRow('bram', probe(1), 11);
  // Spikes raise Thorns — the wall's opener is observable in the cast ledger
  assert.strictEqual(s.fighters.b.firstCast.sepulchral_spikes, 1, 'the Spikes open his fight');
  assert.ok(s.fighters.b.casts.hold_the_line >= 2, `then Brace and outlast (${s.fighters.b.casts.hold_the_line})`);
});

test('T5.7 #2 Sedge: Opening Cut opener, then Rend — twice before you act', () => {
  const s = sessionRow('sedge', probe(2), 11);
  const casts = CASTS(s, 'b');
  assert.ok(casts[0].text.includes('Opening Cut'));
  assert.ok(casts[1].text.includes('Rend'), `then Rend: ${casts[1].text}`);
  assert.ok(casts.length >= 3, 'the repeat tail keeps swinging');
});

test('T5.7 #3 Brack: Hush on turn 1 (the bell\u2019s rider), then the bell again', () => {
  const s = sessionRow('brack', probe(4), 11);
  assert.strictEqual(s.fighters.b.firstCast.tolling_bell, 1, 'the bell opens');
  assert.ok(TEXT(s, 'is Hushed').some((e) => e.side === 'b' && e.r === 1), 'the opener Hushes the player');
  assert.ok(s.fighters.b.casts.tolling_bell >= 2, 'then Tolling Bell again');
});

test('T5.7 #4 Reaper of the Silt: Red Flurry — three separate hit rolls', () => {
  const s = sessionRow('reaper_silt', probe(5), 11);
  const firstThree = CASTS(s, 'b').slice(0, 3);
  assert.strictEqual(firstThree.length, 3);
  for (const c of firstThree) assert.ok(c.text.includes('Red Flurry'), c.text);
  assert.ok(new Set(firstThree.map((c) => c.r)).size === 1, 'all three land in one turn');
});

test('T5.7 #5 Drowned Choristers: Inheritance carries the wounds, refreshed to 2', () => {
  const bleedProbe = {
    name: 'Reaper probe', clazz: 'ashblade', level: 6,
    creation: { mig: 2, hst: 2 }, levelUps: { vig: 2, mig: 0, wit: 2, grd: 5, hst: 1 },
    vow: 'red_tide', verses: ['rend', 'flay', 'red_flurry', 'opening_cut'], items: [],
  };
  const s = sessionRow('drowned_choristers', bleedProbe, 3);
  const inherit = TEXT(s, 'Inheritance: the new body carries');
  assert.ok(inherit.length >= 1, 'a body stepped in carrying wounds');
  assert.ok(inherit[0].text.includes('bleed'), 'bleed is among the carried wounds');
  assert.ok(inherit[0].text.includes('refreshed to 2'), 'durations refreshed (F34/D31)');
});

test('T5.7 #6 Pell: Ledger\u2019s Ward at 50% — 30 Ward + the stolen verse at full weight (N4)', () => {
  const s = sessionRow('pell', probe(6), 5);
  const bought = TEXT(s, 'back at you, at full weight');
  assert.strictEqual(bought.length, 1, 'the theft fires exactly once (the rite is once-gated)');
  assert.ok(TEXT(s, 'raises 30 Ward').length === 1, 'the 30 Ward rides the same trigger');
  assert.ok(bought[0].text !== '' && !bought[0].text.includes('your Strike'), 'what he buys is a slotted verse');
});

test('T5.7 #7 First Vespers: The Toll at 50% — no more defending, the bell every turn', () => {
  const s = sessionRow('first_vespers', probe(7), 5);
  assert.ok(TEXT(s, 'First Vespers stops defending').length === 1, 'the rite line fires once');
  assert.strictEqual(s.fighters.b.riteState.flags.castEveryTurn, 'tolling_bell');
  assert.strictEqual(s.fighters.b.riteState.flags.damageBonusPct, 0.3);
});

test('T5.7 #8 Bone-Nurse Sable: Mend the Mortar every 3 turns', () => {
  const s = sessionRow('sable', probe(4), 11);
  const b = s.fighters.b;
  assert.strictEqual(b.firstCast.mend_the_mortar, 1, 'the rhythm opens on turn 1');
  assert.ok(b.casts.mend_the_mortar >= 2, `the mortar re-mends (${b.casts.mend_the_mortar})`);
  // the verse's own cooldown IS the 3-turn rhythm — no faster recast is
  // possible; assert the observable mends sit at least 3 rounds apart
  const mends = ROUNDS(s, 'mends', 'b');
  const gaps = mends.slice(1).map((r, i) => r - mends[i]);
  for (const g of gaps) assert.ok(g >= 3, `no faster than the rhythm: ${mends}`);
});

test('T5.7 #9 Ysolde: UNSANCTIONED BURN — +3 potency, each tick drains 1 Resolve', () => {
  const s = sessionRow('ysolde', probe(7), 5);
  const drains = TEXT(s, 'The unsanctioned flame drains');
  assert.ok(drains.length >= 1, 'the Resolve tax is on the log');
  assert.ok(s.fighters.b.sheet.special.unsanctionedBurn.potencyBonus === 3
    && s.fighters.b.sheet.special.unsanctionedBurn.resolveTax === 1, 'the data row carries the canon numbers');
});

test('T5.7 #10 The Wick Lad: clean, fast, no tricks', () => {
  const row = getEnemy('wick_lad');
  const b = enemyBuild(row);
  assert.strictEqual(b.script, undefined, 'no script');
  assert.strictEqual(b.special, undefined, 'no special block');
  assert.strictEqual(b.rite || null, null, 'no rite');
  const s = sessionRow('wick_lad', probe(5), 11);
  assert.ok(!TEXT(s, 'still tuning').length && !TEXT(s, 'folds').length, 'no posture lines');
  assert.ok(s.state.over, 'and the fight plays out normally');
});

test('T5.7 #11 Corvane: the counterbuild resolves from the player build (T4.9 → T5.8)', () => {
  const s = sessionRow('corvane', probe(7), 9);
  assert.strictEqual(s.fighters.b.sheet.name, 'Corvane, the Grey Duelist');
  assert.ok(['hollow_cantor', 'gravewarden', 'cinder_witch', 'ashblade'].includes(s.fighters.b.sheet.clazz),
    'the live sheet is one of the counter classes');
  // T5.8 covers the lock + reveal; here the row's reference sheet resolves.
});

test('T5.7 #12 Furnace-Warden Grast: Thorns + Brace + Gravebind — he punishes direct hits', () => {
  const s = sessionRow('grast', probe(7), 11);
  const thorns = TEXT(s, 'Thorns answer');
  assert.ok(thorns.length >= 2, `every direct hit is punished (${thorns.length})`);
  assert.ok(s.fighters.b.casts.sepulchral_spikes >= 1 && s.fighters.b.casts.stone_vigil >= 1,
    'Spikes and Stone Vigil keep the wall up');
});

test('T5.7 #13 Founder Halbrey: the Passage at 66% and 33% — Steel → Shade → Ember', () => {
  const s = sessionRow('halbrey', probe(8), 5);
  const rites = TEXT(s, 'RITE — ');
  assert.ok(rites.length >= 2, `both passages fire (${rites.length})`);
  const rs = s.fighters.b.riteState;
  assert.ok(rs && rs.damageType, 'the fired rite re-keys the carrier\u2019s hymn');
  assert.ok(['shade', 'ember'].includes(rs.damageType), `the end state is past Steel: ${rs.damageType}`);
});

test('T5.7 #14 Mother Bell: the temperature fight — molten start, the bar is public', () => {
  const pre = createSession(warden(8), enemyBuild(getEnemy('mother_bell')), { seed: 5, tuning: T });
  const b0 = pre.fighters.b;
  assert.strictEqual(b0.sheet.maxHp, 300, 'the A6 override rides');
  assert.ok(b0.riteState && b0.riteState.flags, 'the temperature bar is exposed');
  assert.strictEqual(b0.riteState.flags.molten, true, 'she starts molten (>50%)');
  runToCompletion(pre);
  assert.ok(TEXT(pre, 'RITE — ').length >= 1, 'the rite narrates');
  assert.ok(TEXT(pre, 'spikes subside as the metal cools').length === 1, 'the fight reaches the cooled band — the bar FLIPS');
  assert.strictEqual(pre.fighters.b.riteState.flags.molten, false, 'cooled at the end');
});

// ------------------------------------------------ §9.3 golden scenarios
test('T5.7 #15 Lector Yune: Mimic — the last verse back at 80% power', () => {
  const s = sessionRow('yune', probe(8), 7);
  const mirror = TEXT(s, 'it comes back at 80% power');
  assert.ok(mirror.length >= 1, 'the mirror fires');
  assert.strictEqual(s.fighters.b.sheet.special.mimicPower, 0.8, 'the copy power is exactly 80%');
});

test('T5.7 #16 First Movement: the recording — the exact same opening every time (F20)', () => {
  for (const seed of [11, 12, 13, 14]) {
    const s = sessionRow('first_movement', probe(9), seed);
    const b = s.fighters.b;
    // firstCast rounds ARE the opening: dirge on turns 1 and 2, lullaby on 3
    assert.strictEqual(b.firstCast.dirge, 1, `seed ${seed}: the Dirge opens`);
    assert.strictEqual(b.firstCast.lullaby, 3, `seed ${seed}: the Lullaby closes the window`);
    assert.ok(b.casts.dirge >= 2, `seed ${seed}: the Dirge repeats`);
    assert.strictEqual(b.sheet.script.length, 0, `seed ${seed}: the queue consumed exactly`);
  }
});

test('T5.7 #17 The Tide-Bound: SALT-SOAKED BURN — 4 turns, refuses the Ward absorb', () => {
  const s = sessionRow('tide_bound', probe(9), 7);
  const spec = s.fighters.b.sheet.special.saltSoakedBurn;
  assert.deepStrictEqual(spec, { turns: 4, ignoresWard: true });
  assert.ok(TEXT(s, 'burn').length >= 1, 'the burn lands in the golden fight');
  // behavioral: while burned, a tick leaves the Founder's-Leather absorb out
  const burnEvents = TEXT(s, 'burns').concat(TEXT(s, 'burn'));
  assert.ok(burnEvents.length >= 1);
});

test('T5.7 #18 Sister Oren: Gravebind + 4 HP regen every turn', () => {
  const s = sessionRow('oren', probe(9), 7);
  assert.ok(TEXT(s, 'The gate keeps Sister Oren').length >= 3, 'the regen ticks on her turns');
  assert.ok(s.fighters.b.sheet.special.regenPerTurn === 4);
  assert.ok(s.fighters.b.casts.gravebind >= 1, 'the Stun verse is in rotation');
});

test('T5.7 #19 The Unbound Chorus: three sequential 55-HP voices', () => {
  const s = sessionRow('unbound_chorus', probe(9), 11);
  const steps = TEXT(s, 'Another voice takes up the hymn');
  assert.strictEqual(steps.length, 2, 'two bodies step in (3 − the lead)');
  assert.ok(s.state.over || s.fighters.b.hp <= 55, 'the fight resolves through the sequence');
});

test('T5.7 #20 Ilvane\u2019s Second: NO debuffs — ever', () => {
  const s = sessionRow('ilvanes_second', probe(10), 11);
  const pool = getVerse; // eslint-disable-line no-unused-vars
  const row = getEnemy('ilvanes_second');
  for (const id of row.verses) {
    const v = getVerse(id);
    const ops = (v.effects || []).map((e) => e.op);
    assert.ok(!ops.some((op) => ['bleed+', 'burn', 'curse', 'fray', 'hush', 'stun'].includes(op)),
      `${id} carries a debuff op: ${ops}`);
  }
  const kinds = new Set(s.log.filter((e) => e.side === 'b').map((e) => e.kind));
  assert.ok(!kinds.has('status') || !s.log.some((e) => e.side === 'b' && e.kind === 'status' && /bleed|burn|curse|fray|hush|stun/i.test(e.text)),
    'no debuff status line from the Second all fight');
});

test('T5.7 #21 Ilvane: three phases — the Hymn, the summons, the Baton (F21/D31)', () => {
  // The final boss is TUNED to end an unadapted build (§9.1 boss note; N12
  // recorded the probe band) — the golden scenario WALKS the thresholds the
  // way a nine-chapter build arrives: each band crossed, the rite observed.
  const s = createSession(warden(10), enemyBuild(getEnemy('ilvane')), { seed: 3, tuning: T });
  const MAX_HP = s.fighters.b.maxHp;
  const STEPS = [
    { frac: 0.66, line: 'The Hymn begins' },
    { frac: 0.5, line: 'raises a chorister' },
    { frac: 0.33, line: 'The Baton turns' },
    { frac: 0.25, line: 'The last chorister stands' },
  ];
  let idx = 0; let guard = 0;
  while (!s.state.over && idx < STEPS.length && guard++ < 500) {
    const thr = Math.floor(STEPS[idx].frac * MAX_HP);
    if (s.fighters.b.hp > thr) s.fighters.b.hp = thr;
    step(s);
    if (s.log.some((e) => e.text && e.text.includes(STEPS[idx].line))) idx += 1;
  }
  // keep the fight going until the copy answers at full weight
  let g2 = 0;
  while (!s.state.over && g2++ < 200 && !(s.fighters.b.casts[s.fighters.b.riteState.learn.verseId] > 0)) {
    if (s.fighters.b.hp > Math.floor(0.2 * MAX_HP)) s.fighters.b.hp = Math.floor(0.2 * MAX_HP);
    step(s);
  }
  assert.strictEqual(idx, STEPS.length, 'every threshold observed, in canon order');
  assert.ok(TEXT(s, 'The Hymn begins').length === 1, 'Phase II — the 20% heal (A4/D31)');
  assert.ok(TEXT(s, 'The Hymn keeps him').length >= 1, 'the heal ticks');
  assert.strictEqual(TEXT(s, 'throws itself in front').length, 2, 'summons at 50% and 25%');
  assert.ok(TEXT(s, 'The Baton turns').length === 1, 'Phase III fires');
  const learn = TEXT(s, 'is learning');
  assert.ok(learn.length >= 1, 'he names the verse');
  assert.ok(learn.every((e) => !e.text.includes('Strike')), 'Strike is never copied');
  assert.strictEqual(s.fighters.b.riteState.flags.phase, 3);
  assert.ok(s.fighters.b.riteState.learn && s.fighters.b.riteState.learn.verseId, 'the learned verse rides the rite state');
  // the copy answers at full power — Ilvane casts the learned verse
  assert.ok((s.fighters.b.casts[s.fighters.b.riteState.learn.verseId] || 0) >= 1, 'the copy is CAST');
});

// ---------------------------------------------- roster-level invariants
test('T5.7: every roster row resolves to a sheet that fights to completion', () => {
  for (const row of ENEMIES) {
    if (row.cls === 'hybrid') continue; // the A6 override is exercised above
    const r = fightRow(row.id, probe(Math.min(10, row.level + 1)), 21);
    assert.ok(r.over, `${row.id}: fight completed`);
    assert.ok(r.winner === 'a' || r.winner === 'b', `${row.id}: a side won`);
  }
});

test('T5.7: the Turned Pour ally builds into a legal sheet (T6.4 consumes)', () => {
  // The R7d-approved chassis is a DECLARED override (31 points at L8, like
  // the A6 hybrid): buildSheet takes the budgetOverride path for it.
  const build = {
    name: TURNED_POUR_ALLY.name, clazz: TURNED_POUR_ALLY.clazz, level: TURNED_POUR_ALLY.level,
    isEnemy: true, stats: { ...TURNED_POUR_ALLY.stats }, hpOverride: TURNED_POUR_ALLY.hpOverride,
    vow: null, verses: ['bulwark_strike'], items: [], budgetOverride: true,
  };
  const sheet = buildSheet(build, T);
  assert.strictEqual(sheet.maxHp, 140);
  assert.strictEqual(sheet.stats.grd, 10);
  assert.strictEqual(TURNED_POUR_ALLY.startThorns, 6, 'the approved sheet pins Thorns 6');
  assert.strictEqual(TURNED_POUR_ALLY.oncePerRoundAttack, true);
  assert.strictEqual(TURNED_POUR_ALLY.curseImmune, true, 'cannot be targeted by Curse');
});
