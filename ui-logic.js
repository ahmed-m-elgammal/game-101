/**
 * logic.js — T3.1–T3.9 pure presentation logic. No DOM, no engine imports,
 * no state: every function takes plain data and returns plain data, so the
 * sync transform can mirror it to game-101/ui-logic.js (CommonJS) and the
 * zero-dependency Node suite can test it directly. Rendering belongs to the
 * components; decisions belong to the engine; THIS file only shapes what the
 * engine produced into what §11.5/§10.7/§10.8/§5.8 told the UI to say.
 *
 * Everything below is deterministic. Nothing here rolls, waits, or guesses.
 */

/* -- §11.4 status chips: glyph paths + colour keys ----------------------- */

const STATUS_GLYPHS = {
  bleed:   { d: 'M6 1 C6 4.5 3.8 6.2 3.8 8.4 A2.2 2.2 0 0 0 8.2 8.4 C8.2 6.2 6 4.5 6 1 Z', filled: true }, // vertical drop
  burn:    { d: 'M6 1 C8.5 3 9.5 5 8.5 7.5 C7.8 9.2 6.6 10.4 6 11 C5.4 10.4 4.2 9.2 3.5 7.5 C2.5 5 3.5 3 6 1 Z', filled: true }, // upward flame
  curse:   { d: 'M3 4 L6 8 L9 4', filled: false },  // downward chevron
  fray:    { d: 'M2 6 L4.5 4 L5.5 8 L7.5 4 L8.5 8 L10 6', filled: false }, // broken stitch
  hush:    { d: 'M3 6.5 L9 6.5 M6 3.5 L6 9.5 M6 6.5 L6 6.5', filled: false }, // closed mouth (a sealed line)
  brace:   { d: 'M3 7 A3.2 3.2 0 0 0 9 7 M2.4 7 L3.6 7 M8.4 7 L9.6 7', filled: false }, // open hand (a held cradle)
  ward:    { d: 'M6 1.5 L10 3.75 L10 8.25 L6 10.5 L2 8.25 L2 3.75 Z', filled: false }, // hex
  thorns:  { d: 'M6 1.5 L8.5 9.5 L6 8 L3.5 9.5 Z', filled: true }, // spike
  stun:    { d: 'M4 2 L8 2 L9 6 C9 8 8 9 6 9.5 C4 9 3 8 3 6 Z M6 9.5 L6 11 M7.4 4.2 L4.6 6.4', filled: false }, // broken bell (crack)
  fatigue: { d: 'M3.5 1.5 L8.5 1.5 L8.5 3 L6.8 6 L8.5 9 L8.5 10.5 L3.5 10.5 L3.5 9 L5.2 6 L3.5 3 Z', filled: false }, // hourglass
  rite:    { d: 'M6 2 A4 4 0 1 1 5.99 2 M6 4 A2 2 0 1 1 5.99 4', filled: false }, // rotating ring
};

/** §11.4 colour per status (the CSS custom property that carries it). */
const STATUS_COLORS = {
  bleed: 'var(--st-bleed)',
  burn: 'var(--st-burn)',
  curse: 'var(--st-curse)',
  fray: 'var(--st-fray)',
  hush: 'var(--st-hush)',
  brace: 'var(--st-brace)',
  ward: 'var(--st-ward)',
  thorns: 'var(--st-thorns)',
  stun: 'var(--st-stun)',
  fatigue: 'var(--st-fatigue)',
  rite: 'var(--st-rite)',
};

/* -- HP bar + Resolve pips (§11.5) --------------------------------------- */

function barPct(hp, maxHp) {
  if (!Number.isFinite(hp) || !Number.isFinite(maxHp) || maxHp <= 0) return 0;
  return Math.max(0, Math.min(100, (hp / maxHp) * 100));
}

/** Ten pips: full / partial (with a fill percentage) / empty. §11.5. */
function pipStates(resolve) {
  const out = [];
  const r = Number.isFinite(resolve) ? Math.max(0, Math.min(10, resolve)) : 0;
  for (let i = 0; i < 10; i++) {
    const frac = r - i;
    if (frac >= 1) out.push({ state: 'full', pct: 100 });
    else if (frac > 0) out.push({ state: 'partial', pct: Math.round(frac * 100) });
    else out.push({ state: 'empty', pct: 0 });
  }
  return out;
}

