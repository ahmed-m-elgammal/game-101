/**
 * rites.js — Rites of Passage ENGINE. [GDD] §5.7; T1.8.
 * A Rite is a data object (data/rites.js): { trigger: {atHP} | {onTurn},
 * change: {damageType, statMults, versePool, flags, special}, line }.
 * Mid-fight transformation as data — the game's ONE scripted mechanic,
 * reusable by bosses and Floor Echoes alike.
 *
 * Fires exactly at its trigger; stat mults multiply the per-fight sheet
 * copy; the Rite chip is panel-visible (§5.5, §11.4). Multi-trigger
 * sequences (Halbrey 66%/33%) fire in data order, once each.
 */

import { RITES } from '../data/rites.js';

/** Evaluate Rite triggers for a fighter at the current round/state. */
export function evalRites(fighter, round) {
  const raw = fighter.sheet.rite;
  const fired = [];
  const lines = [];
  if (!raw || !fighter.riteState) return { fired, lines };
  // sheet.rite is the Rite id (data/rites.js registry); resolve it here.
  const rite = typeof raw === 'string' ? RITES[raw] : raw;
  if (!rite || !Array.isArray(rite.triggers)) return { fired, lines };
  const state = fighter.riteState;
  for (let i = 0; i < rite.triggers.length; i++) {
    const t = rite.triggers[i];
    if (state.firedIdx.includes(i)) continue;
    if (t.trigger.atHP !== undefined) {
      const frac = fighter.hp / fighter.maxHp;
      if (frac <= t.trigger.atHP + 1e-9) { state.firedIdx.push(i); fired.push(t); }
    } else if (t.trigger.onTurn !== undefined) {
      if (round >= t.trigger.onTurn) { state.firedIdx.push(i); fired.push(t); }
    }
  }
  for (const t of fired) applyChange(fighter, t.change, lines);
  return { fired, lines };
}

function applyChange(fighter, change, lines) {
  const st = fighter.riteState;
  if (change.damageType) st.damageType = change.damageType;
  if (change.statMults) {
    for (const [k, m] of Object.entries(change.statMults)) {
      st.statMults[k] = (st.statMults[k] || 1) * m;
    }
  }
  if (change.flags) Object.assign(st.flags, change.flags);
  if (change.special === 'learn_most_cast') st.learn = { pending: true };
  if (change.line) lines.push(change.line);
  // Rite chip is panel-visible per §5.5/§11.4 (turns: 999 = phase marker)
  fighter.statuses.rite = { turns: 999, name: st.name || 'Rite' };
}
