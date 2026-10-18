/**
 * ai.js — the Echo AI's SHARED rules. [GDD] §12.3, §10.9 rule 6, §17 risk #1.
 * T5.4: the fixed scoring formula, the lethal check, the pointless-cast
 * filter and the Strike fallback — the quality bar every doctrine (T5.5)
 * layers over and every enemy plays under.
 *
 * THE HONESTY BOUNDARY (§12.3 rules 4–5, structurally enforced):
 *   chooseVerse receives the raw ACTOR (an AI may know its own build) but the
 *   TARGET only through visibleOf() — a projection carrying exactly what the
 *   panel shows: HP, Resolve, the status chips (with their VALUES, stripped
 *   of the internal transport fields that would leak a vow or a mark), the
 *   D10 temperature bar when one is exposed, and the defender's current
 *   mitigation constants. Slotted verses, vow, gear, cooldowns and sheet
 *   identity are ABSENT from the projection — tests/phase5-ai.test.js pins
 *   this with a trapping Proxy: any read of a hidden key throws.
 *
 * Ban 6 (§10.9 rule 6): every verse is scored with a fixed formula; only
 * EXACT ties (at the computable 2dp level) are broken randomly, and then
 * only among equals — Band(k) over the tied set. A decisive board consumes
 * no Measure draws at all.
 *
 * Rule order (§12.3):
 *   1. Lethal check — any usable damaging verse EXPECTED to kill is cast
 *      (highest expected damage first; exact ties → Band(k)). Expected =
 *      expectedDirectDamage — the shared, non-mutating mirror of the §5.4
 *      pipeline (jitter at center, no crit) in engine/damage.js: ONE
 *      implementation of the damage order, shared with the Reading tools.
 *   2. Pointless-cast filter — no re-applying a debuff that is already
 *      active, no heal above 65% HP, no cleanse when clean, no Thorns when
 *      up, no Resolve verse above 3. A verse is filtered when it has no
 *      damage op (damage is never pointless) and EVERY one of its ops is
 *      pointless; a `double`-burn verse amplifies rather than re-applies.
 *   3. Strike fallback — nothing useful (or nothing unfiltered) → Strike.
 *
 * The Rites-of-Passage activation (T4.5's deferred `wire: 'T5.4'`) lives
 * here too: maybeActivateOncePerFight fires the once-per-fight transform
 * when it strictly raises the best expected damage against the current
 * target — deterministic, at most once per fight, and only for AI-driven
 * sides (the manual surface is the loadout UI's, T8.x; recorded in
 * DECISIONS.md as the Phase-5a split).
 */

import { STRIKE } from '../data/verses.js';
import { expectedDirectDamage } from './damage.js';
import { activateOncePerFight } from './marks.js';

const DEBUFF_KEYS = ['bleed', 'burn', 'curse', 'fray', 'hush', 'stun'];
const HEAL_ABOVE_HP = 0.65;
const RESOLVE_ABOVE = 3;

/**
 * The visible-opponent projection — the ONLY target view the AI logic
 * receives. Everything here is on the fighter panel (§14.3, §11.4/§11.5):
 * HP, Resolve, status chips with values, the temperature bar (D10), and the
 * defender's mitigation constants (public math over the class's published
 * stats — never the vow/gear identities that produce them).
 */
export function visibleOf(f, tuning) {
  if (!f) return null;
  const s = f.statuses || {};
  const vis = {
    hp: f.hp,
    maxHp: f.maxHp,
    resolve: f.resolve ?? 0,
    statuses: {},
    defense: {},
  };
  if (s.bleed) vis.statuses.bleed = { stacks: s.bleed.stacks | 0 };
  if (s.burn) vis.statuses.burn = { potency: s.burn.potency };
  if (s.curse) vis.statuses.curse = {};
  if (s.fray) vis.statuses.fray = {};
  if (s.hush) vis.statuses.hush = {};
  if (s.stun) vis.statuses.stun = { skipNext: !!s.stun.skipNext };
  if (s.brace) vis.statuses.brace = { turns: s.brace.turns };
  if (s.ward) vis.statuses.ward = { pool: s.ward.pool };
  if (s.thorns) vis.statuses.thorns = { value: s.thorns.value };
  // D10 bar exposure — the temperature state is UI-visible (§9.2 #14)
  const flags = f.riteState && f.riteState.flags;
  if (flags && flags.damageTakenMult !== undefined) {
    vis.temperature = { molten: !!flags.molten, damageTakenMult: flags.damageTakenMult };
    vis.riteState = { flags: { molten: !!flags.molten, damageTakenMult: flags.damageTakenMult } };
  }
  // mitigation constants for the estimator (computed HERE, at the boundary —
  // the AI's decision logic never touches the raw defender)
  for (const t of ['steel', 'ember', 'shade']) {
    vis.defense[t] = defenseConstant(f, t, tuning);
  }
  vis.defenseMap = vis.defense;
  return vis;
}

