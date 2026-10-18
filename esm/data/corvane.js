/**
 * corvane.js — T4.6 sheets + T4.9 selection logic. [GDD] §9.2 counter table;
 * [02] R6; D11 (lock, APPROVED).
 *
 * Corvane's class, vow and verse pool are chosen at fight start to punish
 * YOUR build. The counterbuild is seeded from the player's build string at
 * chapter start and LOCKED for the run — a Re-bell does not re-pick ("He
 * watched you fight once. He does not forget."). On the first loss, the next
 * Reading names the axis he punished and shows the counter-table row that
 * fired; from the second loss, the standard Maren's Whisper applies.
 *
 * Selection is a pure function of (build string, chapter salt): identical
 * build → identical counterbuild for the whole run, so a loss+Re-bell loop
 * can never farm a softer counter (the D11 farm-exploit test pins ×20).
 *
 * "Fracture" in the §9.2 table's crit row has no v1.0.1 verse — mapped to
 * earthen_toll (the guard-breaking Fray hit), recorded per row in `notes`.
 */

import { fnv1a } from '../rng/fnv1a.js';

/** The §9.2 table, as data. Order = the fixed lean-priority tiebreak. */
export const COUNTER_RULES = [
  {
    lean: 'bleed',
    label: 'Bleed / armour-shred',
    brings: 'Hollow Cantor — Curse, Purify, Burn',
    why: 'Purify deletes the entire investment. Your stacks go with it.',
    sheetId: 'corvane_cantor_lock',
  },
  {
    lean: 'burn',
    label: 'Burn / damage-over-time',
    brings: 'Gravewarden — Brace, Ward, Mend the Mortar',
    why: 'He out-heals your tick rate.',
    sheetId: 'corvane_warden_sustain',
  },
  {
    lean: 'tank',
    label: 'Ward / Thorns / tanking',
    brings: 'Cinder Witch — Conflagration, Fan the Flames',
    why: 'Burst melts a build built to not die.',
    sheetId: 'corvane_witch_burst',
  },
  {
    lean: 'debuff',
    label: 'Curse / Hush / debuffs',
    brings: 'Ashblade — raw burst',
    why: 'He kills you before the lock lands.',
    sheetId: 'corvane_ash_burst',
  },
  {
    lean: 'crit',
    label: 'Crit / burst',
    brings: 'Gravewarden — Bastion, Fracture, hold to 6',
    why: 'Crits lose to mitigation, always.',
    sheetId: 'corvane_warden_critwall',
    notes: '"Fracture" → earthen_toll (the Fray verse; no v1.0.1 verse carries that name). "hold to 6" is resolve-hoarding — T5.7 doctrine work.',
  },
  {
    lean: 'drain',
    label: 'Drain / lifesteal',
    brings: 'Cinder Witch — burst race',
    why: 'He out-damages your heal.',
    sheetId: 'corvane_witch_race',
  },
];

export const NEUTRAL_LINE = {
  lean: 'neutral',
  label: 'Unrecognised build',
  brings: 'Random from a neutral pool',
  why: 'You get a normal fight. Rare, and it feels like a gift.',
};

