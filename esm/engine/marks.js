/**
 * marks.js — T4.5 companion: the engine layer that makes item MARKS real.
 * [GDD] §8 ("each item gives small stat bonuses and one mark, a passive that
 * bends a rule"). Data lives in data/items.js; this module compiles a
 * sheet's gear into:
 *
 *   markMods(sheet)              — passive bundle merged into the fighter's
 *                                  mods at toRuntime (fight.js), with EXPLICIT
 *                                  combination rules vs vow mods (sum / max,
 *                                  documented per field).
 *   statusBlocked(f, key)        — mark immunities (Deaf Wax, Tide-Soaked,
 *                                  Corvane's Grey Coat while Braced).
 *   applyFightStartMarks(f, log) — start states (Brace/Ward/Resolve grants).
 *   turnStartMarks(f, round, tuning, log) — round triggers (Bell of Nine),
 *                                  ember-shift expiry, Drowned Mantle heal.
 *   effectiveCost(f, verse, tuning) — Vigil's Ring (Brace free) + Orrery Lens
 *                                  (second cast −1) resolve pricing.
 *   activateOncePerFight(f, key, tuning) — the once-per-fight ember shift
 *                                  (Rites of Passage); activation trigger is
 *                                  doctrine/AI wiring (T5.4), the effect is
 *                                  live now.
 *
 * Combination rules (vow vs mark), applied ONLY when both present:
 *   bleedCap:        max   (Red Tide 8 vs Marrow-Furnace 7 → 8)
 *   burnPotency:     sum   (Slow Ash + Ysolde's Censer + Reliquary Lantern)
 *   burnTurns:       sum   (Slow Ash + Cinder Apron)
 *   hushMod:         max   (Silence 3 vs Tollward's Rod 3)
 *   hushApplyResolve:sum   (Silence +1, Chorister's Robe +2)
 *   curseMult (depth): min — the deepest curse the fighter can apply
 *   everything else: fields are mark-exclusive by construction
 *
 * Determinism: every RNG-consuming mark (Tuning Fork's 20% Hush) consumes
 * the Measure ONLY when its item is present — builds without the item draw
 * the exact same stream as before Phase 4 (replay stability).
 */

import { getItem } from '../data/items.js';

