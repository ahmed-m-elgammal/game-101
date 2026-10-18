/**
 * index.js — T4.1: the content data layer. Load, validate, and index all
 * content at boot with schema enforcement and clear failure modes — bad data
 * fails LOUDLY at load, never mysteriously mid-fight.
 *
 *   assembleContent(bundle)  pure: bundle {classes, verses, vows, items,
 *                            sources} → validated, indexed, DEEP-FROZEN
 *                            content object (immutable — the engine reads,
 *                            never writes).
 *   loadReal()               the real content bundle (the modules above).
 *   makeRegistry(content)    the ctx registries the T0.3 validators consume.
 *   CONTENT_VERSION          data-version stamp; T9.1 saves it into save
 *                            states so migrations know what a save was built on.
 *
 * Failure contract: the FIRST invalid row throws an Error naming the kind,
 * the row id, and the failing field — e.g.
 *   `data load failed: verse "rend" — cost: below min 0`
 * Fixtures (data/fixtures.js) load through the same machinery and stay
 * independent of the real modules.
 */

import { validate, OPCODES } from './schemas/validators.js';
import { CLASSES, CLASS_IDS, COUNTER_TABLE, STAT_KEYS, STAT_NAMES, STAT_ROLES, DERIVED_RULES } from './classes.js';
import { STRIKE, VERSES, VERSE_BY_ID, getVerse, poolFor } from './verses.js';
import { VOWS, CLASS_VOWS, STORY_VOWS, VOW_BY_ID, getVow, creationVowsFor, vowsFor } from './vows.js';
import { ITEMS, WEAPONS, VESTMENTS, RELICS, ITEM_BY_ID, getItem, itemsBySlot, affinityCount } from './items.js';
import { SOURCES, SOURCE_BY_ID, SOURCE_IDS, getSource } from './sources.js';
import { ENEMIES, ENEMY_BY_ID, getEnemy, enemyBuild, sequenceMembers, UNBOUND_VOICES, SUMMON_BODIES, TURNED_POUR_ALLY, COUNTER_LINES } from './enemies.js';
import { SIGNATURE_VERBS, SIGNATURE_VERB_COUNT } from './signature-verbs.js';
import { RITES } from './rites.js';
import { NAMED_ECHOES, RITE_USERS, FLOOR_POPULATION, ECHO_BY_ID } from './named-echoes.js';
import { CORVANE_SHEET_IDS, corvaneSheet, corvaneCounterbuild, detectLean, buildStringOf, COUNTER_RULES, NEUTRAL_LINE } from './corvane.js';
import { XP_THRESHOLDS, XP_ROLES, FIGHT_ROLES, CHAPTER_FIGHTS, xpForFight, chapterCompletionXp, statPointsForLevel, levelForXp, floorXp, FLOOR_FIRST_BIND_XP, FLOOR_FIRST_IMPORT_XP, campaignWalk, CAMPAIGN_TARGET_LINE } from './progression.js';
import { DOCTRINES, DOCTRINE_BY_ID, getDoctrine, DOCTRINE_IDS } from './doctrines.js';

export { CLASSES, CLASS_IDS, COUNTER_TABLE, STAT_KEYS, STAT_NAMES, STAT_ROLES, DERIVED_RULES };
export { STRIKE, VERSES, VERSE_BY_ID, getVerse, poolFor };
export { VOWS, CLASS_VOWS, STORY_VOWS, VOW_BY_ID, getVow, creationVowsFor, vowsFor };
export { ITEMS, WEAPONS, VESTMENTS, RELICS, ITEM_BY_ID, getItem, itemsBySlot, affinityCount };
export { SOURCES, SOURCE_BY_ID, SOURCE_IDS, getSource };
export { ENEMIES, ENEMY_BY_ID, getEnemy, enemyBuild, sequenceMembers, UNBOUND_VOICES, SUMMON_BODIES, TURNED_POUR_ALLY, COUNTER_LINES };
export { SIGNATURE_VERBS, SIGNATURE_VERB_COUNT };
export { RITES };
export { NAMED_ECHOES, RITE_USERS, FLOOR_POPULATION, ECHO_BY_ID };
export { CORVANE_SHEET_IDS, corvaneSheet, corvaneCounterbuild, detectLean, buildStringOf, COUNTER_RULES, NEUTRAL_LINE };
export { XP_THRESHOLDS, XP_ROLES, FIGHT_ROLES, CHAPTER_FIGHTS, xpForFight, chapterCompletionXp, statPointsForLevel, levelForXp, floorXp, FLOOR_FIRST_BIND_XP, FLOOR_FIRST_IMPORT_XP, campaignWalk, CAMPAIGN_TARGET_LINE };
export { DOCTRINES, DOCTRINE_BY_ID, getDoctrine, DOCTRINE_IDS };
export { validate, OPCODES };

