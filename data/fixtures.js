/**
 * fixtures.js — T4.1 fixture mode: a parallel MINIMAL dataset for engine and
 * harness tests. Loads independently of the real content modules (this file
 * imports nothing from data/classes|verses|vows|items — the test suite proves
 * the loader machinery works on this bundle alone).
 *
 * The repo's data/schemas/fixtures.json remains the T0.3 single-row fixtures
 * for the validator negatives; this bundle is the loader-level fixture.
 */

const FIXTURE_CONTENT = {
  version: 1,
  classes: [
    {
      id: 'ashblade', name: 'Fixture Blade (ashblade chassis)', stats: { vig: 6, mig: 8, wit: 2, grd: 4, hst: 7 },
      damageType: 'steel', verses: ['fix_cut', 'fix_brace', 'fix_siphon', 'fix_purge', 'fix_hold', 'fix_surge', 'fix_reap', 'fix_veil', 'fix_last'],
    },
  ],
  verses: [
    { id: 'fix_cut', name: 'Fixture Cut', cls: 'ashblade', unlockLevel: 1, cost: 2, cd: 0,
      effects: [{ op: 'damage', type: 'steel', base: 5, coefs: [{ stat: 'mig', c: 0.9 }] }] },
    { id: 'fix_brace', name: 'Fixture Brace', cls: 'common', unlockLevel: 1, cost: 1, cd: 2,
      effects: [{ op: 'brace' }] },
    { id: 'fix_siphon', name: 'Fixture Siphon', cls: 'ashblade', unlockLevel: 2, cost: 3, cd: 3,
      effects: [{ op: 'damage', type: 'steel', base: 6, coefs: [{ stat: 'mig', c: 0.8 }], lifestealPct: 0.5 }] },
    { id: 'fix_purge', name: 'Fixture Purge', cls: 'common', unlockLevel: 1, cost: 2, cd: 4,
      effects: [{ op: 'cleanse', all: true }] },
    { id: 'fix_hold', name: 'Fixture Hold', cls: 'ashblade', unlockLevel: 3, cost: 2, cd: 2,
      effects: [{ op: 'brace' }, { op: 'heal', base: 3, coefs: [{ stat: 'vig', c: 0.4 }] }] },
    { id: 'fix_surge', name: 'Fixture Surge', cls: 'ashblade', unlockLevel: 4, cost: 3, cd: 2,
      effects: [{ op: 'damage', type: 'steel', base: 8, coefs: [{ stat: 'mig', c: 1.0 }], critBonus: 0.25 }] },
    { id: 'fix_reap', name: 'Fixture Reap', cls: 'ashblade', unlockLevel: 5, cost: 3, cd: 2,
      effects: [{ op: 'damage', type: 'true', base: 4, coefs: [{ stat: 'mig', c: 0.4 }], perBleedStackTrue: true, consumeBleed: true, ignoreMit: true }] },
    { id: 'fix_veil', name: 'Fixture Veil', cls: 'ashblade', unlockLevel: 6, cost: 3, cd: 3,
      effects: [{ op: 'ward', base: 8, coefs: [{ stat: 'wit', c: 0.9 }] }] },
    { id: 'fix_last', name: 'Fixture Last', cls: 'ashblade', unlockLevel: 7, cost: 5, cd: 4,
      effects: [{ op: 'damage', type: 'steel', base: 3, coefs: [{ stat: 'mig', c: 0.45 }], hits: 3 }] },
  ],
  vows: [
    { id: 'fix_vow_red', name: 'Fixture Red', kind: 'class', cls: 'ashblade',
      effects: [{ op: 'conditional', bleedCap: 8, bleedTickBonus: 1, note: 'fixture bleed vow' }] },
    { id: 'fix_vow_story', name: 'Fixture Story', kind: 'story', cls: 'any', source: 'ch1_choice_ruthless',
      effects: [{ op: 'conditional', resolveCap: 8, note: 'fixture story vow' }] },
  ],
  items: [
    { id: 'fix_item_ward', name: 'Fixture Ward', slot: 'vestment', affinity: 'ashblade', stats: { grd: 2 },
      mark: [{ op: 'conditional', fightStart: { ward: 10 }, note: 'fixture start ward' }], source: 'ch1_choice_mercy' },
    { id: 'fix_item_execute', name: 'Fixture Execute', slot: 'weapon', affinity: 'ashblade', stats: { mig: 2 },
      mark: [{ op: 'conditional', damageBonusPct: 0.3, vsHpBelow: 0.35, note: 'fixture execute band' }], source: 'ch1_choice_ruthless' },
  ],
  sources: [
    { id: 'ch1_choice_ruthless', kind: 'choice', chapter: 1, tally: 'ruthless', grants: ['fix_item_execute'], line: 'fixture' },
    { id: 'ch1_choice_mercy', kind: 'choice', chapter: 1, tally: 'mercy', grants: ['fix_item_ward'], line: 'fixture' },
  ],
};

/** Fixture strike row (mirrors the engine's STRIKE contract). */
const FIXTURE_STRIKE = {
  id: 'strike', name: 'Strike', cls: 'common', unlockLevel: 1, cost: 0, cd: 0,
  isStrike: true, slotted: false,
  effects: [{ op: 'damage', type: 'main', base: 2, coefs: [{ stat: 'main', c: 0.4 }], refund: 1 }],
  line: 'Basic attack. Refunds +1 Resolve. Always available.',
};


module.exports = { FIXTURE_CONTENT, FIXTURE_STRIKE };
