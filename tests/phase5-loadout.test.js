// phase5-loadout.test.js — T5.2/T5.3 acceptance: the Hymnal's logic layer and
// the Twin Ledger (D3). Reshape modes, the append-only Reshape Ledger, one-
// click rewind (byte-identical), the re-bind gate, the creation respec hook,
// slot gating, swap points, per-slot history, Floor re-bind semantics, and
// save/load survival (T9.1 pre-integration).
'use strict';
const test = require('node:test');
const assert = require('node:assert');

const { CANON } = require('../data/config.js');
const {
  createLoadoutState, canReshape, reshape, rewind, loadoutOf, bindEcho,
  boundEcho, ledgerFor, exportSave, importSave, RESHAPE_CONTEXTS, LEDGER_KINDS,
} = require('../store/loadout.js');
const {
  earnTwinLedger, hasTwinLedger, swapLoadout, bindActiveLoadoutToEcho,
  reshapeActive, SWAP_CONTEXTS,
} = require('../store/twin-ledger.js');

const BASE = {
  name: 'Mourne', clazz: 'hollow_cantor', level: 7,
  alloc: { vig: 3, mig: 1, wit: 2, grd: 6, hst: 4 },
  vow: 'silence',
  verses: ['tolling_bell', 'dirge', 'requiem', 'dissonance'],
  gear: { weapon: 'cantors_tuning_fork', vestment: 'drowned_mantle', relic: 'deaf_wax' },
  doctrine: 'hymnal',
};
const PATCH = { verses: ['requiem', 'dissonance', 'tolling_bell', 'dirge'] };

function fresh(opts) { return createLoadoutState(BASE, opts); }

// ------------------------------------------------------------- T5.2 gates
test('T5.2: illegal initial builds cannot open a loadout state', () => {
  assert.throws(() => createLoadoutState({ ...BASE, level: 11 }), /LEVEL_RANGE/);
  assert.throws(() => createLoadoutState({ ...BASE, vow: 'red_tide' }), /VOW_CLASS/);
});

test('T5.2: reshape contexts — shrine and floor-bout always; creation only while unbound', () => {
  assert.deepStrictEqual(RESHAPE_CONTEXTS, ['shrine', 'floor-bout', 'creation']);
  const s = fresh();
  for (const ctx of ['shrine', 'floor-bout', 'creation']) {
    assert.strictEqual(canReshape(s, ctx), true, ctx);
  }
  assert.strictEqual(canReshape(s, 'fight'), false);
  assert.strictEqual(canReshape(s, undefined), false);
  // after binding, the creation window closes (the respec promise held)
  bindEcho(s);
  assert.strictEqual(canReshape(s, 'creation'), false, 'bound Echo closes the creation window');
  assert.strictEqual(canReshape(s, 'shrine'), true);
});

test('T5.2: the respec-promise hook — presets reshape freely BEFORE the first bind (T8.1 path)', () => {
  const s = fresh();
  const r1 = reshape(s, PATCH, 'creation');
  assert.strictEqual(r1.ok, true);
  const r2 = reshape(s, { vow: 'last_hymn' }, 'creation');
  assert.strictEqual(r2.ok, true);
  assert.deepStrictEqual(loadoutOf(s).verses, ['requiem', 'dissonance', 'tolling_bell', 'dirge']);
  // the hook refuses once bound — the documented error names the doors
  bindEcho(s);
  const r3 = reshape(s, PATCH, 'creation');
  assert.strictEqual(r3.ok, false);
  assert.match(r3.error, /bound/);
});

test('T5.2: reshaping is free and unlimited (§13) and every entry lands in the ledger', () => {
  const s = fresh({ now: (seq) => `ts-${seq}` });
  for (let i = 0; i < 5; i++) {
    const r = reshape(s, { verses: i % 2 ? PATCH.verses : BASE.verses }, 'shrine');
    assert.strictEqual(r.ok, true, `reshape ${i} free`);
  }
  assert.strictEqual(s.ledger.length, 5);
  for (const e of s.ledger) {
    assert.strictEqual(e.kind, 'reshape');
    assert.strictEqual(e.slot, 0);
    assert.ok(e.before && e.after, 'before/after recorded');
    assert.match(e.at, /^ts-/, 'the injected clock stamped the entry');
  }
});

