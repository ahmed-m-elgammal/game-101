/**
 * build.js — T5.1: build assembly & validation. [GDD] §12.6 (validation
 * list), §12.1, §6 (slot order = priority), §13 (stat points), N1.
 *
 * THE single function that turns (class, level, alloc, vow, ≤4 ordered
 * verses, 3 gear, doctrine) into a validated fighter build — used by
 * creation, the Hymnal (T5.2), Echo Codes (T7.1), and every harness
 * profile. One validator, everywhere; zero divergence from buildSheet
 * (asserted in tests/phase5-build.test.js).
 *
 * Legality (every rejection carries a stable reason code):
 *   - level 1–10
 *   - alloc totals EXACTLY 4 + 2×(level−1). §12.6 speaks "do not exceed";
 *     N1 forbids loosening. This engine's standing contract (Phase-1
 *     validateAlloc) is exact totals: stat points are granted, never banked,
 *     so an under-budget build cannot arise from a real run. Over-budget is
 *     the N1 attack; under-budget is a malformed code. Both are rejected
 *     with distinct codes that name the numbers.
 *   - per-stat final (class base + alloc) ≤ stat cap 10
 *   - verses: unlocked at that level, class or common, no duplicates,
 *     ≤4 slots, Strike never slotted (implicit — §6)
 *   - vow: exists; class vows bind their class; story vows must be in the
 *     injected story-state (which story vows are earned THIS run — the
 *     campaign passes it; §7.2); the hidden vow only via the explicit
 *     allowHiddenVow path (§7.2 "excluded from every picker")
 *   - gear ids exist, in their slot, no duplicates
 *   - doctrine exists (data/doctrines.js, §12.2); Cantor's Hand's canon
 *     reservation (Rite users + one named Echo) is reason-coded unless the
 *     build declares the reservation satisfied
 *
 * Canonical serialization (stable key order): canonicalBuild()/serializeBuild()
 * produce the exact string the RNG seeds from and the Echo Code encodes —
 * two key orders of the same loadout serialize byte-identically.
 *
 * The creation/levelUps split (buildSheet's shape) is deterministic: points
 * fill creation first in canonical STAT_KEYS order (vig→mig→wit→grd→hst),
 * the rest go to level-ups. finalStats() sums both, so the split never
 * changes the assembled fighter.
 */

const { CLASSES, CLASS_IDS, STAT_KEYS } = require('../data/classes.js');
const { VERSE_BY_ID, STRIKE } = require('../data/verses.js');
const { VOW_BY_ID } = require('../data/vows.js');
const { ITEM_BY_ID } = require('../data/items.js');
const { DOCTRINE_BY_ID } = require('../data/doctrines.js');
const { RITES } = require('../data/rites.js');
const { CANON } = require('../data/config.js');

/** §12.6: "stat points do not exceed 4 + 2 × (level − 1)". */
function statBudget(level) {
  return 4 + 2 * (level - 1);
}

const GEAR_SLOTS = ['weapon', 'vestment', 'relic'];

function isInt(n) { return typeof n === 'number' && Number.isInteger(n); }

/** Normalize the two accepted input dialects into one shape to validate. */
function normalizeInput(input) {
  const out = {
    name: input.name,
    clazz: input.clazz != null ? input.clazz : input.cls,
    level: input.level,
    vow: input.vow != null ? input.vow : null,
    verses: Array.isArray(input.verses) ? input.verses.slice() : [],
    doctrine: input.doctrine,
    rite: input.rite != null ? input.rite : null,
    storyState: Array.isArray(input.storyState) ? input.storyState.slice() : [],
    allowReservedDoctrine: !!input.allowReservedDoctrine,
    allowHiddenVow: !!input.allowHiddenVow,
    riteUsers: input.riteUsers,
  };
  // alloc: explicit dict, or creation+levelUps summed elementwise
  if (input.alloc) {
    out.alloc = { ...input.alloc };
  } else if (input.creation || input.levelUps) {
    out.alloc = {};
    for (const k of STAT_KEYS) {
      out.alloc[k] = (input.creation?.[k] || 0) + (input.levelUps?.[k] || 0);
    }
  } else {
    out.alloc = null;
  }
  // gear: slot object or flat array [weapon, vestment, relic]
  if (Array.isArray(input.gear)) {
    out.gear = { weapon: input.gear[0] ?? null, vestment: input.gear[1] ?? null, relic: input.gear[2] ?? null };
  } else if (Array.isArray(input.items)) {
    out.gear = { weapon: input.items[0] ?? null, vestment: input.items[1] ?? null, relic: input.items[2] ?? null };
  } else if (input.gear && typeof input.gear === 'object') {
    out.gear = { weapon: input.gear.weapon ?? null, vestment: input.gear.vestment ?? null, relic: input.gear.relic ?? null };
  } else {
    out.gear = { weapon: null, vestment: null, relic: null };
  }
  return out;
}