/** The current mitigation constant of a fighter against one damage type. */
export function defenseConstant(f, dmgType, tuning) {
  // Local re-derivation to keep the projection self-contained (the same
  // summation the damage pipeline performs, in the same order).
  const mods = f.mods || {};
  const fray = f.statuses.fray ? tuning.frayGuardMult : 1;
  const grd = f.sheet.stats.grd * fray;
  const perGrd = dmgType === 'steel' ? tuning.mitSteelPerGrd : tuning.mitMagicPerGrd;
  let mit = perGrd * grd;
  if (f.statuses.brace) mit += mods.braceBonus ?? tuning.braceBonus;
  if (mods.mitBonus) mit += mods.mitBonus;
  const items = f.sheet.items || [];
  const brassCap = items.includes(tuning.items.ashGlazedBrassId)
    ? tuning.mitCapAshGlazed
    : tuning.mitCap;
  const cap = Math.max(brassCap, mods.mitCapOverride || 0);
  return Math.min(cap, Math.max(0, mit));
}

/** Distinct debuff count on a projection or fighter. */
function distinctVisDebuffs(t) {
  let n = 0;
  for (const k of DEBUFF_KEYS) if (t.statuses[k]) n += 1;
  return n;
}

/**
 * Expected damage of ONE damage effect, mirroring executeVerse's spec
 * resolution (ember shift, fired-rite re-keying, 'main'/'true' typing) and
 * calling the shared estimator. `opts.defense` injects the projection's
 * precomputed mitigation constant; `opts.damageTypeOverride` simulates the
 * Rites-of-Passage transform without touching the fighter.
 * Returns the multi-hit total: { land, expectation }.
 */
export function expectedDamageOfEffect(actor, target, e, tuning, opts = {}) {
  const shift = opts.damageTypeOverride != null
    ? { type: opts.damageTypeOverride, bonus: opts.damageBonusOverride || 0 }
    : (actor.flags && actor.flags.emberShift
      ? { type: 'ember', bonus: actor.flags.emberShift.bonus }
      : null);
  const rawType = shift
    ? shift.type
    : (e.type === 'true'
      ? 'true'
      : (actor.riteState && actor.riteState.damageType
        ? actor.riteState.damageType
        : (e.type === 'main' ? actor.sheet.damageType : (e.type || actor.sheet.damageType))));
  const spec = {
    base: e.base,
    coefs: e.coefs,
    type: rawType === 'true' ? actor.sheet.damageType : rawType,
    bonusIfTargetBurning: e.bonusIfTargetBurning,
    perDebuffPct: e.perDebuffPct,
    perDebuffFlat: e.perDebuffFlat,
    perDebuffFlatMax: e.perDebuffFlatMax,
    mitigationFactor: e.mitigationFactor,
    ignoreMit: e.ignoreMit || e.type === 'true',
    perBleedStack: !!(e.perBleedStackTrue || e.perBleedStackIgnoreMit),
  };
  const hits = e.hits || 1;
  let land = 0;
  let expectation = 0;
  // simulated ward pool drains across hits exactly as the fight would
  let pool = target.statuses.ward ? target.statuses.ward.pool : 0;
  for (let h = 0; h < hits; h++) {
    const r = expectedDirectDamage(actor, target, spec, tuning, {
      bleedStacks: target.statuses.bleed ? target.statuses.bleed.stacks : 0,
      fortune: opts.fortune,
      // the projection path: the defense constant was computed at the
      // honesty boundary (visibleOf); never re-derive it from the target
      defense: opts.defenseMap ? opts.defenseMap[spec.type] : opts.defense,
      bonusOverride: shift ? shift.bonus : undefined,
    });
    land += r.land;
    expectation += r.expectation;
    if (pool > 0) {
      const drained = Math.min(pool, r.preWard);
      pool -= drained;
    }
  }
  return { land, expectation };
}

