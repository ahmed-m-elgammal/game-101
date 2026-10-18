/**
 * enemies.js — T4.6: the 21-fight campaign roster. [GDD] §9.1–§9.3 verbatim.
 *
 * Every stat row, HP value, signature verb and counter line is transcribed
 * from the canon tables; nothing is retuned. Rows carry:
 *   - the frozen `enemy` T0.3 schema fields (id/name/cls/level/alloc/hp/
 *     hpOverride/signature/counterLine/rite),
 *   - the build payload the engine consumes (verses/script/vow/items/rite/
 *     art/special/sequence) — `build()` turns a row into an engine build,
 *   - `sig` — the signature verb id (data/signature-verbs.js, 21 entries).
 *
 * Verse pools: canon names the signature verb and often the opener; the rest
 * of each pool is authored from the class catalogue at unlock-legal levels
 * and tagged in `authored` notes (the §9.5 verb/tooltip set is canon, the
 * filler is implementation). Scripted openers use the ENG-9 queue grammar:
 * plain entries cast once in order; a trailing '*' repeats whenever legal.
 *
 * Budget conformance (D7/N5): every row sums to 33 + 2(L−1) exactly, except
 * Mother Bell — the declared A6 hybrid override (49 at L8), like its HP
 * override. The frozen `enemy` schema cross-check enforces this at load.
 *
 * Special mechanics (each reproduces its GDD prose; tested per verb):
 *   Choristers ×3  — sequence + Inheritance (F34/D31)
 *   Pell           — rite `pells_ledgers_ward` (N4: 30 Ward + verse-theft)
 *   Corvane        — variable build, resolved by T4.9 (data/corvane.js)
 *   First Movement — fixed 3-turn opening, pronoun "it" (F20)
 *   Turned Pour    — ally sheet per [02] R7d (data row only; T6.4 consumes)
 *   Ysolde / Tide-Bound / Oren / Yune / Mother Bell — per-row `special`
 */

import { corvaneSheet } from './corvane.js';