/* -- Wax Meter (§10.6, §11.5) --------------------------------------------- */

const WAX_MIN = 0.88;
const WAX_MAX = 1.12;

/** Meter geometry: rail percentage, rail-edge glow flags, clamp flags. */
function waxGeom(fortune) {
  const f = Number.isFinite(fortune) ? fortune : 1;
  const clamped = Math.min(WAX_MAX, Math.max(WAX_MIN, f));
  return {
    pct: Math.round(((clamped - WAX_MIN) / (WAX_MAX - WAX_MIN)) * 10000) / 100, // 2dp — no float drift on the rail
    clampedLow: f <= WAX_MIN,
    clampedHigh: f >= WAX_MAX,
    hot: clamped >= 1.1,   // glow lives on the last 2 points of the rail
    cold: clamped <= 0.9,
    value: clamped,
  };
}

/* -- Verse buttons (§11.5): preview row from the effect ops -------------- */

const PREVIEW_FOR_OP = {
  'damage': (e) => ({ key: 'damage', label: e.type && e.type !== 'main' ? String(e.type) : 'strike' }),
  'bleed+': (e) => ({ key: 'bleed', label: `+${e.stacks} bleed` }),
  'burn': () => ({ key: 'burn', label: 'burn' }),
  'curse': () => ({ key: 'curse', label: 'curse' }),
  'fray': () => ({ key: 'fray', label: 'fray' }),
  'hush': () => ({ key: 'hush', label: 'hush' }),
  'brace': () => ({ key: 'brace', label: 'brace' }),
  'ward+': (e) => ({ key: 'ward', label: `+${e.value != null ? e.value : ''} ward`.replace(' +', '+') }),
  'thorns+': (e) => ({ key: 'thorns', label: `+${e.value != null ? e.value : ''} thorns`.replace(' +', '+') }),
  'stun': () => ({ key: 'stun', label: 'stun' }),
  'heal': () => ({ key: 'heal', label: 'heal' }),
  'resolve': (e) => ({ key: 'resolve', label: `+${e.amount} resolve` }),
  'cleanse': (e) => ({ key: 'cleanse', label: e.all ? 'cleanse all' : 'cleanse' }),
};

function versePreview(verse) {
  if (!verse || !Array.isArray(verse.effects)) return [];
  const out = [];
  for (const e of verse.effects) {
    const fn = PREVIEW_FOR_OP[e.op];
    if (fn) out.push(fn(e));
  }
  if (verse.isStrike) out.unshift({ key: 'strike', label: 'refund +1' });
  return out;
}

/* -- Log gutter (§11.5): kind + damage type → border class --------------- */

function logClass(entry) {
  if (!entry) return 'log-entry--info';
  if (entry.kind === 'prose') return 'log-entry--prose';
  if (entry.kind === 'damage') {
    const map = { steel: 'log-entry--damage-steel', ember: 'log-entry--damage-ember', shade: 'log-entry--damage-violet', true: 'log-entry--damage-true' };
    return map[entry.color] || 'log-entry--damage-steel'; // steel is the neutral damage colour
  }
  const map = { heal: 'log-entry--heal', status: 'log-entry--status', resolve: 'log-entry--resolve', info: 'log-entry--info', dot: 'log-entry--dot' };
  return map[entry.kind] || 'log-entry--info';
}

/* -- §5.8 the Reading: one-line threat per enemy archetype ---------------- */

const CLASS_THREATS = {
  ashblade: 'It bleeds you and opens fast.',
  gravewarden: 'It braces and outlasts. Walls first, wounds later.',
  cinder_witch: 'It burns — the damage does not stop when the verse ends.',
  hollow_cantor: 'It heals. It will not stop healing.',
};

/** Hand-written overrides for named fights (top-12 set grows with the roster, T4.6). */
const THREAT_OVERRIDES = {
  // §3 Ch1 / §9.1 #1 — canon threat prose for the tutorial fight
  'Hollowed Sexton Bram': 'He opens with Thorns and then simply refuses to die.',
};

function threatFor(buildB) {
  if (!buildB) return CLASS_THREATS.ashblade;
  if (buildB.name && THREAT_OVERRIDES[buildB.name]) return THREAT_OVERRIDES[buildB.name];
  return CLASS_THREATS[buildB.clazz] || 'It is what it is. The Reading has no better line.';
}

