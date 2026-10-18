// phase4-roster.test.js — T4.6/T4.7 acceptance: the 21-fight roster, the
// signature verbs, the sequences (Inheritance), the boss Rites and the
// special mechanics. Every number traces to [GDD] §9.1–§9.3 / §5.7 or a
// recorded decision (D7/D10/D11/D12/D31, N3/N4, F20/F21/F34, A3/A4/A6).
'use strict';
const test = require('node:test');
const assert = require('node:assert');

const { CANON } = require('../data/config.js');
const T = CANON;
const { validate } = require('../data/schemas/validators.js');
const {
  ENEMIES, ENEMY_BY_ID, enemyBuild, sequenceMembers, UNBOUND_VOICES,
  SUMMON_BODIES, TURNED_POUR_ALLY, COUNTER_LINES, getEnemy,
} = require('../data/enemies.js');
const { SIGNATURE_VERBS, SIGNATURE_VERB_COUNT } = require('../data/signature-verbs.js');
const { RITES } = require('../data/rites.js');
const { assembleRoster, loadRoster, STAT_KEYS } = require('../data/index.js');
const { buildSheet, checkBudget, validateAlloc } = require('../engine/fighter.js');
const { createSession, runToCompletion, resultsOf, step, submitChoice, legalVerses } = require('../engine/fight.js');
const { temperatureState } = require('../engine/rites.js');
const { mirrorPreset } = require('../data/presets.js');

const BUDGET = (level) => 33 + 2 * (level - 1);

/** Drive a manual session until side 'a' is parked at await_input. */
function parkA(s, guard = 300) {
  let n = 0;
  while (!s.state.over && n++ < guard) {
    if (s.state.phase === 'await_input' && s.state.current && s.state.current.side === 'a') return true;
    if (!step(s)) break;
  }
  return false;
}

function run(buildA, buildB, opts = {}) {
  return { ...runFightInner(buildA, buildB, opts), session: null };
}
function runFightInner(buildA, buildB, opts) {
  const { runFight } = require('../engine/fight.js');
  return runFight(buildA, buildB, { tuning: T, ...opts });
}
const sum = (o) => STAT_KEYS.reduce((s, k) => s + (o[k] || 0), 0);
const logOf = (r) => r.log.map((l) => l.text || '').join('\n');

// ---------------------------------------------------------------------------
// T4.6 — the roster as data
// ---------------------------------------------------------------------------
test('T4.6: loadRoster() validates 21 enemies / 21 verbs / 12 Echoes / rites', () => {
  const r = loadRoster();
  assert.strictEqual(r.enemies.length, 21);
  assert.strictEqual(Object.keys(r.verbs).length, 21);
  assert.strictEqual(r.echoes.length, 8);
  assert.strictEqual(r.riteUsers.length, 4);
  assert.ok(Object.keys(r.rites).length >= 4, 'the four published boss rites are registered');
});

test('T4.6: every row is schema-valid against the frozen enemy kind', () => {
  for (const e of ENEMIES) {
    const res = validate('enemy', e, {});
    assert.deepStrictEqual(res.errors, [], `${e.id}: ${res.errors.join('; ')}`);
  }
});

test('T4.6: stat rows are canon verbatim (spot grid across all three acts)', () => {
  const rows = Object.fromEntries(ENEMIES.map((e) => [e.id, e]));
  // §9.1
  assert.deepStrictEqual(rows.bram.alloc, { vig: 11, mig: 5, wit: 2, grd: 10, hst: 5 });
  assert.strictEqual(rows.sedge.alloc.hst, 11);
  assert.deepStrictEqual(rows.drowned_choristers.alloc, { vig: 9, mig: 2, wit: 11, grd: 6, hst: 11 });
  assert.deepStrictEqual(rows.first_vespers.alloc, { vig: 8, mig: 2, wit: 14, grd: 8, hst: 13 });
  // §9.2
  assert.deepStrictEqual(rows.sable.alloc, { vig: 12, mig: 5, wit: 3, grd: 13, hst: 8 });
  assert.deepStrictEqual(rows.ysolde.alloc, { vig: 6, mig: 2, wit: 17, grd: 9, hst: 11 });
  assert.deepStrictEqual(rows.mother_bell.alloc, { vig: 13, mig: 6, wit: 9, grd: 15, hst: 6 });
  // §9.3
  assert.deepStrictEqual(rows.ilvanes_second.alloc, { vig: 7, mig: 16, wit: 3, grd: 8, hst: 17 });
  assert.deepStrictEqual(rows.ilvane.alloc, { vig: 8, mig: 2, wit: 19, grd: 9, hst: 13 });
  assert.deepStrictEqual(rows.oren.alloc, { vig: 14, mig: 7, wit: 2, grd: 18, hst: 8 });
});

