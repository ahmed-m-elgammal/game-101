// stress-phase5.test.js — Phase-5 re-test wave: adversarial coverage for the
// T5.1 build validator, the T5.2/T5.3 Hymnal (loadout, Reshape Ledger, Twin
// Ledger), the T5.5 doctrine layer, the T5.4 shared AI, the T5.7 scripting
// layer and the T5.8 Corvane run-lock. Extreme values + nonsense scenarios.
//
// Documented invariants under test:
//   - T5.1: ONE validator; every rejection is a stable {code, field, message}
//     — garbage input is refused with reason codes, never thrown through
//   - §13: reshaping is free/unlimited for LEGAL changes; the Hymnal can
//     never hold an illegal build; patches may never forge run privileges
//     (story state, reserved doctrines, hidden vows) — stress-re-test pins
//   - T5.2: the ledger is append-only; rewinds restore byte-identically
//   - T5.3: the Twin Ledger swaps only at shrine/reading; one grant per run
//   - §12.3/T5.6: the AI decides from visibleOf() alone; deep-frozen
//   - D8/§10.3: determinism and termination under degenerate boards
'use strict';
const test = require('node:test');
const assert = require('node:assert');

const { CANON } = require('../data/config.js');
const { statBudget, assembleBuild, validateBuild, canonicalBuild, serializeBuild } = require('../engine/build.js');
const { createLoadoutState, canReshape, reshape, rewind, loadoutOf, bindEcho, boundEcho, ledgerFor, exportSave, importSave, earnedStoryVows, RESHAPE_CONTEXTS } = require('../store/loadout.js');
const { earnTwinLedger, hasTwinLedger, swapLoadout, bindActiveLoadoutToEcho, SWAP_CONTEXTS } = require('../store/twin-ledger.js');
const { chooseVerseByDoctrine } = require('../engine/doctrines.js');
const { visibleOf, filterReasons, lethalOf } = require('../engine/ai.js');
const { scriptedPick, compileScript, triggerFired } = require('../engine/ai-scripts.js');
const { createSession, runFight, legalVerses } = require('../engine/fight.js');
const { lockCounterbuild, isLocked, resolveCorvaneBuild, recordCorvaneLoss } = require('../store/counterbuild.js');
const { mulberry32 } = require('../rng/mulberry32.js');
const { standardBuild } = require('../harness/matrix.js');
const { itemsBySlot, ITEM_BY_ID } = require('../data/items.js');

const T = CANON;
const SLOTS = itemsBySlot();
const WEAPON = SLOTS.weapon[0].id;
const VESTMENT = SLOTS.vestment[0].id;
const RELIC = SLOTS.relic[0].id;

// A legal Ashblade L5 (budget 12): ashblade base 6/8/2/4/7, all finals ≤ 10.
const BASE = () => ({
  name: 'Probe', clazz: 'ashblade', level: 5,
  alloc: { vig: 4, mig: 2, wit: 2, grd: 2, hst: 2 },
  verses: ['rend', 'opening_cut'], doctrine: 'hymnal',
});

// ------------------------------------------------------- 1. validator garbage

test('stress: assembleBuild never throws on junk input objects — it refuses', () => {
  const junk = [null, undefined, 42, 'x', [], true, {}, NaN, 0];
  for (const j of junk) {
    const r = assembleBuild(j);
    assert.strictEqual(r.ok, false, `junk ${JSON.stringify(j)} must be refused`);
    assert.ok(Array.isArray(r.errors) && r.errors.length >= 2);
    for (const e of r.errors) {
      assert.ok(typeof e.code === 'string' && typeof e.field === 'string' && typeof e.message === 'string', 'rejections carry stable reason codes');
    }
  }
});

test('stress: the garbage field battery never throws and never half-accepts', () => {
  const garbage = [null, undefined, NaN, Infinity, -Infinity, -1, 0, 1.5, '3', '', 'ashblade', [], {}, 2 ** 53, 1e19];
  const fields = ['clazz', 'level', 'vow', 'verses', 'doctrine', 'name', 'alloc', 'creation', 'levelUps', 'gear', 'rite'];
  for (const field of fields) {
    for (const g of garbage) {
      const input = BASE();
      input[field] = g;
      let r;
      assert.doesNotThrow(() => { r = assembleBuild(input); }, `${field} = ${JSON.stringify(g)} must not throw`);
      assert.ok(typeof r.ok === 'boolean', `${field} = ${JSON.stringify(g)}: boolean verdict`);
      if (r.ok) {
        // the ONLY acceptable accepts are genuinely legal values: null verses
        // normalize to "no verses" (T5.1 dialect: absent = empty), and an
        // empty gear array means all three slots empty. creation/levelUps
        // garbage can never reach an exact budget, so it is always refused.
        if (field === 'clazz') assert.strictEqual(g, 'ashblade');
        if (field === 'verses') {
          assert.ok(g == null || (Array.isArray(g) && g.length === 0), `${field}=${JSON.stringify(g)} accepted but not empty`);
        }
        if (field === 'gear') {
          const emptyObject = g != null && typeof g === 'object' && !Array.isArray(g) && Object.keys(g).length === 0;
          assert.ok(g == null || (Array.isArray(g) && g.length === 0) || emptyObject, `${field}=${JSON.stringify(g)} accepted but not empty`);
        }
      } else {
        for (const e of r.errors) assert.ok(e.code && e.field && e.message, `${field}=${JSON.stringify(g)}: shaped error`);
      }
    }
  }
});