/** Save-state stamp (T9.1 migrations read this). Bump on any content change. */
export const CONTENT_VERSION = { major: 5, minor: 0, patch: 0, stamp: 'phase-5.0.0' };

/** Deep freeze — content is immutable at runtime (T4.1 acceptance). */
export function deepFreeze(obj) {
  if (obj && typeof obj === 'object' && !Object.isFrozen(obj)) {
    Object.freeze(obj);
    for (const v of Object.values(obj)) deepFreeze(v);
  }
  return obj;
}

function fail(kind, row, why) {
  const id = row && typeof row === 'object' ? (row.id || row.name || '?') : '?';
  throw new Error(`data load failed: ${kind} "${id}" — ${why}`);
}

/** Validate one row against its T0.3 schema; throws with file-level context. */
function requireValid(kind, row, ctx, moduleName) {
  const res = validate(kind, row, ctx);
  if (!res.ok) {
    fail(kind, row, `${moduleName}: ${res.errors.join('; ')}`);
  }
  return row;
}

/**
 * Pure assembler: validate + index + freeze any content bundle.
 * Deterministic order (classes → verses → vows → items) so the failure
 * report is stable.
 */
export function assembleContent(bundle) {
  const b = bundle || {};
  // Clone before validating/freezing: the loader owns its copy, so the
  // module singletons stay untouched (tests may probe them) and the loaded
  // content is guaranteed immutable (T4.1 acceptance).
  const clone = (rows) => (rows || []).map((r) => structuredClone(r));
  const classes = clone(b.classes);
  const verses = clone(b.verses);
  const vows = clone(b.vows);
  const items = clone(b.items);
  const sources = clone(b.sources);

  const verseIds = verses.map((v) => v.id);
  const itemIds = items.map((i) => i.id);
  const vowObjs = vows.map((v) => ({ id: v.id, kind: v.kind, cls: v.cls }));
  const sourceIds = sources.map((s) => s.id);
  const ctx = { verseIds, itemIds, vowIds: vowObjs, sourceIds };

  // 1. sources first: every reward names one. Structural validation (no T0.3
  // kind exists for sources — they are the registry itself).
  const SOURCE_KINDS = ['choice', 'boss', 'fixed', 'vendor', 'floor', 'start', 'exploration', 'ending'];
  for (const s of sources) {
    if (typeof s.id !== 'string' || !s.id) fail('source', s, 'sources: id required');
    if (!SOURCE_KINDS.includes(s.kind)) fail('source', s, `sources: kind "${s.kind}" not in [${SOURCE_KINDS.join(', ')}]`);
    if (!Number.isInteger(s.chapter)) fail('source', s, 'sources: chapter must be an integer');
    if (!Array.isArray(s.grants)) fail('source', s, 'sources: grants must be an array');
    if (typeof s.line !== 'string' || !s.line) fail('source', s, 'sources: line required');
  }
  const sourceSet = new Set(sourceIds);

  // 2. classes (schema) + their verse references
  for (const c of classes) {
    requireValid('class', c, ctx, 'classes');
    for (const vid of c.verses) {
      if (!verseIds.includes(vid)) fail('class', c, `classes: verse "${vid}" not in the verse catalogue`);
    }
  }

  // 3. verses (schema + catalogue integrity)
  for (const v of verses) requireValid('verse', v, ctx, 'verses');

  // 4. vows (schema + source resolution)
  for (const v of vows) {
    requireValid('vow', v, ctx, 'vows');
    if (v.kind === 'story' && !sourceSet.has(v.source)) {
      fail('vow', v, `vows: story source "${v.source}" does not resolve against the source registry`);
    }
  }

  // 5. items (schema + source resolution + slot classes)
  for (const it of items) {
    requireValid('item', it, ctx, 'items');
    if (!sourceSet.has(it.source)) {
      fail('item', it, `items: source "${it.source}" does not resolve against the source registry`);
    }
  }

  // 6. grants cross-check: a source may only grant item ids that exist
  const itemSet = new Set(itemIds);
  for (const s of sources) {
    for (const g of s.grants) {
      if (!itemSet.has(g)) fail('source', s, `sources: grant "${g}" is not an item id in the catalogue`);
    }
  }

  // 7. indexes
  const verseById = new Map(verses.map((v) => [v.id, v]));
  const vowById = new Map(vows.map((v) => [v.id, v]));
  const itemById = new Map(items.map((i) => [i.id, i]));
  const sourceById = new Map(sources.map((s) => [s.id, s]));
  // unlock index: (class|common, level) → verse rows in priority order
  const unlockIndex = new Map();
  for (const c of classes) {
    for (let level = 1; level <= 10; level++) {
      unlockIndex.set(`${c.id}|${level}`, verses.filter((v) => (v.cls === 'common' || v.cls === c.id) && v.unlockLevel <= level));
    }
  }
  // affinity index: class → item ids that favour it
  const affinityIndex = new Map();
  for (const c of classes) {
    affinityIndex.set(c.id, items.filter((i) => i.affinity === c.id).map((i) => i.id));
  }
  // source → granted reward ids
  const grantsIndex = new Map();
  for (const s of sources) grantsIndex.set(s.id, s.grants || []);

  const content = {
    version: bundle.version ?? CONTENT_VERSION.stamp,
    classes, verses, vows, items, sources,
    indexes: {
      verseById, vowById, itemById, sourceById, unlockIndex, affinityIndex, grantsIndex,
      classIds: classes.map((c) => c.id),
    },
  };
  return deepFreeze(content);
}

