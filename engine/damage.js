/**
 * damage.js — the pipeline and the rounding contract. [GDD] §5.4, §10.5,
 * §10.9 (rules 1–5), §15.1.
 *
 * THE ROUNDING CONTRACT: all internal math is float. Exactly one rounding
 * happens, at the final line (Math.round). No intermediate term is rounded,
 * and no term is applied in a different order depending on which code path
 * ran. Mitigation is summed into ONE value before it is applied. Verse data
 * objects are NEVER mutated (they are module constants shared across fights).
 *
 * Per-instance Measure consumption order (fixed, §15.1 + §10.6):
 *   1. jitter  Clamped(1.00, 0.10)   float
 *   2. fortune Clamped(0.00, 0.02)   float (shared fight scalar, clamped band)
 *   3. crit    Band(100)             int   (Fortune-exempt)
 * Multi-hit verses repeat the order per hit (Red Flurry: three of each).
 *
 * True damage (Bleed/Burn/Thorns/Fatigue ticks) never enters this function:
 * status.js emits ticks directly. Direct verses flagged ignoreMit keep
 * jitter/Fortune/crit/Ward and skip only the mitigation term.
 */

const { temperatureDefenseMult } = require('./rites.js');

/**
 * Mitigation summation — every source into ONE value, then the cap.
 * Fray multiplies Guard BEFORE the rate (×0.6); Brace adds +40% (Bastion
 * 60%); the relic Ash-Glazed Brass raises the cap to 0.70.
 */
function mitigationSum(target, dmgType, tuning) {
  const mods = target.mods || {};
  const fray = target.statuses.fray ? tuning.frayGuardMult : 1;
  const grd = target.sheet.stats.grd * fray;
  const perGrd = dmgType === 'steel' ? tuning.mitSteelPerGrd : tuning.mitMagicPerGrd;
  let mit = perGrd * grd;
  if (target.statuses.brace) mit += mods.braceBonus ?? tuning.braceBonus;
  if (mods.mitBonus) mit += mods.mitBonus; // vow Bastion +10%
  // Ash-Glazed Brass raises the cap to 0.70 (§8.3; the mark layer feeds the
  // same value through mitCapOverride — max of both keeps old builds exact).
  const brassCap = target.sheet.items.includes(tuning.items.ashGlazedBrassId)
    ? tuning.mitCapAshGlazed
    : tuning.mitCap;
  const cap = Math.max(brassCap, mods.mitCapOverride || 0);
  return Math.min(cap, Math.max(0, mit));
}

/** Distinct debuff count — Requiem / Seventh Verse / Echoing Grief. */
function distinctDebuffs(f) {
  let n = 0;
  for (const k of ['bleed', 'burn', 'curse', 'fray', 'hush', 'stun']) if (f.statuses[k]) n += 1;
  return n;
}

/**
 * The one damage function. `m` = Measure facade bound to the fight stream.
 * `state.fortune` is the shared fight scalar (mutated here by drift).
 * Returns a full audit record — no hidden modifiers (§10.9 rule 8): every
 * multiplier that touched the number is in the record.
 */