test('stress: budgets and boundaries across every level 1–10', () => {
  for (let level = 1; level <= 10; level++) {
    const budget = statBudget(level);
    assert.strictEqual(budget, 4 + 2 * (level - 1));
    // an exact-budget spread that respects caps: vig-heavy is safest
    const alloc = { vig: 0, mig: 0, wit: 0, grd: 0, hst: 0 };
    let left = budget;
    for (const k of ['grd', 'hst', 'wit', 'mig', 'vig']) {
      const room = 10 - { vig: 6, mig: 8, wit: 2, grd: 4, hst: 7 }[k];
      const put = Math.min(room, left);
      alloc[k] = put; left -= put;
    }
    assert.strictEqual(left, 0, `level ${level}: the cap-aware spread fills the budget exactly`);
    const r = assembleBuild({ ...BASE(), level, alloc });
    assert.strictEqual(r.ok, true, `level ${level}: ${JSON.stringify(r.errors)}`);
    // ±1 point misallocations are distinct, named rejections (N1)
    const over = { ...alloc }; over.vig += 1;
    assert.throws(() => canonicalBuild({ ...BASE(), level, alloc: over }), /ALLOC_OVER/);
    const short = { ...alloc };
    const funded = Object.keys(short).find((k) => short[k] > 0);
    short[funded] -= 1; // some stat always carries points (budget ≥ 4)
    assert.throws(() => canonicalBuild({ ...BASE(), level, alloc: short }), /ALLOC_SHORTFALL/);
  }
});

test('stress: the stat cap bites exactly at 11 and never below', () => {
  // ashblade mig base 8: alloc mig 2 → final 10 (legal); mig 3 → 11 (cap)
  assert.strictEqual(assembleBuild({ ...BASE(), alloc: { vig: 4, mig: 2, wit: 2, grd: 2, hst: 2 } }).ok, true);
  // L7 budget 16, exact: mig lands on 11 → the cap fires (budget first, then cap)
  const r = assembleBuild({ ...BASE(), level: 7, alloc: { vig: 4, mig: 3, wit: 3, grd: 3, hst: 3 } });
  assert.strictEqual(r.ok, false);
  assert.ok(r.errors.some((e) => e.code === 'STAT_CAP' && e.field === 'alloc.mig'));
});

test('stress: verse-slot rules — limit, unknown, strike, class, unlock, dupes, order', () => {
  assert.throws(() => canonicalBuild({ ...BASE(), verses: ['rend', 'opening_cut', 'flay', 'steady_breath', 'purify'] }), /VERSE_SLOT_LIMIT/);
  assert.throws(() => canonicalBuild({ ...BASE(), verses: ['no_such_verse'] }), /VERSE_UNKNOWN/);
  assert.throws(() => canonicalBuild({ ...BASE(), verses: ['strike'] }), /VERSE_STRIKE_IMPLICIT/);
  assert.throws(() => canonicalBuild({ ...BASE(), verses: ['dirge'] }), /VERSE_CLASS/, 'a Cantor verse never fits an Ashblade');
  assert.throws(() => canonicalBuild({ ...BASE(), level: 1, verses: ['drink_deep'] }), /VERSE_UNLOCK/, 'drink_deep unlocks at L2');
  assert.throws(() => canonicalBuild({ ...BASE(), verses: ['rend', 'rend'] }), /VERSE_DUP/);
  // slot order is preserved into the assembled build (priority contract)
  const r = assembleBuild({ ...BASE(), verses: ['flay', 'rend'] });
  assert.strictEqual(r.ok, true);
  assert.deepStrictEqual(r.build.verses, ['flay', 'rend']);
  // verses containing garbage entries are refused per-entry, never crash
  assert.throws(() => canonicalBuild({ ...BASE(), verses: [42, null, {}] }), /VERSE_UNKNOWN/);
});

