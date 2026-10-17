// validators.js — T0.3: canonical data shapes for The Ashen Choir.
// Zero dependencies. Every content row must validate against one of these
// before it ships. `validate(kind, obj, ctx)` -> { ok, errors: string[] }.
// Registries (verse/item/vow ids) are injected via ctx so Phase 4 data can
// register without editing this file. Fixtures: data/schemas/fixtures.json.
'use strict';

const STAT_KEYS = ['vig', 'mig', 'wit', 'grd', 'hst'];
const CLASSES = ['ashblade', 'cinder_witch', 'gravewarden', 'hollow_cantor'];
const TALLIES = ['mercy', 'ruthless', 'devotion'];
const DAMAGE_TYPES = ['steel', 'ember', 'shade', 'true'];
// Effect op-codes: the full vocabulary every verse/vow/mark compiles to (T0.3).
const OPCODES = [
  'damage', 'bleed+', 'burn', 'curse', 'fray', 'hush', 'brace', 'ward', 'thorns',
  'stun', 'heal', 'resolve', 'cleanse', 'mitigation_mod', 'crit_mod', 'dot_mod',
  'conditional', 'once_per_fight',
];

function isObj(x) { return x !== null && typeof x === 'object' && !Array.isArray(x); }

function checkObj(obj, spec, errors, prefix = '') {
  for (const [key, rule] of Object.entries(spec)) {
    const val = obj[key];
    if (val === undefined || val === null) { // null = explicitly absent (e.g. enemy.rite: null)
      if (rule.required) errors.push(`${prefix}${key}: required`);
      continue;
    }
    if (rule.type === 'object' && isObj(val)) { checkObj(val, rule.fields || {}, errors, `${prefix}${key}.`); continue; }
    if (rule.type === 'array') {
      if (!Array.isArray(val)) { errors.push(`${prefix}${key}: must be an array`); continue; }
      if (rule.minLen !== undefined && val.length < rule.minLen) errors.push(`${prefix}${key}: needs ≥${rule.minLen} items`);
      if (rule.items === 'string' && val.some((v) => typeof v !== 'string')) errors.push(`${prefix}${key}: non-string item`);
      if (rule.items === 'object' && val.some((v) => !isObj(v))) errors.push(`${prefix}${key}: non-object item`);
      continue;
    }
    if (rule.enum && !rule.enum.includes(val)) { errors.push(`${prefix}${key}: "${val}" not in [${rule.enum.join(', ')}]`); continue; }
    if (rule.type === 'int' && (!Number.isInteger(val))) { errors.push(`${prefix}${key}: must be an integer`); continue; }
    if (rule.type === 'number' && typeof val !== 'number') { errors.push(`${prefix}${key}: must be a number`); continue; }
    if (rule.type === 'string' && typeof val !== 'string') { errors.push(`${prefix}${key}: must be a string`); continue; }
    if (rule.type === 'boolean' && typeof val !== 'boolean') { errors.push(`${prefix}${key}: must be a boolean`); continue; }
    if (rule.min !== undefined && val < rule.min) errors.push(`${prefix}${key}: below min ${rule.min}`);
    if (rule.max !== undefined && val > rule.max) errors.push(`${prefix}${key}: above max ${rule.max}`);
  }
  return errors;
}

const effectsSpec = {
  type: 'array', minLen: 1, items: 'object',
  fields: {}, // op-codes checked below
};
function checkEffects(obj, errors, prefix = '') {
  if (!Array.isArray(obj.effects) || obj.effects.length === 0) { errors.push(`${prefix}effects: at least one op-code required`); return; }
  obj.effects.forEach((e, i) => {
    if (!isObj(e) || typeof e.op !== 'string') { errors.push(`${prefix}effects[${i}]: missing op`); return; }
    if (!OPCODES.includes(e.op)) errors.push(`${prefix}effects[${i}].op: unknown op-code "${e.op}"`);
  });
}