export const ENEMIES = [
  // ---------------------------------------------------------------- §9.1
  {
    id: 'bram', duel: 1, chapter: 1, name: 'Hollowed Sexton Bram',
    cls: 'gravewarden', level: 1, alloc: { vig: 11, mig: 5, wit: 2, grd: 10, hst: 5 },
    hp: 120, hpOverride: true, signature: 'bram_spikes_outlast', rite: null,
    counterLine: 'Burst. He has no damage; he has a wall.',
    vow: null, verses: ['sepulchral_spikes', 'hold_the_line', 'bulwark_strike', 'gravebind'],
    script: ['sepulchral_spikes', 'hold_the_line*'], art: 'bram',
    notes: 'HP 120 PROVISIONAL:D12 (was 148). D12 parameterized: tuning.bramHP.',
  },
  {
    id: 'sedge', duel: 2, chapter: 1, name: 'Tollward Sedge, the Bell-Ringer\u2019s Echo',
    cls: 'ashblade', level: 2, alloc: { vig: 6, mig: 11, wit: 2, grd: 5, hst: 11 },
    hp: 108, hpOverride: false, signature: 'sedge_opening_cut', rite: null,
    counterLine: 'Brace. He does not need to be tanked, only slowed.',
    vow: null, verses: ['opening_cut', 'rend', 'flay', 'drink_deep'],
    script: ['opening_cut', 'rend*'], art: 'sedge',
    notes: 'Canon: "Opening Cut as a opener, then Rend. Fast — he usually strikes twice before you act." The speed is his HST 11 (initiative, §5.1); the opener is the script.',
  },
  {
    id: 'brack', duel: 3, chapter: 2, name: 'Toll-Warden Brack',
    cls: 'hollow_cantor', level: 4, alloc: { vig: 8, mig: 2, wit: 12, grd: 7, hst: 10 },
    hp: 124, hpOverride: false, signature: 'brack_hush_opening', rite: null,
    counterLine: 'Deaf Wax, or Purify, or burst him before the second Hush.',
    vow: null, verses: ['tolling_bell', 'dirge', 'lullaby', 'dissonance'],
    script: ['tolling_bell', 'tolling_bell*'], art: 'brack',
    notes: 'Canon: "Hush on turn 1, then Tolling Bell." Tolling Bell carries the Hush rider (§6.5), so the opening Hush IS the bell. "He fights on an empty tank" — flavor.',
  },
  {
    id: 'reaper_silt', duel: 4, chapter: 2, name: 'The Reaper of the Silt',
    cls: 'ashblade', level: 5, alloc: { vig: 6, mig: 13, wit: 2, grd: 6, hst: 14 },
    hp: 108, hpOverride: false, signature: 'reaper_red_flurry', rite: null,
    counterLine: 'Ward + Thorns. A trio beats one plate.',
    vow: null, verses: ['red_flurry', 'rend', 'flay', 'opening_cut'],
    script: ['red_flurry*'], art: 'reaper_silt',
    notes: 'N3 resolved: the "threes" are choreography, not summons — single build, single HP line (§3 note). Three separate crit rolls = Red Flurry hits:3.',
  },
  {
    id: 'drowned_choristers', duel: 5, chapter: 3, name: 'The Drowned Choristers',
    cls: 'hollow_cantor', level: 4, alloc: { vig: 9, mig: 2, wit: 11, grd: 6, hst: 11 },
    hp: 44, hpOverride: true, signature: 'choristers_inheritance', rite: null,
    counterLine: 'Cleanse between choristers, or burst one hard before the second opens.',
    vow: null, verses: ['dirge'],
    script: ['dirge*'], art: 'drowned_choristers',
    sequence: { inherit: true, count: 3 },
    notes: '132 HP as 3 × 44 sequential bodies (F34/D31 Inheritance: debuffs carry at current potency, durations refreshed to 2, Bleed cap as normal). The row\u2019s hp/alloc describe ONE chorister.',
  },
  {
    id: 'pell', duel: 6, chapter: 3, name: 'Tithe-Collector Pell',
    cls: 'cinder_witch', level: 6, alloc: { vig: 5, mig: 2, wit: 16, grd: 8, hst: 12 },
    hp: 100, hpOverride: false, signature: 'pell_ledgers_ward', rite: 'pells_ledgers_ward',
    counterLine: 'Kill him fast. His own Ward is the only defence he has.',
    vow: null, verses: ['spark', 'cinderfall', 'stoke', 'choking_smoke'], art: 'pell',
    notes: 'Ledger\u2019s Ward at 50% HP per N4: +30 Ward and he buys the memory of the most recent slotted verse you cast — casts it once, immediately, at 100% coefficient with his own stats, then it goes on his normal cooldown.',
  },
  {
    id: 'first_vespers', duel: 7, chapter: 3, name: 'First Vespers, the Drowned Cantor',
    cls: 'hollow_cantor', level: 7, alloc: { vig: 8, mig: 2, wit: 14, grd: 8, hst: 13 },
    hp: 124, hpOverride: false, signature: 'first_vespers_toll', rite: 'first_vespers',
    counterLine: 'Phase 1 is a debuff lock — cleanse or outsustain. Phase 2 is a damage race. You need both answers.',
    vow: null, verses: ['tolling_bell', 'dirge', 'dissonance', 'lullaby'],
    script: ['dirge', 'lullaby*'], art: 'first_vespers',
    notes: 'Act I boss. Rite — The Toll at 50%: stops defending, +1 Resolve/turn, +30% damage, casts Tolling Bell every turn (castEveryTurn flag, T1.8).',
  },
  // ---------------------------------------------------------------- §9.2
  {
    id: 'sable', duel: 8, chapter: 4, name: 'Bone-Nurse Sable',
    cls: 'gravewarden', level: 5, alloc: { vig: 12, mig: 5, wit: 3, grd: 13, hst: 8 },
    hp: 156, hpOverride: false, signature: 'sable_mend_the_mortar', rite: null,
    counterLine: 'Burst, or Hush her off the rhythm, or true damage.',
    vow: null, verses: ['mend_the_mortar', 'bulwark_strike', 'sepulchral_spikes', 'earthen_toll'],
    script: ['mend_the_mortar*'], art: 'sable',
    notes: 'Canon: "Mend the Mortar every 3 turns" — the verse\u2019s CD is 3, so the repeat-script reproduces the rhythm exactly.',
  },
  {
    id: 'ysolde', duel: 9, chapter: 4, name: 'Ninth Sister Ysolde',
    cls: 'cinder_witch', level: 7, alloc: { vig: 6, mig: 2, wit: 17, grd: 9, hst: 11 },
    hp: 108, hpOverride: false, signature: 'ysolde_unsanctioned_burn', rite: null,
    counterLine: 'Mitigation and Ward. Or Purify, if you brought it.',
    vow: null, verses: ['spark', 'cinderfall', 'stoke', 'conflagration'],
    special: { unsanctionedBurn: { potencyBonus: 3, resolveTax: 1 } },
    art: 'ysolde',
    notes: 'UNSANCTIONED BURN: potency +3, and each Burn tick also costs the burning fighter 1 Resolve.',
  },
  {
    id: 'wick_lad', duel: 10, chapter: 5, name: 'The Wick Lad',
    cls: 'cinder_witch', level: 5, alloc: { vig: 5, mig: 2, wit: 14, grd: 7, hst: 13 },
    hp: 100, hpOverride: false, signature: 'wick_lad_clean', rite: null,
    counterLine: 'Nothing special. It is a licence to learn the UI under pressure.',
    vow: null, verses: ['spark', 'cinderfall', 'ashen_veil', 'conflagration'],
    art: 'wick_lad',
    notes: '"Clean, fast, no tricks." Deliberately script-less — the UI lesson fight.',
  },
  {
    id: 'corvane', duel: 11, chapter: 5, name: 'Corvane, the Grey Duelist',
    cls: 'varies', level: 7, alloc: { vig: 8, mig: 13, wit: 5, grd: 8, hst: 11 },
    hp: 116, hpOverride: false, signature: 'corvane_counterbuild', rite: null,
    counterLine: 'You do not have one. You have to build one, mid-fight, out of four slots.',
    vow: null, verses: [], art: 'corvane',
    declared: { varies: true },
    notes: 'The class/vow/pool are chosen at fight start to punish YOUR build (T4.9: seeded from the build string at chapter start, locked for the run — D11). alloc/hp here describe the reference sheet; the live sheet resolves per run from data/corvane.js.',
  },
  {
    id: 'grast', duel: 12, chapter: 6, name: 'Furnace-Warden Grast',
    cls: 'gravewarden', level: 7, alloc: { vig: 13, mig: 6, wit: 2, grd: 16, hst: 8 },
    hp: 164, hpOverride: false, signature: 'grast_thorns_brace_gravebind', rite: null,
    counterLine: 'True damage. Bleed and Burn ignore the entire stack.',
    vow: null, verses: ['sepulchral_spikes', 'stone_vigil', 'gravebind', 'bulwark_strike'],
    script: ['sepulchral_spikes', 'gravebind', 'stone_vigil*'], art: 'grast',
    notes: '"He punishes every direct hit" — Spikes + Stone Vigil keep Thorns up nearly permanently.',
  },
  {
    id: 'halbrey', duel: 13, chapter: 6, name: 'Founder Halbrey',
    cls: 'ashblade', level: 8, alloc: { vig: 7, mig: 14, wit: 3, grd: 8, hst: 15 },
    hp: 116, hpOverride: false, signature: 'halbrey_passage', rite: 'halbrey_passage',
    counterLine: 'Read the Rite on his panel and re-tool. Ward the Ember phase, burst the Steel phase.',
    vow: null, verses: ['rend', 'opening_cut', 'flay', 'red_flurry'], art: 'halbrey',
    notes: 'Rite of Passage at 66% and 33%: Steel → Shade → Ember, with matching stat shifts (mults authored — canon names the shifts without numbers).',
  },
  {
    id: 'mother_bell', duel: 14, chapter: 6, name: 'Mother Bell',
    cls: 'hybrid', level: 8, alloc: { vig: 13, mig: 6, wit: 9, grd: 15, hst: 6 },
    hp: 300, hpOverride: true, signature: 'mother_bell_temperature', rite: 'mother_bell_temperature',
    counterLine: 'DoT, or manage the temperature. Warden reflects through the molten phase; Cantor sour-cools it. The fight is about when, not what.',
    vow: null,
    verses: ['crypt_door', 'bulwark_strike', 'sepulchral_spikes', 'stone_vigil', 'dirge', 'wither_note', 'lullaby', 'tolling_bell'],
    art: 'mother_bell',
    notes: 'A6 hybrid override: stat row 49 at L8 (+2 over the 47 budget), declared like the HP override. Temperature: molten >50% (50% less direct damage, Thorns 8, Warden-chassis pool) ↔ cooled <50% (+30% damage taken, Shade+Curse pool). D10 levers live in the rite data.',
  },
  // ---------------------------------------------------------------- §9.3
  {
    id: 'yune', duel: 15, chapter: 7, name: 'Lector Yune',
    cls: 'hollow_cantor', level: 8, alloc: { vig: 8, mig: 2, wit: 16, grd: 8, hst: 13 },
    hp: 124, hpOverride: false, signature: 'yune_mimic', rite: null,
    counterLine: 'Vary your rotation, use Strike to reset, or burst her before the copy lands.',
    vow: null, verses: ['dirge', 'wither_note', 'requiem', 'grave_cadence'],
    special: { mimic: true, mimicPower: 0.8 }, art: 'yune',
    notes: 'Mimic: she copies the last verse you cast (Strike included — the reset trick is canon) and casts it back at 80% power next turn.',
  },
  {
    id: 'first_movement', duel: 16, chapter: 7, name: 'The Pale Cantor, First Movement',
    cls: 'hollow_cantor', level: 9, alloc: { vig: 8, mig: 2, wit: 18, grd: 8, hst: 13 },
    hp: 124, hpOverride: false, signature: 'first_movement_recording', rite: null,
    counterLine: 'Learn it. The window is always turns 1\u20133.',
    vow: null, verses: ['dirge', 'lullaby', 'requiem', 'tolling_bell'],
    script: ['dirge', 'dirge', 'lullaby'], art: 'first_movement',
    notes: 'F20: pronoun "it" — a recording of Ilvane. The 3-turn opener is fixed and affordable from either initiative position (authored; the canon fixes "the exact same opening every time", not the notes).',
  },
  {
    id: 'tide_bound', duel: 17, chapter: 8, name: 'The Tide-Bound',
    cls: 'cinder_witch', level: 9, alloc: { vig: 6, mig: 2, wit: 18, grd: 10, hst: 13 },
    hp: 108, hpOverride: false, signature: 'tide_bound_salt_soaked', rite: null,
    counterLine: 'Burst before it lands, or heavy mitigation, or Purify.',
    vow: null, verses: ['spark', 'cinderfall', 'stoke', 'conflagration'],
    special: { saltSoakedBurn: { turns: 4, ignoresWard: true } }, art: 'tide_bound',
    notes: 'SALT-SOAKED BURN: ignores Ward AND mitigation (ticks are true damage by §5.5; the flag additionally refuses the Founder\u2019s-Leather Ward absorb), lasts 4 turns. §9.5\u2019s one named exception: answered best by Gravewarden mitigation.',
  },
  {
    id: 'oren', duel: 18, chapter: 8, name: 'Sister Oren, Keeper of the Gate',
    cls: 'gravewarden', level: 9, alloc: { vig: 14, mig: 7, wit: 2, grd: 18, hst: 8 },
    hp: 172, hpOverride: false, signature: 'oren_gravebind_regen', rite: null,
    counterLine: 'DoT, and Hush to break the Stun. You cannot win a straight race.',
    vow: null, verses: ['gravebind', 'bulwark_strike', 'sepulchral_spikes', 'earthen_toll'],
    script: ['gravebind', 'gravebind*'],
    special: { regenPerTurn: 4 }, art: 'oren',
    notes: 'Gravebind (Stun) plus 4 HP of regen every turn.',
  },
  {
    id: 'unbound_chorus', duel: 19, chapter: 9, name: 'The Unbound Chorus',
    cls: 'mixed', level: 9, alloc: { vig: 10, mig: 19, wit: 2, grd: 8, hst: 10 },
    hp: 55, hpOverride: true, signature: 'unbound_chorus_three_voices', rite: null,
    counterLine: 'Small, fast, and a good place to learn the third phase of a fight.',
    sequence: { inherit: false, count: 3 }, art: 'unbound_chorus',
    declared: { mixed: true },
    notes: 'Three sequential Echoes, one per class, each with a single signature verse, 55 HP each. Canon publishes no stat rows for the three voices — the members are budget-conformant L9 Echo builds (49 each), authored PROVISIONAL: see UNBOUND_VOICES. alloc/hp describe the lead voice.',
  },
  {
    id: 'ilvanes_second', duel: 20, chapter: 9, name: 'Ilvane\u2019s Second',
    cls: 'ashblade', level: 10, alloc: { vig: 7, mig: 16, wit: 3, grd: 8, hst: 17 },
    hp: 116, hpOverride: false, signature: 'seconds_pure_burst', rite: null,
    counterLine: 'Brace and Ward. A change of pace after eight chapters of status effects.',
    vow: null, verses: ['red_flurry', 'opening_cut', 'drink_deep', 'slip_the_hymn'],
    script: ['red_flurry', 'opening_cut*'], art: 'ilvanes_second',
    notes: 'No debuffs at all — the pool carries no bleed/burn/curse riders (Rend/Flay excluded on purpose).',
  },
  {
    id: 'ilvane', duel: 21, chapter: 9, name: 'The Pale Cantor Ilvane',
    cls: 'hollow_cantor', level: 10, alloc: { vig: 8, mig: 2, wit: 19, grd: 9, hst: 13 },
    hp: 420, hpOverride: true, signature: 'ilvane_three_phases', rite: 'ilvane_three_phases',
    counterLine: 'Phase I he duels. Phase II he heals and summons. Phase III he is you.',
    vow: null, verses: ['dirge', 'lullaby', 'requiem', 'grave_cadence'],
    script: ['dirge', 'lullaby*'], art: 'ilvane',
    notes: 'FINAL BOSS. I: the duellist. II: the Hymn — heals for 20% of damage dealt (A4/D31), summons two Choristers at 50% and 25%. III: the Baton — learns your most-cast slotted verse at 100% (F21/D31; Strike never copied). He copies verses. He does not copy marks.',
  },
];

