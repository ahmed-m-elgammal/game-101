/**
 * named-echoes.js — T4.8: the Choir Floor's parish. [GDD] §9.4.
 *
 * Eight hand-built NPC Echoes (canon rows verbatim: name/class/level/Toll/
 * history/weakness) plus the four Rite-users from T4.7 ([GDD] §9.4 "at
 * release, 4 Rite-users"). 12 rows total — the T7.11 population floor.
 *
 * Builds are PLAYER-legal (the §12.1 Echo shape): creation 4 + levelUps
 * 2×(L−1), every stat ≤ 10 (the N1 validator is strict), verses
 * unlock-legal, class-legal vows. They are validated with the same rules
 * T5.1 will formalize (validateAlloc + unlock/vow checks live in the tests).
 *
 * Weaknesses are REAL mechanical gaps, not labels (the acceptance criterion
 * demands each weakness demonstrably exploitable in a harness test):
 *   Brother Ash    — `special.debuffImmune` (control family ONLY; the canon
 *                    weakness pairs it with "DoT beats him", so bleed/burn
 *                    still land) + an all-in regen kit.
 *   Salt Widow     — no defensive kit at all (no brace/ward/thorns verses,
 *                    no mitigation vow).
 *   Tollward Vane  — HST 6 (loses initiative, crits rarely) + a hush-heavy
 *                    script that opens late.
 *   Sixth Swineherd— zero defensive kit, grd untouched.
 *   Mother Corvane — `special.telegraphCrits`: her crits only land the turn
 *                    AFTER she raises the blade; otherwise never.
 *   Hollow Bishop  — `special.noHeal` (the engine refuses his heals) and no
 *                    heal verses in the pool.
 *   The Unpaid Bell— `special.setupTurns: 3`: no damage verses rounds 1–3.
 *   Widow Sedge    — `special.resolveStealOnHit` + `special.foldBelowHP: 0.3`
 *                    (below 30% HP she folds: damage halved, no attacks).
 */

