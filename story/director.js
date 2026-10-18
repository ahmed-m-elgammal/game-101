/**
 * director.js — T6.2–T6.4: the campaign walker. [GDD] §3 (Acts I–III),
 * §8.4 (fixed loot), §9 (the 21 duels), §13 ([01] §4 XP), D2 (level-sync),
 * D11 (the Corvane lock), [02] R7d (the ally bodies).
 *
 * The director is the ONLY module that turns a run state into fights. It
 * owns three disciplines:
 *   1. BUILD ASSEMBLY — the player's fight build comes from the run state
 *      (auto-slotted verses by the class's §6 priority at the current level,
 *      first-fit gear by slot, the slotted vow, the furnace boon). The build
 *      is legality-checked through assembleBuild before any fight.
 *   2. WALK ORDER — chapters linear (§3.0), duels in roster order, one
 *      choice per chapter after its duels, the chapter's XP (+10) once.
 *   3. REWARD DISCIPLINE — every grant resolves through data/sources.js and
 *      the model's choice table; fights pay XP exactly once per run
 *      ([01] §4); losses pay nothing and re-bell freely (§10.11).
 *
 * Allies (Duel 21) are the R7d ally-body pattern: the Turned Pour bell when
 * the pour was turned (Ch6-Devotion), Oren when she was sent up (Ch8-Mercy).
 */

const { CANON } = require('../data/config.js');
const { CLASSES, STAT_KEYS } = require('../data/classes.js');
const { getVerse, STRIKE } = require('../data/verses.js');
// The harness's common fillers (steady_breath/purify/second_wind/vigils_rest/
// stand_fast) — the same deterministic slot-fill ladder T2.1 uses.
const COMMON_FILLERS = ['steady_breath', 'purify', 'second_wind', 'vigils_rest', 'stand_fast'];
const { SOURCE_BY_ID, ITEM_BY_ID, CHAPTER_FIGHTS, campaignWalk } = require('../data/index.js');
const { getEnemy, enemyBuild, TURNED_POUR_ALLY } = require('../data/enemies.js');
const { runFight, createSession, runToCompletion, resultsOf, spawnAlly } = require('../engine/fight.js');
const { syncedSheet, buildSheet } = require('../engine/fighter.js');
const { assembleBuild } = require('../engine/build.js');
const { lockCounterbuild, resolveCorvaneBuild, recordCorvaneLoss } = require('../store/counterbuild.js');
const RS = require('./runState.js');
const M = require('./model.js');

/** Per-fight boss loot — data/sources.js rows keyed to the fight that drops
 *  them (§8.4: campaign fights award fixed items; bosses their signature).
 *  Rows not listed here ride the chapter-completion grant instead; Corvane,
 *  Oren and the Ch9 fights grant through their choices and the chapter row. */
const FIGHT_LOOT = {
  sedge: 'ch1_boss',
  reaper_silt: 'ch2_boss',
  first_vespers: 'ch3_boss',
  halbrey: 'ch6_halbrey',
  mother_bell: 'ch6_boss',
  first_movement: 'ch7_boss',
};

/** Per-chapter completion loot — the fixed/market/exploration rows ([01] §6
 *  assert 4c: every item Source resolves to a real entry; this map is where
 *  the campaign pays them). */
const CHAPTER_LOOT = {
  1: [],
  2: ['ch2_market'],
  3: ['ch3_market'],
  4: ['ch4_fixed', 'ch4_warrens'],
  5: ['ch5_market'],
  6: ['ch6_compact'],
  7: ['ch7_orrery'],
  8: ['ch8_lower_silence'],
  9: ['ch9_choir'],
};

const ROLE_OF_FIGHT = (() => {
  const map = {};
  for (const row of campaignWalk()) {
    for (const f of row.fights) map[f.id] = { role: f.role, level: CHAPTER_FIGHTS[row.chapter - 1].length, chapter: row.chapter, enemyLevel: null };
  }
  // enemy levels come from the roster rows, not the walk
  for (const id of Object.keys(map)) {
    const row = getEnemy(id);
    if (row) map[id].enemyLevel = row.level;
  }
  return map;
})();

// ---------------------------------------------------------------------------
// Player build assembly
// ---------------------------------------------------------------------------

/** First 4 slottable verses, rotated by the walker's reshape window (§13):
 *  the class's §6 priority at this level, then the harness's fill ladder. */