/** All damage effects of a verse, summed (multi-hit × multi-op). */
function expectedDamageOfVerse(actor, target, verse, tuning, opts = {}) {
  let land = 0;
  let expectation = 0;
  for (const e of verse.effects || []) {
    if (e.op !== 'damage') continue;
    const r = expectedDamageOfEffect(actor, target, e, tuning, opts);
    land += r.land;
    expectation += r.expectation;
  }
  return { land, expectation };
}

/** Verse damage with the projection's defense map supplied. */
function expectedDamageOfVerseVis(actor, vis, verse, tuning, opts = {}) {
  return expectedDamageOfVerse(actor, vis, verse, tuning, { ...opts, defenseMap: vis.defenseMap });
}

/**
 * Rule 2 — the pointless-cast filter. Returns the reason codes (empty when
 * the cast is useful). Only verses WITHOUT a damage op can be pointless;
 * a multi-op utility verse is filtered when every op is.
 */
export function filterReasons(verse, actor, vis) {
  const reasons = [];
  const effects = verse.effects || [];
  if (effects.some((e) => e.op === 'damage')) return reasons; // damage never pointless
  const ownDebuffs = DEBUFF_KEYS.filter((k) => actor.statuses[k]);
  const ownHpFrac = actor.maxHp > 0 ? actor.hp / actor.maxHp : 1;
  for (const e of effects) {
    switch (e.op) {
      case 'bleed+': if (vis.statuses.bleed) reasons.push('reapply:bleed'); break;
      case 'burn':
        // a `double` burn AMPLIFIES the active burn (Fan the Flames) —
        // applying fresh burn onto a burning target is the pointless case
        if (!e.double && vis.statuses.burn) reasons.push('reapply:burn');
        break;
      case 'curse': if (vis.statuses.curse) reasons.push('reapply:curse'); break;
      case 'fray': if (vis.statuses.fray) reasons.push('reapply:fray'); break;
      case 'hush': if (vis.statuses.hush) reasons.push('reapply:hush'); break;
      case 'stun': if (vis.statuses.stun) reasons.push('reapply:stun'); break;
      case 'heal': if (ownHpFrac > HEAL_ABOVE_HP) reasons.push('heal:above-65'); break;
      case 'cleanse': if (ownDebuffs.length === 0) reasons.push('cleanse:clean'); break;
      case 'thorns': if (actor.statuses.thorns) reasons.push('thorns:up'); break;
      case 'resolve': if ((actor.resolve ?? 0) > RESOLVE_ABOVE) reasons.push('resolve:above-3'); break;
      default: break; // brace/ward/… are always legitimate preparation
    }
  }
  // every op pointless → the whole cast is; any useful op keeps the verse
  return reasons.length && reasons.length === effects.length ? reasons : [];
}

