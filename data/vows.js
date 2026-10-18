/**
 * vows.js — T4.4: all 24 vows as data. [GDD] §7.1 (12 class) + §7.2 (12 story).
 * [00] F25 canon; D4 de-duplication; D30 grants The Kept Name.
 *   D4: the Ysolde's Vow RELIC row (§8.3) is cut — the story vow of the same
 *       name (unified: "Ysolde's Vow") is the canonical row.
 *   D4: the Keeper's Ring STORY-VOW row is cut — the relic Vigil's Ring is
 *       the canonical Ch8-Ruthless reward.
 *   D4: Oren's Post granted to Ch8-Mercy ("while Braced, you cannot be Stunned").
 *   D30: The Kept Name granted to Ch7-Ruthless.
 *   Net: 12 class + 12 story = 24 vows (DECISIONS.md §6 arithmetic).
 *
 * Effect op-codes use the T0.3 vocabulary. Class vows carry the EXACT numbers
 * the engine's vowMods switch implements (tuning stays the single source);
 * story vows are recorded as data here — their fight wiring is T5.1/T5.4
 * (build assembly injects story vows from run state).
 *
 * `hidden: true` rows (The Counter-Voice) are excluded from creation and
 * every picker ([GDD] §7.2 / §4.4).
 */

const CLASS_VOWS = [
  // -- Ashblade ----------------------------------------------------- §7.1
  { id: 'red_tide', name: 'Red Tide', kind: 'class', cls: 'ashblade',
    effects: [{ op: 'conditional', bleedCap: 8, bleedTickBonus: 1, note: 'Bleed cap 8, Bleed ticks +1' }],
    line: 'The tide does not ask the harbour.' },
  { id: 'duelist', name: 'Duelist', kind: 'class', cls: 'ashblade',
    effects: [{ op: 'crit_mod', critBonus: 0.15, critMult: 1.75, note: '+15% crit chance, crits deal ×1.75' }],
    line: 'One ring of the bell, one opening.' },
  { id: 'hunger', name: 'Hunger', kind: 'class', cls: 'ashblade',
    effects: [{ op: 'conditional', lifestealPct: 0.12, note: 'Heal 12% of direct damage dealt' }],
    line: 'Every cut feeds something.' },

  // -- Cinder Witch -------------------------------------------------- §7.1
  { id: 'slow_ash', name: 'Slow Ash', kind: 'class', cls: 'cinder_witch',
    effects: [{ op: 'dot_mod', kind: 'burn', turnsBonus: 2, potencyBonus: 1, note: 'Burn lasts +2 turns, +1 potency' }],
    line: 'Ash settles. It does not hurry.' },
  { id: 'pyre', name: 'Pyre', kind: 'class', cls: 'cinder_witch',
    effects: [{ op: 'conditional', emberVsBurning: 0.2, note: '+20% Ember direct damage against burning targets' }],
    line: 'What burns wants company.' },
  { id: 'kindling', name: 'Kindling', kind: 'class', cls: 'cinder_witch',
    effects: [{ op: 'conditional', burnTickResolve: 1, note: '+1 Resolve whenever your Burn ticks on the enemy' }],
    line: 'Feed the fire; the fire feeds back.' },

  // -- Gravewarden ---------------------------------------------------- §7.1
  { id: 'bastion', name: 'Bastion', kind: 'class', cls: 'gravewarden',
    effects: [{ op: 'mitigation_mod', mitBonus: 0.1, braceBonus: 0.6, note: '+10% mitigation, Brace is 20% stronger' }],
    line: 'The door is the ward. The ward is the vow.' },
  { id: 'thorn_bearer', name: 'Thorn-Bearer', kind: 'class', cls: 'gravewarden',
    effects: [{ op: 'conditional', thornsBonus: 4, resolveOnHitChance: 0.25, note: 'Thorns +4, 25% chance of +1 Resolve when hit' }],
    line: 'Touch the wall and be touched back.' },
  { id: 'long_dark', name: 'Long Dark', kind: 'class', cls: 'gravewarden',
    effects: [{ op: 'conditional', turnStartHealPct: 0.04, note: 'Heal 4% max HP at the start of your turn' }],
    line: 'The dark keeps what is left in it.' },

  // -- Hollow Cantor ---------------------------------------------------- §7.1
  { id: 'last_hymn', name: 'Last Hymn', kind: 'class', cls: 'hollow_cantor',
    effects: [{ op: 'conditional', curseMult: 0.6, curseTurns: 1, note: 'Your Curse reduces damage by 40% and lasts +1 turn' }],
    line: 'The final note is the quiet one.' },
  { id: 'echoing_grief', name: 'Echoing Grief', kind: 'class', cls: 'hollow_cantor',
    effects: [{ op: 'conditional', shadePerDebuff: 0.08, note: '+8% Shade damage per debuff on the target' }],
    line: 'Grief repeats until it is heard.' },
  { id: 'silence', name: 'Silence', kind: 'class', cls: 'hollow_cantor',
    effects: [{ op: 'conditional', hushMod: 3, hushApplyResolve: 1, note: 'Your Hush reduces Resolve gain by 3, and you gain +1 Resolve when you apply it' }],
    line: 'Say nothing. Take everything.' },
];

