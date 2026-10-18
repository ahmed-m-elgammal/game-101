/**
 * sources.js — T4.4/T4.5: the registry every reward `source` string must
 * resolve against ([01] §6 assert 4c: "every Source string resolves").
 * Rewards = items (§8.1–§8.3) + story vows (§7.2).
 *
 * Source kinds:
 *   choice      — a chapter's three-path choice; the tally path is pinned
 *                 where canon pins it (A2/F26: Ch1 Ruthless→Mace, Mercy→Shroud,
 *                 Devotion→Shovel; §7.2 vow rows pin their own tallies)
 *   boss        — a named duel's fixed drop (§8.4: "Campaign fights award
 *                 fixed items")
 *   fixed       — a chapter's fixed campaign drop
 *   vendor      — the Ledger House (D13/D14: 3 fixed items, one memory each)
 *   floor       — the Choir Floor (D15: Drowned Mantle guaranteed first win;
 *                 Salt Widow's Comb from the named Echo)
 *   start       — granted at the game's start (the candle)
 *   exploration — a location drop inside a chapter (Ch4 — Warrens)
 *   ending      — granted by an ending (Unmake → The Counter-Voice)
 */

const SOURCES = [
  // -- Chapter choices (kind: choice) ---------------------------------------
  { id: 'ch1_choice_ruthless', kind: 'choice', chapter: 1, tally: 'ruthless', grants: ['pallbearers_mace'], line: 'Take the Pallbearer\'s Mace. (A2/F26 pin)' },
  { id: 'ch1_choice_mercy', kind: 'choice', chapter: 1, tally: 'mercy', grants: ['sextons_shroud'], line: 'Take the Sexton\'s Shroud. (A2/F26 pin)' },
  { id: 'ch1_choice_devotion', kind: 'choice', chapter: 1, tally: 'devotion', grants: ['grave_shovel_of_bram'], line: 'Burn the hymn-book; the shovel is Bram\'s gift. (A2/F26 pin)' },
  { id: 'ch2_choice', kind: 'choice', chapter: 2, grants: ['bellmetal_maul'], line: '§8.1 pins Bellmetal Maul to "Ch2 choice"; the per-tally pin is T4.11\'s Calendar call.' },
  { id: 'ch3_ruthless', kind: 'choice', chapter: 3, tally: 'ruthless', grants: ['cantors_tuning_fork'], line: 'Finish them. (§3 Ch3: "Ruthless +1 grants Cantor\'s Tuning Fork")' },
  { id: 'ch3_mercy', kind: 'choice', chapter: 3, tally: 'mercy', grants: [], line: 'Let them go — grants +1 free stat point, not an item.' },
  { id: 'ch3_devotion', kind: 'choice', chapter: 3, tally: 'devotion', grants: [], line: 'Learn their song — grants the Twin Ledger (D3), not an item.' },
  { id: 'ch4_ruthless', kind: 'choice', chapter: 4, tally: 'ruthless', grants: ['ysoldes_censer', 'marrow_furnace'], line: '§8.1/§8.3 both pin rewards to Ch4 Ruthless.' },
  { id: 'ch4_mercy', kind: 'choice', chapter: 4, tally: 'mercy', grants: ['wardens_cassock'], line: 'Disarm Ysolde. (§7.2/§8.2)' },
  { id: 'ch4_devotion', kind: 'choice', chapter: 4, tally: 'devotion', grants: [], line: 'Answer Ysolde — grants the story vow Ysolde\'s Vow (§7.2).' },
  { id: 'ch5_ruthless', kind: 'choice', chapter: 5, tally: 'ruthless', grants: ['corvanes_blade'], line: 'Take Corvane\'s contract. (§7.2/§8.1)' },
  { id: 'ch5_mercy', kind: 'choice', chapter: 5, tally: 'mercy', grants: ['corvanes_grey_coat'], line: 'Spare Corvane. (§7.2/§8.3)' },
  { id: 'ch2_market', kind: 'fixed', chapter: 2, grants: ['reliquary_lantern'], line: '§8.3 "Ch2 — market". The Ledger House also stocks it (§8.4). (D13/D14)' },
  { id: 'ch3_market', kind: 'fixed', chapter: 3, grants: ['deaf_wax'], line: '§8.3 "Ch3 — market". "Deaf Wax exists because of" the Brack fight. (§3 Ch3)' },
  { id: 'ch5_market', kind: 'fixed', chapter: 5, grants: ['grey_pilgrims_coat', 'hourglass_of_ash'], line: 'Wick Market. (§8.2/§8.3 "Ch5 — market"); Hourglass also vendor-stocked (§8.4).' },
  { id: 'ch6_ruthless', kind: 'choice', chapter: 6, tally: 'ruthless', grants: [], line: 'Feed the furnace — grants the story vow Twelve Tolls (§7.2).' },
  { id: 'ch6_devotion', kind: 'choice', chapter: 6, tally: 'devotion', grants: [], line: 'Turn the pour — grants the story vow The Turned Pour (§7.2).' },
  { id: 'ch6_compact', kind: 'fixed', chapter: 6, grants: ['founders_chisel', 'cinder_apron', 'founders_leather'], line: 'The Bellfoundry compact items. (§8.1/§8.2 "Ch6 — Compact")' },
  { id: 'ch7_devotion', kind: 'choice', chapter: 7, tally: 'devotion', grants: [], line: 'Read the name aloud — grants the story vow Fixed Point (§7.2).' },
  { id: 'ch7_mercy', kind: 'choice', chapter: 7, tally: 'mercy', grants: [], line: 'Burn the record — grants the story vow No Paper (§7.2).' },
  { id: 'ch7_ruthless', kind: 'choice', chapter: 7, tally: 'ruthless', grants: [], line: 'Take the name and keep it — grants the story vow The Kept Name (D30).' },
  { id: 'ch8_mercy', kind: 'choice', chapter: 8, tally: 'mercy', grants: [], line: 'Send her up first — grants the story vow Oren\'s Post (D4).' },
  { id: 'ch8_devotion', kind: 'choice', chapter: 8, tally: 'devotion', grants: [], line: 'Walk past her — grants the story vow The Long Walk Down (§7.2).' },
  { id: 'ch8_ruthless', kind: 'choice', chapter: 8, tally: 'ruthless', grants: ['vigils_ring', 'vigils_mantle'], line: '§8.2/§8.3 both pin rewards to Ch8 Ruthless.' },

  // -- Boss fixed drops (kind: boss) -----------------------------------------
  { id: 'ch1_boss', kind: 'boss', chapter: 1, grants: ['wick_cutter'], line: 'Bram\'s fixed drop. (§8.1 "Ch1 boss")' },
  { id: 'ch2_boss', kind: 'boss', chapter: 2, grants: ['salt_reapers_scythe', 'tollwards_rod', 'bellmetal_gauntlets'], line: 'Salt Road boss drops. (§8.1/§8.2 "Ch2 boss")' },
  { id: 'ch3_boss', kind: 'boss', chapter: 3, grants: ['tithe_collectors_ledger', 'drowned_choristers_robe'], line: 'First Vespers drops. (§8.2/§8.3 "Ch3 boss")' },
  { id: 'ch6_halbrey', kind: 'boss', chapter: 6, grants: ['rites_of_passage'], line: 'Halbrey\'s signature weapon. (§8.1 "Ch6 — Halbrey")' },
  { id: 'ch6_boss', kind: 'boss', chapter: 6, grants: ['bell_of_nine_tolls'], line: 'Act II boss drop. (§8.3 "Ch6 act boss")' },
  { id: 'ch7_boss', kind: 'boss', chapter: 7, grants: ['orrery_robe'], line: 'Orrery boss drop. (§8.2 "Ch7 boss")' },

  // -- Chapter fixed drops / exploration -------------------------------------
  { id: 'ch4_fixed', kind: 'fixed', chapter: 4, grants: ['thimble_coat'], line: '§8.2 "Ch4" (chapter fixed drop).' },
  { id: 'ch4_warrens', kind: 'exploration', chapter: 4, grants: ['gravedust_censer'], line: '§8.3 "Ch4 — Warrens".' },
  { id: 'ch7_orrery', kind: 'fixed', chapter: 7, grants: ['pale_ash_blade', 'ash_glazed_brass', 'orrery_lens'], line: 'Orrery of Ash drops. (§8.1/§8.2/§8.3 "Ch7 — Orrery")' },
  { id: 'ch8_lower_silence', kind: 'fixed', chapter: 8, grants: ['tide_soaked_vestment', 'leaden_key_of_the_gate'], line: 'Lower Silence drops. (§8.2/§8.3 "Ch8 — Lower Silence")' },
  { id: 'ch9_choir', kind: 'fixed', chapter: 9, grants: ['choir_seal'], line: '§8.3 "Ch9 — Choir".' },
  { id: 'ch1_start', kind: 'start', chapter: 1, grants: ['candle_of_saint_orrin'], line: 'The candle you wake holding. (§8.3 "Ch1 — start", §3 Ch1)' },

  // -- Vendor (kind: vendor) ---------------------------------------------------
  { id: 'vendor_ledger_house', kind: 'vendor', chapter: 5, grants: ['choir_scale_blade'], line: 'Pell sells 3 fixed items (Choir-Scale Blade, Reliquary Lantern, Hourglass of Ash), one memory each; never restocks. (§8.4, D13/D14). Lantern/Hourglass rows keep their §8.3 market sources.' },

  // -- Choir Floor (kind: floor) ------------------------------------------------
  { id: 'floor_first_win', kind: 'floor', chapter: 0, grants: ['drowned_mantle'], line: 'Guaranteed first Floor win. (§8.4, F14/D15)' },
  { id: 'floor_named_echo', kind: 'floor', chapter: 0, grants: ['salt_widows_comb'], line: 'The named Echo\'s toll. (§8.3 "Choir Floor — named Echo")' },

  // -- Endings (kind: ending) ----------------------------------------------------
  { id: 'unmake_ending', kind: 'ending', chapter: 0, grants: [], line: 'Grants the story vow The Counter-Voice (§4.4/§7.2).' },
];

const SOURCE_BY_ID = new Map(SOURCES.map((s) => [s.id, s]));

/** Every id a reward row is allowed to name as its source. */
const SOURCE_IDS = SOURCES.map((s) => s.id);

/** Resolve a source id, throwing on unknowns (reward-integrity assert c). */
function getSource(id) {
  const s = SOURCE_BY_ID.get(id);
  if (!s) throw new Error(`Unknown source id "${id}" — every reward must resolve against data/sources.js`);
  return s;
}


module.exports = { getSource, SOURCES, SOURCE_BY_ID, SOURCE_IDS };
