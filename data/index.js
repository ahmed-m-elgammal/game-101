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

const { validate, OPCODES } = require('./schemas/validators.js');
const { CLASSES, CLASS_IDS, COUNTER_TABLE, STAT_KEYS, STAT_NAMES, STAT_ROLES, DERIVED_RULES } = require('./classes.js');
const { STRIKE, VERSES, VERSE_BY_ID, getVerse, poolFor } = require('./verses.js');
const { VOWS, CLASS_VOWS, STORY_VOWS, VOW_BY_ID, getVow, creationVowsFor, vowsFor } = require('./vows.js');
const { ITEMS, WEAPONS, VESTMENTS, RELICS, ITEM_BY_ID, getItem, itemsBySlot, affinityCount } = require('./items.js');
const { SOURCES, SOURCE_BY_ID, SOURCE_IDS, getSource } = require('./sources.js');








/** Save-state stamp (T9.1 migrations read this). Bump on any content change. */
const CONTENT_VERSION = { major: 4, minor: 0, patch: 0, stamp: 'phase-4.0.0' };

/** Deep freeze — content is immutable at runtime (T4.1 acceptance). */
function deepFreeze(obj) {
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
function assembleContent(bundle) {
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
function realBundle() {
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
function loadReal() {
  if (!REAL_CACHE) REAL_CACHE = assembleContent(realBundle());
  return REAL_CACHE;
}

/** The T0.3 validator registry for cross-checks (echoCode gear/vow ids…). */
function makeRegistry(content) {
  return {
    verseIds: content.verses.map((v) => v.id),
    itemIds: content.items.map((i) => i.id),
    vowIds: content.vows.map((v) => ({ id: v.id, kind: v.kind, cls: v.cls })),
    sourceIds: content.sources.map((s) => s.id),
  };
}


module.exports = { deepFreeze, assembleContent, realBundle, loadReal, makeRegistry, CONTENT_VERSION, CLASSES, CLASS_IDS, COUNTER_TABLE, STAT_KEYS, STAT_NAMES, STAT_ROLES, DERIVED_RULES, STRIKE, VERSES, VERSE_BY_ID, getVerse, poolFor, VOWS, CLASS_VOWS, STORY_VOWS, VOW_BY_ID, getVow, creationVowsFor, vowsFor, ITEMS, WEAPONS, VESTMENTS, RELICS, ITEM_BY_ID, getItem, itemsBySlot, affinityCount, SOURCES, SOURCE_BY_ID, SOURCE_IDS, getSource, validate, OPCODES };
