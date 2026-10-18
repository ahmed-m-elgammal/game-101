/**
 * items.js — T4.5: the hand-written gear library. [GDD] §8.1–§8.3, §8.4.
 * 13 weapons + 13 vestments + 14 relics = **40 items** (D4 cut the duplicate
 * Ysolde's Vow relic row; DECISIONS.md §6 reconciliation; the v1.0.1 §8.3
 * header still reads "Relics (15)" — the count note underneath it says 40,
 * which is the frozen target, tracked by T0.5).
 *
 * Every row: stats (small, ≤3 per stat), exactly ONE mark (op-codes), an
 * affinity ("it fits" rule), and a source that resolves against
 * data/sources.js. NO RANDOM STATS — ever (§8.4).
 *
 * Mark encodings (T0.3 vocabulary; the engine hook each compiles to is in
 * engine/marks.js):
 *   {op:'conditional', fightStart:{ward,resolve,brace}}   — start states
 *   {op:'conditional', damageBonusPct, vsHpBelow/vsHpAbove} — HP-band damage
 *   {op:'conditional', attackerTrueOnHit}                 — flat reflect
 *   {op:'conditional', immune:[...]} / immuneWhileBraced  — immunities
 *   {op:'conditional', turnStartHeal|fatigueReduction|...} — turn economy
 *   {op:'crit_mod', tiers:[{hpAbove, mult}]}              — F28/D31 scaling
 *   {op:'dot_mod', kind:'bleed'|'burn', ...}              — DoT shaping
 *   {op:'mitigation_mod', mitCap}                         — cap raises
 *   {op:'once_per_fight', ...}                            — Candle, Bell of Nine
 *
 * Sources use the tally-pinned id where canon pins it (A2/F26 Ch1; §3 Ch3;
 * §7.2 vow rows) and the chapter-level id otherwise — T4.11's Calendar is
 * the reconciliation pass for the remainder (drift noted in TASKS.md).
 */

