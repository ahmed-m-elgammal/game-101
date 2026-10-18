#!/usr/bin/env node
// balance.js — T2.2 CI gate: the published §15.3 targets as asserts.
//   node tools/asserts/balance.js [--quick] [--json]
// --quick : CI smoke sizes (smaller matrices); nightly runs full sizes.
// Exit 0 iff every HARD assert passes. KNOWN-GAP rows (N7) report as WARN
// and do not fail the gate — promotion to hard is a recorded decision.
'use strict';
const { createTuning } = require('../../tuning.js');
const { runMatrix } = require('../../harness/matrix.js');
const {
  coreAsserts, statusAsserts, antiLockAsserts, varianceAssert, KNOWN_GAPS,
} = require('../../harness/asserts.js');
const { STATUS_FAMILY } = require('../../harness/archetypes.js');
const { mirrorPreset } = require('../../data/presets.js');

const quick = process.argv.includes('--quick');
const asJson = process.argv.includes('--json');
const tuning = createTuning();

const matrix = runMatrix({
  mode: 'classes',
  levels: quick ? [1, 5, 9] : [1, 3, 5, 7, 9, 10],
  n: quick ? 120 : 400,
  tuning,
});
const amatrix = runMatrix({
  mode: 'archetypes',
  levels: [5, 9],
  n: quick ? 30 : 80,
  tuning,
});
amatrix.statusFamilies = STATUS_FAMILY;

const results = [
  ...coreAsserts(matrix),
  ...statusAsserts(amatrix),
  ...antiLockAsserts(tuning, { n: quick ? 150 : 400 }),
  varianceAssert(mirrorPreset('ashblade', 5), mirrorPreset('gravewarden', 5), {
    n: quick ? 2000 : 10000,
    tuning,
  }),
];

let hard = 0, gaps = 0;
for (const a of results) {
  if (!a.pass) {
    if (a.advisory) gaps += 1;
    else hard += 1;
  }
}

if (asJson) {
  console.log(JSON.stringify({ results, hardFailures: hard, knownGaps: gaps }, null, 2));
} else {
  console.log(`BALANCE GATE — ${results.length} asserts · ${hard} hard failure(s) · ${gaps} known-gap warning(s)`);
  for (const a of results) {
    const tag = a.pass ? 'PASS' : (a.advisory ? 'WARN' : 'FAIL');
    console.log(`  [${tag}] ${a.id}: ${a.value}`);
    if (!a.pass) console.log(`         ${a.detail}`);
  }
  if (gaps) {
    console.log(`\nKNOWN-GAPS (finding N7 in docs/DECISIONS.md; promote to hard at T4.12):`);
    for (const id of Object.keys(KNOWN_GAPS)) console.log(`  · ${id}`);
  }
}
process.exit(hard ? 1 : 0);
