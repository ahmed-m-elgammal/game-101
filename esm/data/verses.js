/**
 * verses.js — all 42 verses as data. [GDD] §6.1–§6.5.
 * Costs/cooldowns/effects exactly as canon. D17: Vigil's Rest cost 2 (was 3).
 *
 * Effect ops use the T0.3 vocabulary:
 *   damage {type, base, coefs:[{stat,c}], hits?, critBonus?, ignoreMit?,
 *           mitigationFactor?, bonusIfTargetBurning?, perDebuffFlat?,
 *           perDebuffPct?, lifestealPct?, perBleedStackTrue?, consumeBleed?,
 *           perBleedStackIgnoreMit?}
 *   bleed+ {stacks}            burn {potencyBase?, double?, potencyBonus?}
 *   curse {}                   fray {}             hush {}
 *   brace {}                   ward {base, coefs}  thorns {base, coefs}
 *   stun {}                    heal {base, coefs}  resolve {amount}
 *   cleanse {all?|count}       selfTrue {amount}
 *
 * `main` in a coef resolves to the caster's class main stat (Strike rule).
 */

const S = (stat, c) => ({ stat, c });

export const STRIKE = {
  id: 'strike', name: 'Strike', cls: 'common', unlockLevel: 1, cost: 0, cd: 0,
  isStrike: true, slotted: false,
  effects: [{ op: 'damage', type: 'main', base: 2, coefs: [S('main', 0.4)], refund: 1 }],
  line: 'Basic attack. Refunds +1 Resolve. Always available.',
};