export const WEAPONS = [
  { id: 'pallbearers_mace', name: "Pallbearer's Mace", slot: 'weapon', affinity: 'ashblade',
    stats: { mig: 2 },
    mark: [{ op: 'conditional', damageBonusPct: 0.3, vsHpBelow: 0.35, note: '+30% damage against targets under 35% HP' }],
    source: 'ch1_choice_ruthless' },
  { id: 'cantors_tuning_fork', name: "Cantor's Tuning Fork", slot: 'weapon', affinity: 'hollow_cantor',
    stats: { wit: 2 },
    mark: [{ op: 'conditional', onHitHushChance: 0.2, note: 'Direct hits have a 20% chance to Hush' }],
    // (source pinned to the Ch3 choice that canon names it for, §3 Ch3)
    source: 'ch3_ruthless' },
  { id: 'wick_cutter', name: 'Wick-Cutter', slot: 'weapon', affinity: 'ashblade',
    stats: { mig: 1, hst: 1 },
    mark: [{ op: 'dot_mod', kind: 'bleed', firstApplyBonusStacks: 2, note: 'The first Bleed you apply each fight adds +2 stacks' }],
    source: 'ch1_boss' },
  { id: 'grave_shovel_of_bram', name: 'Grave-Shovel of Bram', slot: 'weapon', affinity: 'gravewarden',
    stats: { grd: 2 },
    mark: [{ op: 'conditional', fightStart: { brace: true }, note: 'Start each fight with Brace' }],
    source: 'ch1_choice_devotion' },
  { id: 'rites_of_passage', name: 'Rites of Passage', slot: 'weapon', affinity: 'ashblade',
    stats: { mig: 1, wit: 1 },
    mark: [{ op: 'once_per_fight', transform: { damageType: 'ember', damageBonusPct: 0.2, turns: 2 }, wire: 'T5.4', note: 'Once per fight, become Ember and gain +20% damage for 2 turns' }],
    source: 'ch6_halbrey' },
  { id: 'corvanes_blade', name: "Corvane's Blade", slot: 'weapon', affinity: 'ashblade',
    stats: { mig: 3 },
    mark: [{ op: 'crit_mod', tiers: [{ hpAbove: 0.5, mult: 1.6 }, { hpAbove: 0.25, mult: 1.8 }, { hpAbove: 0, mult: 2.0 }], note: 'Crits deal ×1.6; below 50% HP ×1.8, below 25% ×2.0 (F28/D31)' }],
    source: 'ch5_ruthless' },
  { id: 'salt_reapers_scythe', name: "Salt-Reaper's Scythe", slot: 'weapon', affinity: 'ashblade',
    stats: { mig: 2, hst: 1 },
    mark: [{ op: 'dot_mod', kind: 'bleed', firstHitBonusStacks: 2, note: 'The first hit each fight applies +2 Bleed' }],
    source: 'ch2_boss' },
  { id: 'bellmetal_maul', name: 'Bellmetal Maul', slot: 'weapon', affinity: 'gravewarden',
    stats: { grd: 1, hst: 1 },
    mark: [{ op: 'conditional', braceGrantsWard: 4, note: 'Brace also grants 4 Ward' }],
    source: 'ch2_choice' },
  { id: 'ysoldes_censer', name: "Ysolde's Censer", slot: 'weapon', affinity: 'cinder_witch',
    stats: { wit: 1 },
    mark: [{ op: 'dot_mod', kind: 'burn', potencyBonus: 2, selfTickDamage: 1, note: 'Burn potency +2; your Burn ticks deal 1 damage to you' }],
    source: 'ch4_ruthless' },
  { id: 'choir_scale_blade', name: 'Choir-Scale Blade', slot: 'weapon', affinity: 'any',
    stats: { mig: 2 },
    mark: [{ op: 'conditional', damagePerDebuffFlat: 1, note: '+1 damage for each debuff on the target' }],
    source: 'vendor_ledger_house' },
  { id: 'tollwards_rod', name: "Tollward's Rod", slot: 'weapon', affinity: 'hollow_cantor',
    stats: { wit: 1, hst: 1 },
    mark: [{ op: 'conditional', hushModOverride: 3, note: 'Your Hush reduces Resolve gain by 3 instead of 2' }],
    source: 'ch2_boss' },
  { id: 'founders_chisel', name: "Founder's Chisel", slot: 'weapon', affinity: 'gravewarden',
    stats: { grd: 2 },
    mark: [{ op: 'conditional', thornsReflectBonusPct: 0.5, note: 'Your Thorns reflect +50% of the damage that triggered them' }],
    source: 'ch6_compact' },
  { id: 'pale_ash_blade', name: 'Pale Ash Blade', slot: 'weapon', affinity: 'any',
    stats: { mig: 1, wit: 1, hst: 1 },
    mark: [{ op: 'conditional', damageBonusPct: 0.1, vsHpAbove: 0.8, note: '+10% damage against targets above 80% HP' }],
    source: 'ch7_orrery' },
];

