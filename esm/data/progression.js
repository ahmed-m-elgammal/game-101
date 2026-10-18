/**
 * progression.js — T4.10: the XP economy as data. [01] R1 (approved);
 * [GDD] §13; D1 (L9/L10); N2 (one term: the Choir Floor); A3 (boss-role
 * slots). The system F3 found missing: thresholds existed, sources didn't.
 *
 * Per-fight: XP(fight) = round((10 + 4×enemy_level) × role)
 *   roles — regular ×1.00 (first fight of any chapter; all fights of
 *           2-fight chapters except the second)
 *           complication ×1.25 (middle fight of 3-fight chapters)
 *           boss ×1.75 (second fight of 2-fight chapters; act bosses)
 *   chapter completion +10 flat; choices pay 0 (tallies are never purchasable).
 *
 * Floor XP (per-opponent decay, no time gates): 8 + 2×level(O) on the first
 * win vs O this run; repeats 50% (min 4); 25% if level(O) ≤ your level − 2.
 * First Echo bound +15; first imported code fought +10. A fight pays exactly
 * once per run.
 *
 * FINDING N11 (recorded, docs/DECISIONS.md): [01] R1's walk table carries
 * three per-fight arithmetic slips against its own formula — the Reaper row
 * (printed 40; formula 53) and the two 66.5 roundings (Ysolde/Corvane
 * printed 66; Math.round → 67). The FORMULA is the R1 rule text and is what
 * this module implements; the walk() below asserts the DESIGN PROMISE (the
 * thing the acceptance criterion actually pins): every chapter's arrival
 * level matches the walk's level column, and D1 holds — L9 by the Bellmouth,
 * L10 crossed on Ilvane's corpse. Cumulative XP under the formula reading is
 * 1157 vs the table's 1142 (+15, −0 levels at every arrival). Nothing bent
 * to match the slips; the owner owns the erratum.
 */

/** Canon thresholds (§13): level cap 10. */
export const XP_THRESHOLDS = [0, 40, 100, 180, 280, 400, 540, 700, 880, 1080];

export const XP_ROLES = {
  regular: { mult: 1.0 },
  complication: { mult: 1.25 },
  boss: { mult: 1.75 },
};

export const CHAPTER_COMPLETION_XP = 10;
export const LEVEL_CAP = 10;

/**
 * The role map for all 21 fights (A3: second slot of 2-fight chapters =
 * boss; middle of 3-fight = complication; act bosses are Duels 7/14/21).
 * 21/21 rows — the T4.10 completeness assert pins the count.
 */
export const FIGHT_ROLES = {
  bram: 'regular',            // Ch1 duel 1 (2-fight chapter, first)
  sedge: 'boss',              // Ch1 duel 2 (2-fight chapter, second)
  brack: 'regular',           // Ch2 duel 3
  reaper_silt: 'boss',        // Ch2 duel 4
  drowned_choristers: 'regular', // Ch3 duel 5 (3-fight chapter, first)
  pell: 'complication',       // Ch3 duel 6 (middle)
  first_vespers: 'boss',      // Ch3 duel 7 (act boss)
  sable: 'regular',           // Ch4 duel 8
  ysolde: 'boss',             // Ch4 duel 9
  wick_lad: 'regular',        // Ch5 duel 10
  corvane: 'boss',            // Ch5 duel 11
  grast: 'regular',           // Ch6 duel 12
  halbrey: 'complication',    // Ch6 duel 13 (middle)
  mother_bell: 'boss',        // Ch6 duel 14 (act boss)
  yune: 'regular',            // Ch7 duel 15
  first_movement: 'boss',     // Ch7 duel 16
  tide_bound: 'regular',      // Ch8 duel 17
  oren: 'boss',               // Ch8 duel 18
  unbound_chorus: 'regular',  // Ch9 duel 19
  ilvanes_second: 'complication', // Ch9 duel 20 (middle)
  ilvane: 'boss',             // Ch9 duel 21 (final boss)
};

