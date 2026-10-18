// phase4-progression.test.js — T4.9 (Corvane counterbuild + D11 lock),
// T4.10 (XP economy, role map, the campaign walk, D1 target), T4.11 (the
// Vigil's Calendar byte-diff). Sources: [GDD] §9.2 counter table, §13;
// [01] R1/R2/R8/R9; D11; A3; N2; N11 (the walk-table erratum finding).
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const { CANON } = require('../data/config.js');
const T = CANON;
const {
  COUNTER_RULES, NEUTRAL_LINE, detectLean, corvaneCounterbuild, corvaneSheet,
  buildStringOf, CORVANE_SHEET_IDS,
} = require('../data/corvane.js');
const {
  XP_THRESHOLDS, XP_ROLES, FIGHT_ROLES, CHAPTER_FIGHTS, xpForFight, levelForXp,
  floorXp, FLOOR_FIRST_BIND_XP, FLOOR_FIRST_IMPORT_XP, campaignWalk,
  statPointsForLevel, CAMPAIGN_TARGET_LINE,
} = require('../data/progression.js');
const { ENEMIES } = require('../data/enemies.js');
const { buildSheet } = require('../engine/fighter.js');
const { runFight } = require('../engine/fight.js');

// ---------------------------------------------------------------------------
// T4.9 — the counterbuild
// ---------------------------------------------------------------------------
// Legal L5 probe builds (creation 4 + levelUps 8, N1 strict) — each leaning
// hard on one axis via verses + vow + marks, exactly what the Reading sees.
const LEAN_BUILDS = {
  bleed: { name: 'bleed lean', clazz: 'ashblade', level: 5, creation: { mig: 2, hst: 2 }, levelUps: { vig: 3, grd: 4, hst: 1 }, vow: 'red_tide', verses: ['rend', 'flay', 'reap_the_red', 'blood_ledger'], items: [] },
  burn: { name: 'burn lean', clazz: 'cinder_witch', level: 5, creation: { vig: 1, wit: 1, hst: 2 }, levelUps: { vig: 2, mig: 2, grd: 4 }, vow: 'slow_ash', verses: ['spark', 'stoke', 'conflagration', 'sear_the_note'], items: [] },
  tank: { name: 'tank lean', clazz: 'gravewarden', level: 5, creation: { vig: 1, grd: 2, hst: 1 }, levelUps: { mig: 5, wit: 2, hst: 1 }, vow: 'bastion', verses: ['hold_the_line', 'crypt_door', 'stone_vigil', 'sepulchral_spikes'], items: ['ash_glazed_brass'] },
  debuff: { name: 'debuff lean', clazz: 'hollow_cantor', level: 5, creation: { vig: 2, wit: 2 }, levelUps: { vig: 1, grd: 4, hst: 3 }, vow: 'silence', verses: ['dirge', 'lullaby', 'grave_cadence', 'tolling_bell'], items: [] },
  crit: { name: 'crit lean', clazz: 'ashblade', level: 5, creation: { mig: 2, hst: 2 }, levelUps: { vig: 3, grd: 4, hst: 1 }, vow: 'duelist', verses: ['opening_cut', 'red_flurry', 'rend', 'flay'], items: ['corvanes_blade'] },
  drain: { name: 'drain lean', clazz: 'ashblade', level: 5, creation: { mig: 2, hst: 2 }, levelUps: { vig: 3, grd: 4, hst: 1 }, vow: 'hunger', verses: ['drink_deep', 'rend', 'flay', 'opening_cut'], items: ['marrow_furnace'] },
  // nothing the tag table knows: sustain commons + purify only
  neutral: { name: 'odd duck', clazz: 'hollow_cantor', level: 5, creation: { vig: 2, wit: 2 }, levelUps: { vig: 1, grd: 4, hst: 3 }, vow: null, verses: ['second_wind', 'vigils_rest', 'purify', 'slip_the_hymn'], items: [] },
};