/** Per-class generated sheets at L7 — stats from the budget formula (45). */
const SHEETS = {
  corvane_cantor_lock: {
    name: 'Corvane, the Grey Duelist', clazz: 'hollow_cantor', level: 7, isEnemy: true,
    stats: { vig: 8, mig: 2, wit: 16, grd: 8, hst: 11 }, // 45 = budget(7)
    vow: 'last_hymn', verses: ['dirge', 'lullaby', 'purify', 'requiem'], items: [],
  },
  corvane_warden_sustain: {
    name: 'Corvane, the Grey Duelist', clazz: 'gravewarden', level: 7, isEnemy: true,
    stats: { vig: 14, mig: 6, wit: 2, grd: 15, hst: 8 },
    vow: 'long_dark', verses: ['hold_the_line', 'crypt_door', 'mend_the_mortar', 'stone_vigil'], items: [],
  },
  corvane_witch_burst: {
    name: 'Corvane, the Grey Duelist', clazz: 'cinder_witch', level: 7, isEnemy: true,
    stats: { vig: 8, mig: 2, wit: 18, grd: 5, hst: 12 },
    vow: 'pyre', verses: ['conflagration', 'fan_the_flames', 'cinderfall', 'spark'], items: [],
  },
  corvane_ash_burst: {
    name: 'Corvane, the Grey Duelist', clazz: 'ashblade', level: 7, isEnemy: true,
    stats: { vig: 8, mig: 16, wit: 2, grd: 6, hst: 13 },
    vow: 'duelist', verses: ['opening_cut', 'rend', 'red_flurry', 'flay'], items: [],
  },
  corvane_warden_critwall: {
    name: 'Corvane, the Grey Duelist', clazz: 'gravewarden', level: 7, isEnemy: true,
    stats: { vig: 13, mig: 8, wit: 2, grd: 15, hst: 7 },
    vow: 'bastion', verses: ['gravebind', 'earthen_toll', 'bulwark_strike', 'crypt_door'], items: [],
  },
  corvane_witch_race: {
    name: 'Corvane, the Grey Duelist', clazz: 'cinder_witch', level: 7, isEnemy: true,
    stats: { vig: 9, mig: 2, wit: 17, grd: 4, hst: 13 },
    vow: null, verses: ['conflagration', 'cinderfall', 'sear_the_note', 'spark'], items: [],
  },
  // Neutral pool (unrecognised builds): normal, harness-legal mid-specs.
  corvane_neutral_ash: {
    name: 'Corvane, the Grey Duelist', clazz: 'ashblade', level: 7, isEnemy: true,
    stats: { vig: 9, mig: 13, wit: 2, grd: 8, hst: 13 },
    vow: null, verses: ['rend', 'opening_cut', 'flay', 'drink_deep'], items: [],
  },
  corvane_neutral_warden: {
    name: 'Corvane, the Grey Duelist', clazz: 'gravewarden', level: 7, isEnemy: true,
    stats: { vig: 12, mig: 8, wit: 2, grd: 13, hst: 10 },
    vow: null, verses: ['bulwark_strike', 'sepulchral_spikes', 'crypt_door', 'earthen_toll'], items: [],
  },
  corvane_neutral_witch: {
    name: 'Corvane, the Grey Duelist', clazz: 'cinder_witch', level: 7, isEnemy: true,
    stats: { vig: 9, mig: 2, wit: 16, grd: 6, hst: 12 },
    vow: null, verses: ['spark', 'cinderfall', 'ashen_veil', 'conflagration'], items: [],
  },
  corvane_neutral_cantor: {
    name: 'Corvane, the Grey Duelist', clazz: 'hollow_cantor', level: 7, isEnemy: true,
    stats: { vig: 9, mig: 2, wit: 15, grd: 8, hst: 11 },
    vow: null, verses: ['dirge', 'wither_note', 'soul_siphon', 'requiem'], items: [],
  },
};

const NEUTRAL_POOL = ['corvane_neutral_ash', 'corvane_neutral_warden', 'corvane_neutral_witch', 'corvane_neutral_cantor'];

/** Tag table: verse/marks/vow features → lean weights. The detection reads
 *  ONLY what the pre-fight Reading may read (slotted verses, vow, marks). */
const VERSE_TAGS = {
  // bleed / shred
  rend: { bleed: 1 }, flay: { bleed: 1 }, crimson_waltz: { bleed: 1 },
  reap_the_red: { bleed: 2 }, blood_ledger: { bleed: 2 }, salt_reapers_scythe: null,
  // burn / DoT
  spark: { burn: 1 }, stoke: { burn: 2 }, conflagration: { burn: 1 },
  sear_the_note: { burn: 1 }, cinderfall: { tank: 0 },
  // ward / thorns / tank
  steady_breath: { tank: 1 }, stand_fast: { tank: 1 }, hold_the_line: { tank: 1 },
  crypt_door: { tank: 1 }, stone_vigil: { tank: 1 }, sepulchral_spikes: { tank: 1 },
  ashen_veil: { tank: 1 }, cinder_shroud: { tank: 1 }, last_rites: { tank: 1 },
  bulwark_strike: { tank: 1 },
  // curse / hush / debuff
  dirge: { debuff: 1 }, wither_note: { debuff: 1 }, tolling_bell: { debuff: 1 },
  lullaby: { debuff: 2 }, grave_cadence: { debuff: 2 }, choking_smoke: { debuff: 1 },
  gravebind: { debuff: 1 }, earthen_toll: { debuff: 1 }, dissonance: { tank: 1 },
  // crit / burst
  opening_cut: { crit: 1 }, red_flurry: { crit: 1 }, requiem: { crit: 1 },
  seventh_verse: { crit: 1 },
  // drain / lifesteal
  drink_deep: { drain: 2 }, soul_siphon: { drain: 2 },
};