function autoVerses(run) {
  const shift = ((run.reshapeShift || 0) * 2) % CLASSES[run.clazz].verses.length;
  const ladder = [...CLASSES[run.clazz].verses.slice(shift), ...CLASSES[run.clazz].verses.slice(0, shift), ...COMMON_FILLERS];
  const out = [];
  for (const id of ladder) {
    if (out.length >= 4) break;
    const v = getVerse(id);
    if (!v || v.isStrike) continue;
    if (v.cls !== 'common' && v.cls !== run.clazz) continue;
    if (v.unlockLevel > run.level) continue;
    if (!out.includes(v.id)) out.push(v.id);
  }
  // never short: Strike is always available (§6 preamble)
  while (out.length < 4) out.push(STRIKE.id);
  return out;
}

/** First-fit gear: the first granted item per slot, inventory order. The
 *  Hymnal's equip UI (T8.4) overrides via run.equipped. */
function autoGear(run) {
  const equipped = run.equipped && typeof run.equipped === 'object' ? run.equipped : {};
  const gear = { weapon: null, vestment: null, relic: null };
  for (const slot of ['weapon', 'vestment', 'relic']) {
    const forced = equipped[slot];
    if (forced) {
      if (!run.items.includes(forced)) throw new Error(`cannot equip "${forced}" — not in the run's inventory`);
      gear[slot] = forced;
    }
  }
  if (!gear.weapon && !gear.vestment && !gear.relic) {
    for (const id of run.items) {
      const item = ITEM_BY_ID.get(id);
      if (item && !gear[item.slot]) gear[item.slot] = id;
    }
  }
  const items = [gear.weapon, gear.vestment, gear.relic].filter(Boolean);
  return { gear, items };
}

/** The furnace boon: +1 starting Resolve for every class (the flag's effect),
 *  except when Twelve Tolls itself is slotted — same source, never stacks
 *  (DECISIONS.md §7). */
function furnaceBoon(run) {
  if (!RS.hasFlag(run, 'furnace_fed')) return 0;
  if (run.slottedVow === 'twelve_tolls') return 0;
  return 1;
}

/**
 * The player's fight build for the run's current state. Legality is checked
 * through assembleBuild (the same validator the Hymnal uses) before the boon
 * rides on top — the boon is a run property, not a build-the-player-made.
 */
function playerBuildOf(run) {
  if (!run.slottedVow) {
    // the walker default: the class's canonical (first) vow — §5.2/§7.1;
    // shrines swap it (T6.11 consumes via the loadout store)
    run.slottedVow = CLASSES[run.clazz].vows[0].id;
  }
  const { gear, items } = autoGear(run);
  // The free stat point (Ch3-Mercy) spends at build time under the auto
  // order — the run state keeps its own counter, the build declares it, and
  // validateAlloc's expect = 2(L−1) + bonus stays exact in every path.
  const levelUps = { ...run.levelUps };
  let b = run.bonusStatPoints;
  const base = CLASSES[run.clazz].stats;
  for (const k of RS.CLASS_AUTO_ORDER[run.clazz]) {
    while (b > 0 && (base[k] + run.creation[k] + levelUps[k]) < 10) { levelUps[k] += 1; b -= 1; }
    if (b === 0) break;
  }
  if (b > 0) throw new Error('the bonus stat point has nowhere legal to go — every stat at cap');
  const input = {
    name: run.name,
    clazz: run.clazz,
    level: run.level,
    creation: { ...run.creation },
    levelUps,
    bonusPoints: run.bonusStatPoints,
    vow: run.slottedVow,
    storyState: [...run.storyVows],
    verses: autoVerses(run),
    gear: { ...gear },          // slot-object dialect: empty slots stay empty
    doctrine: run.doctrine || 'hymnal', // §12.2 — the Hymnal is the default doctrine
  };
  const check = assembleBuild(input, CANON);
  if (!check.ok) {
    throw new Error('the run assembled an illegal build: '
      + check.errors.map((e) => `${e.code}(${e.field})`).join('; '));
  }
  const boon = furnaceBoon(run);
  const fightBuild = { ...check.build, items };
  return boon ? { ...fightBuild, startResolveBonus: boon } : fightBuild;
}

// ---------------------------------------------------------------------------
// Enemy build + D2 sync
// ---------------------------------------------------------------------------

/**
 * The enemy build for a duel, with the D2 soft level-sync applied through
 * the engine's own arithmetic (syncedSheet): +1 stat / +4% HP per level
 * above the band ceiling, cap 3. The synced build carries budgetOverride —
 * the sync is a declared D2 exemption, like Mother Bell's A6 override.
 */
