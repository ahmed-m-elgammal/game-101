/**
 * signature-verbs.js — T4.6: the named-verb set. [GDD] §9.5 rule 1: every
 * enemy has a proper noun for what it does and a tooltip. 21 verbs, one per
 * campaign duel (the §16 inventory row). The verb is DATA: name, tooltip
 * line, the counter it teaches, and the mechanical hook that implements it
 * (script grammar / rite id / special flag — see enemies.js rows).
 */

export const SIGNATURE_VERBS = {
  bram_spikes_outlast: {
    name: 'Sepulchral Spikes, then the wall',
    line: 'Spikes on turn 1. Then Brace and outlast.',
    teaches: 'Burst beats a wall that cannot hurt you.',
  },
  sedge_opening_cut: {
    name: 'The Opening Cut',
    line: 'Opening Cut as a opener, then Rend. Fast — he usually strikes twice before you act.',
    teaches: 'Brace the fast opener; his HST wins initiative, not your HP.',
  },
  brack_hush_opening: {
    name: 'The First Hush',
    line: 'Hush on turn 1, then Tolling Bell. He fights on an empty tank.',
    teaches: 'Hush starves Resolve — Purify it, or race him.',
  },
  reaper_red_flurry: {
    name: 'Red Flurry',
    line: 'Three separate crit rolls, so it can spike.',
    teaches: 'Ward + Thorns absorb the spikes a trio deals one plate.',
  },
  choristers_inheritance: {
    name: 'Inheritance',
    line: 'Each chorister inherits the previous one\u2019s debuffs at current potency, with durations refreshed to 2; Bleed stacks cap as normal.',
    teaches: 'Cleanse between choristers, or the lock hands itself down.',
  },
  pell_ledgers_ward: {
    name: 'Ledger\u2019s Ward',
    line: 'At 50% HP he gains 30 Ward and buys the memory of the most recent slotted verse you cast — casts it once, immediately, at full coefficient with his own stats.',
    teaches: 'Kill him fast; or feed him a cheap verse before the window.',
  },
  first_vespers_toll: {
    name: 'The Toll',
    line: 'Rite at 50% HP: stops defending, gains +1 Resolve per turn, +30% damage, casts Tolling Bell every turn.',
    teaches: 'Phase 1 answers debuffs; Phase 2 is a damage race.',
  },
  sable_mend_the_mortar: {
    name: 'Mend the Mortar',
    line: 'Every 3 turns — you cannot out-chip her.',
    teaches: 'Burst the window, Hush the rhythm, or bring true damage.',
  },
  ysolde_unsanctioned_burn: {
    name: 'Unsanctioned Burn',
    line: 'Burn potency +3, and each Burn tick also costs you 1 Resolve.',
    teaches: 'Mitigation and Ward; Purify if you brought it.',
  },
  wick_lad_clean: {
    name: 'Clean Hands',
    line: 'Clean, fast, no tricks. The crowd narrates every verse you cast.',
    teaches: 'The UI itself, under pressure.',
  },
  corvane_counterbuild: {
    name: 'The Counterbuild',
    line: 'The class, vow and verse pool are chosen at fight start to punish your build.',
    teaches: 'Read his line before the fight. You build the answer mid-fight.',
  },
  grast_thorns_brace_gravebind: {
    name: 'The Furnace Guard',
    line: 'Thorns + Brace + Gravebind. He punishes every direct hit.',
    teaches: 'True damage ignores the entire stack.',
  },
  halbrey_passage: {
    name: 'Rite of Passage',
    line: 'At 66% and 33% HP he changes damage type: Steel \u2192 Shade \u2192 Ember, with matching stat shifts.',
    teaches: 'Read the Rite and re-tool mid-fight.',
  },
  mother_bell_temperature: {
    name: 'Temperature',
    line: 'Molten (>50%): 50% less direct damage, Thorns 8, casts Crypt Door. Cooled (<50%): +30% damage taken, Shade and Curse. The bar shows which.',
    teaches: 'The fight is about when, not what.',
  },
  yune_mimic: {
    name: 'Mimic',
    line: 'She copies the last verse you cast and casts it back at 80% power next turn.',
    teaches: 'Vary the rotation; Strike resets the copy.',
  },
  first_movement_recording: {
    name: 'The Recording',
    line: 'It repeats the exact same opening every time. It is learnable.',
    teaches: 'The window is always turns 1\u20133.',
  },
  tide_bound_salt_soaked: {
    name: 'Salt-Soaked Burn',
    line: 'Ignores Ward and mitigation, lasts 4 turns.',
    teaches: 'Burst before it lands, or Purify. Mitigation answers best.',
  },
  oren_gravebind_regen: {
    name: 'The Kept Gate',
    line: 'Gravebind (Stun) plus 4 HP of regen every turn.',
    teaches: 'DoT out-races regen; Hush breaks the Stun.',
  },
  unbound_chorus_three_voices: {
    name: 'Three Voices',
    line: 'Three sequential Echoes, one per class, each with a single signature verse.',
    teaches: 'Small, fast — learn the third phase of a fight here.',
  },
  seconds_pure_burst: {
    name: 'Pure Burst',
    line: 'No debuffs at all. Pure burst, pure crit, Red Flurry + Opening Cut.',
    teaches: 'Brace and Ward — a change of pace.',
  },
  ilvane_three_phases: {
    name: 'The Three Phases',
    line: 'I: the duellist. II: the Hymn — heals for 20% of damage dealt, summons at 50% and 25%. III: the Baton — he learns your most-cast slotted verse and casts it at 100%.',
    teaches: 'Store your power where he cannot copy it: marks and vows.',
  },
};

export const SIGNATURE_VERB_COUNT = Object.keys(SIGNATURE_VERBS).length;
