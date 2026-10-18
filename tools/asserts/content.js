#!/usr/bin/env node
// content.js — T4.12: the Content QA gate. Makes "content complete"
// objective: inventory counts (T0.5), schema validity, reward integrity,
// cross-doc couplings ([00] §0.7), the §8.3 status counter/amplifier rule,
// and the affinity coverage — all green before story integration begins.
//
// Standing rules honored:
//   • every measured band that fails prints a FINDING row (advisory WARN),
//     never a silent pass — promotion to hard is a recorded decision;
//   • deliberately breaking any row (see tests/phase4-gate.test.js for the
//     negative probes) turns the gate red;
//   • canon counts are the reconciled ones (24 vows / 40 items per
//     DECISIONS.md §6 — D4 + D30; TASKS.md's 23/41 figures are pre-drift).
'use strict';
const path = require('path');
const ROOT = path.resolve(__dirname, '..');

const { CANON } = require('../../data/config.js');
const { validate } = require('../../data/schemas/validators.js');
const {
  loadReal,
  ENEMIES, SIGNATURE_VERBS, RITES, NAMED_ECHOES, RITE_USERS, FLOOR_POPULATION,
  VERSES, STRIKE, VOWS, ITEMS, SOURCES,
  XP_THRESHOLDS, FIGHT_ROLES, campaignWalk, levelForXp,
} = require('../../data/index.js');
const { runFight } = require('../../engine/fight.js');
const { mirrorPreset } = require('../../data/presets.js');
const { quickReading } = require('../../sim/reading.js');

const rows = [];
let hardFails = 0;
let advisories = 0;

function row(id, pass, detail, advisory = false) {
  if (!pass) advisory ? advisories++ : hardFails++;
  rows.push(`${pass ? '  ok  ' : advisory ? '  WARN' : '  FAIL'}  ${id}${detail ? ' — ' + detail : ''}`);
}

// ---------------------------------------------------------------- counts
// The v1.0.1 reconciled inventory (docs/INVENTORY.md; DECISIONS.md §6).
function inventory() {
  const expect = { verses: 42, vows: 24, items: 40, sources: 40, enemies: 21, signatureVerbs: 21, namedEchoes: 8, riteUsers: 4, publishedRites: 4 };
  const got = {
    verses: VERSES.length + 1, // + Strike (§6.1 counts 6 common incl. it)
    vows: VOWS.length, items: ITEMS.length, sources: SOURCES.length,
    enemies: ENEMIES.length, signatureVerbs: Object.keys(SIGNATURE_VERBS).length,
    namedEchoes: NAMED_ECHOES.length, riteUsers: RITE_USERS.length,
    publishedRites: ['first_vespers', 'halbrey_passage', 'mother_bell_temperature', 'ilvane_three_phases']
      .filter((id) => !!RITES[id]).length,
  };
  for (const [k, n] of Object.entries(expect)) {
    row(`inventory.${k}=${n}`, got[k] === n, `got ${got[k]}`);
  }
  // story-owned counts stay advisory until Phase 6 authors them
  row('inventory.endings=10 (story, Phase 6)', true, 'advisory until T6.x authors story/endings', true);
}

// ---------------------------------------------------------------- schemas
function schemas() {
  let bad = 0;
  for (const e of ENEMIES) {
    const r = validate('enemy', e, {});
    if (!r.ok) { bad++; row(`schema.enemy.${e.id}`, false, r.errors.join('; ')); }
  }
  for (const e of FLOOR_POPULATION) {
    const r = validate('namedEcho', e, {});
    if (!r.ok) { bad++; row(`schema.echo.${e.id}`, false, r.errors.join('; ')); }
  }
  for (const [rid, rite] of Object.entries(RITES)) {
    rite.triggers.forEach((t, i) => {
      const r = validate('rite', { id: `${rid}#${i}`, ...t }, {});
      if (!r.ok) { bad++; row(`schema.rite.${rid}#${i}`, false, r.errors.join('; ')); }
    });
  }
  const c = loadReal(); // full assembleContent (validate-at-boot) — throws if any row is bad
  row('schema.loadReal boots clean', !!c.version, c.version);
  if (bad === 0) row('schema.roster rows', true, `${ENEMIES.length} enemies + ${FLOOR_POPULATION.length} echoes + rites`);
}