function enemyBuildFor(run, duelId) {
  const row = getEnemy(duelId);
  if (!row) throw new Error(`unknown duel "${duelId}"`);
  const state = run.chapterState;
  const sync = state ? state.syncLevels : 0;
  const base = enemyBuild(row);
  if (sync === 0) return base;
  const sheet = buildSheet(base, CANON);
  const ceiling = RS.bandCeiling(run.chapter);
  const synced = syncedSheet(sheet, ceiling, CANON);
  return {
    name: synced.name,
    clazz: synced.clazz,
    level: synced.level,
    isEnemy: true,
    budgetOverride: true, // D2's declared exemption from the ±0 conformance
    stats: { ...synced.stats },
    hpOverride: synced.maxHp,
    vow: synced.vow,
    verses: [...synced.verses],
    items: [...synced.items],
    rite: synced.rite,
    art: synced.art,
    ...(synced.special ? { special: structuredClone(synced.special) } : {}),
    ...(synced.script ? { script: [...synced.script] } : {}),
    ...(synced.sequence ? { sequence: structuredClone(synced.sequence) } : {}),
    syncedOver: synced.syncedOver,
  };
}

function corvaneBuildFor(run) {
  const sheet = resolveCorvaneBuild(run);
  if (!sheet) throw new Error('Corvane was never locked — enter chapter 5 first (D11)');
  // T4.9's consumption shape: the sheet spreads over the varies row.
  return enemyBuild({ ...getEnemy('corvane'), ...sheet });
}

// ---------------------------------------------------------------------------
// Allies — the Duel 21 variants ([02] R7d pattern)
// ---------------------------------------------------------------------------

function turnedPourAllyBuild() {
  return {
    name: TURNED_POUR_ALLY.name,
    clazz: TURNED_POUR_ALLY.clazz,
    level: TURNED_POUR_ALLY.level,
    isEnemy: true, // hand-tuned chassis sheet
    budgetOverride: true, // the R7d chassis never levels: 31 points at L8
    stats: { ...TURNED_POUR_ALLY.stats },
    hpOverride: TURNED_POUR_ALLY.hpOverride,
    vow: null,
    verses: [STRIKE.id], // "attacks once per round"
    items: [],
    special: { debuffImmune: ['curse'] }, // "cannot be targeted by Ilvane's Curse"
  };
}

/** Spawn the chapter-appropriate allies into a live session (Duel 21). */
function spawnCampaignAllies(session, run) {
  const spawned = [];
  if (RS.hasFlag(run, 'pour_turned')) {
    spawnAlly(session, session.fighters.a, turnedPourAllyBuild(), { thorns: TURNED_POUR_ALLY.startThorns });
    spawned.push('turned_pour');
  }
  if (RS.hasFlag(run, 'oren_sent_up')) {
    // Oren fights beside you with her published sheet (the R7d pattern:
    // data, not design — no new numbers invented).
    spawnAlly(session, session.fighters.a, enemyBuild(getEnemy('oren')));
    spawned.push('oren');
  }
  return spawned;
}

// ---------------------------------------------------------------------------
// The walk
// ---------------------------------------------------------------------------

/**
 * §13's free reshaping, played by the walker between re-bells (§10.11: they
 * are unlimited and free; Maren's Whisper exists because players ADJUST).
 * Attempt N ≥ 2 rotates the assignment order and the verse window — a
 * deterministic ladder of legal reshapes, all through the same validators.
 * The run state's assignment is the thing being reshaped, exactly as the
 * shrine allows.
 */
function reshapeForAttempt(run, attempt) {
  if (attempt <= 1) return;
  const shift = (attempt - 1) % 4;
  const order = RS.CLASS_AUTO_ORDER[run.clazz];
  const rotated = order.slice(shift).concat(order.slice(0, shift));
  const base = CLASSES[run.clazz].stats;
  const cap = 10; // tuning.statCap (§5.1)
  const levelTotal = 2 * (run.level - 1);
  run.creation = { vig: 0, mig: 0, wit: 0, grd: 0, hst: 0 };
  run.levelUps = { vig: 0, mig: 0, wit: 0, grd: 0, hst: 0 };
  let c = 4;
  let l = levelTotal;
  for (const k of rotated) {
    while (c > 0 && (base[k] + run.creation[k] + run.levelUps[k]) < cap) { run.creation[k] += 1; c -= 1; }
    while (l > 0 && (base[k] + run.creation[k] + run.levelUps[k]) < cap) { run.levelUps[k] += 1; l -= 1; }
  }
  if (c > 0 || l > 0) throw new Error('reshape could not place every point — assignment ladder exhausted');
  run.reshapeShift = shift; // the verse window rotates with it
}