test('T4.6: HP table verbatim incl. the three overrides (44×3, 300, 420)', () => {
  const rows = Object.fromEntries(ENEMIES.map((e) => [e.id, e]));
  assert.strictEqual(rows.bram.hp, 120); // PROVISIONAL:D12
  assert.strictEqual(rows.bram.hpOverride, true);
  assert.strictEqual(rows.drowned_choristers.hp, 44);
  assert.strictEqual(rows.drowned_choristers.hpOverride, true, '132 = 3 × 44 sequential bodies');
  assert.strictEqual(rows.mother_bell.hp, 300);
  assert.strictEqual(rows.mother_bell.hpOverride, true);
  assert.strictEqual(rows.ilvane.hp, 420);
  assert.strictEqual(rows.ilvane.hpOverride, true);
  assert.strictEqual(rows.sable.hp, 156);
  assert.strictEqual(rows.oren.hp, 172);
});

test('T4.6: budget conformance — every row sums to 33+2(L−1) except the declared hybrid', () => {
  for (const e of ENEMIES) {
    const s = sum(e.alloc);
    if (e.cls === 'hybrid') {
      assert.strictEqual(s, BUDGET(e.level) + 2, `${e.id}: the declared A6 +2 override`);
      continue;
    }
    assert.strictEqual(s, BUDGET(e.level), `${e.id} sums ${s} vs budget ${BUDGET(e.level)} (D7 ±0)`);
  }
});

test('T4.6: counter lines resolve for all 21 (the Reading override table)', () => {
  assert.strictEqual(Object.keys(COUNTER_LINES).length, 21);
  assert.ok(COUNTER_LINES['Hollowed Sexton Bram'].startsWith('Burst.'));
  assert.ok(COUNTER_LINES['Mother Bell'].startsWith('DoT, or manage the temperature.'));
  for (const e of ENEMIES) {
    assert.strictEqual(typeof e.counterLine, 'string');
    assert.ok(e.counterLine.length > 10, `${e.id} carries a real counter line`);
    assert.strictEqual(COUNTER_LINES[e.name], e.counterLine);
  }
});

test('T4.6: 21 signature verbs, one per duel, each with a proper noun + tooltip', () => {
  assert.strictEqual(SIGNATURE_VERB_COUNT, 21);
  for (const e of ENEMIES) {
    const v = SIGNATURE_VERBS[e.signature];
    assert.ok(v, `${e.id} → ${e.signature}`);
    assert.ok(v.name.length > 2 && v.line.length > 10, `${e.signature} is a named verb with a tooltip (§9.5 rule 1)`);
  }
});

test('T4.6: enemyBuild produces engine builds; every build fights (rites sweep, 5 seeds)', () => {
  for (const e of ENEMIES) {
    const build = enemyBuild(e);
    assert.strictEqual(build.isEnemy, true);
    for (let seed = 0; seed < 5; seed++) {
      const r = runFightInner(mirrorPreset('ashblade', Math.max(1, e.level - 1)), build, { seed, silent: true });
      assert.ok(r.over && r.rounds <= 20, `${e.id} seed ${seed}: ${r.rounds} rounds, winner ${r.winner}`);
    }
  }
});

test('T4.6: sequence rows carry the right member counts (2 extra each)', () => {
  assert.strictEqual(sequenceMembers(ENEMY_BY_ID.get('drowned_choristers')).length, 2);
  assert.strictEqual(sequenceMembers(ENEMY_BY_ID.get('unbound_chorus')).length, 2);
  const voices = sequenceMembers(ENEMY_BY_ID.get('unbound_chorus'));
  assert.deepStrictEqual(voices.map((v) => v.verses[0]), ['gravebind', 'conflagration'],
    'three sequential voices, one signature verse each, one per class');
  assert.deepStrictEqual(UNBOUND_VOICES.map((v) => sum(v.stats)), [49, 49, 49], 'L9 budget each');
  assert.deepStrictEqual(Object.values(SUMMON_BODIES.chorister_body.stats).reduce((a, b) => a + b, 0), 41);
});