/** Compile a sheet's item ids into one passive bundle (zeros when no gear). */
export function markMods(sheet, tuning) {
  const mods = {
    // damage
    markDamagePct: 0,            // flat +10% (Tithe-Collector's Ledger)
    vsHpBelow: null,             // {pct, hp} (Pallbearer's Mace)
    vsHpAbove: null,             // {pct, hp} (Pale Ash Blade)
    markPerDebuffFlat: 0,        // +1/debuff (Choir-Scale Blade)
    critTiers: null,             // [{hpAbove, mult}] (Corvane's Blade, F28)
    // on-hit
    onHitHushChance: 0,          // 0.2 (Cantor's Tuning Fork)
    firstHitBleed: 0,            // +2 stacks on first landed hit (Salt-Reaper)
    bleedFirstApplyBonus: 0,     // +2 stacks on first Bleed APPLY (Wick-Cutter)
    attackerTrueOnHit: 0,        // 3 (Bellmetal Gauntlets)
    thornsReflectBonusPct: 0,    // +50% of triggering damage (Founder's Chisel)
    // DoT shaping
    bleedCapOverride: 0,         // 7 (Marrow-Furnace)
    burnPotencyBonus: 0,         // +2 Censer, +1 Lantern
    burnSelfTick: 0,             // 1 (Ysolde's Censer)
    burnTurnsBonus: 0,           // +1 (Cinder Apron)
    curseMultOverride: 0,        // 0.65 (Gravedust Censer)
    // hush economy
    hushModOverride: 0,          // 3 (Tollward's Rod)
    hushTurnsBonus: 0,           // +1 (Orrery Robe)
    hushApplyResolve: 0,         // +2 (Drowned Chorister's Robe)
    hushCritReduction: 0,        // 0.1 (Choir-Seal) — travels on the hush
    // defence
    mitCapOverride: 0,           // 0.7 (Ash-Glazed Brass)
    immune: [],                  // ['burn'] / ['hush','stun']
    immuneWhileBraced: [],       // ['hush'] (Corvane's Grey Coat)
    braceTurnsBonus: 0,          // +1 (Warden's Cassock)
    braceGrantsWard: 0,          // 4 (Bellmetal Maul)
    braceCostsZero: false,       // Vigil's Ring
    wardDotAbsorb: 0,            // 1/tick (Founder's Leather)
    fatigueReduction: 0,         // 2 (Thimble Coat)
    turnStartHeal: 0,            // 3 (Drowned Mantle)
    // economy / order
    fightStart: null,            // {ward, resolve, brace}
    roundTriggers: [],           // [{atRound, grant}] (Bell of Nine Tolls)
    secondCastDiscount: 0,       // 1 (Orrery Lens)
    winTieFlips: false,          // Salt Widow's Comb
    oncePerFight: [],            // [{key, transform}] (Rites of Passage)
  };
  for (const id of sheet.items || []) {
    const it = getItem(id); // throws on unknown gear — bad data fails loudly
    for (const mk of it.mark || []) {
      const m = mk || {};
      if (m.damageBonusPct !== undefined) {
        // A band-scoped bonus (Mace/Pale Ash) vs a flat bonus (Ledger)
        if (m.vsHpBelow !== undefined) mods.vsHpBelow = { pct: m.damageBonusPct, hp: m.vsHpBelow };
        else if (m.vsHpAbove !== undefined) mods.vsHpAbove = { pct: m.damageBonusPct, hp: m.vsHpAbove };
        else mods.markDamagePct += m.damageBonusPct;
      }
      if (m.damagePerDebuffFlat) mods.markPerDebuffFlat += m.damagePerDebuffFlat;
      if (m.tiers) mods.critTiers = m.tiers;
      if (m.onHitHushChance) mods.onHitHushChance = Math.max(mods.onHitHushChance, m.onHitHushChance);
      if (m.firstHitBonusStacks) mods.firstHitBleed += m.firstHitBonusStacks;
      if (m.firstApplyBonusStacks) mods.bleedFirstApplyBonus += m.firstApplyBonusStacks;
      if (m.attackerTrueOnHit) mods.attackerTrueOnHit += m.attackerTrueOnHit;
      if (m.thornsReflectBonusPct) mods.thornsReflectBonusPct += m.thornsReflectBonusPct;
      if (m.bleedCap) mods.bleedCapOverride = Math.max(mods.bleedCapOverride, m.bleedCap);
      if (m.kind === 'burn') {
        if (m.potencyBonus) mods.burnPotencyBonus += m.potencyBonus;
        if (m.turnsBonus) mods.burnTurnsBonus += m.turnsBonus;
        if (m.selfTickDamage) mods.burnSelfTick += m.selfTickDamage;
      }
      if (m.curseMultOverride) mods.curseMultOverride = mods.curseMultOverride === 0
        ? m.curseMultOverride
        : Math.min(mods.curseMultOverride, m.curseMultOverride);
      if (m.hushModOverride) mods.hushModOverride = Math.max(mods.hushModOverride, m.hushModOverride);
      if (m.hushTurnsBonus) mods.hushTurnsBonus += m.hushTurnsBonus;
      if (m.resolveOnHushApply) mods.hushApplyResolve += m.resolveOnHushApply;
      if (m.hushCritReduction) mods.hushCritReduction = Math.max(mods.hushCritReduction, m.hushCritReduction);
      if (m.mitCap) mods.mitCapOverride = Math.max(mods.mitCapOverride, m.mitCap);
      if (m.immune) for (const k of m.immune) if (!mods.immune.includes(k)) mods.immune.push(k);
      if (m.immuneWhileBraced) for (const k of m.immuneWhileBraced) if (!mods.immuneWhileBraced.includes(k)) mods.immuneWhileBraced.push(k);
      if (m.braceTurnsBonus) mods.braceTurnsBonus += m.braceTurnsBonus;
      if (m.braceGrantsWard) mods.braceGrantsWard += m.braceGrantsWard;
      if (m.braceCostsZero) mods.braceCostsZero = true;
      if (m.wardDotAbsorb) mods.wardDotAbsorb += m.wardDotAbsorb;
      if (m.fatigueReduction) mods.fatigueReduction += m.fatigueReduction;
      if (m.turnStartHeal) mods.turnStartHeal += m.turnStartHeal;
      if (m.fightStart) {
        const fs = { ...(mods.fightStart || {}) };
        if (m.fightStart.ward) fs.ward = (fs.ward || 0) + m.fightStart.ward;
        if (m.fightStart.resolve) fs.resolve = (fs.resolve || 0) + m.fightStart.resolve;
        if (m.fightStart.brace) fs.brace = true;
        mods.fightStart = fs;
      }
      if (m.atRound && m.grant) mods.roundTriggers.push({ atRound: m.atRound, grant: m.grant });
      if (m.secondCastDiscount) mods.secondCastDiscount = Math.max(mods.secondCastDiscount, m.secondCastDiscount);
      if (m.winTieFlips) mods.winTieFlips = true;
      if (m.transform) mods.oncePerFight.push({ key: id, transform: m.transform });
    }
  }
  return mods;
}

