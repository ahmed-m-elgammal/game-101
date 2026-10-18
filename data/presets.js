/**
 * presets.js — canon fixture builds for the Phase-1 viewer.
 * Every row cites its source. These are the same shapes the harness (Phase 2)
 * will drive at scale; here they make the engine observable by hand.
 */

/** [GDD] §9/T1.2 acceptance example: "L1 Ashblade w/ MIG 12 → 108 HP".
 * N6-adjacent reconciliation: MIG 12 is impossible under the cap-10 rule —
 * the §13-era example predates the cap reading. Canon-legal equivalent:
 * creation mig+2 hst+2 → MIG 10, HST 9, VIG 6 → 108 HP (the HP assert holds,
 * and MIG is maxed, which is what the example meant). */
const { VERSE_BY_ID } = require('./verses.js');

const L1_ASHBLADE = {
  name: 'Ashblade (canon example)',
  clazz: 'ashblade',
  level: 1,
  creation: { vig: 0, mig: 2, wit: 0, grd: 0, hst: 2 }, // exactly 4 points
  levelUps: { vig: 0, mig: 0, wit: 0, grd: 0, hst: 0 },
  vow: 'red_tide',
  verses: ['rend', 'opening_cut', 'flay', 'drink_deep'],
  items: [],
};

/** §9.1 #1 — Hollowed Sexton Bram. budget(1)=33; HP 120 PROVISIONAL:D12. */
const BRAM = {
  name: 'Hollowed Sexton Bram',
  clazz: 'gravewarden',
  level: 1,
  isEnemy: true,
  stats: { vig: 11, mig: 5, wit: 2, grd: 10, hst: 5 }, // sums 33 = budget(1)
  hpOverride: 120, // PROVISIONAL:D12
  vow: null,
  verses: ['sepulchral_spikes', 'hold_the_line', 'bulwark_strike', 'gravebind'],
  items: [],
};

/** §9.1 #7 — First Vespers, the Drowned Cantor (Act I boss, Rite fixture). */
const FIRST_VESPERS = {
  name: 'First Vespers, the Drowned Cantor',
  clazz: 'hollow_cantor',
  level: 7,
  isEnemy: true,
  stats: { vig: 8, mig: 2, wit: 14, grd: 8, hst: 13 }, // sums 45 = budget(7)
  hpOverride: 124,
  vow: null,
  verses: ['tolling_bell', 'dirge', 'dissonance', 'lullaby'],
  items: [],
  rite: 'first_vespers',
};

/** L5 mirrors — the balance harness's reference matchup shape (canon-legal). */
const MIRROR_PLAN = {
  ashblade: { creation: { mig: 2, vig: 1, hst: 1 }, priority: ['mig', 'hst', 'vig', 'grd', 'wit'] },
  cinder_witch: { creation: { wit: 1, hst: 2, vig: 1 }, priority: ['wit', 'hst', 'vig', 'grd', 'mig'] },
  gravewarden: { creation: { grd: 2, vig: 1, mig: 1 }, priority: ['grd', 'vig', 'hst', 'mig', 'wit'] },
  hollow_cantor: { creation: { wit: 2, hst: 1, vig: 1 }, priority: ['wit', 'hst', 'vig', 'grd', 'mig'] },
};

const LOADOUTS = {
  ashblade: ['rend', 'opening_cut', 'flay', 'red_flurry'],
  cinder_witch: ['spark', 'cinderfall', 'ashen_veil', 'conflagration'],
  gravewarden: ['bulwark_strike', 'sepulchral_spikes', 'crypt_door', 'earthen_toll'],
  hollow_cantor: ['dirge', 'wither_note', 'soul_siphon', 'requiem'],
};

// Unlock-legality backfill (re-test finding, 2026-10-18): a loadout may only
// contain verses unlocked by the build's level ([GDD] §6/§13; the same rule
// harness/archetypes.js records for its own fixtures). The fixed LOADOUTS
// lists assume L5; at L1–L4 locked verses are replaced by the common fillers
// in canonical order, deterministically.
const COMMON_BACKFILL = ['steady_breath', 'second_wind', 'vigils_rest', 'purify', 'stand_fast'];

function legalLoadout(clazz, level) {
  const prefs = [];
  for (const id of [...LOADOUTS[clazz], ...COMMON_BACKFILL]) {
    if (prefs.length >= 4) break;
    const v = VERSE_BY_ID.get(id);
    if (!v || v.isStrike) continue;
    if (v.cls !== 'common' && v.cls !== clazz) continue;
    if (v.unlockLevel > level) continue;
    if (prefs.includes(v.id)) continue;
    prefs.push(v.id);
  }
  return prefs;
}

/**
 * Spend `points` into levelUps following the priority order, hard-capped at
 * 10 per stat (counting base + creation). Deterministic and always legal.
 */
function spendLevelUps(clazz, level, tuning) {
  const plan = MIRROR_PLAN[clazz];
  const base = { ashblade: [6, 8, 2, 4, 7], cinder_witch: [5, 2, 9, 3, 8], gravewarden: [9, 5, 2, 8, 3], hollow_cantor: [7, 2, 8, 4, 6] }[clazz];
  const keys = ['vig', 'mig', 'wit', 'grd', 'hst'];
  const baseMap = Object.fromEntries(keys.map((k, i) => [k, base[i]]));
  const creation = { vig: 0, mig: 0, wit: 0, grd: 0, hst: 0, ...plan.creation };
  const left = { vig: 0, mig: 0, wit: 0, grd: 0, hst: 0 };
  let pts = 2 * (level - 1);
  for (const k of plan.priority) {
    while (pts > 0 && baseMap[k] + creation[k] + left[k] < 10) { left[k] += 1; pts -= 1; }
    if (pts === 0) break;
  }
  return { creation, levelUps: left };
}

function mirrorPreset(clazz, level = 5) {
  const { creation, levelUps } = spendLevelUps(clazz, level);
  return {
    name: `${clazz} L${level} mirror`,
    clazz,
    level,
    creation,
    levelUps,
    vow: null,
    verses: legalLoadout(clazz, level),
    items: [],
  };
}


module.exports = { mirrorPreset, L1_ASHBLADE, BRAM, FIRST_VESPERS };