test('stress: vow gates — class binding, story lock, the hidden vow, forgery', () => {
  assert.throws(() => canonicalBuild({ ...BASE(), vow: 'no_such_vow' }), /VOW_UNKNOWN/);
  assert.throws(() => canonicalBuild({ ...BASE(), vow: 'pyre' }), /VOW_CLASS/, 'pyre is the Witch\'s');
  // story vow without the run state → locked; with it → legal
  assert.throws(() => canonicalBuild({ ...BASE(), vow: 'grey_duelist' }), /VOW_STORY_LOCKED/);
  const withState = assembleBuild({ ...BASE(), vow: 'grey_duelist', storyState: ['grey_duelist'] });
  assert.strictEqual(withState.ok, true);
  // a story vow NOT in the state stays locked even when other story vows are
  assert.throws(() => canonicalBuild({ ...BASE(), vow: 'grey_duelist', storyState: ['wardens_oath'] }), /VOW_STORY_LOCKED/);
  // the hidden vow is excluded from every picker (§7.2)
  assert.throws(() => canonicalBuild({ ...BASE(), vow: 'counter_voice', storyState: ['counter_voice'] }), /VOW_HIDDEN/);
  const hidden = assembleBuild({ ...BASE(), vow: 'counter_voice', storyState: ['counter_voice'], allowHiddenVow: true });
  assert.strictEqual(hidden.ok, true, 'the explicit import path may carry it');
  // garbage vow ids/types
  assert.throws(() => canonicalBuild({ ...BASE(), vow: 42 }), /VOW_UNKNOWN/);
  assert.throws(() => canonicalBuild({ ...BASE(), vow: {} }), /VOW_UNKNOWN/);
});

test('stress: doctrine + gear + name boundaries', () => {
  assert.throws(() => canonicalBuild({ ...BASE(), doctrine: undefined }), /DOCTRINE_UNKNOWN/, 'a doctrine is required');
  assert.throws(() => canonicalBuild({ ...BASE(), doctrine: 'bogus' }), /DOCTRINE_UNKNOWN/);
  assert.throws(() => canonicalBuild({ ...BASE(), doctrine: 'cantors_hand' }), /DOCTRINE_RESERVED/, 'reserved without a rite');
  assert.strictEqual(assembleBuild({ ...BASE(), doctrine: 'cantors_hand', rite: 'halbrey_passage' }).ok, true, 'a rite satisfies the reservation');
  assert.throws(() => canonicalBuild({ ...BASE(), rite: 'no_such_rite' }), /RITE_UNKNOWN/);
  assert.throws(() => canonicalBuild({ ...BASE(), gear: { weapon: 'no_such_item' } }), /GEAR_UNKNOWN/);
  assert.throws(() => canonicalBuild({ ...BASE(), gear: { weapon: RELIC } }), /GEAR_SLOT/);
  const geared = assembleBuild({ ...BASE(), gear: [WEAPON, VESTMENT, RELIC] });
  assert.strictEqual(geared.ok, true, 'array gear dialect works');
  assert.deepStrictEqual(geared.build.items, [WEAPON, VESTMENT, RELIC]);
  assert.throws(() => canonicalBuild({ ...BASE(), name: 42 }), /NAME_TYPE/);
  const unnamed = assembleBuild({ ...BASE(), name: '   ' });
  assert.strictEqual(unnamed.build.name, 'Ashblade', 'blank names default to the class name');
});

test('stress: canonical serialization is byte-stable across key orders and dialects', () => {
  const a = { ...BASE(), vow: 'red_tide', gear: [WEAPON, VESTMENT, RELIC] };
  const reordered = { gear: [WEAPON, VESTMENT, RELIC], doctrine: 'hymnal', verses: ['rend', 'opening_cut'], alloc: { hst: 2, grd: 2, wit: 2, mig: 2, vig: 4 }, level: 5, clazz: 'ashblade', name: 'Probe', vow: 'red_tide' };
  assert.strictEqual(serializeBuild(a), serializeBuild(reordered));
  // the creation/levelUps dialect assembles identically to the alloc dialect
  const split = { name: 'Probe', clazz: 'ashblade', level: 5, creation: { vig: 4, mig: 0, wit: 0, grd: 0, hst: 0 }, levelUps: { vig: 0, mig: 2, wit: 2, grd: 2, hst: 2 }, verses: ['rend', 'opening_cut'], doctrine: 'hymnal' };
  assert.strictEqual(serializeBuild(split), serializeBuild(BASE()));
  assert.throws(() => serializeBuild({ ...BASE(), level: 99 }), /cannot serialize an illegal build/);
  // the canonical object carries a version stamp and stable key set
  const cb = canonicalBuild(BASE());
  assert.strictEqual(cb.v, 1);
  assert.deepStrictEqual(Object.keys(cb).sort(), ['alloc', 'cls', 'doctrine', 'gear', 'level', 'name', 'rite', 'v', 'verses', 'vow']);
});