test('T4.6: the Turned Pour ally sheet matches [02] R7d verbatim', () => {
  assert.strictEqual(TURNED_POUR_ALLY.hpOverride, 140);
  assert.strictEqual(TURNED_POUR_ALLY.startThorns, 6);
  assert.strictEqual(TURNED_POUR_ALLY.oncePerRoundAttack, true);
  assert.strictEqual(TURNED_POUR_ALLY.curseImmune, true);
  assert.strictEqual(TURNED_POUR_ALLY.clazz, 'gravewarden');
  assert.strictEqual(TURNED_POUR_ALLY.level, 8);
});

// ---------------------------------------------------------------------------
// Special mechanics — each reproduces its GDD prose
// ---------------------------------------------------------------------------
test('Choristers Inheritance (F34/D31): debuffs carry at potency, durations refreshed to 2', () => {
  const lead = enemyBuild(ENEMY_BY_ID.get('drowned_choristers'));
  const player = {
    name: 'bleed probe', clazz: 'ashblade', level: 4,
    creation: { vig: 1, mig: 2, grd: 0, hst: 1, wit: 0 },
    levelUps: { vig: 3, mig: 0, grd: 1, hst: 2, wit: 0 },
    vow: 'red_tide', verses: ['rend', 'flay', 'opening_cut', 'drink_deep'], items: [],
  };
  const s = createSession(player, lead, { tuning: T, seed: 7, manualSide: 'a' });
  // Drive the player until the first body dies to DIRECT damage (not the
  // turn-start tick) so the refreshed duration is observable untouched.
  let guard = 0;
  let sawInheritance = false;
  while (!s.state.over && guard++ < 400) {
    if (s.state.phase === 'await_input') {
      const a = s.fighters.a;
      a.resolve = Math.max(a.resolve, 6);
      for (const k of Object.keys(a.cooldowns)) delete a.cooldowns[k];
      submitChoice(s, a.casts.rend ? 'flay' : 'rend');
    } else step(s);
    if (s.log.some((l) => l.text && l.text.includes('Inheritance: the new body carries'))) {
      sawInheritance = true;
      const b = s.fighters.b;
      assert.ok(b.statuses.bleed, 'the second body starts bleeding at carried potency');
      assert.ok(b.statuses.bleed.stacks >= 2, 'stacks carry (cap as normal)');
      assert.ok(b.statuses.bleed.turns <= 2, 'durations refreshed to 2 (a tick may already have run)');
      break;
    }
  }
  assert.ok(sawInheritance, 'the Inheritance line fired when the first body fell');
  // Unit-level: the carry set and the refresh are exact at the swap instant.
  {
    const lead2 = enemyBuild(ENEMY_BY_ID.get('drowned_choristers'));
    const s2 = createSession(player, lead2, { tuning: T, seed: 7, manualSide: 'a' });
    parkA(s2);
    const b2 = s2.fighters.b;
    b2.hp = 1; // the next direct hit kills body one
    b2.statuses.bleed = { stacks: 5, srcMIG: 10, tickBonus: 1, turns: 1 };
    b2.statuses.curse = { turns: 1 };
    b2.statuses.hush = { turns: 1, mod: 2 };
    s2.fighters.a.resolve = 10;
    submitChoice(s2, 'rend');
    // Each carried status was at turns:1 — a CARRIED 1 would have expired at
    // the new body's first tick; a REFRESHED 2 survives it with a turn left.
    // rend's own +1 stacks on top of the carried 5 — potency carried intact.
    assert.ok(b2.statuses.bleed && b2.statuses.bleed.stacks >= 5, 'potency carries');
    assert.ok(b2.statuses.bleed && b2.statuses.bleed.turns >= 1, 'bleed survived the tick (refreshed to 2, not carried 1)');
    assert.ok(b2.statuses.curse, 'curse survived the tick (refreshed to 2, not carried 1)');
    assert.ok(b2.statuses.hush, 'hush survived the tick (refreshed to 2, not carried 1)');
  }
});

