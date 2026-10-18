/**
 * loadout.js — T5.2: the Hymnal's logic layer. [GDD] §13, §14.4; [01] §1.5.
 *
 *   "Reshaping: at any shrine in the campaign or between arena bouts, the
 *    player can re-slot verses, swap vows, and reassign stat points for free.
 *    The Echo only changes when the player re-binds it, so experimentation
 *    never damages the bound Echo."
 *   "NEW — the Reshape Ledger. Every reshape is recorded with a timestamp and
 *    the build before/after, and the player can rewind to any previous loadout
 *    in one click."
 *
 * Pure logic — no DOM, no storage, no clock by default (the `now` option
 * injects a timestamp source; absent it, entries carry their sequence number
 * only, which keeps saves byte-stable and the suite deterministic). The
 * campaign layer (T6.11 shrine interactions) and the UI (T8.4) call this.
 *
 * Reshape contexts (who may open the Hymnal):
 *   'shrine'     — any of the ten shrines (§13, F24)
 *   'floor-bout' — between Choir Floor bouts (§13 "between arena bouts")
 *   'creation'   — the pre-bind window (T8.1 presets' respec-promise hook:
 *                  while no Echo is bound, the loadout is still being formed;
 *                  the promise "experimentation never damages the bound Echo"
 *                  is trivially kept before there is one)
 *
 * The bound Echo changes ONLY through bindEcho() — the re-bind gate. Every
 * mutation appends to the ledger; the ledger is append-only and survives
 * save/load (T9.1 pre-integration asserted in tests/phase5-loadout.test.js).
 *
 * Twin Ledger (T5.3) sits on top: this module holds the earned flag and the
 * slot mechanics; store/twin-ledger.js owns the D3 reward semantics.
 */

const { assembleBuild } = require('../engine/build.js');
const { VOW_BY_ID } = require('../data/vows.js');
const { DOCTRINE_BY_ID } = require('../data/doctrines.js');

const RESHAPE_CONTEXTS = ['shrine', 'floor-bout', 'creation'];
const LEDGER_KINDS = ['reshape', 'rewind', 'bind', 'swap'];

/** Deduped, string-only view of a story-state list. */
function cleanStoryState(list) {
  return [...new Set((Array.isArray(list) ? list : []).filter((v) => typeof v === 'string'))];
}

/**
 * The story vows this run has EARNED, as far as the Hymnal can know: the
 * injected run state (opts.storyState) plus every story vow already carried
 * by a slot — a slot could only enter the Hymnal through the validator, so
 * its story vow is certified evidence of the earn. (Stress-re-test fix: a
 * bare re-validation with an empty storyState refused every reshape of a
 * story-vow loadout, breaking §13's free-reshaping promise.)
 */
function earnedStoryVows(state) {
  const set = new Set(cleanStoryState(state._storyState));
  for (const slot of state.slots) {
    if (slot && slot.vow) {
      const row = VOW_BY_ID.get(slot.vow);
      if (row && row.kind === 'story') set.add(slot.vow);
    }
  }
  return [...set];
}

/**
 * The reserved/hidden allowances the ACTIVE slot already holds. These carry
 * forward so a certified loadout keeps reshaping, but a patch can never
 * GRANT one: `allowReservedDoctrine`/`allowHiddenVow`/`storyState` in a
 * reshape patch are overridden by the certified values below (stress-re-test
 * fix — the patch was a privilege-escalation surface into the validator).
 */
function certifiedAllowances(state) {
  const current = state.slots[state.activeSlot];
  const vowRow = current && current.vow ? VOW_BY_ID.get(current.vow) : null;
  const dRow = current && current.doctrine ? DOCTRINE_BY_ID.get(current.doctrine) : null;
  return {
    allowHiddenVow: !!(vowRow && vowRow.hidden),
    allowReservedDoctrine: !!(dRow && dRow.reserved && !current.rite),
  };
}

function clone(v) { return v == null ? v : JSON.parse(JSON.stringify(v)); }

function fail(error, extra) {
  return { ok: false, error, ...extra };
}

function nextSeq(state) { state._seq += 1; return state._seq; }

function record(state, kind, slot, before, after) {
  const entry = { seq: nextSeq(state), kind, slot, before: clone(before), after: clone(after) };
  if (state._now) entry.at = state._now(entry.seq);
  state.ledger.push(entry);
  return entry;
}