/**
 * Validate + assemble. @returns {{ok, build?, errors: Array<{code, field, message}>}}
 * `errors` is empty exactly when ok — every rejection names its reason code.
 */
function assembleBuild(input, tuning = CANON) {
  const errors = [];
  const add = (code, field, message) => errors.push({ code, field, message });
  const norm = normalizeInput(input || {});

  // -- class ---------------------------------------------------------- §5.2
  const cls = CLASSES[norm.clazz];
  if (!cls) add('CLASS_UNKNOWN', 'clazz', `unknown class "${norm.clazz}" (known: ${CLASS_IDS.join(', ')})`);

  // -- level ---------------------------------------------------------- §13
  if (!isInt(norm.level) || norm.level < 1 || norm.level > 10) {
    add('LEVEL_RANGE', 'level', `level must be an integer 1–10 (got ${norm.level})`);
  }
  if (errors.length) return { ok: false, errors }; // further checks need these

  // -- allocation ----------------------------------------------------- §12.6, N1
  const budget = statBudget(norm.level);
  let alloc = null;
  if (!norm.alloc) {
    add('ALLOC_SHAPE', 'alloc', 'alloc (or creation/levelUps) is required');
  } else {
    let shapeOk = true;
    let total = 0;
    for (const k of STAT_KEYS) {
      const v = norm.alloc[k];
      if (!isInt(v) || v < 0) { add('ALLOC_SHAPE', `alloc.${k}`, `must be a non-negative integer (got ${v})`); shapeOk = false; }
      else total += v;
    }
    if (shapeOk) {
      if (total > budget) {
        add('ALLOC_OVER', 'alloc', `${total} points exceeds the L${norm.level} cap of ${budget} (N1: the validator is never loosened for bad examples)`);
      } else if (total < budget) {
        add('ALLOC_SHORTFALL', 'alloc', `${total} of ${budget} points assigned — stat points are granted 4 + 2×(level−1) and never banked; every point must be assigned`);
      } else {
        alloc = norm.alloc;
      }
    }
  }
  if (alloc) {
    for (const k of STAT_KEYS) {
      const final = cls.stats[k] + alloc[k];
      if (final > tuning.statCap) {
        add('STAT_CAP', `alloc.${k}`, `${cls.name} ${k} would reach ${final} — the cap is ${tuning.statCap}`);
      }
    }
  }

  // -- verses ------------------------------------------------------- §6, §6.1–6.5
  const verses = [];
  if (norm.verses.length > 4) {
    add('VERSE_SLOT_LIMIT', 'verses', `${norm.verses.length} slotted — the Hymnal holds 4 ordered slots (Strike is implicit)`);
  }
  const seen = new Set();
  for (const id of norm.verses) {
    const v = VERSE_BY_ID.get(id);
    if (!v) { add('VERSE_UNKNOWN', 'verses', `unknown verse "${id}"`); continue; }
    if (v.isStrike) { add('VERSE_STRIKE_IMPLICIT', 'verses', 'Strike is always available and is never slotted'); continue; }
    if (v.cls !== 'common' && v.cls !== norm.clazz) {
      add('VERSE_CLASS', 'verses', `"${id}" belongs to ${v.cls}, not ${norm.clazz}`);
      continue;
    }
    if (v.unlockLevel > norm.level) {
      add('VERSE_UNLOCK', 'verses', `"${id}" unlocks at L${v.unlockLevel} (build is L${norm.level})`);
      continue;
    }
    if (seen.has(id)) { add('VERSE_DUP', 'verses', `"${id}" slotted twice — one slot each`); continue; }
    seen.add(id);
    verses.push(id);
  }

  // -- vow ------------------------------------------------------- §7.1, §7.2
  let vow = null;
  if (norm.vow != null) {
    const row = VOW_BY_ID.get(norm.vow);
    if (!row) add('VOW_UNKNOWN', 'vow', `unknown vow "${norm.vow}"`);
    else if (row.kind === 'story') {
      if (row.hidden && !norm.allowHiddenVow) {
        add('VOW_HIDDEN', 'vow', `"${norm.vow}" is hidden — excluded from every picker (§7.2)`);
      } else if (row.cls && row.cls !== 'any' && row.cls !== norm.clazz) {
        // story vows bind their class too (§12.6: "available to that class
        // and story-state" — e.g. Grey Duelist never fits a Cantor)
        add('VOW_CLASS', 'vow', `"${norm.vow}" is a ${row.cls} story vow — ${norm.clazz} cannot take it`);
      } else if (!norm.storyState.includes(norm.vow)) {
        add('VOW_STORY_LOCKED', 'vow', `"${norm.vow}" is not in this run's story state (earned: [${norm.storyState.join(', ') || 'none'}])`);
      } else vow = norm.vow;
    } else if (row.cls !== norm.clazz) {
      // class vows bind their class (§7.1)
      add('VOW_CLASS', 'vow', `"${norm.vow}" is a ${row.cls} vow — ${norm.clazz} cannot take it`);
    } else vow = norm.vow;
  }

  // -- gear ------------------------------------------------------------ §8
  // (each slot holds one id by shape, so a duplicate cannot occupy two
  // legal slots — mis-slotting is the only reachable gear error)
  const items = [];
  for (const slot of GEAR_SLOTS) {
    const id = norm.gear[slot];
    if (id == null) continue;
    const row = ITEM_BY_ID.get(id);
    if (!row) { add('GEAR_UNKNOWN', `gear.${slot}`, `unknown item "${id}"`); continue; }
    if (row.slot !== slot) { add('GEAR_SLOT', `gear.${slot}`, `"${id}" is a ${row.slot}, not a ${slot}`); continue; }
    items.push(id);
  }

  // -- doctrine ----------------------------------------------------- §12.2
  if (!norm.doctrine) {
    add('DOCTRINE_UNKNOWN', 'doctrine', 'a doctrine is required (§12.2)');
  } else {
    const d = DOCTRINE_BY_ID.get(norm.doctrine);
    if (!d) add('DOCTRINE_UNKNOWN', 'doctrine', `unknown doctrine "${norm.doctrine}" (known: hymnal, predator, bulwark, cantors_hand)`);
    else if (d.reserved && !norm.rite && !norm.allowReservedDoctrine) {
      add('DOCTRINE_RESERVED', 'doctrine', `"${norm.doctrine}" is reserved — ${d.reservedNote}`);
    }
  }

  // -- rite (optional) ------------------------------------------------- §5.7
  if (norm.rite != null && !RITES[norm.rite]) {
    add('RITE_UNKNOWN', 'rite', `unknown rite "${norm.rite}"`);
  }

  // -- name (optional; defaults to the class name like buildSheet) --------
  let name = norm.name;
  if (name != null && typeof name !== 'string') {
    add('NAME_TYPE', 'name', 'name must be a string');
  }

  if (errors.length) return { ok: false, errors };

  // -- deterministic creation/levelUps split (see header) ------------------
  const creation = {};
  const levelUps = {};
  let left = tuning.creationPoints;
  for (const k of STAT_KEYS) {
    const p = alloc[k];
    const toCreation = Math.min(left, p);
    creation[k] = toCreation;
    levelUps[k] = p - toCreation;
    left -= toCreation;
  }

  const build = {
    name: (name && name.trim()) || cls.name,
    clazz: norm.clazz,
    level: norm.level,
    creation,
    levelUps,
    vow,
    verses,
    items,
    doctrine: norm.doctrine,
    rite: norm.rite,
  };
  return { ok: true, build, errors: [] };
}

