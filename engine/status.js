/**
 * status.js — the ten statuses + Rite marker. [GDD] §5.5, §10.9 (rules 2–3),
 * §15.2 tick order, §11.4 chip spec.
 *
 * Fixed tick order at the holder's turn start:
 *   BURN → BLEED → THORN COUNTER → FATIGUE
 * DoT ticks: true damage, never crit, never jittered, never Fortune-scaled.
 *
 * Status application is deterministic — never random. Cleanse removes ALL
 * debuffs including stacks; there is no partial cleanse anywhere except the
 * explicit "remove 1 debuff" verses (which remove the OLDEST debuff).
 */

const TICK_ORDER = ['burn', 'bleed', 'thorns', 'fatigue'];

const DEBUFF_KEYS = ['bleed', 'burn', 'curse', 'fray', 'hush', 'stun'];
const BUFF_KEYS = ['brace', 'ward', 'thorns', 'rite'];

const CHIP_META = {
  bleed: { name: 'Bleed', color: 'crimson', glyph: 'drop' },
  burn: { name: 'Burn', color: 'ember', glyph: 'flame' },
  curse: { name: 'Curse', color: 'violet', glyph: 'chevron' },
  fray: { name: 'Fray', color: 'rust', glyph: 'stitch' },
  hush: { name: 'Hush', color: 'soot', glyph: 'hush' },
  brace: { name: 'Brace', color: 'verdigris', glyph: 'hand' },
  ward: { name: 'Ward', color: 'verdigris', glyph: 'hex' },
  thorns: { name: 'Thorns', color: 'rust', glyph: 'spike' },
  stun: { name: 'Stun', color: 'bone', glyph: 'brokenbell' },
  fatigue: { name: 'Fatigue', color: 'bone', glyph: 'hourglass' },
  rite: { name: 'Rite', color: 'tallow', glyph: 'ring' },
};

function initStatuses() {
  return {
    bleed: null,   // {stacks, srcMIG, turns}
    burn: null,    // {potency, srcWIT, turns}
    curse: null,   // {turns}
    fray: null,    // {turns}
    hush: null,    // {turns}
    brace: null,   // {turns}
    ward: null,    // {pool, turns}
    thorns: null,  // {value, turns}
    stun: null,    // {skipNext, turnsSince, lock}
    fatigue: null, // set by the schedule (T1.7)
    rite: null,    // phase marker, panel-visible
  };
}

/** Distinct debuff count — for Requiem / Seventh Verse / Echoing Grief. */
function distinctDebuffs(f) {
  return DEBUFF_KEYS.filter((k) => !!f.statuses[k]).length;
}

/** Is any debuff present (for cleanse UIs + AI)? */
function hasDebuff(f) {
  return DEBUFF_KEYS.some((k) => !!f.statuses[k]);
}

/**
 * Apply Bleed. Cap 5 (8 with Red Tide). New stacks add; duration refreshes
 * to 3; source MIG retained from the strongest application.
 */
function applyBleed(f, stacks, srcMIG, cap) {
  const max = cap ?? 5;
  const s = f.statuses.bleed;
  if (!s) {
    f.statuses.bleed = { stacks: Math.min(max, stacks), srcMIG, turns: 3 };
  } else {
    s.stacks = Math.min(max, s.stacks + stacks); // refuses beyond cap (edge case)
    s.srcMIG = Math.max(s.srcMIG, srcMIG);
    s.turns = 3; // refreshed by new stacks
  }
  return f.statuses.bleed;
}

/**
 * Apply Burn. Reapplying keeps the HIGHER potency and refreshes duration.
 * potency = base + 0.25 × source WIT (+ vow Slow Ash +1, + Sear bonus).
 */
function applyBurn(f, potency, srcWIT, turns) {
  const b = f.statuses.burn;
  if (!b) {
    f.statuses.burn = { potency, srcWIT, turns };
  } else {
    b.potency = Math.max(b.potency, potency);
    b.srcWIT = Math.max(b.srcWIT, srcWIT);
    b.turns = turns;
  }
  return f.statuses.burn;
}

function applyTimed(f, key, turns) {
  f.statuses[key] = { turns };
}

/**
 * Apply Ward — never stacks. Reapplication takes the higher pool and
 * refreshes duration; it never adds pools.
 */
function applyWard(f, pool, turns) {
  const w = f.statuses.ward;
  if (!w) {
    f.statuses.ward = { pool, turns };
  } else {
    w.pool = Math.max(w.pool, pool);
    w.turns = turns;
  }
  return f.statuses.ward;
}

function applyThorns(f, value, turns) {
  const t = f.statuses.thorns;
  if (!t) {
    f.statuses.thorns = { value, turns };
  } else {
    t.value = Math.max(t.value, value); // never stacks; strongest stands
    t.turns = turns;
  }
  return f.statuses.thorns;
}

/**
 * Apply Stun. Re-stun guard: cannot stun a target that has not taken two
 * turns since its last stun resolved. Returns false if blocked.
 */
function applyStun(f) {
  if (f.statuses.stun) {
    if (f.statuses.stun.skipNext) return false; // already stunned pending
    if (f.statuses.stun.turnsSince < 2) return false; // re-stun lock (§10.10)
  }
  f.statuses.stun = { skipNext: true, turnsSince: 0, lock: 2 };
  return true;
}

/**
 * Cleanse — removes ALL debuffs including stacks (§5.5 cleanse rule).
 * `Purify` and `Dissonance` both land here; no partial cleanse exists
 * except the explicit remove-1 verses.
 */
function cleanseAll(f) {
  const removed = [];
  for (const k of DEBUFF_KEYS) {
    if (f.statuses[k]) { removed.push(k); f.statuses[k] = null; }
  }
  return removed;
}

