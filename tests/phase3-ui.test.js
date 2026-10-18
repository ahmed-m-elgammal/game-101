// tests/phase3-ui.test.js — Phase 3: Combat UI & First Playable Slice.
// Node-tested surface: ui-logic (the CJS mirror of ui/logic.js), the §10.7
// verdict table cross-checked against the engine, D18 calibration, the hint
// machine, scene shaping + the `scene` schema kind, the scripted-opener hook
// (ENG-9), the Reading data binding, and the T3.2/T3.3 asset + XSS gates.
// The DOM components themselves are verified in the browser (boot.js
// ?selftest=1 — fixed-seed state-sequence equality) per the T3.3 acceptance.
'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const {
  barPct, pipStates, waxGeom, WAX_MIN, WAX_MAX, versePreview, logClass,
  threatFor, CLASS_THREATS, THREAT_OVERRIDES, formatReading, verdictOf,
  calibrationFor, nextHint, HINTS, sceneShape, TALLIES, STATUS_GLYPHS, STATUS_COLORS,
} = require('../ui-logic.js');
const { createSession, runFight, resultsOf, ledgerVerdict } = require('../engine/fight.js');
const { L1_ASHBLADE, BRAM } = require('../data/presets.js');
const { CANON } = require('../data/config.js');
const { runReading } = require('../sim/readingCache.js');
const { validate } = require('../data/schemas/validators.js');
const fixtures = require('../data/schemas/fixtures.json');
const { CH1_OPENING } = require('../ui-scene-fixture.cjs');

const ROOT = path.resolve(__dirname, '..');

// ---------------------------------------------------------------------------
// 1. §11.5 primitives: HP bar, Resolve pips, Wax Meter geometry
// ---------------------------------------------------------------------------

test('barPct: clamps and degenerate inputs', () => {
  assert.strictEqual(barPct(50, 100), 50);
  assert.strictEqual(barPct(0, 100), 0);
  assert.strictEqual(barPct(108, 108), 100);
  assert.strictEqual(barPct(-5, 100), 0);
  assert.strictEqual(barPct(150, 100), 100);
  assert.strictEqual(barPct(50, 0), 0);
  assert.strictEqual(barPct(NaN, 100), 0);
  assert.strictEqual(barPct(50, NaN), 0);
});

test('pipStates: ten pips, full/partial/empty at fractional resolve', () => {
  assert.strictEqual(pipStates(0).length, 10);
  assert.ok(pipStates(10).every((p) => p.state === 'full'));
  assert.ok(pipStates(0).every((p) => p.state === 'empty'));
  const mid = pipStates(3.4);
  assert.strictEqual(mid.slice(0, 3).filter((p) => p.state === 'full').length, 3);
  assert.strictEqual(mid[3].state, 'partial');
  assert.strictEqual(mid[3].pct, 40);
  assert.strictEqual(mid.slice(4).every((p) => p.state === 'empty'), true);
  // out-of-domain resolve clamps, never throws
  assert.ok(pipStates(-2).every((p) => p.state === 'empty'));
  assert.ok(pipStates(11).every((p) => p.state === 'full'));
  assert.ok(pipStates(NaN).every((p) => p.state === 'empty'));
});

test('waxGeom: rail math, clamps, extremes glow', () => {
  assert.strictEqual(waxGeom(1.0).pct, 50);
  assert.strictEqual(waxGeom(WAX_MIN).pct, 0);
  assert.strictEqual(waxGeom(WAX_MAX).pct, 100);
  const cold = waxGeom(0.5); // below rail
  assert.strictEqual(cold.pct, 0);
  assert.strictEqual(cold.clampedLow, true);
  const hot = waxGeom(9);
  assert.strictEqual(hot.pct, 100);
  assert.strictEqual(hot.clampedHigh, true);
  assert.strictEqual(waxGeom(1.11).hot, true);
  assert.strictEqual(waxGeom(1.09).hot, false);
  assert.strictEqual(waxGeom(0.89).cold, true);
  assert.strictEqual(waxGeom(0.91).cold, false);
  assert.strictEqual(waxGeom(NaN).value, 1); // reset contract renders at start value
});

// ---------------------------------------------------------------------------
// 2. Verse buttons: preview row + log gutter classes
// ---------------------------------------------------------------------------

