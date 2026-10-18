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
  if (change.versePool) st.flags.versePool = [...change.versePool];
  if (change.special === 'learn_most_cast') st.learn = { pending: true };
  if (change.line) lines.push(change.line);
  // Rite chip is panel-visible per §5.5/§11.4 (turns: 999 = phase marker)
  fighter.statuses.rite = { turns: 999, name: st.name || 'Rite' };
}

/**
 * Temperature bar data exposure (§9.2 #14: "the game shows the temperature
 * as a bar"). Pure read over a fighter's rite state — the UI (T8.x) renders
 * it; tests assert it. Non-temperature fighters return null.
 *   molten — the molten band (>50% HP band, D10 levers live)
 *   sour   — the one-round Cantor cool window (Curse+Fray held, D10)
 *   cooled — the cooled band (<50%, +30% damage taken)
 */
export function temperatureState(fighter) {
  const flags = fighter && fighter.riteState ? fighter.riteState.flags : null;
  if (!flags || !('molten' in flags)) return null;
  const sour = !!(flags.molten && fighter.statuses.curse && fighter.statuses.fray);
  return {
    phase: flags.molten ? (sour ? 'sour' : 'molten') : 'cooled',
    molten: !!flags.molten,
    sour,
    hpFrac: fighter.maxHp > 0 ? fighter.hp / fighter.maxHp : 0,
  };
}

/**
 * The direct-damage multiplier the temperature state applies to the
 * DEFENDER (molten 0.5 — "takes 50% less direct damage"; cooled 1.3 —
 * "takes +30% damage"; the sour window forces the cooled number while
 * molten). Damage-type swaps and verse pools are rite data; THIS number is
 * the temperature's teeth. Pure — used by damage.js (audit-visible).
 */
export function temperatureDefenseMult(target) {
  const flags = target && target.riteState ? target.riteState.flags : null;
  if (!flags || flags.damageTakenMult === undefined) return { mult: 1, soured: false };
  const sour = !!(flags.molten && target.statuses.curse && target.statuses.fray);
  // The sour window: cooled vulnerability while the Rite re-heats (D10).
  const mult = flags.molten ? (sour ? 1.3 : flags.damageTakenMult) : flags.damageTakenMult;
  return { mult, soured: sour && flags.damageTakenMult !== mult };
}