const STORY_VOWS = [
  // -- §7.2, with the D4 unified naming --------------------------------------
  { id: 'ysoldes_vow', name: "Ysolde's Vow", kind: 'story', cls: 'hollow_cantor', source: 'ch4_devotion',
    effects: [{ op: 'conditional', hushMod: 3, curseTurns: 1, note: 'Hush power +1, Curse lasts +1 turn' }],
    line: 'The Order\'s book, read in a voice that is almost like yours.' },
  { id: 'wardens_oath', name: 'The Warden\'s Oath', kind: 'story', cls: 'gravewarden', source: 'ch4_mercy',
    effects: [{ op: 'conditional', damageTakenMultWhileWarded: 0.5, resolveOnWardBrace: 1, note: 'While you are Braced or Warded, you take 50% less damage and gain 1 Resolve' }],
    line: 'She put the blade down. You promised to remember why.' },
  { id: 'ledgers_price', name: 'Ledger\'s Price', kind: 'story', cls: 'any', source: 'ch5_ruthless',
    effects: [{ op: 'conditional', damageBonusPctVsDebuffs: { minDebuffs: 2, pct: 0.12 } }, { op: 'conditional', resolveCap: 8, note: 'You cannot gain Resolve above 8' }],
    line: 'Signature optional. Payment permanent.' },
  { id: 'grey_duelist', name: 'Grey Duelist', kind: 'story', cls: 'ashblade', source: 'ch5_mercy',
    effects: [{ op: 'crit_mod', critPerBleedStack: 0.01, critPerBleedStackCap: 0.15, note: '+1 crit chance per stack of Bleed on the target, cap +15%' }],
    line: 'He spared you. You fight like the version of him that didn\'t.' },
  { id: 'twelve_tolls', name: 'Twelve Tolls', kind: 'story', cls: 'cinder_witch', source: 'ch6_ruthless',
    effects: [{ op: 'resolve', startBonus: 1, note: '+1 permanent starting Resolve' }, { op: 'dot_mod', kind: 'burn', potencyBonus: 1, note: 'Burn potency +1' }],
    line: 'The furnace keeps its own count.' },
  { id: 'turned_pour', name: 'The Turned Pour', kind: 'story', cls: 'gravewarden', source: 'ch6_devotion',
    effects: [{ op: 'conditional', wardMult: 1.5 }, { op: 'conditional', braceHeal: { base: 2, coefVig: 0.3 }, note: 'Brace also heals 2 + 0.3 VIG' }],
    line: 'The metal remembers being refused.' },
  { id: 'fixed_point', name: 'Fixed Point', kind: 'story', cls: 'any', source: 'ch7_devotion',
    effects: [{ op: 'resolve', startBonus: 1 }, { op: 'conditional', firstBraceFree: true, note: 'Your first Brace each fight is free' }],
    line: 'A name said aloud does not move.' },
  { id: 'no_paper', name: 'No Paper', kind: 'story', cls: 'hollow_cantor', source: 'ch7_mercy',
    effects: [{ op: 'conditional', debuffTurnsBonus: 1 }, { op: 'conditional', cleanseHeal: { base: 5, coefVig: 0.5 }, note: 'Your cleanse also heals 5 + 0.5 VIG' }],
    line: 'What is burned cannot be read back.' },
  { id: 'oren_s_post', name: 'Oren\'s Post', kind: 'story', cls: 'any', source: 'ch8_mercy',
    effects: [{ op: 'conditional', bracePreventsStun: true, note: 'While Braced, you cannot be Stunned' }],
    line: 'She went up first. The stair holds.' },
  { id: 'kept_name', name: 'The Kept Name', kind: 'story', cls: 'any', source: 'ch7_ruthless',
    effects: [{ op: 'conditional', firstDebuffDiscount: 1, note: 'The first debuff you apply each fight costs 1 less Resolve' }],
    line: 'You pocket it. You do not read it. You keep it.' },
  { id: 'long_walk_down', name: 'The Long Walk Down', kind: 'story', cls: 'any', source: 'ch8_devotion',
    effects: [{ op: 'conditional', ignoreFirstStun: true }, { op: 'conditional', tidelineDamageMult: 0.5, note: '50% less damage while under the Tideline' }],
    line: 'Every stair has a bottom. You counted yours.' },
  { id: 'counter_voice', name: 'The Counter-Voice', kind: 'story', cls: 'any', source: 'unmake_ending', hidden: true,
    effects: [{ op: 'conditional', hiddenVersePool: true, note: 'Your Echo fights with a second, hidden verse pool it does not show the opponent (§4.4)' }],
    line: 'There is a second voice. It has been rehearsing.' },
];

const VOWS = [...CLASS_VOWS, ...STORY_VOWS];

const VOW_BY_ID = new Map(VOWS.map((v) => [v.id, v]));

function getVow(id) {
  const v = VOW_BY_ID.get(id);
  if (!v) throw new Error('Unknown vow: ' + id);
  return v;
}

/** Vows a class may pick at creation: its own class vows only (§7 preamble:
 *  "One per build, chosen at creation"). Story vows arrive from choices. */
function creationVowsFor(clazz) {
  return CLASS_VOWS.filter((v) => v.cls === clazz);
}

/** Every vow a class can legally hold this run, given earned story vows.
 *  Hidden vows (Counter-Voice) never appear in pickers — they are bound to
 *  the Echo automatically at the Unmake ending. */
function vowsFor(clazz, earnedStoryIds) {
  const out = CLASS_VOWS.filter((v) => v.cls === clazz);
  for (const id of earnedStoryIds || []) {
    const v = VOW_BY_ID.get(id);
    if (!v) throw new Error('Unknown story vow: ' + id);
    if (v.hidden) continue;
    if (v.cls === 'any' || v.cls === clazz) out.push(v);
  }
  return out;
}


module.exports = { getVow, creationVowsFor, vowsFor, CLASS_VOWS, STORY_VOWS, VOWS, VOW_BY_ID };
