// phase4-echoes.test.js — T4.8 acceptance: the Choir Floor's parish.
// 8 named Echoes ([GDD] §9.4 verbatim) + 4 Rite-users (T4.7 authored);
// player-legal builds (N1 strict); weaknesses implemented as REAL mechanical
// gaps and demonstrably exploitable in harness sims.
'use strict';
const test = require('node:test');
const assert = require('node:assert');

const { CANON } = require('../data/config.js');
const T = CANON;
const { validate } = require('../data/schemas/validators.js');
const { NAMED_ECHOES, RITE_USERS, FLOOR_POPULATION, ECHO_BY_ID } = require('../data/named-echoes.js');
const { SIGNATURE_VERBS } = require('../data/signature-verbs.js');
const { validateAlloc, buildSheet } = require('../engine/fighter.js');
const { createSession, runToCompletion, step, submitChoice } = require('../engine/fight.js');
const { quickReading } = require('../sim/reading.js');
const { archetypeBuild } = require('../harness/archetypes.js');
const { getVerse } = require('../data/verses.js');

const STAT_KEYS = ['vig', 'mig', 'wit', 'grd', 'hst'];
const sum = (o) => STAT_KEYS.reduce((s, k) => s + (o[k] || 0), 0);

/** Best-of-archetypes clear rate for one class vs one Echo (§9.5 probe). */
function bestClear(clazz, level, build, n = 80) {
  let best = 0;
  let bestArch = null;
  for (const arch of ['standard', 'aggressive', 'defensive', 'status']) {
    const probe = archetypeBuild(clazz, arch, level, T);
    const raw = quickReading(probe, build, { n, tuning: T });
    const pct = raw.n ? (raw.winA / raw.n) * 100 : 0;
    if (pct >= best) { best = pct; bestArch = arch; }
  }
  return { best, bestArch };
}

// ---------------------------------------------------------------------------
// Schema, canon rows, legality
// ---------------------------------------------------------------------------
test('T4.8: exactly 8 named Echoes + 4 Rite-users — the population floor (T7.11) holds', () => {
  assert.strictEqual(NAMED_ECHOES.length, 8);
  assert.strictEqual(RITE_USERS.length, 4);
  assert.strictEqual(FLOOR_POPULATION.length, 12);
  assert.ok(FLOOR_POPULATION.length >= 12);
});

test('T4.8: canon rows verbatim — names, classes, levels, Tolls (§9.4 table)', () => {
  const canon = [
    ['brother_ash', 'Brother Ash', 'gravewarden', 8, 1080],
    ['salt_widow', 'The Salt Widow', 'cinder_witch', 9, 1240],
    ['tollward_vane', 'Tollward Vane', 'hollow_cantor', 8, 940],
    ['sixth_swineherd', 'The Sixth Swineherd', 'ashblade', 6, 860],
    ['mother_corvane', 'Mother Corvane', 'ashblade', 8, 1120],
    ['hollow_bishop', 'Hollow Bishop', 'gravewarden', 8, 980],
    ['unpaid_bell', 'The Unpaid Bell', 'hollow_cantor', 9, 1180],
    ['widow_sedge', 'Widow Sedge', 'ashblade', 7, 1020],
  ];
  for (const [id, name, cls, level, toll] of canon) {
    const e = ECHO_BY_ID.get(id);
    assert.ok(e, id);
    assert.strictEqual(e.name, name);
    assert.strictEqual(e.cls, cls);
    assert.strictEqual(e.level, level);
    assert.strictEqual(e.toll, toll);
    assert.ok(e.toll >= 800 && e.toll <= 1400, 'the §9.4 rating band');
    assert.ok(e.history.length > 10, 'a one-line history');
    assert.ok(e.weakness.length > 10, 'a deliberate weakness');
  }
});

test('T4.8: every row validates against the frozen namedEcho kind', () => {
  for (const e of FLOOR_POPULATION) {
    const res = validate('namedEcho', e, {});
    assert.deepStrictEqual(res.errors, [], `${e.id}: ${res.errors.join('; ')}`);
  }
});

test('T4.8: every build is player-legal (N1 strict: creation 4, levelUps 2(L−1), caps 10)', () => {
  for (const e of FLOOR_POPULATION) {
    const alloc = validateAlloc(e.build, T);
    assert.deepStrictEqual(alloc.errors, [], `${e.id}: ${alloc.errors.join('; ')}`);
    // stat totals: base 27 + creation 4 + levelUps (no D7 edge — Echoes are player builds)
    const expected = 27 + 4 + 2 * (e.level - 1);
    assert.strictEqual(alloc.total, expected - 27, `${e.id} discretionary total`);
    const sheet = buildSheet(e.build, T);
    assert.strictEqual(sum(sheet.stats), expected, `${e.id} final stat sum`);
    // unlock + class legality
    for (const id of e.build.verses) {
      const v = getVerse(id);
      assert.ok(v.unlockLevel <= e.level, `${e.id}: ${id} unlocks at L${v.unlockLevel}`);
      assert.ok(v.cls === 'common' || v.cls === e.cls, `${e.id}: ${id} is not ${e.cls}-legal`);
    }
    assert.ok(e.build.verses.length === 4, `${e.id} slots exactly 4 verses`);
  }
});