// ---------------------------------------------------------------------------
// Schema catalogue (T0.3 — frozen shapes)
// ---------------------------------------------------------------------------
const SCHEMAS = {
  class: {
    id: { type: 'string', required: true }, name: { type: 'string', required: true },
    stats: { type: 'object', required: true, fields: STAT_KEYS.reduce((a, k) => ({ ...a, [k]: { type: 'int', required: true, min: 0, max: 27 } }), {}) },
    damageType: { type: 'string', required: true, enum: DAMAGE_TYPES },
    verses: { type: 'array', required: true, minLen: 9, items: 'string' },
  },
  verse: {
    id: { type: 'string', required: true }, name: { type: 'string', required: true },
    cls: { type: 'string', required: true, enum: [...CLASSES, 'common'] },
    cost: { type: 'int', required: true, min: 0, max: 10 },
    cd: { type: 'int', required: true, min: 0, max: 10 },
    unlockLevel: { type: 'int', required: true, min: 1, max: 10 },
    effects: effectsSpec.effects === undefined ? { type: 'array', required: true, minLen: 1, items: 'object' } : {},
  },
  vow: {
    id: { type: 'string', required: true }, name: { type: 'string', required: true },
    kind: { type: 'string', required: true, enum: ['class', 'story'] },
    cls: { type: 'string', enum: [...CLASSES, 'any'] },
    source: { type: 'string' }, // story vows: e.g. "ch4_devotion" — required when kind=story
    effects: { type: 'array', required: true, minLen: 1, items: 'object' },
  },
  item: {
    id: { type: 'string', required: true }, name: { type: 'string', required: true },
    slot: { type: 'string', required: true, enum: ['weapon', 'vestment', 'relic'] },
    affinity: { type: 'string', required: true, enum: [...CLASSES, 'any'] },
    stats: { type: 'object', required: true, fields: STAT_KEYS.reduce((a, k) => ({ ...a, [k]: { type: 'int', min: 0, max: 3 } }), {}) },
    mark: { type: 'array', required: true, minLen: 1, items: 'object' }, // exactly one mark, as op-codes
    source: { type: 'string', required: true },
  },
  enemy: {
    id: { type: 'string', required: true }, name: { type: 'string', required: true },
    cls: { type: 'string', required: true, enum: [...CLASSES, 'mixed', 'varies', 'hybrid'] },
    level: { type: 'int', required: true, min: 1, max: 10 },
    alloc: { type: 'object', required: true, fields: STAT_KEYS.reduce((a, k) => ({ ...a, [k]: { type: 'int', required: true, min: 0, max: 27 } }), {}) },
    hp: { type: 'int', required: true, min: 1 },
    hpOverride: { type: 'boolean', required: true },
    signature: { type: 'string', required: true }, // signature verb id — 21 total, one per enemy
    counterLine: { type: 'string', required: true },
    rite: { type: 'string' }, // rite id, when the enemy carries one
  },
  rite: {
    id: { type: 'string', required: true },
    trigger: { type: 'object', required: true, fields: { atHP: { type: 'number', min: 0, max: 1 }, onTurn: { type: 'int', min: 1, max: 20 } } },
    change: { type: 'object', required: true, fields: { damageType: { type: 'string', enum: DAMAGE_TYPES }, statMults: { type: 'object' }, versePool: { type: 'array', items: 'string' } } },
    line: { type: 'string', required: true },
  },
  namedEcho: {
    id: { type: 'string', required: true }, name: { type: 'string', required: true },
    cls: { type: 'string', required: true, enum: CLASSES },
    level: { type: 'int', required: true, min: 1, max: 10 },
    toll: { type: 'int', required: true, min: 100, max: 1900 },
    history: { type: 'string', required: true },
    weakness: { type: 'string', required: true }, // deliberate weakness = the lesson
    recasts: { type: 'int', required: true, min: 0, max: 3 },
  },
  chapter: {
    id: { type: 'string', required: true }, act: { type: 'int', required: true, min: 1, max: 3 },
    index: { type: 'int', required: true, min: 1, max: 9 },
    levelBand: { type: 'array', required: true, minLen: 2, items: 'string' }, // e.g. ["1","2"]
    duels: { type: 'array', required: true, minLen: 2, items: 'string' },
    choiceId: { type: 'string', required: true },
    hasShrine: { type: 'boolean', required: true },
  },
  choice: {
    id: { type: 'string', required: true }, chapter: { type: 'string', required: true },
    prompt: { type: 'string', required: true },
    options: {
      type: 'array', required: true, minLen: 3, items: 'object',
      fields: { tally: { type: 'string', required: true, enum: TALLIES }, reward: { type: 'object' } },
    },
  },
  objective: {
    id: { type: 'string', required: true }, chapter: { type: 'int', required: true, min: 1, max: 9 },
    text: { type: 'string', required: true }, // one player-facing line, phrased as a challenge rune
    test: { type: 'string', required: true }, // machine-checkable fight-modifier key
    reward: { type: 'object', required: true, fields: { xp: { type: 'int', required: true, min: 0, max: 5 }, deed: { type: 'string' } } },
  },
  deed: {
    id: { type: 'string', required: true }, name: { type: 'string', required: true },
    marenLine: { type: 'string', required: true },
    unlock: { type: 'object', required: true }, // data predicate; never a currency, never a gate
  },
  vendorEntry: {
    item: { type: 'string', required: true },
    costMemories: { type: 'int', required: true, min: 1, max: 1 }, // exactly one memory each
    restock: { type: 'boolean', required: true }, // must be false — Pell never restocks
  },
  saveState: {
    version: { type: 'int', required: true, min: 1 },
    run: { type: 'object', required: true, fields: {
      chapter: { type: 'int', required: true, min: 1, max: 9 }, level: { type: 'int', required: true, min: 1, max: 10 },
      xp: { type: 'int', required: true, min: 0 }, tallies: { type: 'object', required: true },
      memoriesSold: { type: 'array', items: 'string' },
    } },
    loadouts: { type: 'array', required: true, minLen: 1, items: 'object' }, // 2 when the Twin Ledger is earned (D3)
    floor: { type: 'object', required: true, fields: { toll: { type: 'int', min: 100, max: 1900 }, bound: { type: 'boolean' }, ward: { type: 'boolean' } } },
    settings: { type: 'object', required: true, fields: { countersOptIn: { type: 'boolean' } } },
  },
  echoCode: {
    v: { type: 'int', required: true, enum: [1, 2] },
    name: { type: 'string', required: true },
    cls: { type: 'string', required: true, enum: CLASSES },
    level: { type: 'int', required: true, min: 1, max: 10 },
    alloc: { type: 'object', required: true, fields: STAT_KEYS.reduce((a, k) => ({ ...a, [k]: { type: 'int', required: true, min: 0, max: 10 } }), {}) },
    vow: { type: 'string', required: true },
    verses: { type: 'array', required: true, minLen: 4, maxLen: undefined, items: 'string' },
    gear: { type: 'object', required: true, fields: { weapon: { type: 'string' }, vestment: { type: 'string' }, relic: { type: 'string' } } },
    doctrine: { type: 'string', required: true },
    rite: { type: 'string' },
    tally: { type: 'object' },
  },
};