/**
 * Fight one duel of the run's current chapter. Wins pay XP exactly once per
 * run and drop the fight's fixed loot; losses pay nothing, record the D11
 * reveal when it is Corvane, and re-bell freely (§10.11: unlimited, free,
 * with a reshaped loadout between attempts — §13).
 * @returns {{won, result, xp?, attempts}} result is the Ledger's raw inputs
 */
function fightDuel(run, duelId, opts = {}) {
  const chapter = M.chapterAt(run.chapter);
  if (!chapter.duels.includes(duelId)) {
    throw new Error(`"${duelId}" is not a fight of chapter ${run.chapter}`);
  }
  const meta = ROLE_OF_FIGHT[duelId];
  if (!meta || !meta.enemyLevel) throw new Error(`duel "${duelId}" is not wired to the roster walk`);
  if (duelId === 'corvane' && !run.corvane) {
    // D11: the lock fires at chapter start; a caller that skipped enterChapter
    // cannot farm a fresh pick here.
    lockCounterbuild(run, playerBuildOf(run), 5);
  }

  const enemyBuild_ = duelId === 'corvane' ? corvaneBuildFor(run) : enemyBuildFor(run, duelId);
  // §10.11 — a dampened run keeps the assist for the rest of the campaign
  // ("marked permanently on your profile"; it never travels — exports carry
  // full stat lines, so the Floor stays a level field).
  const applyDampening = (b) => {
    b.dampened = true; // deals −15% (resolveDamage)
    if (b.hpOverride != null) b.hpOverride = Math.round(b.hpOverride * 0.85); // −15% HP
    return b;
  };
  if (run.dampened) applyDampening(enemyBuild_);
  const seed = opts.seed != null ? opts.seed : 1;
  const maxAttempts = opts.maxAttempts || 40; // §10.11: unlimited and free; this is the deterministic test bound

  let result = null;
  let attempts = 0;
  let won = false;
  let playerBuild = playerBuildOf(run);
  while (attempts < maxAttempts && !won) {
    attempts += 1;
    if (attempts > 1) {
      reshapeForAttempt(run, attempts); // §13: re-shape between re-bells
      playerBuild = playerBuildOf(run);
    }
    // §10.11 — The Dampened Bell is offered — never pushed — after the
    // FOURTH loss on the same fight. The walker models the player who
    // accepts it on a wall (the N12 advisory rows are real).
    if (attempts - 1 === 4 && !run.dampened) {
      applyDampening(enemyBuild_);
      run.dampened = true;
      if (!run.dampenedFights.includes(duelId)) run.dampenedFights.push(duelId);
    }
    const attemptSeed = (typeof seed === 'number' ? seed : 1) + attempts - 1;
    if (duelId === 'ilvane' && (RS.hasFlag(run, 'pour_turned') || RS.hasFlag(run, 'oren_sent_up'))) {
      const session = createSession(playerBuild, enemyBuild_, { seed: attemptSeed, tuning: CANON });
      spawnCampaignAllies(session, run);
      runToCompletion(session);
      result = resultsOf(session);
    } else {
      result = runFight(playerBuild, enemyBuild_, { seed: attemptSeed, tuning: CANON });
    }
    won = result.winner === 'a';
  }

  if (!won) {
    if (duelId === 'corvane') recordCorvaneLoss(run); // the reveal-once hook (D11)
    return { won: false, result, attempts };
  }

  const firstClear = RS.markFightCleared(run, duelId);
  let xp = null;
  if (firstClear) {
    xp = RS.payFightXp(run, meta.enemyLevel, meta.role);
    const lootRow = FIGHT_LOOT[duelId];
    if (lootRow) {
      const src = SOURCE_BY_ID.get(lootRow);
      for (const itemId of src.grants) RS.grantItem(run, itemId);
    }
  }
  return { won: true, result, xp, attempts, firstClear };
}

/**
 * Record the chapter's story choice. Requires the chapter's duels cleared
 * (§3 order: fights, then the choice) and routes through runState (tallies,
 * sources grants, flags, vows — one record, hidden tallies).
 */