test('versePreview: op-code → preview chips', () => {
  const rend = { id: 'rend', effects: [{ op: 'damage', type: 'steel' }, { op: 'bleed+', stacks: 1 }] };
  assert.deepStrictEqual(versePreview(rend).map((p) => p.label), ['steel', '+1 bleed']);
  const strike = { id: 'strike', isStrike: true, effects: [{ op: 'damage', type: 'main' }] };
  assert.deepStrictEqual(versePreview(strike).map((p) => p.label), ['refund +1', 'strike']);
  const standFast = { id: 'stand_fast', effects: [{ op: 'brace' }, { op: 'ward+', value: 6 }] };
  assert.deepStrictEqual(versePreview(standFast).map((p) => p.label), ['brace', '+6 ward']);
  const vigils = { id: 'vigils_rest', effects: [{ op: 'resolve', amount: 4 }, { op: 'cleanse', count: 1 }] };
  assert.deepStrictEqual(versePreview(vigils).map((p) => p.label), ['+4 resolve', 'cleanse']);
  assert.deepStrictEqual(versePreview(null), []);
  assert.deepStrictEqual(versePreview({ effects: 'garbage' }), []);
});

test('logClass: kind + damage-type colour mapping (§11.5 border)', () => {
  assert.strictEqual(logClass({ kind: 'damage', color: 'steel' }), 'log-entry--damage-steel');
  assert.strictEqual(logClass({ kind: 'damage', color: 'ember' }), 'log-entry--damage-ember');
  assert.strictEqual(logClass({ kind: 'damage', color: 'shade' }), 'log-entry--damage-violet');
  assert.strictEqual(logClass({ kind: 'damage', color: 'true' }), 'log-entry--damage-true');
  assert.strictEqual(logClass({ kind: 'damage' }), 'log-entry--damage-steel'); // default neutral
  assert.strictEqual(logClass({ kind: 'prose' }), 'log-entry--prose');
  assert.strictEqual(logClass({ kind: 'heal' }), 'log-entry--heal');
  assert.strictEqual(logClass({ kind: 'stun' }), 'log-entry--info'); // unmapped kinds fall to neutral
  assert.strictEqual(logClass(null), 'log-entry--info');
});

// ---------------------------------------------------------------------------
// 3. §5.8 the Reading: threat lines + formatting + D2 honesty
// ---------------------------------------------------------------------------

test('threatFor: class archetype table, name override, fallback', () => {
  assert.strictEqual(threatFor({ clazz: 'hollow_cantor' }), CLASS_THREATS.hollow_cantor);
  assert.strictEqual(threatFor({ clazz: 'gravewarden', name: 'Hollowed Sexton Bram' }), THREAT_OVERRIDES['Hollowed Sexton Bram']);
  assert.strictEqual(threatFor({ clazz: 'nope' }), 'It is what it is. The Reading has no better line.');
  assert.strictEqual(threatFor(null), CLASS_THREATS.ashblade);
  // every class row exists and every row is a non-empty string
  for (const c of ['ashblade', 'cinder_witch', 'gravewarden', 'hollow_cantor']) {
    assert.strictEqual(typeof CLASS_THREATS[c], 'string');
    assert.ok(CLASS_THREATS[c].length > 8);
  }
});

test('formatReading: the §10.8 card contents, binding the sim exactly', () => {
  const reading = runReading(L1_ASHBLADE, BRAM, { n: 40, tuning: CANON });
  const view = formatReading(reading, L1_ASHBLADE, BRAM, 'ABCD-1234');
  assert.strictEqual(view.head, 'Hollowed Sexton Bram · Gravewarden · L1');
  assert.ok(view.threat.includes('refuses to die'));
  // the displayed win % matches the sim cache exactly (T3.5 acceptance)
  assert.ok(view.expect.includes(`Expected: ${Math.round(reading.winAPct)}% win`));
  assert.ok(view.expect.includes(`~${Math.round(reading.avgRounds * 10) / 10} rounds`));
  assert.ok(view.expect.includes(reading.counterLine));
  assert.strictEqual(view.seed, 'MEASURE ABCD-1234');
  assert.strictEqual(view.sync, null); // L1 vs L1 — no sync band, no note
});