export const VERSES = [
  // -- Common hymns (any class) ------------------------------------ §6.1
  { id: 'steady_breath', name: 'Steady Breath', cls: 'common', unlockLevel: 1, cost: 1, cd: 2,
    effects: [{ op: 'brace' }], line: 'Brace.' },
  { id: 'purify', name: 'Purify', cls: 'common', unlockLevel: 1, cost: 2, cd: 4,
    effects: [{ op: 'cleanse', all: true }], line: 'Remove all your debuffs.' },
  { id: 'second_wind', name: 'Second Wind', cls: 'common', unlockLevel: 1, cost: 3, cd: 5,
    effects: [{ op: 'heal', base: 10, coefs: [S('vig', 0.8)] }], line: 'Heal 10 + 0.8 × VIG.' },
  { id: 'vigils_rest', name: "Vigil's Rest", cls: 'common', unlockLevel: 1, cost: 2, cd: 3, tag: 'PROVISIONAL:D17',
    effects: [{ op: 'resolve', amount: 4 }, { op: 'cleanse', count: 1 }],
    line: 'Gain +4 Resolve and remove 1 debuff.' },
  { id: 'stand_fast', name: 'Stand Fast', cls: 'common', unlockLevel: 1, cost: 2, cd: 4,
    effects: [{ op: 'brace' }, { op: 'ward', base: 6, coefs: [] }], line: 'Brace and gain 6 Ward.' },

  // -- Ashblade ----------------------------------------------------- §6.2
  { id: 'rend', name: 'Rend', cls: 'ashblade', unlockLevel: 1, cost: 2, cd: 0,
    effects: [{ op: 'damage', type: 'steel', base: 5, coefs: [S('mig', 0.9)] }, { op: 'bleed+', stacks: 1 }],
    line: 'Steel 5 + 0.9 MIG, +1 Bleed.' },
  { id: 'opening_cut', name: 'Opening Cut', cls: 'ashblade', unlockLevel: 1, cost: 3, cd: 0,
    effects: [{ op: 'damage', type: 'steel', base: 8, coefs: [S('mig', 1.0)], critBonus: 0.25 }],
    line: 'Steel 8 + 1.0 MIG, +25% crit chance.' },
  { id: 'flay', name: 'Flay', cls: 'ashblade', unlockLevel: 1, cost: 4, cd: 0,
    effects: [{ op: 'damage', type: 'steel', base: 4, coefs: [S('mig', 0.6)] }, { op: 'bleed+', stacks: 2 }],
    line: 'Steel 4 + 0.6 MIG, +2 Bleed.' },
  { id: 'drink_deep', name: 'Drink Deep', cls: 'ashblade', unlockLevel: 2, cost: 3, cd: 3,
    effects: [{ op: 'damage', type: 'steel', base: 6, coefs: [S('mig', 0.8)], lifestealPct: 0.5 }],
    line: 'Steel 6 + 0.8 MIG, heal 50% of damage dealt.' },
  { id: 'reap_the_red', name: 'Reap the Red', cls: 'ashblade', unlockLevel: 3, cost: 3, cd: 2,
    effects: [{ op: 'damage', type: 'true', base: 4, coefs: [S('mig', 0.4)], perBleedStackTrue: true, consumeBleed: true, ignoreMit: true }],
    line: 'Remove all Bleed from target, deal 4 + 0.4 MIG per stack (true).' },
  { id: 'slip_the_hymn', name: 'Slip the Hymn', cls: 'ashblade', unlockLevel: 4, cost: 2, cd: 3,
    effects: [{ op: 'brace' }, { op: 'resolve', amount: 1 }], line: 'Brace, gain +1 Resolve.' },
  { id: 'red_flurry', name: 'Red Flurry', cls: 'ashblade', unlockLevel: 5, cost: 5, cd: 0,
    effects: [{ op: 'damage', type: 'steel', base: 3, coefs: [S('mig', 0.45)], hits: 3 }],
    line: 'Three hits of 3 + 0.45 MIG, each rolls crit separately.' },
  { id: 'crimson_waltz', name: 'Crimson Waltz', cls: 'ashblade', unlockLevel: 6, cost: 4, cd: 3,
    effects: [{ op: 'damage', type: 'steel', base: 7, coefs: [S('mig', 0.8)] }, { op: 'bleed+', stacks: 2 },
      { op: 'resolve', amountPerBleedStack: 1 }],
    line: 'Steel 7 + 0.8 MIG, +2 Bleed, +1 Resolve per Bleed stack on the target.' },
  { id: 'blood_ledger', name: 'Blood Ledger', cls: 'ashblade', unlockLevel: 7, cost: 5, cd: 4,
    effects: [{ op: 'damage', type: 'true', base: 5, coefs: [S('mig', 0.5)], perBleedStackIgnoreMit: true, consumeBleed: true }],
    line: 'Deal 5 + 0.5 MIG per Bleed stack, ignoring mitigation; consume all stacks.' },

  // -- Cinder Witch -------------------------------------------------- §6.3
  { id: 'spark', name: 'Spark', cls: 'cinder_witch', unlockLevel: 1, cost: 2, cd: 0,
    effects: [{ op: 'damage', type: 'ember', base: 5, coefs: [S('wit', 0.8)] }, { op: 'burn' }],
    line: 'Ember 5 + 0.8 WIT, applies Burn.' },
  { id: 'cinderfall', name: 'Cinderfall', cls: 'cinder_witch', unlockLevel: 1, cost: 4, cd: 0,
    effects: [{ op: 'damage', type: 'ember', base: 9, coefs: [S('wit', 1.1)] }],
    line: 'Ember 9 + 1.1 WIT.' },
  { id: 'stoke', name: 'Stoke', cls: 'cinder_witch', unlockLevel: 1, cost: 3, cd: 2,
    effects: [{ op: 'burn', double: true }], line: "Double the target's Burn potency (cap 14), refresh duration." },
  { id: 'ashen_veil', name: 'Ashen Veil', cls: 'cinder_witch', unlockLevel: 2, cost: 3, cd: 3,
    effects: [{ op: 'ward', base: 8, coefs: [S('wit', 0.9)] }], line: 'Ward 8 + 0.9 WIT.' },
  { id: 'choking_smoke', name: 'Choking Smoke', cls: 'cinder_witch', unlockLevel: 3, cost: 3, cd: 3,
    effects: [{ op: 'damage', type: 'ember', base: 3, coefs: [S('wit', 0.4)] }, { op: 'hush' }],
    line: 'Ember 3 + 0.4 WIT, Hush.' },
  { id: 'fan_the_flames', name: 'Fan the Flames', cls: 'cinder_witch', unlockLevel: 4, cost: 0, cd: 3,
    effects: [{ op: 'resolve', amount: 4 }, { op: 'selfTrue', amount: 4 }],
    line: 'Gain +4 Resolve, take 4 true damage.' },
  { id: 'conflagration', name: 'Conflagration', cls: 'cinder_witch', unlockLevel: 5, cost: 6, cd: 3,
    effects: [{ op: 'damage', type: 'ember', base: 10, coefs: [S('wit', 1.3)], bonusIfTargetBurning: 0.5 }],
    line: 'Ember 10 + 1.3 WIT, +50% if the target is burning.' },
  { id: 'cinder_shroud', name: 'Cinder Shroud', cls: 'cinder_witch', unlockLevel: 6, cost: 3, cd: 4,
    effects: [{ op: 'ward', base: 10, coefs: [S('wit', 1.0)] }, { op: 'cleanse', count: 1 }],
    line: 'Ward 10 + 1.0 WIT, remove 1 debuff.' },
  { id: 'sear_the_note', name: 'Sear the Note', cls: 'cinder_witch', unlockLevel: 7, cost: 4, cd: 3,
    effects: [{ op: 'damage', type: 'ember', base: 8, coefs: [S('wit', 1.0)], mitigationFactor: 0.5 }, { op: 'burn', potencyBonus: 1 }],
    line: 'Ember 8 + 1.0 WIT, ignores half mitigation, +1 Burn potency.' },

  // -- Gravewarden ---------------------------------------------------- §6.4
  { id: 'bulwark_strike', name: 'Bulwark Strike', cls: 'gravewarden', unlockLevel: 1, cost: 2, cd: 0,
    effects: [{ op: 'damage', type: 'steel', base: 3, coefs: [S('mig', 0.5), S('grd', 0.6)] }],
    line: 'Steel 3 + 0.5 MIG + 0.6 GRD.' },
  { id: 'hold_the_line', name: 'Hold the Line', cls: 'gravewarden', unlockLevel: 1, cost: 2, cd: 2,
    effects: [{ op: 'brace' }, { op: 'heal', base: 3, coefs: [S('vig', 0.4)] }], line: 'Brace, heal 3 + 0.4 VIG.' },
  { id: 'sepulchral_spikes', name: 'Sepulchral Spikes', cls: 'gravewarden', unlockLevel: 1, cost: 3, cd: 0,
    effects: [{ op: 'thorns', base: 4, coefs: [S('grd', 0.2)] }], line: 'Thorns (4 + 0.2 GRD) for 3 turns.' },
  { id: 'gravebind', name: 'Gravebind', cls: 'gravewarden', unlockLevel: 2, cost: 4, cd: 4,
    effects: [{ op: 'damage', type: 'steel', base: 4, coefs: [S('grd', 0.5)] }, { op: 'stun' }],
    line: 'Steel 4 + 0.5 GRD, Stun.' },
  { id: 'mend_the_mortar', name: 'Mend the Mortar', cls: 'gravewarden', unlockLevel: 3, cost: 3, cd: 3,
    effects: [{ op: 'heal', base: 8, coefs: [S('vig', 1.2)] }], line: 'Heal 8 + 1.2 VIG.' },
  { id: 'earthen_toll', name: 'Earthen Toll', cls: 'gravewarden', unlockLevel: 4, cost: 5, cd: 0,
    effects: [{ op: 'damage', type: 'steel', base: 8, coefs: [S('mig', 0.8), S('grd', 0.8)] }, { op: 'fray' }],
    line: 'Steel 8 + 0.8 MIG + 0.8 GRD, Fray.' },
  { id: 'crypt_door', name: 'Crypt Door', cls: 'gravewarden', unlockLevel: 5, cost: 4, cd: 4,
    effects: [{ op: 'ward', base: 10, coefs: [S('grd', 1.2)] }, { op: 'brace' }], line: 'Ward 10 + 1.2 GRD, Brace.' },
  { id: 'stone_vigil', name: 'Stone Vigil', cls: 'gravewarden', unlockLevel: 6, cost: 3, cd: 4,
    effects: [{ op: 'brace' }, { op: 'thorns', base: 4, coefs: [S('grd', 0.2)] }], line: 'Brace and Thorns (4 + 0.2 GRD).' },
  { id: 'last_rites', name: 'Last Rites', cls: 'gravewarden', unlockLevel: 7, cost: 4, cd: 4,
    effects: [{ op: 'heal', base: 10, coefs: [S('vig', 1.0)] }, { op: 'ward', base: 8, coefs: [S('grd', 0.8)] }, { op: 'cleanse', count: 1 }],
    line: 'Heal 10 + 1.0 VIG, gain 8 + 0.8 GRD Ward, remove 1 debuff.' },

  // -- Hollow Cantor -------------------------------------------------- §6.5
  { id: 'dirge', name: 'Dirge', cls: 'hollow_cantor', unlockLevel: 1, cost: 2, cd: 0,
    effects: [{ op: 'damage', type: 'shade', base: 4, coefs: [S('wit', 0.7)] }, { op: 'curse' }],
    line: 'Shade 4 + 0.7 WIT, Curse.' },
  { id: 'wither_note', name: 'Wither Note', cls: 'hollow_cantor', unlockLevel: 1, cost: 3, cd: 0,
    effects: [{ op: 'damage', type: 'shade', base: 6, coefs: [S('wit', 0.8)] }, { op: 'fray' }],
    line: 'Shade 6 + 0.8 WIT, Fray.' },
  { id: 'soul_siphon', name: 'Soul Siphon', cls: 'hollow_cantor', unlockLevel: 1, cost: 3, cd: 2,
    effects: [{ op: 'damage', type: 'shade', base: 5, coefs: [S('wit', 0.7)], lifestealPct: 0.6 }],
    line: 'Shade 5 + 0.7 WIT, heal 60% of damage dealt.' },
  { id: 'tolling_bell', name: 'Tolling Bell', cls: 'hollow_cantor', unlockLevel: 2, cost: 4, cd: 3,
    effects: [{ op: 'damage', type: 'shade', base: 6, coefs: [S('wit', 0.8)] }, { op: 'hush' }],
    line: 'Shade 6 + 0.8 WIT, Hush.' },
  { id: 'dissonance', name: 'Dissonance', cls: 'hollow_cantor', unlockLevel: 3, cost: 3, cd: 3,
    effects: [{ op: 'cleanse', all: true }, { op: 'ward', base: 5, coefs: [S('wit', 0.5)] }],
    line: 'Remove all your debuffs, Ward 5 + 0.5 WIT.' },
  { id: 'lullaby', name: 'Lullaby', cls: 'hollow_cantor', unlockLevel: 4, cost: 4, cd: 4,
    effects: [{ op: 'curse' }, { op: 'hush' }], line: 'Curse and Hush.' },
  { id: 'requiem', name: 'Requiem', cls: 'hollow_cantor', unlockLevel: 5, cost: 6, cd: 3,
    effects: [{ op: 'damage', type: 'shade', base: 12, coefs: [S('wit', 1.2)], perDebuffPct: 0.2 }],
    line: 'Shade 12 + 1.2 WIT, +20% per distinct debuff on the target.' },
  { id: 'grave_cadence', name: 'Grave Cadence', cls: 'hollow_cantor', unlockLevel: 6, cost: 4, cd: 3,
    effects: [{ op: 'damage', type: 'shade', base: 7, coefs: [S('wit', 0.9)] }, { op: 'curse' }, { op: 'hush' }],
    line: 'Shade 7 + 0.9 WIT, Curse and Hush.' },
  { id: 'seventh_verse', name: 'Seventh Verse', cls: 'hollow_cantor', unlockLevel: 7, cost: 6, cd: 4,
    effects: [{ op: 'damage', type: 'shade', base: 10, coefs: [S('wit', 1.1)], perDebuffFlat: 1, perDebuffFlatMax: 4, consumeDebuff: 1 }],
    line: 'Shade 10 + 1.1 WIT, +1 damage per debuff (max +4); consume 1 debuff.' },
];

export const VERSE_BY_ID = (() => {
  const map = new Map();
  map.set(STRIKE.id, STRIKE);
  for (const v of VERSES) map.set(v.id, v);
  return map;
})();

export function getVerse(id) {
  const v = VERSE_BY_ID.get(id);
  if (!v) throw new Error('Unknown verse: ' + id);
  return v;
}

/** Verses available to a class at a given level (for loadout UIs). */
export function poolFor(clazz, level) {
  return VERSES.filter((v) => (v.cls === 'common' || v.cls === clazz) && v.unlockLevel <= level);
}