function makeChoice(run, optionId) {
  const chapter = M.chapterAt(run.chapter);
  const cleared = chapter.duels.every((d) => run.chapterState.fightsCleared.includes(d));
  if (!cleared) throw new Error(`chapter ${run.chapter}'s choice needs its duels cleared first (§3 order)`);
  return RS.recordChoice(run, optionId);
}

/** The final choice — the three canon paths, plus the hidden fourth thing
 *  ONLY when the T6.8 gate says so (the stub here never opens it; T6.8
 *  replaces the stub with the real evaluator over run state + records). */
function finalChoice(run, optionId, opts = {}) {
  const option = M.FINAL_CHOICE.options.find((o) => o.id === optionId);
  if (!option) throw new Error(`unknown final option "${optionId}"`);
  if (option.gate === 'unmake' && opts.unmakeGate !== true) {
    throw new Error('the fourth thing is not there (§4.4 — the gate is closed)');
  }
  return makeChoice(run, optionId);
}

/**
 * Close a chapter: pay the +10 completion XP once, grant the chapter's
 * fixed loot, and — at the end of Act I — set the Choir Floor unlock.
 * @returns {{xp, itemsGranted}}
 */
function completeChapter(run) {
  const chapter = M.chapterAt(run.chapter);
  const missing = chapter.duels.filter((d) => !run.chapterState.fightsCleared.includes(d));
  if (missing.length) throw new Error(`chapter ${run.chapter} still has uncleared duels: ${missing.join(', ')}`);
  if (!run.chapterState.choiceMade) throw new Error(`chapter ${run.chapter}'s choice is not made`);
  if (run.chapterState.completed) throw new Error(`chapter ${run.chapter} is already complete`);

  const itemsGranted = [];
  for (const rowId of CHAPTER_LOOT[run.chapter]) {
    const src = SOURCE_BY_ID.get(rowId);
    for (const itemId of src.grants) {
      if (!run.items.includes(itemId)) {
        RS.grantItem(run, itemId);
        itemsGranted.push(itemId);
      }
    }
  }
  const xp = RS.payChapterXp(run);
  run.chapterState.completed = true;
  return { xp, itemsGranted };
}

/** Visit the chapter's shrine (§13, F24): marks the visit; the reshape itself
 *  goes through the loadout store with context 'shrine' (T6.11/T8.4). */
function visitShrine(run) {
  if (!run.chapterState) throw new Error('enter the chapter first');
  run.chapterState.shrineVisited = true;
  return { context: 'shrine', chapter: run.chapter };
}

/**
 * Automated chapter walk (the playthrough primitive the tests drive):
 * enter → clear every duel (re-belling deterministically until won) →
 * make the choice → close the chapter.
 * @param {object} run - the run state (mutated)
 * @param {object} opts - { choice: optionId required, seed, onDuel, onChoice }
 */
function walkChapter(run, opts = {}) {
  const chapter = M.chapterAt(run.chapter + 1);
  const state = RS.enterChapter(run, chapter.index);
  // D11 — the counterbuild is seeded from the build string at CHAPTER START
  // and locked for the run; the duel itself cannot farm a fresh pick.
  if (chapter.index === 5 && !run.corvane) {
    lockCounterbuild(run, playerBuildOf(run), 5);
  }
  const fights = [];
  for (const duelId of chapter.duels) {
    const r = fightDuel(run, duelId, { seed: opts.seed });
    fights.push({ duelId, won: r.won, attempts: r.attempts, xp: r.xp ? r.xp.paid : 0 });
    if (opts.onDuel) opts.onDuel(duelId, r);
    if (!r.won) throw new Error(`duel "${duelId}" unwon after ${r.attempts} attempts — the walk stops (§10.11 re-bells exhausted)`);
  }
  const choiceId = opts.choice;
  if (!choiceId) throw new Error('walkChapter requires the chapter\'s choice');
  const record = makeChoice(run, choiceId);
  if (opts.onChoice) opts.onChoice(record);
  const completion = completeChapter(run);
  return { chapter: chapter.index, state, fights, record, completion };
}




module.exports = { FIGHT_LOOT, CHAPTER_LOOT, ROLE_OF_FIGHT, autoVerses, autoGear, furnaceBoon, reshapeForAttempt, playerBuildOf, enemyBuildFor, corvaneBuildFor, turnedPourAllyBuild, spawnCampaignAllies, fightDuel, makeChoice, finalChoice, completeChapter, visitShrine, walkChapter };