test('formatReading: D2 sync honesty note only when a band is active', () => {
  const reading = { winAPct: 50, avgRounds: 9, counterLine: null };
  const withSync = formatReading(reading, {}, { name: 'X', className: 'Ashblade', level: 4, clazz: 'ashblade' }, 'SEED', 2);
  assert.ok(withSync.sync.includes('soft sync'));
  assert.ok(withSync.expect.startsWith('Expected: 50% win'));
  const noSync = formatReading(reading, {}, { name: 'X', className: 'Ashblade', level: 4, clazz: 'ashblade' }, 'SEED', 0);
  assert.strictEqual(noSync.sync, null);
  // degenerate reading — never crashes the card
  const empty = formatReading(null, {}, { name: 'X', className: 'C', level: 1, clazz: 'ashblade' }, null);
  assert.strictEqual(empty.expect, 'Expected: —');
  assert.strictEqual(empty.seed, null);
});

// ---------------------------------------------------------------------------
// 4. §10.7 the Ledger: verdict table — UI mirror ≡ engine verdict
// ---------------------------------------------------------------------------

test('verdictOf ≡ engine.ledgerVerdict on the full outcome grid (§10.7 table)', () => {
  const fortunes = [0.88, 0.9799, 0.98, 0.981, 1.0, 1.0199, 1.02, 1.12];
  const expecteds = [null, 0.5, 0.6999, 0.7, 0.9];
  for (const winner of ['a', 'b', null]) {
    for (const f of fortunes) {
      for (const exp of expecteds) {
        const result = { winner, fortune: f };
        assert.strictEqual(
          verdictOf(result, 'a', exp).text,
          ledgerVerdict(result, 'a', exp),
          `divergence at winner=${winner} f=${f} exp=${exp}`
        );
      }
    }
  }
});

test('verdictOf: the five canon rows + D23 link key', () => {
  assert.strictEqual(verdictOf({ winner: 'a', fortune: 1.0 }, 'a', 0.5).key, 'level');
  assert.strictEqual(verdictOf({ winner: 'a', fortune: 0.9 }, 'a', 0.5).key, 'cold-won');
  assert.strictEqual(verdictOf({ winner: 'a', fortune: 1.1 }, 'a', 0.5).key, 'hot-won');
  assert.strictEqual(verdictOf({ winner: 'b', fortune: 0.9 }, 'a', 0.75).key, 'favored-lost');
  assert.strictEqual(verdictOf({ winner: 'b', fortune: 0.9 }, 'a', 0.5).key, 'cold-lost');
  assert.strictEqual(verdictOf({ winner: 'b', fortune: 1.0 }, 'a', 0.5).key, 'lost-lesson');
  // D23 wording is the re-worded line, and "open it" is the Reading link
  const favored = verdictOf({ winner: 'b', fortune: 1.0 }, 'a', 0.8);
  assert.strictEqual(favored.text, 'You were favored and lost. The Reading knows why — open it.');
});

// ---------------------------------------------------------------------------
// 5. D18 calibration line ([04] §5)
// ---------------------------------------------------------------------------

test('calibrationFor: only after 10, only when the claim is true', () => {
  const clear = (expected, won) => ({ expected, won });
  assert.strictEqual(calibrationFor([]), null);
  assert.strictEqual(calibrationFor([clear(0.8, true)]), null);
  // 9 fights — not yet
  assert.strictEqual(calibrationFor(Array(9).fill(clear(0.8, true))), null);
  // one called-clear fight lost → the claim is false → silence
  const mixed = Array(10).fill(clear(0.8, true)); mixed[3] = clear(0.8, false);
  assert.strictEqual(calibrationFor(mixed), null);
  // no clear calls in the window → nothing to claim
  assert.strictEqual(calibrationFor(Array(10).fill(clear(0.5, true))), null);
  // base line: every called-clear fight won
  const base = Array(10).fill(clear(0.85, true));
  base[1] = clear(0.45, false); base[2] = clear(0.5, false);
  assert.strictEqual(calibrationFor(base), 'Your wins cluster where the Reading is uncertain. Fights it calls clear, you clear.');
  // strong variant: also won at least half the uncertain toss-ups (≥2 of them)
  const strong = Array(10).fill(clear(0.85, true));
  strong[1] = clear(0.45, true); strong[2] = clear(0.55, true); strong[3] = clear(0.5, false);
  assert.strictEqual(calibrationFor(strong), 'You know what the Reading knows.');
  // history longer than 10: the window is the LAST 10 (length 20 = 2 windows)
  const long = [...Array(10).fill(clear(0.8, false)), ...Array(10).fill(clear(0.8, true))];
  assert.strictEqual(calibrationFor(long), 'Your wins cluster where the Reading is uncertain. Fights it calls clear, you clear.');
  // boundary: expected exactly 0.7 counts as called-clear
  const at = Array(10).fill(clear(0.7, true));
  assert.strictEqual(calibrationFor(at), 'Your wins cluster where the Reading is uncertain. Fights it calls clear, you clear.');
  // malformed input never throws
  assert.strictEqual(calibrationFor(null), null);
  assert.strictEqual(calibrationFor('nope'), null);
});

