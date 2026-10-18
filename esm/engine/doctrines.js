/**
 * doctrines.js (engine) — T5.5: the four behavior profiles of [GDD] §12.2,
 * layered over the T5.4 shared rules. [GDD] §12.3 rules 1–3 are SHARED by
 * every doctrine (lethal check first, the pointless-cast filter, the Strike
 * fallback); the doctrine only decides HOW the surviving set is picked from.
 *
 *   Hymnal        — plays the slotted verses strictly in the order the
 *                   player set: the first usable slot in priority order.
 *   Predator      — the highest-damage verse it can afford each turn
 *                   (expected damage, the shared estimator); defends only
 *                   below 30% HP (utility verses become eligible there).
 *   Bulwark       — defensive verses first when below 70% HP or when no
 *                   Ward or Brace is active; otherwise follows Hymnal.
 *   Cantor's Hand — blends Hymnal with the verse most likely to be punished
 *                   by the opponent's active statuses: the usable verse with
 *                   the largest expected-damage component that comes FROM
 *                   the opponent's visible statuses (Bleed/Burn/debuff
 *                   scaling), plus a Cleanse that answers the debuffs they
 *                   applied to us. No such component → Hymnal order.
 *                   (ENG note: §12.2's "punished by the opponent's active
 *                   statuses" is implemented as exploitation of the visible
 *                   status board — the reading the estimator can measure.
 *                   Recorded in DECISIONS.md, Phase 5b.)
 *
 * WIRING (§12.2's "used identically by campaign enemies and Floor Echoes"):
 * the sheet's doctrine field drives this layer. A sheet without a doctrine
 * plays the T5.4 default scorer unchanged — that is every pinned fight and
 * every campaign enemy row (their canon behaviors are script/rite/special
 * data, not doctrine rows). Floor Echoes carry their doctrine on the row
 * (data/named-echoes.js) and hand it to the sheet via buildOf(echo).
 * Cantor's Hand stays reserved (data/doctrines.js `reserved`, enforced by
 * engine/build.js DOCTRINE_RESERVED).
 *
 * HONESTY (§12.3 rules 4–5): every doctrine decides from the same projection
 * the default path sees — visibleOf() only. The punish component is computed
 * BY DIFFERENCE between two estimator passes over the SAME projection (the
 * current vis vs a copy with the six debuff keys stripped, sharing one
 * defense map) — no second read of the raw defender ever happens.
 */

import { visibleOf, filterReasons, lethalOf, scoreVerse, expectedDamageOfEffect, expectedDamageOfVerseVis, chooseVerse } from './ai.js';
import { STRIKE } from '../data/verses.js';
import { DOCTRINE_IDS } from '../data/doctrines.js';

export const PREDATOR_DEFEND_BELOW_HP = 0.30; // §12.2 verbatim
export const BULWARK_DEFEND_BELOW_HP = 0.70;  // §12.2 verbatim
// Cleanse weight mirrors the shared scorer's own valuation (scoreVerse).
const CLEANSE_WEIGHT_ALL = 16;
const CLEANSE_WEIGHT_ONE = 8;

const hasDamageOp = (v) => (v.effects || []).some((e) => e.op === 'damage');
// "Defensive" = PROTECTION (§12.2 Bulwark): shield, mitigation, mending,
// purging. Amplifiers and control (burn amps, curse/hush riders, Resolve
// engines) are not defense — a Bulwark that spams a dead Stoke is the
// pathology the harness comparison exists to catch.
const DEFENSIVE_OPS = ['brace', 'ward', 'thorns', 'heal', 'cleanse'];
const isDefensive = (v) => !v.isStrike && (v.effects || []).some((e) => DEFENSIVE_OPS.includes(e.op));

/** The full scores table over every legal verse (filtered rows included). */
function scoreTable(actor, vis, legal, tuning, fortune, filter) {
  return legal.map((v) => ({
    id: v.id,
    score: scoreVerse(actor, vis, v, tuning, fortune),
    filtered: (filter[v.id] || []).length > 0,
    reasons: filter[v.id] || [],
    verse: v,
  })).sort((a, b) => b.score - a.score);
}