/** The real content bundle (canonical modules). Strike rides with the
 *  catalogue: §6.1's common-hymn table counts it (6 common + 36 class = 42). */
export function realBundle() {
  return {
    version: CONTENT_VERSION.stamp,
    classes: Object.values(CLASSES),
    verses: [STRIKE, ...VERSES],
    vows: VOWS,
    items: ITEMS,
    sources: SOURCES,
  };
}

let REAL_CACHE = null;
/** Load + validate + freeze the real content (cached — one boot load). */
export function loadReal() {
  if (!REAL_CACHE) REAL_CACHE = assembleContent(realBundle());
  return REAL_CACHE;
}

/** The T0.3 validator registry for cross-checks (echoCode gear/vow ids…). */
export function makeRegistry(content) {
  return {
    verseIds: content.verses.map((v) => v.id),
    itemIds: content.items.map((i) => i.id),
    vowIds: content.vows.map((v) => ({ id: v.id, kind: v.kind, cls: v.cls })),
    sourceIds: content.sources.map((s) => s.id),
  };
}

/* ------------------------------------------------------------------ *
 * T4.6–T4.8 roster loader: the 21-fight roster, the 21 signature verbs,
 * the Rites registry and the Floor parish — validated against the FROZEN
 * T0.3 `enemy` / `namedEcho` / `rite` kinds (each rite TRIGGER entry is a
 * canon rite object) and cross-referenced, then deep-frozen. Bad rows fail
 * loudly with kind/row/field, exactly like assembleContent.
 * ------------------------------------------------------------------ */

function rosterFail(kind, row, why) {
  const id = row && typeof row === 'object' ? (row.id || row.name || '?') : '?';
  throw new Error(`roster load failed: ${kind} "${id}" — ${why}`);
}