const NAMED_ECHOES = [
  {
    id: 'brother_ash', name: 'Brother Ash', cls: 'gravewarden', level: 8, toll: 1080,
    history: 'He has not left the Warrens since the Order closed its doors.',
    weakness: 'Cannot be debuffed. Relies entirely on regen — DoT beats him.',
    recasts: 0,
    doctrine: 'bulwark',
    build: {
      name: 'Brother Ash', clazz: 'gravewarden', level: 8,
      creation: { vig: 1, mig: 0, wit: 0, grd: 2, hst: 1 },
      levelUps: { vig: 0, mig: 5, wit: 8, grd: 0, hst: 1 },
      vow: 'long_dark',
      verses: ['mend_the_mortar', 'earthen_toll', 'hold_the_line', 'bulwark_strike'], // no cleanse — the regen must be beatable by DoT (the canon weakness)
      items: [],
      special: { debuffImmune: ['curse', 'fray', 'hush', 'stun'] },
      rite: null, art: 'brother_ash',
    },
    weaknessTest: 'A DoT build beats him at ≥70% while a control build does not.',
  },
  {
    id: 'salt_widow', name: 'The Salt Widow', cls: 'cinder_witch', level: 9, toll: 1240,
    history: 'Burned down a nine-fighter roster in six turns and asked for a rematch.',
    weakness: 'No mitigation at all. Burst kills her before her second cast.',
    recasts: 0,
    doctrine: 'predator',
    build: {
      name: 'The Salt Widow', clazz: 'cinder_witch', level: 9,
      creation: { vig: 0, mig: 1, wit: 1, grd: 0, hst: 2 },
      levelUps: { vig: 5, mig: 7, wit: 0, grd: 4, hst: 0 },
      vow: 'pyre',
      verses: ['conflagration', 'cinderfall', 'spark', 'stoke'],
      items: [],
      rite: null, art: 'salt_widow',
    },
    weaknessTest: 'A burst build beats her at ≥70% before her second cast lands.',
  },
  {
    id: 'tollward_vane', name: 'Tollward Vane', cls: 'hollow_cantor', level: 8, toll: 940,
    history: 'Collects the toll at the Salt Road gate. Has never once been thanked.',
    weakness: 'Slow and low-Haste. Burst before the Hush lands.',
    recasts: 0,
    doctrine: 'hymnal',
    build: {
      name: 'Tollward Vane', clazz: 'hollow_cantor', level: 8,
      creation: { vig: 2, mig: 0, wit: 2, grd: 0, hst: 0 },
      levelUps: { vig: 1, mig: 8, wit: 0, grd: 5, hst: 0 },
      vow: 'silence',
      verses: ['lullaby', 'grave_cadence', 'tolling_bell', 'dissonance'],
      items: [],
      script: ['dissonance', 'lullaby*'],
      rite: null, art: 'tollward_vane',
    },
    weaknessTest: 'He acts last (HST 6) — burst drops him before the lock opens.',
  },
  {
    id: 'sixth_swineherd', name: 'The Sixth Swineherd', cls: 'ashblade', level: 6, toll: 860,
    history: 'A Echo of a man who died mid-fight and won anyway.',
    weakness: 'All-in. Zero defence. He is also very bad.',
    recasts: 0,
    doctrine: 'predator',
    build: {
      name: 'The Sixth Swineherd', clazz: 'ashblade', level: 6,
      creation: { vig: 0, mig: 2, wit: 0, grd: 0, hst: 2 },
      levelUps: { vig: 4, mig: 0, wit: 5, grd: 0, hst: 1 },
      vow: 'duelist',
      verses: ['red_flurry', 'opening_cut', 'rend', 'flay'],
      items: [],
      rite: null, art: 'sixth_swineherd',
    },
    weaknessTest: 'grd 4 + no defensive kit — any burst build eats him alive.',
  },
  {
    id: 'mother_corvane', name: 'Mother Corvane', cls: 'ashblade', level: 8, toll: 1120,
    history: 'Corvane\u2019s mother. Also an Ashblade. The resemblance is the whole joke.',
    weakness: 'Relies on crits; every crit he lands is telegraphed one turn ahead.',
    recasts: 0,
    doctrine: 'predator',
    build: {
      name: 'Mother Corvane', clazz: 'ashblade', level: 8,
      creation: { vig: 0, mig: 1, wit: 0, grd: 0, hst: 3 },
      levelUps: { vig: 4, mig: 1, wit: 3, grd: 6, hst: 0 },
      vow: 'duelist',
      verses: ['red_flurry', 'opening_cut', 'rend', 'flay'],
      items: [],
      special: { telegraphCrits: true },
      rite: null, art: 'mother_corvane',
    },
    weaknessTest: 'Brace/Ward on the telegraph turns; her crit never lands unannounced.',
  },
  {
    id: 'hollow_bishop', name: 'Hollow Bishop', cls: 'gravewarden', level: 8, toll: 980,
    history: 'Refuses to heal. Refuses to be killed. Refuses to explain.',
    weakness: 'Cannot heal. Pure mitigation, so DoT and Fray are the answer.',
    recasts: 0,
    doctrine: 'bulwark',
    build: {
      name: 'Hollow Bishop', clazz: 'gravewarden', level: 8,
      creation: { vig: 1, mig: 0, wit: 0, grd: 2, hst: 1 },
      levelUps: { vig: 0, mig: 5, wit: 8, grd: 0, hst: 1 },
      vow: 'bastion',
      verses: ['bulwark_strike', 'crypt_door', 'stone_vigil', 'sepulchral_spikes'],
      items: [],
      special: { noHeal: true },
      rite: null, art: 'hollow_bishop',
    },
    weaknessTest: 'The engine refuses his heals — bleed/burn tick past the wall.',
  },
  {
    id: 'unpaid_bell', name: 'The Unpaid Bell', cls: 'hollow_cantor', level: 9, toll: 1180,
    history: 'Cast for the Bellfoundry and never paid for. Rings anyway.',
    weakness: 'Needs 3 turns to set up. Burst him in the first two.',
    recasts: 0,
    doctrine: 'hymnal',
    build: {
      name: 'The Unpaid Bell', clazz: 'hollow_cantor', level: 9,
      creation: { vig: 1, mig: 0, wit: 1, grd: 0, hst: 2 },
      levelUps: { vig: 2, mig: 5, wit: 1, grd: 6, hst: 2 },
      vow: 'silence',
      verses: ['dissonance', 'lullaby', 'requiem', 'grave_cadence'],
      items: [],
      special: { setupTurns: 3 },
      rite: null, art: 'unpaid_bell',
    },
    weaknessTest: 'Rounds 1\u20133 his AI refuses damage verses — burst wins the window.',
  },
  {
    id: 'widow_sedge', name: 'Widow Sedge', cls: 'ashblade', level: 7, toll: 1020,
    history: 'Was Sedge\u2019s wife. He did not know she was in the Choir.',
    weakness: 'Steals Resolve but drops below 30% HP and folds.',
    recasts: 0,
    doctrine: 'predator',
    build: {
      name: 'Widow Sedge', clazz: 'ashblade', level: 7,
      creation: { vig: 0, mig: 2, wit: 0, grd: 0, hst: 2 },
      levelUps: { vig: 4, mig: 0, wit: 3, grd: 4, hst: 1 },
      vow: 'duelist',
      verses: ['drink_deep', 'rend', 'opening_cut', 'crimson_waltz'],
      items: [],
      special: { resolveStealOnHit: 1, foldBelowHP: 0.3 },
      rite: null, art: 'widow_sedge',
    },
    weaknessTest: 'Push her under 30%: damage halves and she stops attacking.',
  },
];