test('T4.9: the six lean tags detect from slotted verses + vow + marks', () => {
  for (const [lean, build] of Object.entries(LEAN_BUILDS)) {
    const got = detectLean(build);
    assert.strictEqual(got.lean, lean, `${lean} build detected as ${got.lean} (${JSON.stringify(got.weights)})`);
  }
});

test('T4.9: each counterbuild sheet is a real, budget-conformant, fight-legal L7 build', () => {
  assert.strictEqual(CORVANE_SHEET_IDS.length, 10, '6 counter sheets + 4 neutral');
  for (const id of CORVANE_SHEET_IDS) {
    const sheet = corvaneSheet(id);
    const built = buildSheet(sheet, T);
    assert.strictEqual(built.level, 7);
    const sum = Object.values(built.stats).reduce((a, b) => a + b, 0);
    assert.strictEqual(sum, 45, `${id} at budget(7)`);
    assert.ok(sheet.verses.length === 4, `${id} slots 4 verses`);
  }
});

test('T4.9: D11 lock — identical build → identical counterbuild across 20 retries (farm-exploit dead)', () => {
  const build = LEAN_BUILDS.bleed;
  const first = corvaneCounterbuild(build, 5);
  for (let i = 0; i < 20; i++) {
    const again = corvaneCounterbuild(build, 5);
    assert.strictEqual(again.sheetId, first.sheetId, `retry ${i}: the counter did not move`);
    assert.strictEqual(JSON.stringify(again.sheet), JSON.stringify(first.sheet));
  }
  // reshaping AFTER the chapter-start snapshot does not re-pick either: the
  // seed is the snapshot string, so the same snapshot always answers the same.
  const reshaped = { ...build, verses: ['rend', 'flay', 'opening_cut', 'red_flurry'] };
  assert.notStrictEqual(buildStringOf(build), buildStringOf(reshaped), 'a reshape is a new snapshot');
});

test('T4.9: each counterbuild fights its targeted lean honestly (canon "why it hurts")', () => {
  // Purify deletes the bleed investment: the cantor-lock sheet carries purify.
  const sheet = corvaneCounterbuild(LEAN_BUILDS.bleed, 5);
  assert.strictEqual(sheet.sheetId, 'corvane_cantor_lock');
  assert.ok(sheet.sheet.verses.includes('purify'), 'Purify deletes the entire investment');
  assert.ok(sheet.fired.why.length > 10, 'the counter-table row carries its why');
  // the sheets are fightable
  for (const [lean, build] of Object.entries(LEAN_BUILDS)) {
    const pick = corvaneCounterbuild(build, 5);
    const r = runFight(build, pick.sheet, { tuning: T, seed: 1, silent: true });
    assert.ok(r.over && r.rounds <= 20, `${lean} counter resolves`);
  }
});

test('T4.9: unrecognised builds draw a seeded neutral pick; the announcement is canon', () => {
  const pick = corvaneCounterbuild(LEAN_BUILDS.neutral, 5);
  assert.strictEqual(pick.lean, 'neutral');
  assert.ok(pick.sheetId.startsWith('corvane_neutral_'));
  assert.strictEqual(pick.announce, 'Corvane has watched you fight. He has brought something that answers it.');
  assert.match(pick.revealLine, /gift/, 'the neutral reveal is its own line');
  assert.strictEqual(pick.fired.label, 'Unrecognised build');
  // deterministic neutral pick
  const again = corvaneCounterbuild(LEAN_BUILDS.neutral, 5);
  assert.strictEqual(again.sheetId, pick.sheetId);
});

// ---------------------------------------------------------------------------
// T4.10 — the XP economy
// ---------------------------------------------------------------------------
test('T4.10: canon thresholds verbatim (§13)', () => {
  assert.deepStrictEqual(XP_THRESHOLDS, [0, 40, 100, 180, 280, 400, 540, 700, 880, 1080]);
  assert.deepStrictEqual(Object.fromEntries(Object.entries(XP_ROLES).map(([k, v]) => [k, v.mult])),
    { regular: 1.0, complication: 1.25, boss: 1.75 });
});