/* -- §10.8 the Reading card: formatting ----------------------------------- */

/** Class id → display name (the card never shows raw snake_case ids). */
const CLASS_NAMES = {
  ashblade: 'Ashblade',
  cinder_witch: 'Cinder Witch',
  gravewarden: 'Gravewarden',
  hollow_cantor: 'Hollow Cantor',
};

/**
 * @param {object} reading - runReading output (winAPct, avgRounds, counterLine…)
 * @param {object} buildA - player build
 * @param {object} buildB - enemy build
 * @param {string} display - the fight's MEASURE display string
 * @returns {{head, threat, expect, counter, seed, sync}}
 */
function formatReading(reading, buildA, buildB, display, syncBand) {
  const win = reading ? reading.winAPct : null;
  const rounds = reading && Number.isFinite(reading.avgRounds) ? Math.round(reading.avgRounds * 10) / 10 : null;
  const counter = reading && reading.counterLine ? reading.counterLine : null;
  const clsName = buildB.className || CLASS_NAMES[buildB.clazz] || buildB.clazz;
  return {
    head: `${buildB.name || 'Unknown'} · ${clsName} · L${buildB.level}`,
    threat: threatFor(buildB),
    expect: win == null
      ? 'Expected: —'
      : `Expected: ${Math.round(win)}% win · ~${rounds} rounds${counter ? ' · your counter: ' + counter : ''}`,
    counter,
    seed: display ? (display.startsWith('MEASURE') ? display : `MEASURE ${display}`) : null,
    sync: syncBand != null && syncBand > 0 ? syncNote() : null,
  };
}

/** D2 honesty line — shown whenever level-sync adjusts a sheet. */
function syncNote() {
  return 'The crypt levels you to the fight (soft sync, D2). The sheet shown is the adjusted one — honesty about scaling is the brand.';
}

/* -- §10.7 the Ledger: verdict table (mirrors engine.ledgerVerdict) ------- */

/**
 * Pure mirror of the engine's ledgerVerdict so the report module stays
 * engine-free. tests/phase3-ui.test.js cross-checks this table against the
 * engine's own verdicts on a grid of outcomes — they must never diverge.
 * Returns { key, text }; key 'favored-lost' is the D23 row whose "open it"
 * links the Reading.
 */
function verdictOf(result, playerSide, expectedWinRate) {
  const won = result.winner === playerSide;
  const f = result.fortune;
  if (won) {
    if (f > 0.98 && f < 1.02) return { key: 'level', text: 'The wax ran level. You won it.' };
    if (f <= 0.98) return { key: 'cold-won', text: 'The wax ran cold for you. You won anyway.' };
    return { key: 'hot-won', text: 'The wax ran hot. You won it — and it was shared, so your opponent had it too.' };
  }
  if (expectedWinRate != null && expectedWinRate >= 0.7) {
    return { key: 'favored-lost', text: 'You were favored and lost. The Reading knows why — open it.' }; // D23 wording
  }
  if (f <= 0.98) return { key: 'cold-lost', text: 'The wax ran cold. You lost it — and the Reading saw it coming.' };
  return { key: 'lost-lesson', text: 'You lost it. The log shows the mistake — a loss is a lesson, not a robbery.' };
}

/* -- D18 calibration line ([04] §5, §10.7) -------------------------------- */

/**
 * After every 10 fights of a run, the report appends ONE calibration line
 * computed from expected-vs-actual — and only when the accuracy claim is
 * true (the assert: every fight the Reading called clear was actually won).
 *   base:   "Your wins cluster where the Reading is uncertain. Fights it
 *            calls clear, you clear."
 *   strong: "You know what the Reading knows."   (also won half the toss-ups)
 * @param {Array<{expected:number, won:boolean}>} history - this run's fights
 * @returns {string|null}
 */
function calibrationFor(history) {
  if (!Array.isArray(history) || history.length === 0 || history.length % 10 !== 0) return null;
  const last10 = history.slice(-10);
  const calledClear = last10.filter((f) => f.expected >= 0.7);
  if (calledClear.length === 0 || !calledClear.every((f) => f.won)) return null;
  const uncertain = last10.filter((f) => f.expected >= 0.4 && f.expected < 0.7);
  const wonUncertain = uncertain.filter((f) => f.won).length;
  if (uncertain.length >= 2 && wonUncertain >= Math.ceil(uncertain.length / 2)) {
    return 'You know what the Reading knows.';
  }
  return 'Your wins cluster where the Reading is uncertain. Fights it calls clear, you clear.';
}