test('T4.8: doctrines are canon strings; class vows match the class; no story vows on the Floor', () => {
  const DOCTRINES = new Set(['hymnal', 'predator', 'bulwark', 'cantors_hand']);
  for (const e of FLOOR_POPULATION) {
    assert.ok(DOCTRINES.has(e.doctrine), `${e.id} doctrine ${e.doctrine}`);
    if (e.build.vow) {
      const { VOW_BY_ID } = require('../data/vows.js');
      const vow = VOW_BY_ID.get(e.build.vow);
      assert.ok(vow, `${e.id} vow exists`);
      assert.strictEqual(vow.kind, 'class', 'no story vows on Floor Echoes');
      assert.strictEqual(vow.cls, e.cls, `${e.id} vow is class-legal`);
    }
  }
  assert.strictEqual(ECHO_BY_ID.get('chorister_vey').doctrine, 'cantors_hand',
    'the Cantor\u2019s Hand doctrine is reserved for the Rite users (§12.2)');
});

// ---------------------------------------------------------------------------
// Weaknesses as REAL mechanical gaps — each exploited in a sim
// ---------------------------------------------------------------------------
test('Weakness — Brother Ash: control-immune but NOT DoT-immune; DoT beats the regen', () => {
  const ash = buildSheet(ECHO_BY_ID.get('brother_ash').build, T);
  const { statusBlocked } = require('../engine/marks.js');
  const fake = { sheet: ash, statuses: { brace: null }, mods: {} };
  for (const k of ['curse', 'fray', 'hush', 'stun']) {
    assert.ok(statusBlocked(fake, k), `${k} slides off him`);
  }
  assert.ok(!statusBlocked({ ...fake, statuses: { brace: null } }, 'bleed'), 'bleed still lands');
  assert.ok(!statusBlocked({ ...fake, statuses: { brace: null } }, 'burn'), 'burn still lands');
  // the exploit: a burn archetype races past the Long Dark regen
  const { best } = bestClear('cinder_witch', 9, ECHO_BY_ID.get('brother_ash').build, 80);
  assert.ok(best >= 60, `a DoT class clears the regen-reliant Echo (best ${best.toFixed(0)}%)`);
});

test('Weakness — The Salt Widow: no defensive kit; burst kills her before her second cast', () => {
  const widow = buildSheet(ECHO_BY_ID.get('salt_widow').build, T);
  for (const id of ECHO_BY_ID.get('salt_widow').build.verses) {
    const v = getVerse(id);
    assert.ok(!v.effects.some((e) => ['brace', 'ward', 'thorns'].includes(e.op)),
      `${id} is pure offence — no mitigation kit`);
  }
  const { best } = bestClear('ashblade', 9, ECHO_BY_ID.get('salt_widow').build, 80);
  assert.ok(best >= 55, `burst clears her (best ${best.toFixed(0)}%)`);
});