/** The explicit "remove 1 debuff" verses: removes the OLDEST debuff. */
function cleanseOne(f) {
  for (const k of DEBUFF_KEYS) {
    if (f.statuses[k]) { f.statuses[k] = null; return k; }
  }
  return null;
}

/** Consume N debuffs (Seventh Verse): strongest-impact first for legibility. */
function consumeDebuffs(f, n) {
  const removed = [];
  for (const k of DEBUFF_KEYS) {
    if (removed.length >= n) break;
    if (f.statuses[k]) { removed.push(k); f.statuses[k] = null; }
  }
  return removed;
}

/**
 * One holder turn-start tick pass, in the FIXED order. Calls `onTrue(amount,
 * key)` for each true-damage event so the caller owns death checks and logs.
 * Returns list of events for the log gutter.
 */
function tickAtTurnStart(f, tuning, mods, onTrue, onEvent) {
  const events = [];

  // 1. BURN — true, base + 0.25 × srcWIT (kept at application time)
  const burn = f.statuses.burn;
  if (burn && burn.turns > 0) {
    const pot = burn.potency;
    events.push({ kind: 'dot', status: 'burn', amount: pot });
    onTrue(pot, 'burn');
    if (mods.burnTickResolve) onEvent({ kind: 'resolve', amount: mods.burnTickResolve, why: 'Kindling' });
    burn.turns -= 1;
    if (burn.turns <= 0) f.statuses.burn = null;
  }

  // 2. BLEED — true, stacks × (2 + 0.18 × srcMIG) + vow tick bonus
  const bleed = f.statuses.bleed;
  if (bleed && bleed.turns > 0) {
    const amount = bleed.stacks * (tuning.bleedTickBase + tuning.bleedCoefMig * bleed.srcMIG + mods.bleedTickBonus);
    events.push({ kind: 'dot', status: 'bleed', amount, stacks: bleed.stacks });
    onTrue(amount, 'bleed');
    bleed.turns -= 1;
    if (bleed.turns <= 0) f.statuses.bleed = null;
  }

  // 3. THORN COUNTER — thorns damage lands on direct hits (in damage.js);
  //    here we only decrement its counter.
  const thorns = f.statuses.thorns;
  if (thorns) {
    thorns.turns -= 1;
    if (thorns.turns <= 0) f.statuses.thorns = null;
  }

  // 4. FATIGUE — the D8 schedule injects the damage; symmetric, not jittered.
  if (f.statuses.fatigue && f.statuses.fatigue.amount > 0) {
    events.push({ kind: 'dot', status: 'fatigue', amount: f.statuses.fatigue.amount });
    onTrue(f.statuses.fatigue.amount, 'fatigue');
  }

  // Duration decrements for the non-DoT statuses (holder's own clock).
  const dec = ['curse', 'fray', 'hush', 'brace', 'ward'];
  for (const k of dec) {
    const s = f.statuses[k];
    if (s) {
      s.turns -= 1;
      if (s.turns <= 0) f.statuses[k] = null;
    }
  }

  // Stun bookkeeping: if a pending skip was consumed this turn (caller skips
  // BEFORE the action), count the turns actually taken toward the re-stun lock.
  const stun = f.statuses.stun;
  if (stun && !stun.skipNext) {
    stun.turnsSince += 1;
    if (stun.turnsSince >= tuning.stunLockTurns + 1) f.statuses.stun = null;
  }

  return events;
}

/** Chip data for the UI: icon key, name, turns left, the one number that matters. */
function chips(f) {
  const out = [];
  const s = f.statuses;
  if (s.bleed) out.push({ key: 'bleed', turns: s.bleed.turns, num: s.bleed.stacks, label: `${s.bleed.stacks} stacks` });
  if (s.burn) out.push({ key: 'burn', turns: s.burn.turns, num: s.burn.potency, label: `${s.burn.potency} per turn` });
  if (s.curse) out.push({ key: 'curse', turns: s.curse.turns, num: null, label: '−25% dmg' });
  if (s.fray) out.push({ key: 'fray', turns: s.fray.turns, num: null, label: 'Guard ×0.6' });
  if (s.hush) out.push({ key: 'hush', turns: s.hush.turns, num: null, label: 'gain −2' });
  if (s.brace) out.push({ key: 'brace', turns: s.brace.turns, num: null, label: '+40% mit' });
  if (s.ward) out.push({ key: 'ward', turns: s.ward.turns, num: s.ward.pool, label: `${s.ward.pool} absorb` });
  if (s.thorns) out.push({ key: 'thorns', turns: s.thorns.turns, num: s.thorns.value, label: `${s.thorns.value} thorns` });
  if (s.stun) out.push({ key: 'stun', turns: s.stun.skipNext ? 1 : tuningTurns(s), num: null, label: s.stun.skipNext ? 'skips next' : `locked ${s.stun.turnsSince}/2` });
  if (s.fatigue) out.push({ key: 'fatigue', turns: 0, num: s.fatigue.amount, label: `${s.fatigue.amount} true` });
  if (s.rite) out.push({ key: 'rite', turns: null, num: null, label: s.rite.name || 'Rite' });
  return out;
}

function tuningTurns(stun) {
  return Math.max(0, 2 - stun.turnsSince);
}


module.exports = { initStatuses, distinctDebuffs, hasDebuff, applyBleed, applyBurn, applyTimed, applyWard, applyThorns, applyStun, cleanseAll, cleanseOne, consumeDebuffs, tickAtTurnStart, chips, TICK_ORDER, DEBUFF_KEYS, BUFF_KEYS, CHIP_META };