function resolveDamage(state, actor, target, spec, m, tuning) {
  const mods = actor.mods;
  const stats = actor.sheet.stats;

  // 1. base + Σ(coefficient × stat) — float
  let raw = spec.base;
  for (const c of spec.coefs || []) {
    const statKey = c.stat === 'main' ? actor.sheet.mainStat : c.stat;
    raw += c.c * stats[statKey];
  }

  // per-stack verses (Reap the Red / Blood Ledger): (base + Σcoef) × stacks
  if (spec.perBleedStack) {
    const stacks = spec._bleedStacks ?? 0;
    raw *= stacks;
  }

  // conditional multipliers — FIXED order, all float
  if (spec.bonusIfTargetBurning && target.statuses.burn) raw *= 1 + spec.bonusIfTargetBurning;
  if (spec.perDebuffPct) raw *= 1 + spec.perDebuffPct * distinctDebuffs(target);
  if (spec.perDebuffFlat) {
    const deb = Math.min(spec.perDebuffFlatMax ?? 4, distinctDebuffs(target));
    raw += spec.perDebuffFlat * deb;
  }
  if (mods.emberVsBurning && spec.type === 'ember' && target.statuses.burn) raw *= 1 + mods.emberVsBurning;
  if (mods.shadePerDebuff && spec.type === 'shade') raw *= 1 + mods.shadePerDebuff * distinctDebuffs(target);
  raw *= 1 + (mods.damageBonus || 0); // vows flat hook (Phase 3)

  // T4.5 marks — fixed order, all float, all zero when no gear is present
  raw *= 1 + (mods.markDamagePct || 0);                    // Tithe-Collector's Ledger +10%
  const hpFrac = target.maxHp > 0 ? target.hp / target.maxHp : 0;
  if (mods.vsHpBelow && hpFrac < mods.vsHpBelow.hp) raw *= 1 + mods.vsHpBelow.pct;   // Pallbearer's Mace
  if (mods.vsHpAbove && hpFrac > mods.vsHpAbove.hp) raw *= 1 + mods.vsHpAbove.pct;   // Pale Ash Blade
  if (mods.markPerDebuffFlat) raw += mods.markPerDebuffFlat * distinctDebuffs(target); // Choir-Scale Blade
  if (actor.flags.emberShift) raw *= 1 + actor.flags.emberShift.bonus;               // Rites of Passage

  // curse — the depth travels with the STATUS (F-DATA-1: the APPLIER's vow
  // or mark depth, stored at application — the same transport F-STATUS-1
  // mandated for Hush). A bare {turns} shape (older saves/tests) falls back
  // to the canon default ×0.75.
  if (actor.statuses.curse) raw *= actor.statuses.curse.mod?.curseMult ?? tuning.curseMult;

  // Rite damage flag (First Vespers +30%)
  if (actor.riteState && actor.riteState.flags.damageBonusPct) {
    raw *= 1 + actor.riteState.flags.damageBonusPct;
  }

  // T4.6 — the fold (Widow Sedge): below the fold line her damage halves.
  if (actor.sheet.special?.foldBelowHP
    && actor.maxHp > 0 && actor.hp / actor.maxHp < actor.sheet.special.foldBelowHP) {
    raw *= 0.5;
  }

  // T4.6 — Mother Bell's temperature (§9.2 #14 + D10): the DEFENDER's molten
  // band takes 50% less DIRECT damage; the cooled band takes +30%; the Cantor
  // sour window (Curse+Fray held) forces the cooled number. Audit-visible.
  const temp = temperatureDefenseMult(target);
  if (temp.mult !== 1) raw *= temp.mult;

  // 4. per-hit jitter — the only per-hit randomness
  const jitter = m.clamped(tuning.jitterCenter, tuning.jitterWidth);

  // 5. shared fight fortune — drift, then apply (both fighters share it)
  const drift = m.clamped(0.0, tuning.fortuneDrift);
  state.fortune = Math.min(tuning.fortuneMax, Math.max(tuning.fortuneMin, state.fortune + drift));
  state.fortuneTrack.push(state.fortune);

  raw *= jitter * state.fortune;

  // 6. crit — not affected by fortune. The threshold is rounded to the whole
  // percent the Measure table speaks in (re-test fix F-DAMAGE-1). The
  // Choir-Seal's hush rider cuts the HUSHED attacker's crit chance (T4.5).
  let critChance = tuning.critBase + tuning.critPerHst * stats.hst
    + (mods.critBonus || 0) + (spec.critBonus || 0)
    - (actor.statuses.hush?.critCut || 0);
  // T4.6 — Mother Corvane's telegraphed crits (§9.4): her crits only land
  // the turn AFTER she raises the blade; otherwise never.
  if (actor.sheet.special?.telegraphCrits) {
    critChance = actor.flags.critNext ? 1 : 0;
  }
  const crit = m.band(100) < Math.round(critChance * 100);
  // Corvane's Blade tiers (F28/D31): the TARGET's HP band picks the mult.
  let critMult = mods.critMult || tuning.critMult;
  if (mods.critTiers) {
    const frac = target.maxHp > 0 ? target.hp / target.maxHp : 1;
    const tier = mods.critTiers.find((t) => frac > t.hpAbove) || mods.critTiers[mods.critTiers.length - 1];
    critMult = tier.mult;
  }
  if (crit) raw *= critMult;

  // 7. mitigation — SUMMED, never applied in pieces
  let mit = 0;
  if (!spec.ignoreMit) {
    mit = mitigationSum(target, spec.type, tuning);
    if (spec.mitigationFactor) mit *= spec.mitigationFactor; // Sear the Note
  }
  const preWard = Math.round(raw * (1 - mit)); // ← the ONLY rounding in the game

  // 8. ward absorbs first, then HP; min 1 on landed direct hits
  let warded = 0;
  let land = preWard;
  const w = target.statuses.ward;
  if (w && w.pool > 0 && preWard > 0) {
    const absorbed = Math.min(w.pool, preWard);
    warded = absorbed;
    w.pool -= absorbed;
    land -= absorbed;
    if (w.pool <= 0) target.statuses.ward = null; // broken
  }

  const hpBefore = target.hp;
  let candle = false;
  let killed = false;
  let thornsDealt = 0;
  let markThorns = 0;

  if (land > 0) {
    let remaining = land;
    if (hpBefore - remaining <= 0
      && target.sheet.items.includes(tuning.items.candleId)
      && !target.flags.candleUsed) {
      // Candle of Saint Orrin: deterministic once-per-fight survival at 1 HP
      // on the FIRST lethal hit (§10.9 rule 5). Not random. Ever.
      target.flags.candleUsed = true;
      candle = true;
      remaining = hpBefore - 1;
    }
    target.hp = Math.max(0, hpBefore - remaining);
    killed = target.hp <= 0;

    // Thorns: attackers who land a DIRECT hit take X true damage (§5.5).
    // Founder's Chisel reflects +50% of the triggering damage on top (T4.5).
    // D10 Warden lever: while the molten Bell's own rite doubles reflect
    // income, Thorns and Spikes deal ×2 TO the Bell (the reflect recipient
    // carries the flag).
    const th = target.statuses.thorns;
    if (th) {
      let thVal = th.value + (target.mods.thornsReflectBonusPct ? target.mods.thornsReflectBonusPct * land : 0);
      if (actor.riteState && actor.riteState.flags.reflectDouble) thVal *= 2;
      thornsDealt = Math.round(thVal);
      actor.hp = Math.max(0, actor.hp - thornsDealt);
    }
    // Bellmetal Gauntlets: a flat 3 true on every landed hit, thorns or not.
    if (target.mods.attackerTrueOnHit) {
      markThorns = target.mods.attackerTrueOnHit;
      actor.hp = Math.max(0, actor.hp - markThorns);
    }
  }

  return {
    dealt: preWard,      // post-mitigation, pre-ward (audit)
    land,                // what actually reached HP
    raw, jitter, crit, mit, warded, thornsDealt, markThorns,
    tempMult: temp.mult, tempSoured: temp.soured, // temperature audit (D10)
    hpBefore, hpAfter: target.hp,
    candle, killed,
    fortune: state.fortune,
  };
}

/** True-damage path — DoT ticks only; one shared helper, integer by spec. */
function trueTick(amount) {
  return Math.max(0, Math.round(amount));
}


module.exports = { mitigationSum, distinctDebuffs, resolveDamage, trueTick };
