/**
 * fighter.js — build → fighter sheet. [GDD] §5.1, §5.2, §8, §9; [01] R3; D2, D7.
 * "Full build, not a stat blob": every derived value the math needs, computed
 * once, float-internal, no rounding here (the only rounding in the game is the
 * damage pipeline's final line).
 *
 * Build shape (JSON-serialisable — the seed derivation hashes it):
 * {
 *   name, clazz, level,
 *   creation: {vig,mig,wit,grd,hst},   // must total 4
 *   levelUps: {vig,mig,wit,grd,hst},   // must total 2 × (level − 1)
 *   vow: id | null,
 *   verses: [id × ≤4],                  // ordered; Strike always available
 *   items: [id],                        // flags: ash_glazed_brass, candle_of_saint_orrin
 *   isEnemy: bool, hpOverride: number|null, rite: riteId|null
 * }
 */
import { CLASSES, STAT_KEYS } from '../data/classes.js';

/** budget(L) = 33 + 2(L−1). D7/N5: 27 base + 4 creation + 2 practice + 2×(L−1). */
export function budgetFor(level, tuning) {
  return tuning.budgetBase + tuning.budgetPerLevel * (level - 1);
}

/**
 * Validate the discretionary allocation: creation totals 4, levelUps total
 * 2×(L−1), no stat above the cap of 10 (class base + alloc).
 * @returns {{ok: boolean, errors: string[], total: number}}
 */
export function validateAlloc(build, tuning) {
  const errors = [];
  const base = CLASSES[build.clazz].stats;
  const creationSum = STAT_KEYS.reduce((s, k) => s + (build.creation?.[k] || 0), 0);
  const levelSum = STAT_KEYS.reduce((s, k) => s + (build.levelUps?.[k] || 0), 0);
  if (creationSum !== tuning.creationPoints) errors.push(`creation must total ${tuning.creationPoints} (got ${creationSum})`);
  const expect = tuning.pointsPerLevel * (build.level - 1);
  if (levelSum !== expect) errors.push(`level-ups must total ${expect} (got ${levelSum})`);
  for (const k of STAT_KEYS) {
    const total = base[k] + (build.creation?.[k] || 0) + (build.levelUps?.[k] || 0);
    if (total > tuning.statCap) errors.push(`${k} above cap ${tuning.statCap} (${total})`);
    if (total < base[k]) errors.push(`${k} below class base`);
  }
  return { ok: errors.length === 0, errors, total: creationSum + levelSum };
}

/**
 * Enemy conformance: stat sum must equal budget(L) exactly (±0).
 * @returns {{ok, sum, budget, edge}}
 */
export function checkBudget(stats, level, tuning) {
  const sum = STAT_KEYS.reduce((s, k) => s + (stats[k] || 0), 0);
  const budget = budgetFor(level, tuning);
  return { ok: sum === budget, sum, budget, edge: sum - budget };
}

/** Class base + creation + level-ups, capped per stat. */
export function finalStats(build, tuning) {
  const base = CLASSES[build.clazz].stats;
  const out = {};
  for (const k of STAT_KEYS) {
    out[k] = Math.min(
      tuning.statCap,
      base[k] + (build.creation?.[k] || 0) + (build.levelUps?.[k] || 0)
    );
  }
  return out;
}

/**
 * D2 soft level-sync: +1 stat / +4% HP per level over the band, cap 3.
 * Applied on a COPY; synced sheets differ only in the D2-defined ways.
 * @param {object} sheet - an assembled sheet
 * @param {number} bandLevel - the chapter's band level
 */
export function syncedSheet(sheet, bandLevel, tuning) {
  const over = Math.max(0, Math.min(tuning.levelSync.capLevels, sheet.level - bandLevel));
  if (over === 0) return sheet;
  const out = { ...sheet, stats: { ...sheet.stats } };
  // spend over-level points in canonical order: vig → mig → wit → grd → hst
  let left = over;
  const order = ['vig', 'mig', 'wit', 'grd', 'hst'];
  for (const k of order) {
    if (left === 0) break;
    if (out.stats[k] < tuning.statCap) { out.stats[k] += 1; left -= 1; }
  }
  out.maxHp = Math.round(sheet.maxHp * (1 + tuning.levelSync.hpPctPerLevel * over));
  out.syncedOver = over;
  return out;
}

