/**
 * archetypes.js — T2.1 build profiles for the balance harness. [GDD] §15.3,
 * [02] §7. Three archetypes per class (aggressive / defensive / status-lean)
 * so "every status has at least one build that wins by leaning on it and at
 * least one that loses to it" is testable, plus a `standard` profile that the
 * default class-vs-class matrix uses.
 *
 * HARNESS FIXTURE CHOICE (not canon): which vow and verse preferences belong
 * to which archetype is a harness-side modelling decision, made once, here,
 * and kept deterministic. Every produced build is canon-legal: creation
 * totals 4, level-ups total 2×(L−1), per-stat cap 10 respected, slotted
 * verses exist and respect their unlock level (poolFor). Changing these
 * tables changes harness numbers — so changes belong in a commit, not a whim.
 */

import { CLASSES, STAT_KEYS } from '../data/classes.js';
import { getVerse, STRIKE } from '../data/verses.js';

export const ARCHETYPE_IDS = ['standard', 'aggressive', 'defensive', 'status'];

const ARCH = {
  ashblade: {
    standard: {
      label: 'Ashblade · standard',
      creation: { mig: 2, hst: 1, vig: 1 },
      priority: ['mig', 'hst', 'vig', 'grd', 'wit'],
      vow: 'red_tide',
      verses: ['rend', 'opening_cut', 'flay', 'red_flurry'],
    },
    aggressive: {
      label: 'Ashblade · aggressive (Duelist crit)',
      creation: { mig: 2, hst: 2 },
      priority: ['mig', 'hst', 'vig', 'grd', 'wit'],
      vow: 'duelist',
      verses: ['red_flurry', 'crimson_waltz', 'rend', 'opening_cut', 'flay'],
    },
    defensive: {
      label: 'Ashblade · defensive (Hunger sustain)',
      creation: { vig: 2, grd: 1, hst: 1 },
      priority: ['vig', 'grd', 'mig', 'hst', 'wit'],
      vow: 'hunger',
      verses: ['rend', 'drink_deep', 'reap_the_red', 'opening_cut', 'second_wind'],
    },
    status: {
      label: 'Ashblade · bleed-lean (Red Tide)',
      creation: { mig: 2, vig: 1, hst: 1 },
      priority: ['mig', 'vig', 'hst', 'grd', 'wit'],
      vow: 'red_tide',
      verses: ['flay', 'rend', 'reap_the_red', 'blood_ledger', 'opening_cut'],
    },
  },
  cinder_witch: {
    standard: {
      label: 'Cinder Witch · standard',
      // WIT base is 9 — creation may add at most +1 before the cap-10 rule bites.
      creation: { wit: 1, hst: 2, vig: 1 },
      priority: ['wit', 'hst', 'vig', 'grd', 'mig'],
      vow: 'pyre',
      verses: ['spark', 'cinderfall', 'stoke', 'conflagration'],
    },
    aggressive: {
      label: 'Cinder Witch · aggressive (Pyre burst)',
      creation: { wit: 1, hst: 2, vig: 1 },
      priority: ['wit', 'hst', 'vig', 'grd', 'mig'],
      vow: 'pyre',
      verses: ['conflagration', 'cinderfall', 'spark', 'sear_the_note', 'stoke'],
    },
    defensive: {
      label: 'Cinder Witch · defensive (Slow Ash veils)',
      creation: { wit: 1, vig: 2, hst: 1 },
      priority: ['vig', 'wit', 'grd', 'hst', 'mig'],
      vow: 'slow_ash',
      verses: ['ashen_veil', 'cinder_shroud', 'cinderfall', 'spark', 'second_wind'],
    },
    status: {
      label: 'Cinder Witch · burn-lean (Kindling engine)',
      creation: { wit: 1, hst: 2, vig: 1 },
      priority: ['wit', 'vig', 'hst', 'grd', 'mig'],
      vow: 'kindling',
      verses: ['stoke', 'fan_the_flames', 'spark', 'conflagration', 'cinderfall'],
    },
  },
  gravewarden: {
    standard: {
      label: 'Gravewarden · standard',
      creation: { grd: 2, vig: 1, mig: 1 },
      priority: ['grd', 'vig', 'mig', 'hst', 'wit'],
      vow: 'bastion',
      verses: ['bulwark_strike', 'hold_the_line', 'sepulchral_spikes', 'earthen_toll'],
    },
    aggressive: {
      label: 'Gravewarden · aggressive (Thorn-Bearer)',
      creation: { mig: 2, hst: 1, vig: 1 },
      priority: ['mig', 'hst', 'vig', 'grd', 'wit'],
      vow: 'thorn_bearer',
      verses: ['earthen_toll', 'bulwark_strike', 'last_rites', 'sepulchral_spikes', 'gravebind'],
    },
    defensive: {
      label: 'Gravewarden · defensive (Bastion mason)',
      // VIG base is 9 — creation may add at most +1 before the cap-10 rule bites.
      creation: { grd: 2, vig: 1, mig: 1 },
      priority: ['vig', 'grd', 'mig', 'hst', 'wit'],
      vow: 'bastion',
      verses: ['last_rites', 'mend_the_mortar', 'hold_the_line', 'stone_vigil', 'crypt_door'],
    },
    status: {
      label: 'Gravewarden · control-lean (Long Dark stun kit)',
      creation: { grd: 2, mig: 1, hst: 1 },
      priority: ['grd', 'mig', 'vig', 'hst', 'wit'],
      vow: 'long_dark',
      verses: ['bulwark_strike', 'stone_vigil', 'crypt_door', 'hold_the_line', 'mend_the_mortar'],
    },
  },
  hollow_cantor: {
    standard: {
      label: 'Hollow Cantor · standard',
      creation: { wit: 2, hst: 1, vig: 1 },
      priority: ['wit', 'hst', 'vig', 'grd', 'mig'],
      vow: 'last_hymn',
      verses: ['dirge', 'wither_note', 'soul_siphon', 'requiem'],
    },
    aggressive: {
      label: 'Hollow Cantor · aggressive (Echoing Grief)',
      creation: { wit: 2, hst: 2 },
      priority: ['wit', 'hst', 'vig', 'grd', 'mig'],
      vow: 'echoing_grief',
      verses: ['requiem', 'seventh_verse', 'soul_siphon', 'wither_note', 'dirge'],
    },
    defensive: {
      label: 'Hollow Cantor · defensive (Last Hymn veil)',
      creation: { wit: 1, vig: 2, hst: 1 },
      priority: ['vig', 'wit', 'grd', 'hst', 'mig'],
      vow: 'last_hymn',
      verses: ['dissonance', 'tolling_bell', 'dirge', 'wither_note', 'second_wind'],
    },
    status: {
      label: 'Hollow Cantor · silence-lean (Silence hush engine)',
      creation: { wit: 2, hst: 2 },
      priority: ['wit', 'hst', 'vig', 'grd', 'mig'],
      vow: 'silence',
      verses: ['requiem', 'lullaby', 'wither_note', 'dirge', 'dissonance'],
    },
  },
};

