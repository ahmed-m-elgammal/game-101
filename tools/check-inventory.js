#!/usr/bin/env node
// check-inventory.js — T0.5: the anti-omission device. Reads data/ + story/
// content files and diffs their counts against the v1.0.1 target inventory
// (docs/INVENTORY.md). Advisory until Phase 6; blocking at Phase 10 (use
// --strict). Zero dependencies.
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const STRICT = process.argv.includes('--strict');

// Target counts — reconciled to DECISIONS.md §6 (D4 + D30): 24 vows, 40 items, 10 shrines.
const TARGETS = {
  acts: 3, chapters: 9, campaignDuels: 21, namedBossFights: 6, storyChoices: 9,
  endings: 10, epilogueVariants: 9, verses: 42, vows: 24, storyVows: 12,
  items: 40, namedEchoes: 8, riteUsers: 4, namedCharacters: 13, ladderEchoes: 12,
  factions: 5, locations: 8, rites: 4, signatureVerbs: 21, images: 10,
  fontFamilies: 5, fontFiles: 18, shrines: 10, proseWords: 24000,
};

// Content lives in data/*.json / story/*.json keyed by plural kind
// (e.g. data/verses.json holds an array of verse rows). Files may be absent
// early — that is what "advisory" means; the counts just report 0.
const KIND_FILES = {
  chapters: ['data/chapters.json', 'story/chapters.json'],
  campaignDuels: ['data/duels.json', 'story/duels.json'],
  storyChoices: ['story/choices.json'],
  endings: ['story/endings.json'],
  epilogueVariants: ['story/epilogues.json'],
  verses: ['data/verses.json'],
  vows: ['data/vows.json'],
  items: ['data/items.json'],
  namedEchoes: ['data/named_echoes.json'],
  rites: ['data/rites.json'],
  signatureVerbs: ['data/signature_verbs.json'],
  objectives: ['story/objectives.json'],
  deeds: ['data/deeds.json'],
  shrines: ['story/shrines.json'],
};

function countKind(kinds) {
  let n = 0;
  for (const rel of kinds) {
    const p = path.join(ROOT, rel);
    if (!fs.existsSync(p)) continue;
    try {
      const parsed = JSON.parse(fs.readFileSync(p, 'utf8'));
      n += Array.isArray(parsed) ? parsed.length : 0;
    } catch (e) {
      console.error(`check-inventory: ${rel} is not valid JSON (${e.message})`);
      process.exitCode = 1;
    }
  }
  return n;
}

const rows = [];
let missing = 0;
for (const [target, expected] of Object.entries(TARGETS)) {
  const fileKeys = KIND_FILES[target];
  const have = fileKeys ? countKind(fileKeys) : null;
  if (have === null) { rows.push(`${target.padEnd(18)} target ${expected}  (counted in a later phase)`); continue; }
  const ok = have >= expected;
  if (!ok) missing++;
  rows.push(`${target.padEnd(18)} ${String(have).padStart(5)} / ${expected}  ${ok ? 'ok' : 'MISSING'}`);
}

console.log('Content inventory (docs/INVENTORY.md):');
console.log(rows.join('\n'));
if (missing > 0) {
  const msg = `${missing} content target(s) not yet met — content is still being authored (Phases 4–8 own this).`;
  if (STRICT) { console.error(`check-inventory: FAIL (${msg})`); process.exit(1); }
  console.log(`check-inventory: advisory — ${msg} Run with --strict at Phase 10 to block.`);
} else {
  console.log('check-inventory: OK — every content target met.');
}