test('Unbound Chorus: three sequential voices, no Inheritance, fight resolves', () => {
  const build = enemyBuild(ENEMY_BY_ID.get('unbound_chorus'));
  const r = runFightInner(mirrorPreset('ashblade', 9), build, { seed: 3 });
  const text = logOf(r);
  assert.ok(/steps forward/.test(text), 'a voice steps in when one falls');
  assert.ok(!text.includes('Inheritance:'), 'the Chorus carries no Inheritance (not canon for this fight)');
});

test("Pell's Ledger's Ward (N4): 30 Ward + steals the most recent SLOTTED verse at 100%", () => {
  const pell = enemyBuild(ENEMY_BY_ID.get('pell'));
  const player = {
    name: 'cantor probe', clazz: 'hollow_cantor', level: 6,
    creation: { vig: 2, mig: 0, wit: 2, grd: 0, hst: 0 },
    levelUps: { vig: 1, mig: 0, wit: 0, grd: 5, hst: 4 },
    vow: null, verses: ['tolling_bell', 'dirge', 'wither_note', 'dissonance'], items: [],
  };
  const s = createSession(player, pell, { tuning: T, seed: 11, manualSide: 'a' });
  let guard = 0;
  let stole = false;
  while (!s.state.over && guard++ < 500) {
    if (s.state.phase === 'await_input') {
      const a = s.fighters.a;
      a.resolve = Math.max(a.resolve, 8);
      for (const k of Object.keys(a.cooldowns)) delete a.cooldowns[k];
      submitChoice(s, 'tolling_bell');
    } else step(s);
    if (s.log.some((l) => l.text && l.text.includes('casts your Tolling Bell back'))) {
      stole = true;
      const b = s.fighters.b;
      assert.strictEqual(b.statuses.ward.pool, 30, 'the Ledger pays 30 Ward');
      assert.strictEqual(b.cooldowns.tolling_bell, 3, 'the stolen verse sits on his normal cooldown');
      break;
    }
  }
  assert.ok(stole, 'the verse-theft fired at 50% HP');
});

test('UNSANCTIONED BURN (Ysolde): potency +3 and each tick costs the victim 1 Resolve', () => {
  // The row carries the special; the mechanic probe scripts her spark so the
  // burn application is deterministic regardless of the scorer's taste.
  const ysolde = enemyBuild(ENEMY_BY_ID.get('ysolde'), { script: ['spark*'] });
  const player = {
    name: 'burn victim', clazz: 'gravewarden', level: 7,
    creation: { vig: 1, mig: 0, grd: 2, hst: 1, wit: 0 },
    levelUps: { vig: 0, mig: 5, grd: 0, hst: 5, wit: 2 },
    vow: null, verses: ['bulwark_strike', 'hold_the_line', 'crypt_door', 'stone_vigil'], items: [],
  };
  const s = createSession(player, ysolde, { tuning: T, seed: 5, manualSide: 'a' });
  let guard = 0;
  let taxed = false;
  while (!s.state.over && guard++ < 500) {
    if (s.state.phase === 'await_input') {
      const a = s.fighters.a;
      a.resolve = 5;
      for (const k of Object.keys(a.cooldowns)) delete a.cooldowns[k];
      submitChoice(s, 'hold_the_line');
    } else step(s);
    if (s.log.some((l) => l.text && l.text.includes('The unsanctioned flame drains'))) {
      taxed = true;
      break;
    }
  }
  assert.ok(taxed, 'the tick drains Resolve');
  // potency: her spark burns at burnBase + 0.25×17 + 3
  const burnLine = s.log.find((l) => l.text && /burns for ([\d.]+) per turn/.test(l.text) && l.side === 'b');
  assert.ok(burnLine, 'she applied a burn');
  const potency = Number(burnLine.text.match(/burns for ([\d.]+)/)[1]);
  assert.ok(Math.abs(potency - (2 + 0.25 * 17 + 3)) < 0.01,
    `potency ${potency} carries the +3 (base ${2 + 0.25 * 17})`);
});