/** Campaign fight count (the §16 inventory row: 21 duels). */
export const CAMPAIGN_DUELS = ENEMIES.length;

/**
 * The Unbound Chorus's three voices — canon gives "one per class, each with
 * a single signature verse, 55 HP" and no stat rows. Budget-conformant L9
 * Echo builds (49 points), all-in on their voice. PROVISIONAL (authored).
 */
export const UNBOUND_VOICES = [
  {
    name: 'Unbound Voice — the Ashblade', clazz: 'ashblade', level: 9, isEnemy: true,
    stats: { vig: 10, mig: 19, wit: 2, grd: 8, hst: 10 },
    hpOverride: 55, vow: null, verses: ['red_flurry'], items: [],
  },
  {
    name: 'Unbound Voice — the Gravewarden', clazz: 'gravewarden', level: 9, isEnemy: true,
    stats: { vig: 10, mig: 10, wit: 2, grd: 19, hst: 8 },
    hpOverride: 55, vow: null, verses: ['gravebind'], items: [],
  },
  {
    name: 'Unbound Voice — the Cinder Witch', clazz: 'cinder_witch', level: 9, isEnemy: true,
    stats: { vig: 10, mig: 2, wit: 19, grd: 8, hst: 10 },
    hpOverride: 55, vow: null, verses: ['conflagration'], items: [],
  },
];