const VOW_TAGS = {
  red_tide: { bleed: 3 }, duelist: { crit: 3 }, hunger: { drain: 3 },
  slow_ash: { burn: 3 }, pyre: { burn: 2 }, kindling: { burn: 2 },
  bastion: { tank: 3 }, thorn_bearer: { tank: 3 }, long_dark: { tank: 2 },
  last_hymn: { debuff: 3 }, echoing_grief: { debuff: 2 }, silence: { debuff: 3 },
};

/** Item marks that read as a lean (the same fields the Reading sees). */
const MARK_TAGS = {
  wick_cutter: { bleed: 2 }, salt_reapers_scythe: { bleed: 2 },
  ysoldes_censer: { burn: 2 }, marrow_furnace: { drain: 2 },
  ash_glazed_brass: { tank: 2 }, vigils_mantle: { tank: 2 }, bellmetal_gauntlets: { tank: 2 },
  wardens_cassock: { tank: 2 }, founders_leather: { tank: 2 }, thimble_coat: { tank: 1 },
  gravedust_censer: { debuff: 2 }, choir_seal: { debuff: 2 },
  corvanes_blade: { crit: 3 }, reliquary_lantern: { crit: 2 },
  vigils_ring: { tank: 1 },
};

/** The fixed lean-priority order = the §9.2 table's row order. */
const LEAN_ORDER = ['bleed', 'burn', 'tank', 'debuff', 'crit', 'drain'];

/**
 * Detect the player build's lean from its slotted verses, vow and marks.
 * @returns {{lean: string, weights: object, rule: object|null}}
 */
export function detectLean(build) {
  const weights = { bleed: 0, burn: 0, tank: 0, debuff: 0, crit: 0, drain: 0 };
  for (const id of build.verses || []) {
    const tags = VERSE_TAGS[id];
    if (tags) for (const [k, w] of Object.entries(tags)) weights[k] += w;
  }
  if (build.vow && VOW_TAGS[build.vow]) {
    for (const [k, w] of Object.entries(VOW_TAGS[build.vow])) weights[k] += w;
  }
  for (const id of build.items || []) {
    const tags = MARK_TAGS[id];
    if (tags) for (const [k, w] of Object.entries(tags)) weights[k] += w;
  }
  let best = null; let bestW = 0;
  for (const lean of LEAN_ORDER) {
    if (weights[lean] > bestW) { best = lean; bestW = weights[lean]; }
  }
  const rule = best ? COUNTER_RULES.find((r) => r.lean === best) : null;
  return { lean: best || 'neutral', weights, rule };
}

/**
 * Canonical build string — the seed source (stable key order; the same
 * discipline T5.1's canonical serialization will formalize for Echo Codes).
 */
export function buildStringOf(build) {
  const keys = ['name', 'clazz', 'level', 'vow'];
  const parts = [];
  for (const k of keys) parts.push(`${k}:${build[k] ?? ''}`);
  parts.push(`verses:${[...(build.verses || [])].join('+')}`);
  parts.push(`items:${[...(build.items || [])].slice().sort().join('+')}`);
  return parts.join('|');
}

/**
 * The locked counterbuild pick. Pure: (build, chapter) → sheet. The seed is
 * the chapter-start build string; Re-bells pass the same inputs and get the
 * same sheet — the farm-exploit test pins 20 identical retries.
 */
export function corvaneCounterbuild(build, chapter = 5) {
  const { lean, weights, rule } = detectLean(build);
  const str = `${buildStringOf(build)}#ch${chapter}`;
  let sheetId;
  if (rule) {
    sheetId = rule.sheetId;
  } else {
    // Unrecognised: a seeded pick from the neutral pool (deterministic —
    // the §10.9 competence ban extends to the pick itself).
    sheetId = NEUTRAL_POOL[fnv1a(str) % NEUTRAL_POOL.length];
  }
  const sheet = SHEETS[sheetId];
  if (!sheet) throw new Error(`unknown corvane sheet: ${sheetId}`);
  return {
    lean, weights, rule, sheetId,
    sheet: structuredClone(sheet),
    fired: rule || NEUTRAL_LINE,
    announce: 'Corvane has watched you fight. He has brought something that answers it.',
    revealLine: rule
      ? 'He did not bring a duelist. He brought an answer.'
      : 'He brought a normal fight. It almost feels like a gift.',
  };
}

export function corvaneSheet(sheetId) {
  const sheet = SHEETS[sheetId];
  if (!sheet) throw new Error(`unknown corvane sheet: ${sheetId}`);
  return structuredClone(sheet);
}

export const CORVANE_SHEET_IDS = Object.keys(SHEETS);