/* -- T3.6 tutorial hint layer (dismissable, non-blocking) ----------------- */

const HINTS = {
  reading: 'The Reading ran two hundred versions of this fight before you swung once. It is a forecast, not a promise. Read it, then ignore it bravely.',
  verbs: 'You say something, it happens, then it has to recharge. That is the whole combat tutorial. Verses cost Resolve — the pips. Strike is free and gives one back.',
  brace: 'He is Braced. Armour is a \'less\', not a \'none\' — hit him anyway, just expect less.',
  ward: 'That green glow is Ward. It eats what lands before his skin does. Bleed ignores it. Patience outlasts it.',
};

/**
 * Pure hint state machine.
 * @param {object} seen - {reading,verbs,brace,ward} booleans (already shown)
 * @param {{type:string}} event - 'fight_start' | 'first_choice' | 'enemy_brace' | 'enemy_ward'
 * @returns {{id:string, text:string, seen:object}|null} null = nothing new
 */
function nextHint(seen, event) {
  const s = { ...seen };
  const order = {
    fight_start: ['reading', 'verbs'],
    first_choice: ['verbs', 'reading'],
    enemy_brace: ['brace'],
    enemy_ward: ['ward'],
  };
  const queue = order[event && event.type] || [];
  for (const id of queue) {
    if (!s[id]) {
      s[id] = true;
      return { id, text: HINTS[id], seen: s };
    }
  }
  return null;
}

/* -- T3.9 scene nodes ------------------------------------------------------ */

const TALLIES = ['mercy', 'ruthless', 'devotion']; // §3 — agrees with validators.TALLIES

/**
 * Shape + validate a scene node (prose is data; malformed nodes throw before
 * they ever reach the DOM).
 * @returns {{id, chapter, heading, plate, duelId, prose: Array<{speaker, text, spoken}>, choices: Array<{id, label, tally, gift}>}}
 */
function sceneShape(node) {
  if (!node || typeof node !== 'object') throw new TypeError('scene: node required');
  if (typeof node.id !== 'string' || !node.id) throw new TypeError('scene: id required');
  if (typeof node.chapter !== 'string' || !node.chapter) throw new TypeError('scene: chapter required');
  if (typeof node.heading !== 'string' || !node.heading) throw new TypeError('scene: heading required');
  const prose = node.prose;
  if (!Array.isArray(prose) || prose.length === 0) throw new TypeError('scene: prose required');
  const shapedProse = prose.map((p) => {
    if (!p || typeof p.text !== 'string' || !p.text) throw new TypeError(`scene: prose.text required (${node.id})`);
    return { speaker: typeof p.speaker === 'string' ? p.speaker : null, text: p.text, spoken: p.speaker != null };
  });
  const choices = node.choices == null ? [] : node.choices;
  if (!Array.isArray(choices)) throw new TypeError('scene: choices must be an array');
  if (choices.length > 3) throw new TypeError(`scene: at most 3 choices (${node.id})`);
  const shapedChoices = choices.map((c, i) => {
    if (!c || typeof c.label !== 'string' || !c.label) throw new TypeError(`scene: choices[${i}].label required`);
    if (!TALLIES.includes(c.tally)) throw new TypeError(`scene: choices[${i}].tally "${c.tally}" is not a canon tally`);
    return { id: typeof c.id === 'string' ? c.id : `${node.id}_choice_${i}`, label: c.label, tally: c.tally, gift: typeof c.gift === 'string' ? c.gift : null };
  });
  return {
    id: node.id,
    chapter: node.chapter,
    heading: node.heading,
    plate: typeof node.plate === 'string' ? node.plate : null,
    duelId: typeof node.duelId === 'string' ? node.duelId : null,
    prose: shapedProse,
    choices: shapedChoices,
  };
}


module.exports = { barPct, pipStates, waxGeom, versePreview, logClass, threatFor, formatReading, syncNote, verdictOf, calibrationFor, nextHint, sceneShape, STATUS_GLYPHS, STATUS_COLORS, WAX_MIN, WAX_MAX, CLASS_THREATS, THREAT_OVERRIDES, CLASS_NAMES, HINTS, TALLIES };
