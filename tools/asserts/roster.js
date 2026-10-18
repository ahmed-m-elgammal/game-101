#!/usr/bin/env node
// roster.js — T2.3 roster conformance CLI. Fixture smoke until the real
// 21-fight roster lands at T4.6 (nightly job re-runs it on real data then).
// Hard rows: D7 budget conformance + N6 per-fight variance + r20 ceiling.
// Advisory rows: wall/boss clear bands (they need real fight design).
//   node tools/asserts/roster.js [--seeds 600] [--json]
'use strict';
const { createTuning } = require('../../tuning.js');
const { rosterAsserts } = require('../../harness/roster.js');

const asJson = process.argv.includes('--json');
const seedsIdx = process.argv.indexOf('--seeds');
const seeds = seedsIdx !== -1 ? parseInt(process.argv[seedsIdx + 1], 10) || 600 : 600;
const tuning = createTuning();

const report = rosterAsserts({ tuning, seedsPerFight: seeds });

if (asJson) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log(`ROSTER CONFORMANCE — ${report.stage}`);
  for (const row of report.rows) {
    console.log(`  ${row.name}`);
    console.log(`    budget: sum=${row.budget.sum} vs budget(L)=${row.budget.budgetForLevel} → ${row.budget.ok ? 'CONFORMS (D7/N5)' : 'OVERRIDDEN'}`);
    for (const p of row.perClass) {
      console.log(
        `    ${p.clazz.padEnd(15)} clear ${p.clearPct.toFixed(1).padStart(5)}% (advisory) · ` +
        `worst σ ${p.worstSigmaPct.toFixed(2)}% ${p.varianceOk ? '≤' : '>'} 12% · maxR ${p.maxRounds}`
      );
    }
  }
  console.log(`\n${report.note}`);
}
process.exit(report.pass ? 0 : 1);