/**
 * Open a loadout state with one slot holding `build` (a legal build in the
 * T5.1 dialect — validated here so nothing illegal can enter the Hymnal).
 * @param {object} build
 * @param {{now?: (seq:number)=>any}} opts
 */
function createLoadoutState(build, opts = {}) {
  const r = assembleBuild(build);
  if (!r.ok) {
    throw new Error('createLoadoutState: illegal initial build — ' +
      r.errors.map((e) => `${e.code}(${e.field})`).join('; '));
  }
  return {
    slots: [r.build],
    activeSlot: 0,
    twinLedgerEarned: false, // D3 — the Twin Ledger feature module flips this
    bound: null,             // the bound Echo's frozen loadout (re-bind gate)
    boundSlot: null,
    ledger: [],              // append-only Reshape Ledger
    _seq: 0,
    _storyState: cleanStoryState(opts.storyState != null ? opts.storyState : build.storyState),
    _now: typeof opts.now === 'function' ? opts.now : null,
  };
}

/**
 * May the Hymnal open? Contexts: 'shrine' | 'floor-bout' always; 'creation'
 * only while nothing is bound (the respec-promise window).
 */
function canReshape(state, context) {
  if (!RESHAPE_CONTEXTS.includes(context)) return false;
  if (context === 'creation') return state.bound == null;
  return true;
}

/**
 * Translate a patch's `gear` field into the assembled build's `items`
 * dialect. The merged loadout carries BOTH keys, and normalizeInput reads
 * `items` first — without this translation a `gear`-object (or `gear`
 * array) patch was silently ignored (stress-re-test fix). Per-slot object
 * semantics: only the keys the patch states change; the rest ride over.
 */
function patchIntoItems(current, patch) {
  const p = clone(patch) || {};
  if (Array.isArray(p.gear)) {
    p.items = p.gear;
  } else if (p.gear && typeof p.gear === 'object') {
    const items = Array.isArray(current.items) ? current.items.slice() : [null, null, null];
    ['weapon', 'vestment', 'relic'].forEach((slot, i) => {
      if (p.gear[slot] !== undefined) items[i] = p.gear[slot];
    });
    p.items = items;
  }
  delete p.gear;
  return p;
}

/**
 * Reshape the ACTIVE loadout (re-slot verses, swap vows, reassign stats,
 * regear) — free, unlimited (§13). `patch` is a partial build in the T5.1
 * dialect; the merged loadout must still assemble legally or the reshape is
 * refused with the validator's reason codes (the Hymnal can never hold an
 * illegal build).
 */

function reshape(state, patch, context) {
  if (!canReshape(state, context)) {
    return fail(context === 'creation' && state.bound != null
      ? 'the Echo is bound — reshape at a shrine or between Floor bouts'
      : `reshape is not allowed in context "${context}" (shrine, floor-bout, or the unbound creation window)`);
  }
  const current = state.slots[state.activeSlot];
  const certified = certifiedAllowances(state);
  const merged = {
    ...current,
    ...patchIntoItems(current, patch),
    // identity fields ride the slot; patches may not rewrite them
    clazz: current.clazz,
    level: current.level,
    // certified run state — patches may never forge these (stress-re-test
    // fix: storyState/allowReservedDoctrine/allowHiddenVow in a patch were
    // a privilege-escalation surface into the T5.1 validator)
    storyState: earnedStoryVows(state),
    allowHiddenVow: certified.allowHiddenVow,
    allowReservedDoctrine: certified.allowReservedDoctrine,
  };
  const r = assembleBuild(merged);
  if (!r.ok) return fail('illegal loadout', { errors: r.errors });
  const entry = record(state, 'reshape', state.activeSlot, current, r.build);
  state.slots[state.activeSlot] = r.build;
  return { ok: true, loadout: state.slots[state.activeSlot], entry };
}

/**
 * One-click rewind to any earlier ledger entry of the ACTIVE slot: restores
 * that entry's `before` loadout byte-identically (JSON equality — asserted).
 * The rewind itself is recorded (the ledger stays append-only, honest).
 */