// ------------------------------------------------- 2. the Hymnal under attack

test('stress: reshape context gates — mid-fight refused, creation only unbound', () => {
  const st = createLoadoutState(BASE());
  assert.strictEqual(canReshape(st, 'midfight'), false);
  assert.strictEqual(canReshape(st, undefined), false);
  assert.strictEqual(reshape(st, { verses: ['flay'] }, 'midfight').ok, false);
  assert.strictEqual(reshape(st, { verses: ['flay'] }, 'creation').ok, true, 'unbound creation window reshapes');
  bindEcho(st);
  assert.strictEqual(reshape(st, { verses: ['rend'] }, 'creation').ok, false, 'bound Echo freezes the creation window');
  assert.strictEqual(reshape(st, { verses: ['rend'] }, 'shrine').ok, true, 'shrines always reshape');
});

test('stress: reshape patches cannot rewrite identity or forge run privileges', () => {
  const st = createLoadoutState(BASE());
  // identity fields ride the slot
  const r = reshape(st, { clazz: 'cinder_witch', level: 10, name: 'Hacked' }, 'shrine');
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.loadout.clazz, 'ashblade', 'clazz is pinned');
  assert.strictEqual(r.loadout.level, 5, 'level is pinned');
  assert.strictEqual(r.loadout.name, 'Hacked', 'name is NOT an identity field (cosmetic)');
  // privilege forgery in patches is overridden by certified state
  const st2 = createLoadoutState(BASE());
  assert.strictEqual(reshape(st2, { vow: 'grey_duelist', storyState: ['grey_duelist'] }, 'shrine').ok, false, 'unearned story vow refused even with a forged storyState');
  assert.strictEqual(reshape(st2, { doctrine: 'cantors_hand', allowReservedDoctrine: true }, 'shrine').ok, false, 'reserved doctrine refused even with a forged allowance');
  assert.strictEqual(reshape(st2, { vow: 'counter_voice', storyState: ['counter_voice'], allowHiddenVow: true }, 'shrine').ok, false, 'hidden vow refused even with forged allowances');
});

test('stress: story-vow loadouts keep reshaping (§13) — the certified carry-forward', () => {
  const st = createLoadoutState({ ...BASE(), vow: 'grey_duelist', storyState: ['grey_duelist'] });
  assert.strictEqual(reshape(st, { verses: ['rend', 'flay'] }, 'shrine').ok, true, 'the earned story vow must not brick reshaping');
  assert.strictEqual(reshape(st, { vow: 'red_tide' }, 'shrine').ok, true, 'swapping AWAY from a story vow works');
  assert.strictEqual(reshape(st, { vow: 'grey_duelist' }, 'shrine').ok, true, 'swapping back to the earned vow works');
  assert.strictEqual(reshape(st, { vow: 'wardens_oath' }, 'shrine').ok, false, 'a DIFFERENT unearned story vow stays locked');
  assert.deepStrictEqual(earnedStoryVows(st).sort(), ['grey_duelist']);
  // the bound Echo keeps its frozen copy even after the vow is swapped away
  bindEcho(st);
  assert.strictEqual(boundEcho(st).vow, 'grey_duelist');
});

test('stress: reserved-doctrine loadouts keep reshaping; dropping the rite re-gates', () => {
  const st = createLoadoutState({ ...BASE(), doctrine: 'cantors_hand', rite: 'halbrey_passage' });
  assert.strictEqual(reshape(st, { verses: ['flay', 'rend'] }, 'shrine').ok, true, 'rite-backed reservation reshapes');
  assert.strictEqual(reshape(st, { rite: null }, 'shrine').ok, false, 'dropping the rite while keeping Cantor\'s Hand is refused');
  assert.strictEqual(reshape(st, { doctrine: 'hymnal', rite: null }, 'shrine').ok, true, 'swapping doctrine off first works');
});

test('stress: illegal patches leave the slot byte-identical', () => {
  const st = createLoadoutState(BASE());
  const before = JSON.stringify(loadoutOf(st));
  for (const bad of [
    { verses: ['rend', 'rend'] },
    { verses: ['bogus'] },
    { alloc: { vig: -1 } },
    { vow: 'pyre' },
    { doctrine: null },
    { name: 42 },
    { gear: { weapon: RELIC } },
  ]) {
    const r = reshape(st, bad, 'shrine');
    assert.strictEqual(r.ok, false, `patch ${JSON.stringify(bad)} refused`);
    assert.strictEqual(JSON.stringify(loadoutOf(st)), before, 'the slot is untouched by refusals');
  }
  // ledger recorded only the successes
  assert.strictEqual(st.ledger.length, 0);
});