/** The fixed per-op scoring weights (2dp — the computable tie contract). */
function scoreVerse(actor, vis, verse, tuning, fortune) {
  let score = 0;
  const stats = actor.sheet.stats;
  const ownHpFrac = actor.maxHp > 0 ? actor.hp / actor.maxHp : 1;

  for (const e of verse.effects || []) {
    switch (e.op) {
      case 'damage': {
        const r = expectedDamageOfEffect(actor, vis, e, tuning, { fortune, defenseMap: vis.defenseMap });
        score += r.expectation; // float expectation keeps near-misses distinct
        if (e.lifestealPct) score += e.lifestealPct * r.expectation * (1 - ownHpFrac) * 1.5;
        break;
      }
      case 'bleed+': {
        const cur = vis.statuses.bleed ? vis.statuses.bleed.stacks : 0;
        score += Math.min(tuning.bleedCap, cur + (e.stacks || 0)) * 9;
        break;
      }
      case 'burn':
        if (e.double && vis.statuses.burn) score += vis.statuses.burn.potency * 2.2;
        else if (e.potencyBonus) score += 4;
        else score += (2 + 0.25 * stats.wit) * 2.4;
        break;
      case 'curse': score += vis.statuses.curse ? 2 : 14; break;
      case 'fray': score += vis.statuses.fray ? 2 : 9; break;
      case 'hush': score += vis.statuses.hush ? 2 : 10 + vis.resolve * 0.5; break;
      case 'stun': score += vis.statuses.stun ? 0 : 22; break;
      case 'brace': score += (1 - ownHpFrac) * 12 + 3; break;
      case 'ward': {
        let pool = e.base || 0;
        for (const c of e.coefs || []) {
          const k = c.stat === 'main' ? actor.sheet.mainStat : c.stat;
          pool += c.c * stats[k];
        }
        score += pool * 0.95;
        break;
      }
      case 'thorns':
        score += (e.base + (e.coefs || []).reduce((s, c) => s + c.c * stats[c.stat], 0)) * 1.6;
        break;
      case 'heal': {
        let amt = e.base || 0;
        for (const c of e.coefs || []) amt += c.c * stats[c.stat];
        score += Math.min(actor.maxHp - actor.hp, amt) * 1.15;
        break;
      }
      case 'resolve':
        score += (e.amount ?? 0) * 1.4
          + (e.amountPerBleedStack ? (vis.statuses.bleed ? vis.statuses.bleed.stacks : 0) * 1.4 : 0);
        break;
      case 'cleanse': score += e.all ? 16 : 8; break; // pointless boards are filtered first
      case 'selfTrue': score -= (e.amount ?? 0) * (0.5 + ownHpFrac); break;
      default: break;
    }
  }
  score -= verse.cost * 1.2; // spend efficiency; Strike (0) banks Resolve
  if (verse.isStrike) score += 1.0; // never a dead turn
  return Math.round(score * 100) / 100;
}

/**
 * The Echo AI's shared decision. Same interface the Phase-1 placeholder
 * held (T5.5's doctrines wrap, not replace, this):
 *   chooseVerse(actor, target, state, m, tuning, legalVersesOf)
 *     → { verse, scores, tieBreak, lethal?, fallback?, filter: {} }
 */