// ---------------------------------------------------------------------------
// 6. T3.6 hint layer: Maren teaches once, dismissable, non-blocking
// ---------------------------------------------------------------------------

test('nextHint: ordered, once-only, stateless-pure', () => {
  const first = nextHint({}, { type: 'fight_start' });
  assert.strictEqual(first.id, 'reading');
  assert.strictEqual(first.text, HINTS.reading);
  const second = nextHint(first.seen, { type: 'fight_start' });
  assert.strictEqual(second.id, 'verbs');
  assert.strictEqual(nextHint(second.seen, { type: 'fight_start' }), null);
  // first_choice prefers verbs (the player acted before reading the card)
  const fromChoice = nextHint({}, { type: 'first_choice' });
  assert.strictEqual(fromChoice.id, 'verbs');
  // enemy events teach the wall
  const brace = nextHint({}, { type: 'enemy_brace' });
  assert.strictEqual(brace.id, 'brace');
  const ward = nextHint({}, { type: 'enemy_ward' });
  assert.strictEqual(ward.id, 'ward');
  assert.strictEqual(nextHint(brace.seen, { type: 'enemy_brace' }), null); // once-only
  assert.strictEqual(nextHint({}, { type: 'unknown_event' }), null);
  // purity: the input seen object is never mutated
  const frozen = {};
  nextHint(frozen, { type: 'fight_start' });
  assert.deepStrictEqual(frozen, {});
});

// ---------------------------------------------------------------------------
// 7. T3.9 scene nodes + the `scene` schema kind
// ---------------------------------------------------------------------------

test('sceneShape: the Ch1 fixture node shapes cleanly, defaults applied', () => {
  const shaped = sceneShape(CH1_OPENING);
  assert.strictEqual(shaped.id, 'ch1_open');
  assert.strictEqual(shaped.prose.length, CH1_OPENING.prose.length);
  assert.strictEqual(shaped.prose[1].spoken, true);
  assert.strictEqual(shaped.prose[0].spoken, false);
  assert.strictEqual(shaped.choices.length, 3);
  assert.strictEqual(shaped.duelId, 'tutorial_bram');
  // canonical tallies agree with the frozen validator enum
  assert.deepStrictEqual([...TALLIES].sort(), ['devotion', 'mercy', 'ruthless']);
});

test('sceneShape: malformed nodes throw before any DOM exists', () => {
  assert.throws(() => sceneShape(null), TypeError);
  assert.throws(() => sceneShape({ id: 'x' }), TypeError); // no chapter/heading/prose
  assert.throws(() => sceneShape({ id: 'x', chapter: 'c', heading: 'h', prose: [{}] }), TypeError);
  assert.throws(() => sceneShape({ id: 'x', chapter: 'c', heading: 'h', prose: [{ text: 'ok' }], choices: [{ label: 'a', tally: 'greed' }] }), /not a canon tally/);
  assert.throws(() => sceneShape({
    id: 'x', chapter: 'c', heading: 'h', prose: [{ text: 'ok' }],
    choices: [1, 2, 3, 4].map((i) => ({ label: `c${i}`, tally: 'mercy' })),
  }), /at most 3/);
  // choice ids default deterministically when absent
  const shaped = sceneShape({ id: 'x', chapter: 'c', heading: 'h', prose: [{ text: 'ok' }], choices: [{ label: 'a', tally: 'mercy' }] });
  assert.strictEqual(shaped.choices[0].id, 'x_choice_0');
});