test('T5.2: reshaping cannot produce an illegal loadout — refused with the validator reasons', () => {
  const s = fresh();
  const before = JSON.stringify(loadoutOf(s));
  const r = reshape(s, { verses: ['rend', 'dirge', 'requiem', 'dissonance'] }, 'shrine'); // ashblade verse
  assert.strictEqual(r.ok, false);
  assert.ok(r.errors.some((e) => e.code === 'VERSE_CLASS'), JSON.stringify(r.errors));
  // the loadout is untouched by the refused reshape
  assert.strictEqual(JSON.stringify(loadoutOf(s)), before);
  assert.strictEqual(s.ledger.length, 0, 'refused reshapes are not recorded');
  // an over-budget alloc patch is refused too
  const r2 = reshape(s, { levelUps: { vig: 9, mig: 9, wit: 9, grd: 9, hst: 9 } }, 'shrine');
  assert.strictEqual(r2.ok, false);
  assert.ok(r2.errors.some((e) => e.code === 'ALLOC_OVER'));
});

test('T5.2: patches may not rewrite the slot identity (class/level ride the slot)', () => {
  const s = fresh();
  const r = reshape(s, { clazz: 'ashblade', level: 10 }, 'shrine');
  assert.strictEqual(r.ok, true); // silently ignored, not applied
  assert.strictEqual(loadoutOf(s).clazz, 'hollow_cantor');
  assert.strictEqual(loadoutOf(s).level, 7);
});

test('T5.2: the re-bind gate — reshaping never touches the bound Echo', () => {
  const s = fresh();
  bindEcho(s);
  const boundBefore = JSON.stringify(boundEcho(s));
  reshape(s, PATCH, 'shrine');
  reshape(s, { vow: 'last_hymn' }, 'shrine');
  assert.strictEqual(JSON.stringify(boundEcho(s)), boundBefore, 'bound Echo unchanged through reshapes');
  // and only bindEcho moves it
  bindEcho(s);
  assert.strictEqual(JSON.stringify(boundEcho(s)), JSON.stringify(loadoutOf(s)), 're-bind freezes the active loadout');
});

test('T5.2: rewind restores byte-identical loadouts (JSON equality), any depth', () => {
  const s = fresh();
  const r1 = reshape(s, PATCH, 'shrine');
  const r2 = reshape(s, { vow: 'last_hymn' }, 'shrine');
  const r3 = reshape(s, { gear: { weapon: 'pallbearers_mace' } }, 'shrine');
  // rewind to the FIRST reshape's before (= the original) in one click
  const w = rewind(s, r1.entry.seq, 'shrine');
  assert.strictEqual(w.ok, true);
  // byte-identical: the restored state serializes exactly like the recorded
  // before-state (both through the same assembler — the byte contract)
  assert.strictEqual(JSON.stringify(w.loadout), JSON.stringify(r1.entry.before));
  assert.deepStrictEqual(JSON.parse(JSON.stringify(w.loadout)), r1.entry.before, 'content-equal to the recorded original');
  // rewind to the middle entry: before-state of entry 2
  const w2 = rewind(s, r2.entry.seq, 'shrine');
  assert.strictEqual(JSON.stringify(w2.loadout), JSON.stringify(r2.entry.before));
  // rewind survives chained rewinds (rewinding to a rewind's before)
  const w3 = rewind(s, w2.entry.seq, 'shrine');
  assert.strictEqual(JSON.stringify(w3.loadout), JSON.stringify(w2.entry.before));
});

test('T5.2: the ledger is append-only — rewinds are recorded, history never rewritten', () => {
  const s = fresh();
  const r1 = reshape(s, PATCH, 'shrine');
  const r2 = reshape(s, { vow: 'last_hymn' }, 'shrine');
  const prefixBefore = JSON.stringify(s.ledger.slice(0, 2));
  const w = rewind(s, r1.entry.seq, 'shrine');
  assert.strictEqual(w.ok, true);
  // the old entries are still there, in order, untouched
  assert.strictEqual(s.ledger.length, 3);
  assert.strictEqual(JSON.stringify(s.ledger.slice(0, 2)), prefixBefore, 'prefix untouched');
  assert.strictEqual(s.ledger[0].seq, r1.entry.seq);
  assert.strictEqual(s.ledger[1].seq, r2.entry.seq);
  assert.strictEqual(s.ledger[2].kind, 'rewind');
  assert.ok(LEDGER_KINDS.includes('rewind'));
});