test('stress: rewind chains restore byte-identical snapshots; binds refuse restore', () => {
  const st = createLoadoutState(BASE());
  const v0 = JSON.stringify(loadoutOf(st));
  reshape(st, { verses: ['flay', 'rend'] }, 'shrine');           // seq 1
  reshape(st, { vow: 'red_tide' }, 'shrine');                    // seq 2
  const v2 = JSON.stringify(loadoutOf(st));
  rewind(st, 1, 'shrine');                                       // seq 3 → v0
  assert.strictEqual(JSON.stringify(loadoutOf(st)), v0, 'rewind to the first reshape restores the original');
  // rewind semantics per T5.2: restore the TARGET ENTRY's `before` — the
  // state that existed BEFORE that change, not a re-application of it. (The
  // rewind's OWN record carries before=pre-rewind/after=restored.)
  const target = st.ledger.find((e) => e.seq === 2);
  const r2 = rewind(st, 2, 'shrine');                            // seq 4
  assert.strictEqual(r2.ok, true);
  assert.strictEqual(JSON.stringify(loadoutOf(st)), JSON.stringify(target.before), 'rewind restores the target entry before-state byte-identically');
  assert.strictEqual(JSON.stringify(loadoutOf(st)), JSON.stringify(r2.entry.after), 'the rewind record logs the restored state as its after');
  assert.strictEqual(JSON.parse(JSON.stringify(loadoutOf(st))).vow, null, 'the before-state of the vow reshape predates the vow');
  bindEcho(st);                                                  // seq 5
  const bindSeq = st.ledger[st.ledger.length - 1].seq;
  assert.strictEqual(rewind(st, bindSeq, 'shrine').ok, false, 'bind entries do not restore');
  assert.strictEqual(rewind(st, 999, 'shrine').ok, false, 'missing seq refused');
  // ledger append-only: every kind present, seqs strictly 1..N
  const seqs = st.ledger.map((e) => e.seq);
  assert.deepStrictEqual(seqs, seqs.map((_, i) => i + 1));
});

test('stress: 400-op seeded ledger soak — append-only, monotonic, always legal', () => {
  const st = createLoadoutState(BASE());
  const rand = mulberry32(20261018);
  const prefixes = []; // frozen JSON of the ledger after each op
  const VERSE_POOL = ['rend', 'opening_cut', 'flay', 'steady_breath', 'second_wind'];
  for (let i = 0; i < 400; i++) {
    const roll = rand();
    if (roll < 0.5) {
      // a random legal-ish reshape (sometimes deliberately illegal)
      const verses = VERSE_POOL.filter(() => rand() < 0.4).slice(0, 4);
      reshape(st, rand() < 0.15 ? { verses: ['bogus'] } : { verses: verses.length ? verses : ['rend'] }, 'shrine');
    } else if (roll < 0.7 && st.ledger.length) {
      const e = st.ledger[Math.floor(rand() * st.ledger.length)];
      const r = rewind(st, e.seq, 'shrine');
      if (r.ok) assert.strictEqual(JSON.stringify(loadoutOf(st)), JSON.stringify(r.loadout));
    } else if (roll < 0.8) {
      bindEcho(st);
    } else if (roll < 0.9) {
      earnTwinLedger(st); // refused after the first — no-op
    } else if (st.twinLedgerEarned) {
      swapLoadout(st, 'shrine');
    }
    prefixes.push(JSON.stringify(st.ledger));
    // every slot, every bound snapshot, always re-validates
    for (const slot of st.slots) {
      assert.strictEqual(assembleBuild(slot).ok, true, `op ${i}: slots stay legal (alloc dialect round-trip)`);
    }
    assert.strictEqual(st.ledger.length, st._seq, `op ${i}: one seq per record`);
  }
  // append-only: each recorded prefix is a byte-identical prefix of the final
  const final = JSON.stringify(st.ledger);
  for (const p of prefixes) assert.ok(final.startsWith(p.slice(0, -1)), 'ledger history never rewrites');
});

test('stress: importSave rejects malformed and illegal saves loudly', () => {
  assert.throws(() => importSave('not json'), SyntaxError);
  assert.throws(() => importSave(null), /slots required/);
  assert.throws(() => importSave({}), /slots required/);
  assert.throws(() => importSave({ slots: [] }), /slots required/);
  assert.throws(() => importSave({ slots: [null] }), /not a legal build/, 'a null slot is corruption, not a loadout');
  assert.throws(() => importSave({ slots: [{}] }), /not a legal build/, 'an empty slot is corruption');
  assert.throws(() => importSave({ slots: [{ ...BASE(), alloc: { vig: 99, mig: 0, wit: 0, grd: 0, hst: 0 } }] }), /not a legal build/, 'over-cap slots are refused at load');
  // clamping behaviors that are BY DESIGN stay pinned
  const st = createLoadoutState(BASE());
  const snap = exportSave(st);
  snap.activeSlot = 99; snap.seq = 'x'; snap.ledger = 'nope';
  const back = importSave(snap);
  assert.strictEqual(back.activeSlot, 0, 'activeSlot clamps into range');
  assert.strictEqual(back._seq, 0, 'garbage seq coerces');
  assert.deepStrictEqual(back.ledger, [], 'garbage ledger drops');
  // story-vow slots round-trip and keep reshaping after import
  const story = createLoadoutState({ ...BASE(), vow: 'grey_duelist', storyState: ['grey_duelist'] });
  const restored = importSave(JSON.parse(JSON.stringify(exportSave(story))));
  assert.strictEqual(reshape(restored, { verses: ['flay', 'rend'] }, 'shrine').ok, true, 'story-vow slots survive save/load');
});