test('schema kind `scene`: fixture validates; mutations rejected', () => {
  const res = validate('scene', fixtures.scene, {});
  assert.deepStrictEqual(res, { ok: true, errors: [] });
  const noProseText = JSON.parse(JSON.stringify(fixtures.scene));
  delete noProseText.prose[0].text;
  assert.strictEqual(validate('scene', noProseText, {}).ok, false);
  const fourChoices = JSON.parse(JSON.stringify(fixtures.scene));
  fourChoices.choices.push({ id: 'x4', label: 'a fourth way', tally: 'mercy' });
  assert.ok(validate('scene', fourChoices, {}).errors.some((e) => e.includes('at most 3')));
  const badTally = JSON.parse(JSON.stringify(fixtures.scene));
  badTally.choices[0].tally = 'greed';
  assert.ok(validate('scene', badTally, {}).errors.some((e) => e.includes('tally')));
  const missingHeading = { ...fixtures.scene };
  delete missingHeading.heading;
  assert.strictEqual(validate('scene', missingHeading, {}).ok, false);
});

// ---------------------------------------------------------------------------
// 8. ENG-9 scripted opener: Bram spikes on turn 1, then the scorer
// ---------------------------------------------------------------------------

test('scripted opener: the tutorial enemy opens with Sepulchral Spikes (§9.1)', () => {
  const bramScripted = { ...BRAM, script: ['sepulchral_spikes', 'hold_the_line*'] };
  const session = createSession(L1_ASHBLADE, bramScripted, { seed: 20261018, tuning: CANON });
  // step until the fight ends (manual side always Strikes)
  const { step, submitChoice } = require('../engine/fight.js');
  let guard = 0;
  while (!session.state.over && guard < 120) {
    guard += 1;
    if (session.state.phase === 'await_input') {
      submitChoice(session, 'strike');
      continue;
    }
    if (!step(session)) break;
  }
  const enemyEntries = session.log.filter((e) => e.side === 'b' && (e.kind === 'damage' || e.kind === 'status'));
  assert.ok(enemyEntries.length >= 1, 'Bram must act');
  // the FIRST enemy action is the scripted Spikes — a status line (thorns),
  // not a damage line; no enemy damage may precede it
  assert.match(enemyEntries[0].text, /[Ss]pikes/, `first enemy action was: ${enemyEntries[0].text}`);
  const firstEnemyDamage = session.log.find((e) => e.side === 'b' && e.kind === 'damage');
  assert.ok(session.log.indexOf(enemyEntries[0]) < session.log.indexOf(firstEnemyDamage));
  // the consumed opener left only the repeating doctrine tail
  assert.deepStrictEqual(session.fighters.b.sheet.script, ['hold_the_line*']);
});

test('Bram doctrine: he Braces whenever legal — regression pin at the measured band (N9)', () => {
  // §9.1 #1 "Teaches: Brace, Ward, what armour means" — the doctrine itself
  // is asserted (braces in every fight). The ROUND BAND is pinned to the
  // MEASURED engine behaviour (5.3 avg over this exact 30-seed sweep), not
  // to [02] §6.2's hand-sim 8–12 band: finding N9 (docs/DECISIONS.md) traced
  // the gap to the hand-sim's pre-cap-10 arithmetic and under-counted Flay
  // stacking — the bleed formula itself is verbatim canon (§5.4/§5.5). The
  // tutorial-length debt is routed to T4.12; nothing retuned silently.
  const { runFight } = require('../engine/fight.js');
  let roundsSum = 0;
  let braceFights = 0;
  const N = 30;
  for (let i = 0; i < N; i++) {
    const seed = 1000 + i * 7919;
    const session = createSession(L1_ASHBLADE, { ...BRAM, script: ['sepulchral_spikes', 'hold_the_line*'] }, { seed, tuning: CANON });
    const { runToCompletion } = require('../engine/fight.js');
    runToCompletion(session);
    const r = resultsOf(session);
    roundsSum += r.rounds;
    if (session.log.some((e) => e.side === 'b' && /braces/.test(e.text))) braceFights += 1;
    assert.ok(r.rounds <= 20, `seed ${seed}: ceiling breach`);
  }
  const avg = roundsSum / N;
  assert.ok(braceFights === N, `Bram braced in only ${braceFights}/${N} fights`);
  assert.ok(avg >= 4 && avg <= 8, `tutorial length drifted: ${avg.toFixed(1)} (N9 pin 4–8; was 5.3)`);
});