export const VESTMENTS = [
  { id: 'sextons_shroud', name: "Sexton's Shroud", slot: 'vestment', affinity: 'gravewarden',
    stats: { grd: 2 },
    mark: [{ op: 'conditional', fightStart: { ward: 10 }, note: 'Start each fight with 10 Ward' }],
    source: 'ch1_choice_mercy' },
  { id: 'drowned_mantle', name: 'Drowned Mantle', slot: 'vestment', affinity: 'any',
    stats: { vig: 2 },
    mark: [{ op: 'conditional', turnStartHeal: 3, note: 'Heal 3 at the start of your turn' }],
    source: 'floor_first_win' },
  { id: 'bellmetal_gauntlets', name: 'Bellmetal Gauntlets', slot: 'vestment', affinity: 'gravewarden',
    stats: { mig: 1, grd: 1 },
    mark: [{ op: 'conditional', attackerTrueOnHit: 3, note: 'Attackers take 3 true damage when they hit you' }],
    source: 'ch2_boss' },
  { id: 'orrery_robe', name: 'Orrery Robe', slot: 'vestment', affinity: 'hollow_cantor',
    stats: { wit: 1, hst: 1 },
    mark: [{ op: 'conditional', hushTurnsBonus: 1, note: 'Hush you apply lasts +1 turn' }],
    source: 'ch7_boss' },
  { id: 'thimble_coat', name: 'Thimble Coat', slot: 'vestment', affinity: 'any',
    stats: { vig: 2 },
    mark: [{ op: 'conditional', fatigueReduction: 2, note: 'Take 2 less Fatigue damage per round' }],
    source: 'ch4_fixed' },
  { id: 'wardens_cassock', name: "Warden's Cassock", slot: 'vestment', affinity: 'gravewarden',
    stats: { grd: 2, vig: 1 },
    mark: [{ op: 'conditional', braceTurnsBonus: 1, note: 'Brace lasts 1 extra turn' }],
    source: 'ch4_mercy' },
  { id: 'cinder_apron', name: 'Cinder Apron', slot: 'vestment', affinity: 'cinder_witch',
    stats: { wit: 1, vig: 1 },
    mark: [{ op: 'dot_mod', kind: 'burn', turnsBonus: 1, note: 'Burn you apply lasts +1 turn' }],
    source: 'ch6_compact' },
  { id: 'tide_soaked_vestment', name: 'Tide-Soaked Vestment', slot: 'vestment', affinity: 'any',
    stats: { vig: 2 },
    mark: [{ op: 'conditional', immune: ['burn'], note: 'Immune to Burn' }],
    source: 'ch8_lower_silence' },
  { id: 'grey_pilgrims_coat', name: "Grey Pilgrim's Coat", slot: 'vestment', affinity: 'any',
    stats: { hst: 1, grd: 1 },
    mark: [{ op: 'conditional', fightStart: { resolve: 1 }, note: 'Start each fight with +1 Resolve' }],
    source: 'ch5_market' },
  { id: 'founders_leather', name: "Founder's Leather", slot: 'vestment', affinity: 'gravewarden',
    stats: { grd: 1, hst: 1 },
    mark: [{ op: 'conditional', wardDotAbsorb: 1, note: 'Ward also absorbs 1 damage from each DoT tick' }],
    source: 'ch6_compact' },
  { id: 'drowned_choristers_robe', name: "Drowned Chorister's Robe", slot: 'vestment', affinity: 'hollow_cantor',
    stats: { wit: 1, vig: 1 },
    mark: [{ op: 'conditional', resolveOnHushApply: 2, note: 'You gain +2 Resolve whenever you apply Hush' }],
    source: 'ch3_boss' },
  { id: 'ash_glazed_brass', name: 'Ash-Glazed Brass', slot: 'vestment', affinity: 'gravewarden',
    stats: { grd: 1, wit: 1 },
    mark: [{ op: 'mitigation_mod', mitCap: 0.7, note: 'Your mitigation cap is raised to 70%' }],
    source: 'ch7_orrery' },
  { id: 'vigils_mantle', name: "Vigil's Mantle", slot: 'vestment', affinity: 'gravewarden',
    stats: { grd: 2 },
    mark: [{ op: 'conditional', fightStart: { ward: 8, brace: true }, note: 'Start each fight with 8 Ward and Brace' }],
    source: 'ch8_ruthless' },
];