/** Validate without assembling (Hymnal preview, Echo Code import checks). */
function validateBuild(input, tuning = CANON) {
  const r = assembleBuild(input, tuning);
  return { ok: r.ok, errors: r.errors };
}

/**
 * Canonical build object — stable key order (STAT_KEYS order inside alloc,
 * fixed gear slots). This is what the RNG derives its seed from and what
 * the Echo Code encodes (§12.6). Order of `verses` is PRESERVED — slot
 * order is the Echo's priority (§6, §14.4).
 */
function canonicalBuild(input) {
  const r = assembleBuild(input);
  if (!r.ok) {
    throw new Error('cannot serialize an illegal build: ' + r.errors.map((e) => `${e.code}(${e.field})`).join('; '));
  }
  const b = r.build;
  const alloc = {};
  for (const k of STAT_KEYS) alloc[k] = b.creation[k] + b.levelUps[k];
  return {
    v: 1,
    name: b.name,
    cls: b.clazz,
    level: b.level,
    alloc,
    vow: b.vow,
    verses: b.verses.slice(),
    gear: {
      weapon: b.items[0] ?? null,
      vestment: b.items[1] ?? null,
      relic: b.items[2] ?? null,
    },
    doctrine: b.doctrine,
    rite: b.rite,
  };
}

/** The canonical string. Two key orders of one loadout → byte-identical. */
function serializeBuild(input) {
  return JSON.stringify(canonicalBuild(input));
}


module.exports = { statBudget, assembleBuild, validateBuild, canonicalBuild, serializeBuild };
