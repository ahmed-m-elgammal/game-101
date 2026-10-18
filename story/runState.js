/**
 * runState.js — T6.1: the run-state object every system reads. [GDD] §4.1
 * (the tallies are never shown in play — epilogue only), §8.4 (memory-sold
 * marks, D13/D14), §13 + [01] §4 (the XP economy: thresholds, +10 chapter
 * completion, choices pay 0), D1 (L9 by the Bellmouth, L10 in the finale),
 * D2 (soft level-sync: cap 3, over-levelled chapters pay 25% XP and advance
 * Floor pity), §4.4 + T9.1 (Unmake eligibility inputs, save shape).
 *
 * Plain JSON end to end (T9.1 consumes the shape; the round-trip is pinned
 * in tests/phase6-story.test.js). The tallies live in the save (the frozen
 * `saveState` schema carries them — the SAVE holds the truth); what never
 * sees the UI is the *play* projection: visibleRunStateOf() strips them,
 * and the architecture test locks that.
 *
 * Stat points: 4 at creation, +2 per level, "never banked; every point must
 * be assigned" (the T0.3/N1 validator rule). The walker auto-assigns by the
 * CLASS_AUTO_ORDER policy below and shrines re-assign freely (§13) — the
 * run state records the assignment so build assembly stays validator-legal.
 */

const { levelForXp, xpForFight, chapterCompletionXp, statPointsForLevel, XP_THRESHOLDS } = require('../data/progression.js');
const { ITEM_BY_ID, VOW_BY_ID, VERSES, CLASS_IDS, CLASSES } = require('../data/index.js');
const { validate } = require('../data/schemas/validators.js');
const M = require('./model.js');

const RUN_VERSION = 1;
const LEVEL_CAP = 10;
const SYNC_CAP = 3;              // D2: "capped at +3 levels"
const OVERLEVEL_XP_RATE = 0.75;  // D2: over-levelled chapters pay 25% XP

/** The walker's default point-assignment order per class (§5.1 identities).
 *  Shrines re-assign freely; this only exists so a level-up never banks a
 *  point and the automated playthroughs stay deterministic. */
const CLASS_AUTO_ORDER = {
  ashblade: ['mig', 'hst', 'vig', 'grd', 'wit'],
  cinder_witch: ['wit', 'hst', 'vig', 'grd', 'mig'],
  gravewarden: ['vig', 'grd', 'mig', 'hst', 'wit'],
  hollow_cantor: ['wit', 'grd', 'hst', 'vig', 'mig'],
};

/** The walker's default creation spread — the T2.1 standard archetype's
 *  creation per class (canon-legal, harness-tested). */
const DEFAULT_CREATION = {
  ashblade: { mig: 2, hst: 1, vig: 1 },
  cinder_witch: { wit: 1, hst: 2, vig: 1 },
  gravewarden: { grd: 2, vig: 1, mig: 1 },
  hollow_cantor: { wit: 1, hst: 2, vig: 1 },
};

const START_ITEMS = ['candle_of_saint_orrin']; // ch1_start (data/sources.js)

function zeroed() { return { vig: 0, mig: 0, wit: 0, grd: 0, hst: 0 }; }

/** Band ceiling of a chapter (levelBand ['9','10'] → 10). */
function bandCeiling(chapterIndex) {
  return Number(M.chapterAt(chapterIndex).levelBand[1]);
}

/** D2 sync level for a player arriving at a chapter: 0..3. */
function syncLevelsFor(playerLevel, chapterIndex) {
  return Math.max(0, Math.min(SYNC_CAP, playerLevel - bandCeiling(chapterIndex)));
}

/** T6.8 input (provisional reading, recorded in TASKS.md): Burn verses the
 *  run has actually UNLOCKED (level-reached), never cast. */
function burnVersesUnlocked(clazz, level) {
  return VERSES.filter((v) => v.cls === clazz && v.unlockLevel <= level
    && Array.isArray(v.effects) && v.effects.some((e) => e.op === 'burn')).length;
}

// ---------------------------------------------------------------------------