test('scripted repeat tail: an always-illegal repeat falls through to the scorer', () => {
  // 'mend_the_mortar' unlocks at L3 — never legal for a L1 enemy → dropped
  // every turn, scorer plays, nothing crashes or stalls.
  const { runFight } = require('../engine/fight.js');
  const r = runFight(L1_ASHBLADE, { ...BRAM, script: ['mend_the_mortar*'] }, { seed: 5, tuning: CANON });
  assert.ok(r.over);
  assert.ok(r.rounds >= 1 && r.rounds <= 20);
});

test('scripted opener: impossible entries drop, the scorer takes over, nothing crashes', () => {
  const bramBad = { ...BRAM, script: ['not_a_verse', 'rend'] }; // not on his sheet / not in loadout
  const session = createSession(L1_ASHBLADE, bramBad, { seed: 7, tuning: CANON });
  const { step, submitChoice } = require('../engine/fight.js');
  let guard = 0;
  while (!session.state.over && guard < 80) {
    guard += 1;
    if (session.state.phase === 'await_input') { submitChoice(session, 'strike'); continue; }
    if (!step(session)) break;
  }
  assert.strictEqual(session.state.over, true, 'the fight still completes');
  // neither queued id was cast — the scorer chose everything
  const enemyCasts = session.log.filter((e) => e.side === 'b' && e.kind === 'damage');
  assert.ok(enemyCasts.every((e) => !e.text.includes("'s Rend hits")));
  // player-side scripts never hijack manual turns
  const manual = createSession({ ...L1_ASHBLADE, script: ['rend'] }, BRAM, { seed: 7, tuning: CANON, manualSide: 'a' });
  assert.strictEqual(manual.state.phase, 'ready');
});

test('scripted opener: determinism holds with and without a script queue', () => {
  const a = runFight(L1_ASHBLADE, BRAM, { seed: 99, tuning: CANON });
  const b = runFight(L1_ASHBLADE, { ...BRAM, script: ['sepulchral_spikes'] }, { seed: 99, tuning: CANON });
  // script changes Bram's play, so results may differ — but each is a legal,
  // completed fight within the Fatigue ceiling
  assert.ok(a.rounds >= 1 && a.rounds <= 20);
  assert.ok(b.rounds >= 1 && b.rounds <= 20);
  // and the same script is byte-identical across runs (log included)
  const s1 = createSession(L1_ASHBLADE, { ...BRAM, script: ['sepulchral_spikes'] }, { seed: 99, tuning: CANON });
  const s2 = createSession(L1_ASHBLADE, { ...BRAM, script: ['sepulchral_spikes'] }, { seed: 99, tuning: CANON });
  const { runToCompletion } = require('../engine/fight.js');
  runToCompletion(s1); runToCompletion(s2);
  assert.deepStrictEqual(resultsOf(s1).log, resultsOf(s2).log);
});

test('the tutorial build carries the Ch1 start item — the candle is armed (§3)', () => {
  const session = createSession({ ...L1_ASHBLADE, items: ['candle_of_saint_orrin'] }, BRAM, { seed: 1, tuning: CANON });
  assert.ok(session.fighters.a.sheet.items.includes('candle_of_saint_orrin'),
    'the Candle of Saint Orrin must ship on the tutorial sheet (its deterministic once-per-fight save is part of the first fight)');
});

// ---------------------------------------------------------------------------
// 9. T3.5 Reading data binding at engine level: the tutorial matchup
// ---------------------------------------------------------------------------