// ------------------------------------------------------- 3. the Twin Ledger

test('stress: Twin Ledger gates — one grant, two contexts, no mid-fight swaps', () => {
  const st = createLoadoutState(BASE());
  assert.strictEqual(swapLoadout(st, 'shrine').ok, false, 'swap before the earn is refused');
  assert.strictEqual(earnTwinLedger(st).ok, true);
  assert.strictEqual(earnTwinLedger(st).ok, false, 'the grant happens once per run');
  assert.strictEqual(hasTwinLedger(st), true);
  assert.strictEqual(st.slots.length, 2);
  for (const bad of ['creation', 'midfight', undefined, null]) {
    assert.strictEqual(swapLoadout(st, bad).ok, false, `context ${String(bad)} refused`);
  }
  for (const ctx of SWAP_CONTEXTS) {
    assert.strictEqual(swapLoadout(st, ctx).ok, true, `context ${ctx} swaps`);
  }
  // the swap entry tags the DESTINATION slot; per-slot history stays clean
  const last = st.ledger[st.ledger.length - 1];
  assert.strictEqual(last.kind, 'swap');
  assert.strictEqual(last.slot, st.activeSlot);
  assert.strictEqual(ledgerFor(st, 0).every((e) => e.kind !== 'swap' || e.slot === 0), true);
  // the re-bind gate binds whichever loadout is active
  swapLoadout(st, 'reading');
  bindActiveLoadoutToEcho(st);
  assert.strictEqual(JSON.stringify(boundEcho(st)), JSON.stringify(loadoutOf(st)), 'the Echo binds the ACTIVE loadout');
});

// -------------------------------------------- 4. the doctrine layer degenerates

const doctrineSession = (doctrine) => {
  const build = standardBuild('ashblade', 7, T);
  build.doctrine = doctrine;
  const foe = standardBuild('cinder_witch', 7, T);
  return createSession(build, foe, { seed: 77, tuning: T });
};

test('stress: every doctrine (and unknown) decides on degenerate boards — no throws', () => {
  for (const doctrine of ['hymnal', 'predator', 'bulwark', 'cantors_hand', 'bogus_doctrine', null, undefined]) {
    const s = doctrineSession(doctrine);
    const f = s.fighters.a;
    const pool = () => legalVerses(s, f);
    // dead target projection
    f.opponent.hp = 0;
    let r;
    assert.doesNotThrow(() => { r = chooseVerseByDoctrine(f, f.opponent, s.state, s.m, s.tuning, pool); }, `${doctrine}: dead target`);
    assert.ok(r.verse, `${doctrine}: dead target still picks`);
    // negative HP projection
    f.opponent.hp = -50;
    assert.doesNotThrow(() => chooseVerseByDoctrine(f, f.opponent, s.state, s.m, s.tuning, pool), `${doctrine}: negative HP`);
    // zero-maxHp actor (ownHpFrac guards)
    f.maxHp = 0; f.hp = 0;
    assert.doesNotThrow(() => { r = chooseVerseByDoctrine(f, f.opponent, s.state, s.m, s.tuning, pool); }, `${doctrine}: zero-maxHp actor`);
    assert.ok(r.verse, `${doctrine}: zero-maxHp actor still picks`);
  }
});

test('stress: Strike-only pools fall back cleanly under every doctrine', () => {
  for (const doctrine of ['hymnal', 'predator', 'bulwark', 'cantors_hand']) {
    const s = doctrineSession(doctrine);
    const f = s.fighters.a;
    f.sheet.verses = []; // nothing slotted; Strike remains
    const r = chooseVerseByDoctrine(f, f.opponent, s.state, s.m, s.tuning, () => legalVerses(s, f));
    assert.strictEqual(r.verse.isStrike, true, `${doctrine}: Strike fallback`);
    // and the fight itself still runs to a legal end
    const res = runFight({ ...standardBuild('ashblade', 7, T), doctrine, verses: [] }, standardBuild('cinder_witch', 7, T), { seed: 3, tuning: T });
    assert.strictEqual(res.over, true);
    assert.ok(res.winner === 'a' || res.winner === 'b');
  }
});

