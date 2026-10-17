/**
 * classes.js — the four class base blocks + identities. [GDD] §5.2, §7.1.
 * 27 points each; players add 4 creation + 2/level (cap 10 per stat).
 * The counter table is canon text used by the pre-fight Reading.
 */

const CLASSES = {
  ashblade: {
    id: 'ashblade',
    name: 'Ashblade',
    base: { vig: 6, mig: 8, wit: 2, grd: 4, hst: 7 },
    mainStat: 'mig',
    damageType: 'steel',
    identity: 'Steel, Bleed stacks, crits, lifesteal',
    vows: [
      { id: 'red_tide', name: 'Red Tide', effect: 'Bleed cap 8, Bleed ticks +1' },
      { id: 'duelist', name: 'Duelist', effect: '+15% crit chance, crits deal ×1.75' },
      { id: 'hunger', name: 'Hunger', effect: 'Heal 12% of direct damage dealt' },
    ],
  },
  cinder_witch: {
    id: 'cinder_witch',
    name: 'Cinder Witch',
    base: { vig: 5, mig: 2, wit: 9, grd: 3, hst: 8 },
    mainStat: 'wit',
    damageType: 'ember',
    identity: 'Ember, Burn, burst, resource tricks',
    vows: [
      { id: 'slow_ash', name: 'Slow Ash', effect: 'Burn lasts +2 turns, +1 potency' },
      { id: 'pyre', name: 'Pyre', effect: '+20% Ember direct damage against burning targets' },
      { id: 'kindling', name: 'Kindling', effect: '+1 Resolve whenever your Burn ticks on the enemy' },
    ],
  },
  gravewarden: {
    id: 'gravewarden',
    name: 'Gravewarden',
    base: { vig: 9, mig: 5, wit: 2, grd: 8, hst: 3 },
    mainStat: 'mig',
    damageType: 'steel',
    identity: 'Armor, Wards, Thorns, Stun',
    vows: [
      { id: 'bastion', name: 'Bastion', effect: '+10% mitigation, Brace is 20% stronger' },
      { id: 'thorn_bearer', name: 'Thorn-Bearer', effect: 'Thorns +4, 25% chance of +1 Resolve when hit' },
      { id: 'long_dark', name: 'Long Dark', effect: 'Heal 4% max HP at the start of your turn' },
    ],
  },
  hollow_cantor: {
    id: 'hollow_cantor',
    name: 'Hollow Cantor',
    base: { vig: 7, mig: 2, wit: 8, grd: 4, hst: 6 },
    mainStat: 'wit',
    damageType: 'shade',
    identity: 'Shade, Curse, Hush, drain',
    vows: [
      { id: 'last_hymn', name: 'Last Hymn', effect: 'Curse reduces damage by 40% and lasts +1 turn' },
      { id: 'echoing_grief', name: 'Echoing Grief', effect: '+8% Shade damage per debuff on the target' },
      { id: 'silence', name: 'Silence', effect: 'Hush reduces Resolve gain by 3, and you gain +1 Resolve when you apply it' },
    ],
  },
};

const CLASS_IDS = Object.keys(CLASSES);

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


module.exports = { CLASSES, CLASS_IDS, COUNTER_TABLE, STAT_KEYS, STAT_NAMES };