/** The chapter shape the walk consumes (duel ids in play order). */
export const CHAPTER_FIGHTS = [
  ['bram', 'sedge'],
  ['brack', 'reaper_silt'],
  ['drowned_choristers', 'pell', 'first_vespers'],
  ['sable', 'ysolde'],
  ['wick_lad', 'corvane'],
  ['grast', 'halbrey', 'mother_bell'],
  ['yune', 'first_movement'],
  ['tide_bound', 'oren'],
  ['unbound_chorus', 'ilvanes_second', 'ilvane'],
];

/** Per-fight XP. `role` ∈ regular | complication | boss. */
export function xpForFight(enemyLevel, role) {
  const r = XP_ROLES[role];
  if (!r) throw new Error(`unknown fight role: ${role}`);
  return Math.round((10 + 4 * enemyLevel) * r.mult);
}

/** Chapter completion: +10 flat, paid once when the chapter's prose closes. */
export function chapterCompletionXp() {
  return CHAPTER_COMPLETION_XP;
}

/** Stat points: 4 at creation, +2 per level (§13). */
export function statPointsForLevel(level) {
  // T4.1 loud-failure contract: NaN slips both < and > comparisons, so a
  // bare range check would silently grant `NaN` points — corruption, not
  // data. Non-integer levels are equally out of contract (§13 grants land
  // on level-up events only).
  if (!Number.isInteger(level) || level < 1 || level > LEVEL_CAP) {
    throw new Error(`level out of range: ${level}`);
  }
  return 4 + 2 * (level - 1);
}

/** Level for a cumulative XP value (thresholds are "XP to reach level n+1"). */
export function levelForXp(xp) {
  if (!Number.isFinite(xp)) throw new Error(`xp must be a finite number (got ${xp})`);
  let level = 1;
  for (let i = 1; i < XP_THRESHOLDS.length; i++) {
    if (xp >= XP_THRESHOLDS[i]) level = i + 1;
  }
  return Math.min(level, LEVEL_CAP);
}

/**
 * The Choir Floor XP table (R1's decay, no time gates).
 * @param {number} opponentLevel
 * @param {{repeat?: boolean, firstBind?: boolean, firstImport?: boolean}} opts
 */
export function floorXp(opponentLevel, yourLevel, opts = {}) {
  let xp = 8 + 2 * opponentLevel;
  if (opponentLevel <= yourLevel - 2) {
    xp = Math.max(4, Math.round(xp * 0.25)); // vs opponents ≥2 levels below you
  } else if (opts.repeat) {
    xp = Math.max(4, Math.round(xp * 0.5)); // repeats pay 50%, min 4
  }
  return xp;
}

export const FLOOR_FIRST_BIND_XP = 15;
export const FLOOR_FIRST_IMPORT_XP = 10;

/**
 * The nine-chapter walk under the implemented formula. Returns per-chapter
 * rows: fight XP breakdown, chapter total, cumulative, arrival level.
 * This is the design's promise asserted in tests: every arrival level
 * matches [01] R1's walk column, L9 by the Bellmouth, L10 after the boss.
 */
export function campaignWalk(enemyLevels) {
  const levels = enemyLevels || {
    bram: 1, sedge: 2, brack: 4, reaper_silt: 5, drowned_choristers: 4,
    pell: 6, first_vespers: 7, sable: 5, ysolde: 7, wick_lad: 5, corvane: 7,
    grast: 7, halbrey: 8, mother_bell: 8, yune: 8, first_movement: 9,
    tide_bound: 9, oren: 9, unbound_chorus: 9, ilvanes_second: 10, ilvane: 10,
  };
  let cumulative = 0;
  const rows = CHAPTER_FIGHTS.map((fights, i) => {
    const breakdown = fights.map((id) => ({
      id, role: FIGHT_ROLES[id], xp: xpForFight(levels[id], FIGHT_ROLES[id]),
    }));
    const total = breakdown.reduce((s, f) => s + f.xp, 0) + CHAPTER_COMPLETION_XP;
    cumulative += total;
    return {
      chapter: i + 1,
      fights: breakdown,
      chapterTotal: total,
      cumulative,
      levelAfter: levelForXp(cumulative),
    };
  });
  return rows;
}

/** The D1 target line, as data (the §13 sentence R2 replaced the stale one with). */
export const CAMPAIGN_TARGET_LINE =
  'The campaign naturally delivers L9 by the Bellmouth; the finale crosses into L10.';