function createRunState(opts = {}) {
  const clazz = opts.clazz;
  if (!CLASS_IDS.includes(clazz)) {
    throw new Error(`unknown class "${clazz}" (known: ${CLASS_IDS.join(', ')})`);
  }
  // Default creation: the T2.1 standard archetype's spread (canon-legal,
  // harness-tested); the creation screen (T8.1) passes explicit creation.
  const creation = opts.creation
    ? { ...zeroed(), ...opts.creation }
    : { ...zeroed(), ...DEFAULT_CREATION[clazz] };
  const sum = Object.values(creation).reduce((a, b) => a + b, 0);
  if (!Number.isInteger(sum) || sum !== 4) {
    throw new Error(`creation must assign exactly 4 points (got ${sum})`);
  }
  const run = {
    version: RUN_VERSION,
    clazz,
    name: typeof opts.name === 'string' && opts.name ? opts.name : 'The Vigil',
    level: 1,
    xp: 0,
    creation,                       // the 4 creation points
    levelUps: zeroed(),             // +2 per level, auto-assigned (shrines re-assign)
    bonusStatPoints: 0,             // Ch3-Mercy's free stat point until spent
    chapter: 0,                     // 0 = the crypt before Chapter 1 opens
    chapterState: null,             // set by enterChapter
    tallies: { mercy: 0, ruthless: 0, devotion: 0 }, // §4.1: NEVER rendered in play
    choices: [],                    // the Orrery's record: { chapter, optionId, tally }
    items: [...START_ITEMS],
    storyVows: [],                  // earned story vow ids (the Hymnal's storyState)
    slottedVow: null,               // the vow the build fights with (walker default: the class's first; shrines swap)
    doctrine: null,                 // §12.2 doctrine (walker default: hymnal, set at build time)
    equipped: { weapon: null, vestment: null, relic: null }, // the Hymnal's equip overrides; absent → first-fit
    dampened: false,                // §10.11 — the Dampened Bell mark, permanent on the profile
    dampenedFights: [],             // the fights where the bell was accepted (the Vigil Ledger's record)
    flags: {},
    floor: { unlocked: false, pity: 0 },
    memoriesSold: [],               // D13/D14 marks — the Orrery reads these
    unmake: { lostToOwnEcho: 0, closed: false }, // §4.4 inputs (T6.8 evaluates)
    ending: null,                   // set by the final choice
    fightsCleared: [],              // anti-double-dip ([01] §4)
    corvane: null,                  // the D11 lock record (store/counterbuild owns the shape)
  };
  return run;
}

// ---------------------------------------------------------------------------

function assignPoints(run, points) {
  let left = points;
  const base = CLASSES[run.clazz].stats;
  const cap = 10; // tuning.statCap (§5.1) — class base + assignment ≤ 10 per stat
  for (const k of CLASS_AUTO_ORDER[run.clazz]) {
    while (left > 0 && (base[k] + run.creation[k] + run.levelUps[k]) < cap) {
      run.levelUps[k] += 1;
      left -= 1;
    }
    if (left === 0) return;
  }
  if (left > 0) throw new Error('stat assignment overflow — every stat is at cap');
}

/**
 * Pay a fight's XP ([01] §4): `10 + 4×enemy level` × role, × 0.75 when the
 * chapter is over-levelled (D2), rounded once. Levels up grant +2 points,
 * assigned immediately (never banked). Choices pay 0 — this module never
 * takes a tally or a choice as XP input.
 */
function payFightXp(run, enemyLevel, role) {
  if (!Number.isInteger(enemyLevel) || enemyLevel < 1 || enemyLevel > LEVEL_CAP) {
    throw new Error(`enemy level out of range: ${enemyLevel}`);
  }
  const over = run.chapterState && run.chapterState.overLevelled;
  const base = xpForFight(enemyLevel, role);
  const paid = over ? Math.round(base * OVERLEVEL_XP_RATE) : base;
  run.xp += paid;
  const target = levelForXp(run.xp);
  while (run.level < target && run.level < LEVEL_CAP) {
    run.level += 1;
    assignPoints(run, 2);
  }
  return { paid, base, synced: !!over };
}

/** Chapter completion: +10 flat, paid once when the chapter's prose closes. */
function payChapterXp(run) {
  const over = run.chapterState && run.chapterState.overLevelled;
  const base = chapterCompletionXp();
  const paid = over ? Math.round(base * OVERLEVEL_XP_RATE) : base;
  run.xp += paid;
  const target = levelForXp(run.xp);
  while (run.level < target && run.level < LEVEL_CAP) {
    run.level += 1;
    assignPoints(run, 2);
  }
  return { paid, base, synced: !!over };
}

// ---------------------------------------------------------------------------

function setFlag(run, id) {
  if (!M.FLAG_BY_ID.get(id)) {
    throw new Error(`unknown run flag "${id}" — the registry (story/model FLAGS) is the whole surface`);
  }
  run.flags[id] = true;
  return run.flags;
}

function hasFlag(run, id) {
  return run.flags[id] === true;
}