test('runReading on the tutorial matchup: cached, counter named, honest numbers', () => {
  runReading(L1_ASHBLADE, BRAM, { n: 30, tuning: CANON });
  const second = runReading(L1_ASHBLADE, BRAM, { n: 30, tuning: CANON });
  assert.strictEqual(second.cached, true);
  assert.strictEqual(typeof second.winAPct, 'number');
  assert.ok(second.winAPct >= 0 && second.winAPct <= 100);
  assert.ok(typeof second.counterLine === 'string' && second.counterLine.length > 0);
});

test('the tutorial fight completes inside the Fatigue ceiling from any probed seed', () => {
  // deterministic sweep: 25 seeds, hand-picked by formula (not RNG)
  for (let i = 0; i < 25; i++) {
    const seed = 1000 + i * 7919;
    const r = runFight(L1_ASHBLADE, { ...BRAM, script: ['sepulchral_spikes'] }, { seed, tuning: CANON });
    assert.ok(r.over, `seed ${seed}: fight must end`);
    assert.ok(r.rounds <= 20, `seed ${seed}: exceeded the ceiling at round ${r.rounds}`);
  }
});

// ---------------------------------------------------------------------------
// 10. T3.2 font manifest + offline integrity of the browser entry
// ---------------------------------------------------------------------------

test('fonts: 19 woff2, size-bounded, 5 OFL licences, fonts.css references only local paths', () => {
  const fontsDir = path.join(ROOT, 'assets', 'fonts');
  const all = fs.readdirSync(fontsDir);
  const woff2 = all.filter((f) => f.endsWith('.woff2'));
  const licences = all.filter((f) => f.startsWith('OFL-'));
  assert.strictEqual(woff2.length, 19); // T3.2 shipped manifest (canon estimated 18; delta = SS4 italics)
  assert.strictEqual(licences.length, 5);
  let total = 0;
  for (const f of woff2) {
    const size = fs.statSync(path.join(fontsDir, f)).size;
    total += size;
    assert.ok(size > 4000 && size <= 200000, `${f} size ${size} out of the subset band`);
  }
  assert.ok(total < 1024 * 1024, `font weight ${total} exceeds a sane share of the 1.9 MB budget`);
  const css = fs.readFileSync(path.join(ROOT, 'ui', 'fonts.css'), 'utf8');
  assert.ok(!/url\(\s*['"]?https?:/.test(css), 'fonts.css must never point at the network');
  // every shipped woff2 is referenced; no orphans, no dangling refs
  const refs = [...css.matchAll(/url\("\.\.\/assets\/fonts\/([^"]+)"\)/g)].map((m) => m[1]);
  assert.deepStrictEqual([...new Set(refs)].sort(), [...woff2].sort());
  // the five families of §11.1 are all present
  for (const family of ['unifrakturmaguntia', 'cinzel', 'eb-garamond', 'jetbrains-mono', 'source-serif-4']) {
    assert.ok(woff2.some((f) => f.startsWith(family)), `missing family ${family}`);
  }
});

test('browser entry: index.html wires the three stylesheets + the boot module, all present', () => {
  const html = fs.readFileSync(path.join(ROOT, 'ui', 'index.html'), 'utf8');
  for (const ref of ['ui/fonts.css', 'ui/tokens.css', 'ui/base.css', 'ui/boot.js']) {
    assert.ok(html.includes(ref), `index.html must reference ${ref}`);
    assert.ok(fs.existsSync(path.join(ROOT, ref)), `${ref} must exist`);
  }
  assert.ok(!/https?:\/\//.test(html), 'the entry references no external URL');
});

// ---------------------------------------------------------------------------
// 11. status glyph + colour coverage (§11.4 — the 11 rows)
// ---------------------------------------------------------------------------

test('§11.4 mapping: every status has a glyph and a colour; glyphs are path data', () => {
  const rows = ['bleed', 'burn', 'curse', 'fray', 'hush', 'brace', 'ward', 'thorns', 'stun', 'fatigue', 'rite'];
  assert.strictEqual(Object.keys(STATUS_GLYPHS).length, rows.length);
  assert.strictEqual(Object.keys(STATUS_COLORS).length, rows.length);
  for (const r of rows) {
    assert.match(STATUS_GLYPHS[r].d, /^M[\d.]/, `${r} glyph must be path data`);
    assert.match(STATUS_COLORS[r], /^var\(--st-/, `${r} colour must wear its token`);
  }
});