/** Pure: validate + cross-reference + freeze the whole roster bundle. */
export function assembleRoster(bundle = {}) {
  const clone = (rows) => (rows || []).map((r) => structuredClone(r));
  const enemies = clone(bundle.enemies ?? ENEMIES);
  const verbs = bundle.verbs ?? SIGNATURE_VERBS;
  const rites = bundle.rites ?? RITES;
  const echoes = clone(bundle.echoes ?? NAMED_ECHOES);
  const riteUsers = clone(bundle.riteUsers ?? RITE_USERS);
  const voices = clone(bundle.voices ?? UNBOUND_VOICES);
  const bodies = bundle.bodies ?? SUMMON_BODIES;
  const ally = bundle.ally ?? TURNED_POUR_ALLY;

  // 1. enemies against the frozen `enemy` kind (D7 budget cross-check runs
  //    inside the validator; Mother Bell's `hybrid` is the declared A6 skip).
  for (const e of enemies) {
    const res = validate('enemy', e, {});
    if (!res.ok) rosterFail('enemy', e, res.errors.join('; '));
    // build payload cross-refs: verse ids exist; scripted ids exist; rite ids exist
    for (const vid of e.verses || []) {
      if (!VERSE_BY_ID.has(vid)) rosterFail('enemy', e, `verse "${vid}" not in the verse catalogue`);
    }
    for (const s of e.script || []) {
      const id = s.endsWith('*') ? s.slice(0, -1) : s;
      if (!VERSE_BY_ID.has(id)) rosterFail('enemy', e, `script verse "${id}" not in the verse catalogue`);
    }
    if (e.rite && !rites[e.rite]) rosterFail('enemy', e, `rite "${e.rite}" not in the rites registry`);
    if (e.sequence) {
      const n = (e.sequence.count || 1) - 1;
      const members = bundle.sequenceMembers ? bundle.sequenceMembers(e) : sequenceMembers(e);
      if (members.length !== n) rosterFail('enemy', e, `sequence needs ${n} extra members, got ${members.length}`);
      if (!verbs[e.signature]) rosterFail('enemy', e, `signature verb "${e.signature}" missing`);
    }
    if (!verbs[e.signature]) rosterFail('enemy', e, `signature verb "${e.signature}" missing`);
  }
  if (enemies.length !== 21) rosterFail('roster', {}, `expected 21 duels, got ${enemies.length}`);
  // every signature verb is used exactly once (21 verbs / 21 duels)
  const used = new Set(enemies.map((e) => e.signature));
  if (used.size !== 21) rosterFail('roster', {}, 'signature verbs must be 21 distinct rows');
  for (const id of Object.keys(verbs)) {
    if (!used.has(id)) rosterFail('signature-verb', { id }, 'verb defined but unused by the roster');
  }

  // 2. rite registry rows: each trigger entry validates as the canon rite
  //    object; locked verse ids and summon bodies resolve.
  for (const [rid, rite] of Object.entries(rites)) {
    if (rite.id !== rid) rosterFail('rite', rite, `registry key ${rid} != row id`);
    if (!Array.isArray(rite.triggers) || rite.triggers.length < 1) rosterFail('rite', rite, 'triggers required');
    for (let ti = 0; ti < rite.triggers.length; ti++) {
      const t = rite.triggers[ti];
      // Each trigger entry IS a canon rite object (§5.7 {trigger, change,
      // line}) — validate it under the frozen kind with a synthetic id.
      const res = validate('rite', { id: `${rid}#${ti}`, ...t }, {});
      if (!res.ok) rosterFail('rite', rite, `trigger ${ti}: ${res.errors.join('; ')}`);
      const locked = t.change?.flags?.castEveryTurn;
      if (locked && !VERSE_BY_ID.has(locked)) rosterFail('rite', rite, `castEveryTurn verse "${locked}" unknown`);
      const pool = t.change?.versePool || t.change?.flags?.versePool;
      if (pool) for (const id of pool) {
        if (!VERSE_BY_ID.has(id)) rosterFail('rite', rite, `versePool verse "${id}" unknown`);
      }
      if (t.change?.flags?.summonGuard && !bodies[t.change.flags.summonGuard]) {
        rosterFail('rite', rite, `summon body "${t.change.flags.summonGuard}" unknown`);
      }
    }
    if (rite.startFlags?.versePool) {
      for (const id of rite.startFlags.versePool) {
        if (!VERSE_BY_ID.has(id)) rosterFail('rite', rite, `startFlags versePool "${id}" unknown`);
      }
    }
  }

  // 3. the Floor parish: 8 named Echoes + 4 Rite-users, schema + legality.
  for (const e of echoes) {
    const res = validate('namedEcho', e, {});
    if (!res.ok) rosterFail('namedEcho', e, res.errors.join('; '));
  }
  for (const e of riteUsers) {
    const res = validate('namedEcho', e, {});
    if (!res.ok) rosterFail('riteUser', e, res.errors.join('; '));
    if (!rites[e.rite]) rosterFail('riteUser', e, `rite "${e.rite}" not in the rites registry`);
  }
  if (echoes.length !== 8) rosterFail('roster', {}, `expected 8 named Echoes, got ${echoes.length}`);
  if (riteUsers.length !== 4) rosterFail('roster', {}, `expected 4 Rite-users, got ${riteUsers.length}`);
  // build cross-refs for every parish row
  for (const e of [...echoes, ...riteUsers]) {
    for (const vid of e.build?.verses || []) {
      if (!VERSE_BY_ID.has(vid)) rosterFail('namedEcho', e, `verse "${vid}" not in the catalogue`);
      if (VERSE_BY_ID.get(vid).unlockLevel > e.level) {
        rosterFail('namedEcho', e, `verse "${vid}" unlocks at L${VERSE_BY_ID.get(vid).unlockLevel} > row level ${e.level}`);
      }
    }
    if (e.build?.vow) {
      const vow = VOW_BY_ID.get(e.build.vow);
      if (!vow) rosterFail('namedEcho', e, `vow "${e.build.vow}" not in the vow catalogue`);
      else if (vow.kind === 'class' && vow.cls !== e.cls) rosterFail('namedEcho', e, `vow "${vow.id}" is not available to ${e.cls}`);
      else if (vow.kind === 'story') rosterFail('namedEcho', e, `story vow "${vow.id}" cannot appear on a Floor Echo`);
    }
    if (e.build?.special?.debuffImmune
      && (e.build.special.debuffImmune.includes('bleed') || e.build.special.debuffImmune.includes('burn'))) {
      rosterFail('namedEcho', e, 'debuffImmune may not cover bleed/burn — the canon weaknesses rely on DoT landing');
    }
  }

  // 4. sequence voices + summon bodies sum to their level budget (D7).
  for (const v of voices) {
    const sum = STAT_KEYS.reduce((s, k) => s + v.stats[k], 0);
    if (sum !== 33 + 2 * (v.level - 1)) rosterFail('voice', v, `stats sum ${sum} vs budget ${33 + 2 * (v.level - 1)}`);
  }
  for (const [bid, b] of Object.entries(bodies)) {
    const sum = STAT_KEYS.reduce((s, k) => s + b.stats[k], 0);
    if (sum !== 33 + 2 * (b.level - 1)) rosterFail('summon', { id: bid }, `stats sum ${sum} vs budget ${33 + 2 * (b.level - 1)}`);
  }

  return deepFreeze({
    enemies, verbs: deepFreeze({ ...verbs }), rites: deepFreeze(structuredClone(rites)),
    echoes, riteUsers, voices, bodies, ally,
    counterLines: deepFreeze({ ...COUNTER_LINES }),
  });
}

let ROSTER_CACHE = null;
/** Load + validate + freeze the real roster (cached — one boot load). */
export function loadRoster() {
  if (!ROSTER_CACHE) ROSTER_CACHE = assembleRoster();
  return ROSTER_CACHE;
}