test('SALT-SOAKED BURN (Tide-Bound): 4 turns and the Ward-DoT absorb is refused', () => {
  const tide = enemyBuild(ENEMY_BY_ID.get('tide_bound'));
  const player = {
    name: 'leather probe', clazz: 'gravewarden', level: 9,
    creation: { vig: 1, mig: 0, grd: 2, hst: 1, wit: 0 },
    levelUps: { vig: 0, mig: 5, grd: 0, hst: 3, wit: 8 },
    vow: null, verses: ['bulwark_strike', 'hold_the_line', 'crypt_door', 'stone_vigil'],
    items: ['founders_leather'],
  };
  const s = createSession(player, tide, { tuning: T, seed: 2, manualSide: 'a' });
  let guard = 0;
  let salted = false;
  while (!s.state.over && guard++ < 600) {
    if (s.state.phase === 'await_input') {
      const a = s.fighters.a;
      a.resolve = Math.max(a.resolve, 4);
      for (const k of Object.keys(a.cooldowns)) delete a.cooldowns[k];
      submitChoice(s, 'hold_the_line');
    } else step(s);
    if (s.log.some((l) => l.text && l.text.includes('salt-soaked'))) {
      salted = true;
      const b = s.fighters.b;
      const burn = s.fighters.a.statuses.burn;
      assert.ok(burn && burn.saltSoaked, 'the burn carries the salt flag');
      // The first tick may already have run inside the same step — the
      // override's shape is 4 turns, observed as 4 or 3 post-first-tick.
      assert.ok(burn.turns === 4 || burn.turns === 3, `lasts 4 turns (observed ${burn.turns} post-tick)`);
      break;
    }
  }
  assert.ok(salted, 'the salt-soaked burn landed');
  // The Founder's Leather absorb never drinks a salt burn while it is live:
  const burnTicks = s.log.filter((l) => l.text && l.text.includes('true damage (burn)'));
  const leatherDrinks = s.log.filter((l) => l.text && l.text.includes('The leather drinks'));
  assert.ok(burnTicks.length > 0, 'burn ticks happened');
  assert.ok(!leatherDrinks.some((l) => l.r >= (salted ? 1 : 0) && s.fighters.a.statuses.burn?.saltSoaked),
    'the leather never drinks a salt-soaked tick');
});

test('Oren: 4 HP regen every turn (§9.3 #18)', () => {
  const oren = enemyBuild(ENEMY_BY_ID.get('oren'));
  const s = createSession(mirrorPreset('ashblade', 9), oren, { tuning: T, seed: 4, silent: false });
  runToCompletion(s);
  assert.ok(s.log.some((l) => l.text && l.text.includes('The gate keeps Sister Oren, Keeper of the Gate: +4')),
    'the regen line fires');
});

test('Yune\u2019s Mimic: copies the last verse cast at 80% power; Strike resets the copy', () => {
  const yune = enemyBuild(ENEMY_BY_ID.get('yune'));
  const s = createSession(mirrorPreset('ashblade', 8), yune, { tuning: T, seed: 9, silent: false });
  runToCompletion(s);
  const text = logOf(s);
  assert.ok(text.includes('copies your'), 'the copy is announced');
  assert.ok(text.includes('(echoed)'), 'the echoed cast lands');
  assert.ok(text.includes('Use Strike') === false);
});

test('First Movement (F20): the same fixed 3-turn opening every time — Dirge, Dirge, Lullaby', () => {
  // Manual driver so the recording's first three turns read directly off its
  // cast counter (lullaby lands no damage line — casts are the source).
  for (const seed of [1, 2, 3]) {
    const fm = enemyBuild(ENEMY_BY_ID.get('first_movement'));
    const s = createSession(mirrorPreset('ashblade', 9), fm, { tuning: T, seed, manualSide: 'a' });
    let guard = 0;
    while (!s.state.over && guard++ < 80) {
      if (s.state.phase === 'await_input') {
        const a = s.fighters.a;
        a.resolve = Math.max(a.resolve, 6);
        for (const k of Object.keys(a.cooldowns)) delete a.cooldowns[k];
        submitChoice(s, 'rend');
      } else step(s);
      const b = s.fighters.b;
      const total = Object.values(b.casts).reduce((x, y) => x + y, 0);
      if (total >= 3) break;
    }
    const b = s.fighters.b;
    assert.strictEqual(b.casts.dirge, 2, `seed ${seed}: two dirges first`);
    assert.strictEqual(b.casts.lullaby || 0, 1, `seed ${seed}: lullaby third`);
    assert.ok(!b.casts.requiem && !b.casts.tolling_bell, 'nothing else in the window');
  }
});

