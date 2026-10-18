/**
 * twin-ledger.js — T5.3: the Twin Ledger. [01] R4; D3 APPROVED; F6.
 *
 *   "The candle remembers a second way you held it."
 *   Unlocked by Ch3 Devotion. Effect: unlock a second saved loadout. Both
 *   loadouts live in the Hymnal; swapping between them is free at any shrine
 *   AND on the pre-fight Reading screen, for the rest of the run (and both
 *   remain available on the Choir Floor after the ending — the Echo binds
 *   whichever was active).
 *
 * D3's ruling (docs/DECISIONS.md §1): "Ch3 Devotion grants the Twin Ledger:
 * a second saved loadout, swappable free at shrines and pre-fight, Floor-
 * compatible after the ending. It is never a reshaping discount (reshaping
 * is already free)." The PROVISIONAL:D3 fallback (once-per-fight Act II
 * re-slot) is deliberately NOT built — the task forbids building it without
 * a decision, and the decision is recorded for the Twin Ledger.
 *
 * Slot rules:
 *   - one loadout slot by default; the second EXISTS only once earned
 *     (granted once — Ch3 Devotion happens once per run)
 *   - swap points: 'shrine' and 'reading' (the pre-fight Reading screen —
 *     the Choir Floor's pre-fight screen IS a Reading). Mid-fight or
 *     context-free swaps are refused.
 *   - the Reshape Ledger is global and append-only; entries tag their slot,
 *     so a swap never rewrites either slot's history
 *   - Floor re-bind semantics: a swap does NOT move the bound Echo — the
 *     Echo binds whichever loadout is active at the moment of the (re-)bind
 *     (the T5.2 gate holds; acceptance: "Echo binds the active loadout")
 *   - earned state rides the save (T5.2's export/import) — the reward is
 *     permanent for the rest of the run, including after the ending
 */

const { assembleBuild } = require('../engine/build.js');
const { bindEcho, reshape } = require('./loadout.js');

const SWAP_CONTEXTS = ['shrine', 'reading'];

/**
 * The Ch3-Devotion reward: earn the second slot. The new slot starts as a
 * copy of the current loadout (a legal build to edit from the Hymnal).
 * Granting twice is refused — the choice happens once per run.
 */
function earnTwinLedger(state) {
  if (state.twinLedgerEarned) {
    return { ok: false, error: 'the Twin Ledger is already earned' };
  }
  state.twinLedgerEarned = true;
  state.slots.push(JSON.parse(JSON.stringify(state.slots[state.activeSlot])));
  return { ok: true, slots: state.slots.length };
}

/** Convenience read for UI gates (Hymnal slot header, Reading swap button). */
function hasTwinLedger(state) {
  return state.twinLedgerEarned && state.slots.length === 2;
}

/**
 * Free swap between the two loadouts. Context must be 'shrine' or 'reading'
 * (R4's two swap points). A swap is recorded on the ledger (kind 'swap')
 * but rewrites nothing — per-slot history is preserved by construction.
 */
function swapLoadout(state, context) {
  if (!state.twinLedgerEarned) {
    return { ok: false, error: 'the Twin Ledger is not earned (Ch3 Devotion)' };
  }
  if (!SWAP_CONTEXTS.includes(context)) {
    return { ok: false, error: `swap is allowed only at a shrine or on the pre-fight Reading (got "${context}")` };
  }
  if (state.slots.length !== 2) {
    return { ok: false, error: 'two loadouts required' };
  }
  const from = state.activeSlot;
  const to = 1 - from;
  const entry = {
    seq: (state._seq += 1),
    kind: 'swap',
    slot: to,
    before: { slot: from, loadout: JSON.parse(JSON.stringify(state.slots[from])) },
    after: { slot: to, loadout: JSON.parse(JSON.stringify(state.slots[to])) },
    context,
  };
  if (state._now) entry.at = state._now(entry.seq);
  state.ledger.push(entry);
  state.activeSlot = to;
  return { ok: true, activeSlot: to };
}

/**
 * Floor re-bind: bind the ACTIVE loadout to the Echo. Thin over T5.2's
 * bindEcho so the Floor path names its intent; the gate (bound changes only
 * on explicit re-bind) is enforced there and tested from both sides.
 */
function bindActiveLoadoutToEcho(state) {
  return bindEcho(state);
}

/**
 * Fill/edit the second slot through the same reshape rules as the first —
 * the Hymnal edits the ACTIVE slot; after a swap this is the Twin's second
 * loadout. `patch` is a partial T5.1 build. (Convenience wrapper that names
 * the Twin Ledger intent in callers' code.)
 */
function reshapeActive(state, patch, context) {
  return reshape(state, patch, context);
}


module.exports = { earnTwinLedger, hasTwinLedger, swapLoadout, bindActiveLoadoutToEcho, reshapeActive, SWAP_CONTEXTS };