function rewind(state, seq, context) {
  if (!canReshape(state, context)) {
    return fail(`rewind is not allowed in context "${context}"`);
  }
  const entry = state.ledger.find((e) => e.seq === seq);
  if (!entry) return fail(`no ledger entry #${seq}`);
  if (entry.slot !== state.activeSlot) {
    return fail(`entry #${seq} belongs to loadout slot ${entry.slot + 1}, not the active one`);
  }
  // only reshape/rewind entries carry a restorable loadout in `before` —
  // swap entries tag the destination slot and wrap their state
  if (entry.kind !== 'reshape' && entry.kind !== 'rewind') {
    return fail(`entry #${seq} is a ${entry.kind} — only reshapes and rewinds restore`);
  }
  if (!entry.before) return fail(`entry #${seq} has no before-state`);
  const current = state.slots[state.activeSlot];
  const rewindEntry = record(state, 'rewind', state.activeSlot, current, entry.before);
  state.slots[state.activeSlot] = clone(entry.before);
  return { ok: true, loadout: state.slots[state.activeSlot], entry: rewindEntry };
}

/** The ACTIVE loadout (what the Hymnal edits; what a bind would freeze). */
function loadoutOf(state) {
  return state.slots[state.activeSlot];
}

/**
 * THE RE-BIND GATE: the bound Echo is a frozen snapshot and changes only
 * here. "The Echo only changes when the player re-binds it" (§13).
 */
function bindEcho(state) {
  const current = state.slots[state.activeSlot];
  const before = state.bound;
  record(state, 'bind', state.activeSlot, before, current);
  state.bound = clone(current);
  state.boundSlot = state.activeSlot;
  return { ok: true, bound: state.bound };
}

/** The bound Echo's loadout snapshot (null before the first bind). */
function boundEcho(state) {
  return state.bound;
}

/** Per-slot view of the ledger (swaps never rewrite history — T5.3). */
function ledgerFor(state, slot) {
  return state.ledger.filter((e) => e.slot === slot);
}

/**
 * Save/load round-trip (T9.1 pre-integration): the ledger, both slots, the
 * earned flag and the bound snapshot all survive. JSON-only by design.
 */
function exportSave(state) {
  return JSON.parse(JSON.stringify({
    slots: state.slots,
    activeSlot: state.activeSlot,
    twinLedgerEarned: state.twinLedgerEarned,
    bound: state.bound,
    boundSlot: state.boundSlot,
    ledger: state.ledger,
    seq: state._seq,
    storyState: state._storyState || [],
  }));
}

function importSave(json, opts = {}) {
  const s = typeof json === 'string' ? JSON.parse(json) : json;
  if (!s || !Array.isArray(s.slots) || s.slots.length < 1) {
    throw new Error('importSave: malformed loadout save (slots required)');
  }
  // Every slot must re-validate (T4.1: bad data fails loudly at load, never
  // mysteriously mid-reshape). Story vows present in the slots certify
  // themselves; the injected run state (opts.storyState) completes the set.
  const storyState = cleanStoryState(opts.storyState != null ? opts.storyState : s.storyState);
  const seen = new Set(storyState);
  for (const slot of s.slots) {
    if (slot && slot.vow) {
      const row = VOW_BY_ID.get(slot.vow);
      if (row && row.kind === 'story') seen.add(slot.vow);
    }
  }
  const certified = [...seen];
  s.slots.forEach((slot, i) => {
    const probe = { ...slot, storyState: certified };
    if (probe.vow) {
      const row = VOW_BY_ID.get(probe.vow);
      if (row && row.hidden) probe.allowHiddenVow = true;
    }
    if (probe.doctrine) {
      const d = DOCTRINE_BY_ID.get(probe.doctrine);
      if (d && d.reserved && !probe.rite) probe.allowReservedDoctrine = true;
    }
    const r = assembleBuild(probe);
    if (!r.ok) {
      throw new Error('importSave: slot ' + (i + 1) + ' is not a legal build — ' +
        r.errors.map((e) => `${e.code}(${e.field})`).join('; '));
    }
  });
  return {
    slots: s.slots,
    activeSlot: Math.min(Math.max(0, s.activeSlot | 0), s.slots.length - 1),
    twinLedgerEarned: !!s.twinLedgerEarned,
    bound: s.bound ?? null,
    boundSlot: s.boundSlot ?? null,
    ledger: Array.isArray(s.ledger) ? s.ledger : [],
    _seq: s.seq | 0,
    _storyState: storyState,
    _now: typeof opts.now === 'function' ? opts.now : null,
  };
}


module.exports = { createLoadoutState, canReshape, reshape, rewind, loadoutOf, bindEcho, boundEcho, ledgerFor, exportSave, importSave, earnedStoryVows, certifiedAllowances, RESHAPE_CONTEXTS, LEDGER_KINDS };