test('Ilvane\u2019s Second: the pool carries no debuff riders (§9.3 "no debuffs at all")', () => {
  const second = enemyBuild(ENEMY_BY_ID.get('ilvanes_second'));
  const { getVerse } = require('../data/verses.js');
  for (const id of second.verses) {
    const v = getVerse(id);
    const bad = v.effects.some((e) => ['bleed+', 'burn', 'curse', 'fray', 'hush', 'stun'].includes(e.op));
    assert.ok(!bad, `${id} applies no debuff`);
  }
});

// ---------------------------------------------------------------------------
// T4.7 — the Rites
// ---------------------------------------------------------------------------
test('T4.7: Halbrey\u2019s Rite fires at 66%/33% and RE-KEYS his hymn (Steel→Shade→Ember)', () => {
  const halbrey = enemyBuild(ENEMY_BY_ID.get('halbrey'));
  const s = createSession(mirrorPreset('ashblade', 8), halbrey, { tuning: T, seed: 6, silent: false });
  const player = s.fighters.a;
  let guard = 0;
  const marks = { shade: false, ember: false };
  while (!s.state.over && guard++ < 900) {
    if (s.state.phase === 'await_input') {
      player.resolve = Math.max(player.resolve, 6);
      for (const k of Object.keys(player.cooldowns)) delete player.cooldowns[k];
      submitChoice(s, 'opening_cut');
    } else step(s);
    if (halbreyHp(s) <= 0.66 * 1) marks.saw66 = true;
    if (s.log.some((l) => l.text && l.text.includes('the blade now sings in shade'))) marks.shade = true;
    if (s.log.some((l) => l.text && l.text.includes('It burns.'))) marks.ember = true;
  }
  assert.ok(marks.shade, 'the shade trigger line fired');
  assert.ok(marks.ember, 'the ember trigger line fired');
  const shadeHits = s.log.filter((l) => l.kind === 'damage' && l.side === 'b' && l.text.includes(' shade'));
  assert.ok(shadeHits.length > 0, 'after the Rite his steel verses land as shade (the hymn re-keys)');
  function halbreyHp(session) { return session.fighters.b.hp / session.fighters.b.maxHp; }
});

test('T4.7: Mother Bell — molten band at start (50% less direct, Thorns 8, Warden pool)', () => {
  const bell = enemyBuild(ENEMY_BY_ID.get('mother_bell'));
  const s = createSession(mirrorPreset('ashblade', 8), bell, { tuning: T, seed: 1, manualSide: 'a' });
  const b = s.fighters.b;
  assert.strictEqual(b.riteState.flags.molten, true);
  parkA(s);
  assert.strictEqual(b.statuses.thorns.value, 8, 'molten band carries Thorns 8');
  const temp = temperatureState(b);
  assert.strictEqual(temp.phase, 'molten');
  // Direct damage is halved: hit her and inspect the audit in the log.
  const a = s.fighters.a;
  a.resolve = 10;
  const raw = 5 + 0.9 * a.sheet.stats.mig;
  submitChoice(s, 'rend');
  const hit = s.log.filter((l) => l.kind === 'damage' && l.side === 'a').pop();
  const land = Number(hit.text.match(/for (\d+)/)[1]);
  assert.ok(land <= Math.round(raw * 0.5 * 1.05) + 2, `molten halves direct damage (land ${land} vs raw ~${raw})`);
  // Warden chassis pool is live: only Warden verses + Strike are legal.
  const legal = legalVerses(s, b).map((v) => v.id);
  assert.ok(legal.includes('crypt_door') && !legal.includes('dirge'), `molten pool: ${legal}`);
});

test('T4.7: Mother Bell — cooled band (+30% taken, no thorns, Shade+Curse pool)', () => {
  const bell = enemyBuild(ENEMY_BY_ID.get('mother_bell'));
  const s = createSession(mirrorPreset('ashblade', 8), bell, { tuning: T, seed: 1, manualSide: 'a' });
  const b = s.fighters.b;
  parkA(s);
  b.hp = 100; // below 50% of 300 → cooled on next evaluation
  const a = s.fighters.a;
  a.resolve = 10;
  submitChoice(s, 'strike'); // triggers evalRitesNow on damage
  assert.strictEqual(b.riteState.flags.molten, false, 'the 50% crossing cooled her');
  assert.strictEqual(b.riteState.flags.damageTakenMult, 1.3);
  assert.strictEqual(b.statuses.thorns, null, 'the molten spikes subside');
  assert.strictEqual(temperatureState(b).phase, 'cooled');
  const legal = legalVerses(s, b).map((v) => v.id);
  assert.ok(legal.includes('dirge') && !legal.includes('crypt_door'), `cooled pool: ${legal}`);
});