test('T4.10: the formula round((10+4L)×role) matches [01] R1\u2019s published examples', () => {
  assert.strictEqual(xpForFight(1, 'regular'), 14);
  assert.strictEqual(xpForFight(2, 'boss'), 32);
  assert.strictEqual(xpForFight(6, 'complication'), 43);
  assert.strictEqual(xpForFight(7, 'boss'), 67);
  assert.strictEqual(xpForFight(8, 'boss'), 74);
  assert.strictEqual(xpForFight(10, 'boss'), 88);
  assert.strictEqual(xpForFight(10, 'complication'), 63);
});

test('T4.10: the role map covers 21/21 fights with the A3 shape', () => {
  assert.strictEqual(Object.keys(FIGHT_ROLES).length, 21);
  assert.strictEqual(Object.keys(FIGHT_ROLES).length, ENEMIES.length);
  for (const [id, role] of Object.entries(FIGHT_ROLES)) {
    assert.ok(ENEMIES.some((e) => e.id === id), `${id} is a real duel`);
    assert.ok(['regular', 'complication', 'boss'].includes(role));
  }
  // A3: second slot of 2-fight chapters = boss; middle of 3-fight = complication
  for (const fights of CHAPTER_FIGHTS) {
    if (fights.length === 2) assert.strictEqual(FIGHT_ROLES[fights[1]], 'boss', `${fights[1]} second of two`);
    if (fights.length === 3) {
      assert.strictEqual(FIGHT_ROLES[fights[1]], 'complication', `${fights[1]} middle of three`);
      assert.strictEqual(FIGHT_ROLES[fights[2]], 'boss', `${fights[2]} closes the chapter`);
    }
  }
  assert.strictEqual(FIGHT_ROLES.first_vespers, 'boss');
  assert.strictEqual(FIGHT_ROLES.mother_bell, 'boss');
  assert.strictEqual(FIGHT_ROLES.ilvane, 'boss');
});

test('T4.10: the nine-chapter walk — every arrival level matches [01] R1\u2019s column (N11 recorded)', () => {
  const walk = campaignWalk();
  // Under the implemented formula the arrivals match the walk's level column
  // EXCEPT Ch4: the +15 of N11 crosses the 280 threshold (291 → L5), which is
  // still inside Ch4's L4–5 act band — the design promise ("every chapter
  // inside its band") holds everywhere.
  const expectedLevelsAfter = [2, 3, 5, 5, 6, 7, 8, 9, 10];
  const BANDS = { 1: [1, 2], 2: [2, 3], 3: [3, 4], 4: [4, 5], 5: [5, 6], 6: [6, 7], 7: [7, 8], 8: [8, 9], 9: [9, 10] };
  walk.forEach((row, i) => {
    assert.strictEqual(row.levelAfter, expectedLevelsAfter[i],
      `ch${row.chapter}: cumulative ${row.cumulative} → L${row.levelAfter} (expected L${expectedLevelsAfter[i]})`);
    // the band for chapter N governs the level you ARRIVE at it: the
    // cumulative after the previous chapter (creation starts at L1).
    const arrival = row.chapter === 1 ? 1 : walk[row.chapter - 2].levelAfter;
    const [lo, hi] = BANDS[row.chapter];
    assert.ok(arrival >= lo && arrival <= hi,
      `ch${row.chapter} arrival L${arrival} inside its act band ${lo}-${hi}`);
  });
  // N11: the formula reading vs the walk table's printed per-fight slips —
  // the deltas are +13 on the Reaper row and +1 on each 66.5 rounding.
  // Recorded in docs/DECISIONS.md; the erratum is the doc's, not the
  // implementation's, and every act band still fits.
  const ch2 = walk[1];
  assert.strictEqual(ch2.fights[1].xp, 53, 'Reaper L5 boss pays 53 by the formula (table printed 40 — N11)');
  assert.strictEqual(ch2.chapterTotal, 89);
  // the D1 promise holds either way
  assert.ok(walk[7].cumulative >= XP_THRESHOLDS[8], 'L9 by the Bellmouth (Ch8 arrival)');
  assert.ok(walk[8].cumulative >= XP_THRESHOLDS[9], 'L10 crossed on Ilvane\u2019s corpse');
  assert.strictEqual(CAMPAIGN_TARGET_LINE,
    'The campaign naturally delivers L9 by the Bellmouth; the finale crosses into L10.');
});

