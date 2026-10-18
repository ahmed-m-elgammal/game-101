/**
 * classes.js — T4.2: the four class base blocks, identities, damage-type
 * roles, creation constraints and the 4×4 kit-vs-kit matrix. [GDD] §5.1,
 * §5.2 (incl. the NEW kit matrix), §7.1.
 *
 * T4.2 shape contract (T0.3 `class` schema):
 *   { id, name, stats {vig,mig,wit,grd,hst}, damageType, verses[9+] }
 * — rows carry their §6.2–§6.5 verse ids in PRIORITY ORDER (the order the
 * Echo casts them on the Choir Floor, §6 preamble).
 *
 * Creation constraints live in tuning (single source, ENG-5): 4 free points
 * at creation, +2 per level, cap 10 per stat, base rows total 27 each.
 * The tests assert all of it against §5.2 verbatim.
 */

const CLASSES = {
  ashblade: {
    id: 'ashblade',
    name: 'Ashblade',
    stats: { vig: 6, mig: 8, wit: 2, grd: 4, hst: 7 },
    mainStat: 'mig',
    damageType: 'steel',
    identity: 'Steel, Bleed stacks, crits, lifesteal',
    // §6.2 priority order (slot order = Echo AI priority, §6 preamble)
    verses: [
      'rend', 'opening_cut', 'flay', 'drink_deep', 'reap_the_red',
      'slip_the_hymn', 'red_flurry', 'crimson_waltz', 'blood_ledger',
    ],
    // §7.1 class vows (creation picks one; summaries for UI/Reading)
    vows: [
      { id: 'red_tide', name: 'Red Tide', effect: 'Bleed cap 8, Bleed ticks +1' },
      { id: 'duelist', name: 'Duelist', effect: '+15% crit chance, crits deal ×1.75' },
      { id: 'hunger', name: 'Hunger', effect: 'Heal 12% of direct damage dealt' },
    ],
  },
  cinder_witch: {
    id: 'cinder_witch',
    name: 'Cinder Witch',
    stats: { vig: 5, mig: 2, wit: 9, grd: 3, hst: 8 },
    mainStat: 'wit',
    damageType: 'ember',
    identity: 'Ember, Burn, burst, resource tricks',
    verses: [
      'spark', 'cinderfall', 'stoke', 'ashen_veil', 'choking_smoke',
      'fan_the_flames', 'conflagration', 'cinder_shroud', 'sear_the_note',
    ],
    vows: [
      { id: 'slow_ash', name: 'Slow Ash', effect: 'Burn lasts +2 turns, +1 potency' },
      { id: 'pyre', name: 'Pyre', effect: '+20% Ember direct damage against burning targets' },
      { id: 'kindling', name: 'Kindling', effect: '+1 Resolve whenever your Burn ticks on the enemy' },
    ],
  },
  gravewarden: {
    id: 'gravewarden',
    name: 'Gravewarden',
    stats: { vig: 9, mig: 5, wit: 2, grd: 8, hst: 3 },
    mainStat: 'mig',
    damageType: 'steel',
    identity: 'Armor, Wards, Thorns, Stun',
    verses: [
      'bulwark_strike', 'hold_the_line', 'sepulchral_spikes', 'gravebind',
      'mend_the_mortar', 'earthen_toll', 'crypt_door', 'stone_vigil', 'last_rites',
    ],
    vows: [
      { id: 'bastion', name: 'Bastion', effect: '+10% mitigation, Brace is 20% stronger' },
      { id: 'thorn_bearer', name: 'Thorn-Bearer', effect: 'Thorns +4, 25% chance of +1 Resolve when hit' },
      { id: 'long_dark', name: 'Long Dark', effect: 'Heal 4% max HP at the start of your turn' },
    ],
  },
  hollow_cantor: {
    id: 'hollow_cantor',
    name: 'Hollow Cantor',
    stats: { vig: 7, mig: 2, wit: 8, grd: 4, hst: 6 },
    mainStat: 'wit',
    damageType: 'shade',
    identity: 'Shade, Curse, Hush, drain',
    verses: [
      'dirge', 'wither_note', 'soul_siphon', 'tolling_bell', 'dissonance',
      'lullaby', 'requiem', 'grave_cadence', 'seventh_verse',
    ],
    vows: [
      { id: 'last_hymn', name: 'Last Hymn', effect: 'Curse reduces damage by 40% and lasts +1 turn' },
      { id: 'echoing_grief', name: 'Echoing Grief', effect: '+8% Shade damage per debuff on the target' },
      { id: 'silence', name: 'Silence', effect: 'Hush reduces Resolve gain by 3, and you gain +1 Resolve when you apply it' },
    ],
  },
};

const CLASS_IDS = Object.keys(CLASSES);

/**
 * §5.1 stat roles — which stat drives which lever. Data for the creation
 * screen and the pre-fight Reading (the "why does this number move" layer).
 */
const STAT_ROLES = {
  vig: ['Max HP', 'healing power'],
  mig: ['Steel damage', 'Bleed strength'],
  wit: ['Ember and Shade damage', 'Burn strength', 'Wards'],
  grd: ['Damage mitigation', 'Guard-scaling skills'],
  hst: ['Turn order', 'crit chance'],
};

/** §5.1 derived formulas, as data (the UI renders them; the math reads tuning). */
const DERIVED_RULES = {
  maxHp: '60 + 8 × VIG',
  mitigation: 'Steel 2% × GRD; Ember and Shade 1% × GRD; capped at 60%',
  critChance: '5% + 1% × HST; crits deal ×1.5',
  turnOrder: 'higher HST goes first; ties via the Measure; second mover starts +1 Resolve',
};

/**
 * The signature-interaction table. [GDD] §5.2 (kits vs kits) — canon text,
 * surfaced by the pre-fight Reading so counterplay is taught by the UI.
 * attacker → defender → line
 */
const COUNTER_TABLE = {
  ashblade: {
    cinder_witch: 'Burn outpaces you.',
    gravewarden: 'Bleed ignores armor.',
    hollow_cantor: 'They cleanse your Bleed.',
  },
  cinder_witch: {
    ashblade: 'You burn faster than they bleed.',
    gravewarden: 'Conflagration cracks armor.',
    hollow_cantor: 'Hush starves your engine.',
  },
  gravewarden: {
    ashblade: 'You outlast the burst.',
    cinder_witch: 'Ward blunts burn.',
    hollow_cantor: 'Stun locks their lock.',
  },
  hollow_cantor: {
    ashblade: 'Curse slows their crits.',
    cinder_witch: 'Shade outpaces burn.',
    gravewarden: 'Fray breaks their armor.',
  },
};

const STAT_KEYS = ['vig', 'mig', 'wit', 'grd', 'hst'];
const STAT_NAMES = { vig: 'Vigor', mig: 'Might', wit: 'Wit', grd: 'Guard', hst: 'Haste' };


module.exports = { CLASSES, CLASS_IDS, STAT_ROLES, DERIVED_RULES, COUNTER_TABLE, STAT_KEYS, STAT_NAMES };