export function chooseVerse(actor, target, state, m, tuning, legalVersesOf) {
  const legal = legalVersesOf();
  if (legal.length === 0) {
    // Unreachable by construction (Strike is free); the guard keeps the
    // engine total anyway (Ban 6: no randomness in AI competence).
    return { verse: STRIKE, scores: [], tieBreak: false, empty: true };
  }
  // THE HONESTY BOUNDARY: from here on, the target exists only as `vis`.
  const vis = visibleOf(target, tuning);
  const fortune = state && state.fortune != null ? state.fortune : 1.0;

  // Rule 1 — the lethal check (before the filter: a killing blow is never
  // pointless). Highest expected damage first; exact ties → Band(k).
  const lethalRows = [];
  for (const v of legal) {
    const { land } = expectedDamageOfVerseVis(actor, vis, v, tuning, { fortune });
    if (land >= vis.hp) lethalRows.push({ verse: v, land });
  }
  if (lethalRows.length) {
    lethalRows.sort((a, b) => b.land - a.land || a.verse.id.localeCompare(b.verse.id));
    const top = lethalRows[0].land;
    const tied = lethalRows.filter((r) => r.land === top);
    const scores = legal.map((v) => ({
      id: v.id,
      score: scoreVerse(actor, vis, v, tuning, fortune),
      verse: v,
    })).sort((a, b) => b.score - a.score);
    if (tied.length === 1) {
      return { verse: tied[0].verse, scores, tieBreak: false, lethal: true, filter: {} };
    }
    const pick = tied[m.band(tied.length)];
    return { verse: pick.verse, scores, tieBreak: true, lethal: true, filter: {} };
  }

  // Rule 2 — the pointless-cast filter.
  const usable = [];
  const filter = {};
  for (const v of legal) {
    const reasons = filterReasons(v, actor, vis);
    filter[v.id] = reasons;
    if (reasons.length === 0) usable.push(v);
  }

  // Rule 3 — nothing useful → Strike (the pool always holds a fallback).
  if (usable.length === 0) {
    const strike = legal.find((v) => v.isStrike) || legal[0];
    const scores = legal.map((v) => ({
      id: v.id,
      score: scoreVerse(actor, vis, v, tuning, fortune),
      verse: v,
    })).sort((a, b) => b.score - a.score);
    return { verse: strike, scores, tieBreak: false, fallback: true, filter };
  }

  // Fixed-formula scoring over the usable set; only EXACT ties random.
  const scored = usable.map((v) => ({ verse: v, score: scoreVerse(actor, vis, v, tuning, fortune) }));
  scored.sort((a, b) => b.score - a.score || a.verse.id.localeCompare(b.verse.id));
  const top = scored[0].score;
  const tied = scored.filter((s) => s.score === top);
  // "fell back to Strike" labeling: the fallback fires when NOTHING usable
  // survived (handled above) or when Strike is the only usable cast while
  // named verses existed in the pool — the canon Rule-3 situation.
  const fellBack = legal.length > 1 && usable.length === 1 && usable[0].isStrike;
  // the reported table covers every legal verse (filtered rows carry their
  // would-be score + reasons) — the directionality/misuse tools read it
  const scores = legal.map((v) => {
    const hit = scored.find((s) => s.verse.id === v.id);
    return {
      id: v.id,
      score: hit ? hit.score : scoreVerse(actor, vis, v, tuning, fortune),
      filtered: (filter[v.id] || []).length > 0,
      reasons: filter[v.id] || [],
      verse: v,
    };
  }).sort((a, b) => b.score - a.score);
  if (tied.length === 1) {
    return { verse: tied[0].verse, scores, tieBreak: false, filter, fallback: fellBack || undefined };
  }
  const pick = tied[m.band(tied.length)];
  return { verse: pick.verse, scores, tieBreak: true, filter, fallback: fellBack || undefined };
}

/**
 * Rites of Passage (T4.5's `wire: 'T5.4'`): fire the once-per-fight
 * transform when it STRICTLY raises the best expected damage against the
 * current target. Deterministic, honest (own state + the visible target
 * only), at most once per fight (the spent flag guards). Called from the
 * fight loop's AI turn, before chooseVerse, with the already-legal pool
 * (the same pool the verse choice scores — the transform is judged against
 * what the AI can actually cast this turn).
 */
export function maybeActivateOncePerFight(session, actor, legalPool) {
  const entries = (actor.mods && actor.mods.oncePerFight) || [];
  if (!entries.length || !Array.isArray(legalPool) || legalPool.length === 0) return null;
  const tuning = session.tuning;
  const vis = visibleOf(actor.opponent, tuning);
  const fortune = session.state.fortune != null ? session.state.fortune : 1.0;

  const bestOf = (opts) => {
    let best = 0;
    for (const v of legalPool) {
      const { land } = expectedDamageOfVerseVis(actor, vis, v, tuning, { fortune, ...opts });
      if (land > best) best = land;
    }
    return best;
  };
  const before = bestOf({});

  for (const entry of entries) {
    const flag = `opf_${entry.key}`;
    if (actor.flags[flag]) continue; // already spent — at most once per fight
    const t = entry.transform || {};
    const after = bestOf({
      damageTypeOverride: t.damageType || null,
      damageBonusOverride: t.damageBonusPct || 0,
    });
    if (after > before) {
      const r = activateOncePerFight(actor, entry.key, tuning);
      if (r.ok) {
        session.logLine('rite', actor.side,
          `${actor.sheet.name} turns the page — the borrowed rite takes hold (${t.damageType || 'same steel'}, +${Math.round((t.damageBonusPct || 0) * 100)}% damage, ${t.turns} turns).`);
        return { ok: true, key: entry.key, before, after };
      }
    }
  }
  return null;
}