/**
 * Ilvane's summoned Chorister bodies ("55-HP bodies that die to one Flurry",
 * [02] §6.3). One data row; both summons (50% / 25%) instantiate it.
 */
export const SUMMON_BODIES = {
  chorister_body: {
    name: 'Summoned Chorister', clazz: 'hollow_cantor', level: 5, isEnemy: true,
    stats: { vig: 8, mig: 2, wit: 12, grd: 6, hst: 13 }, // sums 41 = budget(5)
    hpOverride: 55, vow: null, verses: ['dirge'], items: [],
    art: 'drowned_choristers',
  },
};

/**
 * The Turned Pour — Ch9 ally bell when Oren was sent up. [02] R7d, approved:
 * "Data, not design." One row; the Ch9 fight variant (T6.4) consumes it.
 */
export const TURNED_POUR_ALLY = {
  id: 'turned_pour', name: 'The Turned Pour',
  clazz: 'gravewarden', level: 8,
  stats: { vig: 10, mig: 5, wit: 2, grd: 10, hst: 4 }, // chassis = base 27 + creation 4 = 31 points; the ally never levels
  hpOverride: 140,
  startThorns: 6,
  oncePerRoundAttack: true,
  curseImmune: true,
  notes: '[02] R7d approved sheet: L8 Warden chassis, 140 HP, Thorns 6, attacks once per round, cannot be targeted by Ilvane\u2019s Curse.',
};