/** The 4 Rite-users ([GDD] §9.4, authored per T4.7 — names/lines are the
 *  prose pass; mechanics reuse the rite vocabulary only). */
const RITE_USERS = [
  {
    id: 'preceptor_nill', name: 'Preceptor Nill', cls: 'gravewarden', level: 9, toll: 1320,
    history: 'Taught the Warrens how to stand still. Outlived every lesson she gave.',
    weakness: 'Once committed to the Second Wall she never heals — DoT wins the long grind.',
    recasts: 0,
    doctrine: 'bulwark',
    rite: 'nill_second_wall',
    build: {
      name: 'Preceptor Nill', clazz: 'gravewarden', level: 9,
      creation: { vig: 1, mig: 0, wit: 0, grd: 2, hst: 1 },
      levelUps: { vig: 0, mig: 5, wit: 8, grd: 0, hst: 3 },
      vow: 'bastion',
      verses: ['bulwark_strike', 'crypt_door', 'sepulchral_spikes', 'stone_vigil'],
      items: [],
      rite: 'nill_second_wall', art: 'preceptor_nill',
    },
  },
  {
    id: 'chorister_vey', name: 'Chorister Vey', cls: 'hollow_cantor', level: 8, toll: 1150,
    history: 'Sang the descant at nine drownings. Remembers all of them in tune.',
    weakness: 'Before half she only sings the lock — burst her before the Borrowed Voice.',
    recasts: 0,
    doctrine: 'cantors_hand',
    rite: 'vey_borrowed_voice',
    build: {
      name: 'Chorister Vey', clazz: 'hollow_cantor', level: 8,
      creation: { vig: 2, mig: 0, wit: 2, grd: 0, hst: 0 },
      levelUps: { vig: 1, mig: 5, wit: 0, grd: 6, hst: 2 },
      vow: 'last_hymn',
      verses: ['dirge', 'lullaby', 'dissonance', 'tolling_bell'],
      items: [],
      rite: 'vey_borrowed_voice', art: 'chorister_vey',
    },
  },
  {
    id: 'ash_deacon', name: 'The Ash Deacon', cls: 'cinder_witch', level: 9, toll: 1380,
    history: 'Read the last rites over the Bellfoundry and set the register alight.',
    weakness: 'Ignores defence entirely until the Wake — a squishy first phase.',
    recasts: 0,
    doctrine: 'predator',
    rite: 'deacon_kindle_wake',
    build: {
      name: 'The Ash Deacon', clazz: 'cinder_witch', level: 9,
      creation: { vig: 1, mig: 1, wit: 1, grd: 0, hst: 1 },
      levelUps: { vig: 4, mig: 7, wit: 0, grd: 5, hst: 0 },
      vow: 'kindling',
      verses: ['spark', 'stoke', 'conflagration', 'fan_the_flames'],
      items: [],
      rite: 'deacon_kindle_wake', art: 'ash_deacon',
    },
  },
  {
    id: 'sexton_grave', name: 'Sexton Grave, the Last Bell', cls: 'gravewarden', level: 8, toll: 990,
    history: 'Dug nine hundred graves and lay down in the nine hundred and first.',
    weakness: 'Waits four turns before he tolls — burst the patience.',
    recasts: 0,
    doctrine: 'bulwark',
    rite: 'grave_toll_with_me',
    build: {
      name: 'Sexton Grave, the Last Bell', clazz: 'gravewarden', level: 8,
      creation: { vig: 1, mig: 1, wit: 0, grd: 2, hst: 0 },
      levelUps: { vig: 0, mig: 4, wit: 8, grd: 0, hst: 2 },
      vow: 'thorn_bearer',
      verses: ['hold_the_line', 'stone_vigil', 'crypt_door', 'bulwark_strike'],
      items: [],
      special: { setupTurns: 4 },
      rite: 'grave_toll_with_me', art: 'sexton_grave',
    },
  },
];

/** The T7.11 population floor: 8 named Echoes + 4 Rite-users ≥ 12 rows. */
const FLOOR_POPULATION = [...NAMED_ECHOES, ...RITE_USERS];

const ECHO_BY_ID = new Map(FLOOR_POPULATION.map((e) => [e.id, e]));


module.exports = { NAMED_ECHOES, RITE_USERS, FLOOR_POPULATION, ECHO_BY_ID };