/** Hymnal's pick: the first usable NON-Strike verse in slot order. */
export function hymnalOf(usable) {
  return usable.find((v) => !v.isStrike) || null;
}

/** Predator's pick: highest expected damage among usable damage verses. */
export function predatorOf(actor, vis, usable, tuning, fortune, m) {
  const rows = [];
  for (const v of usable) {
    if (!hasDamageOp(v)) continue;
    const { expectation } = expectedDamageOfVerseVis(actor, vis, v, tuning, { fortune });
    rows.push({ verse: v, expectation });
  }
  if (rows.length === 0) return null;
  rows.sort((a, b) => b.expectation - a.expectation || a.verse.id.localeCompare(b.verse.id));
  const top = rows[0].expectation;
  const tied = rows.filter((r) => r.expectation === top);
  return tied.length === 1 ? tied[0].verse : tied[m.band(tied.length)].verse;
}

/** Bulwark's pick: the best-scoring defensive verse among the usable. */
export function bulwarkOf(actor, vis, usable, tuning, fortune, m) {
  const rows = usable.filter(isDefensive)
    .map((v) => ({ verse: v, score: scoreVerse(actor, vis, v, tuning, fortune) }));
  if (rows.length === 0) return null;
  rows.sort((a, b) => b.score - a.score || a.verse.id.localeCompare(b.verse.id));
  const top = rows[0].score;
  const tied = rows.filter((r) => r.score === top);
  return tied.length === 1 ? tied[0].verse : tied[m.band(tied.length)].verse;
}

/**
 * The visible-status board a verse can exploit, with the six debuff keys
 * stripped — shared with the current vis's defense map so the difference of
 * the two estimator passes isolates the status-scaling component exactly.
 */
export function strippedVis(vis) {
  const s = vis.statuses || {};
  const statuses = {};
  if (s.ward) statuses.ward = s.ward;
  if (s.brace) statuses.brace = s.brace;
  if (s.thorns) statuses.thorns = s.thorns;
  return { ...vis, statuses };
}

const DEBUFF_KEYS = ['bleed', 'burn', 'curse', 'fray', 'hush', 'stun'];

/** Cantor's Hand: the punish component of one verse (≥ 0). */
export function punishScore(actor, vis, verse, tuning, fortune) {
  let delta = 0;
  for (const e of verse.effects || []) {
    if (e.op !== 'damage') continue;
    const cur = expectedDamageOfEffect(actor, vis, e, tuning, { fortune, defenseMap: vis.defenseMap });
    const base = expectedDamageOfEffect(actor, strippedVis(vis), e, tuning, { fortune, defenseMap: vis.defenseMap });
    delta += cur.expectation - base.expectation;
  }
  const cleanse = (verse.effects || []).find((e) => e.op === 'cleanse');
  if (cleanse) {
    const ownDebuffs = DEBUFF_KEYS.filter((k) => actor.statuses[k]).length;
    if (ownDebuffs > 0) delta += (cleanse.all ? CLEANSE_WEIGHT_ALL : CLEANSE_WEIGHT_ONE);
  }
  return delta;
}

/** Cantor's Hand's pick: the strongest punished verse, else null (→ Hymnal). */
function cantorOf(actor, vis, usable, tuning, fortune, m) {
  const rows = [];
  for (const v of usable) {
    const p = punishScore(actor, vis, v, tuning, fortune);
    if (p > 0) rows.push({ verse: v, p });
  }
  if (rows.length === 0) return null;
  rows.sort((a, b) => b.p - a.p || a.verse.id.localeCompare(b.verse.id));
  const top = rows[0].p;
  const tied = rows.filter((r) => r.p === top);
  return tied.length === 1 ? tied[0].verse : tied[m.band(tied.length)].verse;
}

/**
 * The doctrine-aware entry point — the fight loop calls THIS (fight.js),
 * tests may call ai.chooseVerse directly for the default path. A sheet
 * without a known doctrine plays the default scorer, byte-identical.
 */