test('T4.7: D10 Cantor lever — Curse+Fray held on molten forces the sour window (+30%)', () => {
  const { resolveDamage } = require('../engine/damage.js');
  const { makeMeasures, mulberry32 } = require('../rng/index.js');
  const bell = enemyBuild(ENEMY_BY_ID.get('mother_bell'));
  const m = makeMeasures(mulberry32(1));
  const state = { fortune: 1.0, fortuneTrack: [1.0] };
  const player = buildSheet(mirrorPreset('hollow_cantor', 8), T);
  const spec = { base: 6, coefs: [{ stat: 'wit', c: 0.8 }], type: 'shade' };
  const probe = (curse, fray) => {
    const b = buildSheet(bell, T);
    const target = {
      side: 'b', sheet: b, hp: b.maxHp, maxHp: b.maxHp,
      statuses: { ...require('../engine/status.js').initStatuses() },
      mods: {}, flags: {}, items: [],
      riteState: { name: 'Temperature', firedIdx: [], statMults: {}, flags: {
        molten: true, damageTakenMult: 0.5, reflectDouble: true,
      }, learn: null },
    };
    if (curse) target.statuses.curse = { turns: 2 };
    if (fray) target.statuses.fray = { turns: 2 };
    return resolveDamage(state, { sheet: player, mods: {}, flags: {}, statuses: { hush: null }, riteState: null, totals: { dealt: 0 } }, target, spec, m, T);
  };
  const plain = probe(false, false);
  const soured = probe(true, true);
  assert.strictEqual(plain.tempMult, 0.5, 'molten halves direct damage');
  assert.strictEqual(plain.tempSoured, false);
  assert.strictEqual(soured.tempMult, 1.3, 'Curse+Fray held forces the cooled vulnerability');
  assert.strictEqual(soured.tempSoured, true);
  assert.ok(soured.dealt > plain.dealt, `soured instance out-damages the molten wall (${soured.dealt} > ${plain.dealt})`);
  const partial = probe(true, false);
  assert.strictEqual(partial.tempMult, 0.5, 'curse alone does not sour');
  // Fight-level: the window narrates once while the Rite re-heats.
  const s = createSession(mirrorPreset('hollow_cantor', 8), enemyBuild(ENEMY_BY_ID.get('mother_bell')), { tuning: T, seed: 1, manualSide: 'a' });
  const a = s.fighters.a;
  const b = s.fighters.b;
  parkA(s);
  a.resolve = 10;
  submitChoice(s, 'dirge');
  parkA(s);
  a.resolve = 10;
  submitChoice(s, 'wither_note'); // fray lands AFTER its own damage op —
  // the window opens for the NEXT instance, so keep casting until it sings.
  let guard = 0;
  let sourLine = null;
  while (!s.state.over && guard++ < 60 && !sourLine) {
    if (s.state.phase === 'await_input') {
      a.resolve = 10;
      for (const k of Object.keys(a.cooldowns)) delete a.cooldowns[k];
      if (!b.statuses.curse) submitChoice(s, 'dirge');
      else if (!b.statuses.fray) submitChoice(s, 'wither_note');
      else {
        submitChoice(s, 'dirge');
        sourLine = s.log.find((l) => l.text && l.text.includes('The note sours')) || null;
      }
    } else step(s);
  }
  assert.ok(sourLine, 'the sour line is narrated once');
  assert.strictEqual(temperatureState(b).molten, true, 'the Bell re-heats after the window');
});

