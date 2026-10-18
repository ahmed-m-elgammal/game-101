#!/usr/bin/env node
// harness.js — T2.1 headless harness runner CLI. [GDD] §15.3.
// Plays Echo-vs-Echo matrices across class pairings and levels; prints the
// balance workbench table. Deterministic: fixed seed derivation, no clock
// in the output (timings go to stderr, human-readable side only).
//
//   node tools/harness.js [--n 200] [--levels 1,3,5,7,9,10] [--mode classes|archetypes] [--json]
//   node tools/harness.js --campaign          # fixture-roster walk (smoke; real walk at T2.5/T4.10)
'use strict';
const { createTuning } = require('../tuning.js');
const { runMatrix, classRollup, mirrorRollup, lengthRollup } = require('../harness/matrix.js');
const { coreAsserts } = require('../harness/asserts.js');

const args = process.argv.slice(2);
const opt = (name, dflt) => {
  const i = args.indexOf(`--${name}`);
  if (i === -1) return dflt;
  const v = args[i + 1];
  return v && !v.startsWith('--') ? v : true;
};

const tuning = createTuning();
const n = parseInt(opt('n', '200'), 10) || 200;
const levels = String(opt('levels', '1,3,5,7,9,10')).split(',').map(Number).filter(Number.isFinite);
const mode = opt('mode', 'classes') === 'archetypes' ? 'archetypes' : 'classes';
const asJson = !!opt('json', false);

if (opt('campaign', false)) {
  // Campaign mode — fixture roster walk with a skill-profile ladder.
  // Skill profile models first-attempt losses (D9 loss loop): perfect = 0,
  // clean = 0 (fresh builds each fight), always-loses-one = 1 scripted
  // first-attempt loss. Real 21-fight roster + XP walk arrive at T4.6/T4.10;
  // this is the fixture smoke of the walk harness.
  const { FIXTURE_ROSTER, rosterAsserts } = require('../harness/roster.js');
  const { quickReading } = require('../sim/reading.js');
  const { standardBuild } = require('../harness/archetypes.js');
  const CLASSES = ['ashblade', 'cinder_witch', 'gravewarden', 'hollow_cantor'];
  const SKILLS = { perfect: 0, clean: 0, 'always-loses-one': 1 };
  const walk = [];
  for (const enemy of FIXTURE_ROSTER) {
    for (const clazz of CLASSES) {
      const player = standardBuild(clazz, enemy.build.level, tuning);
      const raw = quickReading(player, enemy.build, { n: 200, tuning });
      const clearPct = (raw.winA / raw.n) * 100;
      for (const [skill, losses] of Object.entries(SKILLS)) {
        const attempts = 1 + (clearPct < 100 ? losses : 0);
        walk.push({
          fight: enemy.id, clazz, skill, lossesBeforeClear: losses,
          expectedAttempts: attempts, clearPct,
        });
      }
    }
  }
  const roster = rosterAsserts({ tuning });
  if (asJson) {
    console.log(JSON.stringify({ stage: 'FIXTURE-SMOKE', walk, roster }, null, 2));
  } else {
    console.log('CAMPAIGN MODE — FIXTURE-SMOKE (real roster at T4.6, XP walk at T2.5/T4.10)');
    for (const w of walk) {
      console.log(
        `  ${w.fight.padEnd(14)} ${w.clazz.padEnd(15)} ${w.skill.padEnd(17)} ` +
        `clear ${w.clearPct.toFixed(1)}% · attempts ${w.expectedAttempts}`
      );
    }
  }
  process.exit(0);
}

const matrix = runMatrix({ mode, levels, n, tuning });
const rollup = classRollup(matrix).sort((a, b) => b.winPct - a.winPct);
const mirror = mirrorRollup(matrix);
const len = lengthRollup(matrix);
const asserts = coreAsserts(matrix);

if (asJson) {
  console.log(JSON.stringify({ matrix, rollup, mirror, length: len, asserts }, null, 2));
  process.exit(0);
}

console.log(`HARNESS — ${mode} matrix · levels ${levels.join('/')} · n=${n} per matchup · ${matrix.totals.n} fights`);
console.log('');
console.log('class rollup (overall win%, mirrors excluded):');
for (const r of rollup) {
  const bar = '█'.repeat(Math.round(r.winPct / 5));
  console.log(`  ${r.id.padEnd(15)} ${r.winPct.toFixed(1).padStart(5)}% ${bar}`);
}
console.log('');
console.log(`mirrors: side-A ${mirror.winAPct.toFixed(2)}% over ${mirror.games} fights (target ~50 ±3)`);
console.log(`length : avg ${len.avgRounds.toFixed(2)} · max ${len.maxRounds} · last-bell ${len.lastBellPct.toFixed(2)}%`);
console.log('');
console.log('§15.3 core asserts:');
let hardFail = 0;
for (const a of asserts) {
  const tag = a.pass ? 'PASS' : (a.advisory ? 'GAP ' : 'FAIL');
  if (!a.pass && !a.advisory) hardFail += 1;
  console.log(`  [${tag}] ${a.label} — ${a.value}${a.advisory && !a.pass ? ` · KNOWN-GAP (N7, promotes at T4.12)` : ''}`);
}
process.exit(hardFail ? 1 : 0);