test('T5.2: rewind guards — unknown seq, wrong slot, no before-state, closed context', () => {
  const s = fresh();
  assert.strictEqual(rewind(s, 999, 'shrine').ok, false, 'unknown seq');
  bindEcho(s); // seq 1 bind
  const r = reshape(s, PATCH, 'shrine');
  const w = rewind(s, 1, 'shrine'); // the bind entry HAS a before (null)…
  assert.strictEqual(w.ok, false, 'a bind entry has no restorable before-state');
  const w2 = rewind(s, r.entry.seq, 'creation');
  assert.strictEqual(w2.ok, false, 'creation context closed after binding');
});

// ------------------------------------------------------------- T5.3
test('T5.3: one slot by default; the second exists ONLY once earned', () => {
  const s = fresh();
  assert.strictEqual(s.slots.length, 1);
  assert.strictEqual(hasTwinLedger(s), false);
  const g = earnTwinLedger(s);
  assert.strictEqual(g.ok, true);
  assert.strictEqual(s.slots.length, 2);
  assert.strictEqual(hasTwinLedger(s), true);
  // granting twice is refused — Ch3 Devotion happens once per run
  assert.strictEqual(earnTwinLedger(s).ok, false);
  assert.strictEqual(s.slots.length, 2);
});

test('T5.3: the granted second slot starts as a legal copy of the current loadout', () => {
  const s = fresh();
  earnTwinLedger(s);
  assert.strictEqual(JSON.stringify(s.slots[1]), JSON.stringify(s.slots[0]));
});

test('T5.3: swaps are free at the two canon points and nowhere else', () => {
  assert.deepStrictEqual(SWAP_CONTEXTS, ['shrine', 'reading']);
  const s = fresh();
  earnTwinLedger(s);
  assert.strictEqual(swapLoadout(s, 'fight').ok, false, 'no mid-fight swaps');
  assert.strictEqual(swapLoadout(s, 'creation').ok, false);
  assert.strictEqual(swapLoadout(s).ok, false, 'context required');
  for (const ctx of SWAP_CONTEXTS) {
    const r = swapLoadout(s, ctx);
    assert.strictEqual(r.ok, true, ctx);
    assert.strictEqual(r.activeSlot, s.activeSlot);
    // swap back for the next iteration
    if (s.activeSlot !== 0) swapLoadout(s, 'shrine');
  }
});

test('T5.3: swaps preserve the Reshape Ledger per-slot history (append-only, slot-tagged)', () => {
  const s = fresh();
  const r0 = reshape(s, PATCH, 'shrine');            // slot 0 history
  earnTwinLedger(s);
  const swap1 = swapLoadout(s, 'shrine');            // → slot 1
  const r1 = reshape(s, { vow: 'last_hymn' }, 'shrine'); // slot 1 history
  const slot0 = ledgerFor(s, 0);
  const slot1 = ledgerFor(s, 1);
  const swapSeq = s.ledger.find((e) => e.kind === 'swap').seq;
  assert.deepStrictEqual(slot0.map((e) => e.seq), [r0.entry.seq], 'slot-0 history intact');
  assert.deepStrictEqual(slot1.map((e) => e.seq), [swapSeq, r1.entry.seq], 'slot-1 history: swap + reshape');
  assert.ok(slot0.every((e) => e.slot === 0));
  assert.ok(slot1.every((e) => e.slot === 1));
  // swap recorded, nothing rewritten
  assert.strictEqual(s.ledger.some((e) => e.kind === 'swap' && e.context === 'shrine'), true);
  assert.deepStrictEqual(ledgerFor(s, 0).find((e) => e.seq === r0.entry.seq).after.verses, r0.entry.after.verses);
  // a swap entry is NOT rewindable (its before is a wrapper, not a loadout)
  const bad = rewind(s, swapSeq, 'shrine');
  assert.strictEqual(bad.ok, false);
  assert.match(bad.error, /only reshapes and rewinds restore/);
  // per-slot rewind still works on the active slot
  const w = rewind(s, r1.entry.seq, 'shrine');
  assert.strictEqual(w.ok, true, 'slot-1 rewind works while slot 1 is active');
});