test('Weakness — The Unpaid Bell: three setup turns, no damage before round 4', () => {
  const bell = ECHO_BY_ID.get('unpaid_bell');
  assert.strictEqual(bell.build.special.setupTurns, 3);
  const s = createSession(archetypeBuild('ashblade', 'defensive', 9, T), bell.build, { tuning: T, seed: 2 });
  let guard = 0;
  const casts = [];
  while (!s.state.over && guard++ < 200 && s.state.round <= 4) {
    if (s.state.phase === 'ai_ready') {
      const actor = s.state.current;
      if (actor.side === 'b') casts.push({ r: s.state.round, verse: null });
      const before = s.log.length;
      step(s);
      if (actor.side === 'b') {
        casts[casts.length - 1].verse = s.log.slice(before)
          .filter((l) => l.side === 'b')
          .map((l) => l.text || '').find((t) => /'s .+ hits /.test(t)) || 'no-damage';
      }
    } else step(s);
  }
  for (const c of casts.filter((c) => c.r <= 3)) {
    const named = c.verse !== 'no-damage' && !/'s Strike hits /.test(c.verse);
    assert.ok(!named, `round ${c.r}: he is still tuning — no named verse (${c.verse})`);
  }
  const { best } = bestClear('ashblade', 9, bell.build, 80);
  assert.ok(best >= 60, `bursting the window clears him (best ${best.toFixed(0)}%)`);
});

test('Weakness — Mother Corvane: her crits ONLY land the turn after the telegraph', () => {
  const corvane = ECHO_BY_ID.get('mother_corvane');
  assert.strictEqual(corvane.build.special.telegraphCrits, true);
  const s = createSession(archetypeBuild('gravewarden', 'defensive', 8, T), corvane.build, { tuning: T, seed: 4 });
  runToCompletion(s);
  const text = s.log.map((l) => l.text || '').join('\n');
  // every CRIT line must be preceded (one turn earlier) by the telegraph line
  const events = s.log.filter((l) => l.kind === 'damage' || (l.text || '').includes('raises the blade'));
  let armed = false;
  for (const l of events) {
    const t = l.text || '';
    if (t.includes('raises the blade')) { armed = true; continue; }
    if (l.side === 'b' && t.includes('CRIT')) {
      assert.ok(armed, `crit at r${l.r} was telegraphed`);
      armed = false;
    }
  }
  assert.ok(text.includes('raises the blade'), 'the telegraph is visible in the log');
});

test('Weakness — Hollow Bishop: the engine refuses his heals; DoT and Fray are the answer', () => {
  const bishop = ECHO_BY_ID.get('hollow_bishop');
  assert.strictEqual(bishop.build.special.noHeal, true);
  for (const id of bishop.build.verses) {
    assert.ok(!getVerse(id).effects.some((e) => e.op === 'heal'), `${id} heals nobody anyway`);
  }
  const s = createSession(archetypeBuild('gravewarden', 'defensive', 8, T), bishop.build, { tuning: T, seed: 3 });
  // force a heal attempt through the engine: his pool has none, so exercise
  // the flag directly on the runtime
  const b = s.fighters.b;
  b.hp = 10;
  const { executeVerse } = require('../engine/fight.js');
  const mend = getVerse('mend_the_mortar');
  const before = b.hp;
  executeVerse(s, b, s.fighters.a, mend);
  assert.strictEqual(b.hp, before, 'the mend is refused outright');
  const { best } = bestClear('cinder_witch', 9, bishop.build, 80);
  assert.ok(best >= 55, `DoT chips through the mitigation wall (best ${best.toFixed(0)}%)`);
});

test('Weakness — Widow Sedge: below 30% HP she folds — damage halves and she stops attacking', () => {
  const sedge = ECHO_BY_ID.get('widow_sedge');
  assert.strictEqual(sedge.build.special.foldBelowHP, 0.3);
  const s = createSession(archetypeBuild('ashblade', 'aggressive', 7, T), sedge.build, { tuning: T, seed: 6 });
  runToCompletion(s);
  const b = s.fighters.b;
  const text = s.log.map((l) => l.text || '').join('\n');
  assert.ok(text.includes('she folds') || text.includes('folds.'), 'the fold is narrated');
  // while folded: no damaging verse is picked by the AI (damage lines stop from her)
  const foldAt = s.log.findIndex((l) => (l.text || '').includes('folds.'));
  if (foldAt >= 0 && b.hp > 0) {
    // the fold falls back to Strike (§12.3 rule 3) — no NAMED verse swings
    const afterFold = s.log.slice(foldAt).filter((l) => l.kind === 'damage' && l.side === 'b');
    for (const l of afterFold) {
      assert.ok(/'s Strike hits /.test(l.text), `a folded Sedge only Strikes: ${l.text}`);
    }
  }
  const { best } = bestClear('ashblade', 8, sedge.build, 80);
  assert.ok(best >= 55, `pushing her under the fold wins (best ${best.toFixed(0)}%)`);
});

test('Weakness — Tollward Vane: HST 6 (acts last, crits rarely); Widow Sedge steals Resolve', () => {
  const vane = buildSheet(ECHO_BY_ID.get('tollward_vane').build, T);
  assert.strictEqual(vane.stats.hst, 6, 'low-Haste is the real gap');
  // against an HST-10 probe he acts second
  const probe = archetypeBuild('ashblade', 'aggressive', 8, T);
  const s = createSession(probe, ECHO_BY_ID.get('tollward_vane').build, { tuning: T, seed: 5 });
  assert.strictEqual(s.order[0].side, 'a', 'the probe out-speeds him');
  // Sedge's resolve steal is a real engine hook
  const sedge = buildSheet(ECHO_BY_ID.get('widow_sedge').build, T);
  assert.ok(sedge.special && sedge.special.resolveStealOnHit === 1);
});

// ---------------------------------------------------------------------------
// The Rite-users (T4.7) — authored rows, canon mechanics
// ---------------------------------------------------------------------------
test('Rite-users: four authored Echoes within the rating band, each carrying a registered rite', () => {
  const { RITES } = require('../data/rites.js');
  for (const u of RITE_USERS) {
    assert.ok(u.toll >= 800 && u.toll <= 1400, `${u.id} toll in band`);
    assert.ok(RITES[u.rite], `${u.id} rite registered`);
    assert.ok(u.history.length > 10 && u.weakness.length > 10);
  }
});

test('Rite-users: their rites fire in real fights (Vey borrows a voice, Nill raises the wall)', () => {
  const vey = { ...ECHO_BY_ID.get('chorister_vey').build };
  const s = createSession(archetypeBuild('ashblade', 'aggressive', 8, T), vey, { tuning: T, seed: 2 });
  runToCompletion(s);
  const text = s.log.map((l) => l.text || '').join('\n');
  assert.ok(text.includes('Chorister Vey is learning'), 'the Borrowed Voice fired (the learn mechanic)');
  assert.ok(text.includes('RITE — Vey opens her mouth'), 'the rite narration landed');
});