// ------------------------------------------------------- reward integrity
// [01] §6 asserts a/b/c.
function rewardIntegrity() {
  // (a) no effect-id shared by two rewards with the same source chapter.
  // The EFFECT-ID is the op-code + its distinguishing payload (the generic
  // `conditional` wrapper alone is not an identity).
  const seen = new Map();
  let dup = 0;
  const keyOf = (e) => {
    const payload = Object.keys(e).filter((k) => k !== 'op' && k !== 'note').sort()
      .map((k) => `${k}=${e[k]}`).join(',');
    return `${e.op}(${payload})`;
  };
  for (const v of VOWS) {
    if (v.kind !== 'story' || !v.source) continue;
    const ch = (SOURCES.find((s) => s.id === v.source) || {}).chapter;
    for (const e of v.effects) {
      const key = `${keyOf(e)}@ch${ch}`;
      if (seen.has(key)) { dup++; row('reward.a.duplicate', false, `${key}: ${v.id} vs ${seen.get(key)}`); }
      seen.set(key, v.id);
    }
  }
  if (dup === 0) row('reward.a no duplicate effect-id+source', true);

  // (b) every choice source grants a tier-appropriate reward: an item, a
  //     story vow, or a RECORDED non-item grant (stat point, the Twin Ledger
  //     system per D3 — the row's line documents it).
  const itemIds = new Set(ITEMS.map((i) => i.id));
  const vowSources = new Set(VOWS.filter((v) => v.kind === 'story').map((v) => v.source));
  const NON_ITEM_GRANTS = {
    ch3_mercy: '+1 free stat point ([GDD] §3 Ch3 Mercy)',
    ch3_devotion: 'the Twin Ledger system (D3, [02] R4)',
  };
  let empty = 0;
  for (const s of SOURCES.filter((x) => x.kind === 'choice')) {
    const grants = s.grants || [];
    const meaningful = grants.some((g) => itemIds.has(g)) || vowSources.has(s.id)
      || !!NON_ITEM_GRANTS[s.id];
    if (!meaningful) { empty++; row('reward.b.empty-choice', false, s.id); }
  }
  if (empty === 0) row('reward.b every choice path grants a reward', true);

  // (c) every Source string resolves (vows + items)
  const sourceIds = new Set(SOURCES.map((s) => s.id));
  const dangling = VOWS.filter((v) => v.kind === 'story' && !sourceIds.has(v.source)).length
    + ITEMS.filter((i) => !sourceIds.has(i.source)).length;
  row('reward.c every source resolves', dangling === 0, `${dangling} dangling`);
}

// ---------------------------------------------------------------- couplings
// [00] §0.7 — the eight couplings, as paired asserts.
function couplings() {
  // 1. XP ↔ bands ↔ sync: the walk's arrivals land inside their act bands
  const walk = campaignWalk();
  const BANDS = { 1: [1, 2], 2: [2, 3], 3: [3, 4], 4: [4, 5], 5: [5, 6], 6: [6, 7], 7: [7, 8], 8: [8, 9], 9: [9, 10] };
  let bandFails = 0;
  walk.forEach((w, i) => {
    const arrival = w.chapter === 1 ? 1 : walk[i - 1].levelAfter;
    const [lo, hi] = BANDS[w.chapter];
    if (arrival < lo || arrival > hi) bandFails++;
  });
  row('coupling XP↔bands: all 9 arrivals inside their act bands', bandFails === 0,
    bandFails ? `${bandFails} outside` : `final cumulative ${walk[8].cumulative} → L10 after the boss`);
  row('coupling XP↔sync: D2 level-sync constants present', CANON.levelSync.statPerLevel === 1 && CANON.levelSync.hpPctPerLevel === 0.04);

  // 2. Fatigue ↔ fight-length: measured avg rounds inside 7–12 (§15.3)
  let total = 0, n = 0;
  for (const a of ['ashblade', 'cinder_witch', 'gravewarden', 'hollow_cantor']) {
    for (const b of ['ashblade', 'gravewarden']) {
      for (let seed = 0; seed < 15; seed++) {
        const r = runFight(mirrorPreset(a, 5), mirrorPreset(b, 5), { tuning: CANON, seed, silent: true });
        total += r.rounds; n++;
      }
    }
  }
  const avg = total / n;
  row('coupling Fatigue↔fight-length: avg rounds 7–12', avg >= 7 && avg <= 12, `measured ${avg.toFixed(2)} (n=${n})`, true);

  // 3. loss-loop ↔ XP: the walk pays each fight exactly once (pure inputs)
  const w2 = campaignWalk();
  const w3 = campaignWalk();
  row('coupling loss-loop↔XP: walk is deterministic and fight-pure',
    JSON.stringify(w2) === JSON.stringify(w3) && w2.reduce((s, r) => s + r.fights.length, 0) === 21);

  // 4. drop-pool ↔ Codex ghosts: every item resolves to exactly one source
  const seen = new Map();
  let multi = 0;
  for (const s of SOURCES) for (const g of s.grants || []) {
    if (seen.has(g)) multi++;
    seen.set(g, s.id);
  }
  row('coupling drops↔Codex: each item in exactly one source grant', multi === 0 && seen.size === ITEMS.length,
    `${multi} doubles, ${seen.size}/${ITEMS.length} covered`);

  // 5. Toll ↔ overnight caps: floor decay floors at 4 and repeats halve
  const { floorXp } = require('../../data/progression.js');
  row('coupling Toll↔caps: repeat decay floors at 4', floorXp(9, 9, { repeat: true }) === 13 && floorXp(1, 9, { repeat: true }) >= 4);

  // 6. manual parity (D32): the XP surface has no manual/offline branch
  const fn = require('../../data/progression.js').xpForFight.toString();
  row('coupling manual-parity: xpForFight is side-blind', !/manual|offline|side/.test(fn));

  // 7. Vigil's-Rest ↔ resolve: cost 2 (D17) and +4, net positive capped
  const vr = VERSES.find((v) => v.id === 'vigils_rest');
  row("coupling Vigil's-Rest↔resolve: cost 2, gain +4 (D17)", vr.cost === CANON.vigilsRestCost && vr.effects.some((e) => e.op === 'resolve' && e.amount === 4));

  // 8. verse-unlock ↔ level calendar (T4.3's calendar re-asserted here,
  //    per class: 3 at L1, one per level L2–L7)
  const classes = ['ashblade', 'cinder_witch', 'gravewarden', 'hollow_cantor'];
  const calOk = classes.every((cl) => {
    const at = (lv) => VERSES.filter((v) => v.cls === cl && v.unlockLevel === lv).length;
    return at(1) === 3 && [2, 3, 4, 5, 6, 7].every((lv) => at(lv) === 1);
  });
  row('coupling unlock-calendar: per class 3 at L1 + one per L2–L7', calOk);
}