/**
 * Merge vow mods + mark mods into the runtime mods object. Field-by-field
 * combination rules documented in the header; builds without gear produce
 * byte-identical mods to the pre-Phase-4 vowMods() output.
 */
export function mergeMods(vm, mm, tuning) {
  const out = { ...vm, ...mm };
  // bleed cap: deepest pool wins
  out.bleedCap = Math.max(vm.bleedCap ?? tuning.bleedCap, mm.bleedCapOverride || 0) || tuning.bleedCap;
  // burn shaping: sums
  out.burnPotency = (vm.burnPotency || 0) + (mm.burnPotencyBonus || 0);
  out.burnTurns = (vm.burnTurns || 0) + (mm.burnTurnsBonus || 0);
  // hush depth: deepest of vow/mark; the status also carries it (F-STATUS-1)
  out.hushMod = Math.max(vm.hushMod ?? tuning.hushMod, mm.hushModOverride || 0);
  out.hushApplyResolve = (vm.hushApplyResolve || 0) + (mm.hushApplyResolve || 0);
  // curse depth: deepest the fighter can apply (Last Hymn 0.6, Gravedust 0.65)
  const vowCurse = vm.curseMult ?? tuning.curseMult;
  out.curseMult = mm.curseMultOverride
    ? Math.min(vowCurse, mm.curseMultOverride)
    : vowCurse;
  return out;
}

/** Mark immunities — checked by every status application path. */
export function statusBlocked(f, key) {
  const m = f.mods || {};
  if ((m.immune || []).includes(key)) return true;
  if (key === 'hush' && f.statuses.brace && (m.immuneWhileBraced || []).includes('hush')) return true;
  // T4.8 — named-Echo weakness mechanics (e.g. Brother Ash "cannot be
  // debuffed"): control-family immunities as a REAL gap. The canon weakness
  // text pairs it with "DoT beats him", so bleed/burn stay off the list.
  const spec = f.sheet && f.sheet.special;
  if (spec && Array.isArray(spec.debuffImmune) && spec.debuffImmune.includes(key)) return true;
  return false;
}

/** Fight-start grants: Ward pools, Brace, Resolve. Called AFTER the §5.3
 *  start Resolve (so a mark +1 lands on top of 3/4, cap respected). */