test('stress: doctrine decisions are deterministic — 50 fresh sessions, one pick', () => {
  for (const doctrine of ['hymnal', 'predator', 'bulwark', 'cantors_hand']) {
    const picks = new Set();
    for (let i = 0; i < 50; i++) {
      const s = doctrineSession(doctrine);
      const f = s.fighters.a;
      const r = chooseVerseByDoctrine(f, f.opponent, s.state, s.m, s.tuning, () => legalVerses(s, f));
      picks.add(r.verse.id);
    }
    assert.strictEqual(picks.size, 1, `${doctrine}: identical boards must never diverge (got ${[...picks].join(', ')})`);
  }
});

test('stress: unknown doctrines play the default path byte-identically', () => {
  const s = doctrineSession('hymnal');
  const f = s.fighters.a;
  const r1 = chooseVerseByDoctrine(f, f.opponent, s.state, s.m, s.tuning, () => legalVerses(s, f));
  const s2 = doctrineSession('not_a_doctrine');
  const f2 = s2.fighters.a;
  const r2 = chooseVerseByDoctrine(f2, f2.opponent, s2.state, s2.m, s2.tuning, () => legalVerses(s2, f2));
  assert.strictEqual(r2.doctrine, undefined, 'the default path carries no doctrine marker');
  assert.strictEqual(r1.verse.id, r2.verse.id, 'same board → same pick with or without a doctrine');
});

// -------------------------------------------------- 5. the honesty boundary

test('stress: visibleOf exposes exactly the documented surface and freezes it', () => {
  const s = doctrineSession('hymnal');
  const vis = visibleOf(s.fighters.b, s.tuning);
  assert.deepStrictEqual(Object.keys(vis).sort(), ['defense', 'defenseMap', 'hp', 'maxHp', 'resolve', 'statuses']);
  assert.deepStrictEqual(Object.keys(vis.defense).sort(), ['ember', 'shade', 'steel']);
  for (const k of ['sheet', 'vow', 'verses', 'cooldowns', 'items', 'riteState']) {
    assert.strictEqual(k in vis, false, `${k} must never cross the boundary`);
  }
  assert.throws(() => { 'use strict'; vis.hp = 1; }, TypeError, 'the projection is deep-frozen');
  assert.throws(() => { 'use strict'; vis.statuses.bleed = {}; }, TypeError);
  // a status chip carries only its visible value, stripped of transports
  const b = s.fighters.b;
  b.statuses.bleed = { stacks: 3, sourceSide: 'a', vowLink: 'red_tide' };
  const vis2 = visibleOf(b, s.tuning);
  assert.deepStrictEqual(vis2.statuses.bleed, { stacks: 3 });
});

test('stress: the lethal scan and filter behave on degenerate projections', () => {
  const s = doctrineSession('hymnal');
  const f = s.fighters.a;
  const vis = visibleOf(f.opponent, s.tuning);
  const pool = legalVerses(s, f);
  assert.strictEqual(lethalOf(f, { ...vis, hp: 0 }, pool, s.tuning, 1) !== null, true, 'hp 0 → everything is lethal');
  assert.strictEqual(lethalOf(f, { ...vis, hp: -10 }, pool, s.tuning, 1) !== null, true, 'negative hp → lethal');
  const none = lethalOf(f, { ...vis, hp: 1e9 }, pool, s.tuning, 1);
  assert.strictEqual(none, null, 'an undamageable wall has no lethal');
  // the pointless-cast filter on a clean board
  const clean = visibleOf({ hp: 50, maxHp: 100, resolve: 5, statuses: {}, sheet: f.sheet }, s.tuning);
  const reasons = {};
  for (const v of pool) reasons[v.id] = filterReasons(v, f, clean);
  assert.deepStrictEqual(reasons.strike, [], 'Strike is never pointless');
});

// -------------------------------------------------- 6. the scripting garbage