/** The player's current total allocation (creation + level-ups + bonus). */
function allocOf(run) {
  const out = zeroed();
  for (const k of Object.keys(out)) out[k] = run.creation[k] + run.levelUps[k];
  if (run.bonusStatPoints > 0) {
    // the free stat point spends by the same policy until a shrine re-assigns
    let left = run.bonusStatPoints;
    const spent = zeroed();
    for (const k of CLASS_AUTO_ORDER[run.clazz]) {
      while (left > 0) { spent[k] += 1; left -= 1; break; }
    }
    for (const k of Object.keys(spent)) out[k] += spent[k];
  }
  return out;
}

// ---------------------------------------------------------------------------
// Chapter state — the per-chapter context every duel and scene reads.
// ---------------------------------------------------------------------------

/**
 * Enter a chapter: record the D2 sync audit for the arrival level, advance
 * the Floor pity on an over-levelled chapter, derive the Ch6 ally-state
 * from the Ch4 outcome, and open the chapter's unlocks.
 * A re-entry (post-loss) re-derives the same state — sync moves only with
 * the player's level, and the D11 Corvane lock (T5.8) lives in run.corvane.
 */
function enterChapter(run, index) {
  if (!Number.isInteger(index) || index < 1 || index > 9) throw new Error(`chapter out of range: ${index}`);
  if (index !== run.chapter + 1 && index !== run.chapter) {
    throw new Error(`cannot enter chapter ${index} from chapter ${run.chapter} — the walk is linear (§3.0)`);
  }
  const chapter = M.chapterAt(index);
  const reEnter = index === run.chapter && run.chapterState;
  const sync = syncLevelsFor(run.level, index);
  const state = {
    index,
    syncLevels: sync,
    overLevelled: sync > 0,
    allies: 0,
    // Re-entry (post-loss) keeps the chapter's own progress; the run-wide
    // fight record (run.fightsCleared) is what holds the XP once-rule.
    fightsCleared: reEnter ? [...run.chapterState.fightsCleared] : [],
    choiceMade: reEnter ? run.chapterState.choiceMade : null,
    shrineVisited: reEnter ? run.chapterState.shrineVisited : false,
  };
  if (index === 6) {
    const ch4 = run.choices.find((c) => c.chapter === 'ch4');
    if (!ch4) throw new Error('enterChapter(6) requires the Ch4 choice — the branch is the fight list');
    state.allies = M.ch6AlliesFor(ch4.optionId);
  }
  const wasOverLevelled = reEnter ? run.chapterState.overLevelled : false;
  if (sync > 0 && !wasOverLevelled) run.floor.pity += 1; // D2: one pity advance per over-levelled chapter
  run.chapter = index;
  run.chapterState = state;

  // Unlocks carried by the chapter node (vendor opens with the Market ahead).
  if (chapter.unlock === 'floor' && !hasFlag(run, 'floor_unlocked')) {
    setFlag(run, 'floor_unlocked');
  }
  if (chapter.unlock === 'vendor' && !hasFlag(run, 'vendor_open')) {
    setFlag(run, 'vendor_open');
  }
  return state;
}

function markFightCleared(run, duelId) {
  if (!run.chapterState) throw new Error('enter the chapter first');
  if (run.chapterState.fightsCleared.includes(duelId)) return false;
  run.chapterState.fightsCleared.push(duelId);
  if (!run.fightsCleared.includes(duelId)) run.fightsCleared.push(duelId);
  return true;
}

function isFightCleared(run, duelId) {
  return run.fightsCleared.includes(duelId);
}

// ---------------------------------------------------------------------------
// Choices, rewards, tallies.
// ---------------------------------------------------------------------------

function findOption(optionId) {
  for (const c of M.CHOICES) {
    const o = c.options.find((x) => x.id === optionId);
    if (o) return { choice: c, option: o };
  }
  const o = M.FINAL_CHOICE.options.find((x) => x.id === optionId);
  if (o) return { choice: M.FINAL_CHOICE, option: o };
  return null;
}

function grantItem(run, id) {
  if (!ITEM_BY_ID.get(id)) throw new Error(`unknown item "${id}"`);
  if (run.items.includes(id)) throw new Error(`item "${id}" already granted — no duplicate grants ([01] §6 assert 4a)`);
  run.items.push(id);
  return run.items;
}

/**
 * Grant a story vow. §7.2 publishes each vow's class gate: a gate that does
 * not match the run's class records the vow as UNSLOTTED (the tally, flags
 * and material reward still land — the gate is the vow's, never the
 * chapter's). Returns { granted, gated }.
 */