export function applyFightStartMarks(f, tuning, log) {
  const fs = f.mods.fightStart;
  if (!fs) return;
  if (fs.ward) {
    f.statuses.ward = { pool: fs.ward, turns: tuning.statusTurns.ward };
    log && log('status', f.side, `${f.sheet.name} begins with ${fs.ward} Ward.`);
  }
  if (fs.brace) {
    f.statuses.brace = { turns: tuning.statusTurns.brace + (f.mods.braceTurnsBonus || 0) };
    log && log('status', f.side, `${f.sheet.name} begins Braced.`);
  }
  if (fs.resolve) {
    f.resolve = Math.min(tuning.resolveCap, f.resolve + fs.resolve);
    log && log('resolve', f.side, `${f.sheet.name} starts with +${fs.resolve} Resolve.`);
  }
}

/** Turn-start marks: round triggers, ember-shift expiry, flat heal. */
export function turnStartMarks(session, f) {
  const tuning = session.tuning;
  // once-per-fight round triggers (Bell of Nine Tolls: round 3)
  for (const trig of f.mods.roundTriggers || []) {
    const flag = `roundTrigger_${trig.atRound}_${JSON.stringify(trig.grant)}`;
    if (session.state.round === trig.atRound && !f.flags[flag]) {
      f.flags[flag] = true;
      if (trig.grant.resolve) {
        f.resolve = Math.min(tuning.resolveCap, f.resolve + trig.grant.resolve);
        session.logLine('resolve', f.side, `The ${f.sheet.name}'s bell remembers — +${trig.grant.resolve} Resolve.`);
      }
      if (trig.grant.brace) {
        f.statuses.brace = { turns: tuning.statusTurns.brace + (f.mods.braceTurnsBonus || 0) };
        session.logLine('status', f.side, `${f.sheet.name} braces at the ninth toll.`);
      }
    }
  }
  // ember shift expiry (Rites of Passage transform, 2 turns)
  if (f.flags.emberShift && f.flags.emberShift.turns > 0) {
    f.flags.emberShift.turns -= 1;
    if (f.flags.emberShift.turns <= 0) {
      f.flags.emberShift = null;
      session.logLine('rite', f.side, `${f.sheet.name}'s borrowed rite burns out.`);
    }
  }
  // flat turn-start heal (Drowned Mantle)
  if (f.mods.turnStartHeal > 0 && f.hp < f.maxHp) {
    const heal = Math.min(f.maxHp - f.hp, f.mods.turnStartHeal);
    f.hp += heal;
    f.totals.healed += heal;
    session.logLine('heal', f.side, `The Drowned Mantle keeps ${f.sheet.name}: +${heal}.`);
  }
}

/**
 * Resolve pricing: Vigil's Ring makes Brace verses free; Orrery Lens makes
 * the SECOND+ cast of each verse cost 1 less (min 0). Story-vow discounts
 * (Fixed Point / The Kept Name) join here in Phase 5.
 */
export function effectiveCost(f, verse, tuning) {
  let cost = verse.cost;
  const m = f.mods;
  if (m.braceCostsZero && (verse.effects || []).some((e) => e.op === 'brace')) return 0;
  if (m.secondCastDiscount && (f.casts[verse.id] || 0) >= 1) {
    cost = Math.max(0, cost - m.secondCastDiscount);
  }
  return cost;
}

/** Once-per-fight transformations (Rites of Passage). Activation trigger is
 *  T5.4 (doctrine/AI); the effect + expiry are live and deterministic. */
export function activateOncePerFight(f, key, tuning) {
  const entry = (f.mods.oncePerFight || []).find((x) => x.key === key);
  if (!entry) return { ok: false, error: `no once-per-fight mark "${key}"` };
  const flag = `opf_${key}`;
  if (f.flags[flag]) return { ok: false, error: 'already spent' };
  f.flags[flag] = true;
  const t = entry.transform;
  if (t.damageType) f.sheet.damageType = t.damageType; // sheet copy — safe
  if (t.damageBonusPct) f.flags.emberShift = { bonus: t.damageBonusPct, turns: t.turns };
  return { ok: true, transform: t };
}

/** Deeper of the fighter's curse depths — the value stored on the status at
 *  application (F-DATA-1: the depth travels with the curse, like Hush). */
export function applierCurseMult(f, tuning) {
  return (f.mods && f.mods.curseMult) || tuning.curseMult;
}