export const RELICS = [
  { id: 'reliquary_lantern', name: 'Reliquary Lantern', slot: 'relic', affinity: 'cinder_witch',
    stats: { wit: 2 },
    mark: [{ op: 'dot_mod', kind: 'burn', potencyBonus: 1, note: 'Burn potency +1' }],
    source: 'ch2_market' }, // §8.3 row source; also vendor-stocked (§8.4)
  { id: 'deaf_wax', name: 'Deaf Wax', slot: 'relic', affinity: 'any',
    stats: { grd: 1 },
    mark: [{ op: 'conditional', immune: ['hush', 'stun'], note: 'Immune to Hush and Stun' }],
    source: 'ch3_market' },
  { id: 'candle_of_saint_orrin', name: 'Candle of Saint Orrin', slot: 'relic', affinity: 'any',
    stats: { vig: 2 },
    mark: [{ op: 'once_per_fight', surviveLethalAt: 1, note: 'Once per fight, survive a lethal hit at 1 HP (deterministic — first lethal hit only)' }],
    source: 'ch1_start' },
  { id: 'gravedust_censer', name: 'Gravedust Censer', slot: 'relic', affinity: 'hollow_cantor',
    stats: { wit: 1 },
    mark: [{ op: 'conditional', curseMultOverride: 0.65, note: 'Your Curse is 35% instead of 25%' }],
    source: 'ch4_warrens' },
  { id: 'hourglass_of_ash', name: 'Hourglass of Ash', slot: 'relic', affinity: 'any',
    stats: { hst: 2 },
    mark: [{ op: 'conditional', fightStart: { resolve: 1 }, note: '+1 starting Resolve' }],
    source: 'ch5_market' }, // §8.3 row source; also vendor-stocked (§8.4)
  { id: 'tithe_collectors_ledger', name: "Tithe-Collector's Ledger", slot: 'relic', affinity: 'any',
    stats: { hst: 1 },
    mark: [{ op: 'conditional', damageBonusPct: 0.1, note: '+10% damage' }],
    source: 'ch3_boss' },
  { id: 'marrow_furnace', name: 'Marrow-Furnace', slot: 'relic', affinity: 'ashblade',
    stats: { vig: 2 },
    mark: [{ op: 'conditional', bleedCap: 7, note: 'Bleed stacks to 7 instead of 5' }],
    source: 'ch4_ruthless' },
  { id: 'bell_of_nine_tolls', name: 'Bell of Nine Tolls', slot: 'relic', affinity: 'any',
    stats: { hst: 1 },
    mark: [{ op: 'once_per_fight', atRound: 3, grant: { resolve: 3, brace: true }, note: 'At the start of round 3, gain 3 Resolve and Brace' }],
    source: 'ch6_boss' },
  { id: 'vigils_ring', name: "Vigil's Ring", slot: 'relic', affinity: 'gravewarden',
    stats: { grd: 3 },
    mark: [{ op: 'conditional', braceCostsZero: true, note: 'Brace costs 0 Resolve' }],
    source: 'ch8_ruthless' },
  { id: 'orrery_lens', name: 'Orrery Lens', slot: 'relic', affinity: 'any',
    stats: { wit: 1, hst: 1 },
    mark: [{ op: 'conditional', secondCastDiscount: 1, note: 'The second cast of each verse costs 1 less Resolve' }],
    source: 'ch7_orrery' },
  { id: 'corvanes_grey_coat', name: "Corvane's Grey Coat", slot: 'relic', affinity: 'any',
    stats: { hst: 1, grd: 1 },
    mark: [{ op: 'conditional', fightStart: { ward: 6 }, immuneWhileBraced: ['hush'], note: 'Start each fight with 6 Ward; immune to Hush while Braced' }],
    source: 'ch5_mercy' },
  { id: 'salt_widows_comb', name: "Salt Widow's Comb", slot: 'relic', affinity: 'any',
    stats: { hst: 1, wit: 1 },
    mark: [{ op: 'conditional', winTieFlips: true, note: 'You win all turn-order ties' }],
    source: 'floor_named_echo' },
  { id: 'choir_seal', name: 'Choir-Seal', slot: 'relic', affinity: 'hollow_cantor',
    stats: { wit: 2 },
    mark: [{ op: 'conditional', hushCritReduction: 0.1, note: 'Hush you apply also reduces the target\'s crit chance by 10%' }],
    source: 'ch9_choir' },
  { id: 'leaden_key_of_the_gate', name: 'Leaden Key of the Gate', slot: 'relic', affinity: 'any',
    stats: { vig: 1, grd: 1 },
    mark: [{ op: 'conditional', fightStart: { ward: 10, resolve: 1 }, note: 'Start each fight with 10 Ward and +1 Resolve' }],
    source: 'ch8_lower_silence' },
];

export const ITEMS = [...WEAPONS, ...VESTMENTS, ...RELICS];

export const ITEM_BY_ID = new Map(ITEMS.map((i) => [i.id, i]));

export function getItem(id) {
  const it = ITEM_BY_ID.get(id);
  if (!it) throw new Error('Unknown item: ' + id);
  return it;
}

/** Gear grouped for pickers/Codex. */
export function itemsBySlot() {
  return { weapon: WEAPONS, vestment: VESTMENTS, relic: RELICS };
}

/** Items whose affinity favours a class ("it fits" rule, ≥5 per class — T0.5). */
export function affinityCount(clazz) {
  return ITEMS.filter((i) => i.affinity === clazz).length;
}