// ---------------------------------------------------------------------------
// Cross-field rules that the shape checker cannot express
// ---------------------------------------------------------------------------
function crossChecks(kind, obj, ctx, errors) {
  if (kind === 'echoCode') {
    const sum = STAT_KEYS.reduce((a, k) => a + (obj.alloc[k] || 0), 0);
    const cap = 4 + 2 * (obj.level - 1);
    if (sum > cap) errors.push(`alloc: ${sum} points exceeds the L${obj.level} cap of ${cap} (N1: the validator is never loosened for bad examples)`);
    if (obj.v === 2 && obj.tally && typeof obj.tally === 'object') {
      const tsum = TALLIES.reduce((a, k) => a + (obj.tally[k] || 0), 0);
      if (tsum > 9) errors.push(`tally: ${tsum} choices recorded, campaign holds 9`);
    }
    const reg = ctx || {};
    if (reg.verseIds) obj.verses.forEach((v) => { if (!reg.verseIds.includes(v)) errors.push(`verses: unknown verse id "${v}"`); });
    if (reg.itemIds) Object.values(obj.gear).forEach((g) => { if (g && !reg.itemIds.includes(g)) errors.push(`gear: unknown item id "${g}"`); });
    if (reg.vowIds && !reg.vowIds.some((v) => v.id === obj.vow)) errors.push(`vow: unknown vow id "${obj.vow}"`);
    if (reg.vowIds) {
      const vow = reg.vowIds.find((v) => v.id === obj.vow);
      if (vow && vow.kind === 'story' && !(obj.tally && Object.keys(obj.tally).length)) errors.push(`vow: story vow "${obj.vow}" requires run story-state (v2 tally) — not valid on a bare v1 code`);
      if (vow && vow.cls && vow.cls !== 'any' && vow.cls !== obj.cls) errors.push(`vow: "${obj.vow}" is not available to class ${obj.cls}`);
    }
  }
  if (kind === 'enemy') {
    const sum = STAT_KEYS.reduce((a, k) => a + (obj.alloc[k] || 0), 0);
    const budget = 33 + 2 * (obj.level - 1); // D7/N5: 27 base + 4 creation + 2 practice — matches every canon row (Bram 33 at L1, Ilvane 51 at L10)
    const override = obj.cls === 'hybrid'; // Mother Bell's declared +4 hybrid override (A6)
    if (!override && sum !== budget) errors.push(`alloc: ${sum} points vs budget ${budget} at L${obj.level} (D7: conformance is ±0)`);
  }
  if (kind === 'vow' && obj.kind === 'story' && !obj.source) errors.push('vow: story vows must name their chapter choice source');
  if (kind === 'vendorEntry' && obj.restock !== false) errors.push('vendorEntry: Pell never restocks (D13/D14)');
  if (kind === 'verse' || kind === 'vow') checkEffects(obj, errors);
  if (kind === 'item' && Array.isArray(obj.mark)) {
    obj.mark.forEach((e, i) => {
      if (!isObj(e) || typeof e.op !== 'string') errors.push(`mark[${i}]: missing op`);
      else if (!OPCODES.includes(e.op)) errors.push(`mark[${i}].op: unknown op-code "${e.op}"`);
    });
  }
  return errors;
}

function validate(kind, obj, ctx) {
  const spec = SCHEMAS[kind];
  if (!spec) return { ok: false, errors: [`unknown schema kind "${kind}"`] };
  if (!isObj(obj)) return { ok: false, errors: ['payload must be an object'] };
  const errors = checkObj(obj, spec, [], '');
  crossChecks(kind, obj, ctx, errors);
  return { ok: errors.length === 0, errors };
}

module.exports = { validate, SCHEMAS, OPCODES, STAT_KEYS, CLASSES, TALLIES };