/** Vow modifier bundle — read by damage/resolve/status engines. [GDD] §7.1 */
export function vowMods(sheet, tuning) {
  const v = tuning.vows;
  const mods = {
    bleedCap: tuning.bleedCap,
    bleedTickBonus: 0,
    critBonus: 0,
    critMult: tuning.critMult,
    lifestealPct: 0,
    burnTurns: 0,
    burnPotency: 0,
    emberVsBurning: 0,
    burnTickResolve: 0,
    mitBonus: 0,
    braceBonus: tuning.braceBonus,
    thornsBonus: 0,
    turnStartHealPct: 0,
    curseMult: tuning.curseMult,
    curseTurns: 0,
    shadePerDebuff: 0,
    hushMod: tuning.hushMod,
    hushApplyResolve: 0,
  };
  switch (sheet.vow) {
    case 'red_tide': mods.bleedCap = tuning.bleedCapRedTide; mods.bleedTickBonus = v.redTideTickBonus; break;
    case 'duelist': mods.critBonus = v.duelistCritBonus; mods.critMult = tuning.critMultDuelist; break;
    case 'hunger': mods.lifestealPct = v.hungerPct; break;
    case 'slow_ash': mods.burnTurns = v.slowAshTurns; mods.burnPotency = v.slowAshPotency; break;
    case 'pyre': mods.emberVsBurning = v.pyreBonus; break;
    case 'kindling': mods.burnTickResolve = v.kindlingResolve; break;
    case 'bastion': mods.mitBonus = v.bastionMit; mods.braceBonus = tuning.braceBonusBastion; break;
    case 'thorn_bearer': mods.thornsBonus = v.thornBearerBonus; break;
    case 'long_dark': mods.turnStartHealPct = v.longDarkPct; break;
    case 'last_hymn': mods.curseMult = tuning.curseMultLastHymn; mods.curseTurns = v.lastHymnTurns; break;
    case 'echoing_grief': mods.shadePerDebuff = v.echoingGriefPct; break;
    case 'silence': mods.hushMod = tuning.hushModSilence; mods.hushApplyResolve = v.silenceApplyResolve; break;
    default: break;
  }
  return mods;
}

/**
 * Assemble the full sheet for a build.
 * @returns {object} sheet — everything the engine needs; JSON round-trips.
 */
export function buildSheet(build, tuning) {
  const cls = CLASSES[build.clazz];
  const alloc = validateAlloc(build, tuning);
  if (!alloc.ok && !build.isEnemy) {
    throw new Error('Invalid allocation: ' + alloc.errors.join('; '));
  }
  const stats = build.isEnemy && build.stats
    ? { ...build.stats } // enemy rows carry hand-tuned sheets (§9)
    : finalStats(build, tuning);

  if (build.isEnemy) {
    // Declared A6 hybrids (Mother Bell) carry the +2 override like their HP
    // override — the same exemption the frozen `enemy` schema grants `hybrid`.
    if (!build.budgetOverride) {
      const conf = checkBudget(stats, build.level, tuning);
      if (!conf.ok) throw new Error(`Enemy over budget: ${conf.sum} vs ${conf.budget} (budget ${build.level})`);
    }
  }

  const maxHp = build.hpOverride != null
    ? build.hpOverride
    : tuning.hpBase + tuning.hpPerVig * stats.vig;

  return {
    name: build.name || cls.name,
    clazz: build.clazz,
    className: cls.name,
    level: build.level,
    stats,
    maxHp,
    damageType: cls.damageType,
    mainStat: cls.mainStat,
    vow: build.vow || null,
    vowName: build.vow ? (cls.vows.find((x) => x.id === build.vow)?.name || build.vow) : null,
    // T4.5 art hook: enemy portraits resolve by id (assets/art/enemies/<art>);
    // player panels fall back to the class portrait. Absent art degrades to
    // the CSS plate — UI-only, never read by the math.
    art: build.art || null,
    // T4.6: enemies may carry the full phase pool (Mother Bell's 8-verse
    // temperature pool); the 4-slot rule is a PLAYER loadout rule (§6).
    verses: build.isEnemy ? (build.verses || []).slice() : (build.verses || []).slice(0, 4),
    items: build.items || [],
    isEnemy: !!build.isEnemy,
    rite: build.rite || null,
    // T5.1: the Echo's doctrine rides the sheet (§12.1 — a frozen copy of a
    // build includes the doctrine). Inert to the fight math until T5.5
    // layers the doctrine behaviors over the T5.4 shared AI rules.
    doctrine: build.doctrine || null,
    // T4.6 special-mechanics block (verbatim from the data row; the engine
    // reads it, never writes it). Sequence rides separately.
    special: build.special ? structuredClone(build.special) : null,
    sequence: build.sequence ? structuredClone(build.sequence) : null,
    // T3.6 scripted opener (minimal engine hook, ENG-9; the full doctrine
    // scripting is T5.4/T5.7 and supersedes this): a deterministic queue of
    // verse ids the AI casts before falling back to the scorer. Enemies only.
    script: Array.isArray(build.script) ? build.script.map(String) : null,
    alloc: { creation: { ...build.creation }, levelUps: { ...build.levelUps }, total: alloc.total },
  };
}

/** Derived read-outs for UI + Reading: crit, mitigation rates per type. */
export function derive(sheet, tuning) {
  const critChance = tuning.critBase + tuning.critPerHst * sheet.stats.hst;
  return {
    critChance,
    mitSteel: Math.min(tuning.mitCap, tuning.mitSteelPerGrd * sheet.stats.grd),
    mitMagic: Math.min(tuning.mitCap, tuning.mitMagicPerGrd * sheet.stats.grd),
    hp: sheet.maxHp,
  };
}

/** The one-line build string used by the Reading. [GDD] §5.8 */
export function buildLine(sheet, verseNames) {
  const vs = ['Strike', ...(sheet.verses || []).map((id) => verseNames[id] || id)];
  return `${sheet.className} · ${sheet.vowName || 'no vow'} · ${vs.join(' / ')}`;
}
