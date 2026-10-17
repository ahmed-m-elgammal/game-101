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
  const cap = target.sheet.items.includes(tuning.items.ashGlazedBrassId)
    ? tuning.mitCapAshGlazed
    : tuning.mitCap;
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
  raw *= 1 + (mods.damageBonus || 0); // marks/vows flat hook (Phase 3)

  // curse — attacker cursed deals less (Last Hymn deepens it)
  if (actor.statuses.curse) raw *= mods.curseMult || tuning.curseMult;

  // Rite damage flag (First Vespers +30%)
  if (actor.riteState && actor.riteState.flags.damageBonusPct) {
    raw *= 1 + actor.riteState.flags.damageBonusPct;
  }

  // 4. per-hit jitter — the only per-hit randomness
  const jitter = m.clamped(tuning.jitterCenter, tuning.jitterWidth);

  // 5. shared fight fortune — drift, then apply (both fighters share it)
  const drift = m.clamped(0.0, tuning.fortuneDrift);
  state.fortune = Math.min(tuning.fortuneMax, Math.max(tuning.fortuneMin, state.fortune + drift));
  state.fortuneTrack.push(state.fortune);

  raw *= jitter * state.fortune;

  // 6. crit — not affected by fortune
  const critChance = tuning.critBase + tuning.critPerHst * stats.hst
    + (mods.critBonus || 0) + (spec.critBonus || 0);
  const crit = m.band(100) < critChance * 100;
  if (crit) raw *= mods.critMult || tuning.critMult;

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

    // Thorns: attackers who land a DIRECT hit take X true damage (§5.5)
    const th = target.statuses.thorns;
    if (th) {
      thornsDealt = Math.round(th.value);
      actor.hp = Math.max(0, actor.hp - thornsDealt);
    }
  }

  return {
    dealt: preWard,      // post-mitigation, pre-ward (audit)
    land,                // what actually reached HP
    raw, jitter, crit, mit, warded, thornsDealt,
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