export function chooseVerseByDoctrine(actor, target, state, m, tuning, legalVersesOf) {
  const doctrine = (actor.sheet && actor.sheet.doctrine) || null;
  const legal = legalVersesOf();
  if (!doctrine || !DOCTRINE_IDS.includes(doctrine)) {
    return chooseVerse(actor, target, state, m, tuning, legalVersesOf);
  }
  if (legal.length === 0) {
    return { verse: STRIKE, scores: [], tieBreak: false, empty: true, doctrine };
  }
  const vis = visibleOf(target, tuning);
  const fortune = state && state.fortune != null ? state.fortune : 1.0;

  // Shared Rule 1 — the lethal check, before any doctrine flavor.
  const lethal = lethalOf(actor, vis, legal, tuning, fortune);
  if (lethal) {
    const { tied } = lethal;
    const filter = {};
    const scores = scoreTable(actor, vis, legal, tuning, fortune, filter);
    if (tied.length === 1) {
      return { verse: tied[0].verse, scores, tieBreak: false, lethal: true, filter: {}, doctrine };
    }
    const pick = tied[m.band(tied.length)];
    return { verse: pick.verse, scores, tieBreak: true, lethal: true, filter: {}, doctrine };
  }

  // Shared Rule 2 — the pointless-cast filter.
  const usable = [];
  const filter = {};
  for (const v of legal) {
    const reasons = filterReasons(v, actor, vis);
    filter[v.id] = reasons;
    if (reasons.length === 0) usable.push(v);
  }

  // Shared Rule 3 — nothing useful → Strike.
  const strikeFallback = () => {
    const strike = legal.find((v) => v.isStrike) || legal[0];
    const scores = scoreTable(actor, vis, legal, tuning, fortune, filter);
    return { verse: strike, scores, tieBreak: false, fallback: true, filter, doctrine };
  };
  if (usable.length === 0) return strikeFallback();

  const pickBy = (v, extra = {}) => ({
    verse: v,
    scores: scoreTable(actor, vis, legal, tuning, fortune, filter),
    tieBreak: false,
    filter,
    doctrine,
    ...extra,
  });

  switch (doctrine) {
    case 'hymnal': {
      const pick = hymnalOf(usable);
      if (!pick) return strikeFallback();
      return pickBy(pick);
    }
    case 'predator': {
      const ownHpFrac = actor.maxHp > 0 ? actor.hp / actor.maxHp : 1;
      // "Defends only below 30% HP": above the line, damage verses only.
      if (ownHpFrac >= PREDATOR_DEFEND_BELOW_HP) {
        const pick = predatorOf(actor, vis, usable, tuning, fortune, m);
        if (!pick) return strikeFallback(); // nothing damaging affordable
        // Strike-only damage = the Rule-3 situation for a predator: label it.
        const fallback = pick.isStrike && legal.some((v) => !v.isStrike) || undefined;
        return pickBy(pick, { fallback });
      }
      // Below the line: the default shared scoring (defends naturally).
      const scored = usable.map((v) => ({ v, s: scoreVerse(actor, vis, v, tuning, fortune) }))
        .sort((a, b) => b.s - a.s || a.v.id.localeCompare(b.v.id));
      const top = scored[0].s;
      const tied = scored.filter((r) => r.s === top);
      const pick = tied.length === 1 ? tied[0].v : tied[m.band(tied.length)].v;
      return pickBy(pick);
    }
    case 'bulwark': {
      const ownHpFrac = actor.maxHp > 0 ? actor.hp / actor.maxHp : 1;
      const noShieldUp = !actor.statuses.ward && !actor.statuses.brace;
      const defend = ownHpFrac < BULWARK_DEFEND_BELOW_HP || noShieldUp;
      if (defend) {
        const pick = bulwarkOf(actor, vis, usable, tuning, fortune, m);
        if (pick) return pickBy(pick);
      }
      const pick = hymnalOf(usable); // otherwise follows Hymnal
      if (!pick) return strikeFallback();
      return pickBy(pick);
    }
    case 'cantors_hand': {
      const pick = cantorOf(actor, vis, usable, tuning, fortune, m);
      if (!pick) {
        const hymnal = hymnalOf(usable);
        if (!hymnal) return strikeFallback();
        return pickBy(hymnal);
      }
      return pickBy(pick);
    }
    default:
      return chooseVerse(actor, target, state, m, tuning, legalVersesOf);
  }
}