function grantVow(run, vowId) {
  const vow = VOW_BY_ID.get(vowId);
  if (!vow || vow.kind !== 'story') throw new Error(`"${vowId}" is not a story vow`);
  const gateOk = vow.cls === 'any' || vow.cls === run.clazz;
  if (gateOk) {
    if (!run.storyVows.includes(vowId)) run.storyVows.push(vowId);
    return { granted: true, gated: false };
  }
  return { granted: false, gated: true };
}

/**
 * Record a choice: tally increment (hidden), material grants from
 * data/sources.js, flags, vow, stat point, Twin Ledger. One choice per
 * chapter; the chapter must be the run's current chapter. Selling a memory
 * later keeps the tally and every reward ([01] §6 / D13) — this record is
 * the thing that survives.
 */
function recordChoice(run, optionId) {
  const hit = findOption(optionId);
  if (!hit) throw new Error(`unknown choice option "${optionId}"`);
  const { choice, option } = hit;
  const chapterIndex = Number(choice.chapter.slice(2));
  if (run.chapter !== chapterIndex) {
    throw new Error(`choice "${optionId}" belongs to chapter ${chapterIndex}; the run is at ${run.chapter}`);
  }
  if (run.chapterState.choiceMade) {
    throw new Error(`chapter ${run.chapter} already chose "${run.chapterState.choiceMade}" — one story choice per chapter (§3.0)`);
  }
  if (run.ending) throw new Error('the run has ended — no further choices');

  const record = { chapter: choice.chapter, optionId, tally: option.tally || null, at: run.chapter };
  if (option.tally) run.tallies[option.tally] += 1;

  // Material grants — from the ratified sources registry, never re-invented.
  if (option.source) {
    const src = require('../data/index.js').SOURCE_BY_ID.get(option.source);
    for (const itemId of src.grants) grantItem(run, itemId);
  }
  if (option.statPoint) run.bonusStatPoints += option.statPoint;
  if (option.twinLedger) setFlag(run, 'twin_ledger_earned'); // store/twin-ledger consumes
  if (option.vow) {
    const g = grantVow(run, option.vow);
    record.vow = option.vow;
    record.vowGated = g.gated;
  }
  for (const fid of option.flags || []) setFlag(run, fid);

  // The final choice ends the run.
  if (choice === M.FINAL_CHOICE) {
    const ending = M.ENDING_BY_OPTION.get(optionId);
    if (!ending) throw new Error(`option "${optionId}" does not resolve to an ending`);
    run.ending = ending;
  }

  run.choices.push(record);
  run.chapterState.choiceMade = optionId;
  return record;
}

/**
 * The memory market primitive (D13/D14): selling a chapter's choice to Pell
 * marks it *—sold—* in the Orrery, keeps its tally contribution and every
 * reward, and closes the Unmake path for that run ("Pell does not sell back
 * what the candle gives him"). The vendor UI is T6.12; this is the state it
 * must call. Exactly one memory per vendor item (the frozen vendorEntry
 * schema pins costMemories 1 and restock false).
 */
function sellMemory(run, optionId) {
  const hit = findOption(optionId);
  if (hit && hit.choice === M.FINAL_CHOICE) {
    throw new Error('the baton is not for sale — a memory is one of the nine chapter choices ([01] §4)');
  }
  const rec = run.choices.find((c) => c.optionId === optionId);
  if (!rec) throw new Error(`cannot sell "${optionId}" — the run never made that choice`);
  if (run.memoriesSold.includes(optionId)) throw new Error(`"${optionId}" is already *—sold—*`);
  run.memoriesSold.push(optionId);
  run.unmake.closed = true;
  return run.memoriesSold;
}

// ---------------------------------------------------------------------------
// Serialization — the T9.1 save shape (the frozen `saveState` schema), with
// the Phase-6 fields alongside. validate('saveState', ...) runs at save; a
// non-conforming run is a REJECTION.
// ---------------------------------------------------------------------------