const COMMON_FILLERS = ['steady_breath', 'purify', 'second_wind', 'vigils_rest', 'stand_fast'];

/** Deterministic cap-10 allocator. Always legal: spill order is canonical. */
function allocate(clazz, creation, priority, level, tuning) {
  const cap = tuning.statCap;
  const base = CLASSES[clazz].stats;
  const levelUps = { vig: 0, mig: 0, wit: 0, grd: 0, hst: 0 };
  let pts = tuning.pointsPerLevel * (level - 1);
  for (const k of [...priority, ...STAT_KEYS]) {
    while (pts > 0 && base[k] + creation[k] + levelUps[k] < cap) {
      levelUps[k] += 1;
      pts -= 1;
    }
    if (pts === 0) break;
  }
  return levelUps; // never stuck: 27 base + 4 creation + 2(L−1) ≤ 5×cap for L ≤ 10
}

/** First 4 slottable verses from a preference list (unlock level respected). */
function pickVerses(prefs, clazz, level) {
  const out = [];
  for (const id of [...prefs, ...COMMON_FILLERS]) {
    if (out.length >= 4) break;
    const v = getVerse(id);
    if (!v || v.isStrike) continue;
    if (v.cls !== 'common' && v.cls !== clazz) continue;
    if (v.unlockLevel > level) continue;
    if (out.includes(v.id)) continue;
    out.push(v.id);
  }
  return out;
}

/**
 * Build one archetype at one level. Throws on illegal output (never silent).
 * @param {string} clazz
 * @param {string} archetype - standard | aggressive | defensive | status
 * @param {number} level
 * @param {object} tuning
 */
export function archetypeBuild(clazz, archetype, level, tuning) {
  const spec = ARCH[clazz]?.[archetype];
  if (!spec) throw new Error(`unknown archetype: ${clazz}/${archetype}`);
  const creation = { vig: 0, mig: 0, wit: 0, grd: 0, hst: 0, ...spec.creation };
  const sum = STAT_KEYS.reduce((s, k) => s + creation[k], 0);
  if (sum !== tuning.creationPoints) {
    throw new Error(`archetype ${clazz}/${archetype}: creation sums ${sum}, expected ${tuning.creationPoints}`);
  }
  const base = CLASSES[clazz].stats;
  for (const k of STAT_KEYS) {
    if (base[k] + creation[k] > tuning.statCap) {
      throw new Error(`archetype ${clazz}/${archetype}: creation pushes ${k} to ${base[k] + creation[k]} over cap ${tuning.statCap}`);
    }
  }
  const levelUps = allocate(clazz, creation, spec.priority, level, tuning);
  return {
    name: `${spec.label} (L${level})`,
    clazz,
    level,
    creation,
    levelUps,
    vow: spec.vow,
    verses: pickVerses(spec.verses, clazz, level),
    items: [],
  };
}

/** The class's default matrix profile (T2.1 main matrix). */
export function standardBuild(clazz, level, tuning) {
  return archetypeBuild(clazz, 'standard', level, tuning);
}

/** Which signature status family each class's `status` archetype leans on. */
export const STATUS_FAMILY = {
  ashblade: 'bleed',
  cinder_witch: 'burn',
  gravewarden: 'stun', // stun kit + thorns control
  hollow_cantor: 'hush', // curse + hush control
};

export const STRIKE_ID = STRIKE.id;