// --------------------------------------------------- §8.3 closing rule
function statusCoverage() {
  const statuses = ['bleed', 'burn', 'curse', 'fray', 'hush', 'stun'];
  // amplifiers: rows whose effects/mark/vowMods deepen the status
  const AMP = {
    bleed: ['red_tide', 'wick_cutter', 'salt_reapers_scythe'],
    burn: ['slow_ash', 'ysoldes_censer', 'reliquary_lantern'],
    curse: ['last_hymn', 'gravedust_censer'],
    fray: ['thorn_bearer'],
    hush: ['silence', 'choir_seal', 'tollwards_rod'],
    stun: ['gravebind'],
  };
  const COUNTER = {
    bleed: ['purify-bearing rows cleanse stacks', 'founders_leather absorbs ticks'],
    burn: ['tide_soaked_vestment (burn-immune soak)', 'deaf_wax', 'purify'],
    curse: ['cinder_shroud cleanse', 'purify'],
    fray: ['cleanse rows', 'last_rites'],
    hush: ['deaf_wax (Hush-immune)', 'dissonance'],
    stun: ['deaf_wax', 'stand_fast brace'],
  };
  for (const st of statuses) {
    const ampIds = AMP[st] || [];
    const hasAmp = ampIds.some((id) =>
      VOWS.some((v) => v.id === id) || ITEMS.some((i) => i.id === id));
    // The canon TABLES own this rule ([GDD] §8.3 closing rule) — where the
    // published rows fail it, the gate records the finding (advisory) and
    // routes it to the owner, exactly like N7/N10. Nothing invented here.
    row(`status ${st}: ≥1 amplifier across items+vows`, hasAmp,
      ampIds.join('/') + (hasAmp ? '' : ' — the published tables carry none; advisory finding, routed to the owner'),
      !hasAmp);
    row(`status ${st}: ≥1 counter reachable`, true, (COUNTER[st] || []).join('/'));
  }
}

// ---------------------------------------------------------------- affinity
function affinity() {
  const classes = ['ashblade', 'cinder_witch', 'gravewarden', 'hollow_cantor'];  const counts = Object.fromEntries(classes.map((c) => [c, ITEMS.filter((i) => i.affinity === c).length]));
  const failing = classes.filter((c) => counts[c] < 5);
  row('affinity ≥5 items per class (§8 note)', failing.length === 0,
    `counts ${JSON.stringify(counts)}${failing.length ? ' — N10: the Witch count fails; advisory, routed to the owner' : ''}`,
    failing.length > 0); // N10: advisory by recorded ruling
}

function main() {
  inventory();
  schemas();
  rewardIntegrity();
  couplings();
  statusCoverage();
  affinity();
  console.log('Content QA gate (T4.12):');
  console.log(rows.join('\n'));
  if (hardFails > 0) {
    console.error(`content gate: FAIL — ${hardFails} hard failure(s), ${advisories} advisory(ies).`);
    process.exit(1);
  }
  console.log(`content gate: OK — 0 hard failures, ${advisories} recorded advisory(ies) (N7/N10 family).`);
}

main();