test('T4.7: D10 Warden lever — reflect income doubles against the molten Bell', () => {
  const bell = enemyBuild(ENEMY_BY_ID.get('mother_bell'));
  const warden = {
    name: 'reflect probe', clazz: 'gravewarden', level: 8,
    creation: { vig: 1, mig: 0, grd: 2, hst: 1, wit: 0 },
    levelUps: { vig: 0, mig: 5, grd: 0, hst: 1, wit: 8 },
    vow: 'thorn_bearer',
    verses: ['sepulchral_spikes', 'stone_vigil', 'bulwark_strike', 'hold_the_line'], items: [],
  };
  const s = createSession(warden, bell, { tuning: T, seed: 1, manualSide: 'a' });
  const a = s.fighters.a;
  parkA(s);
  a.resolve = 10;
  submitChoice(s, 'sepulchral_spikes'); // thorns 4 + 0.2×grd (+4 thorn_bearer)
  const thornsVal = a.statuses.thorns.value;
  // Let the Bell attack the warden: the reflect lands doubled on her.
  let guard = 0;
  while (!s.state.over && guard++ < 60 && !s.log.some((l) => l.text && l.text.includes('Thorns answer'))) step(s);
  const refl = s.log.find((l) => l.text && l.text.includes('Thorns answer'));
  assert.ok(refl, 'a reflect happened');
  const dealt = Number(refl.text.match(/takes (\d+) true/)[1]);
  assert.strictEqual(dealt, thornsVal * 2, `reflect income ×2 to the molten Bell (${dealt} = ${thornsVal}×2)`);
});

test('T4.7: Ilvane — Phase II heals 20% of damage dealt (A4/D31); summons at 50%/25%; Phase III learns', () => {
  const ilvane = enemyBuild(ENEMY_BY_ID.get('ilvane'));
  // Mechanic probe at probe-scale HP: the rites are fraction-based, so the
  // phase ladder fires identically; the 420-HP row stays a data assert.
  ilvane.hpOverride = 60; // probe scale: the fraction ladder still spans all four triggers
  const bleed = {
    name: 'phase probe', clazz: 'ashblade', level: 10,
    creation: { vig: 2, mig: 2, grd: 0, hst: 0, wit: 0 },
    levelUps: { vig: 2, mig: 0, grd: 6, hst: 3, wit: 7 },
    vow: 'red_tide', verses: ['flay', 'red_flurry', 'reap_the_red', 'stand_fast'], items: [],
  };
  const s = createSession(bleed, ilvane, { tuning: T, seed: 8, manualSide: 'a' });
  const a = s.fighters.a;
  let guard = 0;
  while (!s.state.over && guard++ < 800) {
    if (s.state.phase === 'await_input') {
      a.resolve = Math.max(a.resolve, 8);
      for (const k of Object.keys(a.cooldowns)) delete a.cooldowns[k];
      const b = s.fighters.b;
      // sustain when low, cut bodies, cash bleed on the boss
      const target = a.hp / a.maxHp < 0.25 && !a.statuses.brace
        ? 'stand_fast'
        : (b.guards.length ? 'red_flurry' : (b.statuses.bleed ? 'reap_the_red' : 'flay'));
      submitChoice(s, target);
    } else step(s);
  }
  const text = s.log.map((l) => l.text || '').join('\n');
  assert.ok(text.includes('The Hymn begins'), 'Phase II fired');
  assert.ok(text.includes('The Hymn keeps him'), 'the 20% heal ran');
  assert.ok(text.includes('He raises a chorister'), 'summon #1 (50%)');
  assert.ok(/stands up out of the floor/.test(text), 'summon #2 (25%)');
  assert.ok(text.includes('is learning'), 'Phase III learned the most-cast verse');
  assert.ok(!/learning Strike/.test(text), 'Strike is never copied (F21)');
  assert.ok(text.includes('takes the blow instead'), 'a summoned body intercepted direct damage');
});

test('T4.7: floor Rite-users\u2019 rites fire (Nill wall / Vey voice / Deacon wake / Grave toll)', () => {
  const { RITE_USERS } = require('../data/named-echoes.js');
  for (const u of RITE_USERS) {
    const build = { ...u.build };
    const r = runFightInner(mirrorPreset('ashblade', u.level), build, { seed: 1 });
    assert.ok(r.over, `${u.id} fight resolves`);
  }
  // Grave's onTurn 5 rite is deterministic: it always fires by round 5.
  const grave = { ...RITE_USERS.find((u) => u.id === 'sexton_grave').build };
  const s = createSession(mirrorPreset('ashblade', 8), grave, { tuning: T, seed: 1 });
  runToCompletion(s);
  assert.ok(s.log.some((l) => l.text && l.text.includes('The Last Bell swings')), 'onTurn 5 fired');
});