test('stress: the queue grammar survives garbage entries and never casts illegal', () => {
  const mkF = (script) => ({ flags: {}, hp: 50, maxHp: 100, opponent: { hp: 50, maxHp: 100 }, statuses: {}, sheet: { name: 'G', script } });
  const session = { logLine() {} };
  const legal = [{ id: 'rend' }, { id: 'strike', isStrike: true }];
  // blanks and unknowns shift out one per call; the legal tail casts
  const f1 = mkF(['', 'bogus_verse', 'rend']);
  let pick = null;
  for (let i = 0; i < 5 && !pick; i++) pick = scriptedPick(session, f1, { round: 1 }, { legal });
  assert.strictEqual(pick && pick.id, 'rend', 'two drops then the hit');
  assert.deepStrictEqual(f1.sheet.script, [], 'the queue drained');
  // a repeat tail sticks forever and never drains
  const f2 = mkF(['strike*']);
  for (let i = 0; i < 5; i++) assert.strictEqual(scriptedPick(session, f2, { round: 1 }, { legal }).id, 'strike');
  assert.strictEqual(f2.sheet.script.length, 1, 'repeat tails do not shift');
  // a repeat tail of an ILLEGAL verse drops without casting
  const f3 = mkF(['no_such*']);
  assert.strictEqual(scriptedPick(session, f3, { round: 1 }, { legal }), null, 'illegal repeat tails never cast');
  // restricted (setup/fold) turns neither cast nor drain the queue
  const f4 = mkF(['rend']);
  assert.strictEqual(scriptedPick(session, f4, { round: 1 }, { legal, restrictToSetup: true }), null);
  assert.strictEqual(f4.sheet.script.length, 1, 'posture-gated turns keep the queue');
  // empty legal pool → null, no throw
  assert.strictEqual(scriptedPick(session, mkF(['rend']), { round: 1 }, { legal: [] }), null);
});

test('stress: structured triggers with garbage keys/values stay inert', () => {
  const session = { logLine() {} };
  const legal = [{ id: 'rend' }];
  const mkF = (aiScript) => ({ flags: {}, hp: 50, maxHp: 100, opponent: { hp: 50, maxHp: 100 }, statuses: {}, sheet: { name: 'G', aiScript } });
  // unknown verse in a FIRED trigger: skipped, once NOT burned
  const f1 = mkF([{ when: 'roundAtLeast', value: 1, verse: 'bogus', once: true }]);
  assert.strictEqual(scriptedPick(session, f1, { round: 5 }, { legal }), null);
  assert.strictEqual(f1.flags.trigFired_0, undefined, 'an uncastable trigger does not burn its once');
  // malformed rows are skipped, not fatal; the one well-formed row fires
  const f2 = mkF([null, 42, 'x', { when: 'roundAtLeast', value: 1, verse: 'rend' }, { when: 'atTurn' }, { when: 'weird_when', value: 1, verse: 'rend' }]);
  assert.strictEqual(scriptedPick(session, f2, { round: 1 }, { legal }).id, 'rend', 'the well-formed row still fires');
  // triggerFired with undefined values is false, never a throw
  const probe = { flags: {}, hp: 50, maxHp: 100, opponent: { hp: 50, maxHp: 100 } };
  assert.strictEqual(triggerFired({ when: 'atTurn' }, probe, {}), false);
  assert.strictEqual(triggerFired({ when: 'hpBelowPct' }, probe, {}), false);
  assert.strictEqual(triggerFired({ when: 'roundAtLeast' }, probe, {}), false);
  assert.strictEqual(triggerFired({ when: 'nonsense' }, probe, {}), false);
  // compileScript totals over garbage
  assert.deepStrictEqual(compileScript({}).triggers, []);
  assert.deepStrictEqual(compileScript({ script: 'rend' }).lead, [], 'non-array scripts are ignored');
  assert.deepStrictEqual(compileScript({ aiScript: [null, 42, { verse: 'x' }] }).triggers, [{ when: undefined, value: null, verse: 'x', once: false }]);
});

// ------------------------------------------------- 7. the Corvane run-lock

test('stress: the run-lock fails loudly, locks once, reveals once', () => {
  assert.throws(() => lockCounterbuild({}, null), /playerBuild required/, 'a null build is a named error, not a TypeError');
  assert.throws(() => resolveCorvaneBuild({}), /not locked/);
  assert.throws(() => recordCorvaneLoss({}), /not locked/);
  const run = {};
  const build = standardBuild('ashblade', 7, T);
  const rec = lockCounterbuild(run, build, 5);
  assert.strictEqual(isLocked(run), true);
  const again = lockCounterbuild(run, standardBuild('gravewarden', 7, T), 5);
  assert.strictEqual(again.sheetId, rec.sheetId, 're-locks are no-ops (D11)');
  const payload = recordCorvaneLoss(run);
  assert.ok(payload && payload.axis, 'the first loss reveals');
  for (let i = 0; i < 3; i++) assert.strictEqual(recordCorvaneLoss(run), null, 'exactly once');
  assert.strictEqual(run.corvane.losses, 4, 'the counter keeps honest tally of every loss');
  // the lock survives a JSON round-trip with its reveal state
  const restored = JSON.parse(JSON.stringify(run));
  assert.strictEqual(isLocked(restored), true);
  assert.strictEqual(restored.corvane.revealed, true);
  assert.strictEqual(restored.corvane.losses, 4);
  assert.strictEqual(resolveCorvaneBuild(restored).level, 7);
});