/** Row → engine build (the shape buildSheet consumes). */
export function enemyBuild(row, extras = {}) {
  // The Unbound Chorus's lead body is its first voice (canon publishes no
  // single "mixed" sheet; the row's alloc mirrors the lead for the schema).
  const lead = row.id === 'unbound_chorus'
    ? { ...structuredClone(UNBOUND_VOICES[0]), name: row.name, script: ['red_flurry*'] }
    : null;
  // The hybrid row (Mother Bell) is a declared A6 override: Gravewarden
  // chassis, Cantor verse pool, +2 over the D7 budget like its HP override.
  // The varies row (Corvane) resolves to his reference sheet until the
  // per-run counterbuild pick (T4.9) replaces it at fight start.
  const hybrid = row.cls === 'hybrid';
  const varies = row.cls === 'varies';
  const build = lead ? {
    name: lead.name, clazz: lead.clazz, level: lead.level, isEnemy: true,
    stats: { ...lead.stats }, hpOverride: lead.hpOverride,
    vow: null, verses: [...lead.verses], items: [], rite: null,
    art: row.art || null,
  } : varies ? {
    ...corvaneSheet('corvane_neutral_ash'),
    art: row.art || null,
  } : {
    name: row.name,
    clazz: hybrid ? 'gravewarden' : row.cls,
    level: row.level, isEnemy: true,
    stats: { ...row.alloc }, hpOverride: row.hp,
    vow: row.vow || null,
    verses: [...(row.verses || [])],
    items: row.items || [],
    rite: row.rite || null,
    art: row.art || null,
    ...(hybrid ? { budgetOverride: true } : {}),
  };
  if (!lead && row.script) build.script = [...row.script];
  if (row.special && !lead) build.special = structuredClone(row.special);
  if (row.sequence) {
    build.sequence = { inherit: !!row.sequence.inherit, members: sequenceMembers(row) };
  }
  return Object.assign(build, extras);
}

/** Expand a sequence row into the member builds (lead + the rest). */
export function sequenceMembers(row) {
  if (row.id === 'drowned_choristers') {
    const member = () => ({
      name: 'Drowned Chorister', clazz: 'hollow_cantor', level: 4, isEnemy: true,
      stats: { ...row.alloc }, hpOverride: 44, vow: null, verses: ['dirge'], items: [],
      script: ['dirge*'], art: 'drowned_choristers',
    });
    return [member(), member()]; // the lead fights; two remain
  }
  if (row.id === 'unbound_chorus') {
    return UNBOUND_VOICES.slice(1).map((v) => ({
      ...structuredClone(v),
      script: [`${v.verses[0]}*`],
    }));
  }
  return [];
}

export const ENEMY_BY_ID = new Map(ENEMIES.map((e) => [e.id, e]));
export function getEnemy(id) {
  const row = ENEMY_BY_ID.get(id);
  if (!row) throw new Error('Unknown enemy: ' + id);
  return row;
}

/** Name → counter line, for the Reading panel (§5.8 hand-written overrides). */
export const COUNTER_LINES = Object.fromEntries(ENEMIES.map((e) => [e.name, e.counterLine]));
