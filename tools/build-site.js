#!/usr/bin/env node
/**
 * build-site.js — T3.1/T3.3 + the T0.4 scaffold leftover: assemble the
 * self-hosted static game from sources that already live in this repo.
 *
 *   site/
 *     index.html          ← ui/index.html (browser entry, loads ui/*.css + ui/boot.js)
 *     ui/…                ← ui/ (browser ESM + css, verbatim)
 *     engine|rng|data|…   ← esm/ (verbatim ESM engine mirrors — same math the tests run)
 *     tuning.js|sim.js|reading.js ← esm/
 *     assets/fonts|img    ← assets/
 *
 * Zero dependencies, zero network, zero minification (a readable bundle is a
 * debuggable bundle — the weight budget is tracked, not shaved: T10.x logs it).
 * Usage: node tools/build-site.js [--out <dir>] (default: <repo>/site)
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const outFlag = process.argv.indexOf('--out');
const OUT = outFlag >= 0 ? path.resolve(process.argv[outFlag + 1]) : path.join(ROOT, 'site');

function copy(from, to) {
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
}

function copyTree(fromDir, toDir) {
  let n = 0;
  for (const e of fs.readdirSync(fromDir, { withFileTypes: true })) {
    const from = path.join(fromDir, e.name);
    const to = path.join(toDir, e.name);
    // the raw generation PNGs stay in the repo, never in the shipped site
    if (e.isDirectory() && e.name === 'raw') continue;
    if (e.isDirectory()) { n += copyTree(from, to); continue; }
    copy(from, to);
    n += 1;
  }
  return n;
}

fs.rmSync(OUT, { recursive: true, force: true });

let files = 0;
files += copyTree(path.join(ROOT, 'esm'), OUT);
files += copyTree(path.join(ROOT, 'ui'), path.join(OUT, 'ui'));
files += copyTree(path.join(ROOT, 'assets'), path.join(OUT, 'assets'));
// index.html ships from ui/ — at the site root its ui/… references resolve
copy(path.join(ROOT, 'ui', 'index.html'), path.join(OUT, 'index.html'));
files += 1;

// weight manifest — logged, never silently drifted ([GDD] §15 ≈1.9 MB budget)
let bytes = 0;
function weigh(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) weigh(p);
    else bytes += fs.statSync(p).size;
  }
}
weigh(OUT);
const fonts = fs.readdirSync(path.join(OUT, 'assets', 'fonts')).filter((f) => f.endsWith('.woff2'));
const licences = fs.readdirSync(path.join(OUT, 'assets', 'fonts')).filter((f) => f.startsWith('OFL-'));

console.log(`built ${OUT}`);
console.log(`files: ${files} · weight: ${(bytes / 1024 / 1024).toFixed(2)} MB (budget ≈1.9 MB incl. Phase-8 plates)`);
console.log(`fonts: ${fonts.length} woff2 · ${licences.length} OFL licences`);
if (fonts.length !== 19) { console.error('font manifest drift — expected 19 woff2 (see TASKS.md T3.2)'); process.exit(1); }
if (licences.length !== 5) { console.error('licence manifest drift — expected 5 OFL texts'); process.exit(1); }