function toSaveState(run, loadouts = []) {
  if (!run.chapter || run.chapter < 1) {
    // the frozen saveState schema pins chapter 1–9: the save exists once the
    // campaign opens (you create the Vigil at the crypt — that IS chapter 1)
    throw new Error('the run has not opened Chapter 1 yet — nothing to save');
  }
  const save = {
    version: RUN_VERSION,
    run: {
      chapter: run.chapter,
      level: run.level,
      xp: run.xp,
      tallies: { ...run.tallies },       // the save holds the truth (§4.1)
      memoriesSold: [...run.memoriesSold],
      // Phase-6 extensions alongside the schema fields:
      clazz: run.clazz,
      name: run.name,
      creation: { ...run.creation },
      levelUps: { ...run.levelUps },
      bonusStatPoints: run.bonusStatPoints,
      choices: run.choices.map((c) => ({ ...c })),
      items: [...run.items],
      storyVows: [...run.storyVows],
      slottedVow: run.slottedVow,
      doctrine: run.doctrine,
      equipped: { ...run.equipped },
      dampened: run.dampened,
      dampenedFights: [...run.dampenedFights],
      flags: { ...run.flags },
      floor: { ...run.floor },
      unmake: { ...run.unmake },
      ending: run.ending,
      fightsCleared: [...run.fightsCleared],
      chapterState: run.chapterState ? {
        ...run.chapterState,
        fightsCleared: [...run.chapterState.fightsCleared],
      } : null,
      corvane: run.corvane ? JSON.parse(JSON.stringify(run.corvane)) : null,
    },
    loadouts: loadouts.length ? loadouts.map((l) => JSON.parse(JSON.stringify(l)))
      : [{ placeholder: true }], // minLen 1 — the bound Echo's export rides here at T9.1
    floor: { toll: 800, bound: false, ward: run.floor.unlocked },
    settings: { countersOptIn: false },
  };
  const r = validate('saveState', save, {});
  if (!r.ok) throw new Error(`save state rejected: ${r.errors.join('; ')}`);
  return save;
}

function fromSaveState(json) {
  if (!json || typeof json !== 'object') throw new Error('save state required');
  if (json.version !== RUN_VERSION) throw new Error(`unsupported save version: ${json.version}`);
  const r = json.run;
  const run = createRunState({ clazz: r.clazz, name: r.name, creation: r.creation });
  run.level = r.level;
  run.xp = r.xp;
  run.levelUps = { ...zeroed(), ...r.levelUps };
  run.bonusStatPoints = r.bonusStatPoints || 0;
  run.chapter = r.chapter;
  run.chapterState = r.chapterState ? {
    ...r.chapterState,
    fightsCleared: [...(r.chapterState.fightsCleared || [])],
  } : null;
  run.tallies = { ...r.tallies };
  run.choices = r.choices.map((c) => ({ ...c }));
  run.items = [...r.items];
  run.storyVows = [...r.storyVows];
  run.slottedVow = r.slottedVow || null;
  run.doctrine = r.doctrine || null;
  run.equipped = { weapon: null, vestment: null, relic: null, ...(r.equipped || {}) };
  run.dampened = r.dampened === true;
  run.dampenedFights = [...(r.dampenedFights || [])];
  run.flags = { ...r.flags };
  run.floor = { ...r.floor };
  run.memoriesSold = [...r.memoriesSold];
  run.unmake = { ...r.unmake };
  run.ending = r.ending || null;
  run.fightsCleared = [...(r.fightsCleared || [])];
  run.corvane = r.corvane ? JSON.parse(JSON.stringify(r.corvane)) : null;
  return run;
}

// ---------------------------------------------------------------------------
// The play projection — §4.1: "The tally is never shown during play."
// This is the ONLY shape a UI layer may read. The architecture test locks
// both halves: no tally keys out, and the save shape keeps them in.
// ---------------------------------------------------------------------------

function visibleRunStateOf(run) {
  return {
    version: run.version,
    clazz: run.clazz,
    name: run.name,
    level: run.level,
    xp: run.xp,
    chapter: run.chapter,
    chapterState: run.chapterState ? {
      index: run.chapterState.index,
      syncLevels: run.chapterState.syncLevels,
      overLevelled: run.chapterState.overLevelled,
      allies: run.chapterState.allies,
      fightsCleared: [...run.chapterState.fightsCleared],
      choiceMade: run.chapterState.choiceMade,
      shrineVisited: run.chapterState.shrineVisited,
    } : null,
    items: [...run.items],
    storyVows: [...run.storyVows],
    flags: { ...run.flags },
    floor: { ...run.floor },
    ending: run.ending,
    memoriesSoldCount: run.memoriesSold.length,
  };
}




module.exports = { RUN_VERSION, LEVEL_CAP, SYNC_CAP, OVERLEVEL_XP_RATE, CLASS_AUTO_ORDER, DEFAULT_CREATION, XP_THRESHOLDS, START_ITEMS, createRunState, bandCeiling, syncLevelsFor, burnVersesUnlocked, setFlag, hasFlag, allocOf, payFightXp, payChapterXp, enterChapter, markFightCleared, isFightCleared, grantItem, grantVow, recordChoice, sellMemory, findOption, toSaveState, fromSaveState, visibleRunStateOf, statPointsForLevel };
