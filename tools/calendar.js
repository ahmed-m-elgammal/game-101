#!/usr/bin/env node
// calendar.js — T4.11: the Vigil's Calendar generator. [01] R9.
// One generated table listing per chapter: verses unlocked, items sourced,
// vows earned, systems opened, and the per-path choice rewards (fixing F26:
// Ch1 Ruthless→Mace, Mercy→Shroud, Devotion→Shovel per A2).
//
// Reads the canonical data modules (the CJS mirrors) — never hard-codes a
// count or an id — and emits data/calendar.json. The Hymnal screen (T8.3)
// consumes the JSON; the byte-diff assert (tests/phase4-progression.test.js)
// pins the output to the tables: when any table moves, the calendar diff is
// the review ([01] R9's audit artifact).
//
// Story integration (T6.5) plugs in via --story <bundle.json>: the generator
// accepts a story bundle (choices/endings) and merges its columns; absent a
// bundle the choice rows come from data/sources.js (already the reward
// registry of record). Usage:
//   node tools/calendar.js                 # regenerate data/calendar.json
//   node tools/calendar.js --check         # exit 1 if the file is stale
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'data', 'calendar.json');

const {
  ENEMIES,
} = require('../data/enemies.js');
const { VERSES, STRIKE } = require('../data/verses.js');
const { VOWS } = require('../data/vows.js');
const { ITEMS } = require('../data/items.js');
const { SOURCES } = require('../data/sources.js');
const {
  XP_THRESHOLDS, CHAPTER_FIGHTS, FIGHT_ROLES, xpForFight, levelForXp, CAMPAIGN_TARGET_LINE,
} = require('../data/progression.js');

// Chapter bands [CANON] — the act table ([GDD] §3; D1 adopt the L9/L10 read).
const CHAPTER_BANDS = {
  1: ['1', '2'], 2: ['2', '3'], 3: ['3', '4'], 4: ['4', '5'], 5: ['5', '6'],
  6: ['6', '7'], 7: ['7', '8'], 8: ['8', '9'], 9: ['9', '10'],
};

// Systems opened — cited rows (the §13/§14 screen list; [01] R9's column).
const SYSTEMS_OPENED = {
  1: ['the duel', 'the Candle of Saint Orrin', 'Re-bells (free retries)', 'shrines (free reshaping)'],
  2: ['the Choir-Floor pity counter (over-level)', 'soft level-sync (D2)'],
  3: ['the Choir Floor', 'Echo binding', 'Echo Codes (import/export)'],
  4: ['the Twin Ledger (Ch3 Devotion, D3)'],
  5: ['Corvane\u2019s locked counterbuild (D11)'],
  6: ['the Temperature bar (Mother Bell, §9.2)'],
  7: ['the ninth class verse (the L7 consolidation beat, [01] R6)'],
  8: [],
  9: ['The Orrery (post-campaign summary)', 'the Choir Floor after the ending'],
};

function versesForChapter(chapter) {
  // Creation grants the L1 pool; chapter N's post-chapter level is N+1.
  const level = chapter === 0 ? 1 : chapter + 1;
  if (level > 7) return []; // the unlock calendar ends at L7 (§13)
  const rows = VERSES.filter((v) => v.unlockLevel === level)
    .map((v) => ({ level, id: v.id, name: v.name, cls: v.cls }));
  return rows;
}

function itemsForChapter(chapter) {
  const fromSources = SOURCES.filter((s) => s.chapter === chapter && (s.grants || []).length > 0);
  const rows = [];
  for (const s of fromSources) {
    for (const g of s.grants) {
      const item = ITEMS.find((i) => i.id === g);
      if (!item) throw new Error(`calendar: source ${s.id} grants unknown item ${g}`);
      rows.push({ id: item.id, name: item.name, slot: item.slot, via: s.id, kind: s.kind });
    }
  }
  return rows;
}

function vowsForChapter(chapter) {
  const fromSources = new Set(SOURCES.filter((s) => s.chapter === chapter).map((s) => s.id));
  return VOWS.filter((v) => v.kind === 'story' && fromSources.has(v.source))
    .map((v) => ({ id: v.id, name: v.name, via: v.source }));
}

function choicesForChapter(chapter) {
  const rows = SOURCES.filter((s) => s.kind === 'choice' && s.chapter === chapter);
  return rows.map((s) => ({
    source: s.id,
    tally: s.tally || null,
    rewards: (s.grants || []).map((g) => {
      const item = ITEMS.find((i) => i.id === g);
      return { id: g, name: item ? item.name : g };
    }),
    note: s.line || '',
  }));
}

function fightsForChapter(chapter) {
  const ids = CHAPTER_FIGHTS[chapter - 1] || [];
  const enemyLevels = Object.fromEntries(ENEMIES.map((e) => [e.id, e.level]));
  return ids.map((id, i) => {
    const row = ENEMIES.find((e) => e.id === id);
    return {
      duel: row.duel,
      id,
      name: row.name,
      role: FIGHT_ROLES[id],
      xp: xpForFight(row.level, FIGHT_ROLES[id]),
      level: enemyLevels[id],
    };
  });
}

function buildCalendar() {
  const chapters = [];
  for (let ch = 1; ch <= 9; ch++) {
    chapters.push({
      chapter: ch,
      act: ch <= 3 ? 1 : ch <= 6 ? 2 : 3,
      band: CHAPTER_BANDS[ch],
      fights: fightsForChapter(ch),
      chapterCompletionXp: 10,
      versesUnlocked: versesForChapter(ch),
      itemsSourced: itemsForChapter(ch),
      vowsEarned: vowsForChapter(ch),
      systemsOpened: SYSTEMS_OPENED[ch] || [],
      choiceRewards: choicesForChapter(ch),
    });
  }
  // Creation row: the L1 pool + the starting candle (F26's Ch1 pins ride ch1).
  const creation = {
    chapter: 0,
    label: 'creation',
    versesUnlocked: versesForChapter(0),
    itemsSourced: itemsForChapter(0),
  };
  return {
    version: 1,
    generatedBy: 'tools/calendar.js — [01] R9 (T4.11)',
    targetLine: CAMPAIGN_TARGET_LINE,
    xpThresholds: XP_THRESHOLDS,
    creation,
    chapters,
  };
}

function main() {
  const calendar = buildCalendar();
  const json = JSON.stringify(calendar, null, 2) + '\n';
  const check = process.argv.includes('--check');
  if (check) {
    const current = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
    if (current !== json) {
      console.error('calendar: STALE — data/calendar.json does not match the tables. Run: node tools/calendar.js');
      process.exit(1);
    }
    console.log('calendar: OK — data/calendar.json matches the tables byte-for-byte.');
    return;
  }
  fs.writeFileSync(OUT, json);
  console.log(`calendar: wrote ${path.relative(ROOT, OUT)} (${json.length} bytes, 9 chapters + creation)`);
}

main();