test('T4.10: stat points 4 at creation, +2 per level, cap 10 (§13)', () => {
  assert.strictEqual(statPointsForLevel(1), 4);
  assert.strictEqual(statPointsForLevel(10), 22);
  assert.throws(() => statPointsForLevel(11));
  assert.strictEqual(levelForXp(0), 1);
  assert.strictEqual(levelForXp(39), 1);
  assert.strictEqual(levelForXp(40), 2);
  assert.strictEqual(levelForXp(1079), 9);
  assert.strictEqual(levelForXp(1080), 10);
});

test('T4.10: Floor XP — first win 8+2L, repeats 50% (min 4), 25% under-level, onboarding pays once', () => {
  assert.strictEqual(floorXp(8, 8), 24);            // 8 + 2×8 first win
  assert.strictEqual(floorXp(8, 8, { repeat: true }), 12); // 50%
  assert.strictEqual(floorXp(2, 8), 4, 'level(O)=2 ≤ 8−2 → 25% of 12 = 3, floored at 4');
  assert.strictEqual(floorXp(9, 9, { repeat: true }), 13); // 26 → 13
  assert.strictEqual(FLOOR_FIRST_BIND_XP, 15);
  assert.strictEqual(FLOOR_FIRST_IMPORT_XP, 10);
});

// ---------------------------------------------------------------------------
// T4.11 — the Vigil's Calendar
// ---------------------------------------------------------------------------
test('T4.11: the generated Calendar is byte-identical to the tables (the R9 audit artifact)', () => {
  const { execFileSync } = require('node:child_process');
  execFileSync('node', [path.join(__dirname, '..', 'tools', 'calendar.js'), '--check']);
  const cal = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'calendar.json'), 'utf8'));
  assert.strictEqual(cal.chapters.length, 9);
  // F26/A2: the Ch1 mapping row is explicit — Ruthless→Mace, Mercy→Shroud, Devotion→Shovel
  const ch1 = Object.fromEntries(cal.chapters[0].choiceRewards.map((r) => [r.tally, r.rewards.map((x) => x.id)]));
  assert.deepStrictEqual(ch1.ruthless, ['pallbearers_mace']);
  assert.deepStrictEqual(ch1.mercy, ['sextons_shroud']);
  assert.deepStrictEqual(ch1.devotion, ['grave_shovel_of_bram']);
  // every chapter row carries all reward columns
  for (const ch of cal.chapters) {
    for (const col of ['fights', 'versesUnlocked', 'itemsSourced', 'vowsEarned', 'systemsOpened', 'choiceRewards']) {
      assert.ok(Array.isArray(ch[col]), `ch${ch.chapter}.${col}`);
    }
    assert.strictEqual(ch.fights.length, CHAPTER_FIGHTS[ch.chapter - 1].length);
    for (const f of ch.fights) {
      const row = ENEMIES.find((e) => e.id === f.id);
      assert.strictEqual(f.xp, xpForFight(row.level, FIGHT_ROLES[f.id]));
    }
  }
  // every item source resolves into exactly one chapter row (the R9 audit)
  const { ITEMS } = require('../data/items.js');
  const { SOURCES } = require('../data/sources.js');
  const calItems = cal.chapters.flatMap((c) => c.itemsSourced.map((i) => i.id));
  for (const item of ITEMS) {
    const src = SOURCES.find((s) => (s.grants || []).includes(item.id));
    assert.ok(src, `${item.id} has a source`);
    if (src.kind !== 'start' && src.chapter >= 1) {
      assert.ok(calItems.includes(item.id), `${item.id} appears in the calendar`);
    }
  }
});
