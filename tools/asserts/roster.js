#!/usr/bin/env node
// roster.js — T2.3 roster conformance CLI. Fixture smoke until the real
// 21-fight roster lands at T4.6 (nightly job re-runs it on real data then).
// Hard rows: D7 budget conformance + N6 per-fight variance + r20 ceiling.
// Advisory rows: wall/boss clear bands (they need real fight design).
//   node tools/asserts/roster.js [--seeds 600] [--json]
'use strict';
// T4.6 landing: the tool now runs BOTH passes — the fixture smoke (pinned by
// the Phase-2 suite) and the REAL 21-fight roster (budget/variance/ceiling
// hard; §9.5 readability, §17 boss and D10 bands as measured advisories —
// promotion to hard is the T4.12/owner call, never silent).
const { createTuning } = require('../../tuning.js');
const { rosterAsserts, realRosterAsserts } = require('../../harness/roster.js');

const asJson = process.argv.includes('--json');
const seedsIdx = process.argv.indexOf('--seeds');
const seeds = seedsIdx !== -1 ? parseInt(process.argv[seedsIdx + 1], 10) || 600 : 600;
const clearIdx = process.argv.indexOf('--clear');
const clearSeeds = clearIdx !== -1 ? parseInt(process.argv[clearIdx + 1], 10) || 60 : 60;
const tuning = createTuning();

const smoke = rosterAsserts({ tuning, seedsPerFight: Math.min(seeds, 200) });
const real = realRosterAsserts({ tuning, seedsPerFight: seeds, clearSeeds });

let hardOk = smoke.pass && real.pass;

if (asJson) {
  console.log(JSON.stringify({ smoke, real }, null, 2));
} else {
  console.log(`ROSTER CONFORMANCE — ${smoke.stage} (fixture smoke)`);
  console.log(`  ${smoke.rows.length} fixture rows: ${smoke.pass ? 'green' : 'RED'}`);
  console.log(`ROSTER CONFORMANCE — ${real.stage} (the canon 21)`);
  for (const row of real.rows) {
    console.log(`  #${String(row.duel).padStart(2)} ${row.name}`);
    console.log(`    budget: sum=${row.budget.sum} vs budget(L)=${row.budget.budgetForLevel} → ${row.budget.ok ? 'CONFORMS (D7/N5)' : 'declared override (A6 hybrid)'}`);
    const sig = Math.max(...row.perClass.map((p) => p.worstSigmaPct));
    const maxR = Math.max(...row.perClass.map((p) => p.maxRounds));
    console.log(`    variance worst σ ${sig.toFixed(2)}% ${sig <= 12 ? '≤' : '>'} 12% · maxR ${maxR} ${maxR <= 20 ? '≤' : '>'} 20`);
    const best = [...row.perClass].sort((a, b) => b.clearPct - a.clearPct)[0];
    console.log(`    best clear: ${best.clazz} ${best.clearPct.toFixed(1)}% via ${best.bestBuild} (advisory)`);
  }
  const failingBands = real.bands.filter((b) => !b.readability2x55);
  console.log(`\n  §9.5 readability (≥2 classes ≥55%): ${21 - failingBands.length}/21 hold; failing: ${failingBands.map((b) => b.id).join(', ') || 'none'}`);
  if (real.motherBell) {
    console.log(`  D10 Mother Bell row: ${JSON.stringify(real.motherBell.clears)} — ash/cinder≥55 ${real.motherBell.ashbladeCinder55}, warden/cantor≥40 ${real.motherBell.wardenCantor40} (advisory)`);
  }
  console.log(`\n${real.note}`);
}
process.exit(hardOk ? 0 : 1);