test('T5.3: Floor re-bind semantics — a swap does NOT move the bound Echo', () => {
  const s = fresh();
  bindEcho(s); // Echo bound to slot 0's loadout
  const boundBefore = JSON.stringify(boundEcho(s));
  earnTwinLedger(s);
  reshape(s, PATCH, 'shrine');
  swapLoadout(s, 'reading'); // pre-fight swap to slot 1
  assert.strictEqual(s.activeSlot, 1);
  assert.strictEqual(JSON.stringify(boundEcho(s)), boundBefore, 'the swap never re-binds');
  // "the Echo binds whichever was active" — at the moment of the (re-)bind
  const b = bindActiveLoadoutToEcho(s);
  assert.strictEqual(b.ok, true);
  assert.strictEqual(JSON.stringify(boundEcho(s)), JSON.stringify(s.slots[1]), 're-bind froze the ACTIVE loadout');
  assert.strictEqual(s.boundSlot, 1);
});

test('T5.3: unearned Twin Ledger — swap refused with the reward named', () => {
  const s = fresh();
  const r = swapLoadout(s, 'shrine');
  assert.strictEqual(r.ok, false);
  assert.match(r.error, /Twin Ledger is not earned/);
});

test('T5.3: post-ending availability — the earned state and both slots survive save/load', () => {
  const s = fresh();
  earnTwinLedger(s);
  reshape(s, PATCH, 'shrine');
  swapLoadout(s, 'reading');
  reshape(s, { vow: 'last_hymn' }, 'shrine');
  bindEcho(s);
  const snap = exportSave(s);
  const restored = importSave(JSON.parse(JSON.stringify(snap)));
  assert.strictEqual(restored.twinLedgerEarned, true);
  assert.strictEqual(restored.slots.length, 2);
  assert.strictEqual(restored.activeSlot, s.activeSlot);
  assert.strictEqual(JSON.stringify(restored.ledger), JSON.stringify(s.ledger), 'the ledger survives');
  assert.strictEqual(JSON.stringify(restored.bound), JSON.stringify(s.bound));
  // the restored state keeps functioning: swap, reshape, rewind
  const sw = swapLoadout(restored, 'shrine');
  assert.strictEqual(sw.ok, true);
  const rs = reshape(restored, { verses: BASE.verses }, 'shrine');
  assert.strictEqual(rs.ok, true);
});

test('T5.3: importSave guards — malformed saves are rejected loudly', () => {
  assert.throws(() => importSave({}), /slots required/);
  assert.throws(() => importSave('not json'), SyntaxError);
});

test('T5.2/T5.3: injected timestamps stamp every entry kind; absent clock keeps saves byte-stable', () => {
  const withClock = fresh({ now: (seq) => seq * 10 });
  reshape(withClock, PATCH, 'shrine');
  bindEcho(withClock);
  earnTwinLedger(withClock);
  swapLoadout(withClock, 'shrine');
  for (const e of withClock.ledger) {
    assert.strictEqual(e.at, e.seq * 10, `${e.kind} stamped`);
  }
  // no clock → no timestamps → identical operations produce identical saves
  const a = fresh(); reshape(a, PATCH, 'shrine');
  const b = fresh(); reshape(b, PATCH, 'shrine');
  assert.strictEqual(JSON.stringify(exportSave(a)), JSON.stringify(exportSave(b)));
});

test('T5.2: reshapeActive (the Twin Ledger editing path) behaves exactly like reshape', () => {
  const s = fresh();
  earnTwinLedger(s);
  const r = reshapeActive(s, { verses: ['requiem', 'dirge', 'tolling_bell', 'dissonance'] }, 'shrine');
  assert.strictEqual(r.ok, true);
  assert.deepStrictEqual(loadoutOf(s).verses, ['requiem', 'dirge', 'tolling_bell', 'dissonance']);
  const bad = reshapeActive(s, { verses: ['rend', 'dirge', 'requiem', 'dissonance'] }, 'shrine');
  assert.strictEqual(bad.ok, false);
  assert.ok(bad.errors.some((e) => e.code === 'VERSE_CLASS'));
});
